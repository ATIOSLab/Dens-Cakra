"use client";

import { useEffect, useState } from "react";

import { Filter, RefreshCw, RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { DC_CONTROLS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

interface SearchToolbarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly bindaFilter: string;
  readonly onBindaChange: (value: string) => void;
  readonly bindaOptions: SearchableSelectOption[];
  readonly korwilFilter: string;
  readonly onKorwilChange: (value: string) => void;
  readonly korwilOptions: SearchableSelectOption[];
  readonly gaswilFilter: string;
  readonly onGaswilChange: (value: string) => void;
  readonly gaswilOptions: SearchableSelectOption[];
  readonly statusFilter: string;
  readonly onStatusChange: (value: string) => void;
  readonly gradeFilter: string;
  readonly onGradeChange: (value: string) => void;
  readonly levelFilter: string;
  readonly onLevelChange: (value: string) => void;
  readonly levelList: readonly string[];
  readonly levelLabel: string;
  readonly sortOrder: string;
  readonly onSortChange: (value: string) => void;
  readonly pageSize: number;
  readonly onPageSizeChange: (value: number) => void;
  readonly activeFilterCount: number;
  readonly resultCount: number;
  readonly contextLabel: string;
  readonly onReset: () => void;
  readonly onRefresh: () => void;
}

export function SearchToolbar({
  search,
  onSearchChange,
  bindaFilter,
  onBindaChange,
  bindaOptions,
  korwilFilter,
  onKorwilChange,
  korwilOptions,
  gaswilFilter,
  onGaswilChange,
  gaswilOptions,
  statusFilter,
  onStatusChange,
  gradeFilter,
  onGradeChange,
  levelFilter,
  onLevelChange,
  levelList,
  levelLabel,
  sortOrder,
  onSortChange,
  pageSize,
  onPageSizeChange,
  activeFilterCount,
  resultCount,
  contextLabel,
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

  const option = (value: string, label: string, description?: string): SearchableSelectOption => ({
    value,
    label,
    description,
  });

  const levelOptions = [
    option("ALL", `Semua ${levelLabel}`, "Mengikuti tingkatan hierarki aktif"),
    ...levelList.map((level) => option(level, level)),
  ];
  const gradeOptions = ["ALL", "A", "B", "C", "D"].map((grade) =>
    option(grade, grade === "ALL" ? "Semua Grade" : `Grade ${grade}`),
  );
  const statusOptions = [
    option("ALL", "Semua Status"),
    option("EXCELLENT", "Sangat Baik", "Skor >= 95"),
    option("TARGET", "Target Tercapai", "Skor 90-94"),
    option("OPTIMAL", "Optimal", "Skor 80-89"),
    option("CUKUP", "Cukup", "Skor 70-79"),
    option("PEMBINAAN", "Perlu Pembinaan", "Skor < 70"),
    option("EMPTY", "Belum Cukup Bukti", "Skor belum tersedia"),
  ];
  const sortOptions = [
    option(
      "HIERARCHY_ASC",
      "Urutan Hierarki",
      "Provinsi/Binda, kota/kabupaten/Korwil, kecamatan/Gaswil, lalu Jaring",
    ),
    option("SCORE_DESC", "Skor Tertinggi"),
    option("SCORE_ASC", "Skor Terendah"),
    option("NAME_ASC", "Nama A-Z"),
    option("NAME_DESC", "Nama Z-A"),
    option("GRADE_ASC", "Grade A-D"),
    option("GRADE_DESC", "Grade D-A"),
  ];
  const pageSizeOptions = [20, 30, 40, 50].map((size) => option(String(size), `${size} Baris`));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-3 shadow-xs">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-[var(--dc-primary)]" aria-hidden />
          <p className="font-semibold text-[var(--dc-text-primary)] text-sm">Filter {contextLabel}</p>
          <span className="rounded-full bg-[var(--dc-primary-soft)] px-2 py-0.5 font-mono text-[var(--dc-primary)] text-[10px]">
            {activeFilterCount} aktif
          </span>
        </div>
        <p className="text-[var(--dc-text-muted)] text-xs">
          Menampilkan {resultCount.toLocaleString("id-ID")} data sesuai filter dan hak akses.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(16rem,1.2fr)_repeat(7,minmax(10rem,1fr))_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--dc-text-muted)]" />
          <Input
            className={cn(DC_CONTROLS.input, "pl-9 text-xs")}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Cari provinsi, kota/kabupaten, kecamatan, Petugas Wilayah, atau Jaring..."
          />
        </div>

        <SearchableSelect
          value={bindaFilter}
          onValueChange={onBindaChange}
          options={bindaOptions}
          placeholder="Semua Provinsi/Binda"
          searchPlaceholder="Cari provinsi atau Binda..."
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={korwilFilter}
          onValueChange={onKorwilChange}
          options={korwilOptions}
          placeholder="Semua Kota/Kabupaten/Korwil"
          searchPlaceholder="Cari kota/kabupaten atau Korwil..."
          disabled={bindaFilter === "ALL"}
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={gaswilFilter}
          onValueChange={onGaswilChange}
          options={gaswilOptions}
          placeholder="Semua Kecamatan/Gaswil"
          searchPlaceholder="Cari kecamatan atau Gaswil..."
          disabled={korwilFilter === "ALL"}
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={levelFilter}
          onValueChange={onLevelChange}
          options={levelOptions}
          placeholder={`Semua ${levelLabel}`}
          searchPlaceholder={`Cari ${levelLabel.toLowerCase()}...`}
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={gradeFilter}
          onValueChange={onGradeChange}
          options={gradeOptions}
          placeholder="Semua Grade"
          searchPlaceholder="Cari grade..."
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={statusFilter}
          onValueChange={onStatusChange}
          options={statusOptions}
          placeholder="Semua Status"
          searchPlaceholder="Cari status..."
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={sortOrder}
          onValueChange={onSortChange}
          options={sortOptions}
          placeholder="Urutkan"
          searchPlaceholder="Cari urutan..."
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />
        <SearchableSelect
          value={pageSize.toString()}
          onValueChange={(val) => onPageSizeChange(Number(val))}
          options={pageSizeOptions}
          placeholder="Baris"
          searchPlaceholder="Cari jumlah baris..."
          className={cn(DC_CONTROLS.selectTrigger, "text-xs")}
        />

        <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-3 2xl:col-span-2 2xl:grid-cols-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            className="h-9 w-full border-[var(--dc-border-strong)] bg-background px-3 text-xs hover:bg-[var(--dc-surface-hover)] sm:w-auto"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="h-9 w-full border-[var(--dc-border-strong)] bg-background px-3 text-xs hover:bg-[var(--dc-surface-hover)] sm:w-auto"
          >
            <RefreshCw className={cn("mr-1.5 size-3.5", isRefreshing && "animate-spin")} />
            Sinkronkan
          </Button>
        </div>
      </div>
    </div>
  );
}
