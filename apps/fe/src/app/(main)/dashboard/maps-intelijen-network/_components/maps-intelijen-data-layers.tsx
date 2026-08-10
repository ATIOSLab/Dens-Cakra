"use client";

import { useEffect, useMemo, useRef } from "react";

import type { GeoJSONSource, MapLayerMouseEvent, Map as MapLibreMap, MapMouseEvent } from "maplibre-gl";

import { PERSONNEL_LOCATION_VISUALS } from "@/lib/domain/visual-system";

import {
  DATA_TYPE_PRESENTATION,
  getMarkerPresentation,
  getUrgencyPresentation,
} from "./maps-intelijen-presentation";
import type { HeatmapWeight, MapNetworkFeature, MarkerColorMode, VisualizationMode } from "./maps-intelijen-types";

const SOURCE_ID = "dc-intelligent-network";
const LAYERS = [
  "dc-network-heatmap",
  "dc-network-cluster",
  "dc-network-cluster-count",
  "dc-network-report-point",
  "dc-network-baket-point",
  "dc-network-agent-point",
] as const;

function hasUsableStyle(map: MapLibreMap) {
  try {
    return Boolean(map.getStyle());
  } catch {
    return false;
  }
}

function removeDataLayers(map: MapLibreMap) {
  if (!hasUsableStyle(map)) return;
  try {
    for (const id of LAYERS) if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
  } catch {
    // The parent map can remove its style before React finishes child cleanup.
  }
}

function getDataSource(map: MapLibreMap | null) {
  if (!map || !hasUsableStyle(map)) return undefined;
  return map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
}

interface MapsIntelijenDataLayersProps {
  map: MapLibreMap | null;
  features: MapNetworkFeature[];
  mode: VisualizationMode;
  colorMode: MarkerColorMode;
  heatmapWeight: HeatmapWeight;
  onHover: (feature: MapNetworkFeature | null) => void;
  onClick: (feature: MapNetworkFeature) => void;
  onMapClick: () => void;
}

function categoryColor(code?: string | null) {
  const palette = ["#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#eab308", "#f97316"];
  const value = code ?? "uncategorized";
  const hash = [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 0);
  return palette[hash % palette.length];
}

export function markerColor(feature: MapNetworkFeature, mode: MarkerColorMode) {
  const properties = feature.properties;
  if (properties.markerType === "agent") return properties.suggestedColor || DATA_TYPE_PRESENTATION.agent.mapColor;
  if (properties.markerType === "baket") return getUrgencyPresentation(properties.urgency).mapColor;
  if (mode === "category") return categoryColor(properties.category?.code ?? properties.category?.id);
  return getMarkerPresentation(properties, mode).mapColor;
}

function heatWeight(feature: MapNetworkFeature, weight: HeatmapWeight) {
  const properties = feature.properties;
  if (weight === "urgency") {
    if (properties.urgency === "URGENT") return 1;
    if (properties.urgency === "HIGH") return 0.75;
    if (properties.urgency === "LOW") return 0.25;
    return 0.5;
  }
  if (weight === "valid") return properties.validity === "VALID" ? 1 : 0.1;
  if (weight === "baket") return properties.markerType === "baket" ? 1 : 0.1;
  return 1;
}

