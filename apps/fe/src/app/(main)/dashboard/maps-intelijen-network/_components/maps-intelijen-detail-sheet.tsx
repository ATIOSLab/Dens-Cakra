"use client";

import type { ComponentType, ReactNode } from "react";

import Link from "next/link";

import {
  BadgeCheck,
  Clock3,
  ExternalLink,
  ImageIcon,
  MapPin,
  Paperclip,
  Video,
} from "lucide-react";

import { useOptionalRoleWorkspace } from "@/app/(main)/dashboard/_components/sidebar/role-workspace-provider";
import { resolveGaswilDetailHref } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EvidenceAttachmentViewer } from "@/features/baket/components/evidence-attachment-viewer";
import { cn } from "@/lib/utils";

import {
  getCompletenessPresentation,
  getCoordinateSourcePresentation,
  getDataTypePresentation,
  getUrgencyPresentation,
  MapSemanticBadge,
  type MapSemanticPresentation,
} from "./maps-intelijen-presentation";
import {
  formatDateTime,
  formatFullAreaName,
  getMapFeatureDetailHref,
  getMapFeatureReference,
  getMapFeatureTimestamp,
  getMapFeatureTitle,
  type MapNetworkFeature,
} from "./maps-intelijen-types";

const REPORT_VERIFICATION_PRESENTATION: Record<
  "VERIFIED" | "UNVERIFIED",
  MapSemanticPresentation
> = {
  VERIFIED: {
    ...getCompletenessPresentation("COMPLETE"),
    label: "Terverifikasi",
    icon: BadgeCheck,
  },
  UNVERIFIED: {
    ...getCompletenessPresentation("INCOMPLETE"),
    label: "Belum Terverifikasi",
    icon: Clock3,
  },
};

