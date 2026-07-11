"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="dc-card p-6">
      <p className="dc-eyebrow">Dashboard error</p>
      <h1 className="mt-3 font-semibold text-2xl">Halaman gagal dimuat</h1>
      <p className="mt-2 max-w-2xl text-[var(--dc-text-secondary)] text-sm">
        {error.message || "Terjadi masalah saat memuat workspace. Coba ulang untuk memuat data terbaru."}
      </p>
      <Button className="mt-5" onClick={reset}>
        Coba ulang
      </Button>
    </div>
  );
}
