import type {
  PersonnelArea,
  PersonnelListItem,
  PersonnelMapFeature,
} from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-types";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import type {
  AdminLevel,
  AgentOperationalStatus,
  JaringDistributionCity,
  JaringDistributionEntry,
} from "../../sebaran-jaring/_components/sebaran-jaring-types";

type GaswilArea = PersonnelArea | NonNullable<PersonnelMapFeature["properties"]["area"]>;

const CITY_LEVELS = new Set(["CITY", "REGENCY"]);

export type GaswilDistributionAreaOption = {
  id: string;
  code?: string | null;
  name: string;
  level: string;
  parentId?: string | null;
  parentAreaId?: string | null;
};

export type GaswilDistributionAreaCatalog = {
  provinces: GaswilDistributionAreaOption[];
  cities: GaswilDistributionAreaOption[];
};

export function allowedLevelsForRole(role: string): AdminLevel[] {
  if (role === SYSTEM_ROLES.EXECUTIVE) return ["PROVINCE", "CITY", "DISTRICT"];
  if (role === SYSTEM_ROLES.REGIONAL_COMMANDER) return ["CITY", "DISTRICT"];
  return ["DISTRICT"];
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "Belum ada sinyal";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Belum ada sinyal";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} hari lalu`;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function areaLevel(area?: Pick<GaswilArea, "level"> | null) {
  return area?.level?.toUpperCase() ?? "";
}

function areaCode(area?: { code?: string | null } | null) {
  return area?.code?.trim() ?? "";
}

function parentAreaId(area?: unknown) {
  if (!area || typeof area !== "object") return null;
  const record = area as { parentId?: string | null; parentAreaId?: string | null };
  return record.parentId ?? record.parentAreaId ?? null;
}

function isSameArea(left: GaswilArea, right: GaswilDistributionAreaOption) {
  const leftCode = areaCode(left);
  const rightCode = areaCode(right);
  return left.id === right.id || (Boolean(leftCode) && leftCode === rightCode);
}

function orderedAssignmentAreas(item: PersonnelListItem) {
  const areas = item.assignment?.areas ?? [];
  return [...areas.filter((area) => area.isPrimary), ...areas.filter((area) => !area.isPrimary)];
}

function uniqueHierarchyAreas(item: PersonnelListItem, feature?: PersonnelMapFeature) {
  const areas: GaswilArea[] = [];
  const seen = new Set<string>();

  function addArea(area?: GaswilArea | null) {
    if (!area || seen.has(area.id)) return;
    seen.add(area.id);
    areas.push(area);
  }

  for (const candidate of [...orderedAssignmentAreas(item), feature?.properties.area]) {
    if (!candidate) continue;
    for (const ancestor of candidate.ancestors ?? []) addArea(ancestor);
    addArea(candidate);
  }

  return areas;
}

export function gaswilAreaHierarchy(item: PersonnelListItem, feature?: PersonnelMapFeature) {
  const areas = uniqueHierarchyAreas(item, feature);
  const province = areas.find((area) => areaLevel(area) === "PROVINCE") ?? null;
  const city = areas.find((area) => CITY_LEVELS.has(areaLevel(area))) ?? null;
  const district = areas.find((area) => areaLevel(area) === "DISTRICT") ?? null;
  const fallback = orderedAssignmentAreas(item)[0] ?? feature?.properties.area ?? null;

  return { province, city, district, fallback };
}

function cityFromDistrict(
  district: GaswilArea | null,
  catalog?: GaswilDistributionAreaCatalog,
): GaswilDistributionAreaOption | null {
  if (!district || !catalog) return null;

  const districtCode = areaCode(district);
  return (
    catalog.cities.find((city) => {
      const cityCode = areaCode(city);
      return (
        parentAreaId(district) === city.id ||
        (Boolean(districtCode) && Boolean(cityCode) && districtCode.startsWith(`${cityCode}.`))
      );
    }) ?? null
  );
}

