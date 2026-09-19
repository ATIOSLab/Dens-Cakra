import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { WhatsappBotRuntimeService } from '../integrations/whatsapp-bot-runtime.service.js';
import { WhatsAppChannelScopeService } from '../whatsapp/whatsapp-channel-scope.service.js';
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
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const dayName = days[date.getDay()];
  const day = date.getDate();
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  return `${dayName}, ${day} ${monthName} ${year}`;
}

/**
 * Normalizes city/administrative territory name from area hierarchy
 */
function extractKotaName(
  area:
    | {
        name: string;
        parent?: {
          name: string;
          parent?: {
            name: string;
          } | null;
        } | null;
      }
    | null
    | undefined,
): string {
  if (!area) return '';
  const gparent = area.parent?.parent?.name;
  const parent = area.parent?.name;
  const current = area.name;

  for (const candidate of [gparent, parent, current]) {
    if (!candidate) continue;
    const lower = candidate.toLowerCase();
    if (lower.includes('jakarta') || lower.includes('kepulauan seribu')) {
      return candidate;
    }
  }
  return gparent || parent || current || '';
}

/**
 * Strictly checks if a WhatsApp bot channel matches a given territory name
 */
function isChannelMatchingTerritory(
  channelName: string,
  kotaName: string,
): boolean {
  if (!channelName || !kotaName) return false;
  const cn = channelName.toLowerCase();
  const kn = kotaName.toLowerCase();

  if (kn.includes('jakarta timur')) return cn.includes('jakarta timur');
  if (kn.includes('jakarta pusat')) return cn.includes('jakarta pusat');
  if (kn.includes('jakarta selatan')) return cn.includes('jakarta selatan');
  if (kn.includes('jakarta barat')) return cn.includes('jakarta barat');
  if (kn.includes('jakarta utara')) return cn.includes('jakarta utara');
  if (kn.includes('kepulauan seribu')) {
    return cn.includes('kepulauan seribu') || cn.includes('seribu');
  }

  return false;
}

export type CandidateChannel = {
  id: string;
  name: string;
  config: unknown;
};

