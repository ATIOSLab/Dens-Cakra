import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { LaporanPembinaanDetailCoordinatorClient } from "../_components/laporan-pembinaan-detail-coordinator-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    reportId: string;
  }>;
};

export default async function LaporanPembinaanDetailPage({ params }: PageProps) {
  await requireRole(
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );
  const { reportId } = await params;

  return <LaporanPembinaanDetailCoordinatorClient reportId={reportId} />;
}
