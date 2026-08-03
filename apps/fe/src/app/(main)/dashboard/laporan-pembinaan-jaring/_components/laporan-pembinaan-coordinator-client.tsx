"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Download,
  Eye,
  FileText,
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
import { type JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type { CoachingReportItem, PeriodeFilterOption } from "./laporan-pembinaan-types";

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

interface AdministrativeAreaScope {
  id: string;
  areaId?: string;
  name: string;
  level: string;
  code: string;
  officialCode?: string | null;
  parentAreaId?: string | null;
}

type JaringGeography = {
  regencyId: string | null;
  regencyName: string | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
};

function isRegencyLevel(level: string) {
  return level === "REGENCY" || level === "CITY" || level === "KABUPATEN" || level === "KOTA";
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
    if (area.level === "DISTRICT" || area.level === "KECAMATAN") district = area;
    if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE" || area.level === "DESA" || area.level === "KELURAHAN") village = area;
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

export function LaporanPembinaanCoordinatorClient() {
  const [reports, setReports] = useState<CoachingReportItem[]>([]);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilterOption>("ALL");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);

  // Load Jarings, Area Scopes (/me/area-scopes) & Coaching Reports
  async function loadAllData() {
    setLoadingData(true);
    try {
      // 1. Fetch Area Scopes from /me/area-scopes
      const [scopesRes, jaringsRes] = await Promise.all([
        apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
          query: { includeDescendants: true },
        }).catch(() => []),
        apiBrowserFetch<{ items?: RawJaringItem[] } | RawJaringItem[]>("/jaring?limit=100").catch(() => []),
      ]);

      const scopes = Array.isArray(scopesRes) ? scopesRes : [];
      setAreaScopes(scopes);

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

  // Map geography for each Jaring
  const jaringGeographyMap = useMemo(() => {
    const map = new Map<string, JaringGeography>();
    for (const jaring of jaringList) {
      map.set(jaring.id, resolveJaringGeography(jaring));
    }
    return map;
  }, [jaringList]);

  // Combined options for Regency / District / Village filters (from both /me/area-scopes and Jaring coverages)
  const regencyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    // 1. From areaScopes
    for (const area of areaScopes) {
      if (isRegencyLevel(area.level)) {
        const id = area.areaId || area.id;
        map.set(id, { id, name: area.name });
      }
    }

    // 2. From Jaring coverages
    for (const jaring of jaringList) {
      const geo = resolveJaringGeography(jaring);
      if (geo.regencyId && geo.regencyName) {
        map.set(geo.regencyId, { id: geo.regencyId, name: geo.regencyName });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, jaringList]);

  const districtOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    // 1. From areaScopes
    if (regencyFilter !== "ALL") {
      const selectedRegency = areaScopes.find((a) => (a.areaId || a.id) === regencyFilter);
      const selectedCode = selectedRegency?.officialCode || selectedRegency?.code;

      for (const area of areaScopes) {
        if (area.level === "DISTRICT" || area.level === "KECAMATAN") {
          const id = area.areaId || area.id;
          if (area.parentAreaId === regencyFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
            map.set(id, { id, name: area.name });
          }
        }
      }
    } else {
      for (const area of areaScopes) {
        if (area.level === "DISTRICT" || area.level === "KECAMATAN") {
          const id = area.areaId || area.id;
          map.set(id, { id, name: area.name });
        }
      }
    }

    // 2. From Jaring coverages
    for (const jaring of jaringList) {
      const geo = resolveJaringGeography(jaring);
      if (geo.districtId && geo.districtName) {
        if (regencyFilter === "ALL" || geo.regencyId === regencyFilter) {
          map.set(geo.districtId, { id: geo.districtId, name: geo.districtName });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, jaringList, regencyFilter]);

  const villageOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    // 1. From areaScopes
    if (districtFilter !== "ALL") {
      const selectedDistrict = areaScopes.find((a) => (a.areaId || a.id) === districtFilter);
      const selectedCode = selectedDistrict?.officialCode || selectedDistrict?.code;

      for (const area of areaScopes) {
        if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE" || area.level === "DESA" || area.level === "KELURAHAN") {
          const id = area.areaId || area.id;
          if (area.parentAreaId === districtFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
            map.set(id, { id, name: area.name });
          }
        }
      }
    } else {
      for (const area of areaScopes) {
        if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE" || area.level === "DESA" || area.level === "KELURAHAN") {
          const id = area.areaId || area.id;
          map.set(id, { id, name: area.name });
        }
      }
    }

    // 2. From Jaring coverages
    for (const jaring of jaringList) {
      const geo = resolveJaringGeography(jaring);
      if (geo.villageId && geo.villageName) {
        if (districtFilter === "ALL" || geo.districtId === districtFilter) {
          if (regencyFilter === "ALL" || geo.regencyId === regencyFilter) {
            map.set(geo.villageId, { id: geo.villageId, name: geo.villageName });
          }
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, jaringList, regencyFilter, districtFilter]);

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

      // Geographic filters
      const jaringGeo = jaringGeographyMap.get(item.jaringId);
      if (regencyFilter !== "ALL") {
        const selReg = areaScopes.find((a) => (a.areaId || a.id) === regencyFilter);
        const matchId = jaringGeo?.regencyId === regencyFilter;
        const matchName = Boolean(selReg && jaringGeo?.regencyName && selReg.name.toLowerCase() === jaringGeo.regencyName.toLowerCase());
        if (!matchId && !matchName) return false;
      }

      if (districtFilter !== "ALL") {
        const selDist = areaScopes.find((a) => (a.areaId || a.id) === districtFilter);
        const matchId = jaringGeo?.districtId === districtFilter;
        const matchName = Boolean(selDist && jaringGeo?.districtName && selDist.name.toLowerCase() === jaringGeo.districtName.toLowerCase());
        if (!matchId && !matchName) return false;
      }

      if (villageFilter !== "ALL") {
        const selVill = areaScopes.find((a) => (a.areaId || a.id) === villageFilter);
        const matchId = jaringGeo?.villageId === villageFilter;
        const matchName = Boolean(selVill && jaringGeo?.villageName && selVill.name.toLowerCase() === jaringGeo.villageName.toLowerCase());
        if (!matchId && !matchName) return false;
      }

      // Periode Filter Preset
      const reportDateStr = item.reportedAt || item.createdAt;
      if (reportDateStr) {
        const reportDate = new Date(reportDateStr);
        const now = new Date();

        if (periodeFilter === "TODAY") {
          const todayStr = new Date().toISOString().slice(0, 10);
          const repStr = reportDate.toISOString().slice(0, 10);
          if (todayStr !== repStr) return false;
        } else if (periodeFilter === "LAST_7_DAYS") {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (reportDate < sevenDaysAgo) return false;
        } else if (periodeFilter === "LAST_30_DAYS") {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (reportDate < thirtyDaysAgo) return false;
        } else if (periodeFilter === "THIS_MONTH") {
          if (reportDate.getFullYear() !== now.getFullYear() || reportDate.getMonth() !== now.getMonth()) {
            return false;
          }
        } else if (periodeFilter === "CUSTOM") {
          if (startDate && startDate.length === 10) {
            const start = new Date(`${startDate}T00:00:00`);
            if (!Number.isNaN(start.getTime()) && reportDate < start) return false;
          }
          if (endDate && endDate.length === 10) {
            const end = new Date(`${endDate}T23:59:59.999`);
            if (!Number.isNaN(end.getTime()) && reportDate > end) return false;
          }
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
  }, [
    reports,
    jaringFilter,
    regencyFilter,
    districtFilter,
    villageFilter,
    periodeFilter,
    startDate,
    endDate,
    search,
    jaringGeographyMap,
  ]);

  // Paginated items
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  const handleResetFilters = () => {
    setSearch("");
    setJaringFilter("ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
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
      "Ringkasan Kegiatan",
      "Petugas Pembina",
      "Waktu Pembinaan",
    ];

    const rows = filteredReports.map((r) => [
      `"${r.id}"`,
      `"${r.jaringAlias || r.jaringCode || "-"}"`,
      `"${r.jaringName || "-"}"`,
      `"${(r.title || "-").replace(/"/g, '""')}"`,
      `"${(r.content || "-").replace(/"/g, '""')}"`,
      `"${r.fieldOfficer?.userProfile?.fullName || "-"}"`,
      `"${formatDateTime(r.reportedAt || r.createdAt)}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pembinaan-jaring-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto transition-colors duration-150 font-sans">
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
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">History Pembinaan Jaring</h1>
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

      {/* SUMMARY STATS CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-xs font-bold font-mono uppercase text-emerald-600 dark:text-emerald-400">
              TOTAL PEMBINAAN
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileText className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">Total laporan pembinaan</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-xs font-bold font-mono uppercase text-sky-600 dark:text-sky-400">
              JARING DIBINA
            </CardTitle>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Users className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{summary.uniqueJaringCount}</div>
            <p className="text-xs text-muted-foreground">Personel Jaring yang telah dibina</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
            <CardTitle className="text-xs font-bold font-mono uppercase text-amber-600 dark:text-amber-400">
              PEMBINAAN BULAN INI
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Calendar className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{summary.thisMonthCount}</div>
            <p className="text-xs text-muted-foreground">Kegiatan pembinaan bulan berjalan</p>
          </CardContent>
        </Card>
      </div>

      {/* FILTER & TOOLBAR BAR LENGKAP */}
      <Card className="border-slate-200/80 dark:border-white/10 shadow-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* ROW 1: Search Bar & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari Judul, Isi, Jaring, Field Officer..."
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
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
            </div>
          </div>

          {/* ROW 2: Structured Grid of Filters (Kota/Kab, Kecamatan, Kelurahan, Jaring, Periode Waktu) */}
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-2.5", regencyOptions.length > 0 ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-4")}>
            {/* 1. Filter Kota/Kabupaten (Tampil untuk Regional Commander / Multi-kab) */}
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

            {/* 2. Filter Kecamatan */}
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

            {/* 3. Filter Kelurahan/Desa */}
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
                </option>
              ))}
            </NativeSelect>

            {/* 4. Filter Jaring / Gaswil Popover */}
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

            {/* 5. Filter Periode Waktu */}

            {/* 5. Filter Periode Waktu */}
            <NativeSelect
              aria-label="Filter Periode Waktu"
              value={periodeFilter}
              onChange={(event) => {
                setPeriodeFilter(event.target.value as any);
                setPage(1);
              }}
              className="h-9 text-xs border-slate-200 dark:border-white/10 w-full"
            >
              <option value="ALL">Semua Periode</option>
              <option value="TODAY">Hari Ini</option>
              <option value="LAST_7_DAYS">7 Hari Terakhir</option>
              <option value="LAST_30_DAYS">30 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="CUSTOM">Kustom (Pilih Tanggal)</option>
            </NativeSelect>
          </div>

          {/* ROW 3: Custom Date Range Inputs & Reset Button */}
          {periodeFilter === "CUSTOM" ||
          search ||
          jaringFilter !== "ALL" ||
          regencyFilter !== "ALL" ||
          districtFilter !== "ALL" ||
          villageFilter !== "ALL" ||
          periodeFilter !== "ALL" ||
          startDate ||
          endDate ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
              {periodeFilter === "CUSTOM" ? (
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
                jaringFilter !== "ALL" ||
                regencyFilter !== "ALL" ||
                districtFilter !== "ALL" ||
                villageFilter !== "ALL" ||
                periodeFilter !== "ALL" ||
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
      {loadingData ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-slate-200 dark:border-white/10">
          <RefreshCw className="size-8 animate-spin text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat data laporan pembinaan...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-dashed p-8 text-center">
          <CardContent className="space-y-3">
            <FileText className="mx-auto size-10 text-muted-foreground opacity-40" />
            <h3 className="font-bold text-base">Tidak Ada Laporan Pembinaan</h3>
            <p className="mx-auto max-w-md text-muted-foreground text-xs">
              Tidak ada data laporan pembinaan Jaring yang cocok dengan filter Anda.
            </p>
            <Button size="sm" variant="outline" onClick={handleResetFilters}>
              Reset Filter
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "card" ? (
        /* CARD VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedReports.map((report) => (
              <Card
                key={report.id}
                className="flex flex-col justify-between border-slate-200/80 dark:border-white/10 hover:shadow-md transition-all duration-200"
              >
                <CardHeader className="space-y-2 p-4 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="font-bold text-[10px] uppercase border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Jaring: {report.jaringAlias || report.jaringCode}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                      <Calendar className="size-3 text-sky-500" />
                      {formatDateOnly(report.reportedAt || report.createdAt)}
                    </span>
                  </div>

                  <div>
                    <h3 className="line-clamp-2 font-bold font-heading text-foreground text-sm leading-snug">
                      {report.title}
                    </h3>
                    <p className="mt-1 line-clamp-3 text-muted-foreground text-xs">{report.content}</p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-4 pt-2">
                  <div className="space-y-1.5 border-slate-100 border-t pt-2.5 text-xs text-muted-foreground dark:border-white/10">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="size-3.5 text-sky-500 shrink-0" />
                      <span className="truncate">Petugas: {report.fieldOfficer?.userProfile?.fullName || "-"}</span>
                    </div>
                  </div>

                  <Link href={`/dashboard/laporan-pembinaan-jaring/${report.jaringId}`} className="block pt-1">
                    <Button variant="outline" size="sm" className="w-full h-8 text-xs font-semibold gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10">
                      <Eye className="size-3.5" /> LIHAT DETAIL
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          <TablePagination
            page={page}
            total={filteredReports.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-xs dark:border-white/10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Sandi Jaring</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Judul & Ringkasan Pembinaan</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Petugas Pembina</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Waktu Pembinaan</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                    <TableCell className="font-mono text-xs">
                      <div className="font-bold text-foreground">{report.jaringAlias || report.jaringCode}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{report.jaringName}</div>
                    </TableCell>

                    <TableCell className="max-w-[320px]">
                      <p className="line-clamp-1 font-semibold text-foreground text-xs">{report.title}</p>
                      <p className="line-clamp-1 text-[11px] text-muted-foreground">{report.content}</p>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="font-semibold text-foreground">{report.fieldOfficer?.userProfile?.fullName || "-"}</div>
                    </TableCell>

                    <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-xs">
                      {formatDateTime(report.reportedAt || report.createdAt)}
                    </TableCell>

                    <TableCell className="text-right">
                      <Link href={`/dashboard/laporan-pembinaan-jaring/${report.jaringId}`}>
                        <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs font-bold">
                          <Eye className="size-3.5 mr-1" /> Detail
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            total={filteredReports.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}
    </main>
  );
}
