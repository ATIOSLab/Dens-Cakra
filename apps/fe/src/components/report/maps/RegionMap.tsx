import { useMemo } from "react";

import { geoMercator, geoPath } from "d3-geo";
import { scaleLinear } from "d3-scale";

import type { DistrictReport } from "@/app/(print)/reports/jaring/_components/report-types";
import dkiKecamatanData from "@/data/maps/dki-kecamatan.json";
import dkiKelurahanData from "@/data/maps/dki-kelurahan.json";

import type { RegionDataPoint } from "../report-data-helper";
import { JakartaDistributionMap } from "./JakartaDistributionMap";
import { MapLegend } from "./MapLegend";

export interface RegionMapProps {
  level?: "province" | "city" | "district";
  cityName?: string;
  districtName?: string;
  regionData?: RegionDataPoint[];
  districtData?: DistrictReport[];
  width?: number;
  height?: number;
  className?: string;
}

export function RegionMap(props: RegionMapProps) {
  if (props.level === "province") {
    return (
      <JakartaDistributionMap
        data={props.regionData || []}
        width={props.width}
        height={props.height}
        className={props.className}
      />
    );
  }
  return <RegionMapInternal {...props} />;
}

function RegionMapInternal({
  level = "city",
  cityName,
  districtName,
  districtData = [],
  width = 650,
  height = 360,
  className = "",
}: RegionMapProps) {
  // 1. Determine active GeoJSON features based on level and filter
  const { filteredGeoJson, title, subtitle } = useMemo(() => {
    if (level === "district" && districtName) {
      const cleanDist = districtName
        .toLowerCase()
        .replace(/^kec(\.|\s+)/i, "")
        .trim();
      const features =
        (dkiKelurahanData as any).features?.filter((f: any) => {
          const dName = (f.properties.districtName || "").toLowerCase().trim();
          return dName.includes(cleanDist) || cleanDist.includes(dName);
        }) || [];

      return {
        filteredGeoJson: { type: "FeatureCollection", features },
        title: `Peta Sebaran Kelurahan — Kec. ${districtName}`,
        subtitle: `Tingkat Kelurahan (${features.length} Kelurahan)`,
      };
    }

    // Default to city level
    const cleanCity = (cityName || "Jakarta Selatan")
      .toLowerCase()
      .replace(/^(kota|kabupaten)\s+(adm\.\s+|administrasi\s+)?/i, "")
      .trim();

    const features =
      (dkiKecamatanData as any).features?.filter((f: any) => {
        const cShort = (f.properties.cityShortName || "").toLowerCase();
        const cName = (f.properties.cityName || "").toLowerCase();
        return cShort.includes(cleanCity) || cName.includes(cleanCity) || cleanCity.includes(cShort);
      }) || [];

    return {
      filteredGeoJson: { type: "FeatureCollection", features },
      title: `Peta Sebaran Wilayah — ${cityName || "Kota Administrasi"}`,
      subtitle: `Tingkat Kecamatan (${features.length} Kecamatan)`,
    };
  }, [level, cityName, districtName]);

  // 2. Data mapping for district counts
  const districtMap = useMemo(() => {
    const map = new Map<string, DistrictReport>();
    (districtData || []).forEach((d) => {
      const key = d.name
        .toLowerCase()
        .replace(/^kec(\.|\s+)/i, "")
        .trim();
      map.set(key, d);
    });
    return map;
  }, [districtData]);

  const maxVal = useMemo(() => {
    if (!districtData || districtData.length === 0) return 100;
    return Math.max(1, ...districtData.map((d) => d.total));
  }, [districtData]);

  const colorScale = useMemo(() => {
    return scaleLinear<string>()
      .domain([0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal])
      .range(["#f1f5f9", "#e0f2fe", "#7dd3fc", "#0284c7", "#0369a1"]);
  }, [maxVal]);

  // 3. Project features to SVG
  const projectedFeatures = useMemo(() => {
    if (!filteredGeoJson.features || filteredGeoJson.features.length === 0) return [];
    try {
      const proj = geoMercator().fitExtent(
        [
          [20, 12],
          [width - 20, height - 12],
        ],
        filteredGeoJson as any,
      );
      const generator = geoPath().projection(proj);

      return filteredGeoJson.features.map((feature: any) => {
        const pathD = generator(feature) || "";
        const centroid = generator.centroid(feature);
        const name = feature.properties.name || "Wilayah";
        const key = name
          .toLowerCase()
          .replace(/^kec(\.|\s+)/i, "")
          .trim();
        const dist = districtMap.get(key) || {
          region: cityName || "",
          regionFullName: "",
          name,
          total: 0,
          active: 0,
          inactive: 0,
          reports: 0,
          coaching: 0,
          activeRate: 0,
          inactiveRate: 0,
          reportsPerActive: 0,
          reportConcentration: 0,
        };

        return {
          id: feature.properties.code || feature.id,
          name,
          pathD,
          centroid,
          count: dist.total,
          fillColor: colorScale(dist.total),
        };
      });
    } catch {
      return [];
    }
  }, [filteredGeoJson, districtMap, colorScale, cityName, width, height]);

  return (
    <div
      className={`report-visualization flex flex-col gap-2 rounded-xl border border-[#C9D9E1] bg-white p-3.5 shadow-xs ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      <div className="flex items-center justify-between border-[#E2E8F0] border-b pb-1.5">
        <div>
          <h4 className="font-bold text-[#174D6B] text-xs uppercase tracking-wide">{title}</h4>
          <span className="text-[#64748B] text-[10px]">{subtitle}</span>
        </div>
        <span className="font-mono text-[#0284C7] text-[10px]">Choropleth SVG Presisi</span>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="auto" className="block select-none">
          <title>{title}</title>
          <rect width={width} height={height} fill="#F8FAFC" />

          {/* Boundaries */}
          <g>
            {projectedFeatures.map((feat: any) => (
              <path
                key={feat.id}
                d={feat.pathD}
                fill={feat.fillColor}
                stroke="#FFFFFF"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Labels */}
          {projectedFeatures.map((feat: any) => {
            if (Number.isNaN(feat.centroid[0]) || Number.isNaN(feat.centroid[1])) return null;
            return (
              <g key={`label-${feat.id}`} transform={`translate(${feat.centroid[0]}, ${feat.centroid[1]})`}>
                <rect
                  x="-25"
                  y="-9"
                  width="50"
                  height="18"
                  rx="3"
                  fill="#FFFFFF"
                  fillOpacity="0.94"
                  stroke="#CBD5E1"
                  strokeWidth="0.5"
                />
                <text
                  x="0"
                  y="-1.5"
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="5.5"
                  fontWeight="bold"
                  fill="#0F172A"
                >
                  {feat.name}
                </text>
                <text
                  x="0"
                  y="5.5"
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                  fontSize="6.5"
                  fontWeight="bold"
                  fill="#0284C7"
                >
                  {feat.count}{" "}
                  <tspan fontSize="4.5" fontWeight="normal" fill="#64748B">
                    Org
                  </tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <MapLegend maxVal={maxVal} />
    </div>
  );
}
