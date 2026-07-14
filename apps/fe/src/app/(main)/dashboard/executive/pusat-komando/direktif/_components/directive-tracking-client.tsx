"use client";

import { GitBranch } from "lucide-react";

import type { DirectiveDetail, DirectiveTracking } from "@/features/directives/types";

import { DirectiveTrackingFlow } from "./directive-tracking-flow";

type DirectiveTrackingClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

export function DirectiveTrackingClient({ directive, tracking }: DirectiveTrackingClientProps) {
  return (
    <Card className="border border-border/70">
      <CardHeader>
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="text-lg">{task.title}</CardTitle>
            <CardDescription>
              {task.ownerUnit?.name ?? "-"} ·{" "}
              <span className="dc-priority font-semibold" data-priority={task.priority.toUpperCase()}>
                {task.priority}
              </span>{" "}
              · dibuat {formatDate(task.createdAt)}
            </CardDescription>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">Tracking Distribusi STR</h1>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-muted-foreground">
            Timeline perjalanan {directive.commandNumber} dari Pusat Komando hingga agen penerima distribusi.
          </p>
        </div>
      </header>

      <DirectiveTrackingFlow directive={directive} tracking={tracking} />
    </div>
  );
}
