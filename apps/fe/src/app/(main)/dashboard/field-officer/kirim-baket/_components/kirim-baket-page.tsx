import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KirimBaketPage() {
  return (
    <DensModulePage
      title="Kirim Baket"
      role="Petugas Lapangan"
      description="Halaman inti ini disiapkan untuk pengiriman Baket, bukti multimedia, dan penyimpanan draft lapangan."
      highlights={[
        "Input 5W+1H, tugas terkait, dan lokasi GPS.",
        "Upload foto, video, dokumen, dan audio bila diizinkan.",
        "Draft offline, preview, kirim, dan retry upload.",
      ]}
    />
  );
}
