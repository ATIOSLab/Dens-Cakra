"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertTriangle, FileText, Layers3, LoaderCircle, MapPinned, Radio, ShieldAlert, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map as BaseMap, MapControls, MapGeoJSON, MapMarker, type MapRef, type MapViewport } from "@/components/ui/map";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

type DataRecord = Record<string, unknown>;
type MapFeature = {
  id?: string | number;
  type: "Feature";
  geometry: { type: string; coordinates?: unknown } | null;
  properties: DataRecord;
};
type FeatureCollection = { type: "FeatureCollection"; features: MapFeature[] };
type LayerKey = "reports" | "personnel" | "alerts" | "emergencies";
type Selection = { kind: "area" | LayerKey; feature: MapFeature };

const EMPTY_COLLECTION: FeatureCollection = { type: "FeatureCollection", features: [] };
const INDONESIA_CENTER: [number, number] = [117.5, -2.5];

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function collection(value: unknown): FeatureCollection {
  const payload = record(value);
  return {
    type: "FeatureCollection",
    features: Array.isArray(payload.features) ? (payload.features as MapFeature[]) : [],
  };
}

function text(value: unknown, fallback = "Belum tersedia") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function coordinates(feature: MapFeature): [number, number] | null {
  const value = feature.geometry?.coordinates;
  if (!Array.isArray(value) || value.length < 2) return null;
  const longitude = Number(value[0]);
  const latitude = Number(value[1]);
  return Number.isFinite(longitude) && Number.isFinite(latitude) ? [longitude, latitude] : null;
}

function hierarchyLevel(zoom: number) {
  if (zoom <= 5) return "Provinsi / BINDA";
  if (zoom <= 9) return "Kabupaten / Kota";
  return "Kecamatan";
}

function severityClass(value: unknown) {
  const severity = text(value, "");
  if (["CRITICAL", "EMERGENCY"].includes(severity)) return "bg-destructive text-destructive-foreground";
  if (severity === "HIGH") return "bg-amber-500 text-black";
  return "bg-sky-500 text-black";
}

