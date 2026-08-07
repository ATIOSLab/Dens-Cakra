"use client";

import Link from "next/link";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  FileText,
  PackageCheck,
  ShieldCheck,
  Siren,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { formatDashboardNumber, formatDashboardPercent } from "./executive-dashboard-format";
import type { DashboardCard } from "./executive-dashboard-types";

const ICONS = {
  totalReports: FileText,
  completeReports: FileCheck2,
  incompleteReports: AlertTriangle,
  verifiedReports: ShieldCheck,
  draftBakets: FileClock,
  validatedBakets: PackageCheck,
  informationProducts: ClipboardCheck,
  urgentReports: Siren,
  needsCompletion: AlertTriangle,
  waitingAction: CheckCircle2,
} as const;

function Comparison({ card }: { card: DashboardCard }) {
  if (!card.comparison) return <span className="text-muted-foreground">Tanpa pembanding</span>;
  if (card.comparison.percent === null) return <span className="text-muted-foreground">Belum ada pembanding</span>;
  const positive = card.comparison.delta >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Icon className="size-3.5" />
      {formatDashboardPercent(Math.abs(card.comparison.percent))} dari periode sebelumnya
    </span>
  );
}

export function ExecutiveSummaryCards({
  cards,
  buildHref,
}: {
  cards: DashboardCard[];
  buildHref: (href: string) => string;
}) {
  return (
    <section aria-labelledby="executive-summary-heading">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Ringkasan eksekutif
          </p>
          <h2 id="executive-summary-heading" className="mt-1 text-lg font-semibold">
            Ringkasan Utama
          </h2>
        </div>
        <p className="hidden text-xs text-muted-foreground sm:block">Seluruh kartu mengikuti filter aktif</p>
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,13rem),1fr))]">
        {cards.map((card) => {
          const Icon = ICONS[card.key as keyof typeof ICONS] ?? FileText;
          const toneColor =
            card.tone === "danger"
              ? "var(--dc-danger)"
              : card.tone === "warning"
                ? "var(--dc-warning)"
                : card.tone === "positive"
                  ? "var(--dc-success)"
                  : "var(--dc-primary)";
          const content = (
            <Card
              key={card.key}
              className={cn(
                "group relative h-full min-h-40 overflow-hidden border-[var(--dc-border-subtle)] bg-card transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--dc-primary)_45%,var(--dc-border-subtle))] hover:shadow-[var(--dc-shadow-soft)] motion-reduce:hover:translate-y-0",
                card.tone === "danger" && "border-[color-mix(in_srgb,var(--dc-danger)_35%,var(--dc-border-subtle))]",
                card.tone === "warning" && "border-[color-mix(in_srgb,var(--dc-warning)_35%,var(--dc-border-subtle))]",
              )}
            >
              <div
                className="absolute inset-x-0 top-0 h-0.5 opacity-80 transition-opacity group-hover:opacity-100"
                style={{ background: toneColor }}
                aria-hidden="true"
              />
              <CardContent className="flex h-full flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg border border-[var(--dc-border-subtle)] bg-muted/25">
                    <Icon
                      className={cn(
                        "size-5 text-[var(--dc-primary)]",
                        card.tone === "danger" && "text-[var(--dc-danger)]",
                        card.tone === "warning" && "text-[var(--dc-warning)]",
                        card.tone === "positive" && "text-[var(--dc-success)]",
                      )}
                    />
                  </div>
                  {card.description && (
                    <Tooltip>
                      <TooltipTrigger
                        className="rounded-md px-1 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`Definisi ${card.label}`}
                      >
                        i
                      </TooltipTrigger>
                      <TooltipContent className="max-w-72">{card.description}</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <p className="mt-4 text-xs font-medium text-muted-foreground">{card.label ?? card.key}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <strong className="font-mono text-3xl tabular-nums">{formatDashboardNumber(card.value)}</strong>
                  {card.share !== null && (
                    <span className="text-sm text-muted-foreground">{formatDashboardPercent(card.share)}</span>
                  )}
                </div>
                {card.share !== null ? (
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(0, card.share))}%`, background: toneColor }}
                    />
                  </div>
                ) : null}
                <div className="mt-auto pt-3 text-[0.68rem]">
                  <Comparison card={card} />
                </div>
                {card.drilldown && (
                  <ArrowRight className="absolute right-3 bottom-3 size-4 translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                )}
              </CardContent>
            </Card>
          );
          return card.drilldown ? (
            <Link
              key={card.key}
              href={buildHref(card.drilldown)}
              className="rounded-[var(--dc-radius-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`Buka rincian ${card.label ?? card.key}`}
            >
              {content}
            </Link>
          ) : (
            <div key={card.key}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}
