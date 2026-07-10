import { Globe } from "lucide-react";

import { APP_CONFIG } from "@/config/app-config";

import { RequestPasswordResetForm } from "../_components/request-password-reset-form";

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[350px]">
        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">Forgot password</h1>
          <p className="text-muted-foreground text-sm">
            Masukkan email akun Anda dan kami akan mengirimkan tautan reset password.
          </p>
        </div>
        <RequestPasswordResetForm />
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
