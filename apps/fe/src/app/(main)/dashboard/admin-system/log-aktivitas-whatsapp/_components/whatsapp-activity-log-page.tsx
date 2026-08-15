"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { ArrowDownUp, BellRing, RefreshCw, Search, ShieldAlert, Signal, WifiOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type ActivityLogItem = {
  id: string;
  channelId: string;
  channelCode: string;
  channelName: string;
  phoneNumber: string | null;
  eventType: string;
  connectionStatus: string;
  previousConnectionStatus: string | null;
  sessionJid: string | null;
  reason: string | null;
  errorMessage: string | null;
  occurredAt: string;
  scopeArea: {
    id: string;
    code: string;
    officialCode: string | null;
    name: string;
    level: string;
    parentName: string | null;
  } | null;
  coordinator: {
    id: string;
    name: string | null;
    phone: string | null;
    assignmentId: string | null;
    branch: string | null;
  } | null;
};

type ActivityResponse = {
  items: ActivityLogItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: { active: number; disconnected: number; error: number };
  filters: {
    channels: Array<{ id: string; code: string; name: string }>;
    scopeAreas: Array<{
      id: string;
      code: string;
      officialCode: string | null;
      name: string;
      level: string;
      parentName: string | null;
    }>;
    phoneNumbers: string[];
    connectionStatuses: string[];
    eventTypes: string[];
  };
};

type SortKey = "occurredAt" | "phoneNumber" | "connectionStatus" | "eventType" | "channelName" | "scopeArea";

const ALL = "__all";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(value: string) {
  if (value === "CONNECTED") return "Aktif";
  if (value === "DISCONNECTED") return "Terputus";
  if (value === "CONNECTING") return "Menghubungkan";
  if (value === "QR_READY") return "QR siap";
  if (value === "PAIRING_CODE_READY") return "Kode pairing siap";
  if (value === "ERROR") return "Error";
  return value;
}

function eventLabel(value: string) {
  if (value === "LOGIN") return "Login";
  if (value === "LOGOUT") return "Logout";
  if (value === "DISCONNECTED") return "Terputus";
  if (value === "ERROR") return "Error";
  if (value === "CONNECTING") return "Menghubungkan";
  if (value === "QR_READY") return "QR siap";
  if (value === "PAIRING_CODE_READY") return "Kode pairing siap";
  return "Pembaruan status";
}

function statusTone(value: string) {
  if (value === "CONNECTED") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (value === "ERROR") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (value === "DISCONNECTED") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
}

function sortValue(item: ActivityLogItem, key: SortKey) {
  if (key === "occurredAt") return new Date(item.occurredAt).getTime();
  if (key === "scopeArea") return item.scopeArea?.name ?? "";
  return item[key] ?? "";
}

