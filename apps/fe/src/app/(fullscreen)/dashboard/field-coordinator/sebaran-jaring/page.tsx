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

import { type JaringDistributionCity, JaringDistributionClient } from "./sebaran-jaring-client";

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
    batch = await apiServerGet<RegistrationJaring[]>("/jaring", {
      registrationStatus,
      page,
      limit: BACKEND_MAX_LIMIT,
    });
    items.push(...batch);
    page += 1;
  } while (batch.length === BACKEND_MAX_LIMIT);

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

function distributionEntry(item: RegistrationJaring) {
  const district = jaringDistrict(item);
  const village = jaringVillage(item);
  const fallbackProfilePhotoFileId = item.profilePhotoFile ? item.profilePhotoFile.id : null;
  const profilePhotoFileId = item.profilePhotoFileId ?? fallbackProfilePhotoFileId;

  return {
    id: item.id,
    code: item.code,
    aliasName: item.aliasName,
    fullName: item.fullName,
    gender: item.gender,
    address: item.address,
    profilePhotoFileId,
    districtId: district ? district.id : null,
    districtName: district ? district.name : "-",
    villageName: village ? village.name : "-",
    fieldOfficerName: officerName(item),
    registeredAt: item.registeredAt,
  };
}

async function buildCityDistribution(
  city: JaringAdministrativeArea,
  items: RegistrationJaring[],
): Promise<JaringDistributionCity> {
  const [districts, cityBoundary] = await Promise.all([
    apiServerGet<JaringAdministrativeArea[]>(`/administrative-areas/${city.id}/children`, {
      level: "DISTRICT",
    }),
    apiServerGet<BoundaryPayload>(`/administrative-areas/${city.id}/boundary`, {
      simplifyMeters: 18,
    }).catch(() => null),
  ]);

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

      return {
        id: district.id,
        name: district.name,
        total: verifiedDistrictItems.length,
        approved: verifiedDistrictItems.length,
        pending: districtItems.filter((item) => item.registrationStatus === "PENDING").length,
        rejected: districtItems.filter((item) => item.registrationStatus === "REJECTED").length,
        villageCount: villages.size,
        fieldOfficerCount: officers.size,
        fieldOfficerNames: [...officers].filter((name): name is string => Boolean(name)).sort(),
        centroidLatitude:
          district.centroidLatitude === null || district.centroidLatitude === undefined
            ? null
            : Number(district.centroidLatitude),
        centroidLongitude:
          district.centroidLongitude === null || district.centroidLongitude === undefined
            ? null
            : Number(district.centroidLongitude),
        geometry: boundary?.geometry ?? null,
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

  return {
    id: city.id,
    name: city.name,
    total: verifiedCityItems.length,
    approved: verifiedCityItems.length,
    pending: cityItems.filter((item) => item.registrationStatus === "PENDING").length,
    rejected: cityItems.filter((item) => item.registrationStatus === "REJECTED").length,
    villageCount: cityVillages.size,
    geometry: cityBoundary?.geometry ?? null,
    jaring: verifiedCityItems.map(distributionEntry).sort((left, right) => {
      return (left.aliasName ?? left.code).localeCompare(right.aliasName ?? right.code);
    }),
    districts: districtRows.sort((left, right) => right.total - left.total || left.name.localeCompare(right.name)),
  };
}

export default async function Page() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);

  const [lists, access] = await Promise.all([
    Promise.all((["PENDING", "APPROVED", "REJECTED"] as const).map(fetchAllByRegistrationStatus)),
    apiServerGet<AccessContextResource>("/access/me"),
  ]);
  const items = lists.flat();
  const cities = new Map<string, JaringAdministrativeArea>();

  for (const item of items) {
    const city = jaringCity(item);
    if (city) cities.set(city.id, city);
  }

  const scopedCities = await Promise.all(access.authorizationContext.areaScopes.map(resolveScopeCity));
  for (const city of scopedCities) {
    if (city) cities.set(city.id, city);
  }

  const cityMaps = await Promise.all(
    [...cities.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((city) => buildCityDistribution(city, items)),
  );

  return <JaringDistributionClient cities={cityMaps} />;
}
