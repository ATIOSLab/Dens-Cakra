"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Link from "next/link";

import { AlertTriangle, CheckCircle2, Crosshair, Inbox, MapPin, Radio, Send, ShieldCheck, Users } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map, MapControls, MapMarker, MarkerContent, MarkerPopup } from "@/components/ui/map";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TablePagination } from "@/components/ui/table-pagination";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import type {
  FieldOfficerIncoming,
  FieldOfficerJaring,
  FieldOfficerTask,
  FieldOfficerWorkspace,
  ReportCategory,
} from "@/server/field-ops/types";

import { LeafletLocationPreview } from "./leaflet-location-preview";

type FieldOfficerView = "overview" | "tasks" | "jaring" | "incoming" | "baket" | "reports" | "map" | "alert";

const FORWARDED_STORAGE_KEY = "dens-cakra-forwarded-assignments";
const EMPTY_BAKET_FILTERS = {
  categoryId: "",
  jaringClusterId: "",
  from: "",
  to: "",
};

type PendingFieldOfficerAction = {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
};

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function baketStatusLabel(status?: string | null, sentToPositionTitle?: string | null) {
  switch ((status || "").toUpperCase()) {
    case "DRAFT":
      return "Draf";
    case "READY_TO_SEND":
      return "Siap dikirim";
    case "SENT_TO_OIM":
      return sentToPositionTitle ? `Sudah dikirim ke ${sentToPositionTitle}` : "Sudah dikirim";
    case "UNDER_VERIFICATION":
      return "Sedang diverifikasi";
    case "NEEDS_DEVELOPMENT":
      return "Perlu pengembangan";
    case "VERIFIED":
      return "Terverifikasi";
    case "REJECTED":
      return "Ditolak";
    default:
      return status || "-";
  }
}

function baketUrgencyLabel(urgency?: string | null) {
  return urgency ? urgency.toUpperCase() : "-";
}

function urgencyTone(urgency?: string | null) {
  switch ((urgency || "").toUpperCase()) {
    case "LOW":
      return "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "NORMAL":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "HIGH":
      return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "URGENT":
      return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "border-[var(--tactical-border)] text-[var(--tactical-text-secondary)]";
  }
}

function statusTone(status: string) {
  const value = status.toUpperCase();

  if (value.includes("COMPLETED") || value.includes("ACTIVE") || value.includes("VALID")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }

  if (
    value.includes("IN_PROGRESS") ||
    value.includes("ROUTED") ||
    value.includes("READY") ||
    value.includes("SENT_TO_OIM") ||
    value.includes("UNDER_VERIFICATION")
  ) {
    return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
  }

  if (
    value.includes("DRAFT") ||
    value.includes("RECEIVED") ||
    value.includes("ASSIGNED") ||
    value.includes("NEEDS_DEVELOPMENT")
  ) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  }

  if (
    value.includes("INACTIVE") ||
    value.includes("ARCHIVED") ||
    value.includes("ERROR") ||
    value.includes("REJECTED")
  ) {
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }

  return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
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

function getClassificationStyles(value?: string | null) {
  const norm = (value ?? "").toUpperCase();
  switch (norm) {
    case "BIASA":
      return {
        color: "#3B82F6", // Blue
        bgColor: "#3B82F615",
        borderColor: "#3B82F630",
        label: "BIASA",
      };
    case "TERBATAS":
      return {
        color: "#10B981", // Green
        bgColor: "#10B98115",
        borderColor: "#10B98130",
        label: "TERBATAS",
      };
    case "RAHASIA":
      return {
        color: "#F59E0B", // Yellow/Gold
        bgColor: "#F59E0B15",
        borderColor: "#F59E0B30",
        label: "RAHASIA",
      };
    case "SANGAT_RAHASIA":
      return {
        color: "#EF4444", // Red
        bgColor: "#EF444415",
        borderColor: "#EF444430",
        label: "SANGAT RAHASIA",
      };
    default:
      return {
        color: "#7C8798", // Gray
        bgColor: "#7C879815",
        borderColor: "#7C879830",
        label: value ?? "BIASA",
      };
  }
}

