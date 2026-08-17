import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function SituasiStrategisPage() {
  return (
    <DensModulePage
      title="Situasi Strategis"
      roleLabel="Deputi II"
      description="Ruang kerja strategis untuk memantau dinamika wilayah, tren ancaman, dan sinyal peringatan dini pada level pimpinan."
      highlights={[
        "Ringkasan kondisi wilayah prioritas dan isu strategis.",
        "Akses cepat menuju peta kerawanan dan peringatan dini.",
        "Fondasi untuk heatmap ancaman, alert, dan drill-down wilayah.",
      ]}
    />
  );
}
