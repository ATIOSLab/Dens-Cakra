"use client";

import { Clock, RefreshCw, SlidersHorizontal, Users } from "lucide-react";

import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import { AppLogo } from "@/components/app-logo";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

import {
  DISTRIBUTION_ENTITY_COPY,
  type DistributionEntityMode,
  type JaringDistributionCity,
} from "./sebaran-jaring-types";

type Props = {
  cities: JaringDistributionCity[];
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
  totalEntities: number;
  currentTime: string;
  lastSyncedAt: Date;
  loading: boolean;
  onRefresh: () => void;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
  showAllCities: boolean;
  mode?: DistributionEntityMode;
};

export function SebaranJaringHeader({
  cities,
  selectedCityId,
  onSelectCity,
  totalEntities,
  currentTime,
  lastSyncedAt,
  loading,
  onRefresh,
  isLeftPanelOpen,
  onToggleLeftPanel,
  showAllCities,
  mode = "jaring",
}: Props) {
  const copy = DISTRIBUTION_ENTITY_COPY[mode];

  return (
    <header className="z-30 h-14 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-md transition-colors">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <BackButton
          href="/dashboard"
          label="Kembali"
          variant="ghost"
          className="h-8 bg-slate-100 px-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 [&_span]:hidden xl:[&_span]:inline"
        />
        <div className="flex items-center gap-2.5">
          <AppLogo size="sm" className="border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.22)]" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-slate-100 shrink-0">
              DENS CAKRA
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-700 dark:text-cyan-400 font-semibold uppercase tracking-widest hidden xl:inline-block shrink-0">
              {copy.headerBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Center Administrative Dropdown Selector */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
          WILAYAH
        </span>
        <NativeSelect
          value={selectedCityId}
          onChange={(e) => onSelectCity(e.target.value)}
          className="bg-transparent border-none text-cyan-700 dark:text-cyan-300 font-semibold focus:ring-0 cursor-pointer h-7 text-xs py-0"
        >
          {showAllCities ? (
            <option value="" className="bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100">
              Seluruh wilayah
            </option>
          ) : null}
          {cities.map((city) => (
            <option
              key={city.id}
              value={city.id}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
            >
              {city.provinceName ? `${city.provinceName} - ` : ""}
              {city.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center gap-2.5 font-mono text-xs">
        {/* Live WIB Clock */}
        <div className="hidden lg:flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/90 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-800 text-[11px]">
          <Clock className="size-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{currentTime || "WIB"}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1 font-semibold text-[11px] text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-70 dark:border-emerald-800/80 dark:bg-emerald-950/80 dark:text-emerald-400 dark:hover:bg-emerald-900/80"
          title={`Sinkronisasi terakhir ${lastSyncedAt.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Jakarta",
          })} WIB`}
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} aria-hidden />
          <span className="hidden sm:inline">{loading ? "MENYINKRONKAN" : "DATA AKTIF"}</span>
        </button>

        {/* Entity Counter Badge */}
        <div className="hidden items-center gap-1.5 rounded-md border border-cyan-300 bg-cyan-100 px-2.5 py-1 text-[11px] text-cyan-700 xl:flex dark:border-cyan-800/80 dark:bg-cyan-950/80 dark:text-cyan-300">
          <Users className="size-3.5" />
          <span>
            {totalEntities.toLocaleString("id-ID")} {copy.plural.toUpperCase()}
          </span>
        </div>

        {/* Theme Switcher Toggle */}
        <div className="hidden sm:block">
          <ThemeSwitcher />
        </div>

        {/* Panel Filter Toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleLeftPanel}
          className={cn(
            "h-8 gap-1.5 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs cursor-pointer",
            isLeftPanelOpen && "border-cyan-500 bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300",
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          <span className="hidden xl:inline">FILTER & RINGKASAN</span>
        </Button>

      </div>
    </header>
  );
}
