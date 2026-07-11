import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KotakMasukJaringPage() {
  return (
    <DensModulePage
      title="Kotak Masuk Jaring"
      role="Petugas Lapangan"
      description="Halaman ini disiapkan untuk menerima laporan Jaring, memeriksa kelengkapan, dan melakukan verifikasi awal sebelum menjadi Baket."
      highlights={[
        "Pemeriksaan Judul, Foto, GPS, dan Isi laporan dari WhatsApp.",
        "Aksi minta pengembangan, tandai duplikat, tidak relevan, atau gabungkan pesan.",
        "Penghubungan ke tugas dan konversi cepat menjadi Baket.",
      ]}
    />
  );
}
