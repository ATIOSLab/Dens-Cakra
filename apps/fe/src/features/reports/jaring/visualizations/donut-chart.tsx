import React from "react";

import { Circle, Path, Rect, Svg, Text } from "@react-pdf/renderer";

export interface DonutSlice {
  label: string;
  count: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  totalValue: number;
  slices: DonutSlice[];
  centerLabel?: string;
  width?: number;
  height?: number;
}

export function DonutChart({ totalValue, slices, centerLabel = "TOTAL", width = 330, height = 135 }: DonutChartProps) {
  const cx = 70;
  const cy = 68;
  const rOut = 50;
  const rIn = 32;

  const totalCount = slices.reduce((acc, s) => acc + s.count, 0);

  type PathSlice =
    | {
        type: "path";
        d: string;
        fill: string;
      }
    | {
        type: "circle";
        fill: string;
      };

  const renderedSlices: PathSlice[] = [];
  let currentAngle = -Math.PI / 2; // start 12 o'clock

  if (totalCount > 0) {
    for (const slice of slices) {
      if (slice.count <= 0) continue;
      const angle = (slice.count / totalCount) * 2 * Math.PI;
      const nextAngle = currentAngle + angle;

      if (slice.count === totalCount) {
        renderedSlices.push({
          type: "circle",
          fill: slice.color,
        });
      } else {
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
        renderedSlices.push({
          type: "path",
          d,
          fill: slice.color,
        });
      }
      currentAngle = nextAngle;
    }
  }

  let legY = 32;
  const legendRows = slices.map((slice) => {
    const y = legY;
    legY += 34;
    return { slice, y };
  });

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect width={width} height={height} fill="#f8fafc" rx={6} stroke="#e2e8f0" strokeWidth={1} />

      {totalCount === 0 ? (
        <>
          <Circle cx={cx} cy={cy} r={rOut} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1} />
          <Circle cx={cx} cy={cy} r={rIn} fill="#ffffff" />
        </>
      ) : (
        <>
          {renderedSlices.map((item, idx) =>
            item.type === "circle" ? (
              <Circle key={`c-${idx}`} cx={cx} cy={cy} r={rOut} fill={item.fill} />
            ) : (
              <Path key={`p-${idx}`} d={item.d} fill={item.fill} stroke="#ffffff" strokeWidth={1.5} />
            ),
          )}
          <Circle cx={cx} cy={cy} r={rIn} fill="#ffffff" />
        </>
      )}

      {/* Center Labels */}
      <Text
        x={cx}
        y={cy - 7}
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 7,
          fill: '#64748b',
          textAnchor: 'middle',
        }}
      >
        {centerLabel}
      </Text>
      <Text
        x={cx}
        y={cy + 6}
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 11,
          fill: '#0f172a',
          textAnchor: 'middle',
        }}
      >
        {totalValue.toLocaleString('id-ID')}
      </Text>
      <Text
        x={cx}
        y={cy + 17}
        style={{
          fontFamily: 'Helvetica',
          fontSize: 6.5,
          fill: '#64748b',
          textAnchor: 'middle',
        }}
      >
        JARING
      </Text>

      {/* Legend Elements */}
      {legendRows.map(({ slice, y }, idx) => (
        <React.Fragment key={idx}>
          <Rect x={145} y={y} width={10} height={10} rx={2} fill={slice.color} />
          <Text
            x={162}
            y={y + 8}
            style={{
              fontFamily: 'Helvetica-Bold',
              fontSize: 8.5,
              fill: '#1e293b',
            }}
          >
            {slice.label}
          </Text>
          <Text
            x={162}
            y={y + 20}
            style={{
              fontFamily: 'Helvetica',
              fontSize: 8,
              fill: '#475569',
            }}
          >
            {`${slice.count.toLocaleString('id-ID')} Orang (${slice.percentage}%)`}
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
}
