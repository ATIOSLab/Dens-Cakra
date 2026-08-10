"use client";

import type { ComponentType } from "react";

import {
  BadgeCheck,
  CircleArrowDown,
  CircleHelp,
  Clock3,
  Crosshair,
  MapPinned,
  MapPinOff,
  Radio,
  RadioTower,
  ShieldCheck,
  Siren,
  Smartphone,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  OPERATIONAL_TONES,
  type OperationalTone,
  URGENCY_PRESENTATION as SHARED_URGENCY_PRESENTATION,
} from "@/lib/domain/operational-presentation";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS, PERSONNEL_LOCATION_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { HeatmapWeight, MapMarkerType, MapNetworkProperties, SummaryCardFilter } from "./maps-intelijen-types";

export type MapSemanticPresentation = {
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  mapColor: string;
  iconClass: string;
  badgeClass: string;
  surfaceClass: string;
  markerClass?: string;
};

function toneFields(
  tone: OperationalTone,
): Pick<MapSemanticPresentation, "mapColor" | "iconClass" | "badgeClass" | "surfaceClass" | "markerClass"> {
  const presentation = OPERATIONAL_TONES[tone];
  return {
    mapColor: presentation.mapColor,
    iconClass: presentation.iconClass,
    badgeClass: presentation.badgeClass,
    surfaceClass: presentation.surfaceClass,
    markerClass: presentation.markerClass,
  };
}

export const DATA_TYPE_PRESENTATION: Record<MapMarkerType, MapSemanticPresentation> = {
  report: {
    label: DOMAIN_VISUALS.jaringReport.label,
    icon: DOMAIN_VISUALS.jaringReport.Icon,
    mapColor: DOMAIN_VISUALS.jaringReport.markerColor,
    iconClass: DOMAIN_VISUALS.jaringReport.iconClass,
    badgeClass: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    surfaceClass: "border-cyan-500/30 bg-cyan-500/5",
    markerClass: "bg-cyan-600 text-white",
  },
  baket: {
    label: DOMAIN_VISUALS.baket.label,
    icon: DOMAIN_VISUALS.baket.Icon,
    mapColor: DOMAIN_VISUALS.baket.markerColor,
    iconClass: DOMAIN_VISUALS.baket.iconClass,
    badgeClass: "border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    surfaceClass: "border-violet-500/30 bg-violet-500/5",
    markerClass: "bg-violet-600 text-white",
  },
  agent: {
    label: DOMAIN_VISUALS.gaswil.label,
    icon: DOMAIN_VISUALS.gaswil.Icon,
    mapColor: PERSONNEL_LOCATION_VISUALS.ONLINE.markerColor,
    iconClass: DOMAIN_VISUALS.gaswil.iconClass,
    badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    surfaceClass: "border-emerald-500/30 bg-emerald-500/5",
    markerClass: "bg-emerald-600 text-white",
  },
};

export const URGENCY_PRESENTATION: Record<string, MapSemanticPresentation> = {
  URGENT: {
    label: SHARED_URGENCY_PRESENTATION.URGENT.label,
    icon: Siren,
    ...toneFields(SHARED_URGENCY_PRESENTATION.URGENT.tone),
  },
  HIGH: {
    label: SHARED_URGENCY_PRESENTATION.HIGH.label,
    icon: TriangleAlert,
    ...toneFields(SHARED_URGENCY_PRESENTATION.HIGH.tone),
  },
  NORMAL: {
    label: SHARED_URGENCY_PRESENTATION.NORMAL.label,
    icon: ShieldCheck,
    ...toneFields(SHARED_URGENCY_PRESENTATION.NORMAL.tone),
  },
  LOW: {
    label: SHARED_URGENCY_PRESENTATION.LOW.label,
    icon: CircleArrowDown,
    ...toneFields(SHARED_URGENCY_PRESENTATION.LOW.tone),
  },
};

export const VALIDITY_PRESENTATION: Record<string, MapSemanticPresentation> = {
  VALID: {
    label: "Titik Berkoordinat",
    icon: BadgeCheck,
    mapColor: "#2563eb",
    iconClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    surfaceClass: "border-blue-500/30 bg-blue-500/5",
  },
  NEEDS_REVIEW: {
    label: "Perlu Atensi Koordinat",
    icon: TriangleAlert,
    mapColor: "#e11d48",
    iconClass: "text-rose-600 dark:text-rose-400",
    badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    surfaceClass: "border-rose-500/30 bg-rose-500/5",
  },
  WAITING: {
    label: "Tanpa Koordinat",
    icon: Clock3,
    mapColor: "#64748b",
    iconClass: "text-slate-600 dark:text-slate-400",
    badgeClass: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    surfaceClass: "border-slate-500/30 bg-slate-500/5",
  },
};

export const LOCATION_SUITABILITY_PRESENTATION: Record<string, MapSemanticPresentation> = {
  WITHIN_SCOPE: {
    label: "Dalam Penugasan",
    icon: MapPinned,
    ...toneFields("success"),
  },
  OUTSIDE_SCOPE: {
    label: "Di Luar Penugasan",
    icon: MapPinOff,
    ...toneFields("critical"),
  },
  BORDER_AMBIGUOUS: {
    label: "Area Perbatasan",
    icon: TriangleAlert,
    ...toneFields("warning"),
  },
  NOT_DETERMINED: {
    label: "Belum Ditentukan",
    icon: CircleHelp,
    ...toneFields("neutral"),
  },
};

