import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function TugasDiterimaPage() {
  return (
    <DensModulePage
      title="Tugas Diterima"
      role="Koordinator Lapangan"
      description="Halaman ini menyiapkan daftar direktif teknis, target tugas, dan konfirmasi penerimaan dari Korwil."
      highlights={[
        "UUK/PIR terkait, sasaran, dan wilayah tugas.",
        "Deadline, klasifikasi, dan catatan atasan.",
        "Status progres awal serta lampiran panduan.",
      ]}
    />
  );
}
