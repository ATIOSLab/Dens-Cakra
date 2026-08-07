"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, Info, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiBrowserFetch } from "@/lib/api/browser-client";

import { normalizeMapAreas } from "./maps-intelijen-area-hierarchy";
import { MapsIntelijenDataList } from "./maps-intelijen-data-list";
import { MapsIntelijenDetailSheet } from "./maps-intelijen-detail-sheet";
import { MapsIntelijenHeader } from "./maps-intelijen-header";
import { MapsIntelijenLeadershipBrief } from "./maps-intelijen-leadership-brief";
import { MapsIntelijenMapView } from "./maps-intelijen-map-view";
import { MapsIntelijenStats } from "./maps-intelijen-stats";
import { MapsIntelijenToolbar } from "./maps-intelijen-toolbar";
import {
  EMPTY_MAP_RESPONSE,
  type AdministrativeAreaScope,
  type HeatmapWeight,
  type MapArea,
  type MapAreaFilterOptions,
  type MapEntityFilterOption,
  type MapNetworkFeature,
  type MapNetworkFilters,
  type MapNetworkResponse,
  type MarkerColorMode,
  type SummaryCardFilter,
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
  period: "LAST_30_DAYS",
  startDate: "",
  endDate: "",
  dataType: "ALL",
  completeness: "ALL",
  urgency: "ALL",
  categoryId: "ALL",
  fieldOfficerAssignmentId: "ALL",
  jaringId: "ALL",
  provinceId: "ALL",
  regencyId: "ALL",
  districtId: "ALL",
  villageId: "ALL",
  suitability: "ALL",
  agentState: "ALL",
  activeWithinMinutes: 15,
  lastKnownWithinHours: 168,
};

function periodRange(filters: MapNetworkFilters) {
  const now = new Date();
  const end = now.toISOString();
  if (filters.period === "ALL") return {};
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
    return { from: new Date(now.getTime() - 7 * 86_400_000).toISOString(), to: end };
  if (filters.period === "LAST_30_DAYS")
    return { from: new Date(now.getTime() - 30 * 86_400_000).toISOString(), to: end };
  if (filters.period === "THIS_MONTH") {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    }).format(now);
    return { from: new Date(`${parts}-01T00:00:00+07:00`).toISOString(), to: end };
  }
  return {
    ...(filters.startDate ? { from: new Date(`${filters.startDate}T00:00:00+07:00`).toISOString() } : {}),
    ...(filters.endDate ? { to: new Date(`${filters.endDate}T23:59:59.999+07:00`).toISOString() } : {}),
  };
}

function periodLabel(filters: MapNetworkFilters) {
  const labels = {
    ALL: "Semua waktu",
    TODAY: "Hari ini",
    LAST_7_DAYS: "7 hari terakhir",
    LAST_30_DAYS: "30 hari terakhir",
    THIS_MONTH: "Bulan berjalan",
    CUSTOM: "Rentang kustom",
  };
  if (filters.period !== "CUSTOM") return labels[filters.period];
  return filters.startDate || filters.endDate
    ? `${filters.startDate || "awal"} – ${filters.endDate || "sekarang"}`
    : "Rentang kustom";
}

