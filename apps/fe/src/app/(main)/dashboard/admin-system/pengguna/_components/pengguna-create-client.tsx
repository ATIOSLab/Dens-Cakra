"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, ShieldCheck, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

import { createUserSchema, type CreateUserFormValues } from "./pengguna-schemas";
import type {
  AreaSearchResult,
  PositionSummary,
  UserProvisionResponse,
} from "./pengguna-types";
import {
  ROLE_CODE_TO_AUTH_ROLE,
  formatDateTime,
  toDateTimeLocalValue,
  toIsoFromLocalValue,
} from "./pengguna-types";

export function PenggunaCreateClient() {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      fullName: "",
      phone: "",
      positionId: "",
      validFrom: toDateTimeLocalValue(new Date().toISOString()),
      areaScopeIds: [],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [positionOptions, setPositionOptions] = useState<PositionSummary[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<PositionSummary | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<AreaSearchResult[]>([]);
  const [successState, setSuccessState] = useState<UserProvisionResponse | null>(null);

  useEffect(() => {
    form.setValue(
      "areaScopeIds",
      selectedAreas.map((area) => area.id),
      { shouldValidate: true },
    );
  }, [form, selectedAreas]);

  useEffect(() => {
    form.setValue("positionId", selectedPosition?.id ?? "", {
      shouldValidate: true,
    });
    setSelectedAreas(
      selectedPosition?.areaCoverages?.map((coverage) => ({
        id: coverage.area.id,
        code: coverage.area.code,
        name: coverage.area.name,
        level: coverage.area.level,
      })) ?? [],
    );
  }, [form, selectedPosition]);

  useEffect(() => {
    let cancelled = false;

    async function loadPositionOptions() {
      setPositionsLoading(true);
      const results = await apiBrowserFetch<PositionSummary[]>("/positions", {
        query: {
          isActive: true,
          page: 1,
          limit: 200,
        },
      });

      if (!cancelled) {
        setPositionOptions(results);
      }
    }

    loadPositionOptions().catch(() => {
      if (!cancelled) {
        setPositionOptions([]);
      }
    }).finally(() => {
      if (!cancelled) {
        setPositionsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const derivedAuthRole = selectedPosition?.role?.code
    ? ROLE_CODE_TO_AUTH_ROLE[selectedPosition.role.code]
    : null;

  async function handleCopyPassword() {
    if (!successState?.generatedTempPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(successState.generatedTempPassword);
      toast.success("Password sementara berhasil disalin.");
    } catch {
      toast.error("Clipboard tidak bisa diakses. Salin password secara manual.");
    }
  }

  async function handleSubmit(values: CreateUserFormValues) {
    if (!selectedPosition?.id || !selectedPosition.organizationUnit?.id || !selectedPosition.role?.code) {
      toast.error("Pilih jabatan aktif yang akan ditempati user.");
      return;
    }

    if (!derivedAuthRole) {
      toast.error("Data jabatan terpilih belum lengkap untuk provisioning.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiBrowserMutation<UserProvisionResponse>(
        "POST",
        "/user-profiles/provision",
        {
          auth: {
            name: values.name.trim(),
            email: values.email.trim(),
            role: derivedAuthRole,
          },
          profile: {
            username: values.username.trim(),
            fullName: values.fullName.trim(),
            ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
          },
          assignment: {
            organizationUnitId: selectedPosition.organizationUnit.id,
            ...(selectedPosition.branch ? { branch: selectedPosition.branch } : {}),
            positionId: selectedPosition.id,
            validFrom: toIsoFromLocalValue(values.validFrom),
          },
        },
      );

      setSuccessState(response);
      toast.success("User baru berhasil diprovision.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Provisioning user gagal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successState) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Provisioning Selesai</Badge>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Password sementara siap diserahkan</h1>
          <p className="max-w-3xl text-muted-foreground text-sm">
            Secret ini hanya ditampilkan sekali setelah provisioning berhasil. Simpan atau serahkan ke operator
            yang berwenang sebelum meninggalkan halaman.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="border border-emerald-200/70 bg-emerald-50/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="size-4" />
                Provisioning sukses
              </CardTitle>
              <CardDescription className="text-emerald-800/80">
                Akun Better Auth, profil domain, assignment utama, dan scope area sudah dibentuk secara atomik.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-300/60 bg-white p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-700">Password sementara</div>
                <div className="mt-2 break-all rounded-lg bg-slate-950 px-4 py-3 font-mono text-sm text-slate-50">
                  {successState.generatedTempPassword ?? "Password tidak digenerate."}
                </div>
                <div className="mt-2 text-sm text-emerald-900/80">
                  Diterbitkan pada {formatDateTime(new Date().toISOString())}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleCopyPassword} disabled={!successState.generatedTempPassword}>
                  <Copy className="size-4" />
                  Salin password
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href={`/dashboard/admin-system/pengguna/${successState.userProfile.id}`}>
                    Buka detail pengguna
                  </Link>
                </Button>
                <Button asChild type="button" variant="ghost">
                  <Link href="/dashboard/admin-system/pengguna">Kembali ke daftar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Ringkasan user baru</CardTitle>
              <CardDescription>Gunakan detail ini untuk verifikasi cepat sebelum berpindah halaman.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 p-4">
                <div className="font-heading text-xl font-semibold">
                  {successState.userProfile.fullName || successState.userProfile.authUser.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  @{successState.userProfile.username || "-"} - {successState.userProfile.authUser.email}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{successState.userProfile.status}</Badge>
                </div>
              </div>

              <Alert>
                <KeyRound className="size-4" />
                <AlertTitle>Langkah setelah ini</AlertTitle>
                <AlertDescription>
                  Sampaikan password sementara lewat kanal yang aman, lalu minta user mengganti kredensialnya
                  melalui flow reset password saat diperlukan.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset({
                    name: "",
                    email: "",
                    username: "",
                    fullName: "",
                    phone: "",
                    positionId: "",
                    validFrom: toDateTimeLocalValue(new Date().toISOString()),
                    areaScopeIds: [],
                  });
                  setSelectedPosition(null);
                  setSelectedAreas([]);
                  setSuccessState(null);
                }}
              >
                Provision user lain
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">User Provisioning</Badge>
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Tambah Pengguna</h1>
        <p className="max-w-4xl text-muted-foreground text-sm">
          Isi identitas user, lalu pilih jabatan aktif sebagai sumber penempatan dan wilayah assignment utama.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Form Provisioning
            </CardTitle>
            <CardDescription>
              Password awal akan dibuat otomatis oleh backend setelah data profile, jabatan, dan scope lolos validasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="auth-name">Nama akun auth</FieldLabel>
                  <FieldContent>
                    <Input id="auth-name" {...form.register("name")} placeholder="Nama untuk Better Auth" />
                    <FieldError errors={[form.formState.errors.name]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                  <FieldContent>
                    <Input id="auth-email" type="email" {...form.register("email")} placeholder="operator@denscakra.local" />
                    <FieldError errors={[form.formState.errors.email]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-username">Username</FieldLabel>
                  <FieldContent>
                    <Input id="profile-username" {...form.register("username")} placeholder="operator-lapangan" />
                    <FieldError errors={[form.formState.errors.username]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-fullname">Nama lengkap</FieldLabel>
                  <FieldContent>
                    <Input id="profile-fullname" {...form.register("fullName")} placeholder="Nama lengkap personel" />
                    <FieldError errors={[form.formState.errors.fullName]} />
                  </FieldContent>
                </Field>
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="profile-phone">Nomor telepon</FieldLabel>
                  <FieldContent>
                    <Input id="profile-phone" {...form.register("phone")} placeholder="08xxxxxxxxxx" />
                    <FieldDescription>
                      Nomor akan dinormalisasi backend ke format Indonesia yang dipakai sistem.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.phone]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="valid-from">Mulai assignment utama</FieldLabel>
                  <FieldContent>
                    <Input id="valid-from" type="datetime-local" {...form.register("validFrom")} />
                    <FieldError errors={[form.formState.errors.validFrom]} />
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <Label htmlFor="position-id">Pilih jabatan aktif</Label>
                <NativeSelect
                  id="position-id"
                  className="w-full"
                  value={selectedPosition?.id ?? ""}
                  disabled={positionsLoading || !positionOptions.length}
                  onChange={(event) => {
                    const nextPosition = positionOptions.find((position) => position.id === event.target.value) ?? null;
                    setSelectedPosition(nextPosition);
                  }}
                >
                  <NativeSelectOption value="">
                    {positionsLoading
                      ? "Memuat daftar jabatan..."
                      : positionOptions.length
                        ? "Pilih jabatan dari master jabatan"
                        : "Belum ada jabatan aktif"}
                  </NativeSelectOption>
                  {positionOptions.map((position) => (
                    <NativeSelectOption key={position.id} value={position.id}>
                      {position.title} - {position.seatCode} - {position.organizationUnit?.name ?? "Tanpa penempatan"}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {selectedPosition ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="font-medium">{selectedPosition.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPosition.seatCode} - {selectedPosition.organizationUnit?.name}
                    </div>
                    <div className="mt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPosition(null)}>
                        Ganti jabatan
                      </Button>
                    </div>
                  </div>
                ) : null}
                {!positionsLoading && !positionOptions.length ? (
                  <div className="text-sm text-muted-foreground">
                    Belum ada jabatan aktif yang bisa dipilih untuk user.
                  </div>
                ) : null}
                <FieldError errors={[form.formState.errors.positionId]} />
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <Label>Wilayah dari jabatan</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedAreas.length ? (
                    selectedAreas.map((area, index) => (
                      <Badge key={area.id} variant={index === 0 ? "default" : "outline"}>
                        {area.name}
                        {index === 0 ? " (utama)" : ""}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pilih jabatan aktif untuk melihat wilayah penugasan.
                    </p>
                  )}
                </div>
                <FieldError errors={[form.formState.errors.areaScopeIds]} />
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild type="button" variant="ghost">
              <Link href="/dashboard/admin-system/pengguna">Batal</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Provision user"}
            </Button>
          </CardFooter>
        </Card>

        <div className="space-y-4">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Derivasi Kontrak
              </CardTitle>
              <CardDescription>
                Frontend menyusun payload backend dari jabatan aktif sebagai sumber kebenaran.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Jabatan</div>
                <div className="mt-2 font-medium">{selectedPosition?.title || "-"}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedPosition?.seatCode || "-"} - {selectedPosition?.organizationUnit?.name || "Pilih jabatan untuk melihat penempatan."}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Ringkasan assignment</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div>Unit: {selectedPosition?.branch || "-"}</div>
                  <div>Penempatan: {selectedPosition?.organizationUnit?.name || "-"}</div>
                  <div>Wilayah: {selectedPosition?.areaCoverages?.length ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <AlertTriangle className="size-4" />
            <AlertTitle>Catatan operasional</AlertTitle>
            <AlertDescription>
              Endpoint provisioning sekarang menggenerate password sementara di backend. Secret hanya muncul
              sekali setelah sukses dan tidak disimpan ulang pada halaman detail.
            </AlertDescription>
          </Alert>
        </div>
      </form>
    </div>
  );
}
