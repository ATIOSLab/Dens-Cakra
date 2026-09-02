import type {
  PersonnelListItem,
  PersonnelMapFeature,
  PersonnelMapPayload,
} from "@/app/(main)/dashboard/deputi/personil/_components/executive-personnel-types";
import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import type { PaginationMeta, QueryParams } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringDistributionClient } from "../sebaran-jaring/_components/sebaran-jaring-client";
import { allowedLevelsForRole, distributionFromEntries, gaswilEntry } from "./_lib/gaswil-distribution";

export const dynamic = "force-dynamic";

const BACKEND_MAX_LIMIT = 100;

function apiPathForRole(role: string) {
  if (role === SYSTEM_ROLES.EXECUTIVE) return "/executive/personnel";
  if (role === SYSTEM_ROLES.REGIONAL_COMMANDER) return "/regional-commander/personnel";
  return "/field-coordinator/personnel";
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

export default async function SebaranGaswilPage() {
  const session = await requireRole(
    SYSTEM_ROLES.NATIONAL_LEADER,
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
