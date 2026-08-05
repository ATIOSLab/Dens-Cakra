import { createHash } from 'node:crypto';
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  downloadMediaMessage,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import P from 'pino';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  CoordinateSource,
  FileLifecycleStatus,
  FileType,
  JaringRegistrationStatus,
  Prisma,
  WhatsAppMessageStatus,
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

type LoadedSession = Prisma.WhatsAppReportSessionGetPayload<{
  include: {
    jaring: true;
    contentParts: { orderBy: { orderNo: 'asc' } };
    media: {
      where: { deletedAt: null };
      orderBy: { orderNo: 'asc' };
      include: { file: true };
    };
  };
}>;

const REPORT_TRIGGER = '1945';
const MAX_CONTENT_ENTRIES = 30;
const MAX_MEDIA = 10;
const MAX_CONTENT_LENGTH = 10_000;

const REFERENCE_AREA_CODE_OVERRIDES = new Map<string, string>([
  ['DAERAH KHUSUS IBUKOTA JAKARTA', 'JKT'],
  ['DKI JAKARTA', 'JKT'],
  ['KOTA ADMINISTRASI JAKARTA PUSAT', 'PST'],
  ['KOTA ADMINISTRASI JAKARTA UTARA', 'UTR'],
  ['KOTA ADMINISTRASI JAKARTA BARAT', 'BRT'],
  ['KOTA ADMINISTRASI JAKARTA SELATAN', 'SEL'],
  ['KOTA ADMINISTRASI JAKARTA TIMUR', 'TMR'],
  ['KABUPATEN ADMINISTRASI KEPULAUAN SERIBU', 'KSR'],
]);

const ADMINISTRATIVE_NAME_WORDS = new Set([
  'PROVINSI',
  'KOTA',
  'KABUPATEN',
  'ADMINISTRASI',
  'DAERAH',
  'KHUSUS',
  'IBUKOTA',
]);

const WELCOME_MESSAGE = `*KANAL INFORMASI*

Silakan sampaikan informasi dengan urutan berikut:

1. Kirim *Live Location* melalui fitur WhatsApp.
2. Tulis isi informasi secara jelas dan lengkap.
3. Lampirkan foto atau video sebagai dokumentasi pendukung.
4. Jika seluruh informasi telah selesai disampaikan, ketik *SELESAI*.

*Catatan:*

• Lokasi yang diterima wajib berupa *Live Location*, bukan lokasi biasa, share location statis, tautan Google Maps, alamat tertulis, atau screenshot peta.

• Selama belum mengetik *SELESAI*, Anda dapat terus menambahkan teks, foto, video, atau pembaruan informasi.

• Untuk membatalkan seluruh informasi yang sedang dibuat, ketik *BATAL*.`;

const CAPTURE_RESPONSE = `Terima kasih Informasi telah masuk.
Anda masih dapat menambahkan informasi jika ada.

Balas *SELESAI* jika informasi telah lengkap dan siap dikirimkan.

Balas *BATAL* untuk membatalkan.`;

