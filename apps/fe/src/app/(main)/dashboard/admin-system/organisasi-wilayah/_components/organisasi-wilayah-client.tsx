"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { geoMercator, geoPath } from "d3-geo";
import { AlertTriangle, MapPinned } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { ProvinceBoundaryCollection } from "@/features/directives/types";
import { apiBrowserFetch } from "@/lib/api/browser-client";

import type {
  RegionalMasterDirectorate,
  RegionalMasterOverview,
  RegionalMasterProvinceSummary,
} from "./organisasi-wilayah-types";

type OrganisasiWilayahClientProps = {
  initialOverview: RegionalMasterOverview;
  provinceBoundaries: ProvinceBoundaryCollection;
};

type MasterMapHoverState = {
  provinceId: string;
  provinceName: string;
  provinceCode: string;
  bindaName: string | null;
  directorateCount: number;
};

type BoundaryFeatureProperties = ProvinceBoundaryCollection["features"][number]["properties"] & {
  selected?: boolean;
  hasMaster?: boolean;
  hasBinda?: boolean;
  directorateCount?: number;
  masterCount?: number;
};

type BoundaryCollectionWithCoverage = Omit<ProvinceBoundaryCollection, "features"> & {
  features: Array<
    Omit<ProvinceBoundaryCollection["features"][number], "properties"> & {
      properties: BoundaryFeatureProperties;
    }
  >;
};

type WorkspaceFilter = "ALL" | "BINDA" | "DIRECTORATE";

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 430;
const FALLBACK_BOUNDS = {
  minLongitude: 93,
  maxLongitude: 143,
  minLatitude: -12,
  maxLatitude: 9,
};

function buildBoundaryCollection(
  boundaries: ProvinceBoundaryCollection,
  provinces: RegionalMasterProvinceSummary[],
  selectedProvinceId: string | null,
): BoundaryCollectionWithCoverage {
  const provinceMap = new Map(provinces.map((item) => [item.province.id, item]));

  return {
    type: "FeatureCollection" as const,
    features: boundaries.features.map((feature) => {
      const provinceId = feature.properties?.areaId;
      const summary = provinceId ? provinceMap.get(provinceId) : null;
      const masterCount = (summary?.binda ? 1 : 0) + (summary?.directorates.length ?? 0);

      return {
        ...feature,
        properties: {
          ...feature.properties,
          areaId: provinceId,
          name: summary?.province.name ?? feature.properties?.name ?? "Provinsi",
          code: summary?.province.code ?? feature.properties?.code ?? "-",
          selected: provinceId === selectedProvinceId,
          hasMaster: masterCount > 0,
          hasBinda: Boolean(summary?.binda),
          directorateCount: summary?.directorates.length ?? 0,
          masterCount,
        },
      };
    }),
  };
}

function buildHoverState(summary: RegionalMasterProvinceSummary): MasterMapHoverState {
  return {
    provinceId: summary.province.id,
    provinceName: summary.province.name,
    provinceCode: summary.province.code,
    bindaName: summary.binda?.name ?? null,
    directorateCount: summary.directorates.length,
  };
}

