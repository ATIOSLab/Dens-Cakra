"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { findDkiJakartaProvinceFilterId } from "@/lib/domain/area-filter";

import { MapsIntelijenAreaFilter } from "./maps-intelijen-area-filter";
import { normalizeMapAreas } from "./maps-intelijen-area-hierarchy";
import { MapsIntelijenDetailSheet } from "./maps-intelijen-detail-sheet";
import { MapsIntelijenHeader } from "./maps-intelijen-header";
import { MapsIntelijenMapView } from "./maps-intelijen-map-view";
import { MapsIntelijenPeriodFilter } from "./maps-intelijen-period-filter";
import { MapsIntelijenStats } from "./maps-intelijen-stats";
import {
  type AdministrativeAreaScope,
  EMPTY_MAP_RESPONSE,
  type HeatmapWeight,
  type MapArea,
  type MapAreaFilterOptions,
  type MapEntityFilterOption,
  type MapNetworkFeature,
  type MapNetworkFilters,
  type MapNetworkResponse,
  type MarkerColorMode,
  type VisualizationMode,
} from "./maps-intelijen-types";

type MapAreaAncestorLink = {
  ancestor: MapArea;
};

function scopeAreaToMapArea(area: AdministrativeAreaScope): MapArea {
  return {
    id: area.areaId,
    code: area.code,
    name: area.name,
    level: area.level,
    parentId: area.parentAreaId ?? null,
  };
}

const INITIAL_FILTERS: MapNetworkFilters = {
  search: "",
  period: "TODAY",
  startDate: "",
  endDate: "",
  dataType: "ALL",
  urgency: "ALL",
  categoryId: "ALL",
  fieldOfficerAssignmentId: "ALL",
  jaringId: "ALL",
  provinceId: "ALL",
  regencyId: "ALL",
  districtId: "ALL",
  villageId: "ALL",
  suitability: "ALL",
};

const INITIAL_MAP_LIMIT_PER_TYPE = 160;
const FOCUSED_MAP_LIMIT_PER_TYPE = 600;
const MAP_REQUEST_TIMEOUT_MS = 45_000;

function periodRange(filters: MapNetworkFilters) {
  const now = new Date();
  const end = now.toISOString();
  if (filters.period === "TODAY") {
    const value = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
    return { from: new Date(`${value}T00:00:00+07:00`).toISOString(), to: end };
  }
  if (filters.period === "LAST_7_DAYS")
    return {
      from: new Date(now.getTime() - 7 * 86_400_000).toISOString(),
      to: end,
    };
  if (filters.period === "LAST_14_DAYS")
    return {
      from: new Date(now.getTime() - 14 * 86_400_000).toISOString(),
      to: end,
    };
  if (filters.period === "LAST_30_DAYS")
    return {
      from: new Date(now.getTime() - 30 * 86_400_000).toISOString(),
      to: end,
    };
  return {
    ...(filters.startDate ? { from: new Date(`${filters.startDate}T00:00:00+07:00`).toISOString() } : {}),
    ...(filters.endDate ? { to: new Date(`${filters.endDate}T23:59:59.999+07:00`).toISOString() } : {}),
  };
}

function periodLabel(filters: MapNetworkFilters) {
  const labels = {
    TODAY: "Hari ini",
    LAST_7_DAYS: "7 hari terakhir",
    LAST_14_DAYS: "14 hari terakhir",
    LAST_30_DAYS: "30 hari terakhir",
    CUSTOM: "Rentang kustom",
  };
  if (filters.period !== "CUSTOM") return labels[filters.period];
  return filters.startDate || filters.endDate
    ? `${filters.startDate || "awal"} – ${filters.endDate || "sekarang"}`
    : "Rentang kustom";
}

function findAreaName(areaOptions: MapAreaFilterOptions, id: string) {
  return [...areaOptions.provinces, ...areaOptions.regencies, ...areaOptions.districts, ...areaOptions.villages].find(
    (area) => area.id === id,
  )?.name;
}

function buildMapAreaSubtitle(filters: MapNetworkFilters, areaOptions: MapAreaFilterOptions) {
  const regencyName = findAreaName(areaOptions, filters.regencyId);
  const districtName = findAreaName(areaOptions, filters.districtId);
  const villageName = findAreaName(areaOptions, filters.villageId);
  const provinceName = findAreaName(areaOptions, filters.provinceId);

  if (filters.villageId !== "ALL" && villageName) {
    return `Jumlah data Kecamatan ${districtName ?? "-"}, Kelurahan/Desa ${villageName}`;
  }
  if (filters.districtId !== "ALL" && districtName) return `Jumlah data Kecamatan ${districtName}`;
  if (filters.regencyId !== "ALL" && regencyName) return `Jumlah data Kota/Kabupaten ${regencyName}`;
  if (filters.provinceId !== "ALL" && provinceName) return `Jumlah data Provinsi ${provinceName}`;
  return "Jumlah data cakupan aktif";
}