function provinceFromCity(
  city: GaswilArea | GaswilDistributionAreaOption | null,
  catalog?: GaswilDistributionAreaCatalog,
): GaswilDistributionAreaOption | null {
  if (!city || !catalog) return null;

  const cityCode = areaCode(city);
  return (
    catalog.provinces.find((province) => {
      const provinceCode = areaCode(province);
      return (
        parentAreaId(city) === province.id ||
        (Boolean(cityCode) && Boolean(provinceCode) && cityCode.startsWith(`${provinceCode}.`))
      );
    }) ?? null
  );
}

function catalogMatch(
  area: GaswilArea | null,
  options: GaswilDistributionAreaOption[],
): GaswilDistributionAreaOption | null {
  if (!area) return null;
  return options.find((option) => isSameArea(area, option)) ?? null;
}

export function resolveGaswilAreaHierarchy(
  item: PersonnelListItem,
  feature?: PersonnelMapFeature,
  catalog?: GaswilDistributionAreaCatalog,
) {
  const hierarchy = gaswilAreaHierarchy(item, feature);
  const district = hierarchy.district;
  const city =
    catalogMatch(hierarchy.city, catalog?.cities ?? []) ?? cityFromDistrict(district, catalog) ?? hierarchy.city;
  const province =
    catalogMatch(hierarchy.province, catalog?.provinces ?? []) ?? provinceFromCity(city, catalog) ?? hierarchy.province;

  return {
    province,
    city,
    district,
    fallback: hierarchy.fallback,
  };
}

function featureCoordinate(feature?: PersonnelMapFeature): { longitude: number; latitude: number } | null {
  const coordinates = feature?.geometry.coordinates;
  if (!coordinates) return null;

  const [longitude, latitude] = coordinates;
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  return { longitude, latitude };
}

function gaswilStatus(item: PersonnelListItem, feature?: PersonnelMapFeature): AgentOperationalStatus {
  if (item.authBanned || item.status === "SUSPENDED" || item.status === "ARCHIVED") return "REJECTED";
  if (feature?.properties.status === "LIVE") return "VERIFIED";
  return "PENDING";
}

function isGaswilActive(feature?: PersonnelMapFeature) {
  return feature?.properties.status === "LIVE";
}

function detailHref(item: PersonnelListItem, role: string) {
  if (role === SYSTEM_ROLES.EXECUTIVE) return `/dashboard/daftar-petugas-wilayah/${item.id}`;
  return item.assignment?.id
    ? `/dashboard/daftar-petugas-wilayah/${item.assignment.id}`
    : "/dashboard/daftar-petugas-wilayah";
}

export function gaswilEntry(
  item: PersonnelListItem,
  feature: PersonnelMapFeature | undefined,
  role: string,
  areaCatalog?: GaswilDistributionAreaCatalog,
): JaringDistributionEntry | null {
  const coordinate = featureCoordinate(feature);
  if (!coordinate) return null;

  const hierarchy = resolveGaswilAreaHierarchy(item, feature, areaCatalog);
  const lastSignalAt = feature?.properties.capturedAt ?? item.lastLocation?.capturedAt ?? item.lastLoginAt;

  return {
    id: item.assignment?.id ?? item.id,
    aliasName: item.assignment?.seatCode ?? null,
    fullName: item.fullName,
    whatsappNumber: item.phone,
    gender: null,
    address: null,
    profilePhotoFileId: null,
    provinceId: hierarchy.province?.id ?? null,
    provinceName: hierarchy.province?.name ?? "Cakupan hak akses",
    cityId: hierarchy.city?.id ?? null,
    cityName: hierarchy.city?.name ?? "Kota/Kabupaten belum tercatat",
    districtId: hierarchy.district?.id ?? null,
    districtName: hierarchy.district?.name ?? "Kecamatan belum tercatat",
    villageName: "-",
    fieldOfficerAssignmentId: item.assignment?.id ?? feature?.properties.assignmentId ?? null,
    fieldOfficerUserProfileId: item.id,
    fieldOfficerName: item.fullName,
    assignmentAreaNames: item.assignment?.areas.map((assignmentArea) => assignmentArea.name) ?? [],
    detailHref: detailHref(item, role),
    jaringCount: item.jaringCount,
    registeredAt: item.assignment?.validFrom ?? item.lastLoginAt ?? new Date(0).toISOString(),
    status: gaswilStatus(item, feature),
    isActive: isGaswilActive(feature),
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    domicileLat: coordinate.latitude,
    domicileLng: coordinate.longitude,
    domicileCoordinateSource: "REGISTERED",
    hasReport: Boolean(lastSignalAt),
    latestReportLat: null,
    latestReportLng: null,
    lastReportAt: lastSignalAt ?? null,
    lastReportDate: formatRelativeDate(lastSignalAt),
    lastActivityTime: formatRelativeDate(lastSignalAt),
    reportCount: item.reportCount,
    baketCount: 0,
  };
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((total, value) => total + value, 0) / values.length : null;
}

