import { notFound } from "next/navigation";

import { ExecutivePersonnelClient } from "@/app/(main)/dashboard/executive/personil/_components/executive-personnel-client";
import { ExecutivePersonnelDetailClient } from "@/app/(main)/dashboard/executive/personil/_components/executive-personnel-detail-client";
import type {
  PersonnelAreaOption,
  PersonnelDetail,
  PersonnelListItem,
  PersonnelListQueryState,
  PersonnelMapPayload,
} from "@/app/(main)/dashboard/executive/personil/_components/executive-personnel-types";
import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta, QueryParams } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
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

function buildQueryState(
  searchParams?: RouteSearchParams,
): PersonnelListQueryState {
  return {
    q: readFirst(searchParams?.q),
    provinceId: "",
    regencyId: readFirst(searchParams?.regencyId),
    districtId: readFirst(searchParams?.districtId),
    page: readPositiveInt(readFirst(searchParams?.page), 1),
    limit: readPositiveInt(readFirst(searchParams?.limit), 20),
  };
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
    if (
      totalPages ? page >= totalPages : envelope.data.length < BACKEND_MAX_LIMIT
    ) {
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

export async function PersonelLapanganPage({
  searchParams,
}: {
  searchParams?: Promise<RouteSearchParams>;
}) {
  const session = await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  const isRegional = session.role === SYSTEM_ROLES.REGIONAL_COMMANDER;
  const apiPath = isRegional ? "/regional-commander/personnel" : "/field-coordinator/personnel";
  const basePath = "/dashboard/personel-lapangan";

  const queryState = buildQueryState(await searchParams);
  const commonQuery = {
    ...(queryState.q ? { search: queryState.q } : {}),
    ...(queryState.regencyId ? { regencyId: queryState.regencyId } : {}),
    ...(queryState.districtId ? { districtId: queryState.districtId } : {}),
  };
  const [listResult, map, areaFilters] = await Promise.all([
    fetchAllPages<PersonnelListItem>(
      apiPath,
      commonQuery,
    ),
    apiServerGet<PersonnelMapPayload>(
      `${apiPath}/map`,
      commonQuery,
    ),
    apiServerGet<PersonnelAreaFilters>(
      `${apiPath}/area-filters`,
      {
        ...(queryState.regencyId ? { regencyId: queryState.regencyId } : {}),
      },
    ),
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
        description: isRegional
          ? "Daftar petugas lapangan dalam hierarki Regional Commander, termasuk wilayah penugasan, status sinyal, dan peta lokasi operasional."
          : "Daftar petugas lapangan dalam hierarki Koordinator Lapangan, termasuk wilayah penugasan, status sinyal, dan peta lokasi operasional.",
        tableTabLabel: "DAFTAR PERSONIL",
        mapTabLabel: "PETA",
        detailTarget: "assignment",
        showExecutiveSummary: false,
        showProvinceFilter: false,
      }}
    />
  );
}

export async function PersonelLapanganDetailPage({
  assignmentId,
}: {
  assignmentId: string;
}) {
  const session = await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  const isRegional = session.role === SYSTEM_ROLES.REGIONAL_COMMANDER;
  const apiPath = isRegional ? "/regional-commander/personnel" : "/field-coordinator/personnel";
  const basePath = "/dashboard/personel-lapangan";

  const [detail, allJaring] = await Promise.all([
    apiServerGet<PersonnelDetail>(`${apiPath}/${assignmentId}`).catch(() => null),
    apiServerGet<any[]>("/jaring", { limit: 100 }).catch(() => []),
  ]);

  if (!detail) {
    notFound();
  }

  const rawJaring = Array.isArray(allJaring) ? allJaring : [];
  const profileId = detail.profile?.id;
  const profileName = detail.profile?.fullName?.toLowerCase();

  const officerJaring = (detail.jaring && detail.jaring.length > 0)
    ? detail.jaring
    : rawJaring.filter((item) => {
        const caretakers = item.caretakerAssignments ?? [];
        return caretakers.some((c: any) => {
          const fo = c.fieldOfficerAssignment;
          if (!fo) return false;
          if (fo.id === assignmentId) return true;
          if (profileId && (fo.userProfileId === profileId || fo.userProfile?.id === profileId)) return true;
          if (profileName && fo.userProfile?.fullName?.toLowerCase() === profileName) return true;
          return false;
        });
      });

  return (
    <ExecutivePersonnelDetailClient
      detail={{
        ...detail,
        jaring: officerJaring,
      }}
      backHref={basePath}
    />
  );
}
