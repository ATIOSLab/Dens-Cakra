"use client";

import { type ReactNode } from "react";
import { Search, RefreshCw, Download, Upload } from "lucide-react";
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
  className?: string;
}

export function TableToolbar({
  search,
  filters,
  actions,
  onRefresh,
  onExport,
  onImport,
  className,
}: TableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between py-4 px-6 border-b border-border bg-card/30",
        className
      )}
    >
      {/* Left controls: Search & Filters */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {search && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={search.placeholder ?? "Cari..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="pl-9 h-9 w-full bg-background/50 border-border focus:border-primary/50 focus:ring-0 text-sm"
            />
          </div>
        )}
        {filters && <div className="flex items-center gap-2">{filters}</div>}
      </div>

      {/* Right controls: Refresh, Import, Export & Custom Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            title="Refresh Data"
            className="size-9 border-border bg-background/50 hover:bg-muted"
          >
            <RefreshCw className="size-4 text-muted-foreground" />
          </Button>
        )}
        {onImport && (
          <Button
            variant="outline"
            onClick={onImport}
            className="h-9 px-3 text-xs font-mono border-border bg-background/50 hover:bg-muted flex items-center gap-1.5"
          >
            <Upload className="size-3.5 text-muted-foreground" />
            <span>IMPORT</span>
          </Button>
        )}
        {onExport && (
          <Button
            variant="outline"
            onClick={onExport}
            className="h-9 px-3 text-xs font-mono border-border bg-background/50 hover:bg-muted flex items-center gap-1.5"
          >
            <Download className="size-3.5 text-muted-foreground" />
            <span>EXPORT</span>
          </Button>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
