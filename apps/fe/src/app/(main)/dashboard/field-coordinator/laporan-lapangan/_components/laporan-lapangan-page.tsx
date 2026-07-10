import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanLapanganPage() {
  return (
    <DensModulePage
      title="Laporan Lapangan"
      role="Koordinator Lapangan"
      description="Halaman ini menjadi fondasi untuk review awal laporan petugas, pemeriksaan bukti, dan penerusan ke level operasional."
      highlights={[
        "Daftar laporan baru, perlu dilengkapi, dan siap diteruskan.",
        "Kelengkapan bukti, koordinat, dan hubungan ke tugas.",
        "Catatan pengembangan, revisi, dan status laporan.",
      ]}
    />
  );
}
