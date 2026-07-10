"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

const formSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
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
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {successMessage ? (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field className="gap-1.5" data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="forgot-password-email">Email Address</FieldLabel>
              <Input
                {...field}
                id="forgot-password-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
                disabled={isPending}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending ? "Sending..." : "Send reset link"}
      </Button>
      <Link prefetch={false} href="/auth/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
        Back to login
      </Link>
    </form>
  );
}
