"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Activity, Bot, Check, CheckCircle2, ChevronsUpDown, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type { WhatsappControlChannel } from "@/server/field-ops/types";

import type { AreaSearchResult } from "../../pengguna/_components/pengguna-types";

type AreaOption = AreaSearchResult & { label: string };

type ChannelGroup = {
  key: string;
  title: string;
  subtitle: string;
  sortKey: string;
  channels: WhatsappControlChannel[];
};

const AREA_SEARCH_LEVELS = ["PROVINCE", "CITY", "REGENCY", "DISTRICT"] as const;

function areaLevelLabel(level?: string | null) {
  if (level === "PROVINCE") return "Provinsi";
  if (level === "CITY") return "Kota";
  if (level === "REGENCY") return "Kabupaten";
  if (level === "DISTRICT") return "Kecamatan";
  return level ?? "Wilayah";
}

function tone(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "ACTIVE") {
    return "bg-emerald-500/15 border-emerald-400/35 text-emerald-700 dark:text-emerald-100";
  }

  if (normalized === "DEGRADED") {
    return "bg-amber-500/15 border-amber-300/35 text-amber-700 dark:text-amber-100";
  }

  return "bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/75";
}

function connectionTone(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "CONNECTED") {
    return "bg-emerald-500/15 border-emerald-400/35 text-emerald-700 dark:text-emerald-100";
  }

  if (normalized === "QR_READY" || normalized === "PAIRING_CODE_READY" || normalized === "CONNECTING") {
    return "bg-cyan-500/15 border-cyan-300/35 text-cyan-700 dark:text-cyan-100";
  }

  if (normalized === "ERROR") {
    return "bg-rose-500/15 border-rose-300/35 text-rose-700 dark:text-rose-100";
  }

  return "bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/75";
}

function channelStatusLabel(status: string) {
  if (status === "ACTIVE") return "Aktif";
  if (status === "INACTIVE") return "Nonaktif";
  if (status === "DEGRADED") return "Perlu perhatian";
  return status;
}

