"use client";

import { ChevronDown, Layers3, Tags } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  COMPLETENESS_PRESENTATION,
  DATA_TYPE_PRESENTATION,
  HEATMAP_WEIGHT_PRESENTATION,
  MapSemanticBadge,
  type MapSemanticPresentation,
  URGENCY_PRESENTATION,
  VALIDITY_PRESENTATION,
} from "./maps-intelijen-presentation";
import type { HeatmapWeight, MarkerColorMode, VisualizationMode } from "./maps-intelijen-types";

const LEGENDS: Record<MarkerColorMode, MapSemanticPresentation[]> = {
  completeness: [COMPLETENESS_PRESENTATION.COMPLETE, COMPLETENESS_PRESENTATION.INCOMPLETE],
  validity: [VALIDITY_PRESENTATION.VALID, VALIDITY_PRESENTATION.NEEDS_REVIEW, VALIDITY_PRESENTATION.WAITING],
  urgency: [
    URGENCY_PRESENTATION.URGENT,
    URGENCY_PRESENTATION.HIGH,
    URGENCY_PRESENTATION.NORMAL,
    URGENCY_PRESENTATION.LOW,
  ],
  category: [
    {
      ...DATA_TYPE_PRESENTATION.report,
      label: "Kategori laporan",
      icon: Tags,
    },
    {
      ...DATA_TYPE_PRESENTATION.baket,
      label: "Kategori lain",
      icon: Tags,
    },
  ],
};

export function MapsIntelijenLegend({
  mode,
  colorMode,
  heatmapWeight,
  open,
  onToggle,
}: {
  mode: VisualizationMode;
  colorMode: MarkerColorMode;
  heatmapWeight: HeatmapWeight;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="absolute right-3 bottom-3 z-20 max-w-[min(19rem,calc(100%-1.5rem))] rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        aria-expanded={open}
        className="min-h-10 w-full justify-between gap-2"
      >
        <span className="inline-flex items-center gap-2">
          <Layers3 className="size-4" /> Legenda
        </span>
        <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
      </Button>
      {open ? (
        <div className="space-y-2 px-2 pb-2 text-xs">
          {mode === "heatmap" ? (
            <>
              <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 via-green-500 via-amber-400 to-orange-500" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Rendah</span>
                <span>Sedang</span>
                <span>Tinggi</span>
                <span>Sangat Tinggi</span>
              </div>
              <MapSemanticBadge presentation={HEATMAP_WEIGHT_PRESENTATION[heatmapWeight]} />
              <p className="leading-relaxed text-muted-foreground">
                Intensitas warna menunjukkan {HEATMAP_WEIGHT_PRESENTATION[heatmapWeight].label.toLowerCase()} pada area.
              </p>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {LEGENDS[colorMode].map((presentation) => {
                const Icon = presentation.icon;
                return (
                  <span key={presentation.label} className="inline-flex min-h-7 items-center gap-2">
                    <span
                      className="grid size-5 shrink-0 place-items-center rounded-md border"
                      style={{ borderColor: presentation.mapColor, color: presentation.mapColor }}
                    >
                      <Icon className="size-3" aria-hidden />
                    </span>
                    {presentation.label}
                  </span>
                );
              })}
              {(
                [DATA_TYPE_PRESENTATION.baket, DATA_TYPE_PRESENTATION.report, DATA_TYPE_PRESENTATION.agent] as const
              ).map((presentation) => {
                const Icon = presentation.icon;
                return (
                  <span key={presentation.label} className="inline-flex min-h-7 items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${presentation.iconClass}`} aria-hidden />
                    {presentation.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
