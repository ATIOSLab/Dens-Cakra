import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function DetailEksporAuditPage() {
  return (
    <DensModulePage
      title="Detail Ekspor Audit"
      roleLabel="Admin Sistem"
      description="Detail status ekspor audit, parameter permintaan, pemohon, dan riwayat unduhan."
      highlights={[
        "Status proses ekspor dan waktu pembuatan.",
        "Parameter filter audit yang digunakan pada ekspor.",
        "Jejak unduhan untuk memastikan ekspor tetap terlacak.",
      ]}
    />
  );
}
