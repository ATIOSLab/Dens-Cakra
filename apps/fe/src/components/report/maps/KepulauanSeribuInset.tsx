import { useMemo } from "react";

import { geoMercator, geoPath } from "d3-geo";

export interface KepulauanSeribuInsetProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  count: number;
  percentage?: number | string;
  color?: string;
  feature?: unknown;
}

export function KepulauanSeribuInset({
  x = 20,
  y = 20,
  width = 180,
  height = 230,
  count = 45,
  percentage = "3.3%",
  color = "#7dd3fc",
  feature,
}: KepulauanSeribuInsetProps) {
  const pctStr = typeof percentage === "number" ? `${percentage.toFixed(1)}%` : percentage;

  // Project island multi-polygons precisely inside the inset boundary
  const islandPath = useMemo(() => {
    if (!feature) return null;
    try {
      const proj = geoMercator().fitExtent(
        [
          [x + 15, y + 42],
          [x + width - 15, y + height - 60],
        ],
        feature as any,
      );
      const generator = geoPath().projection(proj);
      return generator(feature as any);
    } catch {
      return null;
    }
  }, [feature, x, y, width, height]);

  return (
    <g>
      {/* Outer Inset Container Frame */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={8}
        fill="#F0F9FF"
        fillOpacity={0.92}
        stroke="#38BDF8"
        strokeWidth="1.25"
        strokeDasharray="4,4"
      />

      {/* Header Banner */}
      <rect x={x} y={y} width={width} height={24} rx={8} fill="#0284C7" />
      {/* Fill bottom corners of header to keep box crisp */}
      <rect x={x} y={y + 14} width={width} height={10} fill="#0284C7" />
      <text
        x={x + width / 2}
        y={y + 15}
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="8.5"
        fontWeight="bold"
        fill="#FFFFFF"
        letterSpacing="0.03em"
      >
        Kepulauan Seribu - Inset
      </text>

      {/* Water backdrop note */}
      <text
        x={x + width / 2}
        y={y + 36}
        textAnchor="middle"
        fontFamily="Inter, sans-serif"
        fontSize="6.5"
        fill="#0369A1"
      >
        Laut Jawa / Teluk Jakarta
      </text>

      {/* Archipelago Boundary MultiPolygon */}
      {islandPath ? (
        <path d={islandPath} fill={color} stroke="#0284C7" strokeWidth="1" strokeLinejoin="round" />
      ) : (
        // High-precision geographic archipelago approximation if feature is omitted
        <g fill={color} stroke="#0284C7" strokeWidth="1">
          <ellipse cx={x + 70} cy={y + 60} rx={9} ry={6} />
          <ellipse cx={x + 110} cy={y + 75} rx={11} ry={7} />
          <ellipse cx={x + 85} cy={y + 105} rx={8} ry={5} />
          <ellipse cx={x + 130} cy={y + 120} rx={10} ry={7} />
          <ellipse cx={x + 95} cy={y + 145} rx={12} ry={8} />
          <ellipse cx={x + 120} cy={y + 160} rx={8} ry={6} />
        </g>
      )}

      {/* Bottom Summary Pill */}
      <g transform={`translate(${x + (width - 150) / 2}, ${y + height - 52})`}>
        <rect
          width={150}
          height={44}
          rx={6}
          fill="#FFFFFF"
          fillOpacity={0.97}
          stroke="#94A3B8"
          strokeWidth="1"
          filter="drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.08))"
        />
        <text
          x={75}
          y={13}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="7.5"
          fontWeight="bold"
          fill="#0F172A"
          letterSpacing="0.02em"
        >
          KAB. KEP. SERIBU
        </text>
        <text
          x={75}
          y={26}
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fontWeight="bold"
          fill="#0284C7"
        >
          {count.toLocaleString("id-ID")}{" "}
          <tspan fontSize="7.5" fontWeight="normal" fill="#64748B">
            Orang
          </tspan>
        </text>
        <text x={75} y={37} textAnchor="middle" fontFamily="Inter, sans-serif" fontSize="6.5" fill="#475569">
          Proporsi: {pctStr}
        </text>
      </g>
    </g>
  );
}
