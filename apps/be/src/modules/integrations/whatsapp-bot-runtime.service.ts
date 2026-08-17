import { createHash } from 'node:crypto';
import { access, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Boom } from '@hapi/boom';
import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  jidDecode,
  jidNormalizedUser,
  proto,
  useMultiFileAuthState,
  type BinaryNode,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import P from 'pino';
import * as QRCode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import {
  AreaResolutionMethod,
  CoordinateSource,
  FileLifecycleStatus,
  FileType,
  IntegrationStatus,
  Prisma,
  WhatsAppBotConnectionStatus,
  WhatsAppDeviceEventType,
  WhatsAppMessageStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import { env } from '../../lib/env.js';
import {
  SecretVaultService,
  type EncryptedValue,
} from '../infrastructure/secret-vault.service.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import { MailSettingsService } from '../infrastructure/mail-settings.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { WhatsAppChannelScopeService } from '../whatsapp/whatsapp-channel-scope.service.js';
import {
  WhatsAppReportFlowService,
  type WhatsAppReportReply,
} from './whatsapp-report-flow.service.js';

type RuntimeState = {
  connecting: boolean;
  credsSavePromise: Promise<void>;
  autoReconnectAttempts: number;
  socket?: WASocket;
};

type WhatsAppChannelRecord = {
  id: string;
  code: string;
  channelType: string;
  status: IntegrationStatus;
  config: unknown;
};

type WhatsAppDeviceActivityNotification = {
  id: string;
  channelCode: string;
  channelName: string;
  phoneNumber: string | null;
  eventType: WhatsAppDeviceEventType;
  connectionStatus: WhatsAppBotConnectionStatus;
  previousConnectionStatus: WhatsAppBotConnectionStatus | null;
  sessionJid: string | null;
  scopeAreaName: string | null;
  coordinatorName: string | null;
  occurredAt: Date;
  errorMessage: string | null;
};

type InboundMessagePayload = {
  externalMessageId: string;
  senderPhone: string;
  receivedAt: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracyMeters?: number;
  rawPayload?: Record<string, unknown>;
};

type ReportSessionStep =
  | 'AWAITING_LIVE_LOCATION'
  | 'AWAITING_TITLE'
  | 'AWAITING_CONTENT'
  | 'AWAITING_EVENT_TIME'
  | 'AWAITING_PHOTO';

type ReportLocation = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

type ReportSession = {
  channelId: string;
  remoteJid: string;
  senderPhone: string;
  jaringId: string;
  jaringIdentifier: string;
  jaringLabel: string;
  fieldOfficerAssignmentId: string;
  step: ReportSessionStep;
  startedAt: Date;
  title?: string;
  content?: string;
  eventDateTime?: Date;
  eventDateTimeText?: string;
  location?: ReportLocation;
  locationMessageId?: string;
  locationSharedAt?: Date;
  photoMessageId?: string;
  photoCaption?: string;
  photoFileId?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const LEGACY_WHATSAPP_AUTH_ROOT = 'wa_auth';

const REPORT_REPLIES = {
  cancelled: [
    'Oke, pembuatan berita dibatalkan. Kirim 1945 untuk memulai lagi.',
    'Siap, berita ini dibatalkan ya. Kirim 1945 kapan saja untuk mulai dari awal.',
    'Tidak masalah, prosesnya sudah dibatalkan. Nanti kirim 1945 kalau mau lanjut lagi.',
    'Sudah aku batalkan. Kalau berubah pikiran, kirim saja 1945.',
    'Proses berita dihentikan ya. Kamu bisa mulai lagi dengan mengirim 1945.',
  ],
  outsideChannelScope: [
    'Maaf, nomor kamu tidak berada dalam wilayah layanan WhatsApp ini. Coba gunakan kanal sesuai wilayah Petugas Wilayah (Gaswil) kamu ya.',
    'Nomor ini tidak berada dalam wilayah layanan kanal tersebut. Silakan hubungi kanal Petugas Wilayah (Gaswil) di wilayah kamu.',
    'Sepertinya kamu tidak berada dalam wilayah layanan WhatsApp ini. Gunakan kanal yang sesuai wilayah Petugas Wilayah (Gaswil) ya.',
    'Akses belum bisa dilanjutkan karena nomor kamu tidak berada dalam wilayah layanan ini. Coba kanal wilayah yang sesuai.',
    'Nomor kamu terdaftar, tetapi tidak berada dalam wilayah layanan kanal ini. Silakan gunakan kanal Petugas Wilayah (Gaswil) setempat.',
  ],
  missingCaretaker: [
    'Akun kamu belum punya Petugas Wilayah (Gaswil) penanggung jawab aktif. Hubungi admin dulu ya supaya bisa mengirim berita.',
    'Belum ada Petugas Wilayah (Gaswil) aktif yang menangani akun kamu. Silakan minta admin melengkapinya dulu.',
    'Berita belum bisa dimulai karena penanggung jawab Petugas Wilayah (Gaswil) belum tersedia. Coba hubungi admin ya.',
    'Petugas Wilayah (Gaswil) penanggung jawab akun ini belum aktif. Mohon konfirmasi ke admin terlebih dahulu.',
    'Akun kamu masih perlu dihubungkan ke Petugas Wilayah (Gaswil) aktif. Silakan hubungi admin untuk dibantu.',
  ],
  requestLiveLocation: [
    'Sekarang kirim Live Location WhatsApp kamu ya, bukan lokasi statis.',
    'Lanjut bagikan Live Location lewat WhatsApp, ya.',
    'Lanjutkan dengan mengirim Live Location aktif kamu.',
    'Boleh lanjut kirim Live Location WhatsApp sekarang?',
    'Oke, kirim Live Location aktif dulu ya supaya bisa lanjut.',
  ],
  rejectStaticLocation: [
    'Lokasi statis ditolak. Yang dibutuhkan Live Location aktif dari WhatsApp ya.',
    'Lokasi statis ditolak. Coba pilih Lampiran > Lokasi > Bagikan lokasi terkini.',
    'Lokasi statis ditolak. Kirim ulang sebagai Live Location WhatsApp, ya.',
    'Lokasi statis ditolak. Aku hanya bisa menerima Live Location yang sedang aktif.',
    'Lokasi statis ditolak. Boleh bagikan Live Location aktif sebagai gantinya?',
  ],
  requestValidLiveLocation: [
    'Aku masih menunggu Live Location WhatsApp. Pilih Lampiran > Lokasi > Bagikan lokasi terkini ya.',
    'Yang dikirim harus Live Location aktif ya. Silakan bagikan lewat menu Lokasi WhatsApp.',
    'Belum terbaca sebagai Live Location nih. Coba bagikan lokasi terkini dari menu Lampiran.',
    'Kirim Live Location WhatsApp dulu ya supaya beritanya bisa dilanjutkan.',
    'Tahap ini perlu Live Location aktif. Pilih Lampiran, Lokasi, lalu Bagikan lokasi terkini.',
  ],
  requestTitle: [
    'Live Location diterima. Sekarang tulis judul beritanya ya.',
    'Live Location diterima. Lanjut kirim judul singkat untuk berita ini.',
    'Live Location diterima. Oke, sekarang beritanya mau diberi judul apa?',
    'Live Location diterima. Sip, tinggal ketik judul beritanya dulu.',
    'Live Location diterima. Lokasi aman, sekarang kirim judul berita ya.',
  ],
  requestContent: [
    'Judulnya sudah masuk. Sekarang ceritakan isi beritanya secara detail ya.',
    'Sip, judul sudah dicatat. Lanjut kirim detail kejadiannya.',
    'Oke, judul beres. Sekarang tulis isi berita selengkap mungkin ya.',
    'Judul diterima. Boleh lanjut jelaskan detail beritanya sekarang.',
    'Sudah dapat judulnya. Aku tunggu isi berita lengkapnya ya.',
  ],
  requestEventTime: [
    'Isi berita sudah masuk. Sekarang kirim waktu kejadian, contoh: 13/07/2026 21:30.',
    'Detailnya sudah dicatat. Kapan kejadiannya? Pakai format seperti 13/07/2026 21:30 ya.',
    'Sip, isi berita aman. Lanjut kirim tanggal dan jam kejadian dengan format 13/07/2026 21:30.',
    'Beritanya sudah terbaca. Sekarang tulis tanggal dan jam kejadiannya ya, misalnya 13/07/2026 21:30.',
    'Oke, tinggal waktu kejadian. Kirim dengan format tanggal/bulan/tahun jam, contohnya 13/07/2026 21:30.',
  ],
  invalidEventTime: [
    'Waktunya belum terbaca. Coba pakai format seperti 13/07/2026 21:30 ya.',
    'Format tanggal atau jamnya belum pas. Kirim ulang, contohnya 13/07/2026 21:30.',
    'Aku belum bisa membaca waktunya. Gunakan format tanggal/bulan/tahun jam ya.',
    'Coba cek lagi tanggal dan jamnya. Format yang benar misalnya 13/07/2026 21:30.',
    'Waktu kejadian belum cocok formatnya. Boleh kirim ulang seperti 13/07/2026 21:30?',
  ],
  requestPhoto: [
    'Waktu kejadian sudah dicatat. Sekarang kirim satu foto bukti ya, kirim sebagai foto biasa.',
    'Sip, waktunya sudah masuk. Tinggal kirim satu foto bukti, jangan sebagai dokumen ya.',
    'Tanggal dan jam sudah aman. Boleh lanjut kirim satu foto bukti sekarang?',
    'Oke, waktu kejadian beres. Aku tunggu satu foto buktinya ya.',
    'Sudah tercatat. Langkah terakhir, kirim satu foto bukti sebagai foto, bukan file dokumen.',
  ],
  requirePhoto: [
    'Aku masih menunggu foto buktinya. Kirim satu foto dulu ya.',
    'Yang dibutuhkan sekarang foto bukti. Boleh kirim sebagai foto biasa?',
    'Belum ada foto yang terbaca nih. Coba kirim satu foto bukti ya.',
    'Kirim foto buktinya dulu supaya berita bisa diselesaikan.',
    'Tinggal fotonya saja. Kirim satu foto bukti, jangan sebagai dokumen ya.',
  ],
  missingLiveLocation: [
    'Live Location belum tersimpan. Kirim Live Location WhatsApp sekali lagi ya.',
    'Lokasi aktifnya belum tercatat. Boleh bagikan ulang Live Location WhatsApp?',
    'Aku belum menemukan Live Location kamu. Kirim ulang lokasi terkini ya.',
    'Live Location masih belum masuk. Coba bagikan sekali lagi lewat menu Lokasi.',
    'Sebelum selesai, aku perlu Live Location aktif kamu. Kirim ulang ya.',
  ],
  reportCompleted: [
    'Sip, berita kamu sudah berhasil dikirim.',
    'Beres! Beritanya sudah masuk dan siap diproses.',
    'Terima kasih, beritanya sudah berhasil terkirim.',
    'Oke, semua data sudah masuk. Berita berhasil dikirim.',
    'Beritanya sudah terkirim dengan aman. Terima kasih ya.',
  ],
} as const;

function pickRandomReply(replies: readonly string[]) {
  return (
    replies[Math.floor(Math.random() * replies.length)] ?? replies[0] ?? ''
  );
}

@Injectable()
export class WhatsappBotRuntimeService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WhatsappBotRuntimeService.name);
  private readonly runtimes = new Map<string, RuntimeState>();
  private readonly reportSessions = new Map<string, ReportSession>();
  private shuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
    private readonly jobs: AsyncJobService,
    private readonly storage: LocalStorageService,
    private readonly mailSettings: MailSettingsService,
    private readonly spatial: SpatialRepository,
    private readonly channelScope: WhatsAppChannelScopeService,
    private readonly reportFlow: WhatsAppReportFlowService,
  ) {}

  async onModuleInit() {
    const channels = await this.prisma.integrationChannel.findMany({
      where: {
        deletedAt: null,
        OR: [
          { channelType: { contains: 'WHATSAPP', mode: 'insensitive' } },
          { channelType: { contains: 'WA', mode: 'insensitive' } },
        ],
        status: {
          in: [
            IntegrationStatus.ACTIVE,
            IntegrationStatus.DEGRADED,
            IntegrationStatus.ERROR,
          ],
        },
      },
      select: {
        id: true,
        code: true,
        channelType: true,
        status: true,
        config: true,
      },
    });

    for (const channel of channels) {
      if (!(await this.shouldBootstrapChannel(channel))) {
        this.logger.warn(
          `WhatsApp channel ${channel.code} skipped at bootstrap because no saved session state was found.`,
        );
        continue;
      }

      void this.connectChannel(channel).catch((error: unknown) => {
        this.logger.error(
          `Failed to bootstrap WhatsApp channel ${channel.code}: ${this.messageOf(error)}`,
        );
      });
    }
  }

  async onModuleDestroy() {
    this.shuttingDown = true;
    for (const runtime of this.runtimes.values()) {
      try {
        runtime.socket?.ws?.close();
      } catch {}
    }
  }

  isWhatsAppChannel(channelType: string) {
    const normalized = channelType.toUpperCase();
    return normalized.includes('WHATSAPP') || normalized.includes('WA');
  }

  async activateChannel(channelId: string) {
    const channel = await this.getChannel(channelId);
    await this.connectChannel(channel, { force: true });
  }

  async deactivateChannel(channelId: string) {
    const channel = await this.getChannel(channelId);
    await this.disconnectChannel(channel.id, false);
    await this.persistState(
      channel.id,
      {
        connectionStatus: WhatsAppBotConnectionStatus.DISCONNECTED,
        qrCodeText: null,
        qrCodeDataUrl: null,
        pairingCode: null,
        sessionJid: null,
        lastDisconnectedAt: new Date(),
        lastError: null,
      },
      IntegrationStatus.INACTIVE,
    );
  }

  async requestFreshQr(
    channelId: string,
    options: { resetSession?: boolean } = {},
  ) {
    const channel = await this.getChannel(channelId);
    if (options.resetSession) {
      const botState = await this.prisma.whatsAppBotChannelState.findUnique({
        where: { integrationChannelId: channel.id },
        select: { connectionStatus: true },
      });

      if (
        botState?.connectionStatus === WhatsAppBotConnectionStatus.CONNECTED
      ) {
        throw new ApiException(
          'WHATSAPP_ALREADY_CONNECTED',
          'WhatsApp sudah terhubung. Putuskan koneksi terlebih dahulu sebelum membuat QR baru.',
          HttpStatus.CONFLICT,
        );
      }

      await this.disconnectChannel(channel.id, true);
      await rm(this.authDirForChannel(channel.code), {
        recursive: true,
        force: true,
      });
    } else if (env.whatsapp.allowSessionReset) {
      await this.disconnectChannel(channel.id, true);
      await rm(this.authDirForChannel(channel.code), {
        recursive: true,
        force: true,
      });
    } else {
      await this.disconnectChannel(channel.id, false);
    }

    await this.persistState(channel.id, {
      connectionStatus: WhatsAppBotConnectionStatus.DISCONNECTED,
      qrCodeText: null,
      qrCodeDataUrl: null,
      pairingCode: null,
      lastError: null,
    });
    await this.connectChannel(channel, { force: true });
  }

  async removeChannelConnection(channelId: string) {
    const channel = await this.getChannel(channelId);
    await this.disconnectChannel(channel.id, false);
    await this.persistState(
      channel.id,
      {
        connectionStatus: WhatsAppBotConnectionStatus.DISCONNECTED,
        qrCodeText: null,
        qrCodeDataUrl: null,
        pairingCode: null,
        sessionJid: null,
        lastDisconnectedAt: new Date(),
        lastError: null,
      },
      IntegrationStatus.INACTIVE,
    );
  }

  async healthCheck(channelId: string) {
    const channel = await this.getChannel(channelId);
    const runtime = this.runtimes.get(channel.id);

    if (!runtime?.socket && channel.status !== IntegrationStatus.INACTIVE) {
      await this.connectChannel(channel, { force: true });
    }
  }

  private async getChannel(channelId: string): Promise<WhatsAppChannelRecord> {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id: channelId, deletedAt: null },
      select: {
        id: true,
        code: true,
        channelType: true,
        status: true,
        config: true,
      },
    });

    if (!this.isWhatsAppChannel(channel.channelType)) {
      throw new Error('Channel is not configured as WhatsApp.');
    }

    return channel;
  }

  private async connectChannel(
    channel: WhatsAppChannelRecord,
    options?: { force?: boolean; autoReconnectAttempts?: number },
  ) {
    const existing = this.runtimes.get(channel.id);

    if (existing?.connecting && !options?.force) {
      return;
    }

    if (existing?.socket && !options?.force) {
      return;
    }

    if (options?.force) {
      await this.disconnectChannel(channel.id, false);
    }

    const authDir = await this.ensureAuthDir(channel.code);

    const runtime: RuntimeState = {
      connecting: true,
      credsSavePromise: Promise.resolve(),
      autoReconnectAttempts:
        options?.autoReconnectAttempts ?? existing?.autoReconnectAttempts ?? 0,
    };
    this.runtimes.set(channel.id, runtime);

    await this.persistState(
      channel.id,
      {
        connectionStatus: WhatsAppBotConnectionStatus.CONNECTING,
        authStatePath: authDir,
        qrCodeText: null,
        qrCodeDataUrl: null,
        pairingCode: null,
        lastError: null,
      },
      IntegrationStatus.DEGRADED,
    );

    try {
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();
      const config = this.readConfig(channel.config);
      const pairingMethod = config.pairingMethod === 'code' ? 'code' : 'qr';
      const botPhoneNumber = this.readPhone(config.botPhoneNumber);

      const socket = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu(`DENS CAKRA ${channel.code}`),
        connectTimeoutMs: 60_000,
        logger: P({ level: 'silent' }),
        markOnlineOnConnect: false,
        printQRInTerminal: false,
        shouldIgnoreJid: (jid) =>
          jid.endsWith('@g.us') || jid === 'status@broadcast',
        version,
      });

      runtime.socket = socket;
      socket.ev.on('creds.update', () => {
        runtime.credsSavePromise = runtime.credsSavePromise
          .then(() => saveCreds())
          .catch((error: unknown) => {
            this.logger.error(
              `Failed to save WhatsApp credentials for ${channel.code}: ${this.messageOf(error)}`,
            );
          });
      });
      socket.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(
          channel,
          socket,
          update,
          pairingMethod,
          botPhoneNumber,
        );
      });
      socket.ev.on('messages.upsert', ({ messages }) => {
        for (const message of messages) {
          void this.captureIncomingMessage(channel, socket, message).catch(
            (error: unknown) => {
              this.logger.error(
                `Failed to capture WhatsApp message on ${channel.code}: ${this.messageOf(error)}`,
              );
            },
          );
        }
      });
    } catch (error: unknown) {
      runtime.connecting = false;
      await this.persistState(
        channel.id,
        {
          connectionStatus: WhatsAppBotConnectionStatus.ERROR,
          lastError: this.messageOf(error),
        },
        IntegrationStatus.ERROR,
      );
      throw error;
    }
  }

  private async handleConnectionUpdate(
    channel: WhatsAppChannelRecord,
    socket: WASocket,
    update: {
      connection?: string;
      lastDisconnect?: { error?: unknown } | null;
      qr?: string;
    },
    pairingMethod: 'qr' | 'code',
    botPhoneNumber: string | null,
  ) {
    const runtime = this.runtimes.get(channel.id);
    if (!runtime || runtime.socket !== socket) {
      return;
    }

    const { connection, lastDisconnect, qr } = update;
    const config = this.readConfig(channel.config);

    if (connection === 'connecting') {
      runtime.connecting = true;
      await this.persistState(
        channel.id,
        {
          connectionStatus: WhatsAppBotConnectionStatus.CONNECTING,
          lastError: null,
          botPhoneNumber,
        },
        IntegrationStatus.DEGRADED,
      );
    }

    if (qr && pairingMethod === 'qr') {
      this.printTerminalQr(qr);
      const qrCodeDataUrl = await QRCode.toDataURL(qr).catch(() => null);
      await this.persistState(
        channel.id,
        {
          connectionStatus: WhatsAppBotConnectionStatus.QR_READY,
          qrCodeText: qr,
          qrCodeDataUrl,
          pairingCode: null,
          botPhoneNumber,
          sessionJid: null,
        },
        IntegrationStatus.DEGRADED,
      );
    }

    if (
      pairingMethod === 'code' &&
      !socket.authState.creds.registered &&
      botPhoneNumber &&
      (connection === 'connecting' || qr)
    ) {
      try {
        const rawCode = await socket.requestPairingCode(botPhoneNumber);
        const pairingCode = rawCode.match(/.{1,4}/g)?.join('-') ?? rawCode;
        await this.persistState(
          channel.id,
          {
            connectionStatus: WhatsAppBotConnectionStatus.PAIRING_CODE_READY,
            pairingCode,
            botPhoneNumber,
          },
          IntegrationStatus.DEGRADED,
        );
      } catch (error: unknown) {
        this.logger.warn(
          `Failed to request pairing code for ${channel.code}: ${this.messageOf(error)}`,
        );
      }
    }

    if (connection === 'open') {
      await runtime.credsSavePromise;
      const creds = socket.authState.creds;
      const hasQrAuthentication = Boolean(
        creds.me?.id && creds.account && creds.signalIdentities?.length,
      );
      if (!creds.registered && !hasQrAuthentication) {
        this.runtimes.delete(channel.id);
        try {
          socket.ws?.close();
        } catch {}
        await this.persistState(
          channel.id,
          {
            connectionStatus: WhatsAppBotConnectionStatus.DISCONNECTED,
            qrCodeText: null,
            qrCodeDataUrl: null,
            pairingCode: null,
            sessionJid: null,
            lastDisconnectedAt: new Date(),
            lastError:
              'Pendaftaran perangkat WhatsApp belum selesai. Hubungkan ulang dengan QR baru.',
          },
          IntegrationStatus.INACTIVE,
        );
        return;
      }

      runtime.connecting = false;
      await this.persistState(
        channel.id,
        {
          connectionStatus: WhatsAppBotConnectionStatus.CONNECTED,
          qrCodeText: null,
          qrCodeDataUrl: null,
          pairingCode: null,
          sessionJid: socket.user?.id ?? null,
          botPhoneNumber:
            this.readPhone(socket.user?.id ?? '') ?? botPhoneNumber,
          lastConnectedAt: new Date(),
          lastError: null,
        },
        IntegrationStatus.ACTIVE,
      );
      await this.prisma.integrationChannel.update({
        where: { id: channel.id },
        data: {
          lastHealthAt: new Date(),
          config: this.vault.encrypt({
            ...config,
            botPhoneNumber:
              this.readPhone(socket.user?.id ?? '') ?? botPhoneNumber,
          }),
        },
      });
      this.logger.log(
        `WhatsApp channel ${channel.code} connected as ${socket.user?.id ?? 'unknown session'}`,
      );
    }

    if (connection === 'close') {
      runtime.connecting = false;
      runtime.socket = undefined;

      if (this.shuttingDown) {
        this.logger.log(
          `WhatsApp channel ${channel.code} closed during application shutdown; saved session retained.`,
        );
        return;
      }

      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output
        ?.statusCode;
      const requiresPairing = [
        DisconnectReason.loggedOut,
        DisconnectReason.badSession,
        DisconnectReason.multideviceMismatch,
        DisconnectReason.forbidden,
      ].includes(statusCode as DisconnectReason);
      const reconnectDelayMs =
        statusCode === DisconnectReason.restartRequired
          ? 1_000
          : statusCode === DisconnectReason.unavailableService
            ? 30_000
            : 10_000;
      this.logger.warn(
        `WhatsApp channel ${channel.code} closed with status ${statusCode ?? 'unknown'}: ${this.messageOf(lastDisconnect?.error)}`,
      );

      await this.persistState(
        channel.id,
        {
          connectionStatus: requiresPairing
            ? WhatsAppBotConnectionStatus.DISCONNECTED
            : WhatsAppBotConnectionStatus.ERROR,
          qrCodeText: null,
          qrCodeDataUrl: null,
          pairingCode: null,
          sessionJid: requiresPairing ? null : undefined,
          lastDisconnectedAt: new Date(),
          lastError: requiresPairing
            ? 'Sesi WhatsApp tidak dapat digunakan. Hubungkan ulang dengan QR baru.'
            : `Connection closed with status ${statusCode ?? 'unknown'}.`,
        },
        requiresPairing ? IntegrationStatus.INACTIVE : IntegrationStatus.ERROR,
      );

      if (!requiresPairing) {
        const autoReconnectAttempts = runtime.autoReconnectAttempts + 1;
        const maxAutoReconnectAttempts = Math.max(
          0,
          env.whatsapp.autoReconnectMaxAttempts,
        );
        if (autoReconnectAttempts > maxAutoReconnectAttempts) {
          await this.persistState(
            channel.id,
            {
              connectionStatus: WhatsAppBotConnectionStatus.ERROR,
              qrCodeText: null,
              qrCodeDataUrl: null,
              pairingCode: null,
              lastDisconnectedAt: new Date(),
              lastError: `Pemulihan otomatis WhatsApp dihentikan setelah ${maxAutoReconnectAttempts} percobaan. Periksa sesi atau hubungkan ulang dari menu Integrasi WhatsApp.`,
            },
            IntegrationStatus.ERROR,
          );
          this.logger.warn(
            `WhatsApp channel ${channel.code} auto reconnect stopped after ${maxAutoReconnectAttempts} attempts.`,
          );
          return;
        }

        runtime.autoReconnectAttempts = autoReconnectAttempts;
        setTimeout(() => {
          void (async () => {
            await runtime.credsSavePromise;
            if (this.runtimes.get(channel.id) !== runtime) {
              return;
            }

            await this.connectChannel(channel, { autoReconnectAttempts });
          })().catch((error: unknown) => {
            this.logger.error(
              `Failed to reconnect WhatsApp channel ${channel.code}: ${this.messageOf(error)}`,
            );
          });
        }, reconnectDelayMs);
      }
    }
  }

  private async captureIncomingMessage(
    channel: WhatsAppChannelRecord,
    socket: WASocket,
    message: WAMessage,
  ) {
    if (message.key.fromMe) {
      return;
    }

    const remoteJid = message.key.remoteJid;
    if (
      !remoteJid ||
      remoteJid.endsWith('@g.us') ||
      remoteJid === 'status@broadcast'
    ) {
      return;
    }

    const senderPhone = await this.resolveSenderPhone(socket, remoteJid);
    if (!senderPhone) {
      return;
    }

    const externalMessageId =
      message.key.id ??
      `${remoteJid}:${String(message.messageTimestamp ?? Date.now())}`;

    const existing = await this.prisma.integrationWebhookEvent.findUnique({
      where: {
        channelId_externalEventId: {
          channelId: channel.id,
          externalEventId: externalMessageId,
        },
      },
    });

    if (existing && existing.success !== false) {
      return;
    }

    const payload = this.toInboundPayload(
      message,
      senderPhone,
      externalMessageId,
    );
    const event =
      existing ??
      (await this.prisma.integrationWebhookEvent
        .create({
          data: {
            channelId: channel.id,
            externalEventId: externalMessageId,
            eventType: 'WHATSAPP_BAILEYS_MESSAGE',
            payload: payload.rawPayload as Prisma.InputJsonValue,
          },
        })
        .catch((error: unknown) => {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            return null;
          }
          throw error;
        }));
    if (!event) {
      return;
    }

    const handled = await this.reportFlow
      .handle({
        channel,
        socket,
        message,
        payload,
        reply: (responses) =>
          this.sendHumanLikeReplies(
            socket,
            remoteJid,
            [message.key],
            responses,
          ),
      })
      .catch(async (error: unknown) => {
        this.logger.error(
          `Failed to send WhatsApp bot command response for ${remoteJid}: ${this.messageOf(error)}`,
        );
        await this.prisma.integrationWebhookEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            success: false,
            errorMessage: this.messageOf(error),
          },
        });
        throw error;
      });

    if (handled) {
      await this.prisma.$transaction([
        this.prisma.integrationWebhookEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            success: true,
            errorMessage: null,
          },
        }),
        this.prisma.integrationChannel.update({
          where: { id: channel.id },
          data: { lastHealthAt: new Date() },
        }),
      ]);
      return;
    }

    await this.jobs.enqueue({
      type: 'WHATSAPP_PROCESS',
      correlationId: externalMessageId,
      payload: {
        eventId: event.id,
        message: payload,
      } as unknown as Prisma.InputJsonValue,
    });

    await this.prisma.integrationChannel.update({
      where: { id: channel.id },
      data: { lastHealthAt: new Date() },
    });
  }

  private toInboundPayload(
    message: WAMessage,
    senderPhone: string,
    externalMessageId: string,
  ): InboundMessagePayload {
    const unwrapped = this.unwrapMessage(message.message);
    const text = this.extractText(unwrapped);
    const location = this.extractLocation(unwrapped);
    return {
      externalMessageId,
      senderPhone,
      receivedAt: new Date(
        Number(message.messageTimestamp ?? Date.now()) * 1000,
      ).toISOString(),
      content:
        text || (location ? 'Lokasi diterima dari sesi WhatsApp.' : undefined),
      latitude: location?.latitude,
      longitude: location?.longitude,
      gpsAccuracyMeters: location?.accuracy,
      rawPayload: {
        senderJid: message.key.remoteJid ?? null,
        participantJid: message.key.participant ?? null,
        pushName: message.pushName ?? null,
        messageType: this.detectMessageType(unwrapped),
        hasMedia: Boolean(
          unwrapped?.imageMessage ||
          unwrapped?.videoMessage ||
          unwrapped?.documentMessage,
        ),
      },
    };
  }

  private unwrapMessage(message?: WAMessage['message']) {
    if (!message) {
      return undefined;
    }

    return (
      message.ephemeralMessage?.message ??
      message.viewOnceMessage?.message ??
      message.viewOnceMessageV2?.message ??
      message
    );
  }

  private extractText(message: ReturnType<typeof this.unwrapMessage>) {
    if (!message) {
      return '';
    }

    // Jika pesan adalah interactiveResponseMessage (Native Flow / list response),
    // gunakan HANYA ID pilihan dari extractNativeFlowSelection.
    // Jangan fallback ke body.text karena itu adalah label tampilan (mis. "Selesai Isi & Lampiran"),
    // bukan ID action, sehingga akan salah diproses sebagai konten teks biasa.
    if (message.interactiveResponseMessage) {
      return this.extractNativeFlowSelection(message);
    }

    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      ''
    ).trim();
  }

  private extractNativeFlowSelection(
    message: ReturnType<typeof this.unwrapMessage>,
  ) {
    const paramsJson =
      message?.interactiveResponseMessage?.nativeFlowResponseMessage
        ?.paramsJson;
    if (!paramsJson) {
      return '';
    }

    try {
      const params = JSON.parse(paramsJson) as Record<string, unknown>;
      for (const key of ['id', 'selected_row_id', 'row_id']) {
        const value = params[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to parse WhatsApp Native Flow response: ${this.messageOf(error)}`,
      );
    }

    return '';
  }

  private extractLocation(
    message: ReturnType<typeof this.unwrapMessage>,
    liveOnly = false,
  ) {
    const location = liveOnly
      ? (message?.liveLocationMessage ??
        (message?.locationMessage?.isLive
          ? message.locationMessage
          : undefined))
      : message?.locationMessage || message?.liveLocationMessage;

    if (!location) {
      return null;
    }

    const latitude = Number(location.degreesLatitude);
    const longitude = Number(location.degreesLongitude);
    const accuracy = Number(
      (
        location as {
          accuracyInMeters?: number | null;
        }
      ).accuracyInMeters,
    );

    return {
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
      accuracy: Number.isFinite(accuracy) ? accuracy : undefined,
    };
  }

  private detectMessageType(message: ReturnType<typeof this.unwrapMessage>) {
    if (!message) {
      return 'UNKNOWN';
    }
    if (message.locationMessage || message.liveLocationMessage) {
      return 'LOCATION';
    }
    if (message.imageMessage) {
      return 'IMAGE';
    }
    if (message.videoMessage) {
      return 'VIDEO';
    }
    if (message.documentMessage) {
      return 'DOCUMENT';
    }
    if (message.extendedTextMessage || message.conversation) {
      return 'TEXT';
    }
    return 'UNKNOWN';
  }

  private async resolveSenderPhone(socket: WASocket, jid: string) {
    const normalizedJid = jidNormalizedUser(jid);
    const decoded = jidDecode(normalizedJid);

    if (!decoded?.user) {
      return null;
    }

    if (decoded.server === 'lid') {
      const mappedPn = await this.resolvePhoneNumberForLid(
        socket,
        decoded.user,
      );
      if (mappedPn) {
        return mappedPn;
      }
    }

    try {
      return normalizeIndonesianPhoneNumber(decoded.user);
    } catch {
      return null;
    }
  }

  private async resolvePhoneNumberForLid(socket: WASocket, lidUser: string) {
    const reverseKey = `${lidUser}_reverse`;
    const stored = (await Promise.resolve(
      socket.authState.keys.get('lid-mapping', [reverseKey]),
    ).catch(() => ({}))) as Record<string, string | undefined>;
    const mappedUser = stored[reverseKey];

    if (typeof mappedUser !== 'string' || mappedUser.length === 0) {
      return null;
    }

    try {
      return normalizeIndonesianPhoneNumber(mappedUser);
    } catch {
      return null;
    }
  }

  private authDirForChannel(channelCode: string) {
    return resolve(
      env.whatsapp.authRoot,
      this.authDirNameForChannel(channelCode),
    );
  }

  private authCredsPathForChannel(channelCode: string) {
    return resolve(this.authDirForChannel(channelCode), 'creds.json');
  }

  private legacyAuthDirForChannel(channelCode: string) {
    return resolve(
      process.cwd(),
      LEGACY_WHATSAPP_AUTH_ROOT,
      this.authDirNameForChannel(channelCode),
    );
  }

  private legacyAuthCredsPathForChannel(channelCode: string) {
    return resolve(this.legacyAuthDirForChannel(channelCode), 'creds.json');
  }

  private authDirNameForChannel(channelCode: string) {
    return (
      channelCode
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\.\.+/g, '-')
        .replace(/^[-.\s]+|[-.\s]+$/g, '') || 'default'
    );
  }

  private async ensureAuthDir(channelCode: string) {
    const authDir = this.authDirForChannel(channelCode);
    const legacyAuthDir = this.legacyAuthDirForChannel(channelCode);

    if (
      authDir !== legacyAuthDir &&
      !(await this.pathExists(authDir)) &&
      (await this.pathExists(legacyAuthDir))
    ) {
      await mkdir(dirname(authDir), { recursive: true });
      await cp(legacyAuthDir, authDir, { recursive: true, force: false });
      this.logger.warn(
        `Migrated WhatsApp auth state from ${legacyAuthDir} to ${authDir}`,
      );
    }

    await mkdir(authDir, { recursive: true });
    return authDir;
  }

  private async pathExists(path: string) {
    return access(path)
      .then(() => true)
      .catch(() => false);
  }

  private async hasStoredAuthState(channelCode: string) {
    return (
      (await this.pathExists(this.authCredsPathForChannel(channelCode))) ||
      (await this.pathExists(this.legacyAuthCredsPathForChannel(channelCode)))
    );
  }

  private async shouldBootstrapChannel(channel: WhatsAppChannelRecord) {
    if (channel.status !== IntegrationStatus.ERROR) {
      return true;
    }

    return this.hasStoredAuthState(channel.code);
  }

  private assertSessionResetAllowed() {
    if (env.whatsapp.allowSessionReset) {
      return;
    }

    throw new ApiException(
      'WHATSAPP_SESSION_RESET_DISABLED',
      'Reset session WhatsApp dinonaktifkan untuk menjaga login tetap aktif. Aktifkan WHATSAPP_ALLOW_SESSION_RESET=true hanya saat operator benar-benar perlu scan QR ulang.',
      HttpStatus.CONFLICT,
    );
  }

  private readConfig(config: unknown) {
    if (
      config &&
      typeof config === 'object' &&
      'algorithm' in config &&
      (config as { algorithm?: unknown }).algorithm === 'aes-256-gcm'
    ) {
      return this.vault.decrypt<Record<string, unknown>>(
        config as EncryptedValue,
      );
    }

    return (config as Record<string, unknown> | null) ?? {};
  }

  private readPhone(value: unknown) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null;
    }

    try {
      const jidUser = value.trim().split('@')[0]?.split(':')[0];
      return jidUser ? normalizeIndonesianPhoneNumber(jidUser) : null;
    } catch {
      return null;
    }
  }

  private eventTypeForStatus(
    status: WhatsAppBotConnectionStatus,
    previousStatus?: WhatsAppBotConnectionStatus | null,
  ) {
    if (status === WhatsAppBotConnectionStatus.CONNECTED) {
      return WhatsAppDeviceEventType.LOGIN;
    }
    if (status === WhatsAppBotConnectionStatus.ERROR) {
      return WhatsAppDeviceEventType.ERROR;
    }
    if (status === WhatsAppBotConnectionStatus.QR_READY) {
      return WhatsAppDeviceEventType.QR_READY;
    }
    if (status === WhatsAppBotConnectionStatus.PAIRING_CODE_READY) {
      return WhatsAppDeviceEventType.PAIRING_CODE_READY;
    }
    if (status === WhatsAppBotConnectionStatus.CONNECTING) {
      return WhatsAppDeviceEventType.CONNECTING;
    }
    if (status === WhatsAppBotConnectionStatus.DISCONNECTED) {
      return previousStatus === WhatsAppBotConnectionStatus.CONNECTED
        ? WhatsAppDeviceEventType.LOGOUT
        : WhatsAppDeviceEventType.DISCONNECTED;
    }

    return WhatsAppDeviceEventType.STATUS_UPDATE;
  }

  private shouldNotifyDeviceActivity(eventType: WhatsAppDeviceEventType) {
    return (
      eventType === WhatsAppDeviceEventType.LOGIN ||
      eventType === WhatsAppDeviceEventType.LOGOUT ||
      eventType === WhatsAppDeviceEventType.DISCONNECTED ||
      eventType === WhatsAppDeviceEventType.ERROR
    );
  }

  private deviceActivityTitle(eventType: WhatsAppDeviceEventType) {
    if (eventType === WhatsAppDeviceEventType.LOGIN) {
      return 'WhatsApp aktif';
    }
    if (eventType === WhatsAppDeviceEventType.ERROR) {
      return 'WhatsApp bermasalah';
    }
    if (eventType === WhatsAppDeviceEventType.LOGOUT) {
      return 'WhatsApp logout';
    }
    if (eventType === WhatsAppDeviceEventType.DISCONNECTED) {
      return 'WhatsApp terputus';
    }

    return 'Aktivitas WhatsApp';
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
      if (character === '&') return '&amp;';
      if (character === '<') return '&lt;';
      if (character === '>') return '&gt;';
      if (character === '"') return '&quot;';
      return '&#39;';
    });
  }

  private queueDeviceActivityNotification(
    log: WhatsAppDeviceActivityNotification | null,
  ) {
    if (!log || !this.shouldNotifyDeviceActivity(log.eventType)) {
      return;
    }

    void (async () => {
      const recipients =
        await this.prisma.whatsAppNotificationRecipient.findMany({
          where: {
            isActive: true,
            ...(log.eventType === WhatsAppDeviceEventType.LOGIN
              ? { notifyOnConnected: true }
              : {}),
            ...(log.eventType === WhatsAppDeviceEventType.ERROR
              ? { notifyOnError: true }
              : {}),
            ...(log.eventType === WhatsAppDeviceEventType.LOGOUT ||
            log.eventType === WhatsAppDeviceEventType.DISCONNECTED
              ? { notifyOnDisconnected: true }
              : {}),
          },
          select: { email: true },
        });

      if (recipients.length === 0) {
        return;
      }

      const title = this.deviceActivityTitle(log.eventType);
      const occurredAt = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      }).format(log.occurredAt);
      const phoneNumber = log.phoneNumber ?? 'Nomor belum terbaca';
      const area = log.scopeAreaName ?? 'Wilayah belum terpetakan';
      const coordinator = log.coordinatorName ?? 'Pengelola belum terpetakan';
      const statusLine = `${log.previousConnectionStatus ?? '-'} -> ${log.connectionStatus}`;
      const htmlTitle = this.escapeHtml(title);
      const htmlPhoneNumber = this.escapeHtml(phoneNumber);
      const htmlChannel = this.escapeHtml(
        `${log.channelName} (${log.channelCode})`,
      );
      const htmlStatusLine = this.escapeHtml(statusLine);
      const htmlArea = this.escapeHtml(area);
      const htmlCoordinator = this.escapeHtml(coordinator);
      const htmlOccurredAt = this.escapeHtml(`${occurredAt} WIB`);
      const htmlError = log.errorMessage
        ? this.escapeHtml(log.errorMessage)
        : null;
      const text = [
        `${title}: ${phoneNumber}`,
        `Kanal: ${log.channelName} (${log.channelCode})`,
        `Status: ${statusLine}`,
        `Wilayah: ${area}`,
        `Pengelola: ${coordinator}`,
        `Waktu: ${occurredAt} WIB`,
        log.errorMessage ? `Error: ${log.errorMessage}` : null,
      ]
        .filter(Boolean)
        .join('\n');
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827; max-width: 680px; margin: 0 auto; padding: 24px;">
          <h2 style="margin: 0 0 16px;">${htmlTitle}</h2>
          <p>Aktivitas perangkat WhatsApp terdeteksi pada server DENS CAKRA.</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px; color: #6b7280;">Nomor</td><td style="padding: 8px; font-weight: 700;">${htmlPhoneNumber}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Kanal</td><td style="padding: 8px;">${htmlChannel}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Status</td><td style="padding: 8px;">${htmlStatusLine}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Wilayah</td><td style="padding: 8px;">${htmlArea}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Pengelola</td><td style="padding: 8px;">${htmlCoordinator}</td></tr>
            <tr><td style="padding: 8px; color: #6b7280;">Waktu</td><td style="padding: 8px;">${htmlOccurredAt}</td></tr>
            ${
              htmlError
                ? `<tr><td style="padding: 8px; color: #6b7280;">Error</td><td style="padding: 8px;">${htmlError}</td></tr>`
                : ''
            }
          </table>
        </div>
      `;

      for (const recipient of recipients) {
        this.mailSettings.queueMail({
          to: recipient.email,
          subject: `[DENS CAKRA] ${title} - ${phoneNumber}`,
          text,
          html,
        });
      }
    })().catch((error: unknown) => {
      this.logger.warn(
        `Failed to queue WhatsApp device notification: ${this.messageOf(error)}`,
      );
    });
  }

  private async persistState(
    channelId: string,
    patch: {
      connectionStatus?: WhatsAppBotConnectionStatus;
      qrCodeText?: string | null;
      qrCodeDataUrl?: string | null;
      pairingCode?: string | null;
      authStatePath?: string | null;
      botPhoneNumber?: string | null;
      sessionJid?: string | null;
      lastConnectedAt?: Date | null;
      lastDisconnectedAt?: Date | null;
      lastError?: string | null;
    },
    channelStatus?: IntegrationStatus,
  ) {
    const notification = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.whatsAppBotChannelState.findUnique({
        where: { integrationChannelId: channelId },
        select: {
          connectionStatus: true,
          botPhoneNumber: true,
          sessionJid: true,
        },
      });

      if (channelStatus) {
        await tx.integrationChannel.update({
          where: { id: channelId },
          data: { status: channelStatus },
        });
      }

      await tx.whatsAppBotChannelState.upsert({
        where: { integrationChannelId: channelId },
        create: {
          integrationChannelId: channelId,
          connectionStatus:
            patch.connectionStatus ?? WhatsAppBotConnectionStatus.DISCONNECTED,
          qrCodeText: patch.qrCodeText ?? null,
          qrCodeDataUrl: patch.qrCodeDataUrl ?? null,
          pairingCode: patch.pairingCode ?? null,
          authStatePath: patch.authStatePath ?? null,
          botPhoneNumber: patch.botPhoneNumber ?? null,
          sessionJid: patch.sessionJid ?? null,
          lastConnectedAt: patch.lastConnectedAt ?? null,
          lastDisconnectedAt: patch.lastDisconnectedAt ?? null,
          lastError: patch.lastError ?? null,
        },
        update: patch,
      });

      if (
        !patch.connectionStatus ||
        existing?.connectionStatus === patch.connectionStatus
      ) {
        return null;
      }

      const channel = await tx.integrationChannel.findUnique({
        where: { id: channelId },
        select: {
          code: true,
          name: true,
          config: true,
          senderNumbers: {
            where: { isActive: true },
            select: { id: true, phoneNumber: true, isPrimary: true },
            orderBy: [{ isPrimary: 'desc' }, { phoneNumber: 'asc' }],
          },
        },
      });

      if (!channel) {
        return null;
      }

      let config: Record<string, unknown> = {};
      try {
        config = this.readConfig(channel.config);
      } catch {
        config = {};
      }
      const configuredScopeAreaIds = Array.isArray(config.scopeAreaIds)
        ? config.scopeAreaIds.filter(
            (item): item is string =>
              typeof item === 'string' && item.trim().length > 0,
          )
        : [];
      const scopeAreaId =
        configuredScopeAreaIds[0] ??
        (typeof config.scopeAreaId === 'string' ? config.scopeAreaId : null);
      const userProfileId =
        typeof config.userId === 'string' ? config.userId : null;
      const operationalAssignmentId =
        typeof config.operationalAssignmentId === 'string'
          ? config.operationalAssignmentId
          : null;
      const phoneNumber =
        this.readPhone(patch.botPhoneNumber) ??
        this.readPhone(existing?.botPhoneNumber) ??
        this.readPhone(patch.sessionJid) ??
        this.readPhone(existing?.sessionJid) ??
        this.readPhone(config.botPhoneNumber) ??
        channel.senderNumbers[0]?.phoneNumber ??
        null;
      const senderNumber =
        phoneNumber && channel.senderNumbers.length > 0
          ? channel.senderNumbers.find(
              (item) => item.phoneNumber === phoneNumber,
            )
          : null;
      const eventType = this.eventTypeForStatus(
        patch.connectionStatus,
        existing?.connectionStatus,
      );
      const occurredAt =
        patch.connectionStatus === WhatsAppBotConnectionStatus.CONNECTED
          ? (patch.lastConnectedAt ?? new Date())
          : patch.connectionStatus ===
                WhatsAppBotConnectionStatus.DISCONNECTED ||
              patch.connectionStatus === WhatsAppBotConnectionStatus.ERROR
            ? (patch.lastDisconnectedAt ?? new Date())
            : new Date();
      const activity = await tx.whatsAppDeviceActivityLog.create({
        data: {
          channelId,
          senderNumberId: senderNumber?.id ?? null,
          phoneNumber,
          eventType,
          connectionStatus: patch.connectionStatus,
          previousConnectionStatus: existing?.connectionStatus ?? null,
          sessionJid: patch.sessionJid ?? existing?.sessionJid ?? null,
          scopeAreaId,
          userProfileId,
          operationalAssignmentId,
          reason:
            eventType === WhatsAppDeviceEventType.LOGIN
              ? 'Sesi WhatsApp aktif pada server.'
              : eventType === WhatsAppDeviceEventType.LOGOUT
                ? 'Sesi WhatsApp keluar atau terputus dari server.'
                : null,
          errorMessage: patch.lastError ?? null,
          metadata: {
            channelStatus: channelStatus ?? null,
            botPhoneNumber: patch.botPhoneNumber ?? null,
          } satisfies Prisma.InputJsonValue,
          occurredAt,
        },
        include: {
          scopeArea: { select: { name: true } },
          userProfile: { select: { fullName: true } },
        },
      });

      return {
        id: activity.id,
        channelCode: channel.code,
        channelName: channel.name,
        phoneNumber: activity.phoneNumber,
        eventType: activity.eventType,
        connectionStatus: activity.connectionStatus,
        previousConnectionStatus: activity.previousConnectionStatus,
        sessionJid: activity.sessionJid,
        scopeAreaName: activity.scopeArea?.name ?? null,
        coordinatorName: activity.userProfile?.fullName ?? null,
        occurredAt: activity.occurredAt,
        errorMessage: activity.errorMessage,
      } satisfies WhatsAppDeviceActivityNotification;
    });

    this.queueDeviceActivityNotification(notification);
  }

  async disconnectChannel(channelId: string, logout: boolean) {
    const runtime = this.runtimes.get(channelId);
    if (!runtime) {
      return;
    }

    try {
      if (logout) {
        await runtime.socket?.logout();
      }
    } catch {}

    try {
      runtime.socket?.ws?.close();
    } catch {}

    this.runtimes.delete(channelId);
  }

  async deleteChannelSession(channelId: string) {
    const channel = await this.getChannel(channelId);
    this.assertSessionResetAllowed();

    if (!this.runtimes.has(channelId)) {
      await this.connectChannel(channel, { force: true }).catch(
        () => undefined,
      );
    }

    await this.disconnectChannel(channel.id, true);
    await rm(this.authDirForChannel(channel.code), {
      recursive: true,
      force: true,
    });
  }

  private async handleBotInteraction(
    channel: WhatsAppChannelRecord,
    socket: WASocket,
    message: WAMessage,
    payload: InboundMessagePayload,
  ) {
    const remoteJid = message.key.remoteJid;
    const text = payload.content?.trim() ?? '';

    if (!remoteJid) {
      return false;
    }

    const sessionKey = this.reportSessionKey(channel.id, remoteJid);
    const activeSession = this.reportSessions.get(sessionKey);

    if (this.isCancelIntent(text)) {
      if (activeSession) {
        this.reportSessions.delete(sessionKey);
        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [pickRandomReply(REPORT_REPLIES.cancelled)],
        );
        return true;
      }
      return false;
    }

    if (activeSession) {
      await this.advanceReportSession(
        channel,
        socket,
        message,
        payload,
        activeSession,
        sessionKey,
      );
      return true;
    }

    if (this.isReportIntent(text)) {
      await this.startReportSession(
        channel,
        socket,
        message,
        payload,
        sessionKey,
      );
      return true;
    }

    return true;
  }

  private async startReportSession(
    channel: WhatsAppChannelRecord,
    socket: WASocket,
    message: WAMessage,
    payload: InboundMessagePayload,
    sessionKey: string,
  ) {
    const remoteJid = message.key.remoteJid;
    if (!remoteJid) {
      return;
    }

    const jaring = await this.findVerifiedJaring(payload.senderPhone);
    const isInChannelScope = jaring
      ? await this.channelScope.isJaringAllowed(
          channel,
          jaring.areaCoverages.map((coverage) => coverage.areaId),
        )
      : false;

    if (!jaring) {
      return;
    }

    if (!isInChannelScope) {
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.outsideChannelScope)],
      );
      return;
    }

    const caretakerAssignmentId =
      jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId;

    if (!caretakerAssignmentId) {
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.missingCaretaker)],
      );
      return;
    }

    const jaringLabel = jaring.aliasName || jaring.fullName || jaring.id;
    this.reportSessions.set(sessionKey, {
      channelId: channel.id,
      remoteJid,
      senderPhone: payload.senderPhone,
      jaringId: jaring.id,
      jaringIdentifier: jaring.aliasName || jaring.id,
      jaringLabel,
      fieldOfficerAssignmentId: caretakerAssignmentId,
      step: 'AWAITING_LIVE_LOCATION',
      startedAt: new Date(),
    });

    await this.sendHumanLikeReplies(
      socket,
      remoteJid,
      [message.key],
      [pickRandomReply(REPORT_REPLIES.requestLiveLocation)],
    );
  }

  private async advanceReportSession(
    channel: WhatsAppChannelRecord,
    socket: WASocket,
    message: WAMessage,
    payload: InboundMessagePayload,
    session: ReportSession,
    sessionKey: string,
  ) {
    const remoteJid = message.key.remoteJid;
    const text = payload.content?.trim() ?? '';
    const unwrapped = this.unwrapMessage(message.message);

    if (!remoteJid) {
      return;
    }

    if (session.step === 'AWAITING_LIVE_LOCATION') {
      const liveLocation = this.extractLocation(unwrapped, true);
      const hasValidLiveLocation =
        liveLocation?.latitude !== undefined &&
        liveLocation.longitude !== undefined;

      if (!hasValidLiveLocation) {
        const rejection =
          unwrapped?.locationMessage && !unwrapped.locationMessage.isLive
            ? pickRandomReply(REPORT_REPLIES.rejectStaticLocation)
            : pickRandomReply(REPORT_REPLIES.requestValidLiveLocation);

        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [rejection],
        );
        return;
      }

      session.location = liveLocation;
      session.locationMessageId = payload.externalMessageId;
      session.locationSharedAt = new Date(payload.receivedAt);
      session.step = 'AWAITING_TITLE';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.requestTitle)],
      );
      return;
    }

    if (session.step === 'AWAITING_TITLE') {
      if (!text) {
        return;
      }

      session.title = text.slice(0, 300);
      session.step = 'AWAITING_CONTENT';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.requestContent)],
      );
      return;
    }

    if (session.step === 'AWAITING_CONTENT') {
      if (!text) {
        return;
      }

      session.content = text;
      session.step = 'AWAITING_EVENT_TIME';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.requestEventTime)],
      );
      return;
    }

    if (session.step === 'AWAITING_EVENT_TIME') {
      if (!text) {
        return;
      }

      const eventDateTime = this.parseReportDateTime(text);
      if (!eventDateTime) {
        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [pickRandomReply(REPORT_REPLIES.invalidEventTime)],
        );
        return;
      }

      session.eventDateTime = eventDateTime;
      session.eventDateTimeText = text;
      session.step = 'AWAITING_PHOTO';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.requestPhoto)],
      );
      return;
    }

    if (session.step === 'AWAITING_PHOTO') {
      if (!unwrapped?.imageMessage) {
        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [pickRandomReply(REPORT_REPLIES.requirePhoto)],
        );
        return;
      }

      session.photoMessageId = payload.externalMessageId;
      session.photoCaption = unwrapped.imageMessage.caption ?? undefined;
      session.photoFileId = await this.storeWhatsAppPhoto(
        socket,
        message,
        session,
      );
      if (!session.location) {
        session.step = 'AWAITING_LIVE_LOCATION';
        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [pickRandomReply(REPORT_REPLIES.missingLiveLocation)],
        );
        return;
      }

      await this.saveCompletedReport(
        channel,
        payload,
        session,
        session.location,
      );
      this.reportSessions.delete(sessionKey);

      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.reportCompleted)],
      );
    }
  }

  private isReportIntent(text: string) {
    return text.trim().toLowerCase() === 'lapor';
  }

  private isCancelIntent(text: string) {
    const command = text.trim().split(/\s+/)[0]?.toLowerCase();
    return (
      command === 'batal' ||
      command === '/batal' ||
      command === 'cancel' ||
      command === '/cancel'
    );
  }

  private async saveCompletedReport(
    channel: WhatsAppChannelRecord,
    payload: InboundMessagePayload,
    session: ReportSession,
    location: ReportLocation,
  ) {
    const hasCoordinates =
      Number.isFinite(location.latitude) && Number.isFinite(location.longitude);
    const areaResolution = hasCoordinates
      ? await this.spatial.resolveReportArea(
          location.latitude as number,
          location.longitude as number,
        )
      : null;

    await this.prisma.whatsAppMessage.create({
      data: {
        integrationChannelId: channel.id,
        externalMessageId: `report:${payload.externalMessageId}`,
        senderPhone: session.senderPhone,
        jaringId: session.jaringId,
        routedToFieldOfficerAssignmentId: session.fieldOfficerAssignmentId,
        content: session.content,
        latitude: location.latitude,
        longitude: location.longitude,
        gpsAccuracyMeters: location.accuracy,
        locationCapturedAt:
          session.locationSharedAt ?? new Date(payload.receivedAt),
        coordinateSource: CoordinateSource.WHATSAPP_LOCATION,
        resolvedAreaId: areaResolution?.area?.areaId ?? null,
        areaResolutionMethod:
          areaResolution?.method ?? AreaResolutionMethod.UNRESOLVED,
        areaResolutionConfidence: areaResolution?.confidence ?? null,
        areaResolvedAt: areaResolution?.resolvedAt ?? null,
        status: WhatsAppMessageStatus.RECEIVED,
        validationSummary: WhatsAppValidationSummary.NOT_CHECKED,
        rawPayload: {
          source: 'WHATSAPP_BOT_REPORT_FLOW',
          senderPhone: session.senderPhone,
          jaringIdentifier: session.jaringIdentifier,
          jaringLabel: session.jaringLabel,
          photoMessageId: session.photoMessageId,
          photoCaption: session.photoCaption,
          locationMessageId: session.locationMessageId,
          gpsSharedAt: session.locationSharedAt?.toISOString(),
          startedAt: session.startedAt.toISOString(),
          completedAt: new Date(payload.receivedAt).toISOString(),
          timestamp: new Date().toISOString(),
        },
        ...(session.photoFileId
          ? {
              media: {
                create: {
                  fileId: session.photoFileId,
                  caption: session.photoCaption,
                  orderNo: 1,
                },
              },
            }
          : {}),
        receivedAt: new Date(payload.receivedAt),
        processedAt: new Date(),
      },
    });
  }

  private async storeWhatsAppPhoto(
    socket: WASocket,
    message: WAMessage,
    session: ReportSession,
  ) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        {
          logger: P({ level: 'silent' }),
          reuploadRequest: socket.updateMediaMessage.bind(socket),
        },
      );
      const mimeType =
        this.unwrapMessage(message.message)?.imageMessage?.mimetype ||
        'image/jpeg';
      const extension = mimeType.includes('png') ? 'png' : 'jpg';
      const originalName = `${session.jaringIdentifier}-${session.photoMessageId}.${extension}`;
      const storageKey = this.storage.createStorageKey(
        'whatsapp-evidence',
        originalName,
      );
      await this.storage.write(storageKey, buffer);
      const checksumSha256 = createHash('sha256').update(buffer).digest('hex');

      const file = await this.prisma.fileAsset.create({
        data: {
          storageKey,
          originalName,
          mimeType,
          fileType: FileType.PHOTO,
          sizeBytes: BigInt(buffer.length),
          checksumSha256,
          lifecycleStatus: FileLifecycleStatus.CLEAN,
        },
      });

      return file.id;
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to store WhatsApp photo evidence: ${this.messageOf(error)}`,
      );
      return undefined;
    }
  }

  private parseReportDateTime(value: string) {
    const match = value
      .trim()
      .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2})[:.](\d{2})$/);

    if (!match) {
      return null;
    }

    const [, dayText, monthText, yearText, hourText, minuteText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > 31 ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute
    ) {
      return null;
    }

    return date;
  }

  private reportSessionKey(channelId: string, remoteJid: string) {
    return `${channelId}:${remoteJid}`;
  }

  private findVerifiedJaring(senderPhone: string) {
    return this.prisma.jaring.findFirst({
      where: {
        whatsappNumber: senderPhone,
        registrationStatus: 'APPROVED',
        deletedAt: null,
      },
      include: {
        areaCoverages: {
          where: { validUntil: null },
          include: { area: true },
        },
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          take: 1,
          include: {
            fieldOfficerAssignment: {
              include: { userProfile: true },
            },
          },
        },
      },
    });
  }

  private async sendHumanLikeReplies(
    socket: WASocket,
    remoteJid: string,
    messageKeys: WAMessage['key'][],
    replies: WhatsAppReportReply[],
  ) {
    await sleep(1200 + Math.floor(Math.random() * 700));

    try {
      await socket.readMessages(messageKeys);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to mark WhatsApp message as read: ${this.messageOf(error)}`,
      );
    }

    for (const [index, reply] of replies.entries()) {
      const text = this.sanitizeOutboundReply(
        typeof reply === 'string' ? reply : reply.body,
      );
      const typingMs = Math.min(
        3000,
        Math.max(1000, text.length * 30 + Math.floor(Math.random() * 400)),
      );
      const betweenMessageDelayMs =
        (index === 0 ? 500 : 1000) + Math.floor(Math.random() * 500);

      await sleep(betweenMessageDelayMs);

      try {
        await socket.sendPresenceUpdate('composing', remoteJid);
      } catch {}

      await sleep(typingMs);

      try {
        await socket.sendPresenceUpdate('paused', remoteJid);
      } catch {}

      if (typeof reply === 'string') {
        await socket.sendMessage(remoteJid, { text });
      } else {
        try {
          await this.sendNativeFlowSingleSelect(socket, remoteJid, {
            ...reply,
            body: text,
          });
        } catch (error: unknown) {
          this.logger.warn(
            `Failed to send Native Flow list to ${remoteJid}: ${this.messageOf(error)}. Sending plain text fallback.`,
          );
          const fallbackText = this.formatReplyAsPlainText({
            ...reply,
            body: text,
          });
          await socket.sendMessage(remoteJid, { text: fallbackText });
        }
      }
    }
  }

  private formatReplyAsPlainText(
    reply: Exclude<WhatsAppReportReply, string>,
  ): string {
    let result = reply.body;
    if (reply.sections && reply.sections.length > 0) {
      const choices: string[] = [];
      let optionIndex = 1;
      for (const section of reply.sections) {
        if (section.title) {
          choices.push(`\n📌 *${section.title}*`);
        }
        for (const row of section.rows) {
          choices.push(
            `${optionIndex}. *${row.title}*${row.description ? ` — ${row.description}` : ''}`,
          );
          optionIndex++;
        }
      }
      result += `\n${choices.join('\n')}`;
    }
    if (reply.footer) {
      result += `\n\n_${reply.footer}_`;
    }
    return result;
  }

  private async sendNativeFlowSingleSelect(
    socket: WASocket,
    remoteJid: string,
    reply: Exclude<WhatsAppReportReply, string>,
  ) {
    const userJid = socket.user?.id;
    if (!userJid) {
      throw new Error(
        'WhatsApp belum terhubung sehingga Native Flow tidak dapat dikirim.',
      );
    }

    const buttonParamsJson = JSON.stringify({
      title: reply.buttonTitle,
      sections: reply.sections,
    });
    const interactiveMessage = proto.Message.InteractiveMessage.create({
      body: proto.Message.InteractiveMessage.Body.create({ text: reply.body }),
      footer: reply.footer
        ? proto.Message.InteractiveMessage.Footer.create({
            text: reply.footer,
          })
        : undefined,
      header: proto.Message.InteractiveMessage.Header.create({
        hasMediaAttachment: false,
      }),
      nativeFlowMessage:
        proto.Message.InteractiveMessage.NativeFlowMessage.create({
          buttons: [
            proto.Message.InteractiveMessage.NativeFlowMessage.NativeFlowButton.create(
              {
                name: 'single_select',
                buttonParamsJson,
              },
            ),
          ],
          messageParamsJson: '{}',
          messageVersion: 1,
        }),
    });
    const outgoing = generateWAMessageFromContent(
      remoteJid,
      { interactiveMessage },
      { userJid },
    );

    if (!outgoing.message || !outgoing.key.id) {
      throw new Error('Gagal membentuk WhatsApp Native Flow list message.');
    }

    const mdCompatibleMessage = proto.Message.create({
      documentWithCaptionMessage: {
        message: outgoing.message,
      },
    });
    const nativeFlowBizNode: BinaryNode = {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'interactive',
          attrs: { type: 'native_flow', v: '1' },
          content: [
            {
              tag: 'native_flow',
              attrs: { v: '9', name: 'mixed' },
            },
          ],
        },
      ],
    };

    await socket.relayMessage(remoteJid, mdCompatibleMessage, {
      messageId: outgoing.key.id,
      additionalNodes: [nativeFlowBizNode],
    });
  }

  private sanitizeOutboundReply(text: string) {
    return text
      .replace(/\bbot\s+WhatsApp\b/gi, 'layanan WhatsApp')
      .replace(/\bbot\s+DENS\s+CAKRA\b/gi, 'layanan DENS CAKRA')
      .replace(/\bbot\b/gi, 'layanan')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }

  private printTerminalQr(qr: string) {
    try {
      qrcodeTerminal.generate(qr, { small: true });
    } catch {}
  }

  private messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
