import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MonitoringTugasPage() {
  return (
    <DensModulePage
      title="Monitoring Tugas"
      roleLabel="Kepala BIN Daerah (Kabinda)"
      description="Halaman ini disiapkan untuk memantau progres penugasan, keterlambatan, dan beban kerja lintas unit."
      highlights={[
        "Status tugas, tenggat, dan unit pelaksana.",
        "Tampilan tabel, kanban, linimasa, dan peta.",
        "Linimasa aktivitas dan tindak supervisi tambahan.",
      ]}
    />
  );
}
