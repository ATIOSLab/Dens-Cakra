import { Injectable } from '@nestjs/common';
import { IntegrationStatus, Prisma } from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { SecretVaultService } from '../infrastructure/secret-vault.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AsyncJobService } from '../runtime/async-job.service.js';
import type {
  CreateIntegrationDto,
  IntegrationQuery,
  ReasonDto,
  TestIntegrationDto,
  UpdateIntegrationDto,
  WebhookQuery,
} from './integration.dto.js';

@Injectable()
export class IntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: SecretVaultService,
    private readonly jobs: AsyncJobService,
  ) {}

  private view<T extends { config: unknown }>(channel: T) {
    return {
      ...channel,
      config: { redacted: true, configured: Boolean(channel.config) },
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
          ...(query.status ? { status: query.status } : {}),
          ...(query.channelType ? { channelType: query.channelType } : {}),
        },
        orderBy: { code: 'asc' },
      })
    ).map((channel) => this.view(channel));
  }

  async create(body: CreateIntegrationDto, context: AuthorizationContext) {
    const channel = await this.prisma.integrationChannel.create({
      data: { ...body, config: this.vault.encrypt(body.config) },
    });
    await this.audit(context, 'INTEGRATION.CREATE', channel.id);
    return this.view(channel);
  }

  async detail(id: string) {
    return this.view(
      await this.prisma.integrationChannel.findUniqueOrThrow({
        where: { id },
      }),
    );
  }

  async update(
    id: string,
    body: UpdateIntegrationDto,
    context: AuthorizationContext,
  ) {
    const channel = await this.prisma.integrationChannel.update({
      where: { id },
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

  async activate(id: string, body: ReasonDto, context: AuthorizationContext) {
    const channel = await this.prisma.integrationChannel.update({
      where: { id },
      data: { status: IntegrationStatus.ACTIVE, lastHealthAt: new Date() },
    });
    await this.audit(context, 'INTEGRATION.ACTIVATE', id, {
      reason: body.reason,
    });
    return this.view(channel);
  }

  async deactivate(id: string, body: ReasonDto, context: AuthorizationContext) {
    const channel = await this.prisma.integrationChannel.update({
      where: { id },
      data: { status: IntegrationStatus.INACTIVE },
    });
    await this.audit(context, 'INTEGRATION.DEACTIVATE', id, {
      reason: body.reason,
    });
    return this.view(channel);
  }

  async test(
    id: string,
    body: TestIntegrationDto,
    context: AuthorizationContext,
  ) {
    const channel = await this.prisma.integrationChannel.update({
      where: { id },
      data: { lastHealthAt: new Date() },
    });
    await this.audit(context, 'INTEGRATION.TEST', id, {
      mode: body.mode,
      target: body.target ?? null,
    });
    return {
      channelId: channel.id,
      mode: body.mode,
      healthy: channel.status === IntegrationStatus.ACTIVE,
      testedAt: channel.lastHealthAt,
    };
  }

  async events(id: string, query: WebhookQuery) {
    return this.prisma.integrationWebhookEvent.findMany({
      where: {
        channelId: id,
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
}
