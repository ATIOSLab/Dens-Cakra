"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  FileText,
  Loader2,
  Plus,
  ScrollText,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { apiBrowserMutation } from "@/lib/api/browser-client";
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

export function BuatLaporanPembinaanClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialJaringId = searchParams.get("jaringId") || "";

  const [jarings, setJarings] = useState<FieldOfficerJaring[]>([]);
  const [jaringId, setJaringId] = useState<string>(initialJaringId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reportedAt, setReportedAt] = useState(getCurrentDateTimeLocal());
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadWorkspace() {
      setLoadingWorkspace(true);
      try {
        const res = await fetch("/api/field-officer/workspace");
        if (res.ok) {
          const data: FieldOfficerWorkspace = await res.json();
          if (Array.isArray(data?.jaring)) {
            const verifiedOnly = data.jaring.filter(
              (j) => j.registrationStatus === "APPROVED",
            );
            setJarings(verifiedOnly);
            if (initialJaringId) {
              const match = verifiedOnly.find((j) => j.id === initialJaringId);
              if (match) {
                setJaringId(match.id);
              } else if (verifiedOnly.length > 0) {
                setJaringId(verifiedOnly[0].id);
              }
            } else if (verifiedOnly.length > 0) {
              setJaringId(verifiedOnly[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat list Jaring:", err);
      } finally {
        setLoadingWorkspace(false);
      }
    }

    void loadWorkspace();
  }, [initialJaringId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!jaringId) {
      setErrorMessage("Silakan pilih Jaring terlebih dahulu.");
      return;
    }

    const selectedJaring = jarings.find((j) => j.id === jaringId);
    if (!selectedJaring || selectedJaring.registrationStatus !== "APPROVED") {
      setErrorMessage("Laporan pembinaan hanya dapat dibuat untuk Jaring yang sudah terverifikasi (disetujui).");
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
      setErrorMessage("Tanggal dan waktu pembinaan wajib diisi.");
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
      router.push("/dashboard/field-officer/laporan-pembinaan");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat laporan pembinaan.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/field-officer/laporan-pembinaan">
            <Button variant="outline" size="icon" className="h-9 w-9 mt-0.5 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Plus className="h-6 w-6 text-primary" />
              Buat Laporan Pembinaan Jaring
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Isi formulir di bawah ini untuk mencatat hasil pembinaan, pengarahan, atau evaluasi Jaring di lapangan.
            </p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <Card className="shadow-sm border border-border/80">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            Formulir Laporan Pembinaan
          </CardTitle>
          <CardDescription className="text-xs">
            Pastikan seluruh data yang dimasukkan sudah benar dan akurat sebelum menyimpan.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Jaring Selection with Popover, Search, and Infinite Scroll */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                Pilih Daftar Jaring <span className="text-destructive">*</span>
              </Label>
              <JaringSelectPopover
                options={jarings}
                value={jaringId}
                onValueChange={setJaringId}
                placeholder="Pilih Daftar Jaring Terverifikasi..."
                filterVerifiedOnly={true}
                disabled={submitting || loadingWorkspace}
                className="h-10 text-sm"
              />
            </div>

            {/* Title & ReportedAt Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                  className="text-sm h-10"
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
                  className="text-sm h-10"
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
                className="text-sm leading-relaxed"
              />
              <div className="text-[10px] text-muted-foreground text-right">{content.length}/10.000</div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/field-officer/laporan-pembinaan")}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting || loadingWorkspace || jarings.length === 0}>
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
        </CardContent>
      </Card>
    </div>
  );
}
