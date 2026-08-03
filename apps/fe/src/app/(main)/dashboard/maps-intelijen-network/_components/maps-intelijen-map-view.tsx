"use client";

import { RefObject } from "react";
import {
  Activity,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Eye,
  FileText,
  Filter,
  Inbox,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  SlidersHorizontal,
  Target,

} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { type JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { MapControls, MapMarker, MapMarkerPopup, Map as MapView } from "@/components/ui/map";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import { MapsIntelijenRightPanel } from "./maps-intelijen-right-panel";

import {
  formatDateTime,
  getTickerBadgeClass,
  getUrgencyCardStyle,
  type MapIntelItem,
  type PeriodPreset,

  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./maps-intelijen-types";

interface MapsIntelijenMapViewProps {
  mapCardRef: RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  zuluTime: string;
  wibTime: string;
  filteredItems: MapIntelItem[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  tickerOpen: boolean;
  setTickerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  mapLayer: string;
  setMapLayer: (layer: "dark" | "satellite" | "terrain" | "light" | "osm") => void;
  activeTab: "ALL" | "LAPORAN" | "BAKET";
  setActiveTab: (tab: "ALL" | "LAPORAN" | "BAKET") => void;
  mapCenter: [number, number];
  mapZoom: number;
  setMapZoom: (zoom: number | ((prev: number) => number)) => void;
  mapPitch: number;
  setMapPitch: (pitch: number | ((prev: number) => number)) => void;
  hoveredItemId: string | null;
  setHoveredItemId: (id: string | null) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null | ((prev: string | null) => string | null)) => void;

  // Filter States
  search: string;
  setSearch: (v: string) => void;
  urgencyFilter: string;
  setUrgencyFilter: (v: string) => void;
  periodPreset: PeriodPreset;
  setPeriodPreset: (v: PeriodPreset) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  readFilter: "ALL" | "READ" | "UNREAD";
  setReadFilter: (v: "ALL" | "READ" | "UNREAD") => void;
  jaringFilter: string;
  setJaringFilter: (v: string) => void;
  popoverJaringOptions: JaringOption[];
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  categories: any[];
  regencyFilter: string;
  setRegencyFilter: (v: string) => void;
  regencyOptions: any[];
  districtFilter: string;
  setDistrictFilter: (v: string) => void;
  districtOptions: any[];
  villageFilter: string;
  setVillageFilter: (v: string) => void;
  villageOptions: any[];
  onResetFilters: () => void;
  setPage: (p: number) => void;

  // Ticker & Focus
  tickerItems: any[];
  onFocusOnMap: (item: MapIntelItem) => void;
  onOpenDetail: (item: MapIntelItem) => void;
}

// Static Map Styles Configuration (Defined outside component to prevent re-initialization and map flickering/glitching)
const MAP_THEMES: Record<string, any> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  terrain: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  satellite: {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Esri",
      },
    },
    layers: [
      {
        id: "esri-satellite",
        type: "raster",
        source: "esri",
      },
    ],
  },
  osm: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "OpenStreetMap",
      },
    },
    layers: [
      {
        id: "osm-layer",
        type: "raster",
        source: "osm",
      },
    ],
  },
};

