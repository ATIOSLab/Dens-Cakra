"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DC_CONTROLS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type { WhatsappControlChannel } from "@/server/field-ops/types";

import type { AreaSearchResult } from "../../pengguna/_components/pengguna-types";

type AreaOption = AreaSearchResult & { label: string };

const AREA_SEARCH_LEVELS = ["PROVINCE", "CITY", "REGENCY", "DISTRICT"] as const;

function areaLevelLabel(level?: string | null) {
  if (level === "PROVINCE") return "Provinsi";
  if (level === "CITY") return "Kota";
  if (level === "REGENCY") return "Kabupaten";
  if (level === "DISTRICT") return "Kecamatan";
  return level ?? "Wilayah";
}

function areaLevelSortOrder(level?: string | null) {
  if (level === "COUNTRY") return 0;
  if (level === "PROVINCE") return 1;
  if (level === "CITY" || level === "REGENCY") return 2;
  if (level === "DISTRICT") return 3;
  if (level === "VILLAGE" || level === "URBAN_VILLAGE") return 4;
  return 9;
}

function makeCodePart(value: string) {
  return (
    value
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "KANAL"
  );
}

type AddChannelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (channel: WhatsappControlChannel) => void;
};

export function AddChannelDialog({ open, onOpenChange, onCreated }: AddChannelDialogProps) {
  const [selectedAreas, setSelectedAreas] = useState<AreaOption[]>([]);
  const [areaQuery, setAreaQuery] = useState("");
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [comboOpen, setComboOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredAreaQuery = useDeferredValue(areaQuery);

  useEffect(() => {
    let cancelled = false;
    const keyword = deferredAreaQuery.trim();

    if (keyword.length < 2) {
      setAreaOptions([]);
      return;
    }

    async function loadAreas() {
      setAreasLoading(true);
      try {
        const responses = await Promise.all(
          AREA_SEARCH_LEVELS.map((level) =>
            apiBrowserFetch<AreaSearchResult[]>("/administrative-areas", {
              query: {
                search: keyword,
                level,
                isActive: true,
                page: 1,
                limit: 200,
              },
            }),
          ),
        );

        if (cancelled) return;

        const optionMap = new Map<string, AreaOption>();
        for (const area of responses.flat()) {
          if (!optionMap.has(area.id)) {
            const hierarchyLabel = area.parent?.name ? `${area.parent.name} / ${area.name}` : area.name;
            optionMap.set(area.id, {
              ...area,
              label: `${hierarchyLabel} (${areaLevelLabel(area.level)})`,
            });
          }
        }

        const merged = Array.from(optionMap.values()).sort((left, right) => {
          const levelDiff = areaLevelSortOrder(left.level) - areaLevelSortOrder(right.level);
          if (levelDiff !== 0) return levelDiff;
          return left.label.localeCompare(right.label, "id-ID");
        });
        setAreaOptions(merged);
      } catch (err) {
        console.error("Gagal memuat wilayah pelaporan", err);
        if (!cancelled) setAreaOptions([]);
      } finally {
        if (!cancelled) setAreasLoading(false);
      }
    }

    void loadAreas();
    return () => {
      cancelled = true;
    };
  }, [deferredAreaQuery]);

  const selectedAreaKeys = useMemo(() => new Set(selectedAreas.map((area) => area.id)), [selectedAreas]);

  const toggleSelectedArea = (area: AreaOption) => {
    setSelectedAreas((current) =>
      current.some((item) => item.id === area.id) ? current.filter((item) => item.id !== area.id) : [...current, area],
    );
  };

  const reset = () => {
    setSelectedAreas([]);
    setAreaQuery("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleCreate = async () => {
    const primaryArea = selectedAreas[0];
    if (!primaryArea) return;

    try {
      setBusy(true);
      setError(null);

      const codeBase = makeCodePart(`${primaryArea.name}_${primaryArea.officialCode ?? primaryArea.code}`);
      const areaSuffix =
        selectedAreas.length > 1 ? `${primaryArea.name} + ${selectedAreas.length - 1} wilayah` : primaryArea.name;
      const nameBase = selectedAreas.length > 1 ? areaSuffix : primaryArea.name;

      const response = await fetch("/api/admin-system/integrasi-wa-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: `WA_${codeBase}`,
          name: `Bot WA ${nameBase}`,
          scopeAreaIds: selectedAreas.map((area) => area.id),
          scopeAreaId: primaryArea.id,
          scopeAreaCode: primaryArea.officialCode ?? primaryArea.code,
          scopeAreaName: primaryArea.name,
          scopeAreaLevel: primaryArea.level,
          scopeAreaParentName: primaryArea.parent?.name ?? null,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error((body as { message?: string }).message ?? "Gagal membuat kanal WhatsApp.");
      }

      handleOpenChange(false);
      onCreated(body as WhatsappControlChannel);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat kanal WhatsApp.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="border-border bg-card text-card-foreground sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Tambah Koneksi WhatsApp</DialogTitle>
          <DialogDescription>
            Pilih provinsi, kota/kabupaten, atau kecamatan tempat Jaring terverifikasi melapor. Seluruh laporan Jaring
            di wilayah tersebut akan masuk ke koneksi ini.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error ? (
            <p className="rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label>Wilayah pelaporan Jaring</Label>
            <Popover open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboOpen}
                  className={cn(DC_CONTROLS.selectTrigger, "w-full justify-between font-normal")}
                >
                  {selectedAreas.length > 0 ? `${selectedAreas.length} wilayah dipilih` : "Pilih wilayah..."}
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                avoidCollisions={false}
                className="w-[min(520px,calc(100vw-32px))] border-border bg-card p-0 text-card-foreground"
              >
                <Command className="bg-transparent text-foreground" shouldFilter={false}>
                  <CommandInput
                    placeholder="Cari wilayah (min. 2 huruf)..."
                    value={areaQuery}
                    onValueChange={setAreaQuery}
                  />
                  <CommandList>
                    <CommandEmpty className="py-4 text-center text-muted-foreground text-sm">
                      {areasLoading || areaQuery.trim().length < 2
                        ? "Ketik minimal 2 huruf untuk mencari wilayah."
                        : "Tidak ada wilayah yang ditemukan."}
                    </CommandEmpty>
                    <CommandGroup>
                      {areaOptions.map((area) => (
                        <CommandItem
                          key={area.id}
                          value={area.label}
                          onSelect={() => toggleSelectedArea(area)}
                          className="text-foreground/80 focus:bg-muted"
                        >
                          <Check
                            className={cn("mr-2 size-4", selectedAreaKeys.has(area.id) ? "opacity-100" : "opacity-0")}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {area.label} {area.parent ? `(${area.parent.name})` : ""}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedAreas.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 rounded-md border border-border/70 bg-muted/20 p-2">
                {selectedAreas.map((area) => (
                  <Badge key={area.id} variant="outline" className="max-w-full gap-1 truncate">
                    {area.parent?.name ? `${area.parent.name} / ${area.name}` : area.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                Satu wilayah boleh dipakai lebih dari satu koneksi WhatsApp. Pilih beberapa wilayah sekaligus bila
                perlu.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={selectedAreas.length === 0 || busy} onClick={() => void handleCreate()}>
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
