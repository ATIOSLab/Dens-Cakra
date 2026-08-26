import { redirect } from "next/navigation";

import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ verificationId: string }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.NATIONAL_LEADER, SYSTEM_ROLES.EXECUTIVE, SYSTEM_ROLES.REGIONAL_COMMANDER);
  const { verificationId } = await params;
  const verification = await apiServerGet<{
    baketVersion?: { baket?: { id?: string } };
  }>(`/verifications/${verificationId}`);
  const baketId = verification.baketVersion?.baket?.id;

  redirect(baketId ? `/dashboard/baket/${baketId}` : "/dashboard/baket");
}
