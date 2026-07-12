import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  AdministrativeLevel,
  CommandRouteType,
  OrganizationType,
  Prisma,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateBindaMasterDto,
  CreateDirectorateMasterDto,
  CreateOrganizationUnitDto,
  OrganizationHierarchyQueryDto,
  OrganizationListQueryDto,
  RegionalMasterQueryDto,
  OrganizationTreeQueryDto,
  ReplaceOrganizationCoverageDto,
  UpdateOrganizationUnitDto,
} from './dto/organization.dto.js';

const ALLOWED_PARENT_TYPES: Partial<
  Record<OrganizationType, readonly OrganizationType[]>
> = {
  [OrganizationType.DIRECTORATE]: [OrganizationType.DEPUTI],
  [OrganizationType.BINDA]: [OrganizationType.DEPUTI],
  [OrganizationType.SUBDIRECTORATE]: [OrganizationType.DIRECTORATE],
  [OrganizationType.BAGOPS]: [OrganizationType.BINDA],
  [OrganizationType.FIELD_COORDINATION_UNIT]: [
    OrganizationType.SUBDIRECTORATE,
    OrganizationType.BAGOPS,
  ],
};

type OrganizationClient = Prisma.TransactionClient | PrismaService;

type ProvinceRecord = {
  id: string;
  code: string;
  name: string;
  level: AdministrativeLevel;
  isActive: boolean;
};

