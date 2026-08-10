"use client";

import { CalendarDays, MapPinned, RotateCcw, ShieldCheck } from "lucide-react";

import { DashboardLiveStatus } from "@/app/(main)/dashboard/_components/dashboard-live-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";

import { formatDashboardDate } from "./executive-dashboard-format";
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
  executive: `Dashboard ${DOMAIN_TERMS.deputyLeader}`,
  regional_commander: "Dashboard Komando Regional",
  operational_intelligence_manager: "Dashboard Intelijen Operasional",
  field_coordinator: `Dashboard ${DOMAIN_TERMS.fieldCoordinatorRole}`,
};

function periodLabel(value: string) {
  return PERIODS.find(([period]) => period === value)?.[1] ?? "30 Hari Terakhir";
}

type FlatAreaNode = {
  id: string;
  name: string;
  level: string;
  parentId: string | null;
  provinceId: string | null;
  regencyCityId: string | null;
};

const ALL_AREAS = "__ALL_AREAS__";

function isProvince(area: Pick<FlatAreaNode, "level">) {
  return area.level === "PROVINCE";
}

function isRegencyCity(area: Pick<FlatAreaNode, "level">) {
  return area.level === "CITY" || area.level === "REGENCY";
}

function isDistrict(area: Pick<FlatAreaNode, "level">) {
  return area.level === "DISTRICT";
}

function flattenAreaTree(root: DashboardAreaNode | null | undefined) {
  const result: FlatAreaNode[] = [];

  function visit(
    node: DashboardAreaNode,
    parentId: string | null,
    provinceId: string | null,
    regencyCityId: string | null,
  ) {
    const nextProvinceId = node.level === "PROVINCE" ? node.id : provinceId;
    const nextRegencyCityId = isRegencyCity(node) ? node.id : regencyCityId;
    result.push({
      id: node.id,
      name: node.name,
      level: node.level,
      parentId,
      provinceId: nextProvinceId,
      regencyCityId: nextRegencyCityId,
    });
    for (const child of node.children ?? []) visit(child, node.id, nextProvinceId, nextRegencyCityId);
  }

  if (root) visit(root, null, null, null);
  return result;
}

