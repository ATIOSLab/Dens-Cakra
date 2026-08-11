"use client";

import type { RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Crosshair, LoaderCircle, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { LngLatBounds, type Map as MapLibreMap } from "maplibre-gl";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { MapControls, MapMarker, Map as MapView } from "@/components/ui/map";
import { cn } from "@/lib/utils";

import { MapsIntelijenCommandHud } from "./maps-intelijen-command-hud";
import { MapsIntelijenDataLayers, markerColor } from "./maps-intelijen-data-layers";
import { MapsIntelijenHoverPopup } from "./maps-intelijen-hover-popup";
import { MapsIntelijenLegend } from "./maps-intelijen-legend";
import styles from "./maps-intelijen-map-view.module.css";
import { COORDINATE_AVAILABILITY_PRESENTATION, getFeatureTypePresentation } from "./maps-intelijen-presentation";
import type {
  BaseMapLayer,
  CommandLayerKey,
  HeatmapWeight,
  MapAreaFilterOptions,
  MapEntityFilterOption,
  MapNetworkFeature,
  MapNetworkFilters,
  MapNetworkResponse,
  MarkerColorMode,
  VisualizationMode,
} from "./maps-intelijen-types";
import { getMapFeatureTitle } from "./maps-intelijen-types";

interface MapsIntelijenMapViewProps {
  mapCardRef: RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  features: MapNetworkFeature[];
  meta: MapNetworkResponse["meta"];
  loading: boolean;
  periodLabel: string;
  activeFilterCount: number;
  visibleCount: number;
  onRefresh: () => void;
  mode: VisualizationMode;
  onVisualizationChange: (value: VisualizationMode) => void;
  colorMode: MarkerColorMode;
  heatmapWeight: HeatmapWeight;
  onHeatmapWeightChange: (value: HeatmapWeight) => void;
  mapLayer: BaseMapLayer;
  onMapLayerChange: (value: BaseMapLayer) => void;
  onOpenDetail: (feature: MapNetworkFeature) => void;
  onVisibleCountChange: (count: number) => void;
  filters: MapNetworkFilters;
  fieldOfficerOptions: MapEntityFilterOption[];
  jaringOptions: MapEntityFilterOption[];
  areaOptions: MapAreaFilterOptions;
  onFilterChange: (patch: Partial<MapNetworkFilters>) => void;
  onResetFilters: () => void;
}

// Existing providers/styles are intentionally preserved.
const MAP_THEMES: Record<BaseMapLayer, string | Record<string, unknown>> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  terrain: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  satellite: {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Esri",
      },
    },
    layers: [{ id: "esri-satellite", type: "raster", source: "esri" }],
  },
  osm: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "OpenStreetMap",
      },
    },
    layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
  },
};

const INITIAL_CENTER: [number, number] = [106.8456, -6.2088];

function markerPulse(feature: MapNetworkFeature): "urgent" | "high" | "normal" | "slow" {
  if (feature.properties.urgency === "URGENT") return "urgent";
  if (feature.properties.urgency === "HIGH") return "high";
  if (feature.properties.urgency === "LOW") return "slow";
  return "normal";
}

