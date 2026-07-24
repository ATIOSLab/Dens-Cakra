"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { Label } from "./label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  loading?: boolean;
  className?: string;
}

export function TablePagination({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  loading = false,
  className,
}: TablePaginationProps) {
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const startRow = total === 0 ? 0 : (safePage - 1) * limit + 1;
  const endRow = Math.min(safePage * limit, total);

  // Generate pagination numbers
  const pagesList: number[] = [];
  const startPage = Math.max(1, safePage - 2);
  const endPage = Math.min(totalPages, safePage + 2);
  for (let i = startPage; i <= endPage; i++) {
    pagesList.push(i);
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 py-3.5 md:flex-row md:items-center md:justify-between border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] px-6",
        className
      )}
    >
      <p className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
        Menampilkan{" "}
        <span className="font-semibold text-foreground">
          {startRow}-{endRow}
        </span>{" "}
        dari <span className="font-semibold text-foreground">{total}</span> data.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-muted-foreground text-xs font-mono uppercase tracking-wider">Baris</Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={loading}
          >
            <SelectTrigger className="h-8 w-[70px] bg-background/50 border-border text-xs focus:ring-0">
              <SelectValue placeholder={String(limit)} />
            </SelectTrigger>
            <SelectContent position="popper">
              {[5, 10, 20, 50].map((val) => (
                <SelectItem key={val} value={String(val)}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1 || loading}
            className="size-8 cursor-pointer rounded-md"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pagesList.map((pageNum) => (
            <Button
              key={pageNum}
              variant={pageNum === safePage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              className={cn(
                "h-8 w-8 cursor-pointer rounded-md text-xs font-mono",
                pageNum === safePage
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages || loading}
            className="size-8 cursor-pointer rounded-md"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
