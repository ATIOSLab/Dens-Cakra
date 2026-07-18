"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, Crosshair, ExternalLink, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type PersonnelFeature = {
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  properties: {
    assignmentId: string;
    capturedAt: string | null;
    hasLiveLocation: boolean;
    areaName: string | null;
    userName: string;
    positionTitle: string;
    unitName: string;
    supervisorName: string | null;
    supervisorPositionTitle: string | null;
    supervisorUnitName: string | null;
  };
};

type PersonnelLocationMapResponse = {
  type: "FeatureCollection";
  features: PersonnelFeature[];
};

const LIVE_THRESHOLD_MS = 5 * 60 * 1000;

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function locationStatus(feature: PersonnelFeature) {
  if (!feature.properties.hasLiveLocation || !feature.properties.capturedAt) {
    return { label: "NO_DATA", className: "bg-red-500/15 text-red-100 border-red-400/35" };
  }

  const capturedAt = feature.properties.capturedAt;
  const age = Date.now() - new Date(capturedAt).getTime();

  if (age <= LIVE_THRESHOLD_MS) {
    return { label: "LIVE", className: "bg-emerald-500/15 text-emerald-100 border-emerald-400/35" };
  }

  return { label: "OFFLINE", className: "bg-yellow-500/15 text-yellow-100 border-yellow-400/35" };
}

