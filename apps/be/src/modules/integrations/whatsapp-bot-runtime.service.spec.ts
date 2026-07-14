import { jest } from '@jest/globals';
import { AreaResolutionMethod } from '../../generated/prisma/client.js';
import { WhatsappBotRuntimeService } from './whatsapp-bot-runtime.service.js';

describe('WhatsappBotRuntimeService report intake', () => {
  function createServiceForUnknownSender() {
    const sendMessage = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const prisma = {
      jaring: { findFirst: jest.fn(() => Promise.resolve(null)) },
    };
    const service = new WhatsappBotRuntimeService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      { isJaringAllowed: jest.fn(() => Promise.resolve(false)) } as never,
      {} as never,
    );

    return { service, sendMessage };
  }

  it('tidak membalas /start dari nomor yang belum terdaftar', async () => {
    const { service, sendMessage } = createServiceForUnknownSender();
    const handleBotInteraction = (
      service as unknown as {
        handleBotInteraction: (...args: unknown[]) => Promise<boolean>;
      }
    ).handleBotInteraction.bind(service);

    const handled = await handleBotInteraction(
      { id: 'channel-id', config: {} },
      { sendMessage },
      { key: { remoteJid: '6281234567890@s.whatsapp.net' } },
      { senderPhone: '6281234567890', content: '/start' },
    );

    expect(handled).toBe(true);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('tidak membalas perintah lapor dari nomor yang belum terdaftar', async () => {
    const { service, sendMessage } = createServiceForUnknownSender();
    const handleBotInteraction = (
      service as unknown as {
        handleBotInteraction: (...args: unknown[]) => Promise<boolean>;
      }
    ).handleBotInteraction.bind(service);

    const handled = await handleBotInteraction(
      { id: 'channel-id', config: {} },
      { sendMessage },
      { key: { remoteJid: '6281234567890@s.whatsapp.net' } },
      { senderPhone: '6281234567890', content: 'lapor' },
    );

    expect(handled).toBe(true);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('hanya menerima kata lapor tanpa slash atau kata tambahan', () => {
    const { service } = createServiceForUnknownSender();
    const isReportIntent = (
      service as unknown as {
        isReportIntent: (text: string) => boolean;
      }
    ).isReportIntent.bind(service);

    expect(isReportIntent('lapor')).toBe(true);
    expect(isReportIntent('Lapor')).toBe(true);
    expect(isReportIntent('LAPOR')).toBe(true);
    expect(isReportIntent('/lapor')).toBe(false);
    expect(isReportIntent('/laporan')).toBe(false);
    expect(isReportIntent('lapor sekarang')).toBe(false);
  });

  it('mengabaikan chat biasa sebelum masuk pemroses inbox', async () => {
    const { service, sendMessage } = createServiceForUnknownSender();
    const handleBotInteraction = (
      service as unknown as {
        handleBotInteraction: (...args: unknown[]) => Promise<boolean>;
      }
    ).handleBotInteraction.bind(service);

    const handled = await handleBotInteraction(
      { id: 'channel-id', config: {} },
      { sendMessage },
      { key: { remoteJid: '6281234567890@s.whatsapp.net' } },
      { senderPhone: '6281234567890', content: 'halo' },
    );

    expect(handled).toBe(true);
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('menolak alur laporan jaring yang berbeda wilayah', async () => {
    const sendHumanLikeReplies = jest.fn(() => Promise.resolve());
    const prisma = {
      jaring: {
        findFirst: jest.fn(() =>
          Promise.resolve({
            id: 'jaring-id',
            code: 'JRG-001',
            aliasName: 'Jaring 001',
            areaCoverages: [{ areaId: 'area-jaring' }],
            caretakerAssignments: [
              { fieldOfficerAssignmentId: 'field-officer-id' },
            ],
            cluster: null,
          }),
        ),
      },
    };
    const channelScope = {
      isJaringAllowed: jest.fn(() => Promise.resolve(false)),
    };
    const service = new WhatsappBotRuntimeService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      channelScope as never,
    );
    (
      service as unknown as {
        sendHumanLikeReplies: typeof sendHumanLikeReplies;
      }
    ).sendHumanLikeReplies = sendHumanLikeReplies;
    const handleBotInteraction = (
      service as unknown as {
        handleBotInteraction: (...args: unknown[]) => Promise<boolean>;
      }
    ).handleBotInteraction.bind(service);

    const handled = await handleBotInteraction(
      { id: 'channel-id', config: { userId: 'channel-user-id' } },
      {},
      { key: { remoteJid: '6281234567890@s.whatsapp.net' } },
      { senderPhone: '6281234567890', content: 'lapor' },
    );

    expect(handled).toBe(true);
    expect(channelScope.isJaringAllowed).toHaveBeenCalledWith(
      expect.anything(),
      ['area-jaring'],
    );
    expect(sendHumanLikeReplies).toHaveBeenCalledWith(
      expect.anything(),
      '6281234567890@s.whatsapp.net',
      expect.anything(),
      expect.arrayContaining([
        expect.stringContaining('tidak berada dalam wilayah layanan'),
      ]),
    );
  });

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
      {} as never,
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
