"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Crosshair, MapPin, Radio, RefreshCw, Send, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Textarea } from "@/components/ui/textarea";
import type { FieldOfficerWorkspace } from "@/server/field-ops/types";

type FieldOfficerView =
  | "overview"
  | "tasks"
  | "jaring"
  | "incoming"
  | "baket"
  | "reports"
  | "map"
  | "alert";

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
    return "bg-emerald-500/15 text-emerald-200 border-emerald-400/35";
  }

  if (value.includes("IN_PROGRESS") || value.includes("ROUTED") || value.includes("READY")) {
    return "bg-cyan-500/15 text-cyan-200 border-cyan-400/35";
  }

  if (value.includes("DRAFT") || value.includes("RECEIVED") || value.includes("ASSIGNED")) {
    return "bg-amber-500/15 text-amber-100 border-amber-300/35";
  }

  if (value.includes("INACTIVE") || value.includes("ARCHIVED") || value.includes("ERROR")) {
    return "bg-red-500/15 text-red-200 border-red-400/35";
  }

  return "bg-white/10 text-white/80 border-white/15";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [forwardedAssignments, setForwardedAssignments] = useState<string[]>([]);
  const [jaringForm, setJaringForm] = useState({
    code: "",
    aliasName: "",
    whatsappNumber: "",
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
      await callback();
      await loadWorkspace();
    } catch (actionError) {
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

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal memvalidasi laporan.");
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
          <Card key={`loading-${index}`} className="border-white/10 bg-white/5">
            <CardHeader>
              <div className="h-4 w-28 animate-pulse rounded bg-white/10" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!workspace || !metrics) {
    return (
      <Alert className="border-red-400/30 bg-red-500/10 text-red-100">
        <AlertTriangle className="size-4" />
        <AlertTitle>Workspace tidak tersedia</AlertTitle>
        <AlertDescription>{error || "Data field officer belum dapat dibaca."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-white/10 bg-[var(--dc-surface)] text-[var(--dc-text-primary)]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-cyan-400/15 text-cyan-100">Field Officer Live Workspace</Badge>
              <Badge variant="outline" className="border-white/15 text-white/70">
                {workspace.profile.role}
              </Badge>
            </div>
            <CardTitle>{workspace.profile.name}</CardTitle>
            <CardDescription className="text-white/65">
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
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="text-base">Scope Operasi</CardTitle>
            <CardDescription className="text-white/65">
              Area primer dan permission aktif yang dibawa dari baseline merge.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/80">
            <div className="flex flex-wrap gap-2">
              {workspace.context.areaScopes.map((item) => (
                <Badge key={item.areaId} variant="outline" className="border-white/15 bg-white/5 text-white/80">
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
        <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-50">
          <AlertTriangle className="size-4" />
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {(view === "overview" || view === "tasks") && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Tugas Saya</CardTitle>
            <CardDescription className="text-white/65">
              Update status eksekusi lapangan dan tandai assignment yang perlu diteruskan ke coordinator.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.tasks.map((task) => {
              const action = nextTaskAction(task.assignmentStatus);
              const forwarded = forwardedAssignments.includes(task.assignmentId);

              return (
                <div key={task.assignmentId} className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(task.assignmentStatus)}>{task.assignmentStatus}</Badge>
                        <Badge variant="outline" className="border-white/15 text-white/70">
                          {task.priority}
                        </Badge>
                        {forwarded ? (
                          <Badge className="bg-fuchsia-500/15 text-fuchsia-100">Ditandai untuk diteruskan</Badge>
                        ) : null}
                      </div>
                      <h3 className="font-semibold text-lg text-white">{task.title}</h3>
                      <p className="text-sm text-white/70">{task.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
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
                          className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          disabled={isBusy === `task:${task.assignmentId}:${action.nextStatus}`}
                          onClick={() => void updateTaskStatus(task.assignmentId, action.nextStatus)}
                        >
                          {action.label}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-white/15 bg-transparent text-white hover:bg-white/10"
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
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Registrasi Jaring Baru</CardTitle>
              <CardDescription className="text-white/65">
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
                className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white"
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
                className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                disabled={isBusy === "jaring:create"}
                onClick={() => void createJaring()}
              >
                Simpan Jaring
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Jaring Binaan</CardTitle>
              <CardDescription className="text-white/65">
                Status aktif, volume laporan, dan aksi pemeliharaan dasar per Jaring.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {workspace.jaring.map((jaring) => (
                <div key={jaring.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(jaring.status)}>{jaring.status}</Badge>
                        <Badge variant="outline" className="border-white/15 text-white/70">
                          {jaring.code}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-white">{jaring.aliasName}</h3>
                      <p className="text-sm text-white/70">{jaring.whatsappNumber}</p>
                      <p className="text-sm text-white/55">{jaring.areaNames.join(", ") || "-"}</p>
                      {jaring.notes ? <p className="text-sm text-white/65">{jaring.notes}</p> : null}
                      <div className="flex gap-4 text-xs text-white/50">
                        <span>{jaring.messageCount} pesan</span>
                        <span>{jaring.baketCount} baket</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {jaring.status !== "ACTIVE" ? (
                        <Button
                          size="sm"
                          className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          disabled={isBusy === `jaring:${jaring.id}:activate`}
                          onClick={() => void changeJaringStatus(jaring.id, "activate")}
                        >
                          Aktifkan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-transparent text-white hover:bg-white/10"
                          disabled={isBusy === `jaring:${jaring.id}:deactivate`}
                          onClick={() => void changeJaringStatus(jaring.id, "deactivate")}
                        >
                          Nonaktifkan
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-400/40 bg-transparent text-red-100 hover:bg-red-500/10"
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
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Kotak Masuk Jaring</CardTitle>
            <CardDescription className="text-white/65">
              Validasi struktur pesan dan konversi cepat ke Baket menggunakan kontrak backend merge.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.incoming.map((message) => (
              <div key={message.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusTone(message.status)}>{message.status}</Badge>
                      <Badge variant="outline" className="border-white/15 text-white/70">
                        {message.validationSummary}
                      </Badge>
                      <Badge variant="outline" className="border-white/15 text-white/70">
                        {message.jaringCode}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">{message.title || message.jaringAlias}</h3>
                    <p className="text-sm text-white/70">{message.content || "Pesan belum memiliki isi teks."}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                      <span>Masuk: {formatDateTime(message.receivedAt)}</span>
                      <span>Pengirim: {message.senderPhone}</span>
                      <span>Area: {message.areaName || "-"}</span>
                      <span>Media: {message.mediaCount}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-transparent text-white hover:bg-white/10"
                      disabled={isBusy === `validate:${message.id}`}
                      onClick={() => void validateIncoming(message.id)}
                    >
                      Validasi
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      disabled={isBusy === `baket:${message.id}`}
                      onClick={() => void createBaket(message.id)}
                    >
                      Buat Baket
                    </Button>
                    {message.latitude !== null && message.longitude !== null ? (
                      <Button asChild size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10">
                        <a
                          href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Lihat Map
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(view === "overview" || view === "baket" || view === "reports") && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>{view === "reports" ? "Laporan Saya" : "Buat Baket & Draft"}</CardTitle>
            <CardDescription className="text-white/65">
              Draft dan histori baket hasil validasi laporan Jaring.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.bakets.map((baket) => (
              <div key={baket.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusTone(baket.status)}>{baket.status}</Badge>
                      <Badge variant="outline" className="border-white/15 text-white/70">
                        {baket.id}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">{baket.currentVersionTitle || "Tanpa judul versi aktif"}</h3>
                    <p className="text-sm text-white/70">
                      Jaring: {baket.primaryJaringAlias || baket.primaryJaringCode || "-"}
                    </p>
                    <p className="text-sm text-white/55">{baket.summary || "Ringkasan field officer belum ditambahkan."}</p>
                    <p className="text-xs text-white/45">Dibuat: {formatDateTime(baket.createdAt)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {(baket.status === "DRAFT" || baket.status === "READY_TO_SEND") ? (
                      <Button
                        size="sm"
                        className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                        disabled={isBusy === `submit:${baket.id}`}
                        onClick={() => void submitBaket(baket.id)}
                      >
                        Kirim ke OIM
                      </Button>
                    ) : (
                      <Badge variant="outline" className="border-white/15 text-white/70">
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
          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Peta Tugas</CardTitle>
              <CardDescription className="text-white/65">
                Gabungan lokasi laporan Jaring dan ping lokasi terbaru petugas.
              </CardDescription>
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
                              ? "border-cyan-100 bg-cyan-400"
                              : "border-emerald-100 bg-emerald-400"
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

          <Card className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle>Live Location</CardTitle>
              <CardDescription className="text-white/65">
                Ping GPS dikirim ke endpoint `personnel-location-pings` milik baseline merge.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center gap-3">
                  <Crosshair className="size-5 text-cyan-300" />
                  <div>
                    <p className="font-semibold text-white">Posisi terbaru</p>
                    <p className="text-sm text-white/65">
                      {workspace.latestLocation ? formatDateTime(workspace.latestLocation.capturedAt) : "Belum ada ping aktif."}
                    </p>
                  </div>
                </div>
                {workspace.latestLocation ? (
                  <div className="mt-3 space-y-1 text-sm text-white/70">
                    <p>
                      <span className="text-white/45">Koordinat:</span>{" "}
                      {workspace.latestLocation.latitude.toFixed(5)}, {workspace.latestLocation.longitude.toFixed(5)}
                    </p>
                    <p>
                      <span className="text-white/45">Akurasi:</span>{" "}
                      {workspace.latestLocation.gpsAccuracyMeters ?? "-"} m
                    </p>
                    <p>
                      <span className="text-white/45">Area:</span> {workspace.latestLocation.areaName || "-"}
                    </p>
                  </div>
                ) : null}
              </div>
              <Button
                className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
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
        <Card className="border-red-400/25 bg-red-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-100">
              <Radio className="size-5" />
              Panic & Emergency Flow
            </CardTitle>
            <CardDescription className="text-red-100/75">
              Tombol darurat tetap berpusat pada pengiriman lokasi dan eskalasi ke coordinator/regional.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-3">
            <EmergencyStep
              icon={<MapPin className="size-4 text-red-100" />}
              title="1. Tangkap lokasi"
              description="Kirim ping lokasi terakhir dulu agar rantai komando menerima posisi paling aktual."
            />
            <EmergencyStep
              icon={<ShieldCheck className="size-4 text-red-100" />}
              title="2. Aktifkan SOP"
              description="Coordinator memeriksa Jaring aktif, coverage area, dan kanal WhatsApp pusat yang sedang online."
            />
            <EmergencyStep
              icon={<Send className="size-4 text-red-100" />}
              title="3. Eskalasi"
              description="Laporan diteruskan ke regional atau posko menggunakan channel resmi di level coordinator."
            />
            <div className="xl:col-span-3">
              <Button
                className="bg-red-500 text-white hover:bg-red-400"
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
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">{label}</p>
      <p className="mt-2 font-mono text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmergencyStep({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-red-400/20 bg-black/20 p-4 text-red-50">
      <div className="flex items-center gap-2">
        {icon}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm text-red-100/80">{description}</p>
    </div>
  );
}
