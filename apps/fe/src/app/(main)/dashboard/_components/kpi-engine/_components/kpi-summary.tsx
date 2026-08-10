"use client";

import { FileCheck2, ShieldCheck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

interface KpiSummaryProps {
  readonly score: number | null;
  readonly grade: string;
  readonly personnelCount: number;
  readonly evidence: {
    readonly reports: number;
    readonly jaringReports?: number;
    readonly jaring?: number;
    readonly activeJaring90Days?: number;
    readonly tasks: number;
    readonly baketAssessments?: number;
  };
}

export function KpiSummary({ score, grade, personnelCount, evidence }: KpiSummaryProps) {
  const formattedScore = score === null ? "N/A" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const totalEvidence = (evidence.jaringReports ?? 0) + evidence.tasks + (evidence.baketAssessments ?? 0);
  const PerformanceIcon = DOMAIN_VISUALS.performance.Icon;
  const GaswilIcon = DOMAIN_VISUALS.gaswil.Icon;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* CARD 1: KPI SCORE */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className={cn(DC_TYPOGRAPHY.tableHeader, "text-[var(--dc-text-secondary)]")}>
              Skor Terukur
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]">
              <PerformanceIcon className="size-4" aria-hidden />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-bold font-mono text-3xl text-[var(--dc-text-primary)]">{formattedScore}</h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Rerata indikator terukur</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-primary)] opacity-40" />
      </Card>

      {/* CARD 2: GRADE */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className={cn(DC_TYPOGRAPHY.tableHeader, "text-[var(--dc-text-secondary)]")}>
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
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Ambang skor agregat</p>
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
            <span className={cn(DC_TYPOGRAPHY.tableHeader, "text-[var(--dc-text-secondary)]")}>
              Personel Dinilai
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <GaswilIcon className="size-4" aria-hidden />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-bold font-mono text-3xl text-[var(--dc-text-primary)]">
                {personnelCount.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs">Dalam cakupan hak akses</p>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-neutral)] opacity-40" />
      </Card>

      {/* CARD 4: EVIDENCE QUANTITY */}
      <Card className="relative overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--dc-primary-soft)] hover:shadow-md">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <span className={cn(DC_TYPOGRAPHY.tableHeader, "text-[var(--dc-text-secondary)]")}>
              Bukti Penilaian
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]">
              <FileCheck2 className="size-4" aria-hidden />
            </span>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <h3 className="font-bold font-mono text-3xl text-[var(--dc-text-primary)]">
                {totalEvidence.toLocaleString("id-ID")}
              </h3>
              <p className="mt-1 text-[var(--dc-text-muted)] text-xs leading-5">
                {(evidence.jaringReports ?? 0).toLocaleString("id-ID")} Laporan Jaring +{" "}
                {evidence.tasks.toLocaleString("id-ID")} tugas +{" "}
                {(evidence.baketAssessments ?? 0).toLocaleString("id-ID")} penilaian Baket
              </p>
            </div>
          </div>
        </CardContent>
        <div className="absolute bottom-0 left-0 h-1 w-full bg-[var(--dc-warning)] opacity-40" />
      </Card>
    </div>
  );
}
