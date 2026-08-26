import { Injectable } from '@nestjs/common';
import { AdministrativeLevel } from '../../generated/prisma/client.js';
import type {
  AreaHierarchyQueryDto,
  AreaListQueryDto,
  AreaSearchQueryDto,
  ViewportBoundaryQueryDto,
} from './dto/area.dto.js';
import { AreaQueryService } from './area-query.service.js';

@Injectable()
export class AreaService {
  constructor(private readonly areaQuery: AreaQueryService) {}

  list(query: AreaListQueryDto) {
    return this.areaQuery.list(query);
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

  viewport(query: ViewportBoundaryQueryDto) {
    return this.areaQuery.viewport(query);
  }

  boundary(id: string, simplifyMeters: number) {
    return this.areaQuery.boundary(id, simplifyMeters);
  }
}
