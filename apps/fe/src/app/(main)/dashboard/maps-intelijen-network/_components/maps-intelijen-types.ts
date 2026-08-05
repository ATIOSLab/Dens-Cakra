import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type ReportCategoryOption,
  type VerificationStatus,
} from "@/app/(main)/dashboard/laporan-jaring/_components/laporan-jaring-types";

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
  switch (status) {
    case "IN_PROGRESS_BY_JARING":
    case "NOT_SUBMITTED":
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Belum Diverifikasi";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "Perlu Review";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "Terverifikasi";
    case "METADATA_RECORDED":
      return "Baket Dibuat";
    default:
      return status;
  }
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
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-[#38BDF8]";
    case "METADATA_RECORDED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400";
  }
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

export function hashInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function resolveCoordinates(report: JaringReportSessionDetail): [number, number] {
  if (
    report.location &&
    typeof report.location.latitude === "number" &&
    typeof report.location.longitude === "number" &&
    report.location.latitude !== 0 &&
    report.location.longitude !== 0
  ) {
    return [report.location.longitude, report.location.latitude];
  }

  const hash = hashInt(report.id);
  const latOffset = ((hash % 140) - 70) * 0.007;
  const lngOffset = (((hash >> 3) % 180) - 90) * 0.008;

  const baseLat = -6.2088;
  const baseLng = 106.8456;

  return [baseLng + lngOffset, baseLat + latOffset];
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
  locationName: string;
  submittedAt: string;
  regencyId?: string | null;
  districtId?: string | null;
  villageId?: string | null;
  categoryId?: string | null;
  hasBeenRead: boolean;
};

export const SAMPLE_MOCK_REPORTS: JaringReportSessionDetail[] = [];
