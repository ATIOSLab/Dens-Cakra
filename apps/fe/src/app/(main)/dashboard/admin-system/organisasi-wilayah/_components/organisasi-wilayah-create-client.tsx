"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { AlertTriangle, ArrowLeft, Building2, Landmark, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import type { RegionalMasterOverview } from "./organisasi-wilayah-types";

type OrganisasiWilayahCreateClientProps = {
  overview: RegionalMasterOverview;
  masterType: "binda" | "directorate";
  selectedProvinceAreaId?: string;
};

type BindaFormState = {
  code: string;
  name: string;
  provinceAreaId: string;
  parentUnitId: string;
};

type DirectorateFormState = {
  code: string;
  name: string;
  parentUnitId: string;
  provinceAreaIds: string[];
  primaryProvinceAreaId: string;
};

function buildDefaultBindaForm(
  overview: RegionalMasterOverview,
  selectedProvinceAreaId?: string,
): BindaFormState {
  const preferredProvince =
    (selectedProvinceAreaId
      ? overview.provinces.find((item) => item.province.id === selectedProvinceAreaId)
      : null) ??
    overview.provinces.find((item) => !item.binda) ??
    overview.provinces[0];

  return {
    code: "",
    name: "",
    provinceAreaId: preferredProvince?.province.id ?? "",
    parentUnitId: overview.deputyOptions[0]?.id ?? "",
  };
}

function buildDefaultDirectorateForm(
  overview: RegionalMasterOverview,
  selectedProvinceAreaId?: string,
): DirectorateFormState {
  const preferredProvinceId = selectedProvinceAreaId ?? overview.provinces[0]?.province.id ?? "";

  return {
    code: "",
    name: "",
    parentUnitId: overview.deputyOptions[0]?.id ?? "",
    provinceAreaIds: preferredProvinceId ? [preferredProvinceId] : [],
    primaryProvinceAreaId: preferredProvinceId,
  };
}

