"use client";

import { Activity, AlertTriangle, ClockAlert, RadioTower, ShieldCheck, UsersRound } from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";

import { Badge } from "@/components/ui/badge";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import { formatDashboardDate, formatDashboardNumber, formatDashboardPercent } from "./executive-dashboard-format";
import type { ExecutiveDashboardData } from "./executive-dashboard-types";

const radarConfig = {
  value: {
    label: "Rasio",
    color: "#22d3ee",
  },
} satisfies ChartConfig;

function percentage(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1_000) / 10;
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function ExecutiveCommandPulse({ data }: { data: ExecutiveDashboardData }) {
  const verificationTotal = data.analytics.verification.reduce((sum, item) => sum + item.value, 0);
  const verifiedReports = data.analytics.verification.find((item) => item.key === "VERIFIED")?.value ?? 0;
  const urgentReports = data.analytics.urgency.find((item) => item.key === "URGENT")?.value ?? 0;
  const network = data.operations.networkSummary;
  const followUp = data.operations.followUp.summary;
  const activeFilterCount = Object.keys(data.appliedFilters).length;

  const operationalRatios = [
    { dimension: "Kelengkapan", value: clampPercentage(data.analytics.dataQuality.completenessRate) },
    { dimension: "Verifikasi", value: clampPercentage(percentage(verifiedReports, verificationTotal)) },
    { dimension: "Jaring Aktif", value: clampPercentage(percentage(network.active, network.total)) },
    { dimension: "Pelaporan", value: clampPercentage(percentage(network.reporting, network.total)) },
    { dimension: "Arahan Selesai", value: clampPercentage(percentage(followUp.completed, followUp.total)) },
  ];

  const signals = [
    {
      label: "Perhatian Pimpinan",
      value: data.overview.attention.length,
      description: "Item terurut berdasarkan tingkat perhatian",
      icon: AlertTriangle,
      tone: "warning",
      target: "leadership-attention",
    },
    {
      label: "Laporan Urgent",
      value: urgentReports,
      description: "Laporan dengan urgensi tertinggi",
      icon: RadioTower,
      tone: "danger",
      target: "priority-reports",
    },
    {
      label: "Lewat Tenggat",
      value: followUp.overdue,
      description: "Arahan atau tugas belum terselesaikan",
      icon: ClockAlert,
      tone: "danger",
      target: "follow-up-quality",
    },
    {
      label: "Jaring Tanpa Laporan",
      value: network.withoutReports,
      description: "Jaring tanpa aktivitas pada periode aktif",
      icon: UsersRound,
      tone: "neutral",
      target: "network-summary",
    },
  ] as const;

  return (
    <section
      aria-labelledby="command-pulse-heading"
      className="relative overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#06111f] text-slate-100 shadow-[0_22px_60px_rgba(2,8,23,0.24)]"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "linear-gradient(to bottom right, black, transparent 80%)",
        }}
      />
      <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-cyan-400/10 blur-[90px]" />

      <div className="relative grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border border-cyan-300/20 bg-cyan-300/10 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-cyan-200 hover:bg-cyan-300/10">
                  <Activity className="size-3.5" /> Situasi Operasional
                </Badge>
                {activeFilterCount > 0 ? (
                  <Badge className="border border-amber-300/20 bg-amber-300/10 text-amber-200 hover:bg-amber-300/10">
                    {activeFilterCount} filter diterapkan
                  </Badge>
                ) : null}
              </div>
              <h2 id="command-pulse-heading" className="mt-3 text-xl font-bold tracking-tight sm:text-2xl">
                Sinyal prioritas dalam cakupan aktif
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                Seluruh indikator berasal dari agregasi laporan, Jaring, dan tindak lanjut pada filter yang sedang
                aktif.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.07] px-3 py-1.5 text-[0.68rem] text-emerald-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
              Data {formatDashboardDate(data.generatedAt)}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {signals.map(({ label, value, description, icon: Icon, tone, target }) => (
              <button
                key={label}
                type="button"
                onClick={() => scrollToSection(target)}
                className="group flex min-h-28 items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-4 text-left transition-[border-color,background-color,transform] hover:-translate-y-0.5 hover:border-cyan-300/25 hover:bg-cyan-300/[0.055] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/45 motion-reduce:hover:translate-y-0"
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg border",
                    tone === "danger" && "border-red-300/20 bg-red-400/10 text-red-300",
                    tone === "warning" && "border-amber-300/20 bg-amber-400/10 text-amber-300",
                    tone === "neutral" && "border-slate-300/15 bg-slate-300/[0.07] text-slate-300",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-300">{label}</span>
                    <strong className="font-mono text-2xl tabular-nums text-white">
                      {formatDashboardNumber(value)}
                    </strong>
                  </span>
                  <span className="mt-2 block text-[0.68rem] leading-4 text-slate-500">{description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-slate-950/25 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-cyan-300">Profil Rasio</p>
              <h3 className="mt-1 text-sm font-semibold">Kesiapan Operasional</h3>
            </div>
            <ShieldCheck className="size-5 text-emerald-300" />
          </div>
          <ChartContainer config={radarConfig} className="mx-auto mt-2 h-64 w-full max-w-[340px]">
            <RadarChart data={operationalRatios} outerRadius="70%">
              <PolarGrid stroke="rgba(148,163,184,0.2)" />
              <PolarAngleAxis dataKey="dimension" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => (
                      <div className="flex min-w-36 items-center justify-between gap-4">
                        <span>{String(item.payload.dimension)}</span>
                        <strong>{formatDashboardPercent(Number(value))}</strong>
                      </div>
                    )}
                  />
                }
              />
              <Radar
                dataKey="value"
                fill="var(--color-value)"
                fillOpacity={0.22}
                stroke="var(--color-value)"
                strokeWidth={2}
              />
            </RadarChart>
          </ChartContainer>
          <p className="text-center text-[0.65rem] leading-4 text-slate-500">
            Setiap sumbu adalah rasio mandiri dari data aktual, bukan skor gabungan buatan.
          </p>
        </div>
      </div>
    </section>
  );
}
