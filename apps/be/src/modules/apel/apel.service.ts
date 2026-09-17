import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  WhatsappBotRuntimeService,
  type WhatsAppInboundInterceptorContext,
} from '../integrations/whatsapp-bot-runtime.service.js';
import { ApelBlasterService } from './apel-blaster.service.js';
import {
  CreateApelConfigDto,
  UpdateApelConfigDto,
  TriggerApelBlastDto,
  ApelSessionQueryDto,
  ApelMapDataQueryDto,
} from './apel.dto.js';
import {
  ApelSessionStatus,
  ApelAttendanceStatus,
  CoordinateSource,
  AdministrativeLevel,
  Prisma,
} from '../../generated/prisma/client.js';

const DEFAULT_APEL_TEMPLATE = `{Selamat pagi|Salam hormat|Selamat bertugas}, Rekan {{nama_jaring}}.

Mohon konfirmasi kehadiran untuk *Apel Pagi {{wilayah}}* pada hari {{tanggal}}.
Batas waktu absensi: *{{deadline}}*.

⚠️ *KETENTUAN ABSENSI:*
Untuk mencatat kehadiran, Anda WAJIB membalas dengan mengetik *HADIR* dan mengirimkan *Titik Koordinat Lokasi Terkini* melalui menu lampiran WhatsApp (Share Location).
*(Catatan: Kehadiran tidak akan tercatat tanpa pengiriman titik lokasi).*

Terima kasih atas dedikasi dan kesiapsiagaan Anda.`;

export const DEFAULT_ATTENDANCE_REPLY_TEMPLATE = `*Call Center Merah Putih membalas:*

_"Terima kasih Bapak/Ibu. Respon kehadiran sudah kami perbarui. Selamat bertugas kembali dan salam untuk keluarga"_`;

@Injectable()
export class ApelService implements OnModuleInit {
  private readonly logger = new Logger(ApelService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappBotRuntime: WhatsappBotRuntimeService,
    private readonly blaster: ApelBlasterService,
  ) {}

  onModuleInit() {
    // Register inbound message interceptor to capture attendance replies from Jaring
    this.whatsappBotRuntime.registerInboundInterceptor((ctx) =>
      this.handleInboundAttendance(ctx),
    );
    this.logger.log('Registered Apel attendance inbound interceptor with WhatsAppBotRuntimeService');
  }

  formatAttendanceReply(
    template: string | null | undefined,
    context: { jaringName: string; timeStr: string },
  ): string {
    let t = template?.trim() || DEFAULT_ATTENDANCE_REPLY_TEMPLATE;
    t = t.replace(/\{\{\s*nama_jaring\s*\}\}/gi, context.jaringName);
    t = t.replace(/\{\{\s*nama\s*\}\}/gi, context.jaringName);
    t = t.replace(/\{\{\s*waktu\s*\}\}/gi, `${context.timeStr} WIB`);
    t = t.replace(/\{\{\s*jam\s*\}\}/gi, `${context.timeStr} WIB`);
    return t;
  }

