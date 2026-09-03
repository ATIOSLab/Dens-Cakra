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
  JaringDistributionDistrict,
  JaringDistributionEntry,
} from "../../sebaran-jaring/_components/sebaran-jaring-types";

type GaswilArea = PersonnelArea | NonNullable<PersonnelMapFeature["properties"]["area"]>;

const CITY_LEVELS = new Set(["CITY", "REGENCY"]);

export type GaswilDistributionAreaOption = {
  id: string;
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level: string;
  parentId?: string | null;
  parentAreaId?: string | null;
  centroidLatitude?: number | string | null;
  centroidLongitude?: number | string | null;
};

export type GaswilDistributionAreaCatalog = {
  provinces: GaswilDistributionAreaOption[];
  cities: GaswilDistributionAreaOption[];
  districts?: GaswilDistributionAreaOption[];
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

function areaCode(area?: { code?: string | null; officialCode?: string | null } | null) {
  return area?.officialCode?.trim() || area?.code?.trim() || "";
}

function parentAreaId(area?: unknown) {
  if (!area || typeof area !== "object") return null;
  const record = area as { parentId?: string | null; parentAreaId?: string | null };
  return record.parentId ?? record.parentAreaId ?? null;
}

function isSameArea(
  left: { id?: string; code?: string | null; officialCode?: string | null; name?: string },
  right: { id?: string; code?: string | null; officialCode?: string | null; name?: string },
) {
  if (left.id && right.id && left.id === right.id) return true;
  const leftCode = areaCode(left);
  const rightCode = areaCode(right);
  if (leftCode && rightCode && leftCode === rightCode) return true;
  if (left.name && right.name) {
    const leftName = left.name.trim().toLocaleLowerCase("id-ID");
    const rightName = right.name.trim().toLocaleLowerCase("id-ID");
    if (leftName === rightName) return true;
  }
  return false;
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
  district: GaswilArea | GaswilDistributionAreaOption | null,
  catalog?: GaswilDistributionAreaCatalog,
): GaswilDistributionAreaOption | null {
  if (!district || !catalog) return null;

  const districtCode = areaCode(district);
  const pId = parentAreaId(district);
  return (
    catalog.cities.find((city) => {
      const cityCode = areaCode(city);
      return (
        (Boolean(pId) && (pId === city.id || pId === city.parentId || pId === city.parentAreaId)) ||
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
  const pId = parentAreaId(city);
  return (
    catalog.provinces.find((province) => {
      const provinceCode = areaCode(province);
      return (
        (Boolean(pId) && (pId === province.id || pId === province.parentId || pId === province.parentAreaId)) ||
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
  const district = catalogMatch(hierarchy.district, catalog?.districts ?? []) ?? hierarchy.district;
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

export function distributionFromEntries(
  entries: JaringDistributionEntry[],
  areaCatalog?: GaswilDistributionAreaCatalog,
  explicitDistricts?: GaswilDistributionAreaOption[],
): JaringDistributionCity[] {
  const allDistricts = [...(areaCatalog?.districts ?? []), ...(explicitDistricts ?? [])];

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

  // Populate any relevant cities from areaCatalog that belong to active/relevant provinces
  if (areaCatalog?.cities && areaCatalog.cities.length > 0) {
    const relevantProvinceIds = new Set<string>();
    for (const city of cityGroups.values()) {
      if (city.provinceId) relevantProvinceIds.add(city.provinceId);
    }
    const dkiProvince = areaCatalog.provinces.find((p) => p.name.toLocaleLowerCase("id-ID").includes("dki jakarta"));
    if (dkiProvince) {
      relevantProvinceIds.add(dkiProvince.id);
    } else if (relevantProvinceIds.size === 0 && areaCatalog.provinces[0]) {
      relevantProvinceIds.add(areaCatalog.provinces[0].id);
    }

    for (const catalogCity of areaCatalog.cities) {
      const parentProv = provinceFromCity(catalogCity, areaCatalog);
      const parentProvId = parentProv?.id ?? catalogCity.parentId ?? catalogCity.parentAreaId;
      if (parentProvId && relevantProvinceIds.has(parentProvId)) {
        let matchedKey: string | null = null;
        for (const [key, group] of cityGroups.entries()) {
          if (isSameArea(group, catalogCity)) {
            matchedKey = key;
            break;
          }
        }

        const prov = parentProv ?? areaCatalog.provinces.find((p) => p.id === parentProvId);
        const provName = prov?.name ?? "Cakupan hak akses";

        if (matchedKey) {
          const group = cityGroups.get(matchedKey);
          if (group && group.id !== catalogCity.id) {
            cityGroups.delete(matchedKey);
            group.id = catalogCity.id;
            group.name = catalogCity.name;
            group.provinceId = parentProvId ?? catalogCity.parentId ?? group.provinceId;
            group.provinceName = provName;
            cityGroups.set(catalogCity.id, group);
          }
        } else {
          cityGroups.set(catalogCity.id, {
            id: catalogCity.id,
            name: catalogCity.name,
            provinceId: parentProvId ?? catalogCity.parentId ?? null,
            provinceName: provName,
            entries: [],
          });
        }
      }
    }
  }

  return [...cityGroups.values()]
    .map((city) => {
      const cityCatalogItem = areaCatalog?.cities.find((c) => isSameArea(c, city));
      const cCode = cityCatalogItem ? areaCode(cityCatalogItem) : "";

      const officialDistricts = allDistricts.filter((district) => {
        if (
          district.parentId &&
          (district.parentId === city.id || (cityCatalogItem && district.parentId === cityCatalogItem.id))
        ) {
          return true;
        }
        if (
          district.parentAreaId &&
          (district.parentAreaId === city.id || (cityCatalogItem && district.parentAreaId === cityCatalogItem.id))
        ) {
          return true;
        }
        const dCode = areaCode(district);
        if (cCode && dCode?.startsWith(`${cCode}.`)) {
          return true;
        }
        return false;
      });

      let districts: JaringDistributionDistrict[] = [];

      if (officialDistricts.length > 0) {
        const assignedEntries = new Set<string>();

        districts = officialDistricts.map((officialDistrict) => {
          const matchingEntries = city.entries.filter((entry) => {
            if (entry.districtId && entry.districtId === officialDistrict.id) return true;
            const dName = officialDistrict.name.trim().toLocaleLowerCase("id-ID");
            const entryDName = entry.districtName?.trim().toLocaleLowerCase("id-ID");
            if (entryDName && entryDName === dName) return true;
            return false;
          });

          for (const match of matchingEntries) {
            assignedEntries.add(match.id);
            match.districtId = officialDistrict.id;
            match.districtName = officialDistrict.name;
          }

          const cLat =
            officialDistrict.centroidLatitude !== null && officialDistrict.centroidLatitude !== undefined
              ? Number(officialDistrict.centroidLatitude)
              : average(matchingEntries.map((e) => e.latitude));
          const cLng =
            officialDistrict.centroidLongitude !== null && officialDistrict.centroidLongitude !== undefined
              ? Number(officialDistrict.centroidLongitude)
              : average(matchingEntries.map((e) => e.longitude));

          return {
            id: officialDistrict.id,
            name: officialDistrict.name,
            total: matchingEntries.length,
            approved: statusCount(matchingEntries, "VERIFIED"),
            pending: statusCount(matchingEntries, "PENDING"),
            rejected: statusCount(matchingEntries, "REJECTED"),
            villageCount: 0,
            fieldOfficerCount: matchingEntries.length,
            fieldOfficerNames: matchingEntries.flatMap((e) => (e.fullName ? [e.fullName] : [])),
            centroidLatitude: cLat,
            centroidLongitude: cLng,
            geometry: null,
            villages: [],
          };
        });

        const unassigned = city.entries.filter((e) => !assignedEntries.has(e.id));
        if (unassigned.length > 0) {
          const unassignedGroups = new Map<string, JaringDistributionEntry[]>();
          for (const entry of unassigned) {
            const dName = entry.districtName?.trim() || "Kecamatan belum tercatat";
            const existing = unassignedGroups.get(dName);
            if (existing) existing.push(entry);
            else unassignedGroups.set(dName, [entry]);
          }

          for (const [name, uEntries] of unassignedGroups.entries()) {
            districts.push({
              id: uEntries[0]?.districtId || `district-${areaNameKey(name)}`,
              name,
              total: uEntries.length,
              approved: statusCount(uEntries, "VERIFIED"),
              pending: statusCount(uEntries, "PENDING"),
              rejected: statusCount(uEntries, "REJECTED"),
              villageCount: 0,
              fieldOfficerCount: uEntries.length,
              fieldOfficerNames: uEntries.flatMap((e) => (e.fullName ? [e.fullName] : [])),
              centroidLatitude: average(uEntries.map((e) => e.latitude)),
              centroidLongitude: average(uEntries.map((e) => e.longitude)),
              geometry: null,
              villages: [],
            });
          }
        }

        districts.sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
      } else {
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

        districts = [...districtGroups.values()]
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
      }

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
