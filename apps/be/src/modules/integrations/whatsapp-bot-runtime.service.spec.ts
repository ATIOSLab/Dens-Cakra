import { jest } from '@jest/globals';
import { AreaResolutionMethod } from '../../generated/prisma/client.js';
import { WhatsappBotRuntimeService } from './whatsapp-bot-runtime.service.js';

describe('WhatsappBotRuntimeService report intake', () => {
  it('menyimpan area paling spesifik bersama laporan bot yang selesai', async () => {
    const areaId = 'b947975c-b114-5c6f-a4a7-9fc007b0ccc6';
    const create =
      jest.fn<(input: { data: Record<string, unknown> }) => void>();
    const resolvedAt = new Date('2026-07-14T02:19:01.000Z');
    const spatial = {
      resolveReportArea: jest.fn(() => ({
        area: { areaId },
        method: AreaResolutionMethod.POLYGON_MATCH,
        confidence: 100,
        resolvedAt,
      })),
    };
    const service = new WhatsappBotRuntimeService(
      { whatsAppMessage: { create } } as never,
      {} as never,
      {} as never,
      {} as never,
      spatial as never,
    );
    const saveCompletedReport = (
      service as unknown as {
        saveCompletedReport: (
          channel: unknown,
          payload: unknown,
          session: unknown,
          location: unknown,
        ) => Promise<void>;
      }
    ).saveCompletedReport.bind(service);
    const location = {
      latitude: 0.4797112,
      longitude: 101.4313293,
      accuracy: 5,
    };

    await saveCompletedReport(
      { id: 'channel-id' },
      {
        externalMessageId: 'location-message-id',
        receivedAt: '2026-07-14T02:19:00.000Z',
      },
      {
        senderPhone: '6281234567890',
        jaringId: 'jaring-id',
        fieldOfficerAssignmentId: 'assignment-id',
        title: 'Laporan Jaring',
        content: 'Isi laporan',
        jaringCode: '123',
        jaringLabel: 'Jaring 123',
        startedAt: new Date('2026-07-14T02:10:00.000Z'),
      },
      location,
    );

    expect(spatial.resolveReportArea).toHaveBeenCalledWith(
      location.latitude,
      location.longitude,
    );
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      resolvedAreaId: areaId,
      areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
      areaResolutionConfidence: 100,
      areaResolvedAt: resolvedAt,
    });
  });
});
