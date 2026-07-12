"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, FileText, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FieldOfficerIncoming, FieldOfficerWorkspace } from "@/server/field-ops/types";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function mapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

export function PetaLaporanMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerRefs = useRef<Map<string, import("leaflet").Layer>>(new Map());
  const hasFitInitialBoundsRef = useRef(false);
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reports = useMemo(
    () =>
      (workspace?.incoming ?? []).filter(
        (item) => typeof item.latitude === "number" && typeof item.longitude === "number",
      ),
    [workspace],
  );

  const fetchWorkspace = async () => {
    setError(null);
    const response = await fetch("/api/field-officer/workspace", { cache: "no-store" });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message || "Gagal membaca laporan jaring.");
    }

    setWorkspace((await response.json()) as FieldOfficerWorkspace);
  };

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await fetchWorkspace();
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Gagal membaca laporan jaring.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
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

      mapRef.current = L.map(container, { zoomControl: true }).setView([0.5071, 101.4478], 12);

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
      if (!mapRef.current || !layerRef.current) {
        return;
      }

      const L = await import("leaflet");
      layerRef.current.clearLayers();
      markerRefs.current.clear();

      const bounds: Array<[number, number]> = [];
      for (const report of reports) {
        if (report.latitude === null || report.longitude === null) {
          continue;
        }

        const marker = L.circleMarker([report.latitude, report.longitude], {
          radius: 9,
          color: "#ffffff",
          fillColor: "#38bdf8",
          fillOpacity: 0.92,
          weight: 2,
        });

        marker.bindPopup(`
          <strong>${report.title ?? "Laporan Jaring"}</strong><br />
          Jaring: ${report.jaringAlias} (${report.jaringCode})<br />
          Area: ${report.areaName ?? "-"}<br />
          Kategori: ${report.categoryName ?? "-"}<br />
          Status: ${report.status}<br />
          Waktu laporan: ${formatDateTime(report.reportTimestamp ?? report.receivedAt)}<br />
          Koordinat: ${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}
        `);
        marker.addTo(layerRef.current);
        markerRefs.current.set(report.id, marker);
        bounds.push([report.latitude, report.longitude]);
      }

      if (bounds.length > 0 && !hasFitInitialBoundsRef.current) {
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
        hasFitInitialBoundsRef.current = true;
      }
    }

    void renderMarkers();
  }, [reports]);

  const focusReport = (report: FieldOfficerIncoming) => {
    if (report.latitude === null || report.longitude === null || !mapRef.current) {
      return;
    }

    mapRef.current.setView([report.latitude, report.longitude], 16, { animate: true });
    markerRefs.current.get(report.id)?.openPopup?.();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-50">
          <AlertTriangle className="size-4" />
          <AlertTitle>Peta laporan belum dapat dimuat</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Peta Laporan</CardTitle>
            <CardDescription className="text-white/65">
              Lokasi laporan dari jaring binaan Field Officer yang sedang login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                <span className="size-2.5 rounded-full bg-sky-400" />
                Laporan dengan koordinat
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                Scope: {workspace?.profile.name ?? "Field Officer"}
              </span>
            </div>
            <div ref={containerRef} className="h-[34rem] overflow-hidden rounded-lg border border-white/10 bg-black/20" />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-cyan-300" />
              Laporan
            </CardTitle>
            <CardDescription className="text-white/65">
              Hanya laporan dari jaring binaan Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              disabled={isLoading}
              onClick={() => {
                hasFitInitialBoundsRef.current = false;
                setIsLoading(true);
                void fetchWorkspace().finally(() => setIsLoading(false));
              }}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>

            <div className="space-y-2">
              {reports.map((report) => {
                if (report.latitude === null || report.longitude === null) {
                  return null;
                }

                return (
                  <div key={report.id} className="rounded-lg border border-white/10 bg-black/15 p-3 text-sm text-white/75 hover:bg-white/10">
                    <button className="w-full text-left" type="button" onClick={() => focusReport(report)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-white">{report.title || "Laporan Jaring"}</p>
                          <p className="text-xs text-white/55">
                            {report.jaringAlias} ({report.jaringCode})
                          </p>
                        </div>
                        <Badge className="border-sky-400/35 bg-sky-500/15 text-sky-100">{report.status}</Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-white/60">{report.content || "-"}</p>
                      <p className="mt-2 text-xs text-white/55">Area: {report.areaName || "-"}</p>
                      <p className="mt-1 text-xs text-white/55">Kategori: {report.categoryName || "-"}</p>
                      <p className="mt-1 font-mono text-xs text-white/60">
                        {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                      </p>
                      <p className="mt-1 text-xs text-white/45">
                        Waktu: {formatDateTime(report.reportTimestamp ?? report.receivedAt)}
                      </p>
                    </button>
                    <Button
                      asChild
                      className="mt-3 h-8 w-full border-white/10 bg-white/10 text-white hover:bg-white/15"
                      size="sm"
                      variant="outline"
                    >
                      <a href={mapsUrl(report.latitude, report.longitude)} rel="noreferrer" target="_blank">
                        <ExternalLink className="mr-2 size-3.5" />
                        Open in Maps
                      </a>
                    </Button>
                  </div>
                );
              })}

              {!isLoading && reports.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-white/60">
                  Belum ada laporan jaring binaan yang memiliki koordinat lokasi.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
