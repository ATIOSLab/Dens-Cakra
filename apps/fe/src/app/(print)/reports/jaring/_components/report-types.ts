export interface ReportMetadata {
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  pullAt: string;
  activityWindowStart: string;
  periodDays: number;
}

export interface ReportSummary {
  total: number;
  active: number;
  inactive: number;
  reporters: number;
  reports: number;
}

export interface ReportCoaching {
  activities: number;
  activitiesIncludingPending: number;
  uniqueJaring: number;
  uniqueJaringIncludingPending: number;
  pendingActivities: number;
  pendingJaring: number;
}

export interface RegionReport {
  name: string;
  fullName: string;
  total: number;
  active: number;
  inactive: number;
  reports: number;
  coaching: number;
  activeRate: number;
  inactiveRate: number;
  reportsPerActive: number;
  coachingShare: number;
}

export interface DistrictReport {
  region: string;
  regionFullName: string;
  name: string;
  total: number;
  active: number;
  inactive: number;
  reports: number;
  coaching: number;
  activeRate: number;
  inactiveRate: number;
  reportsPerActive: number;
  reportConcentration: number;
}

export interface TopDistrict {
  rank: number;
  name: string;
  region: string;
  reports: number;
  active: number;
  total: number;
  activeRate: number;
}

export interface ReportHighlights {
  highestActiveRegion: string;
  highestReportRegion: string;
  mostProductiveRegion: string;
  districtsWithoutReports: number;
  topDistricts: TopDistrict[];
}

export interface ReportPayload {
  metadata: ReportMetadata;
  summary: ReportSummary;
  coaching: ReportCoaching;
  regions: RegionReport[];
  districts: DistrictReport[];
  highlights: ReportHighlights;
}

export interface ReportValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateReport(data: ReportPayload | null | undefined): ReportValidationResult {
  const errors: string[] = [];

  if (!data?.summary || !data.regions || !data.districts) {
    return { valid: false, errors: ["Format data laporan tidak lengkap atau rusak."] };
  }

  if (data.summary.active + data.summary.inactive !== data.summary.total) {
    errors.push("summary.active + summary.inactive !== summary.total");
  }

  const regionTotal = data.regions.reduce((sum, item) => sum + item.total, 0);
  if (regionTotal !== data.summary.total) {
    errors.push(`Total Jaring wilayah (${regionTotal}) tidak sesuai summary (${data.summary.total})`);
  }

  const reportsTotal = data.regions.reduce((sum, item) => sum + item.reports, 0);
  if (reportsTotal !== data.summary.reports) {
    errors.push(`Total laporan wilayah (${reportsTotal}) tidak sesuai summary (${data.summary.reports})`);
  }

  const coachingTotal = data.regions.reduce((sum, item) => sum + item.coaching, 0);
  if (coachingTotal !== data.coaching.activities) {
    errors.push(
      `Total pembinaan wilayah (${coachingTotal}) tidak sesuai coaching.activities (${data.coaching.activities})`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export const REGION_PAGE_ORDER = [
  "Jakarta Selatan",
  "Jakarta Timur",
  "Jakarta Pusat",
  "Jakarta Barat",
  "Jakarta Utara",
  "Kepulauan Seribu",
] as const;
