import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { CommandRouteType, RoleCode } from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  commandParentRole,
  isTerritorialCommandBranch,
} from '../../common/command/command-chain.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import {
  DKI_JAKARTA_PROVINCE_CODE,
  DKI_JAKARTA_PROVINCE_NAME_MATCHERS,
} from '../../common/administrative/dki-supervision.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ApplicationCacheService,
  authorizationScopeIdentity,
} from '../cache/application-cache.service.js';

export type DomainScope = {
  organizationUnitId: string;
  commandRouteType: AuthorizationContext['commandRouteType'];
  assignmentIds: string[];
  areaRootIds: string[];
};

export type AreaScopeTreeNode = {
  id: string;
  parentId: string | null;
  code: string;
  officialCode: string | null;
  name: string;
  level: string;
  children: AreaScopeTreeNode[];
};

@Injectable()
export class DomainScopeService {
  private readonly resolvedScopes = new WeakMap<
    AuthorizationContext,
    Promise<DomainScope>
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: ApplicationCacheService,
  ) {}

  async resolve(context: AuthorizationContext): Promise<DomainScope> {
    const existing = this.resolvedScopes.get(context);
    if (existing) return existing;

    const pending = this.loadScope(context).catch((error) => {
      this.resolvedScopes.delete(context);
      throw error;
    });
    this.resolvedScopes.set(context, pending);
    return pending;
  }

  private async loadScope(context: AuthorizationContext): Promise<DomainScope> {
    const areaRootIds = [
      ...new Set(context.areaScopes.map((scope) => scope.areaId)),
    ];

    // Petugas Wilayah (Gaswil) adalah role daun: cakupan akses dibatasi ke
    // penugasannya sendiri agar tidak melihat Baket/Jaring Gaswil lain yang
    // kebetulan bertugas di area yang sama.
    if (context.authRole === SYSTEM_ROLES.FIELD_OFFICER) {
      return {
        organizationUnitId: context.organizationUnitId,
        commandRouteType: context.commandRouteType,
        assignmentIds: [context.primaryAssignmentId],
        areaRootIds,
      };
    }

    const assignments = await this.prisma.userOperationalAssignment.findMany({
      where: {
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        ...(areaRootIds.length
          ? {
              areaScopes: {
                some: {
                  validUntil: null,
                  area: {
                    OR: [
                      { id: { in: areaRootIds } },
                      {
                        descendantLinks: {
                          some: { ancestorId: { in: areaRootIds } },
                        },
                      },
                    ],
                  },
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return {
      organizationUnitId: context.organizationUnitId,
      commandRouteType: context.commandRouteType,
      assignmentIds: assignments.map((assignment: any) => assignment.id),
      areaRootIds,
    };
  }

  async baketWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.BaketWhereInput> {
    const scope = await this.resolve(context);
    return {
      createdByFieldOfficerAssignmentId: { in: scope.assignmentIds },
    };
  }

  analysisWhere(context: AuthorizationContext): Prisma.AnalysisCaseWhereInput {
    return { ownerAssignmentId: context.primaryAssignmentId };
  }

  async productWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.IntelligenceProductWhereInput> {
    if (
      context.authRole === SYSTEM_ROLES.EXECUTIVE ||
      context.authRole === SYSTEM_ROLES.NATIONAL_LEADER
    ) {
      const scope = await this.resolve(context);
      return {
        createdByAssignmentId: { in: scope.assignmentIds },
        status: {
          in: [
            'APPROVED_REGIONAL',
            'UNDER_EXECUTIVE_REVIEW',
            'APPROVED_EXECUTIVE',
            'DISTRIBUTED',
          ],
        },
      };
    }
    if (context.authRole === SYSTEM_ROLES.REGIONAL_COMMANDER) {
      const scope = await this.resolve(context);
      return { createdByAssignmentId: { in: scope.assignmentIds } };
    }
    return { ownerAssignmentId: context.primaryAssignmentId };
  }

  async areaTree(context: AuthorizationContext) {
    return this.cache.getOrSet(
      {
        namespace: 'administrative-area-tree',
        identity: authorizationScopeIdentity(context),
        ttlMs: 30 * 60_000,
      },
      () => this.loadAreaTree(context),
    );
  }

  private async loadAreaTree(context: AuthorizationContext) {
    const scope = await this.resolve(context);
    const areas = await this.prisma.administrativeArea.findMany({
      where: {
        ...(scope.areaRootIds.length
          ? {
              OR: [
                { id: { in: scope.areaRootIds } },
                {
                  descendantLinks: {
                    some: { ancestorId: { in: scope.areaRootIds } },
                  },
                },
              ],
            }
          : {}),
        isActive: true,
        deletedAt: null,
        level: { in: ['PROVINCE', 'REGENCY', 'CITY', 'DISTRICT'] },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        parentId: true,
        code: true,
        officialCode: true,
        name: true,
        level: true,
      },
    });
    const nodes = new Map<string, AreaScopeTreeNode>(
      areas.map((area: Omit<AreaScopeTreeNode, 'children'>) => [
        area.id,
        { ...area, children: [] },
      ]),
    );
    const roots: AreaScopeTreeNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return {
      id: 'scope-root',
      name: this.scopeTreeLabel(context),
      level: 'COUNTRY',
      children: roots,
    };
  }

  private scopeTreeLabel(context: AuthorizationContext) {
    if (context.commandRouteType === 'DIRECTORATE') {
      return 'Cakupan Supervisi Direktorat/Ditwil';
    }

    if (context.commandRouteType === 'BINDA') {
      return 'Cakupan Komando Kewilayahan';
    }

    return 'Cakupan Nasional';
  }

  scopeSummary(context: AuthorizationContext) {
    const areas = context.areaScopes.map((area) => {
      const name = area.name.toLocaleLowerCase('id-ID');
      const isDkiJakarta =
        area.code === DKI_JAKARTA_PROVINCE_CODE ||
        area.code.startsWith(`${DKI_JAKARTA_PROVINCE_CODE}.`) ||
        DKI_JAKARTA_PROVINCE_NAME_MATCHERS.some((matcher) =>
          name.includes(matcher),
        );

      return {
        id: area.areaId,
        code: area.code,
        name: area.name,
        level: area.level,
        isDkiJakarta,
      };
    });
    const isDirectorateScope = context.commandRouteType === 'DIRECTORATE';
    const hasDkiRegencyCityScope =
      isDirectorateScope &&
      areas.some(
        (area) =>
          area.isDkiJakarta &&
          (area.level === 'REGENCY' || area.level === 'CITY'),
      );
    const hasProvinceScope = areas.some((area) => area.level === 'PROVINCE');
    const supervisionMode = hasDkiRegencyCityScope
      ? 'DKI_REGENCY_CITY'
      : isDirectorateScope && hasProvinceScope
        ? 'PROVINCE'
        : context.commandRouteType === 'PUSAT'
          ? 'NATIONAL'
          : 'COMMAND_AREA';
    const scopeDescription =
      supervisionMode === 'DKI_REGENCY_CITY'
        ? 'Provinsi DKI Jakarta ditampilkan berdasarkan kota/kabupaten administratif yang ditetapkan admin untuk supervisi Direktorat/Ditwil.'
        : supervisionMode === 'PROVINCE'
          ? 'Supervisi Direktorat/Ditwil mengikuti provinsi atau Binda yang ditetapkan admin.'
          : supervisionMode === 'NATIONAL'
            ? 'Data ditampilkan sesuai cakupan nasional dan kewenangan hak akses pengguna.'
            : 'Data ditampilkan sesuai garis komando kewilayahan dan wilayah penugasan pengguna.';

    return {
      role: context.authRole,
      roleCode: context.roleCode,
      commandRouteType: context.commandRouteType,
      organizationUnitId: context.organizationUnitId,
      organizationUnitName: context.organizationUnitName,
      supervisionMode,
      supervisionLabel:
        supervisionMode === 'DKI_REGENCY_CITY'
          ? 'Supervisi DKI berbasis Kota/Kabupaten'
          : supervisionMode === 'PROVINCE'
            ? 'Supervisi berbasis Provinsi'
            : supervisionMode === 'NATIONAL'
              ? 'Cakupan Nasional'
              : 'Cakupan Komando Kewilayahan',
      scopeDescription,
      areas,
      label:
        areas.length > 0
          ? areas.map((area) => area.name).join(', ')
          : context.organizationUnitName,
    };
  }

  async listAssignableAssignments(
    context: AuthorizationContext,
    roleCode: RoleCode,
  ) {
    const scope = await this.resolve(context);
    return this.prisma.userOperationalAssignment.findMany({
      where: {
        id: { in: scope.assignmentIds },
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        role: { code: roleCode, isActive: true },
      },
      include: {
        role: true,
        userProfile: true,
        areaScopes: {
          where: { validUntil: null },
          include: { area: true },
          orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async assertArea(context: AuthorizationContext, areaId: string) {
    const areaRootIds = context.areaScopes.map((scope) => scope.areaId);
    if (areaRootIds.length === 0 || areaRootIds.includes(areaId)) return;

    const allowed = await this.prisma.administrativeAreaClosure.findFirst({
      where: {
        ancestorId: { in: areaRootIds },
        descendantId: areaId,
      },
      select: { descendantId: true },
    });
    if (!allowed) {
      throw new NotFoundException('Resource not found.');
    }
  }

  async resolveCommandSupervisors(
    children: Array<{
      id: string;
      roleCode: RoleCode;
      branch: CommandRouteType;
      areaIds: string[];
    }>,
  ): Promise<
    Map<
      string,
      {
        assignmentId: string;
        roleName: string;
        userName: string | null;
        branch: CommandRouteType;
      }
    >
  > {
    const supervisors = new Map<
      string,
      {
        assignmentId: string;
        roleName: string;
        userName: string | null;
        branch: CommandRouteType;
      }
    >();

    const childAreaIdsByParentRole = new Map<RoleCode, string[]>();
    for (const child of children) {
      if (!isTerritorialCommandBranch(child.branch)) continue;
      const parentRole = commandParentRole(child.roleCode);
      if (!parentRole) continue;

      const existing = childAreaIdsByParentRole.get(parentRole) ?? [];
      existing.push(...child.areaIds);
      childAreaIdsByParentRole.set(parentRole, existing);
    }

    for (const [parentRole, childAreaIds] of childAreaIdsByParentRole) {
      const uniqueAreaIds = [...new Set(childAreaIds)];

      const parents = await this.prisma.userOperationalAssignment.findMany({
        where: {
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          role: { code: parentRole },
          branch: CommandRouteType.BINDA,
          areaScopes: {
            some: {
              validUntil: null,
              area: {
                OR: [
                  { id: { in: uniqueAreaIds } },
                  {
                    descendantLinks: {
                      some: { descendantId: { in: uniqueAreaIds } },
                    },
                  },
                ],
              },
            },
          },
        },
        include: {
          role: true,
          userProfile: true,
          areaScopes: {
            where: { validUntil: null },
            include: { area: true },
          },
        },
      });

      const parentByAreaId = new Map<string, (typeof parents)[number]>();
      for (const parent of parents) {
        for (const scope of parent.areaScopes) {
          parentByAreaId.set(scope.areaId, parent);
        }
      }

      const links = await this.prisma.administrativeAreaClosure.findMany({
        where: {
          descendantId: { in: uniqueAreaIds },
          ancestorId: { in: [...parentByAreaId.keys()] },
        },
        select: { ancestorId: true, descendantId: true },
      });

      for (const link of links) {
        const parent = parentByAreaId.get(link.ancestorId);
        if (parent && !supervisors.has(link.descendantId)) {
          supervisors.set(link.descendantId, {
            assignmentId: parent.id,
            roleName: parent.role.name,
            userName: parent.userProfile?.fullName ?? null,
            branch: parent.branch,
          });
        }
      }
    }

    return supervisors;
  }

  async assertBaket(context: AuthorizationContext, baketId: string) {
    const found = await this.prisma.baket.findFirst({
      where: {
        id: baketId,
        deletedAt: null,
        ...(await this.baketWhere(context)),
      },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Resource not found.');
  }

  async assertAnalysis(context: AuthorizationContext, caseId: string) {
    const found = await this.prisma.analysisCase.findFirst({
      where: { id: caseId, ...this.analysisWhere(context) },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Resource not found.');
  }

  async assertProduct(context: AuthorizationContext, productId: string) {
    const found = await this.prisma.intelligenceProduct.findFirst({
      where: {
        id: productId,
        deletedAt: null,
        ...(await this.productWhere(context)),
      },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Resource not found.');
  }

  async jaringWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.JaringWhereInput> {
    const scope = await this.resolve(context);
    const isFieldCoordinator =
      context.authRole === SYSTEM_ROLES.FIELD_COORDINATOR;
    return {
      deletedAt: null,
      ...(isFieldCoordinator && scope.areaRootIds.length === 0
        ? { id: { in: [] } }
        : {}),
      caretakerAssignments: {
        some: {
          ...(isFieldCoordinator
            ? {
                fieldOfficerAssignment: { branch: scope.commandRouteType },
              }
            : {
                fieldOfficerAssignmentId: { in: scope.assignmentIds },
              }),
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
        },
      },
      ...(scope.areaRootIds.length
        ? {
            areaCoverages: {
              some: {
                validUntil: null,
                area: {
                  OR: [
                    { id: { in: scope.areaRootIds } },
                    {
                      descendantLinks: {
                        some: { ancestorId: { in: scope.areaRootIds } },
                      },
                    },
                  ],
                },
              },
            },
          }
        : {}),
    };
  }

  async assertJaring(context: AuthorizationContext, jaringId: string) {
    const found = await this.prisma.jaring.findFirst({
      where: {
        id: jaringId,
        ...(await this.jaringWhere(context)),
      },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Resource not found.');
  }
}
