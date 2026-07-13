import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  BaketStatus,
  CoordinateSource,
  PositionCode,
  PriorityLevel,
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
            createdByFieldOfficerAssignment: {
              id: 'officer-assignment',
              userProfile: { id: 'officer', fullName: 'Petugas Satu' },
              position: {
                title: 'Petugas Organik',
                organizationUnit: { id: 'unit', name: 'Unit Bandung' },
              },
            },
            versions: [
              {
                id: 'version',
                title: 'Aksi massa di pusat kota',
                versionNumber: 1,
                eventTime: new Date('2026-07-13T09:00:00.000Z'),
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
          positionCode: PositionCode.PETUGAS_ORGANIK,
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
    jest.useRealTimers();
  });

  it('intersects an explicitly requested assignment with reporting-line scope', async () => {
    const prisma = {
      reportCategory: { findMany: jest.fn().mockResolvedValue([] as never) },
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
