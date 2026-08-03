"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  List,
  MapPin,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type { CoachingReportItem, PeriodeFilterOption } from "@/app/(main)/dashboard/field-officer/laporan-pembinaan/_components/laporan-pembinaan-types";

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

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

interface RawJaringItem {
  id: string;
  code: string;
  aliasName?: string | null;
  fullName?: string | null;
  registrationStatus?: string | null;
}

export function LaporanPembinaanCoordinatorClient() {
  const [reports, setReports] = useState<CoachingReportItem[]>([]);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilterOption>("ALL");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Load Jarings & Coaching Reports
  async function loadAllData() {
    setLoadingData(true);
    try {
      // 1. Fetch Jarings list
      const jaringsRes = await apiBrowserFetch<{ items?: RawJaringItem[] } | RawJaringItem[]>("/jaring?limit=100");
      const jarings = Array.isArray(jaringsRes) ? jaringsRes : jaringsRes?.items || [];
      setJaringList(jarings);

      const approvedJarings = jarings.filter((j) => j.registrationStatus === "APPROVED");

      // 2. Fetch coaching reports for each approved Jaring
      const fetchPromises = approvedJarings.map(async (jaring) => {
        try {
          const res = await apiBrowserFetch<{ items?: CoachingReportItem[] } | CoachingReportItem[]>(
            `/jaring/${jaring.id}/coaching-reports?limit=100`,
          );
          const items = Array.isArray(res) ? res : res?.items || [];
          return items.map((report) => ({
            ...report,
            jaringId: jaring.id,
            jaringCode: jaring.code,
            jaringAlias: jaring.aliasName || jaring.code,
            jaringName: jaring.fullName || jaring.aliasName || jaring.code,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allReports = results.flat();

      // Sort descending by reportedAt / createdAt
      allReports.sort((a, b) => new Date(b.reportedAt || b.createdAt).getTime() - new Date(a.reportedAt || a.createdAt).getTime());

      setReports(allReports);
    } catch (err) {
      console.error("Gagal memuat laporan pembinaan jaring (field-coordinator):", err);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    void loadAllData();
  }, []);

  // Summary Metrics
  const summary = useMemo(() => {
    const total = reports.length;
    const uniqueJaringCount = new Set(reports.map((r) => r.jaringId)).size;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const thisMonthCount = reports.filter((r) => {
      const d = new Date(r.reportedAt || r.createdAt);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    return { total, uniqueJaringCount, thisMonthCount };
  }, [reports]);

  // Jaring Popover options
  const popoverJaringOptions: JaringOption[] = useMemo(() => {
    return jaringList.map((j) => ({
      id: j.id,
      code: j.code,
      aliasName: j.aliasName || j.code,
      fullName: j.fullName,
      registrationStatus: j.registrationStatus,
    }));
  }, [jaringList]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Jaring filter
      if (jaringFilter !== "ALL") {
        const match =
          item.jaringId === jaringFilter ||
          item.jaringCode === jaringFilter ||
          item.jaringAlias === jaringFilter;
        if (!match) return false;
      }

      // Periode Filter Preset
      const reportDateStr = item.reportedAt || item.createdAt;
      if (reportDateStr) {
        const reportDate = new Date(reportDateStr);
        const now = new Date();

        if (periodeFilter === "TODAY") {
          const todayStr = now.toISOString().slice(0, 10);
          const repStr = reportDate.toISOString().slice(0, 10);
          if (todayStr !== repStr) return false;
        } else if (periodeFilter === "LAST_7_DAYS") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (reportDate < sevenDaysAgo) return false;
        } else if (periodeFilter === "THIS_MONTH") {
          if (reportDate.getFullYear() !== now.getFullYear() || reportDate.getMonth() !== now.getMonth()) {
            return false;
          }
        }

        // Custom Date Range
        if (startDate && startDate.length === 10) {
          const start = new Date(`${startDate}T00:00:00`);
          if (!Number.isNaN(start.getTime()) && reportDate < start) return false;
        }
        if (endDate && endDate.length === 10) {
          const end = new Date(`${endDate}T23:59:59.999`);
          if (!Number.isNaN(end.getTime()) && reportDate > end) return false;
        }
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const t = (item.title || "").toLowerCase();
        const c = (item.content || "").toLowerCase();
        const jAlias = (item.jaringAlias || "").toLowerCase();
        const jCode = (item.jaringCode || "").toLowerCase();
        const jName = (item.jaringName || "").toLowerCase();
        const foName = (item.fieldOfficer?.userProfile?.fullName || "").toLowerCase();

        return (
          t.includes(q) ||
          c.includes(q) ||
          jAlias.includes(q) ||
          jCode.includes(q) ||
          jName.includes(q) ||
          foName.includes(q)
        );
      }

      return true;
    });
  }, [reports, jaringFilter, periodeFilter, startDate, endDate, search]);

  // Paginated items
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  const handleResetFilters = () => {
    setSearch("");
    setJaringFilter("ALL");
    setPeriodeFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = [
      "ID Pembinaan",
      "Sandi Jaring",
      "Nama Jaring",
      "Judul Pembinaan",
      "Field Officer",
      "Tanggal Dilaporkan",
    ];

    const rows = filteredReports.map((r) => [
      `"${r.id}"`,
      `"${r.jaringAlias || r.jaringCode || '-'}"`,
      `"${r.jaringName || '-'}"`,
      `"${(r.title || '-').replace(/"/g, '""')}"`,
      `"${r.fieldOfficer?.userProfile?.fullName || '-'}"`,
      `"${formatDateTime(r.reportedAt)}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-pembinaan-jaring-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto transition-colors duration-150">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-coordinator">Field Coordinator</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>History Pembinaan Jaring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">
            History Pembinaan Jaring
          </h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Rekapitulasi dan pemantauan kegiatan pembinaan Jaring oleh Field Officer di wilayah koordinasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAllData()}
            disabled={loadingData}
            className="h-9 gap-2"
          >
            <RefreshCw className={cn("size-4 text-emerald-500 dark:text-emerald-400", loadingData && "animate-spin")} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredReports.length === 0}
            className="h-9 gap-2 border-slate-200 dark:border-white/10"
          >
            <Download className="size-4 text-sky-500" />
            EKSPOR CSV
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-card p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              TOTAL PEMBINAAN
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-foreground mt-1">
              {summary.total}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileText className="size-6" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-card p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              JARING DIBINA
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-sky-600 dark:text-sky-400 mt-1">
              {summary.uniqueJaringCount}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 shrink-0">
            <Users className="size-6" />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-card p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              PEMBINAAN BULAN INI
            </p>
            <p className="text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 mt-1">
              {summary.thisMonthCount}
            </p>
          </div>
          <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
            <Calendar className="size-6" />
          </div>
        </div>
      </div>

      {/* FILTER & TOOLBAR BAR */}
      <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari Judul, Isi, Jaring, Field Officer..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Periode Filter */}
              <NativeSelect
                value={periodeFilter}
                onChange={(e) => {
                  setPeriodeFilter(e.target.value as PeriodeFilterOption);
                  setPage(1);
                }}
                className="h-9 text-xs min-w-[140px]"
              >
                <option value="ALL">Semua Periode</option>
                <option value="TODAY">Hari Ini</option>
                <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                <option value="THIS_MONTH">Bulan Ini</option>
              </NativeSelect>

              {/* Jaring Filter Popover */}
              <JaringSelectPopover
                options={popoverJaringOptions}
                value={jaringFilter}
                onValueChange={(val) => {
                  setJaringFilter(val);
                  setPage(1);
                }}
                allowAllOption
                allOptionLabel="Semua Jaring"
                filterVerifiedOnly={false}
                className="h-9 text-xs"
              />

              {/* View Mode Switcher Toggle */}
              <ViewModeToggle
                value={viewMode}
                onValueChange={setViewMode}
                className="h-9"
              />
            </div>
          </div>

          {/* SECOND ROW: Custom Date Range */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
            <span className="text-muted-foreground flex items-center gap-1 font-medium">
              <Calendar className="size-3.5" /> Tanggal Kustom:
            </span>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs w-[130px] p-1.5"
            />
            <span className="text-muted-foreground">s.d</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs w-[130px] p-1.5"
            />

            {(search || jaringFilter !== "ALL" || periodeFilter !== "ALL" || startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1 ml-auto"
              >
                <X className="size-3.5" /> Reset Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CONTENT (CARD VIEW VS TABLE VIEW) */}
      {loadingData ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat data laporan pembinaan...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <FileText className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-base font-semibold text-foreground">Tidak ada laporan pembinaan ditemukan</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Belum ada catatan pembinaan yang tersimpan atau coba atur kembali filter Anda.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 text-xs">
            Reset Semua Filter
          </Button>
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW LAYOUT */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedReports.map((item) => {
              const foName = item.fieldOfficer?.userProfile?.fullName || "Field Officer";

              return (
                <div
                  key={item.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-4 transition-all duration-200 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  {/* Top Bar */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[11px] font-mono border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        Jaring: {item.jaringAlias || item.jaringCode || "-"}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        📅 {formatDateOnly(item.reportedAt || item.createdAt)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground leading-snug line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="size-3.5 text-sky-500 shrink-0" />
                      <span className="truncate">Petugas: <strong className="text-foreground">{foName}</strong></span>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-9 text-xs font-bold gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors uppercase tracking-wider"
                    >
                      <Link href={`/dashboard/field-coordinator/laporan-pembinaan-jaring/${item.id}?jaringId=${item.jaringId}`}>
                        <Eye className="size-4" /> LIHAT DETAIL
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <TablePagination
            page={page}
            total={filteredReports.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newSize: number) => {
              setLimit(newSize);
              setPage(1);
            }}
          />
        </div>
      ) : (
        /* TABLE VIEW LAYOUT */
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Tanggal & Waktu</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Jaring</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Judul Pembinaan</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Isi Catatan</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Field Officer</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((item) => {
                  const foName = item.fieldOfficer?.userProfile?.fullName || "-";

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.reportedAt || item.createdAt)}
                      </TableCell>

                      <TableCell className="font-mono text-xs font-medium text-foreground whitespace-nowrap">
                        {item.jaringAlias || item.jaringCode || "-"}
                      </TableCell>

                      <TableCell className="max-w-[250px]">
                        <p className="font-semibold text-xs text-foreground line-clamp-1">
                          {item.title}
                        </p>
                      </TableCell>

                      <TableCell className="max-w-[320px]">
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {item.content}
                        </p>
                      </TableCell>

                      <TableCell className="text-xs text-foreground whitespace-nowrap">
                        {foName}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Link href={`/dashboard/field-coordinator/laporan-pembinaan-jaring/${item.id}?jaringId=${item.jaringId}`}>
                            <Eye className="size-3.5" /> Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <TablePagination
            page={page}
            total={filteredReports.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newSize: number) => {
              setLimit(newSize);
              setPage(1);
            }}
          />
        </div>
      )}
    </main>
  );
}
