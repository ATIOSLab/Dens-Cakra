"use client";

import { useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUpDown,
  Award,
  BarChart4,
  BookOpenText,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Filter,
  HelpCircle,
  Map as MapIcon,
  MapPin,
  RefreshCw,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Target,
  User,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { assigneeSelectionSchema, assignmentProgressSchema, taskBuilderSchema } from "@/features/tasks/schemas";
import type {
  AssignmentCandidate,
  OimForwardingOptions,
  OimIncomingForwardingSource,
  TaskAssignmentDetail,
  TaskBuilderOptions,
  TaskDetail,
  TaskSummary,
} from "@/features/tasks/types";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { classificationBadgeClass } from "@/lib/classification";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeVariant(status: string) {
  if (["CANCELLED", "FAILED"].includes(status)) {
    return "destructive";
  }

  if (["COMPLETED", "IN_PROGRESS", "ASSIGNED", "ACKNOWLEDGED", "READ"].includes(status)) {
    return "default";
  }

  return "outline";
}

function taskStatusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "ASSIGNED":
      return "Sudah Didistribusikan";
    case "IN_PROGRESS":
      return "Sedang Berjalan";
    case "COMPLETED":
      return "Selesai";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return status;
  }
}

function friendlyStatusLabel(status: string) {
  switch (status.toUpperCase()) {
    case "DRAFT":
      return "DRAFT";
    case "ASSIGNED":
      return "DITUGASKAN";
    case "IN_PROGRESS":
      return "BERJALAN";
    case "COMPLETED":
      return "SELESAI";
    case "CANCELLED":
      return "DIBATALKAN";
    case "FAILED":
      return "GAGAL";
    case "SENT":
      return "TERKIRIM";
    case "ACKNOWLEDGED":
      return "DITERIMA";
    case "READ":
      return "DIBACA";
    default:
      return status;
  }
}

function _uukStatusLabel(status: string) {
  switch (status) {
    case "PUBLISHED":
      return "Siap Diteruskan";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return status;
  }
}

function incomingForwardingStatusLabel(task?: TaskSummary) {
  if (!task) {
    return "Menunggu dibaca";
  }

  if (!task.assignments.length) {
    return "Sudah dibaca";
  }

  return "Sudah dibaca & diteruskan";
}

function incomingForwardingStatusVariant(task?: TaskSummary) {
  if (!task) {
    return "outline" as const;
  }

  if (!task.assignments.length) {
    return "secondary" as const;
  }

  return badgeVariant(task.status);
}

function taskClassificationLabel(task: Pick<TaskSummary, "directiveVersion" | "uukStrVersion">) {
  return task.directiveVersion?.classification ?? task.uukStrVersion?.uukStr?.directiveVersion?.classification ?? null;
}

function _taskMetaLine(task: Pick<TaskSummary, "ownerUnit" | "priority" | "directiveVersion" | "uukStrVersion">) {
  const classification = taskClassificationLabel(task);
  const parts = [task.ownerUnit?.name ?? "-", task.priority, classification].filter(Boolean);

  return parts.join(" · ");
}

function normalizeDisplayText(value?: string | null) {
  const normalized = value?.trim();

  return normalized?.length ? normalized : "-";
}

function hasStructuredUukSections(task: TaskDetail) {
  return Boolean(task.uukStrVersion?.sections?.length);
}

function buildForwardingDescription(source: OimIncomingForwardingSource) {
  const raw = source.currentVersion.sections
    .flatMap((section) =>
      section.items.map((item) => `${section.orderNumber}.${item.orderNumber} ${section.title}: ${item.content}`),
    )
    .join("\n");

  return raw.slice(0, 9500);
}

function buildAreaParentMap(
  nodes: OimForwardingOptions["areaTree"],
  parentId?: string,
  map = new Map<string, string | null>(),
) {
  for (const node of nodes) {
    map.set(node.id, parentId ?? null);
    buildAreaParentMap(node.children ?? [], node.id, map);
  }

  return map;
}

function areaAncestors(areaId: string, parentMap: Map<string, string | null>) {
  const ancestors = new Set<string>([areaId]);
  let current = parentMap.get(areaId) ?? null;

  while (current) {
    ancestors.add(current);
    current = parentMap.get(current) ?? null;
  }

  return ancestors;
}

function isAreaRelated(sourceAreaId: string, candidateAreaId: string, parentMap: Map<string, string | null>) {
  const sourceAncestors = areaAncestors(sourceAreaId, parentMap);
  const candidateAncestors = areaAncestors(candidateAreaId, parentMap);

  for (const value of sourceAncestors) {
    if (candidateAncestors.has(value)) {
      return true;
    }
  }

  return false;
}

type TaskListClientProps = {
  title: string;
  description?: string;
  tasks: TaskSummary[];
  createHref?: string;
  detailBasePath: string;
};

type FieldCoordinatorTaskWithAssignments = TaskSummary & {
  subordinateAssignments: TaskAssignmentDetail[];
  coordinatorAssignmentId?: string | null;
};

