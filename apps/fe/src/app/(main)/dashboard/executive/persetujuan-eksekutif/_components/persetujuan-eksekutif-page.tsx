import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersetujuanEksekutifPage() {
  return (
    <DensModulePage
      title="Persetujuan Eksekutif"
      role="Eksekutif"
      description="Halaman ini disiapkan untuk review strategis dan keputusan akhir atas produk intelijen yang diajukan dari regional."
      highlights={[
        "Queue approval dengan catatan, klarifikasi, dan deadline keputusan.",
        "Distribusi hasil persetujuan ke unit atau wilayah terkait.",
        "Riwayat keputusan dan jejak revisi tingkat eksekutif.",
      ]}
    />
  );
}
