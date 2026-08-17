import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  ArchiveUserDto,
  AssignmentHistoryQueryDto,
  ChangePrimaryAssignmentDto,
  LockUserDto,
  ProvisionUserDto,
  ReasonDto,
  ResetUserPasswordDto,
  SuspendUserDto,
  UpdateDkiSupervisionScopeDto,
  UpdateUserProfileDto,
  UserProfileListQueryDto,
} from './dto/user-profile.dto.js';
import { UserProfileService } from './user-profile.service.js';

@ApiTags('02. User Provisioning & Access Administration')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('user-profiles')
export class UserProfileController {
  constructor(private readonly users: UserProfileService) {}

  @Get()
  @ApiContract({
    operationId: 'apiUsr001',
    contractId: 'API-USR-001',
    summary: 'Daftar user profile',
    roles: ['admin_system'],
  })
  async list(@Query() query: UserProfileListQueryDto) {
    const result = await this.users.list(query);
    return apiResult(result.items, undefined, {
      pagination: result.pagination,
      facets: result.facets,
    });
  }

  @Post('provision')
  @ApiContract({
    operationId: 'apiUsr002',
    contractId: 'API-USR-002',
    summary: 'Provision akun, profile, role, dan cakupan wilayah',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async provision(
    @Body() input: ProvisionUserDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.users.provision(input, actor),
      'User was provisioned.',
    );
  }

  @Get('dki-supervision')
  @ApiContract({
    operationId: 'apiUsrDkiSupervision001',
    contractId: 'API-USR-DKI-SUPERVISION-001',
    summary: 'Daftar mapping supervisi DKI Direktorat/Ditwil',
    roles: ['admin_system'],
  })
  async dkiSupervisionMappings() {
    return apiResult(await this.users.dkiSupervisionMappings());
  }

  @Get(':userProfileId')
  @ApiContract({
    operationId: 'apiUsr003',
    contractId: 'API-USR-003',
    summary: 'Detail user profile',
    roles: ['admin_system'],
  })
  async detail(@Param('userProfileId', ParseUUIDPipe) id: string) {
    return apiResult(await this.users.detail(id));
  }

  @Patch(':userProfileId')
  @ApiContract({
    operationId: 'apiUsr004',
    contractId: 'API-USR-004',
    summary: 'Ubah metadata profile',
    roles: ['admin_system'],
  })
  async update(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: UpdateUserProfileDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.users.update(id, input, actor));
  }

  @Post(':userProfileId/reset-password')
  @ApiContract({
    operationId: 'apiUsr004ResetPassword',
    contractId: 'API-USR-004-RESET-PASSWORD',
    summary: 'Reset password akun pengguna',
    roles: ['admin_system'],
    idempotent: true,
  })
  async resetPassword(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: ResetUserPasswordDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.users.resetPassword(id, input, actor),
      'User password was reset.',
    );
  }

  @Post(':userProfileId/activate')
  @ApiContract({
    operationId: 'apiUsr005',
    contractId: 'API-USR-005',
    summary: 'Aktifkan profile setelah provisioning',
    roles: ['admin_system'],
    idempotent: true,
  })
  async activate(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: ReasonDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.users.activate(id, input.reason, actor));
  }

  @Post(':userProfileId/suspend')
  @ApiContract({
    operationId: 'apiUsr006',
    contractId: 'API-USR-006',
    summary: 'Suspend akses operasional',
    roles: ['admin_system'],
    idempotent: true,
  })
  async suspend(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: SuspendUserDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.users.suspend(id, input, actor));
  }

  @Post(':userProfileId/archive')
  @ApiContract({
    operationId: 'apiUsr007',
    contractId: 'API-USR-007',
    summary: 'Arsipkan personel',
    roles: ['admin_system'],
    idempotent: true,
  })
  async archive(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: ArchiveUserDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.users.archive(id, input, actor));
  }

  @Post(':userProfileId/lock')
  @ApiContract({
    operationId: 'apiUsr008',
    contractId: 'API-USR-008',
    summary: 'Operational security lock',
    roles: ['admin_system'],
    idempotent: true,
  })
  async lock(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: LockUserDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.users.lock(id, input, actor));
  }

  @Post(':userProfileId/unlock')
  @ApiContract({
    operationId: 'apiUsr009',
    contractId: 'API-USR-009',
    summary: 'Lepas operational lock',
    roles: ['admin_system'],
    idempotent: true,
  })
  async unlock(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: ReasonDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.users.unlock(id, input.reason, actor));
  }

  @Post(':userProfileId/change-primary-assignment')
  @ApiContract({
    operationId: 'apiUsr010',
    contractId: 'API-USR-010',
    summary: 'Mutasi assignment utama',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async transfer(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: ChangePrimaryAssignmentDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.users.changePrimaryAssignment(id, input, actor),
    );
  }

  @Post(':userProfileId/dki-supervision-scope')
  @ApiContract({
    operationId: 'apiUsrDkiSupervision002',
    contractId: 'API-USR-DKI-SUPERVISION-002',
    summary: 'Ubah cakupan supervisi DKI Direktorat/Ditwil',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async updateDkiSupervisionScope(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Body() input: UpdateDkiSupervisionScopeDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.users.updateDkiSupervisionScope(id, input, actor),
    );
  }

  @Get(':userProfileId/assignments')
  @ApiContract({
    operationId: 'apiUsr011',
    contractId: 'API-USR-011',
    summary: 'Riwayat assignment pengguna',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async assignments(
    @Param('userProfileId', ParseUUIDPipe) id: string,
    @Query() query: AssignmentHistoryQueryDto,
  ) {
    return apiResult(await this.users.assignments(id, query.activeOnly));
  }
}
