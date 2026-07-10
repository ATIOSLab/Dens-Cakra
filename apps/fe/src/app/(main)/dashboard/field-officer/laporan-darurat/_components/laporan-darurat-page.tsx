import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanDaruratPage() {
  return (
    <DensModulePage
      title="Laporan Darurat"
      role="Petugas Lapangan"
      description="Halaman ini menyiapkan panic reporting, bukti cepat, dan komunikasi bantuan darurat untuk petugas lapangan."
      highlights={[
        "Situasi singkat, lokasi otomatis, dan tindakan yang dilakukan.",
        "Kebutuhan bantuan, foto cepat, dan audio cepat bila diizinkan.",
        "Status bantuan dan instruksi lanjutan dari komando.",
      ]}
    />
  );
}
