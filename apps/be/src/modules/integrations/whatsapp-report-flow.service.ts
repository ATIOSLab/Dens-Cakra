import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  downloadMediaMessage,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import P from 'pino';
import {
  AreaResolutionMethod,
  CoordinateSource,
  FileLifecycleStatus,
  FileType,
  JaringRegistrationStatus,
  Prisma,
  WhatsAppMessageStatus,
  WhatsAppReportAmendmentType,
  WhatsAppReportSessionState,
  WhatsAppReportSessionStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { FileService } from '../files/file.service.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { WhatsAppChannelScopeService } from '../whatsapp/whatsapp-channel-scope.service.js';

export type WhatsAppReportChannel = {
  id: string;
  code: string;
  channelType: string;
  config: unknown;
};

export type WhatsAppReportInboundPayload = {
  externalMessageId: string;
  senderPhone: string;
  receivedAt: string;
  content?: string;
};

export type WhatsAppReportReply =
  | string
  | {
      kind: 'native_flow_single_select';
      body: string;
      footer?: string;
      buttonTitle: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };

type ReplySender = (messages: WhatsAppReportReply[]) => Promise<void>;
type NativeFlowSingleSelectReply = Extract<
  WhatsAppReportReply,
  { kind: 'native_flow_single_select' }
>;

const REPORT_ACTION_IDS = {
  existingResume: 'report_existing_resume',
  existingSummary: 'report_existing_summary',
  existingCancel: 'report_existing_cancel',
  existingNew: 'report_existing_new',
  titleSave: 'report_title_save',
  titleEdit: 'report_title_edit',
  titleCancel: 'report_title_cancel',
  contentSave: 'report_content_save',
  contentAdd: 'report_content_add',
  contentFinish: 'report_content_finish',
  contentContinue: 'report_content_continue',
  contentRewrite: 'report_content_rewrite',
  contentCancel: 'report_content_cancel',
  locationUse: 'report_location_use',
  locationRetry: 'report_location_retry',
  timeSave: 'report_time_save',
  timeRetry: 'report_time_retry',
  timeCancel: 'report_time_cancel',
  mediaSave: 'report_media_save',
  mediaAdd: 'report_media_add',
  mediaDelete: 'report_media_delete',
  mediaList: 'report_media_list',
  mediaDeleteConfirm: 'report_media_delete_confirm',
  mediaDeleteBack: 'report_media_delete_back',
  reviewSend: 'report_review_send',
  reviewEditTitle: 'report_review_edit_title',
  reviewEditContent: 'report_review_edit_content',
  reviewEditLocation: 'report_review_edit_location',
  reviewEditTime: 'report_review_edit_time',
  reviewEditMedia: 'report_review_edit_media',
  reviewCancel: 'report_review_cancel',
  cancellationConfirm: 'report_cancellation_confirm',
  cancellationBack: 'report_cancellation_back',
  postSubmitTextAdd: 'report_post_submit_text_add',
  postSubmitTextDiscard: 'report_post_submit_text_discard',
  postSubmitTextNew: 'report_post_submit_text_new',
  postSubmitMediaAdd: 'report_post_submit_media_add',
  postSubmitContentAdd: 'report_post_submit_content_add',
  postSubmitSummary: 'report_post_submit_summary',
  postSubmitStatus: 'report_post_submit_status',
  postSubmitList: 'report_post_submit_list',
  reportHistoryBack: 'report_history_back',
  postSubmitNew: 'report_post_submit_new',
} as const;

const REPORT_HISTORY_SELECT_PREFIX = 'report_history_select:';
const REPORT_HISTORY_PAGE_PREFIX = 'report_history_page:';
const REPORT_HISTORY_PAGE_SIZE = 7;

type LoadedSession = Prisma.WhatsAppReportSessionGetPayload<{
  include: {
    jaring: true;
    contentParts: { orderBy: { orderNo: 'asc' } };
    media: {
      where: { deletedAt: null };
      orderBy: { orderNo: 'asc' };
      include: { file: true };
    };
    amendments: {
      orderBy: { versionNumber: 'desc' };
      take: 1;
      select: { versionNumber: true };
    };
    submittedMessage: {
      include: {
        convertedBaket: {
          select: { status: true };
        };
      };
    };
  };
}>;

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const SUBMITTED_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CONTENT_PARTS = 30;
const MAX_MEDIA = 10;
const MAX_CONTENT_LENGTH = 10_000;

@Injectable()
export class WhatsAppReportFlowService {
  private readonly logger = new Logger(WhatsAppReportFlowService.name);
  private readonly senderQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
    private readonly files: FileService,
    private readonly spatial: SpatialRepository,
    private readonly channelScope: WhatsAppChannelScopeService,
  ) {}

  async handle(input: {
    channel: WhatsAppReportChannel;
    socket: WASocket;
    message: WAMessage;
    payload: WhatsAppReportInboundPayload;
    reply: ReplySender;
  }): Promise<boolean> {
    const phone = input.payload.senderPhone;
    const previous = this.senderQueues.get(phone) ?? Promise.resolve();
    const current = previous
      .catch(() => undefined)
      .then(() => this.process(input));
    this.senderQueues.set(phone, current);

    try {
      await current;
    } finally {
      if (this.senderQueues.get(phone) === current) {
        this.senderQueues.delete(phone);
      }
    }
    return true;
  }

  private async process(input: {
    channel: WhatsAppReportChannel;
    socket: WASocket;
    message: WAMessage;
    payload: WhatsAppReportInboundPayload;
    reply: ReplySender;
  }) {
    const { channel, socket, message, payload, reply } = input;
    const text = this.cleanText(payload.content ?? '');
    const commandText = this.mediaMessage(message) ? '' : text;
    let session = await this.findActiveSession(payload.senderPhone);

    if (session && session.expiresAt <= new Date()) {
      await this.expireSession(session, payload.externalMessageId);
      session = null;
    }

    if (this.isCommand(commandText, ['BANTUAN', 'HELP'])) {
      await reply([this.helpText()]);
      return;
    }
    if (this.isCommand(commandText, ['MENU'])) {
      await reply([this.menuText(session)]);
      return;
    }
    if (this.isCommand(commandText, ['STATUS'])) {
      await reply([await this.statusText(payload.senderPhone, session)]);
      return;
    }
    if (this.isCommand(commandText, ['RINGKASAN'])) {
      await reply([
        session
          ? this.summaryText(session)
          : 'Belum ada berita aktif. Silakan kirim PIN/kode Jaring Anda untuk memulai.',
      ]);
      return;
    }

    if (!session) {
      if (!commandText) return;
      await this.startSessionWithPin(channel, payload, message, reply, commandText);
      return;
    }

    if (
      session.integrationChannelId &&
      session.integrationChannelId !== channel.id
    ) {
      const startsNewReport = this.isCommand(commandText, [
        'INFORMASI BARU',
        'LAPOR',
      ]);
      const cancelsReport = this.isCommand(commandText, ['BATAL', 'CANCEL']);

      if (startsNewReport || cancelsReport) {
        await this.closeSession(
          session,
          startsNewReport
            ? 'NEW_REPORT_REQUESTED'
            : 'CLOSED_FROM_DIFFERENT_CHANNEL',
          payload.externalMessageId,
        );
        if (startsNewReport) {
          await this.startSession(channel, payload, message, reply);
        } else {
          await reply([
            'Draft informasi aktif dari kanal lain telah dibatalkan. Silakan kirim PIN/kode Jaring Anda untuk memulai.',
          ]);
        }
        return;
      }

      const jaring = await this.findJaringByPhone(payload.senderPhone);
      if (!jaring) return;

      const allowed = await this.channelScope.isJaringAllowed(
        channel,
        jaring.areaCoverages.map((coverage) => coverage.areaId),
      );
      if (!allowed) {
        await reply([
          'Nomor Anda terdaftar, tetapi tidak berada dalam wilayah layanan kanal WhatsApp ini.',
        ]);
        return;
      }

      await reply([
        'Anda masih memiliki draft informasi aktif yang dibuka dari kanal WhatsApp lain. Ketik BATAL untuk membatalkan draft tersebut dan memulai informasi baru di kanal ini.',
      ]);
      return;
    }

    await this.touchSession(session.id, session.status);
    session = (await this.loadSession(session.id)) ?? session;

    const startsNewReport = this.isCommand(commandText, [
      'INFORMASI BARU',
      'LAPOR',
    ]);
    if (startsNewReport) {
      await this.closeSession(
        session,
        'NEW_REPORT_REQUESTED',
        payload.externalMessageId,
      );
      await this.startSession(channel, payload, message, reply);
      return;
    }

    if (
      this.isCommand(commandText, ['BATAL', 'CANCEL']) &&
      session.currentState !== WhatsAppReportSessionState.CANCEL_CONFIRMATION &&
      session.status === WhatsAppReportSessionStatus.ACTIVE
    ) {
      await this.transition(
        session,
        WhatsAppReportSessionState.CANCEL_CONFIRMATION,
        'CANCELLATION_REQUESTED',
        payload.externalMessageId,
        { resumeState: session.currentState },
      );
      await reply([this.cancellationConfirmationReply()]);
      return;
    }

    if (
      this.isCommand(commandText, ['KIRIM']) &&
      session.status === WhatsAppReportSessionStatus.ACTIVE
    ) {
      if (this.isComplete(session)) {
        await this.transition(
          session,
          WhatsAppReportSessionState.REVIEW,
          'REVIEW_OPENED',
          payload.externalMessageId,
        );
        await reply([this.reviewReply(session)]);
      } else {
        await reply([
          `Informasi belum lengkap. Tahap saat ini: ${this.stateLabel(session.currentState)}.`,
        ]);
      }
      return;
    }

    const editTarget = this.editCommandTarget(commandText);
    if (
      editTarget &&
      session.status === WhatsAppReportSessionStatus.ACTIVE &&
      session.currentState !== WhatsAppReportSessionState.AWAITING_CODE
    ) {
      await this.transition(
        session,
        editTarget,
        'GLOBAL_EDIT_OPENED',
        payload.externalMessageId,
        { returnToReview: true },
      );
      await reply([this.promptForState(editTarget)]);
      return;
    }

    await this.advance(session, input, text);
  }

  private async startSession(
    channel: WhatsAppReportChannel,
    payload: WhatsAppReportInboundPayload,
    message: WAMessage,
    reply: ReplySender,
  ) {
    const jaring = await this.findJaringByPhone(payload.senderPhone);
    if (!jaring) {
      this.logger.warn(
        `No approved Jaring found for sender ${payload.senderPhone} on channel ${channel.code}`,
      );
      return;
    }

    const allowed = await this.channelScope.isJaringAllowed(
      channel,
      jaring.areaCoverages.map((coverage) => coverage.areaId),
    );
    if (!allowed) {
      this.logger.warn(
        `Jaring ${jaring.code} (${payload.senderPhone}) not allowed on channel ${channel.code}`,
      );
      await reply([
        'Nomor Anda terdaftar, tetapi tidak berada dalam wilayah layanan kanal WhatsApp ini.',
      ]);
      return;
    }

    const fieldOfficerAssignmentId =
      jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId;
    if (!fieldOfficerAssignmentId) {
      this.logger.warn(
        `Jaring ${jaring.code} (${payload.senderPhone}) has no active field officer assignment`,
      );
      await reply([
        'Field Officer penanggung jawab aktif belum tersedia. Silakan hubungi admin.',
      ]);
      return;
    }

    const remoteJid = message.key.remoteJid;
    if (!remoteJid) return;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const reportSession = await tx.whatsAppReportSession.create({
          data: {
            integrationChannelId: channel.id,
            senderPhone: payload.senderPhone,
            remoteJid,
            activeSenderKey: payload.senderPhone,
            jaringId: jaring.id,
            fieldOfficerAssignmentId,
            currentState: WhatsAppReportSessionState.AWAITING_CODE,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          },
        });
        await tx.whatsAppReportHistory.create({
          data: {
            reportSessionId: reportSession.id,
            action: 'SESSION_CREATED',
            newState: WhatsAppReportSessionState.AWAITING_CODE,
            externalMessageId: payload.externalMessageId,
          },
        });
        return reportSession;
      });
      await reply([this.welcomeText()]);
      this.logger.log(`WhatsApp report session ${created.id} created`);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        await reply([
          'Anda masih memiliki informasi aktif. Ketik STATUS atau RINGKASAN untuk melanjutkan.',
        ]);
        return;
      }
      throw error;
    }
  }

  private async startSessionWithPin(
    channel: WhatsAppReportChannel,
    payload: WhatsAppReportInboundPayload,
    message: WAMessage,
    reply: ReplySender,
    pinText: string,
  ) {
    const jaring = await this.findJaringByPhone(payload.senderPhone);
    if (!jaring) {
      this.logger.warn(
        `No approved Jaring found for sender ${payload.senderPhone} on channel ${channel.code}`,
      );
      return;
    }

    const allowed = await this.channelScope.isJaringAllowed(
      channel,
      jaring.areaCoverages.map((coverage) => coverage.areaId),
    );
    if (!allowed) {
      this.logger.warn(
        `Jaring ${jaring.code} (${payload.senderPhone}) not allowed on channel ${channel.code}`,
      );
      await reply([
        'Nomor Anda terdaftar, tetapi tidak berada dalam wilayah layanan kanal WhatsApp ini.',
      ]);
      return;
    }

    const fieldOfficerAssignmentId =
      jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId;
    if (!fieldOfficerAssignmentId) {
      this.logger.warn(
        `Jaring ${jaring.code} (${payload.senderPhone}) has no active field officer assignment`,
      );
      await reply([
        'Field Officer penanggung jawab aktif belum tersedia. Silakan hubungi admin.',
      ]);
      return;
    }

    if (pinText !== jaring.code) {
      await reply([
        'PIN/kode Jaring belum sesuai. Silakan coba lagi.',
      ]);
      return;
    }

    const remoteJid = message.key.remoteJid;
    if (!remoteJid) return;

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const reportSession = await tx.whatsAppReportSession.create({
          data: {
            integrationChannelId: channel.id,
            senderPhone: payload.senderPhone,
            remoteJid,
            activeSenderKey: payload.senderPhone,
            jaringId: jaring.id,
            fieldOfficerAssignmentId,
            currentState: WhatsAppReportSessionState.LOCATION,
            expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          },
        });
        await tx.whatsAppReportHistory.create({
          data: {
            reportSessionId: reportSession.id,
            action: 'SESSION_CREATED',
            newState: WhatsAppReportSessionState.LOCATION,
            externalMessageId: payload.externalMessageId,
          },
        });
        return reportSession;
      });
      await reply([this.promptForState(WhatsAppReportSessionState.LOCATION)]);
      this.logger.log(`WhatsApp report session ${created.id} created via PIN`);
    } catch (error) {
      if (this.isUniqueConstraint(error)) {
        await reply([
          'Anda masih memiliki berita aktif. Ketik STATUS atau RINGKASAN untuk melanjutkan.',
        ]);
        return;
      }
      throw error;
    }
  }

  private async advance(
    session: LoadedSession,
    input: {
      channel: WhatsAppReportChannel;
      socket: WASocket;
      message: WAMessage;
      payload: WhatsAppReportInboundPayload;
      reply: ReplySender;
    },
    text: string,
  ) {
    const { socket, message, payload, reply } = input;
    const state = session.currentState;

    if (state === WhatsAppReportSessionState.EXISTING_SESSION_CHOICE) {
      if (
        this.isChoice(
          text,
          1,
          'LANJUTKAN INFORMASI',
          REPORT_ACTION_IDS.existingResume,
        )
      ) {
        const resumeState =
          session.resumeState ?? WhatsAppReportSessionState.LOCATION;
        await this.transition(
          session,
          resumeState,
          'EXISTING_SESSION_RESUMED',
          payload.externalMessageId,
          { resumeState: null },
        );
        await reply([this.promptForState(resumeState)]);
      } else if (
        this.isChoice(
          text,
          2,
          'LIHAT RINGKASAN',
          REPORT_ACTION_IDS.existingSummary,
        )
      ) {
        await reply([
          this.summaryText(session),
          this.existingSessionChoiceReply(),
        ]);
      } else if (
        this.isChoice(
          text,
          3,
          'BATALKAN INFORMASI LAMA',
          REPORT_ACTION_IDS.existingCancel,
        )
      ) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else if (
        this.isChoice(
          text,
          4,
          'SIMPAN DAN BUAT INFORMASI BARU',
          REPORT_ACTION_IDS.existingNew,
        )
      ) {
        await this.closeSession(
          session,
          'DRAFT_ARCHIVED_FOR_NEW_REPORT',
          payload.externalMessageId,
        );
        await this.startSession(input.channel, payload, input.message, reply);
      } else {
        await reply([this.existingSessionChoiceReply()]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.AWAITING_CODE) {
      if (!text) return;
      if (text !== session.jaring.code) {
        await reply([
          'PIN/kode Jaring belum sesuai. Silakan coba lagi atau ketik BATAL.',
        ]);
        await this.history(session, 'INVALID_CODE', payload.externalMessageId);
        return;
      }
      await this.transition(
        session,
        WhatsAppReportSessionState.LOCATION,
        'CODE_VERIFIED',
        payload.externalMessageId,
      );
      await reply([this.promptForState(WhatsAppReportSessionState.LOCATION)]);
      return;
    }

    if (state === WhatsAppReportSessionState.TITLE) {
      const validation = this.validateTitle(text);
      if (validation) {
        await reply([validation]);
        return;
      }
      const next = session.returnToReview
        ? WhatsAppReportSessionState.REVIEW
        : WhatsAppReportSessionState.CONTENT;
      await this.transition(
        session,
        next,
        session.title ? 'TITLE_UPDATED' : 'TITLE_CREATED',
        payload.externalMessageId,
        {
          title: text,
          returnToReview: false,
        },
      );
      const refreshed = await this.loadSession(session.id).catch(() => null);
      await reply([
        next === WhatsAppReportSessionState.REVIEW
          ? this.reviewReply(refreshed ?? { ...session, title: text })
          : this.promptForState(next),
      ]);
      return;
    }

    if (state === WhatsAppReportSessionState.TITLE_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN', REPORT_ACTION_IDS.titleSave)) {
        const next = session.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : WhatsAppReportSessionState.CONTENT;
        await this.transition(
          session,
          next,
          'TITLE_LOCKED',
          payload.externalMessageId,
          {
            returnToReview: false,
          },
        );
        await reply([
          next === WhatsAppReportSessionState.REVIEW
            ? this.reviewReply({ ...session, returnToReview: false })
            : this.promptForState(next),
        ]);
      } else if (this.isChoice(text, 2, 'EDIT', REPORT_ACTION_IDS.titleEdit)) {
        await this.transition(
          session,
          WhatsAppReportSessionState.TITLE,
          'TITLE_EDIT_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.promptForState(WhatsAppReportSessionState.TITLE)]);
      } else if (
        this.isChoice(text, 3, 'BATAL', REPORT_ACTION_IDS.titleCancel)
      ) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply([this.titleConfirmationReply(session.title ?? '-')]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.CONTENT) {
      const contentMedia = this.mediaMessage(message);

      if (contentMedia) {
        if (session.media.length >= MAX_MEDIA) {
          await reply([`Dokumentasi maksimal ${MAX_MEDIA} file.`]);
          return;
        }
        if (text && session.contentParts.length >= MAX_CONTENT_PARTS) {
          await reply([
            `Batas maksimal ${MAX_CONTENT_PARTS} bagian informasi telah tercapai.`,
          ]);
          return;
        }
        const currentLength = session.contentParts.reduce(
          (total, part) => total + part.content.length,
          0,
        );
        if (text && currentLength + text.length > MAX_CONTENT_LENGTH) {
          await reply([
            `Isi informasi maksimal ${MAX_CONTENT_LENGTH} karakter. Perpendek caption lalu kirim ulang media.`,
          ]);
          return;
        }
        try {
          const file = await this.storeAndScanMedia(
            socket,
            message,
            session,
            contentMedia,
          );
          await this.prisma.$transaction(async (tx) => {
            await tx.whatsAppReportMedia.create({
              data: {
                reportSessionId: session.id,
                fileId: file.id,
                externalMessageId: payload.externalMessageId,
                mediaType: contentMedia.fileType,
                caption: contentMedia.caption,
                orderNo: session.media.length + 1,
              },
            });
            if (text) {
              await tx.whatsAppReportContentPart.create({
                data: {
                  reportSessionId: session.id,
                  externalMessageId: payload.externalMessageId,
                  content: text,
                  orderNo: session.contentParts.length + 1,
                },
              });
            }
            await tx.whatsAppReportHistory.create({
              data: {
                reportSessionId: session.id,
                action: 'CONTENT_MEDIA_ADDED',
                previousState: state,
                newState: state,
                externalMessageId: payload.externalMessageId,
                metadata: {
                  fileId: file.id,
                  mediaType: contentMedia.fileType,
                  captionAddedToContent: Boolean(text),
                  mediaOrderNo: session.media.length + 1,
                  contentOrderNo: text ? session.contentParts.length + 1 : null,
                },
              },
            });
          });

          const refreshed = await this.loadSession(session.id);
          const currentSession = refreshed ?? session;
          const hasContent = currentSession.contentParts.length > 0;
          const hasMedia = currentSession.media.length > 0;

          if (hasContent && hasMedia) {
            const combined = currentSession.contentParts
              .map((part) => part.content)
              .join('\n\n');
            const next = currentSession.returnToReview
              ? WhatsAppReportSessionState.REVIEW
              : WhatsAppReportSessionState.TIME;
            await this.transition(
              currentSession,
              next,
              'CONTENT_COMBINED',
              payload.externalMessageId,
              { content: combined, returnToReview: false },
            );
            const finalSession =
              (await this.loadSession(session.id).catch(() => null)) ??
              currentSession;
            await reply([
              next === WhatsAppReportSessionState.REVIEW
                ? this.reviewReply(finalSession)
                : this.promptForState(next),
            ]);
          } else {
            await reply([
              'Dokumentasi foto/video diterima. Silakan kirim narasi informasi.',
            ]);
          }
        } catch (error) {
          this.logger.warn(
            `Content media intake failed: ${this.messageOf(error)}`,
          );
          await reply([
            'Foto atau video gagal diterima atau tidak lolos pemeriksaan. Silakan kirim ulang.',
          ]);
        }
        return;
      }

      if (!text) {
        await reply([
          'Silakan kirim narasi informasi atau foto/video dokumentasi.',
        ]);
        return;
      }

      if (this.isCommand(text, ['SELESAI', REPORT_ACTION_IDS.contentFinish])) {
        if (session.contentParts.length === 0) {
          await reply([
            'Belum ada narasi informasi yang diterima. Silakan kirim narasi terlebih dahulu.',
          ]);
          return;
        }
        if (session.media.length === 0) {
          await reply([
            'Dokumentasi wajib diisi minimal satu foto atau video. Silakan kirim lampiran foto/video.',
          ]);
          return;
        }
        const combined = session.contentParts
          .map((part) => part.content)
          .join('\n\n');
        const next = session.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : WhatsAppReportSessionState.TIME;
        await this.transition(
          session,
          next,
          'CONTENT_COMBINED',
          payload.externalMessageId,
          { content: combined, returnToReview: false },
        );
        const refreshed = await this.loadSession(session.id).catch(() => null);
        await reply([
          next === WhatsAppReportSessionState.REVIEW
            ? this.reviewReply(refreshed ?? { ...session, content: combined })
            : this.promptForState(next),
        ]);
        return;
      }

      if (session.contentParts.length >= MAX_CONTENT_PARTS) {
        await reply([
          `Batas maksimal ${MAX_CONTENT_PARTS} pesan informasi telah tercapai.`,
        ]);
        return;
      }
      const currentLength = session.contentParts.reduce(
        (total, part) => total + part.content.length,
        0,
      );
      if (currentLength + text.length > MAX_CONTENT_LENGTH) {
        await reply([
          `Isi informasi maksimal ${MAX_CONTENT_LENGTH} karakter.`,
        ]);
        return;
      }

      await this.prisma.whatsAppReportContentPart.create({
        data: {
          reportSessionId: session.id,
          externalMessageId: payload.externalMessageId,
          content: text,
          orderNo: session.contentParts.length + 1,
        },
      });
      await this.history(
        session,
        'CONTENT_PART_ADDED',
        payload.externalMessageId,
        {
          orderNo: session.contentParts.length + 1,
        },
      );

      const refreshed = await this.loadSession(session.id);
      const currentSession = refreshed ?? session;
      const hasContent = currentSession.contentParts.length > 0;
      const hasMedia = currentSession.media.length > 0;

      if (hasContent && hasMedia) {
        const combined = currentSession.contentParts
          .map((part) => part.content)
          .join('\n\n');
        const next = currentSession.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : WhatsAppReportSessionState.TIME;
        await this.transition(
          currentSession,
          next,
          'CONTENT_COMBINED',
          payload.externalMessageId,
          { content: combined, returnToReview: false },
        );
        const finalSession =
          (await this.loadSession(session.id).catch(() => null)) ??
          currentSession;
        await reply([
          next === WhatsAppReportSessionState.REVIEW
            ? this.reviewReply(finalSession)
            : this.promptForState(next),
        ]);
      } else {
        await reply([
          'Narasi informasi diterima. Silakan kirim foto atau video dokumentasi.',
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.CONTENT_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN', REPORT_ACTION_IDS.contentSave)) {
        const next = session.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : WhatsAppReportSessionState.TIME;
        await this.transition(
          session,
          next,
          'CONTENT_LOCKED',
          payload.externalMessageId,
          {
            returnToReview: false,
          },
        );
        await reply([
          next === WhatsAppReportSessionState.REVIEW
            ? this.reviewReply(session)
            : this.promptForState(next),
        ]);
      } else if (
        this.isChoice(text, 2, 'TAMBAH INFORMASI', REPORT_ACTION_IDS.contentAdd)
      ) {
        await this.transition(
          session,
          WhatsAppReportSessionState.CONTENT,
          'CONTENT_ADDITION_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.promptForState(WhatsAppReportSessionState.CONTENT)]);
      } else if (
        this.isChoice(text, 3, 'EDIT ULANG', REPORT_ACTION_IDS.contentRewrite)
      ) {
        await this.prisma.$transaction([
          this.prisma.whatsAppReportContentPart.deleteMany({
            where: { reportSessionId: session.id },
          }),
          this.prisma.whatsAppReportSession.update({
            where: { id: session.id },
            data: {
              content: null,
              currentState: WhatsAppReportSessionState.CONTENT,
            },
          }),
          this.prisma.whatsAppReportHistory.create({
            data: {
              reportSessionId: session.id,
              action: 'CONTENT_RESET',
              previousState: state,
              newState: WhatsAppReportSessionState.CONTENT,
              externalMessageId: payload.externalMessageId,
            },
          }),
        ]);
        await reply([this.promptForState(WhatsAppReportSessionState.CONTENT)]);
      } else if (
        this.isChoice(text, 4, 'BATAL', REPORT_ACTION_IDS.contentCancel)
      ) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply([this.contentConfirmationReply(session.content ?? '-')]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.LOCATION) {
      const location = this.extractLiveLocation(message);
      if (!location) {
        await reply([
          'Live Location belum diterima. Kirim melalui Lampiran → Lokasi → Bagikan lokasi terkini. Lokasi statis tidak dapat digunakan.',
        ]);
        return;
      }
      if (location.accuracy === undefined) {
        await reply([
          'Live Location tidak menyertakan tingkat akurasi. Silakan kirim ulang lokasi terkini.',
        ]);
        return;
      }
      const next = session.returnToReview
        ? WhatsAppReportSessionState.REVIEW
        : WhatsAppReportSessionState.TITLE;
      await this.transition(
        session,
        next,
        session.latitude === null ? 'LOCATION_ADDED' : 'LOCATION_UPDATED',
        payload.externalMessageId,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          locationAccuracyMeters: location.accuracy,
          locationCapturedAt: new Date(payload.receivedAt),
          locationMessageId: payload.externalMessageId,
          locationType: 'LIVE_LOCATION',
          returnToReview: false,
        },
      );
      const refreshed = await this.loadSession(session.id).catch(() => null);
      await reply([
        next === WhatsAppReportSessionState.REVIEW
          ? this.reviewReply(
              refreshed ??
                ({
                  ...session,
                  latitude: location.latitude,
                  longitude: location.longitude,
                  locationAccuracyMeters: location.accuracy,
                } as unknown as LoadedSession),
            )
          : this.promptForState(next),
      ]);
      return;
    }

    if (state === WhatsAppReportSessionState.LOCATION_CONFIRMATION) {
      if (
        this.isChoice(text, 1, 'YA', 'GUNAKAN', REPORT_ACTION_IDS.locationUse)
      ) {
        const next = session.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : WhatsAppReportSessionState.TITLE;
        await this.transition(
          session,
          next,
          'LOCATION_LOCKED',
          payload.externalMessageId,
          {
            returnToReview: false,
          },
        );
        await reply([
          next === WhatsAppReportSessionState.REVIEW
            ? this.reviewReply(session)
            : this.promptForState(next),
        ]);
      } else if (
        this.isChoice(text, 2, 'KIRIM ULANG', REPORT_ACTION_IDS.locationRetry)
      ) {
        await this.transition(
          session,
          WhatsAppReportSessionState.LOCATION,
          'LOCATION_RETRY_REQUESTED',
          payload.externalMessageId,
          {
            latitude: null,
            longitude: null,
            locationAccuracyMeters: null,
            locationCapturedAt: null,
            locationMessageId: null,
            locationType: null,
          },
        );
        await reply([this.promptForState(WhatsAppReportSessionState.LOCATION)]);
      } else {
        await reply([
          this.locationConfirmationReply(
            session.latitude,
            session.longitude,
            session.locationAccuracyMeters,
          ),
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.TIME) {
      const incidentAt = this.parseIncidentAt(text);
      if (!incidentAt) {
        await reply([
          'Format tanggal atau waktu kejadian belum sesuai. Gunakan format DD-MM-YYYY HH:mm, contoh: 03-08-2026 14:30.',
        ]);
        return;
      }
      if (incidentAt.getTime() > Date.now() + 5 * 60 * 1000) {
        await reply([
          'Tanggal dan waktu kejadian tidak boleh berada di masa depan. Silakan input ulang.',
        ]);
        return;
      }
      await this.transition(
        session,
        WhatsAppReportSessionState.REVIEW,
        session.incidentAt ? 'INCIDENT_TIME_UPDATED' : 'INCIDENT_TIME_ADDED',
        payload.externalMessageId,
        { incidentAt, returnToReview: false },
      );
      const refreshed = await this.loadSession(session.id).catch(() => null);
      await reply([this.reviewReply(refreshed ?? { ...session, incidentAt })]);
      return;
    }

    if (state === WhatsAppReportSessionState.TIME_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN', REPORT_ACTION_IDS.timeSave)) {
        const next = session.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : session.media.length > 0
            ? WhatsAppReportSessionState.REVIEW
            : WhatsAppReportSessionState.MEDIA;
        await this.transition(
          session,
          next,
          'INCIDENT_TIME_LOCKED',
          payload.externalMessageId,
          { returnToReview: false },
        );
        await reply([
          next === WhatsAppReportSessionState.REVIEW
            ? this.reviewReply(session)
            : this.promptForState(next),
        ]);
      } else if (
        this.isChoice(text, 2, 'INPUT ULANG', REPORT_ACTION_IDS.timeRetry)
      ) {
        await this.transition(
          session,
          WhatsAppReportSessionState.TIME,
          'INCIDENT_TIME_RETRY_REQUESTED',
          payload.externalMessageId,
          { incidentAt: null },
        );
        await reply([this.promptForState(WhatsAppReportSessionState.TIME)]);
      } else if (
        this.isChoice(text, 3, 'BATAL', REPORT_ACTION_IDS.timeCancel)
      ) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply([
          this.timeConfirmationReply(session.incidentAt ?? new Date()),
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.MEDIA) {
      if (this.isCommand(text, ['SELESAI'])) {
        if (session.media.length === 0) {
          await reply([
            'Dokumentasi wajib diisi minimal satu foto atau video.',
          ]);
          return;
        }
        await this.transition(
          session,
          WhatsAppReportSessionState.MEDIA_CONFIRMATION,
          'MEDIA_COLLECTION_FINISHED',
          payload.externalMessageId,
        );
        await reply([this.mediaConfirmationReply(session)]);
        return;
      }
      const media = this.mediaMessage(message);
      if (!media) {
        await reply(['Silakan kirim foto atau video dokumentasi.']);
        return;
      }
      if (session.media.length >= MAX_MEDIA) {
        await reply([
          `Dokumentasi maksimal ${MAX_MEDIA} file.`,
          this.mediaConfirmationReply(session),
        ]);
        return;
      }
      try {
        const file = await this.storeAndScanMedia(
          socket,
          message,
          session,
          media,
        );
        await this.prisma.whatsAppReportMedia.create({
          data: {
            reportSessionId: session.id,
            fileId: file.id,
            externalMessageId: payload.externalMessageId,
            mediaType: media.fileType,
            caption: media.caption,
            orderNo: session.media.length + 1,
          },
        });
        await this.history(session, 'MEDIA_ADDED', payload.externalMessageId, {
          fileId: file.id,
          mediaType: media.fileType,
          orderNo: session.media.length + 1,
        });
        await this.transition(
          session,
          WhatsAppReportSessionState.MEDIA_CONFIRMATION,
          'MEDIA_AWAITING_ACTION',
          payload.externalMessageId,
        );
        const refreshed = await this.loadSession(session.id);
        await reply([this.mediaConfirmationReply(refreshed ?? session)]);
      } catch (error) {
        this.logger.warn(`Media intake failed: ${this.messageOf(error)}`);
        await reply([
          'Dokumentasi gagal diterima atau tidak lolos pemeriksaan. Silakan kirim ulang.',
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.MEDIA_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN', REPORT_ACTION_IDS.mediaSave)) {
        await this.transition(
          session,
          WhatsAppReportSessionState.REVIEW,
          'MEDIA_LOCKED',
          payload.externalMessageId,
          { returnToReview: false },
        );
        await reply([this.reviewReply(session)]);
      } else if (
        this.isChoice(text, 2, 'TAMBAH DOKUMENTASI', REPORT_ACTION_IDS.mediaAdd)
      ) {
        await this.transition(
          session,
          WhatsAppReportSessionState.MEDIA,
          'MEDIA_ADDITION_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.promptForState(WhatsAppReportSessionState.MEDIA)]);
      } else if (
        this.isChoice(text, 3, 'HAPUS', REPORT_ACTION_IDS.mediaDelete)
      ) {
        await this.transition(
          session,
          WhatsAppReportSessionState.MEDIA_DELETE_CONFIRMATION,
          'MEDIA_DELETE_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.mediaDeleteConfirmationReply()]);
      } else if (this.isChoice(text, 4, 'LIHAT', REPORT_ACTION_IDS.mediaList)) {
        await reply([
          this.mediaListText(session),
          this.mediaConfirmationReply(session),
        ]);
      } else {
        await reply([this.mediaConfirmationReply(session)]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.MEDIA_DELETE_CONFIRMATION) {
      const confirmsDelete = this.isChoice(
        text,
        1,
        'YA',
        'HAPUS',
        REPORT_ACTION_IDS.mediaDeleteConfirm,
      );
      const returnsToMedia = this.isChoice(
        text,
        2,
        'TIDAK',
        REPORT_ACTION_IDS.mediaDeleteBack,
      );
      if (!confirmsDelete && !returnsToMedia) {
        await reply([this.mediaDeleteConfirmationReply()]);
        return;
      }
      if (confirmsDelete) {
        const last = session.media.at(-1);
        if (last) {
          await this.prisma.whatsAppReportMedia.update({
            where: { id: last.id },
            data: { deletedAt: new Date() },
          });
          await this.history(
            session,
            'MEDIA_DELETED',
            payload.externalMessageId,
            {
              fileId: last.fileId,
            },
          );
        }
      }
      await this.transition(
        session,
        WhatsAppReportSessionState.MEDIA_CONFIRMATION,
        'MEDIA_DELETE_CONFIRMATION_CLOSED',
        payload.externalMessageId,
      );
      const refreshed = await this.loadSession(session.id);
      await reply([this.mediaConfirmationReply(refreshed ?? session)]);
      return;
    }

    if (state === WhatsAppReportSessionState.REVIEW) {
      const editState = this.reviewChoiceState(text);
      if (
        this.isChoice(text, 1, 'KIRIM INFORMASI', REPORT_ACTION_IDS.reviewSend)
      ) {
        await this.submit(session, payload, reply);
      } else if (editState) {
        await this.transition(
          session,
          editState,
          'REVIEW_EDIT_OPENED',
          payload.externalMessageId,
          { returnToReview: true },
        );
        await reply([this.promptForState(editState)]);
      } else if (
        this.isChoice(text, 6, 'BATALKAN', REPORT_ACTION_IDS.reviewCancel)
      ) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply([this.reviewReply(session)]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.CANCEL_CONFIRMATION) {
      if (
        this.isChoice(
          text,
          1,
          'YA',
          'BATALKAN',
          REPORT_ACTION_IDS.cancellationConfirm,
        )
      ) {
        await this.cancelSession(session, payload.externalMessageId);
        await reply([
          'Pembuatan berita dibatalkan. Silakan kirim PIN/kode Jaring Anda untuk memulai kembali.',
        ]);
      } else if (
        this.isChoice(
          text,
          2,
          'TIDAK',
          'KEMBALI',
          REPORT_ACTION_IDS.cancellationBack,
        )
      ) {
        const resumeState =
          session.resumeState ?? WhatsAppReportSessionState.LOCATION;
        await this.transition(
          session,
          resumeState,
          'CANCELLATION_REJECTED',
          payload.externalMessageId,
          { resumeState: null },
        );
        await reply([this.replyForState(session, resumeState)]);
      } else {
        await reply([this.cancellationConfirmationReply()]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.SUBMITTED) {
      await this.handleSubmittedInput(session, input, text);
      return;
    }

    if (state === WhatsAppReportSessionState.POST_SUBMIT_TEXT_CONFIRMATION) {
      if (!(await this.ensureSameDayFollowUp(session, payload, reply))) {
        return;
      }
      if (
        this.isChoice(
          text,
          1,
          'YA',
          'TAMBAHKAN',
          REPORT_ACTION_IDS.postSubmitTextAdd,
        )
      ) {
        if (session.submittedMessageId && session.pendingAmendmentText) {
          const versionNumber = await this.prisma.$transaction(async (tx) => {
            const nextVersion = await this.nextAmendmentVersion(
              tx,
              session.submittedMessageId as string,
            );
            await tx.whatsAppReportAmendment.create({
              data: {
                reportSessionId: session.id,
                whatsappMessageId: session.submittedMessageId as string,
                versionNumber: nextVersion,
                amendmentType: WhatsAppReportAmendmentType.CONTENT_ADDITION,
                content: session.pendingAmendmentText,
                senderPhone: session.senderPhone,
              },
            });
            return nextVersion;
          });
          await this.transition(
            session,
            WhatsAppReportSessionState.SUBMITTED,
            'AMENDMENT_ADDED',
            payload.externalMessageId,
            { pendingAmendmentText: null },
          );
          await reply([
            `Informasi tambahan berhasil disimpan sebagai Versi ${versionNumber}.\n\nNomor Referensi: ${session.referenceNumber}\nStatus: ${this.reportStatusLabel(session)}`,
            this.postSubmitActionReply({
              ...session,
              amendments: [{ versionNumber }],
            }),
          ]);
        }
      } else if (
        this.isChoice(text, 2, 'TIDAK', REPORT_ACTION_IDS.postSubmitTextDiscard)
      ) {
        await this.transition(
          session,
          WhatsAppReportSessionState.SUBMITTED,
          'AMENDMENT_DISCARDED',
          payload.externalMessageId,
          { pendingAmendmentText: null },
        );
        await reply([
          'Informasi tambahan tidak disimpan.',
          this.postSubmitActionReply(session),
        ]);
      } else if (
        this.isChoice(
          text,
          3,
          'BUAT BERITA BARU',
          REPORT_ACTION_IDS.postSubmitTextNew,
        )
      ) {
        await this.closeSession(
          session,
          'NEW_REPORT_REQUESTED',
          payload.externalMessageId,
        );
        await this.startSession(
          input.channel,
          payload,
          input.message,
          input.reply,
        );
      } else {
        await reply([this.postSubmitTextConfirmationReply(session)]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.POST_SUBMIT_MEDIA_PURPOSE) {
      if (!(await this.ensureSameDayFollowUp(session, payload, reply))) {
        return;
      }
      await this.handlePostSubmitMediaChoice(session, input, text);
    }
  }

  private async handleSubmittedInput(
    session: LoadedSession,
    input: {
      channel: WhatsAppReportChannel;
      socket: WASocket;
      message: WAMessage;
      payload: WhatsAppReportInboundPayload;
      reply: ReplySender;
    },
    text: string,
  ) {
    if (this.isCommand(text, [REPORT_ACTION_IDS.postSubmitNew])) {
      await this.closeSession(
        session,
        'NEW_REPORT_REQUESTED',
        input.payload.externalMessageId,
      );
      await this.startSession(
        input.channel,
        input.payload,
        input.message,
        input.reply,
      );
      return;
    }
    if (this.isCommand(text, [REPORT_ACTION_IDS.postSubmitStatus])) {
      await input.reply([
        await this.statusText(input.payload.senderPhone, session),
        this.postSubmitActionReply(session),
      ]);
      return;
    }
    if (this.isCommand(text, [REPORT_ACTION_IDS.postSubmitSummary])) {
      await input.reply([
        this.summaryText(session),
        this.postSubmitActionReply(session),
      ]);
      return;
    }
    if (this.isCommand(text, [REPORT_ACTION_IDS.postSubmitList])) {
      await input.reply([
        await this.reportHistoryReply(
          input.payload.senderPhone,
          0,
          this.validDate(input.payload.receivedAt),
        ),
      ]);
      return;
    }
    if (this.isCommand(text, [REPORT_ACTION_IDS.reportHistoryBack])) {
      await input.reply([this.postSubmitActionReply(session)]);
      return;
    }
    if (text.startsWith(REPORT_HISTORY_PAGE_PREFIX)) {
      const page = Number(text.slice(REPORT_HISTORY_PAGE_PREFIX.length));
      await input.reply([
        await this.reportHistoryReply(
          input.payload.senderPhone,
          Number.isInteger(page) && page >= 0 ? page : 0,
          this.validDate(input.payload.receivedAt),
        ),
      ]);
      return;
    }
    if (text.startsWith(REPORT_HISTORY_SELECT_PREFIX)) {
      await this.selectSameDayReport(
        session,
        text.slice(REPORT_HISTORY_SELECT_PREFIX.length),
        input.payload,
        input.reply,
      );
      return;
    }
    if (
      !(await this.ensureSameDayFollowUp(session, input.payload, input.reply))
    ) {
      return;
    }
    if (this.isCommand(text, [REPORT_ACTION_IDS.postSubmitContentAdd])) {
      await input.reply([
        'Silakan kirimkan narasi informasi tambahan. Setelah dikirim, bot akan meminta konfirmasi.',
      ]);
      return;
    }
    if (this.isCommand(text, [REPORT_ACTION_IDS.postSubmitMediaAdd])) {
      await input.reply([
        'Silakan kirim foto atau video dokumentasi tambahan.',
      ]);
      return;
    }
    const media = this.mediaMessage(input.message);
    if (media) {
      try {
        const file = await this.storeAndScanMedia(
          input.socket,
          input.message,
          session,
          media,
        );
        await this.transition(
          session,
          WhatsAppReportSessionState.POST_SUBMIT_MEDIA_PURPOSE,
          'POST_SUBMIT_MEDIA_RECEIVED',
          input.payload.externalMessageId,
          { pendingFileId: file.id },
        );
        await input.reply([this.postSubmitMediaPurposeReply(session)]);
      } catch (error) {
        this.logger.warn(`Post-submit media failed: ${this.messageOf(error)}`);
        await input.reply(['Dokumentasi gagal diterima. Silakan kirim ulang.']);
      }
      return;
    }
    if (text) {
      await this.transition(
        session,
        WhatsAppReportSessionState.POST_SUBMIT_TEXT_CONFIRMATION,
        'POST_SUBMIT_TEXT_RECEIVED',
        input.payload.externalMessageId,
        { pendingAmendmentText: text },
      );
      await input.reply([this.postSubmitTextConfirmationReply(session)]);
    }
  }

  private async handlePostSubmitMediaChoice(
    session: LoadedSession,
    input: {
      channel: WhatsAppReportChannel;
      message: WAMessage;
      payload: WhatsAppReportInboundPayload;
      reply: ReplySender;
    },
    text: string,
  ) {
    if (
      this.isChoice(
        text,
        1,
        'TAMBAH DOKUMENTASI',
        REPORT_ACTION_IDS.postSubmitMediaAdd,
      )
    ) {
      if (session.submittedMessageId && session.pendingFileId) {
        const versionNumber = await this.prisma.$transaction(async (tx) => {
          const nextVersion = await this.nextAmendmentVersion(
            tx,
            session.submittedMessageId as string,
          );
          const count = await tx.whatsAppMessageMedia.count({
            where: { messageId: session.submittedMessageId as string },
          });
          await tx.whatsAppMessageMedia.create({
            data: {
              messageId: session.submittedMessageId as string,
              fileId: session.pendingFileId as string,
              orderNo: count + 1,
            },
          });
          await tx.whatsAppReportAmendment.create({
            data: {
              reportSessionId: session.id,
              whatsappMessageId: session.submittedMessageId as string,
              versionNumber: nextVersion,
              amendmentType: WhatsAppReportAmendmentType.MEDIA_ADDITION,
              fileId: session.pendingFileId,
              senderPhone: session.senderPhone,
            },
          });
          return nextVersion;
        });
        await this.transition(
          session,
          WhatsAppReportSessionState.SUBMITTED,
          'AMENDMENT_MEDIA_ADDED',
          input.payload.externalMessageId,
          { pendingFileId: null },
        );
        await input.reply([
          `Dokumentasi tambahan berhasil disimpan sebagai Versi ${versionNumber}.\n\nNomor Referensi: ${session.referenceNumber}\nStatus: ${this.reportStatusLabel(session)}`,
          this.postSubmitActionReply({
            ...session,
            amendments: [{ versionNumber }],
          }),
        ]);
      }
    } else if (
      this.isChoice(
        text,
        2,
        'TAMBAH INFORMASI',
        REPORT_ACTION_IDS.postSubmitContentAdd,
      )
    ) {
      await this.transition(
        session,
        WhatsAppReportSessionState.SUBMITTED,
        'POST_SUBMIT_MEDIA_DISCARDED',
        input.payload.externalMessageId,
        { pendingFileId: null },
      );
      await input.reply(['Silakan kirimkan narasi informasi tambahan.']);
    } else if (
      this.isChoice(
        text,
        3,
        'LIHAT RINGKASAN',
        REPORT_ACTION_IDS.postSubmitSummary,
      )
    ) {
      await input.reply([
        this.summaryText(session),
        this.postSubmitMediaPurposeReply(session),
      ]);
    } else if (
      this.isChoice(
        text,
        4,
        'KIRIM INFORMASI BARU',
        REPORT_ACTION_IDS.postSubmitNew,
      )
    ) {
      await this.closeSession(
        session,
        'NEW_REPORT_REQUESTED',
        input.payload.externalMessageId,
      );
      await this.startSession(
        input.channel,
        input.payload,
        input.message,
        input.reply,
      );
    } else {
      await input.reply([this.postSubmitMediaPurposeReply(session)]);
    }
  }

  private async nextAmendmentVersion(
    tx: Prisma.TransactionClient,
    whatsappMessageId: string,
  ) {
    await tx.$queryRaw`
      SELECT "id"
      FROM "WhatsAppMessage"
      WHERE "id" = ${whatsappMessageId}::uuid
      FOR UPDATE
    `;
    const latest = await tx.whatsAppReportAmendment.aggregate({
      where: { whatsappMessageId },
      _max: { versionNumber: true },
    });
    return (latest._max.versionNumber ?? 1) + 1;
  }

  private async ensureSameDayFollowUp(
    session: LoadedSession,
    payload: WhatsAppReportInboundPayload,
    reply: ReplySender,
  ) {
    const referenceDate = this.validDate(payload.receivedAt);
    if (
      session.submittedAt &&
      this.wibDateKey(session.submittedAt) === this.wibDateKey(referenceDate)
    ) {
      return true;
    }

    if (session.currentState !== WhatsAppReportSessionState.SUBMITTED) {
      await this.transition(
        session,
        WhatsAppReportSessionState.SUBMITTED,
        'SAME_DAY_FOLLOW_UP_EXPIRED',
        payload.externalMessageId,
        { pendingAmendmentText: null, pendingFileId: null },
      );
    }
    await reply([
      'Penambahan versi hanya dapat dilakukan pada tanggal berita dikirim (hari yang sama dalam zona WIB).',
      this.postSubmitActionReply(session, referenceDate),
    ]);
    return false;
  }

  private async reportHistoryReply(
    senderPhone: string,
    requestedPage: number,
    referenceDate: Date,
  ): Promise<WhatsAppReportReply> {
    const { start, end } = this.wibDayRange(referenceDate);
    const where: Prisma.WhatsAppReportSessionWhereInput = {
      senderPhone,
      submittedMessageId: { not: null },
      referenceNumber: { not: null },
      submittedAt: { gte: start, lt: end },
    };
    const total = await this.prisma.whatsAppReportSession.count({ where });
    if (total === 0) {
      return 'Belum ada berita yang dikirim hari ini dalam zona waktu WIB.';
    }
    const lastPage = Math.max(
      0,
      Math.ceil(total / REPORT_HISTORY_PAGE_SIZE) - 1,
    );
    const page = Math.min(Math.max(requestedPage, 0), lastPage);
    const reports = await this.prisma.whatsAppReportSession.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      skip: page * REPORT_HISTORY_PAGE_SIZE,
      take: REPORT_HISTORY_PAGE_SIZE,
      include: this.sessionInclude(),
    });
    const rows: NativeFlowSingleSelectReply['sections'][number]['rows'] =
      reports.map((report) => ({
        id: `${REPORT_HISTORY_SELECT_PREFIX}${report.id}`,
        title: report.referenceNumber ?? report.id.slice(0, 20),
        description: `${this.reportStatusLabel(report)} • Versi ${this.currentReportVersion(report)}`,
      }));
    if (page > 0) {
      rows.push({
        id: `${REPORT_HISTORY_PAGE_PREFIX}${page - 1}`,
        title: 'Halaman Sebelumnya',
      });
    }
    if (page < lastPage) {
      rows.push({
        id: `${REPORT_HISTORY_PAGE_PREFIX}${page + 1}`,
        title: 'Halaman Berikutnya',
      });
    }
    rows.push({
      id: REPORT_ACTION_IDS.reportHistoryBack,
      title: 'Kembali',
    });
    return this.singleSelectReply({
      body: `DAFTAR BERITA HARI INI\n\nTanggal WIB: ${this.wibDisplayDate(referenceDate)}\nTotal: ${total} berita\nHalaman: ${page + 1}/${lastPage + 1}\n\nPilih berita untuk melihat atau menambahkan versi.`,
      buttonTitle: 'Pilih Berita',
      sectionTitle: 'Nomor dan Status Berita',
      rows,
    });
  }

  private async selectSameDayReport(
    activeSession: LoadedSession,
    reportSessionId: string,
    payload: WhatsAppReportInboundPayload,
    reply: ReplySender,
  ) {
    const referenceDate = this.validDate(payload.receivedAt);
    const { start, end } = this.wibDayRange(referenceDate);
    const target = await this.prisma.whatsAppReportSession.findFirst({
      where: {
        id: reportSessionId,
        senderPhone: payload.senderPhone,
        submittedMessageId: { not: null },
        submittedAt: { gte: start, lt: end },
      },
      include: this.sessionInclude(),
    });
    if (!target) {
      await reply([
        'Berita tidak ditemukan atau tidak termasuk berita yang dikirim hari ini (WIB).',
        await this.reportHistoryReply(payload.senderPhone, 0, referenceDate),
      ]);
      return;
    }

    if (target.id !== activeSession.id) {
      await this.prisma.$transaction(async (tx) => {
        await tx.whatsAppReportSession.updateMany({
          where: {
            senderPhone: payload.senderPhone,
            activeSenderKey: payload.senderPhone,
            id: { not: target.id },
          },
          data: { activeSenderKey: null },
        });
        await tx.whatsAppReportSession.update({
          where: { id: target.id },
          data: {
            activeSenderKey: payload.senderPhone,
            status: WhatsAppReportSessionStatus.SUBMITTED,
            currentState: WhatsAppReportSessionState.SUBMITTED,
            pendingAmendmentText: null,
            pendingFileId: null,
            closedAt: null,
            expiresAt: new Date(
              referenceDate.getTime() + SUBMITTED_SESSION_TTL_MS,
            ),
            lastActivityAt: referenceDate,
          },
        });
        await tx.whatsAppReportHistory.create({
          data: {
            reportSessionId: target.id,
            action: 'REPORT_SELECTED_FOR_FOLLOW_UP',
            previousState: target.currentState,
            newState: WhatsAppReportSessionState.SUBMITTED,
            externalMessageId: payload.externalMessageId,
            metadata: {
              referenceNumber: target.referenceNumber,
              selectedFromSessionId: activeSession.id,
            },
          },
        });
      });
    }

    const selected = {
      ...target,
      status: WhatsAppReportSessionStatus.SUBMITTED,
      currentState: WhatsAppReportSessionState.SUBMITTED,
      activeSenderKey: payload.senderPhone,
    };
    await reply([
      `Berita dipilih.\n\nNomor Referensi: ${selected.referenceNumber ?? '-'}\nStatus: ${this.reportStatusLabel(selected)}\nVersi Saat Ini: ${this.currentReportVersion(selected)}`,
      this.postSubmitActionReply(selected, referenceDate),
    ]);
  }

  private async submit(
    session: LoadedSession,
    payload: WhatsAppReportInboundPayload,
    reply: ReplySender,
  ) {
    if (!this.isComplete(session)) {
      await reply(['Informasi belum lengkap dan belum dapat dikirim.']);
      return;
    }

    const latitude = Number(session.latitude);
    const longitude = Number(session.longitude);
    const areaResolution = await this.spatial.resolveReportArea(
      latitude,
      longitude,
    );
    const now = new Date();
    const dateKey = this.wibDateKey(now);

    const submitted = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.whatsAppReportReferenceCounter.upsert({
        where: { dateKey },
        create: { dateKey, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const referenceNumber = `INF-${dateKey}-${String(counter.lastValue).padStart(5, '0')}`;
      const whatsappMessage = await tx.whatsAppMessage.create({
        data: {
          integrationChannelId: session.integrationChannelId,
          externalMessageId: `report:${session.id}`,
          senderPhone: session.senderPhone,
          jaringId: session.jaringId,
          routedToFieldOfficerAssignmentId: session.fieldOfficerAssignmentId,
          title: session.title,
          content: session.content,
          referenceNumber,
          latitude,
          longitude,
          gpsAccuracyMeters: session.locationAccuracyMeters,
          locationCapturedAt: session.locationCapturedAt,
          coordinateSource: CoordinateSource.WHATSAPP_LOCATION,
          resolvedAreaId: areaResolution?.area?.areaId ?? null,
          areaResolutionMethod:
            areaResolution?.method ?? AreaResolutionMethod.UNRESOLVED,
          areaResolutionConfidence: areaResolution?.confidence ?? null,
          areaResolvedAt: areaResolution?.resolvedAt ?? null,
          status: WhatsAppMessageStatus.RECEIVED,
          validationSummary: WhatsAppValidationSummary.NOT_CHECKED,
          contentChecksum: createHash('sha256')
            .update(session.content as string)
            .digest('hex'),
          rawPayload: {
            source: 'WHATSAPP_BOT_REPORT_FSM',
            reportSessionId: session.id,
            referenceNumber,
            incidentAt: session.incidentAt?.toISOString(),
            timezone: session.timezone,
            locationMessageId: session.locationMessageId,
            locationType: session.locationType,
            startedAt: session.startedAt.toISOString(),
            submittedAt: now.toISOString(),
          },
          receivedAt: now,
          media: {
            create: session.media.map((item, index) => ({
              fileId: item.fileId,
              caption: item.caption,
              orderNo: index + 1,
            })),
          },
        },
      });
      await tx.whatsAppReportSession.update({
        where: { id: session.id },
        data: {
          currentState: WhatsAppReportSessionState.SUBMITTED,
          status: WhatsAppReportSessionStatus.SUBMITTED,
          submittedMessageId: whatsappMessage.id,
          referenceNumber,
          submittedAt: now,
          expiresAt: new Date(now.getTime() + SUBMITTED_SESSION_TTL_MS),
        },
      });
      await tx.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action: 'INFORMATION_SUBMITTED',
          previousState: session.currentState,
          newState: WhatsAppReportSessionState.SUBMITTED,
          externalMessageId: payload.externalMessageId,
          metadata: { referenceNumber, whatsappMessageId: whatsappMessage.id },
        },
      });
      return { referenceNumber };
    });

    await reply([
      `━━━━━━━━━━━━━━━━━━\nINFORMASI BERHASIL DIKIRIM\n━━━━━━━━━━━━━━━━━━\n\nTerima kasih.\n\nNomor Referensi:\n${submitted.referenceNumber}\n\nStatus:\nMENUNGGU VALIDASI`,
      this.postSubmitActionReply({
        ...session,
        referenceNumber: submitted.referenceNumber,
        submittedAt: now,
      }),
    ]);
  }

  private async requestCancellation(
    session: LoadedSession,
    externalMessageId: string,
    reply: ReplySender,
  ) {
    await this.transition(
      session,
      WhatsAppReportSessionState.CANCEL_CONFIRMATION,
      'CANCELLATION_REQUESTED',
      externalMessageId,
      { resumeState: session.currentState },
    );
    await reply([this.cancellationConfirmationReply()]);
  }

  private async cancelSession(
    session: LoadedSession,
    externalMessageId: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.whatsAppReportSession.update({
        where: { id: session.id },
        data: {
          status: WhatsAppReportSessionStatus.CANCELLED,
          activeSenderKey: null,
          closedAt: new Date(),
          currentState: WhatsAppReportSessionState.CLOSED,
          resumeState: null,
        },
      }),
      this.prisma.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action: 'SESSION_CANCELLED',
          previousState: session.currentState,
          newState: WhatsAppReportSessionState.CLOSED,
          externalMessageId,
        },
      }),
    ]);
  }

  private async closeSession(
    session: LoadedSession,
    action: string,
    externalMessageId: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.whatsAppReportSession.update({
        where: { id: session.id },
        data: {
          status: WhatsAppReportSessionStatus.CLOSED,
          activeSenderKey: null,
          currentState: WhatsAppReportSessionState.CLOSED,
          pendingFileId: null,
          pendingAmendmentText: null,
          closedAt: new Date(),
        },
      }),
      this.prisma.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action,
          previousState: session.currentState,
          newState: WhatsAppReportSessionState.CLOSED,
          externalMessageId,
        },
      }),
    ]);
  }

  private async expireSession(
    session: LoadedSession,
    externalMessageId: string,
  ) {
    await this.prisma.$transaction([
      this.prisma.whatsAppReportSession.update({
        where: { id: session.id },
        data: {
          status: WhatsAppReportSessionStatus.EXPIRED,
          activeSenderKey: null,
        },
      }),
      this.prisma.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action: 'SESSION_EXPIRED',
          previousState: session.currentState,
          newState: session.currentState,
          externalMessageId,
        },
      }),
    ]);
  }

  private findActiveSession(senderPhone: string) {
    return this.prisma.whatsAppReportSession.findUnique({
      where: { activeSenderKey: senderPhone },
      include: this.sessionInclude(),
    });
  }

  private findJaringByPhone(senderPhone: string) {
    if (!this.prisma?.jaring?.findFirst) {
      return Promise.resolve(null);
    }
    const raw = senderPhone.replace(/\D+/g, '');
    const candidates = Array.from(
      new Set([
        senderPhone,
        raw,
        `+${raw}`,
        raw.startsWith('62') ? `0${raw.slice(2)}` : raw,
        raw.startsWith('62') ? raw.slice(2) : raw,
      ]),
    );

    return this.prisma.jaring.findFirst({
      where: {
        whatsappNumber: { in: candidates },
        registrationStatus: JaringRegistrationStatus.APPROVED,
        deletedAt: null,
      },
      include: {
        areaCoverages: {
          where: { validUntil: null },
          select: { areaId: true },
        },
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          take: 1,
        },
      },
    });
  }

  private loadSession(id: string) {
    if (!this.prisma?.whatsAppReportSession?.findUnique) {
      return Promise.resolve(null);
    }
    return this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      include: this.sessionInclude(),
    });
  }

  private sessionInclude() {
    return {
      jaring: true,
      contentParts: { orderBy: { orderNo: 'asc' as const } },
      media: {
        where: { deletedAt: null },
        orderBy: { orderNo: 'asc' as const },
        include: { file: true },
      },
      amendments: {
        orderBy: { versionNumber: 'desc' as const },
        take: 1,
        select: { versionNumber: true },
      },
      submittedMessage: {
        include: {
          convertedBaket: {
            select: { status: true },
          },
        },
      },
    };
  }

  private async touchSession(id: string, status: WhatsAppReportSessionStatus) {
    const ttl =
      status === WhatsAppReportSessionStatus.SUBMITTED
        ? SUBMITTED_SESSION_TTL_MS
        : SESSION_TTL_MS;
    await this.prisma.whatsAppReportSession.update({
      where: { id },
      data: {
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + ttl),
      },
    });
  }

  private async transition(
    session: LoadedSession,
    nextState: WhatsAppReportSessionState,
    action: string,
    externalMessageId: string,
    data: Prisma.WhatsAppReportSessionUncheckedUpdateInput = {},
  ) {
    await this.prisma.$transaction([
      this.prisma.whatsAppReportSession.update({
        where: { id: session.id },
        data: {
          ...data,
          currentState: nextState,
          lastActivityAt: new Date(),
        },
      }),
      this.prisma.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action,
          previousState: session.currentState,
          newState: nextState,
          externalMessageId,
        },
      }),
    ]);
  }

  private async history(
    session: LoadedSession,
    action: string,
    externalMessageId: string,
    metadata?: Prisma.InputJsonObject,
  ) {
    await this.prisma.whatsAppReportHistory.create({
      data: {
        reportSessionId: session.id,
        action,
        previousState: session.currentState,
        newState: session.currentState,
        externalMessageId,
        metadata,
      },
    });
  }

  private extractLiveLocation(message: WAMessage) {
    const unwrapped = this.unwrapMessage(message.message);
    const location =
      unwrapped?.liveLocationMessage ??
      (unwrapped?.locationMessage?.isLive
        ? unwrapped.locationMessage
        : undefined);
    if (!location) return null;
    const latitude = Number(location.degreesLatitude);
    const longitude = Number(location.degreesLongitude);
    const accuracy = Number(
      (location as { accuracyInMeters?: number | null }).accuracyInMeters,
    );
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }
    return {
      latitude,
      longitude,
      accuracy:
        Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : undefined,
    };
  }

  private mediaMessage(message: WAMessage) {
    const unwrapped = this.unwrapMessage(message.message);
    if (unwrapped?.imageMessage) {
      return {
        fileType: FileType.PHOTO,
        mimeType: unwrapped.imageMessage.mimetype || 'image/jpeg',
        caption: unwrapped.imageMessage.caption ?? undefined,
      };
    }
    if (unwrapped?.videoMessage) {
      return {
        fileType: FileType.VIDEO,
        mimeType: unwrapped.videoMessage.mimetype || 'video/mp4',
        caption: unwrapped.videoMessage.caption ?? undefined,
      };
    }
    return null;
  }

  private async storeAndScanMedia(
    socket: WASocket,
    message: WAMessage,
    session: Pick<LoadedSession, 'id'>,
    media: { fileType: FileType; mimeType: string; caption?: string },
  ) {
    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger: P({ level: 'silent' }),
        reuploadRequest: socket.updateMediaMessage.bind(socket),
      },
    );
    const extension = this.extensionForMime(media.mimeType);
    const originalName = `${session.id}-${message.key.id ?? Date.now()}.${extension}`;
    const storageKey = this.storage.createStorageKey(
      'whatsapp-evidence',
      originalName,
    );
    await this.storage.write(storageKey, buffer);
    const file = await this.prisma.fileAsset.create({
      data: {
        storageKey,
        originalName,
        mimeType: media.mimeType,
        fileType: media.fileType,
        sizeBytes: BigInt(buffer.length),
        checksumSha256: createHash('sha256').update(buffer).digest('hex'),
        lifecycleStatus: FileLifecycleStatus.UPLOADED,
      },
    });
    const scan = await this.files.scanFile(file.id);
    if (!scan.clean) {
      throw new Error('Media did not pass malware scanning');
    }
    return file;
  }

  private unwrapMessage(message?: WAMessage['message']) {
    if (!message) return undefined;
    return (
      message.ephemeralMessage?.message ??
      message.viewOnceMessage?.message ??
      message.viewOnceMessageV2?.message ??
      message
    );
  }

  private validateTitle(title: string) {
    if (title.length < 5) return 'Judul minimal 5 karakter.';
    if (title.length > 150) return 'Judul maksimal 150 karakter.';
    if (!/[\p{L}\p{N}]/u.test(title)) {
      return 'Judul harus mengandung huruf atau angka.';
    }
    return null;
  }

  private wibDateKey(value: Date) {
    const parts = this.wibDateParts(value);
    return `${parts.year}${parts.month}${parts.day}`;
  }

  private wibDateParts(value: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
    };
  }

  private wibDayRange(value: Date) {
    const parts = this.wibDateParts(value);
    const start = new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        -7,
      ),
    );
    return {
      start,
      end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
    };
  }

  private wibDisplayDate(value: Date) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(value);
  }

  private validDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private currentReportVersion(session: Pick<LoadedSession, 'amendments'>) {
    return session.amendments?.[0]?.versionNumber ?? 1;
  }

  private isComplete(session: LoadedSession) {
    return Boolean(
      session.title &&
      session.content &&
      session.latitude !== null &&
      session.longitude !== null &&
      session.locationAccuracyMeters !== null &&
      session.locationCapturedAt &&
      session.incidentAt &&
      session.media.length > 0,
    );
  }

  private reviewSummaryText(session: LoadedSession) {
    return `━━━━━━━━━━━━━━━━━━
RINGKASAN INFORMASI
━━━━━━━━━━━━━━━━━━

📍 LOKASI
Latitude  : ${session.latitude ?? '-'}
Longitude : ${session.longitude ?? '-'}
Akurasi   : ${session.locationAccuracyMeters ?? '-'} meter

🕒 WAKTU KEJADIAN
${session.incidentAt ? this.formatIncidentAt(session.incidentAt) : '-'} WIB

📝 JUDUL
${session.title ?? '-'}

📄 INFORMASI
${session.content ?? '-'}

📷 DOKUMENTASI
Foto/Video: ${session.media?.length ?? 0} file`;
  }

  private singleSelectReply(input: {
    body: string;
    buttonTitle?: string;
    sectionTitle: string;
    rows: NativeFlowSingleSelectReply['sections'][number]['rows'];
  }): NativeFlowSingleSelectReply {
    return {
      kind: 'native_flow_single_select',
      body: input.body,
      footer: 'Pilih satu tindakan untuk melanjutkan.',
      buttonTitle: input.buttonTitle ?? 'Pilih Tindakan',
      sections: [{ title: input.sectionTitle, rows: input.rows }],
    };
  }

  private existingSessionChoiceReply() {
    return this.singleSelectReply({
      body: 'Anda masih memiliki informasi yang belum selesai. Pilih tindakan untuk informasi tersebut.',
      sectionTitle: 'Informasi Aktif',
      rows: [
        {
          id: REPORT_ACTION_IDS.existingResume,
          title: 'Lanjutkan Informasi',
          description: 'Kembali ke tahap terakhir.',
        },
        {
          id: REPORT_ACTION_IDS.existingSummary,
          title: 'Lihat Ringkasan',
          description: 'Tampilkan data yang sudah tersimpan.',
        },
        {
          id: REPORT_ACTION_IDS.existingCancel,
          title: 'Batalkan Informasi Lama',
          description: 'Batalkan draft yang sedang aktif.',
        },
        {
          id: REPORT_ACTION_IDS.existingNew,
          title: 'Simpan dan Buat Baru',
          description: 'Arsipkan draft lalu mulai informasi baru.',
        },
      ],
    });
  }

  private titleConfirmationReply(title: string) {
    return this.singleSelectReply({
      body: `━━━━━━━━━━━━━━━━━━\nJUDUL INFORMASI\n━━━━━━━━━━━━━━━━━━\n\n${title}\n\nApakah judul tersebut sudah benar?`,
      sectionTitle: 'Konfirmasi Judul',
      rows: [
        { id: REPORT_ACTION_IDS.titleSave, title: 'Simpan' },
        { id: REPORT_ACTION_IDS.titleEdit, title: 'Edit Judul' },
        { id: REPORT_ACTION_IDS.titleCancel, title: 'Batalkan' },
      ],
    });
  }

  private contentConfirmationReply(content: string) {
    return this.singleSelectReply({
      body: `━━━━━━━━━━━━━━━━━━\nRINGKASAN INFORMASI\n━━━━━━━━━━━━━━━━━━\n\n${content}\n\nApakah informasi tersebut sudah benar?`,
      sectionTitle: 'Konfirmasi Informasi',
      rows: [
        { id: REPORT_ACTION_IDS.contentSave, title: 'Simpan' },
        {
          id: REPORT_ACTION_IDS.contentAdd,
          title: 'Tambah Informasi',
        },
        { id: REPORT_ACTION_IDS.contentRewrite, title: 'Edit Ulang' },
        { id: REPORT_ACTION_IDS.contentCancel, title: 'Batalkan' },
      ],
    });
  }

  private contentCollectionReply(partCount: number, mediaCount: number) {
    return this.singleSelectReply({
      body: `Isi dan lampiran berhasil diterima.\n\nBagian informasi: ${partCount}\nFoto/Video: ${mediaCount} file\n\nApakah isi dan lampiran sudah lengkap?`,
      sectionTitle: 'Isi dan Lampiran',
      rows: [
        {
          id: REPORT_ACTION_IDS.contentFinish,
          title: 'Selesai Isi & Lampiran',
          description: 'Lanjutkan jika isi dan dokumentasi sudah lengkap.',
        },
        {
          id: REPORT_ACTION_IDS.contentContinue,
          title: 'Tambah Isi/Lampiran',
          description: 'Kirim teks, foto, atau video berikutnya.',
        },
      ],
    });
  }

  private locationConfirmationReply(
    latitude: unknown,
    longitude: unknown,
    accuracy: unknown,
  ) {
    return this.singleSelectReply({
      body: `━━━━━━━━━━━━━━━━━━\nKONFIRMASI LOKASI\n━━━━━━━━━━━━━━━━━━\n\nLokasi berhasil diterima.\n\nLatitude  : ${String(latitude ?? '-')}\nLongitude : ${String(longitude ?? '-')}\nAkurasi   : ±${String(accuracy ?? '-')} meter\n\nGunakan lokasi ini?`,
      sectionTitle: 'Konfirmasi Lokasi',
      rows: [
        { id: REPORT_ACTION_IDS.locationUse, title: 'Ya, Gunakan' },
        {
          id: REPORT_ACTION_IDS.locationRetry,
          title: 'Kirim Ulang Lokasi',
        },
      ],
    });
  }

  private timeConfirmationReply(incidentAt: Date) {
    return this.singleSelectReply({
      body: `━━━━━━━━━━━━━━━━━━\nKONFIRMASI WAKTU KEJADIAN\n━━━━━━━━━━━━━━━━━━\n\n${this.formatIncidentAt(incidentAt)} WIB\n\nApakah tanggal dan waktu kejadian sudah benar?`,
      sectionTitle: 'Konfirmasi Waktu',
      rows: [
        { id: REPORT_ACTION_IDS.timeSave, title: 'Ya, Simpan' },
        { id: REPORT_ACTION_IDS.timeRetry, title: 'Input Ulang' },
        { id: REPORT_ACTION_IDS.timeCancel, title: 'Batalkan' },
      ],
    });
  }

  private reviewReply(session: LoadedSession) {
    return this.singleSelectReply({
      body: `${this.reviewSummaryText(session)}\n\nSilakan pilih tindakan.`,
      sectionTitle: 'Tindakan Informasi',
      rows: [
        {
          id: REPORT_ACTION_IDS.reviewSend,
          title: 'Kirim Informasi',
          description: 'Kirim informasi untuk proses validasi.',
        },
        {
          id: REPORT_ACTION_IDS.reviewEditTitle,
          title: 'Edit Judul',
          description: 'Ubah judul informasi.',
        },
        {
          id: REPORT_ACTION_IDS.reviewEditContent,
          title: 'Edit Informasi',
          description: 'Ubah isi atau kronologi informasi.',
        },
        {
          id: REPORT_ACTION_IDS.reviewEditLocation,
          title: 'Edit Lokasi',
          description: 'Kirim ulang Live Location.',
        },
        {
          id: REPORT_ACTION_IDS.reviewEditTime,
          title: 'Edit Waktu Kejadian',
          description: 'Ubah tanggal dan waktu kejadian.',
        },
        {
          id: REPORT_ACTION_IDS.reviewEditMedia,
          title: 'Edit Dokumentasi',
          description: 'Kelola foto atau video dokumentasi.',
        },
        {
          id: REPORT_ACTION_IDS.reviewCancel,
          title: 'Batalkan',
          description: 'Batalkan pembuatan informasi.',
        },
      ],
    });
  }

  private summaryText(session: LoadedSession) {
    const reference = session.referenceNumber
      ? `Nomor Referensi: ${session.referenceNumber}\n\n`
      : '';
    return `${reference}${this.reviewSummaryText(session)}`;
  }

  private mediaConfirmationReply(session: LoadedSession) {
    const photos = session.media.filter(
      (item) => item.mediaType === FileType.PHOTO,
    ).length;
    const videos = session.media.filter(
      (item) => item.mediaType === FileType.VIDEO,
    ).length;
    return this.singleSelectReply({
      body: `━━━━━━━━━━━━━━━━━━\nDOKUMENTASI DITERIMA\n━━━━━━━━━━━━━━━━━━\n\nFoto  : ${photos} file\nVideo : ${videos} file\n\nApakah dokumentasi sudah lengkap?`,
      sectionTitle: 'Kelola Dokumentasi',
      rows: [
        { id: REPORT_ACTION_IDS.mediaSave, title: 'Selesai Dokumentasi' },
        {
          id: REPORT_ACTION_IDS.mediaAdd,
          title: 'Tambah Dokumentasi',
        },
        {
          id: REPORT_ACTION_IDS.mediaDelete,
          title: 'Hapus Terakhir',
          description: 'Hapus dokumentasi terakhir yang dikirim.',
        },
        {
          id: REPORT_ACTION_IDS.mediaList,
          title: 'Lihat Daftar Dokumentasi',
        },
      ],
    });
  }

  private mediaDeleteConfirmationReply() {
    return this.singleSelectReply({
      body: 'Hapus dokumentasi terakhir?',
      sectionTitle: 'Konfirmasi Hapus',
      rows: [
        {
          id: REPORT_ACTION_IDS.mediaDeleteConfirm,
          title: 'Ya, Hapus',
        },
        { id: REPORT_ACTION_IDS.mediaDeleteBack, title: 'Tidak' },
      ],
    });
  }

  private cancellationConfirmationReply() {
    return this.singleSelectReply({
      body: 'Apakah Anda yakin ingin membatalkan proses pengiriman informasi?',
      sectionTitle: 'Konfirmasi Pembatalan',
      rows: [
        {
          id: REPORT_ACTION_IDS.cancellationConfirm,
          title: 'Ya, Batalkan',
        },
        {
          id: REPORT_ACTION_IDS.cancellationBack,
          title: 'Tidak, Kembali',
        },
      ],
    });
  }

  private postSubmitTextConfirmationReply(session: LoadedSession) {
    return this.singleSelectReply({
      body: `Informasi tambahan terdeteksi.\n\nTambahkan ke berita ${session.referenceNumber ?? '-'}?`,
      sectionTitle: 'Informasi Tambahan',
      rows: [
        {
          id: REPORT_ACTION_IDS.postSubmitTextAdd,
          title: 'Ya, Tambahkan',
        },
        {
          id: REPORT_ACTION_IDS.postSubmitTextDiscard,
          title: 'Tidak',
        },
        {
          id: REPORT_ACTION_IDS.postSubmitTextNew,
          title: 'Buat Berita Baru',
        },
      ],
    });
  }

  private postSubmitMediaPurposeReply(session: LoadedSession) {
    return this.singleSelectReply({
      body: `Masih terdapat informasi yang sedang diproses.\n\nNomor Referensi: ${session.referenceNumber ?? '-'}\n\nApa yang ingin Anda lakukan?`,
      sectionTitle: 'Tindakan Berita',
      rows: [
        {
          id: REPORT_ACTION_IDS.postSubmitMediaAdd,
          title: 'Tambah Dokumentasi',
        },
        {
          id: REPORT_ACTION_IDS.postSubmitContentAdd,
          title: 'Tambah Informasi',
        },
        {
          id: REPORT_ACTION_IDS.postSubmitSummary,
          title: 'Lihat Ringkasan',
        },
        {
          id: REPORT_ACTION_IDS.postSubmitNew,
          title: 'Kirim Informasi Baru',
        },
      ],
    });
  }

  private postSubmitActionReply(session: LoadedSession, now = new Date()) {
    const canAddVersion = Boolean(
      session.submittedAt &&
      this.wibDateKey(session.submittedAt) === this.wibDateKey(now),
    );
    const rows: NativeFlowSingleSelectReply['sections'][number]['rows'] = [
      {
        id: REPORT_ACTION_IDS.postSubmitList,
        title: 'Daftar Berita Hari Ini',
        description: 'Lihat nomor berita, status, dan versi.',
      },
      {
        id: REPORT_ACTION_IDS.postSubmitNew,
        title: 'Buat Informasi Baru',
      },
      {
        id: REPORT_ACTION_IDS.postSubmitStatus,
        title: 'Lihat Status',
      },
      {
        id: REPORT_ACTION_IDS.postSubmitSummary,
        title: 'Lihat Ringkasan',
      },
    ];
    if (canAddVersion) {
      rows.push(
        {
          id: REPORT_ACTION_IDS.postSubmitContentAdd,
          title: 'Tambah Informasi',
          description: 'Disimpan sebagai versi berikutnya.',
        },
        {
          id: REPORT_ACTION_IDS.postSubmitMediaAdd,
          title: 'Tambah Dokumentasi',
          description: 'Disimpan sebagai versi berikutnya.',
        },
      );
    }
    return this.singleSelectReply({
      body: `Nomor Referensi: ${session.referenceNumber ?? '-'}\nStatus: ${this.reportStatusLabel(session)}\nVersi Saat Ini: ${this.currentReportVersion(session)}\n\nPenambahan versi hanya tersedia pada hari berita dikirim (WIB).`,
      sectionTitle: 'Lanjutkan Berita',
      rows,
    });
  }

  private replyForState(
    session: LoadedSession,
    state: WhatsAppReportSessionState,
  ): WhatsAppReportReply {
    if (state === WhatsAppReportSessionState.EXISTING_SESSION_CHOICE) {
      return this.existingSessionChoiceReply();
    }
    if (state === WhatsAppReportSessionState.TITLE_CONFIRMATION) {
      return this.titleConfirmationReply(session.title ?? '-');
    }
    if (state === WhatsAppReportSessionState.CONTENT_CONFIRMATION) {
      return this.contentConfirmationReply(session.content ?? '-');
    }
    if (state === WhatsAppReportSessionState.LOCATION_CONFIRMATION) {
      return this.locationConfirmationReply(
        session.latitude,
        session.longitude,
        session.locationAccuracyMeters,
      );
    }
    if (state === WhatsAppReportSessionState.TIME_CONFIRMATION) {
      return this.timeConfirmationReply(session.incidentAt ?? new Date());
    }
    if (state === WhatsAppReportSessionState.MEDIA_CONFIRMATION) {
      return this.mediaConfirmationReply(session);
    }
    if (state === WhatsAppReportSessionState.MEDIA_DELETE_CONFIRMATION) {
      return this.mediaDeleteConfirmationReply();
    }
    if (state === WhatsAppReportSessionState.REVIEW) {
      return this.reviewReply(session);
    }
    if (state === WhatsAppReportSessionState.CANCEL_CONFIRMATION) {
      return this.cancellationConfirmationReply();
    }
    if (state === WhatsAppReportSessionState.POST_SUBMIT_TEXT_CONFIRMATION) {
      return this.postSubmitTextConfirmationReply(session);
    }
    if (state === WhatsAppReportSessionState.POST_SUBMIT_MEDIA_PURPOSE) {
      return this.postSubmitMediaPurposeReply(session);
    }
    return this.promptForState(state);
  }

  private mediaListText(session: LoadedSession) {
    if (session.media.length === 0) return 'Belum ada dokumentasi.';
    return session.media
      .map(
        (item, index) =>
          `${index + 1}. ${item.mediaType === FileType.VIDEO ? 'Video' : 'Foto'}${item.caption ? ` — ${item.caption}` : ''}`,
      )
      .join('\n');
  }

  private promptForState(state: WhatsAppReportSessionState) {
    const prompts: Partial<Record<WhatsAppReportSessionState, string>> = {
      [WhatsAppReportSessionState.LOCATION]:
        '━━━━━━━━━━━━━━━━━━\nLANGKAH 1/4\n📍 LIVE LOCATION\n━━━━━━━━━━━━━━━━━━\n\nSilakan kirim Live Location melalui fitur lokasi WhatsApp. Proses tidak dapat dilanjutkan tanpa lokasi.',
      [WhatsAppReportSessionState.TITLE]:
        '━━━━━━━━━━━━━━━━━━\nLANGKAH 2/4\n📝 JUDUL INFORMASI\n━━━━━━━━━━━━━━━━━━\n\nSilakan tuliskan judul informasi.',
      [WhatsAppReportSessionState.CONTENT]:
        '━━━━━━━━━━━━━━━━━━\nLANGKAH 3/4\n📄 INFORMASI & DOKUMENTASI\n━━━━━━━━━━━━━━━━━━\n\nSilakan kirim narasi berita beserta foto/video dokumentasi. Caption pada foto/video otomatis dimasukkan sebagai isi narasi.',
      [WhatsAppReportSessionState.TIME]:
        '━━━━━━━━━━━━━━━━━━\nLANGKAH 4/4\n🕒 WAKTU KEJADIAN\n━━━━━━━━━━━━━━━━━━\n\nMasukkan tanggal dan waktu kejadian dalam format DD-MM-YYYY HH:mm.\n\nContoh: 03-08-2026 14:30\nZona waktu: WIB.',
      [WhatsAppReportSessionState.MEDIA]:
        '━━━━━━━━━━━━━━━━━━\n📷 KELOLA DOKUMENTASI\n━━━━━━━━━━━━━━━━━━\n\nKirim foto atau video. Setelah file diterima, pilih Selesai Dokumentasi atau Tambah Dokumentasi.',
    };
    return prompts[state] ?? `Tahap saat ini: ${this.stateLabel(state)}.`;
  }

  private welcomeText() {
    return 'Selamat datang, apakah ada yang ingin Anda sampaikan.\n\nSilakan masukkan PIN/kode Jaring Anda.';
  }

  private menuText(session: LoadedSession | null) {
    if (!session) {
      return 'MENU\n\nKirim PIN/kode Jaring untuk membuat berita baru.\nKetik BANTUAN untuk melihat petunjuk.';
    }
    return `MENU

STATUS
RINGKASAN
EDIT JUDUL
EDIT INFORMASI
EDIT LOKASI
EDIT WAKTU KEJADIAN
EDIT DOKUMENTASI
KIRIM
BATAL
INFORMASI BARU
BANTUAN`;
  }

  private helpText() {
    return `BANTUAN BOT

Kirim PIN/kode Jaring untuk memulai berita baru.
Ikuti empat tahap dan konfirmasi setiap data.
Pada tahap isi, Anda dapat mengirim teks, foto, atau video. Caption media akan menjadi isi berita.
Live Location, narasi, serta minimal satu foto/video wajib tersedia.

Command:
MENU, STATUS, RINGKASAN, EDIT JUDUL, EDIT INFORMASI,
EDIT LOKASI, EDIT WAKTU KEJADIAN, EDIT DOKUMENTASI, KIRIM, BATAL.`;
  }

  private reportStatusLabel(session: Pick<LoadedSession, 'submittedMessage'>) {
    const message = session.submittedMessage;
    const baketStatus = message?.convertedBaket?.status;
    if (baketStatus === 'VERIFIED') return 'BAKET TERVERIFIKASI';
    if (baketStatus === 'REJECTED') return 'BAKET DITOLAK';
    if (baketStatus) return `BAKET ${baketStatus.replaceAll('_', ' ')}`;
    if (message?.validationSummary === WhatsAppValidationSummary.INVALID) {
      return 'DITOLAK';
    }
    if (
      message?.validationSummary === WhatsAppValidationSummary.VALID ||
      message?.status === WhatsAppMessageStatus.READY_FOR_BAKET ||
      message?.status === WhatsAppMessageStatus.PROCESSED
    ) {
      return 'TERVERIFIKASI';
    }
    if (message?.status === WhatsAppMessageStatus.UNDER_REVIEW) {
      return 'DALAM PENINJAUAN';
    }
    return 'MENUNGGU VALIDASI';
  }

  private async statusText(senderPhone: string, session: LoadedSession | null) {
    const target =
      session ??
      (await this.prisma.whatsAppReportSession.findFirst({
        where: { senderPhone },
        orderBy: { updatedAt: 'desc' },
        include: this.sessionInclude(),
      }));
    if (!target) return 'Belum ada informasi yang tercatat.';
    if (target.status === WhatsAppReportSessionStatus.ACTIVE) {
      return `Informasi masih berupa draft.\nTahap: ${this.stateLabel(target.currentState)}.`;
    }
    return `Nomor Referensi: ${target.referenceNumber ?? '-'}\nStatus: ${this.reportStatusLabel(target)}\nVersi: ${this.currentReportVersion(target)}`;
  }

  private stateLabel(state: WhatsAppReportSessionState) {
    return state.replaceAll('_', ' ');
  }

  private editCommandTarget(text: string) {
    const commands = new Map<string, WhatsAppReportSessionState>([
      ['EDIT JUDUL', WhatsAppReportSessionState.TITLE],
      ['EDIT INFORMASI', WhatsAppReportSessionState.CONTENT],
      ['EDIT LOKASI', WhatsAppReportSessionState.LOCATION],
      ['EDIT TANGGAL', WhatsAppReportSessionState.TIME],
      ['EDIT TANGGAL KEJADIAN', WhatsAppReportSessionState.TIME],
      ['EDIT WAKTU KEJADIAN', WhatsAppReportSessionState.TIME],
      ['EDIT DOKUMENTASI', WhatsAppReportSessionState.MEDIA_CONFIRMATION],
      ['TAMBAH FOTO', WhatsAppReportSessionState.MEDIA],
      ['TAMBAH VIDEO', WhatsAppReportSessionState.MEDIA],
    ]);
    return commands.get(text.toUpperCase()) ?? null;
  }

  private reviewChoiceState(text: string) {
    if (this.isChoice(text, 2, 'EDIT JUDUL', REPORT_ACTION_IDS.reviewEditTitle))
      return WhatsAppReportSessionState.TITLE;
    if (
      this.isChoice(
        text,
        3,
        'EDIT INFORMASI',
        REPORT_ACTION_IDS.reviewEditContent,
      )
    )
      return WhatsAppReportSessionState.CONTENT;
    if (
      this.isChoice(
        text,
        4,
        'EDIT LOKASI',
        REPORT_ACTION_IDS.reviewEditLocation,
      )
    )
      return WhatsAppReportSessionState.LOCATION;
    if (
      this.isChoice(
        text,
        7,
        'EDIT WAKTU KEJADIAN',
        REPORT_ACTION_IDS.reviewEditTime,
      )
    )
      return WhatsAppReportSessionState.TIME;
    if (
      this.isChoice(
        text,
        5,
        'EDIT DOKUMENTASI',
        REPORT_ACTION_IDS.reviewEditMedia,
      )
    )
      return WhatsAppReportSessionState.MEDIA_CONFIRMATION;
    return null;
  }

  private parseIncidentAt(value: string) {
    const match = value
      .trim()
      .match(/^(\d{1,2})[-/]([0-1]?\d)[-/](\d{4})\s+([0-2]?\d)[:.]([0-5]\d)$/);
    if (!match) return null;
    const [, dayText, monthText, yearText, hourText, minuteText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (month < 1 || month > 12 || hour > 23) return null;

    const timestamp = Date.UTC(year, month - 1, day, hour - 7, minute);
    const jakartaWallClock = new Date(timestamp + 7 * 60 * 60 * 1000);
    if (
      jakartaWallClock.getUTCFullYear() !== year ||
      jakartaWallClock.getUTCMonth() !== month - 1 ||
      jakartaWallClock.getUTCDate() !== day ||
      jakartaWallClock.getUTCHours() !== hour ||
      jakartaWallClock.getUTCMinutes() !== minute
    ) {
      return null;
    }
    return new Date(timestamp);
  }

  private formatIncidentAt(value: Date) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(value);
  }

  private isCommand(text: string, commands: string[]) {
    const normalized = text.trim().toUpperCase();
    return commands.some((command) => normalized === command.toUpperCase());
  }

  private isChoice(text: string, number: number, ...labels: string[]) {
    const normalized = text.trim().toUpperCase();
    return (
      normalized === String(number) ||
      labels.some((label) => normalized === label.toUpperCase())
    );
  }

  private cleanText(value: string) {
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim();
  }

  private extensionForMime(mimeType: string) {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('quicktime')) return 'mov';
    if (mimeType.includes('video')) return 'mp4';
    return 'jpg';
  }

  private isUniqueConstraint(error: unknown) {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
