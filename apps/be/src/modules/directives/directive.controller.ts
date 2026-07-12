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
  CreateDirectiveRevisionDto,
  DirectiveQuery,
  DistributeDirectiveDto,
  OptionalNoteDto,
  PublishDirectiveDto,
  ReplaceAreasDto,
  ReplaceRecipientsDto,
  RequiredReasonDto,
  UpdateDirectiveVersionDto,
} from './directive.dto.js';
import { DirectiveService } from './directive.service.js';

@ApiTags('08. Directives')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class DirectiveController {
  constructor(private readonly directiveService: DirectiveService) {}

  @Get('directives')
  @ApiContract({
    operationId: 'apiDir001',
    contractId: 'API-DIR-001',
    summary: 'Daftar direktif',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
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
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
  })
  async get(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.get(directiveId, context));
  }

  @Get('directives/:directiveId/versions')
  @ApiContract({
    operationId: 'apiDir004',
    contractId: 'API-DIR-004',
    summary: 'Riwayat versi directive',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
  })
  async versions(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.versions(directiveId, context));
  }

  @Post('directives/:directiveId/versions')
  @ApiContract({
    operationId: 'apiDir005',
    contractId: 'API-DIR-005',
    summary: 'Buat versi revisi',
    roles: ['executive'],
    successStatus: 201,
    idempotent: true,
  })
  async createVersion(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
    @Body() body: CreateDirectiveRevisionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.createVersion(directiveId, body, context),
    );
  }

  @Get('directive-versions/:versionId')
  @ApiContract({
    operationId: 'apiDir006',
    contractId: 'API-DIR-006',
    summary: 'Detail versi directive',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
  })
  async getVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.directiveService.getVersion(versionId, context));
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

  @Post('directive-recipients/:recipientId/acknowledge')
  @ApiContract({
    operationId: 'apiDir012',
    contractId: 'API-DIR-012',
    summary: 'Acknowledgement penerima',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator'],
    idempotent: true,
  })
  async acknowledge(
    @Param('recipientId', ParseUUIDPipe) recipientId: string,
    @Body() body: OptionalNoteDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.directiveService.acknowledge(recipientId, body, context),
    );
  }

  @Get('directives/:directiveId/tracking')
  @ApiContract({
    operationId: 'apiDir013',
    contractId: 'API-DIR-013',
    summary: 'Tracking pelaksanaan direktif',
    roles: ['executive', 'regional_commander'],
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
