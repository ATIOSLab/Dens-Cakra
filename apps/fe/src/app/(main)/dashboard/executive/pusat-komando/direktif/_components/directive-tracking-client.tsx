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
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase text-cyan-500">
            <GitBranch className="size-3.5" />
            Distribusi Direktif Strategis
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
