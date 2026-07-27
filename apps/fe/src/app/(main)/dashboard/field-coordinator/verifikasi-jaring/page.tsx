import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringVerificationListClient, type RegistrationJaring } from "./verification-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const lists = await Promise.all(
    (["PENDING", "APPROVED", "REJECTED"] as const).map((registrationStatus) =>
      apiServerGet<RegistrationJaring[]>("/jaring", {
        registrationStatus,
        limit: 100,
      }),
    ),
  );
  const items = lists.flat();

  return <JaringVerificationListClient initialItems={items} />;
}
