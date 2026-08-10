import { RequestPasswordResetForm } from "../_components/request-password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex w-full max-w-[430px] flex-col items-center">
      <div className="flex w-full flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 sm:p-6 dark:bg-zinc-900">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Lupa kata sandi</h1>
          <p className="text-muted-foreground text-sm leading-6">
            Masukkan email akun Anda. Tautan pengaturan ulang akan dikirim bila akun terdaftar.
          </p>
        </div>
        <RequestPasswordResetForm />
      </div>
    </div>
  );
}
