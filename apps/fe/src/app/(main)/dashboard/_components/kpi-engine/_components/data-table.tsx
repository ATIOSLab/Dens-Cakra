"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type DataRecord = Record<string, unknown>;

interface DataTableProps {
  readonly type: "unit" | "personnel";
  readonly data: readonly DataRecord[];
  readonly rowOffset?: number;
  readonly sortField: string;
  readonly sortDirection: "asc" | "desc";
  readonly onSortChange: (field: string) => void;
  readonly onSelectRow: (item: DataRecord) => void;
}

export function DataTable({
  type,
  data,
  rowOffset = 0,
  sortField,
  sortDirection,
  onSortChange,
  onSelectRow,
}: DataTableProps) {
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

  const getScoreStatus = (score: number | null) => {
    if (score === null) return { label: "Belum Cukup Bukti", className: "text-[var(--dc-text-muted)]" };
    if (score >= 95) return { label: "Sangat Baik", className: "text-emerald-500" };
    if (score >= 90) return { label: "Target Tercapai", className: "text-emerald-500" };
    if (score >= 80) return { label: "Optimal", className: "text-[var(--dc-primary)]" };
    if (score >= 70) return { label: "Cukup", className: "text-[var(--dc-warning)]" };
    return { label: "Perlu Pembinaan", className: "text-[var(--dc-danger)]" };
  };

  const extractScope = (name: string) => {
    const bindaIndex = name.indexOf("Binda ");
    if (bindaIndex !== -1) return name.slice(bindaIndex + 6);

    const dirIndex = name.indexOf("Direktorat ");
    if (dirIndex !== -1) return name.slice(dirIndex + 11);

    const unitIndex = name.indexOf("Unit ");
    if (unitIndex !== -1) return name.slice(unitIndex + 5);

    return name;
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 size-3.5 opacity-40 transition-opacity group-hover:opacity-100" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 size-3.5 text-[var(--dc-primary)]" />
    ) : (
      <ArrowDown className="ml-1 size-3.5 text-[var(--dc-primary)]" />
    );
  };

  return (
    <div className="relative overflow-x-auto rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <div className="no-scrollbar max-h-[750px] overflow-y-auto">
        <Table className="w-full border-collapse text-xs">
          <TableHeader className="sticky top-0 z-10 border-[var(--dc-divider)] border-b bg-[var(--dc-surface)] shadow-[0_1px_0_var(--dc-divider)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12 text-center font-bold font-mono text-[var(--dc-text-muted)]">#</TableHead>
              {type === "unit" ? (
                <>
                  <TableHead className="min-w-[220px]">
                    <button
                      type="button"
                      onClick={() => onSortChange("name")}
                      className="group flex items-center text-left font-semibold text-[var(--dc-text-secondary)]"
                    >
                      Kinerja {renderSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-[var(--dc-text-secondary)]">Tingkat</TableHead>
                  <TableHead className="min-w-[100px] text-right font-semibold text-[var(--dc-text-secondary)]">
                    Jaring
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
                  <TableHead className="min-w-[160px] font-semibold text-[var(--dc-text-secondary)]">
                    Penempatan
                  </TableHead>
                  <TableHead className="min-w-[120px] font-semibold text-[var(--dc-text-secondary)]">Cakupan</TableHead>
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
              <TableHead className="w-32 text-center font-semibold text-[var(--dc-text-secondary)]">Status</TableHead>
              <TableHead className="w-20 text-center font-semibold text-[var(--dc-text-secondary)]">Aksi</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {data.map((item, idx) => {
              const score = numeric(item.score);
              const grade = text(item.grade, "N/A");
              const itemId = String(item.id ?? idx);
              const scoreStatus = getScoreStatus(score);

              if (type === "unit") {
                const unitName = text(item.name);
                const scopeArea = (item.scopeArea as DataRecord) || {};
                const levelLabel = text(item.levelLabel, text(item.hierarchyLevel, "Kinerja"));
                const scopeLabel = text(scopeArea.name, extractScope(unitName));
                const jaringCount = Number(item.jaringCount ?? 0);

                return (
                  <TableRow
                    key={itemId}
                    className="group/row border-[var(--dc-divider)] border-b transition-colors even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,white)] hover:bg-[var(--dc-surface-hover)] dark:even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,black)]"
                  >
                    <TableCell className="text-center font-medium font-mono text-[var(--dc-text-muted)]">
                      {(rowOffset + idx + 1).toString().padStart(2, "0")}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-[var(--dc-text-primary)]">{unitName}</p>
                        <p className="text-[10px] text-[var(--dc-text-muted)]">{scopeLabel}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--dc-text-secondary)]">{levelLabel}</TableCell>
                    <TableCell className="text-right font-medium font-mono text-[var(--dc-text-secondary)]">
                      {jaringCount}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getGradeVariant(grade)} className="px-2 py-0.5 font-mono text-[10px]">
                        {grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold font-mono text-[var(--dc-text-primary)]">
                      {getScoreLabel(score)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-medium text-[10px] ${scoreStatus.className}`}>{scoreStatus.label}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => onSelectRow(item)}
                        className="h-7 px-2 font-medium text-[var(--dc-primary)] text-xs hover:bg-[var(--dc-primary-soft)] hover:text-[var(--dc-primary)]"
                      >
                        Detail
                        <ChevronRight className="ml-0.5 size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }

              const personName = text(item.name);
              const position = text(item.position);
              const unitObj = (item.unit as DataRecord) || {};
              const unitName = text(unitObj.name);
              const areas = Array.isArray(item.areas) ? item.areas : [];
              const scopeLabel =
                areas
                  .map((area: any) => text(area?.name, ""))
                  .filter(Boolean)
                  .join(", ") || "Belum ditentukan";

              return (
                <TableRow
                  key={itemId}
                  className="group/row border-[var(--dc-divider)] border-b transition-colors even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,white)] hover:bg-[var(--dc-surface-hover)] dark:even:bg-[color-mix(in_srgb,var(--dc-surface)_97%,black)]"
                >
                  <TableCell className="text-center font-medium font-mono text-[var(--dc-text-muted)]">
                    {(rowOffset + idx + 1).toString().padStart(2, "0")}
                  </TableCell>
                  <TableCell className="font-semibold text-[var(--dc-text-primary)]">{personName}</TableCell>
                  <TableCell className="text-[var(--dc-text-secondary)]">{position}</TableCell>
                  <TableCell className="text-[var(--dc-text-muted)]">{unitName}</TableCell>
                  <TableCell className="max-w-[120px] truncate text-[var(--dc-text-secondary)]" title={scopeLabel}>
                    {scopeLabel}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getGradeVariant(grade)} className="px-2 py-0.5 font-mono text-[10px]">
                      {grade}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold font-mono text-[var(--dc-text-primary)]">
                    {getScoreLabel(score)}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium text-[10px] ${scoreStatus.className}`}>{scoreStatus.label}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => onSelectRow(item)}
                      className="h-7 px-2 font-medium text-[var(--dc-primary)] text-xs hover:bg-[var(--dc-primary-soft)] hover:text-[var(--dc-primary)]"
                    >
                      Detail
                      <ChevronRight className="ml-0.5 size-3.5" />
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
