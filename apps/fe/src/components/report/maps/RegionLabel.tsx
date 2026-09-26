export interface RegionLabelProps {
  x: number;
  y: number;
  name: string;
  count: number;
  percentage?: number | string;
  width?: number;
  height?: number;
  calloutTarget?: { x: number; y: number };
}

export function RegionLabel({
  x,
  y,
  name,
  count,
  percentage,
  width = 130,
  height = 44,
  calloutTarget,
}: RegionLabelProps) {
  const halfW = width / 2;
  const halfH = height / 2;

  let pctText: string | null = null;
  if (percentage !== undefined) {
    pctText = typeof percentage === "number" ? `${percentage.toFixed(1)}%` : String(percentage);
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Optional Callout Line if label is displaced from center */}
      {calloutTarget ? (
        <line
          x1={0}
          y1={0}
          x2={calloutTarget.x - x}
          y2={calloutTarget.y - y}
          stroke="#0284c7"
          strokeWidth="1.5"
          strokeDasharray="2,2"
        />
      ) : null}

      {/* Backdrop Card Pill for High Contrast & Print Legibility */}
      <rect
        x={-halfW}
        y={-halfH}
        width={width}
        height={height}
        rx={5}
        fill="#FFFFFF"
        fillOpacity={0.96}
        stroke="#94A3B8"
        strokeWidth="1"
        filter="drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.08))"
      />

      {/* Region Name */}
      <text
        x={0}
        y={-halfH + 13}
        textAnchor="middle"
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="8"
        fontWeight="bold"
        fill="#0F172A"
        letterSpacing="0.02em"
      >
        {name.toUpperCase()}
      </text>

      {/* Count */}
      <text
        x={0}
        y={-halfH + 26}
        textAnchor="middle"
        fontFamily="Inter, -apple-system, sans-serif"
        fontSize="11"
        fontWeight="bold"
        fill="#0284C7"
      >
        {count.toLocaleString("id-ID")}{" "}
        <tspan fontSize="8" fontWeight="normal" fill="#64748B">
          Orang
        </tspan>
      </text>

      {/* Percentage */}
      {pctText ? (
        <text
          x={0}
          y={-halfH + 37}
          textAnchor="middle"
          fontFamily="Inter, -apple-system, sans-serif"
          fontSize="7"
          fill="#475569"
        >
          Proporsi: {pctText}
        </text>
      ) : null}
    </g>
  );
}
