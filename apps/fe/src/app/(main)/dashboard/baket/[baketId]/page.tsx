import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import type { BaketRecord } from "../_components/baket-data";
import { BaketDetail } from "../_components/baket-detail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    baketId: string;
  }>;
};

export default async function BaketDetailPage({ params }: PageProps) {
  await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );

  const { baketId } = await params;
  const baket = await apiServerGet<BaketRecord>(`/bakets/${baketId}`);

  return <BaketDetail baket={baket} />;
}
