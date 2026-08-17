import { notFound } from "next/navigation";

import { ExecutivePersonnelClient } from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-client";
import { ExecutivePersonnelDetailClient } from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-detail-client";
import type {
  PersonnelAreaOption,
  PersonnelDetail,
  PersonnelListItem,
  PersonnelListQueryState,
  PersonnelMapPayload,
} from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-types";
import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta, QueryParams } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

type RouteSearchParams = Record<string, string | string[] | undefined>;
const BACKEND_MAX_LIMIT = 100;

type PersonnelAreaFilters = {
  provinces: PersonnelAreaOption[];
  regencies: PersonnelAreaOption[];
  districts: PersonnelAreaOption[];
};

function readFirst(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildQueryState(searchParams?: RouteSearchParams): PersonnelListQueryState {
  return {
    q: readFirst(searchParams?.q),
    provinceId: readFirst(searchParams?.provinceId),
    regencyId: readFirst(searchParams?.regencyId),
    districtId: readFirst(searchParams?.districtId),
    page: readPositiveInt(readFirst(searchParams?.page), 1),
    limit: readPositiveInt(readFirst(searchParams?.limit), 20),
  };
}

function sortAreaOptions(items: PersonnelAreaOption[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "id-ID"));
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

  return {
    data: items,
    pagination: {
      page: 1,
      limit: items.length,
      total: latestPagination?.total ?? items.length,
      totalPages: 1,
    } satisfies PaginationMeta,
  };
}

async function fetchExecutiveAreaFilters(queryState: PersonnelListQueryState): Promise<PersonnelAreaFilters> {
  const [provinceResult, regenciesFromRegency, regenciesFromCity, districts] = await Promise.all([
    fetchAllPages<PersonnelAreaOption>("/administrative-areas", {
      level: "PROVINCE",
      isActive: true,
    }),
    queryState.provinceId
      ? apiServerGet<PersonnelAreaOption[]>(`/administrative-areas/${queryState.provinceId}/children`, {
          level: "REGENCY",
        })
      : Promise.resolve([]),
    queryState.provinceId
      ? apiServerGet<PersonnelAreaOption[]>(`/administrative-areas/${queryState.provinceId}/children`, {
          level: "CITY",
        })
      : Promise.resolve([]),
    queryState.regencyId
      ? apiServerGet<PersonnelAreaOption[]>(`/administrative-areas/${queryState.regencyId}/children`, {
          level: "DISTRICT",
        })
      : Promise.resolve([]),
  ]);

  return {
    provinces: sortAreaOptions(provinceResult.data),
    regencies: sortAreaOptions([...regenciesFromRegency, ...regenciesFromCity]),
    districts: sortAreaOptions(districts),
  };
}

export async function PetugasWilayahPage({ searchParams }: { searchParams?: Promise<RouteSearchParams> }) {
  const session = await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );
  const isExecutive = session.role === SYSTEM_ROLES.EXECUTIVE;
  const isRegional = session.role === SYSTEM_ROLES.REGIONAL_COMMANDER;
  const apiPath = isExecutive
    ? "/executive/personnel"
    : isRegional
      ? "/regional-commander/personnel"
      : "/field-coordinator/personnel";
  const basePath = "/dashboard/daftar-petugas-wilayah";

  const queryState = buildQueryState(await searchParams);
  const commonQuery = {
    ...(queryState.q ? { search: queryState.q } : {}),
    ...(queryState.provinceId ? { provinceId: queryState.provinceId } : {}),
    ...(queryState.regencyId ? { regencyId: queryState.regencyId } : {}),
    ...(queryState.districtId ? { districtId: queryState.districtId } : {}),
  };
  const [listResult, map, areaFilters] = await Promise.all([
    fetchAllPages<PersonnelListItem>(apiPath, commonQuery),
    apiServerGet<PersonnelMapPayload>(`${apiPath}/map`, commonQuery),
    isExecutive
      ? fetchExecutiveAreaFilters(queryState)
      : apiServerGet<PersonnelAreaFilters>(`${apiPath}/area-filters`, {
          ...(queryState.provinceId ? { provinceId: queryState.provinceId } : {}),
          ...(queryState.regencyId ? { regencyId: queryState.regencyId } : {}),
        }),
  ]);

  return (
    <ExecutivePersonnelClient
      items={listResult.data}
      pagination={listResult.pagination}
      map={map}
      queryState={queryState}
      areaFilters={areaFilters}
      pageConfig={{
        basePath,
        title: "Petugas Wilayah (Gaswil)",
        description: isExecutive
          ? `Pantau ${DOMAIN_TERMS.fieldOfficer}, ${DOMAIN_TERMS.assignmentArea.toLowerCase()}, ${DOMAIN_TERMS.jaring} binaan, status sinyal, dan posisi operasional dalam cakupan ${DOMAIN_TERMS.executiveRole}.`
          : isRegional
            ? `Pantau ${DOMAIN_TERMS.fieldOfficer}, ${DOMAIN_TERMS.assignmentArea.toLowerCase()}, ${DOMAIN_TERMS.jaring} binaan, status sinyal, dan posisi operasional dalam cakupan ${DOMAIN_TERMS.regionalCommanderRole}.`
            : `Pantau ${DOMAIN_TERMS.fieldOfficer}, ${DOMAIN_TERMS.assignmentArea.toLowerCase()}, ${DOMAIN_TERMS.jaring} binaan, status sinyal, dan posisi operasional dalam cakupan ${DOMAIN_TERMS.fieldCoordinatorRole}.`,
        tableTabLabel: "Daftar Petugas Wilayah",
        mapTabLabel: "Peta Penugasan",
        detailTarget: isExecutive ? "userProfile" : "assignment",
        showMapTab: false,
        showExecutiveSummary: false,
        showProvinceFilter: true,
        layoutVariant: "directory",
        searchPlaceholder: `Cari nama, nomor HP, jabatan, ${DOMAIN_TERMS.assignmentArea.toLowerCase()}, atau ${DOMAIN_TERMS.jaring}...`,
        scopeLabel: isExecutive ? "Cakupan supervisi" : "Cakupan penugasan",
        totalPersonnelLabel: "Total Petugas Wilayah",
        personnelColumnLabel: "Petugas Wilayah",
        jaringKpiLabel: `${DOMAIN_TERMS.jaring} Binaan`,
        onlineKpiLabel: "Sinyal Aktif",
        offlineKpiLabel: "Belum Tersambung",
        emptyTitle: "Belum ada Petugas Wilayah",
        emptyDescription:
          "Filter saat ini belum menemukan Petugas Wilayah (Gaswil) dalam cakupan penugasan Anda. Atur ulang filter atau pilih wilayah lain.",
        mapLegendTitle: "Keterangan Sinyal",
      }}
    />
  );
}

export async function PetugasWilayahDetailPage({ assignmentId }: { assignmentId: string }) {
  const session = await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );
  const isExecutive = session.role === SYSTEM_ROLES.EXECUTIVE;
  const isRegional = session.role === SYSTEM_ROLES.REGIONAL_COMMANDER;
  const apiPath = isExecutive
    ? "/executive/personnel"
    : isRegional
      ? "/regional-commander/personnel"
      : "/field-coordinator/personnel";
  const basePath = "/dashboard/daftar-petugas-wilayah";

  const detail = await apiServerGet<PersonnelDetail>(`${apiPath}/${assignmentId}`).catch(() => null);

  if (!detail) {
    notFound();
  }

  return <ExecutivePersonnelDetailClient detail={detail} backHref={basePath} userRole={session.role} />;
}
