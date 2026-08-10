import { DashboardStatsPage } from "@/app/(main)/dashboard/_components/dashboard-stats/dashboard-stats-page";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <DashboardStatsPage role={SYSTEM_ROLES.FIELD_COORDINATOR} searchParams={await searchParams} />;
}
