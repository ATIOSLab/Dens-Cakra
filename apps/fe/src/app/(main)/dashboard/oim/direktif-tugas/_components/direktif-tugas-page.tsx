import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifTugasPage() {
  return (
    <DensModulePage
      title="Direktif & Tugas"
      role="Manajer Intelijen Operasional"
      description="Halaman ini disiapkan untuk menerima direktif, memecahnya menjadi tugas teknis, dan mendistribusikan eksekusi."
      highlights={[
        "Direktif aktif, target informasi, dan deadline.",
        "Status pemenuhan serta pembagian tugas ke Korwil atau tim.",
        "Read receipt dan catatan pimpinan operasional.",
      ]}
    />
  );
}
