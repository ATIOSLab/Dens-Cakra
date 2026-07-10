import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanIntelijenPage() {
  return (
    <DensModulePage
      title="Laporan Intelijen"
      role="Komandan Regional"
      description="Halaman ini menyiapkan review produk intelijen wilayah, status persetujuan, dan arsip distribusi."
      highlights={[
        "Daftar draft, menunggu persetujuan, dan arsip.",
        "Detail neraca penilaian, lampiran, dan riwayat versi.",
        "Aksi persetujuan dan distribusi pada detail laporan.",
      ]}
    />
  );
}
