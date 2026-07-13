"use client";

import { useMemo, useState, useEffect } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BookOpenText,
  ChevronRight,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  Target,
  HelpCircle,
  Map as MapIcon,
  ShieldAlert,
  Zap,
  Share2,
  CheckSquare,
  Check,
  Award,
  User,
  Clock,
  ArrowDown,
  Calendar,
  Layers,
  Activity,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart4,
  PieChart,
  MapPin,
  Send,
  Eye,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserMutation } from "@/lib/api/browser-client";

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

function uukStatusLabel(status: string) {
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

function taskMetaLine(task: Pick<TaskSummary, "ownerUnit" | "priority" | "directiveVersion" | "uukStrVersion">) {
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
  description: string;
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
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider text-[var(--dc-primary)] uppercase bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
              COORDINATOR_PORTAL
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--dc-success)] animate-pulse" />
            <span className="text-[10px] text-muted-foreground/60 font-mono">LIVE TASK BOARD</span>
          </div>
          <h1 className="font-sans font-bold text-2xl tracking-tight text-[var(--dc-text-primary)] mt-1">{title}</h1>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 rounded-[4px] border-white/10 text-xs font-mono gap-1.5 hover:bg-white/[0.04]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </Button>
          {createHref ? (
            <Button
              asChild
              size="sm"
              className="h-8 rounded-[4px] bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)] font-mono text-xs"
            >
              <Link href={createHref}>BUAT TASK</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* KPI Summary Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">TOTAL TUGAS</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-text-primary)]">{stats.total}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">TUGAS</span>
          </div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">SEDANG BERJALAN</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-warning)]">{stats.inProgress}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">AKTIF</span>
          </div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">SELESAI</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-success)]">{stats.completed}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">TUNTAS</span>
          </div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">COMPLETION RATE</div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[var(--dc-primary)]">{stats.completionRate}%</span>
              <span className="text-[10px] text-muted-foreground/60 font-mono">TARGET 100%</span>
            </div>
            <div className="w-full bg-white/[0.04] h-1 rounded-full overflow-hidden border border-white/10">
              <div
                className="bg-[var(--dc-primary)] h-full transition-all duration-300"
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
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Cari nama tugas atau deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 text-xs font-mono placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
                <Filter className="size-3 text-muted-foreground/50" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                  <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
                    <SelectItem value="latest">TERBARU</SelectItem>
                    <SelectItem value="oldest">TERLAMA</SelectItem>
                    <SelectItem value="due_soon">DEADLINE TERDEKAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compact Cards List */}
          {paginatedTasks.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground text-xs font-mono">
              Tidak ada tugas yang cocok dengan filter atau kriteria pencarian.
            </div>
          ) : (
            <div className="grid gap-3.5 md:grid-cols-1">
              {paginatedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="border border-white/[0.08] bg-[var(--dc-card)] rounded-[6px] overflow-hidden hover:border-white/20 transition-colors shadow-sm"
                >
                  <div className="p-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex items-start gap-2.5">
                        <Badge
                          variant={badgeVariant(task.status)}
                          className="font-mono text-[9px] uppercase tracking-wider rounded-[4px] px-1.5 shrink-0 mt-0.5"
                        >
                          {taskStatusLabel(task.status)}
                        </Badge>
                        <h3 className="font-sans text-[13px] font-bold text-[var(--dc-text-primary)] leading-snug truncate">
                          {task.title}
                        </h3>
                      </div>

                      {task.description && (
                        <p className="line-clamp-2 text-muted-foreground text-xs leading-normal font-sans">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 border-t border-white/[0.04] text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground/60" />
                          <span>
                            DEADLINE: <span className="text-[var(--dc-text-primary)]">{formatDate(task.dueDate)}</span>
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

                    <div className="flex items-center md:items-end justify-end shrink-0 pt-2 md:pt-0">
                      <Button
                        asChild
                        size="sm"
                        className="h-8 rounded-[4px] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono border border-white/10 text-[var(--dc-text-primary)] shadow-none"
                      >
                        <Link href={`${detailBasePath}/${task.id}`}>
                          <span>BUKA DETAIL</span>
                          <ChevronRight className="size-3.5 ml-1" />
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
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 font-mono text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>TAMPILKAN:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] text-[10px] font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                  className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
                >
                  <ChevronLeft className="size-3 mr-1" /> SEBELUMNYA
                </Button>
                <span className="font-bold text-[var(--dc-text-primary)]">
                  HALAMAN {currentPage} DARI {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
                >
                  SELANJUTNYA <ChevronRight className="size-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Sticky Sidebar */}
        <div className="h-fit space-y-4 lg:sticky lg:top-[80px] lg:col-span-4">
          {/* Mission Overview / Critical items */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3.5 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2 flex justify-between items-center">
              <span>DEADLINE COUNTDOWN</span>
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
                  <div className="text-xs text-muted-foreground font-mono py-2">
                    Tidak ada tugas aktif dengan batas waktu yang mendesak.
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {dueSoonTasks.map((t) => (
                    <div
                      key={t.id}
                      className="space-y-1.5 bg-white/[0.01] border border-white/[0.04] p-3 rounded-[4px]"
                    >
                      <div className="flex justify-between items-center gap-2">
                        <span
                          className="font-sans font-bold text-xs truncate text-[var(--dc-text-primary)]"
                          title={t.title}
                        >
                          {t.title}
                        </span>
                        <Badge variant="destructive" className="font-mono text-[8px] px-1 py-0 rounded-[2px] shrink-0">
                          DEADLINE
                        </Badge>
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>BATAS WAKTU:</span>
                        <span className="text-[var(--dc-warning)] font-bold">{formatDate(t.dueDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Operational Statistics */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-4 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2 flex justify-between items-center">
              <span>COMPLETION RATE BY STATE</span>
              <BarChart4 className="size-3 text-[var(--dc-primary)]" />
            </div>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">SELESAI (COMPLETED):</span>
                  <span className="text-[var(--dc-success)] font-bold">
                    {tasks.filter((t) => t.status === "COMPLETED").length}
                  </span>
                </div>
                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[var(--dc-success)] h-full transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "COMPLETED").length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">BERJALAN (IN_PROGRESS):</span>
                  <span className="text-[var(--dc-warning)] font-bold">
                    {tasks.filter((t) => t.status === "IN_PROGRESS").length}
                  </span>
                </div>
                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[var(--dc-warning)] h-full transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "IN_PROGRESS").length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">DIDISTRIBUSIKAN (ASSIGNED):</span>
                  <span className="text-[var(--dc-primary)] font-bold">
                    {tasks.filter((t) => t.status === "ASSIGNED").length}
                  </span>
                </div>
                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[var(--dc-primary)] h-full transition-all duration-300"
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter((t) => t.status === "ASSIGNED").length / tasks.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3.5 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2 flex justify-between items-center">
              <span>RECENT FEED ACTIVITY</span>
              <Activity className="size-3 text-[var(--dc-primary)]" />
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--dc-success)] mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-muted-foreground/80 font-sans leading-normal">
                    Distribusi tugas <strong className="text-[var(--dc-text-primary)]">Aceh Selatan</strong> tervalidasi
                    100% aman.
                  </p>
                  <span className="text-[9px] text-muted-foreground/45 font-mono">10 MENIT YANG LALU</span>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--dc-primary)] mt-1.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-muted-foreground/80 font-sans leading-normal">
                    STR berjenjang regional terintegrasi ke dalam data tugas koordinator.
                  </p>
                  <span className="text-[9px] text-muted-foreground/45 font-mono">42 MENIT YANG LALU</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="sticky bottom-0 z-50 -mx-6 flex min-h-12 w-full flex-wrap items-center justify-between gap-3 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-4 py-2 backdrop-blur-md sm:mx-0">
        <div className="text-[10px] font-mono text-muted-foreground">
          SISTEM MONITORING KOORDINATOR LAPANGAN | TOTAL AKTIF:{" "}
          <span className="text-[var(--dc-warning)] font-bold">{stats.inProgress} TUGAS</span>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/50">DENS CAKRA SECURED</div>
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider text-[var(--dc-primary)] uppercase bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
              OFFICER_ASSIGNMENTS
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--dc-success)] animate-pulse" />
            <span className="text-[10px] text-muted-foreground/60 font-mono">DISTRIBUTION LOGS</span>
          </div>
          <h1 className="font-sans font-bold text-2xl tracking-tight text-[var(--dc-text-primary)] mt-1">
            Penugasan Field Officer
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl mt-1">
            Daftar distribusi tugas dari Field Coordinator ke Field Officer beserta instruksi operasionalnya.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 rounded-[4px] border-white/10 text-xs font-mono gap-1.5 hover:bg-white/[0.04]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area - Full Width */}
      <div className="space-y-4 w-full">
        {/* Sticky Toolbar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2 backdrop-blur-md">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Cari tugas, FO, instruksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 text-xs font-mono placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <Filter className="size-3 text-muted-foreground/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
                  <SelectItem value="latest">TERBARU</SelectItem>
                  <SelectItem value="oldest">TERLAMA</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compact Task Assignments List */}
        {paginatedTasks.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground text-xs font-mono">
            Belum ada tugas penugasan yang cocok dengan filter atau pencarian.
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedTasks.map((task) => {
              const summary = countAssignmentStatuses(task.subordinateAssignments);
              const taskRate =
                task.subordinateAssignments.length > 0
                  ? Math.round((summary.completed / task.subordinateAssignments.length) * 100)
                  : 0;

              return (
                <Card
                  key={task.id}
                  className="border border-white/[0.08] bg-[var(--dc-card)] rounded-[6px] overflow-hidden shadow-sm"
                >
                  {/* Header */}
                  <div className="p-3.5 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={badgeVariant(task.status)}
                          className="font-mono text-[8px] uppercase px-1 rounded-[2px]"
                        >
                          {task.status}
                        </Badge>
                        <h3 className="font-sans text-xs font-bold text-[var(--dc-text-primary)] leading-none truncate">
                          {task.title}
                        </h3>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/60">
                        DEADLINE: {formatDate(task.dueDate)} | AREA SASARAN: {task.targetAreas.length} WILAYAH
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        asChild
                        size="sm"
                        className="h-7 rounded-[4px] bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)] text-[10px] font-mono border border-[var(--dc-primary)]"
                      >
                        <Link href={`/dashboard/field-coordinator/penugasan-field-officer/${task.id}`}>Detail</Link>
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar for the task */}
                  <div className="px-4 py-2 border-b border-white/[0.04] bg-white/[0.005] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/80">
                      <span>PROGRESS OFFICER:</span>
                      <span className="text-[var(--dc-success)] font-bold">
                        {summary.completed}/{task.subordinateAssignments.length} SELESAI
                      </span>
                    </div>
                    <div className="flex-1 max-w-[200px] bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                      <div className="bg-[var(--dc-success)] h-full transition-all" style={{ width: `${taskRate}%` }} />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[var(--dc-success)]">{taskRate}%</span>
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
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 font-mono text-[10px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>TAMPILKAN:</span>
              <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] text-[10px] font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
              >
                <ChevronLeft className="size-3 mr-1" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-[var(--dc-text-primary)]">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
              >
                SELANJUTNYA <ChevronRight className="size-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 -mx-6 flex min-h-12 w-full flex-wrap items-center justify-between gap-3 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-4 py-2 backdrop-blur-md sm:mx-0">
        <div className="text-[10px] font-mono text-muted-foreground">
          SISTEM DELEGASI FIELD OFFICER | HIERARKI: KOORDINATOR LAPANGAN
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/50">
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
            className="p-3.5 flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs"
          >
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-[var(--dc-text-primary)]">
                  {assignment.assignee?.userProfile?.fullName ?? "Field Officer"}
                </span>
                <span className="text-[10px] text-muted-foreground/50 font-mono">
                  ({assignment.assignee?.position?.title ?? "Petugas Lapangan"})
                </span>
              </div>
              <div className="text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-mono text-[9px] text-[var(--dc-primary)] uppercase mr-1">[INSTRUKSI FC]</span>
                {normalizeDisplayText(assignment.assignmentNote)}
              </div>
            </div>

            <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start gap-2 shrink-0 pt-2 md:pt-0 border-t border-dashed border-white/[0.04] md:border-none">
              <Badge
                variant={badgeVariant(assignment.status)}
                className="font-mono text-[8px] uppercase px-1 rounded-[2px]"
              >
                {assignment.status}
              </Badge>
              <div className="text-[9px] font-mono text-muted-foreground/50">
                LIMIT: {formatDate(assignment.dueDate)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="p-3 bg-white/[0.01] border-t border-white/[0.04] flex items-center justify-between font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>TAMPILKAN:</span>
            <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
              <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] text-[10px] font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
              className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
            >
              <ChevronLeft className="size-3 mr-1" /> SEBELUMNYA
            </Button>
            <span className="font-bold text-[var(--dc-text-primary)]">
              HALAMAN {currentPage} DARI {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
            >
              SELANJUTNYA <ChevronRight className="size-3 ml-1" />
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
            TOTAL FIELD OFFICER
          </div>
          <div className="text-xl font-bold font-mono text-[var(--dc-text-primary)]">{stats.total}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">COMPLETED</div>
          <div className="text-xl font-bold font-mono text-[var(--dc-success)]">{stats.completed}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">RUNNING</div>
          <div className="text-xl font-bold font-mono text-[var(--dc-primary)]">{stats.running}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">OVERDUE</div>
          <div className="text-xl font-bold font-mono text-[var(--dc-danger)]">{stats.overdue}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1 col-span-2 md:col-span-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">PROGRESS</div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xl font-bold font-mono text-[var(--dc-success)]">{stats.progress}%</span>
            <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10 shrink-0 max-w-[80px]">
              <div
                className="bg-[var(--dc-success)] h-full transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main compact list / table enterprise */}
      <Card className="border border-white/[0.08] bg-[var(--dc-card)] rounded-[6px] p-4 shadow-sm space-y-4">
        {/* Toolbar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2.5 backdrop-blur-md">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Cari Field Officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 text-xs font-mono placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <Filter className="size-3 text-muted-foreground/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
                  <SelectItem value="nama">NAMA FIELD OFFICER</SelectItem>
                  <SelectItem value="deadline">DEADLINE ASSIGNMENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compact list */}
        {paginatedAssignments.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground text-xs font-mono">
            Belum ada penugasan yang cocok dengan kriteria filter.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] border border-white/[0.08] rounded-[6px] overflow-hidden bg-white/[0.005]">
            {paginatedAssignments.map((assignment) => {
              const name = assignment.assignee?.userProfile?.fullName ?? "Field Officer";
              const position = assignment.assignee?.position?.title ?? "Field Officer";
              const region = assignment.assignee?.position?.organizationUnit?.name ?? "Aceh";
              const isOverdue = isAssignmentOverdue(assignment);

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-4 h-[72px]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-8 rounded-full bg-white/[0.04] flex items-center justify-center text-[var(--dc-primary)] font-bold text-xs shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans font-bold text-xs text-[var(--dc-text-primary)] truncate">{name}</div>
                      <div className="text-[10px] text-muted-foreground/60 font-mono truncate">{position}</div>
                    </div>
                  </div>

                  <div className="w-[180px] hidden sm:block shrink-0 min-w-0">
                    <div className="text-xs text-[var(--dc-text-primary)] font-medium truncate">{region}</div>
                    <div className="text-[9px] text-muted-foreground/40 font-mono">WILAYAH</div>
                  </div>

                  <div className="w-[120px] shrink-0 text-left">
                    <Badge
                      variant={badgeVariant(assignment.status)}
                      className="font-mono text-[8px] uppercase px-1 rounded-[2px]"
                    >
                      {assignment.status}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="font-mono text-[8px] uppercase px-1 rounded-[2px] ml-1">
                        OVERDUE
                      </Badge>
                    )}
                  </div>

                  <div className="w-[140px] hidden md:block shrink-0 text-left font-mono text-[10px]">
                    <div className="text-muted-foreground/85">{formatDate(assignment.dueDate)}</div>
                    <div className="text-[8px] text-muted-foreground/45 uppercase">LIMIT WAKTU</div>
                  </div>

                  <div className="shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[4px] border-white/10 text-[10px] font-mono hover:bg-white/[0.04] cursor-pointer"
                        >
                          Detail
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border border-[var(--dc-border-subtle)] bg-popover text-[var(--dc-text-primary)]">
                        <DialogHeader>
                          <DialogTitle className="font-sans font-bold text-sm">Instruksi Tugas Lapangan</DialogTitle>
                          <DialogDescription className="font-mono text-[10px] uppercase text-muted-foreground/60">
                            {name} — {position} ({region})
                          </DialogDescription>
                        </DialogHeader>
                        <div className="mt-4 p-3 bg-white/[0.02] border border-white/[0.08] rounded-[6px] space-y-2">
                          <div className="text-[10px] font-mono text-[var(--dc-primary)] uppercase font-semibold">
                            INSTRUKSI PENUGASAN:
                          </div>
                          <p className="text-xs font-sans leading-relaxed text-muted-foreground whitespace-pre-wrap">
                            {normalizeDisplayText(assignment.assignmentNote)}
                          </p>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4 text-xs font-mono p-3 border-t border-white/[0.04]">
                          <div>
                            <span className="text-muted-foreground/50 block text-[9px]">STATUS</span>
                            <Badge
                              variant={badgeVariant(assignment.status)}
                              className="font-mono text-[8px] uppercase px-1 mt-1 rounded-[2px]"
                            >
                              {assignment.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground/50 block text-[9px]">LIMIT WAKTU</span>
                            <span className="text-[var(--dc-warning)] font-bold mt-1 block">
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
                className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
              >
                <ChevronLeft className="size-3 mr-1" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-[var(--dc-text-primary)]">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
              >
                SELANJUTNYA <ChevronRight className="size-3 ml-1" />
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider text-[var(--dc-primary)] uppercase bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
              MONITORING_SYSTEM
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--dc-warning)] animate-pulse" />
            <span className="text-[10px] text-muted-foreground/60 font-mono">REAL-TIME MONITORING</span>
          </div>
          <h1 className="font-sans font-bold text-2xl tracking-tight text-[var(--dc-text-primary)] mt-1">
            Monitoring Tugas
          </h1>
          <p className="text-muted-foreground text-xs leading-relaxed max-w-2xl mt-1">
            Pantau progres, acknowledgement, dan potensi keterlambatan assignment Field Officer.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 rounded-[4px] border-white/10 text-xs font-mono gap-1.5 hover:bg-white/[0.04]"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>REFRESH</span>
          </Button>
        </div>
      </div>

      {/* KPI Summary Block */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">TUGAS DIPANTAU</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-text-primary)]">{stats.totalTasks}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">TUGAS</span>
          </div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">SUDAH ACK / READ</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-success)]">{stats.acknowledged}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">PERSONEL</span>
          </div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">BELUM RESPOND</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-warning)]">{stats.sent}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">PERSONEL</span>
          </div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 shadow-sm space-y-1.5">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">OVERDUE LIMIT</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[var(--dc-danger)]">{stats.overdue}</span>
            <span className="text-[10px] text-muted-foreground/60 font-mono">KASUS</span>
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
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                placeholder="Cari tugas, FO, atau instruksi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 text-xs font-mono placeholder:text-muted-foreground/60"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
                <Filter className="size-3 text-muted-foreground/50" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                  <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
                    <SelectItem value="latest">TERBARU</SelectItem>
                    <SelectItem value="oldest">TERLAMA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Compact Task Monitoring List */}
          {paginatedTasks.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground text-xs font-mono">
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
                    className="border border-white/[0.08] bg-[var(--dc-card)] rounded-[6px] overflow-hidden shadow-sm"
                  >
                    {/* Header */}
                    <div className="p-3.5 bg-white/[0.02] border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={badgeVariant(task.status)}
                            className="font-mono text-[8px] uppercase px-1 rounded-[2px]"
                          >
                            {task.status}
                          </Badge>
                          <h3 className="font-sans text-xs font-bold text-[var(--dc-text-primary)] leading-none truncate">
                            {task.title}
                          </h3>
                        </div>
                        <div className="text-[10px] font-mono text-muted-foreground/60">
                          INSTANSI PEMILIK: {task.ownerUnit?.name ?? "-"}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <Button
                          asChild
                          size="sm"
                          className="h-7 rounded-[4px] bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)] text-[10px] font-mono"
                        >
                          <Link href={`/dashboard/field-coordinator/monitoring-tugas/${task.id}`}>Buka Monitoring</Link>
                        </Button>
                      </div>
                    </div>

                    {/* Stats Grid inside task */}
                    <div className="px-4 py-2 border-b border-white/[0.04] bg-white/[0.005] grid grid-cols-4 gap-2 text-center font-mono text-[10px]">
                      <div className="border-r border-white/[0.04] py-1">
                        <div className="text-muted-foreground/50 text-[8px]">SUDAH ACK</div>
                        <div className="font-bold text-[var(--dc-success)]">
                          {summary.acknowledged + summary.inProgress + summary.completed}
                        </div>
                      </div>
                      <div className="border-r border-white/[0.04] py-1">
                        <div className="text-muted-foreground/50 text-[8px]">BELUM RESPOND</div>
                        <div className="font-bold text-[var(--dc-warning)]">{summary.sent}</div>
                      </div>
                      <div className="border-r border-white/[0.04] py-1">
                        <div className="text-muted-foreground/50 text-[8px]">IN PROGRESS</div>
                        <div className="font-bold text-[var(--dc-primary)]">{summary.inProgress}</div>
                      </div>
                      <div className="py-1">
                        <div className="text-muted-foreground/50 text-[8px]">OVERDUE</div>
                        <div className="font-bold text-[var(--dc-danger)]">{overdueCount}</div>
                      </div>
                    </div>

                    {/* Compact subordinate list slice */}
                    <div className="divide-y divide-white/[0.04]">
                      {task.subordinateAssignments.slice(0, 3).map((assignment) => {
                        const isOverdue = isAssignmentOverdue(assignment);
                        return (
                          <div key={assignment.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-sans font-bold text-[var(--dc-text-primary)] truncate">
                                  {assignment.assignee?.userProfile?.fullName ?? "Field Officer"}
                                </span>
                                <span className="text-[9px] text-muted-foreground/40 font-mono truncate">
                                  ({assignment.assignee?.position?.title ?? "FO"})
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                Instruksi: {normalizeDisplayText(assignment.assignmentNote)}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isOverdue && (
                                <Badge
                                  variant="destructive"
                                  className="font-mono text-[8px] uppercase px-1 rounded-[2px] bg-[var(--dc-danger)] text-white"
                                >
                                  OVERDUE
                                </Badge>
                              )}
                              <Badge
                                variant={badgeVariant(assignment.status)}
                                className="font-mono text-[8px] uppercase px-1 rounded-[2px]"
                              >
                                {assignment.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                      {task.subordinateAssignments.length > 3 && (
                        <div className="p-2 text-center bg-white/[0.01]">
                          <Link
                            href={`/dashboard/field-coordinator/monitoring-tugas/${task.id}`}
                            className="text-[9px] font-mono text-[var(--dc-primary)] hover:underline"
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
            <div className="flex items-center justify-between border-t border-white/[0.08] pt-4 font-mono text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>TAMPILKAN:</span>
                <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(Number(val))}>
                  <SelectTrigger className="h-7 w-20 border-white/10 bg-white/[0.02] text-[10px] font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                  className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
                >
                  <ChevronLeft className="size-3 mr-1" /> SEBELUMNYA
                </Button>
                <span className="font-bold text-[var(--dc-text-primary)]">
                  HALAMAN {currentPage} DARI {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
                >
                  SELANJUTNYA <ChevronRight className="size-3 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Sticky Sidebar */}
        <div className="h-fit space-y-4 lg:sticky lg:top-[80px] lg:col-span-4">
          {/* Overdue Risk Analysis */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3.5 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2 flex justify-between items-center">
              <span>OVERDUE RISK ANALYSIS</span>
              <AlertTriangle className="size-3 text-[var(--dc-danger)]" />
            </div>

            {/* Display count and list of overdue or critical assignments */}
            {stats.overdue > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[var(--dc-danger)] bg-white/[0.02] border border-white/[0.06] p-2.5 rounded-[4px]">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span className="font-mono text-xs font-bold">{stats.overdue} PENUGASAN MELEBIHI DEADLINE</span>
                </div>
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed font-sans">
                  Segera hubungi personel bersangkutan atau lakukan re-assignment untuk mencegah keterlambatan data
                  intelijen.
                </p>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground/80 leading-normal font-sans bg-white/[0.01] border border-white/[0.04] p-3 rounded-[4px]">
                Seluruh Field Officer bertugas sesuai limit operasional. Tingkat risiko keterlambatan:{" "}
                <strong className="text-[var(--dc-success)]">SANGAT RENDAH</strong>
              </div>
            )}
          </div>

          {/* Acknowledgement Status stats */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3.5 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2 flex justify-between items-center">
              <span>RESPONSE METRICS</span>
              <Activity className="size-3 text-[var(--dc-primary)]" />
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">SUDAH MEMBACA/ACK:</span>
                  <span className="text-[var(--dc-success)] font-bold">{stats.acknowledged} FO</span>
                </div>
                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[var(--dc-success)] h-full transition-all duration-300"
                    style={{
                      width: `${stats.totalAssignments > 0 ? (stats.acknowledged / stats.totalAssignments) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">BELUM RESPOND:</span>
                  <span className="text-[var(--dc-warning)] font-bold">{stats.sent} FO</span>
                </div>
                <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                  <div
                    className="bg-[var(--dc-warning)] h-full transition-all duration-300"
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
        <div className="text-[10px] font-mono text-muted-foreground">
          SISTEM MONITORING PENUGASAN LAPANGAN | DENS CAKRA CORE
        </div>
        <div className="text-[10px] font-mono text-muted-foreground/50">
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
            TOTAL FIELD OFFICER
          </div>
          <div className="text-xl font-bold font-mono text-[var(--dc-text-primary)]">{stats.total}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">COMPLETED</div>
          <div className="text-xl font-bold font-mono text-[var(--dc-success)]">{stats.completed}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">RUNNING</div>
          <div className="text-xl font-bold font-mono text-[var(--dc-primary)]">{stats.running}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">OVERDUE</div>
          <div className="text-xl font-bold font-mono text-[var(--dc-danger)]">{stats.overdue}</div>
        </div>
        <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3.5 space-y-1 col-span-2 md:col-span-1">
          <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">PROGRESS</div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xl font-bold font-mono text-[var(--dc-success)]">{stats.progress}%</span>
            <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10 shrink-0 max-w-[80px]">
              <div
                className="bg-[var(--dc-success)] h-full transition-all duration-300"
                style={{ width: `${stats.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main compact list / table enterprise */}
      <Card className="border border-white/[0.08] bg-[var(--dc-card)] rounded-[6px] p-4 shadow-sm space-y-4">
        {/* Toolbar */}
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-3 border-[var(--dc-border-subtle)] border-b bg-[var(--dc-card)]/95 py-2.5 backdrop-blur-md">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              placeholder="Cari Field Officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 rounded-[4px] border-[var(--dc-border-subtle)] bg-background/40 pl-8 text-xs font-mono placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex h-8 items-center gap-1 rounded-[4px] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] px-1.5">
              <Filter className="size-3 text-muted-foreground/50" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
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
                <SelectTrigger className="h-6 border-none bg-transparent text-[10px] font-mono shadow-none focus:ring-0 p-0 pr-4">
                  <SelectValue placeholder="Urutkan" />
                </SelectTrigger>
                <SelectContent className="border-[var(--dc-border-subtle)] bg-popover text-xs font-mono text-popover-foreground">
                  <SelectItem value="nama">NAMA FIELD OFFICER</SelectItem>
                  <SelectItem value="deadline">DEADLINE ASSIGNMENT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Compact list */}
        {paginatedAssignments.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-white/[0.08] p-12 text-center text-muted-foreground text-xs font-mono">
            Belum ada progres yang cocok dengan kriteria filter.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04] border border-white/[0.08] rounded-[6px] overflow-hidden bg-white/[0.005]">
            {paginatedAssignments.map((assignment) => {
              const name = assignment.assignee?.userProfile?.fullName ?? "Field Officer";
              const position = assignment.assignee?.position?.title ?? "Field Officer";
              const region = assignment.assignee?.position?.organizationUnit?.name ?? "Aceh";
              const isOverdue = isAssignmentOverdue(assignment);
              const latestLog = latestProgressLog(assignment);

              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors gap-4 h-[72px]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="size-8 rounded-full bg-white/[0.04] flex items-center justify-center text-[var(--dc-primary)] font-bold text-xs shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-sans font-bold text-xs text-[var(--dc-text-primary)] truncate">{name}</div>
                      <div className="text-[10px] text-muted-foreground/60 font-mono truncate">{position}</div>
                    </div>
                  </div>

                  <div className="w-[180px] hidden sm:block shrink-0 min-w-0">
                    <div className="text-xs text-[var(--dc-text-primary)] font-medium truncate">{region}</div>
                    <div className="text-[9px] text-muted-foreground/40 font-mono">WILAYAH</div>
                  </div>

                  <div className="w-[120px] shrink-0 text-left">
                    <Badge
                      variant={badgeVariant(assignment.status)}
                      className="font-mono text-[8px] uppercase px-1 rounded-[2px]"
                    >
                      {assignment.status}
                    </Badge>
                    {isOverdue && (
                      <Badge variant="destructive" className="font-mono text-[8px] uppercase px-1 rounded-[2px] ml-1">
                        OVERDUE
                      </Badge>
                    )}
                  </div>

                  <div className="w-[140px] hidden md:block shrink-0 text-left font-mono text-[10px]">
                    <div className="text-muted-foreground/85">{formatDate(assignment.dueDate)}</div>
                    <div className="text-[8px] text-muted-foreground/45 uppercase">LIMIT WAKTU</div>
                  </div>

                  <div className="shrink-0">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-[4px] border-white/10 text-[10px] font-mono hover:bg-white/[0.04] cursor-pointer"
                        >
                          Detail
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border border-[var(--dc-border-subtle)] bg-popover text-[var(--dc-text-primary)]">
                        <DialogHeader>
                          <DialogTitle className="font-sans font-bold text-sm">Progres Tugas Lapangan</DialogTitle>
                          <DialogDescription className="font-mono text-[10px] uppercase text-muted-foreground/60">
                            {name} — {position} ({region})
                          </DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 space-y-4">
                          <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-[6px] space-y-2">
                            <div className="text-[10px] font-mono text-[var(--dc-primary)] uppercase font-semibold">
                              INSTRUKSI PENUGASAN:
                            </div>
                            <p className="text-xs font-sans leading-relaxed text-muted-foreground whitespace-pre-wrap">
                              {normalizeDisplayText(assignment.assignmentNote)}
                            </p>
                          </div>

                          <div className="p-3 bg-white/[0.02] border border-white/[0.08] rounded-[6px] space-y-2">
                            <div className="text-[10px] font-mono text-[var(--dc-success)] uppercase font-semibold">
                              UPDATE TERAKHIR:
                            </div>
                            {latestLog ? (
                              <div className="space-y-1 text-xs">
                                <div className="font-bold text-[var(--dc-text-primary)]">
                                  {latestLog.status}
                                  {typeof latestLog.progressPercent === "number"
                                    ? ` • ${latestLog.progressPercent}%`
                                    : ""}
                                </div>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {normalizeDisplayText(latestLog.note)}
                                </p>
                                <div className="text-[9px] text-muted-foreground/50 font-mono mt-1">
                                  DILAPORKAN PADA: {formatDate(latestLog.createdAt)}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Belum ada log progres dilaporkan.</p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-4 text-xs font-mono p-3 border-t border-white/[0.04]">
                          <div>
                            <span className="text-muted-foreground/50 block text-[9px]">STATUS</span>
                            <Badge
                              variant={badgeVariant(assignment.status)}
                              className="font-mono text-[8px] uppercase px-1 mt-1 rounded-[2px]"
                            >
                              {assignment.status}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground/50 block text-[9px]">JUMLAH LOG</span>
                            <span className="font-bold block mt-1">{assignment.progressLogs?.length ?? 0} LOG</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/50 block text-[9px]">LIMIT WAKTU</span>
                            <span className="text-[var(--dc-warning)] font-bold mt-1 block">
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
                className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
              >
                <ChevronLeft className="size-3 mr-1" /> SEBELUMNYA
              </Button>
              <span className="font-bold text-[var(--dc-text-primary)]">
                HALAMAN {currentPage} DARI {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="h-7 px-2 border-white/10 text-[10px] font-mono hover:bg-white/[0.04]"
              >
                SELANJUTNYA <ChevronRight className="size-3 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

type OimIncomingForwardingListClientProps = {
  sources: OimIncomingForwardingSource[];
  tasks: TaskSummary[];
};

export function OimIncomingForwardingListClient({ sources, tasks }: OimIncomingForwardingListClientProps) {
  const taskByUukVersionId = useMemo(() => {
    return new Map(tasks.filter((task) => task.uukStrVersion?.id).map((task) => [task.uukStrVersion?.id ?? "", task]));
  }, [tasks]);

  return (
    <Card className="border border-border/70">
      <CardHeader>
        <CardTitle>STR Diterima dari Regional</CardTitle>
        <CardDescription>
          OIM menerima STR sesuai cakupan administratifnya, lalu meneruskannya ke Field Coordinator yang berada dalam
          hirarki wilayah di bawahnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor STR</TableHead>
              <TableHead>Judul STR</TableHead>
              <TableHead>Regional Pengirim</TableHead>
              <TableHead>Status STR</TableHead>
              <TableHead>Status Baca / Teruskan</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length ? (
              sources.map((source) => {
                const linkedTask = taskByUukVersionId.get(source.currentVersion.id);

                return (
                  <TableRow key={source.id}>
                    <TableCell className="font-medium">
                      {source.directiveVersion?.directive?.commandNumber ?? "-"}
                    </TableCell>
                    <TableCell>{source.currentVersion.title}</TableCell>
                    <TableCell>{source.ownerUnit?.name ?? "Regional Commander"}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(source.status)}>{uukStatusLabel(source.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={incomingForwardingStatusVariant(linkedTask)}>
                        {incomingForwardingStatusLabel(linkedTask)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        {linkedTask ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/oim/direktif-tugas/${linkedTask.id}`}>Detail</Link>
                          </Button>
                        ) : (
                          <Button asChild size="sm">
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
                  Belum ada STR regional yang masuk ke OIM ini sesuai cakupan administratif.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
        className="w-full flex items-center justify-between p-3.5 cursor-pointer text-left focus:outline-none hover:bg-white/[0.02] transition-colors rounded-[6px]"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[var(--dc-primary)]">
            {icon}
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40 mr-2">
              SECTION {orderNumber.toString().padStart(2, "0")}
            </span>
            <h4 className="font-sans text-xs font-bold uppercase tracking-tight text-[var(--dc-text-primary)] inline-block">
              {title}
            </h4>
          </div>
        </div>
        <div className="flex items-center justify-center size-6 rounded bg-white/[0.04] text-muted-foreground">
          {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.08] p-4 bg-white/[0.01]">
          <div className="space-y-3 font-sans text-sm text-[var(--dc-text-primary)] leading-relaxed">
            {items.map((item) => (
              <div
                key={item.itemCode}
                className="flex gap-2 items-start bg-white/[0.01] border border-white/[0.02] p-2.5 rounded-[4px]"
              >
                {item.itemCode && (
                  <span className="font-mono text-xs text-[var(--dc-primary)] shrink-0 mt-0.5 uppercase">
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
  }, [searchQuery, selectedAreaId, filterSelectedState, sortBy, pageSize]);

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
      } else {
        const areaA = a.areaScopes?.[0]?.area.name || "";
        const areaB = b.areaScopes?.[0]?.area.name || "";
        return areaA.localeCompare(areaB);
      }
    });

    return result;
  }, [eligibleCandidates, searchQuery, selectedAreaId, filterSelectedState, sortBy, selectedAssigneeIds]);

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
    <div className="space-y-6 mx-auto w-full max-w-[1400px] relative pb-16">
      {/* 1. Command Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between border-b border-white/[0.08] pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-xl tracking-tight text-[var(--dc-text-primary)]">
              Baca dan Teruskan STR ke Field Coordinator
            </h1>
            <Badge
              variant="outline"
              className="border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {source.status}
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--dc-warning)]/40 text-[var(--dc-warning)] bg-[var(--dc-warning-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              NORMAL
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {classification}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-mono">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-[6px] text-xs font-mono">
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">HIERARKI</span>
          <div className="text-[var(--dc-text-primary)] font-bold">OIM → FIELD COORDINATOR</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">WILAYAH CAKUPAN</span>
          <div className="text-[var(--dc-text-primary)] font-bold truncate" title={areaSummary}>
            {areaSummary}
          </div>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">TARGET FIELD COORDINATORS</span>
          <div className="text-[var(--dc-text-primary)] font-bold">{eligibleCandidates.length} PERSONEL</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">STATUS DISTRIBUSI</span>
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
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            STR_SOURCE_PREVIEW
          </div>
          <div className="space-y-3">
            {source.currentVersion.sections.map((section, idx) => (
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
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Stepper Checklist / Confirmation Card */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
              CONFIRMATION_CHECKLIST
            </div>

            <div className="border-t border-white/[0.08] pt-3 space-y-3">
              <label htmlFor="oim-read-confirmation-new" className="flex items-start gap-3 leading-5 cursor-pointer">
                <Checkbox
                  id="oim-read-confirmation-new"
                  checked={hasReadSource}
                  onCheckedChange={(checked) => setHasReadSource(Boolean(checked))}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--dc-text-primary)]">Konfirmasi Penerusan STR</span>
                  <p className="text-[10px] text-muted-foreground leading-normal">Saya mengonfirmasi bahwa:</p>
                  <ul className="text-[10px] text-muted-foreground list-disc pl-3 space-y-0.5">
                    <li>OIM tidak mengubah isi STR.</li>
                    <li>Tugas diteruskan hanya ke FC sesuai hirarki komando.</li>
                    <li>Seluruh isi dokumen STR tetap identik.</li>
                  </ul>
                </div>
              </label>
            </div>
          </div>

          {/* Distribution Note Card */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
              DISTRIBUTION_NOTE
            </div>
            <div className="border-t border-white/[0.08] pt-3 space-y-2">
              <div className="text-[10px] text-muted-foreground leading-normal">
                Catatan ini akan otomatis terlampir pada notifikasi tugas operasional di seluruh FC penerima.
              </div>
              <Textarea
                value={assignmentNote}
                disabled={!hasReadSource}
                onChange={(event) => setAssignmentNote(event.target.value)}
                placeholder="Tambahkan instruksi khusus (opsional)..."
                className="w-full min-h-[80px] bg-white/[0.02] border-white/10 text-xs font-sans rounded-[4px] focus:border-[var(--dc-primary)]/50 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Field Coordinator Selection Area */}
        <div className="space-y-3">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            TARGET_FIELD_COORDINATORS
          </div>

          {!hasReadSource ? (
            <div className="rounded-[6px] border border-amber-300/30 bg-amber-500/10 p-4 text-amber-200 text-xs font-mono space-y-2">
              <div className="font-bold flex items-center gap-1.5">
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
              <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md border-b border-border py-3.5 space-y-3">
                <div className="flex flex-col xl:flex-row gap-3 items-center justify-between">
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground/60" />
                      <Input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari nama FC..."
                        className="pl-8 h-9 w-full sm:w-[220px] bg-card border-border text-xs rounded-[4px]"
                      />
                    </div>

                    {/* Filter Kabupaten */}
                    <div className="relative">
                      <select
                        value={selectedAreaId}
                        onChange={(e) => setSelectedAreaId(e.target.value)}
                        className="h-9 px-3 bg-card border border-border rounded-[4px] text-xs focus:outline-none text-foreground font-sans"
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
                        className="h-9 px-3 bg-card border border-border rounded-[4px] text-xs focus:outline-none text-foreground font-sans"
                      >
                        <option value="name">Sort: Nama</option>
                        <option value="area">Sort: Wilayah</option>
                      </select>
                    </div>

                    {/* View Mode Toggle: Card vs Table */}
                    <div className="flex items-center gap-1 bg-secondary border border-border p-1 rounded-[4px]">
                      <button
                        type="button"
                        onClick={() => setViewMode("card")}
                        className={`h-7 px-2.5 rounded-[2px] text-[10px] uppercase font-mono transition-colors ${viewMode === "card" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("table")}
                        className={`h-7 px-2.5 rounded-[2px] text-[10px] uppercase font-mono transition-colors ${viewMode === "table" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:bg-accent"}`}
                      >
                        Table
                      </button>
                    </div>
                  </div>

                  {/* Status filter tabs & counter info */}
                  <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-between xl:justify-end text-xs font-mono">
                    <div className="text-muted-foreground/80">
                      DIPILIH: <span className="text-primary font-bold">{selectedAssigneeIds.length} FC</span> /{" "}
                      {eligibleCandidates.length}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterSelectedState("all")}
                        className={`px-3 py-1.5 rounded-[4px] border text-xs ${filterSelectedState === "all" ? "bg-primary border-primary text-primary-foreground font-bold" : "bg-transparent border-border text-muted-foreground hover:bg-accent"} transition-colors`}
                      >
                        Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterSelectedState("selected")}
                        className={`px-3 py-1.5 rounded-[4px] border text-xs ${filterSelectedState === "selected" ? "bg-primary border-primary text-primary-foreground font-bold" : "bg-transparent border-border text-muted-foreground hover:bg-accent"} transition-colors`}
                      >
                        Terpilih
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterSelectedState("unselected")}
                        className={`px-3 py-1.5 rounded-[4px] border text-xs ${filterSelectedState === "unselected" ? "bg-primary border-primary text-primary-foreground" : "bg-transparent border-border text-muted-foreground hover:bg-accent"} transition-colors`}
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
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full">
                      {paginatedCandidates.map((candidate) => {
                        const checked = selectedAssigneeIds.includes(candidate.id);
                        const initials = candidate.userProfile?.fullName?.slice(0, 2).toUpperCase() || "FC";

                        return (
                          <label
                            key={candidate.id}
                            className={`flex flex-col justify-between rounded-[6px] border p-3.5 h-[110px] transition-all duration-200 cursor-pointer ${
                              checked
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border bg-card hover:bg-accent"
                            }`}
                          >
                            <div className="flex gap-3 items-start min-w-0">
                              <div className="flex size-10 items-center justify-center rounded bg-secondary border border-border text-muted-foreground shrink-0 font-mono text-sm font-bold text-primary">
                                {initials}
                              </div>
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="font-bold text-sm text-foreground truncate">
                                  {candidate.userProfile?.fullName || candidate.position?.title || "Field Coordinator"}
                                </div>
                                <div className="text-muted-foreground/60 text-[11px] font-mono uppercase truncate">
                                  {candidate.position?.title || "-"}
                                </div>
                                <div className="text-muted-foreground/50 text-[10px] font-mono uppercase truncate">
                                  WILAYAH: {candidate.areaScopes?.[0]?.area.name || "-"}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
                              <span className="text-muted-foreground/50 text-[10px] font-mono uppercase">
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
                                  className="size-4 accent-primary rounded-[2px] border-border bg-card cursor-pointer"
                                />
                                <span
                                  className={`text-[10px] font-mono uppercase ${checked ? "text-primary font-bold" : "text-muted-foreground/60"}`}
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
                    <div className="rounded-[6px] border border-border bg-card overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-secondary/30 text-muted-foreground uppercase text-[10px] tracking-wider">
                            <th className="p-3 w-[50px] text-center">Check</th>
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
                                className={`border-b border-border hover:bg-accent/40 cursor-pointer transition-colors ${checked ? "bg-primary/5 text-foreground" : "text-muted-foreground"}`}
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
                                    className="size-4 accent-primary rounded-[2px] border-border bg-card cursor-pointer"
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
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-secondary/40 border border-border p-3 rounded-[6px] text-xs font-mono mt-4">
                    <div className="text-muted-foreground">
                      Showing{" "}
                      <span className="text-foreground font-bold">{totalCandidatesCount > 0 ? startIndex + 1 : 0}</span>
                      –<span className="text-foreground font-bold">{endIndex}</span> of{" "}
                      <span className="text-foreground font-bold">{totalCandidatesCount}</span> Field Coordinator
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Page size select */}
                      <div className="relative">
                        <select
                          value={pageSize}
                          onChange={(e) => setPageSize(Number(e.target.value))}
                          className="h-8 px-2.5 bg-card border border-border rounded-[4px] text-xs focus:outline-none text-foreground font-sans"
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
                            className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-muted-foreground hover:text-[var(--dc-text-primary)] transition disabled:opacity-40 disabled:hover:bg-white/[0.04]"
                          >
                            Previous
                          </button>
                          {Array.from({ length: totalPages }).map((_, idx) => {
                            const pageNum = idx + 1;
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`px-3 py-1.5 rounded border transition ${
                                  currentPage === pageNum
                                    ? "bg-[var(--dc-primary)] border-[var(--dc-primary)] text-[var(--dc-text-inverse)] font-bold"
                                    : "bg-white/[0.04] border-white/10 text-muted-foreground hover:text-[var(--dc-text-primary)] hover:bg-white/[0.08]"
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
                            className="px-3 py-1.5 rounded bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-muted-foreground hover:text-[var(--dc-text-primary)] transition disabled:opacity-40 disabled:hover:bg-white/[0.04]"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground text-xs italic p-8 border border-dashed border-white/5 rounded-[6px] text-center font-mono">
                  Tidak ada Field Coordinator yang cocok dengan pencarian / filter.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 -mx-6 flex w-full flex-wrap items-center justify-between gap-4 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-6 py-4 backdrop-blur-md sm:mx-0">
        <div className="text-xs font-mono text-muted-foreground">
          DIPILIH:{" "}
          <span className="text-[var(--dc-primary)] font-bold">
            {selectedAssigneeIds.length} Field Coordinator dipilih
          </span>
          {assignmentNote.trim() && <span className="text-muted-foreground/60 ml-2">(Catatan terlampir)</span>}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/dashboard/oim/direktif-tugas")}
            className="h-9 px-4 rounded-[4px] font-mono text-xs cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleForward}
            disabled={!hasReadSource || !selectedAssigneeIds.length || !eligibleCandidates.length || isSubmitting}
            className="h-9 px-6 bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)] rounded-[4px] font-mono text-xs cursor-pointer shadow-none"
          >
            {isSubmitting ? "Meneruskan..." : "Teruskan STR"}
          </Button>
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
            <span>Deadline Task</span>
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

function SummaryMetric({
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
    <div className="flex flex-col justify-between rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 h-24 min-w-[120px] flex-1">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">{label}</div>
      <div className={`mt-1 font-sans text-sm font-semibold truncate ${colorClass}`}>{value}</div>
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
        className="w-full flex items-center justify-between p-3.5 cursor-pointer text-left focus:outline-none hover:bg-white/[0.02] transition-colors rounded-[6px]"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[var(--dc-primary)]">
            {icon}
          </div>
          <div>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/40 mr-2">
              SECTION {orderNumber.toString().padStart(2, "0")}
            </span>
            <h4 className="font-sans text-xs font-bold uppercase tracking-tight text-[var(--dc-text-primary)] inline-block">
              {title}
            </h4>
          </div>
        </div>
        <div className="flex items-center justify-center size-6 rounded bg-white/[0.04] text-muted-foreground">
          {isOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.08] p-4 bg-white/[0.01]">
          {items ? (
            <div className="space-y-3 font-sans text-sm text-[var(--dc-text-primary)] leading-relaxed">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-2 items-start bg-white/[0.01] border border-white/[0.02] p-2.5 rounded-[4px]"
                >
                  {item.itemCode && (
                    <span className="font-mono text-xs text-[var(--dc-primary)] shrink-0 mt-0.5 uppercase">
                      [{item.itemCode}]
                    </span>
                  )}
                  <span className="whitespace-pre-wrap">{normalizeDisplayText(item.content)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--dc-text-primary)] leading-relaxed font-sans whitespace-pre-wrap">
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
    { key: "created", label: "Created", desc: "Dokumen STR diterbitkan di pusat" },
    { key: "forwarded", label: "Forwarded", desc: "STR diteruskan ke regional komando" },
    { key: "assigned", label: "Assigned", desc: "Tugas dibagikan ke Field Coordinator" },
    { key: "accepted", label: "Accepted", desc: "Petugas lapangan menerima penugasan" },
    { key: "completed", label: "Completed", desc: "Seluruh target operasi diselesaikan" },
  ];

  let activeIndex = 0;
  if (status === "PUBLISHED" || status === "DISTRIBUTED") activeIndex = 1;
  if (hasAssignments) activeIndex = 2;
  if (hasAssignments && status === "RUNNING") activeIndex = 3;
  if (status === "COMPLETED") activeIndex = 4;

  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">OPERATIONAL_TIMELINE</div>
      <div className="border-t border-white/[0.08] pt-3 relative pl-6 space-y-4">
        <div className="absolute left-[9px] top-4 bottom-4 w-0.5 bg-white/10" />

        {stages.map((stage, idx) => {
          const isActive = idx <= activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={stage.key} className="relative flex gap-3 text-xs">
              <div
                className={`absolute -left-[20px] top-1 size-3 rounded-full border-2 ${isCurrent ? "bg-[var(--dc-primary)] border-[var(--dc-primary)] shadow-[0_0_8px_var(--dc-primary)]" : isActive ? "bg-[var(--dc-success)] border-[var(--dc-success)]" : "bg-muted border-muted"} transition-all duration-300 z-10`}
              />

              <div className="flex-1 space-y-0.5">
                <div
                  className={`font-semibold ${isCurrent ? "text-[var(--dc-primary)] font-bold" : isActive ? "text-[var(--dc-success)]" : "text-muted-foreground/60"}`}
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
    <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">COMMAND_CHAIN_FLOW</div>
      <div className="border-t border-white/[0.08] pt-3 flex flex-col items-center gap-1 text-center font-mono">
        {steps.map((step, idx) => (
          <div key={idx} className="w-full flex flex-col items-center">
            <div className="w-full bg-white/[0.02] border border-white/[0.04] rounded-[4px] p-2 hover:bg-white/[0.04] transition-colors">
              <div className="text-xs font-bold text-[var(--dc-primary)]">{step.label}</div>
              <div className="text-[9px] text-muted-foreground/50 mt-0.5">{step.desc}</div>
            </div>
            {idx < steps.length - 1 && <ArrowDown className="size-3 text-muted-foreground/40 my-0.5 animate-pulse" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MissionStatusPanel({ status, progressPercentage }: { status: string; progressPercentage: number }) {
  return (
    <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">MISSION_STATUS</div>
      <div className="border-t border-white/[0.08] pt-3 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground/60">OPERATIONAL STATE</span>
          <Badge
            variant="outline"
            className={`font-mono text-[10px] tracking-wider rounded-[4px] px-2 py-0.5 uppercase ${badgeVariant(status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-white/10 text-muted-foreground bg-white/[0.02]"}`}
          >
            {status}
          </Badge>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
            <span>TARGET_RESOLUTION</span>
            <span className="text-[var(--dc-success)] font-bold">{progressPercentage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
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
    <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">SYSTEM_ACTIVITY_LOG</div>
      <div className="border-t border-white/[0.08] pt-3 space-y-3">
        {activities.map((act, idx) => (
          <div key={idx} className="flex gap-3 text-xs">
            <div className="text-muted-foreground/40 font-mono text-[10px] w-28 shrink-0">{act.time}</div>
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
  const showStructuredUuk = hasStructuredUukSections(task);
  const classification = taskClassificationLabel(task);
  const areaSummary = task.targetAreas.map((t) => t.area.name).join(", ") ?? "-";
  const completedAssignments = task.assignments.filter((a) => a.status === "COMPLETED").length;
  const progressPercentage = task.assignments.length
    ? Math.round((completedAssignments / task.assignments.length) * 100)
    : 0;

  return (
    <div className="space-y-6 mx-auto w-full max-w-[1280px]">
      {/* 1. Command Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between border-b border-white/[0.08] pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-xl tracking-tight text-[var(--dc-text-primary)]">{task.title}</h1>
            <Badge
              variant="outline"
              className="border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {task.status}
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--dc-warning)]/40 text-[var(--dc-warning)] bg-[var(--dc-warning-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {task.priority || "MEDIUM"}
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {classification || "RAHASIA"}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground font-mono">
            <div className="flex items-center gap-1">
              <MapIcon className="size-3 text-muted-foreground/60" />
              <span>
                WILAYAH: <span className="text-[var(--dc-text-primary)]">{areaSummary || "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground/60" />
              <span>
                DEADLINE:{" "}
                <span className="text-[var(--dc-text-primary)]">{task.dueDate ? formatDate(task.dueDate) : "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className="size-3 text-muted-foreground/60" />
              <span>
                PROGRESS: <span className="text-[var(--dc-text-primary)]">{progressPercentage}%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {editHref ? (
            <Button asChild variant="outline" className="h-8 rounded-[4px] font-mono text-xs cursor-pointer">
              <Link href={editHref}>Edit Draft</Link>
            </Button>
          ) : null}
          {assignmentHref ? (
            <Button
              asChild
              className="h-8 bg-[var(--dc-primary)] text-[var(--dc-text-inverse)] hover:bg-[var(--dc-primary-hover)] rounded-[4px] font-mono text-xs cursor-pointer shadow-none"
            >
              <Link href={assignmentHref}>Kelola Penugasan</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* 2-Column Responsive Layout */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Left Column (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3. Mission Context Panel */}
          <div className="rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-4 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                MISSION_CONTEXT
              </span>
            </div>
            <div className="border-t border-white/[0.08] pt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Owner</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">
                  {task.ownerUnit?.name || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Regional</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">
                  {(task.directiveVersion?.directive as any)?.ownerUnit?.name || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Level</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">{task.priority || "MEDIUM"}</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Classification</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">
                  {classification || "RAHASIA"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Directive Source</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">
                  {task.directiveVersion?.directive?.commandNumber || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Hierarchy</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">OIM → FC</div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Area Scope</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate" title={areaSummary}>
                  {areaSummary || "-"}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground/60 text-[9px] uppercase">Last Update</div>
                <div className="text-[var(--dc-text-primary)] font-semibold truncate">
                  {(task as any).updatedAt ? formatDate((task as any).updatedAt) : formatDate((task as any).createdAt)}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Accordion Content (Progressive Disclosure) */}
          <div className="space-y-3">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
              OPERATIONAL_DIRECTIVE_BODY
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
        <div className="lg:col-span-4 space-y-6">
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
      const message = error instanceof Error ? error.message : "Gagal memproses penugasan.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
        <CardDescription>{task.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-xl border border-border/70 p-4 md:grid-cols-[1fr_180px_1fr_auto]"
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
            <Input
              value={row.assignmentNote}
              onChange={(event) =>
                setRows((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, assignmentNote: event.target.value } : item,
                  ),
                )
              }
              placeholder="Catatan penugasan"
            />
            <Button
              type="button"
              variant="outline"
              disabled={rows.length === 1 || mode === "reassign"}
              onClick={() => setRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
            >
              Hapus
            </Button>
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
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Memproses..." : submitLabel}
        </Button>
      </CardFooter>
    </Card>
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
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
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
    <div className="space-y-6">
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
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
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
          <Button variant="secondary" onClick={() => runAction("complete")} disabled={action !== null}>
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
