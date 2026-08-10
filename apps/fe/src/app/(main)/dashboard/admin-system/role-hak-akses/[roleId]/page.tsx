import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function DetailRoleHakAksesPage() {
  return (
    <DensModulePage
      title="Detail Role dan Hak Akses"
      roleLabel="Admin Sistem"
      description="Detail kewenangan role, cakupan data, dan tindakan yang diizinkan pada sistem."
      highlights={[
        "Daftar kewenangan tindakan per modul.",
        "Cakupan akses berdasarkan role, fungsi, unit organisasi, dan wilayah penugasan.",
        "Riwayat perubahan untuk kebutuhan audit hak akses.",
      ]}
    />
  );
}
