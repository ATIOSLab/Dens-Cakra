"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Building2,
  ChevronRight,
  ContactRound,
  Focus,
  ListFilter,
  MapPin,
  MapPinned,
  Maximize2,
  Minimize2,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map as BaseMap, MapControls, MapGeoJSON } from "@/components/ui/map";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import {
  CALLOUT_COLORS,
  DEFAULT_CENTER,
  districtCoordinate,
  type DistrictFeatureProperties,
  geoJsonBounds,
  type JaringDistributionCity,
  type JaringDistributionDistrict,
  type JaringDistributionEntry,
  SATELLITE_LAYER_ID,
  SATELLITE_SOURCE_ID,
  SATELLITE_TILES,
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

function ensureSatelliteLayer(map: MapLibreMap) {
  if (!map.getSource(SATELLITE_SOURCE_ID)) {
    map.addSource(SATELLITE_SOURCE_ID, {
      type: "raster",
      tiles: [SATELLITE_TILES],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Esri World Imagery",
    });
  }

  if (!map.getLayer(SATELLITE_LAYER_ID)) {
    map.addLayer({
      id: SATELLITE_LAYER_ID,
      type: "raster",
      source: SATELLITE_SOURCE_ID,
      paint: {
        "raster-opacity": 0.94,
        "raster-brightness-max": 0.72,
        "raster-contrast": 0.16,
        "raster-saturation": -0.12,
      },
    });
  }
}

function fitCity(map: MapLibreMap, city: JaringDistributionCity, compact: boolean) {
  const cityGeometry =
    city.geometry ??
    ({
      type: "GeometryCollection",
      geometries: city.districts.flatMap((district) => (district.geometry ? [district.geometry] : [])),
    } satisfies GeoJSON.GeometryCollection);
  const bounds = geoJsonBounds(cityGeometry);
  if (!bounds) return;

  map.fitBounds(bounds, {
    padding: compact ? { top: 132, right: 26, bottom: 34, left: 26 } : { top: 112, right: 42, bottom: 42, left: 42 },
    maxZoom: 12.2,
    duration: 650,
  });
}

function focusDistrict(map: MapLibreMap, district: JaringDistributionDistrict, compact: boolean) {
  if (!district.geometry) {
    const coordinate = districtCoordinate(district);
    if (coordinate) {
      map.easeTo({ center: coordinate, zoom: 13, duration: 700 });
    }
    return;
  }

  const bounds = geoJsonBounds(district.geometry);
  if (!bounds) return;

  map.fitBounds(bounds, {
    padding: compact ? { top: 132, right: 26, bottom: 230, left: 26 } : { top: 112, right: 400, bottom: 42, left: 42 },
    maxZoom: 13.5,
    duration: 700,
  });
}

function cityDisplayName(name: string) {
  return name.replace(/^KOTA\s+/i, "").replace(/^KABUPATEN\s+/i, "");
}

function getInitials(value?: string | null) {
  if (!value) return "JR";
  const words = value.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function genderDisplayName(gender: string | null) {
  if (gender === "MALE") return "Laki-laki";
  if (gender === "FEMALE") return "Perempuan";
  return null;
}

function formatJaringDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function JaringDistributionClient({ cities }: { cities: JaringDistributionCity[] }) {
  const firstCity = cities.at(0);
  const [selectedCityId, setSelectedCityId] = useState(firstCity ? firstCity.id : "");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isJaringPanelOpen, setIsJaringPanelOpen] = useState(false);
  const [jaringSearch, setJaringSearch] = useState("");
  const [filterSelectedDistrict, setFilterSelectedDistrict] = useState(true);
  const [selectedJaringId, setSelectedJaringId] = useState<string | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selectedCity = cities.find((city) => city.id === selectedCityId) ?? firstCity ?? null;
  const selectedDistrict = selectedCity?.districts.find((district) => district.id === selectedDistrictId) ?? null;
  const selectedJaring = selectedCity?.jaring.find((item) => item.id === selectedJaringId) ?? null;
  const selectedDistrictIndex =
    selectedCity?.districts.findIndex((district) => district.id === selectedDistrictId) ?? -1;
  const selectedDistrictColor =
    selectedDistrictIndex >= 0 ? CALLOUT_COLORS[selectedDistrictIndex % CALLOUT_COLORS.length] : CALLOUT_COLORS[0];
  const visibleJaring = useMemo(() => {
    const normalizedSearch = jaringSearch.trim().toLowerCase();

    return (selectedCity?.jaring ?? []).filter((item) => {
      if (filterSelectedDistrict && selectedDistrict && item.districtId !== selectedDistrict.id) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        item.aliasName,
        item.code,
        item.fullName,
        item.districtName,
        item.villageName,
        item.fieldOfficerName,
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    });
  }, [filterSelectedDistrict, jaringSearch, selectedCity, selectedDistrict]);

  const collection = useMemo<GeoJSON.FeatureCollection<GeoJSON.Geometry, DistrictFeatureProperties>>(
    () => ({
      type: "FeatureCollection",
      features:
        selectedCity?.districts.flatMap((district, index) =>
          district.geometry
            ? [
                {
                  type: "Feature" as const,
                  id: district.id,
                  geometry: district.geometry,
                  properties: {
                    areaId: district.id,
                    name: district.name,
                    total: district.total,
                    color: CALLOUT_COLORS[index % CALLOUT_COLORS.length],
                  },
                },
              ]
            : [],
        ) ?? [],
    }),
    [selectedCity],
  );

  const mask = useMemo(() => (selectedCity ? outsideCityMask(selectedCity) : null), [selectedCity]);

  const selectedDistrictFeature = useMemo<GeoJSON.Feature<GeoJSON.Geometry> | null>(() => {
    const district = selectedCity?.districts.find((item) => item.id === selectedDistrictId);
    if (!district?.geometry) return null;

    return {
      type: "Feature",
      properties: {},
      geometry: district.geometry,
    };
  }, [selectedCity, selectedDistrictId]);

  const cityOutline = useMemo<GeoJSON.Feature<GeoJSON.Geometry> | null>(() => {
    if (!selectedCity?.geometry) return null;
    return {
      type: "Feature",
      properties: {},
      geometry: selectedCity.geometry,
    };
  }, [selectedCity]);

  const selectDistrict = useCallback(
    (districtId: string, moveCamera = true) => {
      setSelectedDistrictId(districtId);
      setFilterSelectedDistrict(true);
      setIsJaringPanelOpen(true);
      if (!moveCamera) return;

      const map = mapRef.current;
      const canvas = canvasRef.current;
      const district = selectedCity?.districts.find((item) => item.id === districtId);
      if (!map || !canvas || !district) return;

      focusDistrict(map, district, canvas.clientWidth < 1024);
    },
    [selectedCity],
  );

  const resetCityView = useCallback(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !selectedCity) return;

    setSelectedDistrictId(null);
    fitCity(map, selectedCity, canvas.clientWidth < 1024);
  }, [selectedCity]);

  useEffect(() => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !selectedCity) return;

    fitCity(map, selectedCity, canvas.clientWidth < 1024);
  }, [selectedCity]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === canvasRef.current;
      setIsFullscreen(fullscreen);

      requestAnimationFrame(() => {
        const map = mapRef.current;
        const canvas = canvasRef.current;
        if (!map || !canvas || !selectedCity) return;

        map.resize();
        if (selectedDistrict) {
          focusDistrict(map, selectedDistrict, canvas.clientWidth < 1024);
        } else {
          fitCity(map, selectedCity, canvas.clientWidth < 1024);
        }
      });
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [selectedCity, selectedDistrict]);

  const toggleFullscreen = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (document.fullscreenElement === canvas) {
      await document.exitFullscreen();
      return;
    }

    await canvas.requestFullscreen();
  };

  if (!selectedCity) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-4">
        <div className="flex min-h-[420px] flex-col items-center justify-center gap-3 border border-dashed bg-card p-8 text-center">
          <MapPinned className="size-9 text-muted-foreground" />
          <h1 className="font-semibold text-xl">Sebaran Jaring belum tersedia</h1>
          <p className="max-w-lg text-muted-foreground text-sm">
            Cakupan kota belum ditemukan pada penugasan Field Coordinator ini.
          </p>
        </div>
      </main>
    );
  }

  const cityName = cityDisplayName(selectedCity.name);

  return (
    <main className="h-screen w-screen overflow-hidden bg-slate-100">
      <section
        ref={canvasRef}
        className="relative h-screen min-h-screen w-screen overflow-hidden bg-slate-100"
        aria-label={`Peta sebaran Jaring ${selectedCity.name}`}
      >
        <BaseMap
          center={DEFAULT_CENTER}
          zoom={9}
          minZoom={8}
          maxZoom={16}
          blank
          className="absolute inset-0"
          onMapReady={(map) => {
            mapRef.current = map;
            ensureSatelliteLayer(map);
            map.dragPan.enable();
            map.dragRotate.enable();
            map.scrollZoom.enable();
            map.boxZoom.enable();
            map.doubleClickZoom.enable();
            map.keyboard.enable();
            map.touchZoomRotate.enable();
            fitCity(map, selectedCity, (canvasRef.current?.clientWidth ?? 0) < 1024);
          }}
        >
          <MapControls position={isJaringPanelOpen ? "bottom-left" : "bottom-right"} showZoom showCompass />
          {mask ? (
            <MapGeoJSON data={mask} fillPaint={{ "fill-color": "#dbe4ee", "fill-opacity": 0.72 }} linePaint={false} />
          ) : null}
          <MapGeoJSON
            data={collection}
            promoteId="areaId"
            fillPaint={{ "fill-color": "#ffffff", "fill-opacity": 0 }}
            linePaint={{
              "line-color": "#020617",
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3.8, 14, 5.4],
              "line-opacity": 0.78,
            }}
          />
          <MapGeoJSON
            data={collection}
            promoteId="areaId"
            interactive
            fillPaint={{ "fill-color": ["get", "color"], "fill-opacity": 0.04 }}
            fillHoverPaint={{ "fill-color": ["get", "color"], "fill-opacity": 0.3 }}
            linePaint={{
              "line-color": ["get", "color"],
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 1.8, 14, 3],
              "line-opacity": 1,
            }}
            onClick={({ feature }) => {
              const properties = feature.properties as DistrictFeatureProperties;
              selectDistrict(properties.areaId);
            }}
          />
          {selectedDistrictFeature ? (
            <MapGeoJSON
              data={selectedDistrictFeature}
              fillPaint={{ "fill-color": selectedDistrictColor, "fill-opacity": 0.24 }}
              linePaint={{ "line-color": "#ffffff", "line-width": 4, "line-opacity": 1 }}
            />
          ) : null}
          {cityOutline ? (
            <MapGeoJSON
              data={cityOutline}
              fillPaint={{ "fill-color": "#ffffff", "fill-opacity": 0 }}
              linePaint={{ "line-color": "#f8fafc", "line-width": 3.2, "line-opacity": 0.94 }}
            />
          ) : null}
        </BaseMap>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-col gap-3 border-white/70 border-b bg-white/92 px-4 py-3 text-slate-950 shadow-sm backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-sky-950 font-bold text-sm text-white shadow-sm">
              DC
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[9px] text-slate-500 uppercase">Dens Cakra Intelligence Network</p>
              <h1 className="truncate font-bold text-base text-sky-950 md:text-lg">
                Penguatan Jaring <span className="text-amber-600">Wilayah {cityName}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {cities.length > 1 ? (
              <NativeSelect
                value={selectedCity.id}
                onChange={(event) => {
                  setSelectedCityId(event.target.value);
                  setSelectedDistrictId(null);
                  setSelectedJaringId(null);
                  setJaringSearch("");
                  setFilterSelectedDistrict(false);
                }}
                aria-label="Pilih kota"
                className="pointer-events-auto h-9 min-w-48 shrink-0 bg-white/90"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
            <HeaderMetric label="Kecamatan" value={selectedCity.districts.length} />
            <HeaderMetric label="Kelurahan" value={selectedCity.villageCount} />
            <HeaderMetric label="Terverifikasi" value={selectedCity.approved} accent />
            <HeaderMetric label="Total Jaring" value={selectedCity.total} emphasis />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetCityView}
              className="pointer-events-auto h-9 shrink-0 gap-1.5 bg-white/90"
            >
              <Focus className="size-4" />
              Fokus Kota
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="pointer-events-auto h-9 shrink-0 gap-1.5 bg-white/90"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              {isFullscreen ? "Keluar" : "Layar Penuh"}
            </Button>
          </div>
        </div>

        {!isJaringPanelOpen ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFilterSelectedDistrict(Boolean(selectedDistrict));
              setIsJaringPanelOpen(true);
            }}
            className="absolute top-1/2 right-3 z-30 h-10 -translate-y-1/2 gap-2 border-white/70 bg-white/94 px-3 shadow-lg backdrop-blur-md"
          >
            <ListFilter className="size-4 text-sky-700" />
            Daftar Jaring
            <span className="rounded-full bg-sky-950 px-1.5 py-0.5 font-bold text-[10px] text-white">
              {selectedCity.total.toLocaleString("id-ID")}
            </span>
          </Button>
        ) : null}

        {selectedDistrict ? (
          <div className="pointer-events-none absolute top-[117px] left-0 z-40 w-full max-w-[420px] p-3 md:top-[69px]">
            <div className="pointer-events-auto w-full">
              <SelectedDistrictCard district={selectedDistrict} color={selectedDistrictColor} onClose={resetCityView} />
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute top-[117px] right-0 bottom-0 z-40 flex w-full max-w-[432px] p-3 md:top-[69px]">
          <JaringListPanel
            city={selectedCity}
            district={selectedDistrict}
            districtColor={selectedDistrictColor}
            filterSelectedDistrict={filterSelectedDistrict}
            items={visibleJaring}
            open={isJaringPanelOpen}
            search={jaringSearch}
            onClose={() => setIsJaringPanelOpen(false)}
            onItemSelect={(item) => setSelectedJaringId(item.id)}
            onSearchChange={setJaringSearch}
            onScopeChange={setFilterSelectedDistrict}
          />
        </div>

        {selectedJaring ? <JaringDetailModal item={selectedJaring} onClose={() => setSelectedJaringId(null)} /> : null}
      </section>
    </main>
  );
}