function flattenDirectorates(provinces: RegionalMasterProvinceSummary[]) {
  const items = new Map<string, RegionalMasterDirectorate>();

  for (const province of provinces) {
    for (const directorate of province.directorates) {
      items.set(directorate.unitId, directorate);
    }
  }

  return [...items.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function buildCreateHref(path: string, selectedProvinceId: string | null) {
  return selectedProvinceId ? `${path}?provinceAreaId=${selectedProvinceId}` : path;
}

function ProvinceCoverageMap({
  boundaries,
  hasProvinceBoundaries,
  fallbackMarkerProvinces,
  selectedProvinceId,
  onSelectProvince,
  onHoverProvince,
}: {
  boundaries: BoundaryCollectionWithCoverage;
  hasProvinceBoundaries: boolean;
  fallbackMarkerProvinces: RegionalMasterProvinceSummary[];
  selectedProvinceId: string | null;
  onSelectProvince: (provinceId: string) => void;
  onHoverProvince: (state: MasterMapHoverState | null) => void;
}) {
  const projection = useMemo(() => {
    if (!hasProvinceBoundaries || !boundaries.features.length) {
      return null;
    }

    return geoMercator().fitExtent(
      [
        [18, 18],
        [MAP_WIDTH - 18, MAP_HEIGHT - 18],
      ],
      boundaries as Parameters<ReturnType<typeof geoMercator>["fitExtent"]>[1],
    );
  }, [boundaries, hasProvinceBoundaries]);

  const pathGenerator = useMemo(() => {
    if (!projection) {
      return null;
    }

    return geoPath(projection);
  }, [projection]);

  if (hasProvinceBoundaries && pathGenerator) {
    return (
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label="Peta cakupan organisasi per provinsi"
      >
        <g>
          {boundaries.features.map((feature) => {
            const provinceId = feature.properties?.areaId;
            const pathData = pathGenerator(feature);

            if (!provinceId || !pathData) {
              return null;
            }

            const isSelected = provinceId === selectedProvinceId;
            const hasBinda = Boolean(feature.properties?.hasBinda);
            const hasMaster = Boolean(feature.properties?.hasMaster);
            const fill = isSelected ? (hasBinda ? "#38bdf8" : "#f59e0b") : hasMaster ? "#1d4ed8" : "#94a3b8";
            const fillOpacity = isSelected ? 0.8 : hasMaster ? 0.58 : 0.2;
            const stroke = isSelected ? "#e0f2fe" : hasMaster ? "#60a5fa" : "#64748b";
            const strokeWidth = isSelected ? 1.9 : 1;

            return (
              /* biome-ignore lint/a11y/useSemanticElements: SVG paths cannot use a native button while preserving map geometry. */
              <path
                key={provinceId}
                d={pathData}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeOpacity={0.96}
                strokeWidth={strokeWidth}
                className="cursor-pointer transition-all duration-150 hover:fill-opacity-95 focus:outline-none"
                role="button"
                tabIndex={0}
                onMouseEnter={() =>
                  onHoverProvince({
                    provinceId,
                    provinceName: feature.properties?.name ?? "Provinsi",
                    provinceCode: feature.properties?.code ?? "-",
                    bindaName:
                      fallbackMarkerProvinces.find((item) => item.province.id === provinceId)?.binda?.name ?? null,
                    directorateCount:
                      fallbackMarkerProvinces.find((item) => item.province.id === provinceId)?.directorates.length ?? 0,
                  })
                }
                onMouseLeave={() => onHoverProvince(null)}
                onClick={() => onSelectProvince(provinceId)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") onSelectProvince(provinceId);
                }}
              />
            );
          })}
        </g>
      </svg>
    );
  }

  return (
    <div className="relative h-full w-full">
      {fallbackMarkerProvinces.map((summary) => {
        const longitude = summary.province.centroidLongitude;
        const latitude = summary.province.centroidLatitude;

        if (longitude === null || latitude === null) {
          return null;
        }

        const left =
          ((longitude - FALLBACK_BOUNDS.minLongitude) / (FALLBACK_BOUNDS.maxLongitude - FALLBACK_BOUNDS.minLongitude)) *
          100;
        const top =
          ((FALLBACK_BOUNDS.maxLatitude - latitude) / (FALLBACK_BOUNDS.maxLatitude - FALLBACK_BOUNDS.minLatitude)) *
          100;
        const isSelected = summary.province.id === selectedProvinceId;
        const hasBinda = Boolean(summary.binda);
        const hasDirectorate = summary.directorates.length > 0;

        return (
          <button
            key={summary.province.id}
            type="button"
            onMouseEnter={() => onHoverProvince(buildHoverState(summary))}
            onMouseLeave={() => onHoverProvince(null)}
            onClick={() => onSelectProvince(summary.province.id)}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <span
              className={`mx-auto block size-4 rounded-[2px] border-2 transition-colors ${
                isSelected
                  ? "border-sky-100 bg-sky-500"
                  : hasBinda
                    ? "border-cyan-100 bg-cyan-500"
                    : hasDirectorate
                      ? "border-amber-100 bg-amber-500"
                      : "border-slate-100 bg-slate-500"
              }`}
            />
            <span
              className={`mt-1 block rounded-[2px] px-2 py-0.5 text-[11px] font-medium transition-colors ${
                isSelected ? "bg-sky-600 text-white" : "bg-white/90 text-slate-700 group-hover:bg-white"
              }`}
            >
              {summary.province.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function OrganisasiWilayahClient({ initialOverview, provinceBoundaries }: OrganisasiWilayahClientProps) {
  const [overview, setOverview] = useState(initialOverview);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<MasterMapHoverState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [workspaceFilter, setWorkspaceFilter] = useState<WorkspaceFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [workspaceFilter, selectedProvinceId]);

  const selectedProvince =
    (selectedProvinceId ? overview.provinces.find((item) => item.province.id === selectedProvinceId) : null) ?? null;
  const visibleProvinceRows = selectedProvince ? [selectedProvince] : overview.provinces;
  const visibleDirectorates = flattenDirectorates(visibleProvinceRows);
  const deputyOptions = overview.deputyOptions;
  const boundaryCollection = buildBoundaryCollection(provinceBoundaries, overview.provinces, selectedProvinceId);
  const hasProvinceBoundaries = boundaryCollection.features.length > 0;
  const fallbackMarkerProvinces = overview.provinces.filter(
    (item) => item.province.centroidLatitude !== null && item.province.centroidLongitude !== null,
  );
  const workspaceRows = useMemo(() => {
    const rows: Array<{
      id: string;
      kind: "BINDA" | "DIRECTORATE";
      name: string;
      code: string;
      area: string;
      status: string;
      statusTone: "active" | "pending";
      personnel: string;
      updated: string;
      href: string;
      actionLabel: string;
    }> = [];

    if (workspaceFilter !== "DIRECTORATE") {
      visibleProvinceRows.forEach((summary) => {
        const binda = summary.binda;
        rows.push({
          id: `binda:${summary.province.id}`,
          kind: "BINDA",
          name: binda?.name ?? "Binda belum terdaftar",
          code: binda?.code ?? "-",
          area: summary.province.name,
          status: binda ? "Aktif" : "Belum terdaftar",
          statusTone: binda ? "active" : "pending",
          personnel: "-",
          updated: "-",
          href: binda
            ? `/dashboard/admin-system/organisasi-wilayah/organisasi/${binda.unitId}`
            : buildCreateHref("/dashboard/admin-system/organisasi-wilayah/organisasi/baru", summary.province.id),
          actionLabel: binda ? "Detail" : "Tambah",
        });
      });
    }

    if (workspaceFilter !== "BINDA") {
      visibleDirectorates.forEach((directorate) => {
        rows.push({
          id: `directorate:${directorate.unitId}`,
          kind: "DIRECTORATE",
          name: directorate.name,
          code: directorate.profileCode ?? directorate.code,
          area: directorate.coverageAreas.map((coverage) => coverage.name).join(", ") || "-",
          status: "Aktif",
          statusTone: "active",
          personnel: "-",
          updated: "-",
          href: `/dashboard/admin-system/organisasi-wilayah/organisasi/${directorate.unitId}`,
          actionLabel: "Detail",
        });
      });
    }

    return rows;
  }, [visibleDirectorates, visibleProvinceRows, workspaceFilter]);

  const rowsPerPage = 10;
  const totalRows = workspaceRows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return workspaceRows.slice(start, start + rowsPerPage);
  }, [workspaceRows, currentPage]);

  function toggleProvinceSelection(provinceId: string) {
    setSelectedProvinceId((current) => (current === provinceId ? null : provinceId));
  }

  async function refreshOverview() {
    setIsRefreshing(true);

    try {
      const next = await apiBrowserFetch<RegionalMasterOverview>("/organization-units/regional-masters");
      startTransition(() => {
        setOverview(next);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memuat ulang master wilayah.";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Master Wilayah</Badge>
          <Badge variant="outline">{overview.totals.provinceCount} provinsi aktif</Badge>
          <Badge variant="outline">{overview.totals.coveredProvinceCount} provinsi sudah ter-cover</Badge>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Organisasi Wilayah</h1>
        <p className="max-w-4xl text-muted-foreground text-sm">
          Kelola master Binda per provinsi dan Direktorat wilayah multi-provinsi dalam satu kanvas admin. Peta di atas
          memberi konteks coverage, sementara tabel bawah menjaga registrasi unit tetap rapi.
        </p>
      </div>

      {!deputyOptions.length ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Deputi induk belum tersedia</AlertTitle>
          <AlertDescription>
            Sistem belum menemukan unit `DEPUTI` aktif sebagai parent. Tambahkan atau aktifkan dulu unit deputi agar
            registrasi Binda dan Direktorat wilayah bisa diproses.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-6">
        <Card className="rounded-[2px] border border-border/70 shadow-none xl:col-span-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-4" />
              Peta Coverage Master Wilayah
            </CardTitle>
            <CardDescription>
              Klik provinsi pada peta untuk memfilter tabel di bawah dan mempersiapkan registrasi unit wilayah.
            </CardDescription>
            <CardAction className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{overview.totals.bindaCount} Binda</Badge>
              <Badge variant="secondary">{overview.totals.directorateCount} Direktorat</Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedProvinceId(null)}
                disabled={!selectedProvinceId}
              >
                Reset filter
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasProvinceBoundaries ? (
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertTitle>Boundary provinsi belum tersedia</AlertTitle>
                <AlertDescription>
                  Peta tetap ditampilkan memakai basemap dan marker centroid provinsi. Saat boundary aktif tersedia di
                  database, klik area poligon akan otomatis ikut aktif.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="relative overflow-hidden rounded-[2px] border border-border/70 bg-slate-100">
              <div className="absolute left-4 top-4 z-10 max-w-sm rounded-[2px] border border-slate-300 bg-white p-4 text-slate-900">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700/80">
                  Status Provinsi
                </div>
                <div className="mt-2 text-base font-semibold">
                  {hoveredProvince?.provinceName ?? selectedProvince?.province.name ?? "Arahkan ke provinsi"}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {hoveredProvince
                    ? `${hoveredProvince.bindaName ? `Binda: ${hoveredProvince.bindaName}` : "Binda belum terdaftar"} - ${hoveredProvince.directorateCount} direktorat coverage`
                    : selectedProvince
                      ? `${selectedProvince.binda ? `Binda ${selectedProvince.binda.name} aktif` : "Belum ada Binda"} dan ${selectedProvince.directorates.length} direktorat terhubung.`
                      : hasProvinceBoundaries
                        ? "Peta menandai provinsi yang sudah punya Binda, coverage Direktorat, atau keduanya."
                        : "Mode fallback aktif. Klik marker provinsi untuk fokus ke tabel master wilayah."}
                </div>
              </div>

              <div className="h-[430px] w-full">
                <ProvinceCoverageMap
                  boundaries={boundaryCollection}
                  hasProvinceBoundaries={hasProvinceBoundaries}
                  fallbackMarkerProvinces={fallbackMarkerProvinces}
                  selectedProvinceId={selectedProvinceId}
                  onSelectProvince={toggleProvinceSelection}
                  onHoverProvince={setHoveredProvince}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-[2px]">
                {selectedProvince ? `Filter: ${selectedProvince.province.name}` : "Semua provinsi"}
              </Badge>
              <Badge variant="outline" className="rounded-[2px]">
                {overview.provinces.filter((item) => item.binda).length} provinsi sudah punya Binda
              </Badge>
              <Badge variant="outline" className="rounded-[2px]">
                {hasProvinceBoundaries
                  ? "Mode boundary aktif"
                  : `${fallbackMarkerProvinces.length} marker centroid aktif`}
              </Badge>
              <Badge variant="outline" className="rounded-[2px]">
                {isRefreshing ? "Memuat ulang..." : "Data sinkron"}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshOverview}
                disabled={isRefreshing}
                className="rounded-[3px] border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Muat ulang data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2px] border border-border/70 shadow-none xl:col-span-6">
          <CardHeader className="gap-4 border-b border-border/70">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-[22px]">Workspace Organisasi</CardTitle>
                <CardDescription className="mt-1 text-[15px]">
                  Kelola Binda dan Direktorat wilayah dalam satu daftar operasional.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {deputyOptions.length ? (
                  <Button asChild type="button" className="rounded-[3px] bg-green-600 text-white hover:bg-green-700">
                    <Link
                      href={buildCreateHref(
                        "/dashboard/admin-system/organisasi-wilayah/organisasi/baru",
                        selectedProvinceId,
                      )}
                    >
                      Tambah Binda
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" disabled className="rounded-[3px]">
                    Tambah Binda
                  </Button>
                )}
                {deputyOptions.length ? (
                  <Button asChild type="button" className="rounded-[3px] bg-green-600 text-white hover:bg-green-700">
                    <Link
                      href={buildCreateHref(
                        "/dashboard/admin-system/organisasi-wilayah/wilayah/baru",
                        selectedProvinceId,
                      )}
                    >
                      Tambah Direktorat
                    </Link>
                  </Button>
                ) : (
                  <Button type="button" disabled className="rounded-[3px]">
                    Tambah Direktorat
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <fieldset className="inline-flex border border-border/70 bg-muted/20 p-1">
                <legend className="sr-only">Jenis organisasi</legend>
                {(["ALL", "BINDA", "DIRECTORATE"] as const).map((filter) => {
                  const label = filter === "ALL" ? "Semua" : filter === "BINDA" ? "Binda" : "Direktorat";
                  return (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={workspaceFilter === filter}
                      onClick={() => setWorkspaceFilter(filter)}
                      className={`cursor-pointer border px-4 py-2 text-[13px] font-semibold transition-colors ${
                        workspaceFilter === filter
                          ? "border-sky-600 bg-sky-600 text-white"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </fieldset>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
                <span>{workspaceRows.length} record</span>
                {selectedProvince ? <Badge variant="outline">Wilayah: {selectedProvince.province.name}</Badge> : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProvinceId(null)}
                  disabled={!selectedProvinceId}
                  className="rounded-[3px] border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Atur ulang wilayah
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto rounded-[2px] border border-border/70">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[13px] uppercase tracking-wide">Nama</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Kode</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Wilayah</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Status</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Personel</TableHead>
                    <TableHead className="text-[13px] uppercase tracking-wide">Pembaruan terakhir</TableHead>
                    <TableHead className="text-right text-[13px] uppercase tracking-wide">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.length ? (
                    paginatedRows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/20">
                        <TableCell className="min-w-[220px] font-medium">
                          <div>{row.name}</div>
                          <div className="mt-1 text-[13px] text-muted-foreground">
                            {row.kind === "BINDA" ? "Badan Intelijen Daerah" : "Direktorat wilayah"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[13px] text-muted-foreground">{row.code}</TableCell>
                        <TableCell className="min-w-[220px] text-[15px]">{row.area}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-2 text-[13px] font-semibold ${
                              row.statusTone === "active" ? "text-green-400" : "text-amber-400"
                            }`}
                          >
                            <span
                              className={`size-2 ${row.statusTone === "active" ? "bg-green-500" : "bg-amber-500"}`}
                            />
                            {row.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{row.personnel}</TableCell>
                        <TableCell className="text-muted-foreground">{row.updated}</TableCell>
                        <TableCell className="text-right">
                          {row.actionLabel === "Tambah" && !deputyOptions.length ? (
                            <Button type="button" variant="outline" size="sm" disabled className="rounded-[3px]">
                                Tambah
                            </Button>
                          ) : (
                            <Button
                              asChild
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-[3px] border-sky-700 text-sky-400 hover:bg-sky-500/10"
                            >
                              <Link href={row.href}>{row.actionLabel}</Link>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Belum ada data organisasi untuk filter ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 ? (
              <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-border/70">
                <div className="text-muted-foreground text-xs">
                  Menampilkan {totalRows ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                  {Math.min(currentPage * rowsPerPage, totalRows)} dari {totalRows} organisasi.
                </div>
                <Pagination className="mx-0 w-auto justify-end select-none">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        text="Sebelumnya"
                        aria-disabled={currentPage <= 1}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage((current) => Math.max(1, current - 1));
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
                            href="#"
                            isActive={pageNumber === currentPage}
                            onClick={(event) => {
                              event.preventDefault();
                              setCurrentPage(pageNumber);
                            }}
                            className="cursor-pointer"
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        text="Berikutnya"
                        aria-disabled={currentPage >= totalPages}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        onClick={(event) => {
                          event.preventDefault();
                          setCurrentPage((current) => Math.min(totalPages, current + 1));
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
