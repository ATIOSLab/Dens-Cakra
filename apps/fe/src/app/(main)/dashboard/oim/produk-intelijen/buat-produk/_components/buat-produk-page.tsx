import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function BuatProdukPage() {
  return (
    <DensModulePage
      title="Buat Produk"
      role="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk menyusun produk intelijen dari hasil verifikasi, analisis, dan evidence terpilih."
      highlights={[
        "Pemilihan format produk sesuai baseline intelijen.",
        "Struktur fakta, analisis, dampak, dan saran tindak.",
        "Validasi field, draft, dan pengiriman ke proses persetujuan regional.",
      ]}
    />
  );
}
