import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KpiEvaluasiPage() {
  return (
    <DensModulePage
      title="KPI & Evaluasi"
      role="Komandan Regional"
      description="Halaman ini menyiapkan evaluasi capaian wilayah, kualitas laporan, dan efektivitas personel operasional."
      highlights={[
        "Pemenuhan UUK, jumlah laporan, dan tingkat validasi.",
        "Waktu respons, revisi laporan, dan coverage.",
        "Laporan triwulan dan tahunan per wilayah.",
      ]}
    />
  );
}