@Injectable()
export class WhatsAppReportFlowService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WhatsAppReportFlowService.name);
  private readonly senderQueues = new Map<string, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: LocalStorageService,
    private readonly files: FileService,
    private readonly spatial: SpatialRepository,
    private readonly channelScope: WhatsAppChannelScopeService,
  ) {}

  async onApplicationBootstrap() {
    await this.cleanupPreviousDayDrafts().catch((error: unknown) => {
      this.logger.error(
        `Initial WhatsApp draft cleanup failed: ${this.messageOf(error)}`,
      );
    });
  }

  @Cron('5 0 * * *', { timeZone: 'Asia/Jakarta' })
  async cleanupPreviousDayDrafts() {
    const startOfToday = this.startOfWibDay(new Date());
    const drafts = await this.prisma.whatsAppReportSession.findMany({
      where: {
        status: WhatsAppReportSessionStatus.ACTIVE,
        startedAt: { lt: startOfToday },
      },
      select: { id: true },
    });

    for (const draft of drafts) {
      await this.purgeDraftSession(draft.id);
    }

    if (drafts.length > 0) {
      this.logger.log(
        `Deleted ${drafts.length} unfinished WhatsApp report draft(s) from a previous WIB day`,
      );
    }

    return drafts.length;
  }

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
    const { channel, message, payload, reply } = input;
    const text = this.cleanText(payload.content ?? '');
    const media = this.mediaMessage(message);
    let session = await this.findActiveSession(payload.senderPhone);

    if (session && session.startedAt < this.startOfWibDay(new Date())) {
      await this.purgeDraftSession(session.id);
      session = null;
    }

    const eligibleJaring = await this.findEligibleJaring(
      payload.senderPhone,
      channel,
    );
    if (!eligibleJaring) {
      if (session) await this.purgeDraftSession(session.id);
      return;
    }

    if (session && session.integrationChannelId !== channel.id) return;

    if (!session) {
      if (media || text !== REPORT_TRIGGER) return;
      await this.startSession(channel, message, payload, eligibleJaring, reply);
      return;
    }

    if (media) {
      await this.captureMedia(
        session,
        input,
        media,
        this.cleanText(media.caption ?? text),
      );
      return;
    }

    const liveLocation = this.extractLiveLocation(message);
    if (liveLocation) {
      await this.captureLiveLocation(session, payload, liveLocation, reply);
      return;
    }

    if (this.hasLocationMessage(message)) {
      await reply([
        'Lokasi tidak diterima. Kirim melalui fitur *Live Location*, bukan lokasi biasa atau share location statis.',
      ]);
      return;
    }

    if (!text) return;

    const command = text.toLocaleUpperCase('id-ID');
    if (command === REPORT_TRIGGER) {
      await reply([this.progressText(session)]);
      return;
    }
    if (command === 'BATAL') {
      await this.purgeDraftSession(session.id);
      await reply([
        'Seluruh informasi yang sedang dibuat telah dibatalkan dan dihapus.',
      ]);
      return;
    }
    if (command === 'SELESAI') {
      await this.finishSession(session, payload, reply);
      return;
    }

    await this.captureText(session, payload, text, reply);
  }

  private async startSession(
    channel: WhatsAppReportChannel,
    message: WAMessage,
    payload: WhatsAppReportInboundPayload,
    jaring: Awaited<ReturnType<WhatsAppReportFlowService['findEligibleJaring']>>,
    reply: ReplySender,
  ) {
    if (!jaring) return;
    const remoteJid = message.key.remoteJid;
    const fieldOfficerAssignmentId =
      jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId;
    if (!remoteJid || !fieldOfficerAssignmentId) return;

    try {
      await this.prisma.$transaction(async (tx) => {
        const session = await tx.whatsAppReportSession.create({
          data: {
            integrationChannelId: channel.id,
            senderPhone: payload.senderPhone,
            remoteJid,
            activeSenderKey: payload.senderPhone,
            jaringId: jaring.id,
            fieldOfficerAssignmentId,
            currentState: WhatsAppReportSessionState.CONTENT,
            expiresAt: this.nextWibDayStart(new Date()),
          },
        });
        await tx.whatsAppReportHistory.create({
          data: {
            reportSessionId: session.id,
            action: 'SESSION_STARTED_WITH_GLOBAL_TRIGGER',
            newState: WhatsAppReportSessionState.CONTENT,
            externalMessageId: payload.externalMessageId,
          },
        });
      });
      await reply([WELCOME_MESSAGE]);
    } catch (error) {
      if (!this.isUniqueConstraint(error)) throw error;
      const existing = await this.findActiveSession(payload.senderPhone);
      if (existing) await reply([this.progressText(existing)]);
    }
  }

  private async captureText(
    session: LoadedSession,
    payload: WhatsAppReportInboundPayload,
    text: string,
    reply: ReplySender,
  ) {
    const entryCount =
      session.contentParts.length +
      session.media.filter((item) => Boolean(item.caption?.trim())).length;
    if (entryCount >= MAX_CONTENT_ENTRIES) {
      await reply([`Maksimal ${MAX_CONTENT_ENTRIES} bagian informasi.`]);
      return;
    }
    if ((session.content?.length ?? 0) + text.length > MAX_CONTENT_LENGTH) {
      await reply([`Isi informasi maksimal ${MAX_CONTENT_LENGTH} karakter.`]);
      return;
    }

    try {
      await this.prisma.$transaction([
        this.prisma.whatsAppReportContentPart.create({
          data: {
            reportSessionId: session.id,
            externalMessageId: payload.externalMessageId,
            content: text,
            orderNo: session.contentParts.length + 1,
          },
        }),
        this.prisma.whatsAppReportSession.update({
          where: { id: session.id },
          data: {
            content: this.appendContent(session.content, text),
            lastActivityAt: new Date(),
          },
        }),
        this.prisma.whatsAppReportHistory.create({
          data: {
            reportSessionId: session.id,
            action: 'TEXT_CAPTURED',
            previousState: session.currentState,
            newState: session.currentState,
            externalMessageId: payload.externalMessageId,
          },
        }),
      ]);
    } catch (error) {
      if (!this.isUniqueConstraint(error)) throw error;
    }

    await reply([CAPTURE_RESPONSE]);
  }

  private async captureMedia(
    session: LoadedSession,
    input: {
      socket: WASocket;
      message: WAMessage;
      payload: WhatsAppReportInboundPayload;
      reply: ReplySender;
    },
    media: { fileType: FileType; mimeType: string; caption?: string },
    captionText: string,
  ) {
    if (session.media.length >= MAX_MEDIA) {
      await input.reply([`Dokumentasi maksimal ${MAX_MEDIA} file.`]);
      return;
    }
    if (
      captionText &&
      (session.content?.length ?? 0) + captionText.length > MAX_CONTENT_LENGTH
    ) {
      await input.reply([
        `Isi informasi maksimal ${MAX_CONTENT_LENGTH} karakter. Perpendek caption lalu kirim ulang media.`,
      ]);
      return;
    }

    const file = await this.storeAndScanMedia(
      input.socket,
      input.message,
      session,
      media,
    );

    try {
      await this.prisma.$transaction([
        this.prisma.whatsAppReportMedia.create({
          data: {
            reportSessionId: session.id,
            fileId: file.id,
            externalMessageId: input.payload.externalMessageId,
            mediaType: media.fileType,
            caption: captionText || null,
            orderNo: session.media.length + 1,
          },
        }),
        this.prisma.whatsAppReportSession.update({
          where: { id: session.id },
          data: {
            ...(captionText
              ? { content: this.appendContent(session.content, captionText) }
              : {}),
            lastActivityAt: new Date(),
          },
        }),
        this.prisma.whatsAppReportHistory.create({
          data: {
            reportSessionId: session.id,
            action: 'MEDIA_CAPTURED',
            previousState: session.currentState,
            newState: session.currentState,
            externalMessageId: input.payload.externalMessageId,
            metadata: {
              fileId: file.id,
              mediaType: media.fileType,
              hasCaption: Boolean(captionText),
            },
          },
        }),
      ]);
    } catch (error) {
      await this.discardStoredFile(file.id, file.storageKey);
      if (!this.isUniqueConstraint(error)) throw error;
    }

    await input.reply([CAPTURE_RESPONSE]);
  }

  private async captureLiveLocation(
    session: LoadedSession,
    payload: WhatsAppReportInboundPayload,
    location: { latitude: number; longitude: number; accuracy: number },
    reply: ReplySender,
  ) {
    await this.prisma.$transaction([
      this.prisma.whatsAppReportSession.update({
        where: { id: session.id },
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          locationAccuracyMeters: location.accuracy,
          locationCapturedAt: this.validDate(payload.receivedAt),
          locationMessageId: payload.externalMessageId,
          locationType: 'LIVE_LOCATION',
          lastActivityAt: new Date(),
        },
      }),
      this.prisma.whatsAppReportHistory.create({
        data: {
          reportSessionId: session.id,
          action: session.locationCapturedAt
            ? 'LIVE_LOCATION_UPDATED'
            : 'LIVE_LOCATION_CAPTURED',
          previousState: session.currentState,
          newState: session.currentState,
          externalMessageId: payload.externalMessageId,
        },
      }),
    ]);

    await reply([CAPTURE_RESPONSE]);
  }

  private async finishSession(
    staleSession: LoadedSession,
    payload: WhatsAppReportInboundPayload,
    reply: ReplySender,
  ) {
    const session = await this.loadSession(staleSession.id);
    if (!session) return;

    const missing = this.missingRequirements(session);
    if (missing.length > 0) {
      await reply([
        `Informasi belum dapat dikirim karena belum lengkap. Lengkapi terlebih dahulu:\n${missing.map((item) => `• ${item}`).join('\n')}\n\nSilakan kirim komponen tersebut. Setelah lengkap, ketik *SELESAI* kembali.`,
      ]);
      return;
    }

    const latitude = Number(session.latitude);
    const longitude = Number(session.longitude);
    const areaResolution = await this.spatial.resolveReportArea(
      latitude,
      longitude,
    );
    const reportedAt = this.validDate(payload.receivedAt);
    const dateKey = this.wibDateKey(reportedAt);
    const content = session.content?.trim() as string;
    const areaReference = await this.referenceAreaCodes(
      areaResolution?.area?.areaId ?? null,
    );

    const submitted = await this.prisma.$transaction(async (tx) => {
      const counter = await tx.whatsAppReportReferenceCounter.upsert({
        where: { dateKey },
        create: { dateKey, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const referenceNumber = `${areaReference.region}-${areaReference.city}-${dateKey}-${String(counter.lastValue).padStart(6, '0')}`;
      const whatsappMessage = await tx.whatsAppMessage.create({
        data: {
          integrationChannelId: session.integrationChannelId,
          externalMessageId: `report:${session.id}`,
          senderPhone: session.senderPhone,
          jaringId: session.jaringId,
          routedToFieldOfficerAssignmentId: session.fieldOfficerAssignmentId,
          content,
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
          contentChecksum: createHash('sha256').update(content).digest('hex'),
          rawPayload: {
            source: 'WHATSAPP_BOT_REPORT_COLLECTOR',
            reportSessionId: session.id,
            referenceNumber,
            locationMessageId: session.locationMessageId,
            locationType: session.locationType,
            startedAt: session.startedAt.toISOString(),
            reportedAt: reportedAt.toISOString(),
          },
          receivedAt: reportedAt,
          processedAt: reportedAt,
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
          activeSenderKey: null,
          submittedMessageId: whatsappMessage.id,
          referenceNumber,
          submittedAt: reportedAt,
          closedAt: reportedAt,
          lastActivityAt: reportedAt,
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
      return referenceNumber;
    });

    await reply([
      `Kode Pengiriman: *${submitted}*\n\nTerima kasih.\nInformasi telah kami terima.`,
    ]);
  }

  private missingRequirements(session: LoadedSession) {
    const missing: string[] = [];
    if (!session.content?.trim()) missing.push('Isi informasi/narasi');
    if (
      session.latitude === null ||
      session.longitude === null ||
      session.locationAccuracyMeters === null ||
      !session.locationCapturedAt ||
      session.locationType !== 'LIVE_LOCATION'
    ) {
      missing.push('Live Location');
    }
    if (session.media.length === 0) missing.push('Foto atau video');
    return missing;
  }

  private async referenceAreaCodes(resolvedAreaId: string | null) {
    if (!resolvedAreaId) return { region: 'WLY', city: 'UNK' };

    const links = await this.prisma.administrativeAreaClosure.findMany({
      where: {
        descendantId: resolvedAreaId,
        ancestor: {
          level: {
            in: [
              AdministrativeLevel.PROVINCE,
              AdministrativeLevel.CITY,
              AdministrativeLevel.REGENCY,
            ],
          },
          isActive: true,
          deletedAt: null,
        },
      },
      select: {
        depth: true,
        ancestor: { select: { name: true, level: true } },
      },
      orderBy: { depth: 'desc' },
    });

    const province = links.find(
      (link) => link.ancestor.level === AdministrativeLevel.PROVINCE,
    )?.ancestor;
    const city = links.find(
      (link) =>
        link.ancestor.level === AdministrativeLevel.CITY ||
        link.ancestor.level === AdministrativeLevel.REGENCY,
    )?.ancestor;

    return {
      region: this.referenceAreaCode(province?.name, undefined, 'WLY'),
      city: this.referenceAreaCode(city?.name, province?.name, 'UNK'),
    };
  }

  private referenceAreaCode(
    name: string | null | undefined,
    parentName: string | null | undefined,
    fallback: string,
  ) {
    if (!name) return fallback;
    const normalizedName = this.normalizeAreaName(name);
    const override = REFERENCE_AREA_CODE_OVERRIDES.get(normalizedName);
    if (override) return override;

    const parentWords = new Set(
      this.normalizeAreaName(parentName ?? '')
        .split(' ')
        .filter(Boolean)
        .filter((word) => !ADMINISTRATIVE_NAME_WORDS.has(word)),
    );
    let words = normalizedName
      .split(' ')
      .filter(Boolean)
      .filter((word) => !ADMINISTRATIVE_NAME_WORDS.has(word))
      .filter((word) => !parentWords.has(word));
    if (words.length === 0) {
      words = normalizedName
        .split(' ')
        .filter(Boolean)
        .filter((word) => !ADMINISTRATIVE_NAME_WORDS.has(word));
    }
    if (words.length === 0) return fallback;

    const initials = words.map((word) => word[0]).join('');
    const candidates = [
      initials,
      ...words
        .slice()
        .reverse()
        .map((word) => word.slice(1).replace(/[AEIOU]/g, '')),
      words.join('').replace(/[AEIOU]/g, ''),
      words.join(''),
    ].join('');
    return candidates.slice(0, 3).padEnd(3, 'X');
  }

  private normalizeAreaName(value: string) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleUpperCase('id-ID')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  private progressText(session: LoadedSession) {
    const missing = this.missingRequirements(session);
    if (missing.length === 0) {
      return 'Informasi sudah lengkap. Anda masih dapat melanjutkan mengirim teks, foto, video, atau pembaruan Live Location. Jika sudah selesai, ketik *SELESAI*. Untuk membatalkan, ketik *BATAL*.';
    }
    return `Informasi masih dalam proses. Komponen yang belum lengkap:\n${missing.map((item) => `• ${item}`).join('\n')}\n\nSilakan lanjut kirimkan informasi. Setelah seluruh komponen lengkap, ketik *SELESAI*. Untuk membatalkan, ketik *BATAL*.`;
  }

  private async purgeDraftSession(id: string) {
    const draft = await this.prisma.whatsAppReportSession.findUnique({
      where: { id },
      include: {
        media: { include: { file: true } },
      },
    });
    if (!draft || draft.status !== WhatsAppReportSessionStatus.ACTIVE) {
      return false;
    }

    const candidateFileIds = draft.media.map((item) => item.file.id);
    const files = await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppReportHistory.deleteMany({
        where: { reportSessionId: id },
      });
      await tx.whatsAppReportSession.delete({ where: { id } });
      if (candidateFileIds.length === 0) return [];

      const unusedFiles = await tx.fileAsset.findMany({
        where: {
          id: { in: candidateFileIds },
          whatsAppMedia: { none: {} },
          whatsAppReportMedia: { none: {} },
          whatsappPendingMedia: { none: {} },
          whatsappAmendments: { none: {} },
          taskAttachments: { none: {} },
          baketAttachments: { none: {} },
          productAttachments: { none: {} },
          emergencyAttachments: { none: {} },
          uploadReservation: null,
          jaringProfilePhotos: { none: {} },
        },
        select: { id: true, storageKey: true },
      });
      if (unusedFiles.length > 0) {
        await tx.fileAsset.deleteMany({
          where: { id: { in: unusedFiles.map((file) => file.id) } },
        });
      }
      return unusedFiles;
    });

    await Promise.all(
      files.map((file) =>
        this.storage.remove(file.storageKey).catch((error: unknown) => {
          this.logger.warn(
            `Failed to remove draft file ${file.storageKey}: ${this.messageOf(error)}`,
          );
        }),
      ),
    );
    return true;
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
    };
  }

  private async findEligibleJaring(
    senderPhone: string,
    channel: WhatsAppReportChannel,
  ) {
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
    const jaring = await this.prisma.jaring.findFirst({
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
          where: {
            isActive: true,
            validUntil: null,
            fieldOfficerAssignment: {
              isActive: true,
              validUntil: null,
              userProfile: { isActive: true, deletedAt: null },
            },
          },
          take: 1,
        },
      },
    });
    if (!jaring || !jaring.caretakerAssignments[0]) return null;
    const allowed = await this.channelScope.isJaringAllowed(
      channel,
      jaring.areaCoverages.map((coverage) => coverage.areaId),
    );
    return allowed ? jaring : null;
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
      !Number.isFinite(accuracy) ||
      accuracy < 0 ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }
    return { latitude, longitude, accuracy };
  }

  private hasLocationMessage(message: WAMessage) {
    const unwrapped = this.unwrapMessage(message.message);
    return Boolean(unwrapped?.locationMessage || unwrapped?.liveLocationMessage);
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
      await this.discardStoredFile(file.id, file.storageKey);
      throw new Error('Media did not pass malware scanning');
    }
    return file;
  }

  private async discardStoredFile(id: string, storageKey: string) {
    await this.prisma.fileAsset.deleteMany({ where: { id } }).catch(() => undefined);
    await this.storage.remove(storageKey).catch(() => undefined);
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

  private appendContent(current: string | null, next: string) {
    return current?.trim() ? `${current.trim()}\n\n${next.trim()}` : next.trim();
  }

  private startOfWibDay(value: Date) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(value)
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
    return new Date(
      Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        -7,
      ),
    );
  }

  private nextWibDayStart(value: Date) {
    return new Date(this.startOfWibDay(value).getTime() + 24 * 60 * 60 * 1000);
  }

  private wibDateKey(value: Date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(value);
    const item = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value ?? '';
    return `${item('year')}${item('month')}${item('day')}`;
  }

  private validDate(value: string) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
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
