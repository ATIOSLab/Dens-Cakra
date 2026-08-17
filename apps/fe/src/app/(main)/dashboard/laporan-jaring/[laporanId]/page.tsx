import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import { LaporanJaringDetailClient } from "../_components/laporan-jaring-detail-client";
import { LaporanJaringLeadershipDetailClient } from "../_components/laporan-jaring-leadership-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    laporanId: string;
  }>;
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function LaporanJaringDetailPage({ params, searchParams }: PageProps) {
  const principal = await requireRole(
    SYSTEM_ROLES.NATIONAL_LEADER,
    SYSTEM_ROLES.EXECUTIVE,
    SYSTEM_ROLES.FIELD_OFFICER,
    SYSTEM_ROLES.FIELD_COORDINATOR,
    SYSTEM_ROLES.REGIONAL_COMMANDER,
  );
  const { laporanId } = await params;
  const sParams = (await searchParams) ?? {};

  const defaultBackHref = "/dashboard/laporan-jaring";
  const backHref = sParams.from === "baket" ? "/dashboard/baket" : defaultBackHref;

  if (principal.role === SYSTEM_ROLES.FIELD_OFFICER || principal.role === SYSTEM_ROLES.FIELD_COORDINATOR) {
    return <LaporanJaringDetailClient laporanId={laporanId} backHref={backHref} role={principal.role} />;
  }

  return <LaporanJaringLeadershipDetailClient reportSessionId={laporanId} backHref={backHref} />;
}
