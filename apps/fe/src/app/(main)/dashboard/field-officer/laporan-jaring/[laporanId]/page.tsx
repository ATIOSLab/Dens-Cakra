import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { LaporanJaringDetailClient } from "../_components/laporan-jaring-detail-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    laporanId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const { laporanId } = await params;
  return <LaporanJaringDetailClient laporanId={laporanId} />;
}
