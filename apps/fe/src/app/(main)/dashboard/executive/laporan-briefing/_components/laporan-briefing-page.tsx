import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function LaporanBriefingPage() {
  return (
    <DensModulePage
      title="Laporan & Briefing"
      roleLabel="Deputi II"
      description="Halaman ini menjadi fondasi kompilasi produk intelijen, executive summary, dan paket briefing pimpinan."
      highlights={[
        "Kompilasi laporan strategis untuk kebutuhan briefing periodik.",
        "Template executive summary dan ringkasan isu prioritas.",
        "Seleksi produk, lampiran, dan distribusi hasil briefing.",
      ]}
    />
  );
}
