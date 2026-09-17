import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApelBlasterService } from './apel-blaster.service.js';
import {
  ApelSessionStatus,
  ApelAttendanceStatus,
} from '../../generated/prisma/client.js';

@Injectable()
export class ApelSchedulerService {
  private readonly logger = new Logger(ApelSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blaster: ApelBlasterService,
  ) {}

  /**
   * Runs every minute to trigger scheduled blasts and resolve expired deadlines.
   */
  @Cron('*/1 * * * *', { timeZone: 'Asia/Jakarta' })
  async handleMinuteTick(): Promise<void> {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
      hour12: false,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const currentWibTime = `${hour}:${minute}`;
    const dotWibTime = `${hour}.${minute}`;

    const sessionDate = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
    );

    // 1. Check for scheduled blasts
    await this.processScheduledBlasts(currentWibTime, dotWibTime, sessionDate, now);

    // 2. Check for expired attendance deadlines
    await this.processExpiredDeadlines(now);
  }

  private async processScheduledBlasts(
    currentWibTime: string,
    dotWibTime: string,
    sessionDate: Date,
    now: Date,
  ): Promise<void> {
    const activeConfigs = await this.prisma.apelConfig.findMany({
      where: {
        isActive: true,
        OR: [
          { scheduleTime: currentWibTime },
          { scheduleTime: dotWibTime },
        ],
      },
      include: {
        area: { select: { id: true, name: true } },
      },
    });

    for (const config of activeConfigs) {
      // Check if session for today already exists
      const existingSession = await this.prisma.apelSession.findFirst({
        where: {
          configId: config.id,
          sessionDate,
        },
      });

      if (existingSession) {
        continue; // Already triggered today
      }

      this.logger.log(
        `[Apel Scheduler] Triggering automated daily blast for config: ${config.title} at ${currentWibTime} WIB`,
      );

      // Compute deadline
      let deadlineAt: Date;
      const normalizedDeadline = (config.deadlineTime || '').replace('.', ':');
      if (normalizedDeadline.includes(':')) {
        const [dh, dm] = normalizedDeadline.split(':').map(Number);
        const wibDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Jakarta',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(now); // "YYYY-MM-DD"
        const [y, mo, d] = wibDateStr.split('-').map(Number);

        // WIB = UTC+7, so UTC hour = dh - 7
        const targetUtcMillis = Date.UTC(y, mo - 1, d, dh - 7, dm, 0, 0);
        deadlineAt = new Date(targetUtcMillis);

        if (deadlineAt.getTime() <= now.getTime()) {
          deadlineAt = new Date(now.getTime() + config.deadlineMinutes * 60_000);
        }
      } else {
        deadlineAt = new Date(now.getTime() + config.deadlineMinutes * 60_000);
      }

      const session = await this.prisma.apelSession.create({
        data: {
          configId: config.id,
          title: `${config.title} - ${now.toLocaleDateString('id-ID', { dateStyle: 'full' })}`,
          sessionDate,
          targetType: config.targetType || 'AREA',
          areaId: config.areaId,
          targetGaswilIds: config.targetGaswilIds ?? undefined,
          targetJaringIds: config.targetJaringIds ?? undefined,
          requireLocation: config.requireLocation ?? true,
          status: ApelSessionStatus.DRAFT,
          messageTemplateUsed: config.messageTemplate,
          attendanceReplyTemplate: config.attendanceReplyTemplate,
          deadlineAt,
        },
      });

      // Execute blasting in background
      void this.blaster.executeBlasting(session.id);
    }
  }

  private async processExpiredDeadlines(now: Date): Promise<void> {
    const expiredSessions = await this.prisma.apelSession.findMany({
      where: {
        status: { in: [ApelSessionStatus.ACTIVE, ApelSessionStatus.BLASTING] },
        deadlineAt: { lte: now },
      },
      include: {
        attendances: {
          select: { id: true, attendanceStatus: true },
        },
      },
    });

    for (const session of expiredSessions) {
      this.logger.log(
        `[Apel Scheduler] Deadline passed for session ${session.id} (${session.title}). Resolving final attendance...`,
      );

      // Mark all still PENDING attendances as ABSENT
      await this.prisma.apelAttendance.updateMany({
        where: {
          sessionId: session.id,
          attendanceStatus: ApelAttendanceStatus.PENDING,
        },
        data: {
          attendanceStatus: ApelAttendanceStatus.ABSENT,
        },
      });

      const totalAttended = session.attendances.filter(
        (a) => a.attendanceStatus === ApelAttendanceStatus.PRESENT,
      ).length;
      const totalAbsent = session.attendances.length - totalAttended;

      await this.prisma.apelSession.update({
        where: { id: session.id },
        data: {
          status: ApelSessionStatus.COMPLETED,
          totalAttended,
          totalAbsent,
        },
      });

      this.logger.log(
        `[Apel Scheduler] Closed session ${session.id}. Hadir: ${totalAttended}, Tidak Hadir: ${totalAbsent}`,
      );
    }
  }
}
