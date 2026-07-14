import type { ReactNode } from "react";

import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { FieldOfficerLocationPublisher } from "./_components/field-officer-location-publisher";

export default async function FieldOfficerLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);

  return (
    <>
      <FieldOfficerLocationPublisher />
      {children}
    </>
  );
}
