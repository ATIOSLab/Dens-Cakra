import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { KonfigurasiSistemClient } from "./_components/konfigurasi-sistem-client";

export const dynamic = "force-dynamic";

export default async function KonfigurasiSistemPage() {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  return <KonfigurasiSistemClient />;
}
