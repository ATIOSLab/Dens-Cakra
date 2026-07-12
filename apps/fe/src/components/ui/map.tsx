"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import maplibregl, {
  type FillLayerSpecification,
  FullscreenControl,
  GeolocateControl,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type Map as MapLibreMap,
  type MapGeoJSONFeature,
  type MapLayerMouseEvent,
  type Marker as MapLibreMarker,
  NavigationControl,
  Popup,
  type Popup as MapLibrePopup,
  type StyleSpecification,
} from "maplibre-gl";

import { MarkerContent } from "@/components/ui/marker";
import { cn } from "@/lib/utils";

type LngLat = [number, number];

type MapStyles = {
  light?: string;
  dark?: string;
};

type MapViewportState = {
  center: LngLat;
  zoom: number;
  pitch: number;
  bearing: number;
};

type MapProps = {
  center?: LngLat;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  styles?: MapStyles;
  className?: string;
  children?: React.ReactNode;
  blank?: boolean;
  minZoom?: number;
  maxZoom?: number;
  maxBounds?: LngLatBoundsLike;
  onMapReady?: (map: MapLibreMap) => void;
  onViewportChange?: (viewport: MapViewportState) => void;
};

type MapContextValue = {
  map: MapLibreMap | null;
  isReady: boolean;
};

type MarkerContextValue = {
  marker: MapLibreMarker | null;
};

type MapControlsProps = {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  showZoom?: boolean;
  showCompass?: boolean;
  showFullscreen?: boolean;
  showLocate?: boolean;
};

type MapMarkerProps = {
  longitude: number;
  latitude: number;
  children?: React.ReactNode;
};

type MapPopupProps = {
  longitude: number;
  latitude: number;
  children?: React.ReactNode;
  className?: string;
  closeButton?: boolean;
  onClose?: () => void;
};

type MarkerPopupProps = {
  children?: React.ReactNode;
  className?: string;
  closeButton?: boolean;
};

type MapFeature = MapGeoJSONFeature & {
  properties: Record<string, any>;
};

type MapFeatureEvent = {
  feature: MapFeature;
  rawEvent: MapLayerMouseEvent;
};

type MapGeoJSONProps = {
  data: GeoJSON.GeoJSON;
  promoteId?: string;
  interactive?: boolean;
  fillPaint?: FillLayerSpecification["paint"];
  fillHoverPaint?: FillLayerSpecification["paint"];
  linePaint?: Record<string, any> | false;
  onHover?: (event: MapFeatureEvent | null) => void;
  onClick?: (event: MapFeatureEvent) => void;
};

export type MapRef = {
  easeTo: (options: {
    center?: LngLat;
    zoom?: number;
    pitch?: number;
    bearing?: number;
    duration?: number;
  }) => void;
  getMap: () => MapLibreMap | null;
  resize: () => void;
};

export type MapViewport = MapViewportState;

const DEFAULT_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "OpenStreetMap",
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
    },
  ],
};

const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "rgba(0,0,0,0)",
      },
    },
  ],
};

const MapContext = createContext<MapContextValue | null>(null);
const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMapContext() {
  return useContext(MapContext);
}

function getResolvedStyle(styles?: MapStyles, blank?: boolean) {
  if (blank) {
    return BLANK_STYLE;
  }

  if (typeof window !== "undefined" && styles) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const themedStyle = prefersDark ? styles.dark ?? styles.light : styles.light ?? styles.dark;
    if (themedStyle) {
      return themedStyle;
    }
  }

  return styles?.light ?? styles?.dark ?? DEFAULT_STYLE;
}

function toViewport(map: MapLibreMap): MapViewportState {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    pitch: map.getPitch(),
    bearing: map.getBearing(),
  };
}

