"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface IndicatorItem {
  readonly code: string;
  readonly score: number | null;
  readonly sample: number;
}

interface DefinitionItem {
  readonly code: string;
  readonly name: string;
}

interface KpiIndicatorProps {
  readonly indicators: readonly IndicatorItem[];
  readonly definitionsByCode: Map<string, DefinitionItem>;
}

export function KpiIndicator({ indicators, definitionsByCode }: KpiIndicatorProps) {
  const getIndicatorStatus = (score: number | null) => {
    if (score === null) return { label: "Belum Cukup Bukti", variant: "outline" as const, color: "text-[var(--dc-text-muted)]" };
    if (score >= 95) return { label: "Excellent", variant: "default" as const, color: "text-emerald-500 font-semibold" };
    if (score >= 90) return { label: "Target Tercapai", variant: "default" as const, color: "text-emerald-500" };
    if (score >= 80) return { label: "Optimal", variant: "secondary" as const, color: "text-[var(--dc-primary)]" };
    if (score >= 70) return { label: "Cukup", variant: "secondary" as const, color: "text-[var(--dc-warning)]" };
    return { label: "Perlu Pembinaan", variant: "destructive" as const, color: "text-[var(--dc-danger)]" };
  };

  const getScoreLabel = (score: number | null) => {
    return score === null ? "-" : score.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  };

  return (
    <div className="flex flex-col gap-2" aria-label="Indikator Kinerja Utama">
      {indicators.map((indicator) => {
        const def = definitionsByCode.get(indicator.code) ?? { code: indicator.code, name: "Indikator Kinerja" };
        const score = indicator.score;
        const status = getIndicatorStatus(score);

        return (
          <Card
            key={indicator.code}
            className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-3 transition-all duration-150 hover:border-[var(--dc-primary-soft)] hover:bg-[color-mix(in_srgb,var(--dc-surface)_97%,white)] dark:hover:bg-[color-mix(in_srgb,var(--dc-surface)_97%,black)]"
          >
            <CardContent className="flex flex-col gap-3 p-0 md:flex-row md:items-center md:justify-between lg:gap-4">
              {/* Code & Label */}
              <div className="flex min-w-[200px] items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5 border-[var(--dc-border-strong)] bg-background">
                  {indicator.code}
                </Badge>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-[var(--dc-text-primary)] truncate">{def.name}</h4>
                  <p className="text-[10px] text-[var(--dc-text-muted)] mt-0.5">
                    Sampel: {indicator.sample.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Progress & Target Score */}
              <div className="flex flex-1 items-center gap-3 min-w-[280px]">
                <span className="font-mono text-sm font-semibold w-8 text-right">
                  {getScoreLabel(score)}
                </span>
                <div className="flex-1">
                  <Progress
                    value={score ?? 0}
                    className="h-2 bg-muted [&>div]:bg-[var(--dc-primary)]"
                    aria-label={`Skor ${indicator.code}`}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between md:justify-end md:min-w-[120px] gap-2">
                <span className={cn("text-xs", status.color)}>
                  {status.label}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
