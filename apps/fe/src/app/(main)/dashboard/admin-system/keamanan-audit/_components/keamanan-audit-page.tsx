import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  Clock3,
  Eye,
  Fingerprint,
  Laptop,
  MonitorSmartphone,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiServerGet } from "@/lib/api/server-client";

import {
  actorName,
  CATEGORY_LABELS,
  categoryClass,
  formatAuditDateTime,
  formatIpAddress,
  OUTCOME_LABELS,
  outcomeClass,
  SEVERITY_LABELS,
  severityClass,
} from "./audit-presentation";
import type { AuditPanelResponse, AuditSearchParams, SecuritySessionRecord } from "./audit-types";
import { SecuritySessionAutoRefresh } from "./security-session-auto-refresh";

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS);
const SEVERITY_OPTIONS = Object.entries(SEVERITY_LABELS);
const OUTCOME_OPTIONS = Object.entries(OUTCOME_LABELS);

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function cleanFilters(searchParams: AuditSearchParams) {
  return Object.fromEntries(
    Object.entries(searchParams)
      .map(([key, value]) => [key, firstValue(value)?.trim()] as const)
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function buildHref(filters: Record<string, string>, patch: Record<string, string | undefined>) {
  const next = new URLSearchParams(filters);
  for (const [key, value] of Object.entries(patch)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return `/dashboard/admin-system/keamanan-audit${query ? `?${query}` : ""}`;
}

function dateInputValue(value: string | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function SelectField({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value?: string;
  options: Array<[string, string]>;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      <select
        name={name}
        defaultValue={value ?? ""}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      >
        <option value="">Semua</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatCard({
  label,
  value,
  percentageLabel,
  detail,
  icon: Icon,
  tone = "text-cyan-600 dark:text-cyan-300",
}: {
  label: string;
  value: number;
  percentageLabel?: string;
  detail: string;
  icon: typeof Activity;
  tone?: string;
}) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/80">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{value.toLocaleString("id-ID")}</p>
          {percentageLabel ? (
            <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums text-cyan-700 dark:text-cyan-300">
              {percentageLabel}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="rounded-xl border border-current/15 bg-current/5 p-2.5">
          <Icon className={`size-5 ${tone}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function getSessionName(session: SecuritySessionRecord) {
  return session.fullName ?? session.username ?? session.userName ?? session.userEmail;
}

export default async function KeamananAuditPage({ searchParams }: { searchParams: AuditSearchParams }) {
  const filters = cleanFilters(searchParams);
  const defaultFrom = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
  const query = { ...filters, from: filters.from || defaultFrom, limit: filters.limit || "25" };
  const [panel, sessions] = await Promise.all([
    apiServerGet<AuditPanelResponse>("/audit-logs", query),
    apiServerGet<SecuritySessionRecord[]>("/system/security/sessions", { limit: 30 }),
  ]);
  const onlineCount = sessions.filter((session) => session.isOnline).length;
  const totalAuditEvents = panel.summary.total;
  const onlineSessionRate = percentOf(onlineCount, sessions.length);
  const maxCategory = Math.max(1, ...panel.facets.categories.map((item) => item.count));

  return (
    <div className="space-y-5">
      <SecuritySessionAutoRefresh />

      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(6,182,212,0.10),transparent_42%),linear-gradient(315deg,rgba(99,102,241,0.08),transparent_35%)] p-5">
        <div className="absolute right-6 top-5 hidden size-28 rounded-full border border-cyan-400/15 md:block" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              <Fingerprint className="size-4" /> Panel Forensik DENS CAKRA
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Keamanan & Audit Aktivitas
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Jejak aktivitas append-only dengan korelasi request, aktor, wilayah, perangkat, jaringan, hasil aksi,
              serta indikator anomali yang dapat ditelusuri.
            </p>
          </div>
          <Badge variant="outline" className="w-fit border-cyan-500/30 bg-background/70 px-3 py-1.5">
            <ShieldCheck className="mr-1.5 size-3.5 text-cyan-600" /> Bukti append-only
          </Badge>
        </div>
      </div>

      {(panel.summary.incidents > 0 || panel.summary.anomalies > 0) && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <ShieldAlert className="size-4 text-amber-600" />
          <AlertTitle>Perlu peninjauan forensik</AlertTitle>
          <AlertDescription>
            Ditemukan {panel.summary.incidents} insiden dan {panel.summary.anomalies} anomali pada rentang/filter aktif.
            Klasifikasi dibuat dari status akses, kegagalan server, frekuensi penolakan, waktu aktivitas, dan
            sensitivitas sumber daya.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Total Aktivitas"
          value={totalAuditEvents}
          detail={`Rata-rata risiko ${panel.summary.averageRiskScore}/100`}
          icon={Activity}
        />
        <StatCard
          label="Insiden"
          value={panel.summary.incidents}
          percentageLabel={`${formatPercent(percentOf(panel.summary.incidents, totalAuditEvents))}% dari total aktivitas`}
          detail="Butuh prioritas"
          icon={ShieldAlert}
          tone="text-rose-600 dark:text-rose-300"
        />
        <StatCard
          label="Anomali"
          value={panel.summary.anomalies}
          percentageLabel={`${formatPercent(percentOf(panel.summary.anomalies, totalAuditEvents))}% dari total aktivitas`}
          detail="Pola menyimpang"
          icon={AlertTriangle}
          tone="text-amber-600 dark:text-amber-300"
        />
        <StatCard
          label="Akses ditolak"
          value={panel.summary.denied}
          percentageLabel={`${formatPercent(percentOf(panel.summary.denied, totalAuditEvents))}% dari total aktivitas`}
          detail="HTTP 401 / 403"
          icon={Ban}
          tone="text-orange-600 dark:text-orange-300"
        />
        <StatCard
          label="Gagal"
          value={panel.summary.failures}
          percentageLabel={`${formatPercent(percentOf(panel.summary.failures, totalAuditEvents))}% dari total aktivitas`}
          detail="Error non-otorisasi"
          icon={ShieldAlert}
          tone="text-rose-600 dark:text-rose-300"
        />
        <StatCard
          label="Pengguna online"
          value={onlineCount}
          percentageLabel={`${formatPercent(onlineSessionRate)}% dari sesi valid`}
          detail={`${sessions.length} sesi valid`}
          icon={MonitorSmartphone}
        />
      </div>

      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <SlidersHorizontal className="size-4 text-cyan-600" /> Filter Investigasi
          </CardTitle>
          <CardDescription>
            Gabungkan filter untuk mempersempit kronologi, aktor, perangkat, jaringan, atau entitas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/dashboard/admin-system/keamanan-audit" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label
              htmlFor="audit-search"
              className="grid gap-1.5 text-xs font-medium text-muted-foreground xl:col-span-2"
            >
              Pencarian menyeluruh
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="audit-search"
                  name="search"
                  defaultValue={filters.search}
                  placeholder="Nama aktor, aksi, entitas, IP, route, request ID..."
                  className="pl-9"
                />
              </div>
            </label>
            <label htmlFor="audit-from" className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Mulai waktu
              <Input id="audit-from" type="datetime-local" name="from" defaultValue={dateInputValue(query.from)} />
            </label>
            <label htmlFor="audit-to" className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Sampai waktu
              <Input id="audit-to" type="datetime-local" name="to" defaultValue={dateInputValue(filters.to)} />
            </label>
            <SelectField name="category" label="Kategori aksi" value={filters.category} options={CATEGORY_OPTIONS} />
            <SelectField name="severity" label="Tingkat risiko" value={filters.severity} options={SEVERITY_OPTIONS} />
            <SelectField name="outcome" label="Hasil aksi" value={filters.outcome} options={OUTCOME_OPTIONS} />
            <SelectField
              name="httpMethod"
              label="Metode HTTP"
              value={filters.httpMethod}
              options={[
                ["GET", "GET"],
                ["POST", "POST"],
                ["PUT", "PUT"],
                ["PATCH", "PATCH"],
                ["DELETE", "DELETE"],
              ]}
            />
            <SelectField
              name="actorUserProfileId"
              label="Pengguna / aktor"
              value={filters.actorUserProfileId}
              options={panel.facets.actors
                .filter((item) => item.value)
                .map((item) => [item.value as string, `${item.label} (${item.count})`])}
            />
            <SelectField
              name="action"
              label="Aksi domain"
              value={filters.action}
              options={panel.facets.actions.map((item) => [item.value ?? "", `${item.value} (${item.count})`])}
            />
            <SelectField
              name="source"
              label="Modul sumber"
              value={filters.source}
              options={panel.facets.sources.map((item) => [item.value ?? "", `${item.value} (${item.count})`])}
            />
            <SelectField
              name="entityType"
              label="Jenis entitas"
              value={filters.entityType}
              options={panel.facets.entityTypes.map((item) => [item.value ?? "", `${item.value} (${item.count})`])}
            />
            <SelectField
              name="deviceType"
              label="Jenis perangkat"
              value={filters.deviceType}
              options={panel.facets.devices.map((item) => [item.value ?? "", `${item.value} (${item.count})`])}
            />
            <label htmlFor="audit-ip" className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              IP address
              <Input id="audit-ip" name="ipAddress" defaultValue={filters.ipAddress} placeholder="Contoh: 10.20.0.8" />
            </label>
            <label htmlFor="audit-request-id" className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Request ID
              <Input
                id="audit-request-id"
                name="requestId"
                defaultValue={filters.requestId}
                placeholder="Correlation ID"
              />
            </label>
            <label htmlFor="audit-route" className="grid gap-1.5 text-xs font-medium text-muted-foreground">
              Route / endpoint
              <Input id="audit-route" name="requestPath" defaultValue={filters.requestPath} placeholder="/api/v1/..." />
            </label>
            <SelectField
              name="isAnomaly"
              label="Status anomali"
              value={filters.isAnomaly}
              options={[
                ["true", "Hanya anomali"],
                ["false", "Bukan anomali"],
              ]}
            />
            <SelectField
              name="isIncident"
              label="Status insiden"
              value={filters.isIncident}
              options={[
                ["true", "Hanya insiden"],
                ["false", "Bukan insiden"],
              ]}
            />
            <SelectField
              name="sortBy"
              label="Urutkan berdasarkan"
              value={filters.sortBy}
              options={[
                ["createdAt", "Waktu event"],
                ["riskScore", "Skor risiko"],
                ["durationMs", "Durasi request"],
              ]}
            />
            <SelectField
              name="sortOrder"
              label="Arah urutan"
              value={filters.sortOrder}
              options={[
                ["desc", "Terbaru / terbesar"],
                ["asc", "Terlama / terkecil"],
              ]}
            />
            <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
              <Button type="submit">
                <Search className="size-4" /> Terapkan filter
              </Button>
              <Button asChild type="button" variant="outline">
                <Link href="/dashboard/admin-system/keamanan-audit">Reset</Link>
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">Default menampilkan 7 hari terakhir.</span>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 border-border/70">
          <CardHeader className="flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Kronologi Aktivitas</CardTitle>
              <CardDescription>{panel.pagination.total.toLocaleString("id-ID")} event ditemukan.</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono">
              UTC+7 / WIB
            </Badge>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Waktu & aktor</TableHead>
                  <TableHead>Aktivitas</TableHead>
                  <TableHead>Klasifikasi</TableHead>
                  <TableHead>Asal akses</TableHead>
                  <TableHead>Risiko</TableHead>
                  <TableHead className="pr-5 text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {panel.items.length ? (
                  panel.items.map((log) => (
                    <TableRow
                      key={log.id}
                      className={
                        log.isIncident ? "bg-rose-500/[0.035]" : log.isAnomaly ? "bg-amber-500/[0.03]" : undefined
                      }
                    >
                      <TableCell className="min-w-48 pl-5 align-top">
                        <p className="font-medium text-foreground">{actorName(log.actorUser)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatAuditDateTime(log.createdAt)}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {log.actorAssignment?.role.name ?? "Tanpa penugasan"}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-64 align-top">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {log.httpMethod ? (
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {log.httpMethod}
                            </Badge>
                          ) : null}
                          <span className="font-mono text-xs font-semibold text-foreground">{log.action}</span>
                        </div>
                        <p className="mt-1 max-w-md truncate text-xs text-muted-foreground">
                          {log.requestPath || `${log.entityType}${log.entityId ? ` / ${log.entityId}` : ""}`}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-48 align-top">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={categoryClass(log.category)}>
                            {CATEGORY_LABELS[log.category] ?? log.category}
                          </Badge>
                          <Badge variant="outline" className={outcomeClass(log.outcome)}>
                            {OUTCOME_LABELS[log.outcome] ?? log.outcome}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-44 align-top">
                        <p className="font-mono text-xs text-foreground">{formatIpAddress(log.ipAddress)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[log.deviceType, log.browser].filter(Boolean).join(" · ") || "Tidak teridentifikasi"}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-36 align-top">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={severityClass(log.severity)}>
                            {SEVERITY_LABELS[log.severity] ?? log.severity}
                          </Badge>
                          <span className="font-mono text-xs tabular-nums">{log.riskScore}</span>
                        </div>
                        {log.isIncident ? (
                          <p className="mt-1 text-xs font-medium text-rose-600">Insiden</p>
                        ) : log.isAnomaly ? (
                          <p className="mt-1 text-xs font-medium text-amber-600">Anomali</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="pr-5 text-right align-top">
                        <Button asChild size="icon-sm" variant="ghost">
                          <Link
                            href={`/dashboard/admin-system/keamanan-audit/${log.id}`}
                            aria-label="Lihat detail audit"
                          >
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-40 text-center text-muted-foreground">
                      Tidak ada event yang cocok dengan filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
              <p className="text-xs text-muted-foreground">
                Halaman {panel.pagination.page} dari {panel.pagination.totalPages}
              </p>
              <div className="flex gap-2">
                {panel.pagination.page <= 1 ? (
                  <Button size="sm" variant="outline" disabled>
                    <ArrowLeft className="size-4" /> Sebelumnya
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={buildHref(filters, { page: String(panel.pagination.page - 1) })}>
                      <ArrowLeft className="size-4" /> Sebelumnya
                    </Link>
                  </Button>
                )}
                {panel.pagination.page >= panel.pagination.totalPages ? (
                  <Button size="sm" variant="outline" disabled>
                    Berikutnya <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link href={buildHref(filters, { page: String(panel.pagination.page + 1) })}>
                      Berikutnya <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Distribusi Kategori</CardTitle>
              <CardDescription>Komposisi event dalam filter aktif.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {panel.facets.categories.map((item) => (
                <div key={item.value ?? "unknown"} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span>{CATEGORY_LABELS[item.value ?? ""] ?? item.value}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{item.count}</span>
                  </div>
                  <Progress value={(item.count / maxCategory) * 100} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Laptop className="size-4 text-cyan-600" /> Sesi Pengguna
              </CardTitle>
              <CardDescription>Status akses dashboard terkini.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sessions.slice(0, 8).map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{getSessionName(session)}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {formatIpAddress(session.ipAddress)} · {session.locationLabel ?? "Lokasi tidak tersedia"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      <Clock3 className="mr-1 inline size-3" />
                      {formatAuditDateTime(session.lastSeenAt)}
                    </p>
                  </div>
                  <Badge variant={session.isOnline ? "default" : "outline"} className="shrink-0 text-[10px]">
                    {session.isOnline ? "Online" : "Tidak aktif"}
                  </Badge>
                </div>
              ))}
              {!sessions.length ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Belum ada sesi valid.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Alert className="border-cyan-500/20 bg-cyan-500/5">
        <ShieldCheck className="size-4 text-cyan-600" />
        <AlertTitle>Integritas dan privasi bukti</AlertTitle>
        <AlertDescription>
          Audit bersifat append-only. Kredensial, token, cookie, PIN, dan isi body request tidak direkam; nilai sensitif
          pada metadata lama disamarkan ketika ditampilkan.
        </AlertDescription>
      </Alert>
    </div>
  );
}
