import { jest } from '@jest/globals';
import {
  FileType,
  WhatsAppReportSessionState,
  WhatsAppReportSessionStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { WhatsAppReportFlowService } from './whatsapp-report-flow.service.js';

describe('WhatsAppReportFlowService', () => {
  function createService(
    overrides: {
      prisma?: unknown;
      spatial?: unknown;
    } = {},
  ) {
    return new WhatsAppReportFlowService(
      (overrides.prisma ?? {}) as never,
      {} as never,
      {} as never,
      (overrides.spatial ?? {}) as never,
      {} as never,
    );
  }

  it('menggunakan pembuka singkat tanpa nama DENS CAKRA dan memulai dari Live Location', () => {
    const service = createService();
    const target = service as unknown as {
      welcomeText: () => string;
      promptForState: (state: WhatsAppReportSessionState) => string;
    };

    expect(target.welcomeText()).toBe(
      'Selamat datang, apakah ada yang ingin Anda sampaikan.\n\nSilakan masukkan PIN/kode Jaring Anda.',
    );
    expect(target.welcomeText()).not.toContain('DENS CAKRA');
    expect(
      target.promptForState(WhatsAppReportSessionState.LOCATION),
    ).toContain('LANGKAH 1/4');
    expect(target.promptForState(WhatsAppReportSessionState.TITLE)).toContain(
      'LANGKAH 2/4',
    );
    expect(target.promptForState(WhatsAppReportSessionState.CONTENT)).toContain(
      'LANGKAH 3/4',
    );
    expect(target.promptForState(WhatsAppReportSessionState.MEDIA)).toContain(
      'LANGKAH 4/4',
    );
  });

  it('setelah PIN benar meminta Live Location sebagai data pertama', async () => {
    const sessionUpdate = jest.fn(() => Promise.resolve());
    const historyCreate = jest.fn(() => Promise.resolve());
    const service = createService({
      prisma: {
        whatsAppReportSession: { update: sessionUpdate },
        whatsAppReportHistory: { create: historyCreate },
        $transaction: (operations: Array<Promise<unknown>>) =>
          Promise.all(operations),
      },
    });
    const advance = (
      service as unknown as {
        advance: (
          session: Record<string, unknown>,
          input: Record<string, unknown>,
          text: string,
        ) => Promise<void>;
      }
    ).advance.bind(service);
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.AWAITING_CODE,
        jaring: { code: 'Z01023' },
      },
      {
        socket: {},
        message: {},
        payload: {
          externalMessageId: 'pin-message-id',
          receivedAt: '2026-07-31T00:00:00.000Z',
        },
        reply,
      },
      'Z01023',
    );

    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          currentState: WhatsAppReportSessionState.LOCATION,
        }),
      }),
    );
    expect(reply).toHaveBeenCalledWith([
      expect.stringContaining('LANGKAH 1/4'),
    ]);
  });

  it('memulai sesi baru ketika LAPOR dikirim setelah laporan sebelumnya sudah submitted', async () => {
    const service = createService();
    const submittedSession = {
      id: 'submitted-session-id',
      status: WhatsAppReportSessionStatus.SUBMITTED,
      currentState: WhatsAppReportSessionState.SUBMITTED,
      expiresAt: new Date(Date.now() + 60_000),
      referenceNumber: 'INF-20260731-00001',
    };
    const closeSession = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const startSession = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const advance = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      process: (input: Record<string, unknown>) => Promise<void>;
      findActiveSession: () => Promise<Record<string, unknown>>;
      touchSession: () => Promise<void>;
      loadSession: () => Promise<Record<string, unknown>>;
      closeSession: typeof closeSession;
      startSession: typeof startSession;
      advance: typeof advance;
    };
    target.findActiveSession = jest.fn(() => Promise.resolve(submittedSession));
    target.touchSession = jest.fn(() => Promise.resolve());
    target.loadSession = jest.fn(() => Promise.resolve(submittedSession));
    target.closeSession = closeSession;
    target.startSession = startSession;
    target.advance = advance;

    await target.process({
      channel: { id: 'channel-id' },
      socket: {},
      message: { key: { remoteJid: '6281234567890@s.whatsapp.net' } },
      payload: {
        externalMessageId: 'new-report-command-id',
        senderPhone: '6281234567890',
        receivedAt: '2026-07-31T01:12:00.000Z',
        content: 'Lapor',
      },
      reply: jest.fn(() => Promise.resolve()),
    });

    expect(closeSession).toHaveBeenCalledWith(
      submittedSession,
      'NEW_REPORT_REQUESTED',
      'new-report-command-id',
    );
    expect(startSession).toHaveBeenCalledTimes(1);
    expect(advance).not.toHaveBeenCalled();
  });

  it('hanya membaca live location dan mempertahankan akurasi asli', () => {
    const service = createService();
    const extract = (
      service as unknown as {
        extractLiveLocation: (message: unknown) => unknown;
      }
    ).extractLiveLocation.bind(service);

    expect(
      extract({
        message: {
          locationMessage: {
            degreesLatitude: -6.261493,
            degreesLongitude: 106.8106,
            accuracyInMeters: 8,
            isLive: false,
          },
        },
      }),
    ).toBeNull();
    expect(
      extract({
        message: {
          liveLocationMessage: {
            degreesLatitude: -6.261493,
            degreesLongitude: 106.8106,
            accuracyInMeters: 8,
          },
        },
      }),
    ).toEqual({
      latitude: -6.261493,
      longitude: 106.8106,
      accuracy: 8,
    });
  });

  it('mewajibkan empat bagian sebelum review dapat disubmit', () => {
    const service = createService();
    const isComplete = (
      service as unknown as {
        isComplete: (session: Record<string, unknown>) => boolean;
      }
    ).isComplete.bind(service);
    const complete = {
      title: 'Monitoring Wilayah',
      content: 'Situasi aman dan kondusif.',
      latitude: -6.261493,
      longitude: 106.8106,
      locationAccuracyMeters: 8,
      locationCapturedAt: new Date(),
      incidentAt: new Date(),
      media: [{ fileId: 'file-id' }],
    };

    expect(isComplete(complete)).toBe(true);
    expect(isComplete({ ...complete, media: [] })).toBe(false);
    expect(isComplete({ ...complete, locationAccuracyMeters: null })).toBe(
      false,
    );
  });

  it('membuat nomor referensi atomik dan menyimpan laporan ke WhatsAppMessage', async () => {
    const messageCreate = jest.fn(() => Promise.resolve({ id: 'message-id' }));
    const sessionUpdate = jest.fn(() => Promise.resolve());
    const historyCreate = jest.fn(() => Promise.resolve());
    const counterUpsert = jest.fn(() =>
      Promise.resolve({ dateKey: '20260730', lastValue: 125 }),
    );
    const transaction = jest.fn(
      async (callback: (tx: Record<string, unknown>) => Promise<unknown>) =>
        callback({
          whatsAppReportReferenceCounter: { upsert: counterUpsert },
          whatsAppMessage: { create: messageCreate },
          whatsAppReportSession: { update: sessionUpdate },
          whatsAppReportHistory: { create: historyCreate },
        }),
    );
    const service = createService({
      prisma: { $transaction: transaction },
      spatial: { resolveReportArea: jest.fn(() => Promise.resolve(null)) },
    });
    const submit = (
      service as unknown as {
        submit: (
          session: Record<string, unknown>,
          payload: Record<string, unknown>,
          reply: (messages: string[]) => Promise<void>,
        ) => Promise<void>;
      }
    ).submit.bind(service);
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const session = {
      id: 'session-id',
      integrationChannelId: 'channel-id',
      senderPhone: '6281234567890',
      jaringId: 'jaring-id',
      fieldOfficerAssignmentId: 'assignment-id',
      currentState: WhatsAppReportSessionState.REVIEW,
      status: WhatsAppReportSessionStatus.ACTIVE,
      title: 'Monitoring Wilayah',
      content: 'Situasi aman dan kondusif.',
      latitude: -6.261493,
      longitude: 106.8106,
      locationAccuracyMeters: 8,
      locationCapturedAt: new Date('2026-07-30T07:30:00.000Z'),
      locationMessageId: 'location-id',
      locationType: 'LIVE_LOCATION',
      incidentAt: new Date('2026-07-30T07:00:00.000Z'),
      timezone: 'Asia/Jakarta',
      startedAt: new Date('2026-07-30T06:00:00.000Z'),
      media: [
        {
          fileId: 'file-id-1',
          caption: 'Dokumentasi pertama',
          mediaType: FileType.PHOTO,
        },
        {
          fileId: 'file-id-2',
          caption: 'Dokumentasi kedua',
          mediaType: FileType.PHOTO,
        },
      ],
    };

    jest
      .spyOn(
        service as unknown as { wibDateKey: (value: Date) => string },
        'wibDateKey',
      )
      .mockReturnValue('20260730');

    await submit(
      session,
      {
        externalMessageId: 'review-confirmation-id',
        receivedAt: '2026-07-30T08:00:00.000Z',
      },
      reply,
    );

    expect(counterUpsert).toHaveBeenCalled();
    expect(messageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceNumber: 'INF-20260730-00125',
          externalMessageId: 'report:session-id',
          validationSummary: WhatsAppValidationSummary.NOT_CHECKED,
          media: {
            create: [
              {
                fileId: 'file-id-1',
                caption: 'Dokumentasi pertama',
                orderNo: 1,
              },
              {
                fileId: 'file-id-2',
                caption: 'Dokumentasi kedua',
                orderNo: 2,
              },
            ],
          },
        }),
      }),
    );
    expect(sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          referenceNumber: 'INF-20260730-00125',
          submittedMessageId: 'message-id',
          status: WhatsAppReportSessionStatus.SUBMITTED,
        }),
      }),
    );
    expect(reply).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('INF-20260730-00125')]),
    );
  });
});
