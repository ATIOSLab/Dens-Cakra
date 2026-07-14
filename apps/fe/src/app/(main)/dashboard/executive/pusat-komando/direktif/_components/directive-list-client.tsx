"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Plus,
  RadioTower,
  ShieldCheck,
  Users,
  X,
  RotateCcw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildDirectiveUukSummary, parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import type { DirectiveSummary } from "@/features/directives/types";

import { badgeVariant, formatDate, getCurrentVersion } from "./directive-shared";

function translateDirectiveStatus(status: string) {
  const statuses: Record<string, string> = {
    DRAFT: "Draf",
    PUBLISHED: "Diterbitkan",
    DISTRIBUTED: "Terdistribusi",
    ACKNOWLEDGED: "Diterima",
    COMPLETED: "Selesai",
    FAILED: "Gagal",
    CANCELLED: "Dibatalkan",
    REVISION_REQUESTED: "Perlu Revisi",
  };
  return statuses[status.toUpperCase()] ?? status;
}

function statusBadgeClass(status: string) {
  const upper = status.toUpperCase();
  if (["CANCELLED", "FAILED"].includes(upper)) {
    return "border-[var(--dc-danger)]/30 bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
  }

  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(upper)) {
    return "border-[var(--dc-success)]/30 bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
  }

  if (["DRAFT", "REVISION_REQUESTED"].includes(upper)) {
    return "border-[var(--dc-warning)]/30 bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
  }

  return "border-[var(--dc-primary)]/30 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
}

function getDirectiveUnitType(directive: DirectiveSummary): "BINDA" | "DIREKTORAT" | "OTHER" {
  const ownerName = directive.ownerUnit?.name?.toLowerCase() ?? "";
  if (ownerName.includes("binda")) return "BINDA";
  if (ownerName.includes("direktorat") || ownerName.includes("direktur")) return "DIREKTORAT";

  const currentVersion = getCurrentVersion(directive);
  if (currentVersion?.recipients) {
    for (const r of currentVersion.recipients) {
      const name = r.targetUnit?.name?.toLowerCase() ?? "";
      if (name.includes("binda")) return "BINDA";
      if (name.includes("direktorat") || name.includes("direktur")) return "DIREKTORAT";
    }
  }

  return "OTHER";
}

type DirectiveListClientProps = {
  directives: DirectiveSummary[];
};

