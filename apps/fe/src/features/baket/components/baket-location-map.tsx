"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MapPin } from "lucide-react";

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
};

export function BaketLocationMap({ latitude, longitude, title, areaLabel }: BaketLocationMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [style, setStyle] = useState<StyleKey>("default");
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
            className="grid size-9 place-items-center rounded-full border-2 border-white bg-red-600 text-white shadow-lg"
            aria-label={`Lokasi ${title}`}
          >
            <MapPin className="size-5" />
          </button>
          <MapMarkerPopup className="min-w-64 rounded-lg p-3">
            <p className="font-medium">{title}</p>
            <p className="mt-1 text-muted-foreground text-xs">{areaLabel}</p>
            <p className="mt-2 text-muted-foreground text-xs">
              {latitude}, {longitude}
            </p>
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
