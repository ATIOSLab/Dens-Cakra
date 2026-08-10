"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AlertCircle, LoaderCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApiEnvelope } from "@/lib/api/types";
import type { SystemRole } from "@/navigation/sidebar/system-roles";
import { getSystemRoleLabel } from "@/navigation/sidebar/system-roles";

import { DashboardHeaderFilter } from "./dashboard-header-filter";
import { ExecutiveDashboardAnalysisOverview } from "./executive-dashboard-analysis-overview";
import { CategoryPanel, ReportTrendPanel } from "./executive-dashboard-charts";
import {
  LeadershipAttentionPanel,
  PerformanceRankingPanel,
  PriorityReportPanel,
} from "./executive-dashboard-operations";
import type { DashboardQueryState, ExecutiveDashboardData, ExecutiveDashboardFilters } from "./executive-dashboard-types";

const DEFAULT_QUERY: DashboardQueryState = {
  period: "LAST_30_DAYS",
  from: "",
  to: "",
  areaId: "",
  categoryId: "",
  productTypeId: "",
  jaringId: "",
  fieldOfficerAssignmentId: "",
  urgency: "",
  reportStatus: "",
  verificationStatus: "",
  workflowStatus: "",
  validationStatus: "",
  hasAttachment: "",
  coordinateSource: "",
  locationSuitability: "",
  source: "",
};

function queryParams(query: DashboardQueryState) {
  const params = new URLSearchParams();
  if (query.period) params.set("period", query.period);
  if (query.period === "CUSTOM") {
    if (query.from) params.set("from", query.from);
    if (query.to) params.set("to", query.to);
  }
  if (query.areaId) params.set("areaId", query.areaId);
  return params;
}

async function readApi<T>(response: Response) {
  const body = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || body.success === false) {
    throw new Error(body.success === false ? (body.error?.message ?? "Permintaan gagal.") : "Permintaan gagal.");
  }
  return body.data;
}

function productListRoute(role: SystemRole) {
  if (role === "executive") return "/dashboard/executive/produk-intelijen";
  if (role === "operational_intelligence_manager") return "/dashboard/oim/produk-intelijen/daftar-produk";
  if (role === "regional_commander") return "/dashboard/regional-commander/laporan-produk-intelijen";
  return "/dashboard/baket";
}

function productDetailRoute(role: SystemRole, productId: string | undefined) {
  if (!productId || role === "field_coordinator") return productListRoute(role);
  return `${productListRoute(role)}/${productId}`;
}

function taskDetailRoute(role: SystemRole, taskId: string | undefined) {
  if (role === "regional_commander") return `/dashboard/regional-commander/monitoring-tugas/${taskId}`;
  if (role === "operational_intelligence_manager") return `/dashboard/oim/direktif-tugas/${taskId}`;
  if (role === "field_coordinator") return `/dashboard/field-coordinator/tugas-operasional/${taskId}`;
  return "/dashboard/executive/pusat-komando/direktif";
}

function directiveDetailRoute(role: SystemRole, directiveId: string | undefined) {
  if (role === "executive") return `/dashboard/executive/pusat-komando/direktif/${directiveId}`;
  if (role === "regional_commander") return "/dashboard/regional-commander/direktif-penjabaran-uuk-str";
  if (role === "operational_intelligence_manager") return "/dashboard/oim/direktif-tugas";
  return "/dashboard/field-coordinator/tugas-operasional";
}

function fieldOfficerDetailRoute(role: SystemRole, assignmentId: string | undefined, userProfileId: string | null) {
  if (role === "executive") {
    return userProfileId ? `/dashboard/personel-lapangan/${userProfileId}` : "/dashboard/personel-lapangan";
  }
  if (role === "operational_intelligence_manager") {
    return assignmentId
      ? `/dashboard/oim/monitoring-lapangan/personel/${assignmentId}`
      : "/dashboard/oim/monitoring-lapangan";
  }
  return assignmentId ? `/dashboard/personel-lapangan/${assignmentId}` : "/dashboard/personel-lapangan";
}

