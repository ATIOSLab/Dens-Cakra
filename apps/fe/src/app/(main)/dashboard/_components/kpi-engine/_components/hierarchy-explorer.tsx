"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChevronRight } from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { findDkiJakartaProvinceFilterId } from "@/lib/domain/area-filter";
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

const HIERARCHY_LEVEL_ORDER = new Map([
  ["BINDA", 1],
  ["KORWIL", 2],
  ["GASWIL", 3],
  ["JARING", 4],
]);

function hierarchyLevel(value: DataRecord) {
  return text(value.hierarchyLevel, "");
}

function scopeArea(value: DataRecord) {
  return (value.scopeArea && typeof value.scopeArea === "object" && !Array.isArray(value.scopeArea)
    ? (value.scopeArea as DataRecord)
    : {}) as DataRecord;
}

function scopeAreaId(value: DataRecord) {
  return text(scopeArea(value).id, "");
}

function scopeAreaName(value: DataRecord) {
  return text(scopeArea(value).name, "");
}

function optionDescriptionForLevel(level: string, areaName: string) {
  if (!areaName) return undefined;
  if (level === "BINDA") return `Provinsi/Binda ${areaName}`;
  if (level === "KORWIL") return `Kota/Kabupaten/Korwil ${areaName}`;
  if (level === "GASWIL") return `Kecamatan/Gaswil ${areaName}`;
  if (level === "JARING") return `Jaring ${areaName}`;
  return areaName;
}

function unitOption(unit: DataRecord) {
  const level = hierarchyLevel(unit);
  const areaName = scopeAreaName(unit);
  return {
    value: text(unit.id, ""),
    label: text(unit.name, areaName || "Unit wilayah"),
    description: optionDescriptionForLevel(level, areaName),
    keywords: [text(unit.code, ""), areaName, text(unit.levelLabel, "")].filter(Boolean),
  };
}

function unitProvinceFilterIdentity(unit: DataRecord) {
  const area = scopeArea(unit);
  return {
    id: text(unit.id, ""),
    name: text(area.name, text(unit.name, "")),
    code: typeof area.code === "string" ? area.code : null,
    officialCode: typeof area.officialCode === "string" ? area.officialCode : null,
  };
}

function ancestorUnit(unit: DataRecord | undefined, level: string, unitById: Map<string, DataRecord>) {
  let current = unit;
  const visited = new Set<string>();

  while (current) {
    const currentId = text(current.id, "");
    if (visited.has(currentId)) return undefined;
    visited.add(currentId);

    if (hierarchyLevel(current) === level) return current;
    const parentId = text(current.parentId, "");
    current = parentId ? unitById.get(parentId) : undefined;
  }

  return undefined;
}

function isUnitInside(unit: DataRecord, selectedUnitId: string, unitById: Map<string, DataRecord>) {
  let current: DataRecord | undefined = unit;
  const visited = new Set<string>();

  while (current) {
    const currentId = text(current.id, "");
    if (!currentId || visited.has(currentId)) return false;
    if (currentId === selectedUnitId) return true;
    visited.add(currentId);
    const parentId = text(current.parentId, "");
    current = parentId ? unitById.get(parentId) : undefined;
  }

  return false;
}

