import { Injectable } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  AreaPolicyQueryDto,
  RoleListQueryDto,
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
      include: { _count: { select: { operationalAssignments: true } } },
    });
  }

  role(id: string) {
    return this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: {
        _count: { select: { operationalAssignments: true } },
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
}
