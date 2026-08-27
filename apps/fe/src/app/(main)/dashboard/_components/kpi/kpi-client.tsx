"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Download, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import type { QueryParams } from "@/lib/api/types";
import { DC_CONTROLS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import {
  AnomaliesTab,
  DetailTab,
  LeaderboardTab,
  ProductivityTab,
  RegionTab,
  ReportsTab,
  SummaryTab,
  TrendsTab,
  WhatsappTab,
} from "./kpi-tabs";
import type {
  KpiAnomalies,
  KpiAreaTreeNode,
  KpiDetail,
  KpiFilterOptions,
  KpiFilters,
  KpiLeaderboardData,
  KpiProductivity,
  KpiRegionComparison,
  KpiReportsBaket,
  KpiSummary,
  KpiTrends,
  KpiWhatsappCenter,
} from "./kpi-types";

const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Hari ini" },
  { value: "YESTERDAY", label: "Kemarin" },
  { value: "LAST_7_DAYS", label: "7 hari terakhir" },
  { value: "LAST_14_DAYS", label: "14 hari terakhir" },
  { value: "LAST_30_DAYS", label: "30 hari terakhir" },
  { value: "THIS_WEEK", label: "Minggu berjalan" },
  { value: "PREVIOUS_WEEK", label: "Minggu sebelumnya" },
  { value: "THIS_MONTH", label: "Bulan berjalan" },
  { value: "PREVIOUS_MONTH", label: "Bulan sebelumnya" },
  { value: "THIS_YEAR", label: "Tahun berjalan" },
  { value: "CUSTOM", label: "Rentang tanggal khusus" },
];

const JARING_STATUS_OPTIONS = [
  { value: "ALL", label: "Semua status" },
  { value: "ACTIVE_VERIFIED", label: "Aktif Terverifikasi" },
  { value: "VERIFIED_INACTIVE", label: "Terverifikasi tetapi Nonaktif" },
  { value: "PENDING_APPROVAL", label: "Menunggu Persetujuan" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "UNVERIFIED", label: "Belum Terverifikasi" },
  { value: "OTHER", label: "Status Lainnya" },
  { value: "PRODUCTIVE", label: "Produktif" },
  { value: "NOT_REPORTING", label: "Belum Mengirim Laporan" },
];

const REPORT_STATUS_OPTIONS = [
  { value: "ALL", label: "Semua Laporan Jaring" },
  { value: "VALID", label: "Valid" },
  { value: "IN_PROGRESS", label: "Dalam proses" },
  { value: "READY_FOR_BAKET", label: "Siap Dibuat Baket" },
  { value: "BAKET_CREATED", label: "Menjadi Baket" },
  { value: "NOT_BAKET", label: "Belum menjadi Baket" },
  { value: "FAILED", label: "Gagal" },
  { value: "OTHER", label: "Status lainnya" },
];

const BAKET_SOURCE_OPTIONS = [
  { value: "ALL", label: "Semua Baket" },
  { value: "FROM_REPORT", label: "Berasal dari Laporan Jaring" },
  { value: "MANUAL", label: "Dibuat manual" },
  { value: "HAS_SOURCE", label: "Memiliki relasi sumber" },
  { value: "NO_SOURCE", label: "Tidak memiliki relasi sumber" },
];

const ANOMALY_OPTIONS = [
  { value: "ALL", label: "Semua anomali" },
  { value: "PENDING_REPORTING", label: "Menunggu persetujuan melapor" },
  { value: "REJECTED_REPORTING", label: "Ditolak melapor" },
  { value: "UNVERIFIED_REPORTING", label: "Belum terverifikasi melapor" },
  { value: "INACTIVE_REPORTING", label: "Nonaktif melapor" },
  { value: "SENDER_MISMATCH", label: "Nomor pengirim tidak sesuai" },
  { value: "DUPLICATE_REPORT", label: "Duplikasi laporan" },
  { value: "JARING_WITHOUT_AREA", label: "Jaring tanpa wilayah" },
  { value: "UNMAPPED_STATUS", label: "Status tidak terpetakan" },
  { value: "ACTIVE_VERIFIED_FAILED", label: "Aktif Terverifikasi gagal melapor" },
  { value: "BAKET_WITHOUT_SOURCE", label: "Baket tanpa sumber" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "WIB (Jakarta)" },
  { value: "Asia/Makassar", label: "WITA (Makassar)" },
  { value: "Asia/Jayapura", label: "WIT (Jayapura)" },
];

