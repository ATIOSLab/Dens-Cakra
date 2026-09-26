import type React from "react";

import type { GenderDataPoint } from "../report-data-helper";

export interface GenderPieChartProps {
  data: GenderDataPoint[];
  total?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function GenderPieChart({ data, total, width = 320, height = 140, className = "" }: GenderPieChartProps) {
  const sum = total ?? data.reduce((acc, curr) => acc + curr.count, 0);

  const cx = 65;
  const cy = 70;
  const rOut = 48;
  const rIn = 28;

  let currentAngle = -Math.PI / 2;
  const paths: React.ReactNode[] = [];

  if (sum === 0) {
    paths.push(<circle key="empty" cx={cx} cy={cy} r={rOut} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />);
  } else {
    data.forEach((slice, _idx) => {
      if (slice.count <= 0) return;
      const angle = (slice.count / sum) * 2 * Math.PI;
      const nextAngle = currentAngle + angle;

      const x1 = cx + rOut * Math.cos(currentAngle);
      const y1 = cy + rOut * Math.sin(currentAngle);
      const x2 = cx + rOut * Math.cos(nextAngle);
      const y2 = cy + rOut * Math.sin(nextAngle);

      const x3 = cx + rIn * Math.cos(nextAngle);
      const y3 = cy + rIn * Math.sin(nextAngle);
      const x4 = cx + rIn * Math.cos(currentAngle);
      const y4 = cy + rIn * Math.sin(currentAngle);

      const largeArc = angle > Math.PI ? 1 : 0;
      const d = `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x4} ${y4} Z`;

      paths.push(<path key={slice.label} d={d} fill={slice.color} stroke="#ffffff" strokeWidth="1.5" />);
      currentAngle = nextAngle;
    });
  }

  return (
    <div
      className={`report-visualization flex flex-col rounded-lg border border-[#C9D9E1] bg-[#F8FAFC] p-3 ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div className="mb-2 flex items-center justify-between border-[#E2E8F0] border-b pb-1">
        <h4 className="font-bold text-[#174D6B] text-xs uppercase tracking-wider">Komposisi Jenis Kelamin</h4>
        <span className="text-[#64748B] text-[10px]">Demografi Jaring</span>
      </div>

      <div className="flex items-center gap-3">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" style={{ maxHeight: `${height}px` }}>
          <title>Distribusi Jenis Kelamin Jaring</title>
          {paths}
          {/* Donut Hole */}
          <circle cx={cx} cy={cy} r={rIn} fill="#ffffff" />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="7"
            fontWeight="bold"
            fill="#64748B"
          >
            TOTAL
          </text>
          <text
            x={cx}
            y={cy + 8}
            textAnchor="middle"
            fontFamily="Inter, sans-serif"
            fontSize="10"
            fontWeight="bold"
            fill="#174D6B"
          >
            {sum.toLocaleString("id-ID")}
          </text>

          {/* Legend Items (SVG-based for static PDF sharpness) */}
          {data.map((item, idx) => {
            const legY = 36 + idx * 40;
            return (
              <g key={item.label} transform={`translate(135, ${legY})`}>
                <rect width="10" height="10" rx="2" fill={item.color} />
                <text x="16" y="9" fontFamily="Inter, sans-serif" fontSize="8.5" fontWeight="bold" fill="#1E293B">
                  {item.label}
                </text>
                <text x="16" y="22" fontFamily="Inter, sans-serif" fontSize="8" fill="#64748B">
                  {item.count.toLocaleString("id-ID")} Orang ({item.percentage}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
