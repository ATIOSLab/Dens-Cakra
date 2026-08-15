import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PengajuanPersetujuanPage() {
  return (
    <DensModulePage
      title="Pengajuan Persetujuan"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk validasi akhir produk, alur pengiriman otomatis, dan pengiriman ke Kepala BIN Daerah (Kabinda)."
      highlights={[
        "Validasi kelengkapan isian sebelum pengajuan.",
        "Alur persetujuan mengikuti garis pelaporan dan struktur wilayah.",
        "Catatan pengajuan, status kirim, dan riwayat tindak lanjut.",
      ]}
    />
  );
}
