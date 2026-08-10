import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanDaruratPage() {
  return (
    <DensModulePage
      title="Laporan Darurat"
      roleLabel="Koordinator Wilayah (Korwil)"
      description="Halaman ini menyiapkan koordinasi insiden darurat, kebutuhan bantuan, dan timeline penanganan lapangan."
      highlights={[
        "Alert masuk dan pembuatan laporan darurat.",
        "Situasi, tindakan, kebutuhan, dan bukti cepat.",
        "Eskalasi paralel, permintaan bantuan, dan penutupan insiden.",
      ]}
    />
  );
}