function statusCount(entries: JaringDistributionEntry[], status: AgentOperationalStatus) {
  return entries.filter((entry) => entry.status === status).length;
}

function areaNameKey(name: string) {
  return name.toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g, "-") || "belum-tercatat";
}

export function distributionFromEntries(entries: JaringDistributionEntry[]): JaringDistributionCity[] {
  const cityGroups = new Map<
    string,
    {
      id: string;
      name: string;
      provinceId: string | null;
      provinceName: string;
      entries: JaringDistributionEntry[];
    }
  >();

  for (const entry of entries) {
    const cityName = entry.cityName?.trim() || "Kota/Kabupaten belum tercatat";
    const cityId = entry.cityId?.trim() || `city-${areaNameKey(cityName)}`;
    const provinceName = entry.provinceName?.trim() || "Cakupan hak akses";
    const existing = cityGroups.get(cityId);

    if (existing) {
      existing.entries.push(entry);
    } else {
      cityGroups.set(cityId, {
        id: cityId,
        name: cityName,
        provinceId: entry.provinceId ?? null,
        provinceName,
        entries: [entry],
      });
    }
  }

  return [...cityGroups.values()]
    .map((city) => {
      const districtGroups = new Map<string, { id: string; name: string; entries: JaringDistributionEntry[] }>();
      for (const entry of city.entries) {
        const districtName = entry.districtName?.trim() || "Kecamatan belum tercatat";
        const districtId = entry.districtId?.trim() || `district-${areaNameKey(districtName)}`;
        const existing = districtGroups.get(districtId);

        if (existing) {
          existing.entries.push(entry);
        } else {
          districtGroups.set(districtId, {
            id: districtId,
            name: districtName,
            entries: [entry],
          });
        }
      }

      const districts = [...districtGroups.values()]
        .map((district) => ({
          id: district.id,
          name: district.name,
          total: district.entries.length,
          approved: statusCount(district.entries, "VERIFIED"),
          pending: statusCount(district.entries, "PENDING"),
          rejected: statusCount(district.entries, "REJECTED"),
          villageCount: 0,
          fieldOfficerCount: district.entries.length,
          fieldOfficerNames: district.entries.flatMap((entry) => (entry.fullName ? [entry.fullName] : [])),
          centroidLatitude: average(district.entries.map((entry) => entry.latitude)),
          centroidLongitude: average(district.entries.map((entry) => entry.longitude)),
          geometry: null,
          villages: [],
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "id-ID"));

      return {
        id: city.id,
        name: city.name,
        provinceId: city.provinceId ?? undefined,
        provinceName: city.provinceName,
        total: city.entries.length,
        approved: statusCount(city.entries, "VERIFIED"),
        pending: statusCount(city.entries, "PENDING"),
        rejected: statusCount(city.entries, "REJECTED"),
        villageCount: 0,
        geometry: null,
        jaring: [...city.entries].sort((left, right) =>
          (left.fullName ?? "").localeCompare(right.fullName ?? "", "id-ID"),
        ),
        districts,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}
