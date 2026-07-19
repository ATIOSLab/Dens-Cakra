import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
  ExecutivePersonnelListQuery,
  ExecutivePersonnelMapQuery,
  FieldCoordinatorPersonnelAreaFilterQuery,
} from './executive-personnel.dto.js';
import { ExecutivePersonnelService } from './executive-personnel.service.js';

@ApiTags('Executive Personnel')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('executive/personnel')
export class ExecutivePersonnelController {
  constructor(private readonly service: ExecutivePersonnelService) {}

  @Get()
  @ApiContract({
    operationId: 'apiExecutivePersonnel001',
    contractId: 'API-EXECUTIVE-PERSONNEL-001',
    summary: 'Daftar personel nasional untuk role eksekutif',
    roles: ['executive'],
  })
  async list(@Query() query: ExecutivePersonnelListQuery) {
    const result = await this.service.list(query);
    return apiResult(result.items, undefined, result.meta);
  }

  @Get('map')
  @ApiContract({
    operationId: 'apiExecutivePersonnel002',
    contractId: 'API-EXECUTIVE-PERSONNEL-002',
    summary: 'Peta nasional lokasi petugas organik',
    roles: ['executive'],
  })
  async map(@Query() query: ExecutivePersonnelMapQuery) {
    return apiResult(await this.service.map(query), undefined, {
      appliedFilters: query,
    });
  }

  @Get(':userProfileId')
  @ApiContract({
    operationId: 'apiExecutivePersonnel003',
    contractId: 'API-EXECUTIVE-PERSONNEL-003',
    summary: 'Detail personel untuk dashboard eksekutif',
    roles: ['executive'],
  })
  async detail(@Param('userProfileId', ParseUUIDPipe) userProfileId: string) {
    return apiResult(await this.service.detail(userProfileId));
  }
}

@ApiTags('Field Coordinator Personnel')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('field-coordinator/personnel')
export class FieldCoordinatorPersonnelController {
  constructor(private readonly service: ExecutivePersonnelService) {}

  @Get()
  @ApiContract({
    operationId: 'apiFieldCoordinatorPersonnel001',
    contractId: 'API-FIELD-COORDINATOR-PERSONNEL-001',
    summary: 'Daftar petugas lapangan dalam hierarki Field Coordinator',
    roles: ['field_coordinator'],
  })
  async list(
    @Query() query: ExecutivePersonnelListQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    const result = await this.service.listFieldCoordinatorPersonnel(
      query,
      context,
    );
    return apiResult(result.items, undefined, result.meta);
  }

  @Get('map')
  @ApiContract({
    operationId: 'apiFieldCoordinatorPersonnel002',
    contractId: 'API-FIELD-COORDINATOR-PERSONNEL-002',
    summary: 'Peta petugas lapangan dalam hierarki Field Coordinator',
    roles: ['field_coordinator'],
  })
  async map(
    @Query() query: ExecutivePersonnelMapQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.mapFieldCoordinatorPersonnel(query, context),
      undefined,
      { appliedFilters: query },
    );
  }

  @Get('area-filters')
  @ApiContract({
    operationId: 'apiFieldCoordinatorPersonnel003',
    contractId: 'API-FIELD-COORDINATOR-PERSONNEL-003',
    summary: 'Filter wilayah bertingkat sesuai scope Field Coordinator',
    roles: ['field_coordinator'],
  })
  async areaFilters(
    @Query() query: FieldCoordinatorPersonnelAreaFilterQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.fieldCoordinatorAreaFilters(query, context),
    );
  }

  @Get(':assignmentId')
  @ApiContract({
    operationId: 'apiFieldCoordinatorPersonnel004',
    contractId: 'API-FIELD-COORDINATOR-PERSONNEL-004',
    summary: 'Detail petugas lapangan dalam hierarki Field Coordinator',
    roles: ['field_coordinator'],
  })
  async detail(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.detailFieldCoordinatorPersonnel(assignmentId, context),
    );
  }
}

@ApiTags('Regional Commander Personnel')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('regional-commander/personnel')
export class RegionalCommanderPersonnelController {
  constructor(private readonly service: ExecutivePersonnelService) {}

  @Get(':assignmentId')
  @ApiContract({
    operationId: 'apiRegionalCommanderPersonnel001',
    contractId: 'API-REGIONAL-COMMANDER-PERSONNEL-001',
    summary: 'Detail personel dalam hierarki Regional Commander',
    roles: ['regional_commander'],
  })
  async detail(
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(
      await this.service.detailRegionalPersonnel(assignmentId, context),
    );
  }
}
