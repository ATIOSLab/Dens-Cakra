import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function JabatanReportingLinePage() {
  return (
    <DensModulePage
      title="Jabatan & Reporting Line"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk pengelolaan jabatan, atasan-bawahan, jalur Direktorat, jalur Binda, dan masa berlaku jabatan."
      highlights={[
        "Definisi position dan hubungan struktural antarjabatan.",
        "Konfigurasi reporting line untuk routing Direktorat dan Binda.",
        "Pengaturan masa berlaku dan histori perubahan jalur pelaporan.",
      ]}
    />
  );
}
