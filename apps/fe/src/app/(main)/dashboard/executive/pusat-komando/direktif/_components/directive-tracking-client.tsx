"use client";

import { GitBranch } from "lucide-react";

import type { DirectiveDetail, DirectiveTracking } from "@/features/directives/types";

import { getCurrentVersion } from "./directive-shared";
import { DirectiveTrackingFlow } from "./directive-tracking-flow";

type DirectiveTrackingClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

export function DirectiveTrackingClient({ directive, tracking }: DirectiveTrackingClientProps) {
  const currentVersion = getCurrentVersion(directive);

  return (
    <div className="space-y-6">
      <header className="rounded-[8px] border border-border bg-card px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
              <GitBranch className="size-4 text-primary" />
              Tracking Direktif
            </div>
            <h1 className="mt-2 font-semibold text-2xl text-foreground">Tracking Distribusi STR</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground text-sm leading-6">
              Timeline perjalanan {directive.commandNumber} dari Pusat Komando hingga penerima distribusi lapangan.
            </p>
          </div>
          <div className="shrink-0 rounded-[6px] border border-border bg-background px-3 py-2 text-right">
            <div className="font-semibold text-[10px] text-muted-foreground uppercase tracking-[0.14em]">Versi</div>
            <div className="font-mono font-semibold text-lg">
              {currentVersion?.versionNumber ?? directive.currentVersionNumber}
            </div>
          </div>
        </div>
      </header>

      <DirectiveTrackingFlow directive={directive} tracking={tracking} />
    </div>
  );
}
