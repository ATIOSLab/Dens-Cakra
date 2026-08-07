import Link from "next/link";

import { ArrowRight, ShieldCheck } from "lucide-react";

import { AuthBrandPanel } from "../_components/auth-brand-panel";
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
    <div className="grid w-full max-w-[1160px] min-w-0 animate-fade-in items-stretch gap-5 duration-300 lg:grid-cols-[minmax(0,1.15fr)_minmax(380px,0.85fr)]">
      <AuthBrandPanel />

      <section className="flex min-w-0 flex-col justify-center lg:px-2 xl:px-5">
        <div className="mb-5 px-1">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/15 bg-cyan-500/[0.06] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
            <ShieldCheck className="size-3.5" />
            Akses Pusat Komando
          </div>
          <h2 className="text-2xl font-black tracking-[-0.025em] text-foreground sm:text-3xl">Masuk ke DENS CAKRA</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            Gunakan akun resmi Anda untuk mengakses ruang kerja sesuai kewenangan.
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-4 rounded-[var(--dc-radius-lg)] border border-border/80 bg-card/95 p-4 shadow-[0_16px_48px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all duration-200 sm:p-6 dark:border-cyan-400/15 dark:bg-[#071426]/90 dark:shadow-[0_20px_55px_rgba(2,8,23,0.45)]">
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
            className="group inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 transition-colors hover:text-cyan-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 dark:text-cyan-300"
          >
            Masuk sebagai Petugas Wilayah (Gaswil)
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/65">
            © 2026 DENS CAKRA · Akses terbatas dan terpantau
          </p>
        </div>
      </section>
    </div>
  );
}
