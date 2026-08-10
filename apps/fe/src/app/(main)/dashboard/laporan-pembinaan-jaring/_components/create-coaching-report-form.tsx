"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { AlertCircle, Calendar, FileText, Loader2, Plus, ScrollText } from "lucide-react";
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
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

function getCurrentDateTimeLocal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!jaringId) {
      setErrorMessage("Silakan pilih Jaring terlebih dahulu.");
      return;
    }
    if (!title.trim()) {
      setErrorMessage("Judul laporan pembinaan wajib diisi.");
      return;
    }
    if (title.trim().length > 300) {
      setErrorMessage("Judul laporan maksimal 300 karakter.");
      return;
    }
    if (!content.trim()) {
      setErrorMessage("Isi laporan pembinaan wajib diisi.");
      return;
    }
    if (content.trim().length > 10000) {
      setErrorMessage("Isi laporan maksimal 10.000 karakter.");
      return;
    }
    if (!reportedAt) {
      setErrorMessage("Tanggal dan waktu pelaporan wajib diisi.");
      return;
    }

    const isoDate = new Date(reportedAt).toISOString();

    setSubmitting(true);
    try {
      await apiBrowserMutation("POST", `/jaring/${jaringId}/coaching-reports`, {
        title: title.trim(),
        content: content.trim(),
        reportedAt: isoDate,
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <ScrollText className="h-6 w-6 text-primary" />
          Buat Laporan Pembinaan Jaring
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Isi formulir di bawah ini untuk mencatat hasil pembinaan, pengarahan, atau evaluasi Jaring di lapangan.
        </p>
      </div>

      {/* Main Form Card */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="p-6 pb-4 border-b bg-muted/20">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
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
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm font-medium">Memuat data Jaring operasional...</p>
            </div>
          ) : jarings.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-12 text-center">
              <DOMAIN_VISUALS.jaring.Icon className="mb-3 size-10 text-muted-foreground/50" />
              <p className="font-semibold text-foreground text-sm">Belum Ada Jaring Tersedia</p>
              <p className="mt-1 max-w-md text-muted-foreground text-xs">
                Laporan pembinaan hanya dapat dibuat untuk Jaring dengan registrasi disetujui dalam wilayah penugasan Anda.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Select Jaring */}
              <div className="space-y-2">
                <Label htmlFor="jaring-select" className="text-xs font-semibold flex items-center gap-1.5">
                  <DOMAIN_VISUALS.jaring.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  Pilih Jaring <span className="text-destructive">*</span>
                </Label>
                <NativeSelect
                  id="jaring-select"
                  value={jaringId}
                  onChange={(e) => setJaringId(e.target.value)}
                  disabled={submitting}
                  className="w-full text-sm h-10 bg-background"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="title-input" className="text-xs font-semibold flex items-center gap-1.5">
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
                    className="text-sm h-10 bg-background"
                  />
                  <div className="text-[10px] text-muted-foreground text-right">{title.length}/300</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reportedAt-input" className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Waktu Pembinaan <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reportedAt-input"
                    type="datetime-local"
                    value={reportedAt}
                    onChange={(e) => setReportedAt(e.target.value)}
                    disabled={submitting}
                    className="text-sm h-10 bg-background"
                  />
                </div>
              </div>

              {/* Content Textarea */}
              <div className="space-y-2">
                <Label htmlFor="content-input" className="text-xs font-semibold flex items-center gap-1.5">
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
                  className="text-sm leading-relaxed bg-background"
                />
                <div className="text-[10px] text-muted-foreground text-right">{content.length}/10.000</div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t">
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
