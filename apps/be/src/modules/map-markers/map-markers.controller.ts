import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { apiResult } from '../../common/api/api-response.js';
import { ApiContract } from '../../common/decorators/api-contract.decorator.js';
import { CurrentAccessContext } from '../../common/decorators/current-access-context.decorator.js';
import { DomainAccessGuard } from '../../common/guards/domain-access.guard.js';
import { SessionGuard } from '../../common/guards/session.guard.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { MapMarkersQuery } from './map-markers.dto.js';
import { MapMarkersService } from './map-markers.service.js';

@ApiTags('Map Markers')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller('map')
export class MapMarkersController {
  constructor(private readonly service: MapMarkersService) {}

  @Get('markers')
  @ApiContract({
    operationId: 'apiMapMarkers001',
    contractId: 'API-MAP-MARKERS-001',
    summary:
      'Marker GeoJSON Laporan Jaring, BAKET, dan lokasi personel sesuai scope',
    roles: ['executive', 'regional_commander'],
  })
  async list(
    @Query() query: MapMarkersQuery,
    @CurrentAccessContext() context: AuthorizationContext,
  ) {
    return apiResult(await this.service.list(query, context), undefined, {
      appliedFilters: query,
      availableActions: ['report.open', 'baket.open', 'personnel.open'],
    });
  }
}
