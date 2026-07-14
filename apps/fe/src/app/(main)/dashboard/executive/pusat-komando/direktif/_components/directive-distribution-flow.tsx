"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
import { CheckCircle2, ChevronRight, CircleAlert, Clock3, FileText, GitBranch, Users, X } from "lucide-react";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import type { DirectiveDetail, DirectiveTracking, DirectiveTrackingAssignment } from "@/features/directives/types";
import { cn } from "@/lib/utils";

import { formatDate, getCurrentVersion } from "./directive-shared";

type StageStatus = "done" | "partial" | "pending" | "failed";

type StageDetail = {
  id: string;
  role: string;
  title: string;
  status: StageStatus;
  statusLabel: string;
  progress: number;
  stats: Array<{ label: string; value: string | number }>;
  items: Array<{ label: string; status: string }>;
};

type FlowNodeData = {
  stage: StageDetail;
  onSelect: (stageId: string) => void;
  isMobile: boolean;
};

type FlowNode = Node<FlowNodeData, "distribution-stage">;
type FlowEdge = Edge<{ status: StageStatus }>;

const STATUS_STYLES: Record<StageStatus, { border: string; icon: string; bar: string; label: string }> = {
  done: {
    border: "border-[var(--dc-success)]/70 bg-[var(--dc-success-soft)]/25",
    icon: "text-[var(--dc-success)]",
    bar: "bg-[var(--dc-success)]",
    label: "Selesai",
  },
  partial: {
    border: "border-[var(--dc-warning)]/70 bg-[var(--dc-warning-soft)]/25",
    icon: "text-[var(--dc-warning)]",
    bar: "bg-[var(--dc-warning)]",
    label: "Sebagian diproses",
  },
  pending: {
    border: "border-slate-300 bg-card dark:border-slate-600",
    icon: "text-slate-400 dark:text-slate-500",
    bar: "bg-slate-400 dark:bg-slate-600",
    label: "Belum diproses",
  },
  failed: {
    border: "border-[var(--dc-danger)]/70 bg-[var(--dc-danger-soft)]/20",
    icon: "text-[var(--dc-danger)]",
    bar: "bg-[var(--dc-danger)]",
    label: "Ditolak atau gagal",
  },
};

const STATUS_COLORS: Record<StageStatus, string> = {
  done: "var(--dc-success)",
  partial: "var(--dc-warning)",
  pending: "var(--dc-border)",
  failed: "var(--dc-danger)",
};

function statusFromCounts(total: number, completed: number, failed = 0): StageStatus {
  if (failed > 0 && completed === 0) return "failed";
  if (total <= 0 || completed <= 0) return failed > 0 ? "failed" : "pending";
  if (completed >= total && failed === 0) return "done";
  return "partial";
}

