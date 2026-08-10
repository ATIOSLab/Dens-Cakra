import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifPage() {
  return (
    <DensModulePage
      title="Direktif"
      roleLabel="Deputi II"
      description="Halaman ini disiapkan untuk penerbitan dan monitoring direktif strategis dari pimpinan ke unit pelaksana."
      highlights={[
        "Daftar direktif masuk dan direktif diterbitkan.",
        "Status progres, tenggat, dan status baca.",
        "Riwayat perubahan dan catatan supervisi.",
      ]}
    />
  );
}
