"use client";

import { useState } from "react";

import { ChevronUp, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
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
  dateRange: DateRangeOption;
  onDateRangeChange: (range: DateRangeOption) => void;
  coordinateSourceMode: CoordinateSourceMode;
  onCoordinateSourceModeChange: (mode: CoordinateSourceMode) => void;
  centerCoords: string;
  zoomLevel: string;
  adminLevelLabel: string;
};

export function SebaranJaringBottomBar({
  displayMode,
  onDisplayModeChange,
  mapStyle,
  onMapStyleChange,
  dateRange,
  onDateRangeChange,
  coordinateSourceMode,
  onCoordinateSourceModeChange,
  centerCoords,
  zoomLevel,
  adminLevelLabel,
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="absolute bottom-3 right-4 z-20">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-slate-200 border border-slate-700/80 backdrop-blur-md shadow-2xl text-xs font-mono font-medium hover:bg-slate-800 hover:text-cyan-400 transition-all cursor-pointer"
        >
          <SlidersHorizontal className="size-3.5 text-cyan-400" />
          <span>Panel Kontrol Peta</span>
          <ChevronUp className="size-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md px-3.5 py-2 rounded-xl flex flex-col gap-1.5 shadow-xl transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pr-8 relative">
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="absolute -top-1 -right-1 p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
          title="Tutup Panel Kontrol"
        >
          <X className="size-4" />
        </button>
        {/* MODE TAMPILAN */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            MODE TAMPILAN
          </span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {(
              [
                ["marker", "Titik", "📍"],
                ["cluster", "Kelompok", "❇️"],
                ["heatmap", "Kepadatan", "📊"],
              ] as const
            ).map(([mode, label, icon]) => (
              <button
                type="button"
                key={mode}
                onClick={() => onDisplayModeChange(mode as DisplayMode)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer",
                  displayMode === mode
                    ? "bg-blue-600 text-white font-semibold shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
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
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            LAYER PETA
          </span>
          <div className="flex items-center gap-1.5">
            {(
              [
                ["dark", "Gelap", "#0f172a"],
                ["street", "Jalan", "#1e293b"],
                ["satellite", "Satelit", "#064e3b"],
                ["terrain", "Medan", "#451a03"],
              ] as const
            ).map(([style, label, bg]) => (
              <button
                type="button"
                key={style}
                onClick={() => onMapStyleChange(style as MapStyleMode)}
                className={cn(
                  "px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1.5 transition-all cursor-pointer",
                  mapStyle === style
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500"
                    : "border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                )}
              >
                <span
                  className="size-3 rounded-sm border border-slate-400 dark:border-slate-700 shrink-0"
                  style={{ backgroundColor: bg }}
                />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SUMBER KOORDINAT */}
        <div className="hidden xl:flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            SUMBER TITIK
          </span>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs dark:border-slate-800 dark:bg-slate-950/80">
            {(
              [
                ["domisili", "Penempatan Jaring"],
                ["laporan", "Lokasi Laporan"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => onCoordinateSourceModeChange(mode)}
                className={cn(
                  "rounded px-2.5 py-1 font-medium transition-colors",
                  coordinateSourceMode === mode
                    ? "bg-cyan-600 text-white shadow"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* RENTANG WAKTU LAPORAN */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            RENTANG WAKTU LAPORAN
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[11px]">
              {(["ALL", "24H", "7D", "30D"] as DateRangeOption[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => onDateRangeChange(option)}
                  className={cn(
                    "px-2.5 py-0.5 rounded transition-colors cursor-pointer",
                    dateRange === option
                      ? "bg-blue-100 dark:bg-blue-950 border border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  {option === "ALL" ? "Semua" : option === "24H" ? "24 Jam" : option === "7D" ? "7 Hari" : "30 Hari"}
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
          <span>Sumber Data: DENS CAKRA</span>
          <span className="size-1.5 rounded-full bg-emerald-500" />
        </div>
      </div>
    </div>
  );
}
