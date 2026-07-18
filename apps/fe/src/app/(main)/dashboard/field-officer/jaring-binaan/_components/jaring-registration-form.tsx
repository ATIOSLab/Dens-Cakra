"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, LoaderCircle, Network, UserRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageHeader } from "@/components/ui/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { FieldOfficerWorkspace } from "@/server/field-ops/types";

const LIST_ROUTE = "/dashboard/field-officer/jaring-binaan";

const registrationSchema = z
  .object({
    aliasName: z.string().trim().min(1, "Alias / Nama Sandi wajib diisi.").max(150, "Maksimal 150 karakter."),
    whatsappNumber: z
      .string()
      .min(1, "Nomor WhatsApp wajib diisi.")
      .regex(/^\d+$/, "Nomor WhatsApp hanya boleh berisi angka.")
      .max(30, "Maksimal 30 digit."),
    clusterId: z.string().min(1, "Cluster Jaring wajib dipilih."),
    areaId: z.string().min(1, "Kecamatan wajib dipilih."),
    joinedAt: z
      .string()
      .min(1, "Tanggal Bergabung wajib diisi.")
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00`);
        return !Number.isNaN(parsed.getTime()) && parsed <= new Date();
      }, "Tanggal Bergabung harus valid dan tidak boleh di masa depan."),
    organizationName: z.string().max(180, "Maksimal 180 karakter."),
    politicalAffiliation: z.string().max(180, "Maksimal 180 karakter."),
    notes: z.string().max(3000, "Maksimal 3.000 karakter."),
    fullName: z.string().trim().min(1, "Nama Lengkap wajib diisi.").max(180, "Maksimal 180 karakter."),
    nationalIdNumber: z.string().regex(/^\d{16}$/, "NIK harus terdiri dari tepat 16 digit angka."),
    birthPlace: z.string().trim().min(1, "Tempat Lahir wajib diisi.").max(120, "Maksimal 120 karakter."),
    birthDate: z
      .string()
      .min(1, "Tanggal Lahir wajib diisi.")
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00`);
        return !Number.isNaN(parsed.getTime()) && parsed <= new Date();
      }, "Tanggal Lahir harus valid dan tidak boleh di masa depan."),
    gender: z.enum(["MALE", "FEMALE"], { error: "Jenis Kelamin wajib dipilih." }),
    occupationId: z.string().min(1, "Pekerjaan wajib dipilih."),
    workplace: z.string().max(180, "Maksimal 180 karakter."),
    jobTitle: z.string().max(150, "Maksimal 150 karakter."),
  })
  .superRefine((values, context) => {
    if (values.birthDate && values.joinedAt) {
      const birthDate = new Date(`${values.birthDate}T00:00:00`);
      const joinedAt = new Date(`${values.joinedAt}T00:00:00`);
      if (!Number.isNaN(birthDate.getTime()) && !Number.isNaN(joinedAt.getTime()) && joinedAt < birthDate) {
        context.addIssue({
          code: "custom",
          path: ["joinedAt"],
          message: "Tanggal Bergabung tidak boleh sebelum Tanggal Lahir.",
        });
      }
    }
  });

type RegistrationFormValues = z.infer<typeof registrationSchema>;

function calculateAge(birthDate: string) {
  if (!birthDate) return "";

  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime()) || date > new Date()) return "";

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDifference = today.getMonth() - date.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) age -= 1;
  return String(age);
}

function todayInputValue() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function occupationSelectPlaceholder(isLoading: boolean, occupationCount: number) {
  if (isLoading) return "Memuat pekerjaan...";
  if (occupationCount > 0) return "Pilih Pekerjaan";
  return "Belum ada master pekerjaan aktif";
}

function RequiredLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <FieldLabel htmlFor={htmlFor}>
      {children}
      <span aria-hidden="true" className="text-destructive">
        *
      </span>
    </FieldLabel>
  );
}

