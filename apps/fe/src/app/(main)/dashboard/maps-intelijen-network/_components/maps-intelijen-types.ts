import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type ReportCategoryOption,
  type VerificationStatus,
} from "@/app/(main)/dashboard/laporan-jaring/_components/laporan-jaring-types";
import {
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
} from "@/lib/domain/operational-presentation";
import type { LocationMatchStatus } from "@/lib/domain/spatial-location-matcher";

export type { LocationMatchStatus };
export { formatFullAreaName };

// ==========================================
// HELPERS & TYPES
// ==========================================

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export function verificationStatusLabel(status: VerificationStatus) {
  return getVerificationStatusLabel(status);
}

export function getMediaUrl(m: any) {
  if (!m) return "";
  if (m.url && typeof m.url === "string" && m.url.startsWith("http")) return m.url;
  if (m.fileUrl && typeof m.fileUrl === "string" && m.fileUrl.startsWith("http")) return m.fileUrl;
  const fileId = m.fileId || m.id;
  return fileId ? `/api/files/${fileId}` : "";
}

export function getInitials(name?: string | null) {
  if (!name) return "JAR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function verificationStatusBadgeVariant(status: VerificationStatus) {
  return getVerificationStatusBadgeClass(status);
}

export function getUrgencyCardStyle(urgency?: PriorityLevel | string | null) {
  switch (urgency) {
    case "URGENT":
      return {
        border: "border-rose-500/70 dark:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50",
        markerBg: "bg-rose-600 text-white border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse",
        pulse: "urgent" as const,
        label: "URGENT",
      };
    case "HIGH":
      return {
        border: "border-amber-500/70 dark:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50",
        markerBg: "bg-amber-500 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.6)]",
        pulse: "high" as const,
        label: "HIGH",
      };
    case "NORMAL":
      return {
        border: "border-emerald-500/50 dark:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        markerBg: "bg-emerald-600 text-white border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        pulse: "normal" as const,
        label: "NORMAL",
      };
    case "LOW":
      return {
        border: "border-sky-500/50 dark:border-sky-500/60 shadow-[0_0_10px_rgba(14,165,233,0.1)]",
        badge: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
        markerBg: "bg-sky-500 text-white border-sky-200 shadow-[0_0_10px_rgba(14,165,233,0.4)]",
        pulse: "slow" as const,
        label: "LOW",
      };
    default:
      return {
        border: "border-slate-300 dark:border-slate-800",
        badge: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40",
        markerBg: "bg-slate-600 text-slate-100 border-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.4)]",
        pulse: "normal" as const,
        label: "NORMAL",
      };
  }
}

export function getTickerBadgeClass(urgency: string) {
  if (urgency === "URGENT") {
    return "border border-rose-500/40 bg-rose-500/20 text-rose-600 dark:text-rose-400";
  }
  if (urgency === "HIGH") {
    return "border border-amber-500/40 bg-amber-500/20 text-amber-600 dark:text-amber-400";
  }
  return "border border-sky-500/40 bg-sky-500/20 text-sky-600 dark:text-sky-400";
}

