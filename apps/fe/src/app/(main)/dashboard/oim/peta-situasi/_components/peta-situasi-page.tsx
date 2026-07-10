import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaSituasiPage() {
  return (
    <DensModulePage
      title="Peta Situasi"
      role="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk peta laporan, tugas, personel, dan hotspot operasional."
      highlights={[
        "Lokasi laporan, lokasi tugas, dan coverage gap.",
        "Hotspot, aksi massa, dan layer ancaman.",
        "Detail Baket dan validasi koordinat dari peta.",
      ]}
    />
  );
}
