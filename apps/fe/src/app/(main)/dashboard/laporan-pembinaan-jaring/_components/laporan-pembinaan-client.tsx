"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  Plus,
  RefreshCw,
  ScrollText,
  Search,
  Table as TableIcon,
  User,
  Users,
} from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { jakartaBoundaryIso, resolveJakartaPeriodRange } from "@/lib/domain/date-time";
import { cn } from "@/lib/utils";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

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

export function LaporanPembinaanClient() {
  const [reports, setReports] = useState<CoachingReportItem[]>([]);
  const [workspaceJarings, setWorkspaceJarings] = useState<FieldOfficerJaring[]>([]);
  const [villageAreas, setVillageAreas] = useState<Array<{ areaId: string; name: string }>>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [totalReports, setTotalReports] = useState(0);

  // View mode state
  const [viewMode, setViewMode] = useState<"card" | "table">("table");

  // Filter states
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilterOption>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const periodRange = useMemo(
    () => resolveJakartaPeriodRange(periodeFilter, startDate, endDate),
    [endDate, periodeFilter, startDate],
  );

  const loadWorkspace = useCallback(async () => {
    setLoadingWorkspace(true);
    try {
      const res = await fetch("/api/field-officer/workspace");
      if (res.ok) {
        const data: FieldOfficerWorkspace = await res.json();
        const jarings = Array.isArray(data?.jaring) ? data.jaring : [];
        setWorkspaceJarings(jarings);
        if (Array.isArray(data?.villageAreas)) {
          setVillageAreas(data.villageAreas);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data ruang kerja Petugas Wilayah:", err);
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  const fetchCoachingReports = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoadingReports(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sortBy: "reportedAt",
        sortOrder: "desc",
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (jaringFilter !== "ALL") params.set("jaringId", jaringFilter);
      if (villageFilter !== "ALL") params.set("areaId", villageFilter);
      if (periodRange.from) params.set("from", jakartaBoundaryIso(periodRange.from));
      if (periodRange.to) params.set("to", jakartaBoundaryIso(periodRange.to, true));

      const result = await apiBrowserFetch<{
        items?: CoachingReportItem[];
        pagination?: { total: number };
      }>(`/jaring/coaching-reports?${params.toString()}`);
      if (requestId !== requestSequence.current) return;
      setReports(result.items ?? []);
      setTotalReports(result.pagination?.total ?? 0);
    } catch (err) {
      if (requestId === requestSequence.current) {
        console.error("Gagal memuat laporan pembinaan:", err);
      }
    } finally {
      if (requestId === requestSequence.current) setLoadingReports(false);
    }
  }, [debouncedSearch, jaringFilter, limit, page, periodRange, villageFilter]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    void fetchCoachingReports();
  }, [fetchCoachingReports]);

  function handleRefresh() {
    void Promise.all([loadWorkspace(), fetchCoachingReports()]);
  }

  const filteredReports = reports;
  const totalItems = totalReports;
  const currentPage = page;
  const pagedReports = reports;

  return (
    <div className="dc-page">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ScrollText className="h-6 w-6 text-primary" />
            Riwayat Pembinaan Jaring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola dan tinjau seluruh rekaman pembinaan, pengarahan, dan bimbingan Jaring di wilayah tugas Anda.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loadingWorkspace || loadingReports}
            className="h-9 gap-1.5 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", (loadingWorkspace || loadingReports) && "animate-spin")} />
            Muat Ulang
          </Button>

          <Button asChild size="sm" className="h-9 gap-1.5 text-xs">
            <Link href="/dashboard/laporan-pembinaan-jaring/baru">
              <Plus className="h-4 w-4" />
              Buat Laporan Pembinaan
            </Link>
          </Button>
        </div>
      </div>

      {/* Control Bar - Single horizontal bar matching Jaring page */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-xs mb-2.5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-44 sm:w-52">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari judul, isi..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8 h-8 text-xs bg-background"
            />
          </div>

          {/* Kelurahan Filter */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>Kelurahan:</span>
            <NativeSelect
              value={villageFilter}
              onChange={(e) => {
                setVillageFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 text-xs bg-background min-w-[140px]"
            >
              <option value="ALL">Semua Kelurahan / Desa</option>
              {villageAreas.map((v) => (
                <option key={v.areaId} value={v.areaId}>
                  {v.name}
                </option>
              ))}
            </NativeSelect>
          </div>

          {/* Jaring Filter Popover */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>Jaring:</span>
            <JaringSelectPopover
              options={workspaceJarings}
              value={jaringFilter}
              onValueChange={(val) => {
                setJaringFilter(val);
                setPage(1);
              }}
              allowAllOption={true}
              filterVerifiedOnly={true}
              disabled={loadingWorkspace}
              className="h-8 text-xs w-[160px]"
            />
          </div>

          {/* Periode Filter Dropdown */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <span>Periode:</span>
            <NativeSelect
              value={periodeFilter}
              onChange={(e) => {
                setPeriodeFilter(e.target.value as any);
                setPage(1);
              }}
              className="h-8 text-xs bg-background min-w-[150px]"
            >
              <option value="ALL">Semua Periode</option>
              <option value="TODAY">Hari Ini</option>
              <option value="LAST_7_DAYS">7 Hari Terakhir</option>
              <option value="LAST_30_DAYS">30 Hari Terakhir</option>
              <option value="THIS_MONTH">Bulan Ini</option>
              <option value="CUSTOM">Kustom (Pilih Tanggal)</option>
            </NativeSelect>
          </div>

          {/* Date Range Picker (Only shown when periodeFilter === "CUSTOM") */}
          {periodeFilter === "CUSTOM" ? (
            <>
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>Dari:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs bg-background w-[125px]"
                  title="Dari Tanggal Pembinaan"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <span>s.d:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs bg-background w-[125px]"
                  title="Sampai Tanggal Pembinaan"
                />
              </div>
            </>
          ) : null}
        </div>

        {/* Right Side: Reset Button & View Mode Toggle */}
        <div className="flex items-center gap-2">
          {(search ||
            jaringFilter !== "ALL" ||
            villageFilter !== "ALL" ||
            periodeFilter !== "ALL" ||
            startDate ||
            endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setJaringFilter("ALL");
                setVillageFilter("ALL");
                setPeriodeFilter("ALL");
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filter
            </Button>
          )}

          {/* View Mode Toggle (Table / Card) */}
          <ViewModeToggle value={viewMode} onValueChange={setViewMode} />
        </div>
      </div>

      {/* Main Content Area */}
      {loadingWorkspace || loadingReports ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] p-8 border rounded-lg bg-card/50">
          <RefreshCw className="h-8 w-8 text-primary animate-spin mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Memuat daftar laporan pembinaan...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] p-8 border rounded-lg bg-card/50 text-center">
          <ScrollText className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Belum Ada Laporan Pembinaan</h3>
          <p className="text-xs text-muted-foreground max-w-md mb-4">
            {reports.length === 0
              ? "Belum ada laporan pembinaan Jaring. Gunakan tombol Buat Laporan Pembinaan pada bagian atas halaman."
              : "Tidak ada laporan pembinaan yang cocok dengan kriteria filter atau kata kunci pencarian Anda."}
          </p>
          {reports.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setJaringFilter("ALL");
                setVillageFilter("ALL");
                setPeriodeFilter("ALL");
                setPage(1);
              }}
              className="text-xs"
            >
              Reset Filter
            </Button>
          ) : null}
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedReports.map((report) => (
            <Card
              key={report.id}
              className="hover:shadow-md transition-shadow flex flex-col justify-between border-border/80"
            >
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
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
                    className="flex-1"
                  />
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    <Calendar className="h-3 w-3" />
                    {formatDateOnly(report.reportedAt)}
                  </span>
                </div>

                <CardTitle className="text-base font-semibold text-foreground line-clamp-2 leading-snug">
                  {report.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col justify-between">
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed bg-muted/30 p-2.5 rounded-md border border-border/40">
                  {report.content}
                </p>

                <div className="pt-2 border-t flex items-center justify-end text-xs">
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 px-2.5 text-primary text-xs hover:text-primary/90"
                  >
                    <Link href={`/dashboard/laporan-pembinaan-jaring/${report.id}?jaringId=${report.jaringId}`}>
                      Lihat Detail
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="shadow-xs border border-border/80 overflow-hidden">
          <CardContent className="p-0 overflow-x-auto select-none">
            <Table className="w-full min-w-[1100px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="w-[45px] text-center font-bold text-xs uppercase tracking-wider">No</TableHead>
                  <TableHead className="w-12 text-center font-bold text-xs uppercase tracking-wider">Foto</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Nama Jaring</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Kode Jaring</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Wilayah Penempatan</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Nomor WhatsApp</TableHead>
                  <TableHead className="min-w-[220px] font-bold text-xs uppercase tracking-wider">
                    Judul & Ringkasan Laporan
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                    Waktu Pembinaan
                  </TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedReports.map((report, idx) => {
                  const identity = resolveJaringIdentity({
                    id: report.jaringId,
                    jaringName: report.jaringName,
                    jaringAlias: report.jaringAlias,
                    jaringCode: report.jaringCode,
                    jaringWhatsAppNumber: report.jaringWhatsAppNumber,
                    jaringProfilePhotoFileId: report.jaringProfilePhotoFileId,
                    assignedArea: report.assignedArea,
                    villageName: report.villageName,
                  });

                  return (
                    <TableRow key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="text-center font-mono text-muted-foreground align-middle">
                        {(currentPage - 1) * limit + idx + 1}
                      </TableCell>

                      <TableCell className="align-middle">
                        <div className="size-8 overflow-hidden rounded-none border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 flex items-center justify-center">
                          {identity.avatarUrl ? (
                            <img src={identity.avatarUrl} alt={identity.name} className="size-full object-cover" />
                          ) : (
                            <User className="size-4 text-slate-400 dark:text-slate-600" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="align-middle font-mono font-bold text-xs text-foreground">
                        {identity.name}
                      </TableCell>

                      <TableCell className="align-middle font-mono text-xs text-violet-600 dark:text-violet-400">
                        {identity.code}
                      </TableCell>

                      <TableCell className="align-middle font-mono text-xs text-foreground">
                        {identity.placementArea}
                      </TableCell>

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

                      <TableCell className="align-middle max-w-[280px]">
                        <p className="line-clamp-1 font-semibold text-foreground text-xs">{report.title}</p>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">{report.content || "-"}</p>
                      </TableCell>

                      <TableCell className="align-middle whitespace-nowrap font-mono text-muted-foreground text-xs">
                        {formatDateTime(report.reportedAt)}
                      </TableCell>

                      <TableCell className="align-middle text-right">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                        >
                          <Link href={`/dashboard/laporan-pembinaan-jaring/${report.id}?jaringId=${report.jaringId}`}>
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
          </CardContent>
        </Card>
      )}

      {/* Pagination Controls */}
      {filteredReports.length > 0 && (
        <div className="mt-2">
          <TablePagination
            page={currentPage}
            total={totalItems}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
