import { Boom } from '@hapi/boom';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import makeWASocket, {
  Browsers,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  jidDecode,
  jidNormalizedUser,
  proto,
  useMultiFileAuthState,
  type WAMessage,
  type WASocket,
} from '@whiskeysockets/baileys';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import P from 'pino';
import * as QRCode from 'qrcode';
import * as qrcode from 'qrcode-terminal';
import { PrismaService } from '../prisma/prisma.service.js';

type TerminalQrModule = {
  generate?: (qr: string, options?: { small?: boolean }) => void;
};

const printTerminalQr = (qr: string) => {
  const terminalQrModule = (qrcode as TerminalQrModule).generate
    ? (qrcode as TerminalQrModule)
    : ((qrcode as { default?: TerminalQrModule }).default ?? null);

  terminalQrModule?.generate?.call(terminalQrModule, qr, { small: true });
};

type CreateWhatsappUserBody = {
  cluster?: string;
  fieldOfficerId?: number;
  name?: string;
  phoneNumber?: string;
  role?: 'FIELD_OFFICER' | 'JARING';
  whatsappId?: string;
};

type UpdateWhatsappUserBody = {
  cluster?: string;
  fieldOfficerId?: number | null;
  name?: string;
  password?: string;
  phoneNumber?: string;
  username?: string;
  whatsappId?: string;
};

type CreateWhatsappReportBody = {
  category?: string;
  cluster?: string;
  content?: string;
  locationLatitude?: number;
  locationLivePeriod?: number;
  locationLongitude?: number;
  occurredAt?: Date | string;
  photoUrl?: string;
  pushName?: string;
  title?: string;
  whatsappId?: string;
};

type BotStatusValue = 'DISCONNECTED' | 'CONNECTING' | 'QR_READY' | 'CONNECTED';
type UserState =
  | 'WAITING_FOR_PIN'
  | 'AUTHENTICATED'
  | 'WAITING_FOR_REPORT_TITLE'
  | 'WAITING_FOR_REPORT_TEXT'
  | 'WAITING_FOR_REPORT_PHOTO'
  | 'WAITING_FOR_REPORT_CATEGORY'
  | 'WAITING_FOR_REPORT_OCCURRED_AT'
  | 'WAITING_FOR_REPORT_LOCATION';

type PendingReport = {
  category?: string;
  content?: string;
  occurredAt?: Date;
  photoUrl?: string;
  pushName?: string;
  title?: string;
  whatsappId: string;
};

