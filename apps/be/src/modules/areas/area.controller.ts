import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { DomainScopeService } from '../access/domain-scope.service.js';
import {
  AreaHierarchyQueryDto,
  AreaListQueryDto,
  AreaSearchQueryDto,
  AreaTreeQueryDto,
  BoundaryActionDto,
  BoundaryQueryDto,
  CreateAreaDto,
  CreateAreaImportDto,
  CreateBoundaryDto,
  MoveAreaDto,
  ResolveCoordinateDto,
  UpdateAreaDto,
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
      'executive', 'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async list(@Query() q: AreaListQueryDto) {
    const r = await this.areas.list(q);
    return apiResult(r.items, undefined, { pagination: r.pagination });
  }
  @Post('administrative-areas')
  @ApiContract({
    operationId: 'apiArea011',
    contractId: 'API-AREA-011',
    summary: 'Buat wilayah manual',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async create(
    @Body() b: CreateAreaDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.areas.create(b, a));
  }
  @Get('administrative-areas/tree')
  @ApiContract({
    operationId: 'apiArea002',
    contractId: 'API-AREA-002',
    summary: 'Cascading tree wilayah',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive', 'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async tree(@Query() q: AreaTreeQueryDto) {
    return apiResult(await this.areas.tree(q));
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
      'executive', 'regional_commander',
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
      'executive', 'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async viewport(@Query() q: ViewportBoundaryQueryDto) {
    return apiResult(await this.areas.viewport(q));
  }
  @Post('administrative-areas/resolve-coordinate')
  @ApiContract({
    operationId: 'apiArea010',
    contractId: 'API-AREA-010',
    summary: 'Resolve koordinat ke wilayah paling spesifik',
    roles: ['admin_system'],
  })
  async resolve(@Body() b: ResolveCoordinateDto) {
    return apiResult(await this.areas.resolve(b));
  }
  @Get('administrative-areas/:areaId')
  @ApiContract({
    operationId: 'apiArea003',
    contractId: 'API-AREA-003',
    summary: 'Detail wilayah',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive', 'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async detail(@Param('areaId', ParseUUIDPipe) id: string) {
    return apiResult(await this.areas.detail(id));
  }
  @Patch('administrative-areas/:areaId')
  @ApiContract({
    operationId: 'apiArea012',
    contractId: 'API-AREA-012',
    summary: 'Ubah wilayah administratif',
    roles: ['admin_system'],
  })
  async update(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Body() b: UpdateAreaDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.areas.update(id, b, a));
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
      'executive', 'regional_commander',
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
      'executive', 'regional_commander',
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
  @Get('administrative-areas/:areaId/descendants')
  @ApiContract({
    operationId: 'apiArea006',
    contractId: 'API-AREA-006',
    summary: 'Turunan wilayah',
    roles: [
      'admin_system',
      'executive',
      'regional_commander',
      'executive', 'regional_commander',
      'field_coordinator',
      'field_officer',
    ],
  })
  async descendants(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Query() q: AreaHierarchyQueryDto,
  ) {
    return apiResult(await this.areas.hierarchy(id, 'descendants', q));
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
      'executive', 'regional_commander',
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
  @Post('administrative-areas/:areaId/move')
  @ApiContract({
    operationId: 'apiArea013',
    contractId: 'API-AREA-013',
    summary: 'Pindahkan wilayah',
    roles: ['admin_system'],
    idempotent: true,
  })
  async move(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Body() b: MoveAreaDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.areas.move(id, b.newParentId, b.reason, a));
  }
  @Post('administrative-areas/:areaId/boundaries')
  @ApiContract({
    operationId: 'apiArea014',
    contractId: 'API-AREA-014',
    summary: 'Tambah boundary version',
    roles: ['admin_system'],
    successStatus: 201,
    idempotent: true,
  })
  async createBoundary(
    @Param('areaId', ParseUUIDPipe) id: string,
    @Body() b: CreateBoundaryDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.areas.createBoundary(id, b, a));
  }
  @Post('administrative-area-boundaries/:boundaryId/activate')
  @ApiContract({
    operationId: 'apiArea015',
    contractId: 'API-AREA-015',
    summary: 'Aktifkan boundary version',
    roles: ['admin_system'],
    idempotent: true,
  })
  async activate(
    @Param('boundaryId', ParseUUIDPipe) id: string,
    @Body() b: BoundaryActionDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(
      await this.areas.activateBoundary(
        id,
        b.effectiveFrom ? new Date(b.effectiveFrom) : new Date(),
        b.reason,
        a,
      ),
    );
  }
  @Post('administrative-area-boundaries/:boundaryId/invalidate')
  @ApiContract({
    operationId: 'apiArea016',
    contractId: 'API-AREA-016',
    summary: 'Tandai boundary invalid',
    roles: ['admin_system'],
    idempotent: true,
  })
  async invalidate(
    @Param('boundaryId', ParseUUIDPipe) id: string,
    @Body() b: BoundaryActionDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.areas.invalidateBoundary(id, b.reason, a));
  }
  @Post('administrative-area-imports')
  @ApiContract({
    operationId: 'apiArea017',
    contractId: 'API-AREA-017',
    summary: 'Import dataset wilayah/boundary',
    roles: ['admin_system'],
    successStatus: 202,
    idempotent: true,
  })
  async createImport(
    @Body() b: CreateAreaImportDto,
    @CurrentAccessContext() a: AuthorizationContext,
  ) {
    return apiResult(await this.areas.createImport(b, a));
  }
  @Get('administrative-area-imports/:jobId')
  @ApiContract({
    operationId: 'apiArea018',
    contractId: 'API-AREA-018',
    summary: 'Status import',
    roles: ['admin_system'],
  })
  async importJob(@Param('jobId', ParseUUIDPipe) id: string) {
    return apiResult(await this.areas.importJob(id));
  }
}
