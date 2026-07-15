"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { ArrowUpRight, FileText, Plus, RadioTower, Search, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildDirectiveUukSummary, parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import type { DirectiveSummary } from "@/features/directives/types";
import { classificationBadgeClass } from "@/lib/classification";

import { badgeVariant, formatDate, getCurrentVersion } from "./directive-shared";

type DirectiveListClientProps = {
  directives: DirectiveSummary[];
};

function statusBadgeClass(status: string) {
  if (["CANCELLED", "FAILED"].includes(status)) {
    return "border-[var(--dc-danger)]/30 bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
  }

  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(status)) {
    return "border-[var(--dc-success)]/30 bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
  }

  if (["DRAFT", "REVISION_REQUESTED"].includes(status)) {
    return "border-[var(--dc-warning)]/30 bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
  }

  return "border-[var(--dc-primary)]/30 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
}

type PremiumKpiCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  progress?: number;
  className?: string;
};

function PremiumKpiCard({
  title,
  value,
  description,
  icon,
  variant = "primary",
  progress,
  className = "",
}: PremiumKpiCardProps) {
  let colorClass = "text-[var(--dc-primary)]";
  let borderLeftClass = "border-l-2 border-l-[var(--dc-primary)]";
  let iconBgClass = "bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
  let shadowClass = "drop-shadow-[0_0_8px_rgba(0,183,255,0.3)]";

  if (variant === "success") {
    colorClass = "text-[var(--dc-success)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-success)]";
    iconBgClass = "bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  } else if (variant === "warning") {
    colorClass = "text-[var(--dc-warning)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-warning)]";
    iconBgClass = "bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]";
  } else if (variant === "danger") {
    colorClass = "text-[var(--dc-danger)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-danger)]";
    iconBgClass = "bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  } else if (variant === "info") {
    colorClass = "text-[var(--dc-info)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-info)]";
    iconBgClass = "bg-[var(--dc-info-soft)] text-[var(--dc-info)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]";
  }

  return (
    <div className={`relative flex flex-col justify-between rounded-xl border border-[var(--dc-border-subtle)] ${borderLeftClass} bg-[var(--dc-card)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-h-[140px] ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">
          {title}
        </div>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 flex flex-col justify-end flex-1">
        <div className={`text-3xl font-bold [font-family:var(--dc-font-metadata)] ${colorClass} ${shadowClass}`}>
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </div>
        
        {progress !== undefined ? (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>Progres</span>
              <span className={colorClass}>{progress}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted/30 overflow-hidden">
              <div
                className={`h-full rounded-full bg-current ${colorClass}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-2 text-[10px] text-muted-foreground leading-tight line-clamp-2">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

function getClassificationStyles(value?: string | null) {
  const norm = (value ?? "").toUpperCase();
  switch (norm) {
    case "BIASA":
      return {
        color: "#3B82F6", // Blue
        bgColor: "#3B82F615",
        borderColor: "#3B82F630",
        label: "BIASA",
      };
    case "TERBATAS":
      return {
        color: "#10B981", // Green
        bgColor: "#10B98115",
        borderColor: "#10B98130",
        label: "TERBATAS",
      };
    case "RAHASIA":
      return {
        color: "#F59E0B", // Yellow/Gold
        bgColor: "#F59E0B15",
        borderColor: "#F59E0B30",
        label: "RAHASIA",
      };
    case "SANGAT_RAHASIA":
      return {
        color: "#EF4444", // Red
        bgColor: "#EF444415",
        borderColor: "#EF444430",
        label: "SANGAT RAHASIA",
      };
    default:
      return {
        color: "#7C8798", // Gray
        bgColor: "#7C879815",
        borderColor: "#7C879830",
        label: value ?? "BIASA",
      };
  }
}

function translateStatus(status: string) {
  const norm = (status ?? "").toUpperCase();
  switch (norm) {
    case "DRAFT":
      return "DRAF";
    case "PUBLISHED":
      return "DITERBITKAN";
    case "DISTRIBUTED":
      return "TERDISTRIBUSI";
    case "ACKNOWLEDGED":
      return "DITERIMA";
    case "COMPLETED":
      return "SELESAI";
    case "REVISION_REQUESTED":
      return "REVISI DIMINTA";
    case "CANCELLED":
      return "DIBATALKAN";
    case "FAILED":
      return "GAGAL";
    default:
      return norm;
  }
}

export function DirectiveListClient({ directives }: DirectiveListClientProps) {
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterClassification, setFilterClassification] = useState("");
  const [filterRegion, setFilterRegion] = useState("");
  const [filterUnitType, setFilterUnitType] = useState("");

  const uniqueRegions = useMemo(() => {
    const set = new Set<string>();
    for (const d of directives) {
      const currentVersion = getCurrentVersion(d);
      if (currentVersion?.targetAreas) {
        for (const ta of currentVersion.targetAreas) {
          if (ta.area?.name) {
            set.add(ta.area.name);
          }
        }
      }
    }
    return Array.from(set).sort();
  }, [directives]);

const totalRecipients = directives.reduce((sum, directive) => {
    return sum + (getCurrentVersion(directive)?.recipients.length ?? 0);
  }, 0);
  const publishedCount = directives.filter((directive) =>
    ["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(directive.status),
  ).length;
  const draftCount = directives.filter((directive) =>
    ["DRAFT", "REVISION_REQUESTED"].includes(directive.status),
  ).length;

  const filteredDirectives = useMemo(() => {
    let result = directives;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((directive) => {
        const currentVersion = getCurrentVersion(directive);
        const parsed = parseDirectiveCommandDescription(currentVersion?.commandDescription);
        const title = parsed.uukTitle || directive.commandNumber;
        const desc = buildDirectiveUukSummary(parsed.uukSections) || "";
        const classification = currentVersion?.classification || "";
        const areaSummary =
          currentVersion?.targetAreas
            .map((item) => item.area.name)
            .join(", ") ?? "";

        return (
          directive.commandNumber.toLowerCase().includes(q) ||
          title.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          classification.toLowerCase().includes(q) ||
          areaSummary.toLowerCase().includes(q)
        );
      });
    }

    if (filterClassification) {
      result = result.filter((d) => {
        const currentVersion = getCurrentVersion(d);
        return currentVersion?.classification === filterClassification;
      });
    }

    if (filterRegion) {
      result = result.filter((d) => {
        const currentVersion = getCurrentVersion(d);
        return currentVersion?.targetAreas.some((ta) => ta.area?.name === filterRegion);
      });
    }

    if (filterStartDate || filterEndDate) {
      result = result.filter((d) => {
        const currentVersion = getCurrentVersion(d);
        if (!currentVersion?.commandDate) return false;
        const cmdTime = new Date(currentVersion.commandDate).getTime();
        
        if (filterStartDate) {
          const startTime = new Date(`${filterStartDate}T00:00:00`).getTime();
          if (cmdTime < startTime) return false;
        }
        if (filterEndDate) {
          const endTime = new Date(`${filterEndDate}T23:59:59`).getTime();
          if (cmdTime > endTime) return false;
        }
        return true;
      });
    }

    if (filterUnitType) {
      result = result.filter((d) => {
        const currentVersion = getCurrentVersion(d);
        if (!currentVersion?.recipients) return false;
        return currentVersion.recipients.some((r) => {
          const name = (r.targetUnit?.name || "").toLowerCase();
          if (filterUnitType === "BINDA") {
            return name.includes("binda");
          }
          if (filterUnitType === "DIREKTORAT") {
            return name.includes("direktorat");
          }
          return false;
        });
      });
    }

    return result;
  }, [
    directives,
    searchQuery,
    filterClassification,
    filterRegion,
    filterStartDate,
    filterEndDate,
    filterUnitType,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredDirectives.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedDirectives = useMemo(() => {
    return filteredDirectives.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  }, [filteredDirectives, safePage, rowsPerPage]);

  const pageNumbers = useMemo(() => {
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return Array.from(pages).filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  }, [safePage, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, filterClassification, filterRegion, filterStartDate, filterEndDate, filterUnitType]);

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

      <Card className="executive-command-page__card overflow-hidden">
        <CardHeader className="gap-4 px-4 md:px-5 border-b border-[var(--dc-border-subtle)]/70">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between w-full">
            <div className="space-y-1">
              <CardTitle className="font-semibold text-lg">Daftar STR Aktif</CardTitle>
              <CardDescription className="max-w-2xl text-[var(--dc-text-secondary)]">
                Gunakan tabel ini untuk review draft, publish, distribusi, dan tracking tindak lanjut.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground/60" />
              <Input
                type="text"
                placeholder="Cari Nomor STR, judul, atau wilayah..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs bg-background/50 border-[var(--dc-border-subtle)] focus:border-[var(--dc-primary)]/50 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-3 pt-3 border-t border-[var(--dc-border-subtle)]/50 sm:grid-cols-2 md:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Mulai Tanggal
              </label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="h-9 text-xs bg-background/50 border-[var(--dc-border-subtle)] focus:border-[var(--dc-primary)]/50 focus:outline-none text-[var(--dc-text-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Sampai Tanggal
              </label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="h-9 text-xs bg-background/50 border-[var(--dc-border-subtle)] focus:border-[var(--dc-primary)]/50 focus:outline-none text-[var(--dc-text-primary)]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Klasifikasi
              </label>
              <Select
                value={filterClassification || "ALL"}
                onValueChange={(val) => setFilterClassification(val === "ALL" ? "" : val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50 border-[var(--dc-border-subtle)] focus:border-[var(--dc-primary)]/50 focus:ring-0 text-[var(--dc-text-primary)]">
                  {filterClassification ? (
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(filterClassification)}`}
                    >
                      {getClassificationStyles(filterClassification).label}
                    </span>
                  ) : (
                    <SelectValue placeholder="Semua Klasifikasi" />
                  )}
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="ALL">Semua Klasifikasi</SelectItem>
                  {["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"].map((value) => (
                    <SelectItem key={value} value={value}>
                      <span className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(value)}`}>
                        {getClassificationStyles(value).label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Wilayah
              </label>
              <Select
                value={filterRegion || "ALL"}
                onValueChange={(val) => setFilterRegion(val === "ALL" ? "" : val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50 border-[var(--dc-border-subtle)] focus:border-[var(--dc-primary)]/50 focus:ring-0 text-[var(--dc-text-primary)]">
                  <SelectValue placeholder="Semua Wilayah" />
                </SelectTrigger>
                <SelectContent position="popper" className="max-h-[300px] overflow-y-auto">
                  <SelectItem value="ALL">Semua Wilayah</SelectItem>
                  {uniqueRegions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Tipe Unit
              </label>
              <Select
                value={filterUnitType || "ALL"}
                onValueChange={(val) => setFilterUnitType(val === "ALL" ? "" : val)}
              >
                <SelectTrigger className="h-9 text-xs bg-background/50 border-[var(--dc-border-subtle)] focus:border-[var(--dc-primary)]/50 focus:ring-0 text-[var(--dc-text-primary)]">
                  <SelectValue placeholder="Semua Unit" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="ALL">Semua Unit</SelectItem>
                  <SelectItem value="BINDA">BINDA</SelectItem>
                  <SelectItem value="DIREKTORAT">DIREKTORAT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="executive-command-page__table px-4 md:px-5 pt-4">
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
                          {(() => {
                            const classStyle = getClassificationStyles(currentVersion?.classification);
                            return (
                              <Badge
                                variant="outline"
                                style={{
                                  color: classStyle.color,
                                  backgroundColor: classStyle.bgColor,
                                  borderColor: classStyle.borderColor,
                                }}
                                className="font-mono font-bold tracking-wider"
                              >
                                {classStyle.label}
                              </Badge>
                            );
                          })()}
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
                            {translateStatus(directive.status)}
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
                      {searchQuery
                        ? "Tidak ada direktif atau STR yang cocok dengan kata kunci pencarian Anda."
                        : "Belum ada STR yang dibuat pada unit eksekutif ini."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--dc-border-subtle)]/70 p-3 bg-muted/5 mt-4">
            <div className="text-muted-foreground text-xs pl-5">
              Menampilkan {filteredDirectives.length ? (safePage - 1) * rowsPerPage + 1 : 0}-
              {Math.min(safePage * rowsPerPage, filteredDirectives.length)} dari {filteredDirectives.length} baris.
            </div>
            <div className="flex items-center gap-4 pr-5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Baris</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {[5, 10, 20, 50].map((val) => (
                      <SelectItem key={val} value={String(val)}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-1 select-none">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  &lt; Sebelumnya
                </Button>
                {pageNumbers.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={p === safePage ? "outline" : "ghost"}
                    onClick={() => setPage(p)}
                    className="size-8 text-xs p-0"
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Berikutnya &gt;
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
