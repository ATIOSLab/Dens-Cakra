import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { MapsIntelijenNetworkClient } from "./_components/maps-intelijen-network-client";

export const dynamic = "force-dynamic";

export default async function MapsIntelijenNetworkPage() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  return <MapsIntelijenNetworkClient />;
}
