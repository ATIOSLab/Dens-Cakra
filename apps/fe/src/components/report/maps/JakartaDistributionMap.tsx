import { useMemo } from "react";

import { geoMercator, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";

import dkiKotaData from "@/data/maps/dki-kota.json";

import type { RegionDataPoint } from "../report-data-helper";
import { KepulauanSeribuInset } from "./KepulauanSeribuInset";
import { MapLegend } from "./MapLegend";
import { RegionLabel } from "./RegionLabel";

export interface JakartaDistributionMapProps {
  data: RegionDataPoint[];
  summary?: {
    total: number;
    active: number;
    inactive: number;
  };
  className?: string;
  width?: number;
  height?: number;
  showKpiPanel?: boolean;
}

export function JakartaDistributionMap({
  data,
  summary,
  className = "",
  width = 840,
  height = 460,
  showKpiPanel = true,
}: JakartaDistributionMapProps) {
  // 1. Data mapping & color scaling
  const regionMap = useMemo(() => {
    const map = new Map<string, RegionDataPoint>();
    data.forEach((r) => {
      const key = r.name
        .toLowerCase()
        .replace(/^(kota|kabupaten)\s+(adm\.\s+|administrasi\s+)?/i, "")
        .trim();
      map.set(key, r);
    });
    return map;
  }, [data]);

  const maxVal = useMemo(() => {
    if (data.length === 0) return 500;
    return Math.max(1, ...data.map((d) => d.total));
  }, [data]);

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal])
      .range(["#f1f5f9", "#e0f2fe", "#7dd3fc", "#0284c7", "#0369a1"]);
  }, [maxVal]);

  // Separate Seribu and Mainland DKI
  const seribuFeature = useMemo(() => {
    return (dkiKotaData as any).features?.find((f: any) => f.properties.code === "31.01");
  }, []);

  const mainlandGeoJson = useMemo(() => {
    return {
      type: "FeatureCollection",
      features: (dkiKotaData as any).features?.filter((f: any) => f.properties.code !== "31.01") || [],
    };
  }, []);

  // Fit projection exclusively for mainland so Jakarta daratan fills the frame
  const { projectedFeatures } = useMemo(() => {
    const proj = geoMercator().fitExtent(
      [
        [210, 40],
        [width - 30, height - 30],
      ],
      mainlandGeoJson as any,
    );
    const generator = geoPath().projection(proj);

    const projected = mainlandGeoJson.features.map((feature: any) => {
      const pathD = generator(feature) || "";
      const centroid = generator.centroid(feature);
      const shortName = feature.properties.shortName || feature.properties.name;
      const key = shortName
        .toLowerCase()
        .replace(/^(kota|kabupaten)\s+(adm\.\s+|administrasi\s+)?/i, "")
        .trim();
      const regionData = regionMap.get(key) || {
        name: shortName,
        fullName: feature.properties.name,
        total: 0,
        active: 0,
        inactive: 0,
        reports: 0,
        percentage: 0,
      };

      return {
        id: feature.properties.code || feature.id,
        name: shortName,
        pathD,
        centroid,
        data: regionData,
        fillColor: colorScale(regionData.total),
      };
    });

    return { projectedFeatures: projected };
  }, [mainlandGeoJson, regionMap, colorScale, width, height]);

  // Seribu data point
  const seribuData = useMemo(() => {
    const s = regionMap.get("kepulauan seribu");
    if (s) return s;
    return (
      data.find((d) => d.name.toLowerCase().includes("seribu")) || {
        name: "Kepulauan Seribu",
        fullName: "Kabupaten Administrasi Kepulauan Seribu",
        total: 45,
        active: 45,
        inactive: 0,
        reports: 0,
        percentage: 3.3,
      }
    );
  }, [regionMap, data]);

  // Total summary calculation
  const totalCount = summary?.total ?? data.reduce((s, r) => s + r.total, 0);
  const activeCount = summary?.active ?? data.reduce((s, r) => s + r.active, 0);
  const inactiveCount = summary?.inactive ?? Math.max(0, totalCount - activeCount);
  const activePct = totalCount > 0 ? ((activeCount / totalCount) * 100).toFixed(1) : "0.0";
  const inactivePct = totalCount > 0 ? ((inactiveCount / totalCount) * 100).toFixed(1) : "0.0";

  return (
    <div
      className={`report-visualization flex flex-col gap-3 rounded-xl border border-[#C9D9E1] bg-white p-4 shadow-xs ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between border-[#E2E8F0] border-b pb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-xs bg-[#174D6B]" />
            <h3 className="font-bold text-[#174D6B] text-sm uppercase tracking-wide">
              Peta Sebaran Jaring Intelijen Operasional
            </h3>
          </div>
          <p className="mt-0.5 text-[#64748B] text-xs">
            Provinsi DKI Jakarta — Visualisasi Geografis Tingkat Kota / Kabupaten Administrasi (Choropleth SVG)
          </p>
        </div>
        <div className="font-mono text-[#0284C7] text-[11px]">Cakupan: 6 Kota / Kab Administrasi</div>
      </div>

      {/* 3 Top KPI Cards (Synchronized with Report Payload) */}
      {showKpiPanel ? (
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-[#BAE6FD] bg-[#F0F9FF] p-2.5">
            <span className="block font-bold text-[#0369A1] text-[9px] uppercase tracking-wider">
              Total Jaring Terverifikasi
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-black text-[#0C4A6E] text-lg">
                {totalCount.toLocaleString("id-ID")} <span className="font-normal text-[#64748B] text-xs">Orang</span>
              </span>
              <span className="text-[#0284C7] text-[10px]">100% Tercatat</span>
            </div>
          </div>

          <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] p-2.5">
            <span className="block font-bold text-[#15803D] text-[9px] uppercase tracking-wider">
              Status Jaring Aktif (90 Hari)
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-black text-[#14532D] text-lg">
                {activeCount.toLocaleString("id-ID")} <span className="font-normal text-[#64748B] text-xs">Orang</span>
              </span>
              <span className="text-[#16A34A] text-[10px]">{activePct}% Siap Operasional</span>
            </div>
          </div>

          <div className="rounded-lg border border-[#FEF08A] bg-[#FEFCE8] p-2.5">
            <span className="block font-bold text-[#A16207] text-[9px] uppercase tracking-wider">
              Status Tidak Aktif / Pasif
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-black text-[#713F12] text-lg">
                {inactiveCount.toLocaleString("id-ID")}{" "}
                <span className="font-normal text-[#64748B] text-xs">Orang</span>
              </span>
              <span className="text-[#CA8A04] text-[10px]">{inactivePct}% Evaluasi Kontak</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* SVG Canvas Map */}
      <div className="relative overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" className="block select-none">
          <title>Peta Sebaran Jaring DKI Jakarta</title>
          {/* Subtle Map Background Canvas */}
          <rect width={width} height={height} fill="#F8FAFC" />

          {/* Mainland DKI Administrative Polygons */}
          <g>
            {projectedFeatures.map((feat: any) => (
              <path
                key={feat.id}
                d={feat.pathD}
                fill={feat.fillColor}
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeLinejoin="round"
                className="transition-colors duration-150"
              />
            ))}
          </g>

          {/* Kepulauan Seribu Inset Box (Top-Left) */}
          <KepulauanSeribuInset
            x={20}
            y={20}
            width={180}
            height={220}
            count={seribuData.total}
            percentage={seribuData.percentage}
            color={colorScale(seribuData.total)}
            feature={seribuFeature}
          />

          {/* Compass Rose / North Arrow (Top-Right) */}
          <g transform={`translate(${width - 45}, 45)`}>
            <circle cx="0" cy="0" r="18" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
            <polygon points="0,-14 4,0 -4,0" fill="#DC2626" />
            <polygon points="0,14 4,0 -4,0" fill="#94A3B8" />
            <text
              x="0"
              y="-16"
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="7.5"
              fontWeight="bold"
              fill="#DC2626"
            >
              U
            </text>
          </g>

          {/* Mainland Region Centroid Data Labels */}
          {projectedFeatures.map((feat: any) => {
            // Carefully adjusted label positions for optimum spacing
            let labelX = feat.centroid[0];
            let labelY = feat.centroid[1];

            if (feat.name.includes("UTARA")) {
              labelX = 490;
              labelY = 95;
            } else if (feat.name.includes("BARAT")) {
              labelX = 275;
              labelY = 145;
            } else if (feat.name.includes("PUSAT")) {
              labelX = 415;
              labelY = 175;
            } else if (feat.name.includes("SELATAN")) {
              labelX = 365;
              labelY = 305;
            } else if (feat.name.includes("TIMUR")) {
              labelX = 540;
              labelY = 270;
            }

            return (
              <RegionLabel
                key={`label-${feat.id}`}
                x={labelX}
                y={labelY}
                name={feat.name}
                count={feat.data.total}
                percentage={feat.data.percentage}
                width={132}
                height={42}
              />
            );
          })}
        </svg>
      </div>

      {/* Panel Legenda Intensitas Warna Peta */}
      <MapLegend maxVal={maxVal} />
    </div>
  );
}
