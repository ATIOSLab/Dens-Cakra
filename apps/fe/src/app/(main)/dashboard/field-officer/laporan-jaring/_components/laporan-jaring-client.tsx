"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  AlertCircle,
  Clock,
  Eye,
  FileCheck,
  FileText,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type {
  JaringReportSessionDetail,
  VerificationStatus,
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
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Menunggu Verifikasi";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "Perlu Review";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "Terverifikasi (Siap Baket)";
    case "METADATA_RECORDED":
      return "Metadata & Baket Tersimpan";
    default:
      return status;
  }
}

function verificationStatusBadgeVariant(status: VerificationStatus) {
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-[#38BDF8]";
    case "METADATA_RECORDED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400";
  }
}

export function LaporanJaringClient() {
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Filter, Search, and Pagination states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Fetch list of reports
  async function fetchReports() {
    setLoadingList(true);
    try {
      const res = await apiBrowserFetch<{ items?: JaringReportSessionDetail[] } | JaringReportSessionDetail[]>(
        "/jaring/reports",
      );
      const itemsList = Array.isArray(res) ? res : res?.items || [];
      setReports(itemsList);
    } catch (err) {
      console.error("Gagal memuat daftar laporan:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    void fetchReports();
  }, []);

  // Compute summary metrics
  const summary = useMemo(() => {
    const total = reports.length;
    const waiting = reports.filter((r) => r.verificationStatus === "WAITING_FIELD_OFFICER_VERIFICATION").length;
    const review = reports.filter((r) => r.verificationStatus === "NEEDS_FIELD_OFFICER_REVIEW").length;
    const verified = reports.filter(
      (r) => r.verificationStatus === "VERIFIED_BY_FIELD_OFFICER" || r.verificationStatus === "METADATA_RECORDED",
    ).length;
    return { total, waiting, review, verified };
  }, [reports]);

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (statusFilter !== "ALL" && item.verificationStatus !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const ref = (item.referenceNumber || "").toLowerCase();
        const t = (item.title || "").toLowerCase();
        const c = (item.content || "").toLowerCase();
        const jAlias = (item.jaringAlias || "").toLowerCase();
        const jCode = (item.jaringCode || "").toLowerCase();
        return ref.includes(q) || t.includes(q) || c.includes(q) || jAlias.includes(q) || jCode.includes(q);
      }
      return true;
    });
  }, [reports, statusFilter, search]);

  // Paginated reports for table
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  return (
    <main className="space-y-6 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto transition-colors duration-150">
      {/* HEADER & BREADCRUMB */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground">Laporan Jaring</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="font-heading font-bold text-3xl tracking-tight text-foreground">
              Laporan Jaring (Petugas Lapangan)
            </h1>
            <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
              Kelola daftar laporan masuk dari Jaring binaan, periksa keabsahan verifikasi, isi metadata, dan konversikan menjadi Baket Intelijen.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchReports()}
          disabled={loadingList}
          className="w-fit h-9 gap-2"
        >
          <RefreshCw className={cn("size-4 text-sky-600 dark:text-[#38BDF8]", loadingList && "animate-spin")} />
          Refresh Data
        </Button>
      </div>

      {/* KPI METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setStatusFilter("ALL");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "ALL"
              ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-sky-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-[#38BDF8] shrink-0">
            <FileText className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Laporan</p>
            <p className="text-xl font-bold tracking-tight text-foreground">{summary.total}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("WAITING_FIELD_OFFICER_VERIFICATION");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "WAITING_FIELD_OFFICER_VERIFICATION"
              ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-amber-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Menunggu Verifikasi</p>
            <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{summary.waiting}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("NEEDS_FIELD_OFFICER_REVIEW");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "NEEDS_FIELD_OFFICER_REVIEW"
              ? "border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-rose-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertCircle className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Perlu Review</p>
            <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{summary.review}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setStatusFilter("VERIFIED_BY_FIELD_OFFICER");
            setPage(1);
          }}
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98]",
            statusFilter === "VERIFIED_BY_FIELD_OFFICER" || statusFilter === "METADATA_RECORDED"
              ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40",
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
            <FileCheck className="size-5" />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Terverifikasi / Baket</p>
            <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{summary.verified}</p>
          </div>
        </button>
      </div>

      {/* FULL TABLE VIEW CONTAINER */}
      <Card className="border border-slate-200/80 dark:border-white/10 bg-card rounded-xl shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold uppercase tracking-wide flex items-center gap-2">
                <FileText className="size-4 text-sky-600 dark:text-[#38BDF8]" />
                Daftar Laporan Jaring ({filteredReports.length})
              </CardTitle>
              <CardDescription className="text-xs">
                Tabel utama laporan masuk yang diajukan oleh Jaring binaan Petugas Lapangan.
              </CardDescription>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Input */}
              <div className="relative min-w-[240px]">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Cari referensi, judul, jaring..."
                  className="pl-8 h-8 text-xs bg-background"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Status Filter Dropdown */}
              <NativeSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="h-8 text-xs bg-background min-w-[180px]"
              >
                <option value="ALL">Semua Status Verifikasi</option>
                <option value="WAITING_FIELD_OFFICER_VERIFICATION">Menunggu Verifikasi</option>
                <option value="NEEDS_FIELD_OFFICER_REVIEW">Perlu Review</option>
                <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi (Siap Baket)</option>
                <option value="METADATA_RECORDED">Metadata & Baket Tersimpan</option>
              </NativeSelect>
            </div>
          </div>
        </CardHeader>

        {/* MAIN DATA TABLE */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-900/40">
              <TableRow className="border-b border-slate-200/80 dark:border-white/10 hover:bg-transparent">
                <TableHead className="w-12 text-center text-xs font-semibold uppercase tracking-wider">No</TableHead>
                <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider">No. Referensi</TableHead>
                <TableHead className="min-w-[240px] text-xs font-semibold uppercase tracking-wider">Judul & Isi Laporan</TableHead>
                <TableHead className="w-40 text-xs font-semibold uppercase tracking-wider">Pengirim (Jaring)</TableHead>
                <TableHead className="w-48 text-xs font-semibold uppercase tracking-wider">Status Verifikasi</TableHead>
                <TableHead className="w-44 text-xs font-semibold uppercase tracking-wider">Waktu Masuk</TableHead>
                <TableHead className="w-32 text-center text-xs font-semibold uppercase tracking-wider">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-white/5">
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground font-mono">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-[#38BDF8]" />
                      Memuat data laporan...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedReports.length > 0 ? (
                paginatedReports.map((item, idx) => {
                  const itemIndex = (page - 1) * limit + idx + 1;
                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/50 transition-colors"
                    >
                      <TableCell className="text-center font-mono text-xs text-muted-foreground">{itemIndex}</TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-xs text-sky-600 dark:text-[#38BDF8]">
                          {item.referenceNumber || item.id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-xs text-foreground line-clamp-1">
                            {item.title || "Laporan Jaring"}
                          </p>
                          {item.content ? (
                            <p className="text-[11px] text-muted-foreground line-clamp-1 font-normal">
                              {item.content}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <User className="size-3.5 text-sky-600 dark:text-[#38BDF8] shrink-0" />
                          {item.jaringAlias || item.jaringCode || "Jaring"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            verificationStatusBadgeVariant(item.verificationStatus),
                          )}
                        >
                          {verificationStatusLabel(item.verificationStatus)}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.submittedAt || item.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-8 px-2.5 text-xs rounded-lg gap-1.5 font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-[#38BDF8]"
                        >
                          <Link href={`/dashboard/field-officer/laporan-jaring/${item.id}`}>
                            <Eye className="size-3.5" />
                            Detail
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-xs text-muted-foreground space-y-2">
                    <FileText className="size-8 mx-auto text-muted-foreground/40" />
                    <p>Tidak ada laporan yang sesuai filter.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* TABLE PAGINATION FOOTER */}
        <TablePagination
          page={page}
          limit={limit}
          total={filteredReports.length}
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          loading={loadingList}
        />
      </Card>
    </main>
  );
}