export function OperationalMapClient({ mode }: { mode: "regional" | "national" }) {
  const mapRef = useRef<MapRef>(null);
  const [viewport, setViewport] = useState<MapViewport>({ center: INDONESIA_CENTER, zoom: 4, pitch: 0, bearing: 0 });
  const [boundaries, setBoundaries] = useState(EMPTY_COLLECTION);
  const [reports, setReports] = useState(EMPTY_COLLECTION);
  const [personnel, setPersonnel] = useState(EMPTY_COLLECTION);
  const [alerts, setAlerts] = useState(EMPTY_COLLECTION);
  const [emergencies, setEmergencies] = useState(EMPTY_COLLECTION);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    reports: true,
    personnel: true,
    alerts: true,
    emergencies: true,
  });
  const [selection, setSelection] = useState<Selection | null>(null);
  const [areaSummary, setAreaSummary] = useState<DataRecord>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const viewportKey = `${viewport.center[0]}:${viewport.center[1]}`;

  useEffect(() => {
    if (!viewportKey) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      const bounds = mapRef.current?.getMap()?.getBounds();
      const bbox = bounds
        ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",")
        : "94,-12,142,7";
      const query = { bbox, zoom: Math.round(viewport.zoom), limit: 1000 };
      setLoading(true);
      try {
        const layerRequests = [
          apiBrowserFetch("/map/boundaries", { query, init: { signal: controller.signal } }),
          apiBrowserFetch("/map/reports", { query, init: { signal: controller.signal } }),
          apiBrowserFetch("/map/alerts", { query, init: { signal: controller.signal } }),
          apiBrowserFetch("/map/emergencies", { query, init: { signal: controller.signal } }),
          apiBrowserFetch("/personnel-location-map", { init: { signal: controller.signal } }),
        ] as const;
        const results = await Promise.allSettled(layerRequests);
        if (controller.signal.aborted) return;

        const layersToUpdate = [
          { label: "boundary wilayah", setter: setBoundaries },
          { label: "Baket", setter: setReports },
          { label: "alert", setter: setAlerts },
          { label: "insiden darurat", setter: setEmergencies },
          { label: "lokasi personel", setter: setPersonnel },
        ] as const;
        const failedLayers: string[] = [];

        results.forEach((result, index) => {
          const layer = layersToUpdate[index];
          if (!layer) return;
          if (result.status === "fulfilled") {
            layer.setter(collection(result.value));
            return;
          }
          layer.setter(EMPTY_COLLECTION);
          failedLayers.push(layer.label);
        });

        setError(
          failedLayers.length
            ? `Sebagian layer gagal dimuat: ${failedLayers.join(", ")}. Layer lainnya tetap ditampilkan.`
            : "",
        );
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : "Data peta gagal dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [viewportKey, viewport.zoom]);

  const selectArea = useCallback(async (feature: MapFeature) => {
    setSelection({ kind: "area", feature });
    const areaId = text(feature.properties.areaId, "");
    if (!areaId) return;
    try {
      setAreaSummary(record(await apiBrowserFetch("/map/area-summary", { query: { areaId } })));
    } catch {
      setAreaSummary({});
    }
  }, []);

  const counts = useMemo(
    () => ({
      reports: reports.features.length,
      personnel: personnel.features.length,
      alerts: alerts.features.length,
      emergencies: emergencies.features.length,
    }),
    [alerts.features.length, emergencies.features.length, personnel.features.length, reports.features.length],
  );
  const highRisk = [...alerts.features, ...emergencies.features].filter((feature) =>
    ["HIGH", "CRITICAL", "EMERGENCY"].includes(text(feature.properties.severity, "")),
  ).length;

  return (
    <main className="mx-auto w-full max-w-[1800px] space-y-4 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 border-b pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="mt-1 font-heading font-semibold text-2xl">
            {mode === "regional" ? "Peta & Peringatan Dini Regional" : "Peta Kerawanan Nasional"}
          </h1>
          <p className="mt-1 max-w-3xl text-muted-foreground text-sm">
            Baket, personel lapangan, boundary administratif, alert, dan insiden dalam scope komando aktif.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            <Layers3 /> {hierarchyLevel(viewport.zoom)}
          </Badge>
          {loading ? (
            <Badge variant="secondary">
              <LoaderCircle className="animate-spin" /> Sinkronisasi
            </Badge>
          ) : (
            <Badge variant="outline">
              <Radio /> Data aktif
            </Badge>
          )}
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "reports" as const, label: "Baket terpetakan", value: counts.reports, icon: FileText },
          { key: "personnel" as const, label: "Personel dalam scope", value: counts.personnel, icon: UserRound },
          { key: "alerts" as const, label: "Alert viewport", value: counts.alerts, icon: AlertTriangle },
          { key: "emergencies" as const, label: "Insiden darurat", value: counts.emergencies, icon: ShieldAlert },
        ].map((metric) => (
          <button
            key={metric.key}
            type="button"
            onClick={() => setLayers((current) => ({ ...current, [metric.key]: !current[metric.key] }))}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={layers[metric.key]}
          >
            <Card
              className={cn("h-full transition-colors", layers[metric.key] ? "border-primary/40" : "opacity-55")}
              size="sm"
            >
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">{metric.label}</p>
                  <p className="mt-1 font-mono font-semibold text-2xl">{metric.value}</p>
                </div>
                <metric.icon className="size-5 text-primary" />
              </CardContent>
            </Card>
          </button>
        ))}
      </section>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-destructive text-sm">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="h-[68vh] max-h-[900px] min-h-[560px]">
              <BaseMap
                ref={mapRef}
                center={INDONESIA_CENTER}
                zoom={4}
                minZoom={3}
                maxZoom={15}
                onViewportChange={setViewport}
              >
                <MapControls showZoom showCompass showFullscreen position="top-right" />
                <MapGeoJSON
                  data={boundaries as unknown as GeoJSON.GeoJSON}
                  promoteId="areaId"
                  interactive
                  fillPaint={{ "fill-color": "#39d982", "fill-opacity": 0.06 }}
                  fillHoverPaint={{ "fill-color": "#39d982", "fill-opacity": 0.18 }}
                  linePaint={{ "line-color": "#54e594", "line-width": 1, "line-opacity": 0.65 }}
                  onClick={({ feature }) => void selectArea(feature as unknown as MapFeature)}
                />
                {layers.reports
                  ? reports.features.map((feature) => (
                      <OperationalMarker
                        key={`report-${feature.id}`}
                        feature={feature}
                        kind="reports"
                        onSelect={() => setSelection({ kind: "reports", feature })}
                      />
                    ))
                  : null}
                {layers.personnel
                  ? personnel.features.map((feature) => (
                      <OperationalMarker
                        key={`person-${feature.id}`}
                        feature={feature}
                        kind="personnel"
                        onSelect={() => setSelection({ kind: "personnel", feature })}
                      />
                    ))
                  : null}
                {layers.alerts
                  ? alerts.features.map((feature) => (
                      <OperationalMarker
                        key={`alert-${feature.id}`}
                        feature={feature}
                        kind="alerts"
                        onSelect={() => setSelection({ kind: "alerts", feature })}
                      />
                    ))
                  : null}
                {layers.emergencies
                  ? emergencies.features.map((feature) => (
                      <OperationalMarker
                        key={`emergency-${feature.id}`}
                        feature={feature}
                        kind="emergencies"
                        onSelect={() => setSelection({ kind: "emergencies", feature })}
                      />
                    ))
                  : null}
              </BaseMap>
            </div>
          </CardContent>
        </Card>

        <MapInspector selection={selection} areaSummary={areaSummary} reports={reports.features} highRisk={highRisk} />
      </div>
    </main>
  );
}