@Injectable()
export class ApelBlasterService {
  private readonly logger = new Logger(ApelBlasterService.name);
  private activeBlasts = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappBotRuntime: WhatsappBotRuntimeService,
    private readonly channelScope: WhatsAppChannelScopeService,
  ) {}

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

    content = content.replace(
      /\{\{\s*nama_jaring\s*\}\}/gi,
      context.jaringName,
    );
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
      entropy +=
        zeroWidthEntropy[Math.floor(Math.random() * zeroWidthEntropy.length)];
    }

    return `${content}${entropy}`;
  }

  /**
   * Resolves list of active WhatsApp channels available for blasting.
   */
  async resolveAvailableChannels(config?: {
    channelSelectionMode?: string;
    selectedChannelId?: string | null;
    selectedChannelIds?: unknown;
  }): Promise<CandidateChannel[]> {
    // If specific channel selected in manual mode
    if (config?.selectedChannelId) {
      const channel = await this.prisma.integrationChannel.findUnique({
        where: { id: config.selectedChannelId, deletedAt: null },
        select: { id: true, name: true, config: true },
      });
      if (channel && this.whatsappBotRuntime.isChannelConnected(channel.id)) {
        return [channel];
      }
    }

    // If explicit array of channels specified
    if (
      Array.isArray(config?.selectedChannelIds) &&
      config.selectedChannelIds.length > 0
    ) {
      const explicitIds = config.selectedChannelIds as string[];
      const explicitChannels = await this.prisma.integrationChannel.findMany({
        where: {
          id: { in: explicitIds },
          deletedAt: null,
          status: { in: ['ACTIVE', 'DEGRADED'] },
        },
        select: { id: true, name: true, config: true },
      });
      const connected = explicitChannels.filter((c) =>
        this.whatsappBotRuntime.isChannelConnected(c.id),
      );
      if (connected.length > 0) return connected;
    }

    // Default: find all WhatsApp channels in ACTIVE or DEGRADED state
    const allChannels = await this.prisma.integrationChannel.findMany({
      where: {
        deletedAt: null,
        status: { in: ['ACTIVE', 'DEGRADED'] },
        OR: [
          { channelType: { contains: 'WHATSAPP', mode: 'insensitive' } },
          { channelType: { contains: 'WA', mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, config: true },
    });

    const connectedChannels = allChannels.filter((c) =>
      this.whatsappBotRuntime.isChannelConnected(c.id),
    );

    if (connectedChannels.length > 0) {
      return connectedChannels;
    }

    if (allChannels.length > 0) {
      return allChannels;
    }

    // Fallback for dev/test
    return await this.prisma.integrationChannel.findMany({
      where: {
        deletedAt: null,
        OR: [
          { channelType: { contains: 'WHATSAPP', mode: 'insensitive' } },
          { channelType: { contains: 'WA', mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, config: true },
      take: 3,
    });
  }

  /**
   * Executes the blasting process asynchronously with STRICT TERRITORY LOCK & anti-ban protection.
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

      if (
        session.status === ApelSessionStatus.COMPLETED ||
        session.status === ApelSessionStatus.CANCELLED
      ) {
        this.logger.warn(
          `Apel session ${sessionId} is already ${session.status}, skipping blast.`,
        );
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

      // 1. Fetch all verified Jaring targets with administrative hierarchy (Kelurahan -> Kecamatan -> Kota)
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
          closures.length > 0
            ? closures.map((c) => c.descendantId)
            : [session.areaId];

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
                  parentId: true,
                  parent: {
                    select: {
                      id: true,
                      name: true,
                      parentId: true,
                      parent: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            take: 1,
          },
        },
      });

      this.logger.log(
        `Found ${jarings.length} verified Jaring targets for Apel session ${sessionId}`,
      );

      // Ensure ApelAttendance rows exist
      for (const jaring of jarings) {
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
      const availableChannels = await this.resolveAvailableChannels(
        config
          ? {
              channelSelectionMode: config.channelSelectionMode,
              selectedChannelId: config.selectedChannelId,
              selectedChannelIds: config.selectedChannelIds,
            }
          : undefined,
      );

      // Transition session to ACTIVE so it appears on the Deputi map right away
      await this.prisma.apelSession.update({
        where: { id: sessionId },
        data: {
          status: ApelSessionStatus.ACTIVE,
          totalTarget: jarings.length,
        },
      });

      if (availableChannels.length === 0) {
        this.logger.warn(
          `Apel session ${sessionId} created with ${jarings.length} targets, but no WhatsApp bot channels are currently available. Blasting paused until a bot is connected.`,
        );
        return;
      }

      // 3. Batch processing with STRICT TERRITORY ROUTING & Anti-Ban mitigations
      let sentCount = 0;
      let failedCount = 0;
      const territoryIndexMap = new Map<string, number>();

      const deadlineHoursMinutes = session.deadlineAt.toLocaleTimeString(
        'id-ID',
        {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Jakarta',
        },
      );
      const deadlineText = `${deadlineHoursMinutes} WIB`;

      for (let i = 0; i < jarings.length; i++) {
        const jaring = jarings[i];
        const jaringName =
          jaring.fullName || jaring.aliasName || 'Rekan Jaring';
        const primaryArea = jaring.areaCoverages[0]?.area;
        const areaName =
          primaryArea?.name || session.area?.name || 'Wilayah Penugasan';
        const kotaName = extractKotaName(primaryArea);

        // Resolve matching channels strictly for this jaring's territory
        const jaringAreaIds = primaryArea?.id ? [primaryArea.id] : [];
        const matchingChannels: CandidateChannel[] = [];

        for (const ch of availableChannels) {
          let allowed = false;

          // Check 1: Channel scope service (config-level scope if configured)
          if (jaringAreaIds.length > 0) {
            try {
              allowed = await this.channelScope.isJaringAllowed(
                ch,
                jaringAreaIds,
              );
            } catch {
              allowed = false;
            }
          }

          // Check 2: Territorial Name matching (strict city/regency boundary)
          if (!allowed && kotaName) {
            allowed = isChannelMatchingTerritory(ch.name, kotaName);
          }

          if (allowed) {
            matchingChannels.push(ch);
          }
        }

        // STRICT TERRITORY ENFORCEMENT: If no channel matches territory, DO NOT cross-send!
        if (matchingChannels.length === 0) {
          this.logger.warn(
            `[Apel Territory Lock] Skipping blast for ${jaringName} (${jaring.whatsappNumber}) in ${areaName} (${kotaName}): No active WhatsApp bot is assigned/connected to this territory. Cross-region blast is strictly BLOCKED to prevent spam bans.`,
          );
          failedCount++;
          await this.prisma.apelAttendance.update({
            where: {
              sessionId_jaringId: {
                sessionId: session.id,
                jaringId: jaring.id,
              },
            },
            data: {
              sentStatus: ApelSentStatus.FAILED,
              deliveryError: 'NO_TERRITORY_CHANNEL_CONNECTED',
            },
          });
          continue;
        }

        // Territory-Scoped Load Balancing: Rotate only among bots belonging to this territory
        const territoryKey = kotaName || areaName || 'DEFAULT';
        const tIndex = territoryIndexMap.get(territoryKey) ?? 0;
        const currentChannel =
          matchingChannels[tIndex % matchingChannels.length];
        territoryIndexMap.set(territoryKey, tIndex + 1);
        const currentChannelId = currentChannel.id;

        const messageText = this.generateMessage(session.messageTemplateUsed, {
          jaringName,
          areaName,
          date: session.sessionDate,
          deadlineText,
        });

        try {
          this.logger.log(
            `[Apel Territory-Locked Blast] Sending to ${jaringName} (${jaring.whatsappNumber}) [${kotaName}] via channel ${currentChannel.name} (${currentChannelId})`,
          );

          const sendResult =
            await this.whatsappBotRuntime.sendDirectTextMessage(
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
          const errorMsg =
            sendError instanceof Error ? sendError.message : String(sendError);
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
          this.logger.debug(
            `[Apel Anti-Ban Jitter] Waiting ${jitterDelay}s before next contact...`,
          );
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
      this.logger.error(
        `Failed to execute blasting session ${sessionId}:`,
        error,
      );
      await this.prisma.apelSession.update({
        where: { id: sessionId },
        data: { status: ApelSessionStatus.DRAFT },
      });
    } finally {
      this.activeBlasts.delete(sessionId);
    }
  }
}
