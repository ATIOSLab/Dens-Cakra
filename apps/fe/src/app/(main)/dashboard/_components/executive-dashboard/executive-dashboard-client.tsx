"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AlertCircle, BookOpen, LoaderCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApiEnvelope } from "@/lib/api/types";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import { DashboardHeaderFilter } from "./dashboard-header-filter";
import { ExecutiveCommandPulse } from "./executive-command-pulse";
import { CategoryPanel, CompositionPanel, ReportTrendPanel, WorkflowPanel } from "./executive-dashboard-charts";
import { dashboardStatusLabel, formatDashboardNumber } from "./executive-dashboard-format";
import {
  FollowUpAndQualityPanel,
  LeadershipAttentionPanel,
  NetworkSummaryPanel,
  PerformanceRankingPanel,
  PriorityReportPanel,
  RecentActivityPanel,
} from "./executive-dashboard-operations";
import type {
  DashboardQueryState,
  ExecutiveDashboardData,
  ExecutiveDashboardFilters,
} from "./executive-dashboard-types";
import { ExecutiveSummaryCards } from "./executive-summary-cards";

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
  completeness: "",
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
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
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
    return userProfileId ? `/dashboard/executive/personil/${userProfileId}` : "/dashboard/executive/personil";
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
  initialFilters,
  initialError,
  role,
}: {
  initialData: ExecutiveDashboardData | null;
  initialFilters: ExecutiveDashboardFilters | null;
  initialError: string | null;
  role: SystemRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState<DashboardQueryState>(() => {
    const next = { ...DEFAULT_QUERY };
    for (const key of Object.keys(next) as Array<keyof DashboardQueryState>) {
      next[key] = searchParams.get(key) ?? next[key];
    }
    return next;
  });
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState(initialFilters);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const initialRequest = useRef(true);

  const activeFilterCount = useMemo(
    () =>
      Object.entries(query).filter(([key, value]) => {
        if (!value || key === "period") return false;
        if ((key === "from" || key === "to") && query.period !== "CUSTOM") return false;
        return true;
      }).length,
    [query],
  );

  const loadData = useCallback(
    async (signal?: AbortSignal, includeFilters = false) => {
      if (query.period === "CUSTOM" && (!query.from || !query.to)) return;
      setLoading(true);
      setError(null);
      try {
        const params = queryParams(query);
        const requests: [Promise<ExecutiveDashboardData>, Promise<ExecutiveDashboardFilters> | null] = [
          fetch(`/api/v1/dashboard/executive?${params}`, {
            cache: "no-store",
            credentials: "include",
            signal,
          }).then(readApi<ExecutiveDashboardData>),
          includeFilters
            ? fetch(
                `/api/v1/dashboard/executive/filters${query.areaId ? `?areaId=${encodeURIComponent(query.areaId)}` : ""}`,
                {
                  cache: "no-store",
                  credentials: "include",
                  signal,
                },
              ).then(readApi<ExecutiveDashboardFilters>)
            : null,
        ];
        const [nextData, nextFilters] = await Promise.all([requests[0], requests[1] ?? Promise.resolve(null)]);
        setData(nextData);
        if (nextFilters) setFilters(nextFilters);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(cause instanceof Error ? cause.message : "Gagal memuat dashboard.");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  useEffect(() => {
    const params = queryParams(query);
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => void loadData(controller.signal, !initialRequest.current || Boolean(query.areaId)),
      initialRequest.current ? 0 : 250,
    );
    initialRequest.current = false;
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadData, pathname, query, router]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadData();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, loadData]);

  const changeQuery = useCallback((key: keyof DashboardQueryState, value: string) => {
    setQuery((current) => ({
      ...current,
      [key]: value,
      ...(key === "period" && value !== "CUSTOM" ? { from: "", to: "" } : {}),
      ...(key === "areaId" ? { jaringId: "", fieldOfficerAssignmentId: "" } : {}),
    }));
  }, []);

  const buildHref = useCallback(
    (href: string) => {
      const url = new URL(href, "http://dashboard.local");
      const isReportRoute = url.pathname.startsWith("/dashboard/laporan-jaring");
      const isProductRoute = url.pathname.startsWith("/dashboard/produk-intelijen");
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
      let applicableKeys: Array<keyof DashboardQueryState> = ["areaId"];
      if (isReportRoute) {
        applicableKeys = [
          "areaId",
          "categoryId",
          "jaringId",
          "fieldOfficerAssignmentId",
          "urgency",
          "reportStatus",
          "completeness",
          "verificationStatus",
          "workflowStatus",
          "hasAttachment",
          "coordinateSource",
          "locationSuitability",
        ];
      } else if (isProductRoute) {
        applicableKeys = ["productTypeId"];
      }
      for (const key of applicableKeys) {
        if (query[key] && !url.searchParams.has(key)) url.searchParams.set(key, query[key]);
      }
      return `${url.pathname}${url.search}`;
    },
    [data?.period.from, data?.period.to, query, role],
  );

  if (!data) {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertCircle />
          <AlertTitle>Dashboard eksekutif tidak tersedia</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{error ?? "Layanan belum mengembalikan data."}</p>
            <Button variant="outline" onClick={() => void loadData(undefined, true)} disabled={loading}>
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
        query={query}
        loading={loading}
        activeFilterCount={activeFilterCount}
        onChange={changeQuery}
        onReset={() => setQuery(DEFAULT_QUERY)}
        onRefresh={() => void loadData(undefined, true)}
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

      <ExecutiveCommandPulse data={data} />
      <div id="executive-summary" className="scroll-mt-24">
        <ExecutiveSummaryCards cards={data.overview.cards} buildHref={buildHref} />
      </div>
      <div id="leadership-attention" className="scroll-mt-24">
        <LeadershipAttentionPanel items={data.overview.attention} buildHref={buildHref} />
      </div>

      <section aria-labelledby="analytics-heading">
        <div className="mb-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Analisis situasi
          </p>
          <h2 id="analytics-heading" className="mt-1 text-lg font-semibold">
            Tren dan Komposisi Laporan
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <ReportTrendPanel trend={data.analytics.trend} />
          <WorkflowPanel
            items={data.analytics.workflow}
            selectedKey={query.workflowStatus}
            onSelect={(value) => changeQuery("workflowStatus", query.workflowStatus === value ? "" : value)}
          />
          <CategoryPanel
            items={data.analytics.categories}
            selectedKey={query.categoryId}
            onSelect={(value) => changeQuery("categoryId", query.categoryId === value ? "" : value)}
          />
          <Card className="border-[var(--dc-border-subtle)]">
            <CardHeader>
              <CardTitle>Perkembangan Produk Informasi</CardTitle>
              <CardDescription>Status produk yang tersedia dalam scope pengguna.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="font-mono text-4xl tabular-nums">{formatDashboardNumber(data.analytics.products.total)}</p>
              {data.analytics.products.byStatus.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada Produk Informasi pada periode aktif.</p>
              ) : (
                data.analytics.products.byStatus.map((item) => (
                  <div key={item.key} className="flex justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">{dashboardStatusLabel(item.label)}</span>
                    <strong className="font-mono">{formatDashboardNumber(item.value)}</strong>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <CompositionPanel analytics={data.analytics} query={query} onChange={changeQuery} />
      <div id="network-summary" className="scroll-mt-24">
        <NetworkSummaryPanel summary={data.operations.networkSummary} buildHref={buildHref} />
      </div>

      <section aria-labelledby="operations-heading">
        <div className="mb-3">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-[var(--dc-primary)]">
            Operasi pelaporan
          </p>
          <h2 id="operations-heading" className="mt-1 text-lg font-semibold">
            Wilayah, Jaring, dan Petugas Wilayah
          </h2>
        </div>
        <div className="grid gap-4">
          <PerformanceRankingPanel operations={data.operations} buildHref={buildHref} />
          <div id="priority-reports" className="scroll-mt-24">
            <PriorityReportPanel operations={data.operations} buildHref={buildHref} />
          </div>
        </div>
      </section>

      <div id="follow-up-quality" className="scroll-mt-24">
        <FollowUpAndQualityPanel data={data} buildHref={buildHref} />
      </div>
      <RecentActivityPanel items={data.operations.recentActivity} buildHref={buildHref} />

      <details className="rounded-xl border border-[var(--dc-border-subtle)] bg-card p-4">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <BookOpen className="size-4 text-[var(--dc-primary)]" />
          Definisi indikator dan sumber data
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {data.metrics.map((metric) => (
            <div key={metric.key} className="rounded-lg border border-[var(--dc-border-subtle)] p-3">
              <p className="text-sm font-medium">{metric.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
              <p className="mt-2 font-mono text-[0.65rem] text-muted-foreground">
                {metric.entity} · {metric.dateField}
              </p>
            </div>
          ))}
        </div>
      </details>

      <p className="text-center text-xs text-muted-foreground">
        Peran aktif: {role} · Pemantauan otomatis berjalan setiap 60 detik saat tab aktif.
      </p>
    </main>
  );
}
