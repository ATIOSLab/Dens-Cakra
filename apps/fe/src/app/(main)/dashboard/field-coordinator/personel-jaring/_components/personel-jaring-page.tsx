import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersonelJaringPage() {
  return (
    <DensModulePage
      title="Personel & Jaring"
      role="Koordinator Lapangan"
      description="Halaman ini menyiapkan kontrol personel organik, jaring berkode, dan distribusi beban tugas lapangan."
      highlights={[
        "Status tersedia, tugas aktif, dan coverage area.",
        "Produktivitas, kontak aman, dan riwayat tugas.",
        "Dasar tampilan jaring berbasis kode sesuai izin.",
      ]}
    />
  );
}
