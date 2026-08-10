"use client";

import { type KeyboardEvent, useCallback, useEffect, useMemo, useState } from "react";

import { geoMercator, geoPath } from "d3-geo";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  ProvinceBoundaryCollection,
  ProvinceOption,
  RegionalMasterDirectorate,
  RegionalMasterOverview,
  RegionalRecipientPreview,
} from "@/features/directives/types";

import { buildProvinceBoundaryCollection } from "./directive-distribution";

type DirectiveTargetMode = "all" | "binda" | "directorate";

type ProvinceMapSelectorProps = {
  provinces: ProvinceOption[];
  boundaries: ProvinceBoundaryCollection;
  selectedProvinceIds: string[];
  preview: RegionalRecipientPreview[];
  regionalMasters: RegionalMasterOverview | null;
  selectionMode: DirectiveTargetMode;
  onSelectionModeChange: (mode: DirectiveTargetMode) => void;
  onChange: (nextProvinceIds: string[]) => void;
};

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 460;
const DIRECTORATE_PALETTE = ["#0f4c81", "#7c3aed", "#0f766e", "#b45309", "#be123c", "#0369a1", "#4338ca", "#166534"];
const FALLBACK_BOUNDS = {
  minLongitude: 93,
  maxLongitude: 143,
  minLatitude: -12,
  maxLatitude: 9,
};
const ROWS_PER_PAGE_OPTIONS = [5, 10, 15, 25] as const;

type TargetOptionRow =
  | {
      key: string;
      type: "binda";
      title: string;
      code: string;
      scope: string;
      coverageNames: string[];
      provinceId: string;
    }
  | {
      key: string;
      type: "directorate";
      title: string;
      code: string;
      scope: string;
      coverageNames: string[];
      directorate: RegionalMasterDirectorate;
    };

function uniqBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toggleProvince(selectedProvinceIds: string[], provinceId: string) {
  if (selectedProvinceIds.includes(provinceId)) {
    return selectedProvinceIds.filter((item) => item !== provinceId);
  }

  return [...selectedProvinceIds, provinceId];
}

function flattenDirectorates(regionalMasters: RegionalMasterOverview | null) {
  return uniqBy(
    regionalMasters?.provinces.flatMap((province) => province.directorates) ?? [],
    (directorate) => directorate.unitId,
  ).sort((left, right) => left.name.localeCompare(right.name));
}

function getDirectorateCoverageIds(directorate: RegionalMasterDirectorate) {
  return uniqBy(
    directorate.coverageAreas.map((coverage) => coverage.areaId),
    (areaId) => areaId,
  );
}

function toggleDirectorateCoverage(selectedProvinceIds: string[], coverageProvinceIds: string[]) {
  const selectedSet = new Set(selectedProvinceIds);
  const fullySelected = coverageProvinceIds.every((provinceId) => selectedSet.has(provinceId));

  if (fullySelected) {
    return selectedProvinceIds.filter((provinceId) => !coverageProvinceIds.includes(provinceId));
  }

  return Array.from(new Set([...selectedProvinceIds, ...coverageProvinceIds]));
}

function getPageItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const candidates = [1, currentPage - 1, currentPage, currentPage + 1, totalPages].filter(
    (page) => page >= 1 && page <= totalPages,
  );

  return Array.from(new Set(candidates)).sort((left, right) => left - right);
}

function isActivationKey(event: KeyboardEvent) {
  return event.key === "Enter" || event.key === " ";
}

