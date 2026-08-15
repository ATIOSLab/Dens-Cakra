"use client";

import { Calculator, ClipboardCheck, FileBarChart, Gauge } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type KpiFormulaDefinition = {
  readonly code: string;
  readonly name: string;
  readonly evidence: string;
  readonly formula: string;
};

type KpiFormulaIndicator = {
  readonly code: string;
  readonly score: number | null;
  readonly sample: number;
};

type KpiFormulaEvidence = {
  readonly jaringReports?: number;
  readonly jaring?: number;
  readonly activeJaring90Days?: number;
  readonly tasks: number;
  readonly baketAssessments?: number;
  readonly measuredIndicators?: number;
};

type KpiFormulaGuideProps = {
  readonly definitions: readonly KpiFormulaDefinition[];
  readonly indicators: readonly KpiFormulaIndicator[];
  readonly evidence: KpiFormulaEvidence;
};

const gradeRules = [
  { label: "A", detail: "Skor agregat >= 90" },
  { label: "B", detail: "Skor agregat >= 80" },
  { label: "C", detail: "Skor agregat >= 70" },
  { label: "D", detail: "Skor agregat < 70" },
];

function formatScore(value: number | null) {
  return value === null ? "-" : value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

function getIndicatorStatus(score: number | null) {
  if (score === null) return { label: "Belum Cukup Bukti", className: "text-[var(--dc-text-muted)]" };
  if (score >= 95) return { label: "Sangat Baik", className: "text-emerald-500" };
  if (score >= 90) return { label: "Target Tercapai", className: "text-emerald-500" };
  if (score >= 80) return { label: "Optimal", className: "text-[var(--dc-primary)]" };
  if (score >= 70) return { label: "Cukup", className: "text-[var(--dc-warning)]" };
  return { label: "Perlu Pembinaan", className: "text-[var(--dc-danger)]" };
}

export function KpiFormulaGuide({ definitions, indicators, evidence }: KpiFormulaGuideProps) {
  const indicatorByCode = new Map(indicators.map((indicator) => [indicator.code, indicator]));
  const measuredIndicators =
    evidence.measuredIndicators ?? indicators.filter((indicator) => indicator.score !== null).length;
  const totalJaring = evidence.jaring ?? 0;
  const activeJaring = evidence.activeJaring90Days ?? 0;
  const jaringReports = evidence.jaringReports ?? 0;
  const baketAssessments = evidence.baketAssessments ?? 0;
  const totalEvidence = jaringReports + evidence.tasks + baketAssessments;

  return (
    <section className="space-y-3" aria-labelledby="kpi-formula-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="dc-eyebrow text-[0.68rem] text-[var(--dc-primary)] uppercase tracking-[0.1em]">
            Metodologi penilaian
          </p>
          <h2 id="kpi-formula-title" className={cn(DC_TYPOGRAPHY.sectionTitle, "mt-1")}>
            Rumus Penilaian KPI
          </h2>
        </div>
        <Badge
          variant="outline"
          className="border-[var(--dc-border-strong)] bg-[var(--dc-surface-raised)] px-2.5 py-1 font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider"
        >
          {measuredIndicators.toLocaleString("id-ID")} indikator terukur
        </Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormulaPrinciple
                icon={Gauge}
                label="Skala skor"
                value="0-100"
                detail="Setiap indikator dihitung pada skala 0 sampai 100."
                tone="primary"
              />
              <FormulaPrinciple
                icon={Calculator}
                label="Skor agregat"
                value="Rerata"
                detail="Rata-rata seluruh indikator yang memiliki bukti terukur."
                tone="emerald"
              />
              <FormulaPrinciple
                icon={FileBarChart}
                label="Grade"
                value="A-D"
                detail="Grade ditentukan dari skor agregat sesuai ambang penilaian."
                tone="amber"
              />
              <FormulaPrinciple
                icon={ClipboardCheck}
                label="Bukti Penilaian"
                value={totalEvidence.toLocaleString("id-ID")}
                detail="Laporan Jaring, tugas, dan penilaian Baket yang masuk rumus."
                tone="slate"
              />
            </div>

            <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-muted)] p-3">
              <p className="font-semibold text-[var(--dc-text-primary)] text-xs">Aturan grade</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {gradeRules.map((rule) => (
                  <div key={rule.label} className="flex items-center gap-2 text-xs">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--dc-border-subtle)] bg-background font-bold font-mono text-[var(--dc-text-primary)]">
                      {rule.label}
                    </span>
                    <span className="text-[var(--dc-text-secondary)]">{rule.detail}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[var(--dc-text-muted)] text-[11px] leading-relaxed">
                Jika belum ada indikator dengan bukti terukur, skor dan grade ditampilkan sebagai N/A. Aktivitas Jaring
                memakai jendela 90 hari sampai akhir periode evaluasi.
              </p>
              {totalJaring > 0 ? (
                <p className="mt-2 text-[var(--dc-text-muted)] text-[11px]">
                  Jaring Aktif 90 Hari: {activeJaring.toLocaleString("id-ID")} dari{" "}
                  {totalJaring.toLocaleString("id-ID")} Jaring dalam cakupan.
                </p>
              ) : null}
              <div className="mt-3 grid gap-2 border-[var(--dc-divider)] border-t pt-3 sm:grid-cols-3">
                <EvidenceItem label="Laporan Jaring" value={jaringReports} />
                <EvidenceItem label="Tugas" value={evidence.tasks} />
                <EvidenceItem label="Penilaian Baket" value={baketAssessments} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
          <CardContent className="p-4">
            <div className="grid gap-2">
              {definitions.map((definition) => {
                const indicator = indicatorByCode.get(definition.code);
                const status = getIndicatorStatus(indicator?.score ?? null);

                return (
                  <article
                    key={definition.code}
                    className="rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-muted)] p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-[var(--dc-border-strong)] bg-background px-2 py-0.5 font-mono font-semibold text-[10px]"
                          >
                            {definition.code}
                          </Badge>
                          <h3 className="truncate font-semibold text-[var(--dc-text-primary)] text-xs">
                            {definition.name}
                          </h3>
                        </div>
                        <p className="mt-1 text-[var(--dc-text-muted)] text-[11px] leading-relaxed">
                          {definition.evidence}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold font-mono text-[var(--dc-text-primary)] text-sm">
                          {formatScore(indicator?.score ?? null)}
                        </p>
                        <p className={cn("font-medium text-[10px]", status.className)}>{status.label}</p>
                      </div>
                    </div>
                    <p className="mt-2 border-[var(--dc-divider)] border-t pt-2 text-[var(--dc-text-secondary)] text-[11px] leading-relaxed">
                      <span className="font-semibold text-[var(--dc-text-primary)]">Rumus: </span>
                      {definition.formula}
                    </p>
                  </article>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EvidenceItem({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-md border border-[var(--dc-border-subtle)] bg-background/40 px-3 py-2">
      <p className="font-mono text-[10px] text-[var(--dc-text-muted)] uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-bold font-mono text-[var(--dc-text-primary)] text-sm">{value.toLocaleString("id-ID")}</p>
    </div>
  );
}

function FormulaPrinciple({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  readonly icon: typeof Gauge;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone: "primary" | "emerald" | "amber" | "slate";
}) {
  return (
    <div className="rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-muted)] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-[var(--dc-text-muted)] text-[10px] uppercase tracking-wider">{label}</p>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tone === "primary" && "bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]",
            tone === "emerald" && "bg-emerald-500/10 text-emerald-500",
            tone === "amber" && "bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]",
            tone === "slate" && "bg-slate-500/10 text-slate-400",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <p className="mt-2 font-bold font-mono text-[var(--dc-text-primary)] text-lg">{value}</p>
      <p className="mt-1 text-[var(--dc-text-muted)] text-[11px] leading-relaxed">{detail}</p>
    </div>
  );
}
