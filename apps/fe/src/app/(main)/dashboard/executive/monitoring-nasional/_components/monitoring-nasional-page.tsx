import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function MonitoringNasionalPage() {
  return (
    <DensModulePage
      title="Monitoring Nasional"
      role="Eksekutif"
      description="Halaman ini mengonsolidasikan monitoring tugas, pipeline laporan, performa wilayah, dan alert nasional dalam satu tampilan."
      highlights={[
        "Status wilayah, tugas strategis, dan jalur pelaporan aktif.",
        "Ringkasan personel agregat, backlog, dan alert prioritas nasional.",
        "Snapshot progres untuk keputusan cepat tingkat pimpinan.",
      ]}
    />
  );
}
