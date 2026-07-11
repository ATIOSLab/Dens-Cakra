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
  ActivateTemplateDto,
  ApprovalInboxQuery,
  ApprovalWorkflowQuery,
  ArchiveProductDto,
  AlertQuery,
  AlertSummaryQuery,
  AssignAlertDto,
  CancelAlertDto,
  CancelEmergencyIncidentDto,
  CancelWorkflowDto,
  ClarificationDto,
  CreateAlertDto,
  CreateApprovalWorkflowDto,
  CreateDistributionDto,
  CreateEmergencyIncidentDto,
  CreateLocationPingDto,
  CreateProductDto,
  CreateProductRevisionDto,
  CreateProductTemplateDto,
  CreateProductTypeDto,
  DashboardAreaBreakdownQuery,
  DashboardDirectiveProgressQuery,
  DashboardQuery,
  DashboardTaskPerformanceQuery,
  DashboardTrendQuery,
  DashboardVerificationQualityQuery,
  DecisionNoteDto,
  DistributionQuery,
  LocationHistoryQuery,
  MapAreaSummaryQuery,
  MapHeatmapQuery,
  MapReportQuery,
  MarkControlledDto,
  MarkDeliveredDto,
  PersonnelLocationMapQuery,
  ProductQuery,
  ProductTemplateListQuery,
  ProductTypeQuery,
  ProductVersionListQuery,
  RequestRevisionDto,
  RejectApprovalDto,
  ReplaceProductAttachmentsDto,
  ReplaceSourceAnalysesDto,
  ReplaceSourceVerificationsDto,
  ResolveAlertDto,
  ResolveEmergencyIncidentDto,
  RetryDistributionDto,
  RevokeDistributionDto,
  StartResponseDto,
  SubmitProductDto,
  UpdateAlertDto,
  UpdateEmergencyIncidentDto,
  UpdateProductTypeDto,
  UpdateProductVersionDto,
  ValidateTemplateContentDto,
  VerifyEmergencyIncidentDto,
  EmergencyQuery,
} from './intelligence-products.dto.js';
import { IntelligenceProductsService } from './intelligence-products.service.js';

