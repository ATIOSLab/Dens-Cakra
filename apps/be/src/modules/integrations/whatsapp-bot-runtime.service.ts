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
  IntegrationStatus,
  Prisma,
  WhatsAppBotConnectionStatus,
} from '../../generated/prisma/client.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import {
  SecretVaultService,
  type EncryptedValue,
} from '../infrastructure/secret-vault.service.js';
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

@Injectable()
export class WhatsappBotRuntimeService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(WhatsappBotRuntimeService.name);
  private readonly runtimes = new Map<string, RuntimeState>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
    private readonly jobs: AsyncJobService,
  ) {}

  async onModuleInit() {
    const channels = await this.prisma.integrationChannel.findMany({
      where: {
        channelType: {
          contains: 'WA',
          mode: 'insensitive',
        },
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
        await runtime.socket?.logout();
      } catch {}

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
      const pairingMethod =
        config.pairingMethod === 'code' ? 'code' : 'qr';
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
          update as {
            connection?: string;
            lastDisconnect?: { error?: unknown } | null;
            qr?: string;
          },
          pairingMethod,
          botPhoneNumber,
        );
      });
      socket.ev.on('messages.upsert', ({ messages }) => {
        for (const message of messages) {
          void this.captureIncomingMessage(channel, message).catch(
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
            connectionStatus:
              WhatsAppBotConnectionStatus.PAIRING_CODE_READY,
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
    message: WAMessage,
  ) {
    if (message.key.fromMe) {
      return;
    }

    const remoteJid = message.key.remoteJid;
    if (!remoteJid || remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') {
      return;
    }

    const senderPhone = this.resolveSenderPhone(remoteJid);
    if (!senderPhone) {
      return;
    }

    const externalMessageId =
      message.key.id ??
      `${remoteJid}:${String(message.messageTimestamp ?? Date.now())}`;

    const payload = this.toInboundPayload(message, senderPhone, externalMessageId);
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
      content: text || (location ? 'Lokasi diterima dari sesi WhatsApp.' : undefined),
      latitude: location?.latitude,
      longitude: location?.longitude,
      gpsAccuracyMeters: location?.accuracy,
      rawPayload: {
        senderJid: message.key.remoteJid ?? null,
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
    const location =
      message?.locationMessage ||
      message?.liveLocationMessage;

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

  private resolveSenderPhone(jid: string) {
    const normalizedJid = jidNormalizedUser(jid);
    const decoded = jidDecode(normalizedJid);

    if (!decoded?.user) {
      return null;
    }

    try {
      return normalizeIndonesianPhoneNumber(decoded.user);
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
      return this.vault.decrypt<Record<string, unknown>>(config as EncryptedValue);
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
            patch.connectionStatus ??
            WhatsAppBotConnectionStatus.DISCONNECTED,
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

  private async disconnectChannel(channelId: string, logout: boolean) {
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

  private printTerminalQr(qr: string) {
    try {
      qrcodeTerminal.generate(qr, { small: true });
    } catch {}
  }

  private messageOf(error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }
}
