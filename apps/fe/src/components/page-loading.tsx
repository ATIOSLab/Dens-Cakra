import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type PageLoadingProps = {
  className?: string;
  title?: string;
  description?: string;
};

const METRIC_SKELETONS = ["ringkasan", "antrean", "prioritas", "cakupan"];
const ROW_SKELETONS = ["row-1", "row-2", "row-3"];

export function PageLoading({
  className,
  title = "Memuat halaman",
  description = "Mengambil data terbaru, mohon tunggu sebentar.",
}: PageLoadingProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn("@container/main flex min-h-[min(34rem,calc(100svh-8rem))] flex-col gap-4 md:gap-6", className)}
    >
      <div className="relative overflow-hidden rounded-[var(--dc-radius-md)] border border-[var(--dc-border-subtle)] bg-[var(--dc-card)] p-5 shadow-[var(--dc-shadow-card)]">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="inline-flex h-7 items-center gap-2 rounded-sm border border-[var(--dc-primary)]/35 bg-[var(--dc-primary-soft)] px-2.5 text-[var(--dc-primary)]">
              <Spinner className="size-3.5" />
              <span className="font-semibold text-[length:var(--dc-text-micro)] uppercase tracking-[0.08em]">
                Memproses
              </span>
            </div>
            <div className="space-y-1">
              <h1 className="font-semibold text-foreground text-lg leading-tight sm:text-xl">{title}</h1>
              <p className="max-w-2xl text-muted-foreground text-sm leading-6">{description}</p>
            </div>
          </div>
          <div className="h-16 w-full shrink-0 overflow-hidden rounded-[var(--dc-radius-md)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface-raised)] sm:w-44">
            <div className="h-full w-1/2 animate-pulse bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,var(--dc-primary)_20%,transparent),transparent)]" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {METRIC_SKELETONS.map((id) => (
          <div key={id} className="dc-card min-h-28 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
            <div className="mt-5 h-8 w-16 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
            <div className="mt-3 h-3 w-32 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <div className="dc-card p-4">
          <div className="h-4 w-36 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
          <div className="mt-5 space-y-3">
            {ROW_SKELETONS.map((id) => (
              <div key={id} className="grid min-h-14 grid-cols-[2.5rem_minmax(0,1fr)_5rem] items-center gap-3">
                <div className="size-9 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
                <div className="min-w-0 space-y-2">
                  <div className="h-3 w-full max-w-md animate-pulse rounded bg-[var(--dc-surface-raised)]" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
                </div>
                <div className="h-6 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
              </div>
            ))}
          </div>
        </div>

        <div className="dc-card min-h-52 p-4">
          <div className="h-4 w-28 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
          <div className="mt-5 h-32 animate-pulse rounded-[var(--dc-radius-md)] bg-[var(--dc-surface-raised)]" />
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="h-2 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
            <div className="h-2 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
            <div className="h-2 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
          </div>
        </div>
      </div>
    </section>
  );
}
