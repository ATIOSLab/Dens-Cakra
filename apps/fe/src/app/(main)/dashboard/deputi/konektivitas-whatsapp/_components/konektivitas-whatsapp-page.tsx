"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ArrowDownUp, Copy, RefreshCw, Search, ShieldAlert, Signal, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

type ConnectivityScopeArea = {
  id: string;
  code: string;
  officialCode: string | null;
  name: string;
  level: string;
  parentName: string | null;
  hierarchy: Array<{
    id: string;
    code: string;
    officialCode: string | null;
    name: string;
    level: string;
  }>;
};

type ConnectivityItem = {
  id: string;
  code: string;
  name: string;
  channelType: string;
  status: string;
  connectionStatus: string;
  botPhoneNumber: string | null;
  senderNumbers: string[];
  lastConnectedAt: string | null;
  lastDisconnectedAt: string | null;
  lastError: string | null;
  scopeAreas: ConnectivityScopeArea[];
  coordinatorName: string | null;
};

type ConnectivityAreaNode = {
  id: string;
  parentId?: string | null;
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level: string;
  children?: ConnectivityAreaNode[];
};

type ConnectivityResponse = {
  items: ConnectivityItem[];
  summary: { connected: number; disconnected: number; connecting: number; error: number; total: number };
  filters: {
    connectionStatuses: string[];
    channels: Array<{ id: string; code: string; name: string }>;
  };
  areaTree: ConnectivityAreaNode;
};

type FlatAreaNode = {
  id: string;
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level: string;
  provinceId: string | null;
};

type SortKey = "name" | "connectionStatus" | "lastConnectedAt" | "lastDisconnectedAt";

const ALL = "__all";

function isProvince(area: Pick<FlatAreaNode, "level">) {
  return area.level === "PROVINCE";
}

function isRegencyCity(area: Pick<FlatAreaNode, "level">) {
  return area.level === "CITY" || area.level === "REGENCY";
}

function flattenAreaTree(root: ConnectivityAreaNode | null | undefined) {
  const result: FlatAreaNode[] = [];

  function visit(node: ConnectivityAreaNode, provinceId: string | null) {
    const nextProvinceId = node.level === "PROVINCE" ? node.id : provinceId;
    result.push({
      id: node.id,
      code: node.code,
      officialCode: node.officialCode,
      name: node.name,
      level: node.level,
      provinceId: nextProvinceId,
    });
    for (const child of node.children ?? []) visit(child, nextProvinceId);
  }

  if (root) visit(root, null);
  return result;
}

function uniqueAreas(areas: FlatAreaNode[]) {
  const byId = new Map<string, FlatAreaNode>();
  for (const area of areas) byId.set(area.id, area);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
}

function areaLevelLabel(level: string) {
  if (level === "PROVINCE") return "Provinsi";
  if (level === "CITY") return "Kota";
  if (level === "REGENCY") return "Kabupaten";
  return "Kecamatan";
}

