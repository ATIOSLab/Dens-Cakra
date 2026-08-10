import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PeringatanDiniPage() {
  return (
    <DensModulePage
      title="Peringatan Dini"
      roleLabel="Deputi II"
      description="Halaman ini menjadi fondasi untuk alert eskalasi, deteksi anomali, dan tindak lanjut isu prioritas."
      highlights={[
        "Daftar alert berdasarkan tingkat risiko dan wilayah.",
        "Status tindak lanjut dan penanganan insiden.",
        "Ruang untuk anotasi dan catatan supervisi pimpinan.",
      ]}
    />
  );
}
