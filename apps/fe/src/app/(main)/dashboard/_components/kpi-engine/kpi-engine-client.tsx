"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { KpiSummary } from "./_components/kpi-summary";
import { KpiIndicator } from "./_components/kpi-indicator";
import { HierarchyExplorer } from "./_components/hierarchy-explorer";
import { RightDrawer } from "./_components/right-drawer";
import {
  Top5Units,
  LowestUnits,
  GradeDistribution,
} from "./_components/insight-sidebar";

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

function formatPeriod(value: DataRecord) {
  const from = typeof value.from === "string" ? new Date(value.from) : null;
  const to = typeof value.to === "string" ? new Date(value.to) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return "Periode tidak tersedia";
  const formatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  return `${formatter.format(from)} sampai ${formatter.format(to)}`;
}

export function KpiEngineClient({ data, mode }: { data: unknown; mode: "regional" | "national" }) {
  const payload = record(data);
  const summary = record(payload.summary);
  const evidence = {
    reports: Number(record(summary.evidence).reports ?? 0),
    tasks: Number(record(summary.evidence).tasks ?? 0),
    verifications: Number(record(summary.evidence).verifications ?? 0),
    measuredIndicators: Number(record(summary.evidence).measuredIndicators ?? 0),
  };
  const definitions = list(payload.indicatorDefinitions);
  const summaryIndicators = list(summary.indicators);
  const definitionsByCode = useMemo(
    () => new Map(definitions.map((item) => [text(item.code, ""), item])),
    [definitions],
  );
  const units = list(payload.units);
  const personnel = list(payload.personnel);
  const recommendations = Array.isArray(payload.recommendations)
    ? payload.recommendations.map((item) => text(item))
    : [];

  // Search local state
  const [search, setSearch] = useState("");

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

  const handleRecommendationClick = (keyword: string) => {
    setSearch(keyword);
  };

  const handleRefresh = () => {
    // Simulated Refresh / clear search filters
    setSearch("");
  };

  return (
    <main className="mx-auto w-full max-w-[var(--dc-content-max,1792px)] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* HEADER SECTION */}
      <header className="flex flex-col gap-3 border-b border-[var(--dc-divider)] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          {/* Breadcrumb */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-[10px] tracking-wider uppercase font-semibold text-[var(--dc-text-muted)]">
                  Evaluasi Kinerja
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-[var(--dc-text-muted)] opacity-50" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[10px] tracking-wider uppercase font-semibold text-[var(--dc-text-secondary)]">
                  Kualitas Humint
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight text-[var(--dc-text-primary)]">
            DENS CAKRA KPI Engine
          </h1>
          <p className="max-w-3xl text-sm text-[var(--dc-text-secondary)] leading-relaxed">
            Produktivitas dinilai dari ketepatan waktu, kualitas, validitas, dampak strategis, dan respons UUK/STR;
            bukan jumlah laporan saja.
          </p>
        </div>

        {/* Scope and Date badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] tracking-wider uppercase border-[var(--dc-border-strong)] bg-[var(--dc-surface-raised)] px-2.5 py-1">
            Scope {mode === "national" ? "Nasional" : "Komando Regional"}
          </Badge>
          <Badge variant="secondary" className="font-mono text-[10px] tracking-wider uppercase px-2.5 py-1 bg-[var(--dc-surface-raised)] text-[var(--dc-text-secondary)] border border-[var(--dc-border-subtle)]">
            Periode: {formatPeriod(record(payload.period))}
          </Badge>
        </div>
      </header>

      {/* KPI SUMMARY CARDS */}
      <KpiSummary
        score={numeric(summary.score)}
        grade={text(summary.grade, "N/A")}
        personnelCount={personnel.length}
        evidence={evidence}
      />

      {/* PERFORMANCE INDICATORS (5 HORIZONTAL CARDS) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--dc-text-muted)]">
          Indikator Kinerja Utama
        </h3>
        <KpiIndicator
          indicators={summaryIndicators.map((ind) => ({
            code: text(ind.code),
            score: numeric(ind.score),
            sample: Number(ind.sample ?? 0),
          }))}
          definitionsByCode={definitionsByCode as any}
        />
      </div>

      {/* HIERARCHY KPI EXPLORER (FULL WIDTH) */}
      <div className="w-full">
        <HierarchyExplorer
          units={units}
          personnel={personnel}
          definitions={definitions}
          summaryIndicators={summaryIndicators}
          search={search}
          onSearchChange={setSearch}
          onSelectRow={handleSelectRow}
          onRefresh={handleRefresh}
        />
      </div>

      {/* STRATEGIC INSIGHT SECTION */}
      <div className="space-y-6 pt-6 border-t border-[var(--dc-divider)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--dc-text-primary)]">Strategic Insight</h2>
          <p className="text-xs text-[var(--dc-text-muted)] mt-1">
            Analisis taktis operasional berdasarkan penyebaran skor kinerja dan grade secara nasional.
          </p>
        </div>


        {/* 3-Column Grid for Rankings & Distribution */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <Top5Units
            topPerformers={topPerformers}
            onSelectUnit={(unit) => handleSelectRow("unit", unit)}
          />
          <LowestUnits
            lowestPerformers={lowestPerformers}
            onSelectUnit={(unit) => handleSelectRow("unit", unit)}
          />
          <GradeDistribution
            units={units}
          />
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
