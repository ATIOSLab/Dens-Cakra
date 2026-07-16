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
    <div className="w-full max-w-[480px] sm:max-w-[500px] flex flex-col gap-5 items-center">
      {/* 1. SECURE COMMAND LOGIN CARD */}
      <div className="w-full bg-card/60 backdrop-blur-md border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-sm flex flex-col gap-5 transition-all duration-200">
        {/* Card Header (Logo, title) */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Custom SVG Secure Command Logo */}
          <div className="size-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6 text-cyan-600 dark:text-[#14B8FF]"
            >
              <title>Secure command login</title>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-foreground">DENS CAKRA</h1>
          <p className="max-w-sm text-balance font-mono text-[10px] font-medium uppercase leading-4 tracking-[0.12em] text-muted-foreground">
            Dashboard Evaluasi Nasional dan Situational Awareness
          </p>
        </div>

        {/* Input Form Fields */}
        <div className="space-y-4">
          {showResetSuccess ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400 font-sans">
              Password berhasil diperbarui. Silakan login dengan password baru Anda.
            </div>
          ) : null}
          <LoginForm />
        </div>
      </div>

      {/* 2. EXTERNAL FOOTER (BELOW CARD) */}
      <div className="flex w-full items-center justify-center text-[10px] font-mono text-muted-foreground/60 select-none text-center">
        <div>© 2026 DENS CAKRA</div>
      </div>
    </div>
  );
}
