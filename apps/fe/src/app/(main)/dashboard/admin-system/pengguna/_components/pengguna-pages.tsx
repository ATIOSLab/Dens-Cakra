import { ApiClientError } from "@/lib/api/errors";
import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { PenggunaCreateClient } from "./pengguna-create-client";
import { PenggunaDetailClient } from "./pengguna-detail-client";
import { PenggunaEditClient } from "./pengguna-edit-client";
import { PenggunaListClient } from "./pengguna-list-client";
import type {
  AccessMeResource,
  AreaSearchResult,
  UserDetail,
  UserListFacets,
  UserListItem,
  UserListQueryState,
} from "./pengguna-types";

type RouteSearchParams = Record<string, string | string[] | undefined>;

function readFirst(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function safeOptionalServerGet<T>(path: string, query?: Record<string, string | number | boolean>) {
  try {
    return await apiServerGet<T>(path, query);
  } catch (error) {
    if (error instanceof ApiClientError && [403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

function buildListQueryState(searchParams?: RouteSearchParams): UserListQueryState {
  return {
    q: readFirst(searchParams?.q),
    status: readFirst(searchParams?.status),
    roleCode: readFirst(searchParams?.roleCode),
    unitId: readFirst(searchParams?.branch) || readFirst(searchParams?.unitId),
    areaId: readFirst(searchParams?.areaId),
    page: readPositiveInt(readFirst(searchParams?.page), 1),
    limit: readPositiveInt(readFirst(searchParams?.limit), 20),
    selected: readFirst(searchParams?.selected),
  };
}

export async function PenggunaListPage({ searchParams }: { searchParams?: Promise<RouteSearchParams> }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const queryState = buildListQueryState(await searchParams);
  const listEnvelope = await apiServerFetchEnvelope<UserListItem[]>("/user-profiles", {
    query: {
      page: queryState.page,
      limit: queryState.limit,
      ...(queryState.q ? { search: queryState.q } : {}),
      ...(queryState.status ? { status: queryState.status } : {}),
      ...(queryState.roleCode ? { roleCode: queryState.roleCode } : {}),
      ...(queryState.unitId ? { branch: queryState.unitId } : {}),
      ...(queryState.areaId ? { areaId: queryState.areaId } : {}),
    },
  });

  const items = listEnvelope.data;
  const selectedUserId = queryState.selected || items[0]?.id || "";
  const [selectedUser, selectedArea] = await Promise.all([
    selectedUserId ? safeOptionalServerGet<UserDetail>(`/user-profiles/${selectedUserId}`) : Promise.resolve(null),
    queryState.areaId
      ? safeOptionalServerGet<AreaSearchResult>(`/administrative-areas/${queryState.areaId}`)
      : Promise.resolve(null),
  ]);

  return (
    <PenggunaListClient
      items={items}
      pagination={listEnvelope.meta?.pagination as PaginationMeta | undefined}
      facets={listEnvelope.meta?.facets as UserListFacets | undefined}
      selectedUser={selectedUser}
      queryState={queryState}
      selectedArea={selectedArea}
    />
  );
}

export async function PenggunaCreatePage() {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  return <PenggunaCreateClient />;
}

export async function PenggunaDetailPage({ userProfileId }: { userProfileId: string }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const [user, access] = await Promise.all([
    apiServerGet<UserDetail>(`/user-profiles/${userProfileId}`),
    apiServerGet<AccessMeResource>("/access/me"),
  ]);

  return <PenggunaDetailClient user={user} actorUserProfileId={access.authorizationContext.userProfileId} />;
}

export async function PenggunaEditPage({ userProfileId }: { userProfileId: string }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const user = await apiServerGet<UserDetail>(`/user-profiles/${userProfileId}`);

  return <PenggunaEditClient user={user} />;
}
