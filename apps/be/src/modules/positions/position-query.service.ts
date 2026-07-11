import { Injectable } from '@nestjs/common';
import { PositionCode, Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AssignmentListQueryDto,
  PositionListQueryDto,
} from './dto/position.dto.js';

@Injectable()
export class PositionQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: PositionListQueryDto) {
    const where: Prisma.PositionWhereInput = {
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

  detail(id: string) {
    return this.prisma.position.findUniqueOrThrow({
      where: { id },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        organizationUnit: true,
        reportsTo: true,
        subordinates: true,
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

  subordinates(id: string, recursive: boolean, depth?: number) {
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

  async assignments(query: AssignmentListQueryDto) {
    const validAt = query.validAt ? new Date(query.validAt) : null;
    const where: Prisma.PositionAssignmentWhereInput = {
      ...(query.userProfileId ? { userProfileId: query.userProfileId } : {}),
      ...(query.positionId ? { positionId: query.positionId } : {}),
      ...(query.unitId
        ? { position: { organizationUnitId: query.unitId } }
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
      this.prisma.positionAssignment.findMany({
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
      this.prisma.positionAssignment.count({ where }),
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

  assignment(id: string) {
    return this.prisma.positionAssignment.findUniqueOrThrow({
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
