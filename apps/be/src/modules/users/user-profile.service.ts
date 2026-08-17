import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashPassword } from 'better-auth/crypto';
import { auth } from '../../lib/auth.js';
import {
  AUTH_ROLE_TO_DOMAIN_ROLE,
  type AuthRole,
} from '../../common/constants/auth-role.js';
import { ApiException } from '../../common/api/api-exception.js';
import {
  getIndonesianPhoneSearchVariants,
  normalizeIndonesianPhoneNumber,
} from '../../common/utils/phone-normalizer.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  AdministrativeLevel,
  CommandRouteType,
  Prisma,
  RoleCode,
  UserProfileStatus,
} from '../../generated/prisma/client.js';
import {
  type AreaWithDkiAncestry,
  DKI_JAKARTA_PROVINCE_CODE,
  DKI_JAKARTA_PROVINCE_NAME_MATCHERS,
  DKI_SUPERVISION_RBAC_POLICY,
  isDirectorateSupervisionRole,
  isDkiJakartaProvince,
  isDkiJakartaRegencyCity,
} from '../../common/administrative/dki-supervision.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  ArchiveUserDto,
  ChangePrimaryAssignmentDto,
  LockUserDto,
  ProvisionUserDto,
  ResetUserPasswordDto,
  SuspendUserDto,
  UpdateDkiSupervisionScopeDto,
  UpdateUserProfileDto,
  UserProfileListQueryDto,
} from './dto/user-profile.dto.js';

@Injectable()
export class UserProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async dkiSupervisionMappings() {
    const [cities, assignments] = await Promise.all([
      this.dkiRegencyCities(),
      this.prisma.userOperationalAssignment.findMany({
        where: {
          branch: CommandRouteType.DIRECTORATE,
          isActive: true,
          validUntil: null,
          role: {
            code: {
              in: [RoleCode.REGIONAL_COMMANDER],
            },
          },
          userProfile: { deletedAt: null },
        },
        orderBy: [
          { role: { code: 'asc' } },
          { userProfile: { fullName: 'asc' } },
          { createdAt: 'asc' },
        ],
        include: {
          role: true,
          userProfile: {
            select: {
              id: true,
              username: true,
              fullName: true,
              status: true,
              authUser: { select: { role: true, email: true, banned: true } },
            },
          },
          areaScopes: {
            where: { validUntil: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            include: { area: true },
          },
        },
      }),
    ]);
    const dkiCityIds = new Set(cities.map((city: { id: string }) => city.id));
    const assignmentItems = assignments.map((assignment: any) => {
      const dkiScopes = assignment.areaScopes.filter((scope: any) =>
        dkiCityIds.has(scope.areaId),
      );
      return {
        id: assignment.id,
        userProfileId: assignment.userProfileId,
        user: assignment.userProfile,
        role: assignment.role,
        branch: assignment.branch,
        validFrom: assignment.validFrom,
        areas: assignment.areaScopes.map((scope: any) => ({
          id: scope.area.id,
          code: scope.area.code,
          officialCode: scope.area.officialCode,
          name: scope.area.name,
          level: scope.area.level,
          isPrimary: scope.isPrimary,
          isDkiJakarta: dkiCityIds.has(scope.areaId),
        })),
        dkiAreaIds: dkiScopes.map((scope: any) => scope.areaId),
      };
    });
    const assignedCityIds = new Set(
      assignmentItems.flatMap(
        (assignment: { dkiAreaIds: string[] }) => assignment.dkiAreaIds,
      ),
    );

    return {
      policyId: DKI_SUPERVISION_RBAC_POLICY.policyId,
      storageModel: DKI_SUPERVISION_RBAC_POLICY.storageModel,
      supervisionMode: 'DKI_REGENCY_CITY',
      supervisionLabel: 'Supervisi DKI berbasis Kota/Kabupaten',
      scopeDescription:
        'Admin dapat mengatur cakupan supervisi Direktorat/Ditwil di DKI Jakarta sampai level Kota/Kabupaten tanpa mengubah source code.',
      rules: {
        allowsMultipleRegencyCitiesPerDirectorate:
          DKI_SUPERVISION_RBAC_POLICY.allowsMultipleRegencyCitiesPerDirectorate,
        forbidsHardcodedDirectorateCityAssignment:
          DKI_SUPERVISION_RBAC_POLICY.forbidsHardcodedDirectorateCityAssignment,
        commandLineUnchanged: DKI_SUPERVISION_RBAC_POLICY.commandLineUnchanged,
      },
      cities: cities.map((city: any) => ({
        id: city.id,
        code: city.code,
        officialCode: city.officialCode,
        name: city.name,
        level: city.level,
      })),
      assignments: assignmentItems,
      summary: {
        totalCities: cities.length,
        assignedCities: assignedCityIds.size,
        unassignedCities: Math.max(0, cities.length - assignedCityIds.size),
        directorateUsers: assignmentItems.length,
      },
    };
  }

