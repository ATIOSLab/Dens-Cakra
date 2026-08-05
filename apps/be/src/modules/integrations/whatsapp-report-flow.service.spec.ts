import type { WAMessage, WASocket } from '@whiskeysockets/baileys';
import { describe, expect, it, jest } from '@jest/globals';
import { WhatsAppReportFlowService } from './whatsapp-report-flow.service.js';

const channel = {
  id: 'channel-id',
  code: 'KANAL-JARING',
  channelType: 'WHATSAPP',
  config: {},
};

const eligibleJaring = {
  id: 'jaring-id',
  areaCoverages: [{ areaId: 'area-id' }],
  caretakerAssignments: [{ fieldOfficerAssignmentId: 'assignment-id' }],
};

const captureResponse = `Terima kasih Informasi telah masuk.
Anda masih dapat menambahkan informasi jika ada.

Balas *SELESAI* jika informasi telah lengkap dan siap dikirimkan.

Balas *BATAL* untuk membatalkan.`;

function activeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-id',
    integrationChannelId: channel.id,
    senderPhone: '628123456789',
    remoteJid: '628123456789@s.whatsapp.net',
    currentState: 'CONTENT',
    status: 'ACTIVE',
    content: null,
    latitude: null,
    longitude: null,
    locationAccuracyMeters: null,
    locationCapturedAt: null,
    locationType: null,
    startedAt: new Date(),
    contentParts: [],
    media: [],
    ...overrides,
  };
}

