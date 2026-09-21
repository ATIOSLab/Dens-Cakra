"use client";

import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FilterChipItem = {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
};

export type ActiveFilterChipsProps = {
  chips: FilterChipItem[];
  onResetAll?: () => void;
  className?: string;
};

export function ActiveFilterChips({ chips, onResetAll, className }: ActiveFilterChipsProps) {
  if (!chips || chips.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Filter yang sedang aktif"
      className={cn(
        "flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-border/80 bg-muted/30 px-3 py-2 text-xs",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <SlidersHorizontal className="size-3 text-primary" />
          <span>Filter Aktif ({chips.length}):</span>
        </span>

        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 py-0.5 pr-1 pl-2 text-xs font-medium text-foreground transition-colors hover:border-primary/40 dark:border-primary/30 dark:bg-primary/15"
            >
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {chip.label}:
              </span>
              <span className="max-w-[180px] truncate text-primary font-medium" title={chip.value}>
                {chip.value}
              </span>
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Hapus filter ${chip.label}: ${chip.value}`}
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-primary/20 hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:outline-none"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {onResetAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetAll}
          className="h-6 shrink-0 gap-1 px-2 text-[11px] font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
        >
          <RotateCcw className="size-3" />
          <span>Hapus Semua</span>
        </Button>
      )}
    </div>
  );
}
