"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Eye,
  Layers,
  List,
  type LucideIcon,
  Map as MapIcon,
  Search,
  ShieldAlert,
  Signal,
} from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Button } from "@/components/ui/button";
// biome-ignore lint/suspicious/noShadowRestrictedNames: Map component shadow
import { Map, MapControls, MapMarker, MapMarkerPopup } from "@/components/ui/map";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findDkiJakartaProvinceFilterId } from "@/lib/domain/area-filter";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type {
  PersonnelListItem,
  PersonnelListProps,
  PersonnelListQueryState,
  PersonnelMapFeature,
  PersonnelMapPayload,
} from "./executive-personnel-types";

type PersonnelPageConfig = NonNullable<PersonnelListProps["pageConfig"]>;
type PersonnelSortColumn = "personnel" | "area" | "jaring" | "status" | "access";
type PersonnelSortDirection = "asc" | "desc";
type PersonnelSortState = {
  column: PersonnelSortColumn;
  direction: PersonnelSortDirection;
};
type PersonnelTextConfig = Required<
  Pick<
    PersonnelPageConfig,
    | "layoutVariant"
    | "searchPlaceholder"
    | "scopeLabel"
    | "totalPersonnelLabel"
    | "personnelColumnLabel"
    | "jaringKpiLabel"
    | "onlineKpiLabel"
    | "offlineKpiLabel"
    | "emptyTitle"
    | "emptyDescription"
    | "mapLegendTitle"
  >
>;
type ResolvedPersonnelPageConfig = PersonnelPageConfig & PersonnelTextConfig;

const PERSONNEL_SORT_COLLATOR = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
});

const DEFAULT_PAGE_CONFIG: ResolvedPersonnelPageConfig = {
  basePath: "/dashboard/personel-lapangan",
  title: "Petugas Wilayah (Gaswil)",
  description:
    "Konsolidasi Petugas Wilayah (Gaswil), wilayah penugasan, Jaring binaan, status sinyal, dan aktivitas operasional.",
  tableTabLabel: "Daftar Petugas Wilayah",
  mapTabLabel: "Peta Penugasan",
  detailTarget: "userProfile",
  showMapTab: true,
  showExecutiveSummary: true,
  showProvinceFilter: true,
  layoutVariant: "tactical",
  searchPlaceholder: `Cari nama, nomor HP, jabatan, wilayah penugasan, atau ${DOMAIN_TERMS.jaring}...`,
  scopeLabel: "Cakupan data",
  totalPersonnelLabel: "Total Petugas Wilayah",
  personnelColumnLabel: "Petugas Wilayah",
  jaringKpiLabel: `${DOMAIN_TERMS.jaring} Binaan`,
  onlineKpiLabel: "Aktif / Terhubung",
  offlineKpiLabel: "Tidak Terhubung / Tanpa Sinyal",
  emptyTitle: "Tidak ada Petugas Wilayah aktif",
  emptyDescription:
    "Pencarian tidak menemukan Petugas Wilayah yang cocok dengan parameter kueri yang ditentukan. Silakan atur ulang filter.",
  mapLegendTitle: "Keterangan Marker",
};

function resolvePageConfig(pageConfig?: PersonnelListProps["pageConfig"]): ResolvedPersonnelPageConfig {
  const merged = { ...DEFAULT_PAGE_CONFIG, ...pageConfig };

  return {
    ...merged,
    layoutVariant: merged.layoutVariant ?? DEFAULT_PAGE_CONFIG.layoutVariant,
    searchPlaceholder: merged.searchPlaceholder ?? DEFAULT_PAGE_CONFIG.searchPlaceholder,
    scopeLabel: merged.scopeLabel ?? DEFAULT_PAGE_CONFIG.scopeLabel,
    totalPersonnelLabel: merged.totalPersonnelLabel ?? DEFAULT_PAGE_CONFIG.totalPersonnelLabel,
    personnelColumnLabel: merged.personnelColumnLabel ?? DEFAULT_PAGE_CONFIG.personnelColumnLabel,
    jaringKpiLabel: merged.jaringKpiLabel ?? DEFAULT_PAGE_CONFIG.jaringKpiLabel,
    onlineKpiLabel: merged.onlineKpiLabel ?? DEFAULT_PAGE_CONFIG.onlineKpiLabel,
    offlineKpiLabel: merged.offlineKpiLabel ?? DEFAULT_PAGE_CONFIG.offlineKpiLabel,
    emptyTitle: merged.emptyTitle ?? DEFAULT_PAGE_CONFIG.emptyTitle,
    emptyDescription: merged.emptyDescription ?? DEFAULT_PAGE_CONFIG.emptyDescription,
    mapLegendTitle: merged.mapLegendTitle ?? DEFAULT_PAGE_CONFIG.mapLegendTitle,
  };
}

function _formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isPersonnelOnline(
  item: PersonnelListItem,
  freshness?: { activeWithinMinutes: number; recentWithinHours: number },
) {
  const lastLocation = item.lastLocation ?? item.assignment?.lastLocation;
  if (!lastLocation?.capturedAt) return false;

  const _activeWithinMinutes = freshness?.activeWithinMinutes ?? 30;
  const recentWithinHours = freshness?.recentWithinHours ?? 24;

  const ageMs = Date.now() - new Date(lastLocation.capturedAt).getTime();
  return ageMs <= recentWithinHours * 3_600_000;
}

function connectionStatusLabel(isConnected: boolean) {
  return isConnected ? "Terhubung" : "Tidak Terhubung";
}

function primaryArea(item: PersonnelListItem) {
  const areas = item.assignment ? item.assignment.areas : [];
  return areas.find((area) => area.isPrimary) ?? areas[0] ?? null;
}

function areaHierarchy(item: PersonnelListItem) {
  const area = primaryArea(item);
  const areas = area ? [...(area.ancestors ?? []), area] : [];
  const province = areas.find((item) => item.level === "PROVINCE") ?? null;
  const regency = areas.find((item) => item.level === "REGENCY" || item.level === "CITY") ?? null;
  const district = areas.find((item) => item.level === "DISTRICT") ?? null;

  return { province, regency, district, fallback: area };
}

function assignmentAreaColumnLabel(queryState: PersonnelListQueryState) {
  if (queryState.districtId) return "Kecamatan Penugasan";
  if (queryState.regencyId) return "Kecamatan";
  if (queryState.provinceId) return "Kabupaten/Kota / Kecamatan";
  return "Provinsi / Kabupaten/Kota / Kecamatan";
}

function assignmentAreaRows(item: PersonnelListItem, queryState: PersonnelListQueryState) {
  const hierarchy = areaHierarchy(item);
  const rows = [
    !queryState.provinceId && hierarchy.province ? { label: "Provinsi", value: hierarchy.province.name } : null,
    !queryState.regencyId && hierarchy.regency ? { label: "Kabupaten/Kota", value: hierarchy.regency.name } : null,
    !queryState.districtId && hierarchy.district ? { label: "Kecamatan", value: hierarchy.district.name } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  if (rows.length) return rows;
  return hierarchy.fallback ? [{ label: "Wilayah", value: hierarchy.fallback.name }] : [];
}

function _statusClass(status: string) {
  if (status === "ACTIVE") {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20";
  }
  if (status === "SUSPENDED") {
    return "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 dark:bg-red-950/20";
  }
  if (status === "ARCHIVED") {
    return "border-slate-500/40 bg-slate-500/10 text-slate-650 dark:text-slate-400 dark:bg-slate-900/20";
  }
  return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:bg-amber-950/20";
}

function pulseByStatus(status: string): "urgent" | "high" | "normal" | "slow" {
  if (status === "LIVE") return "high";
  if (status === "RECENT") return "normal";
  if (status === "STALE") return "slow";
  return "slow";
}

function _getStatusDotColor(status: string) {
  if (status === "ACTIVE") return "bg-emerald-500 dark:bg-emerald-400 animate-pulse";
  if (status === "SUSPENDED") return "bg-red-500 dark:bg-red-450";
  if (status === "ARCHIVED") return "bg-slate-500 dark:bg-slate-400";
  return "bg-amber-500 dark:bg-amber-400";
}

function _personnelStatusLabel(status: string) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "SUSPENDED") return "Ditangguhkan";
  if (status === "ARCHIVED") return "Diarsipkan";
  if (status === "PENDING") return "Menunggu";
  return status;
}

