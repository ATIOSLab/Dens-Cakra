"use client";

import { Activity, ArrowDownRight, ArrowUpRight, Gauge, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiSummaryProps {
  readonly score: number | null;
  readonly grade: string;
  readonly personnelCount: number;
  readonly evidence: {
    readonly reports: number;
    readonly tasks: number;
  };
}

export function KpiSummary({ score, grade, personnelCount, evidence }: KpiSummaryProps) {
  const formattedScore = score === null ? "N/A" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* CARD 1: KPI SCORE */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--dc-text-secondary)]">Skor Terukur</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]">
              <Gauge className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-mono text-3xl font-bold text-[var(--dc-text-primary)]">{formattedScore}</h3>
              <p className="mt-1 text-xs text-[var(--dc-text-muted)]">Skor KPI Agregat</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--dc-success)]">
              <ArrowUpRight className="size-3.5" />
              <span>+1.2%</span>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-primary)] opacity-40" />
      </Card>

      {/* CARD 2: GRADE */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--dc-text-secondary)]">Grade Kinerja</span>
            <span className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-white",
              grade === "A" || grade === "B" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            )}>
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className={cn(
                "font-mono text-3xl font-bold",
                grade === "A" || grade === "B" ? "text-emerald-500" : "text-amber-500"
              )}>{grade}</h3>
              <p className="mt-1 text-xs text-[var(--dc-text-muted)]">Kategori Evaluasi</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--dc-success)]">
              <ArrowUpRight className="size-3.5" />
              <span>Target A</span>
            </div>
          </div>
        </CardContent>
        <div className={cn(
          "absolute bottom-0 left-0 h-1 w-full opacity-40",
          grade === "A" || grade === "B" ? "bg-emerald-500" : "bg-amber-500"
        )} />
      </Card>

      {/* CARD 3: PERSONNEL COUNT */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--dc-text-secondary)]">Personel Dinilai</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-neutral)]/10 text-[var(--dc-neutral)]">
              <UserRoundCheck className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-mono text-3xl font-bold text-[var(--dc-text-primary)]">
                {personnelCount.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-xs text-[var(--dc-text-muted)]">Total Anggota Terdaftar</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--dc-success)]">
              <ArrowUpRight className="size-3.5" />
              <span>+24 baru</span>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-neutral)] opacity-40" />
      </Card>

      {/* CARD 4: EVIDENCE QUANTITY */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--dc-text-secondary)]">Bukti Laporan / Tugas</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]">
              <Activity className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-mono text-3xl font-bold text-[var(--dc-text-primary)]">
                {evidence.reports} <span className="text-sm font-normal text-[var(--dc-text-muted)]">/ {evidence.tasks}</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--dc-text-muted)]">Rasio Laporan terhadap UUK/STR</p>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[var(--dc-danger)]">
              <ArrowDownRight className="size-3.5" />
              <span>-4% Vol</span>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-warning)] opacity-40" />
      </Card>
    </div>
  );
}
