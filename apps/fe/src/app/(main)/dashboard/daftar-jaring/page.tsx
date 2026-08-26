import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringVerificationListClient } from "./_components/verification-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(
    SYSTEM_ROLES.NATIONAL_LEADER,
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  return <JaringVerificationListClient />;
}
