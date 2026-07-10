import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export default async function FieldCoordinatorLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);

  return children;
}
