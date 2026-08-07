"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BriefcaseBusiness, MapPin, Plus, Users } from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetchEnvelope } from "@/lib/api/browser-client";
import type { PaginationMeta } from "@/lib/api/types";

import { POSITION_CODE_OPTIONS, ROLE_CODE_OPTIONS } from "../../pengguna/_components/pengguna-types";
import type { JabatanListQueryState, JabatanResource } from "./jabatan-types";

type Props = {
  items: JabatanResource[];
  pagination?: PaginationMeta;
  queryState: JabatanListQueryState;
};

function branchLabel(branch?: string | null) {
  if (branch === "PUSAT") return "Pusat";
  if (branch === "DIRECTORATE") return "Direktorat";
  if (branch === "BINDA") return "Binda";
  return "-";
}

function coverageLabel(position: JabatanResource) {
  const coverages = position.areaCoverages ?? [];
  if (!coverages.length) return "Belum ada wilayah";
  const primary = coverages.find((coverage) => coverage.isPrimary) ?? coverages[0];
  return coverages.length > 1 ? `${primary.area.name} +${coverages.length - 1}` : primary.area.name;
}

export function JabatanListClient({ items, pagination, queryState }: Props) {
  const router = useRouter();
  const [viewType, setViewType] = useState<"table" | "card">("table");
  const [clientItems, setClientItems] = useState<JabatanResource[]>(items);
  const [clientPagination, setClientPagination] = useState<PaginationMeta | undefined>(pagination);
  const [currentPage, setCurrentPage] = useState(queryState.page ?? 1);
  const [currentLimit, setCurrentLimit] = useState(queryState.limit ?? 20);
  const [loadingPage, setLoadingPage] = useState(false);

  useEffect(() => {
    setClientItems(items);
    setClientPagination(pagination);
    setCurrentPage(queryState.page ?? 1);
    setCurrentLimit(queryState.limit ?? 20);
  }, [items, pagination, queryState.limit, queryState.page]);

  function buildListUrl(state: JabatanListQueryState) {
    const params = new URLSearchParams();

    if (state.q) params.set("q", state.q);
    if (state.roleCode) params.set("roleCode", state.roleCode);
    if (state.positionCode) params.set("positionCode", state.positionCode);
    if (state.unitId) params.set("unitId", state.unitId);
    params.set("page", String(state.page));
    params.set("limit", String(state.limit));

    return `/dashboard/admin-system/jabatan-reporting-line?${params.toString()}`;
  }

  async function fetchPage(next: Partial<JabatanListQueryState>) {
    const state = {
      ...queryState,
      page: currentPage,
      limit: currentLimit,
      ...next,
    };

    const totalPages = clientPagination?.totalPages;
    if (state.page < 1 || (totalPages !== undefined && state.page > totalPages)) {
      return;
    }

    setLoadingPage(true);
    setCurrentPage(state.page);
    setCurrentLimit(state.limit);

    try {
      const response = await apiBrowserFetchEnvelope<JabatanResource[]>("/positions", {
        query: {
          page: state.page,
          limit: state.limit,
          isActive: true,
          ...(state.q ? { search: state.q } : {}),
          ...(state.roleCode ? { roleCode: state.roleCode } : {}),
          ...(state.positionCode ? { code: state.positionCode } : {}),
          ...(state.unitId ? { unitId: state.unitId } : {}),
        },
      });

      setClientItems(response.data);
      setClientPagination(response.meta?.pagination);
      window.history.pushState(null, "", buildListUrl(state));
    } finally {
      setLoadingPage(false);
    }
  }

  function applyFilter(next: Partial<JabatanListQueryState>) {
    const params = new URLSearchParams();
    const state = { ...queryState, ...next, page: next.page ?? 1 };

    if (state.q) params.set("q", state.q);
    if (state.roleCode) params.set("roleCode", state.roleCode);
    if (state.positionCode) params.set("positionCode", state.positionCode);
    if (state.unitId) params.set("unitId", state.unitId);
    params.set("page", String(state.page));
    params.set("limit", String(state.limit));
    router.push(`/dashboard/admin-system/jabatan-reporting-line?${params.toString()}`);
  }

  const activeFilterCount = [queryState.q, queryState.roleCode, queryState.positionCode, queryState.unitId].filter(
    Boolean,
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant="outline">Master Jabatan</Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Jabatan & Reporting Line</h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Kelola jabatan sebagai slot personel lengkap dengan role, unit organisasi, cabang komando, dan wilayah
            tanggung jawab.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin-system/jabatan-reporting-line/baru">
            <Plus className="size-4" />
            Tambah jabatan
          </Link>
        </Button>
      </div>

      <FilterPanel
        title="Filter jabatan"
        description="Gunakan pencarian, role, dan tipe jabatan untuk mempersempit seluruh master jabatan."
        activeFilterCount={activeFilterCount}
        onReset={() => applyFilter({ q: "", roleCode: "", positionCode: "", unitId: "" })}
        resultSummary={`${clientPagination?.total ?? clientItems.length} jabatan`}
        contentClassName="md:grid-cols-[minmax(0,1.2fr)_220px_220px]"
      >
        <Input
          aria-label="Cari jabatan"
          defaultValue={queryState.q}
          className="h-10"
          placeholder="Cari seat code atau nama jabatan"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyFilter({ q: event.currentTarget.value.trim() });
            }
          }}
        />
        <NativeSelect
          aria-label="Filter role jabatan"
          className="h-10"
          value={queryState.roleCode}
          onChange={(event) => applyFilter({ roleCode: event.target.value })}
        >
          <NativeSelectOption value="">Semua role</NativeSelectOption>
          {ROLE_CODE_OPTIONS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter tipe jabatan"
          className="h-10"
          value={queryState.positionCode}
          onChange={(event) => applyFilter({ positionCode: event.target.value })}
        >
          <NativeSelectOption value="">Semua tipe</NativeSelectOption>
          {POSITION_CODE_OPTIONS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FilterPanel>

      <Card className="border border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Daftar jabatan</CardTitle>
            <CardDescription>
              {clientPagination?.total ?? clientItems.length} jabatan aktif terdaftar sebagai master penempatan
              personel.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-[0.28em] sm:inline">
              Tampilan
            </span>
            <ViewModeToggle
              value={viewType}
              onValueChange={setViewType}
              className="rounded-[6px] border-slate-200 bg-slate-100 dark:border-blue-400/12 dark:bg-slate-900"
              buttonClassName="size-8 rounded-[4px]"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {viewType === "table" ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              <div className="grid grid-cols-[minmax(280px,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_120px] border-b border-border/70 bg-muted/20 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <div>Jabatan</div>
                <div>Unit</div>
                <div>Wilayah</div>
                <div>Status</div>
              </div>
              {clientItems.map((position) => {
                const assignmentCount = position.assignments?.length ?? 0;
                return (
                  <Link
                    key={position.id}
                    href={`/dashboard/admin-system/jabatan-reporting-line/${position.id}`}
                    className="grid grid-cols-[minmax(280px,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_120px] border-b border-border/60 px-3 py-3 text-sm transition hover:bg-muted/35 last:border-b-0 items-center"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <BriefcaseBusiness className="size-4 text-sky-500 shrink-0 stroke-[1.5]" />
                        <span className="truncate">{position.title}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono">
                        {position.seatCode} - {position.role?.name ?? position.role?.code ?? position.code} -{" "}
                        {branchLabel(position.branch)}
                      </div>
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-semibold text-foreground">
                        {position.organizationUnit?.name ?? "-"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {position.organizationUnit?.code ?? "-"}
                      </div>
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                        <MapPin className="size-3.5 text-sky-500/80 shrink-0 stroke-[1.5]" />
                        <span className="truncate text-foreground font-semibold">{coverageLabel(position)}</span>
                      </div>
                    </div>
                    <div>
                      <Badge
                        variant={assignmentCount ? "default" : "outline"}
                        className={`gap-1 rounded-[4px] text-[10px] uppercase font-mono ${assignmentCount ? "bg-emerald-500/10 text-emerald-600 dark:text-[#22C55E] dark:bg-emerald-950/40 border-emerald-500/20" : ""}`}
                      >
                        <Users className="size-3 stroke-[1.5]" />
                        {assignmentCount ? "Terisi" : "Kosong"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
              {!clientItems.length ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Belum ada jabatan sesuai filter.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientItems.map((position) => {
                const assignmentCount = position.assignments?.length ?? 0;
                return (
                  <Link
                    key={position.id}
                    href={`/dashboard/admin-system/jabatan-reporting-line/${position.id}`}
                    className="group border border-border/70 hover:border-sky-500/40 dark:bg-slate-900 bg-white dark:hover:bg-blue-400/5 hover:bg-slate-50 rounded-[10px] p-4 flex flex-col justify-between gap-3 shadow-xs hover:-translate-y-[2px] transition-all duration-150 ease-out"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <BriefcaseBusiness className="size-4.5 text-sky-500 shrink-0 stroke-[1.5]" />
                          <span className="text-[13px] line-clamp-1 group-hover:text-sky-500 transition-colors font-semibold">
                            {position.title}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground font-mono space-y-0.5 border-t dark:border-blue-400/8 border-slate-100 pt-2">
                        <div className="flex justify-between">
                          <span>Seat Code:</span>
                          <span className="font-semibold text-foreground">{position.seatCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Branch:</span>
                          <span className="font-semibold text-foreground">{branchLabel(position.branch)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1.5 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Unit Organisasi
                          </span>
                          <span className="truncate font-semibold text-foreground">
                            {position.organizationUnit?.name ?? "-"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Cakupan Wilayah
                          </span>
                          <span className="truncate font-semibold text-foreground">{coverageLabel(position)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t dark:border-blue-400/8 border-slate-100 pt-2 mt-1">
                      <Badge
                        variant={assignmentCount ? "default" : "outline"}
                        className={`gap-1 rounded-[4px] text-[10px] uppercase font-mono ${assignmentCount ? "bg-emerald-500/10 text-emerald-600 dark:text-[#22C55E] dark:bg-emerald-950/40 border-emerald-500/20" : ""}`}
                      >
                        <Users className="size-3 stroke-[1.5]" />
                        {assignmentCount ? "Terisi" : "Kosong"}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide group-hover:text-sky-500 transition-colors">
                        Detail →
                      </span>
                    </div>
                  </Link>
                );
              })}
              {!clientItems.length ? (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Belum ada jabatan sesuai filter.
                </div>
              ) : null}
            </div>
          )}

          {clientPagination && (
            <TablePagination
              page={currentPage}
              limit={currentLimit}
              total={clientPagination.total ?? clientItems.length}
              loading={loadingPage}
              onPageChange={(page) => void fetchPage({ page })}
              onLimitChange={(limit) => void fetchPage({ limit, page: 1 })}
              className="mt-4 border border-slate-200 dark:border-white/5 rounded-xl bg-white dark:bg-[#131A26] px-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
