import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import { ExecutiveDashboardClient } from "./executive-dashboard-client";
import type { ExecutiveDashboardData, ExecutiveDashboardFilters } from "./executive-dashboard-types";

export async function ExecutiveDashboardPage({ role }: { role: SystemRole }) {
  await requireRole(role);

  const [dashboard, filters] = await Promise.allSettled([
    apiServerGet<ExecutiveDashboardData>("/dashboard/executive?period=LAST_30_DAYS"),
    apiServerGet<ExecutiveDashboardFilters>("/dashboard/executive/filters"),
  ]);

  return (
    <ExecutiveDashboardClient
      initialData={dashboard.status === "fulfilled" ? dashboard.value : null}
      initialFilters={filters.status === "fulfilled" ? filters.value : null}
      initialError={dashboard.status === "rejected" ? "Data dashboard eksekutif belum dapat dimuat." : null}
      role={role}
    />
  );
}
