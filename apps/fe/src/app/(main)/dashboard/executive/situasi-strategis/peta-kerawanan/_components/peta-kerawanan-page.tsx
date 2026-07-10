import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaKerawananPage() {
  return (
    <DensModulePage
      title="Peta Kerawanan"
      role="Eksekutif"
      description="Halaman ini disiapkan untuk visualisasi heatmap ancaman, blind spot, dan sebaran laporan strategis."
      highlights={[
        "Layer ancaman berdasarkan domain kerawanan.",
        "Drill-down provinsi, kabupaten/kota, dan kecamatan.",
        "Korelasi kejadian dan titik hotspot prioritas.",
      ]}
    />
  );
}