function findAreaName(options: Array<{ id: string; name: string }>, id?: string) {
  return id ? (options.find((option) => option.id === id)?.name ?? "") : "";
}

function buildScopeDescription({
  queryState,
  areaFilters,
  config,
  totalPersonnel,
}: {
  queryState: PersonnelListQueryState;
  areaFilters: PersonnelListProps["areaFilters"];
  config: ResolvedPersonnelPageConfig;
  totalPersonnel: number;
}) {
  const parts: string[] = [];
  const provinceName = config.showProvinceFilter ? findAreaName(areaFilters.provinces, queryState.provinceId) : "";
  const regencyName = findAreaName(areaFilters.regencies, queryState.regencyId);
  const districtName = findAreaName(areaFilters.districts, queryState.districtId);

  if (provinceName) parts.push(`Provinsi ${provinceName}`);
  if (regencyName) parts.push(regencyName);
  if (districtName) parts.push(`Kecamatan ${districtName}`);
  if (queryState.q) parts.push(`kata kunci "${queryState.q}"`);

  const scopeText = parts.length ? parts.join(" / ") : "seluruh wilayah dalam hak akses";
  return `${config.scopeLabel}: ${scopeText}. ${config.totalPersonnelLabel}: ${totalPersonnel}.`;
}

function buildPersonnelHref(
  basePath: string,
  queryState: PersonnelListQueryState,
  overrides: Partial<PersonnelListQueryState>,
) {
  const params = new URLSearchParams();
  const nextState = { ...queryState, ...overrides };
  if (nextState.q) params.set("q", nextState.q);
  if (nextState.provinceId) params.set("provinceId", nextState.provinceId);
  if (nextState.regencyId) params.set("regencyId", nextState.regencyId);
  if (nextState.districtId) params.set("districtId", nextState.districtId);
  params.set("page", String(nextState.page));
  params.set("limit", String(nextState.limit));
  return `${basePath}?${params.toString()}`;
}

function personnelDetailHref(item: PersonnelListItem, config: PersonnelPageConfig) {
  const targetId = config.detailTarget === "assignment" ? item.assignment?.id : item.id;
  return targetId ? `${config.basePath}/${targetId}` : config.basePath;
}

function markerDetailHref(feature: PersonnelMapFeature, config: PersonnelPageConfig) {
  const targetId =
    config.detailTarget === "assignment" ? feature.properties.assignmentId : feature.properties.userProfileId;
  return `${config.basePath}/${targetId}`;
}

function _formatSyncTime(dateStr?: string) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return `${date.toISOString().replace("T", " ").substring(0, 19)} UTC`;
}

function formatSystemClock(date: Date) {
  return `${date.toISOString().replace("T", " ").substring(0, 19)} UTC`;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

/* -------------------------------------------------------------------------- */
/* CUSTOM SUBCOMPONENTS FOR REDESIGN                                          */
/* -------------------------------------------------------------------------- */

function TacticalBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden" aria-hidden="true">
      {/* 1. Tactical Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--dc-primary) 24%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--dc-primary) 24%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
        }}
      />

      {/* 2. Low Opacity Circuit Overlay */}
      <svg
        className="absolute inset-0 h-full w-full text-[var(--dc-primary)] opacity-[0.03] dark:opacity-[0.015]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Circuit Overlay Pattern</title>
        <defs>
          <pattern id="circuit-grid" width="128" height="128" patternUnits="userSpaceOnUse">
            <path
              d="M 0 64 L 32 64 L 48 48 L 80 48 L 96 64 L 128 64 M 64 0 L 64 32 L 48 48 M 64 80 L 64 128 M 48 48 L 48 80 M 80 48 L 80 96 L 96 112"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="48" cy="48" r="2" fill="currentColor" />
            <circle cx="80" cy="48" r="2" fill="currentColor" />
            <circle cx="96" cy="64" r="2" fill="currentColor" />
            <circle cx="64" cy="32" r="2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#circuit-grid)" />
      </svg>

      {/* 3. Subtle Digital Noise Overlay */}
      <svg className="absolute h-0 w-0" aria-hidden="true">
        <title>Digital Noise Effect</title>
        <filter id="noise-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0" />
        </filter>
      </svg>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.35]"
        style={{ filter: "url(#noise-filter)" }}
      />

      {/* 4. Radial Ambient Gradients */}
      <div className="pointer-events-none absolute -top-[30%] -left-[10%] h-[70%] w-[60%] rounded-full bg-[var(--dc-primary)]/4 blur-[120px] dark:bg-[var(--dc-primary)]/5" />
      <div className="pointer-events-none absolute -right-[5%] -bottom-[20%] h-[60%] w-[50%] rounded-full bg-[var(--dc-success)]/3 blur-[120px]" />
    </div>
  );
}

function AnimatedCounter({ value }: { value: number }) {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(latest) {
        node.textContent = Math.round(latest).toLocaleString();
      },
    });

    return () => controls.stop();
  }, [value]);

  return (
    <span ref={nodeRef} className="font-mono">
      0
    </span>
  );
}

// Helper to handle client-side animate utility cleanly
function animate(
  from: number,
  to: number,
  options: { duration: number; ease: string; onUpdate: (latest: number) => void },
) {
  let startTimestamp: number | null = null;
  let animationFrameId: number;

  const step = (timestamp: number) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / (options.duration * 1000), 1);

    // Easing function: easeOutQuad
    const easedProgress = progress * (2 - progress);
    const latest = from + (to - from) * easedProgress;

    options.onUpdate(latest);

    if (progress < 1) {
      animationFrameId = window.requestAnimationFrame(step);
    }
  };

  animationFrameId = window.requestAnimationFrame(step);
  return {
    stop: () => window.cancelAnimationFrame(animationFrameId),
  };
}

