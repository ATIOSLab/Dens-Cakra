"use client";

import { useCallback, useEffect, useState } from "react";

import { AlertCircle, CheckCircle2, FileText, Loader2, RefreshCw, Sliders, Sparkles } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type SystemConfiguration = {
  coachingReportEnabled: boolean;
};

type PendingChange = {
  key: "coachingReportEnabled";
  targetValue: boolean;
  title: string;
  description: string;
} | null;

export function KonfigurasiSistemClient() {
  const [config, setConfig] = useState<SystemConfiguration>({
    coachingReportEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("-");

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiBrowserFetch<SystemConfiguration>("/system/configuration");
      setConfig(data);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuat konfigurasi sistem.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfiguration();
  }, [loadConfiguration]);

  const handleToggleCoachingReport = (nextChecked: boolean) => {
    setPendingChange({
      key: "coachingReportEnabled",
      targetValue: nextChecked,
      title: nextChecked ? "Aktifkan Pembuatan Laporan Pembinaan?" : "Nonaktifkan Pembuatan Laporan Pembinaan?",
      description: nextChecked
        ? "Apakah Anda yakin ingin mengaktifkan kembali pembuatan laporan pembinaan Jaring? Petugas Wilayah (Gaswil) akan dapat kembali membuat dan mengirim laporan baru."
        : "Apakah Anda yakin ingin menonaktifkan pembuatan laporan pembinaan Jaring? Petugas Wilayah (Gaswil) tidak akan dapat mengirimkan laporan pembinaan baru hingga fitur ini diaktifkan kembali.",
    });
  };

  const applyPendingChange = async () => {
    if (!pendingChange) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await apiBrowserMutation<SystemConfiguration>(
        "PUT",
        "/system/configuration",
        {
          [pendingChange.key]: pendingChange.targetValue,
        },
        { idempotent: true },
      );
      setConfig(updated);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      toast.success(
        pendingChange.targetValue
          ? "Pembuatan laporan pembinaan Jaring berhasil diaktifkan."
          : "Pembuatan laporan pembinaan Jaring berhasil dinonaktifkan.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui konfigurasi sistem.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
      setPendingChange(null);
    }
  };

  const confirmActionLabel = pendingChange?.targetValue ? "Ya, Aktifkan" : "Ya, Nonaktifkan";

  return (
    <div className="dc-page @container/main space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono tracking-wider text-[10px] uppercase">
              {DOMAIN_TERMS.adminSystemRole}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Kontrol Fitur Sistem
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Konfigurasi Sistem</h1>
          <p className="text-sm text-muted-foreground">
            Kelola parameter operasional, kontrol aktivasi fitur pelaporan, dan kebijakan sistem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadConfiguration()}
            disabled={loading || saving}
            className="h-9 gap-2 text-xs"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Muat Ulang
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Terjadi Kesalahan</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metric Cards */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Peran Pengelola</CardDescription>
            <CardTitle className="truncate text-lg [font-family:var(--dc-font-metadata)]">
              {DOMAIN_TERMS.adminSystemRole}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Status Pembuatan Pembinaan</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {config.coachingReportEnabled ? (
                <Badge className="gap-1 border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  Aktif
                </Badge>
              ) : (
                <Badge className="gap-1 border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300">
                  <AlertCircle className="size-3" />
                  Dinonaktifkan
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Sinkronisasi Terakhir</CardDescription>
            <CardTitle className="truncate text-lg font-mono">{lastUpdated}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {/* Main Configurations Section */}
      <div className="space-y-4">
        <div className="border-b pb-2">
          <p className={DC_TYPOGRAPHY.tableHeader}>Modul Operasional</p>
          <h2 className="mt-1 font-heading font-semibold text-lg tracking-normal">
            Fitur & Pembatasan Pelaporan Jaring
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pengaturan ini langsung berdampak secara realtime pada akun Petugas Wilayah (Gaswil) di lapangan.
          </p>
        </div>

        <Card className="border-border/80 shadow-xs">
          <CardHeader className="border-b bg-muted/20 p-5 pb-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Sliders className="size-5" />
              </span>
              <div>
                <CardTitle className="text-base font-semibold">Izin Pembuatan Laporan Pembinaan Jaring</CardTitle>
                <CardDescription className="text-xs">
                  Kontrol akses Gaswil dalam mencatat dan mengirim hasil pembinaan Jaring.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4 transition-colors">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-sm text-foreground">
                    Pembuatan Laporan Pembinaan Jaring (Gaswil)
                  </span>
                  {config.coachingReportEnabled ? (
                    <Badge className="border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px]">
                      Aktif
                    </Badge>
                  ) : (
                    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px]">
                      Dinonaktifkan
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bila dinonaktifkan, Petugas Wilayah (Gaswil) tidak dapat membuka formulir maupun mengirim laporan
                  pembinaan baru. Tombol pembuatan laporan di antarmuka Gaswil akan terkunci otomatis, dan setiap upaya
                  pembuatan via API akan ditolak oleh sistem. Riwayat pembinaan yang telah dibuat sebelumnya tetap dapat
                  diakses untuk peninjauan.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                <Switch
                  id="coaching-toggle"
                  checked={config.coachingReportEnabled}
                  onCheckedChange={handleToggleCoachingReport}
                  disabled={loading || saving}
                />
              </div>
            </div>

            {/* Impact Details Box */}
            <div className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-4 dark:border-white/10 dark:bg-white/[0.02]">
              <h4 className="flex items-center gap-2 font-semibold text-xs text-foreground">
                <FileText className="size-3.5 text-primary" />
                Catatan Pengoperasian:
              </h4>
              <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-muted-foreground leading-relaxed">
                <li>
                  <strong>Waktu Pelaporan Otomatis:</strong> Sesuai pembaruan sistem terbaru, waktu pengiriman laporan
                  pembinaan tercatat otomatis mengikuti waktu server (tidak perlu diinput manual).
                </li>
                <li>
                  <strong>Keamanan API:</strong> Penonaktifan diproteksi langsung di lapisan server/API (penolakan
                  dengan kode 403), sehingga pengiriman data dari klien yang belum di-refresh akan tetap terblokir
                  dengan aman.
                </li>
                <li>
                  <strong>Audit Log:</strong> Setiap pengubahan pengaturan oleh Admin Sistem tercatat otomatis di log
                  audit sistem dengan identitas pengguna dan waktu perubahan.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={Boolean(pendingChange)} onOpenChange={(open) => !open && setPendingChange(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-amber-500" />
              {pendingChange?.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              {pendingChange?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void applyPendingChange();
              }}
              disabled={saving}
              className={
                pendingChange?.targetValue === false ? "bg-amber-600 hover:bg-amber-700 text-white" : undefined
              }
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                confirmActionLabel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
