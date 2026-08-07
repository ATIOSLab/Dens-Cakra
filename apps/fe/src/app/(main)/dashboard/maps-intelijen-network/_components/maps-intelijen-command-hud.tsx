"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  Archive,
  Crosshair,
  Database,
  Eye,
  FileText,
  Filter,
  Layers3,
  MapPin,
  MapPinOff,
  Minimize2,
  Navigation,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Siren,
  UserRoundCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { buildMapAreaHierarchyOptions } from "./maps-intelijen-area-hierarchy";
import styles from "./maps-intelijen-map-view.module.css";
import {
  formatDateTime,
  getMapFeatureReference,
  getMapFeatureTimestamp,
  getMapFeatureTitle,
  type BaseMapLayer,
  type CommandLayerKey,
  type MapAreaFilterOptions,
  type MapEntityFilterOption,
  type MapNetworkFeature,
  type MapNetworkFilters,
  type MapNetworkResponse,
  type VisualizationMode,
} from "./maps-intelijen-types";

type LayerVisibility = Record<CommandLayerKey, boolean>;

type MapsIntelijenCommandHudProps = {
  features: MapNetworkFeature[];
  displayedFeatures: MapNetworkFeature[];
  meta: MapNetworkResponse["meta"];
  visibleCount: number;
  periodLabel: string;
  activeFilterCount: number;
  isFullscreen: boolean;
  loading: boolean;
  filters: MapNetworkFilters;
  fieldOfficerOptions: MapEntityFilterOption[];
  jaringOptions: MapEntityFilterOption[];
  areaOptions: MapAreaFilterOptions;
  layerVisibility: LayerVisibility;
  visualization: VisualizationMode;
  mapLayer: BaseMapLayer;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
  onFilterChange: (patch: Partial<MapNetworkFilters>) => void;
  onResetFilters: () => void;
  onLayerToggle: (layer: CommandLayerKey) => void;
  onShowAllLayers: () => void;
  onVisualizationChange: (value: VisualizationMode) => void;
  onMapLayerChange: (value: BaseMapLayer) => void;
  onFitFeatures: () => void;
  onResetMap: () => void;
  onOpenDetail: (feature: MapNetworkFeature) => void;
};

const hudControlClass =
  "h-9 w-full rounded-md border border-slate-700 bg-slate-950/90 px-2 text-xs text-slate-100 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

function formatWibTime(value: Date | null) {
  if (!value) return "--:--:--";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(value);
}

