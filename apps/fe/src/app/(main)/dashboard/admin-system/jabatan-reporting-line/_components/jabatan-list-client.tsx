"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BriefcaseBusiness, Building2, GitBranch, MapPin, Plus, ShieldCheck, Users } from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterPanel } from "@/components/ui/filter-panel";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetchEnvelope } from "@/lib/api/browser-client";
import type { PaginationMeta } from "@/lib/api/types";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";

import { POSITION_CODE_OPTIONS, ROLE_CODE_OPTIONS } from "../../pengguna/_components/pengguna-types";
import type { JabatanListQueryState, JabatanResource } from "./jabatan-types";

type Props = {
  items: JabatanResource[];
  pagination?: PaginationMeta;
  queryState: JabatanListQueryState;
};

const COMMAND_LANE_STEPS = [
  {
    title: "BIN Pusat",
    description: "Dipimpin Kepala BIN (KaBIN) - tingkat nasional",
    relation: "komando",
  },
  {
    title: "BIN Daerah (Binda)",
    description: "Dipimpin Kepala BIN Daerah (Kabinda) - tingkat provinsi",
    relation: "membawahi",
    highlight: true,
  },
  {
    title: "Koordinator Wilayah (Korwil)",
    description: "Tingkat kabupaten/kota",
    relation: "mengoordinasikan",
  },
  {
    title: "Petugas Wilayah (Gaswil)",
    description: "Tingkat kecamatan",
    relation: "membina",
  },
  {
    title: "Jaring",
    description: "Mengirim laporan Jaring melalui WhatsApp Center",
  },
];

const DIRECTORATE_SUPERVISION_STEPS = [
  {
    title: "Kedeputian II",
    description: "Dipimpin Deputi II - cakupan nasional dalam domainnya",
  },
  {
    title: "Direktorat 21",
    description: "Direktur 21",
  },
  {
    title: "Direktorat 22",
    description: "Direktur 22",
  },
  {
    title: "Direktorat 23",
    description: "Direktur 23",
  },
  {
    title: "Direktorat 24",
    description: "Direktur 24",
  },
  {
    title: "Direktorat 25",
    description: "Direktur 25",
  },
];

const HIERARCHY_REFERENCE_ROWS = [
  ["Nasional", "Badan Intelijen Negara (BIN)", "Kepala BIN (KaBIN)", "Seluruh Indonesia"],
  ["Kedeputian", "Kedeputian II", "Deputi II", "Seluruh wilayah dalam domain Deputi II"],
  ["Direktorat", "Direktorat 21-25", "Direktur 21-25", "Beberapa provinsi sesuai supervisi"],
  ["Provinsi", "BIN Daerah (Binda)", "Kepala BIN Daerah (Kabinda)", "Satu provinsi"],
  ["Kabupaten/Kota", "Koordinator Wilayah Kabupaten/Kota", "Koordinator Wilayah (Korwil)", "Satu kabupaten/kota"],
  ["Kecamatan", "Petugas Wilayah Kecamatan", "Petugas Wilayah (Gaswil)", "Satu atau beberapa kecamatan"],
  ["Lapangan", "Jaring", "Jaring", "Wilayah atau penugasan tertentu"],
];

const ANEV_FUNCTION_ROWS = [
  ["Anev Kabupaten/Kota", "Kabupaten/Kota", "Korwil atau personel yang ditunjuk"],
  ["Anev Binda", "Provinsi", "Kabaops, Kasubdit, atau personel Binda"],
  ["Anev Direktorat", "Pusat", "Personel Direktorat 21-25"],
  ["Anev Kedeputian", "Pusat", "Personel Kedeputian II"],
];

const ACCESS_SCOPE_ROWS = [
  ["KaBIN", "Seluruh data nasional"],
  ["Deputi II", "Seluruh data nasional dalam domain Kedeputian II"],
  ["Direktur/Anev Direktorat", "Provinsi non-DKI atau kota/kabupaten DKI yang disupervisi Direktoratnya"],
  ["Kabinda/Anev Binda", "Seluruh data dalam satu provinsi"],
  ["Korwil", "Seluruh data dalam satu kabupaten/kota"],
  ["Gaswil", "Kecamatan penugasan dan jaring binaannya"],
  ["Jaring", "Kiriman miliknya sendiri melalui WhatsApp Center"],
];

