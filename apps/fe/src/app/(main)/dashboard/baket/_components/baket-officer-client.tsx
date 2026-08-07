"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  ArrowDown,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  TriangleAlert,
  User,
  X,
} from "lucide-react";

import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
} from "@/app/(main)/dashboard/laporan-jaring/_components/laporan-jaring-types";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Badge } from "@/components/ui/badge";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

export interface ReportCategoryItem {
  id: string;
  code: string;
  name: string;
}

type ReportCategoryResponse =
  | {
      items?: ReportCategoryItem[];
    }
  | ReportCategoryItem[];

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

const BAKET_OFFICER_COLUMNS: ColumnOption[] = [
  { id: "no", label: "No" },
  { id: "refNum", label: "No. Referensi" },
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "judulIsi", label: "Judul & Isi Laporan", alwaysVisible: true },
  { id: "lokasiAktual", label: "Lokasi Aktual Laporan" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan Jaring" },
  { id: "statusVerifikasi", label: "Status Verifikasi" },
  { id: "waktuMasuk", label: "Waktu Masuk" },
];

export function BaketOfficerClient() {
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [categories, setCategories] = useState<ReportCategoryItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);

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
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch list of reports (using same endpoint as Laporan Jaring)
  async function fetchReports(overrideStart?: string, overrideEnd?: string) {
    setLoadingList(true);
    try {
      let url = "/jaring/reports?registrationStatus=APPROVED";
      const sDate = overrideStart ?? startDate;
      const eDate = overrideEnd ?? endDate;

      if (sDate && sDate.length === 10) {
        url += `&from=${encodeURIComponent(`${sDate}T00:00:00.000Z`)}`;
      }
      if (eDate && eDate.length === 10) {
        url += `&to=${encodeURIComponent(`${eDate}T23:59:59.999Z`)}`;
      }

      const res = await apiBrowserFetch<{ items?: JaringReportSessionDetail[] } | JaringReportSessionDetail[]>(url);
      const itemsList = Array.isArray(res) ? res : res?.items || [];
      setReports(itemsList);
    } catch (err) {
      console.error("Gagal memuat daftar laporan:", err);
    } finally {
      setLoadingList(false);
    }
  }

  // Fetch Categories for Filter Kategori
  async function fetchCategories() {
    try {
      const res = await apiBrowserFetch<ReportCategoryResponse>("/jaring/report-categories");
      if (Array.isArray(res)) setCategories(res);
      else if (res && "items" in res && Array.isArray(res.items)) setCategories(res.items);
    } catch (err) {
      console.warn("Gagal memuat kategori:", err);
    }
  }

  useEffect(() => {
    void fetchReports();
    void fetchCategories();
  }, []);

  // Filter ONLY reports that are converted into Baket (METADATA_RECORDED)
  const baketReports = useMemo(() => {
    return reports.filter((r) => r.verificationStatus === "METADATA_RECORDED");
  }, [reports]);

  // Compute summary metrics based on Urgensi
  const urgencySummary = useMemo(() => {
    const summary: Record<PriorityLevel, number> = {
      URGENT: 0,
      HIGH: 0,
      NORMAL: 0,
      LOW: 0,
    };

    for (const r of baketReports) {
      const u = r.urgency || "NORMAL";
      if (u in summary) {
        summary[u as PriorityLevel] += 1;
      }
    }

    return summary;
  }, [baketReports]);

  // Filtered reports list (Baket + Urgensi + Search + Category + Date range)
  const filteredReports = useMemo(() => {
    return baketReports.filter((item) => {
      // Urgensi filter
      if (urgencyFilter !== "ALL") {
        const itemUrgency = item.urgency || "NORMAL";
        if (itemUrgency !== urgencyFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        const itemCatId =
          (item as any).categoryId || (item as any).category?.id || (item as any).convertedBaket?.reportCategoryId;
        if (itemCatId !== categoryFilter) return false;
      }

      // Date / Period Filter
      const reportDateStr = item.submittedAt || item.createdAt;
      if (reportDateStr) {
        const itemTime = new Date(reportDateStr).getTime();
        const now = new Date();

        if (periodPreset === "TODAY") {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (itemTime < startOfDay) return false;
        } else if (periodPreset === "LAST_7_DAYS") {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        } else if (periodPreset === "LAST_30_DAYS") {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 3600 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        } else if (periodPreset === "CUSTOM") {
          if (startDate && startDate.length === 10) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            if (itemTime < start) return false;
          }
          if (endDate && endDate.length === 10) {
            const end = new Date(`${endDate}T23:59:59.999`).getTime();
            if (itemTime > end) return false;
          }
        }
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const ref = (item.referenceNumber || "").toLowerCase();
        const t = (item.displayTitle || "").toLowerCase();
        const c = (item.content || "").toLowerCase();
        const jAlias = (item.jaringAlias || "").toLowerCase();
        const jCode = (item.jaringCode || "").toLowerCase();
        return ref.includes(q) || t.includes(q) || c.includes(q) || jAlias.includes(q) || jCode.includes(q);
      }
      return true;
    });
  }, [baketReports, urgencyFilter, categoryFilter, periodPreset, startDate, endDate, search]);

  // Paginated reports for table
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  const urgencyKpiCards = [
    {
      value: "URGENT" as const,
      label: "URGENT",
      description: "Mendesak",
      icon: ShieldAlert,
      styles: {
        activeCard:
          "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/40 shadow-sm shadow-rose-500/10",
        inactiveCard:
          "border-rose-200/80 dark:border-rose-900/30 bg-card hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50/30 dark:hover:bg-rose-950/20",
        activeBadge: "bg-rose-600 text-white border-rose-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-rose-200 bg-rose-100/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-400",
        activeIcon: "bg-rose-600 text-white shadow-md shadow-rose-500/30",
        inactiveIcon: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
        countText: "text-rose-700 dark:text-rose-400",
      },
    },
    {
      value: "HIGH" as const,
      label: "HIGH",
      description: "Tinggi",
      icon: TriangleAlert,
      styles: {
        activeCard:
          "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/40 shadow-sm shadow-amber-500/10",
        inactiveCard:
          "border-amber-200/80 dark:border-amber-900/30 bg-card hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
        activeBadge: "bg-amber-600 text-white border-amber-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400",
        activeIcon: "bg-amber-600 text-white shadow-md shadow-amber-500/30",
        inactiveIcon: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
        countText: "text-amber-700 dark:text-amber-400",
      },
    },
    {
      value: "NORMAL" as const,
      label: "NORMAL",
      description: "Normal",
      icon: Activity,
      styles: {
        activeCard:
          "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-sm shadow-emerald-500/10",
        inactiveCard:
          "border-emerald-200/80 dark:border-emerald-900/30 bg-card hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20",
        activeBadge: "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400",
        activeIcon: "bg-emerald-600 text-white shadow-md shadow-emerald-500/30",
        inactiveIcon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
        countText: "text-emerald-700 dark:text-emerald-400",
      },
    },
    {
      value: "LOW" as const,
      label: "LOW",
      description: "Rendah",
      icon: ArrowDown,
      styles: {
        activeCard: "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 ring-2 ring-sky-500/40 shadow-sm shadow-sky-500/10",
        inactiveCard:
          "border-sky-200/80 dark:border-sky-900/30 bg-card hover:border-sky-300 dark:hover:border-sky-800 hover:bg-sky-50/30 dark:hover:bg-sky-950/20",
        activeBadge: "bg-sky-600 text-white border-sky-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-sky-200 bg-sky-100/80 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/50 dark:text-sky-400",
        activeIcon: "bg-sky-600 text-white shadow-md shadow-sky-500/30",
        inactiveIcon: "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
        countText: "text-sky-700 dark:text-sky-400",
      },
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 transition-colors duration-150 sm:space-y-6">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-officer">Petugas Wilayah (Gaswil)</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Bahan Keterangan (Baket)</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">Bahan Keterangan (Baket)</h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Daftar laporan Jaring yang telah terverifikasi dan berhasil dikonversikan menjadi Baket Intelijen.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchReports()}
          disabled={loadingList}
          className="w-fit h-9 gap-2"
        >
          <RefreshCw className={cn("size-4 text-emerald-600 dark:text-emerald-400", loadingList && "animate-spin")} />
          Muat Ulang
        </Button>
      </div>

      {/* KPI METRIC SUMMARY CARDS BERDASARKAN URGENSI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {urgencyKpiCards.map((item) => {
          const Icon = item.icon;
          const isActive = urgencyFilter === item.value;

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={isActive}
              aria-label={`Filter baket dengan urgensi ${item.label}`}
              onClick={() => {
                setUrgencyFilter(isActive ? "ALL" : item.value);
                setPage(1);
              }}
              className={cn(
                "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer",
                isActive ? item.styles.activeCard : item.styles.inactiveCard,
              )}
            >
              <div className="flex flex-col gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit uppercase tracking-wider text-[10px] px-2 py-0.5 font-semibold",
                    isActive ? item.styles.activeBadge : item.styles.inactiveBadge,
                  )}
                >
                  {item.label}
                </Badge>
                <div>
                  <p
                    className={cn(
                      "text-3xl font-extrabold tracking-tight transition-colors",
                      isActive ? item.styles.countText : "text-foreground",
                    )}
                  >
                    {urgencySummary[item.value]}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">Urgensi {item.description}</p>
                </div>
              </div>
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                  isActive ? item.styles.activeIcon : item.styles.inactiveIcon,
                )}
              >
                <Icon className="size-5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* FULL TABLE VIEW CONTAINER */}
      <Card className="border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-3 border-b border-slate-200/80 dark:border-white/10 space-y-0">
          {/* Controls Bar - Matching Laporan Jaring page */}
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

              {/* Filter Urgensi Select */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Urgensi:</span>
                <NativeSelect
                  value={urgencyFilter}
                  onChange={(e) => {
                    setUrgencyFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs bg-background min-w-[130px]"
                >
                  <option value="ALL">Semua Urgensi</option>
                  <option value="URGENT">URGENT</option>
                  <option value="HIGH">HIGH</option>
                  <option value="NORMAL">NORMAL</option>
                  <option value="LOW">LOW</option>
                </NativeSelect>
              </div>

              {/* Filter Kategori Dropdown */}
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Kategori:</span>
                <NativeSelect
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs bg-background min-w-[160px]"
                >
                  <option value="ALL">Semua Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
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
                        if (val.length === 10 || val === "") {
                          void fetchReports(val, endDate);
                        }
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
                        if (val.length === 10 || val === "") {
                          void fetchReports(startDate, val);
                        }
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
                columns={BAKET_OFFICER_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              {(search ||
                urgencyFilter !== "ALL" ||
                categoryFilter !== "ALL" ||
                periodPreset !== "ALL" ||
                startDate ||
                endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setUrgencyFilter("ALL");
                    setCategoryFilter("ALL");
                    setStartDate("");
                    setEndDate("");
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
                {isColVisible("no") && <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider">No</TableHead>}
                {isColVisible("refNum") && <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider">No. Referensi</TableHead>}
                {isColVisible("foto") && <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider">Foto</TableHead>}
                {isColVisible("namaJaring") && <TableHead className="min-w-[150px] text-xs font-semibold uppercase tracking-wider">Nama Jaring</TableHead>}
                {isColVisible("kodeJaring") && <TableHead className="min-w-[120px] text-xs font-semibold uppercase tracking-wider">Kode Jaring</TableHead>}
                {isColVisible("gaswil") && <TableHead className="min-w-[160px] text-xs font-semibold uppercase tracking-wider">Petugas Wilayah (Gaswil)</TableHead>}
                {isColVisible("whatsapp") && <TableHead className="min-w-[130px] text-xs font-semibold uppercase tracking-wider">Nomor WhatsApp</TableHead>}
                {isColVisible("judulIsi") && <TableHead className="min-w-[220px] text-xs font-semibold uppercase tracking-wider">Judul & Isi Laporan</TableHead>}
                {isColVisible("lokasiAktual") && <TableHead className="min-w-[190px] text-xs font-semibold uppercase tracking-wider">Lokasi Aktual Laporan</TableHead>}
                {isColVisible("wilayahPenempatan") && <TableHead className="min-w-[190px] text-xs font-semibold uppercase tracking-wider">Wilayah Penempatan Jaring</TableHead>}
                {isColVisible("statusVerifikasi") && <TableHead className="w-48 text-xs font-semibold uppercase tracking-wider">Status Verifikasi</TableHead>}
                {isColVisible("waktuMasuk") && <TableHead className="w-44 text-xs font-semibold uppercase tracking-wider">Waktu Masuk</TableHead>}
                <TableHead className="w-32 text-center text-xs font-semibold uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center text-xs text-muted-foreground font-mono">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                      Memuat data Baket...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((item, idx) => {
                  const itemIndex = (page - 1) * limit + idx + 1;
                  const isUnread = !readReportIds.has(item.id);
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
                      {isColVisible("no") && (
                        <TableCell className="text-center font-mono text-xs text-muted-foreground">{itemIndex}</TableCell>
                      )}
                      {isColVisible("refNum") && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs text-sky-600 dark:text-[#38BDF8]">
                              {item.referenceNumber || item.id.slice(0, 8)}
                            </span>
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
                            <p className="font-bold text-xs text-foreground line-clamp-1">
                              {item.displayTitle || "Baket Intelijen"}
                            </p>
                            {item.content ? (
                              <p className="text-[11px] text-muted-foreground line-clamp-1 font-normal">{item.content}</p>
                            ) : null}
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
                      {isColVisible("statusVerifikasi") && (
                        <TableCell>
                          <span className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            Baket Dibuat
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("waktuMasuk") && (
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.submittedAt || item.createdAt)}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          onClick={() => markReportAsRead(item.id)}
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                        >
                          <Link href={`/dashboard/laporan-jaring/${item.id}?from=baket`}>
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
                    <p>Tidak ada Baket yang sesuai filter.</p>
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
