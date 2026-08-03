"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import type {
  AdminLayersState,
  CoordinateSourceMode,
  DateRangeOption,
  DisplayMode,
  MapStyleMode,
} from "./sebaran-jaring-types";

type Props = {
  displayMode: DisplayMode;
  onDisplayModeChange: (mode: DisplayMode) => void;
  mapStyle: MapStyleMode;
  onMapStyleChange: (style: MapStyleMode) => void;
  adminLayers: AdminLayersState;
  onAdminLayersChange: (layers: AdminLayersState) => void;
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
  centerCoords: string;
  zoomLevel: string;
  adminLevelLabel: string;
};

export function SebaranJaringBottomBar({
  displayMode,
  onDisplayModeChange,
  mapStyle,
  onMapStyleChange,
  adminLayers,
  onAdminLayersChange,
  dateRange,
  onDateRangeChange,
  centerCoords,
  zoomLevel,
  adminLevelLabel,
}: Props) {
  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md px-3.5 py-2 rounded-xl flex flex-col gap-1.5 shadow-xl transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* MODE TAMPILAN */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">MODE TAMPILAN</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {(
              [
                ["marker", "Marker", "📍"],
                ["cluster", "Cluster", "❇️"],
                ["heatmap", "Heatmap", "📊"],
              ] as const
            ).map(([mode, label, icon]) => (
              <button
                key={mode}
                onClick={() => onDisplayModeChange(mode as DisplayMode)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                  displayMode === mode ? "bg-blue-600 text-white font-semibold shadow" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span className="text-[10px]">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LAYER PETA (Thumbnails style) */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">LAYER PETA</span>
          <div className="flex items-center gap-1.5">
            {(
              [
                ["dark", "Dark", "#0f172a"],
                ["street", "Street", "#1e293b"],
                ["satellite", "Satellite", "#064e3b"],
                ["terrain", "Terrain", "#451a03"],
              ] as const
            ).map(([style, label, bg]) => (
              <button
                key={style}
                onClick={() => onMapStyleChange(style as MapStyleMode)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                  mapStyle === style
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                <span className="size-3 rounded-sm border border-slate-400 dark:border-slate-700 shrink-0" style={{ backgroundColor: bg }} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* LAPISAN ADMINISTRASI */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">LAPISAN ADMINISTRASI ℹ️</span>
          <div className="flex items-center gap-3 text-xs bg-slate-100 dark:bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
              <Checkbox
                checked={adminLayers.province}
                onCheckedChange={(c) => onAdminLayersChange({ ...adminLayers, province: !!c })}
                className="size-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
              />
              <span>Provinsi</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
              <Checkbox
                checked={adminLayers.city}
                onCheckedChange={(c) => onAdminLayersChange({ ...adminLayers, city: !!c })}
                className="size-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
              />
              <span>Kota / Kabupaten</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
              <Checkbox
                checked={adminLayers.district}
                onCheckedChange={(c) => onAdminLayersChange({ ...adminLayers, district: !!c })}
                className="size-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
              />
              <span>Kecamatan</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer">
              <Checkbox
                checked={adminLayers.village}
                onCheckedChange={(c) => onAdminLayersChange({ ...adminLayers, village: !!c })}
                className="size-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-blue-600"
              />
              <span>Kelurahan</span>
            </label>
          </div>
        </div>

        {/* RENTANG WAKTU LAPORAN */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">RENTANG WAKTU LAPORAN</span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              {(["24H", "7D", "30D", "CUSTOM"] as DateRangeOption[]).map((option) => (
                <button
                  key={option}
                  onClick={() => onDateRangeChange(option)}
                  className={cn(
                    "px-2.5 py-0.5 rounded transition-colors cursor-pointer",
                    dateRange === option ? "bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  )}
                >
                  {option === "24H" ? "24 Jam" : option === "7D" ? "7 Hari" : option === "30D" ? "30 Hari" : "Custom"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Status Telemetry Bar */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800/60">
        <div className="flex items-center gap-4">
          <span>Koordinat: {centerCoords}</span>
          <span>Zoom: {zoomLevel}</span>
          <span>Level: {adminLevelLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <span>Sumber Data: CAKRA OSINT</span>
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
