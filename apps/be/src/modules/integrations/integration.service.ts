import { Injectable } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import { SecretVaultService } from '../infrastructure/secret-vault.service.js';
import type { EncryptedValue } from '../infrastructure/secret-vault.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import type {
  CreateIntegrationDto,
  IntegrationQuery,
  ReasonDto,
  TestIntegrationDto,
  UpdateIntegrationDto,
  UpdateWhatsappControlDto,
  WebhookQuery,
} from './integration.dto.js';
import { WhatsappBotRuntimeService } from './whatsapp-bot-runtime.service.js';

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
                include: { area: true },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              },
            },
          },
        },
      });

      const userMap = new Map((users as any[]).map((u) => [u.id, u]));

      for (const view of views) {
        if (view.userId && userMap.has(view.userId)) {
          const user = userMap.get(view.userId);
          if (user) {
            view['coordinatorName'] = user.fullName;
            const activeAssignment = user.operationalAssignments?.find(
              (pa) => pa.isActive,
            );
            view['coordinatorRegion'] =
              activeAssignment?.areaScopes?.[0]?.area?.name || null;
          }
        }
      }
    }

    return views;
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
    const channel = await this.prisma.integrationChannel.create({
      data: { ...body, config: this.vault.encrypt(config) },
    });
    await this.audit(context, 'INTEGRATION.CREATE', channel.id);
    return this.view(channel);
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
    };

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
      configRecovered,
    });
    return this.whatsappControlDetail(id);
  }

  async requestWhatsappQr(id: string, context: AuthorizationContext) {
    await this.whatsappBotRuntime.requestFreshQr(id);
    await this.audit(context, 'INTEGRATION.WHATSAPP_CONTROL.REQUEST_QR', id);
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
        receivedAt: true,
        processedAt: true,
        success: true,
        errorMessage: true,
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
        receivedAt: true,
        processedAt: true,
        success: true,

        errorMessage: true,
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
      await this.whatsappBotRuntime.deleteChannelSession(id);
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
