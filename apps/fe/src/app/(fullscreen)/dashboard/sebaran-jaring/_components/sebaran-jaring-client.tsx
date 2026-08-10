"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import type { Map as MapLibreMap } from "maplibre-gl";

import { useIsMobile } from "@/hooks/use-mobile";

import { SebaranJaringBottomBar } from "./sebaran-jaring-bottom-bar";
import { SebaranJaringHeader } from "./sebaran-jaring-header";
import { SebaranJaringLeadershipStrip } from "./sebaran-jaring-leadership-strip";
import { SebaranJaringLeftPanel } from "./sebaran-jaring-left-panel";
import { SebaranJaringMapView } from "./sebaran-jaring-map-view";
import { SebaranJaringRightPanel } from "./sebaran-jaring-right-panel";
import {
  type AdminLevel,
  type AgentOperationalStatus,
  type CoordinateSourceMode,
  type DateRangeOption,
  DEFAULT_CENTER,
  type DisplayMode,
  type DistributionEntityMode,
  districtCoordinate,
  geoJsonBounds,
  type JaringDistributionCity,
  type JaringDistributionDistrict,
  type JaringDistributionEntry,
  type MapStyleMode,
} from "./sebaran-jaring-types";

export type { JaringDistributionCity, JaringDistributionDistrict, JaringDistributionEntry };

function outerRings(geometry: GeoJSON.Geometry | null): GeoJSON.Position[][] {
  if (!geometry) return [];

  if (geometry.type === "Polygon") {
    return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap((polygon) => (polygon[0] ? [polygon[0]] : []));
  }

  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.flatMap(outerRings);
  }

  return [];
}

function orientRing(ring: GeoJSON.Position[], clockwise: boolean) {
  let signedArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    signedArea += current[0] * next[1] - next[0] * current[1];
  }

  const isClockwise = signedArea < 0;
  return isClockwise === clockwise ? ring : [...ring].reverse();
}

function outsideCityMask(city: JaringDistributionCity): GeoJSON.Feature<GeoJSON.Polygon> | null {
  const cityRings = outerRings(city.geometry);
  const rings = cityRings.length > 0 ? cityRings : city.districts.flatMap((district) => outerRings(district.geometry));
  if (rings.length === 0) return null;

  const worldRing: GeoJSON.Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [orientRing(worldRing, false), ...rings.map((ring) => orientRing(ring, true))],
    },
  };
}

function fitCity(map: MapLibreMap, city: JaringDistributionCity, offsetForPanel = false) {
  const cityBounds = city.geometry ? geoJsonBounds(city.geometry) : null;
  const districtBoundsList = city.districts.flatMap((district) =>
    district.geometry ? [geoJsonBounds(district.geometry)] : [],
  );
  const fallbackBounds = districtBoundsList.reduce<[[number, number], [number, number]] | null>((acc, current) => {
    if (!current) return acc;
    if (!acc) return current;
    return [
      [Math.min(acc[0][0], current[0][0]), Math.min(acc[0][1], current[0][1])],
      [Math.max(acc[1][0], current[1][0]), Math.max(acc[1][1], current[1][1])],
    ];
  }, null);

  const bounds = cityBounds ?? fallbackBounds;
  if (!bounds) {
    map.flyTo({ center: DEFAULT_CENTER, zoom: 10, pitch: 15 });
    return;
  }

  map.fitBounds(bounds, {
    padding: offsetForPanel
      ? { top: 70, bottom: 220, left: 340, right: 380 }
      : { top: 80, bottom: 220, left: 340, right: 380 },
    maxZoom: 13,
    duration: 1200,
  });
}

