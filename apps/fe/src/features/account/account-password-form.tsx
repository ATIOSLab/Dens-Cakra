"use client";

import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Password saat ini wajib diisi." }),
    newPassword: z
      .string()
      .min(8, { message: "Password baru minimal 8 karakter." })
      .max(128, { message: "Password baru maksimal 128 karakter." }),
    confirmPassword: z.string().min(8, { message: "Konfirmasi password minimal 8 karakter." }),
    revokeOtherSessions: z.boolean(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Konfirmasi password tidak cocok.",
    path: ["confirmPassword"],
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    message: "Password baru harus berbeda dari password saat ini.",
    path: ["newPassword"],
  });

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

function resolveErrorMessage(error: AuthClientError) {
  const code = error.code?.toUpperCase();
  const message = error.message?.toLowerCase() ?? "";

  if (code === "INVALID_PASSWORD" || message.includes("invalid password")) {
    return "Password saat ini tidak sesuai.";
  }

  if (code === "PASSWORD_TOO_SHORT" || message.includes("too short")) {
    return "Password baru minimal 8 karakter.";
  }

  if (code === "PASSWORD_TOO_LONG" || message.includes("too long")) {
    return "Password baru maksimal 128 karakter.";
  }

  if (code === "SESSION_EXPIRED" || message.includes("session")) {
    return "Sesi login perlu disegarkan. Silakan login ulang, lalu coba lagi.";
  }

  return error.message || "Password gagal diperbarui. Coba beberapa saat lagi.";
}

export function AccountPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: true,
    },
  });

  const handleSubmit = (values: ChangePasswordValues) => {
    setFormError(null);

    startTransition(async () => {
      const { error } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      });

      if (error) {
        setFormError(resolveErrorMessage(error));
        return;
      }

      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        revokeOtherSessions: values.revokeOtherSessions,
      });
      toast.success("Password akun berhasil diperbarui.");
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {formError ? (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/5">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        <Controller
          control={form.control}
          name="currentPassword"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5" data-invalid={fieldState.invalid}>
              <label htmlFor="account-current-password" className="font-medium text-sm leading-snug">
                Password Saat Ini
              </label>
              <div className="relative">
                <KeyRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  {...field}
                  id="account-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  autoComplete="current-password"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  className="h-10 pr-10 pl-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={showCurrentPassword ? "Sembunyikan password saat ini" : "Tampilkan password saat ini"}
                  onClick={() => setShowCurrentPassword((value) => !value)}
                  disabled={isPending}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                >
                  {showCurrentPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {fieldState.error?.message ? (
                <p className="font-normal text-destructive text-sm" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5" data-invalid={fieldState.invalid}>
              <label htmlFor="account-new-password" className="font-medium text-sm leading-snug">
                Password Baru
              </label>
              <div className="relative">
                <ShieldCheck className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  {...field}
                  id="account-new-password"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  className="h-10 pr-10 pl-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={showNewPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                  onClick={() => setShowNewPassword((value) => !value)}
                  disabled={isPending}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                >
                  {showNewPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {fieldState.error?.message ? (
                <p className="font-normal text-destructive text-sm" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5" data-invalid={fieldState.invalid}>
              <label htmlFor="account-confirm-password" className="font-medium text-sm leading-snug">
                Konfirmasi Password Baru
              </label>
              <div className="relative">
                <ShieldCheck className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  {...field}
                  id="account-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  className="h-10 pr-10 pl-9"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  disabled={isPending}
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {fieldState.error?.message ? (
                <p className="font-normal text-destructive text-sm" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="revokeOtherSessions"
          render={({ field }) => (
            <div className="flex items-start gap-3 rounded-md border border-[var(--dc-border-subtle)] bg-muted/25 p-3">
              <Checkbox
                id="account-revoke-sessions"
                checked={field.value}
                disabled={isPending}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <div className="flex flex-1 flex-col gap-0.5 leading-snug">
                <label htmlFor="account-revoke-sessions" className="font-medium text-sm leading-snug">
                  Keluarkan perangkat lain
                </label>
                <p className="text-left font-normal text-muted-foreground text-sm leading-normal">
                  Perangkat ini tetap login setelah password diperbarui.
                </p>
              </div>
            </div>
          )}
        />
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? (
          <>
            <RefreshCw className="animate-spin" />
            Menyimpan
          </>
        ) : (
          <>
            <ShieldCheck />
            Simpan Password
          </>
        )}
      </Button>
    </form>
  );
}
