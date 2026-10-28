"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, Info, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { fetchAllVerifiedJaringOptions } from "@/lib/api/jaring-options";
import { findDkiJakartaProvinceFilterId } from "@/lib/domain/area-filter";
import { jakartaBoundaryIso, jakartaDateKey } from "@/lib/domain/date-time";
import { sortReportCategories } from "@/lib/domain/report-category-order";

import { MapsIntelijenAreaFilter } from "./maps-intelijen-area-filter";
import { isAreaChildOfParent, normalizeMapAreas } from "./maps-intelijen-area-hierarchy";
import { MapsIntelijenDetailSheet } from "./maps-intelijen-detail-sheet";
import { MapsIntelijenHeader } from "./maps-intelijen-header";
import { MapsIntelijenKpiModal } from "./maps-intelijen-kpi-modal";
import { MapsIntelijenMapView } from "./maps-intelijen-map-view";
import { MapsIntelijenPeriodFilter } from "./maps-intelijen-period-filter";
import { type KpiCardKey, MapsIntelijenStats } from "./maps-intelijen-stats";
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
    officialCode: area.officialCode ?? null,
    name: area.name,
    level: area.level,
    parentId: area.parentAreaId ?? null,
    parentAreaId: area.parentAreaId ?? null,
    parentOfficialCode: area.parentOfficialCode ?? null,
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

const INITIAL_MAP_LIMIT_PER_TYPE = 5000;
const FOCUSED_MAP_LIMIT_PER_TYPE = 5000;
const MAP_REQUEST_TIMEOUT_MS = 45_000;
const ENTITY_SELECT_PAGE_SIZE = 30;

const DATA_TYPE_SELECT_OPTIONS: SearchableSelectOption[] = [
  { value: "ALL", label: "Semua Lapisan" },
  { value: "REPORT", label: "Laporan Jaring" },
  { value: "BAKET", label: "Bahan Keterangan (Baket)" },
];

const URGENCY_SELECT_OPTIONS: SearchableSelectOption[] = [
  { value: "ALL", label: "Semua Urgensi" },
  { value: "URGENT", label: "Mendesak" },
  { value: "HIGH", label: "Tinggi" },
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Rendah" },
];

type JaringCoverageAreaNode = {
  id: string;
  name?: string | null;
  level?: string | null;
  parent?: JaringCoverageAreaNode | null;
};

type VerifiedJaringOptionItem = {
  id: string;
  aliasName?: string | null;
  fullName?: string | null;
  name?: string | null;
  code?: string | null;
  areaCoverages?: Array<{
    areaId?: string | null;
    isPrimary?: boolean;
    validUntil?: string | null;
    area?: JaringCoverageAreaNode | null;
  }>;
  caretakerAssignments?: Array<{
    id?: string | null;
    fieldOfficerAssignmentId?: string | null;
    fieldOfficerAssignment?: {
      id?: string | null;
      userProfile?: { fullName?: string | null; username?: string | null } | null;
    } | null;
  }>;
};

function jaringMatchesSelectedArea(jaring: VerifiedJaringOptionItem, selectedAreaId?: string) {
  if (!selectedAreaId || selectedAreaId === "ALL") return true;
  return (jaring.areaCoverages ?? []).some((coverage) => {
    if (coverage.validUntil) return false;
    if (coverage.areaId === selectedAreaId) return true;

    let area = coverage.area ?? null;
    while (area) {
      if (area.id === selectedAreaId) return true;
      area = area.parent ?? null;
    }

    return false;
  });
}

