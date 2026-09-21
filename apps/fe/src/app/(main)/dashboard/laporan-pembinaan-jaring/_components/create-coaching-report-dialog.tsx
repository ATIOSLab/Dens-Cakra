"use client";

import { useEffect, useState } from "react";

import { AlertCircle, Clock, FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";

import { coachingReportSchema } from "./coaching-report-schema";

interface JaringOption {
  id: string;
  aliasName: string;
  whatsappNumber?: string | null;
  fullName?: string | null;
  profilePhotoFileId?: string | null;
  profilePhotoUrl?: string | null;
  gaswilName?: string | null;
  areaNames?: string[];
}

interface CreateCoachingReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jarings: JaringOption[];
  defaultJaringId?: string;
  onSuccess: () => void;
}

export function CreateCoachingReportDialog({
  open,
  onOpenChange,
  jarings,
  defaultJaringId,
  onSuccess,
}: CreateCoachingReportDialogProps) {
  const [jaringId, setJaringId] = useState<string>(defaultJaringId ?? "");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isCreationEnabled, setIsCreationEnabled] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedJaring = jarings.find((jaring) => jaring.id === jaringId);

  useEffect(() => {
    if (open) {
      setJaringId(defaultJaringId ?? (jarings.length > 0 ? jarings[0].id : ""));
      setTitle("");
      setContent("");
      setErrorMessage(null);
      void apiBrowserFetch<{ enabled: boolean }>("/jaring/coaching-reports/config")
        .then((res) => setIsCreationEnabled(res.enabled))
        .catch(() => setIsCreationEnabled(true));
    }
  }, [open, defaultJaringId, jarings]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (isCreationEnabled === false) {
      setErrorMessage("Pembuatan laporan pembinaan Jaring sedang dinonaktifkan oleh Admin Sistem.");
      return;
    }

    const parsed = coachingReportSchema.safeParse({
      jaringId,
      title,
      content,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Data formulir tidak valid.");
      return;
    }

    setSubmitting(true);
    try {
      await apiBrowserMutation("POST", `/jaring/${parsed.data.jaringId}/coaching-reports`, {
        title: parsed.data.title,
        content: parsed.data.content,
      });

      toast.success("Laporan pembinaan Jaring berhasil dibuat.");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat laporan pembinaan.";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Plus className="h-5 w-5 text-primary" />
            Buat Laporan Pembinaan Jaring
          </DialogTitle>
          <DialogDescription>
            Isi formulir di bawah ini untuk mencatat hasil pembinaan, pengarahan, atau evaluasi Jaring di lapangan.
          </DialogDescription>
        </DialogHeader>

        {jarings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center">
            <DOMAIN_VISUALS.jaring.Icon className="mb-3 size-9 text-muted-foreground/50" />
            <p className="font-semibold text-foreground text-sm">Belum Ada Jaring Tersedia</p>
            <p className="mt-1 max-w-md text-muted-foreground text-xs">
              Laporan pembinaan hanya dapat dibuat untuk Jaring dengan registrasi disetujui dalam wilayah penugasan.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {isCreationEnabled === false && (
              <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="font-semibold">Fitur Pembuatan Laporan Dinonaktifkan</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Admin Sistem telah menonaktifkan pembuatan laporan pembinaan Jaring baru.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="jaring-select" className="text-xs font-semibold flex items-center gap-1.5">
                <DOMAIN_VISUALS.jaring.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                Pilih Jaring <span className="text-destructive">*</span>
              </Label>
              <NativeSelect
                id="jaring-select"
                value={jaringId}
                onChange={(e) => setJaringId(e.target.value)}
                disabled={submitting || isCreationEnabled === false}
                className="w-full text-sm"
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
                    ...selectedJaring,
                    villageName: selectedJaring.areaNames?.join(", "),
                  }}
                />
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
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
                  disabled={submitting || isCreationEnabled === false}
                  className="text-sm"
                />
                <div className="text-[10px] text-muted-foreground text-right">{title.length}/300</div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Waktu Pengiriman Laporan
                </Label>
                <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-xs text-muted-foreground select-none">
                  Otomatis dicatat sistem saat dikirim
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="content-input" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Isi Laporan Pembinaan <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content-input"
                rows={6}
                placeholder="Tuliskan secara rinci hasil tatap muka, bimbingan, kendala lapangan, instruksi yang diberikan, serta respon dari Jaring..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={10000}
                disabled={submitting || isCreationEnabled === false}
                className="text-sm leading-relaxed"
              />
              <div className="text-[10px] text-muted-foreground text-right">{content.length}/10.000</div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                size="sm"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting || jarings.length === 0 || isCreationEnabled === false}
                size="sm"
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
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
