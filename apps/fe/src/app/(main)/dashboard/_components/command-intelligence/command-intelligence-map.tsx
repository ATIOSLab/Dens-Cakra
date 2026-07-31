"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { GeoJSONSource, MapLayerMouseEvent, Map as MapLibreMap } from "maplibre-gl";
import { LngLatBounds } from "maplibre-gl";

import { Map as BaseMap, MapControls, type MapViewport } from "@/components/ui/map";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import type { FieldIntelligenceDashboard } from "./types";

const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const INDONESIA_CENTER: [number, number] = [117.5, -2.5];

const JARING_SOURCE = "command-intelligence-jaring";
const JARING_CLUSTER_LAYER = "command-intelligence-jaring-cluster";
const JARING_CLUSTER_COUNT_LAYER = "command-intelligence-jaring-cluster-count";
const JARING_POINT_LAYER = "command-intelligence-jaring-point";
const BAKET_SOURCE = "command-intelligence-baket";
const BAKET_POINT_LAYER = "command-intelligence-baket-point";
const SATELLITE_SOURCE = "command-intelligence-satellite";
const SATELLITE_LAYER = "command-intelligence-satellite-layer";

export type CommandMapLayers = {
  jaring: boolean;
  baket: boolean;
};

export type CommandMapMode = "street" | "satellite";

type CommandIntelligenceMapProps = {
  data: FieldIntelligenceDashboard;
  layers: CommandMapLayers;
  mode: CommandMapMode;
  onJaringSelect: (jaringId: string) => void;
  onBaketSelect: (baketId: string) => void;
  onViewportChange: (viewport: MapViewport) => void;
  onPointerMove: (coordinate: { latitude: number; longitude: number }) => void;
};

function cssColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function toJaringGeoJson(data: FieldIntelligenceDashboard): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: data.map.jaring.map((item) => ({
      type: "Feature",
      id: item.id,
      properties: {
        id: item.id,
        code: item.code,
        label: item.aliasName ?? item.fullName ?? item.code,
        registrationStatus: item.registrationStatus,
        activityLevel: item.activityLevel,
        periodReports: item.periodReports,
      },
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude],
      },
    })),
  };
}

function toBaketGeoJson(data: FieldIntelligenceDashboard): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: data.map.baket.map((item) => ({
      type: "Feature",
      id: item.id,
      properties: {
        id: item.id,
        title: item.title ?? "Laporan",
        status: item.status,
        urgency: item.urgency,
      },
      geometry: {
        type: "Point",
        coordinates: [item.longitude, item.latitude],
      },
    })),
  };
}

function fitData(map: MapLibreMap, data: FieldIntelligenceDashboard) {
  const coordinates = [
    ...data.map.jaring.map((item) => [item.longitude, item.latitude] as [number, number]),
    ...data.map.baket.map((item) => [item.longitude, item.latitude] as [number, number]),
  ];
  if (coordinates.length === 0) return;

  const bounds = new LngLatBounds();
  for (const coordinate of coordinates) bounds.extend(coordinate);
  const width = map.getContainer().clientWidth;
  const compact = width < 768;

  if (coordinates.length === 1) {
    map.easeTo({ center: coordinates[0], zoom: 11, duration: 500 });
    return;
  }

  map.fitBounds(bounds, {
    padding: compact
      ? { top: 110, right: 32, bottom: 120, left: 72 }
      : { top: 150, right: width >= 1280 ? 390 : 40, bottom: 90, left: 110 },
    maxZoom: 12,
    duration: 650,
  });
}

