"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";

import {
  type AdminLayersState,
  type AdminLevel,
  type AgentOperationalStatus,
  type CoordinateSourceMode,
  type DateRangeOption,
  DEFAULT_CENTER,
  type DisplayMode,
  districtCoordinate,
  geoJsonBounds,
  type JaringDistributionCity,
  type JaringDistributionDistrict,
  type JaringDistributionEntry,
  type MapStyleMode,
} from "./sebaran-jaring-types";

import { SebaranJaringHeader } from "./sebaran-jaring-header";
import { SebaranJaringLeftPanel } from "./sebaran-jaring-left-panel";
import { SebaranJaringMapView } from "./sebaran-jaring-map-view";
import { SebaranJaringBottomBar } from "./sebaran-jaring-bottom-bar";
import { SebaranJaringRightPanel } from "./sebaran-jaring-right-panel";

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
  const districtBoundsList = city.districts.flatMap((district) => (district.geometry ? [geoJsonBounds(district.geometry)] : []));
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
};

export function JaringDistributionClient({
  cities,
  allowedAdminLevels = ["PROVINCE", "CITY", "DISTRICT", "VILLAGE"],
}: Props) {
  const firstCity = cities[0] ?? null;
  const mapRef = useRef<MapLibreMap | null>(null);

  // Core State
  const [selectedCityId, setSelectedCityId] = useState<string>(firstCity?.id ?? "");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null);
  const [selectedJaringId, setSelectedJaringId] = useState<string | null>(null);

  const [adminLevel, setAdminLevel] = useState<AdminLevel>(
    allowedAdminLevels.includes("PROVINCE")
      ? "PROVINCE"
      : (allowedAdminLevels[0] ?? "CITY"),
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>("marker");
  const [mapStyleMode, setMapStyleMode] = useState<MapStyleMode>("dark");
  const [dateRange, setDateRange] = useState<DateRangeOption>("7D");
  const [isClusterMode, setIsClusterMode] = useState<boolean>(true);
  const [coordinateSourceMode, setCoordinateSourceMode] = useState<CoordinateSourceMode>("domisili");

  // Panel Visibilities
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [agentSearchQuery, setAgentSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Record<AgentOperationalStatus | "ALL", boolean>>({
    ALL: true,
    VERIFIED: true,
    PENDING: true,
    REJECTED: true,
  });
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [rightPanelTab, setRightPanelTab] = useState<"ALL" | "VERIFIED" | "PENDING">("ALL");

  const [adminLayers, setAdminLayers] = useState<AdminLayersState>({
    province: true,
    city: true,
    district: true,
    village: false,
  });

  // Clock Telemetry State
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const year = now.getFullYear().toString().substring(2);
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      setCurrentTime(`UTC+7 ${year}.${month}.${day} ${hours}:${minutes}:${seconds} WIB`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectedCity = useMemo(() => {
    return cities.find((c) => c.id === selectedCityId) ?? firstCity ?? null;
  }, [cities, selectedCityId, firstCity]);

  const selectedDistrict = useMemo(() => {
    return selectedCity?.districts.find((d) => d.id === selectedDistrictId) ?? null;
  }, [selectedCity, selectedDistrictId]);

  const availableVillages = useMemo(() => {
    if (selectedDistrict) {
      return selectedDistrict.villages;
    }
    if (selectedCity) {
      return selectedCity.districts.flatMap((d) => d.villages);
    }
    return cities.flatMap((c) => c.districts.flatMap((d) => d.villages));
  }, [selectedDistrict, selectedCity, cities]);

  const selectedVillage = useMemo(() => {
    if (!selectedVillageId) return null;
    return availableVillages.find((v) => v.id === selectedVillageId) ?? null;
  }, [availableVillages, selectedVillageId]);

  const allAgents = useMemo(() => {
    return cities.flatMap((c) => c.jaring);
  }, [cities]);

  const filteredAgents = useMemo(() => {
    const source = selectedCity ? selectedCity.jaring : allAgents;
    const query = searchQuery.trim().toLowerCase() || agentSearchQuery.trim().toLowerCase();

    return source.filter((agent) => {
      if (selectedDistrictId && agent.districtId !== selectedDistrictId) return false;

      if (selectedVillage) {
        if (agent.villageName.toLowerCase() !== selectedVillage.name.toLowerCase()) return false;
      }

      if (!statusFilter.ALL) {
        if (!statusFilter[agent.status]) return false;
      }

      if (query) {
        const text = `${agent.code} ${agent.fullName || ""} ${agent.aliasName || ""} ${agent.villageName} ${agent.districtName}`.toLowerCase();
        if (!text.includes(query)) return false;
      }

      if (rightPanelTab === "VERIFIED" && agent.status !== "VERIFIED") return false;
      if (rightPanelTab === "PENDING" && agent.status !== "PENDING") return false;

      return true;
    });
  }, [selectedCity, allAgents, searchQuery, agentSearchQuery, selectedDistrictId, selectedVillage, statusFilter, rightPanelTab]);

  const selectedJaring = useMemo(() => {
    if (!selectedJaringId) return null;
    return allAgents.find((a) => a.id === selectedJaringId) ?? null;
  }, [selectedJaringId, allAgents]);

  // Dynamic Region Summary Metrics based strictly on API data
  const summaryStats = useMemo(() => {
    let agents = selectedDistrict
      ? (selectedCity?.jaring.filter((a) => a.districtId === selectedDistrict.id) ?? [])
      : selectedCity
        ? selectedCity.jaring
        : allAgents;

    if (selectedVillage) {
      agents = agents.filter((a) => a.villageName.toLowerCase() === selectedVillage.name.toLowerCase());
    }

    const verified = agents.filter((a) => a.status === "VERIFIED").length;
    const pending = agents.filter((a) => a.status === "PENDING").length;
    const rejected = agents.filter((a) => a.status === "REJECTED").length;

    const regionName = selectedVillage
      ? selectedVillage.name
      : selectedDistrict
        ? selectedDistrict.name
        : selectedCity?.name || "DKI Jakarta";

    const levelName = selectedVillage
      ? "Kelurahan"
      : selectedDistrict
        ? "Kecamatan"
        : selectedCity
          ? "Kota / Kab"
          : "Provinsi";

    return {
      regionName,
      levelName,
      total: agents.length,
      verified,
      pending,
      rejected,
    };
  }, [selectedVillage, selectedDistrict, selectedCity, allAgents]);

  const mask = useMemo(() => (selectedCity ? outsideCityMask(selectedCity) : null), [selectedCity]);

  const handleSelectAgent = useCallback((agent: JaringDistributionEntry) => {
    setSelectedJaringId(agent.id);
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [agent.longitude, agent.latitude],
        zoom: 14.5,
        duration: 1000,
      });
    }
  }, []);

  const handleSelectCity = useCallback((cityId: string) => {
    setSelectedCityId(cityId);
    setSelectedDistrictId(null);
    setSelectedVillageId(null);
    const city = cities.find((c) => c.id === cityId);
    if (mapRef.current && city) {
      fitCity(mapRef.current, city, isRightPanelOpen);
    }
  }, [cities, isRightPanelOpen]);

  const handleSelectDistrict = useCallback((districtId: string) => {
    setSelectedDistrictId(districtId || null);
    setSelectedVillageId(null);
    const district = selectedCity?.districts.find((d) => d.id === districtId);
    if (mapRef.current && district) {
      focusDistrict(mapRef.current, district, isRightPanelOpen);
    }
  }, [selectedCity, isRightPanelOpen]);

  const handleSelectVillage = useCallback((villageId: string) => {
    setSelectedVillageId(villageId || null);
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
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen(!isLeftPanelOpen)}
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
          onSelectAdminLevel={setAdminLevel}
          onSelectCity={handleSelectCity}
          onSelectDistrict={handleSelectDistrict}
          onSelectVillage={handleSelectVillage}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onResetFilters={() => {
            setSearchQuery("");
            setStatusFilter({ ALL: true, VERIFIED: true, PENDING: true, REJECTED: true });
            setCategoryFilter("ALL");
            setSelectedDistrictId(null);
            setSelectedVillageId(null);
          }}
          summaryStats={summaryStats}
        />

        {/* Center GIS Map Workspace & Floating Telemetry Bar */}
        <div className="flex-1 relative h-full w-full overflow-hidden">
          <SebaranJaringMapView
            adminLevel={adminLevel}
            cities={cities}
            selectedCity={selectedCity}
            selectedDistrictId={selectedDistrictId}
            selectedVillageId={selectedVillageId}
            filteredAgents={filteredAgents}
            totalAgentsCount={allAgents.length}
            selectedJaring={selectedJaring}
            onSelectAgent={handleSelectAgent}
            onSelectDistrict={handleSelectDistrict}
            onSelectVillage={setSelectedVillageId}
            onSelectCity={handleSelectCity}
            onSelectAdminLevel={setAdminLevel}
            onClosePopup={() => setSelectedJaringId(null)}
            onOpenRightPanel={() => setIsRightPanelOpen(true)}
            displayMode={displayMode}
            isClusterMode={isClusterMode}
            onToggleClusterMode={setIsClusterMode}
            coordinateSourceMode={coordinateSourceMode}
            mapStyleMode={mapStyleMode}
            mask={mask}
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
              }
            }}
          />

          {/* Bottom GIS Controls & Telemetry Status Bar */}
          <SebaranJaringBottomBar
            displayMode={displayMode}
            onDisplayModeChange={setDisplayMode}
            mapStyle={mapStyleMode}
            onMapStyleChange={setMapStyleMode}
            adminLayers={adminLayers}
            onAdminLayersChange={setAdminLayers}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            centerCoords="-6.1754, 106.8272"
            zoomLevel="10.2"
            adminLevelLabel={summaryStats.levelName}
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
          onTabChange={setRightPanelTab}
        />
      </div>
    </div>
  );
}
