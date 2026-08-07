import { Activity, Clock3, Fingerprint, Globe2, Laptop, MapPin, Network, ShieldAlert, UserRound } from "lucide-react";

import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
} from "../_components/audit-presentation";
import type { AuditLogRecord } from "../_components/audit-types";

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 last:border-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={mono ? "break-all font-mono text-xs text-foreground" : "text-sm text-foreground"}>
        {value || "-"}
      </dd>
    </div>
  );
}

function JsonEvidence({ title, value }: { title: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <Card className="min-w-0 border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-96 overflow-auto rounded-xl border border-border/60 bg-muted/35 p-4 text-xs leading-5 text-foreground">
          {JSON.stringify(value, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}

export default async function AuditDetailPage({ params }: { params: Promise<{ auditLogId: string }> }) {
  const { auditLogId } = await params;
  const log = await apiServerGet<AuditLogRecord>(`/audit-logs/${auditLogId}`);
  const primaryArea =
    log.actorAssignment?.areaScopes.find((scope) => scope.isPrimary)?.area ?? log.actorAssignment?.areaScopes[0]?.area;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <BackButton href="/dashboard/admin-system/keamanan-audit" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">Bukti Audit Forensik</h1>
              {log.isIncident ? (
                <Badge className="bg-rose-600">Insiden</Badge>
              ) : log.isAnomaly ? (
                <Badge className="bg-amber-600">Anomali</Badge>
              ) : (
                <Badge variant="outline">Aktivitas normal</Badge>
              )}
            </div>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{log.id}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={categoryClass(log.category)}>
            {CATEGORY_LABELS[log.category] ?? log.category}
          </Badge>
          <Badge variant="outline" className={severityClass(log.severity)}>
            {SEVERITY_LABELS[log.severity] ?? log.severity}
          </Badge>
          <Badge variant="outline" className={outcomeClass(log.outcome)}>
            {OUTCOME_LABELS[log.outcome] ?? log.outcome}
          </Badge>
        </div>
      </div>

      <Card className="overflow-hidden border-border/70 bg-[linear-gradient(135deg,rgba(6,182,212,0.07),transparent_45%)]">
        <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              {log.category}
            </p>
            <p className="mt-2 font-mono text-lg font-semibold text-foreground">{log.action}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {log.requestPath || `${log.entityType}${log.entityId ? ` / ${log.entityId}` : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-background/70 px-5 py-3">
            <ShieldAlert
              className={
                log.riskScore >= 60
                  ? "size-8 text-rose-500"
                  : log.riskScore >= 35
                    ? "size-8 text-amber-500"
                    : "size-8 text-emerald-500"
              }
            />
            <div>
              <p className="text-xs text-muted-foreground">Skor risiko</p>
              <p className="font-mono text-3xl font-semibold tabular-nums">
                {log.riskScore}
                <span className="text-sm text-muted-foreground">/100</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserRound className="size-4 text-cyan-600" /> Aktor
            </CardTitle>
            <CardDescription>Identitas dan konteks penugasan saat ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label="Nama" value={actorName(log.actorUser)} />
              <Field label="Username" value={log.actorUser?.username} mono />
              <Field label="Peran" value={log.actorAssignment?.role.name} />
              <Field label="Cabang" value={log.actorAssignment?.branch} />
              <Field label="Wilayah utama" value={primaryArea ? `${primaryArea.name} (${primaryArea.code})` : null} />
            </dl>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="size-4 text-cyan-600" /> Request
            </CardTitle>
            <CardDescription>Korelasi teknis dan hasil eksekusi.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label="Waktu WIB" value={formatAuditDateTime(log.createdAt)} />
              <Field label="Request ID" value={log.requestId} mono />
              <Field label="Session ID" value={log.sessionId} mono />
              <Field label="Metode / status" value={`${log.httpMethod ?? "-"} / ${log.statusCode ?? "-"}`} mono />
              <Field
                label="Durasi"
                value={log.durationMs === null ? "-" : `${log.durationMs.toLocaleString("id-ID")} ms`}
              />
            </dl>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Laptop className="size-4 text-cyan-600" /> Perangkat & jaringan
            </CardTitle>
            <CardDescription>Konteks klien yang tersedia pada event.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label="IP address" value={formatIpAddress(log.ipAddress)} mono />
              <Field label="Lokasi" value={log.locationLabel} />
              <Field label="Perangkat" value={log.deviceType} />
              <Field label="Browser" value={log.browser} />
              <Field label="Sistem operasi" value={log.operatingSystem} />
            </dl>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-cyan-600" /> Entitas & klasifikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl>
              <Field label="Jenis entitas" value={log.entityType} />
              <Field label="ID entitas" value={log.entityId} mono />
              <Field label="Modul sumber" value={log.source} />
              <Field label="Kategori" value={CATEGORY_LABELS[log.category] ?? log.category} />
              <Field label="Hasil" value={OUTCOME_LABELS[log.outcome] ?? log.outcome} />
            </dl>
          </CardContent>
        </Card>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Fingerprint className="size-4 text-cyan-600" /> Indikator risiko
            </CardTitle>
            <CardDescription>Alasan deterministik di balik klasifikasi event.</CardDescription>
          </CardHeader>
          <CardContent>
            {log.riskIndicators?.length ? (
              <div className="flex flex-wrap gap-2">
                {log.riskIndicators.map((indicator) => (
                  <Badge key={indicator} variant="outline" className="font-mono text-[11px]">
                    {indicator}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada indikator risiko khusus.</p>
            )}
            <Separator className="my-4" />
            <div className="grid gap-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <Clock3 className="size-3.5" /> Waktu dinormalisasi ke WIB pada tampilan.
              </p>
              <p className="flex items-center gap-2">
                <Globe2 className="size-3.5" /> IP berasal dari proxy tepercaya aplikasi.
              </p>
              <p className="flex items-center gap-2">
                <MapPin className="size-3.5" /> Lokasi hanya ditampilkan jika tersedia pada sesi.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <JsonEvidence title="Metadata tersanitasi" value={log.metadata} />
        <JsonEvidence title="Data sebelum perubahan" value={log.beforeData} />
        <JsonEvidence title="Data setelah perubahan" value={log.afterData} />
      </div>

      <Card className="border-border/70">
        <CardContent className="p-4">
          <p className="break-all text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">User-Agent:</span> {log.deviceInfo || "Tidak tersedia"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
