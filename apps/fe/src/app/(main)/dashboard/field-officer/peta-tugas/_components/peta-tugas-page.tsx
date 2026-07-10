import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaTugasPage() {
  return (
    <DensModulePage
      title="Peta Tugas"
      role="Petugas Lapangan"
      description="Halaman ini menjadi fondasi peta operasional pribadi untuk sasaran, rute, dan alert sekitar petugas."
      highlights={[
        "Lokasi sasaran, area penugasan, dan titik aman.",
        "Rute, titik laporan, dan status GPS.",
        "Mode stealth dan share location sesuai kebijakan.",
      ]}
    />
  );
}
