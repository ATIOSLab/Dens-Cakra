import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta } from "@/lib/api/types";
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
    listEnvelope,
    map,
    provinces,
    regenciesFromRegency,
    regenciesFromCity,
    districts,
  ] = await Promise.all([
    apiServerFetchEnvelope<PersonnelListItem[]>("/executive/personnel", {
      query: {
        page: queryState.page,
        limit: queryState.limit,
        ...commonQuery,
      },
    }),
    apiServerGet<PersonnelMapPayload>("/executive/personnel/map", commonQuery),
    apiServerGet<PersonnelAreaOption[]>("/administrative-areas", {
      level: "PROVINCE",
      limit: 1000,
      isActive: true,
    }),
    queryState.provinceId
      ? apiServerGet<PersonnelAreaOption[]>(
          `/administrative-areas/${queryState.provinceId}/children`,
          { level: "REGENCY" },
        )
      : Promise.resolve([]),
    queryState.provinceId
      ? apiServerGet<PersonnelAreaOption[]>(
          `/administrative-areas/${queryState.provinceId}/children`,
          { level: "CITY" },
        )
      : Promise.resolve([]),
    queryState.regencyId
      ? apiServerGet<PersonnelAreaOption[]>(
          `/administrative-areas/${queryState.regencyId}/children`,
          { level: "DISTRICT" },
        )
      : Promise.resolve([]),
  ]);

  return (
    <ExecutivePersonnelClient
      items={listEnvelope.data}
      pagination={listEnvelope.meta?.pagination as PaginationMeta | undefined}
      map={map}
      queryState={queryState}
      areaFilters={{
        provinces: sortAreaOptions(provinces),
        regencies: sortAreaOptions([...regenciesFromRegency, ...regenciesFromCity]),
        districts: sortAreaOptions(districts),
      }}
    />
  );
}

export async function ExecutivePersonnelDetailPage({
  userProfileId,
}: {
  userProfileId: string;
}) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);

  const detail = await apiServerGet<PersonnelDetail>(
    `/executive/personnel/${userProfileId}`,
  );

  return <ExecutivePersonnelDetailClient detail={detail} />;
}
