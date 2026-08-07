"use client";

import { LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ViewMode = "card" | "table";

type ViewModeToggleProps = {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
  buttonClassName?: string;
};

export function ViewModeToggle({ value, onValueChange, className, buttonClassName }: ViewModeToggleProps) {
  const activeClass =
    "bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8] hover:text-white dark:bg-[#2563EB] dark:text-white dark:hover:bg-[#1D4ED8]";
  const inactiveClass =
    "text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white";

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-white/5 dark:bg-white/5",
        className,
      )}
    >
      <Button
        aria-label="Tampilan kartu"
        title="Tampilan kartu"
        variant={value === "card" ? "secondary" : "ghost"}
        size="icon"
        type="button"
        onClick={() => onValueChange("card")}
        className={cn(
          "size-8 cursor-pointer rounded-md",
          value === "card" ? activeClass : inactiveClass,
          buttonClassName,
        )}
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        aria-label="Tampilan tabel"
        title="Tampilan tabel"
        variant={value === "table" ? "secondary" : "ghost"}
        size="icon"
        type="button"
        onClick={() => onValueChange("table")}
        className={cn(
          "size-8 cursor-pointer rounded-md",
          value === "table" ? activeClass : inactiveClass,
          buttonClassName,
        )}
      >
        <List className="size-4" />
      </Button>
    </div>
  );
}