export function OrganisasiWilayahCreateClient({
  overview,
  masterType,
  selectedProvinceAreaId,
}: OrganisasiWilayahCreateClientProps) {
  const router = useRouter();
  const deputyOptions = overview.deputyOptions;
  const [isSaving, setIsSaving] = useState(false);
  const [bindaForm, setBindaForm] = useState<BindaFormState>(() =>
    buildDefaultBindaForm(overview, selectedProvinceAreaId),
  );
  const [directorateForm, setDirectorateForm] = useState<DirectorateFormState>(() =>
    buildDefaultDirectorateForm(overview, selectedProvinceAreaId),
  );

  const selectedProvince = useMemo(() => {
    const provinceId =
      masterType === "binda" ? bindaForm.provinceAreaId : directorateForm.primaryProvinceAreaId;

    return overview.provinces.find((item) => item.province.id === provinceId) ?? null;
  }, [bindaForm.provinceAreaId, directorateForm.primaryProvinceAreaId, masterType, overview.provinces]);

  async function handleCreateBinda() {
    if (!bindaForm.code.trim() || !bindaForm.name.trim() || !bindaForm.provinceAreaId || !bindaForm.parentUnitId) {
      toast.error("Lengkapi kode, nama, provinsi, dan deputi induk untuk Binda.");
      return;
    }

    setIsSaving(true);

    try {
      await apiBrowserMutation("POST", "/organization-units/regional-masters/binda", {
        code: bindaForm.code.trim(),
        name: bindaForm.name.trim(),
        provinceAreaId: bindaForm.provinceAreaId,
        parentUnitId: bindaForm.parentUnitId,
      });

      toast.success("Binda berhasil didaftarkan.");
      router.push("/dashboard/admin-system/organisasi-wilayah");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat Binda.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateDirectorate() {
    if (!directorateForm.code.trim() || !directorateForm.name.trim() || !directorateForm.parentUnitId) {
      toast.error("Lengkapi kode, nama, dan deputi induk untuk Direktorat wilayah.");
      return;
    }

    if (!directorateForm.provinceAreaIds.length || !directorateForm.primaryProvinceAreaId) {
      toast.error("Pilih minimal satu provinsi cakupan dan satu provinsi utama.");
      return;
    }

    setIsSaving(true);

    try {
      await apiBrowserMutation("POST", "/organization-units/regional-masters/directorates", {
        code: directorateForm.code.trim(),
        name: directorateForm.name.trim(),
        parentUnitId: directorateForm.parentUnitId,
        provinceAreaIds: directorateForm.provinceAreaIds,
        primaryProvinceAreaId: directorateForm.primaryProvinceAreaId,
      });

      toast.success("Direktorat wilayah berhasil didaftarkan.");
      router.push("/dashboard/admin-system/organisasi-wilayah");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat Direktorat wilayah.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const isBinda = masterType === "binda";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Master Wilayah</Badge>
            <Badge variant="outline">{isBinda ? "Registrasi Binda" : "Registrasi Direktorat"}</Badge>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {isBinda ? "Tambah Binda per Provinsi" : "Tambah Direktorat Wilayah"}
          </h1>
          <p className="max-w-3xl text-muted-foreground text-sm">
            {isBinda
              ? "Daftarkan satu unit Binda aktif untuk satu provinsi. Coverage wilayah primer akan dibentuk otomatis dari provinsi yang dipilih."
              : "Daftarkan Direktorat wilayah yang dapat mencakup beberapa provinsi sekaligus, lalu tandai satu provinsi utama sebagai anchor coverage."}
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/dashboard/admin-system/organisasi-wilayah">
            <ArrowLeft className="size-4" />
            Kembali ke daftar
          </Link>
        </Button>
      </div>

      {!deputyOptions.length ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Deputi induk belum tersedia</AlertTitle>
          <AlertDescription>
            Sistem belum menemukan unit `DEPUTI` aktif sebagai parent. Tambahkan atau aktifkan deputi terlebih dahulu
            sebelum membuat master wilayah baru.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isBinda ? <ShieldCheck className="size-4" /> : <Building2 className="size-4" />}
              {isBinda ? "Form Binda" : "Form Direktorat Wilayah"}
            </CardTitle>
            <CardDescription>
              {isBinda
                ? "Isi identitas unit, pilih provinsi target, lalu tentukan deputi induk yang akan menaungi Binda tersebut."
                : "Isi identitas Direktorat, tentukan deputi induk, lalu pilih provinsi cakupan beserta provinsi utamanya."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {isBinda ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="binda-code">Kode Unit</Label>
                  <Input
                    id="binda-code"
                    value={bindaForm.code}
                    onChange={(event) =>
                      setBindaForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="ORG-BINDA-JABAR"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="binda-name">Nama Binda</Label>
                  <Input
                    id="binda-name"
                    value={bindaForm.name}
                    onChange={(event) =>
                      setBindaForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Binda Jawa Barat"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Provinsi</Label>
                  <Select
                    value={bindaForm.provinceAreaId}
                    onValueChange={(value) =>
                      setBindaForm((current) => ({
                        ...current,
                        provinceAreaId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih provinsi" />
                    </SelectTrigger>
                    <SelectContent>
                      {overview.provinces.map((summary) => (
                        <SelectItem key={summary.province.id} value={summary.province.id}>
                          {summary.province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Deputi Induk</Label>
                  <Select
                    value={bindaForm.parentUnitId}
                    onValueChange={(value) =>
                      setBindaForm((current) => ({
                        ...current,
                        parentUnitId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih deputi induk" />
                    </SelectTrigger>
                    <SelectContent>
                      {deputyOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="directorate-code">Kode Unit</Label>
                  <Input
                    id="directorate-code"
                    value={directorateForm.code}
                    onChange={(event) =>
                      setDirectorateForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder="ORG-DIR-WIL-BARAT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="directorate-name">Nama Direktorat</Label>
                  <Input
                    id="directorate-name"
                    value={directorateForm.name}
                    onChange={(event) =>
                      setDirectorateForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Direktorat Wilayah Barat"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Deputi Induk</Label>
                  <Select
                    value={directorateForm.parentUnitId}
                    onValueChange={(value) =>
                      setDirectorateForm((current) => ({
                        ...current,
                        parentUnitId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih deputi induk" />
                    </SelectTrigger>
                    <SelectContent>
                      {deputyOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Pilih Cakupan Provinsi</Label>
                  <ScrollArea className="h-72 rounded-xl border border-border/70">
                    <div className="grid gap-2 p-3 md:grid-cols-2">
                      {overview.provinces.map((summary) => {
                        const checked = directorateForm.provinceAreaIds.includes(summary.province.id);

                        return (
                          <label
                            key={summary.province.id}
                            className={cn(
                              "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition hover:border-primary/50",
                              checked ? "border-primary/60 bg-primary/5" : "border-border/70",
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) => {
                                setDirectorateForm((current) => {
                                  const nextProvinceAreaIds =
                                    nextChecked === true
                                      ? [...current.provinceAreaIds, summary.province.id]
                                      : current.provinceAreaIds.filter((item) => item !== summary.province.id);
                                  const nextPrimaryProvinceAreaId = nextProvinceAreaIds.includes(
                                    current.primaryProvinceAreaId,
                                  )
                                    ? current.primaryProvinceAreaId
                                    : nextProvinceAreaIds[0] ?? "";

                                  return {
                                    ...current,
                                    provinceAreaIds: nextProvinceAreaIds,
                                    primaryProvinceAreaId: nextPrimaryProvinceAreaId,
                                  };
                                });
                              }}
                            />
                            <div className="space-y-1">
                              <div className="font-medium text-sm">{summary.province.name}</div>
                              <div className="text-muted-foreground text-xs">
                                {summary.province.code} - {summary.directorates.length} direktorat aktif
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Provinsi Utama</Label>
                  <Select
                    value={directorateForm.primaryProvinceAreaId}
                    onValueChange={(value) =>
                      setDirectorateForm((current) => ({
                        ...current,
                        primaryProvinceAreaId: value,
                      }))
                    }
                    disabled={!directorateForm.provinceAreaIds.length}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih provinsi utama" />
                    </SelectTrigger>
                    <SelectContent>
                      {overview.provinces
                        .filter((summary) => directorateForm.provinceAreaIds.includes(summary.province.id))
                        .map((summary) => (
                          <SelectItem key={summary.province.id} value={summary.province.id}>
                            {summary.province.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/70 pt-4">
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard/admin-system/organisasi-wilayah">Batal</Link>
              </Button>
              <Button
                type="button"
                onClick={isBinda ? handleCreateBinda : handleCreateDirectorate}
                disabled={isSaving || !deputyOptions.length}
              >
                {isSaving
                  ? "Menyimpan..."
                  : isBinda
                    ? "Simpan Binda"
                    : "Simpan Direktorat"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="size-4" />
                Ringkasan Konteks
              </CardTitle>
              <CardDescription>Snapshot cepat untuk memastikan master yang akan didaftarkan sudah tepat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{overview.totals.provinceCount} provinsi aktif</Badge>
                <Badge variant="outline">{overview.totals.bindaCount} Binda aktif</Badge>
                <Badge variant="outline">{overview.totals.directorateCount} Direktorat aktif</Badge>
              </div>
              <div className="rounded-xl border border-border/70 bg-muted/40 p-4">
                <div className="text-muted-foreground text-xs uppercase tracking-[0.22em]">Provinsi Fokus</div>
                <div className="mt-2 font-medium text-base">{selectedProvince?.province.name ?? "Belum dipilih"}</div>
                <div className="mt-1 text-muted-foreground text-sm">
                  {selectedProvince
                    ? `${selectedProvince.binda ? `Sudah ada ${selectedProvince.binda.name}` : "Belum ada Binda"} dan ${selectedProvince.directorates.length} direktorat coverage.`
                    : "Pilih provinsi pada form untuk melihat konteks coverage saat ini."}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Panduan Singkat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground text-sm">
              <p>
                Untuk Binda, satu provinsi hanya boleh memiliki satu unit aktif sehingga sistem akan menolak duplikasi.
              </p>
              <p>
                Untuk Direktorat wilayah, beberapa provinsi bisa dicakup sekaligus tetapi tetap harus ada satu provinsi
                utama.
              </p>
              <p>Setelah berhasil disimpan, halaman akan kembali ke dashboard master wilayah secara otomatis.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
