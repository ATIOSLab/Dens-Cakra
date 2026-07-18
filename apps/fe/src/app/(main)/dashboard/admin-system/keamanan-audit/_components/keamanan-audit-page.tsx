import Link from "next/link";

import { Clock3, MonitorSmartphone, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiServerGet } from "@/lib/api/server-client";

import { SecuritySessionAutoRefresh } from "./security-session-auto-refresh";

type SecuritySessionRecord = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  username: string | null;
  fullName: string | null;
  lastLoginAt: string | null;
  profileStatus: string | null;
  ipAddress: string | null;
  locationLabel: string | null;
  userAgent: string | null;
  lastSeenAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  isCurrentSession: boolean;
  isOnline: boolean;
};

type AuditLogRecord = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  metadata: { locationLabel?: string | null } | null;
  createdAt: string;
  actorUser?: {
    id: string;
    username: string | null;
    fullName: string | null;
  } | null;
};

const UNSPECIFIED_IPS = new Set(["::", "0.0.0.0", "0:0:0:0:0:0:0:0", "0000:0000:0000:0000:0000:0000:0000:0000"]);

function isUnspecifiedIp(value: string | null | undefined) {
  return Boolean(value && UNSPECIFIED_IPS.has(value.trim().toLowerCase()));
}

function formatIpAddress(value: string | null | undefined) {
  if (!value?.trim() || isUnspecifiedIp(value)) {
    return "-";
  }

  return value;
}

