import React from "react";

import { Rect, Svg, Text } from "@react-pdf/renderer";

interface WordCloudProps {
  occupations: Array<{ name: string; count: number; percentage: number }>;
  width?: number;
  height?: number;
}

const SHORT_LABELS: Record<string, string> = {
  "Karyawan Swasta / Buruh": "Karyawan Swasta",
  "Karyawan Swasta / BUMN": "Karyawan Swasta",
  "Pedagang / Perniagaan": "Pedagang",
  "Pengemudi / Ojek Online / Kurir": "Pengemudi / Ojol",
  "Profesional / Tenaga Ahli": "Profesional",
  "Pegawai Negeri / ASN / TNI / Polri": "PNS / TNI / Polri",
  "Petani / Nelayan / Peternak": "Petani / Nelayan",
  "Pelajar / Mahasiswa": "Pelajar / Mahasiswa",
  "Ibu Rumah Tangga": "Ibu Rumah Tangga",
  Wiraswasta: "Wiraswasta",
  Lainnya: "Lainnya",
};

const getShortLabel = (fullName: string): string => {
  if (SHORT_LABELS[fullName]) return SHORT_LABELS[fullName];
  for (const [key, val] of Object.entries(SHORT_LABELS)) {
    if (fullName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(fullName.toLowerCase())) {
      return val;
    }
  }
  return fullName;
};

const PALETTE = [
  { color: "#0c4a6e", weight: "bold" },
  { color: "#0369a1", weight: "bold" },
  { color: "#1e293b", weight: "bold" },
  { color: "#0284c7", weight: "bold" },
  { color: "#0d9488", weight: "bold" },
  { color: "#334155", weight: "600" },
  { color: "#475569", weight: "600" },
  { color: "#0891b2", weight: "600" },
  { color: "#64748b", weight: "600" },
  { color: "#94a3b8", weight: "600" },
];

export function WordCloud({ occupations, width = 330, height = 224 }: WordCloudProps) {
  if (!occupations || occupations.length === 0) {
    return (
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Rect width={width} height={height} fill="#f8fafc" rx={8} stroke="#e2e8f0" strokeWidth={1} />
        <Text
          x={width / 2}
          y={height / 2}
          style={{
            fill: '#94a3b8',
            fontSize: 10,
            fontFamily: 'Helvetica',
            textAnchor: 'middle',
          }}
        >
          Data klasifikasi profesi belum tersedia
        </Text>
      </Svg>
    );
  }

  const minVal = Math.min(...occupations.map((o) => o.count));
  const maxVal = Math.max(1, ...occupations.map((o) => o.count));

  // Sort descending so the most dominant occupations are placed first in the center
  const sorted = [...occupations].sort((a, b) => b.count - a.count);

  const cx = width / 2;
  const cy = height / 2;
  const padding = 3;

  interface PlacedWord {
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
    weight: string;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  }

  const placed: PlacedWord[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    const text = getShortLabel(item.name);
    const style = PALETTE[i % PALETTE.length];

    // scaleSqrt font sizing (min 10px, max 24px for 330x224 canvas)
    const ratio = Math.sqrt((item.count - minVal) / Math.max(1, maxVal - minVal));
    const fontSize = Math.round(10 + ratio * (24 - 10));

    // Font bounding box approximation in Helvetica
    const textWidth = text.length * fontSize * 0.58;
    const textHeight = fontSize * 0.85;

    // Archimedean spiral parameters for center-weighted elliptical cloud
    const ex = 1.35; // horizontal ellipse factor
    const ey = 0.88; // vertical ellipse factor
    const spiralStep = 0.08; // angle step in radians
    const a = 1.8; // radial expansion rate

    const startPhase = (i * 2.399963) % (2 * Math.PI);

    for (let theta = 0; theta < 60 * Math.PI; theta += spiralStep) {
      const currentTheta = startPhase + theta;
      const r = a * theta;
      const x = cx + r * Math.cos(currentTheta) * ex;
      const y = cy + r * Math.sin(currentTheta) * ey;

      const box = {
        x1: x - textWidth / 2 - padding,
        x2: x + textWidth / 2 + padding,
        y1: y - textHeight / 2 - padding,
        y2: y + textHeight / 2 + padding,
      };

      // Boundary constraint with margin
      if (box.x1 < 12 || box.x2 > width - 12 || box.y1 < 12 || box.y2 > height - 12) {
        continue;
      }

      // AABB collision detection
      let collide = false;
      for (const p of placed) {
        if (box.x1 < p.x2 && box.x2 > p.x1 && box.y1 < p.y2 && box.y2 > p.y1) {
          collide = true;
          break;
        }
      }

      if (!collide) {
        placed.push({
          x,
          y,
          text,
          fontSize,
          color: style.color,
          weight: style.weight,
          ...box,
        });
        break;
      }
    }
  }

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Rect width={width} height={height} fill="#f8fafc" rx={8} stroke="#e2e8f0" strokeWidth={1} />
      {placed.map((p, idx) => (
        <Text
          key={idx}
          x={p.x}
          y={p.y}
          style={{
            fontSize: p.fontSize,
            fontFamily: p.weight === 'bold' ? 'Helvetica-Bold' : 'Helvetica',
            fill: p.color,
            textAnchor: 'middle',
          }}
        >
          {p.text}
        </Text>
      ))}
    </Svg>
  );
}
