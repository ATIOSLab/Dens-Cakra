"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type DataRecord = Record<string, unknown>;

interface DataTableProps {
  readonly type: "unit" | "personnel";
  readonly data: readonly DataRecord[];
  readonly sortField: string;
  readonly sortDirection: "asc" | "desc";
  readonly onSortChange: (field: string) => void;
  readonly onSelectRow: (item: DataRecord) => void;
}

export function DataTable({ type, data, sortField, sortDirection, onSortChange, onSelectRow }: DataTableProps) {
  // Safe helpers
  const text = (value: unknown, fallback = "Belum tersedia") => {
    return typeof value === "string" && value.trim() ? value : fallback;
  };

  const numeric = (value: unknown): number | null => {
    const number = Number(value);
    return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
  };

  const getScoreLabel = (score: number | null) => {
    return score === null ? "-" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  };

  const getGradeVariant = (val: string) => {
    if (val === "A" || val === "B") return "default";
    if (val === "D") return "destructive";
    return val === "N/A" ? "outline" : "secondary";
  };

  // Extract kabupaten name from unit name (e.g. "Field Coordination Unit Binda Aceh Barat" -> "Aceh Barat")
  const extractKabupaten = (name: string) => {
    const bindaIndex = name.indexOf("Binda ");
    if (bindaIndex !== -1) return name.slice(bindaIndex + 6);

    const dirIndex = name.indexOf("Direktorat ");
    if (dirIndex !== -1) return name.slice(dirIndex + 11);

    const unitIndex = name.indexOf("Unit ");
    if (unitIndex !== -1) return name.slice(unitIndex + 5);

    return name;
  };

  // Render sort arrow helper
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 size-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 size-3.5 text-[var(--dc-primary)]" />
    ) : (
      <ArrowDown className="ml-1 size-3.5 text-[var(--dc-primary)]" />
    );
  };

  // Mock a stable trend indicator based on ID / score
  const renderTrendIcon = (id: string, score: number | null) => {
    if (score === null) return <span className="text-[var(--dc-text-muted)] font-mono text-xs">—</span>;
    // Generate deterministic boolean based on charCode sum
    const charSum = id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const trendType = charSum % 3;

    if (trendType === 0) {
      return (
        <span className="inline-flex items-center text-emerald-500 font-mono text-xs gap-0.5">
          <TrendingUp className="size-3.5" />▲
        </span>
      );
    }
    if (trendType === 1) {
      return (
        <span className="inline-flex items-center text-red-500 font-mono text-xs gap-0.5">
          <TrendingDown className="size-3.5" />▼
        </span>
      );
    }
    return <span className="text-[var(--dc-text-muted)] font-mono text-xs">■</span>;
  };

  return (
    <div className="relative overflow-x-auto rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <div className="max-h-[750px] overflow-y-auto no-scrollbar">
        <Table className="w-full border-collapse text-xs">
          {/* Header */}
          <TableHeader className="sticky top-0 bg-[var(--dc-surface)] border-b border-[var(--dc-divider)] shadow-[0_1px_0_var(--dc-divider)] z-10">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center font-mono font-bold text-[var(--dc-text-muted)]">#</TableHead>
              {type === "unit" ? (
                <>
                  <TableHead className="min-w-[200px]">
                    <button
                      type="button"
                      onClick={() => onSortChange("name")}
                      className="group flex items-center text-left font-semibold text-[var(--dc-text-secondary)]"
                    >
                      Unit {renderSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-[var(--dc-text-secondary)]">
                    Kabupaten
                  </TableHead>
                  <TableHead className="min-w-[100px] text-right font-semibold text-[var(--dc-text-secondary)]">
                    Personel
                  </TableHead>
                </>
              ) : (
                <>
                  <TableHead className="min-w-[160px]">
                    <button
                      type="button"
                      onClick={() => onSortChange("name")}
                      className="group flex items-center text-left font-semibold text-[var(--dc-text-secondary)]"
                    >
                      Nama {renderSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[140px] font-semibold text-[var(--dc-text-secondary)]">Jabatan</TableHead>
                  <TableHead className="min-w-[160px] font-semibold text-[var(--dc-text-secondary)]">Unit</TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-[var(--dc-text-secondary)]">
                    Kabupaten
                  </TableHead>
                </>
              )}
              <TableHead className="w-24 text-center">
                <button
                  type="button"
                  onClick={() => onSortChange("grade")}
                  className="group mx-auto flex items-center font-semibold text-[var(--dc-text-secondary)]"
                >
                  Grade {renderSortIcon("grade")}
                </button>
              </TableHead>
              <TableHead className="w-24 text-right">
                <button
                  type="button"
                  onClick={() => onSortChange("score")}
                  className="group ml-auto flex items-center justify-end font-semibold text-[var(--dc-text-secondary)]"
                >
                  Skor {renderSortIcon("score")}
                </button>
              </TableHead>
              <TableHead className="w-16 text-center font-semibold text-[var(--dc-text-secondary)]">Trend</TableHead>
              <TableHead className="w-20 text-center font-semibold text-[var(--dc-text-secondary)]">Action</TableHead>
            </TableRow>
          </TableHeader>

          {/* Body */}
          <TableBody>
            {data.map((item, idx) => {
              const score = numeric(item.score);
              const grade = text(item.grade, "N/A");
              const itemId = String(item.id ?? idx);

              if (type === "unit") {
                const unitName = text(item.name);
                const kabupaten = extractKabupaten(unitName);
                const personnelCount = Number(item.personnelCount ?? 0);

                return (
                  <TableRow
                    key={itemId}
                    className="group/row transition-colors border-b border-[var(--dc-divider)] even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,white)] dark:even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,black)] hover:bg-[var(--dc-surface-hover)]"
                  >
                    <TableCell className="text-center font-mono text-[var(--dc-text-muted)] font-medium">
                      {(idx + 1).toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell className="font-semibold text-[var(--dc-text-primary)]">{unitName}</TableCell>
                    <TableCell className="text-[var(--dc-text-secondary)]">{kabupaten}</TableCell>
                    <TableCell className="text-right font-mono font-medium text-[var(--dc-text-secondary)]">
                      {personnelCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getGradeVariant(grade)} className="font-mono px-2 py-0.5 text-[10px]">
                        {grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-[var(--dc-text-primary)]">
                      {getScoreLabel(score)}
                    </TableCell>
                    <TableCell className="text-center">{renderTrendIcon(itemId, score)}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onSelectRow(item)}
                        className="h-7 px-2 text-xs font-medium text-[var(--dc-primary)] hover:bg-[var(--dc-primary-soft)] hover:text-[var(--dc-primary)]"
                      >
                        Detail
                        <ChevronRight className="size-3.5 ml-0.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              // Personnel Row
              const personName = text(item.name);
              const position = text(item.position);
              const unitObj = (item.unit as DataRecord) || {};
              const unitName = text(unitObj.name);

              const areas = Array.isArray(item.areas) ? item.areas : [];
              const kabupaten =
                areas
                  .map((area: any) => text(area?.name, ""))
                  .filter(Boolean)
                  .join(", ") || "Belum ditentukan";

              return (
                <TableRow
                  key={itemId}
                  className="group/row transition-colors border-b border-[var(--dc-divider)] even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,white)] dark:even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,black)] hover:bg-[var(--dc-surface-hover)]"
                >
                  <TableCell className="text-center font-mono text-[var(--dc-text-muted)] font-medium">
                    {(idx + 1).toString().padStart(2, "0")}
                  </TableCell>
                  <TableCell className="font-semibold text-[var(--dc-text-primary)]">{personName}</TableCell>
                  <TableCell className="text-[var(--dc-text-secondary)]">{position}</TableCell>
                  <TableCell className="text-[var(--dc-text-muted)]">{unitName}</TableCell>
                  <TableCell className="text-[var(--dc-text-secondary)] truncate max-w-[120px]" title={kabupaten}>
                    {kabupaten}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getGradeVariant(grade)} className="font-mono px-2 py-0.5 text-[10px]">
                      {grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold text-[var(--dc-text-primary)]">
                    {getScoreLabel(score)}
                  </TableCell>
                  <TableCell className="text-center">{renderTrendIcon(itemId, score)}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => onSelectRow(item)}
                      className="h-7 px-2 text-xs font-medium text-[var(--dc-primary)] hover:bg-[var(--dc-primary-soft)] hover:text-[var(--dc-primary)]"
                    >
                      Detail
                      <ChevronRight className="size-3.5 ml-0.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
