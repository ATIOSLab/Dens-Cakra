"use client";

import { Eye, MapPin, X } from "lucide-react";
import type { PopupOptions } from "maplibre-gl";

import { Button } from "@/components/ui/button";
import { MapPopup } from "@/components/ui/map";

import { getFeatureTypePresentation, getUrgencyPresentation, MapSemanticBadge } from "./maps-intelijen-presentation";
import {
  formatDateTime,
  getMapFeatureReference,
  getMapFeatureTimestamp,
  getMapFeatureTitle,
  type MapNetworkFeature,
} from "./maps-intelijen-types";

const FULLSCREEN_HUD_POPUP_PADDING = {
  top: 164,
  right: 308,
  bottom: 192,
  left: 276,
};

const INLINE_MAP_POPUP_PADDING = {
  top: 28,
  right: 28,
  bottom: 172,
  left: 28,
};

const HOVER_POPUP_OFFSET = {
  center: [0, 0],
  top: [0, 14],
  "top-left": [12, 14],
  "top-right": [-12, 14],
  bottom: [0, -14],
  "bottom-left": [12, -14],
  "bottom-right": [-12, -14],
  left: [14, 0],
  right: [-14, 0],
} satisfies NonNullable<PopupOptions["offset"]>;

export function MapsIntelijenHoverPopup({
  feature,
  isFullscreen,
  onPointerEnter,
  onPointerLeave,
  onClose,
  onDetail,
}: {
  feature: MapNetworkFeature;
  isFullscreen: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onClose: () => void;
  onDetail: () => void;
}) {
  const properties = feature.properties;
  const presentation = getFeatureTypePresentation(properties);
  const urgency = getUrgencyPresentation(properties.urgency);
  const jaring = properties.jaring ?? properties.jarings?.[0] ?? null;

  return (
    <MapPopup
      longitude={feature.geometry.coordinates[0]}
      latitude={feature.geometry.coordinates[1]}
      closeButton={false}
      offset={HOVER_POPUP_OFFSET}
      padding={isFullscreen ? FULLSCREEN_HUD_POPUP_PADDING : INLINE_MAP_POPUP_PADDING}
    >
      <article
        role="dialog"
        aria-label={`Ringkasan ${presentation.label} ${getMapFeatureReference(feature)}`}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        className="dark w-[min(15.5rem,calc(100vw-1.5rem))] space-y-2 rounded-md border border-cyan-400/25 bg-slate-950/95 p-2.5 text-[10px] text-slate-100 shadow-[0_18px_48px_rgba(2,6,23,0.55)] backdrop-blur"
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <MapSemanticBadge presentation={presentation} className="h-5 px-1.5 text-[9px]" />
          <MapSemanticBadge presentation={urgency} className="h-5 px-1.5 text-[9px]" />
          <span className="ml-auto max-w-16 truncate font-mono text-[8px] text-slate-500">
            {getMapFeatureReference(feature)}
          </span>
          <button
            type="button"
            aria-label="Tutup popup peta"
            title="Tutup"
            onClick={onClose}
            className="grid size-5 shrink-0 place-items-center rounded border border-slate-700 bg-slate-900 text-slate-400 transition hover:border-cyan-500/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="size-3" aria-hidden />
          </button>
        </div>

        <div className="min-w-0">
          <h2 className="line-clamp-2 font-semibold text-[11px] leading-snug text-white">{getMapFeatureTitle(feature)}</h2>
          <p className="mt-1 line-clamp-1 text-slate-400">
            {jaring ? `Jaring: ${jaring.name}` : "Jaring belum tersedia"}
          </p>
        </div>

        <div className="space-y-1 border-t border-slate-800 pt-2 text-slate-400">
          <p className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-3 shrink-0 text-cyan-400" aria-hidden />
            <span className="truncate">{properties.primaryArea?.name ?? "Wilayah belum ditentukan"}</span>
          </p>
          <p className="truncate pl-[18px] font-mono text-[9px]">{formatDateTime(getMapFeatureTimestamp(feature))}</p>
        </div>

        <Button size="sm" onClick={onDetail} className="h-7 w-full gap-1.5 rounded text-[10px]">
          <Eye className="size-3.5" aria-hidden /> Lihat Detail
        </Button>
      </article>
    </MapPopup>
  );
}
