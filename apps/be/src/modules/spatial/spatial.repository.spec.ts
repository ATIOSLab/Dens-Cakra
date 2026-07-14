import { jest } from '@jest/globals';
import {
  AdministrativeLevel,
  AreaResolutionMethod,
  BoundaryQualityStatus,
} from '../../generated/prisma/client.js';
import { SpatialRepository } from './spatial.repository.js';

describe('SpatialRepository report area resolution', () => {
  it('membatasi hasil laporan sampai kecamatan dan memilih polygon paling spesifik', async () => {
    const repository = new SpatialRepository({} as never);
    const district = {
      areaId: 'district-id',
      areaCode: '14.71.01',
      areaName: 'Kecamatan Sukajadi',
      areaLevel: AdministrativeLevel.DISTRICT,
      boundaryId: 'boundary-id',
      qualityStatus: BoundaryQualityStatus.VERIFIED,
    };
    const findContainingAreas = jest
      .spyOn(repository, 'findContainingAreas')
      .mockResolvedValue([district]);

    const result = await repository.resolveReportArea(0.4797112, 101.4313293);

    expect(findContainingAreas).toHaveBeenCalledWith(0.4797112, 101.4313293, [
      AdministrativeLevel.DISTRICT,
      AdministrativeLevel.REGENCY,
      AdministrativeLevel.CITY,
      AdministrativeLevel.PROVINCE,
      AdministrativeLevel.COUNTRY,
    ]);
    expect(result.resolvedAt).toBeInstanceOf(Date);
    expect({ ...result, resolvedAt: null }).toEqual({
      area: district,
      method: AreaResolutionMethod.POLYGON_MATCH,
      confidence: 100,
      resolvedAt: null,
    });
  });
});
