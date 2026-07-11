import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ApiClientError } from "@/lib/api/errors";
import { normalizeSearchParams } from "@/lib/api/query";
import { apiServerFetch } from "@/lib/api/server-client";
import type { ApiMeta, QueryParams } from "@/lib/api/types";
import { cn } from "@/lib/utils";

import { countRecords, type EndpointResult, formatValue, getItems, pickDisplayFields } from "./data-shape";
import { type DensRouteSpec, getDensRouteSpec } from "./route-registry";

type UniversalDensRoutePageProps = {
  routePattern: string;
  params?: Record<string, string>;
  searchParams?: Record<string, string | string[] | undefined>;
};

async function loadEndpoint(label: string, path: string, query?: QueryParams): Promise<EndpointResult> {
  try {
    const data = await apiServerFetch<unknown>(path, { query });

    return {
      label,
      path,
      ok: true,
      data,
      meta: data && typeof data === "object" && "meta" in data ? (data as { meta?: ApiMeta }).meta : undefined,
    };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return {
        label,
        path,
        ok: false,
        data: null,
        error: {
          status: error.status,
          code: error.code,
          message: error.message,
        },
      };
    }

    return {
      label,
      path,
      ok: false,
      data: null,
      error: {
        code: "CLIENT_ERROR",
        message: error instanceof Error ? error.message : "Unknown frontend API error.",
      },
    };
  }
}

function PageHeader({ spec, degradedCount }: { spec: DensRouteSpec; degradedCount: number }) {
  return (
    <header className="rounded-[var(--dc-radius-md)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] px-5 py-4 shadow-[var(--dc-shadow-card)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="dc-eyebrow">{spec.moduleLabel}</span>
            <Badge variant="outline" className="border-[var(--dc-border)] text-[var(--dc-text-secondary)]">
              {spec.roleLabel}
            </Badge>
            <Badge
              variant={degradedCount > 0 ? "destructive" : "secondary"}
              className={cn(degradedCount === 0 && "bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]")}
            >
              {degradedCount > 0 ? "Degraded" : "Connected"}
            </Badge>
            {spec.readonly ? <Badge variant="outline">Read-only</Badge> : null}
          </div>
          <div>
            <h1 className="text-balance font-semibold text-2xl text-[var(--dc-text-primary)] tracking-tight md:text-3xl">
              {spec.title}
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--dc-text-secondary)]">{spec.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {spec.availableActions.slice(0, 3).map((action, index) => (
            <Button
              key={action}
              variant={index === 0 ? "default" : "outline"}
              size="sm"
              disabled={spec.readonly && index === 0}
            >
              {action}
            </Button>
          ))}
        </div>
      </div>
    </header>
  );
}

