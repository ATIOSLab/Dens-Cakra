import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function VerifikasiNeracaPenilaianPage() {
  return (
    <DensModulePage
      title="Verifikasi & Neraca Penilaian"
      roleLabel="Manajer Intelijen Operasional"
      description="Halaman ini menyiapkan verifikasi 5W+1H, validitas sumber, dan penguncian hasil verifikasi."
      highlights={[
        "Kepercayaan sumber dan kebenaran informasi.",
        "Cross-reference, evidence validation, dan pemeriksaan lokasi.",
        "Status valid, perlu pengembangan, atau ditolak.",
      ]}
    />
  );
}
