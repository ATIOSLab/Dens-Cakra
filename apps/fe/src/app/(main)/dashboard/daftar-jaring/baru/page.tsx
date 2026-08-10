import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringRegistrationForm } from "../_components/jaring-registration-form";

export default async function Page() {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);

  return <JaringRegistrationForm />;
}
