"use client";

import { useEffect, useMemo, useRef } from "react";

import { ChevronRight, X } from "lucide-react";
import type { Map as MapLibreMap, PopupOptions, StyleSpecification } from "maplibre-gl";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Badge } from "@/components/ui/badge";
import { Map as BaseMap, MapControls, MapGeoJSON, MapMarker, MapPopup } from "@/components/ui/map";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { cn } from "@/lib/utils";

import {
  type AdminLevel,
  CALLOUT_COLORS,
  type CoordinateSourceMode,
  cityCoordinate,
  DEFAULT_CENTER,
  DISTRIBUTION_ENTITY_COPY,
  type DisplayMode,
  type DistributionEntityMode,
  type DistrictFeatureProperties,
  districtCoordinate,
  type JaringDistributionCity,
  type JaringDistributionEntry,
  type MapStyleMode,
  SATELLITE_TILES,
  STATUS_COLORS,
  STREET_TILES,
  signalLabelForMode,
  statusPresentationForMode,
  villageCoordinate,
} from "./sebaran-jaring-types";

export const MAP_TILE_STYLES: Record<MapStyleMode, StyleSpecification> = {
  dark: {
    version: 8,
    sources: {
      cartoDark: {
        type: "raster",
        tiles: [
          "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
          "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
        ],
        tileSize: 256,
        attribution: "CartoDB",
      },
    },
    layers: [
      {
        id: "carto-dark-layer",
        type: "raster",
        source: "cartoDark",
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  },
  street: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: [STREET_TILES],
        tileSize: 256,
        attribution: "OpenStreetMap",
      },
    },
    layers: [
      {
        id: "osm-layer",
        type: "raster",
        source: "osm",
      },
    ],
  },
  satellite: {
    version: 8,
    sources: {
      esriSat: {
        type: "raster",
        tiles: [SATELLITE_TILES],
        tileSize: 256,
        attribution: "Esri World Imagery",
      },
    },
    layers: [
      {
        id: "esri-sat-layer",
        type: "raster",
        source: "esriSat",
      },
    ],
  },
  terrain: {
    version: 8,
    sources: {
      esriTopo: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Esri Topo",
      },
    },
    layers: [
      {
        id: "esri-topo-layer",
        type: "raster",
        source: "esriTopo",
      },
    ],
  },
};

const DISTRIBUTION_POPUP_PADDING = {
  top: 96,
  right: 32,
  bottom: 176,
  left: 32,
} satisfies NonNullable<PopupOptions["padding"]>;

const DISTRIBUTION_POPUP_OFFSET = {
  center: [0, 0],
  top: [0, 18],
  "top-left": [14, 18],
  "top-right": [-14, 18],
  bottom: [0, -18],
  "bottom-left": [14, -18],
  "bottom-right": [-14, -18],
  left: [18, 0],
  right: [-18, 0],
} satisfies NonNullable<PopupOptions["offset"]>;

function agentCoordinate(agent: JaringDistributionEntry, source: CoordinateSourceMode): [number, number] | null {
  if (source === "laporan") {
    if (agent.latestReportLng == null || agent.latestReportLat == null) return null;
    return [agent.latestReportLng, agent.latestReportLat];
  }
  return [agent.longitude, agent.latitude];
}

type Props = {
  adminLevel?: AdminLevel;
  cities?: JaringDistributionCity[];
  selectedCity: JaringDistributionCity | null;
  selectedDistrictId?: string | null;
  selectedVillageId?: string | null;
  filteredAgents: JaringDistributionEntry[];
  selectedJaring: JaringDistributionEntry | null;
  onSelectAgent: (agent: JaringDistributionEntry) => void;
  onSelectDistrict: (districtId: string) => void;
  onSelectVillage?: (villageId: string) => void;
  onSelectCity?: (cityId: string) => void;
  onSelectAdminLevel?: (level: AdminLevel) => void;
  onClosePopup: () => void;
  displayMode?: DisplayMode;
  isClusterMode: boolean;
  onToggleClusterMode: (val: boolean) => void;
  coordinateSourceMode: CoordinateSourceMode;
  mapStyleMode: MapStyleMode;
  mask: GeoJSON.Feature<GeoJSON.Polygon> | null;
  onMapReady: (map: MapLibreMap) => void;
  mode?: DistributionEntityMode;
};

