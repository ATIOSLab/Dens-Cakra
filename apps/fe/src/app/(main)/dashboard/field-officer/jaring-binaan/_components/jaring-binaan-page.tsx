import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function JaringBinaanPage() {
  return (
    <DensModulePage
      title="Jaring Binaan"
      role="Petugas Lapangan"
      description="Halaman ini disiapkan untuk mendaftarkan, mengelola, menonaktifkan, menghapus, dan memindahkan pembinaan Jaring."
      highlights={[
        "Registrasi Jaring dengan kode, alias, WhatsApp, dan wilayah coverage.",
        "Status aktif, nonaktif, dipindahkan, atau dihapus tanpa menghilangkan riwayat.",
        "Riwayat pembina, aktivitas, dan validasi unik nomor aktif.",
      ]}
    />
  );
}