function periodRange(filters: MapNetworkFilters) {
  const now = new Date();
  if (filters.period !== "CUSTOM") {
    const daysBack = {
      TODAY: 0,
      LAST_7_DAYS: 6,
      LAST_14_DAYS: 13,
      LAST_30_DAYS: 29,
    }[filters.period];
    const from = jakartaDateKey(new Date(now.getTime() - daysBack * 86_400_000));
    const to = jakartaDateKey(now);

    return {
      from: jakartaBoundaryIso(from),
      to: jakartaBoundaryIso(to, true),
    };
  }
  return {
    ...(filters.startDate ? { from: jakartaBoundaryIso(filters.startDate) } : {}),
    ...(filters.endDate ? { to: jakartaBoundaryIso(filters.endDate, true) } : {}),
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
  const hasNarrowedPeriod = ["TODAY", "LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "CUSTOM"].includes(
    filters.period,
  );
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
  fieldOfficers: MapEntityFilterOption[];
};

function mergeEntityFilterOptions(
  current: MapEntityFilterOptions,
  response: MapNetworkResponse,
): MapEntityFilterOptions {
  const jarings = new Map(current.jarings.map((item) => [item.id, item]));
  const officers = new Map(current.fieldOfficers.map((item) => [item.id, item]));

  const addJaring = (jaring?: MapNetworkFeature["properties"]["jaring"], fieldOfficerAssignmentId?: string | null) => {
    if (!jaring?.id) return;
    const label = jaring.code ? `${jaring.name} - ${jaring.code}` : jaring.name;
    const existing = jarings.get(jaring.id);
    jarings.set(jaring.id, {
      id: jaring.id,
      label,
      fieldOfficerAssignmentId: fieldOfficerAssignmentId ?? existing?.fieldOfficerAssignmentId ?? null,
    });
  };

  const addOfficer = (officer?: { assignmentId?: string | null; name?: string | null } | null) => {
    if (!officer?.assignmentId) return;
    const label = officer.name?.trim() || "Petugas Wilayah tanpa nama";
    officers.set(officer.assignmentId, {
      id: officer.assignmentId,
      label,
    });
  };

  for (const feature of response.features) {
    const properties = feature.properties;
    const officerAssignmentId = properties.fieldOfficer?.assignmentId ?? null;
    addOfficer(properties.fieldOfficer);
    addJaring(properties.jaring, officerAssignmentId);
    for (const jaring of properties.jarings ?? []) {
      addJaring(jaring, officerAssignmentId);
    }
  }
  const sortByLabel = (left: MapEntityFilterOption, right: MapEntityFilterOption) =>
    left.label.localeCompare(right.label, "id-ID");
  return {
    jarings: [...jarings.values()].sort(sortByLabel),
    fieldOfficers: [...officers.values()].sort(sortByLabel),
  };
}

function withoutPersonnelMarkers(response: MapNetworkResponse): MapNetworkResponse {
  const features = response.features.filter((feature) => feature.properties.markerType !== "agent");
  const reportCount = response.meta.counts.report;
  const baketCount = response.meta.counts.baket;
  const visibleReports = response.meta.summary.visible.reports;
  const visibleBakets = response.meta.summary.visible.bakets;

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
  const [verifiedJarings, setVerifiedJarings] = useState<VerifiedJaringOptionItem[]>([]);
  const [featureEntityOptions, setFeatureEntityOptions] = useState<MapEntityFilterOptions>({
    jarings: [],
    fieldOfficers: [],
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
  const [activeKpiModal, setActiveKpiModal] = useState<KpiCardKey | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const mapCardRef = useRef<HTMLDivElement>(null);
  const activeMapRequestRef = useRef<AbortController | null>(null);
  const didApplyDefaultProvinceFilter = useRef<boolean>(false);

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
            query: { includeDescendants: true, excludeVillages: true },
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
              hierarchy.set(link.ancestor.id, {
                id: link.ancestor.id,
                code: link.ancestor.code,
                officialCode: link.ancestor.officialCode ?? null,
                name: link.ancestor.name,
                level: link.ancestor.level,
                parentId: link.ancestor.parentId ?? null,
                parentAreaId: link.ancestor.parentId ?? null,
                parentOfficialCode: link.ancestor.parentOfficialCode ?? null,
              });
            }
          }
          const accessibleAreas = [...hierarchy.values()];
          const normalizedProvinces = normalizeMapAreas(accessibleAreas, ["PROVINCE", "PROVINSI"]);
          const initialProvinceId = findDkiJakartaProvinceFilterId(normalizedProvinces);

          if (!didApplyDefaultProvinceFilter.current && initialProvinceId) {
            didApplyDefaultProvinceFilter.current = true;
            setFilters((current) =>
              current.provinceId === "ALL"
                ? {
                    ...current,
                    provinceId: initialProvinceId,
                    regencyId: "ALL",
                    districtId: "ALL",
                    villageId: "ALL",
                  }
                : current,
            );
          }

          setAreaOptions((current) => ({
            ...current,
            provinces: normalizedProvinces,
            regencies: normalizeMapAreas(accessibleAreas, ["CITY", "REGENCY", "KOTA", "KABUPATEN"]),
            districts: normalizeMapAreas(accessibleAreas, ["DISTRICT", "KECAMATAN"]),
            villages: normalizeMapAreas(accessibleAreas, ["VILLAGE", "URBAN_VILLAGE", "DESA", "KELURAHAN"]),
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

  useEffect(() => {
    const controller = new AbortController();

    async function ensureChildrenLoaded() {
      if (filters.provinceId !== "ALL") {
        const selectedProv = areaOptions.provinces.find((p) => p.id === filters.provinceId);
        if (selectedProv) {
          const hasRegencies = areaOptions.regencies.some((r) => isAreaChildOfParent(r, selectedProv));
          if (!hasRegencies) {
            setAreaOptions((prev) => ({ ...prev, loadingLevel: "regency" }));
            try {
              const children = await apiBrowserFetch<
                Array<{
                  id: string;
                  code: string;
                  officialCode?: string | null;
                  name: string;
                  level: string;
                  parentId?: string | null;
                }>
              >(`/administrative-areas/${filters.provinceId}/children`, {
                init: { signal: controller.signal },
              });
              if (!controller.signal.aborted && children && children.length > 0) {
                const newAreas: MapArea[] = children.map((c) => ({
                  id: c.id,
                  code: c.code,
                  officialCode: c.officialCode ?? null,
                  name: c.name,
                  level: c.level,
                  parentId: c.parentId ?? selectedProv.id,
                  parentAreaId: c.parentId ?? selectedProv.id,
                  parentOfficialCode: selectedProv.officialCode ?? selectedProv.code ?? null,
                }));
                setAreaOptions((prev) => ({
                  ...prev,
                  regencies: normalizeMapAreas(
                    [...prev.regencies, ...newAreas],
                    ["CITY", "REGENCY", "KOTA", "KABUPATEN"],
                  ),
                  loadingLevel: null,
                }));
              } else if (!controller.signal.aborted) {
                setAreaOptions((prev) => ({ ...prev, loadingLevel: null }));
              }
            } catch {
              if (!controller.signal.aborted) {
                setAreaOptions((prev) => ({ ...prev, loadingLevel: null }));
              }
            }
          }
        }
      }

      if (filters.regencyId !== "ALL") {
        const selectedReg = areaOptions.regencies.find((r) => r.id === filters.regencyId);
        if (selectedReg) {
          const hasDistricts = areaOptions.districts.some((d) => isAreaChildOfParent(d, selectedReg));
          if (!hasDistricts) {
            setAreaOptions((prev) => ({ ...prev, loadingLevel: "district" }));
            try {
              const children = await apiBrowserFetch<
                Array<{
                  id: string;
                  code: string;
                  officialCode?: string | null;
                  name: string;
                  level: string;
                  parentId?: string | null;
                }>
              >(`/administrative-areas/${filters.regencyId}/children`, {
                query: { level: "DISTRICT" },
                init: { signal: controller.signal },
              });
              if (!controller.signal.aborted && children && children.length > 0) {
                const newAreas: MapArea[] = children.map((c) => ({
                  id: c.id,
                  code: c.code,
                  officialCode: c.officialCode ?? null,
                  name: c.name,
                  level: c.level,
                  parentId: c.parentId ?? selectedReg.id,
                  parentAreaId: c.parentId ?? selectedReg.id,
                  parentOfficialCode: selectedReg.officialCode ?? selectedReg.code ?? null,
                }));
                setAreaOptions((prev) => ({
                  ...prev,
                  districts: normalizeMapAreas([...prev.districts, ...newAreas], ["DISTRICT", "KECAMATAN"]),
                  loadingLevel: null,
                }));
              } else if (!controller.signal.aborted) {
                setAreaOptions((prev) => ({ ...prev, loadingLevel: null }));
              }
            } catch {
              if (!controller.signal.aborted) {
                setAreaOptions((prev) => ({ ...prev, loadingLevel: null }));
              }
            }
          }
        }
      }

      if (filters.districtId !== "ALL") {
        const selectedDist = areaOptions.districts.find((d) => d.id === filters.districtId);
        if (selectedDist) {
          const hasVillages = areaOptions.villages.some((v) => isAreaChildOfParent(v, selectedDist));
          if (!hasVillages) {
            setAreaOptions((prev) => ({ ...prev, loadingLevel: "village" }));
            try {
              const children = await apiBrowserFetch<
                Array<{
                  id: string;
                  code: string;
                  officialCode?: string | null;
                  name: string;
                  level: string;
                  parentId?: string | null;
                }>
              >(`/administrative-areas/${filters.districtId}/children`, {
                init: { signal: controller.signal },
              });
              if (!controller.signal.aborted && children && children.length > 0) {
                const newAreas: MapArea[] = children.map((c) => ({
                  id: c.id,
                  code: c.code,
                  officialCode: c.officialCode ?? null,
                  name: c.name,
                  level: c.level,
                  parentId: c.parentId ?? selectedDist.id,
                  parentAreaId: c.parentId ?? selectedDist.id,
                  parentOfficialCode: selectedDist.officialCode ?? selectedDist.code ?? null,
                }));
                setAreaOptions((prev) => ({
                  ...prev,
                  villages: normalizeMapAreas(
                    [...prev.villages, ...newAreas],
                    ["VILLAGE", "URBAN_VILLAGE", "DESA", "KELURAHAN"],
                  ),
                  loadingLevel: null,
                }));
              } else if (!controller.signal.aborted) {
                setAreaOptions((prev) => ({ ...prev, loadingLevel: null }));
              }
            } catch {
              if (!controller.signal.aborted) {
                setAreaOptions((prev) => ({ ...prev, loadingLevel: null }));
              }
            }
          }
        }
      }
    }

    void ensureChildrenLoaded();
    return () => controller.abort();
  }, [
    filters.provinceId,
    filters.regencyId,
    filters.districtId,
    areaOptions.provinces,
    areaOptions.regencies,
    areaOptions.districts,
    areaOptions.villages,
  ]);

  useEffect(() => {
    if (filters.provinceId === "ALL") {
      if (filters.regencyId !== "ALL" || filters.districtId !== "ALL" || filters.villageId !== "ALL") {
        setFilters((current) => ({
          ...current,
          regencyId: "ALL",
          districtId: "ALL",
          villageId: "ALL",
        }));
      }
      return;
    }

    const selectedProv = areaOptions.provinces.find((p) => p.id === filters.provinceId);
    if (selectedProv && filters.regencyId !== "ALL") {
      const selectedReg = areaOptions.regencies.find((r) => r.id === filters.regencyId);
      if (selectedReg && !isAreaChildOfParent(selectedReg, selectedProv)) {
        setFilters((current) => ({
          ...current,
          regencyId: "ALL",
          districtId: "ALL",
          villageId: "ALL",
        }));
        return;
      }
    }

    if (filters.regencyId !== "ALL" && filters.districtId !== "ALL") {
      const selectedReg = areaOptions.regencies.find((r) => r.id === filters.regencyId);
      const selectedDist = areaOptions.districts.find((d) => d.id === filters.districtId);
      if (selectedReg && selectedDist && !isAreaChildOfParent(selectedDist, selectedReg)) {
        setFilters((current) => ({
          ...current,
          districtId: "ALL",
          villageId: "ALL",
        }));
        return;
      }
    }

    if (filters.districtId !== "ALL" && filters.villageId !== "ALL") {
      const selectedDist = areaOptions.districts.find((d) => d.id === filters.districtId);
      const selectedVil = areaOptions.villages.find((v) => v.id === filters.villageId);
      if (selectedDist && selectedVil && !isAreaChildOfParent(selectedVil, selectedDist)) {
        setFilters((current) => ({
          ...current,
          villageId: "ALL",
        }));
      }
    }
  }, [
    filters.provinceId,
    filters.regencyId,
    filters.districtId,
    filters.villageId,
    areaOptions.provinces,
    areaOptions.regencies,
    areaOptions.districts,
    areaOptions.villages,
  ]);

  useEffect(() => {
    let cancelled = false;
    async function loadJarings() {
      try {
        const jaringList = await fetchAllVerifiedJaringOptions<VerifiedJaringOptionItem>();
        if (cancelled) return;
        setVerifiedJarings(jaringList);
      } catch {
        // Fallback gracefully to jarings from features
      }
    }
    void loadJarings();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedAreaId = useMemo(
    () =>
      [filters.villageId, filters.districtId, filters.regencyId, filters.provinceId].find(
        (areaId) => areaId !== "ALL",
      ),
    [filters.provinceId, filters.regencyId, filters.districtId, filters.villageId],
  );

  const entityFilterOptions = useMemo<MapEntityFilterOptions>(() => {
    const sortByLabel = (left: MapEntityFilterOption, right: MapEntityFilterOption) =>
      left.label.localeCompare(right.label, "id-ID");

    if (verifiedJarings.length === 0) {
      return featureEntityOptions;
    }

    const areaFilteredJarings = verifiedJarings.filter((jaring) =>
      jaringMatchesSelectedArea(jaring, selectedAreaId),
    );

    const officerCounts = new Map<string, { name: string; count: number }>();
    const jaringMap = new Map<string, MapEntityFilterOption>();

    for (const item of areaFilteredJarings) {
      const caretaker = item.caretakerAssignments?.[0];
      const officerAssignmentId =
        caretaker?.fieldOfficerAssignmentId ?? caretaker?.fieldOfficerAssignment?.id ?? caretaker?.id ?? null;
      const officerName =
        caretaker?.fieldOfficerAssignment?.userProfile?.fullName?.trim() ||
        caretaker?.fieldOfficerAssignment?.userProfile?.username?.trim() ||
        "Petugas Wilayah (Gaswil) tanpa nama";

      if (officerAssignmentId) {
        const existing = officerCounts.get(officerAssignmentId);
        if (existing) {
          existing.count += 1;
        } else {
          officerCounts.set(officerAssignmentId, { name: officerName, count: 1 });
        }
      }

      const code = item.code || item.aliasName;
      const name = item.fullName || item.name || code || item.id;
      const label = code && code !== name ? `${name} - ${code}` : name;
      jaringMap.set(item.id, {
        id: item.id,
        label,
        fieldOfficerAssignmentId: officerAssignmentId,
      });
    }

    const fieldOfficers: MapEntityFilterOption[] = [...officerCounts.entries()]
      .map(([id, info]) => ({
        id,
        label: `${info.name} (${info.count} Jaring)`,
      }))
      .sort(sortByLabel);

    const jarings = [...jaringMap.values()].sort(sortByLabel);

    return {
      fieldOfficers,
      jarings,
    };
  }, [featureEntityOptions, selectedAreaId, verifiedJarings]);

  useEffect(() => {
    if (verifiedJarings.length === 0) return;
    if (
      filters.fieldOfficerAssignmentId !== "ALL" &&
      !entityFilterOptions.fieldOfficers.some((officer) => officer.id === filters.fieldOfficerAssignmentId)
    ) {
      setFilters((current) => ({
        ...current,
        fieldOfficerAssignmentId: "ALL",
        jaringId: "ALL",
      }));
      return;
    }
    if (
      filters.jaringId !== "ALL" &&
      !entityFilterOptions.jarings.some((jaring) => jaring.id === filters.jaringId)
    ) {
      setFilters((current) => ({
        ...current,
        jaringId: "ALL",
      }));
    }
  }, [
    entityFilterOptions.fieldOfficers,
    entityFilterOptions.jarings,
    filters.fieldOfficerAssignmentId,
    filters.jaringId,
    verifiedJarings.length,
  ]);

  const query = useMemo(() => buildQuery(filters, debouncedSearch), [debouncedSearch, filters]);

  useEffect(() => {
    if (areaOptions.loading) return;
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
            setFeatureEntityOptions((current) => mergeEntityFilterOptions(current, data));
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
      0,
    );
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
      if (activeMapRequestRef.current === controller) activeMapRequestRef.current = null;
    };
  }, [areaOptions.loading, query, reloadKey]);

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
        if (key === "period") return value !== INITIAL_FILTERS.period;
        if (key === "startDate" || key === "endDate") return Boolean(value);
        if (key === "provinceId" && defaultProvinceFilter && value === defaultProvinceFilter) return false;
        return value !== "ALL";
      }).length,
    [defaultProvinceFilter, filters],
  );

  const handleFilterChange = useCallback((patch: Partial<MapNetworkFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };

      if (patch.provinceId !== undefined && patch.provinceId !== current.provinceId) {
        next.regencyId = "ALL";
        next.districtId = "ALL";
        next.villageId = "ALL";
        next.fieldOfficerAssignmentId = "ALL";
        next.jaringId = "ALL";
      } else if (patch.regencyId !== undefined && patch.regencyId !== current.regencyId) {
        next.districtId = "ALL";
        next.villageId = "ALL";
        next.fieldOfficerAssignmentId = "ALL";
        next.jaringId = "ALL";
      } else if (patch.districtId !== undefined && patch.districtId !== current.districtId) {
        next.villageId = "ALL";
        next.fieldOfficerAssignmentId = "ALL";
        next.jaringId = "ALL";
      } else if (patch.villageId !== undefined && patch.villageId !== current.villageId) {
        next.fieldOfficerAssignmentId = "ALL";
        next.jaringId = "ALL";
      } else if (
        patch.fieldOfficerAssignmentId !== undefined &&
        patch.fieldOfficerAssignmentId !== current.fieldOfficerAssignmentId
      ) {
        next.jaringId = "ALL";
      }

      return next;
    });
  }, []);

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

  const categorySelectOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "ALL", label: "Semua Kategori Baket" },
      ...sortReportCategories(response.meta.facets.categories).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [response.meta.facets.categories],
  );

  const fieldOfficerSelectOptions = useMemo<SearchableSelectOption[]>(
    () => [
      { value: "ALL", label: "Semua Petugas Wilayah (Gaswil)" },
      ...entityFilterOptions.fieldOfficers.map((officer) => ({
        value: officer.id,
        label: officer.label,
      })),
    ],
    [entityFilterOptions.fieldOfficers],
  );

  const jaringSelectOptions = useMemo<SearchableSelectOption[]>(() => {
    const visibleJarings =
      filters.fieldOfficerAssignmentId === "ALL"
        ? entityFilterOptions.jarings
        : entityFilterOptions.jarings.filter(
            (jaring) =>
              !jaring.fieldOfficerAssignmentId ||
              jaring.fieldOfficerAssignmentId === filters.fieldOfficerAssignmentId,
          );
    return [
      { value: "ALL", label: "Semua Jaring" },
      ...visibleJarings.map((jaring) => ({
        value: jaring.id,
        label: jaring.label,
      })),
    ];
  }, [entityFilterOptions.jarings, filters.fieldOfficerAssignmentId]);

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
      <section
        aria-label="Filter laporan dan entitas"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="grid min-w-0 gap-1 lg:col-span-2">
          <span className="truncate text-xs text-muted-foreground">Pencarian</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(event) => handleFilterChange({ search: event.target.value })}
              placeholder="Cari referensi, judul, Jaring, wilayah..."
              aria-label="Pencarian laporan peta"
              className="pl-8"
            />
          </div>
        </div>
        <div className="grid min-w-0 gap-1">
          <span className="truncate text-xs text-muted-foreground">Jenis Data</span>
          <SearchableSelect
            value={filters.dataType}
            options={DATA_TYPE_SELECT_OPTIONS}
            onValueChange={(value) => handleFilterChange({ dataType: value as MapNetworkFilters["dataType"] })}
            placeholder="Semua Lapisan"
            searchPlaceholder="Cari jenis data..."
            pageSize={ENTITY_SELECT_PAGE_SIZE}
            aria-label="Jenis Data"
            className="w-full min-w-0"
          />
        </div>
        <div className="grid min-w-0 gap-1">
          <span className="truncate text-xs text-muted-foreground">Urgensi</span>
          <SearchableSelect
            value={filters.urgency}
            options={URGENCY_SELECT_OPTIONS}
            onValueChange={(value) => handleFilterChange({ urgency: value as MapNetworkFilters["urgency"] })}
            placeholder="Semua Urgensi"
            searchPlaceholder="Cari urgensi..."
            pageSize={ENTITY_SELECT_PAGE_SIZE}
            aria-label="Urgensi"
            className="w-full min-w-0"
          />
        </div>
        <div className="grid min-w-0 gap-1">
          <span className="truncate text-xs text-muted-foreground">Kategori Baket</span>
          <SearchableSelect
            value={filters.categoryId}
            options={categorySelectOptions}
            onValueChange={(value) => handleFilterChange({ categoryId: value })}
            placeholder="Semua Kategori Baket"
            searchPlaceholder="Cari kategori Baket..."
            pageSize={ENTITY_SELECT_PAGE_SIZE}
            aria-label="Kategori Baket"
            className="w-full min-w-0"
          />
        </div>
        <div className="grid min-w-0 gap-1">
          <span className="truncate text-xs text-muted-foreground">Petugas Wilayah (Gaswil)</span>
          <SearchableSelect
            value={filters.fieldOfficerAssignmentId}
            options={fieldOfficerSelectOptions}
            onValueChange={(value) => handleFilterChange({ fieldOfficerAssignmentId: value, jaringId: "ALL" })}
            placeholder="Semua Petugas Wilayah (Gaswil)"
            searchPlaceholder="Cari nama Gaswil..."
            pageSize={ENTITY_SELECT_PAGE_SIZE}
            aria-label="Petugas Wilayah (Gaswil)"
            className="w-full min-w-0"
          />
        </div>
        <div className="grid min-w-0 gap-1 sm:col-span-2 lg:col-span-5">
          <span className="truncate text-xs text-muted-foreground">Jaring</span>
          <SearchableSelect
            value={filters.jaringId}
            options={jaringSelectOptions}
            onValueChange={(value) => handleFilterChange({ jaringId: value })}
            placeholder="Semua Jaring"
            searchPlaceholder="Cari nama atau kode Jaring..."
            pageSize={ENTITY_SELECT_PAGE_SIZE}
            aria-label="Jaring"
            className="w-full min-w-0"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
            className="w-full gap-1.5"
          >
            <RotateCcw className="size-3.5" />
            Atur Ulang Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </Button>
        </div>
      </section>
      <MapsIntelijenStats meta={response.meta} loading={loading} onCardClick={setActiveKpiModal} />
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
        fieldOfficerOptions={entityFilterOptions.fieldOfficers}
        areaOptions={areaOptions}
        onFilterChange={handleFilterChange}
        onResetFilters={resetFilters}
      />
      <div className="flex items-start gap-2 rounded-lg border bg-card p-3 text-muted-foreground text-xs">
        <Info className="mt-0.5 size-4 shrink-0 text-sky-500" />
        <p>
          Peta menampilkan laporan Jaring dan Bahan Keterangan (Baket) sesuai filter aktif dengan rentang bawaan Hari
          ini. Mode klaster menjadi tampilan awal agar sebaran seluruh wilayah tetap ringan; marker rinci tersedia
          setelah provinsi dipilih.
        </p>
      </div>
      <MapsIntelijenDetailSheet feature={selected} open={detailOpen} onOpenChange={setDetailOpen} />
      <MapsIntelijenKpiModal
        open={Boolean(activeKpiModal)}
        onOpenChange={(open) => {
          if (!open) setActiveKpiModal(null);
        }}
        kpiKey={activeKpiModal}
        meta={response.meta}
        features={response.features}
        filters={filters}
        periodLabel={activePeriodLabel}
        scopeLabel={activeAreaSubtitle}
        onOpenDetail={openDetail}
      />
    </main>
  );
}
