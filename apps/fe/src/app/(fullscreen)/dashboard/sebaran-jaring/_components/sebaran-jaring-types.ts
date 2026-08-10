import { DOMAIN_VISUALS, PERSONNEL_LOCATION_VISUALS } from "@/lib/domain/visual-system";

export type AgentOperationalStatus = "VERIFIED" | "PENDING" | "REJECTED";

export type AdminLevel = "PROVINCE" | "CITY" | "DISTRICT" | "VILLAGE";

export type DisplayMode = "marker" | "cluster" | "heatmap";

export type MapStyleMode = "dark" | "street" | "satellite" | "terrain";

export type DateRangeOption = "ALL" | "24H" | "7D" | "30D";

export type CoordinateSourceMode = "domisili" | "laporan";

export type DistributionEntityMode = "jaring" | "gaswil";

export type DistributionEntityCopy = {
  mode: DistributionEntityMode;
  singular: string;
  plural: string;
  headerBadge: string;
  rightPanelTitle: string;
  searchPlaceholder: string;
  rightSearchPlaceholder: string;
  totalSummaryLabel: string;
  allDateLabel: string;
  sourceDomicileLabel: string;
  sourceReportLabel: string;
  situationLabel: string;
  displayedMetricLabel: string;
  verificationMetricLabel: string;
  activeMetricLabel: string;
  reportingMetricLabel: string;
  coordinateMetricLabel: string;
  denseAreaDetailLabel: string;
  emptyListText: string;
  detailLinkLabel: string;
  statusLabels: Record<AgentOperationalStatus, string>;
};

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
  fieldOfficerAssignmentId?: string | null;
  fieldOfficerUserProfileId?: string | null;
  fieldOfficerName: string | null;
  assignmentAreaNames?: string[];
  detailHref?: string | null;
  jaringCount?: number;
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
  VERIFIED: {
    bg: DOMAIN_VISUALS.jaring.markerColor,
    border: DOMAIN_VISUALS.jaring.markerColor,
    label: "Disetujui",
    dotClass: "bg-cyan-500",
  },
  PENDING: { bg: "#f59e0b", border: "#d97706", label: "Menunggu Tinjauan", dotClass: "bg-amber-500" },
  REJECTED: { bg: "#e11d48", border: "#be123c", label: "Ditolak", dotClass: "bg-rose-500" },
};

export const GASWIL_SIGNAL_COLORS: Record<
  AgentOperationalStatus,
  { bg: string; border: string; label: string; dotClass: string }
> = {
  VERIFIED: {
    bg: PERSONNEL_LOCATION_VISUALS.ONLINE.markerColor,
    border: PERSONNEL_LOCATION_VISUALS.ONLINE.markerColor,
    label: PERSONNEL_LOCATION_VISUALS.ONLINE.label,
    dotClass: "bg-emerald-500",
  },
  PENDING: {
    bg: PERSONNEL_LOCATION_VISUALS.OFFLINE.markerColor,
    border: PERSONNEL_LOCATION_VISUALS.OFFLINE.markerColor,
    label: PERSONNEL_LOCATION_VISUALS.OFFLINE.label,
    dotClass: "bg-slate-500",
  },
  REJECTED: { bg: "#e11d48", border: "#be123c", label: "Akun Bermasalah", dotClass: "bg-rose-500" },
};

export function statusPresentationForMode(mode: DistributionEntityMode, status: AgentOperationalStatus) {
  return mode === "gaswil"
    ? (GASWIL_SIGNAL_COLORS[status] ?? GASWIL_SIGNAL_COLORS.PENDING)
    : (STATUS_COLORS[status] ?? STATUS_COLORS.PENDING);
}

export function signalLabelForMode(mode: DistributionEntityMode, isActive: boolean) {
  if (mode === "gaswil") {
    return isActive ? PERSONNEL_LOCATION_VISUALS.ONLINE.label : PERSONNEL_LOCATION_VISUALS.OFFLINE.label;
  }
  return isActive ? "Aktif 90 Hari" : "Tidak Aktif 90 Hari";
}

export const DISTRIBUTION_ENTITY_COPY: Record<DistributionEntityMode, DistributionEntityCopy> = {
  jaring: {
    mode: "jaring",
    singular: "Jaring",
    plural: "Jaring",
    headerBadge: "PETA SEBARAN JARING",
    rightPanelTitle: "DAFTAR JARING",
    searchPlaceholder: "Cari wilayah, Jaring, atau kode...",
    rightSearchPlaceholder: "Cari Jaring atau kode...",
    totalSummaryLabel: "Total Jaring",
    allDateLabel: "Semua Aktivitas Laporan",
    sourceDomicileLabel: "Lokasi Terdaftar Jaring",
    sourceReportLabel: "Lokasi Aktual Laporan",
    situationLabel: "Situasi Jaring",
    displayedMetricLabel: "Jaring Ditampilkan",
    verificationMetricLabel: "Status Registrasi",
    activeMetricLabel: "Jaring Aktif 90 Hari",
    reportingMetricLabel: "Pernah Melapor",
    coordinateMetricLabel: "Titik Koordinat",
    denseAreaDetailLabel: "Jaring",
    emptyListText: "Tidak ada Jaring sesuai wilayah dan filter aktif.",
    detailLinkLabel: "Lihat Detail Jaring",
    statusLabels: {
      VERIFIED: "Disetujui",
      PENDING: "Menunggu Tinjauan",
      REJECTED: "Ditolak",
    },
  },
  gaswil: {
    mode: "gaswil",
    singular: "Gaswil",
    plural: "Gaswil",
    headerBadge: "PETA SEBARAN GASWIL",
    rightPanelTitle: "DAFTAR GASWIL",
    searchPlaceholder: "Cari wilayah, Gaswil, atau cakupan...",
    rightSearchPlaceholder: "Cari Gaswil atau wilayah...",
    totalSummaryLabel: "Total Gaswil",
    allDateLabel: "Semua Sinyal Lokasi",
    sourceDomicileLabel: "Lokasi Terakhir Gaswil",
    sourceReportLabel: "Lokasi Aktual Laporan",
    situationLabel: "Situasi Gaswil",
    displayedMetricLabel: "Gaswil Ditampilkan",
    verificationMetricLabel: "Lokasi Terekam",
    activeMetricLabel: "Gaswil Aktif",
    reportingMetricLabel: "Laporan Jaring Binaan",
    coordinateMetricLabel: "Titik Lokasi Terakhir",
    denseAreaDetailLabel: "Gaswil",
    emptyListText: "Tidak ada Gaswil sesuai wilayah dan filter aktif.",
    detailLinkLabel: "Lihat Detail Gaswil",
    statusLabels: {
      VERIFIED: PERSONNEL_LOCATION_VISUALS.ONLINE.label,
      PENDING: PERSONNEL_LOCATION_VISUALS.OFFLINE.label,
      REJECTED: "Akun Bermasalah",
    },
  },
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
