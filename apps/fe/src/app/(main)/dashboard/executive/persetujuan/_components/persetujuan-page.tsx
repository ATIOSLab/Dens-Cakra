import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersetujuanPage() {
  return (
    <DensModulePage
      title="Persetujuan"
      role="Eksekutif"
      description="Halaman ini disiapkan untuk antrian persetujuan, review versi laporan, dan catatan revisi berjenjang."
      highlights={[
        "Antrian item yang menunggu persetujuan pimpinan.",
        "Perbandingan versi dan catatan analis.",
        "Aksi setujui, kembalikan, dan status distribusi.",
      ]}
    />
  );
}
