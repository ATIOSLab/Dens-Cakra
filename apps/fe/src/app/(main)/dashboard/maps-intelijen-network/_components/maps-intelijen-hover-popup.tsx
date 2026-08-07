"use client";

import { Eye, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MapPopup } from "@/components/ui/map";

import {
  getDataTypePresentation,
  getUrgencyPresentation,
  MapSemanticBadge,
} from "./maps-intelijen-presentation";
import {
  formatDateTime,
  getMapFeatureReference,
  getMapFeatureTimestamp,
  getMapFeatureTitle,
  type MapNetworkFeature,
} from "./maps-intelijen-types";

export function MapsIntelijenHoverPopup({
  feature,
  onPointerEnter,
  onPointerLeave,
  onDetail,
}: {
  feature: MapNetworkFeature;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onDetail: () => void;
}) {
  const properties = feature.properties;
  const isAgent = properties.markerType === "agent";
  const presentation = getDataTypePresentation(properties.markerType);
  const urgency = getUrgencyPresentation(properties.urgency);
  const jaring = properties.jaring ?? properties.jarings?.[0] ?? null;

  return (
    <MapPopup
      longitude={feature.geometry.coordinates[0]}
      latitude={feature.geometry.coordinates[1]}
      closeButton={false}
    >
      <article
        role="dialog"
        aria-label={`Ringkasan ${presentation.label} ${getMapFeatureReference(feature)}`}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className="dark w-[min(14.5rem,calc(100vw-1.5rem))] space-y-2 rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-[10px] text-slate-100 shadow-2xl"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <MapSemanticBadge presentation={presentation} />
          {!isAgent ? <MapSemanticBadge presentation={urgency} /> : null}
          <span className="ml-auto max-w-20 truncate font-mono text-[9px] text-slate-500">
            {getMapFeatureReference(feature)}
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="line-clamp-2 font-semibold text-[11px] leading-snug">
            {getMapFeatureTitle(feature)}
          </h2>
          <p className="mt-1 line-clamp-1 text-slate-400">
            {isAgent
              ? (properties.positionTitle ?? "Personel lapangan")
              : jaring
                ? `Jaring: ${jaring.name}`
                : "Jaring belum tersedia"}
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-800 pt-2 text-slate-400">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0 text-cyan-400" aria-hidden />
            <span className="truncate">
              {properties.primaryArea?.name ?? "Wilayah belum ditentukan"}
            </span>
          </p>
          <p className="truncate pl-[18px] font-mono text-[9px]">
            {formatDateTime(getMapFeatureTimestamp(feature))}
          </p>
        </div>

        <Button
          size="sm"
          onClick={onDetail}
          className="h-8 w-full gap-1.5 text-[10px]"
        >
          <Eye className="size-3.5" aria-hidden /> Lihat Detail
        </Button>
      </article>
    </MapPopup>
  );
}
