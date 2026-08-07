import {
  getUrgencyBadgeClass,
  getUrgencyLabel,
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
} from "@/lib/domain/operational-presentation";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";

import type { PriorityLevel, VerificationStatus } from "./laporan-jaring-types";

export type JaringReportCategorySummary = {
  completeJaringReports?: number;
  incompleteJaringReports?: number;
  baketReports?: number;
};

export type JaringReportCategoryKey = "TOTAL" | "COMPLETE" | "INCOMPLETE" | "BAKET";

export const JARING_REPORT_CATEGORY_FILTERS = {
  TOTAL: {
    label: "Total Laporan Jaring",
    verificationStatus: "ALL",
    completeness: "ALL",
    stage: "JARING_REPORT",
  },
  COMPLETE: {
    label: DOMAIN_TERMS.completeJaringReport,
    verificationStatus: "ALL",
    completeness: "COMPLETE",
    stage: "JARING_REPORT",
  },
  INCOMPLETE: {
    label: DOMAIN_TERMS.incompleteJaringReport,
    verificationStatus: "ALL",
    completeness: "INCOMPLETE",
    stage: "JARING_REPORT",
  },
  BAKET: {
    label: DOMAIN_TERMS.baket,
    verificationStatus: "METADATA_RECORDED",
    completeness: "ALL",
    stage: "ALL",
  },
} as const satisfies Record<
  JaringReportCategoryKey,
  {
    label: string;
    verificationStatus: string;
    completeness: "ALL" | "COMPLETE" | "INCOMPLETE";
    stage: "ALL" | "JARING_REPORT";
  }
>;

export function isJaringReportCategoryFilterActive(
  category: JaringReportCategoryKey,
  filters: { verificationStatus: string; completeness: string; stage: string },
) {
  const expected = JARING_REPORT_CATEGORY_FILTERS[category];
  return (
    filters.verificationStatus === expected.verificationStatus &&
    filters.completeness === expected.completeness &&
    filters.stage === expected.stage
  );
}

export function jaringReportCategoryFromCompleteness(value: string): JaringReportCategoryKey {
  if (value === "COMPLETE") return "COMPLETE";
  if (value === "INCOMPLETE") return "INCOMPLETE";
  return "TOTAL";
}

export function resolveJaringReportCategorySelectValue(filters: {
  verificationStatus: string;
  completeness: string;
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
  return jaringReportCategoryFromCompleteness(filters.completeness);
}

export function alignJaringReportCategorySummary(summary?: JaringReportCategorySummary) {
  const complete = summary?.completeJaringReports ?? 0;
  const incomplete = summary?.incompleteJaringReports ?? 0;

  return {
    totalJaringReports: complete + incomplete,
    completeJaringReports: complete,
    incompleteJaringReports: incomplete,
    baketReports: summary?.baketReports ?? 0,
  };
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
