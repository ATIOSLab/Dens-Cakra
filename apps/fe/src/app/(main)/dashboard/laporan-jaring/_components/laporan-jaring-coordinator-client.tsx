"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Activity,
  ArrowDown,
  Calendar,
  Clock,
  Download,
  Eye,
  ImageIcon,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
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
import { type JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
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
  isDkiAreaScope,
  resolveAreaFilterSelection,
  selectedAreaFilterId,
} from "@/lib/domain/area-filter";
import { jakartaBoundaryIso, resolveJakartaPeriodRange } from "@/lib/domain/date-time";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  alignJaringReportCategorySummary,
  formatDateTime,
  isJaringReportCategoryFilterActive,
  JARING_REPORT_CATEGORY_FILTERS,
  type JaringReportCategoryKey,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./laporan-jaring-presentation";
import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type VerificationStatus,
} from "./laporan-jaring-types";

function getUrgencyCardStyle(urgency?: PriorityLevel | null) {
  switch (urgency) {
    case "URGENT":
      return {
        border: "border-rose-500/70 dark:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50",
        label: "Mendesak",
      };
    case "HIGH":
      return {
        border: "border-amber-500/70 dark:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50",
        label: "Tinggi",
      };
    case "NORMAL":
      return {
        border: "border-emerald-500/50 dark:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        label: "Normal",
      };
    case "LOW":
      return {
        border: "border-sky-500/50 dark:border-sky-500/60 shadow-[0_0_10px_rgba(14,165,233,0.1)]",
        badge: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
        label: "Rendah",
      };
    default:
      return {
        border: "border-slate-300 dark:border-slate-800",
        badge: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40",
        label: "Normal",
      };
  }
}

interface RawJaringItem {
  id: string;
  aliasName?: string | null;
  fullName?: string | null;
  registrationStatus?: string | null;
  caretakerAssignments?: Array<{
    id?: string | null;
    fieldOfficerAssignmentId?: string | null;
    fieldOfficerAssignment?: {
      id?: string | null;
      userProfile?: {
        id?: string | null;
        fullName?: string | null;
      } | null;
    } | null;
  }>;
  areaCoverages?: Array<{
    areaId?: string | null;
    isPrimary?: boolean;
    validUntil?: string | null;
    area?: JaringAdministrativeArea | null;
  }>;
}