function KpiCard({
  label,
  value,
  trend,
  progress,
  variant = "cyan",
}: {
  label: string;
  value: number;
  trend?: string;
  progress?: number;
  variant?: "cyan" | "emerald" | "amber";
}) {
  const ACCENT_COLORS: Record<string, string> = {
    emerald: "text-[var(--dc-success)]",
    amber: "text-[var(--dc-warning)]",
    cyan: "text-[var(--dc-primary)]",
  };

  const HOVER_STYLES: Record<string, string> = {
    emerald:
      "hover:border-[var(--dc-success)]/60 hover:shadow-[0_0_15px_color-mix(in_srgb,var(--dc-success)_20%,transparent)]",
    amber:
      "hover:border-[var(--dc-warning)]/60 hover:shadow-[0_0_15px_color-mix(in_srgb,var(--dc-warning)_20%,transparent)]",
    cyan: "hover:border-[var(--dc-primary)]/60 hover:shadow-[0_0_15px_color-mix(in_srgb,var(--dc-primary)_20%,transparent)]",
  };

  const BAR_COLORS: Record<string, string> = {
    emerald: "bg-[var(--dc-success)]",
    amber: "bg-[var(--dc-warning)]",
    cyan: "bg-[var(--dc-primary)]",
  };

  const accentColor = ACCENT_COLORS[variant] || ACCENT_COLORS.cyan;
  const hoverStyle = HOVER_STYLES[variant] || HOVER_STYLES.cyan;
  const barColor = BAR_COLORS[variant] || BAR_COLORS.cyan;
  const safeProgress = progress === undefined ? undefined : Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn(
        "group relative select-none overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 text-foreground shadow-[0_0_15px_rgba(34,211,238,0.01)] transition-all duration-250 hover:-translate-y-0.5 dark:border-slate-800 dark:bg-[#080d14]/80",
        hoverStyle,
      )}
    >
      {/* Tactical Corner Wireframes */}
      <div className="absolute top-0 left-0 h-2 w-2 border-[var(--dc-border-subtle)] border-t-2 border-l-2 transition-colors group-hover:border-[var(--dc-primary)]/60 dark:border-slate-700" />
      <div className="absolute top-0 right-0 h-2 w-2 border-[var(--dc-border-subtle)] border-t-2 border-r-2 transition-colors group-hover:border-[var(--dc-primary)]/60 dark:border-slate-700" />
      <div className="absolute bottom-0 left-0 h-2 w-2 border-[var(--dc-border-subtle)] border-b-2 border-l-2 transition-colors group-hover:border-[var(--dc-primary)]/60 dark:border-slate-700" />
      <div className="absolute right-0 bottom-0 h-2 w-2 border-[var(--dc-border-subtle)] border-r-2 border-b-2 transition-colors group-hover:border-[var(--dc-primary)]/60 dark:border-slate-700" />

      {/* Title & Micro label */}
      <div className="flex items-start justify-between">
        <p className="font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-widest">{label}</p>
      </div>

      {/* Counter and trend */}
      <div className="mt-3 flex items-baseline justify-between gap-2">
        <p className={cn("font-bold font-mono text-3xl tracking-tight", accentColor)}>
          <AnimatedCounter value={value} />
        </p>
        {trend && (
          <span className="border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)]/60 px-1.5 py-0.5 font-medium font-mono text-[9px] text-foreground/80 uppercase dark:border-slate-900 dark:bg-slate-950/60">
            {trend}
          </span>
        )}
      </div>

      {/* Miniature tactical bar */}
      {safeProgress !== undefined && (
        <div className="mt-4 space-y-1">
          <div className="flex items-center justify-between font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">
            <span>Persentase</span>
            <span>{formatPercent(safeProgress)}%</span>
          </div>
          <div className="h-[3px] w-full overflow-hidden border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] dark:border-slate-900 dark:bg-slate-950">
            <motion.div
              className={cn("h-full", barColor)}
              initial={{ width: 0 }}
              animate={{ width: `${safeProgress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DirectorySummaryCard({
  label,
  value,
  percentageLabel,
  icon: Icon,
  tone = "sky",
}: {
  label: string;
  value: number;
  percentageLabel?: string;
  icon: LucideIcon;
  tone?: "sky" | "emerald" | "amber" | "slate";
}) {
  const toneClass = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    slate: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  }[tone];

  return (
    <div className="flex min-w-[150px] items-center gap-3 rounded-xl border border-slate-200/80 bg-card p-3.5 text-left shadow-xs dark:border-white/10">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", toneClass)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-[11px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-bold text-xl text-foreground tracking-tight">
          <AnimatedCounter value={value} />
        </p>
        {percentageLabel ? (
          <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
            {percentageLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TableSkeleton({ config }: { config: ResolvedPersonnelPageConfig }) {
  const skeletonRows = ["one", "two", "three", "four", "five"];

  return (
    <div className="overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/40 dark:border-slate-800 dark:bg-[#080d14]/40">
      <Table>
        <TableHeader className="border-[var(--dc-border-subtle)] border-b bg-[var(--dc-surface-raised)] dark:border-slate-850 dark:bg-slate-950/80">
          <TableRow className="border-[var(--dc-border-subtle)] border-b hover:bg-transparent dark:border-slate-800">
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              {config.personnelColumnLabel}
            </TableHead>
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              Wilayah
            </TableHead>
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              Jumlah Jaring
            </TableHead>
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              Akses
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {skeletonRows.map((rowId) => (
            <TableRow
              key={`sk-${rowId}`}
              className="border-[var(--dc-border-subtle)] border-b hover:bg-transparent dark:border-slate-900/60"
            >
              <TableCell className="py-4 text-center">
                <div className="mx-auto h-4 w-36 animate-pulse rounded-none border border-[var(--dc-primary-soft)]/10 bg-[var(--dc-primary-soft)]/20" />
                <div className="mx-auto mt-2 h-3 w-48 animate-pulse rounded-none bg-[var(--dc-primary-soft)]/10" />
              </TableCell>
              <TableCell className="text-center">
                <div className="mx-auto h-4 w-32 animate-pulse rounded-none border border-[var(--dc-primary-soft)]/10 bg-[var(--dc-primary-soft)]/20" />
                <div className="mx-auto mt-2 h-3 w-16 animate-pulse rounded-none bg-[var(--dc-primary-soft)]/10" />
              </TableCell>
              <TableCell className="text-center">
                <div className="mx-auto inline-block h-6 w-14 animate-pulse rounded-none border border-[var(--dc-primary-soft)]/10 bg-[var(--dc-primary-soft)]/20" />
              </TableCell>
              <TableCell className="text-center">
                <div className="mx-auto inline-block h-6 w-14 animate-pulse rounded-none border border-[var(--dc-primary-soft)]/10 bg-[var(--dc-primary-soft)]/20" />
              </TableCell>
              <TableCell className="text-center">
                <div className="mx-auto inline-block h-7 w-16 animate-pulse rounded-none border border-[var(--dc-primary-soft)]/10 bg-[var(--dc-primary-soft)]/20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RadarEmptyState({ onReset, config }: { onReset?: () => void; config: ResolvedPersonnelPageConfig }) {
  return (
    <div className="relative flex select-none flex-col items-center justify-center overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/40 px-4 py-16 text-center dark:border-slate-800 dark:bg-[#080d14]/40">
      {/* Radar rings visualization */}
      <div className="relative flex size-32 items-center justify-center">
        <div
          className="absolute inset-0 animate-ping rounded-full border border-cyan-500/20"
          style={{ animationDuration: "3.2s" }}
        />
        <div className="absolute inset-4 rounded-full border border-cyan-500/10" />
        <div className="absolute inset-10 rounded-full border border-cyan-500/5" />

        {/* Radar sweeping hand */}
        <div
          className="absolute inset-0 animate-spin rounded-full border-cyan-500/30 border-t border-r"
          style={{
            animationDuration: "5s",
            background:
              "conic-gradient(from 0deg, transparent 50%, color-mix(in srgb, var(--dc-primary) 6%, transparent) 100%)",
          }}
        />
        <ShieldAlert className="size-8 animate-pulse text-amber-500" />
      </div>

      <h3 className="mt-6 font-bold font-mono text-[var(--dc-text-primary)] text-xs uppercase tracking-widest">
        {config.emptyTitle}
      </h3>
      <p className="mt-2 max-w-md font-mono text-[11px] text-[var(--dc-text-secondary)] leading-relaxed">
        {config.emptyDescription}
      </p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-6 rounded-none border border-[var(--dc-primary)]/50 bg-[var(--dc-primary-soft)] px-4 py-2 font-bold font-mono text-[10px] text-[var(--dc-primary)] uppercase tracking-wider transition-colors hover:bg-[var(--dc-primary)] hover:text-slate-950 dark:bg-cyan-950/30 dark:text-cyan-400"
        >
          Atur ulang filter
        </button>
      )}
    </div>
  );
}

function LocationMarker({ feature, config }: { feature: PersonnelMapFeature; config: PersonnelPageConfig }) {
  return (
    <MapMarker
      longitude={feature.geometry.coordinates[0]}
      latitude={feature.geometry.coordinates[1]}
      pulse={pulseByStatus(feature.properties.status)}
    >
      <Link
        href={markerDetailHref(feature, config)}
        className="group block"
        aria-label={`Buka detail ${feature.properties.name ?? feature.properties.email}`}
      >
        <span
          className="grid size-4 place-items-center rounded-full border border-slate-950/70 font-extrabold font-mono text-[7px] text-slate-950 shadow-md transition-transform group-hover:scale-110"
          style={{ backgroundColor: feature.properties.markerColor }}
        >
          {feature.properties.markerCode}
        </span>
      </Link>
      <MapMarkerPopup className="rounded border border-[var(--dc-border-subtle)] bg-slate-950/95 px-3 py-2 text-slate-100 text-xs shadow-xl">
        <div className="space-y-1">
          <p className="font-semibold">{feature.properties.name ?? feature.properties.email}</p>
          <p className="text-slate-400">{feature.properties.positionTitle}</p>
          <p className="text-slate-400">{feature.properties.unitName}</p>
          <p className="text-cyan-300">{feature.properties.area?.name ?? "Wilayah belum ada"}</p>
        </div>
      </MapMarkerPopup>
    </MapMarker>
  );
}

function personnelDisplayName(item: Pick<PersonnelListItem, "email" | "fullName" | "username">) {
  if (item.fullName?.trim()) return item.fullName;
  if (item.username?.trim() && !item.username.includes("@")) return item.username;
  return "Petugas Wilayah";
}

function personnelAreaSortValue(item: PersonnelListItem, queryState: PersonnelListQueryState) {
  const rows = assignmentAreaRows(item, queryState);
  return rows.map((row) => row.value).join(" / ");
}

function personnelSortValue(
  item: PersonnelListItem,
  column: PersonnelSortColumn,
  config: ResolvedPersonnelPageConfig,
  queryState: PersonnelListQueryState,
  freshness?: PersonnelMapPayload["meta"]["freshness"],
) {
  if (column === "personnel") return personnelDisplayName(item);
  if (column === "area") return personnelAreaSortValue(item, queryState);
  if (column === "jaring") return item.jaringCount ?? 0;
  if (column === "status") return connectionStatusLabel(isPersonnelOnline(item, freshness));
  return personnelDetailHref(item, config);
}

function comparePersonnelBySort(
  left: PersonnelListItem,
  right: PersonnelListItem,
  sort: PersonnelSortState,
  config: ResolvedPersonnelPageConfig,
  queryState: PersonnelListQueryState,
  freshness?: PersonnelMapPayload["meta"]["freshness"],
) {
  const leftValue = personnelSortValue(left, sort.column, config, queryState, freshness);
  const rightValue = personnelSortValue(right, sort.column, config, queryState, freshness);
  const directionMultiplier = sort.direction === "asc" ? 1 : -1;
  const baseCompare =
    typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : PERSONNEL_SORT_COLLATOR.compare(String(leftValue), String(rightValue));

  return (
    baseCompare * directionMultiplier ||
    PERSONNEL_SORT_COLLATOR.compare(personnelDisplayName(left), personnelDisplayName(right))
  );
}

function PersonnelSortableHeader({
  column,
  sort,
  onSortChange,
  children,
  className,
  align = "left",
}: {
  readonly column: PersonnelSortColumn;
  readonly sort: PersonnelSortState | null;
  readonly onSortChange: (sort: PersonnelSortState) => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly align?: "left" | "center" | "right";
}) {
  const active = sort?.column === column;
  const direction = active ? sort.direction : null;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={cn("h-11 text-[10px] uppercase tracking-wider", className)}
    >
      <Button
        aria-label={`Urutkan ${String(children)} ${direction === "asc" ? "menurun" : "menaik"}`}
        className={cn(
          "h-auto w-full gap-1.5 bg-transparent p-0 text-inherit uppercase tracking-[inherit] hover:bg-transparent hover:text-[var(--dc-primary)]",
          align === "center" && "justify-center",
          align === "right" && "justify-end",
          align === "left" && "justify-start",
        )}
        onClick={() =>
          onSortChange({
            column,
            direction: active && direction === "asc" ? "desc" : "asc",
          })
        }
        size="sm"
        type="button"
        variant="ghost"
      >
        {children}
        <Icon className="size-3.5 shrink-0" />
      </Button>
    </TableHead>
  );
}

function PersonnelTable({
  items,
  isPending,
  onReset,
  config,
  freshness,
  queryState,
  sort,
  onSortChange,
}: {
  items: PersonnelListItem[];
  isPending: boolean;
  onReset?: () => void;
  config: ResolvedPersonnelPageConfig;
  freshness?: PersonnelMapPayload["meta"]["freshness"];
  queryState: PersonnelListQueryState;
  sort: PersonnelSortState | null;
  onSortChange: (sort: PersonnelSortState) => void;
}) {
  const isDirectoryLayout = config.layoutVariant === "directory";

  if (isPending) {
    return <TableSkeleton config={config} />;
  }

  if (!items.length) {
    return <RadarEmptyState onReset={onReset} config={config} />;
  }

  return (
    <div
      className={cn(
        "select-none overflow-hidden border bg-card",
        isDirectoryLayout
          ? "rounded-[18px] border-slate-200/80 shadow-xs dark:border-white/10"
          : "rounded-none border-[var(--dc-border-subtle)] dark:border-slate-800 dark:bg-[#080d14]/70",
      )}
    >
      <Table>
        <TableHeader
          className={cn(
            "sticky top-0 z-10 border-b",
            isDirectoryLayout
              ? "border-border/80 bg-slate-100/60 dark:bg-zinc-900/60"
              : "border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] dark:border-slate-850 dark:bg-slate-950/90",
          )}
        >
          <TableRow
            className={cn(
              "border-b hover:bg-transparent",
              isDirectoryLayout ? "border-border/80" : "border-[var(--dc-border-subtle)] dark:border-slate-800",
            )}
          >
            <PersonnelSortableHeader
              column="personnel"
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                isDirectoryLayout
                  ? "pl-6 text-left font-semibold text-muted-foreground"
                  : "text-center font-mono text-[var(--dc-text-secondary)]",
              )}
              align={isDirectoryLayout ? "left" : "center"}
            >
              {config.personnelColumnLabel}
            </PersonnelSortableHeader>
            <PersonnelSortableHeader
              column="area"
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                isDirectoryLayout
                  ? "text-left font-semibold text-muted-foreground"
                  : "text-center font-mono text-[var(--dc-text-secondary)]",
              )}
              align={isDirectoryLayout ? "left" : "center"}
            >
              {assignmentAreaColumnLabel(queryState)}
            </PersonnelSortableHeader>
            <PersonnelSortableHeader
              column="jaring"
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                isDirectoryLayout
                  ? "text-left font-semibold text-muted-foreground"
                  : "text-center font-mono text-[var(--dc-text-secondary)]",
              )}
              align={isDirectoryLayout ? "left" : "center"}
            >
              Jumlah Jaring
            </PersonnelSortableHeader>
            <PersonnelSortableHeader
              column="status"
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                isDirectoryLayout
                  ? "text-left font-semibold text-muted-foreground"
                  : "text-center font-mono text-[var(--dc-text-secondary)]",
              )}
              align={isDirectoryLayout ? "left" : "center"}
            >
              Status
            </PersonnelSortableHeader>
            <PersonnelSortableHeader
              column="access"
              sort={sort}
              onSortChange={onSortChange}
              className={cn(
                isDirectoryLayout
                  ? "pr-6 text-right font-semibold text-muted-foreground"
                  : "text-center font-mono text-[var(--dc-text-secondary)]",
              )}
              align={isDirectoryLayout ? "right" : "center"}
            >
              Akses
            </PersonnelSortableHeader>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const areaRows = assignmentAreaRows(item, queryState);
            const detailHref = personnelDetailHref(item, config);
            const displayName = personnelDisplayName(item);
            return (
              <TableRow
                key={item.id}
                className={cn(
                  "group relative border-b transition-colors",
                  isDirectoryLayout
                    ? "h-16 border-border/50 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40"
                    : "border-[var(--dc-border-subtle)] hover:bg-[var(--dc-primary-soft)]/20 dark:border-slate-900",
                )}
              >
                {/* Left Cyan Indicator on Hover */}
                <TableCell className={cn("relative py-3.5", isDirectoryLayout ? "pl-6 text-left" : "text-center")}>
                  {!isDirectoryLayout && (
                    <div className="absolute top-0 bottom-0 left-0 w-[2.5px] bg-[var(--dc-primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  )}
                  <Link href={detailHref} className="block min-w-56">
                    <span
                      className={cn(
                        "block font-bold text-foreground transition-colors group-hover:text-[var(--dc-primary)]",
                        isDirectoryLayout ? "text-sm" : "font-mono text-xs",
                      )}
                    >
                      {displayName}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className={cn("min-w-64", isDirectoryLayout ? "text-left" : "text-center")}>
                  {areaRows.length ? (
                    <div className={cn("space-y-1", !isDirectoryLayout && "mx-auto max-w-72 font-mono")}>
                      {areaRows.map((row) => (
                        <div
                          key={`${item.id}-${row.label}`}
                          className={cn(
                            "grid min-w-0 gap-2",
                            isDirectoryLayout ? "grid-cols-[7.5rem_1fr] text-sm" : "grid-cols-[6.5rem_1fr] text-xs",
                          )}
                        >
                          <span className="truncate text-[var(--dc-text-muted)]">{row.label}</span>
                          <span className="truncate font-medium text-[var(--dc-text-primary)]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[var(--dc-text-muted)]">-</span>
                  )}
                </TableCell>
                <TableCell className={cn(isDirectoryLayout ? "text-left" : "text-center")}>
                  <span
                    className={cn(
                      "inline-flex min-w-8 items-center justify-center border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-semibold text-cyan-600 dark:text-cyan-300",
                      isDirectoryLayout ? "rounded-full text-xs" : "font-mono text-xs",
                    )}
                  >
                    {item.jaringCount ?? 0}
                  </span>
                </TableCell>
                <TableCell className={cn(isDirectoryLayout ? "text-left" : "text-center")}>
                  {(() => {
                    const online = isPersonnelOnline(item, freshness);
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 border px-2 py-0.5 font-semibold uppercase tracking-wider",
                          isDirectoryLayout ? "rounded-full text-[10px]" : "rounded-none font-mono text-[9px]",
                          online
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                            : "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20",
                        )}
                      >
                        <span
                          className={cn(
                            "size-1 rounded-full",
                            online
                              ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                              : "bg-slate-500 dark:bg-slate-400",
                          )}
                        />
                        {connectionStatusLabel(online)}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className={cn(isDirectoryLayout ? "pr-6 text-right" : "text-center")}>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className={cn(
                      "h-8 gap-1.5 rounded-lg px-2.5 font-medium text-xs",
                      isDirectoryLayout
                        ? "border-border hover:border-primary hover:bg-primary/5 hover:text-primary"
                        : "border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400",
                    )}
                  >
                    <Link href={detailHref}>
                      <Eye className="size-3.5" />
                      Detail
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function PersonnelCardGrid({
  items,
  isPending,
  onReset,
  config,
  freshness,
}: {
  items: PersonnelListItem[];
  isPending: boolean;
  onReset?: () => void;
  config: ResolvedPersonnelPageConfig;
  freshness?: PersonnelMapPayload["meta"]["freshness"];
}) {
  const isDirectoryLayout = config.layoutVariant === "directory";

  if (isPending) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {["one", "two", "three", "four", "five", "six"].map((rowId) => (
          <div
            key={`personnel-card-skeleton-${rowId}`}
            className={cn(
              "h-40 animate-pulse border bg-card",
              isDirectoryLayout
                ? "rounded-xl border-slate-200/80 dark:border-white/10"
                : "rounded-none border-[var(--dc-border-subtle)] dark:border-slate-800",
            )}
          />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <RadarEmptyState onReset={onReset} config={config} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const area = primaryArea(item);
        const detailHref = personnelDetailHref(item, config);
        const online = isPersonnelOnline(item, freshness);
        const displayName = personnelDisplayName(item);

        return (
          <Link
            key={item.id}
            href={detailHref}
            className={cn(
              "group relative min-w-0 overflow-hidden border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5",
              isDirectoryLayout
                ? "rounded-xl border-slate-200/80 shadow-xs hover:border-primary/40 hover:bg-slate-50/50 dark:border-white/10 dark:hover:bg-zinc-900/60"
                : "rounded-none border-[var(--dc-border-subtle)] hover:border-[var(--dc-primary)]/50 hover:bg-[var(--dc-primary-soft)]/10 dark:border-slate-800 dark:bg-[#080d14]/70",
            )}
          >
            {!isDirectoryLayout && (
              <div className="absolute top-0 left-0 h-full w-[3px] bg-[var(--dc-primary)] opacity-0 transition-opacity group-hover:opacity-100" />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3
                  className={cn(
                    "truncate font-bold text-foreground group-hover:text-primary",
                    isDirectoryLayout ? "text-sm" : "font-mono text-xs",
                  )}
                >
                  {displayName}
                </h3>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 font-semibold uppercase tracking-wider",
                  isDirectoryLayout ? "rounded-full text-[10px]" : "rounded-none font-mono text-[9px]",
                  online
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                    : "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20",
                )}
              >
                <span className={cn("size-1 rounded-full", online ? "animate-pulse bg-emerald-500" : "bg-slate-500")} />
                {connectionStatusLabel(online)}
              </span>
            </div>

            <div
              className={cn(
                "mt-4 space-y-2 border-t pt-3",
                isDirectoryLayout
                  ? "border-border/70 text-muted-foreground text-xs"
                  : "border-[var(--dc-border-subtle)] font-mono text-[10px] text-[var(--dc-text-secondary)]",
              )}
            >
              <div>
                <span className="block text-[var(--dc-text-muted)] uppercase">Jabatan</span>
                <span className="block truncate text-[var(--dc-text-primary)]">{item.assignment?.title ?? "-"}</span>
              </div>
              <div>
                <span className="block text-[var(--dc-text-muted)] uppercase">Wilayah</span>
                <span className="block truncate text-[var(--dc-text-primary)]">{area?.name ?? "-"}</span>
              </div>
              <div>
                <span className="block text-[var(--dc-text-muted)] uppercase">Jumlah Jaring</span>
                <span className="block text-[var(--dc-text-primary)] font-semibold">
                  {item.jaringCount ?? 0} Jaring
                </span>
              </div>
            </div>

            <span
              className={cn(
                "mt-4 inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 font-medium text-xs transition-colors",
                isDirectoryLayout
                  ? "border-border group-hover:border-primary group-hover:bg-primary/5 group-hover:text-primary"
                  : "border-sky-500/30 text-sky-600 group-hover:bg-sky-500/10 dark:text-sky-400",
              )}
            >
              <Eye className="size-3.5" />
              Detail
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN EXPORT COMPONENT                                                      */
/* -------------------------------------------------------------------------- */

export function ExecutivePersonnelClient({ items, map, queryState, areaFilters, pageConfig }: PersonnelListProps) {
  const config = resolvePageConfig(pageConfig);
  const showMapTab = config.showMapTab !== false;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [_systemClock, setSystemClock] = useState("SYNCING...");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [sort, setSort] = useState<PersonnelSortState | null>(null);
  const didApplyDefaultProvinceFilter = useRef(false);
  const defaultProvinceFilter = useMemo(
    () => (config.showProvinceFilter ? findDkiJakartaProvinceFilterId(areaFilters.provinces) : ""),
    [areaFilters.provinces, config.showProvinceFilter],
  );

  const totalPersonnel = items.length;
  const totalJaring = items.reduce((total, item) => total + (item.jaringCount ?? 0), 0);
  const onlineCount = (map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0);
  const offlineCount = (map.meta.counts.byStatus.STALE ?? 0) + (map.meta.counts.byStatus.NO_SIGNAL ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalPersonnel / rowsPerPage));
  const safePage = Math.min(page, totalPages);

  const sortedItems = useMemo(() => {
    if (!sort) return items;

    return items
      .map((item, index) => ({ item, index }))
      .sort(
        (left, right) =>
          comparePersonnelBySort(left.item, right.item, sort, config, queryState, map.meta.freshness) ||
          left.index - right.index,
      )
      .map(({ item }) => item);
  }, [config, items, map.meta.freshness, queryState, sort]);

  const paginatedItems = useMemo(() => {
    return sortedItems.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  }, [rowsPerPage, safePage, sortedItems]);

  const handleSortChange = (nextSort: PersonnelSortState) => {
    setSort(nextSort);
    setPage(1);
  };

  const applyFilter = (overrides: Partial<PersonnelListQueryState>) => {
    setPage(1);
    startTransition(() => {
      router.push(
        buildPersonnelHref(config.basePath, queryState, {
          ...overrides,
          page: 1,
        }),
      );
    });
  };

  const resetFilters = () => {
    setPage(1);
    startTransition(() => {
      router.push(
        buildPersonnelHref(config.basePath, queryState, {
          q: "",
          provinceId: defaultProvinceFilter,
          regencyId: "",
          districtId: "",
          page: 1,
          limit: 20,
        }),
      );
    });
  };

  useEffect(() => {
    if (
      didApplyDefaultProvinceFilter.current ||
      !defaultProvinceFilter ||
      queryState.provinceId ||
      queryState.regencyId ||
      queryState.districtId
    ) {
      return;
    }

    didApplyDefaultProvinceFilter.current = true;
    startTransition(() => {
      router.replace(
        buildPersonnelHref(config.basePath, queryState, {
          provinceId: defaultProvinceFilter,
          regencyId: "",
          districtId: "",
          page: 1,
        }),
      );
    });
  }, [config.basePath, defaultProvinceFilter, queryState, router]);

  useEffect(() => {
    setSystemClock(formatSystemClock(new Date()));

    const intervalId = window.setInterval(() => {
      setSystemClock(formatSystemClock(new Date()));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  // KPI Calculations
  const onlinePercentage = (onlineCount / (totalPersonnel || 1)) * 100;
  const offlinePercentage = (offlineCount / (totalPersonnel || 1)) * 100;
  const scopeDescription = buildScopeDescription({ queryState, areaFilters, config, totalPersonnel });
  const isDirectoryLayout = config.layoutVariant === "directory";
  const showTabNavigation = showMapTab || config.showExecutiveSummary;
  const dynamicFilterClassName = cn(
    "h-9 w-full border px-3 text-foreground outline-none transition-all",
    isDirectoryLayout
      ? "rounded-lg border-border bg-background text-sm focus:border-primary focus:ring-2 focus:ring-primary/15"
      : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-canvas)] font-mono text-xs focus:border-[var(--dc-primary)] focus:shadow-[0_0_8px_color-mix(in_srgb,var(--dc-primary)_15%,transparent)] focus:ring-1 focus:ring-[var(--dc-primary)]/20 dark:border-slate-800 dark:bg-slate-950/80",
  );
  const dynamicFilterContentClassName =
    "z-50 rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)] font-mono text-foreground text-xs";

  return (
    <main
      className={cn(
        isDirectoryLayout
          ? "mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6"
          : "relative min-h-screen space-y-6 p-6",
      )}
    >
      {/* Dynamic Command Center Background Grid and Scanning Line */}
      {!isDirectoryLayout && <TacticalBackground />}

      <div className={cn("space-y-6 text-foreground", !isDirectoryLayout && "relative z-10")}>
        {/* Command Center Title Header */}
        {isDirectoryLayout ? (
          <header className="space-y-5">
            <div className="max-w-3xl">
              <h1 className="font-bold text-3xl text-foreground tracking-tight">{config.title}</h1>
              <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm">{config.description}</p>
              <p className="mt-2 text-foreground text-sm font-medium">{scopeDescription}</p>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 lg:grid-cols-4">
              <DirectorySummaryCard
                label={config.totalPersonnelLabel}
                value={totalPersonnel}
                icon={DOMAIN_VISUALS.gaswil.Icon}
              />
              <DirectorySummaryCard
                label={config.jaringKpiLabel}
                value={totalJaring}
                icon={DOMAIN_VISUALS.jaring.Icon}
                tone="sky"
              />
              <DirectorySummaryCard
                label={config.onlineKpiLabel}
                value={onlineCount}
                percentageLabel={`${formatPercent(percentOf(onlineCount, totalPersonnel))}% dari personel`}
                icon={Signal}
                tone="emerald"
              />
              <DirectorySummaryCard
                label={config.offlineKpiLabel}
                value={offlineCount}
                percentageLabel={`${formatPercent(percentOf(offlineCount, totalPersonnel))}% dari personel`}
                icon={ShieldAlert}
                tone="amber"
              />
            </div>
          </header>
        ) : (
          <header className="relative select-none overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-5 dark:border-slate-800 dark:bg-[#080d14]/80">
            <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-[var(--dc-primary)]/20 to-transparent" />
            <div className="absolute top-0 left-0 h-full w-[4px] bg-[var(--dc-primary)]" />

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <h1 className="mt-2 flex items-baseline gap-2 font-bold font-mono text-2xl text-foreground uppercase tracking-tight">
                  <span>{config.title}</span>
                </h1>
                <p className="max-w-3xl font-mono text-[11px] text-[var(--dc-text-secondary)] leading-relaxed">
                  {config.description}
                </p>
              </div>
            </div>
          </header>
        )}

        {/* Grouped Filter Panel Section */}
        <section
          className={cn(
            "space-y-3 border p-4",
            isDirectoryLayout
              ? "rounded-xl border-slate-200/80 bg-card shadow-xs dark:border-white/10"
              : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 dark:border-slate-800 dark:bg-[#080d14]/60",
          )}
        >
          <form
            className={cn(
              "grid w-full items-end gap-4",
              config.showProvinceFilter ? "md:grid-cols-[1.5fr_1fr_1fr_1fr]" : "md:grid-cols-[1.5fr_1fr_1fr]",
            )}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              applyFilter({
                q: formData.get("q") as string,
              });
            }}
          >
            <input type="hidden" name="limit" value={queryState.limit} />

            {/* Search query */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-[var(--dc-primary)]/60" />
                <input
                  name="q"
                  defaultValue={queryState.q}
                  placeholder={config.searchPlaceholder}
                  className={cn(
                    "h-9 w-full border pr-3 pl-9 text-foreground outline-none transition-all",
                    isDirectoryLayout
                      ? "rounded-lg border-border bg-background text-sm placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                      : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-canvas)] font-mono text-xs placeholder:text-[var(--dc-text-muted)] focus:border-[var(--dc-primary)] focus:shadow-[0_0_8px_color-mix(in_srgb,var(--dc-primary)_15%,transparent)] focus:ring-1 focus:ring-[var(--dc-primary)]/20 dark:border-slate-800 dark:bg-slate-950/80",
                  )}
                />
              </div>
            </div>

            {config.showProvinceFilter && (
              <div className="space-y-1.5">
                <div className="font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">
                  PROVINSI
                </div>
                <SearchableSelect
                  aria-label="Filter Provinsi"
                  value={queryState.provinceId || "ALL"}
                  options={[
                    {
                      value: "ALL",
                      label: "Pilih Provinsi/Binda terlebih dahulu",
                      disabled: areaFilters.provinces.length > 0,
                    },
                    ...areaFilters.provinces.map((area) => ({ value: area.id, label: area.name })),
                  ]}
                  onValueChange={(val) =>
                    applyFilter({
                      provinceId: val === "ALL" ? "" : val,
                      regencyId: "",
                      districtId: "",
                    })
                  }
                  placeholder="Pilih Provinsi/Binda terlebih dahulu"
                  searchPlaceholder="Cari Provinsi..."
                  emptyText="Provinsi tidak ditemukan."
                  className={dynamicFilterClassName}
                  contentClassName={dynamicFilterContentClassName}
                />
              </div>
            )}

            {/* Regency selection */}
            <div className="space-y-1.5">
              <div className="font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">
                KABUPATEN / KOTA
              </div>
              <SearchableSelect
                aria-label="Filter Kota/Kabupaten"
                value={queryState.regencyId || "ALL"}
                disabled={config.showProvinceFilter ? !queryState.provinceId : false}
                options={[
                  {
                    value: "ALL",
                    label:
                      config.showProvinceFilter && !queryState.provinceId
                        ? "Pilih Provinsi/Binda dahulu"
                        : "Semua Kota/Kabupaten",
                    disabled: config.showProvinceFilter && !queryState.provinceId,
                  },
                  ...areaFilters.regencies.map((area) => ({ value: area.id, label: area.name })),
                ]}
                onValueChange={(val) =>
                  applyFilter({
                    regencyId: val === "ALL" ? "" : val,
                    districtId: "",
                  })
                }
                placeholder={
                  config.showProvinceFilter && !queryState.provinceId
                    ? "Pilih Provinsi/Binda dahulu"
                    : "Semua Kota/Kabupaten"
                }
                searchPlaceholder="Cari Kota/Kabupaten..."
                emptyText="Kota/Kabupaten tidak ditemukan."
                className={cn(dynamicFilterClassName, "disabled:cursor-not-allowed disabled:opacity-30")}
                contentClassName={dynamicFilterContentClassName}
              />
            </div>

            {/* District selection */}
            <div className="space-y-1.5">
              <div className="font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">KECAMATAN</div>
              <SearchableSelect
                aria-label="Filter Kecamatan"
                value={queryState.districtId || "ALL"}
                disabled={!queryState.regencyId}
                options={[
                  {
                    value: "ALL",
                    label: queryState.regencyId ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu",
                    disabled: !queryState.regencyId,
                  },
                  ...areaFilters.districts.map((area) => ({ value: area.id, label: area.name })),
                ]}
                onValueChange={(val) =>
                  applyFilter({
                    districtId: val === "ALL" ? "" : val,
                  })
                }
                placeholder={queryState.regencyId ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu"}
                searchPlaceholder="Cari Kecamatan..."
                emptyText="Kecamatan tidak ditemukan."
                className={cn(dynamicFilterClassName, "disabled:cursor-not-allowed disabled:opacity-30")}
                contentClassName={dynamicFilterContentClassName}
              />
            </div>
          </form>
          {!isDirectoryLayout && (
            <p className="border-[var(--dc-border-subtle)] border-t pt-3 font-mono text-[10px] text-[var(--dc-text-secondary)] leading-relaxed">
              {scopeDescription}
            </p>
          )}
        </section>

        {/* Tactical Tabs Interface */}
        <Tabs defaultValue="daftar" className="space-y-4">
          {showTabNavigation ? (
            <TabsList
              className={cn(
                "h-11 w-full justify-start border p-1 md:w-auto",
                isDirectoryLayout
                  ? "rounded-xl border-slate-200/80 bg-card shadow-xs dark:border-white/10"
                  : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 dark:border-slate-800 dark:bg-[#080d14]/60",
              )}
            >
              <TabsTrigger
                value="daftar"
                className={cn(
                  "cursor-pointer border border-transparent px-6 text-[10px] uppercase tracking-wider transition-all hover:text-foreground",
                  isDirectoryLayout
                    ? "rounded-lg font-semibold text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
                    : "rounded-none font-mono text-[var(--dc-text-muted)] data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] dark:data-[state=active]:border-slate-800",
                )}
              >
                <List className="mr-2 size-3.5 text-[var(--dc-primary)]" />
                {config.tableTabLabel}
              </TabsTrigger>
              {showMapTab && (
                <TabsTrigger
                  value="peta"
                  className={cn(
                    "cursor-pointer border border-transparent px-6 text-[10px] uppercase tracking-wider transition-all hover:text-foreground",
                    isDirectoryLayout
                      ? "rounded-lg font-semibold text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
                      : "rounded-none font-mono text-[var(--dc-text-muted)] data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] dark:data-[state=active]:border-slate-800",
                  )}
                >
                  <MapIcon className="mr-2 size-3.5 text-[var(--dc-primary)]" />
                  {config.mapTabLabel}
                </TabsTrigger>
              )}
              {config.showExecutiveSummary && (
                <TabsTrigger
                  value="eksekutif"
                  className={cn(
                    "cursor-pointer border border-transparent px-6 text-[10px] uppercase tracking-wider transition-all hover:text-foreground",
                    isDirectoryLayout
                      ? "rounded-lg font-semibold text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
                      : "rounded-none font-mono text-[var(--dc-text-muted)] data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] dark:data-[state=active]:border-slate-800",
                  )}
                >
                  <BarChart3 className="mr-2 size-3.5 text-[var(--dc-primary)]" />
                  Deputi II
                </TabsTrigger>
              )}
            </TabsList>
          ) : null}

          {/* Database List Tab View */}
          <TabsContent value="daftar" className="space-y-4 outline-none">
            {/* Redesigned statistics indicators */}
            {!isDirectoryLayout && (
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label={config.totalPersonnelLabel} value={totalPersonnel} variant="cyan" />
                <KpiCard label={config.jaringKpiLabel} value={totalJaring} variant="cyan" />
                <KpiCard
                  label={config.onlineKpiLabel}
                  value={onlineCount}
                  progress={onlinePercentage}
                  variant="emerald"
                />
                <KpiCard
                  label={config.offlineKpiLabel}
                  value={offlineCount}
                  progress={offlinePercentage}
                  variant="amber"
                />
              </section>
            )}

            <div className="flex items-center justify-end gap-3">
              <span className="font-bold font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-[0.28em]">
                Tampilan
              </span>
              <ViewModeToggle
                value={viewMode}
                onValueChange={setViewMode}
                className={cn(
                  isDirectoryLayout
                    ? "rounded-lg border-border bg-card"
                    : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80",
                )}
                buttonClassName={cn("size-8", isDirectoryLayout ? "rounded-md" : "rounded-none")}
              />
            </div>

            {viewMode === "table" ? (
              <PersonnelTable
                items={paginatedItems}
                isPending={isPending}
                onReset={resetFilters}
                config={config}
                freshness={map.meta.freshness}
                queryState={queryState}
                sort={sort}
                onSortChange={handleSortChange}
              />
            ) : (
              <PersonnelCardGrid
                items={paginatedItems}
                isPending={isPending}
                onReset={resetFilters}
                config={config}
                freshness={map.meta.freshness}
              />
            )}

            {/* Pagination Controls bar */}
            <TablePagination
              page={safePage}
              limit={rowsPerPage}
              total={totalPersonnel}
              onPageChange={setPage}
              onLimitChange={(limit) => {
                setRowsPerPage(limit);
                setPage(1);
              }}
              className={cn(
                "px-6 py-3.5",
                isDirectoryLayout
                  ? "rounded-xl border border-slate-200/80 bg-card shadow-xs dark:border-white/10"
                  : "rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 dark:border-slate-800 dark:bg-[#080d14]/80",
              )}
            />
          </TabsContent>

          {/* Geospatial Map Tab View */}
          {showMapTab && (
            <TabsContent value="peta" className="space-y-4 outline-none">
              <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div
                  className={cn(
                    "relative h-[640px] overflow-hidden border bg-card",
                    isDirectoryLayout
                      ? "rounded-[18px] border-slate-200/80 shadow-xs dark:border-white/10"
                      : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/40 dark:border-slate-800",
                  )}
                >
                  {/* Border corner decorations for the map window */}
                  {!isDirectoryLayout && (
                    <>
                      <div className="pointer-events-none absolute top-0 left-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-t-2 border-l-2" />
                      <div className="pointer-events-none absolute top-0 right-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-t-2 border-r-2" />
                      <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-b-2 border-l-2" />
                      <div className="pointer-events-none absolute right-0 bottom-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-r-2 border-b-2" />
                    </>
                  )}

                  <Map center={[118, -2.5]} zoom={4.2} minZoom={3} maxZoom={15}>
                    <MapControls showZoom showCompass position="top-right" />
                    {map.features.map((feature) => (
                      <LocationMarker key={feature.id} feature={feature} config={config} />
                    ))}
                  </Map>
                </div>

                {/* Sidebar Legend and stats info */}
                <aside className="space-y-4">
                  <div
                    className={cn(
                      "relative select-none border bg-card p-4",
                      isDirectoryLayout
                        ? "rounded-xl border-slate-200/80 shadow-xs dark:border-white/10"
                        : "rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 dark:border-slate-800 dark:bg-[#080d14]/80",
                    )}
                  >
                    {!isDirectoryLayout && (
                      <>
                        <div className="absolute top-0 left-0 h-2.5 w-2.5 border-[var(--dc-border-subtle)] border-t border-l dark:border-slate-700" />
                        <div className="absolute top-0 right-0 h-2.5 w-2.5 border-[var(--dc-border-subtle)] border-t border-r dark:border-slate-700" />
                      </>
                    )}

                    <div className="mb-3 flex items-center gap-1.5 border-[var(--dc-border-subtle)] border-b pb-2 dark:border-slate-900">
                      <Layers className="size-3.5 text-[var(--dc-primary)]" />
                      <h2
                        className={cn(
                          "font-bold text-[10px] uppercase tracking-widest",
                          isDirectoryLayout ? "text-muted-foreground" : "font-mono text-[var(--dc-text-muted)]",
                        )}
                      >
                        {config.mapLegendTitle}
                      </h2>
                    </div>

                    <div className="space-y-3">
                      {map.meta.legend.map((item) => (
                        <div
                          key={item.code}
                          className="flex items-center gap-3 border-[var(--dc-border-subtle)] border-b pb-2 last:border-b-0 dark:border-slate-900/40"
                        >
                          <span
                            className="grid size-8 select-none place-items-center rounded-full border border-slate-800 font-bold text-[0.62rem] text-slate-950 shadow-[0_0_10px_rgba(20,184,255,0.15)]"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.code}
                          </span>
                          <div>
                            <p className="font-bold font-mono text-[var(--dc-text-primary)] text-xs">{item.label}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-[var(--dc-text-secondary)] leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </section>
            </TabsContent>
          )}

          {/* Tampilan tab ringkasan analitik Deputi II */}
          {config.showExecutiveSummary && (
            <TabsContent value="eksekutif" className="outline-none">
              <section className="relative rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-6 dark:border-slate-800 dark:bg-[#080d14]/70">
                <div className="absolute top-0 left-0 h-3.5 w-3.5 border-[var(--dc-primary)] border-t-2 border-l-2" />
                <div className="absolute top-0 right-0 h-3.5 w-3.5 border-[var(--dc-primary)] border-t-2 border-r-2" />
                <div className="absolute bottom-0 left-0 h-3.5 w-3.5 border-[var(--dc-primary)] border-b-2 border-l-2" />
                <div className="absolute right-0 bottom-0 h-3.5 w-3.5 border-[var(--dc-primary)] border-r-2 border-b-2" />

                <div className="mb-5 flex items-center gap-1.5 border-[var(--dc-border-subtle)] border-b pb-3 dark:border-slate-900">
                  <Activity className="size-4 text-[var(--dc-primary)]" />
                  <h2 className="font-bold font-mono text-[var(--dc-text-primary)] text-sm uppercase tracking-widest">
                    Ringkasan Analitik Deputi II
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <KpiCard
                    label="Total Petugas Wilayah"
                    value={map.meta.counts.totalFieldOfficers}
                    trend="Personel Aktif"
                    variant="cyan"
                  />
                  <KpiCard
                    label="Lokasi Aktif / Terbaru"
                    value={(map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0)}
                    trend="Cakupan Terhubung"
                    progress={
                      (((map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0)) /
                        (map.meta.counts.totalFieldOfficers || 1)) *
                      100
                    }
                    variant="emerald"
                  />
                  <KpiCard
                    label="Lokasi Lama / Tanpa Sinyal"
                    value={(map.meta.counts.byStatus.STALE ?? 0) + (map.meta.counts.byStatus.NO_SIGNAL ?? 0)}
                    trend="Sinyal Terputus"
                    progress={
                      (((map.meta.counts.byStatus.STALE ?? 0) + (map.meta.counts.byStatus.NO_SIGNAL ?? 0)) /
                        (map.meta.counts.totalFieldOfficers || 1)) *
                      100
                    }
                    variant="amber"
                  />
                </div>
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </main>
  );
}
