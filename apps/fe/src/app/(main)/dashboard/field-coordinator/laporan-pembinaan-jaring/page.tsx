import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { LaporanPembinaanCoordinatorClient } from "./_components/laporan-pembinaan-coordinator-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  return <LaporanPembinaanCoordinatorClient />;
}
