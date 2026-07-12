"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map, MapControls, MapGeoJSON } from "@/components/ui/map";

import { buildProvinceBoundaryCollection } from "./province-routing";
import type {
  ProvinceBoundaryCollection,
  ProvinceOption,
  RegionalRecipientPreview,
} from "./types";

type ProvinceMapSelectorProps = {
  provinces: ProvinceOption[];
  boundaries: ProvinceBoundaryCollection;
  selectedProvinceIds: string[];
  preview: RegionalRecipientPreview[];
  onChange: (nextProvinceIds: string[]) => void;
};

function toggleProvince(selectedProvinceIds: string[], provinceId: string) {
  if (selectedProvinceIds.includes(provinceId)) {
    return selectedProvinceIds.filter((item) => item !== provinceId);
  }

  return [...selectedProvinceIds, provinceId];
}

export function ProvinceMapSelector({
  provinces,
  boundaries,
  selectedProvinceIds,
  preview,
  onChange,
}: ProvinceMapSelectorProps) {
  const [hoveredProvinceId, setHoveredProvinceId] = useState<string | null>(null);
  const hoveredProvince =
    preview.find((item) => item.provinceId === hoveredProvinceId) ??
    (hoveredProvinceId
      ? {
          provinceId: hoveredProvinceId,
          provinceCode: provinces.find((item) => item.id === hoveredProvinceId)?.code ?? "-",
          provinceName: provinces.find((item) => item.id === hoveredProvinceId)?.name ?? "Wilayah",
          recipients: [],
        }
      : null);
  const featureCollection = buildProvinceBoundaryCollection(
    boundaries,
    provinces,
    preview,
    selectedProvinceIds,
  );

  return (
    <Card className="overflow-hidden border border-border/70">
      <CardHeader>
        <CardTitle>Peta Wilayah Sasaran</CardTitle>
        <CardDescription>
          Klik provinsi untuk menentukan sasaran STR. Sistem akan menurunkan distribusi ke Regional Commander
          yang menaungi provinsi tersebut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top,#12324f,transparent_45%),linear-gradient(180deg,#07131f,#0b1726)]">
          <div className="absolute top-4 left-4 z-10 max-w-sm rounded-xl border border-white/10 bg-black/55 p-3 text-white shadow-2xl backdrop-blur">
            <div className="text-[11px] uppercase tracking-[0.24em] text-sky-200/80">Preview Wilayah</div>
            <div className="mt-2 font-medium text-base">
              {hoveredProvince?.provinceName ?? "Arahkan kursor ke provinsi"}
            </div>
            <div className="mt-1 text-xs text-slate-200/80">
              {hoveredProvince
                ? `${hoveredProvince.recipients.length} recipient regional siap menerima distribusi.`
                : "Provinsi yang dipilih akan membentuk jalur distribusi STR ke regional commander."}
            </div>
          </div>

          <div className="h-[460px] w-full">
            <Map
              blank
              center={[118, -2]}
              zoom={3.6}
              minZoom={3}
              maxZoom={8}
              maxBounds={[
                [93, -12],
                [143, 9],
              ]}
            >
              <MapGeoJSON
                data={featureCollection}
                promoteId="areaId"
                interactive
                fillPaint={{
                  "fill-color": [
                    "case",
                    ["boolean", ["get", "selected"], false],
                    [
                      "case",
                      ["boolean", ["get", "hasRecipient"], false],
                      "#0ea5e9",
                      "#f97316",
                    ],
                    "#203449",
                  ],
                  "fill-opacity": [
                    "case",
                    ["boolean", ["get", "selected"], false],
                    0.88,
                    0.38,
                  ],
                }}
                fillHoverPaint={{
                  "fill-opacity": 1,
                }}
                linePaint={{
                  "line-color": [
                    "case",
                    ["boolean", ["get", "selected"], false],
                    [
                      "case",
                      ["boolean", ["get", "hasRecipient"], false],
                      "#e0f2fe",
                      "#ffedd5",
                    ],
                    "#4b5f76",
                  ],
                  "line-width": [
                    "case",
                    ["boolean", ["get", "selected"], false],
                    1.8,
                    0.9,
                  ],
                  "line-opacity": 0.95,
                }}
                onHover={(event) => setHoveredProvinceId(event?.feature.properties.areaId ?? null)}
                onClick={(event) => {
                  onChange(toggleProvince(selectedProvinceIds, event.feature.properties.areaId));
                }}
              />
              <MapControls position="bottom-right" showZoom />
            </Map>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{selectedProvinceIds.length} provinsi dipilih</Badge>
          <Badge variant="outline">{preview.reduce((total, item) => total + item.recipients.length, 0)} jalur regional</Badge>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])} disabled={!selectedProvinceIds.length}>
            Reset pilihan
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {selectedProvinceIds.length ? (
            selectedProvinceIds.map((provinceId) => {
              const province = provinces.find((item) => item.id === provinceId);
              const recipientCount = preview.find((item) => item.provinceId === provinceId)?.recipients.length ?? 0;

              return (
                <button
                  key={provinceId}
                  type="button"
                  onClick={() => onChange(toggleProvince(selectedProvinceIds, provinceId))}
                  className="rounded-full border border-border/70 bg-muted/50 px-3 py-1 text-sm transition hover:bg-muted"
                >
                  {province?.name ?? "Provinsi"} ({recipientCount})
                </button>
              );
            })
          ) : (
            <div className="text-muted-foreground text-sm">
              Belum ada provinsi yang dipilih. Gunakan peta di atas untuk menentukan sasaran STR.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
