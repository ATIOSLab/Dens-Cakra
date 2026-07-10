import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanMasukPage() {
  return (
    <DensModulePage
      title="Laporan Masuk"
      role="Manajer Intelijen Operasional"
      description="Halaman ini menjadi fondasi intake laporan, validasi metadata awal, dan penugasan verifikator."
      highlights={[
        "Intake aplikasi, WA Center, dan laporan darurat.",
        "Pemeriksaan metadata, lampiran, dan duplicate detection.",
        "Assign ke verifikator atau kembalikan untuk kelengkapan.",
      ]}
    />
  );
}