const INFORMATION_PRODUCT_ROWS = [
  ["Laporan Jaring", "Jaring melalui WhatsApp Center", "Informasi awal lapangan"],
  ["Draf Baket", "Petugas Wilayah (Gaswil)", "Hasil verifikasi dan penyusunan awal"],
  ["Baket Tervalidasi", "Koordinator Wilayah (Korwil)", "Bahan Keterangan tingkat kabupaten/kota"],
  ["Laporan Intelijen Binda", "Anev Binda", "Produk intelijen tingkat provinsi"],
  ["Laporan Intelijen Direktorat", "Anev Direktorat", "Produk gabungan beberapa provinsi"],
  ["Produk Kedeputian II", "Kedeputian II", "Produk intelijen tingkat pusat"],
];

const BOTTOM_UP_FLOW_STEPS = [
  "Jaring mengirim Laporan Jaring melalui WhatsApp Center.",
  "Petugas Wilayah (Gaswil) menerima, mengklarifikasi, memverifikasi, dan menyusun Draf Baket.",
  "Koordinator Wilayah (Korwil) mengendalikan Gaswil serta melakukan Anev dan validasi tingkat kabupaten/kota.",
  "Baket tervalidasi diteruskan kepada Binda.",
  "Anev Binda mengolah Baket menjadi Laporan Intelijen Binda.",
  "Kabinda melakukan pengendalian atau persetujuan sesuai workflow.",
  "Laporan dikirim ke Direktorat yang menyupervisi Binda tersebut.",
  "Anev Direktorat mengolah laporan dari beberapa provinsi.",
  "Direktur mengendalikan atau menyetujui produk Direktorat.",
  "Produk diteruskan kepada Kedeputian II.",
  "Deputi II memberikan persetujuan, disposisi, atau arahan lebih lanjut.",
  "Produk tertentu dapat diteruskan kepada KaBIN sesuai kewenangan.",
];

const TOP_DOWN_ROUTE = ["KaBIN", "Deputi II", "Direktur", "Kabinda", "Korwil", "Gaswil", "Jaring"];

const ROLE_IDENTITY_FIELDS = [
  "user_id",
  "nama",
  "jabatan",
  "role",
  "fungsi",
  "unit_organisasi",
  "direktorat_id",
  "binda_id",
  "provinsi_id",
  "kabupaten_kota_id",
  "kecamatan_id",
  "wilayah_penugasan",
  "atasan_langsung",
  "status_akun",
];

const ACTION_PERMISSION_ITEMS = [
  "Lihat",
  "Buat",
  "Edit",
  "Verifikasi",
  "Kembalikan untuk perbaikan",
  "Tolak",
  "Setujui",
  "Teruskan",
  "Disposisi",
  "Berikan arahan",
  "Tutup tindak lanjut",
  "Ekspor",
  "Kelola pengguna",
];

function branchLabel(branch?: string | null) {
  if (branch === "PUSAT") return "Pusat";
  if (branch === "DIRECTORATE") return "Direktorat";
  if (branch === "BINDA") return "Binda";
  return "-";
}

function coverageLabel(position: JabatanResource) {
  const coverages = position.areaCoverages ?? [];
  if (!coverages.length) return "Belum ada wilayah";
  const primary = coverages.find((coverage) => coverage.isPrimary) ?? coverages[0];
  return coverages.length > 1 ? `${primary.area.name} +${coverages.length - 1}` : primary.area.name;
}

