export default function Loading() {
  const skeletonIds = ["summary", "queue", "alerts", "scope"];

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <div className="rounded-[var(--dc-radius-md)] border border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] p-5 shadow-[var(--dc-shadow-card)]">
        <div className="h-3 w-36 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
        <div className="mt-4 h-8 w-72 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-[var(--dc-surface-raised)]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {skeletonIds.map((id) => (
          <div key={id} className="dc-card min-h-28 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
            <div className="mt-5 h-8 w-16 animate-pulse rounded bg-[var(--dc-surface-raised)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
