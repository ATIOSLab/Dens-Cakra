"use client";

import { useDeferredValue, useEffect, useState } from "react";
import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  ArrowRight,
  BadgeCheck,
  Filter,
  Lock,
  Search,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
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
  POSITION_CODE_OPTIONS,
  ROLE_CODE_OPTIONS,
  USER_STATUS_OPTIONS,
  formatDateTime,
  getPrimaryAssignment,
  getRoleLabel,
  isUserLocked,
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

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Card className="border border-border/70">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline">{title}</Badge>
          <div className="rounded-lg bg-muted p-2 text-muted-foreground">{icon}</div>
        </div>
        <CardTitle className="text-3xl">{value}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SelectionSummary({
  label,
  value,
  onClear,
}: {
  label: string;
  value: string;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
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
    queryState.areaId,
    queryState.limit,
    queryState.positionCode,
    queryState.q,
    queryState.roleCode,
    queryState.status,
    queryState.unitId,
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

  const activeCount = facets?.status?.ACTIVE ?? 0;
  const pendingCount = facets?.status?.PENDING ?? 0;
  const suspendedCount = facets?.status?.SUSPENDED ?? 0;
  const lockedCount = facets?.security?.locked ?? 0;
  const selectedPrimaryAssignment = selectedUser ? getPrimaryAssignment(selectedUser) : null;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">User Provisioning</Badge>
          <Badge variant="outline">{pagination?.total ?? items.length} user terdeteksi</Badge>
          <Badge variant="outline">{lockedCount} profile sedang terkunci</Badge>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Pengguna</h1>
        <p className="max-w-4xl text-muted-foreground text-sm">
          Workspace admin untuk provisioning akun, memantau sinkronisasi role auth dengan jabatan aktif,
          dan menjalankan aksi keamanan tanpa meninggalkan konteks tabel utama.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Aktif"
          value={activeCount}
          description="User profile yang siap masuk workspace domain."
          icon={<BadgeCheck className="size-4" />}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          description="Provisioning baru yang masih perlu pengecekan lanjutan."
          icon={<Users className="size-4" />}
        />
        <StatCard
          title="Suspended"
          value={suspendedCount}
          description="Akses dibekukan tanpa menghapus histori assignment."
          icon={<ShieldAlert className="size-4" />}
        />
        <StatCard
          title="Locked"
          value={lockedCount}
          description="Operational lock aktif sehingga sesi akan selalu ditolak."
          icon={<Lock className="size-4" />}
        />
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="size-4" />
            Filter Operasional
          </CardTitle>
          <CardDescription>
            Filter URL tetap sinkron agar daftar, preview, dan pagination bisa dibagikan sebagai deep link.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-6">
            <div className="space-y-2 xl:col-span-2">
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

            <div className="space-y-2">
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


            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label>Baris per halaman</Label>
              <NativeSelect value={limit} onChange={(event) => setLimit(event.target.value)}>
                {[10, 20, 50, 100].map((value) => (
                  <NativeSelectOption key={value} value={String(value)}>
                    {value} baris
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
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
                <div className="rounded-xl border border-border/70">
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
                <div className="rounded-xl border border-border/70">
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
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={clearFilters}>
              Reset
            </Button>
            <Button type="button" onClick={applyFilters}>
              Terapkan filter
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="grid gap-4">
        <Card className="border border-border/70">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Daftar Pengguna</CardTitle>
            </div>
            <Button asChild>
              <Link href="/dashboard/admin-system/pengguna/baru">Tambah pengguna</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.length ? (
              <div className="overflow-hidden rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pengguna</TableHead>
                      <TableHead>Jabatan</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Login terakhir</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((user) => {
                      const assignment = getPrimaryAssignment(user);
                      const locked = isUserLocked(user);
                      const isSelected = selectedUser?.id === user.id;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Link
                              href={`/dashboard/admin-system/pengguna/${user.id}`}
                              className="block space-y-1 hover:underline"
                            >
                              <div className="font-medium">{user.fullName || user.authUser.name || user.authUser.email}</div>
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
                              {assignment?.position.organizationUnit?.name?.replace("Field Coordination Unit ", "") || "-"}
                            </div>
                            <div className="text-xs text-muted-foreground">{assignment?.position.organizationUnit?.code || "-"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                                {USER_STATUS_OPTIONS.find((option) => option.value === user.status)?.label || user.status}
                              </Badge>
                              {locked ? <Badge variant="destructive">Locked</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDateTime(user.lastLoginAt)}
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

            {pagination && totalPages > 1 ? (
              <Pagination className="justify-end">
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
                    .filter((pageNumber) =>
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      Math.abs(pageNumber - queryState.page) <= 1,
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
                      className={
                        queryState.page >= totalPages ? "pointer-events-none opacity-50" : undefined
                      }
                      text="Berikutnya"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
