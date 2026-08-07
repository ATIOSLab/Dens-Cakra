"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { fetchAllVerifiedJaringOptions } from "@/lib/api/jaring-options";
import {
  jakartaBoundaryIso,
  jakartaDateKey,
  resolveJakartaPeriodRange,
} from "@/lib/domain/date-time";
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

type CoachingListResponse = {
  items: CoachingReportItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary?: { total: number; uniqueJaringCount: number; thisMonthCount: number };
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
    if (
      area.level === "VILLAGE" ||
      area.level === "URBAN_VILLAGE" ||
      area.level === "DESA" ||
      area.level === "KELURAHAN"
    )
      village = area;
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

const PEMBINAAN_COLUMNS: ColumnOption[] = [
  { id: "foto", label: "Foto Jaring" },
  { id: "namaJaring", label: "Nama Jaring", alwaysVisible: true },
  { id: "kodeJaring", label: "Kode Jaring" },
  { id: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { id: "wilayahPenempatan", label: "Wilayah Penempatan" },
  { id: "whatsapp", label: "Nomor WhatsApp" },
  { id: "judulRingkasan", label: "Judul & Ringkasan Pembinaan", alwaysVisible: true },
  { id: "waktuPembinaan", label: "Waktu Pembinaan" },
];

export function LaporanPembinaanCoordinatorClient() {
  const [reports, setReports] = useState<CoachingReportItem[]>([]);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalReports, setTotalReports] = useState(0);
  const [reportSummary, setReportSummary] = useState({ total: 0, uniqueJaringCount: 0, thisMonthCount: 0 });

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const isColVisible = (id: string) => visibleColumns[id] !== false;

  // View Mode: Card vs Table
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const periodRange = useMemo(() => {
    if (periodeFilter === "THIS_MONTH") {
      const today = jakartaDateKey(new Date());
      return { from: `${today.slice(0, 7)}-01`, to: today };
    }
    return resolveJakartaPeriodRange(periodeFilter, startDate, endDate);
  }, [endDate, periodeFilter, startDate]);

  // Load scope-aware filter options independently from the paged result.
  const loadReferenceData = useCallback(async () => {
    try {
      const [scopesRes, jaringsRes] = await Promise.all([
        apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", {
          query: { includeDescendants: true },
        }).catch(() => []),
        fetchAllVerifiedJaringOptions<RawJaringItem>().catch(() => []),
      ]);

      const scopes = Array.isArray(scopesRes) ? scopesRes : [];
      setAreaScopes(scopes);

      setJaringList(jaringsRes);
    } catch (err) {
      console.error("Gagal memuat opsi filter laporan pembinaan:", err);
    }
  }, []);

  const createReportParams = useCallback(
    (requestedPage = page, requestedLimit = limit) => {
      const params = new URLSearchParams({
        page: String(requestedPage),
        limit: String(requestedLimit),
        sortBy: "reportedAt",
        sortOrder: "desc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (jaringFilter !== "ALL") params.set("jaringId", jaringFilter);
      let areaId = "";
      if (regencyFilter !== "ALL") areaId = regencyFilter;
      if (districtFilter !== "ALL") areaId = districtFilter;
      if (villageFilter !== "ALL") areaId = villageFilter;
      if (areaId) params.set("areaId", areaId);
      if (periodRange.from) params.set("from", jakartaBoundaryIso(periodRange.from));
      if (periodRange.to) params.set("to", jakartaBoundaryIso(periodRange.to, true));
      return params;
    },
    [
      debouncedSearch,
      districtFilter,
      jaringFilter,
      limit,
      page,
      periodRange,
      regencyFilter,
      villageFilter,
    ],
  );

  const fetchReports = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoadingData(true);
    try {
      const params = createReportParams();

      const result = await apiBrowserFetch<CoachingListResponse | CoachingReportItem[]>(
        `/jaring/coaching-reports?${params.toString()}`,
      );
      if (requestId !== requestSequence.current) return;
      if (Array.isArray(result)) {
        setReports(result);
        setTotalReports(result.length);
      } else {
        setReports(result.items ?? []);
        setTotalReports(result.pagination?.total ?? 0);
        setReportSummary(
          result.summary ?? {
            total: result.pagination?.total ?? 0,
            uniqueJaringCount: 0,
            thisMonthCount: 0,
          },
        );
      }
    } catch (err) {
      if (requestId === requestSequence.current) {
        console.error("Gagal memuat laporan pembinaan Jaring:", err);
      }
    } finally {
      if (requestId === requestSequence.current) setLoadingData(false);
    }
  }, [createReportParams]);

  useEffect(() => {
    void loadReferenceData();
  }, [loadReferenceData]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

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
        if (
          area.level === "VILLAGE" ||
          area.level === "URBAN_VILLAGE" ||
          area.level === "DESA" ||
          area.level === "KELURAHAN"
        ) {
          const id = area.areaId || area.id;
          if (area.parentAreaId === districtFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
            map.set(id, { id, name: area.name });
          }
        }
      }
    } else {
      for (const area of areaScopes) {
        if (
          area.level === "VILLAGE" ||
          area.level === "URBAN_VILLAGE" ||
          area.level === "DESA" ||
          area.level === "KELURAHAN"
        ) {
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

  // Jaring Popover options
  const popoverJaringOptions: JaringOption[] = useMemo(() => {
    return jaringList.map((j) => ({
      id: j.id,
      code: j.aliasName || j.id,
      aliasName: j.aliasName || j.fullName || j.id,
      fullName: j.fullName,
      registrationStatus: j.registrationStatus,
    }));
  }, [jaringList]);

  const filteredReports = reports;
  const paginatedReports = reports;

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
  const handleExportCSV = async () => {
    if (totalReports === 0 || exporting) return;

    setExporting(true);
    try {
      const allReports: CoachingReportItem[] = [];
      const exportLimit = 100;
      let exportPage = 1;
      let totalPages = 1;

      do {
        const params = createReportParams(exportPage, exportLimit);
        const result = await apiBrowserFetch<CoachingListResponse>(
          `/jaring/coaching-reports?${params.toString()}`,
        );
        allReports.push(...(result.items ?? []));
        totalPages = result.pagination?.totalPages ?? 1;
        exportPage += 1;
      } while (exportPage <= totalPages);

      const headers = [
        "ID Pembinaan",
        "Kode Jaring",
        "Nama Jaring",
        "Judul Pembinaan",
        "Ringkasan Kegiatan",
        "Petugas Wilayah (Gaswil)",
        "Waktu Pembinaan",
      ];

      const rows = allReports.map((r) => [
        `"${r.id}"`,
        `"${r.jaringAlias || r.jaringCode || "-"}"`,
        `"${r.jaringName || "-"}"`,
        `"${(r.title || "-").replace(/"/g, '""')}"`,
        `"${(r.content || "-").replace(/"/g, '""')}"`,
        `"${r.fieldOfficer?.userProfile?.fullName || "-"}"`,
        `"${formatDateTime(r.reportedAt || r.createdAt)}"`,
      ]);

      const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
      const objectUrl = URL.createObjectURL(new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `pembinaan-jaring-${jakartaDateKey(new Date())}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Gagal mengekspor laporan pembinaan Jaring:", error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 font-sans transition-colors duration-150 sm:space-y-6">
      {/* BREADCRUMB */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/field-coordinator">Koordinator Wilayah (Korwil)</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Riwayat Pembinaan Jaring</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">Riwayat Pembinaan Jaring</h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Rekapitulasi dan pemantauan kegiatan pembinaan Jaring oleh Petugas Wilayah (Gaswil) di wilayah koordinasi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void Promise.all([loadReferenceData(), fetchReports()])}
            disabled={loadingData}
            className="h-9 gap-2"
          >
            <RefreshCw className={cn("size-4 text-emerald-500 dark:text-emerald-400", loadingData && "animate-spin")} />
            Muat Ulang
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExportCSV()}
            disabled={totalReports === 0 || exporting}
            className="h-9 gap-2 border-slate-200 dark:border-white/10"
          >
            <Download className="size-4 text-sky-500" />
            {exporting ? "MENGEKSPOR..." : "EKSPOR CSV"}
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
            <div className="text-2xl font-bold">{reportSummary.total}</div>
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
            <div className="text-2xl font-bold">{reportSummary.uniqueJaringCount}</div>
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
            <div className="text-2xl font-bold">{reportSummary.thisMonthCount}</div>
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
                placeholder="Cari judul, isi, Jaring, Petugas Wilayah (Gaswil)..."
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
              <ColumnVisibilityToggle
                columns={PEMBINAAN_COLUMNS}
                visibleColumns={visibleColumns}
                onChange={setVisibleColumns}
              />
              <ViewModeToggle value={viewMode} onValueChange={setViewMode} className="h-9" />
            </div>
          </div>

          {/* ROW 2: Structured Grid of Filters (Kota/Kab, Kecamatan, Kelurahan, Jaring, Periode Waktu) */}
          <div
            className={cn(
              "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
              regencyOptions.length > 0 ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-4",
            )}
          >
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
                  <div className="flex items-center justify-end gap-2">
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

                  <JaringIdentitySummary
                    compact
                    source={{
                      id: report.jaringId,
                      jaringName: report.jaringName,
                      jaringAlias: report.jaringAlias,
                      jaringCode: report.jaringCode,
                      jaringWhatsAppNumber: report.jaringWhatsAppNumber,
                      jaringProfilePhotoFileId: report.jaringProfilePhotoFileId,
                      gaswilName: report.fieldOfficer?.userProfile?.fullName,
                      gaswilAssignmentId: report.fieldOfficer?.assignmentId,
                      gaswilUserProfileId: report.fieldOfficer?.userProfile?.id,
                      assignedArea: report.assignedArea,
                      villageName: report.villageName,
                    }}
                  />
                </CardHeader>

                <CardContent className="space-y-3 p-4 pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="mt-1 h-8 w-full gap-1 border-emerald-500/30 font-semibold text-emerald-600 text-xs hover:bg-emerald-500/10 dark:text-emerald-400"
                  >
                    <Link href={`/dashboard/laporan-pembinaan-jaring/${report.jaringId}`}>
                      <Eye className="size-3.5" /> LIHAT DETAIL
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <TablePagination
            page={page}
            total={totalReports}
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
          <div className="overflow-x-auto select-none border border-slate-200 bg-card shadow-xs dark:border-white/10 rounded-xl">
            <Table className="w-full min-w-[1100px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {isColVisible("foto") && <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider">Foto</TableHead>}
                  {isColVisible("namaJaring") && <TableHead className="font-bold text-xs uppercase tracking-wider">Nama Jaring</TableHead>}
                  {isColVisible("kodeJaring") && <TableHead className="font-bold text-xs uppercase tracking-wider">Kode Jaring</TableHead>}
                  {isColVisible("gaswil") && <TableHead className="font-bold text-xs uppercase tracking-wider">Petugas Wilayah (Gaswil)</TableHead>}
                  {isColVisible("wilayahPenempatan") && <TableHead className="font-bold text-xs uppercase tracking-wider">Wilayah Penempatan</TableHead>}
                  {isColVisible("whatsapp") && <TableHead className="font-bold text-xs uppercase tracking-wider">Nomor WhatsApp</TableHead>}
                  {isColVisible("judulRingkasan") && (
                    <TableHead className="min-w-[220px] font-bold text-xs uppercase tracking-wider">
                      Judul & Ringkasan Pembinaan
                    </TableHead>
                  )}
                  {isColVisible("waktuPembinaan") && (
                    <TableHead className="font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                      Waktu Pembinaan
                    </TableHead>
                  )}
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.map((report) => {
                  const identity = resolveJaringIdentity({
                    id: report.jaringId,
                    jaringName: report.jaringName,
                    jaringAlias: report.jaringAlias,
                    jaringCode: report.jaringCode,
                    jaringWhatsAppNumber: report.jaringWhatsAppNumber,
                    jaringProfilePhotoFileId: report.jaringProfilePhotoFileId,
                    gaswilName: report.fieldOfficer?.userProfile?.fullName,
                    gaswilAssignmentId: report.fieldOfficer?.assignmentId,
                    gaswilUserProfileId: report.fieldOfficer?.userProfile?.id,
                    assignedArea: report.assignedArea,
                    villageName: report.villageName,
                  });

                  return (
                    <TableRow key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-slate-800">
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

                      {isColVisible("wilayahPenempatan") && (
                        <TableCell className="align-middle font-mono text-xs text-foreground">
                          {identity.placementArea}
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
                            <span className="text-[var(--dc-text-muted)]">Belum tersedia</span>
                          )}
                        </TableCell>
                      )}

                      {isColVisible("judulRingkasan") && (
                        <TableCell className="align-middle max-w-[280px]">
                          <p className="line-clamp-1 font-semibold text-foreground text-xs">{report.title}</p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">{report.content || "-"}</p>
                        </TableCell>
                      )}

                      {isColVisible("waktuPembinaan") && (
                        <TableCell className="align-middle whitespace-nowrap font-mono text-muted-foreground text-xs">
                          {formatDateTime(report.reportedAt || report.createdAt)}
                        </TableCell>
                      )}

                      <TableCell className="align-middle text-right">
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                        >
                          <Link href={`/dashboard/laporan-pembinaan-jaring/${report.jaringId}`}>
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
            total={totalReports}
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