export function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hr lalu`;
  } catch {
    return "";
  }
}

export interface RawJaringItem {
  id: string;
  aliasName?: string | null;
  fullName?: string | null;
  profilePhotoFileId?: string | null;
  profilePhotoFile?: {
    id: string;
  } | null;
  profilePhotoUrl?: string | null;
  registrationStatus?: string | null;
  areaCoverages?: Array<{
    isPrimary?: boolean;
    validUntil?: string | null;
    area: JaringAdministrativeArea;
  }>;
}

export interface JaringAdministrativeArea {
  id: string;
  name: string;
  level: string;
  parent?: JaringAdministrativeArea | null;
}

export type PaginatedReportResponse = {
  items?: JaringReportSessionDetail[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
  summary?: JaringReportSummary;
};

export type JaringReportSummary = {
  totalJaringReports: number;
  baketReports: number;
};

export type PaginatedJaringResponse = {
  items?: RawJaringItem[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
};

export type ReportCategoryResponse = ReportCategoryOption[] | { items?: ReportCategoryOption[] };

export type AdministrativeAreaScope = {
  areaId: string;
  code: string;
  officialCode?: string | null;
  name: string;
  level: string;
  parentAreaId?: string | null;
  parentOfficialCode?: string | null;
};

export type PeriodPreset = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";

export function resolveCoordinates(report: JaringReportSessionDetail): [number, number] | null {
  if (
    report.location &&
    typeof report.location.latitude === "number" &&
    typeof report.location.longitude === "number" &&
    report.location.latitude !== 0 &&
    report.location.longitude !== 0
  ) {
    return [report.location.longitude, report.location.latitude];
  }

  return null;
}

export function isRegencyLevel(level: string) {
  return level === "CITY" || level === "REGENCY" || level === "KOTA" || level === "KABUPATEN";
}

export function isReadByFieldOfficer(report: JaringReportSessionDetail) {
  return report.isReadByFieldOfficer ?? report.isRead ?? Boolean(report.fieldOfficerReadAt ?? report.readAt);
}

export type MapIntelItem = {
  id: string;
  report: JaringReportSessionDetail;
  isBaket: boolean;
  coordinates: [number, number]; // [lng, lat]
  displayTitle: string;
  content: string;
  urgency: PriorityLevel | "NORMAL";
  verificationStatus: VerificationStatus;
  jaringName: string;
  jaringCode: string;
  jaringPhotoUrl: string | null;
  gaswilName: string;
  locationName: string;
  submittedAt: string;
  regencyId?: string | null;
  districtId?: string | null;
  villageId?: string | null;
  categoryId?: string | null;
  hasBeenRead: boolean;
  locationMatchStatus: LocationMatchStatus;
};

export const SAMPLE_MOCK_REPORTS: JaringReportSessionDetail[] = [];

export type MapMarkerType = "report" | "baket" | "agent";
export type VisualizationMode = "marker" | "cluster" | "heatmap";
export type BaseMapLayer = "dark" | "satellite" | "terrain" | "light" | "osm";
export type CommandLayerKey = "report" | "baket" | "agent_active" | "agent_last_known";
export type MarkerColorMode = "validity" | "urgency" | "category";
export type HeatmapWeight = "count" | "urgency" | "valid" | "baket";
export type SummaryCardFilter = "ALL" | "REPORT" | "BAKET";
export type DataTypeFilter = "ALL" | "REPORT" | "BAKET" | "AGENT";
export type AgentStateFilter = "ALL" | "active" | "last_known";

export type MapNetworkFilters = {
  search: string;
  period: PeriodPreset;
  startDate: string;
  endDate: string;
  dataType: DataTypeFilter;
  urgency: "ALL" | PriorityLevel;
  categoryId: string;
  fieldOfficerAssignmentId: string;
  jaringId: string;
  provinceId: string;
  regencyId: string;
  districtId: string;
  villageId: string;
  suitability: string;
  agentState: AgentStateFilter;
  activeWithinMinutes: number;
  lastKnownWithinHours: number;
};

export type MapEntityFilterOption = {
  id: string;
  label: string;
  fieldOfficerAssignmentId?: string | null;
};

export type MapArea = {
  id: string;
  code: string;
  name: string;
  level: string;
  parentId?: string | null;
  boundaryQualityStatus?: string | null;
  parent?: MapArea | null;
};

export type MapAreaLoadingLevel = "province" | "regency" | "district" | "village";

export type MapAreaFilterOptions = {
  provinces: MapArea[];
  regencies: MapArea[];
  districts: MapArea[];
  villages: MapArea[];
  loading: boolean;
  loadingLevel: MapAreaLoadingLevel | null;
};

export type MapJaringIdentity = {
  id: string;
  name: string;
  code?: string | null;
  whatsappNumber?: string | null;
  profilePhotoFileId?: string | null;
  placementArea?: MapArea | null;
  gaswilName?: string | null;
  gaswilAssignmentId?: string | null;
  gaswilUserProfileId?: string | null;
};

export type MapReportAttachment = {
  id: string;
  fileId: string;
  mediaType?: string | null;
  caption?: string | null;
  orderNo?: number;
  createdAt?: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export type MapNetworkProperties = {
  markerType: MapMarkerType;
  markerKey: string;
  suggestedColor: string;
  reportId?: string;
  baketId?: string;
  versionId?: string;
  referenceNumber?: string | null;
  displayTitle?: string;
  excerpt?: string;
  reportStatus?: string;
  verificationStatus?: VerificationStatus;
  status?: string;
  validity?: "VALID" | "NEEDS_REVIEW" | "WAITING";
  urgency?: PriorityLevel | null;
  category?: ReportCategoryOption | null;
  reportedAt?: string;
  receivedAt?: string | null;
  locationCapturedAt?: string | null;
  coordinateSource?: string | null;
  gpsAccuracyMeters?: number | null;
  locationSuitability?: string;
  primaryArea?: MapArea | null;
  matchedAreas?: MapArea[];
  jaring?: MapJaringIdentity | null;
  jarings?: MapJaringIdentity[];
  jaringCount?: number;
  fieldOfficer?: {
    assignmentId: string;
    userProfileId?: string;
    name: string;
    positionTitle?: string;
    unitId?: string;
    unitName?: string;
  } | null;
  attachments?: {
    total: number;
    images: number;
    videos: number;
    items?: MapReportAttachment[];
  };
  baket?: { id: string; status: string; currentVersionNumber: number } | null;
  sourceReports?: {
    total: number;
    preview: Array<{ messageId: string; reportId?: string | null; referenceNumber?: string | null }>;
  };
  assignmentId?: string;
  userProfileId?: string;
  userName?: string;
  positionTitle?: string;
  positionCode?: string;
  unitId?: string;
  unitName?: string;
  capturedAt?: string;
  ageMinutes?: number;
  agentState?: "active" | "last_known";
  areaResolutionMethod?: string | null;
};

export type MapNetworkFeature = {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: MapNetworkProperties;
};

export function getMapFeatureTitle(feature: MapNetworkFeature) {
  return feature.properties.displayTitle ?? feature.properties.userName ?? "Entitas tanpa nama";
}

export function getMapFeatureReference(feature: MapNetworkFeature) {
  const properties = feature.properties;
  return (
    properties.referenceNumber ??
    properties.baketId ??
    properties.assignmentId ??
    properties.reportId ??
    "Tanpa referensi"
  );
}

export function getMapFeatureTimestamp(feature: MapNetworkFeature) {
  const properties = feature.properties;
  return properties.capturedAt ?? properties.receivedAt ?? properties.reportedAt ?? properties.locationCapturedAt ?? null;
}

export function getMapFeatureDetailHref(feature: MapNetworkFeature) {
  const properties = feature.properties;
  if (properties.markerType === "agent") return null;
  const reportId =
    properties.reportId ?? properties.sourceReports?.preview.find((source) => source.reportId)?.reportId ?? null;

  if (reportId) {
    return `/dashboard/laporan-jaring/${reportId}${properties.markerType === "baket" ? "?from=baket" : ""}`;
  }

  return "/dashboard/baket";
}

export type MapNetworkResponse = {
  type: "FeatureCollection";
  features: MapNetworkFeature[];
  meta: {
    counts: {
      total: number;
      report: number;
      baket: number;
      agent: number;
      totalReports: number;
      totalBakets: number;
      mappableReports: number;
      mappableBakets: number;
      unlocatedReport: number;
      unlocatedBaket: number;
      unlocatedAgent: number;
      activeAgents: number;
      lastKnownAgents: number;
      byBaketCategory: Record<string, number>;
      byBaketStatus: Record<string, number>;
    };
    summary: {
      reports: {
        total?: number;
        valid?: number;
        mappable?: number;
        unlocated?: number;
      };
      bakets: { total: number; mappable: number; unlocated: number };
      visible: { total: number; reports: number; bakets: number; agents: number };
    };
    facets: {
      categories: ReportCategoryOption[];
      areas: MapArea[];
      urgencies: PriorityLevel[];
      markerTypes: MapMarkerType[];
      baketStatuses: string[];
      agentStates: Array<"active" | "last_known">;
      administrativeLevels: string[];
    };
    freshness: { generatedAt: string; activeWithinMinutes: number; lastKnownWithinHours: number };
    unlocatedItems: Array<{
      id: string;
      referenceNumber: string;
      title: string;
      reportedAt: string;
      jaring: {
        id: string;
        name: string;
        code?: string | null;
        whatsappNumber?: string | null;
        profilePhotoFileId?: string | null;
        placementArea?: MapArea | null;
        gaswilName?: string | null;
        gaswilAssignmentId?: string | null;
        gaswilUserProfileId?: string | null;
      };
    }>;
    security: { stealthLocationsExcluded: boolean };
  };
};

export const EMPTY_MAP_RESPONSE: MapNetworkResponse = {
  type: "FeatureCollection",
  features: [],
  meta: {
    counts: {
      total: 0,
      report: 0,
      baket: 0,
      agent: 0,
      totalReports: 0,
      totalBakets: 0,
      mappableReports: 0,
      mappableBakets: 0,
      unlocatedReport: 0,
      unlocatedBaket: 0,
      unlocatedAgent: 0,
      activeAgents: 0,
      lastKnownAgents: 0,
      byBaketCategory: {},
      byBaketStatus: {},
    },
    summary: {
      reports: {},
      bakets: { total: 0, mappable: 0, unlocated: 0 },
      visible: { total: 0, reports: 0, bakets: 0, agents: 0 },
    },
    facets: {
      markerTypes: ["report", "baket", "agent"],
      categories: [],
      areas: [],
      baketStatuses: [],
      urgencies: ["LOW", "NORMAL", "HIGH", "URGENT"],
      agentStates: ["active", "last_known"],
      administrativeLevels: [],
    },
    freshness: { generatedAt: "", activeWithinMinutes: 15, lastKnownWithinHours: 168 },
    unlocatedItems: [],
    security: { stealthLocationsExcluded: true },
  },
};