function areaOption(area: FlatAreaNode): SearchableSelectOption {
  return {
    value: area.id,
    label: area.name,
    description: areaLevelLabel(area.level),
    keywords: [area.level, area.code, area.officialCode].filter(Boolean) as string[],
  };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(value: string) {
  if (value === "CONNECTED") return "Terhubung";
  if (value === "DISCONNECTED") return "Terputus";
  if (value === "CONNECTING") return "Menghubungkan";
  if (value === "QR_READY") return "QR siap";
  if (value === "PAIRING_CODE_READY") return "Kode pairing siap";
  if (value === "ERROR") return "Error";
  return value;
}

function statusTone(value: string) {
  if (value === "CONNECTED") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  if (value === "ERROR") return "border-rose-400/30 bg-rose-500/10 text-rose-200";
  if (value === "DISCONNECTED") return "border-amber-400/30 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";
}

function sortValue(item: ConnectivityItem, key: SortKey) {
  if (key === "lastConnectedAt") return new Date(item.lastConnectedAt ?? 0).getTime();
  if (key === "lastDisconnectedAt") return new Date(item.lastDisconnectedAt ?? 0).getTime();
  if (key === "name") return item.name;
  return item.connectionStatus;
}

function scopeAreaLabel(area: ConnectivityScopeArea) {
  return area.parentName ? `${area.parentName} / ${area.name}` : area.name;
}

function shortCityLabel(name: string) {
  return name
    .replace(/^Kota\s+Administrasi\s+/i, "")
    .replace(/^Kabupaten\s+Administrasi\s+/i, "")
    .replace(/^Kota\s+/i, "")
    .replace(/^Kabupaten\s+/i, "")
    .toUpperCase();
}

function compactPhone(value?: string | null) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function primaryCityArea(item: ConnectivityItem) {
  if (item.scopeAreas.length === 0) return null;
  return item.scopeAreas.find((area) => area.level === "CITY" || area.level === "REGENCY") ?? item.scopeAreas[0];
}

function buildWhatsappListText(items: ConnectivityItem[]) {
  const dateLabel = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const groups = new Map<string, { cityName: string; numbers: string[] }>();
  for (const item of items) {
    if (item.connectionStatus !== "CONNECTED") continue;
    const city = primaryCityArea(item);
    if (!city) continue;
    const phone = compactPhone(item.botPhoneNumber);
    if (!phone) continue;

    const existing = groups.get(city.id);
    if (existing) {
      existing.numbers.push(phone);
    } else {
      groups.set(city.id, { cityName: city.name, numbers: [phone] });
    }
  }

  const sortedGroups = [...groups.values()].sort((left, right) => left.cityName.localeCompare(right.cityName, "id"));

  const lines: string[] = ["*DAFTAR NOMOR WHATSAPP TERHUBUNG*", `*Per Tanggal ${dateLabel}*`, "", "━━━━━━━━━━━━━━━━━━"];

  for (const group of sortedGroups) {
    lines.push("", `*${shortCityLabel(group.cityName)}*`, `_${group.cityName}_`);
    for (const phone of [...group.numbers].sort()) {
      lines.push(`📱 ${phone} ✅️ *AKTIF*`);
    }
  }

  lines.push(
    "",
    "━━━━━━━━━━━━━━━━━━",
    "",
    "📌 *KETERANGAN*",
    "",
    "Seluruh nomor di atas *dapat digunakan*. Utamakan nomor yang berada di urutan paling atas.",
    "",
    "Apabila nomor tersebut *tidak merespons*, silakan gunakan nomor lainnya yang tersedia pada wilayah yang sama.",
    "",
    "⚠️ *PENTING*",
    "",
    "Mohon simpan seluruh nomor di atas ke dalam kontak dengan nama:",
    "",
    "*MERAH PUTIH*",
    "",
    "_Jangan menggunakan nama lain agar penamaan kontak tetap seragam._",
  );

  return lines.join("\n");
}

export function KonektivitasWhatsappPage() {
  const [data, setData] = useState<ConnectivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState({
    q: "",
    provinceId: ALL,
    regencyCityId: ALL,
    connectionStatus: ALL,
    channelId: ALL,
  });

  const flatAreas = useMemo(() => flattenAreaTree(data?.areaTree), [data?.areaTree]);
  const provinces = useMemo(() => uniqueAreas(flatAreas.filter(isProvince)), [flatAreas]);
  const effectiveProvinceId = useMemo(() => {
    if (filters.provinceId !== ALL) return filters.provinceId;
    if (provinces.length === 1) return provinces[0].id;
    return null;
  }, [filters.provinceId, provinces]);
  const regencyCities = useMemo(
    () =>
      uniqueAreas(
        flatAreas.filter(
          (area) => isRegencyCity(area) && (!effectiveProvinceId || area.provinceId === effectiveProvinceId),
        ),
      ),
    [flatAreas, effectiveProvinceId],
  );
  const canSelectRegency = Boolean(effectiveProvinceId);

  const areaId = useMemo(() => {
    if (filters.regencyCityId !== ALL) return filters.regencyCityId;
    if (filters.provinceId !== ALL) return filters.provinceId;
    return "";
  }, [filters.provinceId, filters.regencyCityId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiBrowserFetch<ConnectivityResponse>("/integration-channels/whatsapp-connectivity", {
        query: {
          ...(filters.q ? { q: filters.q } : {}),
          ...(areaId ? { areaId } : {}),
          ...(filters.connectionStatus !== ALL ? { connectionStatus: filters.connectionStatus } : {}),
          ...(filters.channelId !== ALL ? { channelId: filters.channelId } : {}),
        },
      });
      setData(response);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Gagal memuat konektivitas WhatsApp.");
    } finally {
      setLoading(false);
    }
  }, [areaId, filters.channelId, filters.connectionStatus, filters.q]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
    setFilters((current) => {
      if (key === "provinceId" && value !== current.provinceId) {
        return { ...current, provinceId: value, regencyCityId: ALL };
      }
      return { ...current, [key]: value };
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const copyList = useCallback(() => {
    const connected = (data?.items ?? []).filter((item) => item.connectionStatus === "CONNECTED");
    if (connected.length === 0) {
      toast.info("Belum ada nomor WhatsApp terhubung untuk disalin.");
      return;
    }

    void navigator.clipboard
      .writeText(buildWhatsappListText(connected))
      .then(() => toast.success("Daftar nomor WhatsApp tersalin."))
      .catch(() => toast.error("Gagal menyalin daftar nomor WhatsApp."));
  }, [data?.items]);

  const summary = data?.summary ?? { connected: 0, disconnected: 0, connecting: 0, error: 0, total: 0 };

  return (
    <main className="space-y-6 p-6">
      <section className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{DOMAIN_TERMS.executiveRole}</p>
            <h1 className={DC_TYPOGRAPHY.pageTitle}>{DOMAIN_TERMS.whatsappConnectivity}</h1>
            <p className={DC_TYPOGRAPHY.body}>
              Pantau status koneksi perangkat WhatsApp Center dan wilayah pelaporan yang dilayaninya.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={copyList} variant="outline">
              <Copy className="mr-2 size-4" />
              Salin Daftar Nomor
            </Button>
            <Button onClick={() => void loadData()} disabled={loading} variant="outline">
              <RefreshCw className={cn("mr-2 size-4", loading && "animate-spin")} />
              Muat ulang
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <Signal className="size-9 text-emerald-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TERHUBUNG</p>
              <p className="text-2xl font-semibold">{summary.connected}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <WifiOff className="size-9 text-amber-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>TERPUTUS</p>
              <p className="text-2xl font-semibold">{summary.disconnected}</p>
            </div>
          </CardContent>
        </Card>
        <Card className={DC_CONTROLS.card}>
          <CardContent className="flex items-center gap-4 p-4">
            <RefreshCw className="size-9 text-cyan-300" />
            <div>
              <p className={DC_TYPOGRAPHY.metadata}>MENGHUBUNGKAN</p>
              <p className="text-2xl font-semibold">{summary.connecting}</p>
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
        <div className="grid gap-3 lg:grid-cols-[minmax(13rem,0.9fr)_minmax(15rem,1fr)_minmax(15rem,1fr)_minmax(13rem,0.7fr)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Cari perangkat, kanal, wilayah..."
              value={filters.q}
              onChange={(event) => updateFilter("q", event.target.value)}
            />
          </div>
          <div className="grid min-w-0 gap-1">
            <span className="text-xs text-muted-foreground">Provinsi</span>
            <SearchableSelect
              value={filters.provinceId}
              options={[
                { value: ALL, label: "Semua Provinsi", description: "Seluruh cakupan" },
                ...provinces.map(areaOption),
              ]}
              onValueChange={(value) => updateFilter("provinceId", value)}
              placeholder="Semua Provinsi"
              searchPlaceholder="Cari provinsi..."
              emptyText="Provinsi tidak ditemukan."
              aria-label="Filter provinsi"
            />
          </div>
          <div className="grid min-w-0 gap-1">
            <span className="text-xs text-muted-foreground">Kota/Kabupaten</span>
            <SearchableSelect
              value={canSelectRegency ? filters.regencyCityId : ALL}
              options={[
                {
                  value: ALL,
                  label: canSelectRegency ? "Semua Kota/Kabupaten" : "Pilih Provinsi terlebih dahulu",
                  description: canSelectRegency ? "Dalam provinsi terpilih" : "Filter aktif setelah Provinsi dipilih",
                },
                ...regencyCities.map(areaOption),
              ]}
              onValueChange={(value) => updateFilter("regencyCityId", value)}
              placeholder={canSelectRegency ? "Semua Kota/Kabupaten" : "Pilih Provinsi dahulu"}
              searchPlaceholder="Cari kota/kabupaten..."
              emptyText="Kota/kabupaten tidak ditemukan."
              disabled={!canSelectRegency}
              aria-label="Filter kota atau kabupaten"
            />
          </div>
          <div className="grid min-w-0 gap-1">
            <span className="text-xs text-muted-foreground">Status Koneksi</span>
            <NativeSelect
              value={filters.connectionStatus}
              onChange={(event) => updateFilter("connectionStatus", event.target.value)}
              className="w-full"
            >
              <NativeSelectOption value={ALL}>Semua status</NativeSelectOption>
              {(data?.filters.connectionStatuses ?? []).map((status) => (
                <NativeSelectOption key={status} value={status}>
                  {statusLabel(status)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="grid min-w-0 gap-1 lg:col-span-1">
            <span className="text-xs text-muted-foreground">Perangkat / Kanal</span>
            <SearchableSelect
              value={filters.channelId}
              options={[
                { value: ALL, label: "Semua perangkat", description: "Seluruh kanal WhatsApp" },
                ...(data?.filters.channels ?? []).map((channel) => ({
                  value: channel.id,
                  label: channel.name,
                  description: channel.code,
                  keywords: [channel.code],
                })),
              ]}
              onValueChange={(value) => updateFilter("channelId", value)}
              placeholder="Semua perangkat"
              searchPlaceholder="Cari perangkat..."
              emptyText="Perangkat tidak ditemukan."
              aria-label="Filter perangkat"
            />
          </div>
        </div>
      </section>

      <section className={cn(DC_CONTROLS.card, "overflow-hidden")}>
        {error ? <div className="p-4 text-sm text-rose-200">{error}</div> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead className="border-b border-border/70 bg-muted/25">
              <tr>
                <SortableHeader label="Perangkat" active={sortKey === "name"} onClick={() => toggleSort("name")} />
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Nomor WhatsApp</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Wilayah</th>
                <SortableHeader
                  label="Status Koneksi"
                  active={sortKey === "connectionStatus"}
                  onClick={() => toggleSort("connectionStatus")}
                />
                <SortableHeader
                  label="Terhubung Terakhir"
                  active={sortKey === "lastConnectedAt"}
                  onClick={() => toggleSort("lastConnectedAt")}
                />
                <SortableHeader
                  label="Terputus Terakhir"
                  active={sortKey === "lastDisconnectedAt"}
                  onClick={() => toggleSort("lastDisconnectedAt")}
                />
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Pengelola</th>
                <th className={cn(DC_TYPOGRAPHY.tableHeader, "px-4 py-3 text-left")}>Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sortedItems.map((item) => (
                <tr key={item.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm">
                    <div className="font-medium">{item.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{item.code}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{item.botPhoneNumber ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">
                    {item.scopeAreas.length > 0 ? item.scopeAreas.map((area) => scopeAreaLabel(area)).join(", ") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusTone(item.connectionStatus)}>{statusLabel(item.connectionStatus)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(item.lastConnectedAt)}</td>
                  <td className="px-4 py-3 text-sm">{formatDateTime(item.lastDisconnectedAt)}</td>
                  <td className="px-4 py-3 text-sm">{item.coordinatorName ?? "-"}</td>
                  <td className="max-w-[320px] px-4 py-3 text-sm text-muted-foreground">{item.lastError ?? "-"}</td>
                </tr>
              ))}
              {!loading && sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Belum ada perangkat WhatsApp sesuai filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 p-4 text-sm text-muted-foreground">
          <span>
            {loading ? "Memuat data..." : `Menampilkan ${sortedItems.length} dari ${summary.total} perangkat.`}
          </span>
        </div>
      </section>
    </main>
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
