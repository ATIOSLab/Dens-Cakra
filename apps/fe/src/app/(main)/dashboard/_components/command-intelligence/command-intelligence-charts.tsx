"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

import type { FieldIntelligenceDashboard } from "./types";

const trendConfig = {
  total: {
    label: "Total Laporan",
    color: "var(--chart-1)",
  },
  verified: {
    label: "Terverifikasi",
    color: "var(--chart-2)",
  },
  unverified: {
    label: "Belum terverifikasi",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

const pipelineConfig = {
  count: {
    label: "Jumlah",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const REPORT_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  READY_TO_SEND: "Siap Kirim",
  SENT_TO_OIM: "Terkirim OIM",
  UNDER_VERIFICATION: "Dalam Verifikasi",
  NEEDS_DEVELOPMENT: "Perlu Pendalaman",
  VERIFIED: "Terverifikasi",
  REJECTED: "Ditolak",
};

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
        <Area dataKey="verified" type="monotone" fill="transparent" stroke="var(--color-verified)" strokeWidth={2} />
        <Area
          dataKey="unverified"
          type="monotone"
          fill="transparent"
          stroke="var(--color-unverified)"
          strokeDasharray="4 4"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function ReportPipelineChart({ pipeline }: { pipeline: Record<string, number> }) {
  const data = Object.entries(REPORT_STATUS_LABELS)
    .map(([status, label]) => ({ status, label, count: pipeline[status] ?? 0 }))
    .filter((item) => item.count > 0);

  if (data.length === 0) {
    return (
      <div className="grid h-[250px] place-items-center text-muted-foreground text-sm">
        Belum ada Laporan pada periode ini.
      </div>
    );
  }

  return (
    <ChartContainer config={pipelineConfig} className="h-[250px] w-full">
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 18 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tickMargin={8} width={112} />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
