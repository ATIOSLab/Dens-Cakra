"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, MapPin, Plus, Search, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant="outline">Master Jabatan</Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Jabatan & Reporting Line</h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Kelola jabatan sebagai slot personel lengkap dengan role, unit organisasi, cabang komando, dan wilayah tanggung jawab.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin-system/jabatan-reporting-line/baru">
            <Plus className="size-4" />
            Tambah jabatan
          </Link>
        </Button>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4" />
            Filter jabatan
          </CardTitle>
          <CardDescription>Gunakan role dan tipe jabatan untuk mempersempit master position.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1.2fr)_220px_220px_auto]">
          <Input
            defaultValue={queryState.q}
            placeholder="Cari seat code atau nama jabatan"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                applyFilter({ q: event.currentTarget.value.trim() });
              }
            }}
          />
          <NativeSelect value={queryState.roleCode} onChange={(event) => applyFilter({ roleCode: event.target.value })}>
            <NativeSelectOption value="">Semua role</NativeSelectOption>
            {ROLE_CODE_OPTIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
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
          <Button type="button" variant="outline" onClick={() => applyFilter({ q: "", roleCode: "", positionCode: "" })}>
            Reset
          </Button>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Daftar jabatan</CardTitle>
          <CardDescription>
            {pagination?.total ?? items.length} jabatan aktif terdaftar sebagai master penempatan personel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-border/70">
            <div className="grid grid-cols-[minmax(280px,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_120px] border-b border-border/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <div>Jabatan</div>
              <div>Unit</div>
              <div>Wilayah</div>
              <div>Status</div>
            </div>
            {items.map((position) => {
              const assignmentCount = position.assignments?.length ?? 0;
              return (
                <Link
                  key={position.id}
                  href={`/dashboard/admin-system/jabatan-reporting-line/${position.id}`}
                  className="grid grid-cols-[minmax(280px,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_120px] border-b border-border/60 px-3 py-3 text-sm transition hover:bg-muted/35 last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <BriefcaseBusiness className="size-4 text-muted-foreground" />
                      <span className="truncate">{position.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {position.seatCode} - {position.role?.name ?? position.role?.code ?? position.code} - {branchLabel(position.branch)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-medium">{position.organizationUnit?.name ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{position.organizationUnit?.code ?? "-"}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="truncate">{coverageLabel(position)}</span>
                    </div>
                  </div>
                  <div>
                    <Badge variant={assignmentCount ? "default" : "outline"} className="gap-1">
                      <Users className="size-3" />
                      {assignmentCount ? "Terisi" : "Kosong"}
                    </Badge>
                  </div>
                </Link>
              );
            })}
            {!items.length ? <div className="px-3 py-8 text-center text-sm text-muted-foreground">Belum ada jabatan sesuai filter.</div> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
