"use client";

import { geoMercator, geoPath } from "d3-geo";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
const DIRECTORATE_PALETTE = [
  "#0f4c81",
  "#7c3aed",
  "#0f766e",
  "#b45309",
  "#be123c",
  "#0369a1",
  "#4338ca",
  "#166534",
];
const FALLBACK_BOUNDS = {
  minLongitude: 93,
  maxLongitude: 143,
  minLatitude: -12,
  maxLatitude: 9,
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

function areSameProvinceSelection(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSet = new Set(left);
  return right.every((item) => leftSet.has(item));
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

  function handleSelectBinda(provinceId: string) {
    onChange(areSameProvinceSelection(selectedProvinceIds, [provinceId]) ? [] : [provinceId]);
  }

  function handleSelectDirectorate(directorate: RegionalMasterDirectorate) {
    const coverageProvinceIds = getDirectorateCoverageIds(directorate);
    onChange(toggleDirectorateCoverage(selectedProvinceIds, coverageProvinceIds));
  }

  function handleMapSelection(provinceId: string) {
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

  return (
    <Card className="overflow-hidden border border-border/70">
      <CardHeader>
        <CardTitle>Peta Wilayah Sasaran</CardTitle>
        <CardDescription>
          Pilih sasaran STR lewat provinsi, Binda, atau Direktorat. Saat memilih Direktorat, seluruh provinsi
          coverage-nya langsung ikut ditandai pada peta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={selectionMode === "all" ? "default" : "outline"}
            onClick={() => onSelectionModeChange("all")}
          >
            Semua
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectionMode === "binda" ? "default" : "outline"}
            onClick={() => onSelectionModeChange("binda")}
            disabled={!bindaOptions.length}
          >
            Pilih Binda
          </Button>
          <Button
            type="button"
            size="sm"
            variant={selectionMode === "directorate" ? "default" : "outline"}
            onClick={() => onSelectionModeChange("directorate")}
            disabled={!directorateOptions.length}
          >
            Pilih Direktorat
          </Button>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top,#12324f,transparent_45%),linear-gradient(180deg,#07131f,#0b1726)]">
          <div className="absolute left-4 top-4 z-10 max-w-sm rounded-xl border border-white/10 bg-black/55 p-3 text-white shadow-2xl backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Preview Wilayah</div>
            <div className="mt-2 text-base font-medium">
              {hoveredProvince?.name ?? "Arahkan kursor ke provinsi"}
            </div>
            <div className="mt-1 text-xs text-slate-200/80">
              {hoveredProvince
                ? selectionMode === "directorate"
                  ? `${hoveredDirectorate?.name ?? "Belum ada direktorat"} | ${hoveredDirectorate ? getDirectorateCoverageIds(hoveredDirectorate).length : 0} provinsi coverage | ${hoveredProvincePreview?.recipients.length ?? 0} recipient regional`
                  : `${hoveredProvinceSummary?.binda?.name ?? "Belum ada Binda"} | ${hoveredProvinceSummary?.directorates.length ?? 0} direktorat coverage | ${hoveredProvincePreview?.recipients.length ?? 0} recipient regional`
                : selectionMode === "directorate"
                  ? "Klik salah satu provinsi di blok direktorat untuk memilih seluruh coverage direktorat tersebut."
                  : selectionMode === "binda"
                    ? "Klik provinsi yang memiliki Binda untuk memilih satu provinsi sasaran."
                    : "Klik provinsi mana pun untuk menyusun distribusi penuh ke seluruh jalur yang relevan."}
            </div>
          </div>

          <div className="h-[460px] w-full">
            {hasProvinceBoundaries && pathGenerator ? (
              <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-full">
                <g>
                  {featureCollection.features.map((feature) => {
                    const provinceId = feature.properties?.areaId;
                    const pathData = pathGenerator(feature);

                    if (!provinceId || !pathData) {
                      return null;
                    }

                    const summary = summaryMap.get(provinceId);
                    const mappedDirectorate = provinceDirectorateMap.get(provinceId);
                    const isSelected =
                      selectionMode === "directorate" && mappedDirectorate
                        ? areSameProvinceSelection(
                            selectedProvinceIds,
                            getDirectorateCoverageIds(mappedDirectorate),
                          )
                        : selectedProvinceIds.includes(provinceId);
                    const hasRecipient = Boolean(feature.properties?.hasRecipient);
                    const hasBinda = Boolean(summary?.binda);
                    const hasDirectorate = Boolean(summary?.directorates.length);
                    const directorateColor = mappedDirectorate
                      ? directorateColorMap.get(mappedDirectorate.unitId) ?? "#334155"
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
                      <path
                        key={provinceId}
                        d={pathData}
                        fill={fill}
                        fillOpacity={fillOpacity}
                        stroke={stroke}
                        strokeWidth={isSelected ? 1.8 : 0.9}
                        strokeOpacity={0.95}
                        className={`transition-all duration-150 hover:fill-opacity-100 ${
                          (selectionMode === "binda" && !hasBinda) ||
                          (selectionMode === "directorate" && !mappedDirectorate)
                            ? "cursor-not-allowed"
                            : "cursor-pointer"
                        }`}
                        onMouseEnter={() => setHoveredProvinceId(provinceId)}
                        onMouseLeave={() => setHoveredProvinceId(null)}
                        onClick={() => handleMapSelection(provinceId)}
                      />
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
                  const isSelected =
                    selectionMode === "directorate" && mappedDirectorate
                      ? areSameProvinceSelection(selectedProvinceIds, getDirectorateCoverageIds(mappedDirectorate))
                      : selectedProvinceIds.includes(summary.province.id);

                  return (
                    <button
                      key={summary.province.id}
                      type="button"
                      className="group absolute -translate-x-1/2 -translate-y-1/2"
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
                        className={`mt-1 block rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm transition ${
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
