"use client";

import { Activity, CircleHelp, Radio, UserMinus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import type { MapNetworkResponse } from "./maps-intelijen-types";

export type KpiCardKey = "verified" | "active" | "inactive" | "reports" | "reporting";

interface MapsIntelijenStatsProps {
  meta: MapNetworkResponse["meta"];
  loading: boolean;
  onCardClick?: (key: KpiCardKey) => void;
}

export function MapsIntelijenStats({ meta, loading, onCardClick }: MapsIntelijenStatsProps) {
  const JaringIcon = DOMAIN_VISUALS.jaring.Icon;
  const JaringReportIcon = DOMAIN_VISUALS.jaringReport.Icon;
  const cards = [
    {
      key: "verified" as const,
      label: "Jaring Terverifikasi",
      value: meta.counts.jaring ?? 0,
      detail: "Jaring terverifikasi dalam cakupan akses.",
      icon: JaringIcon,
      iconClass: DOMAIN_VISUALS.jaring.iconClass,
      surfaceClass: "border-cyan-500/30 bg-cyan-500/5",
    },
    {
      key: "active" as const,
      label: "Keaktifan Jaring",
      value: meta.counts.activeJaring ?? 0,
      detail: "Jaring terverifikasi yang melapor dalam 90 hari terakhir.",
      icon: Activity,
      iconClass: "text-emerald-600 dark:text-emerald-400",
      surfaceClass: "border-emerald-500/30 bg-emerald-500/5",
    },
    {
      key: "inactive" as const,
      label: "Jaring Tidak Aktif",
      value: meta.counts.inactiveJaring ?? 0,
      detail: "Jaring terverifikasi yang tidak melapor dalam 90 hari terakhir.",
      icon: UserMinus,
      iconClass: "text-amber-600 dark:text-amber-400",
      surfaceClass: "border-amber-500/30 bg-amber-500/5",
    },
    {
      key: "reports" as const,
      label: "Total Laporan Jaring",
      value: meta.counts.totalReports ?? meta.summary.reports.total ?? 0,
      detail: "Laporan Jaring yang masuk sesuai periode terpilih.",
      icon: JaringReportIcon,
      iconClass: DOMAIN_VISUALS.jaringReport.iconClass,
      surfaceClass: "border-sky-500/30 bg-sky-500/5",
    },
    {
      key: "reporting" as const,
      label: "Jaring Melapor",
      value: meta.counts.reportingJaring ?? 0,
      detail: "Jaring yang melapor dalam periode terpilih (dihitung unik).",
      icon: Radio,
      iconClass: "text-violet-600 dark:text-violet-400",
      surfaceClass: "border-violet-500/30 bg-violet-500/5",
    },
  ];

  return (
    <section aria-label="Ringkasan kesehatan Jaring" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(({ key, label, value, detail, icon: Icon, iconClass, surfaceClass }) => (
          <Card
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => onCardClick?.(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick?.(key);
              }
            }}
            className={cn(
              "group h-full cursor-pointer border transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:ring-2 hover:ring-primary/30 active:scale-[0.99]",
              surfaceClass,
            )}
            title={`Klik untuk melihat tabel data ${label}`}
          >
            <CardContent className="flex h-full flex-col justify-between space-y-3 p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={cn(
                      "grid size-9 place-items-center rounded-lg bg-background/70 transition group-hover:scale-105",
                      iconClass,
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-[10px] text-muted-foreground opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                      Lihat data &rarr;
                    </span>
                    <CircleHelp className="size-3.5 shrink-0 text-muted-foreground" aria-label={detail} />
                  </div>
                </div>
                <div className="font-extrabold text-2xl tabular-nums">
                  {loading ? "—" : value.toLocaleString("id-ID")}
                </div>
                <div>
                  <p className="font-semibold text-xs sm:text-sm transition group-hover:text-primary">{label}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/50 pt-2 font-medium text-[11px] text-primary/80 opacity-75 transition group-hover:opacity-100">
                <span>Rincian Tabel Data</span>
                <span className="text-xs transition-transform group-hover:translate-x-0.5">&rarr;</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
