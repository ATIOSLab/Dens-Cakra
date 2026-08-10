import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export default function DetailKonfigurasiSistemPage() {
  return (
    <DensModulePage
      title="Detail Konfigurasi Sistem"
      roleLabel="Admin Sistem"
      description="Detail parameter konfigurasi, nilai aktif, riwayat perubahan, dan dampak operasionalnya."
      highlights={[
        "Informasi nilai konfigurasi dan status penerapan.",
        "Riwayat perubahan serta aktor yang melakukan pembaruan.",
        "Catatan risiko sebelum konfigurasi diubah kembali.",
      ]}
    />
  );
}
