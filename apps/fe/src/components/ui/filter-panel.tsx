"use client";

import type { ReactNode } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterPanelProps = {
  title?: string;
  description?: string;
  activeFilterCount?: number;
  resultSummary?: ReactNode;
  onReset?: () => void;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function FilterPanel({
  title = "Filter data",
  description = "Persempit daftar berdasarkan data yang tersedia.",
  activeFilterCount = 0,
  resultSummary,
  onReset,
  children,
  className,
  contentClassName,
}: FilterPanelProps) {
  return (
    <section
      aria-label={title}
      className={cn("min-w-0 overflow-hidden rounded-[var(--dc-radius-lg)] border border-border bg-card shadow-[var(--dc-shadow-card)]", className)}
    >
      <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-[var(--dc-card-padding)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <SlidersHorizontal aria-hidden="true" className="size-4" />
            </span>
            <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
            {activeFilterCount > 0 ? (
              <Badge variant="secondary" className="h-6 rounded-full px-2 text-[11px] font-medium">
                {activeFilterCount} aktif
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:ml-10">{description}</p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
          {resultSummary ? <div className="text-xs text-muted-foreground">{resultSummary}</div> : null}
          {onReset && activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="gap-2 border-dashed text-sm"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Reset Filter
            </Button>
          ) : null}
        </div>
      </div>

      <div
        className={cn(
          "grid items-end gap-[var(--dc-section-gap)] p-[var(--dc-card-padding)] [grid-template-columns:repeat(auto-fit,minmax(min(100%,14rem),1fr))]",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  );
}

type FilterFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
};

export function FilterField({ label, htmlFor, hint, children, className }: FilterFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium leading-none text-muted-foreground">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs leading-5 text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
