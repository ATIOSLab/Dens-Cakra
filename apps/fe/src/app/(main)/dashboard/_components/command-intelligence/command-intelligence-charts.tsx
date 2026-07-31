"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { FieldIntelligenceDashboard } from "./types";

const trendConfig = {
  total: {
    label: "Total Laporan",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function formatBucket(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

export function ReportTrendChart({ trend }: { trend: FieldIntelligenceDashboard["trend"] }) {
  return (
    <ChartContainer config={trendConfig} className="h-[250px] w-full">
      <AreaChart accessibilityLayer data={trend} margin={{ left: 0, right: 12, top: 12 }}>
        <defs>
          <linearGradient id="fill-total-baket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.45} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="bucket" axisLine={false} tickLine={false} tickFormatter={formatBucket} minTickGap={24} />
        <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={28} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={formatBucket} />} />
        <Area
          dataKey="total"
          type="monotone"
          fill="url(#fill-total-baket)"
          stroke="var(--color-total)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