function nextHierarchyLevel(input: { bindaFilter: string; korwilFilter: string; gaswilFilter: string }) {
  if (input.gaswilFilter !== "ALL") return "JARING";
  if (input.korwilFilter !== "ALL") return "GASWIL";
  if (input.bindaFilter !== "ALL") return "KORWIL";
  return "BINDA";
}

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
        const scopeArea = (item.scopeArea as DataRecord) || {};
        const areas = Array.isArray(item.areas) ? item.areas : [];
        const areaLabel =
          type === "unit"
            ? text(scopeArea.name, "Cakupan belum ditentukan")
            : areas
                .map((area: any) => text(area?.name, ""))
                .filter(Boolean)
                .join(", ") || "Belum ditentukan";
        const subtitle =
          type === "unit"
            ? `${text(item.levelLabel, "Kinerja")} / ${text(item.code, "Kode belum tersedia")}`
            : `${text(item.position)} / ${text(unitObj.name, "Unit belum tersedia")}`;

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
                    {type === "unit" ? "Jaring" : "Wilayah"}
                  </p>
                  <p className="mt-1 truncate font-medium text-[var(--dc-text-secondary)]" title={areaLabel}>
                    {type === "unit" ? Number(item.jaringCount ?? 0).toLocaleString("id-ID") : areaLabel}
                  </p>
                </div>
              </div>

              {type === "unit" ? (
                <p className="truncate text-[var(--dc-text-secondary)] text-xs" title={areaLabel}>
                  Cakupan: {areaLabel}
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
  const [bindaFilter, setBindaFilter] = useState("ALL");
  const [korwilFilter, setKorwilFilter] = useState("ALL");
  const [gaswilFilter, setGaswilFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [gradeFilter, setGradeFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("HIERARCHY_ASC");
  const didApplyDefaultBindaFilter = useRef(false);

  // Pagination State - Default: 20 Rows per page
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Reset pagination on tab change or filters change
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setCurrentPage(1);
  };

  const bindaUnits = useMemo(
    () =>
      units
        .filter((unit) => hierarchyLevel(unit) === "BINDA")
        .sort((left, right) => scopeAreaName(left).localeCompare(scopeAreaName(right), "id-ID")),
    [units],
  );

  const defaultBindaFilter = useMemo(
    () => findDkiJakartaProvinceFilterId(bindaUnits.map(unitProvinceFilterIdentity)),
    [bindaUnits],
  );

  useEffect(() => {
    if (didApplyDefaultBindaFilter.current || !defaultBindaFilter || bindaFilter !== "ALL") return;

    didApplyDefaultBindaFilter.current = true;
    setBindaFilter(defaultBindaFilter);
    setKorwilFilter("ALL");
    setGaswilFilter("ALL");
    setCurrentPage(1);
  }, [bindaFilter, defaultBindaFilter]);

  // Reset all filters callback
  const handleReset = () => {
    onSearchChange("");
    setBindaFilter(defaultBindaFilter || "ALL");
    setKorwilFilter("ALL");
    setGaswilFilter("ALL");
    setStatusFilter("ALL");
    setGradeFilter("ALL");
    setLevelFilter("ALL");
    setSortOrder("HIERARCHY_ASC");
    setPageSize(20);
    setCurrentPage(1);
  };

  const unitById = useMemo(() => new Map(units.map((unit) => [text(unit.id, ""), unit])), [units]);

  const korwilUnits = useMemo(
    () =>
      units
        .filter((unit) => hierarchyLevel(unit) === "KORWIL")
        .filter((unit) => bindaFilter === "ALL" || ancestorUnit(unit, "BINDA", unitById)?.id === bindaFilter)
        .sort((left, right) => scopeAreaName(left).localeCompare(scopeAreaName(right), "id-ID")),
    [bindaFilter, unitById, units],
  );

  const gaswilUnits = useMemo(
    () =>
      units
        .filter((unit) => hierarchyLevel(unit) === "GASWIL")
        .filter((unit) => bindaFilter === "ALL" || ancestorUnit(unit, "BINDA", unitById)?.id === bindaFilter)
        .filter((unit) => korwilFilter === "ALL" || ancestorUnit(unit, "KORWIL", unitById)?.id === korwilFilter)
        .sort((left, right) => {
          const leftArea = scopeAreaName(left);
          const rightArea = scopeAreaName(right);
          return leftArea.localeCompare(rightArea, "id-ID") || text(left.name, "").localeCompare(text(right.name, ""));
        }),
    [bindaFilter, korwilFilter, unitById, units],
  );

  const bindaOptions = useMemo(
    () => [
      { value: "ALL", label: "Semua Provinsi/Binda", description: "Peringkat Binda per provinsi sesuai hak akses" },
      ...bindaUnits.map(unitOption),
    ],
    [bindaUnits],
  );

  const korwilOptions = useMemo(
    () => [
      {
        value: "ALL",
        label: bindaFilter === "ALL" ? "Pilih provinsi/Binda terlebih dahulu" : "Semua Kota/Kabupaten/Korwil",
        description:
          bindaFilter === "ALL"
            ? "Filter Korwil aktif setelah provinsi/Binda dipilih"
            : "Semua Korwil dalam provinsi/Binda",
      },
      ...korwilUnits.map(unitOption),
    ],
    [bindaFilter, korwilUnits],
  );

  const gaswilOptions = useMemo(
    () => [
      {
        value: "ALL",
        label: korwilFilter === "ALL" ? "Pilih kota/kabupaten/Korwil terlebih dahulu" : "Semua Kecamatan/Gaswil",
        description:
          korwilFilter === "ALL"
            ? "Filter Gaswil aktif setelah kota/kabupaten/Korwil dipilih"
            : "Semua Gaswil dalam kota/kabupaten/Korwil",
      },
      ...gaswilUnits.map(unitOption),
    ],
    [gaswilUnits, korwilFilter],
  );

  const visibleHierarchyLevel = useMemo(
    () => nextHierarchyLevel({ bindaFilter, korwilFilter, gaswilFilter }),
    [bindaFilter, gaswilFilter, korwilFilter],
  );

  const filteredHierarchyAreaIds = useMemo(() => {
    const selected = new Set<string>();
    for (const unit of units) {
      const selectedByBinda = bindaFilter === "ALL" || isUnitInside(unit, bindaFilter, unitById);
      const selectedByKorwil = korwilFilter === "ALL" || isUnitInside(unit, korwilFilter, unitById);
      const selectedByGaswil = gaswilFilter === "ALL" || isUnitInside(unit, gaswilFilter, unitById);
      if (!selectedByBinda || !selectedByKorwil || !selectedByGaswil) continue;

      const id = scopeAreaId(unit);
      if (id) selected.add(id);
    }
    return selected;
  }, [bindaFilter, gaswilFilter, korwilFilter, unitById, units]);

  const unitLevelList = useMemo(() => {
    const set = new Set<string>();
    for (const unit of units) {
      if (hierarchyLevel(unit) !== visibleHierarchyLevel) continue;
      const level = text(unit.levelLabel, text(unit.hierarchyLevel, ""));
      if (level) set.add(level);
    }
    return Array.from(set).sort();
  }, [units, visibleHierarchyLevel]);

  const personnelLevelList = useMemo(() => {
    const set = new Set<string>();
    for (const person of personnel) {
      const position = text(person.position, "");
      if (position) set.add(position);
    }
    return Array.from(set).sort();
  }, [personnel]);

  const handleBindaChange = (value: string) => {
    setBindaFilter(value);
    setKorwilFilter("ALL");
    setGaswilFilter("ALL");
    setLevelFilter("ALL");
    setCurrentPage(1);
  };

  const handleKorwilChange = (value: string) => {
    setKorwilFilter(value);
    setGaswilFilter("ALL");
    setLevelFilter("ALL");
    setCurrentPage(1);
  };

  const handleGaswilChange = (value: string) => {
    setGaswilFilter(value);
    setLevelFilter("ALL");
    setCurrentPage(1);
  };

  const unitMatchesHierarchy = useCallback(
    (unit: DataRecord) => {
      if (hierarchyLevel(unit) !== visibleHierarchyLevel) return false;
      if (bindaFilter !== "ALL" && !isUnitInside(unit, bindaFilter, unitById)) return false;
      if (korwilFilter !== "ALL" && !isUnitInside(unit, korwilFilter, unitById)) return false;
      if (gaswilFilter !== "ALL" && !isUnitInside(unit, gaswilFilter, unitById)) return false;
      return true;
    },
    [bindaFilter, gaswilFilter, korwilFilter, unitById, visibleHierarchyLevel],
  );

  const personnelMatchesHierarchy = useCallback((person: DataRecord) => {
    if (bindaFilter === "ALL" && korwilFilter === "ALL" && gaswilFilter === "ALL") return true;

    const gaswilUnit = unitById.get(`gaswil:${text(person.id, "")}`);
    if (gaswilUnit && unitMatchesHierarchy(gaswilUnit)) return true;

    const areas = Array.isArray(person.areas) ? person.areas : [];
    const personAreaIds = areas
      .map((area) => text((area as DataRecord)?.id, ""))
      .filter(Boolean);
    return personAreaIds.some((areaId) => filteredHierarchyAreaIds.has(areaId));
  }, [bindaFilter, filteredHierarchyAreaIds, gaswilFilter, korwilFilter, unitById, unitMatchesHierarchy]);

  const compareByHierarchy = useCallback((left: DataRecord, right: DataRecord) => {
    const leftLevel = HIERARCHY_LEVEL_ORDER.get(hierarchyLevel(left)) ?? 99;
    const rightLevel = HIERARCHY_LEVEL_ORDER.get(hierarchyLevel(right)) ?? 99;
    if (leftLevel !== rightLevel) return leftLevel - rightLevel;

    const leftBinda = scopeAreaName(ancestorUnit(left, "BINDA", unitById) ?? left);
    const rightBinda = scopeAreaName(ancestorUnit(right, "BINDA", unitById) ?? right);
    const bindaCompare = leftBinda.localeCompare(rightBinda, "id-ID");
    if (bindaCompare !== 0) return bindaCompare;

    const leftKorwil = scopeAreaName(ancestorUnit(left, "KORWIL", unitById) ?? left);
    const rightKorwil = scopeAreaName(ancestorUnit(right, "KORWIL", unitById) ?? right);
    const korwilCompare = leftKorwil.localeCompare(rightKorwil, "id-ID");
    if (korwilCompare !== 0) return korwilCompare;

    return (
      scopeAreaName(left).localeCompare(scopeAreaName(right), "id-ID") ||
      text(left.name, "").localeCompare(text(right.name, ""), "id-ID")
    );
  }, [unitById]);

  const comparePersonnelByHierarchy = useCallback((left: DataRecord, right: DataRecord) => {
    const leftUnit = unitById.get(`gaswil:${text(left.id, "")}`);
    const rightUnit = unitById.get(`gaswil:${text(right.id, "")}`);

    if (leftUnit && rightUnit) {
      const unitCompare = compareByHierarchy(leftUnit, rightUnit);
      if (unitCompare !== 0) return unitCompare;
    }

    const leftLevel = HIERARCHY_LEVEL_ORDER.get(hierarchyLevel(left)) ?? 99;
    const rightLevel = HIERARCHY_LEVEL_ORDER.get(hierarchyLevel(right)) ?? 99;
    if (leftLevel !== rightLevel) return leftLevel - rightLevel;

    const leftArea = Array.isArray(left.areas) ? text((left.areas[0] as DataRecord)?.name, "") : "";
    const rightArea = Array.isArray(right.areas) ? text((right.areas[0] as DataRecord)?.name, "") : "";
    return (
      leftArea.localeCompare(rightArea, "id-ID") || text(left.name, "").localeCompare(text(right.name, ""), "id-ID")
    );
  }, [compareByHierarchy, unitById]);

  // Filter & Sort Units
  const filteredSortedUnits = useMemo(() => {
    const query = search.trim().toLowerCase();

    const res = units.filter((unit) => {
      const uName = String(unit.name ?? "").toLowerCase();
      const uCode = String(unit.code ?? "").toLowerCase();
      const uType = String(unit.type ?? "").toLowerCase();
      const levelLabel = String(unit.levelLabel ?? "").toLowerCase();
      const scopeArea = (unit.scopeArea as DataRecord) || {};
      const scopeName = String(scopeArea.name ?? "").toLowerCase();
      const levelValue = text(unit.levelLabel, text(unit.hierarchyLevel, ""));

      // Search query
      const matchesSearch =
        !query ||
        uName.includes(query) ||
        uCode.includes(query) ||
        uType.includes(query) ||
        levelLabel.includes(query) ||
        scopeName.includes(query);
      if (!matchesSearch) return false;

      if (!unitMatchesHierarchy(unit)) return false;

      // Grade filter
      if (gradeFilter !== "ALL" && String(unit.grade ?? "") !== gradeFilter) return false;

      if (levelFilter !== "ALL" && levelValue !== levelFilter) return false;

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

      const gradeA = String(a.grade ?? "Z");
      const gradeB = String(b.grade ?? "Z");

      if (sortOrder === "HIERARCHY_ASC") return compareByHierarchy(a, b);
      if (sortOrder === "SCORE_DESC") return scoreB - scoreA;
      if (sortOrder === "SCORE_ASC") return scoreA - scoreB;
      if (sortOrder === "NAME_ASC") return nameA.localeCompare(nameB);
      if (sortOrder === "NAME_DESC") return nameB.localeCompare(nameA);
      if (sortOrder === "GRADE_ASC") return gradeA.localeCompare(gradeB);
      if (sortOrder === "GRADE_DESC") return gradeB.localeCompare(gradeA);
      return 0;
    });

    return res;
  }, [units, search, gradeFilter, levelFilter, statusFilter, sortOrder, unitMatchesHierarchy, compareByHierarchy]);

  // Filter & Sort Personnel
  const filteredSortedPersonnel = useMemo(() => {
    const query = search.trim().toLowerCase();

    const res = personnel.filter((person) => {
      const pName = String(person.name ?? "").toLowerCase();
      const pPos = String(person.position ?? "").toLowerCase();
      const unitObj = (person.unit as DataRecord) || {};
      const uName = String(unitObj.name ?? "").toLowerCase();
      const positionValue = text(person.position, "");

      const areas = Array.isArray(person.areas) ? person.areas : [];
      const areasStr = areas
        .map((area: any) => String(area?.name ?? ""))
        .join(", ")
        .toLowerCase();

      // Search query
      const matchesSearch =
        !query || pName.includes(query) || pPos.includes(query) || uName.includes(query) || areasStr.includes(query);
      if (!matchesSearch) return false;

      if (!personnelMatchesHierarchy(person)) return false;

      // Grade filter
      if (gradeFilter !== "ALL" && String(person.grade ?? "") !== gradeFilter) return false;

      if (levelFilter !== "ALL" && positionValue !== levelFilter) return false;

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

      const gradeA = String(a.grade ?? "Z");
      const gradeB = String(b.grade ?? "Z");

      if (sortOrder === "HIERARCHY_ASC") return comparePersonnelByHierarchy(a, b);
      if (sortOrder === "SCORE_DESC") return scoreB - scoreA;
      if (sortOrder === "SCORE_ASC") return scoreA - scoreB;
      if (sortOrder === "NAME_ASC") return nameA.localeCompare(nameB);
      if (sortOrder === "NAME_DESC") return nameB.localeCompare(nameA);
      if (sortOrder === "GRADE_ASC") return gradeA.localeCompare(gradeB);
      if (sortOrder === "GRADE_DESC") return gradeB.localeCompare(gradeA);
      return 0;
    });

    return res;
  }, [
    personnel,
    search,
    gradeFilter,
    levelFilter,
    statusFilter,
    sortOrder,
    personnelMatchesHierarchy,
    comparePersonnelByHierarchy,
  ]);

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

  const activeLevelList = activeTab === "personnel" ? personnelLevelList : unitLevelList;
  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (bindaFilter !== (defaultBindaFilter || "ALL") ? 1 : 0) +
    (korwilFilter !== "ALL" ? 1 : 0) +
    (gaswilFilter !== "ALL" ? 1 : 0) +
    (levelFilter !== "ALL" ? 1 : 0) +
    (gradeFilter !== "ALL" ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0);

  return (
    <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <CardHeader className="p-4 pb-4 sm:p-6">
        <div className="flex flex-col gap-2">
          <CardTitle className="font-bold text-[var(--dc-text-primary)] text-base">Hierarki KPI Berjenjang</CardTitle>
          <CardDescription className="text-[var(--dc-text-muted)] text-xs">
            Urutan tampil mengikuti hierarki: provinsi/Binda, kota/kabupaten/Korwil, kecamatan/Gaswil, lalu Jaring.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6">
        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as any);
            setLevelFilter("ALL");
            setCurrentPage(1);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-[400px] grid-cols-3 bg-muted">
            <TabsTrigger value="units" className="text-xs">
              Hierarki ({filteredSortedUnits.length})
            </TabsTrigger>
            <TabsTrigger value="personnel" className="text-xs">
              Personel ({filteredSortedPersonnel.length})
            </TabsTrigger>
            <TabsTrigger value="method" className="text-xs">
              Rumus
            </TabsTrigger>
          </TabsList>

          {/* HIERARCHY TAB CONTENT */}
          <TabsContent value="units" className="mt-4 space-y-4">
            <SearchToolbar
              search={search}
              onSearchChange={onSearchChange}
              bindaFilter={bindaFilter}
              onBindaChange={handleBindaChange}
              bindaOptions={bindaOptions}
              korwilFilter={korwilFilter}
              onKorwilChange={handleKorwilChange}
              korwilOptions={korwilOptions}
              gaswilFilter={gaswilFilter}
              onGaswilChange={handleGaswilChange}
              gaswilOptions={gaswilOptions}
              statusFilter={statusFilter}
              onStatusChange={(val) => handleFilterChange(setStatusFilter, val)}
              gradeFilter={gradeFilter}
              onGradeChange={(val) => handleFilterChange(setGradeFilter, val)}
              levelFilter={levelFilter}
              onLevelChange={(val) => handleFilterChange(setLevelFilter, val)}
              levelList={activeLevelList}
              levelLabel="Tingkat"
              sortOrder={sortOrder}
              onSortChange={(val) => handleFilterChange(setSortOrder, val)}
              pageSize={pageSize}
              onPageSizeChange={(val) => handleFilterChange(setPageSize, val)}
              activeFilterCount={activeFilterCount}
              resultCount={filteredSortedUnits.length}
              contextLabel="Hierarki"
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
                    rowOffset={(currentPage - 1) * pageSize}
                    sortField={
                      sortOrder === "HIERARCHY_ASC"
                        ? "hierarchy"
                        : sortOrder.startsWith("NAME")
                          ? "name"
                          : sortOrder.startsWith("GRADE")
                            ? "grade"
                            : "score"
                    }
                    sortDirection={sortOrder.endsWith("ASC") ? "asc" : "desc"}
                    onSortChange={(field) => {
                      if (field === "name") setSortOrder(sortOrder === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                      else if (field === "score") setSortOrder(sortOrder === "SCORE_DESC" ? "SCORE_ASC" : "SCORE_DESC");
                      else if (field === "grade") setSortOrder(sortOrder === "GRADE_ASC" ? "GRADE_DESC" : "GRADE_ASC");
                    }}
                    onSelectRow={(item) => onSelectRow("unit", item)}
                  />
                ) : (
                  <KpiRecordCardGrid
                    type="unit"
                    data={paginatedUnits}
                    onSelectRow={(item) => onSelectRow("unit", item)}
                  />
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
              bindaFilter={bindaFilter}
              onBindaChange={handleBindaChange}
              bindaOptions={bindaOptions}
              korwilFilter={korwilFilter}
              onKorwilChange={handleKorwilChange}
              korwilOptions={korwilOptions}
              gaswilFilter={gaswilFilter}
              onGaswilChange={handleGaswilChange}
              gaswilOptions={gaswilOptions}
              statusFilter={statusFilter}
              onStatusChange={(val) => handleFilterChange(setStatusFilter, val)}
              gradeFilter={gradeFilter}
              onGradeChange={(val) => handleFilterChange(setGradeFilter, val)}
              levelFilter={levelFilter}
              onLevelChange={(val) => handleFilterChange(setLevelFilter, val)}
              levelList={activeLevelList}
              levelLabel="Jabatan"
              sortOrder={sortOrder}
              onSortChange={(val) => handleFilterChange(setSortOrder, val)}
              pageSize={pageSize}
              onPageSizeChange={(val) => handleFilterChange(setPageSize, val)}
              activeFilterCount={activeFilterCount}
              resultCount={filteredSortedPersonnel.length}
              contextLabel="Personel"
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
                    rowOffset={(currentPage - 1) * pageSize}
                    sortField={
                      sortOrder === "HIERARCHY_ASC"
                        ? "hierarchy"
                        : sortOrder.startsWith("NAME")
                          ? "name"
                          : sortOrder.startsWith("GRADE")
                            ? "grade"
                            : "score"
                    }
                    sortDirection={sortOrder.endsWith("ASC") ? "asc" : "desc"}
                    onSortChange={(field) => {
                      if (field === "name") setSortOrder(sortOrder === "NAME_ASC" ? "NAME_DESC" : "NAME_ASC");
                      else if (field === "score") setSortOrder(sortOrder === "SCORE_DESC" ? "SCORE_ASC" : "SCORE_DESC");
                      else if (field === "grade") setSortOrder(sortOrder === "GRADE_ASC" ? "GRADE_DESC" : "GRADE_ASC");
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
                      {typeof def.formula === "string" && def.formula.trim() ? (
                        <div className="rounded-md border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-muted)] px-3 py-2 text-[var(--dc-text-secondary)] text-xs leading-relaxed">
                          <span className="font-semibold text-[var(--dc-text-primary)]">Rumus: </span>
                          {def.formula}
                        </div>
                      ) : null}
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
