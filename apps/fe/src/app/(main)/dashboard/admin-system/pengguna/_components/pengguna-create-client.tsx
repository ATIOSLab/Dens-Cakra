"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Search, ShieldCheck, UserPlus } from "lucide-react";
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
import { cn } from "@/lib/utils";

import { createUserSchema, type CreateUserFormValues } from "./pengguna-schemas";
import type {
  AreaSearchResult,
  OrganizationUnitSummary,
  PositionSummary,
  RoleCode,
  UserProvisionResponse,
  UserRoleCatalogItem,
} from "./pengguna-types";
import {
  ROLE_CODE_OPTIONS,
  ROLE_CODE_TO_AUTH_ROLE,
  formatDateTime,
  getRoleLabel,
  toDateTimeLocalValue,
  toIsoFromLocalValue,
} from "./pengguna-types";

type PenggunaCreateClientProps = {
  roleCatalog: UserRoleCatalogItem[];
};

export function PenggunaCreateClient({ roleCatalog }: PenggunaCreateClientProps) {
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      fullName: "",
      phone: "",
      roleCode: "FIELD_OFFICER" as RoleCode,
      positionId: "",
      validFrom: toDateTimeLocalValue(new Date().toISOString()),
      areaScopeIds: [],
    },
  });

  const selectedRoleCode = form.watch("roleCode");
  const deferredRoleCode = useDeferredValue(selectedRoleCode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unitQuery, setUnitQuery] = useState("");
  const [unitResults, setUnitResults] = useState<OrganizationUnitSummary[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnitSummary | null>(null);
  const [positionQuery, setPositionQuery] = useState("");
  const [positionResults, setPositionResults] = useState<PositionSummary[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<PositionSummary | null>(null);
  const [areaQuery, setAreaQuery] = useState("");
  const [areaResults, setAreaResults] = useState<AreaSearchResult[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<AreaSearchResult[]>([]);
  const [successState, setSuccessState] = useState<UserProvisionResponse | null>(null);
  const deferredUnitQuery = useDeferredValue(unitQuery);
  const deferredPositionQuery = useDeferredValue(positionQuery);
  const deferredAreaQuery = useDeferredValue(areaQuery);

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
  }, [form, selectedPosition]);

  useEffect(() => {
    let cancelled = false;

    async function loadUnits() {
      if (deferredUnitQuery.trim().length < 2) {
        setUnitResults([]);
        return;
      }

      const results = await apiBrowserFetch<OrganizationUnitSummary[]>("/organization-units", {
        query: {
          search: deferredUnitQuery.trim(),
          page: 1,
          limit: 10,
        },
      });

      if (!cancelled) {
        setUnitResults(results);
      }
    }

    loadUnits().catch(() => {
      if (!cancelled) {
        setUnitResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredUnitQuery]);

  useEffect(() => {
    let cancelled = false;

    async function loadPositions() {
      if (!selectedUnit?.id || !deferredRoleCode) {
        setPositionResults([]);
        return;
      }

      const results = await apiBrowserFetch<PositionSummary[]>("/positions", {
        query: {
          unitId: selectedUnit.id,
          roleCode: deferredRoleCode,
          isActive: true,
          page: 1,
          limit: 20,
          ...(deferredPositionQuery.trim()
            ? { search: deferredPositionQuery.trim() }
            : {}),
        },
      });

      if (!cancelled) {
        setPositionResults(results);
      }
    }

    loadPositions().catch(() => {
      if (!cancelled) {
        setPositionResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredPositionQuery, deferredRoleCode, selectedUnit]);

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      if (deferredAreaQuery.trim().length < 2) {
        setAreaResults([]);
        return;
      }

      const results = await apiBrowserFetch<AreaSearchResult[]>("/administrative-areas/search", {
        query: {
          q: deferredAreaQuery.trim(),
          limit: 10,
        },
      });

      if (!cancelled) {
        setAreaResults(results);
      }
    }

    loadAreas().catch(() => {
      if (!cancelled) {
        setAreaResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredAreaQuery]);

  useEffect(() => {
    setSelectedPosition(null);
    setPositionQuery("");
  }, [selectedRoleCode, selectedUnit?.id]);

  const derivedAuthRole = selectedPosition?.role?.code
    ? ROLE_CODE_TO_AUTH_ROLE[selectedPosition.role.code]
    : null;
  const roleSummary = useMemo(
    () => roleCatalog.find((role) => role.key === derivedAuthRole) ?? null,
    [derivedAuthRole, roleCatalog],
  );

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
    if (!selectedUnit?.id) {
      toast.error("Pilih unit organisasi untuk mempersempit jabatan.");
      return;
    }

    if (!selectedPosition?.id || !selectedPosition.organizationUnit?.id || !selectedPosition.role?.code) {
      toast.error("Pilih jabatan aktif yang akan ditempati user.");
      return;
    }

    if (!derivedAuthRole) {
      toast.error("Role auth tidak bisa diturunkan dari jabatan terpilih.");
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
          areaScopeIds: values.areaScopeIds,
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
            <Badge variant="outline">{getRoleLabel(successState.userProfile.authUser.role)}</Badge>
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
                  @{successState.userProfile.username || "-"} • {successState.userProfile.authUser.email}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{getRoleLabel(successState.userProfile.authUser.role)}</Badge>
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
                    roleCode: "FIELD_OFFICER" as RoleCode,
                    positionId: "",
                    validFrom: toDateTimeLocalValue(new Date().toISOString()),
                    areaScopeIds: [],
                  });
                  setSelectedUnit(null);
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
          {derivedAuthRole ? <Badge variant="outline">{getRoleLabel(derivedAuthRole)}</Badge> : null}
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Tambah Pengguna</h1>
        <p className="max-w-4xl text-muted-foreground text-sm">
          Pilih role target sebagai filter, tentukan jabatan aktif sebagai sumber kebenaran, lalu pilih area scope
          yang harus melekat pada assignment utama user baru.
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
                  <FieldLabel htmlFor="role-filter">Role target</FieldLabel>
                  <FieldContent>
                    <NativeSelect
                      id="role-filter"
                      value={selectedRoleCode}
                      onChange={(event) =>
                        form.setValue("roleCode", event.target.value as RoleCode, {
                          shouldValidate: true,
                        })
                      }
                    >
                      {ROLE_CODE_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldDescription>
                      Dipakai untuk mempersempit pencarian jabatan. Role auth final akan diturunkan dari jabatan terpilih.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.roleCode]} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel htmlFor="valid-from">Mulai assignment utama</FieldLabel>
                  <FieldContent>
                    <Input id="valid-from" type="datetime-local" {...form.register("validFrom")} />
                    <FieldError errors={[form.formState.errors.validFrom]} />
                  </FieldContent>
                </Field>
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <Label htmlFor="unit-query">Cari unit organisasi</Label>
                <Input
                  id="unit-query"
                  value={unitQuery}
                  onChange={(event) => setUnitQuery(event.target.value)}
                  placeholder="Ketik minimal 2 karakter nama atau kode unit"
                />
                {selectedUnit ? (
                  <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                    <div className="font-medium">{selectedUnit.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedUnit.code} • {selectedUnit.type}
                    </div>
                    <div className="mt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUnit(null)}>
                        Ganti unit
                      </Button>
                    </div>
                  </div>
                ) : null}
                {unitResults.length ? (
                  <div className="rounded-xl border border-border/70">
                    {unitResults.map((unit) => (
                      <button
                        key={unit.id}
                        type="button"
                        onClick={() => {
                          setSelectedUnit(unit);
                          setUnitQuery("");
                          setUnitResults([]);
                        }}
                        className="flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 not-last:border-b"
                      >
                        <div>
                          <div className="font-medium">{unit.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {unit.code} • {unit.type}
                          </div>
                        </div>
                        <Search className="mt-0.5 size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <Label htmlFor="position-query">Pilih jabatan aktif</Label>
                <Input
                  id="position-query"
                  value={positionQuery}
                  onChange={(event) => setPositionQuery(event.target.value)}
                  placeholder={selectedUnit ? "Opsional: persempit seat code atau title" : "Pilih unit dulu"}
                  disabled={!selectedUnit}
                />
                {selectedPosition ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                    <div className="font-medium">{selectedPosition.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedPosition.seatCode} • {selectedPosition.organizationUnit?.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Role domain: {selectedPosition.role?.name || selectedPosition.role?.code}
                      {selectedPosition.branch ? ` • Route ${selectedPosition.branch}` : ""}
                    </div>
                    <div className="mt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPosition(null)}>
                        Ganti jabatan
                      </Button>
                    </div>
                  </div>
                ) : null}
                {selectedUnit && !positionResults.length ? (
                  <div className="text-sm text-muted-foreground">
                    Ketik keyword jabatan jika daftar belum muncul, atau biarkan kosong untuk mengambil jabatan aktif
                    sesuai role pada unit terpilih.
                  </div>
                ) : null}
                {positionResults.length ? (
                  <div className="rounded-xl border border-border/70">
                    {positionResults.map((position) => (
                      <button
                        key={position.id}
                        type="button"
                        onClick={() => {
                          setSelectedPosition(position);
                          setPositionQuery("");
                        }}
                        className={cn(
                          "flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 not-last:border-b",
                          selectedPosition?.id === position.id ? "bg-primary/5" : "",
                        )}
                      >
                        <div>
                          <div className="font-medium">{position.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {position.seatCode} • {position.organizationUnit?.name}
                          </div>
                        </div>
                        <Badge variant="outline">{position.role?.code || position.code}</Badge>
                      </button>
                    ))}
                  </div>
                ) : null}
                <FieldError errors={[form.formState.errors.positionId]} />
              </div>

              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <Label htmlFor="area-query">Pilih area scope</Label>
                <Input
                  id="area-query"
                  value={areaQuery}
                  onChange={(event) => setAreaQuery(event.target.value)}
                  placeholder="Ketik minimal 2 karakter nama atau kode area"
                />
                <div className="flex flex-wrap gap-2">
                  {selectedAreas.map((area, index) => (
                    <Badge key={area.id} variant={index === 0 ? "default" : "outline"} className="gap-2">
                      {area.name}
                      {index === 0 ? " (utama)" : ""}
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedAreas((current) => current.filter((item) => item.id !== area.id))
                        }
                        className="text-current/70 transition hover:text-current"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                {areaResults.length ? (
                  <div className="rounded-xl border border-border/70">
                    {areaResults.map((area) => {
                      const alreadySelected = selectedAreas.some((item) => item.id === area.id);

                      return (
                        <button
                          key={area.id}
                          type="button"
                          disabled={alreadySelected}
                          onClick={() => {
                            setSelectedAreas((current) => [...current, area]);
                            setAreaQuery("");
                          }}
                          className="flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50 not-last:border-b"
                        >
                          <div>
                            <div className="font-medium">{area.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {area.code} • {area.level}
                            </div>
                          </div>
                          <Badge variant="outline">{alreadySelected ? "Dipilih" : "Tambah"}</Badge>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
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
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Role auth final</div>
                <div className="mt-2 font-medium">{derivedAuthRole ? getRoleLabel(derivedAuthRole) : "-"}</div>
                <div className="text-sm text-muted-foreground">
                  {roleSummary?.summary || "Pilih jabatan untuk melihat role auth yang akan diinjeksikan ke Better Auth."}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Assignment payload</div>
                <div className="mt-2 space-y-1 text-sm">
                  <div>Unit ID: {selectedPosition?.organizationUnit?.id || "-"}</div>
                  <div>Position ID: {selectedPosition?.id || "-"}</div>
                  <div>Branch: {selectedPosition?.branch || "-"}</div>
                  <div>Scope count: {selectedAreas.length}</div>
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
