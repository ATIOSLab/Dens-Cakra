import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import { AUTH_ROLE_TO_DOMAIN_ROLE } from '../../common/constants/auth-role.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { Prisma, UserProfileStatus } from '../../generated/prisma/client.js';
import { OrganizationService } from '../access/organization.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  CreatePositionAssignmentDto,
  CreatePositionDto,
  ReplaceAssignmentScopesDto,
  UpdatePositionDto,
} from './dto/position.dto.js';
import { PositionQueryService } from './position-query.service.js';

@Injectable()
export class PositionMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationService,
    private readonly positionQuery: PositionQueryService,
  ) {}

  async create(input: CreatePositionDto, actor: AuthorizationContext) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { id: input.roleId },
    });
    const expected = Object.values(AUTH_ROLE_TO_DOMAIN_ROLE).find(
      (value) => value === role.code,
    );
    if (!expected) {
      throw new ApiException(
        'ROLE_MAPPING_MISSING',
        'Role cannot be assigned to a business position.',
        422,
      );
    }
    const reportsTo = input.reportsToPositionId
      ? await this.prisma.position.findUnique({
          where: { id: input.reportsToPositionId },
        })
      : null;
    await this.organizations.validateCommandRouteForPosition({
      code: input.code,
      organizationUnitId: input.organizationUnitId,
      reportsTo: reportsTo ? { code: reportsTo.code } : null,
    });
    const position = await this.prisma.position.create({ data: input });
    await this.audit(
      this.prisma,
      actor,
      'POSITION.CREATE',
      position.id,
      null,
      position,
    );
    return position.id;
  }

  async update(
    id: string,
    input: UpdatePositionDto,
    actor: AuthorizationContext,
  ) {
    const before = await this.prisma.position.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.position.update({
      where: { id },
      data: input,
    });
    await this.audit(
      this.prisma,
      actor,
      'POSITION.UPDATE',
      id,
      before,
      updated,
    );
  }

  async changeReportingLine(
    id: string,
    supervisorId: string,
    reason: string,
    actor: AuthorizationContext,
  ) {
    const position = await this.prisma.position.findUniqueOrThrow({
      where: { id },
    });
    if (id === supervisorId) {
      throw new ApiException(
        'REPORTING_CYCLE',
        'Position cannot report to itself.',
        422,
      );
    }
    const chain = await this.positionQuery.reportingChain(supervisorId);
    if (chain.some((item) => item.id === id)) {
      throw new ApiException(
        'REPORTING_CYCLE',
        'Reporting line would create a cycle.',
        422,
      );
    }
    const supervisor = await this.prisma.position.findUniqueOrThrow({
      where: { id: supervisorId },
    });
    await this.organizations.validateCommandRouteForPosition({
      code: position.code,
      organizationUnitId: position.organizationUnitId,
      reportsTo: { code: supervisor.code },
    });
    await this.prisma.position.update({
      where: { id },
      data: { reportsToPositionId: supervisorId },
    });
    await this.audit(
      this.prisma,
      actor,
      'POSITION.REPORTING_LINE.CHANGE',
      id,
      { reportsToPositionId: position.reportsToPositionId },
      { reportsToPositionId: supervisorId, reason },
    );
  }

  async createAssignment(
    input: CreatePositionAssignmentDto,
    actor: AuthorizationContext,
  ) {
    const [profile, position] = await Promise.all([
      this.prisma.userProfile.findUniqueOrThrow({
        where: { id: input.userProfileId },
        include: { authUser: true },
      }),
      this.prisma.position.findUniqueOrThrow({
        where: { id: input.positionId },
        include: { role: true },
      }),
    ]);
    if (
      profile.status !== UserProfileStatus.ACTIVE &&
      profile.status !== UserProfileStatus.PENDING
    ) {
      throw new ApiException(
        'PROFILE_NOT_ASSIGNABLE',
        'Profile cannot receive an assignment.',
        422,
      );
    }
    if (
      input.isPrimary &&
      AUTH_ROLE_TO_DOMAIN_ROLE[
        profile.authUser.role as keyof typeof AUTH_ROLE_TO_DOMAIN_ROLE
      ] !== position.role.code
    ) {
      throw new ApiException(
        'AUTH_DOMAIN_ROLE_MISMATCH',
        'Primary assignment role must match Better Auth role.',
        422,
      );
    }
    const validFrom = new Date(input.validFrom);
    const validUntil = input.validUntil ? new Date(input.validUntil) : null;
    if (validUntil && validUntil <= validFrom) {
      throw new ApiException(
        'DATE_RANGE_INVALID',
        'validUntil must be after validFrom.',
        422,
      );
    }
    const assignment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.positionAssignment.create({
        data: {
          userProfileId: input.userProfileId,
          positionId: input.positionId,
          isPrimary: input.isPrimary,
          validFrom,
          validUntil,
          areaScopes: {
            create: input.areaScopeIds.map((areaId, index) => ({
              areaId,
              isPrimary: index === 0,
              validFrom,
              validUntil,
            })),
          },
        },
      });
      await this.audit(tx, actor, 'POSITION.ASSIGN', created.id, null, input);
      return created;
    });
    return assignment.id;
  }

  async closeAssignment(
    id: string,
    validUntil: Date,
    reason: string,
    actor: AuthorizationContext,
  ) {
    const assignment = await this.prisma.positionAssignment.findUniqueOrThrow({
      where: { id },
    });
    if (validUntil <= assignment.validFrom) {
      throw new ApiException(
        'DATE_RANGE_INVALID',
        'validUntil must be after validFrom.',
        422,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.positionAreaScope.updateMany({
        where: { positionAssignmentId: id, validUntil: null },
        data: { validUntil },
      });
      await tx.positionAssignment.update({
        where: { id },
        data: { isActive: false, validUntil },
      });
      await this.audit(tx, actor, 'POSITION.ASSIGNMENT.CLOSE', id, null, {
        validUntil,
        reason,
      });
    });
  }

  async setPrimary(id: string, reason: string, actor: AuthorizationContext) {
    const assignment = await this.positionQuery.assignment(id);
    if (!assignment.isActive || assignment.validUntil) {
      throw new ApiException(
        'ASSIGNMENT_NOT_ACTIVE',
        'Target assignment is not active.',
        422,
      );
    }
    const authRole = Object.entries(AUTH_ROLE_TO_DOMAIN_ROLE).find(
      ([, role]) => role === assignment.position.role.code,
    )?.[0];
    if (!authRole) {
      throw new ApiException(
        'ROLE_MAPPING_MISSING',
        'Position role has no auth mapping.',
        422,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.positionAssignment.updateMany({
        where: { userProfileId: assignment.userProfileId, isPrimary: true },
        data: { isPrimary: false },
      });
      await tx.positionAssignment.update({
        where: { id },
        data: { isPrimary: true },
      });
      await tx.user.update({
        where: { id: assignment.userProfile.authUserId },
        data: { role: authRole },
      });
      await tx.session.deleteMany({
        where: { userId: assignment.userProfile.authUserId },
      });
      await this.audit(tx, actor, 'POSITION.ASSIGNMENT.SET_PRIMARY', id, null, {
        reason,
      });
    });
  }

  async validateScopes(id: string, areaIds: string[]) {
    const assignment = await this.positionQuery.assignment(id);
    const policy = await this.prisma.positionAreaPolicy.findMany({
      where: { positionCode: assignment.position.code, isActive: true },
    });
    const areas = await this.prisma.administrativeArea.findMany({
      where: { id: { in: areaIds }, isActive: true },
    });
    const violations: string[] = [];
    if (areas.length !== new Set(areaIds).size) {
      violations.push('UNKNOWN_OR_INACTIVE_AREA');
    }
    const allowedLevels = new Set(
      policy.map((item) => item.administrativeLevel),
    );
    for (const area of areas) {
      if (policy.length && !allowedLevels.has(area.level)) {
        violations.push(`LEVEL_${area.level}_NOT_ALLOWED`);
      }
    }
    const minimum = Math.max(0, ...policy.map((item) => item.minimumAreas));
    const maximum = policy
      .map((item) => item.maximumAreas)
      .filter((value): value is number => value !== null)
      .sort((left, right) => left - right)[0];
    if (areaIds.length < minimum) {
      violations.push('MINIMUM_AREAS_NOT_MET');
    }
    if (maximum !== undefined && areaIds.length > maximum) {
      violations.push('MAXIMUM_AREAS_EXCEEDED');
    }
    return { valid: violations.length === 0, violations, warnings: [] };
  }

  async replaceScopes(
    id: string,
    input: ReplaceAssignmentScopesDto,
    actor: AuthorizationContext,
  ) {
    const validation = await this.validateScopes(
      id,
      input.areas.map((area) => area.areaId),
    );
    if (!validation.valid) {
      throw new ApiException(
        'AREA_SCOPE_INVALID',
        'Area scope policy validation failed.',
        422,
        undefined,
        validation,
      );
    }
    if (input.areas.filter((area) => area.isPrimary).length !== 1) {
      throw new ApiException(
        'PRIMARY_AREA_REQUIRED',
        'Exactly one primary area is required.',
        422,
      );
    }
    const effectiveAt = new Date(input.effectiveAt);
    await this.prisma.$transaction(async (tx) => {
      await tx.positionAreaScope.updateMany({
        where: { positionAssignmentId: id, validUntil: null },
        data: { validUntil: effectiveAt },
      });
      await tx.positionAreaScope.createMany({
        data: input.areas.map((area) => ({
          positionAssignmentId: id,
          areaId: area.areaId,
          isPrimary: area.isPrimary,
          validFrom: effectiveAt,
        })),
      });
      await this.audit(
        tx,
        actor,
        'POSITION.AREA_SCOPE.REPLACE',
        id,
        null,
        input,
      );
    });
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
        entityType: 'Position',
        entityId,
        beforeData: beforeData as Prisma.InputJsonValue,
        afterData: afterData as Prisma.InputJsonValue,
      },
    });
  }
}
