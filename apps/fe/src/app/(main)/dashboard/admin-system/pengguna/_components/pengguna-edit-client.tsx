"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronLeft, PencilLine, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiBrowserMutation } from "@/lib/api/browser-client";

import { type EditUserFormValues, editUserSchema } from "./pengguna-schemas";
import type { UserDetail } from "./pengguna-types";
import {
  formatDateTime,
  getAssignmentUnitSummary,
  getPrimaryAssignment,
  getRoleLabel,
  isUserLocked,
} from "./pengguna-types";

type PenggunaEditClientProps = {
  user: UserDetail;
};

export function PenggunaEditClient({ user }: PenggunaEditClientProps) {
  const router = useRouter();
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username ?? "",
      fullName: user.fullName ?? user.authUser.name ?? "",
      phone: user.phone ?? "",
    },
  });
  const primaryAssignment = getPrimaryAssignment(user);
  const primaryUnit = getAssignmentUnitSummary(primaryAssignment);

  function sanitizePhoneInput(value: string) {
    return value.replace(/\D/g, "");
  }

  async function handleSubmit(values: EditUserFormValues) {
    try {
      await apiBrowserMutation("PATCH", `/user-profiles/${user.id}`, {
        username: values.username.trim(),
        fullName: values.fullName.trim(),
        phone: values.phone?.trim() || null,
      });

      toast.success("Metadata pengguna berhasil diperbarui.");
      router.push(`/dashboard/admin-system/pengguna/${user.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui metadata pengguna.");
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Top Header */}
      <div className="space-y-1.5">
        <Link
          href={`/dashboard/admin-system/pengguna/${user.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Detail Pengguna
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Edit Metadata Pengguna</h1>
          <Badge variant="outline" className="text-xs font-normal">
            {getRoleLabel(user.authUser.role)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Perbarui metadata profil domain seperti username, nama lengkap, dan nomor telepon operasional.
        </p>
      </div>

      {/* Main Form Grid */}
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Form Panel */}
        <Card className="border border-border/60 shadow-sm">
          <CardHeader className="pb-4 border-b border-border/40">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <PencilLine className="size-4 text-primary" />
              Metadata Profil Domain
            </CardTitle>
            <CardDescription className="text-xs">
              Ubah data identitas profil domain tanpa memutus role autentikasi atau penugasan aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <FieldGroup className="space-y-4">
              <Field>
                <FieldLabel
                  htmlFor="edit-username"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Username
                </FieldLabel>
                <FieldContent>
                  <Input id="edit-username" {...form.register("username")} className="h-9 text-sm" />
                  <FieldError errors={[form.formState.errors.username]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="edit-fullname"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Nama Lengkap
                </FieldLabel>
                <FieldContent>
                  <Input id="edit-fullname" {...form.register("fullName")} className="h-9 text-sm" />
                  <FieldError errors={[form.formState.errors.fullName]} />
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel
                  htmlFor="edit-phone"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Nomor Telepon Operasional
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edit-phone"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="08123456789"
                    className="h-9 text-sm"
                    {...form.register("phone", {
                      onChange: (event) => {
                        const sanitizedValue = sanitizePhoneInput(event.target.value);
                        form.setValue("phone", sanitizedValue, {
                          shouldDirty: true,
                          shouldValidate: Boolean(form.formState.errors.phone),
                        });
                      },
                    })}
                  />
                  <FieldDescription className="text-[11px]">
                    Biarkan kosong jika profil belum memiliki nomor telepon aktif.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.phone]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20 px-6 py-4">
            <Button asChild type="button" variant="ghost" size="sm">
              <Link href={`/dashboard/admin-system/pengguna/${user.id}`}>Batal</Link>
            </Button>
            <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </CardFooter>
        </Card>

        {/* Right Summary Sidebar */}
        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-muted-foreground" />
                Ringkasan Profil
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="space-y-1">
                <div className="font-semibold text-sm text-foreground">
                  {user.fullName ?? user.authUser.name ?? user.authUser.email}
                </div>
                <div className="text-xs text-muted-foreground">{user.authUser.email}</div>
                <div className="flex flex-wrap gap-1 pt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {getRoleLabel(user.authUser.role)}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {user.status}
                  </Badge>
                  {isUserLocked(user) && (
                    <Badge variant="destructive" className="text-[10px]">
                      Terkunci
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-border/40">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Unit Utama
                </span>
                <div className="font-medium text-foreground">
                  {primaryUnit?.name || primaryAssignment?.branch || "-"}
                </div>
              </div>

              <div className="space-y-1 pt-2 border-t border-border/40 text-muted-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit Informasi
                </span>
                <div className="space-y-0.5 text-[11px] pt-0.5">
                  <div>Dibuat: {formatDateTime(user.createdAt)}</div>
                  <div>Update terakhir: {formatDateTime(user.updatedAt)}</div>
                  <div>Login terakhir: {formatDateTime(user.lastLoginAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
