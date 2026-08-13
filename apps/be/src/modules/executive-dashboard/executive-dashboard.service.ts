/*
 * PrismaService exposes model delegates through a compatibility wrapper typed as
 * `any`. Keep unsafe-access rules disabled only in this adapter-heavy service;
 * the public dashboard contract and every mapped response remain explicitly typed.
 */
/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import { SYSTEM_ROLES } from '../../common/constants/system-role.js';
import { sortReportCategories } from '../../common/report-category-order.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  BaketStatus,
  CoverageValidationStatus,
  Prisma,
  RoleCode,
  VerificationStatus,
  WhatsAppReportSessionStatus,
} from '../../generated/prisma/client.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import {
  ApplicationCacheService,
  authorizationScopeIdentity,
} from '../cache/application-cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ExecutiveDashboardFilterQueryDto,
  ExecutiveDashboardPeriod,
  ExecutiveDashboardQueryDto,
} from './executive-dashboard.dto.js';
import {
  comparison,
  EXECUTIVE_DASHBOARD_METRICS,
  type DashboardDateRange,
} from './executive-dashboard.metrics.js';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const JARING_ACTIVITY_WINDOW_DAYS = 90;
const OUTSIDE_COVERAGE_STATUSES = [
  CoverageValidationStatus.OUTSIDE_JARING_SCOPE,
  CoverageValidationStatus.OUTSIDE_FIELD_OFFICER_SCOPE,
  CoverageValidationStatus.OUTSIDE_FIELD_COORDINATOR_SCOPE,
  CoverageValidationStatus.OUTSIDE_UNIT_SCOPE,
];

