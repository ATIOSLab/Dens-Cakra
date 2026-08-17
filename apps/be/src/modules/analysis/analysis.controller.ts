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
  FinalizeAnalysisDto,
  ReplaceEntitiesDto,
  ReplaceRelationshipsDto,
  ReplaceSourcesDto,
  SubmitAnalysisReviewDto,
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async list(
    @Query() query: AnalysisQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.list(query, context));
  }

  @Post('analysis-cases')
  @ApiContract({
    operationId: 'apiAnl002',
    contractId: 'API-ANL-002',
    summary: 'Buat analysis case',
    roles: ['executive', 'regional_commander'],
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async get(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.get(caseId, context));
  }

  @Post('analysis-cases/:caseId/finalize')
  @ApiContract({
    operationId: 'apiAnl017',
    contractId: 'API-ANL-017',
    summary: 'Finalkan analysis dan kunci versi aktif',
    roles: ['executive', 'regional_commander'],
    idempotent: true,
  })
  async finalize(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: FinalizeAnalysisDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.finalize(caseId, body, context),
    );
  }

  @Post('analysis-cases/:caseId/submit-review')
  @ApiContract({
    operationId: 'apiAnl016',
    contractId: 'API-ANL-016',
    summary: 'Kirim analysis ke review manusia',
    roles: ['executive', 'regional_commander'],
    idempotent: true,
  })
  async submitReview(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() body: SubmitAnalysisReviewDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.analysisService.submitReview(caseId, context, body.note),
    );
  }

  @Patch('analysis-cases/:caseId')
  @ApiContract({
    operationId: 'apiAnl004',
    contractId: 'API-ANL-004',
    summary: 'Edit analysis case',
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async versions(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.versions(caseId, context));
  }

  @Post('analysis-cases/:caseId/versions')
  @ApiContract({
    operationId: 'apiAnl007',
    contractId: 'API-ANL-007',
    summary: 'Buat versi analysis',
    roles: ['executive', 'regional_commander'],
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async getVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.getVersion(versionId, context));
  }

  @Patch('analysis-versions/:versionId')
  @ApiContract({
    operationId: 'apiAnl009',
    contractId: 'API-ANL-009',
    summary: 'Edit analysis version',
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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
    roles: ['executive', 'regional_commander'],
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async graph(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.graph(caseId, context));
  }

  @Get('analysis-cases/:caseId/traceability')
  @ApiContract({
    operationId: 'apiAnl014',
    contractId: 'API-ANL-014',
    summary: 'Traceability analysis',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
    ],
  })
  async traceability(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.analysisService.traceability(caseId, context));
  }

  @Post('analysis-cases/:caseId/archive')
  @ApiContract({
    operationId: 'apiAnl015',
    contractId: 'API-ANL-015',
    summary: 'Archive analysis',
    roles: ['executive', 'regional_commander'],
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
