import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { LaporanJaringClient } from "./_components/laporan-jaring-client";
import { LaporanJaringCoordinatorClient } from "./_components/laporan-jaring-coordinator-client";

export const dynamic = "force-dynamic";

export default async function LaporanJaringMainPage() {
  const principal = await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  if (principal.role === SYSTEM_ROLES.FIELD_OFFICER) {
    return <LaporanJaringClient />;
  }

  return <LaporanJaringCoordinatorClient />;
}
