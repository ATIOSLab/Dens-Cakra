import Link from "next/link";

import { ArrowRight } from "lucide-react";

import { LoginForm } from "../_components/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    reset?: string;
  }>;
};

export default async function LoginV2({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const showResetSuccess = resolvedSearchParams?.reset === "success";

  return (
    <div className="w-full max-w-[430px] min-w-0 animate-fade-in duration-300">
      <section className="flex min-w-0 flex-col justify-center">
        <div className="mb-6 px-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Masuk Supervisi/Pimpinan
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Gunakan akun supervisi atau pimpinan untuk melanjutkan.
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 sm:p-6 dark:bg-zinc-900">
          <div className="space-y-4">
            {showResetSuccess ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 font-sans text-xs text-emerald-700 dark:text-emerald-400">
                Kata sandi berhasil diperbarui. Silakan masuk menggunakan kata sandi baru Anda.
              </div>
            ) : null}
            <LoginForm />
          </div>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3 px-1 text-center">
          <Link
            prefetch={false}
            href="/auth/officer"
            className="group inline-flex items-center gap-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            Halaman login Petugas Wilayah
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
