import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { BaketCoordinatorClient } from "./_components/baket-coordinator-client";
import { BaketOfficerClient } from "./_components/baket-officer-client";

export const dynamic = "force-dynamic";

export default async function BaketMainPage() {
  const principal = await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  if (principal.role === SYSTEM_ROLES.FIELD_OFFICER) {
    return <BaketOfficerClient />;
  }

  return <BaketCoordinatorClient />;
}
