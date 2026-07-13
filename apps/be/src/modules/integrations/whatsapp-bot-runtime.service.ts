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

type RuntimeState = {
  connecting: boolean;
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

type BotCommandJaring = Prisma.JaringGetPayload<{
  include: {
    areaCoverages: {
      include: { area: true };
    };
    cluster: true;
    caretakerAssignments: {
      include: {
        fieldOfficerAssignment: {
          include: { userProfile: true };
        };
      };
    };
  };
}>;

type ReportSessionStep =
  | 'AWAITING_CODE'
  | 'AWAITING_TITLE'
  | 'AWAITING_CONTENT'
  | 'AWAITING_EVENT_TIME'
  | 'AWAITING_PHOTO'
  | 'AWAITING_LOCATION';

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
  photoMessageId?: string;
  photoCaption?: string;
  photoFileId?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
  ) {}

  async onModuleInit() {
    const channels = await this.prisma.integrationChannel.findMany({
      where: {
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
    const channel = await this.prisma.integrationChannel.findUniqueOrThrow({
      where: { id: channelId },
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
      socket.ev.on('creds.update', saveCreds);
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
    if (!runtime) {
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
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      await this.persistState(
        channel.id,
        {
          connectionStatus: loggedOut
            ? WhatsAppBotConnectionStatus.DISCONNECTED
            : WhatsAppBotConnectionStatus.ERROR,
          qrCodeText: null,
          qrCodeDataUrl: null,
          pairingCode: null,
          sessionJid: loggedOut ? null : undefined,
          lastDisconnectedAt: new Date(),
          lastError: loggedOut
            ? 'WhatsApp session logged out.'
            : `Connection closed with status ${statusCode ?? 'unknown'}.`,
        },
        loggedOut ? IntegrationStatus.INACTIVE : IntegrationStatus.ERROR,
      );

      if (!loggedOut) {
        setTimeout(() => {
          void this.connectChannel(channel, { force: true }).catch(
            (error: unknown) => {
              this.logger.error(
                `Failed to reconnect WhatsApp channel ${channel.code}: ${this.messageOf(error)}`,
              );
            },
          );
        }, 5_000);
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

    if (existing) {
      return;
    }

    const payload = this.toInboundPayload(
      message,
      senderPhone,
      externalMessageId,
    );
    const handled = await this.handleBotInteraction(
      channel,
      socket,
      message,
      payload,
    ).catch((error: unknown) => {
      this.logger.error(
        `Failed to send WhatsApp bot command response for ${remoteJid}: ${this.messageOf(error)}`,
      );
      return false;
    });

    if (handled) {
      await this.prisma.integrationChannel.update({
        where: { id: channel.id },
        data: { lastHealthAt: new Date() },
      });
      return;
    }

    const event = await this.prisma.integrationWebhookEvent.create({
      data: {
        channelId: channel.id,
        externalEventId: externalMessageId,
        eventType: 'WHATSAPP_BAILEYS_MESSAGE',
        payload: payload.rawPayload as Prisma.InputJsonValue,
      },
    });

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

  private extractLocation(message: ReturnType<typeof this.unwrapMessage>) {
    const location = message?.locationMessage || message?.liveLocationMessage;

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
    const stored = await Promise.resolve(
      socket.authState.keys.get('lid-mapping', [reverseKey]),
    ).catch(() => ({}));
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
      return normalizeIndonesianPhoneNumber(value);
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

  private async handleBotCommand(
    channel: WhatsAppChannelRecord,
    socket: WASocket,
    message: WAMessage,
    payload: InboundMessagePayload,
  ) {
    const remoteJid = message.key.remoteJid;
    const text = payload.content?.trim() ?? '';

    if (!remoteJid || text.toLowerCase() !== '/start') {
      return;
    }

    this.logger.log(
      `Received /start from ${payload.senderPhone} on WhatsApp channel`,
    );

    const jaring = await this.prisma.jaring.findFirst({
      where: {
        whatsappNumber: payload.senderPhone,
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: {
        areaCoverages: {
          where: { validUntil: null },
          include: { area: true },
        },
        cluster: true,
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
    const isInChannelScope = jaring
      ? await this.isJaringAllowedForChannel(channel, jaring)
      : false;

    const caretakerName =
      jaring?.caretakerAssignments[0]?.fieldOfficerAssignment.userProfile
        ?.fullName ?? 'Field Officer';
    const jaringLabel = jaring?.aliasName || jaring?.code || 'Jaring';
    const clusterLabel = jaring?.cluster?.name
      ? `\nCluster: ${jaring.cluster.name}`
      : '';

    const replies =
      jaring && isInChannelScope
        ? [
            `Halo, ${jaringLabel}. Akun WhatsApp Anda sudah terhubung ke DENS CAKRA.${clusterLabel}`,
            `Laporan Anda akan diterima dan diteruskan ke ${caretakerName}. Kirim teks, foto, atau lokasi sesuai kebutuhan laporan.`,
          ]
        : jaring
          ? [
              'Halo. Nomor Anda terdaftar sebagai Jaring DENS CAKRA, tetapi tidak berada dalam wilayah bot WhatsApp ini.',
              'Silakan gunakan kanal WhatsApp sesuai wilayah Field Officer Anda atau hubungi Field Officer penanggung jawab.',
            ]
          : [
              'Halo. Bot DENS CAKRA sudah aktif.',
              'Nomor WhatsApp ini belum terdaftar sebagai Jaring aktif. Silakan hubungi Field Officer untuk registrasi terlebih dahulu.',
            ];

    await this.sendHumanLikeReplies(socket, remoteJid, [message.key], replies);
    this.logger.log(`Sent /start response to ${payload.senderPhone}`);
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
          [
            'Pembuatan laporan dibatalkan. Ketik lapor untuk membuat laporan baru.',
          ],
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

    if (text.toLowerCase() === '/start') {
      await this.handleBotCommand(channel, socket, message, payload);
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

    return false;
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
      ? await this.isJaringAllowedForChannel(channel, jaring)
      : false;

    if (!jaring) {
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [
          'Akses Ditolak\n\nNomor WhatsApp Anda belum terdaftar sebagai Jaring aktif.',
          `Nomor WhatsApp Anda: ${payload.senderPhone}\n\nSilakan hubungi Field Officer untuk registrasi terlebih dahulu.`,
        ],
      );
      return;
    }

    if (!isInChannelScope) {
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [
          'Akses Ditolak\n\nNomor Anda terdaftar sebagai Jaring DENS CAKRA, tetapi tidak berada dalam wilayah bot WhatsApp ini.',
          'Silakan gunakan kanal WhatsApp sesuai wilayah Field Officer Anda.',
        ],
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
        [
          'Akses Ditolak\n\nJaring Anda belum memiliki Field Officer penanggung jawab aktif.',
          'Silakan hubungi admin untuk melengkapi penanggung jawab sebelum mengirim laporan.',
        ],
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
      [
        `Halo, ${jaringLabel}.\n\nAnda telah terdaftar sebagai pelapor. Untuk melanjutkan, silakan masukkan PIN/Kode Autentikasi Jaring.`,
      ],
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
          [
            'PIN salah. Silakan coba lagi.',
            'Ketik /cancel atau Batal untuk membatalkan.',
          ],
        );
        return;
      }

      session.step = 'AWAITING_TITLE';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [
          'PIN benar. Autentikasi berhasil.',
          'Silakan ketik judul laporan Anda.',
        ],
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
        [
          'Judul laporan diterima.',
          'Silakan ketik isi laporan Anda secara detail.',
        ],
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
        [
          'Teks laporan diterima.',
          'Kirim tanggal dan jam kejadian dengan format: tanggal/bulan/tahun jam',
          'Contoh: 13/07/2026 21:30',
        ],
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
          [
            'Tanggal dan jam belum terbaca.',
            'Gunakan format: tanggal/bulan/tahun jam. Contoh: 13/07/2026 21:30',
          ],
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
        [
          'Tanggal dan jam kejadian diterima.',
          'Sekarang kirim 1 foto sebagai bukti laporan. Pastikan foto dikirim sebagai foto, bukan file dokumen.',
        ],
      );
      return;
    }

    if (session.step === 'AWAITING_PHOTO') {
      if (!unwrapped?.imageMessage) {
        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          ['Mohon kirim foto bukti terlebih dahulu.'],
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
      session.step = 'AWAITING_LOCATION';
      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [
          'Foto diterima.',
          'Sekarang kirim lokasi/maps kejadian memakai fitur Share Location dari WhatsApp.',
        ],
      );
      return;
    }

    if (session.step === 'AWAITING_LOCATION') {
      const location = this.extractLocation(unwrapped);
      const hasValidLocation =
        location?.latitude !== undefined && location.longitude !== undefined;

      if (!hasValidLocation) {
        if (!text) {
          return;
        }

        await this.sendHumanLikeReplies(
          socket,
          remoteJid,
          [message.key],
          [
            'Lokasi belum terbaca. Mohon kirim fitur Share Location dari WhatsApp, bukan teks alamat.',
          ],
        );
        return;
      }

      await this.saveCompletedReport(channel, payload, session, location);
      this.reportSessions.delete(sessionKey);

      await this.sendHumanLikeReplies(
        socket,
        remoteJid,
        [message.key],
        [
          'Laporan berhasil dikirim.',
          'Teks, foto bukti, dan lokasi/maps telah dicatat di server dan masuk ke kotak masuk Field Officer penanggung jawab.',
        ],
      );
    }
  }

  private isReportIntent(text: string) {
    const command = text.trim().split(/\s+/)[0]?.toLowerCase();
    return (
      command === 'lapor' || command === '/lapor' || command === '/laporan'
    );
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
    location: { latitude?: number; longitude?: number; accuracy?: number },
  ) {
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
          session.eventDateTime ?? new Date(payload.receivedAt),
        coordinateSource: CoordinateSource.WHATSAPP_LOCATION,
        status: WhatsAppMessageStatus.RECEIVED,
        validationSummary: WhatsAppValidationSummary.VALID,
        rawPayload: {
          source: 'WHATSAPP_BOT_REPORT_FLOW',
          senderPhone: session.senderPhone,
          jaringCode: session.jaringCode,
          jaringLabel: session.jaringLabel,
          eventDateTime: session.eventDateTime?.toISOString(),
          eventDateTimeText: session.eventDateTimeText,
          photoMessageId: session.photoMessageId,
          photoCaption: session.photoCaption,
          locationMessageId: payload.externalMessageId,
          gpsSharedAt: new Date(payload.receivedAt).toISOString(),
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
        cluster: true,
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

  private async isJaringAllowedForChannel(
    channel: WhatsAppChannelRecord,
    jaring: BotCommandJaring,
  ) {
    const config = this.readConfig(channel.config);
    const userId = typeof config.userId === 'string' ? config.userId : null;

    if (!userId) {
      return true;
    }

    const channelUser = await this.prisma.userProfile.findUnique({
      where: { id: userId },
      include: {
        positionAssignments: {
          where: { isActive: true, validUntil: null },
          include: {
            areaScopes: {
              where: { validUntil: null },
              select: { areaId: true },
            },
          },
        },
      },
    });

    const channelAreaIds =
      channelUser?.positionAssignments.flatMap((assignment) =>
        assignment.areaScopes.map((scope) => scope.areaId),
      ) ?? [];
    const jaringAreaIds = jaring.areaCoverages.map(
      (coverage) => coverage.areaId,
    );

    if (channelAreaIds.length === 0 || jaringAreaIds.length === 0) {
      return true;
    }

    if (jaringAreaIds.some((areaId) => channelAreaIds.includes(areaId))) {
      return true;
    }

    const ancestorMatch = await this.prisma.administrativeAreaClosure.findFirst(
      {
        where: {
          ancestorId: { in: channelAreaIds },
          descendantId: { in: jaringAreaIds },
        },
        select: { ancestorId: true },
      },
    );

    return Boolean(ancestorMatch);
  }

  private async sendHumanLikeReplies(
    socket: WASocket,
    remoteJid: string,
    messageKeys: WAMessage['key'][],
    replies: string[],
  ) {
    await sleep(700);

    try {
      await socket.readMessages(messageKeys);
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to mark WhatsApp message as read: ${this.messageOf(error)}`,
      );
    }

    for (const [index, text] of replies.entries()) {
      const typingMs = Math.min(4500, Math.max(1200, text.length * 35));
      const betweenMessageDelayMs = index === 0 ? 500 : 1300;

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

  private printTerminalQr(qr: string) {
    try {
      qrcodeTerminal.generate(qr, { small: true });
    } catch {}
  }

  private messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
