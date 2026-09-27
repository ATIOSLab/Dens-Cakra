"use client";

import { useCallback, useEffect, useState } from "react";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Edit3,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Sliders,
  Sparkles,
} from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type SystemConfiguration = {
  coachingReportEnabled: boolean;
  coachingReportActivePeriod: number;
};

export function KonfigurasiSistemClient() {
  const [config, setConfig] = useState<SystemConfiguration>({
    coachingReportEnabled: true,
    coachingReportActivePeriod: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("-");

  // Disable confirmation dialog
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  // Activation & Period selection dialog
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activationPeriodMode, setActivationPeriodMode] = useState<"CONTINUE" | "INCREMENT" | "CUSTOM">("CONTINUE");
  const [customActivationPeriod, setCustomActivationPeriod] = useState<number>(1);

  // Standalone Edit Period dialog
  const [editPeriodDialogOpen, setEditPeriodDialogOpen] = useState(false);
  const [standalonePeriodInput, setStandalonePeriodInput] = useState<number>(1);

  const loadConfiguration = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiBrowserFetch<SystemConfiguration>("/system/configuration");
      setConfig(data);
      setCustomActivationPeriod((data.coachingReportActivePeriod || 1) + 1);
      setStandalonePeriodInput(data.coachingReportActivePeriod || 1);
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

  // Handle toggle switch click
  const handleToggleCoachingReport = (nextChecked: boolean) => {
    if (!nextChecked) {
      // User is disabling
      setDisableDialogOpen(true);
    } else {
      // User is enabling: open period chooser modal so admin can pick the period
      setActivationPeriodMode("CONTINUE");
      setCustomActivationPeriod((config.coachingReportActivePeriod || 1) + 1);
      setActivateDialogOpen(true);
    }
  };

  // Execute disabling
  const handleConfirmDisable = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiBrowserMutation<SystemConfiguration>(
        "PUT",
        "/system/configuration",
        { coachingReportEnabled: false },
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
      setDisableDialogOpen(false);
      toast.success("Pembuatan laporan pembinaan Jaring berhasil dinonaktifkan.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui konfigurasi sistem.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Execute enabling with chosen period
  const handleConfirmActivate = async () => {
    let chosenPeriod = config.coachingReportActivePeriod || 1;
    if (activationPeriodMode === "INCREMENT") {
      chosenPeriod = (config.coachingReportActivePeriod || 1) + 1;
    } else if (activationPeriodMode === "CUSTOM") {
      chosenPeriod = Math.max(1, Number(customActivationPeriod) || 1);
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await apiBrowserMutation<SystemConfiguration>(
        "PUT",
        "/system/configuration",
        {
          coachingReportEnabled: true,
          coachingReportActivePeriod: chosenPeriod,
        },
        { idempotent: true },
      );
      setConfig(updated);
      setStandalonePeriodInput(updated.coachingReportActivePeriod || 1);
      setLastUpdated(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
      setActivateDialogOpen(false);
      toast.success(`Pembuatan laporan pembinaan Jaring diaktifkan pada Periode ${chosenPeriod}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan konfigurasi sistem.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Execute saving standalone period change
  const handleSaveStandalonePeriod = async () => {
    const validPeriod = Math.max(1, Number(standalonePeriodInput) || 1);
    setSaving(true);
    setError(null);
    try {
      const updated = await apiBrowserMutation<SystemConfiguration>(
        "PUT",
        "/system/configuration",
        { coachingReportActivePeriod: validPeriod },
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
      setEditPeriodDialogOpen(false);
      toast.success(`Nomor periode aktif pembinaan berhasil diubah menjadi Periode ${validPeriod}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah nomor periode.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const currentPeriod = config.coachingReportActivePeriod || 1;
  const nextPeriodNumber = currentPeriod + 1;

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
            Kelola parameter operasional, kontrol aktivasi fitur pelaporan, dan kebijakan periode pembinaan Jaring.
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
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Periode Pembinaan Aktif</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Badge className="gap-1 border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300 font-mono">
                <Layers className="size-3" />
                Periode {currentPeriod}
              </Badge>
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
                  Kontrol akses Gaswil dalam mencatat dan mengirim hasil pembinaan Jaring beserta manajemen periode
                  operasional.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border/70 bg-card p-4 transition-colors">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2.5 flex-wrap">
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
                  <Badge
                    variant="outline"
                    className="border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300 text-[10px] font-mono"
                  >
                    Periode Berjalan: Periode {currentPeriod}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Bila dinonaktifkan, Petugas Wilayah (Gaswil) tidak dapat membuka formulir maupun mengirim laporan
                  pembinaan baru. Tombol pembuatan laporan di antarmuka Gaswil akan terkunci otomatis, dan setiap upaya
                  pembuatan via API akan ditolak oleh sistem. Saat diaktifkan kembali, Anda dapat memilih apakah
                  melanjutkan periode saat ini, memulai periode baru, atau menentukan nomor periode kustom.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStandalonePeriodInput(currentPeriod);
                    setEditPeriodDialogOpen(true);
                  }}
                  disabled={loading || saving}
                  className="h-8 gap-1.5 text-xs border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                >
                  <Edit3 className="size-3.5" />
                  Ubah Nomor Periode
                </Button>

                <div className="flex items-center gap-2 border-l pl-3 dark:border-white/10">
                  {saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                  <Switch
                    id="coaching-toggle"
                    checked={config.coachingReportEnabled}
                    onCheckedChange={handleToggleCoachingReport}
                    disabled={loading || saving}
                  />
                </div>
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
                  <strong>Periode Pembinaan Operasional:</strong> Setiap laporan pembinaan baru yang dibuat oleh Gaswil
                  akan otomatis terikat pada <strong>Periode {currentPeriod}</strong>. Pengelompokan ini mempermudah
                  evaluasi dan filtering pada riwayat pembinaan di tingkat Koordinator dan Pimpinan.
                </li>
                <li>
                  <strong>Pengaktifan Fleksibel:</strong> Saat mengaktifkan kembali pelaporan dari status nonaktif, Anda
                  dapat memilih untuk melanjutkan periode lama, meningkatkan ke periode baru berikutnya (misal Periode{" "}
                  {nextPeriodNumber}), atau menetapkan nomor periode tertentu sesuai kebutuhan satuan tugas.
                </li>
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
                  <strong>Audit Log:</strong> Setiap pengubahan status fitur dan nomor periode oleh Admin Sistem
                  tercatat otomatis di log audit sistem dengan identitas pengguna dan waktu perubahan.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. Disable Confirmation Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-5" />
              Nonaktifkan Pembuatan Laporan Pembinaan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              Apakah Anda yakin ingin menonaktifkan pembuatan laporan pembinaan Jaring? Petugas Wilayah (Gaswil) tidak
              akan dapat mengirimkan laporan pembinaan baru hingga fitur ini diaktifkan kembali. Riwayat laporan
              sebelumnya tetap aman dan dapat diakses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDisable();
              }}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Ya, Nonaktifkan"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 2. Activation Dialog with Period Selection */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="size-5 text-emerald-500" />
              Aktifkan Pembuatan Laporan Pembinaan
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Tentukan status periode pembinaan saat mengaktifkan kembali pelaporan. Laporan baru yang dibuat oleh
              Gaswil akan diasosiasikan dengan periode yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <RadioGroup
              value={activationPeriodMode}
              onValueChange={(val) => setActivationPeriodMode(val as "CONTINUE" | "INCREMENT" | "CUSTOM")}
              className="space-y-3"
            >
              {/* Option 1: Continue Current Period */}
              <div
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  activationPeriodMode === "CONTINUE"
                    ? "border-emerald-500/50 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-950/20"
                    : "border-border hover:bg-muted/30",
                )}
                onClick={() => setActivationPeriodMode("CONTINUE")}
              >
                <RadioGroupItem value="CONTINUE" id="opt-continue" className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="opt-continue"
                    className="cursor-pointer font-semibold text-xs text-foreground flex items-center gap-2"
                  >
                    Lanjutkan Periode Saat Ini
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                    >
                      Periode {currentPeriod}
                    </Badge>
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Melanjutkan pembinaan di periode yang sedang berjalan tanpa menaikkan nomor periode.
                  </p>
                </div>
              </div>

              {/* Option 2: Start Next New Period */}
              <div
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  activationPeriodMode === "INCREMENT"
                    ? "border-sky-500/50 bg-sky-50/50 dark:border-sky-500/30 dark:bg-sky-950/20"
                    : "border-border hover:bg-muted/30",
                )}
                onClick={() => setActivationPeriodMode("INCREMENT")}
              >
                <RadioGroupItem value="INCREMENT" id="opt-increment" className="mt-1" />
                <div className="space-y-1 flex-1">
                  <Label
                    htmlFor="opt-increment"
                    className="cursor-pointer font-semibold text-xs text-foreground flex items-center gap-2"
                  >
                    Mulai Periode Baru Berikutnya
                    <Badge className="text-[10px] font-mono bg-sky-600 hover:bg-sky-600 text-white">
                      Periode {nextPeriodNumber}
                    </Badge>
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Memulai tahapan baru (otomatis bertambah +1 dari periode terakhir).
                  </p>
                </div>
              </div>

              {/* Option 3: Custom Period */}
              <div
                className={cn(
                  "flex items-start space-x-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  activationPeriodMode === "CUSTOM"
                    ? "border-amber-500/50 bg-amber-50/50 dark:border-amber-500/30 dark:bg-amber-950/20"
                    : "border-border hover:bg-muted/30",
                )}
                onClick={() => setActivationPeriodMode("CUSTOM")}
              >
                <RadioGroupItem value="CUSTOM" id="opt-custom" className="mt-1" />
                <div className="space-y-1.5 flex-1">
                  <Label
                    htmlFor="opt-custom"
                    className="cursor-pointer font-semibold text-xs text-foreground flex items-center gap-2"
                  >
                    Tentukan Nomor Periode Tertentu
                  </Label>
                  <p className="text-[11px] text-muted-foreground leading-normal">
                    Pilih secara manual jika ingin menetapkan nomor periode khusus atau melanjutkan periode tertentu.
                  </p>
                  {activationPeriodMode === "CUSTOM" && (
                    <div className="pt-2 flex items-center gap-2">
                      <Label htmlFor="custom-period-input" className="text-xs text-muted-foreground shrink-0">
                        Nomor Periode:
                      </Label>
                      <Input
                        id="custom-period-input"
                        type="number"
                        min={1}
                        value={customActivationPeriod}
                        onChange={(e) => setCustomActivationPeriod(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="h-8 w-24 text-center font-mono font-bold text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActivateDialogOpen(false)}
              disabled={saving}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleConfirmActivate()}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Mengaktifkan...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  Aktifkan Fitur
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. Standalone Edit Period Dialog */}
      <Dialog open={editPeriodDialogOpen} onOpenChange={setEditPeriodDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Layers className="size-5 text-sky-500" />
              Ubah Nomor Periode Pembinaan
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Atur nomor periode pembinaan aktif yang sedang berjalan. Laporan baru yang dibuat oleh Gaswil akan
              tercatat pada nomor periode ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="standalone-period-input" className="text-xs font-semibold">
                Nomor Periode Aktif
              </Label>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-muted-foreground">Periode</span>
                <Input
                  id="standalone-period-input"
                  type="number"
                  min={1}
                  value={standalonePeriodInput}
                  onChange={(e) => setStandalonePeriodInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-9 w-28 text-center font-mono font-bold text-sm"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Periode saat ini: <strong>Periode {currentPeriod}</strong>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditPeriodDialogOpen(false)}
              disabled={saving}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleSaveStandalonePeriod()}
              disabled={saving}
              className="bg-sky-600 hover:bg-sky-700 text-white text-xs gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Periode"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
