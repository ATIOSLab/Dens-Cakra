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
      aliasName: 'W01001',
      fullName: 'Jaring Alpha',
      registrationStatus: 'APPROVED',
      caretakerAssignments: [],
      areaCoverages: [],
    },
    media: [
      { id: 'media-1', mediaType: 'PHOTO' },
      { id: 'media-2', mediaType: 'DOCUMENT' },
    ],
    submittedMessage: {
      content: 'Laporan situasi wilayah',
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

function jaring(overrides: Record<string, unknown> = {}) {
  return {
    id: 'jaring-1',
    aliasName: 'W01001',
    fullName: 'Jaring Alpha',
    status: 'ACTIVE',
    registrationStatus: 'APPROVED',
    registeredAt: new Date('2026-07-01T00:00:00.000Z'),
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    messages: [{ receivedAt: new Date('2026-08-05T03:00:00.000Z') }],
    reportSessions: [],
    caretakerAssignments: [
      {
        fieldOfficerAssignment: {
          id: 'field-officer-1',
          userProfile: {
            id: 'profile-field-officer-1',
            fullName: 'Petugas Satu',
            username: 'petugas1',
          },
          areaScopes: [],
        },
      },
    ],
    areaCoverages: [
      {
        area: {
          id: 'cilandak',
          name: 'Cilandak',
          level: 'DISTRICT',
          parent: {
            id: 'jakarta-selatan',
            name: 'Kota Administrasi Jakarta Selatan',
            level: 'CITY',
            parent: {
              id: 'dki-jakarta',
              name: 'Daerah Khusus Ibukota Jakarta',
              level: 'PROVINCE',
              parent: null,
            },
          },
        },
      },
    ],
    ...overrides,
  };
}

function scopeSummary(scopeContext: any) {
  const areas = (
    scopeContext.areaScopes as Array<{
      areaId: string;
      code: string;
      name: string;
      level: string;
    }>
  ).map((area) => {
    const isDkiJakarta =
      area.code === '31' ||
      area.code.startsWith('31.') ||
      area.name.toLocaleLowerCase('id-ID').includes('dki jakarta') ||
      area.name
        .toLocaleLowerCase('id-ID')
        .includes('daerah khusus ibukota jakarta');

    return {
      id: area.areaId,
      code: area.code,
      name: area.name,
      level: area.level,
      isDkiJakarta,
    };
  });
  const isDkiDirectorateScope =
    scopeContext.commandRouteType === 'DIRECTORATE' &&
    areas.some(
      (area) =>
        area.isDkiJakarta &&
        (area.level === 'REGENCY' || area.level === 'CITY'),
    );

  return {
    role: scopeContext.authRole,
    roleCode: scopeContext.roleCode,
    commandRouteType: scopeContext.commandRouteType,
    organizationUnitId: scopeContext.organizationUnitId,
    organizationUnitName: scopeContext.organizationUnitName,
    supervisionMode: isDkiDirectorateScope ? 'DKI_REGENCY_CITY' : 'NATIONAL',
    supervisionLabel: isDkiDirectorateScope
      ? 'Supervisi DKI berbasis Kota/Kabupaten'
      : 'Cakupan Nasional',
    scopeDescription: isDkiDirectorateScope
      ? 'Provinsi DKI Jakarta ditampilkan berdasarkan kota/kabupaten administratif yang ditetapkan admin untuk supervisi Direktorat/Ditwil.'
      : 'Data ditampilkan sesuai cakupan nasional dan kewenangan hak akses pengguna.',
    areas,
    label:
      areas.length > 0
        ? areas.map((area) => area.name).join(', ')
        : scopeContext.organizationUnitName,
  };
}

describe('ExecutiveDashboardService', () => {
  const mockResolved = <T>(value: T) =>
    jest.fn<() => Promise<T>>().mockResolvedValue(value);

  function setup(
    currentReports: unknown[] = [report()],
    previousReports: unknown[] = [],
    currentJaring: unknown[] = [],
  ) {
    const prisma = {
      whatsAppReportSession: {
        findMany: jest
          .fn<() => Promise<unknown[]>>()
          .mockResolvedValueOnce(currentReports)
          .mockResolvedValueOnce(previousReports),
      },
      intelligenceProduct: {
        findMany: mockResolved<unknown[]>([]),
        count: mockResolved(0),
      },
      jaring: { findMany: mockResolved<unknown[]>(currentJaring) },
      task: { findMany: mockResolved<unknown[]>([]) },
      directive: { findMany: mockResolved<unknown[]>([]) },
      auditLog: { findMany: mockResolved<unknown[]>([]) },
      productApprovalStep: { count: mockResolved(0) },
    };
    const scope = {
      jaringWhere: mockResolved({ deletedAt: null }),
      productWhere: mockResolved({}),
      resolve: mockResolved({
        assignmentIds: ['assignment-executive', 'field-officer-1'],
        areaRootIds: [] as string[],
      }),
      assertArea: jest.fn(),
      scopeSummary: jest.fn(scopeSummary),
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
      baketCreatedReports: 1,
      draftBakets: 1,
      validatedBakets: 0,
      urgentReports: 1,
    });
    expect(result.operations.jaringRanking[0]).toMatchObject({
      code: 'W01001',
      name: 'Jaring Alpha',
      reports: 1,
    });
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

  it('menghitung Korwil dan Gaswil dari cakupan RBAC dashboard', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-06T05:00:00.000Z'));
    const { service } = setup(
      [],
      [],
      [
        jaring(),
        jaring({
          id: 'jaring-2',
          aliasName: 'Jaring Bravo',
          messages: [],
          caretakerAssignments: [
            {
              fieldOfficerAssignment: {
                id: 'field-officer-2',
                userProfile: {
                  id: 'profile-field-officer-2',
                  fullName: 'Petugas Dua',
                  username: 'petugas2',
                },
                areaScopes: [],
              },
            },
          ],
        }),
      ],
    );

    const result = await service.dashboard(
      {
        period: ExecutiveDashboardPeriod.LAST_30_DAYS,
        timezone: 'Asia/Jakarta',
      },
      context,
    );

    expect(result.operations.networkSummary).toMatchObject({
      total: 2,
      korwilCount: 1,
      gaswilCount: 2,
      active: 1,
      inactive: 1,
    });
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

  it('menjelaskan scope supervisi DKI berbasis kota/kabupaten untuk Direktorat', async () => {
    const { service } = setup();
    const result = await service.dashboard(
      {
        period: ExecutiveDashboardPeriod.LAST_30_DAYS,
        timezone: 'Asia/Jakarta',
      },
      {
        ...context,
        authRole: 'regional_commander',
        roleCode: 'REGIONAL_COMMANDER',
        commandRouteType: 'DIRECTORATE',
        organizationUnitName: 'Direktorat 21',
        areaScopes: [
          {
            areaId: 'jakarta-selatan',
            code: '31.74',
            name: 'Kota Administrasi Jakarta Selatan',
            level: 'CITY',
            isPrimary: true,
          },
        ],
      } as never,
    );

    expect(result.scope).toMatchObject({
      supervisionMode: 'DKI_REGENCY_CITY',
      supervisionLabel: 'Supervisi DKI berbasis Kota/Kabupaten',
      label: 'Kota Administrasi Jakarta Selatan',
    });
    expect(result.scope.scopeDescription).toContain('ditetapkan admin');
  });
});
