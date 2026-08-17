import type {
  PersonnelArea,
  PersonnelListItem,
  PersonnelMapFeature,
  PersonnelMapPayload,
} from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-types";
import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta, QueryParams } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import {
  type JaringDistributionCity,
  JaringDistributionClient,
  type JaringDistributionEntry,
} from "../sebaran-jaring/_components/sebaran-jaring-client";
import type { AdminLevel, AgentOperationalStatus } from "../sebaran-jaring/_components/sebaran-jaring-types";

export const dynamic = "force-dynamic";

const BACKEND_MAX_LIMIT = 100;

type GaswilArea = PersonnelArea | NonNullable<PersonnelMapFeature["properties"]["area"]>;

function apiPathForRole(role: string) {
  if (role === SYSTEM_ROLES.EXECUTIVE) return "/executive/personnel";
  if (role === SYSTEM_ROLES.REGIONAL_COMMANDER) return "/regional-commander/personnel";
  return "/field-coordinator/personnel";
}

function allowedLevelsForRole(role: string): AdminLevel[] {
  if (role === SYSTEM_ROLES.EXECUTIVE) return ["PROVINCE", "CITY", "DISTRICT"];
  if (role === SYSTEM_ROLES.REGIONAL_COMMANDER) return ["CITY", "DISTRICT"];
  return ["DISTRICT"];
}

async function fetchAllPages<T>(path: string, query: QueryParams = {}) {
  const items: T[] = [];
  let page = 1;
  let hasMore = true;
  let latestPagination: PaginationMeta | undefined;

  while (hasMore) {
    const envelope = await apiServerFetchEnvelope<T[]>(path, {
      query: {
        ...query,
        page,
        limit: BACKEND_MAX_LIMIT,
      },
    });

    items.push(...envelope.data);
    latestPagination = envelope.meta?.pagination;

    const totalPages = latestPagination?.totalPages;
    if (totalPages ? page >= totalPages : envelope.data.length < BACKEND_MAX_LIMIT) {
      hasMore = false;
    } else {
      page += 1;
    }
  }

  return items;
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

function areaLevel(area?: GaswilArea | null) {
  return area?.level?.toUpperCase();
}

function areaByLevel(item: PersonnelListItem, levels: string[]) {
  const accepted = new Set(levels);
  return item.assignment?.areas.find((area) => accepted.has(area.level.toUpperCase())) ?? null;
}

function primaryArea(item: PersonnelListItem, feature?: PersonnelMapFeature) {
  return (
    item.assignment?.areas.find((area) => area.isPrimary) ??
    item.assignment?.areas[0] ??
    feature?.properties.area ??
    null
  );
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
  return item.assignment?.id ? `/dashboard/daftar-petugas-wilayah/${item.assignment.id}` : "/dashboard/daftar-petugas-wilayah";
}

function gaswilEntry(
  item: PersonnelListItem,
  feature: PersonnelMapFeature | undefined,
  role: string,
): JaringDistributionEntry | null {
  const coordinate = featureCoordinate(feature);
  if (!coordinate) return null;

  const districtArea =
    areaByLevel(item, ["DISTRICT"]) ??
    (areaLevel(feature?.properties.area) === "DISTRICT" ? feature?.properties.area : null);
  const cityArea =
    areaByLevel(item, ["CITY", "REGENCY"]) ??
    (["CITY", "REGENCY"].includes(areaLevel(feature?.properties.area) ?? "") ? feature?.properties.area : null);
  const area = primaryArea(item, feature);
  const lastSignalAt = feature?.properties.capturedAt ?? item.lastLocation?.capturedAt ?? item.lastLoginAt;

  return {
    id: item.assignment?.id ?? item.id,
    aliasName: item.assignment?.seatCode ?? null,
    fullName: item.fullName,
    whatsappNumber: item.phone,
    gender: null,
    address: null,
    profilePhotoFileId: null,
    provinceName: "Cakupan hak akses",
    cityName: cityArea?.name ?? area?.name ?? "Cakupan penugasan",
    districtId: districtArea?.id ?? null,
    districtName: districtArea?.name ?? area?.name ?? "Cakupan penugasan",
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

function distributionFromEntries(entries: JaringDistributionEntry[]): JaringDistributionCity[] {
  const cityGroups = new Map<string, JaringDistributionEntry[]>();

  for (const entry of entries) {
    const cityKey = entry.cityName ?? "Cakupan penugasan";
    cityGroups.set(cityKey, [...(cityGroups.get(cityKey) ?? []), entry]);
  }

  return [...cityGroups.entries()]
    .map(([cityName, cityEntries]) => {
      const districtGroups = new Map<string, JaringDistributionEntry[]>();
      for (const entry of cityEntries) {
        const districtKey = entry.districtId ?? entry.districtName;
        districtGroups.set(districtKey, [...(districtGroups.get(districtKey) ?? []), entry]);
      }

      const districts = [...districtGroups.entries()]
        .map(([districtKey, districtEntries]) => ({
          id: districtEntries[0]?.districtId ?? districtKey,
          name: districtEntries[0]?.districtName ?? districtKey,
          total: districtEntries.length,
          approved: districtEntries.filter((entry) => entry.status === "VERIFIED").length,
          pending: districtEntries.filter((entry) => entry.status === "PENDING").length,
          rejected: districtEntries.filter((entry) => entry.status === "REJECTED").length,
          villageCount: 0,
          fieldOfficerCount: districtEntries.length,
          fieldOfficerNames: districtEntries.flatMap((entry) => (entry.fullName ? [entry.fullName] : [])),
          centroidLatitude: average(districtEntries.map((entry) => entry.latitude)),
          centroidLongitude: average(districtEntries.map((entry) => entry.longitude)),
          geometry: null,
          villages: [],
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "id-ID"));

      return {
        id: cityName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "cakupan-penugasan",
        name: cityName,
        provinceId: "scoped",
        provinceName: "Cakupan hak akses",
        total: cityEntries.length,
        approved: cityEntries.filter((entry) => entry.status === "VERIFIED").length,
        pending: cityEntries.filter((entry) => entry.status === "PENDING").length,
        rejected: cityEntries.filter((entry) => entry.status === "REJECTED").length,
        villageCount: 0,
        geometry: null,
        jaring: cityEntries.sort((left, right) => (left.fullName ?? "").localeCompare(right.fullName ?? "", "id-ID")),
        districts,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

export default async function SebaranGaswilPage() {
  const session = await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
  );
  const apiPath = apiPathForRole(session.role);

  const [personnel, mapPayload] = await Promise.all([
    fetchAllPages<PersonnelListItem>(apiPath),
    apiServerGet<PersonnelMapPayload>(`${apiPath}/map`).catch(() => null),
  ]);

  const featuresByUserId = new Map<string, PersonnelMapFeature>();
  const featuresByAssignmentId = new Map<string, PersonnelMapFeature>();
  for (const feature of mapPayload?.features ?? []) {
    featuresByUserId.set(feature.properties.userProfileId, feature);
    featuresByAssignmentId.set(feature.properties.assignmentId, feature);
  }

  const entries = personnel.flatMap((item) => {
    const feature =
      featuresByUserId.get(item.id) ??
      (item.assignment?.id ? featuresByAssignmentId.get(item.assignment.id) : undefined);
    const entry = gaswilEntry(item, feature, session.role);
    return entry ? [entry] : [];
  });

  return (
    <JaringDistributionClient
      cities={distributionFromEntries(entries)}
      allowedAdminLevels={allowedLevelsForRole(session.role)}
      mode="gaswil"
    />
  );
}
