"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, ImagePlus, LoaderCircle, Network, UserRound, X } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PageHeader } from "@/components/ui/page-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createIdempotencyKey } from "@/lib/api/idempotency";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

const LIST_ROUTE = "/dashboard/daftar-jaring";

const JAKARTA_CITY_ALIAS_CODES: Record<string, string> = {
  "31.74": "Z", // Jakarta Selatan
  "31.73": "Y", // Jakarta Barat
  "31.75": "X", // Jakarta Timur
  "31.71": "W", // Jakarta Pusat
  "31.72": "V", // Jakarta Utara
  "31.01": "V", // Kepulauan Seribu
};

const registrationSchema = z
  .object({
    aliasName: z.string().trim().min(1, "Alias / Nama Sandi wajib diisi.").max(150, "Maksimal 150 karakter."),
    whatsappNumber: z
      .string()
      .min(1, "Nomor WhatsApp wajib diisi.")
      .regex(/^\d+$/, "Nomor WhatsApp hanya boleh berisi angka.")
      .max(30, "Maksimal 30 digit."),
    areaId: z.string().min(1, "Kecamatan wajib dipilih."),
    villageId: z.string().min(1, "Pilih 1 Kelurahan/Desa."),
    joinedAt: z
      .string()
      .min(1, "Tanggal Bergabung wajib diisi.")
      .refine((value) => {
        const parsed = new Date(`${value}T00:00:00`);
        return !Number.isNaN(parsed.getTime()) && parsed <= new Date();
      }, "Tanggal Bergabung harus valid dan tidak boleh di masa depan."),
    organizationName: z.string().max(180, "Maksimal 180 karakter."),
    politicalAffiliation: z.string().max(180, "Maksimal 180 karakter."),
    notes: z.string().trim().min(1, "Kebermanfaatan wajib diisi.").max(3000, "Maksimal 3.000 karakter."),
    fullName: z.string().trim().min(1, "Nama Lengkap wajib diisi.").max(180, "Maksimal 180 karakter."),
    nationalIdNumber: z
      .string()
      .trim()
      .refine((value) => value === "" || /^\d{16}$/.test(value), "NIK harus kosong atau terdiri dari tepat 16 digit angka."),
    address: z.string().trim().min(1, "Alamat wajib diisi.").max(1000, "Maksimal 1.000 karakter."),
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
type WorkspaceDistrictArea = FieldOfficerWorkspace["districtAreas"][number];
type WorkspaceJaring = FieldOfficerWorkspace["jaring"][number];

type JaringRegistrationFormProps = {
  jaringId?: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: {
    message?: string;
  };
  message?: string;
};

type PresignResponse = {
  uploadToken: string;
  storageKey: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
};

type CompleteUploadResponse = {
  id: string;
};

function envelopeData<T>(payload: ApiEnvelope<T> | T): T {
  if (payload && typeof payload === "object" && "success" in payload && "data" in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

async function sha256Hex(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function administrativeCode(area: Pick<WorkspaceDistrictArea, "code" | "officialCode">) {
  return area.officialCode?.trim() || area.code.trim();
}

function cityAliasCode(area: WorkspaceDistrictArea) {
  const cityCode = area.parentOfficialCode?.trim() || administrativeCode(area).split(".").slice(0, -1).join(".");
  return cityCode ? (JAKARTA_CITY_ALIAS_CODES[cityCode] ?? null) : null;
}

function districtAliasNumber(area: WorkspaceDistrictArea) {
  const lastSegment = administrativeCode(area).split(".").at(-1) ?? "";
  const digits = lastSegment.replace(/\D/g, "");
  return digits.padStart(2, "0");
}

function nextAliasSequence(prefix: string, jaring: WorkspaceJaring[]) {
  const maxSequence = jaring.reduce((max, item) => {
    if (!item.aliasName.startsWith(prefix)) {
      return max;
    }

    const sequence = item.aliasName.slice(prefix.length);
    if (!/^\d{3}$/.test(sequence)) {
      return max;
    }

    return Math.max(max, Number(sequence));
  }, 0);
  const nextSequence = maxSequence + 1;

  return nextSequence > 999 ? null : String(nextSequence).padStart(3, "0");
}

function generateAliasPreview(area: WorkspaceDistrictArea | null, jaring: WorkspaceJaring[]) {
  if (!area) {
    return "";
  }

  const cityCode = cityAliasCode(area);
  if (!cityCode) {
    return "";
  }

  const prefix = `${cityCode}${districtAliasNumber(area)}`;
  const sequence = nextAliasSequence(prefix, jaring);
  return sequence ? `${prefix}${sequence}` : "";
}

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function resolveAgentDistrict(workspace: FieldOfficerWorkspace) {
  const districtScopes = workspace.context.areaScopes.filter((scope) => scope.level === "DISTRICT");
  const primaryDistrictScope = districtScopes.find((scope) => scope.isPrimary);
  const scopedDistrict =
    (primaryDistrictScope
      ? workspace.districtAreas.find((area) => area.areaId === primaryDistrictScope.areaId)
      : null) ??
    (districtScopes.length === 1
      ? workspace.districtAreas.find((area) => area.areaId === districtScopes[0]?.areaId)
      : null);

  return scopedDistrict ?? (workspace.districtAreas.length === 1 ? workspace.districtAreas[0] : null);
}

function resolveJaringDistrict(workspace: FieldOfficerWorkspace, jaring: FieldOfficerJaring) {
  const villageId = jaring.areaIds[0];
  const village = workspace.villageAreas.find((area) => area.areaId === villageId);

  if (village?.parentAreaId) {
    const parent = workspace.districtAreas.find((area) => area.areaId === village.parentAreaId);
    if (parent) return parent;
  }

  const villageCode = village?.officialCode ?? village?.code ?? "";
  return (
    workspace.districtAreas.find((district) => {
      const districtCode = district.officialCode ?? district.code;
      return (
        village?.parentOfficialCode === districtCode ||
        (Boolean(districtCode) && villageCode.startsWith(`${districtCode}.`))
      );
    }) ?? null
  );
}

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

function idempotentJsonHeaders(operation: string) {
  return {
    "content-type": "application/json",
    "idempotency-key": createIdempotencyKey(`dc_jaring_${operation}`),
  };
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

export function JaringRegistrationForm({ jaringId }: JaringRegistrationFormProps = {}) {
  const router = useRouter();
  const isEditMode = Boolean(jaringId);
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(null);
  const [editingJaring, setEditingJaring] = useState<FieldOfficerJaring | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [maxBirthDate] = useState(todayInputValue);
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: {
      aliasName: "",
      whatsappNumber: "",
      areaId: "",
      villageId: "",
      joinedAt: todayInputValue(),
      organizationName: "",
      politicalAffiliation: "",
      notes: "",
      fullName: "",
      nationalIdNumber: "",
      address: "",
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
  const selectedDistrictId = form.watch("areaId");
  const selectedVillageId = form.watch("villageId");
  const agentDistrict = useMemo(() => (workspace ? resolveAgentDistrict(workspace) : null), [workspace]);
  const editingDistrict = useMemo(
    () => (workspace && editingJaring ? resolveJaringDistrict(workspace, editingJaring) : null),
    [editingJaring, workspace],
  );
  const lockedDistrict = isEditMode ? (editingDistrict ?? agentDistrict) : agentDistrict;
  const selectedDistrict = workspace?.districtAreas.find((area) => area.areaId === selectedDistrictId) ?? null;
  const generatedAliasName = useMemo(
    () => generateAliasPreview(selectedDistrict, workspace?.jaring ?? []),
    [selectedDistrict, workspace?.jaring],
  );
  const displayedPhotoUrl = photoPreviewUrl ?? editingJaring?.profilePhotoUrl ?? null;
  const villageOptions = useMemo(() => {
    if (!workspace || !selectedDistrict) return [];
    const selectedDistrictCode = selectedDistrict.officialCode ?? selectedDistrict.code;

    return workspace.villageAreas.filter((area) => {
      const areaCode = area.officialCode ?? area.code;
      if (area.parentAreaId && area.parentAreaId === selectedDistrict.areaId) return true;
      if (area.parentOfficialCode && selectedDistrictCode) {
        return area.parentOfficialCode === selectedDistrictCode;
      }
      if (areaCode && selectedDistrictCode) {
        return areaCode.startsWith(`${selectedDistrictCode}.`);
      }
      return false;
    });
  }, [selectedDistrict, workspace]);

  useEffect(() => {
    if (!selectedDistrictId) {
      form.setValue("villageId", "", { shouldDirty: true, shouldValidate: true });
      return;
    }

    const allowedVillageIds = new Set(villageOptions.map((area) => area.areaId));
    const currentVillageId = form.getValues("villageId");
    if (currentVillageId && !allowedVillageIds.has(currentVillageId)) {
      form.setValue("villageId", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [form, selectedDistrictId, villageOptions]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    form.setValue("aliasName", generatedAliasName, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [form, generatedAliasName, isEditMode]);

  useEffect(() => {
    if (!selectedPhotoFile) {
      setPhotoPreviewUrl(null);
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(selectedPhotoFile);
    setPhotoPreviewUrl(nextPreviewUrl);

    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [selectedPhotoFile]);

  useEffect(() => {
    let cancelled = false;

    async function loadRegistrationOptions() {
      try {
        const response = await fetch("/api/field-officer/workspace", { cache: "no-store" });
        const body = (await response.json()) as FieldOfficerWorkspace | { message?: string };
        if (!response.ok) throw new Error("message" in body ? body.message : "Gagal memuat data Jaring.");

        const data = body as FieldOfficerWorkspace;
        const defaultDistrict = resolveAgentDistrict(data);
        const item = jaringId ? (data.jaring.find((jaring) => jaring.id === jaringId) ?? null) : null;
        if (jaringId && !item) {
          throw new Error("Jaring tidak ditemukan atau berada di luar cakupan pembinaan Anda.");
        }

        const itemDistrict = item ? resolveJaringDistrict(data, item) : null;

        if (!cancelled) {
          setWorkspace(data);
          setEditingJaring(item);
          form.reset(
            item
              ? {
                  aliasName: item.aliasName,
                  whatsappNumber: item.whatsappNumber.replace(/\D/g, ""),
                  areaId: itemDistrict?.areaId ?? defaultDistrict?.areaId ?? "",
                  villageId: item.areaIds[0] ?? "",
                  joinedAt: dateInput(item.joinedAt),
                  organizationName: item.organizationName ?? "",
                  politicalAffiliation: item.politicalAffiliation ?? "",
                  notes: item.notes ?? "",
                  fullName: item.fullName ?? "",
                  nationalIdNumber: item.nationalIdNumber ?? "",
                  address: item.address ?? "",
                  birthPlace: item.birthPlace ?? "",
                  birthDate: dateInput(item.birthDate),
                  gender: item.gender === "MALE" || item.gender === "FEMALE" ? item.gender : undefined,
                  occupationId:
                    data.occupations.find((occupation) => occupation.name === item.occupationName)?.id ?? "",
                  workplace: item.workplace ?? "",
                  jobTitle: item.jobTitle ?? "",
                }
              : {
                  aliasName: "",
                  whatsappNumber: "",
                  areaId: defaultDistrict?.areaId ?? "",
                  villageId: "",
                  joinedAt: todayInputValue(),
                  organizationName: "",
                  politicalAffiliation: "",
                  notes: "",
                  fullName: "",
                  nationalIdNumber: "",
                  address: "",
                  birthPlace: "",
                  birthDate: "",
                  gender: undefined,
                  occupationId: "",
                  workplace: "",
                  jobTitle: "",
                },
          );
          setLoadError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Gagal memuat data Jaring.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadRegistrationOptions();
    return () => {
      cancelled = true;
    };
  }, [form, jaringId]);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setPhotoError(null);

    if (!file) {
      setSelectedPhotoFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setSelectedPhotoFile(null);
      setPhotoError("File foto harus berupa gambar.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSelectedPhotoFile(null);
      setPhotoError("Ukuran foto maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    setSelectedPhotoFile(file);
  }

  function clearPhoto() {
    setSelectedPhotoFile(null);
    setPhotoError(null);
  }

  async function uploadProfilePhoto(file: File) {
    const checksumSha256 = await sha256Hex(file);
    const presignResponse = await fetch("/api/v1/files/presign", {
      method: "POST",
      headers: idempotentJsonHeaders("photo_presign"),
      body: JSON.stringify({
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileType: "PHOTO",
        sizeBytes: file.size,
        checksumSha256,
        context: "jaring-profile-photo",
      }),
    });
    const presignPayload = (await presignResponse.json().catch(() => null)) as ApiEnvelope<PresignResponse> | null;
    if (!presignResponse.ok || !presignPayload) {
      throw new Error(presignPayload?.error?.message ?? presignPayload?.message ?? "Gagal menyiapkan upload foto.");
    }

    const presign = envelopeData(presignPayload);
    const uploadResponse = await fetch(presign.uploadUrl, {
      method: presign.method,
      headers: presign.headers,
      body: file,
    });
    if (!uploadResponse.ok) {
      throw new Error("Gagal mengunggah foto Jaring.");
    }

    const completeResponse = await fetch("/api/v1/files/complete", {
      method: "POST",
      headers: idempotentJsonHeaders("photo_complete"),
      body: JSON.stringify({
        uploadToken: presign.uploadToken,
        storageKey: presign.storageKey,
      }),
    });
    const completePayload = (await completeResponse.json().catch(() => null)) as
      | ApiEnvelope<CompleteUploadResponse>
      | null;
    if (!completeResponse.ok || !completePayload) {
      throw new Error(completePayload?.error?.message ?? completePayload?.message ?? "Gagal menyelesaikan upload foto.");
    }

    return envelopeData(completePayload).id;
  }

  async function saveJaring() {
    const valid = await form.trigger();
    const hasExistingPhoto = Boolean(editingJaring?.profilePhotoFileId);
    if (!selectedPhotoFile && !hasExistingPhoto) {
      setPhotoError("Foto Jaring wajib diunggah.");
    }
    if (!valid || !workspace || (!selectedPhotoFile && !hasExistingPhoto)) {
      setShowConfirmation(false);
      return;
    }

    const values = form.getValues();
    setIsSubmitting(true);
    try {
      const profilePhotoFileId = selectedPhotoFile ? await uploadProfilePhoto(selectedPhotoFile) : undefined;
      const payload = {
        aliasName: values.aliasName.trim(),
        whatsappNumber: values.whatsappNumber,
        fullName: values.fullName.trim(),
        nationalIdNumber: isEditMode ? values.nationalIdNumber.trim() : values.nationalIdNumber.trim() || undefined,
        address: values.address.trim(),
        birthPlace: values.birthPlace.trim(),
        birthDate: values.birthDate,
        gender: values.gender,
        occupationId: values.occupationId,
        profilePhotoFileId,
        workplace: values.workplace.trim() || undefined,
        jobTitle: values.jobTitle.trim() || undefined,
        joinedAt: values.joinedAt,
        organizationName: values.organizationName.trim() || undefined,
        politicalAffiliation: values.politicalAffiliation.trim() || undefined,
        notes: values.notes.trim(),
        areaIds: [values.villageId],
      };
      const response = await fetch(
        isEditMode && jaringId ? `/api/field-officer/jaring/${jaringId}` : "/api/field-officer/jaring",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: isEditMode ? { "content-type": "application/json" } : idempotentJsonHeaders("create"),
          body: JSON.stringify(
            isEditMode
              ? payload
              : {
                  ...payload,
                  fieldOfficerAssignmentId: workspace.context.primaryAssignmentId,
                },
          ),
        },
      );
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        throw new Error(body?.message ?? `Gagal ${isEditMode ? "memperbarui" : "menyimpan"} Jaring.`);
      }

      toast.success(
        isEditMode
          ? editingJaring?.registrationStatus === "REJECTED"
            ? "Revisi Jaring tersimpan dan kembali belum terverifikasi."
            : "Data Jaring berhasil diperbarui."
          : "Pengajuan Jaring tersimpan dan menunggu persetujuan Regional Commander.",
      );
      router.push(isEditMode && jaringId ? `${LIST_ROUTE}/${jaringId}` : LIST_ROUTE);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Gagal ${isEditMode ? "memperbarui" : "menyimpan"} Jaring.`);
      setShowConfirmation(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title={
          isEditMode
            ? `Edit Data Jaring${editingJaring ? ` ${editingJaring.aliasName}` : ""}`
            : "Registrasi Jaring Baru"
        }
        description={
          isEditMode
            ? "Perbarui identitas, data pribadi, dan informasi pekerjaan Jaring dalam cakupan pembinaan Anda."
            : "Lengkapi identitas, data pribadi, dan informasi pekerjaan Jaring dalam cakupan pembinaan Anda."
        }
        backButton={{
          href: isEditMode && jaringId ? `${LIST_ROUTE}/${jaringId}` : LIST_ROUTE,
          label: isEditMode ? "Kembali ke detail Jaring" : "Kembali ke daftar Jaring",
        }}
      />

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Data Jaring tidak tersedia</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <form
        className="mx-auto flex max-w-6xl flex-col gap-5"
        onSubmit={form.handleSubmit(() => setShowConfirmation(true))}
        noValidate
      >
        <Card className="order-2">
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
                    <Input
                      id="alias-name"
                      className="font-mono uppercase tracking-wide"
                      placeholder={isEditMode ? "Alias / Nama Sandi Jaring" : "Kecamatan menentukan alias otomatis"}
                      readOnly
                      aria-readonly="true"
                      {...form.register("aliasName")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {isEditMode
                        ? "Alias / Nama Sandi tetap mengikuti identitas Jaring yang sudah terdaftar."
                        : "Otomatis dari kode kota + nomor kecamatan + urutan input, contoh Z01001. " +
                          "Sistem menghitung ulang saat disimpan."}
                    </p>
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
                <Field data-invalid={Boolean(form.formState.errors.occupationId)}>
                  <RequiredLabel htmlFor="occupation-id">Pekerjaan</RequiredLabel>
                  <FieldContent>
                    <NativeSelect
                      id="occupation-id"
                      className="w-full"
                      disabled={isLoading || !workspace?.occupations.length}
                      {...form.register("occupationId")}
                    >
                      <NativeSelectOption value="">
                        {isLoading ? "Memuat pekerjaan..." : "Pilih Pekerjaan"}
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
                <Field data-invalid={Boolean(form.formState.errors.areaId)}>
                  <RequiredLabel htmlFor="area-id">Kecamatan</RequiredLabel>
                  <FieldContent>
                    <NativeSelect
                      id="area-id"
                      className="w-full"
                      disabled={isLoading || !workspace?.districtAreas.length || Boolean(lockedDistrict)}
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
                    {lockedDistrict ? (
                      <p className="text-xs text-muted-foreground">
                        Kecamatan otomatis dari wilayah assignment agent: {lockedDistrict.name}.
                      </p>
                    ) : null}
                    <FieldError errors={[form.formState.errors.areaId]} />
                  </FieldContent>
                </Field>
                <Field className="md:col-span-2" data-invalid={Boolean(form.formState.errors.villageId)}>
                  <RequiredLabel>Kelurahan/Desa Cakupan</RequiredLabel>
                  <FieldContent>
                    <div className="rounded-md border bg-background">
                      <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                        {selectedDistrictId
                          ? villageOptions.length > 0
                            ? selectedVillageId
                              ? "1 kelurahan/desa dipilih"
                              : `Pilih 1 dari ${villageOptions.length} kelurahan/desa`
                            : "Kelurahan/Desa belum tersedia untuk kecamatan ini"
                          : "Pilih Kecamatan dulu untuk menampilkan kelurahan/desa"}
                      </div>
                      <RadioGroup
                        className="grid max-h-48 gap-1 overflow-y-auto p-2 sm:grid-cols-2"
                        value={selectedVillageId}
                        onValueChange={(areaId) => {
                          form.setValue("villageId", areaId, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                      >
                        {villageOptions.map((area) => {
                          const inputId = `village-${area.areaId}`;

                          return (
                            <label
                              key={area.areaId}
                              htmlFor={inputId}
                              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                            >
                              <RadioGroupItem id={inputId} value={area.areaId} disabled={!selectedDistrictId || isSubmitting} />
                              <span>{area.name}</span>
                            </label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                    <FieldError errors={[form.formState.errors.villageId]} />
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
                  <RequiredLabel htmlFor="notes">Kebermanfaatan</RequiredLabel>
                  <FieldContent>
                    <Textarea
                      id="notes"
                      rows={4}
                      placeholder="Jelaskan kebermanfaatan Jaring untuk pembinaan atau kebutuhan lapangan..."
                      {...form.register("notes")}
                    />
                    <FieldError errors={[form.formState.errors.notes]} />
                  </FieldContent>
                </Field>
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card className="order-1">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-primary" /> Data Pribadi
            </CardTitle>
            <CardDescription>Identitas personal yang diperlukan untuk registrasi Jaring.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field className="md:col-span-2" data-invalid={Boolean(photoError)}>
                  <RequiredLabel htmlFor="profile-photo">Foto Jaring</RequiredLabel>
                  <FieldContent>
                    <div className="flex flex-col gap-3 rounded-md border border-dashed p-3 sm:flex-row sm:items-center">
                      <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                        {displayedPhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={displayedPhotoUrl} alt="Preview foto Jaring" className="size-full object-cover" />
                        ) : (
                          <ImagePlus className="size-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          id="profile-photo"
                          type="file"
                          accept="image/*"
                          disabled={isSubmitting}
                          onChange={handlePhotoChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          {isEditMode && editingJaring?.profilePhotoFileId
                            ? "Foto saat ini tetap digunakan. Pilih JPG/PNG/WebP maksimal 5 MB untuk menggantinya."
                            : "Gunakan foto JPG/PNG/WebP, maksimal 5 MB. Foto akan diunggah saat Jaring disimpan."}
                        </p>
                        {selectedPhotoFile ? (
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{selectedPhotoFile.name}</span>
                            <Button type="button" variant="ghost" size="sm" onClick={clearPhoto}>
                              <X className="size-3.5" />
                              Hapus foto
                            </Button>
                          </div>
                        ) : null}
                        {photoError ? <p className="text-xs text-destructive">{photoError}</p> : null}
                      </div>
                    </div>
                  </FieldContent>
                </Field>
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
                  <FieldLabel htmlFor="national-id-number">NIK / Nomor KTP (Opsional)</FieldLabel>
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
                <Field className="md:col-span-2" data-invalid={Boolean(form.formState.errors.address)}>
                  <RequiredLabel htmlFor="address">Alamat</RequiredLabel>
                  <FieldContent>
                    <Textarea
                      id="address"
                      rows={3}
                      maxLength={1000}
                      autoComplete="street-address"
                      placeholder="Alamat lengkap tempat tinggal Jaring"
                      {...form.register("address")}
                    />
                    <FieldError errors={[form.formState.errors.address]} />
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
                <div className="md:col-span-2 border-t pt-4">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <BriefcaseBusiness className="size-4 text-primary" /> Informasi Pekerjaan
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pilih pekerjaan dari master data dan lengkapi detail kerja bila tersedia.
                  </p>
                </div>
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
        </Card>

        <div className="order-3 flex justify-end">
          <Button
            type="submit"
            variant="success"
            size="lg"
            className="w-full font-semibold uppercase tracking-wide sm:w-auto sm:min-w-52"
            disabled={isLoading || Boolean(loadError) || isSubmitting}
          >
            {isLoading ? <LoaderCircle className="animate-spin" /> : null}
            {isEditMode ? "Simpan Perubahan" : "Ajukan Jaring"}
          </Button>
        </div>
      </form>

      <AlertDialog
        open={showConfirmation}
        onOpenChange={(open) => {
          if (!isSubmitting) setShowConfirmation(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isEditMode ? "Simpan perubahan data Jaring?" : "Pastikan data Jaring sudah sesuai?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Periksa kembali data pribadi, pekerjaan, cakupan wilayah, dan kebermanfaatan. Jika semuanya sudah benar,
              klik Simpan untuk {isEditMode ? "memperbarui" : "menyimpan"} Jaring.
            </AlertDialogDescription>
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
