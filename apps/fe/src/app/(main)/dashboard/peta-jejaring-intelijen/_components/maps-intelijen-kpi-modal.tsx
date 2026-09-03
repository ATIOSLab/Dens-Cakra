"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { Activity, AlertCircle, ExternalLink, Eye, FileText, Radio, Search, UserMinus, Users, X } from "lucide-react";

import type {
  PriorityLevel,
  VerificationStatus,
} from "@/app/(main)/dashboard/laporan-jaring/_components/laporan-jaring-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import {
  getUrgencyBadgeClass,
  getVerificationStatusBadgeClass,
  getVerificationStatusLabel,
} from "@/lib/domain/operational-presentation";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { KpiCardKey } from "./maps-intelijen-stats";
import type { MapNetworkFeature, MapNetworkFilters, MapNetworkResponse } from "./maps-intelijen-types";

interface MapsIntelijenKpiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpiKey: KpiCardKey | null;
  meta: MapNetworkResponse["meta"];
  features: MapNetworkFeature[];
  filters: MapNetworkFilters;
  periodLabel: string;
  scopeLabel: string;
  onOpenDetail?: (feature: MapNetworkFeature) => void;
}

type ServerJaringItem = {
  id: string;
  aliasName?: string | null;
  fullName?: string | null;
  whatsappNumber?: string | null;
  status?: string | null;
  registrationStatus?: string | null;
  lastReportAt?: string | null;
  caretakerAssignments?: Array<{
    fieldOfficerAssignment?: {
      userProfile?: { fullName?: string | null; username?: string | null } | null;
    } | null;
  }>;
  areaCoverages?: Array<{
    isPrimary?: boolean;
    area?: {
      id: string;
      name: string;
      level?: string;
      parent?: {
        name: string;
        parent?: {
          name: string;
        };
      };
    } | null;
  }>;
  occupation?: {
    name?: string | null;
  } | null;
};

type ReportRow = {
  id: string;
  reportId?: string;
  referenceNumber: string;
  displayTitle: string;
  jaringName: string;
  jaringCode: string;
  gaswilName: string;
  areaName: string;
  reportedAt: string | null;
  urgency: PriorityLevel | "NORMAL";
  verificationStatus: VerificationStatus | "WAITING";
  feature?: MapNetworkFeature;
};

type ReportingJaringRow = {
  id: string;
  name: string;
  code: string;
  whatsappNumber: string;
  gaswilName: string;
  placementAreaName: string;
  reportCount: number;
  latestReportAt: string | null;
};

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

