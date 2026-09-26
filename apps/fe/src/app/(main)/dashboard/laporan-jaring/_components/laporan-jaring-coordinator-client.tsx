"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  ArrowDown,
  ArrowUp,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  ImageIcon,
  Mail,
  MailOpen,
  MapPin,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

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
import { type JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
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
import { exportToExcel } from "@/lib/export/excel-export";
import { cn } from "@/lib/utils";
import {
  SYSTEM_ROLE_HOME_ROUTES,
  SYSTEM_ROLE_LABELS,
  SYSTEM_ROLES,
  type SystemRole,
} from "@/navigation/sidebar/system-roles";

import {
  alignJaringReportCategorySummary,
  formatDateTime,
  formatHierarchyReadStatusBadge,
  formatReportNumber,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./laporan-jaring-presentation";
import { LaporanJaringPreviewModal } from "./laporan-jaring-preview-modal";
import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type VerificationStatus,
} from "./laporan-jaring-types";

const DEFAULT_REPORT_PERIOD_PRESET = "LAST_30_DAYS" as const;

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

type ReportStage = "ALL" | "JARING_REPORT" | "DRAFT_BAKET" | "VALIDATED_BAKET";

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
  const verificationStatus = searchParams.get("verificationStatus");
  return {
    status: verificationStatus && verificationStatus !== "ALL" ? verificationStatus : "ALL",
    stage: "ALL",
  };
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
  { id: "judulIsi", label: "Isi Laporan", alwaysVisible: true },
  { id: "wilayahSumber", label: "Lokasi Aktual Laporan" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan Jaring" },
  { id: "statusDibaca", label: "Status Keterbacaan", alwaysVisible: true },
  { id: "statusProses", label: "Status Proses" },
  { id: "refNum", label: "Nomor Referensi" },
];

export function LaporanJaringCoordinatorClient({ role }: { role?: SystemRole } = {}) {
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
  const router = useRouter();
  const pathname = usePathname();
  const initialReportFilters = resolveInitialReportFilters(searchParams);
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportSummary, setReportSummary] = useState<PaginatedReportResponse["summary"]>();
  const [reportScope, setReportScope] = useState<ReportScopeMetadata | null>(null);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) =>
    visibleColumns[id] ?? LAPORAN_JARING_COLUMNS.find((column) => column.id === id)?.defaultVisible !== false;

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Unread/BARU state untuk Gaswil (cache laporan yang sudah dibaca di localStorage)
  const [readReportIds, setReadReportIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isFieldOfficer) return;
    try {
      const stored = JSON.parse(localStorage.getItem("read_reports_jaring") || "[]");
      setReadReportIds(new Set(stored));
    } catch {
      // Abaikan cache lokal yang tidak valid.
    }
  }, [isFieldOfficer]);

  async function markReportAsRead(reportId: string) {
    if (!reportId) return;
    // Pimpinan/Deputi hanya memantau status; hanya Gaswil atau Korwil yang menandai dibaca
    if (!isFieldOfficer && !isFieldCoordinator) return;
    try {
      const updated = await apiBrowserMutation<JaringReportSessionDetail>(
        "PATCH",
        `/jaring/reports/${reportId}/read`,
      );
      if (updated) {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  ...updated,
                }
              : r,
          ),
        );
        setPreviewReport((prev) =>
          prev && prev.id === reportId
            ? {
                ...prev,
                ...updated,
              }
            : prev,
        );
      }
    } catch {
      // Abaikan kegagalan mutation
    }
    if (isFieldOfficer) {
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

  // Pop-up Preview Modal state
  const [previewReport, setPreviewReport] = useState<JaringReportSessionDetail | null>(null);

  function handleOpenPreview(item: JaringReportSessionDetail) {
    if (isFieldOfficer && !item.gaswilReadAt) {
      void markReportAsRead(item.id);
    } else if (isFieldCoordinator && !item.korwilReadAt) {
      void markReportAsRead(item.id);
    }
    setPreviewReport(item);
  }

  function handleRowClick(e: React.MouseEvent, item: JaringReportSessionDetail) {
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button")) {
      return;
    }
    handleOpenPreview(item);
  }

  // Filters
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>(() => searchParams.get("urgency") || "ALL");
  const [statusFilter, setStatusFilter] = useState<string>(() => initialReportFilters.status);
  const [jaringFilter, setJaringFilter] = useState<string>(() => searchParams.get("jaringId") || "ALL");
  const [provinceFilter, setProvinceFilter] = useState<string>(() => searchParams.get("provinceId") || "ALL");
  const [regencyFilter, setRegencyFilter] = useState<string>(() => searchParams.get("regencyId") || "ALL");
  const [districtFilter, setDistrictFilter] = useState<string>(() => searchParams.get("districtId") || "ALL");
  const [villageFilter, setVillageFilter] = useState<string>(() => searchParams.get("villageId") || "ALL");
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
    searchParams.get("from") || searchParams.get("to") ? "CUSTOM" : DEFAULT_REPORT_PERIOD_PRESET,
  );
  const [startDate, setStartDate] = useState<string>(() => jakartaDateInput(searchParams.get("from")));
  const [endDate, setEndDate] = useState<string>(() => jakartaDateInput(searchParams.get("to")));

  // Pagination & Sorting
  const [page, setPage] = useState(() => {
    const parsed = Number.parseInt(searchParams.get("page") ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  });
  const [limit, setLimit] = useState(12);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => {
    const param = searchParams.get("sortOrder");
    return param === "asc" ? "asc" : "desc";
  });
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
      stage: "ALL",
      sortBy: "reportedAt",
      sortOrder,
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
    const params = new URLSearchParams({
      page: "1",
      limit: "100",
      registrationStatus: "APPROVED",
    });
    if (jaringAreaId) params.set("areaId", jaringAreaId);

    const response = await apiBrowserFetch<PaginatedJaringResponse | RawJaringItem[]>(`/jaring?${params.toString()}`);
    const pageItems = Array.isArray(response) ? response : response.items || [];
    return pageItems;
  }

  async function fetchAreaScopes() {
    return apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
      query: { includeDescendants: true, excludeVillages: true },
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

  // Sinkronkan filter aktif ke URL agar dapat dibagikan/di-bookmark dan selaras dengan drill-down KPI.
  useEffect(() => {
    const params = new URLSearchParams();
    const setParam = (key: string, value: string) => {
      if (value && value !== "ALL") params.set(key, value);
    };
    setParam("search", debouncedSearch);
    setParam("urgency", urgencyFilter);
    setParam("jaringId", jaringFilter);
    setParam("categoryId", categoryFilter);
    setParam("areaId", areaFilter);
    setParam("provinceId", provinceFilter);
    setParam("regencyId", regencyFilter);
    setParam("districtId", districtFilter);
    setParam("villageId", villageFilter);
    setParam("fieldOfficerAssignmentId", fieldOfficerFilter);
    setParam("hasAttachment", attachmentFilter);
    setParam("coordinateSource", coordinateSourceFilter);
    setParam("locationSuitability", locationFilter);
    setParam("verificationStatus", statusFilter);
    if (periodPreset === "CUSTOM") {
      if (startDate) params.set("from", startDate);
      if (endDate) params.set("to", endDate);
    }
    if (sortOrder !== "desc") params.set("sortOrder", sortOrder);
    if (page > 1) params.set("page", String(page));
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [
    debouncedSearch,
    urgencyFilter,
    jaringFilter,
    categoryFilter,
    areaFilter,
    provinceFilter,
    regencyFilter,
    districtFilter,
    villageFilter,
    fieldOfficerFilter,
    attachmentFilter,
    coordinateSourceFilter,
    locationFilter,
    statusFilter,
    periodPreset,
    startDate,
    endDate,
    sortOrder,
    page,
    pathname,
    router,
  ]);

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
    sortOrder,
    page,
    limit,
  ]);

  const kpiSummary = alignJaringReportCategorySummary(reportSummary);
  const reportKpiCards = [
    {
      key: "TOTAL" as const,
      label: "Total Laporan Jaring",
      description: "Seluruh laporan yang masuk sesuai filter aktif",
      count: kpiSummary.totalJaringReports,
      icon: DOMAIN_VISUALS.jaringReport.Icon,
      styles: {
        card: "border-sky-200/80 dark:border-sky-900/30",
        icon: "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
        countText: "text-sky-700 dark:text-sky-400",
      },
    },
    {
      key: "BAKET" as const,
      label: "Laporan Jaring yang Sudah Menjadi Baket",
      description: "Laporan Jaring yang sudah dikonversi menjadi Bahan Keterangan (Baket)",
      count: kpiSummary.baketReports,
      icon: DOMAIN_VISUALS.baket.Icon,
      styles: {
        card: "border-violet-200/80 dark:border-violet-900/30",
        icon: "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
        countText: "text-violet-700 dark:text-violet-400",
      },
    },
    {
      key: "JARING" as const,
      label: "Total Jaring Melaporkan",
      description:
        jaringFilter === "ALL" ? "Jaring unik yang mengirim laporan sesuai filter aktif" : "Jaring pelapor terpilih",
      count: kpiSummary.reportingJaringCount,
      icon: DOMAIN_VISUALS.jaring.Icon,
      styles: {
        card: "border-emerald-200/80 dark:border-emerald-900/30",
        icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        countText: "text-emerald-600 dark:text-emerald-400",
      },
    },
  ];

  const provinceOptions = useMemo(() => {
    return buildProvinceFilterOptions(areaScopes);
  }, [areaScopes]);

  const defaultProvinceFilter = useMemo(() => findDkiJakartaProvinceFilterId(provinceOptions), [provinceOptions]);

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
    if (isNationalRole) {
      didHydrateAreaHierarchy.current = true;
      return;
    }
    if (areaFilter || didHydrateAreaHierarchy.current || !defaultProvinceFilter || provinceFilter !== "ALL") return;

    setProvinceFilter(defaultProvinceFilter);
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPage(1);
    didHydrateAreaHierarchy.current = true;
  }, [areaFilter, defaultProvinceFilter, isNationalRole, provinceFilter]);

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
    setPeriodPreset(DEFAULT_REPORT_PERIOD_PRESET);
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
      const urgencyLabels: Record<string, string> = {
        URGENT: "Mendesak",
        HIGH: "Tinggi",
        NORMAL: "Normal",
        LOW: "Rendah",
      };
      chips.push({
        id: "urgency",
        label: "Urgensi",
        value: urgencyLabels[urgencyFilter] || urgencyFilter,
        onRemove: () => {
          setUrgencyFilter("ALL");
          setPage(1);
        },
      });
    }

    if (statusFilter !== "ALL") {
      const statusLabels: Record<string, string> = {
        UNVERIFIED: "Belum Verifikasi",
        VALID: "Terverifikasi",
        INVALID: "Ditolak / Invalid",
        NEED_CLARIFICATION: "Perlu Klarifikasi",
      };
      chips.push({
        id: "status",
        label: "Status",
        value: statusLabels[statusFilter] || statusFilter,
        onRemove: () => {
          setStatusFilter("ALL");
          setPage(1);
        },
      });
    }

    if (provinceFilter !== (defaultProvinceFilter || "ALL") && provinceFilter !== "ALL") {
      const prov = provinceOptions.find((p) => p.id === provinceFilter);
      chips.push({
        id: "province",
        label: "Provinsi",
        value: prov?.name || provinceFilter,
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
        label: "Kota/Kab",
        value: reg?.name || regencyFilter,
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
        value: dist?.name || districtFilter,
        onRemove: () => {
          setDistrictFilter("ALL");
          setVillageFilter("ALL");
          setPage(1);
        },
      });
    }

    if (villageFilter !== "ALL") {
      const vill = villageOptions.find((v) => v.id === villageFilter);
      chips.push({
        id: "village",
        label: "Kelurahan",
        value: vill?.name || villageFilter,
        onRemove: () => {
          setVillageFilter("ALL");
          setPage(1);
        },
      });
    }

    if (fieldOfficerFilter) {
      const officer = gaswilOptions.find((o) => o.assignmentId === fieldOfficerFilter);
      chips.push({
        id: "officer",
        label: "Gaswil",
        value: officer?.name || fieldOfficerFilter,
        onRemove: () => {
          setFieldOfficerFilter("");
          setPage(1);
        },
      });
    }

    if (jaringFilter !== "ALL") {
      const jaring = popoverJaringOptions.find((j) => j.id === jaringFilter);
      chips.push({
        id: "jaring",
        label: "Jaring",
        value: jaring?.aliasName || jaring?.code || jaringFilter,
        onRemove: () => {
          setJaringFilter("ALL");
          setPage(1);
        },
      });
    }

    if (periodPreset !== DEFAULT_REPORT_PERIOD_PRESET) {
      const periodLabels: Record<string, string> = {
        TODAY: "Hari Ini",
        LAST_7_DAYS: "7 Hari Terakhir",
        LAST_30_DAYS: "30 Hari Terakhir",
        CUSTOM: "Kustom",
      };
      chips.push({
        id: "period",
        label: "Periode",
        value:
          periodPreset === "CUSTOM" && (startDate || endDate)
            ? `${startDate || "..."} s.d ${endDate || "..."}`
            : periodLabels[periodPreset] || periodPreset,
        onRemove: () => {
          setPeriodPreset(DEFAULT_REPORT_PERIOD_PRESET);
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
    statusFilter,
    provinceFilter,
    defaultProvinceFilter,
    provinceOptions,
    regencyFilter,
    regencyOptions,
    districtFilter,
    districtOptions,
    villageFilter,
    villageOptions,
    fieldOfficerFilter,
    gaswilOptions,
    jaringFilter,
    popoverJaringOptions,
    periodPreset,
    startDate,
    endDate,
  ]);

  // Excel (.xlsx) Export
  const handleExportExcel = async () => {
    if (reportTotal === 0 || exporting) return;

    setExporting(true);
    try {
      const exportedReports: JaringReportSessionDetail[] = [];
      const exportLimit = 100;
      let exportPage = 1;
      let totalPages = 1;
      do {
        const response = await apiBrowserFetch<PaginatedReportResponse>("/jaring/reports", {
          query: reportQuery(exportPage, exportLimit),
        });
        exportedReports.push(...(response.items ?? []));
        totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
        exportPage += 1;
      } while (exportPage <= totalPages);

      const headers = [
        "No.",
        "No Ref",
        "Kode Jaring",
        "Nama / Alias Jaring",
        "Kategori",
        "Sorotan Isi Laporan",
        "Urgensi",
        "Status Proses",
        "Wilayah",
        "Petugas Wilayah (Gaswil)",
        "Waktu Pelaporan",
      ];

      const rows = exportedReports.map((r, index) => [
        index + 1,
        r.referenceNumber || r.id,
        r.jaringAlias || r.jaringCode || "-",
        r.jaringFullName || r.jaringAlias || "-",
        r.reportCategory?.name || "-",
        r.displayTitle || r.content || "-",
        r.urgency || "Belum ditentukan",
        verificationStatusLabel(getReportDisplayStatus(r)),
        r.resolvedArea?.name || "-",
        r.gaswilName || "-",
        formatDateTime(r.reportedAt),
      ]);

      const colWidths = [6, 16, 16, 24, 20, 45, 18, 20, 24, 24, 22];

      await exportToExcel({
        filename: `laporan-jaring-${new Date().toISOString().slice(0, 10)}.xlsx`,
        sheetName: "Laporan Jaring",
        headers,
        rows,
        colWidths,
      });

      toast.success(`Berhasil mengekspor ${exportedReports.length} data Laporan Jaring ke Excel (.xlsx)`);
    } catch (error) {
      console.error("Gagal mengekspor laporan jaring:", error);
      toast.error("Gagal mengekspor data Laporan Jaring ke Excel.");
    } finally {
      setExporting(false);
    }
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
          <p className="mt-2 font-medium text-foreground text-sm">{areaSubtitle}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
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
            onClick={() => void handleExportExcel()}
            disabled={reportTotal === 0 || exporting}
            className="h-9 gap-2 border-slate-200 dark:border-white/10"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            {exporting ? "Mengekspor..." : "Ekspor Excel"}
          </Button>
        </div>
      </div>

      {/* KPI ringkasan laporan */}
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

      {/* FILTER & TOOLBAR BAR */}
      <div className="flex flex-col gap-3.5 rounded-md border border-slate-200/80 bg-card p-4 shadow-xs dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-border/70 border-b pb-3">
          <div>
            <p className={cn(DC_TYPOGRAPHY.cardTitle, "flex items-center gap-2")}>
              <SlidersHorizontal className="size-4 text-primary" />
              Filter & Parameter Laporan Jaring
            </p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Saring laporan berdasarkan hierarki wilayah (Provinsi → Kota/Kab → Kecamatan → Kelurahan), Gaswil pembina,
              dan Jaring pelapor.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={activeFilterChips.length > 0 ? "default" : "outline"}
              className={cn(
                "rounded-full font-mono text-[11px]",
                activeFilterChips.length > 0
                  ? "border border-primary/30 bg-primary/15 text-primary"
                  : "text-muted-foreground",
              )}
            >
              {activeFilterChips.length > 0 ? `${activeFilterChips.length} filter aktif` : "Semua data"}
            </Badge>
            {activeFilterChips.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 gap-1 px-2 font-medium text-rose-600 text-xs hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <RotateCcw className="size-3" />
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* BARIS 1: Search Input & Waktu Operasional + View Mode Switcher */}
          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative min-w-[260px] flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari ID laporan, kata kunci, judul, wilayah..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className={cn(
                  DC_CONTROLS.input,
                  "h-9 pl-9 text-xs",
                  search.trim() && "border-primary/45 bg-primary/[0.03]",
                )}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Periode Cepat di Toolbar Atas */}
            <div className="w-full sm:w-[220px]">
              <FilterField
                label="Periode Laporan"
                icon={Clock}
                isActive={periodPreset !== DEFAULT_REPORT_PERIOD_PRESET}
              >
                <NativeSelect
                  aria-label="Filter Periode Waktu"
                  value={periodPreset}
                  onChange={(event) => {
                    setPeriodPreset(event.target.value as typeof periodPreset);
                    setPage(1);
                  }}
                  isActive={periodPreset !== DEFAULT_REPORT_PERIOD_PRESET}
                  className="h-9 w-full text-xs"
                >
                  <option value="TODAY">Hari Ini</option>
                  <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                  <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                  <option value="CUSTOM">Rentang Kustom</option>
                </NativeSelect>
              </FilterField>
            </div>

            {/* View Mode Toggle Switcher & Column Visibility Toggle */}
            <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
              <ColumnVisibilityToggle
                columns={LAPORAN_JARING_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
            </div>
          </div>

          {/* BARIS 2: KELOMPOK HIERARKI WILAYAH LAPORAN */}
          <div className="space-y-2.5 rounded-md border border-slate-200/80 bg-muted/15 p-3.5 dark:border-white/10 dark:bg-muted/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
                <MapPin className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">Hierarki Wilayah Aktual</span>
                <span className="hidden text-muted-foreground sm:inline">
                  (Provinsi → Kota/Kab → Kecamatan → Kelurahan)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Filter Provinsi */}
              {isNationalRole && (
                <FilterField label="Provinsi" icon={MapPin} isActive={provinceFilter !== "ALL"}>
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
                    placeholder={provinceOptions.length === 0 ? "Memuat Provinsi..." : "Semua Provinsi"}
                    disabled={provinceOptions.length === 0}
                    searchPlaceholder="Cari Provinsi..."
                    emptyText="Provinsi tidak ditemukan."
                    className="h-9 w-full"
                  />
                </FilterField>
              )}

              {/* Filter Kota/Kabupaten */}
              {!isFieldOfficer && !isFieldCoordinator && (
                <FilterField label="Kota / Kabupaten" icon={MapPin} isActive={regencyFilter !== "ALL"}>
                  <SearchableSelect
                    aria-label="Filter Kota/Kabupaten"
                    value={regencyFilter}
                    options={[
                      {
                        value: "ALL",
                        label:
                          provinceFilter === "ALL"
                            ? "Pilih Provinsi dahulu"
                            : isDkiScoped
                              ? "Semua Kota/Kabupaten DKI"
                              : "Semua Kota/Kabupaten",
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
                    disabled={provinceFilter === "ALL" || regencyOptions.length === 0}
                    placeholder={
                      provinceFilter === "ALL"
                        ? "Pilih Provinsi dahulu"
                        : regencyOptions.length === 0
                          ? "Memuat Kota/Kab..."
                          : isDkiScoped
                            ? "Semua Kota/Kabupaten DKI"
                            : "Semua Kota/Kabupaten"
                    }
                    searchPlaceholder="Cari Kota/Kabupaten..."
                    emptyText="Kota/Kabupaten tidak ditemukan."
                    className="h-9 w-full"
                  />
                </FilterField>
              )}

              {/* Filter Kecamatan */}
              {!isFieldOfficer && (
                <FilterField label="Kecamatan" icon={MapPin} isActive={districtFilter !== "ALL"}>
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

              {/* Filter Kelurahan/Desa */}
              <FilterField label="Kelurahan / Desa" icon={MapPin} isActive={villageFilter !== "ALL"}>
                <NativeSelect
                  aria-label="Filter Kelurahan atau Desa"
                  value={villageFilter}
                  onChange={(event) => {
                    setVillageFilter(event.target.value);
                    setPage(1);
                  }}
                  disabled={!isFieldOfficer && districtFilter === "ALL"}
                  isActive={villageFilter !== "ALL"}
                  className="h-9 w-full text-xs"
                >
                  <option value="ALL">
                    {!isFieldOfficer && districtFilter === "ALL" ? "Pilih Kecamatan dahulu" : "Semua Kelurahan"}
                  </option>
                  {villageOptions.map((village) => (
                    <option key={village.id} value={village.id}>
                      {village.name}
                      {!isFieldOfficer && districtFilter === "ALL" && village.districtName
                        ? ` - ${village.districtName}`
                        : ""}
                    </option>
                  ))}
                </NativeSelect>
              </FilterField>
            </div>
          </div>

          {/* BARIS 3: KELOMPOK PELAPOR & PEMBINA LAPANGAN */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Filter Petugas Wilayah (Gaswil) */}
            {!isFieldOfficer && (
              <FilterField label="Petugas Wilayah (Gaswil)" icon={User} isActive={Boolean(fieldOfficerFilter)}>
                <SearchableSelect
                  aria-label="Filter Petugas Wilayah (Gaswil)"
                  value={fieldOfficerFilter || "ALL"}
                  options={[
                    { value: "ALL", label: "Semua Gaswil" },
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
                  placeholder={gaswilOptions.length === 0 ? "Petugas Wilayah belum tersedia" : "Semua Gaswil"}
                  searchPlaceholder="Cari Petugas Wilayah (Gaswil)..."
                  emptyText="Petugas Wilayah (Gaswil) tidak ditemukan."
                  className="h-9 w-full"
                />
              </FilterField>
            )}

            {/* Jaring Filter Popover */}
            <FilterField label="Jaring Pelapor" icon={Users} isActive={jaringFilter !== "ALL"}>
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
                  className="h-9 w-full text-xs"
                />
              </div>
            </FilterField>
          </div>

          {/* CUSTOM PERIOD DATE RANGE */}
          {periodPreset === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 border-dashed bg-primary/[0.02] p-3 text-xs">
              <span className="flex items-center gap-1.5 font-mono font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                <Calendar className="size-3.5 text-primary" />
                Rentang Tanggal Kustom:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Dari:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className={cn(DC_CONTROLS.input, "h-8 w-[145px] px-2 text-xs")}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">s.d:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className={cn(DC_CONTROLS.input, "h-8 w-[145px] px-2 text-xs")}
                />
              </div>
            </div>
          )}

          {/* ACTIVE FILTER CHIPS ROW */}
          <ActiveFilterChips chips={activeFilterChips} onResetAll={handleResetFilters} />
        </div>
      </div>

      {/* DATA CONTENT (CARD VIEW VS TABLE VIEW) */}
      {loadingList ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-slate-200 bg-card p-12 text-center dark:border-white/10">
          <RefreshCw className="mb-3 size-8 animate-spin text-emerald-500" />
          <p className="font-medium text-muted-foreground text-sm">Memuat data laporan Jaring...</p>
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
          <DOMAIN_VISUALS.jaringReport.Icon className="mb-3 size-10 text-muted-foreground/50" />
          <p className="font-semibold text-base text-foreground">Tidak ada laporan ditemukan</p>
          <p className="mt-1 max-w-md text-muted-foreground text-xs">
            Cobalah untuk memuat ulang data atau sesuaikan filter pencarian Anda.
          </p>
          <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-4 text-xs">
            Reset Semua Filter
          </Button>
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW LAYOUT (MATCHING REFERENCE IMAGE) */
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              const isUnread = isFieldOfficer && !readReportIds.has(item.id);
              const rawTitle = (item.displayTitle || "").replace(/[….\s]+$/, "").trim().toLowerCase();
              const rawContent = (item.content || "").trim().toLowerCase();
              const isDerivedTitle = !item.displayTitle || (rawTitle.length > 0 && rawContent.startsWith(rawTitle));
              const title = item.displayTitle || item.content || "Laporan sedang dibuat";
              const mediaCount = item.media?.length || item.counts?.media || 0;
              const partsCount = item.messages?.length || item.counts?.contentParts || 0;
              const locationName = formatFullAreaName(item.resolvedArea);

              return (
                <div
                  key={item.id}
                  onClick={(e) => handleRowClick(e, item)}
                  className={cn(
                    "flex flex-col justify-between rounded-md border bg-card p-4 transition-all duration-200 hover:scale-[1.01] cursor-pointer hover:shadow-md",
                    hasBaketUrgency ? urgencyStyle.border : "border-border",
                  )}
                >
                  {/* Card Header */}
                  <div className="space-y-2.5">
                    {/* Baris 1: Nomor Referensi & Urgensi di Kiri, Status Proses di Kanan */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="shrink-0 rounded bg-slate-100 dark:bg-white/10 px-2 py-0.5 font-bold font-mono text-[11px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                          {refNum}
                        </span>
                        {hasBaketUrgency ? (
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 font-extrabold text-[9px] uppercase tracking-wider", urgencyStyle.badge)}
                          >
                            {urgencyStyle.label}
                          </Badge>
                        ) : null}
                        {isUnread ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 h-4 border-amber-500/40 bg-amber-500/10 px-1 py-0 font-mono font-semibold text-[9px] text-amber-600 dark:text-amber-400"
                          >
                            BARU
                          </Badge>
                        ) : null}
                      </div>

                      {/* Status Proses (SIAP DIBUAT BAKET, dll) */}
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 px-2 py-0.5 font-semibold text-[10px] tracking-wide uppercase whitespace-nowrap",
                          verificationStatusBadgeVariant(displayStatus),
                        )}
                      >
                        {verificationStatusLabel(displayStatus)}
                      </Badge>
                    </div>

                    {/* Baris 2: Status Keterbacaan Hierarki (Gaswil & Korwil) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors",
                          item.gaswilReadAt
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        )}
                        title={
                          item.gaswilReadAt
                            ? `Gaswil sudah membaca: ${item.gaswilReadByName || item.gaswilName || ""} (${formatDateTime(item.gaswilReadAt)})`
                            : `Belum dibaca Petugas Wilayah: ${item.gaswilName || "Belum ditetapkan"}`
                        }
                      >
                        {item.gaswilReadAt ? <MailOpen className="size-3 shrink-0" /> : <Mail className="size-3 shrink-0" />}
                        <span>
                          {formatHierarchyReadStatusBadge("Gaswil", {
                            readAt: item.gaswilReadAt,
                            readByName: item.gaswilReadByName,
                            officerName: item.gaswilName,
                          })}
                        </span>
                      </Badge>

                      <Badge
                        variant="outline"
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium transition-colors",
                          item.korwilReadAt
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
                        )}
                        title={
                          item.korwilReadAt
                            ? `Korwil sudah membaca: ${item.korwilReadByName || item.korwilName || ""} (${formatDateTime(item.korwilReadAt)})`
                            : `Belum dibaca Koordinator Wilayah: ${item.korwilName || "Belum ditetapkan"}`
                        }
                      >
                        {item.korwilReadAt ? <MailOpen className="size-3 shrink-0" /> : <Mail className="size-3 shrink-0" />}
                        <span>
                          {formatHierarchyReadStatusBadge("Korwil", {
                            readAt: item.korwilReadAt,
                            readByName: item.korwilReadByName,
                            officerName: item.korwilName,
                          })}
                        </span>
                      </Badge>
                    </div>

                    {/* Cuplikan Konten / Isi Laporan */}
                    <div className="pt-0.5">
                      {isDerivedTitle ? (
                        <p className="line-clamp-3 text-xs leading-relaxed text-foreground/90 font-normal">
                          {item.content || title}
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <h3 className="line-clamp-1 font-semibold text-sm text-foreground leading-snug">
                            {title}
                          </h3>
                          {item.content ? (
                            <p className="line-clamp-2 text-muted-foreground text-xs leading-relaxed">
                              {item.content}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Identitas Jaring Card */}
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
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
                          korwilName: item.korwilName,
                          korwilAssignmentId: item.korwilAssignmentId,
                          korwilUserProfileId: item.korwilUserProfileId,
                          placementArea: item.placementArea,
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Footer Info & Actions */}
                  <div className="mt-3.5 space-y-2.5 border-slate-100 border-t pt-3 dark:border-white/10">
                    {/* Metadata indicators row */}
                    <div className="flex items-center justify-between text-muted-foreground text-xs">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-[11px] font-medium">
                          <MessageSquare className="size-3 text-sky-500" /> {partsCount} pesan
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-medium">
                          <ImageIcon className="size-3 text-amber-500" /> {mediaCount} foto
                        </span>
                      </div>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                        <Clock className="size-3 text-muted-foreground" /> {formatDateTime(item.reportedAt)}
                      </span>
                    </div>

                    {locationName && locationName !== "-" ? (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="size-3 shrink-0 text-emerald-500" />
                        <span className="truncate" title={locationName}>{locationName}</span>
                      </div>
                    ) : null}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPreview(item);
                        }}
                        className="h-9 flex-1 gap-1.5 border-emerald-500/40 font-bold text-emerald-600 text-xs uppercase tracking-wider transition-colors hover:bg-emerald-500/10 hover:text-emerald-500 dark:text-emerald-400"
                      >
                        <Eye className="size-3.5" /> Lihat Detail
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isFieldOfficer && !item.gaswilReadAt) void markReportAsRead(item.id);
                          else if (isFieldCoordinator && !item.korwilReadAt) void markReportAsRead(item.id);
                        }}
                        title="Buka di tab baru"
                        className="h-9 w-9 shrink-0 border-slate-300 text-muted-foreground hover:text-foreground dark:border-slate-700"
                      >
                        <Link href={`/dashboard/laporan-jaring/${item.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5" />
                          <span className="sr-only">Buka di tab baru</span>
                        </Link>
                      </Button>
                    </div>
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
                <TableRow className="border-slate-200 border-b dark:border-slate-800">
                  {isColVisible("waktuMasuk") && (
                    <TableHead className="whitespace-nowrap font-bold text-xs uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => {
                          setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
                          setPage(1);
                        }}
                        className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground cursor-pointer group"
                        title="Klik untuk mengubah urutan waktu masuk (Terbaru / Terlama)"
                      >
                        <span>Waktu Masuk</span>
                        {sortOrder === "desc" ? (
                          <ArrowDown className="size-3.5 text-sky-500" />
                        ) : (
                          <ArrowUp className="size-3.5 text-sky-500" />
                        )}
                      </button>
                    </TableHead>
                  )}
                  {isColVisible("foto") && (
                    <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider">Foto</TableHead>
                  )}
                  {isColVisible("namaJaring") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Nama Jaring</TableHead>
                  )}
                  {isColVisible("kodeJaring") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Kode Jaring</TableHead>
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
                    <TableHead className="min-w-[260px] max-w-[460px] font-bold text-xs uppercase tracking-wider">
                      Isi Laporan
                    </TableHead>
                  )}
                  {isColVisible("wilayahSumber") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Lokasi Aktual Laporan</TableHead>
                  )}
                  {isColVisible("wilayahPenempatan") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      Wilayah Penempatan Jaring
                    </TableHead>
                  )}
                  {isColVisible("statusDibaca") && (
                    <TableHead className="text-center whitespace-nowrap font-bold text-xs uppercase tracking-wider">
                      <span className="inline-flex items-center justify-center gap-1.5">
                        <Mail className="size-3.5 text-muted-foreground" />
                        Status Keterbacaan
                      </span>
                    </TableHead>
                  )}
                  {isColVisible("statusProses") && (
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                      Status Proses
                    </TableHead>
                  )}
                  {isColVisible("refNum") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Nomor Referensi</TableHead>
                  )}
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((item) => {
                  const _urgencyStyle = getUrgencyCardStyle(item.urgency);
                  const displayStatus = getReportDisplayStatus(item);
                  const refNum = item.referenceNumber || item.jaringAlias || item.jaringCode || item.id.slice(0, 8);
                  const isUnread = isFieldOfficer && !readReportIds.has(item.id);
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
                      onClick={(e) => handleRowClick(e, item)}
                      className="cursor-pointer border-slate-100 border-b hover:bg-slate-50/80 dark:border-slate-800 dark:hover:bg-white/10 transition-colors"
                    >
                      {isColVisible("waktuMasuk") && (
                        <TableCell className="whitespace-nowrap align-middle font-mono text-muted-foreground text-xs">
                          {formatDateTime(item.reportedAt)}
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
                        <TableCell className="min-w-[260px] max-w-[460px] align-middle">
                          {item.displayTitle && item.displayTitle !== item.content ? (
                            <p className="line-clamp-1 font-semibold text-foreground text-xs">
                              {item.displayTitle}
                            </p>
                          ) : null}
                          <p
                            className={cn(
                              "text-xs leading-relaxed text-slate-800 dark:text-slate-200 line-clamp-4 whitespace-pre-wrap",
                              item.displayTitle && item.displayTitle !== item.content ? "mt-1 text-[11px]" : "",
                            )}
                          >
                            {item.content || "Laporan sedang dibuat"}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="inline-flex items-center gap-1 font-medium">
                              <MessageSquare className="size-3 text-sky-500" /> {messageCount} pesan
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 font-medium">
                              <ImageIcon className="size-3 text-amber-500" /> {mediaCount} media
                            </span>
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("wilayahSumber") && (
                        <TableCell className="align-middle font-mono text-foreground text-xs">
                          {formatFullAreaName(item.resolvedArea)}
                        </TableCell>
                      )}

                      {isColVisible("wilayahPenempatan") && (
                        <TableCell className="align-middle font-mono text-foreground text-xs">
                          {identity.placementArea}
                        </TableCell>
                      )}

                      {isColVisible("statusDibaca") && (
                        <TableCell className="align-middle">
                          <div className="flex flex-col gap-2 min-w-[155px]">
                            {/* Status Gaswil */}
                            <div className="flex flex-col gap-0.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold w-fit",
                                  item.gaswilReadAt
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                )}
                                title={
                                  item.gaswilReadAt
                                    ? `Gaswil sudah membaca: ${item.gaswilReadByName || item.gaswilName || ""} (${formatDateTime(item.gaswilReadAt)})`
                                    : `Belum dibaca Petugas Wilayah: ${item.gaswilName || "Belum ditetapkan"}`
                                }
                              >
                                {item.gaswilReadAt ? (
                                  <MailOpen className="size-3 shrink-0" />
                                ) : (
                                  <Mail className="size-3 shrink-0" />
                                )}
                                <span>Gaswil: {item.gaswilReadAt ? "Sudah Dibaca" : "Belum Dibaca"}</span>
                              </Badge>
                              {item.gaswilReadAt ? (
                                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap pl-0.5">
                                  {formatDateTime(item.gaswilReadAt)}
                                  {` (${item.gaswilReadByName || item.gaswilName || "Gaswil"})`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap pl-0.5">
                                  Gaswil: {item.gaswilName || "Belum ditetapkan"}
                                </span>
                              )}
                            </div>

                            {/* Status Korwil */}
                            <div className="flex flex-col gap-0.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold w-fit",
                                  item.korwilReadAt
                                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400",
                                )}
                                title={
                                  item.korwilReadAt
                                    ? `Korwil sudah membaca: ${item.korwilReadByName || item.korwilName || ""} (${formatDateTime(item.korwilReadAt)})`
                                    : `Belum dibaca Koordinator Wilayah: ${item.korwilName || "Belum ditetapkan"}`
                                }
                              >
                                {item.korwilReadAt ? (
                                  <MailOpen className="size-3 shrink-0" />
                                ) : (
                                  <Mail className="size-3 shrink-0" />
                                )}
                                <span>Korwil: {item.korwilReadAt ? "Sudah Dibaca" : "Belum Dibaca"}</span>
                              </Badge>
                              {item.korwilReadAt ? (
                                <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap pl-0.5">
                                  {formatDateTime(item.korwilReadAt)}
                                  {` (${item.korwilReadByName || item.korwilName || "Korwil"})`}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap pl-0.5">
                                  Korwil: {item.korwilName || "Belum ditetapkan"}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      )}

                      {isColVisible("statusProses") && (
                        <TableCell className="text-center align-middle">
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-2 py-0.5 font-medium text-[10px]",
                              verificationStatusBadgeVariant(displayStatus),
                            )}
                          >
                            {verificationStatusLabel(displayStatus)}
                          </Badge>
                        </TableCell>
                      )}

                      {isColVisible("refNum") && (
                        <TableCell className="align-middle font-medium font-mono text-foreground text-xs">
                          <div className="flex items-center gap-1.5">
                            <span>{refNum}</span>
                            {isUnread ? (
                              <Badge
                                variant="outline"
                                className="h-4 border-amber-500/40 bg-amber-500/10 px-1 py-0 font-mono font-semibold text-[9px] text-amber-600 dark:text-amber-400"
                              >
                                BARU
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                      )}

                      <TableCell className="text-right align-middle whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPreview(item);
                            }}
                            className="h-8 gap-1.5 rounded-md border-sky-500/30 px-2.5 font-medium text-sky-600 text-xs hover:bg-sky-500/10 dark:text-sky-400"
                          >
                            <Eye className="size-3.5" /> Detail
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.status === "SUBMITTED" && !item.isRead) void markReportAsRead(item.id);
                            }}
                            title="Buka di tab baru"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Link
                              href={`/dashboard/laporan-jaring/${item.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="size-3.5" />
                              <span className="sr-only">Buka di tab baru</span>
                            </Link>
                          </Button>
                        </div>
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

      {/* Pop-up Preview Modal */}
      <LaporanJaringPreviewModal
        report={previewReport}
        open={Boolean(previewReport)}
        onOpenChange={(open) => {
          if (!open) setPreviewReport(null);
        }}
      />
    </main>
  );
}
