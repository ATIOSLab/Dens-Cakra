"use client";

import { useState, useTransition } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { Phone, RefreshCw, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiBrowserMutation } from "@/lib/api/browser-client";

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(9, { message: "Nomor WhatsApp minimal 9 digit." })
    .max(30, { message: "Nomor WhatsApp maksimal 30 karakter." })
    .regex(/^[+\d\s().-]+$/, {
      message: "Nomor WhatsApp harus berupa angka (boleh diawali + atau 0).",
    }),
});

type PhoneValues = z.infer<typeof phoneSchema>;

type AccountPhoneFormProps = {
  initialPhone?: string | null;
};

export function AccountPhoneForm({ initialPhone }: AccountPhoneFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: initialPhone ?? "" },
  });

  const handleSubmit = (values: PhoneValues) => {
    setFormError(null);

    startTransition(async () => {
      try {
        await apiBrowserMutation("PATCH", "/me/profile", { phone: values.phone });
        toast.success("Nomor WhatsApp berhasil diperbarui.");
        router.refresh();
      } catch {
        setFormError("Gagal memperbarui nomor WhatsApp. Coba beberapa saat lagi.");
      }
    });
  };

  return (
    <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {formError ? (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/5">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="account-whatsapp" className="font-medium text-sm leading-snug">
          Nomor WhatsApp
        </label>
        <div className="relative">
          <Phone className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            id="account-whatsapp"
            type="tel"
            placeholder="Contoh: 0812xxxxxxx"
            autoComplete="tel"
            disabled={isPending}
            aria-invalid={Boolean(form.formState.errors.phone)}
            className="h-9 pl-9"
            {...form.register("phone")}
          />
        </div>
        <p className="text-[12px] text-muted-foreground">
          Nomor ini digunakan untuk kelengkapan profil dan komunikasi WhatsApp.
        </p>
        {form.formState.errors.phone?.message ? (
          <p className="font-normal text-destructive text-sm" role="alert">
            {form.formState.errors.phone.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? (
          <>
            <RefreshCw className="animate-spin" />
            Menyimpan Nomor
          </>
        ) : (
          <>
            <Save />
            Simpan Nomor WhatsApp
          </>
        )}
      </Button>
    </form>
  );
}
