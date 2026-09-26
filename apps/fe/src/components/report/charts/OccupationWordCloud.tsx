"use client";

import { useEffect, useMemo, useState } from "react";

import { useWordcloud } from "@visx/wordcloud";
import { scaleSqrt } from "d3-scale";

export interface OccupationItem {
  name: string;
  value: number;
}

export interface OccupationWordCloudProps {
  data: OccupationItem[];
  width?: number;
  height?: number;
  className?: string;
}

interface CloudWord {
  text: string;
  value: number;
  size: number;
  x?: number;
  y?: number;
  rotate?: number;
  font?: string;
}

const PALETTE = [
  "#0c4a6e", // Dark navy - rank 1
  "#0369a1", // Deep blue - rank 2
  "#1e293b", // Dark slate - rank 3
  "#0284c7", // Ocean blue - rank 4
  "#334155", // Slate 700 - rank 5
  "#0ea5e9", // Sky blue - rank 6
  "#475569", // Slate 600 - rank 7
  "#0284c7", // Accent blue - rank 8
  "#64748b", // Slate 500 - rank 9
  "#94a3b8", // Slate 400 - rank 10
];

const SHORT_LABELS: Record<string, string> = {
  "Karyawan Swasta / BUMN": "Swasta / BUMN",
  "Pegawai Negeri / ASN / TNI / Polri": "PNS / TNI / Polri",
  "Pengemudi / Ojek Online / Kurir": "Pengemudi & Kurir",
  "Petani / Nelayan / Peternak": "Petani & Nelayan",
  "Profesional / Tenaga Ahli": "Tenaga Ahli",
  "Pedagang / Perniagaan": "Pedagang",
};

export function getShortOccupationLabel(name: string): string {
  if (SHORT_LABELS[name]) return SHORT_LABELS[name];
  for (const [full, short] of Object.entries(SHORT_LABELS)) {
    if (name.toLowerCase().includes(full.toLowerCase()) || full.toLowerCase().includes(name.toLowerCase())) {
      return short;
    }
  }
  return name;
}

function getFontWeight(index: number): number {
  if (index < 2) return 800; // Boldest for top 2 dominant
  if (index < 5) return 700; // Bold for next 3
  if (index < 8) return 600; // Semi-bold
  return 500; // Medium
}

export function OccupationWordCloud({ data, width = 620, height = 420, className = "" }: OccupationWordCloudProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Limit to top 10 categories, sorted descending so largest starts in center
  const top10 = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value).slice(0, 10);
  }, [data]);

  const { minVal, maxVal } = useMemo(() => {
    if (top10.length === 0) return { minVal: 1, maxVal: 100 };
    const values = top10.map((d) => d.value);
    return {
      minVal: Math.min(...values),
      maxVal: Math.max(...values),
    };
  }, [top10]);

  // scaleSqrt with minimum font around 15px (15px to 38px range for 620x420 canvas)
  const fontScale = useMemo(() => {
    return scaleSqrt().domain([minVal, maxVal]).range([15, 38]);
  }, [minVal, maxVal]);

  const words = useMemo(() => {
    return top10.map((d) => ({
      text: getShortOccupationLabel(d.name),
      value: d.value,
      size: fontScale(d.value),
    }));
  }, [top10, fontScale]);

  // @visx/wordcloud with Archimedean spiral, 2-3px padding, 100% horizontal text, deterministic seed
  const cloudWords = useWordcloud({
    words,
    width,
    height,
    fontSize: (d) => (d as CloudWord).size,
    font: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    padding: 3,
    spiral: "archimedean",
    rotate: () => 0, // Strict horizontal orientation
    random: () => 0.5, // Deterministic seed for reproducible layout
  });

  // Pre-calculated compact center-weighted elliptical fallback positions (viewBox 0 0 620 420)
  const fallbackPositions = useMemo(
    () => [
      { x: 310, y: 205 }, // Center: Top dominant (Swasta / BUMN)
      { x: 310, y: 155 }, // Above center: Wiraswasta
      { x: 310, y: 255 }, // Below center: Lainnya
      { x: 175, y: 180 }, // Mid-left: Pedagang
      { x: 445, y: 180 }, // Mid-right: Tenaga Ahli
      { x: 180, y: 235 }, // Lower-left: Ibu Rumah Tangga
      { x: 440, y: 235 }, // Lower-right: PNS / TNI / Polri
      { x: 310, y: 300 }, // Bottom-center: Pengemudi & Kurir
      { x: 310, y: 110 }, // Top-center: Petani & Nelayan
      { x: 445, y: 285 }, // Outer-right: Pelajar / Mahasiswa
    ],
    [],
  );

  return (
    <div
      className={`report-visualization relative flex flex-col rounded-lg border border-[#C9D9E1] bg-[#F8FAFC] p-3 shadow-2xs ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div className="mb-2 flex items-center justify-between border-[#E2E8F0] border-b pb-1.5">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#174D6B]" />
          <h4 className="font-bold text-[#174D6B] text-xs uppercase tracking-wider">
            Word Cloud Klasifikasi Pekerjaan (10 Kategori Utama)
          </h4>
        </div>
        <span className="text-[#64748B] text-[10px]">Ukuran teks merefleksikan dominasi jaring</span>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden">
        {mounted && cloudWords.length > 0 ? (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="auto"
            style={{ aspectRatio: `${width} / ${height}`, maxHeight: `${height}px`, display: "block" }}
            className="overflow-hidden"
          >
            <title>Word Cloud Klasifikasi Pekerjaan Jaring</title>
            <g transform={`translate(${width / 2}, ${height / 2})`}>
              {cloudWords.map((w, i) => (
                <text
                  key={`cloud-${w.text}`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`translate(${w.x}, ${w.y})`}
                  fill={PALETTE[i % PALETTE.length]}
                  style={{
                    fontFamily: w.font || "Inter, sans-serif",
                    fontSize: `${w.size}px`,
                    fontWeight: getFontWeight(i),
                    letterSpacing: "-0.01em",
                  }}
                >
                  {w.text}
                </text>
              ))}
            </g>
          </svg>
        ) : (
          /* Deterministic SSR Fallback (preserves 620x420 elliptical silhouette) */
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            height="auto"
            style={{ aspectRatio: `${width} / ${height}`, maxHeight: `${height}px`, display: "block" }}
            className="overflow-hidden"
          >
            <title>Word Cloud Klasifikasi Pekerjaan Jaring</title>
            {words.map((item, idx) => {
              const pos = fallbackPositions[idx] || { x: width / 2, y: height / 2 };
              return (
                <text
                  key={`fallback-${item.text}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={PALETTE[idx % PALETTE.length]}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: `${item.size}px`,
                    fontWeight: getFontWeight(idx),
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.text}
                </text>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
