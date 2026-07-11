import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(context: AuthorizationContext) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: context.authUserId },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        profile: {
          select: {
            id: true,
            username: true,
            fullName: true,
            phone: true,
            clearanceLevel: true,
            status: true,
          },
        },
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        authRole: user.role,
      },
      profile: user.profile,
      primaryAssignment: {
        id: context.primaryAssignmentId,
        positionId: context.positionId,
        positionCode: context.positionCode,
        positionTitle: context.positionTitle,
      },
      role: context.roleCode,
      unit: {
        id: context.organizationUnitId,
        name: context.organizationUnitName,
        type: context.organizationUnitType,
      },
      branch: context.commandRouteType,
      primaryAreas: context.areaScopes.filter((scope) => scope.isPrimary),
    };
  }

  async getAreaScopes(
    context: AuthorizationContext,
    includeDescendants: boolean,
    level?: string,
  ) {
    if (!includeDescendants) {
      return context.areaScopes.filter(
        (scope) => !level || scope.level === level,
      );
    }

    const scopeIds = context.areaScopes.map((scope) => scope.areaId);
    if (scopeIds.length === 0) {
      return [];
    }

    const levelFilter = level
      ? Prisma.sql`AND area."level"::text = ${level}`
      : Prisma.empty;
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT DISTINCT
        area."id" AS "areaId",
        area."code",
        area."name",
        area."level"
      FROM "AdministrativeAreaClosure" closure
      JOIN "AdministrativeArea" area ON area."id" = closure."descendantId"
      WHERE closure."ancestorId" IN (${Prisma.join(scopeIds)})
        AND area."isActive" = true
        ${levelFilter}
      ORDER BY area."level", area."name"
    `);
  }

  writeAudit(input: {
    context: AuthorizationContext;
    action: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorUserProfileId: input.context.userProfileId,
        actorAssignmentId: input.context.primaryAssignmentId,
        action: input.action,
        entityType: 'Session',
        entityId: input.context.authUserId,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }
}
