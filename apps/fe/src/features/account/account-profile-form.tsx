"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AtSign, RefreshCw, Save, User, UserRound } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";

const updateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username minimal 3 karakter." })
    .max(50, { message: "Username maksimal 50 karakter." })
    .regex(/^[a-zA-Z0-9_.]+$/, {
      message: "Username hanya boleh berisi huruf, angka, garis bawah (_), dan titik (.).",
    }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama minimal 2 karakter." })
    .max(180, { message: "Nama maksimal 180 karakter." }),
});

type UpdateProfileValues = z.infer<typeof updateProfileSchema>;

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

function resolveErrorMessage(error: AuthClientError) {
  const code = error.code?.toUpperCase();
  const message = error.message?.toLowerCase() ?? "";

  if (
    code === "USERNAME_IS_ALREADY_TAKEN" ||
    message.includes("already taken") ||
    message.includes("already exists") ||
    message.includes("unique constraint") ||
    message.includes("username")
  ) {
    return "Username sudah digunakan oleh akun lain. Silakan pilih username lain.";
  }

  if (code === "INVALID_USERNAME" || message.includes("invalid username")) {
    return "Format username tidak valid. Gunakan huruf, angka, titik (.), atau garis bawah (_).";
  }

  if (code === "USERNAME_TOO_SHORT" || message.includes("too short")) {
    return "Username minimal 3 karakter.";
  }

  return error.message || "Gagal memperbarui profil. Coba beberapa saat lagi.";
}

type AccountProfileFormProps = {
  initialUsername?: string | null;
  initialName: string;
  email: string;
};

export function AccountProfileForm({ initialUsername, initialName, email }: AccountProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      username: initialUsername ?? "",
      name: initialName,
    },
  });

  const handleSubmit = (values: UpdateProfileValues) => {
    setFormError(null);

    startTransition(async () => {
      const { error } = await authClient.updateUser({
        username: values.username,
        name: values.name,
      });

      if (error) {
        setFormError(resolveErrorMessage(error));
        return;
      }

      toast.success("Username dan profil akun berhasil diperbarui.");
      router.refresh();
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
        {/* Username Field */}
        <Controller
          control={form.control}
          name="username"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5" data-invalid={fieldState.invalid}>
              <label htmlFor="account-username" className="font-medium text-sm leading-snug">
                Username Akun
              </label>
              <div className="relative">
                <AtSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  {...field}
                  id="account-username"
                  type="text"
                  placeholder="Masukkan username..."
                  autoComplete="username"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  className="h-10 pl-9"
                />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Digunakan untuk login dan identitas sandi akun.
              </p>
              {fieldState.error?.message ? (
                <p className="font-normal text-destructive text-sm" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />

        {/* Name Field */}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <div className="flex flex-col gap-1.5" data-invalid={fieldState.invalid}>
              <label htmlFor="account-name" className="font-medium text-sm leading-snug">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  {...field}
                  id="account-name"
                  type="text"
                  placeholder="Masukkan nama lengkap..."
                  autoComplete="name"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  className="h-10 pl-9"
                />
              </div>
              {fieldState.error?.message ? (
                <p className="font-normal text-destructive text-sm" role="alert">
                  {fieldState.error.message}
                </p>
              ) : null}
            </div>
          )}
        />

        {/* Email Field (Read-only) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="account-email" className="font-medium text-sm leading-snug text-muted-foreground">
            Email (Sistem)
          </label>
          <div className="relative">
            <UserRound className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40" />
            <Input
              id="account-email"
              type="email"
              value={email}
              disabled
              className="h-10 pl-9 bg-muted/30 text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <Button type="submit" size="lg" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? (
          <>
            <RefreshCw className="animate-spin" />
            Menyimpan Profil
          </>
        ) : (
          <>
            <Save />
            Simpan Profil
          </>
        )}
      </Button>
    </form>
  );
}
