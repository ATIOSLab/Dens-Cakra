import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { BaketCoordinatorClient } from "./_components/baket-coordinator-client";

export const dynamic = "force-dynamic";

export default async function BaketMainPage() {
  const principal = await requireRole(
    SYSTEM_ROLES.NATIONAL_LEADER,
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  return <BaketCoordinatorClient role={principal.role} />;
}
