import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanSayaPage() {
  return (
    <DensModulePage
      title="Laporan Saya"
      roleLabel="Petugas Wilayah (Gaswil)"
      description="Halaman ini menyiapkan pelacakan status laporan, umpan balik revisi, dan arsip laporan yang pernah dikirim."
      highlights={[
        "Daftar draf, terkirim, dalam peninjauan, dan perlu revisi.",
        "Detail umpan balik, riwayat status, dan bukti kiriman.",
        "Pembatasan edit setelah laporan diproses menjadi Bahan Keterangan (Baket).",
      ]}
    />
  );
}