export const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    center = [106.8166, -6.2],
    zoom = 13,
    pitch = 0,
    bearing = 0,
    styles,
    className,
    children,
    blank,
    minZoom,
    maxZoom,
    maxBounds,
    onMapReady,
    onViewportChange,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const onViewportChangeRef = useRef(onViewportChange);
  const onMapReadyRef = useRef(onMapReady);
  const hasNotifiedReadyRef = useRef(false);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const resolvedStyle = useMemo(() => getResolvedStyle(styles, blank), [styles, blank]);

  onViewportChangeRef.current = onViewportChange;
  onMapReadyRef.current = onMapReady;

  useImperativeHandle(
    ref,
    () => ({
      easeTo: (options) => {
        mapRef.current?.easeTo(options);
      },
      getMap: () => mapRef.current,
      resize: () => {
        mapRef.current?.resize();
      },
    }),
    [],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: resolvedStyle,
      center,
      zoom,
      pitch,
      bearing,
      minZoom,
      maxZoom,
      maxBounds,
      attributionControl: false,
    });

    mapRef.current = map;
    setMapInstance(map);

    const emitViewport = () => {
      onViewportChangeRef.current?.(toViewport(map));
    };

    const markReady = () => {
      if (!map.isStyleLoaded()) {
        return;
      }

      setIsReady(true);
      if (!hasNotifiedReadyRef.current) {
        hasNotifiedReadyRef.current = true;
        onMapReadyRef.current?.(map);
      }
      emitViewport();
      map.resize();
    };

    const handleStyleData = () => {
      markReady();
    };

    map.on("load", markReady);
    map.on("styledata", handleStyleData);
    map.on("move", emitViewport);
    map.on("zoom", emitViewport);
    map.on("rotate", emitViewport);
    map.on("pitch", emitViewport);

    resizeObserverRef.current = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserverRef.current.observe(containerRef.current);

    markReady();

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      map.off("load", markReady);
      map.off("styledata", handleStyleData);
      map.off("move", emitViewport);
      map.off("zoom", emitViewport);
      map.off("rotate", emitViewport);
      map.off("pitch", emitViewport);
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      hasNotifiedReadyRef.current = false;
      setIsReady(false);
    };
  }, [bearing, center, maxBounds, maxZoom, minZoom, pitch, resolvedStyle, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.jumpTo({
      center,
      zoom,
      pitch,
      bearing,
    });

    if (typeof minZoom === "number") {
      map.setMinZoom(minZoom);
    }

    if (typeof maxZoom === "number") {
      map.setMaxZoom(maxZoom);
    }

    if (maxBounds) {
      map.setMaxBounds(maxBounds);
    }
  }, [bearing, center[0], center[1], maxBounds, maxZoom, minZoom, pitch, zoom]);

  return (
    <MapContext.Provider value={{ map: mapInstance, isReady }}>
      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          blank ? "bg-transparent" : "bg-slate-50 dark:bg-zinc-900",
          className,
        )}
      >
        <div ref={containerRef} className="absolute inset-0" />
        {children}
      </div>
    </MapContext.Provider>
  );
});

export function MapControls({
  position = "top-right",
  showZoom = false,
  showCompass = false,
  showFullscreen = false,
  showLocate = false,
}: MapControlsProps) {
  const context = useMapContext();

  useEffect(() => {
    if (!context?.map) {
      return;
    }

    const controls: Array<NavigationControl | FullscreenControl | GeolocateControl> = [];

    if (showZoom || showCompass) {
      const navigation = new NavigationControl({
        showZoom,
        showCompass,
        visualizePitch: showCompass,
      });
      context.map.addControl(navigation, position);
      controls.push(navigation);
    }

    if (showFullscreen) {
      const fullscreen = new FullscreenControl();
      context.map.addControl(fullscreen, position);
      controls.push(fullscreen);
    }

    if (showLocate) {
      const geolocate = new GeolocateControl({
        trackUserLocation: false,
        showUserLocation: true,
      });
      context.map.addControl(geolocate, position);
      controls.push(geolocate);
    }

    return () => {
      for (const control of controls) {
        context.map?.removeControl(control);
      }
    };
  }, [context?.map, position, showCompass, showFullscreen, showLocate, showZoom]);

  return null;
}

export function MapMarker({ longitude, latitude, children }: MapMarkerProps) {
  const context = useMapContext();
  const markerRef = useRef<MapLibreMarker | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    setElement(document.createElement("div"));
  }, []);

  useEffect(() => {
    if (!context?.map || !element || markerRef.current) {
      return;
    }

    element.className = "dc-map-marker";
    const marker = new maplibregl.Marker({
      element,
      anchor: "center",
    })
      .setLngLat([longitude, latitude])
      .addTo(context.map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
  }, [context?.map, element, latitude, longitude]);

  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  if (!element) {
    return null;
  }

  return (
    <MarkerContext.Provider value={{ marker: markerRef.current }}>
      {createPortal(children, element)}
    </MarkerContext.Provider>
  );
}

