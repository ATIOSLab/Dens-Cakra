"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { MapNetworkFilters, PeriodPreset } from "./maps-intelijen-types";

const PERIOD_PRESETS: Array<{ key: PeriodPreset; label: string }> = [
  { key: "TODAY", label: "Hari ini" },
  { key: "LAST_7_DAYS", label: "7 hari" },
  { key: "LAST_14_DAYS", label: "14 hari" },
  { key: "LAST_30_DAYS", label: "30 hari" },
  { key: "CUSTOM", label: "Kustom" },
];

export function MapsIntelijenPeriodFilter({
  filters,
  onChange,
}: {
  filters: MapNetworkFilters;
  onChange: (patch: Partial<MapNetworkFilters>) => void;
}) {
  return (
    <section
      aria-label="Filter tanggal"
      className="flex flex-wrap items-center gap-3 rounded-md border bg-card px-3 py-2"
    >
      <fieldset className="flex flex-wrap gap-1">
        <legend className="sr-only">Preset rentang tanggal</legend>
        {PERIOD_PRESETS.map((preset) => {
          const selected = filters.period === preset.key;
          return (
            <Button
              key={preset.key}
              type="button"
              variant={selected ? "default" : "ghost"}
              size="sm"
              aria-pressed={selected}
              onClick={() => onChange({ period: preset.key })}
              className={cn(selected && "font-semibold")}
            >
              {preset.label}
            </Button>
          );
        })}
      </fieldset>
      {filters.period === "CUSTOM" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Mulai
            <Input
              aria-label="Tanggal mulai"
              type="date"
              value={filters.startDate}
              onChange={(event) => onChange({ startDate: event.target.value })}
              className="h-8 w-auto"
            />
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            Selesai
            <Input
              aria-label="Tanggal selesai"
              type="date"
              value={filters.endDate}
              onChange={(event) => onChange({ endDate: event.target.value })}
              className="h-8 w-auto"
            />
          </span>
        </div>
      ) : null}
    </section>
  );
}
