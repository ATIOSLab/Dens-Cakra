"use client";

import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MapControls, MapMarker, MapMarkerPopup, Map as MapView } from "@/components/ui/map";

type LaporanJaringLocationMapProps = {
  latitude: number;
  longitude: number;
  title: string;
  areaLabel: string;
  capturedAt?: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "Tidak tercatat";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "Tidak tercatat";
  }
}

export function LaporanJaringLocationMap({
  latitude,
  longitude,
  title,
  areaLabel,
  capturedAt,
}: LaporanJaringLocationMapProps) {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  return (
    <section
      className="h-[min(22rem,52svh)] min-h-72 w-full overflow-hidden rounded-[var(--dc-radius-lg)] border"
      aria-label={`Peta lokasi pembuatan laporan ${title} di ${areaLabel}`}
    >
      <MapView center={[longitude, latitude]} zoom={16}>
        <MapControls position="top-right" showZoom showCompass showFullscreen />
        <MapMarker latitude={latitude} longitude={longitude} pulse="normal">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg"
            aria-label={`Lokasi pembuatan laporan ${title}`}
          >
            <MapPin className="size-5" />
          </button>
          <MapMarkerPopup className="min-w-72 rounded-lg border bg-popover p-4 text-popover-foreground shadow-xl">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-semibold leading-snug">{title}</p>
                <p className="text-xs text-muted-foreground">{areaLabel}</p>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-muted-foreground">Latitude</dt>
                  <dd className="font-mono font-medium">{latitude}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Longitude</dt>
                  <dd className="font-mono font-medium">{longitude}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Lokasi direkam</dt>
                  <dd className="font-medium">{formatDateTime(capturedAt)}</dd>
                </div>
              </dl>
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink data-icon="inline-start" />
                  Buka di Google Maps
                </a>
              </Button>
            </div>
          </MapMarkerPopup>
        </MapMarker>
      </MapView>
    </section>
  );
}
