import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MasterDataPage() {
  return (
    <DensModulePage
      title="Master Data"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk pengelolaan klasifikasi, kode produk, kategori isu, prioritas, wilayah administratif, dan referensi sistem lainnya."
      highlights={[
        "Master klasifikasi, jenis produk intelijen, dan kode produk.",
        "Kategori isu, prioritas, evidence, dan status workflow.",
        "Referensi wilayah administratif, format nomor, dan kode organisasi.",
      ]}
    />
  );
}