type PaginatedReportResponse = {
  items?: JaringReportSessionDetail[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
  scope?: ReportScopeMetadata;
  summary?: {
    totalSessions: number;
    totalJaringReports: number;
    baketReports: number;
    reportingJaringCount: number;
  };
};

type ReportScopeMetadata = {
  role?: string;
  roleCode?: string;
  commandRouteType?: string;
  organizationUnitName?: string;
  supervisionMode?: string;
  supervisionLabel?: string;
  scopeDescription?: string;
  label?: string;
  areas?: Array<{
    id: string;
    code?: string | null;
    name: string;
    level: string;
    isDkiJakarta?: boolean;
  }>;
};

type PaginatedJaringResponse = {
  items?: RawJaringItem[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
};

type AdministrativeAreaScope = {
  areaId: string;
  code: string;
  officialCode?: string | null;
  name: string;
  level: string;
  parentAreaId?: string | null;
  parentOfficialCode?: string | null;
};

type ReportStage = "JARING_REPORT";

type JaringAdministrativeArea = {
  id: string;
  name?: string | null;
  level?: string | null;
  parent?: JaringAdministrativeArea | null;
};

type GaswilFilterOption = {
  assignmentId: string;
  name: string;
  jaringCount: number;
};

function jaringAreaMatchesSelection(jaring: RawJaringItem, selectedAreaId?: string) {
  if (!selectedAreaId) return true;
  return (jaring.areaCoverages ?? []).some((coverage) => {
    if (coverage.validUntil) return false;
    if (coverage.areaId === selectedAreaId) return true;

    let area = coverage.area ?? null;
    while (area) {
      if (area.id === selectedAreaId) return true;
      area = area.parent ?? null;
    }

    return false;
  });
}

function getJaringGaswilAssignment(jaring: RawJaringItem) {
  const caretaker = jaring.caretakerAssignments?.[0];
  const assignmentId =
    caretaker?.fieldOfficerAssignmentId ?? caretaker?.fieldOfficerAssignment?.id ?? caretaker?.id ?? "";
  if (!assignmentId) return null;

  return {
    assignmentId,
    name: caretaker?.fieldOfficerAssignment?.userProfile?.fullName?.trim() || "Petugas Wilayah (Gaswil) tanpa nama",
  };
}

function resolveInitialReportFilters(searchParams: { get(name: string): string | null }): {
  status: string;
  stage: ReportStage;
} {
  return { status: "ALL", stage: "JARING_REPORT" };
}

function jakartaDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getReportDisplayStatus(item: JaringReportSessionDetail): VerificationStatus {
  return (item.processStatus ?? item.displayStatus ?? item.verificationStatus) as VerificationStatus;
}

const LAPORAN_JARING_COLUMNS: ColumnOption[] = [
  { id: "waktuMasuk", label: "Waktu Masuk" },
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp", defaultVisible: false },
  { id: "judulIsi", label: "Judul & Isi Laporan", alwaysVisible: true },
  { id: "wilayahSumber", label: "Lokasi Aktual Laporan" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan Jaring" },
  { id: "statusProses", label: "Status Proses" },
  { id: "refNum", label: "Nomor Referensi" },
];

export function LaporanJaringCoordinatorClient() {
  const searchParams = useSearchParams();
  const initialReportFilters = resolveInitialReportFilters(searchParams);
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportSummary, setReportSummary] = useState<PaginatedReportResponse["summary"]>();
  const [reportScope, setReportScope] = useState<ReportScopeMetadata | null>(null);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) =>
    visibleColumns[id] ?? LAPORAN_JARING_COLUMNS.find((column) => column.id === id)?.defaultVisible !== false;

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>(() => searchParams.get("urgency") || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>(() => initialReportFilters.status);
  const [jaringFilter, setJaringFilter] = useState<string>(() => searchParams.get("jaringId") || "ALL");
  const [provinceFilter, setProvinceFilter] = useState<string>("ALL");
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("categoryId") || "");
  const [areaFilter, setAreaFilter] = useState(() => searchParams.get("areaId") || "");
  const [fieldOfficerFilter, setFieldOfficerFilter] = useState(
    () => searchParams.get("fieldOfficerAssignmentId") || "",
  );
  const [attachmentFilter, setAttachmentFilter] = useState(() => searchParams.get("hasAttachment") || "");
  const [coordinateSourceFilter, setCoordinateSourceFilter] = useState(
    () => searchParams.get("coordinateSource") || "",
  );
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get("locationSuitability") || "");
  const [periodPreset, setPeriodPreset] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">(() =>
    searchParams.get("from") || searchParams.get("to") ? "CUSTOM" : "ALL",
  );
  const [startDate, setStartDate] = useState<string>(() => jakartaDateInput(searchParams.get("from")));
  const [endDate, setEndDate] = useState<string>(() => jakartaDateInput(searchParams.get("to")));

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const reportRequestId = useRef(0);
  const didHydrateAreaHierarchy = useRef(false);
  const selectedJaringAreaId = useMemo(
    () => selectedAreaFilterId({ provinceFilter, regencyFilter, districtFilter, villageFilter }),
    [districtFilter, provinceFilter, regencyFilter, villageFilter],
  );

  function reportQuery(requestedPage: number, requestedLimit: number) {
    const period = resolveJakartaPeriodRange(periodPreset, startDate, endDate);

    return {
      page: requestedPage,
      limit: requestedLimit,
      stage: "JARING_REPORT",
      sortBy: "reportedAt",
      sortOrder: "desc",
      search: debouncedSearch || undefined,
      urgency: urgencyFilter === "ALL" ? undefined : urgencyFilter,
      jaringId: jaringFilter === "ALL" ? undefined : jaringFilter,
      fieldOfficerAssignmentId: fieldOfficerFilter || undefined,
      areaId: areaFilter || undefined,
      jaringAreaId: selectedJaringAreaId,
      hasAttachment: attachmentFilter || undefined,
      coordinateSource: coordinateSourceFilter || undefined,
      locationSuitability: locationFilter || undefined,
      from: period.from ? jakartaBoundaryIso(period.from) : undefined,
      to: period.to ? jakartaBoundaryIso(period.to, true) : undefined,
    };
  }

  async function fetchAllJaringPages(jaringAreaId?: string) {
    const allJaring: RawJaringItem[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "100",
        registrationStatus: "APPROVED",
      });
      if (jaringAreaId) params.set("areaId", jaringAreaId);

      const response = await apiBrowserFetch<PaginatedJaringResponse | RawJaringItem[]>(`/jaring?${params.toString()}`);
      const pageItems = Array.isArray(response) ? response : response.items || [];
      allJaring.push(...pageItems);
      if (Array.isArray(response)) {
        totalPages = pageItems.length < 100 ? currentPage : currentPage + 1;
      } else {
        totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
      }
      currentPage += 1;
    } while (currentPage <= totalPages);

    return Array.from(new Map(allJaring.map((jaring) => [jaring.id, jaring])).values());
  }

  async function fetchAreaScopes() {
    return apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
      query: { includeDescendants: true },
    });
  }

  async function fetchReports(silent = false) {
    const requestId = ++reportRequestId.current;
    if (!silent) setLoadingList(true);
    setLoadError(null);
    try {
      const response = await apiBrowserFetch<PaginatedReportResponse | JaringReportSessionDetail[]>("/jaring/reports", {
        query: reportQuery(page, limit),
      });
      if (requestId !== reportRequestId.current) return;
      const items = Array.isArray(response) ? response : response.items || [];
      setReports(items);
      setReportTotal(Array.isArray(response) ? items.length : (response.pagination?.total ?? items.length));
      setReportSummary(Array.isArray(response) ? undefined : response.summary);
      setReportScope(Array.isArray(response) ? null : (response.scope ?? null));
    } catch (err) {
      if (requestId !== reportRequestId.current) return;
      console.error("Gagal memuat laporan jaring (field-coordinator):", err);
      setLoadError(err instanceof Error ? err.message : "Daftar laporan Jaring gagal dimuat.");
    } finally {
      if (requestId === reportRequestId.current && !silent) setLoadingList(false);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: opsi scope dimuat sekali dan fungsi tidak bergantung state
  useEffect(() => {
    fetchAreaScopes()
      .then((areaScopeItems) => {
        setAreaScopes(areaScopeItems);
      })
      .catch((error) => {
        console.error("Gagal memuat cakupan wilayah laporan jaring:", error);
      });
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: opsi Jaring mengikuti filter wilayah aktif
  useEffect(() => {
    fetchAllJaringPages(selectedJaringAreaId)
      .then((jaringItems) => {
        setJaringList(jaringItems);
        if (jaringFilter !== "ALL" && !jaringItems.some((item) => item.id === jaringFilter)) {
          setJaringFilter("ALL");
        }
      })
      .catch((error) => {
        console.error("Gagal memuat opsi Jaring sesuai wilayah:", error);
      });
  }, [selectedJaringAreaId, jaringFilter]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: daftar eksplisit memicu ulang query saat filter berubah
  useEffect(() => {
    void fetchReports();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchReports(true);
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [
    debouncedSearch,
    urgencyFilter,
    statusFilter,
    jaringFilter,
    provinceFilter,
    regencyFilter,
    districtFilter,
    villageFilter,
    selectedJaringAreaId,
    categoryFilter,
    areaFilter,
    fieldOfficerFilter,
    attachmentFilter,
    coordinateSourceFilter,
    locationFilter,
    periodPreset,
    startDate,
    endDate,
    page,
    limit,
  ]);

  const kpiSummary = alignJaringReportCategorySummary(reportSummary);
  const categoryFilterState = {
    verificationStatus: statusFilter,
    stage: "JARING_REPORT",
  };

  function applyCategoryFilter(category: JaringReportCategoryKey) {
    setStatusFilter("ALL");
    setPage(1);
  }

  const statusKpiCards = [
    {
      key: "TOTAL" as const,
      label: "TOTAL",
      description: "Sesuai filter aktif",
      count: kpiSummary.totalJaringReports,
      icon: DOMAIN_VISUALS.jaringReport.Icon,
      isActive: isJaringReportCategoryFilterActive("TOTAL", categoryFilterState),
      onClick: () => applyCategoryFilter("TOTAL"),
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

  const provinceOptions = useMemo(() => {
    return buildProvinceFilterOptions(areaScopes);
  }, [areaScopes]);

  const defaultProvinceFilter = useMemo(
    () => findDkiJakartaProvinceFilterId(provinceOptions),
    [provinceOptions],
  );

  const regencyOptions = useMemo(() => {
    return buildRegencyFilterOptions(areaScopes, provinceOptions.length > 0 ? provinceFilter : "ALL");
  }, [areaScopes, provinceFilter, provinceOptions.length]);

  const districtOptions = useMemo(() => {
    return buildDistrictFilterOptions(areaScopes, regencyFilter);
  }, [areaScopes, regencyFilter]);

  const villageOptions = useMemo(() => {
    return buildVillageFilterOptions(areaScopes, districtFilter);
  }, [areaScopes, districtFilter]);

  const areaFilteredJaringList = useMemo(() => {
    return jaringList.filter((jaring) => jaringAreaMatchesSelection(jaring, selectedJaringAreaId));
  }, [jaringList, selectedJaringAreaId]);

  const gaswilOptions: GaswilFilterOption[] = useMemo(() => {
    const optionMap = new Map<string, GaswilFilterOption>();

    for (const jaring of areaFilteredJaringList) {
      const gaswil = getJaringGaswilAssignment(jaring);
      if (!gaswil) continue;

      const existing = optionMap.get(gaswil.assignmentId);
      if (existing) {
        existing.jaringCount += 1;
        continue;
      }

      optionMap.set(gaswil.assignmentId, { ...gaswil, jaringCount: 1 });
    }

    return Array.from(optionMap.values()).sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
  }, [areaFilteredJaringList]);

  const connectedJaringList = useMemo(() => {
    if (!fieldOfficerFilter) return areaFilteredJaringList;
    return areaFilteredJaringList.filter(
      (jaring) => getJaringGaswilAssignment(jaring)?.assignmentId === fieldOfficerFilter,
    );
  }, [areaFilteredJaringList, fieldOfficerFilter]);

  const reportingJaringCount = kpiSummary.reportingJaringCount;

  const popoverJaringOptions: JaringOption[] = useMemo(() => {
    return connectedJaringList.map((j) => ({
      id: j.id,
      code: j.aliasName || j.fullName || j.id,
      aliasName: j.aliasName || j.fullName || j.id,
      fullName: j.fullName,
      registrationStatus: j.registrationStatus,
    }));
  }, [connectedJaringList]);

  useEffect(() => {
    if (!fieldOfficerFilter) return;
    if (gaswilOptions.some((option) => option.assignmentId === fieldOfficerFilter)) return;

    setFieldOfficerFilter("");
    setPage(1);
  }, [fieldOfficerFilter, gaswilOptions]);

  useEffect(() => {
    if (jaringFilter === "ALL") return;
    if (popoverJaringOptions.some((option) => option.id === jaringFilter)) return;

    setJaringFilter("ALL");
    setPage(1);
  }, [jaringFilter, popoverJaringOptions]);

  useEffect(() => {
    if (didHydrateAreaHierarchy.current || !areaFilter || areaScopes.length === 0) return;

    const selection = resolveAreaFilterSelection(areaScopes, areaFilter);
    if (selection.provinceFilter !== "ALL") setProvinceFilter(selection.provinceFilter);
    if (selection.regencyFilter !== "ALL") setRegencyFilter(selection.regencyFilter);
    if (selection.districtFilter !== "ALL") setDistrictFilter(selection.districtFilter);
    if (selection.villageFilter !== "ALL") setVillageFilter(selection.villageFilter);
    didHydrateAreaHierarchy.current = true;
  }, [areaFilter, areaScopes]);

  useEffect(() => {
    if (areaFilter || didHydrateAreaHierarchy.current || !defaultProvinceFilter || provinceFilter !== "ALL") return;

    setProvinceFilter(defaultProvinceFilter);
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPage(1);
    didHydrateAreaHierarchy.current = true;
  }, [areaFilter, defaultProvinceFilter, provinceFilter]);

  const areaSubtitle = useMemo(
    () =>
      buildAreaFilterSubtitle({
        metricLabel: "Jumlah laporan",
        allScopeLabel: "cakupan koordinasi aktif",
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
      provinceFilter,
      provinceOptions,
      regencyFilter,
      regencyOptions,
      villageFilter,
      villageOptions,
    ],
  );
  const selectedAreaFromQuery = useMemo(
    () => (areaFilter ? resolveAreaFilterSelection(areaScopes, areaFilter).selectedArea : null),
    [areaFilter, areaScopes],
  );
  const isDkiScoped = useMemo(() => {
    if (reportScope?.supervisionMode === "DKI_REGENCY_CITY") return true;
    const rootAreas = areaScopes.filter((area) => area.level === "CITY" || area.level === "REGENCY");
    return rootAreas.length > 0 && rootAreas.some(isDkiAreaScope);
  }, [areaScopes, reportScope]);
  const scopeDescription =
    reportScope?.scopeDescription ??
    (isDkiScoped
      ? "Cakupan laporan mengikuti wilayah supervisi DKI berbasis kota/kabupaten yang ditetapkan admin."
      : "Cakupan laporan mengikuti wilayah komando atau supervisi yang melekat pada hak akses pengguna.");
  const scopeLabel =
    reportScope?.supervisionLabel ?? (isDkiScoped ? "Supervisi DKI Kota/Kabupaten" : "Cakupan Hak Akses");

  const paginatedReports = reports;

  const handleResetFilters = () => {
    setSearch("");
    setUrgencyFilter("ALL");
    setStatusFilter("ALL");
    setJaringFilter("ALL");
    setProvinceFilter(defaultProvinceFilter || "ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setCategoryFilter("");
    setAreaFilter("");
    setFieldOfficerFilter("");
    setAttachmentFilter("");
    setCoordinateSourceFilter("");
    setLocationFilter("");
    setPeriodPreset("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = async () => {
    if (reportTotal === 0) return;

    const exportedReports: JaringReportSessionDetail[] = [];
    let exportPage = 1;
    let totalPages = 1;
    do {
      const response = await apiBrowserFetch<PaginatedReportResponse>("/jaring/reports", {
        query: reportQuery(exportPage, 100),
      });
      exportedReports.push(...(response.items ?? []));
      totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
      exportPage += 1;
    } while (exportPage <= totalPages);

    const headers = [
      "No Ref",
      "Kode Jaring",
      "Sorotan Isi",
      "Urgensi",
      "Status Proses",
      "Wilayah",
      "Waktu Pelaporan",
      "Waktu Pelaporan (Status)",
    ];

    const rows = exportedReports.map((r) => [
      `"${r.referenceNumber || r.id}"`,
      `"${r.jaringAlias || r.jaringCode || "-"}"`,
      `"${(r.displayTitle || r.content || "-").replace(/"/g, '""')}"`,
      `"${r.urgency || "Belum ditentukan"}"`,
      `"${verificationStatusLabel(getReportDisplayStatus(r))}"`,
      `"${r.resolvedArea?.name || "-"}"`,
      `"${formatDateTime(r.reportedAt)}"`,
      `"${formatDateTime(r.reportedAt)}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan-jaring-${new Date().toISOString().slice(0, 10)}.csv`);
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
            <BreadcrumbLink href="/dashboard">Monitoring</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Laporan Jaring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Laporan Jaring</h1>
          <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm">
            Monitoring arus Laporan Jaring dalam cakupan hak akses dan wilayah penugasan.
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">{areaSubtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1.5">
              <MapPin className="size-3.5" />
              {scopeLabel}
            </Badge>
            <span>{scopeDescription}</span>
            {reportScope?.label ? (
              <span className="font-medium text-foreground">Cakupan: {reportScope.label}</span>
            ) : null}
            {selectedAreaFromQuery ? (
              <span className="font-medium text-foreground">Filter dashboard: {selectedAreaFromQuery.name}</span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchReports()}
            disabled={loadingList}
            className="h-9 gap-2"
          >
            <RefreshCw className={cn("size-4 text-emerald-500 dark:text-emerald-400", loadingList && "animate-spin")} />
            Muat Ulang
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExportCSV()}
            disabled={reportTotal === 0}
            className="h-9 gap-2 border-slate-200 dark:border-white/10"
          >
            <Download className="size-4 text-sky-500" />
            Ekspor CSV
          </Button>
        </div>
      </div>

      {/* KPI status laporan: klik untuk menerapkan atau melepas filter */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statusKpiCards.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={isActive}
              aria-label={`Filter ${item.label}`}
              onClick={() => {
                if (isActive) {
                  applyCategoryFilter("TOTAL");
                } else {
                  item.onClick();
                }
              }}
              className={cn(
                "flex min-h-[104px] cursor-pointer items-center gap-3 rounded-md border bg-card p-3.5 text-left shadow-xs transition-all duration-150 active:scale-[0.98]",
                isActive ? item.styles.activeCard : item.styles.inactiveCard,
              )}
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-md transition-all duration-150",
                  isActive ? item.styles.activeIcon : item.styles.inactiveIcon,
                )}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                <p
                  className={cn(
                    "font-bold text-xl tracking-normal transition-colors",
                    isActive ? item.styles.countText : "text-foreground",
                  )}
                >
                  {item.count}
                </p>
                <p className="mt-0.5 truncate font-medium text-muted-foreground text-xs">{item.description}</p>
              </div>
            </button>
          );
        })}

        <div className="flex min-h-[104px] items-center gap-3 rounded-md border border-emerald-200/80 bg-card p-3.5 text-left shadow-xs transition-colors dark:border-emerald-900/30">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 transition-colors dark:text-emerald-400">
            <DOMAIN_VISUALS.jaring.Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">Jaring</p>
            <p className="font-bold text-emerald-600 text-xl tracking-normal dark:text-emerald-400">
              {reportingJaringCount}
            </p>
            <p className="mt-0.5 truncate font-medium text-muted-foreground text-xs">
              {jaringFilter === "ALL" ? "Jaring pelapor sesuai laporan" : "Jaring pelapor terpilih"}
            </p>
          </div>
        </div>
      </div>

      {/* FILTER & TOOLBAR BAR */}
      <div className="flex flex-col gap-3 rounded-md border border-slate-200/80 bg-card p-4 shadow-xs dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-border/70 border-b pb-3">
          <div>
            <p className={cn(DC_TYPOGRAPHY.cardTitle, "flex items-center gap-2")}>
              <Search className="size-4 text-primary" />
              Filter Laporan Jaring
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Urutan wilayah: Provinsi, Kota/Kabupaten, Kecamatan, lalu Kelurahan/Desa.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full font-mono text-[11px]">
            {search ||
            urgencyFilter !== "ALL" ||
            statusFilter !== "ALL" ||
            jaringFilter !== "ALL" ||
            provinceFilter !== (defaultProvinceFilter || "ALL") ||
            regencyFilter !== "ALL" ||
            districtFilter !== "ALL" ||
            villageFilter !== "ALL" ||
            categoryFilter ||
            areaFilter ||
            fieldOfficerFilter ||
            attachmentFilter ||
            coordinateSourceFilter ||
            locationFilter ||
            periodPreset !== "ALL" ||
            startDate ||
            endDate
              ? "Filter aktif"
              : "Tanpa filter"}
          </Badge>
        </div>
        <div className="space-y-3.5">
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
                className={cn(DC_CONTROLS.input, "h-9 pl-9 text-xs")}
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

            {/* View Mode Toggle Switcher & Column Visibility Toggle */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <ColumnVisibilityToggle
                columns={LAPORAN_JARING_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
            </div>
          </div>

          {/* MIDDLE ROW: Structured Grid of Filter Dropdowns */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            {/* Filter Provinsi */}
            {provinceOptions.length > 0 && (
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
                className={cn(DC_CONTROLS.selectTrigger, "h-9 w-full text-xs")}
              />
            )}

            {/* 3. Filter Kota/Kabupaten */}
            {(regencyOptions.length > 0 || provinceOptions.length > 0) && (
              <SearchableSelect
                aria-label="Filter Kota/Kabupaten"
                value={regencyFilter}
                options={[
                  {
                    value: "ALL",
                    label:
                      provinceOptions.length > 0 && provinceFilter === "ALL"
                        ? "Pilih Provinsi/Binda dahulu"
                        : isDkiScoped
                          ? "Semua Kota/Kabupaten DKI"
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
                    : isDkiScoped
                      ? "Semua Kota/Kabupaten DKI"
                      : "Semua Kota/Kabupaten"
                }
                searchPlaceholder="Cari Kota/Kabupaten..."
                emptyText="Kota/Kabupaten tidak ditemukan."
                className={cn(DC_CONTROLS.selectTrigger, "h-9 w-full text-xs")}
              />
            )}

            {/* 4. Filter Kecamatan */}
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
              className={cn(DC_CONTROLS.selectTrigger, "h-9 w-full text-xs")}
            />

            {/* 4. Filter Kelurahan/Desa */}
            <NativeSelect
              aria-label="Filter Kelurahan atau Desa"
              value={villageFilter}
              onChange={(event) => {
                setVillageFilter(event.target.value);
                setPage(1);
              }}
              disabled={districtFilter === "ALL"}
              className={cn(DC_CONTROLS.selectTrigger, "h-9 w-full text-xs")}
            >
              <option value="ALL">
                {districtFilter === "ALL" ? "Pilih Kecamatan dahulu" : "Semua Kelurahan/Desa"}
              </option>
              {villageOptions.map((village) => (
                <option key={village.id} value={village.id}>
                  {village.name}
                  {districtFilter === "ALL" && village.districtName ? ` - ${village.districtName}` : ""}
                </option>
              ))}
            </NativeSelect>

            {/* 5. Filter Petugas Wilayah (Gaswil) */}
            <SearchableSelect
              aria-label="Filter Petugas Wilayah (Gaswil)"
              value={fieldOfficerFilter || "ALL"}
              options={[
                { value: "ALL", label: "Semua Petugas Wilayah (Gaswil)" },
                ...gaswilOptions.map((option) => ({
                  value: option.assignmentId,
                  label: `${option.name} (${option.jaringCount} Jaring)`,
                })),
              ]}
              onValueChange={(value) => {
                setFieldOfficerFilter(value === "ALL" ? "" : value);
                setPage(1);
              }}
              disabled={gaswilOptions.length === 0}
              placeholder={
                gaswilOptions.length === 0 ? "Petugas Wilayah belum tersedia" : "Semua Petugas Wilayah (Gaswil)"
              }
              searchPlaceholder="Cari Petugas Wilayah (Gaswil)..."
              emptyText="Petugas Wilayah (Gaswil) tidak ditemukan."
              className={cn(DC_CONTROLS.selectTrigger, "h-9 w-full text-xs")}
            />

            {/* 6. Jaring Filter Popover */}
            <div className="w-full">
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
                className="h-9 text-xs w-full"
              />
            </div>

            {/* 7. Filter Periode Waktu */}
            <NativeSelect
              aria-label="Filter Periode Waktu"
              value={periodPreset}
              onChange={(event) => {
                setPeriodPreset(event.target.value as any);
                setPage(1);
              }}
              className={cn(DC_CONTROLS.selectTrigger, "h-9 w-full text-xs")}
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
          statusFilter !== "ALL" ||
          jaringFilter !== "ALL" ||
          provinceFilter !== (defaultProvinceFilter || "ALL") ||
          regencyFilter !== "ALL" ||
          districtFilter !== "ALL" ||
          villageFilter !== "ALL" ||
          categoryFilter ||
          areaFilter ||
          fieldOfficerFilter ||
          attachmentFilter ||
          coordinateSourceFilter ||
          locationFilter ||
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
                    className={cn(DC_CONTROLS.input, "h-8 w-[135px] px-2 text-xs")}
                  />
                  <span className="text-muted-foreground font-medium">s.d</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                    className={cn(DC_CONTROLS.input, "h-8 w-[135px] px-2 text-xs")}
                  />
                </div>
              ) : (
                <div />
              )}

              {(search ||
                urgencyFilter !== "ALL" ||
                statusFilter !== "ALL" ||
                jaringFilter !== "ALL" ||
                provinceFilter !== (defaultProvinceFilter || "ALL") ||
                regencyFilter !== "ALL" ||
                districtFilter !== "ALL" ||
                villageFilter !== "ALL" ||
                categoryFilter ||
                areaFilter ||
                fieldOfficerFilter ||
                attachmentFilter ||
                coordinateSourceFilter ||
                locationFilter ||
                periodPreset !== "ALL" ||
                startDate ||
                endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-medium"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* DATA CONTENT (CARD VIEW VS TABLE VIEW) */}
      {loadingList ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-slate-200 bg-card p-12 text-center dark:border-white/10">
          <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat data laporan Jaring...</p>
        </div>
      ) : loadError ? (
        <Card>
          <CardHeader>
            <CardTitle>Daftar laporan gagal dimuat</CardTitle>
            <CardDescription>{loadError}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => void fetchReports()}>
              <RefreshCw data-icon="inline-start" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : reportTotal === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-slate-200 bg-card p-12 text-center dark:border-white/10">
          <DOMAIN_VISUALS.jaringReport.Icon className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-base font-semibold text-foreground">Tidak ada laporan ditemukan</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Cobalah untuk memuat ulang data atau sesuaikan filter pencarian Anda.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 text-xs">
            Reset Semua Filter
          </Button>
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW LAYOUT (MATCHING REFERENCE IMAGE) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedReports.map((item) => {
              const urgencyStyle = getUrgencyCardStyle(item.urgency);
              const displayStatus = getReportDisplayStatus(item);
              const hasBaketUrgency = Boolean(item.urgency);
              const refNum =
                item.referenceNumber ||
                item.submittedMessage?.referenceNumber ||
                item.jaringAlias ||
                item.jaringCode ||
                `# ${item.id.slice(0, 8)}`;
              const title = item.displayTitle || item.content || "Laporan sedang dibuat";
              const mediaCount = item.media?.length || item.counts?.media || 0;
              const partsCount = item.messages?.length || item.counts?.contentParts || 0;
              const locationName = formatFullAreaName(item.resolvedArea);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between rounded-md border bg-card p-4 transition-all duration-200 hover:scale-[1.01]",
                    hasBaketUrgency ? urgencyStyle.border : "border-border",
                  )}
                >
                  {/* Card Header Pills */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasBaketUrgency ? (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-extrabold tracking-wider", urgencyStyle.badge)}
                          >
                            {urgencyStyle.label}
                          </Badge>
                        ) : null}

                        {/* Reference / Code Badge */}
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          {refNum}
                        </span>
                      </div>

                      {/* Verification Status Badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-2 py-0.5 font-medium shrink-0",
                          verificationStatusBadgeVariant(displayStatus),
                        )}
                      >
                        {verificationStatusLabel(displayStatus)}
                      </Badge>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2">{title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.content || "-"}</p>
                    </div>
                    <JaringIdentitySummary
                      compact
                      source={{
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
                      }}
                    />
                  </div>

                  {/* Card Footer Info & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10 space-y-3">
                    {/* Metadata indicators row */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="size-3.5 text-sky-500" /> {partsCount} pesan
                        </span>
                        <span className="flex items-center gap-1">
                          <ImageIcon className="size-3.5 text-amber-500" /> {mediaCount} foto
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-emerald-500" /> {locationName}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {formatDateTime(item.reportedAt)}
                      </span>
                    </div>

                    {/* Action button */}
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-9 text-xs font-bold gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors uppercase tracking-wider"
                    >
                      <Link href={`/dashboard/laporan-jaring/${item.id}`}>
                        <Eye className="size-4" /> Lihat Detail
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
            total={reportTotal}
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
          <div className="select-none overflow-x-auto rounded-md border border-slate-200 bg-card shadow-xs dark:border-white/10">
            <Table className="w-full min-w-[1350px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {isColVisible("waktuMasuk") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                      Waktu Masuk
                    </TableHead>
                  )}
                  {isColVisible("foto") && (
                    <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">Foto</TableHead>
                  )}
                  {isColVisible("namaJaring") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Nama Jaring</TableHead>
                  )}
                  {isColVisible("kodeJaring") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Kode Jaring</TableHead>
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
                      Judul & Isi Laporan
                    </TableHead>
                  )}
                  {isColVisible("wilayahSumber") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Lokasi Aktual Laporan</TableHead>
                  )}
                  {isColVisible("wilayahPenempatan") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">
                      Wilayah Penempatan Jaring
                    </TableHead>
                  )}
                  {isColVisible("statusProses") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-center">
                      Status Proses
                    </TableHead>
                  )}
                  {isColVisible("refNum") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Nomor Referensi</TableHead>
                  )}
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((item) => {
                  const urgencyStyle = getUrgencyCardStyle(item.urgency);
                  const displayStatus = getReportDisplayStatus(item);
                  const refNum = item.referenceNumber || item.jaringAlias || item.jaringCode || item.id.slice(0, 8);
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
                      className="hover:bg-slate-50/50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-slate-800"
                    >
                      {isColVisible("waktuMasuk") && (
                        <TableCell className="align-middle text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.reportedAt)}
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
                            {item.displayTitle || item.content || "Laporan sedang dibuat"}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.content || "-"}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {messageCount} pesan - {mediaCount} media
                          </p>
                        </TableCell>
                      )}

                      {isColVisible("wilayahSumber") && (
                        <TableCell className="align-middle text-xs font-mono text-foreground">
                          {formatFullAreaName(item.resolvedArea)}
                        </TableCell>
                      )}

                      {isColVisible("wilayahPenempatan") && (
                        <TableCell className="align-middle text-xs font-mono text-foreground">
                          {identity.placementArea}
                        </TableCell>
                      )}

                      {isColVisible("statusProses") && (
                        <TableCell className="align-middle text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-medium",
                              verificationStatusBadgeVariant(displayStatus),
                            )}
                          >
                            {verificationStatusLabel(displayStatus)}
                          </Badge>
                        </TableCell>
                      )}

                      {isColVisible("refNum") && (
                        <TableCell className="font-mono text-xs font-medium text-foreground align-middle">
                          {refNum}
                        </TableCell>
                      )}

                      <TableCell className="align-middle text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 rounded-md border-sky-500/30 px-2.5 font-medium text-sky-600 text-xs hover:bg-sky-500/10 dark:text-sky-400"
                        >
                          <Link href={`/dashboard/laporan-jaring/${item.id}`}>
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
            total={reportTotal}
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
