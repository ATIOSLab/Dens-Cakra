"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowDown,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  ImageIcon,
  Mail,
  MailOpen,
  MapPin,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type VerificationStatus,
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
    case "IN_PROGRESS_BY_JARING":
    case "NOT_SUBMITTED":
      return "Sedang disusun Jaring";
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Belum Diverifikasi";
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
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-[#38BDF8]";
    case "METADATA_RECORDED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400";
  }
}

function getUrgencyCardStyle(urgency?: PriorityLevel | null) {
  switch (urgency) {
    case "URGENT":
      return {
        border: "border-rose-500/70 dark:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50",
        label: "URGENT",
      };
    case "HIGH":
      return {
        border: "border-amber-500/70 dark:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50",
        label: "HIGH",
      };
    case "NORMAL":
      return {
        border: "border-emerald-500/50 dark:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        label: "NORMAL",
      };
    case "LOW":
      return {
        border: "border-sky-500/50 dark:border-sky-500/60 shadow-[0_0_10px_rgba(14,165,233,0.1)]",
        badge: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
        label: "LOW",
      };
    default:
      return {
        border: "border-slate-300 dark:border-slate-800",
        badge: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40",
        label: "NORMAL",
      };
  }
}

interface RawJaringItem {
  id: string;
  aliasName?: string | null;
  fullName?: string | null;
  registrationStatus?: string | null;
  areaCoverages?: Array<{
    isPrimary?: boolean;
    validUntil?: string | null;
    area: JaringAdministrativeArea;
  }>;
}

interface JaringAdministrativeArea {
  id: string;
  name: string;
  level: string;
  parent?: JaringAdministrativeArea | null;
}

type JaringGeography = {
  regencyId: string | null;
  regencyName: string | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
};