export function CommandIntelligenceMap({
  data,
  layers,
  mode,
  onJaringSelect,
  onBaketSelect,
  onViewportChange,
  onPointerMove,
}: CommandIntelligenceMapProps) {
  const resolvedTheme = usePreferencesStore((state) => state.resolvedThemeMode);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mounted, setMounted] = useState(false);
  const jaringGeoJson = useMemo(() => toJaringGeoJson(data), [data]);
  const baketGeoJson = useMemo(() => toBaketGeoJson(data), [data]);
  const mapStyle = mounted && resolvedTheme === "dark" ? DARK_STYLE : LIGHT_STYLE;

  useEffect(() => setMounted(true), []);

  const handleMapReady = useCallback(
    (instance: MapLibreMap) => {
      const primary = cssColor("--dc-primary", "#0ea5e9");
      const success = cssColor("--dc-success", "#16a34a");
      const warning = cssColor("--dc-warning", "#d97706");
      const danger = cssColor("--dc-danger", "#dc2626");
      const surface = cssColor("--dc-card", "#ffffff");
      const foreground = cssColor("--dc-text-primary", "#111827");

      if (!instance.getSource(SATELLITE_SOURCE)) {
        instance.addSource(SATELLITE_SOURCE, {
          type: "raster",
          tiles: [SATELLITE_TILES],
          tileSize: 256,
          maxzoom: 18,
          attribution: "Esri World Imagery",
        });
      }
      if (!instance.getLayer(SATELLITE_LAYER)) {
        instance.addLayer({
          id: SATELLITE_LAYER,
          type: "raster",
          source: SATELLITE_SOURCE,
          layout: { visibility: mode === "satellite" ? "visible" : "none" },
          paint: {
            "raster-opacity": 0.94,
            "raster-contrast": 0.12,
            "raster-saturation": -0.08,
          },
        });
      }

      instance.addSource(JARING_SOURCE, {
        type: "geojson",
        data: jaringGeoJson,
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 38,
      });
      instance.addLayer({
        id: JARING_CLUSTER_LAYER,
        type: "circle",
        source: JARING_SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": primary,
          "circle-radius": ["step", ["get", "point_count"], 17, 30, 21, 100, 26, 500, 32],
          "circle-opacity": 0.88,
          "circle-stroke-color": surface,
          "circle-stroke-width": 2,
        },
      });
      instance.addLayer({
        id: JARING_CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: JARING_SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 11,
          "text-font": ["Open Sans Bold"],
        },
        paint: {
          "text-color": surface,
        },
      });
      instance.addLayer({
        id: JARING_POINT_LAYER,
        type: "circle",
        source: JARING_SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "registrationStatus"],
            "APPROVED",
            success,
            "PENDING",
            warning,
            "REJECTED",
            danger,
            primary,
          ],
          "circle-radius": [
            "case",
            [">=", ["coalesce", ["get", "periodReports"], 0], 4],
            8,
            [">", ["coalesce", ["get", "periodReports"], 0], 0],
            6,
            4,
          ],
          "circle-opacity": 0.9,
          "circle-stroke-color": surface,
          "circle-stroke-width": 1.5,
        },
      });

      instance.addSource(BAKET_SOURCE, {
        type: "geojson",
        data: baketGeoJson,
      });
      instance.addLayer({
        id: BAKET_POINT_LAYER,
        type: "circle",
        source: BAKET_SOURCE,
        paint: {
          "circle-color": warning,
          "circle-radius": 7,
          "circle-opacity": 0.9,
          "circle-stroke-color": foreground,
          "circle-stroke-width": 2,
        },
      });

      setMap(instance);
      fitData(instance, data);
    },
    [baketGeoJson, data, jaringGeoJson, mode],
  );

  useEffect(() => {
    if (!map) return;

    const jaringSource = map.getSource(JARING_SOURCE) as GeoJSONSource | undefined;
    const baketSource = map.getSource(BAKET_SOURCE) as GeoJSONSource | undefined;
    jaringSource?.setData(jaringGeoJson);
    baketSource?.setData(baketGeoJson);
  }, [baketGeoJson, jaringGeoJson, map]);

  useEffect(() => {
    if (!map) return;
    const jaringVisibility = layers.jaring ? "visible" : "none";
    const baketVisibility = layers.baket ? "visible" : "none";

    for (const layerId of [JARING_CLUSTER_LAYER, JARING_CLUSTER_COUNT_LAYER, JARING_POINT_LAYER]) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, "visibility", jaringVisibility);
    }
    if (map.getLayer(BAKET_POINT_LAYER)) {
      map.setLayoutProperty(BAKET_POINT_LAYER, "visibility", baketVisibility);
    }
  }, [layers.baket, layers.jaring, map]);

  useEffect(() => {
    if (!map?.getLayer(SATELLITE_LAYER)) return;
    map.setLayoutProperty(SATELLITE_LAYER, "visibility", mode === "satellite" ? "visible" : "none");
  }, [map, mode]);

  useEffect(() => {
    if (!map) return;

    const handleClusterClick = async (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      const coordinates = feature?.geometry.type === "Point" ? feature.geometry.coordinates : null;
      if (typeof clusterId !== "number" || !coordinates) return;

      const source = map.getSource(JARING_SOURCE) as GeoJSONSource;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.easeTo({ center: coordinates as [number, number], zoom, duration: 450 });
    };
    const handleJaringClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onJaringSelect(id);
    };
    const handleBaketClick = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") onBaketSelect(id);
    };
    const handleMouseMove = (event: MapLayerMouseEvent) => {
      onPointerMove({ latitude: event.lngLat.lat, longitude: event.lngLat.lng });
    };
    const setPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const clearPointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", JARING_CLUSTER_LAYER, handleClusterClick);
    map.on("click", JARING_POINT_LAYER, handleJaringClick);
    map.on("click", BAKET_POINT_LAYER, handleBaketClick);
    map.on("mousemove", handleMouseMove);
    for (const layerId of [JARING_CLUSTER_LAYER, JARING_POINT_LAYER, BAKET_POINT_LAYER]) {
      map.on("mouseenter", layerId, setPointer);
      map.on("mouseleave", layerId, clearPointer);
    }

    return () => {
      map.off("click", JARING_CLUSTER_LAYER, handleClusterClick);
      map.off("click", JARING_POINT_LAYER, handleJaringClick);
      map.off("click", BAKET_POINT_LAYER, handleBaketClick);
      map.off("mousemove", handleMouseMove);
      for (const layerId of [JARING_CLUSTER_LAYER, JARING_POINT_LAYER, BAKET_POINT_LAYER]) {
        map.off("mouseenter", layerId, setPointer);
        map.off("mouseleave", layerId, clearPointer);
      }
    };
  }, [map, onBaketSelect, onJaringSelect, onPointerMove]);

  return (
    <BaseMap
      key={`${mounted ? resolvedTheme : "light"}-${mapStyle}`}
      center={INDONESIA_CENTER}
      zoom={4.2}
      styles={{ light: mapStyle, dark: mapStyle }}
      minZoom={3}
      maxZoom={18}
      onMapReady={handleMapReady}
      onViewportChange={onViewportChange}
    >
      <MapControls position="bottom-right" showZoom showCompass />
    </BaseMap>
  );
}
