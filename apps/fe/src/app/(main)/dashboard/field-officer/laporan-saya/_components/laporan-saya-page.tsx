import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanSayaPage() {
  return (
    <DensModulePage
      title="Laporan Saya"
      role="Petugas Wilayah"
      description="Halaman ini menyiapkan tracking status laporan, feedback revisi, dan arsip laporan yang pernah dikirim."
      highlights={[
        "Daftar draft, terkirim, dalam review, dan perlu revisi.",
        "Detail feedback, riwayat status, dan bukti kiriman.",
        "Pembatasan edit setelah status terverifikasi.",
      ]}
    />
  );
}
