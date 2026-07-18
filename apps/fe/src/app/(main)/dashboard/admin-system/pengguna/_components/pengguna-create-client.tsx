"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  Copy,
  GraduationCap,
  History,
  KeyRound,
  Plus,
  ShieldCheck,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

import { type CreateUserFormValues, createUserSchema } from "./pengguna-schemas";
import type { AreaSearchResult, PositionSummary, UserProvisionResponse } from "./pengguna-types";
import { formatDateTime, ROLE_CODE_TO_AUTH_ROLE, toDateTimeLocalValue, toIsoFromLocalValue } from "./pengguna-types";

const MARITAL_STATUS_OPTIONS = [
  { value: "SINGLE", label: "Belum Menikah" },
  { value: "MARRIED", label: "Menikah" },
  { value: "DIVORCED", label: "Cerai Hidup" },
  { value: "WIDOWED", label: "Cerai Mati" },
] as const;

const PERSONNEL_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Aktif" },
  { value: "INACTIVE", label: "Nonaktif" },
  { value: "RETIRED", label: "Pensiun" },
  { value: "CONTRACT", label: "Kontrak" },
] as const;

const BLOOD_TYPE_OPTIONS = ["A", "B", "AB", "O"] as const;

function sanitizeNumericInput(value: string) {
  return value.replace(/\D/g, "");
}

