"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerPopup,
} from "@/components/ui/map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  FieldOfficerIncoming,
  FieldOfficerTask,
  FieldOfficerWorkspace,
  ReportCategory,
} from "@/server/field-ops/types";
import { LeafletLocationPreview } from "./leaflet-location-preview";

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

  if (
    value.includes("COMPLETED") ||
    value.includes("ACTIVE") ||
    value.includes("VALID")
  ) {
    return "bg-emerald-500/15 text-emerald-200 border-emerald-400/35";
  }

  if (
    value.includes("IN_PROGRESS") ||
    value.includes("ROUTED") ||
    value.includes("READY")
  ) {
    return "bg-cyan-500/15 text-cyan-200 border-cyan-400/35";
  }

  if (
    value.includes("DRAFT") ||
    value.includes("RECEIVED") ||
    value.includes("ASSIGNED")
  ) {
    return "bg-amber-500/15 text-amber-100 border-amber-300/35";
  }

  if (
    value.includes("INACTIVE") ||
    value.includes("ARCHIVED") ||
    value.includes("ERROR")
  ) {
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

export function FieldOfficerOperationsPage({
  view,
}: {
  view: FieldOfficerView;
}) {
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [baketTab, setBaketTab] = useState(
    view === "reports" ? "sent" : "ready",
  );
  const [forwardedAssignments, setForwardedAssignments] = useState<string[]>(
    [],
  );
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
      const response = await fetch("/api/field-officer/workspace", {
        cache: "no-store",
      });
      const body = (await response.json()) as
        FieldOfficerWorkspace | { message?: string };

      if (!response.ok) {
        throw new Error(
          "message" in body
            ? body.message
            : "Gagal memuat workspace field officer.",
        );
      }

      setWorkspace(body as FieldOfficerWorkspace);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat workspace field officer.",
      );
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
      activeTasks: workspace.tasks.filter(
        (item) => item.assignmentStatus !== "COMPLETED",
      ).length,
      activeJaring: workspace.jaring.filter((item) => item.status === "ACTIVE")
        .length,
      pendingIncoming: workspace.incoming.filter(
        (item) => item.validationSummary !== "VALID",
      ).length,
      readyToSendBakets: workspace.bakets.filter(
        (item) => item.status === "DRAFT" || item.status === "READY_TO_SEND",
      ).length,
    };
  }, [workspace]);

  const readyToSendBakets = useMemo(
    () =>
      workspace?.bakets.filter(
        (item) =>
          item.status === "DRAFT" || item.status === "READY_TO_SEND",
      ) ?? [],
    [workspace],
  );
  const submittedBakets = useMemo(
    () =>
      workspace?.bakets.filter(
        (item) =>
          item.status !== "DRAFT" && item.status !== "READY_TO_SEND",
      ) ?? [],
    [workspace],
  );

  const runAction = async (key: string, callback: () => Promise<void>) => {
    try {
      setIsBusy(key);
      setActionNotice(null);
      await callback();
      await loadWorkspace();
      setError(null);
    } catch (actionError) {
      setActionNotice(null);
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Aksi gagal dijalankan.",
      );
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
          areaIds: [
            jaringForm.areaId || workspace.context.areaScopes[0]?.areaId,
          ].filter(Boolean),
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
      const response = await fetch(
        `/api/field-officer/task-assignments/${assignmentId}/status`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nextStatus }),
        },
      );

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal memperbarui tugas.");
      }
    });
  };

  const validateIncoming = async (messageId: string) => {
    await runAction(`validate:${messageId}`, async () => {
      const response = await fetch(
        `/api/field-officer/incoming/${messageId}/validate`,
        {
          method: "POST",
        },
      );
      const body = (await response.json().catch(() => null)) as
        | { validationSummary?: string; title?: string | null }
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          (body && "message" in body ? body.message : null) ||
            "Gagal memvalidasi laporan.",
        );
      }

      const result =
        body && "validationSummary" in body ? body.validationSummary : null;
      setActionNotice(
        result === "VALID"
          ? "Validasi berhasil. Laporan sudah lengkap dan siap dibuat menjadi Baket."
          : "Validasi selesai. Cek badge dan kelengkapan laporan sebelum dibuat menjadi Baket.",
      );
    });
  };

  const createBaket = async (
    messageId: string,
    payload: {
      categoryId: string;
      urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
      title?: string;
      normalizedContent?: string;
      fieldOfficerNote?: string;
      taskAssignmentId?: string;
      eventTime?: string;
    },
  ) => {
    await runAction(`baket:${messageId}`, async () => {
      const response = await fetch(
        `/api/field-officer/incoming/${messageId}/baket`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal membuat baket.");
      }

      setBaketTab("ready-to-send");
      setActionNotice(
        "Baket berhasil dibuat dan siap dikirim. Tekan Kirim ke OIM agar masuk ke Laporan Masuk OIM.",
      );
    });
  };

  const deleteIncoming = async (messageId: string) => {
    await runAction(`delete:${messageId}`, async () => {
      const response = await fetch(
        `/api/field-officer/incoming/${messageId}/delete`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal menghapus laporan.");
      }
    });
  };

  const submitBaket = async (baketId: string) => {
    await runAction(`submit:${baketId}`, async () => {
      const response = await fetch(
        `/api/field-officer/baket/${baketId}/submit`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal mengirim baket.");
      }

      setActionNotice(
        "Baket berhasil dikirim ke OIM dan sudah masuk ke antrean Laporan Masuk.",
      );
      setBaketTab("sent");
    });
  };

  const changeJaringStatus = async (
    jaringId: string,
    action: "activate" | "deactivate" | "archive",
  ) => {
    await runAction(`jaring:${jaringId}:${action}`, async () => {
      const response = await fetch(
        `/api/field-officer/jaring/${jaringId}/status`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            reason: `Status diubah dari workspace field officer ke mode ${action}.`,
          }),
        },
      );

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
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
          });
        },
      );

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

    const incomingPoints = [...workspace.incoming, ...workspace.baketCandidates]
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

    const lng =
      mapPoints.reduce((sum, item) => sum + item.longitude, 0) /
      mapPoints.length;
    const lat =
      mapPoints.reduce((sum, item) => sum + item.latitude, 0) /
      mapPoints.length;

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
        <AlertDescription>
          {error || "Data field officer belum dapat dibaca."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <section className="grid gap-3 xl:grid-cols-[1.4fr_0.6fr]">
        <Card className="border-white/10 bg-[var(--dc-surface)] text-[var(--dc-text-primary)]">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-cyan-400/15 text-cyan-100">
                Field Officer Live Workspace
              </Badge>
              <Badge
                variant="outline"
                className="border-white/15 text-white/70"
              >
                {workspace.profile.role}
              </Badge>
            </div>
            <CardTitle>{workspace.profile.name}</CardTitle>
            <CardDescription className="text-white/65">
              {workspace.context.positionTitle} •{" "}
              {workspace.context.organizationUnitName}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Tugas Aktif" value={metrics.activeTasks} />
            <MetricCard label="Jaring Aktif" value={metrics.activeJaring} />
            <MetricCard
              label="Laporan Pending"
              value={metrics.pendingIncoming}
            />
            <MetricCard
              label="Baket Siap Dikirim"
              value={metrics.readyToSendBakets}
            />
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
                <Badge
                  key={item.areaId}
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white/80"
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
        <Alert className="border-amber-400/30 bg-amber-500/10 text-amber-50">
          <AlertTriangle className="size-4" />
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {actionNotice ? (
        <Alert className="border-emerald-400/30 bg-emerald-500/10 text-emerald-50">
          <CheckCircle2 className="size-4" />
          <AlertTitle>Aksi berhasil</AlertTitle>
          <AlertDescription>{actionNotice}</AlertDescription>
        </Alert>
      ) : null}

      {(view === "overview" || view === "tasks") && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle>Tugas Saya</CardTitle>
            <CardDescription className="text-white/65">
              Update status eksekusi lapangan dan tandai assignment yang perlu
              diteruskan ke coordinator.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.tasks.map((task) => {
              const action = nextTaskAction(task.assignmentStatus);
              const forwarded = forwardedAssignments.includes(
                task.assignmentId,
              );

              return (
                <div
                  key={task.assignmentId}
                  className="rounded-xl border border-white/10 bg-black/15 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(task.assignmentStatus)}>
                          {task.assignmentStatus}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-white/15 text-white/70"
                        >
                          {task.priority}
                        </Badge>
                        {forwarded ? (
                          <Badge className="bg-fuchsia-500/15 text-fuchsia-100">
                            Ditandai untuk diteruskan
                          </Badge>
                        ) : null}
                      </div>
                      <h3 className="font-semibold text-lg text-white">
                        {task.title}
                      </h3>
                      <p className="text-sm text-white/70">
                        {task.description}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                        <span>Due: {formatDateTime(task.dueDate)}</span>
                        <span>
                          Target: {task.targetAreas.join(", ") || "-"}
                        </span>
                        <span>Sumber: {task.sourceLabel || "-"}</span>
                        <span>Pengirim: {task.assignerName || "-"}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {action ? (
                        <Button
                          size="sm"
                          className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                          disabled={
                            isBusy ===
                            `task:${task.assignmentId}:${action.nextStatus}`
                          }
                          onClick={() =>
                            void updateTaskStatus(
                              task.assignmentId,
                              action.nextStatus,
                            )
                          }
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
                FO tetap memegang ownership data Jaring. Nomor bot pusat
                dikelola coordinator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Kode Jaring"
                value={jaringForm.code}
                onChange={(event) =>
                  setJaringForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Alias / Nama sandi"
                value={jaringForm.aliasName}
                onChange={(event) =>
                  setJaringForm((current) => ({
                    ...current,
                    aliasName: event.target.value,
                  }))
                }
              />
              <Input
                placeholder="Nomor WhatsApp"
                value={jaringForm.whatsappNumber}
                onChange={(event) =>
                  setJaringForm((current) => ({
                    ...current,
                    whatsappNumber: event.target.value,
                  }))
                }
              />
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white"
                value={jaringForm.clusterId}
                onChange={(event) =>
                  setJaringForm((current) => ({
                    ...current,
                    clusterId: event.target.value,
                  }))
                }
              >
                <option value="">Pilih cluster jaring</option>
                {workspace.jaringClusters.map((cluster) => (
                  <option key={cluster.id} value={cluster.id}>
                    {cluster.name}
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white"
                value={jaringForm.areaId}
                onChange={(event) =>
                  setJaringForm((current) => ({
                    ...current,
                    areaId: event.target.value,
                  }))
                }
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
                onChange={(event) =>
                  setJaringForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
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
                Status aktif, volume laporan, dan aksi pemeliharaan dasar per
                Jaring.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {workspace.jaring.map((jaring) => (
                <div
                  key={jaring.id}
                  className="rounded-xl border border-white/10 bg-black/15 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusTone(jaring.status)}>
                          {jaring.status}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="border-white/15 text-white/70"
                        >
                          {jaring.code}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-white">
                        {jaring.aliasName}
                      </h3>
                      <p className="text-sm text-white/70">
                        {jaring.whatsappNumber}
                      </p>
                      <p className="text-sm text-cyan-200">
                        {jaring.clusterName || "Belum ada cluster"}
                      </p>
                      <p className="text-sm text-white/55">
                        {jaring.areaNames.join(", ") || "-"}
                      </p>
                      {jaring.notes ? (
                        <p className="text-sm text-white/65">{jaring.notes}</p>
                      ) : null}
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
                          onClick={() =>
                            void changeJaringStatus(jaring.id, "activate")
                          }
                        >
                          Aktifkan
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/15 bg-transparent text-white hover:bg-white/10"
                          disabled={isBusy === `jaring:${jaring.id}:deactivate`}
                          onClick={() =>
                            void changeJaringStatus(jaring.id, "deactivate")
                          }
                        >
                          Nonaktifkan
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-400/40 bg-transparent text-red-100 hover:bg-red-500/10"
                        disabled={isBusy === `jaring:${jaring.id}:archive`}
                        onClick={() =>
                          void changeJaringStatus(jaring.id, "archive")
                        }
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
              Validasi judul, isi, foto, GPS, waktu, Jaring, dan sumber.
              Kategori serta urgency diisi saat membuat Baket.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {workspace.incoming.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-white/10 bg-black/15 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusTone(message.status)}>
                        {message.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-white/15 text-white/70"
                      >
                        {message.validationSummary}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-white/15 text-white/70"
                      >
                        {message.jaringCode}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-white">
                      {message.title || message.jaringAlias}
                    </h3>
                    <p className="text-sm text-white/70">
                      {message.content || "Pesan belum memiliki isi teks."}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                      <span>Masuk: {formatDateTime(message.receivedAt)}</span>
                      <span>
                        Kejadian: {formatDateTime(message.eventDateTime)}
                      </span>
                      <span>
                        GPS dibagikan: {formatDateTime(message.gpsSharedAt)}
                      </span>
                      <span>
                        Timestamp: {formatDateTime(message.reportTimestamp)}
                      </span>
                      <span>Pengirim: {message.senderPhone}</span>
                      <span>Area: {message.areaName || "-"}</span>
                      <span>
                        Bukti:{" "}
                        {message.hasPhoto ? "Foto diterima" : "Belum ada foto"}
                      </span>
                    </div>
                    {message.hasPhoto ? (
                      <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-50">
                        <p className="font-medium">Foto bukti</p>
                        {message.photoUrl ? (
                          <img
                            src={message.photoUrl}
                            alt={`Foto bukti ${message.title || message.jaringAlias}`}
                            className="mt-2 max-h-64 w-full max-w-md rounded-lg border border-white/10 object-cover"
                          />
                        ) : (
                          <p className="mt-2 text-xs text-emerald-100/75">
                            Foto diterima oleh bot, tetapi file visual belum
                            tersedia di storage. Kiriman lama sebelum patch
                            hanya punya metadata WA.
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-emerald-100/75">
                          <span>Media DB: {message.mediaCount}</span>
                          <span>File: {message.photoFileId || "-"}</span>
                          <span>WA ID: {message.photoMessageId || "-"}</span>
                          {message.photoCaption ? (
                            <span>Caption: {message.photoCaption}</span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {message.latitude !== null && message.longitude !== null ? (
                      <div className="grid gap-3 rounded-lg border border-white/10 bg-black/20 p-3 md:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="space-y-1 text-sm text-white/70">
                          <p className="font-medium text-white">
                            Lokasi kejadian
                          </p>
                          <p className="font-mono text-xs">
                            {message.latitude.toFixed(7)},{" "}
                            {message.longitude.toFixed(7)}
                          </p>
                          <p className="text-xs text-white/55">
                            Akurasi:{" "}
                            {message.gpsAccuracyMeters !== null
                              ? `${message.gpsAccuracyMeters} m`
                              : "-"}
                          </p>
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="mt-2 border-white/15 bg-transparent text-white hover:bg-white/10"
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
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/15 bg-transparent text-white hover:bg-white/10"
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
                      variant="outline"
                      className="border-red-400/40 bg-transparent text-red-100 hover:bg-red-500/10"
                      disabled={isBusy === `delete:${message.id}`}
                      onClick={() => void deleteIncoming(message.id)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Tolak
                    </Button>
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
            <CardTitle>
              {view === "reports" ? "Laporan Saya" : "Buat Baket"}
            </CardTitle>
            <CardDescription className="text-white/65">
              Bentuk Baket dari laporan Jaring, kirim ke OIM, dan pantau
              statusnya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={baketTab} onValueChange={setBaketTab}>
              <TabsList>
                <TabsTrigger value="ready">
                  Siap Dibuat ({workspace.baketCandidates.length})
                </TabsTrigger>
                <TabsTrigger value="ready-to-send">
                  Siap Dikirim ({readyToSendBakets.length})
                </TabsTrigger>
                <TabsTrigger value="sent">
                  Terkirim ({submittedBakets.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="ready" className="grid gap-4 pt-3">
                {workspace.baketCandidates.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/55">
                    Belum ada pesan valid yang menunggu pembentukan Baket.
                  </p>
                ) : null}
                {workspace.baketCandidates.map((message) => (
                  <BaketCandidateForm
                    key={message.id}
                    message={message}
                    categories={workspace.reportCategories}
                    tasks={workspace.tasks}
                    busy={isBusy === `baket:${message.id}`}
                    onCreate={(payload) => createBaket(message.id, payload)}
                  />
                ))}
              </TabsContent>
              <TabsContent
                value="ready-to-send"
                className="grid gap-3 pt-3"
              >
                {readyToSendBakets.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/55">
                    Belum ada Baket yang menunggu pengiriman ke OIM.
                  </p>
                ) : null}
                {readyToSendBakets.map((baket) => (
                  <div
                    key={baket.id}
                    className="rounded-xl border border-white/10 bg-black/15 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusTone(baket.status)}>
                            SIAP DIKIRIM
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/15 text-white/70"
                          >
                            {baket.categoryName || "Kategori legacy"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/15 text-white/70"
                          >
                            {baket.clusterName || "Klaster legacy"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/15 text-white/70"
                          >
                            {baket.urgency || "-"}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-white">
                          {baket.currentVersionTitle ||
                            "Tanpa judul versi aktif"}
                        </h3>
                        <p className="text-sm text-white/70">
                          Jaring:{" "}
                          {baket.primaryJaringAlias ||
                            baket.primaryJaringCode ||
                            "-"}
                        </p>
                        <p className="text-sm text-white/55">
                          {baket.summary ||
                            "Catatan Field Officer belum ditambahkan."}
                        </p>
                        <p className="text-xs text-white/45">
                          Dibuat: {formatDateTime(baket.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                        disabled={isBusy === `submit:${baket.id}`}
                        onClick={() => void submitBaket(baket.id)}
                      >
                        <Send className="mr-2 size-4" />
                        Kirim ke OIM
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="sent" className="grid gap-3 pt-3">
                {submittedBakets.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/55">
                    Belum ada Baket yang telah dikirim ke OIM.
                  </p>
                ) : null}
                {submittedBakets.map((baket) => (
                  <div
                    key={baket.id}
                    className="rounded-xl border border-white/10 bg-black/15 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={statusTone(baket.status)}>
                            {baket.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/15 text-white/70"
                          >
                            {baket.categoryName || "Kategori legacy"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/15 text-white/70"
                          >
                            {baket.urgency || "-"}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-white">
                          {baket.currentVersionTitle ||
                            "Tanpa judul versi aktif"}
                        </h3>
                        <p className="text-sm text-white/55">
                          Dikirim ke OIM · data terkunci dan hanya dapat dilihat.
                        </p>
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link
                          href={`/dashboard/field-officer/buat-baket/${baket.id}`}
                        >
                          Lihat Baket
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
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
                    <MapMarker
                      key={point.id}
                      longitude={point.longitude}
                      latitude={point.latitude}
                    >
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
                          <p className="text-muted-foreground">
                            {point.subtitle}
                          </p>
                          <p className="font-mono text-xs">
                            {point.latitude.toFixed(5)},{" "}
                            {point.longitude.toFixed(5)}
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
                Ping GPS dikirim ke endpoint `personnel-location-pings` milik
                baseline merge.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-black/15 p-4">
                <div className="flex items-center gap-3">
                  <Crosshair className="size-5 text-cyan-300" />
                  <div>
                    <p className="font-semibold text-white">Posisi terbaru</p>
                    <p className="text-sm text-white/65">
                      {workspace.latestLocation
                        ? formatDateTime(workspace.latestLocation.capturedAt)
                        : "Belum ada ping aktif."}
                    </p>
                  </div>
                </div>
                {workspace.latestLocation ? (
                  <div className="mt-3 space-y-1 text-sm text-white/70">
                    <p>
                      <span className="text-white/45">Koordinat:</span>{" "}
                      {workspace.latestLocation.latitude.toFixed(5)},{" "}
                      {workspace.latestLocation.longitude.toFixed(5)}
                    </p>
                    <p>
                      <span className="text-white/45">Akurasi:</span>{" "}
                      {workspace.latestLocation.gpsAccuracyMeters ?? "-"} m
                    </p>
                    <p>
                      <span className="text-white/45">Area:</span>{" "}
                      {workspace.latestLocation.areaName || "-"}
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
              Tombol darurat tetap berpusat pada pengiriman lokasi dan eskalasi
              ke coordinator/regional.
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
      <p className="text-xs uppercase tracking-[0.22em] text-white/45">
        {label}
      </p>
      <p className="mt-2 font-mono text-3xl font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function BaketCandidateForm({
  message,
  categories,
  tasks,
  busy,
  onCreate,
}: {
  message: FieldOfficerIncoming;
  categories: ReportCategory[];
  tasks: FieldOfficerTask[];
  busy: boolean;
  onCreate: (payload: {
    categoryId: string;
    urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    title?: string;
    normalizedContent?: string;
    fieldOfficerNote?: string;
    taskAssignmentId?: string;
    eventTime?: string;
  }) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [urgency, setUrgency] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">(
    "NORMAL",
  );
  const [urgencyConfirmed, setUrgencyConfirmed] = useState(false);
  const [title, setTitle] = useState(message.title || "");
  const [normalizedContent, setNormalizedContent] = useState(
    message.content || "",
  );
  const [fieldOfficerNote, setFieldOfficerNote] = useState("");
  const [taskAssignmentId, setTaskAssignmentId] = useState("");
  const [eventTime, setEventTime] = useState(
    message.eventDateTime
      ? new Date(message.eventDateTime).toISOString().slice(0, 16)
      : "",
  );
  const canCreate = Boolean(
    categoryId && urgencyConfirmed && title.trim() && normalizedContent.trim(),
  );

  return (
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={statusTone(message.status)}>{message.status}</Badge>
        <Badge variant="outline" className="border-white/15 text-white/70">
          {message.jaringCode}
        </Badge>
        <Badge variant="outline" className="border-cyan-400/30 text-cyan-100">
          Klaster: {message.clusterName || "Belum terpetakan"}
        </Badge>
      </div>
      <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-white">Sumber pesan Jaring</p>
            <p className="text-sm text-white/65">{message.content}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/50">
              <span>Pengirim: {message.senderPhone}</span>
              <span>Masuk: {formatDateTime(message.receivedAt)}</span>
              <span>Kejadian: {formatDateTime(message.eventDateTime)}</span>
              <span>Area: {message.areaName || "-"}</span>
              <span>
                Foto: {message.hasPhoto ? "tersedia" : "tidak tersedia"}
              </span>
            </div>
          </div>
          {message.photoUrl ? (
            <img
              src={message.photoUrl}
              alt={`Evidence ${message.title || message.jaringAlias}`}
              className="max-h-56 w-full max-w-md rounded-lg border border-white/10 object-cover"
            />
          ) : null}
          {message.latitude !== null && message.longitude !== null ? (
            <p className="font-mono text-xs text-white/60">
              GPS {message.latitude.toFixed(7)}, {message.longitude.toFixed(7)}{" "}
              · akurasi {message.gpsAccuracyMeters ?? "-"} m
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1 text-sm text-white/70">
              Kategori laporan <span className="text-red-300">wajib</span>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="border-white/15 bg-black/20 text-white">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((item) => item.isActive)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1 text-sm text-white/70">
              Tingkat urgency <span className="text-red-300">wajib</span>
              <Select
                value={urgency}
                onValueChange={(value) => {
                  setUrgency(value as typeof urgency);
                  setUrgencyConfirmed(false);
                }}
              >
                <SelectTrigger className="border-white/15 bg-black/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="NORMAL">NORMAL</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="URGENT">URGENT</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={urgencyConfirmed}
              onChange={(event) => setUrgencyConfirmed(event.target.checked)}
              className="size-4 accent-emerald-400"
            />
            Saya mengonfirmasi urgency {urgency} sebagai keputusan Field
            Officer.
          </label>
        </div>
        <div className="grid content-start gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <label className="grid gap-1 text-sm text-white/70">
            Judul Baket
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="border-white/15 bg-black/20 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-white/70">
            Isi normalisasi
            <Textarea
              value={normalizedContent}
              onChange={(event) => setNormalizedContent(event.target.value)}
              className="min-h-28 border-white/15 bg-black/20 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-white/70">
            Waktu kejadian
            <Input
              type="datetime-local"
              value={eventTime}
              onChange={(event) => setEventTime(event.target.value)}
              className="border-white/15 bg-black/20 text-white"
            />
          </label>
          <label className="grid gap-1 text-sm text-white/70">
            Tugas terkait (opsional)
            <Select
              value={taskAssignmentId || "none"}
              onValueChange={(value) =>
                setTaskAssignmentId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger className="border-white/15 bg-black/20 text-white">
                <SelectValue placeholder="Tanpa tugas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tanpa tugas</SelectItem>
                {tasks.map((task) => (
                  <SelectItem key={task.assignmentId} value={task.assignmentId}>
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-sm text-white/70">
            Catatan Field Officer
            <Textarea
              value={fieldOfficerNote}
              onChange={(event) => setFieldOfficerNote(event.target.value)}
              className="border-white/15 bg-black/20 text-white"
            />
          </label>
          <Button
            disabled={!canCreate || busy}
            className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
            onClick={() =>
              void onCreate({
                categoryId,
                urgency,
                title: title.trim(),
                normalizedContent: normalizedContent.trim(),
                fieldOfficerNote: fieldOfficerNote.trim() || undefined,
                taskAssignmentId: taskAssignmentId || undefined,
                eventTime: eventTime
                  ? new Date(eventTime).toISOString()
                  : undefined,
              })
            }
          >
            {busy ? "Membuat Baket..." : "Buat Baket"}
          </Button>
        </div>
      </div>
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