function OperationalMarker({ feature, kind, onSelect }: { feature: MapFeature; kind: LayerKey; onSelect: () => void }) {
  const point = coordinates(feature);
  if (!point) return null;
  const props = feature.properties;
  const label = text(props.title, text(props.userName, text(props.areaName, kind)));
  let markerClass = severityClass(props.severity);
  if (kind === "reports") markerClass = "bg-primary text-primary-foreground";
  if (kind === "personnel") markerClass = "bg-sky-500 text-black";
  const markerIcons = { reports: FileText, personnel: UserRound, alerts: AlertTriangle, emergencies: ShieldAlert };
  const MarkerIcon = markerIcons[kind];
  return (
    <MapMarker longitude={point[0]} latitude={point[1]}>
      <button
        type="button"
        onClick={onSelect}
        title={label}
        aria-label={`Buka detail ${label}`}
        className={cn(
          "grid size-8 place-items-center rounded-full border-2 border-background shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
          markerClass,
        )}
      >
        <MarkerIcon className="size-4" />
      </button>
    </MapMarker>
  );
}

function MapInspector({
  selection,
  areaSummary,
  reports,
  highRisk,
}: {
  selection: Selection | null;
  areaSummary: DataRecord;
  reports: MapFeature[];
  highRisk: number;
}) {
  const props: DataRecord = selection ? selection.feature.properties : {};
  const summary = record(areaSummary.kpis);
  let recommendation =
    "Situasi belum menunjukkan eskalasi tinggi. Pertahankan validasi berlapis dan pantau perubahan pola laporan antar-kecamatan.";
  if (reports.length === 0) {
    recommendation =
      "Viewport ini adalah blind spot laporan. Periksa coverage personel dan jaring, lalu arahkan pengumpulan terukur pada kecamatan yang belum memiliki Baket.";
  }
  if (highRisk > 0) {
    recommendation =
      "Prioritaskan verifikasi silang pada titik bereskalasi tinggi, pastikan handler cadangan tersedia, lalu susun opsi respons sebelum eskalasi ke pimpinan.";
  }
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPinned className="size-4 text-primary" /> Inspector wilayah & titik
          </CardTitle>
          <CardDescription>Pilih boundary atau marker untuk membaca detail operasional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {selection ? (
            <>
              <div>
                <p className="text-muted-foreground text-xs">Objek</p>
                <p className="mt-1 font-medium">{text(props.name, text(props.title, text(props.userName)))}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Jenis / status</p>
                <p className="mt-1">
                  {selection.kind} / {text(props.status, text(props.level))}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Wilayah</p>
                <p className="mt-1">{text(props.areaName, text(props.unitName))}</p>
              </div>
              {selection.kind === "area" ? (
                <div className="grid grid-cols-3 gap-2 border-t pt-3 text-center">
                  <MetricMini label="Baket" value={summary.bakets} />
                  <MetricMini label="Alert" value={summary.alerts} />
                  <MetricMini label="Darurat" value={summary.emergencies} />
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Belum ada objek dipilih.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Saran taktis / strategis</CardTitle>
          <CardDescription>Dihasilkan dari kepadatan laporan dan tingkat eskalasi pada viewport.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6">{recommendation}</p>
          <p className="mt-3 text-muted-foreground text-xs">
            Saran sistem wajib diuji terhadap sumber, konteks lokal, dan kewenangan komando sebelum ditindaklanjuti.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Baket dalam viewport</CardTitle>
          <CardDescription>{reports.length} laporan berkoordinat.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-72 space-y-2 overflow-y-auto">
          {reports.slice(0, 12).map((feature) => (
            <div key={String(feature.id)} className="border-b pb-2 text-sm last:border-0">
              <p className="font-medium">{text(feature.properties.title)}</p>
              <p className="mt-1 text-muted-foreground text-xs">
                {text(feature.properties.areaName)} / {text(feature.properties.urgency)}
              </p>
            </div>
          ))}
          {!reports.length ? (
            <p className="text-muted-foreground text-sm">Tidak ada Baket berkoordinat pada viewport ini.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <p className="font-mono font-semibold text-lg">{Number(value ?? 0)}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
