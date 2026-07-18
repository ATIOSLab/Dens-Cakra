import { ResetPasswordForm } from "../_components/reset-password-form";

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

function getSearchParamValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const token = getSearchParamValue(resolvedSearchParams?.token);
  const tokenError = getSearchParamValue(resolvedSearchParams?.error);

  return (
    <div className="w-full max-w-[480px] sm:max-w-[500px] flex flex-col gap-5 items-center">
      {/* 1. SECURE RESET PASSWORD CARD */}
      <div className="w-full bg-card/60 backdrop-blur-md border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-sm flex flex-col gap-5 transition-all duration-200">
        {/* Card Header (Logo, title) */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Custom SVG Key/Lock Logo */}
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" />
            </svg>
          </div>

          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-foreground">DENS CAKRA</h1>
        </div>

        {/* Input Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1 text-center mb-2">
            <h2 className="text-sm font-bold text-foreground">Reset Password</h2>
            <p className="text-muted-foreground text-xs font-sans">
              Masukkan password baru untuk melanjutkan proses reset.
            </p>
          </div>
          <ResetPasswordForm token={token} tokenError={tokenError} />
        </div>
      </div>

      {/* 2. EXTERNAL FOOTER (BELOW CARD) */}
      <div className="flex w-full items-center justify-center text-[10px] font-mono text-muted-foreground/60 select-none text-center">
        <div>© 2026 DENS CAKRA</div>
      </div>
    </div>
  );
}
