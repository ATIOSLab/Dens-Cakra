import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function JawabanLapanganPage() {
  return (
    <DensModulePage
      title="Jawaban Lapangan"
      role="Komandan Regional"
      description="Halaman ini menjadi tempat review jawaban lapangan, kelengkapan bukti, dan eskalasi ke tahap analisis."
      highlights={[
        "Baket dari aplikasi dan intake WA Center.",
        "Kelengkapan lampiran, GPS, dan hubungan ke UUK/PIR.",
        "Status verifikasi dan kebutuhan pengembangan lanjutan.",
      ]}
    />
  );
}