export function ExecutiveDashboardClient({
  initialData,
  initialError,
  role,
}: {
  initialData: ExecutiveDashboardData | null;
  initialError: string | null;
  role: SystemRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<DashboardQueryState>(() => {
    const next = { ...DEFAULT_QUERY };
    next.period = searchParams.get("period") ?? next.period;
    next.areaId = searchParams.get("areaId") ?? "";
    if (next.period === "CUSTOM") {
      next.from = searchParams.get("from") ?? "";
      next.to = searchParams.get("to") ?? "";
    }
    return next;
  });
  const [data, setData] = useState(initialData);
  const [error, setError] = useState(initialError);
  const [filters, setFilters] = useState<ExecutiveDashboardFilters | null>(null);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const initialRequest = useRef(true);

  const loadData = useCallback(
    async (signal?: AbortSignal) => {
      if (query.period === "CUSTOM" && (!query.from || !query.to)) return;
      setLoading(true);
      setError(null);
      try {
        const params = queryParams(query);
        const nextData = await fetch(`/api/v1/dashboard/executive?${params}`, {
          cache: "no-store",
          credentials: "include",
          signal,
        }).then(readApi<ExecutiveDashboardData>);
        setData(nextData);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const loadFilters = useCallback(async (signal?: AbortSignal) => {
    setFiltersLoading(true);
    try {
      const nextFilters = await fetch("/api/v1/dashboard/executive/filters", {
        cache: "no-store",
        credentials: "include",
        signal,
      }).then(readApi<ExecutiveDashboardFilters>);
      setFilters(nextFilters);
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
    } finally {
      setFiltersLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = queryParams(query);
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });

    const controller = new AbortController();
    const timeout = window.setTimeout(() => void loadData(controller.signal), initialRequest.current ? 0 : 250);
    initialRequest.current = false;
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadData, pathname, query, router]);

  useEffect(() => {
    const controller = new AbortController();
    void loadFilters(controller.signal);
    return () => controller.abort();
  }, [loadFilters]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, loadData]);

  const changeQuery = useCallback((key: keyof DashboardQueryState, value: string) => {
    setQuery((current) => ({
      ...DEFAULT_QUERY,
      period: key === "period" ? value : current.period,
      from: key === "from" ? value : current.from,
      to: key === "to" ? value : current.to,
      areaId: key === "areaId" ? value : current.areaId,
      ...(key === "period" && value !== "CUSTOM" ? { from: "", to: "" } : {}),
    }));
  }, []);

  const buildHref = useCallback(
    (href: string) => {
      const url = new URL(href, "http://dashboard.local");
      const isReportRoute = url.pathname.startsWith("/dashboard/laporan-jaring");
      const isProductRoute =
        url.pathname.startsWith("/dashboard/produk-intelijen") || url.pathname.startsWith("/dashboard/baket");
      if (url.pathname === "/dashboard/produk-intelijen") {
        url.pathname = productListRoute(role);
      }
      if (url.pathname.startsWith("/dashboard/produk-intelijen/")) {
        url.pathname = productDetailRoute(role, url.pathname.split("/").at(-1));
      }
      if (url.pathname.startsWith("/dashboard/tasks/")) {
        const taskId = url.pathname.split("/").at(-1);
        url.pathname = taskDetailRoute(role, taskId);
      }
      if (url.pathname.startsWith("/dashboard/directives/")) {
        const directiveId = url.pathname.split("/").at(-1);
        url.pathname = directiveDetailRoute(role, directiveId);
      }
      if (url.pathname.startsWith("/dashboard/field-officers/")) {
        const assignmentId = url.pathname.split("/").at(-1);
        url.pathname = fieldOfficerDetailRoute(role, assignmentId, url.searchParams.get("userProfileId"));
        url.searchParams.delete("userProfileId");
      }
      if ((isReportRoute || isProductRoute) && !url.searchParams.has("from") && data?.period.from) {
        url.searchParams.set("from", data.period.from);
      }
      if ((isReportRoute || isProductRoute) && !url.searchParams.has("to") && data?.period.to) {
        url.searchParams.set("to", data.period.to);
      }
      if ((isReportRoute || isProductRoute) && query.areaId && !url.searchParams.has("areaId")) {
        url.searchParams.set("areaId", query.areaId);
      }
      return `${url.pathname}${url.search}`;
    },
    [data?.period.from, data?.period.to, query.areaId, role],
  );

  if (!data) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertCircle />
          <AlertTitle>Dashboard tidak tersedia</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error ?? "Layanan belum mengembalikan data."}</p>
            <Button variant="outline" onClick={() => void loadData()} disabled={loading}>
              Coba Lagi
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <main className="relative space-y-6 pb-8">
      {loading && (
        <div className="sticky top-2 z-30 flex justify-center" role="status" aria-live="polite">
          <Badge className="min-h-9 gap-2 px-3 shadow-lg">
            <LoaderCircle className="size-4 animate-spin" />
            Memperbarui seluruh komponen
          </Badge>
        </div>
      )}
      <DashboardHeaderFilter
        data={data}
        filters={filters}
        filtersLoading={filtersLoading}
        query={query}
        loading={loading}
        onChange={changeQuery}
        onReset={() => setQuery(DEFAULT_QUERY)}
        onRefresh={() => void loadData()}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((current) => !current)}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertTitle>Data terbaru gagal dimuat</AlertTitle>
          <AlertDescription>{error} Data terakhir yang berhasil dimuat tetap ditampilkan.</AlertDescription>
        </Alert>
      )}

      <div id="executive-summary" className="scroll-mt-24">
        <ExecutiveDashboardAnalysisOverview data={data} role={role} buildHref={buildHref} />
      </div>

      <section aria-labelledby="analytics-heading">
        <div className="mb-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Analisis utama
          </p>
          <h2 id="analytics-heading" className="mt-1 text-lg font-semibold">
            Tren Laporan dan Isu Dominan
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <ReportTrendPanel trend={data.analytics.trend} />
          <CategoryPanel items={data.analytics.categories} />
        </div>
      </section>

      <section aria-labelledby="priority-heading" className="grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="xl:col-span-2">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Prioritas pimpinan
          </p>
          <h2 id="priority-heading" className="mt-1 text-lg font-semibold">
            Laporan yang Perlu Didahulukan
          </h2>
        </div>
        <div id="leadership-attention" className="scroll-mt-24">
          <LeadershipAttentionPanel items={data.overview.attention} buildHref={buildHref} />
        </div>
        <div id="priority-reports" className="scroll-mt-24">
          <PriorityReportPanel operations={data.operations} buildHref={buildHref} />
        </div>
      </section>

      <section aria-labelledby="operations-heading">
        <div className="mb-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Peringkat operasional
          </p>
          <h2 id="operations-heading" className="mt-1 text-lg font-semibold">
            Wilayah, Jaring, dan Petugas Wilayah
          </h2>
        </div>
        <div id="operations-ranking" className="scroll-mt-24">
          <PerformanceRankingPanel operations={data.operations} buildHref={buildHref} />
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Peran aktif: {getSystemRoleLabel(role)} - Pemantauan otomatis berjalan setiap 60 detik saat tab aktif.
      </p>
    </main>
  );
}
