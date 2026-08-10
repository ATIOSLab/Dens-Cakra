import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { DkiSupervisionClient, type DkiSupervisionResource } from "./_components/dki-supervision-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const initialData = await apiServerGet<DkiSupervisionResource>("/user-profiles/dki-supervision");

  return <DkiSupervisionClient initialData={initialData} />;
}
