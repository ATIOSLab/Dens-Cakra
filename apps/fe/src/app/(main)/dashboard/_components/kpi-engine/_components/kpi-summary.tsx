"use client";

import { Activity, Gauge, ShieldCheck, UserRoundCheck } from "lucide-react";

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
            <span className="font-semibold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
              Skor Terukur
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]">
              <Gauge className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-bold font-mono text-3xl text-[var(--dc-text-primary)]">{formattedScore}</h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Skor KPI Agregat</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-primary)] opacity-40" />
      </Card>

      {/* CARD 2: GRADE */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
              Grade Kinerja
            </span>
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-white",
                grade === "A" || grade === "B"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500",
              )}
            >
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3
                className={cn(
                  "font-bold font-mono text-3xl",
                  grade === "A" || grade === "B" ? "text-emerald-500" : "text-amber-500",
                )}
              >
                {grade}
              </h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Kategori Evaluasi</p>
            </div>
          </div>
        </CardContent>
        <div
          className={cn(
            "absolute bottom-0 left-0 h-1 w-full opacity-40",
            grade === "A" || grade === "B" ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
      </Card>

      {/* CARD 3: PERSONNEL COUNT */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
              Personel Dinilai
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-neutral)]/10 text-[var(--dc-neutral)]">
              <UserRoundCheck className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-bold font-mono text-3xl text-[var(--dc-text-primary)]">
                {personnelCount.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Total Anggota Terdaftar</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-neutral)] opacity-40" />
      </Card>

      {/* CARD 4: EVIDENCE QUANTITY */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--dc-text-secondary)] text-xs uppercase tracking-wider">
              Bukti Laporan / Tugas
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]">
              <Activity className="size-4" />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-bold font-mono text-3xl text-[var(--dc-text-primary)]">
                {evidence.reports}{" "}
                <span className="font-normal text-[var(--dc-text-muted)] text-sm">/ {evidence.tasks}</span>
              </h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Rasio Laporan terhadap UUK/STR</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-warning)] opacity-40" />
      </Card>
    </div>
  );
}
