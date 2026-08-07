"use client";

import { useState } from "react";

import { ChevronDown, Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";

import { DashboardLiveStatus } from "@/app/(main)/dashboard/_components/dashboard-live-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import { dashboardStatusLabel, formatDashboardDate } from "./executive-dashboard-format";
import type {
  DashboardAreaNode,
  DashboardQueryState,
  ExecutiveDashboardData,
  ExecutiveDashboardFilters,
} from "./executive-dashboard-types";

const PERIODS = [
  ["TODAY", "Hari Ini"],
  ["LAST_7_DAYS", "7 Hari Terakhir"],
  ["LAST_30_DAYS", "30 Hari Terakhir"],
  ["CURRENT_MONTH", "Bulan Berjalan"],
  ["CURRENT_YEAR", "Tahun Berjalan"],
  ["CUSTOM", "Rentang Kustom"],
] as const;

const DASHBOARD_TITLES: Record<string, string> = {
  executive: "Dashboard Eksekutif",
  regional_commander: "Dashboard Komando Regional",
  operational_intelligence_manager: "Dashboard Intelijen Operasional",
  field_coordinator: "Dashboard Koordinasi Lapangan",
};

const FILTER_LABELS: Partial<Record<keyof DashboardQueryState, string>> = {
  areaId: "Wilayah",
  categoryId: "Kategori/Isu",
  productTypeId: "Jenis Produk",
  jaringId: "Jaring",
  fieldOfficerAssignmentId: "Petugas Wilayah",
  urgency: "Urgensi",
  reportStatus: "Status Laporan",
  completeness: "Kelengkapan",
  verificationStatus: "Verifikasi",
  workflowStatus: "Workflow Baket",
  validationStatus: "Validasi",
  hasAttachment: "Lampiran",
  coordinateSource: "Sumber Lokasi",
  locationSuitability: "Kesesuaian Lokasi",
  source: "Sumber Laporan",
};

function flattenAreas(node: DashboardAreaNode, depth = 0): Array<DashboardAreaNode & { depth: number }> {
  const own = node.id === "scope-root" ? [] : [{ ...node, depth }];
  return [
    ...own,
    ...(node.children ?? []).flatMap((child) => flattenAreas(child, node.id === "scope-root" ? 0 : depth + 1)),
  ];
}

function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder = "Semua",
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = `dashboard-filter-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={id} className="grid min-w-0 gap-1 text-xs text-muted-foreground">
      <span>{label}</span>
      <NativeSelect id={id} className="w-full" value={value} onChange={(event) => onChange(event.target.value)}>
        <NativeSelectOption value="">{placeholder}</NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </label>
  );
}

export function DashboardHeaderFilter({
  data,
  filters,
  query,
  loading,
  activeFilterCount,
  onChange,
  onReset,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
}: {
  data: ExecutiveDashboardData;
  filters: ExecutiveDashboardFilters | null;
  query: DashboardQueryState;
  loading: boolean;
  activeFilterCount: number;
  onChange: (key: keyof DashboardQueryState, value: string) => void;
  onReset: () => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}) {
  const areaOptions = filters ? flattenAreas(filters.areaTree) : [];
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);
  const resolveSelectedLabel = (key: keyof DashboardQueryState, value: string) => {
    if (key === "areaId") return areaOptions.find((area) => area.id === value)?.name ?? value;
    if (key === "categoryId") return filters?.categories.find((item) => item.id === value)?.name ?? value;
    if (key === "productTypeId") return filters?.productTypes.find((item) => item.id === value)?.name ?? value;
    if (key === "jaringId") return filters?.jaring.items.find((item) => item.id === value)?.name ?? value;
    if (key === "fieldOfficerAssignmentId") {
      return filters?.fieldOfficers.find((item) => item.id === value)?.name ?? value;
    }
    if (key === "hasAttachment") return value === "true" ? "Memiliki Lampiran" : "Tanpa Lampiran";
    return dashboardStatusLabel(value);
  };
  const activeFilters = (Object.entries(query) as Array<[keyof DashboardQueryState, string]>).filter(
    ([key, value]) => Boolean(value) && key !== "period" && key !== "from" && key !== "to",
  );

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--dc-border-subtle)] bg-card shadow-[var(--dc-shadow-card)]">
      <div className="relative border-b border-[var(--dc-border-subtle)] px-4 py-5 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--dc-primary)_14%,transparent),transparent_48%)]" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-[color-mix(in_srgb,var(--dc-primary)_38%,transparent)] font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]"
              >
                Dashboard Intelijen Terpadu
              </Badge>
              <Badge variant="secondary">{data.period.timezone}</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {DASHBOARD_TITLES[data.scope.role] ?? "Dashboard Intelijen"}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              Ringkasan laporan, kualitas data, workflow, dan tindak lanjut untuk cakupan{" "}
              {data.scope.label || "penugasan aktif"}.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Diperbarui {formatDashboardDate(data.generatedAt)}</p>
          </div>
          <DashboardLiveStatus
            updatedAt={data.generatedAt}
            autoRefresh={autoRefresh}
            loading={loading}
            onToggleAutoRefresh={onToggleAutoRefresh}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="flex min-h-11 items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-expanded={filtersOpen}
            aria-controls="executive-dashboard-filters"
          >
            <SlidersHorizontal className="size-4 text-[var(--dc-primary)]" />
            <span className="text-sm font-semibold">Filter Global</span>
            {activeFilterCount > 0 && <Badge>{activeFilterCount} aktif</Badge>}
            <ChevronDown
              className={cn("size-4 text-muted-foreground transition-transform", filtersOpen && "rotate-180")}
            />
          </button>
          <div className="flex items-center gap-1">
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {filtersOpen ? "Sembunyikan filter lanjutan" : "Tampilkan filter lanjutan"}
            </span>
            <Button
              className="min-h-11"
              variant="ghost"
              onClick={onReset}
              disabled={activeFilterCount === 0 || loading}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>

        {activeFilters.length > 0 ? (
          <fieldset className="mb-4 flex flex-wrap items-center gap-2" aria-label="Filter yang sedang diterapkan">
            {activeFilters.map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key, "")}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--dc-primary)_25%,var(--dc-border-subtle))] bg-[var(--dc-primary-soft)] px-2.5 text-[0.68rem] transition-colors hover:border-[var(--dc-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Hapus filter ${FILTER_LABELS[key] ?? key}`}
              >
                <span className="text-muted-foreground">{FILTER_LABELS[key] ?? key}:</span>
                <strong className="max-w-48 truncate font-medium">{resolveSelectedLabel(key, value)}</strong>
                <X className="size-3" />
              </button>
            ))}
          </fieldset>
        ) : null}

        {filtersOpen ? (
          <div id="executive-dashboard-filters" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <SelectField
              label="Periode"
              value={query.period}
              options={PERIODS.map(([value, label]) => ({ value, label }))}
              onChange={(value) => onChange("period", value)}
            />
            {query.period === "CUSTOM" && (
              <>
                <label htmlFor="dashboard-filter-from" className="grid gap-1 text-xs text-muted-foreground">
                  <span>Tanggal Mulai</span>
                  <Input
                    id="dashboard-filter-from"
                    type="date"
                    value={query.from}
                    onChange={(event) => onChange("from", event.target.value)}
                  />
                </label>
                <label htmlFor="dashboard-filter-to" className="grid gap-1 text-xs text-muted-foreground">
                  <span>Tanggal Selesai</span>
                  <Input
                    id="dashboard-filter-to"
                    type="date"
                    value={query.to}
                    onChange={(event) => onChange("to", event.target.value)}
                  />
                </label>
              </>
            )}
            <SelectField
              label="Wilayah"
              value={query.areaId}
              options={areaOptions.map((area) => ({ value: area.id, label: `${"— ".repeat(area.depth)}${area.name}` }))}
              onChange={(value) => onChange("areaId", value)}
            />
            <SelectField
              label="Kategori/Isu"
              value={query.categoryId}
              options={(filters?.categories ?? []).map((category) => ({ value: category.id, label: category.name }))}
              onChange={(value) => onChange("categoryId", value)}
            />
            <SelectField
              label="Jenis Produk Informasi"
              value={query.productTypeId}
              options={(filters?.productTypes ?? []).map((productType) => ({
                value: productType.id,
                label: productType.name,
              }))}
              onChange={(value) => onChange("productTypeId", value)}
            />
            <SelectField
              label="Petugas Wilayah (Gaswil)"
              value={query.fieldOfficerAssignmentId}
              options={(filters?.fieldOfficers ?? []).map((officer) => ({ value: officer.id, label: officer.name }))}
              onChange={(value) => onChange("fieldOfficerAssignmentId", value)}
            />
            <SelectField
              label="Jaring"
              value={query.jaringId}
              options={(filters?.jaring.items ?? []).map((jaring) => ({ value: jaring.id, label: jaring.name }))}
              onChange={(value) => onChange("jaringId", value)}
              placeholder={filters?.jaring.truncated ? `Pilih (${filters.jaring.items.length} awal)` : "Semua Jaring"}
            />
            {(
              [
                "urgency",
                "reportStatus",
                "completeness",
                "verificationStatus",
                "workflowStatus",
                "validationStatus",
                "coordinateSource",
                "locationSuitability",
              ] as const
            ).map((key) => (
              <SelectField
                key={key}
                label={
                  {
                    urgency: "Urgensi",
                    reportStatus: "Status Laporan",
                    completeness: "Status Kelengkapan",
                    verificationStatus: "Status Verifikasi",
                    workflowStatus: "Status Workflow Baket",
                    validationStatus: "Status Validasi",
                    coordinateSource: "Sumber Lokasi",
                    locationSuitability: "Kesesuaian Lokasi",
                  }[key]
                }
                value={query[key]}
                options={(filters?.options[key] ?? []).map((value) => ({
                  value,
                  label: dashboardStatusLabel(value),
                }))}
                onChange={(value) => onChange(key, value)}
              />
            ))}
            <SelectField
              label="Sumber Laporan"
              value={query.source}
              options={(filters?.options.source ?? []).map((value) => ({ value, label: dashboardStatusLabel(value) }))}
              onChange={(value) => onChange("source", value)}
            />
            <SelectField
              label="Lampiran"
              value={query.hasAttachment}
              options={[
                { value: "true", label: "Memiliki Lampiran" },
                { value: "false", label: "Tanpa Lampiran" },
              ]}
              onChange={(value) => onChange("hasAttachment", value)}
            />
          </div>
        ) : null}
        {filtersOpen
          ? filters?.unavailableFilters.map((item) => (
              <p key={item.key} className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                <Filter className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <strong>{item.label}:</strong> {item.reason}
                </span>
              </p>
            ))
          : null}
      </div>
    </section>
  );
}
