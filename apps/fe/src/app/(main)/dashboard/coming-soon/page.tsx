type ComingSoonPageProps = {
  title?: string;
  description?: string;
};

export function ComingSoonPage({
  title = "Modul Belum Tersedia",
  description = "Modul ini sedang disiapkan dan belum dapat digunakan pada ruang kerja aktif.",
}: ComingSoonPageProps) {
  return (
    <div className="dc-page">
      <section className="rounded-md border border-[var(--dc-border-subtle)] bg-card/90 p-3 shadow-[var(--dc-shadow-card)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="dc-eyebrow">Status Modul</p>
            <h1 className="mt-1 truncate font-semibold text-lg">{title}</h1>
          </div>
          <span className="rounded-sm border border-[var(--dc-warning)]/40 bg-[var(--dc-warning-soft)] px-2 py-1 font-semibold text-[0.68rem] text-[var(--dc-warning)] uppercase tracking-[0.08em] [font-family:var(--dc-font-metadata)]">
            Belum Aktif
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-muted-foreground text-sm">{description}</p>
      </section>
      <section className="grid gap-3 md:grid-cols-3">
        {["Navigasi", "Antarmuka", "Integrasi Data"].map((item) => (
          <div key={item} className="rounded-md border border-[var(--dc-border-subtle)] bg-card/75 p-3">
            <p className="text-muted-foreground text-xs uppercase tracking-[0.08em] [font-family:var(--dc-font-metadata)]">
              {item}
            </p>
            <div className="mt-2 h-1 bg-[var(--dc-divider)]">
              <div className="h-full w-2/3 bg-[var(--dc-primary)]" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function Page() {
  return <ComingSoonPage />;
}