export function JaringRegistrationForm() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [maxBirthDate] = useState(todayInputValue);
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: {
      aliasName: "",
      whatsappNumber: "",
      clusterId: "",
      areaId: "",
      joinedAt: todayInputValue(),
      organizationName: "",
      politicalAffiliation: "",
      notes: "",
      fullName: "",
      nationalIdNumber: "",
      birthPlace: "",
      birthDate: "",
      occupationId: "",
      workplace: "",
      jobTitle: "",
    },
  });
  const whatsappField = form.register("whatsappNumber");
  const nikField = form.register("nationalIdNumber");
  const birthDate = form.watch("birthDate");
  const gender = form.watch("gender");

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationOptions() {
      try {
        const response = await fetch("/api/field-officer/workspace", { cache: "no-store" });
        const body = (await response.json()) as FieldOfficerWorkspace | { message?: string };
        if (!response.ok) throw new Error("message" in body ? body.message : "Gagal memuat data registrasi Jaring.");

        if (!cancelled) {
          setWorkspace(body as FieldOfficerWorkspace);
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Gagal memuat data registrasi Jaring.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadRegistrationOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveJaring() {
    const valid = await form.trigger();
    if (!valid || !workspace) {
      setShowConfirmation(false);
      return;
    }

    const values = form.getValues();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/field-officer/jaring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          aliasName: values.aliasName.trim(),
          whatsappNumber: values.whatsappNumber,
          clusterId: values.clusterId,
          fullName: values.fullName.trim(),
          nationalIdNumber: values.nationalIdNumber,
          birthPlace: values.birthPlace.trim(),
          birthDate: values.birthDate,
          gender: values.gender,
          occupationId: values.occupationId,
          workplace: values.workplace.trim() || undefined,
          jobTitle: values.jobTitle.trim() || undefined,
          joinedAt: values.joinedAt,
          organizationName: values.organizationName.trim() || undefined,
          politicalAffiliation: values.politicalAffiliation.trim() || undefined,
          notes: values.notes.trim() || undefined,
          areaIds: [values.areaId],
          fieldOfficerAssignmentId: workspace.context.primaryAssignmentId,
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Gagal menyimpan Jaring.");

      toast.success("Jaring berhasil ditambahkan.");
      router.push(LIST_ROUTE);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan Jaring.");
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Registrasi Jaring Baru"
        description="Lengkapi identitas, data pribadi, dan informasi pekerjaan Jaring dalam cakupan pembinaan Anda."
        backButton={{ href: LIST_ROUTE, label: "Kembali ke daftar Jaring" }}
      />

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Data registrasi tidak tersedia</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="mx-auto max-w-6xl space-y-5"
        onSubmit={form.handleSubmit(() => setShowConfirmation(true))}
        noValidate
      >
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Network className="size-4 text-primary" /> Informasi Jaring
            </CardTitle>
            <CardDescription>Data operasional untuk identifikasi dan cakupan pembinaan Jaring.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.aliasName)}>
                  <RequiredLabel htmlFor="alias-name">Alias / Nama Sandi</RequiredLabel>
                  <FieldContent>
                    <Input id="alias-name" placeholder="Contoh: Merpati" {...form.register("aliasName")} />
                    <FieldError errors={[form.formState.errors.aliasName]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.whatsappNumber)}>
                  <RequiredLabel htmlFor="whatsapp-number">Nomor WhatsApp</RequiredLabel>
                  <FieldContent>
                    <Input
                      id="whatsapp-number"
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={30}
                      placeholder="Contoh: 628123456789"
                      {...whatsappField}
                      onChange={(event) => {
                        event.target.value = event.target.value.replace(/\D/g, "");
                        void whatsappField.onChange(event);
                      }}
                    />
                    <FieldError errors={[form.formState.errors.whatsappNumber]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.clusterId)}>
                  <RequiredLabel htmlFor="cluster-id">Cluster Jaring</RequiredLabel>
                  <FieldContent>
                    <NativeSelect
                      id="cluster-id"
                      className="w-full"
                      disabled={isLoading || !workspace?.jaringClusters.length}
                      {...form.register("clusterId")}
                    >
                      <NativeSelectOption value="">
                        {isLoading ? "Memuat cluster..." : "Pilih Cluster Jaring"}
                      </NativeSelectOption>
                      {workspace?.jaringClusters.map((cluster) => (
                        <NativeSelectOption key={cluster.id} value={cluster.id}>
                          {cluster.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[form.formState.errors.clusterId]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.areaId)}>
                  <RequiredLabel htmlFor="area-id">Kecamatan</RequiredLabel>
                  <FieldContent>
                    <NativeSelect
                      id="area-id"
                      className="w-full"
                      disabled={isLoading || !workspace?.districtAreas.length}
                      {...form.register("areaId")}
                    >
                      <NativeSelectOption value="">
                        {isLoading ? "Memuat kecamatan..." : "Pilih Kecamatan"}
                      </NativeSelectOption>
                      {workspace?.districtAreas.map((area) => (
                        <NativeSelectOption key={area.areaId} value={area.areaId}>
                          {area.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[form.formState.errors.areaId]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.joinedAt)}>
                  <RequiredLabel htmlFor="joined-at">Tanggal Bergabung</RequiredLabel>
                  <FieldContent>
                    <Input id="joined-at" type="date" max={maxBirthDate} {...form.register("joinedAt")} />
                    <FieldError errors={[form.formState.errors.joinedAt]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.organizationName)}>
                  <FieldLabel htmlFor="organization-name">Organisasi (Opsional)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="organization-name"
                      placeholder="Nama organisasi yang diikuti"
                      {...form.register("organizationName")}
                    />
                    <FieldError errors={[form.formState.errors.organizationName]} />
                  </FieldContent>
                </Field>
                <Field className="md:col-span-2" data-invalid={Boolean(form.formState.errors.politicalAffiliation)}>
                  <FieldLabel htmlFor="political-affiliation">Afiliasi Politik (Opsional)</FieldLabel>
                  <FieldContent>
                    <Input
                      id="political-affiliation"
                      placeholder="Isi jika ada atau diketahui"
                      {...form.register("politicalAffiliation")}
                    />
                    <FieldError errors={[form.formState.errors.politicalAffiliation]} />
                  </FieldContent>
                </Field>
                <Field className="md:col-span-2" data-invalid={Boolean(form.formState.errors.notes)}>
                  <FieldLabel htmlFor="notes">Catatan Pembinaan (Opsional)</FieldLabel>
                  <FieldContent>
                    <Textarea
                      id="notes"
                      rows={4}
                      placeholder="Tambahkan catatan pembinaan bila diperlukan..."
                      {...form.register("notes")}
                    />
                    <FieldError errors={[form.formState.errors.notes]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-primary" /> Data Pribadi
            </CardTitle>
            <CardDescription>Identitas personal yang diperlukan untuk registrasi Jaring.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.fullName)}>
                  <RequiredLabel htmlFor="full-name">Nama Lengkap</RequiredLabel>
                  <FieldContent>
                    <Input
                      id="full-name"
                      autoComplete="name"
                      placeholder="Nama lengkap sesuai identitas"
                      {...form.register("fullName")}
                    />
                    <FieldError errors={[form.formState.errors.fullName]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.nationalIdNumber)}>
                  <RequiredLabel htmlFor="national-id-number">NIK / Nomor KTP</RequiredLabel>
                  <FieldContent>
                    <Input
                      id="national-id-number"
                      inputMode="numeric"
                      maxLength={16}
                      placeholder="16 digit NIK"
                      {...nikField}
                      onChange={(event) => {
                        event.target.value = event.target.value.replace(/\D/g, "").slice(0, 16);
                        void nikField.onChange(event);
                      }}
                    />
                    <FieldError errors={[form.formState.errors.nationalIdNumber]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.birthPlace)}>
                  <RequiredLabel htmlFor="birth-place">Tempat Lahir</RequiredLabel>
                  <FieldContent>
                    <Input id="birth-place" placeholder="Contoh: Jakarta" {...form.register("birthPlace")} />
                    <FieldError errors={[form.formState.errors.birthPlace]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.birthDate)}>
                  <RequiredLabel htmlFor="birth-date">Tanggal Lahir</RequiredLabel>
                  <FieldContent>
                    <Input id="birth-date" type="date" max={maxBirthDate} {...form.register("birthDate")} />
                    <FieldError errors={[form.formState.errors.birthDate]} />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel htmlFor="age">Umur</FieldLabel>
                  <FieldContent>
                    <Input
                      id="age"
                      value={calculateAge(birthDate)}
                      placeholder="Dihitung otomatis"
                      readOnly
                      aria-readonly="true"
                    />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.gender)}>
                  <RequiredLabel>Jenis Kelamin</RequiredLabel>
                  <FieldContent>
                    <RadioGroup
                      className="grid gap-3 sm:grid-cols-2"
                      value={gender ?? ""}
                      onValueChange={(value) =>
                        form.setValue("gender", value as RegistrationFormValues["gender"], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    >
                      <FieldLabel className="w-full cursor-pointer flex-row items-center rounded-md border p-3">
                        <RadioGroupItem value="MALE" /> Laki-laki
                      </FieldLabel>
                      <FieldLabel className="w-full cursor-pointer flex-row items-center rounded-md border p-3">
                        <RadioGroupItem value="FEMALE" /> Perempuan
                      </FieldLabel>
                    </RadioGroup>
                    <FieldError errors={[form.formState.errors.gender]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <BriefcaseBusiness className="size-4 text-primary" /> Informasi Pekerjaan
            </CardTitle>
            <CardDescription>Pilih pekerjaan dari master data dan lengkapi detail kerja bila tersedia.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field data-invalid={Boolean(form.formState.errors.occupationId)} className="md:col-span-2">
                  <RequiredLabel htmlFor="occupation-id">Pekerjaan</RequiredLabel>
                  <FieldContent>
                    <NativeSelect
                      id="occupation-id"
                      className="w-full"
                      disabled={isLoading || !workspace?.occupations.length}
                      {...form.register("occupationId")}
                    >
                      <NativeSelectOption value="">
                        {occupationSelectPlaceholder(isLoading, workspace?.occupations.length ?? 0)}
                      </NativeSelectOption>
                      {workspace?.occupations.map((occupation) => (
                        <NativeSelectOption key={occupation.id} value={occupation.id}>
                          {occupation.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    <FieldError errors={[form.formState.errors.occupationId]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.workplace)}>
                  <FieldLabel htmlFor="workplace">Instansi / Tempat Kerja</FieldLabel>
                  <FieldContent>
                    <Input
                      id="workplace"
                      placeholder="Nama instansi atau tempat kerja"
                      {...form.register("workplace")}
                    />
                    <FieldError errors={[form.formState.errors.workplace]} />
                  </FieldContent>
                </Field>
                <Field data-invalid={Boolean(form.formState.errors.jobTitle)}>
                  <FieldLabel htmlFor="job-title">Jabatan</FieldLabel>
                  <FieldContent>
                    <Input id="job-title" placeholder="Jabatan saat ini" {...form.register("jobTitle")} />
                    <FieldError errors={[form.formState.errors.jobTitle]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              type="submit"
              variant="success"
              size="lg"
              className="w-full font-semibold uppercase tracking-wide sm:w-auto sm:min-w-52"
              disabled={isLoading || Boolean(loadError) || isSubmitting}
            >
              {isLoading ? <LoaderCircle className="animate-spin" /> : null}
              Simpan Jaring
            </Button>
          </CardFooter>
        </Card>
      </form>

      <AlertDialog
        open={showConfirmation}
        onOpenChange={(open) => {
          if (!isSubmitting) setShowConfirmation(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Simpan Jaring?</AlertDialogTitle>
            <AlertDialogDescription>Pastikan seluruh data sudah benar sebelum disimpan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="success"
              disabled={isSubmitting}
              onClick={(event) => {
                event.preventDefault();
                void saveJaring();
              }}
            >
              {isSubmitting ? <LoaderCircle className="animate-spin" /> : null}
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
