import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DashboardSistemPage() {
  return (
    <DensModulePage
      title="Dashboard Sistem"
      role="Admin Sistem"
      description="Halaman ini menjadi pusat kendali Admin Sistem untuk layanan, keamanan, integrasi WA Center, dan aktivitas administrasi inti."
      highlights={[
        "Status layanan, user aktif, akun terkunci, dan health integrasi.",
        "Security alert, pesan gagal diproses, dan aktivitas admin terbaru.",
        "Ringkasan storage, session, dan audit trail tingkat sistem.",
      ]}
    />
  );
}