@ApiTags('16-22,25 Intelligence & Decision Support')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class IntelligenceProductsController {
  constructor(private readonly service: IntelligenceProductsService) {}

  @Get('product-types')
  @ApiContract({ operationId: 'apiTpl001', contractId: 'API-TPL-001', summary: 'Daftar jenis produk intelijen', permission: 'product.template.read' })
  async listProductTypes(@Query() query: ProductTypeQuery) {
    return apiResult(await this.service.listProductTypes(query));
  }

  @Post('product-types')
  @ApiContract({ operationId: 'apiTpl002', contractId: 'API-TPL-002', summary: 'Buat jenis produk', permission: 'product.template.manage', successStatus: 201, idempotent: true })
  async createProductType(@Body() body: CreateProductTypeDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createProductType(body, context));
  }

  @Patch('product-types/:productTypeId')
  @ApiContract({ operationId: 'apiTpl003', contractId: 'API-TPL-003', summary: 'Ubah metadata jenis produk', permission: 'product.template.manage' })
  async updateProductType(@Param('productTypeId', ParseUUIDPipe) productTypeId: string, @Body() body: UpdateProductTypeDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.updateProductType(productTypeId, body, context));
  }

  @Get('product-types/:productTypeId/templates')
  @ApiContract({ operationId: 'apiTpl004', contractId: 'API-TPL-004', summary: 'Daftar versi template', permission: 'product.template.read' })
  async listTemplates(@Param('productTypeId', ParseUUIDPipe) productTypeId: string, @Query() query: ProductTemplateListQuery) {
    return apiResult(await this.service.listTemplates(productTypeId, query));
  }

  @Post('product-types/:productTypeId/templates')
  @ApiContract({ operationId: 'apiTpl005', contractId: 'API-TPL-005', summary: 'Buat template version', permission: 'product.template.manage', successStatus: 201, idempotent: true })
  async createTemplate(@Param('productTypeId', ParseUUIDPipe) productTypeId: string, @Body() body: CreateProductTemplateDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createTemplate(productTypeId, body, context));
  }

  @Get('product-templates/:templateId')
  @ApiContract({ operationId: 'apiTpl006', contractId: 'API-TPL-006', summary: 'Detail template', permission: 'product.template.read' })
  async getTemplate(@Param('templateId', ParseUUIDPipe) templateId: string) {
    return apiResult(await this.service.getTemplate(templateId));
  }

  @Post('product-templates/:templateId/activate')
  @ApiContract({ operationId: 'apiTpl007', contractId: 'API-TPL-007', summary: 'Aktifkan template', permission: 'product.template.manage', idempotent: true })
  async activateTemplate(@Param('templateId', ParseUUIDPipe) templateId: string, @Body() body: ActivateTemplateDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.activateTemplate(templateId, body, context));
  }

  @Post('product-templates/:templateId/validate-content')
  @ApiContract({ operationId: 'apiTpl008', contractId: 'API-TPL-008', summary: 'Validasi payload produk terhadap template', permission: 'product.create', idempotent: true })
  async validateTemplate(@Param('templateId', ParseUUIDPipe) templateId: string, @Body() body: ValidateTemplateContentDto) {
    return apiResult(await this.service.validateTemplate(templateId, body));
  }

  @Get('products')
  @ApiContract({ operationId: 'apiPrd001', contractId: 'API-PRD-001', summary: 'Daftar produk intelijen', permission: 'product.read' })
  async listProducts(@Query() query: ProductQuery) {
    const result = await this.service.listProducts(query);
    return apiResult(result.items, undefined, { pagination: result.pagination });
  }

  @Post('products')
  @ApiContract({ operationId: 'apiPrd002', contractId: 'API-PRD-002', summary: 'Buat produk dan versi awal', permission: 'product.create', successStatus: 201, idempotent: true })
  async createProduct(@Body() body: CreateProductDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createProduct(body, context));
  }

  @Get('products/:productId')
  @ApiContract({ operationId: 'apiPrd003', contractId: 'API-PRD-003', summary: 'Detail produk current version', permission: 'product.read' })
  async getProduct(@Param('productId', ParseUUIDPipe) productId: string, @Query() query: ApprovalWorkflowQuery) {
    return apiResult(await this.service.getProduct(productId, query.include));
  }

  @Get('products/:productId/versions')
  @ApiContract({ operationId: 'apiPrd004', contractId: 'API-PRD-004', summary: 'Riwayat versi produk', permission: 'product.read' })
  async productVersions(@Param('productId', ParseUUIDPipe) productId: string, @Query() query: ProductVersionListQuery) {
    return apiResult(await this.service.productVersions(productId, query));
  }

  @Post('products/:productId/versions')
  @ApiContract({ operationId: 'apiPrd005', contractId: 'API-PRD-005', summary: 'Buat versi revisi produk', permission: 'product.update', successStatus: 201, idempotent: true })
  async createProductVersion(@Param('productId', ParseUUIDPipe) productId: string, @Body() body: CreateProductRevisionDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createProductVersion(productId, body, context));
  }

  @Get('product-versions/:versionId')
  @ApiContract({ operationId: 'apiPrd006', contractId: 'API-PRD-006', summary: 'Detail versi produk', permission: 'product.read' })
  async getProductVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return apiResult(await this.service.getProductVersion(versionId));
  }

  @Patch('product-versions/:versionId')
  @ApiContract({ operationId: 'apiPrd007', contractId: 'API-PRD-007', summary: 'Edit product version draft', permission: 'product.update' })
  async updateProductVersion(@Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: UpdateProductVersionDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.updateProductVersion(versionId, body, context));
  }

  @Put('product-versions/:versionId/source-verifications')
  @ApiContract({ operationId: 'apiPrd008', contractId: 'API-PRD-008', summary: 'Ganti source verifications', permission: 'product.update', idempotent: true })
  async replaceVerifications(@Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: ReplaceSourceVerificationsDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.replaceSourceVerifications(versionId, body, context));
  }

  @Put('product-versions/:versionId/source-analyses')
  @ApiContract({ operationId: 'apiPrd009', contractId: 'API-PRD-009', summary: 'Ganti source analyses', permission: 'product.update', idempotent: true })
  async replaceAnalyses(@Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: ReplaceSourceAnalysesDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.replaceSourceAnalyses(versionId, body, context));
  }

  @Put('product-versions/:versionId/attachments')
  @ApiContract({ operationId: 'apiPrd010', contractId: 'API-PRD-010', summary: 'Ganti lampiran', permission: 'product.update', idempotent: true })
  async replaceAttachments(@Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: ReplaceProductAttachmentsDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.replaceAttachments(versionId, body, context));
  }

  @Post('product-versions/:versionId/validate')
  @ApiContract({ operationId: 'apiPrd011', contractId: 'API-PRD-011', summary: 'Validasi kesiapan submit', permission: 'product.update', idempotent: true })
  async validateProductVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return apiResult(await this.service.validateProductVersion(versionId));
  }

  @Post('products/:productId/submit')
  @ApiContract({ operationId: 'apiPrd012', contractId: 'API-PRD-012', summary: 'Submit ke approval regional', permission: 'product.submit', idempotent: true })
  async submitProduct(@Param('productId', ParseUUIDPipe) productId: string, @Body() body: SubmitProductDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.submitProduct(productId, body, context));
  }

  @Get('products/:productId/traceability')
  @ApiContract({ operationId: 'apiPrd013', contractId: 'API-PRD-013', summary: 'Traceability produk', permission: 'product.read' })
  async traceability(@Param('productId', ParseUUIDPipe) productId: string) {
    return apiResult(await this.service.productTraceability(productId));
  }

  @Get('products/:productId/timeline')
  @ApiContract({ operationId: 'apiPrd014', contractId: 'API-PRD-014', summary: 'Timeline produk', permission: 'product.read' })
  async timeline(@Param('productId', ParseUUIDPipe) productId: string) {
    return apiResult(await this.service.productTimeline(productId));
  }

  @Post('products/:productId/archive')
  @ApiContract({ operationId: 'apiPrd015', contractId: 'API-PRD-015', summary: 'Arsipkan produk', permission: 'product.archive', idempotent: true })
  async archiveProduct(@Param('productId', ParseUUIDPipe) productId: string, @Body() body: ArchiveProductDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.archiveProduct(productId, body, context));
  }

  @Get('approval-inbox')
  @ApiContract({ operationId: 'apiApr001', contractId: 'API-APR-001', summary: 'Inbox approval pengguna', permission: 'approval.read' })
  async approvalInbox(@Query() query: ApprovalInboxQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.approvalInbox(query, context));
  }

  @Post('product-versions/:versionId/approval-workflow')
  @ApiContract({ operationId: 'apiApr002', contractId: 'API-APR-002', summary: 'Buat ulang workflow jika belum ada', permission: 'approval.create', successStatus: 201, idempotent: true })
  async createApprovalWorkflow(@Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: CreateApprovalWorkflowDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createApprovalWorkflow(versionId, body, context));
  }

  @Get('approval-workflows/:workflowId')
  @ApiContract({ operationId: 'apiApr003', contractId: 'API-APR-003', summary: 'Detail workflow approval', permission: 'approval.read' })
  async getWorkflow(@Param('workflowId', ParseUUIDPipe) workflowId: string, @Query() query: ApprovalWorkflowQuery) {
    return apiResult(await this.service.getApprovalWorkflow(workflowId, query.include));
  }

  @Get('approval-steps/:stepId')
  @ApiContract({ operationId: 'apiApr004', contractId: 'API-APR-004', summary: 'Detail approval step', permission: 'approval.read' })
  async getStep(@Param('stepId', ParseUUIDPipe) stepId: string) {
    return apiResult(await this.service.getApprovalStep(stepId));
  }

  @Post('approval-steps/:stepId/approve')
  @ApiContract({ operationId: 'apiApr005', contractId: 'API-APR-005', summary: 'Approve step', permission: 'approval.decide', idempotent: true })
  async approveStep(@Param('stepId', ParseUUIDPipe) stepId: string, @Body() body: DecisionNoteDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.approveStep(stepId, body, context));
  }

  @Post('approval-steps/:stepId/request-revision')
  @ApiContract({ operationId: 'apiApr006', contractId: 'API-APR-006', summary: 'Kembalikan produk untuk revisi', permission: 'approval.decide', idempotent: true })
  async requestRevision(@Param('stepId', ParseUUIDPipe) stepId: string, @Body() body: RequestRevisionDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.requestRevision(stepId, body, context));
  }

  @Post('approval-steps/:stepId/reject')
  @ApiContract({ operationId: 'apiApr007', contractId: 'API-APR-007', summary: 'Tolak produk', permission: 'approval.decide', idempotent: true })
  async rejectStep(@Param('stepId', ParseUUIDPipe) stepId: string, @Body() body: RejectApprovalDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.rejectStep(stepId, body, context));
  }

  @Post('approval-steps/:stepId/request-clarification')
  @ApiContract({ operationId: 'apiApr008', contractId: 'API-APR-008', summary: 'Minta klarifikasi tanpa final decision', permission: 'approval.decide', idempotent: true })
  async requestClarification(@Param('stepId', ParseUUIDPipe) stepId: string, @Body() body: ClarificationDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.requestClarification(stepId, body, context));
  }

  @Post('approval-workflows/:workflowId/cancel')
  @ApiContract({ operationId: 'apiApr009', contractId: 'API-APR-009', summary: 'Batalkan workflow', permission: 'approval.cancel', idempotent: true })
  async cancelWorkflow(@Param('workflowId', ParseUUIDPipe) workflowId: string, @Body() body: CancelWorkflowDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.cancelWorkflow(workflowId, body, context));
  }

  @Get('approval-workflows/:workflowId/timeline')
  @ApiContract({ operationId: 'apiApr010', contractId: 'API-APR-010', summary: 'Timeline approval', permission: 'approval.read' })
  async workflowTimeline(@Param('workflowId', ParseUUIDPipe) workflowId: string) {
    return apiResult(await this.service.approvalTimeline(workflowId));
  }

  @Get('distributions')
  @ApiContract({ operationId: 'apiDst001', contractId: 'API-DST-001', summary: 'Daftar distribusi', permission: 'distribution.read' })
  async listDistributions(@Query() query: DistributionQuery) {
    const result = await this.service.listDistributions(query);
    return apiResult(result.items, undefined, { pagination: result.pagination });
  }

  @Post('product-versions/:versionId/distributions')
  @ApiContract({ operationId: 'apiDst002', contractId: 'API-DST-002', summary: 'Distribusikan produk ke satu atau banyak target', permission: 'distribution.create', successStatus: 201, idempotent: true })
  async createDistributions(@Param('versionId', ParseUUIDPipe) versionId: string, @Body() body: CreateDistributionDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createDistributions(versionId, body, context));
  }

  @Get('distributions/:distributionId')
  @ApiContract({ operationId: 'apiDst003', contractId: 'API-DST-003', summary: 'Detail distribusi', permission: 'distribution.read' })
  async getDistribution(@Param('distributionId', ParseUUIDPipe) distributionId: string) {
    return apiResult(await this.service.getDistribution(distributionId));
  }

  @Post('distributions/:distributionId/mark-delivered')
  @ApiContract({ operationId: 'apiDst004', contractId: 'API-DST-004', summary: 'Callback delivery berhasil', permission: 'distribution.system', idempotent: true })
  async markDelivered(@Param('distributionId', ParseUUIDPipe) distributionId: string, @Body() body: MarkDeliveredDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.markDelivered(distributionId, body, context));
  }

  @Post('distributions/:distributionId/mark-read')
  @ApiContract({ operationId: 'apiDst005', contractId: 'API-DST-005', summary: 'Tandai dibaca penerima', permission: 'distribution.read-own', idempotent: true })
  async markRead(@Param('distributionId', ParseUUIDPipe) distributionId: string, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.markDistributionRead(distributionId, context));
  }

  @Post('distributions/:distributionId/retry')
  @ApiContract({ operationId: 'apiDst006', contractId: 'API-DST-006', summary: 'Retry distribusi gagal', permission: 'distribution.retry', idempotent: true })
  async retryDistribution(@Param('distributionId', ParseUUIDPipe) distributionId: string, @Body() body: RetryDistributionDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.retryDistribution(distributionId, body, context));
  }

  @Post('distributions/:distributionId/revoke')
  @ApiContract({ operationId: 'apiDst007', contractId: 'API-DST-007', summary: 'Cabut akses distribusi', permission: 'distribution.revoke', idempotent: true })
  async revokeDistribution(@Param('distributionId', ParseUUIDPipe) distributionId: string, @Body() body: RevokeDistributionDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.revokeDistribution(distributionId, body, context));
  }

  @Get('products/:productId/distribution-summary')
  @ApiContract({ operationId: 'apiDst008', contractId: 'API-DST-008', summary: 'Ringkasan distribusi produk', permission: 'distribution.read' })
  async distributionSummary(@Param('productId', ParseUUIDPipe) productId: string) {
    return apiResult(await this.service.distributionSummary(productId));
  }

  @Get('dashboard/overview')
  @ApiContract({ operationId: 'apiDash001', contractId: 'API-DASH-001', summary: 'Overview dashboard sesuai role', permission: 'dashboard.read' })
  async dashboardOverview(@Query() query: DashboardQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardOverview(query, context));
  }

  @Get('dashboard/kpis')
  @ApiContract({ operationId: 'apiDash002', contractId: 'API-DASH-002', summary: 'KPI operasional', permission: 'dashboard.read' })
  async dashboardKpis(@Query() query: DashboardQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardKpis(query, context));
  }

  @Get('dashboard/trends')
  @ApiContract({ operationId: 'apiDash003', contractId: 'API-DASH-003', summary: 'Tren laporan/alert/status', permission: 'dashboard.read' })
  async dashboardTrends(@Query() query: DashboardTrendQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardTrends(query, context));
  }

  @Get('dashboard/area-breakdown')
  @ApiContract({ operationId: 'apiDash004', contractId: 'API-DASH-004', summary: 'Agregasi per wilayah', permission: 'dashboard.read' })
  async dashboardAreaBreakdown(@Query() query: DashboardAreaBreakdownQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardAreaBreakdown(query, context));
  }

  @Get('dashboard/task-performance')
  @ApiContract({ operationId: 'apiDash005', contractId: 'API-DASH-005', summary: 'Kinerja tugas', permission: 'dashboard.read' })
  async dashboardTaskPerformance(@Query() query: DashboardTaskPerformanceQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardTaskPerformance(query, context));
  }

  @Get('dashboard/directive-progress')
  @ApiContract({ operationId: 'apiDash006', contractId: 'API-DASH-006', summary: 'Progress direktif', permission: 'dashboard.read' })
  async dashboardDirectiveProgress(@Query() query: DashboardDirectiveProgressQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardDirectiveProgress(query, context));
  }

  @Get('dashboard/verification-quality')
  @ApiContract({ operationId: 'apiDash007', contractId: 'API-DASH-007', summary: 'Kualitas verification', permission: 'dashboard.read' })
  async dashboardVerificationQuality(@Query() query: DashboardVerificationQualityQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardVerificationQuality(query, context));
  }

  @Get('dashboard/product-status')
  @ApiContract({ operationId: 'apiDash008', contractId: 'API-DASH-008', summary: 'Pipeline produk', permission: 'dashboard.read' })
  async dashboardProductStatus(@Query() query: DashboardQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardProductStatus(query, context));
  }

  @Get('dashboard/briefing')
  @ApiContract({ operationId: 'apiDash009', contractId: 'API-DASH-009', summary: 'Briefing dashboard lintas modul', permission: 'dashboard.read' })
  async dashboardBriefing(@Query() query: DashboardQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.dashboardBriefing(query, context), undefined, {
      availableActions: ['dashboard.refresh', 'dashboard.open-detail'],
      appliedScope: query,
    });
  }

  @Get('map/reports')
  @ApiContract({ operationId: 'apiMap001', contractId: 'API-MAP-001', summary: 'Marker laporan pada viewport', permission: 'map.read' })
  async mapReports(@Query() query: MapReportQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapReports(query, context));
  }

  @Get('map/clusters')
  @ApiContract({ operationId: 'apiMap002', contractId: 'API-MAP-002', summary: 'Cluster laporan', permission: 'map.read' })
  async mapClusters(@Query() query: MapReportQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapClusters(query, context));
  }

  @Get('map/heatmap')
  @ApiContract({ operationId: 'apiMap003', contractId: 'API-MAP-003', summary: 'Heatmap laporan', permission: 'map.read' })
  async mapHeatmap(@Query() query: MapHeatmapQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapHeatmap(query, context));
  }

  @Get('map/area-summary')
  @ApiContract({ operationId: 'apiMap004', contractId: 'API-MAP-004', summary: 'Summary area terpilih', permission: 'map.read' })
  async mapAreaSummary(@Query() query: MapAreaSummaryQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapAreaSummary(query, context));
  }

  @Get('map/tasks')
  @ApiContract({ operationId: 'apiMap005', contractId: 'API-MAP-005', summary: 'Marker tugas pada viewport', permission: 'map.read' })
  async mapTasks(@Query() query: MapReportQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapTasks(query, context), undefined, {
      availableActions: ['task.open', 'task.assign', 'task.monitor'],
      appliedScope: query,
    });
  }

  @Get('map/alerts')
  @ApiContract({ operationId: 'apiMap006', contractId: 'API-MAP-006', summary: 'Marker alert pada viewport', permission: 'map.read' })
  async mapAlerts(@Query() query: MapReportQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapAlerts(query, context), undefined, {
      availableActions: ['alert.open', 'alert.acknowledge', 'alert.assign'],
      appliedScope: query,
    });
  }

  @Get('map/emergencies')
  @ApiContract({ operationId: 'apiMap007', contractId: 'API-MAP-007', summary: 'Marker insiden darurat pada viewport', permission: 'map.read' })
  async mapEmergencies(@Query() query: MapReportQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.mapEmergencies(query, context), undefined, {
      availableActions: ['emergency.open', 'emergency.verify', 'emergency.start-response'],
      appliedScope: query,
    });
  }

  @Get('emergency-incidents')
  @ApiContract({ operationId: 'apiEmg001', contractId: 'API-EMG-001', summary: 'Daftar insiden darurat', permission: 'emergency.read' })
  async emergencies(@Query() query: EmergencyQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.listEmergencyIncidents(query, context));
  }

  @Post('emergency-incidents')
  @ApiContract({ operationId: 'apiEmg002', contractId: 'API-EMG-002', summary: 'Buat laporan cepat', permission: 'emergency.create', successStatus: 201, idempotent: true })
  async createEmergency(@Body() body: CreateEmergencyIncidentDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createEmergencyIncident(body, context));
  }

  @Get('emergency-incidents/:incidentId')
  @ApiContract({ operationId: 'apiEmg003', contractId: 'API-EMG-003', summary: 'Detail insiden', permission: 'emergency.read' })
  async getEmergency(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Query() query: ApprovalWorkflowQuery) {
    return apiResult(await this.service.getEmergencyIncident(incidentId, query.include));
  }

  @Patch('emergency-incidents/:incidentId')
  @ApiContract({ operationId: 'apiEmg004', contractId: 'API-EMG-004', summary: 'Update fakta operasional', permission: 'emergency.update' })
  async updateEmergency(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: UpdateEmergencyIncidentDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.updateEmergencyIncident(incidentId, body, context));
  }

  @Post('emergency-incidents/:incidentId/acknowledge')
  @ApiContract({ operationId: 'apiEmg005', contractId: 'API-EMG-005', summary: 'Acknowledge insiden', permission: 'emergency.manage', idempotent: true })
  async acknowledgeEmergency(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: DecisionNoteDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.acknowledgeEmergencyIncident(incidentId, body, context));
  }

  @Post('emergency-incidents/:incidentId/verify')
  @ApiContract({ operationId: 'apiEmg006', contractId: 'API-EMG-006', summary: 'Verifikasi cepat', permission: 'emergency.verify', idempotent: true })
  async verifyEmergency(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: VerifyEmergencyIncidentDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.verifyEmergencyIncident(incidentId, body, context));
  }

  @Post('emergency-incidents/:incidentId/start-response')
  @ApiContract({ operationId: 'apiEmg007', contractId: 'API-EMG-007', summary: 'Mulai penanganan', permission: 'emergency.manage', idempotent: true })
  async startEmergencyResponse(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: StartResponseDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.startEmergencyResponse(incidentId, body, context));
  }

  @Post('emergency-incidents/:incidentId/mark-controlled')
  @ApiContract({ operationId: 'apiEmg008', contractId: 'API-EMG-008', summary: 'Tandai situasi terkendali', permission: 'emergency.manage', idempotent: true })
  async markEmergencyControlled(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: MarkControlledDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.markEmergencyControlled(incidentId, body, context));
  }

  @Post('emergency-incidents/:incidentId/resolve')
  @ApiContract({ operationId: 'apiEmg009', contractId: 'API-EMG-009', summary: 'Selesaikan insiden', permission: 'emergency.manage', idempotent: true })
  async resolveEmergency(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: ResolveEmergencyIncidentDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.resolveEmergencyIncident(incidentId, body, context));
  }

  @Post('emergency-incidents/:incidentId/cancel')
  @ApiContract({ operationId: 'apiEmg010', contractId: 'API-EMG-010', summary: 'Batalkan false alarm/duplicate', permission: 'emergency.manage', idempotent: true })
  async cancelEmergency(@Param('incidentId', ParseUUIDPipe) incidentId: string, @Body() body: CancelEmergencyIncidentDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.cancelEmergencyIncident(incidentId, body, context));
  }

  @Get('alerts')
  @ApiContract({ operationId: 'apiAlt001', contractId: 'API-ALT-001', summary: 'Daftar alert', permission: 'alert.read' })
  async alerts(@Query() query: AlertQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.listAlerts(query, context));
  }

  @Post('alerts')
  @ApiContract({ operationId: 'apiAlt002', contractId: 'API-ALT-002', summary: 'Buat alert manual/system', permission: 'alert.create', successStatus: 201, idempotent: true })
  async createAlert(@Body() body: CreateAlertDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createAlert(body, context));
  }

  @Get('alerts/:alertId')
  @ApiContract({ operationId: 'apiAlt003', contractId: 'API-ALT-003', summary: 'Detail alert', permission: 'alert.read' })
  async getAlert(@Param('alertId', ParseUUIDPipe) alertId: string) {
    return apiResult(await this.service.getAlert(alertId));
  }

  @Patch('alerts/:alertId')
  @ApiContract({ operationId: 'apiAlt004', contractId: 'API-ALT-004', summary: 'Edit alert sebelum resolved', permission: 'alert.update' })
  async updateAlert(@Param('alertId', ParseUUIDPipe) alertId: string, @Body() body: UpdateAlertDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.updateAlert(alertId, body, context));
  }

  @Post('alerts/:alertId/acknowledge')
  @ApiContract({ operationId: 'apiAlt005', contractId: 'API-ALT-005', summary: 'Acknowledge alert', permission: 'alert.execute', idempotent: true })
  async acknowledgeAlert(@Param('alertId', ParseUUIDPipe) alertId: string, @Body() body: DecisionNoteDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.acknowledgeAlert(alertId, body, context));
  }

  @Post('alerts/:alertId/assign')
  @ApiContract({ operationId: 'apiAlt006', contractId: 'API-ALT-006', summary: 'Assign alert', permission: 'alert.assign', idempotent: true })
  async assignAlert(@Param('alertId', ParseUUIDPipe) alertId: string, @Body() body: AssignAlertDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.assignAlert(alertId, body, context));
  }

  @Post('alerts/:alertId/start')
  @ApiContract({ operationId: 'apiAlt007', contractId: 'API-ALT-007', summary: 'Mulai tindak lanjut alert', permission: 'alert.execute', idempotent: true })
  async startAlert(@Param('alertId', ParseUUIDPipe) alertId: string, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.startAlert(alertId, context));
  }

  @Post('alerts/:alertId/resolve')
  @ApiContract({ operationId: 'apiAlt008', contractId: 'API-ALT-008', summary: 'Selesaikan alert', permission: 'alert.execute', idempotent: true })
  async resolveAlert(@Param('alertId', ParseUUIDPipe) alertId: string, @Body() body: ResolveAlertDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.resolveAlert(alertId, body, context));
  }

  @Post('alerts/:alertId/cancel')
  @ApiContract({ operationId: 'apiAlt009', contractId: 'API-ALT-009', summary: 'Batalkan alert', permission: 'alert.execute', idempotent: true })
  async cancelAlert(@Param('alertId', ParseUUIDPipe) alertId: string, @Body() body: CancelAlertDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.cancelAlert(alertId, body, context));
  }

  @Get('alerts/summary')
  @ApiContract({ operationId: 'apiAlt010', contractId: 'API-ALT-010', summary: 'Ringkasan alert', permission: 'alert.read' })
  async alertSummary(@Query() query: AlertSummaryQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.alertSummary(query, context));
  }

  @Post('personnel-location-pings')
  @ApiContract({ operationId: 'apiLoc001', contractId: 'API-LOC-001', summary: 'Kirim ping lokasi personel', permission: 'location.write-own', successStatus: 201, idempotent: true })
  async createLocationPing(@Body() body: CreateLocationPingDto, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.createLocationPing(body, context));
  }

  @Get('personnel-location-pings/me/latest')
  @ApiContract({ operationId: 'apiLoc002', contractId: 'API-LOC-002', summary: 'Lokasi terbaru diri sendiri', permission: 'location.read-own' })
  async myLatestLocation(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.myLatestLocation(context));
  }

  @Get('personnel-location-pings/:assignmentId/latest')
  @ApiContract({ operationId: 'apiLoc003', contractId: 'API-LOC-003', summary: 'Lokasi terbaru bawahan', permission: 'location.read' })
  async latestLocation(@Param('assignmentId', ParseUUIDPipe) assignmentId: string, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.latestLocation(assignmentId, context));
  }

  @Get('personnel-location-pings/:assignmentId/history')
  @ApiContract({ operationId: 'apiLoc004', contractId: 'API-LOC-004', summary: 'Riwayat lokasi bawahan', permission: 'location.read-history' })
  async locationHistory(@Param('assignmentId', ParseUUIDPipe) assignmentId: string, @Query() query: LocationHistoryQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.locationHistory(assignmentId, query, context));
  }

  @Get('personnel-location-map')
  @ApiContract({ operationId: 'apiLoc005', contractId: 'API-LOC-005', summary: 'Peta lokasi personel terbaru', permission: 'location.read' })
  async locationMap(@Query() query: PersonnelLocationMapQuery, @CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.service.personnelLocationMap(query, context));
  }
}
