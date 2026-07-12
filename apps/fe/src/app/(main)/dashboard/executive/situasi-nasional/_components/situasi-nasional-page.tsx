import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function SituasiNasionalPage() {
  return (
    <DensModulePage
      title="Situasi Nasional"
      role="Eksekutif"
      description="Halaman ini menjadi ringkasan situasi nasional untuk pemantauan Panca Gatra, hotspot, early warning, dan area prioritas strategis."
      highlights={[
        "Peta kerawanan nasional dan heatmap isu prioritas.",
        "Peringatan dini, blind spot, dan drill-down wilayah.",
        "Ringkasan perkembangan UUK/PIR dan produk prioritas.",
      ]}
    />
  );
}
