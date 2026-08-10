"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { Activity, Bot, Check, CheckCircle2, ChevronsUpDown, Plus, QrCode, Save, Trash2 } from "lucide-react";

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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";
import type { WhatsappControlChannel } from "@/server/field-ops/types";

import {
  type AreaSearchResult,
  type CommandRouteType,
  getUserAssignments,
  type UserListItem,
} from "../../pengguna/_components/pengguna-types";

type CoordinatorAreaOption = AreaSearchResult & {
  branch: CommandRouteType | null;
  label: string;
};

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

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdminWaCenterPage() {
  const [channels, setChannels] = useState<WhatsappControlChannel[]>([]);
  const channelsCountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [pairingChannelId, setPairingChannelId] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<CoordinatorAreaOption | null>(null);

  const [areaQuery, setAreaQuery] = useState("");
  const [allCoordinatorAreas, setAllCoordinatorAreas] = useState<CoordinatorAreaOption[]>([]);
  const deferredAreaQuery = useDeferredValue(areaQuery);
  const [comboOpen, setComboOpen] = useState(false);

  useEffect(() => {
    channelsCountRef.current = channels.length;
  }, [channels.length]);

  useEffect(() => {
    let cancelled = false;
    async function loadAvailableAreas() {
      try {
        let allUsers: UserListItem[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && !cancelled) {
          const users = await apiBrowserFetch<UserListItem[]>("/user-profiles", {
            query: {
              roleCode: "FIELD_COORDINATOR",
              limit: 100,
              page: page,
            },
          });

          if (users.length > 0) {
            allUsers = [...allUsers, ...users];
          }

          if (users.length < 100) {
            hasMore = false;
          } else {
            page++;
          }
        }

        if (!cancelled) {
          const optionMap = new Map<string, CoordinatorAreaOption>();
          allUsers.forEach((user) => {
            const assignments = getUserAssignments(user);
            assignments.forEach((assignment) => {
              const branch = assignment.branch || assignment.seat?.branch || assignment.position?.branch || null;
              assignment.areaScopes?.forEach((scope) => {
                if (scope.area) {
                  const key = `${scope.area.id}-${branch || "default"}`;
                  if (!optionMap.has(key)) {
                    let branchLabel = "";
                    if (branch === "BINDA") branchLabel = "Binda";
                    if (branch === "DIRECTORATE") branchLabel = "Direktorat";

                    const label = branchLabel ? `${scope.area.name} (${branchLabel})` : scope.area.name;

                    optionMap.set(key, {
                      ...scope.area,
                      branch,
                      label,
                    });
                  }
                }
              });
            });
          });

          const sortedOptions = Array.from(optionMap.values()).sort((a, b) => a.label.localeCompare(b.label));
          setAllCoordinatorAreas(sortedOptions);
        }
      } catch (err) {
        console.error("Failed to load areas", err);
      }
    }
    void loadAvailableAreas();
    return () => {
      cancelled = true;
    };
  }, []);

  const areaQueryStr = deferredAreaQuery.trim().toLowerCase();
  const areaResults = useMemo(() => {
    if (!areaQueryStr) return allCoordinatorAreas;
    return allCoordinatorAreas.filter(
      (a) =>
        a.label.toLowerCase().includes(areaQueryStr) ||
        (a.parent?.name && a.parent.name.toLowerCase().includes(areaQueryStr)),
    );
  }, [allCoordinatorAreas, areaQueryStr]);

  const handleCreate = async () => {
    if (!selectedArea) return;
    try {
      setBusyKey("create");

      const users = await apiBrowserFetch<UserListItem[]>("/user-profiles", {
        query: {
          areaId: selectedArea.id,
          roleCode: "FIELD_COORDINATOR",
          limit: 10,
        },
      });

      let selectedUser = null;
      if (selectedArea.branch) {
        selectedUser = users.find((u) =>
          getUserAssignments(u).some(
            (pa) =>
              (pa.branch === selectedArea.branch ||
                pa.seat?.branch === selectedArea.branch ||
                pa.position?.branch === selectedArea.branch) &&
              pa.areaScopes.some((s) => s.area?.id === selectedArea.id),
          ),
        );
      }
      if (!selectedUser) {
        selectedUser = users[0];
      }

      if (!selectedUser) {
        throw new Error(`Tidak ada Koordinator Wilayah (Korwil) di wilayah ${selectedArea.name}.`);
      }

      const codeBase = (selectedUser.username || selectedUser.id.split("-")[0]).toUpperCase();
      const nameBase = selectedUser.fullName || selectedUser.username || selectedUser.authUser.name || "User";

      const response = await fetch("/api/admin-system/integrasi-wa-center", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: `WA_${codeBase}`,
          name: `Bot WA ${nameBase}`,
          userId: selectedUser.id,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error((body as { message?: string }).message ?? "Gagal membuat kanal WhatsApp.");
      }
      setIsAddOpen(false);
      setSelectedArea(null);
      await loadChannels();

      // Auto request QR setelah ditambahkan
      const createdChannel = body as WhatsappControlChannel;
      if (createdChannel && createdChannel.id) {
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

  const updateDraft = (channelId: string, patch: Partial<WhatsappControlChannel>) => {
    setChannels((current) => current.map((item) => (item.id === channelId ? { ...item, ...patch } : item)));
  };

  const updateChannel = async (channel: WhatsappControlChannel) => {
    try {
      setBusyKey(`save:${channel.id}`);
      const response = await fetch(`/api/admin-system/integrasi-wa-center/${channel.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: channel.name,
          botLabel: channel.botLabel,
          provider: channel.provider,
          botPhoneNumber: channel.botPhoneNumber,
          pairingMethod: channel.pairingMethod,
          senderNumbers: channel.senderNumbers,
        }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Gagal menyimpan kanal WhatsApp.");
      }

      await loadChannels();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan kanal WhatsApp.");
    } finally {
      setBusyKey(null);
    }
  };

  const runAction = async (channelId: string, action: "activate" | "deactivate" | "test" | "request-qr") => {
    try {
      setBusyKey(`${action}:${channelId}`);
      const response = await fetch(`/api/admin-system/integrasi-wa-center/${channelId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
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

  return (
    <div className="flex w-full flex-col gap-6">
      <Card className="border-slate-200 dark:border-white/10 bg-card text-card-foreground">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-cyan-500/15 text-cyan-700 dark:text-cyan-100">Kontrol WhatsApp Admin</Badge>
            <Badge
              variant="outline"
              className="border-slate-200 dark:border-white/15 text-slate-700 dark:text-white/70"
            >
              Integrasi WhatsApp
            </Badge>
          </div>
          <CardTitle>Bot Pusat & Nomor Pengirim</CardTitle>
          <CardDescription>
            Admin mengelola koneksi bot pusat, status koneksi, dan nomor pengirim untuk kebutuhan operasional wilayah.
          </CardDescription>
          <div className="pt-4">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300">
                  <Plus className="mr-2 size-4" />
                  Tambah Koneksi
                </Button>
              </DialogTrigger>
              <DialogContent className="border-slate-200 dark:border-white/10 bg-card text-card-foreground sm:max-w-[425px] !top-[35%]">
                <DialogHeader>
                  <DialogTitle>Tambah Koneksi WhatsApp</DialogTitle>
                  <DialogDescription>
                    Tambahkan koneksi bot WhatsApp baru untuk Koordinator Wilayah (Korwil) atau unit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Wilayah Koordinator Wilayah (Korwil)</Label>
                    <Popover open={comboOpen} onOpenChange={setComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboOpen}
                          className="w-full justify-between bg-transparent border-slate-200 dark:border-white/10 text-foreground hover:bg-slate-100 dark:hover:bg-white/10 font-normal"
                        >
                          {selectedArea ? selectedArea.label : "Pilih wilayah..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="bottom"
                        align="start"
                        avoidCollisions={false}
                        className="w-[380px] p-0 border-slate-200 dark:border-white/20 bg-card text-card-foreground"
                      >
                        <Command className="bg-transparent text-foreground" shouldFilter={false}>
                          <CommandInput placeholder="Cari wilayah..." value={areaQuery} onValueChange={setAreaQuery} />
                          <CommandList>
                            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                              Tidak ada wilayah yang ditemukan.
                            </CommandEmpty>
                            <CommandGroup>
                              {areaResults.map((area) => (
                                <CommandItem
                                  key={`${area.id}-${area.branch || "default"}`}
                                  value={area.label}
                                  onSelect={() => {
                                    setSelectedArea(area);
                                    setComboOpen(false);
                                  }}
                                  className="text-foreground/80 focus:bg-slate-100 dark:focus:bg-white/10"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedArea?.id === area.id && selectedArea?.branch === area.branch
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <span>
                                    {area.label} {area.parent ? `(${area.parent.name})` : ""}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    Batal
                  </Button>
                  <Button
                    className="bg-cyan-500 text-white hover:bg-cyan-600 dark:bg-cyan-400 dark:text-slate-950 dark:hover:bg-cyan-300"
                    disabled={!selectedArea || busyKey === "create"}
                    onClick={() => void handleCreate()}
                  >
                    Simpan
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Alert className="border-amber-400/25 bg-amber-500/10 text-amber-800 dark:text-amber-50">
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {channels.length === 0 ? (
        <Alert>
          <AlertTitle>Belum ada channel WhatsApp</AlertTitle>
          <AlertDescription>Belum ada Integrasi WhatsApp yang dapat dikonfigurasi saat ini.</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {channels.map((channel) => {
          const isConnected = channel.connectionStatus === "CONNECTED";

          return (
            <Card key={channel.id} className="flex flex-col justify-between shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={tone(channel.status)}>{channel.status}</Badge>
                      <Badge className={connectionTone(channel.connectionStatus)}>
                        {channel.connectionStatus === "CONNECTED" && <CheckCircle2 className="mr-1 size-3" />}
                        {channel.connectionStatus}
                      </Badge>
                    </div>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Koneksi WhatsApp?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus koneksi WhatsApp secara permanen
                            dari sistem.
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
                  <div>
                    <CardTitle className="text-lg">{channel.coordinatorName || channel.name}</CardTitle>
                    <CardDescription>{channel.coordinatorRegion || channel.code}</CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="grid gap-4 pb-4">
                {isConnected && channel.sessionJid ? (
                  <div className="flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 p-2 text-sm text-emerald-700 dark:text-emerald-200">
                    <CheckCircle2 className="size-4 shrink-0" />
                    <span>WhatsApp terhubung: </span>
                    <span className="font-medium">{channel.sessionJid.split("@")[0]}</span>
                  </div>
                ) : null}

                {channel.lastError ? (
                  <div className="rounded border border-destructive/25 bg-destructive/10 p-2 text-xs text-destructive">
                    {channel.lastError}
                  </div>
                ) : null}
              </CardContent>

              <CardFooter className="flex flex-col gap-2 pt-4">
                {channel.status === "ACTIVE" ? (
                  <>
                    <div className="flex w-full flex-col gap-2">
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={busyKey === `test:${channel.id}`}
                        onClick={() => void runAction(channel.id, "test")}
                      >
                        <Activity className="mr-2 size-4" />
                        Health Check
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
                    </div>
                    {!isConnected &&
                      (channel.connectionStatus === "DISCONNECTED" || channel.connectionStatus === "ERROR") && (
                        <Dialog
                          open={pairingChannelId === channel.id}
                          onOpenChange={(open) => setPairingChannelId(open ? channel.id : null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
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
                                Scan QR Code di bawah menggunakan aplikasi WhatsApp di perangkat seluler Anda.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex min-h-64 flex-col items-center justify-center p-6">
                              {channel.qrCodeDataUrl ? (
                                <div className="rounded-xl border bg-white p-4">
                                  <img
                                    alt={`QR ${channel.name}`}
                                    className="size-64 rounded-lg object-contain"
                                    src={channel.qrCodeDataUrl}
                                  />
                                </div>
                              ) : channel.pairingCode ? (
                                <div className="text-center">
                                  <p className="mb-2 text-sm text-muted-foreground">Pairing Code Anda:</p>
                                  <span className="text-4xl font-bold tracking-[0.3em] text-cyan-600">
                                    {channel.pairingCode}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                  <Activity className="size-8 animate-spin" />
                                  <p>Meminta QR Code...</p>
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button
                                className="w-full"
                                disabled={busyKey === `request-qr:${channel.id}`}
                                onClick={() => void runAction(channel.id, "request-qr")}
                              >
                                <QrCode className="mr-2 size-4" />
                                Request QR Baru
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                  </>
                ) : (
                  <>
                    {!isConnected ? (
                      <Dialog
                        open={pairingChannelId === channel.id}
                        onOpenChange={(open) => setPairingChannelId(open ? channel.id : null)}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="success"
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
                              Scan QR Code di bawah menggunakan aplikasi WhatsApp di perangkat seluler Anda.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="flex min-h-64 flex-col items-center justify-center p-6">
                            {channel.qrCodeDataUrl ? (
                              <div className="rounded-xl border bg-white p-4">
                                <img
                                  alt={`QR ${channel.name}`}
                                  className="size-64 rounded-lg object-contain"
                                  src={channel.qrCodeDataUrl}
                                />
                              </div>
                            ) : channel.pairingCode ? (
                              <div className="text-center">
                                <p className="mb-2 text-sm text-muted-foreground">Pairing Code Anda:</p>
                                <span className="text-4xl font-bold tracking-[0.3em] text-cyan-600">
                                  {channel.pairingCode}
                                </span>
                              </div>
                            ) : channel.connectionStatus === "CONNECTING" ? (
                              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                <Activity className="size-8 animate-spin" />
                                <p>Menghubungkan...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                                <Activity className="size-8 animate-spin" />
                                <p>Meminta QR Code...</p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              className="w-full"
                              disabled={busyKey === `request-qr:${channel.id}`}
                              onClick={() => void runAction(channel.id, "request-qr")}
                            >
                              <QrCode className="mr-2 size-4" />
                              Request QR Baru
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <div className="flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-200">
                        <CheckCircle2 className="size-4" />
                        WhatsApp sudah terhubung
                      </div>
                    )}
                  </>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
