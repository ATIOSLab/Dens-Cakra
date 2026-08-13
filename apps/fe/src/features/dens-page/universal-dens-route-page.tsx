import { ComingSoonPage } from "@/app/(main)/dashboard/coming-soon/page";
import type { OimView } from "@/app/(main)/dashboard/oim/_components/oim-types";
import { OimWorkspacePage } from "@/app/(main)/dashboard/oim/_components/oim-workspace-page";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";

type UniversalDensRoutePageProps = {
  routePattern: string;
  params?: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

function buildDescription() {
  return "Modul ini belum diaktifkan untuk ruang kerja Anda. Gunakan menu yang tersedia atau hubungi administrator sistem.";
}

function resolveOimView(route: string): OimView | null {
  if (!route.startsWith("/dashboard/oim") || route.includes("/direktif-tugas")) return null;
  if (route === "/dashboard/oim") return "dashboard";
  if (route.includes("/laporan-masuk/[baketId]/versions/")) return "report-version";
  if (route.includes("/laporan-masuk/[baketId]")) return "report-detail";
  if (route.endsWith("/laporan-masuk")) return "reports";
  if (route.includes("/verifikasi-neraca-penilaian/[verificationId]")) return "verification-detail";
  if (route.endsWith("/verifikasi-neraca-penilaian")) return "verification";
  if (route.includes("/analisis-intelijen/[caseId]/versions/")) return "analysis-version";
  if (route.includes("/analisis-intelijen/[caseId]/edit")) return "analysis-edit";
  if (route.includes("/analisis-intelijen/[caseId]")) return "analysis-detail";
  if (route.endsWith("/analisis-intelijen/baru")) return "analysis-new";
  if (route.endsWith("/analisis-intelijen")) return "analysis";
  if (route.includes("/produk-intelijen/daftar-produk/[productId]/versions/")) return "product-version";
  if (route.includes("/produk-intelijen/daftar-produk/[productId]/edit")) return "product-edit";
  if (route.includes("/produk-intelijen/daftar-produk/[productId]")) return "product-detail";
  if (route.endsWith("/produk-intelijen/daftar-produk")) return "product-list";
  if (route.includes("/produk-intelijen/buat-produk/[productId]/edit")) return "product-edit";
  if (route.includes("/produk-intelijen/buat-produk")) return "product-new";
  if (route.endsWith("/produk-intelijen")) return "products";
  if (route.includes("/laporan-informasi/[productId]/versions/")) return "product-version";
  if (route.includes("/laporan-informasi/[productId]/edit")) return "product-edit";
  if (route.includes("/laporan-informasi/[productId]")) return "product-detail";
  if (route.endsWith("/laporan-informasi/buat")) return "product-new";
  if (route.endsWith("/laporan-informasi")) return "product-list";
  if (route.includes("/pengajuan-persetujuan/workflow/")) return "workflow-detail";
  if (route.includes("/pengajuan-persetujuan/[productId]")) return "approval-detail";
  if (route.endsWith("/pengajuan-persetujuan")) return "approval";
  if (route.includes("/monitoring-lapangan/tugas/")) return "monitoring-task";
  if (route.includes("/monitoring-lapangan/baket/")) return "monitoring-report";
  if (route.includes("/monitoring-lapangan/personel/")) return "monitoring-personnel";
  if (route.endsWith("/monitoring-lapangan")) return "monitoring";
  if (route.includes("/peta-situasi/baket/")) return "map-report";
  if (route.includes("/peta-situasi/alert/")) return "map-alert";
  if (route.endsWith("/peta-situasi")) return "map";
  return null;
}

export function UniversalDensRoutePage({ routePattern, params = {}, searchParams = {} }: UniversalDensRoutePageProps) {
  const oimView = resolveOimView(routePattern);
  if (oimView) {
    const isInformationReport = routePattern.includes("/laporan-informasi");

    return (
      <OimWorkspacePage
        view={oimView}
        params={params}
        searchParams={searchParams}
        productContext={
          isInformationReport
            ? {
                productTypeCode: "LAPORAN_INFORMASI",
                label: DOMAIN_TERMS.informationReport,
                listTitle: `Daftar ${DOMAIN_TERMS.informationReport}`,
                createTitle: `Buat ${DOMAIN_TERMS.informationReport}`,
                detailTitle: `Detail ${DOMAIN_TERMS.informationReport}`,
                listPath: "/dashboard/oim/laporan-informasi",
                createPath: "/dashboard/oim/laporan-informasi/buat",
                detailBasePath: "/dashboard/oim/laporan-informasi",
              }
            : undefined
        }
      />
    );
  }
  return <ComingSoonPage title="Modul Belum Tersedia" description={buildDescription()} />;
}

export default UniversalDensRoutePage;
