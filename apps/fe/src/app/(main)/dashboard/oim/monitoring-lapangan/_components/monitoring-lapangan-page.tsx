import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MonitoringLapanganPage() {
  return (
    <DensModulePage
      title="Monitoring Lapangan"
      role="Manajer Intelijen Operasional"
      description="Halaman ini menyiapkan kontrol progres tugas lapangan, status personel, dan supervisi keterlambatan."
      highlights={[
        "Status Korwil, Petugas Wilayah, dan deadline.",
        "Coverage, beban kerja, dan kebutuhan dukungan.",
        "Eskalasi keterlambatan dan tindak supervisi.",
      ]}
    />
  );
}
