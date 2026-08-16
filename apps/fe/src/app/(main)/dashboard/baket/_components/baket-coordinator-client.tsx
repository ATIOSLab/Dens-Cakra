"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Calendar,
  Clock,
  Download,
  Eye,
  ImageIcon,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import {
  buildAreaFilterSubtitle,
  buildDistrictFilterOptions,
  buildProvinceFilterOptions,
  buildRegencyFilterOptions,
  buildVillageFilterOptions,
  findDkiJakartaProvinceFilterId,
  selectedAreaFilterId,
} from "@/lib/domain/area-filter";
import {
  type DashboardDetailPeriodPreset,
  dateInputFromSearchParams,
  jakartaBoundaryIso,
  resolveDashboardDetailPeriodPreset,
  resolveJakartaPeriodRange,
} from "@/lib/domain/date-time";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { sortReportCategories } from "@/lib/domain/report-category-order";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import {
  SYSTEM_ROLE_HOME_ROUTES,
  SYSTEM_ROLE_LABELS,
  SYSTEM_ROLES,
  type SystemRole,
} from "@/navigation/sidebar/system-roles";

import {
  ALL_BAKET_STATUS_QUERY,
  type BaketRecord,
  currentBaketVersion,
  formatBaketAreaName,
  getBaketContent,
  getBaketDate,
  getBaketDisplayTitle,
  getBaketHref,
  getBaketJaringIdentitySource,
  getBaketReferenceLabel,
  getBaketVersionLabel,
  type PriorityLevel,
} from "./baket-data";
import { BAKET_URGENCY_LABELS, BaketSummaryCards } from "./baket-summary-cards";

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

type AdministrativeAreaScope = {
  areaId: string;
  code: string;
  officialCode?: string | null;
  name: string;
  level: string;
  parentAreaId?: string | null;
  parentOfficialCode?: string | null;
};

function getUrgencyCardStyle(urgency?: PriorityLevel | string | null) {
  switch (urgency) {
    case "URGENT":
      return {
        border: "border-rose-500/70 dark:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50",
        button: "border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-500",
        label: BAKET_URGENCY_LABELS.URGENT,
      };
    case "HIGH":
      return {
        border: "border-amber-500/70 dark:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50",
        button: "border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 hover:text-amber-500",
        label: BAKET_URGENCY_LABELS.HIGH,
      };
    case "NORMAL":
      return {
        border: "border-emerald-500/50 dark:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        button:
          "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500",
        label: BAKET_URGENCY_LABELS.NORMAL,
      };
    case "LOW":
      return {
        border: "border-sky-500/50 dark:border-sky-500/60 shadow-[0_0_10px_rgba(14,165,233,0.1)]",
        badge: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
        button: "border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 hover:text-sky-500",
        label: BAKET_URGENCY_LABELS.LOW,
      };
    default:
      return {
        border: "border-emerald-500/50 dark:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        button:
          "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500",
        label: BAKET_URGENCY_LABELS.NORMAL,
      };
  }
}

export interface ReportCategoryItem {
  id: string;
  code: string;
  name: string;
}

