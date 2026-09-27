import React from "react";

import { Line, Rect, Svg, Text } from "@react-pdf/renderer";

export interface BarChartItem {
  label: string;
  count: number;
  percentage: number;
}

interface BarChartProps {
  items: BarChartItem[];
  barColor?: string;
  width?: number;
  height?: number;
}

export function BarChart({ items, barColor = "#0ea5e9", width = 370, height = 145 }: BarChartProps) {
  const maxVal = Math.max(1, ...items.map((i) => i.count));
  const plotX = 20;
  const plotY = 25;
  const plotWidth = width - 40;
  const plotHeight = 85;

  const numBars = items.length;
  const slotWidth = numBars > 0 ? plotWidth / numBars : plotWidth;
  const barWidth = Math.min(36, slotWidth * 0.65);

  const bars = items.map((item, i) => {
    const barH = (item.count / maxVal) * plotHeight;
    const bx = plotX + i * slotWidth + (slotWidth - barWidth) / 2;
    const by = plotY + plotHeight - barH;
    return {
      item,
      bx,
      by,
      barH,
    };
  });

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Background container */}
      <Rect width={width} height={height} fill="#f8fafc" rx={6} stroke="#e2e8f0" strokeWidth={1} />

      {/* Grid Lines */}
      <Line
        x1={plotX}
        y1={plotY + plotHeight}
        x2={plotX + plotWidth}
        y2={plotY + plotHeight}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <Line
        x1={plotX}
        y1={plotY + plotHeight / 2}
        x2={plotX + plotWidth}
        y2={plotY + plotHeight / 2}
        stroke="#e2e8f0"
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {/* Bars & Labels */}
      {bars.map(({ item, bx, by, barH }, idx) => (
        <React.Fragment key={idx}>
          <Rect x={bx} y={by} width={barWidth} height={barH} rx={3} fill={barColor} />
          <Text
            x={bx + barWidth / 2}
            y={by - 4}
            style={{
              fontFamily: 'Helvetica-Bold',
              fontSize: 7.5,
              fill: '#0f172a',
              textAnchor: 'middle',
            }}
          >
            {String(item.count)}
          </Text>
          <Text
            x={bx + barWidth / 2}
            y={plotY + plotHeight + 14}
            style={{
              fontFamily: 'Helvetica-Bold',
              fontSize: 7,
              fill: '#334155',
              textAnchor: 'middle',
            }}
          >
            {item.label}
          </Text>
          <Text
            x={bx + barWidth / 2}
            y={plotY + plotHeight + 25}
            style={{
              fontFamily: 'Helvetica',
              fontSize: 6.5,
              fill: '#64748b',
              textAnchor: 'middle',
            }}
          >
            {`${item.percentage}%`}
          </Text>
        </React.Fragment>
      ))}
    </Svg>
  );
}
