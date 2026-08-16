"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AlertCircle, Calendar, FileText, ImagePlus, Loader2, Plus, ScrollText, X } from "lucide-react";
import { toast } from "sonner";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { BackButton } from "@/components/ui/back-button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

import { coachingReportSchema } from "./coaching-report-schema";

function getCurrentDateTimeLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const MAX_PHOTOS = 5;
const MAX_ORIGINAL_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_COMPRESSED_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_MAX_DIMENSION = 1600;
const PHOTO_JPEG_QUALITY = 0.8;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PhotoDraft = {
  key: string;
  previewUrl: string;
  originalName: string;
  blob: Blob;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat foto."));
    img.src = src;
  });
}

async function compressPhoto(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(imageUrl);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Tidak dapat memproses foto.");
    context.drawImage(img, 0, 0, width, height);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Gagal mengompres foto."))),
        "image/jpeg",
        PHOTO_JPEG_QUALITY,
      );
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

async function sha256Hex(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function uploadPhoto(blob: Blob, originalName: string): Promise<string> {
  const checksumSha256 = await sha256Hex(blob);
  const presignResponse = await fetch("/api/v1/files/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      originalName,
      mimeType: "image/jpeg",
      fileType: "PHOTO",
      sizeBytes: blob.size,
      checksumSha256,
      context: "coaching-report-photo",
    }),
  });
  if (!presignResponse.ok) throw new Error("Gagal menyiapkan unggahan foto.");
  const presignPayload = (await presignResponse.json().catch(() => null)) as {
    data?: {
      uploadToken: string;
      storageKey: string;
      uploadUrl: string;
      method: string;
      headers: Record<string, string>;
    };
  } | null;
  const presign = presignPayload?.data;
  if (!presign) throw new Error("Gagal menyiapkan unggahan foto.");

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: presign.method,
    headers: presign.headers,
    body: blob,
  });
  if (!uploadResponse.ok) throw new Error("Gagal mengunggah foto.");

  const completeResponse = await fetch("/api/v1/files/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ uploadToken: presign.uploadToken, storageKey: presign.storageKey }),
  });
  if (!completeResponse.ok) throw new Error("Gagal menyelesaikan unggahan foto.");
  const completePayload = (await completeResponse.json().catch(() => null)) as { data?: { id: string } } | null;
  const fileId = completePayload?.data?.id;
  if (!fileId) throw new Error("Gagal menyelesaikan unggahan foto.");
  return fileId;
}

