"use client";

import { useEffect, useRef } from "react";

type BaketLocationMapProps = {
  latitude: number;
  longitude: number;
  title: string;
  areaLabel: string;
};

export function BaketLocationMap({ latitude, longitude, title, areaLabel }: BaketLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    async function mountMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id) {
        container.innerHTML = "";
        delete container._leaflet_id;
      }

      map = L.map(container, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView([latitude, longitude], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const popupContent = document.createElement("div");
      const popupTitle = document.createElement("strong");
      popupTitle.textContent = title;
      popupContent.append(popupTitle, document.createElement("br"), document.createTextNode(areaLabel));

      L.circleMarker([latitude, longitude], {
        color: "#ffffff",
        fillColor: "#dc2626",
        fillOpacity: 1,
        radius: 9,
        weight: 3,
      })
        .addTo(map)
        .bindPopup(popupContent);

      window.requestAnimationFrame(() => map?.invalidateSize());
    }

    void mountMap();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [areaLabel, latitude, longitude, title]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full"
      role="img"
      aria-label={`Peta lokasi ${title} di ${areaLabel}`}
    />
  );
}
