import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function BuatBaketPage() {
  return (
    <DensModulePage
      title="Buat Baket"
      role="Petugas Lapangan"
      description="Halaman ini disiapkan untuk membentuk Baket dari laporan Jaring dengan data tugas, UUK/PIR, bukti, lokasi, dan urgensi awal."
      highlights={[
        "Normalisasi judul, kategori isu, lokasi administratif, dan waktu kejadian.",
        "Pengaitan ke pesan sumber, kode Jaring, tugas terkait, dan evidence tambahan.",
        "Alur draft, siap dikirim, dikirim ke OIM, dan feedback revisi.",
      ]}
    />
  );
}
