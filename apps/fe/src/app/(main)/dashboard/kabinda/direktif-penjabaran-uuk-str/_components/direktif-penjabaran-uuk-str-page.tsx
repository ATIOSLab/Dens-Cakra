import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifPenjabaranUukStrPage() {
  return (
    <DensModulePage
      title="Direktif & Penjabaran UUK/STR"
      roleLabel="Kepala BIN Daerah (Kabinda)"
      description="Halaman ini menjadi fondasi untuk menerima direktif, menyusun penjabaran UUK/STR, dan mendistribusikan tugas."
      highlights={[
        "Direktif masuk, draf, dan riwayat penerbitan.",
        "Metadata perintah, wilayah sasaran, dan batas waktu.",
        "Dasar untuk bantuan draf AI dan distribusi multi-wilayah.",
      ]}
    />
  );
}
