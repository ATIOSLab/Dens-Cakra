export interface MapLegendSwatch {
  color: string;
  border?: string;
  label: string;
}

export interface MapLegendProps {
  maxVal: number;
  swatches?: MapLegendSwatch[];
  className?: string;
  title?: string;
}

export function MapLegend({
  maxVal,
  swatches,
  className = "",
  title = "LEGENDA TINGKAT PERSEBARAN WILAYAH:",
}: MapLegendProps) {
  const defaultSwatches: MapLegendSwatch[] = swatches ?? [
    {
      color: "#f1f5f9",
      border: "#cbd5e1",
      label: "0 Jaring",
    },
    {
      color: "#e0f2fe",
      border: "#bae6fd",
      label: `Rendah (1–${Math.round(maxVal * 0.25)})`,
    },
    {
      color: "#7dd3fc",
      border: "#38bdf8",
      label: `Sedang (${Math.round(maxVal * 0.25) + 1}–${Math.round(maxVal * 0.5)})`,
    },
    {
      color: "#0284c7",
      border: "#0284c7",
      label: `Tinggi (${Math.round(maxVal * 0.5) + 1}–${Math.round(maxVal * 0.75)})`,
    },
    {
      color: "#0369a1",
      border: "#0369a1",
      label: `Sangat Tinggi (>${Math.round(maxVal * 0.75)})`,
    },
  ];

  return (
    <div
      className={`report-visualization flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-3.5 py-2 text-xs ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div>
        <span className="block font-bold text-[#0F172A] text-[9px] uppercase tracking-wider">{title}</span>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {defaultSwatches.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span
                className="h-3 w-3 shrink-0 rounded-xs"
                style={{
                  backgroundColor: s.color,
                  border: `0.5px solid ${s.border || "#94a3b8"}`,
                }}
              />
              <span className="text-[#334155] text-[10px]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 font-mono text-[#64748B] text-[9px]">
        <span>Sedikit</span>
        <span className="inline-flex gap-0.5">
          {defaultSwatches.map((s) => (
            <span key={s.label} className="inline-block h-2 w-2.5 rounded-xs" style={{ backgroundColor: s.color }} />
          ))}
        </span>
        <span>Banyak</span>
      </div>
    </div>
  );
}
