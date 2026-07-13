"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  MapPin,
  Radio,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { FieldOfficerWorkspace } from "@/server/field-ops/types";
import { LeafletLocationPreview } from "./leaflet-location-preview";

type FieldOfficerView = "overview" | "tasks" | "jaring" | "incoming" | "baket" | "reports" | "map" | "alert";

const FORWARDED_STORAGE_KEY = "dens-cakra-forwarded-assignments";

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusTone(status: string) {
  const value = status.toUpperCase();

  if (value.includes("COMPLETED") || value.includes("ACTIVE") || value.includes("VALID")) {
    return "border-[var(--dc-success)]/35 bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
  }

  if (value.includes("IN_PROGRESS") || value.includes("ROUTED") || value.includes("READY")) {
    return "border-[var(--dc-primary)]/35 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
  }

  if (value.includes("DRAFT") || value.includes("RECEIVED") || value.includes("ASSIGNED")) {
    return "border-[var(--dc-warning)]/35 bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
  }

  if (value.includes("INACTIVE") || value.includes("ARCHIVED") || value.includes("ERROR")) {
    return "border-[var(--dc-danger)]/35 bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
  }

  return "border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] text-[var(--dc-text-secondary)]";
}

function nextTaskAction(status: string) {
  const value = status.toUpperCase();

  if (value === "SENT") {
    return { label: "Tandai Dibaca", nextStatus: "READ" as const };
  }

  if (value === "READ") {
    return { label: "Acknowledge", nextStatus: "ACKNOWLEDGED" as const };
  }

  if (value === "ACKNOWLEDGED") {
    return { label: "Mulai Tugas", nextStatus: "IN_PROGRESS" as const };
  }

  if (value === "IN_PROGRESS" || value === "OVERDUE") {
    return { label: "Selesaikan", nextStatus: "COMPLETED" as const };
  }

  return null;
}