export function MapsIntelijenKpiModal({
  open,
  onOpenChange,
  kpiKey,
  meta,
  features,
  filters,
  periodLabel: activePeriodLabel,
  scopeLabel,
  onOpenDetail,
}: MapsIntelijenKpiModalProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [serverJarings, setServerJarings] = useState<ServerJaringItem[]>([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Reset pagination & search when modal opens or key changes
  useEffect(() => {
    if (open) {
      setSearch("");
      setPage(1);
    }
  }, [open]);

  // Fetch /jaring if the selected KPI key is verified, active, or inactive
  useEffect(() => {
    if (!open || !kpiKey || !["verified", "active", "inactive"].includes(kpiKey)) {
      return;
    }

    const controller = new AbortController();
    setLoadingServer(true);
    setServerError(null);

    async function loadJaringData() {
      try {
        const selectedAreaId = [filters.villageId, filters.districtId, filters.regencyId, filters.provinceId].find(
          (id) => id !== "ALL",
        );

        const query: Record<string, string | number> = {
          registrationStatus: "APPROVED",
          limit: 300,
        };

        if (kpiKey === "active") query.status = "ACTIVE";
        if (kpiKey === "inactive") query.status = "INACTIVE";
        if (selectedAreaId) query.areaId = selectedAreaId;

        const data = await apiBrowserFetch<ServerJaringItem[]>("/jaring", {
          query,
          init: { signal: controller.signal },
        });

        if (!controller.signal.aborted) {
          setServerJarings(data ?? []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setServerError(err instanceof Error ? err.message : "Gagal memuat rincian data Jaring dari server.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingServer(false);
        }
      }
    }

    void loadJaringData();

    return () => {
      controller.abort();
    };
  }, [open, kpiKey, filters.provinceId, filters.regencyId, filters.districtId, filters.villageId]);

  // Modal Header Metadata
  const modalMeta = useMemo(() => {
    switch (kpiKey) {
      case "verified":
        return {
          title: "Daftar Jaring Terverifikasi",
          subtitle: `Jaring yang telah disetujui dan aktif dalam cakupan hak akses (${scopeLabel}).`,
          count: meta.counts.jaring ?? 0,
          Icon: DOMAIN_VISUALS.jaring.Icon,
          iconClass: DOMAIN_VISUALS.jaring.iconClass,
          badgeColor: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        };
      case "active":
        return {
          title: "Daftar Keaktifan Jaring",
          subtitle: `Jaring terverifikasi yang aktif mengirimkan laporan dalam 90 hari terakhir (${scopeLabel}).`,
          count: meta.counts.activeJaring ?? 0,
          Icon: Activity,
          iconClass: "text-emerald-600 dark:text-emerald-400",
          badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "inactive":
        return {
          title: "Daftar Jaring Tidak Aktif",
          subtitle: `Jaring terverifikasi yang belum mengirimkan laporan dalam 90 hari terakhir (${scopeLabel}).`,
          count: meta.counts.inactiveJaring ?? 0,
          Icon: UserMinus,
          iconClass: "text-amber-600 dark:text-amber-400",
          badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "reports":
        return {
          title: "Daftar Total Laporan Jaring",
          subtitle: `Seluruh laporan Jaring sesuai filter dan periode ${activePeriodLabel} (${scopeLabel}).`,
          count: meta.counts.totalReports ?? meta.summary.reports.total ?? 0,
          Icon: DOMAIN_VISUALS.jaringReport.Icon,
          iconClass: DOMAIN_VISUALS.jaringReport.iconClass,
          badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
        };
      case "reporting":
        return {
          title: "Daftar Jaring Melapor",
          subtitle: `Jaring unik yang mengirimkan minimal satu laporan dalam periode ${activePeriodLabel} (${scopeLabel}).`,
          count: meta.counts.reportingJaring ?? 0,
          Icon: Radio,
          iconClass: "text-violet-600 dark:text-violet-400",
          badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30",
        };
      default:
        return {
          title: "Rincian Data",
          subtitle: "Daftar data terkait metrik",
          count: 0,
          Icon: FileText,
          iconClass: "text-muted-foreground",
          badgeColor: "",
        };
    }
  }, [kpiKey, meta, activePeriodLabel, scopeLabel]);

  // Transform reports data from map features and unlocated items
  const reportRows: ReportRow[] = useMemo(() => {
    if (kpiKey !== "reports") return [];

    const mappedRows: ReportRow[] = features
      .filter((f) => f.properties.markerType === "report")
      .map((feature) => {
        const p = feature.properties;
        return {
          id: p.reportId || feature.id,
          reportId: p.reportId,
          referenceNumber: p.referenceNumber || "-",
          displayTitle: p.displayTitle || p.excerpt || "Laporan Jaring",
          jaringName: p.jaring?.name || "Jaring tanpa nama",
          jaringCode: p.jaring?.code || "-",
          gaswilName: p.fieldOfficer?.name || p.jaring?.gaswilName || "-",
          areaName: p.primaryArea?.name || p.matchedAreas?.[0]?.name || "-",
          reportedAt: p.reportedAt || p.receivedAt || null,
          urgency: p.urgency || "NORMAL",
          verificationStatus: p.verificationStatus || "WAITING",
          feature,
        };
      });

    const unlocatedRows: ReportRow[] = (meta.unlocatedItems ?? []).map((item) => ({
      id: item.id,
      reportId: item.id,
      referenceNumber: item.referenceNumber || "-",
      displayTitle: item.title || "Laporan Jaring",
      jaringName: item.jaring?.name || "Jaring tanpa nama",
      jaringCode: item.jaring?.code || "-",
      gaswilName: item.jaring?.gaswilName || "-",
      areaName: item.jaring?.placementArea?.name || "-",
      reportedAt: item.reportedAt || null,
      urgency: "NORMAL",
      verificationStatus: "WAITING",
    }));

    return [...mappedRows, ...unlocatedRows];
  }, [kpiKey, features, meta.unlocatedItems]);

  // Transform unique reporting jarings
  const reportingJaringRows: ReportingJaringRow[] = useMemo(() => {
    if (kpiKey !== "reporting") return [];

    const jaringMap = new Map<string, ReportingJaringRow>();

    const processItem = (
      jaring?: {
        id?: string;
        name?: string;
        code?: string | null;
        whatsappNumber?: string | null;
        gaswilName?: string | null;
        placementArea?: { name?: string | null } | null;
      } | null,
      fieldOfficerName?: string | null,
      reportedAt?: string | null,
    ) => {
      if (!jaring?.id) return;

      const existing = jaringMap.get(jaring.id);
      if (existing) {
        existing.reportCount += 1;
        if (reportedAt && (!existing.latestReportAt || new Date(reportedAt) > new Date(existing.latestReportAt))) {
          existing.latestReportAt = reportedAt;
        }
      } else {
        jaringMap.set(jaring.id, {
          id: jaring.id,
          name: jaring.name || "Jaring tanpa nama",
          code: jaring.code || "-",
          whatsappNumber: jaring.whatsappNumber || "-",
          gaswilName: fieldOfficerName || jaring.gaswilName || "-",
          placementAreaName: jaring.placementArea?.name || "-",
          reportCount: 1,
          latestReportAt: reportedAt || null,
        });
      }
    };

    for (const feature of features) {
      if (feature.properties.markerType === "report") {
        processItem(
          feature.properties.jaring,
          feature.properties.fieldOfficer?.name,
          feature.properties.reportedAt || feature.properties.receivedAt,
        );
      }
    }

    for (const unlocated of meta.unlocatedItems ?? []) {
      processItem(unlocated.jaring, unlocated.jaring?.gaswilName, unlocated.reportedAt);
    }

    return [...jaringMap.values()].sort((a, b) => b.reportCount - a.reportCount);
  }, [kpiKey, features, meta.unlocatedItems]);

  // Filtered rows based on search input
  const normalizedSearch = search.trim().toLowerCase();

  const filteredReports = useMemo(() => {
    if (!normalizedSearch) return reportRows;
    return reportRows.filter(
      (row) =>
        row.referenceNumber.toLowerCase().includes(normalizedSearch) ||
        row.displayTitle.toLowerCase().includes(normalizedSearch) ||
        row.jaringName.toLowerCase().includes(normalizedSearch) ||
        row.jaringCode.toLowerCase().includes(normalizedSearch) ||
        row.gaswilName.toLowerCase().includes(normalizedSearch) ||
        row.areaName.toLowerCase().includes(normalizedSearch),
    );
  }, [reportRows, normalizedSearch]);

  const filteredReportingJarings = useMemo(() => {
    if (!normalizedSearch) return reportingJaringRows;
    return reportingJaringRows.filter(
      (row) =>
        row.name.toLowerCase().includes(normalizedSearch) ||
        row.code.toLowerCase().includes(normalizedSearch) ||
        row.whatsappNumber.toLowerCase().includes(normalizedSearch) ||
        row.gaswilName.toLowerCase().includes(normalizedSearch) ||
        row.placementAreaName.toLowerCase().includes(normalizedSearch),
    );
  }, [reportingJaringRows, normalizedSearch]);

  const filteredServerJarings = useMemo(() => {
    if (!normalizedSearch) return serverJarings;
    return serverJarings.filter((row) => {
      const alias = (row.aliasName ?? "").toLowerCase();
      const fullName = (row.fullName ?? "").toLowerCase();
      const phone = (row.whatsappNumber ?? "").toLowerCase();
      const officer = (
        row.caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile?.fullName ?? ""
      ).toLowerCase();
      const area = (
        row.areaCoverages?.find((c) => c.isPrimary)?.area?.name ??
        row.areaCoverages?.[0]?.area?.name ??
        ""
      ).toLowerCase();
      return (
        alias.includes(normalizedSearch) ||
        fullName.includes(normalizedSearch) ||
        phone.includes(normalizedSearch) ||
        officer.includes(normalizedSearch) ||
        area.includes(normalizedSearch)
      );
    });
  }, [serverJarings, normalizedSearch]);

  // Current list based on active KPI key
  const totalCount = useMemo(() => {
    if (kpiKey === "reports") return filteredReports.length;
    if (kpiKey === "reporting") return filteredReportingJarings.length;
    return filteredServerJarings.length;
  }, [kpiKey, filteredReports.length, filteredReportingJarings.length, filteredServerJarings.length]);

  // Paginated slices
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReports.slice(start, start + limit);
  }, [filteredReports, page, limit]);

  const paginatedReportingJarings = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredReportingJarings.slice(start, start + limit);
  }, [filteredReportingJarings, page, limit]);

  const paginatedServerJarings = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredServerJarings.slice(start, start + limit);
  }, [filteredServerJarings, page, limit]);

  const handleOpenDetail = useCallback(
    (row: ReportRow) => {
      if (row.feature && onOpenDetail) {
        onOpenDetail(row.feature);
        onOpenChange(false);
      }
    },
    [onOpenDetail, onOpenChange],
  );

  const { Icon: HeaderIcon, iconClass, badgeColor } = modalMeta;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[88vh] w-full max-w-5xl flex-col gap-0 p-0 sm:max-h-[85vh]"
        aria-describedby="kpi-modal-description"
      >
        {/* Header */}
        <DialogHeader className="flex flex-col gap-2 border-b p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "grid size-10 place-items-center rounded-xl bg-background/80 shadow-xs ring-1 ring-border",
                  iconClass,
                )}
              >
                <HeaderIcon className="size-5" aria-hidden />
              </span>
              <div>
                <DialogTitle className="font-bold text-lg text-foreground sm:text-xl">{modalMeta.title}</DialogTitle>
                <DialogDescription
                  id="kpi-modal-description"
                  className="mt-0.5 text-xs text-muted-foreground sm:text-sm"
                >
                  {modalMeta.subtitle}
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn("px-3 py-1 font-semibold text-xs tabular-nums shadow-2xs", badgeColor)}
            >
              Total: {modalMeta.count.toLocaleString("id-ID")} Data
            </Badge>
          </div>

          {/* Search bar */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={
                  kpiKey === "reports"
                    ? "Cari nomor referensi, judul, nama jaring, petugas wilayah, atau wilayah..."
                    : "Cari nama jaring, kode alias, nomor WhatsApp, petugas wilayah, atau wilayah..."
                }
                className="pl-9 pr-8 text-xs sm:text-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground hover:bg-muted"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body: Responsive Table List */}
        <div className="flex-1 overflow-y-auto p-0">
          {kpiKey === "reports" && (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-xs">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="min-w-[200px] text-xs">Referensi & Judul Laporan</TableHead>
                  <TableHead className="text-xs">Jaring (Pengirim)</TableHead>
                  <TableHead className="text-xs">Petugas Wilayah</TableHead>
                  <TableHead className="text-xs">Wilayah</TableHead>
                  <TableHead className="text-xs">Waktu Lapor</TableHead>
                  <TableHead className="text-center text-xs">Urgensi</TableHead>
                  <TableHead className="text-center text-xs">Status</TableHead>
                  <TableHead className="w-20 text-center text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileText className="size-8 text-muted-foreground/50" />
                        <p className="font-medium text-sm">Tidak ada laporan yang ditemukan</p>
                        <p className="text-xs">Coba sesuaikan kata kunci pencarian atau filter wilayah.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReports.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-muted/40">
                      <TableCell className="text-center text-muted-foreground text-xs tabular-nums">
                        {(page - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <div className="font-semibold text-foreground text-xs truncate">{row.displayTitle}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{row.referenceNumber}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-xs">{row.jaringName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{row.jaringCode}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.gaswilName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.areaName}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(row.reportedAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] uppercase font-bold", getUrgencyBadgeClass(row.urgency))}
                        >
                          {row.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-medium",
                            getVerificationStatusBadgeClass(row.verificationStatus),
                          )}
                        >
                          {getVerificationStatusLabel(row.verificationStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.feature ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDetail(row)}
                            className="h-7 px-2 text-xs"
                            title="Buka Lembar Detail"
                          >
                            <Eye className="size-3.5 mr-1" />
                            Lihat
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            asChild
                            className="h-7 px-2 text-xs"
                            title="Buka Halaman Laporan"
                          >
                            <Link href={`/dashboard/laporan-jaring/${row.reportId}`}>
                              <ExternalLink className="size-3.5" />
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {kpiKey === "reporting" && (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-xs">
                <TableRow>
                  <TableHead className="w-12 text-center text-xs">No</TableHead>
                  <TableHead className="text-xs">Identitas Jaring</TableHead>
                  <TableHead className="text-xs">Nomor WhatsApp</TableHead>
                  <TableHead className="text-xs">Petugas Wilayah Pembina</TableHead>
                  <TableHead className="text-xs">Wilayah Penempatan</TableHead>
                  <TableHead className="text-center text-xs">Jumlah Laporan</TableHead>
                  <TableHead className="text-xs">Laporan Terakhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReportingJarings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="size-8 text-muted-foreground/50" />
                        <p className="font-medium text-sm">Tidak ada data Jaring melapor</p>
                        <p className="text-xs">Coba sesuaikan kata kunci pencarian atau filter aktif.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReportingJarings.map((row, idx) => (
                    <TableRow key={row.id} className="hover:bg-muted/40">
                      <TableCell className="text-center text-muted-foreground text-xs tabular-nums">
                        {(page - 1) * limit + idx + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-foreground">{row.name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{row.code}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{row.whatsappNumber}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.gaswilName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.placementAreaName}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className="bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold text-xs tabular-nums"
                        >
                          {row.reportCount} Laporan
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                        {formatDateTime(row.latestReportAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {["verified", "active", "inactive"].includes(kpiKey ?? "") && (
            <div>
              {loadingServer ? (
                <div className="py-16 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-xs font-medium">Memuat data Jaring dari server...</p>
                  </div>
                </div>
              ) : serverError ? (
                <div className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-4 m-4 rounded-lg text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{serverError}</span>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/60 backdrop-blur-xs">
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">No</TableHead>
                      <TableHead className="text-xs">Identitas Jaring</TableHead>
                      <TableHead className="text-xs">Nomor WhatsApp</TableHead>
                      <TableHead className="text-xs">Petugas Wilayah Pembina</TableHead>
                      <TableHead className="text-xs">Wilayah Cakupan</TableHead>
                      <TableHead className="text-xs">Pekerjaan</TableHead>
                      <TableHead className="text-center text-xs">Keaktifan (90 Hari)</TableHead>
                      <TableHead className="text-xs">Laporan Terakhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedServerJarings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Users className="size-8 text-muted-foreground/50" />
                            <p className="font-medium text-sm">Tidak ada data Jaring yang sesuai</p>
                            <p className="text-xs">Coba ubah kata kunci pencarian atau cakupan filter.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedServerJarings.map((row, idx) => {
                        const name = row.fullName || row.aliasName || "Jaring tanpa nama";
                        const code = row.aliasName || "-";
                        const officer =
                          row.caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile?.fullName ??
                          row.caretakerAssignments?.[0]?.fieldOfficerAssignment?.userProfile?.username ??
                          "-";
                        const primaryCoverage = row.areaCoverages?.find((c) => c.isPrimary) ?? row.areaCoverages?.[0];
                        const areaName = primaryCoverage?.area?.name ?? "-";
                        const occupation = row.occupation?.name ?? "-";
                        const isActive = row.status === "ACTIVE";

                        return (
                          <TableRow key={row.id} className="hover:bg-muted/40">
                            <TableCell className="text-center text-muted-foreground text-xs tabular-nums">
                              {(page - 1) * limit + idx + 1}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-foreground">{name}</div>
                              <div className="font-mono text-[11px] text-muted-foreground">{code}</div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {row.whatsappNumber || "-"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{officer}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{areaName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{occupation}</TableCell>
                            <TableCell className="text-center">
                              {isActive ? (
                                <Badge
                                  variant="outline"
                                  className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold"
                                >
                                  Aktif
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold"
                                >
                                  Tidak Aktif
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                              {formatDateTime(row.lastReportAt)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </div>

        {/* Table Pagination */}
        <TablePagination
          page={page}
          limit={limit}
          total={totalCount}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
          loading={loadingServer}
        />
      </DialogContent>
    </Dialog>
  );
}