export function CreateCoachingReportForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultJaringIdParam = searchParams.get("jaringId") || "";

  const [jarings, setJarings] = useState<FieldOfficerJaring[]>([]);
  const [gaswilName, setGaswilName] = useState<string | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);

  const [jaringId, setJaringId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reportedAt, setReportedAt] = useState(getCurrentDateTimeLocal());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PhotoDraft[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadWorkspace() {
      setLoadingWorkspace(true);
      try {
        const res = await fetch("/api/field-officer/workspace");
        if (res.ok) {
          const data: FieldOfficerWorkspace = await res.json();
          const rawJarings = Array.isArray(data?.jaring) ? data.jaring : [];
          const approved = rawJarings.filter((j) => j.registrationStatus === "APPROVED");
          setJarings(approved);
          setGaswilName(data.profile.name);

          if (defaultJaringIdParam && approved.some((j) => j.id === defaultJaringIdParam)) {
            setJaringId(defaultJaringIdParam);
          } else if (approved.length > 0) {
            setJaringId(approved[0].id);
          }
        }
      } catch (err) {
        console.error("Gagal memuat data ruang kerja Petugas Wilayah (Gaswil):", err);
      } finally {
        setLoadingWorkspace(false);
      }
    }

    void loadWorkspace();
  }, [defaultJaringIdParam]);

  const selectedJaring = jarings.find((jaring) => jaring.id === jaringId);

  function handlePhotoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhotoError(null);

    const all = Array.from(files);
    const remainingSlots = Math.max(0, MAX_PHOTOS - photos.length);
    const selected = all.slice(0, remainingSlots);

    if (all.length > remainingSlots) {
      setPhotoError(`Maksimal ${MAX_PHOTOS} foto dapat dilampirkan.`);
    }

    void (async () => {
      for (const file of selected) {
        if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
          setPhotoError("Hanya file gambar (JPG, PNG, atau WebP) yang diperbolehkan.");
          continue;
        }
        if (file.size > MAX_ORIGINAL_PHOTO_BYTES) {
          setPhotoError("Ukuran foto terlalu besar (maksimal 10 MB per foto).");
          continue;
        }
        try {
          const blob = await compressPhoto(file);
          if (blob.size > MAX_COMPRESSED_PHOTO_BYTES) {
            setPhotoError("Ukuran foto setelah kompresi masih melebihi 5 MB.");
            continue;
          }
          setPhotos((current) =>
            current.length >= MAX_PHOTOS
              ? current
              : [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    previewUrl: URL.createObjectURL(blob),
                    originalName: file.name,
                    blob,
                  },
                ],
          );
        } catch (err) {
          setPhotoError(err instanceof Error ? err.message : "Gagal memproses foto.");
        }
      }
    })();

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(key: string) {
    setPhotos((current) => {
      const target = current.find((photo) => photo.key === key);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((photo) => photo.key !== key);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = coachingReportSchema.safeParse({
      jaringId,
      title,
      content,
      reportedAt,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Data formulir tidak valid.");
      return;
    }

    const isoDate = new Date(parsed.data.reportedAt).toISOString();

    setSubmitting(true);
    try {
      const attachmentFileIds: string[] = [];
      for (const photo of photos) {
        attachmentFileIds.push(await uploadPhoto(photo.blob, photo.originalName));
      }

      await apiBrowserMutation("POST", `/jaring/${parsed.data.jaringId}/coaching-reports`, {
        title: parsed.data.title,
        content: parsed.data.content,
        reportedAt: isoDate,
        ...(attachmentFileIds.length > 0 ? { attachmentFileIds } : {}),
      });

      toast.success("Laporan pembinaan Jaring berhasil dibuat.");
      router.push("/dashboard/laporan-pembinaan-jaring");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat laporan pembinaan.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dc-page !max-w-4xl">
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Beranda</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/laporan-pembinaan-jaring">Riwayat Pembinaan Jaring</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Buat Laporan Pembinaan</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Back Button */}
      <div className="flex items-center justify-between gap-3">
        <BackButton href="/dashboard/laporan-pembinaan-jaring" label="Kembali ke Riwayat" />
      </div>

      {/* Header Bar */}
      <div className="border-b pb-4">
        <h1 className="flex items-center gap-2.5 font-bold text-2xl text-foreground tracking-tight">
          <ScrollText className="h-6 w-6 text-primary" />
          Buat Laporan Pembinaan Jaring
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Isi formulir di bawah ini untuk mencatat hasil pembinaan, pengarahan, atau evaluasi Jaring di lapangan.
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="border-b bg-muted/20 p-6 pb-4">
          <CardTitle className="flex items-center gap-2 font-semibold text-lg">
            <Plus className="h-5 w-5 text-primary" />
            Formulir Laporan Pembinaan
          </CardTitle>
          <CardDescription>
            Laporan ini tersimpan sebagai rekaman pembinaan Jaring dan dapat ditinjau oleh Koordinator Wilayah (Korwil).
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          {loadingWorkspace ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="font-medium text-sm">Memuat data Jaring operasional...</p>
            </div>
          ) : jarings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center">
              <DOMAIN_VISUALS.jaring.Icon className="mb-3 size-10 text-muted-foreground/50" />
              <p className="font-semibold text-foreground text-sm">Belum Ada Jaring Tersedia</p>
              <p className="mt-1 max-w-md text-muted-foreground text-xs">
                Laporan pembinaan hanya dapat dibuat untuk Jaring dengan registrasi disetujui dalam wilayah penugasan
                Anda.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-destructive text-xs">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Select Jaring */}
              <div className="space-y-2">
                <Label htmlFor="jaring-select" className="flex items-center gap-1.5 font-semibold text-xs">
                  <DOMAIN_VISUALS.jaring.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  Pilih Jaring <span className="text-destructive">*</span>
                </Label>
                <NativeSelect
                  id="jaring-select"
                  value={jaringId}
                  onChange={(e) => setJaringId(e.target.value)}
                  disabled={submitting}
                  className="h-9 w-full bg-background text-sm"
                >
                  {jarings.map((j) => {
                    const label = [
                      j.fullName || "Nama belum tersedia",
                      j.whatsappNumber || "WhatsApp belum tersedia",
                      j.aliasName || j.id,
                    ].join(" - ");
                    return (
                      <option key={j.id} value={j.id}>
                        {label}
                      </option>
                    );
                  })}
                </NativeSelect>
                {selectedJaring ? (
                  <JaringIdentitySummary
                    compact
                    className="rounded-lg border bg-muted/20 p-3"
                    source={{
                      id: selectedJaring.id,
                      fullName: selectedJaring.fullName,
                      aliasName: selectedJaring.aliasName,
                      whatsappNumber: selectedJaring.whatsappNumber,
                      profilePhotoUrl: selectedJaring.profilePhotoUrl,
                      profilePhotoFileId: selectedJaring.profilePhotoFileId,
                      gaswilName,
                      gaswilHref: "/dashboard/profil",
                      villageName: selectedJaring.areaNames.join(", "),
                    }}
                  />
                ) : null}
              </div>

              {/* Title & Date */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title-input" className="flex items-center gap-1.5 font-semibold text-xs">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    Judul Laporan Pembinaan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title-input"
                    placeholder="Contoh: Pengarahan Pengumpulan Informasi Pilkada..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={300}
                    disabled={submitting}
                    className="h-9 bg-background text-sm"
                  />
                  <div className="text-right text-[10px] text-muted-foreground">{title.length}/300</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedAt-input" className="flex items-center gap-1.5 font-semibold text-xs">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Waktu Pembinaan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reportedAt-input"
                    type="datetime-local"
                    value={reportedAt}
                    onChange={(e) => setReportedAt(e.target.value)}
                    disabled={submitting}
                    className="h-9 bg-background text-sm"
                  />
                </div>
              </div>

              {/* Content Textarea */}
              <div className="space-y-2">
                <Label htmlFor="content-input" className="flex items-center gap-1.5 font-semibold text-xs">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Isi Laporan Pembinaan <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="content-input"
                  rows={8}
                  placeholder="Tuliskan secara rinci hasil tatap muka, bimbingan, kendala lapangan, instruksi yang diberikan, serta respon dari Jaring..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={10000}
                  disabled={submitting}
                  className="bg-background text-sm leading-relaxed"
                />
                <div className="text-right text-[10px] text-muted-foreground">{content.length}/10.000</div>
              </div>

              {/* Photo Attachments */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 font-semibold text-xs">
                  <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                  Lampiran Foto (Maksimal {MAX_PHOTOS})
                </Label>
                <input
                  ref={fileInputRef}
                  id="photo-input"
                  type="file"
                  accept={ALLOWED_PHOTO_TYPES.join(",")}
                  multiple
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                  disabled={submitting || photos.length >= MAX_PHOTOS}
                  className="hidden"
                />
                <label
                  htmlFor="photo-input"
                  className={cn(
                    "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-muted-foreground text-xs hover:bg-muted/40",
                    (submitting || photos.length >= MAX_PHOTOS) && "pointer-events-none opacity-50",
                  )}
                >
                  <ImagePlus className="h-4 w-4" />
                  {photos.length > 0 ? `Tambah Foto (${photos.length}/${MAX_PHOTOS})` : "Pilih Foto"}
                </label>
                {photoError ? <p className="text-destructive text-xs">{photoError}</p> : null}
                {photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {photos.map((photo) => (
                      <div key={photo.key} className="relative overflow-hidden rounded-lg border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.previewUrl}
                          alt={photo.originalName}
                          className="aspect-square w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(photo.key)}
                          className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                          aria-label="Hapus foto"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="text-[10px] text-muted-foreground">
                  Maksimal {MAX_PHOTOS} foto, format JPG/PNG/WebP, maksimal 5 MB per foto (foto dikompresi otomatis).
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t pt-4">
                <Button asChild variant="outline" size="sm" className="h-9 px-4 text-xs">
                  <Link
                    href="/dashboard/laporan-pembinaan-jaring"
                    aria-disabled={submitting}
                    className={submitting ? "pointer-events-none opacity-50" : undefined}
                  >
                    Batal
                  </Link>
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || jarings.length === 0}
                  size="sm"
                  className="h-9 px-5 text-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Laporan"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
