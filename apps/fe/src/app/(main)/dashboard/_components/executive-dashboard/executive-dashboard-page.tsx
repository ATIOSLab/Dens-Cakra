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

function dashboardQuery(searchParams: ExecutiveDashboardPageProps["searchParams"]) {
  const params = new URLSearchParams();
  params.set("period", firstParam(searchParams?.period) ?? "LAST_30_DAYS");
  const areaId = firstParam(searchParams?.areaId);
  const from = firstParam(searchParams?.from);
  const to = firstParam(searchParams?.to);
  if (areaId) params.set("areaId", areaId);
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
