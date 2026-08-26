import type { OimView } from "@/app/(main)/dashboard/anev/_components/oim-types";
import { OimWorkspacePage } from "@/app/(main)/dashboard/anev/_components/oim-workspace-page";
import { ComingSoonPage } from "@/app/(main)/dashboard/coming-soon/page";

type UniversalDensRoutePageProps = {
  routePattern: string;
  params?: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildDescription() {
  return "Modul ini belum diaktifkan untuk ruang kerja Anda. Gunakan menu yang tersedia atau hubungi administrator sistem.";
}

function resolveOimView(route: string): OimView | null {
  if (!route.startsWith("/dashboard/anev") || route.includes("/direktif-tugas")) return null;
  if (route === "/dashboard/anev") return "dashboard";
  if (route.includes("/verifikasi-neraca-penilaian/[verificationId]")) return "verification-detail";
  if (route.endsWith("/verifikasi-neraca-penilaian")) return "verification";

  if (route.includes("/pengajuan-persetujuan/workflow/")) return "workflow-detail";
  if (route.includes("/pengajuan-persetujuan/[productId]")) return "approval-detail";
  if (route.endsWith("/pengajuan-persetujuan")) return "approval";
  return null;
}

export function UniversalDensRoutePage({ routePattern, params = {}, searchParams = {} }: UniversalDensRoutePageProps) {
  const oimView = resolveOimView(routePattern);
  if (oimView) {
    return <OimWorkspacePage view={oimView} params={params} searchParams={searchParams} />;
  }
  return <ComingSoonPage title="Modul Belum Tersedia" description={buildDescription()} />;
}

export default UniversalDensRoutePage;
