import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function OrganisasiWilayahPage() {
  return (
    <DensModulePage
      title="Organisasi & Wilayah"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk pengelolaan organisasi, unit, tipe unit, parent unit, dan wilayah kerja."
      highlights={[
        "Pembuatan organisasi, unit, dan pengaturan struktur parent-child.",
        "Pengelolaan tipe unit, wilayah, serta status aktif atau nonaktif.",
        "Visualisasi struktur organisasi dan cakupan wilayah operasional.",
      ]}
    />
  );
}
