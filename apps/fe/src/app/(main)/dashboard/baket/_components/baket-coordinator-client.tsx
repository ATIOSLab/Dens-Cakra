"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  AlertTriangle,
  Calendar,
  Clock,
  Download,
  Eye,
  ImageIcon,
  Layers,
  MapPin,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  X,
} from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { FilterField } from "@/components/ui/filter-field";
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
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
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
  const isFieldCoordinator = role === SYSTEM_ROLES.FIELD_COORDINATOR;
  const isNationalRole = role === SYSTEM_ROLES.EXECUTIVE || role === SYSTEM_ROLES.NATIONAL_LEADER;
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
    setPeriodPreset("TODAY");
    setStartDate("");
    setEndDate("");
    setPage(1);
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

    if (isNationalRole && provinceFilter !== "ALL" && provinceFilter !== (defaultProvinceFilter || "ALL")) {
      const prov = provinceOptions.find((p) => p.id === provinceFilter);
      chips.push({
        id: "province",
        label: "Provinsi",
        value: prov ? prov.name : provinceFilter,
        onRemove: () => {
          setProvinceFilter(defaultProvinceFilter || "ALL");
          setRegencyFilter("ALL");
          setDistrictFilter("ALL");
          setVillageFilter("ALL");
          setPage(1);
        },
      });
    }

    if (regencyFilter !== "ALL") {
      const reg = regencyOptions.find((r) => r.id === regencyFilter);
      chips.push({
        id: "regency",
        label: "Kota/Kabupaten",
        value: reg ? reg.name : regencyFilter,
        onRemove: () => {
          setRegencyFilter("ALL");
          setDistrictFilter("ALL");
          setVillageFilter("ALL");
          setPage(1);
        },
      });
    }

    if (districtFilter !== "ALL") {
      const dist = districtOptions.find((d) => d.id === districtFilter);
      chips.push({
        id: "district",
        label: "Kecamatan",
        value: dist ? dist.name : districtFilter,
        onRemove: () => {
          setDistrictFilter("ALL");
          setVillageFilter("ALL");
          setPage(1);
        },
      });
    }

    if (villageFilter !== "ALL") {
      const vil = villageOptions.find((v) => v.id === villageFilter);
      chips.push({
        id: "village",
        label: "Kelurahan/Desa",
        value: vil ? vil.name : villageFilter,
        onRemove: () => {
          setVillageFilter("ALL");
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
  }, [
    search,
    urgencyFilter,
    categoryFilter,
    categories,
    isNationalRole,
    provinceFilter,
    defaultProvinceFilter,
    provinceOptions,
    regencyFilter,
    regencyOptions,
    districtFilter,
    districtOptions,
    villageFilter,
    villageOptions,
    periodPreset,
    startDate,
    endDate,
  ]);

  const activeFilterCount = activeFilterChips.length;

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

  const hasAreaFilter =
    (isNationalRole && provinceFilter !== "ALL" && provinceFilter !== (defaultProvinceFilter || "ALL")) ||
    regencyFilter !== "ALL" ||
    districtFilter !== "ALL" ||
    villageFilter !== "ALL";

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
          <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
            Daftar Bahan Keterangan (Baket) yang telah dipilih, diberi kategori, urgensi, dan diproses sebagai bahan
            operasional.
          </p>
          <p className="mt-2 font-medium text-foreground text-sm">{areaSubtitle}</p>
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
                {areaSubtitle || "Saring Bahan Keterangan berdasarkan urgensi, kategori, cakupan wilayah, dan periode."}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ColumnVisibilityToggle
                columns={BAKET_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
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
            {/* Baris 1: Pencarian Cepat & Periode Laporan */}
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
                      placeholder="Cari ID, kata kunci, judul, perihal, atau wilayah..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
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
                <FilterField
                  label="Periode Laporan"
                  icon={<Clock className="size-3.5" />}
                  isActive={periodPreset !== "TODAY"}
                >
                  <NativeSelect
                    aria-label="Filter Periode Waktu"
                    value={periodPreset}
                    onChange={(event) => {
                      setPeriodPreset(event.target.value as DashboardDetailPeriodPreset);
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

            {/* Baris 2: Parameter & Klasifikasi Baket */}
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
                  className="h-9 w-full"
                />
              </FilterField>
            </div>

            {/* Baris 3: Sub-panel Hierarki Cakupan Wilayah */}
            <div className="rounded-md border border-border/70 bg-muted/10 p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                  <MapPin className="size-3.5 text-primary" />
                  <span>Hierarki Cakupan Wilayah (Provinsi → Kota/Kab → Kecamatan → Kelurahan)</span>
                </div>
                {hasAreaFilter && (
                  <span className="font-mono text-[10px] text-primary">Tersaring spesifik</span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Filter Provinsi (hanya role nasional: Deputi II / KaBIN) */}
                {isNationalRole && provinceOptions.length > 0 && (
                  <FilterField
                    label="Provinsi"
                    icon={<MapPin className="size-3.5" />}
                    isActive={provinceFilter !== "ALL" && provinceFilter !== (defaultProvinceFilter || "ALL")}
                  >
                    <SearchableSelect
                      aria-label="Filter Provinsi"
                      value={provinceFilter}
                      options={[
                        { value: "ALL", label: "Semua Provinsi" },
                        ...provinceOptions.map((province) => ({ value: province.id, label: province.name })),
                      ]}
                      onValueChange={(value) => {
                        setProvinceFilter(value);
                        setRegencyFilter("ALL");
                        setDistrictFilter("ALL");
                        setVillageFilter("ALL");
                        setPage(1);
                      }}
                      placeholder="Semua Provinsi"
                      searchPlaceholder="Cari Provinsi..."
                      emptyText="Provinsi tidak ditemukan."
                      className="h-9 w-full"
                    />
                  </FilterField>
                )}

                {/* 2. Filter Kota/Kabupaten (sembunyikan untuk Korwil & Gaswil yang sudah ter-scope) */}
                {!isFieldOfficer && !isFieldCoordinator && (regencyOptions.length > 0 || provinceOptions.length > 0) && (
                  <FilterField
                    label="Kota / Kabupaten"
                    icon={<MapPin className="size-3.5" />}
                    isActive={regencyFilter !== "ALL"}
                  >
                    <SearchableSelect
                      aria-label="Filter Kota/Kabupaten"
                      value={regencyFilter}
                      options={[
                        {
                          value: "ALL",
                          label: provinceFilter === "ALL" ? "Pilih Provinsi dahulu" : "Semua Kota/Kabupaten",
                          disabled: provinceFilter === "ALL",
                        },
                        ...regencyOptions.map((regency) => ({ value: regency.id, label: regency.name })),
                      ]}
                      onValueChange={(value) => {
                        setRegencyFilter(value);
                        setDistrictFilter("ALL");
                        setVillageFilter("ALL");
                        setPage(1);
                      }}
                      disabled={provinceFilter === "ALL"}
                      placeholder={provinceFilter === "ALL" ? "Pilih Provinsi dahulu" : "Semua Kota/Kabupaten"}
                      searchPlaceholder="Cari Kota/Kabupaten..."
                      emptyText="Kota/Kabupaten tidak ditemukan."
                      className="h-9 w-full"
                    />
                  </FilterField>
                )}

                {/* 3. Filter Kecamatan */}
                {!isFieldOfficer && (
                  <FilterField label="Kecamatan" icon={<MapPin className="size-3.5" />} isActive={districtFilter !== "ALL"}>
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
                      disabled={!isFieldCoordinator && regencyFilter === "ALL"}
                      placeholder={regencyFilter === "ALL" ? "Pilih Kota/Kabupaten dahulu" : "Semua Kecamatan"}
                      searchPlaceholder="Cari Kecamatan..."
                      emptyText="Kecamatan tidak ditemukan."
                      className="h-9 w-full"
                    />
                  </FilterField>
                )}

                {/* 4. Filter Kelurahan/Desa */}
                <FilterField
                  label="Kelurahan / Desa"
                  icon={<MapPin className="size-3.5" />}
                  isActive={villageFilter !== "ALL"}
                >
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
                    className="h-9 w-full"
                  />
                </FilterField>
              </div>
            </div>
          </div>

          {/* Date Range Picker (Only shown when periodPreset === "CUSTOM") */}
          {periodPreset === "CUSTOM" && (
            <div className="rounded-md border border-border/80 border-dashed bg-muted/20 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
                  <Calendar className="size-3.5 text-primary" />
                  <span>Rentang Tanggal Baket:</span>
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
                    title="Dari Tanggal"
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
                    title="Sampai Tanggal"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Chips */}
          <ActiveFilterChips chips={activeFilterChips} onResetAll={handleResetFilters} />
        </CardHeader>
      </Card>

      {/* DATA CONTENT (CARD VIEW VS TABLE VIEW) */}
      {loadingList ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-card p-12 text-center dark:border-white/10">
          <RefreshCw className="mb-3 size-8 animate-spin text-emerald-500" />
          <p className="font-medium text-muted-foreground text-sm">Memuat data Baket...</p>
        </div>
      ) : loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Baket gagal dimuat</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => void refreshData()}>
              <RefreshCw className="mr-2 size-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-card p-12 text-center dark:border-white/10">
          <DOMAIN_VISUALS.baket.Icon className="mb-3 size-10 text-muted-foreground/50" />
          <p className="font-semibold text-base text-foreground">Tidak ada Baket ditemukan</p>
          <p className="mt-1 max-w-md text-muted-foreground text-xs">
            Cobalah untuk memuat ulang data atau sesuaikan filter pencarian Anda.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 text-xs">
            Reset Semua Filter
          </Button>
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW LAYOUT */
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium font-mono text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-300">
                        {refNum}
                      </span>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider",
                            urgencyStyle.badge,
                          )}
                        >
                          {urgencyStyle.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 font-semibold text-[10px] text-violet-700 dark:text-violet-400"
                        >
                          {item.reportCategory?.name ?? "Tanpa Kategori"}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h3 className="line-clamp-2 font-bold font-heading text-base text-foreground leading-snug">
                        {title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{content || "-"}</p>
                    </div>

                    <JaringIdentitySummary
                      compact
                      source={getBaketJaringIdentitySource(item)}
                      labelOverrides={BAKET_SOURCE_LABELS}
                    />
                  </div>

                  <div className="mt-4 space-y-3 border-slate-100 border-t pt-3 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground text-xs">
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
                        "h-9 w-full gap-2 border font-bold text-xs uppercase tracking-wider transition-colors",
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
          <div className="select-none overflow-x-auto rounded-xl border border-slate-200 bg-card shadow-xs dark:border-white/10">
            <Table className="w-full min-w-[1300px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-slate-200 border-b dark:border-slate-800">
                  {isColVisible("refNum") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">No. Ref / Sandi</TableHead>
                  )}
                  {isColVisible("foto") && (
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider">Foto</TableHead>
                  )}
                  {isColVisible("namaJaring") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Sumber</TableHead>
                  )}
                  {isColVisible("kodeJaring") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Kode Sumber</TableHead>
                  )}
                  {isColVisible("gaswil") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Petugas Wilayah (Gaswil)
                    </TableHead>
                  )}
                  {isColVisible("whatsapp") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Nomor WhatsApp</TableHead>
                  )}
                  {isColVisible("judulIsi") && (
                    <TableHead className="min-w-[200px] font-bold text-xs uppercase tracking-wider">
                      Judul & Isi Baket
                    </TableHead>
                  )}
                  {isColVisible("wilayahSumber") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Lokasi Baket</TableHead>
                  )}
                  {isColVisible("wilayahPenempatan") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Wilayah Sumber</TableHead>
                  )}
                  {isColVisible("urgensi") && (
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Urgensi</TableHead>
                  )}
                  {isColVisible("tanggalBaket") && (
                    <TableHead className="whitespace-nowrap font-bold text-xs uppercase tracking-wider">
                      Tanggal Baket
                    </TableHead>
                  )}
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
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
                      className="border-slate-100 border-b hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-white/5"
                    >
                      {isColVisible("refNum") && (
                        <TableCell className="align-middle font-medium font-mono text-foreground text-xs">
                          {refNum}
                        </TableCell>
                      )}

                      {isColVisible("foto") && (
                        <TableCell className="align-middle">
                          <div className="flex size-8 items-center justify-center overflow-hidden rounded-none border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
                            {identity.avatarUrl ? (
                              <img src={identity.avatarUrl} alt={identity.name} className="size-full object-cover" />
                            ) : (
                              <User className="size-4 text-slate-400 dark:text-slate-600" />
                            )}
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("namaJaring") && (
                        <TableCell className="align-middle font-bold font-mono text-foreground text-xs">
                          {identity.name}
                        </TableCell>
                      )}

                      {isColVisible("kodeJaring") && (
                        <TableCell className="align-middle font-mono text-violet-600 text-xs dark:text-violet-400">
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
                              className="font-mono text-emerald-600 hover:underline dark:text-emerald-400"
                            >
                              {identity.whatsappNumber}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Belum tersedia</span>
                          )}
                        </TableCell>
                      )}

                      {isColVisible("judulIsi") && (
                        <TableCell className="max-w-[280px] align-middle">
                          <p className="line-clamp-1 font-semibold text-foreground text-xs">
                            {getBaketDisplayTitle(item)}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                            {getBaketContent(item) || "-"}
                          </p>
                        </TableCell>
                      )}

                      {isColVisible("wilayahSumber") && (
                        <TableCell className="align-middle font-mono text-foreground text-xs">
                          {formatBaketAreaName(version?.eventArea)}
                        </TableCell>
                      )}

                      {isColVisible("wilayahPenempatan") && (
                        <TableCell className="align-middle font-mono text-foreground text-xs">
                          {identity.placementArea}
                        </TableCell>
                      )}

                      {isColVisible("urgensi") && (
                        <TableCell className="text-center align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn(
                                "shrink-0 border px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider",
                                urgencyStyle.badge,
                              )}
                            >
                              {urgencyStyle.label}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="whitespace-nowrap border border-violet-500/40 bg-violet-500/10 px-2.5 py-0.5 font-semibold text-[10px] text-violet-700 dark:text-violet-400"
                            >
                              {item.reportCategory?.name ?? "Tanpa Kategori"}
                            </Badge>
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("tanggalBaket") && (
                        <TableCell className="whitespace-nowrap align-middle font-mono text-muted-foreground text-xs">
                          <div>{formatDateTime(getBaketDate(item))}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{getBaketVersionLabel(item)}</div>
                        </TableCell>
                      )}

                      <TableCell className="text-right align-middle">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 gap-1.5 rounded-lg border-sky-500/30 px-2.5 font-medium text-sky-600 text-xs hover:bg-sky-500/10 dark:text-sky-400"
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
