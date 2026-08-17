import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
  OrganizationUnitUpsertDto,
  PermissionUpsertDto,
  PositionUpsertDto,
  RoleListQueryDto,
  SetRolePermissionsDto,
  SupervisionAssignmentUpsertDto,
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
    roles: ['admin_system'],
  })
  async roles(@Query() query: RoleListQueryDto) {
    return apiResult(await this.rbac.roles(query));
  }

  @Get('roles/:roleId')
  @ApiContract({
    operationId: 'apiRbac002',
    contractId: 'API-RBAC-002',
    summary: 'Detail role domain',
    roles: ['admin_system'],
  })
  async role(@Param('roleId', ParseUUIDPipe) id: string) {
    return apiResult(await this.rbac.role(id));
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

  @Get('position-area-policies')
  @ApiContract({
    operationId: 'apiRbac003',
    contractId: 'API-RBAC-003',
    summary: 'Daftar kebijakan level wilayah per posisi',
    roles: ['admin_system'],
  })
  async policies(@Query() query: AreaPolicyQueryDto) {
    return apiResult(await this.rbac.policies(query));
  }

  @Put('position-area-policies/:policyId')
  @ApiContract({
    operationId: 'apiRbac004',
    contractId: 'API-RBAC-004',
    summary: 'Ubah policy area posisi',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updatePolicy(
    @Param('policyId', ParseUUIDPipe) id: string,
    @Body() body: UpdateAreaPolicyDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.updatePolicy(id, body, actor));
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

  @Post('permissions')
  @ApiContract({
    operationId: 'apiRbac011',
    contractId: 'API-RBAC-011',
    summary: 'Buat permission',
    roles: ['admin_system'],
  })
  async createPermission(
    @Body() body: PermissionUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.createPermission(body, actor));
  }

  @Put('permissions/:permissionId')
  @ApiContract({
    operationId: 'apiRbac012',
    contractId: 'API-RBAC-012',
    summary: 'Ubah permission',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updatePermission(
    @Param('permissionId', ParseUUIDPipe) id: string,
    @Body() body: PermissionUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.updatePermission(id, body, actor));
  }

  @Get('positions')
  @ApiContract({
    operationId: 'apiRbac020',
    contractId: 'API-RBAC-020',
    summary: 'Daftar jabatan',
    roles: ['admin_system'],
  })
  async positions() {
    return apiResult(await this.rbac.positions());
  }

  @Post('positions')
  @ApiContract({
    operationId: 'apiRbac021',
    contractId: 'API-RBAC-021',
    summary: 'Buat jabatan',
    roles: ['admin_system'],
  })
  async createPosition(
    @Body() body: PositionUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.createPosition(body, actor));
  }

  @Put('positions/:positionId')
  @ApiContract({
    operationId: 'apiRbac022',
    contractId: 'API-RBAC-022',
    summary: 'Ubah jabatan',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updatePosition(
    @Param('positionId', ParseUUIDPipe) id: string,
    @Body() body: PositionUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.updatePosition(id, body, actor));
  }

  @Get('supervision-assignments')
  @ApiContract({
    operationId: 'apiRbac030',
    contractId: 'API-RBAC-030',
    summary: 'Daftar assignment supervisi Direktorat',
    roles: ['admin_system'],
  })
  async supervisionAssignments() {
    return apiResult(await this.rbac.supervisionAssignments());
  }

  @Post('supervision-assignments')
  @ApiContract({
    operationId: 'apiRbac031',
    contractId: 'API-RBAC-031',
    summary: 'Buat/ubah assignment supervisi',
    roles: ['admin_system'],
    idempotent: true,
  })
  async createSupervisionAssignment(
    @Body() body: SupervisionAssignmentUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.createSupervisionAssignment(body, actor));
  }

  @Put('supervision-assignments/:assignmentId')
  @ApiContract({
    operationId: 'apiRbac032',
    contractId: 'API-RBAC-032',
    summary: 'Ubah assignment supervisi',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updateSupervisionAssignment(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() body: SupervisionAssignmentUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.updateSupervisionAssignment(id, body, actor));
  }

  @Delete('supervision-assignments/:assignmentId')
  @ApiContract({
    operationId: 'apiRbac033',
    contractId: 'API-RBAC-033',
    summary: 'Nonaktifkan assignment supervisi',
    roles: ['admin_system'],
    idempotent: true,
  })
  async deleteSupervisionAssignment(
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.deleteSupervisionAssignment(id, actor));
  }

  @Get('organization-units')
  @ApiContract({
    operationId: 'apiRbac040',
    contractId: 'API-RBAC-040',
    summary: 'Daftar unit organisasi',
    roles: ['admin_system'],
  })
  async organizationUnits() {
    return apiResult(await this.rbac.organizationUnits());
  }

  @Post('organization-units')
  @ApiContract({
    operationId: 'apiRbac041',
    contractId: 'API-RBAC-041',
    summary: 'Buat unit organisasi',
    roles: ['admin_system'],
  })
  async createOrganizationUnit(
    @Body() body: OrganizationUnitUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.createOrganizationUnit(body, actor));
  }

  @Put('organization-units/:unitId')
  @ApiContract({
    operationId: 'apiRbac042',
    contractId: 'API-RBAC-042',
    summary: 'Ubah unit organisasi',
    roles: ['admin_system'],
    idempotent: true,
  })
  async updateOrganizationUnit(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Body() body: OrganizationUnitUpsertDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.rbac.updateOrganizationUnit(id, body, actor));
  }
}
