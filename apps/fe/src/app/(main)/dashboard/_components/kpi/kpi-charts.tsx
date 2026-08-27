"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
];

export type KpiChartItem = { key: string; label: string; value: number };

const valueConfig = { value: { label: "Jumlah", color: "var(--chart-1)" } } satisfies ChartConfig;

function EmptyChart() {
  return (
    <div className="grid h-56 place-items-center rounded-lg border border-dashed text-sm text-muted-foreground">
      Tidak ada data pada filter aktif.
    </div>
  );
}

export function DonutChart({ items, centerLabel }: { items: KpiChartItem[]; centerLabel?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <EmptyChart />;
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(150px,0.9fr)]">
      <div className="relative mx-auto w-full max-w-56">
        <ChartContainer config={valueConfig} className="h-48 w-full" aria-label="Diagram komposisi">
          <PieChart accessibilityLayer>
            <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
            <Pie data={items} dataKey="value" nameKey="label" innerRadius={48} outerRadius={76} paddingAngle={2}>
              {items.map((item, index) => (
                <Cell key={item.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <strong className="block font-mono text-2xl tabular-nums">{total.toLocaleString("id-ID")}</strong>
            {centerLabel ? (
              <span className="text-[0.62rem] uppercase tracking-wide text-muted-foreground">{centerLabel}</span>
            ) : null}
          </div>
        </div>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={item.key} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              <span className="truncate">{item.label}</span>
            </span>
            <strong className="font-mono tabular-nums">
              {item.value.toLocaleString("id-ID")}
              <span className="ml-1 font-normal text-muted-foreground">
                ({Math.round((item.value / total) * 100)}%)
              </span>
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HorizontalBar({ items, labelWidth = 150 }: { items: KpiChartItem[]; labelWidth?: number }) {
  if (items.length === 0) return <EmptyChart />;
  return (
    <ChartContainer config={valueConfig} className="h-72 w-full" aria-label="Grafik batang horizontal">
      <BarChart accessibilityLayer data={items} layout="vertical" margin={{ left: 12, right: 20 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={labelWidth}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 5, 5, 0]}>
          {items.map((item, index) => (
            <Cell key={item.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function VerticalBar({ items }: { items: KpiChartItem[] }) {
  if (items.length === 0) return <EmptyChart />;
  return (
    <ChartContainer config={valueConfig} className="h-56 w-full" aria-label="Grafik batang">
      <BarChart accessibilityLayer data={items} margin={{ top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10 }}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={48}
        />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[5, 5, 0, 0]}>
          {items.map((item, index) => (
            <Cell key={item.key} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const trendConfig = {
  total: { label: "Total Laporan", color: "var(--chart-1)" },
  toBaket: { label: "Menjadi Baket", color: "var(--chart-2)" },
} satisfies ChartConfig;

function formatBucket(value: unknown, granularity: string) {
  if (typeof value !== "string") return "";
  if (granularity === "year") return value.slice(0, 4);
  if (granularity === "month") {
    return new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(
      new Date(`${value}T00:00:00+07:00`),
    );
  }
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T00:00:00+07:00`),
  );
}

export function TrendArea({
  points,
  granularity = "day",
}: {
  points: Array<{ bucket: string; total: number; toBaket: number }>;
  granularity?: string;
}) {
  if (points.length === 0) return <EmptyChart />;
  const formatLabel = (value: unknown) => formatBucket(value, granularity);
  return (
    <ChartContainer config={trendConfig} className="h-64 w-full" aria-label="Grafik tren laporan">
      <AreaChart accessibilityLayer data={points} margin={{ left: 0, right: 12, top: 12 }}>
        <defs>
          <linearGradient id="kpi-trend-total" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="kpi-trend-baket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-toBaket)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--color-toBaket)" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="bucket" axisLine={false} tickLine={false} minTickGap={24} tickFormatter={formatLabel} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={formatLabel} />} />
        <Area
          dataKey="total"
          type="monotone"
          fill="url(#kpi-trend-total)"
          stroke="var(--color-total)"
          strokeWidth={2.5}
        />
        <Area
          dataKey="toBaket"
          type="monotone"
          fill="url(#kpi-trend-baket)"
          stroke="var(--color-toBaket)"
          strokeWidth={2.25}
        />
      </AreaChart>
    </ChartContainer>
  );
}
