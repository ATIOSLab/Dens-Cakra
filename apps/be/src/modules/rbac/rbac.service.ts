import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AreaPolicyQueryDto,
  PermissionListQueryDto,
  RoleListQueryDto,
  UpdateAreaPolicyDto,
} from './dto/rbac.dto.js';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  roles(query: RoleListQueryDto) {
    return this.prisma.role.findMany({
      where: query.isActive === undefined ? {} : { isActive: query.isActive },
      orderBy: { code: 'asc' },
      include: { _count: { select: { permissions: true, positions: true } } },
    });
  }

  role(id: string) {
    return this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { positions: true } },
      },
    });
  }

  async replacePermissions(
    id: string,
    codes: string[],
    actor: AuthorizationContext,
  ) {
    const uniqueCodes = [...new Set(codes)];
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: uniqueCodes } },
    });
    if (permissions.length !== uniqueCodes.length) {
      throw new ApiException(
        'PERMISSION_UNKNOWN',
        'One or more permission codes are unknown.',
        422,
      );
    }
    const before = await this.prisma.rolePermission.findMany({
      where: { roleId: id },
      include: { permission: true },
    });
    await this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId: id } });
      if (permissions.length) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: id,
            permissionId: permission.id,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          actorUserProfileId: actor.userProfileId,
          actorAssignmentId: actor.primaryAssignmentId,
          action: 'ROLE.PERMISSIONS.REPLACE',
          entityType: 'Role',
          entityId: id,
          beforeData: before.map((item) => item.permission.code),
          afterData: uniqueCodes,
        },
      });
    });
    return this.role(id);
  }

  permissions(query: PermissionListQueryDto) {
    return this.prisma.permission.findMany({
      where: {
        ...(query.search
          ? {
              OR: [
                {
                  code: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
                {
                  name: {
                    contains: query.search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {}),
        ...(query.module ? { code: { startsWith: `${query.module}.` } } : {}),
      },
      orderBy: { code: 'asc' },
    });
  }

  policies(query: AreaPolicyQueryDto) {
    return this.prisma.positionAreaPolicy.findMany({
      where: {
        ...(query.positionCode ? { positionCode: query.positionCode } : {}),
        ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      },
      orderBy: [{ positionCode: 'asc' }, { administrativeLevel: 'asc' }],
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
    const before = await this.prisma.positionAreaPolicy.findUniqueOrThrow({
      where: { id },
    });
    const updated = await this.prisma.positionAreaPolicy.update({
      where: { id },
      data: input,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserProfileId: actor.userProfileId,
        actorAssignmentId: actor.primaryAssignmentId,
        action: 'AREA.POLICY.UPDATE',
        entityType: 'PositionAreaPolicy',
        entityId: id,
        beforeData: before,
        afterData: updated,
      },
    });
    return updated;
  }
}
