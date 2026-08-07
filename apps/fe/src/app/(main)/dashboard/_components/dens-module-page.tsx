import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DensModulePageProps = {
  title: string;
  role: string;
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
  role,
  description,
  highlights,
  nextSteps = defaultNextSteps,
}: DensModulePageProps) {
  return (
    <div className="dc-page @container/main">
      {/* Back Button */}
      <div className="flex items-center">
        <BackButton />
      </div>

      <section className="grid gap-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,0.6fr))]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{role}</Badge>
              <Badge>Belum Aktif</Badge>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </Card>
        {[
          ["Cakupan", highlights.length],
          ["Tahapan", nextSteps.length],
          ["Status", "Disiapkan"],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <CardDescription className="uppercase tracking-[0.08em] [font-family:var(--dc-font-metadata)]">
                {label}
              </CardDescription>
              <CardTitle className="text-xl [font-family:var(--dc-font-metadata)]">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card>
        <CardContent>
          <div className="border border-dashed bg-muted/25 px-3 py-3">
            <p className="font-medium text-sm">Modul belum diaktifkan pada ruang kerja ini.</p>
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
            <CardDescription>
              Ringkasan fungsi yang direncanakan untuk modul ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {highlights.map((item) => (
                <li key={item} className="rounded-md border bg-muted/25 px-3 py-2 text-foreground/80">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tahapan Aktivasi</CardTitle>
            <CardDescription>
              Tahapan yang perlu diselesaikan sebelum modul dapat digunakan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground text-sm">
              {nextSteps.map((item) => (
                <li key={item} className="rounded-md border border-dashed bg-background/50 px-3 py-2">
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