export function MapsIntelijenDetailSheet({
  feature,
  open,
  onOpenChange,
}: {
  feature: MapNetworkFeature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workspace = useOptionalRoleWorkspace();
  if (!feature) return null;

  const properties = feature.properties;
  const isReport = properties.markerType === "report";
  const isBaket = properties.markerType === "baket";
  const isAgent = properties.markerType === "agent";
  const detailHref =
    getMapFeatureDetailHref(feature) ??
    (isAgent
      ? resolveGaswilDetailHref(workspace?.activeRole, {
          assignmentId: properties.assignmentId,
          userProfileId: properties.userProfileId,
        })
      : null);
  const dataTypePresentation = getDataTypePresentation(properties.markerType);
  const urgencyPresentation = getUrgencyPresentation(properties.urgency);
  const coordinatePresentation = getCoordinateSourcePresentation(
    properties.coordinateSource,
  );
  const relatedBaketPresentation = getDataTypePresentation("baket");
  const RelatedBaketIcon = relatedBaketPresentation.icon;
  const jarings = properties.jarings?.length
    ? properties.jarings
    : properties.jaring
      ? [properties.jaring]
      : [];
  const reportVerificationPresentation =
    REPORT_VERIFICATION_PRESENTATION[
      properties.verificationStatus === "VERIFIED_BY_FIELD_OFFICER" ||
      properties.verificationStatus === "METADATA_RECORDED"
        ? "VERIFIED"
        : "UNVERIFIED"
    ];
  const actualLocation =
    properties.matchedAreas?.length
      ? [
          ...new Set(
            properties.matchedAreas
              .map((area) => area.name?.trim())
              .filter((name): name is string => Boolean(name)),
          ),
        ].join(", ")
      : properties.primaryArea
        ? formatFullAreaName(properties.primaryArea)
        : "Lokasi aktual belum teridentifikasi";
  const actualLocationLabel = isAgent
    ? "Lokasi Personel"
    : isBaket
      ? "Lokasi Aktual Baket"
      : "Lokasi Aktual Laporan";
  const latitude = feature.geometry.coordinates[1];
  const longitude = feature.geometry.coordinates[0];
  const googleMapsHref = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const attachments = properties.attachments?.items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onEscapeKeyDown={(event) => event.stopPropagation()}
        className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="border-b bg-muted/20 p-5 pr-14 text-left">
          <div className="flex flex-wrap gap-2">
            <MapSemanticBadge presentation={dataTypePresentation} />
            {!isAgent ? (
              <MapSemanticBadge presentation={urgencyPresentation} />
            ) : null}
          </div>
          <DialogTitle className="mt-2 text-xl leading-snug">
            {getMapFeatureTitle(feature)}
          </DialogTitle>
          <DialogDescription>
            {getMapFeatureReference(feature)} ·{" "}
            {formatDateTime(getMapFeatureTimestamp(feature))}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {jarings.length > 0 ? (
            <section>
              <SectionTitle>
                Identitas Jaring{" "}
                {jarings.length > 1 ? `(${jarings.length})` : ""}
              </SectionTitle>
              <div className="mt-2 grid gap-3">
                {jarings.map((jaring) => (
                  <div
                    key={jaring.id}
                    className="rounded-xl border bg-muted/15 p-4"
                  >
                    <JaringIdentitySummary
                      source={{
                        id: jaring.id,
                        name: jaring.name,
                        code: jaring.code,
                        whatsappNumber: jaring.whatsappNumber,
                        profilePhotoFileId: jaring.profilePhotoFileId,
                        gaswilName:
                          jaring.gaswilName ??
                          properties.fieldOfficer?.name ??
                          properties.userName,
                        gaswilAssignmentId:
                          jaring.gaswilAssignmentId ??
                          properties.fieldOfficer?.assignmentId ??
                          properties.assignmentId,
                        gaswilUserProfileId:
                          jaring.gaswilUserProfileId ??
                          properties.fieldOfficer?.userProfileId ??
                          properties.userProfileId,
                        placementArea: jaring.placementArea,
                      }}
                    />
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle>Ringkasan</SectionTitle>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {properties.excerpt ||
                (isAgent
                  ? `${properties.positionTitle ?? "Personel lapangan"}${properties.unitName ? ` · ${properties.unitName}` : ""}`
                  : "Ringkasan belum tersedia pada payload peta.")}
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3 rounded-xl border bg-muted/25 p-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
            <Fact
              label={isAgent ? "Jabatan" : "Kategori"}
              value={
                isAgent
                  ? (properties.positionTitle ?? "Belum tersedia")
                  : (properties.category?.name ?? "Belum dikategorikan")
              }
            />
            {isAgent ? (
              <Fact label="Unit" value={properties.unitName ?? "Belum tersedia"} />
            ) : null}
            {isReport ? (
              <SemanticFact
                label="Verifikasi Laporan"
                presentation={reportVerificationPresentation}
              />
            ) : null}
            {isAgent ? (
              <Fact
                label="Status Personel"
                value={
                  properties.agentState === "active"
                    ? "Aktif"
                    : "Lokasi Terakhir"
                }
              />
            ) : null}
            {isAgent ? (
              <Fact
                label="Usia Lokasi"
                value={`${properties.ageMinutes ?? 0} menit`}
              />
            ) : null}
            {isReport ? (
              <SemanticFact
                label="Kelengkapan"
                presentation={getCompletenessPresentation(
                  properties.completeness,
                )}
              />
            ) : null}
            <SemanticFact
              label="Sumber lokasi"
              presentation={coordinatePresentation}
            />
            <Fact
              label={actualLocationLabel}
              value={
                <a
                  href={googleMapsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1 text-sky-700 underline-offset-4 hover:underline dark:text-sky-300"
                >
                  <span>{actualLocation}</span>
                  <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                </a>
              }
            />
          </section>

          <section>
            <SectionTitle>{actualLocationLabel}</SectionTitle>
            <a
              href={googleMapsHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Buka ${actualLocationLabel.toLowerCase()} di Google Maps`}
              className={cn(
                "mt-2 block rounded-xl border p-3 text-sm transition-colors hover:border-sky-500 hover:bg-sky-500/10",
                coordinatePresentation.surfaceClass,
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <MapPin
                    className={cn(
                      "mr-1 inline size-4",
                      coordinatePresentation.iconClass,
                    )}
                    aria-hidden
                  />
                  {actualLocation}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-sky-700 dark:text-sky-300">
                  Google Maps
                  <ExternalLink className="size-3.5" aria-hidden />
                </span>
              </span>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {latitude.toFixed(7)}, {longitude.toFixed(7)}
                {properties.gpsAccuracyMeters
                  ? ` · akurasi ±${properties.gpsAccuracyMeters} m`
                  : ""}
              </p>
            </a>
          </section>

          {!isAgent ? (
            <section>
              <SectionTitle>Keterkaitan</SectionTitle>
              <div
                className={cn(
                  "mt-2 rounded-xl border p-3 text-sm",
                  properties.baket || isBaket
                    ? relatedBaketPresentation.surfaceClass
                    : "",
                )}
              >
                <RelatedBaketIcon
                  className={cn(
                    "mr-2 inline size-4",
                    relatedBaketPresentation.iconClass,
                  )}
                  aria-hidden
                />
                {isBaket
                  ? `${properties.sourceReports?.total ?? 0} Laporan Jaring terkait`
                  : properties.baket
                    ? `Baket ${properties.baket.id} · ${properties.baket.status}`
                    : "Belum terkait dengan Baket"}
              </div>
            </section>
          ) : null}

          {!isBaket && !isAgent ? (
            <section>
              <SectionTitle>Lampiran</SectionTitle>
              <div className="mt-2 space-y-3 rounded-xl border p-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <AttachmentStat
                    icon={Paperclip}
                    label="Lampiran"
                    value={properties.attachments?.total ?? 0}
                  />
                  <AttachmentStat
                    icon={ImageIcon}
                    label="Foto"
                    value={properties.attachments?.images ?? 0}
                  />
                  <AttachmentStat
                    icon={Video}
                    label="Video"
                    value={properties.attachments?.videos ?? 0}
                  />
                </div>

                {attachments.length > 0 ? (
                  <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                    {attachments.map((attachment, index) => (
                      <EvidenceAttachmentViewer
                        key={attachment.id}
                        src={`/api/files/${attachment.fileId}`}
                        fileName={
                          attachment.fileName || `Lampiran ${index + 1}`
                        }
                        mimeType={attachment.mimeType}
                        caption={attachment.caption}
                        className="min-w-0 overflow-hidden"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="border-t pt-3 text-center text-xs text-muted-foreground">
                    Tidak ada lampiran pada laporan ini.
                  </p>
                )}
              </div>
            </section>
          ) : null}
        </div>

        {detailHref ? (
          <DialogFooter className="m-0 shrink-0 rounded-none px-5 py-4">
            <Button asChild className="min-h-11 gap-2">
              <Link href={detailHref} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-4" />
                {isAgent ? "Buka Halaman Personel" : "Buka Halaman Detail"}
              </Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
      {children}
    </h3>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <dl className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-h-6 font-semibold">{value}</dd>
    </dl>
  );
}

function SemanticFact({
  label,
  presentation,
}: {
  label: string;
  presentation: MapSemanticPresentation;
}) {
  return (
    <Fact
      label={label}
      value={
        <MapSemanticBadge presentation={presentation} className="max-w-full" />
      }
    />
  );
}

function AttachmentStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: number;
}) {
  return (
    <div className="grid min-w-0 justify-items-center gap-1">
      <Icon className="size-4 text-sky-600 dark:text-sky-400" aria-hidden />
      <strong className="text-base tabular-nums">
        {value.toLocaleString("id-ID")}
      </strong>
      <span className="truncate text-muted-foreground">{label}</span>
    </div>
  );
}
