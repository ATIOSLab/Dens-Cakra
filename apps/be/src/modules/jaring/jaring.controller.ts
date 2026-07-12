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
  CoverageDto,
  CreateJaringDto,
  JaringQuery,
  ReasonDto,
  TransferDto,
  UpdateJaringDto,
} from './jaring.dto.js';
import { JaringService } from './jaring.service.js';

@ApiTags('11. Jaring Management')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('jaring')
export class JaringController {
  constructor(private readonly jaringService: JaringService) {}

  @Get()
  @ApiContract({
    operationId: 'apiJar001',
    contractId: 'API-JAR-001',
    summary: 'Daftar Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async list(@Query() query: JaringQuery) {
    return apiResult(await this.jaringService.list(query));
  }

  @Post()
  @ApiContract({
    operationId: 'apiJar002',
    contractId: 'API-JAR-002',
    summary: 'Buat Jaring',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() body: CreateJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.create(body, context));
  }

  @Get(':jaringId')
  @ApiContract({
    operationId: 'apiJar003',
    contractId: 'API-JAR-003',
    summary: 'Detail Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async get(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.get(id));
  }

  @Patch(':jaringId')
  @ApiContract({
    operationId: 'apiJar004',
    contractId: 'API-JAR-004',
    summary: 'Ubah Jaring',
    roles: ['field_officer'],
  })
  async update(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: UpdateJaringDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.update(id, body, context));
  }

  @Post(':jaringId/activate')
  @ApiContract({
    operationId: 'apiJar005',
    contractId: 'API-JAR-005',
    summary: 'Aktifkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async activate(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.activate(id, body, context));
  }

  @Post(':jaringId/deactivate')
  @ApiContract({
    operationId: 'apiJar006',
    contractId: 'API-JAR-006',
    summary: 'Nonaktifkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async deactivate(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.deactivate(id, body, context));
  }

  @Post(':jaringId/archive')
  @ApiContract({
    operationId: 'apiJar007',
    contractId: 'API-JAR-007',
    summary: 'Arsipkan Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async archive(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: ReasonDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.archive(id, body, context));
  }

  @Get(':jaringId/caretakers')
  @ApiContract({
    operationId: 'apiJar008',
    contractId: 'API-JAR-008',
    summary: 'Riwayat caretaker',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async caretakers(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.caretakers(id));
  }

  @Post(':jaringId/caretaker-transfer')
  @ApiContract({
    operationId: 'apiJar009',
    contractId: 'API-JAR-009',
    summary: 'Transfer caretaker',
    roles: ['field_officer'],
    successStatus: 201,
    idempotent: true,
  })
  async transfer(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: TransferDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.transfer(id, body, context));
  }

  @Get(':jaringId/area-coverages')
  @ApiContract({
    operationId: 'apiJar010',
    contractId: 'API-JAR-010',
    summary: 'Coverage wilayah Jaring',
    roles: ['regional_commander', 'field_coordinator', 'field_officer'],
  })
  async coverages(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.coverages(id));
  }

  @Put(':jaringId/area-coverages')
  @ApiContract({
    operationId: 'apiJar011',
    contractId: 'API-JAR-011',
    summary: 'Ganti coverage wilayah Jaring',
    roles: ['field_officer'],
    idempotent: true,
  })
  async coverage(
    @Param('jaringId', ParseUUIDPipe) id: string,
    @Body() body: CoverageDto,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.jaringService.coverage(id, body, context));
  }

  @Get(':jaringId/messages')
  @ApiContract({
    operationId: 'apiJar012',
    contractId: 'API-JAR-012',
    summary: 'Pesan Jaring',
    roles: ['field_officer'],
  })
  async messages(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.messages(id));
  }

  @Get(':jaringId/bakets')
  @ApiContract({
    operationId: 'apiJar013',
    contractId: 'API-JAR-013',
    summary: 'Baket Jaring',
    roles: ['executive', 'regional_commander', 'operational_intelligence_manager', 'field_coordinator', 'field_officer'],
  })
  async bakets(@Param('jaringId', ParseUUIDPipe) id: string) {
    return apiResult(await this.jaringService.bakets(id));
  }
}
