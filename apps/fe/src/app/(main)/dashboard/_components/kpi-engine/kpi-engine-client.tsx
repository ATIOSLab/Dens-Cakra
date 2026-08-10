"use client";

import { useMemo, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CalendarDays, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import { HierarchyExplorer } from "./_components/hierarchy-explorer";
import { GradeDistribution, LowestUnits, Top5Units } from "./_components/insight-sidebar";
import { KpiFormulaGuide } from "./_components/kpi-formula-guide";
import { KpiIndicator } from "./_components/kpi-indicator";
import { KpiSummary } from "./_components/kpi-summary";
import { RightDrawer } from "./_components/right-drawer";

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "Belum tersedia") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numeric(value: unknown): number | null {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
}

function indicatorDefinition(item: DataRecord) {
  return {
    code: text(item.code, ""),
    name: text(item.name, "Indikator Kinerja"),
    evidence: text(item.evidence, "Bukti penilaian belum tersedia."),
    formula: text(item.formula, "Rumus penilaian belum tersedia."),
  };
}

function indicatorScore(item: DataRecord) {
  return {
    code: text(item.code, ""),
    score: numeric(item.score),
    sample: Number(item.sample ?? 0),
  };
}

function formatPeriod(value: DataRecord) {
  const from = typeof value.from === "string" ? new Date(value.from) : null;
  const to = typeof value.to === "string" ? new Date(value.to) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Periode tidak tersedia";
  const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  return `${formatter.format(from)} sampai ${formatter.format(to)}`;
}

