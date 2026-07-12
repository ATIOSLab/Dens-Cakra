import { Injectable } from '@nestjs/common';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { AdministrativeLevel } from '../../generated/prisma/client.js';
import type {
  AreaHierarchyQueryDto,
  AreaListQueryDto,
  AreaSearchQueryDto,
  AreaTreeQueryDto,
  CreateAreaDto,
  CreateAreaImportDto,
  CreateBoundaryDto,
  UpdateAreaDto,
  ViewportBoundaryQueryDto,
} from './dto/area.dto.js';
import { AreaMutationService } from './area-mutation.service.js';
import { AreaQueryService } from './area-query.service.js';

@Injectable()
export class AreaService {
  constructor(
    private readonly areaQuery: AreaQueryService,
    private readonly areaMutation: AreaMutationService,
  ) {}

  list(query: AreaListQueryDto) {
    return this.areaQuery.list(query);
  }

  create(input: CreateAreaDto, actor: AuthorizationContext) {
    return this.areaMutation.create(input, actor);
  }

  detail(id: string) {
    return this.areaQuery.detail(id);
  }

  async update(id: string, input: UpdateAreaDto, actor: AuthorizationContext) {
    await this.areaMutation.update(id, input, actor);
    return this.areaQuery.detail(id);
  }

  children(id: string, level?: AdministrativeLevel) {
    return this.areaQuery.children(id, level);
  }

  hierarchy(
    id: string,
    direction: 'ancestors' | 'descendants',
    query: AreaHierarchyQueryDto,
  ) {
    return this.areaQuery.hierarchy(id, direction, query);
  }

  search(query: AreaSearchQueryDto) {
    return this.areaQuery.search(query);
  }

  tree(query: AreaTreeQueryDto) {
    return this.areaQuery.tree(query);
  }

  resolve(input: {
    latitude: number;
    longitude: number;
    levels?: AdministrativeLevel[];
  }) {
    return this.areaQuery.resolve(input);
  }

  viewport(query: ViewportBoundaryQueryDto) {
    return this.areaQuery.viewport(query);
  }

  boundary(id: string, simplifyMeters: number) {
    return this.areaQuery.boundary(id, simplifyMeters);
  }

  async move(
    id: string,
    parentId: string,
    reason: string,
    actor: AuthorizationContext,
  ) {
    await this.areaMutation.move(id, parentId, reason, actor);
    return this.areaQuery.detail(id);
  }

  createBoundary(
    areaId: string,
    input: CreateBoundaryDto,
    actor: AuthorizationContext,
  ) {
    return this.areaMutation.createBoundary(areaId, input, actor);
  }

  activateBoundary(
    id: string,
    effectiveFrom: Date,
    reason: string,
    actor: AuthorizationContext,
  ) {
    return this.areaMutation.activateBoundary(id, effectiveFrom, reason, actor);
  }

  invalidateBoundary(id: string, reason: string, actor: AuthorizationContext) {
    return this.areaMutation.invalidateBoundary(id, reason, actor);
  }

  createImport(input: CreateAreaImportDto, actor: AuthorizationContext) {
    return this.areaMutation.createImport(input, actor);
  }

  importJob(id: string) {
    return this.areaQuery.importJob(id);
  }
}
