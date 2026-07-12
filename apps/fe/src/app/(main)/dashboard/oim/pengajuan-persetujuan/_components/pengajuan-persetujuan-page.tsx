import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PengajuanPersetujuanPage() {
  return (
    <DensModulePage
      title="Pengajuan Persetujuan"
      role="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk validasi akhir produk, routing otomatis, dan pengiriman ke Komandan Regional."
      highlights={[
        "Validasi kelengkapan field sebelum submission.",
        "Routing approval sesuai reporting line dan struktur wilayah.",
        "Catatan pengajuan, status kirim, dan riwayat tindak lanjut.",
      ]}
    />
  );
}
