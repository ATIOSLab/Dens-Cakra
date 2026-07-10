import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PusatKomandoPage() {
  return (
    <DensModulePage
      title="Pusat Komando"
      role="Eksekutif"
      description="Pusat komando menyiapkan alur pemberian arahan, kendali operasi, dan eskalasi situasi darurat."
      highlights={[
        "Ringkasan direktif aktif dan status tindak lanjut.",
        "Akses ke operasi darurat dan instruksi cepat.",
        "Fondasi untuk read receipt, timeline, dan supervisi operasi.",
      ]}
    />
  );
}
