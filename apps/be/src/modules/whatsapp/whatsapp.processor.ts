import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  AreaResolutionMethod,
  CoordinateSource,
  Prisma,
  WhatsAppMessageStatus,
} from '../../generated/prisma/client.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JobHandlerRegistry } from '../runtime/job-handler.registry.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { WhatsAppChannelScopeService } from './whatsapp-channel-scope.service.js';
type MessagePayload = {
  externalMessageId: string;
  senderPhone: string;
  receivedAt: string;
  content?: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracyMeters?: number;
  rawPayload?: Record<string, unknown>;
};
@Injectable()
export class WhatsAppProcessor implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly handlers: JobHandlerRegistry,
    private readonly spatial: SpatialRepository,
    private readonly channelScope: WhatsAppChannelScopeService,
  ) {}
  onModuleInit() {
    this.handlers.register('WHATSAPP_PROCESS', (payload) =>
      this.process(payload as { eventId: string; message: MessagePayload }),
    );
  }
  private async process(input: { eventId: string; message: MessagePayload }) {
    const event = await this.prisma.integrationWebhookEvent.findUniqueOrThrow({
      where: { id: input.eventId },
      include: { channel: true },
    });
    const phone = normalizeIndonesianPhoneNumber(input.message.senderPhone);
    const jaring = await this.prisma.jaring.findFirst({
      where: {
        whatsappNumber: phone,
        registrationStatus: 'APPROVED',
        deletedAt: null,
      },
      include: {
        caretakerAssignments: {
          where: { isActive: true, validUntil: null },
          take: 1,
        },
        areaCoverages: {
          where: { validUntil: null },
          select: { areaId: true },
        },
      },
    });
    const isInChannelScope = jaring
      ? await this.channelScope.isJaringAllowed(
          event.channel,
          jaring.areaCoverages.map((coverage) => coverage.areaId),
        )
      : false;

    if (!jaring || !isInChannelScope) {
      await this.prisma.integrationWebhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date(), success: true, errorMessage: null },
      });
      return { messageId: null, ignored: true };
    }
    const hasCoordinates =
      Number.isFinite(input.message.latitude) &&
      Number.isFinite(input.message.longitude);
    const areaResolution = hasCoordinates
      ? await this.spatial.resolveReportArea(
          input.message.latitude as number,
          input.message.longitude as number,
        )
      : null;
    const areaResolutionData = areaResolution
      ? {
          resolvedAreaId: areaResolution.area?.areaId ?? null,
          areaResolutionMethod: areaResolution.method,
          areaResolutionConfidence: areaResolution.confidence,
          areaResolvedAt: areaResolution.resolvedAt,
        }
      : {};
    const message = await this.prisma.whatsAppMessage.upsert({
      where: {
        integrationChannelId_externalMessageId: {
          integrationChannelId: event.channelId,
          externalMessageId: input.message.externalMessageId,
        },
      },
      update: areaResolutionData,
      create: {
        integrationChannelId: event.channelId,
        externalMessageId: input.message.externalMessageId,
        senderPhone: phone,
        jaringId: jaring.id,
        routedToFieldOfficerAssignmentId:
          jaring.caretakerAssignments[0]?.fieldOfficerAssignmentId,
        content: input.message.content,
        latitude: input.message.latitude,
        longitude: input.message.longitude,
        gpsAccuracyMeters: input.message.gpsAccuracyMeters,
        coordinateSource:
          input.message.latitude !== undefined
            ? CoordinateSource.WHATSAPP_LOCATION
            : null,
        areaResolutionMethod: AreaResolutionMethod.UNRESOLVED,
        ...areaResolutionData,
        status: WhatsAppMessageStatus.RECEIVED,
        rawPayload: (input.message.rawPayload ??
          input.message) as unknown as Prisma.InputJsonValue,
        receivedAt: new Date(input.message.receivedAt),
      },
    });
    await this.prisma.integrationWebhookEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), success: true, errorMessage: null },
    });
    return { messageId: message.id };
  }
}
