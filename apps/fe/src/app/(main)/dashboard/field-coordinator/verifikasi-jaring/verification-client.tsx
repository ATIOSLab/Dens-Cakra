"use client";

import { useMemo, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Inbox,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

export type RegistrationJaring = {
  id: string;
  code: string;
  aliasName: string | null;
  fullName: string | null;
  nationalIdNumber: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: string | null;
  gender: string | null;
  whatsappNumber: string;
  occupation: { name: string } | null;
  profilePhotoFileId: string | null;
  profilePhotoFile: { id: string } | null;
  workplace: string | null;
  jobTitle: string | null;
  joinedAt: string | null;
  organizationName: string | null;
  politicalAffiliation: string | null;
  notes: string | null;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  registeredAt: string;
  createdAt?: string;
  rejectionReason?: string | null;
  caretakerAssignments: Array<{
    fieldOfficerAssignment: { userProfile: { fullName: string | null } };
  }>;
  areaCoverages: Array<{ area: { name: string } }>;
};

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(value),
    );
  } catch {
    return "-";
  }
}

function formatTimeOnly(value?: string | null) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) + " WIB";
  } catch {
    return "";
  }
}

function formatGender(value?: string | null) {
  if (value === "MALE") return "Laki-laki";
  if (value === "FEMALE") return "Perempuan";
  return "-";
}

function filled(value?: string | null) {
  return value?.trim() ? value.trim() : null;
}

function profilePhotoUrl(item: RegistrationJaring) {
  const fileId = item.profilePhotoFileId ?? item.profilePhotoFile?.id;
  return fileId ? `/api/files/${fileId}` : null;
}

function officerName(item: RegistrationJaring) {
  const [caretaker] = item.caretakerAssignments;
  return caretaker ? (caretaker.fieldOfficerAssignment.userProfile.fullName ?? "-") : "-";
}

function areaNames(item: RegistrationJaring) {
  return item.areaCoverages.map((coverage) => coverage.area.name).join(", ") || "-";
}

