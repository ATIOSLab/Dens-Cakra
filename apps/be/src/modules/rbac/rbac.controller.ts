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
import { RoleListQueryDto, SetRolePermissionsDto } from './dto/rbac.dto.js';
import { RbacService } from './rbac.service.js';

@ApiTags('03. Roles, Permissions & Policies')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('roles')
  @ApiContract({
    operationId: 'apiRbac001',
    contractId: 'API-RBAC-001',
    summary: 'Daftar role domain',
    roles: ['admin_system'],
  })
  async roles(@Query() query: RoleListQueryDto) {
    return apiResult(await this.rbac.roles(query));
  }

  @Put('roles/:roleId/permissions')
  @ApiContract({
    operationId: 'apiRbac002b',
    contractId: 'API-RBAC-002B',
    summary: 'Atur permission role',
    roles: ['admin_system'],
    idempotent: true,
  })
  async setRolePermissions(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() body: SetRolePermissionsDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.setRolePermissions(roleId, body, actor));
  }

  @Get('permissions')
  @ApiContract({
    operationId: 'apiRbac010',
    contractId: 'API-RBAC-010',
    summary: 'Daftar permission',
    roles: ['admin_system'],
  })
  async permissions() {
    return apiResult(await this.rbac.permissions());
  }
}
