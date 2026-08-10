"use client";

import { useMemo } from "react";

import { AlertTriangle, ShieldCheck, TrendingUp, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  MapNetworkFeature,
  MapNetworkFilters,
  MapNetworkResponse,
  SummaryCardFilter,
} from "./maps-intelijen-types";

type Props = {
  features: MapNetworkFeature[];
  meta: MapNetworkResponse["meta"];
  periodLabel: string;
  loading: boolean;
  onFilterChange: (patch: Partial<MapNetworkFilters>) => void;
  onCardFilterChange: (filter: SummaryCardFilter) => void;
};

function percentage(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function MapsIntelijenLeadershipBrief({
  features,
  meta,
  periodLabel,
  loading,
  onFilterChange,
  onCardFilterChange,
}: Props) {
  const intelligence = useMemo(() => {
    const reportTotal = meta.summary.reports.total ?? meta.counts.report ?? 0;
    const baketTotal = meta.summary.bakets.total ?? 0;
    const agentTotal = meta.counts.agent ?? 0;
    const total = reportTotal + baketTotal + agentTotal;
    const mappable = (meta.summary.reports.mappable ?? 0) + (meta.summary.bakets.mappable ?? 0) + agentTotal;
    const urgent = features.filter(({ properties }) => properties.urgency === "URGENT").length;
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
      agentTotal,
      total,
      mappable,
      coordinateCoverage: percentage(mappable, total),
      urgent,
      outsideScope,
      topArea,
    };
  }, [features, meta]);

  return (
    <section
      aria-labelledby="map-leadership-brief-title"
      className="overflow-hidden rounded-2xl border border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]"
    >
      <div className="grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="border-[var(--dc-divider)] p-4 lg:border-r lg:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="dc-eyebrow text-[0.68rem] text-[var(--dc-primary)] uppercase tracking-[0.1em]">
                Pandangan pimpinan
              </p>
              <h2 id="map-leadership-brief-title" className="mt-1 font-semibold text-lg tracking-tight">
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

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Metric label="Laporan Jaring" value={intelligence.reportTotal} detail="Belum menjadi Baket" />
            <Metric label="Baket" value={intelligence.baketTotal} detail="Dari Laporan Jaring" tone="cyan" />
            <Metric label="Personel" value={intelligence.agentTotal} detail="Lokasi termuat" tone="cyan" />
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

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <AttentionButton
              icon={AlertTriangle}
              label="Titik mendesak"
              value={intelligence.urgent}
              tone="red"
              disabled={loading}
              onClick={() => {
                onCardFilterChange("ALL");
                onFilterChange({
                  dataType: "ALL",
                  urgency: "URGENT",
                });
              }}
            />
            <AttentionButton
              icon={UserRoundCheck}
              label="Personel aktif"
              value={meta.counts.activeAgents}
              tone="amber"
              disabled={loading}
              onClick={() => {
                onCardFilterChange("ALL");
                onFilterChange({
                  dataType: "AGENT",
                  agentState: "active",
                  urgency: "ALL",
                });
              }}
            />
          </div>

          {intelligence.outsideScope > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 h-8 w-full justify-between text-amber-700 text-xs dark:text-amber-300"
              onClick={() => onFilterChange({ suitability: "OUTSIDE_SCOPE" })}
            >
              <span>{intelligence.outsideScope.toLocaleString("id-ID")} titik di luar cakupan penempatan</span>
              <span aria-hidden>→</span>
            </Button>
          ) : null}
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
    <div className="min-w-0 rounded-xl border bg-background/70 p-3">
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
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: "red" | "amber" | "slate";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-14 items-center gap-3 rounded-xl border bg-background/75 px-3 text-left transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 motion-reduce:transform-none",
        tone === "red" && "border-red-500/25",
        tone === "amber" && "border-amber-500/25",
        tone === "slate" && "border-slate-500/25",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          tone === "red" && "text-red-500",
          tone === "amber" && "text-amber-500",
          tone === "slate" && "text-slate-500",
        )}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] text-muted-foreground">{label}</span>
        <span className="block font-bold font-mono text-base tabular-nums">{value.toLocaleString("id-ID")}</span>
      </span>
      <span className="text-muted-foreground text-xs" aria-hidden>
        →
      </span>
    </button>
  );
}
