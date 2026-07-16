"use client";

import { GitBranch, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import type { DirectiveDetail, DirectiveTracking } from "@/features/directives/types";

import { getCurrentVersion } from "./directive-shared";
import { DirectiveTrackingFlow } from "./directive-tracking-flow";

type DirectiveTrackingClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

export function DirectiveTrackingClient({ directive, tracking }: DirectiveTrackingClientProps) {
  const currentVersion = getCurrentVersion(directive);
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-mono border-white/10 hover:bg-white/[0.04] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          <span>Kembali</span>
        </Button>
      </div>

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
        </div>
      </header>

      <DirectiveTrackingFlow directive={directive} tracking={tracking} />
    </div>
  );
}