function percent(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function translateStatus(status: string) {
  const values: Record<string, string> = {
    ACKNOWLEDGED: "Sudah diterima",
    ACTIVE: "Aktif",
    ASSIGNED: "Ditugaskan",
    CANCELLED: "Dibatalkan",
    COMPLETED: "Selesai",
    DELIVERED: "Terkirim",
    FAILED: "Gagal",
    FORWARDED: "Sudah diteruskan",
    IN_PROGRESS: "Dalam proses",
    PUBLISHED: "Diterbitkan",
    READ: "Sudah dibaca",
    SENT: "Dikirim",
  };
  return values[status.toUpperCase()] ?? status;
}

function assignmentLabel(assignment: DirectiveTrackingAssignment, fallback: string) {
  return assignment.assignee?.fullName ?? assignment.assignee?.organizationUnitName ?? fallback;
}

function createStageDetails(directive: DirectiveDetail, tracking: DirectiveTracking): StageDetail[] {
  const version = getCurrentVersion(directive);
  const regional = tracking.stageSummary.regional;
  const regionalChains = tracking.regionalChains;
  const oimRead = regionalChains.filter((chain) => chain.oimStage.hasRead).length;
  const oimForwarded = regionalChains.filter((chain) => chain.oimStage.hasForwardedToFieldCoordinator).length;
  const oimTotal = regionalChains.length;
  const coordinator = tracking.stageSummary.fieldCoordinator;
  const fieldOfficer = tracking.stageSummary.korwil;
  const executiveComplete = ["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(directive.status);

  const allTasks = tracking.tasks?.length ? tracking.tasks : regionalChains.flatMap((chain) => chain.oimTasks ?? []);
  const allCoordinatorAssignments = allTasks.flatMap((task) => task.fieldCoordinatorAssignments ?? []);
  const allFieldOfficerAssignments = allCoordinatorAssignments.flatMap(
    (assignment) => assignment.downstreamAssignments ?? [],
  );

  return [
    {
      id: "executive",
      role: "Executive",
      title: "Pusat Komando",
      status: executiveComplete ? "done" : directive.status === "FAILED" ? "failed" : "pending",
      statusLabel: executiveComplete ? "Sudah dikirim" : translateStatus(directive.status),
      progress: executiveComplete ? 100 : 0,
      stats: [
        { label: "Pemberi perintah", value: version?.commandIssuer || "-" },
        { label: "Penerbit", value: directive.createdByAssignment?.userProfile?.fullName || "-" },
        { label: "Tanggal dibuat", value: version?.commandDate ? formatDate(version.commandDate) : "-" },
        {
          label: "Tanggal dikirim",
          value: regionalChains[0]?.regionalRecipient.sentAt
            ? formatDate(regionalChains[0].regionalRecipient.sentAt)
            : "-",
        },
      ],
      items: [],
    },
    {
      id: "regional",
      role: "Regional Commander",
      title: "Regional Commander",
      status: statusFromCounts(regional.totalRecipients, regional.forwardedCount, regional.failedCount),
      statusLabel:
        STATUS_STYLES[statusFromCounts(regional.totalRecipients, regional.forwardedCount, regional.failedCount)].label,
      progress: percent(regional.forwardedCount, regional.totalRecipients),
      stats: [
        { label: "Jumlah regional", value: regional.totalRecipients },
        { label: "Sudah membaca", value: regional.readCount },
        { label: "Belum membaca", value: Math.max(0, regional.totalRecipients - regional.readCount) },
        { label: "Sudah meneruskan", value: regional.forwardedCount },
      ],
      items: regionalChains.map((chain) => ({
        label:
          chain.regionalRecipient.targetUnit?.name ??
          chain.regionalRecipient.targetPosition?.organizationUnit?.name ??
          "Regional",
        status: translateStatus(chain.regionalRecipient.status),
      })),
    },
    {
      id: "oim",
      role: "Operational Intelligence Manager",
      title: "Operational Intelligence Manager",
      status: statusFromCounts(oimTotal, oimForwarded),
      statusLabel: STATUS_STYLES[statusFromCounts(oimTotal, oimForwarded)].label,
      progress: percent(oimForwarded, oimTotal),
      stats: [
        { label: "Jumlah OIM", value: oimTotal },
        { label: "Sudah menerima", value: oimRead },
        { label: "Belum menerima", value: Math.max(0, oimTotal - oimRead) },
        { label: "Sudah membuat tugas", value: tracking.stageSummary.oim.taskCount },
      ],
      items: regionalChains.map((chain) => ({
        label: chain.forwarding?.createdBy?.fullName ?? chain.forwarding?.ownerUnit?.name ?? "OIM",
        status: chain.oimStage.hasForwardedToFieldCoordinator
          ? "Sudah meneruskan"
          : chain.oimStage.hasRead
            ? "Sudah menerima"
            : "Belum menerima",
      })),
    },
    {
      id: "coordinator",
      role: "Field Coordinator",
      title: "Field Coordinator",
      status: statusFromCounts(coordinator.totalAssignments, coordinator.distributedCount),
      statusLabel: STATUS_STYLES[statusFromCounts(coordinator.totalAssignments, coordinator.distributedCount)].label,
      progress: percent(coordinator.distributedCount, coordinator.totalAssignments),
      stats: [
        { label: "Jumlah FC", value: coordinator.totalAssignments },
        { label: "Sudah menerima", value: coordinator.readCount },
        { label: "Sudah meneruskan", value: coordinator.distributedCount },
        { label: "Belum meneruskan", value: Math.max(0, coordinator.totalAssignments - coordinator.distributedCount) },
      ],
      items: allCoordinatorAssignments.map((assignment) => ({
        label: assignmentLabel(assignment, "Field Coordinator"),
        status: translateStatus(assignment.status),
      })),
    },
    {
      id: "officer",
      role: "Field Officer",
      title: "Field Officer",
      status: statusFromCounts(fieldOfficer.total, fieldOfficer.completed, fieldOfficer.cancelled),
      statusLabel:
        STATUS_STYLES[statusFromCounts(fieldOfficer.total, fieldOfficer.completed, fieldOfficer.cancelled)].label,
      progress: percent(fieldOfficer.completed, fieldOfficer.total),
      stats: [
        { label: "Jumlah FO", value: fieldOfficer.total },
        { label: "Sudah menerima", value: fieldOfficer.sent },
        { label: "Sudah membaca", value: fieldOfficer.read },
        { label: "Sudah ACK", value: fieldOfficer.acknowledged },
        { label: "Sudah menyelesaikan", value: fieldOfficer.completed },
        { label: "Belum menyelesaikan", value: Math.max(0, fieldOfficer.total - fieldOfficer.completed) },
      ],
      items: allFieldOfficerAssignments.map((assignment) => ({
        label: assignmentLabel(assignment, "Field Officer"),
        status: translateStatus(assignment.status),
      })),
    },
  ];
}

function DistributionNode({ data }: NodeProps<FlowNode>) {
  const style = STATUS_STYLES[data.stage.status];
  const Icon = data.stage.status === "done" ? CheckCircle2 : data.stage.status === "failed" ? CircleAlert : Clock3;
  const targetPosition = data.isMobile ? Position.Top : Position.Left;
  const sourcePosition = data.isMobile ? Position.Bottom : Position.Right;

  return (
    <>
      <Handle type="target" position={targetPosition} className="!size-2 !border-background !bg-muted-foreground" />
      <button
        type="button"
        onClick={() => data.onSelect(data.stage.id)}
        className={cn(
          "group flex h-[116px] w-[205px] cursor-pointer flex-col rounded-lg border bg-card p-3 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg",
          style.border,
        )}
        aria-label={`Lihat detail ${data.stage.role}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background">
            <GitBranch className={cn("size-4", style.icon)} />
          </span>
          <Icon className={cn("size-4", style.icon)} />
        </div>
        <p className="mt-2 line-clamp-1 text-[11px] font-semibold text-foreground">{data.stage.title}</p>
        <p className="mt-0.5 line-clamp-1 text-[9px] text-muted-foreground">{data.stage.role}</p>
        <div className="mt-auto flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full transition-all", style.bar)} style={{ width: `${data.stage.progress}%` }} />
          </div>
          <span className={cn("text-[9px] font-semibold", style.icon)}>{data.stage.progress}%</span>
        </div>
        <p className="mt-1 truncate text-[9px] text-muted-foreground">{data.stage.statusLabel}</p>
      </button>
      <Handle type="source" position={sourcePosition} className="!size-2 !border-background !bg-muted-foreground" />
    </>
  );
}

const NODE_TYPES = { "distribution-stage": DistributionNode };

function StageDialog({ stage, onClose }: { stage: StageDetail; onClose: () => void }) {
  const style = STATUS_STYLES[stage.status];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div role="presentation" className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="distribution-stage-title"
        className="max-h-[min(680px,calc(100vh-32px))] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{stage.role}</p>
            <h2 id="distribution-stage-title" className="mt-1 text-lg font-semibold text-foreground">
              {stage.title}
            </h2>
            <Badge variant="outline" className={cn("mt-2 text-[10px]", style.icon)}>
              {stage.statusLabel}
            </Badge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Tutup detail"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="max-h-[calc(100vh-180px)] space-y-5 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stage.stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-background p-3">
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-base font-semibold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Daftar personel atau unit</p>
              <span className="text-[10px] text-muted-foreground">{stage.items.length} data</span>
            </div>
            {stage.items.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {stage.items.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Users className="size-4 shrink-0 text-primary" />
                      <span className="truncate text-xs text-foreground">{item.label}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{item.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                Belum ada data distribusi untuk tahap ini.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function DistributionFlowCanvas({ stages }: { stages: StageDetail[] }) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const { fitView } = useReactFlow<FlowNode, FlowEdge>();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const selectStage = useCallback((stageId: string) => setSelectedStageId(stageId), []);
  const flowNodes = useMemo<FlowNode[]>(
    () =>
      stages.map((stage, index) => ({
        id: stage.id,
        type: "distribution-stage",
        position: isMobile ? { x: 45, y: index * 165 } : { x: index * 250, y: 84 },
        data: { stage, onSelect: selectStage, isMobile },
        draggable: false,
        selectable: true,
      })),
    [isMobile, selectStage, stages],
  );
  const flowEdges = useMemo<FlowEdge[]>(
    () =>
      stages.slice(0, -1).map((stage, index) => {
        const nextStage = stages[index + 1];
        const active = stage.status === "done";
        const processing = stage.status === "partial";
        return {
          id: `${stage.id}-${nextStage.id}`,
          source: stage.id,
          target: nextStage.id,
          type: "straight",
          animated: processing,
          markerEnd: { type: MarkerType.ArrowClosed, color: active ? "var(--dc-success)" : "var(--dc-border)" },
          style: {
            stroke: active ? "var(--dc-success)" : processing ? "var(--dc-warning)" : "var(--dc-border)",
            strokeWidth: 2,
          },
        };
      }),
    [stages],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void fitView({ duration: 300, maxZoom: 1.1, minZoom: 0.65, nodes: flowNodes, padding: 0.2 });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [fitView, flowNodes]);

  const selectedStage = selectedStageId ? stages.find((stage) => stage.id === selectedStageId) : null;

  return (
    <>
      <div className="h-[420px] overflow-hidden rounded-lg border border-border bg-background">
        <ReactFlow<FlowNode, FlowEdge>
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          fitView={false}
          minZoom={0.55}
          maxZoom={1.2}
          proOptions={{ hideAttribution: true }}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          onNodeClick={(_, node) => setSelectedStageId(node.id)}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color={resolvedTheme === "dark" ? "#475569" : "#cbd5e1"}
            className="opacity-[0.15] dark:opacity-[0.1]"
          />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>

      {selectedStage ? <StageDialog stage={selectedStage} onClose={() => setSelectedStageId(null)} /> : null}
    </>
  );
}

export function DirectiveDistributionFlow({
  directive,
  tracking,
}: {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
}) {
  const stages = useMemo(() => createStageDetails(directive, tracking), [directive, tracking]);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <FileText className="size-4" />
            Alur Distribusi STR
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Perjalanan satu STR dari pemberi perintah sampai Field Officer.
          </p>
        </div>
        <ChevronRight className="mt-1 hidden size-5 text-muted-foreground sm:block" />
      </header>
      <ReactFlowProvider>
        <DistributionFlowCanvas stages={stages} />
      </ReactFlowProvider>
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        {Object.entries(STATUS_STYLES).map(([status, style]) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", style.bar)} />
            {style.label}
          </span>
        ))}
      </div>
    </section>
  );
}
