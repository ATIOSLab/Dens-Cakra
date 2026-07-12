import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersetujuanRegionalPage() {
  return (
    <DensModulePage
      title="Persetujuan Regional"
      role="Komandan Regional"
      description="Halaman ini disiapkan untuk persetujuan, pengembalian, klarifikasi, dan catatan revisi atas produk yang diajukan OIM."
      highlights={[
        "Approval queue dengan status, deadline, dan catatan pimpinan wilayah.",
        "Klarifikasi dan pengembalian dokumen ke OIM untuk revisi.",
        "Jejak keputusan regional sebelum eskalasi ke level eksekutif.",
      ]}
    />
  );
}
