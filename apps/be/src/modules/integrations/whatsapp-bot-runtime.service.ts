import { createHash } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Boom } from '@hapi/boom';
import {
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
  jidDecode,
  jidNormalizedUser,
  useMultiFileAuthState,
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
  WhatsAppMessageStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import {
  SecretVaultService,
  type EncryptedValue,
} from '../infrastructure/secret-vault.service.js';
import { LocalStorageService } from '../infrastructure/local-storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { WhatsAppChannelScopeService } from '../whatsapp/whatsapp-channel-scope.service.js';
import { WhatsAppReportFlowService } from './whatsapp-report-flow.service.js';

type RuntimeState = {
  connecting: boolean;
  credsSavePromise: Promise<void>;
  socket?: WASocket;
};

type WhatsAppChannelRecord = {
  id: string;
  code: string;
  channelType: string;
  status: IntegrationStatus;
  config: unknown;
};

type InboundMessagePayload = {
  externalMessageId: string;
  senderPhone: string;
  receivedAt: string;
  title?: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracyMeters?: number;
  rawPayload?: Record<string, unknown>;
};

type ReportSessionStep =
  | 'AWAITING_CODE'
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
  jaringCode: string;
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

const REPORT_REPLIES = {
  cancelled: [
    'Oke, pembuatan laporan dibatalkan. Kalau mau mulai lagi, tinggal ketik lapor.',
    'Siap, laporan ini dibatalkan ya. Ketik lapor kapan saja untuk mulai dari awal.',
    'Tidak masalah, prosesnya sudah dibatalkan. Nanti cukup ketik lapor kalau mau lanjut lagi.',
    'Sudah aku batalkan. Kalau berubah pikiran, kirim saja kata lapor.',
    'Proses laporan dihentikan ya. Kamu bisa mulai lagi dengan mengetik lapor.',
  ],
  outsideChannelScope: [
    'Maaf, nomor kamu tidak berada dalam wilayah layanan WhatsApp ini. Coba gunakan kanal sesuai wilayah Field Officer kamu ya.',
    'Nomor ini tidak berada dalam wilayah layanan kanal tersebut. Silakan hubungi kanal Field Officer di wilayah kamu.',
    'Sepertinya kamu tidak berada dalam wilayah layanan WhatsApp ini. Gunakan kanal yang sesuai wilayah Field Officer ya.',
    'Akses belum bisa dilanjutkan karena nomor kamu tidak berada dalam wilayah layanan ini. Coba kanal wilayah yang sesuai.',
    'Nomor kamu terdaftar, tetapi tidak berada dalam wilayah layanan kanal ini. Silakan gunakan kanal Field Officer setempat.',
  ],
  missingCaretaker: [
    'Akun kamu belum punya Field Officer penanggung jawab aktif. Hubungi admin dulu ya supaya bisa mengirim laporan.',
    'Belum ada Field Officer aktif yang menangani akun kamu. Silakan minta admin melengkapinya dulu.',
    'Laporan belum bisa dimulai karena penanggung jawab Field Officer belum tersedia. Coba hubungi admin ya.',
    'Field Officer penanggung jawab akun ini belum aktif. Mohon konfirmasi ke admin terlebih dahulu.',
    'Akun kamu masih perlu dihubungkan ke Field Officer aktif. Silakan hubungi admin untuk dibantu.',
  ],
  requestPin: [
    'Halo! Boleh kirim PIN kamu dulu biar kita lanjut?',
    'Hai, kirim PIN autentikasinya dulu ya.',
    'Siap bantu. Masukkan PIN kamu dulu, ya.',
    'Sebelum mulai, kirim PIN autentikasi kamu dulu ya.',
    'Yuk verifikasi sebentar. Kirim PIN kamu di sini.',
  ],
  invalidPin: [
    'PIN-nya belum cocok. Coba cek dan kirim lagi ya. Ketik Batal kalau mau berhenti.',
    'Sepertinya PIN itu kurang tepat. Coba kirim ulang, ya. Kalau batal, cukup ketik Batal.',
    'PIN belum sesuai nih. Silakan coba sekali lagi atau ketik Batal untuk berhenti.',
    'Belum berhasil masuk dengan PIN itu. Cek lagi lalu kirim ulang, ya.',
    'PIN-nya masih salah. Coba lagi pelan-pelan, atau ketik Batal kalau tidak jadi.',
  ],
  requestLiveLocation: [
    'PIN benar! Sekarang kirim Live Location WhatsApp kamu ya, bukan lokasi statis.',
    'Sip, PIN cocok. Lanjut bagikan Live Location lewat WhatsApp, ya.',
    'Verifikasi beres. Sekarang aku tunggu Live Location aktif kamu.',
    'PIN aman. Boleh lanjut kirim Live Location WhatsApp sekarang?',
    'Oke, sudah terverifikasi. Kirim Live Location aktif dulu ya supaya bisa lanjut.',
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
    'Kirim Live Location WhatsApp dulu ya supaya laporannya bisa dilanjutkan.',
    'Tahap ini perlu Live Location aktif. Pilih Lampiran, Lokasi, lalu Bagikan lokasi terkini.',
  ],
  requestTitle: [
    'Live Location diterima. Sekarang tulis judul laporannya ya.',
    'Live Location diterima. Lanjut kirim judul singkat untuk laporan ini.',
    'Live Location diterima. Oke, sekarang laporannya mau diberi judul apa?',
    'Live Location diterima. Sip, tinggal ketik judul laporannya dulu.',
    'Live Location diterima. Lokasi aman, sekarang kirim judul laporan ya.',
  ],
  requestContent: [
    'Judulnya sudah masuk. Sekarang ceritakan isi laporannya secara detail ya.',
    'Sip, judul sudah dicatat. Lanjut kirim detail kejadiannya.',
    'Oke, judul beres. Sekarang tulis isi laporan selengkap mungkin ya.',
    'Judul diterima. Boleh lanjut jelaskan detail laporannya sekarang.',
    'Sudah dapat judulnya. Aku tunggu isi laporan lengkapnya ya.',
  ],
  requestEventTime: [
    'Isi laporan sudah masuk. Sekarang kirim waktu kejadian, contoh: 13/07/2026 21:30.',
    'Detailnya sudah dicatat. Kapan kejadiannya? Pakai format seperti 13/07/2026 21:30 ya.',
    'Sip, isi laporan aman. Lanjut kirim tanggal dan jam kejadian dengan format 13/07/2026 21:30.',
    'Laporannya sudah terbaca. Sekarang tulis tanggal dan jam kejadiannya ya, misalnya 13/07/2026 21:30.',
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
    'Kirim foto buktinya dulu supaya laporan bisa diselesaikan.',
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
    'Sip, laporan kamu sudah berhasil dikirim.',
    'Beres! Laporannya sudah masuk dan siap diproses.',
    'Terima kasih, laporannya sudah berhasil terkirim.',
    'Oke, semua data sudah masuk. Laporan berhasil dikirim.',
    'Laporannya sudah terkirim dengan aman. Terima kasih ya.',
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
    private readonly jobs: AsyncJobService,
    private readonly storage: LocalStorageService,
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
          in: [IntegrationStatus.ACTIVE, IntegrationStatus.DEGRADED],
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
      void this.connectChannel(channel).catch((error: unknown) => {
        this.logger.error(
          `Failed to bootstrap WhatsApp channel ${channel.code}: ${this.messageOf(error)}`,
        );
      });
    }
  }

  async onModuleDestroy() {
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

  async requestFreshQr(channelId: string) {
    const channel = await this.getChannel(channelId);
    await this.disconnectChannel(channel.id, true);
    await rm(this.authDirForChannel(channel.code), {
      recursive: true,
      force: true,
    });
    await this.persistState(channel.id, {
      connectionStatus: WhatsAppBotConnectionStatus.DISCONNECTED,
      qrCodeText: null,
      qrCodeDataUrl: null,
      pairingCode: null,
      lastError: null,
    });
    await this.connectChannel(channel, { force: true });
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
    options?: { force?: boolean },
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

    const authDir = this.authDirForChannel(channel.code);
    await mkdir(authDir, { recursive: true });

    const runtime: RuntimeState = {
      connecting: true,
      credsSavePromise: Promise.resolve(),
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
        setTimeout(() => {
          void (async () => {
            await runtime.credsSavePromise;
            if (this.runtimes.get(channel.id) !== runtime) {
              return;
            }

            await this.connectChannel(channel);
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
    const title = text
      ? text.split(/\r?\n/)[0]?.trim().slice(0, 120)
      : location
        ? 'Laporan lokasi WhatsApp'
        : undefined;

    return {
      externalMessageId,
      senderPhone,
      receivedAt: new Date(
        Number(message.messageTimestamp ?? Date.now()) * 1000,
      ).toISOString(),
      title,
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

    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.videoMessage?.caption ||
      message.documentMessage?.caption ||
      ''
    ).trim();
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
      process.cwd(),
      process.env.WHATSAPP_AUTH_ROOT || 'wa_auth',
      channelCode,
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
    await this.prisma.$transaction(async (tx) => {
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
    });
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

    const jaring = await this.findActiveJaring(payload.senderPhone);
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

    const jaringLabel = jaring.aliasName || jaring.code;
    this.reportSessions.set(sessionKey, {
      channelId: channel.id,
      remoteJid,
      senderPhone: payload.senderPhone,
      jaringId: jaring.id,
      jaringCode: jaring.code,
      jaringLabel,
      fieldOfficerAssignmentId: caretakerAssignmentId,
      step: 'AWAITING_CODE',
      startedAt: new Date(),
    });

    await this.sendHumanLikeReplies(
      socket,
      remoteJid,
      [message.key],
      [pickRandomReply(REPORT_REPLIES.requestPin)],
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

    if (session.step === 'AWAITING_CODE') {
      if (!text) {
        return;
      }

      if (text !== session.jaringCode) {
        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [pickRandomReply(REPORT_REPLIES.invalidPin)],
        );
        return;
      }

      session.step = 'AWAITING_LIVE_LOCATION';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [pickRandomReply(REPORT_REPLIES.requestLiveLocation)],
      );
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
        title: session.title,
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
          jaringCode: session.jaringCode,
          jaringLabel: session.jaringLabel,
          eventDateTime: session.eventDateTime?.toISOString(),
          eventDateTimeText: session.eventDateTimeText,
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
      const originalName = `${session.jaringCode}-${session.photoMessageId}.${extension}`;
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

  private findActiveJaring(senderPhone: string) {
    return this.prisma.jaring.findFirst({
      where: {
        whatsappNumber: senderPhone,
        status: 'ACTIVE',
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
    replies: string[],
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
      const text = this.sanitizeOutboundReply(reply);
      const typingMs = Math.min(
        9000,
        Math.max(2500, text.length * 55 + Math.floor(Math.random() * 900)),
      );
      const betweenMessageDelayMs =
        (index === 0 ? 1000 : 1800) + Math.floor(Math.random() * 900);

      await sleep(betweenMessageDelayMs);

      try {
        await socket.sendPresenceUpdate('composing', remoteJid);
      } catch {}

      await sleep(typingMs);

      try {
        await socket.sendPresenceUpdate('paused', remoteJid);
      } catch {}

      await socket.sendMessage(remoteJid, { text });
    }
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
