"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BookOpenText, ChevronRight, FileText, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserMutation } from "@/lib/api/browser-client";

import { assigneeSelectionSchema, assignmentProgressSchema, taskBuilderSchema } from "./schemas";
import type {
  AssignmentCandidate,
  OimForwardingOptions,
  OimIncomingForwardingSource,
  TaskAssignmentDetail,
  TaskBuilderOptions,
  TaskDetail,
  TaskSummary,
} from "./types";

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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {createHref ? (
          <Button asChild>
            <Link href={createHref}>Buat Task</Link>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {tasks.map((task) => (
          <Card key={task.id} className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{task.title}</span>
                <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
              </CardTitle>
              <CardDescription>
                {task.ownerUnit?.name ?? "-"} · {task.priority} · {task.classification}
              </CardDescription>
              <CardAction>
                <Button asChild size="sm" variant="outline">
                  <Link href={`${detailBasePath}/${task.id}`}>Detail</Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="line-clamp-3 text-muted-foreground text-sm">{task.description}</p>
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-xl border border-border/70 p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
                  <div className="mt-1 font-medium">{formatDate(task.dueDate)}</div>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Area</div>
                  <div className="mt-1 font-medium">{task.targetAreas.length}</div>
                </div>
                <div className="rounded-xl border border-border/70 p-3">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Assignment</div>
                  <div className="mt-1 font-medium">{task.assignments.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
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
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Penugasan Field Officer</h1>
        <p className="text-muted-foreground text-sm">
          Daftar distribusi tugas dari Field Coordinator ke Field Officer beserta instruksi operasionalnya.
        </p>
      </div>

      {!tasks.length ? (
        <Alert>
          <AlertTitle>Belum ada penugasan ke Field Officer</AlertTitle>
          <AlertDescription>
            Distribusikan dulu task dari halaman tugas operasional, lalu daftar penugasan akan muncul di sini.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const summary = countAssignmentStatuses(task.subordinateAssignments);

            return (
              <Card key={task.id} className="border border-border/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{task.title}</span>
                    <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {task.ownerUnit?.name ?? "-"} · {task.priority} · {task.classification}
                  </CardDescription>
                  <CardAction className="flex gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/dashboard/field-coordinator/monitoring-tugas/${task.id}`}>Monitoring</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/field-coordinator/penugasan-field-officer/${task.id}`}>Lihat Detail</Link>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Field Officer</div>
                      <div className="mt-1 font-medium">{task.subordinateAssignments.length}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Berjalan</div>
                      <div className="mt-1 font-medium">{summary.inProgress}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Selesai</div>
                      <div className="mt-1 font-medium">{summary.completed}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline Task</div>
                      <div className="mt-1 font-medium">{formatDate(task.dueDate)}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {task.subordinateAssignments.map((assignment) => (
                      <div key={assignment.id} className="rounded-xl border border-border/70 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-2">
                            <div>
                              <div className="font-medium">
                                {assignment.assignee?.userProfile?.fullName ??
                                  assignment.assignee?.position?.title ??
                                  "Field Officer"}
                              </div>
                              <div className="text-muted-foreground text-sm">
                                {assignment.assignee?.position?.title ?? "Field Officer"}
                              </div>
                            </div>
                            <div className="text-sm">
                              <div className="text-muted-foreground">Instruksi FC</div>
                              <div className="mt-1 font-medium">{normalizeDisplayText(assignment.assignmentNote)}</div>
                            </div>
                          </div>
                          <div className="flex flex-col items-start gap-2 md:items-end">
                            <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
                            <div className="text-muted-foreground text-sm">
                              Deadline assignment: {formatDate(assignment.dueDate)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
  return (
    <div className="space-y-6">
      <TaskDetailClient task={task} assignmentHref={manageHref} hideTargetAreas hideAssignments />

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Daftar Penugasan Field Officer</CardTitle>
          <CardDescription>Instruksi dari Field Coordinator ke setiap Field Officer untuk task ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subordinateAssignments.length ? (
            subordinateAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium">
                        {assignment.assignee?.userProfile?.fullName ??
                          assignment.assignee?.position?.title ??
                          "Field Officer"}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {assignment.assignee?.position?.title ?? "Field Officer"}
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-border/70 p-3 text-sm">
                        <div className="text-muted-foreground text-xs uppercase tracking-wide">Instruksi</div>
                        <div className="mt-1 font-medium">{normalizeDisplayText(assignment.assignmentNote)}</div>
                      </div>
                      <div className="rounded-xl border border-border/70 p-3 text-sm">
                        <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
                        <div className="mt-1 font-medium">{formatDate(assignment.dueDate)}</div>
                      </div>
                    </div>
                  </div>
                  <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada Field Officer yang ditugaskan pada task ini.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type FieldCoordinatorMonitoringClientProps = {
  tasks: FieldCoordinatorTaskWithAssignments[];
};

export function FieldCoordinatorMonitoringClient({ tasks }: FieldCoordinatorMonitoringClientProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Monitoring Tugas</h1>
        <p className="text-muted-foreground text-sm">
          Pantau progres, acknowledgement, dan potensi keterlambatan assignment Field Officer.
        </p>
      </div>

      {!tasks.length ? (
        <Alert>
          <AlertTitle>Belum ada task untuk dimonitor</AlertTitle>
          <AlertDescription>
            Setelah Field Coordinator mendistribusikan tugas ke Field Officer, status dan progresnya akan tampil di
            sini.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => {
            const summary = countAssignmentStatuses(task.subordinateAssignments);
            const overdueCount = task.subordinateAssignments.filter(isAssignmentOverdue).length;

            return (
              <Card key={task.id} className="border border-border/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>{task.title}</span>
                    <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
                  </CardTitle>
                  <CardDescription>{task.ownerUnit?.name ?? "-"}</CardDescription>
                  <CardAction>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/field-coordinator/monitoring-tugas/${task.id}`}>Buka Monitoring</Link>
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Sudah Ack / Read</div>
                      <div className="mt-1 font-medium">
                        {summary.acknowledged + summary.inProgress + summary.completed}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Belum Respon</div>
                      <div className="mt-1 font-medium">{summary.sent}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Sedang Berjalan</div>
                      <div className="mt-1 font-medium">{summary.inProgress}</div>
                    </div>
                    <div className="rounded-xl border border-border/70 p-3 text-sm">
                      <div className="text-muted-foreground text-xs uppercase tracking-wide">Overdue</div>
                      <div className="mt-1 font-medium">{overdueCount}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {task.subordinateAssignments.slice(0, 3).map((assignment) => (
                      <div key={assignment.id} className="rounded-xl border border-border/70 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-medium">
                            {assignment.assignee?.userProfile?.fullName ??
                              assignment.assignee?.position?.title ??
                              "Field Officer"}
                          </div>
                          <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
                        </div>
                        <div className="mt-2 text-muted-foreground">
                          Instruksi: {normalizeDisplayText(assignment.assignmentNote)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
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
  const summary = countAssignmentStatuses(subordinateAssignments);

  return (
    <div className="space-y-6">
      <TaskDetailClient task={task} assignmentHref={manageHref} hideTargetAreas hideAssignments />

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Ringkasan Monitoring Field Officer</CardTitle>
          <CardDescription>
            Progress pelaksanaan task oleh setiap Field Officer yang menerima distribusi dari FC.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Total Assignment</div>
            <div className="mt-1 font-medium">{subordinateAssignments.length}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Sedang Berjalan</div>
            <div className="mt-1 font-medium">{summary.inProgress}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Selesai</div>
            <div className="mt-1 font-medium">{summary.completed}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Overdue</div>
            <div className="mt-1 font-medium">{subordinateAssignments.filter(isAssignmentOverdue).length}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Daftar Progress Field Officer</CardTitle>
          <CardDescription>Status terbaru, instruksi, dan log progres per assignment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subordinateAssignments.length ? (
            subordinateAssignments.map((assignment) => {
              const latestLog = latestProgressLog(assignment);

              return (
                <div key={assignment.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium">
                          {assignment.assignee?.userProfile?.fullName ??
                            assignment.assignee?.position?.title ??
                            "Field Officer"}
                        </div>
                        <div className="text-muted-foreground text-sm">
                          {assignment.assignee?.position?.title ?? "Field Officer"}
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-xl border border-border/70 p-3 text-sm">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">Instruksi</div>
                          <div className="mt-1 font-medium">{normalizeDisplayText(assignment.assignmentNote)}</div>
                        </div>
                        <div className="rounded-xl border border-border/70 p-3 text-sm">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
                          <div className="mt-1 font-medium">{formatDate(assignment.dueDate)}</div>
                        </div>
                        <div className="rounded-xl border border-border/70 p-3 text-sm">
                          <div className="text-muted-foreground text-xs uppercase tracking-wide">Jumlah Log</div>
                          <div className="mt-1 font-medium">{assignment.progressLogs?.length ?? 0}</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 p-3 text-sm">
                        <div className="text-muted-foreground text-xs uppercase tracking-wide">Update Terakhir</div>
                        {latestLog ? (
                          <div className="mt-1 space-y-1">
                            <div className="font-medium">
                              {latestLog.status}
                              {typeof latestLog.progressPercent === "number" ? ` • ${latestLog.progressPercent}%` : ""}
                            </div>
                            <div className="text-muted-foreground">
                              {normalizeDisplayText(latestLog.note)} • {formatDate(latestLog.createdAt)}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-1 text-muted-foreground">Belum ada log progres dari Field Officer.</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-start gap-2 md:items-end">
                      <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
                      {isAssignmentOverdue(assignment) ? <Badge variant="destructive">OVERDUE</Badge> : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada assignment Field Officer untuk dimonitor.</div>
          )}
        </CardContent>
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
                          <>
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/dashboard/oim/direktif-tugas/${linkedTask.id}`}>Detail</Link>
                            </Button>
                            <Button asChild size="sm">
                              <Link href={`/dashboard/oim/direktif-tugas/${linkedTask.id}/penugasan`}>
                                {linkedTask.assignments.length ? "Daftar FC" : "Lanjutkan Teruskan"}
                              </Link>
                            </Button>
                          </>
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

  async function handleForward() {
    if (!selectedAssigneeIds.length) {
      toast.error("Pilih minimal satu Field Coordinator tujuan distribusi.");
      return;
    }

    const sourceClassification = source.directiveVersion?.classification;
    if (!sourceClassification) {
      toast.error("Klasifikasi STR sumber tidak tersedia, jadi penerusan belum bisa diproses.");
      return;
    }

    setIsSubmitting(true);

    try {
      const created = await apiBrowserMutation<TaskDetail>("POST", "/tasks", {
        ownerUnitId: options.access.authorizationContext.organizationUnitId,
        uukStrVersionId: source.currentVersion.id,
        title: source.currentVersion.title,
        description: buildForwardingDescription(source),
        classification: sourceClassification,
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Baca dan Teruskan STR ke Field Coordinator</h1>
        <p className="text-muted-foreground text-sm">
          OIM tidak mengubah isi STR. OIM hanya memilih Field Coordinator tujuan distribusi sesuai hirarki komando dan
          cakupan administratif.
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
              <BookOpenText className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>1. Baca STR Sumber</CardTitle>
              <CardDescription>
                Pastikan OIM membaca STR yang diteruskan Regional Commander sebelum distribusi.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Nomor STR</div>
              <div className="mt-2 font-medium">{source.directiveVersion?.directive?.commandNumber ?? "-"}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Regional Pengirim</div>
              <div className="mt-2 font-medium">{source.ownerUnit?.name ?? "-"}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Status STR</div>
              <div className="mt-2 font-medium">{uukStatusLabel(source.status)}</div>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Klasifikasi</div>
              <div className="mt-2 font-medium">{source.directiveVersion?.classification ?? "-"}</div>
            </div>
          </div>

          <Alert className="border-border/70 bg-muted/20">
            <FileText className="size-4" />
            <AlertTitle>{source.currentVersion.title}</AlertTitle>
            <AlertDescription>
              STR ini diteruskan Regional Commander dan harus diteruskan lagi oleh OIM ke Field Coordinator yang berada
              pada wilayah relevan tanpa mengubah isi STR.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border/70 p-4">
              <div className="mb-3 font-medium text-sm">Isi Ringkas STR</div>
              <div className="space-y-3">
                {source.currentVersion.sections.map((section) => (
                  <div key={section.sectionType} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                    <div className="font-medium text-sm">
                      {section.orderNumber}. {section.title}
                    </div>
                    <div className="mt-2 space-y-2 text-muted-foreground text-sm">
                      {section.items.map((item) => (
                        <div key={`${section.sectionType}-${item.itemCode}`}>
                          <span className="font-medium text-foreground">{item.itemCode}</span>:{" "}
                          {normalizeDisplayText(item.content)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <Label htmlFor="oim-read-confirmation" className="items-start gap-3 leading-6">
                  <Checkbox
                    id="oim-read-confirmation"
                    checked={hasReadSource}
                    onCheckedChange={(checked) => setHasReadSource(Boolean(checked))}
                    className="mt-1"
                  />
                  <span>
                    Saya sudah membaca STR sumber dan memahami bahwa OIM hanya meneruskan distribusinya ke Field
                    Coordinator tanpa mengubah isi STR.
                  </span>
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
              <Users className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>2. Pilih Field Coordinator Tujuan</CardTitle>
              <CardDescription>
                Sistem hanya menampilkan bawahan OIM yang role-nya Field Coordinator dan memiliki cakupan wilayah yang
                nyambung dengan STR ini.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasReadSource ? (
            <Alert className="border-amber-300/50 bg-amber-50 text-amber-950">
              <ChevronRight className="size-4" />
              <AlertTitle>Baca STR dulu sebelum distribusi</AlertTitle>
              <AlertDescription>
                Distribusi ke Field Coordinator baru aktif setelah konfirmasi baca di langkah pertama dicentang.
              </AlertDescription>
            </Alert>
          ) : null}

          {eligibleCandidates.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {eligibleCandidates.map((candidate) => {
                const checked = selectedAssigneeIds.includes(candidate.id);

                return (
                  <label
                    key={candidate.id}
                    className={`flex gap-3 rounded-2xl border p-4 text-sm ${checked ? "border-primary bg-primary/5" : "border-border/70"}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={!hasReadSource}
                      onCheckedChange={(value) =>
                        setSelectedAssigneeIds((current) =>
                          value ? [...current, candidate.id] : current.filter((item) => item !== candidate.id),
                        )
                      }
                      className="mt-1"
                    />
                    <span className="space-y-2">
                      <span className="block font-medium">
                        {candidate.userProfile?.fullName ?? candidate.position?.title ?? "Field Coordinator"}
                      </span>
                      <span className="block text-muted-foreground">{candidate.position?.title ?? "-"}</span>
                      <span className="flex flex-wrap gap-2">
                        {candidate.areaScopes?.map((scope) => (
                          <Badge key={`${candidate.id}-${scope.area.id}`} variant="outline">
                            {scope.area.name}
                          </Badge>
                        ))}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <Alert>
              <AlertTitle>Tidak ada Field Coordinator yang cocok</AlertTitle>
              <AlertDescription>
                Belum ada bawahan Field Coordinator dalam hirarki OIM ini yang memiliki overlap wilayah dengan STR
                sumber.
              </AlertDescription>
            </Alert>
          )}

          <label className="space-y-2 text-sm">
            <span>Catatan Distribusi</span>
            <Textarea
              value={assignmentNote}
              disabled={!hasReadSource}
              onChange={(event) => setAssignmentNote(event.target.value)}
              placeholder="Opsional. Catatan singkat untuk Field Coordinator penerima."
            />
          </label>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            onClick={handleForward}
            disabled={!hasReadSource || !selectedAssigneeIds.length || !eligibleCandidates.length || isSubmitting}
          >
            {isSubmitting ? "Meneruskan..." : "Teruskan ke Field Coordinator"}
          </Button>
        </CardFooter>
      </Card>
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
  const [classification, setClassification] = useState(task?.classification ?? "TERBATAS");
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
        classification,
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
            <span>Klasifikasi</span>
            <Select value={classification} onValueChange={setClassification} disabled={mode === "edit"}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih klasifikasi" />
              </SelectTrigger>
              <SelectContent>
                {["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"].map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{task.title}</h1>
            <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {task.ownerUnit?.name ?? "-"} · {task.priority} · {task.classification}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editHref ? (
            <Button asChild variant="outline">
              <Link href={editHref}>Edit Draft</Link>
            </Button>
          ) : null}
          {assignmentHref ? (
            <Button asChild>
              <Link href={assignmentHref}>Kelola Penugasan</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Task</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            {showStructuredUuk ? (
              <div className="rounded-xl border border-border/70 p-4">
                <div className="mb-3 font-medium text-sm">Informasi UUK / STR</div>
                <div className="space-y-3">
                  {task.uukStrVersion?.sections?.map((section) => (
                    <div key={section.id} className="rounded-xl border border-border/70 bg-muted/20 p-3">
                      <div className="font-medium text-sm">
                        {section.orderNumber}. {section.title}
                      </div>
                      <div className="mt-2 space-y-2 text-muted-foreground text-sm">
                        {section.items.map((item) => (
                          <div key={item.id}>
                            <span className="font-medium text-foreground">{item.itemCode}</span>:{" "}
                            {normalizeDisplayText(item.content)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-border/70 p-4 text-sm leading-6">{task.description}</p>
            )}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/70 p-3 text-sm">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
                <div className="mt-1 font-medium">{formatDate(task.dueDate)}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3 text-sm">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Child Tasks</div>
                <div className="mt-1 font-medium">{task.childTasks?.length ?? 0}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3 text-sm">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Assignments</div>
                <div className="mt-1 font-medium">{task.assignments.length}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {!hideTargetAreas ? (
              <div className="rounded-xl border border-border/70 p-4">
                <div className="mb-3 font-medium text-sm">Target Area</div>
                <div className="flex flex-wrap gap-2">
                  {task.targetAreas.map((target) => (
                    <Badge key={target.areaId} variant="outline">
                      {target.area.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-3 font-medium text-sm">Context Dokumen</div>
              <div className="space-y-2 text-sm">
                <div>Directive: {task.directiveVersion?.directive?.commandNumber ?? "-"}</div>
                <div>UUK/STR: {task.uukStrVersion?.title ?? "-"}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hideAssignments ? null : (
        <Card>
          <CardHeader>
            <CardTitle>{assignmentTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {task.assignments.length ? (
              task.assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">
                        {assignment.assignee?.userProfile?.fullName ??
                          assignment.assignee?.position?.title ??
                          "Assignee"}
                      </div>
                      <div className="text-muted-foreground text-sm">{assignment.assignee?.position?.title ?? "-"}</div>
                    </div>
                    <Badge variant={badgeVariant(assignment.status)}>{assignment.status}</Badge>
                  </div>
                  <div className="mt-3 text-muted-foreground text-sm">
                    Deadline assignment: {formatDate(assignment.dueDate)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-muted-foreground text-sm">Belum ada assignment.</div>
            )}
          </CardContent>
        </Card>
      )}
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
