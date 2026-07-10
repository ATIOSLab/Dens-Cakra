import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KomandoRegionalPage() {
  return (
    <DensModulePage
      title="Komando Regional"
      role="Komandan Regional"
      description="Halaman ini menyiapkan kontrol operasional wilayah, kondisi unit subordinat, dan arahan lintas operasi."
      highlights={[
        "Ringkasan operasi aktif pada wilayah tanggung jawab.",
        "Status dukungan, hambatan operasi, dan isu prioritas.",
        "Dasar untuk quick action supervisi dan drill-down unit.",
      ]}
    />
  );
}
