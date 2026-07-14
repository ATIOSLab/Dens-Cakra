import type { CircleLayerSpecification } from "maplibre-gl";

export const PersonnelCircleLayerSpec = (sourceId: string): CircleLayerSpecification => ({
  id: "personnel-points",
  type: "circle",
  source: sourceId,
  minzoom: 3,
  paint: {
    "circle-color": [
      "match",
      ["get", "status"],
      "ACTIVE",
      "#10b981", // green
      "SUPERVISOR",
      "#3b82f6", // blue
      "DUTY",
      "#f97316", // orange
      "EMERGENCY",
      "#ef4444", // red
      "OFFLINE",
      "#6b7280", // gray
      "#10b981", // default
    ],
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.5, 6, 3.5, 8, 5, 11, 7, 14, 10],
    "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 3, 0.75, 8, 1.5],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-opacity": 0.95,
  },
});

export const PersonnelPulseLayerSpec = (sourceId: string): CircleLayerSpecification => ({
  id: "personnel-active-pulse",
  type: "circle",
  source: sourceId,
  minzoom: 8,
  filter: ["all", ["!", ["has", "point_count"]], ["in", ["get", "status"], ["literal", ["ACTIVE", "EMERGENCY"]]]],
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 9, 11, 13, 14, 18],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": ["match", ["get", "status"], "EMERGENCY", "#ef4444", "#10b981"],
    "circle-stroke-opacity": 0.6,
  },
});

// A layer to draw a larger ring around the currently selected/highlighted marker
export const PersonnelHighlightLayerSpec = (sourceId: string): CircleLayerSpecification => ({
  id: "personnel-highlight",
  type: "circle",
  source: sourceId,
  minzoom: 3,
  filter: ["==", ["get", "assignmentId"], ""], // dynamic filter set during selection
  paint: {
    "circle-color": "rgba(0,0,0,0)",
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 12, 11, 16, 14, 22],
    "circle-stroke-width": 2,
    "circle-stroke-color": "#38bdf8", // vibrant Cyan highlight
    "circle-stroke-opacity": 0.9,
  },
});
