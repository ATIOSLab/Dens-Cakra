import type {
  AccessContextResource,
  DirectiveDetail,
  DirectiveSummary,
  DirectiveTracking,
  ProvinceBoundaryCollection,
  ProvinceOption,
  RegionalAssignmentOption,
  RegionalMasterOverview,
} from "@/features/directives/types";
import { ApiClientError } from "@/lib/api/errors";
import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { DirectiveDetailClient } from "./directive-detail-client";
import { DirectiveFormClient } from "./directive-form-client";
import { DirectiveListClient } from "./directive-list-client";
import { DirectiveTrackingClient } from "./directive-tracking-client";

type ProvinceAreaResource = ProvinceOption;

type PositionAssignmentResource = {
  id: string;
  position?: {
    id: string;
    code?: string;
    title?: string;
    organizationUnit?: {
      id: string;
      name: string;
    } | null;
  } | null;
  userProfile?: {
    fullName?: string | null;
    username?: string | null;
  } | null;
  areaScopes?: Array<{
    area?: {
      id: string;
      code: string;
      name: string;
      level: string;
    } | null;
    isPrimary?: boolean;
  }>;
};

function createEmptyProvinceBoundaryCollection(): ProvinceBoundaryCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

async function safeOptionalServerGet<T>(path: string, query: Record<string, string | number | boolean>) {
  try {
    return await apiServerGet<T>(path, query);
  } catch (error) {
    if (error instanceof ApiClientError && [403, 404].includes(error.status)) {
      return null;
    }

    throw error;
  }
}

function normalizeRegionalAssignments(assignments: PositionAssignmentResource[]): RegionalAssignmentOption[] {
  return assignments.flatMap((assignment) => {
    if (!assignment.position?.id || !assignment.position.organizationUnit?.id) {
      return [];
    }

    return [
      {
        id: assignment.id,
        positionId: assignment.position.id,
        positionTitle: assignment.position.title ?? "Komandan Regional",
        positionCode: assignment.position.code ?? "REGIONAL_COMMANDER",
        organizationUnitId: assignment.position.organizationUnit.id,
        organizationUnitName: assignment.position.organizationUnit.name,
        assigneeName: assignment.userProfile?.fullName ?? null,
        assigneeUsername: assignment.userProfile?.username ?? null,
        areaScopes: (assignment.areaScopes ?? []).flatMap((scope) =>
          scope.area
            ? [
                {
                  areaId: scope.area.id,
                  code: scope.area.code,
                  name: scope.area.name,
                  level: scope.area.level,
                  isPrimary: Boolean(scope.isPrimary),
                },
              ]
            : [],
        ),
      },
    ];
  });
}

async function loadDirectiveBuilderOptions() {
  const today = new Date().toISOString();
  const access = await apiServerGet<AccessContextResource>("/access/me");

  const [provinces, provinceBoundaries, regionalAssignments, regionalMasters] = await Promise.all([
    safeOptionalServerGet<ProvinceAreaResource[]>("/administrative-areas", {
      level: "PROVINCE",
      isActive: true,
      limit: 1000,
    }),
    safeOptionalServerGet<ProvinceBoundaryCollection>("/administrative-areas/boundaries", {
      bbox: "93,-12,143,9",
      level: "PROVINCE",
      zoom: 4,
      limit: 200,
    }),
    safeOptionalServerGet<PositionAssignmentResource[]>("/position-assignments", {
      roleCode: "REGIONAL_COMMANDER",
      isActive: true,
      validAt: today,
      limit: 100,
    }),
    safeOptionalServerGet<RegionalMasterOverview>("/organization-units/regional-masters", {}),
  ]);

  return {
    access,
    provinces: provinces ?? [],
    provinceBoundaries: provinceBoundaries ?? createEmptyProvinceBoundaryCollection(),
    regionalAssignments: normalizeRegionalAssignments(regionalAssignments ?? []),
    regionalMasters: regionalMasters ?? null,
  };
}

export async function DirectiveListPage({ sortBy, sortOrder }: { sortBy?: string; sortOrder?: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const access = await apiServerGet<AccessContextResource>("/access/me");
  const directives = await apiServerGet<DirectiveSummary[]>("/directives", {
    ownerUnitId: access.authorizationContext.organizationUnitId,
    limit: 50,
    sortBy,
    sortOrder,
  });

  return <DirectiveListClient directives={directives} />;
}

export async function DirectiveCreatePage() {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const options = await loadDirectiveBuilderOptions();

  return (
    <DirectiveFormClient
      mode="create"
      access={options.access}
      provinceOptions={options.provinces}
      provinceBoundaries={options.provinceBoundaries}
      regionalAssignments={options.regionalAssignments}
      regionalMasters={options.regionalMasters}
    />
  );
}

export async function DirectiveDetailPage({ directiveId }: { directiveId: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const [directive, tracking] = await Promise.all([
    apiServerGet<DirectiveDetail>(`/directives/${directiveId}`),
    apiServerGet<DirectiveTracking>(`/directives/${directiveId}/tracking`, { includeTasks: true }),
  ]);

  return <DirectiveDetailClient directive={directive} tracking={tracking} />;
}

export async function DirectiveEditPage({ directiveId }: { directiveId: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const [options, directive] = await Promise.all([
    loadDirectiveBuilderOptions(),
    apiServerGet<DirectiveDetail>(`/directives/${directiveId}`),
  ]);

  return (
    <DirectiveFormClient
      mode="edit"
      access={options.access}
      provinceOptions={options.provinces}
      provinceBoundaries={options.provinceBoundaries}
      regionalAssignments={options.regionalAssignments}
      regionalMasters={options.regionalMasters}
      directive={directive}
    />
  );
}

export async function DirectiveVersionPage({ directiveId, versionId }: { directiveId: string; versionId: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const [directive, version] = await Promise.all([
    apiServerGet<DirectiveDetail>(`/directives/${directiveId}`),
    apiServerGet(`/directive-versions/${versionId}`),
  ]);

  const augmentedDirective: DirectiveDetail = {
    ...directive,
    versions: directive.versions.map((item) =>
      item.id === versionId ? (version as DirectiveDetail["versions"][number]) : item,
    ),
  };

  const tracking = await apiServerGet<DirectiveTracking>(`/directives/${directiveId}/tracking`, { includeTasks: true });

  return <DirectiveDetailClient directive={augmentedDirective} tracking={tracking} />;
}

export async function DirectiveTrackingPage({ directiveId }: { directiveId: string }) {
  await requireRole(SYSTEM_ROLES.EXECUTIVE);
  const [directive, tracking] = await Promise.all([
    apiServerGet<DirectiveDetail>(`/directives/${directiveId}`),
    apiServerGet<DirectiveTracking>(`/directives/${directiveId}/tracking`, { includeTasks: true }),
  ]);

  return <DirectiveTrackingClient directive={directive} tracking={tracking} />;
}