function createFixture() {
  const txSessionCreate = jest.fn().mockResolvedValue({ id: 'session-id' });
  const txSessionUpdate = jest.fn().mockResolvedValue({});
  const txSessionDelete = jest.fn().mockResolvedValue({});
  const txMessageCreate = jest.fn().mockResolvedValue({ id: 'message-id' });
  const txReferenceCounterUpsert = jest
    .fn()
    .mockResolvedValue({ lastValue: 1 });
  const txHistoryCreate = jest.fn().mockResolvedValue({});
  const txHistoryDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
  const transaction = jest.fn(async (input: unknown) => {
    if (typeof input === 'function') {
      return input({
        whatsAppReportSession: {
          create: txSessionCreate,
          update: txSessionUpdate,
          delete: txSessionDelete,
        },
        whatsAppReportHistory: {
          create: txHistoryCreate,
          deleteMany: txHistoryDeleteMany,
        },
        whatsAppReportReferenceCounter: {
          upsert: txReferenceCounterUpsert,
        },
        whatsAppMessage: { create: txMessageCreate },
        fileAsset: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
      });
    }
    return Promise.all(input as Promise<unknown>[]);
  });
  const prisma = {
    $transaction: transaction,
    jaring: { findFirst: jest.fn().mockResolvedValue(eligibleJaring) },
    administrativeAreaClosure: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    whatsAppReportSession: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
    whatsAppReportContentPart: { create: jest.fn().mockResolvedValue({}) },
    whatsAppReportMedia: { create: jest.fn().mockResolvedValue({}) },
    whatsAppReportHistory: { create: jest.fn().mockResolvedValue({}) },
    fileAsset: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
  const storage = { remove: jest.fn().mockResolvedValue(undefined) };
  const files = {};
  const spatial = { resolveReportArea: jest.fn().mockResolvedValue(null) };
  const channelScope = { isJaringAllowed: jest.fn().mockResolvedValue(true) };
  const service = new WhatsAppReportFlowService(
    prisma as never,
    storage as never,
    files as never,
    spatial as never,
    channelScope as never,
  );
  return {
    service,
    prisma,
    spatial,
    storage,
    channelScope,
    txMessageCreate,
    txReferenceCounterUpsert,
    txHistoryDeleteMany,
    txSessionDelete,
    txSessionUpdate,
  };
}

function inbound(
  content: string,
  messageContent: WAMessage['message'] = { conversation: content },
) {
  return {
    channel,
    socket: {} as WASocket,
    message: {
      key: { remoteJid: '628123456789@s.whatsapp.net' },
      message: messageContent,
    } as WAMessage,
    payload: {
      externalMessageId: `message-${content}`,
      senderPhone: '628123456789',
      receivedAt: new Date().toISOString(),
      content,
    },
    reply: jest.fn().mockResolvedValue(undefined),
  };
}

describe('WhatsAppReportFlowService simplified collector', () => {
  it('keeps unknown or unverified senders completely silent', async () => {
    const { service, prisma } = createFixture();
    prisma.jaring.findFirst.mockResolvedValue(null);
    const input = inbound('1945');

    await service.handle(input);

    expect(input.reply).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not use Jaring ACTIVE or INACTIVE as bot eligibility', async () => {
    const { service, prisma } = createFixture();
    const input = inbound('1945');

    await service.handle(input);

    const query = prisma.jaring.findFirst.mock.calls[0][0];
    expect(query.where).toEqual(
      expect.objectContaining({
        registrationStatus: 'APPROVED',
        deletedAt: null,
      }),
    );
    expect(query.where).not.toHaveProperty('status');
    expect(input.reply).toHaveBeenCalled();
  });

  it('ignores any first message other than the global trigger', async () => {
    const { service, prisma } = createFixture();
    const input = inbound('halo');

    await service.handle(input);

    expect(input.reply).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('starts one CONTENT draft with 1945 and sends the exact opening copy', async () => {
    const { service, prisma } = createFixture();
    const input = inbound('1945');

    await service.handle(input);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(input.reply).toHaveBeenCalledWith([
      expect.stringContaining('*KANAL INFORMASI*\n\nSilakan sampaikan informasi dengan urutan berikut:'),
    ]);
    expect(input.reply.mock.calls[0][0][0]).toContain('ketik *BATAL*.');
  });

  it('rejects a static location while a draft is active', async () => {
    const { service, prisma } = createFixture();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(activeSession());
    const input = inbound('', {
      locationMessage: {
        degreesLatitude: -6.2,
        degreesLongitude: 106.8,
        isLive: false,
      },
    });

    await service.handle(input);

    expect(input.reply).toHaveBeenCalledWith([
      expect.stringContaining('fitur *Live Location*'),
    ]);
  });

  it('accepts live location and ordinary text in any order', async () => {
    const { service, prisma } = createFixture();
    const session = activeSession();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(session);
    const target = service as any;
    const captureLive = jest.spyOn(target, 'captureLiveLocation').mockResolvedValue(undefined);
    const captureText = jest.spyOn(target, 'captureText').mockResolvedValue(undefined);

    await service.handle(
      inbound('', {
        liveLocationMessage: {
          degreesLatitude: -6.2,
          degreesLongitude: 106.8,
          accuracyInMeters: 8,
        },
      }),
    );
    await service.handle(inbound('Narasi lapangan'));

    expect(captureLive).toHaveBeenCalled();
    expect(captureText).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'session-id' }),
      expect.any(Object),
      'Narasi lapangan',
      expect.any(Function),
    );
  });

  it('replies with the standard continuation message after saving text', async () => {
    const { service, prisma } = createFixture();
    prisma.whatsAppReportSession.findUnique
      .mockResolvedValueOnce(activeSession())
      .mockResolvedValueOnce(activeSession({ content: 'Narasi lapangan' }));
    const input = inbound('Narasi lapangan');

    await service.handle(input);

    expect(input.reply).toHaveBeenCalledWith([captureResponse]);
  });

  it('replies with the standard continuation message after saving Live Location', async () => {
    const { service, prisma } = createFixture();
    prisma.whatsAppReportSession.findUnique
      .mockResolvedValueOnce(activeSession())
      .mockResolvedValueOnce(
        activeSession({
          latitude: -6.2,
          longitude: 106.8,
          locationAccuracyMeters: 8,
          locationCapturedAt: new Date(),
          locationType: 'LIVE_LOCATION',
        }),
      );
    const input = inbound('', {
      liveLocationMessage: {
        degreesLatitude: -6.2,
        degreesLongitude: 106.8,
        accuracyInMeters: 8,
      },
    });

    await service.handle(input);

    expect(input.reply).toHaveBeenCalledWith([captureResponse]);
  });

  it('replies with the standard continuation message after saving media', async () => {
    const { service, prisma } = createFixture();
    const session = activeSession();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(
      activeSession({
        content: 'Dokumentasi lapangan',
        media: [{ id: 'media-id', caption: 'Dokumentasi lapangan' }],
      }),
    );
    const target = service as any;
    jest.spyOn(target, 'storeAndScanMedia').mockResolvedValue({
      id: 'file-id',
      storageKey: 'draft/file.jpg',
    });
    const input = inbound('Dokumentasi lapangan', {
      imageMessage: {
        mimetype: 'image/jpeg',
        caption: 'Dokumentasi lapangan',
      },
    });

    await target.captureMedia(
      session,
      input,
      {
        fileType: 'PHOTO',
        mimeType: 'image/jpeg',
        caption: 'Dokumentasi lapangan',
      },
      'Dokumentasi lapangan',
    );

    expect(input.reply).toHaveBeenCalledWith([captureResponse]);
  });

  it('treats SELESAI or BATAL in a media caption as a caption, not a command', async () => {
    const { service, prisma } = createFixture();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(activeSession());
    const target = service as any;
    const captureMedia = jest.spyOn(target, 'captureMedia').mockResolvedValue(undefined);
    const purge = jest.spyOn(target, 'purgeDraftSession').mockResolvedValue(true);
    const finish = jest.spyOn(target, 'finishSession').mockResolvedValue(undefined);

    await service.handle(
      inbound('BATAL', {
        imageMessage: { mimetype: 'image/jpeg', caption: 'BATAL' },
      }),
    );

    expect(captureMedia).toHaveBeenCalled();
    expect(purge).not.toHaveBeenCalled();
    expect(finish).not.toHaveBeenCalled();
  });

  it('lists every missing requirement before submission', () => {
    const { service } = createFixture();
    const target = service as any;

    expect(target.missingRequirements(activeSession())).toEqual([
      'Isi informasi/narasi',
      'Live Location',
      'Foto atau video',
    ]);
    expect(
      target.missingRequirements(
        activeSession({
          content: 'Narasi',
          latitude: -6.2,
          longitude: 106.8,
          locationAccuracyMeters: 8,
          locationCapturedAt: new Date(),
          locationType: 'LIVE_LOCATION',
          media: [{ id: 'media-id' }],
        }),
      ),
    ).toEqual([]);
  });

  it('refuses SELESAI until every requirement is present and explains what to send', async () => {
    const { service, prisma, txMessageCreate } = createFixture();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(
      activeSession({ content: 'Narasi lapangan' }),
    );
    const input = inbound('seLeSaI');

    await service.handle(input);

    expect(txMessageCreate).not.toHaveBeenCalled();
    expect(input.reply).toHaveBeenCalledWith([
      expect.stringContaining('belum dapat dikirim karena belum lengkap'),
    ]);
    expect(input.reply.mock.calls[0][0][0]).toContain('Live Location');
    expect(input.reply.mock.calls[0][0][0]).toContain('Foto atau video');
    expect(input.reply.mock.calls[0][0][0]).toContain('ketik *SELESAI* kembali');
  });

  it('submits a complete draft once, clears its active sender key, and returns a reference', async () => {
    const {
      service,
      prisma,
      spatial,
      txMessageCreate,
      txReferenceCounterUpsert,
      txSessionUpdate,
    } = createFixture();
    const complete = activeSession({
      content: 'Narasi lengkap situasi wilayah',
      latitude: -6.2,
      longitude: 106.8,
      locationAccuracyMeters: 8,
      locationCapturedAt: new Date(),
      locationType: 'LIVE_LOCATION',
      media: [
        {
          id: 'media-id',
          fileId: 'file-id',
          caption: 'Dokumentasi',
          file: { id: 'file-id', storageKey: 'draft/file.jpg' },
        },
      ],
    });
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(complete);
    spatial.resolveReportArea.mockResolvedValue({
      area: { areaId: 'village-id' },
      method: 'POLYGON_MATCH',
      confidence: 100,
      resolvedAt: new Date(),
    });
    prisma.administrativeAreaClosure.findMany.mockResolvedValue([
      {
        depth: 3,
        ancestor: {
          name: 'Daerah Khusus Ibukota Jakarta',
          level: 'PROVINCE',
        },
      },
      {
        depth: 2,
        ancestor: {
          name: 'Kota Administrasi Jakarta Pusat',
          level: 'CITY',
        },
      },
    ]);
    txReferenceCounterUpsert.mockResolvedValue({ lastValue: 123 });
    const input = inbound('selesai');
    input.payload.receivedAt = '2026-08-05T05:00:00.000Z';

    await service.handle(input);

    expect(txMessageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: 'Narasi lengkap situasi wilayah',
        referenceNumber: 'JKT-PST-20260805-000123',
      }),
    });
    expect(txMessageCreate.mock.calls[0][0].data).not.toHaveProperty('title');
    expect(txSessionUpdate).toHaveBeenCalledWith({
      where: { id: 'session-id' },
      data: expect.objectContaining({
        status: 'SUBMITTED',
        activeSenderKey: null,
      }),
    });
    expect(input.reply).toHaveBeenCalledWith([
      expect.stringContaining('*INFORMASI BERHASIL DIKIRIM*'),
    ]);
  });

  it('cancels immediately and confirms deletion', async () => {
    const { service, prisma } = createFixture();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(activeSession());
    const target = service as any;
    const purge = jest.spyOn(target, 'purgeDraftSession').mockResolvedValue(true);
    const input = inbound('bAtAl');

    await service.handle(input);

    expect(purge).toHaveBeenCalledWith('session-id');
    expect(input.reply).toHaveBeenCalledWith([
      expect.stringContaining('dibatalkan dan dihapus'),
    ]);
  });

  it('deletes draft history before deleting the report session', async () => {
    const { service, prisma, txHistoryDeleteMany, txSessionDelete } =
      createFixture();
    prisma.whatsAppReportSession.findUnique.mockResolvedValue(activeSession());

    await expect(
      (service as any).purgeDraftSession('session-id'),
    ).resolves.toBe(true);

    expect(txHistoryDeleteMany).toHaveBeenCalledWith({
      where: { reportSessionId: 'session-id' },
    });
    expect(txSessionDelete).toHaveBeenCalledWith({
      where: { id: 'session-id' },
    });
    expect(txHistoryDeleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      txSessionDelete.mock.invocationCallOrder[0],
    );
  });

  it('cleans only active sessions from a previous WIB day', async () => {
    const { service, prisma } = createFixture();
    prisma.whatsAppReportSession.findMany.mockResolvedValue([
      { id: 'old-1' },
      { id: 'old-2' },
    ]);
    const target = service as any;
    const purge = jest.spyOn(target, 'purgeDraftSession').mockResolvedValue(true);

    await expect(service.cleanupPreviousDayDrafts()).resolves.toBe(2);

    expect(prisma.whatsAppReportSession.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        startedAt: { lt: expect.any(Date) },
      },
      select: { id: true },
    });
    expect(purge).toHaveBeenCalledTimes(2);
  });
});