export function MapsIntelijenMapView({
  mapCardRef,
  isFullscreen,
  onToggleFullscreen,
  features,
  meta,
  loading,
  periodLabel,
  activeFilterCount,
  visibleCount,
  onRefresh,
  mode,
  onVisualizationChange,
  colorMode,
  heatmapWeight,
  onHeatmapWeightChange,
  mapLayer,
  onMapLayerChange,
  onOpenDetail,
  onVisibleCountChange,
  filters,
  fieldOfficerOptions,
  jaringOptions,
  areaOptions,
  onFilterChange,
  onResetFilters,
}: MapsIntelijenMapViewProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [hovered, setHovered] = useState<MapNetworkFeature | null>(null);
  const [locked, setLocked] = useState<MapNetworkFeature | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [layerVisibility, setLayerVisibility] = useState<Record<CommandLayerKey, boolean>>({
    report: true,
    baket: true,
    agent_active: true,
    agent_last_known: true,
  });
  const closeTimer = useRef<number | null>(null);
  const activeStyle = MAP_THEMES[mapLayer];
  const displayedFeatures = useMemo(
    () =>
      features.filter((feature) => {
        if (feature.properties.markerType === "report") return layerVisibility.report;
        if (feature.properties.markerType === "baket") return layerVisibility.baket;
        return feature.properties.agentState === "active"
          ? layerVisibility.agent_active
          : layerVisibility.agent_last_known;
      }),
    [features, layerVisibility],
  );

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const handleHover = useCallback(
    (feature: MapNetworkFeature | null) => {
      clearCloseTimer();
      if (feature) {
        setHovered(feature);
        return;
      }
      closeTimer.current = window.setTimeout(() => setHovered(null), 220);
    },
    [clearCloseTimer],
  );

  const handleFeatureClick = useCallback(
    (feature: MapNetworkFeature) => {
      const touchLike = window.matchMedia("(hover: none), (pointer: coarse)").matches;
      if (touchLike && locked?.id === feature.id) {
        onOpenDetail(feature);
        return;
      }

      setLocked((current) => (current?.id === feature.id ? null : feature));
    },
    [locked?.id, onOpenDetail],
  );

  const handleMapClick = useCallback(() => {
    setHovered(null);
    setLocked(null);
  }, []);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHovered(null);
        setLocked(null);
        if (isFullscreen && !document.fullscreenElement) onToggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreen, onToggleFullscreen]);

  useEffect(() => {
    if (!map || mode !== "marker") return;
    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [handleMapClick, map, mode]);

  useEffect(() => {
    if (!map) return;
    const resize = () => {
      try {
        map.resize();
      } catch {
        // The map may be replaced while a base style is switching.
      }
    };
    const frame = window.requestAnimationFrame(resize);
    const timeout = window.setTimeout(resize, isFullscreen ? 180 : 120);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [isFullscreen, map]);

  useEffect(() => {
    if (!map) return;
    const updateVisibleCount = () => {
      const bounds = map.getBounds();
      onVisibleCountChange(displayedFeatures.filter((feature) => bounds.contains(feature.geometry.coordinates)).length);
    };
    updateVisibleCount();
    map.on("moveend", updateVisibleCount);
    return () => {
      map.off("moveend", updateVisibleCount);
    };
  }, [displayedFeatures, map, onVisibleCountChange]);

  const selectedPopup = locked ?? hovered;
  const mapStyles = useMemo(() => ({ light: activeStyle as never, dark: activeStyle as never }), [activeStyle]);
  const fitVisibleFeatures = useCallback(() => {
    if (!map || displayedFeatures.length === 0) {
      map?.easeTo({ center: INITIAL_CENTER, zoom: 9.5, pitch: 0, bearing: 0, duration: 450 });
      return;
    }
    const bounds = displayedFeatures.reduce(
      (current, feature) => current.extend(feature.geometry.coordinates),
      new LngLatBounds(displayedFeatures[0].geometry.coordinates, displayedFeatures[0].geometry.coordinates),
    );
    map.fitBounds(bounds, { padding: 72, maxZoom: 14, duration: 450 });
  }, [displayedFeatures, map]);
  const navigationKey = [
    filters.period,
    filters.startDate,
    filters.endDate,
    filters.dataType,
    filters.urgency,
    filters.categoryId,
    filters.fieldOfficerAssignmentId,
    filters.jaringId,
    filters.provinceId,
    filters.regencyId,
    filters.districtId,
    filters.villageId,
    filters.suitability,
    filters.agentState,
  ].join(":");

  useEffect(() => {
    if (!map || loading) return;
    const timeout = window.setTimeout(fitVisibleFeatures, 140);
    return () => window.clearTimeout(timeout);
  }, [fitVisibleFeatures, loading, map, navigationKey]);

  const resetMap = useCallback(
    () => map?.easeTo({ center: INITIAL_CENTER, zoom: 9.5, pitch: 0, bearing: 0, duration: 450 }),
    [map],
  );
  const noCoordinatesPresentation = COORDINATE_AVAILABILITY_PRESENTATION.WITHOUT;
  const NoCoordinatesIcon = noCoordinatesPresentation.icon;

  const mapContent = (
    <section
      id="intel-map-section"
      ref={mapCardRef}
      aria-label="Peta command center jejaring intelijen"
      className={cn(
        styles.root,
        "relative overflow-hidden bg-slate-950 shadow-lg",
        isFullscreen
          ? "fixed inset-0 z-[1000] rounded-none border-0"
          : "rounded-2xl border border-[var(--dc-border-subtle)]",
      )}
    >
      <div className={isFullscreen ? "h-dvh" : "h-[min(68svh,52rem)] min-h-[26rem] sm:min-h-[34rem]"}>
        <MapView center={INITIAL_CENTER} zoom={9.5} styles={mapStyles} onMapReady={setMap} className="h-full w-full">
          {!isFullscreen ? <MapControls position="bottom-left" showZoom showCompass /> : null}
          {mode === "marker"
            ? displayedFeatures.map((feature) => {
                const presentation = getFeatureTypePresentation(feature.properties);
                const MarkerIcon = presentation.icon;
                const isActive = selectedPopup?.id === feature.id;

                return (
                  <MapMarker
                    key={feature.id}
                    longitude={feature.geometry.coordinates[0]}
                    latitude={feature.geometry.coordinates[1]}
                    pulse={markerPulse(feature)}
                  >
                    <button
                      type="button"
                      aria-label={`${presentation.label}: ${getMapFeatureTitle(feature)}`}
                      aria-pressed={locked?.id === feature.id}
                      onPointerEnter={() => handleHover(feature)}
                      onPointerLeave={() => handleHover(null)}
                      onFocus={() => handleHover(feature)}
                      onBlur={() => handleHover(null)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFeatureClick(feature);
                      }}
                      className={cn(
                        "grid size-6 cursor-pointer place-items-center border border-white/90 shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-1",
                        presentation.markerClass,
                        feature.properties.markerType === "baket"
                          ? "rounded-lg"
                          : feature.properties.markerType === "agent"
                            ? "rounded-md rotate-45"
                            : "rounded-full",
                        isActive ? "z-50 scale-110" : "hover:scale-105",
                      )}
                      style={{ backgroundColor: markerColor(feature, colorMode) }}
                    >
                      <MarkerIcon
                        className={cn("size-3", feature.properties.markerType === "agent" && "-rotate-45")}
                        aria-hidden
                      />
                    </button>
                  </MapMarker>
                );
              })
            : null}
          {mode !== "marker" ? (
            <MapsIntelijenDataLayers
              map={map}
              features={displayedFeatures}
              mode={mode}
              colorMode={colorMode}
              heatmapWeight={heatmapWeight}
              onHover={handleHover}
              onClick={handleFeatureClick}
              onMapClick={handleMapClick}
            />
          ) : null}
          {selectedPopup && mode !== "heatmap" ? (
            <MapsIntelijenHoverPopup
              feature={selectedPopup}
              isFullscreen={isFullscreen}
              onPointerEnter={clearCloseTimer}
              onPointerLeave={() => handleHover(null)}
              onClose={handleMapClick}
              onDetail={() => {
                onOpenDetail(selectedPopup);
                setHovered(null);
                setLocked(null);
              }}
            />
          ) : null}
        </MapView>
      </div>

      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-10",
          isFullscreen && "ring-1 ring-cyan-400/15 ring-inset",
        )}
        aria-hidden
      />

      <div
        className={cn(
          "absolute left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2 rounded-xl border p-2 shadow-lg backdrop-blur",
          isFullscreen
            ? "top-20 border-slate-700/80 bg-slate-950/90 text-slate-100 xl:hidden"
            : "top-3 bg-background/95",
        )}
      >
        <label className="grid gap-0.5 text-[10px] text-muted-foreground">
          Peta Dasar
          <select
            value={mapLayer}
            onChange={(event) => onMapLayerChange(event.target.value as BaseMapLayer)}
            className={cn(
              "min-h-10 rounded-md border px-2 text-xs",
              isFullscreen ? "border-slate-700 bg-slate-900 text-slate-100" : "bg-background text-foreground",
            )}
          >
            <option value="dark">Gelap</option>
            <option value="light">Terang</option>
            <option value="terrain">Medan</option>
            <option value="satellite">Satelit</option>
            <option value="osm">OpenStreetMap</option>
          </select>
        </label>
        {mode === "heatmap" ? (
          <label className="grid gap-0.5 text-[10px] text-muted-foreground">
            Bobot Heatmap
            <select
              value={heatmapWeight}
              onChange={(event) => onHeatmapWeightChange(event.target.value as HeatmapWeight)}
              className={cn(
                "min-h-10 rounded-md border px-2 text-xs",
                isFullscreen ? "border-slate-700 bg-slate-900 text-slate-100" : "bg-background text-foreground",
              )}
            >
              <option value="count">Jumlah Data</option>
              <option value="urgency">Urgensi</option>
              <option value="valid">Titik Berkoordinat</option>
              <option value="baket">Bahan Keterangan (Baket)</option>
            </select>
          </label>
        ) : null}
        <Button
          size="icon"
          variant="outline"
          className={cn("min-h-11 min-w-11", isFullscreen && "border-slate-700 bg-slate-900 text-slate-100")}
          onClick={fitVisibleFeatures}
          aria-label="Sesuaikan peta ke seluruh titik hasil filter"
        >
          <Crosshair className="size-4 text-blue-600 dark:text-blue-400" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className={cn("min-h-11 min-w-11", isFullscreen && "border-slate-700 bg-slate-900 text-slate-100")}
          onClick={resetMap}
          aria-label="Reset tampilan peta"
        >
          <RotateCcw className="size-4 text-slate-600 dark:text-slate-400" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className={cn("min-h-11 min-w-11", isFullscreen && "border-slate-700 bg-slate-900 text-slate-100")}
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? "Keluar layar penuh" : "Tampilkan layar penuh"}
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </Button>
      </div>

      <MapsIntelijenCommandHud
        features={features}
        displayedFeatures={displayedFeatures}
        meta={meta}
        visibleCount={visibleCount}
        periodLabel={periodLabel}
        activeFilterCount={activeFilterCount}
        isFullscreen={isFullscreen}
        loading={loading}
        filters={filters}
        fieldOfficerOptions={fieldOfficerOptions}
        jaringOptions={jaringOptions}
        areaOptions={areaOptions}
        layerVisibility={layerVisibility}
        visualization={mode}
        mapLayer={mapLayer}
        onRefresh={onRefresh}
        onToggleFullscreen={onToggleFullscreen}
        onFilterChange={onFilterChange}
        onResetFilters={onResetFilters}
        onLayerToggle={(layer) => setLayerVisibility((current) => ({ ...current, [layer]: !current[layer] }))}
        onShowAllLayers={() =>
          setLayerVisibility({ report: true, baket: true, agent_active: true, agent_last_known: true })
        }
        onVisualizationChange={onVisualizationChange}
        onMapLayerChange={onMapLayerChange}
        onFitFeatures={fitVisibleFeatures}
        onResetMap={resetMap}
        onOpenDetail={onOpenDetail}
      />

      {loading ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/20">
          <span className="inline-flex items-center gap-2 rounded-full border bg-background/95 px-4 py-2 text-sm shadow">
          <LoaderCircle className="size-4 animate-spin text-sky-600 dark:text-sky-400" /> Memuat lapisan peta…
          </span>
        </div>
      ) : null}
      {!loading && displayedFeatures.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center p-6">
          <div
            className={`max-w-md rounded-xl border bg-background/95 p-5 text-center shadow ${noCoordinatesPresentation.surfaceClass}`}
          >
            <NoCoordinatesIcon className={`mx-auto size-8 ${noCoordinatesPresentation.iconClass}`} aria-hidden />
            <p className="mt-2 font-semibold">Tidak ada titik yang dapat dipetakan</p>
            <p className="mt-1 text-muted-foreground text-xs">
              Ubah periode, wilayah, atau jenis data untuk menampilkan titik berkoordinat.
            </p>
          </div>
        </div>
      ) : null}
      {!isFullscreen ? (
        <MapsIntelijenLegend
          mode={mode}
          colorMode={colorMode}
          heatmapWeight={heatmapWeight}
          open={legendOpen}
          onToggle={() => setLegendOpen((value) => !value)}
        />
      ) : null}
    </section>
  );

  return isFullscreen ? createPortal(mapContent, document.body) : mapContent;
}
