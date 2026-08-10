import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MonitoringTugasPage() {
  return (
    <DensModulePage
      title="Monitoring Tugas"
      roleLabel="Koordinator Wilayah (Korwil)"
      description="Halaman ini disiapkan untuk memantau konfirmasi penerimaan, progres, hambatan, batas waktu, dan pengalihan tugas lapangan."
      highlights={[
        "Status tugas aktif, overdue, dan hambatan operasional lapangan.",
        "Monitoring progres per Petugas Wilayah (Gaswil) dan per wilayah tugas.",
        "Kontrol supervisi dan perubahan penugasan bila diperlukan.",
      ]}
    />
  );
}
