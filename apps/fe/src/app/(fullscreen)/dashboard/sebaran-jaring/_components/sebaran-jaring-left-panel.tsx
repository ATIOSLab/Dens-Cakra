"use client";

import { CheckCircle2, Filter, RotateCcw, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

import type {
  AdminLevel,
  AgentOperationalStatus,
  DateRangeOption,
  JaringDistributionCity,
  JaringDistributionVillage,
} from "./sebaran-jaring-types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  cities: JaringDistributionCity[];
  selectedCityId: string;
  selectedDistrictId: string | null;
  selectedVillageId: string | null;
  availableVillages: JaringDistributionVillage[];
  adminLevel: AdminLevel;
  allowedAdminLevels?: AdminLevel[];
  onSelectAdminLevel: (level: AdminLevel) => void;
  onSelectCity: (cityId: string) => void;
  onSelectDistrict: (districtId: string) => void;
  onSelectVillage: (villageId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  statusFilter: Record<AgentOperationalStatus | "ALL", boolean>;
  onStatusFilterChange: (update: Record<AgentOperationalStatus | "ALL", boolean>) => void;
  dateRange: DateRangeOption;
  onDateRangeChange: (d: DateRangeOption) => void;
  onResetFilters: () => void;
  summaryStats: {
    regionName: string;
    levelName: string;
    total: number;
    verified: number;
    pending: number;
    rejected: number;
  };
};

export function SebaranJaringLeftPanel({
  isOpen,
  onClose,
  cities,
  selectedCityId,
  selectedDistrictId,
  selectedVillageId,
  availableVillages,
  adminLevel,
  allowedAdminLevels = ["PROVINCE", "CITY", "DISTRICT", "VILLAGE"],
  onSelectAdminLevel,
  onSelectCity,
  onSelectDistrict,
  onSelectVillage,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  onResetFilters,
  summaryStats,
}: Props) {
  const selectedCity = cities.find((c) => c.id === selectedCityId) ?? null;

  if (!isOpen) return null;

  return (
    <aside className="z-20 w-80 shrink-0 bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800/90 backdrop-blur-lg flex flex-col shadow-xl absolute lg:relative inset-y-0 left-0 transition-colors">
      {/* Panel Header */}
      <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/90 flex items-center justify-between bg-slate-100/70 dark:bg-slate-950/50">
        <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold text-xs tracking-wider">
          <Filter className="size-3.5" />
          <span>FILTER & RINGKASAN</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
        >
          Sembunyikan
        </button>
      </div>

      {/* Panel Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 pb-24 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
        {/* PENCARIAN */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            PENCARIAN
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400 dark:text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Cari wilayah, jaring, atau kode..."
              className="pl-8 bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-200 text-xs h-8 focus:border-cyan-500/50 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* TINGKAT WILAYAH */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            TINGKAT WILAYAH
          </p>
          <div className="space-y-1.5 pl-1">
            {allowedAdminLevels.map((level) => {
              const labels: Record<AdminLevel, string> = {
                PROVINCE: "Provinsi",
                CITY: "Kota / Kabupaten",
                DISTRICT: "Kecamatan",
                VILLAGE: "Kelurahan",
              };
              return (
                <label
                  key={level}
                  className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-300 transition-colors"
                >
                  <input
                    type="radio"
                    name="adminLevel"
                    checked={adminLevel === level}
                    onChange={() => onSelectAdminLevel(level)}
                    className="accent-cyan-500 size-3 cursor-pointer"
                  />
                  <span>{labels[level]}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* CASCADING REGION SELECTORS */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono">KOTA / KABUPATEN</span>
            <select
              value={selectedCityId}
              onChange={(e) => onSelectCity(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-300 text-xs focus:border-cyan-500 cursor-pointer"
            >
              {allowedAdminLevels.includes("PROVINCE") ? (
                <option value="" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
                  Seluruh Wilayah
                </option>
              ) : null}
              {cities.map((city) => (
                <option
                  key={city.id}
                  value={city.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {city.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono">KECAMATAN</span>
            <select
              value={selectedDistrictId ?? ""}
              onChange={(e) => onSelectDistrict(e.target.value)}
              disabled={!selectedCity}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-300 text-xs focus:border-cyan-500 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                Semua Kecamatan
              </option>
              {selectedCity?.districts.map((district) => (
                <option
                  key={district.id}
                  value={district.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {district.name} ({district.total})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-mono">KELURAHAN</span>
            <select
              value={selectedVillageId ?? ""}
              onChange={(e) => onSelectVillage(e.target.value)}
              disabled={!selectedCity}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded px-2 py-1 text-slate-800 dark:text-slate-300 text-xs focus:border-cyan-500 cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                Semua Kelurahan
              </option>
              {availableVillages.map((village) => (
                <option
                  key={village.id}
                  value={village.id}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {village.name} ({village.total})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* RINGKASAN WILAYAH */}
        <div className="p-3 bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              RINGKASAN WILAYAH
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2">
            <span className="font-bold text-sm text-cyan-700 dark:text-cyan-300 truncate max-w-[170px]">
              {summaryStats.regionName}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-cyan-300 dark:border-cyan-800 text-cyan-800 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-1.5 py-0 font-semibold"
            >
              {summaryStats.levelName}
            </Badge>
          </div>

          {/* 4 Stat Metric Cards Grid */}
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="font-bold text-sm text-cyan-600 dark:text-cyan-400">{summaryStats.total}</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400 font-mono">Total Jaring</div>
            </div>
            <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/60">
              <div className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{summaryStats.verified}</div>
              <div className="text-[9px] text-emerald-600/80 dark:text-emerald-500/80 font-mono">Terverifikasi</div>
            </div>
            <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60">
              <div className="font-bold text-sm text-blue-600 dark:text-blue-400">{summaryStats.pending}</div>
              <div className="text-[9px] text-blue-600/80 dark:text-blue-500/80 font-mono">Belum Terverifikasi</div>
            </div>
            <div className="p-1.5 rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60">
              <div className="font-bold text-sm text-red-600 dark:text-red-400">{summaryStats.rejected}</div>
              <div className="text-[9px] text-red-600/80 dark:text-red-500/80 font-mono">Ditolak</div>
            </div>
          </div>
        </div>

        {/* FILTER STATUS */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            FILTER STATUS
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <label htmlFor="sebaran-status-all" className="col-span-2 flex items-center gap-2 text-slate-800 dark:text-slate-200 cursor-pointer font-medium">
              <Checkbox
                id="sebaran-status-all"
                checked={statusFilter.ALL}
                onCheckedChange={(checked) =>
                  onStatusFilterChange({
                    ALL: !!checked,
                    VERIFIED: !!checked,
                    PENDING: !!checked,
                    REJECTED: !!checked,
                  })
                }
                className="size-3.5 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-cyan-600"
              />
              <span>Semua Status</span>
            </label>

            {(
              [
                ["VERIFIED", "Terverifikasi", "#22c55e"],
                ["PENDING", "Belum Terverifikasi", "#3b82f6"],
                ["REJECTED", "Ditolak", "#ef4444"],
              ] as const
            ).map(([key, label, color]) => (
              <label
                key={key}
                htmlFor={`sebaran-status-${key.toLowerCase()}`}
                className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white"
              >
                <Checkbox
                  id={`sebaran-status-${key.toLowerCase()}`}
                  checked={statusFilter[key]}
                  onCheckedChange={(checked) =>
                    onStatusFilterChange({
                      ...statusFilter,
                      ALL: false,
                      [key]: !!checked,
                    })
                  }
                  className="size-3 border-slate-300 dark:border-slate-700 data-[state=checked]:bg-cyan-600"
                />
                <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[11px] truncate">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* FILTER AKTIVITAS */}
        <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800/60">
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            AKTIVITAS LAPORAN
          </p>
          <NativeSelect
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value as DateRangeOption)}
            className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-300 text-xs h-8"
          >
            <option value="ALL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Semua Jaring
            </option>
            <option value="24H" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Melapor 24 Jam Terakhir
            </option>
            <option value="7D" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Melapor 7 Hari Terakhir
            </option>
            <option value="30D" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
              Melapor 30 Hari Terakhir
            </option>
          </NativeSelect>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="flex min-h-9 flex-1 items-center gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2.5 text-[10px] text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
            Filter diterapkan otomatis
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onResetFilters}
            className="h-9 gap-1.5 border-slate-300 bg-slate-100 text-slate-700 text-xs hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <RotateCcw className="size-3.5" aria-hidden /> Reset
          </Button>
        </div>
      </div>
    </aside>
  );
}
