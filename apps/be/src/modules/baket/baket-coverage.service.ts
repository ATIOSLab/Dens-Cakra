import { Injectable } from '@nestjs/common';
import { AreaResolutionMethod } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';

@Injectable()
export class BaketCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialRepository,
  ) {}

  async resolveAreaForVersion(versionId: string) {
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
    });
    if (version.latitude === null || version.longitude === null) {
      await this.prisma.baketVersion.update({
        where: { id: versionId },
        data: {
          eventAreaId: null,
          areaResolutionMethod: AreaResolutionMethod.UNRESOLVED,
          areaResolutionConfidence: null,
          areaResolvedAt: null,
        },
      });
      return {
        versionId,
        areaId: null,
        method: AreaResolutionMethod.UNRESOLVED,
        confidence: null,
      };
    }

    const matches = await this.spatial.findContainingAreas(
      Number(version.latitude),
      Number(version.longitude),
    );
    const areaId = matches[0]?.areaId ?? null;
    await this.prisma.baketVersion.update({
      where: { id: versionId },
      data: {
        eventAreaId: areaId,
        areaResolutionMethod: areaId
          ? AreaResolutionMethod.POLYGON_MATCH
          : AreaResolutionMethod.UNRESOLVED,
        areaResolutionConfidence: areaId ? 100 : null,
        areaResolvedAt: areaId ? new Date() : null,
      },
    });
    return {
      versionId,
      areaId,
      method: areaId
        ? AreaResolutionMethod.POLYGON_MATCH
        : AreaResolutionMethod.UNRESOLVED,
      confidence: areaId ? 100 : null,
    };
  }
}
