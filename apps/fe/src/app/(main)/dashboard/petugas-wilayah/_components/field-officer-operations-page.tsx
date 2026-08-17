"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Columns3,
  Crosshair,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { SortableTableHeader } from "@/app/(main)/dashboard/_components/sortable-table-header";
import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { getUrgencyLabel } from "@/lib/domain/operational-presentation";
import { sortReportCategories } from "@/lib/domain/report-category-order";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type {
  FieldOfficerIncoming,
  FieldOfficerJaring,
  FieldOfficerTask,
  FieldOfficerWorkspace,
  ReportCategory,
} from "@/server/field-ops/types";

import { LeafletLocationPreview } from "./leaflet-location-preview";

const FieldOfficerMap = dynamic(() => import("./field-officer-map").then((module) => module.FieldOfficerMap), {
  ssr: false,
  loading: () => <div className="h-[28rem] animate-pulse bg-white/5" />,
});

type FieldOfficerView = "overview" | "tasks" | "jaring" | "incoming" | "baket" | "reports" | "map" | "alert";

const FORWARDED_STORAGE_KEY = "dens-cakra-forwarded-assignments";
const JARING_COLUMNS_STORAGE_KEY = "dens-cakra-field-officer-jaring-columns-v2";
const BAKET_ROUTE = "/dashboard/baket";
const EMPTY_BAKET_FILTERS = {
  categoryId: "",
  from: "",
  to: "",
};

type JaringColumnKey =
  | "name"
  | "whatsapp"
  | "alias"
  | "gaswil"
  | "village"
  | "address"
  | "occupation"
  | "status"
  | "kinerja";

type JaringListRecord = Omit<FieldOfficerJaring, "code" | "areaNames" | "areaIds" | "messageCount" | "baketCount"> & {
  occupation?: { name?: string | null } | null;
  areaCoverages?: Array<{ areaId: string; area?: { name?: string | null } | null }>;
  _count?: { messages?: number; primaryBakets?: number };
};

function mapJaringListRecord(item: JaringListRecord): FieldOfficerJaring {
  return {
    ...item,
    code: item.aliasName || item.id,
    status: item.registrationStatus === "APPROVED" ? item.status : "INACTIVE",
    areaNames: (item.areaCoverages ?? []).flatMap((coverage) => (coverage.area?.name ? [coverage.area.name] : [])),
    areaIds: (item.areaCoverages ?? []).map((coverage) => coverage.areaId),
    messageCount: item._count?.messages ?? 0,
    baketCount: item._count?.primaryBakets ?? 0,
    occupationName: item.occupation?.name ?? item.occupationName ?? null,
    profilePhotoUrl: item.profilePhotoFileId ? `/api/field-officer/files/${item.profilePhotoFileId}` : null,
  };
}

const JARING_COLUMN_OPTIONS: Array<{ key: JaringColumnKey; label: string }> = [
  { key: "name", label: "Nama Jaring" },
  { key: "whatsapp", label: "Nomor WhatsApp" },
  { key: "alias", label: "Kode Jaring" },
  { key: "gaswil", label: "Petugas Wilayah (Gaswil)" },
  { key: "village", label: "Wilayah Penempatan" },
  { key: "address", label: "Alamat" },
  { key: "occupation", label: "Pekerjaan" },
  { key: "status", label: "Status" },
  { key: "kinerja", label: DOMAIN_TERMS.jaringActivity90Days },
];

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
  switch ((status ?? "").toUpperCase()) {
    case "DRAFT":
      return "Draf";
    case "READY_TO_SEND":
      return "Siap dikirim";
    case "SENT_TO_OIM":
      return sentToPositionTitle ? `Sudah dikirim ke ${sentToPositionTitle}` : "Sudah dikirim";
    case "UNDER_VERIFICATION":
      return "Sedang terverifikasi";
    case "NEEDS_DEVELOPMENT":
      return "Perlu pengembangan";
    case "VERIFIED":
      return "Terverifikasi";
    case "REJECTED":
      return "Ditolak";
    default:
      return status ?? "-";
  }
}

function baketUrgencyLabel(urgency?: string | null) {
  return urgency ? getUrgencyLabel(urgency).toUpperCase() : "-";
}

function urgencyTone(urgency?: string | null) {
  switch ((urgency ?? "").toUpperCase()) {
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

  if (
    value.includes("INACTIVE") ||
    value.includes("ARCHIVED") ||
    value.includes("ERROR") ||
    value.includes("REJECTED")
  ) {
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }

  if (
    value.includes("COMPLETED") ||
    value.includes("ACTIVE") ||
    value.includes("VALID") ||
    value.includes("APPROVED") ||
    value.includes("TERVERIFIKASI")
  ) {
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
    value.includes("NEEDS_DEVELOPMENT") ||
    value.includes("PENDING") ||
    value.includes("BELUM TERVERIFIKASI")
  ) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  }

  return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
}

function validationLabel(status: string) {
  if (status === "NOT_CHECKED") return "BELUM DIPERIKSA";
  if (status === "VALID") return "FORMAT SESUAI";
  if (status === "INVALID") return "PERLU PERBAIKAN";
  return status;
}

