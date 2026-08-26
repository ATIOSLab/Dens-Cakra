import { Injectable } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  RoleListQueryDto,
  SetRolePermissionsDto,
} from './dto/rbac.dto.js';

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

  permissions() {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
      include: { _count: { select: { rolePermissions: true } } },
    });
  }

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
