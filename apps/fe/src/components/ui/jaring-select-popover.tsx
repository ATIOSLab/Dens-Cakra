"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { cn } from "@/lib/utils";

export interface JaringOption {
  id: string;
  code: string;
  aliasName: string;
  fullName?: string | null;
  registrationStatus?: string | null;
}

interface JaringSelectPopoverProps {
  options: JaringOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowAllOption?: boolean;
  allOptionLabel?: string;
  disabled?: boolean;
  className?: string;
  filterVerifiedOnly?: boolean;
  container?: HTMLElement | null;
}

export function JaringSelectPopover({
  options,
  value,
  onValueChange,
  placeholder = "Pilih Jaring...",
  allowAllOption = false,
  allOptionLabel,
  disabled = false,
  className,
  filterVerifiedOnly = true,
  container,
}: JaringSelectPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [visibleCount, setVisibleCount] = React.useState(30);
  const [fullscreenContainer, setFullscreenContainer] = React.useState<HTMLElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-detect fullscreen element to ensure popover mounts inside fullscreen overlay
  React.useEffect(() => {
    const updateContainer = () => {
      if (typeof document !== "undefined" && document.fullscreenElement) {
        setFullscreenContainer(document.fullscreenElement as HTMLElement);
      } else {
        setFullscreenContainer(null);
      }
    };
    updateContainer();
    document.addEventListener("fullscreenchange", updateContainer);
    return () => document.removeEventListener("fullscreenchange", updateContainer);
  }, []);

  const activeContainer = container ?? fullscreenContainer;
  const optionScopeLabel = filterVerifiedOnly ? "Jaring Disetujui" : DOMAIN_TERMS.jaring;

  // 1. Filter options by verified status if enabled
  const verifiedOptions = React.useMemo(() => {
    if (!filterVerifiedOnly) return options;
    return options.filter((item) => item.registrationStatus === "APPROVED");
  }, [options, filterVerifiedOnly]);

  // 2. Search filtering
  const filteredOptions = React.useMemo(() => {
    if (!search.trim()) return verifiedOptions;
    const q = search.toLowerCase().trim();
    return verifiedOptions.filter((item) => {
      const alias = (item.aliasName || "").toLowerCase();
      const code = (item.code || "").toLowerCase();
      const name = (item.fullName || "").toLowerCase();
      return alias.includes(q) || code.includes(q) || name.includes(q);
    });
  }, [verifiedOptions, search]);

  // 3. Infinite scroll handler
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      setVisibleCount((prev) => Math.min(prev + 30, filteredOptions.length));
    }
  };

  // Reset visible count and search when popover opens/closes
  React.useEffect(() => {
    if (open) {
      setVisibleCount(30);
    } else {
      setSearch("");
    }
  }, [open]);

  // Determine current display label
  const selectedOption = React.useMemo(() => {
    if (allowAllOption && (value === "ALL" || !value)) {
      return null;
    }
    return verifiedOptions.find((o) => o.id === value);
  }, [verifiedOptions, value, allowAllOption]);

  const buttonLabel = React.useMemo(() => {
    if (allowAllOption && (value === "ALL" || !value)) {
      return allOptionLabel || `Semua Jaring (${verifiedOptions.length})`;
    }
    if (selectedOption) {
      return selectedOption.fullName && selectedOption.fullName !== selectedOption.aliasName
        ? `${selectedOption.aliasName || selectedOption.code} (${selectedOption.fullName})`
        : selectedOption.aliasName || selectedOption.code;
    }
    return placeholder;
  }, [allowAllOption, value, verifiedOptions.length, allOptionLabel, selectedOption, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-xs font-normal h-9 px-3 bg-background hover:bg-muted/50 border-input",
            !selectedOption && value !== "ALL" && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{buttonLabel}</span>
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent container={activeContainer} className="w-[320px] sm:w-[380px] p-0 shadow-md border border-border" align="start">
        {/* Search Header */}
        <div className="p-2 border-b relative flex items-center bg-muted/20">
          <Search className="absolute left-4 top-3.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari kode, alias, atau nama Jaring..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setVisibleCount(30);
            }}
            className="bg-background pr-8 pl-8"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Scrollable Item List */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-64 overflow-y-auto p-1 space-y-0.5"
        >
          {allowAllOption && (
            <button
              type="button"
              onClick={() => {
                onValueChange("ALL");
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-accent text-left",
                (value === "ALL" || !value) && "bg-accent/80 font-semibold text-primary"
              )}
            >
              <span className="truncate font-medium">
                {allOptionLabel || `Semua Jaring (${verifiedOptions.length})`}
              </span>
              {(value === "ALL" || !value) && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
            </button>
          )}

          {filteredOptions.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {search ? `Tidak ada ${optionScopeLabel} yang cocok.` : `Tidak ada ${optionScopeLabel}.`}
            </div>
          ) : (
            filteredOptions.slice(0, visibleCount).map((item) => {
              const isSelected = item.id === value;
              const label =
                item.fullName && item.fullName !== item.aliasName
                  ? `${item.aliasName || item.code} (${item.fullName})`
                  : item.aliasName || item.code;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onValueChange(item.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors hover:bg-accent text-left",
                    isSelected && "bg-accent/80 font-semibold text-primary"
                  )}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate font-medium text-foreground">{label}</span>
                    {item.code && item.code !== item.aliasName && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Kode: {item.code}
                      </span>
                    )}
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer info showing loaded counts */}
        <div className="p-2 border-t text-[11px] text-muted-foreground bg-muted/10 flex items-center justify-between">
          <span>
            Total: <strong className="text-foreground">{verifiedOptions.length}</strong> {optionScopeLabel}
          </span>
          {filteredOptions.length > visibleCount && (
            <span className="text-[10px] text-primary font-medium">
              Scroll untuk memuat lagi ({visibleCount}/{filteredOptions.length})
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
