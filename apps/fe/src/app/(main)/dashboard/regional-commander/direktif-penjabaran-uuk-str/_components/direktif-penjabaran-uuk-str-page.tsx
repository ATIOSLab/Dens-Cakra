import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function DirektifPenjabaranUukStrPage() {
  return (
    <DensModulePage
      title="Direktif & Penjabaran UUK/STR"
      role="Komandan Regional"
      description="Halaman ini menjadi fondasi untuk menerima direktif, menyusun penjabaran UUK/STR, dan mendistribusikan tugas."
      highlights={[
        "Direktif masuk, draft, dan riwayat penerbitan.",
        "Metadata perintah, wilayah sasaran, dan batas waktu.",
        "Dasar untuk AI draft assistance dan distribusi multi-wilayah.",
      ]}
    />
  );
}
