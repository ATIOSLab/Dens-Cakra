import { RequestPasswordResetForm } from "../_components/request-password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-[480px] sm:max-w-[500px] flex flex-col gap-5 items-center">
      {/* 1. SECURE REQUEST RESET CARD */}
      <div className="w-full bg-card/60 backdrop-blur-md border border-border/80 p-6 sm:p-8 rounded-[20px] shadow-sm flex flex-col gap-5 transition-all duration-200">
        {/* Card Header (Logo, title) */}
        <div className="flex flex-col items-center text-center gap-2">
          {/* Custom SVG Key Logo */}
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
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>

          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-foreground">DENS CAKRA</h1>
        </div>

        {/* Input Form Fields */}
        <div className="space-y-4">
          <div className="space-y-1 text-center mb-2">
            <h2 className="text-sm font-bold text-foreground">Forgot Password</h2>
            <p className="text-muted-foreground text-xs font-sans">
              Masukkan email akun Anda dan kami akan mengirimkan tautan reset password.
            </p>
          </div>
          <RequestPasswordResetForm />
        </div>
      </div>

      {/* 2. EXTERNAL FOOTER (BELOW CARD) */}
      <div className="flex w-full items-center justify-center text-[10px] font-mono text-muted-foreground/60 select-none text-center">
        <div>© 2026 DENS CAKRA</div>
      </div>
    </div>
  );
}
