"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  FileCheck,
  FileText,
  RefreshCw,
  Search,
  User,
  Users,
  X,
} from "lucide-react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type {
  JaringReportSessionDetail,
  VerificationStatus,
} from "./laporan-jaring-types";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function verificationStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Belum Terverifikasi";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "Perlu Review";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "Terverifikasi";
    case "METADATA_RECORDED":
      return "Baket Dibuat";
    default:
      return status;
  }
}

function verificationStatusBadgeVariant(status: VerificationStatus) {
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-[#38BDF8]";
    case "METADATA_RECORDED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400";
  }
}

interface JaringOption {
  id: string;
  sandiCode: string;
  displayName: string;
  reportCount: number;
  unreadCount: number;
}

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
        opt.displayName.toLowerCase().includes(q),
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
            selectedId !== "ALL" && "border-sky-500/50 bg-sky-500/5 dark:bg-sky-500/10 font-semibold text-sky-700 dark:text-[#38BDF8]",
          )}
        >
          <div className="flex items-center gap-1.5 truncate max-w-[180px]">
            <Users className="size-3.5 shrink-0 text-sky-600 dark:text-[#38BDF8]" />
            <span className="truncate font-mono">
              {selectedId === "ALL"
                ? "Semua Jaring"
                : selectedOption
                  ? selectedOption.displayName !== selectedOption.sandiCode
                    ? `${selectedOption.sandiCode} - ${selectedOption.displayName}`
                    : selectedOption.sandiCode
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

      <PopoverContent className="w-[290px] p-0 border-slate-200 dark:border-white/10 shadow-lg rounded-lg" align="start">
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
              placeholder="Cari sandi / nama Jaring..."
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
              const isSelected = selectedId === opt.id || selectedId === opt.sandiCode || selectedId === opt.displayName;
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
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-sky-600 dark:text-[#38BDF8] text-[11px] shrink-0">
                        {opt.sandiCode}
                      </span>
                      {opt.displayName !== opt.sandiCode && (
                        <span className="truncate text-foreground font-medium">{opt.displayName}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-mono px-1.5 py-0 h-4 transition-colors",
                        opt.unreadCount > 0
                          ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold"
                          : "border-slate-200 dark:border-white/10 text-muted-foreground opacity-60",
                      )}
                    >
                      {opt.unreadCount > 0 ? `${opt.unreadCount} belum dibaca` : "0 belum dibaca"}
                    </Badge>
                    {isSelected && <Check className="size-3.5 text-sky-600 dark:text-[#38BDF8]" />}
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-xs text-muted-foreground font-mono">
              Jaring tidak ditemukan
            </div>
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

export function LaporanJaringClient() {
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [workspaceJarings, setWorkspaceJarings] = useState<{ id: string; code: string; aliasName: string; fullName?: string | null; registrationStatus?: string | null }[]>([]);
  const [loadingList, setLoadingList] = useState(true);

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
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch list of reports
  async function fetchReports(overrideStart?: string, overrideEnd?: string) {
    setLoadingList(true);
    try {
      let url = "/jaring/reports?registrationStatus=APPROVED";
      const sDate = overrideStart !== undefined ? overrideStart : startDate;
      const eDate = overrideEnd !== undefined ? overrideEnd : endDate;

      if (sDate && sDate.length === 10) {
        url += `&from=${encodeURIComponent(`${sDate}T00:00:00.000Z`)}`;
      }
      if (eDate && eDate.length === 10) {
        url += `&to=${encodeURIComponent(`${eDate}T23:59:59.999Z`)}`;
      }

      const res = await apiBrowserFetch<{ items?: JaringReportSessionDetail[] } | JaringReportSessionDetail[]>(
        url,
      );
      const itemsList = Array.isArray(res) ? res : res?.items || [];
      setReports(itemsList);
    } catch (err) {
      console.error("Gagal memuat daftar laporan:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void fetchReports();
    async function loadWorkspace() {
      try {
        const res = await fetch("/api/field-officer/workspace");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.jaring)) {
            const verifiedOnly = data.jaring.filter(
              (j: any) => j.registrationStatus === "APPROVED",
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

    const verifiedJarings = workspaceJarings.filter(
      (j) => j.registrationStatus === "APPROVED",
    );

    for (const j of verifiedJarings) {
      const sandi = j.aliasName || j.code;
      const name = j.fullName || j.aliasName;
      map.set(j.id, {
        id: j.id,
        sandiCode: sandi,
        displayName: name !== sandi ? name : sandi,
        reportCount: 0,
        unreadCount: 0,
      });
    }

    for (const r of reports) {
      const key = r.jaringId || r.jaringCode || r.jaringAlias || "UNKNOWN";
      const existing = map.get(key);
      if (existing) {
        existing.reportCount += 1;
        const isUnread = !r.readAt && !r.isRead && !readReportIds.has(r.id);
        if (isUnread) {
          existing.unreadCount += 1;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) =>
      a.sandiCode.localeCompare(b.sandiCode, "id", { sensitivity: "base" }),
    );
  }, [workspaceJarings, reports, readReportIds]);

  // Compute summary metrics (excluding Baket/METADATA_RECORDED)
  const summary = useMemo(() => {
    const activeReports = reports.filter((r) => r.verificationStatus !== "METADATA_RECORDED");
    const total = activeReports.length;
    const waiting = activeReports.filter((r) => r.verificationStatus === "WAITING_FIELD_OFFICER_VERIFICATION").length;
    const verified = activeReports.filter((r) => r.verificationStatus === "VERIFIED_BY_FIELD_OFFICER").length;
    return { total, waiting, verified };
  }, [reports]);

  // Filtered reports list (excluding Baket/METADATA_RECORDED)
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (item.verificationStatus === "METADATA_RECORDED") return false;

      if (statusFilter !== "ALL" && item.verificationStatus !== statusFilter) {
        return false;
      }
      if (jaringFilter !== "ALL") {
        const match =
          item.jaringId === jaringFilter ||
          item.jaringCode === jaringFilter ||
          item.jaringAlias === jaringFilter;
        if (!match) return false;
      }

      // Date Range Filter (Dari Tanggal & Sampai Tanggal)
      const reportDateStr = item.submittedAt || item.createdAt;
      if (reportDateStr) {
        if (startDate && startDate.length === 10) {
          const start = new Date(`${startDate}T00:00:00`);
          if (!Number.isNaN(start.getTime())) {
            const reportDate = new Date(reportDateStr);
            if (reportDate < start) return false;
          }
        }
        if (endDate && endDate.length === 10) {
          const end = new Date(`${endDate}T23:59:59.999`);
          if (!Number.isNaN(end.getTime())) {
            const reportDate = new Date(reportDateStr);
            if (reportDate > end) return false;
          }
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const ref = (item.referenceNumber || "").toLowerCase();
        const t = (item.title || "").toLowerCase();
        const c = (item.content || "").toLowerCase();
        const jAlias = (item.jaringAlias || "").toLowerCase();
        const jCode = (item.jaringCode || "").toLowerCase();
        return ref.includes(q) || t.includes(q) || c.includes(q) || jAlias.includes(q) || jCode.includes(q);
      }
      return true;
    });
  }, [reports, statusFilter, jaringFilter, startDate, endDate, search]);

  // Paginated reports for table
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto transition-colors duration-150">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">
            Laporan Jaring
          </h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Kelola daftar laporan masuk dari Daftar Jaring, periksa keabsahan verifikasi, isi metadata, dan konversikan menjadi Baket Intelijen.
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "ALL"
              ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-sky-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-[#38BDF8] shrink-0">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Laporan</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{summary.total}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("VERIFIED_BY_FIELD_OFFICER");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "VERIFIED_BY_FIELD_OFFICER"
              ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-sky-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-[#38BDF8] shrink-0">
            <CheckCircle2 className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Terverifikasi</p>
            <p className="text-xl font-bold tracking-tight text-sky-600 dark:text-[#38BDF8]">{summary.verified}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("WAITING_FIELD_OFFICER_VERIFICATION");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "WAITING_FIELD_OFFICER_VERIFICATION"
              ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-amber-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Belum Terverifikasi</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{summary.waiting}</p>
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

              {/* Date Range Picker (Dari & s/d) with inline labels */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Dari:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDate(val);
                    setPage(1);
                    if (val.length === 10 || val === "") {
                      void fetchReports(val, endDate);
                    }
                  }}
                  className="h-8 text-xs bg-background w-[130px]"
                  title="Dari Tanggal Masuk"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>s/d:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEndDate(val);
                    setPage(1);
                    if (val.length === 10 || val === "") {
                      void fetchReports(startDate, val);
                    }
                  }}
                  className="h-8 text-xs bg-background w-[130px]"
                  title="Sampai Tanggal Masuk"
                />
              </div>

              {/* Status Filter Dropdown with inline label */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Status:</span>
                <NativeSelect
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs bg-background min-w-[170px]"
                >
                  <option value="ALL">Semua Status Verifikasi</option>
                  <option value="WAITING_FIELD_OFFICER_VERIFICATION">Belum Terverifikasi</option>
                  <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi</option>
                </NativeSelect>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(search || jaringFilter !== "ALL" || startDate || endDate || statusFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setJaringFilter("ALL");
                    setStartDate("");
                    setEndDate("");
                    setStatusFilter("ALL");
                    setPage(1);
                    void fetchReports("", "");
                  }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                  title="Reset Filter"
                >
                  <X className="size-3.5 mr-1" />
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
                <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider">No</TableHead>
                <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider">No. Referensi</TableHead>
                <TableHead className="min-w-[240px] text-xs font-semibold uppercase tracking-wider">Judul & Isi Laporan</TableHead>
                <TableHead className="w-40 text-xs font-semibold uppercase tracking-wider">Pengirim (Jaring)</TableHead>
                <TableHead className="w-48 text-xs font-semibold uppercase tracking-wider">Status Verifikasi</TableHead>
                <TableHead className="w-44 text-xs font-semibold uppercase tracking-wider">Waktu Masuk</TableHead>
                <TableHead className="w-32 text-center text-xs font-semibold uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground font-mono">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-[#38BDF8]" />
                      Memuat data laporan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((item, idx) => {
                  const itemIndex = (page - 1) * limit + idx + 1;
                  const isUnread = !readReportIds.has(item.id);
                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors",
                        isUnread && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
                      )}
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">{itemIndex}</TableCell>
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
                      <TableCell className="max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-foreground line-clamp-1">
                            {item.title || "Laporan Jaring"}
                          </p>
                          {item.content ? (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 font-normal">
                              {item.content}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <User className="size-3.5 text-sky-600 dark:text-[#38BDF8] shrink-0" />
                          {item.jaringAlias || item.jaringCode || "Jaring"}
                        </span>
                      </TableCell>
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
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.submittedAt || item.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          onClick={() => markReportAsRead(item.id)}
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
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground space-y-2">
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
          total={filteredReports.length}
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
