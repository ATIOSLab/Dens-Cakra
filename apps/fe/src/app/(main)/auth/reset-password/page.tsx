import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

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
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">Reset password</h1>
          <p className="text-muted-foreground text-sm">Masukkan password baru untuk melanjutkan proses reset.</p>
        </div>
        <ResetPasswordForm token={token} tokenError={tokenError} />
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="size-4 text-muted-foreground" />
          ENG
        </div>
      </div>
    </>
  );
}
