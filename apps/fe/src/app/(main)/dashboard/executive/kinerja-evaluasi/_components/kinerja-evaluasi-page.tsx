import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KinerjaEvaluasiPage() {
  return (
    <DensModulePage
      title="Kinerja & Evaluasi"
      role="Eksekutif"
      description="Halaman ini menjadi dasar untuk KPI pimpinan, evaluasi unit, dan pemantauan blind spot wilayah."
      highlights={[
        "Pemenuhan UUK/PIR dan produktivitas unit.",
        "Kecepatan respons, validasi laporan, dan revisi.",
        "Coverage wilayah, blind spot, dan evaluasi periodik.",
      ]}
    />
  );
}
