import type {
  DirectiveDetail,
  DirectiveTracking,
  DirectiveTrackingAssignment,
  DirectiveTrackingTask,
} from "@/features/directives/types";

import { formatDate, getCurrentVersion } from "./directive-shared";

export type DirectiveNodeKind = "COMMAND" | "REGIONAL" | "SEED" | "COORDINATOR" | "AGENT";

export type DirectiveNodeDetail = {
  label: string;
  value: string;
};

export type DirectiveGraphNode = {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  depth: number;
  kind: DirectiveNodeKind;
  label: string;
  subtitle: string;
  status: string;
  priority?: string;
  unit?: string;
  progressPercent?: number;
  details: DirectiveNodeDetail[];
};

export type DirectiveGraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  status: string;
};

export type DirectiveTrackingGraph = {
  nodes: DirectiveGraphNode[];
  edges: DirectiveGraphEdge[];
};

function text(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function percentage(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function lastAssignmentUpdate(assignment: DirectiveTrackingAssignment) {
  return (
    assignment.completedAt ??
    assignment.startedAt ??
    assignment.acknowledgedAt ??
    assignment.readAt ??
    assignment.assignedAt
  );
}

function completedAssignments(assignments: DirectiveTrackingAssignment[]) {
  return assignments.filter((assignment) => assignment.status === "COMPLETED").length;
}

export function buildDirectiveTrackingGraph(
  directive: DirectiveDetail,
  tracking: DirectiveTracking,
): DirectiveTrackingGraph {
  const nodes: DirectiveGraphNode[] = [];
  const edges: DirectiveGraphEdge[] = [];
  const currentVersion = getCurrentVersion(directive);
  const commandNodeId = `command-${directive.id}`;
  const totalAssignments = tracking.stageSummary.korwil.total;
  const completedTotal = tracking.stageSummary.korwil.completed;

  nodes.push({
    id: commandNodeId,
    parentId: null,
    childrenIds: [],
    depth: 0,
    kind: "COMMAND",
    label: "Pusat Komando",
    subtitle: directive.ownerUnit?.name ?? directive.commandNumber,
    status: directive.status,
    unit: directive.ownerUnit?.name,
    progressPercent: percentage(completedTotal, totalAssignments),
    details: [
      { label: "Nomor direktif", value: directive.commandNumber },
      { label: "Penerbit", value: text(directive.createdByAssignment?.userProfile?.fullName) },
      { label: "Jabatan penerbit", value: text(directive.createdByAssignment?.position?.title) },
      { label: "Unit organisasi", value: text(directive.ownerUnit?.name) },
      { label: "Jumlah regional", value: text(tracking.stageSummary.regional.totalRecipients) },
      { label: "Jumlah STR", value: text(tracking.stageSummary.oim.totalForwardedRegionalStr) },
      { label: "Regional sudah membaca", value: text(tracking.stageSummary.regional.readCount) },
      { label: "Progress distribusi", value: `${percentage(completedTotal, totalAssignments)}%` },
    ],
  });

  for (const chain of tracking.regionalChains) {
    const recipient = chain.regionalRecipient;
    const regionalId = `regional-${recipient.id}`;
    const regionalName =
      recipient.targetUnit?.name ?? recipient.targetPosition?.organizationUnit?.name ?? "Regional tujuan";
    const regionalTitle = recipient.targetPosition?.title ?? recipient.targetUnit?.type ?? "Regional Tujuan";
    const regionalTotal = chain.korwilStage.total;
    const regionalCompleted = chain.korwilStage.completed;

    nodes.push({
      id: regionalId,
      parentId: commandNodeId,
      childrenIds: [],
      depth: 1,
      kind: "REGIONAL",
      label: regionalName,
      subtitle: regionalTitle,
      status: recipient.status,
      unit: recipient.targetUnit?.name ?? recipient.targetPosition?.organizationUnit?.name ?? undefined,
      progressPercent: percentage(regionalCompleted, regionalTotal),
      details: [
        { label: "Nama regional", value: regionalName },
        { label: "Penerima", value: text(recipient.targetPosition?.assigneeName) },
        { label: "Jabatan", value: text(recipient.targetPosition?.title) },
        { label: "Status", value: recipient.status },
        { label: "Jumlah Seed STR", value: text(chain.oimTasks?.length ?? 0) },
        { label: "Jumlah koordinator", value: text(chain.fieldCoordinatorStage.totalAssignments) },
        { label: "Jumlah agen", value: text(chain.korwilStage.total) },
        { label: "Dikirim", value: formatDate(recipient.sentAt) },
        { label: "Dibaca", value: formatDate(recipient.readAt) },
        { label: "Progress distribusi", value: `${percentage(regionalCompleted, regionalTotal)}%` },
      ],
    });
    nodes[0].childrenIds.push(regionalId);
    edges.push({
      id: `edge-${commandNodeId}-${regionalId}`,
      source: commandNodeId,
      target: regionalId,
      label: "Distribusi regional",
      status: recipient.status,
    });

    for (const task of chain.oimTasks ?? []) {
      addTaskBranch({
        task,
        regionalId,
        regionalName,
        directive,
        currentVersionTitle: currentVersion?.commandDescription ?? directive.commandNumber,
        nodes,
        edges,
      });
    }
  }

  return { nodes, edges };
}

type AddTaskBranchOptions = {
  task: DirectiveTrackingTask;
  regionalId: string;
  regionalName: string;
  directive: DirectiveDetail;
  currentVersionTitle: string;
  nodes: DirectiveGraphNode[];
  edges: DirectiveGraphEdge[];
};

function addTaskBranch({
  task,
  regionalId,
  regionalName,
  directive,
  currentVersionTitle,
  nodes,
  edges,
}: AddTaskBranchOptions) {
  const seedId = `seed-${task.id}`;
  const coordinatorAssignments = task.fieldCoordinatorAssignments ?? [];
  const seedCompleted = task.korwilSummary.completed;
  const seedTotal = task.korwilSummary.total;
  const regionalNode = nodes.find((node) => node.id === regionalId);

  regionalNode?.childrenIds.push(seedId);
  nodes.push({
    id: seedId,
    parentId: regionalId,
    childrenIds: [],
    depth: 2,
    kind: "SEED",
    label: task.title,
    subtitle: task.uukStr?.title || task.ownerUnit?.name || "Seed STR",
    status: task.status,
    priority: task.priority,
    unit: task.ownerUnit?.name,
    progressPercent: percentage(seedCompleted, seedTotal),
    details: [
      { label: "Nomor STR", value: directive.commandNumber },
      { label: "Judul direktif", value: currentVersionTitle },
      { label: "Judul tugas", value: task.title },
      { label: "Prioritas", value: task.priority },
      { label: "Tanggal dibuat", value: formatDate(task.createdAt) },
      { label: "Batas waktu", value: formatDate(task.dueDate) },
      { label: "Status", value: task.status },
      { label: "Regional tujuan", value: regionalName },
      { label: "Unit pemilik", value: text(task.ownerUnit?.name) },
      { label: "Progress distribusi", value: `${percentage(seedCompleted, seedTotal)}%` },
    ],
  });
  edges.push({
    id: `edge-${regionalId}-${seedId}`,
    source: regionalId,
    target: seedId,
    label: "Penerusan STR",
    status: task.status,
  });

  for (const assignment of coordinatorAssignments) {
    const coordinatorId = `coordinator-${assignment.id}`;
    const downstream = assignment.downstreamAssignments ?? [];
    const completed = completedAssignments(downstream);
    const coordinatorName =
      assignment.assignee?.fullName ?? assignment.assignee?.positionTitle ?? "Koordinator Lapangan";
    const seedNode = nodes.find((node) => node.id === seedId);

    seedNode?.childrenIds.push(coordinatorId);
    nodes.push({
      id: coordinatorId,
      parentId: seedId,
      childrenIds: [],
      depth: 3,
      kind: "COORDINATOR",
      label: coordinatorName,
      subtitle: assignment.assignee?.positionTitle ?? "Koordinator Lapangan",
      status: assignment.status,
      unit: assignment.assignee?.organizationUnitName ?? undefined,
      progressPercent: percentage(completed, downstream.length),
      details: [
        { label: "Nama", value: coordinatorName },
        { label: "Jabatan", value: text(assignment.assignee?.positionTitle) },
        { label: "Unit organisasi", value: text(assignment.assignee?.organizationUnitName) },
        { label: "Regional", value: regionalName },
        { label: "Status", value: assignment.status },
        { label: "Jumlah agen", value: text(downstream.length) },
        { label: "Sudah diteruskan", value: text(downstream.length) },
        { label: "Selesai", value: text(completed) },
        { label: "Belum selesai", value: text(Math.max(0, downstream.length - completed)) },
        { label: "Dibaca", value: formatDate(assignment.readAt) },
        { label: "Batas waktu", value: formatDate(assignment.dueDate) },
        { label: "Progress", value: `${percentage(completed, downstream.length)}%` },
      ],
    });
    edges.push({
      id: `edge-${seedId}-${coordinatorId}`,
      source: seedId,
      target: coordinatorId,
      label: "Penugasan koordinator",
      status: assignment.status,
    });

    for (const child of downstream) {
      addAssignmentBranch({
        assignment: child,
        parentId: coordinatorId,
        regionalName,
        depth: 4,
        nodes,
        edges,
      });
    }
  }
}

type AddAssignmentBranchOptions = {
  assignment: DirectiveTrackingAssignment;
  parentId: string;
  regionalName: string;
  depth: number;
  nodes: DirectiveGraphNode[];
  edges: DirectiveGraphEdge[];
};

function addAssignmentBranch({ assignment, parentId, regionalName, depth, nodes, edges }: AddAssignmentBranchOptions) {
  const assignmentId = `agent-${assignment.id}`;
  const children = assignment.downstreamAssignments ?? [];
  const agentName = assignment.assignee?.fullName ?? assignment.assignee?.positionTitle ?? "Agen";
  const areaNames = assignment.assignee ? assignment.assignee.areaScopes.map((scope) => scope.name).join(", ") : "-";
  const parentNode = nodes.find((node) => node.id === parentId);
  const completed = assignment.status === "COMPLETED" ? 1 : 0;

  parentNode?.childrenIds.push(assignmentId);
  nodes.push({
    id: assignmentId,
    parentId,
    childrenIds: [],
    depth,
    kind: "AGENT",
    label: agentName,
    subtitle: assignment.assignee?.positionTitle ?? assignment.assignee?.roleCode ?? "Agen / Korwil",
    status: assignment.status,
    unit: assignment.assignee?.organizationUnitName ?? undefined,
    progressPercent: completed * 100,
    details: [
      { label: "Nama", value: agentName },
      { label: "Jabatan", value: text(assignment.assignee?.positionTitle) },
      { label: "Unit organisasi", value: text(assignment.assignee?.organizationUnitName) },
      { label: "Regional", value: regionalName },
      { label: "Wilayah tugas", value: areaNames || "-" },
      { label: "Status", value: assignment.status },
      { label: "Sudah dibaca", value: formatDate(assignment.readAt) },
      { label: "Sudah diteruskan", value: children.length > 0 ? `${children.length} turunan` : "Belum" },
      { label: "Batas waktu", value: formatDate(assignment.dueDate) },
      { label: "Update terakhir", value: formatDate(lastAssignmentUpdate(assignment)) },
      { label: "Instruksi", value: text(assignment.assignmentNote) },
      { label: "Jumlah turunan", value: text(children.length) },
    ],
  });
  edges.push({
    id: `edge-${parentId}-${assignmentId}`,
    source: parentId,
    target: assignmentId,
    label: depth === 4 ? "Distribusi agen" : "Distribusi turunan",
    status: assignment.status,
  });

  for (const child of children) {
    addAssignmentBranch({
      assignment: child,
      parentId: assignmentId,
      regionalName,
      depth: depth + 1,
      nodes,
      edges,
    });
  }
}