function jaringRegistrationStatusLabel(status: FieldOfficerJaring["registrationStatus"]) {
  switch (status) {
    case "PENDING":
      return "MENUNGGU TINJAUAN";
    case "APPROVED":
      return "DISETUJUI";
    case "REJECTED":
      return "DITOLAK";
  }
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function isFieldOfficerJaringActive(item: FieldOfficerJaring): boolean {
  if (item.registrationStatus !== "APPROVED") return false;
  if (item.status === "ACTIVE") return true;
  if (item.status === "INACTIVE") return false;
  if (!item.lastReportAt) return false;
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return new Date(item.lastReportAt).getTime() >= threeMonthsAgo;
}

function nextTaskAction(status: string) {
  const value = status.toUpperCase();

  if (value === "SENT") {
    return { label: "Tandai Dibaca", nextStatus: "READ" as const };
  }

  if (value === "READ") {
    return { label: "Konfirmasi", nextStatus: "ACKNOWLEDGED" as const };
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

export function FieldOfficerOperationsPage({
  view,
  initialWorkspace = null,
}: {
  view: FieldOfficerView;
  initialWorkspace?: FieldOfficerWorkspace | null;
}) {
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspace | null>(initialWorkspace);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!initialWorkspace);
  const workspaceAbortController = useRef<AbortController | null>(null);
  const hasInitialWorkspace = useRef(Boolean(initialWorkspace));
  const [isBusy, setIsBusy] = useState<string | null>(null);
  const [baketTab, setBaketTab] = useState(view === "reports" ? "sent" : "ready-to-send");
  const [readyToSendPage, setReadyToSendPage] = useState(1);
  const [readyToSendLimit, setReadyToSendLimit] = useState(5);
  const [sentPage, setSentPage] = useState(1);
  const [sentLimit, setSentLimit] = useState(5);
  const baketViewMode = "table";
  const [baketCreatedSortOrder, setBaketCreatedSortOrder] = useState<"asc" | "desc">("desc");
  const [forwardedAssignments, setForwardedAssignments] = useState<string[]>([]);
  const [baketFilterDraft, setBaketFilterDraft] = useState(EMPTY_BAKET_FILTERS);
  const [appliedBaketFilters, setAppliedBaketFilters] = useState(EMPTY_BAKET_FILTERS);
  const [pendingAction, setPendingAction] = useState<PendingFieldOfficerAction | null>(null);

  const [taskViewMode, setTaskViewMode] = useState<"card" | "table">("card");
  const [taskClassificationFilter, setTaskClassificationFilter] = useState("");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState("");
  const [taskPeriodStart, setTaskPeriodStart] = useState("");
  const [taskPeriodEnd, setTaskPeriodEnd] = useState("");
  const [taskDeadlineSortOrder, setTaskDeadlineSortOrder] = useState<"asc" | "desc">("asc");

  const [tasksPage, setTasksPage] = useState(1);
  const [tasksLimit, setTasksLimit] = useState(10);
  const [incomingPage, setIncomingPage] = useState(1);
  const [incomingLimit, setIncomingLimit] = useState(10);

  const [jaringSearch, setJaringSearch] = useState("");
  const [debouncedJaringSearch, setDebouncedJaringSearch] = useState("");
  const [jaringOccupationFilter, setJaringOccupationFilter] = useState("all");
  const [jaringVillageFilter, setJaringVillageFilter] = useState("all");
  const [jaringStatusFilter, setJaringStatusFilter] = useState("all");
  const [jaringActiveFilter, setJaringActiveFilter] = useState("all");
  const [jaringPage, setJaringPage] = useState(1);
  const [jaringLimit, setJaringLimit] = useState(10);
  const [serverJaring, setServerJaring] = useState<FieldOfficerJaring[]>(initialWorkspace?.jaring ?? []);
  const [jaringTotal, setJaringTotal] = useState(initialWorkspace?.jaring.length ?? 0);
  const [jaringSummary, setJaringSummary] = useState(() => ({
    total: initialWorkspace?.jaring.length ?? 0,
    pending: initialWorkspace?.jaring.filter((item) => item.registrationStatus === "PENDING").length ?? 0,
    approved: initialWorkspace?.jaring.filter((item) => item.registrationStatus === "APPROVED").length ?? 0,
    rejected: initialWorkspace?.jaring.filter((item) => item.registrationStatus === "REJECTED").length ?? 0,
  }));
  const [loadingJaring, setLoadingJaring] = useState(false);
  const jaringRequestSequence = useRef(0);
  const [visibleJaringColumns, setVisibleJaringColumns] = useState<Set<JaringColumnKey>>(
    () => new Set(JARING_COLUMN_OPTIONS.map((column) => column.key)),
  );

  const jaringVillageOptions = useMemo(() => {
    return [...(workspace?.villageAreas ?? [])].sort((left, right) => left.name.localeCompare(right.name, "id"));
  }, [workspace?.villageAreas]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedJaringSearch(jaringSearch.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [jaringSearch]);

  useEffect(() => {
    if (view !== "jaring" || !workspace) return;
    const requestId = ++jaringRequestSequence.current;
    setLoadingJaring(true);
    const params = new URLSearchParams({
      paginated: "true",
      page: String(jaringPage),
      limit: String(jaringLimit),
    });
    if (debouncedJaringSearch) params.set("search", debouncedJaringSearch);
    if (jaringOccupationFilter !== "all") params.set("occupationId", jaringOccupationFilter);
    if (jaringVillageFilter !== "all") params.set("areaId", jaringVillageFilter);
    if (jaringStatusFilter !== "all") params.set("registrationStatus", jaringStatusFilter);
    if (jaringActiveFilter !== "all") {
      params.set("status", jaringActiveFilter === "active" ? "ACTIVE" : "INACTIVE");
    }

    void apiBrowserFetch<{
      items: JaringListRecord[];
      pagination: { total: number };
      summary: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
      };
    }>(`/jaring?${params.toString()}`)
      .then((result) => {
        if (requestId !== jaringRequestSequence.current) return;
        setServerJaring((result.items ?? []).map(mapJaringListRecord));
        setJaringTotal(result.pagination?.total ?? 0);
        if (result.summary) setJaringSummary(result.summary);
      })
      .catch((error) => {
        if (requestId === jaringRequestSequence.current) console.error("Gagal memuat Daftar Jaring:", error);
      })
      .finally(() => {
        if (requestId === jaringRequestSequence.current) setLoadingJaring(false);
      });
  }, [
    debouncedJaringSearch,
    jaringActiveFilter,
    jaringLimit,
    jaringOccupationFilter,
    jaringPage,
    jaringStatusFilter,
    jaringVillageFilter,
    view,
    workspace,
  ]);

  const filteredJaring = serverJaring;
  const safeJaringPage = Math.min(jaringPage, Math.max(1, Math.ceil(jaringTotal / jaringLimit)));
  const paginatedJaring = serverJaring;
  const jaringAreaSubtitle = useMemo(() => {
    const villageName = jaringVillageOptions.find((area) => area.areaId === jaringVillageFilter)?.name;
    return jaringVillageFilter !== "all" && villageName
      ? `Jumlah Jaring Kelurahan/Desa ${villageName}`
      : "Jumlah Jaring semua Kelurahan/Desa penugasan";
  }, [jaringVillageFilter, jaringVillageOptions]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: halaman harus kembali ke halaman pertama saat filter Jaring berubah.
  useEffect(() => {
    setJaringPage(1);
  }, [jaringSearch, jaringOccupationFilter, jaringVillageFilter, jaringStatusFilter, jaringActiveFilter]);

  const filteredTasks = useMemo(() => {
    if (!workspace?.tasks) return [];
    const filtered = workspace.tasks.filter((task) => {
      if (taskClassificationFilter && task.classification !== taskClassificationFilter) {
        return false;
      }
      if (taskPriorityFilter && task.priority !== taskPriorityFilter) {
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

    return [...filtered].sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return taskDeadlineSortOrder === "asc" ? aTime - bTime : bTime - aTime;
    });
  }, [
    workspace?.tasks,
    taskClassificationFilter,
    taskPriorityFilter,
    taskPeriodStart,
    taskPeriodEnd,
    taskDeadlineSortOrder,
  ]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: halaman tugas harus direset setelah hasil filter berubah.
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: halaman laporan masuk harus direset saat data masuk diperbarui.
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

  useEffect(() => {
    const raw = window.localStorage.getItem(JARING_COLUMNS_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const savedColumns = JSON.parse(raw) as unknown;
      if (!Array.isArray(savedColumns)) {
        throw new Error("Invalid Jaring column preference.");
      }

      const validColumns = savedColumns.filter(
        (value): value is JaringColumnKey =>
          typeof value === "string" && JARING_COLUMN_OPTIONS.some((column) => column.key === value),
      );
      setVisibleJaringColumns(new Set(validColumns));
    } catch {
      window.localStorage.removeItem(JARING_COLUMNS_STORAGE_KEY);
    }
  }, []);

  const loadWorkspace = useCallback(
    async (filters = appliedBaketFilters, silent = false) => {
      workspaceAbortController.current?.abort();
      const controller = new AbortController();
      workspaceAbortController.current = controller;
      try {
        if (!silent) setIsLoading(true);
        const params = new URLSearchParams();
        if (filters.categoryId) params.set("categoryId", filters.categoryId);
        if (filters.from) params.set("from", filters.from);
        if (filters.to) params.set("to", filters.to);

        const response = await fetch(
          `/api/field-officer/views/${view}${params.toString() ? `?${params.toString()}` : ""}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const body = (await response.json()) as
          | { view: FieldOfficerView; data: FieldOfficerWorkspace }
          | { message?: string };

        if (!response.ok) {
          throw new Error("message" in body ? body.message : "Gagal memuat ruang kerja Petugas Wilayah (Gaswil).");
        }

        setWorkspace((body as { view: FieldOfficerView; data: FieldOfficerWorkspace }).data);
        setError(null);
        return true;
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return true;
        }
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat ruang kerja Petugas Wilayah (Gaswil).");
        return false;
      } finally {
        if (workspaceAbortController.current === controller) {
          workspaceAbortController.current = null;
          if (!silent) setIsLoading(false);
        }
      }
    },
    [appliedBaketFilters, view],
  );

  useEffect(() => {
    const baseDelay = view === "incoming" || view === "alert" || view === "map" ? 15_000 : 30_000;
    let failureCount = 0;
    let cancelled = false;
    let timeout: number | undefined;

    const schedule = (delay: number) => {
      if (cancelled) return;
      timeout = window.setTimeout(() => void refresh(), delay);
    };
    const refresh = async (silent = true) => {
      if (cancelled) return;
      if (document.visibilityState !== "visible") {
        schedule(baseDelay);
        return;
      }
      const succeeded = await loadWorkspace(appliedBaketFilters, silent);
      failureCount = succeeded ? 0 : Math.min(failureCount + 1, 3);
      schedule(Math.min(baseDelay * 2 ** failureCount, 120_000));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (timeout !== undefined) window.clearTimeout(timeout);
      void refresh(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    if (hasInitialWorkspace.current) {
      hasInitialWorkspace.current = false;
      schedule(baseDelay);
    } else {
      void refresh(false);
    }

    return () => {
      cancelled = true;
      if (timeout !== undefined) window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      workspaceAbortController.current?.abort();
    };
  }, [appliedBaketFilters, loadWorkspace, view]);

  const metrics = useMemo(() => {
    if (!workspace) {
      return null;
    }

    return {
      activeTasks: workspace.tasks.filter((item) => item.assignmentStatus !== "COMPLETED").length,
      pendingIncoming: workspace.incoming.filter((item) => item.validationSummary !== "VALID").length,
      readyToSendBakets:
        workspace.baketCandidates.length +
        workspace.bakets.filter((item) => item.status === "DRAFT" || item.status === "READY_TO_SEND").length,
    };
  }, [workspace]);
  const jaringKpiCards = useMemo(
    () => [
      {
        label: "Total Jaring",
        value: jaringSummary.total,
        filter: "all",
        tone: "blue" as const,
        icon: <DOMAIN_VISUALS.jaring.Icon className="size-5" />,
      },
      {
        label: "Terverifikasi",
        value: jaringSummary.approved,
        percentageLabel: `${formatPercent(percentOf(jaringSummary.approved, jaringSummary.total))}% dari total Jaring`,
        filter: "APPROVED",
        tone: "green" as const,
        icon: <CheckCircle2 className="size-5" />,
      },
      {
        label: "Belum Terverifikasi",
        value: jaringSummary.pending,
        percentageLabel: `${formatPercent(percentOf(jaringSummary.pending, jaringSummary.total))}% dari total Jaring`,
        filter: "PENDING",
        tone: "amber" as const,
        icon: <Clock className="size-5" />,
      },
      {
        label: "Ditolak",
        value: jaringSummary.rejected,
        percentageLabel: `${formatPercent(percentOf(jaringSummary.rejected, jaringSummary.total))}% dari total Jaring`,
        filter: "REJECTED",
        tone: "red" as const,
        icon: <XCircle className="size-5" />,
      },
    ],
    [jaringSummary],
  );
  const registeredJaring = useMemo(() => workspace?.jaring ?? [], [workspace]);

  const readyToSendBakets = useMemo(
    () =>
      [...(workspace?.bakets.filter((item) => item.status === "DRAFT" || item.status === "READY_TO_SEND") ?? [])].sort(
        (a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return baketCreatedSortOrder === "asc" ? aTime - bTime : bTime - aTime;
        },
      ),
    [workspace, baketCreatedSortOrder],
  );
  const submittedBakets = useMemo(
    () =>
      [...(workspace?.bakets.filter((item) => item.status !== "DRAFT" && item.status !== "READY_TO_SEND") ?? [])].sort(
        (a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return baketCreatedSortOrder === "asc" ? aTime - bTime : bTime - aTime;
        },
      ),
    [workspace, baketCreatedSortOrder],
  );
  const safeReadyToSendPage = Math.min(
    readyToSendPage,
    Math.max(1, Math.ceil(readyToSendBakets.length / readyToSendLimit)),
  );
  const paginatedReadyToSendBakets = useMemo(
    () => readyToSendBakets.slice((safeReadyToSendPage - 1) * readyToSendLimit, safeReadyToSendPage * readyToSendLimit),
    [readyToSendBakets, safeReadyToSendPage, readyToSendLimit],
  );
  const safeSentPage = Math.min(sentPage, Math.max(1, Math.ceil(submittedBakets.length / sentLimit)));
  const paginatedSubmittedBakets = useMemo(
    () => submittedBakets.slice((safeSentPage - 1) * sentLimit, safeSentPage * sentLimit),
    [submittedBakets, safeSentPage, sentLimit],
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

  const setJaringColumnVisibility = (column: JaringColumnKey, visible: boolean) => {
    const next = new Set(visibleJaringColumns);
    if (visible) {
      next.add(column);
    } else {
      next.delete(column);
    }
    setVisibleJaringColumns(next);
    window.localStorage.setItem(JARING_COLUMNS_STORAGE_KEY, JSON.stringify([...next]));
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
      const body = (await response.json().catch(() => null)) as {
        recipientCount?: number;
        message?: string;
      } | null;

      if (!response.ok) {
        throw new Error(body?.message ?? "Gagal meneruskan instruksi ke Jaring.");
      }

      setForwardedAssignment(assignmentId, true);
      setActionNotice(`Instruksi Jaring dibuat untuk ${body?.recipientCount ?? jaringIds.length} target.`);
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
        throw new Error(body.message ?? "Gagal memperbarui tugas.");
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
        throw new Error((body && "message" in body ? body.message : null) ?? "Gagal memeriksa laporan.");
      }

      const result = body && "validationSummary" in body ? body.validationSummary : null;
      setActionNotice(
        result === "VALID"
          ? "Pemeriksaan selesai. Laporan langsung masuk ke antrian Siap Dikirim."
          : "Pemeriksaan selesai. Cek badge dan catatan laporan sebelum dimasukkan ke antrian Siap Dikirim.",
      );
    });
  };

  const createBaket = async (
    messageId: string,
    payload: {
      categoryId: string;
      urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT";
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
        throw new Error(body.message ?? "Gagal membuat baket.");
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
        throw new Error(body.message ?? "Gagal menghapus laporan.");
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
        throw new Error(body.message ?? "Gagal mengirim baket.");
      }

      setActionNotice("Baket berhasil dikirim ke OIM dan sudah masuk ke antrean Laporan Masuk.");
      setBaketTab("sent");
    });
  };

  const changeJaringStatus = async (jaringId: string, action: "activate" | "deactivate" | "delete") => {
    await runAction(`jaring:${jaringId}:${action}`, async () => {
      const response = await fetch(`/api/field-officer/jaring/${jaringId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          reason: `Status diubah dari ruang kerja Petugas Wilayah (Gaswil) ke mode ${action}.`,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Gagal mengubah status jaring.");
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
        throw new Error(body.message ?? "Gagal mengirim lokasi.");
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
        title: item.displayTitle || item.jaringAlias,
        subtitle: `${item.jaringCode} - ${item.status}`,
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
        <AlertTitle>Ruang kerja tidak tersedia</AlertTitle>
        <AlertDescription>{error || "Data Petugas Wilayah (Gaswil) belum dapat dibaca."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 text-[var(--tactical-text-primary)] transition-colors duration-150 sm:space-y-6">
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

      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Daftar Jaring (Petugas Wilayah)</h1>
          <p className="mt-1 text-muted-foreground text-sm max-w-2xl">
            Kelola, pantau, dan verifikasi data Daftar Jaring serta komunikasi operasional di wilayah tugas Anda.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadWorkspace()}
            disabled={isLoading}
            className="w-fit h-9 gap-2 text-xs"
          >
            <RefreshCw className={cn("size-4 text-sky-600 dark:text-sky-400", isLoading && "animate-spin")} />
            Muat Ulang
          </Button>

          <button
            type="button"
            disabled={isBusy === "location:publish"}
            onClick={() =>
              requestConfirmation({
                title: "KONFIRMASI SINKRONISASI GPS",
                description: "Kirim posisi GPS terbaru Anda ke ruang kerja lapangan sekarang?",
                confirmLabel: "YA, KIRIM",
                onConfirm: () => {
                  void publishOwnLocation();
                },
              })
            }
            className="h-9 shrink-0 cursor-pointer rounded-md border border-slate-300 dark:border-white/10 bg-background px-3 font-mono font-semibold text-foreground text-xs uppercase tracking-wider transition-all duration-150 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] disabled:opacity-50"
          >
            SINKRONKAN GPS
          </button>
        </div>
      </div>

      {/* 4 FEATURED KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {jaringKpiCards.map((card) => (
          <MetricCard
            key={card.filter}
            icon={card.icon}
            label={card.label}
            percentageLabel={card.percentageLabel}
            value={card.value}
            tone={card.tone}
            active={jaringStatusFilter === card.filter}
            onClick={() => setJaringStatusFilter(card.filter)}
          />
        ))}
      </div>

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
              { label: "JUMLAH TUGAS", value: workspace.tasks.length },
              { label: "AKTIF", value: metrics.activeTasks },
            ]}
          >
            <div className="space-y-4">
              {/* Task filters */}
              <div className="grid items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 dark:border-white/5 dark:bg-white/[0.02]">
                <div className="space-y-1.5">
                  <label
                    htmlFor="task-classification-filter"
                    className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]"
                  >
                    Klasifikasi
                  </label>
                  <NativeSelect
                    id="task-classification-filter"
                    value={taskClassificationFilter}
                    onChange={(e) => setTaskClassificationFilter(e.target.value)}
                    className="h-9 w-full"
                  >
                    <option value="">Semua Klasifikasi</option>
                    <option value="BIASA">BIASA</option>
                    <option value="TERBATAS">TERBATAS</option>
                    <option value="RAHASIA">RAHASIA</option>
                    <option value="SANGAT_RAHASIA">SANGAT RAHASIA</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-priority-filter"
                    className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]"
                  >
                    Prioritas
                  </label>
                  <NativeSelect
                    id="task-priority-filter"
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value)}
                    className="h-9 w-full"
                  >
                    <option value="">Semua Prioritas</option>
                    <option value="LOW">Rendah</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Tinggi</option>
                    <option value="URGENT">Mendesak</option>
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-period-start"
                    className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]"
                  >
                    Periode Mulai
                  </label>
                  <Input
                    id="task-period-start"
                    type="date"
                    value={taskPeriodStart}
                    onChange={(e) => setTaskPeriodStart(e.target.value)}
                    className="h-9 w-full border-slate-200 bg-white text-sm dark:border-white/10 dark:bg-[#131A26]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="task-period-end"
                    className="font-bold font-mono text-[11px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]"
                  >
                    Periode Selesai
                  </label>
                  <Input
                    id="task-period-end"
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
                <ViewModeToggle value={taskViewMode} onValueChange={setTaskViewMode} buttonClassName="size-7" />
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
                            Klasifikasi
                          </TableHead>
                          <TableHead className="py-3.5 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]">
                            Prioritas
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
                          <SortableTableHeader
                            column="dueDate"
                            sortDirection={taskDeadlineSortOrder}
                            onSortChange={(direction) => {
                              setTaskDeadlineSortOrder(direction);
                              setTasksPage(1);
                            }}
                            className="py-3.5 font-bold font-mono text-[10px] text-slate-500 uppercase tracking-wider dark:text-[#7C8798]"
                          >
                            Deadline
                          </SortableTableHeader>
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
                                <span
                                  className="rounded border px-2 py-0.5 font-bold font-mono text-[9px] tracking-wider uppercase"
                                  style={{
                                    color: classStyle.color,
                                    backgroundColor: classStyle.bgColor,
                                    borderColor: classStyle.borderColor,
                                  }}
                                >
                                  {classStyle.label}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-bold font-mono text-[9px] text-slate-600 tracking-wider uppercase dark:border-white/10 dark:bg-white/5 dark:text-[#7C8798]">
                                  {task.priority}
                                </span>
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
                                  <Link href={`/dashboard/petugas-wilayah/tugas-saya/${task.assignmentId}`}>
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
          <TacticalSection>
            <div className="mb-4 flex justify-end">
              <Button asChild variant="success" size="lg" className="font-mono uppercase tracking-wider">
                <Link href="/dashboard/daftar-jaring/baru">
                  <Plus className="size-4" />
                  Tambah Jaring
                </Link>
              </Button>
            </div>

            <div>
              {/* Jaring Binaan List */}
              <div className="space-y-4">
                {jaringTotal === 0 &&
                !loadingJaring &&
                !jaringSearch &&
                jaringOccupationFilter === "all" &&
                jaringVillageFilter === "all" &&
                jaringStatusFilter === "all" &&
                jaringActiveFilter === "all" ? (
                  <TacticalEmptyState
                    title="Tidak ada Daftar Jaring"
                    description="Tekan tombol Tambah Jaring untuk mendaftarkan Jaring operasional baru."
                    icon={DOMAIN_VISUALS.jaring.Icon}
                  />
                ) : (
                  <>
                    {/* Filters bar */}
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-secondary/10 dark:bg-slate-900/20 p-3 rounded-lg border border-[var(--tactical-border)]">
                      <p className="basis-full text-xs font-semibold text-foreground">{jaringAreaSubtitle}</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-48">
                          <Input
                            className="h-8 pl-8 text-xs bg-background dark:bg-slate-900/40 border-[var(--tactical-border)] focus-visible:ring-1 focus-visible:ring-cyan-500"
                            placeholder="Cari nama, nama sandi, nomor..."
                            value={jaringSearch}
                            onChange={(e) => setJaringSearch(e.target.value)}
                          />
                          <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground/60" />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--tactical-text-secondary)]">
                          <span>Pekerjaan:</span>
                          <Select value={jaringOccupationFilter} onValueChange={setJaringOccupationFilter}>
                            <SelectTrigger className="w-[150px] h-8 border-[var(--tactical-border)] bg-background dark:bg-slate-900/40 text-xs">
                              <SelectValue placeholder="Pilih Pekerjaan" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-[var(--tactical-border)] text-foreground">
                              <SelectItem value="all">Semua Pekerjaan</SelectItem>
                              {workspace.occupations.map((occupation) => (
                                <SelectItem key={occupation.id} value={occupation.id}>
                                  {occupation.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--tactical-text-secondary)]">
                          <span>Kelurahan/Desa:</span>
                          <Select value={jaringVillageFilter} onValueChange={setJaringVillageFilter}>
                            <SelectTrigger className="w-[150px] h-8 border-[var(--tactical-border)] bg-background dark:bg-slate-900/40 text-xs">
                              <SelectValue placeholder="Pilih Kelurahan/Desa" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-[var(--tactical-border)] text-foreground">
                              <SelectItem value="all">Semua Kelurahan</SelectItem>
                              {jaringVillageOptions.map((area) => (
                                <SelectItem key={area.areaId} value={area.areaId}>
                                  {area.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--tactical-text-secondary)]">
                          <span>Status:</span>
                          <Select value={jaringStatusFilter} onValueChange={setJaringStatusFilter}>
                            <SelectTrigger className="w-[180px] h-8 border-[var(--tactical-border)] bg-background dark:bg-slate-900/40 text-xs">
                              <SelectValue placeholder="Pilih Status" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-[var(--tactical-border)] text-foreground">
                              <SelectItem value="all">Semua Status</SelectItem>
                              <SelectItem value="PENDING">Belum Terverifikasi</SelectItem>
                              <SelectItem value="APPROVED">Terverifikasi</SelectItem>
                              <SelectItem value="REJECTED">Ditolak</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-mono text-[var(--tactical-text-secondary)]">
                          <span>{DOMAIN_TERMS.jaringActivity90Days}:</span>
                          <Select value={jaringActiveFilter} onValueChange={setJaringActiveFilter}>
                            <SelectTrigger className="w-[180px] h-8 border-[var(--tactical-border)] bg-background dark:bg-slate-900/40 text-xs">
                              <SelectValue placeholder="Pilih aktivitas laporan" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-[var(--tactical-border)] text-foreground">
                              <SelectItem value="all">Semua Aktivitas</SelectItem>
                              <SelectItem value="active">{DOMAIN_TERMS.jaringActive90Days}</SelectItem>
                              <SelectItem value="inactive">{DOMAIN_TERMS.jaringInactive90Days}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(jaringSearch ||
                          jaringOccupationFilter !== "all" ||
                          jaringVillageFilter !== "all" ||
                          jaringStatusFilter !== "all" ||
                          jaringActiveFilter !== "all") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setJaringSearch("");
                              setJaringOccupationFilter("all");
                              setJaringVillageFilter("all");
                              setJaringStatusFilter("all");
                              setJaringActiveFilter("all");
                            }}
                            className="h-8 text-xs font-mono hover:bg-secondary/40"
                          >
                            Reset Filter
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 font-mono text-xs">
                              <Columns3 className="size-3.5" />
                              Kolom
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Kolom ditampilkan</DropdownMenuLabel>
                            {JARING_COLUMN_OPTIONS.map((column) => (
                              <DropdownMenuCheckboxItem
                                key={column.key}
                                checked={visibleJaringColumns.has(column.key)}
                                onCheckedChange={(checked) => setJaringColumnVisibility(column.key, checked === true)}
                                onSelect={(event) => event.preventDefault()}
                              >
                                {column.label}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {filteredJaring.length === 0 ? (
                      <TacticalEmptyState
                        title="Tidak ada Jaring ditemukan"
                        description="Tidak ada Daftar Jaring yang memenuhi kriteria filter saat ini."
                        icon={DOMAIN_VISUALS.jaring.Icon}
                      />
                    ) : (
                      <div className="overflow-x-auto rounded-[6px] border border-[var(--tactical-border)]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {visibleJaringColumns.has("name") && <TableHead>Nama Jaring</TableHead>}
                              {visibleJaringColumns.has("whatsapp") && <TableHead>Nomor WhatsApp</TableHead>}
                              {visibleJaringColumns.has("alias") && <TableHead>Kode Jaring</TableHead>}
                              {visibleJaringColumns.has("gaswil") && <TableHead>Petugas Wilayah (Gaswil)</TableHead>}
                              {visibleJaringColumns.has("village") && <TableHead>Wilayah Penempatan</TableHead>}
                              {visibleJaringColumns.has("address") && <TableHead>Alamat</TableHead>}
                              {visibleJaringColumns.has("occupation") && <TableHead>Pekerjaan</TableHead>}
                              {visibleJaringColumns.has("status") && <TableHead>Status</TableHead>}
                              {visibleJaringColumns.has("kinerja") && (
                                <TableHead>{DOMAIN_TERMS.jaringActivity90Days}</TableHead>
                              )}
                              <TableHead className="text-right">Aksi</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedJaring.map((jaring) => (
                              <TableRow key={jaring.id}>
                                {visibleJaringColumns.has("name") && (
                                  <TableCell>
                                    <div className="flex min-w-0 items-center gap-2">
                                      <Avatar className="size-9 shrink-0 border border-[var(--tactical-border)]">
                                        {jaring.profilePhotoUrl || jaring.profilePhotoFileId ? (
                                          <AvatarImage
                                            src={jaring.profilePhotoUrl || `/api/files/${jaring.profilePhotoFileId}`}
                                            alt={`Foto Jaring ${jaring.fullName || jaring.aliasName}`}
                                          />
                                        ) : null}
                                        <AvatarFallback className="font-mono text-[10px]">
                                          {(jaring.fullName || jaring.aliasName || "JR").slice(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <div
                                        className="max-w-48 truncate font-medium text-[var(--tactical-text-primary)]"
                                        title={jaring.fullName ?? undefined}
                                      >
                                        {jaring.fullName || "-"}
                                      </div>
                                    </div>
                                  </TableCell>
                                )}
                                {visibleJaringColumns.has("whatsapp") && (
                                  <TableCell className="font-mono">{jaring.whatsappNumber}</TableCell>
                                )}
                                {visibleJaringColumns.has("alias") && (
                                  <TableCell>
                                    <div className="font-mono font-semibold text-[var(--tactical-text-primary)]">
                                      {jaring.aliasName}
                                    </div>
                                    {jaring.notes && (
                                      <div
                                        className="max-w-48 truncate text-[11px] text-[var(--tactical-text-muted)]"
                                        title={jaring.notes}
                                      >
                                        {jaring.notes}
                                      </div>
                                    )}
                                  </TableCell>
                                )}
                                {visibleJaringColumns.has("gaswil") && (
                                  <TableCell>
                                    <GaswilEntityLink name={workspace.profile.name} href="/dashboard/profil" />
                                  </TableCell>
                                )}
                                {visibleJaringColumns.has("village") && (
                                  <TableCell>{jaring.areaNames.join(", ") || "Belum ditetapkan"}</TableCell>
                                )}
                                {visibleJaringColumns.has("address") && (
                                  <TableCell>
                                    <div className="max-w-64 truncate" title={jaring.address ?? undefined}>
                                      {jaring.address || "-"}
                                    </div>
                                  </TableCell>
                                )}
                                {visibleJaringColumns.has("occupation") && (
                                  <TableCell>{jaring.occupationName || "-"}</TableCell>
                                )}
                                {visibleJaringColumns.has("status") && (
                                  <TableCell>
                                    <span
                                      className={`tactical-badge rounded px-2 py-0.5 text-[11px] ${statusTone(jaring.registrationStatus)}`}
                                    >
                                      {jaringRegistrationStatusLabel(jaring.registrationStatus)}
                                    </span>
                                  </TableCell>
                                )}
                                {visibleJaringColumns.has("kinerja") && (
                                  <TableCell>
                                    <span
                                      className={`tactical-badge rounded px-2 py-0.5 text-[10px] ${isFieldOfficerJaringActive(jaring) ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30" : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30"}`}
                                    >
                                      {isFieldOfficerJaringActive(jaring)
                                        ? DOMAIN_TERMS.jaringActive90Days
                                        : DOMAIN_TERMS.jaringInactive90Days}
                                    </span>
                                  </TableCell>
                                )}
                                <TableCell>
                                  <div className="flex justify-end gap-2">
                                    <Link
                                      href={`/dashboard/daftar-jaring/${jaring.id}`}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--tactical-border)] px-3 font-mono font-semibold text-[11px] text-[var(--tactical-text-secondary)] uppercase hover:bg-secondary/40 cursor-pointer"
                                    >
                                      <Eye className="size-3.5" />
                                      Detail
                                    </Link>
                                    <Link
                                      href={`/dashboard/daftar-jaring/${jaring.id}/edit`}
                                      className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-amber-600 px-3 font-mono font-semibold text-amber-700 text-[11px] uppercase hover:bg-amber-500/10 dark:text-amber-400"
                                    >
                                      <Pencil className="size-3.5" />
                                      {jaring.registrationStatus === "REJECTED" ? "Revisi Data" : "Edit"}
                                    </Link>
                                    <button
                                      type="button"
                                      disabled={isBusy === `jaring:${jaring.id}:delete`}
                                      onClick={() =>
                                        requestConfirmation({
                                          title: "KONFIRMASI HAPUS JARING",
                                          description: `Hapus jaring ${jaring.aliasName}? Data akan dihapus dari daftar aktif tanpa menghilangkan riwayatnya.`,
                                          confirmLabel: "YA, HAPUS",
                                          onConfirm: () => void changeJaringStatus(jaring.id, "delete"),
                                        })
                                      }
                                      className="h-8 rounded-[4px] bg-[#991B1B] px-3 font-mono font-semibold text-white text-[11px] uppercase hover:bg-[#DC2626] disabled:opacity-50"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {filteredJaring.length > 0 && (
                      <TablePagination
                        page={safeJaringPage}
                        limit={jaringLimit}
                        total={jaringTotal}
                        onPageChange={setJaringPage}
                        onLimitChange={(limit) => {
                          setJaringLimit(limit);
                          setJaringPage(1);
                        }}
                        className="mt-4 border border-slate-200 dark:border-white/5 rounded-xl bg-white dark:bg-[#131A26] px-6"
                      />
                    )}
                  </>
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
            title="INFORMASI JARING"
            description="Pemeriksaan judul, isi, bukti foto, koordinat GPS, waktu kejadian, Jaring, dan sumber laporan intelijen."
            metadata={[
              { label: "BELUM DIPERIKSA", value: metrics.pendingIncoming },
              { label: "JUMLAH SUMBER", value: workspace.incoming.length },
            ]}
          >
            {workspace.incoming.length === 0 ? (
              <TacticalEmptyState
                title="Tidak ada laporan masuk"
                description="Semua pesan masuk dari Jaring telah diperiksa dan diarsipkan."
                icon={DOMAIN_VISUALS.jaringReport.Icon}
              />
            ) : (
              <>
                <div className="max-w-full overflow-hidden rounded-[10px] border border-[var(--tactical-border)]">
                  <div className="w-full overflow-x-auto">
                    <Table className="w-full min-w-[980px] table-fixed">
                      <TableHeader>
                        <TableRow className="border-[var(--tactical-border)] bg-black/5 hover:bg-transparent dark:bg-white/[0.01]">
                          <TableHead className="w-[25%] pl-4 font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Informasi
                          </TableHead>
                          <TableHead className="w-[13%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Identitas Jaring
                          </TableHead>
                          <TableHead className="w-[12%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Pemeriksaan
                          </TableHead>
                          <TableHead className="w-[16%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Waktu
                          </TableHead>
                          <TableHead className="w-[14%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Area
                          </TableHead>
                          <TableHead className="w-[10%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Bukti
                          </TableHead>
                          <TableHead className="w-[120px] pr-4 text-right font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                            Aksi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedIncoming.map((message) => {
                          const jaring = workspace.jaring.find((item) => item.id === message.jaringId);
                          return (
                            <TableRow key={message.id} className="border-[var(--tactical-border)]">
                              <TableCell className="min-w-0 py-4 pl-4">
                                <Link
                                  href={`/dashboard/petugas-wilayah/kotak-masuk-jaring/${message.id}`}
                                  className="block truncate font-semibold text-[var(--tactical-text-primary)] hover:text-[var(--tactical-blue)] hover:underline"
                                >
                                  {message.displayTitle || message.jaringAlias}
                                </Link>
                                <p className="mt-1 line-clamp-2 text-[var(--tactical-text-secondary)] text-xs">
                                  {message.content || "Pesan belum memiliki isi teks."}
                                </p>
                                {message.referenceNumber ? (
                                  <p className="mt-1 font-mono text-[10px] text-[var(--tactical-blue)]">
                                    {message.referenceNumber}
                                  </p>
                                ) : null}
                              </TableCell>
                              <TableCell className="min-w-[280px] py-4">
                                <JaringIdentitySummary
                                  compact
                                  source={{
                                    id: message.jaringId,
                                    fullName: jaring?.fullName,
                                    jaringAlias: message.jaringAlias,
                                    jaringCode: message.jaringCode,
                                    whatsappNumber: jaring?.whatsappNumber ?? message.senderPhone,
                                    profilePhotoUrl: jaring?.profilePhotoUrl,
                                    profilePhotoFileId: jaring?.profilePhotoFileId,
                                    gaswilName: workspace.profile.name,
                                    gaswilHref: "/dashboard/profil",
                                    villageName: jaring?.areaNames.join(", ") || message.areaName,
                                  }}
                                />
                              </TableCell>
                              <TableCell className="py-4">
                                <span
                                  className={`tactical-badge inline-block max-w-full truncate rounded px-2 py-0.5 text-[11px] ${statusTone(message.status)}`}
                                >
                                  {validationLabel(message.validationSummary)}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 font-mono text-[11px] text-[var(--tactical-text-muted)]">
                                <span className="block">Terima: {formatDateTime(message.receivedAt)}</span>
                                <span className="block">Kejadian: {formatDateTime(message.reportedAt)}</span>
                              </TableCell>
                              <TableCell className="min-w-0 py-4 font-mono text-xs text-[var(--tactical-text-secondary)]">
                                <span className="block truncate">{message.areaName || "-"}</span>
                                {message.latitude !== null && message.longitude !== null ? (
                                  <a
                                    href={`https://www.google.com/maps?q=${message.latitude},${message.longitude}`}
                                    rel="noreferrer"
                                    target="_blank"
                                    className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--tactical-blue)] hover:underline"
                                  >
                                    <MapPin className="size-3" />
                                    GPS
                                  </a>
                                ) : null}
                              </TableCell>
                              <TableCell className="py-4 font-mono text-xs text-[var(--tactical-text-secondary)]">
                                {message.hasPhoto ? (
                                  <span className="inline-flex items-center gap-1 text-[var(--tactical-green)]">
                                    <CheckCircle2 className="size-3.5" />
                                    {message.mediaCount} File
                                  </span>
                                ) : (
                                  "-"
                                )}
                              </TableCell>
                              <TableCell className="py-4 pr-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    asChild
                                    variant="ghost"
                                    className="h-8 rounded-[4px] border border-[#475569] px-2 font-mono text-[10px] sm:px-3"
                                  >
                                    <Link href={`/dashboard/petugas-wilayah/kotak-masuk-jaring/${message.id}`}>
                                      Detail
                                    </Link>
                                  </Button>
                                  <button
                                    type="button"
                                    disabled={isBusy === `validate:${message.id}`}
                                    onClick={() =>
                                      requestConfirmation({
                                        title: "KONFIRMASI PEMERIKSAAN",
                                        description: "Jalankan pemeriksaan ulang untuk laporan masuk ini sekarang?",
                                        confirmLabel: "YA, PERIKSA",
                                        onConfirm: () => {
                                          void validateIncoming(message.id);
                                        },
                                      })
                                    }
                                    className="h-8 cursor-pointer rounded-[4px] bg-[#16A34A] px-2 font-mono font-semibold text-white text-[10px] uppercase transition hover:bg-[#15803D] disabled:opacity-50 sm:px-3"
                                  >
                                    Periksa
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy === `delete:${message.id}`}
                                    onClick={() =>
                                      requestConfirmation({
                                        title: "KONFIRMASI TOLAK LAPORAN",
                                        description: "Tolak dan keluarkan laporan ini dari antrean informasi Jaring?",
                                        confirmLabel: "YA, TOLAK",
                                        onConfirm: () => {
                                          void deleteIncoming(message.id);
                                        },
                                      })
                                    }
                                    className="h-8 cursor-pointer rounded-[4px] bg-[#991B1B] px-2 font-mono font-semibold text-white text-[10px] uppercase transition hover:bg-[#DC2626] disabled:opacity-50 sm:px-3"
                                  >
                                    Tolak
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
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
            <div className="tactical-card !p-1 min-w-0 max-w-full overflow-hidden rounded-[6px] bg-black/5 dark:bg-white/[0.01]">
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

                <div className="grid gap-3 rounded-[6px] border border-[var(--tactical-border)] bg-black/5 p-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_auto_auto] dark:bg-white/[0.01]">
                  <NativeSelect
                    value={baketFilterDraft.categoryId}
                    onChange={(event) =>
                      setBaketFilterDraft((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className="h-10 w-full"
                    aria-label="Filter kategori baket"
                  >
                    <option value="">Semua Kategori</option>
                    {sortReportCategories(workspace.reportCategories.filter((item) => item.isActive)).map(
                      (category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ),
                    )}
                  </NativeSelect>

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

                <TabsContent value="ready-to-send" className="min-w-0 grid gap-4 pt-2">
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
                              jaring={workspace.jaring.find((item) => item.id === message.jaringId)}
                              gaswilName={workspace.profile.name}
                              categories={workspace.reportCategories}
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
                          {baketViewMode === "table" ? (
                            <div className="max-w-full overflow-hidden rounded-[10px] border border-[var(--tactical-border)]">
                              <div className="w-full overflow-x-auto">
                                <Table className="w-full table-fixed">
                                  <TableHeader>
                                    <TableRow className="border-[var(--tactical-border)] bg-black/5 hover:bg-transparent dark:bg-white/[0.01]">
                                      <TableHead className="w-[38%] pl-4 font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                        Judul Baket
                                      </TableHead>
                                      <TableHead className="w-[22%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                        Kategori
                                      </TableHead>
                                      <TableHead className="w-[10%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                        Urgensi
                                      </TableHead>
                                      <SortableTableHeader
                                        column="createdAt"
                                        sortDirection={baketCreatedSortOrder}
                                        onSortChange={(direction) => {
                                          setBaketCreatedSortOrder(direction);
                                          setReadyToSendPage(1);
                                          setSentPage(1);
                                        }}
                                        className="w-[14%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider"
                                      >
                                        Dibuat
                                      </SortableTableHeader>
                                      <TableHead className="w-[120px] pr-4 text-right font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                        Aksi
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {paginatedReadyToSendBakets.map((baket) => {
                                      const jaring = workspace.jaring.find((item) => item.id === baket.primaryJaringId);
                                      return (
                                        <TableRow key={baket.id} className="border-[var(--tactical-border)]">
                                          <TableCell className="min-w-0 py-4 pl-4">
                                            <div className="space-y-1">
                                              <p className="truncate font-semibold text-[var(--tactical-text-primary)]">
                                                {baket.currentVersionDisplayTitle || "Tanpa judul versi aktif"}
                                              </p>
                                              <JaringIdentitySummary
                                                compact
                                                source={{
                                                  id: baket.primaryJaringId,
                                                  fullName: jaring?.fullName,
                                                  jaringAlias: baket.primaryJaringAlias,
                                                  jaringCode: baket.primaryJaringCode,
                                                  whatsappNumber: jaring?.whatsappNumber,
                                                  profilePhotoUrl: jaring?.profilePhotoUrl,
                                                  profilePhotoFileId: jaring?.profilePhotoFileId,
                                                  gaswilName: workspace.profile.name,
                                                  gaswilHref: "/dashboard/profil",
                                                  villageName: jaring?.areaNames.join(", "),
                                                }}
                                              />
                                            </div>
                                          </TableCell>
                                          <TableCell className="min-w-0 py-4 font-mono text-xs text-[var(--tactical-text-secondary)]">
                                            <span className="block truncate">{baket.categoryName || "LEGACY"}</span>
                                          </TableCell>
                                          <TableCell className="py-4">
                                            <span
                                              className={`tactical-badge rounded px-2 py-0.5 font-mono text-[11px] ${urgencyTone(baket.urgency)}`}
                                            >
                                              {baketUrgencyLabel(baket.urgency)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="truncate whitespace-nowrap py-4 font-mono text-xs text-[var(--tactical-text-muted)]">
                                            {formatDateTime(baket.createdAt)}
                                          </TableCell>
                                          <TableCell className="py-4 pr-4 text-right">
                                            <button
                                              type="button"
                                              disabled={isBusy === `submit:${baket.id}`}
                                              onClick={() =>
                                                requestConfirmation({
                                                  title: "KONFIRMASI KIRIM KE OIM",
                                                  description:
                                                    "Apakah Anda yakin ingin mengirim laporan Baket ini ke OIM?",
                                                  confirmLabel: "YA, KIRIM",
                                                  onConfirm: () => {
                                                    void submitBaket(baket.id);
                                                  },
                                                })
                                              }
                                              className="h-8 cursor-pointer rounded-[4px] bg-[#16A34A] px-2 font-mono font-semibold text-white text-[10px] uppercase transition hover:bg-[#15803D] disabled:opacity-50 sm:px-3"
                                            >
                                              Kirim
                                            </button>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          ) : (
                            paginatedReadyToSendBakets.map((baket) => {
                              const jaring = workspace.jaring.find((item) => item.id === baket.primaryJaringId);
                              return (
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
                                        <span
                                          className={`tactical-badge rounded px-2 py-0.5 font-mono text-[11px] ${urgencyTone(baket.urgency)}`}
                                        >
                                          URGENSI: {baketUrgencyLabel(baket.urgency)}
                                        </span>
                                      </div>
                                      <h3 className="font-semibold text-[var(--tactical-text-primary)] text-lg">
                                        {baket.currentVersionDisplayTitle || "Tanpa judul versi aktif"}
                                      </h3>
                                      <JaringIdentitySummary
                                        compact
                                        source={{
                                          id: baket.primaryJaringId,
                                          fullName: jaring?.fullName,
                                          jaringAlias: baket.primaryJaringAlias,
                                          jaringCode: baket.primaryJaringCode,
                                          whatsappNumber: jaring?.whatsappNumber,
                                          profilePhotoUrl: jaring?.profilePhotoUrl,
                                          profilePhotoFileId: jaring?.profilePhotoFileId,
                                          gaswilName: workspace.profile.name,
                                          gaswilHref: "/dashboard/profil",
                                          villageName: jaring?.areaNames.join(", "),
                                        }}
                                      />
                                      <p className="rounded border border-[var(--tactical-border)] bg-black/5 p-2.5 text-[var(--tactical-text-secondary)] text-sm italic leading-relaxed dark:bg-white/[0.01]">
                                        {baket.summary || "Catatan Petugas Wilayah (Gaswil) belum ditambahkan."}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
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
                              );
                            })
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {readyToSendBakets.length > 0 && (
                    <TablePagination
                      page={safeReadyToSendPage}
                      limit={readyToSendLimit}
                      total={readyToSendBakets.length}
                      onPageChange={setReadyToSendPage}
                      onLimitChange={(limit) => {
                        setReadyToSendLimit(limit);
                        setReadyToSendPage(1);
                      }}
                      className="rounded-[10px] border border-[var(--tactical-border)] bg-black/5 px-4 dark:bg-white/[0.01]"
                    />
                  )}
                </TabsContent>

                <TabsContent value="sent" className="min-w-0 grid gap-4 pt-2">
                  {submittedBakets.length === 0 ? (
                    <TacticalEmptyState
                      title="Tidak ada Baket terkirim"
                      description="Belum ada Baket yang telah dikirim ke OIM."
                      icon={Send}
                    />
                  ) : baketViewMode === "table" ? (
                    <div className="max-w-full overflow-hidden rounded-[10px] border border-[var(--tactical-border)]">
                      <div className="w-full overflow-x-auto">
                        <Table className="w-full table-fixed">
                          <TableHeader>
                            <TableRow className="border-[var(--tactical-border)] bg-black/5 hover:bg-transparent dark:bg-white/[0.01]">
                              <TableHead className="w-[34%] pl-4 font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                Judul Baket
                              </TableHead>
                              <TableHead className="w-[20%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                Status
                              </TableHead>
                              <TableHead className="w-[18%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                Kategori
                              </TableHead>
                              <TableHead className="w-[10%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                Urgensi
                              </TableHead>
                              <SortableTableHeader
                                column="createdAt"
                                sortDirection={baketCreatedSortOrder}
                                onSortChange={(direction) => {
                                  setBaketCreatedSortOrder(direction);
                                  setReadyToSendPage(1);
                                  setSentPage(1);
                                }}
                                className="w-[14%] font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider"
                              >
                                Dibuat
                              </SortableTableHeader>
                              <TableHead className="w-[110px] pr-4 text-right font-mono font-bold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                                Aksi
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {paginatedSubmittedBakets.map((baket) => (
                              <TableRow key={baket.id} className="border-[var(--tactical-border)]">
                                <TableCell className="min-w-0 py-4 pl-4">
                                  <p className="truncate font-semibold text-[var(--tactical-text-primary)]">
                                    {baket.currentVersionDisplayTitle || "Tanpa judul versi aktif"}
                                  </p>
                                </TableCell>
                                <TableCell className="min-w-0 py-4">
                                  <span
                                    className={`tactical-badge inline-block max-w-full truncate rounded px-2 py-0.5 text-[11px] ${statusTone(baket.status)}`}
                                  >
                                    {baketStatusLabel(baket.status, baket.sentToPositionTitle)}
                                  </span>
                                </TableCell>
                                <TableCell className="min-w-0 py-4 font-mono text-xs text-[var(--tactical-text-secondary)]">
                                  <span className="block truncate">{baket.categoryName || "LEGACY"}</span>
                                </TableCell>
                                <TableCell className="py-4">
                                  <span
                                    className={`tactical-badge rounded px-2 py-0.5 font-mono text-[11px] ${urgencyTone(baket.urgency)}`}
                                  >
                                    {baketUrgencyLabel(baket.urgency)}
                                  </span>
                                </TableCell>
                                <TableCell className="truncate whitespace-nowrap py-4 font-mono text-xs text-[var(--tactical-text-muted)]">
                                  {formatDateTime(baket.createdAt)}
                                </TableCell>
                                <TableCell className="py-4 pr-4 text-right">
                                  <Button
                                    asChild
                                    variant="ghost"
                                    className="h-8 rounded-[4px] border border-[#475569] px-2 font-mono text-[10px] sm:px-3"
                                  >
                                    <Link href={BAKET_ROUTE}>Lihat Baket</Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    paginatedSubmittedBakets.map((baket) => (
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
                              {baket.currentVersionDisplayTitle || "Tanpa judul versi aktif"}
                            </h3>
                            <p className="text-[var(--tactical-text-secondary)] text-sm">
                              Dikirim ke OIM &middot; data terkunci dan hanya dapat dilihat.
                            </p>
                          </div>
                          <Button
                            asChild
                            variant="outline"
                            className="h-10 shrink-0 rounded-[4px] border-[#475569] bg-transparent px-[18px] font-mono font-semibold text-[#CBD5E1] text-xs uppercase hover:-translate-y-px hover:border-[#64748B] hover:bg-[#334155]"
                          >
                            <Link href={BAKET_ROUTE}>Lihat Baket</Link>
                          </Button>
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
                    <TablePagination
                      page={safeSentPage}
                      limit={sentLimit}
                      total={submittedBakets.length}
                      onPageChange={setSentPage}
                      onLimitChange={(limit) => {
                        setSentLimit(limit);
                        setSentPage(1);
                      }}
                      className="rounded-[10px] border border-[var(--tactical-border)] bg-black/5 px-4 dark:bg-white/[0.01]"
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
            title="PETA TUGAS & LOKASI LANGSUNG"
            description="Gabungan lokasi laporan Jaring dan ping lokasi terbaru petugas di lapangan."
            metadata={[
              { label: "MARKER AKTIF", value: mapPoints.length },
              {
                label: "AKURASI GPS",
                value: workspace.latestLocation?.gpsAccuracyMeters
                  ? `${workspace.latestLocation.gpsAccuracyMeters} m`
                  : "-",
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
                        LAPISAN PETA TAKTIS
                      </span>
                      <span className="flex items-center gap-1 rounded bg-[var(--tactical-green)]/15 px-1 font-bold text-[9px] text-[var(--tactical-green)]">
                        <span className="size-1 animate-ping rounded-full bg-[var(--tactical-green)]" />
                        LANGSUNG
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>STATUS GPS:</span>
                      <span className="font-medium text-[var(--tactical-text-primary)]">OPTIMAL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>JUMLAH MARKER:</span>
                      <span className="font-medium text-[var(--tactical-text-primary)]">{mapPoints.length} titik</span>
                    </div>
                    <div className="flex justify-between">
                      <span>KOORDINAT:</span>
                      <span
                        className="max-w-[100px] truncate font-medium text-[var(--tactical-text-primary)]"
                        title={`${mapCenter[1].toFixed(5)}, ${mapCenter[0].toFixed(5)}`}
                      >
                        {mapCenter[1].toFixed(5)}, {mapCenter[0].toFixed(5)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>PING TERAKHIR:</span>
                      <span className="font-medium text-[var(--tactical-text-primary)]">
                        {workspace.latestLocation ? "AKTIF" : "-"}
                      </span>
                    </div>
                  </div>

                  <FieldOfficerMap center={mapCenter} points={mapPoints} />
                </div>
              </div>

              {/* Kartu Lokasi Langsung */}
              <div className="tactical-card space-y-4">
                <h3 className="border-[var(--tactical-border)] border-b pb-2 font-semibold text-[var(--tactical-text-primary)] text-lg tracking-tight">
                  Lokasi Langsung
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
                    type="button"
                    disabled={isBusy === "location:publish"}
                    onClick={() =>
                      requestConfirmation({
                        title: "KONFIRMASI PING LOKASI",
                        description: "Kirim ping lokasi terbaru ke monitor ruang kerja sekarang?",
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
          description="Eskalasi darurat terpusat. Kirim lokasi darurat secara langsung ke koordinator."
          metadata={[
            { label: "UNIT DARURAT", value: "UNIT KOMANDO Koordinator Wilayah (Korwil)" },
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
                  Tombol darurat tetap berpusat pada pengiriman lokasi dan eskalasi ke koordinator/regional.
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
                description="Koordinator memeriksa Jaring terdaftar, cakupan wilayah, dan kanal WhatsApp pusat yang sedang terhubung."
              />
              <EmergencyStep
                icon={<Send className="size-4 shrink-0 text-[var(--tactical-red)]" strokeWidth={2} />}
                title="3. ESKALASI"
                description="Laporan diteruskan ke regional atau posko menggunakan kanal resmi di level koordinator."
              />

              <div className="pt-2 xl:col-span-3">
                <button
                  type="button"
                  disabled={isBusy === "location:publish"}
                  onClick={() =>
                    requestConfirmation({
                      title: "KONFIRMASI LOKASI DARURAT",
                      description: "Kirim lokasi darurat terbaru ke koordinator sekarang?",
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
    </main>
  );
}

/* HELPER COMPONENTS */

function MetricCard({
  active = false,
  icon,
  label,
  onClick,
  percentageLabel,
  tone = "blue",
  value,
}: {
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  percentageLabel?: string;
  tone?: "blue" | "green" | "amber" | "red";
  value: number;
}) {
  const activeClasses = {
    blue: "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10",
    amber: "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10",
    green: "border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10",
    red: "border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10",
  };

  const iconBg = {
    blue: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    red: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-xs text-left transition-all duration-150 cursor-pointer active:scale-[0.98] ${
        active ? activeClasses[tone] : "border-slate-200/80 dark:border-white/10 hover:border-slate-400/40"
      }`}
    >
      {icon && (
        <div className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${iconBg[tone]}`}>{icon}</div>
      )}
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
        {percentageLabel ? (
          <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
            {percentageLabel}
          </p>
        ) : null}
      </div>
    </button>
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
  code: _code,
  title,
  description,
  children,
  metadata,
  footer,
}: {
  code?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  metadata?: { label: string; value: string | number }[];
  footer?: React.ReactNode;
}) {
  const metadataGridClass = metadata && metadata.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2";

  return (
    <section className="space-y-4">
      {/* Section Header */}
      {title && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-[var(--tactical-border)] border-b pb-3">
          <div className="space-y-1">
            <h2 className="font-semibold text-[var(--tactical-text-primary)] text-xl tracking-tight">{title}</h2>
            {description && <p className="text-[var(--tactical-text-secondary)] text-xs">{description}</p>}
          </div>

          {/* Section Metadata */}
          {metadata && metadata.length > 0 && (
            <div
              className={`grid ${metadataGridClass} gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-mono shadow-sm dark:border-white/5 dark:bg-slate-900/40`}
            >
              {metadata.map((meta) => (
                <div key={meta.label} className="flex min-w-0 flex-col items-center px-1 text-center">
                  <span className="font-bold text-[9px] text-slate-500 uppercase tracking-widest dark:text-[#7C8798]">
                    {meta.label}
                  </span>
                  <span className="mt-0.5 font-bold text-lg text-slate-950 dark:text-white">{meta.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
  action: {
    label: string;
    nextStatus: "READ" | "ACKNOWLEDGED" | "IN_PROGRESS" | "COMPLETED";
  } | null;
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
    task.coordinatorInstruction ?? "Koordinator Wilayah (Korwil) belum menuliskan instruksi rinci untuk penugasan ini.";
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
            AKSI
          </span>
          <div className="flex flex-wrap items-center gap-[12px]">
            {action && (
              <>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleActionClick}
                  className="flex h-[40px] cursor-pointer items-center justify-center rounded-[4px] border border-[#475569] bg-transparent px-[18px] font-mono font-semibold text-[#CBD5E1] text-xs uppercase tracking-[0.04em] transition-all duration-180 hover:-translate-y-[1px] hover:border-[#64748B] hover:bg-[#334155] hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
                >
                  {isBusy ? "MEMPROSES..." : action.label.toUpperCase()}
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
              type="button"
              onClick={handleForwardClick}
              disabled={isForwarding}
              className={`flex h-[40px] cursor-pointer items-center justify-center rounded-[4px] px-[18px] font-mono font-semibold text-xs uppercase tracking-[0.04em] transition-all duration-180 hover:-translate-y-[1px] hover:brightness-105 active:scale-[0.98] ${
                forwarded
                  ? "bg-[#991B1B] text-white hover:bg-[#DC2626]"
                  : "bg-[#B45309] text-white shadow-[0_0_18px_rgba(217,119,6,0.20)] hover:bg-[#D97706] active:bg-[#92400E]"
              }`}
            >
              {isForwarding ? "MEMPROSES..." : forwarded ? "BATAL INSTRUKSI JARING" : "TERUSKAN KE JARING"}
            </button>

            <AlertDialog open={showForwardConfirm} onOpenChange={setShowForwardConfirm}>
              <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
                    BUAT INSTRUKSI KE JARING
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-[var(--tactical-text-secondary)] text-xs">
                    <span className="block">
                      Instruksi ini akan disiapkan untuk seluruh Jaring terdaftar di bawah Petugas Wilayah (Gaswil) ini.
                    </span>
                    <span className="block rounded-[6px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3 text-[var(--tactical-text-primary)]">
                      Target jaring: {jaring.length} personel
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="mt-4 space-y-2">
                  <label
                    htmlFor="forward-instruction"
                    className="block font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider"
                  >
                    Instruksi untuk Jaring
                  </label>
                  <Textarea
                    id="forward-instruction"
                    value={forwardInstruction}
                    onChange={(event) => setForwardInstruction(event.target.value)}
                    className="min-h-32 border-[var(--tactical-border)] bg-[var(--tactical-panel-bg)] text-[var(--tactical-text-primary)] text-sm"
                    placeholder="Tulis instruksi yang akan diteruskan ke seluruh Daftar Jaring..."
                  />
                  {jaring.length > 0 ? (
                    <div className="max-h-24 overflow-auto rounded-[6px] border border-[var(--tactical-panel-border)] bg-black/5 p-2 text-[10px] text-[var(--tactical-text-secondary)] dark:bg-white/[0.02]">
                      {jaring.map((item) => (
                        <div key={item.id} className="flex justify-between gap-3 py-1">
                          <span>{item.aliasName}</span>
                          <span className="text-[var(--tactical-text-muted)]">{item.fullName || item.id}</span>
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
              ID TUGAS
            </span>
            <span className="whitespace-pre-wrap break-all font-medium text-[var(--tactical-text-primary)] leading-relaxed">
              {task.assignmentId.toUpperCase()}
            </span>
          </div>

          <div className="flex min-h-[75px] flex-col justify-between rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
            <span className="mb-1.5 border-slate-200/50 border-b pb-1.5 font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider dark:border-white/[0.03]">
              WILAYAH SASARAN
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
              {(task.sourceLabel ?? "-").toUpperCase()}
            </span>
          </div>

          <div className="flex min-h-[75px] flex-col justify-between rounded-[10px] border border-[var(--tactical-panel-border)] bg-[var(--tactical-panel-bg)] p-3">
            <span className="mb-1.5 border-slate-200/50 border-b pb-1.5 font-semibold text-[9px] text-[var(--tactical-text-muted)] uppercase tracking-wider dark:border-white/[0.03]">
              TENGGAT
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
  actionLabel = "Muat Ulang",
  icon: IconComponent = Radio,
}: {
  title: string;
  description: string;
  onAction?: () => void;
  actionLabel?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
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
          type="button"
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
  jaring,
  gaswilName,
  categories,
  busy,
  onCreate,
}: {
  message: FieldOfficerIncoming;
  jaring?: FieldOfficerJaring;
  gaswilName: string;
  categories: ReportCategory[];
  busy: boolean;
  onCreate: (payload: { categoryId: string; urgency: "LOW" | "NORMAL" | "HIGH" | "URGENT" }) => Promise<void>;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [urgency, setUrgency] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const canCreate = Boolean(categoryId);

  return (
    <div className="tactical-card space-y-6 border-emerald-500/25 bg-emerald-500/[0.02]">
      {/* Candidate Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-[var(--tactical-border)] border-b pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`tactical-badge rounded px-2 py-0.5 text-[10px] ${statusTone(message.status)}`}>
            {message.status}
          </span>
          {message.referenceNumber ? (
            <span className="tactical-badge rounded border border-[var(--tactical-border)] px-2 py-0.5 font-mono text-[10px] text-[var(--tactical-blue)]">
              {message.referenceNumber}
            </span>
          ) : null}
        </div>
        <div className="font-mono text-[10px] text-[var(--tactical-text-muted)]">
          ID KANDIDAT: {message.id.slice(0, 8).toUpperCase()}
        </div>
      </div>

      <JaringIdentitySummary
        compact
        source={{
          id: message.jaringId,
          fullName: jaring?.fullName,
          jaringAlias: message.jaringAlias,
          jaringCode: message.jaringCode,
          whatsappNumber: jaring?.whatsappNumber ?? message.senderPhone,
          profilePhotoUrl: jaring?.profilePhotoUrl,
          profilePhotoFileId: jaring?.profilePhotoFileId,
          gaswilName,
          gaswilHref: "/dashboard/profil",
          villageName: jaring?.areaNames.join(", ") || message.areaName,
        }}
      />

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

          {message.contentAmendments.length > 0 ? (
            <div className="space-y-2">
              <span className="font-mono font-semibold text-[10px] text-[var(--tactical-blue)] uppercase tracking-wider">
                INFORMASI TAMBAHAN
              </span>
              {message.contentAmendments.map((amendment) => (
                <div
                  key={amendment.id}
                  className="rounded-lg border border-[var(--tactical-border)] bg-black/10 p-3 text-[var(--tactical-text-primary)] text-sm leading-relaxed dark:bg-white/[0.01]"
                >
                  <p>{amendment.content}</p>
                  <p className="mt-2 font-mono text-[10px] text-[var(--tactical-text-muted)]">
                    VERSI {amendment.versionNumber} • {formatDateTime(amendment.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {message.photoUrl && (
            <div className="space-y-1">
              <span className="font-mono font-semibold text-[10px] text-[var(--tactical-text-muted)] uppercase tracking-wider">
                BUKTI DOKUMENTASI
              </span>
              <div className="max-w-56 overflow-hidden rounded-lg border border-[var(--tactical-border)] bg-black/10 shadow-sm dark:bg-white/[0.01]">
                <EvidenceImageViewer
                  src={message.photoUrl}
                  alt={`Bukti ${message.displayTitle || message.jaringAlias}`}
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
                  title={message.displayTitle || message.jaringAlias || "Lokasi laporan jaring"}
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
            <span>MASUK: {formatDateTime(message.receivedAt)}</span>
            <span>DILAPORKAN: {formatDateTime(message.reportedAt)}</span>
          </div>
        </div>

        {/* Right: Baket Normalization Form Fields */}
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="baket-category"
                className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider"
              >
                KATEGORI LAPORAN <span className="text-[var(--tactical-red)]">*</span>
              </label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger
                  id="baket-category"
                  className="tactical-input w-full border-[var(--tactical-border)] bg-black/10 text-[var(--tactical-text-primary)] dark:bg-white/[0.02]"
                >
                  <SelectValue placeholder="PILIH KATEGORI" />
                </SelectTrigger>
                <SelectContent>
                  {sortReportCategories(categories.filter((item) => item.isActive)).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="baket-urgency"
                className="block font-mono font-semibold text-[10px] text-[var(--tactical-text-secondary)] uppercase tracking-wider"
              >
                TINGKAT URGENSI <span className="text-[var(--tactical-red)]">*</span>
              </label>
              <Select value={urgency} onValueChange={(value) => setUrgency(value as typeof urgency)}>
                <SelectTrigger
                  id="baket-urgency"
                  className="tactical-input w-full border-[var(--tactical-border)] bg-black/10 font-mono text-[var(--tactical-text-primary)] dark:bg-white/[0.02]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono">
                  <SelectItem value="LOW">RENDAH</SelectItem>
                  <SelectItem value="NORMAL">NORMAL</SelectItem>
                  <SelectItem value="HIGH">TINGGI</SelectItem>
                  <SelectItem value="URGENT">MENDESAK</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end border-[var(--tactical-border)] border-t pt-4 font-mono">
            <button
              type="button"
              disabled={!canCreate || busy}
              onClick={() => setShowCreateConfirm(true)}
              className="h-[40px] cursor-pointer rounded-[4px] bg-[#16A34A] px-[18px] font-semibold text-white text-xs uppercase tracking-[0.04em] shadow-[0_0_18px_rgba(22,163,74,0.25)] transition-all duration-180 hover:-translate-y-[1px] hover:bg-[#15803D] hover:brightness-105 active:scale-[0.98] active:bg-[#166534] disabled:opacity-50"
            >
              {busy ? "MENYIMPAN..." : "JADIKAN BAKET"}
            </button>
          </div>

          <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
            <AlertDialogContent className="rounded-[6px] border border-[var(--tactical-border)] bg-[var(--tactical-card-bg)] font-mono text-[var(--tactical-text-primary)]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-semibold text-sm uppercase tracking-wider">
                  KONFIRMASI BAKET
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[var(--tactical-text-secondary)] text-xs">
                  Jadikan laporan Jaring ini sebagai Baket dengan kategori dan urgensi yang dipilih?
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
                    });
                  }}
                  className="h-9 cursor-pointer rounded-[4px] bg-[#16A34A] px-4 font-semibold text-white text-xs uppercase tracking-wider hover:bg-[#15803D]"
                >
                  YA, JADIKAN BAKET
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
