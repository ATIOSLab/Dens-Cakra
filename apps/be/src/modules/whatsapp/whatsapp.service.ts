import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  BaketStatus,
  CoordinateSource,
  FileLifecycleStatus,
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
  AssignCategoryDto,
  CreateBaketFromMessageDto,
  MessageQuery,
  ReasonDto,
  WebhookDto,
} from './whatsapp.dto.js';

const publicFileSelect = {
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
} satisfies Prisma.FileAssetSelect;

@Injectable()
export class WhatsAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialRepository,
    private readonly vault: SecretVaultService,
  ) {}

  private detail(id: string, assignmentId?: string) {
    return this.prisma.whatsAppMessage.findFirstOrThrow({
      where: {
        id,
        ...(assignmentId
          ? { routedToFieldOfficerAssignmentId: assignmentId }
          : {}),
      },
      include: {
        integrationChannel: true,
        jaring: {
          include: {
            areaCoverages: { include: { area: true } },
          },
        },
        category: true,
        convertedBaket: {
          include: {
            reportCategory: true,
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        },
        resolvedArea: true,
        media: {
          orderBy: { orderNo: 'asc' },
          include: {
            file: { select: publicFileSelect },
          },
        },
        reportAmendments: {
          orderBy: { createdAt: 'asc' },
          include: {
            file: { select: publicFileSelect },
          },
        },
        validationIssues: true,
        routingLogs: true,
      },
    });
  }

  async webhook(code: string, signature: string | undefined, body: WebhookDto) {
    const channel = await this.prisma.integrationChannel.findFirstOrThrow({
      where: { code, deletedAt: null },
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

  async list(query: MessageQuery, context: AuthorizationContext) {
    return this.prisma.whatsAppMessage.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.jaringId ? { jaringId: query.jaringId } : {}),
        routedToFieldOfficerAssignmentId: context.primaryAssignmentId,
      },
      take: query.limit,
      orderBy: { receivedAt: 'desc' },
      include: {
        jaring: {
          include: {
            areaCoverages: { include: { area: true } },
          },
        },
        category: true,
        convertedBaket: {
          include: {
            reportCategory: true,
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        },
        resolvedArea: true,
        validationIssues: true,
        media: {
          orderBy: { orderNo: 'asc' },
          include: { file: { select: publicFileSelect } },
        },
        reportAmendments: {
          orderBy: { createdAt: 'asc' },
          include: { file: { select: publicFileSelect } },
        },
      },
    });
  }

  async assignCategory(
    id: string,
    body: AssignCategoryDto,
    context: AuthorizationContext,
  ) {
    await this.detail(id, context.primaryAssignmentId);
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

    return this.detail(id, context.primaryAssignmentId);
  }

  async validate(id: string, context: AuthorizationContext) {
    const message = await this.detail(id, context.primaryAssignmentId);
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
      ...(!message.content ? [['MISSING_CONTENT', 'Isi wajib tersedia']] : []),
      ...(!message.senderPhone
        ? [['MISSING_SOURCE', 'Identitas pengirim wajib tersedia']]
        : []),
      ...(!message.jaringId
        ? [['MISSING_JARING', 'Sumber Jaring wajib tersedia']]
        : []),
      ...(!message.receivedAt
        ? [['MISSING_TIME', 'Waktu penerimaan wajib tersedia']]
        : []),
      ...(message.latitude === null || message.longitude === null
        ? [['MISSING_GPS', 'GPS wajib tersedia']]
        : []),
      ...(message.latitude !== null &&
      message.longitude !== null &&
      !message.resolvedAreaId
        ? [
            [
              'UNRESOLVED_AREA',
              'Wilayah administratif dari koordinat belum berhasil ditentukan',
            ],
          ]
        : []),
      ...(!hasPhotoEvidence ? [['MISSING_PHOTO', 'Foto wajib tersedia']] : []),
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
          status: issues.length
            ? WhatsAppMessageStatus.UNDER_REVIEW
            : WhatsAppMessageStatus.READY_FOR_BAKET,
        },
      });
    });
    return this.detail(id, context.primaryAssignmentId);
  }

  async spam(id: string, body: ReasonDto, context: AuthorizationContext) {
    await this.detail(id, context.primaryAssignmentId);
    await this.prisma.whatsAppMessage.update({
      where: { id },
      data: { status: WhatsAppMessageStatus.SPAM },
    });
    await this.prisma.whatsAppRoutingLog.create({
      data: { messageId: id, action: 'MARKED_SPAM', note: body.reason },
    });
    return this.detail(id, context.primaryAssignmentId);
  }

  async createBaket(
    id: string,
    body: CreateBaketFromMessageDto,
    context: AuthorizationContext,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "WhatsAppMessage" WHERE id = ${id}::uuid FOR UPDATE`;
      const message = await tx.whatsAppMessage.findFirst({
        where: {
          id,
          routedToFieldOfficerAssignmentId: context.primaryAssignmentId,
        },
        include: {
          jaring: true,
          media: {
            include: {
              file: { select: { lifecycleStatus: true } },
            },
          },
        },
      });
      if (!message) {
        throw new ApiException(
          'WHATSAPP_MESSAGE_NOT_FOUND',
          'Pesan tidak ditemukan.',
          404,
        );
      }
      if (message.convertedBaketId) {
        return tx.baket.findUniqueOrThrow({
          where: { id: message.convertedBaketId },
          include: {
            reportCategory: true,
            primaryJaring: true,
            versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
          },
        });
      }
      if (
        message.validationSummary !== WhatsAppValidationSummary.VALID ||
        message.status !== WhatsAppMessageStatus.READY_FOR_BAKET
      ) {
        throw new ApiException(
          'MESSAGE_NOT_READY_FOR_BAKET',
          'Pesan harus lolos validasi dan berada pada antrean Buat Baket.',
          422,
        );
      }
      const category = await tx.reportCategory.findFirst({
        where: { id: body.categoryId, isActive: true },
      });
      if (!category) {
        throw new ApiException(
          'REPORT_CATEGORY_NOT_FOUND',
          'Kategori laporan tidak aktif atau tidak ditemukan.',
          422,
        );
      }
      if (body.taskAssignmentId) {
        const taskAssignment = await tx.taskAssignment.findFirst({
          where: {
            id: body.taskAssignmentId,
            assigneeAssignmentId: context.primaryAssignmentId,
          },
        });
        if (!taskAssignment) {
          throw new ApiException(
            'TASK_ASSIGNMENT_NOT_FOUND',
            'Tugas terkait tidak ditemukan pada penugasan Petugas Wilayah (Gaswil).',
            404,
          );
        }
      }

      const usableFileStatuses: FileLifecycleStatus[] = [
        FileLifecycleStatus.CLEAN,
        FileLifecycleStatus.UPLOADED,
      ];
      const usableMedia = message.media.filter((item) =>
        usableFileStatuses.includes(item.file.lifecycleStatus),
      );
      if (!message.resolvedAreaId) {
        throw new ApiException(
          'MESSAGE_AREA_UNRESOLVED',
          'Wilayah laporan belum tersimpan. Selesaikan resolusi lokasi sebelum membuat Baket.',
          422,
        );
      }
      const eventAreaId = message.resolvedAreaId;
      const areaResolutionMethod = message.areaResolutionMethod;
      const areaResolutionConfidence = message.areaResolutionConfidence;
      const areaResolvedAt = message.areaResolvedAt;
      const baket = await tx.baket.create({
        data: {
          status: BaketStatus.READY_TO_SEND,
          createdByFieldOfficerAssignmentId: context.primaryAssignmentId,
          taskAssignmentId: body.taskAssignmentId,
          primaryJaringId: message.jaringId,
          reportCategoryId: category.id,
          versions: {
            create: {
              versionNumber: 1,
              originalContent: message.content ?? '',
              normalizedContent:
                body.normalizedContent?.trim() || message.content,
              eventAreaId,
              latitude: message.latitude,
              longitude: message.longitude,
              gpsAccuracyMeters: message.gpsAccuracyMeters,
              locationCapturedAt: message.locationCapturedAt,
              coordinateSource:
                message.coordinateSource ?? CoordinateSource.WHATSAPP_LOCATION,
              areaResolutionMethod,
              areaResolutionConfidence,
              areaResolvedAt,
              urgency: body.urgency,
              fieldOfficerNote: body.fieldOfficerNote,
              createdByAssignmentId: context.primaryAssignmentId,
              sourceMessages: { create: { messageId: id } },
              attachments: usableMedia.length
                ? {
                    create: usableMedia.map((item) => ({
                      fileId: item.fileId,
                      caption: item.caption,
                    })),
                  }
                : undefined,
            },
          },
        },
        include: {
          reportCategory: true,
          primaryJaring: true,
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      });
      await tx.whatsAppMessage.update({
        where: { id },
        data: {
          convertedBaketId: baket.id,
          categoryId: category.id,
          status: WhatsAppMessageStatus.PROCESSED,
          processedAt: new Date(),
          resolvedAreaId: eventAreaId,
          areaResolutionMethod,
          areaResolutionConfidence,
          areaResolvedAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorUserProfileId: context.userProfileId,
          actorAssignmentId: context.primaryAssignmentId,
          action: 'WHATSAPP_MESSAGE.CONVERT_TO_BAKET',
          entityType: 'Baket',
          entityId: baket.id,
          metadata: {
            messageId: id,
            categoryId: category.id,
            urgency: body.urgency,
          },
        },
      });
      return baket;
    });
  }
}
