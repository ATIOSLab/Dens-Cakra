import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type DomainScope = {
  organizationUnitId: string;
  commandRouteType: AuthorizationContext['commandRouteType'];
  positionIds: string[];
  assignmentIds: string[];
  areaRootIds: string[];
};

@Injectable()
export class DomainScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(context: AuthorizationContext): Promise<DomainScope> {
    const positions = await this.prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, reportsToPositionId: true },
    });

    const positionIds = new Set([context.positionId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const position of positions) {
        if (
          position.reportsToPositionId &&
          positionIds.has(position.reportsToPositionId) &&
          !positionIds.has(position.id)
        ) {
          positionIds.add(position.id);
          changed = true;
        }
      }
    }

    const assignments = await this.prisma.userSeatAssignment.findMany({
      where: {
        positionId: { in: [...positionIds] },
        isActive: true,
        OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
      },
      select: { id: true },
    });

    return {
      organizationUnitId: context.organizationUnitId,
      commandRouteType: context.commandRouteType,
      positionIds: [...positionIds],
      assignmentIds: assignments.map((assignment) => assignment.id),
      areaRootIds: [
        ...new Set(context.areaScopes.map((scope) => scope.areaId)),
      ],
    };
  }

  async baketWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.BaketWhereInput> {
    const scope = await this.resolve(context);
    return {
      createdByFieldOfficerAssignmentId: { in: scope.assignmentIds },
      ...(scope.areaRootIds.length
        ? {
            OR: [
              {
                versions: {
                  some: {
                    OR: [
                      { eventAreaId: { in: scope.areaRootIds } },
                      {
                        eventArea: {
                          ancestorLinks: {
                            some: {
                              ancestorId: { in: scope.areaRootIds },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
              { versions: { none: { eventAreaId: { not: null } } } },
            ],
          }
        : {}),
    };
  }

  analysisWhere(context: AuthorizationContext): Prisma.AnalysisCaseWhereInput {
    return { ownerUnitId: context.organizationUnitId };
  }

  async productWhere(
    context: AuthorizationContext,
  ): Promise<Prisma.IntelligenceProductWhereInput> {
    if (context.authRole === SYSTEM_ROLES.EXECUTIVE) {
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
    return { ownerUnitId: context.organizationUnitId };
  }

  async areaTree(context: AuthorizationContext) {
    const scope = await this.resolve(context);
    const areas = await this.prisma.administrativeArea.findMany({
      where: {
        ...(scope.areaRootIds.length
          ? {
              OR: [
                { id: { in: scope.areaRootIds } },
                {
                  ancestorLinks: {
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
      select: { id: true, parentId: true, code: true, name: true, level: true },
    });
    const nodes = new Map(
      areas.map((area) => [area.id, { ...area, children: [] as unknown[] }]),
    );
    const roots: unknown[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return {
      id: 'scope-root',
      name: 'Cakupan OIM',
      level: 'COUNTRY',
      children: roots,
    };
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

  async assertJaring(context: AuthorizationContext, jaringId: string) {
    const scope = await this.resolve(context);
    const found = await this.prisma.jaring.findFirst({
      where: {
        id: jaringId,
        deletedAt: null,
        caretakerAssignments: {
          some: {
            fieldOfficerAssignmentId: { in: scope.assignmentIds },
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }],
          },
        },
      },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Resource not found.');
  }
}
