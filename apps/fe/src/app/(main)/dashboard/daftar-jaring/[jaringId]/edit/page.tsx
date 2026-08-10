import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { JaringRegistrationForm } from "../../_components/jaring-registration-form";

type PageProps = {
  params: Promise<{
    jaringId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);

  const { jaringId } = await params;
  return <JaringRegistrationForm jaringId={jaringId} />;
}
