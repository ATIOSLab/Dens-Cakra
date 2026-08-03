"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { motion } from "framer-motion";
import { Activity, BarChart3, Eye, Layers, List, Map as MapIcon, Search, ShieldAlert } from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Button } from "@/components/ui/button";
// biome-ignore lint/suspicious/noShadowRestrictedNames: Map component shadow
import { Map, MapControls, MapMarker, MapMarkerPopup } from "@/components/ui/map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  PersonnelListItem,
  PersonnelListProps,
  PersonnelListQueryState,
  PersonnelMapFeature,
  PersonnelMapPayload,
} from "./executive-personnel-types";

type PersonnelPageConfig = NonNullable<PersonnelListProps["pageConfig"]>;

const DEFAULT_PAGE_CONFIG: PersonnelPageConfig = {
  basePath: "/dashboard/executive/personil",
  title: "Daftar Personel",
  description:
    "Konsolidasi personel nasional dari user aktif, jabatan, wilayah penugasan, lokasi petugas organik, laporan, dan aktivitas operasional.",
  tableTabLabel: "DAFTAR PERSONIL",
  mapTabLabel: "PETA NASIONAL",
  detailTarget: "userProfile",
  showExecutiveSummary: true,
  showProvinceFilter: true,
};

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
  const lastLocation = item.lastLocation || item.assignment?.lastLocation;
  if (!lastLocation || !lastLocation.capturedAt) return false;

  const activeWithinMinutes = freshness?.activeWithinMinutes ?? 30;
  const recentWithinHours = freshness?.recentWithinHours ?? 24;

  const ageMs = Date.now() - new Date(lastLocation.capturedAt).getTime();
  return ageMs <= recentWithinHours * 3_600_000;
}

function primaryArea(item: PersonnelListItem) {
  const areas = item.assignment ? item.assignment.areas : [];
  return areas.find((area) => area.isPrimary) ?? areas[0] ?? null;
}

