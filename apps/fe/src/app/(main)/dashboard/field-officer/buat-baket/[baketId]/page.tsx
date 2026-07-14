import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { administrativeAreaLabel } from "@/features/baket/administrative-area";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { BaketLocationMap } from "@/features/baket/components/baket-location-map";
import { apiServerGet } from "@/lib/api/server-client";
import { requireRole } from "@/lib/auth/server-session";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ baketId: string }> };
type Row = Record<string, any>;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value as Row[]) : [];
}

function formatDate(value?: string | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";
}

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const { baketId } = await params;
  const baket = await apiServerGet<Row>(`/bakets/${baketId}`);
  const version = rows(baket.versions)[0] ?? {};
  const sourceMessages = rows(version.sourceMessages);
  const latitude = Number(version.latitude);
  const longitude = Number(version.longitude);
  const hasCoordinates =
    version.latitude !== null &&
    version.latitude !== undefined &&
    version.longitude !== null &&
    version.longitude !== undefined &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const areaLabel = administrativeAreaLabel(version.eventArea);
  const evidence = [
    ...rows(version.attachments),
    ...sourceMessages.flatMap((source) => rows(source.message?.media)),
  ].filter(
    (entry, index, values) =>
      values.findIndex((candidate) => (candidate.fileId ?? candidate.file?.id) === (entry.fileId ?? entry.file?.id)) ===
      index,
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Field Officer · Baket terkirim</p>
          <h1 className="font-semibold text-2xl">{version.title ?? "Detail Baket"}</h1>
          <p className="text-muted-foreground text-sm">Data yang telah dikirim bersifat baca-saja.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/field-officer/buat-baket">Kembali</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge>{baket.status}</Badge>
            <Badge variant="outline">{version.urgency ?? "-"}</Badge>
            <Badge variant="outline">{baket.reportCategory?.name ?? "Kategori belum tersedia"}</Badge>
            <Badge variant="outline">{baket.jaringCluster?.name ?? "Klaster belum tersedia"}</Badge>
          </div>
          <CardTitle>{version.title ?? "Baket"}</CardTitle>
          <CardDescription>
            {baket.primaryJaring?.aliasName ?? baket.primaryJaring?.code ?? "Jaring"} · {formatDate(version.eventTime)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="whitespace-pre-wrap leading-7">{version.normalizedContent ?? version.originalContent ?? "-"}</p>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              GPS: {version.latitude ?? "-"}, {version.longitude ?? "-"}
            </p>
            <p>Wilayah: {areaLabel}</p>
          </div>
          <BaketAdministrativeArea area={version.eventArea} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peta lokasi kejadian</CardTitle>
          <CardDescription>
            {areaLabel} · {hasCoordinates ? `${latitude}, ${longitude}` : "Koordinat tidak tersedia"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasCoordinates ? (
            <div className="overflow-hidden rounded-xl border bg-muted">
              <BaketLocationMap
                latitude={latitude}
                longitude={longitude}
                title={version.title ?? "Lokasi Baket"}
                areaLabel={areaLabel}
              />
            </div>
          ) : (
            <p className="rounded-lg border border-dashed p-4 text-muted-foreground text-sm">
              Koordinat lokasi tidak tersedia untuk ditampilkan pada peta.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Foto dan evidence</CardTitle>
        </CardHeader>
        <CardContent>
          {evidence.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {evidence.map((entry) => {
                const file = entry.file ?? {};
                const fileId = entry.fileId ?? file.id;
                return (
                  <div key={fileId} className="overflow-hidden rounded-lg border">
                    {String(file.mimeType ?? "").startsWith("image/") ? (
                      <img
                        src={`/api/files/${fileId}`}
                        alt={file.originalName ?? "Foto evidence Baket"}
                        className="aspect-video w-full object-cover"
                      />
                    ) : null}
                    <p className="p-3 text-sm">{file.originalName ?? entry.caption ?? "Evidence Baket"}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Tidak ada foto atau evidence.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
