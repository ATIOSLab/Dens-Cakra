export type JaringDistributionDistrict = {
  id: string;
  name: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  villageCount: number;
  fieldOfficerCount: number;
  fieldOfficerNames: string[];
  centroidLatitude: number | null;
  centroidLongitude: number | null;
  geometry: GeoJSON.Geometry | null;
};

export type JaringDistributionCity = {
  id: string;
  name: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  villageCount: number;
  geometry: GeoJSON.Geometry | null;
  jaring: JaringDistributionEntry[];
  districts: JaringDistributionDistrict[];
};

export type JaringDistributionEntry = {
  id: string;
  code: string;
  aliasName: string | null;
  fullName: string | null;
  gender: string | null;
  address: string | null;
  profilePhotoFileId: string | null;
  districtId: string | null;
  districtName: string;
  villageName: string;
  fieldOfficerName: string | null;
  registeredAt: string;
};

export type DistrictFeatureProperties = {
  areaId: string;
  name: string;
  total: number;
  color: string;
};

export const SATELLITE_SOURCE_ID = "jaring-satellite-source";
export const SATELLITE_LAYER_ID = "jaring-satellite-layer";
export const SATELLITE_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const DEFAULT_CENTER: [number, number] = [106.8166, -6.2];
export const CALLOUT_COLORS = [
  "#06b6d4",
  "#22c55e",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#84cc16",
  "#14b8a6",
  "#6366f1",
];

export function geoJsonBounds(value: GeoJSON.GeoJSON): [[number, number], [number, number]] | null {
  let minLongitude = Number.POSITIVE_INFINITY;
  let minLatitude = Number.POSITIVE_INFINITY;
  let maxLongitude = Number.NEGATIVE_INFINITY;
  let maxLatitude = Number.NEGATIVE_INFINITY;

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      if (typeof node[0] === "number" && typeof node[1] === "number") {
        minLongitude = Math.min(minLongitude, node[0]);
        minLatitude = Math.min(minLatitude, node[1]);
        maxLongitude = Math.max(maxLongitude, node[0]);
        maxLatitude = Math.max(maxLatitude, node[1]);
        return;
      }

      for (const child of node) visit(child);
      return;
    }

    if (node && typeof node === "object") {
      const record = node as Record<string, unknown>;
      if (record.coordinates) visit(record.coordinates);
      if (record.geometry) visit(record.geometry);
      if (record.features) visit(record.features);
    }
  }

  visit(value);
  if (!Number.isFinite(minLongitude)) return null;

  return [
    [minLongitude, minLatitude],
    [maxLongitude, maxLatitude],
  ];
}

export function geometryCenter(geometry: GeoJSON.Geometry | null): [number, number] | null {
  if (!geometry) return null;
  const bounds = geoJsonBounds(geometry);
  if (!bounds) return null;
  return [(bounds[0][0] + bounds[1][0]) / 2, (bounds[0][1] + bounds[1][1]) / 2];
}

export function districtCoordinate(district: JaringDistributionDistrict): [number, number] | null {
  if (district.centroidLongitude !== null && district.centroidLatitude !== null) {
    return [district.centroidLongitude, district.centroidLatitude];
  }
  return geometryCenter(district.geometry);
}
