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
  animationClass?: string;
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

const _STATUS_COLORS: Record<StageStatus, string> = {
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
  const regionalChains = tracking.regionalChains;
  const executiveComplete = ["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(directive.status);

  // Partition chains into Binda and Direktorat Wilayah branches
  const bindaChains = regionalChains.filter((chain) => {
    const name = (
      chain.regionalRecipient.targetUnit?.name ||
      chain.regionalRecipient.targetPosition?.organizationUnit?.name ||
      ""
    ).toUpperCase();
    const seatCode = (chain.regionalRecipient.targetPosition?.seatCode || "").toUpperCase();
    const roleCode = (chain.regionalRecipient.targetPosition?.role?.code || "").toUpperCase();
    return (
      name.includes("BINDA") ||
      seatCode.includes("KABINDA") ||
      roleCode.includes("KABINDA") ||
      seatCode.includes("KABAGOPS") ||
      seatCode.includes("KORWIL")
    );
  });

  const direktoratChains = regionalChains.filter((chain) => !bindaChains.includes(chain));

  // 1. BINDA Branch Stats
  const regionalBindaCount = bindaChains.length;
  const regionalBindaRead = bindaChains.filter((c) => c.regionalRecipient.readAt).length;
  const regionalBindaForwarded = bindaChains.filter((c) => c.forwarding).length;
  const regionalBindaFailed = bindaChains.filter((c) => c.regionalRecipient.status === "FAILED").length;

  const oimBindaRead = bindaChains.filter((c) => c.oimStage.hasRead).length;
  const oimBindaForwarded = bindaChains.filter((c) => c.oimStage.hasForwardedToFieldCoordinator).length;

  const bindaTasks = bindaChains.flatMap((c) => c.oimTasks ?? []);
  const bindaCoordinators = bindaTasks.flatMap((t) => t.fieldCoordinatorAssignments ?? []);
  const bindaOfficers = bindaCoordinators.flatMap((c) => c.downstreamAssignments ?? []);
  const bindaOfficersCompleted = bindaOfficers.filter((c) => c.status === "COMPLETED").length;

  // 2. DIREKTORAT Branch Stats
  const regionalDirCount = direktoratChains.length;
  const regionalDirRead = direktoratChains.filter((c) => c.regionalRecipient.readAt).length;
  const regionalDirForwarded = direktoratChains.filter((c) => c.forwarding).length;
  const regionalDirFailed = direktoratChains.filter((c) => c.regionalRecipient.status === "FAILED").length;

  const oimDirRead = direktoratChains.filter((c) => c.oimStage.hasRead).length;
  const oimDirForwarded = direktoratChains.filter((c) => c.oimStage.hasForwardedToFieldCoordinator).length;

  const dirTasks = direktoratChains.flatMap((c) => c.oimTasks ?? []);
  const dirCoordinators = dirTasks.flatMap((t) => t.fieldCoordinatorAssignments ?? []);
  const dirOfficers = dirCoordinators.flatMap((c) => c.downstreamAssignments ?? []);
  const dirOfficersCompleted = dirOfficers.filter((c) => c.status === "COMPLETED").length;

  return [
    {
      id: "executive",
      role: "Executive",
      title: "Deputi II",
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
    // ==========================================
    // KABINDA / BINDA BRANCH (Top Row)
    // ==========================================
    {
      id: "regional_binda",
      role: "Regional Commander",
      title: "Kabinda",
      status: statusFromCounts(regionalBindaCount, regionalBindaForwarded, regionalBindaFailed),
      statusLabel:
        STATUS_STYLES[statusFromCounts(regionalBindaCount, regionalBindaForwarded, regionalBindaFailed)].label,
      progress: percent(regionalBindaForwarded, regionalBindaCount),
      stats: [
        { label: "Jumlah Kabinda", value: regionalBindaCount },
        { label: "Sudah membaca", value: regionalBindaRead },
        { label: "Belum membaca", value: Math.max(0, regionalBindaCount - regionalBindaRead) },
        { label: "Sudah meneruskan", value: regionalBindaForwarded },
      ],
      items: bindaChains.map((c) => ({
        label:
          c.regionalRecipient.targetPosition?.organizationUnit?.name ??
          c.regionalRecipient.targetUnit?.name ??
          "Kabinda",
        status: translateStatus(c.regionalRecipient.status),
      })),
    },
    {
      id: "oim_binda",
      role: "Operational Intelligence Manager",
      title: "OIM Binda",
      status: statusFromCounts(regionalBindaCount, oimBindaForwarded),
      statusLabel: STATUS_STYLES[statusFromCounts(regionalBindaCount, oimBindaForwarded)].label,
      progress: percent(oimBindaForwarded, regionalBindaCount),
      stats: [
        { label: "Jumlah OIM", value: regionalBindaCount },
        { label: "Sudah menerima", value: oimBindaRead },
        { label: "Belum menerima", value: Math.max(0, regionalBindaCount - oimBindaRead) },
        { label: "Sudah meneruskan", value: oimBindaForwarded },
      ],
      items: bindaChains.map((c) => ({
        label: c.forwarding?.ownerUnit?.name ?? c.forwarding?.createdBy?.organizationUnitName ?? "OIM Binda",
        status: c.oimStage.hasForwardedToFieldCoordinator ? "Sudah meneruskan" : "Belum meneruskan",
      })),
    },
    {
      id: "coordinator_binda",
      role: "Field Coordinator",
      title: "Kabagops",
      status: statusFromCounts(
        bindaCoordinators.length,
        bindaCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
      ),
      statusLabel:
        STATUS_STYLES[
          statusFromCounts(
            bindaCoordinators.length,
            bindaCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
          )
        ].label,
      progress: percent(
        bindaCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
        bindaCoordinators.length,
      ),
      stats: [
        { label: "Jumlah Kabagops", value: bindaCoordinators.length },
        {
          label: "Sudah meneruskan",
          value: bindaCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
        },
      ],
      items: bindaCoordinators.map((c) => ({
        label: c.assignee?.organizationUnitName ?? c.assignee?.fullName ?? "Kabagops",
        status: translateStatus(c.status),
      })),
    },
    {
      id: "officer_binda",
      role: "Field Officer",
      title: "Korwil",
      status: statusFromCounts(bindaOfficers.length, bindaOfficersCompleted),
      statusLabel: STATUS_STYLES[statusFromCounts(bindaOfficers.length, bindaOfficersCompleted)].label,
      progress: percent(bindaOfficersCompleted, bindaOfficers.length),
      stats: [
        { label: "Jumlah Korwil", value: bindaOfficers.length },
        { label: "Sudah menyelesaikan", value: bindaOfficersCompleted },
      ],
      items: bindaOfficers.map((c) => ({
        label: c.assignee?.organizationUnitName ?? c.assignee?.fullName ?? "Korwil",
        status: translateStatus(c.status),
      })),
    },
    // ==========================================
    // DIREKTORAT WILAYAH BRANCH (Bottom Row)
    // ==========================================
    {
      id: "regional_dir",
      role: "Regional Commander",
      title: "Direktur Wilayah",
      status: statusFromCounts(regionalDirCount, regionalDirForwarded, regionalDirFailed),
      statusLabel: STATUS_STYLES[statusFromCounts(regionalDirCount, regionalDirForwarded, regionalDirFailed)].label,
      progress: percent(regionalDirForwarded, regionalDirCount),
      stats: [
        { label: "Jumlah Direktur", value: regionalDirCount },
        { label: "Sudah membaca", value: regionalDirRead },
        { label: "Belum membaca", value: Math.max(0, regionalDirCount - regionalDirRead) },
        { label: "Sudah meneruskan", value: regionalDirForwarded },
      ],
      items: direktoratChains.map((c) => ({
        label:
          c.regionalRecipient.targetPosition?.organizationUnit?.name ??
          c.regionalRecipient.targetUnit?.name ??
          "Direktur Wilayah",
        status: translateStatus(c.regionalRecipient.status),
      })),
    },
    {
      id: "oim_dir",
      role: "Operational Intelligence Manager",
      title: "OIM Direktorat",
      status: statusFromCounts(regionalDirCount, oimDirForwarded),
      statusLabel: STATUS_STYLES[statusFromCounts(regionalDirCount, oimDirForwarded)].label,
      progress: percent(oimDirForwarded, regionalDirCount),
      stats: [
        { label: "Jumlah OIM", value: regionalDirCount },
        { label: "Sudah menerima", value: oimDirRead },
        { label: "Belum menerima", value: Math.max(0, regionalDirCount - oimDirRead) },
        { label: "Sudah meneruskan", value: oimDirForwarded },
      ],
      items: direktoratChains.map((c) => ({
        label: c.forwarding?.ownerUnit?.name ?? c.forwarding?.createdBy?.organizationUnitName ?? "OIM Direktorat",
        status: c.oimStage.hasForwardedToFieldCoordinator ? "Sudah meneruskan" : "Belum meneruskan",
      })),
    },
    {
      id: "coordinator_dir",
      role: "Field Coordinator",
      title: "Staf Subdit",
      status: statusFromCounts(
        dirCoordinators.length,
        dirCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
      ),
      statusLabel:
        STATUS_STYLES[
          statusFromCounts(
            dirCoordinators.length,
            dirCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
          )
        ].label,
      progress: percent(
        dirCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
        dirCoordinators.length,
      ),
      stats: [
        { label: "Jumlah Staf Subdit", value: dirCoordinators.length },
        {
          label: "Sudah meneruskan",
          value: dirCoordinators.filter((c) => ["COMPLETED", "DISTRIBUTED"].includes(c.status)).length,
        },
      ],
      items: dirCoordinators.map((c) => ({
        label: c.assignee?.organizationUnitName ?? c.assignee?.fullName ?? "Staf Subdit",
        status: translateStatus(c.status),
      })),
    },
    {
      id: "officer_dir",
      role: "Field Officer",
      title: "Agen",
      status: statusFromCounts(dirOfficers.length, dirOfficersCompleted),
      statusLabel: STATUS_STYLES[statusFromCounts(dirOfficers.length, dirOfficersCompleted)].label,
      progress: percent(dirOfficersCompleted, dirOfficers.length),
      stats: [
        { label: "Jumlah Agen", value: dirOfficers.length },
        { label: "Sudah menyelesaikan", value: dirOfficersCompleted },
      ],
      items: dirOfficers.map((c) => ({
        label: c.assignee?.organizationUnitName ?? c.assignee?.fullName ?? "Agen",
        status: translateStatus(c.status),
      })),
    },
  ];
}

function DistributionNode({ data }: NodeProps<FlowNode>) {
  let resolvedStatus = data.stage.status;
  if (data.animationClass === "flow-node-completed") {
    resolvedStatus = "done";
  } else if (data.animationClass === "flow-node-active") {
    resolvedStatus = "done";
  } else if (data.animationClass === "flow-node-processing") {
    resolvedStatus = "partial";
  } else if (data.animationClass === "flow-node-rejected") {
    resolvedStatus = "failed";
  } else if (data.animationClass === "flow-node-waiting") {
    resolvedStatus = "pending";
  }

  const style = STATUS_STYLES[resolvedStatus];
  const Icon = resolvedStatus === "done" ? CheckCircle2 : resolvedStatus === "failed" ? CircleAlert : Clock3;
  const targetPosition = data.isMobile ? Position.Top : Position.Left;
  const sourcePosition = data.isMobile ? Position.Bottom : Position.Right;

  return (
    <>
      <Handle type="target" position={targetPosition} className="!size-2 !border-background !bg-muted-foreground" />
      <button
        type="button"
        onClick={() => data.onSelect(data.stage.id)}
        className={cn(
          "group flex h-[128px] w-[205px] cursor-pointer flex-col rounded-lg border bg-card p-3 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg",
          style.border,
          data.animationClass,
        )}
        aria-label={`Lihat detail ${data.stage.role}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-background">
            <GitBranch className={cn("size-4", style.icon)} />
          </span>
          <Icon className={cn("size-4", style.icon)} />
        </div>
        <p className="mt-2 line-clamp-1 shrink-0 font-semibold text-[11px] text-foreground">{data.stage.title}</p>
        <p className="mt-0.5 line-clamp-1 shrink-0 text-[9px] text-muted-foreground">{data.stage.role}</p>
        <div className="mt-auto flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className={cn("h-full transition-all", style.bar)} style={{ width: `${data.stage.progress}%` }} />
          </div>
          <span className={cn("font-semibold text-[9px]", style.icon)}>{data.stage.progress}%</span>
        </div>
        <p className="mt-1 shrink-0 truncate text-[9px] text-muted-foreground">{data.stage.statusLabel}</p>
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
        <header className="flex items-start justify-between gap-4 border-border border-b p-5">
          <div>
            <p className="font-semibold text-[10px] text-primary uppercase tracking-wider">{stage.role}</p>
            <h2 id="distribution-stage-title" className="mt-1 font-semibold text-foreground text-lg">
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
                <p className="mt-1 font-semibold text-base text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-foreground text-xs">Daftar personel atau unit</p>
              <span className="text-[10px] text-muted-foreground">{stage.items.length} data</span>
            </div>
            {stage.items.length > 0 ? (
              <div className="divide-y divide-border rounded-lg border border-border">
                {stage.items.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-3 p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Users className="size-4 shrink-0 text-primary" />
                      <span className="truncate text-foreground text-xs">{item.label}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{item.status}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border border-dashed p-6 text-center text-muted-foreground text-xs">
                Belum ada data distribusi untuk tahap ini.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function findActiveStageIndex(stageIds: string[], stages: StageDetail[]): number {
  // Scan from right (furthest stage) to left (earliest stage)
  for (let i = stageIds.length - 1; i >= 0; i--) {
    const stage = stages.find((s) => s.id === stageIds[i]);
    if (
      stage &&
      (stage.status === "done" || stage.status === "partial" || stage.status === "failed" || stage.progress > 0)
    ) {
      return i;
    }
  }
  return 0; // Default to regional stage
}

function DistributionFlowCanvas({ stages }: { stages: StageDetail[] }) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { resolvedTheme } = useTheme();
  const { fitView } = useReactFlow<FlowNode, FlowEdge>();
  const nodeTypes = useMemo(() => NODE_TYPES, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  const selectStage = useCallback((stageId: string) => setSelectedStageId(stageId), []);
  const flowNodes = useMemo<FlowNode[]>(() => {
    const bindaStageIds = ["regional_binda", "oim_binda", "coordinator_binda", "officer_binda"];
    const activeBindaSubIdx = findActiveStageIndex(bindaStageIds, stages);

    const dirStageIds = ["regional_dir", "oim_dir", "coordinator_dir", "officer_dir"];
    const activeDirSubIdx = findActiveStageIndex(dirStageIds, stages);

    const nodes: FlowNode[] = [];

    // Executive Stage
    const execStage = stages[0];
    const executiveComplete = execStage.status === "done";
    nodes.push({
      id: execStage.id,
      type: "distribution-stage",
      position: isMobile ? { x: 150, y: 20 } : { x: 50, y: 170 },
      data: {
        stage: execStage,
        onSelect: selectStage,
        isMobile,
        animationClass: executiveComplete ? "flow-node-completed" : "flow-node-active",
      },
      draggable: false,
      selectable: true,
    });

    // Binda branch stages
    bindaStageIds.forEach((id, subIndex) => {
      const stage = stages.find((s) => s.id === id);
      if (!stage) return;

      let animationClass = "flow-node-waiting";
      if (subIndex < activeBindaSubIdx) {
        animationClass = stage.status === "failed" ? "flow-node-rejected" : "flow-node-completed";
      } else if (subIndex === activeBindaSubIdx) {
        animationClass =
          stage.status === "failed"
            ? "flow-node-rejected"
            : stage.status === "partial"
              ? "flow-node-processing"
              : "flow-node-active";
      } else {
        animationClass = "flow-node-waiting";
      }

      nodes.push({
        id: stage.id,
        type: "distribution-stage",
        position: isMobile ? { x: 30, y: 160 + subIndex * 155 } : { x: 280 + subIndex * 240, y: 65 },
        data: { stage, onSelect: selectStage, isMobile, animationClass },
        draggable: false,
        selectable: true,
      });
    });

    // Direktorat branch stages
    dirStageIds.forEach((id, subIndex) => {
      const stage = stages.find((s) => s.id === id);
      if (!stage) return;

      let animationClass = "flow-node-waiting";
      if (subIndex < activeDirSubIdx) {
        animationClass = stage.status === "failed" ? "flow-node-rejected" : "flow-node-completed";
      } else if (subIndex === activeDirSubIdx) {
        animationClass =
          stage.status === "failed"
            ? "flow-node-rejected"
            : stage.status === "partial"
              ? "flow-node-processing"
              : "flow-node-active";
      } else {
        animationClass = "flow-node-waiting";
      }

      nodes.push({
        id: stage.id,
        type: "distribution-stage",
        position: isMobile ? { x: 260, y: 160 + subIndex * 155 } : { x: 280 + subIndex * 240, y: 275 },
        data: { stage, onSelect: selectStage, isMobile, animationClass },
        draggable: false,
        selectable: true,
      });
    });

    return nodes;
  }, [isMobile, selectStage, stages]);
  const flowEdges = useMemo<FlowEdge[]>(() => {
    const edges: FlowEdge[] = [];

    const bindaStageIds = ["regional_binda", "oim_binda", "coordinator_binda", "officer_binda"];
    const activeBindaSubIdx = findActiveStageIndex(bindaStageIds, stages);

    const dirStageIds = ["regional_dir", "oim_dir", "coordinator_dir", "officer_dir"];
    const activeDirSubIdx = findActiveStageIndex(dirStageIds, stages);

    // 1. Executive to Binda Branch
    {
      const targetBindaNode = stages.find((s) => s.id === "regional_binda");
      const bindaActive = activeBindaSubIdx === 0;
      const bindaCompleted = activeBindaSubIdx > 0;
      let bindaColor = "var(--dc-border)";
      let animated = false;

      if (bindaCompleted) {
        bindaColor = "var(--dc-success)";
      } else if (bindaActive) {
        bindaColor =
          targetBindaNode?.status === "failed"
            ? "var(--dc-danger)"
            : targetBindaNode?.status === "partial"
              ? "var(--dc-warning)"
              : "var(--dc-success)";
        animated = true;
      }

      edges.push({
        id: `executive-regional_binda`,
        source: "executive",
        target: "regional_binda",
        type: "smoothstep",
        animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: bindaColor },
        style: { stroke: bindaColor, strokeWidth: 2 },
      });
    }

    // 2. Executive to Direktorat Branch
    {
      const targetDirNode = stages.find((s) => s.id === "regional_dir");
      const dirActive = activeDirSubIdx === 0;
      const dirCompleted = activeDirSubIdx > 0;
      let dirColor = "var(--dc-border)";
      let animated = false;

      if (dirCompleted) {
        dirColor = "var(--dc-success)";
      } else if (dirActive) {
        dirColor =
          targetDirNode?.status === "failed"
            ? "var(--dc-danger)"
            : targetDirNode?.status === "partial"
              ? "var(--dc-warning)"
              : "var(--dc-success)";
        animated = true;
      }

      edges.push({
        id: `executive-regional_dir`,
        source: "executive",
        target: "regional_dir",
        type: "smoothstep",
        animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: dirColor },
        style: { stroke: dirColor, strokeWidth: 2 },
      });
    }

    // 3. Connect Binda internal stages
    for (let i = 0; i < bindaStageIds.length - 1; i++) {
      const sourceId = bindaStageIds[i];
      const targetId = bindaStageIds[i + 1];
      const nextStageIdx = i + 1;
      const targetNode = stages.find((s) => s.id === targetId);

      let edgeColor = "var(--dc-border)";
      let animated = false;

      if (nextStageIdx < activeBindaSubIdx) {
        edgeColor = "var(--dc-success)";
      } else if (nextStageIdx === activeBindaSubIdx) {
        edgeColor =
          targetNode?.status === "failed"
            ? "var(--dc-danger)"
            : targetNode?.status === "partial"
              ? "var(--dc-warning)"
              : "var(--dc-success)";
        animated = true;
      }

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: "straight",
        animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: 2 },
      });
    }

    // 4. Connect Direktorat internal stages
    for (let i = 0; i < dirStageIds.length - 1; i++) {
      const sourceId = dirStageIds[i];
      const targetId = dirStageIds[i + 1];
      const nextStageIdx = i + 1;
      const targetNode = stages.find((s) => s.id === targetId);

      let edgeColor = "var(--dc-border)";
      let animated = false;

      if (nextStageIdx < activeDirSubIdx) {
        edgeColor = "var(--dc-success)";
      } else if (nextStageIdx === activeDirSubIdx) {
        edgeColor =
          targetNode?.status === "failed"
            ? "var(--dc-danger)"
            : targetNode?.status === "partial"
              ? "var(--dc-warning)"
              : "var(--dc-success)";
        animated = true;
      }

      edges.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: "straight",
        animated,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor },
        style: { stroke: edgeColor, strokeWidth: 2 },
      });
    }

    return edges;
  }, [stages]);

  const fitDistributionView = useCallback(() => {
    void fitView({
      duration: 220,
      maxZoom: isMobile ? 0.9 : 1,
      minZoom: 0.45,
      padding: isMobile ? 0.35 : 0.22,
    });
  }, [fitView, isMobile]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(fitDistributionView);
    const timeout = window.setTimeout(fitDistributionView, 180);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [fitDistributionView]);

  const selectedStage = selectedStageId ? stages.find((stage) => stage.id === selectedStageId) : null;

  return (
    <>
      <div className="h-[460px] overflow-hidden rounded-lg border border-border bg-background">
        <ReactFlow<FlowNode, FlowEdge>
          className="h-full w-full"
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll
          fitView
          fitViewOptions={{ maxZoom: isMobile ? 0.9 : 1, minZoom: 0.45, padding: isMobile ? 0.35 : 0.22 }}
          minZoom={0.45}
          maxZoom={1.2}
          proOptions={{ hideAttribution: true }}
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          onInit={fitDistributionView}
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
      <header className="flex items-start justify-between gap-4 border-border border-b pb-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-primary text-xs uppercase tracking-wider">
            <FileText className="size-4" />
            Alur Distribusi STR
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
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
