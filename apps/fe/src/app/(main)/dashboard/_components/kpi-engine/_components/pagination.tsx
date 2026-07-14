"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  readonly currentPage: number;
  readonly totalItems: number;
  readonly pageSize: number;
  readonly onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalItems, pageSize, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const getPagesToShow = () => {
    const pages: Array<number | string> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPagesToShow();
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--dc-divider)] pt-4 sm:flex-row">
      {/* 1. Showing range */}
      <div className="text-xs text-[var(--dc-text-muted)] font-mono">
        Showing <span className="font-semibold text-[var(--dc-text-primary)]">{startItem}–{endItem}</span> of{" "}
        <span className="font-semibold text-[var(--dc-text-primary)]">{totalItems}</span>
      </div>

      {/* 2. Controls */}
      <div className="flex items-center gap-2">
        {/* Previous Text Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="border-[var(--dc-border-strong)] bg-background text-xs rounded-md h-8 px-3"
        >
          <ChevronLeft className="size-3.5 mr-1" />
          Previous
        </Button>

        {/* Page indices */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-[var(--dc-text-muted)] font-mono"
                >
                  ...
                </span>
              );
            }

            const pageNum = p as number;
            const isCurrent = pageNum === currentPage;

            return (
              <Button
                key={`page-${pageNum}`}
                variant={isCurrent ? "default" : "outline"}
                onClick={() => onPageChange(pageNum)}
                className={`size-8 text-xs font-mono rounded-md ${
                  isCurrent
                    ? "bg-[var(--dc-primary)] text-white hover:bg-[var(--dc-primary-hover)]"
                    : "border-[var(--dc-border-strong)] bg-background text-[var(--dc-text-secondary)] hover:bg-[var(--dc-surface-hover)]"
                }`}
              >
                {pageNum}
              </Button>
            );
          })}
        </div>

        {/* Next Text Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="border-[var(--dc-border-strong)] bg-background text-xs rounded-md h-8 px-3"
        >
          Next
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
