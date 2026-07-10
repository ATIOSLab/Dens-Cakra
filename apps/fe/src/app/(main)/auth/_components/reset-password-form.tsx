"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

const formSchema = z
  .object({
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
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
        <Alert variant="destructive">
          <AlertDescription>{tokenMessage}</AlertDescription>
        </Alert>
      ) : null}
      {formError ? (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password-new">New Password</FieldLabel>
              <Input
                {...field}
                id="reset-password-new"
                type="password"
                placeholder="********"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                disabled={isPending || !token}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password-confirm">Confirm Password</FieldLabel>
              <Input
                {...field}
                id="reset-password-confirm"
                type="password"
                placeholder="********"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                disabled={isPending || !token}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={isPending || !token}>
        {isPending ? "Saving..." : "Reset password"}
      </Button>
      <Link prefetch={false} href="/auth/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
        Back to login
      </Link>
    </form>
  );
}
