"use client";

import { useDeferredValue, useEffect, useState } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ArrowRight, Filter, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { apiBrowserFetch } from "@/lib/api/browser-client";
import type { PaginationMeta } from "@/lib/api/types";

import type {
  AreaSearchResult,
  OrganizationUnitSummary,
  UserDetail,
  UserListFacets,
  UserListItem,
  UserListQueryState,
} from "./pengguna-types";
import {
  formatDateTime,
  getPrimaryAssignment,
  isUserLocked,
  POSITION_CODE_OPTIONS,
  USER_STATUS_OPTIONS,
} from "./pengguna-types";

type PenggunaListClientProps = {
  items: UserListItem[];
  pagination?: PaginationMeta;
  facets?: UserListFacets;
  selectedUser: UserDetail | null;
  queryState: UserListQueryState;
  selectedUnit: OrganizationUnitSummary | null;
  selectedArea: AreaSearchResult | null;
};

function buildHref(pathname: string, queryState: UserListQueryState, overrides: Partial<UserListQueryState> = {}) {
  const nextState = {
    ...queryState,
    ...overrides,
  };
  const searchParams = new URLSearchParams();

  if (nextState.q) searchParams.set("q", nextState.q);
  if (nextState.status) searchParams.set("status", nextState.status);
  if (nextState.roleCode) searchParams.set("roleCode", nextState.roleCode);
  if (nextState.positionCode) searchParams.set("positionCode", nextState.positionCode);
  if (nextState.unitId) searchParams.set("unitId", nextState.unitId);
  if (nextState.areaId) searchParams.set("areaId", nextState.areaId);
  if (nextState.page > 1) searchParams.set("page", String(nextState.page));
  if (nextState.limit !== 20) searchParams.set("limit", String(nextState.limit));
  if (nextState.selected) searchParams.set("selected", nextState.selected);

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

function SelectionSummary({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-[2px] border border-border/70 bg-muted/30 px-3 py-2">
      <div>
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm font-medium">{value}</div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClear}>
        Hapus
      </Button>
    </div>
  );
}

export function PenggunaListClient({
  items,
  pagination,
  facets,
  selectedUser,
  queryState,
  selectedUnit,
  selectedArea,
}: PenggunaListClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(queryState.q);
  const [status, setStatus] = useState(queryState.status);
  const [roleCode, setRoleCode] = useState(queryState.roleCode);
  const [positionCode, setPositionCode] = useState(queryState.positionCode);
  const [limit, setLimit] = useState(String(queryState.limit));
  const [unitQuery, setUnitQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [unitResults, setUnitResults] = useState<OrganizationUnitSummary[]>([]);
  const [areaResults, setAreaResults] = useState<AreaSearchResult[]>([]);
  const [activeUnit, setActiveUnit] = useState<OrganizationUnitSummary | null>(selectedUnit);
  const [activeArea, setActiveArea] = useState<AreaSearchResult | null>(selectedArea);
  const deferredUnitQuery = useDeferredValue(unitQuery);
  const deferredAreaQuery = useDeferredValue(areaQuery);

  useEffect(() => {
    setQ(queryState.q);
    setStatus(queryState.status);
    setRoleCode(queryState.roleCode);
    setPositionCode(queryState.positionCode);
    setLimit(String(queryState.limit));
    setActiveUnit(selectedUnit);
    setActiveArea(selectedArea);
  }, [
    queryState.limit,
    queryState.positionCode,
    queryState.q,
    queryState.roleCode,
    queryState.status,
    selectedArea,
    selectedUnit,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadUnits() {
      if (deferredUnitQuery.trim().length < 2) {
        setUnitResults([]);
        return;
      }

      const results = await apiBrowserFetch<OrganizationUnitSummary[]>("/organization-units", {
        query: {
          search: deferredUnitQuery.trim(),
          page: 1,
          limit: 10,
        },
      });

      if (!cancelled) {
        setUnitResults(results);
      }
    }

    loadUnits().catch(() => {
      if (!cancelled) {
        setUnitResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredUnitQuery]);

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
        roleCode,
        positionCode,
        unitId: activeUnit?.id ?? "",
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
    setRoleCode("");
    setPositionCode("");
    setLimit("20");
    setUnitQuery("");
    setAreaQuery("");
    setUnitResults([]);
    setAreaResults([]);
    setActiveUnit(null);
    setActiveArea(null);
    router.push(pathname);
  }

  const lockedCount = facets?.security?.locked ?? 0;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-heading text-[32px] font-bold leading-tight tracking-tight">Pengguna</h1>
        <p className="max-w-4xl text-[15px] font-medium text-muted-foreground">
          Workspace admin untuk provisioning akun, memantau sinkronisasi role auth dengan jabatan aktif, dan menjalankan
          aksi keamanan tanpa meninggalkan konteks tabel utama.
        </p>
      </div>

      <Card className="rounded-[2px] border border-border/70 shadow-none">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-[18px] text-sky-500" />
            Filter Operasional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid items-end gap-3 xl:grid-cols-12">
            <div className="space-y-2 xl:col-span-6">
              <Label htmlFor="user-search">Cari user</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="user-search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  className="pl-9"
                  placeholder="Nama, username, atau email"
                />
              </div>
            </div>

            <div className="space-y-2 xl:col-span-3">
              <Label>Status</Label>
              <NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}>
                <NativeSelectOption value="">Semua status</NativeSelectOption>
                {USER_STATUS_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-2 xl:col-span-3">
              <Label>Jabatan</Label>
              <NativeSelect value={positionCode} onChange={(event) => setPositionCode(event.target.value)}>
                <NativeSelectOption value="">Semua jabatan</NativeSelectOption>
                {POSITION_CODE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 border-t border-border/70 pt-4 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="unit-search">Filter unit organisasi</Label>
                <Input
                  id="unit-search"
                  value={unitQuery}
                  onChange={(event) => setUnitQuery(event.target.value)}
                  placeholder="Ketik minimal 2 karakter nama atau kode unit"
                />
              </div>
              {activeUnit ? (
                <SelectionSummary
                  label="Unit aktif"
                  value={`${activeUnit.code} • ${activeUnit.name}`}
                  onClear={() => setActiveUnit(null)}
                />
              ) : null}
              {unitResults.length ? (
                <div className="rounded-[2px] border border-border/70 bg-muted/10">
                  {unitResults.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => {
                        setActiveUnit(unit);
                        setUnitQuery("");
                        setUnitResults([]);
                      }}
                      className="flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 not-last:border-b"
                    >
                      <div>
                        <div className="font-medium">{unit.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {unit.code} • {unit.type}
                        </div>
                      </div>
                      <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="area-search">Filter wilayah</Label>
                <Input
                  id="area-search"
                  value={areaQuery}
                  onChange={(event) => setAreaQuery(event.target.value)}
                  placeholder="Ketik minimal 2 karakter nama atau kode area"
                />
              </div>
              {activeArea ? (
                <SelectionSummary
                  label="Wilayah aktif"
                  value={`${activeArea.code} • ${activeArea.name}`}
                  onClear={() => setActiveArea(null)}
                />
              ) : null}
              {areaResults.length ? (
                <div className="rounded-[2px] border border-border/70 bg-muted/10">
                  {areaResults.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => {
                        setActiveArea(area);
                        setAreaQuery("");
                        setAreaResults([]);
                      }}
                      className="flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 not-last:border-b"
                    >
                      <div>
                        <div className="font-medium">{area.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {area.code} • {area.level}
                        </div>
                      </div>
                      <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 px-6 py-4">
          <div className="text-[13px] text-muted-foreground">
            {pagination?.total ?? items.length} pengguna terdeteksi · {lockedCount} profil dikunci
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={clearFilters}
              className="rounded-[3px] border-slate-600 text-slate-300"
            >
              Atur ulang
            </Button>
            <Button
              type="button"
              onClick={applyFilters}
              className="rounded-[3px] bg-sky-600 text-white hover:bg-sky-700"
            >
              Terapkan filter
            </Button>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2px] border border-border/70 shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/70">
          <div className="space-y-1">
            <CardTitle className="text-[18px]">Daftar Pengguna</CardTitle>
            <div className="text-[13px] text-muted-foreground">
              {pagination?.total ?? items.length} record · Halaman {queryState.page} dari {totalPages}
            </div>
          </div>
          <Button asChild className="rounded-[3px] bg-green-600 text-white hover:bg-green-700">
            <Link href="/dashboard/admin-system/pengguna/baru">Tambah pengguna</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {items.length ? (
            <div className="overflow-x-auto rounded-[2px] border border-border/70">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[13px] uppercase tracking-wide">Pengguna</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Jabatan</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Unit</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Login terakhir</TableHead>
                    <TableHead className="text-right text-[13px] uppercase tracking-wide">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((user) => {
                    const assignment = getPrimaryAssignment(user);
                    const locked = isUserLocked(user);
                    const isSelected = selectedUser?.id === user.id;

                    return (
                      <TableRow
                        key={user.id}
                        className={isSelected ? "bg-sky-500/5 outline outline-1 outline-sky-500/50" : undefined}
                      >
                        <TableCell>
                          <Link
                            href={`/dashboard/admin-system/pengguna/${user.id}`}
                            className="block space-y-1 hover:underline"
                          >
                            <div className="font-medium">
                              {user.fullName || user.authUser.name || user.authUser.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{user.username || "-"} • {user.authUser.email}
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{assignment?.position.title || "-"}</div>
                          <div className="text-xs text-muted-foreground">{assignment?.position.seatCode || "-"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {assignment?.position.organizationUnit?.name?.replace("Field Coordination Unit ", "") ||
                              "-"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {assignment?.position.organizationUnit?.code || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                              {USER_STATUS_OPTIONS.find((option) => option.value === user.status)?.label || user.status}
                            </Badge>
                            {locked ? <Badge variant="destructive">Dikunci</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDateTime(user.lastLoginAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-[3px] border-sky-700 text-sky-400 hover:bg-sky-500/10"
                          >
                            <Link href={`/dashboard/admin-system/pengguna/${user.id}`}>Detail</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="border border-dashed border-border/70">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users className="size-4" />
                </EmptyMedia>
                <EmptyTitle>Belum ada user yang cocok</EmptyTitle>
                <EmptyDescription>
                  Ubah kombinasi filter atau mulai provisioning user baru jika roster masih kosong.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-border/70">
            {/* Left side: Rows per page selector */}
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground select-none">
              <span>Baris per halaman:</span>
              <select
                value={limit}
                onChange={(event) => {
                  const nextLimit = event.target.value;
                  setLimit(nextLimit);
                  router.push(
                    buildHref(pathname, queryState, {
                      q,
                      status,
                      roleCode,
                      positionCode,
                      unitId: activeUnit?.id ?? "",
                      areaId: activeArea?.id ?? "",
                      limit: Number(nextLimit) || 20,
                      page: 1,
                      selected: "",
                    })
                  );
                }}
                className="h-8 rounded-[4px] border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs text-slate-700 dark:text-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={String(value)} className="bg-white dark:bg-slate-950">
                    {value} baris
                  </option>
                ))}
              </select>
            </div>

            {/* Right side: Pagination */}
            {pagination && totalPages > 1 ? (
              <Pagination className="mx-0 w-auto justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={buildHref(pathname, queryState, {
                        page: Math.max(queryState.page - 1, 1),
                      })}
                      aria-disabled={queryState.page <= 1}
                      className={queryState.page <= 1 ? "pointer-events-none opacity-50" : undefined}
                      text="Sebelumnya"
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index): number => index + 1)
                    .filter(
                      (pageNumber) =>
                        pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - queryState.page) <= 1,
                    )
                    .map((pageNumber) => (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          href={buildHref(pathname, queryState, { page: pageNumber })}
                          isActive={pageNumber === queryState.page}
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                  <PaginationItem>
                    <PaginationNext
                      href={buildHref(pathname, queryState, {
                        page: Math.min(queryState.page + 1, totalPages),
                      })}
                      aria-disabled={queryState.page >= totalPages}
                      className={queryState.page >= totalPages ? "pointer-events-none opacity-50" : undefined}
                      text="Berikutnya"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
