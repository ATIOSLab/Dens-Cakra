"use client";

import { Activity, ArrowDown, ShieldAlert, TriangleAlert } from "lucide-react";

import type { PriorityLevel } from "@/app/(main)/dashboard/laporan-jaring/_components/laporan-jaring-types";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

export const BAKET_URGENCY_LABELS: Record<PriorityLevel, string> = {
  URGENT: "Mendesak",
  HIGH: "Tinggi",
  NORMAL: "Normal",
  LOW: "Rendah",
};

type BaketSummaryCardsProps = {
  total: number;
  urgencySummary: Record<PriorityLevel, number>;
  urgencyFilter: PriorityLevel | "ALL";
  onUrgencyFilterChange: (value: PriorityLevel | "ALL") => void;
};

const urgencyCards = [
  {
    value: "URGENT" as const,
    label: BAKET_URGENCY_LABELS.URGENT,
    icon: ShieldAlert,
    styles: {
      activeCard:
        "border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 ring-2 ring-rose-500/40 shadow-sm shadow-rose-500/10",
      inactiveCard:
        "border-rose-200/80 dark:border-rose-900/30 bg-card hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50/30 dark:hover:bg-rose-950/20",
      activeIcon: "bg-rose-600 text-white shadow-md shadow-rose-500/30",
      inactiveIcon: "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400",
      countText: "text-rose-700 dark:text-rose-400",
    },
  },
  {
    value: "HIGH" as const,
    label: BAKET_URGENCY_LABELS.HIGH,
    icon: TriangleAlert,
    styles: {
      activeCard:
        "border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 ring-2 ring-amber-500/40 shadow-sm shadow-amber-500/10",
      inactiveCard:
        "border-amber-200/80 dark:border-amber-900/30 bg-card hover:border-amber-300 dark:hover:border-amber-800 hover:bg-amber-50/30 dark:hover:bg-amber-950/20",
      activeIcon: "bg-amber-600 text-white shadow-md shadow-amber-500/30",
      inactiveIcon: "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
      countText: "text-amber-700 dark:text-amber-400",
    },
  },
  {
    value: "NORMAL" as const,
    label: BAKET_URGENCY_LABELS.NORMAL,
    icon: Activity,
    styles: {
      activeCard:
        "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 ring-2 ring-emerald-500/40 shadow-sm shadow-emerald-500/10",
      inactiveCard:
        "border-emerald-200/80 dark:border-emerald-900/30 bg-card hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20",
      activeIcon: "bg-emerald-600 text-white shadow-md shadow-emerald-500/30",
      inactiveIcon: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
      countText: "text-emerald-700 dark:text-emerald-400",
    },
  },
  {
    value: "LOW" as const,
    label: BAKET_URGENCY_LABELS.LOW,
    icon: ArrowDown,
    styles: {
      activeCard: "border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 ring-2 ring-sky-500/40 shadow-sm shadow-sky-500/10",
      inactiveCard:
        "border-sky-200/80 dark:border-sky-900/30 bg-card hover:border-sky-300 dark:hover:border-sky-800 hover:bg-sky-50/30 dark:hover:bg-sky-950/20",
      activeIcon: "bg-sky-600 text-white shadow-md shadow-sky-500/30",
      inactiveIcon: "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400",
      countText: "text-sky-700 dark:text-sky-400",
    },
  },
];

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

export function BaketSummaryCards({
  total,
  urgencySummary,
  urgencyFilter,
  onUrgencyFilterChange,
}: BaketSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <div className="flex min-h-24 items-center justify-between rounded-lg border border-slate-200/80 bg-card px-3 py-2.5 shadow-xs dark:border-white/10">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
            Bahan Keterangan (Baket)
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">{total}</p>
          <p className="text-muted-foreground text-xs">Sesuai filter aktif</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
          <DOMAIN_VISUALS.baket.Icon className="size-4" />
        </div>
      </div>

      {urgencyCards.map((item) => {
        const Icon = item.icon;
        const isActive = urgencyFilter === item.value;
        const count = urgencySummary[item.value];
        const percentage = percentOf(count, total);

        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={isActive}
            aria-label={`Filter Bahan Keterangan (Baket) dengan urgensi ${item.label}`}
            onClick={() => onUrgencyFilterChange(isActive ? "ALL" : item.value)}
            className={cn(
              "flex min-h-24 cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors",
              isActive ? item.styles.activeCard : item.styles.inactiveCard,
            )}
          >
            <div className="min-w-0">
              <p
                className={cn(
                  "font-mono text-[10px] font-semibold uppercase tracking-wider",
                  isActive ? item.styles.countText : "text-muted-foreground",
                )}
              >
                {item.label}
              </p>
              <p
                className={cn(
                  "mt-1 text-2xl font-extrabold tracking-tight",
                isActive ? item.styles.countText : "text-foreground",
                )}
              >
                {count}
              </p>
              <p
                className={cn(
                  "font-mono text-[11px] font-semibold tabular-nums",
                  isActive ? item.styles.countText : "text-muted-foreground",
                )}
              >
                {formatPercent(percentage)}% dari total Baket
              </p>
            </div>
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive ? item.styles.activeIcon : item.styles.inactiveIcon,
              )}
            >
              <Icon className="size-4" />
            </div>
          </button>
        );
      })}
    </div>
  );
}
