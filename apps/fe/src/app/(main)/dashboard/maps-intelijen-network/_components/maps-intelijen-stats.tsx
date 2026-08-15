"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { SUMMARY_CARD_PRESENTATION } from "./maps-intelijen-presentation";
import type { MapNetworkResponse, SummaryCardFilter } from "./maps-intelijen-types";

interface MapsIntelijenStatsProps {
  meta: MapNetworkResponse["meta"];
  active: SummaryCardFilter;
  onChange: (value: SummaryCardFilter) => void;
  loading: boolean;
  periodLabel: string;
}

export function MapsIntelijenStats({ meta, active, onChange, loading, periodLabel }: MapsIntelijenStatsProps) {
  const reports = meta.summary.reports;
  const total = reports.total ?? 0;
  const cards = [
    {
      key: "ALL" as const,
      label: "Total Jaring",
      value: meta.counts.jaring ?? 0,
      percentage: null,
      definition: "Jumlah Jaring unik yang memiliki titik berkoordinat sesuai filter aktif.",
      presentation: SUMMARY_CARD_PRESENTATION.ALL,
    },
    {
      key: "REPORT" as const,
      label: "Laporan Jaring",
      value: total,
      percentage: null,
      definition: "Jumlah Laporan Jaring yang belum dikonversi menjadi Bahan Keterangan (Baket).",
      presentation: SUMMARY_CARD_PRESENTATION.REPORT,
    },
    {
      key: "BAKET" as const,
      label: "Bahan Keterangan (Baket)",
      value: meta.summary.bakets.total,
      percentage: null,
      definition: "Laporan Jaring yang telah dikonversi menjadi Bahan Keterangan (Baket).",
      presentation: SUMMARY_CARD_PRESENTATION.BAKET,
    },
  ];

  return (
    <section aria-label="Ringkasan data peta" className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map(({ key, label, value, percentage, definition, presentation }) => {
          const selected = active === key;
          const Icon = presentation.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(selected ? "ALL" : key)}
              aria-pressed={selected}
              className="h-full text-left"
            >
              <Card
                className={cn(
                  "h-full border transition hover:-translate-y-0.5 hover:shadow-md",
                  presentation.surfaceClass,
                  selected && "ring-2 ring-primary/20",
                )}
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-lg bg-background/70",
                        presentation.iconClass,
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <CircleHelp className="size-3.5 text-muted-foreground" aria-label={definition} />
                  </div>
                  <div className="font-extrabold text-2xl tabular-nums">
                    {loading ? "—" : value.toLocaleString("id-ID")}
                  </div>
                  <div>
                    <p className="font-semibold text-xs sm:text-sm">{label}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {percentage === null ? periodLabel : `${percentage}% · ${periodLabel}`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
      {active !== "ALL" ? (
        <Button variant="ghost" size="sm" onClick={() => onChange("ALL")}>
          Tampilkan Semua
        </Button>
      ) : null}
    </section>
  );
}
