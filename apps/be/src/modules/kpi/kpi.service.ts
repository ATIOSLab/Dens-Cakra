import { Injectable } from '@nestjs/common';
import { ApiException } from '../../common/api/api-exception.js';
import type { AuthorizationContext } from '../../common/types/authorization-context.js';
import {
  IntegrationStatus,
  JaringStatus,
  type Prisma,
  WhatsAppBotConnectionStatus,
  WhatsAppDeviceEventType,
  WhatsAppMessageStatus,
  WhatsAppReportSessionStatus,
} from '../../generated/prisma/client.js';
import { DomainScopeService } from '../access/domain-scope.service.js';
import {
  ApplicationCacheService,
  authorizationScopeIdentity,
} from '../cache/application-cache.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  KpiAnomalyFilter,
  KpiBaketSourceFilter,
  KpiDetailQueryDto,
  KpiJaringStatusFilter,
  KpiKendalaFilter,
  KpiPeriod,
  KpiQueryDto,
  KpiRegionLevel,
  KpiReportStatusFilter,
} from './kpi.dto.js';
import {
  classifyJaringStatus,
  compareMetric,
  INVALID_REPORT_MESSAGE_STATUSES,
  JARING_STATUS_GROUP,
  JARING_STATUS_GROUP_LABELS,
  KPI_ANOMALY_OPTIONS,
  KPI_BAKET_SOURCE_OPTIONS,
  KPI_JARING_STATUS_OPTIONS,
  KPI_METRIC_DEFINITIONS,
  KPI_PERIOD_OPTIONS,
  KPI_REPORT_STATUS_OPTIONS,
  KPI_SORT_BY_OPTIONS,
  maskPhone,
  percentage,
  REPORT_PROCESS_STAGE,
  REPORT_PROCESS_STAGE_LABELS,
  type JaringStatusGroup,
  type KpiComparison,
  type ReportProcessStage,
} from './kpi-metrics.js';

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

type KpiDateRange = {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
};

