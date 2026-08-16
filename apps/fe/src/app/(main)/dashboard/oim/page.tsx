import { DashboardStatsPage } from "@/app/(main)/dashboard/_components/dashboard-stats/dashboard-stats-page";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const principal = await requireRole(SYSTEM_ROLES.EXECUTIVE, SYSTEM_ROLES.REGIONAL_COMMANDER);

  return <DashboardStatsPage role={principal.role} searchParams={await searchParams} />;
}
