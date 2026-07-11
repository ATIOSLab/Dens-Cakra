"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type LngLat = [number, number];

type MapStyles = {
  light?: string;
  dark?: string;
};

type MapProps = {
  center?: LngLat;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  styles?: MapStyles;
  className?: string;
  children?: React.ReactNode;
  onMapReady?: (map: any) => void;
};

export type MapRef = {
  easeTo: (options: any) => void;
  getMap: () => any;
  resize: () => void;
};

export const Map = forwardRef<MapRef, MapProps>(function Map(
  { center = [106.8166, -6.2], zoom = 13, className, children, onMapReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  useImperativeHandle(
    ref,
    () => ({
      easeTo: (options) => {
        const map = mapRef.current;
        if (!map) return;
        if (options.center) {
          map.flyTo([options.center[1], options.center[0]], options.zoom ?? map.getZoom(), {
            duration: (options.duration ?? 800) / 1000,
          });
        } else if (options.zoom !== undefined) {
          map.setZoom(options.zoom, { animate: true });
        }
      },
      getMap: () => mapRef.current,
      resize: () => {
        const map = mapRef.current;
        if (map) {
          map.invalidateSize();
          map.fire("move");
        }
      },
    }),
    [],
  );

  // Load Leaflet assets from CDN
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    let cssLoaded = false;
    let jsLoaded = false;

    const checkLoaded = () => {
      if (cssLoaded && jsLoaded) {
        setLeafletLoaded(true);
      }
    };

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "";
    link.onload = () => {
      cssLoaded = true;
      checkLoaded();
    };
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.crossOrigin = "";
    script.onload = () => {
      jsLoaded = true;
      checkLoaded();
    };
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !containerRef.current || mapRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    // Initialize Leaflet map
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    // Ensure Leaflet registers the container size immediately
    map.invalidateSize();

    // Set view to the correct center and zoom
    map.setView([center[1], center[0]], zoom);

    // Add openstreetmap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Mock MapLibre GL API to keep compatibility with parent components
    const mockedMap = {
      getZoom: () => map.getZoom(),
      project: (lngLat: [number, number]) => {
        try {
          const point = map.latLngToContainerPoint([lngLat[1], lngLat[0]]);
          return { x: point.x, y: point.y };
        } catch (e) {
          return { x: 0, y: 0 };
        }
      },
      on: (event: string, callback: any) => {
        if (event === "zoom") {
          map.on("zoomend", callback);
        } else if (event === "move") {
          map.on("move", callback);
          map.on("moveend", callback);
        } else {
          map.on(event, callback);
        }
      },
      off: (event: string, callback: any) => {
        if (event === "zoom") {
          map.off("zoomend", callback);
        } else if (event === "move") {
          map.off("move", callback);
          map.off("moveend", callback);
        } else {
          map.off(event, callback);
        }
      },
      easeTo: (options: any) => {
        if (options.center) {
          map.flyTo([options.center[1], options.center[0]], options.zoom ?? map.getZoom(), {
            duration: (options.duration ?? 800) / 1000,
          });
        } else if (options.zoom !== undefined) {
          map.setZoom(options.zoom, { animate: true });
        }
      },
      getPitch: () => 0,
      getBearing: () => 0,
      resize: () => {
        map.invalidateSize();
        map.fire("move");
      },
    };

    mapRef.current = map;

    // Call onMapReady with the mocked map
    onMapReady?.(mockedMap as any);

    // Set a short timeout to force a second invalidateSize, reset center/zoom, and redraw
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.setView([center[1], center[0]], zoom, { animate: false });
      map.fire("move");
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
      map.fire("move");
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [leafletLoaded]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-slate-50 dark:bg-zinc-900", className)}>
      <div ref={containerRef} className="absolute inset-0 z-0" />
      {children ? <div className="pointer-events-none absolute inset-0 z-10">{children}</div> : null}
    </div>
  );
});
