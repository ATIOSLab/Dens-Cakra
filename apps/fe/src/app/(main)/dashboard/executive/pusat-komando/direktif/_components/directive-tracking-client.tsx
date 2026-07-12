"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  DirectiveDetail,
  DirectiveTracking,
  DirectiveTrackingActor,
  DirectiveTrackingAssignment,
  DirectiveTrackingTask,
} from "@/features/directives/types";

import { badgeVariant, formatDate, getCurrentVersion } from "./directive-shared";

type DirectiveTrackingClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

function trackingBadgeVariant(status: string) {
  if (["FAILED", "CANCELLED"].includes(status)) {
    return "destructive" as const;
  }

  if (
    [
      "READ",
      "ACKNOWLEDGED",
      "ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
      "PUBLISHED",
      "READY",
      "DISTRIBUTED",
    ].includes(status)
  ) {
    return "default" as const;
  }

  return badgeVariant(status);
}

function statusLabel(status: string) {
  switch (status) {
    case "SENT":
      return "Terkirim";
    case "DELIVERED":
      return "Diterima";
    case "READ":
      return "Dibaca";
    case "ACKNOWLEDGED":
      return "Diakui";
    case "FAILED":
      return "Gagal";
    case "DRAFT":
      return "Draft";
    case "READY":
      return "Siap";
    case "PUBLISHED":
      return "Diteruskan";
    case "REVISED":
      return "Direvisi";
    case "CANCELLED":
      return "Dibatalkan";
    case "ASSIGNED":
      return "Sudah Didistribusikan";
    case "IN_PROGRESS":
      return "Sedang Berjalan";
    case "COMPLETED":
      return "Selesai";
    case "OVERDUE":
      return "Lewat Deadline";
    case "REASSIGNED":
      return "Dialihkan";
    default:
      return status;
  }
}

function SummaryCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card className="border border-border/70">
      <CardContent className="pt-4">
        <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{title}</div>
        <div className="mt-2 font-semibold text-3xl">{value}</div>
        <div className="mt-1 text-muted-foreground text-xs">{description}</div>
      </CardContent>
    </Card>
  );
}

