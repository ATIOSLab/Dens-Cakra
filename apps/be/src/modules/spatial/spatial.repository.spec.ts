import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  BoundaryQualityStatus,
  Prisma,
} from '../../generated/prisma/client.js';
import { SpatialRepository } from './spatial.repository.js';

describe('SpatialRepository report area resolution', () => {
  it('membatasi hasil laporan sampai desa/kelurahan dan memilih polygon paling spesifik', async () => {
    const repository = new SpatialRepository({} as never);
    const village = {
      areaId: 'village-id',
      areaCode: '14.71.01.1001',
      areaName: 'Kelurahan Sukajadi',
      areaLevel: AdministrativeLevel.URBAN_VILLAGE,
      boundaryId: 'boundary-id',
      qualityStatus: BoundaryQualityStatus.VERIFIED,
    };
    const findContainingAreas = jest
      .spyOn(repository, 'findContainingAreas')
      .mockResolvedValue([village]);

    const result = await repository.resolveReportArea(0.4797112, 101.4313293);

    expect(findContainingAreas).toHaveBeenCalledWith(0.4797112, 101.4313293, [
      AdministrativeLevel.VILLAGE,
      AdministrativeLevel.URBAN_VILLAGE,
      AdministrativeLevel.DISTRICT,
      AdministrativeLevel.REGENCY,
      AdministrativeLevel.CITY,
      AdministrativeLevel.PROVINCE,
      AdministrativeLevel.COUNTRY,
    ]);
    expect(result.resolvedAt).toBeInstanceOf(Date);
    expect({ ...result, resolvedAt: null }).toEqual({
      area: village,
      method: AreaResolutionMethod.POLYGON_MATCH,
      confidence: 100,
      resolvedAt: null,
    });
  });

  it('mengirim toleransi simplifikasi desimal sebagai double precision', async () => {
    const queryRaw = jest
      .fn<(query: Prisma.Sql) => Promise<never[]>>()
      .mockResolvedValue([]);
    const repository = new SpatialRepository({ $queryRaw: queryRaw } as never);

    const result = await repository.getActiveBoundaryGeoJson(
      '6490a979-96ad-5c1d-9c86-556a8c940379',
      18 / 111_320,
    );

    expect(result).toBeNull();
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(queryRaw.mock.calls[0]?.[0].sql).toContain('::double precision');
  });
});
