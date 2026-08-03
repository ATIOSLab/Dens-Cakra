import {
  type JaringAdministrativeArea,
  jaringCity,
  jaringDistrict,
  jaringVillage,
  type RegistrationJaring,
} from "@/app/(main)/dashboard/field-coordinator/_components/jaring-types";
import type { AccessContextResource } from "@/features/directives/types";
import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import {
  type JaringDistributionCity,
  type JaringDistributionEntry,
  JaringDistributionClient,
} from "./_components/sebaran-jaring-client";
import type { AdminLevel, AgentOperationalStatus } from "./_components/sebaran-jaring-types";

export const dynamic = "force-dynamic";

const BACKEND_MAX_LIMIT = 100;

type AreaHierarchyLink = {
  ancestor: JaringAdministrativeArea;
};

type BoundaryPayload = {
  areaId: string;
  geometry: GeoJSON.Geometry;
} | null;

async function fetchAllByRegistrationStatus(registrationStatus: RegistrationJaring["registrationStatus"]) {
  const items: RegistrationJaring[] = [];
  let page = 1;
  let batch: RegistrationJaring[];

  do {
    try {
      batch = await apiServerGet<RegistrationJaring[]>("/jaring", {
        registrationStatus,
        page,
        limit: BACKEND_MAX_LIMIT,
      });
      items.push(...batch);
      page += 1;
    } catch {
      break;
    }
  } while (batch && batch.length === BACKEND_MAX_LIMIT);

  return items;
}

async function resolveScopeCity(scope: AccessContextResource["authorizationContext"]["areaScopes"][number]) {
  if (scope.level === "CITY" || scope.level === "REGENCY") {
    return {
      id: scope.areaId,
      name: scope.name,
      level: scope.level,
    } as JaringAdministrativeArea;
  }

  for (const level of ["CITY", "REGENCY"] as const) {
    try {
      const links = await apiServerGet<AreaHierarchyLink[]>(`/administrative-areas/${scope.areaId}/ancestors`, {
        level,
        limit: 10,
      });
      const city = links[0]?.ancestor;
      if (city) return city;
    } catch {
      // A lower-level scope can legitimately have no ancestor at one of these levels.
    }
  }

  return null;
}

