import { redirect } from "next/navigation";

import type { UukDetail, UukSummary } from "@/features/uuk-str/types";
import { apiServerFetchEnvelope, apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

import {
  AssignmentBoardClient,
  FieldCoordinatorAssignmentDetailClient,
  FieldCoordinatorAssignmentsClient,
  FieldCoordinatorMonitoringClient,
  FieldCoordinatorMonitoringDetailClient,
  FieldOfficerAssignmentDetailClient,
  FieldOfficerAssignmentsClient,
  OimForwardingClient,
  OimIncomingForwardingListClient,
  TaskDetailClient,
  TaskListClient,
} from "./task-clients";
import type {
  AssignmentCandidate,
  OimForwardingOptions,
  OimIncomingForwardingSource,
  TaskAssignmentDetail,
  TaskDetail,
  TaskSummary,
} from "@/features/tasks/types";

type AreaNode = {
  id: string;
  name: string;
  level: string;
  children?: AreaNode[];
};

type AccessMe = {
  authorizationContext: {
    primaryAssignmentId: string;
    positionId: string;
    organizationUnitId: string;
    areaScopes: Array<{
      areaId: string;
      name: string;
      level: string;
    }>;
  };
};

const ASSIGNMENT_PAGE_LIMIT = 100;
const ASSIGNMENT_POSITION_CHUNK_SIZE = 40;

type CoordinatorTaskView = TaskSummary & {
  subordinateAssignments: TaskAssignmentDetail[];
  coordinatorAssignmentId?: string | null;
};

function flattenAreas(nodes: AreaNode[], depth = 0): OimForwardingOptions["areaOptions"] {
  return nodes.flatMap((node) => [
    {
      id: node.id,
      label: `${"".padStart(depth * 2, " ")}${node.name}`,
      level: node.level,
    },
    ...flattenAreas(node.children ?? [], depth + 1),
  ]);
}

function normalizeAreaTree(areaTree: AreaNode | AreaNode[] | null | undefined): AreaNode[] {
  if (!areaTree) {
    return [];
  }

  return Array.isArray(areaTree) ? areaTree : [areaTree];
}

function chunkValues<T>(values: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function loadOimForwardingOptions(): Promise<OimForwardingOptions> {
  const [access, areaTree] = await Promise.all([
    apiServerGet<AccessMe>("/access/me"),
    apiServerGet<AreaNode | AreaNode[] | null>("/administrative-areas/tree"),
  ]);
  const candidates = await loadSubordinateCandidates(access, "FIELD_COORDINATOR");

  return {
    access: access as OimForwardingOptions["access"],
    areaOptions: flattenAreas(normalizeAreaTree(areaTree)),
    areaTree: normalizeAreaTree(areaTree),
    candidates,
  };
}

async function loadSubordinateCandidates(
  access: AccessMe,
  roleCode?: "FIELD_COORDINATOR" | "FIELD_OFFICER",
): Promise<AssignmentCandidate[]> {
  const validAt = new Date().toISOString();
  const subordinates = await apiServerGet<Array<{ id: string }>>(
    `/positions/${access.authorizationContext.positionId}/subordinates`,
    {
      recursive: true,
      depth: 5,
    },
  );
  const subordinateIds = subordinates.map((item) => item.id);

  if (!subordinateIds.length) {
    return [];
  }

  const assignments: AssignmentCandidate[] = [];

  for (const positionIds of chunkValues(subordinateIds, ASSIGNMENT_POSITION_CHUNK_SIZE)) {
    let page = 1;
    let totalPages = 1;

    do {
      const response = await apiServerFetchEnvelope<AssignmentCandidate[]>("/position-assignments", {
        query: {
          ...(roleCode ? { roleCode } : {}),
          positionIds,
          isActive: true,
          limit: ASSIGNMENT_PAGE_LIMIT,
          page,
          validAt,
        },
      });

      assignments.push(...response.data);
      totalPages = response.meta?.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
  }

  return assignments;
}

async function loadIncomingOimSources(): Promise<OimIncomingForwardingSource[]> {
  const uuks = await apiServerGet<UukSummary[]>("/uuk-strs", {
    status: "PUBLISHED",
    limit: 50,
  });

  return uuks
    .filter((uuk) => uuk.versions.length > 0)
    .map((uuk) => ({
      ...uuk,
      currentVersion: uuk.versions.find((item) => item.versionNumber === uuk.currentVersionNumber) ?? uuk.versions[0],
    }));
}

function buildCoordinatorTaskViews(tasks: TaskSummary[], primaryAssignmentId: string): CoordinatorTaskView[] {
  return tasks
    .map((task) => {
      const subordinateAssignments = task.assignments.filter(
        (assignment) => assignment.assignerAssignmentId === primaryAssignmentId,
      );
      const coordinatorAssignmentId =
        task.assignments.find((assignment) => assignment.assigneeAssignmentId === primaryAssignmentId)?.id ?? null;

      return {
        ...task,
        subordinateAssignments,
        coordinatorAssignmentId,
      };
    })
    .filter((task) => task.subordinateAssignments.length > 0);
}

export async function OimTaskListPage() {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  const access = await apiServerGet<AccessMe>("/access/me");
  const [tasks, sources] = await Promise.all([
    apiServerGet<TaskSummary[]>("/tasks", {
      ownerUnitId: access.authorizationContext.organizationUnitId,
      limit: 50,
    }),
    loadIncomingOimSources(),
  ]);

  return (
    <div className="space-y-6">
      <OimIncomingForwardingListClient sources={sources} tasks={tasks} />
    </div>
  );
}

export async function OimTaskCreatePage({ uukStrId }: { uukStrId?: string }) {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  if (!uukStrId) {
    redirect("/dashboard/oim/direktif-tugas");
  }
  const [options, source] = await Promise.all([
    loadOimForwardingOptions(),
    apiServerGet<UukDetail>(`/uuk-strs/${uukStrId}`),
  ]);

  const currentVersion =
    source.versions.find((item) => item.versionNumber === source.currentVersionNumber) ?? source.versions[0];

  return <OimForwardingClient source={{ ...source, currentVersion }} options={options} />;
}

export async function OimTaskDetailPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  const task = await apiServerGet<TaskDetail>(`/tasks/${taskId}`);

  return (
    <TaskDetailClient
      task={task}
      assignmentHref={`/dashboard/oim/direktif-tugas/${task.id}/penugasan`}
      hideTargetAreas
      assignmentTitle="Daftar Field Coordinator"
    />
  );
}

export async function OimTaskEditPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  redirect(`/dashboard/oim/direktif-tugas/${taskId}`);
  return null;
}

export async function OimTaskAssignmentPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER);
  const [access, task] = await Promise.all([
    apiServerGet<AccessMe>("/access/me"),
    apiServerGet<TaskDetail>(`/tasks/${taskId}`),
  ]);
  const candidates = await loadSubordinateCandidates(access, "FIELD_COORDINATOR");

  return (
    <AssignmentBoardClient
      task={task}
      candidates={candidates}
      submitLabel="Distribusikan ke Field Coordinator"
      mode="assign"
    />
  );
}

