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
  CancelDto,
  CreateUukDto,
  CreateUukRevisionDto,
  PublishDto,
  ReplaceSectionsDto,
  UukQuery,
  UpdateUukVersionDto,
} from './uuk.dto.js';
import { UukService } from './uuk.service.js';

@ApiTags('09. UUK/STR')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class UukController {
  constructor(private readonly uukService: UukService) {}

  @Get('uuk-strs')
  @ApiContract({
    operationId: 'apiUuk001',
    contractId: 'API-UUK-001',
    summary: 'Daftar UUK/STR',
    permission: 'uuk.read',
  })
  async list(@Query() query: UukQuery) {
    return apiResult(await this.uukService.list(query));
  }

  @Post('uuk-strs')
  @ApiContract({
    operationId: 'apiUuk002',
    contractId: 'API-UUK-002',
    summary: 'Buat UUK/STR versi awal',
    permission: 'uuk.create',
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateUukDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.uukService.create(body, context));
  }

  @Get('uuk-strs/:uukStrId')
  @ApiContract({
    operationId: 'apiUuk003',
    contractId: 'API-UUK-003',
    summary: 'Detail UUK/STR',
    permission: 'uuk.read',
  })
  async get(@Param('uukStrId', ParseUUIDPipe) uukStrId: string) {
    return apiResult(await this.uukService.get(uukStrId));
  }

  @Get('uuk-strs/:uukStrId/versions')
  @ApiContract({
    operationId: 'apiUuk004',
    contractId: 'API-UUK-004',
    summary: 'Riwayat versi UUK/STR',
    permission: 'uuk.read',
  })
  async versions(@Param('uukStrId', ParseUUIDPipe) uukStrId: string) {
    return apiResult(await this.uukService.versions(uukStrId));
  }

  @Post('uuk-strs/:uukStrId/versions')
  @ApiContract({
    operationId: 'apiUuk005',
    contractId: 'API-UUK-005',
    summary: 'Buat revisi UUK/STR',
    permission: 'uuk.update',
    successStatus: 201,
    idempotent: true,
  })
  async createVersion(
    @Param('uukStrId', ParseUUIDPipe) uukStrId: string,
    @Body() body: CreateUukRevisionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.uukService.createVersion(uukStrId, body, context),
    );
  }

  @Get('uuk-str-versions/:versionId')
  @ApiContract({
    operationId: 'apiUuk006',
    contractId: 'API-UUK-006',
    summary: 'Detail versi UUK/STR',
    permission: 'uuk.read',
  })
  async getVersion(@Param('versionId', ParseUUIDPipe) versionId: string) {
    return apiResult(await this.uukService.getVersion(versionId));
  }

  @Patch('uuk-str-versions/:versionId')
  @ApiContract({
    operationId: 'apiUuk007',
    contractId: 'API-UUK-007',
    summary: 'Edit judul versi draft',
    permission: 'uuk.update',
  })
  async updateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: UpdateUukVersionDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.uukService.updateVersion(versionId, body, context),
    );
  }

  @Put('uuk-str-versions/:versionId/sections')
  @ApiContract({
    operationId: 'apiUuk008',
    contractId: 'API-UUK-008',
    summary: 'Ganti seluruh section draft',
    permission: 'uuk.update',
    idempotent: true,
  })
  async replaceSections(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: ReplaceSectionsDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.uukService.replaceSections(versionId, body, context),
    );
  }

  @Post('uuk-str-versions/:versionId/publish')
  @ApiContract({
    operationId: 'apiUuk009',
    contractId: 'API-UUK-009',
    summary: 'Publish UUK/STR',
    permission: 'uuk.publish',
    idempotent: true,
  })
  async publish(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() body: PublishDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.uukService.publish(versionId, body, context));
  }

  @Post('uuk-strs/:uukStrId/cancel')
  @ApiContract({
    operationId: 'apiUuk010',
    contractId: 'API-UUK-010',
    summary: 'Batalkan UUK/STR',
    permission: 'uuk.cancel',
    idempotent: true,
  })
  async cancel(
    @Param('uukStrId', ParseUUIDPipe) uukStrId: string,
    @Body() body: CancelDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.uukService.cancel(uukStrId, body, context));
  }
}