export function FieldOfficerOperationsPage({ view }: { view: FieldOfficerView }) {
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [forwardedAssignments, setForwardedAssignments] = useState<string[]>([]);
  const [jaringForm, setJaringForm] = useState({
    code: "",
    aliasName: "",
    whatsappNumber: "",
    clusterId: "",
    notes: "",
    areaId: "",
  });

  useEffect(() => {
    const raw = window.sessionStorage.getItem(FORWARDED_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      setForwardedAssignments(JSON.parse(raw) as string[]);
    } catch {
      window.sessionStorage.removeItem(FORWARDED_STORAGE_KEY);
    }
  }, []);

  const loadWorkspace = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/field-officer/workspace", { cache: "no-store" });
      const body = (await response.json()) as FieldOfficerWorkspace | { message?: string };

      if (!response.ok) {
        throw new Error("message" in body ? body.message : "Gagal memuat workspace field officer.");
      }

      setWorkspace(body as FieldOfficerWorkspace);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat workspace field officer.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const metrics = useMemo(() => {
    if (!workspace) {
      return null;
    }

    return {
      activeTasks: workspace.tasks.filter((item) => item.assignmentStatus !== "COMPLETED").length,
      activeJaring: workspace.jaring.filter((item) => item.status === "ACTIVE").length,
      pendingIncoming: workspace.incoming.filter((item) => item.validationSummary !== "VALID").length,
      draftBakets: workspace.bakets.filter((item) => item.status === "DRAFT" || item.status === "READY_TO_SEND").length,
    };
  }, [workspace]);

  const runAction = async (key: string, callback: () => Promise<void>) => {
    try {
      setIsBusy(key);
      setActionNotice(null);
      await callback();
      await loadWorkspace();
      setError(null);
    } catch (actionError) {
      setActionNotice(null);
      setError(actionError instanceof Error ? actionError.message : "Aksi gagal dijalankan.");
    } finally {
      setIsBusy(null);
    }
  };

  const handleForwardToggle = (assignmentId: string) => {
    const next = forwardedAssignments.includes(assignmentId)
      ? forwardedAssignments.filter((item) => item !== assignmentId)
      : [...forwardedAssignments, assignmentId];

    setForwardedAssignments(next);
    window.sessionStorage.setItem(FORWARDED_STORAGE_KEY, JSON.stringify(next));
  };

  const createJaring = async () => {
    if (!workspace) {
      return;
    }

    await runAction("jaring:create", async () => {
      const response = await fetch("/api/field-officer/jaring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: jaringForm.code,
          aliasName: jaringForm.aliasName,
          whatsappNumber: jaringForm.whatsappNumber,
          clusterId: jaringForm.clusterId || undefined,
          notes: jaringForm.notes,
          areaIds: [jaringForm.areaId || workspace.context.areaScopes[0]?.areaId].filter(Boolean),
          fieldOfficerAssignmentId: workspace.context.primaryAssignmentId,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal membuat jaring.");
      }

      setJaringForm({
        code: "",
        aliasName: "",
        whatsappNumber: "",
        clusterId: "",
        notes: "",
        areaId: "",
      });
    });
  };

  const updateTaskStatus = async (
    assignmentId: string,
    nextStatus: "READ" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED",
  ) => {
    await runAction(`task:${assignmentId}:${nextStatus}`, async () => {
      const response = await fetch(`/api/field-officer/task-assignments/${assignmentId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nextStatus }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal memperbarui tugas.");
      }
    });
  };

  const validateIncoming = async (messageId: string) => {
    await runAction(`validate:${messageId}`, async () => {
      const response = await fetch(`/api/field-officer/incoming/${messageId}/validate`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | { validationSummary?: string; title?: string | null }
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error((body && "message" in body ? body.message : null) || "Gagal memvalidasi laporan.");
      }

      const result = body && "validationSummary" in body ? body.validationSummary : null;
      setActionNotice(
        result === "VALID"
          ? "Validasi berhasil. Laporan sudah lengkap dan siap dibuat menjadi Baket."
          : "Validasi selesai. Cek badge dan kelengkapan laporan sebelum dibuat menjadi Baket.",
      );
    });
  };

  const assignCategory = async (messageId: string, categoryId: string) => {
    await runAction(`category:${messageId}`, async () => {
      const response = await fetch(`/api/field-officer/incoming/${messageId}/category`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(body?.message || "Gagal menyimpan kategori laporan.");
      }
    });
  };

  const createBaket = async (messageId: string) => {
    await runAction(`baket:${messageId}`, async () => {
      const response = await fetch(`/api/field-officer/incoming/${messageId}/baket`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal membuat baket.");
      }
    });
  };

  const deleteIncoming = async (messageId: string) => {
    await runAction(`delete:${messageId}`, async () => {
      const response = await fetch(`/api/field-officer/incoming/${messageId}/delete`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal menghapus laporan.");
      }
    });
  };

  const submitBaket = async (baketId: string) => {
    await runAction(`submit:${baketId}`, async () => {
      const response = await fetch(`/api/field-officer/baket/${baketId}/submit`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal mengirim baket.");
      }
    });
  };

  const changeJaringStatus = async (jaringId: string, action: "activate" | "deactivate" | "archive") => {
    await runAction(`jaring:${jaringId}:${action}`, async () => {
      const response = await fetch(`/api/field-officer/jaring/${jaringId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          reason: `Status diubah dari workspace field officer ke mode ${action}.`,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal mengubah status jaring.");
      }
    });
  };

  const publishOwnLocation = async () => {
    if (!workspace) {
      return;
    }

    if (!navigator.geolocation) {
      setError("Browser ini tidak mendukung geolocation.");
      return;
    }

    await runAction("location:publish", async () => {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const response = await fetch("/api/field-officer/live-location", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          positionAssignmentId: workspace.context.primaryAssignmentId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          gpsAccuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal mengirim lokasi.");
      }
    });
  };

  const mapPoints = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const incomingPoints = workspace.incoming
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .map((item) => ({
        id: item.id,
        kind: "incoming" as const,
        latitude: item.latitude as number,
        longitude: item.longitude as number,
        title: item.title || item.jaringAlias,
        subtitle: `${item.jaringCode} • ${item.status}`,
      }));

    const ownPoint = workspace.latestLocation
      ? [
          {
            id: workspace.latestLocation.id,
            kind: "self" as const,
            latitude: workspace.latestLocation.latitude,
            longitude: workspace.latestLocation.longitude,
            title: "Posisi Saya",
            subtitle: workspace.latestLocation.areaName || "Lokasi terbaru",
          },
        ]
      : [];

    return [...ownPoint, ...incomingPoints];
  }, [workspace]);

  const mapCenter = useMemo(() => {
    if (mapPoints.length === 0) {
      return [106.8456, -6.2088] as [number, number];
    }

    const lng = mapPoints.reduce((sum, item) => sum + item.longitude, 0) / mapPoints.length;
    const lat = mapPoints.reduce((sum, item) => sum + item.latitude, 0) / mapPoints.length;

    return [lng, lat] as [number, number];
  }, [mapPoints]);

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`loading-${index}`} className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
            <CardHeader>
              <div className="h-4 w-28 animate-pulse rounded bg-[var(--dc-surface-hover)]" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-[var(--dc-surface-hover)]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!workspace || !metrics) {
    return (
      <Alert className="border-[var(--dc-danger)]/30 bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]">
        <AlertTriangle className="size-4" />
        <AlertTitle>Workspace tidak tersedia</AlertTitle>
        <AlertDescription>{error || "Data field officer belum dapat dibaca."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)] text-[var(--dc-text-primary)]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[var(--dc-primary)]/30 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]">
                Field Officer Live Workspace
              </Badge>
              <Badge variant="outline" className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]">
                {workspace.profile.role}
              </Badge>
            </div>
            <CardTitle>{workspace.profile.name}</CardTitle>
            <CardDescription>
              {workspace.context.positionTitle} • {workspace.context.organizationUnitName}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tugas Aktif" value={metrics.activeTasks} />
            <MetricCard label="Jaring Aktif" value={metrics.activeJaring} />
            <MetricCard label="Laporan Pending" value={metrics.pendingIncoming} />
            <MetricCard label="Draft Baket" value={metrics.draftBakets} />
          </CardContent>
        </Card>
        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
          <CardHeader>
            <CardTitle className="text-base">Scope Operasi</CardTitle>
            <CardDescription>Area primer dan permission aktif yang dibawa dari baseline merge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--dc-text-secondary)]">
            <div className="flex flex-wrap gap-2">
              {workspace.context.areaScopes.map((item) => (
                <Badge
                  key={item.areaId}
                  variant="outline"
                  className="border-[var(--dc-primary)]/30 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]"
                >
                  {item.name}
                </Badge>
              ))}
            </div>
            <p>{workspace.profile.email}</p>
            <p>Assignment: {workspace.context.primaryAssignmentId}</p>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <Alert className="border-[var(--dc-warning)]/30 bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]">
          <AlertTriangle className="size-4" />
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert className="border-[var(--dc-success)]/30 bg-[var(--dc-success-soft)] text-[var(--dc-success)]">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Aksi berhasil</AlertTitle>
          <AlertDescription>{actionNotice}</AlertDescription>
        </Alert>
      ) : null}

      {(view === "overview" || view === "tasks") && (
        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
          <CardHeader>
            <CardTitle>Tugas Saya</CardTitle>
            <CardDescription>
              Update status eksekusi lapangan dan tandai assignment yang perlu diteruskan ke coordinator.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.tasks.map((task) => {
              const action = nextTaskAction(task.assignmentStatus);
              const forwarded = forwardedAssignments.includes(task.assignmentId);

              return (
                <div
                  key={task.assignmentId}
                  className="rounded-xl border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(task.assignmentStatus)}>{task.assignmentStatus}</Badge>
                        <Badge
                          variant="outline"
                          className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                        >
                          {task.priority}
                        </Badge>
                        {forwarded ? (
                          <Badge className="border-[var(--dc-info)]/30 bg-[var(--dc-info-soft)] text-[var(--dc-info)]">
                            Ditandai untuk diteruskan
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="font-semibold text-[var(--dc-text-primary)] text-lg">{task.title}</h3>
                      <p className="text-[var(--dc-text-secondary)] text-sm">{task.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--dc-text-muted)] text-xs">
                        <span>Due: {formatDateTime(task.dueDate)}</span>
                        <span>Target: {task.targetAreas.join(", ") || "-"}</span>
                        <span>Sumber: {task.sourceLabel || "-"}</span>
                        <span>Pengirim: {task.assignerName || "-"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {action ? (
                        <Button
                          size="sm"
                          className="bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                          disabled={isBusy === `task:${task.assignmentId}:${action.nextStatus}`}
                          onClick={() => void updateTaskStatus(task.assignmentId, action.nextStatus)}
                        >
                          {action.label}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[var(--dc-border-subtle)] bg-transparent text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                        onClick={() => handleForwardToggle(task.assignmentId)}
                      >
                        {forwarded ? "Batalkan Forward" : "Tandai Forward"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "jaring") && (
        <section className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
          <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
            <CardHeader>
              <CardTitle>Registrasi Jaring Baru</CardTitle>
              <CardDescription>
                FO tetap memegang ownership data Jaring. Nomor bot pusat dikelola coordinator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Kode Jaring"
                value={jaringForm.code}
                onChange={(event) => setJaringForm((current) => ({ ...current, code: event.target.value }))}
              />
              <Input
                placeholder="Alias / Nama sandi"
                value={jaringForm.aliasName}
                onChange={(event) => setJaringForm((current) => ({ ...current, aliasName: event.target.value }))}
              />
              <Input
                placeholder="Nomor WhatsApp"
                value={jaringForm.whatsappNumber}
                onChange={(event) => setJaringForm((current) => ({ ...current, whatsappNumber: event.target.value }))}
              />
              <select
                className="flex h-10 w-full rounded-md border border-[var(--dc-border-subtle)] bg-background/40 px-3 text-sm text-[var(--dc-text-primary)]"
                value={jaringForm.clusterId}
                onChange={(event) => setJaringForm((current) => ({ ...current, clusterId: event.target.value }))}
              >
                <option value="">Pilih cluster jaring</option>
                {workspace.jaringClusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-[var(--dc-border-subtle)] bg-background/40 px-3 text-sm text-[var(--dc-text-primary)]"
                value={jaringForm.areaId}
                onChange={(event) => setJaringForm((current) => ({ ...current, areaId: event.target.value }))}
              >
                <option value="">Pilih area utama</option>
                {workspace.context.areaScopes.map((area) => (
                  <option key={area.areaId} value={area.areaId}>
                    {area.name}
                  </option>
                ))}
              </select>
              <Textarea
                placeholder="Catatan pembinaan"
                value={jaringForm.notes}
                onChange={(event) => setJaringForm((current) => ({ ...current, notes: event.target.value }))}
              />
              <Button
                className="w-full bg-[var(--dc-success)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-success)]/90"
                disabled={isBusy === "jaring:create"}
                onClick={() => void createJaring()}
              >
                Simpan Jaring
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
            <CardHeader>
              <CardTitle>Jaring Binaan</CardTitle>
              <CardDescription>Status aktif, volume laporan, dan aksi pemeliharaan dasar per Jaring.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {workspace.jaring.map((jaring) => (
                <div
                  key={jaring.id}
                  className="rounded-xl border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(jaring.status)}>{jaring.status}</Badge>
                        <Badge
                          variant="outline"
                          className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                        >
                          {jaring.code}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-[var(--dc-text-primary)]">{jaring.aliasName}</h3>
                      <p className="text-[var(--dc-text-secondary)] text-sm">{jaring.whatsappNumber}</p>
                      <p className="text-[var(--dc-primary)] text-sm">{jaring.clusterName || "Belum ada cluster"}</p>
                      <p className="text-[var(--dc-text-muted)] text-sm">{jaring.areaNames.join(", ") || "-"}</p>
                      {jaring.notes ? <p className="text-[var(--dc-text-secondary)] text-sm">{jaring.notes}</p> : null}
                      <div className="flex gap-4 text-[var(--dc-text-muted)] text-xs">
                        <span>{jaring.messageCount} pesan</span>
                        <span>{jaring.baketCount} baket</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {jaring.status !== "ACTIVE" ? (
                        <Button
                          size="sm"
                          className="bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                          disabled={isBusy === `jaring:${jaring.id}:activate`}
                          onClick={() => void changeJaringStatus(jaring.id, "activate")}
                        >
                          Aktifkan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[var(--dc-border-subtle)] bg-transparent text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                          disabled={isBusy === `jaring:${jaring.id}:deactivate`}
                          onClick={() => void changeJaringStatus(jaring.id, "deactivate")}
                        >
                          Nonaktifkan
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-[var(--dc-danger)]/40 bg-transparent text-[var(--dc-danger)] hover:bg-[var(--dc-danger-soft)]"
                        disabled={isBusy === `jaring:${jaring.id}:archive`}
                        onClick={() => void changeJaringStatus(jaring.id, "archive")}
                      >
                        Arsipkan
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {(view === "overview" || view === "incoming") && (
        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
          <CardHeader>
            <CardTitle>Kotak Masuk Jaring</CardTitle>
            <CardDescription>
              Validasi struktur pesan dan konversi cepat ke Baket menggunakan kontrak backend merge.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.incoming.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusTone(message.status)}>{message.status}</Badge>
                      <Badge
                        variant="outline"
                        className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                      >
                        {message.validationSummary}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                      >
                        {message.jaringCode}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                      >
                        {message.categoryName ?? "Belum ada kategori"}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-[var(--dc-text-primary)]">
                      {message.title || message.jaringAlias}
                    </h3>
                    <p className="text-[var(--dc-text-secondary)] text-sm">
                      {message.content || "Pesan belum memiliki isi teks."}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--dc-text-muted)] text-xs">
                      <span>Masuk: {formatDateTime(message.receivedAt)}</span>
                      <span>Kejadian: {formatDateTime(message.eventDateTime)}</span>
                      <span>GPS dibagikan: {formatDateTime(message.gpsSharedAt)}</span>
                      <span>Timestamp: {formatDateTime(message.reportTimestamp)}</span>
                      <span>Pengirim: {message.senderPhone}</span>
                      <span>Area: {message.areaName || "-"}</span>
                      <span>Bukti: {message.hasPhoto ? "Foto diterima" : "Belum ada foto"}</span>
                    </div>
                    {message.hasPhoto ? (
                      <div className="rounded-lg border border-[var(--dc-success)]/25 bg-[var(--dc-success-soft)] p-3 text-[var(--dc-success)] text-sm">
                        <p className="font-medium">Foto bukti</p>
                        {message.photoUrl ? (
                          <img
                            src={message.photoUrl}
                            alt={`Foto bukti ${message.title || message.jaringAlias}`}
                            className="mt-2 max-h-64 w-full max-w-md rounded-lg border border-[var(--dc-border-subtle)] object-cover"
                          />
                        ) : (
                          <p className="mt-2 text-[var(--dc-text-secondary)] text-xs">
                            Foto diterima oleh bot, tetapi file visual belum tersedia di storage. Kiriman lama sebelum
                            patch hanya punya metadata WA.
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[var(--dc-text-secondary)] text-xs">
                          <span>Media DB: {message.mediaCount}</span>
                          <span>File: {message.photoFileId || "-"}</span>
                          <span>WA ID: {message.photoMessageId || "-"}</span>
                          {message.photoCaption ? <span>Caption: {message.photoCaption}</span> : null}
                        </div>
                      </div>
                    ) : null}
                    {message.latitude !== null && message.longitude !== null ? (
                      <div className="grid gap-3 rounded-lg border border-[var(--dc-border-subtle)] bg-[var(--dc-card)] p-3 md:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="space-y-1 text-[var(--dc-text-secondary)] text-sm">
                          <p className="font-medium text-[var(--dc-text-primary)]">Lokasi kejadian</p>
                          <p className="font-mono text-xs">
                            {message.latitude.toFixed(7)}, {message.longitude.toFixed(7)}
                          </p>
                          <p className="text-[var(--dc-text-muted)] text-xs">
                            Akurasi: {message.gpsAccuracyMeters !== null ? `${message.gpsAccuracyMeters} m` : "-"}
                          </p>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="mt-2 border-[var(--dc-border-subtle)] bg-transparent text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                          >
                            <a
                              href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                              rel="noreferrer"
                              target="_blank"
                            >
                              Buka di Google Maps
                            </a>
                          </Button>
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                          rel="noreferrer"
                          target="_blank"
                          aria-label="Buka koordinat laporan di Google Maps"
                        >
                          <LeafletLocationPreview
                            latitude={message.latitude}
                            longitude={message.longitude}
                            title={message.title || message.jaringAlias}
                          />
                        </a>
                      </div>
                    ) : null}
                    <div className="max-w-xs">
                      <Select
                        value={message.categoryId ?? undefined}
                        onValueChange={(categoryId) => void assignCategory(message.id, categoryId)}
                        disabled={isBusy === `category:${message.id}` || workspace.reportCategories.length === 0}
                      >
                        <SelectTrigger className="border-[var(--dc-border-subtle)] bg-background/40 text-[var(--dc-text-primary)]">
                          <SelectValue placeholder="Pilih kategori laporan" />
                        </SelectTrigger>
                        <SelectContent>
                          {workspace.reportCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--dc-border-subtle)] bg-transparent text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                      disabled={isBusy === `validate:${message.id}`}
                      onClick={() => void validateIncoming(message.id)}
                    >
                      {isBusy === `validate:${message.id}` ? (
                        "Memvalidasi..."
                      ) : message.validationSummary === "VALID" ? (
                        <>
                          <ShieldCheck className="mr-2 size-4" />
                          Validasi ulang
                        </>
                      ) : (
                        "Validasi"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[var(--dc-success)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-success)]/90"
                      disabled={isBusy === `baket:${message.id}`}
                      onClick={() => void createBaket(message.id)}
                    >
                      Buat Baket
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-[var(--dc-danger)]/40 bg-transparent text-[var(--dc-danger)] hover:bg-[var(--dc-danger-soft)]"
                      disabled={isBusy === `delete:${message.id}`}
                      onClick={() => void deleteIncoming(message.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Hapus
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "baket" || view === "reports") && (
        <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
          <CardHeader>
            <CardTitle>{view === "reports" ? "Laporan Saya" : "Buat Baket & Draft"}</CardTitle>
            <CardDescription>Draft dan histori baket hasil validasi laporan Jaring.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.bakets.map((baket) => (
              <div
                key={baket.id}
                className="rounded-xl border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusTone(baket.status)}>{baket.status}</Badge>
                      <Badge
                        variant="outline"
                        className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                      >
                        {baket.id}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-[var(--dc-text-primary)]">
                      {baket.currentVersionTitle || "Tanpa judul versi aktif"}
                    </h3>
                    <p className="text-[var(--dc-text-secondary)] text-sm">
                      Jaring: {baket.primaryJaringAlias || baket.primaryJaringCode || "-"}
                    </p>
                    <p className="text-[var(--dc-text-muted)] text-sm">
                      {baket.summary || "Ringkasan field officer belum ditambahkan."}
                    </p>
                    <p className="text-[var(--dc-text-muted)] text-xs">Dibuat: {formatDateTime(baket.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {baket.status === "DRAFT" || baket.status === "READY_TO_SEND" ? (
                      <Button
                        size="sm"
                        className="bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                        disabled={isBusy === `submit:${baket.id}`}
                        onClick={() => void submitBaket(baket.id)}
                      >
                        Kirim ke OIM
                      </Button>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-[var(--dc-border-subtle)] text-[var(--dc-text-secondary)]"
                      >
                        Riwayat terkunci sesuai status
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "map") && (
        <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
            <CardHeader>
              <CardTitle>Peta Tugas</CardTitle>
              <CardDescription>Gabungan lokasi laporan Jaring dan ping lokasi terbaru petugas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="dc-map-shell">
                <Map className="h-[28rem]" center={mapCenter} zoom={7}>
                  {mapPoints.map((point) => (
                    <MapMarker key={point.id} longitude={point.longitude} latitude={point.latitude}>
                      <MarkerContent>
                        <div
                          className={`flex size-4 items-center justify-center rounded-full border-2 ${
                            point.kind === "self"
                              ? "border-[var(--dc-text-inverse)] bg-[var(--dc-primary)]"
                              : "border-[var(--dc-text-inverse)] bg-[var(--dc-success)]"
                          }`}
                        />
                      </MarkerContent>
                      <MarkerPopup>
                        <div className="space-y-1 text-sm">
                          <p className="font-semibold">{point.title}</p>
                          <p className="text-muted-foreground">{point.subtitle}</p>
                          <p className="font-mono text-xs">
                            {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                          </p>
                        </div>
                      </MarkerPopup>
                    </MapMarker>
                  ))}
                  <MapControls showZoom showLocate position="bottom-right" />
                </Map>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--dc-border-subtle)] bg-[var(--dc-card)]">
            <CardHeader>
              <CardTitle>Live Location</CardTitle>
              <CardDescription>
                Ping GPS dikirim ke endpoint `personnel-location-pings` milik baseline merge.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-4">
                <div className="flex items-center gap-3">
                  <Crosshair className="size-5 text-[var(--dc-primary)]" />
                  <div>
                    <p className="font-semibold text-[var(--dc-text-primary)]">Posisi terbaru</p>
                    <p className="text-[var(--dc-text-secondary)] text-sm">
                      {workspace.latestLocation
                        ? formatDateTime(workspace.latestLocation.capturedAt)
                        : "Belum ada ping aktif."}
                    </p>
                  </div>
                </div>
                {workspace.latestLocation ? (
                  <div className="mt-3 space-y-1 text-[var(--dc-text-secondary)] text-sm">
                    <p>
                      <span className="text-[var(--dc-text-muted)]">Koordinat:</span>{" "}
                      {workspace.latestLocation.latitude.toFixed(5)}, {workspace.latestLocation.longitude.toFixed(5)}
                    </p>
                    <p>
                      <span className="text-[var(--dc-text-muted)]">Akurasi:</span>{" "}
                      {workspace.latestLocation.gpsAccuracyMeters ?? "-"} m
                    </p>
                    <p>
                      <span className="text-[var(--dc-text-muted)]">Area:</span>{" "}
                      {workspace.latestLocation.areaName || "-"}
                    </p>
                  </div>
                ) : null}
              </div>
              <Button
                className="w-full bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                disabled={isBusy === "location:publish"}
                onClick={() => void publishOwnLocation()}
              >
                <RefreshCw className="mr-2 size-4" />
                Kirim Ping Lokasi
              </Button>
            </CardContent>
          </Card>
        </section>
      )}

      {view === "alert" && (
        <Card className="border-[var(--dc-danger)]/25 bg-[var(--dc-danger-soft)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[var(--dc-danger)]">
              <Radio className="size-5" />
              Panic & Emergency Flow
            </CardTitle>
            <CardDescription className="text-[var(--dc-text-secondary)]">
              Tombol darurat tetap berpusat pada pengiriman lokasi dan eskalasi ke coordinator/regional.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-3">
            <EmergencyStep
              icon={<MapPin className="size-4 text-[var(--dc-danger)]" />}
              title="1. Tangkap lokasi"
              description="Kirim ping lokasi terakhir dulu agar rantai komando menerima posisi paling aktual."
            />
            <EmergencyStep
              icon={<ShieldCheck className="size-4 text-[var(--dc-danger)]" />}
              title="2. Aktifkan SOP"
              description="Coordinator memeriksa Jaring aktif, coverage area, dan kanal WhatsApp pusat yang sedang online."
            />
            <EmergencyStep
              icon={<Send className="size-4 text-[var(--dc-danger)]" />}
              title="3. Eskalasi"
              description="Laporan diteruskan ke regional atau posko menggunakan channel resmi di level coordinator."
            />
            <div className="xl:col-span-3">
              <Button
                className="bg-[var(--dc-danger)] text-white hover:bg-[var(--dc-danger)]/90"
                disabled={isBusy === "location:publish"}
                onClick={() => void publishOwnLocation()}
              >
                Kirim Lokasi Darurat
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] p-4">
      <p className="text-[var(--dc-text-muted)] text-xs uppercase tracking-[0.22em]">{label}</p>
      <p className="mt-2 font-mono font-semibold text-3xl text-[var(--dc-text-primary)]">{value}</p>
    </div>
  );
}

function EmergencyStep({ description, icon, title }: { description: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="rounded-xl border border-[var(--dc-danger)]/25 bg-[var(--dc-card)] p-4 text-[var(--dc-text-primary)]">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-[var(--dc-text-secondary)] text-sm">{description}</p>
    </div>
  );
}
