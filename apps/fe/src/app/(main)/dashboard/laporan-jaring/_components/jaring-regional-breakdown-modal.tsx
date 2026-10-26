"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import {
  dateInputFromQueryValue,
  jakartaBoundaryIso,
  type PeriodPreset,
  resolveJakartaPeriodRange,
} from "@/lib/domain/date-time";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function getDayDifferenceInclusive(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const [y1, m1, d1] = startStr.split("-").map(Number);
  const [y2, m2, d2] = endStr.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const dStart = new Date(y1, m1 - 1, d1);
  const dEnd = new Date(y2, m2 - 1, d2);
  const diffTime = dEnd.getTime() - dStart.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getTodayJakartaStr(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    return `${year}-${month}-${day}`;
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

export type RegionalBreakdownItem = {
  id: string;
  name: string;
  level: "REGENCY" | "CITY" | "DISTRICT";
  parentId?: string | null;
  parentName?: string | null;
  totalJaring: number;
  activeJaring: number;
  activePercent: number;
  totalReports: number;
  readReports: number;
  unreadReports: number;
  districts?: RegionalBreakdownItem[];
};

export type RegionalBreakdownResponse = {
  summary: {
    totalJaring: number;
    activeJaring: number;
    activePercent: number;
    totalReports: number;
    readReports: number;
    unreadReports: number;
  };
  regencies: RegionalBreakdownItem[];
};

interface JaringRegionalBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periodFilter?: {
    from?: string;
    to?: string;
    label?: string;
    preset?: PeriodPreset;
  };
  onApplyAreaFilter?: (areaId: string, level: "REGENCY" | "CITY" | "DISTRICT", areaName: string) => void;
}

export function JaringRegionalBreakdownModal({
  open,
  onOpenChange,
  periodFilter,
  onApplyAreaFilter,
}: JaringRegionalBreakdownModalProps) {
  const [data, setData] = useState<RegionalBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegencyId, setSelectedRegencyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Period Filter states inside the modal
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>(() => {
    if (periodFilter?.preset) return periodFilter.preset;
    if (periodFilter?.from || periodFilter?.to) return "CUSTOM";
    return "LAST_30_DAYS";
  });
  const [startDate, setStartDate] = useState<string>(() =>
    periodFilter?.from ? dateInputFromQueryValue(periodFilter.from) : "",
  );
  const [endDate, setEndDate] = useState<string>(() =>
    periodFilter?.to ? dateInputFromQueryValue(periodFilter.to) : "",
  );

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      if (periodFilter?.preset) {
        setPeriodPreset(periodFilter.preset);
      } else if (periodFilter?.from || periodFilter?.to) {
        setPeriodPreset("CUSTOM");
      }
      if (periodFilter?.from) {
        setStartDate(dateInputFromQueryValue(periodFilter.from));
      }
      if (periodFilter?.to) {
        setEndDate(dateInputFromQueryValue(periodFilter.to));
      }
    }
    prevOpenRef.current = open;
  }, [open, periodFilter]);

  function handlePresetChange(val: PeriodPreset) {
    setPeriodPreset(val);
    if (val === "CUSTOM") {
      const today = getTodayJakartaStr();
      if (!startDate) setStartDate(addDays(today, -6));
      if (!endDate) setEndDate(today);
    }
  }

  function handleStartDateChange(val: string) {
    setStartDate(val);
    if (val) {
      const currentDiff = endDate ? getDayDifferenceInclusive(val, endDate) : 0;
      if (!endDate || currentDiff < 7) {
        setEndDate(addDays(val, 6));
      }
    }
  }

  function handleEndDateChange(val: string) {
    setEndDate(val);
    if (val) {
      const currentDiff = startDate ? getDayDifferenceInclusive(startDate, val) : 0;
      if (!startDate || currentDiff < 7) {
        setStartDate(addDays(val, -6));
      }
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const range = resolveJakartaPeriodRange(periodPreset, startDate, endDate);
      if (range.from) params.set("from", jakartaBoundaryIso(range.from));
      if (range.to) params.set("to", jakartaBoundaryIso(range.to, true));
      params.set("activeDays", "90");

      const res = await apiBrowserFetch<RegionalBreakdownResponse>(
        `/jaring/reports/regional-breakdown?${params.toString()}`,
      );
      setData(res);
    } catch (err) {
      console.error("Gagal memuat statistik sebaran wilayah Jaring:", err);
      setError(err instanceof Error ? err.message : "Gagal memuat data sebaran wilayah.");
    } finally {
      setLoading(false);
    }
  }, [periodPreset, startDate, endDate]);

  useEffect(() => {
    if (open) {
      void loadData();
    } else {
      setSelectedRegencyId(null);
      setSearchQuery("");
    }
  }, [open, loadData]);

  const selectedRegency = useMemo(() => {
    if (!selectedRegencyId || !data) return null;
    return data.regencies.find((r) => r.id === selectedRegencyId) ?? null;
  }, [selectedRegencyId, data]);

  // Current items being displayed (either Regencies or Districts)
  const currentItems = useMemo(() => {
    if (!data) return [];
    const sourceList = selectedRegency ? (selectedRegency.districts ?? []) : data.regencies;
    if (!searchQuery.trim()) return sourceList;

    const q = searchQuery.toLowerCase().trim();
    return sourceList.filter((item) => item.name.toLowerCase().includes(q));
  }, [data, selectedRegency, searchQuery]);

  // Compute active level summary (either selected regency totals or global summary)
  const activeSummary = useMemo(() => {
    if (!data) return null;
    if (selectedRegency) {
      return {
        totalJaring: selectedRegency.totalJaring,
        activeJaring: selectedRegency.activeJaring,
        activePercent: selectedRegency.activePercent,
        totalReports: selectedRegency.totalReports,
        readReports: selectedRegency.readReports,
        unreadReports: selectedRegency.unreadReports,
      };
    }
    return data.summary;
  }, [data, selectedRegency]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-[1100px] sm:max-w-[1100px] overflow-hidden p-0 sm:max-h-[88vh]">
        {/* MODAL HEADER */}
        <div className="border-b border-border/80 bg-muted/20 px-6 py-4">
          <DialogHeader className="gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                    Rincian Sebaran & Keaktifan Wilayah (DKI Jakarta)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Hierarki statistik keaktifan Jaring dan laporan masuk dari tingkat Kota/Kabupaten ke Kecamatan di
                    wilayah DKI Jakarta
                  </DialogDescription>
                </div>
              </div>

              {/* INTERACTIVE PERIOD FILTER WIDGET */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-md border border-border/80 bg-background/90 px-2 py-1 shadow-2xs">
                  <Clock className="size-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-medium text-muted-foreground hidden sm:inline">Periode:</span>
                  <NativeSelect
                    aria-label="Filter Periode Statistik Wilayah"
                    value={periodPreset}
                    onChange={(e) => handlePresetChange(e.target.value as PeriodPreset)}
                    className="h-7 border-0 bg-transparent py-0 pl-1 pr-6 text-xs font-semibold text-foreground focus:ring-0 shadow-none cursor-pointer"
                  >
                    <option value="TODAY">Hari Ini</option>
                    <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                    <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                    <option value="ALL">Semua Periode</option>
                    <option value="CUSTOM">Rentang Kustom</option>
                  </NativeSelect>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadData()}
                  disabled={loading}
                  title="Segarkan Data"
                  className="h-8 w-8 p-0 border-border/80"
                >
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* CUSTOM DATE RANGE BAR (when Rentang Kustom is selected) */}
          {periodPreset === "CUSTOM" && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 rounded-lg border border-primary/30 bg-primary/[0.03] p-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 font-medium text-[11px] text-primary">
                  <Calendar className="size-3.5" />
                  Rentang Tanggal Kustom:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Dari:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="h-7 w-[135px] px-2 text-xs bg-background"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Sampai:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                    className="h-7 w-[135px] px-2 text-xs bg-background"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <Badge
                  variant="outline"
                  className="h-6 border-primary/30 bg-background text-[10px] font-mono text-muted-foreground"
                >
                  {getDayDifferenceInclusive(startDate, endDate)} hari terpilih (otomatis min. 7 hari)
                </Badge>
              )}
            </div>
          )}

          {/* BREADCRUMB & SEARCH NAVIGATION */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSelectedRegencyId(null)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-1 font-medium transition-colors",
                  selectedRegency
                    ? "text-primary hover:bg-primary/10"
                    : "bg-primary/10 text-primary font-semibold cursor-default",
                )}
              >
                <MapPin className="size-3.5" />
                Tingkat Kota / Kabupaten
              </button>

              {selectedRegency && (
                <>
                  <ChevronRight className="size-3.5 text-muted-foreground/60" />
                  <span className="flex items-center gap-1.5 rounded bg-muted px-2 py-1 font-semibold text-foreground">
                    <Layers className="size-3.5 text-muted-foreground" />
                    Kecamatan di {selectedRegency.name}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedRegencyId(null)}
                    className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3" />
                    Kembali
                  </Button>
                </>
              )}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={selectedRegency ? "Cari kecamatan..." : "Cari kota/kabupaten..."}
                className="h-8 pl-8 pr-3 text-xs"
              />
            </div>
          </div>
        </div>

        {/* SUMMARY STATS STRIP */}
        {activeSummary && (
          <div className="grid grid-cols-2 gap-2 border-b border-border/60 bg-muted/10 px-6 py-2.5 sm:grid-cols-4 sm:gap-4">
            <div className="flex items-center gap-2.5 rounded-md border border-border/50 bg-background/60 p-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground">Jaring Aktif</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-bold text-foreground">{activeSummary.activeJaring}</span>
                  <span className="text-xs text-muted-foreground">
                    / {activeSummary.totalJaring} ({activeSummary.activePercent}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-md border border-sky-500/20 bg-sky-500/5 p-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <BarChart3 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-sky-700 dark:text-sky-400">Total Laporan</p>
                <p className="text-base font-bold text-sky-900 dark:text-sky-200">
                  {activeSummary.totalReports.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">Laporan Dibaca</p>
                <p className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  {activeSummary.readReports.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-md border border-amber-500/20 bg-amber-500/5 p-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-amber-700 dark:text-amber-400">Laporan Belum Dibaca</p>
                <p className="text-base font-bold text-amber-900 dark:text-amber-200">
                  {activeSummary.unreadReports.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TABLE CONTENT */}
        <div className="relative max-h-[52vh] overflow-auto px-6 py-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="size-6 animate-spin text-primary" />
              <p className="mt-2 text-xs">Memuat data rincian sebaran wilayah...</p>
            </div>
          )}

          {error && !loading && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center">
              <p className="text-xs font-medium text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void loadData()} className="mt-2 h-7 gap-1.5 text-xs">
                <RefreshCw className="size-3" />
                Coba Lagi
              </Button>
            </div>
          )}

          {!loading && !error && currentItems.length === 0 && (
            <div className="py-10 text-center text-xs text-muted-foreground">
              {searchQuery ? "Tidak ditemukan wilayah yang sesuai dengan pencarian." : "Belum ada data wilayah."}
            </div>
          )}

          {!loading && !error && currentItems.length > 0 && (
            <Table className="text-xs w-full">
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-xs">
                {/* GROUPED HEADER ROW */}
                <TableRow className="border-b hover:bg-transparent">
                  <TableHead className="w-[28%] font-semibold text-foreground">
                    {selectedRegency ? "Nama Kecamatan" : "Kota / Kabupaten"}
                  </TableHead>
                  <TableHead
                    colSpan={2}
                    className="w-[22%] border-x border-border/60 bg-muted/30 text-center font-semibold text-foreground"
                  >
                    Jaring Aktif
                  </TableHead>
                  <TableHead className="w-[12%] text-center font-semibold text-foreground">Total Laporan</TableHead>
                  <TableHead className="w-[12%] text-center font-semibold text-foreground">Laporan Dibaca</TableHead>
                  <TableHead className="w-[13%] text-center font-semibold text-foreground">
                    Laporan Belum Dibaca
                  </TableHead>
                  <TableHead className="w-[13%] text-right font-semibold text-foreground pr-4">Aksi</TableHead>
                </TableRow>

                {/* SUB-HEADER ROW */}
                <TableRow className="border-b bg-muted/15 text-[11px] text-muted-foreground hover:bg-transparent">
                  <TableHead className="text-muted-foreground font-normal">
                    {selectedRegency ? "Kecamatan di " + selectedRegency.name : "Klik baris untuk rincian kecamatan"}
                  </TableHead>
                  <TableHead className="w-[11%] border-l border-border/60 text-center font-normal">
                    Jumlah Jaring
                  </TableHead>
                  <TableHead className="w-[11%] border-r border-border/60 text-center font-normal">% Aktif</TableHead>
                  <TableHead className="text-center font-normal">Akumulasi</TableHead>
                  <TableHead className="text-center font-normal">Sudah Dibaca</TableHead>
                  <TableHead className="text-center font-normal">Menunggu Baca</TableHead>
                  <TableHead className="text-right font-normal pr-4">Filter Laporan</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentItems.map((item) => {
                  const isRegencyRow = !selectedRegency;
                  const districtCount = item.districts?.length ?? 0;

                  return (
                    <TableRow
                      key={item.id}
                      onClick={() => {
                        if (isRegencyRow) {
                          setSelectedRegencyId(item.id);
                          setSearchQuery("");
                        }
                      }}
                      className={cn(
                        "group transition-colors",
                        isRegencyRow && "cursor-pointer hover:bg-primary/5",
                        !isRegencyRow && "hover:bg-muted/40",
                      )}
                    >
                      {/* WILAYAH NAME */}
                      <TableCell className="font-medium text-foreground py-2.5">
                        <div className="flex items-center gap-2">
                          <MapPin
                            className={cn("size-3.5 shrink-0", isRegencyRow ? "text-primary" : "text-muted-foreground")}
                          />
                          <span className="font-semibold">{item.name}</span>
                          {isRegencyRow && (
                            <Badge
                              variant="secondary"
                              className="ml-1 h-5 px-1.5 text-[10px] text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            >
                              {districtCount} Kecamatan
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                      {/* JUMLAH JARING (AKTIF / TOTAL) */}
                      <TableCell className="border-l border-border/40 text-center py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-bold text-foreground">{item.activeJaring}</span>
                          <span className="text-muted-foreground text-[11px]">/ {item.totalJaring}</span>
                        </div>
                      </TableCell>

                      {/* % AKTIF */}
                      <TableCell className="border-r border-border/40 text-center py-2.5">
                        <div className="flex flex-col items-center gap-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-5 px-1.5 text-[10px] font-semibold",
                              item.activePercent >= 70
                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : item.activePercent >= 40
                                  ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                  : item.activePercent > 0
                                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "border-muted bg-muted/30 text-muted-foreground",
                            )}
                          >
                            {item.activePercent}%
                          </Badge>
                          <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                item.activePercent >= 70
                                  ? "bg-emerald-500"
                                  : item.activePercent >= 40
                                    ? "bg-sky-500"
                                    : "bg-amber-500",
                              )}
                              style={{ width: `${Math.min(100, item.activePercent)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* TOTAL LAPORAN */}
                      <TableCell className="text-center font-bold text-sky-700 dark:text-sky-400 py-2.5">
                        {item.totalReports.toLocaleString("id-ID")}
                      </TableCell>

                      {/* LAPORAN DIBACA */}
                      <TableCell className="text-center py-2.5">
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-700 dark:text-emerald-400">
                          {item.readReports.toLocaleString("id-ID")}
                        </span>
                      </TableCell>

                      {/* LAPORAN BELUM DIBACA */}
                      <TableCell className="text-center py-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-2 py-0.5 font-semibold",
                            item.unreadReports > 0
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {item.unreadReports.toLocaleString("id-ID")}
                        </span>
                      </TableCell>

                      {/* AKSI */}
                      <TableCell className="text-right py-2.5 pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isRegencyRow && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRegencyId(item.id)}
                              className="h-7 gap-1 px-2 text-[11px] text-primary hover:bg-primary/10"
                            >
                              Kecamatan
                              <ChevronRight className="size-3" />
                            </Button>
                          )}

                          {onApplyAreaFilter && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onApplyAreaFilter(item.id, item.level, item.name);
                                onOpenChange(false);
                              }}
                              className="h-7 gap-1 px-2 text-[11px] border-slate-200 dark:border-white/10 hover:border-primary/50"
                              title="Terapkan filter ke halaman laporan"
                            >
                              <Filter className="size-3 text-muted-foreground" />
                              Filter
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between border-t border-border/80 bg-muted/20 px-6 py-3">
          <div className="text-xs text-muted-foreground">
            {selectedRegency ? (
              <span>
                Menampilkan rincian kecamatan di <strong className="text-foreground">{selectedRegency.name}</strong>
              </span>
            ) : (
              <span>
                Total <strong className="text-foreground">{currentItems.length}</strong> Kota/Kabupaten terdaftar
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedRegency && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRegencyId(null)}
                className="h-8 gap-1.5 text-xs"
              >
                <ArrowLeft className="size-3.5" />
                Semua Kota/Kabupaten
              </Button>
            )}

            <Button variant="default" size="sm" onClick={() => onOpenChange(false)} className="h-8 px-4 text-xs">
              Tutup
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