function buildQuery(filters: MapNetworkFilters, debouncedSearch: string) {
  let types = "report,baket";
  if (filters.dataType === "REPORT") types = "report";
  if (filters.dataType === "BAKET") types = "baket";
  const selectedAreaId = [filters.villageId, filters.districtId, filters.regencyId, filters.provinceId].find(
    (areaId) => areaId !== "ALL",
  );
  const hasNarrowedPeriod = ["LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "CUSTOM"].includes(filters.period);
  const hasFocusedFilter =
    Boolean(debouncedSearch) ||
    filters.dataType !== "ALL" ||
    filters.urgency !== "ALL" ||
    filters.categoryId !== "ALL" ||
    filters.fieldOfficerAssignmentId !== "ALL" ||
    filters.jaringId !== "ALL" ||
    Boolean(selectedAreaId) ||
    filters.suitability !== "ALL" ||
    hasNarrowedPeriod;

  return {
    types,
    limitPerType: hasFocusedFilter ? FOCUSED_MAP_LIMIT_PER_TYPE : INITIAL_MAP_LIMIT_PER_TYPE,
    includeAreaHierarchy: true,
    hasCoordinates: true,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...periodRange(filters),
    ...(filters.urgency !== "ALL" ? { urgencies: filters.urgency } : {}),
    ...(filters.categoryId !== "ALL" ? { categoryIds: filters.categoryId } : {}),
    ...(filters.fieldOfficerAssignmentId !== "ALL"
      ? { fieldOfficerAssignmentIds: filters.fieldOfficerAssignmentId }
      : {}),
    ...(filters.jaringId !== "ALL" ? { jaringIds: filters.jaringId } : {}),
    ...(selectedAreaId ? { areaIds: selectedAreaId } : {}),
    ...(filters.suitability !== "ALL" ? { locationSuitability: filters.suitability } : {}),
  };
}

type MapEntityFilterOptions = {
  jarings: MapEntityFilterOption[];
};

function mergeEntityFilterOptions(
  current: MapEntityFilterOptions,
  response: MapNetworkResponse,
): MapEntityFilterOptions {
  const jarings = new Map(current.jarings.map((item) => [item.id, item]));

  const addJaring = (jaring?: MapNetworkFeature["properties"]["jaring"]) => {
    if (!jaring?.id) return;
    const label = jaring.code ? `${jaring.name} - ${jaring.code}` : jaring.name;
    jarings.set(jaring.id, {
      id: jaring.id,
      label,
      fieldOfficerAssignmentId: jaring.gaswilAssignmentId ?? null,
    });
  };

  for (const feature of response.features) {
    const properties = feature.properties;
    addJaring(properties.jaring);
    for (const jaring of properties.jarings ?? []) addJaring(jaring);
  }
  const sortByLabel = (left: MapEntityFilterOption, right: MapEntityFilterOption) =>
    left.label.localeCompare(right.label, "id-ID");
  return {
    jarings: [...jarings.values()].sort(sortByLabel),
  };
}

function withoutPersonnelMarkers(response: MapNetworkResponse): MapNetworkResponse {
  const features = response.features.filter((feature) => feature.properties.markerType !== "agent");
  const reportCount = response.meta.counts.report ?? response.meta.summary.visible.reports ?? 0;
  const baketCount = response.meta.counts.baket ?? response.meta.summary.visible.bakets ?? 0;
  const visibleReports = response.meta.summary.visible.reports ?? reportCount;
  const visibleBakets = response.meta.summary.visible.bakets ?? baketCount;

  return {
    ...response,
    features,
    meta: {
      ...response.meta,
      counts: {
        ...response.meta.counts,
        total: reportCount + baketCount,
        agent: 0,
        unlocatedAgent: 0,
        activeAgents: 0,
        lastKnownAgents: 0,
      },
      summary: {
        ...response.meta.summary,
        visible: {
          ...response.meta.summary.visible,
          total: visibleReports + visibleBakets,
          agents: 0,
        },
      },
      facets: {
        ...response.meta.facets,
        markerTypes: response.meta.facets.markerTypes.filter((type) => type !== "agent"),
        agentStates: [],
      },
    },
  };
}

export function MapsIntelijenNetworkClient() {
  const [response, setResponse] = useState<MapNetworkResponse>(EMPTY_MAP_RESPONSE);
  const [filters, setFilters] = useState<MapNetworkFilters>(INITIAL_FILTERS);
  const [entityFilterOptions, setEntityFilterOptions] = useState<MapEntityFilterOptions>({
    jarings: [],
  });
  const [areaOptions, setAreaOptions] = useState<MapAreaFilterOptions>({
    provinces: [],
    regencies: [],
    districts: [],
    villages: [],
    loading: true,
    loadingLevel: "province",
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visualization, setVisualization] = useState<VisualizationMode>("cluster");
  const [colorMode, _setColorMode] = useState<MarkerColorMode>("urgency");
  const [heatmapWeight, setHeatmapWeight] = useState<HeatmapWeight>("count");
  const [mapLayer, setMapLayer] = useState<"dark" | "satellite" | "terrain" | "light" | "osm">("dark");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [selected, setSelected] = useState<MapNetworkFeature | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const mapCardRef = useRef<HTMLDivElement>(null);
  const activeMapRequestRef = useRef<AbortController | null>(null);
  const didApplyDefaultProvinceFilter = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    if (filters.provinceId === "ALL" && visualization === "marker") {
      setVisualization("cluster");
    }
  }, [filters.provinceId, visualization]);

  const defaultProvinceFilter = useMemo(
    () => findDkiJakartaProvinceFilterId(areaOptions.provinces),
    [areaOptions.provinces],
  );

  useEffect(() => {
    if (didApplyDefaultProvinceFilter.current || !defaultProvinceFilter || filters.provinceId !== "ALL") return;

    setFilters((current) => ({
      ...current,
      provinceId: defaultProvinceFilter,
      regencyId: "ALL",
      districtId: "ALL",
      villageId: "ALL",
    }));
    didApplyDefaultProvinceFilter.current = true;
  }, [defaultProvinceFilter, filters.provinceId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadScopedAreaHierarchy = async () => {
      setAreaOptions((current) => ({
        ...current,
        loading: true,
        loadingLevel: "province",
      }));
      try {
        const [directScopes, scopedAreas] = await Promise.all([
          apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
            init: { signal: controller.signal },
          }),
          apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
            query: { includeDescendants: true },
            init: { signal: controller.signal },
          }),
        ]);

        const ancestorGroups = await Promise.all(
          (directScopes ?? [])
            .filter((scope) => scope.level !== "PROVINCE")
            .map((scope) =>
              apiBrowserFetch<MapAreaAncestorLink[]>(`/administrative-areas/${scope.areaId}/ancestors`, {
                query: { limit: 20 },
                init: { signal: controller.signal },
              }),
            ),
        );

        if (!controller.signal.aborted) {
          const hierarchy = new Map<string, MapArea>();
          for (const area of scopedAreas ?? []) {
            const mappedArea = scopeAreaToMapArea(area);
            hierarchy.set(mappedArea.id, mappedArea);
          }
          for (const links of ancestorGroups) {
            for (const link of links ?? []) {
              hierarchy.set(link.ancestor.id, link.ancestor);
            }
          }
          const accessibleAreas = [...hierarchy.values()];

          setAreaOptions((current) => ({
            ...current,
            provinces: normalizeMapAreas(accessibleAreas, ["PROVINCE"]),
            regencies: normalizeMapAreas(accessibleAreas, ["CITY", "REGENCY"]),
            districts: normalizeMapAreas(accessibleAreas, ["DISTRICT"]),
            villages: normalizeMapAreas(accessibleAreas, ["VILLAGE", "URBAN_VILLAGE"]),
            loading: false,
            loadingLevel: null,
          }));
        }
      } catch {
        if (!controller.signal.aborted) {
          setAreaOptions((current) => ({
            ...current,
            loading: false,
            loadingLevel: null,
          }));
        }
      }
    };
    void loadScopedAreaHierarchy();
    return () => controller.abort();
  }, []);

  const query = useMemo(() => buildQuery(filters, debouncedSearch), [debouncedSearch, filters]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      async () => {
        let timedOut = false;
        const requestTimeout = window.setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, MAP_REQUEST_TIMEOUT_MS);

        activeMapRequestRef.current = controller;
        setLoading(true);
        setError(null);
        try {
          const rawData = await apiBrowserFetch<MapNetworkResponse>("/map/markers", {
            query,
            init: { signal: controller.signal },
          });
          if (!controller.signal.aborted) {
            const data = withoutPersonnelMarkers(rawData);
            setResponse(data);
            setEntityFilterOptions((current) => mergeEntityFilterOptions(current, data));
          }
        } catch (cause) {
          if (timedOut) {
            setError("Pemuatan data peta melewati batas waktu. Persempit periode atau wilayah, lalu muat ulang.");
          } else if (!controller.signal.aborted) {
            setError(cause instanceof Error ? cause.message : "Data peta gagal dimuat.");
          }
        } finally {
          window.clearTimeout(requestTimeout);
          if (activeMapRequestRef.current === controller) {
            activeMapRequestRef.current = null;
            if (!controller.signal.aborted || timedOut) setLoading(false);
          }
        }
      },
      reloadKey === 0 ? 120 : 0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      if (activeMapRequestRef.current === controller) activeMapRequestRef.current = null;
    };
  }, [query, reloadKey]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !activeMapRequestRef.current) {
        setReloadKey((value) => value + 1);
      }
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) setVisualization((mode) => (mode === "marker" ? "cluster" : mode));
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        if (key === "search") return Boolean(value);
        if (key === "period") return value !== "TODAY";
        if (key === "startDate" || key === "endDate") return Boolean(value);
        return value !== "ALL";
      }).length,
    [filters],
  );

  const handleFilterChange = useCallback(
    (patch: Partial<MapNetworkFilters>) => {
      setFilters((current) => {
        const normalizedPatch = {
          ...patch,
          ...(patch.provinceId === "ALL" && defaultProvinceFilter ? { provinceId: defaultProvinceFilter } : {}),
        };
        const next = { ...current, ...normalizedPatch };

        if (normalizedPatch.provinceId !== undefined && normalizedPatch.provinceId !== current.provinceId) {
          next.regencyId = "ALL";
          next.districtId = "ALL";
          next.villageId = "ALL";
        } else if (normalizedPatch.regencyId !== undefined && normalizedPatch.regencyId !== current.regencyId) {
          next.districtId = "ALL";
          next.villageId = "ALL";
        } else if (normalizedPatch.districtId !== undefined && normalizedPatch.districtId !== current.districtId) {
          next.villageId = "ALL";
        }

        return next;
      });
    },
    [defaultProvinceFilter],
  );

  const openDetail = useCallback((feature: MapNetworkFeature) => {
    setSelected(feature);
    setDetailOpen(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      ...INITIAL_FILTERS,
      provinceId: defaultProvinceFilter || INITIAL_FILTERS.provinceId,
    });
    setVisualization("cluster");
  }, [defaultProvinceFilter]);

  const handleVisualizationChange = useCallback(
    (value: VisualizationMode) => {
      setVisualization(value === "marker" && filters.provinceId === "ALL" ? "cluster" : value);
    },
    [filters.provinceId],
  );

  const activePeriodLabel = periodLabel(filters);
  const activeAreaSubtitle = useMemo(() => buildMapAreaSubtitle(filters, areaOptions), [areaOptions, filters]);

  return (
    <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-3 sm:p-5 lg:p-7">
      <MapsIntelijenHeader
        loading={loading}
        onRefresh={() => setReloadKey((value) => value + 1)}
        periodLabel={activePeriodLabel}
        scopeLabel={activeAreaSubtitle}
        generatedAt={response.meta.freshness.generatedAt}
      />
      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between dark:text-red-300"
        >
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="size-5" />
            {error}
          </span>
          <Button variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
            Coba Lagi
          </Button>
        </div>
      ) : null}
      <MapsIntelijenPeriodFilter filters={filters} onChange={handleFilterChange} />
      <MapsIntelijenAreaFilter areaOptions={areaOptions} filters={filters} onChange={handleFilterChange} />
      <MapsIntelijenStats meta={response.meta} loading={loading} />
      <MapsIntelijenMapView
        mapCardRef={mapCardRef}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        features={response.features}
        meta={response.meta}
        loading={loading}
        periodLabel={activePeriodLabel}
        activeFilterCount={activeFilterCount}
        visibleCount={visibleCount}
        onRefresh={() => setReloadKey((value) => value + 1)}
        mode={filters.provinceId === "ALL" && visualization === "marker" ? "cluster" : visualization}
        onVisualizationChange={handleVisualizationChange}
        colorMode={colorMode}
        heatmapWeight={heatmapWeight}
        onHeatmapWeightChange={setHeatmapWeight}
        mapLayer={mapLayer}
        onMapLayerChange={setMapLayer}
        onOpenDetail={openDetail}
        onVisibleCountChange={setVisibleCount}
        filters={filters}
        jaringOptions={entityFilterOptions.jarings}
        areaOptions={areaOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
      />
      <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-muted-foreground text-xs">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
        <p>
          Peta hanya memuat titik berkoordinat sesuai filter aktif. Mode klaster menjadi tampilan awal agar sebaran
          seluruh wilayah tetap ringan; marker rinci tersedia setelah provinsi dipilih.
        </p>
      </div>
      <MapsIntelijenDetailSheet feature={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </main>
  );
}
