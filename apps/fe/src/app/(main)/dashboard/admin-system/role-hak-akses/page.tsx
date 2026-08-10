import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function RoleHakAksesPage() {
  return (
    <DensModulePage
      title="Role dan Hak Akses"
      roleLabel="Admin Sistem"
      description="Ruang kendali role, kewenangan tindakan, cakupan akses, dan kebijakan akses sistem."
      highlights={[
        "Matriks role terhadap tindakan lihat, buat, ubah, verifikasi, setujui, dan ekspor.",
        "Kesesuaian role dengan unit organisasi, fungsi, dan wilayah penugasan.",
        "Audit perubahan hak akses untuk menjaga akuntabilitas sistem.",
      ]}
    />
  );
}
