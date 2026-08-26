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
import { CancelDto, CreateUukDto, PublishDto, UukQuery } from './uuk.dto.js';
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async list(
    @Query() query: UukQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.uukService.list(query, context));
  }

  @Post('uuk-strs')
  @ApiContract({
    operationId: 'apiUuk002',
    contractId: 'API-UUK-002',
    summary: 'Buat UUK/STR versi awal',
    roles: ['regional_commander'],
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
    roles: [
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
    ],
  })
  async get(
    @Param('uukStrId', ParseUUIDPipe) uukStrId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.uukService.get(uukStrId, context));
  }

  @Get('uuk-str-versions/:versionId')
  @ApiContract({
    operationId: 'apiUuk006',
    contractId: 'API-UUK-006',
    summary: 'Detail versi UUK/STR',
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
    return apiResult(await this.uukService.getVersion(versionId, context));
  }

  @Post('uuk-str-versions/:versionId/publish')
  @ApiContract({
    operationId: 'apiUuk009',
    contractId: 'API-UUK-009',
    summary: 'Publish UUK/STR',
    roles: ['regional_commander'],
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
    roles: ['regional_commander'],
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
