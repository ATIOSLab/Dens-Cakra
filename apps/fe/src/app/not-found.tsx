"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center space-y-2 text-center">
      <h1 className="font-semibold text-2xl">Halaman Tidak Ditemukan</h1>
      <p className="text-muted-foreground">Periksa kembali alamat halaman yang Anda buka.</p>
      <Button asChild variant="outline">
        <Link prefetch={false} replace href="/dashboard/deputi">
          Kembali ke Beranda
        </Link>
      </Button>
    </div>
  );
}
