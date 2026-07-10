import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PenugasanTimPage() {
  return (
    <DensModulePage
      title="Penugasan Tim"
      role="Koordinator Lapangan"
      description="Halaman ini disiapkan untuk membuat tugas teknis, menetapkan personel, dan mengelola monitoring progres tim."
      highlights={[
        "Pemilihan petugas, jaring, sasaran, dan wilayah.",
        "Instruksi teknis, prioritas, deadline, dan reassign.",
        "Read receipt dan perintah tambahan untuk tim lapangan.",
      ]}
    />
  );
}
