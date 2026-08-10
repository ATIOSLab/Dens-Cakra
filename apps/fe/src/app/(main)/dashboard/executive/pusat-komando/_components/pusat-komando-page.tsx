import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PusatKomandoPage() {
  return (
    <DensModulePage
      title="Pusat Komando"
      roleLabel="Deputi II"
      description="Pusat komando menyiapkan alur pemberian arahan, kendali operasi, dan eskalasi situasi darurat."
      highlights={[
        "Ringkasan direktif aktif dan status tindak lanjut.",
        "Akses ke operasi darurat dan instruksi cepat.",
        "Fondasi untuk status baca, linimasa, dan supervisi operasi.",
      ]}
    />
  );
}