function uniqueAreas(areas: FlatAreaNode[]) {
  const byId = new Map<string, FlatAreaNode>();
  for (const area of areas) byId.set(area.id, area);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

function areaOption(area: FlatAreaNode): SearchableSelectOption {
  return {
    value: area.id,
    label: area.name,
    description:
      area.level === "PROVINCE"
        ? "Provinsi"
        : area.level === "CITY"
          ? "Kota"
          : area.level === "REGENCY"
            ? "Kabupaten"
            : "Kecamatan",
    keywords: [area.level],
  };
}

function isExecutiveScope(scope: ExecutiveDashboardData["scope"]) {
  return scope.role === "executive";
}

export function DashboardHeaderFilter({
  data,
  filters,
  filtersLoading,
  query,
  loading,
  onChange,
  onReset,
  onRefresh,
  autoRefresh,
  onToggleAutoRefresh,
}: {
  data: ExecutiveDashboardData;
  filters: ExecutiveDashboardFilters | null;
  filtersLoading: boolean;
  query: DashboardQueryState;
  loading: boolean;
  onChange: (key: keyof DashboardQueryState, value: string) => void;
  onReset: () => void;
  onRefresh: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
}) {
  const scopeAreas = data.scope.areas.slice(0, 6);
  const hasCustomRange = query.period === "CUSTOM";
  const hasActiveFilter =
    query.period !== "LAST_30_DAYS" || Boolean(query.from) || Boolean(query.to) || Boolean(query.areaId);
  const dataRange = `${formatDashboardDate(data.period.from)} - ${formatDashboardDate(data.period.to)}`;
  const flatAreas = flattenAreaTree(filters?.areaTree);
  const selectedArea = flatAreas.find((area) => area.id === query.areaId) ?? null;
  const isDeputyScope = isExecutiveScope(data.scope);
  const allScopeLabel = isDeputyScope ? "Seluruh Indonesia (semua Binda)" : data.scope.label || "Seluruh wilayah cakupan";
  const allProvinceLabel = isDeputyScope ? "Seluruh Indonesia / Semua Binda" : "Semua Provinsi";
  const selectedProvinceId =
    selectedArea && isProvince(selectedArea) ? selectedArea.id : (selectedArea?.provinceId ?? null);
  const implicitProvince = selectedProvinceId
    ? null
    : uniqueAreas(flatAreas.filter(isProvince)).length === 1
      ? uniqueAreas(flatAreas.filter(isProvince))[0]
      : null;
  const effectiveProvinceId = selectedProvinceId ?? implicitProvince?.id ?? null;
  const selectedRegencyCity =
    selectedArea && isRegencyCity(selectedArea)
      ? selectedArea
      : (flatAreas.find((area) => area.id === selectedArea?.regencyCityId) ?? null);
  const selectedDistrict = selectedArea && isDistrict(selectedArea) ? selectedArea : null;
  const provinces = uniqueAreas(flatAreas.filter(isProvince));
  const regencyCities = uniqueAreas(
    flatAreas.filter((area) => isRegencyCity(area) && (!effectiveProvinceId || area.provinceId === effectiveProvinceId)),
  );
  const districts = uniqueAreas(
    flatAreas.filter((area) => isDistrict(area) && Boolean(selectedRegencyCity?.id) && area.parentId === selectedRegencyCity?.id),
  );
  const provinceOptions: SearchableSelectOption[] = [
    { value: ALL_AREAS, label: allProvinceLabel, description: "Mengikuti cakupan hak akses aktif" },
    ...provinces.map(areaOption),
  ];
  const regencyOptions: SearchableSelectOption[] = [
    {
      value: ALL_AREAS,
      label: effectiveProvinceId ? "Semua kota/kabupaten" : "Pilih provinsi terlebih dahulu",
      description: effectiveProvinceId ? "Seluruh kota/kabupaten dalam provinsi" : "Filter kota aktif setelah provinsi dipilih",
      disabled: !effectiveProvinceId && provinces.length > 1,
    },
    ...regencyCities.map(areaOption),
  ];
  const districtOptions: SearchableSelectOption[] = [
    {
      value: ALL_AREAS,
      label: selectedRegencyCity ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu",
      description: selectedRegencyCity ? "Seluruh kecamatan dalam kota/kabupaten" : "Filter kecamatan aktif setelah kota/kabupaten dipilih",
      disabled: !selectedRegencyCity,
    },
    ...districts.map(areaOption),
  ];
  const selectedScopeLabel =
    selectedDistrict?.name ??
    selectedRegencyCity?.name ??
    (selectedArea && isProvince(selectedArea) ? selectedArea.name : null) ??
    allScopeLabel;
  const filterDisabled = loading || filtersLoading || !filters;

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
              Ringkasan laporan, kualitas data, alur kerja, dan tindak lanjut untuk cakupan{" "}
              {data.scope.label || "penugasan aktif"}.
            </p>
            <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
              Tampilan data: {periodLabel(query.period)} untuk {selectedScopeLabel}.
            </p>
            <div className="mt-3 grid gap-2 rounded-lg border border-[var(--dc-border-subtle)] bg-background/70 p-3 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
              <div className="flex min-w-0 items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--dc-primary)]" />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{data.scope.supervisionLabel}</p>
                  <p className="mt-1 leading-5">{data.scope.scopeDescription}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-start gap-2">
                <MapPinned className="mt-0.5 size-4 shrink-0 text-[var(--dc-success)]" />
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {data.scope.supervisionMode === "DKI_REGENCY_CITY"
                      ? DOMAIN_TERMS.dkiDirectorateSupervisionScope
                      : DOMAIN_TERMS.assignmentArea}
                  </p>
                  <p className="mt-1 truncate leading-5">
                    {scopeAreas.length > 0 ? scopeAreas.map((area) => area.name).join(", ") : "Cakupan aktif"}
                    {data.scope.areas.length > scopeAreas.length
                      ? ` +${data.scope.areas.length - scopeAreas.length}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
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
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[color-mix(in_srgb,var(--dc-primary)_35%,transparent)] bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]">
              <CalendarDays className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Filter Dashboard</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Periode dan wilayah disajikan sejajar.{" "}
                {isDeputyScope
                  ? "Default Deputi II mencakup seluruh Indonesia dan seluruh Binda."
                  : "Wilayah mengikuti cakupan hak akses aktif."}
                Periode aktif: {dataRange}.
              </p>
            </div>
          </div>
          <Button className="min-h-10" variant="ghost" onClick={onReset} disabled={!hasActiveFilter || loading}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(13rem,0.8fr)_minmax(16rem,1.15fr)_minmax(16rem,1fr)_minmax(16rem,1fr)]">
          <label htmlFor="dashboard-filter-period" className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            <span>Periode</span>
            <NativeSelect
              id="dashboard-filter-period"
              className="w-full"
              value={query.period}
              onChange={(event) => onChange("period", event.target.value)}
              disabled={loading}
            >
              {PERIODS.map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          {hasCustomRange ? (
            <>
              <label htmlFor="dashboard-filter-from" className="grid gap-1 text-xs text-muted-foreground">
                <span>Tanggal Mulai</span>
                <Input
                  id="dashboard-filter-from"
                  type="date"
                  value={query.from}
                  onChange={(event) => onChange("from", event.target.value)}
                  disabled={loading}
                />
              </label>
              <label htmlFor="dashboard-filter-to" className="grid gap-1 text-xs text-muted-foreground">
                <span>Tanggal Selesai</span>
                <Input
                  id="dashboard-filter-to"
                  type="date"
                  value={query.to}
                  onChange={(event) => onChange("to", event.target.value)}
                  disabled={loading}
                />
              </label>
            </>
          ) : null}
          <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            <span>Wilayah</span>
            <SearchableSelect
              value={selectedProvinceId ?? ALL_AREAS}
              options={provinceOptions}
              onValueChange={(value) => onChange("areaId", value === ALL_AREAS ? "" : value)}
              placeholder={filtersLoading ? "Memuat wilayah..." : allProvinceLabel}
              searchPlaceholder="Cari provinsi atau Binda..."
              emptyText="Wilayah tidak ditemukan."
              disabled={filterDisabled || provinceOptions.length <= 1}
              aria-label="Filter wilayah dashboard"
            />
          </div>
          <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            <span>Kota/Kabupaten</span>
            <SearchableSelect
              value={selectedRegencyCity?.id ?? ALL_AREAS}
              options={regencyOptions}
              onValueChange={(value) => {
                if (value === ALL_AREAS) {
                  onChange("areaId", selectedProvinceId ?? "");
                  return;
                }
                onChange("areaId", value);
              }}
              placeholder={filtersLoading ? "Memuat kota/kabupaten..." : "Semua kota/kabupaten"}
              searchPlaceholder="Cari kota/kabupaten..."
              emptyText="Kota/kabupaten tidak ditemukan."
              disabled={filterDisabled || regencyOptions.length <= 1}
              aria-label="Filter kota atau kabupaten dashboard"
            />
          </div>
          <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
            <span>Kecamatan</span>
            <SearchableSelect
              value={selectedDistrict?.id ?? ALL_AREAS}
              options={districtOptions}
              onValueChange={(value) => {
                if (value === ALL_AREAS) {
                  onChange("areaId", selectedRegencyCity?.id ?? selectedProvinceId ?? "");
                  return;
                }
                onChange("areaId", value);
              }}
              placeholder={filtersLoading ? "Memuat Kecamatan..." : "Semua Kecamatan"}
              searchPlaceholder="Cari Kecamatan..."
              emptyText="Kecamatan tidak ditemukan."
              disabled={filterDisabled || districtOptions.length <= 1}
              aria-label="Filter kecamatan dashboard"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