function calculateCompletedYears(value?: string) {
  if (!value) {
    return "";
  }

  const sourceDate = new Date(value);
  if (Number.isNaN(sourceDate.getTime())) {
    return "";
  }

  const now = new Date();
  let years = now.getFullYear() - sourceDate.getFullYear();
  const monthDelta = now.getMonth() - sourceDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < sourceDate.getDate())) {
    years -= 1;
  }

  return String(Math.max(years, 0));
}

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toIsoDateValue(value?: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function createDefaultValues(): CreateUserFormValues {
  return {
    name: "",
    email: "",
    username: "",
    fullName: "",
    phone: "",
    nationalIdNumber: "",
    birthPlace: "",
    birthDate: "",
    gender: undefined,
    religion: "",
    maritalStatus: undefined,
    bloodType: "",
    personnelNumber: "",
    rankGrade: "",
    personnelStatus: undefined,
    joinedAt: "",
    lastEducation: "",
    educationInstitution: "",
    educationMajor: "",
    graduationYear: "",
    positionHistory: [],
    assignmentHistory: [],
    competencies: [],
    positionId: "",
    validFrom: toDateTimeLocalValue(new Date().toISOString()),
    areaScopeIds: [],
  };
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/70 pb-4">
      <div className="mt-1 text-primary">{icon}</div>
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

export function PenggunaCreateClient() {
  const router = useRouter();
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: createDefaultValues(),
  });

  const positionHistoryFields = useFieldArray({
    control: form.control,
    name: "positionHistory",
  });
  const assignmentHistoryFields = useFieldArray({
    control: form.control,
    name: "assignmentHistory",
  });

  const birthDate = form.watch("birthDate");
  const joinedAt = form.watch("joinedAt");
  const competencies = form.watch("competencies") ?? [];
  const [competencyDraft, setCompetencyDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [positionOptions, setPositionOptions] = useState<PositionSummary[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<PositionSummary | null>(null);
  const [selectedAreas, setSelectedAreas] = useState<AreaSearchResult[]>([]);
  const [successState, setSuccessState] = useState<UserProvisionResponse | null>(null);
  const [pendingProvisionValues, setPendingProvisionValues] = useState<CreateUserFormValues | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const calculatedAge = useMemo(() => calculateCompletedYears(birthDate), [birthDate]);
  const calculatedTenure = useMemo(() => calculateCompletedYears(joinedAt), [joinedAt]);

  useEffect(() => {
    form.setValue(
      "areaScopeIds",
      selectedAreas.map((area) => area.id),
      { shouldValidate: Boolean(form.formState.errors.areaScopeIds) },
    );
  }, [form, selectedAreas]);

  useEffect(() => {
    form.setValue("positionId", selectedPosition?.id ?? "", {
      shouldValidate: Boolean(form.formState.errors.positionId),
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

    loadPositionOptions()
      .catch(() => {
        if (!cancelled) {
          setPositionOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPositionsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const derivedAuthRole = selectedPosition?.role?.code ? ROLE_CODE_TO_AUTH_ROLE[selectedPosition.role.code] : null;

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

  function addCompetency() {
    const nextCompetency = competencyDraft.trim();
    if (nextCompetency.length < 2) {
      toast.error("Kompetensi minimal 2 karakter.");
      return;
    }

    if (competencies.some((item) => item.toLowerCase() === nextCompetency.toLowerCase())) {
      toast.error("Kompetensi sudah ada.");
      return;
    }

    form.setValue("competencies", [...competencies, nextCompetency], {
      shouldDirty: true,
      shouldValidate: Boolean(form.formState.errors.competencies),
    });
    setCompetencyDraft("");
  }

  function removeCompetency(removedIndex: number) {
    form.setValue(
      "competencies",
      competencies.filter((_, index) => index !== removedIndex),
      { shouldDirty: true, shouldValidate: Boolean(form.formState.errors.competencies) },
    );
  }

  function requestProvisionConfirmation(values: CreateUserFormValues) {
    if (!selectedPosition?.id || !selectedPosition.organizationUnit?.id || !selectedPosition.role?.code) {
      toast.error("Pilih jabatan aktif yang akan ditempati user.");
      return;
    }

    if (!derivedAuthRole) {
      toast.error("Data jabatan terpilih belum lengkap untuk provisioning.");
      return;
    }

    setPendingProvisionValues(values);
  }

  async function executeProvision(values: CreateUserFormValues) {
    if (!selectedPosition?.id || !selectedPosition.organizationUnit?.id || !selectedPosition.role?.code) {
      toast.error("Pilih jabatan aktif yang akan ditempati user.");
      return;
    }

    if (!derivedAuthRole) {
      toast.error("Data jabatan terpilih belum lengkap untuk provisioning.");
      return;
    }

    setIsSubmitting(true);

    const positionHistory = values.positionHistory?.map((item) => ({
      title: item.title.trim(),
      organizationUnit: emptyToUndefined(item.organizationUnit),
      area: emptyToUndefined(item.area),
      startedAt: toIsoDateValue(item.startedAt),
      endedAt: item.status === "ACTIVE" ? undefined : toIsoDateValue(item.endedAt),
      status: item.status,
    }));

    const assignmentHistory = values.assignmentHistory?.map((item) => ({
      name: item.name.trim(),
      unit: emptyToUndefined(item.unit),
      location: emptyToUndefined(item.location),
      period: emptyToUndefined(item.period),
      description: emptyToUndefined(item.description),
    }));

    try {
      const response = await apiBrowserMutation<UserProvisionResponse>("POST", "/user-profiles/provision", {
        auth: {
          name: values.name.trim(),
          email: values.email.trim(),
          role: derivedAuthRole,
        },
        profile: {
          username: values.username.trim(),
          fullName: values.fullName.trim(),
          ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
          nationalIdNumber: values.nationalIdNumber.trim(),
          birthPlace: values.birthPlace.trim(),
          birthDate: toIsoDateValue(values.birthDate),
          gender: values.gender,
          ...(emptyToUndefined(values.religion) ? { religion: values.religion?.trim() } : {}),
          ...(values.maritalStatus ? { maritalStatus: values.maritalStatus } : {}),
          ...(emptyToUndefined(values.bloodType) ? { bloodType: values.bloodType?.trim() } : {}),
          ...(emptyToUndefined(values.personnelNumber) ? { personnelNumber: values.personnelNumber?.trim() } : {}),
          ...(emptyToUndefined(values.rankGrade) ? { rankGrade: values.rankGrade?.trim() } : {}),
          personnelStatus: values.personnelStatus,
          joinedAt: toIsoDateValue(values.joinedAt),
          ...(emptyToUndefined(values.lastEducation) ? { lastEducation: values.lastEducation?.trim() } : {}),
          ...(emptyToUndefined(values.educationInstitution)
            ? { educationInstitution: values.educationInstitution?.trim() }
            : {}),
          ...(emptyToUndefined(values.educationMajor) ? { educationMajor: values.educationMajor?.trim() } : {}),
          ...(values.graduationYear ? { graduationYear: Number(values.graduationYear) } : {}),
          ...(positionHistory?.length ? { positionHistory } : {}),
          ...(assignmentHistory?.length ? { assignmentHistory } : {}),
          ...(values.competencies?.length ? { competencies: values.competencies } : {}),
        },
        assignment: {
          organizationUnitId: selectedPosition.organizationUnit.id,
          ...(selectedPosition.branch ? { branch: selectedPosition.branch } : {}),
          positionId: selectedPosition.id,
          validFrom: toIsoFromLocalValue(values.validFrom),
        },
      });

      setSuccessState(response);
      setPendingProvisionValues(null);
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
            Secret ini hanya ditampilkan sekali setelah provisioning berhasil. Simpan atau serahkan ke operator yang
            berwenang sebelum meninggalkan halaman.
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
                Akun Better Auth, profil domain, assignment utama, scope area, dan master data personel sudah dibentuk
                secara atomik.
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
                  Sampaikan password sementara lewat kanal yang aman, lalu minta user mengganti kredensialnya melalui
                  flow reset password saat diperlukan.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset(createDefaultValues());
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
          Isi identitas akun dan master data personel, lalu pilih jabatan aktif sebagai sumber penempatan utama.
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(requestProvisionConfirmation)}
        className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]"
      >
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="size-4" />
              Form Provisioning
            </CardTitle>
            <CardDescription>
              Password awal akan dibuat otomatis oleh backend setelah data profil, personel, jabatan, dan scope lolos
              validasi.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<UserPlus className="size-4" />}
                title="Informasi Akun"
                description="Data dasar akun auth dan kontak personel."
              />
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
                    <Input
                      id="auth-email"
                      type="email"
                      {...form.register("email")}
                      placeholder="operator@denscakra.local"
                    />
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
                  <FieldLabel htmlFor="profile-phone">Nomor telepon</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-phone"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="08xxxxxxxxxx"
                      {...form.register("phone", {
                        onChange: (event) => {
                          const sanitizedValue = sanitizeNumericInput(event.target.value);
                          form.setValue("phone", sanitizedValue, {
                            shouldDirty: true,
                            shouldValidate: Boolean(form.formState.errors.phone),
                          });
                        },
                      })}
                    />
                    <FieldDescription>
                      Nomor akan dinormalisasi backend ke format Indonesia yang dipakai sistem.
                    </FieldDescription>
                    <FieldError errors={[form.formState.errors.phone]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<ShieldCheck className="size-4" />}
                title="Data Pribadi"
                description="Identitas personel untuk kebutuhan master data internal."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="profile-fullname">Nama lengkap</FieldLabel>
                  <FieldContent>
                    <Input id="profile-fullname" {...form.register("fullName")} placeholder="Nama lengkap personel" />
                    <FieldError errors={[form.formState.errors.fullName]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="profile-nik">NIK / Nomor KTP</FieldLabel>
                  <FieldContent>
                    <Input
                      id="profile-nik"
                      inputMode="numeric"
                      maxLength={16}
                      pattern="[0-9]*"
                      placeholder="16 digit NIK"
                      {...form.register("nationalIdNumber", {
                        onChange: (event) => {
                          const sanitizedValue = sanitizeNumericInput(event.target.value).slice(0, 16);
                          form.setValue("nationalIdNumber", sanitizedValue, {
                            shouldDirty: true,
                            shouldValidate: Boolean(form.formState.errors.nationalIdNumber),
                          });
                        },
                      })}
                    />
                    <FieldError errors={[form.formState.errors.nationalIdNumber]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="birth-place">Tempat lahir</FieldLabel>
                  <FieldContent>
                    <Input id="birth-place" {...form.register("birthPlace")} placeholder="Contoh: Jakarta" />
                    <FieldError errors={[form.formState.errors.birthPlace]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="birth-date">Tanggal lahir</FieldLabel>
                  <FieldContent>
                    <Input id="birth-date" type="date" {...form.register("birthDate")} />
                    <FieldError errors={[form.formState.errors.birthDate]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="calculated-age">Umur</FieldLabel>
                  <FieldContent>
                    <Input
                      id="calculated-age"
                      value={calculatedAge ? `${calculatedAge} tahun` : ""}
                      placeholder="Dihitung otomatis"
                      readOnly
                    />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Jenis kelamin</FieldLabel>
                  <FieldContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 px-4 py-3">
                        <Input type="radio" className="size-4" value="MALE" {...form.register("gender")} />
                        Laki-laki
                      </Label>
                      <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/70 px-4 py-3">
                        <Input type="radio" className="size-4" value="FEMALE" {...form.register("gender")} />
                        Perempuan
                      </Label>
                    </div>
                    <FieldError errors={[form.formState.errors.gender]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="religion">Agama</FieldLabel>
                  <FieldContent>
                    <Input id="religion" {...form.register("religion")} placeholder="Contoh: Islam" />
                    <FieldError errors={[form.formState.errors.religion]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="marital-status">Status perkawinan</FieldLabel>
                  <FieldContent>
                    <NativeSelect id="marital-status" {...form.register("maritalStatus")}>
                      <NativeSelectOption value="">Pilih status perkawinan</NativeSelectOption>
                      {MARITAL_STATUS_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[form.formState.errors.maritalStatus]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="blood-type">Golongan darah</FieldLabel>
                  <FieldContent>
                    <NativeSelect id="blood-type" {...form.register("bloodType")}>
                      <NativeSelectOption value="">Pilih golongan darah</NativeSelectOption>
                      {BLOOD_TYPE_OPTIONS.map((option) => (
                        <NativeSelectOption key={option} value={option}>
                          {option}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[form.formState.errors.bloodType]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<BriefcaseBusiness className="size-4" />}
                title="Informasi Personel"
                description="Status administrasi personel dan masa kerja otomatis."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="personnel-number">NRP / NIP</FieldLabel>
                  <FieldContent>
                    <Input id="personnel-number" {...form.register("personnelNumber")} placeholder="Opsional" />
                    <FieldError errors={[form.formState.errors.personnelNumber]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="rank-grade">Pangkat / Golongan</FieldLabel>
                  <FieldContent>
                    <Input id="rank-grade" {...form.register("rankGrade")} placeholder="Contoh: III/a" />
                    <FieldError errors={[form.formState.errors.rankGrade]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="personnel-status">Status personel</FieldLabel>
                  <FieldContent>
                    <NativeSelect id="personnel-status" {...form.register("personnelStatus")}>
                      <NativeSelectOption value="">Pilih status personel</NativeSelectOption>
                      {PERSONNEL_STATUS_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[form.formState.errors.personnelStatus]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="joined-at">Tanggal bergabung</FieldLabel>
                  <FieldContent>
                    <Input id="joined-at" type="date" {...form.register("joinedAt")} />
                    <FieldError errors={[form.formState.errors.joinedAt]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="tenure">Masa kerja</FieldLabel>
                  <FieldContent>
                    <Input
                      id="tenure"
                      value={calculatedTenure ? `${calculatedTenure} tahun` : ""}
                      placeholder="Dihitung otomatis"
                      readOnly
                    />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<GraduationCap className="size-4" />}
                title="Pendidikan"
                description="Riwayat pendidikan terakhir personel."
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="last-education">Pendidikan terakhir</FieldLabel>
                  <FieldContent>
                    <Input id="last-education" {...form.register("lastEducation")} placeholder="Contoh: S1" />
                    <FieldError errors={[form.formState.errors.lastEducation]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="education-institution">Nama institusi</FieldLabel>
                  <FieldContent>
                    <Input
                      id="education-institution"
                      {...form.register("educationInstitution")}
                      placeholder="Nama sekolah/kampus"
                    />
                    <FieldError errors={[form.formState.errors.educationInstitution]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="education-major">Jurusan</FieldLabel>
                  <FieldContent>
                    <Input id="education-major" {...form.register("educationMajor")} placeholder="Jurusan/program" />
                    <FieldError errors={[form.formState.errors.educationMajor]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="graduation-year">Tahun lulus</FieldLabel>
                  <FieldContent>
                    <Input
                      id="graduation-year"
                      inputMode="numeric"
                      maxLength={4}
                      pattern="[0-9]*"
                      placeholder="Contoh: 2020"
                      {...form.register("graduationYear", {
                        onChange: (event) => {
                          const sanitizedValue = sanitizeNumericInput(event.target.value).slice(0, 4);
                          form.setValue("graduationYear", sanitizedValue, {
                            shouldDirty: true,
                            shouldValidate: Boolean(form.formState.errors.graduationYear),
                          });
                        },
                      })}
                    />
                    <FieldError errors={[form.formState.errors.graduationYear]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<History className="size-4" />}
                title="Riwayat Jabatan"
                description="Tambahkan jabatan terdahulu jika diperlukan. Tanggal selesai hanya wajib saat status selesai."
              />
              <div className="space-y-3">
                {positionHistoryFields.fields.map((field, index) => {
                  const fieldError = form.formState.errors.positionHistory?.[index];
                  const status = form.watch(`positionHistory.${index}.status`);

                  return (
                    <div key={field.id} className="space-y-4 rounded-xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">Riwayat Jabatan #{index + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => positionHistoryFields.remove(index)}
                        >
                          <Trash2 className="size-4" />
                          Hapus
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field>
                          <FieldLabel>Nama jabatan</FieldLabel>
                          <FieldContent>
                            <Input {...form.register(`positionHistory.${index}.title`)} placeholder="Nama jabatan" />
                            <FieldError errors={[fieldError?.title]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Unit / Organisasi</FieldLabel>
                          <FieldContent>
                            <Input
                              {...form.register(`positionHistory.${index}.organizationUnit`)}
                              placeholder="Unit atau organisasi"
                            />
                            <FieldError errors={[fieldError?.organizationUnit]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Wilayah</FieldLabel>
                          <FieldContent>
                            <Input {...form.register(`positionHistory.${index}.area`)} placeholder="Wilayah tugas" />
                            <FieldError errors={[fieldError?.area]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Status</FieldLabel>
                          <FieldContent>
                            <NativeSelect {...form.register(`positionHistory.${index}.status`)}>
                              <NativeSelectOption value="ACTIVE">Aktif</NativeSelectOption>
                              <NativeSelectOption value="COMPLETED">Selesai</NativeSelectOption>
                            </NativeSelect>
                            <FieldError errors={[fieldError?.status]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Tanggal mulai</FieldLabel>
                          <FieldContent>
                            <Input type="date" {...form.register(`positionHistory.${index}.startedAt`)} />
                            <FieldError errors={[fieldError?.startedAt]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Tanggal selesai</FieldLabel>
                          <FieldContent>
                            <Input
                              type="date"
                              disabled={status === "ACTIVE"}
                              {...form.register(`positionHistory.${index}.endedAt`)}
                            />
                            <FieldDescription>
                              Tidak wajib untuk jabatan yang masih berstatus aktif.
                            </FieldDescription>
                            <FieldError errors={[fieldError?.endedAt]} />
                          </FieldContent>
                        </Field>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    positionHistoryFields.append({
                      title: "",
                      organizationUnit: "",
                      area: "",
                      startedAt: "",
                      endedAt: "",
                      status: "ACTIVE",
                    })
                  }
                >
                  <Plus className="size-4" />
                  Tambah riwayat jabatan
                </Button>
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<History className="size-4" />}
                title="Riwayat Penugasan"
                description="Catat penugasan sebelumnya tanpa mengubah assignment utama aktif."
              />
              <div className="space-y-3">
                {assignmentHistoryFields.fields.map((field, index) => {
                  const fieldError = form.formState.errors.assignmentHistory?.[index];

                  return (
                    <div key={field.id} className="space-y-4 rounded-xl border border-border/70 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">Riwayat Penugasan #{index + 1}</div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => assignmentHistoryFields.remove(index)}
                        >
                          <Trash2 className="size-4" />
                          Hapus
                        </Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field>
                          <FieldLabel>Nama penugasan</FieldLabel>
                          <FieldContent>
                            <Input {...form.register(`assignmentHistory.${index}.name`)} placeholder="Nama penugasan" />
                            <FieldError errors={[fieldError?.name]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Unit</FieldLabel>
                          <FieldContent>
                            <Input {...form.register(`assignmentHistory.${index}.unit`)} placeholder="Unit" />
                            <FieldError errors={[fieldError?.unit]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Lokasi</FieldLabel>
                          <FieldContent>
                            <Input {...form.register(`assignmentHistory.${index}.location`)} placeholder="Lokasi" />
                            <FieldError errors={[fieldError?.location]} />
                          </FieldContent>
                        </Field>
                        <Field>
                          <FieldLabel>Periode</FieldLabel>
                          <FieldContent>
                            <Input {...form.register(`assignmentHistory.${index}.period`)} placeholder="Contoh: 2022 - 2024" />
                            <FieldError errors={[fieldError?.period]} />
                          </FieldContent>
                        </Field>
                        <Field className="md:col-span-2">
                          <FieldLabel>Keterangan</FieldLabel>
                          <FieldContent>
                            <Textarea
                              {...form.register(`assignmentHistory.${index}.description`)}
                              placeholder="Keterangan singkat penugasan"
                            />
                            <FieldError errors={[fieldError?.description]} />
                          </FieldContent>
                        </Field>
                      </div>
                    </div>
                  );
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    assignmentHistoryFields.append({
                      name: "",
                      unit: "",
                      location: "",
                      period: "",
                      description: "",
                    })
                  }
                >
                  <Plus className="size-4" />
                  Tambah riwayat penugasan
                </Button>
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<ShieldCheck className="size-4" />}
                title="Kompetensi Personel"
                description="Tambahkan kompetensi sebagai tag agar mudah dipakai modul lain."
              />
              <div className="space-y-3 rounded-xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={competencyDraft}
                    onChange={(event) => setCompetencyDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addCompetency();
                      }
                    }}
                    placeholder="Contoh: Analisis wilayah"
                  />
                  <Button type="button" variant="outline" onClick={addCompetency}>
                    <Plus className="size-4" />
                    Tambah
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {competencies.length ? (
                    competencies.map((competency, index) => (
                      <Badge key={`${competency}-${index}`} variant="outline" className="gap-2">
                        {competency}
                        <button type="button" onClick={() => removeCompetency(index)} aria-label={`Hapus ${competency}`}>
                          ×
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Belum ada kompetensi yang ditambahkan.</p>
                  )}
                </div>
                <FieldError errors={[form.formState.errors.competencies]} />
              </div>
            </FieldGroup>

            <FieldGroup className="space-y-4">
              <SectionHeader
                icon={<BriefcaseBusiness className="size-4" />}
                title="Assignment Utama"
                description="Bagian existing tetap menjadi sumber jabatan aktif dan wilayah assignment."
              />
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
            <Button type="button" variant="ghost" onClick={() => setIsCancelDialogOpen(true)}>
              Batal
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
                  {selectedPosition?.seatCode || "-"} -{" "}
                  {selectedPosition?.organizationUnit?.name || "Pilih jabatan untuk melihat penempatan."}
                </div>
              </div>

              <div className="rounded-xl border border-border/70 p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Ringkasan assignment
                </div>
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
              Endpoint provisioning menggenerate password sementara di backend. Secret hanya muncul sekali setelah
              sukses dan tidak disimpan ulang pada halaman detail.
            </AlertDescription>
          </Alert>
        </div>
      </form>

      <AlertDialog open={Boolean(pendingProvisionValues)} onOpenChange={(open) => !open && setPendingProvisionValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Provision user?</AlertDialogTitle>
            <AlertDialogDescription>
              Pastikan identitas akun, master data personel, jabatan aktif, dan wilayah assignment sudah benar sebelum
              user dibuat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting || !pendingProvisionValues}
              onClick={(event) => {
                event.preventDefault();
                if (pendingProvisionValues) {
                  void executeProvision(pendingProvisionValues);
                }
              }}
            >
              {isSubmitting ? "Memproses..." : "Provision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan provisioning?</AlertDialogTitle>
            <AlertDialogDescription>
              Data yang sudah diisi pada halaman ini akan ditinggalkan dan Anda akan kembali ke daftar pengguna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tetap di halaman</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/dashboard/admin-system/pengguna")}>
              Ya, batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
