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

  it('menolak lokasi statis dan menerima live location pada sesi laporan', async () => {
    const service = new WhatsappBotRuntimeService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const sendHumanLikeReplies = jest.fn(() => Promise.resolve());
    (
      service as unknown as {
        sendHumanLikeReplies: typeof sendHumanLikeReplies;
      }
    ).sendHumanLikeReplies = sendHumanLikeReplies;
    const advanceReportSession = (
      service as unknown as {
        advanceReportSession: (...args: unknown[]) => Promise<void>;
      }
    ).advanceReportSession.bind(service);
    const session = {
      channelId: 'channel-id',
      remoteJid: '6281234567890@s.whatsapp.net',
      senderPhone: '6281234567890',
      jaringId: 'source-id',
      jaringIdentifier: 'Jaring Alpha',
      jaringLabel: 'Pelapor 001',
      fieldOfficerAssignmentId: 'assignment-id',
      step: 'AWAITING_LIVE_LOCATION',
      startedAt: new Date(),
    };
    const channel = { id: 'channel-id', config: {} };
    const socket = {};

    await advanceReportSession(
      channel,
      socket,
      {
        key: { remoteJid: session.remoteJid },
        message: {
          locationMessage: {
            degreesLatitude: 0.4797112,
            degreesLongitude: 101.4313293,
          },
        },
      },
      {
        externalMessageId: 'static-location-id',
        senderPhone: session.senderPhone,
        receivedAt: '2026-07-15T10:01:00.000Z',
      },
      session,
      'session-key',
    );

    expect(session.step).toBe('AWAITING_LIVE_LOCATION');
    expect(session).not.toHaveProperty('location');
    expect(sendHumanLikeReplies).toHaveBeenLastCalledWith(
      socket,
      session.remoteJid,
      expect.anything(),
      expect.arrayContaining([
        expect.stringContaining('Lokasi statis ditolak'),
      ]),
    );

    await advanceReportSession(
      channel,
      socket,
      {
        key: { remoteJid: session.remoteJid },
        message: {
          liveLocationMessage: {
            degreesLatitude: 0.4797112,
            degreesLongitude: 101.4313293,
            accuracyInMeters: 5,
          },
        },
      },
      {
        externalMessageId: 'live-location-id',
        senderPhone: session.senderPhone,
        receivedAt: '2026-07-15T10:02:00.000Z',
      },
      session,
      'session-key',
    );

    expect(session).toMatchObject({
      step: 'AWAITING_TITLE',
      locationMessageId: 'live-location-id',
      location: {
        latitude: 0.4797112,
        longitude: 101.4313293,
        accuracy: 5,
      },
    });
    expect(sendHumanLikeReplies).toHaveBeenLastCalledWith(
      socket,
      session.remoteJid,
      expect.anything(),
      expect.arrayContaining([
        expect.stringContaining('Live Location diterima'),
      ]),
    );
  });

  it('menerima locationMessage hanya jika ditandai sebagai live', () => {
    const { service } = createServiceForUnknownSender();
    const extractLocation = (
      service as unknown as {
        extractLocation: (message: unknown, liveOnly: boolean) => unknown;
      }
    ).extractLocation.bind(service);

    expect(
      extractLocation(
        {
          locationMessage: {
            degreesLatitude: -6.2,
            degreesLongitude: 106.816666,
            isLive: false,
          },
        },
        true,
      ),
    ).toBeNull();
    expect(
      extractLocation(
        {
          locationMessage: {
            degreesLatitude: -6.2,
            degreesLongitude: 106.816666,
            isLive: true,
          },
        },
        true,
      ),
    ).toMatchObject({
      latitude: -6.2,
      longitude: 106.816666,
    });
  });

  it('membaca id pilihan Native Flow single_select sebagai input FSM', () => {
    const { service } = createServiceForUnknownSender();
    const extractText = (
      service as unknown as {
        extractText: (message: unknown) => string;
      }
    ).extractText.bind(service);

    expect(
      extractText({
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            name: 'single_select',
            paramsJson: JSON.stringify({ id: 'report_review_edit_title' }),
          },
        },
      }),
    ).toBe('report_review_edit_title');
  });

  it('mengirim daftar tindakan melalui Native Flow single_select', async () => {
    const { service } = createServiceForUnknownSender();
    const relayMessage = jest.fn<
      (jid: string, message: unknown, options: unknown) => Promise<string>
    >(() => Promise.resolve('message-id'));
    const sendNativeFlowSingleSelect = (
      service as unknown as {
        sendNativeFlowSingleSelect: (
          socket: unknown,
          remoteJid: string,
          reply: Record<string, unknown>,
        ) => Promise<void>;
      }
    ).sendNativeFlowSingleSelect.bind(service);

    await sendNativeFlowSingleSelect(
      {
        relayMessage,
        user: { id: '6280000000000:1@s.whatsapp.net' },
      },
      '6281234567890@s.whatsapp.net',
      {
        kind: 'native_flow_single_select',
        body: 'Ringkasan informasi',
        footer: 'Pilih satu tindakan.',
        buttonTitle: 'Pilih Tindakan',
        sections: [
          {
            title: 'Tindakan Informasi',
            rows: [
              { id: 'report_review_send', title: 'Kirim Informasi' },
              { id: 'report_review_cancel', title: 'Batalkan' },
            ],
          },
        ],
      },
    );

    const relayed = relayMessage.mock.calls[0]?.[1] as {
      viewOnceMessage?: unknown;
      documentWithCaptionMessage?: {
        message?: {
          interactiveMessage?: {
            nativeFlowMessage?: {
              buttons?: Array<{
                name?: string;
                buttonParamsJson?: string;
              }>;
              messageParamsJson?: string;
              messageVersion?: number;
            };
          };
        };
      };
    };
    expect(relayed.viewOnceMessage).toBeNull();
    const nativeFlow =
      relayed.documentWithCaptionMessage?.message?.interactiveMessage
        ?.nativeFlowMessage;
    const button = nativeFlow?.buttons?.[0];
    expect(button?.name).toBe('single_select');
    expect(nativeFlow?.messageParamsJson).toBe('{}');
    expect(nativeFlow?.messageVersion).toBe(1);
    expect(JSON.parse(button?.buttonParamsJson ?? '{}')).toMatchObject({
      title: 'Pilih Tindakan',
      sections: [
        {
          rows: [
            { id: 'report_review_send', title: 'Kirim Informasi' },
            { id: 'report_review_cancel', title: 'Batalkan' },
          ],
        },
      ],
    });
    expect(relayMessage.mock.calls[0]?.[2]).toMatchObject({
      additionalNodes: [
        {
          tag: 'biz',
          attrs: {},
          content: [
            {
              tag: 'interactive',
              attrs: { type: 'native_flow', v: '1' },
              content: [
                {
                  tag: 'native_flow',
                  attrs: { v: '9', name: 'mixed' },
                },
              ],
            },
          ],
        },
      ],
    });
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
      {} as never,
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
        jaringIdentifier: 'Jaring Alpha',
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
