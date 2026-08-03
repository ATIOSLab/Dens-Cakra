"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ScrollText,
  Table as TableIcon,
  User,
  Users,
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
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";


import { JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import type { CoachingReportItem, PeriodeFilterOption } from "./laporan-pembinaan-types";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

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

export function LaporanPembinaanClient({
  openCreateDialogOnMount = false,
}: {
  openCreateDialogOnMount?: boolean;
} = {}) {
  const [reports, setReports] = useState<CoachingReportItem[]>([]);
  const [workspaceJarings, setWorkspaceJarings] = useState<FieldOfficerJaring[]>([]);
  const [villageAreas, setVillageAreas] = useState<Array<{ areaId: string; name: string }>>([]);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(openCreateDialogOnMount);

  // View mode state
  const [viewMode, setViewMode] = useState<"card" | "table">("table");



  // Filter states
  const [search, setSearch] = useState("");
  const [periodeFilter, setPeriodeFilter] = useState<PeriodeFilterOption>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Load workspace & coaching reports in a single unified flow to avoid UI flickering
  async function loadAllData() {
    setLoadingWorkspace(true);
    setLoadingReports(true);
    try {
      const res = await fetch("/api/field-officer/workspace");
      if (res.ok) {
        const data: FieldOfficerWorkspace = await res.json();
        const jarings = Array.isArray(data?.jaring) ? data.jaring : [];
        setWorkspaceJarings(jarings);
        if (Array.isArray(data?.villageAreas)) {
          setVillageAreas(data.villageAreas);
        }
        await fetchCoachingReports(jarings);
      }
    } catch (err) {
      console.error("Gagal memuat data workspace Field Officer:", err);
    } finally {
      setLoadingWorkspace(false);
      setLoadingReports(false);
    }
  }

  async function fetchCoachingReports(jaringsToFetch: FieldOfficerJaring[]) {
    const verifiedJarings = jaringsToFetch.filter((j) => j.registrationStatus === "APPROVED");
    if (verifiedJarings.length === 0) {
      setReports([]);
      return;
    }

    try {
      const jaringMap = new Map<string, FieldOfficerJaring>();
      verifiedJarings.forEach((j) => jaringMap.set(j.id, j));

      const fetchPromises = verifiedJarings.map(async (jaring) => {
        try {
          const res = await apiBrowserFetch<{ items?: CoachingReportItem[] } | CoachingReportItem[]>(
            `/jaring/${jaring.id}/coaching-reports?limit=100`,
          );
          const items = Array.isArray(res) ? res : res?.items || [];
          return items.map((report) => ({
            ...report,
            jaringCode: jaring.code,
            jaringAlias: jaring.aliasName || jaring.code,
            jaringName: jaring.fullName || jaring.aliasName || jaring.code,
            villageName: jaring.areaNames && jaring.areaNames.length > 0 ? jaring.areaNames.join(", ") : "-",
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      const allReports = results.flat();

      // Sort by reportedAt descending
      allReports.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());

      setReports(allReports);
    } catch (err) {
      console.error("Gagal memuat laporan pembinaan:", err);
    }
  }

  useEffect(() => {
    void loadAllData();
  }, []);

  function handleRefresh() {
    void loadAllData();
  }

  // Filter logic
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      // 1. Search Query Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchAlias = (item.jaringAlias || "").toLowerCase().includes(q);
        const matchName = (item.jaringName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAlias && !matchName) {
          return false;
        }
      }

      // 2. Jaring Filter
      if (jaringFilter !== "ALL" && item.jaringId !== jaringFilter) {
        return false;
      }

      // 3. Kelurahan/Desa Filter
      if (villageFilter !== "ALL") {
        const selectedVillage = villageAreas.find((v) => v.areaId === villageFilter);
        if (selectedVillage && !item.villageName?.toLowerCase().includes(selectedVillage.name.toLowerCase())) {
          return false;
        }
      }

      // 4. Custom Date Range Filter (Dari Tanggal & Sampai Tanggal)
      if (startDate && startDate.length === 10) {
        const start = new Date(`${startDate}T00:00:00`);
        if (!Number.isNaN(start.getTime())) {
          const reportDate = new Date(item.reportedAt);
          if (reportDate < start) return false;
        }
      }
      if (endDate && endDate.length === 10) {
        const end = new Date(`${endDate}T23:59:59.999`);
        if (!Number.isNaN(end.getTime())) {
          const reportDate = new Date(item.reportedAt);
          if (reportDate > end) return false;
        }
      }

      // 5. Periode Filter (Quick Filter)
      if (periodeFilter !== "ALL") {
        const reportDate = new Date(item.reportedAt);
        const now = new Date();

        if (periodeFilter === "TODAY") {
          const isToday =
            reportDate.getDate() === now.getDate() &&
            reportDate.getMonth() === now.getMonth() &&
            reportDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (periodeFilter === "LAST_7_DAYS") {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (reportDate < sevenDaysAgo) return false;
        } else if (periodeFilter === "LAST_30_DAYS") {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (reportDate < thirtyDaysAgo) return false;
        } else if (periodeFilter === "THIS_MONTH") {
          const isThisMonth =
            reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        }
      }

      return true;
    });
  }, [reports, search, jaringFilter, villageFilter, startDate, endDate, periodeFilter, villageAreas]);

  // Pagination logic
  const totalItems = filteredReports.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const currentPage = Math.min(page, totalPages);
  const pagedReports = useMemo(() => {
    const start = (currentPage - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, currentPage, limit]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <ScrollText className="h-6 w-6 text-primary" />
            History Pembinaan Jaring
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
            Refresh
          </Button>

          <Link href="/dashboard/laporan-pembinaan-jaring/baru">
            <Button size="sm" className="h-9 gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              Buat Laporan Pembinaan
            </Button>
          </Link>
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

          {/* Date Range Picker (Dari & s/d) */}
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
            <span>s/d:</span>
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
        </div>

        {/* Right Side: Reset Button & View Mode Toggle */}
        <div className="flex items-center gap-2">
          {(search || jaringFilter !== "ALL" || villageFilter !== "ALL" || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setJaringFilter("ALL");
                setVillageFilter("ALL");
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
              ? "Belum ada laporan pembinaan Jaring yang dibuat. Tekan tombol di bawah untuk membuat laporan pembinaan pertama."
              : "Tidak ada laporan pembinaan yang cocok dengan kriteria filter atau kata kunci pencarian Anda."}
          </p>
          {reports.length === 0 ? (
            <Link href="/dashboard/laporan-pembinaan-jaring/baru">
              <Button size="sm" className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" />
                Buat Laporan Pembinaan
              </Button>
            </Link>
          ) : (
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
          )}
        </div>
      ) : viewMode === "card" ? (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagedReports.map((report) => (
            <Card key={report.id} className="hover:shadow-md transition-shadow flex flex-col justify-between border-border/80">
              <CardHeader className="p-4 pb-2 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-[11px]">
                      {report.jaringAlias}
                    </Badge>
                    {report.villageName && report.villageName !== "-" && (
                      <Badge variant="secondary" className="text-[10px] gap-1 py-0">
                        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
                        {report.villageName}
                      </Badge>
                    )}
                  </div>
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
                  <Link href={`/dashboard/laporan-pembinaan-jaring/${report.id}?jaringId=${report.jaringId}`}>
                    <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs text-primary hover:text-primary/90 gap-1">
                      Lihat Detail
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="shadow-xs border border-border/80">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[50px] text-center text-xs">No</TableHead>
                  <TableHead className="w-[140px] text-xs">Waktu Pembinaan</TableHead>
                  <TableHead className="w-[170px] text-xs">Daftar Jaring</TableHead>
                  <TableHead className="w-[180px] text-xs">Judul Laporan</TableHead>
                  <TableHead className="min-w-[220px] text-xs">Isi Laporan</TableHead>
                  <TableHead className="w-[140px] text-xs">Kelurahan / Desa</TableHead>
                  <TableHead className="w-[90px] text-right text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedReports.map((report, idx) => (
                  <TableRow key={report.id} className="hover:bg-muted/30 text-xs">
                    <TableCell className="text-center font-mono text-muted-foreground">
                      {(currentPage - 1) * limit + idx + 1}
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-foreground">
                      {formatDateTime(report.reportedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-foreground">{report.jaringName || report.jaringCode || report.jaringAlias}</div>
                      {report.jaringAlias && (
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] font-medium py-0 px-1.5 h-4 border-slate-300 dark:border-white/20 bg-muted/50 text-muted-foreground inline-flex items-center"
                        >
                          {report.jaringAlias}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {report.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px]">
                      <div className="line-clamp-2 text-xs">{report.content || "-"}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {report.villageName || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/laporan-pembinaan-jaring/${report.id}?jaringId=${report.jaringId}`}>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
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
