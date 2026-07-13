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
    resolvedAreaId: null,
    coordinateSource: null,
    areaResolutionMethod: 'UNRESOLVED',
    areaResolutionConfidence: null,
    areaResolvedAt: null,
    validationSummary: WhatsAppValidationSummary.NOT_CHECKED,
    status: WhatsAppMessageStatus.UNDER_REVIEW,
    convertedBaketId: null,
    ...overrides,
  };
}

describe('WhatsApp intake Baket', () => {
  it('tidak mengambil BigInt sizeBytes pada daftar pesan publik', async () => {
    const findMany = jest.fn(() => []);
    const service = new WhatsAppService(
      { whatsAppMessage: { findMany } } as never,
      {} as never,
      {} as never,
    );

    await service.list({ limit: 100 }, context);

    const query = findMany.mock.calls[0]?.[0] as {
      include?: {
        media?: {
          include?: { file?: { select?: Record<string, boolean> } };
        };
      };
    };
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

  it('mengembalikan Baket yang sama pada request konversi ulang', async () => {
    let message: Record<string, unknown> = baseMessage({
      validationSummary: WhatsAppValidationSummary.VALID,
      status: WhatsAppMessageStatus.READY_FOR_BAKET,
    });
    const baket = {
      id: '55555555-5555-4555-8555-555555555555',
      status: 'DRAFT',
    };
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
        create: jest.fn(() => baket),
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
    const service = new WhatsAppService(
      prisma as never,
      {
        findContainingAreas: jest.fn(() => [
          { areaId: '66666666-6666-4666-8666-666666666666' },
        ]),
      } as never,
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
    expect(tx.baket.create).toHaveBeenCalledTimes(1);
    const createInput = tx.baket.create.mock.calls[0]?.[0] as unknown as {
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
    expect(createInput.data.status).toBe(BaketStatus.READY_TO_SEND);
    expect(createInput.data.versions.create).toEqual(
      expect.objectContaining({
        eventAreaId: '66666666-6666-4666-8666-666666666666',
        areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
        areaResolutionConfidence: 100,
      }),
    );
    expect(message).toEqual(
      expect.objectContaining({
        resolvedAreaId: '66666666-6666-4666-8666-666666666666',
        areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
        areaResolutionConfidence: 100,
      }),
    );
    expect(message.status).toBe(WhatsAppMessageStatus.PROCESSED);
  });
});
