import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersetujuanEksekutifPage() {
  return (
    <DensModulePage
      title="Persetujuan Deputi II"
      roleLabel="Deputi II"
      description="Halaman ini disiapkan untuk peninjauan strategis dan keputusan akhir atas produk intelijen yang diajukan dari regional."
      highlights={[
        "Antrean persetujuan dengan catatan, klarifikasi, dan tenggat keputusan.",
        "Distribusi hasil persetujuan ke unit atau wilayah terkait.",
        "Riwayat keputusan dan jejak revisi tingkat eksekutif.",
      ]}
    />
  );
}
