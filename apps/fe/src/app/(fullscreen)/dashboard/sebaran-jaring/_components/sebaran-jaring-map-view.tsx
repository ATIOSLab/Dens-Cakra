"use client";

import { useEffect, useMemo, useRef } from "react";
import { ChevronRight, MapPin, X } from "lucide-react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

import { Badge } from "@/components/ui/badge";
import { Map as BaseMap, MapControls, MapGeoJSON, MapMarker, MapPopup } from "@/components/ui/map";
import { cn } from "@/lib/utils";

import {
  type AdminLevel,
  type CoordinateSourceMode,
  DEFAULT_CENTER,
  type DisplayMode,
  type DistrictFeatureProperties,
  districtCoordinate,
  cityCoordinate,
  villageCoordinate,
  type JaringDistributionCity,
  type JaringDistributionEntry,
  STATUS_COLORS,
  CALLOUT_COLORS,
  STREET_TILES,
  SATELLITE_TILES,
  type MapStyleMode,
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

type Props = {
  adminLevel?: AdminLevel;
  cities?: JaringDistributionCity[];
  selectedCity: JaringDistributionCity | null;
  selectedDistrictId?: string | null;
  selectedVillageId?: string | null;
  filteredAgents: JaringDistributionEntry[];
  totalAgentsCount: number;
  selectedJaring: JaringDistributionEntry | null;
  onSelectAgent: (agent: JaringDistributionEntry) => void;
  onSelectDistrict: (districtId: string) => void;
  onSelectVillage?: (villageId: string) => void;
  onSelectCity?: (cityId: string) => void;
  onSelectAdminLevel?: (level: AdminLevel) => void;
  onClosePopup: () => void;
  onOpenRightPanel: () => void;
  displayMode?: DisplayMode;
  isClusterMode: boolean;
  onToggleClusterMode: (val: boolean) => void;
  coordinateSourceMode: CoordinateSourceMode;
  mapStyleMode: MapStyleMode;
  mask: GeoJSON.Feature<GeoJSON.Polygon> | null;
  onMapReady: (map: MapLibreMap) => void;
};

export function SebaranJaringMapView({
  adminLevel = "CITY",
  cities = [],
  selectedCity,
  selectedDistrictId,
  selectedVillageId,
  filteredAgents,
  totalAgentsCount,
  selectedJaring,
  onSelectAgent,
  onSelectDistrict,
  onSelectVillage,
  onSelectCity,
  onSelectAdminLevel,
  onClosePopup,
  onOpenRightPanel,
  displayMode = "marker",
  isClusterMode,
  onToggleClusterMode,
  coordinateSourceMode,
  mapStyleMode,
  mask,
  onMapReady,
}: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const activeStyle = MAP_TILE_STYLES[mapStyleMode] || MAP_TILE_STYLES.dark;

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
      features: filteredAgents
        .filter((a) => a.hasReport && a.latestReportLat !== null && a.latestReportLng !== null)
        .map((a) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [
              coordinateSourceMode === "laporan" && a.latestReportLng ? a.latestReportLng : (a.latestReportLng ?? a.longitude),
              coordinateSourceMode === "laporan" && a.latestReportLat ? a.latestReportLat : (a.latestReportLat ?? a.latitude),
            ],
          },
          properties: {
            id: a.id,
            weight: a.reportCount > 0 ? a.reportCount : 1,
          },
        })),
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
              0, "rgba(0,0,0,0)",
              0.2, "rgb(6, 182, 212)",
              0.4, "rgb(59, 130, 246)",
              0.6, "rgb(234, 179, 8)",
              0.8, "rgb(249, 115, 22)",
              1, "rgb(239, 68, 68)"
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 4, 15, 25],
            "heatmap-opacity": 0.85,
          },
        });
      }
    } catch {
      // ignore style loading race
    }
  }, [displayMode, filteredAgents, coordinateSourceMode]);

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
          {(displayMode === "cluster" || isClusterMode) && (() => {
            if (adminLevel === "CITY") {
              if (!selectedCity) return null;
              const coord = cityCoordinate(selectedCity);
              if (!coord) return null;
              return (
                <MapMarker key={`cluster-city-${selectedCity.id}`} longitude={coord[0]} latitude={coord[1]}>
                  <button
                    onClick={() => onSelectAdminLevel?.("DISTRICT")}
                    className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                    title={`Kota ${selectedCity.name}: ${selectedCity.total} Jaring`}
                  >
                    <div className="h-7 px-3 rounded-full border border-cyan-500/80 font-mono font-bold text-xs text-white flex items-center justify-center shadow-md bg-slate-900/95 backdrop-blur-md gap-2">
                      <span className="text-cyan-300 font-extrabold uppercase tracking-wide">{selectedCity.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-600 text-white font-bold text-xs">
                        {selectedCity.total} Jaring
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
                      onClick={() => {
                        onSelectCity?.(city.id);
                        onSelectAdminLevel?.("CITY");
                      }}
                      className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                      title={`Kota ${city.name}: ${city.total} Jaring`}
                    >
                      <div className={cn(
                        "h-7 px-3 rounded-full border font-mono font-bold text-xs text-white flex items-center justify-center shadow-md backdrop-blur-md gap-1.5",
                        isSelected ? "border-cyan-400 bg-cyan-950/95 text-cyan-200" : "border-slate-700 bg-slate-900/90 hover:border-cyan-500"
                      )}>
                        <span>{city.name}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-cyan-600 text-white font-bold text-[11px]">{city.total}</span>
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
                d.villages.map((v) => ({ ...v, districtId: d.id, districtName: d.name }))
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
                      onClick={() => {
                        onSelectVillage?.(village.id);
                      }}
                      className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                      title={`Kelurahan ${village.name}: ${village.total} Jaring`}
                    >
                      <div
                        className={cn(
                          "h-6 px-2.5 rounded-full border font-mono font-semibold text-[10px] text-slate-100 flex items-center justify-center shadow-md backdrop-blur-md gap-1.5 transition-all",
                          isSelected
                            ? "border-cyan-400 bg-cyan-950/95 text-cyan-200 ring-2 ring-cyan-500/50"
                            : "border-slate-700/80 bg-slate-900/90 hover:border-cyan-500 hover:text-white"
                        )}
                      >
                        <span>{village.name}</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-200 text-[9px] font-bold border border-slate-700">{village.total}</span>
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
                    onClick={() => {
                      onSelectDistrict(district.id);
                      onSelectAdminLevel?.("VILLAGE");
                    }}
                    className="group relative flex items-center justify-center cursor-pointer transition-transform duration-150 hover:scale-105"
                    title={`Kecamatan ${district.name}: ${district.total} Jaring`}
                  >
                    <div className="h-6 px-2.5 rounded-full border border-slate-700/80 bg-slate-900/90 text-slate-100 font-mono font-semibold text-[11px] flex items-center justify-center shadow-md backdrop-blur-md hover:border-cyan-500 hover:text-white transition-all">
                      <span>{district.name}</span>
                      <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 text-[10px] font-bold">{district.total}</span>
                    </div>
                  </button>
                </MapMarker>
              );
            });
          })()}

          {/* Individual Agent Small Dot Markers (ONLY for Agents with actual reports) */}
          {filteredAgents
            .filter((agent) => agent.hasReport && agent.latestReportLat !== null && agent.latestReportLng !== null)
            .map((agent) => {
              const isSelected = selectedJaring?.id === agent.id;
              const statusMeta = STATUS_COLORS[agent.status] || STATUS_COLORS.PENDING;

              const lng = (coordinateSourceMode === "laporan" && agent.latestReportLng) ? agent.latestReportLng : (agent.latestReportLng ?? agent.longitude);
              const lat = (coordinateSourceMode === "laporan" && agent.latestReportLat) ? agent.latestReportLat : (agent.latestReportLat ?? agent.latitude);

              return (
                <MapMarker key={`agent-${agent.id}`} longitude={lng} latitude={lat}>
                  <button
                    onClick={() => onSelectAgent(agent)}
                    className={cn(
                      "group relative flex items-center justify-center transition-all duration-150 cursor-pointer p-1",
                      isSelected ? "z-50 scale-125" : "z-10 hover:scale-125"
                    )}
                    title={`${agent.aliasName || agent.code} - ${agent.fullName || "Tanpa Nama"}`}
                  >
                    <div
                      className={cn(
                        "size-2.5 rounded-full border border-slate-950 shadow-[0_0_6px_rgba(0,0,0,0.8)] transition-all",
                        isSelected && "size-3.5 ring-2 ring-cyan-400 ring-offset-1 ring-offset-slate-950"
                      )}
                      style={{ backgroundColor: statusMeta.bg }}
                    />
                  </button>
                </MapMarker>
              );
            })}

          {/* Interactive Popup for Selected Agent */}
          {selectedJaring && (
            <MapPopup
              longitude={(coordinateSourceMode === "laporan" && selectedJaring.latestReportLng) ? selectedJaring.latestReportLng : (selectedJaring.latestReportLng ?? selectedJaring.longitude)}
              latitude={(coordinateSourceMode === "laporan" && selectedJaring.latestReportLat) ? selectedJaring.latestReportLat : (selectedJaring.latestReportLat ?? selectedJaring.latitude)}
              onClose={onClosePopup}
              className="z-50"
            >
              <div className="p-3.5 bg-slate-900/95 border border-slate-800 rounded-xl text-slate-100 min-w-[260px] space-y-2 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-mono font-bold text-sm text-cyan-400">{selectedJaring.aliasName || selectedJaring.code}</span>
                  <div className="flex items-center gap-1.5">
                    <Badge className={cn("text-[10px] px-1.5 py-0 border-none font-semibold text-slate-950", STATUS_COLORS[selectedJaring.status]?.dotClass || "bg-emerald-500")}>
                      {STATUS_COLORS[selectedJaring.status]?.label || "Terverifikasi"}
                    </Badge>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClosePopup();
                      }}
                      className="text-slate-400 hover:text-white cursor-pointer ml-1 p-1 rounded hover:bg-slate-800 transition-colors"
                      title="Tutup Popup"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <span>👤</span>
                  <span>{selectedJaring.fullName || "Tanpa Nama"}</span>
                </div>

                <div className="text-[11px] space-y-1 text-slate-300 pt-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Domisili</span>
                    <span className="font-medium text-slate-200">{selectedJaring.villageName}, {selectedJaring.districtName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-mono">Laporan Terakhir</span>
                    <span className="text-slate-200">{selectedJaring.lastReportDate}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-400">Koordinat</span>
                    <span className="text-cyan-300 text-[10px]">{selectedJaring.latitude.toFixed(4)}, {selectedJaring.longitude.toFixed(4)}</span>
                  </div>
                </div>

                <button
                  onClick={onOpenRightPanel}
                  className="w-full mt-2.5 text-center text-cyan-400 hover:text-cyan-300 text-xs font-medium pt-1.5 border-t border-slate-800/80 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Lihat Detail</span>
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </MapPopup>
          )}
        </BaseMap>

        {/* Region Counter Banner at Top Center */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 border border-slate-800/90 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono shadow-xl text-slate-200">
          <span className="text-slate-400">Aktifitas Laporan:</span>
          <span className="font-bold text-cyan-400">
            {filteredAgents.filter((a) => a.hasReport).length}
          </span>
          <span className="text-slate-400">dari {filteredAgents.length} jaring terdaftar</span>
        </div>

        {/* Map Floating Legend Box */}
        <div className="absolute bottom-20 left-4 z-10 hidden sm:block p-3 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800/90 backdrop-blur-md rounded-xl space-y-2 shadow-2xl text-xs w-48 transition-colors">
          <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">LEGENDA</div>
          <div className="space-y-1.5">
            {Object.entries(STATUS_COLORS).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2 text-[11px]">
                <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: val.bg }} />
                <span className="text-slate-700 dark:text-slate-300">{val.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">CLUSTER MODE</span>
            <input
              type="checkbox"
              checked={isClusterMode}
              onChange={(e) => onToggleClusterMode(e.target.checked)}
              className="accent-cyan-500 size-3.5 cursor-pointer"
            />
          </div>
        </div>
      </section>
    </main>
  );
}
