"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";

import { MailCheck, RefreshCw, Save, Send, ServerCog } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type SmtpSettings = {
  enabled: boolean;
  from: string;
  host: string;
  passwordSet: boolean;
  port: number;
  secure: boolean;
  source: "custom" | "env";
  user: string;
  updatedAt: string | null;
};

type SmtpSettingsPayload = {
  enabled: boolean;
  from: string;
  host: string;
  password?: string;
  port: number;
  secure: boolean;
  user: string;
};

const initialSettings: SmtpSettings = {
  enabled: false,
  from: "",
  host: "",
  passwordSet: false,
  port: 587,
  secure: false,
  source: "env",
  user: "",
  updatedAt: null,
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SmtpSettingsPage() {
  const [settings, setSettings] = useState<SmtpSettings>(initialSettings);
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setSettings(await apiBrowserFetch<SmtpSettings>("/system/email-settings"));
      setPassword("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat pengaturan SMTP.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  function updateSetting<K extends keyof SmtpSettings>(key: K, value: SmtpSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function saveSettings() {
    const payload: SmtpSettingsPayload = {
      enabled: settings.enabled,
      from: settings.from.trim(),
      host: settings.host.trim(),
      port: settings.port,
      secure: settings.secure,
      user: settings.user.trim(),
      ...(password.trim() ? { password } : {}),
    };

    try {
      setBusyKey("save");
      setError(null);
      const updated = await apiBrowserMutation<SmtpSettings>("PUT", "/system/email-settings", payload, {
        idempotent: true,
      });
      setSettings(updated);
      setPassword("");
      setMessage("Pengaturan SMTP berhasil disimpan.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Gagal menyimpan pengaturan SMTP.");
    } finally {
      setBusyKey(null);
    }
  }

  async function sendTest() {
    if (!testEmail.trim()) {
      setError("Email tujuan tes wajib diisi.");
      return;
    }

    try {
      setBusyKey("test");
      setError(null);
      await apiBrowserMutation("POST", "/system/email-settings/test", { to: testEmail.trim() });
      setMessage(`Email tes dikirim ke ${testEmail.trim()}.`);
    } catch (testError) {
      setError(testError instanceof Error ? testError.message : "Gagal mengirim email tes SMTP.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Admin Sistem</p>
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Pengaturan SMTP</h1>
          <p className={DC_TYPOGRAPHY.body}>
            Atur server email (SMTP apa pun) untuk notifikasi sistem, termasuk notifikasi status WhatsApp.
          </p>
        </div>
        <Button onClick={() => void loadSettings()} disabled={loading} variant="outline">
          <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
          Muat ulang
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="SUMBER EMAIL" value={settings.source === "custom" ? "Kustom" : ".env"} />
        <SummaryCard label="PENGIRIMAN EMAIL" value={settings.enabled ? "Aktif" : "Nonaktif"} />
        <SummaryCard label="PASSWORD" value={settings.passwordSet ? "Tersimpan" : "Belum ada"} />
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Gagal</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message ? (
        <Alert>
          <AlertTitle>Berhasil</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <section className={cn(DC_CONTROLS.card, "space-y-5 p-4")}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-4">
          <div>
            <h2 className={DC_TYPOGRAPHY.sectionTitle}>Server Email</h2>
            <p className={DC_TYPOGRAPHY.body}>Aktifkan pengiriman email notifikasi sistem. Saat nonaktif, seluruh email tidak dikirim.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="border-cyan-400/30 bg-cyan-500/10 text-cyan-100">
              {settings.enabled ? "Email aktif" : "Email nonaktif"}
            </Badge>
            <Switch checked={settings.enabled} onCheckedChange={(value) => updateSetting("enabled", value)} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Field label="SMTP host">
            <Input
              value={settings.host}
              onChange={(event) => updateSetting("host", event.target.value)}
              placeholder="smtp.gmail.com"
            />
          </Field>
          <Field label="Port">
            <Input
              type="number"
              min={1}
              max={65535}
              value={settings.port}
              onChange={(event) => updateSetting("port", Number.parseInt(event.target.value, 10) || 587)}
            />
          </Field>
          <Field label="Email pengirim">
            <Input
              value={settings.from}
              onChange={(event) => updateSetting("from", event.target.value)}
              placeholder="DENS CAKRA <noreply@example.go.id>"
            />
          </Field>
          <Field label="Username SMTP">
            <Input
              value={settings.user}
              onChange={(event) => updateSetting("user", event.target.value)}
              placeholder="noreply@example.go.id"
            />
          </Field>
          <Field label="Password SMTP">
            <Input
              autoComplete="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={settings.passwordSet ? "Kosongkan untuk mempertahankan password lama" : "Password SMTP"}
            />
          </Field>
          <div className="flex items-end">
            <div className="flex h-9 items-center gap-3 rounded-md border border-border/70 bg-muted/20 px-3 text-sm">
              <Switch
                id="smtpSecure"
                checked={settings.secure}
                onCheckedChange={(value) => updateSetting("secure", value)}
              />
              <Label htmlFor="smtpSecure">Gunakan SSL/TLS langsung</Label>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
          <p className={DC_TYPOGRAPHY.metadata}>TERAKHIR DIUBAH: {formatDateTime(settings.updatedAt)}</p>
          <Button disabled={busyKey === "save"} onClick={() => void saveSettings()}>
            <Save className={cn("mr-2 size-4", busyKey === "save" && "animate-pulse")} />
            Simpan Pengaturan
          </Button>
        </div>
      </section>

      <section className={cn(DC_CONTROLS.card, "grid gap-4 p-4 lg:grid-cols-[1fr_auto]")}>
        <div className="space-y-2">
          <Label htmlFor="testEmail">Email tujuan tes</Label>
          <Input
            id="testEmail"
            type="email"
            value={testEmail}
            onChange={(event) => setTestEmail(event.target.value)}
            placeholder="admin@example.go.id"
          />
        </div>
        <div className="flex items-end">
          <Button disabled={busyKey === "test"} onClick={() => void sendTest()} variant="outline">
            <Send className={cn("mr-2 size-4", busyKey === "test" && "animate-pulse")} />
            Kirim Tes
          </Button>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className={DC_CONTROLS.card}>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <p className={DC_TYPOGRAPHY.metadata}>{label}</p>
          <p className="truncate text-xl font-semibold">{value}</p>
        </div>
        {label === "SUMBER EMAIL" ? (
          <ServerCog className="size-8 text-amber-300" />
        ) : (
          <MailCheck className="size-8 text-cyan-300" />
        )}
      </CardContent>
    </Card>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
