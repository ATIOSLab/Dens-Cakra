"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilLine, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiBrowserMutation } from "@/lib/api/browser-client";

import { editUserSchema, type EditUserFormValues } from "./pengguna-schemas";
import type { UserDetail } from "./pengguna-types";
import { formatDateTime, getPrimaryAssignment, getRoleLabel, isUserLocked } from "./pengguna-types";

type PenggunaEditClientProps = {
  user: UserDetail;
};

export function PenggunaEditClient({ user }: PenggunaEditClientProps) {
  const router = useRouter();
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      username: user.username || "",
      fullName: user.fullName || user.authUser.name || "",
      phone: user.phone || "",
    },
  });
  const primaryAssignment = getPrimaryAssignment(user);

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
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Edit Metadata</Badge>
          <Badge variant="outline">{getRoleLabel(user.authUser.role)}</Badge>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Edit Pengguna</h1>
        <p className="max-w-3xl text-muted-foreground text-sm">
          Halaman ini hanya mengubah metadata profil domain. Role auth, status, assignment, dan area scope tetap
          dikendalikan lewat halaman detail serta aksi khusus.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PencilLine className="size-4" />
              Metadata profil
            </CardTitle>
            <CardDescription>
              Pastikan username dan nama lengkap tetap selaras dengan identitas yang dipakai di operasional.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="edit-username">Username</FieldLabel>
                <FieldContent>
                  <Input id="edit-username" {...form.register("username")} />
                  <FieldError errors={[form.formState.errors.username]} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-fullname">Nama lengkap</FieldLabel>
                <FieldContent>
                  <Input id="edit-fullname" {...form.register("fullName")} />
                  <FieldError errors={[form.formState.errors.fullName]} />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-phone">Nomor telepon</FieldLabel>
                <FieldContent>
                  <Input id="edit-phone" {...form.register("phone")} />
                  <FieldDescription>
                    Biarkan kosong jika profil domain memang belum memiliki nomor aktif.
                  </FieldDescription>
                  <FieldError errors={[form.formState.errors.phone]} />
                </FieldContent>
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild type="button" variant="ghost">
              <Link href={`/dashboard/admin-system/pengguna/${user.id}`}>Batal</Link>
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Menyimpan..." : "Simpan perubahan"}
            </Button>
          </CardFooter>
        </Card>

        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Ringkasan read-only
            </CardTitle>
            <CardDescription>
              Konteks ini tetap terlihat agar perubahan metadata tidak memutus hubungan dengan role dan assignment aktif.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/70 p-4">
              <div className="font-heading text-xl font-semibold">
                {user.fullName || user.authUser.name || user.authUser.email}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{user.authUser.email}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{getRoleLabel(user.authUser.role)}</Badge>
                <Badge>{user.status}</Badge>
                {isUserLocked(user) ? <Badge variant="destructive">Locked</Badge> : null}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Assignment utama</div>
              <div className="mt-2 font-medium">{primaryAssignment?.position.title || "-"}</div>
              <div className="text-sm text-muted-foreground">
                {primaryAssignment?.position.organizationUnit?.name || "-"}
              </div>
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Audit minimum</div>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                <div>Dibuat: {formatDateTime(user.createdAt)}</div>
                <div>Update terakhir: {formatDateTime(user.updatedAt)}</div>
                <div>Login terakhir: {formatDateTime(user.lastLoginAt)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
