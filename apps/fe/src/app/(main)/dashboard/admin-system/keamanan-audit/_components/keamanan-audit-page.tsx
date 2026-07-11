import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KeamananAuditPage() {
  return (
    <DensModulePage
      title="Keamanan & Audit"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk audit log, security event, failed login, suspicious access, session activity, dan jejak akses data."
      highlights={[
        "Audit log tidak dapat diubah atau dihapus oleh Admin Sistem.",
        "Monitoring permission change, unknown device, dan failed login.",
        "Ekspor aktivitas dan jejak akses data untuk investigasi keamanan.",
      ]}
    />
  );
}