function formatTickerAge(value: string | null, now: Date | null) {
  if (!value || !now) return "waktu belum tersedia";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "waktu belum tersedia";
  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return "baru saja";
  if (elapsedMinutes < 60) return `${elapsedMinutes} mnt lalu`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} jam lalu`;
  return `${Math.floor(elapsedHours / 24)} hari lalu`;
}

function featureLayer(feature: MapNetworkFeature): CommandLayerKey {
  if (feature.properties.markerType === "report") return "report";
  if (feature.properties.markerType === "baket") return "baket";
  return feature.properties.agentState === "active" ? "agent_active" : "agent_last_known";
}

export function MapsIntelijenCommandHud({
  features,
  displayedFeatures,
  meta,
  visibleCount,
  periodLabel,
  activeFilterCount,
  isFullscreen,
  loading,
  filters,
  fieldOfficerOptions,
  jaringOptions,
  areaOptions,
  layerVisibility,
  visualization,
  mapLayer,
  onRefresh,
  onToggleFullscreen,
  onFilterChange,
  onResetFilters,
  onLayerToggle,
  onShowAllLayers,
  onVisualizationChange,
  onMapLayerChange,
  onFitFeatures,
  onResetMap,
  onOpenDetail,
}: MapsIntelijenCommandHudProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const areaHierarchyOptions = buildMapAreaHierarchyOptions(areaOptions, filters);

  useEffect(() => {
    if (!isFullscreen) return;
    const updateClock = () => setNow(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(interval);
  }, [isFullscreen]);

  const intelligence = useMemo(() => {
    const reportTotal =
      meta.summary.reports.total ??
      (meta.summary.reports.complete ?? 0) + (meta.summary.reports.incomplete ?? 0);
    const baketTotal = meta.summary.bakets.total ?? 0;
    const agentTotal = meta.counts.agent ?? 0;
    const unlocated =
      (meta.summary.reports.unlocated ?? 0) +
      (meta.summary.bakets.unlocated ?? 0) +
      (meta.counts.unlocatedAgent ?? 0);
    const urgent = features.filter(({ properties }) => properties.urgency === "URGENT").length;
    const high = features.filter(({ properties }) => properties.urgency === "HIGH").length;
    const areaCounts = countByEntries(features, (feature) => feature.properties.primaryArea?.name ?? "Belum ditentukan");
    const categoryCounts = countByEntries(
      features.filter((feature) => feature.properties.markerType !== "agent"),
      (feature) => feature.properties.category?.name ?? "Belum dikategorikan",
    );
    const urgencyCounts = countBy(
      features.filter((feature) => feature.properties.markerType !== "agent"),
      (feature) => feature.properties.urgency ?? "NORMAL",
    );
    const layerCounts = countBy(features, featureLayer);
    const total = reportTotal + baketTotal + agentTotal;
    const mapped = (meta.summary.reports.mappable ?? 0) + (meta.summary.bakets.mappable ?? 0) + agentTotal;

    return {
      reportTotal,
      baketTotal,
      agentTotal,
      total,
      unlocated,
      urgent,
      high,
      coverage: total > 0 ? Math.round((mapped / total) * 100) : 0,
      areaCounts,
      categoryCounts,
      urgencyCounts,
      layerCounts,
      feed: [...features]
        .sort((left, right) => {
          const leftTime = new Date(getMapFeatureTimestamp(left) ?? 0).getTime();
          const rightTime = new Date(getMapFeatureTimestamp(right) ?? 0).getTime();
          return rightTime - leftTime;
        })
        .slice(0, 8),
    };
  }, [features, meta]);

  if (!isFullscreen) {
    return (
      <div className="pointer-events-none absolute bottom-3 left-14 z-20 hidden grid-cols-3 gap-2 xl:grid">
        <CompactMetric label="Titik viewport" value={visibleCount} icon={MapPin} tone="cyan" />
        <CompactMetric label="Urgent terpetakan" value={intelligence.urgent} icon={AlertTriangle} tone="red" />
        <CompactMetric label="Tanpa koordinat" value={intelligence.unlocated} icon={MapPinOff} tone="amber" />
      </div>
    );
  }

  const layerCards: Array<{
    key: CommandLayerKey;
    label: string;
    icon: typeof FileText;
    count: number;
    tone: string;
  }> = [
    { key: "report", label: "Laporan", icon: FileText, count: intelligence.layerCounts.report ?? 0, tone: "violet" },
    { key: "baket", label: "Baket", icon: Archive, count: intelligence.layerCounts.baket ?? 0, tone: "amber" },
    {
      key: "agent_active",
      label: "Personel Aktif",
      icon: Navigation,
      count: intelligence.layerCounts.agent_active ?? 0,
      tone: "blue",
    },
    {
      key: "agent_last_known",
      label: "Lokasi Terakhir",
      icon: MapPin,
      count: intelligence.layerCounts.agent_last_known ?? 0,
      tone: "slate",
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 font-sans text-slate-100">
      <header className="pointer-events-auto absolute inset-x-3 top-3 flex h-14 items-center justify-between gap-3 rounded-xl border border-cyan-400/25 bg-slate-950/95 px-3 shadow-2xl backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative grid size-9 shrink-0 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
            <ShieldCheck className="size-5" aria-hidden />
            <span className="absolute -top-0.5 -right-0.5 size-2 animate-pulse rounded-full bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-sm tracking-[0.08em] sm:text-base">DENS CAKRA</p>
            <p className="truncate text-[9px] text-slate-400 uppercase tracking-[0.2em]">
              Intelligence Network Map
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <StatusChip icon={Activity} label={loading ? "Sinkronisasi" : "Status: live"} active={!loading} />
          <StatusChip icon={Filter} label={`${activeFilterCount} filter aktif`} />
          <StatusChip icon={Crosshair} label={`${intelligence.coverage}% terpetakan`} />
          <span className="h-7 w-px bg-slate-800" />
          <div className="text-right">
            <p className="font-bold font-mono text-sm tabular-nums">UTC+7 / {formatWibTime(now)} WIB</p>
            <p className="text-[9px] text-slate-500">{periodLabel}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setLeftPanelOpen((current) => !current)}
            aria-label={leftPanelOpen ? "Tutup panel filter" : "Buka panel filter"}
            aria-pressed={leftPanelOpen}
            title={leftPanelOpen ? "Tutup panel filter" : "Buka panel filter"}
            className={cn(
              "hidden border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white xl:inline-flex",
              leftPanelOpen && "border-cyan-400/50 text-cyan-300",
            )}
          >
            <Filter className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setRightPanelOpen((current) => !current)}
            aria-label={rightPanelOpen ? "Tutup panel ringkasan dan feed" : "Buka panel ringkasan dan feed"}
            aria-pressed={rightPanelOpen}
            title={rightPanelOpen ? "Tutup panel ringkasan dan feed" : "Buka panel ringkasan dan feed"}
            className={cn(
              "hidden border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white xl:inline-flex",
              rightPanelOpen && "border-cyan-400/50 text-cyan-300",
            )}
          >
            <Layers3 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setAnalyticsOpen((current) => !current)}
            aria-label={analyticsOpen ? "Tutup panel analitik" : "Buka panel analitik"}
            aria-pressed={analyticsOpen}
            title={analyticsOpen ? "Tutup panel analitik" : "Buka panel analitik"}
            className={cn(
              "hidden border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white xl:inline-flex",
              analyticsOpen && "border-cyan-400/50 text-cyan-300",
            )}
          >
            <Database className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Sinkronkan ulang data"
            className="border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onToggleFullscreen}
            aria-label="Keluar layar penuh"
            className="border-slate-700 bg-slate-900/80 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <Minimize2 className="size-4" />
          </Button>
        </div>
      </header>

      <section className="absolute inset-x-3 top-[4.75rem] hidden h-[4.6rem] grid-cols-6 gap-2 xl:grid" aria-label="Indikator utama">
        <KpiCard label="Total Entitas" value={intelligence.total} detail={periodLabel} icon={Database} tone="cyan" />
        <KpiCard label="Laporan Jaring" value={intelligence.reportTotal} detail="Sesuai filter" icon={FileText} tone="violet" />
        <KpiCard label="Baket" value={intelligence.baketTotal} detail="Sesuai filter" icon={Archive} tone="amber" />
        <KpiCard label="Personel Aktif" value={meta.counts.activeAgents} detail={`Aktif ${meta.freshness.activeWithinMinutes} menit`} icon={UserRoundCheck} tone="blue" />
        <KpiCard label="Wilayah Terpantau" value={meta.facets.areas.length} detail="Dalam cakupan akses" icon={MapPin} tone="emerald" />
        <KpiCard label="Urgent & High" value={intelligence.urgent + intelligence.high} detail={`${intelligence.urgent} urgent`} icon={Siren} tone="red" />
      </section>

      {leftPanelOpen ? (
        <aside className="pointer-events-auto absolute bottom-[3.35rem] left-3 top-[9.9rem] hidden w-64 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl xl:flex xl:flex-col">
        <div className="border-b border-slate-800 p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-semibold text-xs uppercase tracking-[0.12em]">
              <Filter className="size-3.5 text-cyan-300" /> Filter & Pencarian
            </h3>
            <span className="rounded bg-cyan-400/10 px-1.5 py-0.5 text-[9px] text-cyan-300">{activeFilterCount} aktif</span>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
          <label className="grid gap-1 text-[10px] text-slate-400">
            Pencarian
            <span className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5" />
              <Input
                value={filters.search}
                onChange={(event) => onFilterChange({ search: event.target.value })}
                placeholder="Referensi, judul, Jaring, wilayah..."
                className="h-9 border-slate-700 bg-slate-950/90 pl-8 text-xs text-slate-100 placeholder:text-slate-600"
              />
            </span>
          </label>
          <HudSelect label="Periode" value={filters.period} onChange={(value) => onFilterChange({ period: value as MapNetworkFilters["period"] })} options={[["ALL", "Semua waktu"], ["TODAY", "Hari ini"], ["LAST_7_DAYS", "7 hari terakhir"], ["LAST_30_DAYS", "30 hari terakhir"], ["THIS_MONTH", "Bulan berjalan"], ["CUSTOM", "Rentang kustom"]]} />
          {filters.period === "CUSTOM" ? (
            <div className="grid grid-cols-2 gap-2">
              <HudDate label="Mulai" value={filters.startDate} onChange={(value) => onFilterChange({ startDate: value })} />
              <HudDate label="Selesai" value={filters.endDate} onChange={(value) => onFilterChange({ endDate: value })} />
            </div>
          ) : null}
          <HudSelect label="Jenis Data" value={filters.dataType} onChange={(value) => onFilterChange({ dataType: value as MapNetworkFilters["dataType"] })} options={[["ALL", "Semua layer endpoint"], ["REPORT", "Laporan Jaring"], ["BAKET", "Baket"], ["AGENT", "Personel Lapangan"]]} />
          <HudSelect label="Kelengkapan" value={filters.completeness} onChange={(value) => onFilterChange({ completeness: value as MapNetworkFilters["completeness"] })} options={[["ALL", "Semua"], ["COMPLETE", "Lengkap"], ["INCOMPLETE", "Tidak lengkap"]]} />
          <HudSelect label="Urgensi" value={filters.urgency} onChange={(value) => onFilterChange({ urgency: value as MapNetworkFilters["urgency"] })} options={[["ALL", "Semua"], ["URGENT", "Urgent"], ["HIGH", "High"], ["NORMAL", "Normal"], ["LOW", "Low"]]} />
          <HudSelect label="Kategori" value={filters.categoryId} onChange={(value) => onFilterChange({ categoryId: value })} options={[["ALL", "Semua kategori"], ...meta.facets.categories.map((item) => [item.id, item.name] as [string, string])]} />
          <HudSelect
            label="Petugas Wilayah (Gaswil)"
            value={filters.fieldOfficerAssignmentId}
            onChange={(fieldOfficerAssignmentId) => onFilterChange({ fieldOfficerAssignmentId })}
            options={[
              ["ALL", "Semua Petugas Wilayah"],
              ...fieldOfficerOptions.map((item) => [item.id, item.label] as [string, string]),
            ]}
          />
          <HudSelect
            label="Jaring"
            value={filters.jaringId}
            onChange={(jaringId) => onFilterChange({ jaringId })}
            options={[
              ["ALL", "Semua Jaring"],
              ...jaringOptions.map((item) => [item.id, item.label] as [string, string]),
            ]}
          />
          <HudSelect
            label="Provinsi"
            value={filters.provinceId}
            disabled={areaOptions.loadingLevel === "province"}
            onChange={(provinceId) =>
              onFilterChange({ provinceId, regencyId: "ALL", districtId: "ALL", villageId: "ALL" })
            }
            options={areaHierarchyOptions.provinces}
          />
          <HudSelect
            label="Kabupaten/Kota"
            value={filters.regencyId}
            disabled={filters.provinceId === "ALL" || areaOptions.loadingLevel === "regency"}
            onChange={(regencyId) => onFilterChange({ regencyId, districtId: "ALL", villageId: "ALL" })}
            options={areaHierarchyOptions.regencies}
          />
          <HudSelect
            label="Kecamatan"
            value={filters.districtId}
            disabled={filters.regencyId === "ALL" || areaOptions.loadingLevel === "district"}
            onChange={(districtId) => onFilterChange({ districtId, villageId: "ALL" })}
            options={areaHierarchyOptions.districts}
          />
          <HudSelect
            label="Kelurahan/Desa"
            value={filters.villageId}
            disabled={filters.districtId === "ALL" || areaOptions.loadingLevel === "village"}
            onChange={(villageId) => onFilterChange({ villageId })}
            options={areaHierarchyOptions.villages}
          />
          <HudSelect label="Kesesuaian Wilayah" value={filters.suitability} onChange={(value) => onFilterChange({ suitability: value })} options={[["ALL", "Semua"], ["WITHIN_SCOPE", "Dalam penugasan"], ["OUTSIDE_SCOPE", "Di luar penugasan"], ["BORDER_AMBIGUOUS", "Area perbatasan"], ["NOT_DETERMINED", "Belum ditentukan"]]} />
          <HudSelect label="Status Personel" value={filters.agentState} onChange={(value) => onFilterChange({ agentState: value as MapNetworkFilters["agentState"] })} options={[["ALL", "Semua"], ["active", "Aktif"], ["last_known", "Lokasi terakhir"]]} />
          <div className="grid grid-cols-2 gap-2">
            <HudNumber
              label="Aktif (menit)"
              value={filters.activeWithinMinutes}
              min={1}
              max={Math.min(1440, filters.lastKnownWithinHours * 60)}
              onChange={(value) => onFilterChange({ activeWithinMinutes: value })}
            />
            <HudNumber
              label="Lokasi akhir (jam)"
              value={filters.lastKnownWithinHours}
              min={Math.ceil(filters.activeWithinMinutes / 60)}
              max={2160}
              onChange={(value) => onFilterChange({ lastKnownWithinHours: value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-800 p-3">
          <Button variant="outline" size="sm" onClick={onResetFilters} className="border-slate-700 bg-slate-900 text-slate-200">
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={onRefresh} disabled={loading} className="bg-violet-600 text-white hover:bg-violet-500">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Terapkan
          </Button>
        </div>
        </aside>
      ) : null}

      <nav
        className={cn(
          "pointer-events-auto absolute top-[9.9rem] hidden h-12 items-center gap-1.5 rounded-xl border border-slate-700/80 bg-slate-950/95 px-2 shadow-2xl backdrop-blur-xl xl:flex",
          leftPanelOpen ? "left-[17.25rem]" : "left-3",
          rightPanelOpen ? "right-[19.25rem]" : "right-3",
        )}
        aria-label="Layer peta"
      >
        {layerCards.map(({ key, ...rest }) => (
          <LayerButton key={key} {...rest} active={layerVisibility[key]} onClick={() => onLayerToggle(key)} />
        ))}
        <button type="button" onClick={onShowAllLayers} className="ml-auto h-8 rounded-md border border-slate-700 px-2 text-[10px] text-slate-300 hover:bg-slate-800">
          Semua Layer
        </button>
        <select value={visualization} onChange={(event) => onVisualizationChange(event.target.value as VisualizationMode)} aria-label="Mode visualisasi" className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-100">
          <option value="marker">Marker</option>
          <option value="cluster">Cluster</option>
          <option value="heatmap">Heatmap</option>
        </select>
        <select value={mapLayer} onChange={(event) => onMapLayerChange(event.target.value as BaseMapLayer)} aria-label="Peta dasar" className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[10px] text-slate-100">
          <option value="dark">Dark</option>
          <option value="satellite">Satellite</option>
          <option value="terrain">Terrain</option>
          <option value="light">Light</option>
          <option value="osm">OSM</option>
        </select>
      </nav>

      <div
        className={cn(
          "pointer-events-auto absolute hidden items-center gap-1.5 xl:flex",
          leftPanelOpen ? "left-[17.25rem]" : "left-3",
          analyticsOpen ? "bottom-[12.25rem]" : "bottom-[3.35rem]",
        )}
      >
        <HudMapButton label="Sesuaikan ke semua titik" icon={Crosshair} onClick={onFitFeatures} />
        <HudMapButton label="Reset posisi peta" icon={RotateCcw} onClick={onResetMap} />
      </div>

      {rightPanelOpen ? (
        <aside className="pointer-events-auto absolute bottom-[3.35rem] right-3 top-[9.9rem] hidden w-[18rem] flex-col gap-2 xl:flex">
        <section className="rounded-xl border border-slate-700/80 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl">
          <h3 className="mb-2 flex items-center justify-between font-semibold text-xs uppercase tracking-[0.12em]">
            <span className="flex items-center gap-2"><Layers3 className="size-3.5 text-cyan-300" /> Ringkasan Layer</span>
            <span className="font-mono text-[10px] text-slate-500">{displayedFeatures.length}</span>
          </h3>
          <div className="space-y-1.5">
            {layerCards.map((layer) => (
              <LayerSummary key={layer.key} label={layer.label} count={layer.count} active={layerVisibility[layer.key]} tone={layer.tone} />
            ))}
            <LayerSummary label="Tanpa Koordinat" count={intelligence.unlocated} active tone="amber" />
          </div>
          <p className="mt-2 border-t border-slate-800 pt-2 text-[9px] leading-relaxed text-slate-500">
            Lokasi stealth dikecualikan oleh kebijakan keamanan endpoint.
          </p>
        </section>

        <section className="min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-800 p-3">
            <h3 className="flex items-center gap-2 font-semibold text-xs uppercase tracking-[0.12em]"><Activity className="size-3.5 text-cyan-300" /> Feed Intelijen</h3>
            <span className="text-[9px] text-slate-500">Terbaru</span>
          </div>
          <div className="h-full space-y-2 overflow-y-auto p-2 pb-12">
            {intelligence.feed.map((feature) => (
              <FeedItem key={feature.id} feature={feature} onClick={() => onOpenDetail(feature)} />
            ))}
            {intelligence.feed.length === 0 ? <p className="p-4 text-center text-xs text-slate-500">Belum ada data sesuai filter.</p> : null}
          </div>
        </section>
        </aside>
      ) : null}

      {analyticsOpen ? (
        <section
          className={cn(
            "pointer-events-auto absolute bottom-[3.35rem] hidden h-[7.9rem] grid-cols-4 gap-2 xl:grid",
            leftPanelOpen ? "left-[17.25rem]" : "left-3",
            rightPanelOpen ? "right-[19.25rem]" : "right-3",
          )}
          aria-label="Analitik ringkas"
        >
        <MiniAnalytics title="Distribusi Jenis Data" icon={Database} items={[
          ["Laporan", intelligence.layerCounts.report ?? 0, "violet"],
          ["Baket", intelligence.layerCounts.baket ?? 0, "amber"],
          ["Personel", intelligence.agentTotal, "blue"],
        ]} />
        <MiniAnalytics title="Distribusi Urgensi" icon={Siren} items={[
          ["Urgent", intelligence.urgencyCounts.URGENT ?? 0, "red"],
          ["High", intelligence.urgencyCounts.HIGH ?? 0, "amber"],
          ["Normal", intelligence.urgencyCounts.NORMAL ?? 0, "emerald"],
        ]} />
        <MiniAnalytics title="Top Kategori" icon={Layers3} items={intelligence.categoryCounts.slice(0, 3).map(([label, count]) => [label, count, "violet"] as [string, number, string])} />
        <MiniAnalytics title="Wilayah Teratas" icon={MapPin} items={intelligence.areaCounts.slice(0, 3).map(([label, count]) => [label, count, "cyan"] as [string, number, string])} />
        </section>
      ) : null}

      <section
        aria-label="Live feed intelijen bergerak"
        className="pointer-events-auto absolute inset-x-3 bottom-3 z-50 flex h-8 overflow-hidden rounded-md border border-slate-700/90 bg-slate-100 text-slate-900 shadow-2xl"
      >
        <div className="relative z-10 flex shrink-0 items-center gap-2 bg-rose-600 px-3 font-bold font-mono text-[10px] text-white uppercase tracking-[0.12em] shadow-[8px_0_16px_rgba(225,29,72,0.2)]">
          <span className="size-2 animate-pulse rounded-full bg-white" aria-hidden />
          Live Feed
        </div>
        <div className={cn("min-w-0 flex-1 overflow-hidden", styles.tickerViewport)}>
          {intelligence.feed.length > 0 ? (
            <div className={styles.tickerTrack}>
              {[0, 1].map((copy) => (
                <div key={copy} className="flex min-w-full shrink-0 items-center" aria-hidden={copy === 1}>
                  {intelligence.feed.map((feature) => (
                    <TickerItem
                      key={`${copy}:${feature.id}`}
                      feature={feature}
                      now={now}
                      duplicate={copy === 1}
                      onClick={() => onOpenDetail(feature)}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="flex h-full items-center px-4 font-mono text-[10px] text-slate-500">
              Belum ada feed intelijen sesuai filter.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function TickerItem({
  feature,
  now,
  duplicate,
  onClick,
}: {
  feature: MapNetworkFeature;
  now: Date | null;
  duplicate: boolean;
  onClick: () => void;
}) {
  const properties = feature.properties;
  const status =
    properties.markerType === "agent"
      ? properties.agentState === "active"
        ? "AKTIF"
        : "LOKASI TERAKHIR"
      : properties.urgency ?? "NORMAL";
  const statusClass =
    status === "URGENT"
      ? "border-rose-300 bg-rose-100 text-rose-700"
      : status === "HIGH"
        ? "border-amber-300 bg-amber-100 text-amber-700"
        : status === "AKTIF"
          ? "border-emerald-300 bg-emerald-100 text-emerald-700"
          : "border-sky-300 bg-sky-100 text-sky-700";
  const area = properties.primaryArea?.name ?? "Wilayah belum ditentukan";

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={duplicate ? -1 : 0}
      className="flex h-8 shrink-0 items-center gap-2 border-r border-slate-300 px-3 font-mono text-[10px] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500"
      aria-label={`Buka detail ${getMapFeatureTitle(feature)}`}
    >
      <span className={cn("rounded border px-1.5 py-0.5 font-bold text-[9px]", statusClass)}>{status}</span>
      <span className="max-w-[24rem] truncate font-semibold">{getMapFeatureTitle(feature)}</span>
      <span className="max-w-[22rem] truncate text-slate-500">({area})</span>
      <span className="shrink-0 font-semibold text-amber-600">
        [{formatTickerAge(getMapFeatureTimestamp(feature), now)}]
      </span>
    </button>
  );
}

function countBy<T>(items: T[], keyFor: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = keyFor(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function countByEntries<T>(items: T[], keyFor: (item: T) => string) {
  return Object.entries(countBy(items, keyFor)).sort((left, right) => right[1] - left[1]);
}

function HudSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1 text-[10px] text-slate-400">
      {label}
      <select
        className={hudControlClass}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function HudDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-[10px] text-slate-400">
      {label}
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="h-9 border-slate-700 bg-slate-950/90 px-1.5 text-[10px] text-slate-100" />
    </label>
  );
}

function HudNumber({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-1 text-[10px] text-slate-400">
      {label}
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(Math.max(min, Math.min(max, Number(event.target.value) || min)))}
        className="h-9 border-slate-700 bg-slate-950/90 px-2 text-[10px] text-slate-100"
      />
    </label>
  );
}

function LayerButton({ label, icon: Icon, count, active, tone, onClick }: { label: string; icon: typeof FileText; count: number; active: boolean; tone: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("flex h-8 items-center gap-1.5 rounded-md border px-2 text-[10px] transition", active ? toneClasses(tone, "button") : "border-slate-800 bg-slate-900/60 text-slate-500")}>
      <Icon className="size-3.5" /> {label}<span className="font-mono tabular-nums opacity-80">{count.toLocaleString("id-ID")}</span>
    </button>
  );
}

function LayerSummary({ label, count, active, tone }: { label: string; count: number; active: boolean; tone: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-[10px]", !active && "opacity-40")}>
      <span className={cn("size-2 rounded-sm", toneClasses(tone, "dot"))} />
      <span className="min-w-0 flex-1 truncate text-slate-300">{label}</span>
      <strong className="font-mono tabular-nums text-slate-100">{count.toLocaleString("id-ID")}</strong>
    </div>
  );
}

function FeedItem({ feature, onClick }: { feature: MapNetworkFeature; onClick: () => void }) {
  const properties = feature.properties;
  const urgency = properties.urgency ?? (properties.agentState === "active" ? "ACTIVE" : "LAST_KNOWN");
  return (
    <button type="button" onClick={onClick} className={cn("block w-full rounded-lg border border-slate-800 bg-slate-900/65 p-2 text-left transition hover:border-cyan-400/40 hover:bg-slate-900", properties.urgency === "URGENT" && "border-red-500/40", properties.urgency === "HIGH" && "border-amber-500/40")}>
      <div className="flex items-center justify-between gap-2 text-[9px]">
        <span className="font-mono text-slate-500">{formatDateTime(getMapFeatureTimestamp(feature))}</span>
        <span className={cn("rounded px-1.5 py-0.5 font-semibold", properties.urgency === "URGENT" ? "bg-red-500/15 text-red-300" : properties.urgency === "HIGH" ? "bg-amber-500/15 text-amber-300" : properties.markerType === "agent" ? "bg-blue-500/15 text-blue-300" : "bg-emerald-500/15 text-emerald-300")}>{urgency.replace("_", " ")}</span>
      </div>
      <p className="mt-1 line-clamp-1 font-semibold text-[11px] text-slate-100">{getMapFeatureTitle(feature)}</p>
      <p className="mt-0.5 line-clamp-1 text-[9px] text-slate-400">{properties.primaryArea?.name ?? "Wilayah belum ditentukan"} · {getMapFeatureReference(feature)}</p>
      <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-cyan-300"><Eye className="size-3" /> Lihat detail</span>
    </button>
  );
}

function MiniAnalytics({ title, icon: Icon, items }: { title: string; icon: typeof Database; items: Array<[string, number, string]> }) {
  const maximum = Math.max(1, ...items.map((item) => item[1]));
  return (
    <article className="overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/95 p-2.5 shadow-2xl backdrop-blur-xl">
      <h3 className="mb-2 flex items-center gap-1.5 truncate text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400"><Icon className="size-3 text-cyan-300" /> {title}</h3>
      <div className="space-y-1.5">
        {items.map(([label, count, tone]) => (
          <div key={label} className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-2 text-[9px]">
            <div className="min-w-0">
              <div className="mb-0.5 truncate text-slate-300" title={label}>{label}</div>
              <div className="h-1 overflow-hidden rounded-full bg-slate-800"><div className={cn("h-full rounded-full", toneClasses(tone, "bar"))} style={{ width: `${Math.max(3, (count / maximum) * 100)}%` }} /></div>
            </div>
            <strong className="text-right font-mono tabular-nums text-slate-100">{count.toLocaleString("id-ID")}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

function toneClasses(tone: string, kind: "button" | "dot" | "bar") {
  const values: Record<string, { button: string; dot: string; bar: string }> = {
    cyan: { button: "border-cyan-400/40 bg-cyan-400/10 text-cyan-200", dot: "bg-cyan-400", bar: "bg-cyan-400" },
    violet: { button: "border-violet-400/40 bg-violet-400/10 text-violet-200", dot: "bg-violet-400", bar: "bg-violet-400" },
    amber: { button: "border-amber-400/40 bg-amber-400/10 text-amber-200", dot: "bg-amber-400", bar: "bg-amber-400" },
    blue: { button: "border-blue-400/40 bg-blue-400/10 text-blue-200", dot: "bg-blue-400", bar: "bg-blue-400" },
    slate: { button: "border-slate-500 bg-slate-500/10 text-slate-200", dot: "bg-slate-400", bar: "bg-slate-400" },
    red: { button: "border-red-400/40 bg-red-400/10 text-red-200", dot: "bg-red-400", bar: "bg-red-400" },
    emerald: { button: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200", dot: "bg-emerald-400", bar: "bg-emerald-400" },
  };
  return values[tone]?.[kind] ?? values.slate[kind];
}

function KpiCard({ label, value, detail, icon: Icon, tone }: { label: string; value: number; detail: string; icon: typeof Database; tone: string }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-950/95 p-2.5 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2"><p className="truncate text-[9px] uppercase tracking-[0.08em] text-slate-400">{label}</p><Icon className={cn("size-3.5", toneClasses(tone, "button").split(" ").at(-1))} /></div>
      <p className="mt-1 font-bold font-mono text-lg leading-none tabular-nums">{value.toLocaleString("id-ID")}</p>
      <p className="mt-1 truncate text-[8px] text-slate-500">{detail}</p>
    </article>
  );
}

function HudMapButton({ label, icon: Icon, onClick }: { label: string; icon: typeof Crosshair; onClick: () => void }) {
  return <Button type="button" variant="outline" size="icon-sm" onClick={onClick} aria-label={label} title={label} className="border-slate-700 bg-slate-950/90 text-slate-200 hover:bg-slate-800"><Icon className="size-4" /></Button>;
}

function CompactMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof MapPin; tone: "cyan" | "red" | "amber" }) {
  return (
    <div className="min-w-32 rounded-lg border border-slate-700/80 bg-slate-950/90 px-3 py-2 text-slate-100 shadow-lg backdrop-blur-xl">
      <div className="flex items-center gap-2"><Icon className={cn("size-3.5", tone === "cyan" && "text-cyan-300", tone === "red" && "text-red-400", tone === "amber" && "text-amber-300")} /><span className="text-[9px] text-slate-400 uppercase tracking-[0.1em]">{label}</span></div>
      <p className="mt-1 font-bold font-mono text-lg tabular-nums">{value.toLocaleString("id-ID")}</p>
    </div>
  );
}

function StatusChip({ icon: Icon, label, active = false }: { icon: typeof MapPin; label: string; active?: boolean }) {
  return <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/75 px-2.5 text-[9px] uppercase tracking-wide text-slate-300", active && "border-emerald-400/30 bg-emerald-400/10 text-emerald-300")}><Icon className="size-3" />{label}</span>;
}