@Injectable()
export class OrganizationManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: OrganizationListQueryDto, context: AuthorizationContext) {
    const where: Prisma.OrganizationUnitWhereInput = {
      deletedAt: null,
      id: { in: await this.accessibleUnitIds(context.organizationUnitId) },
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };
    const [items, total] = await Promise.all([
      this.prisma.organizationUnit.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        include: { _count: { select: { children: true, positions: true } } },
      }),
      this.prisma.organizationUnit.count({ where }),
    ]);
    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async create(input: CreateOrganizationUnitDto, actor: AuthorizationContext) {
    await this.validateParent(input.type, input.parentId ?? null);
    return this.prisma.$transaction(async (tx) => {
      const unit = await this.createUnitWithHierarchy(tx, {
        code: input.code,
        name: input.name,
        type: input.type,
        parentId: input.parentId ?? null,
      });
      await this.audit(tx, actor, 'ORGANIZATION.CREATE', unit.id, null, unit);
      return unit;
    });
  }

  async listRegionalMasters(
    query: RegionalMasterQueryDto,
    context: AuthorizationContext,
  ) {
    const unitScope = await this.resolveScopedUnitWhere(context, true);
    const provinceScope = query.provinceAreaId
      ? { id: query.provinceAreaId }
      : undefined;

    const [provinces, deputyUnits, bindaUnits, directorateUnits] =
      await Promise.all([
        this.prisma.administrativeArea.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            level: AdministrativeLevel.PROVINCE,
            ...(provinceScope ?? {}),
          },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
            level: true,
            isActive: true,
            centroidLatitude: true,
            centroidLongitude: true,
          },
        }),
        this.prisma.organizationUnit.findMany({
          where: {
            deletedAt: null,
            isActive: true,
            type: OrganizationType.DEPUTI,
            ...unitScope,
          },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            code: true,
            name: true,
          },
        }),
        this.prisma.organizationUnit.findMany({
          where: {
            deletedAt: null,
            type: OrganizationType.BINDA,
            ...unitScope,
            ...(query.provinceAreaId
              ? { bindaProfile: { provinceAreaId: query.provinceAreaId } }
              : {}),
          },
          orderBy: { name: 'asc' },
          include: {
            parent: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            bindaProfile: {
              include: {
                province: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    level: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.organizationUnit.findMany({
          where: {
            deletedAt: null,
            type: OrganizationType.DIRECTORATE,
            ...unitScope,
            ...(query.provinceAreaId
              ? {
                  directorateProfile: {
                    coverageAreas: {
                      some: { provinceAreaId: query.provinceAreaId },
                    },
                  },
                }
              : {}),
          },
          orderBy: { name: 'asc' },
          include: {
            parent: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
            directorateProfile: {
              include: {
                coverageAreas: {
                  orderBy: [{ isPrimary: 'desc' }, { province: { name: 'asc' } }],
                  include: {
                    province: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        level: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

    const provinceSummaries = new Map(
      provinces.map((province) => [
        province.id,
        {
          province: {
            id: province.id,
            code: province.code,
            name: province.name,
            level: province.level,
            isActive: province.isActive,
            centroidLatitude:
              province.centroidLatitude === null
                ? null
                : Number(province.centroidLatitude),
            centroidLongitude:
              province.centroidLongitude === null
                ? null
                : Number(province.centroidLongitude),
          },
          binda: null as
            | {
                unitId: string;
                code: string;
                name: string;
                parentUnitId: string | null;
                parentUnitCode: string | null;
                parentUnitName: string | null;
              }
            | null,
          directorates: [] as Array<{
            unitId: string;
            code: string;
            name: string;
            profileCode: string | null;
            parentUnitId: string | null;
            parentUnitCode: string | null;
            parentUnitName: string | null;
            coverageAreas: Array<{
              areaId: string;
              code: string;
              name: string;
              level: AdministrativeLevel;
              isPrimary: boolean;
            }>;
            primaryProvinceAreaId: string | null;
          }>,
        },
      ]),
    );

    for (const unit of bindaUnits) {
      if (!unit.bindaProfile?.province) {
        continue;
      }

      const summary = provinceSummaries.get(unit.bindaProfile.province.id);
      if (!summary) {
        continue;
      }

      summary.binda = {
        unitId: unit.id,
        code: unit.code,
        name: unit.name,
        parentUnitId: unit.parent?.id ?? null,
        parentUnitCode: unit.parent?.code ?? null,
        parentUnitName: unit.parent?.name ?? null,
      };
    }

    for (const unit of directorateUnits) {
      const coverages =
        unit.directorateProfile?.coverageAreas.map((coverage) => ({
          areaId: coverage.province.id,
          code: coverage.province.code,
          name: coverage.province.name,
          level: coverage.province.level,
          isPrimary: coverage.isPrimary,
        })) ?? [];
      const primaryCoverage =
        coverages.find((coverage) => coverage.isPrimary) ?? coverages[0] ?? null;
      const directorateSummary = {
        unitId: unit.id,
        code: unit.code,
        name: unit.name,
        profileCode: unit.directorateProfile?.code ?? null,
        parentUnitId: unit.parent?.id ?? null,
        parentUnitCode: unit.parent?.code ?? null,
        parentUnitName: unit.parent?.name ?? null,
        coverageAreas: coverages,
        primaryProvinceAreaId: primaryCoverage?.areaId ?? null,
      };

      for (const coverage of coverages) {
        provinceSummaries.get(coverage.areaId)?.directorates.push(
          directorateSummary,
        );
      }
    }

    const provincesWithMasters = [...provinceSummaries.values()];

    return {
      totals: {
        provinceCount: provincesWithMasters.length,
        bindaCount: bindaUnits.length,
        directorateCount: directorateUnits.length,
        coveredProvinceCount: provincesWithMasters.filter(
          (item) => item.binda || item.directorates.length,
        ).length,
      },
      deputyOptions: deputyUnits,
      provinces: provincesWithMasters,
    };
  }

  async createRegionalBinda(
    input: CreateBindaMasterDto,
    actor: AuthorizationContext,
  ) {
    const province = await this.requireProvince(input.provinceAreaId);
    const parentUnit = await this.resolveRegionalParentUnit(
      input.parentUnitId ?? null,
      actor,
    );
    await this.ensureProvinceHasNoBinda(province.id);
    await this.ensureOrganizationCodeAvailable(input.code);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const unit = await this.createUnitWithHierarchy(tx, {
        code: input.code,
        name: input.name,
        type: OrganizationType.BINDA,
        branch: CommandRouteType.BINDA,
        parentId: parentUnit.id,
      });

      await tx.bindaProfile.create({
        data: {
          organizationUnitId: unit.id,
          provinceAreaId: province.id,
        },
      });
      await tx.organizationAreaCoverage.create({
        data: {
          organizationUnitId: unit.id,
          areaId: province.id,
          isPrimary: true,
          validFrom: now,
        },
      });

      const result = await tx.organizationUnit.findUniqueOrThrow({
        where: { id: unit.id },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          bindaProfile: {
            include: {
              province: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  level: true,
                },
              },
            },
          },
          areaCoverages: {
            where: { validUntil: null },
            include: { area: true },
          },
        },
      });

      await this.audit(
        tx,
        actor,
        'ORGANIZATION.REGIONAL_MASTER.BINDA.CREATE',
        unit.id,
        null,
        {
          unitId: unit.id,
          code: input.code,
          name: input.name,
          provinceAreaId: province.id,
          parentUnitId: parentUnit.id,
        },
      );

      return result;
    });
  }

  async createRegionalDirectorate(
    input: CreateDirectorateMasterDto,
    actor: AuthorizationContext,
  ) {
    const provinceIds = [...new Set(input.provinceAreaIds)];
    if (!provinceIds.includes(input.primaryProvinceAreaId)) {
      throw new ApiException(
        'DIRECTORATE_PRIMARY_PROVINCE_INVALID',
        'Primary province must be part of the selected province coverage.',
        422,
      );
    }

    const provinces = await this.requireProvinces(provinceIds);
    const parentUnit = await this.resolveRegionalParentUnit(
      input.parentUnitId ?? null,
      actor,
    );
    await this.ensureOrganizationCodeAvailable(input.code);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const unit = await this.createUnitWithHierarchy(tx, {
        code: input.code,
        name: input.name,
        type: OrganizationType.DIRECTORATE,
        branch: CommandRouteType.DIRECTORATE,
        parentId: parentUnit.id,
      });

      await tx.directorateProfile.create({
        data: {
          organizationUnitId: unit.id,
          code: input.profileCode ?? input.code,
        },
      });
      await tx.directorateCoverage.createMany({
        data: provinces.map((province) => ({
          directorateUnitId: unit.id,
          provinceAreaId: province.id,
          isPrimary: province.id === input.primaryProvinceAreaId,
        })),
      });
      await tx.organizationAreaCoverage.createMany({
        data: provinces.map((province) => ({
          organizationUnitId: unit.id,
          areaId: province.id,
          isPrimary: province.id === input.primaryProvinceAreaId,
          validFrom: now,
        })),
      });

      const result = await tx.organizationUnit.findUniqueOrThrow({
        where: { id: unit.id },
        include: {
          parent: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          directorateProfile: {
            include: {
              coverageAreas: {
                orderBy: [{ isPrimary: 'desc' }, { province: { name: 'asc' } }],
                include: {
                  province: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      level: true,
                    },
                  },
                },
              },
            },
          },
          areaCoverages: {
            where: { validUntil: null },
            include: { area: true },
          },
        },
      });

      await this.audit(
        tx,
        actor,
        'ORGANIZATION.REGIONAL_MASTER.DIRECTORATE.CREATE',
        unit.id,
        null,
        {
          unitId: unit.id,
          code: input.code,
          name: input.name,
          provinceAreaIds: provinceIds,
          primaryProvinceAreaId: input.primaryProvinceAreaId,
          parentUnitId: parentUnit.id,
        },
      );

      return result;
    });
  }

  detail(id: string) {
    return this.prisma.organizationUnit.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        parent: true,
        children: { where: { deletedAt: null } },
        positions: { where: { isActive: true }, include: { role: true } },
        areaCoverages: { where: { validUntil: null }, include: { area: true } },
      },
    });
  }

  async update(
    id: string,
    input: UpdateOrganizationUnitDto,
    actor: AuthorizationContext,
  ) {
    const before = await this.prisma.organizationUnit.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.organizationUnit.update({
      where: { id },
      data: input,
    });
    await this.audit(
      this.prisma,
      actor,
      'ORGANIZATION.UPDATE',
      id,
      before,
      updated,
    );
    return this.detail(id);
  }

  async move(
    id: string,
    newParentId: string,
    reason: string,
    actor: AuthorizationContext,
  ) {
    const unit = await this.prisma.organizationUnit.findUniqueOrThrow({
      where: { id },
    });
    await this.validateParent(unit.type, newParentId);
    const cycle = await this.prisma.organizationUnitClosure.findUnique({
      where: {
        ancestorId_descendantId: { ancestorId: id, descendantId: newParentId },
      },
    });
    if (cycle)
      throw new ApiException(
        'ORGANIZATION_CYCLE',
        'The selected parent is inside the unit subtree.',
        422,
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationUnit.update({
        where: { id },
        data: { parentId: newParentId },
      });
      await tx.organizationUnitClosure.deleteMany();
      await tx.$executeRaw(Prisma.sql`
        WITH RECURSIVE paths AS (
          SELECT "id" AS ancestor_id, "id" AS descendant_id, 0 AS depth
          FROM "OrganizationUnit"
          UNION ALL
          SELECT paths.ancestor_id, child."id", paths.depth + 1
          FROM paths
          JOIN "OrganizationUnit" child ON child."parentId" = paths.descendant_id
        )
        INSERT INTO "OrganizationUnitClosure" ("ancestorId", "descendantId", "depth")
        SELECT ancestor_id, descendant_id, depth FROM paths
      `);
      await this.audit(
        tx,
        actor,
        'ORGANIZATION.MOVE',
        id,
        { parentId: unit.parentId },
        { parentId: newParentId, reason },
      );
    });
    return this.detail(id);
  }

  hierarchy(
    id: string,
    direction: 'ancestors' | 'descendants',
    query: OrganizationHierarchyQueryDto,
  ) {
    const where =
      direction === 'ancestors' ? { descendantId: id } : { ancestorId: id };
    return this.prisma.organizationUnitClosure.findMany({
      where: {
        ...where,
        ...(query.includeSelf
          ? {}
          : {
              depth: {
                gt: 0,
                ...(query.depth === undefined ? {} : { lte: query.depth }),
              },
            }),
      },
      orderBy: { depth: direction === 'ancestors' ? 'desc' : 'asc' },
      include:
        direction === 'ancestors' ? { ancestor: true } : { descendant: true },
    });
  }

  async tree(id: string, query: OrganizationTreeQueryDto) {
    const links = await this.prisma.organizationUnitClosure.findMany({
      where: { ancestorId: id, depth: { lte: query.maxDepth } },
      orderBy: { depth: 'asc' },
      include: {
        descendant: {
          include: query.includePositions
            ? { positions: { where: { isActive: true } } }
            : undefined,
        },
      },
    });
    const nodes = new Map(
      links.map((link) => [
        link.descendant.id,
        { ...link.descendant, children: [] as unknown[] },
      ]),
    );
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId))
        (nodes.get(node.parentId)?.children as unknown[]).push(node);
    }
    return nodes.get(id) ?? null;
  }

  coverages(id: string, activeOnly: boolean) {
    return this.prisma.organizationAreaCoverage.findMany({
      where: {
        organizationUnitId: id,
        ...(activeOnly ? { validUntil: null } : {}),
      },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
      include: { area: true },
    });
  }

  async replaceCoverages(
    id: string,
    input: ReplaceOrganizationCoverageDto,
    actor: AuthorizationContext,
  ) {
    if (input.areas.filter((area) => area.isPrimary).length !== 1)
      throw new ApiException(
        'PRIMARY_AREA_REQUIRED',
        'Exactly one primary area is required.',
        422,
      );
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationAreaCoverage.updateMany({
        where: { organizationUnitId: id, validUntil: null },
        data: { validUntil: now },
      });
      await tx.organizationAreaCoverage.createMany({
        data: input.areas.map((area) => ({
          organizationUnitId: id,
          areaId: area.areaId,
          isPrimary: area.isPrimary,
          validFrom: now,
        })),
      });
      await this.audit(
        tx,
        actor,
        'ORGANIZATION.COVERAGE.REPLACE',
        id,
        null,
        input,
      );
    });
    return this.coverages(id, true);
  }

  private async createUnitWithHierarchy(
    client: OrganizationClient,
    input: {
      code: string;
      name: string;
      type: OrganizationType;
      parentId?: string | null;
      branch?: CommandRouteType | null;
    },
  ) {
    const unit = await client.organizationUnit.create({
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        parentId: input.parentId ?? null,
        branch: input.branch ?? null,
      },
    });

    await client.organizationUnitClosure.create({
      data: { ancestorId: unit.id, descendantId: unit.id, depth: 0 },
    });

    if (unit.parentId) {
      const ancestors = await client.organizationUnitClosure.findMany({
        where: { descendantId: unit.parentId },
      });
      await client.organizationUnitClosure.createMany({
        data: ancestors.map((link) => ({
          ancestorId: link.ancestorId,
          descendantId: unit.id,
          depth: link.depth + 1,
        })),
        skipDuplicates: true,
      });
    }

    return unit;
  }

  private async resolveScopedUnitWhere(
    context: AuthorizationContext,
    allowGlobalAdmin = false,
  ): Promise<Prisma.OrganizationUnitWhereInput> {
    if (allowGlobalAdmin && context.authRole === SYSTEM_ROLES.ADMIN_SYSTEM) {
      return {};
    }

    return {
      id: { in: await this.accessibleUnitIds(context.organizationUnitId) },
    };
  }

  private async resolveRegionalParentUnit(
    parentUnitId: string | null,
    actor: AuthorizationContext,
  ) {
    const scope = await this.resolveScopedUnitWhere(actor, true);

    if (parentUnitId) {
      const parent = await this.prisma.organizationUnit.findFirst({
        where: {
          id: parentUnitId,
          deletedAt: null,
          isActive: true,
          type: OrganizationType.DEPUTI,
          ...scope,
        },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      });

      if (!parent) {
        throw new ApiException(
          'REGIONAL_PARENT_UNIT_INVALID',
          'Selected deputi parent is unavailable.',
          422,
        );
      }

      return parent;
    }

    const availableDeputies = await this.prisma.organizationUnit.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        type: OrganizationType.DEPUTI,
        ...scope,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
      },
    });

    if (availableDeputies.length === 1) {
      return availableDeputies[0];
    }

    if (availableDeputies.length === 0) {
      throw new ApiException(
        'REGIONAL_PARENT_UNIT_REQUIRED',
        'No active deputi unit is available to become parent.',
        422,
      );
    }

    throw new ApiException(
      'REGIONAL_PARENT_UNIT_AMBIGUOUS',
      'Select a deputi parent before creating regional master data.',
      422,
    );
  }

  private async requireProvince(provinceAreaId: string): Promise<ProvinceRecord> {
    const province = await this.prisma.administrativeArea.findFirst({
      where: {
        id: provinceAreaId,
        deletedAt: null,
        isActive: true,
        level: AdministrativeLevel.PROVINCE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        isActive: true,
      },
    });

    if (!province) {
      throw new ApiException(
        'PROVINCE_AREA_INVALID',
        'Selected province area is unavailable.',
        422,
      );
    }

    return province;
  }

  private async requireProvinces(
    provinceAreaIds: string[],
  ): Promise<ProvinceRecord[]> {
    const provinces = await this.prisma.administrativeArea.findMany({
      where: {
        id: { in: provinceAreaIds },
        deletedAt: null,
        isActive: true,
        level: AdministrativeLevel.PROVINCE,
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        level: true,
        isActive: true,
      },
    });

    if (provinces.length !== provinceAreaIds.length) {
      throw new ApiException(
        'PROVINCE_AREA_INVALID',
        'One or more selected provinces are unavailable.',
        422,
      );
    }

    return provinces;
  }

  private async ensureProvinceHasNoBinda(provinceAreaId: string) {
    const existing = await this.prisma.bindaProfile.findUnique({
      where: { provinceAreaId },
      include: {
        organizationUnit: {
          select: {
            id: true,
            code: true,
            name: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!existing?.organizationUnit) {
      return;
    }

    throw new ApiException(
      'BINDA_PROVINCE_ALREADY_ASSIGNED',
      `Provinsi tersebut sudah memiliki Binda (${existing.organizationUnit.name}).`,
      409,
    );
  }

  private async ensureOrganizationCodeAvailable(code: string) {
    const existing = await this.prisma.organizationUnit.findUnique({
      where: { code },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return;
    }

    throw new ApiException(
      'ORGANIZATION_CODE_CONFLICT',
      `Organization code ${code} is already in use.`,
      409,
    );
  }

  private async validateParent(
    type: OrganizationType,
    parentId: string | null,
  ) {
    if (!parentId) {
      if (type !== OrganizationType.DEPUTI && type !== OrganizationType.OTHER)
        throw new ApiException(
          'INVALID_ORGANIZATION_HIERARCHY',
          `${type} requires a parent unit.`,
          422,
        );
      return;
    }
    const parent = await this.prisma.organizationUnit.findUnique({
      where: { id: parentId },
    });
    if (!parent || !parent.isActive || parent.deletedAt)
      throw new ApiException(
        'PARENT_UNIT_INVALID',
        'Parent unit is unavailable.',
        422,
      );
    const allowed = ALLOWED_PARENT_TYPES[type];
    if (allowed && !allowed.includes(parent.type))
      throw new ApiException(
        'INVALID_ORGANIZATION_HIERARCHY',
        `${type} cannot be placed under ${parent.type}.`,
        422,
      );
  }

  private async accessibleUnitIds(unitId: string): Promise<string[]> {
    const links = await this.prisma.organizationUnitClosure.findMany({
      where: { ancestorId: unitId },
      select: { descendantId: true },
    });
    return links.length ? links.map((link) => link.descendantId) : [unitId];
  }

  private audit(
    client: Prisma.TransactionClient | PrismaService,
    actor: AuthorizationContext,
    action: string,
    entityId: string,
    beforeData: unknown,
    afterData: unknown,
  ) {
    return client.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action,
        entityType: 'OrganizationUnit',
        entityId,
        beforeData: beforeData as Prisma.InputJsonValue,
        afterData: afterData as Prisma.InputJsonValue,
      },
    });
  }
}
