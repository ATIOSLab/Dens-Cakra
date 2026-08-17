import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserProfileStatus } from '../../generated/prisma/client.js';
import { AUTH_ROLE_TO_DOMAIN_ROLE } from '../../common/constants/auth-role.js';
import {
  SYSTEM_ROLES,
  type SystemRole,
} from '../../common/constants/system-role.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { ApiException } from '../../common/api/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

type AuthorizationInput = {
  authUserId: string;
  authRole?: string | null;
  allowedRoles?: readonly SystemRole[];
};

const SYSTEM_ROLE_SET = new Set<SystemRole>(Object.values(SYSTEM_ROLES));

@Injectable()
export class AuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async authorize(input: AuthorizationInput): Promise<AuthorizationContext> {
    const authUser = await this.prisma.user.findUnique({
      where: {
        id: input.authUserId,
      },
      select: {
        id: true,
        role: true,
        banned: true,
        profile: {
          select: {
            id: true,
            status: true,
            isActive: true,
            deletedAt: true,
            operationalLockedAt: true,
            operationalLockReason: true,
            operationalLockedUntil: true,
            operationalAssignments: {
              where: {
                isPrimary: true,
                isActive: true,
                validUntil: null,
              },
              orderBy: {
                validFrom: 'desc',
              },
              take: 1,
              select: {
                id: true,
                branch: true,
                role: {
                  select: {
                    code: true,
                    name: true,
                    isActive: true,
                  },
                },
                areaScopes: {
                  where: {
                    validUntil: null,
                  },
                  orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                  select: {
                    isPrimary: true,
                    area: {
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
        },
      },
    });

    if (!authUser) {
      throw new UnauthorizedException('Authenticated user could not be found.');
    }

    if (authUser.banned) {
      throw new ApiException(
        'ACCOUNT_BANNED',
        'Authenticated user is currently banned.',
        423,
      );
    }

    if (input.authRole && authUser.role !== input.authRole) {
      throw new UnauthorizedException(
        'Authenticated session role is out of sync with the database.',
      );
    }

    const assignedRoles = authUser.role
      .split(',')
      .map((role: string) => role.trim())
      .filter(Boolean);

    if (assignedRoles.length !== 1) {
      throw new ForbiddenException(
        'Each authenticated user must have exactly one coarse authorization role.',
      );
    }

    const coarseRole = assignedRoles[0];

    if (!this.isSystemRole(coarseRole)) {
      throw new ForbiddenException(
        `Unsupported coarse authorization role "${coarseRole}".`,
      );
    }

    if (
      input.allowedRoles?.length &&
      !input.allowedRoles.includes(coarseRole)
    ) {
      throw new ForbiddenException(
        'Authenticated role is not allowed to access this resource.',
      );
    }

    const profile = authUser.profile;

    if (!profile || profile.deletedAt || !profile.isActive) {
      throw new ApiException(
        'PROFILE_NOT_ACTIVE',
        'Authenticated user does not have an active domain profile.',
        403,
      );
    }

    if (profile.status !== UserProfileStatus.ACTIVE) {
      throw new ForbiddenException(
        `User profile must be ACTIVE to access domain resources. Current status: ${profile.status}.`,
      );
    }

    if (
      profile.operationalLockedAt &&
      (!profile.operationalLockedUntil ||
        profile.operationalLockedUntil.getTime() > Date.now())
    ) {
      throw new ApiException(
        'OPERATIONAL_LOCKED',
        profile.operationalLockReason ||
          'User profile is temporarily locked for operational security.',
        423,
      );
    }

    const primaryAssignment = profile.operationalAssignments[0];

    if (!primaryAssignment) {
      throw new ForbiddenException(
        'Authenticated user does not have an active primary operational assignment.',
      );
    }

    if (!primaryAssignment.role.isActive) {
      throw new ForbiddenException(
        'Primary operational assignment points to an inactive role.',
      );
    }

    if (primaryAssignment.areaScopes.length === 0) {
      throw new ForbiddenException(
        'Primary operational assignment does not have any active area scope.',
      );
    }

    const expectedRoleCode = AUTH_ROLE_TO_DOMAIN_ROLE[coarseRole];
    const actualRoleCode = primaryAssignment.role.code;

    if (actualRoleCode !== expectedRoleCode) {
      throw new ForbiddenException(
        'Authentication role does not match the primary domain role assignment.',
      );
    }

    const primaryArea = primaryAssignment.areaScopes[0]?.area;
    const unitName = primaryArea
      ? `${primaryAssignment.branch} ${primaryArea.name}`
      : primaryAssignment.branch;

    return {
      authUserId: authUser.id,
      authRole: coarseRole,
      userProfileId: profile.id,
      userProfileStatus: profile.status,
      primaryAssignmentId: primaryAssignment.id,
      operationalAssignmentId: primaryAssignment.id,
      positionId: primaryAssignment.id,
      positionCode: actualRoleCode,
      positionTitle: primaryAssignment.role.name,
      roleCode: actualRoleCode,
      organizationUnitId: primaryArea?.id ?? primaryAssignment.id,
      organizationUnitName: unitName,
      organizationUnitType: primaryAssignment.branch,
      commandRouteType: primaryAssignment.branch,
      areaScopes: primaryAssignment.areaScopes.map((scope: any) => ({
        areaId: scope.area.id,
        code: scope.area.code,
        name: scope.area.name,
        level: scope.area.level,
        isPrimary: scope.isPrimary,
      })),
    };
  }

  private isSystemRole(role: string): role is SystemRole {
    return SYSTEM_ROLE_SET.has(role as SystemRole);
  }
}