  /**
   * Intercepts incoming messages to see if it's an attendance reply from a verified Jaring
   */
  async handleInboundAttendance(
    ctx: WhatsAppInboundInterceptorContext,
  ): Promise<boolean> {
    const rawPhone = ctx.senderPhone?.replace(/\D+/g, '');
    if (!rawPhone) return false;

    const now = new Date();

    // Look for active attendance record awaiting reply from this phone number
    const activeAttendance = await this.prisma.apelAttendance.findFirst({
      where: {
        phoneNumber: { contains: rawPhone.slice(-9) },
        attendanceStatus: ApelAttendanceStatus.PENDING,
        session: {
          status: { in: [ApelSessionStatus.ACTIVE, ApelSessionStatus.BLASTING] },
          deadlineAt: { gte: now },
        },
      },
      include: {
        session: true,
        jaring: {
          select: {
            id: true,
            aliasName: true,
            fullName: true,
            areaCoverages: {
              where: { validUntil: null },
              select: {
                area: {
                  select: {
                    name: true,
                    centroidLatitude: true,
                    centroidLongitude: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeAttendance) {
      return false; // Not an active attendance reply, let next handlers or report flow process it
    }

    // Determine content and location from inbound message
    const replyContent = (ctx.payload.content || '').trim();
    const hasCoordinates =
      Number.isFinite(ctx.payload.latitude) && Number.isFinite(ctx.payload.longitude);

    const jaringName =
      activeAttendance.jaring.fullName ||
      activeAttendance.jaring.aliasName ||
      'Rekan Jaring';

    const timeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const deadlineStr = activeAttendance.session.deadlineAt.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    });

    const isLocationRequired = activeAttendance.session.requireLocation ?? true;

    // 1. EVALUASI INTENT PELAPORAN INTELIJEN (1945)
    // Jika pesan diawali atau mengandung kode laporan 1945 (misal: 1945, *1945*, #1945, 1945 ada info...),
    // jangan tangani sebagai apel! Kembalikan false agar diproses oleh pipeline pelaporan intelijen.
    const isReportTrigger = /(?:^|\s)[*#_~]*1945/i.test(replyContent);
    if (isReportTrigger) {
      this.logger.log(
        `[Apel Inbound] Terdeteksi kode pelaporan '1945' dari ${rawPhone}. Mengalihkan ke alur pelaporan intelijen.`,
      );
      return false;
    }

    // Cek apakah jaring saat ini sedang aktif dalam proses penyusunan draf pelaporan intelijen
    const activeReportDraft = await this.prisma.whatsAppReportSession.findFirst({
      where: {
        activeSenderKey: {
          in: [
            rawPhone,
            `+${rawPhone}`,
            rawPhone.startsWith('62') ? `0${rawPhone.slice(2)}` : `62${rawPhone.slice(1)}`,
          ],
        },
      },
    });

    // 2. EVALUASI INTENT ABSENSI APEL ('HADIR' dalam berbagai kombinasi huruf besar/kecil)
    const cleanForHadir = replyContent
      .toLowerCase()
      .replace(/[*_~`]/g, '')
      .trim();
    const isHadirIntent =
      /\bhadir\b/i.test(cleanForHadir) || /\bkehadiran\b/i.test(cleanForHadir);

    // Jika jaring sedang dalam alur draf pelaporan dan pesan BUKAN kata hadir:
    // Pesan tersebut (teks informasi, bukti media, atau live location untuk laporan) milik laporan intelijen
    if (activeReportDraft && !isHadirIntent) {
      this.logger.log(
        `[Apel Inbound] Jaring ${rawPhone} memiliki draf laporan aktif. Pesan bukan kata 'hadir', dialihkan ke alur pelaporan.`,
      );
      return false;
    }

    if (activeReportDraft && isHadirIntent) {
      // Jika draf laporan sebelumnya masih kosong (misal akibat salah trigger sebelumnya),
      // hapus draf kosong tersebut agar jaring tidak tertahan di sesi pelaporan.
      const hasContentOrMedia = await this.prisma.whatsAppReportHistory.findFirst({
        where: {
          reportSessionId: activeReportDraft.id,
          action: {
            in: ['TEXT_CAPTURED', 'MEDIA_CAPTURED', 'LIVE_LOCATION_CAPTURED'],
          },
        },
      });
      if (!hasContentOrMedia) {
        await this.prisma.whatsAppReportHistory
          .deleteMany({
            where: { reportSessionId: activeReportDraft.id },
          })
          .catch(() => undefined);
        await this.prisma.whatsAppReportSession
          .delete({
            where: { id: activeReportDraft.id },
          })
          .catch(() => undefined);
      }
    }

    // Jika pesan BUKAN kata hadir dan BUKAN pengiriman koordinat lokasi:
    // Pesan teks obrolan bebas (seperti "Selamat malam", "Halo", dsb.) tidak boleh memicu absensi apel
    if (!isHadirIntent && !hasCoordinates) {
      return false;
    }

    // JIKA ADA TITIK KOORDINAT LOKASI DARI WHATSAPP:
    if (hasCoordinates) {
      const latitude = ctx.payload.latitude as number;
      const longitude = ctx.payload.longitude as number;
      const finalReply =
        replyContent ||
        (activeAttendance.replyContent && !activeAttendance.replyContent.includes('belum mengirim')
          ? `${activeAttendance.replyContent} + Lokasi Terkini`
          : 'HADIR (Koordinat Lokasi Terverifikasi)');

      // Catat kehadiran resmi sebagai PRESENT
      await this.prisma.apelAttendance.update({
        where: { id: activeAttendance.id },
        data: {
          attendanceStatus: ApelAttendanceStatus.PRESENT,
          attendedAt: now,
          replyContent: finalReply,
          latitude: new Prisma.Decimal(latitude),
          longitude: new Prisma.Decimal(longitude),
          coordinateSource: CoordinateSource.WHATSAPP_LOCATION,
        },
      });

      // Increment session totalAttended
      await this.prisma.apelSession.update({
        where: { id: activeAttendance.sessionId },
        data: { totalAttended: { increment: 1 } },
      });

      // Kirim pesan konfirmasi sukses ke Jaring
      const ackMessage = this.formatAttendanceReply(
        activeAttendance.session.attendanceReplyTemplate,
        { jaringName, timeStr },
      );

      await ctx.reply(ackMessage);

      this.logger.log(
        `[Apel Inbound] Recorded VERIFIED GPS attendance for ${jaringName} with GPS [${latitude}, ${longitude}] in session ${activeAttendance.sessionId}`,
      );

      return true; // Successfully handled
    }

    // JIKA TIDAK ADA TITIK KOORDINAT LOKASI:
    if (isLocationRequired) {
      // KONDISI 1: Lokasi DIWAJIBKAN
      // Simpan balasan teks jika ada untuk histori, namun status kehadiran TETAP PENDING dan koordinat TETAP NULL
      await this.prisma.apelAttendance.update({
        where: { id: activeAttendance.id },
        data: {
          replyContent: replyContent || 'HADIR (Menunggu Lokasi GPS)',
          latitude: null,
          longitude: null,
          coordinateSource: null,
        },
      });

      // Balas jaring bahwa absensi belum lengkap dan wajib mengirim lokasi terkini
      const promptLocMessage = `*Call Center Merah Putih membalas:*\n\n_"Terima kasih Bapak/Ibu. Konfirmasi kehadiran Anda belum lengkap karena wajib menyertakan titik lokasi terkini (Share Location). Silakan bagikan lokasi sebelum pukul ${deadlineStr} WIB agar kehadiran dapat tercatat."_`;

      await ctx.reply(promptLocMessage);

      this.logger.warn(
        `[Apel Inbound] Jaring ${jaringName} mengirim konfirmasi 'HADIR' tanpa koordinat GPS (Lokasi WAJIB). Status kehadiran tetap PENDING.`,
      );

      return true; // Ditangani oleh sistem apel
    } else {
      // KONDISI 2: Lokasi TIDAK DIWAJIBKAN (Hanya Balasan Teks)
      const finalReply = replyContent || 'HADIR';

      // Catat kehadiran resmi sebagai PRESENT
      await this.prisma.apelAttendance.update({
        where: { id: activeAttendance.id },
        data: {
          attendanceStatus: ApelAttendanceStatus.PRESENT,
          attendedAt: now,
          replyContent: finalReply,
          latitude: null,
          longitude: null,
          coordinateSource: null,
        },
      });

      // Increment session totalAttended
      await this.prisma.apelSession.update({
        where: { id: activeAttendance.sessionId },
        data: { totalAttended: { increment: 1 } },
      });

      // Kirim pesan konfirmasi sukses ke Jaring (tanpa meminta lokasi)
      const ackMessage = this.formatAttendanceReply(
        activeAttendance.session.attendanceReplyTemplate,
        { jaringName, timeStr },
      );

      await ctx.reply(ackMessage);

      this.logger.log(
        `[Apel Inbound] Recorded TEXT attendance for ${jaringName} (Location optional) in session ${activeAttendance.sessionId}`,
      );

      return true;
    }
  }

  // ==========================================
  // BROADCAST TARGETING
  // ==========================================

  async getBroadcastTargets() {
    // 1. Wilayah Aktif
    const areas = await this.prisma.administrativeArea.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, level: true },
      orderBy: { name: 'asc' },
    });

    // 2. Petugas Wilayah (Gaswil - FIELD_OFFICER)
    const gaswilAssignments = await this.prisma.userOperationalAssignment.findMany({
      where: {
        isActive: true,
        role: { code: 'FIELD_OFFICER' },
        userProfile: { isActive: true, deletedAt: null },
      },
      include: {
        userProfile: {
          select: {
            id: true,
            fullName: true,
            phone: true,
          },
        },
        areaScopes: {
          where: { validUntil: null },
          include: {
            area: {
              select: { id: true, name: true },
            },
          },
          take: 1,
        },
        jaringCaretakerAssignments: {
          where: {
            isActive: true,
            validUntil: null,
            jaring: {
              deletedAt: null,
              status: 'ACTIVE',
              registrationStatus: 'APPROVED',
            },
          },
          select: {
            jaringId: true,
          },
        },
      },
      orderBy: { userProfile: { fullName: 'asc' } },
    });

    const gaswils = gaswilAssignments.map((ga) => ({
      id: ga.id,
      name: ga.userProfile?.fullName || 'Petugas Wilayah',
      phoneNumber: ga.userProfile?.phone || null,
      areaName: ga.areaScopes[0]?.area?.name || 'Seluruh Wilayah',
      totalJarings: ga.jaringCaretakerAssignments.length,
      jaringIds: ga.jaringCaretakerAssignments.map((c) => c.jaringId),
    }));

    // 3. Jaring Terverifikasi Aktif
    const jarings = await this.prisma.jaring.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        registrationStatus: 'APPROVED',
      },
      include: {
        areaCoverages: {
          where: { validUntil: null },
          include: {
            area: {
              select: { id: true, name: true, level: true },
            },
          },
          take: 1,
        },
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          include: {
            fieldOfficerAssignment: {
              include: {
                userProfile: {
                  select: { fullName: true },
                },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ aliasName: 'asc' }, { fullName: 'asc' }],
    });

    const formattedJarings = jarings.map((j) => ({
      id: j.id,
      name: j.fullName || j.aliasName || 'Jaring',
      fullName: j.fullName,
      aliasName: j.aliasName,
      jobTitle: j.jobTitle || 'Personel Jaring',
      whatsappNumber: j.whatsappNumber,
      areaId: j.areaCoverages[0]?.area?.id || null,
      areaName: j.areaCoverages[0]?.area?.name || 'Pusat / Tanpa Wilayah',
      caretakerAssignmentId:
        j.caretakerAssignments[0]?.fieldOfficerAssignment?.id || null,
      caretakerName:
        j.caretakerAssignments[0]?.fieldOfficerAssignment?.userProfile
          ?.fullName || 'Belum Ditugaskan',
    }));

    return {
      areas,
      gaswils,
      jarings: formattedJarings,
    };
  }

  // ==========================================
  // CONFIG MANAGEMENT (SUPERADMIN)
  // ==========================================

  async listConfigs() {
    return this.prisma.apelConfig.findMany({
      include: {
        area: {
          select: { id: true, code: true, name: true, level: true },
        },
        selectedChannel: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
            config: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfig(id: string) {
    return this.prisma.apelConfig.findUniqueOrThrow({
      where: { id },
      include: {
        area: true,
        selectedChannel: true,
      },
    });
  }

  async createConfig(dto: CreateApelConfigDto) {
    return this.prisma.apelConfig.create({
      data: {
        title: dto.title,
        description: dto.description,
        targetType: dto.targetType || 'AREA',
        targetGaswilIds: dto.targetGaswilIds || Prisma.JsonNull,
        targetJaringIds: dto.targetJaringIds || Prisma.JsonNull,
        areaId: dto.areaId || null,
        channelSelectionMode: dto.channelSelectionMode,
        selectedChannelId: dto.selectedChannelId || null,
        selectedChannelIds: dto.selectedChannelIds || Prisma.JsonNull,
        messageTemplate: dto.messageTemplate || DEFAULT_APEL_TEMPLATE,
        attendanceReplyTemplate:
          dto.attendanceReplyTemplate || DEFAULT_ATTENDANCE_REPLY_TEMPLATE,
        scheduleTime: dto.scheduleTime || '07:00',
        deadlineTime: dto.deadlineTime || '08:30',
        deadlineMinutes: dto.deadlineMinutes ?? 90,
        requireLocation: dto.requireLocation ?? true,
        isActive: dto.isActive ?? true,
        minDelaySeconds: dto.minDelaySeconds ?? 8,
        maxDelaySeconds: dto.maxDelaySeconds ?? 20,
        batchSize: dto.batchSize ?? 5,
        batchPauseSeconds: dto.batchPauseSeconds ?? 30,
      },
      include: {
        area: true,
        selectedChannel: true,
      },
    });
  }

  async updateConfig(id: string, dto: UpdateApelConfigDto) {
    return this.prisma.apelConfig.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.targetType !== undefined && { targetType: dto.targetType }),
        ...(dto.targetGaswilIds !== undefined && {
          targetGaswilIds: dto.targetGaswilIds || Prisma.JsonNull,
        }),
        ...(dto.targetJaringIds !== undefined && {
          targetJaringIds: dto.targetJaringIds || Prisma.JsonNull,
        }),
        ...(dto.areaId !== undefined && { areaId: dto.areaId }),
        ...(dto.channelSelectionMode !== undefined && {
          channelSelectionMode: dto.channelSelectionMode,
        }),
        ...(dto.selectedChannelId !== undefined && {
          selectedChannelId: dto.selectedChannelId,
        }),
        ...(dto.selectedChannelIds !== undefined && {
          selectedChannelIds: dto.selectedChannelIds || Prisma.JsonNull,
        }),
        ...(dto.messageTemplate !== undefined && {
          messageTemplate: dto.messageTemplate,
        }),
        ...(dto.attendanceReplyTemplate !== undefined && {
          attendanceReplyTemplate: dto.attendanceReplyTemplate,
        }),
        ...(dto.scheduleTime !== undefined && {
          scheduleTime: dto.scheduleTime,
        }),
        ...(dto.deadlineTime !== undefined && {
          deadlineTime: dto.deadlineTime,
        }),
        ...(dto.deadlineMinutes !== undefined && {
          deadlineMinutes: dto.deadlineMinutes,
        }),
        ...(dto.requireLocation !== undefined && {
          requireLocation: dto.requireLocation,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.minDelaySeconds !== undefined && {
          minDelaySeconds: dto.minDelaySeconds,
        }),
        ...(dto.maxDelaySeconds !== undefined && {
          maxDelaySeconds: dto.maxDelaySeconds,
        }),
        ...(dto.batchSize !== undefined && { batchSize: dto.batchSize }),
        ...(dto.batchPauseSeconds !== undefined && {
          batchPauseSeconds: dto.batchPauseSeconds,
        }),
      },
      include: {
        area: true,
        selectedChannel: true,
      },
    });
  }

  async deleteConfig(id: string) {
    return this.prisma.apelConfig.delete({
      where: { id },
    });
  }

  // ==========================================
  // SESSION & BLASTING EXECUTION
  // ==========================================

  async triggerBlast(dto: TriggerApelBlastDto, userId?: string) {
    let config = dto.configId
      ? await this.prisma.apelConfig.findUnique({ where: { id: dto.configId } })
      : null;

    const targetType = dto.targetType || config?.targetType || 'AREA';
    const targetGaswilIds = dto.targetGaswilIds ?? config?.targetGaswilIds ?? Prisma.JsonNull;
    const targetJaringIds = dto.targetJaringIds ?? config?.targetJaringIds ?? Prisma.JsonNull;
    const areaId = dto.areaId || config?.areaId || null;
    const template =
      dto.messageTemplate || config?.messageTemplate || DEFAULT_APEL_TEMPLATE;

    const now = new Date();
    const sessionDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    // Calculate deadline
    let deadlineAt: Date;
    if (dto.deadlineTime && dto.deadlineTime.includes(':')) {
      const [h, m] = dto.deadlineTime.split(':').map(Number);
      deadlineAt = new Date(now);
      deadlineAt.setHours(h, m, 0, 0);
      if (deadlineAt.getTime() <= now.getTime()) {
        deadlineAt = new Date(now.getTime() + (dto.deadlineMinutes ?? 90) * 60_000);
      }
    } else {
      deadlineAt = new Date(now.getTime() + (dto.deadlineMinutes ?? 90) * 60_000);
    }

    const title =
      dto.title ||
      config?.title ||
      `Apel Jaring - ${now.toLocaleDateString('id-ID', { dateStyle: 'full' })}`;

    const requireLocation =
      dto.requireLocation ?? config?.requireLocation ?? true;

    // Create ApelSession
    const session = await this.prisma.apelSession.create({
      data: {
        configId: config?.id || null,
        title,
        sessionDate,
        targetType,
        targetGaswilIds,
        targetJaringIds,
        areaId,
        requireLocation,
        status: ApelSessionStatus.DRAFT,
        messageTemplateUsed: template,
        attendanceReplyTemplate:
          dto.attendanceReplyTemplate ||
          config?.attendanceReplyTemplate ||
          DEFAULT_ATTENDANCE_REPLY_TEMPLATE,
        deadlineAt,
        createdByUserId: userId || null,
      },
    });

    // Start blasting in background
    void this.blaster.executeBlasting(session.id);

    return session;
  }

  async listSessions(query: ApelSessionQueryDto) {
    const limit = query.limit ?? 20;
    const page = query.page ?? 1;
    const skip = (page - 1) * limit;

    const where: Prisma.ApelSessionWhereInput = {};
    if (query.areaId) where.areaId = query.areaId;
    if (query.status) where.status = query.status;
    if (query.date) {
      const parsedDate = new Date(query.date);
      where.sessionDate = parsedDate;
    }

    const [items, total] = await Promise.all([
      this.prisma.apelSession.findMany({
        where,
        take: limit,
        skip,
        orderBy: { createdAt: 'desc' },
        include: {
          area: { select: { id: true, name: true, code: true } },
          config: { select: { id: true, title: true } },
        },
      }),
      this.prisma.apelSession.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSession(id: string) {
    return this.prisma.apelSession.findUniqueOrThrow({
      where: { id },
      include: {
        area: true,
        config: true,
        attendances: {
          include: {
            jaring: {
              select: {
                id: true,
                aliasName: true,
                fullName: true,
                whatsappNumber: true,
                caretakerAssignments: {
                  where: { isActive: true, validUntil: null },
                  select: {
                    fieldOfficerAssignment: {
                      select: {
                        userProfile: { select: { fullName: true } },
                      },
                    },
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: { attendedAt: 'desc' },
        },
      },
    });
  }

  // ==========================================
  // DEPUTI MAP DATA ENDPOINT
  // ==========================================

  async getMapData(query?: ApelMapDataQueryDto) {
    const sessionId = query?.sessionId;
    const filterDate = query?.date;
    const filterAreaId = query?.areaId;

    let sessionWhere: Prisma.ApelSessionWhereInput = {};

    if (sessionId) {
      sessionWhere = { id: sessionId };
    } else if (filterDate) {
      const targetDate = new Date(filterDate);
      const startOfDay = new Date(
        Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0),
      );
      const endOfDay = new Date(
        Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999),
      );
      sessionWhere = {
        sessionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
      if (filterAreaId) {
        sessionWhere.areaId = filterAreaId;
      }
    } else if (filterAreaId) {
      sessionWhere = {
        areaId: filterAreaId,
        status: {
          in: [
            ApelSessionStatus.ACTIVE,
            ApelSessionStatus.BLASTING,
            ApelSessionStatus.COMPLETED,
          ],
        },
      };
    } else {
      sessionWhere = {
        status: {
          in: [
            ApelSessionStatus.ACTIVE,
            ApelSessionStatus.BLASTING,
            ApelSessionStatus.COMPLETED,
          ],
        },
      };
    }

    // Ambil daftar tanggal sesi apel untuk dropdown filter tanggal di UI
    const availableSessions = await this.prisma.apelSession.findMany({
      select: {
        id: true,
        title: true,
        sessionDate: true,
        areaId: true,
        status: true,
        area: { select: { id: true, name: true } },
      },
      orderBy: { sessionDate: 'desc' },
      take: 30,
    });

    // Ambil daftar wilayah terbatas pada level Provinsi, Kota, dan Kabupaten untuk optimasi kecepatan (<552 row vs 91.600 kelurahan)
    const availableAreas = await this.prisma.administrativeArea.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        level: {
          in: [
            AdministrativeLevel.PROVINCE,
            AdministrativeLevel.CITY,
            AdministrativeLevel.REGENCY,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        code: true,
        level: true,
        parentId: true,
      },
      orderBy: [{ code: 'asc' }],
    });

    // Total seluruh jaring terverifikasi aktif di sistem (sebagai pembanding)
    const totalVerifiedJarings = await this.prisma.jaring.count({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        registrationStatus: 'APPROVED',
      },
    });

    const session = await this.prisma.apelSession.findFirst({
      where: sessionWhere,
      orderBy: { createdAt: 'desc' },
      include: { area: true, config: true },
    });

    if (!session) {
      return {
        session: null,
        kpi: {
          totalTarget: 0,
          totalHadir: 0,
          totalBelum: 0,
          persentaseHadir: 0,
          isDeadlinePassed: true,
          remainingMinutes: 0,
          nearDeadlineCount: 0,
          totalSent: 0,
          totalFailed: 0,
          totalPendingDelivery: 0,
          deliveryPercentage: 0,
          totalVerifiedJarings,
        },
        attendances: [],
        availableSessions,
        availableAreas,
      };
    }

    // Filter attendance per area secara hierarkis menggunakan AdministrativeAreaClosure
    const attendanceWhere: Prisma.ApelAttendanceWhereInput = {
      sessionId: session.id,
    };

    if (filterAreaId && (!session.areaId || session.areaId !== filterAreaId)) {
      const closures = await this.prisma.administrativeAreaClosure.findMany({
        where: { ancestorId: filterAreaId },
        select: { descendantId: true },
      });
      const targetAreaIds =
        closures.length > 0 ? closures.map((c) => c.descendantId) : [filterAreaId];

      attendanceWhere.jaring = {
        areaCoverages: {
          some: {
            areaId: { in: targetAreaIds },
            validUntil: null,
          },
        },
      };
    }

    const attendances = await this.prisma.apelAttendance.findMany({
      where: attendanceWhere,
      include: {
        jaring: {
          select: {
            id: true,
            aliasName: true,
            fullName: true,
            whatsappNumber: true,
            jobTitle: true,
            areaCoverages: {
              where: { validUntil: null },
              select: {
                area: {
                  select: { id: true, name: true, level: true },
                },
              },
              take: 1,
            },
            caretakerAssignments: {
              where: { isActive: true, validUntil: null },
              select: {
                fieldOfficerAssignment: {
                  select: {
                    id: true,
                    userProfile: { select: { fullName: true } },
                  },
                },
              },
              take: 1,
            },
          },
        },
      },
      orderBy: [{ attendanceStatus: 'asc' }, { attendedAt: 'desc' }],
    });

    const now = new Date();
    const isDeadlinePassed = now.getTime() > session.deadlineAt.getTime();
    const remainingMs = Math.max(0, session.deadlineAt.getTime() - now.getTime());
    const remainingMinutes = Math.floor(remainingMs / 60_000);

    const totalTarget = attendances.length;
    const totalHadir = attendances.filter(
      (a) => a.attendanceStatus === ApelAttendanceStatus.PRESENT,
    ).length;
    const totalBelum = totalTarget - totalHadir;
    const persentaseHadir =
      totalTarget > 0 ? Math.round((totalHadir / totalTarget) * 100) : 0;

    // Delivery metrics (progres pengiriman blast ke WhatsApp)
    const totalSent = attendances.filter((a) => a.sentStatus === 'SENT').length;
    const totalFailed = attendances.filter((a) => a.sentStatus === 'FAILED').length;
    const totalPendingDelivery = attendances.filter((a) => a.sentStatus === 'PENDING').length;
    const deliveryPercentage =
      totalTarget > 0 ? Math.round((totalSent / totalTarget) * 100) : 0;

    let nearDeadlineCount = 0;

    const mappedAttendances = attendances.map((a) => {
      const caretaker =
        a.jaring.caretakerAssignments[0]?.fieldOfficerAssignment?.userProfile
          ?.fullName || 'Belum ditugaskan';
      const caretakerId =
        a.jaring.caretakerAssignments[0]?.fieldOfficerAssignment?.id || null;
      const coverageArea = a.jaring.areaCoverages[0]?.area?.name || session.area?.name || 'Pusat';
      const areaId = a.jaring.areaCoverages[0]?.area?.id || session.areaId || null;

      // 1. Waktu Masuk & Waktu Balas
      const sentAt = a.sentAt ? a.sentAt.toISOString() : null;
      const attendedAt = a.attendedAt ? a.attendedAt.toISOString() : null;

      // 2. Durasi Respon Balasan (Waktu Pesan Masuk -> Waktu Membalas)
      let responseDurationSeconds: number | null = null;
      let responseDurationFormatted: string | null = null;

      if (a.attendedAt && a.sentAt) {
        const diffMs = a.attendedAt.getTime() - a.sentAt.getTime();
        responseDurationSeconds = Math.max(0, Math.round(diffMs / 1000));

        if (responseDurationSeconds < 60) {
          responseDurationFormatted = `${responseDurationSeconds} dtk`;
        } else if (responseDurationSeconds < 3600) {
          const mins = Math.floor(responseDurationSeconds / 60);
          const secs = responseDurationSeconds % 60;
          responseDurationFormatted = `${mins} mnt ${secs} dtk`;
        } else {
          const hours = Math.floor(responseDurationSeconds / 3600);
          const mins = Math.floor((responseDurationSeconds % 3600) / 60);
          responseDurationFormatted = `${hours} jam ${mins} mnt`;
        }
      }

      // 3. Status Mendekati Batas Akhir (Deadline Analysis)
      let minutesBeforeDeadline: number | null = null;
      let isNearDeadline = false;
      let isLate = false;

      if (a.attendedAt) {
        const diffDeadlineMs = session.deadlineAt.getTime() - a.attendedAt.getTime();
        minutesBeforeDeadline = Math.round(diffDeadlineMs / 60_000);

        if (minutesBeforeDeadline >= 0 && minutesBeforeDeadline <= 15) {
          isNearDeadline = true;
          nearDeadlineCount++;
        } else if (minutesBeforeDeadline < 0) {
          isLate = true;
        }
      } else {
        if (!isDeadlinePassed && remainingMinutes <= 15) {
          isNearDeadline = true;
        }
        isLate = isDeadlinePassed;
      }

      return {
        id: a.id,
        jaringId: a.jaringId,
        aliasName: a.jaring.aliasName || 'Jaring',
        fullName: a.jaring.fullName,
        jobTitle: a.jaring.jobTitle || 'Personel Jaring',
        whatsappNumber: a.phoneNumber,
        caretaker,
        caretakerId,
        areaId,
        areaName: coverageArea,
        sentStatus: a.sentStatus,
        sentAt,
        attendanceStatus: a.attendanceStatus,
        attendedAt,
        responseDurationSeconds,
        responseDurationFormatted,
        minutesBeforeDeadline,
        isNearDeadline,
        isLate,
        replyContent: a.replyContent,
        latitude: a.latitude ? Number(a.latitude) : null,
        longitude: a.longitude ? Number(a.longitude) : null,
        coordinateSource: a.coordinateSource,
      };
    });

    return {
      session: {
        id: session.id,
        title: session.title,
        sessionDate: session.sessionDate.toISOString(),
        status: session.status,
        blastedAt: session.blastedAt ? session.blastedAt.toISOString() : null,
        deadlineAt: session.deadlineAt.toISOString(),
        areaId: session.areaId,
        areaName: session.area?.name || 'Nasional / Seluruh Wilayah',
        requireLocation: session.requireLocation ?? true,
      },
      kpi: {
        totalTarget,
        totalHadir,
        totalBelum,
        persentaseHadir,
        isDeadlinePassed,
        remainingMinutes,
        nearDeadlineCount,
        totalSent,
        totalFailed,
        totalPendingDelivery,
        deliveryPercentage,
        totalVerifiedJarings,
      },
      attendances: mappedAttendances,
      availableSessions,
      availableAreas,
    };
  }
}