const dashboardAreaWithParentsSelect = {
  id: true,
  name: true,
  level: true,
  parent: {
    select: {
      id: true,
      name: true,
      level: true,
      parent: {
        select: {
          id: true,
          name: true,
          level: true,
          parent: {
            select: {
              id: true,
              name: true,
              level: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AdministrativeAreaSelect;

const dashboardReportSelect = {
  id: true,
  referenceNumber: true,
  content: true,
  senderPhone: true,
  status: true,
  submittedAt: true,
  startedAt: true,
  updatedAt: true,
  latitude: true,
  longitude: true,
  fieldOfficerAssignmentId: true,
  fieldOfficerAssignment: {
    select: {
      role: { select: { code: true, name: true } },
      userProfile: { select: { id: true, fullName: true, username: true } },
      areaScopes: {
        where: { validUntil: null },
        orderBy: [
          { isPrimary: 'desc' as const },
          { createdAt: 'asc' as const },
        ],
        take: 1,
        select: { area: { select: { id: true, name: true, level: true } } },
      },
    },
  },
  jaring: {
    select: {
      id: true,
      aliasName: true,
      fullName: true,
      registrationStatus: true,
      caretakerAssignments: {
        where: { isActive: true, validUntil: null },
        orderBy: { validFrom: 'desc' as const },
        take: 1,
        select: {
          fieldOfficerAssignment: {
            select: {
              id: true,
              userProfile: { select: { id: true, fullName: true, username: true } },
            },
          },
        },
      },
      areaCoverages: {
        where: { validUntil: null },
        orderBy: [
          { isPrimary: 'desc' as const },
          { validFrom: 'desc' as const },
        ],
        take: 1,
        select: { area: { select: { id: true, name: true, level: true } } },
      },
    },
  },
  media: {
    where: { deletedAt: null },
    select: { id: true, mediaType: true },
  },
  submittedMessage: {
    select: {
      content: true,
      senderPhone: true,
      jaringId: true,
      latitude: true,
      longitude: true,
      resolvedAreaId: true,
      rawPayload: true,
      status: true,
      validationSummary: true,
      coordinateSource: true,
      category: { select: { id: true, name: true } },
      resolvedArea: { select: { id: true, name: true, level: true } },
      _count: { select: { media: true } },
      convertedBaket: {
        select: {
          id: true,
          status: true,
          currentVersionNumber: true,
          reportCategory: { select: { id: true, name: true } },
          revisionRequests: {
            where: { status: { in: ['OPEN', 'IN_PROGRESS', 'RESUBMITTED'] } },
            select: { id: true, dueDate: true, status: true },
          },
          versions: {
            orderBy: { versionNumber: 'desc' as const },
            take: 1,
            select: {
              urgency: true,
              coverageValidationStatus: true,
              coordinateSource: true,
              attachments: { select: { fileId: true } },
              verification: { select: { status: true, completedAt: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.WhatsAppReportSessionSelect;

type DashboardReport = Prisma.WhatsAppReportSessionGetPayload<{
  select: typeof dashboardReportSelect;
}>;

const dashboardJaringSelect = {
  id: true,
  aliasName: true,
  fullName: true,
  status: true,
  registrationStatus: true,
  registeredAt: true,
  createdAt: true,
  messages: {
    orderBy: { receivedAt: 'desc' as const },
    take: 1,
    select: { receivedAt: true },
  },
  reportSessions: {
    where: { submittedAt: { not: null } },
    orderBy: { submittedAt: 'desc' as const },
    take: 1,
    select: { submittedAt: true },
  },
  caretakerAssignments: {
    where: { isActive: true, validUntil: null },
    orderBy: { validFrom: 'desc' as const },
    take: 1,
    select: {
      fieldOfficerAssignment: {
        select: {
          id: true,
          userProfile: { select: { id: true, fullName: true, username: true } },
          areaScopes: {
            where: { validUntil: null },
            orderBy: [
              { isPrimary: 'desc' as const },
              { createdAt: 'asc' as const },
            ],
            take: 1,
            select: { area: { select: { id: true, name: true, level: true } } },
          },
        },
      },
    },
  },
  areaCoverages: {
    where: { validUntil: null },
    orderBy: [{ isPrimary: 'desc' as const }, { validFrom: 'desc' as const }],
    take: 1,
    select: { area: { select: dashboardAreaWithParentsSelect } },
  },
} satisfies Prisma.JaringSelect;

type DashboardJaring = Prisma.JaringGetPayload<{
  select: typeof dashboardJaringSelect;
}>;

const dashboardTaskSelect = {
  id: true,
  title: true,
  priority: true,
  status: true,
  dueDate: true,
  createdAt: true,
  ownerAssignment: {
    select: {
      id: true,
      role: { select: { code: true, name: true } },
      userProfile: { select: { fullName: true, username: true } },
    },
  },
  targetAreas: {
    orderBy: { isPrimary: 'desc' as const },
    take: 1,
    select: { area: { select: { id: true, name: true, level: true } } },
  },
  assignments: {
    orderBy: { assignedAt: 'desc' as const },
    select: {
      id: true,
      status: true,
      dueDate: true,
      assigneeAssignmentId: true,
      assignee: {
        select: {
          role: { select: { code: true, name: true } },
          userProfile: { select: { fullName: true, username: true } },
        },
      },
      progressLogs: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        select: { progressPercent: true, createdAt: true },
      },
    },
  },
} satisfies Prisma.TaskSelect;

type DashboardTask = Prisma.TaskGetPayload<{
  select: typeof dashboardTaskSelect;
}>;

const dashboardDirectiveSelect = {
  id: true,
  commandNumber: true,
  status: true,
  createdAt: true,
  ownerAssignment: {
    select: {
      id: true,
      role: { select: { code: true, name: true } },
      userProfile: { select: { fullName: true, username: true } },
    },
  },
  versions: {
    orderBy: { versionNumber: 'desc' as const },
    take: 1,
    select: {
      commandDescription: true,
      urgency: true,
      dueDate: true,
      targetAreas: {
        orderBy: { isPrimary: 'desc' as const },
        take: 1,
        select: { area: { select: { id: true, name: true, level: true } } },
      },
      recipients: {
        select: {
          targetAssignmentId: true,
          status: true,
          targetAssignment: {
            select: {
              role: { select: { code: true, name: true } },
              userProfile: { select: { fullName: true, username: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.DirectiveSelect;

type DashboardDirective = Prisma.DirectiveGetPayload<{
  select: typeof dashboardDirectiveSelect;
}>;

const dashboardProductSelect = {
  id: true,
  title: true,
  productNumber: true,
  productTypeId: true,
  status: true,
  createdAt: true,
} satisfies Prisma.IntelligenceProductSelect;

type DashboardProduct = Prisma.IntelligenceProductGetPayload<{
  select: typeof dashboardProductSelect;
}>;

type DashboardCounts = ReturnType<ExecutiveDashboardService['countReports']>;

@Injectable()
export class ExecutiveDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: DomainScopeService,
    private readonly cache: ApplicationCacheService,
  ) {}

  async dashboard(
    query: ExecutiveDashboardQueryDto,
    context: AuthorizationContext,
  ) {
    const range = this.resolvePeriod(query);
    return this.cache.getOrSet(
      {
        namespace: 'executive-dashboard-v1',
        identity: {
          scope: authorizationScopeIdentity(context),
          query,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        },
        ttlMs: 15_000,
      },
      () => this.loadDashboard(query, context, range),
    );
  }

  async filters(
    query: ExecutiveDashboardFilterQueryDto,
    context: AuthorizationContext,
  ) {
    if (query.areaId) await this.scope.assertArea(context, query.areaId);
    const resolvedScope = await this.scope.resolve(context);
    const search = query.search?.trim();
    const jaringWhere = await this.scope.jaringWhere(context);
    const jaringFilterWhere: Prisma.JaringWhereInput = {
      ...jaringWhere,
      ...(query.areaId
        ? {
            areaCoverages: {
              some: {
                validUntil: null,
                area: {
                  OR: [
                    { id: query.areaId },
                    {
                      descendantLinks: {
                        some: { ancestorId: query.areaId },
                      },
                    },
                  ],
                },
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { aliasName: { contains: search, mode: 'insensitive' } },
              { fullName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const areaConstraint = query.areaId
      ? {
          areaScopes: {
            some: {
              validUntil: null,
              area: {
                OR: [
                  { id: query.areaId },
                  { descendantLinks: { some: { ancestorId: query.areaId } } },
                ],
              },
            },
          },
        }
      : {};

    const [categories, productTypes, areaTree, officers, jaring, totalJaring] =
      await Promise.all([
        this.prisma.reportCategory.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true },
        }),
        this.prisma.productTypeDefinition.findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: { id: true, code: true, name: true },
        }),
        this.scope.areaTree(context),
        this.prisma.userOperationalAssignment.findMany({
          where: {
            id: { in: resolvedScope.assignmentIds },
            isActive: true,
            validUntil: null,
            role: { code: RoleCode.FIELD_OFFICER },
            ...areaConstraint,
            ...(search
              ? {
                  userProfile: {
                    OR: [
                      { fullName: { contains: search, mode: 'insensitive' } },
                      { username: { contains: search, mode: 'insensitive' } },
                    ],
                  },
                }
              : {}),
          },
          take: query.limit,
          orderBy: { userProfile: { fullName: 'asc' } },
          select: {
            id: true,
            userProfile: { select: { fullName: true, username: true } },
          },
        }),
        this.prisma.jaring.findMany({
          where: jaringFilterWhere,
          take: query.limit,
          orderBy: [{ aliasName: 'asc' }, { fullName: 'asc' }],
          select: { id: true, aliasName: true, fullName: true },
        }),
        this.prisma.jaring.count({ where: jaringFilterWhere }),
      ]);

    return {
      scope: this.scope.scopeSummary(context),
      categories: sortReportCategories(categories),
      productTypes,
      areaTree,
      fieldOfficers: (
        officers as Array<{
          id: string;
          userProfile: { fullName: string | null; username: string };
        }>
      ).map((officer) => ({
        id: officer.id,
        name: officer.userProfile.fullName ?? officer.userProfile.username,
      })),
      jaring: {
        items: (
          jaring as Array<{
            id: string;
            aliasName: string | null;
            fullName: string | null;
          }>
        ).map((item) => ({
          id: item.id,
          name: item.aliasName ?? item.fullName ?? item.id,
        })),
        total: totalJaring,
        truncated: totalJaring > jaring.length,
      },
      options: {
        urgency: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
        reportStatus: Object.values(WhatsAppReportSessionStatus),
        verificationStatus: [],
        workflowStatus: Object.values(BaketStatus),
        validationStatus: Object.values(VerificationStatus),
        coordinateSource: [
          'WHATSAPP_LOCATION',
          'DEVICE_GPS',
          'MANUAL_PIN',
          'MANUAL_COORDINATE',
          'CORRECTED_BY_FIELD_OFFICER',
          'SYSTEM_DERIVED',
        ],
        locationSuitability: [
          'WITHIN_SCOPE',
          'OUTSIDE_SCOPE',
          'BORDER_AMBIGUOUS',
          'NOT_CHECKED',
        ],
        source: ['WHATSAPP'],
      },
      unavailableFilters: [],
    };
  }

  private async loadDashboard(
    query: ExecutiveDashboardQueryDto,
    context: AuthorizationContext,
    range: DashboardDateRange,
  ) {
    const [
      currentWhere,
      previousWhere,
      productWhere,
      resolvedScope,
      jaringScope,
    ] = await Promise.all([
      this.reportWhere(query, context, range.from, range.to),
      this.reportWhere(query, context, range.previousFrom, range.previousTo),
      this.scope.productWhere(context),
      this.scope.resolve(context),
      this.scope.jaringWhere(context),
    ]);

    const productCurrentWhere: Prisma.IntelligenceProductWhereInput = {
      ...productWhere,
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(query.productTypeId ? { productTypeId: query.productTypeId } : {}),
      ...(query.areaId
        ? { AND: [this.productAreaFilter(query.areaId)] }
        : {}),
    };
    const productPreviousWhere: Prisma.IntelligenceProductWhereInput = {
      ...productWhere,
      deletedAt: null,
      createdAt: { gte: range.previousFrom, lte: range.previousTo },
      ...(query.productTypeId ? { productTypeId: query.productTypeId } : {}),
      ...(query.areaId
        ? { AND: [this.productAreaFilter(query.areaId)] }
        : {}),
    };
    const scopedJaringWhere: Prisma.JaringWhereInput = {
      ...jaringScope,
      ...(query.jaringId ? { id: query.jaringId } : {}),
      ...(query.fieldOfficerAssignmentId
        ? {
            caretakerAssignments: {
              some: {
                isActive: true,
                validUntil: null,
                fieldOfficerAssignmentId: query.fieldOfficerAssignmentId,
              },
            },
          }
        : {}),
      ...(query.areaId
        ? {
            areaCoverages: {
              some: {
                validUntil: null,
                area: {
                  OR: [
                    { id: query.areaId },
                    {
                      descendantLinks: { some: { ancestorId: query.areaId } },
                    },
                  ],
                },
              },
            },
          }
        : {}),
    };
    const taskWhere: Prisma.TaskWhereInput = {
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(query.areaId ? { targetAreas: { some: this.targetAreaFilter(query.areaId) } } : {}),
      OR: [
        { ownerAssignmentId: { in: resolvedScope.assignmentIds } },
        {
          assignments: {
            some: { assigneeAssignmentId: { in: resolvedScope.assignmentIds } },
          },
        },
      ],
    };
    const directiveWhere: Prisma.DirectiveWhereInput = {
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
      ...(query.areaId
        ? {
            versions: {
              some: {
                targetAreas: { some: this.targetAreaFilter(query.areaId) },
              },
            },
          }
        : {}),
      OR: [
        { ownerAssignmentId: { in: resolvedScope.assignmentIds } },
        {
          versions: {
            some: {
              recipients: {
                some: {
                  targetAssignmentId: { in: resolvedScope.assignmentIds },
                },
              },
            },
          },
        },
      ],
    };

    const [
      reports,
      previousReports,
      products,
      previousProductCount,
      networkJaring,
      tasks,
      directives,
      pendingApprovals,
    ] = await Promise.all([
      this.prisma.whatsAppReportSession.findMany({
        where: currentWhere,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        select: dashboardReportSelect,
      }),
      this.prisma.whatsAppReportSession.findMany({
        where: previousWhere,
        select: dashboardReportSelect,
      }),
      this.prisma.intelligenceProduct.findMany({
        where: productCurrentWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: dashboardProductSelect,
      }),
      this.prisma.intelligenceProduct.count({ where: productPreviousWhere }),
      this.prisma.jaring.findMany({
        where: scopedJaringWhere,
        orderBy: [{ aliasName: 'asc' }, { fullName: 'asc' }],
        select: dashboardJaringSelect,
      }),
      this.prisma.task.findMany({
        where: taskWhere,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        select: dashboardTaskSelect,
      }),
      this.prisma.directive.findMany({
        where: directiveWhere,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: dashboardDirectiveSelect,
      }),
      this.prisma.productApprovalStep.count({
        where: {
          targetAssignmentId: context.primaryAssignmentId,
          status: { in: ['ACTIVE', 'WAITING'] },
        },
      }),
    ]);

    const currentReports = reports as DashboardReport[];
    const comparisonReports = previousReports as DashboardReport[];
    const scopedProducts = products as DashboardProduct[];
    const scopedJaring = networkJaring as DashboardJaring[];
    const scopedTasks = tasks as DashboardTask[];
    const scopedDirectives = directives as DashboardDirective[];
    const currentCounts = this.countReports(currentReports);
    const previousCounts = this.countReports(comparisonReports);
    const productCount = scopedProducts.length;
    const cards = this.buildCards(
      currentCounts,
      previousCounts,
      productCount,
      previousProductCount,
      pendingApprovals,
      context,
    );
    const reportViews = this.reportViews(currentReports);
    const recentActivity = await this.recentActivity({
      reports: currentReports,
      products: scopedProducts,
      tasks: scopedTasks,
      directives: scopedDirectives,
      from: range.from,
      to: range.to,
    });

    return {
      generatedAt: new Date().toISOString(),
      period: {
        preset: range.period,
        timezone: range.timezone,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        previousFrom: range.previousFrom.toISOString(),
        previousTo: range.previousTo.toISOString(),
      },
      scope: this.scope.scopeSummary(context),
      appliedFilters: this.appliedFilters(query),
      metrics: EXECUTIVE_DASHBOARD_METRICS,
      overview: {
        cards,
        attention: this.attentionItems(currentReports).slice(0, 8),
      },
      analytics: {
        trend: this.reportTrend(currentReports, range),
        workflow: this.distribution(
          currentReports,
          (report) =>
            report.submittedMessage?.convertedBaket?.status ?? 'LAPORAN_JARING',
        ),
        reportStage: this.distribution(currentReports, (report) =>
          this.reportStage(report),
        ),
        urgency: this.distribution(
          currentReports,
          (report) => this.latestVersion(report)?.urgency ?? 'NOT_DETERMINED',
        ),
        categories: this.distribution(
          currentReports,
          (report) => this.category(report)?.name ?? 'Tanpa kategori',
          (report) => this.category(report)?.id ?? 'uncategorized',
        ).slice(0, 10),
        source: [
          {
            key: 'WHATSAPP',
            label: 'WhatsApp',
            value: currentReports.length,
          },
        ],
        attachments: this.distribution(currentReports, (report) =>
          this.hasAttachment(report) ? 'WITH_ATTACHMENT' : 'WITHOUT_ATTACHMENT',
        ),
        locationSuitability: this.distribution(currentReports, (report) =>
          this.locationState(report),
        ),
        locationSource: this.distribution(
          currentReports,
          (report) =>
            report.submittedMessage?.coordinateSource ??
            this.latestVersion(report)?.coordinateSource ??
            'NOT_DETERMINED',
        ),
        products: {
          total: productCount,
          byStatus: this.distribution(
            scopedProducts,
            (product) => product.status,
          ),
        },
        dataQuality: this.dataQuality(currentReports, scopedJaring),
      },
      operations: {
        networkSummary: this.networkSummary(
          scopedJaring,
          currentReports,
          range,
        ),
        regionalRanking: this.regionalRanking(
          currentReports,
          scopedJaring,
        ).slice(0, 20),
        jaringRanking: this.jaringRanking(currentReports, scopedJaring).slice(
          0,
          20,
        ),
        fieldOfficerRanking: this.fieldOfficerRanking(
          currentReports,
          scopedJaring,
        ).slice(0, 20),
        unavailableRankings: [
          {
            key: 'korwil',
            label: 'Peringkat Korwil',
            reason:
              'Relasi atasan Korwil ke Gaswil tidak tersedia sebagai foreign key yang aman untuk atribusi.',
          },
          {
            key: 'binda',
            label: 'Peringkat Binda',
            reason:
              'Entitas profil Binda aktif sudah tidak tersedia pada schema; agregasi berdasarkan nama tidak dilakukan.',
          },
        ],
        priorityReports: reportViews.mostUrgent,
        reportViews,
        recentActivity,
        followUp: this.followUpSummary(
          scopedTasks,
          scopedDirectives,
          pendingApprovals,
        ),
      },
      availability: {
        reports: true,
        bakets: true,
        informationProducts: true,
        organizationHierarchy: false,
        maps: false,
      },
    };
  }

  private async reportWhere(
    query: ExecutiveDashboardQueryDto,
    context: AuthorizationContext,
    from: Date,
    to: Date,
  ): Promise<Prisma.WhatsAppReportSessionWhereInput> {
    if (query.areaId) await this.scope.assertArea(context, query.areaId);
    const [jaringScope, resolvedScope] = await Promise.all([
      this.scope.jaringWhere(context),
      this.scope.resolve(context),
    ]);
    const currentVersionBaketIds = await this.currentVersionBaketIds(query);
    if (
      query.fieldOfficerAssignmentId &&
      !resolvedScope.assignmentIds.includes(query.fieldOfficerAssignmentId)
    ) {
      throw new ApiException(
        'DASHBOARD_FILTER_OUTSIDE_SCOPE',
        'Filter Petugas Wilayah berada di luar cakupan pengguna.',
        404,
      );
    }

    const messageFilters: Prisma.WhatsAppMessageWhereInput[] = [];
    if (query.categoryId) {
      messageFilters.push({
        convertedBaket: { is: { reportCategoryId: query.categoryId } },
      });
    }
    if (query.areaId) {
      messageFilters.push({
        resolvedArea: {
          is: {
            OR: [
              { id: query.areaId },
              { descendantLinks: { some: { ancestorId: query.areaId } } },
            ],
          },
        },
      });
    }
    if (query.workflowStatus) {
      messageFilters.push({
        convertedBaket: { is: { status: query.workflowStatus } },
      });
    }
    if (query.coordinateSource) {
      messageFilters.push({ coordinateSource: query.coordinateSource });
    }
    if (currentVersionBaketIds) {
      messageFilters.push({ convertedBaketId: { in: currentVersionBaketIds } });
    }

    return {
      AND: [
        {
          jaring: {
            ...jaringScope,
            ...(query.jaringId ? { id: query.jaringId } : {}),
          },
        },
        { submittedMessage: { isNot: null } },
        {
          OR: [
            { submittedAt: { gte: from, lte: to } },
            { submittedAt: null, startedAt: { gte: from, lte: to } },
          ],
        },
        ...(query.reportStatus ? [{ status: query.reportStatus }] : []),
        ...(query.fieldOfficerAssignmentId
          ? [{ fieldOfficerAssignmentId: query.fieldOfficerAssignmentId }]
          : []),
        ...(query.hasAttachment === 'true'
          ? [
              {
                OR: [
                  { media: { some: { deletedAt: null } } },
                  {
                    submittedMessage: {
                      is: {
                        convertedBaket: {
                          is: {
                            versions: {
                              some: { attachments: { some: {} } },
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ]
          : query.hasAttachment === 'false'
            ? [
                {
                  AND: [
                    { media: { none: { deletedAt: null } } },
                    {
                      submittedMessage: {
                        is: {
                          OR: [
                            { convertedBaketId: null },
                            {
                              convertedBaket: {
                                is: {
                                  versions: {
                                    none: { attachments: { some: {} } },
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              ]
            : []),
        ...(messageFilters.length
          ? [{ submittedMessage: { is: { AND: messageFilters } } }]
          : []),
      ],
    };
  }

  private areaWithinFilter(areaId: string): Prisma.AdministrativeAreaWhereInput {
    return {
      OR: [
        { id: areaId },
        { descendantLinks: { some: { ancestorId: areaId } } },
      ],
    };
  }

  private targetAreaFilter(areaId: string) {
    return { area: { is: this.areaWithinFilter(areaId) } };
  }

  private productAreaFilter(areaId: string): Prisma.IntelligenceProductWhereInput {
    return {
      versions: {
        some: {
          sourceVerifications: {
            some: {
              verification: {
                baketVersion: {
                  eventArea: { is: this.areaWithinFilter(areaId) },
                },
              },
            },
          },
        },
      },
    };
  }

  private async currentVersionBaketIds(query: ExecutiveDashboardQueryDto) {
    if (
      !query.urgency &&
      !query.validationStatus &&
      !query.locationSuitability
    ) {
      return null;
    }
    const conditions: Prisma.Sql[] = [];
    if (query.urgency) {
      conditions.push(
        Prisma.sql`bv.urgency = ${query.urgency}::"PriorityLevel"`,
      );
    }
    if (query.validationStatus) {
      conditions.push(
        Prisma.sql`verification.status = ${query.validationStatus}::"VerificationStatus"`,
      );
    }
    if (query.locationSuitability === 'OUTSIDE_SCOPE') {
      conditions.push(
        Prisma.sql`bv."coverageValidationStatus" IN (${Prisma.join(
          OUTSIDE_COVERAGE_STATUSES.map(
            (status) => Prisma.sql`${status}::"CoverageValidationStatus"`,
          ),
        )})`,
      );
    } else if (query.locationSuitability) {
      conditions.push(
        Prisma.sql`bv."coverageValidationStatus" = ${query.locationSuitability}::"CoverageValidationStatus"`,
      );
    }
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT b.id
      FROM "Baket" b
      JOIN "BaketVersion" bv
        ON bv."baketId" = b.id
       AND bv."versionNumber" = b."currentVersionNumber"
      LEFT JOIN "BaketVerification" verification
        ON verification."baketVersionId" = bv.id
      WHERE b."deletedAt" IS NULL
        AND ${Prisma.join(conditions, ' AND ')}
    `);
    return rows.map((row) => row.id);
  }

  private completeMessageWhere(): Prisma.WhatsAppMessageWhereInput {
    return {
      content: { not: null },
      senderPhone: { not: '' },
      jaringId: { not: null },
      latitude: { not: null },
      longitude: { not: null },
      resolvedAreaId: { not: null },
      OR: [
        { media: { some: {} } },
        {
          rawPayload: {
            path: ['photoMessageId'],
            not: Prisma.AnyNull,
          },
        },
      ],
    };
  }

  private hasAttachment(report: DashboardReport) {
    return (
      report.media.length > 0 ||
      (this.latestVersion(report)?.attachments.length ?? 0) > 0
    );
  }

  private latestVersion(report: DashboardReport) {
    return report.submittedMessage?.convertedBaket?.versions[0] ?? null;
  }

  private category(report: DashboardReport) {
    return (
      report.submittedMessage?.convertedBaket?.reportCategory ??
      null
    );
  }

  private reportStage(report: DashboardReport) {
    const message = report.submittedMessage;
    if (!message) {
      return report.status === WhatsAppReportSessionStatus.ACTIVE
        ? 'IN_PROGRESS_BY_JARING'
        : 'NOT_SUBMITTED';
    }
    return message.convertedBaket ? 'BAKET_CREATED' : 'READY_FOR_BAKET';
  }

  private locationState(report: DashboardReport) {
    const status = this.latestVersion(report)?.coverageValidationStatus;
    if (!status || status === CoverageValidationStatus.NOT_CHECKED) {
      return 'NOT_CHECKED';
    }
    if (
      OUTSIDE_COVERAGE_STATUSES.some(
        (outsideStatus) => outsideStatus === status,
      )
    ) {
      return 'OUTSIDE_SCOPE';
    }
    return status;
  }

  private countReports(reports: DashboardReport[]) {
    const counts = {
      totalReports: reports.length,
      baketCreatedReports: 0,
      draftBakets: 0,
      validatedBakets: 0,
      urgentReports: 0,
      readyForBaket: 0,
      needsReview: 0,
    };
    for (const report of reports) {
      const baket = report.submittedMessage?.convertedBaket;
      if (baket) counts.baketCreatedReports += 1;
      else counts.readyForBaket += 1;
      if (baket?.status === BaketStatus.VERIFIED) counts.validatedBakets += 1;
      else if (baket) counts.draftBakets += 1;
      if (this.latestVersion(report)?.urgency === 'URGENT') {
        counts.urgentReports += 1;
      }
    }
    return counts;
  }

  private buildCards(
    current: DashboardCounts,
    previous: DashboardCounts,
    productCount: number,
    previousProductCount: number,
    pendingApprovals: number,
    context: AuthorizationContext,
  ) {
    const metricByKey = new Map(
      EXECUTIVE_DASHBOARD_METRICS.map((metric) => [metric.key, metric]),
    );
    const percent = (value: number) =>
      current.totalReports === 0
        ? 0
        : Math.round((value / current.totalReports) * 1000) / 10;
    const actionRequired =
      context.authRole === SYSTEM_ROLES.FIELD_COORDINATOR
        ? current.readyForBaket + current.needsReview
        : current.needsReview + pendingApprovals;

    const decorate = (value: {
      key: string;
      value: number;
      share: number | null;
      comparison: ReturnType<typeof comparison> | null;
      tone: string;
    }) => ({ ...metricByKey.get(value.key), ...value });
    const card = (
      key: keyof DashboardCounts,
      options?: { percent?: boolean; tone?: string },
    ) =>
      decorate({
        key,
        value: current[key],
        share: options?.percent ? percent(current[key]) : null,
        comparison: comparison(current[key], previous[key]),
        tone: options?.tone ?? 'neutral',
      });
    return [
      card('totalReports'),
      card('baketCreatedReports', { percent: true, tone: 'positive' }),
      card('draftBakets'),
      card('validatedBakets', { tone: 'positive' }),
      decorate({
        key: 'informationProducts',
        value: productCount,
        share: null,
        comparison: comparison(productCount, previousProductCount),
        tone: 'neutral',
      }),
      card('urgentReports', { tone: 'danger' }),
      decorate({
        key: 'waitingAction',
        value: actionRequired,
        share: null,
        comparison: null,
        tone: actionRequired > 0 ? 'warning' : 'neutral',
      }),
    ];
  }

  private distribution<T>(
    items: T[],
    label: (item: T) => string,
    key: (item: T) => string = label,
  ) {
    const values = new Map<
      string,
      { key: string; label: string; value: number }
    >();
    for (const item of items) {
      const itemKey = key(item);
      const existing = values.get(itemKey);
      if (existing) existing.value += 1;
      else values.set(itemKey, { key: itemKey, label: label(item), value: 1 });
    }
    return [...values.values()].sort((a, b) => b.value - a.value);
  }

  private reportTrend(reports: DashboardReport[], range: DashboardDateRange) {
    const durationDays = Math.max(
      1,
      Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000),
    );
    const granularity =
      durationDays <= 45 ? 'day' : durationDays <= 370 ? 'month' : 'year';
    const buckets = new Map<
      string,
      {
        bucket: string;
        total: number;
        verified: number;
      }
    >();
    for (const report of reports) {
      const date = report.submittedAt ?? report.startedAt;
      const jakarta = new Date(date.getTime() + JAKARTA_OFFSET_MS);
      const year = jakarta.getUTCFullYear();
      const month = String(jakarta.getUTCMonth() + 1).padStart(2, '0');
      const day = String(jakarta.getUTCDate()).padStart(2, '0');
      const bucket =
        granularity === 'day'
          ? `${year}-${month}-${day}`
          : granularity === 'month'
            ? `${year}-${month}-01`
            : `${year}-01-01`;
      const item = buckets.get(bucket) ?? {
        bucket,
        total: 0,
        verified: 0,
      };
      item.total += 1;
      if (this.reportStage(report) === 'BAKET_CREATED') item.verified += 1;
      buckets.set(bucket, item);
    }
    return {
      granularity,
      points: [...buckets.values()].sort((a, b) =>
        a.bucket.localeCompare(b.bucket),
      ),
    };
  }

  private percentage(value: number, total: number) {
    return total === 0 ? 0 : Math.round((value / total) * 1000) / 10;
  }

  private latestJaringReportAt(jaring: DashboardJaring) {
    const latestMessageAt = jaring.messages[0]?.receivedAt?.getTime() ?? null;
    const latestSessionAt = jaring.reportSessions[0]?.submittedAt?.getTime() ?? null;
    if (latestMessageAt === null && latestSessionAt === null) return null;
    return new Date(Math.max(latestMessageAt ?? 0, latestSessionAt ?? 0));
  }

  private isJaringActiveByReportWindow(jaring: DashboardJaring) {
    const latestReportAt = this.latestJaringReportAt(jaring);
    if (!latestReportAt) return false;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - JARING_ACTIVITY_WINDOW_DAYS);
    return latestReportAt.getTime() >= threshold.getTime();
  }

  private networkSummary(
    jaring: DashboardJaring[],
    reports: DashboardReport[],
    range: DashboardDateRange,
  ) {
    const reportingIds = new Set(reports.map((report) => report.jaring.id));
    const active = jaring.filter((item) =>
      this.isJaringActiveByReportWindow(item),
    ).length;
    const inactive = jaring.length - active;
    const newlyRegistered = jaring.filter((item) => {
      const date = item.registeredAt ?? item.createdAt;
      return date >= range.from && date <= range.to;
    }).length;
    return {
      total: jaring.length,
      korwilCount: this.countKorwilAreas(jaring),
      gaswilCount: this.countGaswilAssignments(jaring),
      active,
      inactive,
      otherStatus: 0,
      newlyRegistered,
      reporting: reportingIds.size,
      withoutReports: jaring.filter((item) => !reportingIds.has(item.id))
        .length,
      averageReports:
        jaring.length === 0
          ? 0
          : Math.round((reports.length / jaring.length) * 100) / 100,
    };
  }

  private countGaswilAssignments(jaring: DashboardJaring[]) {
    const assignmentIds = new Set<string>();
    for (const item of jaring) {
      const assignmentId =
        item.caretakerAssignments[0]?.fieldOfficerAssignment?.id;
      if (assignmentId) assignmentIds.add(assignmentId);
    }
    return assignmentIds.size;
  }

  private countKorwilAreas(jaring: DashboardJaring[]) {
    const korwilAreaIds = new Set<string>();
    for (const item of jaring) {
      const area = this.findRegencyCityArea(item.areaCoverages[0]?.area ?? null);
      if (area) korwilAreaIds.add(area.id);
    }
    return korwilAreaIds.size;
  }

  private findRegencyCityArea(
    area: DashboardJaring['areaCoverages'][number]['area'] | null,
  ): { id: string } | null {
    let current = area;
    while (current) {
      if (current.level === 'CITY' || current.level === 'REGENCY') {
        return current;
      }
      current = current.parent ?? null;
    }
    return null;
  }

  private regionalRanking(
    reports: DashboardReport[],
    jaring: DashboardJaring[],
  ) {
    const values = new Map<
      string,
      {
        id: string;
        name: string;
        level: string;
        reports: number;
        activeJaring: number;
        verified: number;
        draftBakets: number;
        validatedBakets: number;
        urgent: number;
        outsideScope: number;
      }
    >();
    for (const network of jaring) {
      const area = network.areaCoverages[0]?.area;
      if (!area) continue;
      const item = values.get(area.id) ?? {
        id: area.id,
        name: area.name,
        level: area.level,
        reports: 0,
        activeJaring: 0,
        verified: 0,
        draftBakets: 0,
        validatedBakets: 0,
        urgent: 0,
        outsideScope: 0,
      };
      if (this.isJaringActiveByReportWindow(network)) item.activeJaring += 1;
      values.set(area.id, item);
    }
    for (const report of reports) {
      const area =
        report.submittedMessage?.resolvedArea ??
        report.jaring.areaCoverages[0]?.area ??
        null;
      if (!area) continue;
      const item = values.get(area.id) ?? {
        id: area.id,
        name: area.name,
        level: area.level,
        reports: 0,
        activeJaring: 0,
        verified: 0,
        draftBakets: 0,
        validatedBakets: 0,
        urgent: 0,
        outsideScope: 0,
      };
      item.reports += 1;
      if (this.reportStage(report) === 'BAKET_CREATED') item.verified += 1;
      const baket = report.submittedMessage?.convertedBaket;
      if (baket?.status === BaketStatus.VERIFIED) item.validatedBakets += 1;
      else if (baket) item.draftBakets += 1;
      if (this.latestVersion(report)?.urgency === 'URGENT') item.urgent += 1;
      if (this.locationState(report) === 'OUTSIDE_SCOPE') {
        item.outsideScope += 1;
      }
      values.set(area.id, item);
    }
    return [...values.values()]
      .map((item) => ({
        ...item,
        attentionReasons: [
          ...(item.urgent > 0 ? [`${item.urgent} laporan mendesak`] : []),
          ...(item.outsideScope > 0
            ? [`${item.outsideScope} laporan di luar wilayah penugasan`]
            : []),
        ],
      }))
      .sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name));
  }

  private jaringRanking(reports: DashboardReport[], jaring: DashboardJaring[]) {
    const values = new Map<
      string,
      {
        id: string;
        name: string;
        status: string;
        registrationStatus: string;
        gaswil: string | null;
        area: string | null;
        reports: number;
        verified: number;
        draftBakets: number;
        lastReportAt: string | null;
      }
    >();
    for (const network of jaring) {
      const caretaker =
        network.caretakerAssignments[0]?.fieldOfficerAssignment ?? null;
      values.set(network.id, {
        id: network.id,
        name: network.aliasName ?? network.fullName ?? network.id,
        status: this.isJaringActiveByReportWindow(network)
          ? 'ACTIVE'
          : 'INACTIVE',
        registrationStatus: network.registrationStatus,
        gaswil:
          caretaker?.userProfile.fullName ??
          caretaker?.userProfile.username ??
          null,
        area: network.areaCoverages[0]?.area.name ?? null,
        reports: 0,
        verified: 0,
        draftBakets: 0,
        lastReportAt: null,
      });
    }
    for (const report of reports) {
      const id = report.jaring.id;
      const reportedAt = (report.submittedAt ?? report.startedAt).toISOString();
      const caretaker =
        report.jaring.caretakerAssignments[0]?.fieldOfficerAssignment ?? null;
      const item = values.get(id) ?? {
        id,
        name: report.jaring.aliasName ?? report.jaring.fullName ?? id,
        status: 'UNKNOWN',
        registrationStatus: report.jaring.registrationStatus,
        gaswil:
          caretaker?.userProfile.fullName ??
          caretaker?.userProfile.username ??
          null,
        area: report.jaring.areaCoverages[0]?.area.name ?? null,
        reports: 0,
        verified: 0,
        draftBakets: 0,
        lastReportAt: null,
      };
      item.reports += 1;
      if (this.reportStage(report) === 'BAKET_CREATED') item.verified += 1;
      const baket = report.submittedMessage?.convertedBaket;
      if (baket && baket.status !== BaketStatus.VERIFIED) {
        item.draftBakets += 1;
      }
      if (!item.lastReportAt || reportedAt > item.lastReportAt) {
        item.lastReportAt = reportedAt;
      }
      values.set(id, item);
    }
    return [...values.values()]
      .map((item) => ({
        ...item,
        drilldown: `/dashboard/daftar-jaring/${item.id}`,
      }))
      .sort(
        (a, b) =>
          b.reports - a.reports ||
          b.verified - a.verified ||
          a.name.localeCompare(b.name),
      );
  }

  private fieldOfficerRanking(
    reports: DashboardReport[],
    jaring: DashboardJaring[],
  ) {
    const values = new Map<
      string,
      {
        id: string;
        userProfileId: string;
        name: string;
        area: string | null;
        jaring: number;
        activeJaring: number;
        reports: number;
        verified: number;
        draftBakets: number;
        verificationHours: number[];
        lastActivityAt: string | null;
      }
    >();
    for (const network of jaring) {
      const caretaker = network.caretakerAssignments[0]?.fieldOfficerAssignment;
      if (!caretaker) continue;
      const item = values.get(caretaker.id) ?? {
        id: caretaker.id,
        userProfileId: caretaker.userProfile.id,
        name:
          caretaker.userProfile.fullName ??
          caretaker.userProfile.username ??
          caretaker.id,
        area: caretaker.areaScopes[0]?.area.name ?? null,
        jaring: 0,
        activeJaring: 0,
        reports: 0,
        verified: 0,
        draftBakets: 0,
        verificationHours: [],
        lastActivityAt: null,
      };
      item.jaring += 1;
      if (this.isJaringActiveByReportWindow(network)) item.activeJaring += 1;
      values.set(caretaker.id, item);
    }
    for (const report of reports) {
      const assignment = report.fieldOfficerAssignment;
      const id = report.fieldOfficerAssignmentId;
      const item = values.get(id) ?? {
        id,
        userProfileId: assignment.userProfile.id,
        name:
          assignment.userProfile.fullName ??
          assignment.userProfile.username ??
          id,
        area: assignment.areaScopes[0]?.area.name ?? null,
        jaring: 0,
        activeJaring: 0,
        reports: 0,
        verified: 0,
        draftBakets: 0,
        verificationHours: [],
        lastActivityAt: null,
      };
      item.reports += 1;
      if (this.reportStage(report) === 'BAKET_CREATED') item.verified += 1;
      const baket = report.submittedMessage?.convertedBaket;
      if (baket && baket.status !== BaketStatus.VERIFIED) {
        item.draftBakets += 1;
      }
      const reportedAt = report.submittedAt ?? report.startedAt;
      const completedAt = this.latestVersion(report)?.verification?.completedAt;
      if (completedAt && completedAt >= reportedAt) {
        item.verificationHours.push(
          (completedAt.getTime() - reportedAt.getTime()) / 3_600_000,
        );
      }
      const activityAt = reportedAt.toISOString();
      if (!item.lastActivityAt || activityAt > item.lastActivityAt) {
        item.lastActivityAt = activityAt;
      }
      values.set(id, item);
    }
    return [...values.values()]
      .map(({ verificationHours, ...item }) => ({
        ...item,
        averageVerificationHours:
          verificationHours.length === 0
            ? null
            : Math.round(
                (verificationHours.reduce((sum, value) => sum + value, 0) /
                  verificationHours.length) *
                  10,
              ) / 10,
        drilldown: `/dashboard/field-officers/${item.id}?userProfileId=${item.userProfileId}`,
      }))
      .sort(
        (a, b) =>
          b.reports - a.reports ||
          b.verified - a.verified ||
          a.name.localeCompare(b.name),
      );
  }

  private followUpSummary(
    tasks: DashboardTask[],
    directives: DashboardDirective[],
    pendingApprovals: number,
  ) {
    const now = new Date();
    const approaching = new Date(now.getTime() + 72 * 3_600_000);
    const directiveDueDate = (directive: DashboardDirective) =>
      directive.versions[0]?.dueDate ?? null;
    const directiveOpen = (directive: DashboardDirective) =>
      !['COMPLETED', 'CANCELLED'].includes(directive.status);
    const summary = {
      total: directives.length,
      notStarted: directives.filter((item) =>
        ['DRAFT', 'PUBLISHED', 'DISTRIBUTED'].includes(item.status),
      ).length,
      inProgress: directives.filter((item) => item.status === 'IN_PROGRESS')
        .length,
      completed: directives.filter((item) => item.status === 'COMPLETED')
        .length,
      approachingDue: directives.filter((item) => {
        const due = directiveDueDate(item);
        return Boolean(
          directiveOpen(item) && due && due >= now && due <= approaching,
        );
      }).length,
      overdue: directives.filter((item) => {
        const due = directiveDueDate(item);
        return Boolean(directiveOpen(item) && due && due < now);
      }).length,
    };
    const taskItems = tasks.map((task) => {
      const assignment = task.assignments[0];
      const dueAt = assignment?.dueDate ?? task.dueDate;
      const progress =
        assignment?.progressLogs[0]?.progressPercent ??
        (task.status === 'COMPLETED' ? 100 : null);
      return {
        id: task.id,
        kind: 'TASK',
        title: task.title,
        sender:
          task.ownerAssignment.userProfile.fullName ??
          task.ownerAssignment.userProfile.username,
        recipient:
          assignment?.assignee.userProfile.fullName ??
          assignment?.assignee.userProfile.username ??
          null,
        recipientRole: assignment?.assignee.role.name ?? null,
        area: task.targetAreas[0]?.area ?? null,
        urgency: task.priority,
        status: assignment?.status ?? task.status,
        dueAt: dueAt?.toISOString() ?? null,
        overdue: Boolean(
          dueAt &&
          dueAt < now &&
          !['COMPLETED', 'CANCELLED'].includes(
            assignment?.status ?? task.status,
          ),
        ),
        progress,
        createdAt: task.createdAt.toISOString(),
        drilldown: `/dashboard/tasks/${task.id}`,
      };
    });
    const directiveItems = directives.map((directive) => {
      const version = directive.versions[0];
      const dueAt = version?.dueDate ?? null;
      const recipient = version?.recipients[0]?.targetAssignment;
      return {
        id: directive.id,
        kind: 'DIRECTIVE',
        title: version?.commandDescription?.trim() || directive.commandNumber,
        referenceNumber: directive.commandNumber,
        sender:
          directive.ownerAssignment.userProfile.fullName ??
          directive.ownerAssignment.userProfile.username,
        recipient:
          recipient?.userProfile.fullName ??
          recipient?.userProfile.username ??
          null,
        recipientRole: recipient?.role.name ?? null,
        area: version?.targetAreas[0]?.area ?? null,
        urgency: version?.urgency ?? 'NORMAL',
        status: directive.status,
        dueAt: dueAt?.toISOString() ?? null,
        overdue: Boolean(directiveOpen(directive) && dueAt && dueAt < now),
        progress: directive.status === 'COMPLETED' ? 100 : null,
        createdAt: directive.createdAt.toISOString(),
        drilldown: `/dashboard/directives/${directive.id}`,
      };
    });
    const urgencyWeight: Record<string, number> = {
      URGENT: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1,
    };
    const items = [...taskItems, ...directiveItems]
      .filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status))
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        const aDue = a.dueAt
          ? new Date(a.dueAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        const bDue = b.dueAt
          ? new Date(b.dueAt).getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        const urgency =
          (urgencyWeight[b.urgency] ?? 0) - (urgencyWeight[a.urgency] ?? 0);
        if (urgency !== 0) return urgency;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 10);
    return {
      tasks: this.distribution(tasks, (item) => item.status),
      directives: this.distribution(directives, (item) => item.status),
      pendingApprovals,
      summary,
      items,
      approachingDueDefinitionHours: 72,
    };
  }

  private async recentActivity(input: {
    reports: DashboardReport[];
    products: DashboardProduct[];
    tasks: DashboardTask[];
    directives: DashboardDirective[];
    from: Date;
    to: Date;
  }) {
    const reportIds = input.reports.map((item) => item.id);
    const baketIds = input.reports
      .map((item) => item.submittedMessage?.convertedBaket?.id)
      .filter((id): id is string => Boolean(id));
    const jaringIds = [...new Set(input.reports.map((item) => item.jaring.id))];
    const entityFilters: Prisma.AuditLogWhereInput[] = [
      ...(reportIds.length
        ? [{ entityType: 'WhatsAppReportSession', entityId: { in: reportIds } }]
        : []),
      ...(baketIds.length
        ? [{ entityType: 'Baket', entityId: { in: baketIds } }]
        : []),
      ...(jaringIds.length
        ? [{ entityType: 'Jaring', entityId: { in: jaringIds } }]
        : []),
      ...(input.products.length
        ? [
            {
              entityType: 'IntelligenceProduct',
              entityId: { in: input.products.map((item) => item.id) },
            },
          ]
        : []),
      ...(input.tasks.length
        ? [
            {
              entityType: 'Task',
              entityId: { in: input.tasks.map((item) => item.id) },
            },
          ]
        : []),
      ...(input.directives.length
        ? [
            {
              entityType: 'Directive',
              entityId: { in: input.directives.map((item) => item.id) },
            },
          ]
        : []),
    ];
    if (entityFilters.length === 0) return [];
    const logs = (await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: input.from, lte: input.to },
        OR: entityFilters,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        beforeData: true,
        afterData: true,
        createdAt: true,
        actorUser: { select: { fullName: true, username: true } },
        actorAssignment: {
          select: {
            role: { select: { name: true } },
            areaScopes: {
              where: { validUntil: null },
              orderBy: { isPrimary: 'desc' },
              take: 1,
              select: { area: { select: { name: true } } },
            },
          },
        },
      },
    })) as Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string | null;
      beforeData: unknown;
      afterData: unknown;
      createdAt: Date;
      actorUser: { fullName: string | null; username: string } | null;
      actorAssignment: {
        role: { name: string };
        areaScopes: Array<{ area: { name: string } }>;
      } | null;
    }>;
    const reportById = new Map(
      input.reports.map((item) => [item.id, this.reportSummary(item)]),
    );
    const reportByBaketId = new Map(
      input.reports.flatMap((item) => {
        const id = item.submittedMessage?.convertedBaket?.id;
        return id ? [[id, this.reportSummary(item)] as const] : [];
      }),
    );
    const productById = new Map(input.products.map((item) => [item.id, item]));
    const taskById = new Map(input.tasks.map((item) => [item.id, item]));
    const directiveById = new Map(
      input.directives.map((item) => [item.id, item]),
    );
    const statusValue = (value: unknown) => {
      if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
      const status = (value as Record<string, unknown>).status;
      return typeof status === 'string' ? status : null;
    };
    return logs.map((log) => {
      const report = log.entityId
        ? (reportById.get(log.entityId) ?? reportByBaketId.get(log.entityId))
        : null;
      const product = log.entityId ? productById.get(log.entityId) : null;
      const task = log.entityId ? taskById.get(log.entityId) : null;
      const directive = log.entityId ? directiveById.get(log.entityId) : null;
      const before = statusValue(log.beforeData);
      const after = statusValue(log.afterData);
      return {
        id: log.id,
        occurredAt: log.createdAt.toISOString(),
        actor: log.actorUser?.fullName ?? log.actorUser?.username ?? 'Sistem',
        role: log.actorAssignment?.role.name ?? null,
        unit: log.actorAssignment?.areaScopes[0]?.area.name ?? null,
        action: log.action,
        entityType: log.entityType,
        reference:
          report?.referenceNumber ??
          product?.productNumber ??
          directive?.commandNumber ??
          task?.title ??
          log.entityId,
        title:
          report?.title ??
          product?.title ??
          task?.title ??
          directive?.commandNumber ??
          log.action,
        statusChange: before || after ? { before, after } : null,
        drilldown:
          report?.drilldown ??
          (product ? `/dashboard/produk-intelijen/${product.id}` : null) ??
          (task ? `/dashboard/tasks/${task.id}` : null) ??
          (directive ? `/dashboard/directives/${directive.id}` : null),
      };
    });
  }

  private attentionItems(reports: DashboardReport[]) {
    return reports
      .flatMap((report) => {
        const items: Array<
          ReturnType<ExecutiveDashboardService['attentionItem']>
        > = [];
        if (
          this.latestVersion(report)?.urgency === 'URGENT' &&
          this.reportStage(report) !== 'BAKET_CREATED'
        ) {
          items.push(
            this.attentionItem(
              report,
              'URGENT_READY_FOR_BAKET',
              'Laporan mendesak siap dibuat Baket',
              'danger',
            ),
          );
        }
        if (this.locationState(report) === 'OUTSIDE_SCOPE') {
          items.push(
            this.attentionItem(
              report,
              'OUTSIDE_SCOPE',
              'Lokasi berada di luar wilayah penugasan',
              'danger',
            ),
          );
        }
        const overdueRevision =
          report.submittedMessage?.convertedBaket?.revisionRequests.find(
            (request) => request.dueDate && request.dueDate < new Date(),
          );
        if (overdueRevision) {
          items.push(
            this.attentionItem(
              report,
              'REVISION_OVERDUE',
              'Permintaan perbaikan telah melewati tenggat',
              'danger',
            ),
          );
        }
        return items;
      })
      .sort(
        (a, b) =>
          (a.tone === 'danger' ? -1 : 1) - (b.tone === 'danger' ? -1 : 1) ||
          b.reportedAt.localeCompare(a.reportedAt),
      );
  }

  private attentionItem(
    report: DashboardReport,
    type: string,
    reason: string,
    tone: 'danger' | 'warning',
  ) {
    const summary = this.reportSummary(report);
    return { ...summary, type, reason, tone };
  }

  private priorityReasons(report: DashboardReport) {
    const reasons: string[] = [];
    const urgency = this.latestVersion(report)?.urgency;
    if (urgency === 'URGENT') reasons.push('Urgensi: Mendesak');
    else if (urgency === 'HIGH') reasons.push('Urgensi: Tinggi');
    if (this.reportStage(report) === 'READY_FOR_BAKET') {
      reasons.push('Siap dibuat Baket');
    }
    if (this.locationState(report) === 'OUTSIDE_SCOPE') {
      reasons.push('Lokasi di luar wilayah penugasan');
    }
    const overdue =
      report.submittedMessage?.convertedBaket?.revisionRequests.some(
        (request) => request.dueDate && request.dueDate < new Date(),
      ) ?? false;
    if (overdue) reasons.push('Permintaan perbaikan melewati tenggat');
    return reasons;
  }

  private reportViews(reports: DashboardReport[]) {
    const urgencyRank = (report: DashboardReport) => {
      const urgency = this.latestVersion(report)?.urgency;
      return urgency === 'URGENT'
        ? 4
        : urgency === 'HIGH'
          ? 3
          : urgency === 'NORMAL'
            ? 2
            : 1;
    };
    const dueAt = (report: DashboardReport) =>
      report.submittedMessage?.convertedBaket?.revisionRequests
        .map((request) => request.dueDate)
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    const actionRequired = (report: DashboardReport) =>
      this.reportStage(report) !== 'BAKET_CREATED' ||
      this.locationState(report) === 'OUTSIDE_SCOPE' ||
      (report.submittedMessage?.convertedBaket?.revisionRequests.length ?? 0) >
        0;
    const mostUrgent = [...reports]
      .filter((report) => this.priorityReasons(report).length > 0)
      .sort((a, b) => {
        const urgency = urgencyRank(b) - urgencyRank(a);
        if (urgency !== 0) return urgency;
        const action = Number(actionRequired(b)) - Number(actionRequired(a));
        if (action !== 0) return action;
        const aDue = dueAt(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDue = dueAt(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        if (aDue !== bDue) return aDue - bDue;
        return (
          (a.submittedAt ?? a.startedAt).getTime() -
          (b.submittedAt ?? b.startedAt).getTime()
        );
      })
      .slice(0, 10)
      .map((report) => this.reportSummary(report));
    const latest = [...reports]
      .sort(
        (a, b) =>
          (b.submittedAt ?? b.startedAt).getTime() -
          (a.submittedAt ?? a.startedAt).getTime(),
      )
      .slice(0, 10)
      .map((report) => this.reportSummary(report));
    const mostFollowedUp = [...reports]
      .filter(
        (report) =>
          (report.submittedMessage?.convertedBaket?.revisionRequests.length ??
            0) > 0,
      )
      .sort(
        (a, b) =>
          (b.submittedMessage?.convertedBaket?.revisionRequests.length ?? 0) -
          (a.submittedMessage?.convertedBaket?.revisionRequests.length ?? 0),
      )
      .slice(0, 10)
      .map((report) => this.reportSummary(report));
    const waitingLongest = [...reports]
      .filter(actionRequired)
      .sort(
        (a, b) =>
          (a.submittedAt ?? a.startedAt).getTime() -
          (b.submittedAt ?? b.startedAt).getTime(),
      )
      .slice(0, 10)
      .map((report) => this.reportSummary(report));
    return { mostUrgent, latest, mostFollowedUp, waitingLongest };
  }

  private reportSummary(report: DashboardReport) {
    const normalized = report.content?.replace(/\s+/g, ' ').trim();
    const title = normalized
      ? `${normalized.split(' ').slice(0, 10).join(' ')}${normalized.split(' ').length > 10 ? '...' : ''}`
      : 'Laporan Jaring';
    const reportedAt = report.submittedAt ?? report.startedAt;
    const revisionRequests =
      report.submittedMessage?.convertedBaket?.revisionRequests ?? [];
    const dueAt = revisionRequests
      .map((request) => request.dueDate)
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    return {
      id: report.id,
      referenceNumber: report.referenceNumber,
      title,
      jaring: {
        id: report.jaring.id,
        name:
          report.jaring.aliasName ?? report.jaring.fullName ?? report.jaring.id,
      },
      area:
        report.submittedMessage?.resolvedArea ??
        report.jaring.areaCoverages[0]?.area ??
        null,
      category: this.category(report),
      urgency: this.latestVersion(report)?.urgency ?? null,
      stage: this.reportStage(report),
      workflow:
        report.submittedMessage?.convertedBaket?.status ?? 'LAPORAN_JARING',
      reportedAt: reportedAt.toISOString(),
      ageHours: Math.max(
        0,
        Math.round(((Date.now() - reportedAt.getTime()) / 3_600_000) * 10) / 10,
      ),
      dueAt: dueAt?.toISOString() ?? null,
      followUpCount: revisionRequests.length,
      priorityReasons: this.priorityReasons(report),
      drilldown: `/dashboard/laporan-jaring/${report.id}`,
    };
  }

  private dataQuality(reports: DashboardReport[], jaring: DashboardJaring[]) {
    const missingCategory = reports.filter(
      (report) => !this.category(report),
    ).length;
    const missingLocation = reports.filter(
      (report) => !report.submittedMessage?.resolvedAreaId,
    ).length;
    const missingAttachment = reports.filter(
      (report) => !this.hasAttachment(report),
    ).length;
    const notCheckedLocation = reports.filter(
      (report) => this.locationState(report) === 'NOT_CHECKED',
    ).length;
    const missingDescription = reports.filter(
      (report) => !(report.submittedMessage?.content ?? report.content)?.trim(),
    ).length;
    const jaringWithoutFieldOfficer = jaring.filter(
      (item) => item.caretakerAssignments.length === 0,
    ).length;
    const jaringWithoutArea = jaring.filter(
      (item) => item.areaCoverages.length === 0,
    ).length;
    return {
      total: reports.length,
      missingCategory,
      unclassified: missingCategory,
      missingDescription,
      missingLocation,
      missingAttachment,
      notCheckedLocation,
      missingJaringRelation: 0,
      jaringWithoutFieldOfficer,
      jaringWithoutArea,
      incompleteOrganizationRelation:
        jaringWithoutFieldOfficer + jaringWithoutArea,
      unavailableFields: [
        {
          key: 'reportTitle',
          label: 'Judul kejadian',
          reason: 'Belum tersedia sebagai field terpisah pada sesi laporan.',
        },
        {
          key: 'eventTime',
          label: 'Waktu kejadian',
          reason:
            'Belum tersedia sebagai field terstruktur pada kontrak laporan.',
        },
      ],
    };
  }

  private appliedFilters(query: ExecutiveDashboardQueryDto) {
    return Object.fromEntries(
      Object.entries(query).filter(
        ([key, value]) =>
          value !== undefined &&
          value !== '' &&
          !['period', 'timezone'].includes(key),
      ),
    );
  }

  private resolvePeriod(query: ExecutiveDashboardQueryDto): DashboardDateRange {
    const now = new Date();
    const jakartaNow = new Date(now.getTime() + JAKARTA_OFFSET_MS);
    const year = jakartaNow.getUTCFullYear();
    const month = jakartaNow.getUTCMonth();
    const day = jakartaNow.getUTCDate();
    const startOfDay = this.jakartaDate(year, month, day);
    let from: Date;
    let to = now;

    switch (query.period) {
      case ExecutiveDashboardPeriod.TODAY:
        from = startOfDay;
        break;
      case ExecutiveDashboardPeriod.LAST_7_DAYS:
        from = new Date(startOfDay.getTime() - 6 * 86_400_000);
        break;
      case ExecutiveDashboardPeriod.CURRENT_MONTH:
        from = this.jakartaDate(year, month, 1);
        break;
      case ExecutiveDashboardPeriod.CURRENT_YEAR:
        from = this.jakartaDate(year, 0, 1);
        break;
      case ExecutiveDashboardPeriod.CUSTOM:
        if (!query.from || !query.to) {
          throw new ApiException(
            'DASHBOARD_CUSTOM_PERIOD_REQUIRED',
            'Periode kustom membutuhkan tanggal mulai dan tanggal selesai.',
            400,
          );
        }
        from = this.parseJakartaBoundary(query.from, false);
        to = this.parseJakartaBoundary(query.to, true);
        break;
      case ExecutiveDashboardPeriod.LAST_30_DAYS:
      default:
        from = new Date(startOfDay.getTime() - 29 * 86_400_000);
        break;
    }
    if (from.getTime() > to.getTime()) {
      throw new ApiException(
        'DASHBOARD_DATE_RANGE_INVALID',
        'Tanggal mulai tidak boleh setelah tanggal selesai.',
        400,
      );
    }
    const duration = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);
    return {
      from,
      to,
      previousFrom,
      previousTo,
      timezone: 'Asia/Jakarta',
      period: query.period,
    };
  }

  private jakartaDate(year: number, zeroBasedMonth: number, day: number) {
    return new Date(
      Date.UTC(year, zeroBasedMonth, day, 0, 0, 0, 0) - JAKARTA_OFFSET_MS,
    );
  }

  private parseJakartaBoundary(value: string, endOfDay: boolean) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const start = this.jakartaDate(year, month - 1, day);
      return endOfDay ? new Date(start.getTime() + 86_400_000 - 1) : start;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiException(
        'DASHBOARD_DATE_INVALID',
        'Tanggal dashboard tidak valid.',
        400,
      );
    }
    return parsed;
  }
}
