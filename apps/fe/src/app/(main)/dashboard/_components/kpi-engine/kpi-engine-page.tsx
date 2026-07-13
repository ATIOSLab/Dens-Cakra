import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { KpiEngineClient } from "./kpi-engine-client";

export async function KpiEnginePage({ mode, from, to }: { mode: "regional" | "national"; from?: string; to?: string }) {
  await requireRole(mode === "regional" ? SYSTEM_ROLES.REGIONAL_COMMANDER : SYSTEM_ROLES.EXECUTIVE);
  const data = await apiServerGet("/dashboard/kpi-engine", { from, to });
  return <KpiEngineClient data={data} mode={mode} />;
}