function HeaderMetric({
  label,
  value,
  accent = false,
  emphasis = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn("min-w-[82px] shrink-0 border-slate-200 border-l px-3 py-0.5", emphasis && "border-l-amber-400")}
    >
      <p className="whitespace-nowrap font-medium text-[9px] text-slate-500 uppercase">{label}</p>
      <p
        className={cn(
          "font-bold text-base text-slate-900 leading-tight",
          accent && "text-emerald-600",
          emphasis && "text-amber-600",
        )}
      >
        {value.toLocaleString("id-ID")}
      </p>
    </div>
  );
}

function JaringListPanel({
  city,
  district,
  districtColor,
  filterSelectedDistrict,
  items,
  open,
  search,
  onClose,
  onItemSelect,
  onSearchChange,
  onScopeChange,
}: {
  city: JaringDistributionCity;
  district: JaringDistributionDistrict | null;
  districtColor: string;
  filterSelectedDistrict: boolean;
  items: JaringDistributionEntry[];
  open: boolean;
  search: string;
  onClose: () => void;
  onItemSelect: (item: JaringDistributionEntry) => void;
  onSearchChange: (value: string) => void;
  onScopeChange: (selectedDistrictOnly: boolean) => void;
}) {
  const scopeName = filterSelectedDistrict && district ? district.name : cityDisplayName(city.name);
  const scopeTotal = filterSelectedDistrict && district ? district.total : city.total;

  return (
    <aside
      aria-hidden={!open}
      aria-label="Daftar Jaring terverifikasi"
      className={cn(
        "pointer-events-auto relative ml-auto flex min-h-0 w-full max-w-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/96 text-slate-950 shadow-[-18px_0_48px_rgba(15,23,42,0.22)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out",
        open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+1rem)] opacity-0",
      )}
    >
      <div className="border-slate-200 border-b px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sky-950 text-white shadow-sm">
              <ContactRound className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[9px] text-sky-700 uppercase">Jaring terverifikasi</p>
              <h2 className="truncate font-bold text-lg leading-tight">Daftar Jaring</h2>
              <p className="mt-1 truncate text-[11px] text-slate-500">{scopeName}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <div className="text-right">
              <p className="font-bold text-2xl text-sky-800 leading-none">{scopeTotal.toLocaleString("id-ID")}</p>
              <p className="mt-1 font-semibold text-[8px] text-slate-500 uppercase">Total Jaring</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Tutup daftar Jaring"
              title="Tutup panel"
              className="-mt-1 -mr-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {district ? (
        <div className="border-slate-200 border-b bg-slate-50/90 px-4 py-3">
          <div className="mb-2 flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: districtColor }} />
            <span className="truncate font-semibold text-xs">{district.name}</span>
            <span className="ml-auto shrink-0 text-[10px] text-slate-500">
              {district.total.toLocaleString("id-ID")} terverifikasi
            </span>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-md border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => onScopeChange(true)}
              className={cn(
                "h-8 rounded-[4px] px-2 font-semibold text-[11px] transition-colors",
                filterSelectedDistrict ? "bg-sky-950 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Kecamatan
            </button>
            <button
              type="button"
              onClick={() => onScopeChange(false)}
              className={cn(
                "h-8 rounded-[4px] px-2 font-semibold text-[11px] transition-colors",
                !filterSelectedDistrict ? "bg-sky-950 text-white" : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Seluruh Kota
            </button>
          </div>
        </div>
      ) : null}

      <div className="border-slate-200 border-b px-4 py-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari alias, nama, atau wilayah..."
            aria-label="Cari Jaring"
            className="h-9 bg-white pr-3 pl-9 text-xs"
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-slate-500">
          <span>{items.length.toLocaleString("id-ID")} Jaring ditampilkan</span>
          <span className="flex items-center gap-1 font-medium text-emerald-700">
            <ShieldCheck className="size-3" />
            Terverifikasi
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {items.length ? (
          <div className="divide-y divide-slate-200">
            {items.map((item) => {
              const displayName = item.aliasName ?? item.code;
              const genderLabel = genderDisplayName(item.gender);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemSelect(item)}
                  className="group flex min-h-[84px] w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none"
                >
                  <Avatar className="size-10 shrink-0 border border-slate-200 bg-slate-100">
                    {item.profilePhotoFileId ? (
                      <AvatarImage src={`/api/files/${item.profilePhotoFileId}`} alt={displayName} />
                    ) : null}
                    <AvatarFallback className="bg-slate-100 font-bold text-[11px] text-slate-600">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-baseline gap-2">
                      <p className="truncate font-bold text-slate-950 text-sm">{displayName}</p>
                      <span className="shrink-0 text-[9px] text-slate-400">{item.code}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-600">
                      {[item.fullName, genderLabel].filter(Boolean).join(" | ") || "Nama belum dilengkapi"}
                    </p>
                    <div className="mt-1.5 flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                      <MapPin className="size-3 shrink-0 text-sky-600" />
                      <span className="truncate">
                        {item.villageName}, {item.districtName}
                      </span>
                    </div>
                    {item.fieldOfficerName ? (
                      <div className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-slate-500">
                        <UserRound className="size-3 shrink-0" />
                        <span className="truncate">{item.fieldOfficerName}</span>
                      </div>
                    ) : null}
                  </div>

                  <ChevronRight className="size-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-700" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-56 flex-col items-center justify-center px-8 text-center">
            <div className="flex size-11 items-center justify-center rounded-md bg-slate-100 text-slate-400">
              <ListFilter className="size-5" />
            </div>
            <p className="mt-3 font-semibold text-slate-800 text-sm">Jaring tidak ditemukan</p>
            <p className="mt-1 max-w-64 text-[11px] text-slate-500 leading-relaxed">
              {search
                ? "Tidak ada Jaring terverifikasi yang sesuai dengan pencarian."
                : `Belum ada Jaring terverifikasi di ${scopeName}.`}
            </p>
            {district && filterSelectedDistrict ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onScopeChange(false)}
                className="mt-4 h-8 text-[11px]"
              >
                Lihat seluruh kota
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </aside>
  );
}

function JaringDetailModal({ item, onClose }: { item: JaringDistributionEntry; onClose: () => void }) {
  const displayName = item.aliasName ?? item.code;
  const genderLabel = genderDisplayName(item.gender) ?? "-";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="pointer-events-auto absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Tutup detail Jaring"
      />
      <article
        role="dialog"
        aria-modal="true"
        aria-label={`Detail Jaring ${displayName}`}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-[560px] overflow-hidden rounded-lg border border-white/80 bg-white text-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.38)]"
      >
        <div className="border-slate-200 border-b px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar className="size-16 shrink-0 border border-slate-200 bg-slate-100">
                {item.profilePhotoFileId ? (
                  <AvatarImage src={`/api/files/${item.profilePhotoFileId}`} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-slate-100 font-bold text-slate-600">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold text-[10px] text-emerald-700 uppercase">
                  <ShieldCheck className="size-3.5" />
                  Jaring terverifikasi
                </p>
                <h2 className="mt-1 truncate font-bold text-xl leading-tight">{displayName}</h2>
                <p className="mt-1 font-semibold text-[11px] text-slate-500">{item.code}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Tutup detail Jaring"
              title="Tutup detail"
              className="-mt-1 -mr-1 shrink-0 text-slate-500 hover:bg-slate-100"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <JaringDetailField label="Nama lengkap" value={item.fullName ?? "Nama belum dilengkapi"} />
            <JaringDetailField label="Jenis kelamin" value={genderLabel} />
            <JaringDetailField label="Kelurahan/Desa" value={item.villageName} />
            <JaringDetailField label="Kecamatan" value={item.districtName} />
            <JaringDetailField label="Petugas" value={item.fieldOfficerName ?? "Belum ditugaskan"} />
            <JaringDetailField label="Registrasi" value={formatJaringDateTime(item.registeredAt)} />
          </div>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin className="size-4 shrink-0 text-sky-700" />
              <p className="font-semibold text-[10px] uppercase">Alamat</p>
            </div>
            <p className="mt-2 text-sm leading-relaxed">{item.address ?? "Alamat belum dilengkapi"}</p>
          </div>
        </div>
      </article>
    </div>
  );
}

function JaringDetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-white p-3">
      <p className="font-semibold text-[10px] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 truncate font-semibold text-slate-900 text-sm" title={value}>
        {value}
      </p>
    </div>
  );
}

function SelectedDistrictCard({
  district,
  color,
  onClose,
}: {
  district: JaringDistributionDistrict;
  color: string;
  onClose: () => void;
}) {
  const officerLabel = district.fieldOfficerNames.length ? district.fieldOfficerNames.join(", ") : "Belum ditugaskan";

  return (
    <aside
      className="overflow-hidden rounded-lg border border-white/80 border-t-[4px] bg-white/96 p-4 text-left text-slate-950 shadow-[0_18px_48px_rgba(15,23,42,0.34)] backdrop-blur-xl"
      style={{ borderTopColor: color }}
      aria-label={`Informasi Kecamatan ${district.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="font-semibold text-[9px] text-slate-500 uppercase">Kecamatan terpilih</span>
          </div>
          <p className="mt-1 truncate font-bold text-lg text-slate-950 leading-tight">{district.name}</p>
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-slate-500">
            <UserRound className="size-3 shrink-0" />
            <span className="truncate text-[11px]" title={officerLabel}>
              {officerLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p className="font-bold text-3xl text-sky-800 leading-none">{district.total.toLocaleString("id-ID")}</p>
            <p className="mt-1 font-semibold text-[8px] text-slate-500 uppercase">Total Jaring</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            className="-mt-1 -mr-1 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup informasi kecamatan"
            title="Tutup informasi"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 bg-slate-50 py-3">
        <DistrictMetric icon={Building2} label="Kelurahan" value={district.villageCount} />
        <DistrictMetric icon={MapPin} label="Petugas" value={district.fieldOfficerCount} />
        <DistrictMetric icon={ShieldCheck} label="Verifikasi" value={district.approved} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-slate-200 border-t pt-3">
        <DistrictStatus label="Belum terverifikasi" value={district.pending} tone="text-amber-600" />
        <DistrictStatus label="Terverifikasi" value={district.approved} tone="text-emerald-600" />
        <DistrictStatus label="Ditolak" value={district.rejected} tone="text-rose-600" />
      </div>
    </aside>
  );
}

function DistrictMetric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-1.5 px-1">
      <Icon className="size-3.5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <p className="font-bold text-slate-800 text-sm leading-none">{value.toLocaleString("id-ID")}</p>
        <p className="mt-1 truncate text-[8px] text-slate-500 uppercase">{label}</p>
      </div>
    </div>
  );
}

function DistrictStatus({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-0 text-center">
      <p className={cn("font-bold text-base leading-none", tone)}>{value.toLocaleString("id-ID")}</p>
      <p className="mt-1 truncate text-[8px] text-slate-500 uppercase">{label}</p>
    </div>
  );
}
