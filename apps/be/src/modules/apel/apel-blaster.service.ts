import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsappBotRuntimeService } from '../integrations/whatsapp-bot-runtime.service.js';
import {
  ApelSessionStatus,
  ApelSentStatus,
  ApelAttendanceStatus,
  CoordinateSource,
  Prisma,
} from '../../generated/prisma/client.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Resolves spintax variations like "{Halo|Selamat Pagi|Salam}" into one randomly selected string.
 */
function resolveSpintax(text: string): string {
  const spintaxRegex = /\{([^{}]+)\}/g;
  let result = text;
  while (spintaxRegex.test(result)) {
    result = result.replace(spintaxRegex, (_, choices: string) => {
      const parts = choices.split('|');
      return parts[Math.floor(Math.random() * parts.length)]?.trim() ?? '';
    });
  }
  return result;
}

/**
 * Formats a Date into Indonesian date string, e.g. "Rabu, 16 September 2026"
 */
function formatIndonesianDate(date: Date): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

@Injectable()
export class ApelBlasterService {
  private readonly logger = new Logger(ApelBlasterService.name);
  private activeBlasts = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappBotRuntime: WhatsappBotRuntimeService,
  ) {}

  /**
   * Generates tailored message content with spintax, personalized placeholders,
   * and anti-ban invisible entropy to guarantee unique message hashes across WhatsApp network.
   */
  generateMessage(
    template: string,
    context: {
      jaringName: string;
      areaName?: string;
      date: Date;
      deadlineText: string;
    },
  ): string {
    let content = template;

    content = content.replace(/\{\{\s*nama_jaring\s*\}\}/gi, context.jaringName);
    content = content.replace(/\{\{\s*nama\s*\}\}/gi, context.jaringName);
    content = content.replace(
      /\{\{\s*wilayah\s*\}\}/gi,
      context.areaName || 'Wilayah Penugasan',
    );
    content = content.replace(
      /\{\{\s*tanggal\s*\}\}/gi,
      formatIndonesianDate(context.date),
    );
    const cleanDeadline = (context.deadlineText || '')
      .replace(/\s*WIB\s*/gi, '')
      .trim();
    content = content.replace(
      /\{\{\s*deadline\s*\}\}(?:\s*WIB)?/gi,
      `${cleanDeadline} WIB`,
    );
    content = content.replace(
      /\{\{\s*format_balasan\s*\}\}/gi,
      'Ketik *HADIR* atau bagikan lokasi terkini Anda',
    );

    // Resolve any spintax clauses
    content = resolveSpintax(content);

    // Anti-ban invisible entropy: append zero-width spaces matching random hash
    const zeroWidthEntropy = ['\u200B', '\u200C', '\u200D', '\uFEFF'];
    const entropyLength = randomBetween(2, 5);
    let entropy = '';
    for (let i = 0; i < entropyLength; i++) {
      entropy += zeroWidthEntropy[Math.floor(Math.random() * zeroWidthEntropy.length)];
    }

    return `${content}${entropy}`;
  }

  /**
   * Resolves list of active WhatsApp channels available for blasting in an area.
   */
  async resolveAvailableChannels(
    config?: {
      channelSelectionMode?: string;
      selectedChannelId?: string | null;
      selectedChannelIds?: unknown;
    },
    areaId?: string | null,
  ): Promise<string[]> {
    // If specific channel selected in manual mode
    if (config?.selectedChannelId) {
      if (this.whatsappBotRuntime.isChannelConnected(config.selectedChannelId)) {
        return [config.selectedChannelId];
      }
    }

    // If array of channels specified
    if (
      Array.isArray(config?.selectedChannelIds) &&
      config.selectedChannelIds.length > 0
    ) {
      const connected = (config.selectedChannelIds as string[]).filter((id) =>
        this.whatsappBotRuntime.isChannelConnected(id),
      );
      if (connected.length > 0) return connected;
    }

    // Fallback to finding any WhatsApp channels (ACTIVE, DEGRADED, or any in dev)
    let channels = await this.prisma.integrationChannel.findMany({
      where: {
        deletedAt: null,
        status: { in: ['ACTIVE', 'DEGRADED'] },
        OR: [
          { channelType: { contains: 'WHATSAPP', mode: 'insensitive' } },
          { channelType: { contains: 'WA', mode: 'insensitive' } },
        ],
      },
      select: { id: true, config: true },
    });

    const connectedChannels = channels.filter((c) =>
      this.whatsappBotRuntime.isChannelConnected(c.id),
    );

    if (connectedChannels.length > 0) {
      return connectedChannels.map((c) => c.id);
    }

    if (channels.length > 0) {
      return channels.map((c) => c.id);
    }

    // In local development or testing, fallback to any available whatsapp channel in database
    const anyChannels = await this.prisma.integrationChannel.findMany({
      where: {
        deletedAt: null,
        OR: [
          { channelType: { contains: 'WHATSAPP', mode: 'insensitive' } },
          { channelType: { contains: 'WA', mode: 'insensitive' } },
        ],
      },
      select: { id: true },
      take: 3,
    });

    return anyChannels.map((c) => c.id);
  }

  /**
   * Executes the blasting process asynchronously with full anti-ban protection.
   */
  async executeBlasting(sessionId: string): Promise<void> {
    if (this.activeBlasts.has(sessionId)) {
      this.logger.warn(`Blasting session ${sessionId} is already running.`);
      return;
    }

    this.activeBlasts.add(sessionId);

    try {
      const session = await this.prisma.apelSession.findUniqueOrThrow({
        where: { id: sessionId },
        include: {
          config: true,
          area: { select: { id: true, name: true } },
        },
      });

      if (session.status === ApelSessionStatus.COMPLETED || session.status === ApelSessionStatus.CANCELLED) {
        this.logger.warn(`Apel session ${sessionId} is already ${session.status}, skipping blast.`);
        return;
      }

      await this.prisma.apelSession.update({
        where: { id: sessionId },
        data: {
          status: ApelSessionStatus.BLASTING,
          blastedAt: session.blastedAt ?? new Date(),
        },
      });

      const config = session.config;
      const minDelay = config?.minDelaySeconds ?? 8;
      const maxDelay = config?.maxDelaySeconds ?? 20;
      const batchSize = config?.batchSize ?? 5;
      const batchPause = config?.batchPauseSeconds ?? 30;

      // 1. Fetch all verified Jaring targets FIRST so attendances are recorded immediately
      const whereJaring: Prisma.JaringWhereInput = {
        deletedAt: null,
        status: 'ACTIVE',
        registrationStatus: 'APPROVED',
      };

      const targetType = session.targetType || 'AREA';
      const targetJaringIds = Array.isArray(session.targetJaringIds)
        ? (session.targetJaringIds as string[])
        : [];
      const targetGaswilIds = Array.isArray(session.targetGaswilIds)
        ? (session.targetGaswilIds as string[])
        : [];

      if (targetType === 'JARING' && targetJaringIds.length > 0) {
        whereJaring.id = { in: targetJaringIds };
      } else if (targetType === 'GASWIL' && targetGaswilIds.length > 0) {
        whereJaring.caretakerAssignments = {
          some: {
            fieldOfficerAssignmentId: { in: targetGaswilIds },
            isActive: true,
            validUntil: null,
          },
        };
      } else if (targetType === 'AREA' && session.areaId) {
        const closures = await this.prisma.administrativeAreaClosure.findMany({
          where: { ancestorId: session.areaId },
          select: { descendantId: true },
        });
        const targetAreaIds =
          closures.length > 0 ? closures.map((c) => c.descendantId) : [session.areaId];

        whereJaring.areaCoverages = {
          some: {
            areaId: { in: targetAreaIds },
            validUntil: null,
          },
        };
      }

      const jarings = await this.prisma.jaring.findMany({
        where: whereJaring,
        select: {
          id: true,
          aliasName: true,
          fullName: true,
          whatsappNumber: true,
          areaCoverages: {
            where: { validUntil: null },
            select: {
              area: {
                select: {
                  id: true,
                  name: true,
                  centroidLatitude: true,
                  centroidLongitude: true,
                },
              },
            },
            take: 1,
          },
        },
      });

      this.logger.log(`Found ${jarings.length} verified Jaring targets for Apel session ${sessionId}`);

      // Ensure ApelAttendance rows exist
      for (const jaring of jarings) {
        const primaryArea = jaring.areaCoverages[0]?.area;
        await this.prisma.apelAttendance.upsert({
          where: {
            sessionId_jaringId: {
              sessionId: session.id,
              jaringId: jaring.id,
            },
          },
          update: {},
          create: {
            sessionId: session.id,
            jaringId: jaring.id,
            phoneNumber: jaring.whatsappNumber,
            sentStatus: ApelSentStatus.PENDING,
            attendanceStatus: ApelAttendanceStatus.PENDING,
            latitude: null,
            longitude: null,
            coordinateSource: null,
          },
        });
      }

      // 2. Resolve available bot channels
      const availableChannelIds = await this.resolveAvailableChannels(
        config
          ? {
              channelSelectionMode: config.channelSelectionMode,
              selectedChannelId: config.selectedChannelId,
              selectedChannelIds: config.selectedChannelIds,
            }
          : undefined,
        session.areaId,
      );

      // Transition session to ACTIVE so it appears on the Deputi map right away
      await this.prisma.apelSession.update({
        where: { id: sessionId },
        data: {
          status: ApelSessionStatus.ACTIVE,
          totalTarget: jarings.length,
        },
      });

      if (availableChannelIds.length === 0) {
        this.logger.warn(
          `Apel session ${sessionId} created with ${jarings.length} targets, but no WhatsApp bot channels are currently available. Blasting paused until a bot is connected.`,
        );
        return;
      }

      // 3. Batch processing with Anti-Ban mitigations
      let sentCount = 0;
      let failedCount = 0;
      let channelIndex = 0;

      const deadlineHoursMinutes = session.deadlineAt.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      });
      const deadlineText = `${deadlineHoursMinutes} WIB`;

      for (let i = 0; i < jarings.length; i++) {
        const jaring = jarings[i];
        const jaringName = jaring.fullName || jaring.aliasName || 'Rekan Jaring';
        const areaName = jaring.areaCoverages[0]?.area.name || session.area?.name || 'Wilayah Penugasan';

        // Load-balance channels across targets
        const currentChannelId = availableChannelIds[channelIndex % availableChannelIds.length];
        channelIndex++;

        const messageText = this.generateMessage(session.messageTemplateUsed, {
          jaringName,
          areaName,
          date: session.sessionDate,
          deadlineText,
        });

        try {
          this.logger.log(
            `[Apel Anti-Ban Blast] Sending to ${jaringName} (${jaring.whatsappNumber}) via channel ${currentChannelId}`,
          );

          const sendResult = await this.whatsappBotRuntime.sendDirectTextMessage(
            currentChannelId,
            jaring.whatsappNumber,
            messageText,
            { simulateTypingMs: randomBetween(1500, 3500) },
          );

          if (sendResult.success) {
            sentCount++;
            await this.prisma.apelAttendance.update({
              where: {
                sessionId_jaringId: {
                  sessionId: session.id,
                  jaringId: jaring.id,
                },
              },
              data: {
                channelId: currentChannelId,
                sentStatus: ApelSentStatus.SENT,
                sentAt: new Date(),
                deliveryError: null,
              },
            });
          } else {
            failedCount++;
            await this.prisma.apelAttendance.update({
              where: {
                sessionId_jaringId: {
                  sessionId: session.id,
                  jaringId: jaring.id,
                },
              },
              data: {
                channelId: currentChannelId,
                sentStatus: ApelSentStatus.FAILED,
                deliveryError: sendResult.error || 'Gagal mengirim pesan',
              },
            });
          }
        } catch (sendError: unknown) {
          failedCount++;
          const errorMsg = sendError instanceof Error ? sendError.message : String(sendError);
          await this.prisma.apelAttendance.update({
            where: {
              sessionId_jaringId: {
                sessionId: session.id,
                jaringId: jaring.id,
              },
            },
            data: {
              channelId: currentChannelId,
              sentStatus: ApelSentStatus.FAILED,
              deliveryError: errorMsg,
            },
          });
        }

        // Anti-ban Mitigation: Jitter delay between messages
        if (i < jarings.length - 1) {
          const jitterDelay = randomBetween(minDelay, maxDelay);
          this.logger.debug(`[Apel Anti-Ban Jitter] Waiting ${jitterDelay}s before next contact...`);
          await sleep(jitterDelay * 1000);

          // Anti-ban Mitigation: Batch cooling-down pause
          if ((i + 1) % batchSize === 0) {
            this.logger.log(
              `[Apel Anti-Ban Batch Cooldown] Completed batch of ${batchSize}. Cooling down for ${batchPause}s...`,
            );
            await sleep(batchPause * 1000);
          }
        }
      }

      // 4. Mark blasting completed and session active
      await this.prisma.apelSession.update({
        where: { id: sessionId },
        data: {
          status: ApelSessionStatus.ACTIVE,
          blastingCompletedAt: new Date(),
          totalSent: sentCount,
          totalFailed: failedCount,
        },
      });

      this.logger.log(
        `Apel Blasting completed for session ${sessionId}. Sent: ${sentCount}, Failed: ${failedCount}`,
      );
    } catch (error: unknown) {
      this.logger.error(`Failed to execute blasting session ${sessionId}:`, error);
      await this.prisma.apelSession.update({
        where: { id: sessionId },
        data: { status: ApelSessionStatus.DRAFT },
      });
    } finally {
      this.activeBlasts.delete(sessionId);
    }
  }
}