function connectionStatusLabel(status: string) {
  if (status === "CONNECTED") return "Terhubung";
  if (status === "DISCONNECTED") return "Terputus";
  if (status === "CONNECTING") return "Menghubungkan";
  if (status === "QR_READY") return "QR siap";
  if (status === "PAIRING_CODE_READY") return "Kode pairing siap";
  if (status === "ERROR") return "Error";
  return status;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function branchLabel(branch?: string | null) {
  if (branch === "BINDA") return "BIN Daerah (Binda)";
  if (branch === "DIRECTORATE") return "Direktorat";
  if (branch === "PUSAT") return "Pusat";
  return null;
}

function branchSortOrder(branch?: string | null) {
  if (branch === "PUSAT") return 0;
  if (branch === "DIRECTORATE") return 1;
  if (branch === "BINDA") return 2;
  return 9;
}

function areaLevelSortOrder(level?: string | null) {
  if (level === "COUNTRY") return 0;
  if (level === "PROVINCE") return 1;
  if (level === "CITY" || level === "REGENCY") return 2;
  if (level === "DISTRICT") return 3;
  if (level === "VILLAGE" || level === "URBAN_VILLAGE") return 4;
  return 9;
}

function compactAreaHierarchy(channel: WhatsappControlChannel) {
  const areas = channelScopeAreas(channel);
  if (areas.length > 1) {
    return areas.map((area) => (area.parentName ? `${area.parentName} / ${area.name}` : area.name)).join(", ");
  }

  const hierarchy = channel.scopeHierarchy ?? [];
  const visibleHierarchy = hierarchy.filter((area) => area.level !== "COUNTRY");

  if (visibleHierarchy.length > 0) {
    return visibleHierarchy.map((area) => area.name).join(" / ");
  }

  if (channel.scopeAreaParentName && channel.scopeAreaName) {
    return `${channel.scopeAreaParentName} / ${channel.scopeAreaName}`;
  }

  return channel.scopeAreaName ?? channel.coordinatorRegion ?? "Belum terpetakan";
}

function channelScopeAreas(channel: WhatsappControlChannel) {
  const areas = channel.scopeAreas ?? [];
  if (areas.length > 0) {
    return [...areas].sort((left, right) => {
      const levelDiff = areaLevelSortOrder(left.level) - areaLevelSortOrder(right.level);
      if (levelDiff !== 0) return levelDiff;
      const leftLabel = left.parentName ? `${left.parentName} / ${left.name}` : left.name;
      const rightLabel = right.parentName ? `${right.parentName} / ${right.name}` : right.name;
      return leftLabel.localeCompare(rightLabel, "id-ID");
    });
  }

  return channel.scopeAreaId
    ? [
        {
          id: channel.scopeAreaId,
          code: channel.scopeAreaCode ?? channel.scopeAreaId,
          officialCode: channel.scopeAreaCode ?? null,
          name: channel.scopeAreaName ?? channel.coordinatorRegion ?? "Wilayah belum terpetakan",
          level: channel.scopeAreaLevel ?? "PROVINCE",
          parentName: channel.scopeAreaParentName ?? null,
          hierarchy: channel.scopeHierarchy ?? [],
        },
      ]
    : [];
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

export function AdminWaCenterPage() {
  const [channels, setChannels] = useState<WhatsappControlChannel[]>([]);
  const channelsCountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pairingChannelId, setPairingChannelId] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<AreaOption[]>([]);

  const [areaQuery, setAreaQuery] = useState("");
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const deferredAreaQuery = useDeferredValue(areaQuery);
  const [comboOpen, setComboOpen] = useState(false);

  useEffect(() => {
    channelsCountRef.current = channels.length;
  }, [channels.length]);

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

  const handleCreate = async () => {
    const primaryArea = selectedAreas[0];
    if (!primaryArea) return;
    try {
      setBusyKey("create");

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
      setIsAddOpen(false);
      setSelectedAreas([]);
      setAreaQuery("");
      await loadChannels();

      // Auto request QR setelah ditambahkan
      const createdChannel = body as WhatsappControlChannel;
      if (createdChannel?.id) {
        void runAction(createdChannel.id, "request-qr");
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal membuat kanal WhatsApp.");
    } finally {
      setBusyKey(null);
    }
  };

  const loadChannels = useCallback(async (silent = false) => {
    try {
      const response = await fetch("/api/admin-system/integrasi-wa-center", {
        cache: "no-store",
      });
      const body = (await response.json()) as WhatsappControlChannel[] | { message?: string };

      if (!response.ok) {
        throw new Error("message" in body ? body.message : "Gagal memuat kontrol WhatsApp.");
      }

      setChannels(body as WhatsappControlChannel[]);
      setError(null);
    } catch (loadError) {
      if (!silent || channelsCountRef.current === 0) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat kontrol WhatsApp.");
      }
    }
  }, []);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    const hasPendingConnection = channels.some(
      (channel) =>
        channel.connectionStatus === "CONNECTING" ||
        channel.connectionStatus === "QR_READY" ||
        channel.connectionStatus === "PAIRING_CODE_READY",
    );
    const pollingIntervalMs = hasPendingConnection || pairingChannelId !== null ? 1500 : 5000;

    const intervalId = setInterval(() => {
      void loadChannels(true);
    }, pollingIntervalMs);

    return () => clearInterval(intervalId);
  }, [channels, pairingChannelId, loadChannels]);

  useEffect(() => {
    if (!pairingChannelId) return;

    const pairingChannel = channels.find((channel) => channel.id === pairingChannelId);
    if (pairingChannel?.connectionStatus === "CONNECTED") {
      setPairingChannelId(null);
    }
  }, [channels, pairingChannelId]);

  const runAction = async (
    channelId: string,
    action: "activate" | "deactivate" | "test" | "request-qr",
    options: { resetSession?: boolean } = {},
  ) => {
    try {
      setBusyKey(`${action}:${channelId}`);
      const response = await fetch(`/api/admin-system/integrasi-wa-center/${channelId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, resetSession: options.resetSession === true }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Gagal menjalankan aksi kanal.");
      }

      await loadChannels();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Gagal menjalankan aksi kanal.");
    } finally {
      setBusyKey(null);
    }
  };

  const deleteChannel = async (channelId: string) => {
    try {
      setBusyKey(`delete:${channelId}`);
      const response = await fetch(`/api/admin-system/integrasi-wa-center/${channelId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Gagal menghapus kanal WhatsApp.");
      }

      await loadChannels();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus kanal WhatsApp.");
    } finally {
      setBusyKey(null);
    }
  };

  const groupedChannels = useMemo<ChannelGroup[]>(() => {
    const groups = new Map<string, ChannelGroup>();

    for (const channel of channels) {
      const branch = channel.scopeBranch ?? "UNMAPPED";
      const branchText = branchLabel(channel.scopeBranch);
      const scopeAreas = channelScopeAreas(channel);
      const displayAreas = scopeAreas.length > 0 ? scopeAreas : [null];
      const hierarchyText = compactAreaHierarchy(channel);

      for (const scopeArea of displayAreas) {
        const groupKey = `${branch}:${scopeArea?.id ?? channel.scopeAreaId ?? hierarchyText}`;
        const title = scopeArea?.parentName
          ? `${scopeArea.parentName} / ${scopeArea.name}`
          : (scopeArea?.name ?? channel.scopeAreaName ?? channel.coordinatorRegion ?? "Belum terpetakan");
        const subtitleParts = [
          branchText,
          scopeAreas.length > 1
            ? `${scopeAreas.length} wilayah cakupan koneksi`
            : hierarchyText !== title
              ? hierarchyText
              : null,
        ].filter(Boolean);
        const sortKey = [
          branchSortOrder(channel.scopeBranch).toString().padStart(2, "0"),
          areaLevelSortOrder(scopeArea?.level ?? channel.scopeAreaLevel)
            .toString()
            .padStart(2, "0"),
          title,
        ].join(":");
        const current =
          groups.get(groupKey) ??
          ({
            key: groupKey,
            title,
            subtitle: subtitleParts.join(" / "),
            sortKey,
            channels: [],
          } satisfies ChannelGroup);

        current.channels.push(channel);
        groups.set(groupKey, current);
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        channels: group.channels.sort((left, right) =>
          (left.coordinatorName ?? left.name).localeCompare(right.coordinatorName ?? right.name),
        ),
      }))
      .sort((left, right) => left.sortKey.localeCompare(right.sortKey));
  }, [channels]);

  const connectedCount = channels.filter((channel) => channel.connectionStatus === "CONNECTED").length;
  const pendingCount = channels.filter((channel) =>
    ["CONNECTING", "QR_READY", "PAIRING_CODE_READY"].includes(channel.connectionStatus),
  ).length;
  const disconnectedCount = channels.filter((channel) =>
    ["DISCONNECTED", "ERROR"].includes(channel.connectionStatus),
  ).length;
  const AdminIcon = DOMAIN_VISUALS.admin.Icon;

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <p className="text-muted-foreground text-sm">Admin Sistem</p>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Integrasi WhatsApp</h1>
          <p className={DC_TYPOGRAPHY.body}>
            Kelola koneksi bot pusat, nomor pengirim, status sesi, dan cakupan wilayah operasional WhatsApp Center.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void loadChannels()} variant="outline">
            <RefreshCw className="mr-2 size-4" />
            Muat ulang
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 size-4" />
                Tambah Koneksi
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border bg-card text-card-foreground sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Tambah Koneksi WhatsApp</DialogTitle>
                <DialogDescription>
                  Pilih provinsi, kota/kabupaten, atau kecamatan tempat Jaring terverifikasi melapor. Seluruh laporan
                  Jaring di wilayah tersebut akan masuk ke koneksi ini.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
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
                                onSelect={() => {
                                  toggleSelectedArea(area);
                                }}
                                className="text-foreground/80 focus:bg-muted"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 size-4",
                                    selectedAreaKeys.has(area.id) ? "opacity-100" : "opacity-0",
                                  )}
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
                <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                  Batal
                </Button>
                <Button
                  disabled={selectedAreas.length === 0 || busyKey === "create"}
                  onClick={() => void handleCreate()}
                >
                  Simpan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <AdminIcon className={cn("size-9", DOMAIN_VISUALS.admin.iconClass)} />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TOTAL KONEKSI</p>
              <p className="font-semibold text-2xl">{channels.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <CheckCircle2 className="size-9 text-emerald-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TERHUBUNG</p>
              <p className="font-semibold text-2xl">{connectedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <QrCode className="size-9 text-cyan-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>PROSES PAIRING</p>
              <p className="font-semibold text-2xl">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <Activity className="size-9 text-amber-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TERPUTUS / ERROR</p>
              <p className="font-semibold text-2xl">{disconnectedCount}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <Alert className="border-amber-400/25 bg-amber-500/10 text-amber-800 dark:text-amber-50">
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {channels.length === 0 ? (
        <Alert>
          <AlertTitle>Belum ada koneksi WhatsApp</AlertTitle>
          <AlertDescription>Belum ada Integrasi WhatsApp yang dapat dikonfigurasi saat ini.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5">
        {groupedChannels.map((group) => (
          <section key={group.key} className="grid gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3 border-border/70 border-b pb-2">
              <div>
                <h2 className={DC_TYPOGRAPHY.sectionTitle}>{group.title}</h2>
                {group.subtitle ? <p className={DC_TYPOGRAPHY.metadata}>{group.subtitle}</p> : null}
              </div>
              <Badge variant="outline" className="border-border/70">
                {group.channels.length} koneksi
              </Badge>
            </div>
            <div className="grid gap-3">
              {group.channels.map((channel) => {
                const isConnected = channel.connectionStatus === "CONNECTED";
                const scopeAreas = channelScopeAreas(channel);
                const phoneNumber =
                  channel.sessionJid?.split("@")[0] ?? channel.botPhoneNumber ?? "Nomor belum terbaca";
                const lastSignalAt =
                  channel.lastConnectedAt ?? channel.lastDisconnectedAt ?? channel.lastHealthAt ?? channel.updatedAt;

                return (
                  <Card key={channel.id} className={cn(DC_CONTROLS.card, "overflow-hidden")}>
                    <CardContent className="grid gap-4 p-4 lg:grid-cols-[1.2fr_1fr_220px]">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={tone(channel.status)}>{channelStatusLabel(channel.status)}</Badge>
                          <Badge className={connectionTone(channel.connectionStatus)}>
                            {isConnected ? <CheckCircle2 className="mr-1 size-3" /> : null}
                            {connectionStatusLabel(channel.connectionStatus)}
                          </Badge>
                        </div>
                        <div className="min-w-0">
                          <h3 className={cn(DC_TYPOGRAPHY.cardTitle, "text-base")}>
                            {channel.name || channel.coordinatorName}
                          </h3>
                          <p className={cn(DC_TYPOGRAPHY.body, "break-words")}>
                            {scopeAreas.length > 1
                              ? `${scopeAreas.length} wilayah pelaporan`
                              : channel.coordinatorRegion || channel.code}
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                            <p className={DC_TYPOGRAPHY.metadata}>NOMOR WHATSAPP</p>
                            <p className="break-all font-mono font-semibold text-foreground text-sm">{phoneNumber}</p>
                          </div>
                          <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                            <p className={DC_TYPOGRAPHY.metadata}>SINYAL TERAKHIR</p>
                            <p className="font-semibold text-foreground text-sm">{formatDateTime(lastSignalAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0 space-y-3">
                        <div className="rounded-md border border-border/70 bg-muted/20 p-3">
                          <p className={DC_TYPOGRAPHY.metadata}>CAKUPAN PELAPORAN</p>
                          {scopeAreas.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {scopeAreas.map((area) => (
                                <Badge key={area.id} variant="outline" className="max-w-full truncate">
                                  {area.parentName ? `${area.parentName} / ${area.name}` : area.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-muted-foreground text-sm">Belum terpetakan</p>
                          )}
                        </div>
                        {channel.lastError ? (
                          <div className="rounded-md border border-destructive/25 bg-destructive/10 p-3 text-destructive text-sm">
                            {channel.lastError}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-col gap-2">
                        {channel.status === "ACTIVE" ? (
                          <>
                            <Button
                              size="sm"
                              className="w-full"
                              disabled={busyKey === `test:${channel.id}`}
                              onClick={() => void runAction(channel.id, "test")}
                            >
                              <Activity className="mr-2 size-4" />
                              Periksa Koneksi
                            </Button>
                            <Button
                              size="sm"
                              variant="warning"
                              className="w-full"
                              disabled={busyKey === `deactivate:${channel.id}`}
                              onClick={() => void runAction(channel.id, "deactivate")}
                            >
                              <Bot className="mr-2 size-4" />
                              Nonaktifkan
                            </Button>
                          </>
                        ) : null}
                        {!isConnected ? (
                          <Dialog
                            open={pairingChannelId === channel.id}
                            onOpenChange={(open) => setPairingChannelId(open ? channel.id : null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant={channel.status === "ACTIVE" ? "outline" : "success"}
                                className="w-full"
                                disabled={busyKey === `request-qr:${channel.id}`}
                                onClick={() => {
                                  setPairingChannelId(channel.id);
                                  void runAction(channel.id, "request-qr");
                                }}
                              >
                                <QrCode className="mr-2 size-4" />
                                Hubungkan WhatsApp
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Koneksikan ke WhatsApp</DialogTitle>
                                <DialogDescription>
                                  Pindai QR Code di bawah menggunakan aplikasi WhatsApp di perangkat seluler.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex min-h-64 flex-col items-center justify-center p-6">
                                {channel.qrCodeDataUrl ? (
                                  <div className="rounded-md border border-border bg-white p-4">
                                    <img
                                      alt={`QR ${channel.name}`}
                                      className="size-64 rounded-md object-contain"
                                      src={channel.qrCodeDataUrl}
                                    />
                                  </div>
                                ) : channel.pairingCode ? (
                                  <div className="text-center">
                                    <p className="mb-2 text-muted-foreground text-sm">Kode pairing:</p>
                                    <span className="font-bold text-4xl text-cyan-600 tracking-[0.3em]">
                                      {channel.pairingCode}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                    <Activity className="size-8 animate-spin" />
                                    <p>
                                      {channel.connectionStatus === "CONNECTING"
                                        ? "Menghubungkan..."
                                        : "Meminta QR Code..."}
                                    </p>
                                  </div>
                                )}
                              </div>
                              <DialogFooter>
                                <Button
                                  className="w-full"
                                  disabled={busyKey === `request-qr:${channel.id}`}
                                  onClick={() => void runAction(channel.id, "request-qr", { resetSession: true })}
                                >
                                  <QrCode className="mr-2 size-4" />
                                  Buat QR Baru
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <div className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 font-medium text-emerald-200 text-sm">
                            <CheckCircle2 className="size-4" />
                            WhatsApp terhubung
                          </div>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="mr-2 size-4" />
                              Hapus
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Koneksi WhatsApp?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini akan menonaktifkan koneksi WhatsApp dan melepas sesi perangkat dari sistem.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => void deleteChannel(channel.id)}>
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
