import { redirect } from "next/navigation";

import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JabatanDetailClient } from "./jabatan-detail-client";
import { JabatanFormClient } from "./jabatan-form-client";
import { JabatanListClient } from "./jabatan-list-client";
import type { JabatanListQueryState, JabatanResource } from "./jabatan-types";

type RouteSearchParams = Record<string, string | string[] | undefined>;

function readFirst(value?: string | string[]) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function readPositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildQueryState(searchParams?: RouteSearchParams): JabatanListQueryState {
  return {
    q: readFirst(searchParams?.q),
    roleCode: readFirst(searchParams?.roleCode),
    positionCode: readFirst(searchParams?.positionCode),
    unitId: readFirst(searchParams?.unitId),
    page: readPositiveInt(readFirst(searchParams?.page), 1),
    limit: readPositiveInt(readFirst(searchParams?.limit), 20),
  };
}

export async function JabatanListPage({ searchParams }: { searchParams?: Promise<RouteSearchParams> }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const queryState = buildQueryState(await searchParams);
  const envelope = await apiServerFetchEnvelope<JabatanResource[]>("/positions", {
    query: {
      page: queryState.page,
      limit: queryState.limit,
      isActive: true,
      ...(queryState.q ? { search: queryState.q } : {}),
      ...(queryState.roleCode ? { roleCode: queryState.roleCode } : {}),
      ...(queryState.positionCode ? { code: queryState.positionCode } : {}),
      ...(queryState.unitId ? { unitId: queryState.unitId } : {}),
    },
  });

  return (
    <JabatanListClient
      items={envelope.data}
      pagination={envelope.meta?.pagination as PaginationMeta | undefined}
      queryState={queryState}
    />
  );
}

export async function JabatanCreatePage() {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);
  return <JabatanFormClient mode="create" />;
}

export async function JabatanDetailPage({ positionId }: { positionId: string }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);
  const position = await apiServerGet<JabatanResource>(`/positions/${positionId}`);
  return <JabatanDetailClient position={position} />;
}

export async function JabatanEditPage({ positionId }: { positionId: string }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);
  const position = await apiServerGet<JabatanResource>(`/positions/${positionId}`);
  return <JabatanFormClient mode="edit" position={position} />;
}

export async function JabatanReportingLinePage({ positionId }: { positionId: string }) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);
  redirect(`/dashboard/admin-system/jabatan-reporting-line/${positionId}`);
  return null;
}
