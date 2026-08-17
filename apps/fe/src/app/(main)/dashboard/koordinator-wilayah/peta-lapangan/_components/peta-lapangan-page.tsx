import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PetaLapanganPage() {
  return (
    <DensModulePage
      title="Peta Lapangan"
      roleLabel="Koordinator Wilayah (Korwil)"
      description="Halaman ini disiapkan untuk cakupan wilayah tugas, lokasi sasaran, dan pemantauan titik laporan lapangan."
      highlights={[
        "Wilayah tugas, lokasi kejadian, dan posisi petugas sesuai izin.",
        "Rute, titik laporan, dan alert sekitar.",
        "Fondasi mode lokasi tersembunyi dan visualisasi cakupan.",
      ]}
    />
  );
}
