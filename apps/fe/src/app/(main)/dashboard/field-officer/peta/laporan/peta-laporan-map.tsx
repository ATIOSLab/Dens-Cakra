"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, ChevronsUpDown, ExternalLink, FileText, FilterX, RefreshCw } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

function reportUrgency(value?: string | null) {
  const normalized = value?.toUpperCase();
  if (!normalized) {
    return "UNASSIGNED";
  }

  return normalized === "LOW" || normalized === "NORMAL" || normalized === "HIGH" || normalized === "URGENT"
    ? normalized
    : "UNASSIGNED";
}

function SearchableFilter({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  onValueChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <div className="w-full">
      <Button
        aria-expanded={open}
        className="w-full justify-between border-white/10 bg-white/5 font-normal text-white hover:bg-white/10"
        onClick={() => setOpen((current) => !current)}
        role="combobox"
        type="button"
        variant="outline"
      >
        <span className="truncate">{selectedLabel ?? placeholder}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </Button>
      {open ? (
        <div className="mt-2 overflow-hidden rounded-md border border-white/10 bg-popover text-popover-foreground shadow-sm">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-52">
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  data-checked={value === option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        </div>
      ) : null}
    </div>
  );
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
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [urgency, setUrgency] = useState("all");

  const reports = useMemo(() => workspace?.jaringReports ?? [], [workspace]);
  const filteredReports = useMemo(() => {
    const from = periodFrom ? new Date(`${periodFrom}T00:00:00`).getTime() : null;
    const to = periodTo ? new Date(`${periodTo}T23:59:59.999`).getTime() : null;

    return reports.filter((report) => {
      const reportTime = new Date(report.reportTimestamp ?? report.receivedAt).getTime();
      const matchesPeriod = (from === null || reportTime >= from) && (to === null || reportTime <= to);
      const matchesCategory = categoryId === "all" || report.categoryId === categoryId;
      const matchesUrgency = urgency === "all" || reportUrgency(report.urgency) === urgency;

      return matchesPeriod && matchesCategory && matchesUrgency;
    });
  }, [categoryId, periodFrom, periodTo, reports, urgency]);
  const locatedReports = useMemo(
    () => filteredReports.filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number"),
    [filteredReports],
  );

  const resetMapBounds = () => {
    hasFitInitialBoundsRef.current = false;
  };

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
      for (const report of locatedReports) {
        if (report.latitude === null || report.longitude === null) {
          continue;
        }

        const urgency = reportUrgency(report.urgency);
        const marker = L.marker([report.latitude, report.longitude], {
          icon: L.divIcon({
            className: "dc-leaflet-urgency-icon",
            html: `<span class="dc-priority dc-leaflet-urgency-marker" data-priority="${urgency}" aria-hidden="true"><span class="dc-leaflet-urgency-marker__wave"></span><span class="dc-leaflet-urgency-marker__core"></span></span>`,
            iconAnchor: [18, 18],
            iconSize: [36, 36],
            popupAnchor: [0, -16],
          }),
          title: urgency === "UNASSIGNED" ? "Urgensi belum ditentukan" : `Urgensi ${urgency}`,
        });

        marker.bindPopup(`
          <strong>${report.displayTitle ?? "Laporan Jaring"}</strong><br />
          Jaring: ${report.jaringAlias} (${report.jaringCode})<br />
          Area: ${report.areaName ?? "-"}<br />
          Kategori: ${report.categoryName ?? "-"}<br />
          Urgensi: ${report.urgency ?? "-"}<br />
          Sumber koordinat: Live Location Jaring<br />
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
  }, [locatedReports]);

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

      <section className="space-y-4">
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Peta Laporan</CardTitle>
            <CardDescription className="text-white/65">
              Marker menggunakan Live Location yang dibagikan Jaring saat membuat laporan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                <span className="size-2.5 rounded-full bg-sky-400" />
                {locatedReports.length} laporan dengan Live Location
              </span>
              <span className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                Scope: {workspace?.profile.name ?? "Field Officer"}
              </span>
            </div>
            <div
              ref={containerRef}
              className="h-[42rem] w-full overflow-hidden rounded-lg border border-white/10 bg-black/20"
            />
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-cyan-300" />
              Daftar Laporan Jaring
            </CardTitle>
            <CardDescription className="text-white/65">
              Pilih laporan untuk memusatkan peta ke lokasi yang dibagikan Jaring.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[1fr_1fr_1.1fr_1.1fr_auto]">
              <label className="space-y-1.5 text-xs text-white/65">
                <span>Periode Awal</span>
                <Input
                  className="border-white/10 bg-white/5 text-white [color-scheme:dark]"
                  max={periodTo || undefined}
                  type="date"
                  value={periodFrom}
                  onChange={(event) => {
                    resetMapBounds();
                    setPeriodFrom(event.target.value);
                  }}
                />
              </label>
              <label className="space-y-1.5 text-xs text-white/65">
                <span>Periode Akhir</span>
                <Input
                  className="border-white/10 bg-white/5 text-white [color-scheme:dark]"
                  min={periodFrom || undefined}
                  type="date"
                  value={periodTo}
                  onChange={(event) => {
                    resetMapBounds();
                    setPeriodTo(event.target.value);
                  }}
                />
              </label>
              <label className="space-y-1.5 text-xs text-white/65">
                <span>Kategori</span>
                <SearchableFilter
                  value={categoryId}
                  options={[
                    { value: "all", label: "Semua kategori" },
                    ...(workspace?.reportCategories ?? []).map((category) => ({
                      value: category.id,
                      label: category.name,
                    })),
                  ]}
                  placeholder="Semua kategori"
                  searchPlaceholder="Cari kategori..."
                  emptyMessage="Kategori tidak ditemukan."
                  onValueChange={(value) => {
                    resetMapBounds();
                    setCategoryId(value);
                  }}
                />
              </label>
              <label className="space-y-1.5 text-xs text-white/65">
                <span>Urgensi</span>
                <Select
                  value={urgency}
                  onValueChange={(value) => {
                    resetMapBounds();
                    setUrgency(value);
                  }}
                >
                  <SelectTrigger className="w-full border-white/10 bg-white/5 text-white">
                    <SelectValue placeholder="Semua urgensi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua urgensi</SelectItem>
                    <SelectItem value="UNASSIGNED">Belum ditentukan</SelectItem>
                    <SelectItem value="LOW">LOW</SelectItem>
                    <SelectItem value="NORMAL">NORMAL</SelectItem>
                    <SelectItem value="HIGH">HIGH</SelectItem>
                    <SelectItem value="URGENT">URGENT</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <Button
                className="self-end border-white/10 bg-white/5 text-white hover:bg-white/10"
                type="button"
                variant="outline"
                onClick={() => {
                  resetMapBounds();
                  setPeriodFrom("");
                  setPeriodTo("");
                  setCategoryId("all");
                  setUrgency("all");
                }}
              >
                <FilterX className="mr-2 size-4" />
                Reset
              </Button>
            </div>
            <Button
              className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 sm:w-auto"
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

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredReports.map((report) => {
                const hasLocation = report.latitude !== null && report.longitude !== null;

                return (
                  <div
                    key={report.id}
                    className="flex h-full flex-col rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-white/75 transition hover:border-cyan-400/30 hover:bg-white/10"
                  >
                    <button
                      className="w-full flex-1 text-left disabled:cursor-default"
                      type="button"
                      disabled={!hasLocation}
                      onClick={() => focusReport(report)}
                    >
                      <div>
                        <p className="font-semibold text-white">{report.displayTitle || "Laporan Jaring"}</p>
                        <p className="text-xs text-white/55">
                          {report.jaringAlias} ({report.jaringCode})
                        </p>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-white/60">{report.content || "-"}</p>
                      <p className="mt-2 text-xs text-white/55">Area: {report.areaName || "-"}</p>
                      <p className="mt-1 text-xs text-white/55">Kategori: {report.categoryName || "-"}</p>
                      <p className="mt-1 text-xs text-white/55">Urgensi: {report.urgency || "-"}</p>
                      {hasLocation ? (
                        <p className="mt-2 rounded border border-cyan-400/20 bg-cyan-500/10 px-2 py-1.5 font-mono text-cyan-100 text-xs">
                          Live Location: {report.latitude?.toFixed(5)}, {report.longitude?.toFixed(5)}
                        </p>
                      ) : (
                        <p className="mt-2 rounded border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-amber-100 text-xs">
                          Live Location belum tersedia
                        </p>
                      )}
                      <p className="mt-1 text-xs text-white/45">
                        Waktu: {formatDateTime(report.reportTimestamp ?? report.receivedAt)}
                      </p>
                    </button>
                    {hasLocation ? (
                      <Button
                        asChild
                        className="mt-3 h-8 w-full border-white/10 bg-white/10 text-white hover:bg-white/15"
                        size="sm"
                        variant="outline"
                      >
                        <a href={mapsUrl(report.latitude!, report.longitude!)} rel="noreferrer" target="_blank">
                          <ExternalLink className="mr-2 size-3.5" />
                          Buka di Maps
                        </a>
                      </Button>
                    ) : null}
                  </div>
                );
              })}

              {!isLoading && filteredReports.length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-black/15 p-4 text-sm text-white/60">
                  Tidak ada laporan yang sesuai dengan filter yang dipilih.
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
