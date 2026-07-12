import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  AreaResolutionMethod,
  CoordinateSource,
  Prisma,
  WhatsAppMessageStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { canonicalJson } from '../../common/utils/canonical-json.js';
import {
  SecretVaultService,
  type EncryptedValue,
} from '../infrastructure/secret-vault.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import type {
  DuplicateDto,
  AssignCategoryDto,
  LinkDto,
  MessageQuery,
  ReasonDto,
  ResolveDto,
  WebhookDto,
} from './whatsapp.dto.js';

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialRepository,
    private readonly vault: SecretVaultService,
  ) {}

  private detail(id: string) {
    return this.prisma.whatsAppMessage.findUniqueOrThrow({
      where: { id },
      include: {
        integrationChannel: true,
        jaring: true,
        category: true,
        resolvedArea: true,
        media: {
          include: {
            file: {
              select: {
                id: true,
                storageKey: true,
                originalName: true,
                mimeType: true,
                fileType: true,
                checksumSha256: true,
                lifecycleStatus: true,
                scanResult: true,
                scannedAt: true,
                quarantineReason: true,
                retentionUntil: true,
                createdByAssignmentId: true,
                createdAt: true,
                deletedAt: true,
              },
            },
          },
        },
        validationIssues: true,
        routingLogs: true,
      },
    });
  }

  async webhook(code: string, signature: string | undefined, body: WebhookDto) {
    const channel = await this.prisma.integrationChannel.findUniqueOrThrow({
      where: { code },
    });
    const cfg = channel.config as unknown as Record<string, unknown>;
    let secret: string | undefined;

    if (cfg && cfg.algorithm === 'aes-256-gcm') {
      secret = this.vault.decrypt<Record<string, unknown>>(
        cfg as unknown as EncryptedValue,
      ).webhookSecret as string | undefined;
    } else {
      secret = cfg?.webhookSecret as string | undefined;
    }

    if (!secret || !signature) {
      throw new ApiException(
        'WEBHOOK_SIGNATURE_INVALID',
        'Webhook signature is missing or channel is not configured.',
        401,
      );
    }

    const expected = createHmac('sha256', secret)
      .update(canonicalJson(body))
      .digest();
    const supplied = Buffer.from(signature.replace(/^sha256=/, ''), 'hex');

    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      throw new ApiException(
        'WEBHOOK_SIGNATURE_INVALID',
        'Webhook signature is invalid.',
        401,
      );
    }

    const existing = await this.prisma.integrationWebhookEvent.findUnique({
      where: {
        channelId_externalEventId: {
          channelId: channel.id,
          externalEventId: body.externalEventId,
        },
      },
    });
    if (existing) {
      return { eventId: existing.id, duplicate: true };
    }

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await tx.integrationWebhookEvent.create({
        data: {
          channelId: channel.id,
          externalEventId: body.externalEventId,
          eventType: 'WHATSAPP_MESSAGE',
          payload: (body.rawPayload ?? body) as Prisma.InputJsonValue,
        },
      });
      await tx.asyncJob.create({
        data: {
          type: 'WHATSAPP_PROCESS',
          payload: {
            eventId: created.id,
            message: body,
          } as unknown as Prisma.InputJsonValue,
          correlationId: body.externalEventId,
        },
      });
      return created;
    });

    return { eventId: event.id, accepted: true };
  }

  async list(query: MessageQuery) {
    return this.prisma.whatsAppMessage.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.jaringId ? { jaringId: query.jaringId } : {}),
      },
      take: query.limit,
      orderBy: { receivedAt: 'desc' },
      include: {
        jaring: true,
        category: true,
        resolvedArea: true,
        validationIssues: true,
        media: true,
      },
    });
  }

  async get(id: string) {
    return this.detail(id);
  }

  async link(id: string, body: LinkDto) {
    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: { jaringId: body.jaringId },
    });
    return this.detail(id);
  }

  async assignCategory(id: string, body: AssignCategoryDto) {
    const category = await this.prisma.reportCategory.findUnique({
      where: { id: body.categoryId },
    });

    if (!category || !category.isActive) {
      throw new ApiException(
        'REPORT_CATEGORY_NOT_FOUND',
        'Kategori laporan tidak aktif atau tidak ditemukan.',
        422,
      );
    }

    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: { categoryId: category.id },
    });

    return this.detail(id);
  }

  async validate(id: string) {
    const message = await this.detail(id);
    const rawPayload =
      message.rawPayload &&
      typeof message.rawPayload === 'object' &&
      !Array.isArray(message.rawPayload)
        ? (message.rawPayload as Record<string, unknown>)
        : null;
    const hasPhotoEvidence =
      message.media.length > 0 ||
      (typeof rawPayload?.photoMessageId === 'string' &&
        rawPayload.photoMessageId.length > 0);
    const issues = [
      ...(!message.title ? [['MISSING_TITLE', 'Judul wajib tersedia']] : []),
      ...(!message.content ? [['MISSING_CONTENT', 'Isi wajib tersedia']] : []),
      ...(message.latitude === null || message.longitude === null
        ? [['MISSING_GPS', 'GPS wajib tersedia']]
        : []),
      ...(!hasPhotoEvidence
        ? [['MISSING_PHOTO', 'Foto wajib tersedia']]
        : []),
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.whatsAppValidationIssue.deleteMany({ where: { messageId: id } });
      if (issues.length) {
        await tx.whatsAppValidationIssue.createMany({
          data: issues.map(([code, issueMessage]) => ({
            messageId: id,
            code,
            message: issueMessage,
          })),
        });
      }
      await tx.whatsAppMessage.update({
        where: { id },
        data: {
          validationSummary: issues.length
            ? WhatsAppValidationSummary.INVALID
            : WhatsAppValidationSummary.VALID,
          status: WhatsAppMessageStatus.UNDER_REVIEW,
        },
      });
    });
    return this.detail(id);
  }

  async resolve(id: string, body: ResolveDto) {
    const message = await this.prisma.whatsAppMessage.findUniqueOrThrow({
      where: { id },
    });
    let areaId = body.areaId;
    let method: AreaResolutionMethod = AreaResolutionMethod.MANUAL_CONFIRMATION;

    if (!areaId && message.latitude !== null && message.longitude !== null) {
      const matches = await this.spatial.findContainingAreas(
        Number(message.latitude),
        Number(message.longitude),
      );
      areaId = matches[0]?.areaId;
      method = AreaResolutionMethod.POLYGON_MATCH;
    }

    if (!areaId) {
      throw new ApiException(
        'AREA_UNRESOLVED',
        'Message coordinate cannot be resolved.',
        422,
      );
    }

    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: {
        resolvedAreaId: areaId,
        areaResolutionMethod: method,
        areaResolutionConfidence:
          method === AreaResolutionMethod.POLYGON_MATCH ? 100 : null,
        areaResolvedAt: new Date(),
      },
    });

    return this.detail(id);
  }

  async route(id: string, context: AuthorizationContext) {
    const message = await this.prisma.whatsAppMessage.findUniqueOrThrow({
      where: { id },
    });
    if (!message.jaringId) {
      throw new ApiException(
        'JARING_REQUIRED',
        'Message must be linked to Jaring.',
        422,
      );
    }

    const caretaker = await this.prisma.jaringCaretakerAssignment.findFirst({
      where: { jaringId: message.jaringId, isActive: true, validUntil: null },
    });
    if (!caretaker) {
      throw new ApiException(
        'CARETAKER_NOT_FOUND',
        'Jaring has no active caretaker.',
        422,
      );
    }

    await this.prisma.$transaction([
      this.prisma.whatsAppMessage.update({
        where: { id },
        data: {
          routedToFieldOfficerAssignmentId: caretaker.fieldOfficerAssignmentId,
          status: WhatsAppMessageStatus.ROUTED,
          processedAt: new Date(),
        },
      }),
      this.prisma.whatsAppRoutingLog.create({
        data: {
          messageId: id,
          routedToAssignmentId: caretaker.fieldOfficerAssignmentId,
          action: 'ROUTED',
          note: `Routed by ${context.primaryAssignmentId}`,
        },
      }),
    ]);

    return this.detail(id);
  }

  async spam(id: string, body: ReasonDto) {
    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: { status: WhatsAppMessageStatus.SPAM },
    });
    await this.prisma.whatsAppRoutingLog.create({
      data: { messageId: id, action: 'MARKED_SPAM', note: body.reason },
    });
    return this.detail(id);
  }

  async duplicate(id: string, body: DuplicateDto) {
    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: { status: WhatsAppMessageStatus.DUPLICATE },
    });
    await this.prisma.whatsAppRoutingLog.create({
      data: {
        messageId: id,
        action: 'MARKED_DUPLICATE',
        note: `Duplicate of ${body.duplicateOfMessageId}. ${body.reason ?? ''}`,
      },
    });
    return this.detail(id);
  }

  async logs(id: string) {
    return this.prisma.whatsAppRoutingLog.findMany({
      where: { messageId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createBaket(id: string, context: AuthorizationContext) {
    const message = await this.prisma.whatsAppMessage.findUniqueOrThrow({
      where: { id },
    });
    if (message.validationSummary !== WhatsAppValidationSummary.VALID) {
      throw new ApiException(
        'MESSAGE_VALIDATION_REQUIRED',
        'Message must pass validation.',
        422,
      );
    }
    return this.prisma.baket.create({
      data: {
        createdByFieldOfficerAssignmentId: context.primaryAssignmentId,
        primaryJaringId: message.jaringId,
        versions: {
          create: {
            versionNumber: 1,
            title: message.title ?? 'Laporan Jaring',
            originalContent: message.content ?? '',
            eventAreaId: message.resolvedAreaId,
            latitude: message.latitude,
            longitude: message.longitude,
            gpsAccuracyMeters: message.gpsAccuracyMeters,
            locationCapturedAt: message.locationCapturedAt,
            coordinateSource:
              message.coordinateSource ?? CoordinateSource.WHATSAPP_LOCATION,
            areaResolutionMethod: message.areaResolutionMethod,
            areaResolutionConfidence: message.areaResolutionConfidence,
            areaResolvedAt: message.areaResolvedAt,
            createdByAssignmentId: context.primaryAssignmentId,
            sourceMessages: { create: { messageId: id } },
          },
        },
      },
    });
  }

  async summary() {
    const grouped = await this.prisma.whatsAppMessage.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    return {
      statuses: Object.fromEntries(
        grouped.map((group) => [group.status, group._count._all]),
      ),
      total: grouped.reduce((count, group) => count + group._count._all, 0),
    };
  }
}