const KENDALA_OPTIONS = [
  { value: "ALL", label: "Semua kendala" },
  { value: "DISCONNECTED", label: "Terputus" },
  { value: "ERROR", label: "Gangguan aplikasi/error" },
  { value: "INACTIVE", label: "WhatsApp Center tidak aktif" },
  { value: "SUSPEND", label: "Suspend" },
  { value: "UNKNOWN", label: "Status tidak diketahui" },
];

const DEFAULT_FILTERS: KpiFilters = {
  period: "LAST_30_DAYS",
  from: "",
  to: "",
  timezone: "Asia/Jakarta",
  areaId: "",
  childLevel: "",
  jaringStatus: "ALL",
  reportStatus: "ALL",
  baketSource: "ALL",
  kendalaType: "ALL",
  anomalyType: "ALL",
  search: "",
  sortBy: "productivity",
  sortOrder: "desc",
  page: 1,
};

const EXPORT_EXTENSIONS: Record<"pdf" | "word" | "excel" | "markdown", string> = {
  pdf: "pdf",
  word: "docx",
  excel: "xlsx",
  markdown: "md",
};

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

function useKpiData<T>(path: string, filters: KpiFilters, extraQuery?: QueryParams) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    setState((previous) => ({ ...previous, loading: true, error: null }));
    const timer = setTimeout(async () => {
      try {
        const query = { ...buildQuery(filters), ...(extraQuery ?? {}) };
        const data = await apiBrowserFetch<T>(path, {
          query,
          init: { signal: controller.signal },
        });
        setState({ data, loading: false, error: null });
      } catch {
        if (controller.signal.aborted) return;
        setState({ data: null, loading: false, error: "Data gagal dimuat. Silakan coba lagi." });
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [path, filters, extraQuery]);

  return state;
}

function buildQuery(filters: KpiFilters): QueryParams {
  const query: QueryParams = { period: filters.period, timezone: filters.timezone };
  if (filters.period === "CUSTOM") {
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
  }
  if (filters.areaId) query.areaId = filters.areaId;
  if (filters.childLevel) query.childLevel = filters.childLevel;
  if (filters.jaringStatus && filters.jaringStatus !== "ALL") query.jaringStatus = filters.jaringStatus;
  if (filters.reportStatus && filters.reportStatus !== "ALL") query.reportStatus = filters.reportStatus;
  if (filters.baketSource && filters.baketSource !== "ALL") query.baketSource = filters.baketSource;
  if (filters.kendalaType && filters.kendalaType !== "ALL") query.kendalaType = filters.kendalaType;
  if (filters.anomalyType && filters.anomalyType !== "ALL") query.anomalyType = filters.anomalyType;
  if (filters.search) query.search = filters.search;
  if (filters.sortBy) query.sortBy = filters.sortBy;
  if (filters.sortOrder) query.sortOrder = filters.sortOrder;
  query.page = String(filters.page);
  query.limit = "50";
  return query;
}

function getBackendBaseUrl() {
  return (process.env.NEXT_PUBLIC_BROWSER_API_BASE_URL ?? "").replace(/\/$/, "");
}

export function KpiClient({
  mode,
  initialFrom,
  initialTo,
}: {
  mode: "regional" | "national";
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<KpiFilters>(() => ({
    ...DEFAULT_FILTERS,
    from: initialFrom ?? "",
    to: initialTo ?? "",
    areaId: searchParams.get("areaId") ?? "",
    childLevel: searchParams.get("childLevel") ?? "",
    period: searchParams.get("period") ?? DEFAULT_FILTERS.period,
  }));
  const [activeTab, setActiveTab] = useState("ringkasan");
  const [exporting, setExporting] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<KpiFilterOptions | null>(null);
  const [detailDimension, setDetailDimension] = useState("wilayah");
  const [detailMetric, setDetailMetric] = useState("totalReports");

  useEffect(() => {
    let cancelled = false;
    apiBrowserFetch<KpiFilterOptions>("/dashboard/kpi/filters")
      .then((data) => {
        if (!cancelled) setFilterOptions(data);
      })
      .catch(() => {
        // Filter wilayah bersifat opsional; abaikan kegagalan pemuatan.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useKpiData<KpiSummary>("/dashboard/kpi/summary", filters);
  const productivity = useKpiData<KpiProductivity>("/dashboard/kpi/productivity", filters);
  const region = useKpiData<KpiRegionComparison>("/dashboard/kpi/region-comparison", filters);
  const reports = useKpiData<KpiReportsBaket>("/dashboard/kpi/reports-baket", filters);
  const whatsapp = useKpiData<KpiWhatsappCenter>("/dashboard/kpi/whatsapp-center", filters);
  const anomalies = useKpiData<KpiAnomalies>("/dashboard/kpi/anomalies", filters);
  const trends = useKpiData<KpiTrends>("/dashboard/kpi/trends", filters);
  const leaderboard = useKpiData<KpiLeaderboardData>("/dashboard/kpi/leaderboard", filters);
  const detailQuery = useMemo(
    () => ({ dimension: detailDimension, metric: detailMetric }),
    [detailDimension, detailMetric],
  );
  const detail = useKpiData<KpiDetail>("/dashboard/kpi/detail", filters, detailQuery);

  const setFilter = useCallback((patch: Partial<KpiFilters>) => {
    setFilters((previous) => ({ ...previous, ...patch, page: 1 }));
  }, []);

  const syncUrl = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.period !== "LAST_30_DAYS") params.set("period", filters.period);
    if (filters.areaId) params.set("areaId", filters.areaId);
    if (filters.childLevel) params.set("childLevel", filters.childLevel);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const applyFilters = useCallback(() => {
    syncUrl();
  }, [syncUrl]);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.period !== "LAST_30_DAYS") count += 1;
    if (filters.areaId) count += 1;
    if (filters.jaringStatus !== "ALL") count += 1;
    if (filters.reportStatus !== "ALL") count += 1;
    if (filters.baketSource !== "ALL") count += 1;
    if (filters.kendalaType !== "ALL") count += 1;
    if (filters.anomalyType !== "ALL") count += 1;
    if (filters.search) count += 1;
    if (filters.timezone !== "Asia/Jakarta") count += 1;
    return count;
  }, [filters]);

  const periodOptions = filterOptions?.periods ?? PERIOD_OPTIONS;
  const jaringStatusOptions = filterOptions?.jaringStatuses ?? JARING_STATUS_OPTIONS;
  const reportStatusOptions = filterOptions?.reportStatuses ?? REPORT_STATUS_OPTIONS;
  const baketSourceOptions = filterOptions?.baketSources ?? BAKET_SOURCE_OPTIONS;
  const anomalyOptions = filterOptions?.anomalyTypes ?? ANOMALY_OPTIONS;

  const downloadExport = useCallback(
    async (format: "pdf" | "word" | "excel" | "markdown") => {
      setExporting(format);
      try {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(buildQuery(filters))) {
          if (Array.isArray(value)) continue;
          params.set(key, String(value));
        }
        params.set("format", format);
        const response = await fetch(`${getBackendBaseUrl()}/api/v1/dashboard/kpi/export?${params.toString()}`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Ekspor gagal.");
        const blob = await response.blob();
        const disposition = response.headers.get("content-disposition") ?? "";
        const filename = disposition.match(/filename="?([^";]+)"?/)?.[1] ?? `laporan-kpi.${EXPORT_EXTENSIONS[format]}`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } finally {
        setExporting(null);
      }
    },
    [filters],
  );

  const scopeLabel = summary.data?.scope.label ?? (mode === "national" ? "Nasional" : "Komando Regional");
  const periodLabel = summary.data
    ? `${formatDate(summary.data.period.from)} sampai ${formatDate(summary.data.period.to)}`
    : "Periode";

  return (
    <main className="mx-auto w-full max-w-[var(--dc-content-max,1792px)] space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-3 border-[var(--dc-divider)] border-b pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-[var(--dc-text-primary)]">Kinerja &amp; Evaluasi Jaring</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--dc-text-secondary)]">
            Pusat evaluasi kinerja Jaring nasional: status dan keaktifan, produktivitas, pelaporan, pengolahan Laporan
            Jaring menjadi Baket, perbandingan wilayah, kendala WhatsApp Center, dan anomali pelaporan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider">
            Wilayah {scopeLabel}
          </Badge>
          <Badge variant="secondary" className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider">
            Periode: {periodLabel}
          </Badge>
        </div>
      </header>

      <section
        aria-label="Filter evaluasi"
        className="rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-4"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <RegionFilter
              tree={filterOptions?.areaTree ?? null}
              areaId={filters.areaId}
              onChange={(areaId) => setFilter({ areaId, childLevel: "" })}
            />
            <FilterSelect
              label="Periode"
              value={filters.period}
              options={periodOptions}
              onChange={(value) => setFilter({ period: value })}
            />
            <FilterSelect
              label="Zona waktu"
              value={filters.timezone}
              options={TIMEZONE_OPTIONS}
              onChange={(value) => setFilter({ timezone: value })}
            />
            {filters.period === "CUSTOM" ? (
              <>
                <div className="space-y-1">
                  <label className="font-medium text-[10px] text-[var(--dc-text-muted)] uppercase" htmlFor="kpi-from">
                    Dari
                  </label>
                  <Input
                    id="kpi-from"
                    type="date"
                    value={filters.from}
                    onChange={(event) => setFilter({ from: event.target.value })}
                    className={cn(DC_CONTROLS.input, "text-xs")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-[10px] text-[var(--dc-text-muted)] uppercase" htmlFor="kpi-to">
                    Sampai
                  </label>
                  <Input
                    id="kpi-to"
                    type="date"
                    value={filters.to}
                    onChange={(event) => setFilter({ to: event.target.value })}
                    className={cn(DC_CONTROLS.input, "text-xs")}
                  />
                </div>
              </>
            ) : null}
            <FilterSelect
              label="Status Jaring"
              value={filters.jaringStatus}
              options={jaringStatusOptions}
              onChange={(value) => setFilter({ jaringStatus: value })}
            />
            <FilterSelect
              label="Laporan"
              value={filters.reportStatus}
              options={reportStatusOptions}
              onChange={(value) => setFilter({ reportStatus: value })}
            />
            <FilterSelect
              label="Baket"
              value={filters.baketSource}
              options={baketSourceOptions}
              onChange={(value) => setFilter({ baketSource: value })}
            />
            <FilterSelect
              label="Anomali"
              value={filters.anomalyType}
              options={anomalyOptions}
              onChange={(value) => setFilter({ anomalyType: value })}
            />
            <FilterSelect
              label="Kendala"
              value={filters.kendalaType}
              options={KENDALA_OPTIONS}
              onChange={(value) => setFilter({ kendalaType: value })}
            />
            <div className="space-y-1">
              <label className="font-medium text-[10px] text-[var(--dc-text-muted)] uppercase" htmlFor="kpi-search">
                Pencarian wilayah
              </label>
              <Input
                id="kpi-search"
                value={filters.search}
                onChange={(event) => setFilter({ search: event.target.value })}
                placeholder="Nama wilayah…"
                className={cn(DC_CONTROLS.input, "w-44 text-xs")}
              />
            </div>
            <Button type="button" onClick={applyFilters} className="h-9">
              Terapkan{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters} className="h-9">
              <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
              Reset
            </Button>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[var(--dc-text-muted)]">Ekspor laporan:</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadExport("pdf")}
          disabled={exporting !== null}
        >
          <Download className="mr-1.5 size-3.5" aria-hidden />
          {exporting === "pdf" ? "Menyiapkan…" : "PDF"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadExport("word")}
          disabled={exporting !== null}
        >
          {exporting === "word" ? "Menyiapkan…" : "Word"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadExport("excel")}
          disabled={exporting !== null}
        >
          {exporting === "excel" ? "Menyiapkan…" : "Excel"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadExport("markdown")}
          disabled={exporting !== null}
        >
          {exporting === "markdown" ? "Menyiapkan…" : "Markdown"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full max-w-full overflow-x-auto">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="produktivitas">Produktivitas Jaring</TabsTrigger>
          <TabsTrigger value="wilayah">Perbandingan Wilayah</TabsTrigger>
          <TabsTrigger value="peringkat">Peringkat</TabsTrigger>
          <TabsTrigger value="laporan-baket">Laporan Jaring &amp; Baket</TabsTrigger>
          <TabsTrigger value="whatsapp">Kendala WhatsApp Center</TabsTrigger>
          <TabsTrigger value="anomali">Anomali</TabsTrigger>
          <TabsTrigger value="tren">Tren</TabsTrigger>
          <TabsTrigger value="detail">Detail Data</TabsTrigger>
        </TabsList>

        <div className="mt-5">
          <TabsContent value="ringkasan">
            <SummaryTab state={summary} filters={filters} />
          </TabsContent>
          <TabsContent value="produktivitas">
            <ProductivityTab state={productivity} />
          </TabsContent>
          <TabsContent value="wilayah">
            <RegionTab
              state={region}
              hasAreaId={Boolean(filters.areaId)}
              onSelectRegion={(areaId) => setFilter({ areaId, childLevel: "" })}
              onBack={() => setFilter({ areaId: "", childLevel: "" })}
            />
          </TabsContent>
          <TabsContent value="peringkat">
            <LeaderboardTab state={leaderboard} />
          </TabsContent>
          <TabsContent value="laporan-baket">
            <ReportsTab state={reports} />
          </TabsContent>
          <TabsContent value="whatsapp">
            <WhatsappTab state={whatsapp} />
          </TabsContent>
          <TabsContent value="anomali">
            <AnomaliesTab state={anomalies} />
          </TabsContent>
          <TabsContent value="tren">
            <TrendsTab state={trends} />
          </TabsContent>
          <TabsContent value="detail">
            <DetailTab
              state={detail}
              dimension={detailDimension}
              metric={detailMetric}
              onDimensionChange={setDetailDimension}
              onMetricChange={setDetailMetric}
            />
          </TabsContent>
        </div>
      </Tabs>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase">
        {label}
      </label>
      <NativeSelect id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {option.label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  );
}

function levelLabel(level: string | undefined): string {
  if (level === "PROVINCE") return "Provinsi/BINDA";
  if (level === "REGENCY" || level === "CITY") return "Kabupaten/Kota";
  if (level === "DISTRICT") return "Kecamatan";
  return "Wilayah";
}

function RegionFilter({
  tree,
  areaId,
  onChange,
}: {
  tree: KpiAreaTreeNode | null;
  areaId: string;
  onChange: (areaId: string) => void;
}) {
  const [sel1, setSel1] = useState("");
  const [sel2, setSel2] = useState("");
  const [sel3, setSel3] = useState("");
  const baseId = useId();

  useEffect(() => {
    if (!areaId) {
      setSel1("");
      setSel2("");
      setSel3("");
    }
  }, [areaId]);

  const level1 = tree?.children ?? [];
  const level1Node = level1.find((node) => node.id === sel1);
  const level2 = level1Node?.children ?? [];
  const level2Node = level2.find((node) => node.id === sel2);
  const level3 = level2Node?.children ?? [];
  const label1 = levelLabel(level1[0]?.level);
  const label2 = levelLabel(level2[0]?.level);
  const label3 = levelLabel(level3[0]?.level);

  if (level1.length === 0) return null;

  return (
    <>
      <div className="space-y-1">
        <label
          htmlFor={`${baseId}-level1`}
          className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase"
        >
          {label1}
        </label>
        <NativeSelect
          id={`${baseId}-level1`}
          value={sel1}
          onChange={(event) => {
            const value = event.target.value;
            setSel1(value);
            setSel2("");
            setSel3("");
            onChange(value);
          }}
        >
          <NativeSelectOption value="">Nasional</NativeSelectOption>
          {level1.map((node) => (
            <NativeSelectOption key={node.id} value={node.id}>
              {node.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {level2.length > 0 ? (
        <div className="space-y-1">
          <label
            htmlFor={`${baseId}-level2`}
            className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase"
          >
            {label2}
          </label>
          <NativeSelect
            id={`${baseId}-level2`}
            value={sel2}
            onChange={(event) => {
              const value = event.target.value;
              setSel2(value);
              setSel3("");
              onChange(value);
            }}
          >
            <NativeSelectOption value="">Semua</NativeSelectOption>
            {level2.map((node) => (
              <NativeSelectOption key={node.id} value={node.id}>
                {node.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
      {level3.length > 0 ? (
        <div className="space-y-1">
          <label
            htmlFor={`${baseId}-level3`}
            className="block font-medium text-[10px] text-[var(--dc-text-muted)] uppercase"
          >
            {label3}
          </label>
          <NativeSelect
            id={`${baseId}-level3`}
            value={sel3}
            onChange={(event) => {
              const value = event.target.value;
              setSel3(value);
              onChange(value);
            }}
          >
            <NativeSelectOption value="">Semua</NativeSelectOption>
            {level3.map((node) => (
              <NativeSelectOption key={node.id} value={node.id}>
                {node.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      ) : null}
    </>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