function formatLocation(ipAddress: string | null | undefined, location: string | null | undefined) {
  if (isUnspecifiedIp(ipAddress)) {
    return "Unknown location";
  }

  return location ?? "Unknown location";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDisplayName(session: Pick<SecuritySessionRecord, "fullName" | "username" | "userName" | "userEmail">) {
  return session.fullName || session.username || session.userName || session.userEmail;
}

function getDeviceLabel(userAgent: string | null) {
  if (!userAgent) {
    return "Perangkat tidak teridentifikasi";
  }

  if (userAgent.toLowerCase().includes("iphone")) {
    return "iPhone";
  }

  if (userAgent.toLowerCase().includes("android")) {
    return "Android";
  }

  if (userAgent.toLowerCase().includes("windows")) {
    return "Windows";
  }

  if (userAgent.toLowerCase().includes("mac os")) {
    return "Mac";
  }

  return "Desktop / browser";
}

function SessionBadge({ isCurrentSession, isOnline }: { isCurrentSession: boolean; isOnline: boolean }) {
  return (
    <Badge variant={isOnline ? "default" : "outline"} className={isOnline ? "" : "text-[10px]"}>
      {isOnline ? (isCurrentSession ? "Online / Saat ini" : "Online") : "Tidak aktif"}
    </Badge>
  );
}

export default async function KeamananAuditPage() {
  const [sessions, auditLogs] = await Promise.all([
    apiServerGet<SecuritySessionRecord[]>("/system/security/sessions", { limit: 50 }),
    apiServerGet<AuditLogRecord[]>("/audit-logs", {
      limit: 50,
      action: "auth.session",
    }),
  ]);

  const validSessionCount = sessions.length;
  const onlineSessionCount = sessions.filter((session) => session.isOnline).length;
  const currentSession = sessions.find((session) => session.isCurrentSession) ?? sessions[0] ?? null;
  const recentLoginCount = auditLogs.filter((log) => log.action === "auth.session.created").length;
  const revokedLoginCount = auditLogs.filter((log) => log.action === "auth.session.deleted").length;
  const resolvedSessionIds = new Set(
    auditLogs
      .filter((log) => log.action === "auth.session.network_resolved" && log.entityId)
      .map((log) => log.entityId),
  );
  const displayedAuditLogs = auditLogs.filter(
    (log) => !(log.action === "auth.session.created" && log.entityId && resolvedSessionIds.has(log.entityId)),
  );

  return (
    <div className="space-y-5">
      <SecuritySessionAutoRefresh />
      <Alert className="border-cyan-500/20 bg-cyan-500/5 text-cyan-950 dark:text-cyan-100">
        <ShieldCheck className="size-4" />
        <AlertTitle>Pemantauan sesi login</AlertTitle>
        <AlertDescription>
          Pengguna dianggap online jika dashboard mengirim heartbeat dalam 90 detik terakhir. Halaman ini diperbarui
          otomatis setiap 30 detik; setiap akun ditampilkan satu kali berdasarkan aktivitas sesi terbarunya.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Pengguna online</CardDescription>
            <CardTitle className="text-3xl">{onlineSessionCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {validSessionCount} akun memiliki sesi login valid.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Login tercatat</CardDescription>
            <CardTitle className="text-3xl">{recentLoginCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Event <code className="rounded bg-muted px-1 py-0.5 text-xs">auth.session.created</code>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Logout / revoke</CardDescription>
            <CardTitle className="text-3xl">{revokedLoginCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Event <code className="rounded bg-muted px-1 py-0.5 text-xs">auth.session.deleted</code>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sesi utama</CardDescription>
            <CardTitle className="text-base">{currentSession ? getDisplayName(currentSession) : "-"}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {currentSession
              ? `${formatIpAddress(currentSession.ipAddress)} - ${formatLocation(currentSession.ipAddress, currentSession.locationLabel)}`
              : "Belum ada sesi aktif"}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="size-4 text-cyan-600 dark:text-[#14B8FF]" />
              Aktivitas Sesi Dashboard
            </CardTitle>
            <CardDescription>
              Monitor heartbeat, IP, lokasi, dan perangkat terbaru dari setiap pengguna.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pemilik</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Perangkat</TableHead>
                  <TableHead>Masuk</TableHead>
                  <TableHead>Terakhir aktif</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length > 0 ? (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="grid gap-0.5">
                          <span className="font-medium text-foreground">{getDisplayName(session)}</span>
                          <span className="text-xs text-muted-foreground">{session.userEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="grid gap-0.5">
                          <span className="font-medium">{formatIpAddress(session.ipAddress)}</span>
                          <span className="text-xs text-muted-foreground">{session.userRole}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatLocation(session.ipAddress, session.locationLabel)}</TableCell>
                      <TableCell>{getDeviceLabel(session.userAgent)}</TableCell>
                      <TableCell>{formatDateTime(session.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(session.lastSeenAt)}</TableCell>
                      <TableCell>
                        <SessionBadge isCurrentSession={session.isCurrentSession} isOnline={session.isOnline} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Belum ada sesi aktif yang bisa ditampilkan.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="size-4 text-cyan-600 dark:text-[#14B8FF]" />
              Audit Login Terbaru
            </CardTitle>
            <CardDescription>Jejak login dan logout yang sudah tersimpan di audit log.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {displayedAuditLogs.length > 0 ? (
              displayedAuditLogs.map((log, index) => (
                <div key={log.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={log.action === "auth.session.deleted" ? "outline" : "default"}>
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {log.actorUser?.fullName || log.actorUser?.username || log.entityType}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatIpAddress(log.ipAddress)} - {formatLocation(log.ipAddress, log.metadata?.locationLabel)}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {log.deviceInfo ?? "Perangkat tidak teridentifikasi"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                  </div>
                  {index < displayedAuditLogs.length - 1 ? <Separator className="my-3" /> : null}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--dc-border-subtle)] p-6 text-center text-sm text-muted-foreground">
                Belum ada audit login yang tercatat.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <MonitorSmartphone className="size-3.5 text-cyan-600" />
        <span>Heartbeat membedakan pengguna online dari sesi valid yang sedang tidak aktif.</span>
        <Link href="/dashboard/admin-system/keamanan-audit" className="text-cyan-600 hover:underline">
          Refresh halaman jika perlu
        </Link>
      </div>
    </div>
  );
}
