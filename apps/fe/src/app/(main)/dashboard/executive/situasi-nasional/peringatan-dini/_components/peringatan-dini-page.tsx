import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function PeringatanDiniPage() {
  return (
    <DensModulePage
      title="Peringatan Dini"
      role="Eksekutif"
      description="Halaman ini menjadi fondasi pengelolaan alert strategis, eskalasi isu, dan pemantauan kebutuhan atensi pimpinan."
      highlights={[
        "Daftar alert prioritas dengan status, severity, dan deadline tindak lanjut.",
        "Korelasi antarwilayah, tren kejadian, dan indikasi eskalasi.",
        "Catatan arahan pimpinan dan distribusi tindak lanjut lintas unit.",
      ]}
    />
  );
}
