"use client";

import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { buildMapAreaHierarchyOptions } from "./maps-intelijen-area-hierarchy";
import {
  COMPLETENESS_PRESENTATION,
  DATA_TYPE_PRESENTATION,
  LOCATION_SUITABILITY_PRESENTATION,
  URGENCY_PRESENTATION,
} from "./maps-intelijen-presentation";
import type {
  MapAreaFilterOptions,
  MapEntityFilterOption,
  MapNetworkFilters,
  MarkerColorMode,
  VisualizationMode,
} from "./maps-intelijen-types";

interface MapsIntelijenToolbarProps {
  filters: MapNetworkFilters;
  onChange: (patch: Partial<MapNetworkFilters>) => void;
  visualization: VisualizationMode;
  onVisualizationChange: (value: VisualizationMode) => void;
  colorMode: MarkerColorMode;
  onColorModeChange: (value: MarkerColorMode) => void;
  categories: Array<{ id: string; name: string }>;
  fieldOfficerOptions: MapEntityFilterOption[];
  jaringOptions: MapEntityFilterOption[];
  areaOptions: MapAreaFilterOptions;
  agentStates: Array<"active" | "last_known">;
  activeFilterCount: number;
  onReset: () => void;
}

const controlClass = "min-h-11 rounded-md border border-input bg-background px-3 text-sm";