export function ProvinceMapSelector({
  provinces,
  boundaries,
  selectedProvinceIds,
  preview,
  regionalMasters,
  selectionMode,
  onSelectionModeChange,
  onChange,
}: ProvinceMapSelectorProps) {
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const [mapSelectionEnabled, setMapSelectionEnabled] = useState(false);
  const [targetPage, setTargetPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<(typeof ROWS_PER_PAGE_OPTIONS)[number]>(5);

  const featureCollection = useMemo(
    () => buildProvinceBoundaryCollection(boundaries, provinces, preview, selectedProvinceIds),
    [boundaries, preview, provinces, selectedProvinceIds],
  );
  const summaryMap = useMemo(
    () => new Map((regionalMasters?.provinces ?? []).map((item) => [item.province.id, item])),
    [regionalMasters],
  );
  const provinceMap = useMemo(() => new Map(provinces.map((province) => [province.id, province])), [provinces]);
  const previewMap = useMemo(() => new Map(preview.map((item) => [item.provinceId, item])), [preview]);
  const bindaOptions = useMemo(
    () =>
      (regionalMasters?.provinces ?? [])
        .filter((item) => item.binda)
        .map((item) => ({
          provinceId: item.province.id,
          provinceCode: item.province.code,
          provinceName: item.province.name,
          bindaCode: item.binda?.code ?? "-",
          bindaName: item.binda?.name ?? "Binda",
        })),
    [regionalMasters],
  );
  const directorateOptions = useMemo(() => flattenDirectorates(regionalMasters), [regionalMasters]);
  const hoveredProvinceSummary = hoveredProvinceId ? summaryMap.get(hoveredProvinceId) : null;
  const hoveredProvincePreview = hoveredProvinceId ? previewMap.get(hoveredProvinceId) : null;
  const hoveredProvince = hoveredProvinceId ? provinceMap.get(hoveredProvinceId) : null;
  const hoveredDirectorate = useMemo(() => {
    if (!hoveredProvinceSummary?.directorates.length) {
      return null;
    }

    return [...hoveredProvinceSummary.directorates].sort((left, right) => {
      const leftPriority = left.primaryProvinceAreaId === hoveredProvinceId ? 1 : 0;
      const rightPriority = right.primaryProvinceAreaId === hoveredProvinceId ? 1 : 0;
      return rightPriority - leftPriority || left.name.localeCompare(right.name);
    })[0];
  }, [hoveredProvinceId, hoveredProvinceSummary]);
  const hasProvinceBoundaries = featureCollection.features.length > 0;
  const fallbackMarkerProvinces = useMemo(
    () =>
      (regionalMasters?.provinces ?? []).filter(
        (item) =>
          item.province.centroidLatitude !== null &&
          item.province.centroidLatitude !== undefined &&
          item.province.centroidLongitude !== null &&
          item.province.centroidLongitude !== undefined,
      ),
    [regionalMasters],
  );
  const projection = useMemo(() => {
    if (!hasProvinceBoundaries) {
      return null;
    }

    return geoMercator().fitExtent(
      [
        [18, 18],
        [MAP_WIDTH - 18, MAP_HEIGHT - 18],
      ],
      featureCollection as Parameters<ReturnType<typeof geoMercator>["fitExtent"]>[1],
    );
  }, [featureCollection, hasProvinceBoundaries]);
  const pathGenerator = useMemo(() => (projection ? geoPath(projection) : null), [projection]);
  const selectedDirectorateCount = useMemo(() => {
    if (selectionMode !== "directorate") {
      return 0;
    }

    return directorateOptions.filter((directorate) =>
      getDirectorateCoverageIds(directorate).every((provinceId) => selectedProvinceIds.includes(provinceId)),
    ).length;
  }, [directorateOptions, selectedProvinceIds, selectionMode]);
  const selectedBindaCount = useMemo(() => {
    if (selectionMode !== "binda") {
      return 0;
    }

    return selectedProvinceIds.filter((provinceId) => Boolean(summaryMap.get(provinceId)?.binda)).length;
  }, [selectedProvinceIds, selectionMode, summaryMap]);
  const directorateColorMap = useMemo(
    () =>
      new Map(
        directorateOptions.map((directorate, index) => [
          directorate.unitId,
          DIRECTORATE_PALETTE[index % DIRECTORATE_PALETTE.length],
        ]),
      ),
    [directorateOptions],
  );
  const provinceDirectorateMap = useMemo(() => {
    return new Map(
      (regionalMasters?.provinces ?? []).map((summary) => {
        const mappedDirectorate =
          [...summary.directorates].sort((left, right) => {
            const leftPriority = left.primaryProvinceAreaId === summary.province.id ? 1 : 0;
            const rightPriority = right.primaryProvinceAreaId === summary.province.id ? 1 : 0;
            return rightPriority - leftPriority || left.name.localeCompare(right.name);
          })[0] ?? null;

        return [summary.province.id, mappedDirectorate];
      }),
    );
  }, [regionalMasters]);
  const targetOptionRows = useMemo<TargetOptionRow[]>(() => {
    const rows: TargetOptionRow[] = [];

    if (selectionMode === "all" || selectionMode === "binda") {
      rows.push(
        ...bindaOptions.map((option) => ({
          key: `binda-${option.provinceId}`,
          type: "binda" as const,
          title: option.bindaName,
          code: option.bindaCode,
          scope: option.provinceName,
          coverageNames: [option.provinceName],
          provinceId: option.provinceId,
        })),
      );
    }

    if (selectionMode === "all" || selectionMode === "directorate") {
      rows.push(
        ...directorateOptions.map((directorate) => ({
          key: `directorate-${directorate.unitId}`,
          type: "directorate" as const,
          title: directorate.name,
          code: directorate.profileCode ?? directorate.code,
          scope: directorate.parentUnitName ?? "Direktorat",
          coverageNames: directorate.coverageAreas.map((coverage) => coverage.name),
          directorate,
        })),
      );
    }

    return rows;
  }, [bindaOptions, directorateOptions, selectionMode]);
  const [targetSearch, setTargetSearch] = useState("");

  const filteredTargetOptionRows = useMemo(() => {
    if (!targetSearch.trim()) {
      return targetOptionRows;
    }
    const query = targetSearch.toLowerCase();
    return targetOptionRows.filter(
      (row) =>
        row.title.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query) ||
        row.scope.toLowerCase().includes(query) ||
        row.coverageNames.some((n) => n.toLowerCase().includes(query)),
    );
  }, [targetOptionRows, targetSearch]);

  const totalTargetPages = Math.max(1, Math.ceil(filteredTargetOptionRows.length / rowsPerPage));
  const pageItems = useMemo(() => getPageItems(targetPage, totalTargetPages), [targetPage, totalTargetPages]);
  const paginatedTargetRows = useMemo(() => {
    const start = (targetPage - 1) * rowsPerPage;
    return filteredTargetOptionRows.slice(start, start + rowsPerPage);
  }, [rowsPerPage, filteredTargetOptionRows, targetPage]);

  useEffect(() => {
    setTargetPage(1);
  }, []);

  useEffect(() => {
    setTargetPage((current) => Math.min(current, totalTargetPages));
  }, [totalTargetPages]);

  function handleSelectBinda(provinceId: string) {
    onChange(toggleProvince(selectedProvinceIds, provinceId));
  }

  function handleSelectDirectorate(directorate: RegionalMasterDirectorate) {
    const coverageProvinceIds = getDirectorateCoverageIds(directorate);
    onChange(toggleDirectorateCoverage(selectedProvinceIds, coverageProvinceIds));
  }

  function handleMapSelection(provinceId: string) {
    if (!mapSelectionEnabled) {
      return;
    }

    if (selectionMode === "all") {
      onChange(toggleProvince(selectedProvinceIds, provinceId));
      return;
    }

    if (selectionMode === "binda") {
      const summary = summaryMap.get(provinceId);
      if (!summary?.binda) {
        return;
      }

      handleSelectBinda(provinceId);
      return;
    }

    const directorate = provinceDirectorateMap.get(provinceId);
    if (!directorate) {
      return;
    }

    handleSelectDirectorate(directorate);
  }

  function handleSelectTargetRow(row: TargetOptionRow) {
    if (row.type === "binda") {
      if (selectionMode !== "binda") {
        onSelectionModeChange("binda");
      }

      handleSelectBinda(row.provinceId);
      return;
    }

    if (selectionMode !== "directorate") {
      onSelectionModeChange("directorate");
    }

    handleSelectDirectorate(row.directorate);
  }

  const isTargetRowSelected = useCallback(
    (row: TargetOptionRow) => {
      if (row.type === "binda") {
        return selectedProvinceIds.includes(row.provinceId);
      }

      const coverageIds = getDirectorateCoverageIds(row.directorate);
      return coverageIds.length > 0 && coverageIds.every((provinceId) => selectedProvinceIds.includes(provinceId));
    },
    [selectedProvinceIds],
  );

  const allFilteredSelected = useMemo(() => {
    if (filteredTargetOptionRows.length === 0) {
      return false;
    }
    return filteredTargetOptionRows.every((row) => isTargetRowSelected(row));
  }, [filteredTargetOptionRows, isTargetRowSelected]);

  const _someFilteredSelected = useMemo(() => {
    if (filteredTargetOptionRows.length === 0) {
      return false;
    }
    return !allFilteredSelected && filteredTargetOptionRows.some((row) => isTargetRowSelected(row));
  }, [filteredTargetOptionRows, allFilteredSelected, isTargetRowSelected]);

  function handleSelectAllToggle() {
    if (allFilteredSelected) {
      // Deselect all filtered target rows.
      const idsToRemove = new Set<string>();
      for (const row of filteredTargetOptionRows) {
        if (row.type === "binda") {
          idsToRemove.add(row.provinceId);
        } else {
          const coverageIds = getDirectorateCoverageIds(row.directorate);
          for (const id of coverageIds) {
            idsToRemove.add(id);
          }
        }
      }
      const nextProvinceIds = selectedProvinceIds.filter((id) => !idsToRemove.has(id));
      onChange(nextProvinceIds);
    } else {
      // Select all filtered target rows.
      const idsToAdd = new Set(selectedProvinceIds);
      for (const row of filteredTargetOptionRows) {
        if (row.type === "binda") {
          idsToAdd.add(row.provinceId);
        } else {
          const coverageIds = getDirectorateCoverageIds(row.directorate);
          for (const id of coverageIds) {
            idsToAdd.add(id);
          }
        }
      }
      onChange(Array.from(idsToAdd));
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden border border-border/70">
      <CardHeader>
        <CardTitle>Peta Wilayah Sasaran</CardTitle>
        <CardDescription>
          Pilih sasaran STR lewat provinsi, Binda, atau Direktorat. Saat memilih Direktorat, seluruh provinsi
          cakupannya langsung ikut ditandai pada peta.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={selectionMode === "all" ? "default" : "outline"}
              onClick={() => {
                onSelectionModeChange("all");
                setTargetPage(1);
              }}
            >
              Semua
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectionMode === "binda" ? "default" : "outline"}
              onClick={() => {
                onSelectionModeChange("binda");
                setTargetPage(1);
              }}
              disabled={!bindaOptions.length}
            >
              Pilih Binda
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectionMode === "directorate" ? "default" : "outline"}
              onClick={() => {
                onSelectionModeChange("directorate");
                setTargetPage(1);
              }}
              disabled={!directorateOptions.length}
            >
              Pilih Direktorat
            </Button>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-[var(--dc-border-subtle)] bg-background/40 px-3 py-2 text-sm">
            <Switch
              checked={mapSelectionEnabled}
              onCheckedChange={setMapSelectionEnabled}
              aria-label="Aktifkan pilih lewat peta"
            />
            <span>Pilih lewat peta</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top,#12324f,transparent_45%),linear-gradient(180deg,#07131f,#0b1726)]">
          {!mapSelectionEnabled && <div className="absolute inset-0 z-30 cursor-not-allowed bg-transparent" />}

          <div className="absolute top-4 left-4 z-10 max-w-sm rounded-xl border border-white/10 bg-black/55 p-3 text-white shadow-2xl backdrop-blur">
            <div className="text-[11px] text-sky-200/80 uppercase tracking-[0.24em]">Pratinjau Wilayah</div>
            <div className="mt-2 font-medium text-base">{hoveredProvince?.name ?? "Arahkan kursor ke provinsi"}</div>
            <div className="mt-1 text-slate-200/80 text-xs">
              {hoveredProvince
                ? selectionMode === "directorate"
                  ? `${hoveredDirectorate?.name ?? "Belum ada direktorat"} | ${hoveredDirectorate ? getDirectorateCoverageIds(hoveredDirectorate).length : 0} provinsi cakupan | ${hoveredProvincePreview?.recipients.length ?? 0} penerima regional`
                  : `${hoveredProvinceSummary?.binda?.name ?? "Belum ada Binda"} | ${hoveredProvinceSummary?.directorates.length ?? 0} direktorat cakupan | ${hoveredProvincePreview?.recipients.length ?? 0} penerima regional`
                : selectionMode === "directorate"
                  ? "Klik salah satu provinsi di blok direktorat untuk memilih seluruh cakupan direktorat tersebut."
                  : selectionMode === "binda"
                    ? "Klik provinsi yang memiliki Binda untuk memilih satu provinsi sasaran."
                    : "Klik provinsi mana pun untuk menyusun distribusi penuh ke seluruh jalur yang relevan."}
            </div>
          </div>

          <div
            className={`h-[460px] w-full transition-all duration-300 ${
              mapSelectionEnabled ? "opacity-100" : "pointer-events-none opacity-70 grayscale-[25%]"
            }`}
            aria-disabled={!mapSelectionEnabled ? "true" : undefined}
          >
            {hasProvinceBoundaries && pathGenerator ? (
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                className="h-full w-full"
                role="img"
                aria-label="Peta pilihan wilayah sasaran STR"
              >
                <g>
                  {featureCollection.features.map((feature) => {
                    const provinceId = feature.properties?.areaId;
                    const pathData = pathGenerator(feature);

                    if (!provinceId || !pathData) {
                      return null;
                    }

                    const summary = summaryMap.get(provinceId);
                    const mappedDirectorate = provinceDirectorateMap.get(provinceId);
                    const isSelected = selectedProvinceIds.includes(provinceId);
                    const hasRecipient = Boolean(feature.properties?.hasRecipient);
                    const hasBinda = Boolean(summary?.binda);
                    const hasDirectorate = Boolean(summary?.directorates.length);
                    const directorateColor = mappedDirectorate
                      ? (directorateColorMap.get(mappedDirectorate.unitId) ?? "#334155")
                      : "#334155";
                    const fill =
                      selectionMode === "directorate"
                        ? isSelected
                          ? directorateColor
                          : mappedDirectorate
                            ? `${directorateColor}cc`
                            : "#203449"
                        : isSelected
                          ? hasRecipient
                            ? "#0ea5e9"
                            : "#f97316"
                          : hasBinda
                            ? "#17304f"
                            : hasDirectorate
                              ? "#1f2937"
                              : "#203449";
                    const stroke =
                      selectionMode === "directorate"
                        ? isSelected
                          ? "#f8fafc"
                          : mappedDirectorate
                            ? directorateColor
                            : "#4b5f76"
                        : isSelected
                          ? "#e0f2fe"
                          : hasRecipient
                            ? "#7dd3fc"
                            : "#4b5f76";
                    const fillOpacity =
                      selectionMode === "directorate"
                        ? isSelected
                          ? 0.9
                          : mappedDirectorate
                            ? 0.62
                            : 0.3
                        : isSelected
                          ? 0.88
                          : hasBinda || hasDirectorate
                            ? 0.56
                            : 0.38;

                    return (
                      <g key={provinceId}>
                        {/* biome-ignore lint/a11y/useSemanticElements: SVG province regions cannot be rendered as native buttons. */}
                        <path
                          d={pathData}
                          fill={fill}
                          fillOpacity={fillOpacity}
                          stroke={stroke}
                          strokeWidth={isSelected ? 1.8 : 0.9}
                          strokeOpacity={0.95}
                          role="button"
                          tabIndex={mapSelectionEnabled ? 0 : -1}
                          aria-label={`Pilih ${feature.properties?.name ?? "provinsi"}`}
                          className={`transition-all duration-150 hover:fill-opacity-100 focus:outline-none ${
                            !mapSelectionEnabled ||
                            (selectionMode === "binda" && !hasBinda) ||
                            (selectionMode === "directorate" && !mappedDirectorate)
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          }`}
                          onMouseEnter={() => setHoveredProvinceId(provinceId)}
                          onMouseLeave={() => setHoveredProvinceId(null)}
                          onClick={() => handleMapSelection(provinceId)}
                          onKeyDown={(event) => {
                            if (isActivationKey(event)) {
                              event.preventDefault();
                              handleMapSelection(provinceId);
                            }
                          }}
                        />
                      </g>
                    );
                  })}
                </g>
              </svg>
            ) : (
              <div className="relative h-full w-full">
                {fallbackMarkerProvinces.map((summary) => {
                  const longitude = summary.province.centroidLongitude;
                  const latitude = summary.province.centroidLatitude;

                  if (typeof longitude !== "number" || typeof latitude !== "number") {
                    return null;
                  }

                  const left =
                    ((longitude - FALLBACK_BOUNDS.minLongitude) /
                      (FALLBACK_BOUNDS.maxLongitude - FALLBACK_BOUNDS.minLongitude)) *
                    100;
                  const top =
                    ((FALLBACK_BOUNDS.maxLatitude - latitude) /
                      (FALLBACK_BOUNDS.maxLatitude - FALLBACK_BOUNDS.minLatitude)) *
                    100;
                  const mappedDirectorate = provinceDirectorateMap.get(summary.province.id);
                  const isSelected = selectedProvinceIds.includes(summary.province.id);

                  return (
                    <button
                      key={summary.province.id}
                      type="button"
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 ${
                        mapSelectionEnabled ? "" : "cursor-not-allowed opacity-70"
                      }`}
                      tabIndex={mapSelectionEnabled ? 0 : -1}
                      style={{ left: `${left}%`, top: `${top}%` }}
                      onMouseEnter={() => setHoveredProvinceId(summary.province.id)}
                      onMouseLeave={() => setHoveredProvinceId(null)}
                      onClick={() => handleMapSelection(summary.province.id)}
                    >
                      <span
                        className={`mx-auto block size-4 rounded-full border-2 shadow-lg transition ${
                          selectionMode === "directorate" && mappedDirectorate
                            ? isSelected
                              ? "border-white bg-sky-400"
                              : "border-slate-100 bg-violet-500"
                            : isSelected
                              ? "border-sky-100 bg-sky-500"
                              : selectionMode === "binda" && !summary.binda
                                ? "border-slate-300/40 bg-slate-600"
                                : "border-slate-100 bg-slate-500"
                        }`}
                      />
                      <span
                        className={`mt-1 block rounded-full px-2 py-0.5 font-medium text-[11px] shadow-sm transition ${
                          isSelected ? "bg-sky-600 text-white" : "bg-white/90 text-slate-700 group-hover:bg-white"
                        }`}
                      >
                        {summary.province.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-md border border-[var(--dc-border-subtle)] bg-background/35">
          {/* Section Header */}
          <div className="border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/40 p-3.5">
            <div className="font-semibold text-[var(--dc-text-primary)] text-sm">Daftar Binda & Direktorat</div>
            <div className="mt-0.5 text-muted-foreground text-xs">
              Pilih target dari daftar ini bila tidak ingin menggunakan klik pada peta.
            </div>
          </div>

          {/* Extensible Enterprise Dashboard Toolbar */}
          <div className="flex h-11 items-center justify-between gap-4 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-surface-raised)]/40 px-3.5 py-2">
            {/* Left: Extensible filter and search section */}
            <div className="flex flex-1 items-center gap-3">
              <div className="relative w-full max-w-[280px]">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <Input
                  type="text"
                  placeholder="Cari Binda / Direktorat..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  className="h-8 w-full border-[var(--dc-border-subtle)] bg-background/30 pl-8 text-xs focus:border-primary/50 focus:outline-none"
                />
              </div>
              {/* Extensibility placeholder for filters, reset filters, etc. */}
              {targetSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTargetSearch("")}
                  className="h-8 px-2 font-mono text-muted-foreground text-xs hover:text-foreground"
                >
                  Bersihkan
                </Button>
              )}
            </div>

            {/* Right: Actions section */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={allFilteredSelected ? "default" : "outline"}
                onClick={handleSelectAllToggle}
                className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] font-mono text-xs"
              >
                {allFilteredSelected ? "BATALKAN SEMUA" : "PILIH SEMUA"}
              </Button>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Nama Target</TableHead>
                  <TableHead>Kode</TableHead>
                  <TableHead>Cakupan</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTargetRows.length ? (
                  paginatedTargetRows.map((row) => {
                    const selected = isTargetRowSelected(row);

                    return (
                      <TableRow key={row.key} data-state={selected ? "selected" : undefined}>
                        <TableCell>
                          <Badge variant="outline">{row.type === "binda" ? "Binda" : "Direktorat"}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {row.title}
                          <div className="text-muted-foreground text-xs">{row.scope}</div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.code}</TableCell>
                        <TableCell className="max-w-[16rem] whitespace-normal text-muted-foreground">
                          {row.coverageNames.slice(0, 3).join(", ")}
                          {row.coverageNames.length > 3 ? ` +${row.coverageNames.length - 3}` : ""}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              onClick={() => handleSelectTargetRow(row)}
                            >
                              {selected ? "Dipilih" : "Pilih"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      {targetSearch
                        ? "Tidak ada target Binda atau Direktorat yang cocok dengan pencarian Anda."
                        : "Tidak ada target Binda atau Direktorat pada mode ini."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-[var(--dc-divider)] border-t p-3">
            <div className="text-muted-foreground text-xs">
              Menampilkan {paginatedTargetRows.length ? (targetPage - 1) * rowsPerPage + 1 : 0}-
              {Math.min(targetPage * rowsPerPage, filteredTargetOptionRows.length)} dari{" "}
              {filteredTargetOptionRows.length} target.
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Baris</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value) as typeof rowsPerPage);
                    setTargetPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROWS_PER_PAGE_OPTIONS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      text="Sebelumnya"
                      aria-disabled={targetPage <= 1}
                      onClick={(event) => {
                        event.preventDefault();
                        setTargetPage((current) => Math.max(1, current - 1));
                      }}
                    />
                  </PaginationItem>
                  {pageItems.map((page) => (
                    <PaginationItem key={page}>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant={page === targetPage ? "outline" : "ghost"}
                        onClick={() => setTargetPage(page)}
                      >
                        {page}
                      </Button>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      text="Berikutnya"
                      aria-disabled={targetPage >= totalTargetPages}
                      onClick={(event) => {
                        event.preventDefault();
                        setTargetPage((current) => Math.min(totalTargetPages, current + 1));
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{selectedProvinceIds.length} provinsi dipilih</Badge>
          <Badge variant="outline">
            {selectionMode === "all"
              ? `${preview.reduce((total, item) => total + item.recipients.length, 0)} jalur regional`
              : selectionMode === "binda"
                ? `${selectedBindaCount} target Binda`
                : `${selectedDirectorateCount} target direktorat`}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
            disabled={!selectedProvinceIds.length}
          >
            Reset pilihan
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedProvinceIds.length ? (
            selectedProvinceIds.map((provinceId) => {
              const province = provinces.find((item) => item.id === provinceId);

              return (
                <button
                  key={provinceId}
                  type="button"
                  onClick={() => handleMapSelection(provinceId)}
                  className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-sm transition hover:bg-muted"
                >
                  {province?.name ?? "Provinsi"}
                </button>
              );
            })
          ) : (
            <div className="text-muted-foreground text-sm">
              Belum ada provinsi yang dipilih. Gunakan peta atau pilih lewat Binda/Direktorat.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