export async function FieldCoordinatorTaskListPage() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const access = await apiServerGet<AccessMe>("/access/me");
  const tasks = await apiServerGet<TaskSummary[]>("/tasks", {
    assigneeAssignmentId: access.authorizationContext.primaryAssignmentId,
    limit: 50,
  });

  return (
    <TaskListClient
      title="Tugas Operasional"
      description="Board operasional untuk task yang diterima Field Coordinator dari OIM."
      tasks={tasks}
      detailBasePath="/dashboard/field-coordinator/tugas-operasional"
    />
  );
}

export async function FieldCoordinatorTaskDetailPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const task = await apiServerGet<TaskDetail>(`/tasks/${taskId}`);

  return (
    <TaskDetailClient
      task={task}
      assignmentHref={`/dashboard/field-coordinator/tugas-operasional/${task.id}/assignments/${task.assignments[0]?.id ?? ""}`}
      hideTargetAreas
      hideAssignments
      assignmentTitle="Distribusi Field Officer"
    />
  );
}

export async function FieldCoordinatorAssignmentPage({
  taskId,
  assignmentId,
}: {
  taskId: string;
  assignmentId: string;
}) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const [access, task, assignment] = await Promise.all([
    apiServerGet<AccessMe>("/access/me"),
    apiServerGet<TaskDetail>(`/tasks/${taskId}`),
    apiServerGet<TaskAssignmentDetail>(`/task-assignments/${assignmentId}`),
  ]);
  const candidates = await loadSubordinateCandidates(access, "FIELD_OFFICER");

  const canReassign = assignment.assignerAssignmentId === access.authorizationContext.primaryAssignmentId;
  const isCoordinatorOwned = assignment.assigneeAssignmentId === access.authorizationContext.primaryAssignmentId;

  return (
    <div className="space-y-6">
      <TaskDetailClient task={task} hideTargetAreas hideAssignments assignmentTitle="Distribusi Field Officer" />
      {isCoordinatorOwned ? (
        <AssignmentBoardClient
          task={task}
          candidates={candidates}
          submitLabel="Distribusikan ke Field Officer"
          mode="assign"
        />
      ) : null}
      {canReassign ? (
        <AssignmentBoardClient
          task={task}
          candidates={candidates}
          submitLabel="Reassign ke Field Officer"
          mode="reassign"
          existingAssignmentId={assignment.id}
        />
      ) : null}
    </div>
  );
}