export function DirectiveListClient({ directives }: DirectiveListClientProps) {
  // Filter States
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterClassification, setFilterClassification] = useState("ALL");
  const [filterWilayah, setFilterWilayah] = useState("ALL");
  const [filterUnit, setFilterUnit] = useState("ALL");

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dynamic filter lists
  const uniqueWilayahs = useMemo(() => {
    const list = new Set<string>();
    for (const d of directives) {
      const cv = getCurrentVersion(d);
      if (cv?.targetAreas) {
        for (const ta of cv.targetAreas) {
          if (ta.area?.name) list.add(ta.area.name);
        }
      }
    }
    return Array.from(list).sort();
  }, [directives]);

  // Apply dynamic filters
  const filteredDirectives = useMemo(() => {
    return directives.filter((directive) => {
      const currentVersion = getCurrentVersion(directive);

      // 1. Date range filter based on commandDate (created date)
      if (currentVersion?.commandDate) {
        const cmdDate = new Date(currentVersion.commandDate);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          if (cmdDate < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (cmdDate > end) return false;
        }
      } else if (startDate || endDate) {
        return false;
      }

      // 2. Classification filter
      if (filterClassification !== "ALL") {
        if (currentVersion?.classification?.toUpperCase() !== filterClassification) {
          return false;
        }
      }

      // 3. Wilayah filter
      if (filterWilayah !== "ALL") {
        const hasWilayah = currentVersion?.targetAreas.some(
          (ta) => ta.area?.name === filterWilayah,
        );
        if (!hasWilayah) return false;
      }

      // 4. Unit filter (BINDA / DIREKTORAT)
      if (filterUnit !== "ALL") {
        const unitType = getDirectiveUnitType(directive);
        if (unitType !== filterUnit) {
          return false;
        }
      }

      return true;
    });
  }, [directives, startDate, endDate, filterClassification, filterWilayah, filterUnit]);

  const totalRows = filteredDirectives.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const paginatedDirectives = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredDirectives.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredDirectives, currentPage, rowsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handleRowsPerPageChange = (val: number) => {
    setRowsPerPage(val);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterClassification("ALL");
    setFilterWilayah("ALL");
    setFilterUnit("ALL");
    setCurrentPage(1);
  };

  return (
    <div className="executive-command-page space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between px-1">
        <div className="max-w-3xl space-y-1.5">
          <div className="executive-command-page__eyebrow flex items-center gap-2">
            <RadioTower className="size-4" />
            Pusat Komando Eksekutif
          </div>
          <div className="space-y-1">
            <h1 className="font-semibold text-xl tracking-tight md:text-2xl">STR / Direktif Strategis</h1>
          </div>
        </div>

        <Button
          asChild
          className="h-8 rounded-[var(--dc-radius-md)] bg-[var(--dc-primary)] px-3 font-semibold text-[var(--dc-text-inverse)] shadow-none hover:bg-[var(--dc-primary-hover)] shrink-0"
        >
          <Link href="/dashboard/executive/pusat-komando/direktif/baru">
            <Plus className="size-4" />
            Buat STR Baru
          </Link>
        </Button>
      </div>

      <Card className="executive-command-page__card">
        <CardHeader className="gap-2 px-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-semibold text-lg">Daftar STR Aktif</CardTitle>
              <CardDescription className="max-w-2xl text-[var(--dc-text-secondary)]">
                Gunakan tabel ini untuk review draft, publish, distribusi, dan tracking tindak lanjut.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {/* Filter Panel Grid */}
        <div className="grid grid-cols-1 gap-4 border-b border-[var(--dc-border-subtle)]/65 px-4 pb-5 md:px-5 lg:grid-cols-5">
          {/* Periode Laporan */}
          <div className="space-y-1.5 lg:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Periode Laporan</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="h-9 w-full rounded-[var(--dc-radius-sm)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] px-3 text-[12px] text-foreground outline-none focus:border-[var(--dc-primary)]"
                aria-label="Tanggal Mulai"
              />
              <span className="text-[12px] text-muted-foreground">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="h-9 w-full rounded-[var(--dc-radius-sm)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] px-3 text-[12px] text-foreground outline-none focus:border-[var(--dc-primary)]"
                aria-label="Tanggal Selesai"
              />
            </div>
          </div>

          {/* Klasifikasi */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Klasifikasi</label>
            <Select
              value={filterClassification}
              onValueChange={(val) => { setFilterClassification(val); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-9 w-full border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[12px] text-foreground">
                <SelectValue placeholder="Semua Klasifikasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Klasifikasi</SelectItem>
                <SelectItem value="BIASA">BIASA</SelectItem>
                <SelectItem value="TERBATAS">TERBATAS</SelectItem>
                <SelectItem value="RAHASIA">RAHASIA</SelectItem>
                <SelectItem value="SANGAT RAHASIA">SANGAT RAHASIA</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wilayah */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Wilayah</label>
            <Select
              value={filterWilayah}
              onValueChange={(val) => { setFilterWilayah(val); setCurrentPage(1); }}
            >
              <SelectTrigger className="h-9 w-full border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[12px] text-foreground">
                <SelectValue placeholder="Semua Wilayah" />
              </SelectTrigger>
              <SelectContent className="max-h-[260px] overflow-y-auto">
                <SelectItem value="ALL">Semua Wilayah</SelectItem>
                {uniqueWilayahs.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Kerja */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unit Kerja</label>
            <div className="flex gap-2">
              <Select
                value={filterUnit}
                onValueChange={(val) => { setFilterUnit(val); setCurrentPage(1); }}
              >
                <SelectTrigger className="h-9 w-full border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[12px] text-foreground">
                  <SelectValue placeholder="Semua Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Unit</SelectItem>
                  <SelectItem value="BINDA">Binda saja</SelectItem>
                  <SelectItem value="DIREKTORAT">Direktorat saja</SelectItem>
                </SelectContent>
              </Select>
              {(startDate || endDate || filterClassification !== "ALL" || filterWilayah !== "ALL" || filterUnit !== "ALL") && (
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="h-9 px-2.5 border-[var(--dc-border-subtle)] text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 flex items-center gap-1.5 text-[12px] font-semibold"
                  title="Reset Filter"
                >
                  <RotateCcw className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>

        <CardContent className="px-4 md:px-5">
          <div className="executive-command-page__table">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Nomor STR</TableHead>
                  <TableHead>Judul UUK/STR</TableHead>
                  <TableHead>Klasifikasi</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Penugasan</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDirectives.length ? (
                  paginatedDirectives.map((directive) => {
                    const currentVersion = getCurrentVersion(directive);
                    const parsed = parseDirectiveCommandDescription(currentVersion?.commandDescription);
                    const title = parsed.uukTitle || directive.commandNumber;
                    const areaSummary =
                      currentVersion?.targetAreas
                        .slice(0, 2)
                        .map((item) => item.area.name)
                        .join(", ") ?? "-";

                    return (
                      <TableRow key={directive.id}>
                        <TableCell className="pl-4 font-semibold text-[var(--dc-text-primary)]">
                          {directive.commandNumber}
                        </TableCell>
                        <TableCell className="max-w-[24rem] whitespace-normal">
                          <div className="space-y-1">
                            <div className="font-semibold text-[var(--dc-text-primary)]">{title}</div>
                            <div className="line-clamp-2 text-[var(--dc-text-secondary)] text-xs leading-5">
                              {buildDirectiveUukSummary(parsed.uukSections) || "Belum ada ringkasan UUK."}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="executive-command-page__classification">
                            {currentVersion?.classification ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[18rem] whitespace-normal text-[var(--dc-text-secondary)]">
                          {areaSummary}
                        </TableCell>
                        <TableCell className="text-[var(--dc-text-secondary)]">
                          {currentVersion?.recipients.length ?? 0} penugasan
                        </TableCell>
                        <TableCell className="text-[var(--dc-text-secondary)]">
                          {formatDate(currentVersion?.dueDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={badgeVariant(directive.status)}
                            className={statusBadgeClass(directive.status)}
                          >
                            {translateDirectiveStatus(directive.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                            >
                              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}`}>
                                Detail
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                            >
                              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-[var(--dc-primary)]/40 text-[var(--dc-primary)] hover:bg-[var(--dc-primary-soft)] hover:text-[var(--dc-primary-pressed)]"
                            >
                              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/tracking`}>
                                Tracking
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-[var(--dc-text-secondary)]">
                      Tidak ada data STR yang cocok dengan kriteria filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Premium Glassmorphic Table Pagination Footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--dc-border-subtle)]/70 pt-4 mt-4 text-[12px] text-muted-foreground select-none">
            <div className="font-medium">
              Menampilkan <span className="font-semibold text-foreground">{totalRows > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> -{" "}
              <span className="font-semibold text-foreground">{Math.min(currentPage * rowsPerPage, totalRows)}</span> dari{" "}
              <span className="font-semibold text-foreground">{totalRows}</span> direktif
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <span>Baris per halaman:</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(val) => handleRowsPerPageChange(Number(val))}
                >
                  <SelectTrigger className="h-8 w-24 border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[12px] font-semibold">
                    <SelectValue placeholder="10 baris" />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30, 40, 50].map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt} baris
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1 font-mono">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="h-8 w-8 p-0 border-[var(--dc-border-subtle)] hover:bg-muted"
                  title="Halaman Pertama"
                >
                  <ChevronsLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  className="h-8 w-8 p-0 border-[var(--dc-border-subtle)] hover:bg-muted"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className="text-[11px] px-3 font-semibold text-foreground/80">
                  Halaman {currentPage} dari {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  className="h-8 w-8 p-0 border-[var(--dc-border-subtle)] hover:bg-muted"
                  title="Halaman Berikutnya"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(totalPages)}
                  className="h-8 w-8 p-0 border-[var(--dc-border-subtle)] hover:bg-muted"
                  title="Halaman Terakhir"
                >
                  <ChevronsRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
