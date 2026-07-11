import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifStrategisPage() {
  return (
    <DensModulePage
      title="Direktif Strategis"
      role="Eksekutif"
      description="Halaman ini disiapkan untuk penerbitan direktif strategis berisi KIQ, UUK/PIR, sasaran, prioritas, klasifikasi, dan deadline."
      highlights={[
        "Broadcast direktif ke satu unit, banyak unit, atau kombinasi wilayah tertentu.",
        "Read receipt, progres eksekusi, dan catatan supervisi pimpinan.",
        "Lampiran, target hasil, dan riwayat perubahan direktif.",
      ]}
    />
  );
}
