import { jest } from '@jest/globals';
import {
  JaringRegistrationStatus,
  JaringStatus,
} from '../../generated/prisma/client.js';
import { KpiService } from './kpi.service.js';

function defaultScope() {
  return {
    jaringWhere: jest.fn(() => Promise.resolve({ deletedAt: null })),
    baketWhere: jest.fn(() => Promise.resolve({})),
    assertArea: jest.fn(() => Promise.resolve(undefined)),
    resolve: jest.fn(() =>
      Promise.resolve({
        organizationUnitId: 'unit-id',
        commandRouteType: 'PUSAT',
        assignmentIds: ['assignment-id'],
        areaRootIds: [],
      }),
    ),
    scopeSummary: jest.fn(() => ({
      role: 'executive',
      roleCode: 'EXECUTIVE',
      commandRouteType: 'PUSAT',
      organizationUnitId: 'unit-id',
      organizationUnitName: 'Kedeputian II',
      supervisionMode: 'NATIONAL',
      supervisionLabel: 'Cakupan Nasional',
      scopeDescription: 'Data ditampilkan sesuai cakupan nasional.',
      areas: [],
      label: 'Kedeputian II',
    })),
  };
}

function defaultCache() {
  return {
    getOrSet: jest.fn((_options: unknown, loader: () => Promise<unknown>) =>
      loader(),
    ),
    invalidate: jest.fn(() => Promise.resolve(undefined)),
  };
}

function createService(
  prisma: unknown,
  scope: unknown = defaultScope(),
  cache: unknown = defaultCache(),
) {
  return new KpiService(prisma as never, scope as never, cache as never);
}

const context = {
  authRole: 'executive',
  roleCode: 'EXECUTIVE',
  userProfileId: 'user-profile-id',
  primaryAssignmentId: 'assignment-id',
  organizationUnitId: 'unit-id',
  organizationUnitName: 'Kedeputian II',
  commandRouteType: 'PUSAT',
  areaScopes: [],
} as never;

describe('KpiService summary', () => {
  it('menghasilkan ringkasan aman saat tidak ada data', async () => {
    const prisma = {
      jaring: { findMany: jest.fn(() => Promise.resolve([])) },
      whatsAppReportSession: { findMany: jest.fn(() => Promise.resolve([])) },
      baket: { findMany: jest.fn(() => Promise.resolve([])) },
      baketVersionSourceMessage: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      whatsAppDeviceActivityLog: {
        count: jest.fn(() => Promise.resolve(0)),
      },
    };
    const service = createService(prisma);

    const result = await service.summary(
      { period: 'LAST_30_DAYS' } as never,
      context,
    );

    expect(result).toBeDefined();
    const cards = result.cards as Array<{ key: string; value: number }>;
    expect(cards.every((card) => Number.isFinite(card.value))).toBe(true);
    const totalJaring = cards.find((card) => card.key === 'totalJaring');
    expect(totalJaring?.value).toBe(0);
  });

  it('menyajikan kartu status Jaring dan produktivitas sesuai kelompok verifikasi', async () => {
    const activeVerified = {
      id: 'jaring-1',
      status: JaringStatus.ACTIVE,
      registrationStatus: JaringRegistrationStatus.APPROVED,
      registeredAt: new Date(),
      reviewedAt: new Date(),
      whatsappNumber: '6281200000001',
      areaCoverages: [],
      messages: [{ receivedAt: new Date() }],
      reportSessions: [{ submittedAt: new Date() }],
    };
    const pending = {
      ...activeVerified,
      id: 'jaring-2',
      registrationStatus: JaringRegistrationStatus.PENDING,
      status: JaringStatus.INACTIVE,
    };
    const report = {
      id: 'session-1',
      jaringId: 'jaring-1',
      senderPhone: '6281200000001',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      startedAt: new Date(),
      submittedMessageId: 'msg-1',
      submittedMessage: {
        id: 'msg-1',
        status: 'READY_FOR_BAKET',
        senderPhone: '6281200000001',
        referenceNumber: 'REF-1',
        contentChecksum: 'checksum',
        receivedAt: new Date(),
        integrationChannelId: 'channel-1',
        convertedBaketId: null,
        convertedBaket: null,
      },
    };
    const prisma = {
      jaring: {
        findMany: jest.fn(() => Promise.resolve([activeVerified, pending])),
      },
      whatsAppReportSession: {
        findMany: jest.fn(() => Promise.resolve([report])),
      },
      baket: { findMany: jest.fn(() => Promise.resolve([])) },
      baketVersionSourceMessage: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
      whatsAppDeviceActivityLog: {
        count: jest.fn(() => Promise.resolve(0)),
      },
    };
    const service = createService(prisma);

    const result = await service.summary(
      { period: 'LAST_30_DAYS' } as never,
      context,
    );

    const cards = result.cards as Array<{ key: string; value: number }>;
    const totalCard = cards.find((card) => card.key === 'totalJaring');
    const verifiedCard = cards.find((card) => card.key === 'verifiedJaring');
    const activeCard = cards.find((card) => card.key === 'activeJaring');
    const inactiveCard = cards.find((card) => card.key === 'inactiveJaring');
    const productivityCard = cards.find(
      (card) => card.key === 'productivityPercent',
    );
    expect(totalCard?.value).toBe(2);
    expect(verifiedCard?.value).toBe(1);
    expect(activeCard?.value).toBe(1);
    expect(inactiveCard?.value).toBe(0);
    expect(productivityCard?.value).toBe(100);
  });
});
