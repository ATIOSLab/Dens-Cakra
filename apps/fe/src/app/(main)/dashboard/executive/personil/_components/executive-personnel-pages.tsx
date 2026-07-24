import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta, QueryParams } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { ExecutivePersonnelClient } from "./executive-personnel-client";
import { ExecutivePersonnelDetailClient } from "./executive-personnel-detail-client";
import type {
  PersonnelAreaOption,
  PersonnelDetail,
  PersonnelListItem,
  PersonnelListQueryState,
  PersonnelMapPayload,
} from "./executive-personnel-types";

type RouteSearchParams = Record<string, string | string[] | undefined>;
const BACKEND_MAX_LIMIT = 100;

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
  let latestPagination: PaginationMeta | undefined;

  while (true) {
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
      break;
    }

    page += 1;
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

export async function ExecutivePersonnelPage({
  searchParams,
}: {
  searchParams?: Promise<RouteSearchParams>;
}) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);

  const queryState = buildQueryState(await searchParams);
  const commonQuery = {
    ...(queryState.q ? { search: queryState.q } : {}),
    ...(queryState.provinceId ? { provinceId: queryState.provinceId } : {}),
    ...(queryState.regencyId ? { regencyId: queryState.regencyId } : {}),
    ...(queryState.districtId ? { districtId: queryState.districtId } : {}),
  };
  const [
    listResult,
    map,
    provinceResult,
    regenciesFromRegency,
    regenciesFromCity,
    districts,
  ] = await Promise.all([
    fetchAllPages<PersonnelListItem>("/executive/personnel", commonQuery),
    apiServerGet<PersonnelMapPayload>("/executive/personnel/map", commonQuery),
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

  return (
    <ExecutivePersonnelClient
      items={listResult.data}
      pagination={listResult.pagination}
      map={map}
      queryState={queryState}
      areaFilters={{
        provinces: sortAreaOptions(provinceResult.data),
        regencies: sortAreaOptions([...regenciesFromRegency, ...regenciesFromCity]),
        districts: sortAreaOptions(districts),
      }}
    />
  );
}

export async function ExecutivePersonnelDetailPage({ userProfileId }: { userProfileId: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);

  const detail = await apiServerGet<PersonnelDetail>(`/executive/personnel/${userProfileId}`);

  return <ExecutivePersonnelDetailClient detail={detail} />;
}
