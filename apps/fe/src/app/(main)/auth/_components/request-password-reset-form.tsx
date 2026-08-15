"use client";

import { useState, useTransition } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, RefreshCw } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

const formSchema = z.object({
  email: z.string().email({ message: "Masukkan alamat email yang valid." }),
});

export function RequestPasswordResetForm() {
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    setFormError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const redirectTo = new URL("/auth/reset-password", window.location.origin).toString();
      const { error } = await authClient.requestPasswordReset({
        email: values.email,
        redirectTo,
      });

      if (error) {
        setFormError(error.message || "Permintaan reset password gagal dikirim.");
        return;
      }

      setSuccessMessage(
        "Jika email terdaftar, kami telah mengirimkan tautan reset password ke inbox Anda.",
      );
      form.reset();
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      {formError ? (
        <Alert variant="destructive" className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400">
          <AlertDescription className="text-xs">{formError}</AlertDescription>
        </Alert>
      ) : null}
      
      {successMessage ? (
        <Alert className="rounded-xl border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
          <AlertDescription className="text-xs">{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="forgot-password-email" className="text-xs font-mono font-bold text-muted-foreground/80 uppercase">
                Email Address
              </FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="forgot-password-email"
                  type="email"
                  placeholder="name@organization.gov"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                  className="pl-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-cyan-400/30 placeholder:text-muted-foreground/30 text-sm h-11"
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button 
        className="w-full h-11 bg-cyan-600 text-white dark:bg-cyan-400 dark:text-slate-950 hover:bg-cyan-500 dark:hover:bg-cyan-400 font-bold font-sans rounded-[8px] cursor-pointer shadow-sm mt-2 transition-colors flex items-center justify-center gap-2"
        type="submit" 
        disabled={isPending}
      >
        {isPending ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>KIRIM DATA...</span>
          </>
        ) : (
          "SEND RESET LINK"
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
