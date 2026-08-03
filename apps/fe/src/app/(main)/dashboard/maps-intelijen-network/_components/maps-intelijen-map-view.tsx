"use client";

import { RefObject } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
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
  tickerOpen: boolean;
  setTickerOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeTab: "ALL" | "LAPORAN" | "BAKET";
  setActiveTab: (tab: "ALL" | "LAPORAN" | "BAKET") => void;
  mapCenter: [number, number];
  mapZoom: number;
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

export function MapsIntelijenMapView({
  mapCardRef,
  isFullscreen,
  onToggleFullscreen,
  zuluTime,
  wibTime,
  filteredItems,
  panelOpen,
  setPanelOpen,
  tickerOpen,
  setTickerOpen,
  activeTab,
  setActiveTab,
  mapCenter,
  mapZoom,
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
  return (
    <section id="intel-map-section" className="space-y-3">
      <Card
        ref={mapCardRef}
        className={cn(
          "overflow-hidden border border-border bg-card font-mono text-card-foreground shadow-2xl transition-all dark:border-amber-500/30 dark:bg-slate-950",
          isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none p-0" : "relative rounded-2xl",
        )}
      >
        {/* TOP TACTICAL OVERLAY BAR */}
        <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-border border-b bg-background/95 px-4 py-2.5 backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="grid size-7 place-items-center rounded border border-amber-500/40 bg-amber-500/10 text-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)] dark:text-amber-400">
              <Target className="size-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-extrabold font-mono text-amber-600 text-xs uppercase tracking-wider dark:text-amber-400">
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
            <div className="flex items-center gap-1.5 rounded border border-border bg-muted/80 px-2.5 py-1 font-bold text-foreground dark:border-amber-500/30 dark:bg-black/60 dark:text-amber-400">
              <Clock className="size-3 text-amber-500" />
              <span>{zuluTime}</span>
              <span className="text-[10px] text-muted-foreground dark:text-slate-500">({wibTime} WIB)</span>
            </div>

            <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-bold text-[10px] text-emerald-600 uppercase tracking-wider dark:text-emerald-400">
              <span className="inline-block size-2 animate-ping rounded-full bg-emerald-500" />
              STATUS: LIVE
            </div>

            <div className="flex items-center gap-1.5 rounded border border-border bg-muted/50 px-2 py-1 font-medium text-[10px] text-muted-foreground dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
              <Database className="size-3 text-sky-500" />
              <span>{filteredItems.length} ENTITIES TRACKED</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanelOpen((prev) => !prev)}
              className="h-7 gap-1.5 border-amber-500/40 bg-amber-500/10 font-bold text-[11px] text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
            >
              <SlidersHorizontal className="size-3" />
              {panelOpen ? "PANEL FILTER" : "FILTER"}
              {panelOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            </Button>

            <Button
              variant={isFullscreen ? "default" : "outline"}
              size="sm"
              onClick={onToggleFullscreen}
              className="h-7 gap-1 border-border bg-background font-bold text-[11px] text-foreground hover:bg-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
              "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
              panelOpen
                ? "border-amber-400 bg-amber-500 font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
            )}
          >
            <Filter className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            title="Semua Layer Marker"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
              activeTab === "ALL"
                ? "border-sky-400 bg-sky-600 font-bold text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
            )}
          >
            <Layers className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("LAPORAN")}
            title="Hanya Laporan Jaring"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
              activeTab === "LAPORAN"
                ? "border-slate-300 bg-slate-600 font-bold text-white shadow-[0_0_15px_rgba(148,163,184,0.5)]"
                : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
            )}
          >
            <FileText className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("BAKET")}
            title="Hanya Baket"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
              activeTab === "BAKET"
                ? "border-emerald-400 bg-emerald-600 font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
            )}
          >
            <Inbox className="size-4" />
          </button>

          <button
            type="button"
            onClick={() => setTickerOpen((prev) => !prev)}
            title="Toggle Live OSINT Ticker"
            className={cn(
              "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
              tickerOpen
                ? "border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
            )}
          >
            <Activity className="size-4" />
          </button>
        </div>

        {/* MAP CANVAS CONTAINER */}
        <CardContent
          className={cn(
            "relative w-full bg-slate-900 p-0 pt-12 dark:bg-slate-950",
            isFullscreen ? "h-screen" : "h-[640px]",
          )}
        >
          <MapView center={mapCenter} zoom={mapZoom} pitch={mapPitch} className="h-full w-full">
            <MapControls position="top-right" showZoom showCompass />

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
                      className="w-72 max-w-xs border-amber-500/40 font-sans shadow-2xl"
                    >
                      <div className="space-y-2 p-1.5 text-xs">
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

                        <h4 className="line-clamp-2 font-bold text-foreground text-xs leading-snug">{item.title}</h4>
                        <p className="line-clamp-2 text-[11px] text-muted-foreground">{item.content}</p>

                        <div className="space-y-1 border-border border-t pt-1.5 font-mono text-[10px] text-muted-foreground">
                          <div>Jaring: {item.jaringName}</div>
                          <div>Lokasi: {item.locationName}</div>
                          <div>Waktu: {formatDateTime(item.submittedAt)}</div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-1">
                          <Button
                            size="sm"
                            onClick={() => onOpenDetail(item)}
                            className="h-7 w-full gap-1 bg-amber-500 font-bold text-[10px] text-slate-950 hover:bg-amber-400"
                          >
                            Inspeksi Detail
                          </Button>
                        </div>
                      </div>
                    </MapMarkerPopup>
                  ) : null}
                </MapMarker>
              );
            })}
          </MapView>

          {/* FILTER PANEL OVERLAY */}
          {panelOpen ? (
            <div className="absolute top-16 left-14 z-30 max-h-[82vh] w-80 overflow-y-auto rounded-xl border border-border bg-background/95 p-3.5 shadow-2xl backdrop-blur-xl dark:border-amber-500/30 dark:bg-slate-950/95">
              <div className="flex items-center justify-between border-border border-b pb-2 dark:border-slate-800">
                <div className="flex items-center gap-2 font-bold font-mono text-amber-600 text-xs uppercase dark:text-amber-400">
                  <Filter className="size-3.5" />
                  FILTER MATRIX
                </div>
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="font-mono text-[10px] text-muted-foreground hover:text-amber-500"
                >
                  Reset All
                </button>
              </div>

              <div className="mt-3 space-y-3 text-xs">
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
              </div>
            </div>
          ) : null}

          {/* BOTTOM FLOATING MAP CONTROLS */}
          <div className="absolute bottom-10 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/90 p-2 text-xs shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
            <button
              type="button"
              onClick={() => setMapPitch((prev) => (prev === 0 ? 55 : 0))}
              className={cn(
                "rounded border px-2.5 py-1 font-bold font-mono text-[10px] uppercase transition-colors",
                mapPitch > 0
                  ? "border-amber-400 bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                  : "border-border bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {mapPitch > 0 ? "3D PITCH" : "2D MAP"}
            </button>

            <div className="flex items-center gap-2 border-border border-l pl-2 font-mono text-[10px] text-muted-foreground dark:border-slate-800 dark:text-slate-400">
              <span className="font-bold text-amber-600 dark:text-amber-400">CENTER:</span>
              <span>
                {mapCenter[1].toFixed(4)}, {mapCenter[0].toFixed(4)}
              </span>
              <span className="text-muted-foreground dark:text-slate-600">|</span>
              <span className="font-bold text-sky-500">ZOOM:</span>
              <span>{mapZoom.toFixed(1)}</span>
            </div>
          </div>

          {/* BOTTOM LEGEND OVERLAY */}
          <div className="absolute right-3 bottom-10 z-20 hidden flex-wrap items-center gap-3 rounded-lg border border-border bg-background/90 p-2.5 font-mono text-[11px] shadow-xl backdrop-blur-md sm:flex dark:border-slate-800 dark:bg-slate-950/90">
            <span className="font-bold text-amber-600 uppercase dark:text-amber-400">MARKERS LEGEND:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-slate-400" />
              <span className="font-medium text-foreground dark:text-slate-300"> Laporan </span>
            </div>
            <div className="flex items-center gap-1.5 border-border border-l pl-2 dark:border-slate-800">
              <span className="inline-block size-2.5 animate-ping rounded-full bg-rose-500" />
              <span className="font-medium text-rose-500">🔴 URGENT</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-amber-500" />
              <span className="font-medium text-amber-600 dark:text-amber-400">🟠 HIGH</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">🟢 NORMAL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full bg-sky-500" />
              <span className="font-medium text-sky-500">🔵 LOW</span>
            </div>
          </div>

          {/* LIVE TICKER BAR */}
          {tickerOpen ? (
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center border-border border-t bg-background/95 px-3 py-1.5 font-mono text-foreground text-xs dark:border-slate-800 dark:bg-black/95 dark:text-slate-200">
              <div className="flex shrink-0 items-center gap-1.5 border-border border-r pr-3 font-bold text-[10px] text-amber-600 uppercase tracking-wider dark:border-slate-800 dark:text-amber-400">
                <span className="inline-block size-2 animate-ping rounded-full bg-emerald-500" />
                <span>LIVE</span>
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
