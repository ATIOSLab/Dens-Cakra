// biome-ignore-all lint/nursery/useSortedClasses: Preserves selected finalkalife UI class composition.

"use client";

import { memo, useEffect, useMemo, useState } from "react";

import {
  Background,
  BackgroundVariant,
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
import { Building2, CheckCircle2, Circle, type LucideIcon, RadioTower, Shield, UserRound, Users } from "lucide-react";

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
type PipelineStatus = "COMPLETED" | "IN_PROGRESS" | "PENDING";

type PipelineDetail = {
  label: string;
  value: string;
};

type PipelineItem = {
  id: string;
  parentId?: string | null;
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
};

type PipelineReactFlowNode = Node<PipelineNodeData, "pipeline">;

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
const ACTIVE_STATUSES = new Set(["READ", "ACKNOWLEDGED", "IN_PROGRESS", "REASSIGNED", "SENT"]);

function PipelineNodeCard({ data }: NodeProps<PipelineReactFlowNode>) {
  const { label, subtitle, status, progressPercent, progressText, icon: Icon, onClick } = data;
  const style = statusColors[status];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-[104px] w-[220px] cursor-pointer select-none flex-col justify-between rounded-lg border bg-[var(--dc-card)] p-4 text-left shadow-[0_4px_16px_rgba(0,0,0,0.06)] outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(0,0,0,0.12)] active:scale-[0.98]",
        style.border,
        style.bg,
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
const NODE_TYPES = { pipeline: MemoPipelineNodeCard };

function normalizeStatus(status?: string | null) {
  return status?.trim().toUpperCase() ?? "";
}

function cleanRegionName(name?: string | null) {
  const cleaned = name?.replace(/^(binda|direktorat wilayah|field coordination unit)\s+/i, "").trim();

  return cleaned || "Wilayah lainnya";
}

function detailValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
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
  if (failed) return { status: "PENDING", statusLabel: pendingLabel };
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
    return { status: "PENDING", statusLabel: "Belum diproses" };
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

  let status: PipelineStatus = "PENDING";
  if (total > 0 && completed === total) status = "COMPLETED";
  else if (completed > 0 || inProgress > 0) status = "IN_PROGRESS";

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
};

