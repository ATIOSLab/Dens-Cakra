import React from "react";
import { STATUS_COLORS, STATUS_LABELS, type PersonnelStatus } from "./utils/mapHelpers";

export function MapLegend() {
  const statuses: PersonnelStatus[] = ["ACTIVE", "SUPERVISOR", "DUTY", "EMERGENCY", "OFFLINE"];

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-[8px] border border-border/80 bg-background/90 backdrop-blur-md px-3.5 py-2.5 shadow-md flex flex-col gap-2 pointer-events-auto">
      <span className="font-mono text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
        Status Personel
      </span>
      <div className="flex flex-col gap-1.5">
        {statuses.map((status) => (
          <div key={status} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 rounded-full shrink-0 shadow-[0_0_6px_rgba(255,255,255,0.1)]"
              style={{
                backgroundColor: STATUS_COLORS[status],
                boxShadow: `0 0 8px ${STATUS_COLORS[status]}50`
              }}
            />
            <span className="text-[11px] font-medium text-foreground/90">
              {STATUS_LABELS[status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default MapLegend;
