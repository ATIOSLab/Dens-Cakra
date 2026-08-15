import { CheckCircle2, CircleDashed, ListChecks, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type DensModulePageProps = {
  title: string;
  roleLabel: string;
  description: string;
  highlights: string[];
  nextSteps?: string[];
};

const defaultNextSteps = [
  "Lengkapi penyajian data utama modul.",
  "Aktifkan filter dan tindakan operasional.",
  "Hubungkan data sesuai kewenangan pengguna.",
];

export function DensModulePage({
  title,
  roleLabel,
  description,
  highlights,
  nextSteps = defaultNextSteps,
}: DensModulePageProps) {
  const summaryCards = [
    { label: "Cakupan", value: highlights.length, icon: ShieldCheck },
    { label: "Tahapan", value: nextSteps.length, icon: ListChecks },
    { label: "Status", value: "Disiapkan", icon: CircleDashed },
  ];

  return (
    <div className="dc-page @container/main">
      <PageHeader
        title={title}
        description={description}
        backButton
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{roleLabel}</Badge>
            <Badge className="gap-1.5 border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              <CircleDashed className="size-3.5" />
              Disiapkan
            </Badge>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <Card key={label} size="sm" className="border-border/70">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="uppercase tracking-[0.08em] [font-family:var(--dc-font-metadata)]">
                  {label}
                </CardDescription>
                <span className="grid size-8 place-items-center rounded-md border border-border/70 bg-muted/40 text-primary">
                  <Icon className="size-4" />
                </span>
              </div>
              <CardTitle className="text-xl [font-family:var(--dc-font-metadata)]">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent>
          <div className="border border-dashed bg-muted/25 px-4 py-3">
            <p className="flex items-center gap-2 font-medium text-sm">
              <CircleDashed className="size-4 text-amber-500" />
              Modul sedang disiapkan pada ruang kerja ini.
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Gunakan menu aktif yang tersedia atau hubungi administrator sistem untuk informasi akses.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cakupan Modul</CardTitle>
            <CardDescription>Ringkasan fungsi yang direncanakan untuk modul ini.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-md border bg-muted/25 px-3 py-2 text-foreground/80"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tahapan Aktivasi</CardTitle>
            <CardDescription>Tahapan yang perlu diselesaikan sebelum modul dapat digunakan.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {nextSteps.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 rounded-md border border-dashed bg-background/50 px-3 py-2"
                >
                  <CircleDashed className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
