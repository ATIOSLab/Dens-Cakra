import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PenugasanTimPage() {
  return (
    <DensModulePage
      title="Penugasan Tim"
      roleLabel="Koordinator Wilayah (Korwil)"
      description="Halaman ini disiapkan untuk membuat tugas teknis, menetapkan personel, dan mengelola monitoring progres tim."
      highlights={[
        "Pemilihan petugas, jaring, sasaran, dan wilayah.",
        "Instruksi teknis, prioritas, tenggat, dan penugasan ulang.",
        "Status baca dan perintah tambahan untuk tim lapangan.",
      ]}
    />
  );
}