function fitAllCities(map: MapLibreMap, cities: JaringDistributionCity[]) {
  const bounds = cities.reduce<[[number, number], [number, number]] | null>((combined, city) => {
    const current = city.geometry ? geoJsonBounds(city.geometry) : null;
    if (!current) return combined;
    if (!combined) return current;
    return [
      [Math.min(combined[0][0], current[0][0]), Math.min(combined[0][1], current[0][1])],
      [Math.max(combined[1][0], current[1][0]), Math.max(combined[1][1], current[1][1])],
    ];
  }, null);

  if (bounds) map.fitBounds(bounds, { padding: { top: 120, right: 80, bottom: 180, left: 80 }, maxZoom: 11.5 });
  else map.flyTo({ center: DEFAULT_CENTER, zoom: 9.5 });
}

function focusDistrict(map: MapLibreMap, district: JaringDistributionDistrict, offsetForPanel = false) {
  const bounds = district.geometry ? geoJsonBounds(district.geometry) : null;
  const center = districtCoordinate(district);

  if (bounds) {
    map.fitBounds(bounds, {
      padding: offsetForPanel
        ? { top: 90, bottom: 230, left: 360, right: 400 }
        : { top: 90, bottom: 230, left: 360, right: 400 },
      maxZoom: 14.5,
      duration: 1000,
    });
    return;
  }

  if (center) {
    map.flyTo({
      center,
      zoom: 13,
      duration: 1000,
    });
  }
}

type Props = {
  cities: JaringDistributionCity[];
  allowedAdminLevels?: AdminLevel[];
  mode?: DistributionEntityMode;
};