function toInputDate(value: unknown) {
  if (typeof value !== "string") return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function KpiEngineClient({ data, mode }: { data: unknown; mode: "regional" | "national" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const payload = record(data);
  const summary = record(payload.summary);
  const period = record(payload.period);
  const evidence = {
    reports: Number(record(summary.evidence).reports ?? 0),
    jaringReports: Number(record(summary.evidence).jaringReports ?? 0),
    jaring: Number(record(summary.evidence).jaring ?? 0),
    activeJaring90Days: Number(record(summary.evidence).activeJaring90Days ?? 0),
    tasks: Number(record(summary.evidence).tasks ?? 0),
    baketAssessments: Number(record(summary.evidence).baketAssessments ?? record(summary.evidence).verifications ?? 0),
    measuredIndicators: Number(record(summary.evidence).measuredIndicators ?? 0),
  };
  const rawDefinitions = list(payload.indicatorDefinitions);
  const rawSummaryIndicators = list(summary.indicators);
  const definitions = rawDefinitions.map(indicatorDefinition).filter((item) => item.code);
  const summaryIndicators = rawSummaryIndicators.map(indicatorScore).filter((item) => item.code);
  const definitionsByCode = useMemo(
    () => new Map(definitions.map((item) => [item.code, item])),
    [definitions],
  );
  const units = list(payload.units);
  const personnel = list(payload.personnel);
  const _recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map((item) => text(item))
    : [];

  // Search local state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(searchParams.get("from") ?? toInputDate(period.from));
  const [toDate, setToDate] = useState(searchParams.get("to") ?? toInputDate(period.to));

  // Drawer local state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{
    type: "unit" | "personnel" | null;
    data: DataRecord | null;
  }>({ type: null, data: null });

  // Top & Bottom performers extraction
  const topPerformers = useMemo(() => {
    return [...units]
      .filter((u) => numeric(u.score) !== null)
      .sort((a, b) => (numeric(b.score) ?? 0) - (numeric(a.score) ?? 0))
      .slice(0, 5);
  }, [units]);

  const lowestPerformers = useMemo(() => {
    return [...units]
      .filter((u) => numeric(u.score) !== null)
      .sort((a, b) => (numeric(a.score) ?? 0) - (numeric(b.score) ?? 0))
      .slice(0, 5);
  }, [units]);

  const handleSelectRow = (type: "unit" | "personnel", item: DataRecord) => {
    setSelectedDetail({ type, data: item });
    setDrawerOpen(true);
  };

  const _handleRecommendationClick = (keyword: string) => {
    setSearch(keyword);
  };

  const handleRefresh = () => {
    // Simulated Refresh / clear search filters
    setSearch("");
  };

  const applyPeriod = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (fromDate) params.set("from", fromDate);
    else params.delete("from");
    if (toDate) params.set("to", toDate);
    else params.delete("to");
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const resetPeriod = () => {
    setFromDate("");
    setToDate("");
    router.push(pathname);
  };

  return (
    <main className="mx-auto w-full max-w-[var(--dc-content-max,1792px)] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER SECTION */}
      <header className="flex flex-col gap-3 border-[var(--dc-divider)] border-b pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className={cn(DC_TYPOGRAPHY.pageTitle, "mt-1 text-2xl")}>
            Kinerja & Evaluasi Berjenjang
          </h1>
          <p className="max-w-3xl text-[var(--dc-text-secondary)] text-sm leading-relaxed">
            Kinerja dihitung berjenjang dari Jaring, Petugas Wilayah (Gaswil), Koordinator Wilayah (Korwil), hingga BIN
            Daerah (Binda) berdasarkan aktivitas laporan, mutu data, validitas informasi, kontribusi Baket, dan respons
            tugas.
          </p>
        </div>

        {/* Scope and Date badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="border-[var(--dc-border-strong)] bg-[var(--dc-surface-raised)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider"
          >
            Wilayah {mode === "national" ? "Nasional" : "Komando Regional"}
          </Badge>
          <Badge
            variant="secondary"
            className="border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-2.5 py-1 font-mono text-[10px] text-[var(--dc-text-secondary)] uppercase tracking-wider"
          >
            Periode: {formatPeriod(record(payload.period))}
          </Badge>
        </div>
      </header>

      <section
        aria-label="Filter periode evaluasi"
        className="rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-4"
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[var(--dc-primary)]" aria-hidden />
              <h2 className="font-semibold text-[var(--dc-text-primary)] text-sm">Filter Waktu Evaluasi</h2>
            </div>
            <p className="text-[var(--dc-text-muted)] text-xs">
              Data tetap mengikuti cakupan hak akses role aktif. Ubah periode untuk membaca tren evaluasi pada rentang
              waktu tertentu.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,10rem)_minmax(0,10rem)_auto_auto]">
            <div className="space-y-1">
              <label htmlFor="kpi-from" className="font-medium text-[10px] text-[var(--dc-text-muted)] uppercase">
                Dari
              </label>
              <Input
                id="kpi-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className={cn(DC_CONTROLS.input, "text-xs")}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="kpi-to" className="font-medium text-[10px] text-[var(--dc-text-muted)] uppercase">
                Sampai
              </label>
              <Input
                id="kpi-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className={cn(DC_CONTROLS.input, "text-xs")}
              />
            </div>
            <Button type="button" onClick={applyPeriod} className="h-9 self-end">
              Terapkan
            </Button>
            <Button type="button" variant="outline" onClick={resetPeriod} className="h-9 self-end">
              <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
              Reset
            </Button>
          </div>
        </div>
      </section>

      {/* KPI SUMMARY CARDS */}
      <KpiSummary
        score={numeric(summary.score)}
        grade={text(summary.grade, "N/A")}
        personnelCount={personnel.length}
        evidence={evidence}
      />

      <KpiFormulaGuide definitions={definitions} indicators={summaryIndicators} evidence={evidence} />

      {/* PERFORMANCE INDICATORS (5 HORIZONTAL CARDS) */}
      <div className="space-y-3">
        <h3 className="font-bold text-[var(--dc-text-muted)] text-xs uppercase tracking-wider">
          Indikator Kinerja Utama
        </h3>
        <KpiIndicator
          indicators={summaryIndicators}
          definitionsByCode={definitionsByCode}
        />
      </div>

      {/* HIERARCHY KPI EXPLORER (FULL WIDTH) */}
      <div className="w-full">
        <HierarchyExplorer
          units={units}
          personnel={personnel}
          definitions={rawDefinitions}
          summaryIndicators={rawSummaryIndicators}
          search={search}
          onSearchChange={setSearch}
          onSelectRow={handleSelectRow}
          onRefresh={handleRefresh}
        />
      </div>

      {/* STRATEGIC INSIGHT SECTION */}
      <div className="space-y-6 border-[var(--dc-divider)] border-t pt-6">
        <div>
          <h2 className="font-bold text-[var(--dc-text-primary)] text-lg">Insight Strategis</h2>
          <p className="mt-1 text-[var(--dc-text-muted)] text-xs">
            Analisis taktis operasional berdasarkan penyebaran skor kinerja dan grade berjenjang.
          </p>
        </div>

        {/* 3-Column Grid for Rankings & Distribution */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Top5Units topPerformers={topPerformers} onSelectUnit={(unit) => handleSelectRow("unit", unit)} />
          <LowestUnits lowestPerformers={lowestPerformers} onSelectUnit={(unit) => handleSelectRow("unit", unit)} />
          <GradeDistribution units={units} />
        </div>
      </div>

      {/* DETAIL RIGHT DRAWER */}
      <RightDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        type={selectedDetail.type}
        data={selectedDetail.data}
      />
    </main>
  );
}
