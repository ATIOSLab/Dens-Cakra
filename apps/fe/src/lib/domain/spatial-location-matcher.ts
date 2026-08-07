import type { ComponentType } from "react";

import { AlertTriangle, MapPin, MapPinCheck, MapPinOff } from "lucide-react";

export type LocationMatchStatus =
  | "ALL"
  | "WITHIN_SCOPE"
  | "OUTSIDE_SCOPE"
  | "NOT_DETERMINED"
  | "BORDER_AMBIGUOUS";

export interface SpatialAreaInfo {
  id?: string;
  code?: string;
  officialCode?: string | null;
  name?: string;
  level?: string;
  parent?: SpatialAreaInfo | null;
}

export interface JaringCoverageInfo {
  area?: SpatialAreaInfo | null;
}

export interface LocationMatchResult {
  status: Exclude<LocationMatchStatus, "ALL">;
  label: string;
  description: string;
  tooltipText: string;
  badgeClass: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * Evaluates whether a report's resolved administrative area is inside the
 * Jaring's assigned area. Gaswil is a person/role and is deliberately not used
 * as a geographic comparison target.
 *
 * Rules:
 * Only stable identifiers and official administrative codes are compared.
 * Human-readable names are presentation data and must never decide scope.
 */
export function evaluateLocationMatch(
  resolvedArea?: SpatialAreaInfo | null,
  _locationName?: string | null,
  jaringCoverages?: JaringCoverageInfo[] | null,
  _gaswilName?: string | null,
): Exclude<LocationMatchStatus, "ALL"> {
  const identityKeys = (area?: SpatialAreaInfo | null) =>
    new Set(
      [area?.id, area?.officialCode ?? area?.code]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    );
  const intersects = (left: Set<string>, right: Set<string>) => [...left].some((key) => right.has(key));
  const hierarchy = (area?: SpatialAreaInfo | null) => {
    const result: SpatialAreaInfo[] = [];
    let current = area ?? null;
    while (current) {
      result.push(current);
      current = current.parent ?? null;
    }
    return result;
  };

  const reportHierarchy = hierarchy(resolvedArea);
  const coverageAreas = (jaringCoverages ?? []).flatMap((coverage) =>
    coverage.area ? [coverage.area] : [],
  );
  if (reportHierarchy.length === 0 || identityKeys(resolvedArea).size === 0 || coverageAreas.length === 0) {
    return "NOT_DETERMINED";
  }

  for (const coverageArea of coverageAreas) {
    const coverageKeys = identityKeys(coverageArea);
    if (coverageKeys.size === 0) continue;
    if (reportHierarchy.some((area) => intersects(identityKeys(area), coverageKeys))) {
      return "WITHIN_SCOPE";
    }

    // A report resolved only to an ancestor of a more specific assignment is
    // too coarse to prove either an inside- or outside-scope result.
    if (hierarchy(coverageArea).some((area) => intersects(identityKeys(area), identityKeys(resolvedArea)))) {
      return "NOT_DETERMINED";
    }
  }

  return coverageAreas.some((area) => identityKeys(area).size > 0) ? "OUTSIDE_SCOPE" : "NOT_DETERMINED";
}

/**
 * Returns badge properties, colors, icons, and tooltips for location match status.
 */
export function getLocationMatchBadgeProps(status: LocationMatchStatus): LocationMatchResult {
  switch (status) {
    case "WITHIN_SCOPE":
      return {
        status: "WITHIN_SCOPE",
        label: "Sesuai Wilayah Penugasan",
        description: "Lokasi aktual berada dalam wilayah penugasan",
        tooltipText: "Wilayah administratif lokasi laporan berada di dalam wilayah penugasan Jaring.",
        badgeClass: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        icon: MapPinCheck,
      };
    case "OUTSIDE_SCOPE":
      return {
        status: "OUTSIDE_SCOPE",
        label: "Di Luar Wilayah Penugasan",
        description: "Lokasi aktual berada di luar wilayah penugasan",
        tooltipText: "Wilayah administratif lokasi laporan tidak berada di dalam wilayah penugasan Jaring.",
        badgeClass: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        icon: AlertTriangle,
      };
    case "BORDER_AMBIGUOUS":
      return {
        status: "BORDER_AMBIGUOUS",
        label: "Dekat Batas Wilayah",
        description: "Lokasi dekat dengan batas wilayah",
        tooltipText: "Lokasi laporan berada dekat batas wilayah penugasan dan memerlukan peninjauan.",
        badgeClass: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        icon: MapPin,
      };
    default:
      return {
        status: "NOT_DETERMINED",
        label: "Tidak Dapat Ditentukan",
        description: "Data lokasi atau wilayah penugasan belum memadai",
        tooltipText: "Kesesuaian lokasi belum dapat ditentukan dari identitas wilayah administratif yang tersedia.",
        badgeClass: "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400",
        icon: MapPinOff,
      };
  }
}