const areaWithParentsSelect = {
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
              parent: {
                select: { id: true, code: true, name: true, level: true },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.AdministrativeAreaSelect;

const jaringSelect = {
  id: true,
  status: true,
  registrationStatus: true,
  registeredAt: true,
  reviewedAt: true,
  whatsappNumber: true,
  areaCoverages: {
    where: { validUntil: null },
    orderBy: [{ isPrimary: 'desc' as const }, { validFrom: 'desc' as const }],
    take: 1,
    select: { area: { select: areaWithParentsSelect } },
  },
} satisfies Prisma.JaringSelect;

type KpiJaring = Prisma.JaringGetPayload<{ select: typeof jaringSelect }>;

const reportSelect = {
  id: true,
  jaringId: true,
  senderPhone: true,
  status: true,
  submittedAt: true,
  startedAt: true,
  submittedMessageId: true,
  submittedMessage: {
    select: {
      id: true,
      status: true,
      senderPhone: true,
      referenceNumber: true,
      contentChecksum: true,
      receivedAt: true,
      integrationChannelId: true,
      convertedBaketId: true,
      convertedBaket: { select: { createdAt: true } },
    },
  },
} satisfies Prisma.WhatsAppReportSessionSelect;

type KpiReport = Prisma.WhatsAppReportSessionGetPayload<{
  select: typeof reportSelect;
}>;

type RegionKey = {
  provinceId: string | null;
  provinceName: string;
  regencyId: string | null;
  regencyName: string;
  districtId: string | null;
  districtName: string;
};

type AreaNode = {
  id: string;
  code: string;
  name: string;
  level: string;
  parent?: AreaNode | null;
};

@Injectable()
export class KpiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: DomainScopeService,
    private readonly cache: ApplicationCacheService,
  ) {}

  // ---------------------------------------------------------------------------
  // Endpoint publik
  // ---------------------------------------------------------------------------

  async summary(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'summary',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadSummary(query, context, range),
    );
  }

  async productivity(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'productivity',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadProductivity(query, context, range),
    );
  }

  async regionComparison(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'region',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadRegionComparison(query, context, range),
    );
  }

  async reportsBaket(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'reports',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadReportsBaket(query, context, range),
    );
  }

  async whatsappCenter(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'whatsapp',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadWhatsappCenter(query, context, range),
    );
  }

  async anomalies(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'anomalies',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadAnomalies(query, context, range),
    );
  }

  async trends(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.cache.getOrSet(
      {
        namespace: 'kpi-v1',
        identity: {
          kind: 'trends',
          scope: authorizationScopeIdentity(context),
          query,
          range,
        },
        ttlMs: 15_000,
      },
      () => this.loadTrends(query, context, range),
    );
  }

  async detail(query: KpiDetailQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    return this.loadDetail(query, context, range);
  }

  async filterOptions(context: AuthorizationContext) {
    const areaTree = await this.scope.areaTree(context);
    return {
      scope: this.scope.scopeSummary(context),
      areaTree,
      periods: KPI_PERIOD_OPTIONS,
      jaringStatuses: KPI_JARING_STATUS_OPTIONS,
      reportStatuses: KPI_REPORT_STATUS_OPTIONS,
      baketSources: KPI_BAKET_SOURCE_OPTIONS,
      anomalyTypes: KPI_ANOMALY_OPTIONS,
      sortBy: KPI_SORT_BY_OPTIONS,
    };
  }

  async exportPayload(query: KpiQueryDto, context: AuthorizationContext) {
    const range = this.resolveRange(query);
    const [summary, region, reports, kendala, anomaly] = await Promise.all([
      this.loadSummary(query, context, range),
      this.loadRegionComparison(query, context, range),
      this.loadReportsBaket(query, context, range),
      this.loadWhatsappCenter(query, context, range),
      this.loadAnomalies(query, context, range),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      period: {
        preset: query.period,
        timezone: query.timezone,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      scope: this.scope.scopeSummary(context),
      appliedFilters: this.appliedFilters(query),
      metrics: KPI_METRIC_DEFINITIONS,
      summary,
      regionComparison: region,
      reportsBaket: reports,
      whatsappCenter: kendala,
      anomalies: anomaly,
    };
  }

  // ---------------------------------------------------------------------------
  // Loader inti
  // ---------------------------------------------------------------------------

  private async loadSummary(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const core = await this.loadCore(query, context, range);
    const previousCore = await this.loadCore(query, context, {
      from: range.previousFrom,
      to: range.previousTo,
      previousFrom: range.from,
      previousTo: range.to,
    });

    const current = core.metrics;
    const previous = previousCore.metrics;

    const cards = this.buildCards(current, previous);
    const [kendalaCount, previousKendalaCount] = await Promise.all([
      this.countKendala(range),
      this.countKendala({
        from: range.previousFrom,
        to: range.previousTo,
        previousFrom: range.from,
        previousTo: range.to,
      }),
    ]);
    const anomaliesCount = this.detectAnomalyRows(core).length;
    const previousAnomaliesCount = this.detectAnomalyRows(previousCore).length;
    cards.push(
      {
        key: 'verifiedKendala',
        value: kendalaCount,
        comparison: compareMetric(kendalaCount, previousKendalaCount),
        tone: 'warning',
      },
      {
        key: 'anomalies',
        value: anomaliesCount,
        comparison: compareMetric(anomaliesCount, previousAnomaliesCount),
        tone: 'danger',
      },
    );
    return {
      generatedAt: new Date().toISOString(),
      period: {
        preset: query.period,
        timezone: query.timezone,
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        previousFrom: range.previousFrom.toISOString(),
        previousTo: range.previousTo.toISOString(),
      },
      scope: this.scope.scopeSummary(context),
      appliedFilters: this.appliedFilters(query),
      metricDefinitions: KPI_METRIC_DEFINITIONS,
      cards,
      statusBreakdown: {
        totalJaring: current.totalJaring,
        groups: this.statusGroupBreakdown(core.jaring),
        unverified: current.unverified,
        other: current.other,
        withoutArea: current.jaringWithoutArea,
      },
      insight: this.buildInsight(current, core, range),
    };
  }

  private async loadCore(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const [jaringScope, baketScope] = await Promise.all([
      this.scope.jaringWhere(context),
      this.scope.baketWhere(context),
    ]);
    if (query.areaId) await this.scope.assertArea(context, query.areaId);

    const jaringWhere: Prisma.JaringWhereInput = {
      ...jaringScope,
      ...this.jaringStatusFilterWhere(query),
      ...(query.areaId
        ? {
            areaCoverages: {
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
        : {}),
    };

    const reportWhere: Prisma.WhatsAppReportSessionWhereInput = {
      jaring: {
        ...jaringScope,
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
      },
      submittedAt: { gte: range.from, lte: range.to },
    };

    const baketWhere: Prisma.BaketWhereInput = {
      ...baketScope,
      deletedAt: null,
      createdAt: { gte: range.from, lte: range.to },
    };

    const [jaring, reports, bakets, sourceMessages] = await Promise.all([
      this.prisma.jaring.findMany({ where: jaringWhere, select: jaringSelect }),
      this.prisma.whatsAppReportSession.findMany({
        where: reportWhere,
        select: reportSelect,
      }),
      this.prisma.baket.findMany({
        where: baketWhere,
        select: {
          id: true,
          status: true,
          primaryJaringId: true,
          createdAt: true,
          _count: { select: { convertedSourceMessages: true } },
          versions: {
            select: { sourceMessages: { select: { messageId: true } } },
          },
        },
      }),
      this.prisma.baketVersionSourceMessage.findMany({
        where: { baketVersion: { baket: { ...baketScope, deletedAt: null } } },
        select: { messageId: true },
      }),
    ]);

    const sourceMessageIds = new Set(
      sourceMessages.map((item) => item.messageId),
    );

    const filteredReports = this.filterReportsByStatus(reports, query);
    const filteredBakets = this.filterBaketsBySource(bakets, query);
    // Filter "Produktif"/"Belum Mengirim Laporan" hanya memengaruhi tampilan;
    // metrik inti (kartu) tetap dihitung dari basis Jaring Aktif Terverifikasi penuh.
    const displayJaring = this.applyProductivityJaringFilter(
      jaring,
      reports,
      query,
    );

    return {
      jaring: displayJaring,
      reports: filteredReports,
      bakets: filteredBakets,
      sourceMessageIds,
      metrics: this.computeMetrics(
        jaring,
        filteredReports,
        filteredBakets,
        sourceMessageIds,
      ),
    };
  }

  private applyProductivityJaringFilter(
    jaring: KpiJaring[],
    reports: KpiReport[],
    query: KpiQueryDto,
  ): KpiJaring[] {
    if (
      query.jaringStatus !== KpiJaringStatusFilter.PRODUCTIVE &&
      query.jaringStatus !== KpiJaringStatusFilter.NOT_REPORTING
    ) {
      return jaring;
    }
    const activeVerifiedIds = new Set(
      jaring
        .filter(
          (item) =>
            classifyJaringStatus(item.status, item.registrationStatus) ===
            JARING_STATUS_GROUP.ACTIVE_VERIFIED,
        )
        .map((item) => item.id),
    );
    const productiveIds = new Set(
      reports
        .filter(
          (report) =>
            this.isValidReport(report) &&
            activeVerifiedIds.has(report.jaringId),
        )
        .map((report) => report.jaringId),
    );
    if (query.jaringStatus === KpiJaringStatusFilter.PRODUCTIVE) {
      return jaring.filter((item) => productiveIds.has(item.id));
    }
    return jaring.filter(
      (item) => activeVerifiedIds.has(item.id) && !productiveIds.has(item.id),
    );
  }

  private filterReportsByStatus(
    reports: KpiReport[],
    query: KpiQueryDto,
  ): KpiReport[] {
    switch (query.reportStatus) {
      case KpiReportStatusFilter.VALID:
        return reports.filter((report) => this.isValidReport(report));
      case KpiReportStatusFilter.IN_PROGRESS:
        return reports.filter(
          (report) =>
            this.reportStage(report) === REPORT_PROCESS_STAGE.IN_PROGRESS,
        );
      case KpiReportStatusFilter.READY_FOR_BAKET:
        return reports.filter(
          (report) =>
            this.reportStage(report) === REPORT_PROCESS_STAGE.READY_FOR_BAKET,
        );
      case KpiReportStatusFilter.BAKET_CREATED:
        return reports.filter(
          (report) =>
            this.reportStage(report) === REPORT_PROCESS_STAGE.BAKET_CREATED,
        );
      case KpiReportStatusFilter.NOT_BAKET:
        return reports.filter(
          (report) =>
            this.isValidReport(report) &&
            this.reportStage(report) !== REPORT_PROCESS_STAGE.BAKET_CREATED,
        );
      case KpiReportStatusFilter.FAILED:
        return reports.filter(
          (report) => this.reportStage(report) === REPORT_PROCESS_STAGE.FAILED,
        );
      case KpiReportStatusFilter.ALL:
      default:
        return reports;
    }
  }

  private baketHasSource(baket: {
    _count: { convertedSourceMessages: number };
    versions: Array<{ sourceMessages: Array<{ messageId: string }> }>;
  }): boolean {
    return (
      baket._count.convertedSourceMessages > 0 ||
      baket.versions.some((version) => version.sourceMessages.length > 0)
    );
  }

  private filterBaketsBySource<
    T extends {
      _count: { convertedSourceMessages: number };
      versions: Array<{ sourceMessages: Array<{ messageId: string }> }>;
    },
  >(bakets: T[], query: KpiQueryDto): T[] {
    switch (query.baketSource) {
      case KpiBaketSourceFilter.FROM_REPORT:
      case KpiBaketSourceFilter.HAS_SOURCE:
        return bakets.filter((baket) => this.baketHasSource(baket));
      case KpiBaketSourceFilter.MANUAL:
      case KpiBaketSourceFilter.NO_SOURCE:
        return bakets.filter((baket) => !this.baketHasSource(baket));
      case KpiBaketSourceFilter.ALL:
      default:
        return bakets;
    }
  }

  private async countKendala(range: KpiDateRange): Promise<number> {
    return this.prisma.whatsAppDeviceActivityLog.count({
      where: {
        occurredAt: { gte: range.from, lte: range.to },
        eventType: {
          in: [
            WhatsAppDeviceEventType.DISCONNECTED,
            WhatsAppDeviceEventType.LOGOUT,
            WhatsAppDeviceEventType.ERROR,
          ],
        },
      },
    });
  }

  private computeMetrics(
    jaring: KpiJaring[],
    reports: KpiReport[],
    bakets: Array<{
      id: string;
      status: string;
      primaryJaringId: string | null;
      createdAt: Date;
      _count: { convertedSourceMessages: number };
      versions: Array<{ sourceMessages: Array<{ messageId: string }> }>;
    }>,
    sourceMessageIds: Set<string>,
  ) {
    const totalJaring = jaring.length;
    const activeVerifiedIds = new Set(
      jaring
        .filter(
          (item) =>
            classifyJaringStatus(item.status, item.registrationStatus) ===
            JARING_STATUS_GROUP.ACTIVE_VERIFIED,
        )
        .map((item) => item.id),
    );
    const activeVerifiedJaring = activeVerifiedIds.size;

    const validReports = reports.filter((report) => this.isValidReport(report));
    const totalReports = reports.length;
    const validReportCount = validReports.length;
    const failedReports = reports.filter(
      (report) => this.reportStage(report) === REPORT_PROCESS_STAGE.FAILED,
    ).length;

    const productiveIds = new Set(
      validReports
        .filter((report) => activeVerifiedIds.has(report.jaringId))
        .map((report) => report.jaringId),
    );
    const productiveJaring = productiveIds.size;
    const notReportingJaring = activeVerifiedJaring - productiveJaring;
    const productivityPercent = percentage(
      productiveJaring,
      activeVerifiedJaring,
    );

    const reportsToBaketIds = new Set(
      validReports
        .filter(
          (report) =>
            Boolean(report.submittedMessage?.convertedBaketId) ||
            (report.submittedMessageId
              ? sourceMessageIds.has(report.submittedMessageId)
              : false),
        )
        .map((report) => report.id),
    );
    const reportsToBaket = reportsToBaketIds.size;
    const conversionPercent = percentage(reportsToBaket, validReportCount);

    const baketFromReport = bakets.filter(
      (baket) =>
        baket._count.convertedSourceMessages > 0 ||
        baket.versions.some((version) => version.sourceMessages.length > 0),
    ).length;
    const baketManual = bakets.length - baketFromReport;
    const baketWithoutSource = bakets.filter(
      (baket) =>
        baket._count.convertedSourceMessages === 0 &&
        baket.versions.every((version) => version.sourceMessages.length === 0),
    ).length;

    const jaringWithoutArea = jaring.filter(
      (item) => item.areaCoverages.length === 0,
    ).length;
    const unverified = jaring.filter(
      (item) =>
        classifyJaringStatus(item.status, item.registrationStatus) ===
        JARING_STATUS_GROUP.PENDING_APPROVAL,
    ).length;
    const other = jaring.filter(
      (item) =>
        classifyJaringStatus(item.status, item.registrationStatus) ===
        JARING_STATUS_GROUP.OTHER,
    ).length;

    return {
      totalJaring,
      activeVerifiedJaring,
      productiveJaring,
      notReportingJaring,
      productivityPercent,
      totalReports,
      validReportCount,
      failedReports,
      reportsToBaket,
      conversionPercent,
      totalBaket: bakets.length,
      baketFromReport,
      baketManual,
      baketWithoutSource,
      jaringWithoutArea,
      unverified,
      other,
    };
  }

  private buildCards(
    current: ReturnType<KpiService['computeMetrics']>,
    previous: ReturnType<KpiService['computeMetrics']>,
  ) {
    const card = (
      key: keyof typeof current,
      comparison: KpiComparison | null,
      opts?: { tone?: string },
    ) => ({
      key,
      value: current[key],
      comparison,
      tone: opts?.tone ?? 'neutral',
    });

    return [
      // Status Jaring adalah snapshot "sekarang"; perbandingan periode tidak
      // tersedia tanpa rekonstruksi historis, jadi jangan tampilkan "Tetap".
      card('totalJaring', null),
      card('activeVerifiedJaring', null),
      card(
        'productiveJaring',
        compareMetric(current.productiveJaring, previous.productiveJaring),
        { tone: 'positive' },
      ),
      card(
        'notReportingJaring',
        compareMetric(current.notReportingJaring, previous.notReportingJaring),
        { tone: 'warning' },
      ),
      {
        key: 'productivityPercent',
        value: current.productivityPercent,
        comparison: compareMetric(
          current.productivityPercent,
          previous.productivityPercent,
        ),
        tone: 'neutral',
      },
      card(
        'totalReports',
        compareMetric(current.totalReports, previous.totalReports),
      ),
      card(
        'reportsToBaket',
        compareMetric(current.reportsToBaket, previous.reportsToBaket),
        { tone: 'positive' },
      ),
      card(
        'baketManual',
        compareMetric(current.baketManual, previous.baketManual),
      ),
      card(
        'failedReports',
        compareMetric(current.failedReports, previous.failedReports),
        { tone: 'danger' },
      ),
    ];
  }

  private statusGroupBreakdown(jaring: KpiJaring[]) {
    const counts: Record<JaringStatusGroup, number> = {
      [JARING_STATUS_GROUP.ACTIVE_VERIFIED]: 0,
      [JARING_STATUS_GROUP.VERIFIED_INACTIVE]: 0,
      [JARING_STATUS_GROUP.PENDING_APPROVAL]: 0,
      [JARING_STATUS_GROUP.REJECTED]: 0,
      [JARING_STATUS_GROUP.UNVERIFIED]: 0,
      [JARING_STATUS_GROUP.OTHER]: 0,
    };
    for (const item of jaring) {
      const group = classifyJaringStatus(item.status, item.registrationStatus);
      counts[group] += 1;
      if (group === JARING_STATUS_GROUP.PENDING_APPROVAL) {
        counts[JARING_STATUS_GROUP.UNVERIFIED] += 1;
      }
    }
    return (Object.keys(counts) as JaringStatusGroup[]).map((key) => ({
      key,
      label: JARING_STATUS_GROUP_LABELS[key],
      value: counts[key],
    }));
  }

  private buildInsight(
    metrics: ReturnType<KpiService['computeMetrics']>,
    core: Awaited<ReturnType<KpiService['loadCore']>>,
    range: KpiDateRange,
  ) {
    const regions = this.groupByRegion(
      core.jaring,
      core.reports,
      core.sourceMessageIds,
    );
    const ranked = regions.filter((region) => region.activeVerified > 0);
    const top = ranked.length
      ? ranked.reduce((best, region) =>
          region.productivity > best.productivity ? region : best,
        )
      : null;
    const lowest = ranked.length
      ? ranked
          .filter((region) => region.activeVerified > 0)
          .reduce((worst, region) =>
            region.productivity < worst.productivity ? region : worst,
          )
      : null;
    const noReports = ranked
      .filter((region) => region.activeVerified > 0 && region.productive === 0)
      .slice(0, 8);

    return {
      periodLabel: `${range.from.toISOString()} sampai ${range.to.toISOString()}`,
      topRegion: top
        ? { name: top.name, productivity: top.productivity }
        : null,
      lowestRegion: lowest
        ? { name: lowest.name, productivity: lowest.productivity }
        : null,
      noReportRegions: noReports.map((region) => region.name),
    };
  }

  // ---------------------------------------------------------------------------
  // Produktivitas
  // ---------------------------------------------------------------------------

  private async loadProductivity(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const core = await this.loadCore(query, context, range);
    const activeVerifiedIds = new Set(
      core.jaring
        .filter(
          (item) =>
            classifyJaringStatus(item.status, item.registrationStatus) ===
            JARING_STATUS_GROUP.ACTIVE_VERIFIED,
        )
        .map((item) => item.id),
    );
    const validReports = core.reports.filter((report) =>
      this.isValidReport(report),
    );
    const reportsByJaring = new Map<string, number>();
    for (const report of validReports) {
      if (!activeVerifiedIds.has(report.jaringId)) continue;
      reportsByJaring.set(
        report.jaringId,
        (reportsByJaring.get(report.jaringId) ?? 0) + 1,
      );
    }
    const productiveCount = reportsByJaring.size;
    const activeVerified = activeVerifiedIds.size;
    const notReporting = activeVerified - productiveCount;
    const totalValid = validReports.length;
    const avgReportsPerProductive =
      productiveCount === 0
        ? 0
        : Math.round((totalValid / productiveCount) * 10) / 10;
    const baketProducingJaring = new Set(
      validReports
        .filter(
          (report) =>
            activeVerifiedIds.has(report.jaringId) &&
            (Boolean(report.submittedMessage?.convertedBaketId) ||
              (report.submittedMessageId
                ? core.sourceMessageIds.has(report.submittedMessageId)
                : false)),
        )
        .map((report) => report.jaringId),
    ).size;

    const frequencies = [
      { label: '0 laporan', min: 0, max: 0, value: notReporting },
      { label: '1 laporan', min: 1, max: 1, value: 0 },
      { label: '2–5 laporan', min: 2, max: 5, value: 0 },
      { label: '6–10 laporan', min: 6, max: 10, value: 0 },
      {
        label: 'Lebih dari 10 laporan',
        min: 11,
        max: Number.POSITIVE_INFINITY,
        value: 0,
      },
    ];
    for (const count of reportsByJaring.values()) {
      const bucket = frequencies.find(
        (item) => count >= item.min && count <= item.max,
      );
      if (bucket) bucket.value += 1;
    }

    const regionRanking = this.groupByRegion(
      core.jaring,
      core.reports,
      core.sourceMessageIds,
      KpiRegionLevel.PROVINCE,
      query.search,
    )
      .filter((region) => region.activeVerified > 0 || region.totalReports > 0)
      .map((region) => ({
        rank: 0,
        name: region.name,
        activeVerified: region.activeVerified,
        productive: region.productive,
        notReporting: region.notReporting,
        totalReports: region.totalReports,
        toBaket: region.toBaket,
        productivity: region.productivity,
      }))
      .sort((a, b) =>
        this.compareRegionRows(a, b, query.sortBy, query.sortOrder),
      );

    return {
      period: this.periodPayload(query, range),
      metrics: {
        activeVerified,
        productive: productiveCount,
        notReporting,
        productivityPercent: percentage(productiveCount, activeVerified),
        avgReportsPerProductive,
        oneReportJaring: frequencies[1].value,
        multipleReportJaring: productiveCount - frequencies[1].value,
        baketProducingJaring,
      },
      frequencyDistribution: frequencies,
      ranking: this.paginate(
        regionRanking.map((row, index) => ({ ...row, rank: index + 1 })),
        query,
      ),
    };
  }

  // ---------------------------------------------------------------------------
  // Perbandingan wilayah
  // ---------------------------------------------------------------------------

  private async loadRegionComparison(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const level = await this.resolveRegionLevel(context, query);
    const core = await this.loadCore(query, context, range);
    const extras = this.regionExtras(core, level);
    const previousCore = await this.loadCore(query, context, {
      from: range.previousFrom,
      to: range.previousTo,
      previousFrom: range.from,
      previousTo: range.to,
    });
    const previousByRegion = new Map(
      this.groupByRegion(
        previousCore.jaring,
        previousCore.reports,
        previousCore.sourceMessageIds,
        level,
      ).map((region) => [region.name, region.totalReports]),
    );

    const rows = this.groupByRegion(
      core.jaring,
      core.reports,
      core.sourceMessageIds,
      level,
      query.search,
    )
      .map((region) => ({
        id: region.id,
        name: region.name,
        level: region.level,
        productivity: region.productivity,
        activeVerified: region.activeVerified,
        productive: region.productive,
        notReporting: region.notReporting,
        totalReports: region.totalReports,
        toBaket: region.toBaket,
        kendala: extras.kendala.get(region.name) ?? 0,
        anomalies: extras.anomalies.get(region.name) ?? 0,
        change: region.totalReports - (previousByRegion.get(region.name) ?? 0),
      }))
      .sort((a, b) => b.activeVerified - a.activeVerified);

    return {
      period: this.periodPayload(query, range),
      level,
      breadcrumb: await this.regionBreadcrumb(context, query, level),
      rows: this.paginate(
        rows.map((row, index) => ({ rank: index + 1, ...row })),
        query,
      ),
    };
  }

  /** Hitung kendala (laporan gagal) dan anomali per wilayah. */
  private regionExtras(
    core: Awaited<ReturnType<KpiService['loadCore']>>,
    level: KpiRegionLevel,
  ): { kendala: Map<string, number>; anomalies: Map<string, number> } {
    const jaringRegion = new Map<string, RegionKey>();
    for (const jaring of core.jaring) {
      jaringRegion.set(
        jaring.id,
        this.resolveRegion(jaring.areaCoverages[0]?.area),
      );
    }
    const kendala = new Map<string, number>();
    const anomalies = new Map<string, number>();
    const anomalyJaring = new Set<string>();
    const jaringById = new Map(core.jaring.map((item) => [item.id, item]));

    for (const report of core.reports) {
      if (report.submittedMessage?.status === WhatsAppMessageStatus.ERROR) {
        const region = jaringRegion.get(report.jaringId);
        if (region) {
          const key = this.regionName(region, level);
          kendala.set(key, (kendala.get(key) ?? 0) + 1);
        }
      }
      const jaring = jaringById.get(report.jaringId);
      if (jaring) {
        const group = classifyJaringStatus(
          jaring.status,
          jaring.registrationStatus,
        );
        if (group !== JARING_STATUS_GROUP.ACTIVE_VERIFIED) {
          anomalyJaring.add(jaring.id);
        }
      }
    }
    for (const jaring of core.jaring) {
      if (jaring.areaCoverages.length === 0) anomalyJaring.add(jaring.id);
      if (
        classifyJaringStatus(jaring.status, jaring.registrationStatus) ===
        JARING_STATUS_GROUP.OTHER
      ) {
        anomalyJaring.add(jaring.id);
      }
    }
    for (const jaringId of anomalyJaring) {
      const region = jaringRegion.get(jaringId);
      if (region) {
        const key = this.regionName(region, level);
        anomalies.set(key, (anomalies.get(key) ?? 0) + 1);
      }
    }
    return { kendala, anomalies };
  }

  // ---------------------------------------------------------------------------
  // Laporan & Baket
  // ---------------------------------------------------------------------------

  private async loadReportsBaket(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const core = await this.loadCore(query, context, range);
    const validReports = core.reports.filter((report) =>
      this.isValidReport(report),
    );
    const stageCounts: Record<ReportProcessStage, number> = {
      [REPORT_PROCESS_STAGE.IN_PROGRESS]: 0,
      [REPORT_PROCESS_STAGE.READY_FOR_BAKET]: 0,
      [REPORT_PROCESS_STAGE.BAKET_CREATED]: 0,
      [REPORT_PROCESS_STAGE.FAILED]: 0,
    };
    let toBaket = 0;
    for (const report of validReports) {
      const isBaket =
        Boolean(report.submittedMessage?.convertedBaketId) ||
        (report.submittedMessageId
          ? core.sourceMessageIds.has(report.submittedMessageId)
          : false);
      const stage = isBaket
        ? REPORT_PROCESS_STAGE.BAKET_CREATED
        : REPORT_PROCESS_STAGE.READY_FOR_BAKET;
      stageCounts[stage] += 1;
      if (isBaket) toBaket += 1;
    }
    for (const report of core.reports) {
      if (this.reportStage(report) === REPORT_PROCESS_STAGE.FAILED)
        stageCounts[REPORT_PROCESS_STAGE.FAILED] += 1;
    }

    const bakets = core.bakets;
    const baketFromReport = bakets.filter(
      (baket) =>
        baket._count.convertedSourceMessages > 0 ||
        baket.versions.some((version) => version.sourceMessages.length > 0),
    ).length;
    const regionConversion = this.groupByRegion(
      core.jaring,
      core.reports,
      core.sourceMessageIds,
      KpiRegionLevel.PROVINCE,
      query.search,
    )
      .filter((region) => region.totalReports > 0)
      .sort((a, b) => b.conversion - a.conversion);

    return {
      period: this.periodPayload(query, range),
      pipeline: {
        total: core.reports.length,
        valid: validReports.length,
        byStage: (Object.keys(stageCounts) as ReportProcessStage[]).map(
          (key) => ({
            key,
            label: REPORT_PROCESS_STAGE_LABELS[key],
            value: stageCounts[key],
          }),
        ),
        toBaket,
        conversionPercent: percentage(toBaket, validReports.length),
        avgProcessingHours: this.averageProcessingHours(core.reports),
        pending: stageCounts[REPORT_PROCESS_STAGE.READY_FOR_BAKET],
        failed: stageCounts[REPORT_PROCESS_STAGE.FAILED],
      },
      baket: {
        total: bakets.length,
        fromReport: baketFromReport,
        manual: bakets.length - baketFromReport,
        withoutSource: bakets.length - baketFromReport,
      },
      trend: this.buildTrend(core.reports, range),
      highestConversionRegions: regionConversion.slice(0, 5).map((region) => ({
        name: region.name,
        conversion: region.conversion,
        totalReports: region.totalReports,
      })),
      lowestConversionRegions: regionConversion
        .slice(-5)
        .reverse()
        .map((region) => ({
          name: region.name,
          conversion: region.conversion,
          totalReports: region.totalReports,
        })),
    };
  }

  // ---------------------------------------------------------------------------
  // Kendala WhatsApp Center
  // ---------------------------------------------------------------------------

  private async loadWhatsappCenter(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const [channels, logs, failedMessages] = await Promise.all([
      this.prisma.integrationChannel.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          lastHealthAt: true,
          botState: {
            select: {
              connectionStatus: true,
              botPhoneNumber: true,
              lastConnectedAt: true,
              lastDisconnectedAt: true,
              lastError: true,
            },
          },
        },
      }),
      this.prisma.whatsAppDeviceActivityLog.findMany({
        where: {
          occurredAt: { gte: range.from, lte: range.to },
          eventType: {
            in: [
              WhatsAppDeviceEventType.DISCONNECTED,
              WhatsAppDeviceEventType.LOGOUT,
              WhatsAppDeviceEventType.ERROR,
              WhatsAppDeviceEventType.LOGIN,
              WhatsAppDeviceEventType.CONNECTING,
            ],
          },
        },
        orderBy: [{ channelId: 'asc' }, { occurredAt: 'asc' }],
        select: {
          id: true,
          channelId: true,
          eventType: true,
          connectionStatus: true,
          phoneNumber: true,
          scopeAreaId: true,
          reason: true,
          errorMessage: true,
          occurredAt: true,
        },
      }),
      this.prisma.whatsAppMessage.findMany({
        where: {
          status: WhatsAppMessageStatus.ERROR,
          receivedAt: { gte: range.from, lte: range.to },
        },
        select: {
          id: true,
          integrationChannelId: true,
          receivedAt: true,
          senderPhone: true,
        },
      }),
    ]);

    const incidents = this.filterIncidentsByType(
      this.buildIncidents(logs, range),
      query,
    );
    const channelStatus = channels.map((channel) => ({
      id: channel.id,
      code: channel.code,
      name: channel.name,
      number: maskPhone(channel.botState?.botPhoneNumber),
      status: this.channelStatusLabel(
        channel.status,
        channel.botState?.connectionStatus,
      ),
    }));

    const active = channelStatus.filter(
      (item) => item.status === 'aktif',
    ).length;
    const inactive = channelStatus.filter(
      (item) => item.status === 'tidak aktif',
    ).length;
    const disconnected = channelStatus.filter(
      (item) => item.status === 'terputus',
    ).length;
    const suspend = channelStatus.filter(
      (item) => item.status === 'suspend',
    ).length;
    const unknown = channelStatus.filter(
      (item) => item.status === 'tidak diketahui',
    ).length;

    const failuresWithCorrelation = failedMessages.map((message) => ({
      id: message.id,
      channelId: message.integrationChannelId,
      receivedAt: message.receivedAt,
      senderPhone: maskPhone(message.senderPhone),
      correlation: this.correlateFailure(message, incidents),
    }));

    return {
      period: this.periodPayload(query, range),
      channelStatus,
      summary: {
        total: channels.length,
        active,
        inactive,
        disconnected,
        suspend,
        unknown,
      },
      incidents: incidents.map((incident) => ({
        id: incident.id,
        channelId: incident.channelId,
        type: incident.type,
        startedAt: incident.startedAt.toISOString(),
        recoveredAt: incident.recoveredAt?.toISOString() ?? null,
        durationMinutes: incident.durationMinutes,
      })),
      failedAttempts: {
        total: failedMessages.length,
        proven: failuresWithCorrelation.filter(
          (item) => item.correlation === 'Terbukti terkait',
        ).length,
        possible: failuresWithCorrelation.filter(
          (item) => item.correlation === 'Kemungkinan terkait',
        ).length,
        unrelated: failuresWithCorrelation.filter(
          (item) => item.correlation === 'Tidak terkait',
        ).length,
        unverifiable: failuresWithCorrelation.filter(
          (item) => item.correlation === 'Tidak dapat diverifikasi',
        ).length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Anomali
  // ---------------------------------------------------------------------------

  private async loadAnomalies(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const core = await this.loadCore(query, context, range);
    const rows = this.detectAnomalyRows(core);

    if (query.anomalyType && query.anomalyType !== KpiAnomalyFilter.ALL) {
      const filtered = rows.filter((row) => row.typeKey === query.anomalyType);
      return {
        period: this.periodPayload(query, range),
        total: filtered.length,
        rows: filtered.map((row, index) => ({ no: index + 1, ...row })),
      };
    }

    return {
      period: this.periodPayload(query, range),
      total: rows.length,
      rows: rows.map((row, index) => ({ no: index + 1, ...row })),
    };
  }

  private detectAnomalyRows(
    core: Awaited<ReturnType<KpiService['loadCore']>>,
  ): Array<{
    type: string;
    typeKey: KpiAnomalyFilter;
    wilayah: string;
    kecamatan: string;
    jaringCount: number;
    eventCount: number;
    status: string;
    description: string;
  }> {
    const jaringById = new Map(core.jaring.map((item) => [item.id, item]));
    const regionByJaring = new Map<string, string>();
    for (const jaring of core.jaring) {
      const region = this.resolveRegion(jaring.areaCoverages[0]?.area);
      regionByJaring.set(
        jaring.id,
        region.districtName || region.regencyName || region.provinceName,
      );
    }

    const rows: Array<{
      type: string;
      typeKey: KpiAnomalyFilter;
      wilayah: string;
      kecamatan: string;
      jaringCount: number;
      eventCount: number;
      status: string;
      description: string;
    }> = [];

    const addRow = (
      typeKey: KpiAnomalyFilter,
      label: string,
      jaringIds: Set<string>,
      eventCount: number,
      description: string,
    ) => {
      if (jaringIds.size === 0 && eventCount === 0) return;
      rows.push({
        type: label,
        typeKey,
        wilayah: [...jaringIds]
          .map((id) => regionByJaring.get(id) ?? 'Wilayah Belum Terpetakan')
          .join(', ')
          .slice(0, 160),
        kecamatan: [...jaringIds]
          .map((id) => regionByJaring.get(id) ?? '-')
          .join(', ')
          .slice(0, 160),
        jaringCount: jaringIds.size,
        eventCount,
        status: 'Perlu perhatian',
        description,
      });
    };

    const invalidStatuses = new Set<string>(INVALID_REPORT_MESSAGE_STATUSES);

    const pendingReporting = new Set<string>();
    const rejectedReporting = new Set<string>();
    const unverifiedReporting = new Set<string>();
    const inactiveReporting = new Set<string>();
    const senderMismatch = new Set<string>();
    const duplicateReports = new Set<string>();
    const activeVerifiedFailed = new Set<string>();
    for (const report of core.reports) {
      const jaring = jaringById.get(report.jaringId);
      const group = jaring
        ? classifyJaringStatus(jaring.status, jaring.registrationStatus)
        : JARING_STATUS_GROUP.OTHER;
      if (group === JARING_STATUS_GROUP.PENDING_APPROVAL) {
        pendingReporting.add(report.jaringId);
        // "Belum Terverifikasi" adalah alias dari "Menunggu Persetujuan" (PENDING).
        unverifiedReporting.add(report.jaringId);
      }
      if (group === JARING_STATUS_GROUP.REJECTED)
        rejectedReporting.add(report.jaringId);
      if (group === JARING_STATUS_GROUP.VERIFIED_INACTIVE)
        inactiveReporting.add(report.jaringId);
      if (
        jaring &&
        report.senderPhone &&
        jaring.whatsappNumber &&
        report.senderPhone !== jaring.whatsappNumber
      )
        senderMismatch.add(report.jaringId);
      if (
        report.submittedMessage &&
        invalidStatuses.has(report.submittedMessage.status)
      )
        duplicateReports.add(report.jaringId);
      if (
        group === JARING_STATUS_GROUP.ACTIVE_VERIFIED &&
        report.submittedMessage &&
        report.submittedMessage.status === WhatsAppMessageStatus.ERROR
      )
        activeVerifiedFailed.add(report.jaringId);
    }

    const jaringWithoutArea = new Set(
      core.jaring
        .filter((item) => item.areaCoverages.length === 0)
        .map((item) => item.id),
    );
    const unmappedStatus = new Set(
      core.jaring
        .filter(
          (item) =>
            classifyJaringStatus(item.status, item.registrationStatus) ===
            JARING_STATUS_GROUP.OTHER,
        )
        .map((item) => item.id),
    );
    const baketWithoutSource = core.bakets.filter(
      (baket) =>
        baket._count.convertedSourceMessages === 0 &&
        baket.versions.every((version) => version.sourceMessages.length === 0),
    ).length;

    addRow(
      KpiAnomalyFilter.PENDING_REPORTING,
      'Menunggu Persetujuan mengirim laporan',
      pendingReporting,
      pendingReporting.size,
      'Jaring berstatus Menunggu Persetujuan tercatat mengirim Laporan Jaring.',
    );
    addRow(
      KpiAnomalyFilter.REJECTED_REPORTING,
      'Ditolak mengirim laporan',
      rejectedReporting,
      rejectedReporting.size,
      'Jaring berstatus Ditolak tercatat mengirim Laporan Jaring.',
    );
    addRow(
      KpiAnomalyFilter.UNVERIFIED_REPORTING,
      'Belum Terverifikasi mengirim laporan',
      unverifiedReporting,
      unverifiedReporting.size,
      'Jaring belum terverifikasi tercatat mengirim Laporan Jaring.',
    );
    addRow(
      KpiAnomalyFilter.INACTIVE_REPORTING,
      'Nonaktif mengirim laporan',
      inactiveReporting,
      inactiveReporting.size,
      'Jaring terverifikasi tetapi nonaktif tercatat mengirim Laporan Jaring.',
    );
    addRow(
      KpiAnomalyFilter.SENDER_MISMATCH,
      'Nomor pengirim tidak sesuai',
      senderMismatch,
      senderMismatch.size,
      'Nomor pengirim berbeda dari nomor WhatsApp Jaring terdaftar.',
    );
    addRow(
      KpiAnomalyFilter.DUPLICATE_REPORT,
      'Laporan ganda',
      duplicateReports,
      duplicateReports.size,
      'Laporan terdeteksi duplikat atau spam.',
    );
    addRow(
      KpiAnomalyFilter.JARING_WITHOUT_AREA,
      'Jaring tanpa wilayah',
      jaringWithoutArea,
      jaringWithoutArea.size,
      'Jaring tidak memiliki relasi wilayah cakupan.',
    );
    addRow(
      KpiAnomalyFilter.UNMAPPED_STATUS,
      'Status Jaring tidak terpetakan',
      unmappedStatus,
      unmappedStatus.size,
      'Kombinasi status Jaring belum terpetakan ke kategori resmi.',
    );
    addRow(
      KpiAnomalyFilter.ACTIVE_VERIFIED_FAILED,
      'Aktif Terverifikasi gagal melapor',
      activeVerifiedFailed,
      activeVerifiedFailed.size,
      'Jaring Aktif Terverifikasi memiliki laporan berstatus error.',
    );
    if (baketWithoutSource > 0) {
      rows.push({
        type: 'Baket tanpa sumber Laporan Jaring',
        typeKey: KpiAnomalyFilter.BAKET_WITHOUT_SOURCE,
        wilayah: '-',
        kecamatan: '-',
        jaringCount: 0,
        eventCount: baketWithoutSource,
        status: 'Perlu perhatian',
        description: 'Baket dibuat manual tanpa relasi sumber Laporan Jaring.',
      });
    }

    return rows;
  }

  // ---------------------------------------------------------------------------
  // Tren & Detail
  // ---------------------------------------------------------------------------

  private async loadTrends(
    query: KpiQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const core = await this.loadCore(query, context, range);
    const previousCore = await this.loadCore(query, context, {
      from: range.previousFrom,
      to: range.previousTo,
      previousFrom: range.from,
      previousTo: range.to,
    });
    const current = core.metrics;
    const previous = previousCore.metrics;

    const series = this.buildTrend(core.reports, range);
    const [kendalaCount, previousKendalaCount] = await Promise.all([
      this.countKendala(range),
      this.countKendala({
        from: range.previousFrom,
        to: range.previousTo,
        previousFrom: range.from,
        previousTo: range.to,
      }),
    ]);
    const anomaliesCount = this.detectAnomalyRows(core).length;
    const previousAnomaliesCount = this.detectAnomalyRows(previousCore).length;

    const metricsTrend = [
      {
        key: 'activeVerifiedJaring',
        label: 'Jaring Aktif Terverifikasi',
        current: current.activeVerifiedJaring,
        previous: previous.activeVerifiedJaring,
        comparison: compareMetric(
          current.activeVerifiedJaring,
          previous.activeVerifiedJaring,
        ),
      },
      {
        key: 'productiveJaring',
        label: 'Jaring Produktif',
        current: current.productiveJaring,
        previous: previous.productiveJaring,
        comparison: compareMetric(
          current.productiveJaring,
          previous.productiveJaring,
        ),
      },
      {
        key: 'productivityPercent',
        label: 'Persentase produktivitas',
        current: current.productivityPercent,
        previous: previous.productivityPercent,
        comparison: compareMetric(
          current.productivityPercent,
          previous.productivityPercent,
        ),
      },
      {
        key: 'totalReports',
        label: 'Total Laporan Jaring',
        current: current.totalReports,
        previous: previous.totalReports,
        comparison: compareMetric(current.totalReports, previous.totalReports),
      },
      {
        key: 'totalBaket',
        label: 'Total Baket',
        current: current.totalBaket,
        previous: previous.totalBaket,
        comparison: compareMetric(current.totalBaket, previous.totalBaket),
      },
      {
        key: 'conversionPercent',
        label: 'Konversi laporan menjadi Baket',
        current: current.conversionPercent,
        previous: previous.conversionPercent,
        comparison: compareMetric(
          current.conversionPercent,
          previous.conversionPercent,
        ),
      },
      {
        key: 'verifiedKendala',
        label: 'Kendala Terverifikasi',
        current: kendalaCount,
        previous: previousKendalaCount,
        comparison: compareMetric(kendalaCount, previousKendalaCount),
      },
      {
        key: 'anomalies',
        label: 'Anomali Pelaporan',
        current: anomaliesCount,
        previous: previousAnomaliesCount,
        comparison: compareMetric(anomaliesCount, previousAnomaliesCount),
      },
    ];

    return {
      period: this.periodPayload(query, range),
      series,
      metricsTrend,
    };
  }

  private async loadDetail(
    query: KpiDetailQueryDto,
    context: AuthorizationContext,
    range: KpiDateRange,
  ) {
    const core = await this.loadCore(query, context, range);
    const allowedMetrics = [
      'totalJaring',
      'activeVerifiedJaring',
      'productiveJaring',
      'notReportingJaring',
      'productivityPercent',
      'totalReports',
      'totalBaket',
      'conversionPercent',
      'failedReports',
      'jaringWithoutArea',
    ];
    if (!allowedMetrics.includes(query.metric)) {
      throw new ApiException(
        'KPI_INVALID_METRIC',
        'Metrik tidak dikenali.',
        400,
      );
    }

    let rows: Array<{ dimension: string; value: number }>;
    if (query.dimension === 'status') {
      const breakdown = this.statusGroupBreakdown(core.jaring);
      rows = breakdown.map((item) => ({
        dimension: item.label,
        value: item.value,
      }));
    } else if (query.dimension === 'wilayah') {
      rows = this.groupByRegion(
        core.jaring,
        core.reports,
        core.sourceMessageIds,
        KpiRegionLevel.PROVINCE,
        query.search,
      ).map((region) => ({
        dimension: region.name,
        value: this.metricValue(core, region, query.metric),
      }));
    } else if (query.dimension === 'waktu') {
      const trend = this.buildTrend(core.reports, range);
      rows = trend.points.map((point) => ({
        dimension: point.bucket,
        value: point.total,
      }));
    } else {
      throw new ApiException(
        'KPI_INVALID_DIMENSION',
        'Dimensi tidak dikenali.',
        400,
      );
    }

    rows.sort((a, b) => b.value - a.value);
    return {
      period: this.periodPayload(query, range),
      metric: query.metric,
      dimension: query.dimension,
      rows,
    };
  }

  private metricValue(
    core: Awaited<ReturnType<KpiService['loadCore']>>,
    region: ReturnType<KpiService['groupByRegion']>[number],
    metric: string,
  ) {
    switch (metric) {
      case 'activeVerifiedJaring':
        return region.activeVerified;
      case 'productiveJaring':
        return region.productive;
      case 'notReportingJaring':
        return region.notReporting;
      case 'productivityPercent':
        return region.productivity;
      case 'totalReports':
        return region.totalReports;
      case 'totalBaket':
        return region.toBaket;
      case 'conversionPercent':
        return region.conversion;
      default:
        return region.totalReports;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper agregasi wilayah
  // ---------------------------------------------------------------------------

  private groupByRegion(
    jaring: KpiJaring[],
    reports: KpiReport[],
    sourceMessageIds: Set<string>,
    level: KpiRegionLevel = KpiRegionLevel.PROVINCE,
    search?: string,
  ) {
    const activeVerifiedIds = new Set(
      jaring
        .filter(
          (item) =>
            classifyJaringStatus(item.status, item.registrationStatus) ===
            JARING_STATUS_GROUP.ACTIVE_VERIFIED,
        )
        .map((item) => item.id),
    );
    const validReports = reports.filter((report) => this.isValidReport(report));
    const jaringRegion = new Map<string, RegionKey>();
    for (const item of jaring) {
      jaringRegion.set(
        item.id,
        this.resolveRegion(item.areaCoverages[0]?.area),
      );
    }
    const reportRegion = new Map<string, RegionKey>();
    for (const report of validReports) {
      const region = jaringRegion.get(report.jaringId) ?? this.emptyRegion();
      reportRegion.set(report.id, region);
    }

    const groups = new Map<
      string,
      {
        id: string;
        name: string;
        level: KpiRegionLevel;
        activeVerified: Set<string>;
        productive: Set<string>;
        reports: number;
        toBaket: number;
      }
    >();
    const ensure = (id: string, name: string) => {
      const existing = groups.get(id);
      if (existing) return existing;
      const created = {
        id,
        name,
        level,
        activeVerified: new Set<string>(),
        productive: new Set<string>(),
        reports: 0,
        toBaket: 0,
      };
      groups.set(id, created);
      return created;
    };

    for (const item of jaring) {
      if (!activeVerifiedIds.has(item.id)) continue;
      const region = jaringRegion.get(item.id) ?? this.emptyRegion();
      ensure(
        this.regionId(region, level),
        this.regionName(region, level),
      ).activeVerified.add(item.id);
    }
    for (const report of validReports) {
      const region = reportRegion.get(report.id) ?? this.emptyRegion();
      const group = ensure(
        this.regionId(region, level),
        this.regionName(region, level),
      );
      group.reports += 1;
      if (activeVerifiedIds.has(report.jaringId))
        group.productive.add(report.jaringId);
      const isBaket =
        Boolean(report.submittedMessage?.convertedBaketId) ||
        (report.submittedMessageId
          ? sourceMessageIds.has(report.submittedMessageId)
          : false);
      if (isBaket) group.toBaket += 1;
    }

    return [...groups.values()]
      .map((group) => {
        const activeVerified = group.activeVerified.size;
        const productive = group.productive.size;
        return {
          id: group.id,
          name: group.name,
          level: group.level,
          activeVerified,
          productive,
          notReporting: activeVerified - productive,
          totalReports: group.reports,
          toBaket: group.toBaket,
          productivity: percentage(productive, activeVerified),
          conversion: percentage(group.toBaket, group.reports),
          kendala: 0,
          anomalies: 0,
        };
      })
      .filter(
        (row) =>
          !search ||
          row.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private resolveRegion(area?: AreaNode | null): RegionKey {
    if (!area) return this.emptyRegion();
    const chain: AreaNode[] = [];
    let current: AreaNode | null | undefined = area;
    while (current) {
      chain.push(current);
      current = current.parent;
    }
    const find = (levels: string[]) =>
      chain.find((node) => levels.includes(node.level));
    const province = find(['PROVINCE']);
    const regency = find(['REGENCY', 'CITY']);
    const district = find(['DISTRICT']);
    return {
      provinceId: province?.id ?? null,
      provinceName: province?.name ?? 'Wilayah Belum Terpetakan',
      regencyId: regency?.id ?? null,
      regencyName: regency?.name ?? 'Wilayah Belum Terpetakan',
      districtId: district?.id ?? null,
      districtName: district?.name ?? 'Wilayah Belum Terpetakan',
    };
  }

  private emptyRegion(): RegionKey {
    return {
      provinceId: null,
      provinceName: 'Wilayah Belum Terpetakan',
      regencyId: null,
      regencyName: 'Wilayah Belum Terpetakan',
      districtId: null,
      districtName: 'Wilayah Belum Terpetakan',
    };
  }

  private regionName(region: RegionKey, level: KpiRegionLevel): string {
    if (level === KpiRegionLevel.DISTRICT) {
      return region.districtName !== 'Wilayah Belum Terpetakan'
        ? `${region.districtName} (${region.regencyName})`
        : region.districtName;
    }
    if (level === KpiRegionLevel.REGENCY) {
      return region.regencyName;
    }
    return region.provinceName;
  }

  private regionId(region: RegionKey, level: KpiRegionLevel): string {
    if (level === KpiRegionLevel.DISTRICT) {
      return region.districtId ?? region.districtName;
    }
    if (level === KpiRegionLevel.REGENCY) {
      return region.regencyId ?? region.regencyName;
    }
    return region.provinceId ?? region.provinceName;
  }

  private async resolveRegionLevel(
    context: AuthorizationContext,
    query: KpiQueryDto,
  ): Promise<KpiRegionLevel> {
    if (query.childLevel) return query.childLevel;
    if (query.areaId) {
      const area = await this.prisma.administrativeArea.findUnique({
        where: { id: query.areaId },
        select: { level: true },
      });
      if (area) {
        if (area.level === 'PROVINCE') return KpiRegionLevel.REGENCY;
        return KpiRegionLevel.DISTRICT;
      }
    }
    const levels = new Set(context.areaScopes.map((scope) => scope.level));
    if (levels.has('DISTRICT')) return KpiRegionLevel.DISTRICT;
    if (levels.has('REGENCY') || levels.has('CITY'))
      return KpiRegionLevel.REGENCY;
    return KpiRegionLevel.PROVINCE;
  }

  private async regionBreadcrumb(
    context: AuthorizationContext,
    query: KpiQueryDto,
    level: KpiRegionLevel,
  ): Promise<{ root: string; level: KpiRegionLevel; label: string }> {
    let root =
      context.areaScopes.length > 0
        ? context.areaScopes.map((scope) => scope.name).join(', ')
        : 'Nasional';
    if (query.areaId) {
      const area = await this.prisma.administrativeArea.findUnique({
        where: { id: query.areaId },
        select: { name: true },
      });
      if (area) root = area.name;
    }
    return {
      root,
      level,
      label: 'Nasional → Provinsi/BINDA → Kabupaten/Kota → Kecamatan',
    };
  }

  private compareRegionRows(
    a: {
      productivity: number;
      totalReports: number;
      toBaket: number;
      notReporting: number;
      activeVerified: number;
    },
    b: {
      productivity: number;
      totalReports: number;
      toBaket: number;
      notReporting: number;
      activeVerified: number;
    },
    sortBy: string | undefined,
    sortOrder: 'asc' | 'desc',
  ) {
    const direction = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'reports':
        return (a.totalReports - b.totalReports) * direction;
      case 'baket':
        return (a.toBaket - b.toBaket) * direction;
      case 'notReporting':
        return (a.notReporting - b.notReporting) * direction;
      case 'activeVerified':
        return (a.activeVerified - b.activeVerified) * direction;
      case 'productivity':
      default:
        return (a.productivity - b.productivity) * direction;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper laporan
  // ---------------------------------------------------------------------------

  private isValidReport(report: KpiReport): boolean {
    if (!report.submittedAt) return false;
    const messageStatus = report.submittedMessage?.status;
    if (
      messageStatus &&
      INVALID_REPORT_MESSAGE_STATUSES.includes(messageStatus)
    )
      return false;
    return true;
  }

  private reportStage(report: KpiReport): ReportProcessStage {
    if (report.submittedMessage?.status === WhatsAppMessageStatus.ERROR)
      return REPORT_PROCESS_STAGE.FAILED;
    if (
      report.status === WhatsAppReportSessionStatus.EXPIRED ||
      report.status === WhatsAppReportSessionStatus.CANCELLED
    )
      return REPORT_PROCESS_STAGE.FAILED;
    if (report.submittedMessage?.convertedBaketId)
      return REPORT_PROCESS_STAGE.BAKET_CREATED;
    if (report.submittedAt) return REPORT_PROCESS_STAGE.READY_FOR_BAKET;
    return REPORT_PROCESS_STAGE.IN_PROGRESS;
  }

  private averageProcessingHours(reports: KpiReport[]) {
    const baketReports = reports.filter(
      (report) =>
        report.submittedAt &&
        report.submittedMessage?.convertedBaket?.createdAt,
    );
    if (baketReports.length === 0) return null;
    const totalHours = baketReports.reduce((sum, report) => {
      const createdAt =
        report.submittedMessage!.convertedBaket!.createdAt.getTime();
      return sum + (createdAt - report.submittedAt!.getTime()) / 3_600_000;
    }, 0);
    const average = totalHours / baketReports.length;
    return Math.max(0, Math.round(average * 10) / 10) || null;
  }

  private buildTrend(reports: KpiReport[], range: KpiDateRange) {
    const durationDays = Math.max(
      1,
      Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000),
    );
    const granularity =
      durationDays <= 45 ? 'day' : durationDays <= 370 ? 'month' : 'year';
    const buckets = new Map<
      string,
      { bucket: string; total: number; toBaket: number }
    >();
    for (const report of reports) {
      const date = report.submittedAt ?? report.startedAt;
      if (!date) continue;
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
      const item = buckets.get(bucket) ?? { bucket, total: 0, toBaket: 0 };
      item.total += 1;
      if (report.submittedMessage?.convertedBaketId) item.toBaket += 1;
      buckets.set(bucket, item);
    }
    return {
      granularity,
      points: [...buckets.values()].sort((a, b) =>
        a.bucket.localeCompare(b.bucket),
      ),
    };
  }

  // ---------------------------------------------------------------------------
  // Helper kendala
  // ---------------------------------------------------------------------------

  private buildIncidents(
    logs: Array<{
      id: string;
      channelId: string;
      eventType: string;
      connectionStatus: string;
      phoneNumber: string | null;
      scopeAreaId: string | null;
      reason: string | null;
      errorMessage: string | null;
      occurredAt: Date;
    }>,
    range: KpiDateRange,
  ) {
    const downTypes = new Set<string>([
      WhatsAppDeviceEventType.DISCONNECTED,
      WhatsAppDeviceEventType.LOGOUT,
      WhatsAppDeviceEventType.ERROR,
    ]);
    const upTypes = new Set<string>([
      WhatsAppDeviceEventType.LOGIN,
      WhatsAppDeviceEventType.CONNECTING,
    ]);
    const incidents: Array<{
      id: string;
      channelId: string;
      type: string;
      startedAt: Date;
      recoveredAt: Date | null;
      durationMinutes: number;
      interval: { from: Date; to: Date };
    }> = [];
    const byChannel = new Map<string, typeof logs>();
    for (const log of logs) {
      const items = byChannel.get(log.channelId) ?? [];
      items.push(log);
      byChannel.set(log.channelId, items);
    }
    for (const [channelId, channelLogs] of byChannel) {
      let open: (typeof channelLogs)[number] | null = null;
      for (const log of channelLogs) {
        if (downTypes.has(log.eventType)) {
          if (!open) open = log;
        } else if (upTypes.has(log.eventType) && open) {
          const durationMinutes = Math.round(
            (log.occurredAt.getTime() - open.occurredAt.getTime()) / 60_000,
          );
          incidents.push({
            id: open.id,
            channelId,
            type:
              open.eventType === WhatsAppDeviceEventType.ERROR
                ? 'error'
                : open.eventType === WhatsAppDeviceEventType.LOGOUT
                  ? 'suspend'
                  : 'terputus',
            startedAt: open.occurredAt,
            recoveredAt: log.occurredAt,
            durationMinutes,
            interval: { from: open.occurredAt, to: log.occurredAt },
          });
          open = null;
        }
      }
      if (open) {
        const durationMinutes = Math.round(
          (range.to.getTime() - open.occurredAt.getTime()) / 60_000,
        );
        incidents.push({
          id: open.id,
          channelId,
          type:
            open.eventType === WhatsAppDeviceEventType.ERROR
              ? 'error'
              : open.eventType === WhatsAppDeviceEventType.LOGOUT
                ? 'suspend'
                : 'terputus',
          startedAt: open.occurredAt,
          recoveredAt: null,
          durationMinutes,
          interval: { from: open.occurredAt, to: range.to },
        });
      }
    }
    return incidents.sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
    );
  }

  private correlateFailure(
    message: { integrationChannelId: string; receivedAt: Date },
    incidents: Array<{ channelId: string; interval: { from: Date; to: Date } }>,
  ) {
    const channelIncidents = incidents.filter(
      (incident) => incident.channelId === message.integrationChannelId,
    );
    if (channelIncidents.length === 0) return 'Tidak dapat diverifikasi';
    const overlapping = channelIncidents.some(
      (incident) =>
        message.receivedAt >= incident.interval.from &&
        message.receivedAt <= incident.interval.to,
    );
    if (overlapping) return 'Terbukti terkait';
    const near = channelIncidents.some(
      (incident) =>
        Math.abs(
          message.receivedAt.getTime() - incident.interval.from.getTime(),
        ) <=
        2 * 3_600_000,
    );
    return near ? 'Kemungkinan terkait' : 'Tidak terkait';
  }

  private channelStatusLabel(
    status: IntegrationStatus,
    connectionStatus?: WhatsAppBotConnectionStatus | null,
  ) {
    if (status === IntegrationStatus.INACTIVE) return 'tidak aktif';
    if (connectionStatus === WhatsAppBotConnectionStatus.DISCONNECTED)
      return 'terputus';
    if (
      connectionStatus === WhatsAppBotConnectionStatus.ERROR ||
      status === IntegrationStatus.ERROR
    )
      return 'error';
    if (connectionStatus === WhatsAppBotConnectionStatus.CONNECTED)
      return 'aktif';
    if (status === IntegrationStatus.DEGRADED) return 'suspend';
    return 'tidak diketahui';
  }

  private filterIncidentsByType<T extends { type: string }>(
    incidents: T[],
    query: KpiQueryDto,
  ): T[] {
    switch (query.kendalaType) {
      case KpiKendalaFilter.DISCONNECTED:
        return incidents.filter((incident) => incident.type === 'terputus');
      case KpiKendalaFilter.ERROR:
        return incidents.filter((incident) => incident.type === 'error');
      case KpiKendalaFilter.SUSPEND:
        return incidents.filter((incident) => incident.type === 'suspend');
      case KpiKendalaFilter.INACTIVE:
      case KpiKendalaFilter.UNKNOWN:
      case KpiKendalaFilter.ALL:
      default:
        return incidents;
    }
  }

  // ---------------------------------------------------------------------------
  // Helper filter & periode
  // ---------------------------------------------------------------------------

  private jaringStatusFilterWhere(query: KpiQueryDto): Prisma.JaringWhereInput {
    switch (query.jaringStatus) {
      case KpiJaringStatusFilter.ACTIVE_VERIFIED:
        return { registrationStatus: 'APPROVED', status: JaringStatus.ACTIVE };
      case KpiJaringStatusFilter.VERIFIED_INACTIVE:
        return {
          registrationStatus: 'APPROVED',
          status: {
            in: [
              JaringStatus.INACTIVE,
              JaringStatus.TRANSFERRED,
              JaringStatus.ARCHIVED,
            ],
          },
        };
      case KpiJaringStatusFilter.PENDING_APPROVAL:
      case KpiJaringStatusFilter.UNVERIFIED:
        return { registrationStatus: 'PENDING' };
      case KpiJaringStatusFilter.REJECTED:
        return { registrationStatus: 'REJECTED' };
      default:
        return {};
    }
  }

  private appliedFilters(query: KpiQueryDto) {
    return {
      period: query.period,
      timezone: query.timezone,
      areaId: query.areaId ?? null,
      childLevel: query.childLevel ?? null,
      jaringStatus: query.jaringStatus ?? KpiJaringStatusFilter.ALL,
      reportStatus: query.reportStatus ?? KpiReportStatusFilter.ALL,
      baketSource: query.baketSource ?? KpiBaketSourceFilter.ALL,
      kendalaType: query.kendalaType ?? 'ALL',
      anomalyType: query.anomalyType ?? KpiAnomalyFilter.ALL,
      search: query.search ?? null,
    };
  }

  private periodPayload(query: KpiQueryDto, range: KpiDateRange) {
    return {
      preset: query.period,
      timezone: query.timezone,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    };
  }

  private paginate<T>(items: T[], query: KpiQueryDto) {
    const limit = query.limit;
    const page = query.page;
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    return {
      items: items.slice(start, start + limit),
      pagination: { page, limit, total, totalPages },
    };
  }

  private timezoneOffsetMs(query: KpiQueryDto): number {
    switch (query.timezone) {
      case 'Asia/Makassar':
        return 8 * 60 * 60 * 1000;
      case 'Asia/Jayapura':
        return 9 * 60 * 60 * 1000;
      case 'Asia/Jakarta':
      default:
        return JAKARTA_OFFSET_MS;
    }
  }

  private resolveRange(query: KpiQueryDto): KpiDateRange {
    const now = new Date();
    const offset = this.timezoneOffsetMs(query);
    const zonedNow = new Date(now.getTime() + offset);
    const year = zonedNow.getUTCFullYear();
    const month = zonedNow.getUTCMonth();
    const day = zonedNow.getUTCDate();
    const startOfDay = this.zonedDate(offset, year, month, day);
    const startOfWeek = new Date(
      startOfDay.getTime() - zonedNow.getUTCDay() * 86_400_000,
    );
    let from: Date;
    let to = now;

    switch (query.period) {
      case KpiPeriod.TODAY:
        from = startOfDay;
        break;
      case KpiPeriod.YESTERDAY:
        from = new Date(startOfDay.getTime() - 86_400_000);
        to = new Date(startOfDay.getTime() - 1);
        break;
      case KpiPeriod.LAST_7_DAYS:
        from = new Date(startOfDay.getTime() - 6 * 86_400_000);
        break;
      case KpiPeriod.LAST_14_DAYS:
        from = new Date(startOfDay.getTime() - 13 * 86_400_000);
        break;
      case KpiPeriod.THIS_WEEK:
        from = startOfWeek;
        break;
      case KpiPeriod.PREVIOUS_WEEK:
        from = new Date(startOfWeek.getTime() - 7 * 86_400_000);
        to = new Date(startOfWeek.getTime() - 1);
        break;
      case KpiPeriod.THIS_MONTH:
        from = this.zonedDate(offset, year, month, 1);
        break;
      case KpiPeriod.PREVIOUS_MONTH:
        from = this.zonedDate(offset, year, month - 1, 1);
        to = new Date(this.zonedDate(offset, year, month, 1).getTime() - 1);
        break;
      case KpiPeriod.THIS_YEAR:
        from = this.zonedDate(offset, year, 0, 1);
        break;
      case KpiPeriod.CUSTOM:
        if (!query.from || !query.to) {
          throw new ApiException(
            'KPI_CUSTOM_PERIOD_REQUIRED',
            'Periode kustom membutuhkan tanggal mulai dan tanggal selesai.',
            400,
          );
        }
        from = this.parseZonedBoundary(offset, query.from, false);
        to = this.parseZonedBoundary(offset, query.to, true);
        break;
      case KpiPeriod.LAST_30_DAYS:
      default:
        from = new Date(startOfDay.getTime() - 29 * 86_400_000);
        break;
    }
    if (from.getTime() > to.getTime()) {
      throw new ApiException(
        'KPI_DATE_RANGE_INVALID',
        'Tanggal mulai tidak boleh setelah tanggal selesai.',
        400,
      );
    }
    const duration = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - duration);
    return { from, to, previousFrom, previousTo };
  }

  private zonedDate(
    offset: number,
    year: number,
    zeroBasedMonth: number,
    day: number,
  ) {
    return new Date(Date.UTC(year, zeroBasedMonth, day, 0, 0, 0, 0) - offset);
  }

  private parseZonedBoundary(offset: number, value: string, endOfDay: boolean) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      const start = this.zonedDate(offset, year, month - 1, day);
      return endOfDay ? new Date(start.getTime() + 86_400_000 - 1) : start;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new ApiException('KPI_DATE_INVALID', 'Tanggal tidak valid.', 400);
    }
    return parsed;
  }
}
