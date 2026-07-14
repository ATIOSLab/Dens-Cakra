import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  CreateBindaMasterDto,
  CreateDirectorateMasterDto,
  CreateOrganizationUnitDto,
  MoveOrganizationUnitDto,
  RegionalMasterQueryDto,
  OrganizationHierarchyQueryDto,
  OrganizationListQueryDto,
  OrganizationTreeQueryDto,
  ReplaceOrganizationCoverageDto,
  UpdateOrganizationUnitDto,
} from './dto/organization.dto.js';
import { OrganizationManagementService } from './organization-management.service.js';

@ApiTags('04. Organization Structure')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('organization-units')
export class OrganizationController {
  constructor(private readonly organizations: OrganizationManagementService) {}

  @Get()
  @ApiContract({
    operationId: 'apiOrg001',
    contractId: 'API-ORG-001',
    summary: 'Daftar unit organisasi',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async list(
    @Query() query: OrganizationListQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    const result = await this.organizations.list(query, context);
    return apiResult(result.items, undefined, {
      pagination: result.pagination,
    });
  }

  @Post()
  @ApiContract({
    operationId: 'apiOrg002',
    contractId: 'API-ORG-002',
    summary: 'Buat unit organisasi',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateOrganizationUnitDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.organizations.create(body, actor));
  }

  @Get('regional-masters')
  @ApiContract({
    operationId: 'apiOrg011',
    contractId: 'API-ORG-011',
    summary: 'Ringkasan master wilayah Binda dan Direktorat',
    roles: ['admin_system', 'executive'],
  })
  async regionalMasters(
    @Query() query: RegionalMasterQueryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.organizations.listRegionalMasters(query, context),
    );
  }

  @Post('regional-masters/binda')
  @ApiContract({
    operationId: 'apiOrg012',
    contractId: 'API-ORG-012',
    summary: 'Daftarkan Binda per provinsi',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createBindaMaster(
    @Body() body: CreateBindaMasterDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.organizations.createRegionalBinda(body, actor));
  }

  @Post('regional-masters/directorates')
  @ApiContract({
    operationId: 'apiOrg013',
    contractId: 'API-ORG-013',
    summary: 'Daftarkan Direktorat wilayah multi provinsi',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createDirectorateMaster(
    @Body() body: CreateDirectorateMasterDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.organizations.createRegionalDirectorate(body, actor),
    );
  }

  @Get(':unitId')
  @ApiContract({
    operationId: 'apiOrg003',
    contractId: 'API-ORG-003',
    summary: 'Detail unit',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async detail(@Param('unitId', ParseUUIDPipe) id: string) {
    return apiResult(await this.organizations.detail(id));
  }

  @Patch(':unitId')
  @ApiContract({
    operationId: 'apiOrg004',
    contractId: 'API-ORG-004',
    summary: 'Ubah metadata unit',
    roles: ['admin_system'],
  })
  async update(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Body() body: UpdateOrganizationUnitDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(await this.organizations.update(id, body, actor));
  }

  @Post(':unitId/move')
  @ApiContract({
    operationId: 'apiOrg005',
    contractId: 'API-ORG-005',
    summary: 'Pindahkan unit dalam hierarchy',
    roles: ['admin_system'],
    idempotent: true,
  })
  async move(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Body() body: MoveOrganizationUnitDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.organizations.move(id, body.newParentId, body.reason, actor),
    );
  }

  @Get(':unitId/ancestors')
  @ApiContract({
    operationId: 'apiOrg006',
    contractId: 'API-ORG-006',
    summary: 'Ambil rantai atasan unit',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async ancestors(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Query() query: OrganizationHierarchyQueryDto,
  ) {
    return apiResult(
      await this.organizations.hierarchy(id, 'ancestors', query),
    );
  }

  @Get(':unitId/descendants')
  @ApiContract({
    operationId: 'apiOrg007',
    contractId: 'API-ORG-007',
    summary: 'Ambil unit turunan',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async descendants(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Query() query: OrganizationHierarchyQueryDto,
  ) {
    return apiResult(
      await this.organizations.hierarchy(id, 'descendants', query),
    );
  }

  @Get(':unitId/tree')
  @ApiContract({
    operationId: 'apiOrg008',
    contractId: 'API-ORG-008',
    summary: 'Ambil subtree organisasi',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
    ],
  })
  async tree(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Query() query: OrganizationTreeQueryDto,
  ) {
    return apiResult(await this.organizations.tree(id, query));
  }

  @Get(':unitId/area-coverages')
  @ApiContract({
    operationId: 'apiOrg009',
    contractId: 'API-ORG-009',
    summary: 'Coverage wilayah unit',
    roles: ['admin_system'],
  })
  async coverages(@Param('unitId', ParseUUIDPipe) id: string) {
    return apiResult(await this.organizations.coverages(id, true));
  }

  @Put(':unitId/area-coverages')
  @ApiContract({
    operationId: 'apiOrg010',
    contractId: 'API-ORG-010',
    summary: 'Ganti coverage wilayah unit',
    roles: ['admin_system'],
    idempotent: true,
  })
  async replaceCoverages(
    @Param('unitId', ParseUUIDPipe) id: string,
    @Body() body: ReplaceOrganizationCoverageDto,
    @CurrentAccessContext() actor: AuthorizationContext,
  ) {
    return apiResult(
      await this.organizations.replaceCoverages(id, body, actor),
    );
  }
}
