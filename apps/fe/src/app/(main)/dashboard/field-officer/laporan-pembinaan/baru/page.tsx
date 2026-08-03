import { Suspense } from "react";
import { BuatLaporanPembinaanClient } from "./_components/buat-laporan-pembinaan-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Memuat halaman...</div>}>
      <BuatLaporanPembinaanClient />
    </Suspense>
  );
}
