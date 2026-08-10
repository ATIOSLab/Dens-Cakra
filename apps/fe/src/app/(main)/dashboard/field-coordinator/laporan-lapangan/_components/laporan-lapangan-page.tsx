import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanLapanganPage() {
  return (
    <DensModulePage
      title="Laporan Lapangan"
      roleLabel="Koordinator Wilayah (Korwil)"
      description="Halaman ini menjadi fondasi untuk peninjauan awal laporan petugas, pemeriksaan bukti, dan penerusan ke level operasional."
      highlights={[
        "Daftar laporan baru, laporan siap dibuat Baket, dan laporan yang sudah ditindaklanjuti.",
        "Bukti, Live Location, koordinat, dan hubungan ke tugas.",
        "Catatan pengembangan, revisi, dan status laporan.",
      ]}
    />
  );
}
