import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PenggunaPage() {
  return (
    <DensModulePage
      title="Pengguna"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk membuat, mengaktifkan, menonaktifkan, serta mengelola profil dan akses pengguna."
      highlights={[
        "Penetapan role, position, unit, atasan, dan wilayah akses.",
        "Reset MFA, lock or unlock account, dan pencabutan session aktif.",
        "Monitoring status akun dan aktivitas administrasi pengguna.",
      ]}
    />
  );
}
