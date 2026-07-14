"use client";

import { useEffect, useState } from "react";
import { RotateCcw, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface SearchToolbarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly statusFilter: string;
  readonly onStatusChange: (value: string) => void;
  readonly gradeFilter: string;
  readonly onGradeChange: (value: string) => void;
  readonly kabupatenFilter: string;
  readonly onKabupatenChange: (value: string) => void;
  readonly kabupatenList: readonly string[];
  readonly sortOrder: string;
  readonly onSortChange: (value: string) => void;
  readonly pageSize: number;
  readonly onPageSizeChange: (value: number) => void;
  readonly onReset: () => void;
  readonly onRefresh: () => void;
}

export function SearchToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  gradeFilter,
  onGradeChange,
  kabupatenFilter,
  onKabupatenChange,
  kabupatenList,
  sortOrder,
  onSortChange,
  pageSize,
  onPageSizeChange,
  onReset,
  onRefresh,
}: SearchToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, onSearchChange]);

  // Sync state if outer query is reset
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-3 shadow-xs">
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:flex xl:flex-wrap xl:items-center xl:gap-2">
        {/* 1. Search */}
        <div className="relative xl:w-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--dc-text-muted)]" />
          <Input
            className="pl-9 h-9 border-[var(--dc-border-strong)] bg-background text-xs placeholder:text-[var(--dc-text-muted)]"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Cari nama, unit, atau wilayah..."
          />
        </div>

        {/* 2. Wilayah (Kabupaten) */}
        <div className="xl:w-40">
          <Select value={kabupatenFilter} onValueChange={onKabupatenChange}>
            <SelectTrigger className="h-9 border-[var(--dc-border-strong)] bg-background text-xs">
              <SelectValue placeholder="Semua Wilayah" />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="ALL" className="text-xs">Semua Wilayah</SelectItem>
              {kabupatenList.map((kab) => (
                <SelectItem key={kab} value={kab} className="text-xs">
                  {kab}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 3. Grade */}
        <div className="xl:w-32">
          <Select value={gradeFilter} onValueChange={onGradeChange}>
            <SelectTrigger className="h-9 border-[var(--dc-border-strong)] bg-background text-xs">
              <SelectValue placeholder="Semua Grade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Grade</SelectItem>
              <SelectItem value="A" className="text-xs">Grade A</SelectItem>
              <SelectItem value="B" className="text-xs">Grade B</SelectItem>
              <SelectItem value="C" className="text-xs">Grade C</SelectItem>
              <SelectItem value="D" className="text-xs">Grade D</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 4. Status */}
        <div className="xl:w-36">
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 border-[var(--dc-border-strong)] bg-background text-xs">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
              <SelectItem value="EXCELLENT" className="text-xs">Excellent (≥ 95)</SelectItem>
              <SelectItem value="TARGET" className="text-xs">Target Tercapai (90-94)</SelectItem>
              <SelectItem value="OPTIMAL" className="text-xs">Optimal (80-89)</SelectItem>
              <SelectItem value="CUKUP" className="text-xs">Cukup (70-79)</SelectItem>
              <SelectItem value="PEMBINAAN" className="text-xs">Perlu Pembinaan (&lt; 70)</SelectItem>
              <SelectItem value="EMPTY" className="text-xs">Belum Cukup Bukti</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 5. Sort */}
        <div className="xl:w-36">
          <Select value={sortOrder} onValueChange={onSortChange}>
            <SelectTrigger className="h-9 border-[var(--dc-border-strong)] bg-background text-xs">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SCORE_DESC" className="text-xs">Skor Tertinggi</SelectItem>
              <SelectItem value="SCORE_ASC" className="text-xs">Skor Terendah</SelectItem>
              <SelectItem value="NAME_ASC" className="text-xs">Nama A-Z</SelectItem>
              <SelectItem value="NAME_DESC" className="text-xs">Nama Z-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 6. Rows Per Page */}
        <div className="xl:w-28">
          <Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(Number(val))}>
            <SelectTrigger className="h-9 border-[var(--dc-border-strong)] bg-background text-xs">
              <SelectValue placeholder="Baris" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20" className="text-xs">20 Baris</SelectItem>
              <SelectItem value="30" className="text-xs">30 Baris</SelectItem>
              <SelectItem value="40" className="text-xs">40 Baris</SelectItem>
              <SelectItem value="50" className="text-xs">50 Baris</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 7. Reset */}
        <div>
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            className="h-9 w-full sm:w-auto px-3 border-[var(--dc-border-strong)] bg-background text-xs hover:bg-[var(--dc-surface-hover)]"
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            Reset
          </Button>
        </div>

        {/* 8. Sinkronkan (Refresh) */}
        <div className="xl:ml-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="h-9 w-full sm:w-auto px-3 border-[var(--dc-border-strong)] bg-background text-xs hover:bg-[var(--dc-surface-hover)]"
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", isRefreshing && "animate-spin")} />
            Sinkronkan
          </Button>
        </div>
      </div>
    </div>
  );
}
