// biome-ignore-all lint/nursery/useSortedClasses: Preserves selected finalkalife UI class composition.
// biome-ignore-all lint/style/noNestedTernary: Keeps existing conditional UI branches readable in-place.

"use client";

import { memo, type UIEvent, useCallback, useEffect, useMemo, useState } from "react";

import {
  Background,
  BackgroundVariant,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  type LucideIcon,
  RadioTower,
  Search,
  Shield,
  UserRound,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type {
  DirectiveDetail,
  DirectiveTracking,
  DirectiveTrackingAssignment,
  DirectiveTrackingTask,
} from "@/features/directives/types";
import { cn } from "@/lib/utils";

import { formatDate, getCurrentVersion } from "./directive-shared";

type PipelineStageId = "executive" | "regional" | "oim" | "coordinator" | "officer";
type PipelineStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING" | "REJECTED";
type CommandBranch = "DIRECTORATE" | "BINDA" | "PUSAT" | "OTHER";

type PipelineDetail = {
  label: string;
  value: string;
};

type PipelineItem = {
  id: string;
  parentId?: string | null;
  branch?: CommandBranch;
  positionCode?: string | null;
  roleCode?: string | null;
  name: string;
  status: PipelineStatus;
  statusLabel: string;
  readAt?: string | null;
  acknowledgedAt?: string | null;
  forwardedAt?: string | null;
  officer?: string | null;
  groupName: string;
  details: PipelineDetail[];
};

type PipelineNodeData = Record<string, unknown> & {
  label: string;
  subtitle: string;
  status: PipelineStatus;
  progressPercent: number;
  progressText: string;
  icon: LucideIcon;
  onClick: () => void;
  animationClass?: string;
};

type PipelineReactFlowNode = Node<PipelineNodeData, "pipeline">;

type LaneNodeData = Record<string, unknown> & {
  branch: "BINDA" | "DIRECTORATE";
  label: string;
};

type LaneReactFlowNode = Node<LaneNodeData, "lane">;
type TrackingReactFlowNode = PipelineReactFlowNode | LaneReactFlowNode;

const statusColors = {
  COMPLETED: {
    border: "border-emerald-500/40 dark:border-emerald-500/30 hover:border-emerald-500 dark:hover:border-emerald-400",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/10",
    text: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    progressBg: "bg-emerald-500 dark:bg-emerald-400",
    statusText: "Selesai",
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    edgeColor: "#10B981",
  },
  IN_PROGRESS: {
    border: "border-amber-500/40 dark:border-amber-500/30 hover:border-amber-500 dark:hover:border-amber-400",
    bg: "bg-amber-50/50 dark:bg-amber-950/10",
    text: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
    progressBg: "bg-amber-500 dark:bg-amber-400",
    statusText: "Sebagian diproses",
    iconBg: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    edgeColor: "#F59E0B",
  },
  PENDING: {
    border: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700",
    bg: "bg-slate-50/50 dark:bg-slate-900/40",
    text: "text-slate-500 dark:text-slate-400",
    badgeBg: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
    progressBg: "bg-slate-200 dark:bg-slate-800",
    statusText: "Belum diproses",
    iconBg: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400",
    edgeColor: "#64748B",
  },
  REJECTED: {
    border: "border-red-500/40 dark:border-red-500/30 hover:border-red-500 dark:hover:border-red-400",
    bg: "bg-red-50/50 dark:bg-red-950/10",
    text: "text-red-600 dark:text-red-400",
    badgeBg: "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400",
    progressBg: "bg-red-500 dark:bg-red-400",
    statusText: "Ditolak",
    iconBg: "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400",
    edgeColor: "#EF4444",
  },
} satisfies Record<
  PipelineStatus,
  {
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    progressBg: string;
    statusText: string;
    iconBg: string;
    edgeColor: string;
  }
>;

const FAILURE_STATUSES = new Set(["FAILED", "CANCELLED", "REJECTED"]);
const COMPLETED_STATUSES = new Set(["COMPLETED", "DISTRIBUTED"]);
const ACTIVE_STATUSES = new Set(["READ", "ACKNOWLEDGED", "IN_PROGRESS", "REASSIGNED"]);
const CLOSED_TRACKING_STATUSES = new Set(["COMPLETED", "CANCELLED", "REASSIGNED"]);
const MODAL_BATCH_SIZE = 12;

function PipelineNodeCard({ data }: NodeProps<PipelineReactFlowNode>) {
  const { label, subtitle, status, progressPercent, progressText, icon: Icon, onClick, animationClass } = data;
  const style = statusColors[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-[104px] w-[220px] cursor-pointer select-none flex-col justify-between rounded-lg border bg-[var(--dc-card)] p-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.06)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(0,0,0,0.12)] active:scale-[0.98]",
        style.border,
        style.bg,
        animationClass,
      )}
    >
      <Handle type="target" position={Position.Left} className="!size-0 !opacity-0" />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className={cn("grid size-8 place-items-center rounded-lg border", style.iconBg)}>
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h4 className="w-[130px] truncate text-[11px] font-bold uppercase leading-tight tracking-wider text-foreground">
              {label}
            </h4>
            <p className="w-[130px] truncate text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {status === "COMPLETED" && (
          <span className="flex size-[18px] items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/15 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3" />
          </span>
        )}
      </div>

      <div className="mt-2.5 space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={cn("h-full rounded-full transition-all duration-500", style.progressBg)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between font-mono text-[9px] font-semibold">
          <span className={style.text}>{style.statusText}</span>
          <span className="max-w-[112px] truncate text-muted-foreground">{progressText}</span>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!size-0 !opacity-0" />
    </button>
  );
}

const MemoPipelineNodeCard = memo(PipelineNodeCard);

function LaneBackdrop(_: NodeProps<LaneReactFlowNode>) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none h-full w-full rounded-xl border border-border/60 bg-muted/10"
    />
  );
}

const MemoLaneBackdrop = memo(LaneBackdrop);
const NODE_TYPES = { pipeline: MemoPipelineNodeCard, lane: MemoLaneBackdrop };

function normalizeStatus(status?: string | null) {
  return status?.trim().toUpperCase() ?? "";
}

function cleanRegionName(name?: string | null) {
  const cleaned = name?.replace(/^(binda|direktorat wilayah|field coordination unit)\s+/i, "").trim();

  return cleaned || "Wilayah lainnya";
}

function normalizeBranch(
  branch?: string | null,
  positionCode?: string | null,
  unitType?: string | null,
): CommandBranch {
  const code = positionCode?.trim().toUpperCase();
  if (["DIREKTUR_WILAYAH", "KASUBDIT", "STAF_SUBDIT"].includes(code ?? "")) {
    return "DIRECTORATE";
  }

  if (code === "KABINDA" || code === "KABAGOPS" || code === "KORWIL") {
    return "BINDA";
  }

  const rawBranch = branch?.trim().toUpperCase();
  if (rawBranch === "DIRECTORATE" || rawBranch === "BINDA" || rawBranch === "PUSAT") {
    return rawBranch;
  }

  const type = unitType?.trim().toUpperCase();
  if (type === "DIRECTORATE" || type === "SUBDIRECTORATE") {
    return "DIRECTORATE";
  }

  if (type === "BINDA" || type === "BAGOPS") {
    return "BINDA";
  }

  return "OTHER";
}

function branchLabel(branch?: CommandBranch) {
  if (branch === "DIRECTORATE") return "Cabang Direktorat Wilayah";
  if (branch === "BINDA") return "Cabang BINDA";
  if (branch === "PUSAT") return "Pusat Komando";
  return "Cabang Lainnya";
}

function branchSubtitle(branch?: CommandBranch) {
  if (branch === "DIRECTORATE") return "Direktur Wilayah -> Kasubdit -> Petugas Organik";
  if (branch === "BINDA") return "Kabinda -> Kabagops -> Korwil/Petugas";
  if (branch === "PUSAT") return "Kendali pusat";
  return "Jalur distribusi lainnya";
}

function statusLabel(status: PipelineStatus) {
  return statusColors[status].statusText;
}

function detailValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function resolveTimeliness({
  dueDate,
  completedAt,
  fallbackCompletedAt,
  status,
}: {
  dueDate?: string | null;
  completedAt?: string | null;
  fallbackCompletedAt?: string | null;
  status?: string | null;
}) {
  if (!dueDate) return "Tidak ada batas waktu";

  const dueTime = new Date(dueDate).getTime();
  const finishAt = completedAt ?? fallbackCompletedAt;
  if (finishAt) {
    return new Date(finishAt).getTime() <= dueTime ? "Tepat waktu" : "Terlambat";
  }

  const normalizedStatus = normalizeStatus(status);
  if (!CLOSED_TRACKING_STATUSES.has(normalizedStatus) && Date.now() > dueTime) {
    return "Terlambat berjalan";
  }

  return "Masih dalam batas waktu";
}

