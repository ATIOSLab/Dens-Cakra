import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { LaporanPembinaanClient } from "./_components/laporan-pembinaan-client";
import { LaporanPembinaanCoordinatorClient } from "./_components/laporan-pembinaan-coordinator-client";

export const dynamic = "force-dynamic";

export default async function LaporanPembinaanJaringMainPage() {
  const principal = await requireRole(
    SYSTEM_ROLES.NATIONAL_LEADER,
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  if (principal.role === SYSTEM_ROLES.FIELD_OFFICER) {
    return <LaporanPembinaanClient />;
  }

  return <LaporanPembinaanCoordinatorClient />;
}
