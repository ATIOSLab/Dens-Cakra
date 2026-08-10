import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function ProdukIntelijenPage() {
  return (
    <DensModulePage
      title="Produk Intelijen"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini menjadi fondasi penyusunan produk intelijen, riwayat versi, dan pengajuan persetujuan."
      highlights={[
        "Pilih jenis produk, sumber laporan, dan metadata klasifikasi.",
        "Struktur baku fakta, analisis, dampak, dan saran tindak.",
        "Pratinjau, pengajuan persetujuan, revisi, dan arsip.",
      ]}
    />
  );
}
