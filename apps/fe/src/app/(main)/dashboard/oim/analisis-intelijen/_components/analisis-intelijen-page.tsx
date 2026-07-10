import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function AnalisisIntelijenPage() {
  return (
    <DensModulePage
      title="Analisis Intelijen"
      role="Manajer Intelijen Operasional"
      description="Halaman ini menyiapkan analisis data terverifikasi, korelasi lintas laporan, dan validasi human-in-the-loop."
      highlights={[
        "Entity extraction, topic clustering, dan sentiment analysis.",
        "Timeline kejadian, anomali, dan blind spot.",
        "Analisis dampak, upaya, dan saran tindak.",
      ]}
    />
  );
}
