import { LaporanJaringDetailClient } from "@/app/(main)/dashboard/field-officer/laporan-jaring/_components/laporan-jaring-detail-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    jaringId: string;
    laporanId: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR, SYSTEM_ROLES.REGIONAL_COMMANDER);
  const { jaringId, laporanId } = await params;

  return (
    <LaporanJaringDetailClient
      laporanId={laporanId}
      backHref={`/dashboard/field-coordinator/verifikasi-jaring/${jaringId}`}
      readOnly={true}
    />
  );
}
