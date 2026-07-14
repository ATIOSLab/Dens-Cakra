import { validate } from 'class-validator';
import { jest } from '@jest/globals';
import {
  AreaResolutionMethod,
  BaketStatus,
  PriorityLevel,
  WhatsAppMessageStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { CreateBaketFromMessageDto } from './whatsapp.dto.js';
import { WhatsAppService } from './whatsapp.service.js';

const context = {
  userProfileId: 'user-profile',
  primaryAssignmentId: 'assignment-fo',
} as never;

const RESOLVED_AREA_ID = '66666666-6666-4666-8666-666666666666';

function baseMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Judul laporan',
    content: 'Isi laporan',
    senderPhone: '628123456789',
    jaringId: '22222222-2222-4222-8222-222222222222',
    jaring: {
      id: '22222222-2222-4222-8222-222222222222',
      cluster: {
        id: '33333333-3333-4333-8333-333333333333',
        isActive: true,
      },
    },
    rawPayload: { photoMessageId: 'wa-photo' },
    media: [],
    receivedAt: new Date('2026-07-13T09:00:00.000Z'),
    locationCapturedAt: null,
    latitude: -6.2,
    longitude: 106.8,
    gpsAccuracyMeters: 5,
    resolvedAreaId: RESOLVED_AREA_ID,
    coordinateSource: null,
    areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
    areaResolutionConfidence: 100,
    areaResolvedAt: new Date('2026-07-13T09:00:01.000Z'),
    validationSummary: WhatsAppValidationSummary.NOT_CHECKED,
    status: WhatsAppMessageStatus.UNDER_REVIEW,
    convertedBaketId: null,
    ...overrides,
  };
}

describe('WhatsApp intake Baket', () => {
  it('tidak mengambil BigInt sizeBytes pada daftar pesan publik', async () => {
    type FindManyInput = {
      include?: {
        media?: {
          include?: { file?: { select?: Record<string, boolean> } };
        };
      };
    };
    const findMany = jest.fn<(input: FindManyInput) => unknown[]>(() => []);
    const service = new WhatsAppService(
      { whatsAppMessage: { findMany } } as never,
      {} as never,
      {} as never,
    );

    await service.list({ limit: 100 }, context);

    const query = findMany.mock.calls[0]?.[0];
    expect(query.include?.media?.include?.file?.select).toEqual(
      expect.objectContaining({ id: true, mimeType: true }),
    );
    expect(query.include?.media?.include?.file?.select).not.toHaveProperty(
      'sizeBytes',
    );
  });

  it('mewajibkan kategori dan urgency pada kontrak konversi', async () => {
    const dto = new CreateBaketFromMessageDto();
    const errors = await validate(dto);
    expect(errors.map((error) => error.property).sort()).toEqual([
      'categoryId',
      'urgency',
    ]);
  });

  it('memindahkan pesan valid ke READY_FOR_BAKET tanpa kategori atau urgency', async () => {
    let message: Record<string, unknown> = baseMessage();
    const tx = {
      whatsAppValidationIssue: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      whatsAppMessage: {
        update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          message = { ...message, ...data };
        }),
      },
    };
    const prisma = {
      whatsAppMessage: { findFirstOrThrow: jest.fn(() => message) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const service = new WhatsAppService(
      prisma as never,
      {} as never,
      {} as never,
    );

    const result = await service.validate(message.id as string, context);

    expect(result.status).toBe(WhatsAppMessageStatus.READY_FOR_BAKET);
    expect(result.validationSummary).toBe(WhatsAppValidationSummary.VALID);
    expect(tx.whatsAppValidationIssue.createMany).not.toHaveBeenCalled();
  });

  it('menolak validasi ketika koordinat belum mempunyai wilayah tersimpan', async () => {
    let message: Record<string, unknown> = baseMessage({
      resolvedAreaId: null,
      areaResolutionMethod: AreaResolutionMethod.UNRESOLVED,
      areaResolutionConfidence: null,
      areaResolvedAt: null,
    });
    const tx = {
      whatsAppValidationIssue: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      whatsAppMessage: {
        update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          message = { ...message, ...data };
        }),
      },
    };
    const service = new WhatsAppService(
      {
        whatsAppMessage: { findFirstOrThrow: jest.fn(() => message) },
        $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
          callback(tx),
        ),
      } as never,
      {} as never,
      {} as never,
    );

    const result = await service.validate(message.id as string, context);

    expect(result.validationSummary).toBe(WhatsAppValidationSummary.INVALID);
    expect(tx.whatsAppValidationIssue.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          code: 'UNRESOLVED_AREA',
        }),
      ],
    });
  });

  it('menyalin area tersimpan tanpa query PostGIS ulang dan tetap idempoten', async () => {
    let message: Record<string, unknown> = baseMessage({
      validationSummary: WhatsAppValidationSummary.VALID,
      status: WhatsAppMessageStatus.READY_FOR_BAKET,
    });
    const baket = {
      id: '55555555-5555-4555-8555-555555555555',
      status: 'DRAFT',
    };
    type BaketCreateInput = {
      data: {
        status: BaketStatus;
        versions: {
          create: {
            eventAreaId: string;
            areaResolutionMethod: AreaResolutionMethod;
            areaResolutionConfidence: number;
          };
        };
      };
    };
    const createBaket = jest.fn<(input: BaketCreateInput) => typeof baket>(
      () => baket,
    );
    const tx = {
      $queryRaw: jest.fn(),
      whatsAppMessage: {
        findFirst: jest.fn(() => message),
        update: jest.fn(({ data }: { data: Record<string, unknown> }) => {
          message = { ...message, ...data };
        }),
      },
      reportCategory: {
        findFirst: jest.fn(() => ({
          id: '44444444-4444-4444-8444-444444444444',
        })),
      },
      taskAssignment: { findFirst: jest.fn() },
      baket: {
        create: createBaket,
        findUniqueOrThrow: jest.fn(() => baket),
      },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      whatsAppMessage: { findFirstOrThrow: jest.fn(() => message) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const resolveReportArea = jest.fn();
    const service = new WhatsAppService(
      prisma as never,
      { resolveReportArea } as never,
      {} as never,
    );
    const body = {
      categoryId: '44444444-4444-4444-8444-444444444444',
      urgency: PriorityLevel.HIGH,
    };

    const first = await service.createBaket(
      message.id as string,
      body,
      context,
    );
    const second = await service.createBaket(
      message.id as string,
      body,
      context,
    );

    expect(first).toBe(baket);
    expect(second).toBe(baket);
    expect(resolveReportArea).not.toHaveBeenCalled();
    expect(createBaket).toHaveBeenCalledTimes(1);
    const createInput = createBaket.mock.calls[0]?.[0];
    expect(createInput.data.status).toBe(BaketStatus.READY_TO_SEND);
    expect(createInput.data.versions.create).toEqual(
      expect.objectContaining({
        eventAreaId: RESOLVED_AREA_ID,
        areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
        areaResolutionConfidence: 100,
      }),
    );
    expect(message).toEqual(
      expect.objectContaining({
        resolvedAreaId: RESOLVED_AREA_ID,
        areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
        areaResolutionConfidence: 100,
      }),
    );
    expect(message.status).toBe(WhatsAppMessageStatus.PROCESSED);
  });
});