export function MapsIntelijenDataLayers({
  map,
  features,
  mode,
  colorMode,
  heatmapWeight,
  onHover,
  onClick,
  onMapClick,
}: MapsIntelijenDataLayersProps) {
  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: features.map((feature) => ({
        ...feature,
        properties: {
          ...feature.properties,
          renderColor: markerColor(feature, colorMode),
          heatWeight: heatWeight(feature, heatmapWeight),
        },
      })),
    }),
    [colorMode, features, heatmapWeight],
  );
  const dataRef = useRef(data);
  dataRef.current = data;
  const featureById = useMemo(() => new Map(features.map((feature) => [feature.id, feature])), [features]);

  useEffect(() => {
    if (!map) return;

    const install = () => {
      if (!hasUsableStyle(map) || !map.isStyleLoaded()) return;
      removeDataLayers(map);

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: dataRef.current,
        cluster: mode === "cluster",
        clusterMaxZoom: 14,
        clusterRadius: 52,
      });

      if (mode === "heatmap") {
        map.addLayer({
          id: "dc-network-heatmap",
          type: "heatmap",
          source: SOURCE_ID,
          maxzoom: 18,
          paint: {
            "heatmap-weight": ["get", "heatWeight"],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.65, 12, 1.8],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 12, 12, 28, 18, 44],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.68, 17, 0.28],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(14,165,233,0)",
              0.25,
              "#38bdf8",
              0.5,
              "#22c55e",
              0.75,
              "#facc15",
              1,
              "#f97316",
            ],
          },
        });
        return;
      }

      if (mode === "cluster") {
        map.addLayer({
          id: "dc-network-cluster",
          type: "circle",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": ["step", ["get", "point_count"], "#0ea5e9", 25, "#8b5cf6", 100, "#f97316"],
            "circle-radius": ["step", ["get", "point_count"], 15, 25, 20, 100, 25],
            "circle-stroke-width": 2,
            "circle-stroke-color": "rgba(255,255,255,.85)",
          },
        });
        map.addLayer({
          id: "dc-network-cluster-count",
          type: "symbol",
          source: SOURCE_ID,
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 10 },
          paint: { "text-color": "#ffffff" },
        });
      }

      map.addLayer({
        id: "dc-network-report-point",
        type: "circle",
        source: SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "markerType"], "report"]],
        paint: {
          "circle-color": ["get", "renderColor"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 14, 7],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.addLayer({
        id: "dc-network-baket-point",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "markerType"], "baket"]],
        layout: {
          "text-field": "◆",
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 12, 14, 18],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": ["get", "renderColor"],
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.25,
        },
      });
      map.addLayer({
        id: "dc-network-agent-point",
        type: "circle",
        source: SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "markerType"], "agent"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "agentState"], "active"],
            PERSONNEL_LOCATION_VISUALS.ONLINE.markerColor,
            PERSONNEL_LOCATION_VISUALS.OFFLINE.markerColor,
          ],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 14, 7],
          "circle-stroke-width": 2,
          "circle-stroke-color": ["case", ["==", ["get", "agentState"], "active"], "#bbf7d0", "#e2e8f0"],
        },
      });
    };

    install();
    map.on("style.load", install);
    return () => {
      map.off("style.load", install);
      removeDataLayers(map);
    };
  }, [map, mode]);

  useEffect(() => {
    const source = getDataSource(map);
    if (source) source.setData(data);
  }, [data, map]);

  useEffect(() => {
    if (!map || mode === "heatmap") return;
    const pointLayers = ["dc-network-report-point", "dc-network-baket-point", "dc-network-agent-point"];
    const enter = (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const rendered = event.features?.[0];
      const feature = rendered?.id === undefined ? undefined : featureById.get(String(rendered.id));
      if (feature) onHover(feature);
    };
    const leave = () => {
      map.getCanvas().style.cursor = "";
      onHover(null);
    };
    const click = (event: MapLayerMouseEvent) => {
      event.originalEvent.preventDefault();
      const rendered = event.features?.[0];
      const feature = rendered?.id === undefined ? undefined : featureById.get(String(rendered.id));
      if (feature) onClick(feature);
    };
    const clusterClick = (event: MapLayerMouseEvent) => {
      event.originalEvent.preventDefault();
      const feature = event.features?.[0];
      const clusterId = feature?.properties?.cluster_id;
      if (clusterId === undefined || feature?.geometry.type !== "Point") return;
      const center = feature.geometry.coordinates as [number, number];
      const source = map.getSource(SOURCE_ID) as GeoJSONSource;
      void source.getClusterExpansionZoom(clusterId).then((zoom) => {
        map.easeTo({ center, zoom, duration: 450 });
      });
    };
    const backgroundClick = (event: MapMouseEvent) => {
      if (!event.originalEvent.defaultPrevented) onMapClick();
    };
    for (const layer of pointLayers) {
      map.on("mouseenter", layer, enter);
      map.on("mouseleave", layer, leave);
      map.on("click", layer, click);
    }
    if (mode === "cluster") map.on("click", "dc-network-cluster", clusterClick);
    map.on("click", backgroundClick);
    return () => {
      for (const layer of pointLayers) {
        map.off("mouseenter", layer, enter);
        map.off("mouseleave", layer, leave);
        map.off("click", layer, click);
      }
      if (mode === "cluster") map.off("click", "dc-network-cluster", clusterClick);
      map.off("click", backgroundClick);
      map.getCanvas().style.cursor = "";
    };
  }, [featureById, map, mode, onClick, onHover, onMapClick]);

  return null;
}
