"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Check,
  ChevronDown,
  Clock,
  Eye,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from "lucide-react";

import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { ActiveFilterChips, type FilterChipItem } from "@/components/ui/active-filter-chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { FilterField } from "@/components/ui/filter-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import {
  type DashboardDetailPeriodPreset,
  dateInputFromSearchParams,
  jakartaBoundaryIso,
  resolveDashboardDetailPeriodPreset,
  resolveJakartaPeriodRange,
} from "@/lib/domain/date-time";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  alignJaringReportCategorySummary,
  formatDateTime,
  formatReportNumber,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./laporan-jaring-presentation";
import { formatFullAreaName, type JaringReportSessionDetail } from "./laporan-jaring-types";

interface JaringOption {
  id: string;
  sandiCode: string;
  displayName: string;
  whatsappNumber?: string | null;
}

type ReportListResponse = {
  items: JaringReportSessionDetail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalJaringReports: number;
    baketReports: number;
    reportingJaringCount: number;
  };
};

const EMPTY_SUMMARY = {
  totalJaringReports: 0,
  baketReports: 0,
  reportingJaringCount: 0,
};

const DEFAULT_REPORT_PERIOD_PRESET = "LAST_30_DAYS" as const;

function JaringFilterPopover({
  options,
  selectedId,
  onSelect,
}: {
  options: JaringOption[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [displayCount, setDisplayCount] = useState(15);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setSearch("");
      setDisplayCount(15);
    }
  };

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.sandiCode.toLowerCase().includes(q) ||
        opt.displayName.toLowerCase().includes(q) ||
        opt.whatsappNumber?.toLowerCase().includes(q),
    );
  }, [options, search]);

  const visibleOptions = useMemo(() => {
    return filteredOptions.slice(0, displayCount);
  }, [filteredOptions, displayCount]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 30) {
      if (displayCount < filteredOptions.length) {
        setDisplayCount((prev) => Math.min(prev + 15, filteredOptions.length));
      }
    }
  };

  const selectedOption = options.find(
    (opt) => opt.id === selectedId || opt.sandiCode === selectedId || opt.displayName === selectedId,
  );

  let triggerLabel = "Filter Jaring";
  if (selectedId === "ALL") {
    triggerLabel = "Semua Jaring";
  } else if (selectedOption) {
    triggerLabel = `${selectedOption.displayName} - ${selectedOption.whatsappNumber || "tanpa WhatsApp"} - ${selectedOption.sandiCode}`;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-9 w-full min-w-[200px] justify-between gap-2 border-slate-200 bg-background font-normal text-xs transition-colors hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-900",
            selectedId !== "ALL" && "border-primary/45 bg-primary/5 font-semibold text-primary dark:bg-primary/10",
          )}
        >
          <div className="flex max-w-[220px] items-center gap-1.5 truncate">
            <DOMAIN_VISUALS.jaring.Icon className={`size-3.5 shrink-0 ${DOMAIN_VISUALS.jaring.iconClass}`} />
            <span className="truncate font-mono">{triggerLabel}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {selectedId !== "ALL" && (
              <button
                type="button"
                aria-label="Hapus filter Jaring"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("ALL");
                }}
                className="cursor-pointer rounded-full p-0.5 text-muted-foreground hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
              >
                <X className="size-3" />
              </button>
            )}
            <ChevronDown className="size-3.5 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[290px] rounded-md border-slate-200 p-0 shadow-lg dark:border-white/10"
        align="start"
      >
        {/* Sticky Search Header */}
        <div className="border-slate-100 border-b bg-slate-50/50 p-2 dark:border-white/10 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDisplayCount(15);
              }}
              placeholder="Cari nama, WhatsApp, atau kode Jaring..."
              className="h-8 bg-background pl-8 text-xs"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Infinite List Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="scrollbar-thin max-h-[240px] divide-y divide-slate-100 overflow-y-auto p-1 dark:divide-white/5"
        >
          {/* Default option: Semua Jaring */}
          <button
            type="button"
            onClick={() => {
              onSelect("ALL");
              setOpen(false);
            }}
            className={cn(
              "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors",
              selectedId === "ALL"
                ? "bg-sky-500/10 font-semibold text-sky-700 dark:text-sky-400"
                : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
            )}
          >
            <div className="flex items-center gap-2">
              <DOMAIN_VISUALS.jaring.Icon className="size-3.5 text-muted-foreground" />
              <span>Semua Jaring</span>
            </div>
            {selectedId === "ALL" && <Check className="size-3.5 text-sky-600 dark:text-sky-400" />}
          </button>

          {/* Filtered Jaring Options */}
          {visibleOptions.length > 0 ? (
            visibleOptions.map((opt) => {
              const isSelected =
                selectedId === opt.id || selectedId === opt.sandiCode || selectedId === opt.displayName;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onSelect(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "my-0.5 flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors",
                    isSelected
                      ? "bg-sky-500/10 font-semibold text-sky-700 dark:text-sky-400"
                      : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800",
                  )}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate font-semibold text-foreground">{opt.displayName}</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                      {opt.whatsappNumber || "WhatsApp belum tersedia"} · {opt.sandiCode}
                    </div>
                  </div>

                  {isSelected && <Check className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />}
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center font-mono text-muted-foreground text-xs">Jaring tidak ditemukan</div>
          )}

          {/* Infinite Scroll indicator */}
          {displayCount < filteredOptions.length && (
            <div className="border-slate-200 border-t border-dashed p-2 text-center font-mono text-[10px] text-muted-foreground dark:border-white/10">
              Scroll ke bawah untuk memuat lebih banyak ({displayCount}/{filteredOptions.length})
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const FO_LAPORAN_JARING_COLUMNS: ColumnOption[] = [
  { id: "waktuMasuk", label: "Waktu Masuk" },
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp", defaultVisible: false },
  { id: "judulIsi", label: "Judul & Isi Laporan", alwaysVisible: true },
  { id: "lokasiAktual", label: "Lokasi Aktual Laporan" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan Jaring" },
  { id: "statusProses", label: "Status Proses" },
  { id: "refNum", label: "Nomor Referensi" },
];

export function LaporanJaringClient() {
  const searchParams = useSearchParams();
  const initialStartDate = dateInputFromSearchParams(searchParams, ["from", "periodStart"]);
  const initialEndDate = dateInputFromSearchParams(searchParams, ["to", "periodEnd"]);
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [workspaceJarings, setWorkspaceJarings] = useState<
    {
      id: string;
      aliasName: string;
      fullName?: string | null;
      whatsappNumber?: string | null;
      registrationStatus?: string | null;
    }[]
  >([]);
  const [loadingList, setLoadingList] = useState(true);
  const [totalReports, setTotalReports] = useState(0);
  const [reportSummary, setReportSummary] = useState(EMPTY_SUMMARY);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) =>
    visibleColumns[id] ?? FO_LAPORAN_JARING_COLUMNS.find((column) => column.id === id)?.defaultVisible !== false;

  // Read report IDs state from localStorage
  const [readReportIds, setReadReportIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("read_reports_jaring") || "[]");
        setReadReportIds(new Set(stored));
      } catch {
        // Abaikan cache lokal yang tidak valid.
      }
    }
  }, []);

  const markReportAsRead = async (reportId: string) => {
    if (reportId) {
      try {
        void apiBrowserMutation("PATCH", `/jaring/reports/${reportId}/read`);
      } catch {
        // Abaikan kegagalan penanda baca; status lokal tetap diproses.
      }
      if (typeof window !== "undefined") {
        try {
          const stored: string[] = JSON.parse(localStorage.getItem("read_reports_jaring") || "[]");
          if (!stored.includes(reportId)) {
            stored.push(reportId);
            localStorage.setItem("read_reports_jaring", JSON.stringify(stored));
            setReadReportIds(new Set(stored));
          }
        } catch {
          // Abaikan cache lokal yang tidak dapat ditulis.
        }
      }
    }
  };

  // Filter, Search, and Pagination states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = useState<DashboardDetailPeriodPreset>(() => {
    const hasInitialDateRange = Boolean(initialStartDate || initialEndDate);
    if (!hasInitialDateRange && !searchParams.get("period")) return DEFAULT_REPORT_PERIOD_PRESET;

    return resolveDashboardDetailPeriodPreset(searchParams, hasInitialDateRange);
  });
  const [startDate, setStartDate] = useState<string>(() => initialStartDate);
  const [endDate, setEndDate] = useState<string>(() => initialEndDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const periodRange = useMemo(
    () => resolveJakartaPeriodRange(periodPreset, startDate, endDate),
    [endDate, periodPreset, startDate],
  );

  // Fetch list of reports
  const fetchReports = useCallback(
    async (silent = false) => {
      const requestId = ++requestSequence.current;
      if (!silent) setLoadingList(true);
      try {
        const params = new URLSearchParams({
          registrationStatus: "APPROVED",
          stage: "ALL",
          page: String(page),
          limit: String(limit),
          sortBy: "reportedAt",
          sortOrder: "desc",
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (jaringFilter !== "ALL") params.set("jaringId", jaringFilter);
        if (periodRange.from) params.set("from", jakartaBoundaryIso(periodRange.from));
        if (periodRange.to) params.set("to", jakartaBoundaryIso(periodRange.to, true));

        const res = await apiBrowserFetch<ReportListResponse | JaringReportSessionDetail[]>(
          `/jaring/reports?${params.toString()}`,
        );
        if (requestId !== requestSequence.current) return;
        if (Array.isArray(res)) {
          setReports(res);
          setTotalReports(res.length);
          setReportSummary(EMPTY_SUMMARY);
        } else {
          setReports(res.items ?? []);
          setTotalReports(res.pagination?.total ?? 0);
          setReportSummary(res.summary ?? EMPTY_SUMMARY);
        }
      } catch (err) {
        if (requestId !== requestSequence.current) return;
        console.error("Gagal memuat daftar laporan:", err);
      } finally {
        if (requestId === requestSequence.current && !silent) setLoadingList(false);
      }
    },
    [debouncedSearch, jaringFilter, limit, page, periodRange],
  );

  useEffect(() => {
    void fetchReports();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchReports(true);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [fetchReports]);

  useEffect(() => {
    async function loadWorkspace() {
      try {
        const res = await fetch("/api/field-officer/workspace");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.jaring)) {
            const verifiedOnly = data.jaring.filter(
              (j: Record<string, unknown>) => j.registrationStatus === "APPROVED",
            );
            setWorkspaceJarings(verifiedOnly);
          }
        }
      } catch {
        // ignore fallback to reports
      }
    }
    void loadWorkspace();
  }, []);

  // Compute unique Jaring options list for Popover filter (ONLY verified Jarings)
  const jaringOptions = useMemo(() => {
    const map = new Map<string, JaringOption>();

    const verifiedJarings = workspaceJarings.filter((j) => j.registrationStatus === "APPROVED");

    for (const j of verifiedJarings) {
      const sandi = j.aliasName || j.fullName || j.id;
      const name = j.fullName || j.aliasName;
      map.set(j.id, {
        id: j.id,
        sandiCode: sandi,
        displayName: name !== sandi ? name : sandi,
        whatsappNumber: j.whatsappNumber,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.sandiCode.localeCompare(b.sandiCode, "id", { sensitivity: "base" }),
    );
  }, [workspaceJarings]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setJaringFilter("ALL");
    setPeriodPreset("TODAY");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }, []);

  const activeFilterChips = useMemo<FilterChipItem[]>(() => {
    const chips: FilterChipItem[] = [];

    if (search.trim()) {
      chips.push({
        id: "search",
        label: "Pencarian",
        value: search.trim(),
        onRemove: () => {
          setSearch("");
          setPage(1);
        },
      });
    }

    if (jaringFilter !== "ALL") {
      const selected = jaringOptions.find((j) => j.id === jaringFilter);
      chips.push({
        id: "jaring",
        label: "Jaring",
        value: selected ? selected.displayName : jaringFilter,
        onRemove: () => {
          setJaringFilter("ALL");
          setPage(1);
        },
      });
    }

    if (periodPreset !== "TODAY") {
      const periodLabels: Record<DashboardDetailPeriodPreset, string> = {
        ALL: "Semua Waktu",
        TODAY: "Hari Ini",
        LAST_7_DAYS: "7 Hari Terakhir",
        LAST_30_DAYS: "30 Hari Terakhir",
        CUSTOM: "Rentang Kustom",
      };
      chips.push({
        id: "period",
        label: "Periode",
        value: periodLabels[periodPreset] || periodPreset,
        onRemove: () => {
          setPeriodPreset("TODAY");
          setStartDate("");
          setEndDate("");
          setPage(1);
        },
      });
    }

    if (periodPreset === "CUSTOM" && (startDate || endDate)) {
      chips.push({
        id: "dateRange",
        label: "Rentang Tanggal",
        value: `${startDate || "..."} s.d ${endDate || "..."}`,
        onRemove: () => {
          setStartDate("");
          setEndDate("");
          setPage(1);
        },
      });
    }

    return chips;
  }, [search, jaringFilter, jaringOptions, periodPreset, startDate, endDate]);

  const activeFilterCount = activeFilterChips.length;

  const paginatedReports = reports;
  const alignedSummary = alignJaringReportCategorySummary(reportSummary);
  const reportKpiCards = [
    {
      key: "TOTAL" as const,
      label: "Total Laporan Jaring",
      description: "Seluruh laporan yang masuk sesuai filter aktif",
      count: alignedSummary.totalJaringReports,
      icon: DOMAIN_VISUALS.jaringReport.Icon,
      styles: {
        card: "border-sky-200/80 dark:border-sky-900/30",
        icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        countText: "text-sky-700 dark:text-sky-400",
      },
    },
    {
      key: "BAKET" as const,
      label: "Laporan Jaring yang Sudah Menjadi Baket",
      description: "Laporan Jaring yang sudah dikonversi menjadi Bahan Keterangan (Baket)",
      count: alignedSummary.baketReports,
      icon: DOMAIN_VISUALS.baket.Icon,
      styles: {
        card: "border-violet-200/80 dark:border-violet-900/30",
        icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        countText: "text-violet-700 dark:text-violet-400",
      },
    },
    {
      key: "JARING" as const,
      label: "Total Jaring Melaporkan",
      description:
        jaringFilter === "ALL" ? "Jaring unik yang mengirim laporan sesuai filter aktif" : "Jaring pelapor terpilih",
      count: alignedSummary.reportingJaringCount,
      icon: DOMAIN_VISUALS.jaring.Icon,
      styles: {
        card: "border-emerald-200/80 dark:border-emerald-900/30",
        icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        countText: "text-emerald-600 dark:text-emerald-400",
      },
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 transition-colors duration-150 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Laporan Jaring</h1>
          <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm">
            Kelola daftar laporan masuk dari Jaring, sumber informasi, lokasi aktual, dan tindak lanjut menjadi Bahan
            Keterangan (Baket).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchReports()}
          disabled={loadingList}
          className="h-9 w-fit gap-2"
        >
          <RefreshCw className={cn("size-4 text-sky-600 dark:text-sky-400", loadingList && "animate-spin")} />
          Muat Ulang
        </Button>
      </div>

      {/* KPI METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {reportKpiCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className={cn(
                "flex min-h-[112px] items-center gap-3 rounded-md border bg-card p-3.5 text-left shadow-xs",
                item.styles.card,
              )}
            >
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", item.styles.icon)}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-[11px] text-muted-foreground leading-snug">{item.label}</p>
                <p className={cn("font-bold text-xl tracking-normal", item.styles.countText)}>
                  {formatReportNumber(item.count)}
                </p>
                <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL TABLE VIEW CONTAINER */}
      <Card className="overflow-hidden rounded-md border border-slate-200/80 bg-card shadow-xs dark:border-white/10">
        <CardHeader className="space-y-4 border-slate-200/80 border-b p-4 sm:p-5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-border/70 border-b pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h3 className={DC_TYPOGRAPHY.cardTitle}>Filter Laporan Jaring</h3>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px] text-primary">
                    {activeFilterCount} aktif
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Gunakan pencarian, Jaring pelapor, dan periode waktu untuk menyaring daftar laporan masuk.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ColumnVisibilityToggle
                columns={FO_LAPORAN_JARING_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 gap-1.5 text-muted-foreground text-xs hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <RotateCcw className="size-3.5" />
                  Atur Ulang
                </Button>
              )}
            </div>
          </div>

          {/* Controls Form Layout Terstruktur */}
          <div className="space-y-3">
            {/* Baris 1: Pencarian Bebas */}
            <FilterField
              label="Pencarian Bebas"
              icon={<Search className="size-3.5" />}
              isActive={Boolean(search.trim())}
            >
              <div className="relative">
                <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari nomor referensi, judul, atau isi laporan..."
                  className={cn(DC_CONTROLS.input, "h-9 pl-8 text-xs")}
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="Bersihkan pencarian"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            </FilterField>

            {/* Baris 2: Parameter Sumber & Waktu */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Jaring Filter */}
              <FilterField
                label="Jaring Pelapor"
                icon={<Users className="size-3.5" />}
                isActive={jaringFilter !== "ALL"}
              >
                <JaringFilterPopover
                  options={jaringOptions}
                  selectedId={jaringFilter}
                  onSelect={(id) => {
                    setJaringFilter(id);
                    setPage(1);
                  }}
                />
              </FilterField>

              {/* Periode Filter */}
              <FilterField
                label="Periode Laporan"
                icon={<Clock className="size-3.5" />}
                isActive={periodPreset !== "TODAY"}
              >
                <NativeSelect
                  value={periodPreset}
                  onChange={(e) => {
                    setPeriodPreset(e.target.value as DashboardDetailPeriodPreset);
                    setPage(1);
                  }}
                  isActive={periodPreset !== "TODAY"}
                  className="h-9 w-full text-xs"
                >
                  <option value="TODAY">Hari Ini</option>
                  <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                  <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                  <option value="CUSTOM">Rentang Kustom</option>
                </NativeSelect>
              </FilterField>
            </div>
          </div>

          {/* Date Range Picker (Only shown when periodPreset === "CUSTOM") */}
          {periodPreset === "CUSTOM" && (
            <div className="rounded-md border border-border/80 border-dashed bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
                  <Clock className="size-3.5 text-primary" />
                  <span>Rentang Tanggal Masuk:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className={cn(DC_CONTROLS.input, "h-9 w-[150px] font-mono text-xs")}
                    title="Dari Tanggal Masuk"
                  />
                  <span className="text-muted-foreground text-xs">s.d.</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className={cn(DC_CONTROLS.input, "h-9 w-[150px] font-mono text-xs")}
                    title="Sampai Tanggal Masuk"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          <ActiveFilterChips chips={activeFilterChips} onResetAll={handleResetFilters} />
        </CardHeader>

        {/* MAIN DATA TABLE */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/40">
              <TableRow className="border-slate-200/80 border-b hover:bg-transparent dark:border-white/10">
                {isColVisible("waktuMasuk") && (
                  <TableHead className="w-44 font-semibold text-xs uppercase tracking-wider">Waktu Masuk</TableHead>
                )}
                {isColVisible("foto") && (
                  <TableHead className="w-12 text-center font-semibold text-xs uppercase tracking-wider">
                    Foto
                  </TableHead>
                )}
                {isColVisible("namaJaring") && (
                  <TableHead className="min-w-[150px] font-semibold text-xs uppercase tracking-wider">
                    Nama Jaring
                  </TableHead>
                )}
                {isColVisible("kodeJaring") && (
                  <TableHead className="min-w-[120px] font-semibold text-xs uppercase tracking-wider">
                    Kode Jaring
                  </TableHead>
                )}
                {isColVisible("gaswil") && (
                  <TableHead className="min-w-[160px] font-semibold text-xs uppercase tracking-wider">
                    Petugas Wilayah (Gaswil)
                  </TableHead>
                )}
                {isColVisible("whatsapp") && (
                  <TableHead className="min-w-[130px] font-semibold text-xs uppercase tracking-wider">
                    Nomor WhatsApp
                  </TableHead>
                )}
                {isColVisible("judulIsi") && (
                  <TableHead className="min-w-[220px] font-semibold text-xs uppercase tracking-wider">
                    Judul & Isi Laporan
                  </TableHead>
                )}
                {isColVisible("lokasiAktual") && (
                  <TableHead className="min-w-[190px] font-semibold text-xs uppercase tracking-wider">
                    Lokasi Aktual Laporan
                  </TableHead>
                )}
                {isColVisible("wilayahPenempatan") && (
                  <TableHead className="min-w-[190px] font-semibold text-xs uppercase tracking-wider">
                    Wilayah Penempatan Jaring
                  </TableHead>
                )}
                {isColVisible("statusProses") && (
                  <TableHead className="w-44 font-semibold text-xs uppercase tracking-wider">Status Proses</TableHead>
                )}
                {isColVisible("refNum") && (
                  <TableHead className="w-36 font-semibold text-xs uppercase tracking-wider">Nomor Referensi</TableHead>
                )}
                <TableHead className="w-32 text-center font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={12} className="py-12 text-center font-mono text-muted-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-sky-400" />
                      Memuat data laporan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((item) => {
                  const isUnread = !readReportIds.has(item.id);
                  const messageCount = item.messages?.length ?? item.counts?.contentParts ?? 0;
                  const mediaCount = item.media?.length ?? item.counts?.media ?? 0;

                  const identity = resolveJaringIdentity({
                    id: item.jaringId,
                    jaringFullName: item.jaringFullName,
                    jaringAlias: item.jaringAlias,
                    jaringCode: item.jaringCode,
                    jaringWhatsAppNumber: item.jaringWhatsAppNumber,
                    jaringProfilePhotoFileId: item.jaringProfilePhotoFileId,
                    profilePhotoUrl: item.jaringProfilePhotoUrl,
                    gaswilName: item.gaswilName,
                    gaswilAssignmentId: item.gaswilAssignmentId,
                    gaswilUserProfileId: item.gaswilUserProfileId,
                    placementArea: item.placementArea,
                  });

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50",
                        isUnread && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
                      )}
                    >
                      {isColVisible("waktuMasuk") && (
                        <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-xs">
                          {formatDateTime(item.reportedAt || item.submittedAt || item.createdAt)}
                        </TableCell>
                      )}
                      {isColVisible("foto") && (
                        <TableCell className="text-center">
                          <div className="mx-auto flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                            {identity.avatarUrl ? (
                              <img src={identity.avatarUrl} alt={identity.name} className="size-full object-cover" />
                            ) : (
                              <User className="size-4 text-slate-400" />
                            )}
                          </div>
                        </TableCell>
                      )}
                      {isColVisible("namaJaring") && (
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs">{identity.name}</div>
                        </TableCell>
                      )}
                      {isColVisible("kodeJaring") && (
                        <TableCell>
                          <span className="font-bold font-mono text-sky-600 text-xs dark:text-sky-400">
                            {identity.code}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("gaswil") && (
                        <TableCell>
                          <GaswilEntityLink
                            assignmentId={identity.gaswilAssignmentId}
                            userProfileId={identity.gaswilUserProfileId}
                            name={identity.gaswilName}
                          />
                        </TableCell>
                      )}
                      {isColVisible("whatsapp") && (
                        <TableCell>
                          <span className="font-mono text-emerald-600 text-xs dark:text-emerald-400">
                            {identity.whatsappNumber}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("judulIsi") && (
                        <TableCell className="max-w-xs">
                          <div className="space-y-0.5">
                            <p className="line-clamp-1 font-bold text-foreground text-xs">{item.displayTitle}</p>
                            {item.content ? (
                              <p className="line-clamp-1 font-normal text-[11px] text-muted-foreground">
                                {item.content}
                              </p>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground">
                              {messageCount} pesan - {mediaCount} media
                            </p>
                          </div>
                        </TableCell>
                      )}
                      {isColVisible("lokasiAktual") && (
                        <TableCell>
                          <span className="flex items-start gap-1.5 text-foreground text-xs">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                            <span className="line-clamp-2">{formatFullAreaName(item.resolvedArea)}</span>
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("wilayahPenempatan") && (
                        <TableCell>
                          <span className="line-clamp-2 text-muted-foreground text-xs">{identity.placementArea}</span>
                        </TableCell>
                      )}
                      {isColVisible("statusProses") && (
                        <TableCell>
                          {(() => {
                            const displayStatus = item.processStatus ?? item.displayStatus ?? item.verificationStatus;
                            return (
                              <span
                                className={cn(
                                  "inline-flex items-center rounded border px-2 py-0.5 font-semibold text-[10px] uppercase tracking-wide",
                                  verificationStatusBadgeVariant(displayStatus),
                                )}
                              >
                                {verificationStatusLabel(displayStatus)}
                              </span>
                            );
                          })()}
                        </TableCell>
                      )}
                      {isColVisible("refNum") && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-sky-600 text-xs dark:text-sky-400">
                              {item.referenceNumber || item.id.slice(0, 8)}
                            </span>
                            {isUnread && (
                              <Badge
                                variant="outline"
                                className="h-4 border-amber-500/40 bg-amber-500/10 px-1 py-0 font-mono font-semibold text-[9px] text-amber-600 dark:text-amber-400"
                              >
                                BARU
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          onClick={() => {
                            if (item.status === "SUBMITTED") void markReportAsRead(item.id);
                          }}
                          className="h-8 gap-1.5 rounded-md border-sky-500/30 px-2.5 font-medium text-sky-600 text-xs hover:bg-sky-500/10 dark:text-sky-400"
                        >
                          <Link href={`/dashboard/laporan-jaring/${item.id}`}>
                            <Eye className="size-3.5" />
                            Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="space-y-2 py-12 text-center text-muted-foreground text-xs">
                    <DOMAIN_VISUALS.jaringReport.Icon className="mx-auto size-8 text-muted-foreground/40" />
                    <p>Tidak ada laporan yang sesuai filter.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* TABLE PAGINATION FOOTER */}
        <TablePagination
          page={page}
          limit={limit}
          total={totalReports}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          loading={loadingList}
        />
      </Card>
    </main>
  );
}
