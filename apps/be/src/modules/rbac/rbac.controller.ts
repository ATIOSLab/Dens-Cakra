import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  AreaPolicyQueryDto,
  PermissionListQueryDto,
  ReplaceRolePermissionsDto,
  RoleListQueryDto,
  UpdateAreaPolicyDto,
} from './dto/rbac.dto.js';
import { RbacService } from './rbac.service.js';

@ApiTags('03. Roles, Permissions & Policies')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  @ApiContract({
    operationId: 'apiRbac001',
    contractId: 'API-RBAC-001',
    summary: 'Daftar role domain',
    permission: 'role.read',
  })
  async roles(@Query() query: RoleListQueryDto) {
    return apiResult(await this.rbac.roles(query));
  }

  @Get('roles/:roleId')
  @ApiContract({
    operationId: 'apiRbac002',
    contractId: 'API-RBAC-002',
    summary: 'Detail role dan permission',
    permission: 'role.read',
  })
  async role(@Param('roleId', ParseUUIDPipe) id: string) {
    return apiResult(await this.rbac.role(id));
  }

  @Put('roles/:roleId/permissions')
  @ApiContract({
    operationId: 'apiRbac003',
    contractId: 'API-RBAC-003',
    summary: 'Ganti permission role',
    permission: 'role.permission.manage',
    idempotent: true,
  })
  async replace(
    @Param('roleId', ParseUUIDPipe) id: string,
    @Body() body: ReplaceRolePermissionsDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.rbac.replacePermissions(id, body.permissionCodes, actor),
    );
  }

  @Get('permissions')
  @ApiContract({
    operationId: 'apiRbac004',
    contractId: 'API-RBAC-004',
    summary: 'Daftar permission catalog',
    permission: 'permission.read',
  })
  async permissions(@Query() query: PermissionListQueryDto) {
    return apiResult(await this.rbac.permissions(query));
  }

  @Get('position-area-policies')
  @ApiContract({
    operationId: 'apiRbac005',
    contractId: 'API-RBAC-005',
    summary: 'Daftar kebijakan level wilayah per posisi',
    permission: 'area.policy.read',
  })
  async policies(@Query() query: AreaPolicyQueryDto) {
    return apiResult(await this.rbac.policies(query));
  }

  @Put('position-area-policies/:policyId')
  @ApiContract({
    operationId: 'apiRbac006',
    contractId: 'API-RBAC-006',
    summary: 'Ubah policy area posisi',
    permission: 'area.policy.manage',
    idempotent: true,
  })
  async updatePolicy(
    @Param('policyId', ParseUUIDPipe) id: string,
    @Body() body: UpdateAreaPolicyDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.updatePolicy(id, body, actor));
  }
}
