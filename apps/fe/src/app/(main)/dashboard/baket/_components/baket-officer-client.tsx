"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  AlertTriangle,
  Calendar,
  Clock,
  Eye,
  Layers,
  MapPin,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";

import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { ActiveFilterChips, type FilterChipItem } from "@/components/ui/active-filter-chips";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { FilterField } from "@/components/ui/filter-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import {
  type DashboardDetailPeriodPreset,
  dateInputFromSearchParams,
  jakartaBoundaryIso,
  resolveDashboardDetailPeriodPreset,
} from "@/lib/domain/date-time";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { sortReportCategories } from "@/lib/domain/report-category-order";
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  ALL_BAKET_STATUS_QUERY,
  type BaketRecord,
  currentBaketVersion,
  formatBaketAreaName,
  getBaketCategoryId,
  getBaketContent,
  getBaketDate,
  getBaketDisplayTitle,
  getBaketHref,
  getBaketJaringIdentitySource,
  getBaketReferenceLabel,
  getBaketStatusLabel,
  getBaketVersionLabel,
  type PriorityLevel,
} from "./baket-data";
import { BAKET_URGENCY_LABELS, BaketSummaryCards } from "./baket-summary-cards";

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
  { id: "refNum", label: "No. Baket" },
  { id: "foto", label: "Foto Sumber" },
  { id: "namaJaring", label: "Sumber", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Sumber" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "judulIsi", label: "Judul & Isi Baket", alwaysVisible: true },
  { id: "lokasiAktual", label: "Lokasi Baket" },
  { id: "wilayahPenempatan", label: "Wilayah Sumber" },
  { id: "statusVerifikasi", label: "Status Validasi" },
  { id: "tanggalBaket", label: "Tanggal Baket" },
];

