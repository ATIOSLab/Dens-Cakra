import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { KpiClient } from "./kpi-client";

export async function KpiPage({ mode, from, to }: { mode: "regional" | "national"; from?: string; to?: string }) {
  await requireRole(
    SYSTEM_ROLES.NATIONAL_LEADER,
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.FIELD_OFFICER,
  );
  return <KpiClient mode={mode} initialFrom={from} initialTo={to} />;
}
