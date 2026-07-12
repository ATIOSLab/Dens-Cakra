import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function TugasOperasionalPage() {
  return (
    <DensModulePage
      title="Tugas Operasional"
      role="Koordinator Lapangan"
      description="Halaman ini disiapkan untuk membaca tugas operasional, UUK/PIR, wilayah, sasaran, deadline, dan acknowledgement pelaksanaan."
      highlights={[
        "Daftar tugas diterima dari OIM lengkap dengan prioritas dan target.",
        "Rangkuman wilayah operasi, sasaran, dan kebutuhan tindak lanjut lapangan.",
        "Status acknowledgement dan kesiapan distribusi ke Field Officer.",
      ]}
    />
  );
}
