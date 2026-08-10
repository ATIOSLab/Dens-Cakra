import {
  getUrgencyBadgeClass,
  getUrgencyLabel,
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
} from "@/lib/domain/operational-presentation";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";

import type { PriorityLevel, VerificationStatus } from "./laporan-jaring-types";

export type JaringReportCategorySummary = {
  totalJaringReports?: number;
  baketReports?: number;
};

export type JaringReportCategoryKey = "TOTAL" | "BAKET";

export const JARING_REPORT_CATEGORY_FILTERS = {
  TOTAL: {
    label: "Total Laporan Jaring",
    verificationStatus: "ALL",
    stage: "JARING_REPORT",
  },
  BAKET: {
    label: DOMAIN_TERMS.baket,
    verificationStatus: "ALL",
    stage: "ALL",
  },
} as const satisfies Record<
  JaringReportCategoryKey,
  {
    label: string;
    verificationStatus: string;
    stage: "ALL" | "JARING_REPORT";
  }
>;

export function isJaringReportCategoryFilterActive(
  category: JaringReportCategoryKey,
  filters: { verificationStatus: string; stage: string },
) {
  const expected = JARING_REPORT_CATEGORY_FILTERS[category];
  return (
    filters.verificationStatus === expected.verificationStatus &&
    filters.stage === expected.stage
  );
}

export function jaringReportCategoryFromStage(value: string): JaringReportCategoryKey {
  if (value === "BAKET" || value === "DRAFT_BAKET" || value === "VALIDATED_BAKET") return "BAKET";
  return "TOTAL";
}

export function resolveJaringReportCategorySelectValue(filters: {
  verificationStatus: string;
  stage: string;
}): JaringReportCategoryKey | "ALL_DATA" {
  if (
    filters.verificationStatus === JARING_REPORT_CATEGORY_FILTERS.BAKET.verificationStatus ||
    filters.stage === "DRAFT_BAKET" ||
    filters.stage === "VALIDATED_BAKET"
  ) {
    return "BAKET";
  }
  if (filters.stage !== "JARING_REPORT") return "ALL_DATA";
  return "TOTAL";
}

export function alignJaringReportCategorySummary(summary?: JaringReportCategorySummary) {
  return {
    totalJaringReports: summary?.totalJaringReports ?? 0,
    baketReports: summary?.baketReports ?? 0,
  };
}

export function formatReportPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

export function reportPercentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function urgencyLabel(urgency?: PriorityLevel | null) {
  return getUrgencyLabel(urgency);
}

export function urgencyBadgeClass(urgency?: PriorityLevel | null) {
  return getUrgencyBadgeClass(urgency);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Belum tercatat";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Belum tercatat";
  return `${new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date)} WIB`;
}

export function verificationStatusLabel(status: VerificationStatus) {
  return getVerificationStatusLabel(status);
}

export function verificationStatusBadgeVariant(status: VerificationStatus) {
  return getVerificationStatusBadgeClass(status);
}