export function JaringDistributionClient({
  cities,
  allowedAdminLevels = ["PROVINCE", "CITY", "DISTRICT", "VILLAGE"],
  mode = "jaring",
}: Props) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const firstCity = cities[0] ?? null;
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();

  // Core State
  const [selectedCityId, setSelectedCityId] = useState<string>(
    allowedAdminLevels.includes("PROVINCE") ? "" : (firstCity?.id ?? ""),
  );
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [selectedJaringId, setSelectedJaringId] = useState<string | null>(null);

  const [adminLevel, setAdminLevel] = useState<AdminLevel>(
    allowedAdminLevels.includes("PROVINCE") ? "PROVINCE" : (allowedAdminLevels[0] ?? "CITY"),
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>("marker");
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>("dark");
  const [dateRange, setDateRange] = useState<DateRangeOption>("ALL");
  const [isClusterMode, setIsClusterMode] = useState<boolean>(true);
  const [coordinateSourceMode, setCoordinateSourceMode] = useState<CoordinateSourceMode>("domisili");
  const effectiveCoordinateSourceMode: CoordinateSourceMode = mode === "gaswil" ? "domisili" : coordinateSourceMode;

  // Panel Visibilities
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  useEffect(() => {
    if (isMobile) {
      setIsLeftPanelOpen(false);
      setIsRightPanelOpen(false);
    }
  }, [isMobile]);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [agentSearchQuery, setAgentSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Record<AgentOperationalStatus | "ALL", boolean>>({
    ALL: true,
    VERIFIED: true,
    PENDING: true,
    REJECTED: true,
  });
  const [rightPanelTab, setRightPanelTab] = useState<"ALL" | "VERIFIED" | "PENDING">("ALL");

  // Clock Telemetry State
  const [currentTime, setCurrentTime] = useState<string>("");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date>(() => new Date());
  const [mapTelemetry, setMapTelemetry] = useState({ center: DEFAULT_CENTER, zoom: 10 });

  const refreshData = useCallback(() => {
    startRefreshTransition(() => {
      router.refresh();
      setLastSyncedAt(new Date());
    });
  }, [router]);

  useEffect(() => {
    const updateClock = () => {
      setCurrentTime(
        `${new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Asia/Jakarta",
        }).format(new Date())} WIB`,
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshData();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [refreshData]);

  const selectedCity = useMemo(() => {
    if (!selectedCityId) return null;
    return cities.find((c) => c.id === selectedCityId) ?? firstCity ?? null;
  }, [cities, selectedCityId, firstCity]);

  const selectedDistrict = useMemo(() => {
    return selectedCity?.districts.find((d) => d.id === selectedDistrictId) ?? null;
  }, [selectedCity, selectedDistrictId]);

  const availableVillages = useMemo(() => selectedDistrict?.villages ?? [], [selectedDistrict]);

  const selectedVillage = useMemo(() => {
    if (!selectedVillageId) return null;
    return availableVillages.find((v) => v.id === selectedVillageId) ?? null;
  }, [availableVillages, selectedVillageId]);

  const allAgents = useMemo(() => {
    return cities.flatMap((c) => c.jaring);
  }, [cities]);

  const filteredAgents = useMemo(() => {
    const source = adminLevel === "PROVINCE" ? allAgents : selectedCity ? selectedCity.jaring : allAgents;
    const generalQuery = searchQuery.trim().toLowerCase();
    const listQuery = agentSearchQuery.trim().toLowerCase();
    const dateRangeMilliseconds: Record<Exclude<DateRangeOption, "ALL">, number> = {
      "24H": 86_400_000,
      "7D": 7 * 86_400_000,
      "30D": 30 * 86_400_000,
    };

    return source.filter((agent) => {
      if (selectedDistrictId && agent.districtId !== selectedDistrictId) return false;

      if (selectedVillage) {
        if (agent.villageName.toLowerCase() !== selectedVillage.name.toLowerCase()) return false;
      }

      if (!statusFilter.ALL) {
        if (!statusFilter[agent.status]) return false;
      }

      const searchableText = [
        agent.fullName,
        agent.whatsappNumber,
        agent.aliasName,
        agent.fieldOfficerName,
        agent.villageName,
        agent.districtName,
        agent.cityName,
        agent.provinceName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (generalQuery && !searchableText.includes(generalQuery)) return false;
      if (listQuery && !searchableText.includes(listQuery)) return false;

      if (dateRange !== "ALL") {
        if (!agent.lastReportAt) return false;
        const reportedAt = new Date(agent.lastReportAt).getTime();
        if (!Number.isFinite(reportedAt) || reportedAt < Date.now() - dateRangeMilliseconds[dateRange]) return false;
      }

      if (rightPanelTab === "VERIFIED" && agent.status !== "VERIFIED") return false;
      if (rightPanelTab === "PENDING" && agent.status !== "PENDING") return false;

      return true;
    });
  }, [
    selectedCity,
    allAgents,
    adminLevel,
    searchQuery,
    agentSearchQuery,
    selectedDistrictId,
    selectedVillage,
    statusFilter,
    rightPanelTab,
    dateRange,
  ]);

  const selectedJaring = useMemo(() => {
    if (!selectedJaringId) return null;
    return allAgents.find((a) => a.id === selectedJaringId) ?? null;
  }, [selectedJaringId, allAgents]);

  const regionContext = useMemo(() => {
    const regionName = selectedVillage
      ? selectedVillage.name
      : selectedDistrict
        ? selectedDistrict.name
        : adminLevel === "PROVINCE"
          ? (cities[0]?.provinceName ?? "Seluruh wilayah")
          : (selectedCity?.name ?? "Seluruh wilayah");

    const levelName = selectedVillage
      ? "Kelurahan/Desa"
      : selectedDistrict
        ? "Kecamatan"
        : adminLevel === "PROVINCE"
          ? "Provinsi"
          : selectedCity
          ? "Kota/Kabupaten"
          : "Provinsi";

    return { regionName, levelName };
  }, [selectedVillage, selectedDistrict, adminLevel, cities, selectedCity]);

  const summaryStats = useMemo(() => {
    const verified = filteredAgents.filter((a) => a.status === "VERIFIED").length;
    const pending = filteredAgents.filter((a) => a.status === "PENDING").length;
    const rejected = filteredAgents.filter((a) => a.status === "REJECTED").length;

    return {
      regionName: regionContext.regionName,
      levelName: regionContext.levelName,
      total: filteredAgents.length,
      verified,
      pending,
      rejected,
    };
  }, [filteredAgents, regionContext]);

  const mask = useMemo(
    () => (selectedCity && adminLevel !== "PROVINCE" ? outsideCityMask(selectedCity) : null),
    [adminLevel, selectedCity],
  );

  const handleSelectAgent = useCallback(
    (agent: JaringDistributionEntry) => {
      setSelectedJaringId(agent.id);
      setIsRightPanelOpen(true);
      const map = mapRef.current;
      const longitude = effectiveCoordinateSourceMode === "laporan" ? agent.latestReportLng : agent.longitude;
      const latitude = effectiveCoordinateSourceMode === "laporan" ? agent.latestReportLat : agent.latitude;
      if (map && longitude != null && latitude != null) {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 14.5,
          duration: 1000,
        });
      }
    },
    [effectiveCoordinateSourceMode],
  );

  const handleSelectCity = useCallback(
    (cityId: string) => {
      setSelectedCityId(cityId);
      setSelectedDistrictId(null);
      setSelectedVillageId(null);
      const city = cities.find((c) => c.id === cityId);
      if (mapRef.current && city) {
        fitCity(mapRef.current, city, isRightPanelOpen);
      } else if (mapRef.current && !cityId) {
        setAdminLevel("PROVINCE");
        fitAllCities(mapRef.current, cities);
      }
    },
    [cities, isRightPanelOpen],
  );

  const handleSelectDistrict = useCallback(
    (districtId: string) => {
      setSelectedDistrictId(districtId || null);
      setSelectedVillageId(null);
      const district = selectedCity?.districts.find((d) => d.id === districtId);
      if (mapRef.current && district) {
        focusDistrict(mapRef.current, district, isRightPanelOpen);
      }
    },
    [selectedCity, isRightPanelOpen],
  );

  const handleSelectVillage = useCallback((villageId: string) => {
    setSelectedVillageId(villageId || null);
  }, []);

  const handleStatusTabChange = useCallback((tab: "ALL" | "VERIFIED" | "PENDING") => {
    setRightPanelTab(tab);
    setStatusFilter({
      ALL: tab === "ALL",
      VERIFIED: tab === "ALL" || tab === "VERIFIED",
      PENDING: tab === "ALL" || tab === "PENDING",
      REJECTED: tab === "ALL",
    });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none flex flex-col">
      {/* 1. Command Center Telemetry Header */}
      <SebaranJaringHeader
        cities={cities}
        selectedCityId={selectedCityId}
        onSelectCity={handleSelectCity}
        totalEntities={summaryStats.total}
        currentTime={currentTime}
        lastSyncedAt={lastSyncedAt}
        loading={isRefreshing}
        onRefresh={refreshData}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
        showAllCities={allowedAdminLevels.includes("PROVINCE")}
        mode={mode}
      />

      {/* 2. Main Workspace Layout */}
      <div className="relative flex-1 w-full overflow-hidden flex">
        {/* Left Sidebar Panel */}
        <SebaranJaringLeftPanel
          isOpen={isLeftPanelOpen}
          onClose={() => setIsLeftPanelOpen(false)}
          cities={cities}
          selectedCityId={selectedCityId}
          selectedDistrictId={selectedDistrictId}
          selectedVillageId={selectedVillageId}
          availableVillages={availableVillages}
          adminLevel={adminLevel}
          allowedAdminLevels={allowedAdminLevels}
          onSelectAdminLevel={(level) => {
            setAdminLevel(level);
            if (level === "PROVINCE") handleSelectCity("");
            else if (!selectedCityId && firstCity) handleSelectCity(firstCity.id);
          }}
          onSelectCity={handleSelectCity}
          onSelectDistrict={handleSelectDistrict}
          onSelectVillage={handleSelectVillage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={(value) => {
            setStatusFilter(value);
            setRightPanelTab("ALL");
          }}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onResetFilters={() => {
            setSearchQuery("");
            setStatusFilter({ ALL: true, VERIFIED: true, PENDING: true, REJECTED: true });
            setDateRange("ALL");
            setSelectedDistrictId(null);
            setSelectedVillageId(null);
          }}
          summaryStats={summaryStats}
          mode={mode}
        />

        {/* Center GIS Map Workspace & Floating Telemetry Bar */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <SebaranJaringLeadershipStrip
            agents={filteredAgents}
            regionLabel={summaryStats.regionName}
            coordinateSourceMode={effectiveCoordinateSourceMode}
            onShowPending={() => {
              handleStatusTabChange("PENDING");
              setIsRightPanelOpen(true);
            }}
            onShowAll={() => {
              handleStatusTabChange("ALL");
              setIsRightPanelOpen(true);
            }}
            mode={mode}
          />
          <SebaranJaringMapView
            adminLevel={adminLevel}
            cities={cities}
            selectedCity={selectedCity}
            selectedDistrictId={selectedDistrictId}
            selectedVillageId={selectedVillageId}
            filteredAgents={filteredAgents}
            selectedJaring={selectedJaring}
            onSelectAgent={handleSelectAgent}
            onSelectDistrict={handleSelectDistrict}
            onSelectVillage={setSelectedVillageId}
            onSelectCity={handleSelectCity}
            onSelectAdminLevel={setAdminLevel}
            onClosePopup={() => setSelectedJaringId(null)}
            displayMode={displayMode}
            isClusterMode={isClusterMode}
            onToggleClusterMode={setIsClusterMode}
            coordinateSourceMode={effectiveCoordinateSourceMode}
            mapStyleMode={mapStyleMode}
            mask={mask}
            mode={mode}
            onMapReady={(map) => {
              mapRef.current = map;
              map.dragPan.enable();
              map.dragRotate.enable();
              map.scrollZoom.enable();
              map.boxZoom.enable();
              map.doubleClickZoom.enable();
              map.keyboard.enable();
              map.touchZoomRotate.enable();
              if (selectedCity) {
                fitCity(map, selectedCity, isRightPanelOpen);
              } else {
                fitAllCities(map, cities);
              }
              const updateTelemetry = () => {
                const center = map.getCenter();
                setMapTelemetry({ center: [center.lng, center.lat], zoom: map.getZoom() });
              };
              updateTelemetry();
              map.on("moveend", updateTelemetry);
            }}
          />

          {/* Bottom GIS Controls & Telemetry Status Bar */}
          <SebaranJaringBottomBar
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            mapStyle={mapStyleMode}
            onMapStyleChange={setMapStyleMode}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            coordinateSourceMode={effectiveCoordinateSourceMode}
            onCoordinateSourceModeChange={setCoordinateSourceMode}
            centerCoords={`${mapTelemetry.center[1].toFixed(4)}, ${mapTelemetry.center[0].toFixed(4)}`}
            zoomLevel={mapTelemetry.zoom.toFixed(1)}
            adminLevelLabel={summaryStats.levelName}
            mode={mode}
          />
        </div>

        {/* Right Sidebar Panel */}
        <SebaranJaringRightPanel
          isOpen={isRightPanelOpen}
          onClose={() => setIsRightPanelOpen(false)}
          filteredAgents={filteredAgents}
          selectedJaring={selectedJaring}
          onSelectAgent={handleSelectAgent}
          onDeselectAgent={() => setSelectedJaringId(null)}
          searchQuery={agentSearchQuery}
          onSearchQueryChange={setAgentSearchQuery}
          activeTab={rightPanelTab}
          onTabChange={handleStatusTabChange}
          coordinateSourceMode={effectiveCoordinateSourceMode}
          mode={mode}
        />
      </div>
    </div>
  );
}