export function FieldOfficerOperationsPage({ view }: { view: FieldOfficerView }) {
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [baketTab, setBaketTab] = useState(view === "reports" ? "sent" : "ready-to-send");
  const [readyToSendPage, setReadyToSendPage] = useState(1);
  const [sentPage, setSentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const [forwardedAssignments, setForwardedAssignments] = useState<string[]>([]);
  const [jaringForm, setJaringForm] = useState({
    code: "",
    aliasName: "",
    whatsappNumber: "",
    clusterId: "",
    notes: "",
    areaId: "",
  });
  const [showSaveJaringConfirm, setShowSaveJaringConfirm] = useState(false);
  const [baketFilterDraft, setBaketFilterDraft] = useState(EMPTY_BAKET_FILTERS);
  const [appliedBaketFilters, setAppliedBaketFilters] = useState(EMPTY_BAKET_FILTERS);
  const [pendingAction, setPendingAction] = useState<PendingFieldOfficerAction | null>(null);

  const [taskViewMode, setTaskViewMode] = useState<"card" | "table">("card");
  const [taskClassificationFilter, setTaskClassificationFilter] = useState("");
  const [taskPeriodStart, setTaskPeriodStart] = useState("");
  const [taskPeriodEnd, setTaskPeriodEnd] = useState("");

  const [tasksPage, setTasksPage] = useState(1);
  const [tasksLimit, setTasksLimit] = useState(10);
  const [incomingPage, setIncomingPage] = useState(1);
  const [incomingLimit, setIncomingLimit] = useState(10);

  const filteredTasks = useMemo(() => {
    if (!workspace?.tasks) return [];
    return workspace.tasks.filter((task) => {
      if (taskClassificationFilter && task.classification !== taskClassificationFilter) {
        return false;
      }
      if (task.dueDate) {
        const taskTime = new Date(task.dueDate).getTime();
        if (taskPeriodStart) {
          const startTime = new Date(`${taskPeriodStart}T00:00:00`).getTime();
          if (taskTime < startTime) return false;
        }
        if (taskPeriodEnd) {
          const endTime = new Date(`${taskPeriodEnd}T23:59:59`).getTime();
          if (taskTime > endTime) return false;
        }
      } else if (taskPeriodStart || taskPeriodEnd) {
        return false;
      }
      return true;
    });
  }, [workspace?.tasks, taskClassificationFilter, taskPeriodStart, taskPeriodEnd]);

  useEffect(() => {
    setTasksPage(1);
  }, [filteredTasks]);

  const safeTasksPage = Math.min(tasksPage, Math.max(1, Math.ceil(filteredTasks.length / tasksLimit)));
  const paginatedTasks = useMemo(() => {
    return filteredTasks.slice((safeTasksPage - 1) * tasksLimit, safeTasksPage * tasksLimit);
  }, [filteredTasks, safeTasksPage, tasksLimit]);

  const totalIncoming = workspace?.incoming?.length ?? 0;
  const totalIncomingPages = Math.max(1, Math.ceil(totalIncoming / incomingLimit));
  const safeIncomingPage = Math.min(incomingPage, totalIncomingPages);
  const paginatedIncoming = useMemo(() => {
    if (!workspace?.incoming) return [];
    return workspace.incoming.slice((safeIncomingPage - 1) * incomingLimit, safeIncomingPage * incomingLimit);
  }, [workspace?.incoming, safeIncomingPage, incomingLimit]);

  useEffect(() => {
    setIncomingPage(1);
  }, [workspace?.incoming]);

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

  const loadWorkspace = useCallback(async (filters = appliedBaketFilters) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      if (filters.jaringClusterId) params.set("jaringClusterId", filters.jaringClusterId);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);

      const response = await fetch(`/api/field-officer/workspace${params.toString() ? `?${params.toString()}` : ""}`, {
        cache: "no-store",
      });
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
  }, [appliedBaketFilters]);

  useEffect(() => {
    void loadWorkspace(appliedBaketFilters);
  }, [appliedBaketFilters, loadWorkspace]);

  const metrics = useMemo(() => {
    if (!workspace) {
      return null;
    }

    return {
      activeTasks: workspace.tasks.filter((item) => item.assignmentStatus !== "COMPLETED").length,
      activeJaring: workspace.jaring.filter((item) => item.status === "ACTIVE").length,
      pendingIncoming: workspace.incoming.filter((item) => item.validationSummary !== "VALID").length,
      readyToSendBakets:
        workspace.baketCandidates.length +
        workspace.bakets.filter((item) => item.status === "DRAFT" || item.status === "READY_TO_SEND").length,
    };
  }, [workspace]);
  const registeredJaring = useMemo(() => workspace?.jaring ?? [], [workspace]);

  const readyToSendBakets = useMemo(
    () => workspace?.bakets.filter((item) => item.status === "DRAFT" || item.status === "READY_TO_SEND") ?? [],
    [workspace],
  );
  const submittedBakets = useMemo(
    () => workspace?.bakets.filter((item) => item.status !== "DRAFT" && item.status !== "READY_TO_SEND") ?? [],
    [workspace],
  );
  const pendingOutgoingCount = (workspace?.baketCandidates.length ?? 0) + readyToSendBakets.length;

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

  const setForwardedAssignment = (assignmentId: string, forwarded: boolean) => {
    const next = forwardedAssignments.includes(assignmentId)
      ? forwarded
        ? forwardedAssignments
        : forwardedAssignments.filter((item) => item !== assignmentId)
      : forwarded
        ? [...forwardedAssignments, assignmentId]
        : forwardedAssignments;

    setForwardedAssignments(next);
    window.sessionStorage.setItem(FORWARDED_STORAGE_KEY, JSON.stringify(next));
  };

  const forwardInstructionToJaring = async (assignmentId: string, instruction: string, jaringIds: string[]) => {
    await runAction(`task:${assignmentId}:forward-jaring`, async () => {
      const response = await fetch(`/api/field-officer/task-assignments/${assignmentId}/jaring-instructions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instruction,
          jaringIds,
        }),
      });
      const body = (await response.json().catch(() => null)) as { recipientCount?: number; message?: string } | null;

      if (!response.ok) {
        throw new Error(body?.message || "Gagal meneruskan instruksi ke Jaring.");
      }

      setForwardedAssignment(assignmentId, true);
      setActionNotice(`Instruksi Jaring dibuat untuk ${body?.recipientCount ?? jaringIds.length} target.`);
    });
  };

  const createJaring = async () => {
    if (!workspace) {
      return;
    }

    if (!jaringForm.code.trim()) {
      toast.error("Kode Jaring harus diisi.");
      return;
    }
    if (!jaringForm.aliasName.trim()) {
      toast.error("Alias / Nama Sandi harus diisi.");
      return;
    }
    if (!jaringForm.whatsappNumber.trim()) {
      toast.error("Nomor WhatsApp harus diisi.");
      return;
    }
    if (!jaringForm.clusterId.trim()) {
      toast.error("Silakan pilih Cluster Jaring.");
      return;
    }
    if (!jaringForm.areaId.trim()) {
      toast.error("Silakan pilih Area Utama.");
      return;
    }
    if (!jaringForm.notes.trim()) {
      toast.error("Catatan Pembinaan harus diisi.");
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
          ? "Validasi berhasil. Laporan sudah lengkap dan langsung masuk ke antrian Siap Dikirim."
          : "Validasi selesai. Cek badge dan kelengkapan laporan sebelum dimasukkan ke antrian Siap Dikirim.",
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
      const response = await fetch(`/api/field-officer/incoming/${messageId}/baket`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal membuat baket.");
      }

      setBaketTab("ready-to-send");
      setActionNotice("Baket berhasil dibuat dan siap dikirim. Tekan Kirim ke OIM agar masuk ke Laporan Masuk OIM.");
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

      setActionNotice("Baket berhasil dikirim ke OIM dan sudah masuk ke antrean Laporan Masuk.");
      setBaketTab("sent");
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

  const requestConfirmation = (action: PendingFieldOfficerAction) => {
    setPendingAction(action);
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

    const lng = mapPoints.reduce((sum, item) => sum + item.longitude, 0) / mapPoints.length;
    const lat = mapPoints.reduce((sum, item) => sum + item.latitude, 0) / mapPoints.length;

    return [lng, lat] as [number, number];
  }, [mapPoints]);

  const PaginationControls = ({
    currentPage,
    totalItems,
    setPage,
  }: {
    currentPage: number;
    totalItems: number;
    setPage: (p: number) => void;
  }) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;
    return (
      <div className="mt-4 flex items-center justify-between border-[var(--tactical-border)] border-t pt-4">
        <span className="font-mono text-[var(--tactical-text-muted)] text-xs">
          PAGE {currentPage} OF {totalPages} &middot; TOTAL {totalItems}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="cursor-pointer rounded border border-[var(--tactical-border)] px-3 py-1 font-medium font-mono text-[var(--tactical-text-secondary)] text-xs transition-colors hover:bg-[var(--tactical-text-secondary)]/10 disabled:opacity-50"
          >
            PREV
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="cursor-pointer rounded border border-[var(--tactical-border)] px-3 py-1 font-medium font-mono text-[var(--tactical-text-secondary)] text-xs transition-colors hover:bg-[var(--tactical-text-secondary)]/10 disabled:opacity-50"
          >
            NEXT
          </button>
        </div>
      </div>
    );
  };

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
    <div className="tactical-workspace space-y-8 p-6 text-[var(--tactical-text-primary)]">
      <style>{`
        :root {
          --tactical-bg: #f6f8fb;
          --tactical-grid-color: rgba(15, 23, 42, 0.03);
          --tactical-card-bg: #ffffff;
          --tactical-border: rgba(15, 23, 42, 0.06);
          --tactical-border-hover: rgba(14, 165, 233, 0.18);
          --tactical-text-primary: #0f172a;
          --tactical-text-secondary: #475569;
          --tactical-text-muted: #94a3b8;
          --tactical-blue: #0ea5e9;
          --tactical-green: #16a34a;
          --tactical-amber: #d97706;
          --tactical-red: #dc2626;
          --tactical-input-bg: #ffffff;
          --tactical-input-border: #cbd5e1;
          --tactical-action-bg: #f8fafc;
          --tactical-action-border: rgba(15, 23, 42, 0.06);
          --tactical-panel-bg: #f8fafc;
          --tactical-panel-border: #e2e8f0;
        }
        .dark {
          --tactical-bg: #0b1220;
          --tactical-grid-color: rgba(255, 255, 255, 0.03);
          --tactical-card-bg: #121a28;
          --tactical-border: rgba(255, 255, 255, 0.06);
          --tactical-border-hover: rgba(14, 165, 233, 0.18);
          --tactical-text-primary: #f8fafc;
          --tactical-text-secondary: #94a3b8;
          --tactical-text-muted: #64748b;
          --tactical-blue: #14b8ff;
          --tactical-green: #22c55e;
          --tactical-amber: #f59e0b;
          --tactical-red: #ef4444;
          --tactical-input-bg: #0f172a;
          --tactical-input-border: #2a3445;
          --tactical-action-bg: #101826;
          --tactical-action-border: rgba(255, 255, 255, 0.06);
          --tactical-panel-bg: #0f172a;
          --tactical-panel-border: rgba(255, 255, 255, 0.05);
        }
        
        .tactical-workspace {
          background-color: var(--tactical-bg);
          background-image: 
          linear-gradient(var(--tactical-grid-color) 1px, transparent 1px),
          linear-gradient(90deg, var(--tactical-grid-color) 1px, transparent 1px);
          background-size: 24px 24px;
          min-height: 100vh;
        }

        .tactical-card {
          background-color: var(--tactical-card-bg) !important;
          border: 1px solid var(--tactical-border) !important;
          border-radius: 6px !important;
          padding: 24px !important;
          transition: all 180ms ease-out !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) !important;
        }

        .tactical-card:hover {
          border-color: var(--tactical-border-hover) !important;
          transform: translateY(-2px) !important;
        }

        .tactical-input {
          background-color: var(--tactical-input-bg) !important;
          border: 1px solid var(--tactical-input-border) !important;
          color: var(--tactical-text-primary) !important;
          border-radius: 4px !important;
          transition: all 150ms ease-out !important;
        }
        .tactical-input:focus {
          border-color: #0ea5e9 !important;
          box-shadow: 0 0 0 1px #0ea5e9 !important;
        }

        .tactical-badge {
          font-family: var(--font-mono), monospace !important;
          font-size: 11px !important;
          letter-spacing: 0.05em !important;
          text-transform: uppercase !important;
          border-radius: 3px !important;
          font-weight: 500 !important;
          border: 1px solid currentColor !important;
        }
      `}</style>

      {/* Tactical Workspace Header */}
      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        {/* Left Card: Live Workspace Profiling */}
        <div className="tactical-card space-y-4">
          <div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-semibold text-3xl text-[var(--tactical-text-primary)] tracking-tight">
                {workspace.profile.name}
              </h1>
              <div className="flex items-center gap-1.5 rounded-[3px] border border-[var(--tactical-green)]/35 bg-[var(--tactical-green)]/10 px-2 py-0.5 font-medium font-mono text-[11px] text-[var(--tactical-green)]">
                <span className="size-1.5 animate-pulse rounded-full bg-[var(--tactical-green)]" />
                LIVE
              </div>
            </div>
            <p className="mt-1.5 font-mono text-[var(--tactical-text-secondary)] text-sm">
              {workspace.context.positionTitle.toUpperCase()}
            </p>
          </div>

          {/* Mission Status Strip */}
          <div className="mt-2 grid gap-4 border-[var(--tactical-border)] border-t pt-4 font-mono sm:grid-cols-2 md:grid-cols-3">
            <div className="space-y-1">
              <span className="block text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-[0.1em]">
                STATUS
              </span>
              <p className="font-semibold text-[var(--tactical-green)] text-xs">ACTIVE / VERIFIED</p>
            </div>
            <div className="space-y-1 md:border-[var(--tactical-border)] md:border-l md:pl-4">
              <span className="block text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-[0.1em]">
                LAST SYNC
              </span>
              <p className="text-[var(--tactical-text-primary)] text-xs">
                {workspace.latestLocation ? formatDateTime(workspace.latestLocation.capturedAt) : "N/A"}
              </p>
            </div>
            <div className="space-y-1 md:border-[var(--tactical-border)] md:border-l md:pl-4">
              <span className="block text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-[0.1em]">
                WILAYAH CAKUPAN
              </span>
              <p
                className="truncate text-[var(--tactical-text-secondary)] text-xs"
                title={workspace.context.areaScopes.map((item) => item.name).join(", ")}
              >
                {workspace.context.areaScopes
                  .map((item) => item.name)
                  .join(", ")
                  .toUpperCase()}
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Statistics and Quick Actions */}
        <div className="tactical-card flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard label="Tugas Aktif" value={metrics.activeTasks} />
              <MetricCard label="Jaring Binaan" value={metrics.activeJaring} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 border-[var(--tactical-border)] border-t pt-2 font-mono">
            <span className="text-[10px] text-[var(--tactical-text-muted)] uppercase">{workspace.profile.email}</span>
            <button
              disabled={isBusy === "location:publish"}
              onClick={() =>
                requestConfirmation({
                  title: "KONFIRMASI SYNC GPS",
                  description: "Kirim posisi GPS terbaru Anda ke workspace lapangan sekarang?",
                  confirmLabel: "YA, KIRIM",
                  onConfirm: () => {
                    void publishOwnLocation();
                  },
                })
              }
              className="h-8 shrink-0 cursor-pointer rounded-[6px] border border-[#475569] bg-transparent px-3 font-mono font-semibold text-[#CBD5E1] text-[10px] uppercase transition-all duration-200 hover:-translate-y-[0.5px] hover:border-[#64748B] hover:bg-[#334155] hover:brightness-105 disabled:opacity-50"
            >
              SYNC GPS
            </button>
          </div>
        </div>
      </section>

      {error && (
        <Alert className="rounded-xl border-[var(--tactical-red)]/30 bg-[var(--tactical-red)]/[0.02] p-4 text-[var(--tactical-red)]">
          <AlertTriangle className="size-4 shrink-0 text-[var(--tactical-red)]" />
          <AlertTitle className="font-mono font-semibold text-sm uppercase tracking-wider">Perlu perhatian</AlertTitle>
          <AlertDescription className="text-xs opacity-90">{error}</AlertDescription>
        </Alert>
      )}

      {actionNotice && (
        <Alert className="rounded-xl border-[var(--tactical-green)]/30 bg-[var(--tactical-green)]/[0.02] p-4 text-[var(--tactical-green)]">
          <CheckCircle2 className="size-4 shrink-0 text-[var(--tactical-green)]" />
          <AlertTitle className="font-mono font-semibold text-sm uppercase tracking-wider">Aksi berhasil</AlertTitle>
          <AlertDescription className="text-xs opacity-90">{actionNotice}</AlertDescription>
        </Alert>
      )}

      {/* MODULES LIST */}

      {/* MOD-01: TUGAS SAYA */}
      {(view === "overview" || view === "tasks") && (
        <>
          <TacticalSection
            code="MOD-01"
            title="TUGAS SAYA"
            metadata={[
              { label: "TOTAL TUGAS", value: workspace.tasks.length },
              { label: "AKTIF", value: metrics.activeTasks },
            ]}
          >
            <div className="space-y-4">
              {/* Task filters */}
              <div className="grid items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:grid-cols-3 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="space-y-1.5">
                  <label className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                    Klasifikasi
                  </label>
                  <select
                    value={taskClassificationFilter}
                    onChange={(e) => setTaskClassificationFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-slate-900 text-sm dark:border-white/10 dark:bg-[#131A26] dark:text-white"
                  >
                    <option value="">Semua Klasifikasi</option>
                    <option value="BIASA">BIASA</option>
                    <option value="TERBATAS">TERBATAS</option>
                    <option value="RAHASIA">RAHASIA</option>
                    <option value="SANGAT_RAHASIA">SANGAT RAHASIA</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                    Tanggal Mulai
                  </label>
                  <Input
                    type="date"
                    value={taskPeriodStart}
                    onChange={(e) => setTaskPeriodStart(e.target.value)}
                    className="h-9 w-full border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-[#131A26]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                    Tanggal Selesai
                  </label>
                  <Input
                    type="date"
                    value={taskPeriodEnd}
                    onChange={(e) => setTaskPeriodEnd(e.target.value)}
                    className="h-9 w-full border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-[#131A26]"
                  />
                </div>
              </div>

              {/* View toggle */}
              <div className="flex items-center justify-between border-slate-200 border-b pb-2 dark:border-white/5">
                <span className="font-bold font-mono text-[11px] text-slate-500 uppercase dark:text-[#7C8798]">
                  Daftar Tugas ({filteredTasks.length})
                </span>
                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-white/5 dark:bg-white/5">
                  <Button
                    variant={taskViewMode === "card" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTaskViewMode("card")}
                    className="h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs"
                  >
                    Card
                  </Button>
                  <Button
                    variant={taskViewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTaskViewMode("table")}
                    className="h-7 cursor-pointer rounded-md px-2.5 font-medium text-xs"
                  >
                    Table
                  </Button>
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <TacticalEmptyState
                  title="Tidak ada Tugas aktif"
                  description="Semua penugasan operasional telah selesai dilaksanakan atau tidak cocok dengan filter."
                  icon={CheckCircle2}
                />
              ) : taskViewMode === "table" ? (
                <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#131A26] dark:shadow-none">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 bg-slate-50/50 hover:bg-transparent dark:border-white/5 dark:bg-white/[0.01]">
                          <TableHead className="py-3.5 pl-6 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Klasifikasi & Prioritas
                          </TableHead>
                          <TableHead className="py-3.5 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Judul Tugas
                          </TableHead>
                          <TableHead className="py-3.5 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Status Asal
                          </TableHead>
                          <TableHead className="py-3.5 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Target Area
                          </TableHead>
                          <TableHead className="py-3.5 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Batas Waktu
                          </TableHead>
                          <TableHead className="py-3.5 pr-6 text-right font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTasks.map((task) => {
                          const _action = nextTaskAction(task.assignmentStatus);
                          const forwarded = forwardedAssignments.includes(task.assignmentId);
                          const classStyle = getClassificationStyles(task.classification || "BIASA");
                          return (
                            <TableRow
                              key={task.assignmentId}
                              className="border-slate-200 transition-colors hover:bg-slate-50/50 dark:border-white/5 dark:hover:bg-white/[0.02]"
                            >
                              <TableCell className="py-4 pl-6">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className="rounded border px-2 py-0.5 font-bold font-mono text-[9px] tracking-wider"
                                    style={{
                                      color: classStyle.color,
                                      backgroundColor: classStyle.bgColor,
                                      borderColor: classStyle.borderColor,
                                    }}
                                  >
                                    {classStyle.label}
                                  </span>
                                  <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold font-mono text-[9px] text-slate-600 tracking-wider dark:border-white/10 dark:bg-white/5 dark:text-[#7C8798]">
                                    {task.priority}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="w-[320px] max-w-[320px] py-4">
                                <div className="min-w-0 space-y-1">
                                  <h4
                                    className="truncate font-bold text-slate-900 text-sm dark:text-white"
                                    title={task.title}
                                  >
                                    {task.title}
                                  </h4>
                                  <p
                                    className="truncate text-slate-500 text-xs leading-relaxed dark:text-[#94A3B8]"
                                    title={task.description}
                                  >
                                    {task.description}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={`rounded border px-2 py-0.5 font-mono text-[10px] ${statusTone(task.assignmentStatus)}`}
                                  >
                                    {task.assignmentStatus}
                                  </span>
                                  {forwarded && (
                                    <span className="rounded border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 font-mono font-semibold text-[9px] text-fuchsia-500">
                                      FORWARDED
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-4 font-mono text-slate-700 text-xs dark:text-[#94A3B8]">
                                {task.targetAreas.join(", ") || "—"}
                              </TableCell>
                              <TableCell className="whitespace-nowrap py-4 font-mono text-slate-500 text-xs dark:text-[#7C8798]">
                                {task.dueDate ? formatDateTime(task.dueDate) : "—"}
                              </TableCell>
                              <TableCell className="py-4 pr-6 text-right">
                                <Button
                                  asChild
                                  variant="ghost"
                                  className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-slate-600 transition-all duration-[150ms] ease-out hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-transparent dark:text-[#94A3B8] dark:hover:border-[#06B6D4]/50 dark:hover:bg-white/5 dark:hover:text-white"
                                >
                                  <Link href={`/dashboard/field-officer/tugas-saya/${task.assignmentId}`}>
                                    <span>Buka</span>
                                  </Link>
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {paginatedTasks.map((task) => {
                    const action = nextTaskAction(task.assignmentStatus);
                    const forwarded = forwardedAssignments.includes(task.assignmentId);
                    return (
                      <TaskCard
                        key={task.assignmentId}
                        task={task}
                        action={action}
                        forwarded={forwarded}
                        jaring={registeredJaring}
                        isBusy={isBusy === `task:${task.assignmentId}:${action?.nextStatus}`}
                        isForwarding={isBusy === `task:${task.assignmentId}:forward-jaring`}
                        onUpdateStatus={(nextStatus) => void updateTaskStatus(task.assignmentId, nextStatus)}
                        onCancelForward={() => setForwardedAssignment(task.assignmentId, false)}
                        onForwardToJaring={(instruction, jaringIds) =>
                          void forwardInstructionToJaring(task.assignmentId, instruction, jaringIds)
                        }
                      />
                    );
                  })}
                </div>
              )}

              {filteredTasks.length > 0 && (
                <TablePagination
                  page={safeTasksPage}
                  limit={tasksLimit}
                  total={filteredTasks.length}
                  onPageChange={setTasksPage}
                  onLimitChange={(limit) => {
                    setTasksLimit(limit);
                    setTasksPage(1);
                  }}
                  className="mt-4 border border-slate-200 dark:border-white/5 rounded-xl bg-white dark:bg-[#131A26] px-6"
                />
              )}
            </div>
          </TacticalSection>
          {view === "overview" && <hr className="border-[var(--tactical-border)] opacity-60" />}
        </>
      )}

      {/* MOD-02: REGISTRASI JARING BINAAN */}
      {(view === "overview" || view === "jaring") && (
        <>
          <TacticalSection
            code="MOD-02"
            title="REGISTRASI & JARING BINAAN"
            description="Kelola identitas Jaring binaan. FO memegang ownership data. Bot pusat dikelola coordinator."
            metadata={[
              { label: "TOTAL JARING", value: workspace.jaring.length },
              { label: "AKTIF", value: metrics.activeJaring },
            ]}
          >
            <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
              {/* Registrasi Jaring Baru Form */}
              <div className="tactical-card space-y-4">
                <h3 className="border-[var(--tactical-border)] border-b pb-2 font-semibold text-[var(--tactical-text-primary)] text-lg tracking-tight">
                  Registrasi Jaring Baru
                </h3>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="block font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                      Kode Jaring
                    </label>
                    <Input
                      className="tactical-input w-full"
                      placeholder="Contoh: J-01"
                      value={jaringForm.code}
                      onChange={(event) =>
                        setJaringForm((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                      Alias / Nama Sandi
                    </label>
                    <Input
                      className="tactical-input w-full"
                      placeholder="Contoh: Elang Malam"
                      value={jaringForm.aliasName}
                      onChange={(event) =>
                        setJaringForm((current) => ({
                          ...current,
                          aliasName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                      Nomor WhatsApp
                    </label>
                    <Input
                      className="tactical-input w-full"
                      placeholder="Contoh: 628123456789"
                      value={jaringForm.whatsappNumber}
                      onChange={(event) => {
                        const val = event.target.value.replace(/\D/g, "");
                        setJaringForm((current) => ({
                          ...current,
                          whatsappNumber: val,
                        }));
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                      Cluster Jaring
                    </label>
                    <select
                      className="tactical-input flex h-10 w-full px-3 font-mono text-[var(--tactical-text-primary)] text-sm transition-all focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]"
                      value={jaringForm.clusterId}
                      onChange={(event) =>
                        setJaringForm((current) => ({
                          ...current,
                          clusterId: event.target.value,
                        }))
                      }
                    >
                      <option value="">PILIH CLUSTER JARING</option>
                      {workspace.jaringClusters.map((cluster) => (
                        <option key={cluster.id} value={cluster.id}>
                          {cluster.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                      Area Utama
                    </label>
                    <select
                      className="tactical-input flex h-10 w-full px-3 font-mono text-[var(--tactical-text-primary)] text-sm transition-all focus:border-[#0EA5E9] focus:ring-1 focus:ring-[#0EA5E9]"
                      value={jaringForm.areaId}
                      onChange={(event) =>
                        setJaringForm((current) => ({
                          ...current,
                          areaId: event.target.value,
                        }))
                      }
                    >
                      <option value="">PILIH AREA UTAMA</option>
                      {workspace.context.areaScopes.map((area) => (
                        <option key={area.areaId} value={area.areaId}>
                          {area.name.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                      Catatan Pembinaan
                    </label>
                    <Textarea
                      className="tactical-input w-full"
                      placeholder="Catatan intelijen/pembinaan..."
                      value={jaringForm.notes}
                      onChange={(event) =>
                        setJaringForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <button
                    disabled={isBusy === "jaring:create"}
                    onClick={() => {
                      if (!jaringForm.code.trim()) {
                        toast.error("Kode Jaring harus diisi.");
                        return;
                      }
                      if (!jaringForm.aliasName.trim()) {
                        toast.error("Alias / Nama Sandi harus diisi.");
                        return;
                      }
                      if (!jaringForm.whatsappNumber.trim()) {
                        toast.error("Nomor WhatsApp harus diisi.");
                        return;
                      }
                      if (!jaringForm.clusterId.trim()) {
                        toast.error("Silakan pilih Cluster Jaring.");
                        return;
                      }
                      if (!jaringForm.areaId.trim()) {
                        toast.error("Silakan pilih Area Utama.");
                        return;
                      }
                      if (!jaringForm.notes.trim()) {
                        toast.error("Catatan Pembinaan harus diisi.");
                        return;
                      }
                      setShowSaveJaringConfirm(true);
                    }}
                    className="h-[40px] w-full cursor-pointer rounded-[4px] bg-[#16A34A] px-[18px] font-mono font-semibold text-sm text-white uppercase tracking-[0.04em] shadow-[0_0_18px_rgba(22,163,74,0.25)] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#15803D] hover:brightness-105 active:scale-[0.98] active:bg-[#166534] disabled:opacity-50"
                  >
                    {isBusy === "jaring:create" ? "MENYIMPAN..." : "SIMPAN JARING"}
                  </button>

                  <AlertDialog open={showSaveJaringConfirm} onOpenChange={setShowSaveJaringConfirm}>
                    <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
                          KONFIRMASI REGISTRASI
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[var(--tactical-text-secondary)] text-xs">
                          Apakah Anda yakin ingin menyimpan dan meregistrasikan Jaring Binaan baru ini?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4 flex flex-wrap justify-end gap-2">
                        <AlertDialogCancel className="h-9 cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-4 font-semibold text-[#CBD5E1] text-xs uppercase tracking-wider hover:bg-[#334155]">
                          BATAL
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            setShowSaveJaringConfirm(false);
                            void createJaring();
                          }}
                          className="h-9 cursor-pointer rounded-[4px] bg-[#16A34A] px-4 font-semibold text-white text-xs uppercase tracking-wider hover:bg-[#15803D]"
                        >
                          YA, SIMPAN
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Jaring Binaan List */}
              <div className="space-y-4">
                {workspace.jaring.length === 0 ? (
                  <TacticalEmptyState
                    title="Tidak ada Jaring binaan"
                    description="Daftarkan Jaring operasional baru di formulir sebelah kiri."
                    icon={Users}
                  />
                ) : (
                  workspace.jaring.map((jaring) => (
                    <div key={jaring.id} className="tactical-card space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`tactical-badge rounded px-2 py-0.5 text-[11px] ${statusTone(jaring.status)}`}
                            >
                              {jaring.status}
                            </span>
                            <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                              CODE: {jaring.code}
                            </span>
                          </div>
                          <h3 className="font-semibold text-[var(--tactical-text-primary)] text-lg">
                            {jaring.aliasName}
                          </h3>
                          <p className="font-mono text-[var(--tactical-text-secondary)] text-sm">
                            {jaring.whatsappNumber}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-3 font-mono text-[var(--tactical-text-secondary)] text-xs">
                            <span className="text-[var(--tactical-blue)]">{jaring.clusterName || "NO_CLUSTER"}</span>
                            <span>&middot;</span>
                            <span>{jaring.areaNames.join(", ") || "NO_AREA"}</span>
                          </div>
                          {jaring.notes && (
                            <p className="rounded border border-[var(--tactical-border)] bg-black/5 p-2.5 text-[var(--tactical-text-secondary)] text-sm italic leading-relaxed dark:bg-white/[0.01]">
                              {jaring.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {jaring.status !== "ACTIVE" ? (
                            <button
                              disabled={isBusy === `jaring:${jaring.id}:activate`}
                              onClick={() =>
                                requestConfirmation({
                                  title: "KONFIRMASI AKTIVASI JARING",
                                  description: `Aktifkan kembali jaring ${jaring.aliasName}?`,
                                  confirmLabel: "YA, AKTIFKAN",
                                  onConfirm: () => {
                                    void changeJaringStatus(jaring.id, "activate");
                                  },
                                })
                              }
                              className="h-[40px] cursor-pointer rounded-[4px] bg-[#16A34A] px-[18px] font-mono font-semibold text-white text-xs shadow-[0_0_18px_rgba(22,163,74,0.25)] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#15803D] hover:brightness-105 active:scale-[0.98] active:bg-[#166534] disabled:opacity-50"
                            >
                              AKTIFKAN
                            </button>
                          ) : (
                            <button
                              disabled={isBusy === `jaring:${jaring.id}:deactivate`}
                              onClick={() =>
                                requestConfirmation({
                                  title: "KONFIRMASI NONAKTIFKAN JARING",
                                  description: `Nonaktifkan sementara jaring ${jaring.aliasName}?`,
                                  confirmLabel: "YA, NONAKTIFKAN",
                                  onConfirm: () => {
                                    void changeJaringStatus(jaring.id, "deactivate");
                                  },
                                })
                              }
                              className="h-[40px] cursor-pointer rounded-[4px] bg-[#B45309] px-[18px] font-mono font-semibold text-white text-xs shadow-[0_0_18px_rgba(217,119,6,0.20)] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#D97706] hover:brightness-105 active:scale-[0.98] active:bg-[#92400E] disabled:opacity-50"
                            >
                              NONAKTIFKAN
                            </button>
                          )}
                          <button
                            disabled={isBusy === `jaring:${jaring.id}:archive`}
                            onClick={() =>
                              requestConfirmation({
                                title: "KONFIRMASI ARSIP JARING",
                                description: `Arsipkan jaring ${jaring.aliasName} dari daftar aktif?`,
                                confirmLabel: "YA, ARSIPKAN",
                                onConfirm: () => {
                                  void changeJaringStatus(jaring.id, "archive");
                                },
                              })
                            }
                            className="h-[40px] cursor-pointer rounded-[4px] bg-[#991B1B] px-[18px] font-mono font-semibold text-white text-xs transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#DC2626] hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                          >
                            ARSIPKAN
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4 border-[var(--tactical-border)] border-t pt-2.5 font-mono text-[11px] text-[var(--tactical-text-muted)]">
                        <span>SYS REV: {jaring.id.slice(0, 8).toUpperCase()}</span>
                        <span>&middot;</span>
                        <span>VOLUME: {jaring.messageCount} MSG</span>
                        <span>&middot;</span>
                        <span>BAKET: {jaring.baketCount} BKT</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TacticalSection>
          {view === "overview" && <hr className="border-[var(--tactical-border)] opacity-60" />}
        </>
      )}

      {/* MOD-03: KOTAK MASUK JARING */}
      {(view === "overview" || view === "incoming") && (
        <>
          <TacticalSection
            code="MOD-03"
            title="KOTAK MASUK JARING"
            description="Validasi judul, isi, bukti foto, koordinat GPS, waktu kejadian, Jaring, dan sumber laporan intelijen."
            metadata={[
              { label: "PENDING VALIDASI", value: metrics.pendingIncoming },
              { label: "SOURCE NODE", value: workspace.incoming.length },
            ]}
          >
            {workspace.incoming.length === 0 ? (
              <TacticalEmptyState
                title="Tidak ada laporan masuk"
                description="Semua pesan masuk dari Jaring telah divalidasi dan diarsipkan."
                icon={Inbox}
              />
            ) : (
              <>
                <div className="grid gap-4">
                {paginatedIncoming.map((message) => (
                  <div key={message.id} className="tactical-card space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`tactical-badge rounded px-2 py-0.5 text-[11px] ${statusTone(message.status)}`}
                          >
                            {message.status}
                          </span>
                          <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                            VAL: {message.validationSummary}
                          </span>
                          <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                            JARING: {message.jaringCode}
                          </span>
                        </div>
                        <h3 className="font-semibold text-[var(--tactical-text-primary)] text-lg hover:underline hover:text-[var(--tactical-blue)] cursor-pointer">
                          <Link href={`/dashboard/field-officer/kotak-masuk-jaring/${message.id}`}>
                            {message.title || message.jaringAlias}
                          </Link>
                        </h3>
                        <p className="text-[var(--tactical-text-secondary)] text-sm leading-relaxed">
                          {message.content || "Pesan belum memiliki isi teks."}
                        </p>

                        <div className="grid gap-2 border-[var(--tactical-border)] border-t pt-3 font-mono text-[11px] text-[var(--tactical-text-muted)] sm:grid-cols-2 md:grid-cols-3">
                          <span>RECEIVED: {formatDateTime(message.receivedAt)}</span>
                          <span>EVENT TIME: {formatDateTime(message.eventDateTime)}</span>
                          <span>GPS TIME: {formatDateTime(message.gpsSharedAt)}</span>
                          <span>TIMESTAMP: {formatDateTime(message.reportTimestamp)}</span>
                          <span>SENDER: {message.senderPhone}</span>
                          <span>AREA: {message.areaName || "-"}</span>
                        </div>

                        {message.hasPhoto && (
                          <div className="space-y-2 rounded-lg border border-[var(--tactical-green)]/20 bg-[var(--tactical-green)]/[0.02] p-3 text-[var(--tactical-green)] text-sm">
                            <div className="flex items-center gap-1.5 font-medium">
                              <CheckCircle2 className="size-4 shrink-0" />
                              <span>FOTO BUKTI TERVERIFIKASI</span>
                            </div>
                            {message.photoUrl ? (
                              <div className="max-w-56 overflow-hidden rounded-lg border border-[var(--tactical-border)] shadow-sm">
                                <EvidenceImageViewer
                                  src={message.photoUrl}
                                  alt={`Foto bukti ${message.title || message.jaringAlias}`}
                                  fileName={message.photoFileId || `${message.id}.jpg`}
                                  caption={message.photoCaption || `Jaring ${message.jaringCode}`}
                                />
                              </div>
                            ) : (
                              <p className="text-[var(--tactical-text-secondary)] text-xs opacity-80">
                                Foto diterima oleh bot, tetapi file visual belum tersedia di storage. Kiriman lama
                                sebelum patch hanya punya metadata WA.
                              </p>
                            )}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-[var(--tactical-text-muted)]">
                                <span>MEDIA DB: {message.mediaCount}</span>
                                <span>FILE ID: {message.photoFileId || "-"}</span>
                                <span>WA ID: {message.photoMessageId || "-"}</span>
                                {message.photoCaption && <span>CAPTION: {message.photoCaption}</span>}
                            </div>
                          </div>
                        )}

                        {message.latitude !== null && message.longitude !== null && (
                          <div className="grid gap-3 rounded-lg border border-[var(--tactical-border)] bg-black/10 p-3 md:grid-cols-[1fr_14rem] dark:bg-white/[0.01]">
                            <div className="space-y-1.5 text-[var(--tactical-text-secondary)] text-sm">
                              <p className="font-medium text-[var(--tactical-text-primary)]">LOKASI KEJADIAN</p>
                              <p className="font-mono text-xs">
                                {message.latitude.toFixed(7)}, {message.longitude.toFixed(7)}
                              </p>
                              <p className="font-mono text-[var(--tactical-text-muted)] text-xs">
                                AKURASI: {message.gpsAccuracyMeters !== null ? `${message.gpsAccuracyMeters} M` : "-"}
                              </p>
                              <a
                                href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                                rel="noreferrer"
                                target="_blank"
                                className="mt-2 inline-flex items-center gap-1 rounded border border-[var(--tactical-border)] px-3 py-1.5 font-medium font-mono text-[var(--tactical-text-secondary)] text-xs transition-colors hover:bg-[var(--tactical-text-secondary)]/10"
                              >
                                <MapPin className="size-3.5" />
                                Buka di Google Maps
                              </a>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                              rel="noreferrer"
                              target="_blank"
                              aria-label="Buka koordinat laporan di Google Maps"
                              className="block overflow-hidden rounded-lg border border-[var(--tactical-border)]"
                            >
                              <LeafletLocationPreview
                                latitude={message.latitude}
                                longitude={message.longitude}
                                title={message.title || message.jaringAlias}
                              />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 font-mono">
                        <button
                          disabled={isBusy === `validate:${message.id}`}
                          onClick={() =>
                            requestConfirmation({
                              title: "KONFIRMASI VALIDASI",
                              description: "Jalankan validasi ulang untuk laporan masuk ini sekarang?",
                              confirmLabel: "YA, VALIDASI",
                              onConfirm: () => {
                                void validateIncoming(message.id);
                              },
                            })
                          }
                          className={`h-[40px] cursor-pointer rounded-[4px] border px-[18px] font-mono font-semibold text-xs uppercase transition-all duration-180 hover:-translate-y-[1px] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 ${
                            message.validationSummary === "VALID"
                              ? "border-[#16A34A] bg-[#16A34A] text-white hover:bg-[#15803D]"
                              : "border-[#475569] bg-transparent text-[#CBD5E1] hover:border-[#64748B] hover:bg-[#334155]"
                          }`}
                        >
                          {isBusy === `validate:${message.id}`
                            ? "MEMVALIDASI..."
                            : message.validationSummary === "VALID"
                              ? "VERIFIKASI"
                              : "VALIDASI"}
                        </button>
                        <button
                          disabled={isBusy === `delete:${message.id}`}
                          onClick={() =>
                            requestConfirmation({
                              title: "KONFIRMASI TOLAK LAPORAN",
                              description: "Tolak dan keluarkan laporan ini dari antrean kotak masuk jaring?",
                              confirmLabel: "YA, TOLAK",
                              onConfirm: () => {
                                void deleteIncoming(message.id);
                              },
                            })
                          }
                          className="h-[40px] cursor-pointer rounded-[4px] bg-[#991B1B] px-[18px] font-mono font-semibold text-white text-xs uppercase transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#DC2626] hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                        >
                          TOLAK
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalIncoming > 0 && (
                <TablePagination
                  page={safeIncomingPage}
                  limit={incomingLimit}
                  total={totalIncoming}
                  onPageChange={setIncomingPage}
                  onLimitChange={(limit) => {
                    setIncomingLimit(limit);
                    setIncomingPage(1);
                  }}
                  className="mt-4 border border-slate-200 dark:border-white/5 rounded-xl bg-white dark:bg-[#131A26] px-6"
                />
              )}
            </>
          )}
          </TacticalSection>
          {view === "overview" && <hr className="border-[var(--tactical-border)] opacity-60" />}
        </>
      )}

      {/* MOD-04: FORMULASI BAKET */}
      {(view === "overview" || view === "baket" || view === "reports") && (
        <>
          <TacticalSection
            code="MOD-04"
            title={view === "reports" ? "LAPORAN SAYA" : "FORMULASI BAKET"}
            description="Bentuk Baket dari laporan Jaring, kirim ke OIM, dan pantau statusnya."
            metadata={[
              { label: "SIAP DIKIRIM", value: pendingOutgoingCount },
              { label: "TERKIRIM", value: submittedBakets.length },
            ]}
          >
            <div className="tactical-card !p-1 rounded-[6px] bg-black/5 dark:bg-white/[0.01]">
              <Tabs value={baketTab} onValueChange={setBaketTab} className="space-y-4">
                <TabsList className="flex flex-wrap gap-1 rounded-[4px] border border-[var(--tactical-border)] bg-black/10 p-1 font-mono text-xs dark:bg-white/[0.02]">
                  <TabsTrigger
                    value="ready-to-send"
                    className="rounded-[4px] border border-transparent px-4 py-1.5 font-semibold uppercase tracking-wider transition-all data-[state=active]:border-[var(--tactical-border)] data-[state=active]:bg-[var(--tactical-card-bg)] data-[state=active]:text-[var(--tactical-blue)] data-[state=active]:shadow-none"
                  >
                    SIAP DIKIRIM ({pendingOutgoingCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="sent"
                    className="rounded-[4px] border border-transparent px-4 py-1.5 font-semibold uppercase tracking-wider transition-all data-[state=active]:border-[var(--tactical-border)] data-[state=active]:bg-[var(--tactical-card-bg)] data-[state=active]:text-[var(--tactical-blue)] data-[state=active]:shadow-none"
                  >
                    TERKIRIM ({submittedBakets.length})
                  </TabsTrigger>
                </TabsList>

                <div className="grid gap-3 rounded-[6px] border border-[var(--tactical-border)] bg-black/5 p-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_180px_auto_auto] dark:bg-white/[0.01]">
                  <select
                    value={baketFilterDraft.categoryId}
                    onChange={(event) =>
                      setBaketFilterDraft((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="tactical-input h-10 w-full px-3 text-sm"
                    aria-label="Filter kategori baket"
                  >
                    <option value="">Semua kategori</option>
                    {workspace.reportCategories
                      .filter((item) => item.isActive)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>

                  <select
                    value={baketFilterDraft.jaringClusterId}
                    onChange={(event) =>
                      setBaketFilterDraft((current) => ({
                        ...current,
                        jaringClusterId: event.target.value,
                      }))
                    }
                    className="tactical-input h-10 w-full px-3 text-sm"
                    aria-label="Filter klaster baket"
                  >
                    <option value="">Semua klaster</option>
                    {workspace.jaringClusters
                      .filter((item) => item.isActive)
                      .map((cluster) => (
                        <option key={cluster.id} value={cluster.id}>
                          {cluster.name}
                        </option>
                      ))}
                  </select>

                  <Input
                    type="date"
                    value={baketFilterDraft.from}
                    onChange={(event) =>
                      setBaketFilterDraft((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                    className="tactical-input h-10"
                    aria-label="Tanggal mulai baket"
                  />

                  <Input
                    type="date"
                    value={baketFilterDraft.to}
                    onChange={(event) =>
                      setBaketFilterDraft((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                    className="tactical-input h-10"
                    aria-label="Tanggal akhir baket"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setReadyToSendPage(1);
                      setSentPage(1);
                      setAppliedBaketFilters({ ...baketFilterDraft });
                    }}
                    className="h-10 rounded-[4px] bg-[var(--tactical-blue)] px-4 font-semibold text-sm text-white transition hover:brightness-110"
                  >
                    Terapkan
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReadyToSendPage(1);
                      setSentPage(1);
                      setBaketFilterDraft(EMPTY_BAKET_FILTERS);
                      setAppliedBaketFilters(EMPTY_BAKET_FILTERS);
                    }}
                    className="h-10 rounded-[4px] border border-[var(--tactical-border)] px-4 font-semibold text-[var(--tactical-text-secondary)] text-sm transition hover:bg-[var(--tactical-text-secondary)]/10"
                  >
                    Reset
                  </button>
                </div>

                <TabsContent value="ready-to-send" className="grid gap-4 pt-2">
                  {pendingOutgoingCount === 0 ? (
                    <TacticalEmptyState
                      title="Semua Laporan Telah Diproses"
                      description="Belum ada laporan valid atau baket yang menunggu pengiriman ke OIM."
                      icon={Send}
                    />
                  ) : (
                    <>
                      {workspace.baketCandidates.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 border-[var(--tactical-border)] border-b pb-2">
                            <Radio className="size-4 text-[var(--tactical-blue)]" />
                            <p className="font-mono font-semibold text-[var(--tactical-text-secondary)] text-xs uppercase tracking-wider">
                              Laporan valid siap diformulasikan
                            </p>
                          </div>
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
                        </div>
                      )}

                      {readyToSendBakets.length > 0 && (
                        <div className="space-y-4">
                          {workspace.baketCandidates.length > 0 && (
                            <div className="flex items-center gap-2 border-[var(--tactical-border)] border-b pt-2 pb-2">
                              <Send className="size-4 text-[var(--tactical-green)]" />
                              <p className="font-mono font-semibold text-[var(--tactical-text-secondary)] text-xs uppercase tracking-wider">
                                Baket siap dikirim ke OIM
                              </p>
                            </div>
                          )}
                          {readyToSendBakets
                            .slice((readyToSendPage - 1) * ITEMS_PER_PAGE, readyToSendPage * ITEMS_PER_PAGE)
                            .map((baket) => (
                              <div key={baket.id} className="tactical-card space-y-3">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="flex-1 space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span
                                        className={`tactical-badge rounded px-2 py-0.5 text-[11px] ${statusTone(baket.status)}`}
                                      >
                                        SIAP DIKIRIM
                                      </span>
                                      <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                                        KATEGORI: {baket.categoryName || "LEGACY"}
                                      </span>
                                      <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                                        KLASTER: {baket.clusterName || "LEGACY"}
                                      </span>
                                      <span
                                        className={`tactical-badge rounded px-2 py-0.5 font-mono text-[11px] ${urgencyTone(baket.urgency)}`}
                                      >
                                        URGENSI: {baketUrgencyLabel(baket.urgency)}
                                      </span>
                                    </div>
                                    <h3 className="font-semibold text-[var(--tactical-text-primary)] text-lg">
                                      {baket.currentVersionTitle || "Tanpa judul versi aktif"}
                                    </h3>
                                    <p className="text-[var(--tactical-text-secondary)] text-sm">
                                      Jaring: {baket.primaryJaringAlias || baket.primaryJaringCode || "-"}
                                    </p>
                                    <p className="rounded border border-[var(--tactical-border)] bg-black/5 p-2.5 text-[var(--tactical-text-secondary)] text-sm italic leading-relaxed dark:bg-white/[0.01]">
                                      {baket.summary || "Catatan Field Officer belum ditambahkan."}
                                    </p>
                                  </div>
                                  <button
                                    disabled={isBusy === `submit:${baket.id}`}
                                    onClick={() =>
                                      requestConfirmation({
                                        title: "KONFIRMASI KIRIM KE OIM",
                                        description: "Apakah Anda yakin ingin mengirim laporan Baket ini ke OIM?",
                                        confirmLabel: "YA, KIRIM",
                                        onConfirm: () => {
                                          void submitBaket(baket.id);
                                        },
                                      })
                                    }
                                    className="h-[40px] cursor-pointer rounded-[4px] bg-[#16A34A] px-[18px] font-mono font-semibold text-white text-xs uppercase shadow-[0_0_18px_rgba(22,163,74,0.25)] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#15803D] hover:brightness-105 active:scale-[0.98] active:bg-[#166534] disabled:opacity-50"
                                  >
                                    KIRIM KE OIM
                                  </button>
                                </div>
                                <div className="flex gap-4 border-[var(--tactical-border)] border-t pt-2.5 font-mono text-[11px] text-[var(--tactical-text-muted)]">
                                  <span>BAKET ID: {baket.id.slice(0, 8).toUpperCase()}</span>
                                  <span>&middot;</span>
                                  <span>CREATED: {formatDateTime(baket.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                  {readyToSendBakets.length > 0 && (
                    <PaginationControls
                      currentPage={readyToSendPage}
                      totalItems={readyToSendBakets.length}
                      setPage={setReadyToSendPage}
                    />
                  )}
                </TabsContent>

                <TabsContent value="sent" className="grid gap-4 pt-2">
                  {submittedBakets.length === 0 ? (
                    <TacticalEmptyState
                      title="Tidak ada Baket terkirim"
                      description="Belum ada Baket yang telah dikirim ke OIM."
                      icon={Send}
                    />
                  ) : (
                    submittedBakets.slice((sentPage - 1) * ITEMS_PER_PAGE, sentPage * ITEMS_PER_PAGE).map((baket) => (
                      <div key={baket.id} className="tactical-card space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`tactical-badge rounded px-2 py-0.5 text-[11px] ${statusTone(baket.status)}`}
                              >
                                {baketStatusLabel(baket.status, baket.sentToPositionTitle)}
                              </span>
                              <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[11px] text-[var(--tactical-text-secondary)]">
                                KATEGORI: {baket.categoryName || "LEGACY"}
                              </span>
                              <span
                                className={`tactical-badge rounded px-2 py-0.5 font-mono text-[11px] ${urgencyTone(baket.urgency)}`}
                              >
                                URGENSI: {baketUrgencyLabel(baket.urgency)}
                              </span>
                            </div>
                            <h3 className="font-semibold text-[var(--tactical-text-primary)] text-lg">
                              {baket.currentVersionTitle || "Tanpa judul versi aktif"}
                            </h3>
                            <p className="text-[var(--tactical-text-secondary)] text-sm">
                              Dikirim ke OIM &middot; data terkunci dan hanya dapat dilihat.
                            </p>
                          </div>
                          <button className="h-[40px] shrink-0 cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-[18px] font-mono font-semibold text-[#CBD5E1] text-xs uppercase transition-all duration-180 hover:-translate-y-[1px] hover:border-[#64748B] hover:bg-[#334155] hover:brightness-105 active:scale-[0.98]">
                            <Link href={`/dashboard/field-officer/buat-baket/${baket.id}`}>LIHAT BAKET</Link>
                          </button>
                        </div>
                        <div className="flex gap-4 border-[var(--tactical-border)] border-t pt-2.5 font-mono text-[11px] text-[var(--tactical-text-muted)]">
                          <span>BAKET ID: {baket.id.slice(0, 8).toUpperCase()}</span>
                          <span>&middot;</span>
                          <span>SUBMITTED: {formatDateTime(baket.createdAt)}</span>
                        </div>
                      </div>
                    ))
                  )}
                  {submittedBakets.length > 0 && (
                    <PaginationControls
                      currentPage={sentPage}
                      totalItems={submittedBakets.length}
                      setPage={setSentPage}
                    />
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </TacticalSection>
          {view === "overview" && <hr className="border-[var(--tactical-border)] opacity-60" />}
        </>
      )}

      {/* MOD-05: PETA TUGAS & LIVE LOCATION */}
      {(view === "overview" || view === "map") && (
        <>
          <TacticalSection
            code="MOD-05"
            title="PETA TUGAS & LIVE LOCATION"
            description="Gabungan lokasi laporan Jaring dan ping lokasi terbaru petugas di lapangan."
            metadata={[
              { label: "ACTIVE MARKER", value: mapPoints.length },
              {
                label: "GPS ACCURACY",
                value: workspace.latestLocation?.gpsAccuracyMeters
                  ? `${workspace.latestLocation.gpsAccuracyMeters}M`
                  : "N/A",
              },
            ]}
          >
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              {/* Peta Tugas Card */}
              <div className="tactical-card space-y-4">
                <h3 className="border-[var(--tactical-border)] border-b pb-2 font-semibold text-[var(--tactical-text-primary)] text-lg tracking-tight">
                  Peta Tugas
                </h3>
                <div className="dc-map-shell relative overflow-hidden rounded-[6px] border border-[var(--tactical-border)]">
                  {/* Tactical Overlay */}
                  <div className="absolute top-3 right-3 z-[1000] w-52 space-y-1.5 rounded-[4px] border border-[var(--tactical-border)] bg-[#ffffff]/90 p-3 font-mono text-[10px] text-[var(--tactical-text-secondary)] shadow-lg backdrop-blur-sm dark:bg-[#131A26]/90">
                    <div className="mb-1.5 flex items-center justify-between border-[var(--tactical-border)] border-b pb-1.5">
                      <span className="font-semibold text-[var(--tactical-text-primary)] uppercase tracking-wider">
                        TACTICAL MAP OVERLAY
                      </span>
                      <span className="flex items-center gap-1 rounded bg-[var(--tactical-green)]/15 px-1 font-bold text-[9px] text-[var(--tactical-green)]">
                        <span className="size-1 animate-ping rounded-full bg-[var(--tactical-green)]" />
                        LIVE
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GPS STATUS:</span>
                      <span className="font-medium text-[var(--tactical-text-primary)]">OPTIMAL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MARKER COUNT:</span>
                      <span className="font-medium text-[var(--tactical-text-primary)]">{mapPoints.length} NODES</span>
                    </div>
                    <div className="flex justify-between">
                      <span>COORDINATE:</span>
                      <span
                        className="max-w-[100px] truncate font-medium text-[var(--tactical-text-primary)]"
                        title={`${mapCenter[1].toFixed(5)}, ${mapCenter[0].toFixed(5)}`}
                      >
                        {mapCenter[1].toFixed(5)}, {mapCenter[0].toFixed(5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>LAST PING:</span>
                      <span className="font-medium text-[var(--tactical-text-primary)]">
                        {workspace.latestLocation ? "ACTIVE" : "N/A"}
                      </span>
                    </div>
                  </div>

                  <Map className="h-[28rem]" center={mapCenter} zoom={7}>
                    {mapPoints.map((point) => (
                      <MapMarker key={point.id} longitude={point.longitude} latitude={point.latitude}>
                        <MarkerContent>
                          <div
                            className={`flex size-4 items-center justify-center rounded-full border-2 ${
                              point.kind === "self"
                                ? "border-[var(--tactical-card-bg)] bg-[var(--tactical-blue)]"
                                : "border-[var(--tactical-card-bg)] bg-[var(--tactical-green)]"
                            }`}
                          />
                        </MarkerContent>
                        <MarkerPopup>
                          <div className="space-y-1 p-1 font-mono text-sm">
                            <p className="font-semibold">{point.title}</p>
                            <p className="text-[var(--tactical-text-secondary)] text-xs">{point.subtitle}</p>
                            <p className="text-[10px] text-[var(--tactical-text-muted)]">
                              {point.latitude.toFixed(5)}, {point.longitude.toFixed(5)}
                            </p>
                          </div>
                        </MarkerPopup>
                      </MapMarker>
                    ))}
                    <MapControls showZoom showLocate position="bottom-right" />
                  </Map>
                </div>
              </div>

              {/* Live Location Card */}
              <div className="tactical-card space-y-4">
                <h3 className="border-[var(--tactical-border)] border-b pb-2 font-semibold text-[var(--tactical-text-primary)] text-lg tracking-tight">
                  Live Location
                </h3>

                <div className="space-y-3">
                  <div className="space-y-3 rounded-[6px] border border-[var(--tactical-border)] bg-black/5 p-4 dark:bg-[#0F172A]">
                    <div className="flex items-center gap-3">
                      <div className="rounded-[4px] bg-[var(--tactical-blue)]/10 p-2 text-[var(--tactical-blue)]">
                        <Crosshair className="size-5 shrink-0" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--tactical-text-primary)]">Posisi terbaru</p>
                        <p className="font-mono text-[var(--tactical-text-secondary)] text-xs">
                          {workspace.latestLocation
                            ? formatDateTime(workspace.latestLocation.capturedAt)
                            : "Belum ada ping aktif."}
                        </p>
                      </div>
                    </div>
                    {workspace.latestLocation && (
                      <div className="space-y-1.5 border-[var(--tactical-border)] border-t pt-3 font-mono text-[var(--tactical-text-secondary)] text-xs">
                        <p>
                          <span className="text-[var(--tactical-text-muted)]">KOORDINAT:</span>{" "}
                          {workspace.latestLocation.latitude.toFixed(5)},{" "}
                          {workspace.latestLocation.longitude.toFixed(5)}
                        </p>
                        <p>
                          <span className="text-[var(--tactical-text-muted)]">AKURASI:</span>{" "}
                          {workspace.latestLocation.gpsAccuracyMeters ?? "-"} m
                        </p>
                        <p>
                          <span className="text-[var(--tactical-text-muted)]">WILAYAH:</span>{" "}
                          {workspace.latestLocation.areaName || "-"}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    disabled={isBusy === "location:publish"}
                    onClick={() =>
                      requestConfirmation({
                        title: "KONFIRMASI PING LOKASI",
                        description: "Kirim ping lokasi terbaru ke monitor live workspace sekarang?",
                        confirmLabel: "YA, KIRIM",
                        onConfirm: () => {
                          void publishOwnLocation();
                        },
                      })
                    }
                    className="h-[40px] w-full cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-[18px] font-mono font-semibold text-[#CBD5E1] text-sm uppercase tracking-[0.04em] transition-all duration-180 hover:-translate-y-[1px] hover:border-[#64748B] hover:bg-[#334155] hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                  >
                    KIRIM PING LOKASI
                  </button>
                </div>
              </div>
            </div>
          </TacticalSection>
          {view === "overview" && <hr className="border-[var(--tactical-border)] opacity-60" />}
        </>
      )}

      {/* MOD-06: PANIC & EMERGENCY FLOW */}
      {view === "alert" && (
        <TacticalSection
          code="MOD-06"
          title="ALUR DARURAT & PANIK"
          description="Eskalasi darurat terpusat. Kirim lokasi darurat secara langsung ke coordinator."
          metadata={[
            { label: "UNIT DARURAT", value: "UNIT KOMANDO FC" },
            { label: "STATUS RUTE", value: "JALUR LANGSUNG" },
          ]}
        >
          <div className="tactical-card space-y-4 border-[var(--tactical-red)]/30 bg-[var(--tactical-red)]/[0.02]">
            <div className="flex items-center gap-3 border-[var(--tactical-red)]/20 border-b pb-3">
              <div className="rounded-[4px] bg-[var(--tactical-red)]/10 p-2 text-[var(--tactical-red)]">
                <Radio className="size-6 animate-pulse" strokeWidth={2} />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--tactical-red)] text-lg tracking-tight">
                  Alur Darurat & Panik
                </h3>
                <p className="text-[var(--tactical-text-secondary)] text-xs">
                  Tombol darurat tetap berpusat pada pengiriman lokasi dan eskalasi ke coordinator/regional.
                </p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <EmergencyStep
                icon={<MapPin className="size-4 shrink-0 text-[var(--tactical-red)]" strokeWidth={2} />}
                title="1. TANGKAP LOKASI"
                description="Kirim ping lokasi terakhir dulu agar rantai komando menerima posisi paling aktual."
              />
              <EmergencyStep
                icon={<ShieldCheck className="size-4 shrink-0 text-[var(--tactical-red)]" strokeWidth={2} />}
                title="2. AKTIFKAN SOP"
                description="Coordinator memeriksa Jaring aktif, coverage area, dan kanal WhatsApp pusat yang sedang online."
              />
              <EmergencyStep
                icon={<Send className="size-4 shrink-0 text-[var(--tactical-red)]" strokeWidth={2} />}
                title="3. ESKALASI"
                description="Laporan diteruskan ke regional atau posko menggunakan channel resmi di level coordinator."
              />

              <div className="pt-2 xl:col-span-3">
                <button
                  disabled={isBusy === "location:publish"}
                  onClick={() =>
                    requestConfirmation({
                      title: "KONFIRMASI LOKASI DARURAT",
                      description: "Kirim lokasi darurat terbaru ke coordinator sekarang?",
                      confirmLabel: "YA, KIRIM DARURAT",
                      onConfirm: () => {
                        void publishOwnLocation();
                      },
                    })
                  }
                  className="h-[40px] cursor-pointer rounded-[4px] bg-[#991B1B] px-[18px] font-mono font-semibold text-white text-xs uppercase tracking-[0.04em] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#DC2626] hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                >
                  {isBusy === "location:publish" ? "MENGIRIM..." : "KIRIM LOKASI DARURAT"}
                </button>
              </div>
            </div>
          </div>
        </TacticalSection>
      )}

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
              {pendingAction?.title || "KONFIRMASI AKSI"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--tactical-text-secondary)] text-xs">
              {pendingAction?.description || "Lanjutkan aksi ini?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 flex flex-wrap justify-end gap-2">
            <AlertDialogCancel className="h-9 cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-4 font-semibold text-[#CBD5E1] text-xs uppercase tracking-wider hover:bg-[#334155]">
              TIDAK
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingAction?.onConfirm();
                setPendingAction(null);
              }}
              className="h-9 cursor-pointer rounded-[4px] bg-[#16A34A] px-4 font-semibold text-white text-xs uppercase tracking-wider hover:bg-[#15803D]"
            >
              {pendingAction?.confirmLabel || "YA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* HELPER COMPONENTS */

function MetricCard({ label, value }: { label: string; value: number }) {
  const isZero = value === 0;
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-white/5 dark:bg-white/[0.02]">
      {/* Decorative vertical stripe */}
      <div className="absolute top-0 bottom-0 left-0 w-1" style={{ backgroundColor: isZero ? "#7C8798" : "#0EA5E9" }} />
      <div className="space-y-1 pl-1">
        <p className="whitespace-nowrap font-bold font-mono text-[8.5px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
          {label}
        </p>
        <p className="font-black font-mono text-3xl text-slate-900 tracking-tight dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function _MetricBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "blue" | "green" | "amber" | "red";
}) {
  const colorMap = {
    blue: "border-[var(--tactical-blue)]/30 bg-[var(--tactical-blue)]/[0.07] text-[var(--tactical-blue)]",
    green: "border-[var(--tactical-green)]/30 bg-[var(--tactical-green)]/[0.07] text-[var(--tactical-green)]",
    amber: "border-[var(--tactical-amber)]/30 bg-[var(--tactical-amber)]/[0.07] text-[var(--tactical-amber)]",
    red: "border-[var(--tactical-red)]/30 bg-[var(--tactical-red)]/[0.07] text-[var(--tactical-red)]",
  };

  return (
    <div className={`flex items-center justify-between rounded-[4px] border px-3 py-2 ${colorMap[color]} font-mono`}>
      <span className="text-[11px] uppercase tracking-wider opacity-85">{label}</span>
      <span className="font-semibold text-lg">{value}</span>
    </div>
  );
}

function TacticalSection({
  code,
  title,
  description,
  children,
  metadata,
  footer,
}: {
  code?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  metadata?: { label: string; value: string | number }[];
  footer?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-[var(--tactical-border)] border-b pb-3">
        <div className="space-y-1">
          <h2 className="font-semibold text-[var(--tactical-text-primary)] text-xl tracking-tight">{title}</h2>
          {description && <p className="text-[var(--tactical-text-secondary)] text-xs">{description}</p>}
        </div>

        {/* Section Metadata */}
        {metadata && metadata.length > 0 && (
          <div className="flex gap-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-mono shadow-sm dark:border-white/5 dark:bg-slate-900/40">
            {metadata.slice(0, 2).map((meta, i) => (
              <div key={i} className="flex flex-col items-center px-1">
                <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest dark:text-[#7C8798]">
                  {meta.label}
                </span>
                <span className="mt-0.5 font-bold text-lg text-slate-950 dark:text-white">{meta.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4">{children}</div>

      {/* Footer */}
      {footer && <div className="pt-2 text-[var(--tactical-text-muted)] text-xs">{footer}</div>}
    </section>
  );
}

function TaskCard({
  task,
  action,
  forwarded,
  jaring,
  isBusy,
  isForwarding,
  onUpdateStatus,
  onCancelForward,
  onForwardToJaring,
}: {
  task: FieldOfficerTask;
  action: { label: string; nextStatus: "READ" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED" } | null;
  forwarded: boolean;
  jaring: FieldOfficerJaring[];
  isBusy: boolean;
  isForwarding: boolean;
  onUpdateStatus: (nextStatus: "READ" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED") => void;
  onCancelForward: () => void;
  onForwardToJaring: (instruction: string, jaringIds: string[]) => void;
}) {
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showForwardConfirm, setShowForwardConfirm] = useState(false);
  const [forwardInstruction, setForwardInstruction] = useState(task.coordinatorInstruction ?? "");
  const instructionBody =
    task.coordinatorInstruction ?? "Field Coordinator belum menuliskan instruksi rinci untuk assignment ini.";
  const instructionSenderLabel = task.assignerPositionTitle ?? task.assignerName ?? "Pengirim Instruksi";
  const canForwardToJaring = jaring.length > 0 && forwardInstruction.trim().length > 0;

  const handleActionClick = () => {
    if (action) {
      setShowStatusConfirm(true);
    }
  };

  const handleForwardClick = () => {
    if (forwarded) {
      onCancelForward();
    } else {
      setShowForwardConfirm(true);
    }
  };

  return (
    <div className="tactical-card !p-[28px] space-y-0 transition-all duration-200 hover:-translate-y-[2px] hover:border-slate-500/30 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-[var(--tactical-border)] border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`tactical-badge rounded px-2 py-0.5 text-[10px] ${statusTone(task.assignmentStatus)}`}>
            {task.assignmentStatus}
          </span>
          <span
            className="tactical-badge dc-priority rounded px-2 py-0.5 font-mono text-[10px]"
            data-priority={(task.priority || "NORMAL").toUpperCase()}
          >
            PRIORITY: {task.priority}
          </span>
          {forwarded && (
            <span className="tactical-badge rounded border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 font-semibold text-[10px] text-fuchsia-500">
              INSTRUKSI JARING DIBUAT
            </span>
          )}
        </div>
      </div>

      {/* Content Panel */}
      <div className="border-[var(--tactical-border)] border-b py-4">
        <h3 className="mb-[20px] font-bold text-[var(--tactical-text-primary)] text-xl tracking-tight">
          Instruksi dari {instructionSenderLabel}
        </h3>
        <p className="mb-[20px] text-[var(--tactical-text-secondary)] text-sm leading-relaxed">{instructionBody}</p>
        <div className="rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
          <div className="font-mono font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
            Referensi tugas asli
          </div>
          <div className="mt-1 font-semibold text-[var(--tactical-text-primary)] text-sm">{task.title}</div>
          <p className="mt-1 line-clamp-2 text-[var(--tactical-text-secondary)] text-xs leading-relaxed">
            {task.description}
          </p>
        </div>
      </div>

      {/* Action Panel */}
      <div className="border-[var(--tactical-border)] border-b py-4">
        <div className="space-y-3 rounded-[12px] border border-[var(--tactical-action-border)] bg-[var(--tactical-action-bg)] p-[16px]">
          <span className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
            ACTION
          </span>
          <div className="flex flex-wrap items-center gap-[12px]">
            {action && (
              <>
                <button
                  disabled={isBusy}
                  onClick={handleActionClick}
                  className="flex h-[40px] cursor-pointer items-center justify-center rounded-[4px] border border-[#475569] bg-transparent px-[18px] font-mono font-semibold text-[#CBD5E1] text-xs uppercase tracking-[0.04em] transition-all duration-180 hover:-translate-y-[1px] hover:border-[#64748B] hover:bg-[#334155] hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                >
                  {isBusy ? "PROCESSING..." : action.label.toUpperCase()}
                </button>

                <AlertDialog open={showStatusConfirm} onOpenChange={setShowStatusConfirm}>
                  <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
                        KONFIRMASI STATUS
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-[var(--tactical-text-secondary)] text-xs">
                        {action?.nextStatus === "READ"
                          ? "Apakah Anda yakin ingin menandai tugas ini sebagai sudah dibaca?"
                          : action?.nextStatus === "ACKNOWLEDGED"
                            ? "Apakah Anda yakin ingin mengakui penerimaan tugas ini?"
                            : action?.nextStatus === "IN_PROGRESS"
                              ? "Apakah Anda yakin ingin memulai tugas lapangan ini?"
                              : "Apakah Anda yakin ingin menandai tugas lapangan ini sebagai selesai?"}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 flex flex-wrap justify-end gap-2">
                      <AlertDialogCancel className="h-9 cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-4 font-semibold text-[#CBD5E1] text-xs uppercase tracking-wider hover:bg-[#334155]">
                        BATAL
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          setShowStatusConfirm(false);
                          onUpdateStatus(action.nextStatus);
                        }}
                        className="h-9 cursor-pointer rounded-[4px] bg-[#16A34A] px-4 font-semibold text-white text-xs uppercase tracking-wider hover:bg-[#15803D]"
                      >
                        {action?.nextStatus === "READ"
                          ? "YA, DIBACA"
                          : action?.nextStatus === "ACKNOWLEDGED"
                            ? "YA, AKUI"
                            : action?.nextStatus === "IN_PROGRESS"
                              ? "YA, MULAI"
                              : "YA, SELESAIKAN"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <button
              onClick={handleForwardClick}
              disabled={isForwarding}
              className={`flex h-[40px] cursor-pointer items-center justify-center rounded-[4px] px-[18px] font-mono font-semibold text-xs uppercase tracking-[0.04em] transition-all duration-180 hover:-translate-y-[1px] hover:brightness-105 active:scale-[0.98] ${
                forwarded
                  ? "bg-[#991B1B] text-white hover:bg-[#DC2626]"
                  : "bg-[#B45309] text-white shadow-[0_0_18px_rgba(217,119,6,0.20)] hover:bg-[#D97706] active:bg-[#92400E]"
              }`}
            >
              {isForwarding ? "MEMPROSES..." : forwarded ? "BATAL INSTRUKSI JARING" : "FORWARD KE JARING"}
            </button>

            <AlertDialog open={showForwardConfirm} onOpenChange={setShowForwardConfirm}>
              <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
                    BUAT INSTRUKSI KE JARING
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-[var(--tactical-text-secondary)] text-xs">
                    <span className="block">
                      Instruksi ini akan disiapkan untuk seluruh Jaring terdaftar di bawah Field Officer ini.
                    </span>
                    <span className="block rounded-[6px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3 text-[var(--tactical-text-primary)]">
                      Target jaring: {jaring.length} personel
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-4 space-y-2">
                  <label className="block font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                    Instruksi untuk Jaring
                  </label>
                  <Textarea
                    value={forwardInstruction}
                    onChange={(event) => setForwardInstruction(event.target.value)}
                    className="min-h-32 border-[var(--tactical-border)] bg-[var(--tactical-panel-bg)] text-[var(--tactical-text-primary)] text-sm"
                    placeholder="Tulis instruksi yang akan diteruskan ke seluruh Jaring binaan..."
                  />
                  {jaring.length > 0 ? (
                    <div className="max-h-24 overflow-auto rounded-[6px] border border-[var(--tactical-panel-border)] bg-black/5 p-2 text-[10px] text-[var(--tactical-text-secondary)] dark:bg-white/[0.02]">
                      {jaring.map((item) => (
                        <div key={item.id} className="flex justify-between gap-3 py-1">
                          <span>{item.aliasName}</span>
                          <span className="text-[var(--tactical-text-muted)]">{item.code}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[var(--tactical-red)]">
                      Belum ada Jaring terdaftar untuk menerima instruksi.
                    </p>
                  )}
                </div>
                <AlertDialogFooter className="mt-4 flex flex-wrap justify-end gap-2">
                  <AlertDialogCancel className="h-9 cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-4 font-semibold text-[#CBD5E1] text-xs uppercase tracking-wider hover:bg-[#334155]">
                    BATAL
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={!canForwardToJaring}
                    onClick={() => {
                      setShowForwardConfirm(false);
                      onForwardToJaring(
                        forwardInstruction.trim(),
                        jaring.map((item) => item.id),
                      );
                    }}
                    className="h-9 cursor-pointer rounded-[4px] bg-[#B45309] px-4 font-semibold text-white text-xs uppercase tracking-wider hover:bg-[#D97706] disabled:opacity-50"
                  >
                    BUAT INSTRUKSI
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Info Grid Panel */}
      <div className="mt-[20px] pt-4">
        <div className="grid gap-3 font-mono text-xs sm:grid-cols-2 md:grid-cols-4">
          <div className="flex min-h-[75px] flex-col justify-between rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
            <span className="mb-1.5 border-slate-200/50 border-b pb-1.5 font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider dark:border-white/[0.03]">
              MISSION ID
            </span>
            <span className="whitespace-pre-wrap break-all font-medium text-[var(--tactical-text-primary)] leading-relaxed">
              {task.assignmentId.toUpperCase()}
            </span>
          </div>

          <div className="flex min-h-[75px] flex-col justify-between rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
            <span className="mb-1.5 border-slate-200/50 border-b pb-1.5 font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider dark:border-white/[0.03]">
              TARGET AREAS
            </span>
            <span className="whitespace-pre-wrap break-words font-medium text-[var(--tactical-text-primary)] leading-relaxed">
              {task.targetAreas.join(", ").toUpperCase() || "-"}
            </span>
          </div>

          <div className="flex min-h-[75px] flex-col justify-between rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
            <span className="mb-1.5 border-slate-200/50 border-b pb-1.5 font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider dark:border-white/[0.03]">
              SUMBER TUGAS
            </span>
            <span className="whitespace-pre-wrap break-words font-medium text-[var(--tactical-text-primary)] leading-relaxed">
              {(task.sourceLabel || "-").toUpperCase()}
            </span>
          </div>

          <div className="flex min-h-[75px] flex-col justify-between rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
            <span className="mb-1.5 border-slate-200/50 border-b pb-1.5 font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider dark:border-white/[0.03]">
              DEADLINE
            </span>
            <span className="whitespace-pre-wrap break-words font-medium text-[var(--tactical-text-primary)] leading-relaxed">
              {formatDateTime(task.dueDate).toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TacticalEmptyState({
  title,
  description,
  onAction,
  actionLabel = "Refresh",
  icon: IconComponent = Radio,
}: {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
  icon?: React.ComponentType<any>;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-3 rounded-[6px] border border-[var(--tactical-border)] border-dashed bg-black/5 p-8 text-center font-mono dark:bg-white/[0.01]">
      <div className="rounded-[4px] bg-[var(--tactical-border)]/20 p-2.5 text-[var(--tactical-text-muted)]">
        <IconComponent className="size-6 animate-pulse" strokeWidth={2} />
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-[var(--tactical-text-primary)] text-sm uppercase tracking-wider">{title}</h4>
        <p className="max-w-sm text-[var(--tactical-text-secondary)] text-xs">{description}</p>
      </div>
      {onAction && (
        <button
          onClick={onAction}
          className="rounded-[4px] border border-[var(--tactical-blue)]/10 bg-[var(--tactical-blue)]/5 px-3 py-1 font-medium text-[var(--tactical-blue)] text-xs uppercase hover:underline"
        >
          [ {actionLabel} ]
        </button>
      )}
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
  const [urgency, setUrgency] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [urgencyConfirmed, setUrgencyConfirmed] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [title, setTitle] = useState(message.title || "");
  const [normalizedContent, setNormalizedContent] = useState(message.content || "");
  const [fieldOfficerNote, setFieldOfficerNote] = useState("");
  const [taskAssignmentId, setTaskAssignmentId] = useState("");
  const [eventTime, setEventTime] = useState(() => {
    if (!message.eventDateTime) return "";
    const date = new Date(message.eventDateTime);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  });
  const canCreate = Boolean(categoryId && urgencyConfirmed && title.trim() && normalizedContent.trim());

  return (
    <div className="tactical-card space-y-6 border-emerald-500/25 bg-emerald-500/[0.02]">
      {/* Candidate Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-[var(--tactical-border)] border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`tactical-badge rounded px-2 py-0.5 text-[10px] ${statusTone(message.status)}`}>
            {message.status}
          </span>
          <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 text-[10px] text-[var(--tactical-text-secondary)]">
            JARING: {message.jaringCode}
          </span>
          <span className="tactical-badge rounded border border-[var(--tactical-blue)]/20 bg-[var(--tactical-blue)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--tactical-blue)]">
            KLASTER: {message.clusterName || "BELUM TERPETAKAN"}
          </span>
        </div>
        <div className="font-mono text-[10px] text-[var(--tactical-text-muted)]">
          CANDIDATE ID: {message.id.slice(0, 8).toUpperCase()}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Left: Message Source Detail */}
        <div className="space-y-4 border-[var(--tactical-border)] pr-0 xl:border-r xl:pr-6">
          <div className="space-y-1">
            <span className="font-mono font-semibold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
              SUMBER PESAN JARING
            </span>
            <div className="min-h-[100px] rounded-lg border border-[var(--tactical-border)] bg-black/10 p-4 text-[var(--tactical-text-primary)] text-sm leading-relaxed dark:bg-white/[0.01]">
              {message.content}
            </div>
          </div>

          {message.photoUrl && (
            <div className="space-y-1">
              <span className="font-mono font-semibold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                BUKTI DOKUMENTASI
              </span>
              <div className="max-w-56 overflow-hidden rounded-lg border border-[var(--tactical-border)] bg-black/10 shadow-sm dark:bg-white/[0.01]">
                <EvidenceImageViewer
                  src={message.photoUrl}
                  alt={`Evidence ${message.title || message.jaringAlias}`}
                  fileName={`${message.id}.jpg`}
                  caption={`Jaring ${message.jaringCode}`}
                />
              </div>
            </div>
          )}

          {message.latitude !== null && message.longitude !== null && (
            <div className="space-y-2">
              <span className="font-mono font-semibold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                KOORDINAT GPS
              </span>
              <div className="overflow-hidden rounded-lg border border-[var(--tactical-border)] bg-black/10 dark:bg-white/[0.01]">
                <LeafletLocationPreview
                  latitude={message.latitude}
                  longitude={message.longitude}
                  title={message.title || message.jaringAlias || "Lokasi laporan jaring"}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--tactical-border)] bg-black/10 px-3 py-2 font-mono text-[var(--tactical-text-secondary)] text-xs dark:bg-white/[0.01]">
                <span>
                  {message.latitude.toFixed(7)}, {message.longitude.toFixed(7)} &middot; AKURASI{" "}
                  {message.gpsAccuracyMeters ?? "-"} M
                </span>
                <a
                  href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--tactical-blue)] hover:underline"
                >
                  <MapPin className="size-3.5" />
                  Buka di Google Maps
                </a>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[10px] text-[var(--tactical-text-muted)]">
            <span>SENDER: {message.senderPhone}</span>
            <span>INCOMING: {formatDateTime(message.receivedAt)}</span>
            <span>EVENT: {formatDateTime(message.eventDateTime)}</span>
            <span>AREA: {message.areaName || "-"}</span>
          </div>
        </div>

        {/* Right: Baket Normalization Form Fields */}
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                KATEGORI LAPORAN <span className="text-[var(--tactical-red)]">*</span>
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="tactical-input w-full border-[var(--tactical-border)] bg-black/10 text-[var(--tactical-text-primary)] dark:bg-white/[0.02]">
                  <SelectValue placeholder="PILIH KATEGORI" />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((item) => item.isActive)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name.toUpperCase()}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                URGENCY LEVEL <span className="text-[var(--tactical-red)]">*</span>
              </label>
              <Select
                value={urgency}
                onValueChange={(value) => {
                  setUrgency(value as typeof urgency);
                  setUrgencyConfirmed(false);
                }}
              >
                <SelectTrigger className="tactical-input w-full border-[var(--tactical-border)] bg-black/10 font-mono text-[var(--tactical-text-primary)] dark:bg-white/[0.02]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono">
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="NORMAL">NORMAL</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="URGENT">URGENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
              JUDUL BAKET <span className="text-[var(--tactical-red)]">*</span>
            </label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Masukkan judul laporan formal..."
              className="tactical-input w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
              ISI NORMALISASI LAPORAN <span className="text-[var(--tactical-red)]">*</span>
            </label>
            <Textarea
              value={normalizedContent}
              onChange={(event) => setNormalizedContent(event.target.value)}
              placeholder="Tuliskan isi laporan dengan bahasa formal..."
              className="tactical-input min-h-24 w-full"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                WAKTU KEJADIAN
              </label>
              <Input
                type="datetime-local"
                value={eventTime}
                onChange={(event) => setEventTime(event.target.value)}
                className="tactical-input w-full font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
                TUGAS OPERASIONAL TERKAIT
              </label>
              <Select
                value={taskAssignmentId || "none"}
                onValueChange={(value) => setTaskAssignmentId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="tactical-input w-full border-[var(--tactical-border)] bg-black/10 text-[var(--tactical-text-primary)] dark:bg-white/[0.02]">
                  <SelectValue placeholder="TANPA TUGAS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">TANPA TUGAS</SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.assignmentId} value={task.assignmentId}>
                      {task.title.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider">
              CATATAN FIELD OFFICER
            </label>
            <Textarea
              value={fieldOfficerNote}
              onChange={(event) => setFieldOfficerNote(event.target.value)}
              placeholder="Catatan tambahan FO mengenai situasi lapangan..."
              className="tactical-input min-h-16 w-full"
            />
          </div>

          <div className="mt-4 flex flex-col gap-4 border-[var(--tactical-border)] border-t pt-2 font-mono sm:flex-row sm:items-center sm:justify-between">
            <label className="flex cursor-pointer select-none items-center gap-2.5 text-[var(--tactical-text-secondary)] text-xs">
              <input
                type="checkbox"
                checked={urgencyConfirmed}
                onChange={(event) => setUrgencyConfirmed(event.target.checked)}
                className="size-4 shrink-0 rounded border-[var(--tactical-border)] bg-transparent text-[var(--tactical-blue)] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-[10px]">SOP CONFIRMATION: Konfirmasi urgency {urgency}.</span>
            </label>

            <button
              disabled={!canCreate || busy}
              onClick={() => setShowCreateConfirm(true)}
              className="h-[40px] cursor-pointer rounded-[4px] bg-[#16A34A] px-[18px] font-semibold text-white text-xs uppercase tracking-[0.04em] shadow-[0_0_18px_rgba(22,163,74,0.25)] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#15803D] hover:brightness-105 active:scale-[0.98] active:bg-[#166534] disabled:opacity-50"
            >
              {busy ? "SAVING..." : "FORMULASIKAN BAKET"}
            </button>
          </div>

          <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
            <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
                  KONFIRMASI BAKET
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--tactical-text-secondary)] text-xs">
                  Buat baket dari laporan jaring ini sekarang?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 flex flex-wrap justify-end gap-2">
                <AlertDialogCancel className="h-9 cursor-pointer rounded-[4px] border border-[#475569] bg-transparent px-4 font-semibold text-[#CBD5E1] text-xs uppercase tracking-wider hover:bg-[#334155]">
                  TIDAK
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setShowCreateConfirm(false);
                    void onCreate({
                      categoryId,
                      urgency,
                      title: title.trim(),
                      normalizedContent: normalizedContent.trim(),
                      fieldOfficerNote: fieldOfficerNote.trim() || undefined,
                      taskAssignmentId: taskAssignmentId || undefined,
                      eventTime: eventTime ? new Date(eventTime).toISOString() : undefined,
                    });
                  }}
                  className="h-9 cursor-pointer rounded-[4px] bg-[#16A34A] px-4 font-semibold text-white text-xs uppercase tracking-wider hover:bg-[#15803D]"
                >
                  YA, BUAT BAKET
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

function EmergencyStep({ description, icon, title }: { description: string; icon: React.ReactNode; title: string }) {
  return (
    <div className="space-y-2 rounded-[4px] border border-slate-200 bg-slate-50 p-4 text-[var(--tactical-text-primary)] dark:border-[#2A3445] dark:bg-[#0F172A]">
      <div className="flex items-center gap-2">
        <div className="shrink-0 rounded-[4px] bg-slate-200 p-1.5 text-[var(--tactical-red)] dark:bg-[#2A3445]/20">
          {icon}
        </div>
        <p className="font-mono font-semibold text-[var(--tactical-text-primary)] text-xs tracking-wide">{title}</p>
      </div>
      <p className="text-[var(--tactical-text-secondary)] text-xs leading-relaxed">{description}</p>
    </div>
  );
}
