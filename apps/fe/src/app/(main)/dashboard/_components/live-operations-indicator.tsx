"use client";

import { useEffect, useState } from "react";

import { Radio, ShieldCheck } from "lucide-react";

function formatWibTime(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export function LiveOperationsIndicator() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      className="hidden min-h-8 items-center overflow-hidden rounded-md border border-[var(--dc-border-subtle)] bg-card/70 text-[10px] shadow-[var(--dc-shadow-card)] lg:flex"
      aria-label="Status sesi dan waktu operasional"
    >
      <span className="inline-flex h-full items-center gap-1.5 border-[var(--dc-divider)] border-r px-2.5 font-mono font-semibold text-[var(--dc-success)] uppercase tracking-[0.1em]">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--dc-success)] opacity-35 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-[var(--dc-success)]" />
        </span>
        <Radio className="size-3" aria-hidden="true" />
        Sesi Aktif
      </span>
      <span className="inline-flex h-full min-w-28 items-center justify-center gap-1.5 px-2.5 font-mono font-semibold text-foreground tabular-nums">
        <ShieldCheck className="size-3 text-[var(--dc-primary)]" aria-hidden="true" />
        {now ? `${formatWibTime(now)} WIB` : "--:--:-- WIB"}
      </span>
    </section>
  );
}
