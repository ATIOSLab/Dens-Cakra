"use client";

import { Clock, RefreshCw, SlidersHorizontal } from "lucide-react";

import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import { AppLogo } from "@/components/app-logo";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { DC_CONTROLS, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
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
  const visual = mode === "gaswil" ? DOMAIN_VISUALS.gaswil : DOMAIN_VISUALS.jaring;
  const tone = mode === "gaswil" ? "emerald" : "cyan";
  const toneTextClass =
    tone === "emerald" ? "text-emerald-700 dark:text-emerald-300" : "text-cyan-700 dark:text-cyan-300";
  const toneBadgeClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
      : "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950/80 dark:text-cyan-300";

  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-slate-200 border-b bg-white px-4 shadow-md transition-colors dark:border-slate-800 dark:bg-slate-900">
      {/* Left Branding */}
      <div className="flex min-w-0 items-center gap-3">
        <BackButton
          href="/dashboard"
          label="Kembali"
          variant="ghost"
          className="h-9 rounded-md bg-slate-100 px-2.5 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 [&_span]:hidden xl:[&_span]:inline"
        />
        <div className="flex min-w-0 items-center gap-2.5">
          <AppLogo
            size="sm"
            className={cn(
              "border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.22)]",
              mode === "gaswil" && "border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_12px_rgba(34,197,94,0.18)]",
            )}
          />
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 font-bold text-sm tracking-normal text-slate-900 dark:text-slate-100">
              DENS CAKRA
            </span>
            <span
              className={cn(
                "hidden shrink-0 rounded border px-1.5 py-0.5 font-mono font-semibold text-[9px] uppercase tracking-widest xl:inline-block",
                toneBadgeClass,
              )}
            >
              {copy.headerBadge}
            </span>
          </div>
        </div>
      </div>

      {/* Center Administrative Dropdown Selector */}
      <div className="hidden min-w-[18rem] max-w-xl flex-1 items-center gap-2 rounded-md border border-slate-300 bg-slate-100 px-3 py-1 text-xs md:flex dark:border-slate-800 dark:bg-slate-950/80">
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">
          WILAYAH
        </span>
        <NativeSelect
          value={selectedCityId}
          onChange={(e) => onSelectCity(e.target.value)}
          className={cn(
            DC_CONTROLS.selectTrigger,
            "h-9 min-w-0 flex-1 border-none bg-transparent py-0 font-semibold text-sm focus:ring-0",
            toneTextClass,
          )}
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
              {city.name}
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex shrink-0 items-center gap-2.5 font-mono text-xs">
        {/* Live WIB Clock */}
        <div className="hidden lg:flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-950/90 px-2.5 py-1 rounded-md border border-slate-300 dark:border-slate-800 text-[11px]">
          <Clock className="size-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>{currentTime || "WIB"}</span>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex h-9 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-100 px-2.5 font-semibold text-[11px] text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-70 dark:border-emerald-800/80 dark:bg-emerald-950/80 dark:text-emerald-400 dark:hover:bg-emerald-900/80"
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
        <div
          className={cn("hidden h-9 items-center gap-1.5 rounded-md border px-2.5 text-[11px] xl:flex", toneBadgeClass)}
        >
          <visual.Icon className="size-3.5" />
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
            "h-9 gap-1.5 rounded-md border-slate-300 bg-slate-100 text-xs text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
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