  async updateDkiSupervisionScope(
    id: string,
    input: UpdateDkiSupervisionScopeDto,
    actor: AuthorizationContext,
  ) {
    const profile = await this.ensureExists(id);
    const current = await this.prisma.userOperationalAssignment.findFirst({
      where: {
        userProfileId: id,
        isPrimary: true,
        isActive: true,
        validUntil: null,
      },
      include: { role: true },
    });
    if (
      !current ||
      current.branch !== CommandRouteType.DIRECTORATE ||
      !isDirectorateSupervisionRole(current.role.code)
    ) {
      throw new ApiException(
        'DKI_SUPERVISION_ASSIGNMENT_INVALID',
        'Mapping supervisi DKI hanya dapat diberikan kepada pengguna Direktorat/Ditwil aktif.',
        422,
      );
    }

    const areaScopeIds = [...new Set(input.areaScopeIds)];
    const cities = await this.dkiRegencyCities({ ids: areaScopeIds });
    if (cities.length !== areaScopeIds.length) {
      throw new ApiException(
        'DKI_SUPERVISION_CITY_INVALID',
        'Cakupan supervisi DKI harus memilih Kota/Kabupaten administratif DKI Jakarta.',
        422,
      );
    }

    return this.changePrimaryAssignment(
      id,
      {
        roleCode: current.role.code,
        branch: CommandRouteType.DIRECTORATE,
        areaScopeIds,
        effectiveAt: input.effectiveAt ?? new Date().toISOString(),
        reason: input.reason,
      },
      actor,
    );
  }

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
            operationalAssignments: {
              where: { isPrimary: true, isActive: true, validUntil: null },
              include: {
                role: true,
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
          statusCounts.find(
            (entry: { status: UserProfileStatus; _count: { _all: number } }) =>
              entry.status === status,
          )?._count._all ?? 0;
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
    const authRole = input.auth.role as AuthRole;
    if (!AUTH_ROLE_TO_DOMAIN_ROLE[authRole]) {
      throw new ApiException(
        'ROLE_MAPPING_MISSING',
        'Selected role has no authentication mapping.',
        422,
      );
    }
    const requestedAreaScopeIds = input.areaScopeIds?.length
      ? [...new Set(input.areaScopeIds)]
      : [];
    if (!requestedAreaScopeIds.length) {
      throw new ApiException(
        'AREA_SCOPE_REQUIRED',
        'At least one area scope is required.',
        422,
      );
    }
    this.assertProvisionBranchForRole(authRole, input.assignment.branch);
    if (
      input.assignment.branch === CommandRouteType.BINDA &&
      requestedAreaScopeIds.length !== 1
    ) {
      throw new ApiException(
        'BINDA_SCOPE_SINGLE_REQUIRED',
        'Binda user provisioning must use exactly one area scope.',
        422,
      );
    }
    const blueprint = await this.resolveProvisionAssignmentBlueprint({
      client: this.prisma,
      branch: input.assignment.branch,
      authRole,
      requestedAreaScopeIds,
    });
    const areaScopeIds = blueprint.areaScopeIds;
    const areas = await this.prisma.administrativeArea.findMany({
      where: { id: { in: areaScopeIds }, isActive: true },
      select: { id: true },
    });
    if (areas.length !== areaScopeIds.length) {
      throw new ApiException(
        'AREA_INVALID',
        'One or more area scopes are invalid.',
        422,
      );
    }

    const effectivePassword = input.auth.password;
    const generatedTempPassword = null;
    const authName =
      input.auth.name?.trim() ||
      input.profile.fullName?.trim() ||
      input.profile.username.trim();
    const authEmail =
      input.auth.email?.trim() ||
      this.buildFallbackEmail(input.profile.username);

    let authUserId: string | undefined;
    try {
      const created = await auth.api.createUser({
        body: {
          name: authName,
          email: authEmail,
          password: effectivePassword,
          role: authRole,
        },
      });
      authUserId = created.user.id;
      const provisionedUser = await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: authUserId },
          data: {
            emailVerified: true,
            username: input.profile.username,
            displayUsername: input.profile.username,
          },
        });

