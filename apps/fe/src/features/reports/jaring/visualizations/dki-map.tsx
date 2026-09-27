import React from 'react';
import { Circle, G, Path, Polygon, Rect, Svg, Text } from '@react-pdf/renderer';
import type { JaringReportData } from '../types/jaring-report.types';
import { DKI_MAP_PATHS } from './dki-map-paths';

interface DkiMapProps {
  dkiCounts: JaringReportData['wilayah']['dkiCounts'];
  total: number;
}

export function DkiMap({ dkiCounts, total }: DkiMapProps) {
  const maxVal = Math.max(
    1,
    dkiCounts.jakartaPusat,
    dkiCounts.jakartaUtara,
    dkiCounts.jakartaBarat,
    dkiCounts.jakartaSelatan,
    dkiCounts.jakartaTimur,
    dkiCounts.kepulauanSeribu,
  );

  const getColor = (val: number): string => {
    if (val === 0) return '#f1f5f9';
    const r = val / maxVal;
    if (r < 0.25) return '#e0f2fe';
    if (r < 0.5) return '#7dd3fc';
    if (r < 0.75) return '#0284c7';
    return '#0369a1';
  };

  const getPct = (val: number): string => {
    if (total === 0) return '0.0%';
    return `${((val / total) * 100).toFixed(1)}%`;
  };

  const cPusat = getColor(dkiCounts.jakartaPusat);
  const cUtara = getColor(dkiCounts.jakartaUtara);
  const cBarat = getColor(dkiCounts.jakartaBarat);
  const cSelatan = getColor(dkiCounts.jakartaSelatan);
  const cTimur = getColor(dkiCounts.jakartaTimur);
  const cSeribu = getColor(dkiCounts.kepulauanSeribu);

  const badges = [
    {
      name: 'KOTA ADM. JAKARTA UTARA',
      count: dkiCounts.jakartaUtara,
      pct: getPct(dkiCounts.jakartaUtara),
      x: 485,
      y: 50,
      w: 145,
      h: 42,
    },
    {
      name: 'JAKARTA BARAT',
      count: dkiCounts.jakartaBarat,
      pct: getPct(dkiCounts.jakartaBarat),
      x: 310,
      y: 110,
      w: 125,
      h: 42,
    },
    {
      name: 'JAKARTA PUSAT',
      count: dkiCounts.jakartaPusat,
      pct: getPct(dkiCounts.jakartaPusat),
      x: 440,
      y: 130,
      w: 110,
      h: 42,
    },
    {
      name: 'JAKARTA SELATAN',
      count: dkiCounts.jakartaSelatan,
      pct: getPct(dkiCounts.jakartaSelatan),
      x: 375,
      y: 220,
      w: 135,
      h: 42,
    },
    {
      name: 'JAKARTA TIMUR',
      count: dkiCounts.jakartaTimur,
      pct: getPct(dkiCounts.jakartaTimur),
      x: 580,
      y: 185,
      w: 145,
      h: 42,
    },
  ];

  return (
    <Svg width={769} height={320} viewBox="0 0 769 320">
      {/* Background Canvas */}
      <Rect
        width={769}
        height={320}
        fill="#f8fafc"
        rx={8}
        stroke="#e2e8f0"
        strokeWidth={1}
      />

      {/* Mainland DKI Jakarta Polygons */}
      <G stroke="#ffffff" strokeWidth={2.5} strokeLinejoin="round">
        <Path d={DKI_MAP_PATHS.jakartaUtara} fill={cUtara} />
        <Path d={DKI_MAP_PATHS.jakartaBarat} fill={cBarat} />
        <Path d={DKI_MAP_PATHS.jakartaPusat} fill={cPusat} />
        <Path d={DKI_MAP_PATHS.jakartaSelatan} fill={cSelatan} />
        <Path d={DKI_MAP_PATHS.jakartaTimur} fill={cTimur} />
      </G>

      {/* Inset Teluk Jakarta & Kepulauan Seribu */}
      <G>
        <Rect
          x={20}
          y={16}
          width={180}
          height={288}
          rx={8}
          fill="#f0f9ff"
          fillOpacity={0.95}
          stroke="#38bdf8"
          strokeWidth={1.25}
          strokeDasharray="4,4"
        />
        <Rect x={20} y={16} width={180} height={24} rx={8} fill="#0284c7" />
        <Rect x={20} y={30} width={180} height={10} fill="#0284c7" />
        <Text
          x={110}
          y={28}
          style={{
            fill: '#ffffff',
            fontSize: 8,
            fontFamily: 'Helvetica-Bold',
            textAnchor: 'middle',
          }}
        >
          INSET: KEPULAUAN SERIBU
        </Text>

        {/* Kepulauan Seribu Islands */}
        <Path
          d={DKI_MAP_PATHS.kepulauanSeribu}
          fill={cSeribu}
          stroke="#0284c7"
          strokeWidth={1}
          strokeLinejoin="round"
        />

        {/* Inset Badge */}
        <Rect
          x={35}
          y={245}
          width={150}
          height={42}
          rx={5}
          fill="#ffffff"
          stroke="#94a3b8"
          strokeWidth={1}
        />
        <Text
          x={110}
          y={257}
          style={{
            fill: '#1e293b',
            fontSize: 7.5,
            fontFamily: 'Helvetica-Bold',
            textAnchor: 'middle',
          }}
        >
          KEPULAUAN SERIBU
        </Text>
        <Text
          x={110}
          y={269}
          style={{
            fill: '#0284c7',
            fontSize: 9.5,
            fontFamily: 'Helvetica-Bold',
            textAnchor: 'middle',
          }}
        >
          {`${dkiCounts.kepulauanSeribu.toLocaleString('id-ID')} Orang`}
        </Text>
        <Text
          x={110}
          y={280}
          style={{
            fill: '#64748b',
            fontSize: 6.5,
            fontFamily: 'Helvetica',
            textAnchor: 'middle',
          }}
        >
          {`Proporsi: ${getPct(dkiCounts.kepulauanSeribu)}`}
        </Text>
      </G>

      {/* Mainland Badges */}
      {badges.map((b) => (
        <G key={b.name}>
          <Rect
            x={b.x - b.w / 2}
            y={b.y - b.h / 2}
            width={b.w}
            height={b.h}
            rx={5}
            fill="#ffffff"
            stroke="#94a3b8"
            strokeWidth={1}
          />
          <Text
            x={b.x}
            y={b.y - b.h / 2 + 12}
            style={{
              fill: '#1e293b',
              fontSize: 7.5,
              fontFamily: 'Helvetica-Bold',
              textAnchor: 'middle',
            }}
          >
            {b.name}
          </Text>
          <Text
            x={b.x}
            y={b.y - b.h / 2 + 24}
            style={{
              fill: '#0284c7',
              fontSize: 9.5,
              fontFamily: 'Helvetica-Bold',
              textAnchor: 'middle',
            }}
          >
            {`${b.count.toLocaleString('id-ID')} Orang`}
          </Text>
          <Text
            x={b.x}
            y={b.y - b.h / 2 + 35}
            style={{
              fill: '#64748b',
              fontSize: 6.5,
              fontFamily: 'Helvetica',
              textAnchor: 'middle',
            }}
          >
            {`Proporsi: ${b.pct}`}
          </Text>
        </G>
      ))}

      {/* Arah Mata Angin (Kompas Rose) */}
      <G>
        <Circle
          cx={730}
          cy={36}
          r={16}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth={1}
        />
        <Polygon points="730,24 733.5,36 726.5,36" fill="#dc2626" />
        <Polygon points="730,48 733.5,36 726.5,36" fill="#94a3b8" />
        <Text
          x={730}
          y={20}
          style={{
            fill: '#dc2626',
            fontSize: 7.5,
            fontFamily: 'Helvetica-Bold',
            textAnchor: 'middle',
          }}
        >
          U
        </Text>
      </G>
    </Svg>
  );
}
