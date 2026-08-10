import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function KonfigurasiSistemPage() {
  return (
    <DensModulePage
      title="Konfigurasi Sistem"
      roleLabel="Admin Sistem"
      description="Ruang pengelolaan parameter aplikasi, kanal integrasi, keamanan, dan aturan operasional sistem."
      highlights={[
        "Daftar parameter aktif, nilai konfigurasi, dan status perubahan.",
        "Pemantauan konfigurasi kritis yang memengaruhi akses, integrasi, dan pelaporan.",
        "Jejak perubahan konfigurasi untuk kebutuhan audit sistem.",
      ]}
    />
  );
}
