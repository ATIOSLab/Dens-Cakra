import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{role}</Badge>
            <Badge>Coming Soon</Badge>
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-dashed bg-muted/30 px-4 py-4">
            <p className="font-medium text-sm">Halaman ini sudah disiapkan sebagai route dan placeholder reusable.</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Implementasi detail modul akan mengikuti prioritas slicing UI DENS CAKRA berikutnya.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cakupan Modul</CardTitle>
            <CardDescription>Referensi awal ini diambil dari spesifikasi navigasi dan workflow role terkait.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {highlights.map((item) => (
                <li key={item} className="rounded-lg border bg-muted/30 px-3 py-2 text-foreground/80">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tahap Selanjutnya</CardTitle>
            <CardDescription>Folder `_components` lokal sudah siap untuk diisi implementasi halaman sebenarnya.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {nextSteps.map((item) => (
                <li key={item} className="rounded-lg border border-dashed bg-background px-3 py-2">
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
