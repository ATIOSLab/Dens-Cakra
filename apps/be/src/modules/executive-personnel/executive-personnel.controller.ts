import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import {
  ExecutivePersonnelListQuery,
  ExecutivePersonnelMapQuery,
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
