import { URGENCY_VISUALS } from "./visual-system";

export type OperationalTone = "critical" | "warning" | "success" | "info" | "neutral" | "baket";

export type OperationalTonePresentation = {
  badgeClass: string;
  iconClass: string;
  surfaceClass: string;
  markerClass: string;
  mapColor: string;
};

/**
 * One semantic color contract for operational data across cards, tables, maps,
 * filters, and detail views. Feature components may add layout classes, but
 * should not redefine the meaning of these colors.
 */
export const OPERATIONAL_TONES: Record<OperationalTone, OperationalTonePresentation> = {
  critical: {
    badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    iconClass: "text-rose-600 dark:text-rose-400",
    surfaceClass: "border-rose-500/30 bg-rose-500/5",
    markerClass: "bg-rose-600 text-white",
    mapColor: URGENCY_VISUALS.URGENT.markerColor,
  },
  warning: {
    badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    iconClass: "text-amber-600 dark:text-amber-400",
    surfaceClass: "border-amber-500/30 bg-amber-500/5",
    markerClass: "bg-amber-500 text-slate-950",
    mapColor: URGENCY_VISUALS.HIGH.markerColor,
  },
  success: {
    badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    surfaceClass: "border-emerald-500/30 bg-emerald-500/5",
    markerClass: "bg-emerald-600 text-white",
    mapColor: URGENCY_VISUALS.NORMAL.markerColor,
  },
  info: {
    badgeClass: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    iconClass: "text-sky-600 dark:text-sky-400",
    surfaceClass: "border-sky-500/30 bg-sky-500/5",
    markerClass: "bg-sky-600 text-white",
    mapColor: URGENCY_VISUALS.LOW.markerColor,
  },
  neutral: {
    badgeClass: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    iconClass: "text-slate-600 dark:text-slate-400",
    surfaceClass: "border-slate-500/30 bg-slate-500/5",
    markerClass: "bg-slate-600 text-white",
    mapColor: "#64748b",
  },
  baket: {
    badgeClass: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    iconClass: "text-violet-600 dark:text-violet-400",
    surfaceClass: "border-violet-500/30 bg-violet-500/5",
    markerClass: "bg-violet-600 text-white",
    mapColor: "#7c3aed",
  },
};

export const URGENCY_PRESENTATION = {
  URGENT: { label: "Mendesak", tone: "critical" },
  HIGH: { label: "Tinggi", tone: "warning" },
  NORMAL: { label: "Normal", tone: "success" },
  LOW: { label: "Rendah", tone: "info" },
} as const satisfies Record<string, { label: string; tone: OperationalTone }>;

export const VERIFICATION_PRESENTATION = {
  IN_PROGRESS_BY_JARING: { label: "Sedang disusun Jaring", tone: "neutral" },
  NOT_SUBMITTED: { label: "Sedang disusun Jaring", tone: "neutral" },
  WAITING_FIELD_OFFICER_VERIFICATION: { label: "Siap Dibuat Baket", tone: "info" },
  NEEDS_FIELD_OFFICER_REVIEW: {
    label: "Perlu Perbaikan",
    tone: "critical",
  },
  VERIFIED_BY_FIELD_OFFICER: {
    label: "Siap Dibuat Baket",
    tone: "info",
  },
  READY_FOR_BAKET: { label: "Siap Dibuat Baket", tone: "info" },
  METADATA_RECORDED: { label: "Baket Dibuat", tone: "baket" },
  BAKET_CREATED: { label: "Baket Dibuat", tone: "baket" },
} as const satisfies Record<string, { label: string; tone: OperationalTone }>;

export function getUrgencyPresentation(value?: string | null) {
  return URGENCY_PRESENTATION[value?.toUpperCase() as keyof typeof URGENCY_PRESENTATION] ?? URGENCY_PRESENTATION.NORMAL;
}

export function getVerificationPresentation(value?: string | null) {
  return (
    VERIFICATION_PRESENTATION[value?.toUpperCase() as keyof typeof VERIFICATION_PRESENTATION] ?? {
      label: value ?? "Belum Ditentukan",
      tone: "neutral" as const,
    }
  );
}

export function getUrgencyLabel(value?: string | null) {
  return getUrgencyPresentation(value).label;
}

export function getUrgencyBadgeClass(value?: string | null) {
  return OPERATIONAL_TONES[getUrgencyPresentation(value).tone].badgeClass;
}

export function getVerificationStatusLabel(value?: string | null) {
  return getVerificationPresentation(value).label;
}

export function getVerificationStatusBadgeClass(value?: string | null) {
  return OPERATIONAL_TONES[getVerificationPresentation(value).tone].badgeClass;
}
