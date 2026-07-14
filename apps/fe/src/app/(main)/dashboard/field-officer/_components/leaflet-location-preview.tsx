"use client";

import { useEffect, useRef } from "react";

type LeafletLocationPreviewProps = {
  latitude: number;
  longitude: number;
  title: string;
};

export function LeafletLocationPreview({ latitude, longitude, title }: LeafletLocationPreviewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let map: import("leaflet").Map | null = null;

    async function mount() {
      if (!containerRef.current) {
        return;
      }

      const L = await import("leaflet");
      if (!containerRef.current) {
        return;
      }
      const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id) {
        container.innerHTML = "";
        delete container._leaflet_id;
      }

      map = L.map(container, {
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
      }).setView([latitude, longitude], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: "dc-leaflet-location-pin",
        html: '<span class="dc-leaflet-location-pin__body"><span class="dc-leaflet-location-pin__dot"></span></span>',
        iconAnchor: [16, 40],
        iconSize: [32, 40],
        popupAnchor: [0, -36],
      });

      L.marker([latitude, longitude], { icon: pinIcon })
        .addTo(map)
        .bindPopup(title);
    }

    void mount();

    return () => {
      map?.remove();
    };
  }, [latitude, longitude, title]);

  return <div ref={containerRef} className="h-36 w-full overflow-hidden rounded-lg border border-white/10" />;
}
