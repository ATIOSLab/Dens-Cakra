import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function TugasSayaPage() {
  return (
    <DensModulePage
      title="Tugas Saya"
      role="Petugas Wilayah"
      description="Halaman ini menyiapkan daftar tugas aktif petugas, detail sasaran, dan progres pelaksanaan lapangan."
      highlights={[
        "Daftar tugas, deadline, prioritas, dan wilayah tugas.",
        "Catatan koordinator, lampiran panduan, dan status progres.",
        "Akses cepat menuju aksi Kirim Baket.",
      ]}
    />
  );
}
