"use client";

import { useMemo } from "react";

import { ChevronRight, type LucideIcon, ShieldCheck, TrendingUp, TriangleAlert } from "lucide-react";

import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { MapNetworkFeature, MapNetworkFilters, MapNetworkResponse } from "./maps-intelijen-types";

type Props = {
  features: MapNetworkFeature[];
  meta: MapNetworkResponse["meta"];
  periodLabel: string;
  loading: boolean;
  onFilterChange: (patch: Partial<MapNetworkFilters>) => void;
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function MapsIntelijenLeadershipBrief({ features, meta, periodLabel, loading, onFilterChange }: Props) {
  const intelligence = useMemo(() => {
    const reportTotal = meta.summary.reports.total ?? meta.counts.report ?? 0;
    const baketTotal = meta.summary.bakets.total ?? 0;
    const total = reportTotal + baketTotal;
    const mappable = (meta.summary.reports.mappable ?? 0) + (meta.summary.bakets.mappable ?? 0);
    const outsideScope = features.filter(({ properties }) => properties.locationSuitability === "OUTSIDE_SCOPE").length;

    const areaCounts = new Map<string, number>();
    for (const feature of features) {
      const area = feature.properties.primaryArea?.name;
      if (area) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    }
    const topArea = [...areaCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;

    return {
      reportTotal,
      baketTotal,
      total,
      mappable,
      coordinateCoverage: percentage(mappable, total),
      outsideScope,
      topArea,
    };
  }, [features, meta]);

  return (
    <section
      aria-labelledby="map-leadership-brief-title"
      className="overflow-hidden rounded-md border border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="border-[var(--dc-divider)] p-4 lg:border-r lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="dc-eyebrow text-[0.68rem] text-[var(--dc-primary)] uppercase tracking-[0.1em]">
                Pandangan pimpinan
              </p>
              <h2 id="map-leadership-brief-title" className={cn(DC_TYPOGRAPHY.sectionTitle, "mt-1")}>
                Ringkasan Situasi Jaringan Intelijen
              </h2>
              <p className="mt-1 text-muted-foreground text-xs">
                Ikhtisar {periodLabel.toLowerCase()} berdasarkan filter dan cakupan akses aktif.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-medium text-[11px] text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="size-3.5" aria-hidden />
              {loading ? "Menyinkronkan" : "Data tersinkron"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric label="Laporan Jaring" value={intelligence.reportTotal} detail="Belum menjadi Baket" />
            <Metric label="Baket" value={intelligence.baketTotal} detail="Dari Laporan Jaring" tone="cyan" />
            <Metric
              label="Cakupan Koordinat"
              value={`${intelligence.coordinateCoverage}%`}
              detail={`${intelligence.mappable.toLocaleString("id-ID")} data dapat dipetakan`}
              tone={intelligence.coordinateCoverage >= 80 ? "green" : "amber"}
            />
            <Metric
              label="Wilayah Dominan"
              value={intelligence.topArea?.[0] ?? "-"}
              detail={intelligence.topArea ? `${intelligence.topArea[1]} titik terpetakan` : "Belum ada titik"}
              compact
            />
          </div>
        </div>

        <div className="border-[var(--dc-divider)] border-t bg-muted/20 p-4 lg:border-t-0 lg:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-sm">Perlu Perhatian</p>
              <p className="text-muted-foreground text-xs">Klik indikator untuk memfokuskan data terkait.</p>
            </div>
            <TrendingUp className="size-5 text-[var(--dc-primary)]" aria-hidden />
          </div>

          <div className="mt-3 grid gap-2">
            <AttentionButton
              icon={TriangleAlert}
              label="Titik di luar cakupan"
              value={intelligence.outsideScope}
              tone="amber"
              disabled={loading || intelligence.outsideScope === 0}
              onClick={() => {
                onFilterChange({
                  suitability: "OUTSIDE_SCOPE",
                  urgency: "ALL",
                });
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  tone = "default",
  compact = false,
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "default" | "cyan" | "green" | "amber";
  compact?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-background/70 p-3">
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-bold font-mono text-xl tabular-nums",
          compact && "font-sans text-sm",
          tone === "cyan" && "text-cyan-600 dark:text-cyan-300",
          tone === "green" && "text-emerald-600 dark:text-emerald-300",
          tone === "amber" && "text-amber-600 dark:text-amber-300",
        )}
        title={String(value)}
      >
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="mt-1 truncate text-[10px] text-muted-foreground" title={detail}>
        {detail}
      </p>
    </div>
  );
}

function AttentionButton({
  icon: Icon,
  label,
  value,
  tone,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: "amber" | "slate";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-md border bg-background/75 px-3 text-left transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transform-none",
        tone === "amber" && "border-amber-500/25",
        tone === "slate" && "border-slate-500/25",
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", tone === "amber" && "text-amber-500", tone === "slate" && "text-slate-500")}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-muted-foreground">{label}</span>
        <span className="block font-bold font-mono text-base tabular-nums">{value.toLocaleString("id-ID")}</span>
      </span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
    </button>
  );
}
