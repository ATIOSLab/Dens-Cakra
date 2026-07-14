import type { HeatmapLayerSpecification } from "maplibre-gl";

export const HeatmapLayerSpec = (sourceId: string): HeatmapLayerSpecification => ({
  id: "personnel-heatmap",
  type: "heatmap",
  source: sourceId,
  maxzoom: 5.5,
  paint: {
    // Increase weight based on derived emergency level or active status
    "heatmap-weight": [
      "case",
      ["==", ["get", "status"], "EMERGENCY"], 3,
      ["==", ["get", "status"], "OFFLINE"], 0.5,
      1
    ],
    // Heatmap intensity adjusts according to zoom
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 0.5,
      5, 2
    ],
    // Classic military intelligence color ramp
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0, "rgba(0,0,0,0)",
      0.15, "rgba(59, 130, 246, 0.15)", // Blue (Supervisor/Info)
      0.4, "rgba(16, 185, 129, 0.4)",   // Green (Active)
      0.7, "rgba(249, 115, 22, 0.65)",  // Orange (Duty)
      0.9, "rgba(239, 68, 68, 0.85)"    // Red (Emergency)
    ],
    // Heatmap radius based on zoom level
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      0, 3,
      5, 24
    ],
    // Transition opacity as we zoom in
    "heatmap-opacity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      4.5, 0.9,
      5.5, 0
    ]
  }
});