export function MapsIntelijenMapView({
  mapCardRef,
  isFullscreen,
  onToggleFullscreen,
  zuluTime,
  wibTime,
  filteredItems,
  panelOpen,
  setPanelOpen,
  rightPanelOpen,
  setRightPanelOpen,
  tickerOpen,
  setTickerOpen,
  mapLayer,
  setMapLayer,
  activeTab,
  setActiveTab,
  mapCenter,
  mapZoom,
  setMapZoom,
  mapPitch,
  setMapPitch,
  hoveredItemId,
  setHoveredItemId,
  selectedItemId,
  setSelectedItemId,

  search,
  setSearch,
  urgencyFilter,
  setUrgencyFilter,
  periodPreset,
  setPeriodPreset,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  statusFilter,
  setStatusFilter,
  readFilter,
  setReadFilter,
  jaringFilter,
  setJaringFilter,
  popoverJaringOptions,
  categoryFilter,
  setCategoryFilter,
  categories,
  regencyFilter,
  setRegencyFilter,
  regencyOptions,
  districtFilter,
  setDistrictFilter,
  districtOptions,
  villageFilter,
  setVillageFilter,
  villageOptions,
  onResetFilters,
  setPage,

  tickerItems,
  onFocusOnMap,
  onOpenDetail,
}: MapsIntelijenMapViewProps) {

  const activeStyle = MAP_THEMES[mapLayer] || MAP_THEMES.dark;

  return (
    <section id="intel-map-section" className={cn(
      "relative space-y-0 text-foreground font-sans",
      isFullscreen ? "h-screen w-screen fixed inset-0 z-50 bg-background" : "h-[88vh] min-h-[650px] w-full"
    )}>
      <Card
        ref={mapCardRef}
        className="relative h-full w-full overflow-hidden border-border bg-card font-mono text-card-foreground shadow-2xl transition-all dark:border-amber-500/30 dark:bg-slate-950 rounded-2xl"
      >
        {/* TOP TACTICAL OVERLAY BAR */}
        <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-xl text-foreground font-mono dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-100">
          <div className="flex items-center gap-3">
            <div className="grid size-7 place-items-center rounded border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
              <Target className="size-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-extrabold font-mono text-amber-600 dark:text-amber-400 text-xs uppercase tracking-wider">
                <span>CAKRA OSINT</span>
                <span className="text-muted-foreground dark:text-slate-600">|</span>
                <span className="text-foreground dark:text-slate-200">INTELLIGENCE NETWORK MAP</span>
              </div>
              <div className="font-sans text-[10px] text-muted-foreground dark:text-slate-400">
                REAL-TIME SPATIAL MONITORING & ENTITY TRACKING
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-bold text-amber-600 dark:bg-slate-900/90 dark:text-amber-400">
              <Clock className="size-3 text-amber-500" />
              <span>{zuluTime}</span>
              <span className="text-[10px] text-muted-foreground dark:text-slate-400">({wibTime} WIB)</span>
            </div>

            <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-bold text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span className="inline-block size-2 animate-ping rounded-full bg-emerald-500" />
              STATUS: LIVE
            </div>

            <div className="flex items-center gap-1.5 rounded border border-border bg-muted/80 px-2 py-1 font-medium text-[10px] text-muted-foreground dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <Database className="size-3 text-sky-500 dark:text-sky-400" />
              <span>{filteredItems.length} LAPORAN TERPANTAU</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanelOpen((prev) => !prev)}
              className="h-7 gap-1.5 border-amber-500/40 bg-amber-500/10 font-bold text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
            >
              <Filter className="size-3" />
              PANEL FILTER
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRightPanelOpen((prev) => !prev)}
              className={cn(
                "h-7 gap-1.5 font-bold text-[11px] transition-all",
                rightPanelOpen
                  ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                  : "border-border bg-background/95 hover:bg-muted text-muted-foreground dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <BarChart2 className="size-3" />
              PANEL RINGKASAN
            </Button>

            <Button
              variant={isFullscreen ? "default" : "outline"}
              size="sm"
              onClick={onToggleFullscreen}
              className="h-7 gap-1 border-border bg-background font-bold text-[11px] text-foreground hover:bg-muted dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isFullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
              {isFullscreen ? "KELUAR" : "FULLSCREEN"}
            </Button>
          </div>
        </div>

        {/* LEFT VERTICAL ICON DOCK */}
        <div className="absolute top-16 left-3 z-30 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen((prev) => !prev)}
            title="Toggle Filter Matrix"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border shadow-lg backdrop-blur-md transition-all",
              panelOpen
                ? "border-amber-400 bg-amber-500 font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                : "border-border bg-background/95 hover:bg-muted text-foreground dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900",
            )}
          >
            <Filter className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            title="Semua Layer Marker"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border shadow-lg backdrop-blur-md transition-all",
              activeTab === "ALL"
                ? "border-sky-400 bg-sky-600 font-bold text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                : "border-border bg-background/95 hover:bg-muted text-foreground dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900",
            )}
          >
            <Layers className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LAPORAN")}
            title="Hanya Laporan Jaring"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border shadow-lg backdrop-blur-md transition-all",
              activeTab === "LAPORAN"
                ? "border-slate-300 bg-slate-600 font-bold text-white shadow-[0_0_15px_rgba(148,163,184,0.5)]"
                : "border-border bg-background/95 hover:bg-muted text-foreground dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900",
            )}
          >
            <FileText className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BAKET")}
            title="Hanya Baket"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border shadow-lg backdrop-blur-md transition-all",
              activeTab === "BAKET"
                ? "border-emerald-400 bg-emerald-600 font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                : "border-border bg-background/95 hover:bg-muted text-foreground dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900",
            )}
          >
            <Inbox className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setTickerOpen((prev) => !prev)}
            title="Toggle Live OSINT Ticker"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border shadow-lg backdrop-blur-md transition-all",
              tickerOpen
                ? "border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "border-border bg-background/95 hover:bg-muted text-foreground dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900",
            )}
          >
            <Activity className="size-4" />
          </button>
        </div>

        {/* MAP CANVAS CONTAINER */}
        <CardContent className="relative w-full h-full bg-slate-900 p-0 pt-12 dark:bg-slate-950">
          <MapView 
            center={mapCenter} 
            zoom={mapZoom} 
            pitch={mapPitch} 
            className="h-full w-full"
            styles={{ light: activeStyle, dark: activeStyle }}
          >

            {/* Map Markers */}
            {filteredItems.map((item) => {
              const urgencyStyle = getUrgencyCardStyle(item.urgency);
              const isHovered = hoveredItemId === item.id;
              const isSelected = selectedItemId === item.id;
              const showPopup = isHovered || isSelected;

              return (
                <MapMarker
                  key={item.id}
                  latitude={item.coordinates[1]}
                  longitude={item.coordinates[0]}
                  pulse={urgencyStyle.pulse}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onMouseLeave={() => setHoveredItemId(null)}
                    onClick={() => setSelectedItemId((prev) => (prev === item.id ? null : item.id))}
                    className={cn(
                      "grid size-8 cursor-pointer place-items-center rounded-full border-2 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring",
                      isHovered || isSelected ? "z-50 scale-125 ring-2 ring-white" : "",
                      item.isBaket
                        ? urgencyStyle.markerBg
                        : "border-slate-300 bg-slate-600 text-slate-100 shadow-[0_0_10px_rgba(100,116,139,0.4)] dark:border-slate-400 dark:bg-slate-500",
                    )}
                    aria-label={`${item.isBaket ? "Baket" : "Laporan"} ${item.title}`}
                  >
                    {item.isBaket ? <Inbox className="size-4" /> : <FileText className="size-4" />}
                  </button>

                  {showPopup ? (
                    <MapMarkerPopup
                      closeButton={false}
                      className="z-50 font-sans"
                    >
                      <div className="w-72 max-w-xs space-y-2 rounded-xl border border-border bg-background p-3 text-xs text-foreground shadow-2xl backdrop-blur-xl dark:border-amber-500/30 dark:bg-slate-950 dark:text-slate-100">
                        <div className="flex items-center justify-between gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-bold text-[9px] uppercase",
                              item.isBaket
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                            )}
                          >
                            {item.isBaket ? "Baket" : "Laporan"}
                          </Badge>

                          <Badge
                            variant="outline"
                            className={cn("font-extrabold text-[9px] tracking-wider", urgencyStyle.badge)}
                          >
                            {urgencyStyle.label}
                          </Badge>
                        </div>

                        <h4 className="line-clamp-2 font-bold font-heading text-foreground dark:text-slate-100 text-xs leading-snug">
                          {item.title}
                        </h4>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground dark:text-slate-400 leading-normal">
                          {item.content}
                        </p>

                        <div className="space-y-1 border-border/60 dark:border-slate-800/80 border-t pt-2 font-mono text-[10px] text-muted-foreground dark:text-slate-400">
                          <div><span className="font-semibold text-foreground dark:text-slate-300">Jaring:</span> {item.jaringName}</div>
                          <div><span className="font-semibold text-foreground dark:text-slate-300">Lokasi:</span> {item.locationName}</div>
                          <div><span className="font-semibold text-foreground dark:text-slate-300">Waktu:</span> {formatDateTime(item.submittedAt)}</div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            size="sm"
                            onClick={() => onOpenDetail(item)}
                            className="h-7 w-full gap-1 bg-amber-500 font-bold text-[10px] text-slate-950 hover:bg-amber-400 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400 shadow-sm"
                          >
                            <Eye className="size-3.5" />
                            Detail
                          </Button>
                        </div>
                      </div>
                    </MapMarkerPopup>
                  ) : null}
                </MapMarker>
              );
            })}
          </MapView>

          {/* FILTER PANEL OVERLAY (Left Sidebar) */}
          {panelOpen ? (
            <div className="absolute top-16 left-14 bottom-14 z-30 flex w-72 flex-col rounded-xl border border-border bg-background/95 text-foreground shadow-2xl backdrop-blur-xl overflow-hidden font-sans dark:border-amber-500/30 dark:bg-slate-950/95 dark:text-slate-100">
              <div className="flex flex-none items-center justify-between border-border border-b p-3.5 pb-2 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold font-mono text-amber-600 dark:text-amber-500 text-[11px] uppercase tracking-wider">
                  <Filter className="size-3.5" />
                  FILTER MATRIX
                </div>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="font-mono text-[9px] text-sky-500 dark:text-sky-400 hover:underline"
                >
                  Reset All
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3.5 space-y-4 custom-scrollbar">
                {/* Search */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    SEARCH QUERY
                  </span>
                  <div className="relative">
                    <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari kode, judul, isi..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs"
                    />
                  </div>
                </div>

                {/* Data Layer Type */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    DATA LAYER TYPE
                  </span>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/60 p-1 font-mono text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("ALL");
                        setPage(1);
                      }}
                      className={cn(
                        "rounded py-1 text-center font-medium transition-colors",
                        activeTab === "ALL"
                          ? "bg-amber-500 font-bold text-slate-950 shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      SEMUA
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("LAPORAN");
                        setPage(1);
                      }}
                      className={cn(
                        "rounded py-1 text-center font-medium transition-colors",
                        activeTab === "LAPORAN"
                          ? "bg-slate-600 font-bold text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      LAPORAN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("BAKET");
                        setPage(1);
                      }}
                      className={cn(
                        "rounded py-1 text-center font-medium transition-colors",
                        activeTab === "BAKET"
                          ? "bg-emerald-600 font-bold text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      BAKET
                    </button>
                  </div>
                </div>

                {/* Urgency */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    URGENCY THREAT LEVEL
                  </span>
                  <NativeSelect
                    value={urgencyFilter}
                    onChange={(e) => {
                      setUrgencyFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 border-input bg-background font-mono text-foreground text-xs"
                  >
                    <option value="ALL">Semua Urgensi</option>
                    <option value="URGENT">🔴 URGENT</option>
                    <option value="HIGH">🟠 HIGH</option>
                    <option value="NORMAL">🟢 NORMAL</option>
                    <option value="LOW">🔵 LOW</option>
                  </NativeSelect>
                </div>

                {/* Time Range Preset */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    TIME RANGE PRESET
                  </span>
                  <NativeSelect
                    value={periodPreset}
                    onChange={(e) => {
                      setPeriodPreset(e.target.value as PeriodPreset);
                      setPage(1);
                    }}
                    className="h-8 border-input bg-background font-mono text-foreground text-xs"
                  >
                    <option value="ALL">Semua Periode Waktu</option>
                    <option value="TODAY">Hari Ini</option>
                    <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                    <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                    <option value="THIS_MONTH">Bulan Ini</option>
                    <option value="CUSTOM">Rentang Tanggal Khusus</option>
                  </NativeSelect>
                </div>

                {periodPreset === "CUSTOM" ? (
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div className="space-y-1">
                      <span className="block font-medium text-[10px] text-muted-foreground">Tgl Mulai</span>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setPage(1);
                        }}
                        className="h-8 border-input bg-background text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="block font-medium text-[10px] text-muted-foreground">Tgl Selesai</span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setPage(1);
                        }}
                        className="h-8 border-input bg-background text-xs"
                      />
                    </div>
                  </div>
                ) : null}

                {/* Verification Status */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    VERIFICATION STATUS
                  </span>
                  <NativeSelect
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 border-input bg-background font-mono text-foreground text-xs"
                  >
                    <option value="ALL">Semua Status Verifikasi</option>
                    <option value="WAITING_FIELD_OFFICER_VERIFICATION">Belum Diverifikasi</option>
                    <option value="NEEDS_FIELD_OFFICER_REVIEW">Perlu Review</option>
                    <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi</option>
                    <option value="METADATA_RECORDED">Baket Dibuat</option>
                  </NativeSelect>
                </div>

                {/* Read Filter */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    STATUS DIBACA
                  </span>
                  <NativeSelect
                    value={readFilter}
                    onChange={(e) => {
                      setReadFilter(e.target.value as "ALL" | "READ" | "UNREAD");
                      setPage(1);
                    }}
                    className="h-8 border-input bg-background font-mono text-foreground text-xs"
                  >
                    <option value="ALL">Semua</option>
                    <option value="UNREAD">Belum Dibaca</option>
                    <option value="READ">Sudah Dibaca</option>
                  </NativeSelect>
                </div>

                {/* Jaring Filter Popover */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    PERSONEL JARING
                  </span>
                  <JaringSelectPopover
                    options={popoverJaringOptions}
                    value={jaringFilter}
                    onValueChange={(val: string) => {
                      setJaringFilter(val);
                      setPage(1);
                    }}
                    placeholder="Pilih Jaring..."
                    allowAllOption
                    allOptionLabel="Semua Jaring"
                    filterVerifiedOnly={false}
                    container={mapCardRef.current}
                    className="h-8 border-input bg-background text-foreground text-xs"
                  />
                </div>

                {/* Category Filter */}
                <div className="space-y-1">
                  <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase">
                    REPORT CATEGORY
                  </span>
                  <NativeSelect
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 border-input bg-background font-mono text-foreground text-xs"
                  >
                    <option value="ALL">Semua Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {/* Hierarchical Area Filters */}
                <div className="space-y-2 border-border border-t pt-2.5">
                  <span className="block font-bold font-mono text-[10px] text-amber-600 uppercase dark:text-amber-400">
                    ADMINISTRATIVE GEOGRAPHY
                  </span>

                  <div className="space-y-1">
                    <span className="block font-medium font-mono text-[10px] text-muted-foreground">
                      Kabupaten/Kota
                    </span>
                    <NativeSelect
                      value={regencyFilter}
                      onChange={(e) => {
                        setRegencyFilter(e.target.value);
                        setDistrictFilter("ALL");
                        setVillageFilter("ALL");
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs"
                    >
                      <option value="ALL">Semua Kab/Kota</option>
                      {regencyOptions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1">
                    <span className="block font-medium font-mono text-[10px] text-muted-foreground">Kecamatan</span>
                    <NativeSelect
                      value={districtFilter}
                      onChange={(e) => {
                        setDistrictFilter(e.target.value);
                        setVillageFilter("ALL");
                        setPage(1);
                      }}
                      disabled={regencyFilter === "ALL"}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs"
                    >
                      <option value="ALL">Semua Kecamatan</option>
                      {districtOptions.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="space-y-1">
                    <span className="block font-medium font-mono text-[10px] text-muted-foreground">
                      Desa/Kelurahan
                    </span>
                    <NativeSelect
                      value={villageFilter}
                      onChange={(e) => {
                        setVillageFilter(e.target.value);
                        setPage(1);
                      }}
                      disabled={districtFilter === "ALL"}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs"
                    >
                      <option value="ALL">Semua Desa/Kelurahan</option>
                      {villageOptions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>

                {/* Bottom 20 MAP LAYERS button in filter panel */}
                <div className="pt-3 border-t border-border dark:border-slate-800">
                  <Button
                    variant="outline"
                    className="w-full h-8 gap-2 font-mono text-[10px] uppercase font-bold border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300"
                  >
                    <Layers className="size-3.5 text-amber-500" />
                    20 MAP LAYERS
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {/* RIGHT TOGGLE DOCK (Visible on top-right when panel is closed) */}
          {!rightPanelOpen && (
            <div className="absolute top-16 right-3 z-30">
              <button
                type="button"
                onClick={() => setRightPanelOpen(true)}
                title="Buka Panel Ringkasan"
                className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border bg-background/95 text-foreground shadow-lg backdrop-blur-md transition-all hover:bg-muted dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <BarChart2 className="size-4 text-sky-500" />
              </button>
            </div>
          )}

          {/* RIGHT PANEL (RINGKASAN SITUASI) */}
          <MapsIntelijenRightPanel
            filteredItems={filteredItems}
            rightPanelOpen={rightPanelOpen}
            setRightPanelOpen={setRightPanelOpen}
            onFocusOnMap={onFocusOnMap}
          />

          {/* BOTTOM FLOATING MAP CONTROLS (Map Style Selector Thumbnails & 2D/3D Pitch) */}
          <div className="absolute bottom-12 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
            {/* Visual Thumbnail Map Style Selector */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border bg-background/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
              {[
                { id: "dark", label: "Dark", color: "bg-slate-900 border-slate-700 text-slate-200" },
                { id: "satellite", label: "Satellite", color: "bg-emerald-950 border-emerald-800 text-emerald-200" },
                { id: "terrain", label: "Terrain", color: "bg-amber-950 border-amber-800 text-amber-200" },
                { id: "light", label: "Light", color: "bg-slate-100 border-slate-300 text-slate-900" },
                { id: "osm", label: "OSM", color: "bg-sky-950 border-sky-800 text-sky-200" },
              ].map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setMapLayer(style.id as any)}
                  className={cn(
                    "group relative flex flex-col items-center justify-end rounded-lg overflow-hidden w-12 h-10 border transition-all duration-200 p-0.5",
                    style.color,
                    mapLayer === style.id
                      ? "border-amber-500 ring-2 ring-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      : "opacity-75 hover:opacity-100 hover:border-slate-500",
                  )}
                >
                  <span
                    className={cn(
                      "w-full text-[8px] font-bold font-mono text-center rounded py-0.5 uppercase backdrop-blur-sm",
                      style.id === "light" ? "bg-slate-200/90 text-slate-900" : "bg-slate-950/80 text-slate-200",
                    )}
                  >
                    {style.label}
                  </span>
                </button>
              ))}

              {/* More (...) Button */}
              <button
                type="button"
                className="flex flex-col items-center justify-center rounded-lg w-7 h-10 border border-border bg-muted/80 text-muted-foreground hover:text-foreground text-xs font-bold dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ...
              </button>
            </div>

            {/* 2D / 3D Pitch Toggle, Zoom Controls & Scale */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/95 p-1.5 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
              {/* Zoom Controls (+ / -) */}
              <div className="flex items-center gap-1 font-mono">
                <button
                  type="button"
                  onClick={() => setMapZoom((prev) => Math.min(prev + 1, 20))}
                  title="Zoom In (+)"
                  className="grid size-6 place-items-center rounded border border-border bg-muted/80 text-foreground hover:bg-accent font-extrabold text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setMapZoom((prev) => Math.max(prev - 1, 1))}
                  title="Zoom Out (-)"
                  className="grid size-6 place-items-center rounded border border-border bg-muted/80 text-foreground hover:bg-accent font-extrabold text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  -
                </button>
              </div>

              <div className="h-4 w-px bg-border dark:bg-slate-800" />

              <button
                type="button"
                onClick={() => setMapPitch((prev) => (prev === 0 ? 55 : 0))}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 font-bold font-mono text-[9px] uppercase transition-colors border",
                  mapPitch > 0
                    ? "border-sky-500 bg-sky-500/20 text-sky-600 dark:text-sky-400"
                    : "border-border bg-muted text-muted-foreground hover:bg-accent dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
                )}
              >
                {mapPitch > 0 ? "3D PITCH" : "2D MAP"}
              </button>
              <div className="h-4 w-px bg-border dark:bg-slate-800" />
              <span className="font-mono text-[9px] text-muted-foreground dark:text-slate-400 px-1">10 km</span>
            </div>
          </div>

          {/* URGENCY LEVEL LEGEND (Bottom Left Overlay - Shifts dynamically when panel is open to avoid overlap) */}
          <div className={cn(
            "absolute bottom-12 z-20 hidden items-center gap-3 rounded-lg border border-border bg-background/95 p-2 font-mono text-[10px] shadow-2xl backdrop-blur-md md:flex dark:border-slate-800 dark:bg-slate-950/90 transition-all duration-300",
            panelOpen ? "left-[350px]" : "left-3"
          )}>
            <span className="font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider text-[9px]">URGENCY LEVEL</span>
            <div className="h-3 w-px bg-border dark:bg-slate-800" />
            <div className="flex items-center gap-2.5 text-[9px]">
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                <span className="font-bold text-rose-600 dark:text-rose-400">URGENT</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" />
                <span className="font-bold text-amber-600 dark:text-amber-400">HIGH</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
                <span className="font-bold text-emerald-600 dark:text-emerald-400">NORMAL</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
                <span className="font-bold text-sky-600 dark:text-sky-400">LOW</span>
              </div>
            </div>
          </div>

          {/* LIVE TICKER BAR */}
          {tickerOpen ? (
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center border-t border-border bg-background/95 px-3 py-1 font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <div className="flex shrink-0 items-center gap-1.5 rounded bg-rose-600 px-2 py-0.5 font-extrabold text-[10px] text-white uppercase tracking-wider shadow-[0_0_10px_rgba(225,29,72,0.5)]">
                <span className="inline-block size-2 animate-pulse rounded-full bg-white" />
                <span>LIVE FEED</span>
              </div>

              <div className="w-full overflow-hidden whitespace-nowrap pl-3 text-[11px]">
                {tickerItems.length > 0 ? (
                  <div className="flex animate-ticker-continuous items-center gap-8">
                    {tickerItems.map((item) => (
                      <button
                        type="button"
                        key={item.tickerKey1}
                        onClick={() => onFocusOnMap(item)}
                        className="inline-flex cursor-pointer items-center gap-2 text-foreground/90 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
                      >
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-bold text-[9px] uppercase",
                            getTickerBadgeClass(item.urgency),
                          )}
                        >
                          {item.urgency}
                        </span>
                        <span className="font-semibold">{item.title}</span>
                        <span className="text-muted-foreground dark:text-slate-500">({item.locationName})</span>
                        {item.relativeTime ? (
                          <span className="rounded font-bold font-mono text-[9px] text-amber-600 dark:text-amber-400">
                            [{item.relativeTime}]
                          </span>
                        ) : null}
                      </button>
                    ))}

                    {tickerItems.map((item) => (
                      <button
                        type="button"
                        key={item.tickerKey2}
                        onClick={() => onFocusOnMap(item)}
                        className="inline-flex cursor-pointer items-center gap-2 text-foreground/90 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
                      >
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-bold text-[9px] uppercase",
                            getTickerBadgeClass(item.urgency),
                          )}
                        >
                          {item.urgency}
                        </span>
                        <span className="font-semibold">{item.title}</span>
                        <span className="text-muted-foreground dark:text-slate-500">({item.locationName})</span>
                        {item.relativeTime ? (
                          <span className="rounded font-bold font-mono text-[9px] text-amber-600 dark:text-amber-400">
                            [{item.relativeTime}]
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs italic">Tidak ada feed intelijen aktif.</span>
                )}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
