// biome-ignore-all lint/style/useFilenamingConvention: Map layer filenames preserve exported layer names.
import type { CircleLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";

export const ClusterCircleLayerSpec = (sourceId: string): CircleLayerSpecification => ({
  id: "personnel-clusters",
  type: "circle",
  source: sourceId,
  minzoom: 3,
  maxzoom: 8.5,
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step",
      ["get", "point_count"],
      "rgba(14, 165, 233, 0.35)", // Sky blue soft for small (<10)
      10,
      "rgba(249, 115, 22, 0.45)", // Orange for medium (10-50)
      50,
      "rgba(239, 68, 68, 0.55)", // Red for large (50+)
    ],
    "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 50, 30],
    "circle-stroke-width": 2,
    "circle-stroke-color": [
      "step",
      ["get", "point_count"],
      "rgba(14, 165, 233, 0.75)",
      10,
      "rgba(249, 115, 22, 0.85)",
      50,
      "rgba(239, 68, 68, 0.9)",
    ],
  },
});

export const ClusterCountLayerSpec = (sourceId: string): SymbolLayerSpecification => ({
  id: "personnel-cluster-count",
  type: "symbol",
  source: sourceId,
  minzoom: 3,
  maxzoom: 8.5,
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-font": ["literal", ["sans-serif"]],
    "text-size": 11,
    "text-allow-overlap": true,
    "text-ignore-placement": true,
  },
  paint: {
    "text-color": "#ffffff",
  },
});
export const ClusterBoundaryLayerSpec = (sourceId: string) => ({
  id: "personnel-cluster-boundary",
  type: "circle",
  source: sourceId,
  minzoom: 3,
  maxzoom: 8.5,
  filter: ["has", "point_count"],
  paint: {
    "circle-radius": ["step", ["get", "point_count"], 24, 10, 32, 50, 40],
    "circle-color": "rgba(255, 255, 255, 0.0)",
    "circle-stroke-width": 1,
    "circle-stroke-color": "rgba(255, 255, 255, 0.15)",
    "circle-stroke-opacity": 0.4,
  },
});
