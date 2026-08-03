import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { LaporanJaringLeadershipDetailClient } from "../_components/laporan-jaring-leadership-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    reportSessionId: string;
  }>;
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  const { reportSessionId } = await params;
  const sParams = (await searchParams) ?? {};
  const backHref = sParams.from === "baket" ? "/dashboard/field-coordinator/baket" : "/dashboard/field-coordinator/laporan-jaring";

  return <LaporanJaringLeadershipDetailClient reportSessionId={reportSessionId} backHref={backHref} />;
}
