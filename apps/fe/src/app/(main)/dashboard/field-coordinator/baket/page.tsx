import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { BaketCoordinatorClient } from "./_components/baket-coordinator-client";

export const dynamic = "force-dynamic";

export default async function BaketCoordinatorPage() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  return <BaketCoordinatorClient />;
}
