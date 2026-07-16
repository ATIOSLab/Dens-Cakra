"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  email: z.string().email({ message: "Masukkan alamat email yang valid." }),
  password: z.string().min(8, { message: "Password minimal harus 8 karakter." }),
  remember: z.boolean().optional(),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    setFormError(null);

    startTransition(async () => {
      const callbackUrl = searchParams.get("callbackUrl")?.trim();
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
        rememberMe: values.remember ?? true,
      });

      if (error) {
        if (error.status === 403) {
          setFormError("Email Anda belum diverifikasi. Silakan cek inbox dan verifikasi terlebih dahulu.");
          return;
        }

        setFormError(error.message || "Login gagal. Silakan periksa kembali kredensial Anda.");
        return;
      }

      router.replace(callbackUrl || "/dashboard");
      router.refresh();
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      {formError ? (
        <Alert
          variant="destructive"
          className="rounded-xl border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400"
        >
          <AlertDescription className="text-xs">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <FieldGroup className="gap-4">
        {/* Email Address */}
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="login-email"
                className="text-xs font-mono font-bold text-muted-foreground/80 uppercase"
              >
                Email Address
              </FieldLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="login-email"
                  type="email"
                  placeholder="name@organization.gov"
                  autoComplete="email"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                  className="pl-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm h-11"
                />
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Password */}
        <Controller
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor="login-password"
                className="text-xs font-mono font-bold text-muted-foreground/80 uppercase"
              >
                Password
              </FieldLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground/50" />
                <Input
                  {...field}
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                  className="pl-9 pr-9 rounded-[8px] border-border bg-background dark:bg-slate-900/35 focus-visible:ring-1 focus-visible:ring-cyan-500 dark:focus-visible:ring-[#14B8FF]/30 placeholder:text-muted-foreground/30 text-sm h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-3.5 text-muted-foreground/60 hover:text-foreground cursor-pointer focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {/* Remember me & Forgot Password link row */}
        <div className="flex items-center justify-between mt-1">
          <Controller
            control={form.control}
            name="remember"
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid} className="items-center gap-2">
                <Checkbox
                  id="login-remember"
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                  aria-invalid={fieldState.invalid}
                  disabled={isPending}
                  className="border-border rounded-[4px]"
                />
                <FieldContent>
                  <FieldLabel
                    htmlFor="login-remember"
                    className="font-sans text-xs text-muted-foreground cursor-pointer select-none"
                  >
                    Remember this device
                  </FieldLabel>
                </FieldContent>
              </Field>
            )}
          />

          <Link
            prefetch={false}
            href="/auth/forgot-password"
            className="text-xs text-cyan-600 dark:text-[#14B8FF] hover:underline font-mono"
          >
            Forgot Password?
          </Link>
        </div>
      </FieldGroup>

      {/* Primary Submit Button */}
      <Button
        className="w-full h-11 sm:h-12 bg-cyan-600 text-white dark:bg-[#14B8FF] dark:text-slate-950 hover:bg-cyan-500 dark:hover:bg-cyan-400 font-bold font-sans rounded-[8px] cursor-pointer shadow-sm mt-2 transition-colors flex items-center justify-center gap-2"
        type="submit"
        disabled={isPending}
      >
        {isPending ? (
          <>
            <RefreshCw className="size-4 animate-spin" />
            <span>CONNECTING...</span>
          </>
        ) : (
          "ACCESS COMMAND CENTER"
        )}
      </Button>

      {/* SECURITY METADATA FOOTER BLOCK */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border/40 text-[9px] font-mono text-muted-foreground/50 text-center select-none uppercase">
        <div>
          <span className="block text-[8px] opacity-75">Environment</span>
          <span className="text-foreground font-semibold">Production</span>
        </div>
        <div>
          <span className="block text-[8px] opacity-75">TLS Encryption</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Enabled</span>
        </div>
        <div>
          <span className="block text-[8px] opacity-75">Version</span>
          <span className="text-foreground font-semibold">v2.4.0</span>
        </div>
      </div>
    </form>
  );
}
