"use client";

import { useState } from "react";

import { BarChart3, Boxes, ChevronUp, type LucideIcon, MapPin, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/utils";

import type {
  CoordinateSourceMode,
  DateRangeOption,
  DisplayMode,
  DistributionEntityMode,
  MapStyleMode,
} from "./sebaran-jaring-types";
import { DISTRIBUTION_ENTITY_COPY } from "./sebaran-jaring-types";

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
  mode?: DistributionEntityMode;
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
  mode = "jaring",
}: Props) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const copy = DISTRIBUTION_ENTITY_COPY[mode];
  const displayOptions: Array<{ value: DisplayMode; label: string; Icon: LucideIcon }> = [
    { value: "marker", label: "Titik", Icon: MapPin },
    { value: "cluster", label: "Kelompok", Icon: Boxes },
    { value: "heatmap", label: "Kepadatan", Icon: BarChart3 },
  ];

  if (isCollapsed) {
    return (
      <div className="absolute bottom-3 right-4 z-20">
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-900/90 px-3.5 py-1.5 font-mono font-medium text-slate-200 text-xs shadow-2xl backdrop-blur-md transition-all hover:bg-slate-800 hover:text-cyan-400"
        >
          <SlidersHorizontal className="size-3.5 text-cyan-400" />
          <span>Panel Kontrol Peta</span>
          <ChevronUp className="size-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute right-4 bottom-4 left-4 z-10 flex max-h-[38vh] flex-col gap-2 overflow-y-auto rounded-md border border-slate-200 bg-white/90 px-3.5 py-2 shadow-xl backdrop-blur-md transition-colors dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs pr-8 relative">
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="absolute -top-1 -right-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-white"
          title="Tutup Panel Kontrol"
        >
          <X className="size-4" />
        </button>
        {/* MODE TAMPILAN */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            MODE TAMPILAN
          </span>
          <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950/80">
            {displayOptions.map(({ value, label, Icon }) => (
              <button
                type="button"
                key={value}
                onClick={() => onDisplayModeChange(value)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
                  displayMode === value
                    ? "bg-cyan-600 text-white font-semibold shadow"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
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
                  "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-all",
                  mapStyle === style
                    ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 font-semibold ring-1 ring-cyan-500"
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
          {mode === "gaswil" ? (
            <span className="flex h-8 items-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {copy.sourceDomicileLabel}
            </span>
          ) : (
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 text-xs dark:border-slate-800 dark:bg-slate-950/80">
              {(
                [
                  ["domisili", copy.sourceDomicileLabel],
                  ["laporan", copy.sourceReportLabel],
                ] as const
              ).map(([sourceMode, label]) => (
                <button
                  key={sourceMode}
                  type="button"
                  onClick={() => onCoordinateSourceModeChange(sourceMode)}
                  className={cn(
                    "h-8 rounded-md px-2.5 font-medium transition-colors",
                    coordinateSourceMode === sourceMode
                      ? "bg-cyan-600 text-white shadow"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RENTANG WAKTU LAPORAN */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {mode === "gaswil" ? "RENTANG WAKTU SINYAL" : "RENTANG WAKTU LAPORAN"}
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 p-1 font-mono text-[11px] dark:border-slate-800 dark:bg-slate-950/80">
              {(["ALL", "24H", "7D", "30D"] as DateRangeOption[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => onDateRangeChange(option)}
                  className={cn(
                    "h-7 rounded-md px-2.5 transition-colors",
                    dateRange === option
                      ? "bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 font-bold"
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
