import React from "react";

import { type PersonnelStatus, STATUS_COLORS, STATUS_LABELS } from "./utils/mapHelpers";

export const REPORT_URGENCY_COLORS = {
  LOW: "#3b82f6",
  NORMAL: "#10b981",
  HIGH: "#f97316",
  URGENT: "#ef4444",
} as const;

export const REPORT_URGENCY_LABELS = {
  LOW: "Rendah",
  NORMAL: "Normal",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
} as const;

export function MapLegend() {
  const statuses: PersonnelStatus[] = ["ACTIVE", "SUPERVISOR", "DUTY", "EMERGENCY", "OFFLINE"];
  const urgencies = Object.entries(REPORT_URGENCY_COLORS);

  return (
    <div className="flex w-full flex-col gap-3 border border-border/80 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <LegendGroup title="Status Personel">
        {statuses.map((status) => (
          <LegendItem key={status} color={STATUS_COLORS[status]} label={STATUS_LABELS[status]} />
        ))}
      </LegendGroup>

      <div className="hidden h-6 w-px bg-border/70 sm:block" />

      <LegendGroup title="Urgensi Baket">
        {urgencies.map(([urgency, color]) => (
          <LegendItem
            key={urgency}
            color={color}
            label={REPORT_URGENCY_LABELS[urgency as keyof typeof REPORT_URGENCY_LABELS]}
          />
        ))}
      </LegendGroup>
    </div>
  );
}

function LegendGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
      <span className="shrink-0 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">{children}</div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}50`,
        }}
      />
      <span className="whitespace-nowrap text-[11px] font-medium text-foreground/90">{label}</span>
    </div>
  );
}
export default MapLegend;
