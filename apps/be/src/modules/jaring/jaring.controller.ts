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
  CreateJaringClusterDto,
  CreateReportCategoryDto,
  CoverageDto,
  CreateJaringDto,
  JaringClusterQuery,
  JaringQuery,
  ReportCategoryQuery,
  ReasonDto,
  TransferDto,
  UpdateJaringClusterDto,
  UpdateReportCategoryDto,
  UpdateJaringDto,
} from './jaring.dto.js';
import { JaringService } from './jaring.service.js';

@ApiTags('11. Jaring Management')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('jaring')
export class JaringController {
  constructor(private readonly jaringService: JaringService) {}

  @Get()
  @ApiContract({
    operationId: 'apiJar001',
    contractId: 'API-JAR-001',
    summary: 'Daftar Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async list(
    @Query() query: JaringQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.list(query, context));
  }

  @Post()
  @ApiContract({
    operationId: 'apiJar002',
    contractId: 'API-JAR-002',
    summary: 'Buat Jaring',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.create(body, context));
  }

  @Get('clusters')
  @ApiContract({
    operationId: 'apiJarCluster001',
    contractId: 'API-JAR-CLUSTER-001',
    summary: 'Daftar Cluster Jaring',
    roles: [
      'admin_system',
      'field_officer',
      'operational_intelligence_manager',
    ],
  })
  async listClusters(@Query() query: JaringClusterQuery) {
    return apiResult(await this.jaringService.listClusters(query));
  }

  @Post('clusters')
  @ApiContract({
    operationId: 'apiJarCluster002',
    contractId: 'API-JAR-CLUSTER-002',
    summary: 'Buat Cluster Jaring',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createCluster(
    @Body() body: CreateJaringClusterDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.createCluster(body, context));
  }

  @Patch('clusters/:clusterId')
  @ApiContract({
    operationId: 'apiJarCluster003',
    contractId: 'API-JAR-CLUSTER-003',
    summary: 'Ubah Cluster Jaring',
    roles: ['admin_system'],
  })
  async updateCluster(
    @Param('clusterId', ParseUUIDPipe) id: string,
    @Body() body: UpdateJaringClusterDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.updateCluster(id, body, context));
  }

  @Get('report-categories')
  @ApiContract({
    operationId: 'apiReportCategory001',
    contractId: 'API-REPORT-CATEGORY-001',
    summary: 'Daftar kategori laporan',
    roles: [
      'admin_system',
      'field_officer',
      'operational_intelligence_manager',
    ],
  })
  async listReportCategories(@Query() query: ReportCategoryQuery) {
    return apiResult(await this.jaringService.listReportCategories(query));
  }

  @Post('report-categories')
  @ApiContract({
    operationId: 'apiReportCategory002',
    contractId: 'API-REPORT-CATEGORY-002',
    summary: 'Buat kategori laporan',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createReportCategory(
    @Body() body: CreateReportCategoryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.createReportCategory(body, context),
    );
  }

  @Patch('report-categories/:categoryId')
  @ApiContract({
    operationId: 'apiReportCategory003',
    contractId: 'API-REPORT-CATEGORY-003',
    summary: 'Ubah kategori laporan',
    roles: ['admin_system'],
  })
  async updateReportCategory(
    @Param('categoryId', ParseUUIDPipe) id: string,
    @Body() body: UpdateReportCategoryDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.jaringService.updateReportCategory(id, body, context),
    );
  }

  @Get(':jaringId')
  @ApiContract({
    operationId: 'apiJar003',
    contractId: 'API-JAR-003',
    summary: 'Detail Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async get(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.get(id, context));
  }

  @Patch(':jaringId')
  @ApiContract({
    operationId: 'apiJar004',
    contractId: 'API-JAR-004',
    summary: 'Ubah Jaring',
    roles: ['field_officer'],
  })
  async update(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: UpdateJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.update(id, body, context));
  }

  @Post(':jaringId/activate')
  @ApiContract({
    operationId: 'apiJar005',
    contractId: 'API-JAR-005',
    summary: 'Aktifkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async activate(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.activate(id, body, context));
  }

  @Post(':jaringId/deactivate')
  @ApiContract({
    operationId: 'apiJar006',
    contractId: 'API-JAR-006',
    summary: 'Nonaktifkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async deactivate(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.deactivate(id, body, context));
  }

  @Post(':jaringId/delete')
  @ApiContract({
    operationId: 'apiJar007',
    contractId: 'API-JAR-007',
    summary: 'Soft delete Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async softDelete(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.softDelete(id, body, context));
  }

  @Get(':jaringId/caretakers')
  @ApiContract({
    operationId: 'apiJar008',
    contractId: 'API-JAR-008',
    summary: 'Riwayat caretaker',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async caretakers(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.caretakers(id, context));
  }

  @Post(':jaringId/caretaker-transfer')
  @ApiContract({
    operationId: 'apiJar009',
    contractId: 'API-JAR-009',
    summary: 'Transfer caretaker',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async transfer(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: TransferDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.transfer(id, body, context));
  }

  @Get(':jaringId/area-coverages')
  @ApiContract({
    operationId: 'apiJar010',
    contractId: 'API-JAR-010',
    summary: 'Coverage wilayah Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async coverages(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.coverages(id, context));
  }

  @Put(':jaringId/area-coverages')
  @ApiContract({
    operationId: 'apiJar011',
    contractId: 'API-JAR-011',
    summary: 'Ganti coverage wilayah Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async coverage(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: CoverageDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.coverage(id, body, context));
  }

  @Get(':jaringId/messages')
  @ApiContract({
    operationId: 'apiJar012',
    contractId: 'API-JAR-012',
    summary: 'Pesan Jaring',
    roles: ['field_officer'],
  })
  async messages(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.messages(id));
  }

  @Get(':jaringId/bakets')
  @ApiContract({
    operationId: 'apiJar013',
    contractId: 'API-JAR-013',
    summary: 'Baket Jaring',
    roles: [
      'executive',
      'regional_commander',
      'operational_intelligence_manager',
      'field_coordinator',
      'field_officer',
    ],
  })
  async bakets(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.bakets(id, context));
  }
}
