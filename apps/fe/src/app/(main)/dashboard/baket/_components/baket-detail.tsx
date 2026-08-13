import Link from "next/link";

import { ArrowLeft, CalendarClock, FileText, type LucideIcon, MapPin, Tag, UserRound } from "lucide-react";

import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BaketAdministrativeArea } from "@/features/baket/components/baket-administrative-area";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";

import {
  type BaketRecord,
  currentBaketVersion,
  formatBaketAreaName,
  getBaketContent,
  getBaketDate,
  getBaketDisplayTitle,
  getBaketJaringIdentitySource,
  getBaketReferenceLabel,
  getBaketStatusLabel,
  getBaketVersionLabel,
} from "./baket-data";
import { BAKET_URGENCY_LABELS } from "./baket-summary-cards";

type BaketDetailProps = {
  baket: BaketRecord;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export function BaketDetail({ baket }: BaketDetailProps) {
  const version = currentBaketVersion(baket);
  const identity = resolveJaringIdentity(getBaketJaringIdentitySource(baket));
  const sourceMessages = version?.sourceMessages ?? [];
  const attachments = version?.attachments ?? [];
  const urgencyLabel = version?.urgency ? BAKET_URGENCY_LABELS[version.urgency] : "Normal";

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 sm:space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard/baket">Bahan Keterangan (Baket)</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detail Baket</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <Button variant="ghost" size="sm" asChild className="h-8 px-0 text-muted-foreground hover:text-foreground">
            <Link href="/dashboard/baket">
              <ArrowLeft className="size-4" />
              Kembali ke Baket
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-10 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <DOMAIN_VISUALS.baket.Icon className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {getBaketDisplayTitle(baket)}
              </h1>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{getBaketReferenceLabel(baket)}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{getBaketStatusLabel(baket.status)}</Badge>
          <Badge variant="outline">Urgensi: {urgencyLabel}</Badge>
          <Badge variant="outline">Kategori: {baket.reportCategory?.name ?? "Belum tersedia"}</Badge>
          <Badge variant="outline">{getBaketVersionLabel(baket)}</Badge>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-violet-600" />
              Isi Baket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{getBaketContent(baket) || "-"}</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="size-4 text-violet-600" />
                Metadata Baket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <MetaRow icon={Tag} label="Kategori" value={baket.reportCategory?.name ?? "Belum tersedia"} />
              <MetaRow icon={MapPin} label="Lokasi Baket" value={formatBaketAreaName(version?.eventArea)} />
              <MetaRow icon={CalendarClock} label="Tanggal Baket" value={formatDateTime(getBaketDate(baket))} />
              <MetaRow icon={UserRound} label="Sumber" value={identity.name} />
              <Separator />
              <GaswilEntityLink
                assignmentId={identity.gaswilAssignmentId}
                userProfileId={identity.gaswilUserProfileId}
                name={identity.gaswilName}
              />
            </CardContent>
          </Card>

          <BaketAdministrativeArea area={version?.eventArea} />
        </div>
      </section>

      {attachments.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lampiran Baket</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {attachments.map((attachment) => {
              const fileId = attachment.fileId ?? attachment.file?.id;
              if (!fileId) return null;
              return (
                <EvidenceAttachmentViewer
                  key={fileId}
                  src={`/api/files/${fileId}`}
                  fileName={attachment.file?.originalName ?? fileId}
                  mimeType={attachment.file?.mimeType}
                  caption={attachment.caption}
                />
              );
            })}
          </CardContent>
        </Card>
      ) : null}

      {sourceMessages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sumber Baket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sourceMessages.map((source, index) => (
              <div key={source.messageId ?? index} className="rounded-md border bg-muted/20 p-3 text-sm">
                <p className="font-medium">
                  {source.message?.jaring?.aliasName ?? source.message?.jaring?.fullName ?? "Sumber belum tersedia"}
                </p>
                <p className="mt-1 line-clamp-3 text-muted-foreground">{source.message?.content ?? "-"}</p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {source.message?.referenceNumber ?? "Tanpa nomor referensi"} -{" "}
                  {formatDateTime(source.message?.receivedAt)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
