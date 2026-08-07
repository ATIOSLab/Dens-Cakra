"use client";

import { useMemo } from "react";

import { Activity, AlertCircle, MapPinCheck, RadioTower, ShieldCheck, Users } from "lucide-react";

import { cn } from "@/lib/utils";

import type { CoordinateSourceMode, JaringDistributionEntry } from "./sebaran-jaring-types";

type Props = {
  agents: JaringDistributionEntry[];
  regionLabel: string;
  coordinateSourceMode: CoordinateSourceMode;
  onShowPending: () => void;
  onShowAll: () => void;
};

function rate(value: number, total: number) {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

export function SebaranJaringLeadershipStrip({
  agents,
  regionLabel,
  coordinateSourceMode,
  onShowPending,
  onShowAll,
}: Props) {
  const summary = useMemo(() => {
    const verified = agents.filter((agent) => agent.status === "VERIFIED").length;
    const pending = agents.filter((agent) => agent.status === "PENDING").length;
    const active = agents.filter((agent) => agent.isActive).length;
    const reporting = agents.filter((agent) => agent.hasReport).length;
    const reportCount = agents.reduce((total, agent) => total + agent.reportCount, 0);
    const baketCount = agents.reduce((total, agent) => total + agent.baketCount, 0);
    const preciseCoordinates = agents.filter((agent) =>
      coordinateSourceMode === "laporan"
        ? agent.latestReportLat != null && agent.latestReportLng != null
        : agent.domicileCoordinateSource === "REGISTERED",
    ).length;
    const districtCounts = new Map<string, number>();
    for (const agent of agents) {
      if (agent.districtName && agent.districtName !== "-") {
        districtCounts.set(agent.districtName, (districtCounts.get(agent.districtName) ?? 0) + 1);
      }
    }
    const topDistrict = [...districtCounts.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;

    return {
      total: agents.length,
      verified,
      pending,
      active,
      reporting,
      reportCount,
      baketCount,
      preciseCoordinates,
      topDistrict,
    };
  }, [agents, coordinateSourceMode]);

  return (
    <section
      aria-label="Ringkasan situasi pimpinan"
      className="pointer-events-none absolute top-3 right-14 left-3 z-20 mx-auto max-w-5xl"
    >
      <div className="pointer-events-auto overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/88 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-slate-800 border-b px-3 py-2">
          <div className="min-w-0">
            <p className="font-mono text-[9px] text-cyan-400 uppercase tracking-[0.14em]">Pandangan Pimpinan</p>
            <p className="truncate font-semibold text-slate-100 text-xs">Situasi Jaring · {regionLabel}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-[9px] text-slate-400 md:inline">
              Sumber titik: {coordinateSourceMode === "laporan" ? "lokasi laporan aktual" : "penempatan Jaring"}
            </span>
            <button
              type="button"
              onClick={onShowAll}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-medium text-[9px] text-cyan-300 transition hover:border-cyan-500"
            >
              Buka daftar
            </button>
          </div>
        </div>

        <div className="grid auto-cols-[minmax(140px,1fr)] grid-flow-col divide-x divide-slate-800 overflow-x-auto sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:divide-y lg:grid-cols-6 lg:divide-y-0">
          <Metric
            icon={Users}
            label="Jaring Ditampilkan"
            value={summary.total}
            detail={`${summary.verified.toLocaleString("id-ID")} terverifikasi`}
          />
          <Metric
            icon={ShieldCheck}
            label="Tingkat Verifikasi"
            value={`${rate(summary.verified, summary.total)}%`}
            detail={`${summary.pending.toLocaleString("id-ID")} menunggu`}
            tone={summary.pending > 0 ? "amber" : "green"}
            onClick={summary.pending > 0 ? onShowPending : undefined}
          />
          <Metric
            icon={Activity}
            label="Jaring Aktif"
            value={summary.active}
            detail={`${rate(summary.active, summary.total)}% dari tampilan`}
            tone="green"
          />
          <Metric
            icon={RadioTower}
            label="Pernah Melapor"
            value={summary.reporting}
            detail={`${summary.reportCount.toLocaleString("id-ID")} laporan · ${summary.baketCount.toLocaleString("id-ID")} Baket`}
            tone="cyan"
          />
          <Metric
            icon={MapPinCheck}
            label="Koordinat Aktual"
            value={`${rate(summary.preciseCoordinates, summary.total)}%`}
            detail={`${summary.preciseCoordinates.toLocaleString("id-ID")} titik aktual`}
            tone={summary.preciseCoordinates === summary.total ? "green" : "amber"}
          />
          <Metric
            icon={AlertCircle}
            label="Wilayah Terpadat"
            value={summary.topDistrict?.[0] ?? "-"}
            detail={summary.topDistrict ? `${summary.topDistrict[1]} Jaring` : "Belum ada data"}
            compact
          />
        </div>
      </div>
    </section>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
  compact = false,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  detail: string;
  tone?: "default" | "cyan" | "green" | "amber";
  compact?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 uppercase tracking-[0.06em]">
        <Icon
          className={cn(
            "size-3",
            tone === "cyan" && "text-cyan-400",
            tone === "green" && "text-emerald-400",
            tone === "amber" && "text-amber-400",
          )}
          aria-hidden
        />
        <span className="truncate">{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 truncate font-bold font-mono text-base text-slate-100 tabular-nums",
          compact && "font-sans text-xs",
          tone === "cyan" && "text-cyan-300",
          tone === "green" && "text-emerald-300",
          tone === "amber" && "text-amber-300",
        )}
        title={String(value)}
      >
        {typeof value === "number" ? value.toLocaleString("id-ID") : value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-slate-500" title={detail}>
        {detail}
      </p>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="min-w-0 p-2.5 text-left transition hover:bg-slate-900/80">
      {content}
    </button>
  ) : (
    <div className="min-w-0 p-2.5">{content}</div>
  );
}
