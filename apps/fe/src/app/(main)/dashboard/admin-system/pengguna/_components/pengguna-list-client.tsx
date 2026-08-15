"use client";

import type { ReactNode } from "react";
import { useDeferredValue, useEffect, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ArrowRight, BadgeCheck, ChevronRight, Globe, Lock, Plus, Search, ShieldAlert, Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiBrowserFetch, apiBrowserFetchEnvelope } from "@/lib/api/browser-client";
import type { PaginationMeta } from "@/lib/api/types";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { AreaSearchResult, UserDetail, UserListFacets, UserListItem, UserListQueryState } from "./pengguna-types";
import {
  formatDateTime,
  getAssignmentRbacSummary,
  getPrimaryAssignment,
  isUserLocked,
  ROLE_CODE_OPTIONS,
  USER_STATUS_OPTIONS,
} from "./pengguna-types";

type PenggunaListClientProps = {
  items: UserListItem[];
  pagination?: PaginationMeta;
  facets?: UserListFacets;
  selectedUser: UserDetail | null;
  queryState: UserListQueryState;
  selectedArea: AreaSearchResult | null;
};

const UNIT_ENUM_OPTIONS = [
  { value: "BINDA", label: "Binda" },
  { value: "DIRECTORATE", label: "Direktorat" },
];

