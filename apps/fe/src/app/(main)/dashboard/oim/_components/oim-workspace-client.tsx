"use client";

import { useEffect, useState, useTransition } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  MapPin,
  MapPinned,
  Network,
  Plus,
  Printer,
  RadioTower,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { administrativeAreaLabel } from "@/features/baket/administrative-area";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

import type { OimPageData, OimView } from "./oim-types";

const SituationMap = dynamic(() => import("./oim-situation-map").then((module) => module.OimSituationMap), {
  ssr: false,
  loading: () => <div className="h-[560px] animate-pulse rounded-xl bg-muted" />,
});

const BaketLocationMap = dynamic(
  () => import("@/features/baket/components/baket-location-map").then((module) => module.BaketLocationMap),
  {
    ssr: false,
    loading: () => <div className="h-[420px] animate-pulse bg-muted" />,
  },
);

type Row = Record<string, any>;
type Props = { view: OimView; data: OimPageData; params: Record<string, string> };

const VIEW_META: Record<OimView, [string, string, typeof FileText]> = {
  dashboard: ["Pusat Kendali OIM", "Ringkasan antrean intelijen dalam scope komando dan wilayah Anda.", RadioTower],
  reports: [
    "Laporan Masuk",
    "Baket Field Officer yang telah dikirim ke OIM dan seluruh status lanjutannya.",
    FileSearch,
  ],
  "report-detail": ["Detail Baket", "Bukti, peta lokasi, versi, dan jejak keputusan.", FileSearch],
  "report-version": ["Snapshot Versi Baket", "Versi historis bersifat baca-saja.", FileText],
  verification: [
    "Neraca Penilaian",
    "Antrean penilaian keandalan sumber A–F dan kredibilitas informasi 1–6.",
    ClipboardCheck,
  ],
  "verification-detail": [
    "Lembar Verifikasi",
    "Checklist, cross-reference, matriks, interpretasi, dan keputusan final.",
    ShieldCheck,
  ],
  analysis: [
    "Analisis Intelijen",
    "Analisis manual berbasis Baket terverifikasi, tanpa pembuatan draft AI.",
    BarChart3,
  ],
  "analysis-new": ["Analisis Baru", "Pilih sumber terverifikasi dan mulai draft lima bagian.", Plus],
  "analysis-detail": [
    "Workspace Analisis",
    "Gabungkan beberapa Baket, susun analisis, lalu simpan sebagai draft atau final.",
    Network,
  ],
  "analysis-edit": ["Edit Analisis", "Perbarui versi aktif sebelum difinalkan.", BarChart3],
  "analysis-version": ["Versi Analisis", "Snapshot final tidak dapat diubah.", BarChart3],
  products: ["Produk Intelijen", "Laporan Intelijen yang bersumber dari analisis final.", FileText],
  "product-list": ["Daftar Produk", "Pipeline draft, revisi, pengajuan, dan versi produk.", FileText],
  "product-new": [
    "Buat Laporan Intelijen",
    "Pilih jenis laporan dan susun isinya dari analisis final beserta Baket sumber.",
    Plus,
  ],
  "product-detail": ["Detail Produk", "Metadata, sumber, versi, validasi, approval, dan traceability.", FileText],
  "product-edit": ["Edit Produk", "Koreksi metadata draft dan konten versi aktif.", FileText],
  "product-version": ["Versi Produk", "Snapshot produk untuk audit dan cetak.", FileText],
  approval: ["Pengajuan Persetujuan", "Produk final yang menunggu keputusan Regional Commander.", Send],
  "approval-detail": ["Persiapan Pengajuan", "Finalkan produk dan kunci versi untuk Regional Commander.", Send],
  "workflow-detail": ["Timeline Persetujuan", "Status keputusan Regional Commander.", Send],
  monitoring: [
    "Monitoring Lapangan",
    "Workload, deadline, coverage, laporan, personel, dan insiden pada rantai komando.",
    RadioTower,
  ],
  "monitoring-task": ["Monitoring Tugas", "Progress lapangan dan laporan terkait.", RadioTower],
  "monitoring-report": ["Baket Lapangan", "Detail Baket dari konteks monitoring.", FileSearch],
  "monitoring-personnel": [
    "Profil Operasional Personel",
    "Workload, deadline, coverage, dan posisi terakhir.",
    RadioTower,
  ],
  map: ["Peta Situasi", "Seluruh Baket masuk, boundary scope, cluster, heatmap, dan alert.", MapPinned],
  "map-report": ["Baket pada Peta", "Detail laporan dan konteks spasial.", MapPinned],
  "map-alert": ["Detail Alert", "Situasi, severity, lokasi, dan tindak lanjut.", AlertTriangle],
};

function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (value && typeof value === "object" && Array.isArray((value as Row).items)) return (value as Row).items;
  return [];
}

function fieldOfficerUserName(assignment?: Row | null) {
  const profile = assignment?.userProfile;
  return profile?.fullName ?? profile?.authUser?.name ?? profile?.username ?? "User pengirim tidak teridentifikasi";
}

function currentVersion(item: Row) {
  return Array.isArray(item.versions) ? (item.versions[0] ?? {}) : (item.currentVersion ?? {});
}

function fmtDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";
}

function StatusBadge({ value }: { value?: string }) {
  const danger = value === "REJECTED" || value === "URGENT";
  const success = value === "VERIFIED" || value === "VALIDATED" || value?.startsWith("APPROVED");
  const label = value === "VALIDATED" ? "FINAL" : (value ?? "BELUM ADA").replaceAll("_", " ");
  return <Badge variant={danger ? "destructive" : success ? "default" : "secondary"}>{label}</Badge>;
}

