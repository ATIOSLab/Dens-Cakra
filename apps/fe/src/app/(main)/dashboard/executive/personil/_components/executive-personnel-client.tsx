"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BarChart3, List, Map as MapIcon, Search } from "lucide-react";

import { Map, MapControls, MapMarker, MapMarkerPopup } from "@/components/ui/map";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type {
  PersonnelListItem,
  PersonnelListProps,
  PersonnelMapFeature,
  PersonnelListQueryState,
} from "./executive-personnel-types";

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function primaryArea(item: PersonnelListItem) {
  const areas = item.assignment?.areas ?? [];
  return areas.find((area) => area.isPrimary) ?? areas[0] ?? null;
}

function statusClass(status: string) {
  if (status === "ACTIVE") return "border-cyan-500/70 bg-cyan-500/12 text-cyan-300";
  if (status === "SUSPENDED") return "border-red-500/70 bg-red-500/12 text-red-300";
  if (status === "ARCHIVED") return "border-slate-500/70 bg-slate-500/12 text-slate-300";
  return "border-amber-500/70 bg-amber-500/12 text-amber-300";
}

function pulseByStatus(status: string): "urgent" | "high" | "normal" | "slow" {
  if (status === "LIVE") return "high";
  if (status === "RECENT") return "normal";
  if (status === "STALE") return "slow";
  return "slow";
}

function paginationHref(queryState: PersonnelListQueryState, page: number) {
  return buildPersonnelHref(queryState, { page });
}

function buildPersonnelHref(
  queryState: PersonnelListQueryState,
  overrides: Partial<PersonnelListQueryState>,
) {
  const params = new URLSearchParams();
  const nextState = { ...queryState, ...overrides };
  if (nextState.q) params.set("q", nextState.q);
  if (nextState.provinceId) params.set("provinceId", nextState.provinceId);
  if (nextState.regencyId) params.set("regencyId", nextState.regencyId);
  if (nextState.districtId) params.set("districtId", nextState.districtId);
  params.set("page", String(nextState.page));
  params.set("limit", String(nextState.limit));
  return `/dashboard/executive/personil?${params.toString()}`;
}

