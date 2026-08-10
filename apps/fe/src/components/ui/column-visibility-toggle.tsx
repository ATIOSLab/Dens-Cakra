"use client";

import * as React from "react";
import { Check, Columns3, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ColumnOption {
  id: string;
  label: string;
  alwaysVisible?: boolean;
  defaultVisible?: boolean;
}

interface ColumnVisibilityToggleProps {
  columns: ColumnOption[];
  visibleColumns: Record<string, boolean>;
  onChange: (updated: Record<string, boolean>) => void;
  className?: string;
}

export function ColumnVisibilityToggle({
  columns,
  visibleColumns,
  onChange,
  className,
}: ColumnVisibilityToggleProps) {
  const [open, setOpen] = React.useState(false);
  const isColumnVisible = React.useCallback(
    (column: ColumnOption) => visibleColumns[column.id] ?? column.defaultVisible !== false,
    [visibleColumns],
  );

  const toggleableColumns = React.useMemo(
    () => columns.filter((col) => !col.alwaysVisible),
    [columns]
  );

  const visibleCount = React.useMemo(() => {
    return columns.filter((col) => isColumnVisible(col)).length;
  }, [columns, isColumnVisible]);

  const allSelected = React.useMemo(() => {
    return toggleableColumns.every((col) => isColumnVisible(col));
  }, [toggleableColumns, isColumnVisible]);

  const handleToggle = (columnId: string) => {
    const column = columns.find((item) => item.id === columnId);
    if (!column) return;

    const nextState = {
      ...visibleColumns,
      [columnId]: !isColumnVisible(column),
    };
    onChange(nextState);
  };

  const handleSelectAll = () => {
    const nextState: Record<string, boolean> = {};
    for (const col of columns) {
      nextState[col.id] = true;
    }
    onChange(nextState);
  };

  const handleReset = () => {
    const nextState: Record<string, boolean> = {};
    for (const col of columns) {
      nextState[col.id] = col.defaultVisible !== false;
    }
    onChange(nextState);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 text-xs border-slate-200 dark:border-white/10 bg-background hover:bg-accent font-medium",
            className
          )}
        >
          <Columns3 className="size-4 text-sky-500" />
          <span>Kolom</span>
          <span className="ml-0.5 rounded-full bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[10px] font-bold text-muted-foreground">
            {visibleCount}/{columns.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-3 shadow-lg border-slate-200 dark:border-slate-800"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Columns3 className="size-3.5 text-sky-500" />
            <span>Tampilkan Kolom</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-foreground gap-1"
            title="Kembalikan default kolom"
            aria-label="Kembalikan default kolom"
          >
            <RotateCcw className="size-3" /> Reset
          </Button>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
          {columns.map((col) => {
            const isVisible = isColumnVisible(col);
            return (
              <label
                key={col.id}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors",
                  col.alwaysVisible
                    ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800/60"
                )}
              >
                <Checkbox
                  checked={isVisible}
                  disabled={col.alwaysVisible}
                  onCheckedChange={() => !col.alwaysVisible && handleToggle(col.id)}
                  className="size-3.5 rounded border-slate-300 dark:border-slate-700"
                />
                <span className="font-medium text-foreground text-xs flex-1 truncate">
                  {col.label}
                </span>
                {col.alwaysVisible && (
                  <span className="text-[9px] text-muted-foreground font-mono uppercase">
                    Wajib
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {!allSelected && (
          <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="w-full h-7 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30"
            >
              Pilih Semua Kolom
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
