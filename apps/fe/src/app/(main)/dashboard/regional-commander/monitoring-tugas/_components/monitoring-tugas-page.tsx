import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MonitoringTugasPage() {
  return (
    <DensModulePage
      title="Monitoring Tugas"
      role="Komandan Regional"
      description="Halaman ini disiapkan untuk memantau progres penugasan, keterlambatan, dan beban kerja lintas unit."
      highlights={[
        "Status tugas, deadline, dan unit pelaksana.",
        "View tabel, kanban, timeline, dan peta.",
        "Timeline aktivitas dan tindak supervisi tambahan.",
      ]}
    />
  );
}
