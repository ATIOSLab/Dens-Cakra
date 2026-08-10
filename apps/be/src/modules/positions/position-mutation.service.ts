import {
  OrganizationType,
  PositionCode,
} from '../../common/constants/legacy-operational-code.js';
import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import { AUTH_ROLE_TO_DOMAIN_ROLE } from '../../common/constants/auth-role.js';
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
  isDirectorateSupervisionRole,
  isDkiJakartaProvince,
  isDkiJakartaRegencyCity,
} from '../../common/administrative/dki-supervision.js';
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
    const role = await this.resolveRole(input);
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
    const resolvedBranch = await this.organizations.resolveCommandBranch(
      input.organizationUnitId,
    );
    const branch = input.branch ?? resolvedBranch;
    this.validateRolePositionMatrix(role.code, input.code, branch);
    const areaIds = this.normalizeAreaIds(input.areaScopeIds);
    const primaryAreaId = input.primaryAreaId ?? areaIds[0];
    const reportsToPositionId =
      input.reportsToPositionId ??
      (await this.resolveReportingLine({
        roleCode: role.code,
        positionCode: input.code,
        branch,
        organizationUnitId: input.organizationUnitId,
        areaIds,
        client: this.prisma,
      }));
    const reportsTo = reportsToPositionId
      ? await this.prisma.position.findUnique({
          where: { id: reportsToPositionId },
        })
      : null;
    const validatedBranch =
      await this.organizations.validateCommandRouteForPosition({
        code: input.code,
        organizationUnitId: input.organizationUnitId,
        reportsTo: reportsTo ? { code: reportsTo.code } : null,
      });
    if (validatedBranch && branch !== validatedBranch) {
      throw new ApiException(
        'POSITION_BRANCH_MISMATCH',
        'Selected branch does not match the organization unit route.',
        422,
      );
    }
    await this.validatePositionCoverage({
      roleCode: role.code,
      positionCode: input.code,
      branch,
      organizationUnitId: input.organizationUnitId,
      reportsToPositionId,
      areaIds,
      primaryAreaId,
      client: this.prisma,
    });
    const position = await this.prisma.$transaction(async (tx) => {
      const created = await tx.position.create({
        data: {
          seatCode: input.seatCode,
          code: input.code,
          title: input.title,
          roleId: role.id,
          branch,
          organizationUnitId: input.organizationUnitId,
          reportsToPositionId,
          areaCoverages: {
            create: areaIds.map((areaId) => ({
              areaId,
              isPrimary: areaId === primaryAreaId,
            })),
          },
        },
      });
      await this.ensureSeatForPosition(tx, {
        id: created.id,
        roleId: created.roleId,
        branch: created.branch,
        organizationUnitId: created.organizationUnitId,
      });
      await this.audit(tx, actor, 'POSITION.CREATE', created.id, null, {
        ...created,
        areaScopeIds: areaIds,
        primaryAreaId,
      });
      return created;
    });
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
        include: {
          role: true,
          areaCoverages: {
            where: { validUntil: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
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
    await this.assertPositionAvailable(input.positionId);
    const areaScopeIds = input.areaScopeIds?.length
      ? this.normalizeAreaIds(input.areaScopeIds)
      : position.areaCoverages.map((coverage) => coverage.areaId);
    if (!areaScopeIds.length) {
      throw new ApiException(
        'POSITION_SCOPE_REQUIRED',
        'Target position must have active area coverage before assignment.',
        422,
      );
    }
    const assignment = await this.prisma.$transaction(async (tx) => {
      const seat = await this.ensureSeatForPosition(tx, {
        id: position.id,
        roleId: position.roleId,
        branch: position.branch,
        organizationUnitId: position.organizationUnitId,
      });
      const created = await tx.userSeatAssignment.create({
        data: {
          userProfileId: input.userProfileId,
          seatId: seat.id,
          positionId: input.positionId,
          isPrimary: input.isPrimary,
          validFrom,
          validUntil,
          areaScopes: {
            create: areaScopeIds.map((areaId, index) => ({
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
    const assignment = await this.prisma.userSeatAssignment.findUniqueOrThrow({
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
      await tx.userSeatAssignment.update({
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
      await tx.userSeatAssignment.updateMany({
        where: { userProfileId: assignment.userProfileId, isPrimary: true },
        data: { isPrimary: false },
      });
      await tx.userSeatAssignment.update({
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
    const assignment =
      await this.prisma.userOperationalAssignment.findUniqueOrThrow({
        where: { id },
        include: { role: true },
      });
    const policy = await this.prisma.roleAreaPolicy.findMany({
      where: {
        roleCode: assignment.role.code,
        branch: assignment.branch,
        isActive: true,
      },
    });
    const areas = await this.prisma.administrativeArea.findMany({
      where: { id: { in: areaIds }, isActive: true, deletedAt: null },
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
    const violations: string[] = [];
    if (areas.length !== new Set(areaIds).size) {
      violations.push('UNKNOWN_OR_INACTIVE_AREA');
    }
    if (
      assignment.branch === CommandRouteType.DIRECTORATE &&
      isDirectorateSupervisionRole(assignment.role.code)
    ) {
      for (const area of areas) {
        if (isDkiJakartaProvince(area)) {
          violations.push('DKI_DIRECTORATE_PROVINCE_SCOPE_INVALID');
        } else if (area.level === AdministrativeLevel.PROVINCE) {
          continue;
        } else if (isDkiJakartaRegencyCity(area)) {
          continue;
        } else {
          violations.push('DIRECTORATE_SUPERVISION_SCOPE_INVALID');
        }
      }
    } else {
      const allowedLevels = new Set(
        policy.map((item) => item.administrativeLevel),
      );
      for (const area of areas) {
        if (policy.length && !allowedLevels.has(area.level)) {
          violations.push(`LEVEL_${area.level}_NOT_ALLOWED`);
        }
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
        'Validasi kebijakan cakupan wilayah gagal.',
        422,
        undefined,
        validation,
      );
    }
    if (input.areas.filter((area) => area.isPrimary).length !== 1) {
      throw new ApiException(
        'PRIMARY_AREA_REQUIRED',
        'Tepat satu wilayah utama wajib dipilih.',
        422,
      );
    }
    const effectiveAt = new Date(input.effectiveAt);
    await this.prisma.$transaction(async (tx) => {
      await tx.userAreaScope.updateMany({
        where: { operationalAssignmentId: id, validUntil: null },
        data: { validUntil: effectiveAt },
      });
      await tx.userAreaScope.createMany({
        data: input.areas.map((area) => ({
          operationalAssignmentId: id,
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

  private async resolveRole(input: CreatePositionDto) {
    if (input.roleId) {
      return this.prisma.role.findUniqueOrThrow({
        where: { id: input.roleId },
      });
    }
    if (input.roleCode) {
      return this.prisma.role.findUniqueOrThrow({
        where: { code: input.roleCode },
      });
    }
    throw new ApiException(
      'ROLE_REQUIRED',
      'Either roleId or roleCode is required to create a position.',
      422,
    );
  }

  private normalizeAreaIds(areaIds: string[]) {
    const normalized = [...new Set(areaIds.filter(Boolean))];
    if (normalized.length === 0) {
      throw new ApiException(
        'POSITION_SCOPE_REQUIRED',
        'At least one area scope is required.',
        422,
      );
    }
    return normalized;
  }

  private validateRolePositionMatrix(
    roleCode: RoleCode,
    positionCode: PositionCode,
    branch: CommandRouteType | null,
  ) {
    const allowed = new Map<RoleCode, readonly PositionCode[]>([
      [RoleCode.ADMIN_SYSTEM, [PositionCode.ADMIN]],
      [RoleCode.EXECUTIVE, [PositionCode.DEPUTI_II]],
      [
        RoleCode.REGIONAL_COMMANDER,
        [PositionCode.DIREKTUR_WILAYAH, PositionCode.KABINDA],
      ],
      [
        RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
        [PositionCode.KASUBDIT, PositionCode.KABAGOPS],
      ],
      [
        RoleCode.FIELD_COORDINATOR,
        [PositionCode.KORWIL, PositionCode.STAF_SUBDIT],
      ],
      [RoleCode.FIELD_OFFICER, [PositionCode.PETUGAS_ORGANIK]],
    ]);
    if (!allowed.get(roleCode)?.includes(positionCode)) {
      throw new ApiException(
        'ROLE_POSITION_MISMATCH',
        `${roleCode} tidak dapat menempati jabatan ${positionCode}.`,
        422,
      );
    }
    if (roleCode === RoleCode.EXECUTIVE && branch !== CommandRouteType.PUSAT) {
      throw new ApiException(
        'POSITION_BRANCH_MISMATCH',
        'Jabatan Deputi II harus menggunakan jalur PUSAT.',
        422,
      );
    }
    if (
      roleCode !== RoleCode.ADMIN_SYSTEM &&
      roleCode !== RoleCode.EXECUTIVE &&
      branch !== CommandRouteType.BINDA &&
      branch !== CommandRouteType.DIRECTORATE
    ) {
      throw new ApiException(
        'POSITION_BRANCH_MISMATCH',
        'Jabatan operasional harus menggunakan jalur BINDA atau DIRECTORATE.',
        422,
      );
    }
    if (
      branch === CommandRouteType.BINDA &&
      (positionCode === PositionCode.DIREKTUR_WILAYAH ||
        positionCode === PositionCode.KASUBDIT ||
        positionCode === PositionCode.STAF_SUBDIT)
    ) {
      throw new ApiException(
        'POSITION_BRANCH_MISMATCH',
        `${positionCode} is only valid on the DIRECTORATE route.`,
        422,
      );
    }
    if (
      branch === CommandRouteType.DIRECTORATE &&
      (positionCode === PositionCode.KABINDA ||
        positionCode === PositionCode.KABAGOPS ||
        positionCode === PositionCode.KORWIL)
    ) {
      throw new ApiException(
        'POSITION_BRANCH_MISMATCH',
        `${positionCode} is only valid on the BINDA route.`,
        422,
      );
    }
  }

  private async resolveReportingLine(input: {
    roleCode: RoleCode;
    positionCode: PositionCode;
    branch: CommandRouteType | null;
    organizationUnitId: string;
    areaIds: string[];
    client: Prisma.TransactionClient | PrismaService;
  }) {
    if (
      input.roleCode === RoleCode.ADMIN_SYSTEM ||
      input.roleCode === RoleCode.EXECUTIVE
    ) {
      return null;
    }

    const parentRule = this.parentRuleFor(input.roleCode, input.branch);
    if (!parentRule) {
      throw new ApiException(
        'REPORTING_LINE_RULE_MISSING',
        'No structural reporting rule is configured for this position.',
        422,
      );
    }

    const candidates = await input.client.position.findMany({
      where: {
        isActive: true,
        role: { code: parentRule.roleCode },
        code: { in: parentRule.positionCodes },
        ...(parentRule.branch ? { branch: parentRule.branch } : {}),
      },
      orderBy: { seatCode: 'asc' },
      include: {
        areaCoverages: {
          where: { validUntil: null },
          select: { areaId: true },
        },
      },
    });

    if (parentRule.roleCode === RoleCode.EXECUTIVE) {
      return this.pickSingleReportingCandidate(candidates, input.roleCode);
    }

    const candidateCoverageIds = [
      ...new Set(
        candidates.flatMap((candidate) =>
          candidate.areaCoverages.map((coverage) => coverage.areaId),
        ),
      ),
    ];
    const closureLinks = candidateCoverageIds.length
      ? await input.client.administrativeAreaClosure.findMany({
          where: {
            ancestorId: { in: candidateCoverageIds },
            descendantId: { in: input.areaIds },
          },
          select: { ancestorId: true, descendantId: true },
        })
      : [];
    const coveredPairs = new Set(
      closureLinks.map((link) => `${link.ancestorId}:${link.descendantId}`),
    );
    const matchingCandidates = candidates.filter((candidate) => {
      const coverageIds = candidate.areaCoverages.map(
        (coverage) => coverage.areaId,
      );
      return input.areaIds.every((areaId) =>
        coverageIds.some(
          (coverageId) =>
            coverageId === areaId ||
            coveredPairs.has(`${coverageId}:${areaId}`),
        ),
      );
    });

    return this.pickSingleReportingCandidate(
      matchingCandidates,
      input.roleCode,
    );
  }

  private parentRuleFor(
    roleCode: RoleCode,
    branch: CommandRouteType | null,
  ): {
    roleCode: RoleCode;
    positionCodes: PositionCode[];
    branch: CommandRouteType | null;
  } | null {
    if (roleCode === RoleCode.REGIONAL_COMMANDER) {
      return {
        roleCode: RoleCode.EXECUTIVE,
        positionCodes: [PositionCode.DEPUTI_II],
        branch: CommandRouteType.PUSAT,
      };
    }
    if (roleCode === RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER) {
      return {
        roleCode: RoleCode.REGIONAL_COMMANDER,
        positionCodes:
          branch === CommandRouteType.DIRECTORATE
            ? [PositionCode.DIREKTUR_WILAYAH]
            : [PositionCode.KABINDA],
        branch,
      };
    }
    if (roleCode === RoleCode.FIELD_COORDINATOR) {
      return {
        roleCode: RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
        positionCodes:
          branch === CommandRouteType.DIRECTORATE
            ? [PositionCode.KASUBDIT]
            : [PositionCode.KABAGOPS],
        branch,
      };
    }
    if (roleCode === RoleCode.FIELD_OFFICER) {
      return {
        roleCode: RoleCode.FIELD_COORDINATOR,
        positionCodes:
          branch === CommandRouteType.DIRECTORATE
            ? [PositionCode.STAF_SUBDIT]
            : [PositionCode.KORWIL],
        branch,
      };
    }

    return null;
  }

  private pickSingleReportingCandidate(
    candidates: Array<{ id: string }>,
    roleCode: RoleCode,
  ) {
    if (candidates.length === 1) {
      return candidates[0].id;
    }
    if (candidates.length === 0) {
      throw new ApiException(
        'REPORTING_LINE_AUTO_RESOLVE_FAILED',
        `No active structural supervisor was found for ${roleCode}.`,
        422,
      );
    }
    throw new ApiException(
      'REPORTING_LINE_AUTO_RESOLVE_AMBIGUOUS',
      `More than one active structural supervisor matches ${roleCode}.`,
      422,
    );
  }

  private async validatePositionCoverage(input: {
    roleCode: RoleCode;
    positionCode: PositionCode;
    branch: CommandRouteType | null;
    organizationUnitId: string;
    reportsToPositionId: string | null;
    areaIds: string[];
    primaryAreaId: string;
    client: Prisma.TransactionClient | PrismaService;
  }) {
    if (!input.areaIds.includes(input.primaryAreaId)) {
      throw new ApiException(
        'PRIMARY_AREA_INVALID',
        'Primary area must be one of the selected coverage areas.',
        422,
      );
    }
    const areas = await input.client.administrativeArea.findMany({
      where: {
        id: { in: input.areaIds },
        isActive: true,
        deletedAt: null,
      },
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
    if (areas.length !== input.areaIds.length) {
      throw new ApiException(
        'AREA_INVALID',
        'One or more coverage areas are invalid.',
        422,
      );
    }
    const levels = new Set<AdministrativeLevel>();
    for (const area of areas as AreaWithDkiAncestry[]) {
      levels.add(area.level);
    }
    const requireOnlyLevels = (allowed: readonly AdministrativeLevel[]) => {
      for (const level of levels) {
        if (!allowed.includes(level)) {
          throw new ApiException(
            'AREA_LEVEL_INVALID',
            `Coverage level ${level} is not valid for ${input.positionCode}.`,
            422,
          );
        }
      }
    };
    if (input.roleCode === RoleCode.EXECUTIVE) {
      requireOnlyLevels([AdministrativeLevel.COUNTRY]);
      return;
    }
    if (isDirectorateSupervisionRole(input.roleCode)) {
      if (input.branch === CommandRouteType.DIRECTORATE) {
        this.validateDirectorateSupervisionAreas(areas);
        await this.assertAreasWithinAnchorUnit(input);
        return;
      }

      requireOnlyLevels([AdministrativeLevel.PROVINCE]);
      await this.assertAreasWithinAnchorUnit(input);
      return;
    }
    if (input.roleCode === RoleCode.FIELD_COORDINATOR) {
      requireOnlyLevels([
        AdministrativeLevel.REGENCY,
        AdministrativeLevel.CITY,
      ]);
      await this.assertAreasWithinAnchorUnit(input);
      return;
    }
    if (input.roleCode === RoleCode.FIELD_OFFICER) {
      requireOnlyLevels([AdministrativeLevel.DISTRICT]);
      await this.assertAreasWithinSupervisorPosition(input);
    }
  }

  private validateDirectorateSupervisionAreas(areas: AreaWithDkiAncestry[]) {
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

  private async assertAreasWithinAnchorUnit(input: {
    organizationUnitId: string;
    areaIds: string[];
    client: Prisma.TransactionClient | PrismaService;
  }) {
    const provinceIds = await this.resolveAnchorProvinceIds(
      input.client,
      input.organizationUnitId,
    );
    if (provinceIds.length === 0) {
      return;
    }
    const covered = await input.client.administrativeAreaClosure.findMany({
      where: {
        ancestorId: { in: provinceIds },
        descendantId: { in: input.areaIds },
      },
      select: { descendantId: true },
    });
    const coveredIds = new Set(covered.map((item) => item.descendantId));
    if (input.areaIds.some((areaId) => !coveredIds.has(areaId))) {
      throw new ApiException(
        'AREA_OUTSIDE_UNIT_COVERAGE',
        'One or more selected areas are outside the organization unit coverage.',
        422,
      );
    }
  }

  private async assertAreasWithinSupervisorPosition(input: {
    reportsToPositionId: string | null;
    areaIds: string[];
    client: Prisma.TransactionClient | PrismaService;
  }) {
    if (!input.reportsToPositionId) {
      throw new ApiException(
        'REPORTING_LINE_REQUIRED',
        'Jabatan Petugas Wilayah (Gaswil) harus melapor ke jabatan Koordinator Wilayah (Korwil).',
        422,
      );
    }
    const supervisor = await input.client.position.findUnique({
      where: { id: input.reportsToPositionId },
      include: {
        areaCoverages: {
          where: { validUntil: null },
          select: { areaId: true },
        },
      },
    });
    if (
      !supervisor ||
      (supervisor.code !== PositionCode.KORWIL &&
        supervisor.code !== PositionCode.STAF_SUBDIT)
    ) {
      throw new ApiException(
        'REPORTING_LINE_INVALID',
        'Jabatan Petugas Wilayah (Gaswil) harus melapor ke KORWIL atau STAF_SUBDIT.',
        422,
      );
    }
    const supervisorAreaIds = supervisor.areaCoverages.map(
      (coverage) => coverage.areaId,
    );
    const covered = await input.client.administrativeAreaClosure.findMany({
      where: {
        ancestorId: { in: supervisorAreaIds },
        descendantId: { in: input.areaIds },
      },
      select: { descendantId: true },
    });
    const coveredIds = new Set(covered.map((item) => item.descendantId));
    if (input.areaIds.some((areaId) => !coveredIds.has(areaId))) {
      throw new ApiException(
        'AREA_OUTSIDE_SUPERVISOR_COVERAGE',
        'One or more selected areas are outside the supervisor position coverage.',
        422,
      );
    }
  }

  private async resolveAnchorProvinceIds(
    client: Prisma.TransactionClient | PrismaService,
    organizationUnitId: string,
  ) {
    const unitIds = await client.organizationUnitClosure.findMany({
      where: { descendantId: organizationUnitId },
      select: { ancestorId: true },
    });
    const scopedUnitIds = [
      ...new Set([
        organizationUnitId,
        ...unitIds.map((item) => item.ancestorId),
      ]),
    ];
    const [bindaProfiles, directorateCoverages, organizationCoverages] =
      await Promise.all([
        client.bindaProfile.findMany({
          where: { organizationUnitId: { in: scopedUnitIds } },
          select: { provinceAreaId: true },
        }),
        client.directorateCoverage.findMany({
          where: { directorateUnitId: { in: scopedUnitIds } },
          select: { provinceAreaId: true },
        }),
        client.organizationAreaCoverage.findMany({
          where: {
            organizationUnitId: { in: scopedUnitIds },
            validUntil: null,
            area: {
              level: AdministrativeLevel.PROVINCE,
              isActive: true,
              deletedAt: null,
            },
          },
          select: { areaId: true },
        }),
      ]);
    return [
      ...new Set([
        ...bindaProfiles.map((item) => item.provinceAreaId),
        ...directorateCoverages.map((item) => item.provinceAreaId),
        ...organizationCoverages.map((item) => item.areaId),
      ]),
    ];
  }

  private async ensureSeatForPosition(
    client: Prisma.TransactionClient | PrismaService,
    position: {
      id: string;
      roleId: string;
      branch: CommandRouteType | null;
      organizationUnitId: string;
    },
  ) {
    const existing = await client.organizationRoleSeat.findFirst({
      where: { positionId: position.id },
      select: { id: true },
    });
    if (existing) {
      return client.organizationRoleSeat.update({
        where: { id: existing.id },
        data: {
          roleId: position.roleId,
          branch: position.branch,
          organizationUnitId: position.organizationUnitId,
          isActive: true,
        },
      });
    }
    return client.organizationRoleSeat.create({
      data: {
        roleId: position.roleId,
        branch: position.branch,
        organizationUnitId: position.organizationUnitId,
        positionId: position.id,
        isActive: true,
      },
    });
  }

  private async assertPositionAvailable(positionId: string) {
    const active = await this.prisma.userSeatAssignment.findFirst({
      where: { positionId, isActive: true, validUntil: null },
      select: { id: true },
    });
    if (active) {
      throw new ApiException(
        'POSITION_ALREADY_OCCUPIED',
        'Target position already has an active assignment.',
        409,
      );
    }
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
