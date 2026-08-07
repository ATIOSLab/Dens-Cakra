import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="dc-card p-6">
      <p className="dc-eyebrow">Akses Data</p>
      <h1 className="mt-3 font-semibold text-2xl">Data Tidak Tersedia</h1>
      <p className="mt-2 max-w-2xl text-[var(--dc-text-secondary)] text-sm">
        Data tidak ditemukan atau berada di luar cakupan akses akun Anda.
      </p>
      <Button asChild className="mt-5">
        <Link href="/dashboard">Kembali ke Beranda</Link>
      </Button>
    </div>
  );
}
