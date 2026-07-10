import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifPage() {
  return (
    <DensModulePage
      title="Direktif"
      role="Eksekutif"
      description="Halaman ini disiapkan untuk penerbitan dan monitoring direktif strategis dari pimpinan ke unit pelaksana."
      highlights={[
        "Daftar direktif masuk dan direktif diterbitkan.",
        "Status progres, deadline, dan read receipt.",
        "Riwayat perubahan dan catatan supervisi.",
      ]}
    />
  );
}
