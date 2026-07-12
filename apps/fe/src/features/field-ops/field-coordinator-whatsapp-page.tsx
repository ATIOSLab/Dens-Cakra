"use client";

import { useEffect, useState } from "react";
import { Activity, Bot, QrCode, Save } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WhatsappControlChannel } from "@/server/field-ops/types";

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

export function FieldCoordinatorWhatsappPage() {
  const [channels, setChannels] = useState<WhatsappControlChannel[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadChannels = async () => {
    try {
      const response = await fetch("/api/field-coordinator/personel-jaring/whatsapp-control", {
        cache: "no-store",
      });
      const body = (await response.json()) as WhatsappControlChannel[] | { message?: string };

      if (!response.ok) {
        throw new Error("message" in body ? body.message : "Gagal memuat kontrol WhatsApp.");
      }

      setChannels(body as WhatsappControlChannel[]);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat kontrol WhatsApp.");
    }
  };

  useEffect(() => {
    void loadChannels();
  }, []);

  const updateDraft = (channelId: string, patch: Partial<WhatsappControlChannel>) => {
    setChannels((current) =>
      current.map((item) => (item.id === channelId ? { ...item, ...patch } : item)),
    );
  };

  const updateChannel = async (channel: WhatsappControlChannel) => {
    try {
      setBusyKey(`save:${channel.id}`);
      const response = await fetch(`/api/field-coordinator/personel-jaring/whatsapp-control/${channel.id}`, {
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
      const response = await fetch(`/api/field-coordinator/personel-jaring/whatsapp-control/${channelId}/actions`, {
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

  return (
    <div className="space-y-4">
      <Card className="border-white/10 bg-[var(--dc-surface)] text-[var(--dc-text-primary)]">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-cyan-400/15 text-cyan-100">Coordinator WA Control</Badge>
            <Badge variant="outline" className="border-white/15 text-white/70">
              Personel & Jaring
            </Badge>
          </div>
          <CardTitle>Bot Pusat & Nomor Pengirim</CardTitle>
          <CardDescription className="text-white/65">
            Coordinator mengelola koneksi bot, health check, dan sender numbers pusat. Ownership data Jaring tetap di field officer.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <Alert className="border-amber-400/25 bg-amber-500/10 text-amber-50">
          <AlertTitle>Perlu perhatian</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {channels.length === 0 ? (
        <Alert className="border-white/10 bg-white/5 text-white">
          <AlertTitle>Belum ada channel WhatsApp</AlertTitle>
          <AlertDescription>
            Seed atau buat `IntegrationChannel` bertipe WhatsApp terlebih dahulu agar coordinator bisa mengelola bot dan nomor pengirim di sini.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4">
        {channels.map((channel) => (
          <Card key={channel.id} className="border-white/10 bg-white/5">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg text-white">{channel.name}</CardTitle>
                  <CardDescription className="text-white/60">
                    {channel.code} • {channel.provider || "Provider belum diisi"}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={tone(channel.status)}>{channel.status}</Badge>
                  <Badge variant="outline" className="border-white/15 text-white/70">
                    {channel.webhookConfigured ? "Webhook OK" : "Webhook belum diisi"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[1fr_0.6fr]">
              <div className="space-y-3">
                <Input
                  value={channel.name}
                  onChange={(event) => updateDraft(channel.id, { name: event.target.value })}
                  placeholder="Nama channel"
                />
                <Input
                  value={channel.botLabel || ""}
                  onChange={(event) => updateDraft(channel.id, { botLabel: event.target.value })}
                  placeholder="Label bot"
                />
                <Input
                  value={channel.provider || ""}
                  onChange={(event) => updateDraft(channel.id, { provider: event.target.value })}
                  placeholder="Provider"
                />
                <Textarea
                  value={channel.senderNumbers.join("\n")}
                  onChange={(event) =>
                    updateDraft(channel.id, {
                      senderNumbers: event.target.value
                        .split(/\r?\n/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="Satu nomor pengirim per baris"
                  rows={5}
                />
              </div>

              <div className="space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-white/75">
                    <p className="font-semibold text-white">Ringkasan kanal</p>
                    <div className="mt-3 space-y-1">
                    <p>Bot state: {channel.connectionStatus}</p>
                    <p>Health terakhir: {formatDateTime(channel.lastHealthAt)}</p>
                    <p>Update config: {formatDateTime(channel.updatedAt)}</p>
                    <p>Connected: {formatDateTime(channel.lastConnectedAt)}</p>
                    <p>Disconnected: {formatDateTime(channel.lastDisconnectedAt)}</p>
                    <p>Sender aktif: {channel.senderNumbers.length}</p>
                  </div>
                </div>
                <Input
                  value={channel.botPhoneNumber || ""}
                  onChange={(event) => updateDraft(channel.id, { botPhoneNumber: event.target.value })}
                  placeholder="Nomor bot (pairing code)"
                />
                <Input
                  value={channel.pairingMethod}
                  onChange={(event) =>
                    updateDraft(channel.id, {
                      pairingMethod: event.target.value === "code" ? "code" : "qr",
                    })
                  }
                  placeholder="pairing method: qr atau code"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={connectionTone(channel.connectionStatus)}>
                    {channel.connectionStatus}
                  </Badge>
                  {channel.sessionJid ? (
                    <Badge variant="outline" className="border-white/15 text-white/70">
                      {channel.sessionJid}
                    </Badge>
                  ) : null}
                </div>
                {channel.qrCodeDataUrl ? (
                  <div className="rounded-xl border border-white/10 bg-white p-3">
                    <img
                      alt={`QR ${channel.name}`}
                      className="mx-auto size-44 rounded-lg object-contain"
                      src={channel.qrCodeDataUrl}
                    />
                  </div>
                ) : null}
                {channel.pairingCode ? (
                  <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                    Pairing code: <span className="font-semibold tracking-[0.3em]">{channel.pairingCode}</span>
                  </div>
                ) : null}
                {channel.lastError ? (
                  <div className="rounded-xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-50">
                    {channel.lastError}
                  </div>
                ) : null}
                <div className="grid gap-2">
                  <Button
                    className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    disabled={busyKey === `save:${channel.id}`}
                    onClick={() => void updateChannel(channel)}
                  >
                    <Save className="mr-2 size-4" />
                    Simpan Sender
                  </Button>
                  <Button
                    variant="outline"
                      className="border-white/15 bg-transparent text-white hover:bg-white/10"
                      disabled={busyKey === `test:${channel.id}`}
                      onClick={() => void runAction(channel.id, "test")}
                    >
                      <Activity className="mr-2 size-4" />
                    Health Check
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/15 bg-transparent text-white hover:bg-white/10"
                    disabled={busyKey === `request-qr:${channel.id}`}
                    onClick={() => void runAction(channel.id, "request-qr")}
                  >
                    <QrCode className="mr-2 size-4" />
                    Request QR / Pairing
                  </Button>
                  {channel.status === "ACTIVE" ? (
                    <Button
                      variant="outline"
                      className="border-white/15 bg-transparent text-white hover:bg-white/10"
                      disabled={busyKey === `deactivate:${channel.id}`}
                      onClick={() => void runAction(channel.id, "deactivate")}
                    >
                      <Bot className="mr-2 size-4" />
                      Nonaktifkan Bot
                    </Button>
                  ) : (
                    <Button
                      className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                      disabled={busyKey === `activate:${channel.id}`}
                      onClick={() => void runAction(channel.id, "activate")}
                    >
                      <QrCode className="mr-2 size-4" />
                      Aktifkan Bot
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
