import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { OrganizationType, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreateOrganizationUnitDto,
  OrganizationHierarchyQueryDto,
  OrganizationListQueryDto,
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
      const unit = await tx.organizationUnit.create({ data: input });
      await tx.organizationUnitClosure.create({
        data: { ancestorId: unit.id, descendantId: unit.id, depth: 0 },
      });
      if (unit.parentId) {
        const ancestors = await tx.organizationUnitClosure.findMany({
          where: { descendantId: unit.parentId },
        });
        await tx.organizationUnitClosure.createMany({
          data: ancestors.map((link) => ({
            ancestorId: link.ancestorId,
            descendantId: unit.id,
            depth: link.depth + 1,
          })),
          skipDuplicates: true,
        });
      }
      await this.audit(tx, actor, 'ORGANIZATION.CREATE', unit.id, null, unit);
      return unit;
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
