import { ExecutivePersonnelDetailClient } from "@/app/(main)/dashboard/executive/personil/_components/executive-personnel-detail-client";
import type { PersonnelDetail } from "@/app/(main)/dashboard/executive/personil/_components/executive-personnel-types";
import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ assignmentId: string }>;
};

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.REGIONAL_COMMANDER);
  const { assignmentId } = await params;
  const detail = await apiServerGet<PersonnelDetail>(`/regional-commander/personnel/${assignmentId}`);

  return (
    <ExecutivePersonnelDetailClient backHref="/dashboard/regional-commander/personel-jaring" detail={detail} />
  );
  const { assignmentId } = await params;

  redirect(`/dashboard/regional-commander/personel-lapangan/${assignmentId}`);
}