function getInitials(name?: string | null) {
  if (!name) return "JR";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function statusLabel(status: RegistrationJaring["registrationStatus"]) {
  if (status === "APPROVED") return "Disetujui";
  if (status === "REJECTED") return "Ditolak";
  return "Belum di verifikasi";
}

function statusBadgeVariant(status: RegistrationJaring["registrationStatus"]) {
  if (status === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "REJECTED") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

function presentRows(rows: Array<[string, string | null]>) {
  return rows.flatMap(([label, value]) => (value ? [[label, value] as const] : []));
}

export function JaringVerificationListClient({ initialItems }: { initialItems: RegistrationJaring[] }) {
  const router = useRouter();
  const [items, setItems] = useState<RegistrationJaring[]>(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");
  const [officerFilter, setOfficerFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Quick Action Modal State
  const [selectedItemForAction, setSelectedItemForAction] = useState<{
    item: RegistrationJaring;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Extract unique areas & officers for filter options
  const uniqueAreas = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      for (const cov of item.areaCoverages) {
        if (cov.area?.name) set.add(cov.area.name);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  const uniqueOfficers = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const name = officerName(item);
      if (name && name !== "-") set.add(name);
    }
    return Array.from(set).sort();
  }, [items]);

  // Calculate summary metrics synchronously
  const summary = useMemo(() => {
    const total = items.length;
    const pending = items.filter((i) => i.registrationStatus === "PENDING").length;
    const approved = items.filter((i) => i.registrationStatus === "APPROVED").length;
    const rejected = items.filter((i) => i.registrationStatus === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [items]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter !== "ALL" && item.registrationStatus !== statusFilter) {
        return false;
      }
      // Area filter
      if (areaFilter !== "ALL") {
        const itemAreas = item.areaCoverages.map((c) => c.area.name);
        if (!itemAreas.includes(areaFilter)) return false;
      }
      // Officer filter
      if (officerFilter !== "ALL") {
        if (officerName(item) !== officerFilter) return false;
      }
      // Search query
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const alias = (item.aliasName ?? "").toLowerCase();
        const code = item.code.toLowerCase();
        const name = (item.fullName ?? "").toLowerCase();
        const address = (item.address ?? "").toLowerCase();
        const occ = (item.occupation?.name ?? "").toLowerCase();
        const workplace = (item.workplace ?? "").toLowerCase();
        const area = areaNames(item).toLowerCase();
        const fo = officerName(item).toLowerCase();
        return (
          alias.includes(q) ||
          code.includes(q) ||
          name.includes(q) ||
          address.includes(q) ||
          occ.includes(q) ||
          workplace.includes(q) ||
          area.includes(q) ||
          fo.includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, areaFilter, officerFilter, search]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => {
      if (sortBy === "name_asc") {
        return (left.aliasName ?? left.code).localeCompare(right.aliasName ?? right.code);
      }
      if (sortBy === "name_desc") {
        return (right.aliasName ?? right.code).localeCompare(left.aliasName ?? left.code);
      }
      const leftTime = new Date(left.registeredAt ?? left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.registeredAt ?? right.createdAt ?? 0).getTime();
      return sortBy === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [filteredItems, sortBy]);

  const paginatedItems = useMemo(() => {
    return sortedItems.slice((page - 1) * limit, page * limit);
  }, [sortedItems, page, limit]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "ALL" || areaFilter !== "ALL" || officerFilter !== "ALL";

  function handleResetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setAreaFilter("ALL");
    setOfficerFilter("ALL");
    setSortBy("newest");
    setPage(1);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data verifikasi jaring diperbarui");
    }, 600);
  }

  async function handleQuickDecision(item: RegistrationJaring, action: "approve" | "reject", reason?: string) {
    setIsSubmittingAction(true);
    try {
      await apiBrowserMutation<void>(
        "POST",
        `/jaring/${item.id}/${action === "approve" ? "approve-registration" : "reject-registration"}`,
        action === "reject" ? { reason: reason?.trim() || undefined } : undefined,
        { idempotent: true },
      );

      // Synchronize local items state immediately
      setItems((prevItems) =>
        prevItems.map((prev) =>
          prev.id === item.id
            ? {
                ...prev,
                registrationStatus: action === "approve" ? "APPROVED" : "REJECTED",
                rejectionReason: action === "reject" ? (reason?.trim() || null) : prev.rejectionReason,
              }
            : prev,
        ),
      );

      toast.success(
        action === "approve"
          ? `Pengajuan ${item.aliasName ?? item.code} disetujui.`
          : `Pengajuan ${item.aliasName ?? item.code} ditolak.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memproses verifikasi.");
    } finally {
      setIsSubmittingAction(false);
      setSelectedItemForAction(null);
      setRejectionReason("");
    }
  }

  return (
    <main className="space-y-8 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* BREADCRUMB & HEADER SECTION */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground">Verifikasi Jaring</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="font-bold text-3xl tracking-tight text-foreground">Verifikasi Jaring</h1>
            <p className="mt-1.5 text-muted-foreground text-sm max-w-2xl">
              Melakukan verifikasi calon jaringan sebelum disetujui menjadi anggota operasional.
            </p>
          </div>
        </div>

        {/* SUMMARY CARDS (HORIZONTAL RIGHT SECTION) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
          {/* Total Pengajuan */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-3.5 shadow-xs min-w-[140px] transition-all hover:border-primary/40">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <FileText className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="text-xl font-bold tracking-tight text-foreground">{summary.total}</p>
            </div>
          </div>

          {/* Menunggu */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-3.5 shadow-xs min-w-[140px] transition-all hover:border-amber-500/40">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Belum di verifikasi</p>
              <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{summary.pending}</p>
            </div>
          </div>

          {/* Disetujui */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-3.5 shadow-xs min-w-[140px] transition-all hover:border-emerald-500/40">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserCheck className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Disetujui</p>
              <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {summary.approved}
              </p>
            </div>
          </div>

          {/* Ditolak */}
          <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-3.5 shadow-xs min-w-[140px] transition-all hover:border-rose-500/40">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 shrink-0">
              <UserX className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Ditolak</p>
              <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-400">{summary.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ACTION BAR (SEARCH & FILTER TOOLBAR) */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-xl border border-slate-200/80 dark:border-white/10 bg-card p-4 shadow-xs">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari alias, nama, ID, pekerjaan, FO, wilayah..."
              className="pl-9 pr-8 h-9 text-sm rounded-lg bg-background"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          {/* Filter Wilayah */}
          <NativeSelect
            value={areaFilter}
            onChange={(e) => {
              setAreaFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto min-w-[150px]"
          >
            <option value="ALL">Semua Wilayah</option>
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </NativeSelect>

          {/* Filter Status */}
          <NativeSelect
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto min-w-[140px]"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Belum di verifikasi</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
          </NativeSelect>

          {/* Filter Field Officer */}
          <NativeSelect
            value={officerFilter}
            onChange={(e) => {
              setOfficerFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto min-w-[160px]"
          >
            <option value="ALL">Semua Field Officer</option>
            {uniqueOfficers.map((fo) => (
              <option key={fo} value={fo}>
                {fo}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* Sort Dropdown */}
          <NativeSelect
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-auto min-w-[130px]"
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="name_asc">Nama A-Z</option>
            <option value="name_desc">Nama Z-A</option>
          </NativeSelect>

          {/* Reset Filters */}
          {hasActiveFilters ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filter
            </Button>
          ) : null}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 rounded-lg"
          >
            <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* MAIN CARD CONTAINER (ROUNDED 18PX) */}
      <Card className="overflow-hidden rounded-[18px] border border-slate-200/80 dark:border-white/10 shadow-xs">
        {/* CARD HEADER */}
        <CardHeader className="border-b border-border/80 bg-slate-50/80 dark:bg-white/[0.02] p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                  Daftar Pengajuan Verifikasi
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                  {summary.pending} pengajuan belum di verifikasi.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="outline" className="h-7 px-3 text-xs rounded-full border-border bg-background">
                {filteredItems.length} Pengajuan
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {/* DESKTOP ENTERPRISE TABLE */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/80 bg-slate-100/60 dark:bg-zinc-900/60 hover:bg-slate-100/60">
                  <TableHead className="pl-6 py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground w-[180px]">
                    Alias
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground w-[220px]">
                    Nama
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground min-w-[220px]">
                    Alamat
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Pekerjaan
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Wilayah
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Field Officer
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground w-[130px]">
                    Status
                  </TableHead>
                  <TableHead className="py-3.5 font-semibold text-[11px] uppercase tracking-wider text-muted-foreground w-[130px]">
                    Waktu
                  </TableHead>
                  <TableHead className="pr-6 py-3.5 text-right font-semibold text-[11px] uppercase tracking-wider text-muted-foreground min-w-[180px]">
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => {
                  const photo = profilePhotoUrl(item);
                  const foName = officerName(item);
                  const areas = areaNames(item);
                  const isPending = item.registrationStatus === "PENDING";
                  return (
                    <TableRow
                      key={item.id}
                      className="h-16 transition-colors duration-180 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 border-b border-border/50"
                    >
                      {/* Alias */}
                      <TableCell className="pl-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-9 border border-border">
                            {photo ? (
                              <AvatarImage src={photo} alt={item.aliasName ?? item.code} />
                            ) : (
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                                {getInitials(item.aliasName ?? item.code)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-sm font-mono text-foreground truncate">
                              {item.aliasName ?? item.code}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">ID: {item.code}</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Nama */}
                      <TableCell className="py-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-sm text-foreground truncate">{item.fullName ?? "-"}</span>
                          <span className="text-xs text-muted-foreground">{formatGender(item.gender)}</span>
                        </div>
                      </TableCell>

                      {/* Alamat */}
                      <TableCell className="py-3">
                        <div className="max-w-[260px] truncate text-sm text-foreground" title={item.address ?? undefined}>
                          {item.address ?? "-"}
                        </div>
                      </TableCell>

                      {/* Pekerjaan */}
                      <TableCell className="py-3">
                        <div className="flex flex-col min-w-0 max-w-[200px]">
                          <span className="font-medium text-sm text-foreground truncate">
                            {item.occupation?.name ?? "-"}
                          </span>
                          {item.workplace || item.jobTitle ? (
                            <span className="text-xs text-muted-foreground truncate">
                              {[item.jobTitle, item.workplace].filter(Boolean).join(" • ")}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Wilayah */}
                      <TableCell className="py-3">
                        <div className="flex flex-col min-w-0 max-w-[200px]">
                          <span className="font-medium text-sm text-foreground truncate">{areas}</span>
                          <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <MapPin className="size-3 text-primary shrink-0" />
                            <span className="truncate">Cakupan Wilayah</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Field Officer */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2.5 max-w-[220px]">
                          <div className="flex size-7 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-muted-foreground text-[10px] font-semibold shrink-0">
                            {getInitials(foName)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm text-foreground truncate">{foName}</span>
                            <span className="text-[11px] text-muted-foreground">Field Officer</span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-[0.08em]",
                            statusBadgeVariant(item.registrationStatus),
                          )}
                        >
                          {item.registrationStatus === "APPROVED" && <CheckCircle2 className="size-3 shrink-0" />}
                          {item.registrationStatus === "REJECTED" && <XCircle className="size-3 shrink-0" />}
                          {item.registrationStatus === "PENDING" && <Clock className="size-3 shrink-0" />}
                          {statusLabel(item.registrationStatus)}
                        </span>
                      </TableCell>

                      {/* Waktu */}
                      <TableCell className="py-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-xs text-foreground">
                            {formatDateOnly(item.registeredAt ?? item.createdAt)}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatTimeOnly(item.registeredAt ?? item.createdAt)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Aksi (Detail kiri, Tolak tengah, Setujui kanan) */}
                      <TableCell className="pr-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs rounded-lg border-border hover:border-primary hover:text-primary hover:bg-primary/5"
                          >
                            <Link href={`/dashboard/field-coordinator/verifikasi-jaring/${item.id}`}>
                              <Eye className="size-3.5" />
                              <span>Detail</span>
                            </Link>
                          </Button>

                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItemForAction({ item, action: "reject" })}
                                className="h-8 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 hover:text-rose-800 dark:hover:text-rose-300 font-medium text-xs rounded-lg px-2.5"
                                title="Tolak Pengajuan"
                              >
                                <XCircle className="size-3.5" />
                                <span className="hidden xl:inline">Tolak</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItemForAction({ item, action: "approve" })}
                                className="h-8 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium text-xs rounded-lg px-2.5"
                                title="Setujui Pengajuan"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span className="hidden xl:inline">Setujui</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE RESPONSIVE CARD VIEW (< md) */}
          <div className="block md:hidden divide-y divide-border/60">
            {paginatedItems.map((item) => {
              const photo = profilePhotoUrl(item);
              const foName = officerName(item);
              const areas = areaNames(item);
              const isPending = item.registrationStatus === "PENDING";
              return (
                <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-10 border border-border">
                        {photo ? (
                          <AvatarImage src={photo} alt={item.aliasName ?? item.code} />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {getInitials(item.aliasName ?? item.code)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{item.aliasName ?? item.code}</h4>
                        <p className="text-xs text-muted-foreground font-mono">ID: {item.code}</p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-semibold text-[10px] uppercase tracking-wider",
                        statusBadgeVariant(item.registrationStatus),
                      )}
                    >
                      {statusLabel(item.registrationStatus)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground">Nama:</span>{" "}
                      <span className="font-medium text-foreground">{item.fullName ?? "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>{" "}
                      <span className="font-medium text-foreground">{formatGender(item.gender)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pekerjaan:</span>{" "}
                      <span className="font-medium text-foreground">{item.occupation?.name ?? "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Wilayah:</span>{" "}
                      <span className="font-medium text-foreground">{areas}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Alamat:</span>{" "}
                      <span className="font-medium text-foreground">{item.address ?? "-"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Field Officer:</span>{" "}
                      <span className="font-medium text-foreground">{foName}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateOnly(item.registeredAt ?? item.createdAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1 text-xs">
                        <Link href={`/dashboard/field-coordinator/verifikasi-jaring/${item.id}`}>
                          <Eye className="size-3.5" /> Detail
                        </Link>
                      </Button>
                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedItemForAction({ item, action: "reject" })}
                            className="h-8 gap-1 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs px-2.5"
                          >
                            <XCircle className="size-3.5" /> Tolak
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedItemForAction({ item, action: "approve" })}
                            className="h-8 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs px-2.5"
                          >
                            <CheckCircle2 className="size-3.5" /> Setujui
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* EMPTY STATE */}
          {!paginatedItems.length ? (
            <div className="flex flex-col items-center justify-center p-12 text-center my-6 space-y-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground border border-border/50 shadow-xs">
                <Inbox className="size-8 stroke-[1.5]" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-semibold text-base text-foreground">Belum ada pengajuan verifikasi</h3>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Tidak ada data pengajuan yang cocok dengan filter pencarian Anda."
                    : "Pengajuan baru akan muncul setelah Field Officer mengirim data."}
                </p>
              </div>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 gap-1.5 text-xs">
                  <X className="size-3.5" /> Reset Filter
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 gap-1.5 text-xs">
                  <RefreshCw className="size-3.5" /> Refresh Data
                </Button>
              )}
            </div>
          ) : null}

          {/* PAGINATION */}
          <div className="border-t border-border/80 p-4">
            <TablePagination
              page={page}
              limit={limit}
              total={sortedItems.length}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* QUICK VERIFICATION ACTION DIALOG */}
      <AlertDialog
        open={selectedItemForAction !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmittingAction) {
            setSelectedItemForAction(null);
            setRejectionReason("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              {selectedItemForAction?.action === "approve" ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Setujui Pengajuan Jaring?</span>
                </>
              ) : (
                <>
                  <XCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Tolak Pengajuan Jaring?</span>
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {selectedItemForAction?.action === "approve"
                ? `Status pengajuan untuk "${selectedItemForAction.item.aliasName ?? selectedItemForAction.item.code}" (${selectedItemForAction.item.fullName ?? "-"}) akan diubah menjadi Disetujui.`
                : `Status pengajuan untuk "${selectedItemForAction?.item.aliasName ?? selectedItemForAction?.item.code}" (${selectedItemForAction?.item.fullName ?? "-"}) akan diubah menjadi Ditolak.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedItemForAction?.action === "reject" && (
            <div className="space-y-2 py-2">
              <label htmlFor="quick-rejection-reason" className="text-xs font-medium text-foreground">
                Alasan Penolakan (opsional)
              </label>
              <Input
                id="quick-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan..."
                maxLength={1000}
                className="rounded-lg text-xs"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction} className="rounded-lg text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmittingAction}
              onClick={(e) => {
                e.preventDefault();
                if (selectedItemForAction) {
                  void handleQuickDecision(
                    selectedItemForAction.item,
                    selectedItemForAction.action,
                    rejectionReason,
                  );
                }
              }}
              className={cn(
                "rounded-lg text-xs font-semibold",
                selectedItemForAction?.action === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
              )}
            >
              {isSubmittingAction
                ? "Memproses..."
                : selectedItemForAction?.action === "approve"
                  ? "Ya, Setujui"
                  : "Ya, Tolak"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export function JaringVerificationDetailClient({ item }: { item: RegistrationJaring }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const selectedPhotoUrl = profilePhotoUrl(item);
  const canDecide = item.registrationStatus === "PENDING";
  const optionalRows = presentRows([
    ["NIK / KTP", filled(item.nationalIdNumber)],
    ["Tempat lahir", filled(item.birthPlace)],
    ["Tanggal lahir", item.birthDate ? formatDateOnly(item.birthDate) : null],
    ["Jenis kelamin", item.gender ? formatGender(item.gender) : null],
    ["Tempat kerja", filled(item.workplace)],
    ["Jabatan", filled(item.jobTitle)],
    ["Tanggal bergabung", item.joinedAt ? formatDateOnly(item.joinedAt) : null],
    ["Organisasi", filled(item.organizationName)],
    ["Afiliasi politik", filled(item.politicalAffiliation)],
  ]);

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    try {
      const decisionRequest = apiBrowserMutation<void>(
        "POST",
        `/jaring/${item.id}/${action === "approve" ? "approve-registration" : "reject-registration"}`,
        action === "reject" ? { reason: reason.trim() || undefined } : undefined,
        { idempotent: true },
      );
      // biome-ignore lint/nursery/noFloatingPromises: This request is awaited; Biome nursery currently false-positives on this promise.
      await decisionRequest;
      toast.success(action === "approve" ? "Jaring disetujui." : "Pengajuan Jaring ditolak.");
      router.push("/dashboard/field-coordinator/verifikasi-jaring");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Keputusan gagal disimpan.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function decisionLabel() {
    if (busy) return "Menyimpan...";
    if (pendingAction === "approve") return "Ya, Setujui";
    return "Ya, Tolak";
  }

  return (
    <main className="space-y-8 p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* BREADCRUMB & HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard" className="text-muted-foreground hover:text-foreground">
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href="/dashboard/field-coordinator/verifikasi-jaring"
                  className="text-muted-foreground hover:text-foreground"
                >
                  Verifikasi Jaring
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-foreground">Detail Pengajuan</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div>
            <h1 className="font-bold text-3xl tracking-tight text-foreground">Detail Pengajuan Jaring</h1>
            <p className="mt-1.5 text-muted-foreground text-sm">
              Periksa data pengajuan secara menyeluruh sebelum memberi keputusan verifikasi.
            </p>
          </div>
        </div>

        <Button asChild variant="outline" className="h-9 gap-1.5 rounded-lg border-border self-start sm:self-auto">
          <Link href="/dashboard/field-coordinator/verifikasi-jaring">
            <ArrowLeft className="size-4" /> Kembali
          </Link>
        </Button>
      </div>

      {/* DETAIL CONTAINER */}
      <Card className="overflow-hidden rounded-[18px] border border-slate-200/80 dark:border-white/10 shadow-xs">
        <CardHeader className="border-b border-border/80 bg-slate-50/80 dark:bg-white/[0.02] p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 border border-border">
                {selectedPhotoUrl ? (
                  <AvatarImage src={selectedPhotoUrl} alt={item.aliasName ?? item.code} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                    {getInitials(item.aliasName ?? item.code)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                  {item.aliasName ?? item.code}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-mono">
                  Kode Alias: {item.code} • {item.fullName ?? "Nama belum tersedia"}
                </CardDescription>
              </div>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold text-xs uppercase tracking-[0.08em]",
                statusBadgeVariant(item.registrationStatus),
              )}
            >
              {item.registrationStatus === "APPROVED" && <CheckCircle2 className="size-3.5" />}
              {item.registrationStatus === "REJECTED" && <XCircle className="size-3.5" />}
              {item.registrationStatus === "PENDING" && <Clock className="size-3.5" />}
              {statusLabel(item.registrationStatus)}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6 md:p-8">
          {/* Foto Profil Info */}
          {selectedPhotoUrl ? (
            <div className="flex items-center gap-4 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 p-4 dark:bg-white/[0.02]">
              <div className="size-20 overflow-hidden rounded-xl border border-border bg-muted shrink-0">
                <Image
                  src={selectedPhotoUrl}
                  alt={`Foto profil ${item.aliasName ?? item.code}`}
                  width={80}
                  height={80}
                  unoptimized
                  className="size-20 object-cover"
                />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-sm text-foreground">Foto Profil Tersimpan</p>
                <p className="text-xs text-muted-foreground">
                  Foto identitas diri calon Jaring yang diunggah oleh Field Officer.
                </p>
              </div>
            </div>
          ) : null}

          {/* Core Info Grid */}
          <div className="space-y-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Informasi Utama</h3>
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Alias" value={item.aliasName ?? item.code} />
              <DetailItem label="Nama Lengkap" value={item.fullName ?? "-"} />
              <DetailItem label="WhatsApp" value={item.whatsappNumber} />
              <DetailItem label="Alamat" value={item.address ?? "-"} />
              <DetailItem label="Pekerjaan" value={item.occupation ? item.occupation.name : "-"} />
              <DetailItem label="Field Officer" value={officerName(item)} />
              <DetailItem label="Wilayah" value={areaNames(item)} />
            </dl>
          </div>

          {/* Optional Info Grid */}
          {optionalRows.length ? (
            <div className="space-y-3 border-t border-border/60 pt-6">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Informasi Tambahan
              </h3>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {optionalRows.map(([label, value]) => (
                  <DetailItem key={label} label={label} value={value} />
                ))}
              </dl>
            </div>
          ) : null}

          {/* Notes */}
          <div className="space-y-2 border-t border-border/60 pt-6">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
              Kebermanfaatan / Catatan Field Officer
            </h3>
            <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 p-4 dark:bg-white/[0.02]">
              <p className="text-sm text-foreground leading-relaxed">{item.notes ?? "-"}</p>
            </div>
          </div>

          {/* Rejection Reason if available */}
          {item.rejectionReason ? (
            <div className="space-y-2 border-t border-border/60 pt-6">
              <h3 className="font-semibold text-xs uppercase tracking-wider text-rose-500">Alasan Penolakan</h3>
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-700 dark:text-rose-400">
                <p className="text-sm leading-relaxed">{item.rejectionReason}</p>
              </div>
            </div>
          ) : null}

          {/* Decision Form */}
          {canDecide ? (
            <div className="space-y-4 border-t border-border/60 pt-6">
              <div className="space-y-2">
                <label htmlFor="rejection-reason" className="font-medium text-sm text-foreground">
                  Alasan Penolakan (opsional)
                </label>
                <Input
                  id="rejection-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Tuliskan alasan penolakan atau arahan revisi..."
                  maxLength={1000}
                  className="rounded-lg bg-background"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setPendingAction("reject")}
                  className="h-9 gap-1.5 rounded-lg"
                >
                  <XCircle className="size-4" /> Tolak Pengajuan
                </Button>
                <Button disabled={busy} onClick={() => setPendingAction("approve")} className="h-9 gap-1.5 rounded-lg">
                  <CheckCircle2 className="size-4" /> Setujui Pengajuan
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingAction(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "approve" ? "Setujui pengajuan Jaring?" : "Tolak pengajuan Jaring?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "approve"
                ? "Status pengajuan akan berubah menjadi disetujui dan Jaring masuk ke jaringan operasional."
                : "Status pengajuan akan berubah menjadi ditolak. Alasan penolakan akan dicatat."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="rounded-lg">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || pendingAction === null}
              onClick={(event) => {
                event.preventDefault();
                if (pendingAction) void decide(pendingAction);
              }}
              className={cn(
                "rounded-lg",
                pendingAction === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined,
              )}
            >
              {decisionLabel()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 p-3.5 dark:bg-white/[0.02]">
      <dt className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground text-sm">{value}</dd>
    </div>
  );
}
