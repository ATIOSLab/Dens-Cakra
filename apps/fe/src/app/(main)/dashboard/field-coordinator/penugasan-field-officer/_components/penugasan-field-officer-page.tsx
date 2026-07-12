import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PenugasanFieldOfficerPage() {
  return (
    <DensModulePage
      title="Penugasan Field Officer"
      role="Koordinator Lapangan"
      description="Halaman ini disiapkan untuk membagi tugas kepada Field Officer berdasarkan wilayah, target, deadline, dan prioritas."
      highlights={[
        "Pemilihan Field Officer berdasarkan coverage dan workload.",
        "Instruksi operasional, lampiran, dan target hasil per penugasan.",
        "Riwayat distribusi tugas dan perubahan assignment.",
      ]}
    />
  );
}
