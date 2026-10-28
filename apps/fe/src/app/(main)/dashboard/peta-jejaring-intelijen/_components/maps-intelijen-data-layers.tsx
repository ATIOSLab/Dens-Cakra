"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import { type GeoJSONSource, type MapLayerMouseEvent, type Map as MapLibreMap, type MapMouseEvent, setWorkerUrl } from "maplibre-gl";

if (typeof window !== "undefined") {
  try {
    setWorkerUrl("/maplibre-gl-worker.mjs");
  } catch {
    // Ignore in non-browser or test environments
  }
}

import { DATA_TYPE_PRESENTATION, getMarkerPresentation, getUrgencyPresentation } from "./maps-intelijen-presentation";
import type { HeatmapWeight, MapNetworkFeature, MarkerColorMode, VisualizationMode } from "./maps-intelijen-types";

const SOURCE_ID = "dc-intelligent-network";
const LAYERS = [
  "dc-network-heatmap",
  "dc-network-cluster",
  "dc-network-cluster-count",
  "dc-network-report-point",
  "dc-network-baket-point",
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
  for (const id of LAYERS) {
    try {
      if (map.getLayer(id)) map.removeLayer(id);
    } catch {
      // Ignore individual layer removal errors
    }
  }
  try {
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
  const validFeatures = useMemo(
    () =>
      features.filter((f) => {
        const coords = f?.geometry?.coordinates;
        return (
          Array.isArray(coords) &&
          coords.length >= 2 &&
          typeof coords[0] === "number" &&
          typeof coords[1] === "number" &&
          !Number.isNaN(coords[0]) &&
          !Number.isNaN(coords[1]) &&
          coords[0] >= -180 &&
          coords[0] <= 180 &&
          coords[1] >= -90 &&
          coords[1] <= 90
        );
      }),
    [features],
  );

  const data = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: validFeatures.map((feature, index) => ({
        ...feature,
        id: feature.id,
        properties: {
          ...feature.properties,
          featureKey: feature.id,
          featureIndex: index,
          renderColor: markerColor(feature, colorMode),
          heatWeight: heatWeight(feature, heatmapWeight),
        },
      })),
    }),
    [colorMode, validFeatures, heatmapWeight],
  );
  const dataRef = useRef(data);
  dataRef.current = data;

  const featureByKey = useMemo(() => {
    const lookup = new Map<string, MapNetworkFeature>();
    validFeatures.forEach((feature, index) => {
      if (feature.id) {
        lookup.set(String(feature.id), feature);
      }
      lookup.set(String(index), feature);
      lookup.set(`idx:${index}`, feature);
      const props = feature.properties;
      if (props?.reportId) {
        lookup.set(String(props.reportId), feature);
        lookup.set(`report:${props.reportId}`, feature);
      }
      if (props?.baketId) {
        lookup.set(String(props.baketId), feature);
        lookup.set(`baket:${props.baketId}`, feature);
      }
      if (props?.referenceNumber) {
        lookup.set(String(props.referenceNumber), feature);
      }
    });
    return lookup;
  }, [validFeatures]);

  const resolveFeature = useCallback(
    (rendered?: { id?: string | number; properties?: Record<string, unknown> } | null): MapNetworkFeature | undefined => {
      if (!rendered) return undefined;
      const props = rendered.properties;
      if (props?.featureKey && featureByKey.has(String(props.featureKey))) {
        return featureByKey.get(String(props.featureKey));
      }
      if (props?.reportId && featureByKey.has(`report:${props.reportId}`)) {
        return featureByKey.get(`report:${props.reportId}`);
      }
      if (props?.reportId && featureByKey.has(String(props.reportId))) {
        return featureByKey.get(String(props.reportId));
      }
      if (props?.baketId && featureByKey.has(`baket:${props.baketId}`)) {
        return featureByKey.get(`baket:${props.baketId}`);
      }
      if (props?.baketId && featureByKey.has(String(props.baketId))) {
        return featureByKey.get(String(props.baketId));
      }
      if (rendered.id !== undefined && featureByKey.has(String(rendered.id))) {
        return featureByKey.get(String(rendered.id));
      }
      if (props?.featureIndex !== undefined && featureByKey.has(`idx:${props.featureIndex}`)) {
        return featureByKey.get(`idx:${props.featureIndex}`);
      }
      if (props?.referenceNumber && featureByKey.has(String(props.referenceNumber))) {
        return featureByKey.get(String(props.referenceNumber));
      }
      return undefined;
    },
    [featureByKey],
  );

  useEffect(() => {
    if (!map) return;

    let isMounted = true;

    const ensureLayers = () => {
      if (!isMounted || !hasUsableStyle(map)) return;

      if (!map.getSource(SOURCE_ID)) {
        try {
          map.addSource(SOURCE_ID, {
            type: "geojson",
            data: dataRef.current,
            cluster: mode === "cluster",
            clusterMaxZoom: 14,
            clusterRadius: 52,
            promoteId: "featureKey",
          });
        } catch {
          return;
        }
      }

      if (mode === "heatmap") {
        if (!map.getLayer("dc-network-heatmap")) {
          try {
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
          } catch {}
        }
        return;
      }

      if (mode === "cluster") {
        if (!map.getLayer("dc-network-cluster")) {
          try {
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
          } catch {}
        }

        if (!map.getLayer("dc-network-cluster-count")) {
          try {
            map.addLayer({
              id: "dc-network-cluster-count",
              type: "symbol",
              source: SOURCE_ID,
              filter: ["has", "point_count"],
              layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 10 },
              paint: { "text-color": "#ffffff" },
            });
          } catch {}
        }
      }

      if (!map.getLayer("dc-network-report-point")) {
        try {
          map.addLayer({
            id: "dc-network-report-point",
            type: "circle",
            source: SOURCE_ID,
            filter: [
              "all",
              ["!", ["has", "point_count"]],
              ["any", ["==", ["get", "markerType"], "report"], ["==", ["get", "markerType"], "REPORT"]],
            ],
            paint: {
              "circle-color": ["coalesce", ["get", "renderColor"], "#0ea5e9"],
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 14, 7],
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#ffffff",
            },
          });
        } catch {}
      }

      if (!map.getLayer("dc-network-baket-point")) {
        try {
          map.addLayer({
            id: "dc-network-baket-point",
            type: "symbol",
            source: SOURCE_ID,
            filter: [
              "all",
              ["!", ["has", "point_count"]],
              ["any", ["==", ["get", "markerType"], "baket"], ["==", ["get", "markerType"], "BAKET"]],
            ],
            layout: {
              "text-field": "◆",
              "text-size": ["interpolate", ["linear"], ["zoom"], 5, 12, 14, 18],
              "text-allow-overlap": true,
            },
            paint: {
              "text-color": ["coalesce", ["get", "renderColor"], "#f59e0b"],
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.25,
            },
          });
        } catch {}
      }

      const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      source?.setData(dataRef.current);
    };

    const handleStyleLoad = () => {
      ensureLayers();
    };

    if (map.isStyleLoaded()) {
      ensureLayers();
    }

    map.on("style.load", handleStyleLoad);
    map.on("load", handleStyleLoad);

    return () => {
      isMounted = false;
      map.off("style.load", handleStyleLoad);
      map.off("load", handleStyleLoad);
      removeDataLayers(map);
    };
  }, [map, mode]);

  useEffect(() => {
    if (!map) return;
    const source = getDataSource(map);
    if (source) {
      source.setData(data);
    }
  }, [data, map]);

  useEffect(() => {
    if (!map || mode === "heatmap") return;
    const pointLayers = ["dc-network-report-point", "dc-network-baket-point"];
    const enter = (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const rendered = event.features?.[0];
      const feature = resolveFeature(rendered);
      if (feature) onHover(feature);
    };
    const leave = () => {
      map.getCanvas().style.cursor = "";
      onHover(null);
    };
    const click = (event: MapLayerMouseEvent) => {
      event.originalEvent.preventDefault();
      event.originalEvent.stopPropagation();
      const rendered = event.features?.[0];
      const feature = resolveFeature(rendered);
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
  }, [map, mode, onClick, onHover, onMapClick, resolveFeature]);

  return null;
}