type PaginatedReportResponse = {
  items?: JaringReportSessionDetail[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
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

function isVerifiedReport(status: VerificationStatus) {
  return status === "VERIFIED_BY_FIELD_OFFICER" || status === "METADATA_RECORDED";
}

function isReadByFieldOfficer(report: JaringReportSessionDetail) {
  return report.isReadByFieldOfficer ?? report.isRead ?? Boolean(report.fieldOfficerReadAt ?? report.readAt);
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

function resolveJaringGeography(jaring: RawJaringItem): JaringGeography {
  const coverages = jaring.areaCoverages?.filter((coverage) => !coverage.validUntil) ?? [];
  const coverage = coverages.find((item) => item.isPrimary) ?? coverages[0];
  let area: JaringAdministrativeArea | null = coverage?.area ?? null;
  let regency: JaringAdministrativeArea | null = null;
  let district: JaringAdministrativeArea | null = null;
  let village: JaringAdministrativeArea | null = null;

  while (area) {
    if (isRegencyLevel(area.level)) regency = area;
    if (area.level === "DISTRICT") district = area;
    if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE") village = area;
    area = area.parent ?? null;
  }

  return {
    regencyId: regency?.id ?? null,
    regencyName: regency?.name ?? null,
    districtId: district?.id ?? null,
    districtName: district?.name ?? null,
    villageId: village?.id ?? null,
    villageName: village?.name ?? null,
  };
}

export function LaporanJaringCoordinatorClient() {
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [readFilter, setReadFilter] = useState<"ALL" | "READ" | "UNREAD">("ALL");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [periodPreset, setPeriodPreset] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const listRequestInFlight = useRef(false);

  // Fetch reports and Jarings
  async function fetchAllReportPages() {
    const allReports: JaringReportSessionDetail[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await apiBrowserFetch<PaginatedReportResponse | JaringReportSessionDetail[]>(
        `/jaring/reports?page=${currentPage}&limit=100`,
      );
      const pageItems = Array.isArray(response) ? response : response.items || [];
      allReports.push(...pageItems);
      if (Array.isArray(response)) {
        totalPages = pageItems.length < 100 ? currentPage : currentPage + 1;
      } else {
        totalPages = Math.max(1, response.pagination?.totalPages ?? 1);
      }
      currentPage += 1;
    } while (currentPage <= totalPages);

    return Array.from(new Map(allReports.map((report) => [report.id, report])).values());
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

  async function fetchAllData(silent = false) {
    if (listRequestInFlight.current) return;
    listRequestInFlight.current = true;
    if (!silent) setLoadingList(true);
    setLoadError(null);
    try {
      const [reportItems, jaringItems, areaScopeItems] = await Promise.all([
        fetchAllReportPages(),
        fetchAllJaringPages(),
        fetchAreaScopes(),
      ]);

      setReports(reportItems);
      setJaringList(jaringItems);
      setAreaScopes(areaScopeItems);
    } catch (err) {
      console.error("Gagal memuat laporan jaring (field-coordinator):", err);
      setLoadError(err instanceof Error ? err.message : "Daftar laporan Jaring gagal dimuat.");
    } finally {
      listRequestInFlight.current = false;
      if (!silent) setLoadingList(false);
    }
  }

  useEffect(() => {
    void fetchAllData();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void fetchAllData(true);
    }, 5_000);
    return () => window.clearInterval(interval);
  }, []);

  const kpiSummary = useMemo(() => {
    const activeReports = reports.filter((item) => item.verificationStatus !== "METADATA_RECORDED");
    const total = activeReports.length;
    const unverified = activeReports.filter((item) => !isVerifiedReport(item.verificationStatus)).length;
    const verified = activeReports.filter((item) => item.verificationStatus === "VERIFIED_BY_FIELD_OFFICER").length;
    const unread = activeReports.filter((item) => !isReadByFieldOfficer(item)).length;

    return { total, unverified, verified, unread };
  }, [reports]);

  const statusKpiCards = [
    {
      key: "TOTAL" as const,
      label: "TOTAL",
      description: "Total Laporan Jaring",
      count: kpiSummary.total,
      icon: FileText,
      isActive: statusFilter === "ALL" && readFilter === "ALL",
      onClick: () => {
        setStatusFilter("ALL");
        setReadFilter("ALL");
        setPage(1);
      },
      styles: {
        activeCard: "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 ring-2 ring-sky-500/40 shadow-sm shadow-sky-500/10",
        inactiveCard: "border-sky-200/80 dark:border-sky-900/30 bg-card hover:border-sky-300 dark:hover:border-sky-800 hover:bg-sky-50/30 dark:hover:bg-sky-950/20",
        activeBadge: "bg-sky-600 text-white border-sky-600 font-semibold shadow-xs",
        inactiveBadge: "border-sky-200 bg-sky-100/80 text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/50 dark:text-sky-400",
        activeIcon: "bg-sky-600 text-white shadow-md shadow-sky-500/30",
        inactiveIcon: "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
        countText: "text-sky-700 dark:text-sky-400",
      },
    },
    {
      key: "UNVERIFIED" as const,
      label: "PENDING",
      description: "Belum Diverifikasi",
      count: kpiSummary.unverified,
      icon: Clock,
      isActive: statusFilter === "UNVERIFIED",
      onClick: () => {
        setStatusFilter("UNVERIFIED");
        setReadFilter("ALL");
        setPage(1);
      },
      styles: {
        activeCard: "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/40 shadow-sm shadow-amber-500/10",
        inactiveCard: "border-amber-200/80 dark:border-amber-900/30 bg-card hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
        activeBadge: "bg-amber-600 text-white border-amber-600 font-semibold shadow-xs",
        inactiveBadge: "border-amber-200 bg-amber-100/80 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-400",
        activeIcon: "bg-amber-600 text-white shadow-md shadow-amber-500/30",
        inactiveIcon: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
        countText: "text-amber-700 dark:text-amber-400",
      },
    },
    {
      key: "VERIFIED" as const,
      label: "VERIFIED",
      description: "Terverifikasi",
      count: kpiSummary.verified,
      icon: CheckCircle2,
      isActive: statusFilter === "VERIFIED_BY_FIELD_OFFICER",
      onClick: () => {
        setStatusFilter("VERIFIED_BY_FIELD_OFFICER");
        setReadFilter("ALL");
        setPage(1);
      },
      styles: {
        activeCard: "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-sm shadow-emerald-500/10",
        inactiveCard: "border-emerald-200/80 dark:border-emerald-900/30 bg-card hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20",
        activeBadge: "bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs",
        inactiveBadge: "border-emerald-200 bg-emerald-100/80 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-400",
        activeIcon: "bg-emerald-600 text-white shadow-md shadow-emerald-500/30",
        inactiveIcon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
        countText: "text-emerald-700 dark:text-emerald-400",
      },
    },
    {
      key: "UNREAD" as const,
      label: "UNREAD",
      description: "Belum Dibaca",
      count: kpiSummary.unread,
      icon: Mail,
      isActive: readFilter === "UNREAD",
      onClick: () => {
        setReadFilter("UNREAD");
        setStatusFilter("ALL");
        setPage(1);
      },
      styles: {
        activeCard: "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/40 shadow-sm shadow-rose-500/10",
        inactiveCard: "border-rose-200/80 dark:border-rose-900/30 bg-card hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50/30 dark:hover:bg-rose-950/20",
        activeBadge: "bg-rose-600 text-white border-rose-600 font-semibold shadow-xs",
        inactiveBadge: "border-rose-200 bg-rose-100/80 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-400",
        activeIcon: "bg-rose-600 text-white shadow-md shadow-rose-500/30",
        inactiveIcon: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
        countText: "text-rose-700 dark:text-rose-400",
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

  const jaringGeographyById = useMemo(() => {
    return new globalThis.Map(jaringList.map((jaring) => [jaring.id, resolveJaringGeography(jaring)]));
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

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // Exclude Baket (METADATA_RECORDED) reports from Laporan Jaring
      if (item.verificationStatus === "METADATA_RECORDED") return false;

      // Urgency filter
      if (urgencyFilter !== "ALL") {
        if (!isVerifiedReport(item.verificationStatus) || item.urgency !== urgencyFilter) return false;
      }

      // Status filter
      if (statusFilter !== "ALL") {
        if (statusFilter === "UNVERIFIED") {
          if (isVerifiedReport(item.verificationStatus)) return false;
        } else if (item.verificationStatus !== statusFilter) {
          return false;
        }
      }

      if (readFilter !== "ALL") {
        const hasBeenRead = isReadByFieldOfficer(item);
        if (readFilter === "READ" ? !hasBeenRead : hasBeenRead) return false;
      }

      // Jaring filter
      if (jaringFilter !== "ALL") {
        const match =
          item.jaringId === jaringFilter || item.jaringCode === jaringFilter || item.jaringAlias === jaringFilter;
        if (!match) return false;
      }

      const geography = jaringGeographyById.get(item.jaringId);
      if (regencyFilter !== "ALL") {
        let itemRegencyId = geography?.regencyId;
        if (!itemRegencyId) {
          let currentArea: any = item.resolvedArea;
          while (currentArea) {
            if (isRegencyLevel(currentArea.level || "")) {
              itemRegencyId = currentArea.id;
              break;
            }
            currentArea = currentArea.parent;
          }
        }
        if (itemRegencyId !== regencyFilter) return false;
      }
      if (districtFilter !== "ALL" && geography?.districtId !== districtFilter) return false;
      if (villageFilter !== "ALL" && geography?.villageId !== villageFilter) return false;

      // Date / Period Filter
      const reportDateStr = item.reportedAt || item.submittedAt || item.createdAt;
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
        const title = (item.displayTitle || "").toLowerCase();
        const content = (item.content || "").toLowerCase();
        const jAlias = (item.jaringAlias || "").toLowerCase();
        const jCode = (item.jaringCode || "").toLowerCase();
        const area = (item.resolvedArea?.name || "").toLowerCase();

        return (
          ref.includes(q) ||
          title.includes(q) ||
          content.includes(q) ||
          jAlias.includes(q) ||
          jCode.includes(q) ||
          area.includes(q)
        );
      }

      return true;
    });
  }, [
    reports,
    urgencyFilter,
    statusFilter,
    readFilter,
    jaringFilter,
    regencyFilter,
    districtFilter,
    villageFilter,
    periodPreset,
    startDate,
    endDate,
    search,
    jaringGeographyById,
  ]);

  // Paginated items
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  // Quick Date presets
  const handleQuickToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    setStartDate(today);
    setEndDate(today);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setUrgencyFilter("ALL");
    setStatusFilter("ALL");
    setReadFilter("ALL");
    setJaringFilter("ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredReports.length === 0) return;

    const headers = [
      "No Ref",
      "Sandi Jaring",
      "Sorotan Isi",
      "Urgensi",
      "Status Verifikasi",
      "Wilayah",
      "Waktu Pelaporan",
      "Waktu Pelaporan (Status)",
    ];

    const rows = filteredReports.map((r) => [
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
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto transition-colors duration-150">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-coordinator">Field Coordinator</BreadcrumbLink>
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
            onClick={() => void fetchAllData()}
            disabled={loadingList}
            className="h-9 gap-2"
          >
            <RefreshCw className={cn("size-4 text-emerald-500 dark:text-emerald-400", loadingList && "animate-spin")} />
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
                  setStatusFilter("ALL");
                  setReadFilter("ALL");
                  setPage(1);
                } else {
                  item.onClick();
                }
              }}
              className={cn(
                "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer",
                isActive ? item.styles.activeCard : item.styles.inactiveCard
              )}
            >
              <div className="flex flex-col gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "w-fit uppercase tracking-wider text-[10px] px-2 py-0.5 font-semibold",
                    isActive ? item.styles.activeBadge : item.styles.inactiveBadge
                  )}
                >
                  {item.label}
                </Badge>
                <div>
                  <p className={cn("text-3xl font-extrabold tracking-tight transition-colors", isActive ? item.styles.countText : "text-foreground")}>
                    {item.count}
                  </p>
                  <p className="text-xs text-muted-foreground font-medium">{item.description}</p>
                </div>
              </div>
              <div
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                  isActive ? item.styles.activeIcon : item.styles.inactiveIcon
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

            {/* View Mode Toggle Switcher */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
            </div>
          </div>

          {/* MIDDLE ROW: Structured Grid of Filter Dropdowns */}
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", regencyOptions.length > 0 ? "md:grid-cols-4 xl:grid-cols-7" : "md:grid-cols-3 xl:grid-cols-6")}>
            {/* 1. Urgensi Filter */}
            <NativeSelect
              aria-label="Filter Urgensi"
              value={urgencyFilter}
              onChange={(e) => {
                setUrgencyFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Urgensi</option>
              <option value="URGENT">URGENT</option>
              <option value="HIGH">HIGH</option>
              <option value="NORMAL">NORMAL</option>
              <option value="LOW">LOW</option>
            </NativeSelect>

            {/* 2. Status Verifikasi Filter */}
            <NativeSelect
              aria-label="Filter Status Verifikasi"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Status</option>
              <option value="UNVERIFIED">Belum Diverifikasi</option>
              <option value="WAITING_FIELD_OFFICER_VERIFICATION">Belum Terverifikasi Petugas</option>
              <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi</option>
            </NativeSelect>

            {/* 3. Status Baca Filter */}
            <NativeSelect
              aria-label="Filter Status Baca"
              value={readFilter}
              onChange={(event) => {
                setReadFilter(event.target.value as "ALL" | "READ" | "UNREAD");
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Status Baca</option>
              <option value="UNREAD">Belum Dibaca Petugas</option>
              <option value="READ">Sudah Dibaca Petugas</option>
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
                <option value="ALL">Semua Kota/Kab</option>
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
          readFilter !== "ALL" ||
          jaringFilter !== "ALL" ||
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
                statusFilter !== "ALL" ||
                readFilter !== "ALL" ||
                jaringFilter !== "ALL" ||
                regencyFilter !== "ALL" ||
                districtFilter !== "ALL" ||
                villageFilter !== "ALL" ||
                periodPreset !== "ALL" ||
                startDate ||
                endDate) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setUrgencyFilter("ALL");
                    setStatusFilter("ALL");
                    setReadFilter("ALL");
                    setJaringFilter("ALL");
                    setRegencyFilter("ALL");
                    setDistrictFilter("ALL");
                    setVillageFilter("ALL");
                    setPeriodPreset("ALL");
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
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
            <Button variant="outline" size="sm" onClick={() => void fetchAllData()}>
              <RefreshCw data-icon="inline-start" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
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
              const hasBeenRead = isReadByFieldOfficer(item);
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
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {formatDateTime(item.reportedAt)}
                      </span>
                      <span className="font-semibold text-foreground/80">
                        Jaring: {item.jaringAlias || item.jaringCode || "-"}
                      </span>
                    </div>

                    <Badge variant={hasBeenRead ? "secondary" : "outline"} className="w-fit text-[10px]">
                      {hasBeenRead ? <MailOpen /> : <Mail />}
                      {hasBeenRead ? "Sudah dibaca petugas" : "Belum dibaca petugas"}
                    </Badge>
                    {item.status === "ACTIVE" ? (
                      <Badge variant="outline" className="w-fit border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-400">
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
                  <TableHead className="text-xs font-bold uppercase tracking-wider">No. Ref / Sandi</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Judul & Isi Laporan</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Wilayah</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">Urgensi</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">
                    Status Verifikasi
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-center">
                    Status Baca Petugas
                  </TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Waktu Masuk</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((item) => {
                  const urgencyStyle = getUrgencyCardStyle(item.urgency);
                  const reportIsVerified = isVerifiedReport(item.verificationStatus);
                  const hasVerifiedUrgency = reportIsVerified && Boolean(item.urgency);
                  const hasBeenRead = isReadByFieldOfficer(item);
                  const refNum = item.referenceNumber || item.jaringAlias || item.jaringCode || item.id.slice(0, 8);
                  const messageCount = item.messages?.length ?? item.counts?.contentParts ?? 0;
                  const mediaCount = item.media?.length ?? item.counts?.media ?? 0;
                  const draftComplete = Boolean(item.content && item.location && mediaCount > 0);

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        <div>{refNum}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Jaring: {item.jaringAlias || item.jaringCode || "-"}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-[320px]">
                        <p className="font-semibold text-xs text-foreground line-clamp-1">
                          {item.displayTitle || item.content || "Laporan sedang dibuat"}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{item.content || "-"}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {messageCount} pesan · {mediaCount} media
                          {item.status === "ACTIVE" ? ` · ${draftComplete ? "Lengkap" : "Belum lengkap"}` : ""}
                        </p>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground">{formatFullAreaName(item.resolvedArea)}</TableCell>

                      <TableCell className="text-center">
                        {hasVerifiedUrgency ? (
                          <Badge variant="outline" className={cn("text-[10px] font-bold", urgencyStyle.badge)}>
                            {urgencyStyle.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {reportIsVerified ? "Belum ditentukan" : "Belum Diverifikasi"}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-center">
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

                      <TableCell className="text-center">
                        <Badge variant={hasBeenRead ? "secondary" : "outline"} className="text-[10px]">
                          {hasBeenRead ? <MailOpen /> : <Mail />}
                          {hasBeenRead ? "Sudah dibaca" : "Belum dibaca"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.reportedAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
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
