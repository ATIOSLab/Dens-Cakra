import { redirect } from "next/navigation";

import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ verificationId: string }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  const { verificationId } = await params;
  const verification = await apiServerGet<{
    baketVersion?: { baket?: { id?: string } };
  }>(`/verifications/${verificationId}`);
  const baketId = verification.baketVersion?.baket?.id;

  redirect(
    baketId
      ? `/dashboard/oim/laporan-masuk/${baketId}?tab=verification`
      : "/dashboard/oim/laporan-masuk?status=UNDER_VERIFICATION",
  );
}
