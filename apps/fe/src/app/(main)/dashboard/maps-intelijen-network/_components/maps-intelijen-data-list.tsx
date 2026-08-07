"use client";

import type { ComponentType } from "react";

import { List } from "lucide-react";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { cn } from "@/lib/utils";

import {
  COORDINATE_AVAILABILITY_PRESENTATION,
  getDataTypePresentation,
  getUrgencyPresentation,
  MapSemanticBadge,
} from "./maps-intelijen-presentation";
import {
  formatDateTime,
  getMapFeatureReference,
  getMapFeatureTitle,
  type MapNetworkFeature,
  type MapNetworkResponse,
} from "./maps-intelijen-types";

const LIST_LIMIT = 20;

export function MapsIntelijenDataList({
  features,
  meta,
  onDetail,
}: {
  features: MapNetworkFeature[];
  meta: MapNetworkResponse["meta"];
  onDetail: (feature: MapNetworkFeature) => void;
}) {
  const unmapped = meta.unlocatedItems ?? [];
  const mappedPresentation = COORDINATE_AVAILABILITY_PRESENTATION.WITH;
  const unmappedPresentation = COORDINATE_AVAILABILITY_PRESENTATION.WITHOUT;
  const MappedIcon = mappedPresentation.icon;
  const UnmappedIcon = unmappedPresentation.icon;

  return (
    <section aria-label="Daftar alternatif data peta" className="overflow-hidden rounded-2xl border bg-card shadow-xs">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-bold">
            <List className="size-4 text-sky-600 dark:text-sky-400" aria-hidden /> Lihat sebagai Daftar
          </h2>
          <p className="mt-1 text-muted-foreground text-xs">
            Penyajian sistematis untuk titik peta dan laporan yang belum memiliki koordinat.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <MapSemanticBadge
            presentation={mappedPresentation}
            label={`${(meta.summary.reports.mappable ?? 0).toLocaleString("id-ID")} laporan dapat dipetakan`}
          />
          <MapSemanticBadge
            presentation={unmappedPresentation}
            label={`${(meta.summary.reports.unlocated ?? 0).toLocaleString("id-ID")} tanpa koordinat`}
          />
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <ListSectionTitle
            icon={MappedIcon}
            iconClass={mappedPresentation.iconClass}
            label="Titik hasil terfilter"
            count={features.length}
          />
          {features.slice(0, LIST_LIMIT).map((feature) => {
            const typePresentation = getDataTypePresentation(feature.properties.markerType);
            const urgencyPresentation = getUrgencyPresentation(feature.properties.urgency);
            const TypeIcon = typePresentation.icon;
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onDetail(feature)}
                className={cn(
                  "grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border p-3 text-left transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  typePresentation.surfaceClass,
                )}
              >
                <span className="grid size-9 place-items-center rounded-lg border bg-background/70">
                  <TypeIcon className={cn("size-4", typePresentation.iconClass)} aria-hidden />
                </span>
                <div className="min-w-0 space-y-2">
                  <span className="block truncate font-semibold text-sm">{getMapFeatureTitle(feature)}</span>
                  <span className="mt-0.5 block truncate text-muted-foreground text-xs">
                    {getMapFeatureReference(feature)} ·{" "}
                    {feature.properties.primaryArea?.name ?? "Wilayah belum ditentukan"}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <MapSemanticBadge presentation={typePresentation} />
                    {feature.properties.markerType !== "agent" ? (
                      <MapSemanticBadge presentation={urgencyPresentation} />
                    ) : null}
                  </span>
                  {feature.properties.jaring ? (
                    <JaringIdentitySummary
                      compact
                      linkWhatsApp={false}
                      source={{
                        id: feature.properties.jaring.id,
                        name: feature.properties.jaring.name,
                        code: feature.properties.jaring.code,
                        whatsappNumber: feature.properties.jaring.whatsappNumber,
                        profilePhotoFileId: feature.properties.jaring.profilePhotoFileId,
                        gaswilName: feature.properties.fieldOfficer?.name,
                        gaswilAssignmentId: feature.properties.fieldOfficer?.assignmentId,
                        gaswilUserProfileId: feature.properties.fieldOfficer?.userProfileId,
                        placementArea: feature.properties.jaring.placementArea,
                      }}
                    />
                  ) : null}
                </div>
              </button>
            );
          })}
          {features.length === 0 ? (
            <EmptyState presentation="WITH" text="Tidak ada titik sesuai filter aktif." />
          ) : null}
          {features.length > LIST_LIMIT ? (
            <p className="px-1 text-muted-foreground text-xs">
              Menampilkan {LIST_LIMIT.toLocaleString("id-ID")} titik pertama dari{" "}
              {features.length.toLocaleString("id-ID")} titik termuat.
            </p>
          ) : null}
        </div>

        <div className="min-w-0 space-y-2">
          <ListSectionTitle
            icon={UnmappedIcon}
            iconClass={unmappedPresentation.iconClass}
            label="Tanpa koordinat"
            count={meta.summary.reports.unlocated ?? 0}
          />
          {unmapped.map((item) => (
            <article
              key={item.id}
              className={cn(
                "grid min-h-16 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border p-3",
                unmappedPresentation.surfaceClass,
              )}
            >
              <span className="grid size-9 place-items-center rounded-lg border bg-background/70">
                <UnmappedIcon className={cn("size-4", unmappedPresentation.iconClass)} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm">{item.title}</p>
                <p className="truncate text-muted-foreground text-xs">
                  {item.referenceNumber}
                </p>
                <JaringIdentitySummary
                  compact
                  className="mt-2"
                  source={{
                    id: item.jaring.id,
                    name: item.jaring.name,
                    code: item.jaring.code,
                    whatsappNumber: item.jaring.whatsappNumber,
                    profilePhotoFileId: item.jaring.profilePhotoFileId,
                    gaswilName: item.jaring.gaswilName,
                    gaswilAssignmentId: item.jaring.gaswilAssignmentId,
                    gaswilUserProfileId: item.jaring.gaswilUserProfileId,
                    placementArea: item.jaring.placementArea,
                  }}
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <MapSemanticBadge presentation={getDataTypePresentation("report")} />
                  <MapSemanticBadge presentation={unmappedPresentation} />
                  <span className="text-muted-foreground text-[11px]">{formatDateTime(item.reportedAt)}</span>
                </div>
              </div>
            </article>
          ))}
          {unmapped.length === 0 ? (
            <EmptyState presentation="WITHOUT" text="Tidak ada laporan tanpa koordinat pada hasil ini." />
          ) : null}
        </div>
      </div>

      {(meta.summary.reports.unlocated ?? 0) > unmapped.length ? (
        <p className="border-t px-4 py-3 text-muted-foreground text-xs">
          Menampilkan {unmapped.length.toLocaleString("id-ID")} laporan tanpa koordinat teratas dari{" "}
          {(meta.summary.reports.unlocated ?? 0).toLocaleString("id-ID")} hasil.
        </p>
      ) : null}
    </section>
  );
}

function ListSectionTitle({
  icon: Icon,
  iconClass,
  label,
  count,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconClass: string;
  label: string;
  count: number;
}) {
  return (
    <h3 className="flex min-h-8 items-center justify-between gap-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
      <span className="inline-flex items-center gap-2">
        <Icon className={cn("size-4", iconClass)} aria-hidden /> {label}
      </span>
      <span className="tabular-nums">{count.toLocaleString("id-ID")}</span>
    </h3>
  );
}

function EmptyState({ presentation, text }: { presentation: "WITH" | "WITHOUT"; text: string }) {
  const semantic = COORDINATE_AVAILABILITY_PRESENTATION[presentation];
  const Icon = semantic.icon;
  return (
    <p
      className={cn(
        "grid min-h-24 place-items-center rounded-xl border border-dashed p-4 text-center text-sm",
        semantic.surfaceClass,
      )}
    >
      <span className="grid justify-items-center gap-2 text-muted-foreground">
        <Icon className={cn("size-5", semantic.iconClass)} aria-hidden />
        {text}
      </span>
    </p>
  );
}
