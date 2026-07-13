import { Injectable } from '@nestjs/common';
import {
  AdministrativeLevel,
  BaketStatus,
  PriorityLevel,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AgentLocationState,
  MapMarkersQuery,
  MapMarkerType,
} from './map-markers.dto.js';
import {
  MapMarkersSpatialRepository,
  type MatchedAdministrativeArea,
} from './map-markers.spatial.repository.js';

type Viewport = {
  minLongitude: number;
  minLatitude: number;
  maxLongitude: number;
  maxLatitude: number;
};

type MapFeature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: Record<string, unknown>;
};

const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
] as const;

@Injectable()
export class MapMarkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: DomainScopeService,
    private readonly spatial: MapMarkersSpatialRepository,
  ) {}

  async list(query: MapMarkersQuery, context: AuthorizationContext) {
    const filters = this.normalizeFilters(query);
    const [baketResult, agentResult, categories] = await Promise.all([
      filters.types.has(MapMarkerType.BAKET)
        ? this.getBaketFeatures(query, context, filters)
        : Promise.resolve({ features: [] as MapFeature[], unlocatedCount: 0 }),
      filters.types.has(MapMarkerType.AGENT)
        ? this.getAgentFeatures(query, context, filters)
        : Promise.resolve({ features: [] as MapFeature[], unlocatedCount: 0 }),
      this.prisma.reportCategory.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, code: true, name: true },
      }),
    ]);
    const features = [...baketResult.features, ...agentResult.features];
    const areaFacets = this.collectAreaFacets(features);

    return {
      type: 'FeatureCollection' as const,
      features,
      meta: {
        counts: {
          total: features.length,
          baket: baketResult.features.length,
          agent: agentResult.features.length,
          unlocatedBaket: baketResult.unlocatedCount,
          unlocatedAgent: agentResult.unlocatedCount,
          activeAgents: agentResult.features.filter(
            (feature) =>
              feature.properties.agentState === AgentLocationState.ACTIVE,
          ).length,
          lastKnownAgents: agentResult.features.filter(
            (feature) =>
              feature.properties.agentState === AgentLocationState.LAST_KNOWN,
          ).length,
          byBaketCategory: this.countBy(
            baketResult.features,
            (feature) =>
              (feature.properties.category as { code?: string } | null)?.code ??
              'uncategorized',
          ),
          byBaketStatus: this.countBy(baketResult.features, (feature) =>
            String(feature.properties.status),
          ),
        },
        facets: {
          markerTypes: Object.values(MapMarkerType),
          categories,
          baketStatuses: Object.values(BaketStatus),
          urgencies: Object.values(PriorityLevel),
          agentStates: Object.values(AgentLocationState),
          administrativeLevels: Object.values(AdministrativeLevel),
          areas: areaFacets,
        },
        freshness: {
          activeWithinMinutes: query.activeWithinMinutes,
          lastKnownWithinHours: query.lastKnownWithinHours,
          generatedAt: new Date().toISOString(),
        },
        security: { stealthLocationsExcluded: true },
      },
    };
  }

  private async getBaketFeatures(
    query: MapMarkersQuery,
    context: AuthorizationContext,
    filters: ReturnType<MapMarkersService['normalizeFilters']>,
  ) {
    const scopedWhere = await this.scope.baketWhere(context);
    const candidates = await this.prisma.baket.findMany({
      where: {
        AND: [
          { deletedAt: null },
          scopedWhere,
          query.baketStatuses?.length
            ? { status: { in: query.baketStatuses } }
            : {},
          query.categoryIds?.length
            ? { reportCategoryId: { in: query.categoryIds } }
            : {},
          query.categoryCodes?.length
            ? { reportCategory: { code: { in: query.categoryCodes } } }
            : {},
          filters.search
            ? {
                versions: {
                  some: {
                    OR: [
                      {
                        title: {
                          contains: filters.search,
                          mode: 'insensitive',
                        },
                      },
                      {
                        normalizedContent: {
                          contains: filters.search,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              }
            : {},
        ],
      },
      select: {
        id: true,
        status: true,
        currentVersionNumber: true,
        createdAt: true,
        reportCategory: { select: { id: true, code: true, name: true } },
        createdByFieldOfficerAssignment: {
          select: {
            id: true,
            userProfile: { select: { id: true, fullName: true } },
            position: {
              select: {
                title: true,
                organizationUnit: { select: { id: true, name: true } },
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            title: true,
            versionNumber: true,
            eventTime: true,
            eventAreaId: true,
            latitude: true,
            longitude: true,
            locationCapturedAt: true,
            coordinateSource: true,
            areaResolutionMethod: true,
            areaResolutionConfidence: true,
            urgency: true,
            createdAt: true,
            eventArea: {
              select: {
                id: true,
                code: true,
                name: true,
                level: true,
                ancestorLinks: {
                  select: {
                    ancestor: {
                      select: { id: true, code: true, name: true, level: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });

    const located = candidates.flatMap((baket) => {
      const version = baket.versions[0];
      if (!version || version.latitude === null || version.longitude === null) {
        return [];
      }
      return [{ baket, version }];
    });
    const matchedByVersion = await this.spatial.matchCoordinates(
      located.map(({ version }) => ({
        id: version.id,
        latitude: Number(version.latitude),
        longitude: Number(version.longitude),
      })),
    );

    const features = located
      .filter(({ version }) => {
        const occurredAt = version.eventTime ?? version.createdAt;
        return (
          this.matchesDate(occurredAt, filters.from, filters.to) &&
          (!query.urgencies?.length ||
            query.urgencies.includes(version.urgency)) &&
          this.isInViewport(
            Number(version.latitude),
            Number(version.longitude),
            filters.viewport,
          )
        );
      })
      .map(({ baket, version }) => {
        const spatialAreas = matchedByVersion.get(version.id) ?? [];
        const fallbackAreas = this.getFallbackAreas(version.eventArea);
        const areas = spatialAreas.length ? spatialAreas : fallbackAreas;
        return {
          baket,
          version,
          areas,
          hasSpatialMatch: spatialAreas.length > 0,
        };
      })
      .filter(({ areas }) => this.matchesArea(areas, query))
      .slice(0, query.limitPerType)
      .map(({ baket, version, areas, hasSpatialMatch }): MapFeature => {
        const categoryCode = baket.reportCategory?.code ?? 'uncategorized';
        const visibleAreas = this.visibleAreas(areas, query);
        const primaryArea = visibleAreas[0] ?? null;
        return {
          type: 'Feature',
          id: `baket:${baket.id}`,
          geometry: {
            type: 'Point',
            coordinates: [Number(version.longitude), Number(version.latitude)],
          },
          properties: {
            markerType: MapMarkerType.BAKET,
            markerKey: `baket:${categoryCode}`,
            suggestedColor: this.categoryColor(categoryCode),
            baketId: baket.id,
            versionId: version.id,
            currentVersionNumber: baket.currentVersionNumber,
            title: version.title,
            status: baket.status,
            urgency: version.urgency,
            category: baket.reportCategory,
            eventTime: version.eventTime,
            occurredAt: version.eventTime ?? version.createdAt,
            locationCapturedAt: version.locationCapturedAt,
            coordinateSource: version.coordinateSource,
            areaResolutionMethod: hasSpatialMatch
              ? 'POLYGON_MATCH'
              : version.areaResolutionMethod,
            areaResolutionConfidence: version.areaResolutionConfidence,
            primaryArea,
            matchedAreas: visibleAreas,
            fieldOfficer: {
              assignmentId: baket.createdByFieldOfficerAssignment.id,
              userProfileId:
                baket.createdByFieldOfficerAssignment.userProfile.id,
              name: baket.createdByFieldOfficerAssignment.userProfile.fullName,
              positionTitle:
                baket.createdByFieldOfficerAssignment.position.title,
              unitId:
                baket.createdByFieldOfficerAssignment.position.organizationUnit
                  .id,
              unitName:
                baket.createdByFieldOfficerAssignment.position.organizationUnit
                  .name,
            },
          },
        };
      });

    return {
      features,
      unlocatedCount: candidates.length - located.length,
    };
  }

  private async getAgentFeatures(
    query: MapMarkersQuery,
    context: AuthorizationContext,
    filters: ReturnType<MapMarkersService['normalizeFilters']>,
  ) {
    const scope = await this.scope.resolve(context);
    const assignmentIds = query.assignmentIds?.length
      ? scope.assignmentIds.filter((id) => query.assignmentIds!.includes(id))
      : scope.assignmentIds;
    const capturedAfter = new Date(
      filters.now.getTime() - query.lastKnownWithinHours * 60 * 60 * 1000,
    );
    const locations = await this.spatial.findLatestPersonnelLocations({
      assignmentIds,
      unitIds: query.unitIds,
      capturedAfter,
    });
    const matchedByPing = await this.spatial.matchCoordinates(
      locations.map((location) => ({
        id: location.pingId,
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    );

    const features = locations
      .map((location) => {
        const ageMinutes = Math.max(
          0,
          Math.floor(
            (filters.now.getTime() - location.capturedAt.getTime()) / 60_000,
          ),
        );
        const agentState =
          ageMinutes <= query.activeWithinMinutes
            ? AgentLocationState.ACTIVE
            : AgentLocationState.LAST_KNOWN;
        return {
          location,
          ageMinutes,
          agentState,
          areas: matchedByPing.get(location.pingId) ?? [],
        };
      })
      .filter(({ location, agentState, areas }) => {
        const matchesSearch =
          !filters.search ||
          location.userName.toLowerCase().includes(filters.search) ||
          location.positionTitle.toLowerCase().includes(filters.search) ||
          location.unitName.toLowerCase().includes(filters.search);
        return (
          matchesSearch &&
          (!query.agentStates?.length ||
            query.agentStates.includes(agentState)) &&
          this.matchesDate(location.capturedAt, filters.from, filters.to) &&
          this.isInViewport(
            location.latitude,
            location.longitude,
            filters.viewport,
          ) &&
          this.matchesArea(areas, query)
        );
      })
      .slice(0, query.limitPerType)
      .map(({ location, ageMinutes, agentState, areas }): MapFeature => {
        const visibleAreas = this.visibleAreas(areas, query);
        return {
          type: 'Feature',
          id: `agent:${location.assignmentId}`,
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude],
          },
          properties: {
            markerType: MapMarkerType.AGENT,
            markerKey: `agent:${agentState}`,
            suggestedColor:
              agentState === AgentLocationState.ACTIVE ? '#3b82f6' : '#94a3b8',
            assignmentId: location.assignmentId,
            userProfileId: location.userProfileId,
            userName: location.userName,
            positionTitle: location.positionTitle,
            positionCode: location.positionCode,
            unitId: location.unitId,
            unitName: location.unitName,
            capturedAt: location.capturedAt,
            ageMinutes,
            agentState,
            gpsAccuracyMeters: location.gpsAccuracyMeters,
            coordinateSource: location.coordinateSource,
            areaResolutionMethod: areas.length
              ? 'POLYGON_MATCH'
              : location.areaResolutionMethod,
            primaryArea: visibleAreas[0] ?? null,
            matchedAreas: visibleAreas,
          },
        };
      });

    return {
      features,
      unlocatedCount: Math.max(0, assignmentIds.length - locations.length),
    };
  }

  private normalizeFilters(query: MapMarkersQuery) {
    const viewport = query.bbox ? this.parseViewport(query.bbox) : null;
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    if (from && to && from > to) {
      throw new ApiException(
        'MAP_MARKER_DATE_RANGE_INVALID',
        '`from` must be earlier than or equal to `to`.',
        400,
      );
    }
    if (query.activeWithinMinutes > query.lastKnownWithinHours * 60) {
      throw new ApiException(
        'MAP_MARKER_FRESHNESS_INVALID',
        '`activeWithinMinutes` cannot exceed `lastKnownWithinHours`.',
        400,
      );
    }
    return {
      viewport,
      from,
      to,
      now: new Date(),
      search: query.q?.trim().toLowerCase() || null,
      types: new Set(query.types ?? [MapMarkerType.BAKET, MapMarkerType.AGENT]),
    };
  }

  private parseViewport(value: string): Viewport {
    const parts = value.split(',').map(Number);
    if (
      parts.length !== 4 ||
      parts.some((part) => !Number.isFinite(part)) ||
      parts[0] < -180 ||
      parts[2] > 180 ||
      parts[1] < -90 ||
      parts[3] > 90 ||
      parts[0] >= parts[2] ||
      parts[1] >= parts[3]
    ) {
      throw new ApiException(
        'MAP_MARKER_BBOX_INVALID',
        '`bbox` must use minLongitude,minLatitude,maxLongitude,maxLatitude.',
        400,
      );
    }
    return {
      minLongitude: parts[0],
      minLatitude: parts[1],
      maxLongitude: parts[2],
      maxLatitude: parts[3],
    };
  }

  private isInViewport(
    latitude: number,
    longitude: number,
    viewport: Viewport | null,
  ) {
    if (!viewport) return true;
    return (
      longitude >= viewport.minLongitude &&
      longitude <= viewport.maxLongitude &&
      latitude >= viewport.minLatitude &&
      latitude <= viewport.maxLatitude
    );
  }

  private matchesDate(value: Date, from: Date | null, to: Date | null) {
    return (!from || value >= from) && (!to || value <= to);
  }

  private matchesArea(
    areas: MatchedAdministrativeArea[],
    query: MapMarkersQuery,
  ) {
    return (
      (!query.areaIds?.length ||
        areas.some((area) => query.areaIds!.includes(area.id))) &&
      (!query.areaCodes?.length ||
        areas.some((area) => query.areaCodes!.includes(area.code))) &&
      (!query.areaLevels?.length ||
        areas.some((area) => query.areaLevels!.includes(area.level)))
    );
  }

  private visibleAreas(
    areas: MatchedAdministrativeArea[],
    query: MapMarkersQuery,
  ) {
    return query.includeAreaHierarchy ? areas : areas.slice(0, 1);
  }

  private getFallbackAreas(
    eventArea: {
      id: string;
      code: string;
      name: string;
      level: AdministrativeLevel;
      ancestorLinks: Array<{
        ancestor: {
          id: string;
          code: string;
          name: string;
          level: AdministrativeLevel;
        };
      }>;
    } | null,
  ): MatchedAdministrativeArea[] {
    if (!eventArea) return [];
    const values = [
      eventArea,
      ...eventArea.ancestorLinks.map((link) => link.ancestor),
    ];
    const rank = Object.values(AdministrativeLevel);
    return [...new Map(values.map((area) => [area.id, area])).values()]
      .sort((a, b) => rank.indexOf(b.level) - rank.indexOf(a.level))
      .map((area) => ({ ...area, boundaryQualityStatus: null }));
  }

  private categoryColor(code: string) {
    const hash = [...code].reduce(
      (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
      0,
    );
    return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
  }

  private collectAreaFacets(features: MapFeature[]) {
    const areas = new Map<string, MatchedAdministrativeArea>();
    for (const feature of features) {
      const matchedAreas =
        (feature.properties.matchedAreas as MatchedAdministrativeArea[]) ?? [];
      for (const area of matchedAreas) areas.set(area.id, area);
    }
    return [...areas.values()];
  }

  private countBy(
    features: MapFeature[],
    getKey: (feature: MapFeature) => string,
  ) {
    return features.reduce<Record<string, number>>((counts, feature) => {
      const key = getKey(feature);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
  }
}
