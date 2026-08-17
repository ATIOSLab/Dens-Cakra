import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaSituasiPage() {
  return (
    <DensModulePage
      title="Peta Situasi"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk peta laporan, tugas, personel, dan hotspot operasional."
      highlights={[
        "Lokasi laporan, lokasi tugas, dan kesenjangan cakupan.",
        "Hotspot, aksi massa, dan layer ancaman.",
        "Detail Baket dan validasi koordinat dari peta.",
      ]}
    />
  );
}
