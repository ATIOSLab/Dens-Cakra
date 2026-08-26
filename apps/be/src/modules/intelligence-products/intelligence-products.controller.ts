import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  ApprovalWorkflowQuery,
  CreateLocationPingDto,
  CreateProductDto,
  DashboardQuery,
  FieldIntelligenceDashboardQuery,
  MapAreaSummaryQuery,
  MapReportQuery,
  PersonnelLocationMapQuery,
  ProductQuery,
  ProductTemplateListQuery,
  ProductTypeQuery,
  SubmitProductDto,
} from './intelligence-products.dto.js';
import { IntelligenceProductsService } from './intelligence-products.service.js';

@ApiTags('16-22,25 Intelligence & Decision Support')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class IntelligenceProductsController {
  constructor(private readonly service: IntelligenceProductsService) {}

  @Get('product-types')
  @ApiContract({
    operationId: 'apiTpl001',
    contractId: 'API-TPL-001',
    summary: 'Daftar jenis produk intelijen',
    roles: ['admin_system', 'executive', 'regional_commander'],
  })
  async listProductTypes(@Query() query: ProductTypeQuery) {
    return apiResult(await this.service.listProductTypes(query));
  }

  @Get('product-types/:productTypeId/templates')
  @ApiContract({
    operationId: 'apiTpl004',
    contractId: 'API-TPL-004',
    summary: 'Daftar versi template',
    roles: ['admin_system', 'executive', 'regional_commander'],
  })
  async listTemplates(
    @Param('productTypeId', ParseUUIDPipe) productTypeId: string,
    @Query() query: ProductTemplateListQuery,
  ) {
    return apiResult(await this.service.listTemplates(productTypeId, query));
  }

  @Get('products')
  @ApiContract({
    operationId: 'apiPrd001',
    contractId: 'API-PRD-001',
    summary: 'Daftar produk intelijen',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async listProducts(
    @Query() query: ProductQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    const result = await this.service.listProducts(query, context);
    return apiResult(result.items, undefined, {
      pagination: result.pagination,
    });
  }

  @Post('products')
  @ApiContract({
    operationId: 'apiPrd002',
    contractId: 'API-PRD-002',
    summary: 'Buat produk dan versi awal',
    roles: ['executive', 'regional_commander'],
    successStatus: 201,
    idempotent: true,
  })
  async createProduct(
    @Body() body: CreateProductDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.createProduct(body, context));
  }

  @Get('products/:productId')
  @ApiContract({
    operationId: 'apiPrd003',
    contractId: 'API-PRD-003',
    summary: 'Detail produk current version',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async getProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() query: ApprovalWorkflowQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.getProduct(productId, query.include, context),
    );
  }

  @Get('product-versions/:versionId')
  @ApiContract({
    operationId: 'apiPrd006',
    contractId: 'API-PRD-006',
    summary: 'Detail versi produk',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async getProductVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.getProductVersion(versionId, context));
  }

  @Post('products/:productId/submit')
  @ApiContract({
    operationId: 'apiPrd012',
    contractId: 'API-PRD-012',
    summary: 'Submit ke approval regional',
    roles: ['executive', 'regional_commander'],
    idempotent: true,
  })
  async submitProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: SubmitProductDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.submitProduct(productId, body, context),
    );
  }

  @Get('approval-workflows/:workflowId')
  @ApiContract({
    operationId: 'apiApr003',
    contractId: 'API-APR-003',
    summary: 'Detail workflow approval',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async getWorkflow(
    @Param('workflowId', ParseUUIDPipe) workflowId: string,
    @Query() query: ApprovalWorkflowQuery,
  ) {
    return apiResult(
      await this.service.getApprovalWorkflow(workflowId, query.include),
    );
  }

  @Get('dashboard/field-intelligence')
  @ApiContract({
    operationId: 'apiDashFieldIntelligence001',
    contractId: 'API-DASH-FIELD-INTELLIGENCE-001',
    summary: 'Panel komando BAKET dan aktivitas Jaring sesuai scope role',
    roles: ['executive', 'regional_commander', 'field_coordinator'],
  })
  async dashboardFieldIntelligence(
    @Query() query: FieldIntelligenceDashboardQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.dashboardFieldIntelligence(query, context),
      undefined,
      {
        availableActions: [
          'dashboard.refresh',
          'dashboard.filter-jaring',
          'dashboard.open-jaring-profile',
        ],
        appliedScope: query,
      },
    );
  }

  @Get('dashboard/kpi-engine')
  @ApiContract({
    operationId: 'apiDashKpiEngine001',
    contractId: 'API-DASH-KPI-ENGINE-001',
    summary: 'KPI kualitas HUMINT berjenjang dalam scope komando',
    roles: ['executive', 'regional_commander'],
  })
  async dashboardKpiEngine(
    @Query() query: DashboardQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.dashboardKpiEngine(query, context));
  }

  @Get('dashboard/briefing')
  @ApiContract({
    operationId: 'apiDash009',
    contractId: 'API-DASH-009',
    summary: 'Briefing dashboard lintas modul',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async dashboardBriefing(
    @Query() query: DashboardQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.dashboardBriefing(query, context),
      undefined,
      {
        availableActions: ['dashboard.refresh', 'dashboard.open-detail'],
        appliedScope: query,
      },
    );
  }

  @Get('map/reports')
  @ApiContract({
    operationId: 'apiMap001',
    contractId: 'API-MAP-001',
    summary: 'Marker laporan pada viewport',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async mapReports(
    @Query() query: MapReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.mapReports(query, context));
  }

  @Get('map/boundaries')
  @ApiContract({
    operationId: 'apiMap008',
    contractId: 'API-MAP-008',
    summary: 'Boundary aktif sesuai zoom dan scope',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async mapBoundaries(
    @Query() query: MapReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.mapBoundaries(query, context));
  }

  @Get('map/clusters')
  @ApiContract({
    operationId: 'apiMap002',
    contractId: 'API-MAP-002',
    summary: 'Cluster laporan',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async mapClusters(
    @Query() query: MapReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.mapClusters(query, context));
  }

  @Get('map/area-summary')
  @ApiContract({
    operationId: 'apiMap004',
    contractId: 'API-MAP-004',
    summary: 'Summary area terpilih',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async mapAreaSummary(
    @Query() query: MapAreaSummaryQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.mapAreaSummary(query, context));
  }

  @Get('map/alerts')
  @ApiContract({
    operationId: 'apiMap006',
    contractId: 'API-MAP-006',
    summary: 'Marker alert pada viewport',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async mapAlerts(
    @Query() query: MapReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.mapAlerts(query, context), undefined, {
      availableActions: ['alert.open', 'alert.acknowledge', 'alert.assign'],
      appliedScope: query,
    });
  }

  @Get('map/emergencies')
  @ApiContract({
    operationId: 'apiMap007',
    contractId: 'API-MAP-007',
    summary: 'Marker insiden darurat pada viewport',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async mapEmergencies(
    @Query() query: MapReportQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.mapEmergencies(query, context),
      undefined,
      {
        availableActions: [
          'emergency.open',
          'emergency.verify',
          'emergency.start-response',
        ],
        appliedScope: query,
      },
    );
  }

  @Post('personnel-location-pings')
  @ApiContract({
    operationId: 'apiLoc001',
    contractId: 'API-LOC-001',
    summary: 'Kirim ping lokasi personel',
    roles: ['field_coordinator', 'field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async createLocationPing(
    @Body() body: CreateLocationPingDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.createLocationPing(body, context));
  }

  @Get('personnel-location-pings/me/latest')
  @ApiContract({
    operationId: 'apiLoc002',
    contractId: 'API-LOC-002',
    summary: 'Lokasi terbaru diri sendiri',
    roles: ['field_coordinator', 'field_officer'],
  })
  async myLatestLocation(
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.myLatestLocation(context));
  }

  @Get('personnel-location-pings/:assignmentId/latest')
  @ApiContract({
    operationId: 'apiLoc003',
    contractId: 'API-LOC-003',
    summary: 'Lokasi terbaru bawahan',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async latestLocation(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.latestLocation(assignmentId, context));
  }

  @Get('personnel-location-map')
  @ApiContract({
    operationId: 'apiLoc005',
    contractId: 'API-LOC-005',
    summary: 'Peta lokasi personel terbaru',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async locationMap(
    @Query() query: PersonnelLocationMapQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.personnelLocationMap(query, context));
  }
}
