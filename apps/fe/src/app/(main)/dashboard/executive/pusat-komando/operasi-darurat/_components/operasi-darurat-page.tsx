import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function OperasiDaruratPage() {
  return (
    <DensModulePage
      title="Operasi Darurat"
      roleLabel="Deputi II"
      description="Halaman ini menjadi fondasi untuk komando insiden darurat, bantuan lintas unit, dan penanganan cepat."
      highlights={[
        "Panic alert dan peta insiden aktif.",
        "Timeline penanganan dan kebutuhan dukungan.",
        "Instruksi cepat serta eskalasi ke level pusat.",
      ]}
    />
  );
}
