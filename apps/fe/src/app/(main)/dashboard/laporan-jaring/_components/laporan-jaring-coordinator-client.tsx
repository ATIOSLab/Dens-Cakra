"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  Activity,
  Archive,
  ArrowDown,
  Calendar,
  Clock,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FileWarning,
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
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
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
import { Input } from "@/components/ui/input";
import { type JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
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
}

type PaginatedReportResponse = {
  items?: JaringReportSessionDetail[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
  summary?: {
    totalSessions: number;
    totalJaringReports: number;
    completeJaringReports: number;
    incompleteJaringReports: number;
    baketReports: number;
    verifiedJaringReports: number;
    waitingVerificationReports: number;
  };
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

type ReportStage = "ALL" | "JARING_REPORT" | "DRAFT_BAKET" | "VALIDATED_BAKET";
type ReportCompleteness = "ALL" | "COMPLETE" | "INCOMPLETE";

function resolveInitialReportFilters(searchParams: { get(name: string): string | null }): {
  status: string;
  completeness: ReportCompleteness;
  stage: ReportStage;
} {
  const rawStatus = searchParams.get("verificationStatus") ?? "ALL";
  const rawCompleteness = searchParams.get("completeness");
  const completeness: ReportCompleteness =
    rawCompleteness === "COMPLETE" || rawCompleteness === "INCOMPLETE" ? rawCompleteness : "ALL";
  const rawStage = searchParams.get("stage");
  let stage: ReportStage = searchParams.get("workflowStatus") ? "ALL" : "JARING_REPORT";
  if (
    rawStage === "ALL" ||
    rawStage === "JARING_REPORT" ||
    rawStage === "DRAFT_BAKET" ||
    rawStage === "VALIDATED_BAKET"
  ) {
    stage = rawStage;
  }

  if (stage === "DRAFT_BAKET" || stage === "VALIDATED_BAKET") {
    return { status: "METADATA_RECORDED", completeness: "ALL", stage };
  }
  if (rawStatus === "METADATA_RECORDED") {
    return { status: rawStatus, completeness: "ALL", stage: "ALL" };
  }
  if (completeness !== "ALL") {
    return { status: rawStatus, completeness, stage: "JARING_REPORT" };
  }
  return { status: rawStatus, completeness, stage };
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

function isVerifiedReport(status: VerificationStatus) {
  return status === "VERIFIED_BY_FIELD_OFFICER" || status === "METADATA_RECORDED";
}

function isRegencyLevel(level: string) {
  return level === "CITY" || level === "REGENCY" || level === "KOTA" || level === "KABUPATEN";
}

function isVillageLevel(level: string) {
  return level === "VILLAGE" || level === "URBAN_VILLAGE";
}

function areaCode(area: AdministrativeAreaScope) {
  return area.officialCode?.trim() || area.code.trim();
}

function resolveDistrictRegency(
  district: AdministrativeAreaScope,
  regencies: AdministrativeAreaScope[],
): AdministrativeAreaScope | null {
  if (district.parentAreaId) {
    const parent = regencies.find((regency) => regency.areaId === district.parentAreaId);
    if (parent) return parent;
  }

  const districtCodeStr = areaCode(district);
  return (
    regencies.find((regency) => {
      const regencyCodeStr = areaCode(regency);
      return (
        (Boolean(district.parentOfficialCode) && district.parentOfficialCode === regencyCodeStr) ||
        (Boolean(regencyCodeStr) && districtCodeStr.startsWith(`${regencyCodeStr}.`))
      );
    }) ?? null
  );
}

function resolveVillageDistrict(
  village: AdministrativeAreaScope,
  districts: AdministrativeAreaScope[],
): AdministrativeAreaScope | null {
  if (village.parentAreaId) {
    const parent = districts.find((district) => district.areaId === village.parentAreaId);
    if (parent) return parent;
  }

  const villageCode = areaCode(village);
  return (
    districts.find((district) => {
      const districtCode = areaCode(district);
      return (
        (Boolean(village.parentOfficialCode) && village.parentOfficialCode === districtCode) ||
        (Boolean(districtCode) && villageCode.startsWith(`${districtCode}.`))
      );
    }) ?? null
  );
}

const LAPORAN_JARING_COLUMNS: ColumnOption[] = [
  { id: "refNum", label: "No. Ref / Sandi" },
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "judulIsi", label: "Judul & Isi Laporan", alwaysVisible: true },
  { id: "wilayahSumber", label: "Lokasi Aktual Laporan" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan Jaring" },
  { id: "statusProses", label: "Status Proses" },
  { id: "waktuMasuk", label: "Waktu Masuk" },
];

export function LaporanJaringCoordinatorClient() {
  const searchParams = useSearchParams();
  const initialReportFilters = resolveInitialReportFilters(searchParams);
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportSummary, setReportSummary] = useState<PaginatedReportResponse["summary"]>();
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) => visibleColumns[id] !== false;

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>(() => searchParams.get("urgency") || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>(() => initialReportFilters.status);
  const [completenessFilter, setCompletenessFilter] = useState<ReportCompleteness>(
    () => initialReportFilters.completeness,
  );
  const [jaringFilter, setJaringFilter] = useState<string>(() => searchParams.get("jaringId") || "ALL");
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState(() => searchParams.get("categoryId") || "");
  const [areaFilter, setAreaFilter] = useState(() => searchParams.get("areaId") || "");
  const [fieldOfficerFilter, setFieldOfficerFilter] = useState(
    () => searchParams.get("fieldOfficerAssignmentId") || "",
  );
  const [reportStatusFilter, setReportStatusFilter] = useState(() => searchParams.get("reportStatus") || "");
  const [workflowStatusFilter, setWorkflowStatusFilter] = useState(() => searchParams.get("workflowStatus") || "");
  const [attachmentFilter, setAttachmentFilter] = useState(() => searchParams.get("hasAttachment") || "");
  const [coordinateSourceFilter, setCoordinateSourceFilter] = useState(
    () => searchParams.get("coordinateSource") || "",
  );
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get("locationSuitability") || "");
  const [stageFilter, setStageFilter] = useState<ReportStage>(() => initialReportFilters.stage);
  const [periodPreset, setPeriodPreset] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">(() =>
    searchParams.get("from") || searchParams.get("to") ? "CUSTOM" : "ALL",
  );
  const [startDate, setStartDate] = useState<string>(() => jakartaDateInput(searchParams.get("from")));
  const [endDate, setEndDate] = useState<string>(() => jakartaDateInput(searchParams.get("to")));

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const reportRequestId = useRef(0);

  function reportQuery(requestedPage: number, requestedLimit: number) {
    const period = resolveJakartaPeriodRange(periodPreset, startDate, endDate);
    let jaringAreaId: string | undefined;
    if (villageFilter !== "ALL") jaringAreaId = villageFilter;
    else if (districtFilter !== "ALL") jaringAreaId = districtFilter;
    else if (regencyFilter !== "ALL") jaringAreaId = regencyFilter;

    return {
      page: requestedPage,
      limit: requestedLimit,
      stage: stageFilter,
      sortBy: "reportedAt",
      sortOrder: "desc",
      search: debouncedSearch || undefined,
      urgency: urgencyFilter === "ALL" ? undefined : urgencyFilter,
      verificationStatus: statusFilter === "ALL" ? undefined : statusFilter,
      completeness: completenessFilter === "ALL" ? undefined : completenessFilter,
      jaringId: jaringFilter === "ALL" ? undefined : jaringFilter,
      fieldOfficerAssignmentId: fieldOfficerFilter || undefined,
      categoryId: categoryFilter || undefined,
      areaId: areaFilter || undefined,
      jaringAreaId,
      status: reportStatusFilter || undefined,
      workflowStatus: workflowStatusFilter || undefined,
      hasAttachment: attachmentFilter || undefined,
      coordinateSource: coordinateSourceFilter || undefined,
      locationSuitability: locationFilter || undefined,
      from: period.from ? jakartaBoundaryIso(period.from) : undefined,
      to: period.to ? jakartaBoundaryIso(period.to, true) : undefined,
    };
  }

  async function fetchAllJaringPages() {
    const allJaring: RawJaringItem[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await apiBrowserFetch<PaginatedJaringResponse | RawJaringItem[]>(
        `/jaring?page=${currentPage}&limit=100`,
      );
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
    Promise.all([fetchAllJaringPages(), fetchAreaScopes()])
      .then(([jaringItems, areaScopeItems]) => {
        setJaringList(jaringItems);
        setAreaScopes(areaScopeItems);
      })
      .catch((error) => {
        console.error("Gagal memuat opsi filter laporan jaring:", error);
      });
  }, []);

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
    completenessFilter,
    jaringFilter,
    regencyFilter,
    districtFilter,
    villageFilter,
    categoryFilter,
    areaFilter,
    fieldOfficerFilter,
    reportStatusFilter,
    workflowStatusFilter,
    attachmentFilter,
    coordinateSourceFilter,
    locationFilter,
    stageFilter,
    periodPreset,
    startDate,
    endDate,
    page,
    limit,
  ]);

  const kpiSummary = alignJaringReportCategorySummary(reportSummary);
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

  const statusKpiCards = [
    {
      key: "TOTAL" as const,
      label: "TOTAL",
      description: JARING_REPORT_CATEGORY_FILTERS.TOTAL.label,
      count: kpiSummary.totalJaringReports,
      icon: FileText,
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
    {
      key: "COMPLETE" as const,
      label: "LENGKAP",
      description: JARING_REPORT_CATEGORY_FILTERS.COMPLETE.label,
      count: kpiSummary.completeJaringReports,
      icon: FileCheck2,
      isActive: isJaringReportCategoryFilterActive("COMPLETE", categoryFilterState),
      onClick: () => applyCategoryFilter("COMPLETE"),
      styles: {
        activeCard:
          "border-green-500 bg-green-50/80 dark:bg-green-950/40 ring-2 ring-green-500/40 shadow-sm shadow-green-500/10",
        inactiveCard:
          "border-green-200/80 dark:border-green-900/30 bg-card hover:border-green-300 dark:hover:border-green-800 hover:bg-green-50/30 dark:hover:bg-green-950/20",
        activeBadge: "bg-green-600 text-white border-green-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-green-200 bg-green-100/80 text-green-700 dark:border-green-900/50 dark:bg-green-950/50 dark:text-green-400",
        activeIcon: "bg-green-600 text-white shadow-md shadow-green-500/30",
        inactiveIcon: "bg-green-100 text-green-600 dark:bg-green-950/60 dark:text-green-400",
        countText: "text-green-700 dark:text-green-400",
      },
    },
    {
      key: "INCOMPLETE" as const,
      label: "TIDAK LENGKAP",
      description: JARING_REPORT_CATEGORY_FILTERS.INCOMPLETE.label,
      count: kpiSummary.incompleteJaringReports,
      icon: FileWarning,
      isActive: isJaringReportCategoryFilterActive("INCOMPLETE", categoryFilterState),
      onClick: () => applyCategoryFilter("INCOMPLETE"),
      styles: {
        activeCard:
          "border-orange-500 bg-orange-50/80 dark:bg-orange-950/40 ring-2 ring-orange-500/40 shadow-sm shadow-orange-500/10",
        inactiveCard:
          "border-orange-200/80 dark:border-orange-900/30 bg-card hover:border-orange-300 dark:hover:border-orange-800 hover:bg-orange-50/30 dark:hover:bg-orange-950/20",
        activeBadge: "bg-orange-600 text-white border-orange-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-orange-200 bg-orange-100/80 text-orange-700 dark:border-orange-900/50 dark:bg-orange-950/50 dark:text-orange-400",
        activeIcon: "bg-orange-600 text-white shadow-md shadow-orange-500/30",
        inactiveIcon: "bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400",
        countText: "text-orange-700 dark:text-orange-400",
      },
    },
    {
      key: "BAKET" as const,
      label: "BAKET",
      description: JARING_REPORT_CATEGORY_FILTERS.BAKET.label,
      count: kpiSummary.baketReports,
      icon: Archive,
      isActive: isJaringReportCategoryFilterActive("BAKET", categoryFilterState),
      onClick: () => applyCategoryFilter("BAKET"),
      styles: {
        activeCard:
          "border-violet-500 bg-violet-50/80 dark:bg-violet-950/40 ring-2 ring-violet-500/40 shadow-sm shadow-violet-500/10",
        inactiveCard:
          "border-violet-200/80 dark:border-violet-900/30 bg-card hover:border-violet-300 dark:hover:border-violet-800 hover:bg-violet-50/30 dark:hover:bg-violet-950/20",
        activeBadge: "bg-violet-600 text-white border-violet-600 font-semibold shadow-xs",
        inactiveBadge:
          "border-violet-200 bg-violet-100/80 text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/50 dark:text-violet-400",
        activeIcon: "bg-violet-600 text-white shadow-md shadow-violet-500/30",
        inactiveIcon: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
        countText: "text-violet-700 dark:text-violet-400",
      },
    },
  ];

  // Jaring Popover options format
  const popoverJaringOptions: JaringOption[] = useMemo(() => {
    return jaringList.map((j) => ({
      id: j.id,
      code: j.aliasName || j.fullName || j.id,
      aliasName: j.aliasName || j.fullName || j.id,
      fullName: j.fullName,
      registrationStatus: j.registrationStatus,
    }));
  }, [jaringList]);

  const regencyOptions = useMemo(() => {
    const regencies = new globalThis.Map<string, { id: string; name: string }>();
    for (const area of areaScopes) {
      if (isRegencyLevel(area.level)) {
        regencies.set(area.areaId, { id: area.areaId, name: area.name });
      }
    }

    return Array.from(regencies.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes]);

  const districtOptions = useMemo(() => {
    const regencies = areaScopes.filter((area) => isRegencyLevel(area.level));
    const districts = new globalThis.Map<
      string,
      { id: string; name: string; regencyId: string | null; regencyName: string | null }
    >();

    for (const area of areaScopes) {
      if (area.level === "DISTRICT") {
        const regency = resolveDistrictRegency(area, regencies);
        if (regencyFilter !== "ALL" && regency?.areaId !== regencyFilter) continue;
        districts.set(area.areaId, {
          id: area.areaId,
          name: area.name,
          regencyId: regency?.areaId ?? area.parentAreaId ?? null,
          regencyName: regency?.name ?? null,
        });
      }
    }

    return Array.from(districts.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, regencyFilter]);

  const villageOptions = useMemo(() => {
    const districts = areaScopes.filter((area) => area.level === "DISTRICT");
    const villages = new globalThis.Map<
      string,
      { id: string; name: string; districtId: string | null; districtName: string | null }
    >();

    for (const area of areaScopes) {
      if (isVillageLevel(area.level)) {
        const district = resolveVillageDistrict(area, districts);
        if (districtFilter !== "ALL" && district?.areaId !== districtFilter) continue;
        villages.set(area.areaId, {
          id: area.areaId,
          name: area.name,
          districtId: district?.areaId ?? area.parentAreaId ?? null,
          districtName: district?.name ?? null,
        });
      }
    }

    return Array.from(villages.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, districtFilter]);

  const paginatedReports = reports;

  const handleResetFilters = () => {
    setSearch("");
    setUrgencyFilter("ALL");
    setStatusFilter("ALL");
    setCompletenessFilter("ALL");
    setJaringFilter("ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setCategoryFilter("");
    setAreaFilter("");
    setFieldOfficerFilter("");
    setReportStatusFilter("");
    setWorkflowStatusFilter("");
    setAttachmentFilter("");
    setCoordinateSourceFilter("");
    setLocationFilter("");
    setStageFilter("JARING_REPORT");
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
      `"${isVerifiedReport(r.verificationStatus) ? r.urgency || "Belum ditentukan" : "Belum diverifikasi"}"`,
      `"${verificationStatusLabel(r.verificationStatus)}"`,
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
            <BreadcrumbLink href="/dashboard/field-coordinator">Koordinator Lapangan</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Laporan Jaring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">Laporan Jaring</h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Monitoring & verifikasi arus laporan informasi Daftar Jaring di wilayah koordinasi.
          </p>
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
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExportCSV()}
            disabled={reportTotal === 0}
            className="h-9 gap-2 border-slate-200 dark:border-white/10"
          >
            <Download className="size-4 text-sky-500" />
            EKSPOR CSV
          </Button>
        </div>
      </div>

      {/* KPI STATUS LAPORAN — klik untuk menerapkan atau melepas filter */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statusKpiCards.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={isActive}
              aria-label={`Filter ${item.description}`}
              onClick={() => {
                if (isActive) {
                  applyCategoryFilter("TOTAL");
                } else {
                  item.onClick();
                }
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
                    {item.count}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">{item.description}</p>
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

      {/* FILTER & TOOLBAR BAR */}
      <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* TOP ROW: Search input + View Mode Switcher */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari ID Laporan, Kata Kunci, Wilayah..."
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
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
              regencyOptions.length > 0 ? "md:grid-cols-4 xl:grid-cols-7" : "md:grid-cols-3 xl:grid-cols-6",
            )}
          >
            {/* 1. Status Verifikasi Filter */}
            <NativeSelect
              aria-label="Filter Status Verifikasi"
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
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Status Verifikasi</option>
              <option value="UNVERIFIED">Belum Diverifikasi</option>
              <option value="WAITING">Menunggu Verifikasi</option>
              <option value="NEEDS_REVIEW">Perlu Ditinjau</option>
              <option value="VERIFIED">Terverifikasi</option>
              <option value="WAITING_FIELD_OFFICER_VERIFICATION">Belum Diverifikasi Petugas Wilayah (Gaswil)</option>
              <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi, Belum Menjadi Baket</option>
            </NativeSelect>

            {/* 2. Kategori Data */}
            <NativeSelect
              aria-label="Filter Kategori Data"
              value={categorySelectValue}
              onChange={(event) => {
                const nextCategory = event.target.value;
                if (nextCategory === "ALL_DATA") {
                  setStatusFilter("ALL");
                  setCompletenessFilter("ALL");
                  setStageFilter("ALL");
                  setPage(1);
                  return;
                }
                if (nextCategory === "BAKET") {
                  applyCategoryFilter("BAKET");
                  return;
                }
                applyCategoryFilter(jaringReportCategoryFromCompleteness(nextCategory));
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL_DATA">Semua Data Laporan Jaring dan Baket</option>
              <option value="TOTAL">{JARING_REPORT_CATEGORY_FILTERS.TOTAL.label}</option>
              <option value="COMPLETE">{JARING_REPORT_CATEGORY_FILTERS.COMPLETE.label}</option>
              <option value="INCOMPLETE">{JARING_REPORT_CATEGORY_FILTERS.INCOMPLETE.label}</option>
              <option value="BAKET">{JARING_REPORT_CATEGORY_FILTERS.BAKET.label}</option>
            </NativeSelect>

            {/* 4. Filter Kota/Kabupaten (Tampil untuk Regional Commander) */}
            {regencyOptions.length > 0 && (
              <NativeSelect
                aria-label="Filter Kota/Kabupaten"
                value={regencyFilter}
                onChange={(event) => {
                  setRegencyFilter(event.target.value);
                  setDistrictFilter("ALL");
                  setVillageFilter("ALL");
                  setPage(1);
                }}
                className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
              >
                <option value="ALL">Semua Kabupaten/Kota</option>
                {regencyOptions.map((regency) => (
                  <option key={regency.id} value={regency.id}>
                    {regency.name}
                  </option>
                ))}
              </NativeSelect>
            )}

            {/* 5. Filter Kecamatan */}
            <NativeSelect
              aria-label="Filter Kecamatan"
              value={districtFilter}
              onChange={(event) => {
                setDistrictFilter(event.target.value);
                setVillageFilter("ALL");
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Kecamatan</option>
              {districtOptions.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </NativeSelect>

            {/* 6. Filter Kelurahan/Desa */}
            <NativeSelect
              aria-label="Filter Kelurahan atau Desa"
              value={villageFilter}
              onChange={(event) => {
                setVillageFilter(event.target.value);
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Kelurahan/Desa</option>
              {villageOptions.map((village) => (
                <option key={village.id} value={village.id}>
                  {village.name}
                  {districtFilter === "ALL" && village.districtName ? ` — ${village.districtName}` : ""}
                </option>
              ))}
            </NativeSelect>

            {/* 7. Jaring Filter Popover */}
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

            {/* 8. Filter Periode Waktu */}
            <NativeSelect
              aria-label="Filter Periode Waktu"
              value={periodPreset}
              onChange={(event) => {
                setPeriodPreset(event.target.value as any);
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
          statusFilter !== "ALL" ||
          completenessFilter !== "ALL" ||
          jaringFilter !== "ALL" ||
          regencyFilter !== "ALL" ||
          districtFilter !== "ALL" ||
          villageFilter !== "ALL" ||
          stageFilter !== "JARING_REPORT" ||
          categoryFilter ||
          areaFilter ||
          fieldOfficerFilter ||
          reportStatusFilter ||
          workflowStatusFilter ||
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
                statusFilter !== "ALL" ||
                completenessFilter !== "ALL" ||
                jaringFilter !== "ALL" ||
                regencyFilter !== "ALL" ||
                districtFilter !== "ALL" ||
                villageFilter !== "ALL" ||
                stageFilter !== "JARING_REPORT" ||
                categoryFilter ||
                areaFilter ||
                fieldOfficerFilter ||
                reportStatusFilter ||
                workflowStatusFilter ||
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
        </CardContent>
      </Card>

      {/* DATA CONTENT (CARD VIEW VS TABLE VIEW) */}
      {loadingList ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
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
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <FileText className="size-10 text-muted-foreground/50 mb-3" />
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
              const reportIsVerified = isVerifiedReport(item.verificationStatus);
              const hasVerifiedUrgency = reportIsVerified && Boolean(item.urgency);
              const refNum =
                item.referenceNumber ||
                item.submittedMessage?.referenceNumber ||
                item.jaringAlias ||
                item.jaringCode ||
                `# ${item.id.slice(0, 8)}`;
              const title = item.displayTitle || item.content || "Laporan sedang dibuat";
              const mediaCount = item.media?.length || item.counts?.media || 0;
              const partsCount = item.messages?.length || item.counts?.contentParts || 0;
              const draftComplete = Boolean(item.content && item.location && mediaCount > 0);
              const locationName = formatFullAreaName(item.resolvedArea);

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border bg-card p-4 transition-all duration-200 hover:scale-[1.01]",
                    hasVerifiedUrgency ? urgencyStyle.border : "border-border",
                  )}
                >
                  {/* Card Header Pills */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {hasVerifiedUrgency ? (
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
                          verificationStatusBadgeVariant(item.verificationStatus),
                        )}
                      >
                        {verificationStatusLabel(item.verificationStatus)}
                      </Badge>
                    </div>

                    {/* Title */}
                    <div>
                      <h3 className="font-heading font-bold text-base text-foreground leading-snug line-clamp-2">
                        {title}
                      </h3>
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

                    {item.status === "ACTIVE" ? (
                      <Badge
                        variant="outline"
                        className="w-fit border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400"
                      >
                        {draftComplete ? "Komponen lengkap" : "Komponen belum lengkap"}
                      </Badge>
                    ) : null}

                    {/* Action button */}
                    <Button
                      asChild
                      variant="outline"
                      className="w-full h-9 text-xs font-bold gap-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors uppercase tracking-wider"
                    >
                      <Link href={`/dashboard/laporan-jaring/${item.id}`}>
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
          <div className="overflow-x-auto select-none rounded-xl border border-slate-200 dark:border-white/10 bg-card shadow-xs">
            <Table className="w-full min-w-[1350px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {isColVisible("refNum") && <TableHead className="text-xs font-bold uppercase tracking-wider">Nomor Referensi</TableHead>}
                  {isColVisible("foto") && <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">Foto</TableHead>}
                  {isColVisible("namaJaring") && <TableHead className="text-xs font-bold uppercase tracking-wider">Nama Jaring</TableHead>}
                  {isColVisible("kodeJaring") && <TableHead className="text-xs font-bold uppercase tracking-wider">Kode Jaring</TableHead>}
                  {isColVisible("gaswil") && <TableHead className="text-xs font-bold uppercase tracking-wider">Petugas Wilayah (Gaswil)</TableHead>}
                  {isColVisible("whatsapp") && <TableHead className="text-xs font-bold uppercase tracking-wider">Nomor WhatsApp</TableHead>}
                  {isColVisible("judulIsi") && (
                    <TableHead className="min-w-[200px] text-xs font-bold uppercase tracking-wider">
                      Judul & Isi Laporan
                    </TableHead>
                  )}
                  {isColVisible("wilayahSumber") && <TableHead className="text-xs font-bold uppercase tracking-wider">Lokasi Aktual Laporan</TableHead>}
                  {isColVisible("wilayahPenempatan") && <TableHead className="text-xs font-bold uppercase tracking-wider">Wilayah Penempatan Jaring</TableHead>}
                  {isColVisible("statusProses") && (
                    <TableHead className="text-xs font-bold uppercase tracking-wider text-center">
                      Status Proses
                    </TableHead>
                  )}
                  {isColVisible("waktuMasuk") && <TableHead className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Waktu Masuk</TableHead>}
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((item) => {
                  const urgencyStyle = getUrgencyCardStyle(item.urgency);
                  const reportIsVerified = isVerifiedReport(item.verificationStatus);
                  const hasVerifiedUrgency = reportIsVerified && Boolean(item.urgency);
                  const refNum = item.referenceNumber || item.jaringAlias || item.jaringCode || item.id.slice(0, 8);
                  const messageCount = item.messages?.length ?? item.counts?.contentParts ?? 0;
                  const mediaCount = item.media?.length ?? item.counts?.media ?? 0;
                  const draftComplete = Boolean(item.content && item.location && mediaCount > 0);

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
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-slate-800">
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
                            {item.displayTitle || item.content || "Laporan sedang dibuat"}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.content || "-"}</p>
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {messageCount} pesan · {mediaCount} media
                            {item.status === "ACTIVE" ? ` · ${draftComplete ? "Lengkap" : "Belum lengkap"}` : ""}
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
                              verificationStatusBadgeVariant(item.verificationStatus),
                            )}
                          >
                            {verificationStatusLabel(item.verificationStatus)}
                          </Badge>
                        </TableCell>
                      )}

                      {isColVisible("waktuMasuk") && (
                        <TableCell className="align-middle text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.reportedAt)}
                        </TableCell>
                      )}

                      <TableCell className="align-middle text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
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
