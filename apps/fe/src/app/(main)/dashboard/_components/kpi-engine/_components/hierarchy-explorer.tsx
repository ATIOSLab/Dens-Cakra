"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { DataTable } from "./data-table";
import { Pagination } from "./pagination";
import { SearchToolbar } from "./search-toolbar";

type DataRecord = Record<string, unknown>;

// Helper to extract numeric values
const numeric = (value: unknown): number | null => {
  const number = Number(value);
  return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
};

// Helper to map score to status classification
const checkStatusFilter = (score: number | null, filter: string) => {
  if (filter === "ALL") return true;
  if (score === null) return filter === "EMPTY";
  if (filter === "EXCELLENT") return score >= 95;
  if (filter === "TARGET") return score >= 90 && score < 95;
  if (filter === "OPTIMAL") return score >= 80 && score < 90;
  if (filter === "CUKUP") return score >= 70 && score < 80;
  if (filter === "PEMBINAAN") return score < 70;
  return true;
};

const text = (value: unknown, fallback = "Belum tersedia") => {
  return typeof value === "string" && value.trim() ? value : fallback;
};

const extractKabupaten = (name: string) => {
  const bindaIndex = name.indexOf("Binda ");
  if (bindaIndex !== -1) return name.slice(bindaIndex + 6);

  const dirIndex = name.indexOf("Direktorat ");
  if (dirIndex !== -1) return name.slice(dirIndex + 11);

  const unitIndex = name.indexOf("Unit ");
  if (unitIndex !== -1) return name.slice(unitIndex + 5);

  return name;
};

const getGradeVariant = (val: string) => {
  if (val === "A" || val === "B") return "default";
  if (val === "D") return "destructive";
  return val === "N/A" ? "outline" : "secondary";
};

