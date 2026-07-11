"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  WifiOff,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type WhatsappView = "bot" | "users";
type BotStatusValue = "DISCONNECTED" | "CONNECTING" | "QR_READY" | "CONNECTED";
type WhatsappRole = "FIELD_OFFICER" | "JARING";

interface BotStatus {
  status: BotStatusValue;
  qr?: string | null;
  qrDataUrl?: string | null;
}

interface WhatsappUser {
  id: number;
  whatsappId: string;
  name?: string | null;
  cluster?: string | null;
  role: WhatsappRole;
  authPin: string;
  fieldOfficerUsername?: string | null;
  fieldOfficerPasswordPlain?: string | null;
  fieldOfficerId?: number | null;
  isVerified: boolean;
  createdAt?: string;
}

interface WhatsappReport {
  id: number;
  whatsappId: string;
  pushName?: string | null;
  title?: string | null;
  content: string;
  photoUrl?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationLivePeriod?: number | null;
  status?: "PENDING" | "VALIDATED" | "BAKET" | "CLOSED" | "INVALID" | string | null;
  informationStatus?: "PENDING" | "VALIDATED" | "BAKET" | "CLOSED" | "INVALID" | string | null;
  baketId?: string | number | null;
  closedAt?: string | null;
  createdAt: string;
}

interface ReportStats {
  totalReports: number;
  totalUsers: number;
  todayReports: number;
}

interface ApiErrorState {
  message: string;
  detail?: string;
}

const whatsappViews: { id: WhatsappView; label: string; icon: React.ElementType }[] = [
  { id: "bot", label: "Bot", icon: Bot },
  { id: "users", label: "Users", icon: Users },
];

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
const backendAssetBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");

async function apiRequest<T>(fieldOfficerId: string, path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("x-field-officer-id", fieldOfficerId);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request gagal (${response.status})`;
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      if (typeof body.message === "string") message = body.message;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function getStoredToken() {
  if (typeof window === "undefined") return "";
  const localToken = window.localStorage.getItem("token") || window.localStorage.getItem("authToken");
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1];

  return localToken || (cookieToken ? decodeURIComponent(cookieToken) : "");
}

function getAssetUrl(url?: string | null) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${backendAssetBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FieldOfficerWhatsappPanel({ fieldOfficerId }: { fieldOfficerId: string }) {
  const [activeView, setActiveView] = useState<WhatsappView>("bot");

  return (
    <div className="space-y-4">
      <PanelHeader icon={MessageSquare} title="WhatsApp Operations" />
      <div className="flex flex-wrap gap-2">
        {whatsappViews.map((view) => {
          const Icon = view.icon;
          const active = activeView === view.id;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-bold uppercase tracking-wide transition ${
                active
                  ? "border-cyan-300 bg-cyan-300 text-slate-950"
                  : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200"
              }`}
            >
              <Icon className="size-4" />
              {view.label}
            </button>
          );
        })}
      </div>

      {activeView === "bot" && <WhatsappBotView fieldOfficerId={fieldOfficerId} />}
      {activeView === "users" && <WhatsappUsersView fieldOfficerId={fieldOfficerId} />}
    </div>
  );
}

