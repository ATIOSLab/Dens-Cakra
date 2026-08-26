import {
  AssignmentCandidate,
  TaskAssignmentDetail,
  TaskDetail,
  TaskSummary,
} from "@/features/tasks/types";
import { apiServerGet } from "@/lib/api/server-client";
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
  TaskDetailClient,
  TaskListClient,
} from "./task-clients";

type AccessMe = {
  authorizationContext: {
    primaryAssignmentId: string;
    positionId: string;
    organizationUnitId: string;
    roles: string[];
    isPrimary: boolean;
  };
};

type CoordinatorTaskView = TaskSummary & {
  subordinateAssignments: TaskAssignmentDetail[];
  coordinatorAssignmentId?: string | null;
};

async function loadSubordinateCandidates(
  _access: AccessMe,
  roleCode?: "FIELD_COORDINATOR" | "FIELD_OFFICER",
): Promise<AssignmentCandidate[]> {
  if (!roleCode) {
    return [];
  }

  return apiServerGet<AssignmentCandidate[]>("/access/assignable-assignments", {
    roleCode,
  });
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
    .filter((task) => Boolean(task.coordinatorAssignmentId) || task.subordinateAssignments.length > 0);
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
      tasks={tasks}
      detailBasePath="/dashboard/koordinator-wilayah/tugas-operasional"
    />
  );
}

export async function FieldCoordinatorTaskDetailPage({ taskId }: { taskId: string }) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const [access, task] = await Promise.all([
    apiServerGet<AccessMe>("/access/me"),
    apiServerGet<TaskDetail>(`/tasks/${taskId}`),
  ]);
  const coordinatorAssignmentId =
    task.assignments.find(
      (assignment) => assignment.assigneeAssignmentId === access.authorizationContext.primaryAssignmentId,
    )?.id ?? null;

  return (
    <TaskDetailClient
      task={task}
      assignmentHref={
        coordinatorAssignmentId
          ? `/dashboard/koordinator-wilayah/tugas-operasional/${task.id}/assignments/${coordinatorAssignmentId}`
          : undefined
      }
      hideTargetAreas
      hideAssignments
      assignmentTitle="Distribusi Petugas Wilayah (Gaswil)"
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
      <TaskDetailClient
        task={task}
        hideTargetAreas
        hideAssignments
        assignmentTitle="Distribusi Petugas Wilayah (Gaswil)"
      />
      {isCoordinatorOwned ? (
        <AssignmentBoardClient
          task={task}
          candidates={candidates}
          submitLabel="Distribusikan ke Petugas Wilayah (Gaswil)"
          mode="assign"
        />
      ) : null}
      {canReassign ? (
        <AssignmentBoardClient
          task={task}
          candidates={candidates}
          submitLabel="Alihkan ke Petugas Wilayah (Gaswil)"
          mode="reassign"
          existingAssignmentId={assignment.id}
        />
      ) : null}
    </div>
  );
}

export async function FieldCoordinatorFieldOfficerAssignmentListPage({
  sortBy,
  sortOrder,
}: {
  sortBy?: string;
  sortOrder?: string;
}) {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const access = await apiServerGet<AccessMe>("/access/me");
  const tasks = await apiServerGet<TaskSummary[]>("/tasks", {
    limit: 100,
    sortBy,
    sortOrder,
  });
  const distributedTasks = buildCoordinatorTaskViews(tasks, access.authorizationContext.primaryAssignmentId);

  return (
    <FieldCoordinatorAssignmentsClient
      tasks={distributedTasks}
      primaryAssignmentId={access.authorizationContext.primaryAssignmentId}
    />
  );
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
    ? `/dashboard/koordinator-wilayah/tugas-operasional/${task.id}/assignments/${coordinatorAssignmentId}`
    : undefined;
  const candidates = coordinatorAssignmentId ? await loadSubordinateCandidates(access, "FIELD_OFFICER") : [];

  return (
    <div className="space-y-6">
      <FieldCoordinatorAssignmentDetailClient
        task={task}
        subordinateAssignments={subordinateAssignments}
        manageHref={manageHref}
      />
      {coordinatorAssignmentId ? (
        <AssignmentBoardClient
          task={task}
          candidates={candidates}
          submitLabel={
            subordinateAssignments.length
              ? "Tambah Instruksi Petugas Wilayah (Gaswil)"
              : "Buat Instruksi ke Petugas Wilayah (Gaswil)"
          }
          mode="assign"
        />
      ) : null}
    </div>
  );
}

export async function FieldCoordinatorMonitoringPage() {
  await requireRole(SYSTEM_ROLES.FIELD_COORDINATOR);
  const access = await apiServerGet<AccessMe>("/access/me");
  const tasks = await apiServerGet<TaskSummary[]>("/tasks", {
    limit: 100,
  });
  const distributedTasks = buildCoordinatorTaskViews(tasks, access.authorizationContext.primaryAssignmentId);

  return (
    <FieldCoordinatorMonitoringClient
      tasks={distributedTasks}
      primaryAssignmentId={access.authorizationContext.primaryAssignmentId}
    />
  );
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
    ? `/dashboard/koordinator-wilayah/tugas-operasional/${task.id}/assignments/${coordinatorAssignmentId}`
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

  return (
    <FieldOfficerAssignmentsClient
      assignments={assignments}
      primaryAssignmentId={access.authorizationContext.primaryAssignmentId}
    />
  );
}

export async function FieldOfficerAssignmentPage({ assignmentId }: { assignmentId: string }) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const assignment = await apiServerGet<TaskAssignmentDetail>(`/task-assignments/${assignmentId}`);

  return <FieldOfficerAssignmentDetailClient assignment={assignment} />;
}
