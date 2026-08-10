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
    <div className="flex w-full max-w-[430px] flex-col items-center">
      <div className="flex w-full flex-col gap-5 rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-all duration-200 sm:p-6 dark:bg-zinc-900">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Atur ulang kata sandi</h1>
          <p className="text-muted-foreground text-sm leading-6">Masukkan kata sandi baru untuk melanjutkan.</p>
        </div>
        <ResetPasswordForm token={token} tokenError={tokenError} />
      </div>
    </div>
  );
}
