import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function IntegrasiWaCenterPage() {
  return (
    <DensModulePage
      title="Integrasi WA Center"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk pengelolaan nomor WA Center, webhook, queue, parsing, unknown sender, dan template balasan."
      highlights={[
        "Monitoring connection status, failed parsing, dan retry queue.",
        "Pengaturan retention, file limit, dan routing unknown sender.",
        "Kontrol konfigurasi integrasi dan observabilitas proses pesan masuk.",
      ]}
    />
  );
}
