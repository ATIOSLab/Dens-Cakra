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
    expect(target.promptForState(WhatsAppReportSessionState.TIME)).toContain(
      'LANGKAH 4/4',
    );
    expect(target.promptForState(WhatsAppReportSessionState.MEDIA)).toContain(
      'KELOLA DOKUMENTASI',
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

  it('memperlakukan caption media sebagai isi dan bukan command global', async () => {
    const service = createService();
    const activeSession = {
      id: 'active-session-id',
      status: WhatsAppReportSessionStatus.ACTIVE,
      currentState: WhatsAppReportSessionState.CONTENT,
      expiresAt: new Date(Date.now() + 60_000),
    };
    const advance = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      process: (input: Record<string, unknown>) => Promise<void>;
      findActiveSession: () => Promise<Record<string, unknown>>;
      touchSession: () => Promise<void>;
      loadSession: () => Promise<Record<string, unknown>>;
      advance: typeof advance;
    };
    target.findActiveSession = jest.fn(() => Promise.resolve(activeSession));
    target.touchSession = jest.fn(() => Promise.resolve());
    target.loadSession = jest.fn(() => Promise.resolve(activeSession));
    target.advance = advance;
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const input = {
      channel: { id: 'channel-id' },
      socket: {},
      message: {
        key: { id: 'caption-status-id' },
        message: {
          imageMessage: { mimetype: 'image/jpeg', caption: 'STATUS' },
        },
      },
      payload: {
        externalMessageId: 'caption-status-id',
        senderPhone: '6281234567890',
        receivedAt: '2026-08-03T08:00:00.000Z',
        content: 'STATUS',
      },
      reply,
    };

    await target.process(input);

    expect(advance).toHaveBeenCalledWith(activeSession, input, 'STATUS');
    expect(reply).not.toHaveBeenCalled();
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

  it('mewajibkan lima bagian sebelum review dapat disubmit', () => {
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
    expect(isComplete({ ...complete, incidentAt: null })).toBe(false);
  });

  it('membentuk menu review Native Flow single_select dengan tujuh tindakan', () => {
    const service = createService();
    const target = service as unknown as {
      reviewReply: (session: Record<string, unknown>) => {
        kind: string;
        body: string;
        buttonTitle: string;
        sections: Array<{
          rows: Array<{ id: string; title: string }>;
        }>;
      };
      reviewChoiceState: (text: string) => WhatsAppReportSessionState | null;
    };

    const reply = target.reviewReply({
      latitude: -6.261493,
      longitude: 106.8106,
      locationAccuracyMeters: 8,
      incidentAt: new Date('2026-08-03T07:30:00.000Z'),
      title: 'Monitoring Wilayah',
      content: 'Situasi aman dan kondusif.',
      media: [{ fileId: 'file-id' }],
    });

    expect(reply.kind).toBe('native_flow_single_select');
    expect(reply.buttonTitle).toBe('Pilih Tindakan');
    expect(reply.body).not.toContain('1️⃣');
    expect(reply.sections[0]?.rows.map((row) => row.title)).toEqual([
      'Kirim Informasi',
      'Edit Judul',
      'Edit Informasi',
      'Edit Lokasi',
      'Edit Waktu Kejadian',
      'Edit Dokumentasi',
      'Batalkan',
    ]);
    expect(target.reviewChoiceState('report_review_edit_title')).toBe(
      WhatsAppReportSessionState.TITLE,
    );
    expect(target.reviewChoiceState('report_review_edit_content')).toBe(
      WhatsAppReportSessionState.CONTENT,
    );
    expect(target.reviewChoiceState('report_review_edit_location')).toBe(
      WhatsAppReportSessionState.LOCATION,
    );
    expect(target.reviewChoiceState('report_review_edit_time')).toBe(
      WhatsAppReportSessionState.TIME,
    );
    expect(target.reviewChoiceState('report_review_edit_media')).toBe(
      WhatsAppReportSessionState.MEDIA_CONFIRMATION,
    );
  });

  it('membentuk seluruh menu pilihan angka sebagai Native Flow single_select', () => {
    const service = createService();
    type InteractiveReply = {
      kind: string;
      body: string;
      sections: Array<{
        rows: Array<{ id: string; title: string }>;
      }>;
    };
    const target = service as unknown as {
      existingSessionChoiceReply: () => InteractiveReply;
      titleConfirmationReply: (title: string) => InteractiveReply;
      contentConfirmationReply: (content: string) => InteractiveReply;
      contentCollectionReply: (
        partCount: number,
        mediaCount: number,
      ) => InteractiveReply;
      locationConfirmationReply: (
        latitude: number,
        longitude: number,
        accuracy: number,
      ) => InteractiveReply;
      timeConfirmationReply: (incidentAt: Date) => InteractiveReply;
      mediaConfirmationReply: (
        session: Record<string, unknown>,
      ) => InteractiveReply;
      mediaDeleteConfirmationReply: () => InteractiveReply;
      cancellationConfirmationReply: () => InteractiveReply;
      postSubmitTextConfirmationReply: (
        session: Record<string, unknown>,
      ) => InteractiveReply;
      postSubmitMediaPurposeReply: (
        session: Record<string, unknown>,
      ) => InteractiveReply;
      postSubmitActionReply: (
        session: Record<string, unknown>,
        now?: Date,
      ) => InteractiveReply;
    };
    const session = {
      referenceNumber: 'INF-20260802-00001',
      incidentAt: new Date('2026-08-03T07:30:00.000Z'),
      media: [{ mediaType: FileType.PHOTO }, { mediaType: FileType.VIDEO }],
    };
    const replies = [
      target.existingSessionChoiceReply(),
      target.titleConfirmationReply('Monitoring Wilayah'),
      target.contentConfirmationReply('Situasi aman dan kondusif.'),
      target.contentCollectionReply(1, 1),
      target.locationConfirmationReply(-6.261493, 106.8106, 8),
      target.timeConfirmationReply(new Date('2026-08-03T07:30:00.000Z')),
      target.mediaConfirmationReply(session),
      target.mediaDeleteConfirmationReply(),
      target.cancellationConfirmationReply(),
      target.postSubmitTextConfirmationReply(session),
      target.postSubmitMediaPurposeReply(session),
      target.postSubmitActionReply(session),
    ];

    expect(replies).toHaveLength(12);
    for (const reply of replies) {
      expect(reply.kind).toBe('native_flow_single_select');
      expect(reply.body).not.toMatch(/[1-9]️⃣/);
      expect(reply.sections[0]?.rows.length).toBeGreaterThan(1);
      expect(
        reply.sections[0]?.rows.every((row) => row.id.startsWith('report_')),
      ).toBe(true);
    }
    expect(
      target
        .locationConfirmationReply(-6.261493, 106.8106, 8)
        .sections[0]?.rows.map((row) => row.title),
    ).toEqual(['Ya, Gunakan', 'Kirim Ulang Lokasi']);
  });

  it('memproses klik Ya, Gunakan pada konfirmasi lokasi', async () => {
    const service = createService();
    const transition = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      transition: typeof transition;
    };
    target.transition = transition;
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.LOCATION_CONFIRMATION,
        returnToReview: false,
      },
      {
        payload: { externalMessageId: 'location-choice-id' },
        reply,
      },
      'report_location_use',
    );

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      WhatsAppReportSessionState.TITLE,
      'LOCATION_LOCKED',
      'location-choice-id',
      { returnToReview: false },
    );
    expect(reply).toHaveBeenCalledWith([
      expect.stringContaining('LANGKAH 2/4'),
    ]);
  });

  it('mengurai waktu kejadian sebagai WIB dan menolak tanggal tidak valid', () => {
    const service = createService();
    const target = service as unknown as {
      parseIncidentAt: (value: string) => Date | null;
      formatIncidentAt: (value: Date) => string;
    };

    const incidentAt = target.parseIncidentAt('03-08-2026 14:30');

    expect(incidentAt?.toISOString()).toBe('2026-08-03T07:30:00.000Z');
    expect(target.formatIncidentAt(incidentAt as Date)).toContain('14.30');
    expect(target.parseIncidentAt('31-02-2026 14:30')).toBeNull();
    expect(target.parseIncidentAt('03-08-2026 25:30')).toBeNull();
  });

  it('hanya menampilkan aksi penambahan versi pada hari laporan yang sama', () => {
    const service = createService();
    const target = service as unknown as {
      postSubmitActionReply: (
        session: Record<string, unknown>,
        now: Date,
      ) => {
        sections: Array<{ rows: Array<{ title: string }> }>;
      };
    };
    const session = {
      referenceNumber: 'INF-20260803-00001',
      submittedAt: new Date('2026-08-03T02:00:00.000Z'),
      amendments: [{ versionNumber: 2 }],
      submittedMessage: {
        status: 'READY_FOR_BAKET',
        validationSummary: 'VALID',
        convertedBaket: null,
      },
    };

    const sameDayTitles = target
      .postSubmitActionReply(session, new Date('2026-08-03T16:59:00.000Z'))
      .sections[0]?.rows.map((row) => row.title);
    const nextDayTitles = target
      .postSubmitActionReply(session, new Date('2026-08-03T17:01:00.000Z'))
      .sections[0]?.rows.map((row) => row.title);

    expect(sameDayTitles).toEqual(
      expect.arrayContaining([
        'Daftar Berita Hari Ini',
        'Tambah Informasi',
        'Tambah Dokumentasi',
      ]),
    );
    expect(nextDayTitles).toContain('Daftar Berita Hari Ini');
    expect(nextDayTitles).not.toContain('Tambah Informasi');
    expect(nextDayTitles).not.toContain('Tambah Dokumentasi');
  });

  it('membentuk daftar laporan hari yang sama dengan nomor status dan versi', async () => {
    const count = jest.fn(() => Promise.resolve(1));
    const findMany = jest.fn(() =>
      Promise.resolve([
        {
          id: 'report-session-id',
          referenceNumber: 'INF-20260803-00001',
          submittedAt: new Date('2026-08-03T02:00:00.000Z'),
          amendments: [{ versionNumber: 2 }],
          submittedMessage: {
            status: 'READY_FOR_BAKET',
            validationSummary: 'VALID',
            convertedBaket: null,
          },
        },
      ]),
    );
    const service = createService({
      prisma: {
        whatsAppReportSession: { count, findMany },
      },
    });
    const target = service as unknown as {
      reportHistoryReply: (
        senderPhone: string,
        page: number,
        referenceDate: Date,
      ) => Promise<{
        kind: string;
        sections: Array<{
          rows: Array<{ id: string; title: string; description?: string }>;
        }>;
      }>;
    };

    const reply = await target.reportHistoryReply(
      '6281234567890',
      0,
      new Date('2026-08-03T05:00:00.000Z'),
    );

    expect(count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          senderPhone: '6281234567890',
          submittedAt: {
            gte: new Date('2026-08-02T17:00:00.000Z'),
            lt: new Date('2026-08-03T17:00:00.000Z'),
          },
        }),
      }),
    );
    expect(reply.kind).toBe('native_flow_single_select');
    expect(reply.sections[0]?.rows[0]).toEqual(
      expect.objectContaining({
        title: 'INF-20260803-00001',
        description: 'TERVERIFIKASI • Versi 2',
      }),
    );
  });

  it('memilih kembali laporan hari yang sama sebagai target penambahan versi', async () => {
    const targetReport = {
      id: 'selected-report-session-id',
      senderPhone: '6281234567890',
      referenceNumber: 'INF-20260803-00002',
      submittedAt: new Date('2026-08-03T03:00:00.000Z'),
      currentState: WhatsAppReportSessionState.CLOSED,
      status: WhatsAppReportSessionStatus.CLOSED,
      amendments: [{ versionNumber: 2 }],
      submittedMessage: {
        status: 'PROCESSED',
        validationSummary: 'VALID',
        convertedBaket: { status: 'VERIFIED' },
      },
    };
    const findFirst = jest.fn(() => Promise.resolve(targetReport));
    const updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
    const update = jest.fn(() => Promise.resolve());
    const historyCreate = jest.fn(() => Promise.resolve());
    type TransactionMock = {
      whatsAppReportSession: {
        updateMany: typeof updateMany;
        update: typeof update;
      };
      whatsAppReportHistory: { create: typeof historyCreate };
    };
    const transaction = jest.fn(
      async (callback: (tx: TransactionMock) => Promise<unknown>) =>
        callback({
          whatsAppReportSession: { updateMany, update },
          whatsAppReportHistory: { create: historyCreate },
        }),
    );
    const service = createService({
      prisma: {
        whatsAppReportSession: { findFirst },
        $transaction: transaction,
      },
    });
    const target = service as unknown as {
      selectSameDayReport: (
        activeSession: Record<string, unknown>,
        reportSessionId: string,
        payload: Record<string, string>,
        reply: (messages: unknown[]) => Promise<void>,
      ) => Promise<void>;
    };
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.selectSameDayReport(
      { id: 'current-session-id' },
      'selected-report-session-id',
      {
        senderPhone: '6281234567890',
        externalMessageId: 'select-report-id',
        receivedAt: '2026-08-03T05:00:00.000Z',
      },
      reply,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'selected-report-session-id' },
        data: expect.objectContaining({
          status: WhatsAppReportSessionStatus.SUBMITTED,
          currentState: WhatsAppReportSessionState.SUBMITTED,
          activeSenderKey: '6281234567890',
        }),
      }),
    );
    expect(reply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('INF-20260803-00002'),
        expect.objectContaining({ kind: 'native_flow_single_select' }),
      ]),
    );
  });

  it('menolak penambahan versi jika tanggal WIB laporan sudah berbeda', async () => {
    const service = createService();
    const target = service as unknown as {
      ensureSameDayFollowUp: (
        session: Record<string, unknown>,
        payload: Record<string, string>,
        reply: (messages: unknown[]) => Promise<void>,
      ) => Promise<boolean>;
    };
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    const allowed = await target.ensureSameDayFollowUp(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.SUBMITTED,
        submittedAt: new Date('2026-08-02T16:59:00.000Z'),
        referenceNumber: 'INF-20260802-00001',
        amendments: [],
        submittedMessage: null,
      },
      {
        senderPhone: '6281234567890',
        externalMessageId: 'late-follow-up-id',
        receivedAt: '2026-08-02T17:01:00.000Z',
      },
      reply,
    );

    expect(allowed).toBe(false);
    expect(reply).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('hari yang sama dalam zona WIB'),
      ]),
    );
  });

  it('mencatat informasi tambahan sebagai versi berikutnya dari nomor yang sama', async () => {
    const amendmentCreate = jest.fn(() => Promise.resolve());
    const aggregate = jest.fn(() =>
      Promise.resolve({ _max: { versionNumber: 1 } }),
    );
    const queryRaw = jest.fn(() => Promise.resolve([{ id: 'message-id' }]));
    type TransactionMock = {
      $queryRaw: typeof queryRaw;
      whatsAppReportAmendment: {
        aggregate: typeof aggregate;
        create: typeof amendmentCreate;
      };
    };
    const transaction = jest.fn(
      async (callback: (tx: TransactionMock) => Promise<unknown>) =>
        callback({
          $queryRaw: queryRaw,
          whatsAppReportAmendment: { aggregate, create: amendmentCreate },
        }),
    );
    const service = createService({ prisma: { $transaction: transaction } });
    const transition = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      transition: typeof transition;
    };
    target.transition = transition;
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        senderPhone: '6281234567890',
        currentState: WhatsAppReportSessionState.POST_SUBMIT_TEXT_CONFIRMATION,
        status: WhatsAppReportSessionStatus.SUBMITTED,
        submittedAt: new Date('2026-08-03T02:00:00.000Z'),
        submittedMessageId: 'message-id',
        referenceNumber: 'INF-20260803-00001',
        pendingAmendmentText: 'Perkembangan situasi terbaru.',
        amendments: [],
        submittedMessage: {
          status: 'READY_FOR_BAKET',
          validationSummary: 'VALID',
          convertedBaket: null,
        },
      },
      {
        channel: {},
        message: {},
        payload: {
          externalMessageId: 'amendment-confirm-id',
          senderPhone: '6281234567890',
          receivedAt: '2026-08-03T05:00:00.000Z',
        },
        reply,
      },
      'report_post_submit_text_add',
    );

    expect(amendmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          whatsappMessageId: 'message-id',
          versionNumber: 2,
          content: 'Perkembangan situasi terbaru.',
        }),
      }),
    );
    expect(reply).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('Versi 2')]),
    );
  });

  it('melanjutkan konfirmasi informasi ke input waktu kejadian', async () => {
    const service = createService();
    const transition = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      transition: typeof transition;
    };
    target.transition = transition;
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.CONTENT_CONFIRMATION,
        returnToReview: false,
      },
      {
        payload: { externalMessageId: 'content-save-id' },
        reply,
      },
      'report_content_save',
    );

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      WhatsAppReportSessionState.TIME,
      'CONTENT_LOCKED',
      'content-save-id',
      { returnToReview: false },
    );
    expect(reply).toHaveBeenCalledWith([
      expect.stringContaining('LANGKAH 4/4'),
    ]);
  });

  it('menyimpan input waktu WIB lalu meminta konfirmasi interaktif', async () => {
    const service = createService();
    const transition = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      transition: typeof transition;
    };
    target.transition = transition;
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.TIME,
        incidentAt: null,
      },
      {
        payload: { externalMessageId: 'time-input-id' },
        reply,
      },
      '03-08-2024 14:30',
    );

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      WhatsAppReportSessionState.REVIEW,
      'INCIDENT_TIME_ADDED',
      'time-input-id',
      {
        incidentAt: new Date('2024-08-03T07:30:00.000Z'),
        returnToReview: false,
      },
    );
    expect(reply).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'native_flow_single_select' }),
    ]);
  });

  it('menyimpan foto dan caption sekaligus sebagai lampiran dan isi', async () => {
    const mediaCreate = jest.fn(() => Promise.resolve());
    const contentCreate = jest.fn(() => Promise.resolve());
    const historyCreate = jest.fn(() => Promise.resolve());
    type TransactionMock = {
      whatsAppReportMedia: { create: typeof mediaCreate };
      whatsAppReportContentPart: { create: typeof contentCreate };
      whatsAppReportHistory: { create: typeof historyCreate };
    };
    const transaction = jest.fn(async (arg: unknown) =>
      typeof arg === 'function'
        ? arg({
            whatsAppReportMedia: { create: mediaCreate },
            whatsAppReportContentPart: { create: contentCreate },
            whatsAppReportHistory: { create: historyCreate },
          })
        : Promise.all(arg as Array<Promise<unknown>>),
    );
    const service = createService({
      prisma: {
        $transaction: transaction,
        whatsAppReportSession: { update: jest.fn(() => Promise.resolve()) },
        whatsAppReportHistory: { create: historyCreate },
      },
    });
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      storeAndScanMedia: () => Promise<{ id: string }>;
    };
    target.storeAndScanMedia = jest.fn(() =>
      Promise.resolve({ id: 'content-photo-file-id' }),
    );
    target.loadSession = jest.fn(() =>
      Promise.resolve({
        id: 'session-id',
        currentState: WhatsAppReportSessionState.CONTENT,
        contentParts: [{ content: 'Kondisi jalan mengalami kerusakan berat.' }],
        media: [{ mediaType: FileType.PHOTO }],
        returnToReview: false,
      }),
    );
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.CONTENT,
        contentParts: [],
        media: [],
      },
      {
        socket: {},
        message: {
          key: { id: 'content-photo-message-id' },
          message: {
            imageMessage: {
              mimetype: 'image/jpeg',
              caption: 'Kondisi jalan mengalami kerusakan berat.',
            },
          },
        },
        payload: { externalMessageId: 'content-photo-message-id' },
        reply,
      },
      'Kondisi jalan mengalami kerusakan berat.',
    );

    expect(mediaCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fileId: 'content-photo-file-id',
          caption: 'Kondisi jalan mengalami kerusakan berat.',
          orderNo: 1,
        }),
      }),
    );
    expect(contentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: 'Kondisi jalan mengalami kerusakan berat.',
          orderNo: 1,
        }),
      }),
    );
    expect(reply).toHaveBeenCalledWith([
      expect.stringContaining('LANGKAH 4/4'),
    ]);
  });

  it('setelah waktu disimpan langsung menuju review jika lampiran sudah ada', async () => {
    const service = createService();
    const transition = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      transition: typeof transition;
    };
    target.transition = transition;
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.TIME_CONFIRMATION,
        returnToReview: false,
        incidentAt: new Date('2024-08-03T07:30:00.000Z'),
        media: [{ mediaType: FileType.PHOTO }],
        contentParts: [{ content: 'Informasi kejadian.' }],
      },
      {
        payload: { externalMessageId: 'time-save-id' },
        reply,
      },
      'report_time_save',
    );

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      WhatsAppReportSessionState.REVIEW,
      'INCIDENT_TIME_LOCKED',
      'time-save-id',
      { returnToReview: false },
    );
  });

  it('setelah foto diterima langsung membuka menu dokumentasi interaktif', async () => {
    const mediaCreate = jest.fn(() => Promise.resolve());
    const historyCreate = jest.fn(() => Promise.resolve());
    const service = createService({
      prisma: {
        whatsAppReportMedia: { create: mediaCreate },
        whatsAppReportHistory: { create: historyCreate },
      },
    });
    const transition = jest.fn<() => Promise<void>>(() => Promise.resolve());
    const target = service as unknown as {
      advance: (
        session: Record<string, unknown>,
        input: Record<string, unknown>,
        text: string,
      ) => Promise<void>;
      transition: typeof transition;
      storeAndScanMedia: () => Promise<{ id: string }>;
      loadSession: () => Promise<Record<string, unknown>>;
    };
    target.transition = transition;
    target.storeAndScanMedia = jest.fn(() =>
      Promise.resolve({ id: 'file-id' }),
    );
    target.loadSession = jest.fn(() =>
      Promise.resolve({
        id: 'session-id',
        media: [{ mediaType: FileType.PHOTO }],
      }),
    );
    const reply = jest.fn<() => Promise<void>>(() => Promise.resolve());

    await target.advance(
      {
        id: 'session-id',
        currentState: WhatsAppReportSessionState.MEDIA,
        media: [],
      },
      {
        socket: {},
        message: {
          key: { id: 'photo-message-id' },
          message: { imageMessage: { mimetype: 'image/jpeg' } },
        },
        payload: { externalMessageId: 'photo-message-id' },
        reply,
      },
      '',
    );

    expect(transition).toHaveBeenCalledWith(
      expect.anything(),
      WhatsAppReportSessionState.MEDIA_CONFIRMATION,
      'MEDIA_AWAITING_ACTION',
      'photo-message-id',
    );
    expect(reply).toHaveBeenCalledWith([
      expect.objectContaining({ kind: 'native_flow_single_select' }),
    ]);
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
    expect(reply.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'native_flow_single_select' }),
      ]),
    );
  });
});
