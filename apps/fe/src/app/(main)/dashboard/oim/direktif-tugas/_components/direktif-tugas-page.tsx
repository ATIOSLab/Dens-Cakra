import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifTugasPage() {
  return (
    <DensModulePage
      title="Direktif & Tugas"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk menerima direktif, memecahnya menjadi tugas teknis, dan mendistribusikan eksekusi."
      highlights={[
        "Direktif aktif, target informasi, dan tenggat.",
        "Status pemenuhan serta pembagian tugas ke Korwil atau tim.",
        "Status baca dan catatan pimpinan operasional.",
      ]}
    />
  );
}
