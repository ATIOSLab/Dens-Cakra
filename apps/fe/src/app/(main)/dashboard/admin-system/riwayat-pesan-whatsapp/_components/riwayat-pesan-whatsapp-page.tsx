"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { ArrowDownUp, BadgeCheck, Hourglass, Inbox, RefreshCw, Search, UserX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type Classification = "VERIFIED" | "PENDING" | "REJECTED" | "UNREGISTERED" | "UNKNOWN";

type MessageEventItem = {
  id: string;
  channelId: string;
  channelCode: string;
  channelName: string;
  externalEventId: string | null;
  eventType: string;
  senderPhone: string | null;
  payload: unknown | null;
  receivedAt: string;
  processedAt: string | null;
  success: boolean | null;
  errorMessage: string | null;
  classification: Classification;
  jaringName: string | null;
  jaringAlias: string | null;
};

type MessageEventResponse = {
  items: MessageEventItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    unregistered: number;
    unknown: number;
  };
  filters: {
    channels: Array<{ id: string; code: string; name: string }>;
  };
};

type SortKey = "receivedAt" | "senderPhone" | "channelName";

const ALL = "__all";

function payloadString(payload: unknown, key: string): string | null {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const value = (payload as Record<string, unknown>)[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  }
  return null;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function classificationLabel(value: Classification) {
  if (value === "VERIFIED") return "Terverifikasi";
  if (value === "PENDING") return "Menunggu Persetujuan";
  if (value === "REJECTED") return "Ditolak";
  if (value === "UNREGISTERED") return "Tidak Terdaftar";
  return "Nomor Tidak Tersedia";
}

function classificationTone(value: Classification) {
  if (value === "VERIFIED") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (value === "PENDING") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  if (value === "REJECTED") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  return "border-slate-400/30 bg-slate-500/10 text-slate-200";
}

function sortValue(item: MessageEventItem, key: SortKey) {
  if (key === "receivedAt") return new Date(item.receivedAt).getTime();
  if (key === "senderPhone") return item.senderPhone ?? "";
  if (key === "channelName") return item.channelName;
  return "";
}

export function RiwayatPesanWhatsappPage() {
  const [data, setData] = useState<MessageEventResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>("receivedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState({
    q: "",
    channelId: ALL,
    classification: ALL,
    from: "",
    to: "",
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiBrowserFetch<MessageEventResponse>("/integration-channels/whatsapp-message-events", {
        query: {
          page,
          limit: 50,
          ...(filters.q ? { q: filters.q } : {}),
          ...(filters.channelId !== ALL ? { channelId: filters.channelId } : {}),
          ...(filters.classification !== ALL ? { classification: filters.classification } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {}),
        },
      });
      setData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat riwayat pesan masuk WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

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

  const summary = data?.summary ?? {
    total: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    unregistered: 0,
    unknown: 0,
  };
  const unverified = summary.pending + summary.rejected;
  const unregistered = summary.unregistered + summary.unknown;

  return (
    <main className="space-y-6 p-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Admin Sistem</p>
            <h1 className={DC_TYPOGRAPHY.pageTitle}>Riwayat Pesan Masuk WhatsApp</h1>
            <p className={DC_TYPOGRAPHY.body}>
              Lihat kesesuaian nomor pengirim dengan data Jaring: terverifikasi, belum diverifikasi/ditolak, atau tidak
              terdaftar.
            </p>
          </div>
          <Button onClick={() => void loadEvents()} disabled={loading} variant="outline">
            <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
            Muat ulang
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <Inbox className="size-9 text-cyan-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TOTAL PESAN</p>
              <p className="text-2xl font-semibold">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <BadgeCheck className="size-9 text-emerald-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>JARING TERVERIFIKASI</p>
              <p className="text-2xl font-semibold">{summary.verified}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <Hourglass className="size-9 text-amber-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>BELUM DIVERIFIKASI / DITOLAK</p>
              <p className="text-2xl font-semibold">{unverified}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <UserX className="size-9 text-slate-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TIDAK TERDAFTAR</p>
              <p className="text-2xl font-semibold">{unregistered}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={cn(DC_CONTROLS.card, "space-y-4 p-4")}>
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari nomor pengirim atau kanal..."
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
            value={filters.classification}
            onChange={(value) => updateFilter("classification", value)}
            placeholder="Semua klasifikasi"
          >
            <SelectItem value="VERIFIED">Terverifikasi</SelectItem>
            <SelectItem value="UNVERIFIED">Belum Diverifikasi / Ditolak</SelectItem>
            <SelectItem value="UNREGISTERED">Tidak Terdaftar</SelectItem>
          </FilterSelect>
        </div>
      </section>

      <section className={cn(DC_CONTROLS.card, "overflow-hidden")}>
        {error ? <div className="p-4 text-sm text-rose-200">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead className="border-b border-border/70 bg-muted/25">
              <tr>
                <SortableHeader
                  label="Waktu"
                  active={sortKey === "receivedAt"}
                  onClick={() => toggleSort("receivedAt")}
                />
                <SortableHeader
                  label="Nomor Pengirim"
                  active={sortKey === "senderPhone"}
                  onClick={() => toggleSort("senderPhone")}
                />
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Klasifikasi</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Jaring</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Nama Tampilan</th>
                <SortableHeader
                  label="Kanal"
                  active={sortKey === "channelName"}
                  onClick={() => toggleSort("channelName")}
                />
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedItems.map((item) => {
                const phone = item.senderPhone ?? payloadString(item.payload, "senderPhone");
                const pushName = payloadString(item.payload, "pushName");
                const senderJid = payloadString(item.payload, "senderJid");
                const source = payloadString(item.payload, "senderPhoneSource");
                return (
                  <tr key={item.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm">{formatDateTime(item.receivedAt)}</td>
                    <td className="px-4 py-3">
                      {phone ? (
                        <span className="font-mono text-sm">{phone}</span>
                      ) : (
                        <Badge className="border-slate-400/30 bg-slate-500/10 text-slate-200">Tidak tersedia</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={classificationTone(item.classification)}>
                        {classificationLabel(item.classification)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.jaringName ? (
                        <div>
                          <div className="font-medium">{item.jaringName}</div>
                          {item.jaringAlias ? (
                            <div className="text-xs text-muted-foreground">{item.jaringAlias}</div>
                          ) : null}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">{pushName ?? "-"}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{item.channelName}</div>
                      <div className="text-xs text-muted-foreground">{item.channelCode}</div>
                    </td>
                    <td className="max-w-[280px] px-4 py-3 text-xs text-muted-foreground">
                      {senderJid ? (
                        <div>
                          <span className="font-mono">{senderJid}</span>
                          {source ? ` · ${source}` : ""}
                        </div>
                      ) : null}
                      {item.errorMessage ? <div className="text-rose-200">{item.errorMessage}</div> : null}
                      {!senderJid && !item.errorMessage ? "-" : null}
                    </td>
                  </tr>
                );
              })}
              {!loading && sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Belum ada pesan masuk WhatsApp sesuai filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 text-sm text-muted-foreground">
          <span>
            {loading ? "Memuat data..." : `Menampilkan ${sortedItems.length} dari ${data?.meta.total ?? 0} pesan.`}
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
