import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { LaporanJaringDetailClient } from "../_components/laporan-jaring-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    laporanId: string;
  }>;
  searchParams?: Promise<{
    from?: string;
  }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const { laporanId } = await params;
  const sParams = (await searchParams) ?? {};
  const backHref = sParams.from === "baket" ? "/dashboard/field-officer/baket" : "/dashboard/field-officer/laporan-jaring";

  return <LaporanJaringDetailClient laporanId={laporanId} backHref={backHref} />;
}
