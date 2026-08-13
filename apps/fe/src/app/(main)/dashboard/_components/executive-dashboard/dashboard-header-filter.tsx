"use client";

import { CalendarDays, MapPinned, RotateCcw, ShieldCheck, SlidersHorizontal } from "lucide-react";

import { DashboardLiveStatus } from "@/app/(main)/dashboard/_components/dashboard-live-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";

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
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level: string;
  parentId: string | null;
  provinceId: string | null;
  regencyCityId: string | null;
};

const ALL_AREAS = "__ALL_AREAS__";
const ALL_FILTERS = "__ALL_FILTERS__";

const OPERATIONAL_FILTER_KEYS = [
  "categoryId",
  "productTypeId",
  "jaringId",
  "fieldOfficerAssignmentId",
  "urgency",
  "reportStatus",
  "workflowStatus",
  "validationStatus",
  "hasAttachment",
  "coordinateSource",
  "locationSuitability",
  "source",
] as const satisfies Array<keyof DashboardQueryState>;

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
      code: node.code,
      officialCode: node.officialCode,
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
    keywords: [area.level, area.code, area.officialCode].filter(Boolean) as string[],
  };
}

function namedOption(item: { id: string; name: string; code?: string }): SearchableSelectOption {
  return {
    value: item.id,
    label: item.name,
    description: item.code,
    keywords: item.code ? [item.code] : undefined,
  };
}

