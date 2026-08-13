"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { MailPlus, RefreshCw, Save, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type Recipient = {
  id: string;
  email: string;
  label: string | null;
  isActive: boolean;
  notifyOnConnected: boolean;
  notifyOnDisconnected: boolean;
  notifyOnError: boolean;
  createdAt: string;
  updatedAt: string;
};

function splitEmails(value: string) {
  return value
    .split(/[\s,;]+/g)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function WhatsappNotificationSettingsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [emails, setEmails] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRecipients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRecipients(await apiBrowserFetch<Recipient[]>("/integration-channels/whatsapp-notification-recipients"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat penerima notifikasi WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const summary = useMemo(
    () => ({
      total: recipients.length,
      active: recipients.filter((item) => item.isActive).length,
      disconnected: recipients.filter((item) => item.isActive && item.notifyOnDisconnected).length,
    }),
    [recipients],
  );

  async function addRecipients() {
    const parsedEmails = splitEmails(emails);
    if (parsedEmails.length === 0) {
      setError("Minimal satu email wajib diisi.");
      return;
    }

    try {
      setBusyId("create");
      setError(null);
      const updated = await apiBrowserMutation<Recipient[]>(
        "POST",
        "/integration-channels/whatsapp-notification-recipients",
        {
          emails: parsedEmails,
          label: label.trim() || undefined,
          isActive: true,
          notifyOnConnected: true,
          notifyOnDisconnected: true,
          notifyOnError: true,
        },
        { idempotent: true },
      );
      setRecipients(updated);
      setEmails("");
      setLabel("");
      setMessage(`${parsedEmails.length} email penerima notifikasi disimpan.`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Gagal menyimpan penerima notifikasi.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateRecipient(id: string, patch: Partial<Recipient>) {
    try {
      setBusyId(id);
      setError(null);
      const updated = await apiBrowserMutation<Recipient>(
        "PATCH",
        `/integration-channels/whatsapp-notification-recipients/${id}`,
        patch,
      );
      setRecipients((current) => current.map((item) => (item.id === id ? updated : item)));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Gagal memperbarui penerima notifikasi.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeRecipient(id: string) {
    try {
      setBusyId(id);
      setError(null);
      await apiBrowserMutation("DELETE", `/integration-channels/whatsapp-notification-recipients/${id}`);
      setRecipients((current) => current.filter((item) => item.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Gagal menghapus penerima notifikasi.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Admin Sistem</p>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Notifikasi WhatsApp</h1>
          <p className={DC_TYPOGRAPHY.body}>Atur email yang menerima pemberitahuan saat sesi WhatsApp aktif, logout, terputus, atau error.</p>
        </div>
        <Button onClick={() => void loadRecipients()} disabled={loading} variant="outline">
          <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
          Muat ulang
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="TOTAL EMAIL" value={summary.total} />
        <SummaryCard label="AKTIF" value={summary.active} />
        <SummaryCard label="TERPUTUS / ERROR" value={summary.disconnected} />
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Tersimpan</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <section className={cn(DC_CONTROLS.card, "grid gap-4 p-4 lg:grid-cols-[1fr_260px_auto]")}>
        <div className="space-y-2">
          <Label htmlFor="emails">Email penerima</Label>
          <Textarea
            id="emails"
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder="ops@example.go.id, admin@example.go.id"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Label</Label>
          <Input id="label" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Piket WA" />
        </div>
        <div className="flex items-end">
          <Button onClick={() => void addRecipients()} disabled={busyId === "create"}>
            {busyId === "create" ? <Save className="mr-2 size-4 animate-pulse" /> : <MailPlus className="mr-2 size-4" />}
            Simpan
          </Button>
        </div>
      </section>

      <section className={cn(DC_CONTROLS.card, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead className="border-b border-border/70 bg-muted/25">
              <tr>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Email</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Label</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Aktif</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>WA aktif</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Terputus</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Error</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-right")}>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {recipients.map((recipient) => (
                <tr key={recipient.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-sm">{recipient.email}</td>
                  <td className="px-4 py-3 text-sm">{recipient.label || "-"}</td>
                  <td className="px-4 py-3"><Toggle checked={recipient.isActive} disabled={busyId === recipient.id} onChange={(checked) => updateRecipient(recipient.id, { isActive: checked })} /></td>
                  <td className="px-4 py-3"><Toggle checked={recipient.notifyOnConnected} disabled={busyId === recipient.id} onChange={(checked) => updateRecipient(recipient.id, { notifyOnConnected: checked })} /></td>
                  <td className="px-4 py-3"><Toggle checked={recipient.notifyOnDisconnected} disabled={busyId === recipient.id} onChange={(checked) => updateRecipient(recipient.id, { notifyOnDisconnected: checked })} /></td>
                  <td className="px-4 py-3"><Toggle checked={recipient.notifyOnError} disabled={busyId === recipient.id} onChange={(checked) => updateRecipient(recipient.id, { notifyOnError: checked })} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" disabled={busyId === recipient.id} onClick={() => void removeRecipient(recipient.id)}>
                      <Trash2 className="mr-2 size-4" />
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && recipients.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">Belum ada email penerima notifikasi WhatsApp.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border/70 p-4 text-sm text-muted-foreground">
          {loading ? "Memuat penerima..." : `Menampilkan ${recipients.length} email penerima.`}
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className={DC_CONTROLS.card}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className={DC_TYPOGRAPHY.metadata}>{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">Email</Badge>
      </CardContent>
    </Card>
  );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  return <Switch checked={checked} disabled={disabled} onCheckedChange={(value) => void onChange(value)} />;
}
