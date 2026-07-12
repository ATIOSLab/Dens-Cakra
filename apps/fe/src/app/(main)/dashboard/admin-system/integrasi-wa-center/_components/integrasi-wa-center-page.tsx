"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { Activity, Bot, QrCode, Save, Plus, Check, CheckCircle2, ChevronsUpDown, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandInput,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import type { WhatsappControlChannel } from "@/server/field-ops/types";
import type { UserListItem } from "../../pengguna/_components/pengguna-types";

function tone(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "ACTIVE") {
    return "bg-emerald-500/15 border-emerald-400/35 text-emerald-100";
  }

  if (normalized === "DEGRADED") {
    return "bg-amber-500/15 border-amber-300/35 text-amber-100";
  }

  return "bg-white/10 border-white/15 text-white/75";
}

function connectionTone(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "CONNECTED") {
    return "bg-emerald-500/15 border-emerald-400/35 text-emerald-100";
  }

  if (normalized === "QR_READY" || normalized === "PAIRING_CODE_READY" || normalized === "CONNECTING") {
    return "bg-cyan-500/15 border-cyan-300/35 text-cyan-100";
  }

  if (normalized === "ERROR") {
    return "bg-rose-500/15 border-rose-300/35 text-rose-100";
  }

  return "bg-white/10 border-white/15 text-white/75";
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
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserListItem[]>([]);
  const deferredUserQuery = useDeferredValue(userQuery);
  const [comboOpen, setComboOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadUsers() {
      const queryStr = deferredUserQuery.trim();
      if (queryStr.length === 1) {
        setUserResults([]);
        return;
      }
      try {
        const results = await apiBrowserFetch<UserListItem[]>("/user-profiles", {
          query: {
            search: queryStr || undefined,
            roleCode: "FIELD_COORDINATOR",
            page: 1,
            limit: 50,
          },
        });
        if (!cancelled) {
          setUserResults(results);
        }
      } catch {
        if (!cancelled) {
          setUserResults([]);
        }
      }
    }
    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [deferredUserQuery]);

  const handleCreate = async () => {
    if (!selectedUser) return;
    try {
      setBusyKey("create");
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
        throw new Error((body as { message?: string }).message || "Gagal membuat kanal WhatsApp.");
      }
      setIsAddOpen(false);
      setSelectedUser(null);
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

  const loadChannels = async (silent = false) => {
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
      if (!silent || channels.length === 0) {
        setError(loadError instanceof Error ? loadError.message : "Gagal memuat kontrol WhatsApp.");
      }
    }
  };

  useEffect(() => {
    void loadChannels();
  }, []);

  useEffect(() => {
    const needsPolling = channels.some(
      (c) =>
        c.connectionStatus === "CONNECTING" ||
        c.connectionStatus === "QR_READY" ||
        c.connectionStatus === "PAIRING_CODE_READY"
    );

    if (!needsPolling) return;

    const intervalId = setInterval(() => {
      void loadChannels(true);
    }, 3000);

    return () => clearInterval(intervalId);
  }, [channels]);

  const updateDraft = (channelId: string, patch: Partial<WhatsappControlChannel>) => {
    setChannels((current) =>
      current.map((item) => (item.id === channelId ? { ...item, ...patch } : item)),
    );
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
        throw new Error(body.message || "Gagal menyimpan kanal WhatsApp.");
      }

      await loadChannels();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan kanal WhatsApp.");
    } finally {
      setBusyKey(null);
    }
  };

  const runAction = async (
    channelId: string,
    action: "activate" | "deactivate" | "test" | "request-qr",
  ) => {
    try {
      setBusyKey(`${action}:${channelId}`);
      const response = await fetch(`/api/admin-system/integrasi-wa-center/${channelId}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message || "Gagal menjalankan aksi kanal.");
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
        throw new Error(body.message || "Gagal menghapus kanal WhatsApp.");
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
      <Card className="border-white/10 bg-[var(--dc-surface)] text-[var(--dc-text-primary)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-cyan-400/15 text-cyan-100">Admin WA Control</Badge>
            <Badge variant="outline" className="border-white/15 text-white/70">
              Integrasi WA Center
            </Badge>
          </div>
          <CardTitle>Bot Pusat & Nomor Pengirim</CardTitle>
          <CardDescription className="text-white/65">
            Admin mengelola koneksi bot pusat, health check, dan sender numbers untuk berbagai keperluan wilayah.
          </CardDescription>
          <div className="pt-4">
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  <Plus className="mr-2 size-4" />
                  Tambah Koneksi
                </Button>
              </DialogTrigger>
              <DialogContent className="border-white/10 bg-[var(--dc-surface)] text-[var(--dc-text-primary)] sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Tambah Koneksi WhatsApp</DialogTitle>
                  <DialogDescription className="text-white/60">
                    Tambahkan koneksi bot WhatsApp baru untuk koordinator lapangan atau unit.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label className="text-white">Field Coordinator (User)</Label>
                    <Popover open={comboOpen} onOpenChange={setComboOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={comboOpen}
                          className="w-full justify-between border-white/20 bg-black/20 text-white hover:bg-black/40 hover:text-white"
                        >
                          {selectedUser
                            ? `${selectedUser.fullName || selectedUser.username}`
                            : "Pilih user..."}
                          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[380px] p-0 border-white/20 bg-[var(--dc-surface)]">
                        <Command className="bg-transparent text-white" shouldFilter={false}>
                          <CommandInput
                            placeholder="Cari user..."
                            value={userQuery}
                            onValueChange={setUserQuery}
                          />
                          <CommandList>
                            <CommandEmpty className="py-4 text-center text-sm text-white/60">
                              {deferredUserQuery.length === 1
                                ? "Ketik minimal 2 karakter untuk mencari"
                                : "Tidak ada user yang ditemukan."}
                            </CommandEmpty>
                            <CommandGroup>
                              {userResults.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  value={user.id}
                                  onSelect={() => {
                                    setSelectedUser(user);
                                    setComboOpen(false);
                                  }}
                                  className="text-white aria-selected:bg-white/10 aria-selected:text-white"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 size-4",
                                      selectedUser?.id === user.id ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  {user.fullName || user.username} ({user.username})
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
                  <Button
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/10"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    disabled={!selectedUser || busyKey === "create"}
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
        <Alert className="border-amber-400/25 bg-amber-500/10 text-amber-50">
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {channels.length === 0 ? (
        <Alert>
          <AlertTitle>Belum ada channel WhatsApp</AlertTitle>
          <AlertDescription>
            Belum ada Integrasi WhatsApp yang dapat dikonfigurasi saat ini.
          </AlertDescription>
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
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Koneksi WhatsApp?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini tidak dapat dibatalkan. Ini akan menghapus koneksi WhatsApp secara permanen dari sistem.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => void deleteChannel(channel.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div>
                  <CardTitle className="text-lg">{channel.coordinatorName || channel.name}</CardTitle>
                  <CardDescription>
                    {channel.coordinatorRegion || channel.code}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="grid gap-4 pb-4">
              {channel.sessionJid ? (
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
                  <div className="flex w-full gap-2">
                    <Button
                      size="sm"
                      className="w-full bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                      disabled={busyKey === `test:${channel.id}`}
                      onClick={() => void runAction(channel.id, "test")}
                    >
                      <Activity className="mr-2 size-4" />
                      Health Check
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={busyKey === `deactivate:${channel.id}`}
                      onClick={() => void runAction(channel.id, "deactivate")}
                    >
                      <Bot className="mr-2 size-4" />
                      Nonaktifkan
                    </Button>
                  </div>
                  {!isConnected && (channel.connectionStatus === "DISCONNECTED" || channel.connectionStatus === "ERROR") && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          disabled={busyKey === `request-qr:${channel.id}`}
                          onClick={() => void runAction(channel.id, "request-qr")}
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
                              <span className="text-4xl font-bold tracking-[0.3em] text-cyan-600">{channel.pairingCode}</span>
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        className="w-full bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-400 dark:text-slate-950 dark:hover:bg-emerald-300"
                        disabled={busyKey === `request-qr:${channel.id}`}
                        onClick={() => void runAction(channel.id, "request-qr")}
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
                            <span className="text-4xl font-bold tracking-[0.3em] text-cyan-600">{channel.pairingCode}</span>
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
