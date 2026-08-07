import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PenugasanFieldOfficerPage() {
  return (
    <DensModulePage
      title="Penugasan Petugas Wilayah (Gaswil)"
      role="Koordinator Lapangan"
      description="Halaman ini disiapkan untuk membagi tugas kepada Petugas Wilayah (Gaswil) berdasarkan wilayah, target, batas waktu, dan prioritas."
      highlights={[
        "Pemilihan Petugas Wilayah (Gaswil) berdasarkan cakupan dan beban kerja.",
        "Instruksi operasional, lampiran, dan target hasil per penugasan.",
        "Riwayat distribusi tugas dan perubahan assignment.",
      ]}
    />
  );
}