export function BaketOfficerClient() {
  const searchParams = useSearchParams();
  const initialStartDate = dateInputFromSearchParams(searchParams, ["from", "periodStart"]);
  const initialEndDate = dateInputFromSearchParams(searchParams, ["to", "periodEnd"]);
  const [bakets, setBakets] = useState<BaketRecord[]>([]);
  const [categories, setCategories] = useState<ReportCategoryItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) => visibleColumns[id] !== false;

  const [readBaketIds, setReadBaketIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("read_bakets") || "[]");
        setReadBaketIds(new Set(stored));
      } catch {
        // Abaikan cache lokal yang tidak valid.
      }
    }
  }, []);

  const markBaketAsRead = (baketId: string) => {
    if (baketId && typeof window !== "undefined") {
      try {
        const stored: string[] = JSON.parse(localStorage.getItem("read_bakets") || "[]");
        if (!stored.includes(baketId)) {
          stored.push(baketId);
          localStorage.setItem("read_bakets", JSON.stringify(stored));
          setReadBaketIds(new Set(stored));
        }
      } catch {
        // Abaikan cache lokal yang tidak dapat ditulis.
      }
    }
  };

  // Filter, Search, and Pagination states
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<PriorityLevel | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = useState<DashboardDetailPeriodPreset>(() =>
    resolveDashboardDetailPeriodPreset(searchParams, Boolean(initialStartDate || initialEndDate)),
  );
  const [startDate, setStartDate] = useState<string>(() => initialStartDate);
  const [endDate, setEndDate] = useState<string>(() => initialEndDate);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  async function fetchBakets(overrideStart?: string, overrideEnd?: string) {
    setLoadingList(true);
    setLoadError(null);
    try {
      const allItems: BaketRecord[] = [];
      let currentPage = 1;
      let totalPages = 1;
      const sDate = overrideStart ?? startDate;
      const eDate = overrideEnd ?? endDate;

      do {
        const params = new URLSearchParams({
          page: String(currentPage),
          limit: "100",
          statuses: ALL_BAKET_STATUS_QUERY,
        });

        if (sDate && sDate.length === 10) params.set("from", jakartaBoundaryIso(sDate));
        if (eDate && eDate.length === 10) params.set("to", jakartaBoundaryIso(eDate, true));

        const res = await apiBrowserFetch<
          { items?: BaketRecord[]; pagination?: { totalPages?: number } } | BaketRecord[]
        >(`/bakets?${params.toString()}`);
        const pageItems = Array.isArray(res) ? res : res?.items || [];
        allItems.push(...pageItems);
        totalPages = Array.isArray(res)
          ? pageItems.length < 100
            ? currentPage
            : currentPage + 1
          : Math.max(1, res.pagination?.totalPages ?? 1);
        currentPage += 1;
      } while (currentPage <= totalPages);

      setBakets(Array.from(new Map(allItems.map((item) => [item.id, item])).values()));
    } catch (err) {
      setLoadError(err instanceof Error && err.message ? err.message : "Daftar Baket gagal dimuat.");
    } finally {
      setLoadingList(false);
    }
  }

  // Fetch Categories for Filter Kategori
  async function fetchCategories() {
    try {
      const res = await apiBrowserFetch<ReportCategoryResponse>("/jaring/report-categories");
      if (Array.isArray(res)) setCategories(sortReportCategories(res));
      else if (res && "items" in res && Array.isArray(res.items)) setCategories(sortReportCategories(res.items));
    } catch (err) {
      console.warn("Gagal memuat kategori:", err);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: data awal dimuat sekali saat halaman dibuka
  useEffect(() => {
    void fetchBakets();
    void fetchCategories();
  }, []);

  const baketReports = useMemo(() => {
    return bakets;
  }, [bakets]);

  // Compute summary metrics based on Urgensi
  const urgencySummary = useMemo(() => {
    const summary: Record<PriorityLevel, number> = {
      URGENT: 0,
      HIGH: 0,
      NORMAL: 0,
      LOW: 0,
    };

    for (const r of baketReports) {
      const u = currentBaketVersion(r)?.urgency ?? "NORMAL";
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
        const itemUrgency = currentBaketVersion(item)?.urgency ?? "NORMAL";
        if (itemUrgency !== urgencyFilter) return false;
      }

      // Category filter
      if (categoryFilter !== "ALL") {
        const itemCatId = getBaketCategoryId(item);
        if (itemCatId !== categoryFilter) return false;
      }

      // Date / Period Filter
      const reportDateStr = getBaketDate(item);
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
        const ref = getBaketReferenceLabel(item).toLowerCase();
        const t = getBaketDisplayTitle(item).toLowerCase();
        const c = getBaketContent(item).toLowerCase();
        const jAlias = (item.primaryJaring?.aliasName || item.primaryJaring?.fullName || "").toLowerCase();
        const jCode = (item.primaryJaringId || "").toLowerCase();
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

  const handleResetFilters = () => {
    setSearch("");
    setUrgencyFilter("ALL");
    setCategoryFilter("ALL");
    setPeriodPreset("TODAY");
    setStartDate("");
    setEndDate("");
    setPage(1);
    void fetchBakets("", "");
  };

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

    if (urgencyFilter !== "ALL") {
      chips.push({
        id: "urgency",
        label: "Urgensi",
        value: BAKET_URGENCY_LABELS[urgencyFilter] || urgencyFilter,
        onRemove: () => {
          setUrgencyFilter("ALL");
          setPage(1);
        },
      });
    }

    if (categoryFilter !== "ALL") {
      const cat = categories.find((c) => c.id === categoryFilter);
      chips.push({
        id: "category",
        label: "Kategori",
        value: cat ? cat.name : categoryFilter,
        onRemove: () => {
          setCategoryFilter("ALL");
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
          void fetchBakets("", "");
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
          void fetchBakets("", "");
        },
      });
    }

    return chips;
    // biome-ignore lint/correctness/useExhaustiveDependencies: fetchBakets stabil dan dipanggil hanya di onRemove handler
  }, [search, urgencyFilter, categoryFilter, categories, periodPreset, startDate, endDate]);

  const activeFilterCount = activeFilterChips.length;

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 transition-colors duration-150 sm:space-y-6">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/petugas-wilayah">Petugas Wilayah (Gaswil)</BreadcrumbLink>
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
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Bahan Keterangan (Baket)</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
            Daftar Bahan Keterangan (Baket) yang telah dipilih, diberi kategori, urgensi, dan diproses sebagai bahan
            operasional.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchBakets()}
          disabled={loadingList}
          className="h-9 w-fit gap-2"
        >
          <RefreshCw className={cn("size-4 text-emerald-600 dark:text-emerald-400", loadingList && "animate-spin")} />
          Muat Ulang
        </Button>
      </div>

      {/* RINGKASAN DAN FILTER CEPAT */}
      <BaketSummaryCards
        total={baketReports.length}
        urgencySummary={urgencySummary}
        urgencyFilter={urgencyFilter}
        onUrgencyFilterChange={(value) => {
          setUrgencyFilter(value);
          setPage(1);
        }}
      />

      {/* FULL TABLE VIEW CONTAINER */}
      <Card className="overflow-hidden rounded-md border border-slate-200/80 bg-card shadow-xs dark:border-white/10">
        <CardHeader className="space-y-4 border-slate-200/80 border-b p-4 sm:p-5 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-border/70 border-b pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                <h3 className={DC_TYPOGRAPHY.cardTitle}>Filter & Parameter Baket</h3>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 font-mono text-[10px] text-primary">
                    {activeFilterCount} aktif
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                Saring Bahan Keterangan berdasarkan urgensi, kategori, dan periode pelaporan di wilayah operasional
                Anda.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ColumnVisibilityToggle
                columns={BAKET_OFFICER_COLUMNS}
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
            {/* Baris 1: Pencarian Cepat & Periode Masuk */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
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
                      placeholder="Cari nomor referensi, judul, atau isi baket..."
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
              </div>

              <div>
                <FilterField label="Periode Masuk" icon={<Clock className="size-3.5" />} isActive={periodPreset !== "TODAY"}>
                  <NativeSelect
                    aria-label="Filter Periode"
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

            {/* Baris 2: Klasifikasi & Atribut Baket */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FilterField
                label="Tingkat Urgensi"
                icon={<AlertTriangle className="size-3.5" />}
                isActive={urgencyFilter !== "ALL"}
              >
                <NativeSelect
                  aria-label="Filter Urgensi"
                  value={urgencyFilter}
                  onChange={(e) => {
                    setUrgencyFilter(e.target.value as PriorityLevel | "ALL");
                    setPage(1);
                  }}
                  isActive={urgencyFilter !== "ALL"}
                  className="h-9 w-full text-xs"
                >
                  <option value="ALL">Semua Urgensi</option>
                  <option value="URGENT">Mendesak</option>
                  <option value="HIGH">Tinggi</option>
                  <option value="NORMAL">Normal</option>
                  <option value="LOW">Rendah</option>
                </NativeSelect>
              </FilterField>

              <FilterField
                label="Kategori Baket"
                icon={<Layers className="size-3.5" />}
                isActive={categoryFilter !== "ALL"}
              >
                <NativeSelect
                  aria-label="Filter Kategori"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(1);
                  }}
                  isActive={categoryFilter !== "ALL"}
                  className="h-9 w-full text-xs"
                >
                  <option value="ALL">Semua Kategori</option>
                  {sortReportCategories(categories).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </NativeSelect>
              </FilterField>
            </div>
          </div>

          {/* Date Range Picker (Only shown when periodPreset === "CUSTOM") */}
          {periodPreset === "CUSTOM" && (
            <div className="rounded-md border border-border/80 border-dashed bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
                  <Calendar className="size-3.5 text-primary" />
                  <span>Rentang Tanggal Masuk:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      setPage(1);
                      if (val.length === 10 || val === "") {
                        void fetchBakets(val, endDate);
                      }
                    }}
                    className={cn(DC_CONTROLS.input, "h-9 w-[150px] font-mono text-xs")}
                    title="Dari Tanggal Masuk"
                  />
                  <span className="text-muted-foreground text-xs">s.d.</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEndDate(val);
                      setPage(1);
                      if (val.length === 10 || val === "") {
                        void fetchBakets(startDate, val);
                      }
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
                {isColVisible("no") && (
                  <TableHead className="w-12 text-center font-semibold text-xs uppercase tracking-wider">No</TableHead>
                )}
                {isColVisible("refNum") && (
                  <TableHead className="w-36 font-semibold text-xs uppercase tracking-wider">No. Referensi</TableHead>
                )}
                {isColVisible("foto") && (
                  <TableHead className="w-12 text-center font-semibold text-xs uppercase tracking-wider">
                    Foto
                  </TableHead>
                )}
                {isColVisible("namaJaring") && (
                  <TableHead className="min-w-[150px] font-semibold text-xs uppercase tracking-wider">Sumber</TableHead>
                )}
                {isColVisible("kodeJaring") && (
                  <TableHead className="min-w-[120px] font-semibold text-xs uppercase tracking-wider">
                    Kode Sumber
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
                    Judul & Isi Baket
                  </TableHead>
                )}
                {isColVisible("lokasiAktual") && (
                  <TableHead className="min-w-[190px] font-semibold text-xs uppercase tracking-wider">
                    Lokasi Baket
                  </TableHead>
                )}
                {isColVisible("wilayahPenempatan") && (
                  <TableHead className="min-w-[190px] font-semibold text-xs uppercase tracking-wider">
                    Wilayah Sumber
                  </TableHead>
                )}
                {isColVisible("statusVerifikasi") && (
                  <TableHead className="w-48 font-semibold text-xs uppercase tracking-wider">Status Validasi</TableHead>
                )}
                {isColVisible("tanggalBaket") && (
                  <TableHead className="w-44 font-semibold text-xs uppercase tracking-wider">Tanggal Baket</TableHead>
                )}
                <TableHead className="w-32 text-center font-semibold text-xs uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-12 text-center font-mono text-muted-foreground text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                      Memuat data Baket...
                    </div>
                  </TableCell>
                </TableRow>
              ) : loadError ? (
                <TableRow>
                  <TableCell colSpan={13} className="space-y-3 py-12 text-center">
                    <DOMAIN_VISUALS.baket.Icon className="mx-auto size-8 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-xs">{loadError}</p>
                    <Button variant="outline" size="sm" onClick={() => void fetchBakets()}>
                      <RefreshCw className="mr-2 size-4" />
                      Coba Lagi
                    </Button>
                  </TableCell>
                </TableRow>
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((item, idx) => {
                  const itemIndex = (page - 1) * limit + idx + 1;
                  const isUnread = !readBaketIds.has(item.id);
                  const identity = resolveJaringIdentity(getBaketJaringIdentitySource(item));
                  const version = currentBaketVersion(item);

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/50",
                        isUnread && "bg-amber-500/[0.03] dark:bg-amber-500/[0.05]",
                      )}
                    >
                      {isColVisible("no") && (
                        <TableCell className="text-center font-mono text-muted-foreground text-xs">
                          {itemIndex}
                        </TableCell>
                      )}
                      {isColVisible("refNum") && (
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono text-sky-600 text-xs dark:text-sky-400">
                              {getBaketReferenceLabel(item)}
                            </span>
                          </div>
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
                            <p className="line-clamp-1 font-bold text-foreground text-xs">
                              {getBaketDisplayTitle(item)}
                            </p>
                            {getBaketContent(item) ? (
                              <p className="line-clamp-1 font-normal text-[11px] text-muted-foreground">
                                {getBaketContent(item)}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                      )}
                      {isColVisible("lokasiAktual") && (
                        <TableCell>
                          <span className="flex items-start gap-1.5 text-foreground text-xs">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
                            <span className="line-clamp-2">{formatBaketAreaName(version?.eventArea)}</span>
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("wilayahPenempatan") && (
                        <TableCell>
                          <span className="line-clamp-2 text-muted-foreground text-xs">{identity.placementArea}</span>
                        </TableCell>
                      )}
                      {isColVisible("statusVerifikasi") && (
                        <TableCell>
                          <span className="inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-semibold text-[10px] text-emerald-700 uppercase tracking-wide dark:text-emerald-400">
                            {getBaketStatusLabel(item.status)}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("tanggalBaket") && (
                        <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-xs">
                          <div>{formatDateTime(getBaketDate(item))}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{getBaketVersionLabel(item)}</div>
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          onClick={() => markBaketAsRead(item.id)}
                          className="h-8 gap-1.5 rounded-lg border-emerald-500/30 px-2.5 font-medium text-emerald-600 text-xs hover:bg-emerald-500/10 dark:text-emerald-400"
                        >
                          <Link href={getBaketHref(item)}>
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
                  <TableCell colSpan={13} className="space-y-2 py-12 text-center text-muted-foreground text-xs">
                    <DOMAIN_VISUALS.baket.Icon className="mx-auto size-8 text-muted-foreground/40" />
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
