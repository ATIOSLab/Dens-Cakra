import { useEffect, useRef } from "react";

import type { GeoJSONSource, LayerSpecification, MapLayerMouseEvent, Map as MapLibreMap } from "maplibre-gl";

import { PersonnelCircleLayerSpec, PersonnelHighlightLayerSpec, PersonnelPulseLayerSpec } from "./PersonnelLayer";
import { getPersonnelStatus } from "./utils/mapHelpers";

type UsePersonnelMapProps = {
  map: MapLibreMap | null;
  isReady: boolean;
  personnelData: GeoJSON.FeatureCollection | null; // Raw FeatureCollection
  emergencies: GeoJSON.Feature[]; // List of emergency alerts to associate with personnel
  selectedPersonnelId: string | null;
  onSelectPersonnel: (feature: GeoJSON.Feature) => void;
  visibleLayers: {
    personnel: boolean;
  };
};

function hasUsableStyle(map: MapLibreMap) {
  try {
    return Boolean(map.getStyle());
  } catch {
    return false;
  }
}

function hasMapSource(map: MapLibreMap, sourceId: string) {
  if (!hasUsableStyle(map)) return false;

  try {
    return Boolean(map.getSource(sourceId));
  } catch {
    return false;
  }
}

function hasMapLayer(map: MapLibreMap, layerId: string) {
  if (!hasUsableStyle(map)) return false;

  try {
    return Boolean(map.getLayer(layerId));
  } catch {
    return false;
  }
}

export function usePersonnelMap({
  map,
  isReady,
  personnelData,
  emergencies,
  selectedPersonnelId,
  onSelectPersonnel,
  visibleLayers,
}: UsePersonnelMapProps) {
  const sourceId = "personnel-points-source";
  const legacySourceId = "personnel-source";
  const animationFrameIdRef = useRef<number | null>(null);

  // Map layers setup and data synchronization
  useEffect(() => {
    if (!map || !isReady) return;

    let disposed = false;

    // Process GeoJSON features to add derived personnel status attributes
    const processedFeatures = (personnelData?.features || []).map((feature: GeoJSON.Feature) => {
      const status = getPersonnelStatus(feature.properties ?? {}, emergencies);
      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          status, // ACTIVE, SUPERVISOR, DUTY, EMERGENCY, OFFLINE
        },
      };
    });

    const geoJsonData = {
      type: "FeatureCollection" as const,
      features: processedFeatures,
    };

    const setupLayers = () => {
      if (disposed || !hasUsableStyle(map)) return;

      // Remove cluster-based layers/source left behind by hot reloads.
      try {
        if (hasMapSource(map, legacySourceId)) {
          [
            "personnel-highlight",
            "personnel-points",
            "personnel-active-pulse",
            "personnel-cluster-count",
            "personnel-clusters",
            "personnel-cluster-boundary",
            "personnel-heatmap",
          ].forEach((layerId) => {
            if (hasMapLayer(map, layerId)) map.removeLayer(layerId);
          });
          map.removeSource(legacySourceId);
        }

        // 1. Add Source
        if (!hasMapSource(map, sourceId)) {
          map.addSource(sourceId, {
            type: "geojson",
            data: geoJsonData,
            cluster: false,
          });
        }

        // Render every assignment as an individual point at every zoom level.
        if (!hasMapLayer(map, "personnel-active-pulse")) {
          map.addLayer(PersonnelPulseLayerSpec(sourceId) as LayerSpecification);
        }
        if (!hasMapLayer(map, "personnel-points")) {
          map.addLayer(PersonnelCircleLayerSpec(sourceId) as LayerSpecification);
        }
        if (!hasMapLayer(map, "personnel-highlight")) {
          map.addLayer(PersonnelHighlightLayerSpec(sourceId) as LayerSpecification);
        }

        // Synchronize data via setData
        const source = map.getSource(sourceId) as GeoJSONSource | undefined;
        source?.setData(geoJsonData);

        if (hasMapLayer(map, "personnel-highlight")) {
          map.setFilter("personnel-highlight", ["==", ["get", "assignmentId"], selectedPersonnelId ?? ""]);
        }

        const toggleLayer = (layerId: string, visible: boolean) => {
          if (hasMapLayer(map, layerId)) {
            map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
          }
        };

        toggleLayer("personnel-points", visibleLayers.personnel);
        toggleLayer("personnel-active-pulse", visibleLayers.personnel);
        toggleLayer("personnel-highlight", visibleLayers.personnel);
      } catch {
        // The map may be disposed while React is switching the base style.
      }
    };

    try {
      if (map.isStyleLoaded()) {
        setupLayers();
      } else {
        map.once("styledata", setupLayers);
      }
    } catch {
      // The replacement map instance will initialize these layers again.
    }

    return () => {
      disposed = true;
      try {
        map.off("styledata", setupLayers);
      } catch {
        // The old map instance has already been removed.
      }
    };
  }, [map, isReady, personnelData, emergencies, selectedPersonnelId, visibleLayers]);

  // Handle layer click & hover events
  useEffect(() => {
    if (!map || !isReady) return;

    const onPersonnelClick = (e: MapLayerMouseEvent) => {
      e.originalEvent?.stopPropagation();
      const feature = e.features?.[0];
      if (feature) {
        onSelectPersonnel(feature);
      }
    };

    const setPointerCursor = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const resetCursor = () => {
      map.getCanvas().style.cursor = "";
    };

    try {
      map.on("click", "personnel-points", onPersonnelClick);
      map.on("mouseenter", "personnel-points", setPointerCursor);
      map.on("mouseleave", "personnel-points", resetCursor);
    } catch {
      return;
    }

    return () => {
      try {
        map.off("click", "personnel-points", onPersonnelClick);
        map.off("mouseenter", "personnel-points", setPointerCursor);
        map.off("mouseleave", "personnel-points", resetCursor);
      } catch {
        // The old map instance has already been removed.
      }
    };
  }, [map, isReady, onSelectPersonnel]);

  // RequestAnimationFrame loop for high-performance WebGL pulsing marker animation
  useEffect(() => {
    if (!map || !isReady) return;

    let disposed = false;

    const animatePulse = () => {
      if (disposed || !hasUsableStyle(map)) return;

      if (hasMapLayer(map, "personnel-active-pulse")) {
        try {
          const time = Date.now() / 450;
          const baseRadius = 8 + 4 * Math.sin(time); // vary between 4px and 12px dynamically
          const baseOpacity = Math.min(1, Math.max(0, 0.7 - 0.45 * Math.sin(time)));

          map.setPaintProperty("personnel-active-pulse", "circle-radius", [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            baseRadius,
            11,
            baseRadius * 1.4,
            14,
            baseRadius * 1.8,
          ]);
          map.setPaintProperty("personnel-active-pulse", "circle-stroke-opacity", baseOpacity);
        } catch {
          return;
        }
      }

      if (!disposed) animationFrameIdRef.current = requestAnimationFrame(animatePulse);
    };

    animatePulse();

    return () => {
      disposed = true;
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  }, [map, isReady]);
}
