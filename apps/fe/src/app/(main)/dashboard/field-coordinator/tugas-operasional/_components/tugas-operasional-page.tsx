import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function TugasOperasionalPage() {
  return (
    <DensModulePage
      title="Tugas Operasional"
      roleLabel="Koordinator Wilayah (Korwil)"
      description="Halaman ini disiapkan untuk membaca tugas operasional, UUK/PIR, wilayah, sasaran, tenggat, dan konfirmasi pelaksanaan."
      highlights={[
        "Daftar tugas diterima dari OIM lengkap dengan prioritas dan target.",
        "Rangkuman wilayah operasi, sasaran, dan kebutuhan tindak lanjut lapangan.",
        "Status konfirmasi penerimaan dan kesiapan distribusi ke Petugas Wilayah (Gaswil).",
      ]}
    />
  );
}
