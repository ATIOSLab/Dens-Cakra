import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PersonelJaringPage() {
  return (
    <DensModulePage
      title="Personel & Jaring"
      role="Komandan Regional"
      description="Halaman ini menyiapkan pemantauan personel, jaring dengan pseudonym, dan produktivitas wilayah."
      highlights={[
        "Status aktif, posisi terakhir, dan tugas berjalan.",
        "Coverage area, beban kerja, dan produktivitas.",
        "Pembatasan identitas jaring sesuai need-to-know.",
      ]}
    />
  );
}
