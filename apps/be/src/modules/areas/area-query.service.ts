import { Injectable } from '@nestjs/common';
import { AdministrativeLevel, Prisma } from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpatialRepository } from '../spatial/spatial.repository.js';
import type {
  AreaHierarchyQueryDto,
  AreaListQueryDto,
  AreaSearchQueryDto,
  AreaTreeQueryDto,
  ViewportBoundaryQueryDto,
} from './dto/area.dto.js';

@Injectable()
export class AreaQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spatial: SpatialRepository,
  ) {}

  async list(query: AreaListQueryDto) {
    const where: Prisma.AdministrativeAreaWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              {
                officialCode: { contains: query.search, mode: 'insensitive' },
              },
            ],
          }
        : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };
    const [items, total] = await Promise.all([
      this.prisma.administrativeArea.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: [{ level: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { children: true } },
          boundaries: {
            where: { isActive: true, effectiveUntil: null },
            select: { id: true },
          },
        },
      }),
      this.prisma.administrativeArea.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...item,
        hasActiveBoundary: item.boundaries.length > 0,
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  detail(id: string) {
    return this.prisma.administrativeArea.findFirstOrThrow({
      where: { id, deletedAt: null },
      include: {
        parent: true,
        children: { where: { deletedAt: null } },
        boundaries: { orderBy: { versionNumber: 'desc' } },
        _count: { select: { children: true } },
      },
    });
  }

  children(id: string, level?: AdministrativeLevel) {
    return this.prisma.administrativeArea.findMany({
      where: {
        parentId: id,
        deletedAt: null,
        isActive: true,
        ...(level ? { level } : {}),
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  hierarchy(
    id: string,
    direction: 'ancestors' | 'descendants',
    query: AreaHierarchyQueryDto,
  ) {
    const where =
      direction === 'ancestors' ? { descendantId: id } : { ancestorId: id };
    return this.prisma.administrativeAreaClosure.findMany({
      where: {
        ...where,
        ...(query.includeSelf
          ? {}
          : {
              depth: {
                gt: 0,
                ...(query.maxDepth ? { lte: query.maxDepth } : {}),
              },
            }),
        ...(query.level
          ? direction === 'ancestors'
            ? { ancestor: { level: query.level } }
            : { descendant: { level: query.level } }
          : {}),
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy: { depth: direction === 'ancestors' ? 'desc' : 'asc' },
      include:
        direction === 'ancestors' ? { ancestor: true } : { descendant: true },
    });
  }

  search(query: AreaSearchQueryDto) {
    return this.prisma.administrativeArea.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(query.level ? { level: query.level } : {}),
        ...(query.parentId ? { parentId: query.parentId } : {}),
        OR: [
          { code: { contains: query.q, mode: 'insensitive' } },
          { officialCode: { contains: query.q, mode: 'insensitive' } },
          { name: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      take: query.limit,
      orderBy: { name: 'asc' },
      include: { parent: true },
    });
  }

  async tree(query: AreaTreeQueryDto) {
    const root =
      query.rootId ??
      (
        await this.prisma.administrativeArea.findFirstOrThrow({
          where: { level: AdministrativeLevel.COUNTRY, parentId: null },
        })
      ).id;
    const links = await this.prisma.administrativeAreaClosure.findMany({
      where: { ancestorId: root, depth: { lte: query.maxDepth } },
      orderBy: { depth: 'asc' },
      include: {
        descendant: {
          include: {
            _count: { select: { children: true } },
            boundaries: {
              where: { isActive: true, effectiveUntil: null },
              select: { id: true },
            },
          },
        },
      },
    });
    const nodes = new Map(
      links.map((link) => [
        link.descendant.id,
        {
          ...link.descendant,
          hasActiveBoundary: link.descendant.boundaries.length > 0,
          children: [] as unknown[],
        },
      ]),
    );
    for (const node of nodes.values()) {
      if (node.parentId && nodes.has(node.parentId)) {
        (nodes.get(node.parentId)?.children as unknown[]).push(node);
      }
    }
    return nodes.get(root);
  }

  async resolve(input: {
    latitude: number;
    longitude: number;
    levels?: AdministrativeLevel[];
  }) {
    const matches = await this.spatial.findContainingAreas(
      input.latitude,
      input.longitude,
      input.levels,
    );
    if (!matches.length) {
      throw new ApiException(
        'AREA_UNRESOLVED',
        'No active boundary covers the coordinate.',
        422,
      );
    }
    const resolved = matches[0];
    const ancestors = await this.prisma.administrativeAreaClosure.findMany({
      where: { descendantId: resolved.areaId, depth: { gt: 0 } },
      orderBy: { depth: 'desc' },
      include: { ancestor: true },
    });
    return {
      point: { type: 'Point', coordinates: [input.longitude, input.latitude] },
      resolvedArea: resolved,
      ancestors: ancestors.map((item) => item.ancestor),
      method: 'POLYGON_MATCH',
      confidence: 100,
      boundaryId: resolved.boundaryId,
      warnings: [],
    };
  }

  async viewport(query: ViewportBoundaryQueryDto) {
    const values = query.bbox.split(',').map(Number);
    if (values.length !== 4 || values.some(Number.isNaN)) {
      throw new ApiException(
        'BBOX_INVALID',
        'bbox must be minLng,minLat,maxLng,maxLat.',
        400,
      );
    }
    const [minLongitude, minLatitude, maxLongitude, maxLatitude] = values;
    if (minLongitude >= maxLongitude || minLatitude >= maxLatitude) {
      throw new ApiException('BBOX_INVALID', 'bbox bounds are invalid.', 422);
    }
    const features = await this.spatial.findBoundariesInViewport({
      minLongitude,
      minLatitude,
      maxLongitude,
      maxLatitude,
      level: query.level,
      limit: query.limit,
    });
    return { type: 'FeatureCollection', features };
  }

  boundary(id: string, simplifyMeters: number) {
    return this.spatial.getActiveBoundaryGeoJson(id, simplifyMeters / 111_320);
  }

  importJob(id: string) {
    return this.prisma.asyncJob.findFirstOrThrow({
      where: { id, type: 'ADMINISTRATIVE_AREA_IMPORT' },
    });
  }
}
