"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  MapPin,
  Phone,
  Search,
  ShieldAlert,
  Signal,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { PersonnelJaringItem, PersonnelListItem, PersonnelMapPayload } from "./executive-personnel-types";

export type PersonnelKpiModalType = "jaring" | "personnel" | "online" | "offline";

interface PersonnelKpiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiType: PersonnelKpiModalType | null;
  selectedOfficer?: PersonnelListItem | null;
  items: PersonnelListItem[];
  allVerifiedJarings: (PersonnelJaringItem & { officerName?: string })[];
  freshness?: PersonnelMapPayload["meta"]["freshness"];
  scopeLabel?: string;
}

const PAGE_SIZE = 15;

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "Belum ada laporan";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Belum ada laporan";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function isJaringActive(jaring: PersonnelJaringItem): boolean {
  if (!jaring.lastReportAt) return false;
  const reportedAt = new Date(jaring.lastReportAt).getTime();
  if (!Number.isFinite(reportedAt)) return false;
  return Date.now() - reportedAt <= 90 * 24 * 60 * 60 * 1000;
}

function isPersonnelOnline(item: PersonnelListItem, freshness?: PersonnelMapPayload["meta"]["freshness"]) {
  if (!item.lastLocation?.capturedAt) return false;
  const capturedAt = new Date(item.lastLocation.capturedAt).getTime();
  const windowMinutes = freshness?.activeWithinMinutes ?? 15;
  return Date.now() - capturedAt <= windowMinutes * 60 * 1000;
}

function getModalTitle(kpiType: PersonnelKpiModalType | null, selectedOfficer?: PersonnelListItem | null): string {
  if (selectedOfficer) {
    return `Jaring Binaan — ${selectedOfficer.fullName ?? selectedOfficer.username}`;
  }
  if (kpiType === "jaring") {
    return "Daftar Jaring Binaan Terverifikasi";
  }
  if (kpiType === "online") {
    return "Petugas Wilayah (Gaswil) — Sinyal Aktif";
  }
  if (kpiType === "offline") {
    return "Petugas Wilayah (Gaswil) — Belum Tersambung";
  }
  return "Daftar Petugas Wilayah (Gaswil)";
}

function getModalDescription(
  kpiType: PersonnelKpiModalType | null,
  selectedOfficer?: PersonnelListItem | null,
  totalCount = 0,
  scopeLabel = "cakupan wilayah",
): string {
  if (selectedOfficer) {
    return `Menampilkan ${totalCount} Jaring binaan terverifikasi yang berada di bawah pembinaan ${selectedOfficer.fullName ?? selectedOfficer.username}.`;
  }
  if (kpiType === "jaring") {
    return `Menampilkan seluruh Jaring binaan berstatus terverifikasi (APPROVED) dalam ${scopeLabel}.`;
  }
  if (kpiType === "online") {
    return "Personel Petugas Wilayah yang terhubung dan mengirimkan sinyal aktif.";
  }
  if (kpiType === "offline") {
    return "Personel Petugas Wilayah yang belum tersambung atau berada di luar ambang sinyal aktif.";
  }
  return `Seluruh personel Petugas Wilayah (Gaswil) dalam ${scopeLabel}.`;
}

function renderModalIcon(kpiType: PersonnelKpiModalType | null, isJaringMode: boolean) {
  if (isJaringMode) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
        <DOMAIN_VISUALS.jaring.Icon className="size-4" />
      </div>
    );
  }
  if (kpiType === "online") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <Signal className="size-4" />
      </div>
    );
  }
  if (kpiType === "offline") {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <ShieldAlert className="size-4" />
      </div>
    );
  }
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
      <Users className="size-4" />
    </div>
  );
}