function itemSearchText(item: PipelineItem) {
  return [
    item.name,
    item.officer,
    item.groupName,
    item.statusLabel,
    item.positionCode,
    item.roleCode,
    ...item.details.flatMap((detail) => [detail.label, detail.value]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function areaScopeNames(assignment?: DirectiveTrackingAssignment | null) {
  const names = assignment?.assignee?.areaScopes.map((scope) => scope.name).filter(Boolean) ?? [];

  return names.length > 0 ? names.join(", ") : "-";
}

function primaryAreaName(
  assignment?: DirectiveTrackingAssignment | null,
  task?: DirectiveTrackingTask | null,
  fallback?: string,
) {
  const assignmentArea =
    assignment?.assignee?.areaScopes.find((scope) => scope.isPrimary) ?? assignment?.assignee?.areaScopes[0];
  const taskArea = task?.targetAreas.find((target) => target.isPrimary) ?? task?.targetAreas[0];

  return assignmentArea?.name || taskArea?.area.name || fallback || "Wilayah lainnya";
}

function deduplicateItems(items: PipelineItem[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function resolveItemState({
  failed,
  completed,
  inProgress,
  completedLabel = "Sudah selesai",
  inProgressLabel = "Sebagian diproses",
  pendingLabel = "Belum diproses",
}: {
  failed: boolean;
  completed: boolean;
  inProgress: boolean;
  completedLabel?: string;
  inProgressLabel?: string;
  pendingLabel?: string;
}): Pick<PipelineItem, "status" | "statusLabel"> {
  if (failed) return { status: "REJECTED", statusLabel: "Ditolak" };
  if (completed) return { status: "COMPLETED", statusLabel: completedLabel };
  if (inProgress) return { status: "IN_PROGRESS", statusLabel: inProgressLabel };
  return { status: "PENDING", statusLabel: pendingLabel };
}

function assignmentStatus(
  assignment: DirectiveTrackingAssignment,
  completedWhenDistributed = false,
): Pick<PipelineItem, "status" | "statusLabel"> {
  const status = normalizeStatus(assignment.status);

  if (FAILURE_STATUSES.has(status)) {
    return { status: "REJECTED", statusLabel: "Ditolak" };
  }

  if (
    COMPLETED_STATUSES.has(status) ||
    (completedWhenDistributed && (assignment.downstreamAssignments?.length || 0) > 0)
  ) {
    return { status: "COMPLETED", statusLabel: "Sudah selesai" };
  }

  if (ACTIVE_STATUSES.has(status) || assignment.readAt || assignment.acknowledgedAt || assignment.startedAt) {
    return { status: "IN_PROGRESS", statusLabel: "Sebagian diproses" };
  }

  return { status: "PENDING", statusLabel: "Belum diproses" };
}

function summarizeStage(items: PipelineItem[]) {
  const total = items.length;
  const completed = items.filter((item) => item.status === "COMPLETED").length;
  const inProgress = items.filter((item) => item.status === "IN_PROGRESS").length;
  const rejected = items.filter((item) => item.status === "REJECTED").length;

  let status: PipelineStatus = "PENDING";
  if (total > 0 && completed === total) status = "COMPLETED";
  else if (rejected > 0 && completed === 0 && inProgress === 0) status = "REJECTED";
  else if (completed > 0 || inProgress > 0 || rejected > 0) status = "IN_PROGRESS";

  return {
    status,
    progress: total > 0 ? Math.round(((completed + inProgress * 0.5) / total) * 100) : 0,
    text: `${total} penerima`,
  };
}

function itemProgress(status: PipelineStatus) {
  if (status === "COMPLETED") return 100;
  if (status === "IN_PROGRESS") return 50;
  return 0;
}

type TrackingFlowCanvasProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
  variant?: "compact" | "full";
};

function TrackingFlowCanvas({ directive, tracking, variant = "full" }: TrackingFlowCanvasProps) {
  const [activeStage, setActiveStage] = useState<PipelineStageId | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [activeBranch, setActiveBranch] = useState<CommandBranch | null>(null);
  const [modalSearch, setModalSearch] = useState("");
  const [visibleItemCount, setVisibleItemCount] = useState(MODAL_BATCH_SIZE);
  const [isThemeMounted, setIsThemeMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const { fitView } = useReactFlow();
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  useEffect(() => setIsThemeMounted(true), []);

  const currentVersion = getCurrentVersion(directive);
  const uukTitle = currentVersion?.strategicIssue || "STR / Direktif Strategis";
  const directiveDueDate = currentVersion?.dueDate;

  const legacyHierarchyData = useMemo(() => {
    const branchList: PipelineItem[] = [];
    const regionalList: PipelineItem[] = [];
    const oimList: PipelineItem[] = [];
    const coordinatorList: PipelineItem[] = [];
    const officerList: PipelineItem[] = [];

    for (const chain of tracking.regionalChains) {
      const recipient = chain.regionalRecipient;
      const regionName = cleanRegionName(
        recipient.targetUnit?.name || recipient.targetPosition?.organizationUnit?.name,
      );
      const branch = normalizeBranch(
        recipient.targetPosition?.branch ||
          recipient.targetUnit?.branch ||
          recipient.targetPosition?.organizationUnit?.branch,
        recipient.targetPosition?.code,
        recipient.targetUnit?.type || recipient.targetPosition?.organizationUnit?.type,
      );
      const recipientStatus = normalizeStatus(recipient.status);
      const regionalForwardedAt = chain.forwarding?.createdAt;
      const regionalState = resolveItemState({
        failed: FAILURE_STATUSES.has(recipientStatus),
        completed: Boolean(chain.forwarding),
        inProgress: Boolean(recipient.readAt || recipient.acknowledgedAt || ACTIVE_STATUSES.has(recipientStatus)),
        completedLabel: "Sudah meneruskan",
        inProgressLabel: "Sudah membaca",
        pendingLabel: "Belum membaca",
      });

      regionalList.push({
        id: recipient.id,
        parentId: `branch-${branch}`,
        branch,
        positionCode: recipient.targetPosition?.code,
        roleCode: recipient.targetPosition?.role?.code,
        name:
          recipient.targetPosition?.assigneeName ||
          recipient.targetPosition?.title ||
          recipient.targetUnit?.name ||
          "Regional Commander",
        ...regionalState,
        readAt: recipient.readAt,
        acknowledgedAt: recipient.acknowledgedAt,
        forwardedAt: regionalForwardedAt,
        officer: recipient.targetUnit?.name || recipient.targetPosition?.organizationUnit?.name,
        groupName: regionName,
        details: [
          { label: "Nama penerima", value: detailValue(recipient.targetPosition?.assigneeName) },
          { label: "Username", value: detailValue(recipient.targetPosition?.assigneeUsername) },
          { label: "Jabatan", value: detailValue(recipient.targetPosition?.title) },
          { label: "Kode jabatan", value: detailValue(recipient.targetPosition?.code) },
          { label: "Cabang komando", value: branchLabel(branch) },
          { label: "Seat code", value: detailValue(recipient.targetPosition?.seatCode) },
          {
            label: "Unit organisasi",
            value: detailValue(recipient.targetUnit?.name || recipient.targetPosition?.organizationUnit?.name),
          },
          { label: "Wilayah", value: regionName },
          { label: "Status penerima", value: detailValue(recipient.status) },
          { label: "Status ringkas", value: regionalState.statusLabel },
          { label: "Dikirim", value: formatDate(recipient.sentAt) },
          { label: "Terkirim", value: formatDate(recipient.deliveredAt) },
          { label: "Dibaca", value: formatDate(recipient.readAt) },
          { label: "Diakui", value: formatDate(recipient.acknowledgedAt) },
          { label: "Diteruskan", value: formatDate(regionalForwardedAt) },
          { label: "Batas waktu", value: formatDate(directiveDueDate) },
          {
            label: "Ketepatan waktu",
            value: resolveTimeliness({
              dueDate: directiveDueDate,
              completedAt: regionalForwardedAt,
              status: recipient.status,
            }),
          },
        ],
      });

      if (chain.forwarding || chain.oimStage.taskCount > 0) {
        const forwardingStatus = normalizeStatus(chain.forwarding?.status);
        const oimState = resolveItemState({
          failed: FAILURE_STATUSES.has(forwardingStatus),
          completed: chain.oimStage.hasForwardedToFieldCoordinator,
          inProgress: chain.oimStage.hasRead || chain.oimStage.taskCount > 0,
          completedLabel: "Sudah meneruskan",
          inProgressLabel: "Sudah membaca",
          pendingLabel: "Belum membaca",
        });

        const taskActors = Array.from(
          new Map(
            (chain.oimTasks ?? [])
              .map((task) => task.createdBy)
              .filter((actor): actor is NonNullable<DirectiveTrackingTask["createdBy"]> => Boolean(actor))
              .map((actor) => [
                actor.assignmentId ||
                  `${actor.fullName || "OIM"}:${actor.positionTitle || actor.organizationUnitName || regionName}`,
                actor,
              ]),
          ).values(),
        );
        const oimActors = taskActors.length > 0 ? taskActors : [chain.forwarding?.createdBy];

        for (const actor of oimActors) {
          const actorBranch = normalizeBranch(
            actor?.branch || branch,
            actor?.positionCode,
            actor?.organizationUnitType,
          );

          oimList.push({
            id: actor?.assignmentId || chain.forwarding?.id || `oim:${recipient.id}`,
            parentId: recipient.id,
            branch: actorBranch,
            positionCode: actor?.positionCode,
            roleCode: actor?.roleCode,
            name:
              actor?.fullName ||
              actor?.positionTitle ||
              actor?.organizationUnitName ||
              chain.forwarding?.ownerUnit?.name ||
              `OIM ${regionName}`,
            ...oimState,
            forwardedAt: chain.forwarding?.updatedAt || chain.forwarding?.createdAt,
            officer: actor?.positionTitle || actor?.organizationUnitName,
            groupName: regionName,
            details: [
              { label: "Nama OIM", value: detailValue(actor?.fullName) },
              { label: "Jabatan", value: detailValue(actor?.positionTitle) },
              { label: "Kode jabatan", value: detailValue(actor?.positionCode) },
              { label: "Cabang komando", value: branchLabel(actorBranch) },
              {
                label: "Unit organisasi",
                value: detailValue(actor?.organizationUnitName || chain.forwarding?.ownerUnit?.name),
              },
              { label: "Wilayah", value: regionName },
              { label: "Status forwarding", value: detailValue(chain.forwarding?.status) },
              { label: "Status ringkas", value: oimState.statusLabel },
              { label: "Jumlah tugas OIM", value: detailValue(chain.oimStage.taskCount) },
              { label: "Jumlah Field Coordinator", value: detailValue(chain.oimStage.fieldCoordinatorAssignmentCount) },
              { label: "Sudah dibaca", value: chain.oimStage.hasRead ? "Ya" : "Belum" },
              {
                label: "Sudah diteruskan ke FC",
                value: chain.oimStage.hasForwardedToFieldCoordinator ? "Ya" : "Belum",
              },
              { label: "Dibuat", value: formatDate(chain.forwarding?.createdAt) },
              { label: "Update terakhir", value: formatDate(chain.forwarding?.updatedAt) },
            ],
          });
        }
      }

      for (const task of chain.oimTasks ?? []) {
        for (const coordinator of task.fieldCoordinatorAssignments ?? []) {
          const coordinatorState = assignmentStatus(coordinator, true);
          const coordinatorArea = primaryAreaName(coordinator, task, regionName);
          const coordinatorBranch = normalizeBranch(
            coordinator.assignee?.branch || branch,
            coordinator.assignee?.positionCode,
            coordinator.assignee?.organizationUnitType,
          );

          coordinatorList.push({
            id: coordinator.id,
            parentId:
              coordinator.assigner?.assignmentId ||
              task.createdBy?.assignmentId ||
              chain.forwarding?.createdBy?.assignmentId ||
              chain.forwarding?.id ||
              recipient.id,
            branch: coordinatorBranch,
            positionCode: coordinator.assignee?.positionCode,
            roleCode: coordinator.assignee?.roleCode,
            name:
              coordinator.assignee?.fullName ||
              coordinator.assignee?.positionTitle ||
              coordinator.assignee?.organizationUnitName ||
              "Field Coordinator",
            ...coordinatorState,
            readAt: coordinator.readAt,
            acknowledgedAt: coordinator.acknowledgedAt,
            forwardedAt: coordinator.completedAt,
            officer: coordinator.assignee?.positionTitle || coordinator.assignee?.organizationUnitName,
            groupName: coordinatorArea,
            details: [
              { label: "Nama", value: detailValue(coordinator.assignee?.fullName) },
              { label: "Username", value: detailValue(coordinator.assignee?.username) },
              { label: "Jabatan", value: detailValue(coordinator.assignee?.positionTitle) },
              { label: "Kode jabatan", value: detailValue(coordinator.assignee?.positionCode) },
              { label: "Role", value: detailValue(coordinator.assignee?.roleCode) },
              { label: "Cabang komando", value: branchLabel(coordinatorBranch) },
              { label: "Unit organisasi", value: detailValue(coordinator.assignee?.organizationUnitName) },
              { label: "Wilayah tugas", value: areaScopeNames(coordinator) },
              { label: "Wilayah utama", value: coordinatorArea },
              { label: "Status assignment", value: detailValue(coordinator.status) },
              { label: "Status ringkas", value: coordinatorState.statusLabel },
              { label: "Jumlah Field Officer", value: detailValue(coordinator.downstreamAssignments?.length ?? 0) },
              { label: "Ditugaskan", value: formatDate(coordinator.assignedAt) },
              { label: "Dibaca", value: formatDate(coordinator.readAt) },
              { label: "Diakui", value: formatDate(coordinator.acknowledgedAt) },
              { label: "Mulai", value: formatDate(coordinator.startedAt) },
              { label: "Selesai", value: formatDate(coordinator.completedAt) },
              { label: "Tenggat", value: formatDate(coordinator.dueDate) },
              {
                label: "Ketepatan waktu",
                value: resolveTimeliness({
                  dueDate: coordinator.dueDate || task.dueDate,
                  completedAt: coordinator.completedAt,
                  status: coordinator.status,
                }),
              },
              { label: "Catatan assignment", value: detailValue(coordinator.assignmentNote) },
            ],
          });

          for (const officer of coordinator.downstreamAssignments ?? []) {
            const officerState = assignmentStatus(officer);
            const officerArea = primaryAreaName(officer, task, coordinatorArea);
            const officerBranch = normalizeBranch(
              officer.assignee?.branch || coordinatorBranch,
              officer.assignee?.positionCode,
              officer.assignee?.organizationUnitType,
            );

            officerList.push({
              id: officer.id,
              parentId: coordinator.id,
              branch: officerBranch,
              positionCode: officer.assignee?.positionCode,
              roleCode: officer.assignee?.roleCode,
              name:
                officer.assignee?.fullName ||
                officer.assignee?.positionTitle ||
                officer.assignee?.organizationUnitName ||
                "Field Officer",
              ...officerState,
              readAt: officer.readAt,
              acknowledgedAt: officer.acknowledgedAt,
              forwardedAt: officer.completedAt,
              officer: officer.assignee?.positionTitle || officer.assignee?.organizationUnitName,
              groupName: officerArea,
              details: [
                { label: "Nama", value: detailValue(officer.assignee?.fullName) },
                { label: "Username", value: detailValue(officer.assignee?.username) },
                { label: "Jabatan", value: detailValue(officer.assignee?.positionTitle) },
                { label: "Kode jabatan", value: detailValue(officer.assignee?.positionCode) },
                { label: "Role", value: detailValue(officer.assignee?.roleCode) },
                { label: "Cabang komando", value: branchLabel(officerBranch) },
                { label: "Unit organisasi", value: detailValue(officer.assignee?.organizationUnitName) },
                { label: "Wilayah tugas", value: areaScopeNames(officer) },
                { label: "Wilayah utama", value: officerArea },
                { label: "Status assignment", value: detailValue(officer.status) },
                { label: "Status ringkas", value: officerState.statusLabel },
                { label: "Ditugaskan", value: formatDate(officer.assignedAt) },
                { label: "Dibaca", value: formatDate(officer.readAt) },
                { label: "Diakui", value: formatDate(officer.acknowledgedAt) },
                { label: "Mulai", value: formatDate(officer.startedAt) },
                { label: "Selesai", value: formatDate(officer.completedAt) },
                { label: "Tenggat", value: formatDate(officer.dueDate) },
                {
                  label: "Ketepatan waktu",
                  value: resolveTimeliness({
                    dueDate: officer.dueDate || task.dueDate,
                    completedAt: officer.completedAt,
                    status: officer.status,
                  }),
                },
                { label: "Catatan assignment", value: detailValue(officer.assignmentNote) },
              ],
            });
          }
        }
      }
    }

    // Ensure both BINDA and DIRECTORATE branches always have regional placeholder nodes if empty
    const hasBindaRegional = regionalList.some((r) => r.branch === "BINDA");
    if (!hasBindaRegional) {
      regionalList.push({
        id: "binda-default-regional",
        parentId: "branch-BINDA",
        branch: "BINDA",
        name: "Kabinda",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Binda",
        officer: "Kabinda",
        details: [
          { label: "Cabang komando", value: "BINDA" },
          { label: "Status", value: "Belum diproses" },
        ],
      });
      oimList.push({
        id: "binda-default-oim",
        parentId: "binda-default-regional",
        branch: "BINDA",
        name: "OIM Binda",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Binda",
        officer: "OIM Binda",
        details: [],
      });
      coordinatorList.push({
        id: "binda-default-coordinator",
        parentId: "binda-default-oim",
        branch: "BINDA",
        name: "Kabagops",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Binda",
        officer: "Kabagops",
        details: [],
      });
      officerList.push({
        id: "binda-default-officer",
        parentId: "binda-default-coordinator",
        branch: "BINDA",
        name: "Korwil",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Binda",
        officer: "Korwil",
        details: [],
      });
    }

    const hasDirRegional = regionalList.some((r) => r.branch === "DIRECTORATE");
    if (!hasDirRegional) {
      regionalList.push({
        id: "dir-default-regional",
        parentId: "branch-DIRECTORATE",
        branch: "DIRECTORATE",
        name: "Direktur Wilayah",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Direktorat Wilayah",
        officer: "Direktur Wilayah",
        details: [
          { label: "Cabang komando", value: "DIRECTORATE" },
          { label: "Status", value: "Belum diproses" },
        ],
      });
      oimList.push({
        id: "dir-default-oim",
        parentId: "dir-default-regional",
        branch: "DIRECTORATE",
        name: "OIM Direktorat",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Direktorat Wilayah",
        officer: "OIM Direktorat",
        details: [],
      });
      coordinatorList.push({
        id: "dir-default-coordinator",
        parentId: "dir-default-oim",
        branch: "DIRECTORATE",
        name: "Staf Subdit",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Direktorat Wilayah",
        officer: "Staf Subdit",
        details: [],
      });
      officerList.push({
        id: "dir-default-officer",
        parentId: "dir-default-coordinator",
        branch: "DIRECTORATE",
        name: "Agen",
        status: "PENDING",
        statusLabel: "Belum diproses",
        groupName: "Direktorat Wilayah",
        officer: "Agen",
        details: [],
      });
    }

    const regionalByBranch = new Map<CommandBranch, PipelineItem[]>();
    for (const regional of regionalList) {
      const branch = regional.branch ?? "OTHER";
      const items = regionalByBranch.get(branch) ?? [];
      items.push(regional);
      regionalByBranch.set(branch, items);
    }

    // Ensure BINDA and DIRECTORATE always exist in regionalByBranch keys
    if (!regionalByBranch.has("BINDA")) {
      regionalByBranch.set("BINDA", []);
    }
    if (!regionalByBranch.has("DIRECTORATE")) {
      regionalByBranch.set("DIRECTORATE", []);
    }

    for (const branch of Array.from(regionalByBranch.keys()).sort((left, right) => {
      const order: Record<CommandBranch, number> = { BINDA: 0, DIRECTORATE: 1, PUSAT: 2, OTHER: 3 };
      return order[left] - order[right];
    })) {
      const branchRegionalItems = regionalByBranch.get(branch) ?? [];
      const summary =
        branchRegionalItems.length > 0
          ? summarizeStage(branchRegionalItems)
          : { status: "PENDING" as PipelineStatus, progress: 0, text: "0 penerima" };

      branchList.push({
        id: `branch-${branch}`,
        branch,
        name: branchLabel(branch),
        status: summary.status,
        statusLabel: statusLabel(summary.status),
        groupName: branchLabel(branch),
        officer: branchSubtitle(branch),
        details: [
          { label: "Cabang komando", value: branchLabel(branch) },
          { label: "Rute jabatan", value: branchSubtitle(branch) },
          { label: "Jumlah penerima regional", value: detailValue(branchRegionalItems.length) },
          {
            label: "Sudah selesai",
            value: detailValue(branchRegionalItems.filter((item) => item.status === "COMPLETED").length),
          },
          {
            label: "Sebagian diproses",
            value: detailValue(branchRegionalItems.filter((item) => item.status === "IN_PROGRESS").length),
          },
        ],
      });
    }

    return {
      branch: deduplicateItems(branchList),
      regional: deduplicateItems(regionalList),
      oim: deduplicateItems(oimList),
      coordinator: deduplicateItems(coordinatorList),
      officer: deduplicateItems(officerList),
    };
  }, [directiveDueDate, tracking.regionalChains]);

  const hierarchyData = useMemo(() => {
    if (!tracking.routingHierarchy.length) return legacyHierarchyData;

    const regionalByPositionId = new Map<string, DirectiveTracking["regionalChains"][number]>();
    const regionalByUnitId = new Map<string, DirectiveTracking["regionalChains"][number]>();
    const oimByPositionId = new Map<
      string,
      { chain: DirectiveTracking["regionalChains"][number]; task: DirectiveTrackingTask }
    >();
    const assignmentByPositionId = new Map<
      string,
      { assignment: DirectiveTrackingAssignment; task: DirectiveTrackingTask }
    >();

    for (const chain of tracking.regionalChains) {
      const targetPositionId = chain.regionalRecipient.targetPosition?.id;
      const targetUnitId =
        chain.regionalRecipient.targetUnit?.id || chain.regionalRecipient.targetPosition?.organizationUnit?.id;
      if (targetPositionId) regionalByPositionId.set(targetPositionId, chain);
      if (targetUnitId) regionalByUnitId.set(targetUnitId, chain);

      for (const task of chain.oimTasks ?? []) {
        if (task.createdBy?.positionId) {
          oimByPositionId.set(task.createdBy.positionId, { chain, task });
        }
        for (const coordinator of task.fieldCoordinatorAssignments ?? []) {
          if (coordinator.assignee?.positionId) {
            assignmentByPositionId.set(coordinator.assignee.positionId, { assignment: coordinator, task });
          }
          for (const officer of coordinator.downstreamAssignments ?? []) {
            if (officer.assignee?.positionId) {
              assignmentByPositionId.set(officer.assignee.positionId, { assignment: officer, task });
            }
          }
        }
      }
    }

    const regional: PipelineItem[] = [];
    const oim: PipelineItem[] = [];
    const coordinator: PipelineItem[] = [];
    const officer: PipelineItem[] = [];

    for (const route of tracking.routingHierarchy) {
      const branch = normalizeBranch(route.branch, route.positionCode, route.organizationUnitType);
      const areaNames = route.areaScopes.map((scope) => scope.name).join(", ") || "-";
      const primaryArea = route.areaScopes.find((scope) => scope.isPrimary)?.name || route.areaScopes[0]?.name;
      const common = {
        id: route.positionId,
        branch,
        positionCode: route.positionCode,
        roleCode: route.roleCode,
        name: route.positionTitle,
        officer: route.fullName || route.organizationUnitName,
        groupName: primaryArea || cleanRegionName(route.organizationUnitName),
      };
      const commonDetails: PipelineDetail[] = [
        { label: "Nama personel", value: detailValue(route.fullName) },
        { label: "Username", value: detailValue(route.username) },
        { label: "Jabatan", value: route.positionTitle },
        { label: "Kode jabatan", value: route.positionCode },
        { label: "Seat code", value: route.seatCode },
        { label: "Cabang komando", value: branchLabel(branch) },
        { label: "Unit organisasi", value: route.organizationUnitName },
        { label: "Cakupan wilayah", value: areaNames },
      ];

      if (["DIREKTUR_WILAYAH", "KABINDA"].includes(route.positionCode)) {
        const chain = regionalByPositionId.get(route.positionId) || regionalByUnitId.get(route.organizationUnitId);
        if (!chain) continue;

        const recipient = chain?.regionalRecipient;
        const recipientStatus = normalizeStatus(recipient?.status);
        const regionalForwardedAt = chain?.forwarding?.createdAt;
        const state = resolveItemState({
          failed: FAILURE_STATUSES.has(recipientStatus),
          completed: Boolean(chain?.forwarding),
          inProgress: Boolean(recipient?.readAt || recipient?.acknowledgedAt || ACTIVE_STATUSES.has(recipientStatus)),
          completedLabel: "Sudah meneruskan",
          inProgressLabel: "Sudah membaca",
          pendingLabel: "Belum menerima STR",
        });
        regional.push({
          ...common,
          parentId: `branch-${branch}`,
          ...state,
          readAt: recipient?.readAt,
          acknowledgedAt: recipient?.acknowledgedAt,
          forwardedAt: regionalForwardedAt,
          details: [
            ...commonDetails,
            { label: "Status penerima", value: detailValue(recipient?.status) },
            { label: "Status ringkas", value: state.statusLabel },
            { label: "Dikirim", value: formatDate(recipient?.sentAt) },
            { label: "Dibaca", value: formatDate(recipient?.readAt) },
            { label: "Diteruskan", value: formatDate(regionalForwardedAt) },
            { label: "Batas waktu", value: formatDate(directiveDueDate) },
            {
              label: "Ketepatan waktu",
              value: resolveTimeliness({
                dueDate: directiveDueDate,
                completedAt: regionalForwardedAt,
                status: recipient?.status,
              }),
            },
          ],
        });
        continue;
      }

      if (["KASUBDIT", "KABAGOPS"].includes(route.positionCode)) {
        const activity = oimByPositionId.get(route.positionId);
        if (!activity) continue;

        const chain = activity?.chain;
        const forwardingStatus = normalizeStatus(chain?.forwarding?.status);
        const state = resolveItemState({
          failed: FAILURE_STATUSES.has(forwardingStatus),
          completed: Boolean(chain?.oimStage.hasForwardedToFieldCoordinator),
          inProgress: Boolean(chain?.oimStage.hasRead || chain?.oimStage.taskCount),
          completedLabel: "Sudah meneruskan",
          inProgressLabel: "Sedang memproses",
          pendingLabel: "Belum menerima STR",
        });
        oim.push({
          ...common,
          parentId: route.reportsToPositionId,
          ...state,
          forwardedAt: chain?.forwarding?.updatedAt,
          details: [
            ...commonDetails,
            { label: "Status forwarding", value: detailValue(chain?.forwarding?.status) },
            { label: "Status ringkas", value: state.statusLabel },
            { label: "Jumlah tugas", value: detailValue(chain?.oimStage.taskCount ?? 0) },
            {
              label: "Jumlah penerima lapangan",
              value: detailValue(chain?.oimStage.fieldCoordinatorAssignmentCount ?? 0),
            },
            { label: "Sudah dibaca", value: chain?.oimStage.hasRead ? "Ya" : "Belum" },
            {
              label: "Sudah diteruskan",
              value: chain?.oimStage.hasForwardedToFieldCoordinator ? "Ya" : "Belum",
            },
            { label: "Dibuat", value: formatDate(chain?.forwarding?.createdAt) },
            { label: "Update terakhir", value: formatDate(chain?.forwarding?.updatedAt) },
            { label: "Batas waktu", value: formatDate(directiveDueDate) },
            {
              label: "Ketepatan waktu",
              value: resolveTimeliness({
                dueDate: directiveDueDate,
                completedAt: chain?.oimStage.hasForwardedToFieldCoordinator ? chain?.forwarding?.updatedAt : null,
                fallbackCompletedAt: chain?.forwarding?.createdAt,
                status: chain?.forwarding?.status,
              }),
            },
          ],
        });
        continue;
      }

      const activity = assignmentByPositionId.get(route.positionId);
      const assignment = activity?.assignment;
      if (!activity || !assignment) continue;

      const state = assignmentStatus(assignment, ["STAF_SUBDIT", "KORWIL"].includes(route.positionCode));
      const assignmentDueDate = assignment?.dueDate || activity?.task.dueDate;
      const item: PipelineItem = {
        ...common,
        parentId: route.reportsToPositionId,
        ...state,
        readAt: assignment?.readAt,
        acknowledgedAt: assignment?.acknowledgedAt,
        forwardedAt: assignment?.completedAt,
        details: [
          ...commonDetails,
          { label: "Status assignment", value: detailValue(assignment?.status) },
          { label: "Status ringkas", value: state.statusLabel },
          { label: "Ditugaskan", value: formatDate(assignment?.assignedAt) },
          { label: "Dibaca", value: formatDate(assignment?.readAt) },
          { label: "Diakui", value: formatDate(assignment?.acknowledgedAt) },
          { label: "Mulai", value: formatDate(assignment?.startedAt) },
          { label: "Selesai", value: formatDate(assignment?.completedAt) },
          { label: "Batas waktu", value: formatDate(assignmentDueDate) },
          {
            label: "Ketepatan waktu",
            value: resolveTimeliness({
              dueDate: assignmentDueDate,
              completedAt: assignment?.completedAt,
              status: assignment?.status,
            }),
          },
          { label: "Tugas", value: detailValue(activity?.task.title) },
        ],
      };

      if (["STAF_SUBDIT", "KORWIL"].includes(route.positionCode)) coordinator.push(item);
      else if (route.positionCode === "PETUGAS_ORGANIK") officer.push(item);
    }

    const regionalByBranch = new Map<CommandBranch, PipelineItem[]>();
    for (const item of regional) {
      const items = regionalByBranch.get(item.branch ?? "OTHER") ?? [];
      items.push(item);
      regionalByBranch.set(item.branch ?? "OTHER", items);
    }

    const branch = (["BINDA", "DIRECTORATE"] as CommandBranch[])
      .filter((branchCode) => regionalByBranch.has(branchCode))
      .map((branchCode): PipelineItem => {
        const branchRegional = regionalByBranch.get(branchCode) ?? [];
        const summary = summarizeStage(branchRegional);
        return {
          id: `branch-${branchCode}`,
          branch: branchCode,
          name: branchLabel(branchCode),
          status: summary.status,
          statusLabel: statusLabel(summary.status),
          groupName: branchLabel(branchCode),
          officer: branchSubtitle(branchCode),
          details: [
            { label: "Cabang komando", value: branchLabel(branchCode) },
            { label: "Rute jabatan", value: branchSubtitle(branchCode) },
            { label: "Pimpinan wilayah", value: detailValue(branchRegional.length) },
            {
              label: "Sudah meneruskan",
              value: detailValue(branchRegional.filter((item) => item.status === "COMPLETED").length),
            },
          ],
        };
      });

    return { branch, regional, oim, coordinator, officer };
  }, [directiveDueDate, legacyHierarchyData, tracking.regionalChains, tracking.routingHierarchy]);

  const stagesData = useMemo(() => {
    const directiveStatus = normalizeStatus(directive.status);
    const executiveFailed = FAILURE_STATUSES.has(directiveStatus);
    const executiveCompleted = !["", "DRAFT"].includes(directiveStatus) && !executiveFailed;
    let executiveStatus: PipelineStatus = "PENDING";
    if (executiveFailed) executiveStatus = "REJECTED";
    else if (executiveCompleted) executiveStatus = "COMPLETED";

    return {
      executive: {
        progress: executiveCompleted ? 100 : 0,
        text: executiveCompleted ? "1 / 1" : "0 / 1",
        status: executiveStatus,
      } satisfies ReturnType<typeof summarizeStage>,
      regional: summarizeStage(hierarchyData.regional),
      oim: summarizeStage(hierarchyData.oim),
      coordinator: summarizeStage(hierarchyData.coordinator),
      officer: summarizeStage(hierarchyData.officer),
    };
  }, [directive.status, hierarchyData]);

  const summaryFlowNodes = useMemo<PipelineReactFlowNode[]>(() => {
    const list: Array<{ id: PipelineStageId; label: string; subtitle: string; icon: LucideIcon; x: number }> = [
      { id: "executive", label: "Deputi II", subtitle: "Executive Command", icon: Shield, x: 80 },
      { id: "regional", label: "Pimpinan Regional", subtitle: "Kabinda / Direktur Wilayah", icon: Shield, x: 360 },
      { id: "oim", label: "OIM Unit", subtitle: "Kabagops / Kasubdit", icon: RadioTower, x: 640 },
      { id: "coordinator", label: "FC / Korwil", subtitle: "Koordinator lapangan", icon: Users, x: 920 },
      { id: "officer", label: "Petugas Organik", subtitle: "Pelaksana lapangan", icon: UserRound, x: 1200 },
    ];

    return list.map((item) => ({
      id: item.id,
      type: "pipeline",
      position: { x: item.x, y: 140 },
      draggable: false,
      selectable: false,
      data: {
        label: item.label,
        subtitle: item.subtitle,
        status: stagesData[item.id].status,
        progressPercent: stagesData[item.id].progress,
        progressText: stagesData[item.id].text,
        icon: item.icon,
        onClick: () => {
          setActiveStage(item.id);
          setActiveItemId(null);
          setActiveBranch(null);
          setModalSearch("");
          setVisibleItemCount(MODAL_BATCH_SIZE);
        },
      },
    }));
  }, [stagesData]);

  const flowNodes = useMemo<TrackingReactFlowNode[]>(() => {
    const branchItems = hierarchyData.branch;
    const regionalItems = hierarchyData.regional;
    const oimItems = hierarchyData.oim;
    const coordinatorItems = hierarchyData.coordinator;
    const officerItems = hierarchyData.officer;

    const groupByParent = (items: PipelineItem[]) => {
      const map = new Map<string, PipelineItem[]>();
      for (const item of items) {
        if (!item.parentId) continue;
        const list = map.get(item.parentId) ?? [];
        list.push(item);
        map.set(item.parentId, list);
      }
      return map;
    };

    const regionalByBranch = groupByParent(regionalItems);
    const oimByRegional = groupByParent(oimItems);
    const coordinatorByOim = groupByParent(coordinatorItems);
    const officersByCoordinator = groupByParent(officerItems);

    const branchPositions = new Map<string, number>();
    const regionalPositions = new Map<string, number>();
    const oimPositions = new Map<string, number>();
    const coordinatorPositions = new Map<string, number>();
    const officerPositions = new Map<string, { x: number; y: number }>();
    const laneRanges = new Map<"BINDA" | "DIRECTORATE", { startY: number; endY: number }>();

    const average = (values: number[], fallback: number) =>
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;
    const laneAnchor = (values: number[], fallback: number, branch?: CommandBranch) =>
      branch === "BINDA" ? (values[0] ?? fallback) : average(values, fallback);

    const branchOrder: Record<CommandBranch, number> = { BINDA: 0, DIRECTORATE: 1, PUSAT: 2, OTHER: 3 };
    const orderedBranches = [...branchItems].sort(
      (left, right) => branchOrder[left.branch ?? "OTHER"] - branchOrder[right.branch ?? "OTHER"],
    );

    let cursorY = 80;
    for (const branch of orderedBranches) {
      const laneStartY = cursorY;
      const branchRegionalItems = regionalByBranch.get(branch.id) ?? [];
      const branchYValues: number[] = [];

      for (const regional of branchRegionalItems) {
        const oimChildren = oimByRegional.get(regional.id) ?? [];
        const regionalYValues: number[] = [];

        if (oimChildren.length === 0) {
          regionalPositions.set(regional.id, cursorY);
          branchYValues.push(cursorY);
          cursorY += 148;
          continue;
        }

        for (const oim of oimChildren) {
          const coordinatorChildren = coordinatorByOim.get(oim.id) ?? [];
          const oimYValues: number[] = [];

          if (coordinatorChildren.length === 0) {
            oimPositions.set(oim.id, cursorY);
            regionalYValues.push(cursorY);
            cursorY += 148;
            continue;
          }

          for (const coordinator of coordinatorChildren) {
            const officerChildren = officersByCoordinator.get(coordinator.id) ?? [];

            if (officerChildren.length > 0) {
              const maxRowsPerCoordinator = 4;
              const rowCount = Math.min(maxRowsPerCoordinator, officerChildren.length);
              const rowGap = 112;
              const columnGap = 250;
              const groupHeight = (rowCount - 1) * rowGap;

              officerChildren.forEach((child, index) => {
                const row = index % maxRowsPerCoordinator;
                const column = Math.floor(index / maxRowsPerCoordinator);
                officerPositions.set(child.id, { x: 1200 + column * columnGap, y: cursorY + row * rowGap });
              });

              const coordinatorY = cursorY + groupHeight / 2;
              coordinatorPositions.set(coordinator.id, coordinatorY);
              oimYValues.push(coordinatorY);
              cursorY += Math.max(152, groupHeight + 172);
            } else {
              coordinatorPositions.set(coordinator.id, cursorY);
              oimYValues.push(cursorY);
              cursorY += 136;
            }
          }

          const oimY = laneAnchor(oimYValues, cursorY, branch.branch);
          oimPositions.set(oim.id, oimY);
          regionalYValues.push(oimY);
        }

        const regionalY = laneAnchor(regionalYValues, cursorY, branch.branch);
        regionalPositions.set(regional.id, regionalY);
        branchYValues.push(regionalY);
      }

      const branchY = laneAnchor(branchYValues, cursorY, branch.branch);
      branchPositions.set(branch.id, branchY);

      if (branch.branch === "BINDA" || branch.branch === "DIRECTORATE") {
        laneRanges.set(branch.branch, {
          startY: laneStartY,
          endY: Math.max(laneStartY + 104, cursorY),
        });
      }

      // A hard gap keeps the BINDA forest visually separate from the Directorate lane.
      cursorY += 360;
    }

    const graphCenterY = average(Array.from(branchPositions.values()), 180);

    // Build direct parent-child relationships using React Flow node IDs
    const flowParentToChildren = new Map<string, string[]>();
    for (const regional of regionalItems) {
      const list = flowParentToChildren.get("executive") ?? [];
      list.push(`regional-${regional.id}`);
      flowParentToChildren.set("executive", list);
    }
    for (const oim of oimItems) {
      const list = flowParentToChildren.get(`regional-${oim.parentId}`) ?? [];
      list.push(`oim-${oim.id}`);
      flowParentToChildren.set(`regional-${oim.parentId}`, list);
    }
    for (const coordinator of coordinatorItems) {
      const list = flowParentToChildren.get(`oim-${coordinator.parentId}`) ?? [];
      list.push(`coordinator-${coordinator.id}`);
      flowParentToChildren.set(`oim-${coordinator.parentId}`, list);
    }
    for (const officer of officerItems) {
      const list = flowParentToChildren.get(`coordinator-${officer.parentId}`) ?? [];
      list.push(`officer-${officer.id}`);
      flowParentToChildren.set(`coordinator-${officer.parentId}`, list);
    }

    // Map node ID -> status
    const nodeStatusMap = new Map<string, PipelineStatus>();
    nodeStatusMap.set("executive", stagesData.executive.status);
    for (const regional of regionalItems) nodeStatusMap.set(`regional-${regional.id}`, regional.status);
    for (const oim of oimItems) nodeStatusMap.set(`oim-${oim.id}`, oim.status);
    for (const coordinator of coordinatorItems) nodeStatusMap.set(`coordinator-${coordinator.id}`, coordinator.status);
    for (const officer of officerItems) nodeStatusMap.set(`officer-${officer.id}`, officer.status);

    const isDownstreamActive = (nodeId: string): boolean => {
      const children = flowParentToChildren.get(nodeId) ?? [];
      for (const childId of children) {
        const status = nodeStatusMap.get(childId);
        if (status && status !== "PENDING") {
          return true;
        }
        if (isDownstreamActive(childId)) {
          return true;
        }
      }
      return false;
    };

    const getAnimationClass = (nodeId: string, status: PipelineStatus): string => {
      if (status === "PENDING") return "flow-node-waiting";
      if (status === "REJECTED") return "flow-node-rejected";

      const hasActiveDownstream = isDownstreamActive(nodeId);
      if (hasActiveDownstream) {
        return "flow-node-completed";
      }
      if (status === "COMPLETED") return "flow-node-active";
      return "flow-node-processing";
    };

    const makeNode = ({
      id,
      stage,
      item,
      x,
      y,
      icon,
      label,
      subtitle,
      status,
      progressText,
    }: {
      id: string;
      stage: PipelineStageId;
      item?: PipelineItem;
      x: number;
      y: number;
      icon: LucideIcon;
      label: string;
      subtitle: string;
      status: PipelineStatus;
      progressText: string;
    }): PipelineReactFlowNode => ({
      id,
      type: "pipeline",
      position: { x, y },
      draggable: false,
      selectable: false,
      data: {
        label,
        subtitle,
        status,
        progressPercent: item ? itemProgress(status) : stagesData[stage].progress,
        progressText,
        icon,
        onClick: () => {
          setActiveStage(stage);
          setActiveItemId(item ? item.id : null);
          setActiveBranch(null);
          setModalSearch("");
          setVisibleItemCount(MODAL_BATCH_SIZE);
        },
        animationClass: getAnimationClass(id, status),
      },
    });

    const maxGraphX = Math.max(1440, ...Array.from(officerPositions.values(), (position) => position.x + 220));
    const ranges = Array.from(laneRanges.values());
    const minY = ranges.length > 0 ? Math.min(...ranges.map((r) => r.startY)) : 80;
    const maxY = ranges.length > 0 ? Math.max(...ranges.map((r) => r.endY)) : 400;

    const laneNodes: LaneReactFlowNode[] = [
      {
        id: "lane-unified",
        type: "lane",
        position: { x: 320, y: minY - 52 },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
        style: {
          width: maxGraphX - 280,
          height: maxY - minY + 104,
          zIndex: -1,
        },
        data: {
          branch: "DIRECTORATE",
          label: "",
        },
      },
    ];

    const nodes: TrackingReactFlowNode[] = [
      ...laneNodes,
      makeNode({
        id: "executive",
        stage: "executive",
        x: 80,
        y: graphCenterY,
        icon: Shield,
        label: "Deputi II",
        subtitle: "Penerbit STR",
        status: stagesData.executive.status,
        progressText: stagesData.executive.text,
      }),
    ];

    for (const regional of regionalItems) {
      nodes.push(
        makeNode({
          id: `regional-${regional.id}`,
          stage: "regional",
          item: regional,
          x: 360,
          y: regionalPositions.get(regional.id) ?? graphCenterY,
          icon: Shield,
          label: regional.name,
          subtitle: regional.officer || regional.positionCode || "Pimpinan Regional",
          status: regional.status,
          progressText: regional.statusLabel,
        }),
      );
    }

    for (const oim of oimItems) {
      nodes.push(
        makeNode({
          id: `oim-${oim.id}`,
          stage: "oim",
          item: oim,
          x: 640,
          y: oimPositions.get(oim.id) ?? graphCenterY,
          icon: RadioTower,
          label: oim.name,
          subtitle: oim.officer || oim.positionCode || "OIM",
          status: oim.status,
          progressText: oim.statusLabel,
        }),
      );
    }

    for (const coordinator of coordinatorItems) {
      nodes.push(
        makeNode({
          id: `coordinator-${coordinator.id}`,
          stage: "coordinator",
          item: coordinator,
          x: 920,
          y: coordinatorPositions.get(coordinator.id) ?? graphCenterY,
          icon: Users,
          label: coordinator.name,
          subtitle: coordinator.officer || coordinator.positionCode || "FC / Korwil",
          status: coordinator.status,
          progressText: coordinator.statusLabel,
        }),
      );
    }

    for (const officer of officerItems) {
      nodes.push(
        makeNode({
          id: `officer-${officer.id}`,
          stage: "officer",
          item: officer,
          x: officerPositions.get(officer.id)?.x ?? 1200,
          y: officerPositions.get(officer.id)?.y ?? graphCenterY,
          icon: UserRound,
          label: officer.name,
          subtitle: officer.officer || officer.positionCode || "Petugas Organik",
          status: officer.status,
          progressText: officer.statusLabel,
        }),
      );
    }

    return nodes;
  }, [hierarchyData, stagesData]);

  const flowEdges = useMemo<Edge[]>(() => {
    const edgeFor = (id: string, source: string, target: string, status: PipelineStatus): Edge => {
      const style = statusColors[status];
      const pending = status === "PENDING";
      const animated = status === "IN_PROGRESS";
      let strokeWidth = 2.5;
      if (status === "COMPLETED") strokeWidth = 3;
      else if (pending) strokeWidth = 1.5;

      return {
        id,
        source,
        target,
        type: "smoothstep",
        animated,
        style: {
          stroke: pending ? "#64748B" : style.edgeColor,
          strokeWidth,
          opacity: pending ? 0.35 : 0.9,
          filter: animated ? `drop-shadow(0 0 3px ${style.edgeColor}55)` : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: pending ? "#64748B" : style.edgeColor,
        },
      };
    };

    const edges: Edge[] = [];

    for (const regional of hierarchyData.regional) {
      edges.push(edgeFor(`executive-regional-${regional.id}`, "executive", `regional-${regional.id}`, regional.status));
    }

    for (const oim of hierarchyData.oim) {
      if (!oim.parentId) continue;
      edges.push(
        edgeFor(`regional-${oim.parentId}-oim-${oim.id}`, `regional-${oim.parentId}`, `oim-${oim.id}`, oim.status),
      );
    }

    for (const coordinator of hierarchyData.coordinator) {
      if (!coordinator.parentId) continue;
      edges.push(
        edgeFor(
          `oim-${coordinator.parentId}-coordinator-${coordinator.id}`,
          `oim-${coordinator.parentId}`,
          `coordinator-${coordinator.id}`,
          coordinator.status,
        ),
      );
    }

    for (const officer of hierarchyData.officer) {
      if (!officer.parentId) continue;
      edges.push(
        edgeFor(
          `coordinator-${officer.parentId}-officer-${officer.id}`,
          `coordinator-${officer.parentId}`,
          `officer-${officer.id}`,
          officer.status,
        ),
      );
    }

    return edges;
  }, [hierarchyData]);

  const compactFlowNodes = useMemo<PipelineReactFlowNode[]>(() => {
    const branches = [
      {
        branch: "BINDA" as const,
        y: 88,
        labels: {
          regional: ["Kabinda", "Pimpinan BINDA"],
          oim: ["Kabagops", "Penjabaran STR BINDA"],
          coordinator: ["Korwil", "Koordinator wilayah"],
          officer: ["Field Officer", "Petugas organik BINDA"],
        },
      },
      {
        branch: "DIRECTORATE" as const,
        y: 260,
        labels: {
          regional: ["Direktur Wilayah", "Pimpinan direktorat"],
          oim: ["Kasubdit", "Penjabaran STR direktorat"],
          coordinator: ["Staf Subdit", "Koordinator lapangan"],
          officer: ["Field Officer", "Agen / petugas organik"],
        },
      },
    ];

    const availableBranches = branches.filter((branch) =>
      hierarchyData.regional.some((item) => item.branch === branch.branch),
    );
    const visibleBranches = availableBranches.length > 0 ? availableBranches : branches;
    const executiveY = visibleBranches.reduce((sum, branch) => sum + branch.y, 0) / Math.max(visibleBranches.length, 1);

    const compactNodes: PipelineReactFlowNode[] = [
      {
        id: "compact-executive",
        type: "pipeline",
        position: { x: 80, y: executiveY },
        draggable: false,
        selectable: false,
        data: {
          label: "Deputi II",
          subtitle: "Pusat Komando",
          status: stagesData.executive.status,
          progressPercent: stagesData.executive.progress,
          progressText: stagesData.executive.text,
          icon: Shield,
          onClick: () => {
            setActiveStage("executive");
            setActiveItemId(null);
            setActiveBranch(null);
            setModalSearch("");
            setVisibleItemCount(MODAL_BATCH_SIZE);
          },
          animationClass: stagesData.executive.status === "COMPLETED" ? "flow-node-completed" : "flow-node-active",
        },
      },
    ];

    const stageConfig: Array<{
      stage: Exclude<PipelineStageId, "executive">;
      x: number;
      icon: LucideIcon;
      items: PipelineItem[];
    }> = [
      { stage: "regional", x: 360, icon: Shield, items: hierarchyData.regional },
      { stage: "oim", x: 640, icon: RadioTower, items: hierarchyData.oim },
      { stage: "coordinator", x: 920, icon: Users, items: hierarchyData.coordinator },
      { stage: "officer", x: 1200, icon: UserRound, items: hierarchyData.officer },
    ];

    for (const branch of visibleBranches) {
      for (const config of stageConfig) {
        const branchItems = config.items.filter((item) => item.branch === branch.branch);
        const summary = summarizeStage(branchItems);
        const [label, subtitle] = branch.labels[config.stage];

        compactNodes.push({
          id: `compact-${branch.branch}-${config.stage}`,
          type: "pipeline",
          position: { x: config.x, y: branch.y },
          draggable: false,
          selectable: false,
          data: {
            label,
            subtitle,
            status: summary.status,
            progressPercent: summary.progress,
            progressText: summary.text,
            icon: config.icon,
            onClick: () => {
              setActiveStage(config.stage);
              setActiveItemId(null);
              setActiveBranch(branch.branch);
              setModalSearch("");
              setVisibleItemCount(MODAL_BATCH_SIZE);
            },
            animationClass:
              summary.status === "PENDING"
                ? "flow-node-waiting"
                : summary.status === "REJECTED"
                  ? "flow-node-rejected"
                  : summary.status === "COMPLETED"
                    ? "flow-node-completed"
                    : "flow-node-processing",
          },
        });
      }
    }

    return compactNodes;
  }, [hierarchyData, stagesData]);

  const compactFlowEdges = useMemo<Edge[]>(() => {
    const edgeFor = (id: string, source: string, target: string, status: PipelineStatus): Edge => {
      const style = statusColors[status];
      const pending = status === "PENDING";

      return {
        id,
        source,
        target,
        type: "smoothstep",
        animated: status === "IN_PROGRESS",
        style: {
          stroke: pending ? "#64748B" : style.edgeColor,
          strokeWidth: pending ? 1.5 : 2.5,
          opacity: pending ? 0.35 : 0.9,
          filter: status === "IN_PROGRESS" ? `drop-shadow(0 0 3px ${style.edgeColor}55)` : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: pending ? "#64748B" : style.edgeColor,
        },
      };
    };

    const branches = ["BINDA", "DIRECTORATE"] as const;
    const availableBranches = branches.filter((branch) =>
      hierarchyData.regional.some((item) => item.branch === branch),
    );
    const visibleBranches = availableBranches.length > 0 ? availableBranches : branches;
    const edges: Edge[] = [];

    for (const branch of visibleBranches) {
      const regionalItems = hierarchyData.regional.filter((item) => item.branch === branch);
      const oimItems = hierarchyData.oim.filter((item) => item.branch === branch);
      const coordinatorItems = hierarchyData.coordinator.filter((item) => item.branch === branch);
      const officerItems = hierarchyData.officer.filter((item) => item.branch === branch);

      edges.push(
        edgeFor(
          `compact-executive-${branch}-regional`,
          "compact-executive",
          `compact-${branch}-regional`,
          summarizeStage(regionalItems).status,
        ),
        edgeFor(
          `compact-${branch}-regional-oim`,
          `compact-${branch}-regional`,
          `compact-${branch}-oim`,
          summarizeStage(oimItems).status,
        ),
        edgeFor(
          `compact-${branch}-oim-coordinator`,
          `compact-${branch}-oim`,
          `compact-${branch}-coordinator`,
          summarizeStage(coordinatorItems).status,
        ),
        edgeFor(
          `compact-${branch}-coordinator-officer`,
          `compact-${branch}-coordinator`,
          `compact-${branch}-officer`,
          summarizeStage(officerItems).status,
        ),
      );
    }

    return edges;
  }, [hierarchyData]);

  const displayFlowNodes = variant === "compact" ? compactFlowNodes : flowNodes;
  const displayFlowEdges = variant === "compact" ? compactFlowEdges : flowEdges;
  const [nodes, setNodes] = useNodesState<TrackingReactFlowNode>(displayFlowNodes);
  const [edges, setEdges] = useEdgesState(displayFlowEdges);

  useEffect(() => setNodes(displayFlowNodes), [displayFlowNodes, setNodes]);
  useEffect(() => setEdges(displayFlowEdges), [displayFlowEdges, setEdges]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      fitView({
        padding: variant === "compact" ? 0.22 : 0.18,
        minZoom: variant === "compact" ? 0.35 : 0.08,
        maxZoom: variant === "compact" ? 1.05 : 1.05,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, variant]);

  const activeStageItems = useMemo(() => {
    if (!activeStage) return null;

    const listMap = {
      executive: [] as PipelineItem[],
      regional: hierarchyData.regional,
      oim: hierarchyData.oim,
      coordinator: hierarchyData.coordinator,
      officer: hierarchyData.officer,
    };

    return activeBranch ? listMap[activeStage].filter((item) => item.branch === activeBranch) : listMap[activeStage];
  }, [activeBranch, activeStage, hierarchyData]);

  const filteredActiveStageItems = useMemo(() => {
    if (!activeStageItems) return null;

    const query = modalSearch.trim().toLowerCase();
    if (!query) return activeStageItems;

    return activeStageItems.filter((item) => itemSearchText(item).includes(query));
  }, [activeStageItems, modalSearch]);

  const visibleActiveStageItems = useMemo(() => {
    if (!filteredActiveStageItems) return null;

    return filteredActiveStageItems.slice(0, visibleItemCount);
  }, [filteredActiveStageItems, visibleItemCount]);

  const hasMoreActiveStageItems = Boolean(
    filteredActiveStageItems && visibleItemCount < filteredActiveStageItems.length,
  );

  const activeStageGroupedItems = useMemo(() => {
    if (!visibleActiveStageItems?.length) return null;

    const groups: Record<string, PipelineItem[]> = {};
    for (const item of visibleActiveStageItems) {
      if (!groups[item.groupName]) groups[item.groupName] = [];
      groups[item.groupName].push(item);
    }
    return groups;
  }, [visibleActiveStageItems]);

  const activeSelectedItem = useMemo(() => {
    if (!activeStage || !activeItemId) return null;

    return activeStageItems?.find((item) => item.id === activeItemId) ?? null;
  }, [activeItemId, activeStage, activeStageItems]);

  const handleModalScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      if (!hasMoreActiveStageItems) return;

      const target = event.currentTarget;
      const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
      if (distanceToBottom < 160) {
        setVisibleItemCount((count) => count + MODAL_BATCH_SIZE);
      }
    },
    [hasMoreActiveStageItems],
  );

  const handleFlowNodeClick = useCallback((_: React.MouseEvent, node: TrackingReactFlowNode) => {
    if (node.type === "lane") return;

    const onClick = node.data.onClick;
    if (typeof onClick === "function") {
      onClick();
    }
  }, []);

  return (
    <div className="space-y-6 font-sans">
      <Card className="hidden overflow-hidden border-[var(--dc-border-subtle)] bg-[var(--dc-card)] shadow-sm md:block">
        <CardHeader className="border-b border-[var(--dc-border-subtle)]/70 bg-muted/10 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-[13px] font-bold uppercase tracking-wider text-foreground">
                Alur Distribusi STR
              </CardTitle>
              <CardDescription className="text-xs">
                Perjalanan satu STR dari pemberi perintah sampai Field Officer.
              </CardDescription>
            </div>
            <div className="flex select-none items-center gap-4 font-mono text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" /> Selesai
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" /> Sebagian diproses
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-slate-400" /> Belum diproses
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            "relative bg-slate-50/20 p-0 dark:bg-black/5",
            variant === "compact"
              ? "h-[min(26rem,60svh)] min-h-[22rem]"
              : "h-[min(70svh,56rem)] min-h-[30rem] sm:min-h-[35rem]",
          )}
        >
          <ReactFlow<TrackingReactFlowNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            minZoom={variant === "compact" ? 0.25 : 0.05}
            maxZoom={variant === "compact" ? 1.25 : 1.5}
            fitView
            fitViewOptions={{
              padding: variant === "compact" ? 0.22 : 0.18,
              minZoom: variant === "compact" ? 0.35 : 0.08,
              maxZoom: 1.05,
            }}
            onNodeClick={handleFlowNodeClick}
            proOptions={{ hideAttribution: true }}
            colorMode={isThemeMounted && resolvedTheme === "dark" ? "dark" : "light"}
          >
            <Controls position="bottom-left" showInteractive={false} />
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={0.8}
              color="#94a3b8"
              className="opacity-[0.12] dark:opacity-[0.06]"
            />
          </ReactFlow>
        </CardContent>
      </Card>

      <Card className="block border-[var(--dc-border-subtle)] bg-[var(--dc-card)] shadow-sm md:hidden">
        <CardHeader className="border-b border-[var(--dc-border-subtle)]/70 px-4 py-4">
          <CardTitle className="text-[12px] font-bold uppercase tracking-wider text-foreground">
            Perjalanan Distribusi STR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4">
          {summaryFlowNodes.map((item, idx) => {
            const stageId = item.id as PipelineStageId;
            const stage = stagesData[stageId];
            const style = statusColors[stage.status];
            const Icon = item.data.icon;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setActiveStage(stageId);
                  setActiveItemId(null);
                  setActiveBranch(null);
                  setModalSearch("");
                  setVisibleItemCount(MODAL_BATCH_SIZE);
                }}
                className="group relative flex w-full cursor-pointer items-start gap-4 text-left"
              >
                {idx < summaryFlowNodes.length - 1 && (
                  <div
                    className="absolute left-4 top-8 h-[calc(100%+24px)] w-0.5 -translate-x-1/2 bg-slate-200 dark:bg-slate-800"
                    style={{
                      backgroundColor:
                        stage.status === "COMPLETED" || stage.status === "IN_PROGRESS" ? style.edgeColor : undefined,
                    }}
                  />
                )}
                <div
                  className={cn(
                    "z-10 grid size-8 shrink-0 place-items-center rounded-full border shadow-sm transition-all duration-200 group-hover:scale-105",
                    style.iconBg,
                    style.border,
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-[var(--dc-border-subtle)] bg-muted/30 p-3 transition-colors group-hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate text-[12px] font-bold text-foreground">{item.data.label}</h4>
                    <span className={cn("rounded-[3px] px-1.5 py-0.5 text-[9px] font-bold uppercase", style.badgeBg)}>
                      {style.statusText}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{item.data.subtitle}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                      <div
                        className={cn("h-full rounded-full", style.progressBg)}
                        style={{ width: `${stage.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-muted-foreground">{stage.text}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Dialog
        open={activeStage !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveStage(null);
            setActiveItemId(null);
            setActiveBranch(null);
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col border-[var(--dc-border-subtle)] bg-[var(--dc-card)] text-foreground outline-none sm:max-w-[640px]">
          {activeStage &&
            (() => {
              const stagesPopupMeta = {
                executive: {
                  title: "Deputi II (Executive)",
                  desc: "Titik awal penerbitan direktif strategis oleh Deputi II.",
                  details: [
                    { label: "Nomor STR", value: directive.commandNumber },
                    { label: "Judul STR/UUK", value: uukTitle },
                    { label: "Klasifikasi Keamanan", value: currentVersion?.classification || "TERBATAS" },
                    { label: "Tanggal Diterbitkan", value: formatDate(currentVersion?.commandDate) },
                    { label: "Batas Waktu Pelaksanaan", value: formatDate(currentVersion?.dueDate) },
                  ],
                  instructions: currentVersion?.commandDescription || "-",
                },
                regional: {
                  title:
                    activeBranch === "BINDA"
                      ? "Kabinda"
                      : activeBranch === "DIRECTORATE"
                        ? "Direktur Wilayah"
                        : "Pimpinan Regional",
                  desc:
                    activeBranch === "BINDA"
                      ? "Daftar Kabinda yang menerima STR pada jalur BINDA."
                      : activeBranch === "DIRECTORATE"
                        ? "Daftar Direktur Wilayah yang menerima STR pada jalur direktorat."
                        : "Daftar Kabinda dan Direktur Wilayah penerima dokumen STR aktif ini.",
                  details: [],
                  instructions: null,
                },
                oim: {
                  title:
                    activeBranch === "BINDA"
                      ? "Kabagops"
                      : activeBranch === "DIRECTORATE"
                        ? "Kasubdit"
                        : "Operational Intelligence Manager (OIM)",
                  desc:
                    activeBranch === "BINDA"
                      ? "Daftar Kabagops yang menjabarkan STR pada jalur BINDA."
                      : activeBranch === "DIRECTORATE"
                        ? "Daftar Kasubdit yang menjabarkan STR pada jalur direktorat."
                        : "Daftar Kabagops/Kasubdit yang menjabarkan STR menjadi penugasan.",
                  details: [],
                  instructions: null,
                },
                coordinator: {
                  title:
                    activeBranch === "BINDA"
                      ? "Korwil"
                      : activeBranch === "DIRECTORATE"
                        ? "Staf Subdit"
                        : "Field Coordinator / Korwil",
                  desc:
                    activeBranch === "BINDA"
                      ? "Daftar Korwil yang menerima penerusan tugas dari Kabagops."
                      : activeBranch === "DIRECTORATE"
                        ? "Daftar Staf Subdit yang menerima penerusan tugas dari Kasubdit."
                        : "Daftar koordinator lapangan penanggung jawab instruksi taktis STR ini.",
                  details: [],
                  instructions: null,
                },
                officer: {
                  title: "Field Officer",
                  desc:
                    activeBranch === "BINDA"
                      ? "Daftar petugas organik BINDA yang menerima tugas dari Korwil."
                      : activeBranch === "DIRECTORATE"
                        ? "Daftar agen atau petugas organik direktorat yang menerima tugas dari Staf Subdit."
                        : "Daftar petugas organik pelaksana operasi taktis STR ini.",
                  details: [],
                  instructions: null,
                },
              };

              const data = stagesPopupMeta[activeStage];

              return (
                <>
                  <DialogHeader className="shrink-0 border-b border-[var(--dc-border-subtle)] pb-3">
                    <DialogTitle className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-wider text-sky-500">
                      <span className="size-2 rounded-full bg-sky-500" />
                      {data.title}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-xs text-muted-foreground">{data.desc}</DialogDescription>
                  </DialogHeader>

                  {activeStage !== "executive" && (
                    <div className="mt-4 shrink-0">
                      {activeSelectedItem ? (
                        <button
                          type="button"
                          onClick={() => setActiveItemId(null)}
                          className="inline-flex h-8 items-center gap-2 rounded-md border border-[var(--dc-border-subtle)] bg-muted/20 px-3 text-[11px] font-semibold text-foreground transition-colors hover:bg-muted/40"
                        >
                          <ArrowLeft className="size-3.5" />
                          Kembali
                        </button>
                      ) : (
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            value={modalSearch}
                            onChange={(event) => {
                              setModalSearch(event.target.value);
                              setVisibleItemCount(MODAL_BATCH_SIZE);
                            }}
                            placeholder="Cari nama, wilayah, jabatan, status"
                            className="h-9 w-full rounded-md border border-[var(--dc-border-subtle)] bg-muted/10 pl-9 pr-3 text-[12px] font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-sky-400 focus:bg-background"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-[11.5px]"
                    onScroll={activeSelectedItem ? undefined : handleModalScroll}
                  >
                    {activeStage === "executive" ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[var(--dc-border-subtle)] bg-muted/20 p-3">
                          {data.details.map((item) => (
                            <div key={item.label} className="min-w-0">
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                {item.label}
                              </span>
                              <span className="mt-0.5 block text-[11.5px] font-semibold text-foreground">
                                {item.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        {data.instructions && (
                          <div className="space-y-1.5">
                            <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              Instruksi Strategis
                            </span>
                            <div className="max-h-[180px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-[var(--dc-border-subtle)] bg-muted/20 p-3 text-[11.5px] leading-relaxed text-foreground">
                              {data.instructions}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : activeSelectedItem ? (
                      <div className="space-y-4">
                        <div
                          className={cn(
                            "rounded-xl border p-4",
                            statusColors[activeSelectedItem.status].border,
                            statusColors[activeSelectedItem.status].bg,
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                                {activeSelectedItem.groupName}
                              </p>
                              <h4 className="mt-1 truncate text-base font-bold text-foreground">
                                {activeSelectedItem.name}
                              </h4>
                              {activeSelectedItem.officer && (
                                <p className="mt-1 text-xs text-muted-foreground">{activeSelectedItem.officer}</p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-[4px] px-2 py-1 text-[10px] font-bold uppercase",
                                statusColors[activeSelectedItem.status].badgeBg,
                              )}
                            >
                              {activeSelectedItem.statusLabel}
                            </span>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {activeSelectedItem.details.map((detail) => (
                            <div
                              key={`${activeSelectedItem.id}-${detail.label}`}
                              className="min-w-0 rounded-lg border border-[var(--dc-border-subtle)] bg-muted/20 p-3"
                            >
                              <span className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                {detail.label}
                              </span>
                              <span className="mt-1 block break-words text-[12px] font-semibold text-foreground">
                                {detail.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : activeStageGroupedItems ? (
                      <div className="space-y-4 pr-1">
                        {Object.entries(activeStageGroupedItems).map(([region, items]) => (
                          <div key={region} className="space-y-2.5">
                            <h5 className="mt-1 border-b border-[var(--dc-border-subtle)]/70 pb-1 text-[10.5px] font-bold uppercase tracking-wider text-sky-500">
                              {region}
                            </h5>
                            <div className="space-y-2 pl-1.5">
                              {items.map((item) => {
                                const isCompleted = item.status === "COMPLETED";
                                const isInProgress = item.status === "IN_PROGRESS";

                                return (
                                  <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => setActiveItemId(item.id)}
                                    className="flex w-full cursor-pointer items-start gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/30"
                                  >
                                    <span className="mt-0.5 shrink-0">
                                      {isCompleted ? (
                                        <CheckCircle2 className="size-4 fill-emerald-500/10 text-emerald-500" />
                                      ) : isInProgress ? (
                                        <Circle className="size-4 fill-amber-500 text-amber-500" />
                                      ) : (
                                        <Circle className="size-4 text-slate-300 dark:text-slate-700" />
                                      )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-[11.5px] font-bold text-foreground">
                                          {item.name}
                                        </span>
                                        {item.officer && (
                                          <span className="max-w-[150px] truncate text-[9px] font-medium text-muted-foreground">
                                            PJ: {item.officer}
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 text-[10px] font-medium text-muted-foreground/80">
                                        <span>{item.statusLabel}</span>
                                      </div>
                                      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                        {item.details.slice(0, 4).map((detail) => (
                                          <span
                                            key={`${item.id}-${detail.label}`}
                                            className="min-w-0 rounded border border-[var(--dc-border-subtle)]/70 bg-muted/10 px-2 py-1"
                                          >
                                            <span className="block text-[8px] font-bold uppercase tracking-wider text-muted-foreground">
                                              {detail.label}
                                            </span>
                                            <span className="block truncate text-[10px] font-semibold text-foreground">
                                              {detail.value}
                                            </span>
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {hasMoreActiveStageItems && (
                          <div className="py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Memuat data berikutnya...
                          </div>
                        )}
                        <div className="pb-1 text-center text-[10px] font-medium text-muted-foreground">
                          Menampilkan {visibleActiveStageItems?.length ?? 0} dari{" "}
                          {filteredActiveStageItems?.length ?? 0} record
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs italic text-muted-foreground">
                        {modalSearch.trim()
                          ? "Tidak ada record yang cocok dengan pencarian."
                          : "Tidak ada penerima aktif STR di tahap ini."}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function DirectiveTrackingFlow({
  directive,
  tracking,
  variant = "full",
}: {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
  variant?: "compact" | "full";
}) {
  return (
    <ReactFlowProvider>
      <TrackingFlowCanvas directive={directive} tracking={tracking} variant={variant} />
    </ReactFlowProvider>
  );
}