function KpiGrid({ results }: { results: EndpointResult[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {results.map((result) => (
        <article key={result.path} className="dc-card min-h-28 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="dc-eyebrow">{result.label}</p>
            <Badge variant={result.ok ? "outline" : "destructive"}>{result.ok ? "OK" : "ERR"}</Badge>
          </div>
          <p className="dc-kpi-value mt-4">{result.ok ? countRecords(result) : (result.error?.status ?? "!")}</p>
          <p className="mt-2 text-xs text-[var(--dc-text-muted)]">{result.path}</p>
        </article>
      ))}
    </section>
  );
}

function EndpointStatus({ results }: { results: EndpointResult[] }) {
  return (
    <section className="dc-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-lg">API status</h2>
          <p className="text-sm text-[var(--dc-text-secondary)]">Endpoint yang dipanggil halaman ini.</p>
        </div>
        <Badge variant="outline">{results.length} endpoint</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        {results.map((result) => (
          <div
            key={result.path}
            className="flex flex-col gap-2 rounded-[var(--dc-radius-sm)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-3 py-2 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{result.label}</p>
              <p className="truncate font-mono text-[11px] text-[var(--dc-text-muted)]">{result.path}</p>
            </div>
            <Badge variant={result.ok ? "outline" : "destructive"}>
              {result.ok ? "success" : (result.error?.code ?? "error")}
            </Badge>
          </div>
        ))}
      </div>
    </section>
  );
}

function DataTable({ result }: { result: EndpointResult }) {
  const items = getItems(result.data);
  const first = items[0];
  const fields = first ? pickDisplayFields(first).map(([key]) => key) : [];

  if (!result.ok) {
    return (
      <Empty className="dc-card min-h-56">
        <EmptyHeader>
          <EmptyMedia variant="icon">!</EmptyMedia>
          <EmptyTitle>{result.label} gagal dimuat</EmptyTitle>
          <EmptyDescription>{result.error?.message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (items.length === 0) {
    return (
      <Empty className="dc-card min-h-56">
        <EmptyHeader>
          <EmptyMedia variant="icon">0</EmptyMedia>
          <EmptyTitle>Belum ada data</EmptyTitle>
          <EmptyDescription>
            Endpoint berhasil dipanggil, tetapi tidak ada record untuk scope atau filter saat ini.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="dc-card overflow-hidden">
      <div className="border-b border-[var(--dc-border-subtle)] px-4 py-3">
        <h2 className="font-semibold">{result.label}</h2>
        <p className="font-mono text-[11px] text-[var(--dc-text-muted)]">{result.path}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-[var(--dc-surface-raised)] text-[var(--dc-text-muted)]">
            <tr>
              {fields.map((field) => (
                <th key={field} className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em]">
                  {field}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-mono text-[11px] uppercase tracking-[0.08em]">Detail</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 10).map((item, index) => {
              const record = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
              const id = formatValue(record.id ?? index + 1);

              return (
                <tr key={id} className="border-t border-[var(--dc-border-subtle)]">
                  {fields.map((field) => (
                    <td key={field} className="max-w-[18rem] truncate px-4 py-3 text-[var(--dc-text-secondary)]">
                      {formatValue(record[field])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`?selected=${encodeURIComponent(id)}`}>Buka</Link>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailPanel({ result }: { result: EndpointResult }) {
  if (!result.ok) {
    return (
      <Empty className="dc-card min-h-72">
        <EmptyHeader>
          <EmptyMedia variant="icon">{result.error?.status ?? "!"}</EmptyMedia>
          <EmptyTitle>Resource tidak dapat ditampilkan</EmptyTitle>
          <EmptyDescription>
            {result.error?.status === 404
              ? "Resource tidak ditemukan atau berada di luar scope akses."
              : result.error?.message}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const entries =
    result.data && typeof result.data === "object" ? Object.entries(result.data as Record<string, unknown>) : [];

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <article className="dc-card p-4">
        <div className="border-b border-[var(--dc-border-subtle)] pb-3">
          <h2 className="font-semibold text-lg">{result.label}</h2>
          <p className="font-mono text-[11px] text-[var(--dc-text-muted)]">{result.path}</p>
        </div>
        <dl className="mt-4 grid gap-3 md:grid-cols-2">
          {entries.slice(0, 18).map(([key, value]) => (
            <div
              key={key}
              className="rounded-[var(--dc-radius-sm)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-3"
            >
              <dt className="font-mono text-[11px] text-[var(--dc-text-muted)]">{key}</dt>
              <dd className="mt-1 break-words text-sm text-[var(--dc-text-secondary)]">{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      </article>
      <aside className="dc-card h-fit p-4 xl:sticky xl:top-20">
        <h2 className="font-semibold">Metadata & actions</h2>
        <div className="mt-4 space-y-2">
          <Badge variant="outline">Server-authoritative</Badge>
          <Badge variant="outline">Masked 404 enabled</Badge>
        </div>
        <p className="mt-4 text-sm text-[var(--dc-text-secondary)]">
          Tombol final mengikuti `availableActions` dari backend ketika tersedia.
        </p>
      </aside>
    </section>
  );
}

function MapWorkspace({ results }: { results: EndpointResult[] }) {
  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="dc-map-shell flex min-h-[32rem] items-center justify-center">
        <div className="max-w-md text-center">
          <p className="dc-eyebrow">Map workspace</p>
          <h2 className="mt-2 font-semibold text-xl">Layer spasial siap dihubungkan</h2>
          <p className="mt-2 text-sm text-[var(--dc-text-secondary)]">
            Viewport, bbox, layer, dan selected feature harus disimpan di URL. Endpoint layer ditampilkan di panel
            kanan.
          </p>
        </div>
      </div>
      <EndpointStatus results={results} />
    </section>
  );
}

export async function UniversalDensRoutePage({
  routePattern,
  params = {},
  searchParams = {},
}: UniversalDensRoutePageProps) {
  const query = normalizeSearchParams(searchParams);
  const spec = getDensRouteSpec(routePattern, params, query);
  const results = await Promise.all(
    spec.endpoints.map((endpoint) => loadEndpoint(endpoint.label, endpoint.path, endpoint.query)),
  );
  const degradedCount = results.filter((result) => !result.ok).length;
  const primary = results[0];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <PageHeader spec={spec} degradedCount={degradedCount} />
      <KpiGrid results={results} />
      {spec.archetype === "map-workspace" ? <MapWorkspace results={results} /> : null}
      {spec.archetype === "detail-two-column" ||
      spec.archetype === "dynamic-form" ||
      spec.archetype === "workflow-workspace" ? (
        <DetailPanel result={primary} />
      ) : null}
      {!["detail-two-column", "dynamic-form", "workflow-workspace", "map-workspace"].includes(spec.archetype) ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <DataTable result={primary} />
          <EndpointStatus results={results} />
        </div>
      ) : null}
    </div>
  );
}
