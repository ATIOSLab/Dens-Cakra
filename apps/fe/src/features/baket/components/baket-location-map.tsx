"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ExternalLink, MapPin } from "lucide-react";

import { MapControls, MapMarker, MapMarkerPopup, type MapRef, Map as MapView } from "@/components/ui/map";

const MAP_STYLES = {
  default: undefined,
  openstreetmap: "https://tiles.openfreemap.org/styles/bright",
  openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
} as const;

type StyleKey = keyof typeof MAP_STYLES;

type BaketLocationMapProps = {
  latitude: number;
  longitude: number;
  title: string;
  areaLabel: string;
  urgency?: string | null;
};

const urgencyMarkerTone: Record<string, string> = {
  LOW: "bg-blue-600",
  NORMAL: "bg-green-600",
  HIGH: "bg-yellow-500 text-slate-950",
  URGENT: "bg-red-600",
};

const urgencyLabel: Record<string, string> = {
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Darurat",
};

export function BaketLocationMap({ latitude, longitude, title, areaLabel, urgency }: BaketLocationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [style, setStyle] = useState<StyleKey>("default");
  const normalizedUrgency = (urgency ?? "NORMAL").toUpperCase();
  const markerTone = urgencyMarkerTone[normalizedUrgency] ?? urgencyMarkerTone.NORMAL;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const center = useMemo<[number, number]>(() => [longitude, latitude], [latitude, longitude]);
  const selectedStyle = MAP_STYLES[style];
  const styles = useMemo(
    () => (selectedStyle ? { light: selectedStyle, dark: selectedStyle } : undefined),
    [selectedStyle],
  );
  const is3D = style === "openstreetmap3d";

  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, duration: 500 });
  }, [is3D]);

  return (
    <section className="relative h-[420px] w-full" aria-label={`Peta lokasi ${title} di ${areaLabel}`}>
      <MapView ref={mapRef} center={center} zoom={15} pitch={is3D ? 60 : 0} styles={styles}>
        <MapControls showZoom showCompass showFullscreen position="top-left" />
        <MapMarker longitude={longitude} latitude={latitude}>
          <button
            type="button"
            className={`grid size-10 place-items-center rounded-full border-[3px] border-white text-white shadow-[0_5px_16px_rgba(15,23,42,0.45)] ${markerTone}`}
            aria-label={`Lokasi ${title}, urgensi ${urgencyLabel[normalizedUrgency] ?? normalizedUrgency}`}
          >
            <MapPin className="size-5" />
          </button>
          <MapMarkerPopup className="min-w-72 rounded-[6px] border border-[var(--dc-border-subtle)] bg-popover p-4 text-popover-foreground shadow-xl">
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 size-3 shrink-0 rounded-full ring-2 ring-white ${markerTone}`} />
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{title}</p>
                <p className="mt-1 text-muted-foreground text-xs">{areaLabel}</p>
                <p className="mt-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
                  Urgensi: {urgencyLabel[normalizedUrgency] ?? normalizedUrgency}
                </p>
              </div>
            </div>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-[4px] bg-primary px-3 font-semibold text-primary-foreground text-xs hover:brightness-110"
            >
              <ExternalLink className="size-4" />
              Buka di Google Maps
            </a>
          </MapMarkerPopup>
        </MapMarker>
      </MapView>

      <div className="absolute top-2 right-2 z-10">
        <label className="sr-only" htmlFor="baket-map-style">
          Gaya peta
        </label>
        <select
          id="baket-map-style"
          value={style}
          onChange={(event) => setStyle(event.target.value as StyleKey)}
          className="rounded-md border bg-background px-2 py-1.5 text-foreground text-sm shadow"
        >
          <option value="default">Default (Carto)</option>
          <option value="openstreetmap">OpenStreetMap</option>
          <option value="openstreetmap3d">OpenStreetMap 3D</option>
        </select>
      </div>
    </section>
  );
}
