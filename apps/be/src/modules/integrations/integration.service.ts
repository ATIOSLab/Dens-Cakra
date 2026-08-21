import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  IntegrationStatus,
  Prisma,
  WhatsAppBotConnectionStatus,
  WhatsAppDeviceEventType,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import { SecretVaultService } from '../infrastructure/secret-vault.service.js';
import type { EncryptedValue } from '../infrastructure/secret-vault.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import type {
  CreateIntegrationDto,
  CreateWhatsappNotificationRecipientDto,
  IntegrationQuery,
  ReasonDto,
  RequestWhatsappQrDto,
  TestIntegrationDto,
  UpdateIntegrationDto,
  UpdateWhatsappNotificationRecipientDto,
  WhatsappDeviceActivityQuery,
  WhatsappMessageEventQuery,
  UpdateWhatsappControlDto,
  WebhookQuery,
} from './integration.dto.js';
import { WhatsappBotRuntimeService } from './whatsapp-bot-runtime.service.js';

type ControlScopeAreaRecord = {
  id: string;
  code: string;
  officialCode: string | null;
  name: string;
  level: string;
  parent?: { name: string } | null;
};
type ControlAreaScopeRecord = {
  isPrimary?: boolean;
  area?: ControlScopeAreaRecord | null;
};
type ControlAssignmentRecord = {
  id: string;
  isActive?: boolean;
  areaScopes?: ControlAreaScopeRecord[];
};
type ControlUserRecord = {
  id: string;
  fullName?: string | null;
  operationalAssignments?: ControlAssignmentRecord[];
};
type ScopeHierarchyLinkRecord = {
  descendantId: string;
  depth: number;
  ancestor: {
    id: string;
    code: string;
    officialCode: string | null;
    name: string;
    level: string;
  };
};
type SenderJaringRecord = {
  id: string;
  whatsappNumber: string;
  registrationStatus: string;
  aliasName: string | null;
  fullName: string | null;
};
type SenderIndex = {
  byPhone: Map<string, SenderJaringRecord>;
  lidToJaring: Map<string, SenderJaringRecord>;
  lidToPhone: Map<string, string>;
  approvedPhones: string[];
  unverifiedPhones: string[];
  allPhones: string[];
  approvedLids: string[];
  unverifiedLids: string[];
  allLids: string[];
};
type MessageEventRow = {
  id: string;
  channelId: string;
  externalEventId: string | null;
  eventType: string;
  senderPhone: string | null;
  payload: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  success: boolean | null;
  errorMessage: string | null;
  channelCode: string;
  channelName: string;
};

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
    private readonly jobs: AsyncJobService,
    private readonly whatsappBotRuntime: WhatsappBotRuntimeService,
  ) {}

  private view<T extends { config: unknown }>(channel: T) {
    return {
      ...channel,
      config: { redacted: true, configured: Boolean(channel.config) },
    };
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

  private readConfigSafely(config: unknown) {
    try {
      return {
        config: this.readConfig(config),
        requiresReconfiguration: false,
      };
    } catch {
      return {
        config: {} as Record<string, unknown>,
        requiresReconfiguration: true,
      };
    }
  }

  private archivedCode(code: string, deletedAt: Date) {
    const suffix = `__deleted_${deletedAt.getTime()}`;
    return `${code.slice(0, 80 - suffix.length)}${suffix}`;
  }

  private configStringArray(config: Record<string, unknown>, key: string) {
    return this.uniqueStringArray(config[key]);
  }

  private uniqueStringArray(value: unknown) {
    return Array.isArray(value)
      ? [
          ...new Set(
            value
              .map((item) => (typeof item === 'string' ? item.trim() : ''))
              .filter(Boolean),
          ),
        ]
      : [];
  }

  private async validateWhatsappScopeConfig(config: Record<string, unknown>) {
    const legacyScopeAreaId =
      typeof config.scopeAreaId === 'string' ? config.scopeAreaId.trim() : '';
    const scopeAreaIds = [
      ...new Set([
        ...this.configStringArray(config, 'scopeAreaIds'),
        ...(legacyScopeAreaId ? [legacyScopeAreaId] : []),
      ]),
    ];

    if (scopeAreaIds.length === 0) {
      return;
    }

    const knownAreas = await this.prisma.administrativeArea.findMany({
      where: { id: { in: scopeAreaIds }, isActive: true, deletedAt: null },
      select: { id: true },
    });
    const knownAreaIds = new Set(knownAreas.map((area) => area.id));
    const invalidAreaIds = scopeAreaIds.filter(
      (areaId) => !knownAreaIds.has(areaId),
    );

    if (invalidAreaIds.length > 0) {
      throw new ApiException(
        'WHATSAPP_SCOPE_INVALID_AREA',
        'Wilayah pelaporan WhatsApp tidak valid atau sudah tidak aktif. Pilih wilayah administratif yang tersedia.',
        400,
      );
    }
  }

  private whatsappControlView(channel: {
    id: string;
    code: string;
    name: string;
    channelType: string;
    status: IntegrationStatus;
    config: unknown;
    lastHealthAt: Date | null;
    updatedAt: Date;
    botState?: {
      connectionStatus: string;
      qrCodeDataUrl: string | null;
      pairingCode: string | null;
      botPhoneNumber: string | null;
      sessionJid: string | null;
      lastConnectedAt: Date | null;
      lastDisconnectedAt: Date | null;
      lastError: string | null;
    } | null;
    senderNumbers?: Array<{
      phoneNumber: string;
      isPrimary: boolean;
      isActive: boolean;
    }>;
  }) {
    const { config, requiresReconfiguration } = this.readConfigSafely(
      channel.config,
    );
    const configurationError = requiresReconfiguration
      ? 'Konfigurasi koneksi tidak dapat dibaca. Simpan ulang konfigurasi kanal WhatsApp.'
      : null;
    const senderNumbers =
      channel.senderNumbers?.map((item) => item.phoneNumber) ??
      (Array.isArray(config.senderNumbers)
        ? config.senderNumbers
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean)
        : []);
    const legacyScopeAreaId =
      typeof config.scopeAreaId === 'string' ? config.scopeAreaId : null;
    const scopeAreaIds = [
      ...new Set([
        ...this.configStringArray(config, 'scopeAreaIds'),
        ...(legacyScopeAreaId ? [legacyScopeAreaId] : []),
      ]),
    ];

    return {
      id: channel.id,
      code: channel.code,
      name: channel.name,
      channelType: channel.channelType,
      status: channel.status,
      lastHealthAt: channel.lastHealthAt,
      updatedAt: channel.updatedAt,
      webhookConfigured: Boolean(config.webhookSecret),
      provider: typeof config.provider === 'string' ? config.provider : null,
      botLabel: typeof config.botLabel === 'string' ? config.botLabel : null,
      pairingMethod: config.pairingMethod === 'code' ? 'code' : 'qr',
      botPhoneNumber:
        typeof config.botPhoneNumber === 'string'
          ? config.botPhoneNumber
          : (channel.botState?.botPhoneNumber ?? null),
      connectionStatus: channel.botState?.connectionStatus ?? 'DISCONNECTED',
      qrCodeDataUrl: channel.botState?.qrCodeDataUrl ?? null,
      pairingCode: channel.botState?.pairingCode ?? null,
      sessionJid: channel.botState?.sessionJid ?? null,
      lastConnectedAt: channel.botState?.lastConnectedAt ?? null,
      lastDisconnectedAt: channel.botState?.lastDisconnectedAt ?? null,
      lastError: configurationError ?? channel.botState?.lastError ?? null,
      senderNumbers,
      userId: typeof config.userId === 'string' ? config.userId : null,
      operationalAssignmentId:
        typeof config.operationalAssignmentId === 'string'
          ? config.operationalAssignmentId
          : null,
      scopeAreaIds,
      scopeAreas: [] as Array<{
        id: string;
        code: string;
        officialCode: string | null;
        name: string;
        level: string;
        parentName: string | null;
        hierarchy: Array<{
          id: string;
          code: string;
          officialCode: string | null;
          name: string;
          level: string;
        }>;
      }>,
      scopeAreaId: legacyScopeAreaId ?? scopeAreaIds[0] ?? null,
      scopeAreaCode:
        typeof config.scopeAreaCode === 'string' ? config.scopeAreaCode : null,
      scopeAreaName:
        typeof config.scopeAreaName === 'string' ? config.scopeAreaName : null,
      scopeAreaLevel:
        typeof config.scopeAreaLevel === 'string'
          ? config.scopeAreaLevel
          : null,
      scopeAreaParentName:
        typeof config.scopeAreaParentName === 'string'
          ? config.scopeAreaParentName
          : null,
      scopeBranch:
        typeof config.scopeBranch === 'string' ? config.scopeBranch : null,
      scopeHierarchy: [] as Array<{
        id: string;
        code: string;
        officialCode: string | null;
        name: string;
        level: string;
      }>,
      coordinatorName: null as string | null,
      coordinatorRegion: null as string | null,
      requiresReconfiguration,
    };
  }

  private audit(
    context: AuthorizationContext,
    action: string,
    id: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserProfileId: context.userProfileId,
        actorAssignmentId: context.primaryAssignmentId,
        action,
        entityType: 'IntegrationChannel',
        entityId: id,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  async list(query: IntegrationQuery) {
    return (
      await this.prisma.integrationChannel.findMany({
        where: {
          deletedAt: null,
          ...(query.status ? { status: query.status } : {}),
          ...(query.channelType ? { channelType: query.channelType } : {}),
        },
        orderBy: { code: 'asc' },
      })
    ).map((channel) => this.view(channel));
  }

  async whatsappControl() {
    const channels = await this.prisma.integrationChannel.findMany({
      where: {
        deletedAt: null,
        OR: [
          { channelType: { contains: 'WHATSAPP', mode: 'insensitive' } },
          { channelType: { contains: 'WA', mode: 'insensitive' } },
        ],
      },
      orderBy: [{ status: 'desc' }, { code: 'asc' }],
      include: {
        botState: true,
        senderNumbers: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { phoneNumber: 'asc' }],
        },
      },
    });

    const views = channels.map((channel) => this.whatsappControlView(channel));
    const userIds = views.map((v) => v.userId).filter(Boolean) as string[];

    if (userIds.length > 0) {
      const users = await this.prisma.userProfile.findMany({
        where: { id: { in: userIds } },
        include: {
          operationalAssignments: {
            where: { isActive: true },
            include: {
              areaScopes: {
                where: { validUntil: null },
                include: { area: { include: { parent: true } } },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
      });

      const userMap = new Map(
        (users as ControlUserRecord[]).map((user) => [user.id, user]),
      );

      for (const view of views) {
        if (view.userId && userMap.has(view.userId)) {
          const user = userMap.get(view.userId);
          if (user) {
            view.coordinatorName = user.fullName ?? null;
            const activeAssignment =
              user.operationalAssignments?.find(
                (pa) => pa.id === view.operationalAssignmentId && pa.isActive,
              ) ?? user.operationalAssignments?.find((pa) => pa.isActive);
            const selectedScope =
              activeAssignment?.areaScopes?.find(
                (scope) => scope.area?.id === view.scopeAreaId,
              ) ??
              activeAssignment?.areaScopes?.find((scope) => scope.isPrimary) ??
              activeAssignment?.areaScopes?.[0] ??
              null;

            if (selectedScope?.area && !view.scopeAreaId) {
              view.scopeAreaId = selectedScope.area.id;
              view.scopeAreaIds = [selectedScope.area.id];
              view.scopeAreaCode =
                selectedScope.area.officialCode ?? selectedScope.area.code;
              view.scopeAreaName = selectedScope.area.name;
              view.scopeAreaLevel = selectedScope.area.level;
              view.scopeAreaParentName =
                selectedScope.area.parent?.name ?? null;
            }

            view['coordinatorRegion'] =
              view.scopeAreaName ?? selectedScope?.area?.name ?? null;
          }
        }
      }
    }

    const scopeAreaIds = [
      ...new Set(
        views.flatMap((view) =>
          view.scopeAreaIds.length > 0
            ? view.scopeAreaIds
            : view.scopeAreaId
              ? [view.scopeAreaId]
              : [],
        ),
      ),
    ] as string[];

    if (scopeAreaIds.length > 0) {
      const [rawAreas, rawHierarchyLinks] = await Promise.all([
        this.prisma.administrativeArea.findMany({
          where: { id: { in: scopeAreaIds }, isActive: true, deletedAt: null },
          select: {
            id: true,
            code: true,
            officialCode: true,
            name: true,
            level: true,
            parent: { select: { name: true } },
          },
        }),
        this.prisma.administrativeAreaClosure.findMany({
          where: { descendantId: { in: scopeAreaIds } },
          select: {
            descendantId: true,
            depth: true,
            ancestor: {
              select: {
                id: true,
                code: true,
                officialCode: true,
                name: true,
                level: true,
              },
            },
          },
        }),
      ]);
      const areas = rawAreas as ControlScopeAreaRecord[];
      const hierarchyLinks = rawHierarchyLinks as ScopeHierarchyLinkRecord[];
      const hierarchyMap = new Map<
        string,
        (typeof views)[number]['scopeHierarchy']
      >();
      const areaMap = new Map(areas.map((area) => [area.id, area]));

      for (const link of hierarchyLinks.sort((left, right) => {
        if (left.descendantId !== right.descendantId) {
          return left.descendantId.localeCompare(right.descendantId);
        }
        return right.depth - left.depth;
      })) {
        const current = hierarchyMap.get(link.descendantId) ?? [];
        current.push(link.ancestor);
        hierarchyMap.set(link.descendantId, current);
      }

      for (const view of views) {
        const selectedScopeAreaIds =
          view.scopeAreaIds.length > 0
            ? view.scopeAreaIds
            : view.scopeAreaId
              ? [view.scopeAreaId]
              : [];
        view.scopeAreas = selectedScopeAreaIds.flatMap((areaId) => {
          const area = areaMap.get(areaId);
          if (!area) return [];
          return [
            {
              id: area.id,
              code: area.code,
              officialCode: area.officialCode,
              name: area.name,
              level: area.level,
              parentName: area.parent?.name ?? null,
              hierarchy: hierarchyMap.get(area.id) ?? [],
            },
          ];
        });
        if (view.scopeAreas.length > 0) {
          const primaryArea = view.scopeAreas[0];
          view.scopeAreaId = primaryArea.id;
          view.scopeAreaCode = primaryArea.officialCode ?? primaryArea.code;
          view.scopeAreaName = primaryArea.name;
          view.scopeAreaLevel = primaryArea.level;
          view.scopeAreaParentName = primaryArea.parentName;
          view.scopeHierarchy = primaryArea.hierarchy;
          view.coordinatorRegion = view.scopeAreas
            .map((area) =>
              area.parentName ? `${area.parentName} / ${area.name}` : area.name,
            )
            .join(', ');
        }
      }
    }

    return views;
  }

  private parseActivityDate(value: string | undefined, field: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new ApiException(
        'INVALID_WHATSAPP_ACTIVITY_DATE',
        `Format ${field} tidak valid.`,
        400,
      );
    }

    return date;
  }

  private normalizeNotificationEmail(email: string) {
    return email.trim().toLowerCase();
  }

  async whatsappDeviceActivityLogs(query: WhatsappDeviceActivityQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;
    const from = this.parseActivityDate(query.from, 'waktu mulai');
    const to = this.parseActivityDate(query.to, 'waktu akhir');
    const normalizedPhone = query.phoneNumber
      ? normalizeIndonesianPhoneNumber(query.phoneNumber)
      : null;
    const keyword = query.q?.trim();

    const where: Prisma.WhatsAppDeviceActivityLogWhereInput = {
      ...(query.channelId ? { channelId: query.channelId } : {}),
      ...(query.scopeAreaId ? { scopeAreaId: query.scopeAreaId } : {}),
      ...(normalizedPhone
        ? { phoneNumber: { contains: normalizedPhone } }
        : {}),
      ...(query.connectionStatus
        ? { connectionStatus: query.connectionStatus }
        : {}),
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(from || to
        ? {
            occurredAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(keyword
        ? {
            OR: [
              { phoneNumber: { contains: keyword, mode: 'insensitive' } },
              { sessionJid: { contains: keyword, mode: 'insensitive' } },
              { reason: { contains: keyword, mode: 'insensitive' } },
              { errorMessage: { contains: keyword, mode: 'insensitive' } },
              {
                channel: {
                  name: { contains: keyword, mode: 'insensitive' },
                },
              },
              {
                channel: {
                  code: { contains: keyword, mode: 'insensitive' },
                },
              },
              {
                scopeArea: {
                  name: { contains: keyword, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total, activeCount, downCount, errorCount, facetLogs] =
      await Promise.all([
        this.prisma.whatsAppDeviceActivityLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          include: {
            channel: { select: { id: true, code: true, name: true } },
            scopeArea: {
              select: {
                id: true,
                code: true,
                officialCode: true,
                name: true,
                level: true,
                parent: { select: { name: true } },
              },
            },
            userProfile: { select: { id: true, fullName: true, phone: true } },
            operationalAssignment: { select: { id: true, branch: true } },
          },
        }),
        this.prisma.whatsAppDeviceActivityLog.count({ where }),
        this.prisma.whatsAppDeviceActivityLog.count({
          where: {
            ...where,
            connectionStatus: WhatsAppBotConnectionStatus.CONNECTED,
          },
        }),
        this.prisma.whatsAppDeviceActivityLog.count({
          where: {
            ...where,
            connectionStatus: WhatsAppBotConnectionStatus.DISCONNECTED,
          },
        }),
        this.prisma.whatsAppDeviceActivityLog.count({
          where: {
            ...where,
            connectionStatus: WhatsAppBotConnectionStatus.ERROR,
          },
        }),
        this.prisma.whatsAppDeviceActivityLog.findMany({
          where,
          take: 500,
          orderBy: { occurredAt: 'desc' },
          include: {
            channel: { select: { id: true, code: true, name: true } },
            scopeArea: {
              select: {
                id: true,
                code: true,
                officialCode: true,
                name: true,
                level: true,
                parent: { select: { name: true } },
              },
            },
          },
        }),
      ]);

    const channelMap = new Map<
      string,
      { id: string; code: string; name: string }
    >();
    const areaMap = new Map<
      string,
      {
        id: string;
        code: string;
        officialCode: string | null;
        name: string;
        level: string;
        parentName: string | null;
      }
    >();
    const phoneNumbers = new Set<string>();

    for (const item of facetLogs) {
      channelMap.set(item.channel.id, item.channel);
      if (item.scopeArea) {
        areaMap.set(item.scopeArea.id, {
          id: item.scopeArea.id,
          code: item.scopeArea.code,
          officialCode: item.scopeArea.officialCode,
          name: item.scopeArea.name,
          level: item.scopeArea.level,
          parentName: item.scopeArea.parent?.name ?? null,
        });
      }
      if (item.phoneNumber) {
        phoneNumbers.add(item.phoneNumber);
      }
    }

    return {
      items: items.map((item) => ({
        id: item.id,
        channelId: item.channelId,
        channelCode: item.channel.code,
        channelName: item.channel.name,
        phoneNumber: item.phoneNumber,
        eventType: item.eventType,
        connectionStatus: item.connectionStatus,
        previousConnectionStatus: item.previousConnectionStatus,
        sessionJid: item.sessionJid,
        reason: item.reason,
        errorMessage: item.errorMessage,
        occurredAt: item.occurredAt,
        metadata: item.metadata,
        scopeArea: item.scopeArea
          ? {
              id: item.scopeArea.id,
              code: item.scopeArea.code,
              officialCode: item.scopeArea.officialCode,
              name: item.scopeArea.name,
              level: item.scopeArea.level,
              parentName: item.scopeArea.parent?.name ?? null,
            }
          : null,
        coordinator: item.userProfile
          ? {
              id: item.userProfile.id,
              name: item.userProfile.fullName,
              phone: item.userProfile.phone,
              assignmentId: item.operationalAssignment?.id ?? null,
              branch: item.operationalAssignment?.branch ?? null,
            }
          : null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      summary: {
        active: activeCount,
        disconnected: downCount,
        error: errorCount,
      },
      filters: {
        channels: [...channelMap.values()].sort((left, right) =>
          left.name.localeCompare(right.name, 'id-ID'),
        ),
        scopeAreas: [...areaMap.values()].sort((left, right) =>
          left.name.localeCompare(right.name, 'id-ID'),
        ),
        phoneNumbers: [...phoneNumbers].sort((left, right) =>
          left.localeCompare(right, 'id-ID'),
        ),
        connectionStatuses: Object.values(WhatsAppBotConnectionStatus),
        eventTypes: Object.values(WhatsAppDeviceEventType),
      },
    };
  }

  async whatsappMessageEvents(query: WhatsappMessageEventQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));
    const skip = (page - 1) * limit;
    const from = this.parseActivityDate(query.from, 'waktu mulai');
    const to = this.parseActivityDate(query.to, 'waktu akhir');

    const index = await this.buildSenderIndex();
    const conditions = this.buildEventConditions(query, index, from, to);

    const [items, total, distinctPhones, distinctLids, channels] =
      await Promise.all([
        this.prisma.$queryRaw<MessageEventRow[]>(Prisma.sql`
          SELECT
            e."id",
            e."channelId",
            e."externalEventId",
            e."eventType",
            e."senderPhone",
            e."payload",
            e."receivedAt",
            e."processedAt",
            e."success",
            e."errorMessage",
            c."code" AS "channelCode",
            c."name" AS "channelName"
          FROM "IntegrationWebhookEvent" e
          JOIN "IntegrationChannel" c ON c."id" = e."channelId"
          WHERE 1 = 1${conditions}
          ORDER BY e."receivedAt" DESC, e."id" DESC
          LIMIT ${limit} OFFSET ${skip}
        `),
        this.prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
          SELECT COUNT(*)::int AS count
          FROM "IntegrationWebhookEvent" e
          WHERE 1 = 1${conditions}
        `),
        this.prisma.$queryRaw<Array<{ phone: string }>>(Prisma.sql`
          SELECT DISTINCT "senderPhone" AS phone
          FROM "IntegrationWebhookEvent" e
          WHERE "senderPhone" IS NOT NULL${conditions}
        `),
        this.prisma.$queryRaw<Array<{ lid: string | null }>>(Prisma.sql`
          SELECT DISTINCT "payload"->>'senderJid' AS lid
          FROM "IntegrationWebhookEvent" e
          WHERE "senderPhone" IS NULL${conditions}
        `),
        this.prisma.integrationChannel.findMany({
          where: { deletedAt: null, webhookEvents: { some: {} } },
          select: { id: true, code: true, name: true },
        }),
      ]);

    // Hitung jumlah PENGIRIM unik (per jaring/nomor/LID), bukan jumlah pesan.
    // Jaring yang sama bisa muncul lewat nomor (pesan baru) maupun LID (pesan
    // lama), jadi dedupe memakai id Jaring agar tidak terhitung ganda.
    const verifiedIds = new Set<string>();
    const pendingIds = new Set<string>();
    const rejectedIds = new Set<string>();
    const unregisteredPhones = new Set<string>();
    const unknownLids = new Set<string>();

    for (const row of distinctPhones) {
      const sender = this.classifySender(row.phone, null, index);
      if (sender.kind === 'VERIFIED') verifiedIds.add(sender.jaring!.id);
      else if (sender.kind === 'PENDING') pendingIds.add(sender.jaring!.id);
      else if (sender.kind === 'REJECTED') rejectedIds.add(sender.jaring!.id);
      else if (sender.kind === 'UNREGISTERED')
        unregisteredPhones.add(row.phone);
    }
    for (const row of distinctLids) {
      if (!row.lid) {
        continue;
      }
      const sender = this.classifySender(null, row.lid, index);
      if (sender.kind === 'VERIFIED') verifiedIds.add(sender.jaring!.id);
      else if (sender.kind === 'PENDING') pendingIds.add(sender.jaring!.id);
      else if (sender.kind === 'REJECTED') rejectedIds.add(sender.jaring!.id);
      else unknownLids.add(row.lid);
    }

    const verified = verifiedIds.size;
    const pending = pendingIds.size;
    const rejected = rejectedIds.size;
    const unregistered = unregisteredPhones.size;
    const unknown = unknownLids.size;

    const summary = {
      total: verified + pending + rejected + unregistered + unknown,
      verified,
      pending,
      rejected,
      unregistered,
      unknown,
    };

    return {
      items: items.map((item) => {
        const lid = this.jsonStringField(item.payload, 'senderJid');
        const sender = this.classifySender(item.senderPhone, lid, index);
        return {
          id: item.id,
          channelId: item.channelId,
          channelCode: item.channelCode,
          channelName: item.channelName,
          externalEventId: item.externalEventId,
          eventType: item.eventType,
          senderPhone:
            item.senderPhone ?? index.lidToPhone.get(lid ?? '') ?? null,
          payload: item.payload,
          receivedAt: item.receivedAt,
          processedAt: item.processedAt,
          success: item.success,
          errorMessage: item.errorMessage,
          classification: sender.kind,
          jaringName: sender.jaring?.fullName ?? null,
          jaringAlias: sender.jaring?.aliasName ?? null,
        };
      }),
      meta: {
        page,
        limit,
        total: total[0]?.count ?? 0,
        totalPages: Math.max(1, Math.ceil((total[0]?.count ?? 0) / limit)),
      },
      summary,
      filters: {
        channels: channels.sort((left, right) =>
          left.name.localeCompare(right.name, 'id-ID'),
        ),
      },
    };
  }

  private buildEventConditions(
    query: WhatsappMessageEventQuery,
    index: SenderIndex,
    from?: Date,
    to?: Date,
  ): Prisma.Sql {
    const parts: Prisma.Sql[] = [];
    if (query.channelId) {
      parts.push(Prisma.sql`"e"."channelId"::text = ${query.channelId}`);
    }
    if (query.success !== undefined) {
      parts.push(Prisma.sql`"e"."success" = ${query.success}`);
    }
    if (from) {
      parts.push(Prisma.sql`"e"."receivedAt" >= ${from}`);
    }
    if (to) {
      parts.push(Prisma.sql`"e"."receivedAt" <= ${to}`);
    }
    const keyword = query.q?.trim();
    if (keyword) {
      parts.push(
        Prisma.sql`(
          "e"."senderPhone" ILIKE ${`%${keyword}%`}
          OR "e"."externalEventId" ILIKE ${`%${keyword}%`}
          OR EXISTS (
            SELECT 1 FROM "IntegrationChannel" ic
            WHERE ic."id" = "e"."channelId"
              AND (ic."name" ILIKE ${`%${keyword}%`} OR ic."code" ILIKE ${`%${keyword}%`})
          )
        )`,
      );
    }

    if (query.classification === 'VERIFIED') {
      const phones = this.sqlInList('"e"."senderPhone"', index.approvedPhones);
      const lids = this.sqlInList(
        '"e"."payload"->>\'senderJid\'',
        index.approvedLids,
      );
      parts.push(
        Prisma.sql`(${phones} OR ("e"."senderPhone" IS NULL AND ${lids}))`,
      );
    } else if (query.classification === 'UNVERIFIED') {
      const phones = this.sqlInList(
        '"e"."senderPhone"',
        index.unverifiedPhones,
      );
      const lids = this.sqlInList(
        '"e"."payload"->>\'senderJid\'',
        index.unverifiedLids,
      );
      parts.push(
        Prisma.sql`(${phones} OR ("e"."senderPhone" IS NULL AND ${lids}))`,
      );
    } else if (query.classification === 'UNREGISTERED') {
      const notPhones = this.sqlNotInList('"e"."senderPhone"', index.allPhones);
      const notLids = this.sqlNotInList(
        '"e"."payload"->>\'senderJid\'',
        index.allLids,
      );
      parts.push(
        Prisma.sql`(
          ("e"."senderPhone" IS NOT NULL AND ${notPhones})
          OR ("e"."senderPhone" IS NULL AND (
            "e"."payload"->>'senderJid' IS NULL OR ${notLids}
          ))
        )`,
      );
    }

    return parts.length
      ? Prisma.sql` AND ${Prisma.join(parts, ' AND ')}`
      : Prisma.empty;
  }

  private sqlInList(column: string, values: string[]): Prisma.Sql {
    return values.length
      ? Prisma.sql`${Prisma.raw(column)} IN (${Prisma.join(values.map((v) => Prisma.sql`${v}`))})`
      : Prisma.sql`FALSE`;
  }

  private sqlNotInList(column: string, values: string[]): Prisma.Sql {
    return values.length
      ? Prisma.sql`${Prisma.raw(column)} NOT IN (${Prisma.join(values.map((v) => Prisma.sql`${v}`))})`
      : Prisma.sql`TRUE`;
  }

  private jsonStringField(payload: unknown, key: string): string | null {
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
      const value = (payload as Record<string, unknown>)[key];
      return typeof value === 'string' && value.length > 0 ? value : null;
    }
    return null;
  }

  private classifySender(
    phone: string | null,
    lid: string | null,
    index: SenderIndex,
  ): {
    kind: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'UNREGISTERED' | 'UNKNOWN';
    jaring?: SenderJaringRecord;
  } {
    if (phone) {
      const key = this.normalizeSenderKey(phone);
      const jaring = key ? index.byPhone.get(key) : undefined;
      if (!jaring) {
        return { kind: 'UNREGISTERED' };
      }
      return { kind: this.senderKind(jaring), jaring };
    }
    if (lid) {
      const jaring = index.lidToJaring.get(lid);
      if (!jaring) {
        return { kind: 'UNKNOWN' };
      }
      return { kind: this.senderKind(jaring), jaring };
    }
    return { kind: 'UNKNOWN' };
  }

  private senderKind(
    jaring: SenderJaringRecord,
  ): 'VERIFIED' | 'PENDING' | 'REJECTED' {
    if (jaring.registrationStatus === 'APPROVED') {
      return 'VERIFIED';
    }
    if (jaring.registrationStatus === 'PENDING') {
      return 'PENDING';
    }
    return 'REJECTED';
  }

  private async buildSenderIndex(): Promise<SenderIndex> {
    const [rows, sessions] = await Promise.all([
      this.prisma.jaring.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          whatsappNumber: true,
          registrationStatus: true,
          aliasName: true,
          fullName: true,
        },
      }),
      this.prisma.whatsAppReportSession.findMany({
        select: {
          remoteJid: true,
          senderPhone: true,
          jaring: {
            select: {
              id: true,
              whatsappNumber: true,
              registrationStatus: true,
              aliasName: true,
              fullName: true,
            },
          },
        },
      }),
    ]);

    const rank: Record<string, number> = {
      APPROVED: 0,
      PENDING: 1,
      REJECTED: 2,
    };
    const byPhone = new Map<string, SenderJaringRecord>();
    for (const row of rows) {
      const key = this.normalizeSenderKey(row.whatsappNumber);
      if (!key) {
        continue;
      }
      const existing = byPhone.get(key);
      if (
        !existing ||
        (rank[row.registrationStatus] ?? 99) <
          (rank[existing.registrationStatus] ?? 99)
      ) {
        byPhone.set(key, row);
      }
    }

    const lidToJaring = new Map<string, SenderJaringRecord>();
    const lidToPhone = new Map<string, string>();
    for (const session of sessions) {
      const lid = session.remoteJid;
      if (!lid) {
        continue;
      }
      const jaring = session.jaring;
      const existing = lidToJaring.get(lid);
      if (
        !existing ||
        (rank[jaring.registrationStatus] ?? 99) <
          (rank[existing.registrationStatus] ?? 99)
      ) {
        lidToJaring.set(lid, jaring);
      }
      if (session.senderPhone) {
        lidToPhone.set(lid, session.senderPhone);
      }
    }

    const approvedPhones: string[] = [];
    const unverifiedPhones: string[] = [];
    for (const [key, jaring] of byPhone) {
      if (jaring.registrationStatus === 'APPROVED') {
        approvedPhones.push(key);
      } else {
        unverifiedPhones.push(key);
      }
    }

    const approvedLids: string[] = [];
    const unverifiedLids: string[] = [];
    for (const [lid, jaring] of lidToJaring) {
      if (jaring.registrationStatus === 'APPROVED') {
        approvedLids.push(lid);
      } else {
        unverifiedLids.push(lid);
      }
    }

    return {
      byPhone,
      lidToJaring,
      lidToPhone,
      approvedPhones,
      unverifiedPhones,
      allPhones: [...byPhone.keys()],
      approvedLids,
      unverifiedLids,
      allLids: [...lidToJaring.keys()],
    };
  }

  private normalizeSenderKey(raw: string): string | null {
    if (!raw) {
      return null;
    }
    try {
      return normalizeIndonesianPhoneNumber(raw);
    } catch {
      const digits = raw.replace(/\D+/g, '');
      return digits || null;
    }
  }

  async whatsappNotificationRecipients() {
    return this.prisma.whatsAppNotificationRecipient.findMany({
      orderBy: [{ isActive: 'desc' }, { email: 'asc' }],
    });
  }

  async createWhatsappNotificationRecipients(
    body: CreateWhatsappNotificationRecipientDto,
    context: AuthorizationContext,
  ) {
    const emails = [
      ...new Set(
        body.emails.map((email) => this.normalizeNotificationEmail(email)),
      ),
    ].filter(Boolean);

    if (emails.length === 0) {
      throw new ApiException(
        'WHATSAPP_NOTIFICATION_EMAIL_REQUIRED',
        'Minimal satu email penerima notifikasi wajib diisi.',
        400,
      );
    }

    await this.prisma.$transaction(
      emails.map((email) =>
        this.prisma.whatsAppNotificationRecipient.upsert({
          where: { email },
          create: {
            email,
            label: body.label?.trim() || null,
            isActive: body.isActive ?? true,
            notifyOnConnected: body.notifyOnConnected ?? true,
            notifyOnDisconnected: body.notifyOnDisconnected ?? true,
            notifyOnError: body.notifyOnError ?? true,
          },
          update: {
            ...(body.label !== undefined
              ? { label: body.label?.trim() || null }
              : {}),
            ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
            ...(body.notifyOnConnected !== undefined
              ? { notifyOnConnected: body.notifyOnConnected }
              : {}),
            ...(body.notifyOnDisconnected !== undefined
              ? { notifyOnDisconnected: body.notifyOnDisconnected }
              : {}),
            ...(body.notifyOnError !== undefined
              ? { notifyOnError: body.notifyOnError }
              : {}),
          },
        }),
      ),
    );

    await this.audit(
      context,
      'INTEGRATION.WHATSAPP_NOTIFICATION_RECIPIENTS.UPSERT',
      'whatsapp-notification',
      { emails },
    );

    return this.whatsappNotificationRecipients();
  }

  async updateWhatsappNotificationRecipient(
    id: string,
    body: UpdateWhatsappNotificationRecipientDto,
    context: AuthorizationContext,
  ) {
    const updated = await this.prisma.whatsAppNotificationRecipient.update({
      where: { id },
      data: {
        ...(body.email !== undefined
          ? { email: this.normalizeNotificationEmail(body.email) }
          : {}),
        ...(body.label !== undefined
          ? { label: body.label?.trim() || null }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.notifyOnConnected !== undefined
          ? { notifyOnConnected: body.notifyOnConnected }
          : {}),
        ...(body.notifyOnDisconnected !== undefined
          ? { notifyOnDisconnected: body.notifyOnDisconnected }
          : {}),
        ...(body.notifyOnError !== undefined
          ? { notifyOnError: body.notifyOnError }
          : {}),
      },
    });

    await this.audit(
      context,
      'INTEGRATION.WHATSAPP_NOTIFICATION_RECIPIENT.UPDATE',
      id,
      { email: updated.email },
    );

    return updated;
  }

  async removeWhatsappNotificationRecipient(
    id: string,
    context: AuthorizationContext,
  ) {
    const deleted = await this.prisma.whatsAppNotificationRecipient.delete({
      where: { id },
    });

    await this.audit(
      context,
      'INTEGRATION.WHATSAPP_NOTIFICATION_RECIPIENT.DELETE',
      id,
      { email: deleted.email },
    );

    return { id };
  }

  async create(body: CreateIntegrationDto, context: AuthorizationContext) {
    const config = this.whatsappBotRuntime.isWhatsAppChannel(body.channelType)
      ? {
          ...body.config,
          userId:
            typeof body.config.userId === 'string'
              ? body.config.userId
              : context.userProfileId,
        }
      : body.config;
    if (this.whatsappBotRuntime.isWhatsAppChannel(body.channelType)) {
      await this.validateWhatsappScopeConfig(config);
    }

    const channel = await this.prisma.integrationChannel.create({
      data: {
        ...body,
        code: await this.resolveUniqueCode(body.code),
        config: this.vault.encrypt(config),
      },
    });
    await this.audit(context, 'INTEGRATION.CREATE', channel.id);
    return this.view(channel);
  }

  /**
   * Satu wilayah boleh memiliki lebih dari satu nomor WhatsApp. Karena `code`
   * unik, tambahkan suffix acak bila basis code (mis. `WA_<koordinator>_<area>`)
   * sudah dipakai channel lain, agar kanal kedua untuk wilayah yang sama tetap bisa dibuat.
   */
  private async resolveUniqueCode(baseCode: string): Promise<string> {
    const trimmed = baseCode.trim().slice(0, 80);
    const existing = await this.prisma.integrationChannel.findUnique({
      where: { code: trimmed },
      select: { id: true },
    });
    if (!existing) return trimmed;
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `${trimmed.slice(0, 74)}_${suffix}`;
  }

  async detail(id: string) {
    return this.view(
      await this.prisma.integrationChannel.findFirstOrThrow({
        where: { id, deletedAt: null },
      }),
    );
  }

  async update(
    id: string,
    body: UpdateIntegrationDto,
    context: AuthorizationContext,
  ) {
    const existing = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    const channel = await this.prisma.integrationChannel.update({
      where: { id: existing.id },
      data: {
        ...(body.name ? { name: body.name } : {}),
        ...(body.configPatch
          ? { config: this.vault.encrypt(body.configPatch) }
          : {}),
      },
    });
    await this.audit(context, 'INTEGRATION.UPDATE', id);
    return this.view(channel);
  }

  async updateWhatsappControl(
    id: string,
    body: UpdateWhatsappControlDto,
    context: AuthorizationContext,
  ) {
    const existing = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
    });
    const { config: currentConfig, requiresReconfiguration: configRecovered } =
      this.readConfigSafely(existing.config);
    const senderNumbers = body.senderNumbers
      ?.map((item) => normalizeIndonesianPhoneNumber(item.trim()))
      .filter(Boolean);
    const scopeAreaIds =
      body.scopeAreaIds !== undefined
        ? [
            ...new Set(
              body.scopeAreaIds.map((item) => item.trim()).filter(Boolean),
            ),
          ]
        : undefined;

    const mergedConfig = {
      ...currentConfig,
      ...(configRecovered ? { userId: context.userProfileId } : {}),
      ...(body.botLabel !== undefined ? { botLabel: body.botLabel } : {}),
      ...(body.provider !== undefined ? { provider: body.provider } : {}),
      ...(body.botPhoneNumber !== undefined
        ? {
            botPhoneNumber: body.botPhoneNumber
              ? normalizeIndonesianPhoneNumber(body.botPhoneNumber)
              : null,
          }
        : {}),
      ...(body.pairingMethod !== undefined
        ? { pairingMethod: body.pairingMethod }
        : {}),
      ...(body.userId !== undefined ? { userId: body.userId } : {}),
      ...(senderNumbers !== undefined ? { senderNumbers } : {}),
      ...(scopeAreaIds !== undefined
        ? {
            scopeAreaIds,
            scopeAreaId: scopeAreaIds[0] ?? null,
          }
        : {}),
    };

    await this.validateWhatsappScopeConfig(mergedConfig);

    await this.prisma.$transaction(async (tx) => {
      await tx.integrationChannel.update({
        where: { id },
        data: {
          ...(body.name ? { name: body.name } : {}),
          config: this.vault.encrypt(mergedConfig),
        },
      });

      if (senderNumbers !== undefined) {
        await tx.whatsAppSenderNumber.updateMany({
          where: { integrationChannelId: id },
          data: { isActive: false, isPrimary: false },
        });

        for (const [index, phoneNumber] of senderNumbers.entries()) {
          await tx.whatsAppSenderNumber.upsert({
            where: {
              integrationChannelId_phoneNumber: {
                integrationChannelId: id,
                phoneNumber,
              },
            },
            create: {
              integrationChannelId: id,
              phoneNumber,
              isActive: true,
              isPrimary: index === 0,
            },
            update: {
              isActive: true,
              isPrimary: index === 0,
            },
          });
        }
      }
    });

    await this.audit(context, 'INTEGRATION.WHATSAPP_CONTROL.UPDATE', id, {
      senderCount: senderNumbers?.length ?? null,
      scopeAreaCount: scopeAreaIds?.length ?? null,
      configRecovered,
    });
    return this.whatsappControlDetail(id);
  }

  async requestWhatsappQr(
    id: string,
    body: RequestWhatsappQrDto | undefined,
    context: AuthorizationContext,
  ) {
    await this.whatsappBotRuntime.requestFreshQr(id, {
      resetSession: body?.resetSession === true,
    });
    await this.audit(context, 'INTEGRATION.WHATSAPP_CONTROL.REQUEST_QR', id, {
      resetSession: body?.resetSession === true,
    });
    return this.whatsappControlDetail(id);
  }

  async activate(id: string, body: ReasonDto, context: AuthorizationContext) {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (this.whatsappBotRuntime.isWhatsAppChannel(channel.channelType)) {
      await this.whatsappBotRuntime.activateChannel(id);
    } else {
      await this.prisma.integrationChannel.update({
        where: { id },
        data: { status: IntegrationStatus.ACTIVE, lastHealthAt: new Date() },
      });
    }

    await this.audit(context, 'INTEGRATION.ACTIVATE', id, {
      reason: body.reason,
    });
    return this.detail(id);
  }

  async deactivate(id: string, body: ReasonDto, context: AuthorizationContext) {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (this.whatsappBotRuntime.isWhatsAppChannel(channel.channelType)) {
      await this.whatsappBotRuntime.deactivateChannel(id);
    } else {
      await this.prisma.integrationChannel.update({
        where: { id },
        data: { status: IntegrationStatus.INACTIVE },
      });
    }

    await this.audit(context, 'INTEGRATION.DEACTIVATE', id, {
      reason: body.reason,
    });
    return this.detail(id);
  }

  async test(
    id: string,
    body: TestIntegrationDto,
    context: AuthorizationContext,
  ) {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (this.whatsappBotRuntime.isWhatsAppChannel(channel.channelType)) {
      await this.whatsappBotRuntime.healthCheck(id);
    } else {
      await this.prisma.integrationChannel.update({
        where: { id },
        data: { lastHealthAt: new Date() },
      });
    }

    await this.audit(context, 'INTEGRATION.TEST', id, {
      mode: body.mode,
      target: body.target ?? null,
    });
    return this.whatsappBotRuntime.isWhatsAppChannel(channel.channelType)
      ? this.whatsappControlDetail(id)
      : {
          channelId: channel.id,
          mode: body.mode,
          healthy: channel.status === IntegrationStatus.ACTIVE,
          testedAt: new Date(),
        };
  }

  private async whatsappControlDetail(id: string) {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        botState: true,
        senderNumbers: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { phoneNumber: 'asc' }],
        },
      },
    });

    return this.whatsappControlView(channel);
  }

  async events(id: string, query: WebhookQuery) {
    return this.prisma.integrationWebhookEvent.findMany({
      where: {
        channelId: id,
        channel: { deletedAt: null },
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.success === undefined ? {} : { success: query.success }),
      },
      take: query.limit,
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        channelId: true,
        externalEventId: true,
        eventType: true,
        senderPhone: true,
        receivedAt: true,
        processedAt: true,
        success: true,
        errorMessage: true,
        payload: true,
      },
    });
  }

  async event(id: string) {
    return this.prisma.integrationWebhookEvent.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        channelId: true,
        externalEventId: true,
        eventType: true,
        senderPhone: true,
        receivedAt: true,
        processedAt: true,
        success: true,
        errorMessage: true,
        payload: true,
      },
    });
  }

  async retry(id: string, body: ReasonDto, context: AuthorizationContext) {
    const event = await this.prisma.integrationWebhookEvent.findUniqueOrThrow({
      where: { id },
    });
    if (event.success === true) {
      throw new ApiException(
        'WEBHOOK_ALREADY_PROCESSED',
        'Successful webhook cannot be retried.',
        409,
      );
    }
    return this.jobs.enqueue({
      type: 'WEBHOOK_RETRY',
      payload: { eventId: id, reason: body.reason },
      requestedById: context.primaryAssignmentId,
      correlationId: id,
    });
  }

  async remove(id: string, context: AuthorizationContext) {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { id, deletedAt: null },
    });

    if (
      channel.channelType.includes('WHATSAPP') ||
      channel.channelType.includes('WA')
    ) {
      await this.whatsappBotRuntime.removeChannelConnection(id);
    }

    const deletedAt = new Date();
    await this.prisma.integrationChannel.update({
      where: { id },
      data: {
        code: this.archivedCode(channel.code, deletedAt),
        status: IntegrationStatus.INACTIVE,
        deletedAt,
      },
    });

    await this.audit(context, 'INTEGRATION.DELETE', id);
    return { success: true, message: 'Channel berhasil dihapus' };
  }
}
