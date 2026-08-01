import { OrganizationType, PositionCode } from '../../common/constants/legacy-operational-code.js';
import {
  ForbiddenException,
  Injectable } from '@nestjs/common';
import {
  CommandRouteType,
  RoleCode,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type ValidatedPositionInput = {
  code: PositionCode;
  organizationUnitId: string;
  reportsTo: {
    code: PositionCode;
  } | null;
};

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveCommandBranch(
    organizationUnitId: string,
  ): Promise<CommandRouteType | null> {
    const ancestorLinks = await this.prisma.organizationUnitClosure.findMany({
      where: {
        descendantId: organizationUnitId,
      },
      select: {
        ancestor: {
          select: {
            type: true,
          },
        },
      },
    });

    const types = new Set(ancestorLinks.map((link) => link.ancestor.type));

    if (
      types.has(OrganizationType.BINDA) ||
      types.has(OrganizationType.BAGOPS)
    ) {
      return CommandRouteType.BINDA;
    }

    if (
      types.has(OrganizationType.DIRECTORATE) ||
      types.has(OrganizationType.SUBDIRECTORATE)
    ) {
      return CommandRouteType.DIRECTORATE;
    }

    if (types.has(OrganizationType.DEPUTI)) {
      return CommandRouteType.PUSAT;
    }

    return this.resolveCommandBranchFromParentChain(organizationUnitId);
  }

  async validateCommandRouteForPosition(
    position: ValidatedPositionInput,
  ): Promise<CommandRouteType | null> {
    const routeType = await this.resolveCommandBranch(
      position.organizationUnitId,
    );

    if (
      position.code !== RoleCode.FIELD_COORDINATOR &&
      position.code !== PositionCode.STAF_SUBDIT
    ) {
      return routeType;
    }

    if (!routeType || routeType === CommandRouteType.PUSAT) {
      throw new ForbiddenException(
        'FIELD_COORDINATOR position is missing a resolvable command route.',
      );
    }

    if (!position.reportsTo) {
      throw new ForbiddenException(
        'KORWIL position must define its supervisor in the reporting line.',
      );
    }

    if (
      routeType === CommandRouteType.DIRECTORATE &&
      (position.code !== PositionCode.STAF_SUBDIT ||
        position.reportsTo.code !== RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER)
    ) {
      throw new ForbiddenException(
        'Field Coordinator on the Directorate route must use STAF_SUBDIT and report to KASUBDIT.',
      );
    }

    if (
      routeType === CommandRouteType.BINDA &&
      (position.code !== RoleCode.FIELD_COORDINATOR ||
        position.reportsTo.code !== RoleCode.FIELD_COORDINATOR)
    ) {
      throw new ForbiddenException(
        'Field Coordinator on the Binda route must use KORWIL and report to KABAGOPS.',
      );
    }

    return routeType;
  }

  private async resolveCommandBranchFromParentChain(
    organizationUnitId: string,
  ): Promise<CommandRouteType | null> {
    let cursorId: string | null = organizationUnitId;
    let hopCount = 0;

    while (cursorId && hopCount < 20) {
      const organizationUnitRecord: {
        type: OrganizationType;
        parentId: string | null;
      } | null = await this.prisma.organizationUnit.findUnique({
        where: {
          id: cursorId,
        },
        select: {
          type: true,
          parentId: true,
        },
      });

      if (!organizationUnitRecord) {
        return null;
      }

      if (
        organizationUnitRecord.type === OrganizationType.BINDA ||
        organizationUnitRecord.type === OrganizationType.BAGOPS
      ) {
        return CommandRouteType.BINDA;
      }

      if (
        organizationUnitRecord.type === OrganizationType.DIRECTORATE ||
        organizationUnitRecord.type === OrganizationType.SUBDIRECTORATE
      ) {
        return CommandRouteType.DIRECTORATE;
      }

      if (organizationUnitRecord.type === OrganizationType.DEPUTI) {
        return CommandRouteType.PUSAT;
      }

      cursorId = organizationUnitRecord.parentId;
      hopCount += 1;
    }

    return null;
  }
}