function Header({ view }: { view: OimView }) {
  const [title, description, Icon] = VIEW_META[view];
  return (
    <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
            Operational Intelligence Manager
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex gap-2 print:hidden">
        <Button variant="outline" asChild>
          <Link href="/dashboard/oim/peta-situasi">
            <MapPinned />
            Peta
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/oim/produk-intelijen/buat-produk">
            <Plus />
            Produk
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorBanner({ errors = [] }: { errors?: string[] }) {
  if (!errors.length) return null;
  return (
    <Alert>
      <AlertTriangle />
      <AlertTitle>Beberapa data belum tersedia</AlertTitle>
      <AlertDescription>
        {errors.join(" ")} Halaman tetap dapat digunakan untuk data yang berhasil dimuat.
      </AlertDescription>
    </Alert>
  );
}

function Kpis({ data }: { data: OimPageData }) {
  const bakets = rows(data.bakets);
  const verifications = rows(data.verifications);
  const analyses = rows(data.analyses);
  const products = rows(data.products);
  const cards = [
    ["Baket baru", bakets.filter((item) => item.status === "SENT_TO_OIM").length, "Menunggu intake"],
    [
      "Antrean verifikasi",
      verifications.filter((item) => ["DRAFT", "IN_PROGRESS"].includes(item.status)).length,
      "Perlu keputusan",
    ],
    ["Pengembangan", bakets.filter((item) => item.status === "NEEDS_DEVELOPMENT").length, "Dikembalikan ke lapangan"],
    ["Analisis aktif", analyses.filter((item) => item.status !== "ARCHIVED").length, "Draft dan review"],
    [
      "Draft produk",
      products.filter((item) => ["DRAFT", "NEEDS_REVISION"].includes(item.status)).length,
      "Belum diajukan",
    ],
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map(([label, value, hint]) => (
        <Card key={String(label)} size="sm">
          <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle className="text-2xl">{value}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function Filters({ areas, mode = "baket" }: { areas?: unknown; mode?: "baket" | "verification" | "product" }) {
  const root = (areas ?? {}) as Row;
  const topLevel = rows(root.children);
  const provinces = topLevel.filter((area) => area.level === "PROVINCE");
  const [provinceId, setProvinceId] = useState("");
  const [regencyId, setRegencyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const selectedProvince = provinces.find((area) => area.id === provinceId);
  const directRegencies = topLevel.filter((area) => ["REGENCY", "CITY"].includes(area.level));
  const regencies = selectedProvince
    ? rows(selectedProvince.children).filter((area) => ["REGENCY", "CITY"].includes(area.level))
    : directRegencies;
  const selectedRegency = regencies.find((area) => area.id === regencyId);
  const districts = selectedRegency ? rows(selectedRegency.children).filter((area) => area.level === "DISTRICT") : [];
  const areaId = districtId || regencyId || provinceId;
  const statusOptions =
    mode === "product"
      ? ["DRAFT", "READY_FOR_SUBMISSION", "SUBMITTED", "IN_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED"]
      : mode === "verification"
        ? ["DRAFT", "IN_PROGRESS", "VERIFIED", "NEEDS_DEVELOPMENT", "REJECTED"]
        : ["SENT_TO_OIM", "UNDER_VERIFICATION", "NEEDS_DEVELOPMENT", "VERIFIED", "REJECTED"];

  return (
    <form className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 xl:grid-cols-4" method="get">
      <input type="hidden" name="areaId" value={areaId} />
      <Input name="search" placeholder="Cari judul, isi, nomor produk…" />
      <select
        value={provinceId}
        onChange={(event) => {
          setProvinceId(event.target.value);
          setRegencyId("");
          setDistrictId("");
        }}
        className="h-9 rounded-lg border bg-background px-3 text-sm"
        aria-label="Provinsi"
      >
        <option value="">Seluruh provinsi scope</option>
        {provinces.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <select
        value={regencyId}
        onChange={(event) => {
          setRegencyId(event.target.value);
          setDistrictId("");
        }}
        className="h-9 rounded-lg border bg-background px-3 text-sm"
        aria-label="Kabupaten atau kota"
      >
        <option value="">Seluruh kabupaten/kota</option>
        {regencies.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <select
        value={districtId}
        onChange={(event) => setDistrictId(event.target.value)}
        className="h-9 rounded-lg border bg-background px-3 text-sm"
        aria-label="Kecamatan"
      >
        <option value="">Seluruh kecamatan</option>
        {districts.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
      <select name="status" className="h-9 rounded-lg border bg-background px-3 text-sm">
        <option value="">Seluruh status</option>
        {statusOptions.map((status) => (
          <option key={status}>{status}</option>
        ))}
      </select>
      <select name="urgency" className="h-9 rounded-lg border bg-background px-3 text-sm">
        <option value="">Semua urgensi</option>
        <option>NORMAL</option>
        <option>HIGH</option>
        <option>URGENT</option>
      </select>
      <Input type="date" name="periodStart" aria-label="Tanggal mulai" />
      <Input type="date" name="periodEnd" aria-label="Tanggal selesai" />
      <Button type="submit" variant="outline">
        Terapkan filter
      </Button>
    </form>
  );
}

function BaketList({ data }: { data: OimPageData }) {
  const items = rows(data.bakets);
  return (
    <div className="grid gap-3">
      {items.length ? (
        items.map((item) => {
          const version = currentVersion(item);
          const fieldOfficer = item.createdByFieldOfficerAssignment;
          return (
            <Card key={item.id} size="sm">
              <CardContent className="grid gap-4 pt-1 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={item.status} />
                    <StatusBadge value={version.urgency} />
                    <Badge variant="outline">{item.reportCategory?.name ?? "Kategori legacy"}</Badge>
                    <Badge variant="outline">
                      {item.jaringCluster?.name ?? item.primaryJaring?.cluster?.name ?? "Klaster legacy"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">v{item.currentVersionNumber}</span>
                  </div>
                  <h2 className="mt-2 font-medium">{version.title ?? "Baket tanpa judul"}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {version.normalizedContent ?? version.originalContent ?? "Belum ada ringkasan."}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Field Officer: {fieldOfficerUserName(fieldOfficer)} · {administrativeAreaLabel(version.eventArea)} ·{" "}
                    {fmtDate(item.updatedAt)}
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/dashboard/oim/laporan-masuk/${item.id}`}>
                    Tinjau <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada Baket dalam filter dan scope ini.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ReportStatusTabs({ activeStatus }: { activeStatus?: string }) {
  const tabs = [
    ["SENT_TO_OIM", "Baru"],
    ["UNDER_VERIFICATION", "Sedang Diverifikasi"],
    ["NEEDS_DEVELOPMENT", "Perlu Pengembangan"],
    ["VERIFIED,REJECTED", "Selesai"],
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([status, label]) => (
        <Button key={status} variant={activeStatus === status ? "default" : "outline"} asChild>
          <Link
            href={`/dashboard/oim/laporan-masuk?${status.includes(",") ? `statuses=${status}` : `status=${status}`}`}
          >
            {label}
          </Link>
        </Button>
      ))}
    </div>
  );
}

function BaketDetail({ item, activeTab }: { item?: unknown; activeTab?: string }) {
  const baket = (item ?? {}) as Row;
  const versions = rows(baket.versions);
  const version = versions[0] ?? {};
  const fieldOfficer = (baket.createdByFieldOfficerAssignment ?? {}) as Row;
  const sourceMessages = rows(version.sourceMessages);
  const evidenceCandidates = [
    ...rows(version.attachments),
    ...sourceMessages.flatMap((source) => rows(source.message?.media)),
  ];
  const seenFileIds = new Set<string>();
  const evidence = evidenceCandidates.filter((entry) => {
    const fileId = entry.fileId ?? entry.file?.id;
    if (!fileId || seenFileIds.has(fileId)) return false;
    seenFileIds.add(fileId);
    return true;
  });
  const primaryPhoto = evidence.find((entry) => String(entry.file?.mimeType ?? "").startsWith("image/"));
  const hasCoordinates =
    version.latitude !== null &&
    version.latitude !== undefined &&
    version.longitude !== null &&
    version.longitude !== undefined;
  const coordinates = hasCoordinates ? `${version.latitude}, ${version.longitude}` : null;
  const eventAreaLabel = administrativeAreaLabel(version.eventArea);
  const defaultTab = ["information", "evidence", "verification", "history"].includes(activeTab ?? "")
    ? activeTab
    : "information";
  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList>
        <TabsTrigger value="information">Informasi</TabsTrigger>
        <TabsTrigger value="evidence">Bukti & Lokasi</TabsTrigger>
        <TabsTrigger value="verification">Verifikasi & Neraca</TabsTrigger>
        <TabsTrigger value="history">Riwayat versi</TabsTrigger>
      </TabsList>
      <TabsContent value="information" className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex gap-2">
              <StatusBadge value={baket.status} />
              <StatusBadge value={version.urgency} />
              <Badge variant="outline">{baket.reportCategory?.name ?? "Kategori legacy"}</Badge>
              <Badge variant="outline">
                {baket.jaringCluster?.name ?? baket.primaryJaring?.cluster?.name ?? "Klaster legacy"}
              </Badge>
            </div>
            <CardTitle>{version.title ?? "Baket"}</CardTitle>
            <CardDescription>
              {eventAreaLabel} · {fmtDate(version.eventTime)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="whitespace-pre-wrap leading-7">
              {version.normalizedContent ?? version.originalContent ?? "—"}
            </div>
            <Separator />
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Field Officer pengirim</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium">
                  <UserRound className="size-4" />
                  {fieldOfficerUserName(fieldOfficer)}
                </dd>
                <dd className="text-xs text-muted-foreground">{fieldOfficer.position?.title ?? "Petugas Organik"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Jaring sumber</dt>
                <dd className="mt-1 font-medium">
                  {baket.primaryJaring?.aliasName ?? baket.primaryJaring?.code ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Waktu kejadian</dt>
                <dd className="mt-1 font-medium">{fmtDate(version.eventTime)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">GPS lokasi</dt>
                <dd className="mt-1 font-medium">{coordinates ?? "Koordinat tidak tersedia"}</dd>
                {coordinates ? (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    href={`https://www.google.com/maps?q=${version.latitude},${version.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MapPin className="size-3" /> Buka di Google Maps
                  </a>
                ) : null}
              </div>
            </dl>
            {primaryPhoto ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Foto bukti</p>
                <img
                  src={`/api/files/${primaryPhoto.fileId ?? primaryPhoto.file?.id}`}
                  alt={primaryPhoto.file?.originalName ?? "Foto bukti laporan Baket"}
                  className="max-h-96 w-full rounded-lg border bg-muted object-contain"
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Kontrol intake</CardTitle>
            <CardDescription>Canonical verification dibuat satu kali untuk versi aktif.</CardDescription>
          </CardHeader>
          <CardContent>
            <StartVerification baket={baket} version={version} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="evidence">
        <Card>
          <CardContent className="space-y-5 py-4">
            <BaketAdministrativeArea area={version.eventArea} />
            {hasCoordinates ? (
              <div className="space-y-2">
                <div>
                  <p className="font-medium">Peta lokasi kejadian</p>
                  <p className="text-sm text-muted-foreground">
                    {eventAreaLabel} · {coordinates}
                  </p>
                </div>
                <div className="overflow-hidden rounded-xl border bg-muted">
                  <BaketLocationMap
                    latitude={Number(version.latitude)}
                    longitude={Number(version.longitude)}
                    title={version.title ?? "Lokasi Baket"}
                    areaLabel={eventAreaLabel}
                  />
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Koordinat lokasi tidak tersedia.
              </p>
            )}
            {evidence.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {evidence.map((entry) => {
                  const file = (entry.file ?? {}) as Row;
                  const fileId = entry.fileId ?? file.id;
                  const isImage = String(file.mimeType ?? "").startsWith("image/");
                  return (
                    <div key={fileId} className="overflow-hidden rounded-lg border">
                      {isImage ? (
                        <img
                          src={`/api/files/${fileId}`}
                          alt={file.originalName ?? "Foto bukti Baket"}
                          className="aspect-video w-full bg-muted object-cover"
                        />
                      ) : null}
                      <div className="p-3">
                        <p className="font-medium">{file.originalName ?? fileId}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.caption ?? file.mimeType ?? "Bukti Baket"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground">Tidak ada foto atau lampiran bukti.</p>
            )}
            {sourceMessages.map((source) => (
              <div key={source.messageId} className="rounded-lg border p-3">
                <p className="font-medium">
                  Pesan sumber · {source.message?.jaring?.aliasName ?? source.message?.jaring?.code ?? "Jaring"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {source.message?.content ?? "Isi sumber tidak tersedia"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pengirim {source.message?.senderPhone ?? "-"} · {fmtDate(source.message?.receivedAt)} ·{" "}
                  {rows(source.message?.media).length} media
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  GPS {source.message?.latitude ?? "-"}, {source.message?.longitude ?? "-"} · akurasi{" "}
                  {source.message?.gpsAccuracyMeters ?? "-"} meter
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="verification" className="space-y-4">
        {version.verification ? (
          <VerificationEditor item={{ ...version.verification, baketVersion: { ...version, baket } }} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Mulai Neraca Penilaian</CardTitle>
              <CardDescription>
                Canonical verification dibuat satu kali untuk versi aktif dan dilanjutkan dari halaman ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StartVerification baket={baket} version={version} />
            </CardContent>
          </Card>
        )}
      </TabsContent>
      <TabsContent value="history">
        <Card>
          <CardContent className="divide-y py-2">
            {versions.map((entry) => (
              <Link
                key={entry.id}
                className="flex items-center justify-between py-3 hover:text-primary"
                href={`/dashboard/oim/laporan-masuk/${baket.id}/versions/${entry.id}`}
              >
                <span>
                  Versi {entry.versionNumber} · {entry.title}
                </span>
                <span className="text-xs">{fmtDate(entry.createdAt)}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function StartVerification({ baket, version }: { baket: Row; version: Row }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const existing = Boolean(version.verification);
  const disabled = !["SENT_TO_OIM", "UNDER_VERIFICATION"].includes(baket.status) || !version.id;
  return (
    <Button
      disabled={disabled || pending}
      className="w-full"
      onClick={() =>
        start(async () => {
          try {
            if (!existing) {
              await apiBrowserMutation<Row>("POST", `/baket-versions/${version.id}/verification`, {
                summary: "Intake OIM dimulai",
              });
            }
            router.push(`/dashboard/oim/laporan-masuk/${baket.id}?tab=verification`);
            router.refresh();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal memulai verifikasi");
          }
        })
      }
    >
      <ClipboardCheck />
      {pending ? "Memproses…" : disabled ? "Keputusan sudah final" : "Mulai verifikasi"}
    </Button>
  );
}

function VerificationEditor({ item }: { item?: unknown }) {
  const verification = (item ?? {}) as Row;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reliability, setReliability] = useState(verification.sourceReliability ?? "");
  const [credibility, setCredibility] = useState(verification.informationCredibility ?? "");
  const [summary, setSummary] = useState(verification.summary ?? "");
  const locked = ["VERIFIED", "NEEDS_DEVELOPMENT", "REJECTED"].includes(verification.status);
  const act = (fn: () => Promise<unknown>) =>
    start(async () => {
      try {
        await fn();
        toast.success("Keputusan tersimpan");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Operasi gagal");
      }
    });
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div>
        <Card>
          <CardHeader>
            <div className="flex justify-between">
              <CardTitle>Matriks penilaian</CardTitle>
              <StatusBadge value={verification.status} />
            </div>
            <CardDescription>Nilai A–F mengukur keandalan sumber; 1–6 mengukur kredibilitas informasi.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Keandalan sumber</Label>
              <select
                disabled={locked}
                value={reliability}
                onChange={(event) => setReliability(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="">Pilih A–F</option>
                {["A", "B", "C", "D", "E", "F"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Kredibilitas informasi</Label>
              <select
                disabled={locked}
                value={credibility}
                onChange={(event) => setCredibility(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              >
                <option value="">Pilih 1–6</option>
                {[
                  ["ONE", "1"],
                  ["TWO", "2"],
                  ["THREE", "3"],
                  ["FOUR", "4"],
                  ["FIVE", "5"],
                  ["SIX", "6"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Alasan dan interpretasi</Label>
              <Textarea
                disabled={locked}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                className="mt-2 min-h-28"
              />
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Keputusan</CardTitle>
          <CardDescription>Keputusan final membuat hasil dan Baket immutable.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-xs text-muted-foreground">Skor</p>
            <p className="mt-1 text-3xl font-semibold">
              {reliability || "–"}
              {({ ONE: "1", TWO: "2", THREE: "3", FOUR: "4", FIVE: "5", SIX: "6" } as Row)[credibility] ?? "–"}
            </p>
          </div>
          <Button
            disabled={locked || pending || !reliability || !credibility}
            className="w-full"
            onClick={() =>
              act(async () => {
                if (verification.status === "DRAFT")
                  await apiBrowserMutation("POST", `/verifications/${verification.id}/start`);
                await apiBrowserMutation("PATCH", `/verifications/${verification.id}`, {
                  sourceReliability: reliability,
                  informationCredibility: credibility,
                  summary,
                });
                await apiBrowserMutation("POST", `/verifications/${verification.id}/complete`, {
                  decision: "VERIFIED",
                  summary,
                });
              })
            }
          >
            <CheckCircle2 />
            Terverifikasi
          </Button>
          <Button
            disabled={locked || pending}
            variant="outline"
            className="w-full"
            onClick={() =>
              act(() =>
                apiBrowserMutation("POST", `/verifications/${verification.id}/needs-development`, {
                  reason: summary || "Perlu pengembangan",
                  requiredInformation: "Lengkapi fakta, lokasi, dan evidence pendukung.",
                }),
              )
            }
          >
            Perlu pengembangan
          </Button>
          <Button
            disabled={locked || pending}
            variant="destructive"
            className="w-full"
            onClick={() =>
              act(() =>
                apiBrowserMutation("POST", `/verifications/${verification.id}/reject`, {
                  reason: summary || "Informasi tidak memenuhi standar verifikasi.",
                }),
              )
            }
          >
            Tolak
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalysisList({ data }: { data: OimPageData }) {
  const items = rows(data.analyses);
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <StatusBadge value={item.status} />
              <h2 className="mt-2 font-medium">{item.title}</h2>
              <p className="text-xs text-muted-foreground">
                {item._count?.sources ?? 0} sumber · versi {item.currentVersionNumber}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/oim/analisis-intelijen/${item.id}`}>Buka</Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AnalysisCreate({ data }: { data: OimPageData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const sources = rows(data.verifications).filter((item) => item.status === "VERIFIED");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mulai dari sumber terverifikasi</CardTitle>
        <CardDescription>
          Hanya canonical verification berstatus VERIFIED dalam scope OIM yang dapat dipilih.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label htmlFor="analysis-title">Judul analisis</Label>
          <Input
            id="analysis-title"
            className="mt-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Sumber Baket</Label>
          {sources.length ? (
            sources.map((source) => {
              const id = String(source.id);
              return (
                <label htmlFor={`source-${id}`} key={id} className="flex items-start gap-3 rounded-lg border p-3">
                  <Checkbox
                    id={`source-${id}`}
                    checked={selected.includes(id)}
                    onCheckedChange={(checked) =>
                      setSelected((state) => (checked ? [...state, id] : state.filter((value) => value !== id)))
                    }
                  />
                  <span>
                    <b className="block text-sm">{source.baketVersion?.title ?? "Baket terverifikasi"}</b>
                    <span className="text-muted-foreground text-xs">
                      {administrativeAreaLabel(source.baketVersion?.eventArea)}
                    </span>
                  </span>
                </label>
              );
            })
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-muted-foreground text-sm">
              Belum ada Baket terverifikasi dalam scope Anda.
            </p>
          )}
        </div>
        <Button
          disabled={pending || !title.trim() || selected.length === 0}
          onClick={() =>
            start(async () => {
              try {
                const created = await apiBrowserMutation<Row>("POST", "/analysis-cases", {
                  title,
                  verificationIds: selected,
                });
                router.push(`/dashboard/oim/analisis-intelijen/${created.id}`);
                toast.success("Case analisis dibuat");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Gagal membuat analisis");
              }
            })
          }
        >
          <Plus />
          {pending ? "Membuat…" : "Buat case analisis"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AnalysisWorkspace({ item }: { item?: unknown }) {
  const analysisCase = (item ?? {}) as Row;
  const version = currentVersion(analysisCase);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    indications: version.indications ?? "",
    analysis: version.analysis ?? "",
    impact: version.impact ?? "",
    efforts: version.efforts ?? "",
    recommendations: version.recommendations ?? "",
  });
  const locked = analysisCase.status === "VALIDATED" || analysisCase.status === "ARCHIVED";
  const mutate = (key: keyof typeof form, value: string) => setForm((state) => ({ ...state, [key]: value }));
  const sectionLabels = {
    indications: "Indikasi",
    analysis: "Analisis",
    impact: "Dampak",
    efforts: "Upaya",
    recommendations: "Saran Tindak",
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <CardTitle>{analysisCase.title ?? "Analisis baru"}</CardTitle>
            <StatusBadge value={analysisCase.status} />
          </div>
          <CardDescription>Sintesis manual. Seluruh perubahan tercatat pada versi aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="indications">
            <TabsList className="flex-wrap">
              {Object.entries(sectionLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {Object.entries(sectionLabels).map(([key, label]) => (
              <TabsContent key={key} value={key}>
                <Label>{label}</Label>
                <Textarea
                  disabled={locked}
                  className="mt-2 min-h-72 leading-7"
                  value={form[key as keyof typeof form]}
                  onChange={(event) => mutate(key as keyof typeof form, event.target.value)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Simpan analisis</CardTitle>
            <CardDescription>
              Analisis final akan dikunci dan dapat dipakai untuk membuat Produk Intelijen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              disabled={locked || pending || !version.id}
              className="w-full"
              onClick={() =>
                start(async () => {
                  try {
                    await apiBrowserMutation("PATCH", `/analysis-versions/${version.id}`, form);
                    toast.success("Draft tersimpan");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
                  }
                })
              }
            >
              Simpan draft
            </Button>
            <Button
              disabled={locked || pending || !version.id}
              className="w-full"
              onClick={() =>
                start(async () => {
                  try {
                    await apiBrowserMutation("POST", `/analysis-cases/${analysisCase.id}/finalize`, form);
                    toast.success("Analisis difinalkan dan dikunci");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal memfinalkan analisis");
                  }
                })
              }
            >
              <CheckCircle2 />
              Finalkan analisis
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Baket sumber</CardTitle>
            <CardDescription>Informasi asal tetap melekat pada hasil analisis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rows(analysisCase.sources).map((source, index) => {
              const baketVersion = source.verification?.baketVersion ?? {};
              const fieldOfficer = baketVersion.baket?.createdByFieldOfficerAssignment;
              return (
                <div key={source.verificationId ?? index} className="rounded-lg border p-3 text-sm">
                  <p className="font-medium">
                    {index + 1}. {baketVersion.title ?? "Baket"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {administrativeAreaLabel(baketVersion.eventArea)} · {fieldOfficerUserName(fieldOfficer)}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProductList({ data, approval = false }: { data: OimPageData; approval?: boolean }) {
  const items = rows(data.products).filter(
    (item) =>
      !approval || ["DRAFT", "READY_FOR_SUBMISSION", "NEEDS_REVISION", "UNDER_REGIONAL_REVIEW"].includes(item.status),
  );
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-primary/10">
                <FileText className="size-5 text-primary" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge value={item.classification} />
                  <StatusBadge value={item.status} />
                </div>
                <h2 className="mt-2 font-medium">{item.title}</h2>
                <p className="font-mono text-xs text-muted-foreground">
                  {item.productNumber} · {item.productType?.name ?? "Laporan Intelijen"}
                </p>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link
                href={
                  approval
                    ? `/dashboard/oim/pengajuan-persetujuan/${item.id}`
                    : `/dashboard/oim/produk-intelijen/daftar-produk/${item.id}`
                }
              >
                {approval ? "Siapkan pengajuan" : "Buka"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type JournalRow = {
  NO_URUT: number;
  PERMASALAHAN_AGENDA: string;
  DAERAH_KEJADIAN: string;
  MATERI_SUMBER: string;
};

function buildJournalRows(analysisCase: Row | null): JournalRow[] {
  return rows(analysisCase?.sources).map((source, index) => {
    const version = source.verification?.baketVersion ?? {};
    const fieldOfficer = version.baket?.createdByFieldOfficerAssignment;
    const officerName = fieldOfficerUserName(fieldOfficer);
    return {
      NO_URUT: index + 1,
      PERMASALAHAN_AGENDA: version.title ?? "Baket tanpa judul",
      DAERAH_KEJADIAN: administrativeAreaLabel(version.eventArea),
      MATERI_SUMBER: `${version.originalContent ?? "-"}\n\nSumber: ${officerName}`,
    };
  });
}

function JournalTable({ items }: { items: JournalRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="w-14 border border-current p-2 text-center">No Urut</th>
            <th className="border border-current p-2 text-center">Permasalahan dan Agenda</th>
            <th className="w-36 border border-current p-2 text-center">Daerah Kejadian</th>
            <th className="border border-current p-2 text-center">Materi Informasi dan Sumber</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.NO_URUT}-${item.PERMASALAHAN_AGENDA}`}>
              <td className="border border-current p-2 text-center align-top">{item.NO_URUT}</td>
              <td className="border border-current p-2 align-top">{item.PERMASALAHAN_AGENDA}</td>
              <td className="border border-current p-2 align-top">{item.DAERAH_KEJADIAN}</td>
              <td className="whitespace-pre-wrap border border-current p-2 align-top">{item.MATERI_SUMBER}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ANALYSIS_CONTENT_BY_SECTION: Record<string, string> = {
  INDIKASI: "indications",
  ANALISIS: "analysis",
  DAMPAK: "impact",
  UPAYA: "efforts",
  SARAN_TINDAK: "recommendations",
};

function templateFieldKey(sectionCode: string, fieldCode: string) {
  return `${sectionCode}.${fieldCode}`;
}

function initialTemplateValues(template: Row | null, analysisVersion: Row) {
  const values: Record<string, string> = {};

  for (const section of rows(template?.sections)) {
    if (section.isRepeatable) continue;
    for (const field of rows(section.fields)) {
      const analysisField = ANALYSIS_CONTENT_BY_SECTION[section.code];
      values[templateFieldKey(section.code, field.code)] = analysisField
        ? String(analysisVersion[analysisField] ?? "")
        : "";
    }
  }

  return values;
}

function buildProductContent(template: Row | null, fieldValues: Record<string, string>, journalItems: JournalRow[]) {
  const content: Row = {};

  for (const section of rows(template?.sections)) {
    if (section.isRepeatable) {
      content[section.code] = journalItems;
      continue;
    }

    content[section.code] = Object.fromEntries(
      rows(section.fields).map((field) => [field.code, fieldValues[templateFieldKey(section.code, field.code)] ?? ""]),
    );
  }

  return content;
}

function templateContentComplete(
  template: Row | null,
  fieldValues: Record<string, string>,
  journalItems: JournalRow[],
) {
  if (!template) return false;

  return rows(template.sections).every((section) => {
    if (section.isRepeatable) return journalItems.length > 0;
    return rows(section.fields).every(
      (field) => !field.isRequired || Boolean(fieldValues[templateFieldKey(section.code, field.code)]?.trim()),
    );
  });
}

function ProductBuilder({ data }: { data: OimPageData }) {
  const productTypes = rows(data.productTypes)
    .slice()
    .sort((left, right) => Number(left.formatNo ?? 0) - Number(right.formatNo ?? 0));
  const analyses = rows(data.analyses).filter((item) => item.status === "VALIDATED");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selectedProductTypeId, setSelectedProductTypeId] = useState("");
  const [template, setTemplate] = useState<Row | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [analysisCase, setAnalysisCase] = useState<Row | null>(null);
  const [classification, setClassification] = useState("TERBATAS");
  const [title, setTitle] = useState("");
  const selectedProductType = productTypes.find((item) => item.id === selectedProductTypeId) ?? null;
  const isJournal = selectedProductType?.code === "JURNAL_INFORMASI";
  const journalRows = buildJournalRows(analysisCase);
  const analysisVersion = analysisCase ? currentVersion(analysisCase) : {};
  const productContent = buildProductContent(template, fieldValues, journalRows);

  useEffect(() => {
    if (!selectedProductTypeId) {
      setTemplate(null);
      setFieldValues({});
      return;
    }

    let isActive = true;
    setTemplate(null);
    setFieldValues({});
    apiBrowserFetch<Row[]>(`/product-types/${selectedProductTypeId}/templates`, { query: { activeOnly: true } })
      .then((templates) => {
        if (isActive) setTemplate(templates[0] ?? null);
      })
      .catch(() => {
        if (isActive) setTemplate(null);
      });
    return () => {
      isActive = false;
    };
  }, [selectedProductTypeId]);

  useEffect(() => {
    setFieldValues(initialTemplateValues(template, analysisVersion));
  }, [template, analysisVersion.id]);

  const selectAnalysis = async (caseId: string) => {
    if (!caseId) {
      setAnalysisCase(null);
      setTitle("");
      return;
    }
    try {
      const detail = await apiBrowserFetch<Row>(`/analysis-cases/${caseId}`);
      setAnalysisCase(detail);
      setTitle(String(detail.title ?? ""));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat analisis final");
    }
  };

  const saveProduct = (submit: boolean) =>
    start(async () => {
      if (!template || !selectedProductTypeId || !analysisVersion.id) return;
      try {
        const result = await apiBrowserMutation<Row>("POST", "/products", {
          productTypeId: selectedProductTypeId,
          classification,
          title,
          version: {
            templateId: template.id,
            routingTo: "Regional Commander",
            routingFrom: "Operational Intelligence Manager",
            subject: title,
            content: productContent,
            sourceAnalysisVersionIds: [analysisVersion.id],
          },
        });
        const version = currentVersion(result);
        if (submit) {
          await apiBrowserMutation("POST", `/products/${result.id}/submit`, {
            versionId: version.id,
            confirmation: "SUBMIT",
          });
          toast.success("Produk final dikirim ke Regional Commander");
        } else {
          toast.success("Draft Produk Intelijen tersimpan");
        }
        router.push(`/dashboard/oim/produk-intelijen/daftar-produk/${result.id}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan Produk Intelijen");
      }
    });

  const canSave = Boolean(
    selectedProductTypeId &&
      template &&
      analysisVersion.id &&
      title.trim() &&
      templateContentComplete(template, fieldValues, journalRows),
  );
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_520px]">
      <Card>
        <CardHeader>
          <CardTitle>{selectedProductType?.name ?? "Laporan Intelijen"}</CardTitle>
          <CardDescription>
            Pilih jenis laporan dan analisis final. Isi mengikuti struktur laporan yang dipilih.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label htmlFor="product-type">Jenis laporan</Label>
            <select
              id="product-type"
              value={selectedProductTypeId}
              onChange={(event) => setSelectedProductTypeId(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="">Pilih jenis laporan</option>
              {productTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="product-analysis">Sumber analisis final</Label>
            <select
              id="product-analysis"
              value={analysisCase?.id ?? ""}
              onChange={(event) => void selectAnalysis(event.target.value)}
              className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
            >
              <option value="">Pilih analisis</option>
              {analyses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item._count?.sources ?? 0} Baket
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="product-title">Judul produk</Label>
              <Input
                id="product-title"
                className="mt-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="product-classification">Klasifikasi</Label>
              <select
                id="product-classification"
                value={classification}
                onChange={(event) => setClassification(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border bg-background px-3"
              >
                <option>SANGAT_RAHASIA</option>
                <option>RAHASIA</option>
                <option>TERBATAS</option>
              </select>
            </div>
          </div>
          <Separator />
          {selectedProductTypeId ? (
            template ? (
              isJournal ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <Label>Informasi Baket</Label>
                    <Badge variant="secondary">{journalRows.length} Baket</Badge>
                  </div>
                  {journalRows.length ? (
                    <JournalTable items={journalRows} />
                  ) : (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Pilih analisis final untuk memuat informasi Baket.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Isi laporan</Label>
                    <Badge variant="secondary">{rows(template.sections).length} bagian</Badge>
                  </div>
                  {rows(template.sections).map((section, sectionIndex) => (
                    <div key={section.id ?? section.code} className="rounded-lg border p-4">
                      <h3 className="font-medium">
                        {sectionIndex + 1}. {section.title}
                      </h3>
                      <div className="mt-3 space-y-3">
                        {rows(section.fields).map((field) => {
                          const key = templateFieldKey(section.code, field.code);
                          return (
                            <div key={field.id ?? key}>
                              <Label htmlFor={`product-field-${key}`}>
                                {field.label}
                                {field.isRequired ? " *" : ""}
                              </Label>
                              <Textarea
                                id={`product-field-${key}`}
                                className="mt-2 min-h-28"
                                value={fieldValues[key] ?? ""}
                                onChange={(event) =>
                                  setFieldValues((current) => ({ ...current, [key]: event.target.value }))
                                }
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Sumber: {journalRows.length} Baket dari analisis final terpilih.
                  </p>
                </div>
              )
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Memuat struktur laporan...
              </p>
            )
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Pilih jenis laporan untuk menampilkan struktur isinya.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button disabled={pending || !canSave} variant="outline" onClick={() => saveProduct(false)}>
              <FileText />
              Simpan draft
            </Button>
            <Button disabled={pending || !canSave} onClick={() => saveProduct(true)}>
              <Send />
              Final & Kirim
            </Button>
          </div>
        </CardContent>
      </Card>
      <ProductPreview
        classification={classification}
        title={title}
        productTypeName={selectedProductType?.name ?? "Laporan Intelijen"}
        template={template}
        content={productContent}
        items={journalRows}
        isJournal={isJournal}
      />
    </div>
  );
}

function ProductPreview({
  classification,
  title,
  productTypeName,
  template,
  content,
  items,
  isJournal,
}: {
  classification: string;
  title: string;
  productTypeName: string;
  template: Row | null;
  content: Row;
  items: JournalRow[];
  isJournal: boolean;
}) {
  return (
    <div className="space-y-3">
      <Button className="print:hidden" variant="outline" onClick={() => window.print()}>
        <Printer />
        Cetak / Save as PDF
      </Button>
      <article className="aspect-[210/297] min-h-[760px] bg-white p-10 text-black shadow-lg print:fixed print:inset-0 print:z-50 print:m-0 print:min-h-screen print:w-full print:shadow-none">
        <p className="text-center text-xs font-bold">{classification.replaceAll("_", " ")}</p>
        <div className="mt-10 flex justify-between text-xs font-bold">
          <div>
            BADAN INTELIJEN NEGARA
            <br />
            UNIT KERJA OPERASIONAL
          </div>
        </div>
        <h2 className="mt-12 text-center text-sm font-bold uppercase underline">{productTypeName}</h2>
        <p className="mt-2 text-center font-mono text-xs">Nomor dialokasikan saat disimpan</p>
        <h3 className="mt-8 text-center font-bold">{title || "Judul Produk"}</h3>
        <div className="mt-8 text-xs leading-5">
          {isJournal ? (
            <JournalTable items={items} />
          ) : (
            <div className="space-y-5">
              {rows(template?.sections).map((section, sectionIndex) => (
                <section key={section.id ?? section.code}>
                  <h4 className="font-bold">
                    {sectionIndex + 1}. {section.title}
                  </h4>
                  {rows(section.fields).map((field) => (
                    <p key={field.id ?? field.code} className="mt-1 whitespace-pre-wrap text-justify">
                      {String(content[section.code]?.[field.code] ?? "Isi bagian...")}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          )}
        </div>
        <p className="mt-14 text-right text-xs">Autentikasi: penugasan dan approval elektronik</p>
        <p className="absolute bottom-10 left-0 right-0 text-center text-xs font-bold">
          {classification.replaceAll("_", " ")}
        </p>
      </article>
    </div>
  );
}

function ProductDetail({ item, approval = false }: { item?: unknown; approval?: boolean }) {
  const product = (item ?? {}) as Row;
  const version = currentVersion(product);
  const journalItems = rows(version.content?.ITEMS) as JournalRow[];
  const sourceAnalyses = rows(version.sourceAnalyses);
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={product.classification} />
            <StatusBadge value={product.status} />
          </div>
          <CardTitle>{product.title ?? "Produk"}</CardTitle>
          <CardDescription className="font-mono">{product.productNumber ?? "Nomor otomatis"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Isi</TabsTrigger>
              <TabsTrigger value="sources">Sumber</TabsTrigger>
              <TabsTrigger value="versions">Versi</TabsTrigger>
              <TabsTrigger value="approval">Approval</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="space-y-4">
              {journalItems.length ? (
                <JournalTable items={journalItems} />
              ) : (
                Object.entries((version.content ?? {}) as Row).map(([key, value]) => (
                  <div key={key} className="rounded-lg border p-4">
                    <h3 className="font-medium">{key.replaceAll("_", " ")}</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {typeof value === "object"
                        ? String((value as Row).CONTENT ?? JSON.stringify(value))
                        : String(value)}
                    </p>
                  </div>
                ))
              )}
            </TabsContent>
            <TabsContent value="sources" className="space-y-4">
              {sourceAnalyses.map((source) => {
                const analysisVersion = source.analysisVersion ?? {};
                const analysisCase = analysisVersion.analysisCase ?? {};
                return (
                  <div key={source.analysisVersionId} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-medium">{analysisCase.title ?? "Analisis final"}</h3>
                      <StatusBadge value={analysisCase.status} />
                    </div>
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                      {[
                        ["Indikasi", analysisVersion.indications],
                        ["Analisis", analysisVersion.analysis],
                        ["Dampak", analysisVersion.impact],
                        ["Upaya", analysisVersion.efforts],
                        ["Saran Tindak", analysisVersion.recommendations],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-md bg-muted/40 p-3">
                          <p className="font-medium">{label}</p>
                          <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{value || "-"}</p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      {rows(analysisCase.sources).length} Baket sumber
                    </p>
                  </div>
                );
              })}
            </TabsContent>
            <TabsContent value="versions">
              {rows(product.versions).map((entry) => (
                <div key={entry.id} className="border-b py-3">
                  Versi {entry.versionNumber} · {fmtDate(entry.createdAt)}
                </div>
              ))}
            </TabsContent>
            <TabsContent value="approval">
              <p className="text-sm text-muted-foreground">
                {version.approvalWorkflow ? `Workflow ${version.approvalWorkflow.status}` : "Belum diajukan."}
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>{approval ? "Pre-submit" : "Kontrol produk"}</CardTitle>
          <CardDescription>Routing: OIM → Regional Commander → Executive (baca setelah disetujui).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex justify-between text-xs">
              <span>Kelengkapan versi</span>
              <span>{version.id ? "100%" : "0%"}</span>
            </div>
            <Progress className="mt-2" value={version.id ? 100 : 0} />
          </div>
          <Button variant="outline" className="w-full" onClick={() => window.print()}>
            <Printer />
            Print preview
          </Button>
          {approval && (
            <Button
              disabled={
                pending || !version.id || !["DRAFT", "READY_FOR_SUBMISSION", "NEEDS_REVISION"].includes(product.status)
              }
              className="w-full"
              onClick={() =>
                start(async () => {
                  try {
                    await apiBrowserMutation("POST", `/products/${product.id}/submit`, {
                      versionId: version.id,
                      confirmation: "SUBMIT",
                    });
                    toast.success("Produk diajukan");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Pengajuan gagal");
                  }
                })
              }
            >
              <Send />
              Ajukan exact version
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationList({ data }: { data: OimPageData }) {
  const items = rows(data.verifications);
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} size="sm">
          <CardContent className="flex items-center justify-between gap-4">
            <div>
              <StatusBadge value={item.status} />
              <h2 className="mt-2 font-medium">{item.baketVersion?.title ?? "Verifikasi Baket"}</h2>
              <p className="text-xs text-muted-foreground">{administrativeAreaLabel(item.baketVersion?.eventArea)}</p>
            </div>
            <Button asChild variant="outline">
              <Link href={`/dashboard/oim/verifikasi-neraca-penilaian/${item.id}`}>
                {item.status === "DRAFT" ? "Mulai" : "Buka"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function OimWorkspaceClient({ view, data }: Props) {
  const detailBaket = ["report-detail", "monitoring-report", "map-report"].includes(view);
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <Header view={view} />
      <ErrorBanner errors={data.errors} />
      {view === "dashboard" && (
        <>
          <Kpis data={data} />
          <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3">
              <h2 className="font-heading text-lg font-medium">Prioritas intake</h2>
              <BaketList data={data} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Alur kerja hari ini</CardTitle>
                <CardDescription>Baket → Verifikasi → Analisis → Produk → Pengajuan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {["Intake Baket", "Neraca Penilaian", "Analisis manual", "Produk resmi", "Direktur/Kabinda"].map(
                  (label, index) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className="grid size-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                        {index + 1}
                      </div>
                      <span>{label}</span>
                      {index < 4 && <ArrowRight className="ml-auto size-4 text-muted-foreground" />}
                    </div>
                  ),
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {view === "reports" && (
        <>
          <ReportStatusTabs activeStatus={data.activeStatus} />
          <Filters areas={data.areas} />
          <Kpis data={data} />
          <BaketList data={data} />
        </>
      )}
      {detailBaket && <BaketDetail item={data.baket} activeTab={data.activeTab} />}
      {view === "report-version" && <BaketDetail item={{ versions: [data.version] }} />}
      {view === "verification" && (
        <>
          <Filters areas={data.areas} mode="verification" />
          <VerificationList data={data} />
        </>
      )}
      {view === "verification-detail" && <VerificationEditor item={data.verification} />}
      {view === "analysis" && (
        <>
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/dashboard/oim/analisis-intelijen/baru">
                <Plus />
                Analisis baru
              </Link>
            </Button>
          </div>
          <AnalysisList data={data} />
        </>
      )}
      {view === "analysis-new" && <AnalysisCreate data={data} />}
      {["analysis-detail", "analysis-edit", "analysis-version"].includes(view) && (
        <AnalysisWorkspace
          item={view === "analysis-version" ? { versions: [data.version], status: "VALIDATED" } : data.analysis}
        />
      )}
      {view === "products" && (
        <>
          <div className="flex justify-end">
            <Button asChild>
              <Link href="/dashboard/oim/produk-intelijen/buat-produk">
                <Plus />
                Buat Laporan Intelijen
              </Link>
            </Button>
          </div>
          <ProductList data={data} />
        </>
      )}
      {view === "product-list" && (
        <>
          <Filters areas={data.areas} mode="product" />
          <ProductList data={data} />
        </>
      )}
      {view === "product-new" && <ProductBuilder data={data} />}
      {["product-detail", "product-edit", "product-version"].includes(view) && (
        <ProductDetail item={view === "product-version" ? { versions: [data.version] } : data.product} />
      )}
      {view === "approval" && <ProductList data={data} approval />}
      {view === "approval-detail" && <ProductDetail item={data.product} approval />}
      {view === "workflow-detail" && <ProductDetail item={(data.workflow as Row)?.productVersion?.product} />}
      {view === "monitoring" && (
        <>
          <Kpis data={data} />
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              "Workload personel",
              "Deadline tugas",
              "Coverage wilayah",
              "Laporan masuk",
              "Insiden aktif",
              "Progress lapangan",
            ].map((label, index) => (
              <Card key={label}>
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  <CardDescription>Dalam rantai komando langsung</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={[72, 45, 86, 64, 18, 58][index]} />
                  <p className="mt-2 text-xs text-muted-foreground">Dibatasi scope unit dan wilayah OIM.</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
      {view === "map" && (
        <>
          <Filters areas={data.areas} />
          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <SituationMap reports={data.map} boundaries={data.boundaries} />
            <Card>
              <CardHeader>
                <CardTitle>Legenda situasi</CardTitle>
                <CardDescription>Zoom rendah menampilkan agregasi; zoom tinggi menampilkan marker.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Baket masuk</span>
                  <b>{rows((data.map as Row)?.features).length}</b>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Merah: urgent · Kuning: high · Biru: normal. Baket tanpa koordinat tetap tersedia pada daftar laporan
                  masuk.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {["monitoring-task", "monitoring-personnel", "map-alert"].includes(view) && (
        <Card>
          <CardContent className="py-12 text-center">
            <ShieldCheck className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-medium">Data operasional berada dalam scope OIM</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Detail ini menggunakan kontrak monitoring dan traceability yang sama tanpa membuka data lintas rantai
              komando.
            </p>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
