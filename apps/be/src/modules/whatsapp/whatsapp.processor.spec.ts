import { jest } from '@jest/globals';
import {
  AreaResolutionMethod,
  WhatsAppMessageStatus,
} from '../../generated/prisma/client.js';
import { JobHandlerRegistry } from '../runtime/job-handler.registry.js';
import { WhatsAppProcessor } from './whatsapp.processor.js';

const payload = {
  eventId: 'event-id',
  message: {
    externalMessageId: 'message-id',
    senderPhone: '081234567890',
    receivedAt: '2026-07-14T02:19:00.000Z',
    title: 'Laporan Jaring',
    content: 'Isi laporan',
    latitude: 0.4797112,
    longitude: 101.4313293,
  },
};

function createProcessor(
  areaId: string | null,
  options: { registered?: boolean; allowed?: boolean } = {},
) {
  const upsert = jest.fn(({ create }: { create: Record<string, unknown> }) => ({
    id: 'whatsapp-message-id',
    ...create,
  }));
  const prisma = {
    integrationWebhookEvent: {
      findUniqueOrThrow: jest.fn(() => ({
        id: payload.eventId,
        channelId: 'channel-id',
        channel: { id: 'channel-id', config: { userId: 'channel-user-id' } },
      })),
      update: jest.fn(),
    },
    jaring: {
      findFirst: jest.fn(() =>
        options.registered === false
          ? null
          : {
              id: 'jaring-id',
              caretakerAssignments: [
                { fieldOfficerAssignmentId: 'field-officer-assignment-id' },
              ],
              areaCoverages: [{ areaId: 'area-jaring' }],
            },
      ),
    },
    whatsAppMessage: { upsert },
  };
  const spatial = {
    resolveReportArea: jest.fn(() => ({
      area: areaId
        ? {
            areaId,
            areaCode: '14.71',
            areaName: 'Kota Pekanbaru',
            areaLevel: 'CITY',
            boundaryId: 'boundary-id',
            qualityStatus: 'VERIFIED',
          }
        : null,
      method: areaId
        ? AreaResolutionMethod.POLYGON_MATCH
        : AreaResolutionMethod.UNRESOLVED,
      confidence: areaId ? 100 : null,
      resolvedAt: areaId ? new Date('2026-07-14T02:19:01.000Z') : null,
    })),
  };
  const handlers = new JobHandlerRegistry();
  const channelScope = {
    isJaringAllowed: jest.fn(() => options.allowed !== false),
  };
  const processor = new WhatsAppProcessor(
    prisma as never,
    handlers,
    spatial as never,
    channelScope as never,
  );
  processor.onModuleInit();

  return { handlers, spatial, upsert, channelScope, prisma };
}

describe('WhatsAppProcessor area resolution', () => {
  it('menyimpan area administratif hasil polygon saat koordinat diterima', async () => {
    const areaId = 'b947975c-b114-5c6f-a4a7-9fc007b0ccc6';
    const { handlers, spatial, upsert } = createProcessor(areaId);

    await handlers.get('WHATSAPP_PROCESS')?.(payload);

    expect(spatial.resolveReportArea).toHaveBeenCalledWith(
      payload.message.latitude,
      payload.message.longitude,
    );
    expect(upsert.mock.calls[0]?.[0].create).toMatchObject({
      resolvedAreaId: areaId,
      areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
      areaResolutionConfidence: 100,
      status: WhatsAppMessageStatus.RECEIVED,
    });
  });

  it('menyimpan status unresolved saat titik tidak masuk polygon mana pun', async () => {
    const { handlers, upsert } = createProcessor(null);

    await handlers.get('WHATSAPP_PROCESS')?.(payload);

    expect(upsert.mock.calls[0]?.[0].create).toMatchObject({
      resolvedAreaId: null,
      areaResolutionMethod: AreaResolutionMethod.UNRESOLVED,
      areaResolutionConfidence: null,
      areaResolvedAt: null,
    });
  });

  it('tidak menyimpan pesan dari nomor yang belum terdaftar', async () => {
    const { handlers, upsert, prisma } = createProcessor(null, {
      registered: false,
    });

    await handlers.get('WHATSAPP_PROCESS')?.(payload);

    expect(upsert).not.toHaveBeenCalled();
    expect(prisma.integrationWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: payload.eventId } }),
    );
  });

  it('tidak menyimpan pesan jaring dari wilayah channel lain', async () => {
    const { handlers, upsert, channelScope } = createProcessor(null, {
      allowed: false,
    });

    await handlers.get('WHATSAPP_PROCESS')?.(payload);

    expect(channelScope.isJaringAllowed).toHaveBeenCalledWith(
      expect.anything(),
      ['area-jaring'],
    );
    expect(upsert).not.toHaveBeenCalled();
  });
});
