import { jest } from '@jest/globals';
import { ExecutiveDashboardPeriod } from './executive-dashboard.dto.js';
import { ExecutiveDashboardService } from './executive-dashboard.service.js';

const context = {
  authUserId: 'auth-user',
  authRole: 'executive',
  userProfileId: 'profile',
  userProfileStatus: 'ACTIVE',
  primaryAssignmentId: 'assignment-executive',
  operationalAssignmentId: 'assignment-executive',
  positionId: 'assignment-executive',
  positionCode: 'EXECUTIVE',
  positionTitle: 'Executive',
  roleCode: 'EXECUTIVE',
  organizationUnitId: 'unit',
  organizationUnitName: 'Kedeputian II',
  organizationUnitType: 'PUSAT',
  commandRouteType: 'PUSAT',
  areaScopes: [],
} as never;

function report(overrides: Record<string, unknown> = {}) {
  return {
    id: 'report-1',
    referenceNumber: 'LJ-000001',
    content: 'Laporan kondisi wilayah yang telah diterima dari Jaring.',
    senderPhone: '628000000000',
    status: 'SUBMITTED',
    submittedAt: new Date('2026-08-05T03:00:00.000Z'),
    startedAt: new Date('2026-08-05T02:00:00.000Z'),
    updatedAt: new Date('2026-08-05T03:00:00.000Z'),
    latitude: 1,
    longitude: 1,
    fieldOfficerAssignmentId: 'field-officer-1',
    fieldOfficerAssignment: {
      role: { code: 'FIELD_OFFICER', name: 'Petugas Wilayah' },
      userProfile: {
        id: 'profile-field-officer-1',
        fullName: 'Petugas Satu',
        username: 'petugas1',
      },
      areaScopes: [],
    },
    jaring: {
      id: 'jaring-1',
      aliasName: 'Jaring Alpha',
      fullName: null,
      registrationStatus: 'APPROVED',
      caretakerAssignments: [],
      areaCoverages: [],
    },
    media: [
      { id: 'media-1', mediaType: 'PHOTO' },
      { id: 'media-2', mediaType: 'DOCUMENT' },
    ],
    submittedMessage: {
      content: 'Laporan lengkap',
      senderPhone: '628000000000',
      jaringId: 'jaring-1',
      latitude: 1,
      longitude: 1,
      resolvedAreaId: 'area-1',
      rawPayload: {},
      status: 'READY_FOR_BAKET',
      validationSummary: 'VALID',
      coordinateSource: 'WHATSAPP_LOCATION',
      category: { id: 'category-1', name: 'Ekonomi' },
      resolvedArea: { id: 'area-1', name: 'Wilayah Satu', level: 'DISTRICT' },
      _count: { media: 2 },
      convertedBaket: {
        id: 'baket-1',
        status: 'READY_TO_SEND',
        currentVersionNumber: 1,
        reportCategory: { id: 'category-1', name: 'Ekonomi' },
        revisionRequests: [],
        versions: [
          {
            urgency: 'URGENT',
            coverageValidationStatus: 'WITHIN_SCOPE',
            coordinateSource: 'WHATSAPP_LOCATION',
            attachments: [{ fileId: 'file-1' }],
            verification: null,
          },
        ],
      },
    },
    ...overrides,
  };
}

describe('ExecutiveDashboardService', () => {
  function setup(currentReports = [report()], previousReports: unknown[] = []) {
    const prisma = {
      whatsAppReportSession: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce(currentReports)
          .mockResolvedValueOnce(previousReports),
      },
      intelligenceProduct: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      jaring: { findMany: jest.fn().mockResolvedValue([]) },
      task: { findMany: jest.fn().mockResolvedValue([]) },
      directive: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      productApprovalStep: { count: jest.fn().mockResolvedValue(0) },
    };
    const scope = {
      jaringWhere: jest.fn().mockResolvedValue({ deletedAt: null }),
      productWhere: jest.fn().mockResolvedValue({}),
      resolve: jest.fn().mockResolvedValue({
        assignmentIds: ['assignment-executive', 'field-officer-1'],
        areaRootIds: [],
      }),
      assertArea: jest.fn(),
    };
    const cache = {
      getOrSet: jest.fn((_options: unknown, loader: () => Promise<unknown>) =>
        loader(),
      ),
    };
    return {
      service: new ExecutiveDashboardService(
        prisma as never,
        scope as never,
        cache as never,
      ),
      prisma,
      scope,
    };
  }

  it('menghitung satu laporan unik walau mempunyai banyak media dan memisahkan verifikasi dari Baket', async () => {
    const { service } = setup();
    const result = await service.dashboard(
      {
        period: ExecutiveDashboardPeriod.LAST_30_DAYS,
        timezone: 'Asia/Jakarta',
      },
      context,
    );

    const cards = Object.fromEntries(
      result.overview.cards.map((card) => [card.key, card.value]),
    );
    expect(cards).toMatchObject({
      totalReports: 1,
      completeReports: 1,
      incompleteReports: 0,
      verifiedReports: 1,
      draftBakets: 1,
      validatedBakets: 0,
      urgentReports: 1,
    });
    expect(result.operations.jaringRanking[0]).toMatchObject({ reports: 1 });
    expect(result.operations.fieldOfficerRanking[0]).toMatchObject({
      userProfileId: 'profile-field-officer-1',
      drilldown:
        '/dashboard/field-officers/field-officer-1?userProfileId=profile-field-officer-1',
    });
    expect(
      result.analytics.trend.points.reduce(
        (sum, point) => sum + point.total,
        0,
      ),
    ).toBe(cards.totalReports);
    expect(
      result.operations.regionalRanking.reduce(
        (sum, area) => sum + area.reports,
        0,
      ),
    ).toBe(cards.totalReports);
    expect(result.operations.reportViews.latest[0]?.id).toBe('report-1');
  });

  it('menggunakan durasi periode sebelumnya yang sama dan aman saat pembanding nol', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-06T05:00:00.000Z'));
    const { service } = setup();
    const result = await service.dashboard(
      {
        period: ExecutiveDashboardPeriod.LAST_7_DAYS,
        timezone: 'Asia/Jakarta',
      },
      context,
    );

    const activeDuration =
      new Date(result.period.to).getTime() -
      new Date(result.period.from).getTime();
    const comparisonDuration =
      new Date(result.period.previousTo).getTime() -
      new Date(result.period.previousFrom).getTime();
    expect(comparisonDuration).toBe(activeDuration);
    expect(result.overview.cards[0].comparison?.percent).toBeNull();
    jest.useRealTimers();
  });

  it('menolak filter Petugas Wilayah di luar assignment scope tanpa menjalankan query laporan', async () => {
    const { service, prisma } = setup();
    await expect(
      service.dashboard(
        {
          period: ExecutiveDashboardPeriod.LAST_30_DAYS,
          timezone: 'Asia/Jakarta',
          fieldOfficerAssignmentId: '00000000-0000-4000-8000-000000000999',
        },
        context,
      ),
    ).rejects.toMatchObject({ code: 'DASHBOARD_FILTER_OUTSIDE_SCOPE' });
    expect(prisma.whatsAppReportSession.findMany).not.toHaveBeenCalled();
  });
});
