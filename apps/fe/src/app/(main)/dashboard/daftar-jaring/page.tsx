import { FieldOfficerOperationsPage } from "@/app/(main)/dashboard/field-officer/_components/field-officer-operations-page";
import { apiServerGet } from "@/lib/api/server-client";
import { getSessionPrincipal, requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringVerificationListClient, type RegistrationJaring } from "./_components/verification-client";

export const dynamic = "force-dynamic";
const BACKEND_MAX_LIMIT = 100;

async function fetchAllByRegistrationStatus(registrationStatus: RegistrationJaring["registrationStatus"]) {
  const items: RegistrationJaring[] = [];
  let page = 1;
  let batch: RegistrationJaring[];

  do {
    batch = await apiServerGet<RegistrationJaring[]>("/jaring", {
      registrationStatus,
      page,
      limit: BACKEND_MAX_LIMIT,
    });

    items.push(...batch);
    page += 1;
  } while (batch.length === BACKEND_MAX_LIMIT);

  return items;
}

export default async function Page() {
  await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  const principal = await getSessionPrincipal();

  if (principal?.role === SYSTEM_ROLES.FIELD_OFFICER) {
    return <FieldOfficerOperationsPage view="jaring" />;
  }

  const lists = await Promise.all((["PENDING", "APPROVED", "REJECTED"] as const).map(fetchAllByRegistrationStatus));
  const items = lists.flat();

  return <JaringVerificationListClient initialItems={items} />;
}