export async function FieldCoordinatorFieldOfficerAssignmentListPage() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const access = await apiServerGet<AccessMe>("/access/me");
  const tasks = await apiServerGet<TaskSummary[]>("/tasks", {
    limit: 100,
  });
  const distributedTasks = buildCoordinatorTaskViews(tasks, access.authorizationContext.primaryAssignmentId);

  return <FieldCoordinatorAssignmentsClient tasks={distributedTasks} />;
}

export async function FieldCoordinatorFieldOfficerAssignmentDetailPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const [access, task] = await Promise.all([
    apiServerGet<AccessMe>("/access/me"),
    apiServerGet<TaskDetail>(`/tasks/${taskId}`),
  ]);
  const subordinateAssignments = task.assignments.filter(
    (assignment) => assignment.assignerAssignmentId === access.authorizationContext.primaryAssignmentId,
  );
  const coordinatorAssignmentId =
    task.assignments.find(
      (assignment) => assignment.assigneeAssignmentId === access.authorizationContext.primaryAssignmentId,
    )?.id ?? null;
  const manageHref = coordinatorAssignmentId
    ? `/dashboard/field-coordinator/tugas-operasional/${task.id}/assignments/${coordinatorAssignmentId}`
    : undefined;

  return (
    <FieldCoordinatorAssignmentDetailClient
      task={task}
      subordinateAssignments={subordinateAssignments}
      manageHref={manageHref}
    />
  );
}

export async function FieldCoordinatorMonitoringPage() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const access = await apiServerGet<AccessMe>("/access/me");
  const tasks = await apiServerGet<TaskSummary[]>("/tasks", {
    limit: 100,
  });
  const distributedTasks = buildCoordinatorTaskViews(tasks, access.authorizationContext.primaryAssignmentId);

  return <FieldCoordinatorMonitoringClient tasks={distributedTasks} />;
}

export async function FieldCoordinatorMonitoringDetailPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const [access, task] = await Promise.all([
    apiServerGet<AccessMe>("/access/me"),
    apiServerGet<TaskDetail>(`/tasks/${taskId}`),
  ]);
  const subordinateAssignments = task.assignments.filter(
    (assignment) => assignment.assignerAssignmentId === access.authorizationContext.primaryAssignmentId,
  );
  const coordinatorAssignmentId =
    task.assignments.find(
      (assignment) => assignment.assigneeAssignmentId === access.authorizationContext.primaryAssignmentId,
    )?.id ?? null;
  const manageHref = coordinatorAssignmentId
    ? `/dashboard/field-coordinator/tugas-operasional/${task.id}/assignments/${coordinatorAssignmentId}`
    : undefined;

  return (
    <FieldCoordinatorMonitoringDetailClient
      task={task}
      subordinateAssignments={subordinateAssignments}
      manageHref={manageHref}
    />
  );
}

export async function FieldOfficerTaskListPage() {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const access = await apiServerGet<AccessMe>("/access/me");
  const tasks = await apiServerGet<TaskSummary[]>("/tasks", {
    assigneeAssignmentId: access.authorizationContext.primaryAssignmentId,
    limit: 50,
  });

  const assignments = tasks.flatMap((task) =>
    task.assignments
      .filter((assignment) => assignment.assigneeAssignmentId === access.authorizationContext.primaryAssignmentId)
      .map((assignment) => ({
        ...assignment,
        task,
      })),
  );

  return <FieldOfficerAssignmentsClient assignments={assignments} />;
}

export async function FieldOfficerAssignmentPage({ assignmentId }: { assignmentId: string }) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const assignment = await apiServerGet<TaskAssignmentDetail>(`/task-assignments/${assignmentId}`);

  return <FieldOfficerAssignmentDetailClient assignment={assignment} />;
}
