"use client";

import { useState } from "react";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import {
  dashboardStatusColor,
  dashboardStatusLabel,
  formatDashboardNumber,
  formatDashboardPercent,
} from "./executive-dashboard-format";
import type { DashboardQueryState, DistributionItem, ExecutiveDashboardData } from "./executive-dashboard-types";

const trendConfig = {
  total: { label: "Laporan Jaring", color: "var(--chart-1)" },
  verified: { label: "Laporan Jadi Baket", color: "var(--chart-2)" },
} satisfies ChartConfig;

const distributionConfig = {
  value: { label: "Jumlah", color: "var(--chart-1)" },
} satisfies ChartConfig;

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function formatBucket(value: unknown) {
  if (typeof value !== "string") return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function EmptyChart() {
  return (
    <div className="grid h-64 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Tidak ada data pada filter aktif.
    </div>
  );
}

function attachmentDistributionKey(value: string) {
  if (value === "true") return "WITH_ATTACHMENT";
  if (value === "false") return "WITHOUT_ATTACHMENT";
  return "";
}

function attachmentFilterValue(value: string) {
  if (value === "WITH_ATTACHMENT") return "true";
  if (value === "WITHOUT_ATTACHMENT") return "false";
  return "";
}

export function ReportTrendPanel({ trend }: { trend: ExecutiveDashboardData["analytics"]["trend"] }) {
  const [visibleSeries, setVisibleSeries] = useState({ total: true, verified: true });
  const series = [
    { key: "total", label: "Laporan Jaring", color: "var(--chart-1)" },
    { key: "verified", label: "Laporan Jadi Baket", color: "var(--chart-2)" },
  ] as const;

  const toggleSeries = (key: keyof typeof visibleSeries) => {
    setVisibleSeries((current) => {
      const visibleCount = Object.values(current).filter(Boolean).length;
      if (current[key] && visibleCount === 1) return current;
      return { ...current, [key]: !current[key] };
    });
  };

  return (
    <Card className="border-[var(--dc-border-subtle)] xl:col-span-2">
      <CardHeader>
        <CardTitle>Tren Laporan ke Baket</CardTitle>
        <CardDescription>
          Perbandingan Laporan Jaring dan laporan yang sudah menjadi Bahan Keterangan (Baket).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {trend.points.length === 0 ? (
          <EmptyChart />
        ) : (
          <>
            <fieldset
              className="mb-3 flex flex-wrap items-center gap-2"
              aria-label="Pilih seri grafik yang ditampilkan"
            >
              {series.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={visibleSeries[item.key]}
                  onClick={() => toggleSeries(item.key)}
                  className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--dc-border-subtle)] px-2.5 text-[0.68rem] transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=false]:opacity-45"
                  data-active={visibleSeries[item.key]}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </button>
              ))}
            </fieldset>
            <ChartContainer config={trendConfig} className="h-80 w-full" aria-label="Grafik tren Laporan ke Baket">
              <AreaChart accessibilityLayer data={trend.points} margin={{ left: 0, right: 12, top: 12 }}>
                <defs>
                  <linearGradient id="dashboard-trend-total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dashboard-trend-converted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-verified)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--color-verified)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="bucket"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={28}
                  tickFormatter={formatBucket}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={formatBucket} />} />
                {visibleSeries.total ? (
                  <Area
                    dataKey="total"
                    type="monotone"
                    fill="url(#dashboard-trend-total)"
                    stroke="var(--color-total)"
                    strokeWidth={2.5}
                  />
                ) : null}
                {visibleSeries.verified ? (
                  <Area
                    dataKey="verified"
                    type="monotone"
                    fill="url(#dashboard-trend-converted)"
                    stroke="var(--color-verified)"
                    strokeWidth={2.25}
                  />
                ) : null}
              </AreaChart>
            </ChartContainer>
            <p className="sr-only">
              Grafik berisi {trend.points.length} titik dengan granularitas {trend.granularity}.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkflowPanel({
  items,
  selectedKey,
  onSelect,
}: {
  items: DistributionItem[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return (
    <Card className="border-[var(--dc-border-subtle)]">
      <CardHeader>
        <CardTitle>Komposisi Alur Laporan</CardTitle>
        <CardDescription>Tahapan Laporan Jaring menuju Bahan Keterangan (Baket).</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.8fr)] xl:grid-cols-1">
            <div className="relative mx-auto w-full max-w-64">
              <ChartContainer
                config={distributionConfig}
                className="h-48 w-full"
                aria-label="Diagram komposisi alur kerja"
              >
                <PieChart accessibilityLayer>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                  <Pie data={items} dataKey="value" nameKey="label" innerRadius={48} outerRadius={76} paddingAngle={2}>
                    {items.map((item, index) => (
                      <Cell
                        key={item.key}
                        fill={dashboardStatusColor(item.key, PIE_COLORS[index % PIE_COLORS.length])}
                        opacity={selectedKey && selectedKey !== item.key ? 0.35 : 1}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <strong className="block font-mono text-2xl tabular-nums">{formatDashboardNumber(total)}</strong>
                  <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">Laporan Jaring</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  disabled={!onSelect || item.key === "LAPORAN_JARING"}
                  onClick={() => onSelect?.(item.key)}
                  className="flex min-h-8 w-full items-center justify-between gap-3 rounded-md px-1.5 text-left text-xs transition-colors enabled:hover:bg-muted/45 enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-ring disabled:cursor-default data-[selected=true]:bg-[var(--dc-primary-soft)]"
                  data-selected={selectedKey === item.key}
                >
                  <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: dashboardStatusColor(item.key, PIE_COLORS[index % PIE_COLORS.length]) }}
                    />
                    <span className="truncate">{dashboardStatusLabel(item.label)}</span>
                  </span>
                  <strong className="font-mono tabular-nums">
                    {formatDashboardNumber(item.value)}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({formatDashboardPercent(total === 0 ? 0 : Math.round((item.value / total) * 100))})
                    </span>
                  </strong>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CategoryPanel({
  items,
  selectedKey,
  onSelect,
}: {
  items: DistributionItem[];
  selectedKey?: string;
  onSelect?: (key: string) => void;
}) {
  return (
    <Card className="border-[var(--dc-border-subtle)] xl:col-span-3">
      <CardHeader>
        <CardTitle>Kategori Bahan Keterangan (Baket)</CardTitle>
        <CardDescription>Kategori ditetapkan dari Laporan Jaring yang sudah menjadi Baket.</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyChart />
        ) : (
          <div>
            <ChartContainer config={distributionConfig} className="h-72 w-full" aria-label="Grafik kategori Baket">
              <BarChart accessibilityLayer data={items} layout="vertical" margin={{ left: 12, right: 20 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={92}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 5, 5, 0]}>
                  {items.map((item) => (
                    <Cell
                      key={item.key}
                      fill={selectedKey === item.key ? "var(--dc-warning)" : "var(--color-value)"}
                      opacity={selectedKey && selectedKey !== item.key ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
            {onSelect ? (
              <fieldset className="mt-3 flex flex-wrap gap-2" aria-label="Filter cepat kategori Baket">
                {items.map((item) => {
                  const selectable = item.key !== "uncategorized";
                  return (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!onSelect || !selectable}
                      onClick={() => onSelect?.(item.key)}
                      aria-pressed={selectedKey === item.key}
                      className="rounded-full border border-[var(--dc-border-subtle)] px-2.5 py-1 text-[0.65rem] text-muted-foreground transition-colors enabled:hover:border-[var(--dc-primary)] enabled:hover:text-foreground enabled:focus-visible:outline-none enabled:focus-visible:ring-2 enabled:focus-visible:ring-ring disabled:cursor-default disabled:opacity-55 aria-pressed:border-[var(--dc-primary)] aria-pressed:bg-[var(--dc-primary-soft)] aria-pressed:text-foreground"
                    >
                      {item.label}
                    </button>
                  );
                })}
              </fieldset>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