        const profile = await tx.userProfile.update({
          where: { authUserId },
          data: {
            username: input.profile.username,
            fullName: input.profile.fullName?.trim() || authName,
            phone: input.profile.phone
              ? normalizeIndonesianPhoneNumber(input.profile.phone)
              : null,
            nationalIdNumber: input.profile.nationalIdNumber ?? null,
            birthPlace: input.profile.birthPlace ?? null,
            birthDate: input.profile.birthDate
              ? new Date(input.profile.birthDate)
              : null,
            gender: input.profile.gender ?? null,
            religion: input.profile.religion ?? null,
            maritalStatus: input.profile.maritalStatus ?? null,
            bloodType: input.profile.bloodType ?? null,
            personnelNumber: input.profile.personnelNumber ?? null,
            rankGrade: input.profile.rankGrade ?? null,
            personnelStatus: input.profile.personnelStatus ?? null,
            joinedAt: input.profile.joinedAt
              ? new Date(input.profile.joinedAt)
              : null,
            lastEducation: input.profile.lastEducation ?? null,
            educationInstitution: input.profile.educationInstitution ?? null,
            educationMajor: input.profile.educationMajor ?? null,
            graduationYear: input.profile.graduationYear ?? null,
            ...(input.profile.positionHistory
              ? {
                  positionHistory: input.profile
                    .positionHistory as unknown as Prisma.InputJsonValue,
                }
              : {}),
            ...(input.profile.assignmentHistory
              ? {
                  assignmentHistory: input.profile
                    .assignmentHistory as unknown as Prisma.InputJsonValue,
                }
              : {}),
            ...(input.profile.competencies
              ? {
                  competencies: input.profile.competencies,
                }
              : {}),
            status: UserProfileStatus.PENDING,
            isActive: false,
          },
        });
        const assignment = await tx.userOperationalAssignment.create({
          data: {
            userProfileId: profile.id,
            roleId: blueprint.role.id,
            branch: input.assignment.branch,
            isPrimary: true,
            validFrom: new Date(input.assignment.validFrom),
            areaScopes: {
              create: areaScopeIds.map((areaId, index) => ({
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
              role: authRole,
              areaScopeIds,
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
        operationalAssignments: {
          orderBy: { validFrom: 'desc' },
          include: {
            role: true,
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
    if (input.username) {
      await this.prisma.user.update({
        where: { id: updated.authUserId },
        data: {
          username: input.username,
          displayUsername: input.username,
        },
      });
    }
    await this.audit(actor, 'USER.UPDATE', id, before, updated);
    return this.detail(id);
  }

  async resetPassword(
    id: string,
    input: ResetUserPasswordDto,
    actor: AuthorizationContext,
  ) {
    const profile = await this.ensureExists(id);
    const hashedPassword = await hashPassword(input.password);
    const result = await this.prisma.$transaction(async (tx) => {
      const updatedCredential = await tx.account.updateMany({
        where: {
          userId: profile.authUserId,
          providerId: 'credential',
        },
        data: {
          password: hashedPassword,
        },
      });

      if (updatedCredential.count === 0) {
        throw new ApiException(
          'CREDENTIAL_ACCOUNT_NOT_FOUND',
          'Credential account was not found for this user.',
          422,
        );
      }

      const revokedSessions = input.revokeSessions
        ? await tx.session.deleteMany({ where: { userId: profile.authUserId } })
        : { count: 0 };

      await tx.auditLog.create({
        data: {
          actorUserProfileId: actor.userProfileId,
          actorAssignmentId: actor.primaryAssignmentId,
          action: 'USER.PASSWORD_RESET',
          entityType: 'UserProfile',
          entityId: id,
          metadata: {
            targetAuthUserId: profile.authUserId,
            revokeSessions: input.revokeSessions,
            revokedSessionCount: revokedSessions.count,
            reason: input.reason ?? null,
          },
        },
      });

      return {
        revokedSessionCount: revokedSessions.count,
      };
    });

    return {
      userProfile: await this.detail(id),
      revokedSessionCount: result.revokedSessionCount,
    };
  }

  async activate(id: string, reason: string, actor: AuthorizationContext) {
    const profile = await this.ensureExists(id);
    const assignment = await this.prisma.userOperationalAssignment.findFirst({
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
      const assignments = await tx.userOperationalAssignment.findMany({
        where: { userProfileId: id, isActive: true },
        select: { id: true },
      });
      await tx.userAreaScope.updateMany({
        where: {
          operationalAssignmentId: { in: assignments.map((item) => item.id) },
          validUntil: null,
        },
        data: { validUntil: effectiveAt },
      });
      await tx.userOperationalAssignment.updateMany({
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
    if (
      input.branch === CommandRouteType.BINDA &&
      input.areaScopeIds?.length !== 1
    ) {
      throw new ApiException(
        'BINDA_SCOPE_SINGLE_REQUIRED',
        'Binda user assignment must use exactly one area scope.',
        422,
      );
    }
    const role = await this.prisma.role.findUnique({
      where: { code: input.roleCode },
    });
    if (!role?.isActive)
      throw new ApiException(
        'ROLE_NOT_ACTIVE',
        'Target role is not active.',
        422,
      );
    const authRole = Object.entries(AUTH_ROLE_TO_DOMAIN_ROLE).find(
      ([, code]) => code === role.code,
    )?.[0];
    if (!authRole)
      throw new ApiException(
        'ROLE_MAPPING_MISSING',
        'Selected role has no authentication mapping.',
        422,
      );
    this.assertProvisionBranchForRole(authRole as AuthRole, input.branch);
    const areaScopeIds = input.areaScopeIds?.length
      ? [...new Set(input.areaScopeIds)]
      : [];
    if (!areaScopeIds.length) {
      throw new ApiException(
        'AREA_SCOPE_REQUIRED',
        'At least one area scope is required before transfer.',
        422,
      );
    }
    await this.assertAreaScopesForRole(
      authRole as AuthRole,
      input.branch,
      areaScopeIds,
    );
    const effectiveAt = new Date(input.effectiveAt);
    const assignment = await this.prisma.$transaction(async (tx) => {
      const old = await tx.userOperationalAssignment.findFirst({
        where: {
          userProfileId: id,
          isPrimary: true,
          isActive: true,
          validUntil: null,
        },
      });
      if (old) {
        await tx.userAreaScope.updateMany({
          where: { operationalAssignmentId: old.id, validUntil: null },
          data: { validUntil: effectiveAt },
        });
        await tx.userOperationalAssignment.update({
          where: { id: old.id },
          data: { isActive: false, isPrimary: false, validUntil: effectiveAt },
        });
      }
      const created = await tx.userOperationalAssignment.create({
        data: {
          userProfileId: id,
          roleId: role.id,
          branch: input.branch,
          validFrom: effectiveAt,
          isPrimary: true,
          areaScopes: {
            create: areaScopeIds.map((areaId, index) => ({
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
          entityType: 'UserOperationalAssignment',
          entityId: created.id,
          metadata: {
            reason: input.reason,
            oldAssignmentId: old?.id,
            roleCode: role.code,
            branch: input.branch,
            areaScopeIds,
          },
        },
      });
      return created;
    });
    return this.prisma.userOperationalAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
      include: {
        role: true,
        areaScopes: { include: { area: true } },
      },
    });
  }

  assignments(id: string, activeOnly: boolean) {
    return this.prisma.userOperationalAssignment.findMany({
      where: { userProfileId: id, ...(activeOnly ? { isActive: true } : {}) },
      orderBy: { validFrom: 'desc' },
      include: {
        role: true,
        areaScopes: { include: { area: true } },
      },
    });
  }

  private dkiRegencyCities(input: { ids?: string[] } = {}) {
    return this.prisma.administrativeArea.findMany({
      where: {
        ...(input.ids?.length ? { id: { in: input.ids } } : {}),
        deletedAt: null,
        isActive: true,
        level: { in: [AdministrativeLevel.CITY, AdministrativeLevel.REGENCY] },
        ancestorLinks: {
          some: {
            ancestor: {
              level: AdministrativeLevel.PROVINCE,
              OR: [
                { code: DKI_JAKARTA_PROVINCE_CODE },
                { officialCode: DKI_JAKARTA_PROVINCE_CODE },
                ...DKI_JAKARTA_PROVINCE_NAME_MATCHERS.map((matcher) => ({
                  name: { contains: matcher, mode: 'insensitive' as const },
                })),
              ],
            },
          },
        },
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
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
    const search = query.search?.trim();
    const phoneSearchVariants = search
      ? getIndonesianPhoneSearchVariants(search)
      : [];

    return {
      ...(query.includeArchived ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: 'insensitive' } },
              { fullName: { contains: search, mode: 'insensitive' } },
              {
                authUser: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
              ...phoneSearchVariants.map((phone) => ({
                phone: { contains: phone },
              })),
            ],
          }
        : {}),
      ...(query.roleCode || query.branch || areaIds?.length
        ? {
            operationalAssignments: {
              some: {
                isPrimary: true,
                isActive: true,
                validUntil: null,
                ...(query.branch ? { branch: query.branch } : {}),
                ...(query.roleCode ? { role: { code: query.roleCode } } : {}),
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
      ...new Set([
        areaId,
        ...descendants.map(
          (entry: { descendantId: string }) => entry.descendantId,
        ),
      ]),
    ];
  }

  private async resolveProvisionAssignmentBlueprint(input: {
    client: Prisma.TransactionClient | PrismaService;
    branch: CommandRouteType;
    authRole: AuthRole;
    requestedAreaScopeIds?: string[];
  }) {
    const roleCode = AUTH_ROLE_TO_DOMAIN_ROLE[input.authRole];
    const role = await input.client.role.findUnique({
      where: { code: roleCode },
    });
    if (!role?.isActive) {
      throw new ApiException(
        'ROLE_NOT_ACTIVE',
        'Selected role is not active.',
        422,
      );
    }
    const areaScopeIds = input.requestedAreaScopeIds?.length
      ? [...new Set(input.requestedAreaScopeIds)]
      : [];
    await this.assertAreaScopesForRole(
      input.authRole,
      input.branch,
      areaScopeIds,
    );
    return {
      role,
      areaScopeIds,
    };
  }

  private resolveProvisionAreaLevels(
    authRole: AuthRole,
    branch?: CommandRouteType,
  ): AdministrativeLevel[] {
    switch (authRole) {
      case 'executive':
        return [AdministrativeLevel.COUNTRY];
      case 'regional_commander':
        if (branch === CommandRouteType.DIRECTORATE) {
          return [
            AdministrativeLevel.PROVINCE,
            AdministrativeLevel.REGENCY,
            AdministrativeLevel.CITY,
          ];
        }

        return [AdministrativeLevel.PROVINCE];
      case 'field_coordinator':
        return [AdministrativeLevel.REGENCY, AdministrativeLevel.CITY];
      case 'field_officer':
        return [AdministrativeLevel.DISTRICT];
      default:
        return [];
    }
  }

  private assertProvisionBranchForRole(
    authRole: AuthRole,
    branch: CommandRouteType,
  ) {
    if (authRole === 'executive') {
      if (branch !== CommandRouteType.PUSAT) {
        throw new ApiException(
          'EXECUTIVE_BRANCH_REQUIRED',
          'Provisioning pengguna Deputi II harus menggunakan unit PUSAT.',
          422,
        );
      }

      return;
    }

    if (branch === CommandRouteType.PUSAT) {
      throw new ApiException(
        'PUSAT_ROLE_NOT_SUPPORTED',
        'Provisioning pengguna PUSAT hanya didukung untuk role Deputi II.',
        422,
      );
    }

    if (
      branch !== CommandRouteType.BINDA &&
      branch !== CommandRouteType.DIRECTORATE
    ) {
      throw new ApiException(
        'BRANCH_NOT_SUPPORTED',
        'Provisioning pengguna hanya mendukung Deputi II PUSAT, unit BINDA, atau unit DIRECTORATE.',
        422,
      );
    }

    if (authRole === 'field_officer' && branch !== CommandRouteType.BINDA) {
      throw new ApiException(
        'FIELD_OFFICER_BRANCH_REQUIRED',
        'Petugas Wilayah (Gaswil) harus berada pada garis komando BINDA.',
        422,
      );
    }
  }

  private async assertAreaScopesForRole(
    authRole: AuthRole,
    branch: CommandRouteType,
    areaScopeIds: string[],
  ) {
    const allowedLevels = this.resolveProvisionAreaLevels(authRole, branch);
    if (!allowedLevels.length) {
      throw new ApiException(
        'ROLE_NOT_SUPPORTED',
        'Selected role is not supported by this provisioning flow.',
        422,
      );
    }
    const requestedAreas = await this.prisma.administrativeArea.findMany({
      where: { id: { in: areaScopeIds }, isActive: true },
      select: {
        id: true,
        code: true,
        officialCode: true,
        name: true,
        level: true,
        parent: {
          select: {
            code: true,
            officialCode: true,
            name: true,
            level: true,
          },
        },
        ancestorLinks: {
          where: { ancestor: { level: AdministrativeLevel.PROVINCE } },
          select: {
            ancestor: {
              select: {
                code: true,
                officialCode: true,
                name: true,
                level: true,
              },
            },
          },
        },
      },
    });
    if (requestedAreas.length !== areaScopeIds.length) {
      throw new ApiException(
        'AREA_INVALID',
        'One or more area scopes are invalid.',
        422,
      );
    }
    for (const area of requestedAreas) {
      if (!allowedLevels.includes(area.level)) {
        throw new ApiException(
          'AREA_LEVEL_INVALID',
          'Selected area level does not match the selected role.',
          422,
        );
      }
    }

    if (
      branch === CommandRouteType.DIRECTORATE &&
      isDirectorateSupervisionRole(AUTH_ROLE_TO_DOMAIN_ROLE[authRole])
    ) {
      this.assertDirectorateSupervisionScopes(requestedAreas);
    }
  }

  private assertDirectorateSupervisionScopes(areas: AreaWithDkiAncestry[]) {
    for (const area of areas) {
      if (isDkiJakartaProvince(area)) {
        throw new ApiException(
          'DKI_DIRECTORATE_PROVINCE_SCOPE_INVALID',
          'Supervisi Direktorat/Ditwil untuk DKI Jakarta harus memakai cakupan Kota/Kabupaten, bukan Provinsi.',
          422,
        );
      }

      if (area.level === AdministrativeLevel.PROVINCE) {
        continue;
      }

      if (isDkiJakartaRegencyCity(area)) {
        continue;
      }

      throw new ApiException(
        'DIRECTORATE_SUPERVISION_SCOPE_INVALID',
        'Supervisi Direktorat/Ditwil memakai cakupan Provinsi, kecuali DKI Jakarta yang memakai cakupan Kota/Kabupaten.',
        422,
      );
    }
  }

  private buildFallbackEmail(username: string) {
    const localPart = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');
    const suffix = randomBytes(4).toString('hex');
    return `${localPart || 'user'}.${suffix}@denscakra.local`;
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
