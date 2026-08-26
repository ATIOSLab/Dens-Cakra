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
import { DomainScopeService } from '../access/domain-scope.service.js';
import {
  AreaHierarchyQueryDto,
  AreaListQueryDto,
  AreaSearchQueryDto,
  BoundaryQueryDto,
  ViewportBoundaryQueryDto,
} from './dto/area.dto.js';
import { AreaService } from './area.service.js';

@ApiTags('06. Administrative Areas & Spatial Services')
@UseGuards(SessionGuard, DomainAccessGuard)
@Controller()
export class AreaController {
  constructor(
    private readonly areas: AreaService,
    private readonly domainScope: DomainScopeService,
  ) {}
  @Get('administrative-areas')
  @ApiContract({
    operationId: 'apiArea001',
    contractId: 'API-AREA-001',
    summary: 'Daftar/filter wilayah',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async list(@Query() q: AreaListQueryDto) {
    const r = await this.areas.list(q);
    return apiResult(r.items, undefined, { pagination: r.pagination });
  }
  @Get('administrative-areas/scoped-tree')
  @ApiContract({
    operationId: 'apiArea019',
    contractId: 'API-AREA-019',
    summary: 'Cascading tree wilayah sesuai scope pengguna',
    roles: ['executive', 'regional_commander'],
  })
  async scopedTree(@CurrentAccessContext() context: AuthorizationContext) {
    return apiResult(await this.domainScope.areaTree(context));
  }
  @Get('administrative-areas/search')
  @ApiContract({
    operationId: 'apiArea007',
    contractId: 'API-AREA-007',
    summary: 'Search wilayah berdasarkan nama/kode',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async search(@Query() q: AreaSearchQueryDto) {
    return apiResult(await this.areas.search(q));
  }
  @Get('administrative-areas/boundaries')
  @ApiContract({
    operationId: 'apiArea009',
    contractId: 'API-AREA-009',
    summary: 'Boundary berdasarkan viewport',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async viewport(@Query() q: ViewportBoundaryQueryDto) {
    return apiResult(await this.areas.viewport(q));
  }
  @Get('administrative-areas/:areaId/children')
  @ApiContract({
    operationId: 'apiArea004',
    contractId: 'API-AREA-004',
    summary: 'Anak wilayah untuk cascading filter',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async children(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Query() q: AreaHierarchyQueryDto,
  ) {
    return apiResult(await this.areas.children(id, q.level));
  }
  @Get('administrative-areas/:areaId/ancestors')
  @ApiContract({
    operationId: 'apiArea005',
    contractId: 'API-AREA-005',
    summary: 'Breadcrumb administratif',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async ancestors(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Query() q: AreaHierarchyQueryDto,
  ) {
    return apiResult(await this.areas.hierarchy(id, 'ancestors', q));
  }
  @Get('administrative-areas/:areaId/boundary')
  @ApiContract({
    operationId: 'apiArea008',
    contractId: 'API-AREA-008',
    summary: 'Ambil boundary GeoJSON',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive',
      'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async boundary(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Query() q: BoundaryQueryDto,
  ) {
    return apiResult(await this.areas.boundary(id, q.simplifyMeters));
  }
}
