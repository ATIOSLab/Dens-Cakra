import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export default async function AdminSystemLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  return children;
}
