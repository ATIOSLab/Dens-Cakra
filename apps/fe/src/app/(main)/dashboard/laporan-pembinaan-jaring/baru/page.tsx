import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { LaporanPembinaanClient } from "../_components/laporan-pembinaan-client";

export const dynamic = "force-dynamic";

export default async function LaporanPembinaanBaruPage() {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  return <LaporanPembinaanClient openCreateDialogOnMount />;
}
