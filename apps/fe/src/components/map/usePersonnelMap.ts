import { useEffect, useRef } from "react";

import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

import { PersonnelCircleLayerSpec, PersonnelHighlightLayerSpec, PersonnelPulseLayerSpec } from "./PersonnelLayer";
import { getPersonnelStatus } from "./utils/mapHelpers";

type UsePersonnelMapProps = {
  map: MapLibreMap | null;
  isReady: boolean;
  personnelData: any; // Raw FeatureCollection
  emergencies: any[]; // List of emergency alerts to associate with personnel
  selectedPersonnelId: string | null;
  onSelectPersonnel: (feature: any) => void;
  visibleLayers: {
    personnel: boolean;
  };
};

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

    // Process GeoJSON features to add derived personnel status attributes
    const processedFeatures = (personnelData?.features || []).map((feature: any) => {
      const status = getPersonnelStatus(feature.properties, emergencies);
      return {
        ...feature,
        properties: {
          ...feature.properties,
          status, // ACTIVE, SUPERVISOR, DUTY, EMERGENCY, OFFLINE
        },
      };
    });

    const geoJsonData = {
      type: "FeatureCollection" as const,
      features: processedFeatures,
    };

    const setupLayers = () => {
      // Remove cluster-based layers/source left behind by hot reloads.
      if (map.getSource(legacySourceId)) {
        [
          "personnel-highlight",
          "personnel-points",
          "personnel-active-pulse",
          "personnel-cluster-count",
          "personnel-clusters",
          "personnel-cluster-boundary",
          "personnel-heatmap",
        ].forEach((layerId) => {
          if (map.getLayer(layerId)) map.removeLayer(layerId);
        });
        map.removeSource(legacySourceId);
      }

      // 1. Add Source
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data: geoJsonData,
          cluster: false,
        });
      }

      // Render every assignment as an individual point at every zoom level.
      if (!map.getLayer("personnel-active-pulse")) {
        map.addLayer(PersonnelPulseLayerSpec(sourceId) as any);
      }
      if (!map.getLayer("personnel-points")) {
        map.addLayer(PersonnelCircleLayerSpec(sourceId) as any);
      }
      if (!map.getLayer("personnel-highlight")) {
        map.addLayer(PersonnelHighlightLayerSpec(sourceId) as any);
      }

      // Synchronize data via setData
      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      if (source) {
        source.setData(geoJsonData);
      }
    };

    if (map.isStyleLoaded()) {
      setupLayers();
    } else {
      map.once("styledata", setupLayers);
    }

    // Update Highlight Filter
    if (map.getLayer("personnel-highlight")) {
      map.setFilter("personnel-highlight", ["==", ["get", "assignmentId"], selectedPersonnelId ?? ""]);
    }

    // Toggle layer visibilities based on settings
    const toggleLayer = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", visible ? "visible" : "none");
      }
    };

    toggleLayer("personnel-points", visibleLayers.personnel);
    toggleLayer("personnel-active-pulse", visibleLayers.personnel);
    toggleLayer("personnel-highlight", visibleLayers.personnel);
  }, [map, isReady, personnelData, emergencies, selectedPersonnelId, visibleLayers]);

  // Handle layer click & hover events
  useEffect(() => {
    if (!map || !isReady) return;

    const onPersonnelClick = (e: any) => {
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

    map.on("click", "personnel-points", onPersonnelClick);

    map.on("mouseenter", "personnel-points", setPointerCursor);
    map.on("mouseleave", "personnel-points", resetCursor);

    return () => {
      map.off("click", "personnel-points", onPersonnelClick);

      map.off("mouseenter", "personnel-points", setPointerCursor);
      map.off("mouseleave", "personnel-points", resetCursor);
    };
  }, [map, isReady, onSelectPersonnel]);

  // RequestAnimationFrame loop for high-performance WebGL pulsing marker animation
  useEffect(() => {
    if (!map || !isReady) return;

    const animatePulse = () => {
      if (map && map.getLayer("personnel-active-pulse")) {
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
      }
      animationFrameIdRef.current = requestAnimationFrame(animatePulse);
    };

    animatePulse();

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [map, isReady]);
}