function buildQuery(filters: MapNetworkFilters, card: SummaryCardFilter, debouncedSearch: string) {
  const reportSpecific =
    card === "REPORT" ||
    card === "COMPLETE" ||
    card === "INCOMPLETE" ||
    filters.completeness !== "ALL";
  let types = "report,baket,agent";
  if (filters.dataType === "REPORT") types = "report";
  if (filters.dataType === "BAKET") types = "baket";
  if (filters.dataType === "AGENT") types = "agent";
  if (card === "BAKET") types = "baket";
  else if (card !== "ALL" || (filters.dataType === "ALL" && reportSpecific)) types = "report";
  let completeness = filters.completeness;
  if (card === "COMPLETE") completeness = "COMPLETE";
  if (card === "INCOMPLETE") completeness = "INCOMPLETE";
  const selectedAreaId = [filters.villageId, filters.districtId, filters.regencyId, filters.provinceId].find(
    (areaId) => areaId !== "ALL",
  );
  return {
    types,
    limitPerType: 5000,
    includeAreaHierarchy: true,
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...periodRange(filters),
    ...(completeness !== "ALL" ? { completeness } : {}),
    ...(filters.urgency !== "ALL" ? { urgencies: filters.urgency } : {}),
    ...(filters.categoryId !== "ALL" ? { categoryIds: filters.categoryId } : {}),
    ...(filters.fieldOfficerAssignmentId !== "ALL"
      ? { fieldOfficerAssignmentIds: filters.fieldOfficerAssignmentId }
      : {}),
    ...(filters.jaringId !== "ALL" ? { jaringIds: filters.jaringId } : {}),
    ...(selectedAreaId ? { areaIds: selectedAreaId } : {}),
    ...(filters.suitability !== "ALL" ? { locationSuitability: filters.suitability } : {}),
    ...(filters.agentState !== "ALL" ? { agentStates: filters.agentState } : {}),
    activeWithinMinutes: filters.activeWithinMinutes,
    lastKnownWithinHours: filters.lastKnownWithinHours,
  };
}

type MapEntityFilterOptions = {
  fieldOfficers: MapEntityFilterOption[];
  jarings: MapEntityFilterOption[];
};

function mergeEntityFilterOptions(
  current: MapEntityFilterOptions,
  response: MapNetworkResponse,
): MapEntityFilterOptions {
  const fieldOfficers = new Map(current.fieldOfficers.map((item) => [item.id, item]));
  const jarings = new Map(current.jarings.map((item) => [item.id, item]));

  const addFieldOfficer = (id?: string | null, name?: string | null) => {
    if (!id || !name) return;
    fieldOfficers.set(id, { id, label: name });
  };
  const addJaring = (jaring?: MapNetworkFeature["properties"]["jaring"]) => {
    if (!jaring?.id) return;
    const label = jaring.code ? `${jaring.name} - ${jaring.code}` : jaring.name;
    jarings.set(jaring.id, {
      id: jaring.id,
      label,
      fieldOfficerAssignmentId: jaring.gaswilAssignmentId ?? null,
    });
    addFieldOfficer(jaring.gaswilAssignmentId, jaring.gaswilName);
  };

  for (const feature of response.features) {
    const properties = feature.properties;
    addFieldOfficer(properties.fieldOfficer?.assignmentId, properties.fieldOfficer?.name);
    addFieldOfficer(properties.assignmentId, properties.userName);
    addJaring(properties.jaring);
    for (const jaring of properties.jarings ?? []) addJaring(jaring);
  }
  for (const item of response.meta.unlocatedItems) addJaring(item.jaring);

  const sortByLabel = (left: MapEntityFilterOption, right: MapEntityFilterOption) =>
    left.label.localeCompare(right.label, "id-ID");
  return {
    fieldOfficers: [...fieldOfficers.values()].sort(sortByLabel),
    jarings: [...jarings.values()].sort(sortByLabel),
  };
}

