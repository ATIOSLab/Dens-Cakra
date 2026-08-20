export type KpiComparison = {
  previous: number;
  delta: number;
  percent: number | null;
  direction: "up" | "down" | "flat";
};

export type KpiCard = {
  key: string;
  value: number;
  comparison: KpiComparison | null;
  tone: string;
};

export type KpiStatusGroup = {
  key: string;
  label: string;
  value: number;
};

export type KpiMetricDefinition = {
  key: string;
  label: string;
  description: string;
  formula: string;
  format: "number" | "percentage";
  entity: string;
  drilldown: string | null;
};

export type KpiScope = {
  role: string;
  roleCode: string;
  commandRouteType: string;
  organizationUnitName: string;
  supervisionLabel: string;
  label: string;
};

export type KpiSummary = {
  generatedAt: string;
  period: { from: string; to: string; timezone: string };
  scope: KpiScope;
  metricDefinitions: KpiMetricDefinition[];
  cards: KpiCard[];
  statusBreakdown: {
    totalJaring: number;
    groups: KpiStatusGroup[];
    unverified: number;
    other: number;
    withoutArea: number;
  };
  insight: {
    periodLabel: string;
    topRegion: { name: string; productivity: number } | null;
    lowestRegion: { name: string; productivity: number } | null;
    noReportRegions: string[];
  } | null;
};

export type KpiFrequencyBucket = { label: string; value: number };

export type KpiRankingRow = {
  rank: number;
  name: string;
  activeVerified: number;
  productive: number;
  notReporting: number;
  totalReports: number;
  toBaket: number;
  productivity: number;
};

export type KpiProductivity = {
  metrics: {
    activeVerified: number;
    productive: number;
    notReporting: number;
    productivityPercent: number;
    avgReportsPerProductive: number;
    oneReportJaring: number;
    multipleReportJaring: number;
    baketProducingJaring: number;
  };
  frequencyDistribution: KpiFrequencyBucket[];
  ranking: { items: KpiRankingRow[]; pagination: KpiPagination };
};

export type KpiPagination = { page: number; limit: number; total: number; totalPages: number };

export type KpiRegionRow = {
  rank: number;
  id: string;
  name: string;
  level: string;
  productivity: number;
  activeVerified: number;
  productive: number;
  notReporting: number;
  totalReports: number;
  toBaket: number;
  kendala: number;
  anomalies: number;
  change: number | null;
};

export type KpiRegionComparison = {
  level: string;
  breadcrumb: { root: string; level: string; label: string };
  rows: { items: KpiRegionRow[]; pagination: KpiPagination };
};

export type KpiReportsBaket = {
  pipeline: {
    total: number;
    valid: number;
    byStage: Array<{ key: string; label: string; value: number }>;
    toBaket: number;
    conversionPercent: number;
    avgProcessingHours: number | null;
    pending: number;
    failed: number;
  };
  baket: { total: number; fromReport: number; manual: number; withoutSource: number };
  trend: { granularity: string; points: Array<{ bucket: string; total: number; toBaket: number }> };
  highestConversionRegions: Array<{ name: string; conversion: number; totalReports: number }>;
  lowestConversionRegions: Array<{ name: string; conversion: number; totalReports: number }>;
};

export type KpiWhatsappCenter = {
  channelStatus: Array<{ id: string; code: string; name: string; number: string; status: string }>;
  summary: { total: number; active: number; inactive: number; disconnected: number; suspend: number; unknown: number };
  incidents: Array<{
    id: string;
    channelId: string;
    type: string;
    startedAt: string;
    recoveredAt: string | null;
    durationMinutes: number;
  }>;
  failedAttempts: {
    total: number;
    proven: number;
    possible: number;
    unrelated: number;
    unverifiable: number;
  };
};

export type KpiAnomalyRow = {
  no?: number;
  type: string;
  typeKey: string;
  wilayah: string;
  kecamatan: string;
  jaringCount: number;
  eventCount: number;
  status: string;
  description: string;
};

export type KpiAnomalies = { total: number; rows: KpiAnomalyRow[] };

export type KpiTrendMetric = {
  key: string;
  label: string;
  current: number;
  previous: number;
  comparison: KpiComparison;
};

export type KpiTrends = {
  series: { granularity: string; points: Array<{ bucket: string; total: number; toBaket: number }> };
  metricsTrend: KpiTrendMetric[];
};

export type KpiDetail = {
  metric: string;
  dimension: string;
  rows: Array<{ dimension: string; value: number }>;
};

export type KpiAreaTreeNode = {
  id: string;
  name: string;
  level: string;
  children?: KpiAreaTreeNode[];
};

export type KpiFilterOption = { value: string; label: string };

export type KpiFilterOptions = {
  scope: KpiScope;
  areaTree: KpiAreaTreeNode;
  periods: KpiFilterOption[];
  jaringStatuses: KpiFilterOption[];
  reportStatuses: KpiFilterOption[];
  baketSources: KpiFilterOption[];
  anomalyTypes: KpiFilterOption[];
  sortBy: KpiFilterOption[];
};

export type KpiFilters = {
  period: string;
  from: string;
  to: string;
  timezone: string;
  areaId: string;
  childLevel: string;
  jaringStatus: string;
  reportStatus: string;
  baketSource: string;
  kendalaType: string;
  anomalyType: string;
  search: string;
  sortBy: string;
  sortOrder: string;
  page: number;
};
