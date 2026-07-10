import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function TugasLapanganPage() {
  return (
    <DensModulePage
      title="Tugas Lapangan"
      role="Koordinator Lapangan"
      description="Halaman induk ini disiapkan untuk menerima tugas, membagi tugas teknis, dan memantau eksekusi lapangan."
      highlights={[
        "Akses cepat ke tugas diterima dan penugasan tim.",
        "Fondasi untuk status progres, prioritas, dan read receipt.",
        "Dasar koordinasi antara arahan pimpinan dan pelaksana lapangan.",
      ]}
    />
  );
}
