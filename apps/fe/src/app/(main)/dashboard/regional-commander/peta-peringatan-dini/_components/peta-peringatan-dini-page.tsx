import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaPeringatanDiniPage() {
  return (
    <DensModulePage
      title="Peta & Peringatan Dini"
      role="Komandan Regional"
      description="Halaman ini menyiapkan peta situasi regional, hotspot, dan alert eskalasi berbasis wilayah."
      highlights={[
        "Peta kerawanan, aksi massa, dan sebaran personel.",
        "Hotspot, blind spot, dan detail laporan dari titik peta.",
        "Tab internal untuk situasi, personel, dan alert.",
      ]}
    />
  );
}
