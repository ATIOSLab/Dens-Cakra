import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type DensModulePageProps = {
  title: string;
  role: string;
  description: string;
  highlights: string[];
  nextSteps?: string[];
};

const defaultNextSteps = [
  "Slicing layout detail per halaman.",
  "Hubungkan state, filter, dan komponen bisnis utama.",
  "Integrasikan data backend dan kontrol permission per role.",
];

export function DensModulePage({
  title,
  role,
  description,
  highlights,
  nextSteps = defaultNextSteps,
}: DensModulePageProps) {
  const router = useRouter();

  return (
    <div className="@container/main flex flex-col gap-3 md:gap-4">
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

      <section className="grid gap-3 md:grid-cols-[1.4fr_repeat(3,minmax(0,0.6fr))]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{role}</Badge>
              <Badge>Disiapkan</Badge>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
        </Card>
        {[
          ["Cakupan", highlights.length],
          ["Selanjutnya", nextSteps.length],
          ["Status", "Siap"],
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
            <p className="font-medium text-sm">Route dan slot modul sudah tersedia.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Implementasi detail modul akan mengikuti prioritas slicing UI DENS CAKRA berikutnya.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cakupan Modul</CardTitle>
            <CardDescription>
              Referensi awal ini diambil dari spesifikasi navigasi dan workflow role terkait.
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
            <CardTitle>Tahap Selanjutnya</CardTitle>
            <CardDescription>
              Folder `_components` lokal sudah siap untuk diisi implementasi halaman sebenarnya.
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