export function LivePersonnelMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerRefs = useRef<Map<string, import("leaflet").Layer>>(new Map());
  const hasFitInitialBoundsRef = useRef(false);
  const [data, setData] = useState<PersonnelLocationMapResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMap = async () => {
    setError(null);
    const response = await fetch("/api/field-officer/personnel-location-map");

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || "Gagal membaca lokasi personel.");
    }

    setData((await response.json()) as PersonnelLocationMapResponse);
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await fetchMap();
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Gagal membaca lokasi personel.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();
    const interval = window.setInterval(() => void run(), 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let removed = false;

    async function mount() {
      if (!containerRef.current || mapRef.current) {
        return;
      }

      const L = await import("leaflet");
      if (removed || !containerRef.current) {
        return;
      }
      const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id) {
        container.innerHTML = "";
        delete container._leaflet_id;
      }

      mapRef.current = L.map(container, {
        zoomControl: true,
      }).setView([0.5071, 101.4478], 12);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapRef.current);

      layerRef.current = L.layerGroup().addTo(mapRef.current);
    }

    void mount();

    return () => {
      removed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function renderMarkers() {
      if (!mapRef.current || !layerRef.current || !data) {
        return;
      }

      const L = await import("leaflet");
      layerRef.current.clearLayers();
      markerRefs.current.clear();

      const bounds: Array<[number, number]> = [];
      for (const feature of data.features) {
        if (!feature.geometry) {
          continue;
        }
        const [longitude, latitude] = feature.geometry.coordinates;
        const status = locationStatus(feature);
        const color = status.label === "LIVE" ? "#22c55e" : status.label === "NO_DATA" ? "#ef4444" : "#eab308";
        const marker =
          status.label === "NO_DATA"
            ? L.marker([latitude, longitude], {
                icon: L.divIcon({
                  className: "",
                  html: '<div style="width:22px;height:22px;border:2px solid #fecaca;background:#7f1d1d;color:#fecaca;border-radius:999px;display:flex;align-items:center;justify-content:center;font-weight:800;line-height:1;">×</div>',
                  iconSize: [22, 22],
                  iconAnchor: [11, 11],
                }),
              })
            : L.circleMarker([latitude, longitude], {
                radius: 9,
                color: "#ffffff",
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2,
              });

        marker.bindPopup(`
          <strong>${feature.properties.userName}</strong><br />
          ${feature.properties.positionTitle}<br />
          ${feature.properties.unitName}<br />
          Area: ${feature.properties.areaName ?? "-"}<br />
          Atasan: ${feature.properties.supervisorName ?? "-"}<br />
          Jabatan atasan: ${feature.properties.supervisorPositionTitle ?? "-"}<br />
          Unit atasan: ${feature.properties.supervisorUnitName ?? "-"}<br />
          Status: ${status.label === "LIVE" ? "LIVE (hijau)" : status.label === "OFFLINE" ? "OFFLINE (kuning)" : "BELUM ADA DATA"}<br />
          Last GPS: ${formatDateTime(feature.properties.capturedAt)}<br />
          Koordinat: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}
        `);
        marker.addTo(layerRef.current);
        markerRefs.current.set(feature.properties.assignmentId, marker);
        bounds.push([latitude, longitude]);
      }

      if (bounds.length > 0 && !hasFitInitialBoundsRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
        hasFitInitialBoundsRef.current = true;
      }
    }

    void renderMarkers();
  }, [data]);

  const features = useMemo(() => data?.features ?? [], [data]);

  const focusPersonnel = (feature: PersonnelFeature) => {
    if (!feature.geometry || !mapRef.current) {
      return;
    }

    const [longitude, latitude] = feature.geometry.coordinates;
    mapRef.current.setView([latitude, longitude], 16, { animate: true });
    markerRefs.current.get(feature.properties.assignmentId)?.openPopup?.();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-50">
          <AlertTriangle className="size-4" />
          <AlertTitle>Peta belum dapat dimuat</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Peta Tugas Live</CardTitle>
            <CardDescription className="text-white/65">
              Lokasi terbaru Field Officer dari ping GPS perangkat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                <span className="size-2.5 rounded-full bg-green-500" />
                Live: kirim lokasi {"<="} 5 menit
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                <span className="size-2.5 rounded-full bg-yellow-500" />
                Offline: tidak kirim lokasi {">"} 5 menit
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                <span className="size-2.5 rounded-full bg-red-500" />
                Belum ada data
              </span>
            </div>
            <div
              ref={containerRef}
              className="h-[34rem] overflow-hidden rounded-lg border border-white/10 bg-black/20"
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Crosshair className="size-4 text-cyan-300" />
              Personel
            </CardTitle>
            <CardDescription className="text-white/65">Auto-refresh tiap 15 detik.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              disabled={isLoading}
              onClick={() => {
                hasFitInitialBoundsRef.current = false;
                setIsLoading(true);
                void fetchMap().finally(() => setIsLoading(false));
              }}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>

            <div className="space-y-2">
              {features.map((feature) => {
                if (!feature.geometry) {
                  return null;
                }
                const [longitude, latitude] = feature.geometry.coordinates;
                const status = locationStatus(feature);

                return (
                  <div
                    key={feature.id}
                    className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-white/75 hover:bg-white/10"
                  >
                    <button className="w-full text-left" type="button" onClick={() => focusPersonnel(feature)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{feature.properties.userName}</p>
                          <p className="text-xs text-white/55">{feature.properties.positionTitle}</p>
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-white/55">
                        {feature.properties.areaName || feature.properties.unitName}
                      </p>
                      <p className="mt-1 text-xs text-white/55">
                        Atasan: {feature.properties.supervisorName || feature.properties.supervisorPositionTitle || "-"}
                      </p>
                      <p className="mt-1 font-mono text-xs text-white/60">
                        {latitude.toFixed(5)}, {longitude.toFixed(5)}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Last GPS: {formatDateTime(feature.properties.capturedAt)}
                      </p>
                    </button>
                    <Button
                      asChild
                      className="mt-3 h-8 w-full border-white/10 bg-white/10 text-white hover:bg-white/15"
                      size="sm"
                      variant="outline"
                    >
                      <a
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <ExternalLink className="mr-2 size-3.5" />
                        Open in Maps
                      </a>
                    </Button>
                  </div>
                );
              })}

              {!isLoading && features.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-white/60">
                  Belum ada ping lokasi Field Officer dalam 24 jam terakhir.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