type PaginatedReportResponse = {
  items?: BaketRecord[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
};

type ReportCategoryResponse =
  | {
      items?: ReportCategoryItem[];
    }
  | ReportCategoryItem[];

const BAKET_COLUMNS: ColumnOption[] = [
  { id: "refNum", label: "No. Baket" },
  { id: "foto", label: "Foto Sumber" },
  { id: "namaJaring", label: "Sumber", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Sumber" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "judulIsi", label: "Judul & Isi Baket", alwaysVisible: true },
  { id: "wilayahSumber", label: "Lokasi Baket" },
  { id: "wilayahPenempatan", label: "Wilayah Sumber" },
  { id: "urgensi", label: "Urgensi" },
  { id: "tanggalBaket", label: "Tanggal Baket" },
];

const BAKET_SOURCE_LABELS = {
  name: "Nama Sumber",
  code: "Kode Sumber",
  placementArea: "Wilayah Sumber",
} as const;

export function BaketCoordinatorClient({ role }: { role?: SystemRole } = {}) {
  const isFieldOfficer = role === SYSTEM_ROLES.FIELD_OFFICER;
  const breadcrumbRoot = isFieldOfficer
    ? {
        label: SYSTEM_ROLE_LABELS[SYSTEM_ROLES.FIELD_OFFICER],
        href: SYSTEM_ROLE_HOME_ROUTES[SYSTEM_ROLES.FIELD_OFFICER],
      }
    : { label: "Monitoring", href: "/dashboard" };
  const searchParams = useSearchParams();
  const initialStartDate = dateInputFromSearchParams(searchParams, ["from", "periodStart"]);
  const initialEndDate = dateInputFromSearchParams(searchParams, ["to", "periodEnd"]);
  const initialAreaId = searchParams.get("areaId") ?? "ALL";
  const [bakets, setBakets] = useState<BaketRecord[]>([]);
  const [categories, setCategories] = useState<ReportCategoryItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const didApplyDefaultProvinceFilter = useRef(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) => visibleColumns[id] !== false;

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<PriorityLevel | "ALL">("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [directAreaFilter, setDirectAreaFilter] = useState<string>(() => initialAreaId);
  const [provinceFilter, setProvinceFilter] = useState<string>("ALL");
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = useState<DashboardDetailPeriodPreset>(() =>
    resolveDashboardDetailPeriodPreset(searchParams, Boolean(initialStartDate || initialEndDate)),
  );
  const [startDate, setStartDate] = useState<string>(() => initialStartDate);
  const [endDate, setEndDate] = useState<string>(() => initialEndDate);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  function buildReportQuery(currentPage: number) {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: "100",
      statuses: ALL_BAKET_STATUS_QUERY,
    });
    const areaId =
      selectedAreaFilterId({ provinceFilter, regencyFilter, districtFilter, villageFilter }) ??
      (directAreaFilter !== "ALL" ? directAreaFilter : null);
    const trimmedSearch = search.trim();

    if (areaId) params.set("areaId", areaId);
    if (urgencyFilter !== "ALL") params.set("urgency", urgencyFilter);
    if (categoryFilter !== "ALL") params.set("categoryId", categoryFilter);
    if (trimmedSearch) params.set("search", trimmedSearch);

    const periodRange = resolveJakartaPeriodRange(periodPreset, startDate, endDate);
    if (periodRange.from) params.set("from", jakartaBoundaryIso(periodRange.from));
    if (periodRange.to) params.set("to", jakartaBoundaryIso(periodRange.to, true));

    return params;
  }

  async function fetchAllBaketPages() {
    const allBakets: BaketRecord[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const params = buildReportQuery(currentPage);
      const response = await apiBrowserFetch<PaginatedReportResponse | BaketRecord[]>(`/bakets?${params.toString()}`);
      const pageItems = Array.isArray(response) ? response : response.items || [];
      allBakets.push(...pageItems);
      if (Array.isArray(response)) {
        totalPages = pageItems.length < 100 ? currentPage : currentPage + 1;
      } else {
        totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
      }
      currentPage += 1;
    } while (currentPage <= totalPages);

    return Array.from(new Map(allBakets.map((baket) => [baket.id, baket])).values());
  }

  async function fetchCategories() {
    try {
      const res = await apiBrowserFetch<ReportCategoryResponse>("/jaring/report-categories");
      if (Array.isArray(res)) return res;
      if (res && "items" in res && Array.isArray(res.items)) return res.items;
      return [];
    } catch {
      return [];
    }
  }

  async function fetchAreaScopes() {
    return apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
      query: { includeDescendants: true },
    });
  }

  async function fetchReports() {
    setLoadingList(true);
    setLoadError(null);
    try {
      const baketItems = await fetchAllBaketPages();
      setBakets(baketItems);
    } catch (err) {
      console.error("Gagal memuat Baket (field-coordinator):", err);
      setLoadError(err instanceof Error ? err.message : "Daftar Baket gagal dimuat.");
    } finally {
      setLoadingList(false);
    }
  }

  async function fetchReferenceData() {
    try {
      const [categoryItems, areaScopeItems] = await Promise.all([fetchCategories(), fetchAreaScopes()]);

      setCategories(sortReportCategories(categoryItems));
      setAreaScopes(areaScopeItems);
    } catch (err) {
      console.error("Gagal memuat referensi Baket:", err);
      setLoadError(err instanceof Error ? err.message : "Referensi Baket gagal dimuat.");
    }
  }

  async function refreshData() {
    await Promise.all([fetchReferenceData(), fetchReports()]);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: referensi filter dimuat sekali saat halaman dibuka
  useEffect(() => {
    void fetchReferenceData();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: daftar Baket dimuat ulang saat filter berubah
  useEffect(() => {
    void fetchReports();
  }, [
    urgencyFilter,
    categoryFilter,
    directAreaFilter,
    provinceFilter,
    regencyFilter,
    districtFilter,
    villageFilter,
    periodPreset,
    startDate,
    endDate,
    search,
  ]);

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

  const provinceOptions = useMemo(() => {
    return buildProvinceFilterOptions(areaScopes);
  }, [areaScopes]);

  const defaultProvinceFilter = useMemo(() => findDkiJakartaProvinceFilterId(provinceOptions), [provinceOptions]);

  useEffect(() => {
    if (
      didApplyDefaultProvinceFilter.current ||
      directAreaFilter !== "ALL" ||
      !defaultProvinceFilter ||
      provinceFilter !== "ALL"
    ) {
      return;
    }

    setProvinceFilter(defaultProvinceFilter);
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPage(1);
    didApplyDefaultProvinceFilter.current = true;
  }, [defaultProvinceFilter, directAreaFilter, provinceFilter]);

  const regencyOptions = useMemo(() => {
    return buildRegencyFilterOptions(areaScopes, provinceOptions.length > 0 ? provinceFilter : "ALL");
  }, [areaScopes, provinceFilter, provinceOptions.length]);

  const districtOptions = useMemo(() => {
    return buildDistrictFilterOptions(areaScopes, regencyFilter);
  }, [areaScopes, regencyFilter]);

  const villageOptions = useMemo(() => {
    return buildVillageFilterOptions(areaScopes, districtFilter);
  }, [areaScopes, districtFilter]);

  const areaSubtitle = useMemo(
    () =>
      buildAreaFilterSubtitle({
        metricLabel: "Jumlah Baket",
        allScopeLabel: directAreaFilter !== "ALL" ? "wilayah terpilih dari dashboard" : "cakupan koordinasi aktif",
        provinceFilter,
        regencyFilter,
        districtFilter,
        villageFilter,
        provinceOptions,
        regencyOptions,
        districtOptions,
        villageOptions,
      }),
    [
      districtFilter,
      districtOptions,
      directAreaFilter,
      provinceFilter,
      provinceOptions,
      regencyFilter,
      regencyOptions,
      villageFilter,
      villageOptions,
    ],
  );

  const filteredReports = useMemo(() => {
    return baketReports;
  }, [baketReports]);

  // Paginated items
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  // Quick Date presets
  const _handleQuickToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setUrgencyFilter("ALL");
    setCategoryFilter("ALL");
    setDirectAreaFilter("ALL");
    setProvinceFilter(defaultProvinceFilter || "ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPeriodPreset("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = [
      "No Baket",
      "Kode Sumber",
      "Judul Baket",
      "Versi Baket",
      "Urgensi",
      "Kategori",
      "Lokasi Baket",
      "Wilayah Sumber",
      "Tanggal Baket",
    ];

    const rows = filteredReports.map((r) => {
      const identity = resolveJaringIdentity(getBaketJaringIdentitySource(r));
      const version = currentBaketVersion(r);
      return [
        `"${getBaketReferenceLabel(r)}"`,
        `"${identity.code}"`,
        `"${getBaketDisplayTitle(r).replace(/"/g, '""')}"`,
        `"${getBaketVersionLabel(r)}"`,
        `"${getUrgencyCardStyle(version?.urgency).label}"`,
        `"${r.reportCategory?.name ?? "-"}"`,
        `"${formatBaketAreaName(version?.eventArea)}"`,
        `"${identity.placementArea}"`,
        `"${formatDateTime(getBaketDate(r))}"`,
      ];
    });

    const csvContent = `data:text/csv;charset=utf-8,${[headers.join(","), ...rows.map((e) => e.join(","))].join("\n")}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `baket-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 transition-colors duration-150 sm:space-y-6">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={breadcrumbRoot.href}>{breadcrumbRoot.label}</BreadcrumbLink>
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
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Daftar Bahan Keterangan (Baket) yang telah dipilih, diberi kategori, urgensi, dan diproses sebagai bahan
            operasional.
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">{areaSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshData()}
            disabled={loadingList}
            className="h-9 gap-2"
          >
            <RefreshCw className={cn("size-4 text-emerald-500 dark:text-emerald-400", loadingList && "animate-spin")} />
            Muat Ulang
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredReports.length === 0}
            className="h-9 gap-2 border-slate-200 dark:border-white/10"
          >
            <Download className="size-4 text-sky-500" />
            Ekspor CSV
          </Button>
        </div>
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

      {/* FILTER & TOOLBAR BAR */}
      <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* TOP ROW: Search input + View Mode Switcher */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari ID laporan, kata kunci, wilayah..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 h-9 text-xs border-slate-200 dark:border-white/10"
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

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <ColumnVisibilityToggle
                columns={BAKET_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
            </div>
          </div>

          {/* MIDDLE ROW: Structured Grid of 8 Filter Dropdowns */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            {/* 1. Filter Urgensi */}
            <NativeSelect
              aria-label="Filter Urgensi"
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value as PriorityLevel | "ALL");
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Urgensi</option>
              <option value="URGENT">Mendesak</option>
              <option value="HIGH">Tinggi</option>
              <option value="NORMAL">Normal</option>
              <option value="LOW">Rendah</option>
            </NativeSelect>

            {/* 2. Filter Kategori */}
            <SearchableSelect
              aria-label="Filter Kategori"
              value={categoryFilter}
              options={[
                { value: "ALL", label: "Semua Kategori" },
                ...sortReportCategories(categories).map((cat) => ({
                  value: cat.id,
                  label: `${cat.name} (${cat.code})`,
                })),
              ]}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
              placeholder="Semua Kategori"
              searchPlaceholder="Cari kategori..."
              emptyText="Kategori tidak ditemukan."
              className="h-9 w-full border-slate-200 text-xs dark:border-white/10"
            />

            {/* 4. Filter Provinsi */}
            {!isFieldOfficer && provinceOptions.length > 0 && (
              <SearchableSelect
                aria-label="Filter Provinsi"
                value={provinceFilter}
                options={[
                  { value: "ALL", label: "Pilih Provinsi/Binda terlebih dahulu", disabled: provinceOptions.length > 0 },
                  ...provinceOptions.map((province) => ({ value: province.id, label: province.name })),
                ]}
                onValueChange={(value) => {
                  setProvinceFilter(value);
                  setRegencyFilter("ALL");
                  setDistrictFilter("ALL");
                  setVillageFilter("ALL");
                  setPage(1);
                }}
                placeholder="Pilih Provinsi/Binda terlebih dahulu"
                searchPlaceholder="Cari Provinsi..."
                emptyText="Provinsi tidak ditemukan."
                className="h-9 w-full border-slate-200 text-xs dark:border-white/10"
              />
            )}

            {/* 5. Filter Kota/Kabupaten */}
            {!isFieldOfficer && (regencyOptions.length > 0 || provinceOptions.length > 0) && (
              <SearchableSelect
                aria-label="Filter Kota/Kabupaten"
                value={regencyFilter}
                options={[
                  {
                    value: "ALL",
                    label:
                      provinceOptions.length > 0 && provinceFilter === "ALL"
                        ? "Pilih Provinsi/Binda dahulu"
                        : "Semua Kota/Kabupaten",
                    disabled: provinceOptions.length > 0 && provinceFilter === "ALL",
                  },
                  ...regencyOptions.map((regency) => ({ value: regency.id, label: regency.name })),
                ]}
                onValueChange={(value) => {
                  setRegencyFilter(value);
                  setDistrictFilter("ALL");
                  setVillageFilter("ALL");
                  setPage(1);
                }}
                disabled={provinceOptions.length > 0 && provinceFilter === "ALL"}
                placeholder={
                  provinceOptions.length > 0 && provinceFilter === "ALL"
                    ? "Pilih Provinsi/Binda dahulu"
                    : "Semua Kota/Kabupaten"
                }
                searchPlaceholder="Cari Kota/Kabupaten..."
                emptyText="Kota/Kabupaten tidak ditemukan."
                className="h-9 w-full border-slate-200 text-xs dark:border-white/10"
              />
            )}

            {/* 6. Filter Kecamatan */}
            {!isFieldOfficer && (
              <SearchableSelect
                aria-label="Filter Kecamatan"
                value={districtFilter}
                options={[
                  {
                    value: "ALL",
                    label: regencyFilter === "ALL" ? "Pilih Kota/Kabupaten dahulu" : "Semua Kecamatan",
                    disabled: regencyFilter === "ALL",
                  },
                  ...districtOptions.map((district) => ({ value: district.id, label: district.name })),
                ]}
                onValueChange={(value) => {
                  setDistrictFilter(value);
                  setVillageFilter("ALL");
                  setPage(1);
                }}
                disabled={regencyFilter === "ALL"}
                placeholder={regencyFilter === "ALL" ? "Pilih Kota/Kabupaten dahulu" : "Semua Kecamatan"}
                searchPlaceholder="Cari Kecamatan..."
                emptyText="Kecamatan tidak ditemukan."
                className="h-9 w-full border-slate-200 text-xs dark:border-white/10"
              />
            )}

            {/* 7. Filter Kelurahan/Desa */}
            <SearchableSelect
              aria-label="Filter Kelurahan atau Desa"
              value={villageFilter}
              options={[
                {
                  value: "ALL",
                  label: !isFieldOfficer && districtFilter === "ALL" ? "Pilih Kecamatan dahulu" : "Semua Kelurahan",
                  disabled: !isFieldOfficer && districtFilter === "ALL",
                },
                ...villageOptions.map((village) => ({ value: village.id, label: village.name })),
              ]}
              onValueChange={(value) => {
                setVillageFilter(value);
                setPage(1);
              }}
              disabled={!isFieldOfficer && districtFilter === "ALL"}
              placeholder={!isFieldOfficer && districtFilter === "ALL" ? "Pilih Kecamatan dahulu" : "Semua Kelurahan"}
              searchPlaceholder="Cari Kelurahan/Desa..."
              emptyText="Kelurahan/Desa tidak ditemukan."
              className="h-9 w-full border-slate-200 text-xs dark:border-white/10"
            />

            {/* 8. Filter Periode Waktu */}
            <NativeSelect
              aria-label="Filter Periode Waktu"
              value={periodPreset}
              onChange={(event) => {
                setPeriodPreset(event.target.value as DashboardDetailPeriodPreset);
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Periode</option>
              <option value="TODAY">Hari Ini</option>
              <option value="LAST_7_DAYS">7 Hari Terakhir</option>
              <option value="LAST_30_DAYS">30 Hari Terakhir</option>
              <option value="CUSTOM">Kustom (Pilih Tanggal)</option>
            </NativeSelect>
          </div>

          {/* BOTTOM ROW: Custom Date Range Filter Inputs & Reset Button */}
          {periodPreset === "CUSTOM" ||
          search ||
          urgencyFilter !== "ALL" ||
          categoryFilter !== "ALL" ||
          provinceFilter !== (defaultProvinceFilter || "ALL") ||
          regencyFilter !== "ALL" ||
          districtFilter !== "ALL" ||
          villageFilter !== "ALL" ||
          periodPreset !== "ALL" ||
          startDate ||
          endDate ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
              {periodPreset === "CUSTOM" ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground flex items-center gap-1.5 font-medium shrink-0">
                    <Calendar className="size-3.5 text-sky-500" /> Tanggal:
                  </span>

                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs w-[135px] px-2 border-slate-200 dark:border-white/10"
                  />
                  <span className="text-muted-foreground font-medium">s.d</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className="h-8 text-xs w-[135px] px-2 border-slate-200 dark:border-white/10"
                  />
                </div>
              ) : (
                <div />
              )}

              {(search ||
                urgencyFilter !== "ALL" ||
                categoryFilter !== "ALL" ||
                directAreaFilter !== "ALL" ||
                provinceFilter !== (defaultProvinceFilter || "ALL") ||
                regencyFilter !== "ALL" ||
                districtFilter !== "ALL" ||
                villageFilter !== "ALL" ||
                periodPreset !== "ALL" ||
                startDate ||
                endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 font-medium ml-auto sm:ml-0"
                >
                  <X className="size-3.5" /> Reset Filter
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* DATA CONTENT (CARD VIEW VS TABLE VIEW) */}
      {loadingList ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat data Baket...</p>
        </div>
      ) : loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Baket gagal dimuat</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => void refreshData()}>
              <RefreshCw className="size-4 mr-2" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <DOMAIN_VISUALS.baket.Icon className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-base font-semibold text-foreground">Tidak ada Baket ditemukan</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Cobalah untuk memuat ulang data atau sesuaikan filter pencarian Anda.
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
              const version = currentBaketVersion(item);
              const refNum = getBaketReferenceLabel(item);
              const title = getBaketDisplayTitle(item);
              const content = getBaketContent(item);
              const mediaCount = version?.attachments?.length;
              const partsCount = version?.sourceMessages?.length;
              const locationName = formatBaketAreaName(version?.eventArea);
              const urgencyStyle = getUrgencyCardStyle(version?.urgency);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border bg-card p-4 transition-all duration-200 hover:scale-[1.01]",
                    urgencyStyle.border,
                  )}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                        {refNum}
                      </span>

                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2.5 py-0.5 font-bold shrink-0 border uppercase tracking-wider",
                          urgencyStyle.badge,
                        )}
                      >
                        {urgencyStyle.label}
                      </Badge>
                    </div>

                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground leading-snug line-clamp-2">
                        {title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{content || "-"}</p>
                    </div>

                    <JaringIdentitySummary
                      compact
                      source={getBaketJaringIdentitySource(item)}
                      labelOverrides={BAKET_SOURCE_LABELS}
                    />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
                    <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3.5 text-sky-500" />{" "}
                          {typeof partsCount === "number" ? `${partsCount} sumber` : "Sumber tertaut"}
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="size-3.5 text-amber-500" />{" "}
                          {typeof mediaCount === "number" ? `${mediaCount} lampiran` : "Lampiran Baket"}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-emerald-500" /> {locationName}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> Baket: {formatDateTime(getBaketDate(item))}
                      </span>
                      <span className="font-mono">{getBaketVersionLabel(item)}</span>
                    </div>

                    <Button
                      asChild
                      variant="outline"
                      className={cn(
                        "w-full h-9 text-xs font-bold gap-2 transition-colors uppercase tracking-wider border",
                        urgencyStyle.button,
                      )}
                    >
                      <Link href={getBaketHref(item)}>
                        <Eye className="size-4" /> Lihat Detail Baket
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

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
          <div className="overflow-x-auto select-none rounded-xl border border-slate-200 dark:border-white/10 bg-card shadow-xs">
            <Table className="w-full min-w-[1300px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {isColVisible("refNum") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">No. Ref / Sandi</TableHead>
                  )}
                  {isColVisible("foto") && (
                    <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">Foto</TableHead>
                  )}
                  {isColVisible("namaJaring") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Sumber</TableHead>
                  )}
                  {isColVisible("kodeJaring") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Kode Sumber</TableHead>
                  )}
                  {isColVisible("gaswil") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">
                      Petugas Wilayah (Gaswil)
                    </TableHead>
                  )}
                  {isColVisible("whatsapp") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Nomor WhatsApp</TableHead>
                  )}
                  {isColVisible("judulIsi") && (
                    <TableHead className="min-w-[200px] text-xs font-bold uppercase tracking-wider">
                      Judul & Isi Baket
                    </TableHead>
                  )}
                  {isColVisible("wilayahSumber") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Lokasi Baket</TableHead>
                  )}
                  {isColVisible("wilayahPenempatan") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Wilayah Sumber</TableHead>
                  )}
                  {isColVisible("urgensi") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Urgensi</TableHead>
                  )}
                  {isColVisible("tanggalBaket") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Tanggal Baket
                    </TableHead>
                  )}
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((item) => {
                  const refNum = getBaketReferenceLabel(item);
                  const version = currentBaketVersion(item);
                  const urgencyStyle = getUrgencyCardStyle(version?.urgency);

                  const identity = resolveJaringIdentity(getBaketJaringIdentitySource(item));

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-slate-800"
                    >
                      {isColVisible("refNum") && (
                        <TableCell className="font-mono text-xs font-medium text-foreground align-middle">
                          {refNum}
                        </TableCell>
                      )}

                      {isColVisible("foto") && (
                        <TableCell className="align-middle">
                          <div className="size-8 overflow-hidden rounded-none border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 flex items-center justify-center">
                            {identity.avatarUrl ? (
                              <img src={identity.avatarUrl} alt={identity.name} className="size-full object-cover" />
                            ) : (
                              <User className="size-4 text-slate-400 dark:text-slate-600" />
                            )}
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("namaJaring") && (
                        <TableCell className="align-middle font-mono font-bold text-xs text-foreground">
                          {identity.name}
                        </TableCell>
                      )}

                      {isColVisible("kodeJaring") && (
                        <TableCell className="align-middle font-mono text-xs text-violet-600 dark:text-violet-400">
                          {identity.code}
                        </TableCell>
                      )}

                      {isColVisible("gaswil") && (
                        <TableCell className="align-middle font-mono text-xs">
                          <GaswilEntityLink
                            name={identity.gaswilName}
                            assignmentId={identity.gaswilAssignmentId}
                            userProfileId={identity.gaswilUserProfileId}
                            href={identity.gaswilHref}
                          />
                        </TableCell>
                      )}

                      {isColVisible("whatsapp") && (
                        <TableCell className="align-middle font-mono text-xs">
                          {identity.whatsappNumber && identity.whatsappNumber !== "Belum tersedia" ? (
                            <a
                              href={`https://wa.me/${identity.whatsappNumber.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 hover:underline dark:text-emerald-400 font-mono"
                            >
                              {identity.whatsappNumber}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Belum tersedia</span>
                          )}
                        </TableCell>
                      )}

                      {isColVisible("judulIsi") && (
                        <TableCell className="align-middle max-w-[280px]">
                          <p className="font-semibold text-xs text-foreground line-clamp-1">
                            {getBaketDisplayTitle(item)}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {getBaketContent(item) || "-"}
                          </p>
                        </TableCell>
                      )}

                      {isColVisible("wilayahSumber") && (
                        <TableCell className="align-middle text-xs font-mono text-foreground">
                          {formatBaketAreaName(version?.eventArea)}
                        </TableCell>
                      )}

                      {isColVisible("wilayahPenempatan") && (
                        <TableCell className="align-middle text-xs font-mono text-foreground">
                          {identity.placementArea}
                        </TableCell>
                      )}

                      {isColVisible("urgensi") && (
                        <TableCell className="align-middle text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2.5 py-0.5 font-bold shrink-0 border uppercase tracking-wider",
                              urgencyStyle.badge,
                            )}
                          >
                            {urgencyStyle.label}
                          </Badge>
                        </TableCell>
                      )}

                      {isColVisible("tanggalBaket") && (
                        <TableCell className="align-middle text-xs font-mono text-muted-foreground whitespace-nowrap">
                          <div>{formatDateTime(getBaketDate(item))}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{getBaketVersionLabel(item)}</div>
                        </TableCell>
                      )}

                      <TableCell className="align-middle text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
                        >
                          <Link href={getBaketHref(item)}>
                            <Eye className="size-3.5" />
                            Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

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