function ActorIdentity({
  actor,
  fallback,
}: {
  actor?: DirectiveTrackingActor | null;
  fallback: string;
}) {
  if (!actor) {
    return <div className="font-medium">{fallback}</div>;
  }

  return (
    <div className="space-y-1">
      <div className="font-medium">{actor.fullName ?? actor.positionTitle ?? fallback}</div>
      <div className="text-muted-foreground text-sm">
        {actor.positionTitle ?? fallback}
        {actor.organizationUnitName ? ` · ${actor.organizationUnitName}` : ""}
      </div>
      {actor.areaScopes.length ? (
        <div className="flex flex-wrap gap-2">
          {actor.areaScopes.map((scope) => (
            <Badge key={`${actor.assignmentId}-${scope.areaId}`} variant={scope.isPrimary ? "default" : "outline"}>
              {scope.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AssignmentCard({
  assignment,
  title,
  emptyDownstreamLabel,
}: {
  assignment: DirectiveTrackingAssignment;
  title: string;
  emptyDownstreamLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{title}</div>
          <ActorIdentity actor={assignment.assignee} fallback="Penugasan belum memiliki penerima" />
        </div>
        <Badge variant={trackingBadgeVariant(assignment.status)}>{statusLabel(assignment.status)}</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border/70 p-3 text-sm">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Assigned</div>
          <div className="mt-1 font-medium">{formatDate(assignment.assignedAt)}</div>
        </div>
        <div className="rounded-xl border border-border/70 p-3 text-sm">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Read</div>
          <div className="mt-1 font-medium">{formatDate(assignment.readAt)}</div>
        </div>
        <div className="rounded-xl border border-border/70 p-3 text-sm">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Ack</div>
          <div className="mt-1 font-medium">{formatDate(assignment.acknowledgedAt)}</div>
        </div>
        <div className="rounded-xl border border-border/70 p-3 text-sm">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Deadline</div>
          <div className="mt-1 font-medium">{formatDate(assignment.dueDate)}</div>
        </div>
      </div>

      {assignment.assignmentNote ? (
        <div className="mt-4 rounded-xl border border-border/70 p-3 text-sm">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Instruksi</div>
          <div className="mt-1 font-medium">{assignment.assignmentNote}</div>
        </div>
      ) : null}

      {assignment.downstreamAssignments ? (
        <div className="mt-4 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Distribusi Turunan
          </div>
          {assignment.downstreamAssignments.length ? (
            assignment.downstreamAssignments.map((downstream) => (
              <div key={downstream.id} className="rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <ActorIdentity actor={downstream.assignee} fallback="Penerima lapangan" />
                  <Badge variant={trackingBadgeVariant(downstream.status)}>{statusLabel(downstream.status)}</Badge>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-xl border border-border/70 p-3 text-sm">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Assigned</div>
                    <div className="mt-1 font-medium">{formatDate(downstream.assignedAt)}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3 text-sm">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Read</div>
                    <div className="mt-1 font-medium">{formatDate(downstream.readAt)}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3 text-sm">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Ack</div>
                    <div className="mt-1 font-medium">{formatDate(downstream.acknowledgedAt)}</div>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3 text-sm">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Complete</div>
                    <div className="mt-1 font-medium">{formatDate(downstream.completedAt)}</div>
                  </div>
                </div>
                {downstream.assignmentNote ? (
                  <div className="mt-3 rounded-xl border border-border/70 p-3 text-sm">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Instruksi</div>
                    <div className="mt-1 font-medium">{downstream.assignmentNote}</div>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">{emptyDownstreamLabel ?? "Belum ada distribusi turunan."}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TaskCard({ task }: { task: DirectiveTrackingTask }) {
  return (
    <Card className="border border-border/70">
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription>
              {task.ownerUnit?.name ?? "-"} · {task.priority} · dibuat {formatDate(task.createdAt)}
            </CardDescription>
          </div>
          <Badge variant={trackingBadgeVariant(task.status)}>{statusLabel(task.status)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">OIM Sudah Baca</div>
            <div className="mt-1 font-medium">{task.oimStage.hasRead ? "Ya" : "Belum"}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">FC Diteruskan</div>
            <div className="mt-1 font-medium">
              {task.oimStage.hasForwardedToFieldCoordinator ? "Ya" : "Belum"}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Jumlah FC</div>
            <div className="mt-1 font-medium">{task.oimStage.fieldCoordinatorAssignmentCount}</div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">FC Read</div>
            <div className="mt-1 font-medium">{task.fieldCoordinatorSummary.read}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">FC Distributed</div>
            <div className="mt-1 font-medium">{task.fieldCoordinatorSummary.distributed}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Korwil Read</div>
            <div className="mt-1 font-medium">{task.korwilSummary.read}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Korwil Complete</div>
            <div className="mt-1 font-medium">{task.korwilSummary.completed}</div>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 p-4 text-sm">
          <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Wilayah Task</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {task.targetAreas.length ? (
              task.targetAreas.map((target) => (
                <Badge key={`${task.id}-${target.areaId}`} variant={target.isPrimary ? "default" : "outline"}>
                  {target.area.name}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">Belum ada target area.</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-semibold">Distribusi ke Field Coordinator</div>
          {task.fieldCoordinatorAssignments?.length ? (
            task.fieldCoordinatorAssignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                title="Field Coordinator"
                emptyDownstreamLabel="Field Coordinator ini belum membagikan ke korwil / petugas lapangan."
              />
            ))
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada Field Coordinator yang menerima task ini.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function DirectiveTrackingClient({ directive, tracking }: DirectiveTrackingClientProps) {
  const currentVersion = getCurrentVersion(directive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Tracking Direktif</h1>
        <p className="text-muted-foreground text-sm">
          {directive.commandNumber} - versi {currentVersion?.versionNumber ?? directive.currentVersionNumber}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          title="Regional Sudah Baca"
          value={tracking.stageSummary.regional.readCount}
          description={`${tracking.stageSummary.regional.totalRecipients} penerima regional`}
        />
        <SummaryCard
          title="Regional Sudah Teruskan"
          value={tracking.stageSummary.regional.forwardedCount}
          description="Sudah membuat STR penerusan regional"
        />
        <SummaryCard
          title="OIM Sudah Buka"
          value={tracking.stageSummary.oim.readCount}
          description={`${tracking.stageSummary.oim.taskCount} task OIM terbentuk`}
        />
        <SummaryCard
          title="FC Sudah Terima"
          value={tracking.stageSummary.fieldCoordinator.readCount}
          description={`${tracking.stageSummary.fieldCoordinator.totalAssignments} assignment FC`}
        />
        <SummaryCard
          title="Korwil Selesai"
          value={tracking.stageSummary.korwil.completed}
          description={`${tracking.stageSummary.korwil.total} distribusi korwil / FO`}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="RC Ack"
          value={tracking.stageSummary.regional.acknowledgedCount}
          description="Regional commander sudah acknowledge"
        />
        <SummaryCard
          title="OIM → FC"
          value={tracking.stageSummary.oim.forwardedToFieldCoordinatorCount}
          description="Regional chain yang sudah diteruskan ke FC"
        />
        <SummaryCard
          title="FC → Korwil"
          value={tracking.stageSummary.fieldCoordinator.distributedCount}
          description="FC yang sudah membagikan lagi ke lapangan"
        />
        <SummaryCard title="Baket" value={tracking.baketCount} description="Total baket dari rantai direktif ini" />
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Rantai Distribusi per Regional</CardTitle>
          <CardDescription>
            Executive bisa melihat status baca, penerusan, dan distribusi turunannya sampai ke Field Coordinator dan
            korwil / petugas lapangan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tracking.regionalChains.length ? (
            <Accordion type="multiple" className="space-y-4">
              {tracking.regionalChains.map((chain) => {
                const regionLabel =
                  chain.regionalRecipient.targetUnit?.name ??
                  chain.regionalRecipient.targetPosition?.organizationUnit?.name ??
                  chain.regionalRecipient.targetPosition?.title ??
                  "Regional tujuan";

                return (
                  <AccordionItem
                    key={chain.regionalRecipient.id}
                    value={chain.regionalRecipient.id}
                    className="overflow-hidden rounded-2xl border border-border/70 px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 flex-col gap-3 pr-4 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{regionLabel}</span>
                          <Badge variant={trackingBadgeVariant(chain.regionalRecipient.status)}>
                            RC {statusLabel(chain.regionalRecipient.status)}
                          </Badge>
                          <Badge variant={chain.forwarding ? "default" : "outline"}>
                            {chain.forwarding ? "Regional Sudah Teruskan" : "Belum Diteruskan"}
                          </Badge>
                          <Badge variant={chain.oimStage.hasRead ? "default" : "outline"}>
                            {chain.oimStage.hasRead ? "OIM Sudah Baca" : "OIM Belum Baca"}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground text-sm">
                          FC read {chain.fieldCoordinatorStage.readCount} · FC distributed{" "}
                          {chain.fieldCoordinatorStage.distributedCount} · Korwil complete{" "}
                          {chain.korwilStage.completed}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-border/70 p-4 text-sm">
                            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                              Regional Commander
                            </div>
                            <div className="mt-2 font-medium">
                              {chain.regionalRecipient.targetPosition?.assigneeName ??
                                chain.regionalRecipient.targetPosition?.title ??
                                regionLabel}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Status: {statusLabel(chain.regionalRecipient.status)}
                            </div>
                            <div className="mt-1 text-muted-foreground">Read: {formatDate(chain.regionalRecipient.readAt)}</div>
                          </div>

                          <div className="rounded-xl border border-border/70 p-4 text-sm">
                            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                              STR Regional
                            </div>
                            <div className="mt-2 font-medium">
                              {chain.forwarding?.currentVersion?.title ?? "Belum ada penerusan regional"}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Status: {chain.forwarding ? statusLabel(chain.forwarding.status) : "-"}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Dibuat: {formatDate(chain.forwarding?.createdAt)}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/70 p-4 text-sm">
                            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">Tahap OIM</div>
                            <div className="mt-2 font-medium">
                              {chain.oimStage.hasRead ? "Sudah diproses OIM" : "Belum diproses OIM"}
                            </div>
                            <div className="mt-1 text-muted-foreground">Task terbentuk: {chain.oimStage.taskCount}</div>
                            <div className="mt-1 text-muted-foreground">
                              Diteruskan ke FC: {chain.oimStage.hasForwardedToFieldCoordinator ? "Ya" : "Belum"}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/70 p-4 text-sm">
                            <div className="text-muted-foreground text-[11px] uppercase tracking-wide">
                              Tahap FC / Korwil
                            </div>
                            <div className="mt-2 font-medium">
                              FC Read: {chain.fieldCoordinatorStage.readCount} / {chain.fieldCoordinatorStage.totalAssignments}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              FC Sudah Distribusi: {chain.fieldCoordinatorStage.distributedCount}
                            </div>
                            <div className="mt-1 text-muted-foreground">
                              Korwil Complete: {chain.korwilStage.completed}
                            </div>
                          </div>
                        </div>

                        {chain.oimTasks?.length ? (
                          <div className="space-y-4">
                            {chain.oimTasks.map((task) => (
                              <TaskCard key={task.id} task={task} />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border/70 p-4 text-muted-foreground text-sm">
                            Belum ada task OIM yang terbentuk dari STR regional ini.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada recipient regional pada direktif ini.</div>
          )}
        </CardContent>
      </Card>

      {tracking.unlinkedTasks?.length ? (
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Task Belum Tertaut ke Penerusan Regional</CardTitle>
            <CardDescription>
              Bagian ini menampilkan task terkait direktif yang tidak terpetakan ke rantai STR regional tertentu.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tracking.unlinkedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
