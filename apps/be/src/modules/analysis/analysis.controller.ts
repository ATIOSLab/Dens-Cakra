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
  AnalysisQuery,
  ArchiveAnalysisDto,
  CreateAnalysisCaseDto,
  CreateAnalysisVersionDto,
  ReplaceEntitiesDto,
  ReplaceRelationshipsDto,
  ReplaceSourcesDto,
  UpdateAnalysisCaseDto,
  UpdateAnalysisVersionDto,
  ValidateAnalysisDto,
} from './analysis.dto.js';
import { AnalysisService } from './analysis.service.js';

@ApiTags('15. Analysis Workspace')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('analysis-cases')
  @ApiContract({
    operationId: 'apiAnl001',
    contractId: 'API-ANL-001',
    summary: 'Daftar analysis case',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager'],
  })
  async list(@Query() query: AnalysisQuery) {
    return apiResult(await this.analysisService.list(query));
  }

  @Post('analysis-cases')
  @ApiContract({
    operationId: 'apiAnl002',
    contractId: 'API-ANL-002',
    summary: 'Buat analysis case',
    roles: ['operational_intelligence_manager'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateAnalysisCaseDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.create(body, context));
  }

  @Get('analysis-cases/:caseId')
  @ApiContract({
    operationId: 'apiAnl003',
    contractId: 'API-ANL-003',
    summary: 'Detail analysis case',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager'],
  })
  async get(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return apiResult(await this.analysisService.get(caseId));
  }

  @Patch('analysis-cases/:caseId')
  @ApiContract({
    operationId: 'apiAnl004',
    contractId: 'API-ANL-004',
    summary: 'Edit analysis case',
    roles: ['operational_intelligence_manager'],
  })
  async update(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: UpdateAnalysisCaseDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.update(caseId, body, context));
  }

  @Put('analysis-cases/:caseId/sources')
  @ApiContract({
    operationId: 'apiAnl005',
    contractId: 'API-ANL-005',
    summary: 'Ganti sumber verification',
    roles: ['operational_intelligence_manager'],
    idempotent: true,
  })
  async replaceSources(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: ReplaceSourcesDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.replaceSources(caseId, body, context),
    );
  }

  @Get('analysis-cases/:caseId/versions')
  @ApiContract({
    operationId: 'apiAnl006',
    contractId: 'API-ANL-006',
    summary: 'Riwayat analysis versions',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager'],
  })
  async versions(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return apiResult(await this.analysisService.versions(caseId));
  }

  @Post('analysis-cases/:caseId/versions')
  @ApiContract({
    operationId: 'apiAnl007',
    contractId: 'API-ANL-007',
    summary: 'Buat versi analysis',
    roles: ['operational_intelligence_manager'],
    successStatus: 201,
    idempotent: true,
  })
  async createVersion(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: CreateAnalysisVersionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.createVersion(caseId, body, context),
    );
  }

  @Get('analysis-versions/:versionId')
  @ApiContract({
    operationId: 'apiAnl008',
    contractId: 'API-ANL-008',
    summary: 'Detail analysis version',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager'],
  })
  async getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return apiResult(await this.analysisService.getVersion(versionId));
  }

  @Patch('analysis-versions/:versionId')
  @ApiContract({
    operationId: 'apiAnl009',
    contractId: 'API-ANL-009',
    summary: 'Edit analysis version',
    roles: ['operational_intelligence_manager'],
  })
  async updateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: UpdateAnalysisVersionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.updateVersion(versionId, body, context),
    );
  }

  @Put('analysis-versions/:versionId/entities')
  @ApiContract({
    operationId: 'apiAnl010',
    contractId: 'API-ANL-010',
    summary: 'Ganti entities',
    roles: ['operational_intelligence_manager'],
    idempotent: true,
  })
  async replaceEntities(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ReplaceEntitiesDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.replaceEntities(versionId, body, context),
    );
  }

  @Put('analysis-versions/:versionId/relationships')
  @ApiContract({
    operationId: 'apiAnl011',
    contractId: 'API-ANL-011',
    summary: 'Ganti relationships',
    roles: ['operational_intelligence_manager'],
    idempotent: true,
  })
  async replaceRelationships(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ReplaceRelationshipsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.replaceRelationships(versionId, body, context),
    );
  }

  @Post('analysis-versions/:versionId/validate')
  @ApiContract({
    operationId: 'apiAnl012',
    contractId: 'API-ANL-012',
    summary: 'Validate analysis',
    roles: ['operational_intelligence_manager'],
    idempotent: true,
  })
  async validateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ValidateAnalysisDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.validateVersion(versionId, body, context),
    );
  }

  @Get('analysis-cases/:caseId/graph')
  @ApiContract({
    operationId: 'apiAnl013',
    contractId: 'API-ANL-013',
    summary: 'Graph analysis',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager'],
  })
  async graph(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return apiResult(await this.analysisService.graph(caseId));
  }

  @Get('analysis-cases/:caseId/traceability')
  @ApiContract({
    operationId: 'apiAnl014',
    contractId: 'API-ANL-014',
    summary: 'Traceability analysis',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager'],
  })
  async traceability(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return apiResult(await this.analysisService.traceability(caseId));
  }

  @Post('analysis-cases/:caseId/archive')
  @ApiContract({
    operationId: 'apiAnl015',
    contractId: 'API-ANL-015',
    summary: 'Archive analysis',
    roles: ['operational_intelligence_manager'],
    idempotent: true,
  })
  async archive(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: ArchiveAnalysisDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.archive(caseId, body, context));
  }
}