export function WhatsappActivityLogPage() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("occurredAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState({
    q: "",
    channelId: ALL,
    scopeAreaId: ALL,
    phoneNumber: ALL,
    connectionStatus: ALL,
    eventType: ALL,
    from: "",
    to: "",
  });

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiBrowserFetch<ActivityResponse>("/integration-channels/whatsapp-activity-logs", {
        query: {
          page,
          limit: 50,
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.channelId !== ALL ? { channelId: filters.channelId } : {}),
          ...(filters.scopeAreaId !== ALL ? { scopeAreaId: filters.scopeAreaId } : {}),
          ...(filters.phoneNumber !== ALL ? { phoneNumber: filters.phoneNumber } : {}),
          ...(filters.connectionStatus !== ALL ? { connectionStatus: filters.connectionStatus } : {}),
          ...(filters.eventType !== ALL ? { eventType: filters.eventType } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
        },
      });
      setData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat log aktivitas WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const sortedItems = useMemo(() => {
    const items = data?.items ?? [];
    return [...items].sort((left, right) => {
      const leftValue = sortValue(left, sortKey);
      const rightValue = sortValue(right, sortKey);
      const result =
        typeof leftValue === "number" && typeof rightValue === "number"
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue), "id-ID");
      return sortDir === "asc" ? result : -result;
    });
  }, [data?.items, sortDir, sortKey]);

  function updateFilter(key: keyof typeof filters, value: string) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const summary = data?.summary ?? { active: 0, disconnected: 0, error: 0 };

  return (
    <main className="space-y-6 p-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Admin Sistem</p>
            <h1 className={DC_TYPOGRAPHY.pageTitle}>Log Aktivitas WhatsApp</h1>
            <p className={DC_TYPOGRAPHY.body}>
              Pantau kapan nomor WhatsApp aktif, logout, terputus, atau error pada sesi server.
            </p>
          </div>
          <Button onClick={() => void loadLogs()} disabled={loading} variant="outline">
            <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
            Muat ulang
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <Signal className="size-9 text-emerald-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>AKTIF</p>
              <p className="text-2xl font-semibold">{summary.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <WifiOff className="size-9 text-amber-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TERPUTUS / LOGOUT</p>
              <p className="text-2xl font-semibold">{summary.disconnected}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <ShieldAlert className="size-9 text-rose-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>ERROR</p>
              <p className="text-2xl font-semibold">{summary.error}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={cn(DC_CONTROLS.card, "space-y-4 p-4")}>
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari nomor, kanal, wilayah, session..."
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
            />
          </div>
          <Input
            type="datetime-local"
            value={filters.from}
            onChange={(event) => updateFilter("from", event.target.value)}
          />
          <Input
            type="datetime-local"
            value={filters.to}
            onChange={(event) => updateFilter("to", event.target.value)}
          />
          <FilterSelect
            value={filters.channelId}
            onChange={(value) => updateFilter("channelId", value)}
            placeholder="Semua kanal"
          >
            {(data?.filters.channels ?? []).map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filters.scopeAreaId}
            onChange={(value) => updateFilter("scopeAreaId", value)}
            placeholder="Semua wilayah"
          >
            {(data?.filters.scopeAreas ?? []).map((area) => (
              <SelectItem key={area.id} value={area.id}>
                {area.parentName ? `${area.parentName} / ${area.name}` : area.name}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filters.phoneNumber}
            onChange={(value) => updateFilter("phoneNumber", value)}
            placeholder="Semua nomor"
          >
            {(data?.filters.phoneNumbers ?? []).map((phone) => (
              <SelectItem key={phone} value={phone}>
                {phone}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filters.connectionStatus}
            onChange={(value) => updateFilter("connectionStatus", value)}
            placeholder="Semua status"
          >
            {(data?.filters.connectionStatuses ?? []).map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel(status)}
              </SelectItem>
            ))}
          </FilterSelect>
          <FilterSelect
            value={filters.eventType}
            onChange={(value) => updateFilter("eventType", value)}
            placeholder="Semua peristiwa"
          >
            {(data?.filters.eventTypes ?? []).map((eventType) => (
              <SelectItem key={eventType} value={eventType}>
                {eventLabel(eventType)}
              </SelectItem>
            ))}
          </FilterSelect>
        </div>
      </section>

      <section className={cn(DC_CONTROLS.card, "overflow-hidden")}>
        {error ? <div className="p-4 text-sm text-rose-200">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse">
            <thead className="border-b border-border/70 bg-muted/25">
              <tr>
                <SortableHeader
                  label="Waktu"
                  active={sortKey === "occurredAt"}
                  onClick={() => toggleSort("occurredAt")}
                />
                <SortableHeader
                  label="Nomor"
                  active={sortKey === "phoneNumber"}
                  onClick={() => toggleSort("phoneNumber")}
                />
                <SortableHeader
                  label="Status"
                  active={sortKey === "connectionStatus"}
                  onClick={() => toggleSort("connectionStatus")}
                />
                <SortableHeader
                  label="Peristiwa"
                  active={sortKey === "eventType"}
                  onClick={() => toggleSort("eventType")}
                />
                <SortableHeader
                  label="Kanal"
                  active={sortKey === "channelName"}
                  onClick={() => toggleSort("channelName")}
                />
                <SortableHeader
                  label="Wilayah"
                  active={sortKey === "scopeArea"}
                  onClick={() => toggleSort("scopeArea")}
                />
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Pengelola</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">{formatDateTime(item.occurredAt)}</td>
                  <td className="px-4 py-3 font-mono text-sm">{item.phoneNumber ?? "-"}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusTone(item.connectionStatus)}>{statusLabel(item.connectionStatus)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{eventLabel(item.eventType)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{item.channelName}</div>
                    <div className="text-xs text-muted-foreground">{item.channelCode}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.scopeArea
                      ? item.scopeArea.parentName
                        ? `${item.scopeArea.parentName} / ${item.scopeArea.name}`
                        : item.scopeArea.name
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm">{item.coordinator?.name ?? "-"}</td>
                  <td className="max-w-[320px] px-4 py-3 text-sm text-muted-foreground">
                    {item.errorMessage ?? item.reason ?? item.sessionJid ?? "-"}
                  </td>
                </tr>
              ))}
              {!loading && sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Belum ada log aktivitas WhatsApp sesuai filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 text-sm text-muted-foreground">
          <span>
            {loading ? "Memuat data..." : `Menampilkan ${sortedItems.length} dari ${data?.meta.total ?? 0} log.`}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Sebelumnya
            </Button>
            <span className="font-mono text-xs">
              Halaman {data?.meta.page ?? page} / {data?.meta.totalPages ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= (data?.meta.totalPages ?? 1)}
              onClick={() => setPage((current) => current + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellRing className="size-4" />
        Email notifikasi mengikuti pengaturan pada menu Notifikasi WhatsApp.
      </div>
    </main>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children: ReactNode;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {children}
      </SelectContent>
    </Select>
  );
}

function SortableHeader({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          DC_TYPOGRAPHY.tableHeader,
          "inline-flex items-center gap-2 hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <ArrowDownUp className="size-3" />
      </button>
    </th>
  );
}
