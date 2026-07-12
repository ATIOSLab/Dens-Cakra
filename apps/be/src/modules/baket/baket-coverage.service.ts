import { Prisma } from '../../generated/prisma/client.js';
import { Injectable } from '@nestjs/common';
import {
  AreaResolutionMethod,
  CoverageScopeType,
  CoverageValidationStatus,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import { BaketQueryService } from './baket-query.service.js';

@Injectable()
export class BaketCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialRepository,
    private readonly baketQuery: BaketQueryService,
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

  async ensurePointInsideArea(
    areaId: string,
    latitude: number | Prisma.Decimal | null,
    longitude: number | Prisma.Decimal | null,
  ) {
    if (latitude !== null && longitude !== null) {
      await this.spatial.isPointWithinActiveBoundary(
        areaId,
        Number(latitude),
        Number(longitude),
      );
    }
  }

  private async isAreaWithinCoverage(
    areaId: string,
    coverageAreaIds: string[],
  ) {
    if (coverageAreaIds.includes(areaId)) {
      return true;
    }
    const descendant = await this.prisma.administrativeAreaClosure.findFirst({
      where: {
        descendantId: areaId,
        ancestorId: { in: coverageAreaIds },
      },
    });
    return Boolean(descendant);
  }

  async validateCoverageForVersion(
    versionId: string,
    scopeTypes: CoverageScopeType[],
  ) {
    const version = await this.prisma.baketVersion.findUniqueOrThrow({
      where: { id: versionId },
      include: {
        baket: {
          include: {
            primaryJaring: {
              include: {
                areaCoverages: {
                  where: { validUntil: null },
                },
              },
            },
            createdByFieldOfficerAssignment: {
              include: {
                areaScopes: {
                  where: { validUntil: null },
                },
                position: {
                  include: {
                    organizationUnit: {
                      include: {
                        areaCoverages: {
                          where: { validUntil: null },
                        },
                      },
                    },
                  },
                },
              },
            },
            taskAssignment: {
              include: {
                assigner: {
                  include: {
                    areaScopes: {
                      where: { validUntil: null },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!version.eventAreaId) {
      throw new ApiException(
        'BAKET_AREA_REQUIRED',
        'Baket version area must be resolved before coverage validation.',
        422,
      );
    }

    const eventAreaId = version.eventAreaId;
    const checks = await Promise.all(
      scopeTypes.map(async (scopeType) => {
        let areaIds: string[] = [];
        let positionAssignmentId: string | undefined;

        if (scopeType === CoverageScopeType.JARING) {
          areaIds =
            version.baket.primaryJaring?.areaCoverages.map(
              (coverage) => coverage.areaId,
            ) ?? [];
        }

        if (scopeType === CoverageScopeType.FIELD_OFFICER) {
          areaIds =
            version.baket.createdByFieldOfficerAssignment.areaScopes.map(
              (scope) => scope.areaId,
            );
          positionAssignmentId =
            version.baket.createdByFieldOfficerAssignmentId;
        }

        if (scopeType === CoverageScopeType.FIELD_COORDINATOR) {
          const assigner = version.baket.taskAssignment?.assigner;
          areaIds = assigner?.areaScopes.map((scope) => scope.areaId) ?? [];
          positionAssignmentId = assigner?.id;
        }

        if (scopeType === CoverageScopeType.ORGANIZATION_UNIT) {
          areaIds =
            version.baket.createdByFieldOfficerAssignment.position.organizationUnit.areaCoverages.map(
              (coverage) => coverage.areaId,
            );
        }

        const isWithinScope =
          areaIds.length === 0
            ? false
            : await this.isAreaWithinCoverage(eventAreaId, areaIds);

        return {
          baketVersionId: versionId,
          scopeType,
          areaId: eventAreaId,
          positionAssignmentId,
          isWithinScope,
          note: isWithinScope
            ? 'Area is inside active coverage.'
            : 'Area is outside active coverage.',
        };
      }),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.baketCoverageCheck.deleteMany({
        where: { baketVersionId: versionId },
      });
      if (checks.length > 0) {
        await tx.baketCoverageCheck.createMany({
          data: checks,
        });
      }

      const status = checks.every((check) => check.isWithinScope)
        ? CoverageValidationStatus.WITHIN_SCOPE
        : checks.some(
              (check) =>
                check.scopeType === CoverageScopeType.JARING &&
                !check.isWithinScope,
            )
          ? CoverageValidationStatus.OUTSIDE_JARING_SCOPE
          : checks.some(
                (check) =>
                  check.scopeType === CoverageScopeType.FIELD_OFFICER &&
                  !check.isWithinScope,
              )
            ? CoverageValidationStatus.OUTSIDE_FIELD_OFFICER_SCOPE
            : checks.some(
                  (check) =>
                    check.scopeType === CoverageScopeType.FIELD_COORDINATOR &&
                    !check.isWithinScope,
                )
              ? CoverageValidationStatus.OUTSIDE_FIELD_COORDINATOR_SCOPE
              : CoverageValidationStatus.OUTSIDE_UNIT_SCOPE;

      await tx.baketVersion.update({
        where: { id: versionId },
        data: {
          coverageValidationStatus: status,
          coverageValidationNote: checks
            .map(
              (check) =>
                `${check.scopeType}:${check.isWithinScope ? 'OK' : 'OUT'}`,
            )
            .join(', '),
          coverageValidatedAt: new Date(),
        },
      });
    });

    return this.baketQuery.baketVersionDetail(versionId);
  }
}
