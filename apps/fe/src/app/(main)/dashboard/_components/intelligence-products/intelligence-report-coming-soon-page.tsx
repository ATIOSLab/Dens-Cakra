import { ComingSoonPage } from "@/app/(main)/dashboard/coming-soon/page";

type IntelligenceReportComingSoonPageProps = {
  title?: string;
  description?: string;
};

const DEFAULT_DESCRIPTION =
  "Menu Laporan Intelijen belum difungsikan. Daftar, penyusunan, distribusi, dan peninjauan Laporan Intelijen akan diaktifkan setelah alur produk intelijen siap digunakan.";

export function IntelligenceReportComingSoonPage({
  title = "Laporan Intelijen Dalam Pengembangan",
  description = DEFAULT_DESCRIPTION,
}: IntelligenceReportComingSoonPageProps) {
  return <ComingSoonPage title={title} description={description} />;
}
