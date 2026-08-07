export type AgentOperationalStatus = "VERIFIED" | "PENDING" | "REJECTED";

export type AdminLevel = "PROVINCE" | "CITY" | "DISTRICT" | "VILLAGE";

export type DisplayMode = "marker" | "cluster" | "heatmap";

export type MapStyleMode = "dark" | "street" | "satellite" | "terrain";

export type DateRangeOption = "ALL" | "24H" | "7D" | "30D";

export type CoordinateSourceMode = "domisili" | "laporan";

export type JaringDistributionVillage = {
  id: string;
  name: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
};

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
  villages: JaringDistributionVillage[];
};

export type JaringDistributionCity = {
  id: string;
  name: string;
  provinceId?: string;
  provinceName?: string;
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
  aliasName: string | null;
  fullName: string | null;
  whatsappNumber: string | null;
  gender: string | null;
  address: string | null;
  profilePhotoFileId: string | null;
  provinceName?: string;
  cityName?: string;
  districtId: string | null;
  districtName: string;
  villageName: string;
  fieldOfficerName: string | null;
  registeredAt: string;
  status: AgentOperationalStatus;
  isActive: boolean;
  latitude: number;
  longitude: number;
  domicileLat?: number;
  domicileLng?: number;
  domicileCoordinateSource: "REGISTERED" | "AREA_APPROXIMATION";
  hasReport: boolean;
  latestReportLat?: number | null;
  latestReportLng?: number | null;
  lastReportAt: string | null;
  lastReportDate: string;
  lastActivityTime: string;
  reportCount: number;
  baketCount: number;
};

export type DistrictFeatureProperties = {
  areaId: string;
  name: string;
  total: number;
  color: string;
};

export const SATELLITE_SOURCE_ID = "jaring-satellite-source";
export const SATELLITE_LAYER_ID = "jaring-satellite-layer";
export const SATELLITE_TILES =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const STREET_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const DEFAULT_CENTER: [number, number] = [106.8166, -6.2];

export const STATUS_COLORS: Record<
  AgentOperationalStatus,
  { bg: string; border: string; label: string; dotClass: string }
> = {
  VERIFIED: { bg: "#22c55e", border: "#16a34a", label: "Terverifikasi", dotClass: "bg-emerald-500" },
  PENDING: { bg: "#3b82f6", border: "#2563eb", label: "Belum Terverifikasi", dotClass: "bg-blue-500" },
  REJECTED: { bg: "#ef4444", border: "#dc2626", label: "Ditolak", dotClass: "bg-red-500" },
};

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

export type RecentReportItem = {
  id: string;
  jaringAlias: string;
  jaringName: string;
  title: string;
  timeAgo: string;
  urgency: "NORMAL" | "HIGH" | "URGENT";
  locationName: string;
};

export type OperationalMonitoringData = {
  recentReports: RecentReportItem[];
  newlyVerifiedJaring: Array<{ id: string; alias: string; name: string; verifiedAt: string }>;
  longInactiveJaring: Array<{ id: string; alias: string; name: string; inactiveDays: number }>;
  highActivityAreas: Array<{ districtName: string; count: number }>;
  priorityAlertsCount: number;
};

export type QuickStatsData = {
  topJaringDistricts: Array<{ name: string; count: number }>;
  topReportDistricts: Array<{ name: string; count: number }>;
  reportTrend: Array<{ day: string; count: number }>;
  newJaringTrend: Array<{ day: string; count: number }>;
  verificationRates: Array<{ districtName: string; rate: number }>;
};

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

export function cityCoordinate(city: JaringDistributionCity): [number, number] | null {
  if (city.geometry) {
    const center = geometryCenter(city.geometry);
    if (center) return center;
  }
  const validDistrictCoords = city.districts
    .map((d) => districtCoordinate(d))
    .filter((c): c is [number, number] => c !== null);
  if (validDistrictCoords.length === 0) return null;
  const sumLng = validDistrictCoords.reduce((acc, c) => acc + c[0], 0);
  const sumLat = validDistrictCoords.reduce((acc, c) => acc + c[1], 0);
  return [sumLng / validDistrictCoords.length, sumLat / validDistrictCoords.length];
}

export function villageCoordinate(
  villageName: string,
  agents: JaringDistributionEntry[],
  fallbackCoord: [number, number] | null,
  index = 0,
): [number, number] | null {
  const villageAgents = agents.filter((a) => a.villageName.toLowerCase() === villageName.toLowerCase());
  if (villageAgents.length > 0) {
    const sumLng = villageAgents.reduce((acc, a) => acc + a.longitude, 0);
    const sumLat = villageAgents.reduce((acc, a) => acc + a.latitude, 0);
    return [sumLng / villageAgents.length, sumLat / villageAgents.length];
  }
  if (!fallbackCoord) return null;
  const angle = (index * 2 * Math.PI) / 6;
  const radius = 0.008;
  return [fallbackCoord[0] + radius * Math.cos(angle), fallbackCoord[1] + radius * Math.sin(angle)];
}
