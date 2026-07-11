import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KonfigurasiSistemPage() {
  return (
    <DensModulePage
      title="Konfigurasi Sistem"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk pengaturan notification policy, session policy, MFA, upload, retention, maintenance mode, dan feature flag."
      highlights={[
        "Kontrol kebijakan notifikasi, sesi, MFA, dan upload.",
        "Pengaturan retention policy, maintenance mode, dan feature flag.",
        "Konfigurasi integrasi sistem dan parameter operasional global.",
      ]}
    />
  );
}
