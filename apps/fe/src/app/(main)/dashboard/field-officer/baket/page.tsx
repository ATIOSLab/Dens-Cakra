import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { BaketOfficerClient } from "./_components/baket-officer-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  return <BaketOfficerClient />;
}
