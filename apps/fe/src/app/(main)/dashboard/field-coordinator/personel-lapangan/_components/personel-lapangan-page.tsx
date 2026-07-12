import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersonelLapanganPage() {
  return (
    <DensModulePage
      title="Personel Lapangan"
      role="Koordinator Lapangan"
      description="Halaman ini disiapkan untuk melihat daftar Field Officer, status ketersediaan, workload, dan assignment aktif."
      highlights={[
        "Daftar personel per unit, wilayah, dan status penugasan.",
        "Availability, beban kerja, dan kebutuhan dukungan lapangan.",
        "Monitoring kesiapan personel untuk distribusi tugas berikutnya.",
      ]}
    />
  );
}
