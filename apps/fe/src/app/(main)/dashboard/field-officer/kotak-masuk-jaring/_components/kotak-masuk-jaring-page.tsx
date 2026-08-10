import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function KotakMasukJaringPage() {
  return (
    <DensModulePage
      title="Informasi Jaring"
      roleLabel="Petugas Wilayah (Gaswil)"
      description="Halaman ini disiapkan untuk menerima laporan Jaring dari WhatsApp, meninjau lokasi aktual, dan memprosesnya menjadi Baket sesuai kewenangan."
      highlights={[
        "Peninjauan judul, bukti, Live Location, dan isi laporan dari WhatsApp.",
        "Aksi minta pengembangan, tandai duplikat, tidak relevan, atau gabungkan pesan.",
        "Penghubungan ke tugas dan konversi cepat menjadi Baket.",
      ]}
    />
  );
}
