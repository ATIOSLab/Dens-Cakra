import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanProdukIntelijenPage() {
  return (
    <DensModulePage
      title="Laporan & Produk Intelijen"
      roleLabel="Kepala BIN Daerah (Kabinda)"
      description="Halaman ini disiapkan untuk membaca produk dari OIM beserta Baket sumber, analisis, Neraca Penilaian, dan lampiran pendukung."
      highlights={[
        "Daftar produk intelijen regional dengan versi dan status peninjauan.",
        "Akses ke Baket sumber, lampiran, dan jejak verifikasi.",
        "Ringkasan rekomendasi serta isu prioritas per wilayah.",
      ]}
    />
  );
}