export function MapsIntelijenToolbar({
  filters,
  onChange,
  visualization,
  onVisualizationChange,
  colorMode,
  onColorModeChange,
  categories,
  fieldOfficerOptions,
  jaringOptions,
  areaOptions,
  agentStates,
  activeFilterCount,
  onReset,
}: MapsIntelijenToolbarProps) {
  const areaHierarchyOptions = buildMapAreaHierarchyOptions(areaOptions, filters);

  return (
    <section aria-label="Toolbar peta" className="rounded-xl border bg-card p-3 shadow-xs">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label htmlFor="map-network-search" className="relative min-w-0 flex-1">
          <span className="sr-only">Cari laporan, Jaring, Baket, atau wilayah</span>
          <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted-foreground" />
          <Input
            id="map-network-search"
            value={filters.search}
            onChange={(event) => onChange({ search: event.target.value })}
            placeholder="Cari referensi, judul, Jaring, Baket, atau wilayah…"
            className="min-h-11 pl-9"
          />
        </label>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:flex">
          <label className="grid gap-1 text-[11px] text-muted-foreground">
            Tampilan
            <select
              value={visualization}
              onChange={(event) => onVisualizationChange(event.target.value as VisualizationMode)}
              className={controlClass}
            >
              <option value="marker">Marker</option>
              <option value="cluster">Cluster</option>
              <option value="heatmap">Heatmap</option>
            </select>
          </label>
          <label className="grid gap-1 text-[11px] text-muted-foreground">
            Jenis Data
            <select
              value={filters.dataType}
              onChange={(event) => onChange({ dataType: event.target.value as MapNetworkFilters["dataType"] })}
              className={controlClass}
            >
              <option value="ALL">Semua</option>
              <option value="REPORT">{DATA_TYPE_PRESENTATION.report.label}</option>
              <option value="BAKET">{DATA_TYPE_PRESENTATION.baket.label}</option>
              <option value="AGENT">{DATA_TYPE_PRESENTATION.agent.label}</option>
            </select>
          </label>
          <label className="grid gap-1 text-[11px] text-muted-foreground">
            Warna Marker
            <select
              value={colorMode}
              onChange={(event) => onColorModeChange(event.target.value as MarkerColorMode)}
              className={controlClass}
              disabled={visualization === "heatmap"}
            >
              <option value="completeness">Kelengkapan</option>
              <option value="validity">Validitas</option>
              <option value="urgency">Urgensi</option>
              <option value="category">Kategori</option>
            </select>
          </label>
          <label className="grid gap-1 text-[11px] text-muted-foreground">
            Periode
            <select
              value={filters.period}
              onChange={(event) => onChange({ period: event.target.value as MapNetworkFilters["period"] })}
              className={controlClass}
            >
              <option value="ALL">Semua Waktu</option>
              <option value="TODAY">Hari Ini</option>
              <option value="LAST_7_DAYS">7 Hari Terakhir</option>
              <option value="LAST_30_DAYS">30 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Berjalan</option>
              <option value="CUSTOM">Rentang Kustom</option>
            </select>
          </label>
        </div>
      </div>

      <details className="group mt-3 rounded-lg border bg-muted/25 p-3">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-sm">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4" /> Filter lanjutan
          </span>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-primary text-xs">{activeFilterCount} aktif</span>
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {filters.period === "CUSTOM" ? (
            <>
              <label htmlFor="map-network-start-date" className="grid gap-1 text-xs">
                Mulai
                <Input
                  id="map-network-start-date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => onChange({ startDate: e.target.value })}
                />
              </label>
              <label htmlFor="map-network-end-date" className="grid gap-1 text-xs">
                Selesai
                <Input
                  id="map-network-end-date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => onChange({ endDate: e.target.value })}
                />
              </label>
            </>
          ) : null}
          <FilterSelect
            label="Kelengkapan"
            value={filters.completeness}
            onChange={(value) => onChange({ completeness: value as MapNetworkFilters["completeness"] })}
            options={[
              ["ALL", "Semua"],
              ["COMPLETE", COMPLETENESS_PRESENTATION.COMPLETE.label],
              ["INCOMPLETE", COMPLETENESS_PRESENTATION.INCOMPLETE.label],
            ]}
          />
          <FilterSelect
            label="Urgensi"
            value={filters.urgency}
            onChange={(value) => onChange({ urgency: value as MapNetworkFilters["urgency"] })}
            options={[
              ["ALL", "Semua"],
              ["URGENT", URGENCY_PRESENTATION.URGENT.label],
              ["HIGH", URGENCY_PRESENTATION.HIGH.label],
              ["NORMAL", URGENCY_PRESENTATION.NORMAL.label],
              ["LOW", URGENCY_PRESENTATION.LOW.label],
            ]}
          />
          <FilterSelect
            label="Status Personel"
            value={filters.agentState}
            onChange={(value) => onChange({ agentState: value as MapNetworkFilters["agentState"] })}
            options={[
              ["ALL", "Semua"],
              ...agentStates.map(
                (state) => [state, state === "active" ? "Aktif" : "Lokasi Terakhir"] as [string, string],
              ),
            ]}
          />
          <FilterSelect
            label="Kesesuaian Wilayah"
            value={filters.suitability}
            onChange={(value) => onChange({ suitability: value })}
            options={[
              ["ALL", "Semua"],
              ["WITHIN_SCOPE", LOCATION_SUITABILITY_PRESENTATION.WITHIN_SCOPE.label],
              ["OUTSIDE_SCOPE", LOCATION_SUITABILITY_PRESENTATION.OUTSIDE_SCOPE.label],
              ["BORDER_AMBIGUOUS", LOCATION_SUITABILITY_PRESENTATION.BORDER_AMBIGUOUS.label],
              ["NOT_DETERMINED", LOCATION_SUITABILITY_PRESENTATION.NOT_DETERMINED.label],
            ]}
          />
          <label className="grid gap-1 text-xs">
            Kategori
            <select
              className={controlClass}
              value={filters.categoryId}
              onChange={(e) => onChange({ categoryId: e.target.value })}
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <FilterSelect
            label="Petugas Wilayah (Gaswil)"
            value={filters.fieldOfficerAssignmentId}
            onChange={(fieldOfficerAssignmentId) => onChange({ fieldOfficerAssignmentId })}
            options={[
              ["ALL", "Semua Petugas Wilayah"],
              ...fieldOfficerOptions.map((item) => [item.id, item.label] as [string, string]),
            ]}
          />
          <FilterSelect
            label="Jaring"
            value={filters.jaringId}
            onChange={(jaringId) => onChange({ jaringId })}
            options={[
              ["ALL", "Semua Jaring"],
              ...jaringOptions.map((item) => [item.id, item.label] as [string, string]),
            ]}
          />
          <FilterSelect
            label="Provinsi"
            value={filters.provinceId}
            disabled={areaOptions.loadingLevel === "province"}
            onChange={(provinceId) =>
              onChange({ provinceId, regencyId: "ALL", districtId: "ALL", villageId: "ALL" })
            }
            options={areaHierarchyOptions.provinces}
          />
          <FilterSelect
            label="Kabupaten/Kota"
            value={filters.regencyId}
            disabled={filters.provinceId === "ALL" || areaOptions.loadingLevel === "regency"}
            onChange={(regencyId) => onChange({ regencyId, districtId: "ALL", villageId: "ALL" })}
            options={areaHierarchyOptions.regencies}
          />
          <FilterSelect
            label="Kecamatan"
            value={filters.districtId}
            disabled={filters.regencyId === "ALL" || areaOptions.loadingLevel === "district"}
            onChange={(districtId) => onChange({ districtId, villageId: "ALL" })}
            options={areaHierarchyOptions.districts}
          />
          <FilterSelect
            label="Kelurahan/Desa"
            value={filters.villageId}
            disabled={filters.districtId === "ALL" || areaOptions.loadingLevel === "village"}
            onChange={(villageId) => onChange({ villageId })}
            options={areaHierarchyOptions.villages}
          />
          <label className="grid gap-1 text-xs">
            Personel aktif (menit)
            <Input
              type="number"
              min={1}
              max={1440}
              value={filters.activeWithinMinutes}
              onChange={(event) =>
                onChange({
                  activeWithinMinutes: Math.max(
                    1,
                    Math.min(1440, filters.lastKnownWithinHours * 60, Number(event.target.value) || 1),
                  ),
                })
              }
            />
          </label>
          <label className="grid gap-1 text-xs">
            Lokasi terakhir (jam)
            <Input
              type="number"
              min={1}
              max={2160}
              value={filters.lastKnownWithinHours}
              onChange={(event) =>
                onChange({
                  lastKnownWithinHours: Math.max(
                    Math.ceil(filters.activeWithinMinutes / 60),
                    Math.min(2160, Number(event.target.value) || 1),
                  ),
                })
              }
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={onReset} className="min-h-11 gap-2">
            <RotateCcw className="size-4" /> Reset Filter
          </Button>
        </div>
      </details>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs">
      {label}
      <select
        className={controlClass}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
