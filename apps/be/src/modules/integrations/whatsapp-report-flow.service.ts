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

type ReplySender = (messages: string[]) => Promise<void>;

type LoadedSession = Prisma.WhatsAppReportSessionGetPayload<{
  include: {
    jaring: true;
    contentParts: { orderBy: { orderNo: 'asc' } };
    media: {
      where: { deletedAt: null };
      orderBy: { orderNo: 'asc' };
      include: { file: true };
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
    let session = await this.findActiveSession(payload.senderPhone);

    if (session && session.expiresAt <= new Date()) {
      await this.expireSession(session, payload.externalMessageId);
      session = null;
    }

    if (this.isCommand(text, ['BANTUAN', 'HELP'])) {
      await reply([this.helpText()]);
      return;
    }
    if (this.isCommand(text, ['MENU'])) {
      await reply([this.menuText(session)]);
      return;
    }
    if (this.isCommand(text, ['STATUS'])) {
      await reply([await this.statusText(payload.senderPhone, session)]);
      return;
    }
    if (this.isCommand(text, ['RINGKASAN'])) {
      await reply([
        session
          ? this.summaryText(session)
          : 'Belum ada informasi aktif. Ketik LAPOR untuk memulai.',
      ]);
      return;
    }

    if (!session) {
      if (this.isCommand(text, ['LAPOR'])) {
        await this.startSession(channel, payload, message, reply);
      }
      return;
    }

    await this.touchSession(session.id, session.status);
    session = (await this.loadSession(session.id)) ?? session;

    const startsNewReport =
      this.isCommand(text, ['INFORMASI BARU', 'LAPOR BARU']) ||
      (this.isCommand(text, ['LAPOR']) &&
        session.status !== WhatsAppReportSessionStatus.ACTIVE);
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
      this.isCommand(text, ['LAPOR']) &&
      session.status === WhatsAppReportSessionStatus.ACTIVE
    ) {
      await this.transition(
        session,
        WhatsAppReportSessionState.EXISTING_SESSION_CHOICE,
        'EXISTING_SESSION_DETECTED',
        payload.externalMessageId,
        { resumeState: session.currentState },
      );
      await reply([
        'Anda masih memiliki informasi yang belum selesai.\n\n1️⃣ Lanjutkan Informasi\n2️⃣ Lihat Ringkasan\n3️⃣ Batalkan Informasi Lama\n4️⃣ Simpan dan Buat Informasi Baru',
      ]);
      return;
    }

    if (
      this.isCommand(text, ['BATAL', 'CANCEL']) &&
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
      await reply([
        'Apakah Anda yakin ingin membatalkan proses pengiriman informasi?\n\n1️⃣ Ya, Batalkan\n2️⃣ Tidak, Kembali',
      ]);
      return;
    }

    if (
      this.isCommand(text, ['KIRIM']) &&
      session.status === WhatsAppReportSessionStatus.ACTIVE
    ) {
      if (this.isComplete(session)) {
        await this.transition(
          session,
          WhatsAppReportSessionState.REVIEW,
          'REVIEW_OPENED',
          payload.externalMessageId,
        );
        await reply([this.reviewText(session)]);
      } else {
        await reply([
          `Informasi belum lengkap. Tahap saat ini: ${this.stateLabel(session.currentState)}.`,
        ]);
      }
      return;
    }

    const editTarget = this.editCommandTarget(text);
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
    const jaring = await this.prisma.jaring.findFirst({
      where: {
        whatsappNumber: payload.senderPhone,
        status: 'ACTIVE',
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
    if (!jaring) {
      return;
    }

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

    const fieldOfficerAssignmentId =
      jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId;
    if (!fieldOfficerAssignmentId) {
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
      if (this.isChoice(text, 1, 'LANJUTKAN INFORMASI')) {
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
      } else if (this.isChoice(text, 2, 'LIHAT RINGKASAN')) {
        await reply([this.summaryText(session)]);
      } else if (this.isChoice(text, 3, 'BATALKAN INFORMASI LAMA')) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else if (this.isChoice(text, 4, 'SIMPAN DAN BUAT INFORMASI BARU')) {
        await this.closeSession(
          session,
          'DRAFT_ARCHIVED_FOR_NEW_REPORT',
          payload.externalMessageId,
        );
        await this.startSession(input.channel, payload, input.message, reply);
      } else {
        await reply([
          'Pilih 1 Lanjutkan, 2 Ringkasan, 3 Batalkan, atau 4 Buat Baru.',
        ]);
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
      await this.transition(
        session,
        WhatsAppReportSessionState.TITLE_CONFIRMATION,
        session.title ? 'TITLE_UPDATED' : 'TITLE_CREATED',
        payload.externalMessageId,
        { title: text },
      );
      await reply([
        `━━━━━━━━━━━━━━━━━━\nJUDUL INFORMASI\n━━━━━━━━━━━━━━━━━━\n\n${text}\n\nApakah judul tersebut sudah benar?\n\n1️⃣ Simpan\n2️⃣ Edit\n3️⃣ Batal`,
      ]);
      return;
    }

    if (state === WhatsAppReportSessionState.TITLE_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN')) {
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
            ? this.reviewText({ ...session, returnToReview: false })
            : this.promptForState(next),
        ]);
      } else if (this.isChoice(text, 2, 'EDIT')) {
        await this.transition(
          session,
          WhatsAppReportSessionState.TITLE,
          'TITLE_EDIT_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.promptForState(WhatsAppReportSessionState.TITLE)]);
      } else if (this.isChoice(text, 3, 'BATAL')) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply([
          'Pilih 1 untuk Simpan, 2 untuk Edit, atau 3 untuk Batal.',
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.CONTENT) {
      if (this.isCommand(text, ['SELESAI'])) {
        if (session.contentParts.length === 0) {
          await reply([
            'Belum ada informasi yang diterima. Silakan kirim narasi terlebih dahulu.',
          ]);
          return;
        }
        const combined = session.contentParts
          .map((part) => part.content)
          .join('\n\n');
        await this.transition(
          session,
          WhatsAppReportSessionState.CONTENT_CONFIRMATION,
          'CONTENT_COMBINED',
          payload.externalMessageId,
          { content: combined },
        );
        await reply([
          `━━━━━━━━━━━━━━━━━━\nRINGKASAN INFORMASI\n━━━━━━━━━━━━━━━━━━\n\n${combined}\n\nApakah informasi tersebut sudah benar?\n\n1️⃣ Simpan\n2️⃣ Tambah Informasi\n3️⃣ Edit Ulang\n4️⃣ Batal`,
        ]);
        return;
      }
      if (!text) {
        await reply([
          'Silakan kirim narasi dalam bentuk teks. Ketik SELESAI jika sudah lengkap.',
        ]);
        return;
      }
      if (session.contentParts.length >= MAX_CONTENT_PARTS) {
        await reply([
          `Batas maksimal ${MAX_CONTENT_PARTS} pesan informasi telah tercapai. Ketik SELESAI.`,
        ]);
        return;
      }
      const currentLength = session.contentParts.reduce(
        (total, part) => total + part.content.length,
        0,
      );
      if (currentLength + text.length > MAX_CONTENT_LENGTH) {
        await reply([`Isi informasi maksimal ${MAX_CONTENT_LENGTH} karakter.`]);
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
      await reply([
        `Informasi bagian ${session.contentParts.length + 1} diterima. Kirim bagian berikutnya atau ketik SELESAI.`,
      ]);
      return;
    }

    if (state === WhatsAppReportSessionState.CONTENT_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN')) {
        const next = session.returnToReview
          ? WhatsAppReportSessionState.REVIEW
          : WhatsAppReportSessionState.MEDIA;
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
            ? this.reviewText(session)
            : this.promptForState(next),
        ]);
      } else if (this.isChoice(text, 2, 'TAMBAH INFORMASI')) {
        await this.transition(
          session,
          WhatsAppReportSessionState.CONTENT,
          'CONTENT_ADDITION_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.promptForState(WhatsAppReportSessionState.CONTENT)]);
      } else if (this.isChoice(text, 3, 'EDIT ULANG')) {
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
      } else if (this.isChoice(text, 4, 'BATAL')) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply([
          'Pilih 1 Simpan, 2 Tambah Informasi, 3 Edit Ulang, atau 4 Batal.',
        ]);
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
      await this.transition(
        session,
        WhatsAppReportSessionState.LOCATION_CONFIRMATION,
        session.latitude === null ? 'LOCATION_ADDED' : 'LOCATION_UPDATED',
        payload.externalMessageId,
        {
          latitude: location.latitude,
          longitude: location.longitude,
          locationAccuracyMeters: location.accuracy,
          locationCapturedAt: new Date(payload.receivedAt),
          locationMessageId: payload.externalMessageId,
          locationType: 'LIVE_LOCATION',
          incidentAt: new Date(payload.receivedAt),
        },
      );
      await reply([
        `━━━━━━━━━━━━━━━━━━\nKONFIRMASI LOKASI\n━━━━━━━━━━━━━━━━━━\n\nLokasi berhasil diterima.\n\nLatitude  : ${location.latitude}\nLongitude : ${location.longitude}\nAkurasi   : ±${location.accuracy} meter\n\nGunakan lokasi ini?\n\n1️⃣ Ya, Gunakan\n2️⃣ Kirim Ulang Lokasi`,
      ]);
      return;
    }

    if (state === WhatsAppReportSessionState.LOCATION_CONFIRMATION) {
      if (this.isChoice(text, 1, 'YA', 'GUNAKAN')) {
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
            ? this.reviewText(session)
            : this.promptForState(next),
        ]);
      } else if (this.isChoice(text, 2, 'KIRIM ULANG')) {
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
          'Pilih 1 untuk menggunakan lokasi atau 2 untuk mengirim ulang.',
        ]);
      }
      return;
    }

    if (
      state === WhatsAppReportSessionState.TIME ||
      state === WhatsAppReportSessionState.TIME_CONFIRMATION
    ) {
      await this.transition(
        session,
        WhatsAppReportSessionState.MEDIA,
        'LEGACY_TIME_STEP_SKIPPED',
        payload.externalMessageId,
        {
          incidentAt:
            session.incidentAt ?? session.locationCapturedAt ?? new Date(),
          returnToReview: false,
        },
      );
      await reply([this.promptForState(WhatsAppReportSessionState.MEDIA)]);
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
        await reply([this.mediaConfirmationText(session)]);
        return;
      }
      const media = this.mediaMessage(message);
      if (!media) {
        await reply([
          'Kirim foto atau video. Ketik SELESAI jika dokumentasi sudah lengkap.',
        ]);
        return;
      }
      if (session.media.length >= MAX_MEDIA) {
        await reply([
          `Dokumentasi maksimal ${MAX_MEDIA} file. Ketik SELESAI untuk melanjutkan.`,
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
        await reply([
          `Dokumentasi ${session.media.length + 1} diterima. Kirim file berikutnya atau ketik SELESAI.`,
        ]);
      } catch (error) {
        this.logger.warn(`Media intake failed: ${this.messageOf(error)}`);
        await reply([
          'Dokumentasi gagal diterima atau tidak lolos pemeriksaan. Silakan kirim ulang.',
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.MEDIA_CONFIRMATION) {
      if (this.isChoice(text, 1, 'SIMPAN')) {
        await this.transition(
          session,
          WhatsAppReportSessionState.REVIEW,
          'MEDIA_LOCKED',
          payload.externalMessageId,
          { returnToReview: false },
        );
        await reply([this.reviewText(session)]);
      } else if (this.isChoice(text, 2, 'TAMBAH DOKUMENTASI')) {
        await this.transition(
          session,
          WhatsAppReportSessionState.MEDIA,
          'MEDIA_ADDITION_REQUESTED',
          payload.externalMessageId,
        );
        await reply([this.promptForState(WhatsAppReportSessionState.MEDIA)]);
      } else if (this.isChoice(text, 3, 'HAPUS')) {
        await this.transition(
          session,
          WhatsAppReportSessionState.MEDIA_DELETE_CONFIRMATION,
          'MEDIA_DELETE_REQUESTED',
          payload.externalMessageId,
        );
        await reply(['Hapus dokumentasi terakhir?\n\n1️⃣ Ya, Hapus\n2️⃣ Tidak']);
      } else if (this.isChoice(text, 4, 'LIHAT')) {
        await reply([this.mediaListText(session)]);
      } else {
        await reply([
          'Pilih 1 Simpan, 2 Tambah, 3 Hapus terakhir, atau 4 Lihat daftar.',
        ]);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.MEDIA_DELETE_CONFIRMATION) {
      if (this.isChoice(text, 1, 'YA', 'HAPUS')) {
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
      await reply([this.mediaConfirmationText(refreshed ?? session)]);
      return;
    }

    if (state === WhatsAppReportSessionState.REVIEW) {
      const editState = this.reviewChoiceState(text);
      if (this.isChoice(text, 1, 'KIRIM INFORMASI')) {
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
      } else if (this.isChoice(text, 6, 'BATALKAN')) {
        await this.requestCancellation(
          session,
          payload.externalMessageId,
          reply,
        );
      } else {
        await reply(['Pilih tindakan 1 sampai 6 sesuai ringkasan.']);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.CANCEL_CONFIRMATION) {
      if (this.isChoice(text, 1, 'YA', 'BATALKAN')) {
        await this.cancelSession(session, payload.externalMessageId);
        await reply([
          'Pembuatan informasi dibatalkan. Ketik LAPOR untuk memulai kembali.',
        ]);
      } else if (this.isChoice(text, 2, 'TIDAK', 'KEMBALI')) {
        const resumeState =
          session.resumeState ?? WhatsAppReportSessionState.LOCATION;
        await this.transition(
          session,
          resumeState,
          'CANCELLATION_REJECTED',
          payload.externalMessageId,
          { resumeState: null },
        );
        await reply([this.promptForState(resumeState)]);
      } else {
        await reply(['Pilih 1 untuk membatalkan atau 2 untuk kembali.']);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.SUBMITTED) {
      await this.handleSubmittedInput(session, input, text);
      return;
    }

    if (state === WhatsAppReportSessionState.POST_SUBMIT_TEXT_CONFIRMATION) {
      if (this.isChoice(text, 1, 'YA', 'TAMBAHKAN')) {
        if (session.submittedMessageId && session.pendingAmendmentText) {
          await this.prisma.whatsAppReportAmendment.create({
            data: {
              reportSessionId: session.id,
              whatsappMessageId: session.submittedMessageId,
              amendmentType: WhatsAppReportAmendmentType.CONTENT_ADDITION,
              content: session.pendingAmendmentText,
              senderPhone: session.senderPhone,
            },
          });
          await this.transition(
            session,
            WhatsAppReportSessionState.SUBMITTED,
            'AMENDMENT_ADDED',
            payload.externalMessageId,
            { pendingAmendmentText: null },
          );
          await reply([
            `Informasi tambahan berhasil disimpan.\n\nNomor Referensi: ${session.referenceNumber}\nStatus tetap: MENUNGGU VALIDASI`,
          ]);
        }
      } else if (this.isChoice(text, 2, 'TIDAK')) {
        await this.transition(
          session,
          WhatsAppReportSessionState.SUBMITTED,
          'AMENDMENT_DISCARDED',
          payload.externalMessageId,
          { pendingAmendmentText: null },
        );
        await reply(['Informasi tambahan tidak disimpan.']);
      } else if (this.isChoice(text, 3, 'BUAT LAPORAN BARU')) {
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
        await reply(['Pilih 1 Ya, 2 Tidak, atau 3 Pilih Informasi Lain.']);
      }
      return;
    }

    if (state === WhatsAppReportSessionState.POST_SUBMIT_MEDIA_PURPOSE) {
      await this.handlePostSubmitMediaChoice(session, input, text);
    }
  }

  private async handleSubmittedInput(
    session: LoadedSession,
    input: {
      socket: WASocket;
      message: WAMessage;
      payload: WhatsAppReportInboundPayload;
      reply: ReplySender;
    },
    text: string,
  ) {
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
        await input.reply([
          `Masih terdapat informasi yang sedang diproses.\n\nNomor Referensi: ${session.referenceNumber}\n\nApa yang ingin Anda lakukan?\n\n1️⃣ Tambah Dokumentasi\n2️⃣ Tambah Informasi\n3️⃣ Lihat Ringkasan\n4️⃣ Kirim Informasi Baru`,
        ]);
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
      await input.reply([
        `Informasi tambahan terdeteksi.\n\nTambahkan ke laporan ${session.referenceNumber}?\n\n1️⃣ Ya, Tambahkan\n2️⃣ Tidak\n3️⃣ Buat Laporan Baru`,
      ]);
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
    if (this.isChoice(text, 1, 'TAMBAH DOKUMENTASI')) {
      if (session.submittedMessageId && session.pendingFileId) {
        await this.prisma.$transaction(async (tx) => {
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
              amendmentType: WhatsAppReportAmendmentType.MEDIA_ADDITION,
              fileId: session.pendingFileId,
              senderPhone: session.senderPhone,
            },
          });
        });
        await this.transition(
          session,
          WhatsAppReportSessionState.SUBMITTED,
          'AMENDMENT_MEDIA_ADDED',
          input.payload.externalMessageId,
          { pendingFileId: null },
        );
        await input.reply([
          `Dokumentasi tambahan berhasil disimpan.\n\nNomor Referensi: ${session.referenceNumber}`,
        ]);
      }
    } else if (this.isChoice(text, 2, 'TAMBAH INFORMASI')) {
      await this.transition(
        session,
        WhatsAppReportSessionState.SUBMITTED,
        'POST_SUBMIT_MEDIA_DISCARDED',
        input.payload.externalMessageId,
        { pendingFileId: null },
      );
      await input.reply(['Silakan kirimkan narasi informasi tambahan.']);
    } else if (this.isChoice(text, 3, 'LIHAT RINGKASAN')) {
      await input.reply([this.summaryText(session)]);
    } else if (this.isChoice(text, 4, 'KIRIM INFORMASI BARU')) {
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
      await input.reply([
        'Pilih 1 Tambah Dokumentasi, 2 Tambah Informasi, 3 Ringkasan, atau 4 Informasi Baru.',
      ]);
    }
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
      `━━━━━━━━━━━━━━━━━━\nINFORMASI BERHASIL DIKIRIM\n━━━━━━━━━━━━━━━━━━\n\nTerima kasih.\n\nNomor Referensi:\n${submitted.referenceNumber}\n\nStatus:\nMENUNGGU VALIDASI\n\nKetik STATUS untuk melihat perkembangan informasi.`,
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
    await reply([
      'Apakah Anda yakin ingin membatalkan proses pengiriman informasi?\n\n1️⃣ Ya, Batalkan\n2️⃣ Tidak, Kembali',
    ]);
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

  private loadSession(id: string) {
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
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return `${get('year')}${get('month')}${get('day')}`;
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

  private reviewText(session: LoadedSession) {
    return `━━━━━━━━━━━━━━━━━━
RINGKASAN INFORMASI
━━━━━━━━━━━━━━━━━━

📍 LOKASI
Latitude  : ${session.latitude ?? '-'}
Longitude : ${session.longitude ?? '-'}
Akurasi   : ${session.locationAccuracyMeters ?? '-'} meter

📝 JUDUL
${session.title ?? '-'}

📄 INFORMASI
${session.content ?? '-'}

📷 DOKUMENTASI
Foto/Video: ${session.media.length} file

Silakan pilih tindakan:
1️⃣ Kirim Informasi
2️⃣ Edit Judul
3️⃣ Edit Informasi
4️⃣ Edit Lokasi
5️⃣ Edit Dokumentasi
6️⃣ Batalkan`;
  }

  private summaryText(session: LoadedSession) {
    const reference = session.referenceNumber
      ? `Nomor Referensi: ${session.referenceNumber}\n\n`
      : '';
    return `${reference}${this.reviewText(session).split('Silakan pilih tindakan:')[0]?.trim()}`;
  }

  private mediaConfirmationText(session: LoadedSession) {
    const photos = session.media.filter(
      (item) => item.mediaType === FileType.PHOTO,
    ).length;
    const videos = session.media.filter(
      (item) => item.mediaType === FileType.VIDEO,
    ).length;
    return `━━━━━━━━━━━━━━━━━━
DOKUMENTASI DITERIMA
━━━━━━━━━━━━━━━━━━

Foto  : ${photos} file
Video : ${videos} file

Apakah dokumentasi sudah lengkap?

1️⃣ Simpan
2️⃣ Tambah Dokumentasi
3️⃣ Hapus Dokumentasi Terakhir
4️⃣ Lihat Daftar Dokumentasi`;
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
        '━━━━━━━━━━━━━━━━━━\nLANGKAH 3/4\n📄 INFORMASI\n━━━━━━━━━━━━━━━━━━\n\nSilakan kirimkan informasi atau kronologi. Anda dapat mengirim beberapa pesan.\n\nJika selesai, ketik SELESAI.',
      [WhatsAppReportSessionState.MEDIA]:
        '━━━━━━━━━━━━━━━━━━\nLANGKAH 4/4\n📷 DOKUMENTASI\n━━━━━━━━━━━━━━━━━━\n\nKirim foto atau video. Anda dapat mengirim lebih dari satu file.\n\nJika selesai, ketik SELESAI.',
    };
    return prompts[state] ?? `Tahap saat ini: ${this.stateLabel(state)}.`;
  }

  private welcomeText() {
    return 'Selamat datang, apakah ada yang ingin Anda sampaikan.\n\nSilakan masukkan PIN/kode Jaring Anda.';
  }

  private menuText(session: LoadedSession | null) {
    if (!session) {
      return 'MENU\n\nKetik LAPOR untuk membuat informasi baru.\nKetik BANTUAN untuk melihat petunjuk.';
    }
    return `MENU

STATUS
RINGKASAN
EDIT JUDUL
EDIT INFORMASI
EDIT LOKASI
EDIT DOKUMENTASI
KIRIM
BATAL
INFORMASI BARU
BANTUAN`;
  }

  private helpText() {
    return `BANTUAN BOT

Ketik LAPOR untuk memulai.
Ikuti empat tahap dan konfirmasi setiap data.
Live Location serta minimal satu foto/video wajib tersedia.

Command:
MENU, STATUS, RINGKASAN, EDIT JUDUL, EDIT INFORMASI,
EDIT LOKASI, EDIT DOKUMENTASI, KIRIM, BATAL.`;
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
    const baketStatus = target.submittedMessage?.convertedBaket?.status;
    const status =
      baketStatus === 'VERIFIED'
        ? 'TERVERIFIKASI'
        : baketStatus === 'REJECTED'
          ? 'DITOLAK'
          : target.submittedMessage?.convertedBaket
            ? 'SEDANG DIVERIFIKASI'
            : 'MENUNGGU VALIDASI';
    return `Nomor Referensi: ${target.referenceNumber ?? '-'}\nStatus: ${status}`;
  }

  private stateLabel(state: WhatsAppReportSessionState) {
    return state.replaceAll('_', ' ');
  }

  private editCommandTarget(text: string) {
    const commands = new Map<string, WhatsAppReportSessionState>([
      ['EDIT JUDUL', WhatsAppReportSessionState.TITLE],
      ['EDIT INFORMASI', WhatsAppReportSessionState.CONTENT],
      ['EDIT LOKASI', WhatsAppReportSessionState.LOCATION],
      ['EDIT DOKUMENTASI', WhatsAppReportSessionState.MEDIA_CONFIRMATION],
      ['TAMBAH FOTO', WhatsAppReportSessionState.MEDIA],
      ['TAMBAH VIDEO', WhatsAppReportSessionState.MEDIA],
    ]);
    return commands.get(text.toUpperCase()) ?? null;
  }

  private reviewChoiceState(text: string) {
    if (this.isChoice(text, 2, 'EDIT JUDUL'))
      return WhatsAppReportSessionState.TITLE;
    if (this.isChoice(text, 3, 'EDIT INFORMASI'))
      return WhatsAppReportSessionState.CONTENT;
    if (this.isChoice(text, 4, 'EDIT LOKASI'))
      return WhatsAppReportSessionState.LOCATION;
    if (this.isChoice(text, 5, 'EDIT DOKUMENTASI'))
      return WhatsAppReportSessionState.MEDIA_CONFIRMATION;
    return null;
  }

  private isCommand(text: string, commands: string[]) {
    const normalized = text.trim().toUpperCase();
    return commands.some((command) => normalized === command);
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