export function TaskListClient({ title, description, tasks, createHref, detailBasePath }: TaskListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Simulated refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data berhasil diperbarui");
    }, 600);
  };

  // Filter and Sort logic
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date((b as any).createdAt || 0).getTime() - new Date((a as any).createdAt || 0).getTime();
        }
        if (sortBy === "oldest") {
          return new Date((a as any).createdAt || 0).getTime() - new Date((b as any).createdAt || 0).getTime();
        }
        if (sortBy === "due_soon") {
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        }
        return 0;
      });
  }, [tasks, searchQuery, statusFilter, sortBy]);

  // Pagination logic
  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  // Adjust page number if filters change total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // KPI Calculations
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const inProgress = tasks.filter((t) => ["IN_PROGRESS", "ASSIGNED", "ACKNOWLEDGED"].includes(t.status)).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, completionRate };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-white/[0.08] border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mt-1 font-bold font-sans text-2xl text-[var(--dc-text-primary)] tracking-tight">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-muted-foreground text-xs leading-relaxed">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 rounded-[4px] border-white/10 font-mono text-xs hover:bg-white/[0.04]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </Button>
          {createHref ? (
            <Button
              asChild
              size="sm"
              className="h-8 rounded-[4px] bg-[var(--dc-primary)] font-mono text-[var(--dc-text-inverse)] text-xs hover:bg-[var(--dc-primary-hover)]"
            >
              <Link href={createHref}>BUAT TASK</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* KPI Summary Block */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">TOTAL TUGAS</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-text-primary)]">{stats.total}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">TUGAS</span>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">SEDANG BERJALAN</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-warning)]">{stats.inProgress}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">AKTIF</span>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">SELESAI</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-success)]">{stats.completed}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">TUNTAS</span>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            TINGKAT PENYELESAIAN
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="font-bold font-mono text-2xl text-[var(--dc-primary)]">{stats.completionRate}%</span>
              <span className="font-mono text-[10px] text-muted-foreground/60">TARGET 100%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
              <div
                className="h-full bg-[var(--dc-primary)] transition-all duration-300"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Grid Content Area */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Left Column (8 cols): Toolbar & Compact Tasks List */}
        <div className="space-y-4 lg:col-span-8">
          {/* Sticky Toolbar */}
          <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2 backdrop-blur-md">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Cari nama tugas atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 font-mono text-xs placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
                <Filter className="size-3 text-muted-foreground/50" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                    <SelectItem value="ALL">SEMUA STATUS</SelectItem>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ASSIGNED">DISTRIBUSI</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                    <SelectItem value="COMPLETED">SELESAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
                <ArrowUpDown className="size-3 text-muted-foreground/50" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                    <SelectItem value="latest">TERBARU</SelectItem>
                    <SelectItem value="oldest">TERLAMA</SelectItem>
                    <SelectItem value="due_soon">BATAS WAKTU TERDEKAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compact Cards List */}
          {paginatedTasks.length === 0 ? (
            <div className="rounded-[6px] border border-white/[0.08] border-dashed p-12 text-center font-mono text-muted-foreground text-xs">
              Tidak ada tugas yang cocok dengan filter atau kriteria pencarian.
            </div>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-1">
              {paginatedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] shadow-sm transition-colors hover:border-white/20"
                >
                  <div className="flex flex-col justify-between gap-4 p-4 md:flex-row md:items-start">
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <Badge
                          variant={badgeVariant(task.status)}
                          className="mt-0.5 shrink-0 rounded-[4px] px-1.5 font-mono text-[9px] uppercase tracking-wider"
                        >
                          {taskStatusLabel(task.status)}
                        </Badge>
                        <h3 className="truncate font-bold font-sans text-[13px] text-[var(--dc-text-primary)] leading-snug">
                          {task.title}
                        </h3>
                      </div>

                      {task.description && (
                        <p className="line-clamp-2 font-sans text-muted-foreground text-xs leading-normal">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-white/[0.04] border-t pt-1.5 font-mono text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground/60" />
                          <span>
                            BATAS WAKTU:{" "}
                            <span className="text-[var(--dc-text-primary)]">{formatDate(task.dueDate)}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground/60" />
                          <span>
                            AREA SASARAN:{" "}
                            <span className="text-[var(--dc-text-primary)]">{task.targetAreas.length} WILAYAH</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="size-3 text-muted-foreground/60" />
                          <span>
                            FIELD OFFICER:{" "}
                            <span className="text-[var(--dc-text-primary)]">{task.assignments.length} PERSONEL</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end pt-2 md:items-end md:pt-0">
                      <Button
                        asChild
                        size="sm"
                        className="h-8 rounded-[4px] border border-white/10 bg-white/[0.04] font-mono text-[var(--dc-text-primary)] text-xs shadow-none hover:bg-white/[0.08]"
                      >
                        <Link href={`${detailBasePath}/${task.id}`}>
                          <span>BUKA DETAIL</span>
                          <ChevronRight className="ml-1 size-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Component */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-white/[0.08] border-t pt-4 font-mono text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>TAMPILKAN:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] font-mono text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                    <SelectItem value="9">9 DATA</SelectItem>
                    <SelectItem value="12">12 DATA</SelectItem>
                    <SelectItem value="18">18 DATA</SelectItem>
                  </SelectContent>
                </Select>
                <span>DARI {totalItems} TUGAS</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
                >
                  <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
                </Button>
                <span className="font-bold text-[var(--dc-text-primary)]">
                  HALAMAN {currentPage} DARI {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
                >
                  SELANJUTNYA <ChevronRight className="ml-1 size-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Sticky Sidebar */}
        <div className="h-fit space-y-4 lg:sticky lg:top-[80px] lg:col-span-4">
          {/* Mission Overview / Critical items */}
          <div className="space-y-3.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              <span>HITUNG MUNDUR BATAS WAKTU</span>
              <Clock className="size-3 text-[var(--dc-warning)]" />
            </div>

            {/* Find tasks due soon */}
            {(() => {
              const dueSoonTasks = tasks
                .filter((t) => t.status !== "COMPLETED" && t.dueDate)
                .sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime())
                .slice(0, 2);

              if (dueSoonTasks.length === 0) {
                return (
                  <div className="py-2 font-mono text-muted-foreground text-xs">
                    Tidak ada tugas aktif dengan batas waktu yang mendesak.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dueSoonTasks.map((t) => (
                    <div
                      key={t.id}
                      className="space-y-1.5 rounded-[4px] border border-white/[0.04] bg-white/[0.01] p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="truncate font-bold font-sans text-[var(--dc-text-primary)] text-xs"
                          title={t.title}
                        >
                          {t.title}
                        </span>
                        <Badge variant="destructive" className="shrink-0 rounded-[2px] px-1 py-0 font-mono text-[8px]">
                          BATAS WAKTU
                        </Badge>
                      </div>
                      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                        <span>BATAS WAKTU:</span>
                        <span className="font-bold text-[var(--dc-warning)]">{formatDate(t.dueDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Operational Statistics */}
          <div className="space-y-4 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              <span>TINGKAT PENYELESAIAN</span>
              <BarChart4 className="size-3 text-[var(--dc-primary)]" />
            </div>
            <div className="space-y-2.5 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">SELESAI:</span>
                  <span className="font-bold text-[var(--dc-success)]">
                    {tasks.filter((t) => t.status === "COMPLETED").length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                  <div
                    className="h-full bg-[var(--dc-success)] transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">BERJALAN:</span>
                  <span className="font-bold text-[var(--dc-warning)]">
                    {tasks.filter((t) => t.status === "IN_PROGRESS").length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                  <div
                    className="h-full bg-[var(--dc-warning)] transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "IN_PROGRESS").length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">DIDISTRIBUSIKAN:</span>
                  <span className="font-bold text-[var(--dc-primary)]">
                    {tasks.filter((t) => t.status === "ASSIGNED").length}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                  <div
                    className="h-full bg-[var(--dc-primary)] transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "ASSIGNED").length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-3.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              <span>AKTIVITAS TERBARU</span>
              <Activity className="size-3 text-[var(--dc-primary)]" />
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dc-success)]" />
                <div className="space-y-0.5">
                  <p className="font-sans text-muted-foreground/80 leading-normal">
                    Distribusi tugas <strong className="text-[var(--dc-text-primary)]">Aceh Selatan</strong> tervalidasi
                    100% aman.
                  </p>
                  <span className="font-mono text-[9px] text-muted-foreground/45">10 MENIT YANG LALU</span>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dc-primary)]" />
                <div className="space-y-0.5">
                  <p className="font-sans text-muted-foreground/80 leading-normal">
                    STR berjenjang regional terintegrasi ke dalam data tugas koordinator.
                  </p>
                  <span className="font-mono text-[9px] text-muted-foreground/45">42 MENIT YANG LALU</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-50 -mx-6 flex min-h-12 w-full flex-wrap items-center justify-between gap-3 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-4 py-2 backdrop-blur-md sm:mx-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          SISTEM MONITORING KOORDINATOR LAPANGAN | TOTAL AKTIF:{" "}
          <span className="font-bold text-[var(--dc-warning)]">{stats.inProgress} TUGAS</span>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/50">DENS CAKRA SECURED</div>
      </div>
    </div>
  );
}

function countAssignmentStatuses(assignments: TaskAssignmentDetail[]) {
  return assignments.reduce(
    (summary, assignment) => {
      switch (assignment.status) {
        case "COMPLETED":
          summary.completed += 1;
          break;
        case "IN_PROGRESS":
          summary.inProgress += 1;
          break;
        case "ACKNOWLEDGED":
        case "READ":
          summary.acknowledged += 1;
          break;
        case "SENT":
          summary.sent += 1;
          break;
        case "OVERDUE":
          summary.overdue += 1;
          break;
        default:
          break;
      }

      return summary;
    },
    { completed: 0, inProgress: 0, acknowledged: 0, sent: 0, overdue: 0 },
  );
}

function isAssignmentOverdue(assignment: TaskAssignmentDetail) {
  if (!assignment.dueDate) {
    return false;
  }

  if (["COMPLETED", "CANCELLED", "REASSIGNED"].includes(assignment.status)) {
    return false;
  }

  return new Date(assignment.dueDate).getTime() < Date.now();
}

function latestProgressLog(assignment: TaskAssignmentDetail) {
  if (!assignment.progressLogs?.length) {
    return null;
  }

  return assignment.progressLogs[assignment.progressLogs.length - 1] ?? null;
}

type FieldCoordinatorAssignmentsClientProps = {
  tasks: FieldCoordinatorTaskWithAssignments[];
};

export function FieldCoordinatorAssignmentsClient({ tasks }: FieldCoordinatorAssignmentsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data penugasan diperbarui");
    }, 600);
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.subordinateAssignments.some(
            (a) =>
              (a.assignee?.userProfile?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
              (a.assignmentNote || "").toLowerCase().includes(searchQuery.toLowerCase()),
          );
        const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        }
        return 0;
      });
  }, [tasks, searchQuery, statusFilter, sortBy]);

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    let totalAssignments = 0;
    let inProgress = 0;
    let completed = 0;

    tasks.forEach((t) => {
      const summary = countAssignmentStatuses(t.subordinateAssignments);
      totalAssignments += t.subordinateAssignments.length;
      inProgress += summary.inProgress;
      completed += summary.completed;
    });

    const completionRate = totalAssignments > 0 ? Math.round((completed / totalAssignments) * 100) : 0;
    return { totalTasks: tasks.length, totalAssignments, inProgress, completed, completionRate };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-white/[0.08] border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mt-1 font-bold font-sans text-2xl text-[var(--dc-text-primary)] tracking-tight">
            Penugasan Field Officer
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 rounded-[4px] border-white/10 font-mono text-xs hover:bg-white/[0.04]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>MUAT ULANG</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="w-full space-y-4">
        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2 backdrop-blur-md">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Cari tugas, FO, instruksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 font-mono text-xs placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <Filter className="size-3 text-muted-foreground/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="ALL">SEMUA STATUS</SelectItem>
                  <SelectItem value="DRAFT">DRAFT</SelectItem>
                  <SelectItem value="ASSIGNED">DISTRIBUSI</SelectItem>
                  <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                  <SelectItem value="COMPLETED">SELESAI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <ArrowUpDown className="size-3 text-muted-foreground/50" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="latest">TERBARU</SelectItem>
                  <SelectItem value="oldest">TERLAMA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-[4px] border border-white/10 h-8">
              <Button
                variant={viewMode === "card" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("card")}
                className="h-6 px-2 text-[10px] font-mono rounded-[2px] cursor-pointer"
              >
                Kartu
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-6 px-2 text-[10px] font-mono rounded-[2px] cursor-pointer"
              >
                Tabel
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Task Assignments List */}
        {paginatedTasks.length === 0 ? (
          <div className="rounded-[6px] border border-white/[0.08] border-dashed p-12 text-center font-mono text-muted-foreground text-xs">
            Belum ada tugas penugasan yang cocok dengan filter atau pencarian.
          </div>
        ) : viewMode === "table" ? (
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-white/[0.08] bg-white/[0.01]">
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 pl-4 py-3">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 py-3">
                      Nama Tugas
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 py-3">
                      Batas Waktu
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 py-3">
                      Progres Petugas
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 py-3">
                      Jumlah Penugasan
                    </TableHead>
                    <TableHead className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75 pr-4 py-3 text-right">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.map((task) => {
                    const summary = countAssignmentStatuses(task.subordinateAssignments);
                    const hasOfficerAssignments = task.subordinateAssignments.length > 0;
                    const taskRate = hasOfficerAssignments
                      ? Math.round((summary.completed / task.subordinateAssignments.length) * 100)
                      : 0;
                    return (
                      <TableRow key={task.id} className="border-white/[0.08] hover:bg-white/[0.02]">
                        <TableCell className="pl-4 py-3.5">
                          <Badge
                            variant={badgeVariant(task.status)}
                            className="rounded-[2px] px-1.5 py-0.5 font-mono text-[8px] uppercase"
                          >
                            {friendlyStatusLabel(task.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-200 py-3.5 max-w-sm truncate">
                          {task.title}
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground py-3.5">
                          {formatDate(task.dueDate)}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-[10px] text-[var(--dc-success)]">
                              {taskRate}%
                            </span>
                            <div className="h-1.5 w-16 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                              <div className="h-full bg-[var(--dc-success)]" style={{ width: `${taskRate}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] text-muted-foreground py-3.5">
                          {task.subordinateAssignments.length} Petugas
                        </TableCell>
                        <TableCell className="pr-4 py-3.5 text-right">
                          <Button
                            asChild
                            size="sm"
                            className="h-7 rounded-[4px] border border-[var(--dc-primary)] bg-[var(--dc-primary)] font-mono text-[10px] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                          >
                            <Link href={`/dashboard/field-coordinator/penugasan-field-officer/${task.id}`}>
                              {hasOfficerAssignments ? "Detail" : "Buat Instruksi"}
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
          <div className="space-y-4">
            {paginatedTasks.map((task) => {
              const summary = countAssignmentStatuses(task.subordinateAssignments);
              const hasOfficerAssignments = task.subordinateAssignments.length > 0;
              const taskRate = hasOfficerAssignments
                ? Math.round((summary.completed / task.subordinateAssignments.length) * 100)
                : 0;

              return (
                <Card
                  key={task.id}
                  className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] shadow-sm"
                >
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-white/[0.06] border-b bg-white/[0.02] p-3.5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={badgeVariant(task.status)}
                          className="rounded-[2px] px-1 font-mono text-[8px] uppercase"
                        >
                          {friendlyStatusLabel(task.status)}
                        </Badge>
                        <h3 className="truncate font-bold font-sans text-[var(--dc-text-primary)] text-xs leading-none">
                          {task.title}
                        </h3>
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground/60">
                        BATAS WAKTU: {formatDate(task.dueDate)} | AREA SASARAN: {task.targetAreas.length} WILAYAH
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        asChild
                        size="sm"
                        className="h-7 rounded-[4px] border border-[var(--dc-primary)] bg-[var(--dc-primary)] font-mono text-[10px] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                      >
                        <Link href={`/dashboard/field-coordinator/penugasan-field-officer/${task.id}`}>
                          {hasOfficerAssignments ? "Detail" : "Buat Instruksi"}
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar for the task */}
                  <div className="flex items-center justify-between gap-4 border-white/[0.04] border-b bg-white/[0.005] px-4 py-2">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/80">
                      <span>PROGRES PETUGAS:</span>
                      <span className="font-bold text-[var(--dc-success)]">
                        {hasOfficerAssignments
                          ? `${summary.completed}/${task.subordinateAssignments.length} SELESAI`
                          : "BELUM ADA INSTRUKSI"}
                      </span>
                    </div>
                    <div className="h-1.5 max-w-[200px] flex-1 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                      <div className="h-full bg-[var(--dc-success)] transition-all" style={{ width: `${taskRate}%` }} />
                    </div>
                    <span className="font-bold font-mono text-[10px] text-[var(--dc-success)]">{taskRate}%</span>
                  </div>

                  {/* Subordinate Assignments Table/List (Paginated inside card) */}
                  <SubordinateAssignmentsList assignments={task.subordinateAssignments} />
                </Card>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-white/[0.08] border-t pt-4 font-mono text-[10px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>TAMPILKAN:</span>
              <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] font-mono text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="9">9 DATA</SelectItem>
                  <SelectItem value="12">12 DATA</SelectItem>
                  <SelectItem value="18">18 DATA</SelectItem>
                </SelectContent>
              </Select>
              <span>DARI {totalItems} TUGAS</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
              >
                <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-[var(--dc-text-primary)]">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
              >
                SELANJUTNYA <ChevronRight className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 -mx-6 flex min-h-12 w-full flex-wrap items-center justify-between gap-3 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-4 py-2 backdrop-blur-md sm:mx-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          SISTEM DELEGASI FIELD OFFICER | HIERARKI: KOORDINATOR LAPANGAN
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/50">
          TOTAL TERCATAT: {stats.totalAssignments} ASSIGNMENTS
        </div>
      </div>
    </div>
  );
}

function SubordinateAssignmentsList({ assignments }: { assignments: TaskAssignmentDetail[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const totalItems = assignments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return assignments.slice(startIndex, startIndex + pageSize);
  }, [assignments, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="space-y-0">
      <div className="divide-y divide-white/[0.04]">
        {paginatedAssignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex flex-col justify-between gap-3 p-3.5 text-xs md:flex-row md:items-start"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold font-sans text-[var(--dc-text-primary)]">
                  {assignment.assignee?.userProfile?.fullName ?? "Field Officer"}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/50">
                  ({assignment.assignee?.position?.title ?? "Petugas Lapangan"})
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                <span className="mr-1 font-mono text-[9px] text-[var(--dc-primary)] uppercase">[INSTRUKSI FC]</span>
                {normalizeDisplayText(assignment.assignmentNote)}
              </div>
            </div>

            <div className="flex shrink-0 flex-row items-center justify-between gap-2 border-white/[0.04] border-t border-dashed pt-2 md:flex-col md:items-end md:justify-start md:border-none md:pt-0">
              <Badge
                variant={badgeVariant(assignment.status)}
                className="rounded-[2px] px-1 font-mono text-[8px] uppercase"
              >
                {friendlyStatusLabel(assignment.status)}
              </Badge>
              <div className="font-mono text-[9px] text-muted-foreground/50">
                BATAS WAKTU: {formatDate(assignment.dueDate)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-white/[0.04] border-t bg-white/[0.01] p-3 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>TAMPILKAN:</span>
            <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
              <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] font-mono text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                <SelectItem value="5">5 DATA</SelectItem>
                <SelectItem value="10">10 DATA</SelectItem>
                <SelectItem value="20">20 DATA</SelectItem>
              </SelectContent>
            </Select>
            <span>DARI {totalItems} OFFICER</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
            >
              <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
            </Button>
            <span className="font-bold text-[var(--dc-text-primary)]">
              HALAMAN {currentPage} DARI {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
            >
              SELANJUTNYA <ChevronRight className="ml-1 size-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

type FieldCoordinatorAssignmentDetailClientProps = {
  task: TaskDetail;
  subordinateAssignments: TaskAssignmentDetail[];
  manageHref?: string;
};

export function FieldCoordinatorAssignmentDetailClient({
  task,
  subordinateAssignments,
  manageHref,
}: FieldCoordinatorAssignmentDetailClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("nama");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const stats = useMemo(() => {
    const total = subordinateAssignments.length;
    const completed = subordinateAssignments.filter((a) => a.status === "COMPLETED").length;
    const overdue = subordinateAssignments.filter(isAssignmentOverdue).length;
    const running = subordinateAssignments.filter(
      (a) => ["IN_PROGRESS", "ACKNOWLEDGED", "READ", "SENT"].includes(a.status) && !isAssignmentOverdue(a),
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, running, overdue, progress };
  }, [subordinateAssignments]);

  const filteredAssignments = useMemo(() => {
    return subordinateAssignments
      .filter((a) => {
        const name = a.assignee?.userProfile?.fullName ?? a.assignee?.position?.title ?? "Field Officer";
        const location = a.assignee?.position?.organizationUnit?.name ?? "";
        const matchesSearch =
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = false;
        if (statusFilter === "ALL") {
          matchesStatus = true;
        } else if (statusFilter === "COMPLETED") {
          matchesStatus = a.status === "COMPLETED";
        } else if (statusFilter === "RUNNING") {
          matchesStatus = ["IN_PROGRESS", "ACKNOWLEDGED", "READ", "SENT"].includes(a.status) && !isAssignmentOverdue(a);
        } else if (statusFilter === "OVERDUE") {
          matchesStatus = isAssignmentOverdue(a);
        }

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "nama") {
          const nameA = a.assignee?.userProfile?.fullName ?? a.assignee?.position?.title ?? "Field Officer";
          const nameB = b.assignee?.userProfile?.fullName ?? b.assignee?.position?.title ?? "Field Officer";
          return nameA.localeCompare(nameB);
        }
        if (sortBy === "deadline") {
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        }
        return 0;
      });
  }, [subordinateAssignments, searchQuery, statusFilter, sortBy]);

  const totalItems = filteredAssignments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(startIndex, startIndex + pageSize);
  }, [filteredAssignments, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIdx = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="space-y-6">
      <TaskDetailClient task={task} assignmentHref={manageHref} hideTargetAreas hideAssignments />

      {/* Ringkasan horizontal cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">
            TOTAL FIELD OFFICER
          </div>
          <div className="font-bold font-mono text-[var(--dc-text-primary)] text-xl">{stats.total}</div>
        </div>
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">COMPLETED</div>
          <div className="font-bold font-mono text-[var(--dc-success)] text-xl">{stats.completed}</div>
        </div>
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">RUNNING</div>
          <div className="font-bold font-mono text-[var(--dc-primary)] text-xl">{stats.running}</div>
        </div>
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">OVERDUE</div>
          <div className="font-bold font-mono text-[var(--dc-danger)] text-xl">{stats.overdue}</div>
        </div>
        <div className="col-span-2 space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 md:col-span-1">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">PROGRESS</div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold font-mono text-[var(--dc-success)] text-xl">{stats.progress}%</span>
            <div className="h-1.5 w-full max-w-[80px] shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
              <div
                className="h-full bg-[var(--dc-success)] transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main compact list / table enterprise */}
      <Card className="space-y-4 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
        {/* Toolbar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2.5 backdrop-blur-md">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Cari Field Officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 font-mono text-xs placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <Filter className="size-3 text-muted-foreground/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="ALL">SEMUA STATUS</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="RUNNING">RUNNING</SelectItem>
                  <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <ArrowUpDown className="size-3 text-muted-foreground/50" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="nama">NAMA FIELD OFFICER</SelectItem>
                  <SelectItem value="deadline">BATAS WAKTU PENUGASAN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compact list */}
        {paginatedAssignments.length === 0 ? (
          <div className="rounded-[6px] border border-white/[0.08] border-dashed p-8 text-center font-mono text-muted-foreground text-xs">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-[6px] border border-white/[0.08] bg-white/[0.03] text-[var(--dc-primary)]">
              <Send className="size-4" />
            </div>
            <div className="font-sans font-semibold text-[var(--dc-text-primary)] text-sm">
              Belum ada instruksi ke Field Officer.
            </div>
            <p className="mx-auto mt-1 max-w-xl leading-relaxed">
              Gunakan form distribusi di bawah halaman ini untuk memilih Field Officer, mengatur batas waktu, dan
              menulis instruksi operasional.
            </p>
            {manageHref ? (
              <Button asChild className="mt-4 h-8 rounded-[4px] font-mono text-xs">
                <Link href={manageHref}>Buka Form Penugasan</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] overflow-hidden rounded-[6px] border border-white/[0.08] bg-white/[0.005]">
            {paginatedAssignments.map((assignment) => {
              const name = assignment.assignee?.userProfile?.fullName ?? "Field Officer";
              const position = assignment.assignee?.position?.title ?? "Field Officer";
              const region = assignment.assignee?.position?.organizationUnit?.name ?? "Aceh";
              const isOverdue = isAssignmentOverdue(assignment);

              return (
                <div
                  key={assignment.id}
                  className="flex h-[72px] items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] font-bold text-[var(--dc-primary)] text-xs">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold font-sans text-[var(--dc-text-primary)] text-xs">{name}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground/60">{position}</div>
                    </div>
                  </div>

                  <div className="hidden w-[180px] min-w-0 shrink-0 sm:block">
                    <div className="truncate font-medium text-[var(--dc-text-primary)] text-xs">{region}</div>
                    <div className="font-mono text-[9px] text-muted-foreground/40">WILAYAH</div>
                  </div>

                  <div className="w-[120px] shrink-0 text-left">
                    <Badge
                      variant={badgeVariant(assignment.status)}
                      className="rounded-[2px] px-1 font-mono text-[8px] uppercase"
                    >
                      {assignment.status}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="ml-1 rounded-[2px] px-1 font-mono text-[8px] uppercase">
                        OVERDUE
                      </Badge>
                    )}
                  </div>

                  <div className="hidden w-[140px] shrink-0 text-left font-mono text-[10px] md:block">
                    <div className="text-muted-foreground/85">{formatDate(assignment.dueDate)}</div>
                    <div className="text-[8px] text-muted-foreground/45 uppercase">LIMIT WAKTU</div>
                  </div>

                  <div className="shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 cursor-pointer rounded-[4px] border-white/10 font-mono text-[10px] hover:bg-white/[0.04]"
                        >
                          Detail
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border border-[var(--dc-border-subtle)] bg-popover text-[var(--dc-text-primary)]">
                        <DialogHeader>
                          <DialogTitle className="font-bold font-sans text-sm">Instruksi Tugas Lapangan</DialogTitle>
                          <DialogDescription className="font-mono text-[10px] text-muted-foreground/60 uppercase">
                            {name} — {position} ({region})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 space-y-2 rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-3">
                          <div className="font-mono font-semibold text-[10px] text-[var(--dc-primary)] uppercase">
                            INSTRUKSI PENUGASAN:
                          </div>
                          <p className="whitespace-pre-wrap font-sans text-muted-foreground text-xs leading-relaxed">
                            {normalizeDisplayText(assignment.assignmentNote)}
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 border-white/[0.04] border-t p-3 font-mono text-xs">
                          <div>
                            <span className="block text-[9px] text-muted-foreground/50">STATUS</span>
                            <Badge
                              variant={badgeVariant(assignment.status)}
                              className="mt-1 rounded-[2px] px-1 font-mono text-[8px] uppercase"
                            >
                              {assignment.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted-foreground/50">LIMIT WAKTU</span>
                            <span className="mt-1 block font-bold text-[var(--dc-warning)]">
                              {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 font-mono text-[10px] text-muted-foreground">
            <div>
              Menampilkan {startIdx}–{endIdx} dari {totalItems} Field Officer.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
              >
                <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-[var(--dc-text-primary)]">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
              >
                SELANJUTNYA <ChevronRight className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type FieldCoordinatorMonitoringClientProps = {
  tasks: FieldCoordinatorTaskWithAssignments[];
};

export function FieldCoordinatorMonitoringClient({ tasks }: FieldCoordinatorMonitoringClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("latest");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data monitoring diperbarui");
    }, 600);
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        const matchesSearch =
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.subordinateAssignments.some(
            (a) =>
              (a.assignee?.userProfile?.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
              (a.assignmentNote || "").toLowerCase().includes(searchQuery.toLowerCase()),
          );
        const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "latest") {
          return new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        }
        return 0;
      });
  }, [tasks, searchQuery, statusFilter, sortBy]);

  const totalItems = filteredTasks.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredTasks.slice(startIndex, startIndex + pageSize);
  }, [filteredTasks, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    let totalAssignments = 0;
    let acknowledged = 0;
    let sent = 0;
    let inProgress = 0;
    let overdue = 0;

    tasks.forEach((t) => {
      const summary = countAssignmentStatuses(t.subordinateAssignments);
      const overdueCount = t.subordinateAssignments.filter(isAssignmentOverdue).length;
      totalAssignments += t.subordinateAssignments.length;
      acknowledged += summary.acknowledged + summary.inProgress + summary.completed;
      sent += summary.sent;
      inProgress += summary.inProgress;
      overdue += overdueCount;
    });

    const complianceRate = totalAssignments > 0 ? Math.round((acknowledged / totalAssignments) * 100) : 0;
    return { totalTasks: tasks.length, totalAssignments, acknowledged, sent, inProgress, overdue, complianceRate };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 border-white/[0.08] border-b pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] text-[var(--dc-primary)] uppercase tracking-wider">
              MONITORING_SYSTEM
            </span>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--dc-warning)]" />
            <span className="font-mono text-[10px] text-muted-foreground/60">REAL-TIME MONITORING</span>
          </div>
          <h1 className="mt-1 font-bold font-sans text-2xl text-[var(--dc-text-primary)] tracking-tight">
            Monitoring Tugas
          </h1>
          <p className="mt-1 max-w-2xl text-muted-foreground text-xs leading-relaxed">
            Pantau progres, acknowledgement, dan potensi keterlambatan assignment Field Officer.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 gap-1.5 rounded-[4px] border-white/10 font-mono text-xs hover:bg-white/[0.04]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Block */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">TUGAS DIPANTAU</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-text-primary)]">{stats.totalTasks}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">TUGAS</span>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">SUDAH ACK / READ</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-success)]">{stats.acknowledged}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">PERSONEL</span>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">BELUM RESPOND</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-warning)]">{stats.sent}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">PERSONEL</span>
          </div>
        </div>
        <div className="space-y-1.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">OVERDUE LIMIT</div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold font-mono text-2xl text-[var(--dc-danger)]">{stats.overdue}</span>
            <span className="font-mono text-[10px] text-muted-foreground/60">KASUS</span>
          </div>
        </div>
      </div>

      {/* Main 12-Grid Content Area */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* Left Column (8 cols): Toolbar & Compact Tasks Monitoring List */}
        <div className="space-y-4 lg:col-span-8">
          {/* Sticky Toolbar */}
          <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2 backdrop-blur-md">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Cari tugas, FO, atau instruksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 font-mono text-xs placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
                <Filter className="size-3 text-muted-foreground/50" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                    <SelectItem value="ALL">SEMUA STATUS</SelectItem>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="ASSIGNED">DISTRIBUSI</SelectItem>
                    <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                    <SelectItem value="COMPLETED">SELESAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
                <ArrowUpDown className="size-3 text-muted-foreground/50" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                    <SelectItem value="latest">TERBARU</SelectItem>
                    <SelectItem value="oldest">TERLAMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compact Task Monitoring List */}
          {paginatedTasks.length === 0 ? (
            <div className="rounded-[6px] border border-white/[0.08] border-dashed p-12 text-center font-mono text-muted-foreground text-xs">
              Belum ada data monitoring yang cocok dengan kriteria filter.
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedTasks.map((task) => {
                const summary = countAssignmentStatuses(task.subordinateAssignments);
                const overdueCount = task.subordinateAssignments.filter(isAssignmentOverdue).length;

                return (
                  <Card
                    key={task.id}
                    className="overflow-hidden rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] shadow-sm"
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-white/[0.06] border-b bg-white/[0.02] p-3.5">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={badgeVariant(task.status)}
                            className="rounded-[2px] px-1 font-mono text-[8px] uppercase"
                          >
                            {friendlyStatusLabel(task.status)}
                          </Badge>
                          <h3 className="truncate font-bold font-sans text-[var(--dc-text-primary)] text-xs leading-none">
                            {task.title}
                          </h3>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground/60">
                          INSTANSI PEMILIK: {task.ownerUnit?.name ?? "-"}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Button
                          asChild
                          size="sm"
                          className="h-7 rounded-[4px] bg-[var(--dc-primary)] font-mono text-[10px] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)]"
                        >
                          <Link href={`/dashboard/field-coordinator/monitoring-tugas/${task.id}`}>Buka Monitoring</Link>
                        </Button>
                      </div>
                    </div>

                    {/* Stats Grid inside task */}
                    <div className="grid grid-cols-4 gap-2 border-white/[0.04] border-b bg-white/[0.005] px-4 py-2 text-center font-mono text-[10px]">
                      <div className="border-white/[0.04] border-r py-1">
                        <div className="text-[8px] text-muted-foreground/50">SUDAH ACK</div>
                        <div className="font-bold text-[var(--dc-success)]">
                          {summary.acknowledged + summary.inProgress + summary.completed}
                        </div>
                      </div>
                      <div className="border-white/[0.04] border-r py-1">
                        <div className="text-[8px] text-muted-foreground/50">BELUM RESPOND</div>
                        <div className="font-bold text-[var(--dc-warning)]">{summary.sent}</div>
                      </div>
                      <div className="border-white/[0.04] border-r py-1">
                        <div className="text-[8px] text-muted-foreground/50">IN PROGRESS</div>
                        <div className="font-bold text-[var(--dc-primary)]">{summary.inProgress}</div>
                      </div>
                      <div className="py-1">
                        <div className="text-[8px] text-muted-foreground/50">OVERDUE</div>
                        <div className="font-bold text-[var(--dc-danger)]">{overdueCount}</div>
                      </div>
                    </div>

                    {/* Compact subordinate list slice */}
                    <div className="divide-y divide-white/[0.04]">
                      {task.subordinateAssignments.slice(0, 3).map((assignment) => {
                        const isOverdue = isAssignmentOverdue(assignment);
                        return (
                          <div key={assignment.id} className="flex items-center justify-between gap-3 p-3 text-xs">
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-bold font-sans text-[var(--dc-text-primary)]">
                                  {assignment.assignee?.userProfile?.fullName ?? "Field Officer"}
                                </span>
                                <span className="truncate font-mono text-[9px] text-muted-foreground/40">
                                  ({assignment.assignee?.position?.title ?? "FO"})
                                </span>
                              </div>
                              <div className="truncate text-[10px] text-muted-foreground">
                                Instruksi: {normalizeDisplayText(assignment.assignmentNote)}
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {isOverdue && (
                                <Badge
                                  variant="destructive"
                                  className="rounded-[2px] bg-[var(--dc-danger)] px-1 font-mono text-[8px] text-white uppercase"
                                >
                                  OVERDUE
                                </Badge>
                              )}
                              <Badge
                                variant={badgeVariant(assignment.status)}
                                className="rounded-[2px] px-1 font-mono text-[8px] uppercase"
                              >
                                {friendlyStatusLabel(assignment.status)}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                      {task.subordinateAssignments.length > 3 && (
                        <div className="bg-white/[0.01] p-2 text-center">
                          <Link
                            href={`/dashboard/field-coordinator/monitoring-tugas/${task.id}`}
                            className="font-mono text-[9px] text-[var(--dc-primary)] hover:underline"
                          >
                            + LIHAT {task.subordinateAssignments.length - 3} PENUGASAN LAINNYA
                          </Link>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-white/[0.08] border-t pt-4 font-mono text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>TAMPILKAN:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] font-mono text-[10px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                    <SelectItem value="9">9 DATA</SelectItem>
                    <SelectItem value="12">12 DATA</SelectItem>
                    <SelectItem value="18">18 DATA</SelectItem>
                  </SelectContent>
                </Select>
                <span>DARI {totalItems} TUGAS</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
                >
                  <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
                </Button>
                <span className="font-bold text-[var(--dc-text-primary)]">
                  HALAMAN {currentPage} DARI {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
                >
                  SELANJUTNYA <ChevronRight className="ml-1 size-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Sticky Sidebar */}
        <div className="h-fit space-y-4 lg:sticky lg:top-[80px] lg:col-span-4">
          {/* Overdue Risk Analysis */}
          <div className="space-y-3.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              <span>OVERDUE RISK ANALYSIS</span>
              <AlertTriangle className="size-3 text-[var(--dc-danger)]" />
            </div>

            {/* Display count and list of overdue or critical assignments */}
            {stats.overdue > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-[4px] border border-white/[0.06] bg-white/[0.02] p-2.5 text-[var(--dc-danger)]">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span className="font-bold font-mono text-xs">{stats.overdue} PENUGASAN MELEBIHI BATAS WAKTU</span>
                </div>
                <p className="font-sans text-[10px] text-muted-foreground/60 leading-relaxed">
                  Segera hubungi personel bersangkutan atau lakukan re-assignment untuk mencegah keterlambatan data
                  intelijen.
                </p>
              </div>
            ) : (
              <div className="rounded-[4px] border border-white/[0.04] bg-white/[0.01] p-3 font-sans text-muted-foreground/80 text-xs leading-normal">
                Seluruh Field Officer bertugas sesuai limit operasional. Tingkat risiko keterlambatan:{" "}
                <strong className="text-[var(--dc-success)]">SANGAT RENDAH</strong>
              </div>
            )}
          </div>

          {/* Acknowledgement Status stats */}
          <div className="space-y-3.5 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="flex items-center justify-between border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              <span>RESPONSE METRICS</span>
              <Activity className="size-3 text-[var(--dc-primary)]" />
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">SUDAH MEMBACA/ACK:</span>
                  <span className="font-bold text-[var(--dc-success)]">{stats.acknowledged} FO</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                  <div
                    className="h-full bg-[var(--dc-success)] transition-all duration-300"
                    style={{
                      width: `${stats.totalAssignments > 0 ? (stats.acknowledged / stats.totalAssignments) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">BELUM RESPOND:</span>
                  <span className="font-bold text-[var(--dc-warning)]">{stats.sent} FO</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
                  <div
                    className="h-full bg-[var(--dc-warning)] transition-all duration-300"
                    style={{
                      width: `${stats.totalAssignments > 0 ? (stats.sent / stats.totalAssignments) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 -mx-6 flex min-h-12 w-full flex-wrap items-center justify-between gap-3 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-4 py-2 backdrop-blur-md sm:mx-0">
        <div className="font-mono text-[10px] text-muted-foreground">
          SISTEM MONITORING PENUGASAN LAPANGAN | DENS CAKRA CORE
        </div>
        <div className="font-mono text-[10px] text-muted-foreground/50">
          KEPATUHAN RESPONSE: {stats.complianceRate}%
        </div>
      </div>
    </div>
  );
}

type FieldCoordinatorMonitoringDetailClientProps = {
  task: TaskDetail;
  subordinateAssignments: TaskAssignmentDetail[];
  manageHref?: string;
};

export function FieldCoordinatorMonitoringDetailClient({
  task,
  subordinateAssignments,
  manageHref,
}: FieldCoordinatorMonitoringDetailClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("nama");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const stats = useMemo(() => {
    const total = subordinateAssignments.length;
    const completed = subordinateAssignments.filter((a) => a.status === "COMPLETED").length;
    const overdue = subordinateAssignments.filter(isAssignmentOverdue).length;
    const running = subordinateAssignments.filter(
      (a) => ["IN_PROGRESS", "ACKNOWLEDGED", "READ", "SENT"].includes(a.status) && !isAssignmentOverdue(a),
    ).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, running, overdue, progress };
  }, [subordinateAssignments]);

  const filteredAssignments = useMemo(() => {
    return subordinateAssignments
      .filter((a) => {
        const name = a.assignee?.userProfile?.fullName ?? a.assignee?.position?.title ?? "Field Officer";
        const location = a.assignee?.position?.organizationUnit?.name ?? "";
        const matchesSearch =
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesStatus = false;
        if (statusFilter === "ALL") {
          matchesStatus = true;
        } else if (statusFilter === "COMPLETED") {
          matchesStatus = a.status === "COMPLETED";
        } else if (statusFilter === "RUNNING") {
          matchesStatus = ["IN_PROGRESS", "ACKNOWLEDGED", "READ", "SENT"].includes(a.status) && !isAssignmentOverdue(a);
        } else if (statusFilter === "OVERDUE") {
          matchesStatus = isAssignmentOverdue(a);
        }

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "nama") {
          const nameA = a.assignee?.userProfile?.fullName ?? a.assignee?.position?.title ?? "Field Officer";
          const nameB = b.assignee?.userProfile?.fullName ?? b.assignee?.position?.title ?? "Field Officer";
          return nameA.localeCompare(nameB);
        }
        if (sortBy === "deadline") {
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        }
        return 0;
      });
  }, [subordinateAssignments, searchQuery, statusFilter, sortBy]);

  const totalItems = filteredAssignments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const paginatedAssignments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAssignments.slice(startIndex, startIndex + pageSize);
  }, [filteredAssignments, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIdx = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="space-y-6">
      <TaskDetailClient task={task} assignmentHref={manageHref} hideTargetAreas hideAssignments />

      {/* Ringkasan horizontal cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">
            TOTAL PETUGAS LAPANGAN
          </div>
          <div className="font-bold font-mono text-[var(--dc-text-primary)] text-xl">{stats.total}</div>
        </div>
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">SELESAI</div>
          <div className="font-bold font-mono text-[var(--dc-success)] text-xl">{stats.completed}</div>
        </div>
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">BERJALAN</div>
          <div className="font-bold font-mono text-[var(--dc-primary)] text-xl">{stats.running}</div>
        </div>
        <div className="space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">TERLAMBAT</div>
          <div className="font-bold font-mono text-[var(--dc-danger)] text-xl">{stats.overdue}</div>
        </div>
        <div className="col-span-2 space-y-1 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 md:col-span-1">
          <div className="font-mono text-[8px] text-muted-foreground/60 uppercase tracking-wider">PROGRES</div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold font-mono text-[var(--dc-success)] text-xl">{stats.progress}%</span>
            <div className="h-1.5 w-full max-w-[80px] shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.04]">
              <div
                className="h-full bg-[var(--dc-success)] transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main compact list / table enterprise */}
      <Card className="space-y-4 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
        {/* Toolbar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2.5 backdrop-blur-md">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Cari Field Officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 font-mono text-xs placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <Filter className="size-3 text-muted-foreground/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="ALL">SEMUA STATUS</SelectItem>
                  <SelectItem value="COMPLETED">SELESAI</SelectItem>
                  <SelectItem value="RUNNING">BERJALAN</SelectItem>
                  <SelectItem value="OVERDUE">TERLAMBAT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <ArrowUpDown className="size-3 text-muted-foreground/50" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-6 border-none bg-transparent p-0 pr-4 font-mono text-[10px] shadow-none focus:ring-0">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover font-mono text-popover-foreground text-xs">
                  <SelectItem value="nama">NAMA PETUGAS LAPANGAN</SelectItem>
                  <SelectItem value="deadline">BATAS WAKTU PENUGASAN</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compact list */}
        {paginatedAssignments.length === 0 ? (
          <div className="rounded-[6px] border border-white/[0.08] border-dashed p-12 text-center font-mono text-muted-foreground text-xs">
            Belum ada progres yang cocok dengan kriteria filter.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] overflow-hidden rounded-[6px] border border-white/[0.08] bg-white/[0.005]">
            {paginatedAssignments.map((assignment) => {
              const name = assignment.assignee?.userProfile?.fullName ?? "Field Officer";
              const position = assignment.assignee?.position?.title ?? "Field Officer";
              const region = assignment.assignee?.position?.organizationUnit?.name ?? "Aceh";
              const isOverdue = isAssignmentOverdue(assignment);
              const latestLog = latestProgressLog(assignment);

              return (
                <div
                  key={assignment.id}
                  className="flex h-[72px] items-center justify-between gap-4 p-4 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] font-bold text-[var(--dc-primary)] text-xs">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold font-sans text-[var(--dc-text-primary)] text-xs">{name}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground/60">{position}</div>
                    </div>
                  </div>

                  <div className="hidden w-[180px] min-w-0 shrink-0 sm:block">
                    <div className="truncate font-medium text-[var(--dc-text-primary)] text-xs">{region}</div>
                    <div className="font-mono text-[9px] text-muted-foreground/40">WILAYAH</div>
                  </div>

                  <div className="w-[120px] shrink-0 text-left">
                    <Badge
                      variant={badgeVariant(assignment.status)}
                      className="rounded-[2px] px-1 font-mono text-[8px] uppercase"
                    >
                      {friendlyStatusLabel(assignment.status)}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="ml-1 rounded-[2px] px-1 font-mono text-[8px] uppercase">
                        TERLAMBAT
                      </Badge>
                    )}
                  </div>

                  <div className="hidden w-[140px] shrink-0 text-left font-mono text-[10px] md:block">
                    <div className="text-muted-foreground/85">{formatDate(assignment.dueDate)}</div>
                    <div className="text-[8px] text-muted-foreground/45 uppercase">LIMIT WAKTU</div>
                  </div>

                  <div className="shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 cursor-pointer rounded-[4px] border-white/10 font-mono text-[10px] hover:bg-white/[0.04]"
                        >
                          Detail
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border border-[var(--dc-border-subtle)] bg-popover text-[var(--dc-text-primary)]">
                        <DialogHeader>
                          <DialogTitle className="font-bold font-sans text-sm">Progres Tugas Lapangan</DialogTitle>
                          <DialogDescription className="font-mono text-[10px] text-muted-foreground/60 uppercase">
                            {name} — {position} ({region})
                          </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 space-y-4">
                          <div className="space-y-2 rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-3">
                            <div className="font-mono font-semibold text-[10px] text-[var(--dc-primary)] uppercase">
                              INSTRUKSI PENUGASAN:
                            </div>
                            <p className="whitespace-pre-wrap font-sans text-muted-foreground text-xs leading-relaxed">
                              {normalizeDisplayText(assignment.assignmentNote)}
                            </p>
                          </div>

                          <div className="space-y-2 rounded-[6px] border border-white/[0.08] bg-white/[0.02] p-3">
                            <div className="font-mono font-semibold text-[10px] text-[var(--dc-success)] uppercase">
                              UPDATE TERAKHIR:
                            </div>
                            {latestLog ? (
                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-[var(--dc-text-primary)]">
                                  {friendlyStatusLabel(latestLog.status)}
                                  {typeof latestLog.progressPercent === "number"
                                    ? ` • ${latestLog.progressPercent}%`
                                    : ""}
                                </div>
                                <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                                  {normalizeDisplayText(latestLog.note)}
                                </p>
                                <div className="mt-1 font-mono text-[9px] text-muted-foreground/50">
                                  DILAPORKAN PADA: {formatDate(latestLog.createdAt)}
                                </div>
                              </div>
                            ) : (
                              <p className="text-muted-foreground text-xs italic">Belum ada log progres dilaporkan.</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4 border-white/[0.04] border-t p-3 font-mono text-xs">
                          <div>
                            <span className="block text-[9px] text-muted-foreground/50">STATUS</span>
                            <Badge
                              variant={badgeVariant(assignment.status)}
                              className="mt-1 rounded-[2px] px-1 font-mono text-[8px] uppercase"
                            >
                              {friendlyStatusLabel(assignment.status)}
                            </Badge>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted-foreground/50">JUMLAH LOG</span>
                            <span className="mt-1 block font-bold">{assignment.progressLogs?.length ?? 0} LOG</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-muted-foreground/50">LIMIT WAKTU</span>
                            <span className="mt-1 block font-bold text-[var(--dc-warning)]">
                              {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 font-mono text-[10px] text-muted-foreground">
            <div>
              Menampilkan {startIdx}–{endIdx} dari {totalItems} Petugas Lapangan.
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
              >
                <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-[var(--dc-text-primary)]">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 border-white/10 px-2 font-mono text-[10px] hover:bg-white/[0.04]"
              >
                SELANJUTNYA <ChevronRight className="ml-1 size-3" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function getClassificationStyles(value?: string | null) {
  const norm = (value ?? "").toUpperCase();
  switch (norm) {
    case "BIASA":
      return {
        color: "#3B82F6",
        bgColor: "#3B82F615",
        borderColor: "#3B82F630",
        label: "BIASA",
      };
    case "TERBATAS":
      return {
        color: "#10B981",
        bgColor: "#10B98115",
        borderColor: "#10B98130",
        label: "TERBATAS",
      };
    case "RAHASIA":
      return {
        color: "#F59E0B",
        bgColor: "#F59E0B15",
        borderColor: "#F59E0B30",
        label: "RAHASIA",
      };
    case "SANGAT_RAHASIA":
      return {
        color: "#EF4444",
        bgColor: "#EF444415",
        borderColor: "#EF444430",
        label: "SANGAT RAHASIA",
      };
    default:
      return {
        color: "#6B7280",
        bgColor: "#6B728015",
        borderColor: "#6B728030",
        label: norm || "-",
      };
  }
}

type OimIncomingForwardingListClientProps = {
  sources: OimIncomingForwardingSource[];
  tasks: TaskSummary[];
};

export function OimIncomingForwardingListClient({ sources, tasks }: OimIncomingForwardingListClientProps) {
  const taskByUukVersionId = useMemo(() => {
    return new Map(tasks.filter((task) => task.uukStrVersion?.id).map((task) => [task.uukStrVersion?.id ?? "", task]));
  }, [tasks]);

  // Filters State
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterClassification, setFilterClassification] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Apply Filters
  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      // 1. Classification filter
      if (filterClassification && source.directiveVersion?.classification !== filterClassification) {
        return false;
      }

      // 2. Date period filter
      const dateStr = (source as any).createdAt || (source as any).currentVersion?.createdAt;
      if (dateStr) {
        const createdDate = new Date(dateStr);
        if (filterStartDate) {
          const startDate = new Date(filterStartDate);
          if (createdDate < startDate) return false;
        }
        if (filterEndDate) {
          const endDate = new Date(filterEndDate);
          endDate.setHours(23, 59, 59, 999);
          if (createdDate > endDate) return false;
        }
      }

      return true;
    });
  }, [sources, filterStartDate, filterEndDate, filterClassification]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, []);

  // Pagination calculations
  const totalCount = filteredSources.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const paginatedSources = useMemo(() => {
    return filteredSources.slice(startIndex, endIndex);
  }, [filteredSources, startIndex, endIndex]);

  return (
    <Card className="border border-border/70">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle>STR Diterima dari Regional</CardTitle>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 border-border/40 border-t pt-3 text-xs">
          <div className="min-w-[140px] flex-1 space-y-1.5">
            <label className="font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Periode Mulai
            </label>
            <Input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="h-9 border-border bg-background/50 text-xs"
            />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1.5">
            <label className="font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Periode Selesai
            </label>
            <Input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="h-9 border-border bg-background/50 text-xs"
            />
          </div>
          <div className="min-w-[160px] flex-1 space-y-1.5">
            <label className="font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Klasifikasi
            </label>
            <Select
              value={filterClassification || "ALL"}
              onValueChange={(val) => setFilterClassification(val === "ALL" ? "" : val)}
            >
              <SelectTrigger className="h-9 border-border bg-background/50 text-xs focus:ring-0">
                {filterClassification ? (
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(filterClassification)}`}
                  >
                    {getClassificationStyles(filterClassification).label}
                  </span>
                ) : (
                  <SelectValue placeholder="Semua Klasifikasi" />
                )}
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="ALL">Semua Klasifikasi</SelectItem>
                {["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"].map((value) => (
                  <SelectItem key={value} value={value}>
                    <span className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(value)}`}>
                      {getClassificationStyles(value).label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(filterStartDate || filterEndDate || filterClassification) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFilterStartDate("");
                setFilterEndDate("");
                setFilterClassification("");
              }}
              className="flex h-9 cursor-pointer items-center gap-1 border border-border border-dashed px-3 font-mono text-muted-foreground text-xs hover:text-foreground"
            >
              Reset Filter
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nomor STR</TableHead>
              <TableHead>Judul STR</TableHead>
              <TableHead>Klasifikasi</TableHead>
              <TableHead>Batas Waktu</TableHead>
              <TableHead>Status Baca / Teruskan</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSources.length ? (
              paginatedSources.map((source) => {
                const linkedTask = taskByUukVersionId.get(source.currentVersion.id);
                const classStyle = getClassificationStyles(source.directiveVersion?.classification);

                return (
                  <TableRow key={source.id}>
                    <TableCell className="pl-4 font-semibold text-[var(--dc-text-primary)]">
                      {source.directiveVersion?.directive?.commandNumber ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-[20rem] whitespace-normal font-medium leading-5">
                      {source.currentVersion.title}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        style={{
                          color: classStyle.color,
                          backgroundColor: classStyle.bgColor,
                          borderColor: classStyle.borderColor,
                        }}
                        className="font-bold font-mono tracking-wider"
                      >
                        {classStyle.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[var(--dc-text-secondary)]">
                      {source.directiveVersion?.dueDate ? formatDate(source.directiveVersion.dueDate) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={incomingForwardingStatusVariant(linkedTask)}>
                        {incomingForwardingStatusLabel(linkedTask)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex justify-end gap-2">
                        {linkedTask ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/oim/direktif-tugas/${linkedTask.id}`}>Detail</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm" variant="success">
                            <Link href={`/dashboard/oim/direktif-tugas/baru?uukStrId=${source.id}`}>
                              Baca & Teruskan
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  Belum ada STR regional yang sesuai dengan filter pencarian.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-4 border-border/40 border-t p-4 font-mono text-[10px] uppercase sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="text-muted-foreground">
              Menampilkan{" "}
              <span className="font-bold text-foreground">
                {totalCount > 0 ? startIndex + 1 : 0}-{endIndex}
              </span>{" "}
              dari <span className="font-bold text-foreground">{totalCount}</span> STR
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Baris:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-[65px] border-border bg-background font-mono text-[10px] text-foreground focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="h-7 border-border px-2 font-mono text-[10px] hover:bg-accent"
              >
                <ChevronLeft className="mr-1 size-3" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-muted-foreground">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 border-border px-2 font-mono text-[10px] hover:bg-accent"
              >
                SELANJUTNYA <ChevronRight className="ml-1 size-3" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ForwardingCollapsibleSection({
  orderNumber,
  title,
  items,
  defaultOpen = false,
}: {
  orderNumber: number;
  title: string;
  items: Array<{ itemCode: string; content?: string | null }>;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const icon = getSectionIcon(orderNumber, title);

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] shadow-sm transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-[6px] p-3.5 text-left transition-colors hover:bg-white/[0.02] focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[var(--dc-primary)]">
            {icon}
          </div>
          <div>
            <span className="mr-2 font-mono text-[9px] text-muted-foreground/40 uppercase tracking-wider">
              {orderNumber.toString().padStart(2, "0")}
            </span>
            <h4 className="inline-block font-bold font-sans text-[var(--dc-text-primary)] text-xs uppercase tracking-tight">
              {title}
            </h4>
          </div>
        </div>
        <div className="flex size-6 items-center justify-center rounded bg-white/[0.04] text-muted-foreground">
          {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-white/[0.08] border-t bg-white/[0.01] p-4">
          <div className="space-y-3 font-sans text-[var(--dc-text-primary)] text-sm leading-relaxed">
            {items.map((item) => (
              <div
                key={item.itemCode}
                className="flex items-start gap-2 rounded-[4px] border border-white/[0.02] bg-white/[0.01] p-2.5"
              >
                {item.itemCode && (
                  <span className="mt-0.5 shrink-0 font-mono text-[var(--dc-primary)] text-xs uppercase">
                    [{item.itemCode}]
                  </span>
                )}
                <span className="whitespace-pre-wrap">{normalizeDisplayText(item.content)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type OimForwardingClientProps = {
  source: OimIncomingForwardingSource;
  options: OimForwardingOptions;
};

export function OimForwardingClient({ source, options }: OimForwardingClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasReadSource, setHasReadSource] = useState(false);
  const [assignmentNote, setAssignmentNote] = useState("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const parentMap = useMemo(() => buildAreaParentMap(options.areaTree), [options.areaTree]);
  const sourceAreaIds = source.directiveVersion?.targetAreas?.map((target) => target.areaId) ?? [];

  const eligibleCandidates = useMemo(() => {
    if (!sourceAreaIds.length) {
      return options.candidates;
    }

    return options.candidates.filter((candidate) =>
      candidate.areaScopes?.some((scope) =>
        sourceAreaIds.some((sourceAreaId) => isAreaRelated(sourceAreaId, scope.area.id, parentMap)),
      ),
    );
  }, [options.candidates, parentMap, sourceAreaIds]);

  // Toolbar state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [filterSelectedState, setFilterSelectedState] = useState<"all" | "selected" | "unselected">("all");
  const [sortBy, setSortBy] = useState<"name" | "area">("name");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Reset page to 1 when search or filter states change
  useEffect(() => {
    setCurrentPage(1);
  }, []);

  // Candidate Areas for filtering dropdown
  const candidateAreas = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of eligibleCandidates) {
      for (const scope of c.areaScopes ?? []) {
        map.set(scope.area.id, scope.area.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [eligibleCandidates]);

  // Apply search/filters/sort
  const filteredCandidates = useMemo(() => {
    let result = [...eligibleCandidates];

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) => c.userProfile?.fullName?.toLowerCase().includes(q) || c.position?.title?.toLowerCase().includes(q),
      );
    }

    // 2. Filter Area/Kabupaten
    if (selectedAreaId) {
      result = result.filter((c) => c.areaScopes?.some((scope) => scope.area.id === selectedAreaId));
    }

    // 3. Filter Selected State
    if (filterSelectedState === "selected") {
      result = result.filter((c) => selectedAssigneeIds.includes(c.id));
    } else if (filterSelectedState === "unselected") {
      result = result.filter((c) => !selectedAssigneeIds.includes(c.id));
    }

    // 4. Sort
    result.sort((a, b) => {
      if (sortBy === "name") {
        const nameA = a.userProfile?.fullName || a.position?.title || "";
        const nameB = b.userProfile?.fullName || b.position?.title || "";
        return nameA.localeCompare(nameB);
      }
      const areaA = a.areaScopes?.[0]?.area.name || "";
      const areaB = b.areaScopes?.[0]?.area.name || "";
      return areaA.localeCompare(areaB);
    });

    return result;
  }, [eligibleCandidates, searchQuery, selectedAreaId, filterSelectedState, sortBy, selectedAssigneeIds]);

  const handleToggleSelectAll = () => {
    const shownIds = filteredCandidates.map((c) => c.id);
    const allSelected = shownIds.length > 0 && shownIds.every((id) => selectedAssigneeIds.includes(id));

    if (allSelected) {
      setSelectedAssigneeIds((current) => current.filter((id) => !shownIds.includes(id)));
    } else {
      setSelectedAssigneeIds((current) => {
        const newSelection = new Set([...current, ...shownIds]);
        return Array.from(newSelection);
      });
    }
  };

  // Pagination calculation
  const totalCandidatesCount = filteredCandidates.length;
  const totalPages = Math.ceil(totalCandidatesCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCandidatesCount);
  const paginatedCandidates = useMemo(() => {
    return filteredCandidates.slice(startIndex, endIndex);
  }, [filteredCandidates, startIndex, endIndex]);

  async function handleForward() {
    if (!selectedAssigneeIds.length) {
      toast.error("Pilih minimal satu Field Coordinator tujuan distribusi.");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await apiBrowserMutation<TaskDetail>("POST", "/tasks", {
        ownerUnitId: options.access.authorizationContext.organizationUnitId,
        uukStrVersionId: source.currentVersion.id,
        title: source.currentVersion.title,
        description: buildForwardingDescription(source),
        priority: "NORMAL",
        targetAreaIds:
          sourceAreaIds.length > 0
            ? sourceAreaIds
            : options.access.authorizationContext.areaScopes.map((scope) => scope.areaId),
      });

      try {
        const parsedAssignments = assigneeSelectionSchema.parse({
          assignments: selectedAssigneeIds.map((assigneeAssignmentId) => ({
            assigneeAssignmentId,
            assignmentNote: assignmentNote || undefined,
          })),
        });

        await apiBrowserMutation("POST", `/tasks/${created.id}/assignments`, parsedAssignments);
        toast.success("STR berhasil diteruskan OIM ke Field Coordinator.");
        router.push(`/dashboard/oim/direktif-tugas/${created.id}`);
        router.refresh();
      } catch (assignmentError) {
        const assignmentMessage =
          assignmentError instanceof Error
            ? assignmentError.message
            : "Distribusi ke Field Coordinator gagal diproses.";
        toast.error(`${assignmentMessage} Task sumber sudah dibuat dan bisa dilanjutkan dari halaman detail.`);
        router.push(`/dashboard/oim/direktif-tugas/${created.id}`);
        router.refresh();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat distribusi OIM.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const classification = source.directiveVersion?.classification || "RAHASIA";
  const areaSummary = source.directiveVersion?.targetAreas?.map((t) => t.area.name).join(", ") ?? "-";

  return (
    <div className="relative mx-auto w-full max-w-[1400px] space-y-6 pb-16">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/oim/direktif-tugas")}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-mono border-white/10 hover:bg-white/[0.04] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          <span>Kembali</span>
        </Button>
      </div>

      {/* 1. Command Header */}
      <div className="flex flex-col gap-3 border-white/[0.08] border-b pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-[var(--dc-text-primary)] text-xl tracking-tight">
              Baca dan Teruskan STR ke Field Coordinator
            </h1>
            <Badge
              variant="outline"
              className="rounded-[4px] border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dc-success)] uppercase tracking-wider"
            >
              {source.status === "PUBLISHED" ? "DITERBITKAN" : source.status}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-[4px] border-[var(--dc-warning)]/40 bg-[var(--dc-warning-soft)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dc-warning)] uppercase tracking-wider"
            >
              NORMAL
            </Badge>
            <Badge
              variant="outline"
              className="rounded-[4px] border-[var(--dc-danger)]/40 bg-[var(--dc-danger-soft)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dc-danger)] uppercase tracking-wider"
            >
              {classification}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <BookOpenText className="size-3 text-muted-foreground/60" />
              <span>
                NOMOR STR:{" "}
                <span className="text-[var(--dc-text-primary)]">
                  {source.directiveVersion?.directive?.commandNumber ?? "-"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <User className="size-3 text-muted-foreground/60" />
              <span>
                REGIONAL PENGIRIM:{" "}
                <span className="text-[var(--dc-text-primary)]">{source.ownerUnit?.name ?? "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground/60" />
              <span>
                TANGGAL:{" "}
                <span className="text-[var(--dc-text-primary)]">
                  {(source as any).createdAt ? formatDate((source as any).createdAt) : "-"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational Metadata Row */}
      <div className="grid grid-cols-1 gap-4 rounded-[6px] border border-white/[0.04] bg-white/[0.02] p-3.5 font-mono text-xs md:grid-cols-3">
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">WILAYAH CAKUPAN</span>
          <div className="truncate font-bold text-[var(--dc-text-primary)]" title={areaSummary}>
            {areaSummary}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">TARGET FIELD COORDINATORS</span>
          <div className="font-bold text-[var(--dc-text-primary)]">{eligibleCandidates.length} PERSONEL</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">STATUS DISTRIBUSI</span>
          <div
            className={`font-bold ${selectedAssigneeIds.length > 0 ? "text-[var(--dc-success)]" : "text-[var(--dc-warning)]"}`}
          >
            {selectedAssigneeIds.length > 0 ? "SIAP DITERUSKAN" : "BELUM DISTRIBUSI"}
          </div>
        </div>
      </div>

      {/* FULL WIDTH STACKED CONTENT */}
      <div className="w-full space-y-6">
        {/* STR Preview Accordions */}
        <div className="space-y-3">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            STR_SOURCE_PREVIEW
          </div>
          <div className="space-y-3">
            {source.currentVersion.sections.map((section, _idx) => (
              <ForwardingCollapsibleSection
                key={section.sectionType}
                orderNumber={section.orderNumber}
                title={section.title}
                items={section.items}
                defaultOpen={true}
              />
            ))}
          </div>
        </div>

        {/* Confirmation checklist and notes side-by-side inside full-width */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Stepper Checklist / Confirmation Card */}
          <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              CONFIRMATION_CHECKLIST
            </div>

            <div className="space-y-3 border-white/[0.08] border-t pt-3">
              <label htmlFor="oim-read-confirmation-new" className="flex cursor-pointer items-start gap-3 leading-5">
                <Checkbox
                  id="oim-read-confirmation-new"
                  checked={hasReadSource}
                  onCheckedChange={(checked) => setHasReadSource(Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="font-bold text-[var(--dc-text-primary)] text-xs">Konfirmasi Penerusan STR</span>
                  <p className="text-[10px] text-muted-foreground leading-normal">Saya mengonfirmasi bahwa:</p>
                  <ul className="list-disc space-y-0.5 pl-3 text-[10px] text-muted-foreground">
                    <li>OIM tidak mengubah isi STR.</li>
                    <li>Tugas diteruskan hanya ke FC sesuai hirarki komando.</li>
                    <li>Seluruh isi dokumen STR tetap identik.</li>
                  </ul>
                </div>
              </label>
            </div>
          </div>

          {/* Distribution Note Card */}
          <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              DISTRIBUTION_NOTE
            </div>
            <div className="space-y-2 border-white/[0.08] border-t pt-3">
              <div className="text-[10px] text-muted-foreground leading-normal">
                Catatan ini akan otomatis terlampir pada notifikasi tugas operasional di seluruh FC penerima.
              </div>
              <Textarea
                value={assignmentNote}
                disabled={!hasReadSource}
                onChange={(event) => setAssignmentNote(event.target.value)}
                placeholder="Tambahkan instruksi khusus (opsional)..."
                className="min-h-[80px] w-full rounded-[4px] border-white/10 bg-white/[0.02] font-sans text-xs focus:border-[var(--dc-primary)]/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Field Coordinator Selection Area */}
        <div className="space-y-3">
          <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
            TARGET_FIELD_COORDINATORS
          </div>

          {!hasReadSource ? (
            <div className="space-y-2 rounded-[6px] border border-amber-300/30 bg-amber-500/10 p-4 font-mono text-amber-200 text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock className="size-3.5" /> BACA STR DULU SEBELUM DISTRIBUSI
              </div>
              <div>
                Penerusan ke Field Coordinator hanya dapat diakses setelah Anda mengonfirmasi bahwa Anda telah membaca
                STR pada checklist konfirmasi di atas.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sticky Toolbar */}
              <div className="sticky top-[64px] z-30 space-y-3 border-border border-b bg-background/95 py-3.5 backdrop-blur-md">
                <div className="flex flex-col items-center justify-between gap-3 xl:flex-row">
                  <div className="flex w-full flex-wrap items-center gap-3 xl:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground/60" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama FC..."
                        className="h-9 w-full rounded-[4px] border-border bg-card pl-8 text-xs sm:w-[220px]"
                      />
                    </div>

                    {/* Filter Kabupaten */}
                    <div className="relative">
                      <select
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        className="h-9 rounded-[4px] border border-border bg-card px-3 font-sans text-foreground text-xs focus:outline-none"
                      >
                        <option value="">Semua Wilayah</option>
                        {candidateAreas.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Sort */}
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "name" | "area")}
                        className="h-9 rounded-[4px] border border-border bg-card px-3 font-sans text-foreground text-xs focus:outline-none"
                      >
                        <option value="name">Sort: Nama</option>
                        <option value="area">Sort: Wilayah</option>
                      </select>
                    </div>

                    {/* View Mode Toggle: Card vs Table */}
                    <div className="flex items-center gap-1 rounded-[4px] border border-border bg-secondary p-1">
                      <button
                        type="button"
                        onClick={() => setViewMode("card")}
                        className={`h-7 rounded-[2px] px-2.5 font-mono text-[10px] uppercase transition-colors ${viewMode === "card" ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={`h-7 rounded-[2px] px-2.5 font-mono text-[10px] uppercase transition-colors ${viewMode === "table" ? "bg-primary font-bold text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Table
                      </button>
                    </div>

                    {/* Select All */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleSelectAll}
                      className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[4px] border-border bg-card px-3 font-mono text-muted-foreground text-xs hover:text-foreground"
                    >
                      <input
                        type="checkbox"
                        checked={
                          filteredCandidates.length > 0 &&
                          filteredCandidates.every((c) => selectedAssigneeIds.includes(c.id))
                        }
                        readOnly
                        className="size-3.5 rounded-[2px] accent-primary"
                      />
                      <span>Pilih Semua</span>
                    </Button>
                  </div>

                  {/* Status filter tabs & counter info */}
                  <div className="flex w-full flex-wrap items-center justify-between gap-3 font-mono text-xs xl:w-auto xl:justify-end">
                    <div className="text-muted-foreground/80">
                      DIPILIH: <span className="font-bold text-primary">{selectedAssigneeIds.length} FC</span> /{" "}
                      {eligibleCandidates.length}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterSelectedState("all")}
                        className={`rounded-[4px] border px-3 py-1.5 text-xs ${filterSelectedState === "all" ? "border-primary bg-primary font-bold text-primary-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-accent"} transition-colors`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterSelectedState("selected")}
                        className={`rounded-[4px] border px-3 py-1.5 text-xs ${filterSelectedState === "selected" ? "border-primary bg-primary font-bold text-primary-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-accent"} transition-colors`}
                      >
                        Terpilih
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterSelectedState("unselected")}
                        className={`rounded-[4px] border px-3 py-1.5 text-xs ${filterSelectedState === "unselected" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-muted-foreground hover:bg-accent"} transition-colors`}
                      >
                        Belum Terpilih
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FC Selector Grid/Table */}
              {paginatedCandidates.length ? (
                <div className="space-y-4">
                  {viewMode === "card" ? (
                    <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {paginatedCandidates.map((candidate) => {
                        const checked = selectedAssigneeIds.includes(candidate.id);
                        const initials = candidate.userProfile?.fullName?.slice(0, 2).toUpperCase() || "FC";

                        return (
                          <label
                            key={candidate.id}
                            className={`flex h-[110px] cursor-pointer flex-col justify-between rounded-[6px] border p-3.5 transition-all duration-200 ${
                              checked
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border bg-card hover:bg-accent"
                            }`}
                          >
                            <div className="flex min-w-0 items-start gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded border border-border bg-secondary font-bold font-mono text-muted-foreground text-primary text-sm">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="truncate font-bold text-foreground text-sm">
                                  {candidate.userProfile?.fullName || candidate.position?.title || "Field Coordinator"}
                                </div>
                                <div className="truncate font-mono text-[11px] text-muted-foreground/60 uppercase">
                                  {candidate.position?.title || "-"}
                                </div>
                                <div className="truncate font-mono text-[10px] text-muted-foreground/50 uppercase">
                                  WILAYAH: {candidate.areaScopes?.[0]?.area.name || "-"}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 flex items-center justify-between border-border border-t pt-2">
                              <span className="font-mono text-[10px] text-muted-foreground/50 uppercase">
                                CHECKLIST
                              </span>
                              <div className="flex items-center gap-2">
                                {checked && <Check className="size-3.5 text-primary" />}
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!hasReadSource}
                                  onChange={(e) => {
                                    setSelectedAssigneeIds((current) =>
                                      e.target.checked
                                        ? [...current, candidate.id]
                                        : current.filter((item) => item !== candidate.id),
                                    );
                                  }}
                                  className="size-4 cursor-pointer rounded-[2px] border-border bg-card accent-primary"
                                />
                                <span
                                  className={`font-mono text-[10px] uppercase ${checked ? "font-bold text-primary" : "text-muted-foreground/60"}`}
                                >
                                  {checked ? "Terpilih" : "Pilih Field Coordinator"}
                                </span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-[6px] border border-border bg-card">
                      <table className="w-full border-collapse text-left font-mono text-xs">
                        <thead>
                          <tr className="border-border border-b bg-secondary/30 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <th className="w-[50px] p-3 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  filteredCandidates.length > 0 &&
                                  filteredCandidates.every((c) => selectedAssigneeIds.includes(c.id))
                                }
                                onChange={handleToggleSelectAll}
                                className="size-4 cursor-pointer rounded-[2px] accent-primary"
                              />
                            </th>
                            <th className="p-3">Nama</th>
                            <th className="p-3">Wilayah</th>
                            <th className="p-3">Role</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCandidates.map((candidate) => {
                            const checked = selectedAssigneeIds.includes(candidate.id);
                            return (
                              <tr
                                key={candidate.id}
                                onClick={() => {
                                  if (!hasReadSource) return;
                                  setSelectedAssigneeIds((current) =>
                                    checked ? current.filter((id) => id !== candidate.id) : [...current, candidate.id],
                                  );
                                }}
                                className={`cursor-pointer border-border border-b transition-colors hover:bg-accent/40 ${checked ? "bg-primary/5 text-foreground" : "text-muted-foreground"}`}
                              >
                                <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={!hasReadSource}
                                    onChange={(e) => {
                                      setSelectedAssigneeIds((current) =>
                                        e.target.checked
                                          ? [...current, candidate.id]
                                          : current.filter((item) => item !== candidate.id),
                                      );
                                    }}
                                    className="size-4 cursor-pointer rounded-[2px] border-border bg-card accent-primary"
                                  />
                                </td>
                                <td className="p-3 font-bold text-foreground">
                                  {candidate.userProfile?.fullName || candidate.position?.title || "Field Coordinator"}
                                </td>
                                <td className="p-3 text-[11px] uppercase">
                                  {candidate.areaScopes?.[0]?.area.name || "-"}
                                </td>
                                <td className="p-3 text-[11px] text-muted-foreground/60 uppercase">
                                  {candidate.position?.title || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination Controls */}
                  <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-[6px] border border-border bg-secondary/40 p-3 font-mono text-xs sm:flex-row">
                    <div className="text-muted-foreground">
                      Menampilkan{" "}
                      <span className="font-bold text-foreground">{totalCandidatesCount > 0 ? startIndex + 1 : 0}</span>
                      –<span className="font-bold text-foreground">{endIndex}</span> dari{" "}
                      <span className="font-bold text-foreground">{totalCandidatesCount}</span> Field Coordinator
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Page size select */}
                      <div className="relative">
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="h-8 rounded-[4px] border border-border bg-card px-2.5 font-sans text-foreground text-xs focus:outline-none"
                        >
                          <option value={9}>9 per Hal</option>
                          <option value={12}>12 per Hal</option>
                          <option value={18}>18 per Hal</option>
                          <option value={24}>24 per Hal</option>
                        </select>
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className="rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-muted-foreground transition hover:bg-white/[0.08] hover:text-[var(--dc-text-primary)] disabled:opacity-40 disabled:hover:bg-white/[0.04]"
                          >
                            Sebelumnya
                          </button>
                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`rounded border px-3 py-1.5 transition ${
                                  currentPage === pageNum
                                    ? "border-[var(--dc-primary)] bg-[var(--dc-primary)] font-bold text-[var(--dc-text-inverse)]"
                                    : "border-white/10 bg-white/[0.04] text-muted-foreground hover:bg-white/[0.08] hover:text-[var(--dc-text-primary)]"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className="rounded border border-white/10 bg-white/[0.04] px-3 py-1.5 text-muted-foreground transition hover:bg-white/[0.08] hover:text-[var(--dc-text-primary)] disabled:opacity-40 disabled:hover:bg-white/[0.04]"
                          >
                            Berikutnya
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[6px] border border-white/5 border-dashed p-8 text-center font-mono text-muted-foreground text-xs italic">
                  Tidak ada Field Coordinator yang cocok dengan pencarian / filter.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 -mx-6 flex w-full flex-wrap items-center justify-between gap-4 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-6 py-4 backdrop-blur-md sm:mx-0">
        <div className="font-mono text-muted-foreground text-xs">
          DIPILIH:{" "}
          <span className="font-bold text-[var(--dc-primary)]">
            {selectedAssigneeIds.length} Field Coordinator dipilih
          </span>
          {assignmentNote.trim() && <span className="ml-2 text-muted-foreground/60">(Catatan terlampir)</span>}
        </div>
        <div className="flex items-center gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-9 cursor-pointer rounded-[4px] px-4 font-mono text-xs"
              >
                Batal
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Batalkan Penerusan STR?</AlertDialogTitle>
                <AlertDialogDescription>Apakah Anda yakin ingin membatalkan penerusan STR ini?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={() => router.push("/dashboard/oim/direktif-tugas")}>
                  Ya, Batalkan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="success"
                disabled={!hasReadSource || !selectedAssigneeIds.length || !eligibleCandidates.length || isSubmitting}
                className="h-9 rounded-[4px] px-6 font-mono text-xs"
              >
                {isSubmitting ? "Meneruskan..." : "Teruskan STR"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Teruskan STR?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin meneruskan STR ini ke {selectedAssigneeIds.length} Field Coordinator yang
                  dipilih?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction variant="success" onClick={handleForward} disabled={isSubmitting}>
                  Ya, Teruskan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}

type TaskBuilderClientProps = {
  mode: "create" | "edit";
  options: TaskBuilderOptions;
  task?: TaskDetail;
};

export function TaskBuilderClient({ mode, options, task }: TaskBuilderClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [sourceType, setSourceType] = useState<"directive" | "uuk" | "none">(
    task?.directiveVersion ? "directive" : task?.uukStrVersion ? "uuk" : "none",
  );
  const [directiveVersionId, setDirectiveVersionId] = useState(task?.directiveVersion?.id ?? "");
  const [uukStrVersionId, setUukStrVersionId] = useState(task?.uukStrVersion?.id ?? "");
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [priority, setPriority] = useState(task?.priority ?? "NORMAL");
  const [dueDate, setDueDate] = useState(task?.dueDate?.slice(0, 10) ?? "");
  const [targetAreaIds, setTargetAreaIds] = useState<string[]>(
    task?.targetAreas.map((item) => item.areaId) ??
      options.access.authorizationContext.areaScopes.map((item) => item.areaId),
  );

  async function handleSubmit() {
    setIsSaving(true);

    try {
      const parsed = taskBuilderSchema.parse({
        ownerUnitId: options.access.authorizationContext.organizationUnitId,
        directiveVersionId: sourceType === "directive" ? directiveVersionId || undefined : undefined,
        uukStrVersionId: sourceType === "uuk" ? uukStrVersionId || undefined : undefined,
        title,
        description,
        priority,
        dueDate: dueDate || undefined,
        targetAreaIds,
      });

      if (mode === "create") {
        const created = await apiBrowserMutation<TaskDetail>("POST", "/tasks", parsed);
        toast.success("Task operasional berhasil dibuat.");
        router.push(`/dashboard/oim/direktif-tugas/${created.id}`);
        router.refresh();
        return;
      }

      if (!task) {
        throw new Error("Task draft tidak ditemukan.");
      }

      await apiBrowserMutation("PATCH", `/tasks/${task.id}`, {
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        dueDate: parsed.dueDate || undefined,
      });

      await apiBrowserMutation("PUT", `/tasks/${task.id}/target-areas`, {
        areaIds: parsed.targetAreaIds,
        primaryAreaId: parsed.targetAreaIds[0],
      });

      toast.success("Task draft diperbarui.");
      router.push(`/dashboard/oim/direktif-tugas/${task.id}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan task.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          {mode === "create" ? "Builder Tugas Operasional" : "Edit Draft Task"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Task OIM hanya bisa didistribusikan ke Field Coordinator sebelum diteruskan ke Field Officer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source Context</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span>Jenis Sumber</span>
            <Select
              value={sourceType}
              onValueChange={(value) => setSourceType(value as "directive" | "uuk" | "none")}
              disabled={mode === "edit"}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih sumber" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Manual</SelectItem>
                <SelectItem value="directive">Directive</SelectItem>
                <SelectItem value="uuk">UUK/STR</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span>Referensi Sumber</span>
            {sourceType === "directive" ? (
              <Select value={directiveVersionId} onValueChange={setDirectiveVersionId} disabled={mode === "edit"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih directive" />
                </SelectTrigger>
                <SelectContent>
                  {options.directives.map((directive) => (
                    <SelectItem key={directive.id} value={directive.id}>
                      {directive.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : sourceType === "uuk" ? (
              <Select value={uukStrVersionId} onValueChange={setUukStrVersionId} disabled={mode === "edit"}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih UUK/STR" />
                </SelectTrigger>
                <SelectContent>
                  {options.uuks.map((uuk) => (
                    <SelectItem key={uuk.id} value={uuk.id}>
                      {uuk.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-xl border border-border/70 border-dashed px-3 py-2 text-muted-foreground text-sm">
                Task dibuat tanpa sumber dokumen formal.
              </div>
            )}
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task Builder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm md:col-span-2">
            <span>Judul Task</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="space-y-2 text-sm">
            <span>Prioritas</span>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih prioritas" />
              </SelectTrigger>
              <SelectContent>
                {["LOW", "NORMAL", "HIGH", "URGENT"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span>Deskripsi</span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-36"
            />
          </label>
          <label className="space-y-2 text-sm md:col-span-2">
            <span>Batas Waktu Tugas</span>
            <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Target Area</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {options.areaOptions.map((area) => (
            <label key={area.id} className="flex items-start gap-3 rounded-xl border border-border/70 p-3 text-sm">
              <input
                type="checkbox"
                checked={targetAreaIds.includes(area.id)}
                onChange={(event) => {
                  if (event.target.checked) {
                    setTargetAreaIds((current) => [...current, area.id]);
                    return;
                  }

                  setTargetAreaIds((current) => current.filter((item) => item !== area.id));
                }}
              />
              <span>
                <span className="block font-medium">{area.label}</span>
                <span className="text-muted-foreground text-xs uppercase tracking-wide">{area.level}</span>
              </span>
            </label>
          ))}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "Menyimpan..." : mode === "create" ? "Simpan Draft Task" : "Perbarui Task"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function getSectionIcon(orderNumber: number, title: string) {
  const t = title.toLowerCase();
  if (t.includes("dasar") || orderNumber === 1) return <FileText className="size-4" />;
  if (t.includes("sasaran") || orderNumber === 2) return <Target className="size-4" />;
  if (t.includes("eei") || orderNumber === 3) return <HelpCircle className="size-4" />;
  if (t.includes("pengumpulan") || t.includes("rencana") || orderNumber === 4) return <MapIcon className="size-4" />;
  if (t.includes("risiko") || t.includes("ancaman") || orderNumber === 5) return <ShieldAlert className="size-4" />;
  if (t.includes("pelaksanaan") || orderNumber === 6) return <Zap className="size-4" />;
  if (t.includes("koordinasi") || orderNumber === 7) return <Share2 className="size-4" />;
  if (t.includes("rekomendasi") || orderNumber === 8) return <CheckSquare className="size-4" />;
  if (t.includes("pengesahan") || t.includes("approval") || orderNumber === 9) return <Award className="size-4" />;
  return <FileText className="size-4" />;
}

function _SummaryMetric({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
}) {
  let colorClass = "text-muted-foreground";
  if (variant === "primary") colorClass = "text-[var(--dc-primary)]";
  else if (variant === "success") colorClass = "text-[var(--dc-success)]";
  else if (variant === "warning") colorClass = "text-[var(--dc-warning)]";
  else if (variant === "danger") colorClass = "text-[var(--dc-danger)]";
  else if (variant === "info") colorClass = "text-[var(--dc-info)]";

  return (
    <div className="flex h-24 min-w-[120px] flex-1 flex-col justify-between rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3">
      <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">{label}</div>
      <div className={`mt-1 truncate font-sans font-semibold text-sm ${colorClass}`}>{value}</div>
    </div>
  );
}

function TaskCollapsibleSection({
  orderNumber,
  title,
  items,
  description,
  defaultOpen = false,
}: {
  orderNumber: number;
  title: string;
  items?: Array<{ id: string; itemCode?: string | null; content?: string | null }>;
  description?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const icon = getSectionIcon(orderNumber, title);

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] shadow-sm transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full cursor-pointer items-center justify-between rounded-[6px] p-3.5 text-left transition-colors hover:bg-white/[0.02] focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[var(--dc-primary)]">
            {icon}
          </div>
          <div>
            <span className="mr-2 font-mono text-[9px] text-muted-foreground/40 uppercase tracking-wider">
              {orderNumber.toString().padStart(2, "0")}
            </span>
            <h4 className="inline-block font-bold font-sans text-[var(--dc-text-primary)] text-xs uppercase tracking-tight">
              {title}
            </h4>
          </div>
        </div>
        <div className="flex size-6 items-center justify-center rounded bg-white/[0.04] text-muted-foreground">
          {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-white/[0.08] border-t bg-white/[0.01] p-4">
          {items ? (
            <div className="space-y-3 font-sans text-[var(--dc-text-primary)] text-sm leading-relaxed">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded-[4px] border border-white/[0.02] bg-white/[0.01] p-2.5"
                >
                  {item.itemCode && (
                    <span className="mt-0.5 shrink-0 font-mono text-[var(--dc-primary)] text-xs uppercase">
                      [{item.itemCode}]
                    </span>
                  )}
                  <span className="whitespace-pre-wrap">{normalizeDisplayText(item.content)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="whitespace-pre-wrap font-sans text-[var(--dc-text-primary)] text-sm leading-relaxed">
              {description || "Belum diisi."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OperationalTimeline({ status, hasAssignments }: { status: string; hasAssignments: boolean }) {
  const stages = [
    { key: "created", label: "Dibuat", desc: "Dokumen STR diterbitkan di pusat" },
    { key: "forwarded", label: "Diteruskan", desc: "STR diteruskan ke regional komando" },
    { key: "assigned", label: "Didistribusikan", desc: "Tugas dibagikan ke Field Coordinator" },
    { key: "accepted", label: "Diterima", desc: "Petugas lapangan menerima penugasan" },
    { key: "completed", label: "Selesai", desc: "Seluruh target operasi diselesaikan" },
  ];

  let activeIndex = 0;
  if (status === "PUBLISHED" || status === "DISTRIBUTED") activeIndex = 1;
  if (hasAssignments) activeIndex = 2;
  if (hasAssignments && status === "RUNNING") activeIndex = 3;
  if (status === "COMPLETED") activeIndex = 4;

  return (
    <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
      <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
        LINI MASA OPERASIONAL
      </div>
      <div className="relative space-y-4 border-white/[0.08] border-t pt-3 pl-6">
        <div className="absolute top-4 bottom-4 left-[9px] w-0.5 bg-white/10" />

        {stages.map((stage, idx) => {
          const isActive = idx <= activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={stage.key} className="relative flex gap-3 text-xs">
              <div
                className={`absolute top-1 -left-[20px] size-3 rounded-full border-2 ${isCurrent ? "border-[var(--dc-primary)] bg-[var(--dc-primary)] shadow-[0_0_8px_var(--dc-primary)]" : isActive ? "border-[var(--dc-success)] bg-[var(--dc-success)]" : "border-muted bg-muted"} z-10 transition-all duration-300`}
              />

              <div className="flex-1 space-y-0.5">
                <div
                  className={`font-semibold ${isCurrent ? "font-bold text-[var(--dc-primary)]" : isActive ? "text-[var(--dc-success)]" : "text-muted-foreground/60"}`}
                >
                  {stage.label}
                </div>
                <div className="text-[10px] text-muted-foreground/50 leading-tight">{stage.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommandHierarchyFlow() {
  const steps = [
    { label: "HQ (Pusat Komando)", desc: "Pemberi mandat utama STR" },
    { label: "REGIONAL (Regional Commander)", desc: "Pengarah & supervisor wilayah" },
    { label: "KABAGOPS (Intelligence Manager)", desc: "OIM pengelola penugasan lapangan" },
    { label: "FIELD COORDINATOR (Koordinator)", desc: "Pengawas taktis lapangan" },
    { label: "FIELD OFFICER (Petugas Lapangan)", desc: "Pelaksana operasi langsung" },
  ];

  return (
    <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
      <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">COMMAND_CHAIN_FLOW</div>
      <div className="flex flex-col items-center gap-1 border-white/[0.08] border-t pt-3 text-center font-mono">
        {steps.map((step, idx) => (
          <div key={idx} className="flex w-full flex-col items-center">
            <div className="w-full rounded-[4px] border border-white/[0.04] bg-white/[0.02] p-2 transition-colors hover:bg-white/[0.04]">
              <div className="font-bold text-[var(--dc-primary)] text-xs">{step.label}</div>
              <div className="mt-0.5 text-[9px] text-muted-foreground/50">{step.desc}</div>
            </div>
            {idx < steps.length - 1 && <ArrowDown className="my-0.5 size-3 animate-pulse text-muted-foreground/40" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionStatusPanel({ status, progressPercentage }: { status: string; progressPercentage: number }) {
  return (
    <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
      <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">STATUS MISI</div>
      <div className="space-y-4 border-white/[0.08] border-t pt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground/60">STATUS OPERASIONAL</span>
          <Badge
            variant="outline"
            className={`rounded-[4px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${badgeVariant(status) === "destructive" ? "border-[var(--dc-danger)]/40 bg-[var(--dc-danger-soft)]/10 text-[var(--dc-danger)]" : badgeVariant(status) === "default" ? "border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 text-[var(--dc-success)]" : "border-white/10 bg-white/[0.02] text-muted-foreground"}`}
          >
            {friendlyStatusLabel(status)}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
            <span>TARGET PENYELESAIAN</span>
            <span className="font-bold text-[var(--dc-success)]">{progressPercentage}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
            <div
              className="h-full rounded-full bg-[var(--dc-success)] transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OperationalActivityLog({ task }: { task: TaskDetail }) {
  const creatorName =
    task.createdByAssignment?.userProfile?.fullName || task.createdByAssignment?.position?.title || "Sistem";
  const creatorRole = task.createdByAssignment?.position?.title || "HQ Operator";

  const activities = [
    {
      time: formatDate((task as any).createdAt),
      title: "Task Created",
      desc: `Tugas diinisiasi oleh ${creatorName} (${creatorRole})`,
    },
    ...(task.assignments.length > 0
      ? [
          {
            time: formatDate((task.assignments[0] as any)?.createdAt || (task as any).createdAt),
            title: "Task Assigned",
            desc: `Tugas didistribusikan ke ${task.assignments.length} Field Coordinator`,
          },
        ]
      : []),
    {
      time: (task as any).updatedAt ? formatDate((task as any).updatedAt) : formatDate((task as any).createdAt),
      title: "System Synchronization",
      desc: `Status tugas disinkronkan ke status ${task.status}`,
    },
  ];

  return (
    <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
      <div className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">SYSTEM_ACTIVITY_LOG</div>
      <div className="space-y-3 border-white/[0.08] border-t pt-3">
        {activities.map((act, idx) => (
          <div key={idx} className="flex gap-3 text-xs">
            <div className="w-28 shrink-0 font-mono text-[10px] text-muted-foreground/40">{act.time}</div>
            <div className="space-y-0.5">
              <div className="font-bold text-[var(--dc-text-primary)]">{act.title}</div>
              <div className="text-[10px] text-muted-foreground">{act.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type TaskDetailClientProps = {
  task: TaskDetail;
  editHref?: string;
  assignmentHref?: string;
  hideTargetAreas?: boolean;
  hideAssignments?: boolean;
  assignmentTitle?: string;
};

export function TaskDetailClient({
  task,
  editHref,
  assignmentHref,
  hideTargetAreas = false,
  hideAssignments = false,
  assignmentTitle = "Assignments",
}: TaskDetailClientProps) {
  const router = useRouter();
  const showStructuredUuk = hasStructuredUukSections(task);
  const classification = taskClassificationLabel(task);
  const areaSummary = task.targetAreas.map((t) => t.area.name).join(", ") ?? "-";
  const completedAssignments = task.assignments.filter((a) => a.status === "COMPLETED").length;
  const progressPercentage = task.assignments.length
    ? Math.round((completedAssignments / task.assignments.length) * 100)
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-mono border-white/10 hover:bg-white/[0.04] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          <span>Kembali</span>
        </Button>
      </div>

      {/* 1. Command Header */}
      <div className="flex flex-col gap-3 border-white/[0.08] border-b pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-[var(--dc-text-primary)] text-xl tracking-tight">{task.title}</h1>
            <Badge
              variant="outline"
              className="rounded-[4px] border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dc-success)] uppercase tracking-wider"
            >
              {friendlyStatusLabel(task.status)}
            </Badge>
            <Badge
              variant="outline"
              className="dc-priority rounded-[4px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
              data-priority={(task.priority || "NORMAL").toUpperCase()}
            >
              {task.priority || "NORMAL"}
            </Badge>
            <Badge variant="outline" className={classificationBadgeClass(classification || "RAHASIA")}>
              {classification || "RAHASIA"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <MapIcon className="size-3 text-muted-foreground/60" />
              <span>
                WILAYAH: <span className="text-[var(--dc-text-primary)]">{areaSummary || "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground/60" />
              <span>
                BATAS WAKTU:{" "}
                <span className="text-[var(--dc-text-primary)]">{task.dueDate ? formatDate(task.dueDate) : "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="size-3 text-muted-foreground/60" />
              <span>
                PROGRES: <span className="text-[var(--dc-text-primary)]">{progressPercentage}%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {editHref ? (
            <Button asChild variant="outline" className="h-8 cursor-pointer rounded-[4px] font-mono text-xs">
              <Link href={editHref}>Edit Draft</Link>
            </Button>
          ) : null}
          {assignmentHref ? (
            <Button
              asChild
              className="h-8 cursor-pointer rounded-[4px] bg-[var(--dc-primary)] font-mono text-[var(--dc-text-inverse)] text-xs shadow-none hover:bg-[var(--dc-primary-hover)]"
            >
              <Link href={assignmentHref}>Kelola Penugasan</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column (8/12) */}
        <div className="space-y-6 lg:col-span-8">
          {/* 3. Mission Context Panel */}
          <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                KONTEKS MISI
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 border-white/[0.08] border-t pt-3 font-mono text-xs sm:grid-cols-4">
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Pemilik</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]">
                  {task.ownerUnit?.name || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Regional</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]">
                  {(task.directiveVersion?.directive as any)?.ownerUnit?.name || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Tingkat</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]">
                  <Badge
                    variant="outline"
                    className="dc-priority rounded-[4px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider"
                    data-priority={(task.priority || "NORMAL").toUpperCase()}
                  >
                    {task.priority || "NORMAL"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Klasifikasi</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]">
                  <Badge variant="outline" className={classificationBadgeClass(classification || "RAHASIA")}>
                    {classification || "RAHASIA"}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Sumber Direktif</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]">
                  {task.directiveVersion?.directive?.commandNumber || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Cakupan Wilayah</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]" title={areaSummary}>
                  {areaSummary || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[9px] text-muted-foreground/60 uppercase">Batas Waktu</div>
                <div className="truncate font-semibold text-[var(--dc-text-primary)]">
                  {task.dueDate ? formatDate(task.dueDate) : "-"}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Accordion Content (Progressive Disclosure) */}
          <div className="space-y-3">
            <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
              ISI DIREKTIF OPERASIONAL
            </div>
            <div className="space-y-3">
              {showStructuredUuk ? (
                task.uukStrVersion?.sections?.map((section) => (
                  <TaskCollapsibleSection
                    key={section.id}
                    orderNumber={section.orderNumber}
                    title={section.title}
                    items={section.items}
                    defaultOpen={true}
                  />
                ))
              ) : (
                <TaskCollapsibleSection
                  orderNumber={1}
                  title="Deskripsi Tugas"
                  description={task.description}
                  defaultOpen={true}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4/12) - Right Panel */}
        <div className="space-y-6 lg:col-span-4">
          {/* Mission Status */}
          <MissionStatusPanel status={task.status} progressPercentage={progressPercentage} />

          {/* 5. Timeline */}
          <OperationalTimeline status={task.status} hasAssignments={task.assignments.length > 0} />

          {/* Hierarchy Flow */}
          <CommandHierarchyFlow />

          {/* 7. Activity Log */}
          <OperationalActivityLog task={task} />
        </div>
      </div>
    </div>
  );
}

type AssignmentBoardClientProps = {
  task: TaskDetail;
  candidates: AssignmentCandidate[];
  submitLabel: string;
  mode: "assign" | "reassign";
  existingAssignmentId?: string;
};

export function AssignmentBoardClient({
  task,
  candidates,
  submitLabel,
  mode,
  existingAssignmentId,
}: AssignmentBoardClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rows, setRows] = useState([
    { assigneeAssignmentId: "", dueDate: task.dueDate?.slice(0, 10) ?? "", assignmentNote: "" },
  ]);

  async function handleSubmit() {
    if (rows.some((row) => row.assigneeAssignmentId.trim() === "")) {
      toast.error("Silakan pilih assignee (petugas) terlebih dahulu.");
      return;
    }
    if (rows.some((row) => row.assignmentNote.trim() === "")) {
      toast.error("Silakan isi instruksi operasional terlebih dahulu.");
      return;
    }

    setIsSubmitting(true);

    try {
      const parsed = assigneeSelectionSchema.parse({ assignments: rows });

      if (mode === "assign") {
        await apiBrowserMutation("POST", `/tasks/${task.id}/assignments`, parsed);
      } else {
        if (!existingAssignmentId) {
          throw new Error("Assignment induk tidak tersedia.");
        }

        await apiBrowserMutation("POST", `/task-assignments/${existingAssignmentId}/reassign`, {
          assigneeAssignmentId: parsed.assignments[0]?.assigneeAssignmentId,
          dueDate: parsed.assignments[0]?.dueDate || undefined,
          reason: parsed.assignments[0]?.assignmentNote || "Reassignment operasional",
        });
      }

      toast.success("Penugasan berhasil diproses.");
      router.refresh();
    } catch (error) {
      let message = error instanceof Error ? error.message : "Gagal memproses penugasan.";
      try {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const first = parsed[0];
          if (first.path && first.path.includes("assigneeAssignmentId")) {
            message = "Silakan pilih assignee (petugas) terlebih dahulu.";
          } else if (first.message) {
            message = first.message;
          }
        }
      } catch (_) {}
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <BackButton />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{submitLabel}</CardTitle>
          <CardDescription>{task.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!candidates.length ? (
            <Alert>
              <AlertTriangle className="size-4" />
              <AlertTitle>Field Officer belum tersedia</AlertTitle>
              <AlertDescription>
                Tidak ada Field Officer aktif di bawah reporting line Field Coordinator ini.
              </AlertDescription>
            </Alert>
          ) : null}
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-border/70 p-4 md:grid-cols-[minmax(0,1fr)_180px_minmax(0,1.2fr)_auto]"
            >
              <Select
                value={row.assigneeAssignmentId}
                onValueChange={(value) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, assigneeAssignmentId: value } : item,
                    ),
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih assignee" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.userProfile?.fullName ?? candidate.position?.title ?? candidate.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={row.dueDate}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, dueDate: event.target.value } : item,
                    ),
                  )
                }
              />
              <Textarea
                value={row.assignmentNote}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, assignmentNote: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Instruksi operasional untuk Field Officer"
                className="min-h-20 resize-y"
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={rows.length === 1 || mode === "reassign"}>
                    Hapus
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Penugasan?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Apakah Anda yakin ingin menghapus baris penugasan ini?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      Ya, Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}

          {mode === "assign" ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setRows((current) => [
                  ...current,
                  { assigneeAssignmentId: "", dueDate: task.dueDate?.slice(0, 10) ?? "", assignmentNote: "" },
                ])
              }
            >
              Tambah Assignee
            </Button>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isSubmitting || !candidates.length}>
                {isSubmitting ? "Memproses..." : submitLabel}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Distribusikan Penugasan?</AlertDialogTitle>
                <AlertDialogDescription>
                  Apakah Anda yakin ingin mendistribusikan penugasan operasional ini kepada petugas terpilih?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Kembali</AlertDialogCancel>
                <AlertDialogAction onClick={handleSubmit}>Ya, Distribusikan</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}

type FieldOfficerAssignmentsClientProps = {
  assignments: TaskAssignmentDetail[];
};

export function FieldOfficerAssignmentsClient({ assignments }: FieldOfficerAssignmentsClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Tugas Saya</h1>
        <p className="text-muted-foreground text-sm">
          Hanya assignment milik sendiri dengan alur baca → acknowledge → start → progress → complete.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {assignments.map((assignment) => (
          <Card key={assignment.id} className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{assignment.task?.title ?? "Task"}</span>
                <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
              </CardTitle>
              <CardDescription>{assignment.assignee?.position?.title ?? "Field Officer"}</CardDescription>
              <CardAction>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/field-officer/tugas-saya/${assignment.id}`}>Buka</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-3 text-muted-foreground text-sm">
                {assignment.task?.description ?? "Belum ada deskripsi."}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 p-3 text-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Batas Waktu</div>
                  <div className="mt-1 font-medium">{formatDate(assignment.dueDate)}</div>
                </div>
                <div className="rounded-xl border border-border/70 p-3 text-sm">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Progress Log</div>
                  <div className="mt-1 font-medium">{assignment.progressLogs?.length ?? 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

type FieldOfficerAssignmentDetailClientProps = {
  assignment: TaskAssignmentDetail;
};

export function FieldOfficerAssignmentDetailClient({ assignment }: FieldOfficerAssignmentDetailClientProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [progressPercent, setProgressPercent] = useState(50);
  const [action, setAction] = useState<string | null>(null);

  async function runAction(nextAction: "mark-read" | "acknowledge" | "start" | "progress" | "complete") {
    setAction(nextAction);

    try {
      if (nextAction === "mark-read") {
        await apiBrowserMutation("POST", `/task-assignments/${assignment.id}/mark-read`);
      } else if (nextAction === "acknowledge") {
        await apiBrowserMutation("POST", `/task-assignments/${assignment.id}/acknowledge`, {
          note,
        });
      } else if (nextAction === "start") {
        await apiBrowserMutation("POST", `/task-assignments/${assignment.id}/start`, {
          note,
        });
      } else if (nextAction === "progress") {
        const parsed = assignmentProgressSchema.parse({ note, progressPercent });
        await apiBrowserMutation("POST", `/task-assignments/${assignment.id}/progress`, parsed);
      } else {
        await apiBrowserMutation("POST", `/task-assignments/${assignment.id}/complete`, {
          note,
        });
      }

      toast.success("Status assignment diperbarui.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui assignment.";
      toast.error(message);
    } finally {
      setAction(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <BackButton href="/dashboard/field-officer/tugas-saya" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-2xl tracking-tight">{assignment.task?.title ?? "Assignment"}</h1>
          <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{assignment.task?.description ?? "Belum ada deskripsi task."}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Eksekusi Pribadi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-border/70 p-3 text-sm">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Batas Waktu</div>
              <div className="mt-1 font-medium">{formatDate(assignment.dueDate)}</div>
            </div>
            <div className="rounded-xl border border-border/70 p-3 text-sm">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Directive</div>
              <div className="mt-1 font-medium">
                {assignment.task?.directiveVersion?.directive?.commandNumber ?? "-"}
              </div>
            </div>
            <div className="rounded-xl border border-border/70 p-3 text-sm">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">UUK/STR</div>
              <div className="mt-1 font-medium">{assignment.task?.uukStrVersion?.title ?? "-"}</div>
            </div>
          </div>

          <label className="space-y-2 text-sm">
            <span>Catatan</span>
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <label className="space-y-2 text-sm">
            <span>Progress (%)</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={progressPercent}
              onChange={(event) => setProgressPercent(Number(event.target.value))}
            />
          </label>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => runAction("mark-read")} disabled={action !== null}>
            {action === "mark-read" ? "Memproses..." : "Mark Read"}
          </Button>
          <Button variant="outline" onClick={() => runAction("acknowledge")} disabled={action !== null}>
            {action === "acknowledge" ? "Memproses..." : "Acknowledge"}
          </Button>
          <Button variant="outline" onClick={() => runAction("start")} disabled={action !== null}>
            {action === "start" ? "Memproses..." : "Start"}
          </Button>
          <Button onClick={() => runAction("progress")} disabled={action !== null}>
            {action === "progress" ? "Memproses..." : "Update Progress"}
          </Button>
          <Button variant="success" onClick={() => runAction("complete")} disabled={action !== null}>
            {action === "complete" ? "Memproses..." : "Complete"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignment.progressLogs?.length ? (
            assignment.progressLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border/70 p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={badgeVariant(log.status)}>{log.status}</Badge>
                  <span className="text-muted-foreground text-xs">{formatDate(log.createdAt)}</span>
                </div>
                <div className="mt-2">{log.progressPercent ?? "-"}%</div>
                <p className="mt-2 text-muted-foreground">{log.note ?? "-"}</p>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada progress log.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
