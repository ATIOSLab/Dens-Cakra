"use client";

import type { ComponentProps, ReactNode } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortableTableHeaderProps = Omit<ComponentProps<typeof TableHead>, "children"> & {
  children: ReactNode;
  column: string;
  sortDirection?: "asc" | "desc" | null;
  onSortChange?: (direction: "asc" | "desc") => void;
};

export function SortableTableHeader({
  children,
  className,
  column,
  sortDirection,
  onSortChange,
  ...props
}: SortableTableHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeColumn = searchParams.get("sortBy");
  const isControlled = onSortChange !== undefined;
  const active = isControlled ? sortDirection !== null && sortDirection !== undefined : activeColumn === column;
  const direction = isControlled
    ? (sortDirection ?? "desc")
    : active && searchParams.get("sortOrder") === "asc"
      ? "asc"
      : "desc";
  let Icon = ArrowUpDown;
  let ariaSort: "ascending" | "descending" | "none" = "none";

  if (active) {
    Icon = direction === "asc" ? ArrowUp : ArrowDown;
    ariaSort = direction === "asc" ? "ascending" : "descending";
  }

  function toggleSort() {
    const nextDirection = active && direction === "asc" ? "desc" : "asc";

    if (onSortChange) {
      onSortChange(nextDirection);
      return;
    }

    const next = new URLSearchParams(searchParams.toString());

    next.set("sortBy", column);
    next.set("sortOrder", nextDirection);
    next.delete("page");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <TableHead aria-sort={ariaSort} className={cn("px-0", className)} {...props}>
      <Button
        aria-label={`Urutkan ${String(children)} ${active && direction === "asc" ? "menurun" : "menaik"}`}
        className="h-auto w-full justify-start px-2 py-1 text-inherit uppercase tracking-[inherit]"
        onClick={toggleSort}
        size="sm"
        type="button"
        variant="ghost"
      >
        {children}
        <Icon data-icon="inline-end" />
      </Button>
    </TableHead>
  );
}
