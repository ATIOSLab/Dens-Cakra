"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const INDONESIA_GEOJSON =
  "https://raw.githubusercontent.com/superpikar/indonesia-geojson/master/indonesia-province.json";

// Dark map style (no tile service needed — we use a blank style + our own GeoJSON)
const BLANK_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: "Dens Cakra Dark",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#090E17",
      },
    },
  ],
};

interface HoveredProvince {
  name: string;
  lng: number;
  lat: number;
}

export default function MapIndonesia() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const hoveredStateId = useRef<string | number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: BLANK_DARK_STYLE,
      center: [118, -2],
      zoom: 4.2,
      minZoom: 3,
      maxZoom: 10,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });

    // Add navigation controls
    m.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right"
    );

    m.on("load", () => {
      // Add Indonesia GeoJSON source
      m.addSource("indonesia-provinces", {
        type: "geojson",
        data: INDONESIA_GEOJSON,
        generateId: true,
      });

      // Province fill layer
      m.addLayer({
        id: "provinces-fill",
        type: "fill",
        source: "indonesia-provinces",
        paint: {
          "fill-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#1e3a5f", // hover color
            "#0b1329", // default fill
          ],
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.9,
            0.7,
          ],
        },
      });

      // Province border layer
      m.addLayer({
        id: "provinces-border",
        type: "line",
        source: "indonesia-provinces",
        paint: {
          "line-color": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            "#0ea5e9",
            "#1e293b",
          ],
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            2,
            0.8,
          ],
        },
      });

      // Province glow on hover
      m.addLayer({
        id: "provinces-glow",
        type: "line",
        source: "indonesia-provinces",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 6,
          "line-blur": 8,
          "line-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false],
            0.4,
            0,
          ],
        },
      });

      setMapLoaded(true);
    });

    // Hover interaction
    m.on("mousemove", "provinces-fill", (e) => {
      if (e.features && e.features.length > 0) {
        // Remove previous hover state
        if (hoveredStateId.current !== null) {
          m.setFeatureState(
            { source: "indonesia-provinces", id: hoveredStateId.current },
            { hover: false }
          );
        }

        const feature = e.features[0];
        hoveredStateId.current = feature.id ?? null;

        if (hoveredStateId.current !== null) {
          m.setFeatureState(
            { source: "indonesia-provinces", id: hoveredStateId.current },
            { hover: true }
          );
        }

        // Update tooltip
        const provinceName =
          (feature.properties?.state as string) ||
          (feature.properties?.name as string) ||
          "Unknown";
        setHoveredProvince(provinceName);

        // Show popup
        if (popupRef.current) {
          popupRef.current.remove();
        }
        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: "dens-cakra-popup",
          offset: 15,
        })
          .setLngLat(e.lngLat)
          .setHTML(
            `<div style="
              background: rgba(5, 10, 16, 0.95);
              border: 1px solid #1e293b;
              border-radius: 8px;
              padding: 10px 14px;
              color: #e2e8f0;
              font-family: ui-monospace, monospace;
              font-size: 11px;
              letter-spacing: 0.08em;
              backdrop-filter: blur(8px);
              box-shadow: 0 0 20px rgba(14, 165, 233, 0.15);
            ">
              <div style="color: #0ea5e9; font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px; font-weight: 700;">PROVINSI</div>
              <div style="font-weight: 600; font-size: 12px;">${provinceName}</div>
              <div style="color: #64748b; font-size: 9px; margin-top: 6px; border-top: 1px solid #1e293b; padding-top: 6px;">DATA: BELUM TERSEDIA</div>
            </div>`
          )
          .addTo(m);

        m.getCanvas().style.cursor = "pointer";
      }
    });

    m.on("mouseleave", "provinces-fill", () => {
      if (hoveredStateId.current !== null) {
        m.setFeatureState(
          { source: "indonesia-provinces", id: hoveredStateId.current },
          { hover: false }
        );
      }
      hoveredStateId.current = null;
      setHoveredProvince(null);

      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      m.getCanvas().style.cursor = "";
    });

    // Click interaction — zoom into province
    m.on("click", "provinces-fill", (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        // Get bounds
        if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
          const bounds = new maplibregl.LngLatBounds();
          const coords =
            feature.geometry.type === "Polygon"
              ? feature.geometry.coordinates
              : feature.geometry.coordinates.flat();
          coords.forEach((ring: any) => {
            ring.forEach((coord: [number, number]) => {
              bounds.extend(coord);
            });
          });
          m.fitBounds(bounds, { padding: 60, duration: 800 });
        }
      }
    });

    map.current = m;

    return () => {
      if (popupRef.current) popupRef.current.remove();
      m.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: "450px" }}
      />

      {/* Loading state */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#090E17] z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-[10px] text-cyan-400 tracking-[0.2em] uppercase font-mono animate-pulse">
              Memuat Peta Operasi...
            </span>
          </div>
        </div>
      )}

      {/* Custom popup styles (injected) */}
      <style jsx global>{`
        .maplibregl-popup-content {
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }
        .maplibregl-popup-tip {
          display: none !important;
        }
        .maplibregl-ctrl-group {
          background: rgba(5, 10, 16, 0.9) !important;
          border: 1px solid #1e293b !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .maplibregl-ctrl-group button {
          background: transparent !important;
          border-color: #1e293b !important;
        }
        .maplibregl-ctrl-group button:hover {
          background: rgba(14, 165, 233, 0.1) !important;
        }
        .maplibregl-ctrl-group button + button {
          border-top: 1px solid #1e293b !important;
        }
        .maplibregl-ctrl-group button .maplibregl-ctrl-icon {
          filter: invert(1) brightness(0.7);
        }
        .maplibregl-ctrl-group button:hover .maplibregl-ctrl-icon {
          filter: invert(1) brightness(1);
        }
      `}</style>
    </div>
  );
}
