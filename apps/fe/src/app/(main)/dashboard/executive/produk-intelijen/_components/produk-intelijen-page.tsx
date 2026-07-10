import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function ProdukIntelijenPage() {
  return (
    <DensModulePage
      title="Produk Intelijen"
      role="Eksekutif"
      description="Halaman ini menyiapkan ruang review produk intelijen, distribusi, dan arsip pada level eksekutif."
      highlights={[
        "Daftar produk intelijen dan status tindak lanjut.",
        "Detail executive summary, lampiran, dan sumber laporan.",
        "Riwayat versi, distribusi, dan arsip dokumen.",
      ]}
    />
  );
}
