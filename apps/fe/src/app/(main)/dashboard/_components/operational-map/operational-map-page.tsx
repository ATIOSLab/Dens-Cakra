import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { OperationalMapClient } from "./operational-map-client";

export async function OperationalMapPage({ mode }: { mode: "regional" | "national" }) {
  await requireRole(mode === "regional" ? SYSTEM_ROLES.REGIONAL_COMMANDER : SYSTEM_ROLES.EXECUTIVE);
  return <OperationalMapClient mode={mode} />;
}
