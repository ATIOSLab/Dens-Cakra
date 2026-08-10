import { Suspense } from "react";

import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { LoginForm } from "../_components/login-form";

export default function OfficerLoginPage() {
  return (
    <div className="w-full max-w-[430px] min-w-0 animate-fade-in duration-300">
      <section className="flex min-w-0 flex-col justify-center">
        <div className="mb-6 px-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Masuk Petugas Wilayah
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Izinkan lokasi bila diminta agar perangkat dapat dikenali.
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 sm:p-6 dark:bg-zinc-900">
          <Suspense fallback={<div className="h-12 animate-pulse rounded-lg border border-border bg-muted/40" />}>
            <LoginForm officerOnly />
          </Suspense>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 px-1 text-center">
          <Link
            prefetch={false}
            href="/auth/login"
            className="group inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
            Halaman login Supervisi/Pimpinan
          </Link>
        </div>
      </section>
    </div>
  );
}
