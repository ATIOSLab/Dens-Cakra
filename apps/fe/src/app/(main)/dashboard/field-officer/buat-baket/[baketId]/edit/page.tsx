import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ baketId: string }> };

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const { baketId } = await params;
  redirect(`/dashboard/field-officer/buat-baket/${baketId}`);
}
