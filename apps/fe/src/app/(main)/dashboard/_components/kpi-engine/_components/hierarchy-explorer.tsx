"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DataTable } from "./data-table";
import { Pagination } from "./pagination";
import { SearchToolbar } from "./search-toolbar";

type DataRecord = Record<string, unknown>;

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

  // Helper to extract numeric values
  const numeric = (value: unknown): number | null => {
    const number = Number(value);
    return value !== null && value !== undefined && Number.isFinite(number) ? number : null;
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

  // Filter & Sort Units
  const filteredSortedUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    
    let res = units.filter((unit) => {
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

    let res = personnel.filter((person) => {
      const pName = String(person.name ?? "").toLowerCase();
      const pPos = String(person.position ?? "").toLowerCase();
      const unitObj = (person.unit as DataRecord) || {};
      const uName = String(unitObj.name ?? "").toLowerCase();

      const areas = Array.isArray(person.areas) ? person.areas : [];
      const areasStr = areas.map((area: any) => String(area?.name ?? "")).join(", ").toLowerCase();

      // Search query
      const matchesSearch = !query || pName.includes(query) || pPos.includes(query) || uName.includes(query) || areasStr.includes(query);
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
    if (score >= 95) return "Excellent";
    if (score >= 90) return "Target Tercapai";
    if (score >= 80) return "Optimal";
    if (score >= 70) return "Cukup";
    return "Perlu Pembinaan";
  };

  return (
    <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <CardHeader className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col gap-2">
          <CardTitle className="text-base font-bold text-[var(--dc-text-primary)]">
            Hierarki KPI Terintegrasi
          </CardTitle>
          <CardDescription className="text-xs text-[var(--dc-text-muted)]">
            Eksplorasi data untuk level Unit, Personel, dan Metodologi Penilaian.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
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
          <TabsContent value="units" className="space-y-4 mt-4">
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

            <DataTable
              type="unit"
              data={paginatedUnits}
              sortField={sortOrder.startsWith("NAME") ? "name" : sortOrder.startsWith("GRADE") ? "grade" : "score"}
              sortDirection={sortOrder.endsWith("ASC") ? "asc" : "desc"}
              onSortChange={(field) => {
                if (field === "name") setSortOrder(sortOrder === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                else if (field === "score") setSortOrder(sortOrder === "SCORE_DESC" ? "SCORE_ASC" : "SCORE_DESC");
              }}
              onSelectRow={(item) => onSelectRow("unit", item)}
            />

            {filteredSortedUnits.length > 0 ? (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredSortedUnits.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg">
                <p className="text-sm font-semibold text-[var(--dc-text-secondary)]">Belum ada data.</p>
                <p className="text-xs text-[var(--dc-text-muted)] mt-1">Silakan ubah filter atau tunggu sinkronisasi.</p>
              </div>
            )}
          </TabsContent>

          {/* PERSONNEL TAB CONTENT */}
          <TabsContent value="personnel" className="space-y-4 mt-4">
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

            <DataTable
              type="personnel"
              data={paginatedPersonnel}
              sortField={sortOrder.startsWith("NAME") ? "name" : sortOrder.startsWith("GRADE") ? "grade" : "score"}
              sortDirection={sortOrder.endsWith("ASC") ? "asc" : "desc"}
              onSortChange={(field) => {
                if (field === "name") setSortOrder(sortOrder === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                else if (field === "score") setSortOrder(sortOrder === "SCORE_DESC" ? "SCORE_ASC" : "SCORE_DESC");
              }}
              onSelectRow={(item) => onSelectRow("personnel", item)}
            />

            {filteredSortedPersonnel.length > 0 ? (
              <Pagination
                currentPage={currentPage}
                totalItems={filteredSortedPersonnel.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-lg">
                <p className="text-sm font-semibold text-[var(--dc-text-secondary)]">Belum ada data.</p>
                <p className="text-xs text-[var(--dc-text-muted)] mt-1">Silakan ubah filter atau tunggu sinkronisasi.</p>
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
                  <Card key={code} className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] transition-all hover:border-[var(--dc-primary-soft)] hover:shadow-xs">
                    <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between gap-4">
                      <div>
                        <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5 border-[var(--dc-border-strong)] bg-background">
                          {code}
                        </Badge>
                        <CardTitle className="text-sm font-bold text-[var(--dc-text-primary)] mt-2">
                          {name}
                        </CardTitle>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-lg font-bold text-[var(--dc-text-primary)]">
                          {score === null ? "-" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
                        </span>
                        <span className="text-[10px] text-[var(--dc-text-muted)] block">Target: 100</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2 space-y-3">
                      <p className="text-xs text-[var(--dc-text-secondary)] leading-relaxed">
                        {evidenceDesc}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[var(--dc-text-muted)]">
                          <span>Status Pencapaian</span>
                          <span className={cn(
                            "font-semibold",
                            statusLabel === "Excellent" || statusLabel === "Target Tercapai" ? "text-emerald-500" :
                            statusLabel === "Optimal" ? "text-[var(--dc-primary)]" :
                            statusLabel === "Cukup" ? "text-[var(--dc-warning)]" :
                            statusLabel === "Perlu Pembinaan" ? "text-[var(--dc-danger)]" : "text-[var(--dc-text-muted)]"
                          )}>
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
