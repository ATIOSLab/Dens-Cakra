import { DashboardStatsPage } from "@/app/(main)/dashboard/_components/dashboard-stats/dashboard-stats-page";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

export default function Page() {
  return <DashboardStatsPage role={SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER} />;
}
