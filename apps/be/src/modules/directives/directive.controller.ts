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
  CreateDirectiveDto,
  DirectiveQuery,
  DistributeDirectiveDto,
  GenerateDirectiveAiDto,
  PublishDirectiveDto,
  ReplaceAreasDto,
  ReplaceRecipientsDto,
  RequiredReasonDto,
  UpdateDirectiveVersionDto,
} from './directive.dto.js';
import { DirectiveService } from './directive.service.js';
import { DirectiveAiService } from './directive-ai.service.js';

@ApiTags('08. Directives')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class DirectiveController {
  constructor(
    private readonly directiveService: DirectiveService,
    private readonly directiveAiService: DirectiveAiService,
  ) {}

  @Post('directives/ai-recommendation')
  @ApiContract({
    operationId: 'apiDirAi001',
    contractId: 'API-DIR-AI-001',
    summary: 'Generate rekomendasi AI untuk Direktif Strategis',
    roles: ['executive'],
    successStatus: 201,
  })
  async generateAiRecommendation(@Body() body: GenerateDirectiveAiDto) {
    return apiResult(await this.directiveAiService.generate(body));
  }

  @Get('directives')
  @ApiContract({
    operationId: 'apiDir001',
    contractId: 'API-DIR-001',
    summary: 'Daftar direktif',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async list(
    @Query() query: DirectiveQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.list(query, context));
  }

  @Post('directives')
  @ApiContract({
    operationId: 'apiDir002',
    contractId: 'API-DIR-002',
    summary: 'Buat directive dan versi awal',
    roles: ['executive'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateDirectiveDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.create(body, context));
  }

  @Get('directives/:directiveId')
  @ApiContract({
    operationId: 'apiDir003',
    contractId: 'API-DIR-003',
    summary: 'Detail directive current version',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async get(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.get(directiveId, context));
  }

  @Get('directive-versions/:versionId')
  @ApiContract({
    operationId: 'apiDir006',
    contractId: 'API-DIR-006',
    summary: 'Detail versi directive',
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async getVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.getVersion(versionId, context),
    );
  }

  @Patch('directive-versions/:versionId')
  @ApiContract({
    operationId: 'apiDir007',
    contractId: 'API-DIR-007',
    summary: 'Edit versi draft',
    roles: ['executive'],
  })
  async updateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: UpdateDirectiveVersionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.updateVersion(versionId, body, context),
    );
  }

  @Put('directive-versions/:versionId/target-areas')
  @ApiContract({
    operationId: 'apiDir008',
    contractId: 'API-DIR-008',
    summary: 'Ganti target area draft',
    roles: ['executive'],
    idempotent: true,
  })
  async replaceAreas(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ReplaceAreasDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.replaceAreas(versionId, body, context),
    );
  }

  @Put('directive-versions/:versionId/recipients')
  @ApiContract({
    operationId: 'apiDir009',
    contractId: 'API-DIR-009',
    summary: 'Ganti penerima draft',
    roles: ['executive'],
    idempotent: true,
  })
  async replaceRecipients(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ReplaceRecipientsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.replaceRecipients(versionId, body, context),
    );
  }

  @Post('directive-versions/:versionId/publish')
  @ApiContract({
    operationId: 'apiDir010',
    contractId: 'API-DIR-010',
    summary: 'Publish directive',
    roles: ['executive'],
    idempotent: true,
  })
  async publish(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: PublishDirectiveDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.publish(versionId, body, context),
    );
  }

  @Post('directive-versions/:versionId/distribute')
  @ApiContract({
    operationId: 'apiDir011',
    contractId: 'API-DIR-011',
    summary: 'Distribusikan directive',
    roles: ['executive'],
    idempotent: true,
  })
  async distribute(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: DistributeDirectiveDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.distribute(versionId, body, context),
    );
  }

  @Post('directive-versions/:versionId/mark-read')
  @ApiContract({
    operationId: 'apiDir012a',
    contractId: 'API-DIR-012A',
    summary: 'Tandai directive dibaca penerima',
    roles: [
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
    idempotent: true,
  })
  async markRead(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.markRead(versionId, context));
  }

  @Get('directives/:directiveId/tracking')
  @ApiContract({
    operationId: 'apiDir013',
    contractId: 'API-DIR-013',
    summary: 'Tracking pelaksanaan direktif',
    roles: ['executive'],
  })
  async tracking(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
    @CurrentAccessContext() context: AuthorizationContext,
    @Query('areaId') areaId?: string,
    @Query('unitId') unitId?: string,
    @Query('includeTasks') includeTasks = 'true',
  ) {
    return apiResult(
      await this.directiveService.tracking(
        directiveId,
        areaId,
        unitId,
        includeTasks,
        context,
      ),
    );
  }

  @Post('directives/:directiveId/cancel')
  @ApiContract({
    operationId: 'apiDir014',
    contractId: 'API-DIR-014',
    summary: 'Batalkan directive',
    roles: ['executive'],
    idempotent: true,
  })
  async cancel(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
    @Body() body: RequiredReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.cancel(directiveId, body, context),
    );
  }
}
