import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { administrativeAreaLabel } from "@/features/baket/administrative-area";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { BaketLocationMap } from "@/features/baket/components/baket-location-map";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
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

function isOimPosition(position: Row | null | undefined) {
  const roleCode = String(position?.role?.code ?? "").toUpperCase();
  const positionCode = String(position?.code ?? "").toUpperCase();

  return roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER" || positionCode === "KABAGOPS" || positionCode === "KASUBDIT";
}

function oimPositionTitleFrom(position: Row | null | undefined) {
  let current = position;
  let depth = 0;

  while (current && depth < 6) {
    if (isOimPosition(current)) {
      return current.title ?? null;
    }

    current = current.reportsTo;
    depth += 1;
  }

  return null;
}

function baketSentToPositionTitle(baket: Row) {
  return oimPositionTitleFrom(baket.createdByFieldOfficerAssignment?.position) ?? null;
}

function baketStatusLabel(status?: string | null, sentToPositionTitle?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "DRAFT":
      return "Draf";
    case "READY_TO_SEND":
      return "Siap dikirim";
    case "SENT_TO_OIM":
      return sentToPositionTitle ? `Sudah dikirim ke ${sentToPositionTitle}` : "Sudah dikirim";
    case "UNDER_VERIFICATION":
      return "Sedang diverifikasi";
    case "NEEDS_DEVELOPMENT":
      return "Perlu pengembangan";
    case "VERIFIED":
      return "Terverifikasi";
    case "REJECTED":
      return "Ditolak";
    default:
      return status ?? "-";
  }
}

function baketStatusClass(status?: string | null) {
  switch ((status ?? "").toUpperCase()) {
    case "SENT_TO_OIM":
    case "UNDER_VERIFICATION":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300";
    case "READY_TO_SEND":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "VERIFIED":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "NEEDS_DEVELOPMENT":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "REJECTED":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}

function urgencyLabel(urgency?: string | null) {
  return urgency ? urgency.toUpperCase() : "-";
}

function urgencyClass(urgency?: string | null) {
  switch ((urgency ?? "").toUpperCase()) {
    case "LOW":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300";
    case "NORMAL":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "HIGH":
      return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "URGENT":
      return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}

export default async function Page({ params }: PageProps) {
  await requireRole(SYSTEM_ROLES.FIELD_OFFICER);
  const { baketId } = await params;
  const baket = await apiServerGet<Row>(`/bakets/${baketId}`);
  const version = rows(baket.versions)[0] ?? {};
  const sentToPositionTitle = baketSentToPositionTitle(baket);
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
    <div className="space-y-4 p-4 md:p-6">
      <div>
        <BackButton href="/dashboard/field-officer" />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Petugas Lapangan · Baket Terkirim</p>
          <h1 className="font-semibold text-2xl">{version.title ?? "Detail Baket"}</h1>
          <p className="text-muted-foreground text-sm">Data yang telah dikirim bersifat baca-saja.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={baketStatusClass(baket.status)}>
              {baketStatusLabel(baket.status, sentToPositionTitle)}
            </Badge>
            <Badge variant="outline" className={urgencyClass(version.urgency)}>
              Urgensi: {urgencyLabel(version.urgency)}
            </Badge>
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
            <p>GPS Lat: {version.latitude ?? "-"}</p>
            <p>GPS Long: {version.longitude ?? "-"}</p>
            <p>Wilayah: {areaLabel}</p>
          </div>
          <BaketAdministrativeArea area={version.eventArea} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Peta lokasi kejadian</CardTitle>
          <CardDescription>{areaLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {hasCoordinates ? (
            <div className="overflow-hidden rounded-xl border bg-muted">
              <BaketLocationMap
                latitude={latitude}
                longitude={longitude}
                title={version.title ?? "Lokasi Baket"}
                areaLabel={areaLabel}
                urgency={version.urgency}
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
          <CardTitle>Foto dan bukti</CardTitle>
        </CardHeader>
        <CardContent>
          {evidence.length ? (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(11rem,13rem))]">
              {evidence.map((entry) => {
                const file = entry.file ?? {};
                const fileId = entry.fileId ?? file.id;
                return (
                  <div key={fileId} className="overflow-hidden rounded-lg border">
                    {String(file.mimeType ?? "").startsWith("image/") ? (
                      <EvidenceImageViewer
                        src={`/api/files/${fileId}`}
                        alt={file.originalName ?? "Foto bukti Baket"}
                        fileName={file.originalName ?? entry.caption ?? "Bukti Baket"}
                        caption={entry.caption}
                      />
                    ) : null}
                    <p className="p-3 text-sm">{file.originalName ?? entry.caption ?? "Bukti Baket"}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Tidak ada foto atau bukti.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
