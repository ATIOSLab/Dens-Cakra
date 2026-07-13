"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Lock, Eye, EyeOff, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

const formSchema = z
  .object({
    newPassword: z.string().min(8, { message: "Password minimal harus 8 karakter." }),
    confirmPassword: z.string().min(8, { message: "Password minimal harus 8 karakter." }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Password konfirmasi tidak cocok.",
    path: ["confirmPassword"],
  });

type ResetPasswordFormProps = {
  token: string | null;
  tokenError: string | null;
};

export function ResetPasswordForm({ token, tokenError }: ResetPasswordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const tokenMessage = token
    ? null
    : tokenError
      ? "Tautan reset password tidak valid atau sudah kedaluwarsa."
      : "Token reset password tidak ditemukan.";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    if (!token) {
      return;
    }

    setFormError(null);

    startTransition(async () => {
      const { error } = await authClient.resetPassword({
        newPassword: values.newPassword,
        token,
      });

      if (error) {
        setFormError(error.message || "Password baru gagal disimpan.");
        return;
      }

      router.replace("/auth/login?reset=success");
      router.refresh();
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      {tokenMessage ? (
        <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400">
          <AlertDescription className="text-xs">{tokenMessage}</AlertDescription>
        </Alert>
      ) : null}

      {formError ? (
        <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400">
          <AlertDescription className="text-xs">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-4">
        {/* New Password */}
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password-new" className="text-xs font-mono font-bold text-muted-foreground/80 uppercase">
                New Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="reset-password-new"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending || !token}
                  className="pl-9 pr-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  disabled={!token}
                  className="absolute right-3 top-3.5 text-muted-foreground/60 hover:text-foreground cursor-pointer focus:outline-none disabled:opacity-50"
                >
                  {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Confirm Password */}
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password-confirm" className="text-xs font-mono font-bold text-muted-foreground/80 uppercase">
                Confirm Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="reset-password-confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending || !token}
                  className="pl-9 pr-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((p) => !p)}
                  disabled={!token}
                  className="absolute right-3 top-3.5 text-muted-foreground/60 hover:text-foreground cursor-pointer focus:outline-none disabled:opacity-50"
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button 
        className="w-full h-11 bg-cyan-600 text-white dark:bg-[#14B8FF] dark:text-slate-950 hover:bg-cyan-500 dark:hover:bg-cyan-400 font-bold font-sans rounded-[8px] cursor-pointer shadow-sm mt-2 transition-colors flex items-center justify-center gap-2"
        type="submit" 
        disabled={isPending || !token}
      >
        {isPending ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>MENYIMPAN...</span>
          </>
        ) : (
          "RESET PASSWORD"
        )}
      </Button>

      <Link 
        prefetch={false} 
        href="/auth/login" 
        className="text-center text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"
      >
        Kembali ke Login
      </Link>
    </form>
  );
}