function TrackingFlowCanvas({ directive, tracking }: TrackingFlowCanvasProps) {
  const [activeStage, setActiveStage] = useState<PipelineStageId | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const { fitView } = useReactFlow();

  const currentVersion = getCurrentVersion(directive);
  const uukTitle = currentVersion?.strategicIssue || "STR / Direktif Strategis";

  const hierarchyData = useMemo(() => {
    const regionalList: PipelineItem[] = [];
    const oimList: PipelineItem[] = [];
    const coordinatorList: PipelineItem[] = [];
    const officerList: PipelineItem[] = [];

    for (const chain of tracking.regionalChains) {
      const recipient = chain.regionalRecipient;
      const regionName = cleanRegionName(
        recipient.targetUnit?.name || recipient.targetPosition?.organizationUnit?.name,
      );
      const recipientStatus = normalizeStatus(recipient.status);
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
        name:
          recipient.targetPosition?.assigneeName ||
          recipient.targetPosition?.title ||
          recipient.targetUnit?.name ||
          "Regional Commander",
        ...regionalState,
        readAt: recipient.readAt,
        acknowledgedAt: recipient.acknowledgedAt,
        forwardedAt: chain.forwarding?.createdAt,
        officer: recipient.targetUnit?.name || recipient.targetPosition?.organizationUnit?.name,
        groupName: regionName,
        details: [
          { label: "Nama penerima", value: detailValue(recipient.targetPosition?.assigneeName) },
          { label: "Username", value: detailValue(recipient.targetPosition?.assigneeUsername) },
          { label: "Jabatan", value: detailValue(recipient.targetPosition?.title) },
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
          { label: "Diteruskan", value: formatDate(chain.forwarding?.createdAt) },
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
          oimList.push({
            id: actor?.assignmentId || chain.forwarding?.id || `oim:${recipient.id}`,
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

          coordinatorList.push({
            id: coordinator.id,
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
              { label: "Role", value: detailValue(coordinator.assignee?.roleCode) },
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
              { label: "Catatan assignment", value: detailValue(coordinator.assignmentNote) },
            ],
          });

          for (const officer of coordinator.downstreamAssignments ?? []) {
            const officerState = assignmentStatus(officer);
            const officerArea = primaryAreaName(officer, task, coordinatorArea);

            officerList.push({
              id: officer.id,
              parentId: coordinator.id,
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
                { label: "Role", value: detailValue(officer.assignee?.roleCode) },
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
                { label: "Catatan assignment", value: detailValue(officer.assignmentNote) },
              ],
            });
          }
        }
      }
    }

    return {
      regional: deduplicateItems(regionalList),
      oim: deduplicateItems(oimList),
      coordinator: deduplicateItems(coordinatorList),
      officer: deduplicateItems(officerList),
    };
  }, [tracking.regionalChains]);

  const stagesData = useMemo(() => {
    const directiveStatus = normalizeStatus(directive.status);
    const executiveFailed = FAILURE_STATUSES.has(directiveStatus);
    const executiveCompleted = !["", "DRAFT"].includes(directiveStatus) && !executiveFailed;
    let executiveStatus: PipelineStatus = "PENDING";
    if (executiveCompleted) executiveStatus = "COMPLETED";

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

  const stageDefinitions = useMemo(
    () =>
      [
        { id: "executive", label: "Pusat Komando", subtitle: "Executive Command", icon: Shield },
        { id: "regional", label: "Regional Commander", subtitle: "Regional Headquarter", icon: Building2 },
        { id: "oim", label: "OIM Unit", subtitle: "Intelligence Manager", icon: RadioTower },
        { id: "coordinator", label: "Field Coordinator", subtitle: "Operations Lead", icon: Users },
        { id: "officer", label: "Field Officer", subtitle: "Agen / Korwil Lapangan", icon: UserRound },
      ] satisfies Array<{ id: PipelineStageId; label: string; subtitle: string; icon: LucideIcon }>,
    [],
  );

  const summaryFlowNodes = useMemo<PipelineReactFlowNode[]>(() => {
    const list: Array<{ id: PipelineStageId; label: string; subtitle: string; icon: LucideIcon; x: number }> = [
      { id: "executive", label: "Pusat Komando", subtitle: "Executive Command", icon: Shield, x: 80 },
      { id: "regional", label: "Regional Commander", subtitle: "Regional Headquarter", icon: Building2, x: 360 },
      { id: "oim", label: "OIM Unit", subtitle: "Intelligence Manager", icon: RadioTower, x: 640 },
      { id: "coordinator", label: "Field Coordinator", subtitle: "Operations Lead", icon: Users, x: 920 },
      { id: "officer", label: "Field Officer", subtitle: "Agen / Korwil Lapangan", icon: UserRound, x: 1200 },
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
        },
      },
    }));
  }, [stagesData]);

  const flowNodes = useMemo<PipelineReactFlowNode[]>(() => {
    const coordinatorItems = hierarchyData.coordinator;
    const officerItems = hierarchyData.officer;
    const officersByCoordinator = new Map<string, PipelineItem[]>();

    for (const officer of officerItems) {
      if (!officer.parentId) continue;
      const list = officersByCoordinator.get(officer.parentId) ?? [];
      list.push(officer);
      officersByCoordinator.set(officer.parentId, list);
    }

    const coordinatorPositions = new Map<string, number>();
    const officerPositions = new Map<string, { x: number; y: number }>();
    let cursorY = 80;

    for (const coordinator of coordinatorItems) {
      const children = officersByCoordinator.get(coordinator.id) ?? [];

      if (children.length > 0) {
        const maxRowsPerCoordinator = 4;
        const rowCount = Math.min(maxRowsPerCoordinator, children.length);
        const rowGap = 112;
        const columnGap = 260;
        const groupHeight = (rowCount - 1) * rowGap;
        children.forEach((child, index) => {
          const row = index % maxRowsPerCoordinator;
          const column = Math.floor(index / maxRowsPerCoordinator);
          const y = cursorY + row * rowGap;
          officerPositions.set(child.id, { x: 1200 + column * columnGap, y });
        });
        coordinatorPositions.set(coordinator.id, cursorY + groupHeight / 2);
        cursorY += Math.max(152, groupHeight + 172);
      } else {
        coordinatorPositions.set(coordinator.id, cursorY);
        cursorY += 136;
      }
    }

    const graphCenterY =
      coordinatorItems.length > 0
        ? Array.from(coordinatorPositions.values()).reduce((sum, y) => sum + y, 0) / coordinatorItems.length
        : 180;

    const stageNodes: PipelineReactFlowNode[] = stageDefinitions.slice(0, 3).map((item, index) => ({
      id: item.id,
      type: "pipeline",
      position: { x: 80 + index * 280, y: graphCenterY },
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
        },
      },
    }));

    const coordinatorNodes: PipelineReactFlowNode[] = coordinatorItems.map((item) => ({
      id: `coordinator-${item.id}`,
      type: "pipeline",
      position: { x: 920, y: coordinatorPositions.get(item.id) ?? graphCenterY },
      draggable: false,
      selectable: false,
      data: {
        label: item.name,
        subtitle: item.officer || item.groupName || "Field Coordinator",
        status: item.status,
        progressPercent: itemProgress(item.status),
        progressText: item.statusLabel,
        icon: Users,
        onClick: () => {
          setActiveStage("coordinator");
          setActiveItemId(item.id);
        },
      },
    }));

    const officerNodes: PipelineReactFlowNode[] = officerItems.map((item) => ({
      id: `officer-${item.id}`,
      type: "pipeline",
      position: officerPositions.get(item.id) ?? { x: 1200, y: graphCenterY },
      draggable: false,
      selectable: false,
      data: {
        label: item.name,
        subtitle: item.officer || item.groupName || "Field Officer",
        status: item.status,
        progressPercent: itemProgress(item.status),
        progressText: item.statusLabel,
        icon: UserRound,
        onClick: () => {
          setActiveStage("officer");
          setActiveItemId(item.id);
        },
      },
    }));

    return [...stageNodes, ...coordinatorNodes, ...officerNodes];
  }, [hierarchyData, stageDefinitions, stagesData]);

  const flowEdges = useMemo<Edge[]>(() => {
    const summaryEdges: Array<{ source: PipelineStageId; target: PipelineStageId }> = [
      { source: "executive", target: "regional" },
      { source: "regional", target: "oim" },
    ];

    const edges: Edge[] = summaryEdges.map((edge) => {
      const sourceStatus = stagesData[edge.source].status;
      const color = statusColors[sourceStatus].edgeColor;

      return {
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "straight",
        animated: sourceStatus === "IN_PROGRESS" || sourceStatus === "COMPLETED",
        style: {
          stroke: color,
          strokeWidth: sourceStatus === "COMPLETED" ? 3.5 : 2,
          opacity: sourceStatus === "PENDING" ? 0.35 : 0.9,
          filter: `drop-shadow(0 0 3px ${color}55)`,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color,
        },
      };
    });

    for (const coordinator of hierarchyData.coordinator) {
      const sourceStatus = coordinator.status;
      const color = statusColors[sourceStatus].edgeColor;

      edges.push({
        id: `oim-coordinator-${coordinator.id}`,
        source: "oim",
        target: `coordinator-${coordinator.id}`,
        type: "smoothstep",
        animated: sourceStatus === "IN_PROGRESS" || sourceStatus === "COMPLETED",
        style: {
          stroke: color,
          strokeWidth: sourceStatus === "COMPLETED" ? 3 : 2,
          opacity: sourceStatus === "PENDING" ? 0.35 : 0.85,
          filter: `drop-shadow(0 0 3px ${color}55)`,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color,
        },
      });
    }

    for (const officer of hierarchyData.officer) {
      if (!officer.parentId) continue;
      const sourceStatus = officer.status;
      const color = statusColors[sourceStatus].edgeColor;

      edges.push({
        id: `coordinator-${officer.parentId}-officer-${officer.id}`,
        source: `coordinator-${officer.parentId}`,
        target: `officer-${officer.id}`,
        type: "smoothstep",
        animated: sourceStatus === "IN_PROGRESS" || sourceStatus === "COMPLETED",
        style: {
          stroke: color,
          strokeWidth: sourceStatus === "COMPLETED" ? 3 : 2,
          opacity: sourceStatus === "PENDING" ? 0.35 : 0.85,
          filter: `drop-shadow(0 0 3px ${color}55)`,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color,
        },
      });
    }

    return edges;
  }, [hierarchyData, stagesData]);

  const [nodes, setNodes] = useNodesState<PipelineReactFlowNode>(flowNodes);
  const [edges, setEdges] = useEdgesState(flowEdges);

  useEffect(() => setNodes(flowNodes), [flowNodes, setNodes]);
  useEffect(() => setEdges(flowEdges), [flowEdges, setEdges]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      fitView({
        padding: 0.18,
        minZoom: 0.42,
        maxZoom: 1.05,
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView]);

  const activeStageGroupedItems = useMemo(() => {
    if (!activeStage) return null;

    const listMap = {
      executive: [] as PipelineItem[],
      regional: hierarchyData.regional,
      oim: hierarchyData.oim,
      coordinator: hierarchyData.coordinator,
      officer: hierarchyData.officer,
    };

    const items = listMap[activeStage];
    if (items.length === 0) return null;

    const groups: Record<string, PipelineItem[]> = {};
    for (const item of items) {
      if (!groups[item.groupName]) groups[item.groupName] = [];
      groups[item.groupName].push(item);
    }
    return groups;
  }, [activeStage, hierarchyData]);

  const activeSelectedItem = useMemo(() => {
    if (!activeStage || !activeItemId) return null;

    const listMap = {
      executive: [] as PipelineItem[],
      regional: hierarchyData.regional,
      oim: hierarchyData.oim,
      coordinator: hierarchyData.coordinator,
      officer: hierarchyData.officer,
    };

    return listMap[activeStage].find((item) => item.id === activeItemId) ?? null;
  }, [activeItemId, activeStage, hierarchyData]);

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
        <CardContent className="relative h-[560px] min-h-[420px] bg-slate-50/20 p-0 dark:bg-black/5">
          <ReactFlow<PipelineReactFlowNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            fitViewOptions={{
              padding: 0.18,
              minZoom: 0.42,
              maxZoom: 1.05,
            }}
            proOptions={{ hideAttribution: true }}
            colorMode="system"
          >
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
          }
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col border-[var(--dc-border-subtle)] bg-[var(--dc-card)] text-foreground outline-none sm:max-w-[640px]">
          {activeStage &&
            (() => {
              const stagesPopupMeta = {
                executive: {
                  title: "Pusat Komando (Executive)",
                  desc: "Titik awal penerbitan direktif strategis oleh pimpinan pusat.",
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
                  title: "Regional Commander",
                  desc: "Daftar Regional Commander penerima dokumen STR aktif ini.",
                  details: [],
                  instructions: null,
                },
                oim: {
                  title: "Operational Intelligence Manager (OIM)",
                  desc: "Daftar unit OIM Wilayah yang menjabarkan penugasan STR aktif ini.",
                  details: [],
                  instructions: null,
                },
                coordinator: {
                  title: "Field Coordinator",
                  desc: "Daftar koordinator lapangan penanggung jawab instruksi taktis STR ini.",
                  details: [],
                  instructions: null,
                },
                officer: {
                  title: "Field Officer (Agen / Korwil)",
                  desc: "Daftar agen lapangan pelaksana operasi taktis STR ini.",
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

                  <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-[11.5px]">
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
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs italic text-muted-foreground">
                        Tidak ada penerima aktif STR di tahap ini.
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
}: {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
}) {
  return (
    <ReactFlowProvider>
      <TrackingFlowCanvas directive={directive} tracking={tracking} />
    </ReactFlowProvider>
  );
}
