import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaKerawananPage() {
  return (
    <DensModulePage
      title="Peta Kerawanan Nasional"
      role="Eksekutif"
      description="Halaman ini disiapkan untuk memetakan kerawanan nasional berdasarkan wilayah, isu, tren, dan indikator peringatan dini."
      highlights={[
        "Heatmap kerawanan berdasarkan wilayah dan kategori isu.",
        "Indikator hotspot, blind spot, dan tren eskalasi.",
        "Drill-down dari level nasional ke unit atau wilayah terkait.",
      ]}
    />
  );
}