type SenderIdentity = {
  chatJid: string;
  phoneNumber?: string;
  rawJid: string;
};

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly adminIds: string[];
  private readonly pendingReports = new Map<string, PendingReport>();
  private readonly userState = new Map<string, UserState>();
  private botStatus: { qr: string | null; qrDataUrl: string | null; status: BotStatusValue } = {
    status: 'DISCONNECTED',
    qr: null,
    qrDataUrl: null,
  };
  private isConnecting = false;
  private pairingCodeRequested = false;
  private sock?: WASocket;

  constructor(private readonly prisma: PrismaService) {
    this.adminIds = (process.env.ADMIN_WHATSAPP_IDS || '')
      .split(',')
      .map((id) => this.normalizeWhatsappId(id))
      .filter(Boolean);
  }

  onModuleInit() {
    this.startBot();
  }

  getBotStatus() {
    return this.botStatus;
  }

  async requestNewQr() {
    this.logger.log('Requesting fresh WhatsApp QR/session.');

    try {
      await this.sock?.logout();
    } catch {}

    try {
      this.sock?.ws?.close();
    } catch {}

    const authDir = resolve(process.cwd(), process.env.WHATSAPP_AUTH_DIR || 'wa_auth');
    await rm(authDir, { recursive: true, force: true });

    this.sock = undefined;
    this.isConnecting = false;
    this.pairingCodeRequested = false;
    this.botStatus = { status: 'DISCONNECTED', qr: null, qrDataUrl: null };
    this.startBot();

    return { success: true };
  }

  async listUsers(fieldOfficerId?: string) {
    if (fieldOfficerId?.trim()) {
      const ownerId = await this.getFieldOfficerOwnerId(fieldOfficerId);
      if (!ownerId) return [];

      return this.prisma.whatsappAllowedUser.findMany({
        where: {
          role: 'JARING',
          fieldOfficerId: ownerId,
        },
        orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
      });
    }

    return this.prisma.whatsappAllowedUser.findMany({
      orderBy: [{ role: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createUser(body: CreateWhatsappUserBody, fieldOfficerId?: string) {
    const whatsappId = this.normalizeWhatsappId(body.phoneNumber || body.whatsappId || '');
    if (!whatsappId) throw new BadRequestException('Nomor WhatsApp wajib diisi');
    const role = body.role || 'JARING';
    const existing = await this.findUserByWhatsappId(whatsappId);

    if (existing) {
      if (role === 'JARING') {
        const ownerId = await this.resolveJaringOwnerId(
          body.fieldOfficerId,
          fieldOfficerId,
          !existing.fieldOfficerId,
        );
        if (existing.role !== 'JARING') {
          throw new ConflictException('Nomor WhatsApp sudah dipakai oleh Field Officer');
        }
        if (existing.fieldOfficerId === ownerId) {
          throw new ConflictException('Jaring dengan nomor WhatsApp ini sudah terdaftar di Field Officer ini');
        }
        if (existing.fieldOfficerId && existing.fieldOfficerId !== ownerId) {
          throw new ConflictException('Jaring dengan nomor WhatsApp ini sudah terdaftar di Field Officer lain');
        }

        return this.prisma.whatsappAllowedUser.update({
          where: { id: existing.id },
          data: {
            ...(body.cluster !== undefined ? { cluster: body.cluster?.trim() || null } : {}),
            fieldOfficerId: ownerId,
            ...(body.name !== undefined ? { name: body.name || null } : {}),
          },
        });
      }

      throw new ConflictException('Nomor WhatsApp sudah terdaftar');
    }

    const ownerId = role === 'JARING' ? await this.resolveJaringOwnerId(body.fieldOfficerId, fieldOfficerId, true) : null;

    return this.prisma.whatsappAllowedUser.create({
      data: {
        whatsappId,
        name: body.name || null,
        cluster: body.cluster?.trim() || null,
        role,
        authPin: this.createPin(),
        fieldOfficerId: ownerId,
      },
    });
  }

  async updateFieldOfficerCredentials(id: number, body: UpdateWhatsappUserBody) {
    await this.ensureUser(id);

    return this.prisma.whatsappAllowedUser.update({
      where: { id },
      data: {
        fieldOfficerUsername: body.username,
        fieldOfficerPasswordPlain: body.password,
        fieldOfficerPassword: body.password,
      },
    });
  }

  async updateJaring(id: number, body: UpdateWhatsappUserBody, fieldOfficerId?: string) {
    const user = await this.ensureJaringAccess(id, fieldOfficerId);
    if (user.role !== 'JARING') {
      throw new BadRequestException('Data Field Officer tidak bisa diubah lewat endpoint Jaring');
    }
    if (body.fieldOfficerId !== undefined && body.fieldOfficerId !== null) {
      await this.ensureFieldOfficerUser(body.fieldOfficerId);
    }

    const wantsWhatsappIdUpdate = body.phoneNumber !== undefined || body.whatsappId !== undefined;
    const nextWhatsappId = wantsWhatsappIdUpdate
      ? this.normalizeWhatsappId(body.phoneNumber || body.whatsappId || '')
      : '';
    const currentWhatsappId = this.normalizeWhatsappId(user.whatsappId);
    const whatsappIdChanged = wantsWhatsappIdUpdate && nextWhatsappId !== currentWhatsappId;

    if (wantsWhatsappIdUpdate && !nextWhatsappId) {
      throw new BadRequestException('Nomor WhatsApp wajib diisi');
    }

    if (whatsappIdChanged) {
      const existing = await this.findUserByWhatsappId(nextWhatsappId);
      if (existing && existing.id !== id) {
        if (existing.role === 'JARING') {
          throw new ConflictException('Nomor WhatsApp sudah dipakai oleh Jaring lain');
        }
        throw new ConflictException('Nomor WhatsApp sudah dipakai oleh Field Officer');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.whatsappAllowedUser.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name || null } : {}),
          ...(body.cluster !== undefined ? { cluster: body.cluster?.trim() || null } : {}),
          ...(body.fieldOfficerId !== undefined ? { fieldOfficerId: body.fieldOfficerId } : {}),
          ...(whatsappIdChanged ? { whatsappId: nextWhatsappId } : {}),
        },
      });

      if (whatsappIdChanged) {
        await tx.whatsappReport.updateMany({
          where: {
            whatsappId: { in: this.getWhatsappIdVariants(user.whatsappId) },
          },
          data: {
            whatsappId: nextWhatsappId,
          },
        });
      }

      return updated;
    });
  }

  async regeneratePin(id: number, fieldOfficerId?: string) {
    const user = await this.ensureJaringAccess(id, fieldOfficerId);
    if (user.role !== 'JARING') {
      throw new BadRequestException('PIN hanya tersedia untuk Jaring');
    }

    return this.prisma.whatsappAllowedUser.update({
      where: { id },
      data: {
        authPin: this.createPin(),
      },
    });
  }

  async removeUser(id: number, fieldOfficerId?: string) {
    const user = await this.ensureUser(id);
    if (fieldOfficerId?.trim()) {
      await this.ensureJaringAccess(id, fieldOfficerId);
    }
    if (user.role === 'FIELD_OFFICER') {
      const jaringCount = await this.prisma.whatsappAllowedUser.count({ where: { fieldOfficerId: id } });
      if (jaringCount > 0) {
        throw new BadRequestException('Field Officer masih memiliki Jaring. Hapus atau pindahkan Jaring terlebih dahulu.');
      }
    }
    return this.prisma.whatsappAllowedUser.delete({ where: { id } });
  }

  async listReports(fieldOfficerId?: string) {
    const ownedWhatsappIds = await this.getOwnedJaringWhatsappIds(fieldOfficerId);

    return this.prisma.whatsappReport.findMany({
      where: ownedWhatsappIds ? { whatsappId: { in: ownedWhatsappIds } } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReport(body: CreateWhatsappReportBody) {
    const whatsappId = this.normalizeWhatsappId(body.whatsappId || '');
    const latitude = this.optionalNumber(body.locationLatitude);
    const longitude = this.optionalNumber(body.locationLongitude);
    const occurredAt = this.parseReportDate(body.occurredAt);
    const jaring = await this.findUserByWhatsappId(whatsappId);
    const cluster = body.cluster?.trim() || jaring?.cluster?.trim() || null;

    if (!whatsappId) throw new BadRequestException('Nomor WhatsApp wajib diisi');
    if (!body.title?.trim()) throw new BadRequestException('Judul laporan wajib diisi');
    if (!body.content?.trim()) throw new BadRequestException('Isi laporan wajib diisi');
    if (!body.photoUrl?.trim()) throw new BadRequestException('Foto bukti wajib diisi');
    if (!body.category?.trim()) throw new BadRequestException('Kategori laporan wajib diisi');
    if (!occurredAt) throw new BadRequestException('Tanggal kejadian wajib diisi');
    if (latitude === undefined || longitude === undefined) throw new BadRequestException('Koordinat lokasi wajib diisi');

    return this.prisma.whatsappReport.create({
      data: {
        whatsappId,
        pushName: body.pushName || null,
        title: body.title.trim(),
        content: body.content.trim(),
        photoUrl: body.photoUrl,
        cluster,
        category: body.category.trim(),
        locationLatitude: latitude,
        locationLongitude: longitude,
        locationLivePeriod: this.optionalNumber(body.locationLivePeriod),
        occurredAt,
        status: 'PENDING',
        informationStatus: 'PENDING',
      },
    });
  }

  async updateReportStatus(id: number, status: 'PENDING' | 'VERIFIED' | 'INVALID', fieldOfficerId?: string) {
    await this.ensureReportAccess(id, fieldOfficerId);
    const normalizedStatus = status.toUpperCase();

    return this.prisma.whatsappReport.update({
      where: { id },
      data: {
        status: normalizedStatus,
        informationStatus: normalizedStatus,
        closedAt: normalizedStatus === 'INVALID' ? new Date() : null,
        baketId: normalizedStatus === 'VERIFIED' ? `BAK-${id}` : null,
      },
    });
  }

  async removeReport(id: number, fieldOfficerId?: string) {
    await this.ensureReportAccess(id, fieldOfficerId);
    return this.prisma.whatsappReport.delete({ where: { id } });
  }

  async broadcastTask(fieldOfficerId: string, payload: { taskId: string; title: string; instruction: string }) {
    if (!this.sock) throw new BadRequestException('WhatsApp bot belum terhubung');

    const ownerId = await this.findFieldOfficerOwnerId(fieldOfficerId);
    if (!ownerId) throw new NotFoundException('Field Officer tidak ditemukan');

    const jaringUsers = await this.prisma.whatsappAllowedUser.findMany({
      where: {
        role: 'JARING',
        fieldOfficerId: ownerId,
      },
    });

    if (jaringUsers.length === 0) {
      return { success: true, broadcastCount: 0 };
    }

    let successCount = 0;
    
    const message = `*[TUGAS BARU]*\n\n` +
      `*ID Tugas:* ${payload.taskId}\n` +
      `*Target:* ${payload.title}\n\n` +
      `*Instruksi:*\n${payload.instruction}\n\n` +
      `_Harap laksanakan tugas ini dengan baik dan kirimkan laporan Anda._`;

    for (const jaring of jaringUsers) {
      if (!jaring.whatsappId) continue;
      const targetJid = jaring.whatsappId + '@s.whatsapp.net';
      try {
        await this.sock.presenceSubscribe(targetJid);
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.sock.sendPresenceUpdate('composing', targetJid);
        
        const delayMs = Math.min(Math.max(message.length * 30, 1000), 5000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        
        await this.sock.sendPresenceUpdate('paused', targetJid);
        await this.sock.sendMessage(targetJid, { text: message });
        successCount++;
      } catch (err: unknown) {
        this.logger.error(`Failed to broadcast to ${jaring.whatsappId}: ${this.getErrorMessage(err)}`);
      }
    }

    return { success: true, broadcastCount: successCount };
  }

  async getReportStats(fieldOfficerId?: string) {
    const ownedWhatsappIds = await this.getOwnedJaringWhatsappIds(fieldOfficerId);
    const reportWhere = ownedWhatsappIds ? { whatsappId: { in: ownedWhatsappIds } } : undefined;

    const [totalReports, totalUsers, todayReports] = await Promise.all([
      this.prisma.whatsappReport.count({ where: reportWhere }),
      this.prisma.whatsappAllowedUser.count({
        where: ownedWhatsappIds
          ? {
              role: 'JARING',
              whatsappId: { in: ownedWhatsappIds },
            }
          : undefined,
      }),
      this.prisma.whatsappReport.count({
        where: {
          ...(reportWhere || {}),
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return { totalReports, totalUsers, todayReports };
  }

  private startBot() {
    if (process.env.WHATSAPP_ENABLED === 'false') {
      this.logger.warn('WhatsApp bot disabled by WHATSAPP_ENABLED=false');
      return;
    }

    this.connectBot().catch((error: unknown) => {
      this.logger.error(`WhatsApp init failed: ${this.getErrorMessage(error)}`);
    });
  }

  private async connectBot() {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const authDir = resolve(process.cwd(), process.env.WHATSAPP_AUTH_DIR || 'wa_auth');
      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();
      const pairingMethod = process.env.WHATSAPP_PAIRING_METHOD === 'code' ? 'code' : 'qr';
      const phoneNumber = this.normalizeWhatsappId(process.env.WHATSAPP_BOT_PHONE_NUMBER || '');

      this.sock = makeWASocket({
        auth: state,
        browser: Browsers.ubuntu('DENS CAKRA WA Center'),
        connectTimeoutMs: 60_000,
        logger: P({ level: 'silent' }),
        markOnlineOnConnect: false,
        printQRInTerminal: false,
        shouldIgnoreJid: (jid) => jid.endsWith('@g.us') || jid === 'status@broadcast',
        version,
      });

      this.sock.ev.on('creds.update', saveCreds);
      this.sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
        if (connection === 'connecting') {
          this.botStatus = { status: 'CONNECTING', qr: null, qrDataUrl: null };
          this.logger.log('WhatsApp connecting...');
        }

        if (qr && pairingMethod === 'qr') {
          try {
            printTerminalQr(qr);
          } catch (error: unknown) {
            this.logger.warn(`Failed to print WhatsApp QR in terminal: ${this.getErrorMessage(error)}`);
          }
          let qrDataUrl: string | null = null;
          try {
            qrDataUrl = await QRCode.toDataURL(qr);
          } catch (error: unknown) {
            this.logger.warn(`Failed to create WhatsApp QR data URL: ${this.getErrorMessage(error)}`);
          }
          this.botStatus = { status: 'QR_READY', qr, qrDataUrl };
        }

        if (
          pairingMethod === 'code' &&
          !state.creds.registered &&
          !this.pairingCodeRequested &&
          (connection === 'connecting' || qr)
        ) {
          this.pairingCodeRequested = true;
          if (!phoneNumber) {
            this.logger.error('WHATSAPP_BOT_PHONE_NUMBER belum diisi.');
            return;
          }

          try {
            const code = await this.sock!.requestPairingCode(phoneNumber);
            this.logger.warn(`WHATSAPP PAIRING CODE: ${code.match(/.{1,4}/g)?.join('-') || code}`);
          } catch (error: unknown) {
            this.pairingCodeRequested = false;
            this.logger.error(`Failed request pairing code: ${this.getErrorMessage(error)}`);
          }
        }

        if (connection === 'open') {
          this.isConnecting = false;
          this.pairingCodeRequested = false;
          this.botStatus = { status: 'CONNECTED', qr: null, qrDataUrl: null };
          this.logger.log('WhatsApp bot connected.');
          void this.preloadRegisteredPhoneMappings();
        }

        if (connection === 'close') {
          this.isConnecting = false;
          this.botStatus = { status: 'DISCONNECTED', qr: null, qrDataUrl: null };

          const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.logger.warn(`WhatsApp connection closed. status=${statusCode}, reconnect=${shouldReconnect}`);

          if (shouldReconnect) {
            setTimeout(() => {
              this.connectBot().catch((error: unknown) => {
                this.logger.error(`Reconnect failed: ${this.getErrorMessage(error)}`);
              });
            }, 5000);
          } else {
            this.logger.error(`WhatsApp logged out. Hapus folder ${authDir}, lalu pairing ulang.`);
          }
        }
      });

      this.sock.ev.on('messages.upsert', ({ messages }) => {
        for (const message of messages) {
          void this.handleIncomingMessage(message).catch((error: unknown) => {
            this.logger.error(`Failed to handle WhatsApp message: ${this.getErrorMessage(error)}`);
          });
        }
      });
    } catch (error: unknown) {
      this.isConnecting = false;
      this.botStatus = { status: 'DISCONNECTED', qr: null, qrDataUrl: null };
      throw error;
    }
  }

  private async handleIncomingMessage(message: WAMessage) {
    const remoteJid = message.key.remoteJid;
    if (!remoteJid || message.key.fromMe) return;
    if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') return;

    if (this.sock) {
      try {
        await this.sock.readMessages([message.key]);
      } catch (err: unknown) {
        this.logger.debug(`Failed to send read receipt: ${this.getErrorMessage(err)}`);
      }
    }

    const content = this.unwrapMessage(message.message);
    const text = this.getText(content).trim();
    const sender = await this.resolveSenderIdentity(message);
    const whatsappId = sender?.phoneNumber;
    const pushName = message.pushName ?? undefined;

    if (!sender) return;

    if (!whatsappId) {
      if (text.startsWith('/start')) await this.replyUnresolvedPhoneNumber(sender.chatJid);
      return;
    }

    if (text.startsWith('/start')) return this.handleStart(sender.chatJid, whatsappId, pushName);
    if (this.isReportCommand(text)) return this.handleReportCommand(sender.chatJid, whatsappId);
    if (text.startsWith('/adduser')) return this.handleAddUser(sender.chatJid, whatsappId, text);
    if (text.startsWith('/listusers')) return this.handleListUsers(sender.chatJid, whatsappId);
    if (text.startsWith('/cancel') || text.toLowerCase() === 'batal') return this.handleCancel(sender.chatJid);

    if (content?.imageMessage) return this.handlePhoto(sender.chatJid, whatsappId, message);
    if (content?.locationMessage) {
      return this.handleLocation(sender.chatJid, whatsappId, pushName, content.locationMessage);
    }

    if (text) return this.handleText(sender.chatJid, whatsappId, pushName, text);
  }

  private async handleStart(jid: string, whatsappId: string, pushName?: string) {
    const user = await this.findUserByWhatsappId(whatsappId);
    const isSuperAdmin = this.adminIds.includes(whatsappId);
    const isFieldOfficer = isSuperAdmin || user?.role === 'FIELD_OFFICER';

    this.pendingReports.delete(jid);

    if (isFieldOfficer) {
      this.userState.set(jid, 'AUTHENTICATED');
      await this.reply(
        jid,
        `Halo Field Officer ${pushName || user?.name || ''}.\n\n` +
          `Perintah:\n` +
          `- /adduser <nomorWa> <nama>\n` +
          `- /listusers`,
      );
      return;
    }

    if (!user || user.role !== 'JARING') {
      await this.reply(
        jid,
        `Akses Ditolak\n\nNomor WhatsApp Anda belum terdaftar sebagai Jaring.\nNomor Anda: ${whatsappId}`,
      );
      return;
    }

    this.userState.set(jid, 'WAITING_FOR_PIN');
    await this.reply(
      jid,
      `Halo, ${pushName || user.name || 'Jaring'}.\n\nSilakan balas dengan PIN Autentikasi 6 digit.`,
    );
  }

  private async handleText(jid: string, whatsappId: string, pushName: string | undefined, text: string) {
    const state = this.userState.get(jid);
    if (!state) return;

    if (state === 'WAITING_FOR_PIN') {
      const user = await this.findUserByWhatsappId(whatsappId);

      if (user?.role === 'JARING' && user.authPin === text.trim()) {
        this.userState.set(jid, 'AUTHENTICATED');
        if (!user.isVerified) {
          await this.prisma.whatsappAllowedUser.update({
            where: { id: user.id },
            data: { isVerified: true, name: user.name || pushName || null },
          });
        }
        await this.reply(jid, 'PIN benar. Autentikasi berhasil.\n\nKetik /lapor untuk mengirim laporan.');
      } else {
        await this.reply(jid, 'PIN salah. Silakan coba lagi.');
      }
      return;
    }

    if (state === 'AUTHENTICATED') {
      await this.reply(jid, 'Ketik /lapor untuk membuat laporan baru.');
      return;
    }

    if (state === 'WAITING_FOR_REPORT_TITLE') {
      if (!text.trim()) {
        await this.reply(jid, 'Judul laporan wajib diisi. Silakan ketik judul laporan.');
        return;
      }

      this.pendingReports.set(jid, {
        whatsappId,
        pushName,
        title: text.trim(),
      });
      this.userState.set(jid, 'WAITING_FOR_REPORT_TEXT');
      await this.reply(jid, 'Judul diterima.\n\nSekarang ketik isi laporan secara detail.');
      return;
    }

    if (state === 'WAITING_FOR_REPORT_TEXT') {
      if (!text.trim()) {
        await this.reply(jid, 'Isi laporan wajib diisi. Silakan ketik isi laporan.');
        return;
      }

      const pending = this.pendingReports.get(jid);
      if (!pending?.title) {
        this.userState.set(jid, 'WAITING_FOR_REPORT_TITLE');
        await this.reply(jid, 'Sesi laporan tidak lengkap. Silakan ketik judul laporan.');
        return;
      }

      this.pendingReports.set(jid, {
        ...pending,
        content: text.trim(),
      });
      this.userState.set(jid, 'WAITING_FOR_REPORT_PHOTO');
      await this.reply(jid, 'Isi laporan diterima.\n\nSekarang kirim 1 foto sebagai bukti laporan.');
      return;
    }

    if (state === 'WAITING_FOR_REPORT_PHOTO') {
      await this.reply(jid, 'Foto bukti wajib dikirim. Kirim foto, atau ketik /cancel untuk membatalkan.');
      return;
    }

    if (state === 'WAITING_FOR_REPORT_CATEGORY') {
      if (!text.trim()) {
        await this.reply(jid, 'Kategori laporan wajib diisi oleh Jaring. Silakan ketik kategori laporan.');
        return;
      }

      const pending = this.pendingReports.get(jid);
      if (!pending?.title || !pending.content || !pending.photoUrl) {
        this.userState.set(jid, 'WAITING_FOR_REPORT_TITLE');
        await this.reply(jid, 'Sesi laporan tidak lengkap. Silakan mulai ulang dari judul laporan.');
        return;
      }

      this.pendingReports.set(jid, { ...pending, category: text.trim() });
      this.userState.set(jid, 'WAITING_FOR_REPORT_OCCURRED_AT');
      await this.reply(jid, 'Kategori dari Jaring diterima.\n\nSekarang ketik tanggal kejadian.\nContoh: 11/07/2026 14:30 atau 2026-07-11 14:30');
      return;
    }

    if (state === 'WAITING_FOR_REPORT_OCCURRED_AT') {
      const occurredAt = this.parseReportDate(text.trim());
      if (!occurredAt) {
        await this.reply(jid, 'Tanggal kejadian tidak valid. Gunakan contoh: 11/07/2026 14:30 atau 2026-07-11 14:30');
        return;
      }

      const pending = this.pendingReports.get(jid);
      if (!pending?.category) {
        this.userState.set(jid, 'WAITING_FOR_REPORT_CATEGORY');
        await this.reply(jid, 'Sesi laporan tidak lengkap. Silakan ketik kategori laporan.');
        return;
      }

      this.pendingReports.set(jid, { ...pending, occurredAt });
      this.userState.set(jid, 'WAITING_FOR_REPORT_LOCATION');
      await this.reply(jid, 'Tanggal kejadian diterima.\n\nSekarang kirim koordinat/GPS kejadian dari WhatsApp.');
      return;
    }

    if (state === 'WAITING_FOR_REPORT_LOCATION') {
      await this.reply(jid, 'Lokasi wajib dikirim. Kirim lokasi/maps dari WhatsApp, atau ketik /cancel.');
    }
  }

  private async handleReportCommand(jid: string, whatsappId: string) {
    const user = await this.findUserByWhatsappId(whatsappId);
    if (!user || user.role !== 'JARING') {
      await this.reply(jid, 'Hanya Jaring terdaftar yang dapat mengirim laporan.');
      return;
    }

    const state = this.userState.get(jid);
    if (state === 'WAITING_FOR_PIN') {
      await this.reply(jid, 'Silakan masukkan PIN Autentikasi 6 digit terlebih dahulu.');
      return;
    }
    if (state?.startsWith('WAITING_FOR_REPORT')) {
      await this.reply(jid, 'Sesi laporan sedang berjalan. Ikuti instruksi terakhir, atau ketik /cancel.');
      return;
    }
    if (state !== 'AUTHENTICATED') {
      await this.reply(jid, 'Ketik /start lalu masukkan PIN terlebih dahulu.');
      return;
    }

    this.pendingReports.set(jid, { whatsappId });
    this.userState.set(jid, 'WAITING_FOR_REPORT_TITLE');
    await this.reply(jid, 'Silakan ketik judul laporan.');
  }

  private async handlePhoto(jid: string, whatsappId: string, message: WAMessage) {
    const state = this.userState.get(jid);
    if (state !== 'WAITING_FOR_REPORT_PHOTO') {
      if (state?.startsWith('WAITING_FOR_REPORT')) {
        await this.reply(jid, 'Foto belum dibutuhkan di tahap ini. Ikuti instruksi terakhir.');
      }
      return;
    }

    const pending = this.pendingReports.get(jid);
    if (!pending?.title || !pending.content) {
      this.userState.set(jid, 'WAITING_FOR_REPORT_TITLE');
      await this.reply(jid, 'Sesi laporan tidak lengkap. Mulai ulang dari judul laporan.');
      return;
    }

    const photoUrl = await this.saveWhatsappPhoto(message, whatsappId);
    this.pendingReports.set(jid, { ...pending, photoUrl });
    this.userState.set(jid, 'WAITING_FOR_REPORT_CATEGORY');
    await this.reply(jid, 'Foto bukti diterima.\n\nSekarang ketik kategori laporan. Contoh: Aktivitas Mencurigakan, Kerumunan, Logistik, Infrastruktur.');
  }

  private async handleLocation(
    jid: string,
    whatsappId: string,
    pushName: string | undefined,
    location: proto.Message.ILocationMessage,
  ) {
    const state = this.userState.get(jid);
    if (state !== 'WAITING_FOR_REPORT_LOCATION') {
      if (state?.startsWith('WAITING_FOR_REPORT')) {
        await this.reply(jid, 'Lokasi belum dibutuhkan di tahap ini. Ikuti instruksi terakhir.');
      }
      return;
    }

    const pending = this.pendingReports.get(jid);
    if (!pending?.title || !pending.content || !pending.photoUrl || !pending.category || !pending.occurredAt) {
      this.userState.set(jid, 'WAITING_FOR_REPORT_TITLE');
      this.pendingReports.delete(jid);
      await this.reply(jid, 'Sesi laporan tidak lengkap. Ketik /lapor untuk mulai ulang.');
      return;
    }

    const latitude = Number(location.degreesLatitude);
    const longitude = Number(location.degreesLongitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      await this.reply(jid, 'Lokasi tidak valid. Silakan kirim ulang lokasi/maps.');
      return;
    }

    await this.createReport({
      whatsappId: pending.whatsappId || whatsappId,
      pushName: pending.pushName || pushName,
      title: pending.title,
      content: pending.content,
      photoUrl: pending.photoUrl,
      category: pending.category,
      occurredAt: pending.occurredAt,
      locationLatitude: latitude,
      locationLongitude: longitude,
      locationLivePeriod: this.optionalNumber(
        (location as proto.Message.ILocationMessage & { liveLocationShareDuration?: number }).liveLocationShareDuration,
      ),
    });

    this.pendingReports.delete(jid);
    this.userState.set(jid, 'AUTHENTICATED');
    await this.reply(
      jid,
      `Laporan berhasil dikirim dan masuk ke BAKET dengan status PENDING.\n\n` +
        `Judul, isi laporan, foto bukti, kategori, tanggal kejadian, lokasi, dan timestamp sudah dicatat.`,
    );
  }

  private async handleAddUser(jid: string, fieldOfficerWhatsappId: string, text: string) {
    if (!(await this.isFieldOfficer(fieldOfficerWhatsappId))) {
      await this.reply(jid, 'Anda tidak memiliki izin untuk menggunakan perintah ini.');
      return;
    }

    const args = text.split(' ').slice(1);
    if (args.length < 2) {
      await this.reply(
        jid,
        'Format: /adduser <nomorWa> | <klaster> | <nama>\nContoh: /adduser 6281234567890 | Mahasiswa | Andre',
      );
      return;
    }

    const payload = text.slice(text.indexOf(' ') + 1);
    const [rawWhatsappId, rawCluster, ...rawNameParts] = payload.split('|').map((part) => part.trim());
    const whatsappId = this.normalizeWhatsappId(rawWhatsappId || args[0]);
    const cluster = rawNameParts.length > 0 ? rawCluster : undefined;
    const name = rawNameParts.length > 0 ? rawNameParts.join(' | ') : args.slice(1).join(' ');
    const fieldOfficer = await this.findUserByWhatsappId(fieldOfficerWhatsappId);

    try {
      const newUser = await this.createUser({
        whatsappId,
        cluster,
        name,
        role: 'JARING',
        fieldOfficerId: fieldOfficer?.role === 'FIELD_OFFICER' ? fieldOfficer.id : undefined,
      });

      await this.reply(
        jid,
        `Jaring WhatsApp berhasil ditambahkan.\n\n` +
          `Nomor: ${newUser.whatsappId}\nNama: ${newUser.name || '-'}\nKlaster: ${newUser.cluster || '-'}\nPIN: ${newUser.authPin}`,
      );
    } catch (error: unknown) {
      await this.reply(jid, this.getErrorMessage(error));
    }
  }

  private async handleListUsers(jid: string, fieldOfficerWhatsappId: string) {
    if (!(await this.isFieldOfficer(fieldOfficerWhatsappId))) {
      await this.reply(jid, 'Anda tidak memiliki izin untuk menggunakan perintah ini.');
      return;
    }

    const fieldOfficer = await this.findUserByWhatsappId(fieldOfficerWhatsappId);
    const users = await this.prisma.whatsappAllowedUser.findMany({
      where: {
        role: 'JARING',
        ...(fieldOfficer?.role === 'FIELD_OFFICER' ? { fieldOfficerId: fieldOfficer.id } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (users.length === 0) {
      await this.reply(jid, 'Belum ada Jaring WhatsApp di bawah Field Officer ini.');
      return;
    }

    const list = users
      .map(
        (user, index) =>
          `${index + 1}. ${user.whatsappId} - ${user.name || 'Tanpa nama'} - ${user.cluster || 'Tanpa klaster'} (${user.isVerified ? 'Verified' : 'Pending'})`,
      )
      .join('\n');
    await this.reply(jid, `Daftar Jaring WhatsApp (${users.length}):\n\n${list}`);
  }

  private async handleCancel(jid: string) {
    if (!this.userState.has(jid)) {
      await this.reply(jid, 'Tidak ada aksi yang sedang berjalan.');
      return;
    }

    this.pendingReports.delete(jid);
    this.userState.set(jid, 'AUTHENTICATED');
    await this.reply(jid, 'Sesi dibatalkan. Ketik /lapor untuk membuat laporan baru.');
  }

  private isReportCommand(text: string) {
    const command = text.trim().split(/\s+/)[0]?.toLowerCase();
    return command === '/lapor' || command === '/laporan';
  }

  private async isFieldOfficer(whatsappId: string) {
    const user = await this.findUserByWhatsappId(whatsappId);
    return this.adminIds.includes(whatsappId) || user?.role === 'FIELD_OFFICER';
  }

  private async reply(jid: string, text: string) {
    if (!this.sock) return;
    try {
      await this.sock.presenceSubscribe(jid);
      await new Promise((resolve) => setTimeout(resolve, 500));
      await this.sock.sendPresenceUpdate('composing', jid);
      
      const textLen = text.length;
      const delayMs = Math.min(Math.max(textLen * 30, 1000), 5000); 
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      
      await this.sock.sendPresenceUpdate('paused', jid);
      await this.sock.sendMessage(jid, { text });
    } catch (err) {
      this.logger.error(`Failed to send reply to ${jid}: ${this.getErrorMessage(err)}`);
    }
  }

  private unwrapMessage(message?: proto.IMessage | null): proto.IMessage | undefined {
    if (!message) return undefined;
    return (
      message.ephemeralMessage?.message ||
      message.viewOnceMessage?.message ||
      message.viewOnceMessageV2?.message ||
      message
    );
  }

  private getText(message?: proto.IMessage) {
    if (!message) return '';
    return (
      message.conversation ||
      message.extendedTextMessage?.text ||
      message.imageMessage?.caption ||
      message.buttonsResponseMessage?.selectedButtonId ||
      message.templateButtonReplyMessage?.selectedId ||
      ''
    );
  }

  private async resolveSenderIdentity(message: WAMessage): Promise<SenderIdentity | undefined> {
    const chatJid = message.key.remoteJid;
    if (!chatJid) return undefined;

    const candidates = [message.key.participant, chatJid].filter((jid): jid is string => !!jid);
    for (const jid of candidates) {
      const phoneNumber = await this.resolvePhoneNumberFromJid(jid);
      if (phoneNumber) return { chatJid, phoneNumber, rawJid: jid };
    }

    await this.preloadRegisteredPhoneMappings();

    for (const jid of candidates) {
      const phoneNumber = await this.resolvePhoneNumberFromJid(jid);
      if (phoneNumber) return { chatJid, phoneNumber, rawJid: jid };
    }

    this.logger.warn(`Tidak bisa resolve nomor WhatsApp dari JID ${chatJid}.`);
    return { chatJid, rawJid: chatJid };
  }

  private async resolvePhoneNumberFromJid(jid: string) {
    const normalizedJid = jidNormalizedUser(jid);
    const decoded = jidDecode(normalizedJid);
    if (!decoded) return undefined;

    if (decoded.server === 's.whatsapp.net' || decoded.server === 'c.us' || decoded.server === 'hosted') {
      return this.normalizeWhatsappId(decoded.user);
    }
    if (decoded.server !== 'lid' && decoded.server !== 'hosted.lid') return undefined;

    try {
      const phoneJid = await this.sock?.signalRepository.lidMapping.getPNForLID(normalizedJid);
      const phoneDecoded = jidDecode(phoneJid || undefined);
      if (phoneDecoded?.server === 's.whatsapp.net' || phoneDecoded?.server === 'c.us') {
        return this.normalizeWhatsappId(phoneDecoded.user);
      }
    } catch (error: unknown) {
      this.logger.warn(`Gagal resolve LID ke nomor WhatsApp: ${this.getErrorMessage(error)}`);
    }

    return undefined;
  }

  private async preloadRegisteredPhoneMappings() {
    if (!this.sock) return;

    try {
      const users = await this.prisma.whatsappAllowedUser.findMany({
        select: { whatsappId: true },
      });
      const phoneJids = users
        .map((user) => this.normalizeWhatsappId(user.whatsappId))
        .filter(Boolean)
        .map((phoneNumber) => `${phoneNumber}@s.whatsapp.net`);

      if (phoneJids.length > 0) {
        await this.sock.signalRepository.lidMapping.getLIDsForPNs(phoneJids);
      }
    } catch (error: unknown) {
      this.logger.warn(`Gagal preload mapping nomor WhatsApp: ${this.getErrorMessage(error)}`);
    }
  }

  private async replyUnresolvedPhoneNumber(jid: string) {
    await this.reply(
      jid,
      `Akses Ditolak\n\nBot belum bisa membaca nomor WhatsApp Anda dari sesi Baileys. Coba kirim /start lagi setelah bot connected.`,
    );
  }

  private async saveWhatsappPhoto(message: WAMessage, whatsappId: string) {
    if (!this.sock) throw new Error('WhatsApp socket is not connected');

    const buffer = await downloadMediaMessage(
      message,
      'buffer',
      {},
      {
        logger: P({ level: 'silent' }),
        reuploadRequest: this.sock.updateMediaMessage,
      },
    );

    const filename = `${Date.now()}-${whatsappId}.jpg`;
    const uploadDir = join(process.cwd(), 'uploads', 'whatsapp-reports');
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, filename), buffer);

    return `/uploads/whatsapp-reports/${filename}`;
  }

  private async ensureUser(id: number) {
    const user = await this.prisma.whatsappAllowedUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User WhatsApp tidak ditemukan');
    return user;
  }

  private async ensureReport(id: number) {
    const report = await this.prisma.whatsappReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Laporan WhatsApp tidak ditemukan');
    return report;
  }

  private async ensureReportAccess(id: number, fieldOfficerId?: string) {
    const report = await this.ensureReport(id);
    const ownedWhatsappIds = await this.getOwnedJaringWhatsappIds(fieldOfficerId);
    if (ownedWhatsappIds && !ownedWhatsappIds.includes(report.whatsappId)) {
      throw new NotFoundException('Laporan WhatsApp tidak ditemukan untuk Field Officer ini');
    }

    return report;
  }

  private async ensureJaringAccess(id: number, fieldOfficerId?: string) {
    const user = await this.ensureUser(id);
    const normalizedFieldOfficerId = fieldOfficerId?.trim();
    if (!normalizedFieldOfficerId) return user;

    const ownerId = await this.findFieldOfficerOwnerId(normalizedFieldOfficerId);
    if (!ownerId || user.role !== 'JARING' || user.fieldOfficerId !== ownerId) {
      throw new NotFoundException('Jaring tidak ditemukan untuk Field Officer ini');
    }

    return user;
  }

  private createPin() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private async resolveJaringOwnerId(ownerId?: number | null, fieldOfficerId?: string, createIfMissing = true) {
    if (fieldOfficerId?.trim()) {
      return createIfMissing
        ? this.getFieldOfficerOwnerId(fieldOfficerId)
        : this.findFieldOfficerOwnerId(fieldOfficerId);
    }
    if (ownerId) {
      await this.ensureFieldOfficerUser(ownerId);
      return ownerId;
    }

    throw new BadRequestException('Field Officer pembuat Jaring wajib tersedia');
  }

  private async ensureFieldOfficerUser(id: number) {
    const user = await this.prisma.whatsappAllowedUser.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Field Officer tidak ditemukan');
    if (user.role !== 'FIELD_OFFICER') throw new BadRequestException('Owner Jaring harus berupa Field Officer');
    return user;
  }

  private async getOwnedJaringWhatsappIds(fieldOfficerId?: string) {
    const normalizedFieldOfficerId = fieldOfficerId?.trim();
    if (!normalizedFieldOfficerId) return null;

    const ownerId = await this.findFieldOfficerOwnerId(normalizedFieldOfficerId);
    if (!ownerId) return [];

    const jaring = await this.prisma.whatsappAllowedUser.findMany({
      where: {
        role: 'JARING',
        fieldOfficerId: ownerId,
      },
      select: {
        whatsappId: true,
      },
    });

    return jaring.flatMap((item) => this.getWhatsappIdVariants(item.whatsappId));
  }

  private async findUserByWhatsappId(value: string) {
    const variants = this.getWhatsappIdVariants(value);
    if (!variants.length) return null;

    return this.prisma.whatsappAllowedUser.findFirst({
      where: {
        whatsappId: { in: variants },
      },
    });
  }

  private async findFieldOfficerOwnerId(fieldOfficerId?: string) {
    const normalizedFieldOfficerId = this.normalizeFieldOfficerScopeId(fieldOfficerId);
    if (!normalizedFieldOfficerId) return null;

    const whatsappId = `field-officer:${normalizedFieldOfficerId}`;
    const existingFieldOfficer = await this.prisma.whatsappAllowedUser.findFirst({
      where: {
        role: 'FIELD_OFFICER',
        OR: [{ whatsappId }, { fieldOfficerUsername: normalizedFieldOfficerId }],
      },
    });

    return existingFieldOfficer?.id ?? null;
  }

  private async getFieldOfficerOwnerId(fieldOfficerId?: string) {
    const normalizedFieldOfficerId = this.normalizeFieldOfficerScopeId(fieldOfficerId);
    if (!normalizedFieldOfficerId) return null;

    const existingFieldOfficerId = await this.findFieldOfficerOwnerId(normalizedFieldOfficerId);
    if (existingFieldOfficerId) return existingFieldOfficerId;

    const createdFieldOfficer = await this.prisma.whatsappAllowedUser.create({
      data: {
        whatsappId: `field-officer:${normalizedFieldOfficerId}`,
        name: this.formatFieldOfficerName(normalizedFieldOfficerId),
        role: 'FIELD_OFFICER',
        authPin: this.createPin(),
        fieldOfficerUsername: normalizedFieldOfficerId,
      },
    });

    return createdFieldOfficer.id;
  }

  private formatFieldOfficerName(fieldOfficerId: string) {
    return fieldOfficerId
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private normalizeFieldOfficerScopeId(fieldOfficerId?: string) {
    const normalized = fieldOfficerId?.trim().toLowerCase();
    if (!normalized) return '';

    const aliases: Record<string, string> = {
      'field-officer': 'fo-bangkinang-001',
      'field-officer-bangkinang': 'fo-bangkinang-001',
      'fo-bangkinang': 'fo-bangkinang-001',
      'fo-bangkinang-001': 'fo-bangkinang-001',
      'field-officer-pekanbaru': 'fo-pekanbaru-001',
      'fo-pekanbaru': 'fo-pekanbaru-001',
      'fo-pekanbaru-001': 'fo-pekanbaru-001',
      'field-officer-dumai': 'fo-bangkinang-001',
      'fo-dumai': 'fo-bangkinang-001',
      'fo-dumai-001': 'fo-bangkinang-001',
      'field-officer-bengkalis': 'fo-pekanbaru-001',
      'fo-bengkalis': 'fo-pekanbaru-001',
      'fo-bengkalis-001': 'fo-pekanbaru-001',
      'field-officer-bandung': 'fo-pekanbaru-001',
      'fo-bandung': 'fo-pekanbaru-001',
      'fo-bandung-002': 'fo-pekanbaru-001',
      'field-officer-pelalawan': 'fo-bangkinang-001',
      'fo-pelalawan': 'fo-bangkinang-001',
      'fo-pelalawan-001': 'fo-bangkinang-001',
      'field-officer-siak': 'fo-pekanbaru-001',
      'fo-siak': 'fo-pekanbaru-001',
      'fo-siak-001': 'fo-pekanbaru-001',
    };

    return aliases[normalized] || normalized;
  }

  private normalizeWhatsappId(value: string) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0')) return `62${digits.slice(1)}`;
    if (digits.startsWith('8')) return `62${digits}`;
    if (digits.startsWith('620')) return `62${digits.slice(3)}`;
    return digits;
  }

  private getWhatsappIdVariants(value: string) {
    const digits = value.replace(/\D/g, '');
    const normalized = this.normalizeWhatsappId(value);
    const variants = new Set<string>();

    if (normalized) variants.add(normalized);
    if (digits) variants.add(digits);
    if (normalized.startsWith('62')) variants.add(`0${normalized.slice(2)}`);

    return [...variants];
  }

  private parseReportDate(value: unknown) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
    if (typeof value !== 'string') return undefined;

    const raw = value.trim();
    if (!raw) return undefined;

    const dmyMatch = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?$/);
    if (dmyMatch) {
      const [, day, month, year, hour = '0', minute = '0'] = dmyMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    const ymdMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2})[:.](\d{2}))?$/);
    if (ymdMatch) {
      const [, year, month, day, hour = '0', minute = '0'] = ymdMatch;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
      return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  private optionalNumber(value?: number | null) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private getErrorMessage(error: unknown) {
    if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
      const response = error.getResponse();
      if (typeof response === 'object' && response && 'message' in response) {
        const message = (response as { message?: string | string[] }).message;
        return Array.isArray(message) ? message.join(', ') : message || error.message;
      }
    }
    return error instanceof Error ? error.message : String(error);
  }
}