function paginationPages(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

function LocationMarker({ feature }: { feature: PersonnelMapFeature }) {
  return (
    <MapMarker
      longitude={feature.geometry.coordinates[0]}
      latitude={feature.geometry.coordinates[1]}
      pulse={pulseByStatus(feature.properties.status)}
    >
      <Link
        href={`/dashboard/executive/personil/${feature.properties.userProfileId}`}
        className="group block"
        aria-label={`Buka detail ${feature.properties.name ?? feature.properties.email}`}
      >
        <span
          className="grid size-8 place-items-center rounded-full border-2 border-slate-950 text-[0.62rem] font-bold text-slate-950 shadow-lg shadow-slate-950/30 transition-transform group-hover:scale-110"
          style={{ backgroundColor: feature.properties.markerColor }}
        >
          {feature.properties.markerCode}
        </span>
      </Link>
      <MapMarkerPopup className="rounded border border-[var(--dc-border-subtle)] bg-slate-950/95 px-3 py-2 text-xs text-slate-100 shadow-xl">
        <div className="space-y-1">
          <p className="font-semibold">{feature.properties.name ?? feature.properties.email}</p>
          <p className="text-slate-400">{feature.properties.positionTitle}</p>
          <p className="text-slate-400">{feature.properties.unitName}</p>
          <p className="text-cyan-300">{feature.properties.area?.name ?? "Wilayah belum ada"}</p>
        </div>
      </MapMarkerPopup>
    </MapMarker>
  );
}

function PersonnelTable({ items }: { items: PersonnelListItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Personel</TableHead>
          <TableHead>Jabatan</TableHead>
          <TableHead>Wilayah</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Lokasi Terakhir</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const area = primaryArea(item);
          return (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/dashboard/executive/personil/${item.id}`}
                  className="block min-w-56"
                >
                  <span className="block font-semibold text-foreground">
                    {item.fullName ?? item.username ?? item.email}
                  </span>
                  <span className="block text-xs text-muted-foreground">{item.email}</span>
                </Link>
              </TableCell>
              <TableCell>
                <span className="block font-medium">
                  {item.assignment?.title ?? "-"}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.assignment?.seatCode ?? item.authRole}
                </span>
              </TableCell>
              <TableCell>
                <span className="block max-w-56 truncate">{area?.name ?? "-"}</span>
                <span className="block text-xs text-muted-foreground">{area?.level ?? ""}</span>
              </TableCell>
              <TableCell>
                <span className={cn("border px-2 py-1 text-xs font-semibold", statusClass(item.status))}>
                  {item.status}
                </span>
              </TableCell>
              <TableCell>{formatDate(item.lastLocation?.capturedAt)}</TableCell>
            </TableRow>
          );
        })}
        {!items.length ? (
          <TableRow>
            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
              Tidak ada data personel.
            </TableCell>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}

export function ExecutivePersonnelClient({
  items,
  map,
  pagination,
  queryState,
  areaFilters,
}: PersonnelListProps) {
  const router = useRouter();
  const totalPersonnel = pagination?.total ?? items.length;
  const onlineCount =
    (map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0);
  const noSignalCount = map.meta.counts.byStatus.NO_SIGNAL ?? 0;
  const currentPage = pagination?.page ?? queryState.page;
  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const pageNumbers = paginationPages(currentPage, totalPages);

  const applyFilter = (overrides: Partial<PersonnelListQueryState>) => {
    router.push(
      buildPersonnelHref(queryState, {
        ...overrides,
        page: 1,
      }),
    );
  };

  return (
    <main className="space-y-6 p-6">
      <header className="space-y-2">
        <div className="inline-flex border border-[var(--dc-border-subtle)] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Personil
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">Daftar Personel</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Konsolidasi personel nasional dari user aktif, jabatan, wilayah penugasan,
              lokasi petugas organik, laporan, dan aktivitas operasional.
            </p>
          </div>
          <form
            className="grid w-full gap-2 md:w-auto md:min-w-[660px] md:grid-cols-[1.4fr_140px_170px_170px_auto]"
            action="/dashboard/executive/personil"
          >
            <input type="hidden" name="limit" value={queryState.limit} />
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                name="q"
                defaultValue={queryState.q}
                placeholder="Cari personel, jabatan, unit"
                className="h-10 w-full border border-[var(--dc-border-subtle)] bg-background pl-9 pr-3 text-sm outline-none focus:border-cyan-500"
              />
            </div>
            <select
              name="provinceId"
              defaultValue={queryState.provinceId}
              onChange={(event) =>
                applyFilter({
                  provinceId: event.target.value,
                  regencyId: "",
                  districtId: "",
                })
              }
              className="h-10 border border-[var(--dc-border-subtle)] bg-background px-3 text-sm outline-none focus:border-cyan-500"
            >
              <option value="">Semua provinsi</option>
              {areaFilters.provinces.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <select
              name="regencyId"
              defaultValue={queryState.regencyId}
              disabled={!queryState.provinceId}
              onChange={(event) =>
                applyFilter({
                  regencyId: event.target.value,
                  districtId: "",
                })
              }
              className="h-10 border border-[var(--dc-border-subtle)] bg-background px-3 text-sm outline-none focus:border-cyan-500 disabled:opacity-45"
            >
              <option value="">Semua kab/kota</option>
              {areaFilters.regencies.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <select
              name="districtId"
              defaultValue={queryState.districtId}
              disabled={!queryState.regencyId}
              onChange={(event) => applyFilter({ districtId: event.target.value })}
              className="h-10 border border-[var(--dc-border-subtle)] bg-background px-3 text-sm outline-none focus:border-cyan-500 disabled:opacity-45"
            >
              <option value="">Semua kecamatan</option>
              {areaFilters.districts.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            <button className="h-10 border border-cyan-500 bg-cyan-500 px-4 text-sm font-semibold text-slate-950">
              Terapkan
            </button>
          </form>
        </div>
      </header>

      <Tabs defaultValue="daftar" className="space-y-4">
        <TabsList className="h-11 rounded-none border border-[var(--dc-border-subtle)] bg-muted/20 p-1">
          <TabsTrigger value="daftar" className="rounded-none px-4">
            <List className="size-4" />
            Daftar
          </TabsTrigger>
          <TabsTrigger value="peta" className="rounded-none px-4">
            <MapIcon className="size-4" />
            Peta Nasional
          </TabsTrigger>
          <TabsTrigger value="eksekutif" className="rounded-none px-4">
            <BarChart3 className="size-4" />
            Eksekutif
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar" className="space-y-3">
          <section className="grid gap-3 md:grid-cols-3">
            <Metric label="Total Personel" value={totalPersonnel} />
            <Metric label="Aktif / Online" value={onlineCount} />
            <Metric label="No Signal" value={noSignalCount} />
          </section>
          <PersonnelTable items={items} />
          <nav className="flex flex-col gap-3 border border-[var(--dc-border-subtle)] bg-card/40 p-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">Row</span>
              <select
                value={String(queryState.limit)}
                onChange={(event) =>
                  applyFilter({ limit: Number.parseInt(event.target.value, 10) })
                }
                className="h-9 border border-[var(--dc-border-subtle)] bg-background px-3 text-sm outline-none focus:border-cyan-500"
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground">
                Menampilkan {items.length} dari {totalPersonnel}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <PageLink
                href={paginationHref(queryState, Math.max(currentPage - 1, 1))}
                disabled={currentPage <= 1}
              >
                Sebelumnya
              </PageLink>
              {pageNumbers.map((page, index) => {
                const previous = pageNumbers[index - 1];
                return (
                  <span key={page} className="flex items-center gap-1">
                    {previous && page - previous > 1 ? (
                      <span className="px-2 text-muted-foreground">...</span>
                    ) : null}
                    <PageLink
                      href={paginationHref(queryState, page)}
                      active={page === currentPage}
                    >
                      {page}
                    </PageLink>
                  </span>
                );
              })}
              <PageLink
                href={paginationHref(queryState, Math.min(currentPage + 1, totalPages))}
                disabled={currentPage >= totalPages}
              >
                Berikutnya
              </PageLink>
            </div>
          </nav>
        </TabsContent>

        <TabsContent value="peta" className="space-y-4">
          <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="h-[640px] overflow-hidden border border-[var(--dc-border-subtle)]">
              <Map center={[118, -2.5]} zoom={4.2} minZoom={3} maxZoom={15}>
                <MapControls showZoom showCompass position="top-right" />
                {map.features.map((feature) => (
                  <LocationMarker key={feature.id} feature={feature} />
                ))}
              </Map>
            </div>
            <aside className="space-y-4">
              <div className="border border-[var(--dc-border-subtle)] bg-card/50 p-4">
                <h2 className="font-semibold">Legend marker</h2>
                <div className="mt-4 space-y-3">
                  {map.meta.legend.map((item) => (
                    <div key={item.code} className="flex gap-3">
                      <span
                        className="grid size-8 place-items-center rounded-full border-2 border-slate-950 text-[0.62rem] font-bold text-slate-950"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.code}
                      </span>
                      <div>
                        <p className="text-sm font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border border-[var(--dc-border-subtle)] bg-card/50 p-4">
                <h2 className="font-semibold">Status lokasi</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  {Object.entries(map.meta.counts.byStatus).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </aside>
          </section>
        </TabsContent>

        <TabsContent value="eksekutif">
          <section className="border border-[var(--dc-border-subtle)] bg-card/50 p-6">
            <h2 className="text-xl font-semibold">Ringkasan Eksekutif</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Metric label="Total field officer" value={map.meta.counts.totalFieldOfficers} />
              <Metric label="Lokasi live/recent" value={(map.meta.counts.byStatus.LIVE ?? 0) + (map.meta.counts.byStatus.RECENT ?? 0)} />
              <Metric label="Lokasi stale/no signal" value={(map.meta.counts.byStatus.STALE ?? 0) + (map.meta.counts.byStatus.NO_SIGNAL ?? 0)} />
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function PageLink({
  href,
  active,
  disabled,
  children,
}: {
  href: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="min-w-9 border border-[var(--dc-border-subtle)] px-3 py-2 text-center font-semibold opacity-45">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "min-w-9 border px-3 py-2 text-center font-semibold",
        active
          ? "border-cyan-500 bg-cyan-500 text-slate-950"
          : "border-[var(--dc-border-subtle)] text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--dc-border-subtle)] bg-card/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