export const COORDINATE_SOURCE_PRESENTATION: Record<string, MapSemanticPresentation> = {
  WHATSAPP_LOCATION: {
    label: "Lokasi WhatsApp",
    icon: RadioTower,
    mapColor: "#2563eb",
    iconClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    surfaceClass: "border-blue-500/30 bg-blue-500/5",
  },
  DEVICE_GPS: {
    label: "GPS Perangkat",
    icon: Smartphone,
    mapColor: "#0d9488",
    iconClass: "text-teal-600 dark:text-teal-400",
    badgeClass: "border-teal-500/40 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    surfaceClass: "border-teal-500/30 bg-teal-500/5",
  },
  MANUAL_PIN: {
    label: "Pin Manual",
    icon: Crosshair,
    mapColor: "#64748b",
    iconClass: "text-slate-600 dark:text-slate-400",
    badgeClass: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    surfaceClass: "border-slate-500/30 bg-slate-500/5",
  },
  MANUAL_COORDINATE: {
    label: "Koordinat Manual",
    icon: Crosshair,
    ...toneFields("neutral"),
  },
  CORRECTED_BY_FIELD_OFFICER: {
    label: `Koreksi ${DOMAIN_TERMS.fieldOfficer}`,
    icon: MapPinned,
    ...toneFields("warning"),
  },
  SYSTEM_DERIVED: {
    label: "Hasil Sistem",
    icon: Radio,
    ...toneFields("info"),
  },
};

export const COORDINATE_AVAILABILITY_PRESENTATION: Record<"WITH" | "WITHOUT", MapSemanticPresentation> = {
  WITH: {
    label: "Titik Berkoordinat",
    icon: Crosshair,
    mapColor: "#2563eb",
    iconClass: "text-blue-600 dark:text-blue-400",
    badgeClass: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    surfaceClass: "border-blue-500/30 bg-blue-500/5",
  },
  WITHOUT: {
    label: "Tanpa Koordinat",
    icon: MapPinOff,
    mapColor: "#f59e0b",
    iconClass: "text-amber-600 dark:text-amber-400",
    badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    surfaceClass: "border-amber-500/30 bg-amber-500/5",
  },
};

export const SUMMARY_CARD_PRESENTATION: Record<SummaryCardFilter, MapSemanticPresentation> = {
  ALL: DATA_TYPE_PRESENTATION.report,
  REPORT: DATA_TYPE_PRESENTATION.report,
  BAKET: DATA_TYPE_PRESENTATION.baket,
};

export const HEATMAP_WEIGHT_PRESENTATION: Record<HeatmapWeight, MapSemanticPresentation> = {
  count: { ...DATA_TYPE_PRESENTATION.report, label: "Kepadatan jumlah data" },
  urgency: { ...URGENCY_PRESENTATION.URGENT, label: "Bobot urgensi" },
  valid: { ...VALIDITY_PRESENTATION.VALID, label: "Bobot titik berkoordinat" },
  baket: { ...DATA_TYPE_PRESENTATION.baket, label: "Kepadatan Baket" },
};

const FALLBACK_PRESENTATION: MapSemanticPresentation = {
  label: "Belum Ditentukan",
  icon: CircleHelp,
  mapColor: "#64748b",
  iconClass: "text-slate-600 dark:text-slate-400",
  badgeClass: "border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  surfaceClass: "border-slate-500/30 bg-slate-500/5",
};

function resolvePresentation(
  dictionary: Record<string, MapSemanticPresentation>,
  value: string | null | undefined,
  fallbackKey?: string,
) {
  return dictionary[value ?? fallbackKey ?? ""] ?? dictionary[fallbackKey ?? ""] ?? FALLBACK_PRESENTATION;
}

export const getUrgencyPresentation = (value?: string | null) =>
  resolvePresentation(URGENCY_PRESENTATION, value, "NORMAL");
export const getValidityPresentation = (value?: string | null) =>
  resolvePresentation(VALIDITY_PRESENTATION, value, "WAITING");
export const getLocationSuitabilityPresentation = (value?: string | null) =>
  resolvePresentation(LOCATION_SUITABILITY_PRESENTATION, value, "NOT_DETERMINED");
export const getCoordinateSourcePresentation = (value?: string | null) =>
  resolvePresentation(COORDINATE_SOURCE_PRESENTATION, value);
export const getDataTypePresentation = (value: MapMarkerType) => DATA_TYPE_PRESENTATION[value];

export function getFeatureTypePresentation(
  properties: Pick<MapNetworkProperties, "markerType" | "urgency">,
): MapSemanticPresentation {
  if (properties.markerType !== "baket") {
    return DATA_TYPE_PRESENTATION[properties.markerType];
  }

  const urgency = getUrgencyPresentation(properties.urgency);
  return {
    ...DATA_TYPE_PRESENTATION.baket,
    mapColor: urgency.mapColor,
    iconClass: urgency.iconClass,
    badgeClass: urgency.badgeClass,
    surfaceClass: urgency.surfaceClass,
    markerClass: urgency.markerClass,
  };
}

export function getMarkerPresentation(properties: MapNetworkProperties, mode: "validity" | "urgency") {
  if (properties.markerType === "baket") return getUrgencyPresentation(properties.urgency);
  if (properties.markerType === "agent") return DATA_TYPE_PRESENTATION.agent;
  if (mode === "validity") return getValidityPresentation(properties.validity);
  return getUrgencyPresentation(properties.urgency);
}

export function MapSemanticBadge({
  presentation,
  className,
  label,
}: {
  presentation: MapSemanticPresentation;
  className?: string;
  label?: string;
}) {
  const Icon = presentation.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap", presentation.badgeClass, className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label ?? presentation.label}
    </Badge>
  );
}
