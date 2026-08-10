import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function BuatEksporAuditPage() {
  return (
    <DensModulePage
      title="Ekspor Audit Baru"
      roleLabel="Admin Sistem"
      description="Ruang persiapan ekspor jejak audit berdasarkan periode, aktor, modul, dan tingkat risiko."
      highlights={[
        "Pemilihan periode dan cakupan data audit.",
        "Validasi alasan ekspor untuk menjaga keamanan data.",
        "Pencatatan permintaan ekspor sebagai bagian dari jejak audit.",
      ]}
    />
  );
}