function WhatsappBotView({ fieldOfficerId }: { fieldOfficerId: string }) {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingQr, setRequestingQr] = useState(false);
  const [error, setError] = useState<ApiErrorState | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await apiRequest<BotStatus>(fieldOfficerId, `/whatsapp/bot/status?t=${Date.now()}`);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError({ message: "Tidak bisa membaca status bot", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [fieldOfficerId]);

  const requestNewQr = useCallback(async () => {
    if (!window.confirm("Reset sesi WhatsApp dan minta QR baru? Bot akan disconnect sementara.")) return;
    setRequestingQr(true);
    setError(null);
    try {
      await apiRequest(fieldOfficerId, "/whatsapp/bot/request-qr", { method: "POST" });
      // Beri waktu backend untuk regenerate QR
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await fetchStatus();
    } catch (err) {
      setError({ message: "Gagal request QR baru", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setRequestingQr(false);
    }
  }, [fieldOfficerId, fetchStatus]);

  useEffect(() => {
    fetchStatus();
    const interval = window.setInterval(fetchStatus, 3000);
    return () => window.clearInterval(interval);
  }, [fetchStatus]);

  const connected = status?.status === "CONNECTED";
  const qrReady = status?.status === "QR_READY";
  const connecting = status?.status === "CONNECTING";

  return (
    <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr]">
      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center gap-3">
          <span className={`rounded-md p-3 ${
            connected
              ? "bg-emerald-400 text-slate-950"
              : qrReady
              ? "bg-yellow-300 text-slate-950"
              : "bg-cyan-300 text-slate-950"
          }`}>
            {connected ? <CheckCircle2 className="size-5" /> : <Bot className="size-5" />}
          </span>
          <div>
            <h3 className="font-bold text-slate-50">Koneksi Bot WhatsApp</h3>
            <p className="text-sm text-slate-400">Kontrol sementara — untuk keperluan testing.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          <StatusLine
            label="Status"
            value={loading ? "Mengecek..." : status?.status || "UNKNOWN"}
            tone={connected ? "emerald" : qrReady ? "yellow" : connecting ? "cyan" : "slate"}
          />
          <StatusLine label="Mode" value="Testing (Field Officer)" tone="yellow" />
        </div>
        {error && <ErrorBox error={error} />}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            className="gap-2 bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200"
            onClick={fetchStatus}
            disabled={loading}
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {!connected && !connecting && (
            <Button
              className="gap-2 border border-yellow-300/50 bg-yellow-300/10 font-bold text-yellow-200 hover:bg-yellow-300/20"
              onClick={requestNewQr}
              disabled={requestingQr}
            >
              <RotateCcw className={`size-4 ${requestingQr ? "animate-spin" : ""}`} />
              {requestingQr ? "Memuat QR..." : "Request QR Baru"}
            </Button>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
        {loading ? (
          <EmptyState icon={RefreshCw} title="Memuat status bot..." />
        ) : connected ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <span className="rounded-full bg-emerald-400 p-5 text-slate-950 shadow-lg shadow-emerald-400/25">
              <CheckCircle2 className="size-10" />
            </span>
            <h3 className="mt-5 text-xl font-bold text-slate-50">Bot Terhubung ✓</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">
              Bot aktif dan siap menerima laporan dari Jaring. Kirim <code className="rounded bg-slate-800 px-1 py-0.5 text-cyan-300">/start</code> ke bot WhatsApp untuk mulai.
            </p>
          </div>
        ) : qrReady ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-50">Scan QR Code</h3>
              <p className="mt-1 text-sm text-slate-400">Buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Scan QR ini.</p>
            </div>
            {status?.qrDataUrl ? (
              <div className="rounded-xl border-2 border-yellow-300/60 bg-white p-3 shadow-lg shadow-yellow-300/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={status.qrDataUrl}
                  alt="WhatsApp QR Code"
                  width={220}
                  height={220}
                  className="block"
                />
              </div>
            ) : (
              <div className="flex h-[220px] w-[220px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900">
                <p className="text-center text-sm text-slate-500">QR sedang digenerate...<br />Refresh sebentar lagi.</p>
              </div>
            )}
            <p className="text-center text-xs text-slate-500">
              QR kadaluarsa tiap ~20 detik — halaman akan auto-refresh.
            </p>
          </div>
        ) : connecting ? (
          <div className="flex min-h-80 flex-col items-center justify-center text-center">
            <span className="rounded-full bg-cyan-300 p-5 text-slate-950 shadow-lg shadow-cyan-300/20">
              <RefreshCw className="size-10 animate-spin" />
            </span>
            <h3 className="mt-5 text-lg font-bold text-slate-50">Sedang Menghubungkan...</h3>
            <p className="mt-2 max-w-md text-sm text-slate-400">Bot sedang mencoba terhubung ke WhatsApp.</p>
          </div>
        ) : (
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
            <span className="rounded-full bg-slate-800 p-5 text-slate-400">
              <WifiOff className="size-10" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-50">Bot Belum Tersambung</h3>
              <p className="mt-1 max-w-sm text-sm text-slate-400">
                Klik <strong className="text-yellow-300">Request QR Baru</strong> di panel kiri untuk memulai pairing WhatsApp.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function WhatsappUsersView({ fieldOfficerId }: { fieldOfficerId: string }) {
  const [users, setUsers] = useState<WhatsappUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<ApiErrorState | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WhatsappUser | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await apiRequest<WhatsappUser[]>(fieldOfficerId, "/whatsapp/users");
      setUsers(data);
      setError(null);
    } catch (err) {
      setUsers([]);
      setError({ message: "Gagal memuat user WhatsApp", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [fieldOfficerId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.whatsappId.includes(q) ||
        user.name?.toLowerCase().includes(q) ||
        user.fieldOfficerUsername?.toLowerCase().includes(q),
    );
  }, [search, users]);

  const fieldOfficerOwner = users.find((user) => user.role === "FIELD_OFFICER");
  const jarings = filtered.filter((user) => user.role === "JARING");
  const assignedJaring = fieldOfficerOwner ? jarings.filter((user) => user.fieldOfficerId === fieldOfficerOwner.id) : jarings;
  const unassigned = jarings.filter((user) => !user.fieldOfficerId);

  const regeneratePin = async (user: WhatsappUser) => {
    if (!window.confirm(`Regenerate PIN untuk ${user.name || user.whatsappId}?`)) return;
    setBusyId(user.id);
    try {
      const updated = await apiRequest<WhatsappUser>(fieldOfficerId, `/whatsapp/users/${user.id}/regenerate-pin`, { method: "POST" });
      setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
    } catch (err) {
      setError({ message: "Gagal regenerate PIN", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  const removeUser = async (user: WhatsappUser) => {
    if (!window.confirm(`Hapus ${user.name || user.whatsappId}?`)) return;
    setBusyId(user.id);
    try {
      await apiRequest(fieldOfficerId, `/whatsapp/users/${user.id}`, { method: "DELETE" });
      setUsers((current) => current.filter((item) => item.id !== user.id));
    } catch (err) {
      setError({ message: "Gagal menghapus user", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <MiniStat icon={Shield} label="Field Officer Aktif" value="1" tone="cyan" />
        <MiniStat icon={User} label="Jaring Binaan" value={users.filter((user) => user.role === "JARING" && (!fieldOfficerOwner || user.fieldOfficerId === fieldOfficerOwner.id)).length.toString()} tone="emerald" />
        <MiniStat icon={CheckCircle2} label="Verified" value={users.filter((user) => user.isVerified).length.toString()} tone="yellow" />
      </div>

      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Cari nama, nomor WhatsApp, username Field Officer..."
        actionLabel="Tambah Jaring"
        actionIcon={Plus}
        onAction={() => setShowAdd(true)}
        onRefresh={fetchUsers}
      />

      {error && <ErrorBox error={error} />}

      {loading ? (
        <EmptyState icon={RefreshCw} title="Memuat user WhatsApp..." />
      ) : assignedJaring.length === 0 && unassigned.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada Jaring WhatsApp" meta="Tambah Jaring baru agar otomatis masuk ke Field Officer aktif." />
      ) : (
        <div className="space-y-3">
          <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
            <div className="flex flex-col gap-2 border-slate-800 border-b bg-slate-900/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold text-slate-50">Jaring Binaan</h3>
                <p className="text-slate-400 text-sm">Daftar Jaring yang berada di bawah Field Officer aktif.</p>
              </div>
              <StatusPill tone="cyan">{assignedJaring.length} Jaring</StatusPill>
            </div>
            {assignedJaring.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">Belum ada Jaring di bawah Field Officer ini.</p>
            ) : (
              <div className="divide-y divide-slate-800">
                {assignedJaring.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    busy={busyId === user.id}
                    onEdit={setEditing}
                    onRegeneratePin={regeneratePin}
                    onDelete={removeUser}
                  />
                ))}
              </div>
            )}
          </section>

          {unassigned.length > 0 && (
            <section className="rounded-lg border border-yellow-300/50 bg-yellow-300/10">
              <div className="flex items-center justify-between border-yellow-300/20 border-b p-4">
                <div>
                  <h3 className="font-bold text-yellow-100">Jaring Tanpa Field Officer</h3>
                  <p className="text-sm text-yellow-100/70">{unassigned.length} nomor belum diassign.</p>
                </div>
                <span className="rounded-md bg-yellow-300 px-2 py-1 font-bold text-slate-950 text-xs">{unassigned.length}</span>
              </div>
              <div className="divide-y divide-yellow-300/10">
                {unassigned.map((jaring) => (
                  <UserRow
                    key={jaring.id}
                    user={jaring}
                    busy={busyId === jaring.id}
                    onEdit={setEditing}
                    onRegeneratePin={regeneratePin}
                    onDelete={removeUser}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showAdd && (
        <WhatsappUserModal
          title="Tambah Jaring WhatsApp"
          fieldOfficerId={fieldOfficerId}
          onClose={() => setShowAdd(false)}
          onSaved={(user) => {
            setUsers((current) => [user, ...current]);
            setShowAdd(false);
          }}
          onError={setError}
        />
      )}

      {editing && (
        <WhatsappUserModal
          title={editing.role === "FIELD_OFFICER" ? "Edit Credential Field Officer" : "Edit Jaring"}
          fieldOfficerId={fieldOfficerId}
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(user) => {
            setUsers((current) => current.map((item) => (item.id === user.id ? user : item)));
            setEditing(null);
          }}
          onError={setError}
        />
      )}
    </div>
  );
}

export function WhatsappReportsView({
  fieldOfficerId,
  focusReportId,
  validationMode = false,
  onValidateReport,
  onCloseReport,
}: {
  fieldOfficerId: string;
  focusReportId?: number | null;
  validationMode?: boolean;
  onValidateReport?: (report: WhatsappReport) => void;
  onCloseReport?: (report: WhatsappReport) => void;
}) {
  const [reports, setReports] = useState<WhatsappReport[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<ApiErrorState | null>(null);
  const [lastRefresh, setLastRefresh] = useState("--:--:--");
  const focusedRef = useRef<HTMLElement | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const [reportData, statData] = await Promise.all([
        apiRequest<WhatsappReport[]>(fieldOfficerId, "/whatsapp/reports"),
        apiRequest<ReportStats>(fieldOfficerId, "/whatsapp/reports/stats"),
      ]);
      setReports(reportData);
      setStats(statData);
      setLastRefresh(new Date().toLocaleTimeString("id-ID"));
      setError(null);
    } catch (err) {
      setReports([]);
      setStats({ totalReports: 0, totalUsers: 0, todayReports: 0 });
      setLastRefresh("error");
      setError({ message: "Gagal memuat laporan WhatsApp", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [fieldOfficerId]);

  useEffect(() => {
    fetchReports();
    const interval = window.setInterval(fetchReports, 15000);
    return () => window.clearInterval(interval);
  }, [fetchReports]);

  useEffect(() => {
    if (!focusReportId || loading) return;
    window.setTimeout(() => {
      focusedRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, [focusReportId, loading]);

  const filtered = reports.filter((report) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      report.whatsappId.includes(q) ||
      report.pushName?.toLowerCase().includes(q) ||
      report.content.toLowerCase().includes(q) ||
      `${report.locationLatitude ?? ""},${report.locationLongitude ?? ""}`.includes(q)
    );
  });

  const removeReport = async (report: WhatsappReport) => {
    if (!window.confirm("Hapus laporan ini?")) return;
    setBusyId(report.id);
    try {
      await apiRequest(fieldOfficerId, `/whatsapp/reports/${report.id}`, { method: "DELETE" });
      setReports((current) => current.filter((item) => item.id !== report.id));
      setStats((current) => (current ? { ...current, totalReports: Math.max(0, current.totalReports - 1) } : current));
    } catch (err) {
      setError({ message: "Gagal menghapus laporan", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  const validateReport = async (report: WhatsappReport) => {
    setBusyId(report.id);
    try {
      const result = await apiRequest<{ baket?: { id: string } }>(fieldOfficerId, `/field-officer/incoming/${report.id}/validate`, {
        method: "POST",
        body: JSON.stringify({ decision: "Valid" }),
      });
      const updatedReport: WhatsappReport = {
        ...report,
        status: "baket",
        informationStatus: "baket",
        baketId: result.baket?.id || report.baketId || `BAK-${report.id}`,
      };

      setReports((current) => current.map((item) => (item.id === report.id ? updatedReport : item)));
      onValidateReport?.(updatedReport);
      setError(null);
    } catch (err) {
      setError({ message: "Gagal validasi laporan", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  const closeReport = async (report: WhatsappReport) => {
    setBusyId(report.id);
    try {
      await apiRequest(fieldOfficerId, `/field-officer/incoming/${report.id}/validate`, {
        method: "POST",
        body: JSON.stringify({ decision: "Invalid" }),
      });
      const closedReport: WhatsappReport = {
        ...report,
        status: "closed",
        informationStatus: "closed",
        closedAt: report.closedAt || new Date().toISOString(),
      };

      setReports((current) => current.map((item) => (item.id === report.id ? closedReport : item)));
      onCloseReport?.(closedReport);
      setError(null);
    } catch (err) {
      setError({ message: "Gagal menutup laporan", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat icon={FileText} label={validationMode ? "Incoming" : "Total Laporan"} value={(stats?.totalReports ?? "-").toString()} tone="cyan" />
        <MiniStat icon={Users} label="User Terdaftar" value={(stats?.totalUsers ?? "-").toString()} tone="emerald" />
        <MiniStat icon={CalendarDays} label="Hari Ini" value={(stats?.todayReports ?? "-").toString()} tone="yellow" />
      </div>

      {validationMode && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3 text-emerald-100 text-sm">
          Laporan dari Jaring masuk ke sini untuk ditutup atau divalidasi. Laporan valid otomatis menjadi BAKET.
        </div>
      )}

      <Toolbar
        search={search}
        onSearch={setSearch}
        placeholder="Cari nomor, nama, isi laporan, koordinat..."
        actionLabel={lastRefresh}
        actionIcon={RefreshCw}
        onAction={fetchReports}
        onRefresh={fetchReports}
      />

      {error && <ErrorBox error={error} />}

      <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
        {loading ? (
          <EmptyState icon={RefreshCw} title="Memuat laporan..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon={FileText} title="Belum ada laporan WhatsApp" />
        ) : (
          <div className="divide-y divide-slate-800">
            {filtered.map((report) => {
              const focused = focusReportId === report.id;

              return (
                <article
                  key={report.id}
                  ref={(node) => {
                    if (focused) focusedRef.current = node;
                  }}
                  className={`grid items-stretch gap-4 p-4 md:grid-cols-[minmax(0,1fr)_170px] xl:grid-cols-[minmax(0,1fr)_170px_150px_180px] ${
                    focused ? "bg-cyan-300/10 ring-1 ring-cyan-300/50" : ""
                  }`}
                >
                  <div className="flex min-h-28 min-w-0 flex-col justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold font-mono text-cyan-300 text-xs">{report.whatsappId}</span>
                        <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-400 uppercase tracking-widest">
                          {report.pushName || "Tanpa nama"}
                        </span>
                      </div>
                      {report.title && <p className="mt-2 font-semibold text-slate-50">{report.title}</p>}
                      <p className="mt-2 line-clamp-3 text-sm text-slate-200 leading-5">{report.content}</p>
                    </div>
                    <p className="mt-2 text-slate-500 text-xs">{formatDate(report.createdAt)}</p>
                  </div>

                  <div className="h-28">
                    {report.photoUrl ? (
                      <a href={getAssetUrl(report.photoUrl)} target="_blank" rel="noreferrer" className="group block h-full overflow-hidden rounded-md border border-slate-700 bg-slate-900">
                        <img src={getAssetUrl(report.photoUrl)} alt={`Bukti laporan ${report.id}`} className="h-full w-full object-cover transition group-hover:scale-105" />
                      </a>
                    ) : (
                      <MediaPlaceholder icon={ImageIcon} label="Tanpa foto" />
                    )}
                  </div>

                  <div className="h-28">
                    {report.locationLatitude != null && report.locationLongitude != null ? (
                      <a
                        href={`https://www.google.com/maps?q=${report.locationLatitude},${report.locationLongitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-full flex-col justify-between rounded-md border border-emerald-400/40 bg-emerald-400/10 p-3 text-emerald-100 hover:bg-emerald-400/15"
                      >
                        <MapPin className="size-4 shrink-0" />
                        <span className="break-words font-mono text-xs leading-4">
                          {report.locationLatitude.toFixed(5)}, {report.locationLongitude.toFixed(5)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs">
                          Maps <ExternalLink className="size-3" />
                        </span>
                      </a>
                    ) : (
                      <MediaPlaceholder icon={MapPin} label="Tanpa lokasi" />
                    )}
                  </div>

                  <div className="flex min-h-28 flex-col items-stretch justify-start gap-2 md:col-span-2 xl:col-span-1">
                    {validationMode ? (
                      <>
                        <div className="flex h-8 items-center">
                          <StatusPill tone={getReportStatusTone(getReportInfoStatus(report))}>
                            {getReportStatusLabel(getReportInfoStatus(report))}
                          </StatusPill>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-center gap-2 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => validateReport(report)}
                          disabled={getReportInfoStatus(report) !== "pending"}
                        >
                          <Shield className="size-4" />
                          Valid
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-center gap-2 border-red-500/40 text-red-300 hover:bg-red-500/10"
                          onClick={() => closeReport(report)}
                          disabled={getReportInfoStatus(report) !== "pending"}
                        >
                          <Trash2 className="size-4" />
                          Tutup
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full justify-center gap-2 border-red-400/50 text-red-200 hover:bg-red-500/10"
                        onClick={() => removeReport(report)}
                        disabled={busyId === report.id}
                      >
                        <Trash2 className="size-4" />
                        Hapus
                      </Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function WhatsappLocationsView({
  fieldOfficerId,
  onOpenReport,
}: {
  fieldOfficerId: string;
  onOpenReport?: (reportId: number) => void;
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRefs = useRef<Map<number, Marker>>(new Map());
  const fittedRef = useRef(false);
  const [reports, setReports] = useState<WhatsappReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [error, setError] = useState<ApiErrorState | null>(null);
  const [lastRefresh, setLastRefresh] = useState("--:--:--");

  const fetchReportLocations = useCallback(async () => {
    try {
      const data = await apiRequest<WhatsappReport[]>(fieldOfficerId, "/whatsapp/reports");
      setReports(data.filter(hasValidReportCoordinates));
      setLastRefresh(new Date().toLocaleTimeString("id-ID"));
      setError(null);
    } catch (err) {
      setReports([]);
      setLastRefresh("error");
      setError({ message: "Gagal memuat pin point laporan", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, [fieldOfficerId]);

  useEffect(() => {
    fetchReportLocations();
    const interval = window.setInterval(fetchReportLocations, 15000);
    return () => window.clearInterval(interval);
  }, [fetchReportLocations]);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!mapEl.current || mapRef.current) return;

      const L = await import("leaflet");
      if (disposed || !mapEl.current) return;

      leafletRef.current = L;
      const map = L.map(mapEl.current, {
        center: [-2.5489, 118.0149],
        zoom: 5,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      layerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const refreshMapSize = () => {
        if (!disposed) map.invalidateSize({ animate: false });
      };

      requestAnimationFrame(refreshMapSize);
      window.setTimeout(refreshMapSize, 300);
      window.addEventListener("resize", refreshMapSize);

      mapEl.current.addEventListener(
        "field-officer-location-map-cleanup",
        () => window.removeEventListener("resize", refreshMapSize),
        { once: true },
      );
    }

    initMap();

    return () => {
      disposed = true;
      mapEl.current?.dispatchEvent(new Event("field-officer-location-map-cleanup"));
      try {
        layerRef.current?.clearLayers();
        mapRef.current?.off();
        mapRef.current?.remove();
      } catch {
        // Leaflet can throw while cleaning panes during fast route transitions.
      }
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
      markerRefs.current.clear();
      fittedRef.current = false;
    };
  }, []);

  const filtered = reports.filter((report) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      report.whatsappId.includes(q) ||
      report.pushName?.toLowerCase().includes(q) ||
      report.content.toLowerCase().includes(q) ||
      `${report.locationLatitude ?? ""},${report.locationLongitude ?? ""}`.includes(q)
    );
  });

  const selectedReport = filtered.find((report) => report.id === selectedReportId) || filtered[0] || null;
  const today = new Date().toDateString();
  const counts = {
    total: reports.length,
    today: reports.filter((report) => new Date(report.createdAt).toDateString() === today).length,
    filtered: filtered.length,
  };

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!L || !map || !layer) return;

    try {
      layer.clearLayers();
      markerRefs.current.clear();
    } catch {
      return;
    }

    const bounds: [number, number][] = [];

    for (const report of filtered) {
      if (!hasValidReportCoordinates(report)) continue;

      const latitude = Number(report.locationLatitude);
      const longitude = Number(report.locationLongitude);

      const status = getReportInfoStatus(report);
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "field-report-marker",
          html: getReportMarkerHtml(status, selectedReport?.id === report.id),
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        }),
      });

      marker.bindPopup(`
        <div style="min-width:190px">
          <strong>${escapeHtml(report.pushName || "Tanpa nama")}</strong><br/>
          <span>${escapeHtml(report.whatsappId)}</span><br/>
          <span>Status: ${escapeHtml(getReportStatusLabel(status))}</span><br/>
          <span>${escapeHtml(formatDate(report.createdAt))}</span>
        </div>
      `);
      marker.on("click", () => setSelectedReportId(report.id));
      marker.addTo(layer);
      markerRefs.current.set(report.id, marker);
      bounds.push([latitude, longitude]);
    }

    try {
      map.invalidateSize({ animate: false });
    } catch {
      return;
    }
    if (bounds.length > 0 && !fittedRef.current) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 13 });
      fittedRef.current = true;
    }
  }, [filtered, selectedReport]);

  useEffect(() => {
    if (!selectedReport || !mapRef.current) return;
    if (!hasValidReportCoordinates(selectedReport)) return;

    const latitude = Number(selectedReport.locationLatitude);
    const longitude = Number(selectedReport.locationLongitude);

    try {
      mapRef.current.flyTo([latitude, longitude], Math.max(mapRef.current.getZoom(), 13), {
        duration: 0.55,
      });
    } catch {
      return;
    }
    window.setTimeout(() => markerRefs.current.get(selectedReport.id)?.openPopup(), 350);
  }, [selectedReport]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat icon={MapPin} label="Pin Point" value={counts.total.toString()} tone="cyan" />
        <MiniStat icon={CalendarDays} label="Hari Ini" value={counts.today.toString()} tone="emerald" />
        <MiniStat icon={Search} label="Terfilter" value={counts.filtered.toString()} tone="yellow" />
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-slate-800 bg-slate-950/50 p-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama Jaring, nomor, isi laporan, koordinat..."
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 pr-3 pl-9 text-sm text-slate-100 outline-none focus:border-cyan-300"
          />
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <Button
            variant="outline"
            className="group relative overflow-hidden gap-2 border-cyan-300/40 !bg-slate-950 font-bold text-cyan-100 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)] hover:border-cyan-200 hover:!bg-cyan-300/10"
            onClick={fetchReportLocations}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
            <RefreshCw className="size-4" />
            Refresh Report Map
          </Button>
          <span className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">
            Last sync {lastRefresh}
          </span>
        </div>
      </div>

      {error && <ErrorBox error={error} />}

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="relative min-h-[680px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950 xl:min-h-[calc(100vh-230px)]">
          <div ref={mapEl} className="absolute inset-0 z-0 bg-slate-900" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">Memuat pin point...</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400">Belum ada share-location laporan.</div>
          )}
          <div className="absolute right-4 bottom-4 left-4 flex flex-wrap gap-2 rounded-md border border-slate-700 bg-slate-950/85 p-3">
            <LegendDot color="#facc15" label="Pending" />
            <LegendDot color="#67e8f9" label="BAKET" />
            <LegendDot color="#64748b" label="Tutup" />
            <span className="text-slate-400 text-xs">Klik pin untuk detail laporan.</span>
          </div>
        </section>

        <aside className="max-h-[620px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50 xl:max-h-[720px]">
          <div className="flex items-center justify-between border-slate-800 border-b p-4">
            <strong className="text-slate-50">Detail Pin Point</strong>
            <StatusPill tone="cyan">{filtered.length}</StatusPill>
          </div>
          {loading ? (
            <EmptyState icon={RefreshCw} title="Memuat pin point..." />
          ) : !selectedReport ? (
            <EmptyState icon={MapPin} title="Belum ada pin laporan" meta="Pin muncul dari share-location laporan Jaring." />
          ) : (
            <div className="max-h-[560px] overflow-y-auto p-4 xl:max-h-[660px]">
              <div className="rounded-lg border border-cyan-300/40 bg-cyan-300/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-slate-400 text-xs uppercase tracking-widest">Submitter</p>
                    <h3 className="mt-1 font-bold text-slate-50">{selectedReport.pushName || "Tanpa nama"}</h3>
                    <p className="mt-1 font-mono text-cyan-200 text-xs">{selectedReport.whatsappId}</p>
                  </div>
                  <MapPin className="size-5 text-cyan-200" />
                </div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">Waktu Submit</p>
                    <p className="mt-1 text-slate-200">{formatDate(selectedReport.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">Status Informasi</p>
                    <div className="mt-1">
                      <StatusPill tone={getReportStatusTone(getReportInfoStatus(selectedReport))}>
                        {getReportStatusLabel(getReportInfoStatus(selectedReport))}
                      </StatusPill>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">Koordinat</p>
                    <p className="mt-1 font-mono text-slate-200">
                      {selectedReport.locationLatitude?.toFixed(6)}, {selectedReport.locationLongitude?.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs uppercase tracking-widest">Ringkasan Laporan</p>
                    <p className="mt-1 line-clamp-4 text-slate-200">{selectedReport.content}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="gap-2 bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200"
                    onClick={() => onOpenReport?.(selectedReport.id)}
                  >
                    <FileText className="size-4" />
                    Lihat Laporan
                  </Button>
                  <a
                    href={`https://www.google.com/maps?q=${selectedReport.locationLatitude},${selectedReport.locationLongitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-700 px-2.5 font-medium text-[0.8rem] text-slate-300 hover:bg-slate-800"
                  >
                    <ExternalLink className="size-4" />
                    Google Maps
                  </a>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {filtered.map((report) => (
                <a
                  key={report.id}
                  href={`https://www.google.com/maps?q=${report.locationLatitude},${report.locationLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    event.preventDefault();
                    setSelectedReportId(report.id);
                  }}
                  className={`flex items-center gap-3 rounded-md border p-3 ${
                    selectedReport.id === report.id
                      ? "border-cyan-300/60 bg-cyan-300/10"
                      : "border-slate-800 bg-slate-900/70 hover:border-cyan-400/60"
                  }`}
                >
                  <span className="size-2 rounded-full" style={{ background: getReportStatusColor(getReportInfoStatus(report)) }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-sm text-slate-100">{report.pushName || "Tanpa nama"}</span>
                    <span className="block truncate text-slate-400 text-xs">
                      {formatDate(report.createdAt)}
                    </span>
                  </span>
                  <StatusPill tone={getReportStatusTone(getReportInfoStatus(report))}>
                    {getReportStatusLabel(getReportInfoStatus(report))}
                  </StatusPill>
                  <span className="font-mono text-slate-500 text-xs">#{report.id}</span>
                </a>
              ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function WhatsappUserModal({
  fieldOfficerId,
  title,
  user,
  onClose,
  onSaved,
  onError,
}: {
  fieldOfficerId: string;
  title: string;
  user?: WhatsappUser;
  onClose: () => void;
  onSaved: (user: WhatsappUser) => void;
  onError: (error: ApiErrorState | null) => void;
}) {
  const [whatsappId, setWhatsappId] = useState(user?.whatsappId || "");
  const [name, setName] = useState(user?.name || "");
  const [cluster, setCluster] = useState(user?.cluster || "");
  const role: WhatsappRole = user?.role || "JARING";
  const [fieldOfficerUsername, setFieldOfficerUsername] = useState(user?.fieldOfficerUsername || "");
  const [fieldOfficerPassword, setFieldOfficerPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    onError(null);

    try {
      if (!user) {
        const created = await apiRequest<WhatsappUser>(fieldOfficerId, "/whatsapp/users", {
          method: "POST",
          body: JSON.stringify({
            phoneNumber: whatsappId,
            name: name || undefined,
            cluster: cluster || undefined,
            role: "JARING",
          }),
        });
        onSaved(created);
        return;
      }

      const updated =
        user.role === "FIELD_OFFICER"
          ? await apiRequest<WhatsappUser>(fieldOfficerId, `/whatsapp/users/${user.id}/field-officer-credentials`, {
              method: "PATCH",
              body: JSON.stringify({
                username: fieldOfficerUsername || undefined,
                password: fieldOfficerPassword || undefined,
              }),
            })
          : await apiRequest<WhatsappUser>(fieldOfficerId, `/whatsapp/users/${user.id}/jaring`, {
              method: "PATCH",
              body: JSON.stringify({
                phoneNumber: whatsappId,
                name: name || undefined,
                cluster: cluster || undefined,
              }),
            });

      onSaved(updated);
    } catch (err) {
      onError({ message: "Gagal menyimpan user WhatsApp", detail: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form onSubmit={save} className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-50">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-700 p-2 text-slate-300 hover:bg-slate-800">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid gap-4">
          {!user && (
            <div className="rounded-md border border-emerald-300/40 bg-emerald-300/10 px-3 py-2 text-emerald-100 text-sm">
              Jaring baru otomatis masuk sebagai Jaring di bawah Field Officer yang membuatnya.
            </div>
          )}

          {(role === "JARING" || user?.role === "JARING") && (
            <>
              <Field label="Nomor WhatsApp">
                <input
                  required
                  pattern="\d+"
                  value={whatsappId}
                  onChange={(event) => setWhatsappId(event.target.value)}
                  placeholder="6281234567890"
                  className={inputClass}
                />
              </Field>
              <Field label="Nama">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama Jaring" className={inputClass} />
              </Field>
              <Field label="Klaster">
                <input
                  value={cluster}
                  onChange={(event) => setCluster(event.target.value)}
                  placeholder="Contoh: Mahasiswa, Tukang becak, Pedagang"
                  className={inputClass}
                />
              </Field>
              <div className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-cyan-100 text-sm">
                Relasi dan klaster Jaring mengikuti input Field Officer aktif.
              </div>
            </>
          )}

          {(role === "FIELD_OFFICER" || user?.role === "FIELD_OFFICER") && (
            <>
              <Field label="Nama">
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nama Field Officer" className={inputClass} disabled={!!user} />
              </Field>
              <Field label="Username Field Officer">
        <input value={fieldOfficerUsername} onChange={(event) => setFieldOfficerUsername(event.target.value)} placeholder="fo-bangkinang-001" className={inputClass} required={!user} />
              </Field>
              <Field label={user ? "Password Baru" : "Password Field Officer"}>
                <input
                  value={fieldOfficerPassword}
                  onChange={(event) => setFieldOfficerPassword(event.target.value)}
                  placeholder={user ? "Kosongkan jika tidak diganti" : "Minimal 6 karakter"}
                  minLength={6}
                  required={!user}
                  className={inputClass}
                />
              </Field>
            </>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" className="bg-emerald-400 font-bold text-slate-950 hover:bg-emerald-300" disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function UserRow({
  user,
  busy,
  onEdit,
  onRegeneratePin,
  onDelete,
}: {
  user: WhatsappUser;
  busy: boolean;
  onEdit: (user: WhatsappUser) => void;
  onRegeneratePin: (user: WhatsappUser) => void;
  onDelete: (user: WhatsappUser) => void;
}) {
  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="font-semibold text-slate-100">{user.name || "Tanpa nama"}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono text-cyan-300">{user.whatsappId}</span>
          {user.cluster && <span className="rounded-md border border-cyan-300/30 px-2 py-1 text-cyan-100">{user.cluster}</span>}
          <span className="rounded-md border border-slate-700 px-2 py-1 font-mono text-slate-300">PIN {user.authPin}</span>
          <StatusPill tone={user.isVerified ? "emerald" : "yellow"}>{user.isVerified ? "Verified" : "Pending"}</StatusPill>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <IconButton icon={Pencil} label="Edit" onClick={() => onEdit(user)} />
        <IconButton icon={RotateCcw} label="PIN" onClick={() => onRegeneratePin(user)} disabled={busy} />
        <IconButton icon={Trash2} label="Hapus" danger onClick={() => onDelete(user)} disabled={busy} />
      </div>
    </div>
  );
}

function Toolbar({
  search,
  onSearch,
  placeholder,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  onRefresh,
}: {
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
  actionLabel: string;
  actionIcon: React.ElementType;
  onAction: () => void;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-slate-500" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 pr-3 pl-9 text-sm text-slate-100 outline-none focus:border-cyan-300"
        />
      </div>
      <div className="flex gap-2">
        {onRefresh && (
          <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800" onClick={onRefresh}>
            <RefreshCw className="size-4" />
          </Button>
        )}
        <Button className="gap-2 bg-cyan-300 font-bold text-slate-950 hover:bg-cyan-200" onClick={onAction}>
          <ActionIcon className="size-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function PanelHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 border-slate-800 border-b pb-3">
      <Icon className="size-4 text-cyan-300" />
      <h2 className="font-bold text-slate-100 text-sm uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: "cyan" | "emerald" | "yellow" | "red" }) {
  const toneClass = {
    cyan: "border-cyan-300/50 bg-cyan-300/10 text-cyan-100",
    emerald: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100",
    yellow: "border-yellow-300/60 bg-yellow-300/15 text-yellow-100",
    red: "border-red-400/50 bg-red-400/10 text-red-100",
  }[tone];

  return (
    <div className={`rounded-md border p-2.5 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <span className="font-bold text-[10px] uppercase tracking-widest opacity-80">{label}</span>
        <Icon className="size-3.5" />
      </div>
      <div className="mt-1.5 font-bold font-mono text-xl">{value}</div>
    </div>
  );
}

function StatusLine({ label, value, tone }: { label: string; value: string; tone: "cyan" | "emerald" | "yellow" | "slate" }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2">
      <span className="text-slate-500 text-xs uppercase tracking-widest">{label}</span>
      <StatusPill tone={tone}>{value}</StatusPill>
    </div>
  );
}

function StatusPill({ tone, children }: { tone: "cyan" | "emerald" | "yellow" | "red" | "slate"; children: React.ReactNode }) {
  const toneClass = {
    cyan: "border-cyan-300/50 bg-cyan-300/10 text-cyan-100",
    emerald: "border-emerald-300/50 bg-emerald-300/10 text-emerald-100",
    yellow: "border-yellow-300/60 bg-yellow-300/15 text-yellow-100",
    red: "border-red-400/50 bg-red-400/10 text-red-100",
    slate: "border-slate-700 bg-slate-800 text-slate-200",
  }[tone];

  return <span className={`rounded-md border px-2 py-1 font-bold text-[10px] uppercase tracking-widest ${toneClass}`}>{children}</span>;
}

function ErrorBox({ error }: { error: ApiErrorState }) {
  return (
    <div className="mt-3 rounded-md border border-red-400/40 bg-red-500/10 p-3 text-red-100 text-sm">
      <strong>{error.message}</strong>
      {error.detail && <p className="mt-1 text-red-100/70">{error.detail}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, title, meta }: { icon: React.ElementType; title: string; meta?: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <Icon className="size-9 text-slate-600" />
      <h3 className="mt-3 font-semibold text-slate-300">{title}</h3>
      {meta && <p className="mt-1 text-slate-500 text-sm">{meta}</p>}
    </div>
  );
}

function MediaPlaceholder({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex h-28 flex-col items-center justify-center rounded-md border border-slate-800 bg-slate-900/70 text-slate-500 text-xs">
      <Icon className="mb-2 size-5" />
      {label}
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  danger,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className={`gap-2 ${danger ? "border-red-400/50 text-red-200 hover:bg-red-500/10" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="font-semibold text-slate-300 text-sm">{label}</span>
      {children}
    </label>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-300 text-xs">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

type ReportInfoStatus = "pending" | "baket" | "closed";

function hasValidReportCoordinates(report: WhatsappReport) {
  return Number.isFinite(Number(report.locationLatitude)) && Number.isFinite(Number(report.locationLongitude));
}

function getReportInfoStatus(report: WhatsappReport): ReportInfoStatus {
  const rawStatus = (report.informationStatus || report.status || "").toString().toLowerCase();

  if (report.closedAt || rawStatus === "closed" || rawStatus === "invalid" || rawStatus === "tutup") return "closed";
  if (
    report.baketId ||
    rawStatus === "baket" ||
    rawStatus === "converted" ||
    rawStatus === "valid" ||
    rawStatus === "validated" ||
    rawStatus === "verified"
  ) {
    return "baket";
  }
  return "pending";
}

function getReportStatusLabel(status: ReportInfoStatus) {
  const labels = {
    pending: "Pending",
    baket: "Menjadi BAKET",
    closed: "Ditutup",
  };

  return labels[status];
}

function getReportStatusTone(status: ReportInfoStatus): "cyan" | "emerald" | "yellow" | "slate" {
  if (status === "baket") return "cyan";
  if (status === "closed") return "slate";
  return "yellow";
}

function getReportStatusColor(status: ReportInfoStatus) {
  if (status === "baket") return "#67e8f9";
  if (status === "closed") return "#64748b";
  return "#facc15";
}

function getReportMarkerHtml(status: ReportInfoStatus, selected: boolean) {
  const color = getReportStatusColor(status);
  const size = selected ? 46 : 38;
  const innerSize = selected ? 32 : 26;

  return `
    <div style="
      position: relative;
      width: ${size}px;
      height: ${size}px;
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 12px 18px rgba(0,0,0,0.45));
    ">
      <div style="
        position: absolute;
        inset: ${selected ? 0 : 4}px;
        border-radius: 999px;
        background: ${color}22;
        border: 2px solid ${color};
        box-shadow: 0 0 0 ${selected ? 7 : 4}px ${color}24;
      "></div>
      <div style="
        position: relative;
        width: ${innerSize}px;
        height: ${innerSize}px;
        border-radius: 999px 999px 999px 8px;
        transform: rotate(-45deg);
        background: ${color};
        border: 2px solid rgba(248,250,252,0.95);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg viewBox="0 0 24 24" width="15" height="15" style="transform: rotate(45deg); display: block;">
          <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Z" fill="none" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
          <circle cx="12" cy="10" r="2.4" fill="#0f172a"/>
        </svg>
      </div>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const inputClass =
  "h-10 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300 disabled:opacity-60";
