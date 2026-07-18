"use client";

import { useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { AlertTriangle, Crosshair, MapPin, Radar, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapControls, MapMarker, MapPopup, type MapRef, Map as MapView, MarkerContent } from "@/components/ui/map";
import { cn } from "@/lib/utils";

type LayerKey = "semua" | "ideologi" | "politik" | "ekonomi" | "sosbud" | "pertahanan" | "keamanan";
type RiskTone = "critical" | "high" | "medium" | "watch";

type RiskPoint = {
  id: string;
  name: string;
  area: string;
  coordinate: [number, number];
  score: number;
  tone: RiskTone;
  layers: LayerKey[];
  dominantIssue: string;
  reports: number;
  actors: string[];
  demand: string;
  correlation: string;
};

const cartoMapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const layerOptions = [
  { key: "semua", label: "Semua" },
  { key: "ideologi", label: "Ideologi" },
  { key: "politik", label: "Politik" },
  { key: "ekonomi", label: "Ekonomi" },
  { key: "sosbud", label: "Sosbud" },
  { key: "pertahanan", label: "Pertahanan" },
  { key: "keamanan", label: "Keamanan" },
] satisfies Array<{ key: LayerKey; label: string }>;

const riskPoints: RiskPoint[] = [
  {
    id: "jakarta-utara",
    name: "Kota Utara",
    area: "Prov. DKI Jakarta / Kota Administrasi Jakarta Utara",
    coordinate: [106.872, -6.126],
    score: 91,
    tone: "critical",
    layers: ["politik", "keamanan", "sosbud"],
    dominantIssue: "Konsolidasi aksi massa di simpul pemerintahan dan logistik.",
    reports: 34,
    actors: ["Forum pekerja pelabuhan", "Komunitas mahasiswa", "Akun amplifikasi lokal"],
    demand: "Penundaan kebijakan distribusi dan audit bantuan wilayah.",
    correlation: "Berkorelasi dengan 11 laporan lapangan dan 3 alert media sosial.",
  },
  {
    id: "bekasi-industri",
    name: "Koridor Industri Timur",
    area: "Prov. Jawa Barat / Kab. Bekasi",
    coordinate: [107.07, -6.27],
    score: 82,
    tone: "high",
    layers: ["ekonomi", "keamanan"],
    dominantIssue: "Kenaikan narasi pemogokan dan gangguan rantai pasok.",
    reports: 27,
    actors: ["Serikat pekerja sektor manufaktur", "Kelompok advokasi upah"],
    demand: "Kenaikan kompensasi, jam kerja fleksibel, dan mediasi pemerintah.",
    correlation: "Pola sebaran laporan mengikuti jadwal pergantian shift pabrik.",
  },
  {
    id: "banten-barat",
    name: "Kabupaten Barat",
    area: "Prov. Banten / Kabupaten Serang",
    coordinate: [106.15, -6.12],
    score: 76,
    tone: "high",
    layers: ["ideologi", "politik", "sosbud"],
    dominantIssue: "Disinformasi isu bantuan sosial dan sentimen anti-pemerintah.",
    reports: 21,
    actors: ["Jaringan kanal lokal", "Tokoh komunitas informal"],
    demand: "Transparansi data penerima bantuan dan klarifikasi pejabat daerah.",
    correlation: "Narasi meningkat setelah dua unggahan lokal mendapat traksi tinggi.",
  },
  {
    id: "bandung-raya",
    name: "Bandung Raya",
    area: "Prov. Jawa Barat / Kota Bandung",
    coordinate: [107.619, -6.917],
    score: 64,
    tone: "medium",
    layers: ["politik", "sosbud"],
    dominantIssue: "Rencana aksi simbolik dan konsolidasi komunitas kampus.",
    reports: 18,
    actors: ["Aliansi mahasiswa", "Komunitas sipil tematik"],
    demand: "Dialog terbuka, peninjauan ulang aturan daerah, dan ruang aspirasi.",
    correlation: "Terhubung dengan agenda diskusi publik di tiga titik kampus.",
  },
  {
    id: "cirebon-pesisir",
    name: "Pesisir Utara",
    area: "Prov. Jawa Barat / Cirebon",
    coordinate: [108.55, -6.71],
    score: 52,
    tone: "watch",
    layers: ["ekonomi", "pertahanan", "keamanan"],
    dominantIssue: "Aktivitas logistik tidak biasa dan laporan koordinat belum lengkap.",
    reports: 12,
    actors: ["Pelaku logistik lokal", "Sumber lapangan terbatas"],
    demand: "Belum ada tuntutan terbuka, perlu pendalaman jaringan.",
    correlation: "Blind spot data membuat korelasi masih lemah dan perlu validasi silang.",
  },
];

const toneClasses: Record<RiskTone, string> = {
  critical: "border-red-500 bg-red-500 text-white shadow-red-500/35",
  high: "border-orange-500 bg-orange-500 text-white shadow-orange-500/35",
  medium: "border-yellow-500 bg-yellow-500 text-black shadow-yellow-500/35",
  watch: "border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/35",
};

const selectedPanelClasses: Record<RiskTone, string> = {
  critical: "border-red-500/25 bg-red-500/10",
  high: "border-orange-500/25 bg-orange-500/10",
  medium: "border-yellow-500/25 bg-yellow-500/10",
  watch: "border-emerald-500/25 bg-emerald-500/10",
};

const statusConfig = {
  critical: { text: "Kritis", color: "bg-red-500 shadow-red-500/50 animate-pulse", textClass: "text-red-500" },
  high: { text: "Waspada", color: "bg-orange-500 shadow-orange-500/50", textClass: "text-orange-500" },
  medium: {
    text: "Perhatian",
    color: "bg-yellow-500 shadow-yellow-500/50",
    textClass: "text-yellow-600 dark:text-yellow-500",
  },
  watch: { text: "Normal", color: "bg-emerald-500 shadow-emerald-500/50", textClass: "text-emerald-500" },
};

export function PetaKerawananMap() {
  const mapRef = useRef<MapRef>(null);
  const router = useRouter();
  const [activeLayer, setActiveLayer] = useState<LayerKey>("semua");
  const [selectedPoint, setSelectedPoint] = useState<RiskPoint>(riskPoints[0]);
  const [zoom, setZoom] = useState(7.55);
  const [hoveredPoint, setHoveredPoint] = useState<RiskPoint | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visiblePoints =
    activeLayer === "semua" ? riskPoints : riskPoints.filter((point) => point.layers.includes(activeLayer));

  useEffect(() => {
    mapRef.current?.easeTo({
      bearing: -16,
      duration: 700,
      pitch: 58,
    });
  }, []);

  useEffect(() => {
    if (!visiblePoints.includes(selectedPoint)) {
      setSelectedPoint(visiblePoints[0] ?? riskPoints[0]);
    }
  }, [selectedPoint, visiblePoints]);

  const handleMouseEnterMarker = (point: RiskPoint) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHoveredPoint(point);
  };

  const handleMouseLeaveMarker = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 200);
  };

  const handleMouseEnterPopup = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleMouseLeavePopup = () => {
    timeoutRef.current = setTimeout(() => {
      setHoveredPoint(null);
    }, 200);
  };

  const handleMarkerClick = (point: RiskPoint) => {
    setSelectedPoint(point);
    mapRef.current?.easeTo({
      center: point.coordinate,
      zoom: 10.5,
      duration: 800,
      pitch: 58,
    });
  };

  return (
    <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="relative h-[580px] overflow-hidden rounded-xl border bg-muted/20 lg:h-[680px]">
        <MapView
          ref={mapRef}
          bearing={-16}
          center={[107.05, -6.4]}
          pitch={58}
          styles={{
            dark: cartoMapStyle,
            light: cartoMapStyle,
          }}
          zoom={7.55}
          onViewportChange={(v) => setZoom(v.zoom)}
        >
          <MapControls position="top-left" showCompass showFullscreen showZoom />
          {visiblePoints.map((point) => {
            const isDetailed = zoom >= 9.0;
            const isSelected = selectedPoint.id === point.id;

            return (
              <MapMarker key={point.id} latitude={point.coordinate[1]} longitude={point.coordinate[0]}>
                <MarkerContent>
                  <button
                    className="group relative flex cursor-pointer flex-col items-center text-foreground"
                    onClick={() => handleMarkerClick(point)}
                    onMouseEnter={() => handleMouseEnterMarker(point)}
                    onMouseLeave={handleMouseLeaveMarker}
                    type="button"
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center rounded-full border shadow-xl ring-background/70 transition-all duration-200 group-hover:scale-110",
                        isDetailed ? "size-7 ring-2" : "size-3.5 ring-1",
                        isSelected && "scale-110 ring-primary/40",
                        toneClasses[point.tone],
                      )}
                    >
                      {isDetailed && <MapPin className="size-3.5" />}
                    </div>
                    {isDetailed && (
                      <div className="fade-in zoom-in-95 mt-1 min-w-28 animate-in rounded border bg-background/95 px-2 py-0.5 text-center text-[10px] shadow-sm backdrop-blur transition-all duration-150">
                        <span className="block font-medium leading-3">{point.name}</span>
                        <span className="mt-0.5 block text-muted-foreground leading-3">Skor {point.score}</span>
                      </div>
                    )}
                  </button>
                </MarkerContent>
              </MapMarker>
            );
          })}

          {hoveredPoint && (
            <MapPopup
              longitude={hoveredPoint.coordinate[0]}
              latitude={hoveredPoint.coordinate[1]}
              closeButton={true}
              onClose={() => setHoveredPoint(null)}
              className="fade-in-0 zoom-in-95 w-64 animate-in border-border bg-popover p-4 text-popover-foreground shadow-xl duration-200"
            >
              <div
                aria-label={`Detail ${hoveredPoint.name}`}
                className="flex flex-col gap-2 text-xs"
                onMouseEnter={handleMouseEnterPopup}
                onMouseLeave={handleMouseLeavePopup}
                role="dialog"
              >
                <div>
                  <h4 className="font-bold text-foreground text-sm tracking-wide">
                    BINDA {hoveredPoint.name.toUpperCase()}
                  </h4>
                  <p className="mt-0.5 text-muted-foreground">{hoveredPoint.area.split(" / ")[0]}</p>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Status:</span>
                  <span className={cn("inline-block size-2 rounded-full", statusConfig[hoveredPoint.tone].color)} />
                  <span className={cn("font-semibold text-[11px]", statusConfig[hoveredPoint.tone].textClass)}>
                    {statusConfig[hoveredPoint.tone].text}
                  </span>
                </div>

                <div className="mt-2 space-y-1.5 border-border/40 border-t pt-2 text-[11px] text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Personnel Aktif:</span>
                    <span className="font-medium text-foreground">{Math.round(hoveredPoint.score * 1.3) + 12}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Laporan Hari Ini:</span>
                    <span className="font-medium text-foreground">{hoveredPoint.reports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Laporan Prioritas:</span>
                    <span className="font-medium text-foreground">{Math.round(hoveredPoint.reports * 0.22)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>KPI Wilayah:</span>
                    <span className="font-medium text-foreground">{hoveredPoint.score}</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 h-8 w-full border-primary/20 font-semibold text-primary text-xs hover:bg-primary/10 hover:text-primary"
                  onClick={() => router.push("/dashboard/executive/produk-intelijen")}
                >
                  LIHAT DETAIL
                </Button>
              </div>
            </MapPopup>
          )}
        </MapView>

        <div className="absolute top-3 right-3 left-14 z-10 flex flex-wrap items-center justify-end gap-2">
          <Badge className="border-red-500/25 bg-red-500/90 text-white shadow-sm" variant="outline">
            {visiblePoints.length} titik tampil
          </Badge>
        </div>

        <div className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)] rounded-xl border bg-background/92 p-3 shadow-lg backdrop-blur">
          <div className="mb-3 flex items-center gap-2 text-sm">
            <Radar className="size-4 text-red-500" />
            <span className="font-medium">Layer aktif</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {layerOptions.map((layer) => (
              <Button
                key={layer.key}
                onClick={() => setActiveLayer(layer.key)}
                size="sm"
                type="button"
                variant={activeLayer === layer.key ? "default" : "outline"}
              >
                {layer.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className={cn("rounded-xl border p-4", selectedPanelClasses[selectedPoint.tone])}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Drill-down wilayah</p>
              <h3 className="mt-1 font-semibold text-lg">{selectedPoint.name}</h3>
              <p className="mt-1 text-muted-foreground text-xs leading-5">{selectedPoint.area}</p>
            </div>
            <Badge className={toneClasses[selectedPoint.tone]} variant="outline">
              {statusConfig[selectedPoint.tone].text} · {selectedPoint.score}
            </Badge>
          </div>
          <p className="mt-4 text-sm leading-6">{selectedPoint.dominantIssue}</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-500" />
            <h3 className="font-medium text-sm">Tuntutan Utama</h3>
          </div>
          <p className="mt-3 text-muted-foreground text-sm leading-6">{selectedPoint.demand}</p>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Crosshair className="size-4 text-sky-500" />
            <h3 className="font-medium text-sm">Aktor & Organisasi</h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedPoint.actors.map((actor) => (
              <Badge key={actor} variant="secondary">
                {actor}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <Search className="size-4 text-emerald-500" />
            <h3 className="font-medium text-sm">Korelasi Kejadian</h3>
          </div>
          <p className="mt-3 text-muted-foreground text-sm leading-6">{selectedPoint.correlation}</p>
          <div className="mt-4 rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-muted-foreground text-xs">Sebaran laporan terkait</p>
            <p className="mt-1 font-semibold text-2xl">{selectedPoint.reports}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