function officerName(item: RegistrationJaring) {
  const [caretaker] = item.caretakerAssignments;
  return caretaker ? (caretaker.fieldOfficerAssignment.userProfile.fullName ?? null) : null;
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return "Belum ada laporan";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Belum ada laporan";

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

function deriveOperationalStatus(item: RegistrationJaring): AgentOperationalStatus {
  if (item.registrationStatus === "APPROVED") return "VERIFIED";
  if (item.registrationStatus === "PENDING") return "PENDING";
  return "REJECTED";
}

function distributionEntry(item: RegistrationJaring, index: number, districtLat: number, districtLng: number): JaringDistributionEntry {
  const district = jaringDistrict(item);
  const village = jaringVillage(item);
  const fallbackProfilePhotoFileId = item.profilePhotoFile ? item.profilePhotoFile.id : null;
  const profilePhotoFileId = item.profilePhotoFileId ?? fallbackProfilePhotoFileId;

  // Scatter offset for map visualization
  const latOffset = ((index * 17) % 31 - 15) * 0.0035;
  const lngOffset = ((index * 23) % 37 - 18) * 0.0035;

  const rawItem = item as unknown as {
    latitude?: number;
    longitude?: number;
    _count?: { messages?: number; reportSessions?: number; coachingReports?: number };
    messages?: Array<{ latitude?: number; longitude?: number; receivedAt?: string }>;
    reportSessions?: Array<{ latitude?: number; longitude?: number; submittedAt?: string }>;
  };

  const latestMsg = rawItem.messages?.[0];
  const latestSession = rawItem.reportSessions?.[0];
  const realReportCount = (rawItem._count?.messages ?? 0) + (rawItem._count?.reportSessions ?? 0) + (rawItem._count?.coachingReports ?? 0);

  const domicileLat = rawItem.latitude ?? (districtLat + latOffset);
  const domicileLng = rawItem.longitude ?? (districtLng + lngOffset);

  const hasReport = Boolean(
    latestSession?.submittedAt ||
    latestMsg?.receivedAt ||
    realReportCount > 0
  );

  const latestReportLat = latestMsg?.latitude ? Number(latestMsg.latitude) : latestSession?.latitude ? Number(latestSession.latitude) : (hasReport ? domicileLat : null);
  const latestReportLng = latestMsg?.longitude ? Number(latestMsg.longitude) : latestSession?.longitude ? Number(latestSession.longitude) : (hasReport ? domicileLng : null);

  const status = deriveOperationalStatus(item);
  const reportCount = realReportCount;

  const latestActivityDate = latestSession?.submittedAt ?? latestMsg?.receivedAt ?? null;
  const lastReportDate = latestActivityDate ? formatRelativeDate(latestActivityDate) : "Belum ada laporan";

  return {
    id: item.id,
    code: item.code,
    aliasName: item.aliasName,
    fullName: item.fullName,
    gender: item.gender,
    address: item.address,
    profilePhotoFileId,
    provinceName: "DKI Jakarta",
    cityName: jaringCity(item)?.name ?? "Jakarta",
    districtId: district ? district.id : null,
    districtName: district ? district.name : "-",
    villageName: village ? village.name : "-",
    fieldOfficerName: officerName(item),
    registeredAt: item.registeredAt,
    status,
    latitude: domicileLat,
    longitude: domicileLng,
    domicileLat,
    domicileLng,
    hasReport,
    latestReportLat,
    latestReportLng,
    lastReportDate,
    lastActivityTime: lastReportDate,
    reportCount,
  };
}

async function getScopedRegionData(sessionRole: string) {
  const access = await apiServerGet<AccessContextResource>("/access/me").catch(() => null);
  const userAreaScopes = access?.authorizationContext?.areaScopes ?? [];
  const userRoleCode = access?.authorizationContext?.roleCode ?? sessionRole;

  const isExecutiveOrAdmin =
    userRoleCode === SYSTEM_ROLES.EXECUTIVE || userRoleCode === SYSTEM_ROLES.ADMIN_SYSTEM;

  let scopedCities: JaringAdministrativeArea[] = [];
  let allowedDistrictIds: Set<string> | null = null;
  let allowedAdminLevels: AdminLevel[] = ["PROVINCE", "CITY", "DISTRICT", "VILLAGE"];

  if (userAreaScopes.length > 0 && !isExecutiveOrAdmin) {
    const levelsInScope = new Set(userAreaScopes.map((s) => s.level));

    if (levelsInScope.has("PROVINCE")) {
      allowedAdminLevels = ["PROVINCE", "CITY", "DISTRICT", "VILLAGE"];
      const citiesByProvince = await Promise.all(
        userAreaScopes
          .filter((s) => s.level === "PROVINCE")
          .map(async (pScope) => {
            try {
              return await apiServerGet<JaringAdministrativeArea[]>(`/administrative-areas/${pScope.areaId}/children`, {
                level: "CITY",
              });
            } catch {
              return [];
            }
          }),
      );
      const flatCities = citiesByProvince.flat();
      const uniqueCityIds = new Set<string>();
      for (const city of flatCities) {
        if (!uniqueCityIds.has(city.id)) {
          uniqueCityIds.add(city.id);
          scopedCities.push(city);
        }
      }
    } else if (levelsInScope.has("CITY") || levelsInScope.has("REGENCY")) {
      allowedAdminLevels = ["CITY", "DISTRICT", "VILLAGE"];
      const cityScopes = userAreaScopes.filter((s) => s.level === "CITY" || s.level === "REGENCY");
      for (const cScope of cityScopes) {
        scopedCities.push({
          id: cScope.areaId,
          name: cScope.name,
          level: cScope.level as any,
        } as JaringAdministrativeArea);
      }
    } else if (levelsInScope.has("DISTRICT") || levelsInScope.has("VILLAGE")) {
      allowedAdminLevels = ["DISTRICT", "VILLAGE"];
      const districtScopes = userAreaScopes.filter((s) => s.level === "DISTRICT" || s.level === "VILLAGE");
      allowedDistrictIds = new Set(districtScopes.map((s) => s.areaId));

      const resolvedCities = await Promise.all(districtScopes.map(resolveScopeCity));
      const uniqueCityIds = new Set<string>();
      for (const city of resolvedCities) {
        if (city && !uniqueCityIds.has(city.id)) {
          uniqueCityIds.add(city.id);
          scopedCities.push(city);
        }
      }
    }
  }

  if (scopedCities.length === 0) {
    if (!isExecutiveOrAdmin) {
      if (userRoleCode === SYSTEM_ROLES.REGIONAL_COMMANDER || userRoleCode === SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER) {
        allowedAdminLevels = ["CITY", "DISTRICT", "VILLAGE"];
      } else if (userRoleCode === SYSTEM_ROLES.FIELD_COORDINATOR) {
        allowedAdminLevels = ["DISTRICT", "VILLAGE"];
      }
    }

    try {
      scopedCities = await apiServerGet<JaringAdministrativeArea[]>("/administrative-areas", {
        level: "CITY",
        limit: 20,
      });
    } catch {
      scopedCities = [];
    }
  }

  return { scopedCities, allowedDistrictIds, allowedAdminLevels };
}

async function buildCityDistribution(
  city: JaringAdministrativeArea,
  items: RegistrationJaring[],
  allowedDistrictIds: Set<string> | null = null,
): Promise<JaringDistributionCity> {
  const [allDistricts, cityBoundary] = await Promise.all([
    apiServerGet<JaringAdministrativeArea[]>(`/administrative-areas/${city.id}/children`, {
      level: "DISTRICT",
    }),
    apiServerGet<BoundaryPayload>(`/administrative-areas/${city.id}/boundary`, {
      simplifyMeters: 18,
    }).catch(() => null),
  ]);

  const districts = allowedDistrictIds
    ? allDistricts.filter((d) => allowedDistrictIds.has(d.id))
    : allDistricts;

  const districtRows = await Promise.all(
    districts.map(async (district) => {
      const districtItems = items.filter((item) => jaringDistrict(item)?.id === district.id);
      const verifiedDistrictItems = districtItems.filter((item) => item.registrationStatus === "APPROVED");
      const villages = new Set(
        districtItems.flatMap((item) => {
          const village = jaringVillage(item);
          return village ? [village.id] : [];
        }),
      );
      const officers = new Set(districtItems.flatMap((item) => (officerName(item) ? [officerName(item)] : [])));

      let boundary: BoundaryPayload = null;
      try {
        boundary = await apiServerGet<BoundaryPayload>(`/administrative-areas/${district.id}/boundary`, {
          simplifyMeters: 18,
        });
      } catch {
        boundary = null;
      }

      const cLat = district.centroidLatitude === null || district.centroidLatitude === undefined
        ? -6.2
        : Number(district.centroidLatitude);
      const cLng = district.centroidLongitude === null || district.centroidLongitude === undefined
        ? 106.8166
        : Number(district.centroidLongitude);

      const villageMap = new Map<string, { id: string; name: string; items: RegistrationJaring[] }>();
      for (const item of districtItems) {
        const village = jaringVillage(item);
        if (village) {
          const existing = villageMap.get(village.id);
          if (existing) {
            existing.items.push(item);
          } else {
            villageMap.set(village.id, { id: village.id, name: village.name, items: [item] });
          }
        }
      }

      const villageRows = Array.from(villageMap.values()).map((v) => ({
        id: v.id,
        name: v.name,
        total: v.items.length,
        approved: v.items.filter((item) => item.registrationStatus === "APPROVED").length,
        pending: v.items.filter((item) => item.registrationStatus === "PENDING").length,
        rejected: v.items.filter((item) => item.registrationStatus === "REJECTED").length,
      })).sort((a, b) => a.name.localeCompare(b.name));

      return {
        id: district.id,
        name: district.name,
        total: districtItems.length,
        approved: verifiedDistrictItems.length,
        pending: districtItems.filter((item) => item.registrationStatus === "PENDING").length,
        rejected: districtItems.filter((item) => item.registrationStatus === "REJECTED").length,
        villageCount: villages.size,
        fieldOfficerCount: officers.size,
        fieldOfficerNames: [...officers].filter((name): name is string => Boolean(name)).sort(),
        centroidLatitude: cLat,
        centroidLongitude: cLng,
        geometry: boundary?.geometry ?? null,
        villages: villageRows,
      };
    }),
  );

  const cityItems = items.filter((item) => jaringCity(item)?.id === city.id);
  const verifiedCityItems = cityItems.filter((item) => item.registrationStatus === "APPROVED");
  const cityVillages = new Set(
    cityItems.flatMap((item) => {
      const village = jaringVillage(item);
      return village ? [village.id] : [];
    }),
  );

  const jaringEntries = cityItems.map((item, index) => {
    const d = districtRows.find((row) => row.id === jaringDistrict(item)?.id);
    const dLat = d?.centroidLatitude ?? -6.2;
    const dLng = d?.centroidLongitude ?? 106.8166;
    return distributionEntry(item, index, dLat, dLng);
  });

  return {
    id: city.id,
    name: city.name,
    provinceId: "prov-dki",
    provinceName: "DKI Jakarta",
    total: cityItems.length,
    approved: verifiedCityItems.length,
    pending: cityItems.filter((item) => item.registrationStatus === "PENDING").length,
    rejected: cityItems.filter((item) => item.registrationStatus === "REJECTED").length,
    villageCount: cityVillages.size,
    geometry: cityBoundary?.geometry ?? null,
    jaring: jaringEntries,
    districts: districtRows,
  };
}

export default async function SebaranJaringPage() {
  const session = await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
    SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.ADMIN_SYSTEM,
  );

  const [approvedItems, pendingItems, rejectedItems, scopedData] = await Promise.all([
    fetchAllByRegistrationStatus("APPROVED"),
    fetchAllByRegistrationStatus("PENDING"),
    fetchAllByRegistrationStatus("REJECTED"),
    getScopedRegionData(session.role),
  ]);

  const allItems = [...approvedItems, ...pendingItems, ...rejectedItems];
  const { scopedCities, allowedDistrictIds, allowedAdminLevels } = scopedData;

  const citiesDistribution = await Promise.all(
    scopedCities.map((city) => buildCityDistribution(city, allItems, allowedDistrictIds)),
  );

  return <JaringDistributionClient cities={citiesDistribution} allowedAdminLevels={allowedAdminLevels} />;
}
