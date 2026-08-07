"use client";

import { type ReactNode } from "react";
import { Download, RefreshCw, RotateCcw, Search, Upload } from "lucide-react";
import { Input } from "./input";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface TableToolbarProps {
  search?: {
    placeholder?: string;
    value: string;
    onChange: (value: string) => void;
  };
  filters?: ReactNode;
  actions?: ReactNode;
  onRefresh?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onReset?: () => void;
  activeFilterCount?: number;
  resultSummary?: ReactNode;
  className?: string;
}

export function TableToolbar({
  search,
  filters,
  actions,
  onRefresh,
  onExport,
  onImport,
  onReset,
  activeFilterCount = 0,
  resultSummary,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[var(--dc-section-gap)] border-b border-border bg-card p-[var(--dc-card-padding)] md:flex-row md:items-end md:justify-between",
        className
      )}
    >
      {/* Left controls: Search & Filters */}
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
        {search && (
          <div className="w-full min-w-0 space-y-1.5 sm:max-w-sm">
            <label htmlFor="table-toolbar-search" className="block text-xs font-medium text-muted-foreground">
              Pencarian
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="table-toolbar-search"
                type="search"
                placeholder={search.placeholder ?? "Cari..."}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="w-full border-border bg-background pl-9 text-sm"
              />
            </div>
          </div>
        )}
        {filters && <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">{filters}</div>}
      </div>

      {/* Right controls: Refresh, Import, Export & Custom Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 md:justify-end">
        {resultSummary ? <span className="mr-1 text-xs text-muted-foreground">{resultSummary}</span> : null}
        {activeFilterCount > 0 && onReset ? (
          <Button type="button" variant="outline" onClick={onReset} className="gap-2 border-dashed text-sm">
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset Filter ({activeFilterCount})
          </Button>
        ) : null}
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Muat ulang data"
            aria-label="Muat ulang data"
            className="border-border bg-background hover:bg-muted"
          >
            <RefreshCw className="size-4 text-muted-foreground" />
          </Button>
        )}
        {onImport && (
          <Button
            variant="outline"
            onClick={onImport}
            className="flex items-center gap-1.5 border-border bg-background text-xs hover:bg-muted"
          >
            <Upload className="size-3.5 text-muted-foreground" />
            <span>IMPORT</span>
          </Button>
        )}
        {onExport && (
          <Button
            variant="outline"
            onClick={onExport}
            className="flex items-center gap-1.5 border-border bg-background text-xs hover:bg-muted"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>EXPORT</span>
          </Button>
        )}
        {actions && <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
