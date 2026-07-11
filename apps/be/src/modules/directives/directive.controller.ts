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
    permission: 'directive.read',
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
    permission: 'directive.create',
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
    permission: 'directive.read',
  })
  async get(@Param('directiveId', ParseUUIDPipe) directiveId: string) {
    return apiResult(await this.directiveService.get(directiveId));
  }

  @Get('directives/:directiveId/versions')
  @ApiContract({
    operationId: 'apiDir004',
    contractId: 'API-DIR-004',
    summary: 'Riwayat versi directive',
    permission: 'directive.read',
  })
  async versions(@Param('directiveId', ParseUUIDPipe) directiveId: string) {
    return apiResult(await this.directiveService.versions(directiveId));
  }

  @Post('directives/:directiveId/versions')
  @ApiContract({
    operationId: 'apiDir005',
    contractId: 'API-DIR-005',
    summary: 'Buat versi revisi',
    permission: 'directive.update',
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
    permission: 'directive.read',
  })
  async getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return apiResult(await this.directiveService.getVersion(versionId));
  }

  @Patch('directive-versions/:versionId')
  @ApiContract({
    operationId: 'apiDir007',
    contractId: 'API-DIR-007',
    summary: 'Edit versi draft',
    permission: 'directive.update',
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
    permission: 'directive.update',
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
    permission: 'directive.update',
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
    permission: 'directive.publish',
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
    permission: 'directive.distribute',
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
    permission: 'directive.acknowledge',
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
    permission: 'directive.track',
  })
  async tracking(
    @Param('directiveId', ParseUUIDPipe) directiveId: string,
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
      ),
    );
  }

  @Post('directives/:directiveId/cancel')
  @ApiContract({
    operationId: 'apiDir014',
    contractId: 'API-DIR-014',
    summary: 'Batalkan directive',
    permission: 'directive.cancel',
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