function statusClass(status: string) {
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

function getStatusDotColor(status: string) {
  if (status === "ACTIVE") return "bg-emerald-500 dark:bg-emerald-400 animate-pulse";
  if (status === "SUSPENDED") return "bg-red-500 dark:bg-red-450";
  if (status === "ARCHIVED") return "bg-slate-500 dark:bg-slate-400";
  return "bg-amber-500 dark:bg-amber-400";
}

function personnelStatusLabel(status: string) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "SUSPENDED") return "Ditangguhkan";
  if (status === "ARCHIVED") return "Diarsipkan";
  if (status === "PENDING") return "Menunggu";
  return status;
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
      {progress !== undefined && (
        <div className="mt-4 space-y-1">
          <div className="h-[3px] w-full overflow-hidden border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] dark:border-slate-900 dark:bg-slate-950">
            <motion.div
              className={cn("h-full", barColor)}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function TableSkeleton() {
  const skeletonRows = ["one", "two", "three", "four", "five"];

  return (
    <div className="overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/40 dark:border-slate-800 dark:bg-[#080d14]/40">
      <Table>
        <TableHeader className="border-[var(--dc-border-subtle)] border-b bg-[var(--dc-surface-raised)] dark:border-slate-850 dark:bg-slate-950/80">
          <TableRow className="border-[var(--dc-border-subtle)] border-b hover:bg-transparent dark:border-slate-800">
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              Personel
            </TableHead>
            <TableHead className="h-10 text-center font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">
              Wilayah
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RadarEmptyState({ onReset }: { onReset?: () => void }) {
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
        Tidak ada personel aktif
      </h3>
      <p className="mt-2 max-w-md font-mono text-[11px] text-[var(--dc-text-secondary)] leading-relaxed">
        Pencarian tidak menemukan sinyal personel yang cocok dengan parameter kueri yang ditentukan. Silakan setel ulang
        filter.
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

function PersonnelTable({
  items,
  isPending,
  onReset,
  config,
  freshness,
}: {
  items: PersonnelListItem[];
  isPending: boolean;
  onReset?: () => void;
  config: PersonnelPageConfig;
  freshness?: PersonnelMapPayload["meta"]["freshness"];
}) {
  if (isPending) {
    return <TableSkeleton />;
  }

  if (!items.length) {
    return <RadarEmptyState onReset={onReset} />;
  }

  return (
    <div className="select-none overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 dark:border-slate-800 dark:bg-[#080d14]/70">
      <Table>
        <TableHeader className="sticky top-0 z-10 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-surface-raised)] dark:border-slate-850 dark:bg-slate-950/90">
          <TableRow className="border-[var(--dc-border-subtle)] border-b hover:bg-transparent dark:border-slate-800">
            <TableHead className="h-11 text-center font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider">
              Personel
            </TableHead>
            <TableHead className="h-11 text-center font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider">
              Wilayah
            </TableHead>
            <TableHead className="h-11 text-center font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="h-11 text-center font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider">
              Akses
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const area = primaryArea(item);
            const detailHref = personnelDetailHref(item, config);
            return (
              <TableRow
                key={item.id}
                className="group relative border-[var(--dc-border-subtle)] border-b transition-colors hover:bg-[var(--dc-primary-soft)]/20 dark:border-slate-900"
              >
                {/* Left Cyan Indicator on Hover */}
                <TableCell className="relative py-3.5 text-center">
                  <div className="absolute top-0 bottom-0 left-0 w-[2.5px] bg-[var(--dc-primary)] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  <Link href={detailHref} className="block min-w-56">
                    <span className="block font-bold font-mono text-foreground text-xs transition-colors group-hover:text-[var(--dc-primary)]">
                      {item.fullName ?? item.username ?? item.email}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10px] text-[var(--dc-text-secondary)]">
                      {item.email}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-center">
                  <span className="block max-w-56 mx-auto truncate font-mono text-[var(--dc-text-primary)] text-xs">
                    {area?.name ?? "-"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  {(() => {
                    const online = isPersonnelOnline(item, freshness);
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 font-mono font-semibold text-[9px] uppercase tracking-wider",
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
                        {online ? "Online" : "Offline"}
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
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
  config: PersonnelPageConfig;
  freshness?: PersonnelMapPayload["meta"]["freshness"];
}) {
  if (isPending) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {["one", "two", "three", "four", "five", "six"].map((rowId) => (
          <div
            key={`personnel-card-skeleton-${rowId}`}
            className="h-40 animate-pulse rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 dark:border-slate-800"
          />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return <RadarEmptyState onReset={onReset} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const area = primaryArea(item);
        const detailHref = personnelDetailHref(item, config);
        const online = isPersonnelOnline(item, freshness);

        return (
          <Link
            key={item.id}
            href={detailHref}
            className="group relative min-w-0 overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--dc-primary)]/50 hover:bg-[var(--dc-primary-soft)]/10 dark:border-slate-800 dark:bg-[#080d14]/70"
          >
            <div className="absolute top-0 left-0 h-full w-[3px] bg-[var(--dc-primary)] opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-bold font-mono text-foreground text-xs group-hover:text-[var(--dc-primary)]">
                  {item.fullName ?? item.username ?? item.email}
                </h3>
                <p className="mt-1 truncate font-mono text-[10px] text-[var(--dc-text-secondary)]">{item.email}</p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-none border px-2 py-0.5 font-mono font-semibold text-[9px] uppercase tracking-wider",
                  online
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20"
                    : "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20",
                )}
              >
                <span
                  className={cn("size-1 rounded-full", online ? "animate-pulse bg-emerald-500" : "bg-slate-500")}
                />
                {online ? "Online" : "Offline"}
              </span>
            </div>

            <div className="mt-4 space-y-2 border-[var(--dc-border-subtle)] border-t pt-3 font-mono text-[10px] text-[var(--dc-text-secondary)]">
              <div>
                <span className="block text-[var(--dc-text-muted)] uppercase">Jabatan</span>
                <span className="block truncate text-[var(--dc-text-primary)]">{item.assignment?.title ?? "-"}</span>
              </div>
              <div>
                <span className="block text-[var(--dc-text-muted)] uppercase">Wilayah</span>
                <span className="block truncate text-[var(--dc-text-primary)]">{area?.name ?? "-"}</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-4 h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
            >
              <Eye className="size-3.5" />
              Detail
            </Button>
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
  const config = { ...DEFAULT_PAGE_CONFIG, ...pageConfig };
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [_systemClock, setSystemClock] = useState("SYNCING...");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");

  const totalPersonnel = items.length;
  const onlineCount = (map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0);
  const noSignalCount = map.meta.counts.byStatus.NO_SIGNAL ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalPersonnel / rowsPerPage));
  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    return items.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  }, [items, safePage, rowsPerPage]);

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
      router.push(`${config.basePath}?page=1&limit=20`);
    });
  };

  useEffect(() => {
    setSystemClock(formatSystemClock(new Date()));

    const intervalId = window.setInterval(() => {
      setSystemClock(formatSystemClock(new Date()));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  // KPI Calculations
  const onlinePercentage = (onlineCount / (totalPersonnel || 1)) * 100;
  const offlinePercentage = (noSignalCount / (totalPersonnel || 1)) * 100;

  return (
    <main className="relative min-h-screen space-y-6 p-6">
      {/* Dynamic Command Center Background Grid and Scanning Line */}
      <TacticalBackground />

      <div className="relative z-10 space-y-6 text-foreground">
        {/* Command Center Title Header */}
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

        {/* Grouped Filter Panel Section */}
        <section className="space-y-3 rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 p-4 dark:border-slate-800 dark:bg-[#080d14]/60">
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
                  placeholder="Cari nama, jabatan, unit..."
                  className="h-10 w-full rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-canvas)] pr-3 pl-9 font-mono text-foreground text-xs outline-none transition-all placeholder:text-[var(--dc-text-muted)] focus:border-[var(--dc-primary)] focus:shadow-[0_0_8px_color-mix(in_srgb,var(--dc-primary)_15%,transparent)] focus:ring-1 focus:ring-[var(--dc-primary)]/20 dark:border-slate-800 dark:bg-slate-950/80"
                />
              </div>
            </div>

            {config.showProvinceFilter && (
              <div className="space-y-1.5">
                <div className="font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">
                  PROVINSI
                </div>
                <Select
                  name="provinceId"
                  value={queryState.provinceId || "ALL"}
                  onValueChange={(val) =>
                    applyFilter({
                      provinceId: val === "ALL" ? "" : val,
                      regencyId: "",
                      districtId: "",
                    })
                  }
                >
                  <SelectTrigger className="h-10 w-full rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-canvas)] px-3 font-mono text-foreground text-xs outline-none transition-all focus:border-[var(--dc-primary)] focus:shadow-[0_0_8px_color-mix(in_srgb,var(--dc-primary)_15%,transparent)] focus:ring-1 focus:ring-[var(--dc-primary)]/20 dark:border-slate-800 dark:bg-slate-950/80">
                    <SelectValue placeholder="Semua provinsi" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    className="relative z-50 max-h-[300px] select-none overflow-y-auto rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)] font-mono text-foreground text-xs"
                  >
                    <SelectItem value="ALL">Semua provinsi</SelectItem>
                    {areaFilters.provinces.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Regency selection */}
            <div className="space-y-1.5">
              <div className="font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">
                KABUPATEN / KOTA
              </div>
              <Select
                name="regencyId"
                value={queryState.regencyId || "ALL"}
                disabled={config.showProvinceFilter ? !queryState.provinceId : false}
                onValueChange={(val) =>
                  applyFilter({
                    regencyId: val === "ALL" ? "" : val,
                    districtId: "",
                  })
                }
              >
                <SelectTrigger className="h-10 w-full rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-canvas)] px-3 font-mono text-foreground text-xs outline-none transition-all focus:border-[var(--dc-primary)] focus:shadow-[0_0_8px_color-mix(in_srgb,var(--dc-primary)_15%,transparent)] focus:ring-1 focus:ring-[var(--dc-primary)]/20 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950/80">
                  <SelectValue placeholder="Semua kab/kota" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  className="relative z-50 max-h-[300px] select-none overflow-y-auto rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)] font-mono text-foreground text-xs"
                >
                  <SelectItem value="ALL">Semua kab/kota</SelectItem>
                  {areaFilters.regencies.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* District selection */}
            <div className="space-y-1.5">
              <div className="font-mono text-[9px] text-[var(--dc-text-muted)] uppercase tracking-wider">KECAMATAN</div>
              <Select
                name="districtId"
                value={queryState.districtId || "ALL"}
                disabled={!queryState.regencyId}
                onValueChange={(val) =>
                  applyFilter({
                    districtId: val === "ALL" ? "" : val,
                  })
                }
              >
                <SelectTrigger className="h-10 w-full rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-canvas)] px-3 font-mono text-foreground text-xs outline-none transition-all focus:border-[var(--dc-primary)] focus:shadow-[0_0_8px_color-mix(in_srgb,var(--dc-primary)_15%,transparent)] focus:ring-1 focus:ring-[var(--dc-primary)]/20 disabled:cursor-not-allowed disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950/80">
                  <SelectValue placeholder="Semua kecamatan" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  side="bottom"
                  className="relative z-50 max-h-[300px] select-none overflow-y-auto rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)] font-mono text-foreground text-xs"
                >
                  <SelectItem value="ALL">Semua kecamatan</SelectItem>
                  {areaFilters.districts.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </section>

        {/* Tactical Tabs Interface */}
        <Tabs defaultValue="daftar" className="space-y-4">
          <TabsList className="h-11 w-full justify-start rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/50 p-1 md:w-auto dark:border-slate-800 dark:bg-[#080d14]/60">
            <TabsTrigger
              value="daftar"
              className="cursor-pointer rounded-none border border-transparent px-6 font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider transition-all hover:text-foreground data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] dark:data-[state=active]:border-slate-800"
            >
              <List className="mr-2 size-3.5 text-[var(--dc-primary)]" />
              {config.tableTabLabel}
            </TabsTrigger>
            <TabsTrigger
              value="peta"
              className="cursor-pointer rounded-none border border-transparent px-6 font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider transition-all hover:text-foreground data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] dark:data-[state=active]:border-slate-800"
            >
              <MapIcon className="mr-2 size-3.5 text-[var(--dc-primary)]" />
              {config.mapTabLabel}
            </TabsTrigger>
            {config.showExecutiveSummary && (
              <TabsTrigger
                value="eksekutif"
                className="cursor-pointer rounded-none border border-transparent px-6 font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider transition-all hover:text-foreground data-[state=active]:border-[var(--dc-border)] data-[state=active]:bg-[var(--dc-primary-soft)] data-[state=active]:text-[var(--dc-primary)] dark:data-[state=active]:border-slate-800"
              >
                <BarChart3 className="mr-2 size-3.5 text-[var(--dc-primary)]" />
                EXECUTIVE
              </TabsTrigger>
            )}
          </TabsList>

          {/* Database List Tab View */}
          <TabsContent value="daftar" className="space-y-4 outline-none">
            {/* Redesigned statistics indicators */}
            <section className="grid gap-4 md:grid-cols-3">
              <KpiCard label="Total Personel" value={totalPersonnel} progress={100} variant="cyan" />
              <KpiCard label="Aktif / Online" value={onlineCount} progress={onlinePercentage} variant="emerald" />
              <KpiCard label="Tanpa Sinyal" value={noSignalCount} progress={offlinePercentage} variant="amber" />
            </section>

            <div className="flex items-center justify-end gap-3">
              <span className="font-bold font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-[0.28em]">
                Tampilan
              </span>
              <ViewModeToggle
                value={viewMode}
                onValueChange={setViewMode}
                className="rounded-none border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80"
                buttonClassName="size-8 rounded-none"
              />
            </div>

            {viewMode === "table" ? (
              <PersonnelTable
                items={paginatedItems}
                isPending={isPending}
                onReset={resetFilters}
                config={config}
                freshness={map.meta.freshness}
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
              className="rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 px-6 py-3.5 dark:border-slate-800 dark:bg-[#080d14]/80"
            />
          </TabsContent>

          {/* Geospatial Map Tab View */}
          <TabsContent value="peta" className="space-y-4 outline-none">
            <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="relative h-[640px] overflow-hidden rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/40 dark:border-slate-800">
                {/* Border corner decorations for the map window */}
                <div className="pointer-events-none absolute top-0 left-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-t-2 border-l-2" />
                <div className="pointer-events-none absolute top-0 right-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-t-2 border-r-2" />
                <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-b-2 border-l-2" />
                <div className="pointer-events-none absolute right-0 bottom-0 z-10 h-3 w-3 border-[var(--dc-primary)] border-r-2 border-b-2" />

                <Map center={[118, -2.5]} zoom={4.2} minZoom={3} maxZoom={15}>
                  <MapControls showZoom showCompass position="top-right" />
                  {map.features.map((feature) => (
                    <LocationMarker key={feature.id} feature={feature} config={config} />
                  ))}
                </Map>
              </div>

              {/* Sidebar Legend and stats info */}
              <aside className="space-y-4">
                <div className="relative select-none rounded-none border border-[var(--dc-border-subtle)] bg-[var(--dc-card)]/80 p-4 dark:border-slate-800 dark:bg-[#080d14]/80">
                  <div className="absolute top-0 left-0 h-2.5 w-2.5 border-[var(--dc-border-subtle)] border-t border-l dark:border-slate-700" />
                  <div className="absolute top-0 right-0 h-2.5 w-2.5 border-[var(--dc-border-subtle)] border-t border-r dark:border-slate-700" />

                  <div className="mb-3 flex items-center gap-1.5 border-[var(--dc-border-subtle)] border-b pb-2 dark:border-slate-900">
                    <Layers className="size-3.5 text-[var(--dc-primary)]" />
                    <h2 className="font-bold font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-widest">
                      Keterangan Marker
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

          {/* Executive Summary Analytics Tab View */}
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
                    Ringkasan Eksekutif Analitik
                  </h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <KpiCard
                    label="Total Petugas Lapangan"
                    value={map.meta.counts.totalFieldOfficers}
                    trend="Agen Aktif"
                    progress={100}
                    variant="cyan"
                  />
                  <KpiCard
                    label="Lokasi Live / Recent"
                    value={(map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0)}
                    trend="Cakupan Online"
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
