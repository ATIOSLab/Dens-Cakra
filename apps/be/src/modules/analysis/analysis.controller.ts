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
  AnalysisQuery,
  CreateAnalysisCaseDto,
  FinalizeAnalysisDto,
  UpdateAnalysisVersionDto,
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
}
