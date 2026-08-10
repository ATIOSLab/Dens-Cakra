"use client";

import { GitBranch } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
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
      <PageHeader
        title="Pelacakan Distribusi STR"
        description={`Linimasa perjalanan ${directive.commandNumber} dari Pusat Komando hingga penerima distribusi lapangan.`}
        backButton={true}
        badge={
          <div className="flex items-center gap-2 font-semibold text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
            <GitBranch className="size-4 text-primary" />
            <span>Pelacakan Direktif</span>
          </div>
        }
      />

      <DirectiveTrackingFlow directive={directive} tracking={tracking} />
    </div>
  );
}
