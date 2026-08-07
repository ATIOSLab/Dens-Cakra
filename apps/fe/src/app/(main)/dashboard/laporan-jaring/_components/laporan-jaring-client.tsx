"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  Archive,
  Check,
  ChevronDown,
  Eye,
  FileCheck,
  FileCheck2,
  FileText,
  FileWarning,
  MapPin,
  Paperclip,
  RefreshCw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { jakartaBoundaryIso, resolveJakartaPeriodRange } from "@/lib/domain/date-time";
import { cn } from "@/lib/utils";

import {
  alignJaringReportCategorySummary,
  formatDateTime,
  isJaringReportCategoryFilterActive,
  JARING_REPORT_CATEGORY_FILTERS,
  type JaringReportCategoryKey,
  jaringReportCategoryFromCompleteness,
  resolveJaringReportCategorySelectValue,
  urgencyBadgeClass,
  urgencyLabel,
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
    completeJaringReports: number;
    incompleteJaringReports: number;
    baketReports: number;
    verifiedJaringReports: number;
    waitingVerificationReports: number;
  };
};

const EMPTY_SUMMARY = {
  totalJaringReports: 0,
  completeJaringReports: 0,
  incompleteJaringReports: 0,
  baketReports: 0,
  verifiedJaringReports: 0,
  waitingVerificationReports: 0,
};

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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 gap-2 justify-between text-xs font-normal border-slate-200 bg-background hover:bg-slate-50 dark:border-white/10 dark:hover:bg-slate-900 transition-colors min-w-[170px]",
            selectedId !== "ALL" &&
              "border-sky-500/50 bg-sky-500/5 dark:bg-sky-500/10 font-semibold text-sky-700 dark:text-[#38BDF8]",
          )}
        >
          <div className="flex items-center gap-1.5 truncate max-w-[180px]">
            <Users className="size-3.5 shrink-0 text-sky-600 dark:text-[#38BDF8]" />
            <span className="truncate font-mono">
              {selectedId === "ALL"
                ? "Semua Jaring"
                : selectedOption
                  ? `${selectedOption.displayName} · ${selectedOption.whatsappNumber || "tanpa WhatsApp"} · ${selectedOption.sandiCode}`
                  : "Filter Jaring"}
            </span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedId !== "ALL" && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect("ALL");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    onSelect("ALL");
                  }
                }}
                className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronDown className="size-3.5 opacity-50 shrink-0" />
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[290px] p-0 border-slate-200 dark:border-white/10 shadow-lg rounded-lg"
        align="start"
      >
        {/* Sticky Search Header */}
        <div className="p-2 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDisplayCount(15);
              }}
              placeholder="Cari nama, WhatsApp, atau kode Jaring..."
              className="pl-8 h-8 text-xs bg-background"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          className="max-h-[240px] overflow-y-auto p-1 divide-y divide-slate-100 dark:divide-white/5 scrollbar-thin"
        >
          {/* Default option: Semua Jaring */}
          <button
            type="button"
            onClick={() => {
              onSelect("ALL");
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-colors text-left cursor-pointer",
              selectedId === "ALL"
                ? "bg-sky-500/10 text-sky-700 dark:text-[#38BDF8] font-semibold"
                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground",
            )}
          >
            <div className="flex items-center gap-2">
              <Users className="size-3.5 text-muted-foreground" />
              <span>Semua Jaring</span>
            </div>
            {selectedId === "ALL" && <Check className="size-3.5 text-sky-600 dark:text-[#38BDF8]" />}
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
                    "w-full flex items-center justify-between px-3 py-2 text-xs rounded-md transition-colors text-left cursor-pointer my-0.5",
                    isSelected
                      ? "bg-sky-500/10 text-sky-700 dark:text-[#38BDF8] font-semibold"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 text-foreground",
                  )}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="truncate text-foreground font-semibold">{opt.displayName}</div>
                    <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                      {opt.whatsappNumber || "WhatsApp belum tersedia"} · {opt.sandiCode}
                    </div>
                  </div>

                  {isSelected && <Check className="size-3.5 shrink-0 text-sky-600 dark:text-[#38BDF8]" />}
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground font-mono">Jaring tidak ditemukan</div>
          )}

          {/* Infinite Scroll indicator */}
          {displayCount < filteredOptions.length && (
            <div className="p-2 text-center text-[10px] text-muted-foreground font-mono border-t border-dashed border-slate-200 dark:border-white/10">
              Scroll ke bawah untuk memuat lebih banyak ({displayCount}/{filteredOptions.length})
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const FO_LAPORAN_JARING_COLUMNS: ColumnOption[] = [
  { id: "refNum", label: "No. Referensi" },
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "judulIsi", label: "Judul & Isi Laporan", alwaysVisible: true },
  { id: "lokasiAktual", label: "Lokasi Aktual Laporan" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan Jaring" },
  { id: "kelengkapan", label: "Kelengkapan" },
  { id: "statusProses", label: "Status Proses" },
  { id: "waktuMasuk", label: "Waktu Masuk" },
];

export function LaporanJaringClient() {
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
  const isColVisible = (id: string) => visibleColumns[id] !== false;

  // Read report IDs state from localStorage
  const [readReportIds, setReadReportIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("read_reports_jaring") || "[]");
        setReadReportIds(new Set(stored));
      } catch {}
    }
  }, []);

  const markReportAsRead = async (reportId: string) => {
    if (reportId) {
      try {
        void apiBrowserMutation("PATCH", `/jaring/reports/${reportId}/read`);
      } catch {}
      if (typeof window !== "undefined") {
        try {
          const stored: string[] = JSON.parse(localStorage.getItem("read_reports_jaring") || "[]");
          if (!stored.includes(reportId)) {
            stored.push(reportId);
            localStorage.setItem("read_reports_jaring", JSON.stringify(stored));
            setReadReportIds(new Set(stored));
          }
        } catch {}
      }
    }
  };

  // Filter, Search, and Pagination states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [completenessFilter, setCompletenessFilter] = useState<"ALL" | "COMPLETE" | "INCOMPLETE">("ALL");
  const [stageFilter, setStageFilter] = useState<"ALL" | "JARING_REPORT">("JARING_REPORT");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
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
          stage: stageFilter,
          page: String(page),
          limit: String(limit),
          sortBy: "reportedAt",
          sortOrder: "desc",
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "ALL") params.set("verificationStatus", statusFilter);
        if (completenessFilter !== "ALL") params.set("completeness", completenessFilter);
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
    [completenessFilter, debouncedSearch, jaringFilter, limit, page, periodRange, stageFilter, statusFilter],
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
            const verifiedOnly = data.jaring.filter((j: any) => j.registrationStatus === "APPROVED");
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

  const paginatedReports = reports;
  const alignedSummary = alignJaringReportCategorySummary(reportSummary);
  const categoryFilterState = {
    verificationStatus: statusFilter,
    completeness: completenessFilter,
    stage: stageFilter,
  };
  const categorySelectValue = resolveJaringReportCategorySelectValue(categoryFilterState);

  function applyCategoryFilter(category: JaringReportCategoryKey) {
    const filter = JARING_REPORT_CATEGORY_FILTERS[category];
    setStatusFilter(filter.verificationStatus);
    setCompletenessFilter(filter.completeness);
    setStageFilter(filter.stage);
    setPage(1);
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 transition-colors duration-150 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">Laporan Jaring</h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Kelola daftar laporan masuk dari Daftar Jaring, periksa keabsahan verifikasi, isi metadata, dan konversikan
            menjadi Baket Intelijen.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchReports()}
          disabled={loadingList}
          className="w-fit h-9 gap-2"
        >
          <RefreshCw className={cn("size-4 text-sky-600 dark:text-[#38BDF8]", loadingList && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {/* KPI METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          type="button"
          onClick={() => applyCategoryFilter("TOTAL")}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            isJaringReportCategoryFilterActive("TOTAL", categoryFilterState)
              ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-sky-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-[#38BDF8] shrink-0">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {JARING_REPORT_CATEGORY_FILTERS.TOTAL.label}
            </p>
            <p className="text-xl font-bold tracking-tight text-foreground">{alignedSummary.totalJaringReports}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => applyCategoryFilter("COMPLETE")}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            isJaringReportCategoryFilterActive("COMPLETE", categoryFilterState)
              ? "border-green-500 ring-2 ring-green-500/30 bg-green-500/5 dark:bg-green-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-green-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
            <FileCheck2 className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {JARING_REPORT_CATEGORY_FILTERS.COMPLETE.label}
            </p>
            <p className="text-xl font-bold tracking-tight text-green-600 dark:text-green-400">
              {alignedSummary.completeJaringReports}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => applyCategoryFilter("INCOMPLETE")}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            isJaringReportCategoryFilterActive("INCOMPLETE", categoryFilterState)
              ? "border-orange-500 ring-2 ring-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-orange-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
            <FileWarning className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {JARING_REPORT_CATEGORY_FILTERS.INCOMPLETE.label}
            </p>
            <p className="text-xl font-bold tracking-tight text-orange-600 dark:text-orange-400">
              {alignedSummary.incompleteJaringReports}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => applyCategoryFilter("BAKET")}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            isJaringReportCategoryFilterActive("BAKET", categoryFilterState)
              ? "border-violet-500 ring-2 ring-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-violet-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
            <Archive className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {JARING_REPORT_CATEGORY_FILTERS.BAKET.label}
            </p>
            <p className="text-xl font-bold tracking-tight text-violet-600 dark:text-violet-400">
              {alignedSummary.baketReports}
            </p>
          </div>
        </button>
      </div>

      {/* FULL TABLE VIEW CONTAINER */}
      <Card className="border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-3 border-b border-slate-200/80 dark:border-white/10 space-y-0">
          {/* Controls Bar - Uniform design matching Jaring page */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative w-48 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari referensi, judul..."
                  className="pl-8 h-8 text-xs bg-background"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Jaring Filter Popover with inline label */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Jaring:</span>
                <JaringFilterPopover
                  options={jaringOptions}
                  selectedId={jaringFilter}
                  onSelect={(id) => {
                    setJaringFilter(id);
                    setPage(1);
                  }}
                />
              </div>

              {/* Status Filter Dropdown with inline label */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Status Verifikasi:</span>
                <NativeSelect
                  value={statusFilter === "METADATA_RECORDED" ? "ALL" : statusFilter}
                  onChange={(e) => {
                    const nextStatus = e.target.value;
                    if (nextStatus === "METADATA_RECORDED") {
                      applyCategoryFilter("BAKET");
                    } else {
                      setStatusFilter(nextStatus);
                      setStageFilter("JARING_REPORT");
                      setPage(1);
                    }
                  }}
                  className="h-8 text-xs bg-background min-w-[170px]"
                >
                  <option value="ALL">Semua Status Verifikasi</option>
                  <option value="WAITING_FIELD_OFFICER_VERIFICATION">Belum Terverifikasi</option>
                  <option value="NEEDS_FIELD_OFFICER_REVIEW">Perlu Ditinjau</option>
                  <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi</option>
                </NativeSelect>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Kategori Data:</span>
                <NativeSelect
                  value={categorySelectValue}
                  onChange={(event) => {
                    const nextCategory = event.target.value;
                    if (nextCategory === "BAKET") {
                      applyCategoryFilter("BAKET");
                      return;
                    }
                    applyCategoryFilter(jaringReportCategoryFromCompleteness(nextCategory));
                  }}
                  className="h-8 min-w-[220px] bg-background text-xs"
                >
                  <option value="TOTAL">{JARING_REPORT_CATEGORY_FILTERS.TOTAL.label}</option>
                  <option value="COMPLETE">{JARING_REPORT_CATEGORY_FILTERS.COMPLETE.label}</option>
                  <option value="INCOMPLETE">{JARING_REPORT_CATEGORY_FILTERS.INCOMPLETE.label}</option>
                  <option value="BAKET">{JARING_REPORT_CATEGORY_FILTERS.BAKET.label}</option>
                </NativeSelect>
              </div>

              {/* Periode Filter Dropdown */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Periode:</span>
                <NativeSelect
                  value={periodPreset}
                  onChange={(e) => {
                    setPeriodPreset(e.target.value as any);
                    setPage(1);
                  }}
                  className="h-8 text-xs bg-background min-w-[150px]"
                >
                  <option value="ALL">Semua Periode</option>
                  <option value="TODAY">Hari Ini</option>
                  <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                  <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                  <option value="CUSTOM">Kustom (Pilih Tanggal)</option>
                </NativeSelect>
              </div>

              {/* Date Range Picker (Only shown when periodPreset === "CUSTOM") */}
              {periodPreset === "CUSTOM" ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <span>Dari:</span>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStartDate(val);
                        setPage(1);
                      }}
                      className="h-8 text-xs bg-background w-[130px]"
                      title="Dari Tanggal Masuk"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                    <span>s.d:</span>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEndDate(val);
                        setPage(1);
                      }}
                      className="h-8 text-xs bg-background w-[130px]"
                      title="Sampai Tanggal Masuk"
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <ColumnVisibilityToggle
                columns={FO_LAPORAN_JARING_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              {(search ||
                jaringFilter !== "ALL" ||
                periodPreset !== "ALL" ||
                startDate ||
                endDate ||
                statusFilter !== "ALL" ||
                completenessFilter !== "ALL" ||
                stageFilter !== "JARING_REPORT") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setJaringFilter("ALL");
                    setPeriodPreset("ALL");
                    setStartDate("");
                    setEndDate("");
                    setStatusFilter("ALL");
                    setCompletenessFilter("ALL");
                    setStageFilter("JARING_REPORT");
                    setPage(1);
                  }}
                  className="h-8 text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* MAIN DATA TABLE */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/40">
              <TableRow className="border-b border-slate-200/80 dark:border-white/10 hover:bg-transparent">
                {isColVisible("refNum") && <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider">No. Referensi</TableHead>}
                {isColVisible("foto") && <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider">Foto</TableHead>}
                {isColVisible("namaJaring") && <TableHead className="min-w-[150px] text-xs font-semibold uppercase tracking-wider">Nama Jaring</TableHead>}
                {isColVisible("kodeJaring") && <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wider">Kode Jaring</TableHead>}
                {isColVisible("gaswil") && <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wider">Petugas Wilayah (Gaswil)</TableHead>}
                {isColVisible("whatsapp") && <TableHead className="min-w-[130px] text-xs font-semibold uppercase tracking-wider">Nomor WhatsApp</TableHead>}
                {isColVisible("judulIsi") && <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wider">Judul & Isi Laporan</TableHead>}
                {isColVisible("lokasiAktual") && <TableHead className="min-w-[190px] text-xs font-semibold uppercase tracking-wider">Lokasi Aktual Laporan</TableHead>}
                {isColVisible("wilayahPenempatan") && <TableHead className="min-w-[190px] text-xs font-semibold uppercase tracking-wider">Wilayah Penempatan Jaring</TableHead>}
                {isColVisible("kelengkapan") && <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider">Kelengkapan</TableHead>}
                {isColVisible("statusProses") && <TableHead className="w-44 text-xs font-semibold uppercase tracking-wider">Status Proses</TableHead>}
                {isColVisible("waktuMasuk") && <TableHead className="w-44 text-xs font-semibold uppercase tracking-wider">Waktu Masuk</TableHead>}
                <TableHead className="w-32 text-center text-xs font-semibold uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-xs text-muted-foreground font-mono">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-[#38BDF8]" />
                      Memuat data laporan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((item) => {
                  const isUnread = !readReportIds.has(item.id);
                  const messageCount = item.messages?.length ?? item.counts?.contentParts ?? 0;
                  const mediaCount = item.media?.length ?? item.counts?.media ?? 0;
                  const draftComplete = Boolean(item.content && item.location && mediaCount > 0);
                  const completenessStatus = item.completenessStatus ?? "NOT_DETERMINED";
                  const completenessLabel =
                    completenessStatus === "COMPLETE"
                      ? "Lengkap"
                      : completenessStatus === "INCOMPLETE"
                        ? "Tidak Lengkap"
                        : "Draf (Belum Dikirim)";

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
                        "hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors",
                        isUnread && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
                      )}
                    >
                      {isColVisible("refNum") && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-sky-600 dark:text-[#38BDF8]">
                              {item.referenceNumber || item.id.slice(0, 8)}
                            </span>
                            {isUnread && (
                              <Badge
                                variant="outline"
                                className="text-[9px] font-mono px-1 py-0 h-4 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                              >
                                BARU
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {isColVisible("foto") && (
                        <TableCell className="text-center">
                          <div className="mx-auto size-9 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center">
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
                          <div className="font-semibold text-xs text-foreground">{identity.name}</div>
                        </TableCell>
                      )}
                      {isColVisible("kodeJaring") && (
                        <TableCell>
                          <span className="font-mono text-xs text-sky-600 dark:text-[#38BDF8] font-bold">{identity.code}</span>
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
                          <span className="font-mono text-xs text-emerald-600 dark:text-emerald-400">{identity.whatsappNumber}</span>
                        </TableCell>
                      )}
                      {isColVisible("judulIsi") && (
                        <TableCell className="max-w-xs">
                          <div className="space-y-0.5">
                            <p className="font-bold text-xs text-foreground line-clamp-1">{item.displayTitle}</p>
                            {item.content ? (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 font-normal">{item.content}</p>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground">
                              {messageCount} pesan · {mediaCount} media
                              {item.status === "ACTIVE" ? ` · ${draftComplete ? "Lengkap" : "Belum lengkap"}` : ""}
                            </p>
                          </div>
                        </TableCell>
                      )}
                      {isColVisible("lokasiAktual") && (
                        <TableCell>
                          <span className="flex items-start gap-1.5 text-xs text-foreground">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                            <span className="line-clamp-2">{formatFullAreaName(item.resolvedArea)}</span>
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("wilayahPenempatan") && (
                        <TableCell>
                          <span className="text-xs text-muted-foreground line-clamp-2">{identity.placementArea}</span>
                        </TableCell>
                      )}
                      {isColVisible("kelengkapan") && (
                        <TableCell>
                          <span
                            title={item.completenessIssues?.join("; ") || completenessLabel}
                            className={cn(
                              "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold",
                              completenessStatus === "COMPLETE"
                                ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                                : completenessStatus === "INCOMPLETE"
                                  ? "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                                  : "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400",
                            )}
                          >
                            {completenessLabel}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("statusProses") && (
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              verificationStatusBadgeVariant(item.verificationStatus),
                            )}
                          >
                            {verificationStatusLabel(item.verificationStatus)}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("waktuMasuk") && (
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.reportedAt || item.submittedAt || item.createdAt)}
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
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
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
                  <TableCell colSpan={13} className="py-12 text-center text-xs text-muted-foreground space-y-2">
                    <FileText className="size-8 mx-auto text-muted-foreground/40" />
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
