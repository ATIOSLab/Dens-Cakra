import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MonitoringTugasPage() {
  return (
    <DensModulePage
      title="Monitoring Tugas"
      role="Koordinator Lapangan"
      description="Halaman ini disiapkan untuk memantau acknowledgement, progres, hambatan, deadline, dan reassignment tugas lapangan."
      highlights={[
        "Status tugas aktif, overdue, dan hambatan operasional lapangan.",
        "Monitoring progres per Field Officer dan per wilayah tugas.",
        "Kontrol supervisi dan perubahan assignment bila diperlukan.",
      ]}
    />
  );
}