function DiagramNode({
  title,
  description,
  tone = "default",
}: {
  title: string;
  description: string;
  tone?: "default" | "meeting" | "supervision";
}) {
  let toneClass = "border-white/10 bg-white/[0.06]";
  if (tone === "meeting") {
    toneClass = "border-emerald-400/40 bg-emerald-500/15";
  }
  if (tone === "supervision") {
    toneClass = "border-sky-300/25 bg-sky-400/15";
  }

  return (
    <div className={`rounded-[6px] border px-3 py-3 text-center text-white shadow-sm ${toneClass}`}>
      <div className="font-semibold text-[12px] leading-tight">{title}</div>
      <div className="mt-1 text-[11px] text-slate-300 leading-snug">{description}</div>
    </div>
  );
}

function CommandConnector({ label }: { label?: string }) {
  if (!label) {
    return <div className="py-1 text-center font-mono text-[11px] text-sky-200">|</div>;
  }

  return (
    <div className="py-1 text-center">
      <div className="text-[11px] text-slate-300">{label}</div>
      <div className="font-mono text-[11px] text-sky-200">|</div>
    </div>
  );
}

function DirectorateCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[6px] border border-sky-300/25 bg-sky-500/15 px-2 py-3 text-center text-white">
      <div className="font-semibold text-[11px] leading-tight">{title}</div>
      <div className="mt-1 text-[10px] text-slate-300">{description}</div>
    </div>
  );
}

function ReferenceTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return (
    <div className="rounded-[8px] border border-border/70 bg-muted/15">
      <div className="border-border/70 border-b px-3 py-2 font-semibold text-sm">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-muted/30 text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.join("|")} className="border-border/60 border-t">
                {row.map((cell, index) => {
                  const column = columns[index] ?? cell;
                  return (
                    <td key={`${row.join("|")}-${column}`} className="px-3 py-2 align-top">
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BottomUpFlow() {
  return (
    <div className="rounded-[8px] border border-border/70 bg-muted/15 p-3">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <GitBranch className="size-4 text-sky-600" />
        Flow Laporan Bottom-Up
      </div>
      <ol className="mt-3 space-y-2 text-muted-foreground text-xs">
        {BOTTOM_UP_FLOW_STEPS.map((step, index) => (
          <li key={step} className="grid grid-cols-[24px_minmax(0,1fr)] gap-2">
            <span className="flex size-5 items-center justify-center rounded-[4px] bg-sky-500/10 font-semibold text-sky-700">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TopDownFlow() {
  return (
    <div className="rounded-[8px] border border-border/70 bg-muted/15 p-3">
      <div className="flex items-center gap-2 font-semibold text-sm">
        <GitBranch className="size-4 text-emerald-600" />
        Flow Arahan Top-Down
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {TOP_DOWN_ROUTE.map((item, index) => (
          <div key={item} className="flex items-center gap-2">
            <span className="rounded-[4px] border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-700">
              {item}
            </span>
            {index < TOP_DOWN_ROUTE.length - 1 ? <span className="text-muted-foreground">{"->"}</span> : null}
          </div>
        ))}
      </div>
      <p className="mt-3 text-muted-foreground text-xs">
        Arahan perintah, supervisi, dan tindak lanjut bergerak dari KaBIN sampai Jaring sesuai garis kewenangan.
      </p>
    </div>
  );
}

function CommandSupervisionDiagram() {
  return (
    <Card className="overflow-hidden border border-border/70">
      <CardHeader>
        <CardTitle>Hubungan Komando dan Supervisi</CardTitle>
        <CardDescription>
          Dua lajur sejajar: kiri menunjukkan garis komando kewilayahan, kanan menunjukkan garis supervisi BIN Pusat.
          Binda menjadi titik temu supervisi Direktorat dengan komando kewilayahan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <section className="rounded-[8px] border border-slate-700 bg-[#17171f] p-4 text-white">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="rounded-[6px] bg-sky-400 px-3 py-2 text-center font-semibold text-slate-950 text-xs">
                Garis Komando Kewilayahan
              </div>
              <div className="space-y-0">
                {COMMAND_LANE_STEPS.map((step, index) => (
                  <div key={step.title}>
                    <DiagramNode
                      title={step.title}
                      description={step.description}
                      tone={step.highlight ? "meeting" : "default"}
                    />
                    {index < COMMAND_LANE_STEPS.length - 1 ? <CommandConnector label={step.relation} /> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="rounded-[6px] bg-sky-400 px-3 py-2 text-center font-semibold text-slate-950 text-xs">
                Garis Supervisi BIN Pusat
              </div>
              <div className="space-y-2">
                <div className="text-center text-[11px] text-slate-300">
                  BIN Pusat
                  <div className="font-mono text-sky-200">|</div>
                </div>
                <DiagramNode
                  title={DIRECTORATE_SUPERVISION_STEPS[0].title}
                  description={DIRECTORATE_SUPERVISION_STEPS[0].description}
                  tone="supervision"
                />
                <div className="text-center text-[11px] text-slate-300">
                  membawahi
                  <div className="font-mono text-sky-200">|</div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {DIRECTORATE_SUPERVISION_STEPS.slice(1).map((item) => (
                    <DirectorateCard key={item.title} title={item.title} description={item.description} />
                  ))}
                </div>
                <div className="pt-6">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span className="h-px min-w-10 flex-1 border-sky-400 border-t border-dashed" aria-hidden="true" />
                    <span className="max-w-[360px]">
                      Setiap Direktorat menyupervisi beberapa Binda sesuai pembagian provinsi
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 border-slate-700 border-t pt-3 text-[11px] text-slate-300">
            <span className="flex items-center gap-2">
              <span className="h-px w-8 border-emerald-400 border-t-2" aria-hidden="true" />
              Garis solid = hubungan komando
            </span>
            <span className="flex items-center gap-2">
              <span className="h-px w-8 border-sky-400 border-t border-dashed" aria-hidden="true" />
              Garis putus-putus = hubungan supervisi
            </span>
          </div>
        </section>

        <section className="mt-4 space-y-3 rounded-[8px] border border-sky-500/30 bg-sky-500/[0.03] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-sky-600" />
              <h2 className="font-semibold text-sm">Pengecualian DKI Jakarta</h2>
            </div>
            <Badge variant="outline" className="rounded-[4px] text-[10px]">
              Supervisi sampai kota/Korwil
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Untuk DKI Jakarta, Binda DKI/Kabinda tetap berada pada garis komando. Supervisi Direktorat diarahkan ke
            wilayah kota/Korwil tertentu, bukan mengambil alih komando Kabinda.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[6px] border border-sky-500/30 bg-background p-3 text-xs">
              <div className="font-semibold">Sumber mapping</div>
              <p className="mt-1 text-muted-foreground">
                Dibaca dari penugasan wilayah supervisi yang diatur Admin Sistem, bukan dari pemetaan kode.
              </p>
            </div>
            <div className="rounded-[6px] border border-sky-500/30 bg-background p-3 text-xs">
              <div className="font-semibold">Level DKI</div>
              <p className="mt-1 text-muted-foreground">
                Direktorat memilih kota/kabupaten administratif DKI dari master wilayah.
              </p>
            </div>
            <div className="rounded-[6px] border border-sky-500/30 bg-background p-3 text-xs">
              <div className="font-semibold">Level provinsi lain</div>
              <p className="mt-1 text-muted-foreground">
                Direktorat memilih provinsi/Binda sesuai wilayah supervisinya.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-4 space-y-4">
          <div className="rounded-[8px] border border-border/70 bg-muted/15 p-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Building2 className="size-4 text-sky-600" />
              Hubungan Direktorat dengan Binda
            </div>
            <p className="mt-2 text-muted-foreground text-sm">
              Untuk provinsi selain DKI Jakarta, pembagian supervisi Direktorat dibuat sebagai master data dinamis
              dengan pola Direktorat -&gt; Provinsi -&gt; Binda yang disupervisi. Direktorat hanya melihat data dari
              provinsi dalam wilayah supervisinya, termasuk Korwil, Gaswil, Jaring, dan produk informasi di bawah Binda
              tersebut.
            </p>
            <p className="mt-2 text-muted-foreground text-sm">
              Khusus DKI Jakarta, supervisi Direktorat diarahkan sampai wilayah kota/Korwil seperti panel pengecualian
              di atas. Penugasan kota/kabupaten DKI diubah melalui panel Admin Sistem, tanpa perubahan kode.
            </p>
          </div>

          <ReferenceTable
            title="Acuan Hierarki Organisasi dan Role"
            columns={["Tingkat", "Unit/Tingkatan", "Pimpinan/Petugas", "Cakupan"]}
            rows={HIERARCHY_REFERENCE_ROWS}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <BottomUpFlow />
            <TopDownFlow />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ReferenceTable
              title="Fungsi Anev"
              columns={["Fungsi", "Tingkat", "Pelaksana yang Dapat Ditunjuk"]}
              rows={ANEV_FUNCTION_ROWS}
            />
            <ReferenceTable
              title="Cakupan Hak Akses"
              columns={["Role", "Data yang Dapat Diakses"]}
              rows={ACCESS_SCOPE_ROWS}
            />
          </div>

          <ReferenceTable
            title="Jenis Produk Intelijen"
            columns={["Produk", "Pembuat/Pengolah", "Hasil"]}
            rows={INFORMATION_PRODUCT_ROWS}
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="rounded-[8px] border border-border/70 bg-muted/15 p-3">
              <div className="font-semibold text-sm">Ketentuan Implementasi Role</div>
              <p className="mt-2 text-muted-foreground text-xs">
                Hak akses dihitung dari kombinasi role, fungsi, unit organisasi, wilayah penugasan, dan kewenangan
                tindakan. Nama jabatan saja tidak boleh menjadi satu-satunya dasar akses.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] sm:grid-cols-3">
                {ROLE_IDENTITY_FIELDS.map((field) => (
                  <code key={field} className="rounded-[4px] bg-background px-2 py-1 text-muted-foreground">
                    {field}
                  </code>
                ))}
              </div>
            </div>

            <div className="rounded-[8px] border border-border/70 bg-muted/15 p-3">
              <div className="font-semibold text-sm">Kewenangan Tindakan</div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {ACTION_PERMISSION_ITEMS.map((item) => (
                  <Badge key={item} variant="outline" className="rounded-[4px] bg-background">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

export function JabatanListClient({ items, pagination, queryState }: Props) {
  const router = useRouter();
  const [viewType, setViewType] = useState<"table" | "card">("table");
  const [clientItems, setClientItems] = useState<JabatanResource[]>(items);
  const [clientPagination, setClientPagination] = useState<PaginationMeta | undefined>(pagination);
  const [currentPage, setCurrentPage] = useState(queryState.page);
  const [currentLimit, setCurrentLimit] = useState(queryState.limit);
  const [loadingPage, setLoadingPage] = useState(false);

  useEffect(() => {
    setClientItems(items);
    setClientPagination(pagination);
    setCurrentPage(queryState.page);
    setCurrentLimit(queryState.limit);
  }, [items, pagination, queryState.limit, queryState.page]);

  function buildListUrl(state: JabatanListQueryState) {
    const params = new URLSearchParams();

    if (state.q) params.set("q", state.q);
    if (state.roleCode) params.set("roleCode", state.roleCode);
    if (state.positionCode) params.set("positionCode", state.positionCode);
    if (state.unitId) params.set("unitId", state.unitId);
    params.set("page", String(state.page));
    params.set("limit", String(state.limit));

    return `/dashboard/admin-system/jabatan-reporting-line?${params.toString()}`;
  }

  async function fetchPage(next: Partial<JabatanListQueryState>) {
    const state = {
      ...queryState,
      page: currentPage,
      limit: currentLimit,
      ...next,
    };

    const totalPages = clientPagination?.totalPages;
    if (state.page < 1 || (totalPages !== undefined && state.page > totalPages)) {
      return;
    }

    setLoadingPage(true);
    setCurrentPage(state.page);
    setCurrentLimit(state.limit);

    try {
      const response = await apiBrowserFetchEnvelope<JabatanResource[]>("/positions", {
        query: {
          page: state.page,
          limit: state.limit,
          isActive: true,
          ...(state.q ? { search: state.q } : {}),
          ...(state.roleCode ? { roleCode: state.roleCode } : {}),
          ...(state.positionCode ? { code: state.positionCode } : {}),
          ...(state.unitId ? { unitId: state.unitId } : {}),
        },
      });

      setClientItems(response.data);
      setClientPagination(response.meta?.pagination);
      window.history.pushState(null, "", buildListUrl(state));
    } finally {
      setLoadingPage(false);
    }
  }

  function applyFilter(next: Partial<JabatanListQueryState>) {
    const params = new URLSearchParams();
    const state = { ...queryState, ...next, page: next.page ?? 1 };

    if (state.q) params.set("q", state.q);
    if (state.roleCode) params.set("roleCode", state.roleCode);
    if (state.positionCode) params.set("positionCode", state.positionCode);
    if (state.unitId) params.set("unitId", state.unitId);
    params.set("page", String(state.page));
    params.set("limit", String(state.limit));
    router.push(`/dashboard/admin-system/jabatan-reporting-line?${params.toString()}`);
  }

  const activeFilterCount = [queryState.q, queryState.roleCode, queryState.positionCode, queryState.unitId].filter(
    Boolean,
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant="outline">Master Jabatan</Badge>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>{DOMAIN_TERMS.positionReportingLine}</h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            Kelola jabatan sebagai slot personel lengkap dengan role, unit organisasi, cabang komando, dan wilayah
            tanggung jawab.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin-system/jabatan-reporting-line/baru">
            <Plus className="size-4" />
            Tambah jabatan
          </Link>
        </Button>
      </div>

      <CommandSupervisionDiagram />

      <FilterPanel
        title="Filter jabatan"
        description="Gunakan pencarian, role, dan tipe jabatan untuk mempersempit seluruh master jabatan."
        activeFilterCount={activeFilterCount}
        onReset={() => applyFilter({ q: "", roleCode: "", positionCode: "", unitId: "" })}
        resultSummary={`${clientPagination?.total ?? clientItems.length} jabatan`}
        contentClassName="md:grid-cols-[minmax(0,1.2fr)_220px_220px]"
      >
        <Input
          aria-label="Cari jabatan"
          defaultValue={queryState.q}
          className="h-10"
          placeholder="Cari seat code atau nama jabatan"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              applyFilter({ q: event.currentTarget.value.trim() });
            }
          }}
        />
        <NativeSelect
          aria-label="Filter role jabatan"
          className="h-10"
          value={queryState.roleCode}
          onChange={(event) => applyFilter({ roleCode: event.target.value })}
        >
          <NativeSelectOption value="">Semua role</NativeSelectOption>
          {ROLE_CODE_OPTIONS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter tipe jabatan"
          className="h-10"
          value={queryState.positionCode}
          onChange={(event) => applyFilter({ positionCode: event.target.value })}
        >
          <NativeSelectOption value="">Semua tipe</NativeSelectOption>
          {POSITION_CODE_OPTIONS.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </FilterPanel>

      <Card className="border border-border/70">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Daftar jabatan</CardTitle>
            <CardDescription>
              {clientPagination?.total ?? clientItems.length} jabatan aktif terdaftar sebagai master penempatan
              personel.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-[0.28em] sm:inline">
              Tampilan
            </span>
            <ViewModeToggle
              value={viewType}
              onValueChange={setViewType}
              className="rounded-[6px] border-slate-200 bg-slate-100 dark:border-blue-400/12 dark:bg-slate-900"
              buttonClassName="size-8 rounded-[4px]"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {viewType === "table" ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              <div className="grid grid-cols-[minmax(280px,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_120px] border-b border-border/70 bg-muted/20 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <div>Jabatan</div>
                <div>Unit</div>
                <div>Wilayah</div>
                <div>Status</div>
              </div>
              {clientItems.map((position) => {
                const assignmentCount = position.assignments?.length ?? 0;
                return (
                  <Link
                    key={position.id}
                    href={`/dashboard/admin-system/jabatan-reporting-line/${position.id}`}
                    className="grid grid-cols-[minmax(280px,1.2fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)_120px] border-b border-border/60 px-3 py-3 text-sm transition hover:bg-muted/35 last:border-b-0 items-center"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <BriefcaseBusiness className="size-4 text-sky-500 shrink-0 stroke-[1.5]" />
                        <span className="truncate">{position.title}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground font-mono">
                        {position.seatCode} - {position.role?.name ?? position.role?.code ?? position.code} -{" "}
                        {branchLabel(position.branch)}
                      </div>
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="truncate font-semibold text-foreground">
                        {position.organizationUnit?.name ?? "-"}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {position.organizationUnit?.code ?? "-"}
                      </div>
                    </div>
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                        <MapPin className="size-3.5 text-sky-500/80 shrink-0 stroke-[1.5]" />
                        <span className="truncate text-foreground font-semibold">{coverageLabel(position)}</span>
                      </div>
                    </div>
                    <div>
                      <Badge
                        variant={assignmentCount ? "default" : "outline"}
                        className={`gap-1 rounded-[4px] text-[10px] uppercase font-mono ${assignmentCount ? "bg-emerald-500/10 text-emerald-600 dark:text-[#22C55E] dark:bg-emerald-950/40 border-emerald-500/20" : ""}`}
                      >
                        <Users className="size-3 stroke-[1.5]" />
                        {assignmentCount ? "Terisi" : "Kosong"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
              {!clientItems.length ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Belum ada jabatan sesuai filter.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clientItems.map((position) => {
                const assignmentCount = position.assignments?.length ?? 0;
                return (
                  <Link
                    key={position.id}
                    href={`/dashboard/admin-system/jabatan-reporting-line/${position.id}`}
                    className="group border border-border/70 hover:border-sky-500/40 dark:bg-slate-900 bg-white dark:hover:bg-blue-400/5 hover:bg-slate-50 rounded-[10px] p-4 flex flex-col justify-between gap-3 shadow-xs hover:-translate-y-[2px] transition-all duration-150 ease-out"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <BriefcaseBusiness className="size-4.5 text-sky-500 shrink-0 stroke-[1.5]" />
                          <span className="text-[13px] line-clamp-1 group-hover:text-sky-500 transition-colors font-semibold">
                            {position.title}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-muted-foreground font-mono space-y-0.5 border-t dark:border-blue-400/8 border-slate-100 pt-2">
                        <div className="flex justify-between">
                          <span>Seat Code:</span>
                          <span className="font-semibold text-foreground">{position.seatCode}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Branch:</span>
                          <span className="font-semibold text-foreground">{branchLabel(position.branch)}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1.5 text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Unit Organisasi
                          </span>
                          <span className="truncate font-semibold text-foreground">
                            {position.organizationUnit?.name ?? "-"}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
                            Cakupan Wilayah
                          </span>
                          <span className="truncate font-semibold text-foreground">{coverageLabel(position)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t dark:border-blue-400/8 border-slate-100 pt-2 mt-1">
                      <Badge
                        variant={assignmentCount ? "default" : "outline"}
                        className={`gap-1 rounded-[4px] text-[10px] uppercase font-mono ${assignmentCount ? "bg-emerald-500/10 text-emerald-600 dark:text-[#22C55E] dark:bg-emerald-950/40 border-emerald-500/20" : ""}`}
                      >
                        <Users className="size-3 stroke-[1.5]" />
                        {assignmentCount ? "Terisi" : "Kosong"}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide group-hover:text-sky-500 transition-colors">
                        Detail →
                      </span>
                    </div>
                  </Link>
                );
              })}
              {!clientItems.length ? (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  Belum ada jabatan sesuai filter.
                </div>
              ) : null}
            </div>
          )}

          {clientPagination && (
            <TablePagination
              page={currentPage}
              limit={currentLimit}
              total={clientPagination.total ?? clientItems.length}
              loading={loadingPage}
              onPageChange={(page) => void fetchPage({ page })}
              onLimitChange={(limit) => void fetchPage({ limit, page: 1 })}
              className="mt-4 border border-slate-200 dark:border-white/5 rounded-xl bg-white dark:bg-[#131A26] px-6"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