export function MarkerPopup({ children, className, closeButton = false }: MarkerPopupProps) {
  const markerContext = useContext(MarkerContext);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const popupRef = useRef<MapLibrePopup | null>(null);

  useEffect(() => {
    const node = document.createElement("div");
    if (className) {
      node.className = className;
    }
    setContainer(node);
  }, [className]);

  useEffect(() => {
    if (!markerContext?.marker || !container) {
      return;
    }

    const popup = new Popup({
      closeButton,
      closeOnClick: false,
      offset: 20,
    }).setDOMContent(container);

    markerContext.marker.setPopup(popup);
    popupRef.current = popup;

    return () => {
      if (markerContext.marker?.getPopup() === popup) {
        markerContext.marker.setPopup();
      }
      popup.remove();
      popupRef.current = null;
    };
  }, [closeButton, container, markerContext?.marker]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}

export function MapPopup({
  longitude,
  latitude,
  children,
  className,
  closeButton = false,
  onClose,
}: MapPopupProps) {
  const context = useMapContext();
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const popupRef = useRef<MapLibrePopup | null>(null);

  useEffect(() => {
    const node = document.createElement("div");
    if (className) {
      node.className = className;
    }
    setContainer(node);
  }, [className]);

  useEffect(() => {
    if (!context?.map || !container) {
      return;
    }

    const popup = new Popup({
      closeButton,
      closeOnClick: false,
      offset: 16,
    })
      .setLngLat([longitude, latitude])
      .setDOMContent(container)
      .addTo(context.map);

    if (onClose) {
      popup.on("close", onClose);
    }

    popupRef.current = popup;

    return () => {
      if (onClose) {
        popup.off("close", onClose);
      }
      popup.remove();
      popupRef.current = null;
    };
  }, [className, closeButton, container, context?.map, latitude, longitude, onClose]);

  useEffect(() => {
    popupRef.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  if (!container) {
    return null;
  }

  return createPortal(children, container);
}

export function MapGeoJSON({
  data,
  promoteId,
  interactive = false,
  fillPaint,
  fillHoverPaint,
  linePaint,
  onHover,
  onClick,
}: MapGeoJSONProps) {
  const context = useMapContext();
  const instanceId = useId().replace(/[:]/g, "");
  const sourceId = `dc-geojson-source-${instanceId}`;
  const fillLayerId = `dc-geojson-fill-${instanceId}`;
  const hoverLayerId = `dc-geojson-hover-${instanceId}`;
  const lineLayerId = `dc-geojson-line-${instanceId}`;
  const hoveredFeatureIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!context?.map || !context.isReady) {
      return;
    }

    const map = context.map;
    const resolvedLinePaint =
      linePaint === false
        ? null
        : (linePaint ?? {
            "line-color": "rgba(15, 23, 42, 0.42)",
            "line-width": 0.75,
            "line-opacity": 0.9,
          });

    const ensureLayers = () => {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "geojson",
          data,
          ...(promoteId ? { promoteId } : {}),
        });
      }

      if (!map.getLayer(fillLayerId)) {
        map.addLayer({
          id: fillLayerId,
          type: "fill",
          source: sourceId,
          paint: fillPaint ?? {
            "fill-color": "rgba(14, 165, 233, 0.18)",
            "fill-opacity": 1,
          },
        });
      }

      if (fillHoverPaint && !map.getLayer(hoverLayerId)) {
        map.addLayer({
          id: hoverLayerId,
          type: "fill",
          source: sourceId,
          filter: ["==", ["id"], ""],
          paint: fillHoverPaint,
        });
      }

      if (resolvedLinePaint && !map.getLayer(lineLayerId)) {
        map.addLayer({
          id: lineLayerId,
          type: "line",
          source: sourceId,
          paint: resolvedLinePaint,
        });
      }

      const source = map.getSource(sourceId) as GeoJSONSource | undefined;
      source?.setData(data);
    };

    if (map.isStyleLoaded()) {
      ensureLayers();
    } else {
      map.once("styledata", ensureLayers);
    }

    const getFeatureId = (feature: MapGeoJSONFeature) => {
      if (feature.id !== undefined && feature.id !== null) {
        return feature.id;
      }

      if (promoteId && feature.properties) {
        return feature.properties[promoteId] as string | number | undefined;
      }

      return null;
    };

    const setHoverLayerFilter = (featureId: string | number | null) => {
      if (!fillHoverPaint || !map.getLayer(hoverLayerId)) {
        return;
      }

      map.setFilter(
        hoverLayerId,
        featureId === null ? ["==", ["id"], ""] : ["==", ["id"], featureId],
      );
    };

    const handleMouseMove = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0] as MapFeature | undefined;
      if (!feature) {
        return;
      }

      const featureId = getFeatureId(feature) ?? null;
      hoveredFeatureIdRef.current = featureId;
      setHoverLayerFilter(featureId);
      map.getCanvas().style.cursor = interactive ? "pointer" : "";
      onHover?.({ feature, rawEvent: event });
    };

    const handleMouseLeave = () => {
      hoveredFeatureIdRef.current = null;
      setHoverLayerFilter(null);
      map.getCanvas().style.cursor = "";
      onHover?.(null);
    };

    const handleClick = (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0] as MapFeature | undefined;
      if (!feature) {
        return;
      }

      onClick?.({ feature, rawEvent: event });
    };

    if (interactive) {
      map.on("mousemove", fillLayerId, handleMouseMove);
      map.on("mouseleave", fillLayerId, handleMouseLeave);
      map.on("click", fillLayerId, handleClick);
    }

    return () => {
      map.off("styledata", ensureLayers);

      if (interactive) {
        map.off("mousemove", fillLayerId, handleMouseMove);
        map.off("mouseleave", fillLayerId, handleMouseLeave);
        map.off("click", fillLayerId, handleClick);
      }

      if (map.getLayer(lineLayerId)) {
        map.removeLayer(lineLayerId);
      }
      if (map.getLayer(hoverLayerId)) {
        map.removeLayer(hoverLayerId);
      }
      if (map.getLayer(fillLayerId)) {
        map.removeLayer(fillLayerId);
      }
      if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
      }
    };
  }, [
    context?.isReady,
    context?.map,
    data,
    fillHoverPaint,
    fillLayerId,
    fillPaint,
    hoverLayerId,
    interactive,
    lineLayerId,
    linePaint,
    onClick,
    onHover,
    promoteId,
    sourceId,
  ]);

  return null;
}

export { MarkerContent, MarkerPopup as MapMarkerPopup };