function KpiRecordCardGrid({
  type,
  data,
  onSelectRow,
}: {
  readonly type: "unit" | "personnel";
  readonly data: readonly DataRecord[];
  readonly onSelectRow: (item: DataRecord) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {data.map((item, idx) => {
        const itemId = String(item.id ?? idx);
        const score = numeric(item.score);
        const grade = text(item.grade, "N/A");
        const title = text(item.name);
        const unitObj = (item.unit as DataRecord) || {};
        const areas = Array.isArray(item.areas) ? item.areas : [];
        const areaLabel =
          type === "unit"
            ? extractKabupaten(title)
            : areas
                .map((area: any) => text(area?.name, ""))
                .filter(Boolean)
                .join(", ") || "Belum ditentukan";
        const subtitle =
          type === "unit"
            ? text(item.code, text(item.type, "Unit"))
            : `${text(item.position)} · ${text(unitObj.name, "Unit belum tersedia")}`;

        return (
          <Card
            key={itemId}
            className="min-w-0 border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition hover:border-[var(--dc-primary-soft)]"
          >
            <CardContent className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="truncate font-semibold text-[var(--dc-text-primary)] text-sm" title={title}>
                    {title}
                  </h3>
                  <p className="line-clamp-2 text-[var(--dc-text-muted)] text-xs">{subtitle}</p>
                </div>
                <Badge variant={getGradeVariant(grade)} className="shrink-0 font-mono text-[10px]">
                  {grade}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-muted)] p-3 text-xs">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--dc-text-muted)]">Skor</p>
                  <p className="mt-1 font-bold font-mono text-[var(--dc-text-primary)]">
                    {score === null ? "-" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--dc-text-muted)]">
                    {type === "unit" ? "Personel" : "Wilayah"}
                  </p>
                  <p className="mt-1 truncate font-medium text-[var(--dc-text-secondary)]" title={areaLabel}>
                    {type === "unit" ? Number(item.personnelCount ?? 0).toLocaleString("id-ID") : areaLabel}
                  </p>
                </div>
              </div>

              {type === "unit" ? (
                <p className="truncate text-[var(--dc-text-secondary)] text-xs" title={areaLabel}>
                  Kabupaten: {areaLabel}
                </p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectRow(item)}
                className="w-full justify-center border-[var(--dc-border-subtle)] text-[var(--dc-primary)]"
              >
                Detail
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface HierarchyExplorerProps {
  readonly units: readonly DataRecord[];
  readonly personnel: readonly DataRecord[];
  readonly definitions: readonly DataRecord[];
  readonly summaryIndicators: readonly DataRecord[];
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly onSelectRow: (type: "unit" | "personnel", item: DataRecord) => void;
  readonly onRefresh: () => void;
}

export function HierarchyExplorer({
  units,
  personnel,
  definitions,
  summaryIndicators,
  search,
  onSearchChange,
  onSelectRow,
  onRefresh,
}: HierarchyExplorerProps) {
  // Tabs State
  const [activeTab, setActiveTab] = useState<"units" | "personnel" | "method">("units");
  const [viewMode, setViewMode] = useState<"card" | "table">("table");

  // Advanced Filters State
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [kabupatenFilter, setKabupatenFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("SCORE_DESC");

  // Pagination State - Default: 20 Rows per page
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination on tab change or filters change
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setCurrentPage(1);
  };

  // Reset all filters callback
  const handleReset = () => {
    onSearchChange("");
    setStatusFilter("ALL");
    setGradeFilter("ALL");
    setKabupatenFilter("ALL");
    setSortOrder("SCORE_DESC");
    setPageSize(20);
    setCurrentPage(1);
  };

  // Kabupaten list extraction
  const kabupatenList = useMemo(() => {
    const set = new Set<string>();
    for (const unit of units) {
      const name = String(unit.name ?? "");
      const bindaIndex = name.indexOf("Binda ");
      if (bindaIndex !== -1) set.add(name.slice(bindaIndex + 6));
      else {
        const unitIndex = name.indexOf("Unit ");
        if (unitIndex !== -1) set.add(name.slice(unitIndex + 5));
        else if (name) set.add(name);
      }
    }
    return Array.from(set).sort();
  }, [units]);

  // Filter & Sort Units
  const filteredSortedUnits = useMemo(() => {
    const query = search.trim().toLowerCase();

    const res = units.filter((unit) => {
      const uName = String(unit.name ?? "").toLowerCase();
      const uCode = String(unit.code ?? "").toLowerCase();
      const uType = String(unit.type ?? "").toLowerCase();

      // Search query
      const matchesSearch = !query || uName.includes(query) || uCode.includes(query) || uType.includes(query);
      if (!matchesSearch) return false;

      // Grade filter
      if (gradeFilter !== "ALL" && String(unit.grade ?? "") !== gradeFilter) return false;

      // Kabupaten filter
      if (kabupatenFilter !== "ALL") {
        const bindaIndex = unit.name ? String(unit.name).indexOf("Binda ") : -1;
        const subName = bindaIndex !== -1 ? String(unit.name).slice(bindaIndex + 6) : String(unit.name);
        if (!subName.includes(kabupatenFilter)) return false;
      }

      // Status filter
      const score = numeric(unit.score);
      if (!checkStatusFilter(score, statusFilter)) return false;

      return true;
    });

    // Sorting
    res.sort((a, b) => {
      const scoreA = numeric(a.score) ?? -1;
      const scoreB = numeric(b.score) ?? -1;
      const nameA = String(a.name ?? "");
      const nameB = String(b.name ?? "");

      if (sortOrder === "SCORE_DESC") return scoreB - scoreA;
      if (sortOrder === "SCORE_ASC") return scoreA - scoreB;
      if (sortOrder === "NAME_ASC") return nameA.localeCompare(nameB);
      if (sortOrder === "NAME_DESC") return nameB.localeCompare(nameA);
      return 0;
    });

    return res;
  }, [units, search, gradeFilter, kabupatenFilter, statusFilter, sortOrder]);

  // Filter & Sort Personnel
  const filteredSortedPersonnel = useMemo(() => {
    const query = search.trim().toLowerCase();

    const res = personnel.filter((person) => {
      const pName = String(person.name ?? "").toLowerCase();
      const pPos = String(person.position ?? "").toLowerCase();
      const unitObj = (person.unit as DataRecord) || {};
      const uName = String(unitObj.name ?? "").toLowerCase();

      const areas = Array.isArray(person.areas) ? person.areas : [];
      const areasStr = areas
        .map((area: any) => String(area?.name ?? ""))
        .join(", ")
        .toLowerCase();

      // Search query
      const matchesSearch =
        !query || pName.includes(query) || pPos.includes(query) || uName.includes(query) || areasStr.includes(query);
      if (!matchesSearch) return false;

      // Grade filter
      if (gradeFilter !== "ALL" && String(person.grade ?? "") !== gradeFilter) return false;

      // Kabupaten filter
      if (kabupatenFilter !== "ALL" && !areasStr.includes(kabupatenFilter.toLowerCase())) return false;

      // Status filter
      const score = numeric(person.score);
      if (!checkStatusFilter(score, statusFilter)) return false;

      return true;
    });

    // Sorting
    res.sort((a, b) => {
      const scoreA = numeric(a.score) ?? -1;
      const scoreB = numeric(b.score) ?? -1;
      const nameA = String(a.name ?? "");
      const nameB = String(b.name ?? "");

      if (sortOrder === "SCORE_DESC") return scoreB - scoreA;
      if (sortOrder === "SCORE_ASC") return scoreA - scoreB;
      if (sortOrder === "NAME_ASC") return nameA.localeCompare(nameB);
      if (sortOrder === "NAME_DESC") return nameB.localeCompare(nameA);
      return 0;
    });

    return res;
  }, [personnel, search, gradeFilter, kabupatenFilter, statusFilter, sortOrder]);

  // Pagination slicing
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSortedUnits.slice(start, start + pageSize);
  }, [filteredSortedUnits, currentPage, pageSize]);

  const paginatedPersonnel = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSortedPersonnel.slice(start, start + pageSize);
  }, [filteredSortedPersonnel, currentPage, pageSize]);

  const scoresByCode = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const ind of summaryIndicators) {
      map.set(String(ind.code ?? ""), numeric(ind.score));
    }
    return map;
  }, [summaryIndicators]);

  const getIndicatorStatus = (score: number | null) => {
    if (score === null) return "Belum Cukup Bukti";
    if (score >= 95) return "Sangat Baik";
    if (score >= 90) return "Target Tercapai";
    if (score >= 80) return "Optimal";
    if (score >= 70) return "Cukup";
    return "Perlu Pembinaan";
  };

  return (
    <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <CardHeader className="p-4 pb-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <CardTitle className="font-bold text-[var(--dc-text-primary)] text-base">Hierarki KPI Terintegrasi</CardTitle>
          <CardDescription className="text-[var(--dc-text-muted)] text-xs">
            Eksplorasi data untuk level Unit, Personel, dan Metodologi Penilaian.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as any);
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-[400px] grid-cols-3 bg-muted">
            <TabsTrigger value="units" className="text-xs">
              Unit ({filteredSortedUnits.length})
            </TabsTrigger>
            <TabsTrigger value="personnel" className="text-xs">
              Personel ({filteredSortedPersonnel.length})
            </TabsTrigger>
            <TabsTrigger value="method" className="text-xs">
              Metodologi
            </TabsTrigger>
          </TabsList>

          {/* UNIT TAB CONTENT */}
          <TabsContent value="units" className="mt-4 space-y-4">
            <SearchToolbar
              search={search}
              onSearchChange={onSearchChange}
              statusFilter={statusFilter}
              onStatusChange={(val) => handleFilterChange(setStatusFilter, val)}
              gradeFilter={gradeFilter}
              onGradeChange={(val) => handleFilterChange(setGradeFilter, val)}
              kabupatenFilter={kabupatenFilter}
              onKabupatenChange={(val) => handleFilterChange(setKabupatenFilter, val)}
              kabupatenList={kabupatenList}
              sortOrder={sortOrder}
              onSortChange={(val) => handleFilterChange(setSortOrder, val)}
              pageSize={pageSize}
              onPageSizeChange={(val) => handleFilterChange(setPageSize, val)}
              onReset={handleReset}
              onRefresh={onRefresh}
            />

            {filteredSortedUnits.length > 0 ? (
              <div className="flex items-center justify-end gap-3">
                <span className="font-semibold text-[10px] text-[var(--dc-text-muted)] uppercase tracking-[0.28em]">
                  Tampilan
                </span>
                <ViewModeToggle value={viewMode} onValueChange={setViewMode} buttonClassName="size-7" />
              </div>
            ) : null}

            {filteredSortedUnits.length > 0 ? (
              <>
                {viewMode === "table" ? (
                  <DataTable
                    type="unit"
                    data={paginatedUnits}
                    sortField={
                      sortOrder.startsWith("NAME") ? "name" : sortOrder.startsWith("GRADE") ? "grade" : "score"
                    }
                    sortDirection={sortOrder.endsWith("ASC") ? "asc" : "desc"}
                    onSortChange={(field) => {
                      if (field === "name") setSortOrder(sortOrder === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                      else if (field === "score")
                        setSortOrder(sortOrder === "SCORE_DESC" ? "SCORE_ASC" : "SCORE_DESC");
                    }}
                    onSelectRow={(item) => onSelectRow("unit", item)}
                  />
                ) : (
                  <KpiRecordCardGrid type="unit" data={paginatedUnits} onSelectRow={(item) => onSelectRow("unit", item)} />
                )}

                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredSortedUnits.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
                <p className="font-semibold text-[var(--dc-text-secondary)] text-sm">Belum ada data.</p>
                <p className="mt-1 text-[var(--dc-text-muted)] text-xs">
                  Silakan ubah filter atau tunggu sinkronisasi.
                </p>
              </div>
            )}
          </TabsContent>

          {/* PERSONNEL TAB CONTENT */}
          <TabsContent value="personnel" className="mt-4 space-y-4">
            <SearchToolbar
              search={search}
              onSearchChange={onSearchChange}
              statusFilter={statusFilter}
              onStatusChange={(val) => handleFilterChange(setStatusFilter, val)}
              gradeFilter={gradeFilter}
              onGradeChange={(val) => handleFilterChange(setGradeFilter, val)}
              kabupatenFilter={kabupatenFilter}
              onKabupatenChange={(val) => handleFilterChange(setKabupatenFilter, val)}
              kabupatenList={kabupatenList}
              sortOrder={sortOrder}
              onSortChange={(val) => handleFilterChange(setSortOrder, val)}
              pageSize={pageSize}
              onPageSizeChange={(val) => handleFilterChange(setPageSize, val)}
              onReset={handleReset}
              onRefresh={onRefresh}
            />

            {filteredSortedPersonnel.length > 0 ? (
              <div className="flex items-center justify-end gap-3">
                <span className="font-semibold text-[10px] text-[var(--dc-text-muted)] uppercase tracking-[0.28em]">
                  Tampilan
                </span>
                <ViewModeToggle value={viewMode} onValueChange={setViewMode} buttonClassName="size-7" />
              </div>
            ) : null}

            {filteredSortedPersonnel.length > 0 ? (
              <>
                {viewMode === "table" ? (
                  <DataTable
                    type="personnel"
                    data={paginatedPersonnel}
                    sortField={
                      sortOrder.startsWith("NAME") ? "name" : sortOrder.startsWith("GRADE") ? "grade" : "score"
                    }
                    sortDirection={sortOrder.endsWith("ASC") ? "asc" : "desc"}
                    onSortChange={(field) => {
                      if (field === "name") setSortOrder(sortOrder === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                      else if (field === "score")
                        setSortOrder(sortOrder === "SCORE_DESC" ? "SCORE_ASC" : "SCORE_DESC");
                    }}
                    onSelectRow={(item) => onSelectRow("personnel", item)}
                  />
                ) : (
                  <KpiRecordCardGrid
                    type="personnel"
                    data={paginatedPersonnel}
                    onSelectRow={(item) => onSelectRow("personnel", item)}
                  />
                )}

                <Pagination
                  currentPage={currentPage}
                  totalItems={filteredSortedPersonnel.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-10">
                <p className="font-semibold text-[var(--dc-text-secondary)] text-sm">Belum ada data.</p>
                <p className="mt-1 text-[var(--dc-text-muted)] text-xs">
                  Silakan ubah filter atau tunggu sinkronisasi.
                </p>
              </div>
            )}
          </TabsContent>

          {/* METHODOLOGY TAB CONTENT */}
          <TabsContent value="method" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {definitions.map((def) => {
                const code = String(def.code ?? "");
                const name = String(def.name ?? "");
                const evidenceDesc = String(def.evidence ?? "");
                const score = scoresByCode.get(code) ?? null;
                const statusLabel = getIndicatorStatus(score);

                return (
                  <Card
                    key={code}
                    className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all hover:border-[var(--dc-primary-soft)] hover:shadow-xs"
                  >
                    <CardHeader className="flex flex-row items-start justify-between gap-4 p-4 pb-2">
                      <div>
                        <Badge
                          variant="outline"
                          className="border-[var(--dc-border-strong)] bg-background px-2 py-0.5 font-mono font-semibold text-xs"
                        >
                          {code}
                        </Badge>
                        <CardTitle className="mt-2 font-bold text-[var(--dc-text-primary)] text-sm">{name}</CardTitle>
                      </div>
                      <div className="text-right">
                        <span className="font-bold font-mono text-[var(--dc-text-primary)] text-lg">
                          {score === null ? "-" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                        </span>
                        <span className="block text-[10px] text-[var(--dc-text-muted)]">Target: 100</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-2">
                      <p className="text-[var(--dc-text-secondary)] text-xs leading-relaxed">{evidenceDesc}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[var(--dc-text-muted)]">
                          <span>Status Pencapaian</span>
                          <span
                            className={cn(
                              "font-semibold",
                              statusLabel === "Sangat Baik" || statusLabel === "Target Tercapai"
                                ? "text-emerald-500"
                                : statusLabel === "Optimal"
                                  ? "text-[var(--dc-primary)]"
                                  : statusLabel === "Cukup"
                                    ? "text-[var(--dc-warning)]"
                                    : statusLabel === "Perlu Pembinaan"
                                      ? "text-[var(--dc-danger)]"
                                      : "text-[var(--dc-text-muted)]",
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <Progress value={score ?? 0} className="h-1.5 [&>div]:bg-[var(--dc-primary)]" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
