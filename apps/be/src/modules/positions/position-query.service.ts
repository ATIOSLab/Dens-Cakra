import { Injectable, NotFoundException } from '@nestjs/common';
import { PositionCode, Prisma } from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AssignmentListQueryDto,
  PositionListQueryDto,
} from './dto/position.dto.js';

@Injectable()
export class PositionQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly domainScope: DomainScopeService,
  ) {}

  async commandNetwork(context: AuthorizationContext) {
    const scope = await this.domainScope.resolve(context);
    const now = new Date();
    const [positions, assignments, jaring] = await Promise.all([
      this.prisma.position.findMany({
        where: { id: { in: scope.positionIds }, isActive: true },
        orderBy: [{ organizationUnit: { name: 'asc' } }, { seatCode: 'asc' }],
        select: {
          id: true,
          seatCode: true,
          code: true,
          title: true,
          reportsToPositionId: true,
          organizationUnit: {
            select: { id: true, code: true, name: true, type: true },
          },
          role: { select: { id: true, code: true, name: true } },
        },
      }),
      this.prisma.userSeatAssignment.findMany({
        where: {
          id: { in: scope.assignmentIds },
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gt: now } }],
        },
        orderBy: [
          { position: { organizationUnit: { name: 'asc' } } },
          { validFrom: 'asc' },
        ],
        select: {
          id: true,
          isPrimary: true,
          validFrom: true,
          userProfile: {
            select: {
              id: true,
              username: true,
              fullName: true,
              phone: true,
              authUser: { select: { email: true } },
            },
          },
          position: {
            select: {
              id: true,
              seatCode: true,
              code: true,
              title: true,
              reportsToPositionId: true,
              organizationUnit: {
                select: { id: true, code: true, name: true, type: true },
              },
              role: { select: { id: true, code: true, name: true } },
            },
          },
          areaScopes: {
            where: { validUntil: null },
            orderBy: [{ isPrimary: 'desc' }, { validFrom: 'asc' }],
            select: {
              isPrimary: true,
              area: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  level: true,
                  parentId: true,
                  centroidLatitude: true,
                  centroidLongitude: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.jaring.findMany({
        where: {
          deletedAt: null,
          caretakerAssignments: {
            some: {
              fieldOfficerAssignmentId: { in: scope.assignmentIds },
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          aliasName: true,
          fullName: true,
          whatsappNumber: true,
          status: true,
          registrationStatus: true,
          createdAt: true,
          caretakerAssignments: {
            where: {
              fieldOfficerAssignmentId: { in: scope.assignmentIds },
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            },
            select: {
              fieldOfficerAssignmentId: true,
              validFrom: true,
              fieldOfficerAssignment: {
                select: {
                  userProfile: { select: { fullName: true } },
                  position: { select: { title: true } },
                },
              },
            },
          },
          areaCoverages: {
            where: { OR: [{ validUntil: null }, { validUntil: { gt: now } }] },
            select: {
              isPrimary: true,
              area: {
                select: { id: true, code: true, name: true, level: true },
              },
            },
          },
          _count: { select: { messages: true, primaryBakets: true } },
        },
      }),
    ]);

    return {
      command: {
        organizationUnitId: scope.organizationUnitId,
        positionId: context.positionId,
        assignmentId: context.primaryAssignmentId,
        commandRouteType: scope.commandRouteType,
      },
      positions,
      assignments,
      jaring,
    };
  }

  async list(query: PositionListQueryDto, context?: AuthorizationContext) {
    const scope =
      context && context.authRole !== SYSTEM_ROLES.ADMIN_SYSTEM
        ? await this.domainScope.resolve(context)
        : null;
    const where: Prisma.PositionWhereInput = {
      ...(scope ? { id: { in: scope.positionIds } } : {}),
      ...(query.search
        ? {
            OR: [
              { seatCode: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.code ? { code: query.code } : {}),
      ...(query.roleCode ? { role: { code: query.roleCode } } : {}),
      ...(query.unitId ? { organizationUnitId: query.unitId } : {}),
      ...(query.reportsToPositionId
        ? { reportsToPositionId: query.reportsToPositionId }
        : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.availableOnly
        ? { assignments: { none: { isActive: true, validUntil: null } } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.position.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { seatCode: 'asc' },
        include: {
          role: true,
          organizationUnit: true,
          reportsTo: true,
          areaCoverages: {
            where: { validUntil: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            include: { area: true },
          },
          assignments: {
            where: { isActive: true, validUntil: null },
            include: { userProfile: true },
          },
        },
      }),
      this.prisma.position.count({ where }),
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

  async detail(id: string, context?: AuthorizationContext) {
    if (context && context.authRole !== SYSTEM_ROLES.ADMIN_SYSTEM) {
      const scope = await this.domainScope.resolve(context);
      if (!scope.positionIds.includes(id)) {
        throw new NotFoundException('Resource not found.');
      }
    }
    return this.prisma.position.findUniqueOrThrow({
      where: { id },
      include: {
        role: true,
        organizationUnit: true,
        reportsTo: true,
        subordinates: true,
        areaCoverages: {
          where: { validUntil: null },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          include: { area: true },
        },
        assignments: {
          where: { isActive: true, validUntil: null },
          include: {
            userProfile: true,
            areaScopes: { include: { area: true } },
          },
        },
      },
    });
  }

  async subordinates(
    id: string,
    recursive: boolean,
    depth?: number,
    context?: AuthorizationContext,
  ) {
    if (context && context.authRole !== SYSTEM_ROLES.ADMIN_SYSTEM) {
      const scope = await this.domainScope.resolve(context);
      if (!scope.positionIds.includes(id)) {
        throw new NotFoundException('Resource not found.');
      }
    }
    if (!recursive) {
      return this.prisma.position.findMany({
        where: { reportsToPositionId: id, isActive: true },
        include: { role: true, organizationUnit: true },
      });
    }
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        seatCode: string;
        code: PositionCode;
        title: string;
        depth: number;
      }>
    >(Prisma.sql`
      WITH RECURSIVE chain AS (
        SELECT p.*, 1 AS depth FROM "Position" p WHERE p."reportsToPositionId" = ${id}
        UNION ALL
        SELECT p.*, chain.depth + 1 FROM "Position" p JOIN chain ON p."reportsToPositionId" = chain."id"
        WHERE chain.depth < ${depth ?? 20}
      ) SELECT "id", "seatCode", "code", "title", depth FROM chain ORDER BY depth, "seatCode"
    `);
  }

  reportingChain(id: string) {
    return this.prisma.$queryRaw<
      Array<{
        id: string;
        seatCode: string;
        code: PositionCode;
        title: string;
        depth: number;
      }>
    >(Prisma.sql`
      WITH RECURSIVE chain AS (
        SELECT p."id", p."seatCode", p."code", p."title", p."reportsToPositionId", 0 AS depth FROM "Position" p WHERE p."id" = ${id}
        UNION ALL
        SELECT p."id", p."seatCode", p."code", p."title", p."reportsToPositionId", chain.depth + 1
        FROM "Position" p JOIN chain ON p."id" = chain."reportsToPositionId" WHERE chain.depth < 20
      ) SELECT "id", "seatCode", "code", "title", depth FROM chain ORDER BY depth
    `);
  }

  async assignments(
    query: AssignmentListQueryDto,
    context?: AuthorizationContext,
  ) {
    const scope =
      context && context.authRole !== SYSTEM_ROLES.ADMIN_SYSTEM
        ? await this.domainScope.resolve(context)
        : null;
    const validAt = query.validAt ? new Date(query.validAt) : null;
    const positionIds = Array.from(
      new Set(
        [query.positionId, ...(query.positionIds ?? [])].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    );
    const positionFilter: Prisma.PositionWhereInput = {
      ...(query.unitId ? { organizationUnitId: query.unitId } : {}),
      ...(query.roleCode ? { role: { code: query.roleCode } } : {}),
      ...(query.positionCode ? { code: query.positionCode } : {}),
    };
    const where: Prisma.UserSeatAssignmentWhereInput = {
      ...(scope ? { id: { in: scope.assignmentIds } } : {}),
      ...(query.userProfileId ? { userProfileId: query.userProfileId } : {}),
      ...(positionIds.length === 1 ? { positionId: positionIds[0] } : {}),
      ...(positionIds.length > 1 ? { positionId: { in: positionIds } } : {}),
      ...(Object.keys(positionFilter).length > 0
        ? { position: positionFilter }
        : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(validAt
        ? {
            validFrom: { lte: validAt },
            OR: [{ validUntil: null }, { validUntil: { gt: validAt } }],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.userSeatAssignment.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: { validFrom: 'desc' },
        include: {
          userProfile: true,
          position: { include: { role: true, organizationUnit: true } },
          areaScopes: { where: { validUntil: null }, include: { area: true } },
        },
      }),
      this.prisma.userSeatAssignment.count({ where }),
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

  async assignment(id: string, context?: AuthorizationContext) {
    if (context && context.authRole !== SYSTEM_ROLES.ADMIN_SYSTEM) {
      const scope = await this.domainScope.resolve(context);
      if (!scope.assignmentIds.includes(id)) {
        throw new NotFoundException('Resource not found.');
      }
    }
    return this.prisma.userSeatAssignment.findUniqueOrThrow({
      where: { id },
      include: {
        userProfile: { include: { authUser: true } },
        position: { include: { role: true, organizationUnit: true } },
        areaScopes: { include: { area: true } },
      },
    });
  }

  scopes(id: string, activeOnly = true) {
    return this.prisma.positionAreaScope.findMany({
      where: {
        positionAssignmentId: id,
        ...(activeOnly ? { validUntil: null } : {}),
      },
      include: { area: true },
      orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
    });
  }
}