function enumOption(value: string): SearchableSelectOption {
  return {
    value,
    label: dashboardStatusLabel(value),
    keywords: [value],
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
  const activeFilterCount =
    (query.period !== "LAST_30_DAYS" ? 1 : 0) +
    (query.period === "CUSTOM" && (query.from || query.to) ? 1 : 0) +
    (query.areaId ? 1 : 0) +
    OPERATIONAL_FILTER_KEYS.filter((key) => Boolean(query[key])).length;
  const hasActiveFilter = activeFilterCount > 0;
  const dataRange = `${formatDashboardDate(data.period.from)} - ${formatDashboardDate(data.period.to)}`;
  const flatAreas = flattenAreaTree(filters?.areaTree);
  const selectedArea = flatAreas.find((area) => area.id === query.areaId) ?? null;
  const isDeputyScope = isExecutiveScope(data.scope);
  const allScopeLabel = isDeputyScope ? "cakupan Kedeputian II" : data.scope.label || "cakupan aktif";
  const provincePlaceholder = "Pilih Provinsi/Binda terlebih dahulu";
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
  const hasSelectedProvince = Boolean(effectiveProvinceId);
  const provinceOptions: SearchableSelectOption[] = [
    {
      value: ALL_AREAS,
      label: provincePlaceholder,
      description: "Filter wilayah dimulai dari Provinsi/Binda",
      disabled: provinces.length > 1,
    },
    ...provinces.map(areaOption),
  ];
  const regencyOptions: SearchableSelectOption[] = [
    {
      value: ALL_AREAS,
      label: effectiveProvinceId ? "Semua Kota/Kabupaten" : provincePlaceholder,
      description: effectiveProvinceId
        ? "Semua Kota/Kabupaten dalam Provinsi/Binda terpilih"
        : "Filter Kota/Kabupaten aktif setelah Provinsi/Binda dipilih",
      disabled: !effectiveProvinceId && provinces.length > 1,
    },
    ...regencyCities.map(areaOption),
  ];
  const districtOptions: SearchableSelectOption[] = [
    {
      value: ALL_AREAS,
      label: selectedRegencyCity ? "Semua Kecamatan" : "Pilih Kota/Kabupaten dahulu",
      description: selectedRegencyCity
        ? "Semua Kecamatan dalam Kota/Kabupaten terpilih"
        : "Filter Kecamatan aktif setelah Kota/Kabupaten dipilih",
      disabled: !selectedRegencyCity,
    },
    ...districts.map(areaOption),
  ];
  const selectedScopeLabel =
    selectedDistrict?.name ??
    selectedRegencyCity?.name ??
    (selectedArea && isProvince(selectedArea) ? selectedArea.name : null) ??
    (hasSelectedProvince ? allScopeLabel : "wilayah belum dipilih");
  const filterDisabled = loading || filtersLoading || !filters;
  const operationalFilterDisabled = filterDisabled || !hasSelectedProvince;
  const operationalFilterPlaceholder = hasSelectedProvince ? undefined : provincePlaceholder;
  const categoryOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua kategori", description: "Laporan Jaring dan Baket" },
    ...(filters?.categories ?? []).map(namedOption),
  ];
  const productTypeOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua jenis produk", description: "Produk intelijen" },
    ...(filters?.productTypes ?? []).map(namedOption),
  ];
  const fieldOfficerOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: `Semua ${DOMAIN_TERMS.fieldOfficer}`, description: "Mengikuti wilayah aktif" },
    ...(filters?.fieldOfficers ?? []).map(namedOption),
  ];
  const jaringOptions: SearchableSelectOption[] = [
    {
      value: ALL_FILTERS,
      label: `Semua ${DOMAIN_TERMS.jaring}`,
      description:
        filters?.jaring.truncated && filters.jaring.total > filters.jaring.items.length
          ? `${filters.jaring.items.length} dari ${filters.jaring.total} ditampilkan`
          : "Mengikuti wilayah aktif",
    },
    ...(filters?.jaring.items ?? []).map(namedOption),
  ];
  const urgencyOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua urgensi" },
    ...(filters?.options.urgency ?? []).map(enumOption),
  ];
  const reportStatusOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: `Semua status ${DOMAIN_TERMS.jaringReport}` },
    ...(filters?.options.reportStatus ?? []).map(enumOption),
  ];
  const workflowStatusOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: `Semua status ${DOMAIN_TERMS.baket}` },
    ...(filters?.options.workflowStatus ?? []).map(enumOption),
  ];
  const validationStatusOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: `Semua verifikasi ${DOMAIN_TERMS.baket}` },
    ...(filters?.options.validationStatus ?? []).map(enumOption),
  ];
  const attachmentOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua kondisi lampiran" },
    { value: "true", label: "Memiliki Lampiran" },
    { value: "false", label: "Tanpa Lampiran" },
  ];
  const coordinateSourceOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua sumber lokasi" },
    ...(filters?.options.coordinateSource ?? []).map(enumOption),
  ];
  const locationSuitabilityOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua kesesuaian lokasi" },
    ...(filters?.options.locationSuitability ?? []).map(enumOption),
  ];
  const sourceOptions: SearchableSelectOption[] = [
    { value: ALL_FILTERS, label: "Semua sumber laporan" },
    ...(filters?.options.source ?? []).map(enumOption),
  ];

  const selectFilterValue = (key: keyof DashboardQueryState, value: string) => {
    onChange(key, value === ALL_FILTERS ? "" : value);
  };

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
                Periode, wilayah, dan filter operasional memakai cakupan hak akses aktif. Default wilayah diarahkan ke
                DKI Jakarta jika tersedia. Periode aktif: {dataRange}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterCount > 0 ? (
              <Badge variant="outline" className="min-h-8 border-[var(--dc-primary)] text-[var(--dc-primary)]">
                {activeFilterCount} filter aktif
              </Badge>
            ) : null}
            <Button className="min-h-10" variant="ghost" onClick={onReset} disabled={!hasActiveFilter || loading}>
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
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
              placeholder={filtersLoading ? "Memuat wilayah..." : provincePlaceholder}
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
              placeholder={filtersLoading ? "Memuat Kota/Kabupaten..." : "Semua Kota/Kabupaten"}
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

        <div className="mt-4 rounded-lg border border-[var(--dc-border-subtle)] bg-background/55 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <SlidersHorizontal className="size-4 text-[var(--dc-primary)]" />
              <h3 className="truncate text-sm font-semibold">Filter Operasional</h3>
            </div>
            {filtersLoading ? <Badge variant="secondary">Memuat opsi</Badge> : null}
            {!filtersLoading && !hasSelectedProvince ? (
              <Badge variant="outline" className="border-amber-500/50 text-amber-300">
                Pilih wilayah dulu
              </Badge>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Kategori</span>
              <SearchableSelect
                value={query.categoryId || ALL_FILTERS}
                options={categoryOptions}
                onValueChange={(value) => selectFilterValue("categoryId", value)}
                placeholder={operationalFilterPlaceholder ?? "Semua kategori"}
                searchPlaceholder="Cari kategori..."
                emptyText="Kategori tidak ditemukan."
                disabled={operationalFilterDisabled || categoryOptions.length <= 1}
                aria-label="Filter kategori dashboard"
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>{DOMAIN_TERMS.fieldOfficer}</span>
              <SearchableSelect
                value={query.fieldOfficerAssignmentId || ALL_FILTERS}
                options={fieldOfficerOptions}
                onValueChange={(value) => selectFilterValue("fieldOfficerAssignmentId", value)}
                placeholder={operationalFilterPlaceholder ?? `Semua ${DOMAIN_TERMS.fieldOfficer}`}
                searchPlaceholder={`Cari ${DOMAIN_TERMS.fieldOfficer}...`}
                emptyText={`${DOMAIN_TERMS.fieldOfficer} tidak ditemukan.`}
                disabled={operationalFilterDisabled || fieldOfficerOptions.length <= 1}
                aria-label={`Filter ${DOMAIN_TERMS.fieldOfficer} dashboard`}
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>{DOMAIN_TERMS.jaring}</span>
              <SearchableSelect
                value={query.jaringId || ALL_FILTERS}
                options={jaringOptions}
                onValueChange={(value) => selectFilterValue("jaringId", value)}
                placeholder={operationalFilterPlaceholder ?? `Semua ${DOMAIN_TERMS.jaring}`}
                searchPlaceholder={`Cari ${DOMAIN_TERMS.jaring}...`}
                emptyText={`${DOMAIN_TERMS.jaring} tidak ditemukan.`}
                disabled={operationalFilterDisabled || jaringOptions.length <= 1}
                aria-label={`Filter ${DOMAIN_TERMS.jaring} dashboard`}
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Urgensi</span>
              <SearchableSelect
                value={query.urgency || ALL_FILTERS}
                options={urgencyOptions}
                onValueChange={(value) => selectFilterValue("urgency", value)}
                placeholder={operationalFilterPlaceholder ?? "Semua urgensi"}
                searchPlaceholder="Cari urgensi..."
                emptyText="Urgensi tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label="Filter urgensi dashboard"
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Status {DOMAIN_TERMS.jaringReport}</span>
              <SearchableSelect
                value={query.reportStatus || ALL_FILTERS}
                options={reportStatusOptions}
                onValueChange={(value) => selectFilterValue("reportStatus", value)}
                placeholder={operationalFilterPlaceholder ?? `Semua status ${DOMAIN_TERMS.jaringReport}`}
                searchPlaceholder="Cari status laporan..."
                emptyText="Status laporan tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label={`Filter status ${DOMAIN_TERMS.jaringReport}`}
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Status {DOMAIN_TERMS.baket}</span>
              <SearchableSelect
                value={query.workflowStatus || ALL_FILTERS}
                options={workflowStatusOptions}
                onValueChange={(value) => selectFilterValue("workflowStatus", value)}
                placeholder={operationalFilterPlaceholder ?? `Semua status ${DOMAIN_TERMS.baket}`}
                searchPlaceholder="Cari status Baket..."
                emptyText="Status Baket tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label={`Filter status ${DOMAIN_TERMS.baket}`}
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Verifikasi {DOMAIN_TERMS.baket}</span>
              <SearchableSelect
                value={query.validationStatus || ALL_FILTERS}
                options={validationStatusOptions}
                onValueChange={(value) => selectFilterValue("validationStatus", value)}
                placeholder={operationalFilterPlaceholder ?? `Semua verifikasi ${DOMAIN_TERMS.baket}`}
                searchPlaceholder="Cari verifikasi Baket..."
                emptyText="Verifikasi Baket tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label={`Filter verifikasi ${DOMAIN_TERMS.baket}`}
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Jenis Produk Intelijen</span>
              <SearchableSelect
                value={query.productTypeId || ALL_FILTERS}
                options={productTypeOptions}
                onValueChange={(value) => selectFilterValue("productTypeId", value)}
                placeholder={operationalFilterPlaceholder ?? "Semua jenis produk"}
                searchPlaceholder="Cari jenis produk..."
                emptyText="Jenis produk tidak ditemukan."
                disabled={operationalFilterDisabled || productTypeOptions.length <= 1}
                aria-label="Filter jenis produk intelijen"
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Lampiran</span>
              <SearchableSelect
                value={query.hasAttachment || ALL_FILTERS}
                options={attachmentOptions}
                onValueChange={(value) => selectFilterValue("hasAttachment", value)}
                placeholder={operationalFilterPlaceholder ?? "Semua kondisi lampiran"}
                searchPlaceholder="Cari kondisi lampiran..."
                emptyText="Kondisi lampiran tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label="Filter lampiran dashboard"
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Sumber Lokasi</span>
              <SearchableSelect
                value={query.coordinateSource || ALL_FILTERS}
                options={coordinateSourceOptions}
                onValueChange={(value) => selectFilterValue("coordinateSource", value)}
                placeholder={operationalFilterPlaceholder ?? "Semua sumber lokasi"}
                searchPlaceholder="Cari sumber lokasi..."
                emptyText="Sumber lokasi tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label="Filter sumber lokasi dashboard"
              />
            </div>
            <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
              <span>Kesesuaian Lokasi</span>
              <SearchableSelect
                value={query.locationSuitability || ALL_FILTERS}
                options={locationSuitabilityOptions}
                onValueChange={(value) => selectFilterValue("locationSuitability", value)}
                placeholder={operationalFilterPlaceholder ?? "Semua kesesuaian lokasi"}
                searchPlaceholder="Cari kesesuaian lokasi..."
                emptyText="Kesesuaian lokasi tidak ditemukan."
                disabled={operationalFilterDisabled}
                aria-label="Filter kesesuaian lokasi dashboard"
              />
            </div>
            {sourceOptions.length > 2 || query.source ? (
              <div className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                <span>Sumber Laporan</span>
                <SearchableSelect
                  value={query.source || ALL_FILTERS}
                  options={sourceOptions}
                  onValueChange={(value) => selectFilterValue("source", value)}
                  placeholder={operationalFilterPlaceholder ?? "Semua sumber laporan"}
                  searchPlaceholder="Cari sumber laporan..."
                  emptyText="Sumber laporan tidak ditemukan."
                  disabled={operationalFilterDisabled || sourceOptions.length <= 1}
                  aria-label="Filter sumber laporan dashboard"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
