import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DaftarProdukPage() {
  return (
    <DensModulePage
      title="Daftar Produk"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk mengelola daftar produk intelijen, status draf, peninjauan, revisi, dan riwayat versi."
      highlights={[
        "Filter berdasarkan jenis produk, status, wilayah, dan prioritas.",
        "Ketertelusuran dari produk ke Baket, verifikasi, dan persetujuan.",
        "Riwayat versi dan catatan revisi untuk setiap produk.",
      ]}
    />
  );
}
