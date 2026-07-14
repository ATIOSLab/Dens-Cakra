"use client";

import { geoMercator, geoPath } from "d3-geo";
import { startTransition, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { AlertTriangle, Building2, Landmark, MapPinned, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import type { ProvinceBoundaryCollection } from "@/features/directives/types";

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

const BINDA_PAGE_SIZE = 12;
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
      <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="h-full w-full">
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
              <path
                key={provinceId}
                d={pathData}
                fill={fill}
                fillOpacity={fillOpacity}
                stroke={stroke}
                strokeOpacity={0.96}
                strokeWidth={strokeWidth}
                className="cursor-pointer transition-all duration-150 hover:fill-opacity-95"
                onMouseEnter={() =>
                  onHoverProvince({
                    provinceId,
                    provinceName: feature.properties?.name ?? "Provinsi",
                    provinceCode: feature.properties?.code ?? "-",
                    bindaName: fallbackMarkerProvinces.find((item) => item.province.id === provinceId)?.binda?.name ?? null,
                    directorateCount:
                      fallbackMarkerProvinces.find((item) => item.province.id === provinceId)?.directorates.length ?? 0,
                  })
                }
                onMouseLeave={() => onHoverProvince(null)}
                onClick={() => onSelectProvince(provinceId)}
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
          ((longitude - FALLBACK_BOUNDS.minLongitude) /
            (FALLBACK_BOUNDS.maxLongitude - FALLBACK_BOUNDS.minLongitude)) *
          100;
        const top =
          ((FALLBACK_BOUNDS.maxLatitude - latitude) /
            (FALLBACK_BOUNDS.maxLatitude - FALLBACK_BOUNDS.minLatitude)) *
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
              className={`mx-auto block size-4 rounded-full border-2 shadow-lg transition ${
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
              className={`mt-1 block rounded-full px-2 py-0.5 text-[11px] font-medium shadow-sm transition ${
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

export function OrganisasiWilayahClient({
  initialOverview,
  provinceBoundaries,
}: OrganisasiWilayahClientProps) {
  const [overview, setOverview] = useState(initialOverview);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<MasterMapHoverState | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [bindaPage, setBindaPage] = useState(1);

  const selectedProvince =
    (selectedProvinceId
      ? overview.provinces.find((item) => item.province.id === selectedProvinceId)
      : null) ?? null;
  const visibleProvinceRows = selectedProvince ? [selectedProvince] : overview.provinces;
  const visibleDirectorates = flattenDirectorates(visibleProvinceRows);
  const deputyOptions = overview.deputyOptions;
  const boundaryCollection = buildBoundaryCollection(
    provinceBoundaries,
    overview.provinces,
    selectedProvinceId,
  );
  const hasProvinceBoundaries = boundaryCollection.features.length > 0;
  const fallbackMarkerProvinces = overview.provinces.filter(
    (item) =>
      item.province.centroidLatitude !== null &&
      item.province.centroidLongitude !== null,
  );
  const totalBindaPages = Math.max(1, Math.ceil(visibleProvinceRows.length / BINDA_PAGE_SIZE));
  const safeBindaPage = Math.min(bindaPage, totalBindaPages);
  const paginatedProvinceRows =
    selectedProvince
      ? visibleProvinceRows
      : visibleProvinceRows.slice(
          (safeBindaPage - 1) * BINDA_PAGE_SIZE,
          safeBindaPage * BINDA_PAGE_SIZE,
        );

  useEffect(() => {
    setBindaPage(1);
  }, [selectedProvinceId]);

  useEffect(() => {
    if (bindaPage > totalBindaPages) {
      setBindaPage(totalBindaPages);
    }
  }, [bindaPage, totalBindaPages]);

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
          Kelola master Binda per provinsi dan Direktorat wilayah multi-provinsi dalam satu kanvas admin. Peta di
          atas memberi konteks coverage, sementara tabel bawah menjaga registrasi unit tetap rapi.
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
        <Card className="border border-border/70 xl:col-span-6">
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

            <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top,#dcecff,transparent_42%),linear-gradient(180deg,#eff6ff,#dbeafe_55%,#f8fafc)]">
              <div className="absolute left-4 top-4 z-10 max-w-sm rounded-xl border border-white/80 bg-white/88 p-4 text-slate-900 shadow-xl backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.26em] text-sky-700/80">Status Provinsi</div>
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
              <Badge variant="outline">
                {selectedProvince ? `Filter: ${selectedProvince.province.name}` : "Semua provinsi"}
              </Badge>
              <Badge variant="outline">
                {overview.provinces.filter((item) => item.binda).length} provinsi sudah punya Binda
              </Badge>
              <Badge variant="outline">
                {hasProvinceBoundaries
                  ? "Mode boundary aktif"
                  : `${fallbackMarkerProvinces.length} marker centroid aktif`}
              </Badge>
              <Badge variant="outline">{isRefreshing ? "Memuat ulang..." : "Data sinkron"}</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={refreshOverview} disabled={isRefreshing}>
                Muat ulang data
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:col-span-6 xl:grid-cols-2">
        <Card className="border border-border/70 h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Daftar Binda per Provinsi
            </CardTitle>
            <CardDescription>
              Satu provinsi hanya boleh memiliki satu Binda aktif. Gunakan peta untuk fokus ke provinsi tertentu.
            </CardDescription>
            <CardAction>
              {deputyOptions.length ? (
                <Button asChild type="button" size="sm">
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
                <Button type="button" size="sm" disabled>
                  Tambah Binda
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provinsi</TableHead>
                  <TableHead>Binda</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProvinceRows.length ? (
                  paginatedProvinceRows.map((summary) => (
                    <TableRow key={summary.province.id}>
                      <TableCell className="font-medium">
                        <div>{summary.province.name}</div>
                        <div className="text-muted-foreground text-xs">{summary.province.code}</div>
                      </TableCell>
                      <TableCell>
                        {summary.binda ? (
                          <div>
                            <div className="font-medium">{summary.binda.name}</div>
                            <div className="text-muted-foreground text-xs">{summary.binda.code}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Belum ada Binda</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                      Belum ada provinsi yang bisa ditampilkan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            {!selectedProvince ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                <div className="text-muted-foreground text-sm">
                  Menampilkan {(safeBindaPage - 1) * BINDA_PAGE_SIZE + 1}-{Math.min(
                    safeBindaPage * BINDA_PAGE_SIZE,
                    visibleProvinceRows.length,
                  )} dari {visibleProvinceRows.length} provinsi
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safeBindaPage <= 1}
                    onClick={() => setBindaPage((current) => Math.max(1, current - 1))}
                  >
                    Sebelumnya
                  </Button>
                  <Badge variant="outline">
                    Halaman {safeBindaPage}/{totalBindaPages}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safeBindaPage >= totalBindaPages}
                    onClick={() => setBindaPage((current) => Math.min(totalBindaPages, current + 1))}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border border-border/70 h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" />
              Direktorat Wilayah
            </CardTitle>
            <CardDescription>
              Satu Direktorat dapat menjangkau beberapa provinsi. Tandai provinsi utama untuk menjadi anchor coverage.
            </CardDescription>
            <CardAction>
              {deputyOptions.length ? (
                <Button asChild type="button" size="sm">
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
                <Button type="button" size="sm" disabled>
                  Tambah Direktorat
                </Button>
              )}
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Direktorat</TableHead>
                  <TableHead>Cakupan</TableHead>
                  <TableHead>Provinsi Utama</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleDirectorates.length ? (
                  visibleDirectorates.map((directorate) => {
                    const primaryProvince =
                      directorate.coverageAreas.find((coverage) => coverage.isPrimary) ??
                      directorate.coverageAreas[0] ??
                      null;

                    return (
                      <TableRow key={directorate.unitId}>
                        <TableCell className="font-medium">
                          <div>{directorate.name}</div>
                          <div className="text-muted-foreground text-xs">
                            {directorate.profileCode ?? directorate.code}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {directorate.coverageAreas.slice(0, 3).map((coverage) => (
                              <Badge key={coverage.areaId} variant={coverage.isPrimary ? "default" : "outline"}>
                                {coverage.name}
                              </Badge>
                            ))}
                            {directorate.coverageAreas.length > 3 ? (
                              <Badge variant="outline">+{directorate.coverageAreas.length - 3}</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{primaryProvince?.name ?? "-"}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                      {selectedProvince
                        ? `Belum ada Direktorat yang mencakup ${selectedProvince.province.name}.`
                        : "Belum ada Direktorat wilayah yang terdaftar."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card size="sm" className="border border-border/70">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/10 p-2 text-sky-600">
              <Landmark className="size-4" />
            </div>
            <div>
              <div className="font-medium text-sm">{overview.totals.bindaCount} Binda</div>
              <div className="text-muted-foreground text-xs">Terdaftar lintas provinsi</div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-border/70">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/10 p-2 text-amber-600">
              <Building2 className="size-4" />
            </div>
            <div>
              <div className="font-medium text-sm">{overview.totals.directorateCount} Direktorat</div>
              <div className="text-muted-foreground text-xs">Dengan coverage multi provinsi</div>
            </div>
          </CardContent>
        </Card>

        <Card size="sm" className="border border-border/70">
          <CardContent className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600">
              <MapPinned className="size-4" />
            </div>
            <div>
              <div className="font-medium text-sm">{overview.totals.coveredProvinceCount} Provinsi ter-cover</div>
              <div className="text-muted-foreground text-xs">Binda atau Direktorat sudah terhubung</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
