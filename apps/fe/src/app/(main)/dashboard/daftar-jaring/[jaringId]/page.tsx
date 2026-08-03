import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringVerificationDetailClient, type RegistrationJaring } from "../_components/verification-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    jaringId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  const { jaringId } = await params;
  const item = await apiServerGet<RegistrationJaring>(`/jaring/${jaringId}`);

  return <JaringVerificationDetailClient item={item} />;
}
