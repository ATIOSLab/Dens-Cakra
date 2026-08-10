import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  BaketStatus,
  CoordinateSource,
  PriorityLevel,
  RoleCode,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import {
  AgentLocationState,
  MapMarkersQuery,
  MapMarkerType,
} from './map-markers.dto.js';
import { MapMarkersService } from './map-markers.service.js';

const BANDUNG = {
  id: '4ff04b73-f5d7-4f9b-a757-74cd07f6ae70',
  code: '32.73',
  name: 'Kota Bandung',
  level: AdministrativeLevel.CITY,
  boundaryQualityStatus: 'VERIFIED',
};

describe('MapMarkersService', () => {
  it('caches marker collections by authorization scope and query', async () => {
    const cached = {
      type: 'FeatureCollection',
      features: [],
      meta: { counts: { total: 0 } },
    };
    const cache = {
      getOrSet: jest.fn().mockResolvedValue(cached as never),
    };
    const service = new MapMarkersService(
      {} as never,
      {} as never,
      {} as never,
      cache as never,
    );
    const query = new MapMarkersQuery();
    const context = {
      authRole: 'executive',
      roleCode: RoleCode.EXECUTIVE,
      primaryAssignmentId: 'assignment-1',
      organizationUnitId: 'unit-1',
      areaScopes: [{ areaId: BANDUNG.id }],
    };

    await expect(service.list(query, context as never)).resolves.toBe(cached);
    expect(cache.getOrSet).toHaveBeenCalledWith(
      expect.objectContaining({
        namespace: 'map-markers',
        identity: expect.objectContaining({
          scope: expect.objectContaining({
            primaryAssignmentId: 'assignment-1',
            areaIds: [BANDUNG.id],
          }),
          query,
        }),
        ttlMs: 75_000,
      }),
      expect.any(Function),
    );
  });

  it('pushes the effective report date range into the Prisma query', async () => {
    const prisma = {
      reportCategory: { findMany: jest.fn().mockResolvedValue([] as never) },
      whatsAppReportSession: {
        findMany: jest.fn().mockResolvedValue([] as never),
      },
    };
    const scope = { jaringWhere: jest.fn().mockResolvedValue({} as never) };
    const spatial = {
      matchCoordinates: jest.fn().mockResolvedValue(new Map() as never),
    };
    const service = new MapMarkersService(
      prisma as never,
      scope as never,
      spatial as never,
    );
    const query = new MapMarkersQuery();
    query.types = [MapMarkerType.REPORT];
    query.from = '2026-07-01T00:00:00.000Z';
    query.to = '2026-07-31T23:59:59.999Z';

    await service.list(query, {} as never);

    expect(prisma.whatsAppReportSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              OR: [
                {
                  submittedAt: {
                    gte: new Date(query.from),
                    lte: new Date(query.to),
                  },
                },
                {
                  submittedAt: null,
                  startedAt: {
                    gte: new Date(query.from),
                    lte: new Date(query.to),
                  },
                },
              ],
            },
          ]),
        }),
      }),
    );
  });

  it('combines categorized BAKET and scoped personnel into one GeoJSON collection', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-13T10:00:00.000Z'));
    const prisma = {
      reportCategory: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'category', code: 'AKSI_MASSA', name: 'Aksi Massa' },
          ] as never),
      },
      baket: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'baket',
            status: BaketStatus.VERIFIED,
            currentVersionNumber: 1,
            createdAt: new Date('2026-07-13T08:00:00.000Z'),
            reportCategory: {
              id: 'category',
              code: 'AKSI_MASSA',
              name: 'Aksi Massa',
            },
            convertedSourceMessages: [
              {
                id: 'source-message',
                referenceNumber: 'LJ-001',
                reportSession: { id: 'report-session', referenceNumber: 'LJ-001' },
              },
            ],
            _count: { convertedSourceMessages: 1 },
            primaryJaring: null,
            createdByFieldOfficerAssignment: {
              id: 'officer-assignment',
              branch: 'BINDA',
              userProfile: { id: 'officer', fullName: 'Petugas Satu' },
              role: { code: RoleCode.FIELD_OFFICER, name: 'Petugas Organik' },
              areaScopes: [{ area: { id: 'unit', name: 'Unit Bandung' } }],
            },
            versions: [
              {
                id: 'version',
                versionNumber: 1,
                eventAreaId: BANDUNG.id,
                latitude: -6.9175,
                longitude: 107.6191,
                locationCapturedAt: new Date('2026-07-13T09:00:00.000Z'),
                coordinateSource: CoordinateSource.DEVICE_GPS,
                areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
                areaResolutionConfidence: 100,
                urgency: PriorityLevel.HIGH,
                createdAt: new Date('2026-07-13T09:00:00.000Z'),
                eventArea: null,
              },
            ],
          },
        ] as never),
      },
      jaringCaretakerAssignment: {
        findMany: jest.fn().mockResolvedValue([] as never),
      },
    };
    const scope = {
      baketWhere: jest.fn().mockResolvedValue({} as never),
      resolve: jest.fn().mockResolvedValue({
        assignmentIds: ['agent-assignment'],
      } as never),
    };
    const spatial = {
      matchCoordinates: jest.fn((points: Array<{ id: string }>) =>
        Promise.resolve(new Map(points.map((point) => [point.id, [BANDUNG]]))),
      ),
      findLatestPersonnelLocations: jest.fn().mockResolvedValue([
        {
          pingId: 'ping',
          assignmentId: 'agent-assignment',
          userProfileId: 'agent',
          userName: 'Agen Bandung',
          positionTitle: 'Petugas Organik',
          positionCode: RoleCode.FIELD_OFFICER,
          unitId: 'unit',
          unitName: 'Unit Bandung',
          latitude: -6.92,
          longitude: 107.61,
          gpsAccuracyMeters: 5,
          coordinateSource: CoordinateSource.DEVICE_GPS,
          areaResolutionMethod: AreaResolutionMethod.POLYGON_MATCH,
          capturedAt: new Date('2026-07-13T09:55:00.000Z'),
        },
      ] as never),
    };
    const service = new MapMarkersService(
      prisma as never,
      scope as never,
      spatial as never,
    );

    const result = await service.list(new MapMarkersQuery(), {} as never);

    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toHaveLength(2);
    expect(result.features[0]?.properties).toEqual(
      expect.objectContaining({
        markerType: 'baket',
        markerKey: 'baket:AKSI_MASSA',
        primaryArea: BANDUNG,
        fieldOfficer: {
          assignmentId: 'officer-assignment',
          userProfileId: 'officer',
          name: 'Petugas Satu',
          positionTitle: 'Petugas Organik',
          unitId: 'unit',
          unitName: 'Unit Bandung',
        },
      }),
    );
    expect(result.features[1]?.properties).toEqual(
      expect.objectContaining({
        markerType: 'agent',
        agentState: AgentLocationState.ACTIVE,
        ageMinutes: 5,
      }),
    );
    expect(result.meta.counts).toEqual(
      expect.objectContaining({
        total: 2,
        baket: 1,
        agent: 1,
        activeAgents: 1,
      }),
    );
    expect(prisma.baket.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            {
              convertedSourceMessages: {
                some: {
                  validationSummary: WhatsAppValidationSummary.VALID,
                  reportSession: { isNot: null },
                },
              },
            },
          ]),
        }),
      }),
    );
    jest.useRealTimers();
  });

  it('intersects an explicitly requested assignment with reporting-line scope', async () => {
    const prisma = {
      reportCategory: { findMany: jest.fn().mockResolvedValue([] as never) },
      jaringCaretakerAssignment: {
        findMany: jest.fn().mockResolvedValue([] as never),
      },
    };
    const scope = {
      resolve: jest.fn().mockResolvedValue({
        assignmentIds: ['allowed-assignment'],
      } as never),
    };
    const spatial = {
      findLatestPersonnelLocations: jest.fn().mockResolvedValue([] as never),
      matchCoordinates: jest.fn().mockResolvedValue(new Map() as never),
    };
    const service = new MapMarkersService(
      prisma as never,
      scope as never,
      spatial as never,
    );
    const query = new MapMarkersQuery();
    query.types = [MapMarkerType.AGENT];
    query.assignmentIds = ['outside-scope'];

    await service.list(query, {} as never);

    expect(spatial.findLatestPersonnelLocations).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentIds: [] }),
    );
  });

  it('maps only actual report coordinates while keeping unlocated reports in summary', async () => {
    const locatedReport = {
      id: 'report-located',
      jaringId: 'jaring-1',
      fieldOfficerAssignmentId: 'officer-assignment',
      status: 'COMPLETED',
      currentState: 'COMPLETED',
      content: 'Laporan kegiatan aktual',
      latitude: -6.9175,
      longitude: 107.6191,
      locationAccuracyMeters: 8,
      locationCapturedAt: new Date('2026-07-13T09:00:00.000Z'),
      locationType: 'LIVE_LOCATION',
      referenceNumber: 'LJ-001',
      submittedAt: new Date('2026-07-13T09:00:00.000Z'),
      startedAt: new Date('2026-07-13T08:50:00.000Z'),
      createdAt: new Date('2026-07-13T08:50:00.000Z'),
      jaring: {
        id: 'jaring-1',
        aliasName: 'JR-001',
        fullName: 'Jaring Satu',
        profilePhotoFileId: 'photo-1',
        caretakerAssignments: [
          {
            fieldOfficerAssignment: {
              id: 'officer-assignment',
              userProfile: { id: 'officer-1', fullName: 'Petugas Satu' },
            },
          },
        ],
      },
      submittedMessage: {
        id: 'message-1',
        referenceNumber: 'LJ-001',
        content: 'Laporan kegiatan aktual',
        senderPhone: '628123456789',
        jaringId: 'jaring-1',
        latitude: -6.9175,
        longitude: 107.6191,
        resolvedAreaId: BANDUNG.id,
        rawPayload: { photoMessageId: 'photo-message' },
        status: 'PROCESSED',
        validationSummary: WhatsAppValidationSummary.VALID,
        receivedAt: new Date('2026-07-13T09:00:00.000Z'),
        coordinateSource: CoordinateSource.DEVICE_GPS,
        category: { id: 'category', code: 'AKSI_MASSA', name: 'Aksi Massa' },
        resolvedArea: null,
        convertedBaket: null,
        _count: { media: 0 },
      },
      media: [
        {
          id: 'report-media-1',
          fileId: 'photo-1',
          mediaType: 'IMAGE',
          caption: 'Dokumentasi lokasi',
          orderNo: 1,
          createdAt: new Date('2026-07-13T08:59:00.000Z'),
          file: {
            originalName: 'dokumentasi-lokasi.jpg',
            mimeType: 'image/jpeg',
          },
        },
      ],
    };
    const prisma = {
      reportCategory: { findMany: jest.fn().mockResolvedValue([] as never) },
      whatsAppReportSession: {
        findMany: jest.fn().mockResolvedValue([
          locatedReport,
          {
            ...locatedReport,
            id: 'report-unlocated',
            referenceNumber: 'LJ-002',
            latitude: null,
            longitude: null,
            submittedMessage: {
              ...locatedReport.submittedMessage,
              id: 'message-2',
              referenceNumber: 'LJ-002',
              latitude: null,
              longitude: null,
              resolvedAreaId: null,
              rawPayload: {},
              validationSummary: WhatsAppValidationSummary.NOT_CHECKED,
            },
            media: [],
          },
        ] as never),
      },
    };
    const scope = {
      jaringWhere: jest.fn().mockResolvedValue({ deletedAt: null } as never),
    };
    const spatial = {
      matchCoordinates: jest
        .fn()
        .mockResolvedValue(new Map([['report-located', [BANDUNG]]]) as never),
    };
    const service = new MapMarkersService(
      prisma as never,
      scope as never,
      spatial as never,
    );
    const query = new MapMarkersQuery();
    query.types = [MapMarkerType.REPORT];

    const result = await service.list(query, {} as never);

    expect(result.features).toHaveLength(1);
    expect(result.features[0]?.geometry.coordinates).toEqual([
      107.6191, -6.9175,
    ]);
    expect(result.features[0]?.properties).toEqual(
      expect.objectContaining({
        markerType: 'report',
        validity: 'VALID',
        jaring: expect.objectContaining({ id: 'jaring-1' }),
        attachments: expect.objectContaining({
          total: 1,
          images: 1,
          items: [
            expect.objectContaining({
              fileId: 'photo-1',
              fileName: 'dokumentasi-lokasi.jpg',
              mimeType: 'image/jpeg',
            }),
          ],
        }),
      }),
    );
    expect(result.meta.summary.reports).toEqual(
      expect.objectContaining({
        total: 2,
        valid: 1,
        mappable: 1,
        unlocated: 1,
      }),
    );
    expect(result.meta.unlocatedItems).toHaveLength(1);
    expect(scope.jaringWhere).toHaveBeenCalledTimes(1);
    expect(prisma.whatsAppReportSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { jaring: { deletedAt: null } },
            { submittedMessage: { is: { convertedBaketId: null } } },
          ]),
        }),
      }),
    );
  });

  it('rejects an invalid viewport before querying marker data', async () => {
    const service = new MapMarkersService(
      {} as never,
      {} as never,
      {} as never,
    );
    const query = new MapMarkersQuery();
    query.bbox = '107,-6,106,-7';

    await expect(service.list(query, {} as never)).rejects.toMatchObject({
      code: 'MAP_MARKER_BBOX_INVALID',
    });
  });
});
