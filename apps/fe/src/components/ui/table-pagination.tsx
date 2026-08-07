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
        "flex flex-col gap-[var(--dc-section-gap)] border-t border-border bg-muted/20 p-[var(--dc-card-padding)] md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <p aria-live="polite" className="text-xs text-muted-foreground">
        Menampilkan{" "}
        <span className="font-semibold text-foreground">
          {startRow}-{endRow}
        </span>{" "}
        dari <span className="font-semibold text-foreground">{total}</span> data.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-muted-foreground">Baris per halaman</Label>
          <Select
            value={String(limit)}
            onValueChange={(value) => onLimitChange(Number(value))}
            disabled={loading}
          >
            <SelectTrigger aria-label="Jumlah baris per halaman" className="w-[76px] border-border bg-background text-sm">
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
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage === 1 || loading}
            aria-label="Halaman sebelumnya"
            className="cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {pagesList.map((pageNum) => (
            <Button
              key={pageNum}
              type="button"
              variant={pageNum === safePage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(pageNum)}
              disabled={loading}
              aria-label={`Buka halaman ${pageNum}`}
              aria-current={pageNum === safePage ? "page" : undefined}
              className={cn(
                "cursor-pointer text-sm",
                pageNum === safePage
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {pageNum}
            </Button>
          ))}

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage === totalPages || loading}
            aria-label="Halaman berikutnya"
            className="cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
