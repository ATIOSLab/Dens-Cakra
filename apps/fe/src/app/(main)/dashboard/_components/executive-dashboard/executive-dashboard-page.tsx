import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import { ExecutiveDashboardClient } from "./executive-dashboard-client";
import type { ExecutiveDashboardData } from "./executive-dashboard-types";

type ExecutiveDashboardPageProps = {
  role: SystemRole;
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const DASHBOARD_QUERY_KEYS = [
  "areaId",
  "categoryId",
  "productTypeId",
  "jaringId",
  "fieldOfficerAssignmentId",
  "urgency",
  "reportStatus",
  "workflowStatus",
  "validationStatus",
  "hasAttachment",
  "coordinateSource",
  "locationSuitability",
  "source",
] as const;

function dashboardQuery(searchParams: ExecutiveDashboardPageProps["searchParams"]) {
  const params = new URLSearchParams();
  params.set("period", firstParam(searchParams?.period) ?? "LAST_30_DAYS");
  const from = firstParam(searchParams?.from);
  const to = firstParam(searchParams?.to);
  for (const key of DASHBOARD_QUERY_KEYS) {
    const value = firstParam(searchParams?.[key]);
    if (value) params.set(key, value);
  }
  if (params.get("period") === "CUSTOM") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return params;
}

export async function ExecutiveDashboardPage({ role, searchParams }: ExecutiveDashboardPageProps) {
  await requireRole(role);
  const query = dashboardQuery(searchParams);

  const dashboard = await apiServerGet<ExecutiveDashboardData>(`/dashboard/executive?${query}`).then(
    (value) => ({ status: "fulfilled" as const, value }),
    () => ({ status: "rejected" as const }),
  );

  return (
    <ExecutiveDashboardClient
      initialData={dashboard.status === "fulfilled" ? dashboard.value : null}
      initialError={dashboard.status === "rejected" ? "Data dashboard belum dapat dimuat." : null}
      role={role}
    />
  );
}