export function PersonnelKpiModal({
  open,
  onOpenChange,
  kpiType,
  selectedOfficer,
  items,
  allVerifiedJarings,
  freshness,
  scopeLabel = "cakupan wilayah",
}: PersonnelKpiModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);

  // Determine modal jarings pool
  const sourceJarings = useMemo(() => {
    if (selectedOfficer) {
      const officerName = selectedOfficer.fullName ?? selectedOfficer.username ?? "-";
      return (selectedOfficer.jaringPreview ?? [])
        .filter((j) => !j.registrationStatus || j.registrationStatus === "APPROVED")
        .map((j) => ({ ...j, officerName }));
    }
    return allVerifiedJarings;
  }, [selectedOfficer, allVerifiedJarings]);

  // Filtered jarings
  const filteredJarings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sourceJarings.filter((jaring) => {
      const active = isJaringActive(jaring);
      if (statusFilter === "ACTIVE" && !active) return false;
      if (statusFilter === "INACTIVE" && active) return false;

      if (!q) return true;
      const alias = (jaring.aliasName ?? "").toLowerCase();
      const name = (jaring.fullName ?? "").toLowerCase();
      const phone = (jaring.whatsappNumber ?? "").toLowerCase();
      const officer = (jaring.officerName ?? "").toLowerCase();
      const area = (jaring.areaCoverages?.[0]?.area?.name ?? jaring.address ?? "").toLowerCase();

      return alias.includes(q) || name.includes(q) || phone.includes(q) || officer.includes(q) || area.includes(q);
    });
  }, [sourceJarings, searchQuery, statusFilter]);

  // Jarings stats
  const jaringStats = useMemo(() => {
    const total = sourceJarings.length;
    const active = sourceJarings.filter(isJaringActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [sourceJarings]);

  // Filtered personnel
  const filteredPersonnel = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((personnel) => {
      const online = isPersonnelOnline(personnel, freshness);
      if (kpiType === "online" && !online) return false;
      if (kpiType === "offline" && online) return false;

      if (!q) return true;
      const name = (personnel.fullName ?? personnel.username ?? "").toLowerCase();
      const phone = (personnel.phone ?? "").toLowerCase();
      const email = (personnel.email ?? "").toLowerCase();
      const title = (personnel.assignment?.title ?? "").toLowerCase();
      const area = (personnel.assignment?.areas?.[0]?.name ?? "").toLowerCase();

      return name.includes(q) || phone.includes(q) || email.includes(q) || title.includes(q) || area.includes(q);
    });
  }, [items, kpiType, freshness, searchQuery]);

  const isJaringMode = kpiType === "jaring" || Boolean(selectedOfficer);

  // Pagination slice
  const totalItemsCount = isJaringMode ? filteredJarings.length : filteredPersonnel.length;
  const totalPages = Math.max(1, Math.ceil(totalItemsCount / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginatedJarings = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredJarings.slice(start, start + PAGE_SIZE);
  }, [filteredJarings, currentPage]);

  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredPersonnel.slice(start, start + PAGE_SIZE);
  }, [filteredPersonnel, currentPage]);

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setPage(1);
  };

  const handleClose = () => {
    resetFilters();
    onOpenChange(false);
  };

  if (!open || !kpiType) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex flex-col gap-0 p-0 sm:p-0 w-[96vw] max-w-[96vw] sm:max-w-[96vw] md:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[88vh] max-h-[92vh] overflow-hidden border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 rounded-xl"
        showCloseButton={false}
      >
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {renderModalIcon(kpiType, isJaringMode)}
                <DialogTitle className="font-bold text-lg sm:text-xl text-slate-900 dark:text-slate-100 tracking-tight">
                  {getModalTitle(kpiType, selectedOfficer)}
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {getModalDescription(kpiType, selectedOfficer, jaringStats.total, scopeLabel)}
              </DialogDescription>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="size-8 rounded-lg text-slate-500 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0"
              aria-label="Tutup"
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Action & Filter Bar */}
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  isJaringMode
                    ? "Cari nama Jaring, alias, kontak WhatsApp, wilayah..."
                    : "Cari nama Gaswil, kontak HP, jabatan, wilayah..."
                }
                className="h-9 pl-9 text-xs sm:text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800"
              />
            </div>

            {/* Quick Filter Buttons (only for Jaring mode) */}
            {isJaringMode ? (
              <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto">
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === "ALL" ? "default" : "outline"}
                  onClick={() => {
                    setStatusFilter("ALL");
                    setPage(1);
                  }}
                  className="h-8 text-xs font-medium"
                >
                  Semua ({jaringStats.total})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === "ACTIVE" ? "default" : "outline"}
                  onClick={() => {
                    setStatusFilter("ACTIVE");
                    setPage(1);
                  }}
                  className={cn(
                    "h-8 text-xs font-medium",
                    statusFilter === "ACTIVE"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20",
                  )}
                >
                  Aktif ({jaringStats.active})
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={statusFilter === "INACTIVE" ? "default" : "outline"}
                  onClick={() => {
                    setStatusFilter("INACTIVE");
                    setPage(1);
                  }}
                  className={cn(
                    "h-8 text-xs font-medium",
                    statusFilter === "INACTIVE"
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-50 dark:hover:bg-amber-950/20",
                  )}
                >
                  Tidak Aktif ({jaringStats.inactive})
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                <span>Total: {totalItemsCount} personel</span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Modal Body - Table List */}
        <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/40 p-3 sm:p-4">
          {isJaringMode ? (
            /* JARING TABLE */
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center text-xs font-mono uppercase text-slate-500">No</TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Jaring</TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Kontak WhatsApp</TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">
                      Petugas Wilayah (Gaswil)
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Wilayah Penempatan</TableHead>
                    <TableHead className="text-center text-xs font-mono uppercase text-slate-500">
                      Status Operasional
                    </TableHead>
                    <TableHead className="text-center text-xs font-mono uppercase text-slate-500">
                      Laporan Terakhir
                    </TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Riwayat Pembinaan</TableHead>
                    <TableHead className="w-24 text-center text-xs font-mono uppercase text-slate-500">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedJarings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <Users className="mx-auto size-8 opacity-30 mb-2" />
                        <p className="font-semibold text-sm">Tidak ada data Jaring yang sesuai kriteria</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Coba sesuaikan kata kunci pencarian atau filter status.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedJarings.map((jaring, idx) => {
                      const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      const active = isJaringActive(jaring);
                      const areaName = jaring.areaCoverages?.[0]?.area?.name ?? jaring.address ?? "-";
                      const officer =
                        jaring.officerName ??
                        jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile?.fullName ??
                        "-";

                      return (
                        <TableRow
                          key={jaring.id}
                          className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <TableCell className="text-center font-mono text-xs text-slate-400">{rowNum}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                {jaring.fullName ?? jaring.aliasName ?? "Tanpa Nama"}
                              </span>
                              {jaring.aliasName ? (
                                <span className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                                  #{jaring.aliasName}
                                </span>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            {jaring.whatsappNumber ? (
                              <a
                                href={`https://wa.me/${jaring.whatsappNumber.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:underline"
                              >
                                <Phone className="size-3 shrink-0" />
                                {jaring.whatsappNumber}
                              </a>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{officer}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <MapPin className="size-3.5 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[220px]">{areaName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                active
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20",
                              )}
                            >
                              <span
                                className={cn("size-1.5 rounded-full", active ? "bg-emerald-500" : "bg-slate-400")}
                              />
                              {active ? "Aktif" : "Tidak Aktif"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs text-slate-500">
                            {formatRelativeDate(jaring.lastReportAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 min-w-[130px]">
                              {(jaring.coachingCount ?? 0) > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="w-fit border-sky-500/40 bg-sky-500/10 font-semibold text-[10px] text-sky-600 dark:text-sky-400"
                                >
                                  {jaring.coachingCount} Pembinaan
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-slate-400">Belum ada</span>
                              )}
                              <Link
                                href={`/dashboard/laporan-pembinaan-jaring?search=${encodeURIComponent(jaring.aliasName ?? jaring.fullName ?? "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-700 hover:underline dark:text-sky-400"
                                title="Buka Riwayat Pembinaan Jaring di tab baru"
                              >
                                <FileText className="size-3" />
                                <span>Lihat Riwayat</span>
                              </Link>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button asChild size="sm" variant="ghost" className="size-8 p-0">
                              <Link
                                href={`/dashboard/daftar-jaring/${jaring.id}`}
                                title="Lihat detail Jaring"
                                className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                              >
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* PERSONNEL TABLE */
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <Table className="min-w-[850px]">
                <TableHeader className="bg-slate-100/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center text-xs font-mono uppercase text-slate-500">No</TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Petugas Wilayah</TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Kontak (HP / Email)</TableHead>
                    <TableHead className="text-xs font-mono uppercase text-slate-500">Wilayah Penugasan</TableHead>
                    <TableHead className="text-center text-xs font-mono uppercase text-slate-500">
                      Jumlah Jaring
                    </TableHead>
                    <TableHead className="text-center text-xs font-mono uppercase text-slate-500">
                      Status Sinyal
                    </TableHead>
                    <TableHead className="w-24 text-center text-xs font-mono uppercase text-slate-500">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPersonnel.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                        <Users className="mx-auto size-8 opacity-30 mb-2" />
                        <p className="font-semibold text-sm">Tidak ada Petugas Wilayah yang sesuai kriteria</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPersonnel.map((personnel, idx) => {
                      const rowNum = (currentPage - 1) * PAGE_SIZE + idx + 1;
                      const online = isPersonnelOnline(personnel, freshness);
                      const area = personnel.assignment?.areas?.[0]?.name ?? "-";

                      return (
                        <TableRow
                          key={personnel.id}
                          className="border-b border-slate-100 hover:bg-slate-50/80 dark:border-slate-800/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <TableCell className="text-center font-mono text-xs text-slate-400">{rowNum}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                                {personnel.fullName ?? personnel.username ?? "Tanpa Nama"}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {personnel.assignment?.title ?? "Petugas Wilayah"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col font-mono text-xs">
                              {personnel.phone ? (
                                <span className="text-slate-700 dark:text-slate-300">{personnel.phone}</span>
                              ) : null}
                              <span className="text-[11px] text-slate-400">{personnel.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                              <MapPin className="size-3.5 shrink-0 text-slate-400" />
                              <span className="truncate max-w-[220px]">{area}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="inline-flex items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-xs font-semibold text-cyan-600 dark:text-cyan-300">
                              {personnel.jaringCount ?? 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                                online
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20",
                              )}
                            >
                              <span
                                className={cn("size-1.5 rounded-full", online ? "bg-emerald-500" : "bg-slate-400")}
                              />
                              {online ? "Online" : "Offline"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button asChild size="sm" variant="ghost" className="size-8 p-0">
                              <Link
                                href={`/dashboard/daftar-petugas-wilayah/${personnel.id}`}
                                title="Lihat profil personel"
                                className="text-cyan-600 hover:text-cyan-700 dark:text-cyan-400"
                              >
                                <Eye className="size-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Modal Footer with Pagination */}
        {totalPages > 1 ? (
          <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
            <span className="text-xs text-slate-500 font-mono">
              Menampilkan {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalItemsCount)} dari{" "}
              {totalItemsCount} data
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 text-xs"
              >
                Sebelumnya
              </Button>
              <span className="text-xs font-mono font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 text-xs"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