export function MapsIntelijenNetworkClient() {
  const [response, setResponse] = useState<MapNetworkResponse>(EMPTY_MAP_RESPONSE);
  const [summaryMeta, setSummaryMeta] = useState<MapNetworkResponse["meta"]>(EMPTY_MAP_RESPONSE.meta);
  const [filters, setFilters] = useState<MapNetworkFilters>(INITIAL_FILTERS);
  const [entityFilterOptions, setEntityFilterOptions] = useState<MapEntityFilterOptions>({
    fieldOfficers: [],
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
  const [cardFilter, setCardFilter] = useState<SummaryCardFilter>("ALL");
  const [visualization, setVisualization] = useState<VisualizationMode>("marker");
  const [colorMode, setColorMode] = useState<MarkerColorMode>("completeness");
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

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search.trim()), 350);
    return () => window.clearTimeout(timeout);
  }, [filters.search]);

  useEffect(() => {
    const controller = new AbortController();
    const loadScopedAreaHierarchy = async () => {
      setAreaOptions((current) => ({ ...current, loading: true, loadingLevel: "province" }));
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
              apiBrowserFetch<MapAreaAncestorLink[]>(
                `/administrative-areas/${scope.areaId}/ancestors`,
                {
                  query: { limit: 20 },
                  init: { signal: controller.signal },
                },
              ),
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
          setAreaOptions((current) => ({ ...current, loading: false, loadingLevel: null }));
        }
      }
    };
    void loadScopedAreaHierarchy();
    return () => controller.abort();
  }, []);

  const query = useMemo(() => buildQuery(filters, cardFilter, debouncedSearch), [cardFilter, debouncedSearch, filters]);
  const summaryQuery = useMemo(
    () => ({ ...buildQuery(filters, "ALL", debouncedSearch), limitPerType: 1 }),
    [debouncedSearch, filters],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        try {
          const [data, summaryData] = await Promise.all([
            apiBrowserFetch<MapNetworkResponse>("/map/markers", {
              query,
              init: { signal: controller.signal },
            }),
            cardFilter === "ALL"
              ? Promise.resolve(null)
              : apiBrowserFetch<MapNetworkResponse>("/map/markers", {
                  query: summaryQuery,
                  init: { signal: controller.signal },
                }),
          ]);
          if (!controller.signal.aborted) {
            setResponse(data);
            setSummaryMeta((summaryData ?? data).meta);
            setEntityFilterOptions((current) => mergeEntityFilterOptions(current, data));
          }
        } catch (cause) {
          if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Data peta gagal dimuat.");
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      },
      reloadKey === 0 ? 120 : 0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cardFilter, query, reloadKey, summaryQuery]);

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
      if (document.visibilityState === "visible") setReloadKey((value) => value + 1);
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
        if (key === "period") return value !== "LAST_30_DAYS";
        if (key === "startDate" || key === "endDate") return Boolean(value);
        if (key === "activeWithinMinutes") return value !== INITIAL_FILTERS.activeWithinMinutes;
        if (key === "lastKnownWithinHours") return value !== INITIAL_FILTERS.lastKnownWithinHours;
        return value !== "ALL";
      }).length + (cardFilter === "ALL" ? 0 : 1),
    [cardFilter, filters],
  );

  const handleFilterChange = useCallback((patch: Partial<MapNetworkFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };

      if (patch.provinceId !== undefined && patch.provinceId !== current.provinceId) {
        next.regencyId = "ALL";
        next.districtId = "ALL";
        next.villageId = "ALL";
      } else if (patch.regencyId !== undefined && patch.regencyId !== current.regencyId) {
        next.districtId = "ALL";
        next.villageId = "ALL";
      } else if (patch.districtId !== undefined && patch.districtId !== current.districtId) {
        next.villageId = "ALL";
      }

      return next;
    });
    if (patch.dataType) setCardFilter("ALL");
  }, []);

  const openDetail = useCallback((feature: MapNetworkFeature) => {
    setSelected(feature);
    setDetailOpen(true);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setCardFilter("ALL");
  }, []);

  const activePeriodLabel = periodLabel(filters);
  const activeReportTotal =
    response.meta.summary.reports.total ??
    (response.meta.summary.reports.complete ?? 0) + (response.meta.summary.reports.incomplete ?? 0);
  const activeBaketTotal = response.meta.summary.bakets.total ?? 0;
  const activeMappableTotal =
    (response.meta.summary.reports.mappable ?? 0) +
    (response.meta.summary.bakets.mappable ?? 0) +
    response.meta.counts.agent;
  const activeUnlocatedTotal =
    (response.meta.summary.reports.unlocated ?? 0) +
    (response.meta.summary.bakets.unlocated ?? 0) +
    response.meta.counts.unlocatedAgent;

  return (
    <main className="mx-auto flex w-full max-w-[1680px] flex-col gap-5 p-3 sm:p-5 lg:p-7">
      <MapsIntelijenHeader
        loading={loading}
        onRefresh={() => setReloadKey((value) => value + 1)}
        periodLabel={activePeriodLabel}
        scopeLabel="Sesuai cakupan akses backend"
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
      <MapsIntelijenStats
        meta={summaryMeta}
        active={cardFilter}
        onChange={setCardFilter}
        loading={loading}
        periodLabel={activePeriodLabel}
      />
      <MapsIntelijenLeadershipBrief
        features={response.features}
        meta={response.meta}
        periodLabel={activePeriodLabel}
        loading={loading}
        onFilterChange={handleFilterChange}
        onCardFilterChange={setCardFilter}
      />
      <MapsIntelijenToolbar
        filters={filters}
        onChange={handleFilterChange}
        visualization={visualization}
        onVisualizationChange={setVisualization}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        categories={response.meta.facets.categories}
        fieldOfficerOptions={entityFilterOptions.fieldOfficers}
        jaringOptions={entityFilterOptions.jarings}
        areaOptions={areaOptions}
        agentStates={response.meta.facets.agentStates}
        activeFilterCount={activeFilterCount}
        onReset={resetFilters}
      />
      <div className="flex flex-col gap-2 rounded-xl border bg-muted/20 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong>{activeReportTotal.toLocaleString("id-ID")}</strong> Laporan Jaring dan{" "}
          <strong>{activeBaketTotal.toLocaleString("id-ID")}</strong> Baket sesuai filter;{" "}
          <strong>{response.meta.counts.agent.toLocaleString("id-ID")}</strong> personel termuat;{" "}
          <strong>{activeMappableTotal.toLocaleString("id-ID")}</strong> data dapat dipetakan dan{" "}
          <strong>{activeUnlocatedTotal.toLocaleString("id-ID")}</strong> tanpa koordinat.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2 text-muted-foreground text-xs">
          <span>{visibleCount.toLocaleString("id-ID")} titik pada viewport</span>
          <span>·</span>
          <span>{response.features.length.toLocaleString("id-ID")} marker dimuat</span>
        </div>
      </div>
      {activeUnlocatedTotal > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-800 text-xs dark:text-amber-200">
          <MapPinOff className="mt-0.5 size-4 shrink-0" />
          <span>
            Sebagian data tidak ditampilkan sebagai marker karena tidak memiliki koordinat yang dapat digunakan.
          </span>
        </div>
      ) : null}
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
        mode={visualization}
        onVisualizationChange={setVisualization}
        colorMode={colorMode}
        heatmapWeight={heatmapWeight}
        onHeatmapWeightChange={setHeatmapWeight}
        mapLayer={mapLayer}
        onMapLayerChange={setMapLayer}
        onOpenDetail={openDetail}
        onVisibleCountChange={setVisibleCount}
        filters={filters}
        fieldOfficerOptions={entityFilterOptions.fieldOfficers}
        jaringOptions={entityFilterOptions.jarings}
        areaOptions={areaOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
      />
      <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-muted-foreground text-xs">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
        <p>
          Marker dan heatmap hanya memakai latitude/longitude aktual. Heatmap mengabaikan data tanpa koordinat; mode
          bobot “Jumlah Data” memberi bobot setara untuk setiap titik Laporan Jaring maupun Baket.
        </p>
      </div>
      {!isFullscreen ? (
        <MapsIntelijenDataList features={response.features} meta={response.meta} onDetail={openDetail} />
      ) : null}
      <MapsIntelijenDetailSheet feature={selected} open={detailOpen} onOpenChange={setDetailOpen} />
    </main>
  );
}
