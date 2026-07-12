import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DirectiveDetail, DirectiveTracking } from "@/features/directives/types";

import { badgeVariant, getCurrentVersion } from "./directive-shared";

type DirectiveTrackingClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(tracking.recipientSummary).map(([key, value]) => (
          <Card key={key} className="border border-border/70">
            <CardContent className="pt-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">{key}</div>
              <div className="mt-2 font-semibold text-3xl">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Object.entries(tracking.taskSummary).map(([key, value]) => (
          <Card key={key} className="border border-border/70">
            <CardContent className="pt-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">{key}</div>
              <div className="mt-2 font-semibold text-3xl">{value}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="border border-border/70">
          <CardContent className="pt-4">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">baketCount</div>
            <div className="mt-2 font-semibold text-3xl">{tracking.baketCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task yang Terlihat di Jalur Komando</CardTitle>
          <CardDescription>Hanya task yang masih berada dalam scope komando caller yang ditampilkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tracking.tasks?.length ? (
            tracking.tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-muted-foreground text-sm">{task.ownerUnit?.name ?? "-"}</div>
                  </div>
                  <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada task di scope tracking ini.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
