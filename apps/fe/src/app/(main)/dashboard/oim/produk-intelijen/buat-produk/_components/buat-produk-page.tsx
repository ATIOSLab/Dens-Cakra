import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function BuatProdukPage() {
  return (
    <DensModulePage
      title="Buat Produk"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk menyusun produk intelijen dari hasil verifikasi, analisis, dan bukti terpilih."
      highlights={[
        "Pemilihan format produk sesuai baseline intelijen.",
        "Struktur fakta, analisis, dampak, dan saran tindak.",
        "Validasi isian, draf, dan pengiriman ke proses persetujuan regional.",
      ]}
    />
  );
}
