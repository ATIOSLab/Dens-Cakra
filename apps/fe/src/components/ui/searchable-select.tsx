"use client";

import * as React from "react";

import { Check, ChevronsUpDown, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string | null;
  keywords?: string[];
  disabled?: boolean;
};

type SearchableSelectProps = {
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  maxVisibleOptions?: number;
  pageSize?: number;
  container?: HTMLElement | null;
  "aria-label"?: string;
};

export function SearchableSelect({
  value,
  options,
  onValueChange,
  placeholder = "Pilih data",
  searchPlaceholder = "Cari data...",
  emptyText = "Data tidak ditemukan.",
  disabled = false,
  className,
  contentClassName,
  icon,
  maxVisibleOptions = 80,
  pageSize,
  container,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const initialLimit = pageSize ? pageSize : maxVisibleOptions;
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(initialLimit);

  const selectedOption = React.useMemo(() => options.find((option) => option.value === value), [options, value]);

  const filteredOptions = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => {
      const haystack = [option.label, option.description, option.value, ...(option.keywords ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [options, search]);

  React.useEffect(() => {
    if (open) {
      setVisibleCount(pageSize ? pageSize : maxVisibleOptions);
    } else {
      setSearch("");
    }
  }, [open, pageSize, maxVisibleOptions]);

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!pageSize) return;
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      setVisibleCount((prev) => Math.min(prev + (pageSize || 10), filteredOptions.length));
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!pageSize) return;
    if (event.deltaY > 0) {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollHeight - scrollTop - clientHeight < 80) {
        setVisibleCount((prev) => Math.min(prev + (pageSize || 10), filteredOptions.length));
      }
    }
  };

  const visibleOptions = pageSize
    ? filteredOptions.slice(0, visibleCount)
    : filteredOptions.slice(0, maxVisibleOptions);
  const hiddenCount = pageSize
    ? Math.max(filteredOptions.length - visibleCount, 0)
    : Math.max(filteredOptions.length - maxVisibleOptions, 0);

  const isCustomSelected = Boolean(value && value !== "ALL" && value !== "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          className={cn(
            DC_CONTROLS.selectTrigger,
            DC_TYPOGRAPHY.control,
            "w-full min-w-0 justify-between gap-2 text-left font-normal transition-colors hover:bg-muted/50",
            isCustomSelected && "border-primary/45 bg-primary/[0.04] font-medium text-foreground dark:bg-primary/10 hover:border-primary/60",
            !selectedOption && !isCustomSelected && "text-muted-foreground",
            className,
          )}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2">
            {icon ? (
              <span className={cn("shrink-0", isCustomSelected ? "text-primary" : "text-muted-foreground")}>{icon}</span>
            ) : isCustomSelected ? (
              <span className="size-1.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/20" />
            ) : null}
            <span className="truncate">{selectedOption?.label ?? placeholder}</span>
          </span>
          <ChevronsUpDown className={cn("size-3.5 shrink-0 transition-colors", isCustomSelected ? "text-primary/70" : "text-muted-foreground")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        container={container}
        className={cn("w-[var(--radix-popover-trigger-width)] min-w-[260px] p-0 rounded-md border border-border/80 bg-popover text-popover-foreground shadow-lg backdrop-blur-sm z-50", contentClassName)}
      >
        <div className="relative border-b border-border/70 p-2 bg-muted/20">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setVisibleCount(pageSize ? pageSize : maxVisibleOptions);
            }}
            placeholder={searchPlaceholder}
            className={cn(DC_CONTROLS.input, "h-8 pr-8 pl-8 text-xs bg-background/60 focus:bg-background")}
          />
          {search ? (
            <button
              type="button"
              aria-label="Bersihkan pencarian"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div
          className={cn("overflow-y-auto p-1 space-y-0.5", pageSize ? "max-h-56" : "max-h-72")}
          onScroll={pageSize ? handleScroll : undefined}
          onWheel={pageSize ? handleWheel : undefined}
        >
          {visibleOptions.length === 0 ? (
            <div className="px-3 py-6 text-center text-muted-foreground text-xs">{emptyText}</div>
          ) : (
            visibleOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    DC_CONTROLS.selectItem,
                    "flex w-full items-center gap-2 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
                    isSelected
                      ? "bg-primary/10 font-semibold text-primary dark:bg-primary/20 hover:bg-primary/15"
                      : "hover:bg-muted/80",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.label}</span>
                    {option.description ? (
                      <span className="block truncate font-mono text-[11px] text-muted-foreground">{option.description}</span>
                    ) : null}
                  </span>
                  {isSelected ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                </button>
              );
            })
          )}
        </div>

        {hiddenCount > 0 ? (
          <div className="border-t border-border/60 bg-muted/10 px-3 py-2 text-muted-foreground text-[11px]">
            {pageSize
              ? `Gulir untuk memuat ${hiddenCount} pilihan lagi (${visibleCount}/${filteredOptions.length}).`
              : `${hiddenCount} pilihan lain disembunyikan. Ketik kata kunci untuk mempersempit hasil.`}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
