import { Injectable } from '@nestjs/common';
import {
  AdministrativeLevel,
  BaketStatus,
  CoverageValidationStatus,
  PriorityLevel,
  WhatsAppMessageStatus,
  WhatsAppValidationSummary,
} from '../../generated/prisma/client.js';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import { getIndonesianPhoneSearchVariants } from '../../common/utils/phone-normalizer.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AgentLocationState,
  MapMarkersQuery,
  MapMarkerType,
  ReportCompletenessFilter,
  ReportLocationSuitabilityFilter,
  ReportValidityFilter,
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

type MarkerResult = {
  features: MapFeature[];
  unlocatedCount: number;
  totalCount: number;
  summary?: Record<string, number>;
  unlocatedItems?: Array<Record<string, unknown>>;
};

type JaringReportVerificationStatus =
  | 'IN_PROGRESS_BY_JARING'
  | 'NOT_SUBMITTED'
  | 'WAITING_FIELD_OFFICER_VERIFICATION'
  | 'NEEDS_FIELD_OFFICER_REVIEW'
  | 'VERIFIED_BY_FIELD_OFFICER'
  | 'METADATA_RECORDED';

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
    const emptyResult: MarkerResult = {
      features: [],
      unlocatedCount: 0,
      totalCount: 0,
    };
    const [reportResult, baketResult, agentResult, categories] =
      await Promise.all([
        filters.types.has(MapMarkerType.REPORT)
          ? this.getReportFeatures(query, context, filters)
          : Promise.resolve(emptyResult),
        filters.types.has(MapMarkerType.BAKET)
          ? this.getBaketFeatures(query, context, filters)
          : Promise.resolve(emptyResult),
        filters.types.has(MapMarkerType.AGENT)
          ? this.getAgentFeatures(query, context, filters)
          : Promise.resolve(emptyResult),
        this.prisma.reportCategory.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true },
        }),
      ]);
    const features = [
      ...reportResult.features,
      ...baketResult.features,
      ...agentResult.features,
    ];
    const areaFacets = this.collectAreaFacets(features);

    return {
      type: 'FeatureCollection' as const,
      features,
      meta: {
        counts: {
          total: features.length,
          report: reportResult.features.length,
          baket: baketResult.features.length,
          agent: agentResult.features.length,
          totalReports: reportResult.totalCount,
          totalBakets: baketResult.totalCount,
          mappableReports: Math.max(
            0,
            reportResult.totalCount - reportResult.unlocatedCount,
          ),
          mappableBakets: Math.max(
            0,
            baketResult.totalCount - baketResult.unlocatedCount,
          ),
          unlocatedReport: reportResult.unlocatedCount,
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
        summary: {
          reports: reportResult.summary ?? {},
          bakets: {
            total: baketResult.totalCount,
            mappable: Math.max(
              0,
              baketResult.totalCount - baketResult.unlocatedCount,
            ),
            unlocated: baketResult.unlocatedCount,
          },
          visible: {
            total: features.length,
            reports: reportResult.features.length,
            bakets: baketResult.features.length,
            agents: agentResult.features.length,
          },
        },
        unlocatedItems: reportResult.unlocatedItems ?? [],
        security: { stealthLocationsExcluded: true },
      },
    };
  }

  private async getReportFeatures(
    query: MapMarkersQuery,
    context: AuthorizationContext,
    filters: ReturnType<MapMarkersService['normalizeFilters']>,
  ): Promise<MarkerResult> {
    const scopedJaringWhere = await this.scope.jaringWhere(context);
    const phoneSearchVariants = filters.search
      ? getIndonesianPhoneSearchVariants(filters.search)
      : [];
    const candidates = await this.prisma.whatsAppReportSession.findMany({
      where: {
        AND: [
          { jaring: scopedJaringWhere },
          {
            submittedMessage: {
              is: { convertedBaketId: null },
            },
          },
          query.jaringIds?.length ? { jaringId: { in: query.jaringIds } } : {},
          query.fieldOfficerAssignmentIds?.length
            ? {
                OR: [
                  {
                    fieldOfficerAssignmentId: {
                      in: query.fieldOfficerAssignmentIds,
                    },
                  },
                  {
                    jaring: {
                      caretakerAssignments: {
                        some: {
                          isActive: true,
                          fieldOfficerAssignmentId: {
                            in: query.fieldOfficerAssignmentIds,
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {},
          filters.search
            ? {
                OR: [
                  {
                    referenceNumber: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    content: {
                      contains: filters.search,
                      mode: 'insensitive',
                    },
                  },
                  {
                    jaring: {
                      OR: [
                        {
                          aliasName: {
                            contains: filters.search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          fullName: {
                            contains: filters.search,
                            mode: 'insensitive',
                          },
                        },
                        ...phoneSearchVariants.map((phone) => ({
                          whatsappNumber: { contains: phone },
                        })),
                        {
                          caretakerAssignments: {
                            some: {
                              isActive: true,
                              fieldOfficerAssignment: {
                                userProfile: {
                                  OR: [
                                    {
                                      fullName: {
                                        contains: filters.search,
                                        mode: 'insensitive',
                                      },
                                    },
                                    {
                                      username: {
                                        contains: filters.search,
                                        mode: 'insensitive',
                                      },
                                    },
                                  ],
                                },
                              },
                            },
                          },
                        },
                        {
                          areaCoverages: {
                            some: {
                              validUntil: null,
                              area: {
                                OR: [
                                  {
                                    name: {
                                      contains: filters.search,
                                      mode: 'insensitive',
                                    },
                                  },
                                  {
                                    descendantLinks: {
                                      some: {
                                        ancestor: {
                                          name: {
                                            contains: filters.search,
                                            mode: 'insensitive',
                                          },
                                        },
                                      },
                                    },
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                  {
                    submittedMessage: {
                      is: {
                        OR: [
                          {
                            referenceNumber: {
                              contains: filters.search,
                              mode: 'insensitive',
                            },
                          },
                          {
                            resolvedArea: {
                              is: {
                                name: {
                                  contains: filters.search,
                                  mode: 'insensitive',
                                },
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              }
            : {},
        ],
      },
      select: {
        id: true,
        jaringId: true,
        fieldOfficerAssignmentId: true,
        status: true,
        currentState: true,
        content: true,
        latitude: true,
        longitude: true,
        locationAccuracyMeters: true,
        locationCapturedAt: true,
        locationType: true,
        referenceNumber: true,
        submittedAt: true,
        startedAt: true,
        createdAt: true,
        jaring: {
          select: {
            id: true,
            aliasName: true,
            fullName: true,
            whatsappNumber: true,
            profilePhotoFileId: true,
            areaCoverages: {
              where: { validUntil: null },
              orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
              take: 1,
              select: {
                area: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    level: true,
                    parent: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        level: true,
                        parent: {
                          select: {
                            id: true,
                            code: true,
                            name: true,
                            level: true,
                            parent: {
                              select: { id: true, code: true, name: true, level: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            caretakerAssignments: {
              where: { isActive: true },
              take: 1,
              select: {
                fieldOfficerAssignment: {
                  select: {
                    id: true,
                    userProfile: {
                      select: { id: true, fullName: true },
                    },
                  },
                },
              },
            },
          },
        },
        submittedMessage: {
          select: {
            id: true,
            convertedBaketId: true,
            referenceNumber: true,
            content: true,
            senderPhone: true,
            jaringId: true,
            latitude: true,
            longitude: true,
            resolvedAreaId: true,
            rawPayload: true,
            status: true,
            validationSummary: true,
            receivedAt: true,
            coordinateSource: true,
            category: { select: { id: true, code: true, name: true } },
            resolvedArea: {
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
            convertedBaket: {
              select: {
                id: true,
                status: true,
                currentVersionNumber: true,
                versions: {
                  orderBy: { versionNumber: 'desc' },
                  take: 1,
                  select: {
                    id: true,
                    urgency: true,
                    coverageValidationStatus: true,
                  },
                },
              },
            },
            _count: { select: { media: true } },
          },
        },
        media: {
          where: { deletedAt: null },
          orderBy: { orderNo: 'asc' },
          select: {
            id: true,
            fileId: true,
            mediaType: true,
            caption: true,
            orderNo: true,
            createdAt: true,
            file: {
              select: {
                originalName: true,
                mimeType: true,
              },
            },
          },
        },
      },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
    });

    const withCoordinates = candidates.filter((report) =>
      this.validCoordinates(report.latitude, report.longitude),
    );
    const matchedByReport = await this.spatial.matchCoordinates(
      withCoordinates.map((report) => ({
        id: report.id,
        latitude: Number(report.latitude),
        longitude: Number(report.longitude),
      })),
    );

    const prepared = candidates
      .map((report) => {
        const message = report.submittedMessage;
        const validity = this.reportValidity(message);
        const verificationStatus = this.reportVerificationStatus(
          report.status,
          message,
        );
        const completeness = this.reportCompleteness(message);
        const baketVersion = message?.convertedBaket?.versions?.[0] ?? null;
        const suitability = this.reportLocationSuitability(
          baketVersion?.coverageValidationStatus,
        );
        const hasCoordinates = this.validCoordinates(
          report.latitude,
          report.longitude,
        );
        const spatialAreas = hasCoordinates
          ? (matchedByReport.get(report.id) ?? [])
          : [];
        const fallbackAreas = this.getFallbackAreas(
          message?.resolvedArea ?? null,
        );
        const areas = spatialAreas.length ? spatialAreas : fallbackAreas;
        const reportedAt =
          report.submittedAt ?? report.startedAt ?? report.createdAt;
        return {
          report,
          message,
          validity,
          verificationStatus,
          completeness,
          suitability,
          baketVersion,
          hasCoordinates,
          hasSpatialMatch: spatialAreas.length > 0,
          areas,
          reportedAt,
        };
      })
      .filter((item) => {
        const { report, message, validity, completeness, suitability } = item;
        return (
          this.matchesDate(item.reportedAt, filters.from, filters.to) &&
          (!query.categoryIds?.length ||
            (message?.category?.id &&
              query.categoryIds.includes(message.category.id))) &&
          (!query.categoryCodes?.length ||
            (message?.category?.code &&
              query.categoryCodes.includes(message.category.code))) &&
          (!query.urgencies?.length ||
            query.urgencies.includes(
              item.baketVersion?.urgency ?? PriorityLevel.NORMAL,
            )) &&
          (!query.reportValidity?.length ||
            query.reportValidity.includes(validity)) &&
          (!query.completeness?.length ||
            query.completeness.includes(completeness)) &&
          (query.hasCoordinates === undefined ||
            query.hasCoordinates === item.hasCoordinates) &&
          (query.hasAttachments === undefined ||
            query.hasAttachments === report.media.length > 0) &&
          (!query.coordinateSources?.length ||
            (message?.coordinateSource &&
              query.coordinateSources.includes(message.coordinateSource))) &&
          (!query.locationSuitability?.length ||
            query.locationSuitability.includes(suitability)) &&
          this.matchesArea(item.areas, query)
        );
      });

    const located = prepared.filter((item) => item.hasCoordinates);
    const visible = located
      .filter(({ report }) =>
        this.isInViewport(
          Number(report.latitude),
          Number(report.longitude),
          filters.viewport,
        ),
      )
      .slice(0, query.limitPerType);

    const features = visible.map((item): MapFeature => {
      const { report, message } = item;
      const content = (message?.content ?? report.content ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      const words = content.split(' ').filter(Boolean);
      const visibleAreas = this.visibleAreas(item.areas, query);
      const caretaker =
        report.jaring.caretakerAssignments[0]?.fieldOfficerAssignment;
      const attachmentCounts = report.media.reduce(
        (
          counts: Record<string, number>,
          media: { mediaType?: string | null },
        ) => {
          const type = String(media.mediaType || 'OTHER').toUpperCase();
          counts[type] = (counts[type] ?? 0) + 1;
          return counts;
        },
        {} as Record<string, number>,
      );
      return {
        type: 'Feature',
        id: `report:${report.id}`,
        geometry: {
          type: 'Point',
          coordinates: [Number(report.longitude), Number(report.latitude)],
        },
        properties: {
          markerType: MapMarkerType.REPORT,
          markerKey: `report:${item.completeness.toLowerCase()}`,
          suggestedColor: this.reportColor(item.completeness),
          reportId: report.id,
          referenceNumber:
            report.referenceNumber ?? message?.referenceNumber ?? report.id,
          displayTitle: content
            ? `${words.slice(0, 10).join(' ')}${words.length > 10 ? '…' : ''}`
            : 'Laporan Jaring tanpa judul',
          excerpt: content.slice(0, 220),
          reportStatus: report.status,
          verificationStatus: item.verificationStatus,
          validity: item.validity,
          completeness: item.completeness,
          urgency: item.baketVersion?.urgency ?? PriorityLevel.NORMAL,
          category: message?.category ?? null,
          reportedAt: item.reportedAt,
          receivedAt: message?.receivedAt ?? null,
          locationCapturedAt: report.locationCapturedAt,
          coordinateSource: message?.coordinateSource ?? report.locationType,
          gpsAccuracyMeters:
            report.locationAccuracyMeters === null
              ? null
              : Number(report.locationAccuracyMeters),
          areaResolutionMethod: item.hasSpatialMatch
            ? 'POLYGON_MATCH'
            : 'STORED_RELATION',
          primaryArea: visibleAreas[0] ?? null,
          matchedAreas: visibleAreas,
          locationSuitability: item.suitability,
          jaring: {
            id: report.jaring.id,
            name:
              report.jaring.fullName ??
              report.jaring.aliasName ??
              'Identitas Jaring terbatas',
            code: report.jaring.aliasName ?? null,
            whatsappNumber: report.jaring.whatsappNumber,
            profilePhotoFileId: report.jaring.profilePhotoFileId,
            placementArea: report.jaring.areaCoverages?.[0]?.area ?? null,
          },
          fieldOfficer: caretaker
            ? {
                assignmentId: caretaker.id,
                userProfileId: caretaker.userProfile.id,
                name: caretaker.userProfile.fullName,
              }
            : null,
          attachments: {
            total: report.media.length,
            images: attachmentCounts.IMAGE ?? attachmentCounts.PHOTO ?? 0,
            videos: attachmentCounts.VIDEO ?? 0,
            items: report.media.map((media) => ({
              id: media.id,
              fileId: media.fileId,
              mediaType: media.mediaType,
              caption: media.caption,
              orderNo: media.orderNo,
              createdAt: media.createdAt,
              fileName: media.file.originalName,
              mimeType: media.file.mimeType,
            })),
          },
          baket: message?.convertedBaket
            ? {
                id: message.convertedBaket.id,
                status: message.convertedBaket.status,
                currentVersionNumber:
                  message.convertedBaket.currentVersionNumber,
              }
            : null,
        },
      };
    });

    return {
      features,
      totalCount: prepared.length,
      unlocatedCount: prepared.length - located.length,
        summary: {
          total: prepared.length,
        valid: prepared.filter(
          (item) => item.validity === ReportValidityFilter.VALID,
        ).length,
        complete: prepared.filter(
          (item) => item.completeness === ReportCompletenessFilter.COMPLETE,
        ).length,
          incomplete: prepared.filter(
            (item) => item.completeness === ReportCompletenessFilter.INCOMPLETE,
          ).length,
          mappable: located.length,
        unlocated: prepared.length - located.length,
      },
      unlocatedItems: prepared
        .filter((item) => !item.hasCoordinates)
        .slice(0, 20)
        .map(({ report, message, reportedAt }) => ({
          id: report.id,
          referenceNumber:
            report.referenceNumber ?? message?.referenceNumber ?? report.id,
          title: (message?.content ?? report.content ?? 'Laporan tanpa judul')
            .replace(/\s+/g, ' ')
            .slice(0, 100),
          reportedAt,
          jaring: {
            id: report.jaring.id,
            name:
              report.jaring.fullName ??
              report.jaring.aliasName ??
              'Identitas Jaring terbatas',
            code: report.jaring.aliasName,
            whatsappNumber: report.jaring.whatsappNumber,
            profilePhotoFileId: report.jaring.profilePhotoFileId,
            placementArea: report.jaring.areaCoverages?.[0]?.area ?? null,
            gaswilName:
              report.jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment
                ?.userProfile.fullName ?? null,
            gaswilAssignmentId:
              report.jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment?.id ?? null,
            gaswilUserProfileId:
              report.jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile.id ?? null,
          },
        })),
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
          {
            convertedSourceMessages: {
              some: {
                validationSummary: WhatsAppValidationSummary.VALID,
                reportSession: { isNot: null },
              },
            },
          },
          query.baketStatuses?.length
            ? { status: { in: query.baketStatuses } }
            : {},
          query.categoryIds?.length
            ? { reportCategoryId: { in: query.categoryIds } }
            : {},
          query.categoryCodes?.length
            ? { reportCategory: { code: { in: query.categoryCodes } } }
            : {},
          query.jaringIds?.length
            ? {
                OR: [
                  { primaryJaringId: { in: query.jaringIds } },
                  {
                    convertedSourceMessages: {
                      some: {
                        jaringId: { in: query.jaringIds },
                        validationSummary: WhatsAppValidationSummary.VALID,
                        reportSession: { isNot: null },
                      },
                    },
                  },
                ],
              }
            : {},
          query.fieldOfficerAssignmentIds?.length
            ? {
                OR: [
                  {
                    createdByFieldOfficerAssignmentId: {
                      in: query.fieldOfficerAssignmentIds,
                    },
                  },
                  {
                    primaryJaring: {
                      caretakerAssignments: {
                        some: {
                          isActive: true,
                          fieldOfficerAssignmentId: {
                            in: query.fieldOfficerAssignmentIds,
                          },
                        },
                      },
                    },
                  },
                  {
                    convertedSourceMessages: {
                      some: {
                        validationSummary: WhatsAppValidationSummary.VALID,
                        reportSession: {
                          is: {
                            fieldOfficerAssignmentId: {
                              in: query.fieldOfficerAssignmentIds,
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              }
            : {},
          filters.search
            ? {
                versions: {
                  some: {
                    OR: [
                      {
                        originalContent: {
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
        primaryJaring: {
          select: {
            id: true,
            aliasName: true,
            fullName: true,
            whatsappNumber: true,
            profilePhotoFileId: true,
            areaCoverages: {
              where: { validUntil: null },
              orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
              take: 1,
              select: {
                area: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    level: true,
                    parent: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                        level: true,
                        parent: {
                          select: {
                            id: true,
                            code: true,
                            name: true,
                            level: true,
                            parent: {
                              select: { id: true, code: true, name: true, level: true },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            caretakerAssignments: {
              where: { isActive: true },
              orderBy: { validFrom: 'desc' },
              take: 1,
              select: {
                fieldOfficerAssignment: {
                  select: {
                    id: true,
                    userProfile: { select: { id: true, fullName: true } },
                  },
                },
              },
            },
          },
        },
        convertedSourceMessages: {
          orderBy: { receivedAt: 'desc' },
          take: 3,
          select: {
            id: true,
            referenceNumber: true,
            reportSession: {
              select: { id: true, referenceNumber: true },
            },
          },
        },
        _count: { select: { convertedSourceMessages: true } },
        createdByFieldOfficerAssignment: {
          select: {
            id: true,
            branch: true,
            userProfile: { select: { id: true, fullName: true } },
            role: { select: { code: true, name: true } },
            areaScopes: {
              where: { validUntil: null },
              orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
              take: 1,
              select: {
                area: { select: { id: true, name: true } },
              },
            },
          },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            originalContent: true,
            versionNumber: true,
            eventAreaId: true,
            latitude: true,
            longitude: true,
            locationCapturedAt: true,
            coordinateSource: true,
            areaResolutionMethod: true,
            areaResolutionConfidence: true,
            urgency: true,
            coverageValidationStatus: true,
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
    });

    const withVersions = candidates.map((baket) => ({
      baket,
      version: baket.versions[0] ?? null,
    }));
    const located = withVersions.filter(
      ({ version }) =>
        version && this.validCoordinates(version.latitude, version.longitude),
    );
    const matchedByVersion = await this.spatial.matchCoordinates(
      located.map(({ version }) => ({
        id: version!.id,
        latitude: Number(version!.latitude),
        longitude: Number(version!.longitude),
      })),
    );

    const prepared = withVersions
      .map(({ baket, version }) => {
        const hasCoordinates = Boolean(
          version && this.validCoordinates(version.latitude, version.longitude),
        );
        const spatialAreas = version
          ? (matchedByVersion.get(version.id) ?? [])
          : [];
        const fallbackAreas = this.getFallbackAreas(version?.eventArea ?? null);
        const areas = spatialAreas.length ? spatialAreas : fallbackAreas;
        return {
          baket,
          version,
          areas,
          hasCoordinates,
          hasSpatialMatch: spatialAreas.length > 0,
        };
      })
      .filter(({ baket, version, areas, hasCoordinates }) => {
        const reportedAt = version?.createdAt ?? baket.createdAt;
        return (
          this.matchesDate(reportedAt, filters.from, filters.to) &&
          (!query.urgencies?.length ||
            (version && query.urgencies.includes(version.urgency))) &&
          (query.hasCoordinates === undefined ||
            query.hasCoordinates === hasCoordinates) &&
          (!query.coordinateSources?.length ||
            (version?.coordinateSource &&
              query.coordinateSources.includes(version.coordinateSource))) &&
          (!query.locationSuitability?.length ||
            (version &&
              query.locationSuitability.includes(
                this.reportLocationSuitability(
                  version.coverageValidationStatus,
                ),
              ))) &&
          this.matchesArea(areas, query)
        );
      });

    const features = prepared
      .filter(
        ({ version, hasCoordinates }) =>
          version &&
          hasCoordinates &&
          this.isInViewport(
            Number(version.latitude),
            Number(version.longitude),
            filters.viewport,
          ),
      )
      .slice(0, query.limitPerType)
      .map(({ baket, version, areas, hasSpatialMatch }): MapFeature => {
        const categoryCode = baket.reportCategory?.code ?? 'uncategorized';
        const visibleAreas = this.visibleAreas(areas, query);
        const primaryArea = visibleAreas[0] ?? null;
        const normalizedContent = (version.originalContent ?? '')
          .replace(/\s+/g, ' ')
          .trim();
        const words = normalizedContent.split(' ');
        const fieldOfficer = baket.createdByFieldOfficerAssignment;
        const assignmentArea = fieldOfficer.areaScopes[0]?.area;
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
            displayTitle: normalizedContent
              ? `${words.slice(0, 6).join(' ')}${words.length > 6 ? '…' : ''}`
              : 'Baket tanpa isi',
            status: baket.status,
            urgency: version.urgency,
            category: baket.reportCategory,
            reportedAt: version.createdAt,
            locationCapturedAt: version.locationCapturedAt,
            coordinateSource: version.coordinateSource,
            areaResolutionMethod: hasSpatialMatch
              ? 'POLYGON_MATCH'
              : version.areaResolutionMethod,
            areaResolutionConfidence: version.areaResolutionConfidence,
            primaryArea,
            matchedAreas: visibleAreas,
            fieldOfficer: {
              assignmentId: fieldOfficer.id,
              userProfileId: fieldOfficer.userProfile.id,
              name: fieldOfficer.userProfile.fullName,
              positionTitle: fieldOfficer.role.name,
              unitId: assignmentArea?.id,
              unitName: assignmentArea?.name ?? fieldOfficer.branch,
            },
            jaring: baket.primaryJaring
              ? {
                  id: baket.primaryJaring.id,
                  name:
                    baket.primaryJaring.fullName ??
                    baket.primaryJaring.aliasName ??
                    'Identitas Jaring terbatas',
                  code: baket.primaryJaring.aliasName,
                  whatsappNumber: baket.primaryJaring.whatsappNumber,
                  profilePhotoFileId: baket.primaryJaring.profilePhotoFileId,
                  placementArea:
                    baket.primaryJaring.areaCoverages[0]?.area ?? null,
                  gaswilName:
                    baket.primaryJaring.caretakerAssignments[0]
                      ?.fieldOfficerAssignment.userProfile.fullName ?? null,
                  gaswilAssignmentId:
                    baket.primaryJaring.caretakerAssignments[0]
                      ?.fieldOfficerAssignment.id ?? null,
                  gaswilUserProfileId:
                    baket.primaryJaring.caretakerAssignments[0]
                      ?.fieldOfficerAssignment.userProfile.id ?? null,
                }
              : null,
            sourceReports: {
              total: baket._count?.convertedSourceMessages ?? 0,
              preview: (baket.convertedSourceMessages ?? []).map((source) => ({
                messageId: source.id,
                reportId: source.reportSession?.id ?? null,
                referenceNumber:
                  source.reportSession?.referenceNumber ??
                  source.referenceNumber ??
                  null,
              })),
            },
          },
        };
      });

    return {
      features,
      totalCount: prepared.length,
      unlocatedCount: prepared.filter((item) => !item.hasCoordinates).length,
    };
  }

  private async getAgentFeatures(
    query: MapMarkersQuery,
    context: AuthorizationContext,
    filters: ReturnType<MapMarkersService['normalizeFilters']>,
  ) {
    const scope = await this.scope.resolve(context);
    const scopedAssignmentIds = query.assignmentIds?.length
      ? scope.assignmentIds.filter((id) => query.assignmentIds!.includes(id))
      : scope.assignmentIds;
    const assignmentIds = query.fieldOfficerAssignmentIds?.length
      ? scopedAssignmentIds.filter((id) =>
          query.fieldOfficerAssignmentIds!.includes(id),
        )
      : scopedAssignmentIds;
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
    type AssignedJaring = {
      fieldOfficerAssignmentId: string;
      jaring: {
        id: string;
        aliasName: string | null;
        fullName: string | null;
        whatsappNumber: string;
        profilePhotoFileId: string | null;
        areaCoverages: Array<{
          area: {
            id: string;
            code: string;
            name: string;
            level: AdministrativeLevel;
            parent: {
              id: string;
              code: string;
              name: string;
              level: AdministrativeLevel;
              parent: {
                id: string;
                code: string;
                name: string;
                level: AdministrativeLevel;
                parent: {
                  id: string;
                  code: string;
                  name: string;
                  level: AdministrativeLevel;
                } | null;
              } | null;
            } | null;
          };
        }>;
      };
    };
    const caretakerAssignments: AssignedJaring[] =
      await this.prisma.jaringCaretakerAssignment.findMany({
        where: {
          fieldOfficerAssignmentId: {
            in: locations.map((location) => location.assignmentId),
          },
          isActive: true,
          validFrom: { lte: filters.now },
          OR: [{ validUntil: null }, { validUntil: { gt: filters.now } }],
          jaring: { deletedAt: null },
        },
        orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        select: {
          fieldOfficerAssignmentId: true,
          jaring: {
            select: {
              id: true,
              aliasName: true,
              fullName: true,
              whatsappNumber: true,
              profilePhotoFileId: true,
              areaCoverages: {
                where: { validUntil: null },
                orderBy: [{ isPrimary: 'desc' }, { validFrom: 'desc' }],
                take: 1,
                select: {
                  area: {
                    select: {
                      id: true,
                      code: true,
                      name: true,
                      level: true,
                      parent: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                          level: true,
                          parent: {
                            select: {
                              id: true,
                              code: true,
                              name: true,
                              level: true,
                              parent: {
                                select: {
                                  id: true,
                                  code: true,
                                  name: true,
                                  level: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    const jaringsByAssignment = new Map<string, AssignedJaring['jaring'][]>();
    for (const caretaker of caretakerAssignments) {
      const current = jaringsByAssignment.get(caretaker.fieldOfficerAssignmentId) ?? [];
      current.push(caretaker.jaring);
      jaringsByAssignment.set(caretaker.fieldOfficerAssignmentId, current);
    }

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
          (!query.jaringIds?.length ||
            (jaringsByAssignment.get(location.assignmentId) ?? []).some(
              (jaring) => query.jaringIds!.includes(jaring.id),
            )) &&
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
        const assignedJarings = (jaringsByAssignment.get(location.assignmentId) ?? []).map((jaring) => ({
          id: jaring.id,
          name: jaring.fullName ?? jaring.aliasName ?? 'Identitas Jaring terbatas',
          code: jaring.aliasName,
          whatsappNumber: jaring.whatsappNumber,
          profilePhotoFileId: jaring.profilePhotoFileId,
          placementArea: jaring.areaCoverages[0]?.area ?? null,
          gaswilName: location.userName,
          gaswilAssignmentId: location.assignmentId,
          gaswilUserProfileId: location.userProfileId,
        }));
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
            jaring: assignedJarings[0] ?? null,
            jarings: assignedJarings,
            jaringCount: assignedJarings.length,
          },
        };
      });

    return {
      features,
      unlocatedCount: Math.max(0, assignmentIds.length - locations.length),
      totalCount: assignmentIds.length,
    };
  }

  private validCoordinates(latitude: unknown, longitude: unknown) {
    if (latitude === null || latitude === undefined) return false;
    if (longitude === null || longitude === undefined) return false;
    const lat = Number(latitude);
    const lng = Number(longitude);
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !(lat === 0 && lng === 0)
    );
  }

  private reportValidity(
    message: {
      validationSummary?: WhatsAppValidationSummary | null;
      status?: WhatsAppMessageStatus | null;
    } | null,
  ): ReportValidityFilter {
    if (message?.validationSummary === WhatsAppValidationSummary.VALID) {
      return ReportValidityFilter.VALID;
    }
    if (
      message?.validationSummary === WhatsAppValidationSummary.INVALID ||
      message?.status === WhatsAppMessageStatus.UNDER_REVIEW
    ) {
      return ReportValidityFilter.NEEDS_REVIEW;
    }
    return ReportValidityFilter.WAITING;
  }

  private reportVerificationStatus(
    sessionStatus: string,
    message: {
      convertedBaketId?: string | null;
      validationSummary?: WhatsAppValidationSummary | null;
      status?: WhatsAppMessageStatus | null;
    } | null,
  ): JaringReportVerificationStatus {
    if (!message) {
      return sessionStatus === 'ACTIVE'
        ? 'IN_PROGRESS_BY_JARING'
        : 'NOT_SUBMITTED';
    }
    if (message.convertedBaketId) return 'METADATA_RECORDED';
    if (
      message.validationSummary === WhatsAppValidationSummary.VALID &&
      message.status === WhatsAppMessageStatus.READY_FOR_BAKET
    ) {
      return 'VERIFIED_BY_FIELD_OFFICER';
    }
    if (
      message.validationSummary === WhatsAppValidationSummary.INVALID ||
      message.status === WhatsAppMessageStatus.UNDER_REVIEW
    ) {
      return 'NEEDS_FIELD_OFFICER_REVIEW';
    }
    return 'WAITING_FIELD_OFFICER_VERIFICATION';
  }

  private reportCompleteness(
    message: {
      content?: string | null;
      senderPhone?: string | null;
      jaringId?: string | null;
      latitude?: unknown;
      longitude?: unknown;
      resolvedAreaId?: string | null;
      rawPayload?: unknown;
      _count?: { media?: number };
    } | null,
  ): ReportCompletenessFilter {
    if (!message) return ReportCompletenessFilter.INCOMPLETE;
    const rawPayload =
      message.rawPayload && typeof message.rawPayload === 'object'
        ? (message.rawPayload as Record<string, unknown>)
        : null;
    const hasPhoto =
      (message._count?.media ?? 0) > 0 || Boolean(rawPayload?.photoMessageId);
    return message.content !== null &&
      message.senderPhone !== '' &&
      Boolean(message.jaringId) &&
      message.latitude !== null &&
      message.longitude !== null &&
      Boolean(message.resolvedAreaId) &&
      hasPhoto
      ? ReportCompletenessFilter.COMPLETE
      : ReportCompletenessFilter.INCOMPLETE;
  }

  private reportLocationSuitability(
    status?: CoverageValidationStatus | null,
  ): ReportLocationSuitabilityFilter {
    if (status === CoverageValidationStatus.WITHIN_SCOPE) {
      return ReportLocationSuitabilityFilter.WITHIN_SCOPE;
    }
    if (status === CoverageValidationStatus.BORDER_AMBIGUOUS) {
      return ReportLocationSuitabilityFilter.BORDER_AMBIGUOUS;
    }
    if (
      status === CoverageValidationStatus.OUTSIDE_JARING_SCOPE ||
      status === CoverageValidationStatus.OUTSIDE_FIELD_OFFICER_SCOPE ||
      status === CoverageValidationStatus.OUTSIDE_FIELD_COORDINATOR_SCOPE ||
      status === CoverageValidationStatus.OUTSIDE_UNIT_SCOPE
    ) {
      return ReportLocationSuitabilityFilter.OUTSIDE_SCOPE;
    }
    return ReportLocationSuitabilityFilter.NOT_DETERMINED;
  }

  private reportColor(completeness: ReportCompletenessFilter) {
    if (completeness === ReportCompletenessFilter.COMPLETE) return '#16a34a';
    if (completeness === ReportCompletenessFilter.INCOMPLETE) return '#f97316';
    return '#64748b';
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
