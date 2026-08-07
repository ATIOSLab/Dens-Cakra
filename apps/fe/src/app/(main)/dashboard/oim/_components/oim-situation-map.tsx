"use client";

import { useCallback, useRef, useState } from "react";

import Link from "next/link";

import { MapPin } from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";

import {
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapMarkerPopup,
  type MapViewport,
  Map as SituationMapCanvas,
} from "@/components/ui/map";
import { apiBrowserFetch } from "@/lib/api/browser-client";

type Feature = {
  id?: string;
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

const DEFAULT_CENTER: [number, number] = [117, -2.5];
const EMPTY_COLLECTION: FeatureCollection = { type: "FeatureCollection", features: [] };

function getGeoJsonBounds(value: unknown): [[number, number], [number, number]] | null {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  const visit = (node: unknown) => {
    if (Array.isArray(node)) {
      if (typeof node[0] === "number" && typeof node[1] === "number") {
        minLng = Math.min(minLng, node[0]);
        minLat = Math.min(minLat, node[1]);
        maxLng = Math.max(maxLng, node[0]);
        maxLat = Math.max(maxLat, node[1]);
        return;
      }
      for (const child of node) visit(child);
      return;
    }
    if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (record.coordinates) visit(record.coordinates);
      if (record.geometry) visit(record.geometry);
      if (record.features) visit(record.features);
    }
  };
  visit(value);
  return Number.isFinite(minLng)
    ? [
        [minLng, minLat],
        [maxLng, maxLat],
      ]
    : null;
}

export function OimSituationMap({ reports, boundaries }: { reports?: unknown; boundaries?: unknown }) {
  const [reportCollection, setReportCollection] = useState((reports ?? EMPTY_COLLECTION) as FeatureCollection);
  const [boundaryCollection, setBoundaryCollection] = useState((boundaries ?? EMPTY_COLLECTION) as GeoJSON.GeoJSON);
  const mapRef = useRef<MapLibreMap | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshViewport = useCallback((viewport: MapViewport) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const map = mapRef.current;
      if (!map) return;
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
        .map((value) => value.toFixed(5))
        .join(",");
      const zoom = Math.max(3, Math.round(viewport.zoom));
      const params = new URLSearchParams(window.location.search);
      params.set("bbox", bbox);
      params.set("zoom", String(zoom));
      window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);

      try {
        const [nextReports, nextBoundaries] = await Promise.all([
          apiBrowserFetch<FeatureCollection>(zoom < 8 ? "/map/clusters" : "/map/reports", {
            query: { bbox, zoom, limit: 1000 },
          }),
          apiBrowserFetch<GeoJSON.GeoJSON>("/map/boundaries", {
            query: { bbox, zoom, limit: 1000 },
          }),
        ]);
        setReportCollection(nextReports);
        setBoundaryCollection(nextBoundaries);
      } catch {
        // Keep the last successful viewport data visible during a transient request failure.
      }
    }, 350);
  }, []);

  return (
    <div className="h-[min(35rem,65svh)] min-h-[28rem] overflow-hidden rounded-[var(--dc-radius-lg)] border bg-muted/30">
      <SituationMapCanvas
        center={DEFAULT_CENTER}
        zoom={4.5}
        minZoom={3}
        maxZoom={18}
        onMapReady={(map) => {
          mapRef.current = map;
          const scopeBounds = getGeoJsonBounds(boundaryCollection);
          if (scopeBounds) map.fitBounds(scopeBounds, { padding: 40, maxZoom: 7, duration: 0 });
        }}
        onViewportChange={refreshViewport}
      >
        <MapControls showZoom showCompass showFullscreen position="top-right" />
        <MapGeoJSON
          data={boundaryCollection}
          fillPaint={{ "fill-color": "rgba(14,116,144,.12)", "fill-opacity": 1 }}
          linePaint={{ "line-color": "rgba(14,116,144,.8)", "line-width": 1.25 }}
        />
        {reportCollection.features.map((feature) => {
          const coordinates = feature.geometry?.coordinates;
          if (!coordinates) return null;
          const properties = feature.properties ?? {};
          const count = Number(properties.count ?? 0);
          const urgency = String(properties.urgency ?? "NORMAL");
          const markerId = String(feature.id ?? properties.clusterId ?? properties.baketId);

          if (count > 0) {
            return (
              <MapMarker key={markerId} longitude={coordinates[0]} latitude={coordinates[1]}>
                <button
                  type="button"
                  className="grid size-10 place-items-center rounded-full border-2 border-background bg-slate-900 text-xs font-semibold text-white shadow-lg"
                  aria-label={`Klaster ${count} Baket`}
                >
                  {count}
                </button>
              </MapMarker>
            );
          }

          return (
            <MapMarker key={markerId} longitude={coordinates[0]} latitude={coordinates[1]}>
              <button
                type="button"
                className={`grid size-8 place-items-center rounded-full border-2 border-background text-white shadow-lg ${urgency === "URGENT" ? "bg-red-600" : urgency === "HIGH" ? "bg-amber-600" : "bg-cyan-700"}`}
                aria-label={`Baket ${String(properties.title ?? "tanpa judul")}`}
              >
                <MapPin className="size-4" />
              </button>
              <MapMarkerPopup className="min-w-64 rounded-lg p-3">
                <p className="font-medium">{String(properties.title ?? "Baket")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {String(properties.areaName ?? "Wilayah belum teridentifikasi")} · {String(properties.status ?? "-")}
                </p>
                <Link
                  className="mt-3 inline-block text-xs font-medium text-primary underline"
                  href={`/dashboard/oim/peta-situasi/baket/${String(properties.baketId)}`}
                >
                  Buka detail
                </Link>
              </MapMarkerPopup>
            </MapMarker>
          );
        })}
      </SituationMapCanvas>
    </div>
  );
}
