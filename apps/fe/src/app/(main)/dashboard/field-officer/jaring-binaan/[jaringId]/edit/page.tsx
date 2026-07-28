"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { toast } from "sonner";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldOfficerJaring, FieldOfficerWorkspace } from "@/server/field-ops/types";

type PageProps = {
  params: Promise<{ jaringId: string }>;
};

function dateInput(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export default function Page({ params }: PageProps) {
  const router = useRouter();
  const { jaringId } = React.use(params);
  const [workspace, setWorkspace] = React.useState<FieldOfficerWorkspace | null>(null);
  const [jaring, setJaring] = React.useState<FieldOfficerJaring | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    whatsappNumber: "",
    fullName: "",
    nationalIdNumber: "",
    address: "",
    birthPlace: "",
    birthDate: "",
    gender: "",
    occupationId: "",
    workplace: "",
    jobTitle: "",
    joinedAt: "",
    organizationName: "",
    politicalAffiliation: "",
    districtId: "",
    villageId: "",
    notes: "",
  });

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/field-officer/workspace", { cache: "no-store" });
        const body = (await response.json()) as FieldOfficerWorkspace | { message?: string };
        if (!response.ok) throw new Error("message" in body ? body.message : "Gagal memuat data Jaring.");
        const data = body as FieldOfficerWorkspace;
        const item = data.jaring.find((entry) => entry.id === jaringId) ?? null;
        if (!item) throw new Error("Jaring tidak ditemukan.");
        if (item.registrationStatus !== "REJECTED") {
          throw new Error("Revisi data hanya tersedia untuk Jaring yang ditolak/revisi.");
        }
        const villageId = item.areaIds[0] ?? "";
        const village = data.villageAreas.find((area) => area.areaId === villageId);
        const districtId =
          village?.parentAreaId ??
          data.districtAreas.find((district) => {
            const districtCode = district.officialCode ?? district.code;
            const villageCode = village?.officialCode ?? village?.code ?? "";
            return districtCode && villageCode.startsWith(`${districtCode}.`);
          })?.areaId ??
          "";
        if (!cancelled) {
          setWorkspace(data);
          setJaring(item);
          setForm({
            whatsappNumber: item.whatsappNumber.replace(/\D/g, ""),
            fullName: item.fullName ?? "",
            nationalIdNumber: item.nationalIdNumber ?? "",
            address: item.address ?? "",
            birthPlace: item.birthPlace ?? "",
            birthDate: dateInput(item.birthDate),
            gender: item.gender ?? "",
            occupationId: data.occupations.find((occupation) => occupation.name === item.occupationName)?.id ?? "",
            workplace: item.workplace ?? "",
            jobTitle: item.jobTitle ?? "",
            joinedAt: dateInput(item.joinedAt),
            organizationName: item.organizationName ?? "",
            politicalAffiliation: item.politicalAffiliation ?? "",
            districtId,
            villageId,
            notes: item.notes ?? "",
          });
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Gagal memuat data Jaring.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [jaringId]);

  const selectedDistrict = workspace?.districtAreas.find((area) => area.areaId === form.districtId) ?? null;
  const villageOptions = React.useMemo(() => {
    if (!workspace || !selectedDistrict) return [];
    const districtCode = selectedDistrict.officialCode ?? selectedDistrict.code;
    return workspace.villageAreas.filter((area) => {
      const areaCode = area.officialCode ?? area.code;
      return area.parentAreaId === selectedDistrict.areaId || area.parentOfficialCode === districtCode || areaCode.startsWith(`${districtCode}.`);
    });
  }, [selectedDistrict, workspace]);

  function setValue(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  function handleSubmitClick(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jaring) return;
    if (
      !form.whatsappNumber ||
      !form.fullName.trim() ||
      !form.address.trim() ||
      !form.birthPlace.trim() ||
      !form.birthDate ||
      !form.gender ||
      !form.occupationId ||
      !form.joinedAt ||
      !form.villageId ||
      !form.notes.trim()
    ) {
      toast.error("Lengkapi field wajib sebelum menyimpan revisi.");
      return;
    }
    if (form.nationalIdNumber && !/^\d{16}$/.test(form.nationalIdNumber)) {
      toast.error("NIK harus kosong atau tepat 16 digit.");
      return;
    }
    setShowConfirmDialog(true);
  }

  async function executeSubmit() {
    if (!jaring) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/field-officer/jaring/${jaring.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          whatsappNumber: form.whatsappNumber,
          fullName: form.fullName.trim(),
          nationalIdNumber: form.nationalIdNumber || undefined,
          address: form.address.trim(),
          birthPlace: form.birthPlace.trim(),
          birthDate: form.birthDate,
          gender: form.gender,
          occupationId: form.occupationId,
          workplace: form.workplace.trim() || undefined,
          jobTitle: form.jobTitle.trim() || undefined,
          joinedAt: form.joinedAt,
          organizationName: form.organizationName.trim() || undefined,
          politicalAffiliation: form.politicalAffiliation.trim() || undefined,
          areaIds: [form.villageId],
          notes: form.notes.trim(),
        }),
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? "Gagal menyimpan revisi.");
      toast.success("Revisi Jaring tersimpan dan kembali menunggu verifikasi.");
      setShowConfirmDialog(false);
      router.push(`/dashboard/field-officer/jaring-binaan/${jaring.id}`);
      router.refresh();
    } catch (submitError) {
      toast.error(submitError instanceof Error ? submitError.message : "Gagal menyimpan revisi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Memuat data revisi...</div>;
  if (error || !jaring || !workspace) {
    return (
      <div className="mx-auto max-w-xl space-y-4 p-6">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error ?? "Data tidak tersedia."}</p>
        <Button asChild variant="outline"><Link href="/dashboard/field-officer/jaring-binaan">Kembali</Link></Button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmitClick} className="mx-auto max-w-5xl space-y-5 p-6">
        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/field-officer/jaring-binaan/${jaring.id}`}><ArrowLeft className="size-4" /> Kembali</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Revisi Data Jaring {jaring.aliasName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <section className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide">Identitas Dasar</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field><FieldLabel>WhatsApp *</FieldLabel><FieldContent><Input value={form.whatsappNumber} onChange={(e) => setValue("whatsappNumber", e.target.value.replace(/\D/g, ""))} /></FieldContent></Field>
                <Field><FieldLabel>Nama Lengkap *</FieldLabel><FieldContent><Input value={form.fullName} onChange={(e) => setValue("fullName", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>NIK / KTP (Opsional)</FieldLabel><FieldContent><Input maxLength={16} value={form.nationalIdNumber} onChange={(e) => setValue("nationalIdNumber", e.target.value.replace(/\D/g, "").slice(0, 16))} /><FieldError /></FieldContent></Field>
                <Field className="md:col-span-2"><FieldLabel>Alamat *</FieldLabel><FieldContent><Textarea rows={3} maxLength={1000} value={form.address} onChange={(e) => setValue("address", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>Tempat Lahir *</FieldLabel><FieldContent><Input value={form.birthPlace} onChange={(e) => setValue("birthPlace", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>Tanggal Lahir *</FieldLabel><FieldContent><Input type="date" value={form.birthDate} onChange={(e) => setValue("birthDate", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>Jenis Kelamin *</FieldLabel><FieldContent><NativeSelect value={form.gender} onChange={(e) => setValue("gender", e.target.value)}><NativeSelectOption value="">Pilih</NativeSelectOption><NativeSelectOption value="MALE">Laki-laki</NativeSelectOption><NativeSelectOption value="FEMALE">Perempuan</NativeSelectOption></NativeSelect></FieldContent></Field>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide">Wilayah</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field><FieldLabel>Kecamatan *</FieldLabel><FieldContent><NativeSelect value={form.districtId} onChange={(e) => setForm((current) => ({ ...current, districtId: e.target.value, villageId: "" }))}><NativeSelectOption value="">Pilih Kecamatan</NativeSelectOption>{workspace.districtAreas.map((area) => <NativeSelectOption key={area.areaId} value={area.areaId}>{area.name}</NativeSelectOption>)}</NativeSelect></FieldContent></Field>
                <Field><FieldLabel>Kelurahan/Desa *</FieldLabel><FieldContent><NativeSelect value={form.villageId} onChange={(e) => setValue("villageId", e.target.value)}><NativeSelectOption value="">Pilih Kelurahan/Desa</NativeSelectOption>{villageOptions.map((area) => <NativeSelectOption key={area.areaId} value={area.areaId}>{area.name}</NativeSelectOption>)}</NativeSelect></FieldContent></Field>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide">Profil Jaring</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field><FieldLabel>Pekerjaan *</FieldLabel><FieldContent><NativeSelect value={form.occupationId} onChange={(e) => setValue("occupationId", e.target.value)}><NativeSelectOption value="">Pilih pekerjaan</NativeSelectOption>{workspace.occupations.map((occupation) => <NativeSelectOption key={occupation.id} value={occupation.id}>{occupation.name}</NativeSelectOption>)}</NativeSelect></FieldContent></Field>
                <Field><FieldLabel>Jabatan</FieldLabel><FieldContent><Input value={form.jobTitle} onChange={(e) => setValue("jobTitle", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>Tempat Kerja</FieldLabel><FieldContent><Input value={form.workplace} onChange={(e) => setValue("workplace", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>Organisasi</FieldLabel><FieldContent><Input value={form.organizationName} onChange={(e) => setValue("organizationName", e.target.value)} /></FieldContent></Field>
                <Field><FieldLabel>Afiliasi Politik</FieldLabel><FieldContent><Input value={form.politicalAffiliation} onChange={(e) => setValue("politicalAffiliation", e.target.value)} /></FieldContent></Field>
              </div>
            </section>

            <section className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wide">Informasi Operasional</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field><FieldLabel>Tanggal Bergabung *</FieldLabel><FieldContent><Input type="date" value={form.joinedAt} onChange={(e) => setValue("joinedAt", e.target.value)} /></FieldContent></Field>
                <Field className="md:col-span-2"><FieldLabel>Catatan / Kebermanfaatan *</FieldLabel><FieldContent><Textarea rows={4} value={form.notes} onChange={(e) => setValue("notes", e.target.value)} /></FieldContent></Field>
              </div>
            </section>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <Button type="submit" variant="success" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" /> : null} Simpan Revisi</Button>
        </div>
      </form>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Simpan Revisi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menyimpan revisi data jaring{" "}
              <span className="font-semibold text-foreground">{jaring.aliasName}</span>? Perubahan akan diperbarui dan diajukan kembali untuk proses verifikasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="success"
              disabled={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                void executeSubmit();
              }}
            >
              {isSubmitting ? <LoaderCircle className="animate-spin size-4" /> : null} Ya, Simpan Revisi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
