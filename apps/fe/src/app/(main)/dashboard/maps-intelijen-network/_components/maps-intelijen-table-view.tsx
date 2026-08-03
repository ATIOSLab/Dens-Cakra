"use client";

import { Clock, Eye, Inbox, Mail, MailOpen, MapPin } from "lucide-react";
import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { cn } from "@/lib/utils";

import {
  formatDateTime,
  getUrgencyCardStyle,
  type MapIntelItem,
  verificationStatusBadgeVariant,
  verificationStatusLabel,
} from "./maps-intelijen-types";

interface MapsIntelijenTableViewProps {
  activeTab: "ALL" | "LAPORAN" | "BAKET";
  setActiveTab: (tab: "ALL" | "LAPORAN" | "BAKET") => void;
  viewMode: "table" | "card";
  setViewMode: (mode: "table" | "card") => void;
  filteredItems: MapIntelItem[];
  paginatedItems: MapIntelItem[];
  metrics: { total: number; totalLaporan: number; totalBaket: number };
  page: number;
  setPage: (page: number) => void;
  limit: number;
  setLimit: (limit: number) => void;
  onFocusOnMap: (item: MapIntelItem) => void;
  onOpenDetail: (item: MapIntelItem) => void;
  onResetFilters: () => void;
}

export function MapsIntelijenTableView({
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  filteredItems,
  paginatedItems,
  metrics,
  page,
  setPage,
  limit,
  setLimit,
  onFocusOnMap,
  onOpenDetail,
  onResetFilters,
}: MapsIntelijenTableViewProps) {
  return (
    <section className="space-y-4">
      {/* Tab Selection & View Mode Header */}
      <div className="flex flex-col gap-4 border-slate-200 border-b pb-2 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab("ALL");
              setPage(1);
            }}
            className={cn(
              "rounded-t-lg border-b-2 px-3 py-1.5 font-bold text-xs transition-colors",
              activeTab === "ALL"
                ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Semua Items ({metrics.total})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("LAPORAN");
              setPage(1);
            }}
            className={cn(
              "rounded-t-lg border-b-2 px-3 py-1.5 font-bold text-xs transition-colors",
              activeTab === "LAPORAN"
                ? "border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-200"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Laporan Jaring ({metrics.totalLaporan})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("BAKET");
              setPage(1);
            }}
            className={cn(
              "rounded-t-lg border-b-2 px-3 py-1.5 font-bold text-xs transition-colors",
              activeTab === "BAKET"
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Baket ({metrics.totalBaket})
          </button>
        </div>

        {/* View Mode Toggle */}
        <ViewModeToggle value={viewMode} onValueChange={setViewMode} />
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <Card className="border-dashed p-8 text-center">
          <CardContent className="space-y-3">
            <Inbox className="mx-auto size-10 text-muted-foreground opacity-40" />
            <h3 className="font-bold text-base">Tidak Ada Data Ditemukan</h3>
            <p className="mx-auto max-w-md text-muted-foreground text-xs">
              Tidak ada Laporan Jaring atau Baket yang cocok dengan kriteria filter Anda saat ini.
            </p>
            <Button size="sm" variant="outline" onClick={onResetFilters}>
              Reset Filter Pencarian
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* CARD GRID VIEW */}
      {filteredItems.length > 0 && viewMode === "card" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((item) => {
              const urgencyStyle = getUrgencyCardStyle(item.urgency);
              const refNum = item.report.referenceNumber || item.jaringCode;

              return (
                <Card
                  key={item.id}
                  className={cn(
                    "flex flex-col justify-between transition-all duration-200 hover:shadow-md",
                    item.isBaket ? urgencyStyle.border : "border-slate-300 dark:border-slate-700",
                  )}
                >
                  <CardHeader className="space-y-2 p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase",
                            item.isBaket
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                          )}
                        >
                          {item.isBaket ? "Baket" : "Laporan"}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={cn("font-extrabold text-[10px] tracking-wider", urgencyStyle.badge)}
                        >
                          {urgencyStyle.label}
                        </Badge>

                        <span className="rounded bg-slate-100 px-2 py-0.5 font-medium font-mono text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {refNum}
                        </span>
                      </div>

                      {!item.isBaket && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 px-2 py-0.5 font-medium text-[10px]",
                            verificationStatusBadgeVariant(item.verificationStatus),
                          )}
                        >
                          {verificationStatusLabel(item.verificationStatus)}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="line-clamp-2 font-bold font-heading text-foreground text-sm leading-snug">
                        {item.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{item.content}</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 pt-2">
                    <div className="space-y-2 border-slate-100 border-t pt-2 text-muted-foreground text-xs dark:border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Jaring: {item.jaringName}</span>
                        <span className="flex items-center gap-1">
                          {item.hasBeenRead ? (
                            <MailOpen className="size-3 text-slate-400" />
                          ) : (
                            <Mail className="size-3 text-amber-500" />
                          )}
                          {item.hasBeenRead ? "Dibaca" : "Belum Dibaca"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex max-w-[200px] items-center gap-1 truncate">
                          <MapPin className="size-3 shrink-0 text-sky-500" />
                          <span className="truncate">{item.locationName}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 font-mono">
                          <Clock className="size-3 text-amber-500" />
                          {formatDateTime(item.submittedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onFocusOnMap(item)}
                        className="h-8 flex-1 gap-1 border-sky-500/40 font-semibold text-sky-600 text-xs hover:bg-sky-500/10 dark:text-sky-400"
                      >
                        <MapPin className="size-3.5" /> Fokus Peta
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => onOpenDetail(item)}
                        className="h-8 flex-1 gap-1 bg-primary font-bold text-primary-foreground text-xs shadow-xs"
                      >
                        <Eye className="size-3.5" /> Detail
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <TablePagination
            page={page}
            total={filteredItems.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      ) : null}

      {/* TABLE VIEW */}
      {filteredItems.length > 0 && viewMode === "table" ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-xs dark:border-white/10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Ref / Kode</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Tipe</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Judul & Isi Laporan</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Pelapor / Jaring</TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Urgensi</TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                    Status Verifikasi
                  </TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Wilayah</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-wider">Waktu Masuk</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => {
                  const urgencyStyle = getUrgencyCardStyle(item.urgency);
                  const refNum = item.report.referenceNumber || item.jaringCode;

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                      <TableCell className="font-mono font-semibold text-xs">
                        <div>{refNum}</div>
                        <div className="font-normal text-[10px] text-muted-foreground">ID: {item.id.slice(0, 8)}</div>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] uppercase",
                            item.isBaket
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                              : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                          )}
                        >
                          {item.isBaket ? "Baket" : "Laporan"}
                        </Badge>
                      </TableCell>

                      <TableCell className="max-w-[280px]">
                        <p className="line-clamp-1 font-semibold text-foreground text-xs">{item.title}</p>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">{item.content}</p>
                      </TableCell>

                      <TableCell className="text-xs">
                        <div className="font-semibold text-foreground">{item.jaringName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{item.jaringCode}</div>
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn("font-extrabold text-[10px] tracking-wider", urgencyStyle.badge)}
                        >
                          {urgencyStyle.label}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-center">
                        {item.isBaket ? (
                          <span className="font-mono text-muted-foreground text-xs">-</span>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              "px-2 py-0.5 font-medium text-[10px]",
                              verificationStatusBadgeVariant(item.verificationStatus),
                            )}
                          >
                            {verificationStatusLabel(item.verificationStatus)}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="max-w-[180px] text-xs">
                        <span className="line-clamp-1">{item.locationName}</span>
                      </TableCell>

                      <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-xs">
                        {formatDateTime(item.submittedAt)}
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onFocusOnMap(item)}
                            title="Fokus Peta"
                            className="size-8 p-0 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
                          >
                            <MapPin className="size-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onOpenDetail(item)}
                            title="Lihat Detail Ringkas"
                            className="size-8 font-bold p-0"
                          >
                            <Eye className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={page}
            total={filteredItems.length}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
