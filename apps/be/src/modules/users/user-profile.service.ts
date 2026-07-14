import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { auth } from '../../lib/auth.js';
import {
  AUTH_ROLE_TO_DOMAIN_ROLE,
  type AuthRole,
} from '../../common/constants/auth-role.js';
import { ApiException } from '../../common/api/api-exception.js';
import { normalizeIndonesianPhoneNumber } from '../../common/utils/phone-normalizer.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  CommandRouteType,
  Prisma,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ArchiveUserDto,
  ChangePrimaryAssignmentDto,
  LockUserDto,
  ProvisionUserDto,
  SuspendUserDto,
  UpdateUserProfileDto,
  UserProfileListQueryDto,
} from './dto/user-profile.dto.js';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: UserProfileListQueryDto) {
    const accessibleAreaIds = query.areaId
      ? await this.resolveAreaFilterIds(query.areaId)
      : null;
    const where = this.buildListWhere(query, accessibleAreaIds);
    const facetWhere = this.buildListWhere(
      {
        ...query,
        status: undefined,
      },
      accessibleAreaIds,
    );
    const skip = (query.page - 1) * query.limit;
    const [items, total, statusCounts, lockedCount, unlockedCount] =
      await Promise.all([
        this.prisma.userProfile.findMany({
          where,
          skip,
          take: query.limit,
          orderBy: { createdAt: 'desc' },
          include: {
            authUser: {
              select: { id: true, email: true, role: true, banned: true },
            },
            positionAssignments: {
              where: { isPrimary: true, isActive: true, validUntil: null },
              include: {
                seat: { include: { organizationUnit: true, role: true } },
                position: { include: { role: true, organizationUnit: true } },
                areaScopes: {
                  where: { validUntil: null },
                  include: { area: true },
                },
              },
            },
          },
        }),
        this.prisma.userProfile.count({ where }),
        this.prisma.userProfile.groupBy({
          by: ['status'],
          where: facetWhere,
          _count: { _all: true },
        }),
        this.prisma.userProfile.count({
          where: {
            ...facetWhere,
            operationalLockedAt: { not: null },
            OR: [
              { operationalLockedUntil: null },
              { operationalLockedUntil: { gt: new Date() } },
            ],
          },
        }),
        this.prisma.userProfile.count({
          where: {
            ...facetWhere,
            OR: [
              { operationalLockedAt: null },
              { operationalLockedUntil: { lte: new Date() } },
            ],
          },
        }),
      ]);

    const statusFacets = Object.values(UserProfileStatus).reduce<
      Record<UserProfileStatus, number>
    >(
      (accumulator, status) => {
        accumulator[status] =
          statusCounts.find((entry) => entry.status === status)?._count._all ??
          0;
        return accumulator;
      },
      {
        [UserProfileStatus.PENDING]: 0,
        [UserProfileStatus.ACTIVE]: 0,
        [UserProfileStatus.SUSPENDED]: 0,
        [UserProfileStatus.ARCHIVED]: 0,
      },
    );

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
      facets: {
        status: statusFacets,
        security: {
          locked: lockedCount,
          unlocked: unlockedCount,
        },
      },
    };
  }

  async provision(input: ProvisionUserDto, actor: AuthorizationContext) {
    const expectedRole = AUTH_ROLE_TO_DOMAIN_ROLE[input.auth.role as AuthRole];
    if (!expectedRole) {
      throw new ApiException(
        'AUTH_ROLE_INVALID',
        'Unsupported Better Auth business role.',
        422,
      );
    }
    const blueprint = await this.resolveSeatBlueprint({
      client: this.prisma,
      roleCode: expectedRole,
      organizationUnitId: input.assignment.organizationUnitId,
      branch: input.assignment.branch ?? null,
      positionId: input.assignment.positionId,
    });
    const areas = await this.prisma.administrativeArea.findMany({
      where: { id: { in: input.areaScopeIds }, isActive: true },
      select: { id: true },
    });
    if (areas.length !== new Set(input.areaScopeIds).size) {
      throw new ApiException(
        'AREA_INVALID',
        'One or more area scopes are invalid.',
        422,
      );
    }

    const effectivePassword =
      input.auth.password ?? this.generateTemporaryPassword();
    const generatedTempPassword = input.auth.password
      ? null
      : effectivePassword;

    let authUserId: string | undefined;
    try {
      const created = await auth.api.createUser({
        body: {
          name: input.auth.name,
          email: input.auth.email,
          password: effectivePassword,
          role: input.auth.role as AuthRole,
        },
      });
      authUserId = created.user.id;
      const provisionedUser = await this.prisma.$transaction(async (tx) => {
        const profile = await tx.userProfile.update({
          where: { authUserId },
          data: {
            username: input.profile.username,
            fullName: input.profile.fullName,
            phone: input.profile.phone
              ? normalizeIndonesianPhoneNumber(input.profile.phone)
              : null,
            status: UserProfileStatus.PENDING,
            isActive: false,
          },
        });
        const assignment = await tx.userSeatAssignment.create({
          data: {
            userProfileId: profile.id,
            seatId: blueprint.seat.id,
            positionId: blueprint.position.id,
            isPrimary: true,
            validFrom: new Date(input.assignment.validFrom),
            areaScopes: {
              create: input.areaScopeIds.map((areaId, index) => ({
                areaId,
                isPrimary: index === 0,
                validFrom: new Date(input.assignment.validFrom),
              })),
            },
          },
        });
        await tx.userProfile.update({
          where: { id: profile.id },
          data: { status: UserProfileStatus.ACTIVE, isActive: true },
        });
        await tx.auditLog.create({
          data: {
            actorUserProfileId: actor.userProfileId,
            actorAssignmentId: actor.primaryAssignmentId,
            action: 'USER.PROVISION',
            entityType: 'UserProfile',
            entityId: profile.id,
            afterData: {
              authUserId,
              assignmentId: assignment.id,
              role: input.auth.role,
              areaScopeIds: input.areaScopeIds,
            },
          },
        });
        return this.detail(profile.id, tx);
      });
      return {
        userProfile: provisionedUser,
        generatedTempPassword,
      };
    } catch (error) {
      if (authUserId) {
        await this.prisma.user
          .update({
            where: { id: authUserId },
            data: { banned: true, banReason: 'Provisioning failed' },
          })
          .catch(() => undefined);
        await this.prisma.userProfile
          .update({
            where: { authUserId },
            data: { status: UserProfileStatus.SUSPENDED, isActive: false },
          })
          .catch(() => undefined);
        await this.prisma.session
          .deleteMany({ where: { userId: authUserId } })
          .catch(() => undefined);
      }
      throw error;
    }
  }

  detail(
    id: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return client.userProfile.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        authUser: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            banned: true,
          },
        },
        positionAssignments: {
          orderBy: { validFrom: 'desc' },
          include: {
            seat: { include: { organizationUnit: true, role: true } },
            position: { include: { role: true, organizationUnit: true } },
            areaScopes: { include: { area: true } },
          },
        },
      },
    });
  }

  async update(
    id: string,
    input: UpdateUserProfileDto,
    actor: AuthorizationContext,
  ) {
    await this.ensureExists(id);
    const before = await this.prisma.userProfile.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.userProfile.update({
      where: { id },
      data: {
        ...input,
        ...(input.phone
          ? { phone: normalizeIndonesianPhoneNumber(input.phone) }
          : {}),
      },
    });
    await this.audit(actor, 'USER.UPDATE', id, before, updated);
    return this.detail(id);
  }

  async activate(id: string, reason: string, actor: AuthorizationContext) {
    const profile = await this.ensureExists(id);
    const assignment = await this.prisma.userSeatAssignment.findFirst({
      where: {
        userProfileId: id,
        isPrimary: true,
        isActive: true,
        validUntil: null,
      },
      include: { areaScopes: { where: { validUntil: null } } },
    });
    if (!assignment || assignment.areaScopes.length === 0) {
      throw new ApiException(
        'PROVISIONING_INCOMPLETE',
        'Active primary assignment and area scope are required.',
        422,
      );
    }
    if (profile.status === UserProfileStatus.ACTIVE) {
      throw new ApiException(
        'PROFILE_ALREADY_ACTIVE',
        'Profile is already active.',
        409,
      );
    }
    await this.prisma.userProfile.update({
      where: { id },
      data: { status: UserProfileStatus.ACTIVE, isActive: true },
    });
    await this.audit(
      actor,
      'USER.ACTIVATE',
      id,
      { status: profile.status },
      { status: 'ACTIVE', reason },
    );
    return this.detail(id);
  }

  async suspend(
    id: string,
    input: SuspendUserDto,
    actor: AuthorizationContext,
  ) {
    const profile = await this.ensureExists(id);
    if (id === actor.userProfileId)
      throw new ApiException(
        'SELF_SUSPEND_FORBIDDEN',
        'Self suspension is not permitted.',
        422,
      );
    await this.prisma.$transaction([
      this.prisma.userProfile.update({
        where: { id },
        data: {
          status: UserProfileStatus.SUSPENDED,
          isActive: false,
          operationalLockedAt: input.until ? new Date() : null,
          operationalLockedUntil: input.until ? new Date(input.until) : null,
          operationalLockReason: input.until ? input.reason : null,
        },
      }),
      this.prisma.user.update({
        where: { id: profile.authUserId },
        data: {
          banned: true,
          banReason: input.reason,
          banExpires: input.until ? new Date(input.until) : null,
        },
      }),
      ...(input.revokeSessions
        ? [
            this.prisma.session.deleteMany({
              where: { userId: profile.authUserId },
            }),
          ]
        : []),
    ]);
    await this.audit(
      actor,
      'USER.SUSPEND',
      id,
      { status: profile.status },
      input,
    );
    return this.detail(id);
  }

  async archive(
    id: string,
    input: ArchiveUserDto,
    actor: AuthorizationContext,
  ) {
    const profile = await this.ensureExists(id);
    const effectiveAt = new Date(input.effectiveAt);
    await this.prisma.$transaction(async (tx) => {
      const assignments = await tx.userSeatAssignment.findMany({
        where: { userProfileId: id, isActive: true },
        select: { id: true },
      });
      await tx.positionAreaScope.updateMany({
        where: {
          positionAssignmentId: { in: assignments.map((item) => item.id) },
          validUntil: null,
        },
        data: { validUntil: effectiveAt },
      });
      await tx.userSeatAssignment.updateMany({
        where: { userProfileId: id, isActive: true },
        data: { isActive: false, validUntil: effectiveAt },
      });
      await tx.userProfile.update({
        where: { id },
        data: {
          status: UserProfileStatus.ARCHIVED,
          isActive: false,
          deletedAt: effectiveAt,
        },
      });
      await tx.user.update({
        where: { id: profile.authUserId },
        data: { banned: true, banReason: input.reason },
      });
      await tx.session.deleteMany({ where: { userId: profile.authUserId } });
    });
    await this.audit(
      actor,
      'USER.ARCHIVE',
      id,
      { status: profile.status },
      input,
    );
    return { id, status: UserProfileStatus.ARCHIVED, effectiveAt };
  }

  async lock(id: string, input: LockUserDto, actor: AuthorizationContext) {
    const profile = await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.userProfile.update({
        where: { id },
        data: {
          operationalLockedAt: new Date(),
          operationalLockedUntil: input.lockedUntil
            ? new Date(input.lockedUntil)
            : null,
          operationalLockReason: input.reason,
        },
      }),
      this.prisma.session.deleteMany({ where: { userId: profile.authUserId } }),
    ]);
    await this.audit(actor, 'USER.LOCK', id, null, input);
    return this.detail(id);
  }

  async unlock(id: string, reason: string, actor: AuthorizationContext) {
    await this.ensureExists(id);
    await this.prisma.userProfile.update({
      where: { id },
      data: {
        operationalLockedAt: null,
        operationalLockedUntil: null,
        operationalLockReason: null,
      },
    });
    await this.audit(actor, 'USER.UNLOCK', id, null, { reason });
    return this.detail(id);
  }

  async changePrimaryAssignment(
    id: string,
    input: ChangePrimaryAssignmentDto,
    actor: AuthorizationContext,
  ) {
    const profile = await this.ensureExists(id);
    const position = await this.prisma.position.findUnique({
      where: { id: input.newPositionId },
      include: { role: true },
    });
    if (!position?.isActive)
      throw new ApiException(
        'POSITION_NOT_ACTIVE',
        'Target position is not active.',
        422,
      );
    const authRole = Object.entries(AUTH_ROLE_TO_DOMAIN_ROLE).find(
      ([, role]) => role === position.role.code,
    )?.[0];
    if (!authRole)
      throw new ApiException(
        'ROLE_MAPPING_MISSING',
        'Position role has no authentication mapping.',
        422,
      );
    const effectiveAt = new Date(input.effectiveAt);
    const assignment = await this.prisma.$transaction(async (tx) => {
      const old = await tx.userSeatAssignment.findFirst({
        where: {
          userProfileId: id,
          isPrimary: true,
          isActive: true,
          validUntil: null,
        },
      });
      if (old) {
        await tx.positionAreaScope.updateMany({
          where: { positionAssignmentId: old.id, validUntil: null },
          data: { validUntil: effectiveAt },
        });
        await tx.userSeatAssignment.update({
          where: { id: old.id },
          data: { isActive: false, isPrimary: false, validUntil: effectiveAt },
        });
      }
      const seatBlueprint = await this.resolveSeatBlueprint({
        client: tx,
        roleCode: position.role.code,
        organizationUnitId: position.organizationUnitId,
        branch: position.branch ?? null,
        positionId: position.id,
      });
      const created = await tx.userSeatAssignment.create({
        data: {
          userProfileId: id,
          seatId: seatBlueprint.seat.id,
          positionId: position.id,
          validFrom: effectiveAt,
          isPrimary: true,
          areaScopes: {
            create: input.areaScopeIds.map((areaId, index) => ({
              areaId,
              isPrimary: index === 0,
              validFrom: effectiveAt,
            })),
          },
        },
      });
      await tx.user.update({
        where: { id: profile.authUserId },
        data: { role: authRole },
      });
      await tx.session.deleteMany({ where: { userId: profile.authUserId } });
      await tx.auditLog.create({
        data: {
          actorUserProfileId: actor.userProfileId,
          actorAssignmentId: actor.primaryAssignmentId,
          action: 'POSITION.TRANSFER',
          entityType: 'PositionAssignment',
          entityId: created.id,
          metadata: {
            reason: input.reason,
            oldAssignmentId: old?.id,
            newPositionId: position.id,
            areaScopeIds: input.areaScopeIds,
          },
        },
      });
      return created;
    });
    return this.prisma.userSeatAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: {
        position: { include: { role: true, organizationUnit: true } },
        areaScopes: { include: { area: true } },
      },
    });
  }

  assignments(id: string, activeOnly: boolean) {
    return this.prisma.userSeatAssignment.findMany({
      where: { userProfileId: id, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { validFrom: 'desc' },
      include: {
        position: { include: { role: true, organizationUnit: true } },
        areaScopes: { include: { area: true } },
      },
    });
  }

  private async ensureExists(id: string) {
    const profile = await this.prisma.userProfile.findFirst({
      where: { id, deletedAt: null },
    });
    if (!profile)
      throw new ApiException(
        'RESOURCE_NOT_FOUND',
        'User profile was not found.',
        404,
      );
    return profile;
  }

  private buildListWhere(
    query: UserProfileListQueryDto,
    areaIds: string[] | null,
  ): Prisma.UserProfileWhereInput {
    return {
      ...(query.includeArchived ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
              {
                authUser: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
      ...(query.roleCode ||
      query.branch ||
      query.positionCode ||
      query.unitId ||
      areaIds?.length
        ? {
            positionAssignments: {
              some: {
                isPrimary: true,
                isActive: true,
                validUntil: null,
                ...(query.branch ? { seat: { branch: query.branch } } : {}),
                ...(query.positionCode
                  ? { position: { code: query.positionCode } }
                  : {}),
                ...(query.roleCode
                  ? { position: { role: { code: query.roleCode } } }
                  : {}),
                ...(query.unitId
                  ? { seat: { organizationUnitId: query.unitId } }
                  : {}),
                ...(areaIds?.length
                  ? {
                      areaScopes: {
                        some: {
                          areaId: { in: areaIds },
                          validUntil: null,
                        },
                      },
                    }
                  : {}),
              },
            },
          }
        : {}),
    };
  }

  private async resolveAreaFilterIds(areaId: string) {
    const descendants = await this.prisma.administrativeAreaClosure.findMany({
      where: { ancestorId: areaId },
      select: { descendantId: true },
    });

    return [
      ...new Set([areaId, ...descendants.map((entry) => entry.descendantId)]),
    ];
  }

  private generateTemporaryPassword() {
    return `Dc-${randomBytes(12).toString('base64url')}`;
  }

  private async resolveSeatBlueprint(input: {
    client: Prisma.TransactionClient | PrismaService;
    roleCode: RoleCode;
    organizationUnitId: string;
    branch: CommandRouteType | null;
    positionId?: string;
  }) {
    const unit = await input.client.organizationUnit.findUniqueOrThrow({
      where: { id: input.organizationUnitId },
      select: { id: true, type: true, branch: true, isActive: true },
    });

    if (!unit.isActive) {
      throw new ApiException(
        'UNIT_NOT_ACTIVE',
        'Target organization unit is not active.',
        422,
      );
    }

    if (input.branch && unit.branch && unit.branch !== input.branch) {
      throw new ApiException(
        'BRANCH_UNIT_MISMATCH',
        'Selected branch does not match the organization unit branch.',
        422,
      );
    }

    if (
      !input.branch &&
      input.roleCode !== RoleCode.ADMIN_SYSTEM &&
      input.roleCode !== RoleCode.EXECUTIVE
    ) {
      throw new ApiException(
        'BRANCH_REQUIRED',
        'Operational roles require a branch.',
        422,
      );
    }

    const position = input.positionId
      ? await input.client.position.findUnique({
          where: { id: input.positionId },
          include: { role: true },
        })
      : await input.client.position.findFirst({
          where: {
            organizationUnitId: input.organizationUnitId,
            role: { code: input.roleCode },
            branch: input.branch,
            isActive: true,
          },
          include: { role: true },
          orderBy: { createdAt: 'asc' },
        });

    if (!position || !position.isActive) {
      throw new ApiException(
        'POSITION_NOT_ACTIVE',
        'Target position is not active.',
        422,
      );
    }

    if (position.role.code !== input.roleCode) {
      throw new ApiException(
        'ROLE_POSITION_MISMATCH',
        'Role does not match the selected active position.',
        422,
      );
    }

    if (position.organizationUnitId !== input.organizationUnitId) {
      throw new ApiException(
        'POSITION_UNIT_MISMATCH',
        'Position does not belong to the selected organization unit.',
        422,
      );
    }

    if ((position.branch ?? null) !== input.branch) {
      throw new ApiException(
        'POSITION_BRANCH_MISMATCH',
        'Position branch does not match the selected branch.',
        422,
      );
    }

    const existingSeat = await input.client.organizationRoleSeat.findFirst({
      where: {
        organizationUnitId: position.organizationUnitId,
        roleId: position.roleId,
        ...(position.branch ? { branch: position.branch } : { branch: null }),
      },
      select: { id: true },
    });

    const seat = existingSeat
      ? await input.client.organizationRoleSeat.update({
          where: { id: existingSeat.id },
          data: {
            positionId: position.id,
            isActive: true,
          },
        })
      : await input.client.organizationRoleSeat.create({
          data: {
            organizationUnitId: position.organizationUnitId,
            roleId: position.roleId,
            ...(position.branch ? { branch: position.branch } : {}),
            positionId: position.id,
            isActive: true,
          },
        });

    return { unit, position, seat };
  }

  private audit(
    actor: AuthorizationContext,
    action: string,
    entityId: string,
    beforeData: unknown,
    afterData: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action,
        entityType: 'UserProfile',
        entityId,
        beforeData: beforeData as Prisma.InputJsonValue,
        afterData: afterData as Prisma.InputJsonValue,
      },
    });
  }
}
