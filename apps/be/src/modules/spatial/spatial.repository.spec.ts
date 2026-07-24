import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  BoundaryQualityStatus,
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
});
