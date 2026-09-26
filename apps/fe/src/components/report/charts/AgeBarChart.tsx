import type { AgeDataPoint } from "../report-data-helper";

export interface AgeBarChartProps {
  data: AgeDataPoint[];
  width?: number;
  height?: number;
  barColor?: string;
  className?: string;
}

export function AgeBarChart({
  data,
  width = 360,
  height = 140,
  barColor = "#0284c7",
  className = "",
}: AgeBarChartProps) {
  const maxVal = Math.max(1, ...data.map((d) => d.count));
  const plotX = 20;
  const plotY = 22;
  const plotWidth = width - 40;
  const plotHeight = 78;

  const numBars = data.length || 1;
  const slotWidth = plotWidth / numBars;
  const barWidth = Math.min(34, slotWidth * 0.65);

  return (
    <div
      className={`report-visualization flex flex-col rounded-lg border border-[#C9D9E1] bg-[#F8FAFC] p-3 ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div className="mb-2 flex items-center justify-between border-[#E2E8F0] border-b pb-1">
        <h4 className="font-bold text-[#174D6B] text-xs uppercase tracking-wider">Distribusi Rentang Usia</h4>
        <span className="text-[#64748B] text-[10px]">Tahun Usia Jaring</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ maxHeight: `${height}px` }}>
        <title>Distribusi Rentang Usia Jaring</title>
        {/* Baseline & Grid lines */}
        <line
          x1={plotX}
          y1={plotY + plotHeight}
          x2={plotX + plotWidth}
          y2={plotY + plotHeight}
          stroke="#CBD5E1"
          strokeWidth="1"
        />
        <line
          x1={plotX}
          y1={plotY + plotHeight / 2}
          x2={plotX + plotWidth}
          y2={plotY + plotHeight / 2}
          stroke="#E2E8F0"
          strokeWidth="1"
          strokeDasharray="3,3"
        />

        {/* Bars */}
        {data.map((item, idx) => {
          const barH = (item.count / maxVal) * plotHeight;
          const bx = plotX + idx * slotWidth + (slotWidth - barWidth) / 2;
          const by = plotY + plotHeight - barH;

          return (
            <g key={item.label}>
              <rect x={bx} y={by} width={barWidth} height={barH} rx={2.5} fill={barColor} />
              {/* Value on top of bar */}
              <text
                x={bx + barWidth / 2}
                y={by - 4}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="7.5"
                fontWeight="bold"
                fill="#0F172A"
              >
                {item.count}
              </text>
              {/* Range label */}
              <text
                x={bx + barWidth / 2}
                y={plotY + plotHeight + 13}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="7"
                fontWeight="bold"
                fill="#334155"
              >
                {item.label}
              </text>
              {/* Percentage label */}
              <text
                x={bx + barWidth / 2}
                y={plotY + plotHeight + 23}
                textAnchor="middle"
                fontFamily="Inter, sans-serif"
                fontSize="6.5"
                fill="#64748B"
              >
                {item.percentage}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
