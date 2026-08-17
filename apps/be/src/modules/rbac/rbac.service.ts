import { Injectable } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AreaPolicyQueryDto,
  OrganizationUnitUpsertDto,
  PermissionUpsertDto,
  PositionUpsertDto,
  RoleListQueryDto,
  SetRolePermissionsDto,
  SupervisionAssignmentUpsertDto,
  UpdateAreaPolicyDto,
} from './dto/rbac.dto.js';
import { ApiException } from '../../common/api/api-exception.js';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  roles(query: RoleListQueryDto) {
    return this.prisma.role.findMany({
      where: query.isActive === undefined ? {} : { isActive: query.isActive },
      orderBy: { code: 'asc' },
      include: {
        _count: { select: { operationalAssignments: true } },
        rolePermissions: { include: { permission: true } },
      },
    });
  }

  role(id: string) {
    return this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { operationalAssignments: true } },
        rolePermissions: { include: { permission: true } },
      },
    });
  }

  policies(query: AreaPolicyQueryDto) {
    return this.prisma.roleAreaPolicy.findMany({
      where: {
        ...(query.roleCode ? { roleCode: query.roleCode } : {}),
        ...(query.branch ? { branch: query.branch } : {}),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      },
      orderBy: [{ roleCode: 'asc' }, { administrativeLevel: 'asc' }],
    });
  }

  async updatePolicy(
    id: string,
    input: UpdateAreaPolicyDto,
    actor: AuthorizationContext,
  ) {
    if (
      input.maximumAreas !== undefined &&
      input.maximumAreas < input.minimumAreas
    ) {
      throw new ApiException(
        'AREA_POLICY_RANGE_INVALID',
        'maximumAreas must be greater than or equal to minimumAreas.',
        422,
      );
    }
    const before = await this.prisma.roleAreaPolicy.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.roleAreaPolicy.update({
      where: { id },
      data: input,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action: 'AREA.POLICY.UPDATE',
        entityType: 'RoleAreaPolicy',
        entityId: id,
        beforeData: before,
        afterData: updated,
      },
    });
    return updated;
  }

  // ---- PERMISSION ----
  permissions() {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: { _count: { select: { rolePermissions: true } } },
    });
  }

  async createPermission(
    input: PermissionUpsertDto,
    actor: AuthorizationContext,
  ) {
    const permission = await this.prisma.permission.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isSystem: input.isSystem ?? false,
      },
    });
    await this.writeAudit(
      actor,
      'PERMISSION.CREATE',
      'Permission',
      permission.id,
      null,
      permission,
    );
    return permission;
  }

  async updatePermission(
    id: string,
    input: PermissionUpsertDto,
    actor: AuthorizationContext,
  ) {
    const before = await this.prisma.permission.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.permission.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        ...(input.isSystem !== undefined ? { isSystem: input.isSystem } : {}),
      },
    });
    await this.writeAudit(
      actor,
      'PERMISSION.UPDATE',
      'Permission',
      id,
      before,
      updated,
    );
    return updated;
  }

  // ---- POSITION (JABATAN) ----
  positions() {
    return this.prisma.position.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      include: { role: true },
    });
  }

  async createPosition(input: PositionUpsertDto, actor: AuthorizationContext) {
    const position = await this.prisma.position.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        roleId: input.roleId,
        organizationLevel: input.organizationLevel,
        isSystem: input.isSystem ?? false,
      },
    });
    await this.writeAudit(
      actor,
      'POSITION.CREATE',
      'Position',
      position.id,
      null,
      position,
    );
    return position;
  }

  async updatePosition(
    id: string,
    input: PositionUpsertDto,
    actor: AuthorizationContext,
  ) {
    const before = await this.prisma.position.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.position.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        roleId: input.roleId,
        organizationLevel: input.organizationLevel,
        ...(input.isSystem !== undefined ? { isSystem: input.isSystem } : {}),
      },
    });
    await this.writeAudit(
      actor,
      'POSITION.UPDATE',
      'Position',
      id,
      before,
      updated,
    );
    return updated;
  }

  // ---- SUPERVISION ASSIGNMENT ----
  supervisionAssignments() {
    return this.prisma.supervisionAssignment.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        directorateAssignment: { include: { userProfile: true, role: true } },
        targetRegion: true,
      },
    });
  }

  async createSupervisionAssignment(
    input: SupervisionAssignmentUpsertDto,
    actor: AuthorizationContext,
  ) {
    const assignment = await this.prisma.supervisionAssignment.upsert({
      where: {
        directorateAssignmentId_targetRegionId: {
          directorateAssignmentId: input.directorateAssignmentId,
          targetRegionId: input.targetRegionId,
        },
      },
      update: {
        supervisionType: input.supervisionType,
        isActive: input.isActive ?? true,
      },
      create: {
        directorateAssignmentId: input.directorateAssignmentId,
        targetRegionId: input.targetRegionId,
        supervisionType: input.supervisionType,
        isActive: input.isActive ?? true,
      },
    });
    await this.writeAudit(
      actor,
      'SUPERVISION.ASSIGN',
      'SupervisionAssignment',
      assignment.id,
      null,
      assignment,
    );
    return assignment;
  }

  async updateSupervisionAssignment(
    id: string,
    input: SupervisionAssignmentUpsertDto,
    actor: AuthorizationContext,
  ) {
    const before = await this.prisma.supervisionAssignment.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.supervisionAssignment.update({
      where: { id },
      data: {
        supervisionType: input.supervisionType,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await this.writeAudit(
      actor,
      'SUPERVISION.UPDATE',
      'SupervisionAssignment',
      id,
      before,
      updated,
    );
    return updated;
  }

  async deleteSupervisionAssignment(id: string, actor: AuthorizationContext) {
    const before = await this.prisma.supervisionAssignment.findUniqueOrThrow({
      where: { id },
    });
    const deleted = await this.prisma.supervisionAssignment.update({
      where: { id },
      data: { isActive: false },
    });
    await this.writeAudit(
      actor,
      'SUPERVISION.DELETE',
      'SupervisionAssignment',
      id,
      before,
      deleted,
    );
    return deleted;
  }

  // ---- ORGANIZATION UNIT ----
  organizationUnits() {
    return this.prisma.organizationUnit.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
      include: { parent: true, _count: { select: { children: true } } },
    });
  }

  async createOrganizationUnit(
    input: OrganizationUnitUpsertDto,
    actor: AuthorizationContext,
  ) {
    const unit = await this.prisma.organizationUnit.create({
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        level: input.level,
        parentId: input.parentId,
      },
    });
    await this.writeAudit(
      actor,
      'ORGANIZATION_UNIT.CREATE',
      'OrganizationUnit',
      unit.id,
      null,
      unit,
    );
    return unit;
  }

  async updateOrganizationUnit(
    id: string,
    input: OrganizationUnitUpsertDto,
    actor: AuthorizationContext,
  ) {
    const before = await this.prisma.organizationUnit.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.organizationUnit.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        level: input.level,
        parentId: input.parentId,
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await this.writeAudit(
      actor,
      'ORGANIZATION_UNIT.UPDATE',
      'OrganizationUnit',
      id,
      before,
      updated,
    );
    return updated;
  }

  // ---- ROLE PERMISSION ----
  async setRolePermissions(
    roleId: string,
    input: SetRolePermissionsDto,
    actor: AuthorizationContext,
  ) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: input.permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });
    await this.writeAudit(actor, 'ROLE.PERMISSION.SET', 'Role', roleId, null, {
      permissionIds: input.permissionIds,
    });
    return this.role(roleId);
  }

  private writeAudit(
    actor: AuthorizationContext,
    action: string,
    entityType: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action,
        entityType,
        entityId,
        beforeData: before as object,
        afterData: after as object,
      },
    });
  }
}
