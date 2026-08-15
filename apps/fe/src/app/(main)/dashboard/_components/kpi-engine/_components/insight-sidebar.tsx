"use client";

import { useMemo } from "react";

import { Award, BarChart3, ShieldAlert, } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type DataRecord = Record<string, unknown>;

// Common helpers
const getGradeVariant = (val: string) => {
  if (val === "A" || val === "B") return "default";
  if (val === "D") return "destructive";
  return val === "N/A" ? "outline" : "secondary";
};

const getScoreLabel = (score: number | null) => {
  return score === null ? "-" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
};

/* 2. TOP 5 UNIT KERJA */
interface Top5UnitsProps {
  readonly topPerformers: readonly DataRecord[];
  readonly onSelectUnit: (unit: DataRecord) => void;
}

export function Top5Units({ topPerformers, onSelectUnit }: Top5UnitsProps) {
  return (
    <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-bold text-[var(--dc-text-primary)]">
          <Award className="size-4 text-emerald-500" />
          Top 5 Unit Kerja
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-1.5">
        {topPerformers.map((item, index) => {
          const score = item.score !== null && item.score !== undefined ? Number(item.score) : null;
          const grade = String(item.grade ?? "N/A");
          return (
            <button
              key={String(item.id ?? index)}
              type="button"
              onClick={() => onSelectUnit(item)}
              className="flex items-center justify-between text-left p-1.5 w-full rounded hover:bg-[var(--dc-surface-hover)] border border-transparent hover:border-[var(--dc-primary-soft)] transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] font-bold text-emerald-500 w-4">#{index + 1}</span>
                <span
                  className="text-xs text-[var(--dc-text-secondary)] truncate max-w-[170px]"
                  title={String(item.name)}
                >
                  {String(item.name)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={getGradeVariant(grade)} className="font-mono text-[9px] px-1 py-0 scale-90">
                  {grade}
                </Badge>
                <span className="font-mono text-xs font-bold text-[var(--dc-text-primary)]">
                  {getScoreLabel(score)}
                </span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* 3. UNIT PERLU PEMBINAAN */
interface LowestUnitsProps {
  readonly lowestPerformers: readonly DataRecord[];
  readonly onSelectUnit: (unit: DataRecord) => void;
}

export function LowestUnits({ lowestPerformers, onSelectUnit }: LowestUnitsProps) {
  return (
    <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-bold text-[var(--dc-text-primary)]">
          <ShieldAlert className="size-4 text-[var(--dc-danger)]" />
          Unit Perlu Pembinaan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-1.5">
        {lowestPerformers.map((item, index) => {
          const score = item.score !== null && item.score !== undefined ? Number(item.score) : null;
          const grade = String(item.grade ?? "N/A");
          return (
            <button
              key={String(item.id ?? index)}
              type="button"
              onClick={() => onSelectUnit(item)}
              className="flex items-center justify-between text-left p-1.5 w-full rounded hover:bg-[var(--dc-surface-hover)] border border-transparent hover:border-[var(--dc-primary-soft)] transition-all"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[10px] font-bold text-[var(--dc-danger)] w-4">#{index + 1}</span>
                <span
                  className="text-xs text-[var(--dc-text-secondary)] truncate max-w-[170px]"
                  title={String(item.name)}
                >
                  {String(item.name)}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={getGradeVariant(grade)} className="font-mono text-[9px] px-1 py-0 scale-90">
                  {grade}
                </Badge>
                <span className="font-mono text-xs font-bold text-[var(--dc-text-primary)]">
                  {getScoreLabel(score)}
                </span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* 4. DYNAMIC GRADE DISTRIBUTION CARD */
interface GradeDistributionProps {
  readonly units: readonly DataRecord[];
}

export function GradeDistribution({ units }: GradeDistributionProps) {
  // Aggregate grade frequencies dynamically from the units data
  const gradeCounts = useMemo(() => {
    let a = 0,
      b = 0,
      c = 0,
      d = 0;
    for (const unit of units) {
      const g = String(unit.grade ?? "");
      if (g === "A") a++;
      else if (g === "B") b++;
      else if (g === "C") c++;
      else if (g === "D") d++;
    }
    const total = a + b + c + d || 1;
    return [
      {
        grade: "A",
        count: a,
        percent: parseFloat(((a / total) * 100).toFixed(1)),
        color: "bg-emerald-500",
        textClass: "text-emerald-500",
      },
      {
        grade: "B",
        count: b,
        percent: parseFloat(((b / total) * 100).toFixed(1)),
        color: "bg-[var(--dc-primary)]",
        textClass: "text-[var(--dc-primary)]",
      },
      {
        grade: "C",
        count: c,
        percent: parseFloat(((c / total) * 100).toFixed(1)),
        color: "bg-amber-500",
        textClass: "text-amber-500",
      },
      {
        grade: "D",
        count: d,
        percent: parseFloat(((d / total) * 100).toFixed(1)),
        color: "bg-[var(--dc-danger)]",
        textClass: "text-[var(--dc-danger)]",
      },
    ];
  }, [units]);

  return (
    <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)]">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-bold text-[var(--dc-text-primary)]">
          <BarChart3 className="size-4 text-[var(--dc-primary)]" />
          Distribusi Grade Evaluasi
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-1 space-y-3">
        {gradeCounts.map((item) => (
          <div key={item.grade} className="space-y-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className={cn("font-bold font-mono", item.textClass)}>Grade {item.grade}</span>
              <span className="text-[10px] text-[var(--dc-text-muted)] font-mono">
                {item.count} Unit ({item.percent}%)
              </span>
            </div>
            <Progress value={item.percent} className="h-1.5 bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