export function SebaranJaringMapView({
  adminLevel = "CITY",
  cities = [],
  selectedCity,
  selectedDistrictId,
  selectedVillageId,
  filteredAgents,
  selectedJaring,
  onSelectAgent,
  onSelectDistrict,
  onSelectVillage,
  onSelectCity,
  onSelectAdminLevel,
  onClosePopup,
  displayMode = "marker",
  isClusterMode,
  onToggleClusterMode,
  coordinateSourceMode,
  mapStyleMode,
  mask,
  onMapReady,
  mode = "jaring",
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const copy = DISTRIBUTION_ENTITY_COPY[mode];
  const activeStyle = MAP_TILE_STYLES[mapStyleMode] || MAP_TILE_STYLES.dark;
  const agentsWithCoordinates = useMemo(
    () => filteredAgents.filter((agent) => agentCoordinate(agent, coordinateSourceMode) !== null),
    [coordinateSourceMode, filteredAgents],
  );
  const selectedCoordinate = selectedJaring ? agentCoordinate(selectedJaring, coordinateSourceMode) : null;

  const districtCollection = useMemo<GeoJSON.FeatureCollection<GeoJSON.Geometry, DistrictFeatureProperties>>(() => {
    return {
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
    };
  }, [selectedCity]);

  // Dynamic Heatmap & Markers effect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const sourceId = "jaring-heatmap-source";
    const layerId = "jaring-heatmap-layer";

    const removeHeatmap = () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };

    if (displayMode !== "heatmap") {
      removeHeatmap();
      return;
    }

    const pointsGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: "FeatureCollection",
      features: agentsWithCoordinates.map((a) => {
        const coordinates = agentCoordinate(a, coordinateSourceMode) ?? [a.longitude, a.latitude];
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates,
          },
          properties: {
            id: a.id,
            weight: mode === "gaswil" ? 1 : a.reportCount > 0 ? a.reportCount : 1,
          },
        };
      }),
    };

    try {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(pointsGeoJSON);
      } else {
        map.addSource(sourceId, {
          type: "geojson",
          data: pointsGeoJSON,
        });

        map.addLayer({
          id: layerId,
          type: "heatmap",
          source: sourceId,
          maxzoom: 16,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 5, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0,0,0,0)",
              0.2,
              "rgb(6, 182, 212)",
              0.4,
              "rgb(59, 130, 246)",
              0.6,
              "rgb(234, 179, 8)",
              0.8,
              "rgb(249, 115, 22)",
              1,
              "rgb(239, 68, 68)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 15, 25],
            "heatmap-opacity": 0.85,
          },
        });
      }
    } catch {
      // ignore style loading race
    }
  }, [agentsWithCoordinates, coordinateSourceMode, displayMode, mode]);

  return (
    <main className="relative flex-1 h-full w-full bg-slate-950 overflow-hidden">
      <section ref={canvasRef} className="relative h-full w-full overflow-hidden">
        <BaseMap
          center={DEFAULT_CENTER}
          zoom={10}
          minZoom={4}
          maxZoom={18}
          styles={{ dark: activeStyle, light: activeStyle }}
          className="absolute inset-0"
          onMapReady={(map) => {
            mapInstanceRef.current = map;
            onMapReady(map);
          }}
        >
          <MapControls position="top-right" showZoom showCompass />

          {/* Outside boundary mask overlay */}
          {mask ? (
            <MapGeoJSON data={mask} fillPaint={{ "fill-color": "#020617", "fill-opacity": 0.65 }} linePaint={false} />
          ) : null}

          {/* Administrative Boundary GeoJSON */}
          <MapGeoJSON
            data={districtCollection}
            promoteId="areaId"
            fillPaint={{ "fill-color": "#06b6d4", "fill-opacity": 0.06 }}
            linePaint={{
              "line-color": "#0ea5e9",
              "line-width": 1.8,
              "line-opacity": 0.85,
            }}
          />

          {/* Cluster Badges on Map (Aggregated according to adminLevel or displayMode === 'cluster') */}
          {(displayMode === "cluster" || (displayMode === "marker" && isClusterMode)) &&
            (() => {
              if (adminLevel === "CITY") {
                if (!selectedCity) return null;
                const coord = cityCoordinate(selectedCity);
                if (!coord) return null;
                return (
                  <MapMarker key={`cluster-city-${selectedCity.id}`} longitude={coord[0]} latitude={coord[1]}>
                    <button
                      type="button"
                      onClick={() => onSelectAdminLevel?.("DISTRICT")}
                      className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                      title={`Kota ${selectedCity.name}: ${selectedCity.total} ${copy.plural}`}
                    >
                      <div className="flex h-7 items-center justify-center gap-2 rounded-md border border-cyan-500/80 bg-slate-900/95 px-3 font-mono font-bold text-white text-xs shadow-md backdrop-blur-md">
                        <span className="text-cyan-300 font-extrabold uppercase tracking-wide">
                          {selectedCity.name}
                        </span>
                        <span className="rounded-md bg-cyan-600 px-2 py-0.5 font-bold text-white text-xs">
                          {selectedCity.total} {copy.plural}
                        </span>
                      </div>
                    </button>
                  </MapMarker>
                );
              }

              if (adminLevel === "PROVINCE") {
                return cities.map((city) => {
                  const coord = cityCoordinate(city);
                  if (!coord) return null;
                  const isSelected = selectedCity?.id === city.id;
                  return (
                    <MapMarker key={`cluster-prov-city-${city.id}`} longitude={coord[0]} latitude={coord[1]}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCity?.(city.id);
                          onSelectAdminLevel?.("CITY");
                        }}
                        className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                        title={`Kota ${city.name}: ${city.total} ${copy.plural}`}
                      >
                        <div
                          className={cn(
                            "flex h-7 items-center justify-center gap-1.5 rounded-md border px-3 font-mono font-bold text-white text-xs shadow-md backdrop-blur-md",
                            isSelected
                              ? "border-cyan-400 bg-cyan-950/95 text-cyan-200"
                              : "border-slate-700 bg-slate-900/90 hover:border-cyan-500",
                          )}
                        >
                          <span>{city.name}</span>
                          <span className="rounded-md bg-cyan-600 px-1.5 py-0.5 font-bold text-[11px] text-white">
                            {city.total}
                          </span>
                        </div>
                      </button>
                    </MapMarker>
                  );
                });
              }

              if (adminLevel === "VILLAGE") {
                const districtForVillages = selectedDistrictId
                  ? selectedCity?.districts.filter((d) => d.id === selectedDistrictId)
                  : selectedCity?.districts;

                const villagesToRender = (districtForVillages ?? []).flatMap((d) =>
                  d.villages.map((v) => ({ ...v, districtId: d.id, districtName: d.name })),
                );

                return villagesToRender.map((village, idx) => {
                  const parentDistrict = selectedCity?.districts.find((d) => d.id === village.districtId);
                  const fallbackCoord = parentDistrict ? districtCoordinate(parentDistrict) : null;
                  const coord = villageCoordinate(village.name, filteredAgents, fallbackCoord, idx);
                  if (!coord) return null;

                  const isSelected = selectedVillageId === village.id;

                  return (
                    <MapMarker key={`cluster-village-${village.id}`} longitude={coord[0]} latitude={coord[1]}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectVillage?.(village.id);
                        }}
                        className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                        title={`Kelurahan/Desa ${village.name}: ${village.total} ${copy.plural}`}
                      >
                        <div
                          className={cn(
                            "flex h-7 items-center justify-center gap-1.5 rounded-md border px-2.5 font-mono font-semibold text-[10px] text-slate-100 shadow-md backdrop-blur-md transition-all",
                            isSelected
                              ? "border-cyan-400 bg-cyan-950/95 text-cyan-200 ring-2 ring-cyan-500/50"
                              : "border-slate-700/80 bg-slate-900/90 hover:border-cyan-500 hover:text-white",
                          )}
                        >
                          <span>{village.name}</span>
                          <span className="rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-bold text-[9px] text-slate-200">
                            {village.total}
                          </span>
                        </div>
                      </button>
                    </MapMarker>
                  );
                });
              }

              // DISTRICT level
              return selectedCity?.districts.map((district) => {
                const coord = districtCoordinate(district);
                if (!coord) return null;

                return (
                  <MapMarker key={`cluster-${district.id}`} longitude={coord[0]} latitude={coord[1]}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDistrict(district.id);
                        onSelectAdminLevel?.("VILLAGE");
                      }}
                      className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                      title={`Kecamatan ${district.name}: ${district.total} ${copy.plural}`}
                    >
                      <div className="flex h-7 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900/90 px-2.5 font-mono font-semibold text-[11px] text-slate-100 shadow-md backdrop-blur-md transition-all hover:border-cyan-500 hover:text-white">
                        <span>{district.name}</span>
                        <span className="ml-1.5 rounded-md border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-bold text-[10px] text-cyan-300">
                          {district.total}
                        </span>
                      </div>
                    </button>
                  </MapMarker>
                );
              });
            })()}

          {/* Individual Jaring markers according to the selected coordinate source. */}
          {displayMode === "marker" &&
            agentsWithCoordinates.map((agent) => {
              const isSelected = selectedJaring?.id === agent.id;
              const statusMeta = statusPresentationForMode(mode, agent.status);
              const [lng, lat] = agentCoordinate(agent, coordinateSourceMode) ?? [agent.longitude, agent.latitude];

              return (
                <MapMarker key={`agent-${agent.id}`} longitude={lng} latitude={lat}>
                  <button
                    type="button"
                    onClick={() => onSelectAgent(agent)}
                    className={cn(
                      "group relative flex items-center justify-center transition-all duration-150 cursor-pointer p-1",
                      isSelected ? "z-50 scale-125" : "z-10 hover:scale-125",
                    )}
                    title={
                      mode === "gaswil"
                        ? (agent.fullName ?? agent.fieldOfficerName ?? "Gaswil tanpa nama")
                        : `${agent.aliasName || agent.fullName || agent.id} - ${agent.fullName || "Tanpa Nama"}`
                    }
                  >
                    <div
                      className={cn(
                        "size-2.5 rounded-full border border-slate-950 shadow-[0_0_6px_rgba(0,0,0,0.8)] transition-all",
                        isSelected && "size-3.5 ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950",
                      )}
                      style={{ backgroundColor: statusMeta.bg }}
                    />
                  </button>
                </MapMarker>
              );
            })}

          {/* Interactive Popup for Selected Agent */}
          {selectedJaring && selectedCoordinate && (
            <MapPopup
              longitude={selectedCoordinate[0]}
              latitude={selectedCoordinate[1]}
              onClose={onClosePopup}
              offset={DISTRIBUTION_POPUP_OFFSET}
              padding={DISTRIBUTION_POPUP_PADDING}
              className="z-50"
            >
              <div className="w-[min(21rem,calc(100vw-2rem))] space-y-2.5 rounded-md border border-slate-800 bg-slate-900/95 p-3.5 text-slate-100 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-end border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-1.5 self-start flex-wrap">
                    <Badge
                      className={cn(
                        "text-[10px] px-1.5 py-0 border-none font-semibold text-slate-950",
                        statusPresentationForMode(mode, selectedJaring.status).dotClass,
                      )}
                    >
                      {copy.statusLabels[selectedJaring.status] ||
                        statusPresentationForMode(mode, selectedJaring.status).label}
                    </Badge>
                    {mode === "jaring" ? (
                      <Badge
                        className={cn(
                          "text-[10px] px-1.5 py-0 border-none font-semibold text-white",
                          selectedJaring.isActive ? "bg-emerald-600" : "bg-red-600",
                        )}
                      >
                        {selectedJaring.isActive ? DOMAIN_TERMS.jaringActive90Days : DOMAIN_TERMS.jaringInactive90Days}
                      </Badge>
                    ) : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClosePopup();
                      }}
                      className="text-slate-400 hover:text-white cursor-pointer p-0.5 rounded hover:bg-slate-800 transition-colors"
                      title="Tutup Popup"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] space-y-1 text-slate-300 pt-0.5">
                  {mode === "jaring" ? (
                    <JaringIdentitySummary
                      compact
                      source={{
                        id: selectedJaring.id,
                        fullName: selectedJaring.fullName,
                        aliasName: selectedJaring.aliasName,
                        whatsappNumber: selectedJaring.whatsappNumber,
                        profilePhotoFileId: selectedJaring.profilePhotoFileId,
                        fieldOfficerName: selectedJaring.fieldOfficerName,
                        villageName: selectedJaring.villageName,
                        districtName: selectedJaring.districtName,
                        cityName: selectedJaring.cityName,
                        provinceName: selectedJaring.provinceName,
                      }}
                    />
                  ) : (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-100">
                        {selectedJaring.fullName ?? selectedJaring.fieldOfficerName ?? "Gaswil tanpa nama"}
                      </p>
                      <p className="text-slate-400">
                        {selectedJaring.districtName}, {selectedJaring.cityName ?? selectedJaring.provinceName ?? "-"}
                      </p>
                      <p className="font-mono text-[10px] text-slate-500">
                        {(selectedJaring.assignmentAreaNames ?? []).slice(0, 2).join(" / ") || "Cakupan wilayah"}
                      </p>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">
                      {mode === "gaswil" ? "Status Sinyal" : DOMAIN_TERMS.jaringActivity90Days}
                    </span>
                    <span
                      className={cn(
                        "font-bold text-[11px]",
                        selectedJaring.isActive
                          ? "text-emerald-400"
                          : mode === "gaswil"
                            ? "text-slate-400"
                            : "text-red-400",
                      )}
                    >
                      {signalLabelForMode(mode, selectedJaring.isActive)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">
                      {mode === "gaswil" ? "Lokasi Terakhir" : "Laporan Terakhir"}
                    </span>
                    <span className="text-slate-200">{selectedJaring.lastReportDate}</span>
                  </div>
                  {mode === "gaswil" && selectedJaring.jaringCount != null ? (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-mono">Jaring Binaan</span>
                      <span className="text-slate-200">{selectedJaring.jaringCount.toLocaleString("id-ID")}</span>
                    </div>
                  ) : null}
                  {mode === "jaring" ? (
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">
                        {coordinateSourceMode === "laporan"
                          ? copy.sourceReportLabel
                          : selectedJaring.domicileCoordinateSource === "REGISTERED"
                            ? copy.sourceDomicileLabel
                            : "Perkiraan wilayah"}
                      </span>
                      <span className="text-cyan-300 text-[10px]">
                        {selectedCoordinate[1].toFixed(4)}, {selectedCoordinate[0].toFixed(4)}
                      </span>
                    </div>
                  ) : null}
                </div>

                <a
                  href={
                    selectedJaring.detailHref ??
                    (mode === "gaswil"
                      ? "/dashboard/personel-lapangan"
                      : `/dashboard/daftar-jaring/${selectedJaring.id}`)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-2.5 text-center text-cyan-400 hover:text-cyan-300 text-xs font-medium pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>{copy.detailLinkLabel}</span>
                  <ChevronRight className="size-3.5" />
                </a>
              </div>
            </MapPopup>
          )}
        </BaseMap>

        {/* Map Floating Legend Box */}
        <div className="absolute bottom-[9.75rem] left-4 z-10 hidden w-52 space-y-2 rounded-md border border-slate-200 bg-white/95 p-3 text-xs shadow-2xl backdrop-blur-md transition-colors sm:block dark:border-slate-800/90 dark:bg-slate-900/95">
          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
            LEGENDA
          </div>
          <div className="space-y-1.5">
            {Object.keys(STATUS_COLORS).map((key) => {
              const status = key as keyof typeof STATUS_COLORS;
              const val = statusPresentationForMode(mode, status);
              return (
                <div key={key} className="flex items-center gap-2 text-[11px]">
                  <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: val.bg }} />
                  <span className="text-slate-700 dark:text-slate-300">{copy.statusLabels[status]}</span>
                </div>
              );
            })}
          </div>

          {displayMode === "marker" ? (
            <label className="flex items-center justify-between border-slate-200 border-t pt-2 dark:border-slate-800/80">
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">TAMPILKAN KELOMPOK</span>
              <input
                type="checkbox"
                checked={isClusterMode}
                onChange={(e) => onToggleClusterMode(e.target.checked)}
                className="size-3.5 cursor-pointer accent-cyan-500"
              />
            </label>
          ) : null}
        </div>
      </section>
    </main>
  );
}