function buildHref(pathname: string, queryState: UserListQueryState, overrides: Partial<UserListQueryState> = {}) {
  const nextState = {
    ...queryState,
    ...overrides,
  };
  const searchParams = new URLSearchParams();

  if (nextState.q) searchParams.set("q", nextState.q);
  if (nextState.status) searchParams.set("status", nextState.status);
  if (nextState.roleCode) searchParams.set("roleCode", nextState.roleCode);
  if (nextState.unitId) searchParams.set("branch", nextState.unitId);
  if (nextState.areaId) searchParams.set("areaId", nextState.areaId);
  if (nextState.page > 1) searchParams.set("page", String(nextState.page));
  if (nextState.limit !== 20) searchParams.set("limit", String(nextState.limit));
  if (nextState.selected) searchParams.set("selected", nextState.selected);

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function StatCard({
  title,
  value,
  percentageLabel,
  description,
  icon,
  accentColor,
}: {
  title: string;
  value: number;
  percentageLabel?: string;
  description: string;
  icon: ReactNode;
  accentColor?: string;
}) {
  return (
    <Card className="border border-border/60 shadow-sm bg-card transition-all hover:border-border">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
          <div className={cn("rounded-lg p-2 text-muted-foreground bg-muted/50", accentColor)}>{icon}</div>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono tracking-tight text-foreground">{value}</span>
        </div>
        {percentageLabel ? (
          <p className="font-mono text-[11px] font-semibold tabular-nums text-sky-600 dark:text-sky-400">
            {percentageLabel}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </CardContent>
    </Card>
  );
}

export function PenggunaListClient({
  items,
  pagination,
  facets,
  selectedUser,
  queryState,
  selectedArea,
}: PenggunaListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const safeItems = Array.isArray(items) ? items : [];

  const [currentPage, setCurrentPage] = useState(queryState.page);
  const [clientItems, setClientItems] = useState<UserListItem[]>(safeItems);
  const [clientPagination, setClientPagination] = useState<PaginationMeta | undefined>(pagination);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setClientItems(Array.isArray(items) ? items : []);
    setClientPagination(pagination);
    setCurrentPage(queryState.page);
  }, [items, pagination, queryState.page]);

  const [q, setQ] = useState(queryState.q);
  const [status, setStatus] = useState(queryState.status);
  const [unitId, setUnitId] = useState(queryState.unitId);
  const [roleCode, setRoleCode] = useState(queryState.roleCode);
  const [limit, setLimit] = useState(String(queryState.limit));
  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState<AreaSearchResult[]>([]);
  const [activeArea, setActiveArea] = useState<AreaSearchResult | null>(selectedArea);
  const [showAreaFilter, setShowAreaFilter] = useState(Boolean(selectedArea));
  const deferredAreaQuery = useDeferredValue(areaQuery);

  useEffect(() => {
    setQ(queryState.q);
    setStatus(queryState.status);
    setUnitId(queryState.unitId);
    setRoleCode(queryState.roleCode);
    setLimit(String(queryState.limit));
    setActiveArea(selectedArea);
  }, [queryState.limit, queryState.q, queryState.roleCode, queryState.status, queryState.unitId, selectedArea]);

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      if (deferredAreaQuery.trim().length < 2) {
        setAreaResults([]);
        return;
      }

      const results = await apiBrowserFetch<AreaSearchResult[]>("/administrative-areas/search", {
        query: {
          q: deferredAreaQuery.trim(),
          limit: 10,
        },
      });

      if (!cancelled) {
        setAreaResults(results);
      }
    }

    loadAreas().catch(() => {
      if (!cancelled) {
        setAreaResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredAreaQuery]);

  function applyFilters() {
    router.push(
      buildHref(pathname, queryState, {
        q,
        status,
        unitId,
        roleCode,
        areaId: activeArea?.id ?? "",
        limit: Number(limit) || 20,
        page: 1,
        selected: "",
      }),
    );
  }

  function clearFilters() {
    setQ("");
    setStatus("");
    setUnitId("");
    setRoleCode("");
    setLimit("20");
    setAreaQuery("");
    setAreaResults([]);
    setActiveArea(null);
    router.push(pathname);
  }

  const handlePageChange = async (targetPage: number) => {
    if (
      targetPage === currentPage ||
      targetPage < 1 ||
      (clientPagination && clientPagination.totalPages !== undefined && targetPage > clientPagination.totalPages)
    ) {
      return;
    }

    setLoading(true);
    setCurrentPage(targetPage);

    try {
      const queryParams = new URLSearchParams();
      queryParams.set("page", String(targetPage));
      queryParams.set("limit", limit);
      if (q) queryParams.set("search", q);
      if (status) queryParams.set("status", status);
      if (unitId) queryParams.set("branch", unitId);
      if (roleCode) queryParams.set("roleCode", roleCode);
      if (activeArea?.id) queryParams.set("areaId", activeArea.id);

      const res = await apiBrowserFetchEnvelope<UserListItem[]>(`/user-profiles?${queryParams.toString()}`);

      setClientItems(Array.isArray(res.data) ? res.data : []);
      if (res.meta?.pagination) {
        setClientPagination(res.meta.pagination);
      }

      const nextQueryState = {
        ...queryState,
        q,
        status,
        unitId,
        roleCode,
        areaId: activeArea?.id ?? "",
        limit: Number(limit) || 20,
        page: targetPage,
      };
      const nextUrl = buildHref(pathname, nextQueryState);
      window.history.pushState(null, "", nextUrl);
    } catch (error) {
      console.error("Gagal memuat halaman baru:", error);
    } finally {
      setLoading(false);
    }
  };

  const activeCount = facets?.status?.ACTIVE ?? 0;
  const pendingCount = facets?.status?.PENDING ?? 0;
  const suspendedCount = facets?.status?.SUSPENDED ?? 0;
  const lockedCount = facets?.security?.locked ?? 0;
  const totalUsers = Math.max(
    clientPagination?.total ?? 0,
    activeCount + pendingCount + suspendedCount,
    clientItems.length,
  );
  const totalPages = clientPagination?.totalPages ?? 1;
  const activeFilterCount = [q, status, unitId, roleCode, activeArea?.id].filter(Boolean).length;

  // The backend applies branch filtering to the complete result set.
  // Do not filter the current page again because that would desynchronise totals and pagination.
  const displayItems = clientItems;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className={DC_TYPOGRAPHY.pageTitle}>Manajemen Pengguna</h1>
            <Badge variant="secondary" className="text-xs font-normal">
              {clientPagination?.total ?? clientItems.length} Pengguna
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Kelola penyediaan akun pengguna, role autentikasi, unit organisasi, dan cakupan wilayah operasional.
          </p>
        </div>

        <Button asChild size="sm" className="shrink-0">
          <Link href="/dashboard/admin-system/pengguna/baru" className="gap-1.5">
            <Plus className="size-4" />
            Tambah Pengguna
          </Link>
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Aktif"
          value={activeCount}
          percentageLabel={`${formatPercent(percentOf(activeCount, totalUsers))}% dari total pengguna`}
          description="Profil pengguna aktif dan siap operasional"
          icon={<BadgeCheck className="size-4" />}
          accentColor="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
        />
        <StatCard
          title="Menunggu"
          value={pendingCount}
          percentageLabel={`${formatPercent(percentOf(pendingCount, totalUsers))}% dari total pengguna`}
          description="Provisioning baru butuh konfirmasi"
          icon={<Users className="size-4" />}
          accentColor="text-amber-600 dark:text-amber-400 bg-amber-500/10"
        />
        <StatCard
          title="Ditangguhkan"
          value={suspendedCount}
          percentageLabel={`${formatPercent(percentOf(suspendedCount, totalUsers))}% dari total pengguna`}
          description="Akses dibekukan sementara"
          icon={<ShieldAlert className="size-4" />}
          accentColor="text-orange-600 dark:text-orange-400 bg-orange-500/10"
        />
        <StatCard
          title="Terkunci"
          value={lockedCount}
          percentageLabel={`${formatPercent(percentOf(lockedCount, totalUsers))}% dari total pengguna`}
          description="Kunci operasional aktif"
          icon={<Lock className="size-4" />}
          accentColor="text-rose-600 dark:text-rose-400 bg-rose-500/10"
        />
      </div>

      {/* Filter Section */}
      <FilterPanel
        title="Filter pengguna"
        description="Pencarian dan pilihan filter diterapkan ke seluruh data sesuai cakupan akses Anda."
        activeFilterCount={activeFilterCount}
        onReset={clearFilters}
        resultSummary={`${clientPagination?.total ?? clientItems.length} pengguna`}
        contentClassName="block space-y-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="user-search"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="h-9 pl-9 text-sm"
              placeholder="Cari nama, username, email, atau nomor HP..."
            />
          </div>

          {/* Status Select */}
          <NativeSelect
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter status pengguna"
            className="h-9 w-full text-sm sm:w-[150px]"
          >
            <NativeSelectOption value="">Semua status</NativeSelectOption>
            {USER_STATUS_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          {/* Unit Select (Enum: Binda / Direktorat) */}
          <NativeSelect
            value={unitId}
            onChange={(event) => setUnitId(event.target.value)}
            aria-label="Filter unit pengguna"
            className="h-9 w-full text-sm sm:w-[150px]"
          >
            <NativeSelectOption value="">Semua unit</NativeSelectOption>
            {UNIT_ENUM_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          {/* Role Select */}
          <NativeSelect
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value)}
            aria-label="Filter role pengguna"
            className="h-9 w-full text-sm sm:w-[170px]"
          >
            <NativeSelectOption value="">Semua role</NativeSelectOption>
            {ROLE_CODE_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>

          {/* Toggle Wilayah Filter */}
          <Button
            type="button"
            variant={showAreaFilter ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowAreaFilter(!showAreaFilter)}
            className="h-9 gap-1.5 text-sm"
          >
            <Globe className="size-3.5" />
            Wilayah
            {activeArea && (
              <Badge variant="default" className="ml-1 px-1.5 py-0 text-[10px] rounded-full">
                1
              </Badge>
            )}
          </Button>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Button type="button" size="sm" onClick={applyFilters} className="h-10 px-4 text-sm">
              Terapkan
            </Button>
          </div>
        </div>

        {/* Wilayah Filter Drawer */}
        {showAreaFilter && (
          <div className="pt-3 border-t border-border/40 max-w-md">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filter Wilayah Operasional
              </span>
              <Input
                id="area-search"
                value={areaQuery}
                onChange={(event) => setAreaQuery(event.target.value)}
                placeholder="Ketik nama atau kode area..."
                className="h-9 text-sm"
              />
              {activeArea && (
                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5 text-xs">
                  <span className="font-medium text-foreground">
                    {activeArea.code} • {activeArea.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveArea(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              )}
              {areaResults.length > 0 && (
                <div className="rounded-lg border border-border/60 bg-popover max-h-[160px] overflow-y-auto">
                  {areaResults.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        setActiveArea(area);
                        setAreaQuery("");
                        setAreaResults([]);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-muted/50 border-b border-border/30 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-foreground">{area.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {area.code} • {area.level}
                        </div>
                      </div>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </FilterPanel>

      {/* Main Table */}
      <Card className="border border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="py-3 px-5 border-b border-border/40 bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Daftar Pengguna</CardTitle>
          <span className="text-xs text-muted-foreground">
            Halaman {currentPage} dari {totalPages}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {displayItems.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Pengguna
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Jalur / Fungsi
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cakupan Wilayah
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Login Terakhir
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={cn(loading && "opacity-50 transition-opacity duration-200")}>
                  {displayItems.map((user) => {
                    const assignment = getPrimaryAssignment(user);
                    const areaScopes = assignment?.areaScopes ?? [];
                    const locked = isUserLocked(user);
                    const isSelected = selectedUser?.id === user.id;
                    const rbac = getAssignmentRbacSummary(assignment, user.authUser.role);

                    return (
                      <TableRow
                        key={user.id}
                        className={cn("hover:bg-muted/30 transition-colors", isSelected && "bg-muted/40")}
                      >
                        <TableCell className="py-3">
                          <Link
                            href={`/dashboard/admin-system/pengguna/${user.id}`}
                            className="block space-y-0.5 group"
                          >
                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              {user.fullName || user.authUser.name || user.authUser.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{user.username || "-"} {user.authUser.email ? `• ${user.authUser.email}` : ""}
                            </div>
                          </Link>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">{rbac.functionLabel}</span>
                              <Badge
                                variant={rbac.status === "valid" ? "secondary" : "outline"}
                                className={cn(
                                  "px-1.5 py-0 text-[10px]",
                                  rbac.status === "valid"
                                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                                    : "border-amber-500/40 bg-amber-500/10 text-amber-300",
                                )}
                                title={rbac.message}
                              >
                                {rbac.status === "valid" ? "Valid" : "Cek RBAC"}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground">{rbac.lineLabel}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {rbac.branchLabel} - {rbac.scopeRequirement}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {areaScopes.length > 0 ? (
                              <>
                                {areaScopes.slice(0, 2).map((scope) => (
                                  <Badge
                                    key={`${user.id}-${scope.area.id}-${scope.id ?? scope.areaId}`}
                                    variant={scope.isPrimary ? "default" : "secondary"}
                                    className="text-[10px] px-2 py-0"
                                  >
                                    {scope.area.name}
                                  </Badge>
                                ))}
                                {areaScopes.length > 2 && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    +{areaScopes.length - 2}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {user.status === "ACTIVE" && (
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/20 text-[11px]">
                                Aktif
                              </Badge>
                            )}
                            {user.status === "PENDING" && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border-amber-500/20 text-[11px]">
                                Menunggu
                              </Badge>
                            )}
                            {user.status === "SUSPENDED" && (
                              <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20 border-orange-500/20 text-[11px]">
                                Ditangguhkan
                              </Badge>
                            )}
                            {user.status !== "ACTIVE" && user.status !== "PENDING" && user.status !== "SUSPENDED" && (
                              <Badge variant="secondary" className="text-[11px]">
                                {user.status}
                              </Badge>
                            )}
                            {locked && (
                              <Badge variant="destructive" className="text-[11px]">
                                Terkunci
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {formatDateTime(user.lastLoginAt)}
                        </TableCell>

                        <TableCell className="py-3 text-right">
                          <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1">
                            <Link href={`/dashboard/admin-system/pengguna/${user.id}`}>
                              Detail <ChevronRight className="size-3.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="py-12 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="bg-muted/50">
                  <Users className="size-5 text-muted-foreground" />
                </EmptyMedia>
                <EmptyTitle className="text-sm font-semibold">Tidak ada pengguna ditemukan</EmptyTitle>
                <EmptyDescription className="text-xs">
                  Coba ubah kata kunci pencarian atau filter status untuk menemukan pengguna yang dicari.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {clientPagination && (
            <div className="flex flex-wrap items-center justify-between border-t border-border/40 px-5 py-3 bg-muted/10 gap-3">
              <span className="text-xs text-muted-foreground">
                Menampilkan {displayItems.length} dari {clientPagination.total} pengguna
              </span>

              <div className="flex items-center gap-3 ml-auto">
                {/* Baris Per Halaman Select */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Baris:</span>
                  <NativeSelect
                    value={limit}
                    onChange={(event) => {
                      const nextLimit = event.target.value;
                      setLimit(nextLimit);
                      router.push(
                        buildHref(pathname, queryState, {
                          q,
                          status,
                          unitId,
                          roleCode,
                          areaId: activeArea?.id ?? "",
                          limit: Number(nextLimit) || 20,
                          page: 1,
                          selected: "",
                        }),
                      );
                    }}
                    className="h-8 w-[100px] text-xs bg-background"
                  >
                    {[10, 20, 50, 100].map((value) => (
                      <NativeSelectOption key={value} value={String(value)}>
                        {value} / hal
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>

                {totalPages > 1 && (
                  <Pagination className="justify-end w-auto m-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          aria-disabled={currentPage <= 1}
                          className={currentPage <= 1 ? "pointer-events-none opacity-50" : undefined}
                          text="Sebelumnya"
                          onClick={(e) => {
                            e.preventDefault();
                            void handlePageChange(Math.max(currentPage - 1, 1));
                          }}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, index): number => index + 1)
                        .filter(
                          (pageNumber) =>
                            pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - currentPage) <= 1,
                        )
                        .map((pageNumber) => (
                          <PaginationItem key={pageNumber}>
                            <PaginationLink
                              isActive={pageNumber === currentPage}
                              onClick={(e) => {
                                e.preventDefault();
                                void handlePageChange(pageNumber);
                              }}
                            >
                              {pageNumber}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                      <PaginationItem>
                        <PaginationNext
                          aria-disabled={currentPage >= totalPages}
                          className={currentPage >= totalPages ? "pointer-events-none opacity-50" : undefined}
                          text="Berikutnya"
                          onClick={(e) => {
                            e.preventDefault();
                            void handlePageChange(Math.min(currentPage + 1, totalPages));
                          }}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
