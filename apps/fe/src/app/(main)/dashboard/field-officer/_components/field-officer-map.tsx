"use client";

import { MapControls, MapMarker, Map as MapView, MarkerContent, MarkerPopup } from "@/components/ui/map";

type FieldOfficerMapPoint = {
  id: string;
  kind: "incoming" | "self";
  latitude: number;
  longitude: number;
  title: string;
  subtitle: string;
};

export function FieldOfficerMap({ center, points }: { center: [number, number]; points: FieldOfficerMapPoint[] }) {
  return (
    <MapView className="h-[28rem]" center={center} zoom={7}>
      {points.map((point) => (
        <MapMarker key={point.id} longitude={point.longitude} latitude={point.latitude}>
          <MarkerContent>
            <div
              className={`flex size-4 items-center justify-center rounded-full border-2 ${
                point.kind === "self"
                  ? "border-[var(--tactical-card-bg)] bg-[var(--tactical-blue)]"
                  : "border-[var(--tactical-card-bg)] bg-[var(--tactical-green)]"
              }`}
            />
          </MarkerContent>
          <MarkerPopup>
            <div className="space-y-1 p-1 font-mono text-sm">
              <p className="font-semibold">{point.title}</p>
              <p className="text-[var(--tactical-text-secondary)] text-xs">{point.subtitle}</p>
              <p className="text-[10px] text-[var(--tactical-text-muted)]">
                {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
              </p>
            </div>
          </MarkerPopup>
        </MapMarker>
      ))}
      <MapControls showZoom showLocate position="bottom-right" />
    </MapView>
  );
}
