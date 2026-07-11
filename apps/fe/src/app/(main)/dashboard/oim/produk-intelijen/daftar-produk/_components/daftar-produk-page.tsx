import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DaftarProdukPage() {
  return (
    <DensModulePage
      title="Daftar Produk"
      role="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk mengelola daftar produk intelijen, status draft, review, revisi, dan versioning."
      highlights={[
        "Filter berdasarkan jenis produk, status, wilayah, dan prioritas.",
        "Traceability dari produk ke Baket, verifikasi, dan approval.",
        "Riwayat versi dan catatan revisi untuk setiap produk.",
      ]}
    />
  );
}
