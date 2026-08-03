"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Compass, LogOut, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { ThemeSwitcher } from "@/app/(main)/dashboard/_components/sidebar/theme-switcher";
import type { JaringDistributionCity } from "./sebaran-jaring-types";

type Props = {
  cities: JaringDistributionCity[];
  selectedCityId: string;
  onSelectCity: (cityId: string) => void;
  totalEntities: number;
  currentTime: string;
  isLeftPanelOpen: boolean;
  onToggleLeftPanel: () => void;
};

export function SebaranJaringHeader({
  cities,
  selectedCityId,
  onSelectCity,
  totalEntities,
  currentTime,
  isLeftPanelOpen,
  onToggleLeftPanel,
}: Props) {
  return (
    <header className="z-30 h-14 shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between shadow-md transition-colors">
      {/* Left Branding */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="size-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
            <Compass className="size-4 animate-spin-slow" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-slate-100 shrink-0">
              CAKRA OSINT
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-cyan-700 dark:text-cyan-400 font-semibold uppercase tracking-widest hidden xl:inline-block shrink-0">
              INTELLIGENCE MAP
            </span>
          </div>
        </div>
      </div>

      {/* Center Administrative Dropdown Selector */}
      <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px] uppercase tracking-wider">WILAYAH</span>
        <NativeSelect
          value={selectedCityId}
          onChange={(e) => onSelectCity(e.target.value)}
          className="bg-transparent border-none text-cyan-700 dark:text-cyan-300 font-semibold focus:ring-0 cursor-pointer h-7 text-xs py-0"
        >
          {cities.map((city) => (
            <option key={city.id} value={city.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
              {city.provinceName ? `${city.provinceName} - ` : ""}{city.name}
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

        {/* LIVE Status Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
          <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span>LIVE</span>
        </div>

        {/* Entity Counter Badge */}
        <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-950/80 border border-blue-300 dark:border-blue-800/80 px-2.5 py-1 rounded-md text-blue-700 dark:text-blue-300 text-[11px]">
          <Users className="size-3.5" />
          <span>{totalEntities} ENTITIES TRACKED</span>
        </div>

        {/* Theme Switcher Toggle */}
        <ThemeSwitcher />

        {/* Panel Filter Toggle */}
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleLeftPanel}
          className={cn(
            "h-8 gap-1.5 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs cursor-pointer",
            isLeftPanelOpen && "border-cyan-500 bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300"
          )}
        >
          <SlidersHorizontal className="size-3.5" />
          <span>PANEL FILTER</span>
        </Button>

        {/* Exit Button */}
        <Link href="/dashboard">
          <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs">
            <LogOut className="size-3.5" />
            <span>KELUAR</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
