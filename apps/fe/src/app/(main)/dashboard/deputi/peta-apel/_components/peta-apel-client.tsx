"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Globe,
  Layers,
  Map as MapIcon,
  MapPin,
  Moon,
  Mountain,
  Navigation,
  Phone,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Smartphone,
  Sun,
  Timer,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map as BaseMap, MapControls, MapMarker, MapPopup } from "@/components/ui/map";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_CONTROLS, DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type { AdministrativeAreaOption, ApelMapAttendanceItem, ApelMapDataResponse, ApelSessionItem } from "@/server/apel-repository";

const INDONESIA_CENTER: [number, number] = [118.0149, -2.5489]; // [lng, lat]

export type BaseMapLayer = "dark" | "satellite" | "terrain" | "light" | "osm";

// Vector GL styles & raster layers identical to peta-jejaring-intelijen (no API key required)
const MAP_THEMES: Record<BaseMapLayer, string | Record<string, unknown>> = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  terrain: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  satellite: {
    version: 8,
    sources: {
      esri: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "Esri",
      },
    },
    layers: [{ id: "esri-satellite", type: "raster", source: "esri" }],
  },
  osm: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "OpenStreetMap",
      },
    },
    layers: [{ id: "osm-layer", type: "raster", source: "osm" }],
  },
};

const BASE_MAP_OPTIONS: Array<{
  layer: BaseMapLayer;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = [
  { layer: "dark", label: "Gelap", Icon: Moon, color: "#0f172a" },
  { layer: "light", label: "Terang", Icon: Sun, color: "#f8fafc" },
  { layer: "terrain", label: "Medan", Icon: Mountain, color: "#451a03" },
  { layer: "satellite", label: "Satelit", Icon: Globe, color: "#064e3b" },
  { layer: "osm", label: "OpenStreetMap", Icon: MapIcon, color: "#1e293b" },
];

type ExtendedApelMapResponse = ApelMapDataResponse & {
  availableSessions?: ApelSessionItem[];
  availableAreas?: Array<{
    id: string;
    name: string;
    code: string;
    level: string;
    parentId?: string | null;
  }>;
};

type FilterStatus = "ALL" | "PRESENT" | "NOT_PRESENT" | "NEAR_DEADLINE";
type SortField = "DEFAULT" | "SENT_AT" | "ATTENDED_AT" | "RESPONSE_DURATION" | "NEAR_DEADLINE" | "ALIAS_NAME";
type SortOrder = "asc" | "desc";

function getSentStatusBadge(status: string) {
  if (status === "SENT") {
    return (
      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-300 text-[10px] gap-1">
        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        Terkirim
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="outline" className="border-rose-500/30 bg-rose-950/40 text-rose-300 text-[10px] gap-1">
        <XCircle className="h-3 w-3 text-rose-400" />
        Gagal
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-400 text-[10px] gap-1">
      <Clock className="h-3 w-3 text-slate-400" />
      Tertunda
    </Badge>
  );
}

function getResponseSpeedBadge(seconds: number | null, formatted: string | null) {
  if (seconds === null || !formatted) {
    return <span className="text-slate-600 text-xs">-</span>;
  }
  if (seconds < 120) {
    // Kilat (< 2 menit)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
        <Zap className="h-3 w-3 text-emerald-400" />
        {formatted}
      </span>
    );
  }
  if (seconds < 900) {
    // Standar (2 - 15 menit)
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-medium text-cyan-300">
        <Clock className="h-3 w-3 text-cyan-400" />
        {formatted}
      </span>
    );
  }
  // Lambat (> 15 menit)
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium text-amber-300">
      <Clock className="h-3 w-3 text-amber-400" />
      {formatted}
    </span>
  );
}

export function PetaApelClient() {
  const [data, setData] = useState<ExtendedApelMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedAreaId, setSelectedAreaId] = useState<string>("ALL");
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // 4-Level Cascading Area Filter States (Provinsi -> Kota/Kabupaten -> Kecamatan -> Kelurahan)
  const [selectedProvinceId, setSelectedProvinceId] = useState<string>("ALL");
  const [selectedRegencyId, setSelectedRegencyId] = useState<string>("ALL");
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("ALL");
  const [selectedVillageId, setSelectedVillageId] = useState<string>("ALL");

  const [districtOptions, setDistrictOptions] = useState<AdministrativeAreaOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<AdministrativeAreaOption[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingVillages, setLoadingVillages] = useState(false);

  // Sorting States
  const [sortField, setSortField] = useState<SortField>("DEFAULT");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [quickSortPreset, setQuickSortPreset] = useState<string>("default");

  // Map & Interaction States
  const [mapLayer, setMapLayer] = useState<BaseMapLayer>("dark");
  const [selectedAttendance, setSelectedAttendance] = useState<ApelMapAttendanceItem | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Pagination for table below map
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const activeStyle = MAP_THEMES[mapLayer];
  const mapStyles = useMemo(() => ({ light: activeStyle as never, dark: activeStyle as never }), [activeStyle]);

  // Main Data Loader with Date and Area filters
  const loadData = useCallback(
    async (opts?: { sessionId?: string; date?: string; areaId?: string; isSilent?: boolean }) => {
      try {
        const isSilent = opts?.isSilent ?? false;
        if (!isSilent) {
          setRefreshing(true);
        }

        const params = new URLSearchParams();
        const effectiveSessionId = opts?.sessionId !== undefined ? opts.sessionId : selectedSessionId;
        const effectiveDate = opts?.date !== undefined ? opts.date : selectedDate;
        const effectiveAreaId = opts?.areaId !== undefined ? opts.areaId : selectedAreaId;

        if (effectiveSessionId) {
          params.set("sessionId", effectiveSessionId);
        }
        if (effectiveDate) {
          params.set("date", effectiveDate);
        }
        if (effectiveAreaId && effectiveAreaId !== "ALL") {
          params.set("areaId", effectiveAreaId);
        }

        const qs = params.toString();
        const url = qs ? `/api/deputi/peta-apel?${qs}` : "/api/deputi/peta-apel";

        const response = await fetch(url);
        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(errorData?.message || `Gagal memuat data (HTTP ${response.status})`);
        }
        const res = (await response.json()) as ExtendedApelMapResponse;
        setData(res);

        // Jika baru pertama kali load tanpa sesi terpilih, sinkronkan ke sesi aktif
        if (!effectiveSessionId && res.session?.id) {
          setSelectedSessionId(res.session.id);
        }
      } catch (error) {
        console.error("Gagal memuat peta apel:", error);
        if (!opts?.isSilent) {
          toast.error(error instanceof Error ? error.message : "Gagal memuat data peta apel jaring");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedSessionId, selectedDate, selectedAreaId],
  );

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval (setiap 30 detik untuk pemantauan real-time)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      loadData({ isSilent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, [autoRefresh, loadData]);

  // Fit bounds ke semua koordinat yang valid saat data sesi apel dimuat
  useEffect(() => {
    if (!data?.attendances || !mapInstanceRef.current) return;
    const validCoords = data.attendances.filter((a) => a.latitude !== null && a.longitude !== null);
    if (validCoords.length === 0) return;

    if (validCoords.length === 1 && validCoords[0].longitude && validCoords[0].latitude) {
      mapInstanceRef.current.flyTo({
        center: [validCoords[0].longitude, validCoords[0].latitude],
        zoom: 13,
        duration: 1200,
      });
      return;
    }

    let minLng = 180;
    let maxLng = -180;
    let minLat = 90;
    let maxLat = -90;

    for (const item of validCoords) {
      if (item.longitude !== null && item.latitude !== null) {
        if (item.longitude < minLng) minLng = item.longitude;
        if (item.longitude > maxLng) maxLng = item.longitude;
        if (item.latitude < minLat) minLat = item.latitude;
        if (item.latitude > maxLat) maxLat = item.latitude;
      }
    }

    if (minLng <= maxLng && minLat <= maxLat) {
      mapInstanceRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 80, maxZoom: 14, duration: 1200 },
      );
    }
  }, [data?.session?.id]);

  // Reset page when filter or search changes
  useEffect(() => {
    setPage(1);
  }, [activeFilter, searchQuery, sortField, sortOrder]);

  // Sort Toggle Handler on Column Headers
  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      // Toggle ASC <-> DESC
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setQuickSortPreset("custom");
  };

  // Quick Sort Preset Change
  const handleQuickSortChange = (preset: string) => {
    setQuickSortPreset(preset);
    switch (preset) {
      case "fastest_response":
        setSortField("RESPONSE_DURATION");
        setSortOrder("asc");
        break;
      case "slowest_response":
        setSortField("RESPONSE_DURATION");
        setSortOrder("desc");
        break;
      case "near_deadline":
        setSortField("NEAR_DEADLINE");
        setSortOrder("asc");
        break;
      case "attended_desc":
        setSortField("ATTENDED_AT");
        setSortOrder("desc");
        break;
      case "attended_asc":
        setSortField("ATTENDED_AT");
        setSortOrder("asc");
        break;
      case "sent_desc":
        setSortField("SENT_AT");
        setSortOrder("desc");
        break;
      case "sent_asc":
        setSortField("SENT_AT");
        setSortOrder("asc");
        break;
      case "name_asc":
        setSortField("ALIAS_NAME");
        setSortOrder("asc");
        break;
      case "name_desc":
        setSortField("ALIAS_NAME");
        setSortOrder("desc");
        break;
      default:
        setSortField("DEFAULT");
        setSortOrder("asc");
        break;
    }
  };

  // Filter & Sort Items
  const filteredAndSortedAttendances = useMemo(() => {
    if (!data?.attendances) return [];

    // 1. Filtering
    const filtered = data.attendances.filter((item) => {
      if (activeFilter === "PRESENT") {
        if (item.attendanceStatus !== "PRESENT" && item.attendanceStatus !== "LATE") {
          return false;
        }
      } else if (activeFilter === "NOT_PRESENT") {
        if (item.attendanceStatus === "PRESENT" || item.attendanceStatus === "LATE") {
          return false;
        }
      } else if (activeFilter === "NEAR_DEADLINE") {
        if (!item.isNearDeadline) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const aliasMatch = item.aliasName.toLowerCase().includes(query);
        const nameMatch = item.fullName?.toLowerCase().includes(query);
        const waMatch = item.whatsappNumber.includes(query);
        const caretakerMatch = item.caretaker.toLowerCase().includes(query);
        const areaMatch = item.areaName.toLowerCase().includes(query);
        if (!aliasMatch && !nameMatch && !waMatch && !caretakerMatch && !areaMatch) {
          return false;
        }
      }

      return true;
    });

    // 2. Sorting
    if (sortField === "DEFAULT") {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === "SENT_AT") {
        const timeA = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const timeB = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortField === "ATTENDED_AT") {
        const timeA = a.attendedAt ? new Date(a.attendedAt).getTime() : 0;
        const timeB = b.attendedAt ? new Date(b.attendedAt).getTime() : 0;
        comparison = timeA - timeB;
      } else if (sortField === "RESPONSE_DURATION") {
        // Personel yang belum hadir diberi nilai sangat besar agar berada di urutan belakang
        const durA = a.responseDurationSeconds !== null ? a.responseDurationSeconds : 99999999;
        const durB = b.responseDurationSeconds !== null ? b.responseDurationSeconds : 99999999;
        comparison = durA - durB;
      } else if (sortField === "NEAR_DEADLINE") {
        // Prioritas jaring yang isNearDeadline === true
        if (a.isNearDeadline && !b.isNearDeadline) comparison = -1;
        else if (!a.isNearDeadline && b.isNearDeadline) comparison = 1;
        else {
          // Urutkan sisa menit menjelang batas terkecil
          const minA = a.minutesBeforeDeadline !== null ? a.minutesBeforeDeadline : 99999;
          const minB = b.minutesBeforeDeadline !== null ? b.minutesBeforeDeadline : 99999;
          comparison = minA - minB;
        }
      } else if (sortField === "ALIAS_NAME") {
        comparison = a.aliasName.localeCompare(b.aliasName);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [data?.attendances, activeFilter, searchQuery, sortField, sortOrder]);

  // Paginated rows for the table below map
  const paginatedAttendances = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredAndSortedAttendances.slice(start, start + limit);
  }, [filteredAndSortedAttendances, page, limit]);

  // Handler saat fokus peta ditekan dari tabel
  const handleFocusOnMap = (item: ApelMapAttendanceItem) => {
    setSelectedAttendance(item);

    // Scroll smoothly to map
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    if (item.longitude !== null && item.latitude !== null && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [item.longitude, item.latitude],
        zoom: 15,
        essential: true,
        duration: 1000,
      });
    } else {
      toast.info(`Personel ${item.aliasName} belum mengirimkan titik koordinat lokasi WhatsApp.`);
    }
  };

  // 1. Daftar Provinsi (38 Provinsi se-Indonesia)
  const provinces = useMemo(() => {
    if (!data?.availableAreas) return [];
    return data.availableAreas
      .filter((a) => a.level === "PROVINCE")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.availableAreas]);

  // 2. Daftar Kota/Kabupaten berdasarkan Provinsi terpilih
  const regenciesForSelectedProv = useMemo(() => {
    if (!data?.availableAreas || selectedProvinceId === "ALL") return [];
    const prov = data.availableAreas.find((a) => a.id === selectedProvinceId);
    if (!prov) return [];

    return data.availableAreas
      .filter(
        (a) =>
          (a.level === "CITY" || a.level === "REGENCY") &&
          (a.parentId === prov.id || (a.code && prov.code && a.code.startsWith(`${prov.code}.`))),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data?.availableAreas, selectedProvinceId]);

  // 3. Helper Fetch Kecamatan ketika Kota/Kabupaten dipilih
  const fetchDistricts = useCallback(async (regencyId: string) => {
    if (!regencyId || regencyId === "ALL") {
      setDistrictOptions([]);
      return;
    }
    setLoadingDistricts(true);
    try {
      const res = await fetch(`/api/deputi/peta-apel/children?parentId=${regencyId}`);
      if (res.ok) {
        const json = (await res.json()) as { items?: AdministrativeAreaOption[] };
        setDistrictOptions(json.items || []);
      }
    } catch (e) {
      console.error("Gagal memuat daftar kecamatan:", e);
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  // 4. Helper Fetch Kelurahan ketika Kecamatan dipilih
  const fetchVillages = useCallback(async (districtId: string) => {
    if (!districtId || districtId === "ALL") {
      setVillageOptions([]);
      return;
    }
    setLoadingVillages(true);
    try {
      const res = await fetch(`/api/deputi/peta-apel/children?parentId=${districtId}`);
      if (res.ok) {
        const json = (await res.json()) as { items?: AdministrativeAreaOption[] };
        setVillageOptions(json.items || []);
      }
    } catch (e) {
      console.error("Gagal memuat daftar kelurahan:", e);
    } finally {
      setLoadingVillages(false);
    }
  }, []);

  // Handlers untuk perubahan tiap level filter wilayah
  const handleProvinceChange = (provId: string) => {
    setSelectedProvinceId(provId);
    setSelectedRegencyId("ALL");
    setSelectedDistrictId("ALL");
    setSelectedVillageId("ALL");
    setDistrictOptions([]);
    setVillageOptions([]);

    setSelectedAreaId(provId);
    loadData({ areaId: provId, sessionId: "" });
  };

  const handleRegencyChange = (regId: string) => {
    setSelectedRegencyId(regId);
    setSelectedDistrictId("ALL");
    setSelectedVillageId("ALL");
    setVillageOptions([]);

    const effectiveId = regId !== "ALL" ? regId : selectedProvinceId;
    setSelectedAreaId(effectiveId);
    loadData({ areaId: effectiveId, sessionId: "" });

    if (regId !== "ALL") {
      void fetchDistricts(regId);
    } else {
      setDistrictOptions([]);
    }
  };

  const handleDistrictChange = (distId: string) => {
    setSelectedDistrictId(distId);
    setSelectedVillageId("ALL");

    const effectiveId = distId !== "ALL" ? distId : selectedRegencyId;
    setSelectedAreaId(effectiveId);
    loadData({ areaId: effectiveId, sessionId: "" });

    if (distId !== "ALL") {
      void fetchVillages(distId);
    } else {
      setVillageOptions([]);
    }
  };

  const handleVillageChange = (villId: string) => {
    setSelectedVillageId(villId);

    const effectiveId = villId !== "ALL" ? villId : selectedDistrictId;
    setSelectedAreaId(effectiveId);
    loadData({ areaId: effectiveId, sessionId: "" });
  };

  // Label hierarki wilayah aktif (Breadcrumb)
  const activeAreaHierarchyLabel = useMemo(() => {
    if (selectedProvinceId === "ALL") return "Nasional (Seluruh Indonesia)";

    const prov = provinces.find((p) => p.id === selectedProvinceId);
    const reg = regenciesForSelectedProv.find((r) => r.id === selectedRegencyId);
    const dist = districtOptions.find((d) => d.id === selectedDistrictId);
    const vill = villageOptions.find((v) => v.id === selectedVillageId);

    const parts = [prov?.name || "Provinsi"];
    if (reg) parts.push(reg.name);
    if (dist) parts.push(`Kec. ${dist.name}`);
    if (vill) parts.push(`Kel. ${vill.name}`);

    return parts.join(" › ");
  }, [
    selectedProvinceId,
    selectedRegencyId,
    selectedDistrictId,
    selectedVillageId,
    provinces,
    regenciesForSelectedProv,
    districtOptions,
    villageOptions,
  ]);

  // Reset all filters to default national active session
  const handleResetFilters = () => {
    setSelectedDate("");
    setSelectedAreaId("ALL");
    setSelectedProvinceId("ALL");
    setSelectedRegencyId("ALL");
    setSelectedDistrictId("ALL");
    setSelectedVillageId("ALL");
    setDistrictOptions([]);
    setVillageOptions([]);
    setSelectedSessionId("");
    setSearchQuery("");
    setActiveFilter("ALL");
    setSortField("DEFAULT");
    setQuickSortPreset("default");
    loadData({ sessionId: "", date: "", areaId: "ALL" });
  };

  const isFilterActive = Boolean(
    selectedDate ||
      (selectedAreaId && selectedAreaId !== "ALL") ||
      selectedProvinceId !== "ALL",
  );

  const session = data?.session;
  const kpi = data?.kpi;

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 space-y-6">
      {/* Top Header Bar */}
      <header className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 md:p-5 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-inner shrink-0">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">{DOMAIN_TERMS.apelAttendanceMap}</h1>
                <Badge
                  variant="outline"
                  className="border-cyan-500/40 bg-cyan-950/50 text-cyan-300 text-[10px] px-2 py-0.5"
                >
                  {DOMAIN_TERMS.deputyUnit}
                </Badge>
                {session?.status === "ACTIVE" && (
                  <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                    Sesi Berlangsung
                  </span>
                )}
                {session?.status === "COMPLETED" && (
                  <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-300 text-[10px]">
                    Selesai
                  </Badge>
                )}
                {session &&
                  (session.requireLocation ? (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-950/50 text-emerald-300 text-[10px] px-2 py-0.5"
                    >
                      Lokasi GPS: Wajib
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-blue-500/40 bg-blue-950/50 text-blue-300 text-[10px] px-2 py-0.5"
                    >
                      Lokasi GPS: Opsional (Teks)
                    </Badge>
                  ))}
                {!loading && !session && (
                  <Badge
                    variant="outline"
                    className="border-amber-500/30 bg-amber-950/30 text-amber-400 text-[10px] px-2"
                  >
                    Belum Ada Sesi
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                {loading && "Memuat data sesi apel dan absensi..."}
                {!loading && session && `${session.title} • ${session.areaName}`}
                {!loading &&
                  !session &&
                  "Tidak ditemukan sesi apel pada kriteria filter saat ini. Sesuaikan filter tanggal/wilayah di samping."}
              </p>
            </div>
          </div>

          {/* Quick Actions (Segarkan, Auto Refresh) */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={refreshing}
              className="h-9 border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white px-3.5"
              title="Perbarui data"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1.5", refreshing && "animate-spin text-cyan-400")} />
              <span className="text-xs">Segarkan</span>
            </Button>

            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer",
                autoRefresh
                  ? "border-cyan-500/40 bg-cyan-950/30 text-cyan-300"
                  : "border-slate-800 bg-slate-900/40 text-slate-500 hover:text-slate-400",
              )}
              title={autoRefresh ? "Pembaruan otomatis tiap 30 detik aktif" : "Pembaruan otomatis mati"}
            >
              <span
                className={cn("h-2 w-2 rounded-full", autoRefresh ? "bg-cyan-400 animate-pulse" : "bg-slate-600")}
              />
              <span>Auto-refresh</span>
            </button>
          </div>
        </div>

        {/* FILTER BAR TIER 1: Tanggal Absensi, Pilihan Sesi Apel, & Reset Filter */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Filter 1: Tanggal Absensi */}
          <div className="space-y-1">
            <label
              htmlFor="apel-date-filter"
              className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5"
            >
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span>Filter Tanggal Absensi:</span>
            </label>
            <Input
              id="apel-date-filter"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                const newDate = e.target.value;
                setSelectedDate(newDate);
                loadData({ date: newDate, sessionId: "" });
              }}
              className="h-9 text-xs bg-slate-950 border-slate-700 text-slate-200 focus:border-cyan-500"
            />
          </div>

          {/* Filter 2: Sesi Apel (2 Kolom di Desktop) */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-2">
            <label
              htmlFor="apel-session-filter"
              className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>Pilihan Sesi Apel:</span>
            </label>
            <NativeSelect
              id="apel-session-filter"
              value={selectedSessionId}
              onChange={(e) => {
                const newSession = e.target.value;
                setSelectedSessionId(newSession);
                setSelectedAttendance(null);
                loadData({ sessionId: newSession });
              }}
              className={cn(DC_CONTROLS.selectTrigger, "h-9 text-xs bg-slate-950 border-slate-700 text-slate-200")}
            >
              {data?.availableSessions && data.availableSessions.length > 0 ? (
                data.availableSessions.map((s) => (
                  <NativeSelectOption key={s.id} value={s.id}>
                    {s.title} ({new Date(s.sessionDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                    )
                  </NativeSelectOption>
                ))
              ) : (
                <NativeSelectOption value="">{session ? session.title : "Tidak ada sesi tersedia"}</NativeSelectOption>
              )}
            </NativeSelect>
          </div>

          {/* Filter 3: Reset Filter Action */}
          <div className="space-y-1 flex flex-col justify-end">
            <span className="text-[11px] font-semibold text-transparent select-none hidden lg:inline">Aksi</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              disabled={!isFilterActive && !selectedSessionId}
              className="h-9 border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-600 text-xs gap-1.5 w-full justify-center"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Reset Semua Filter</span>
            </Button>
          </div>
        </div>

        {/* FILTER BAR TIER 2: Filter Wilayah Berjenjang 4 Tingkat (Provinsi -> Kota/Kabupaten -> Kecamatan -> Kelurahan) */}
        <div className="mt-3 pt-3 border-t border-slate-800/60 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <MapPin className="h-3.5 w-3.5 text-blue-400" />
              <span>Filter Wilayah Penugasan (Hierarkis 4 Tingkat):</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400">Cakupan Wilayah:</span>
              <Badge
                variant="outline"
                className="border-blue-500/40 bg-blue-950/40 text-blue-300 text-[10px] px-2 py-0.5 max-w-[360px] truncate"
                title={activeAreaHierarchyLabel}
              >
                {activeAreaHierarchyLabel}
              </Badge>
              {selectedProvinceId !== "ALL" && (
                <button
                  type="button"
                  onClick={() => handleProvinceChange("ALL")}
                  className="text-[10px] text-slate-400 hover:text-rose-400 underline transition-colors cursor-pointer"
                >
                  Reset Wilayah
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Tingkat 1: Provinsi */}
            <div className="space-y-1">
              <label htmlFor="filter-provinsi" className="text-[10px] font-medium text-slate-400">
                1. Tingkat Provinsi:
              </label>
              <NativeSelect
                id="filter-provinsi"
                value={selectedProvinceId}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className={cn(DC_CONTROLS.selectTrigger, "h-8 text-xs bg-slate-950 border-slate-700 text-slate-200")}
              >
                <NativeSelectOption value="ALL">Semua Provinsi (Nasional)</NativeSelectOption>
                {provinces.map((prov) => (
                  <NativeSelectOption key={prov.id} value={prov.id}>
                    {prov.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            {/* Tingkat 2: Kota / Kabupaten */}
            <div className="space-y-1">
              <label htmlFor="filter-kota" className="text-[10px] font-medium text-slate-400">
                2. Tingkat Kota / Kabupaten:
              </label>
              <NativeSelect
                id="filter-kota"
                value={selectedRegencyId}
                onChange={(e) => handleRegencyChange(e.target.value)}
                disabled={selectedProvinceId === "ALL"}
                className={cn(
                  DC_CONTROLS.selectTrigger,
                  "h-8 text-xs bg-slate-950 border-slate-700 text-slate-200",
                  selectedProvinceId === "ALL" && "opacity-50 cursor-not-allowed",
                )}
              >
                <NativeSelectOption value="ALL">
                  {selectedProvinceId === "ALL" ? "Pilih Provinsi Dahulu" : "Seluruh Kota / Kabupaten"}
                </NativeSelectOption>
                {regenciesForSelectedProv.map((city) => (
                  <NativeSelectOption key={city.id} value={city.id}>
                    {city.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            {/* Tingkat 3: Kecamatan */}
            <div className="space-y-1">
              <label
                htmlFor="filter-kecamatan"
                className="text-[10px] font-medium text-slate-400 flex items-center justify-between"
              >
                <span>3. Tingkat Kecamatan:</span>
                {loadingDistricts && <span className="text-[9px] text-cyan-400 animate-pulse">Memuat...</span>}
              </label>
              <NativeSelect
                id="filter-kecamatan"
                value={selectedDistrictId}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={selectedRegencyId === "ALL" || loadingDistricts}
                className={cn(
                  DC_CONTROLS.selectTrigger,
                  "h-8 text-xs bg-slate-950 border-slate-700 text-slate-200",
                  (selectedRegencyId === "ALL" || loadingDistricts) && "opacity-50 cursor-not-allowed",
                )}
              >
                <NativeSelectOption value="ALL">
                  {selectedRegencyId === "ALL"
                    ? "Pilih Kota/Kab Dahulu"
                    : loadingDistricts
                      ? "Memuat Kecamatan..."
                      : "Seluruh Kecamatan"}
                </NativeSelectOption>
                {districtOptions.map((dist) => (
                  <NativeSelectOption key={dist.id} value={dist.id}>
                    {dist.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>

            {/* Tingkat 4: Kelurahan / Desa */}
            <div className="space-y-1">
              <label
                htmlFor="filter-kelurahan"
                className="text-[10px] font-medium text-slate-400 flex items-center justify-between"
              >
                <span>4. Tingkat Kelurahan / Desa:</span>
                {loadingVillages && <span className="text-[9px] text-cyan-400 animate-pulse">Memuat...</span>}
              </label>
              <NativeSelect
                id="filter-kelurahan"
                value={selectedVillageId}
                onChange={(e) => handleVillageChange(e.target.value)}
                disabled={selectedDistrictId === "ALL" || loadingVillages}
                className={cn(
                  DC_CONTROLS.selectTrigger,
                  "h-8 text-xs bg-slate-950 border-slate-700 text-slate-200",
                  (selectedDistrictId === "ALL" || loadingVillages) && "opacity-50 cursor-not-allowed",
                )}
              >
                <NativeSelectOption value="ALL">
                  {selectedDistrictId === "ALL"
                    ? "Pilih Kecamatan Dahulu"
                    : loadingVillages
                      ? "Memuat Kelurahan..."
                      : "Seluruh Kelurahan"}
                </NativeSelectOption>
                {villageOptions.map((vill) => (
                  <NativeSelectOption key={vill.id} value={vill.id}>
                    {vill.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </div>

        {/* KPI Metric Strips - 5 Kolom Lengkap */}
        {kpi && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-800/80">
            {/* Kartu 1: Target Jaring Terpilih */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-400">Target Jaring Terpilih</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1">
                <p className="text-xl font-bold font-mono text-white leading-tight">
                  {kpi.totalTarget} <span className="text-xs font-normal text-slate-500">personel</span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                  dari {kpi.totalVerifiedJarings ?? kpi.totalTarget} jaring terverifikasi
                </p>
              </div>
            </div>

            {/* Kartu 2: Pesan Blasting Terkirim */}
            <div className="flex flex-col justify-between rounded-xl border border-cyan-950/60 bg-cyan-950/20 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-cyan-400">Pesan WA Terkirim</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  <Send className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1">
                <p className="text-xl font-bold font-mono text-cyan-300 leading-tight">
                  {kpi.totalSent ?? 0}
                  <span className="text-xs font-normal text-slate-400"> / {kpi.totalTarget}</span>{" "}
                  <span className="text-xs font-semibold text-cyan-400">({kpi.deliveryPercentage ?? 0}%)</span>
                </p>
                <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                  {(kpi.totalPendingDelivery ?? 0) > 0 ? (
                    <span className="text-amber-400 font-medium">{kpi.totalPendingDelivery} antre jitter</span>
                  ) : (kpi.totalTarget > 0 ? (
                    <span className="text-emerald-400 font-medium">Semua terkirim</span>
                  ) : (
                    <span className="text-slate-500">-</span>
                  ))}
                  {(kpi.totalFailed ?? 0) > 0 && (
                    <span className="text-rose-400 font-medium">• {kpi.totalFailed} gagal</span>
                  )}
                </div>
              </div>
            </div>

            {/* Kartu 3: Sudah Hadir (GPS) */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-950/60 bg-emerald-950/20 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-emerald-400">Sudah Hadir (GPS)</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1">
                <p className="text-xl font-bold font-mono text-emerald-300 leading-tight">
                  {kpi.totalHadir}{" "}
                  <span className="text-xs font-semibold text-emerald-400">({kpi.persentaseHadir}%)</span>
                </p>
                <p className="text-[10px] text-emerald-500/90 mt-0.5">
                  {kpi.totalTarget > 0 ? `${kpi.persentaseHadir}% tingkat respon` : "Belum ada respon"}
                </p>
              </div>
            </div>

            {/* Kartu 4: Belum Hadir / Lokasi */}
            <div className="flex flex-col justify-between rounded-xl border border-rose-950/60 bg-rose-950/20 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-rose-400">Belum Hadir / Lokasi</p>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1">
                <p className="text-xl font-bold font-mono text-rose-300 leading-tight">
                  {kpi.totalBelum}{" "}
                  <span className="text-xs font-normal text-rose-400/80">
                    ({kpi.totalTarget > 0 ? Math.round((kpi.totalBelum / kpi.totalTarget) * 100) : 0}%)
                  </span>
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Menunggu konfirmasi jaring
                </p>
              </div>
            </div>

            {/* Kartu 5: Batas Waktu Absensi */}
            <div className="col-span-2 sm:col-span-1 flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-slate-400">Batas Waktu</p>
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg border shrink-0",
                    kpi.nearDeadlineCount > 0
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20",
                  )}
                >
                  <Timer className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="mt-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-bold font-mono text-white leading-tight">
                    {session?.deadlineAt
                      ? new Date(session.deadlineAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) + " WIB"
                      : "-"}
                  </p>
                  {kpi.nearDeadlineCount > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] px-1 py-0">
                      {kpi.nearDeadlineCount} Mepet
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {kpi.isDeadlinePassed ? (
                    <span className="text-rose-400">Sesi Telah Berakhir</span>
                  ) : (
                    <span className="text-emerald-400">Sisa {kpi.remainingMinutes} menit</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ALERT KHUSUS: Personel Membalas Mendekati Deadline */}
        {kpi && kpi.nearDeadlineCount > 0 && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-200 shadow-md">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
              <span>
                <strong>Perhatian:</strong> Terdeteksi <strong>{kpi.nearDeadlineCount} Personel</strong> membalas
                mendekati batas akhir waktu absensi (≤ 15 menit sebelum deadline).
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setActiveFilter("NEAR_DEADLINE");
                setSortField("NEAR_DEADLINE");
                setSortOrder("asc");
              }}
              className="h-7 text-[11px] border-amber-500/50 bg-amber-900/40 text-amber-200 hover:bg-amber-800/50 px-2.5 shrink-0"
            >
              Lihat Jaring Mendekati Batas
            </Button>
          </div>
        )}
      </header>

      {/* SECTION 1: PETA BESAR (EXPANSIVE MAP CONTAINER) */}
      <section ref={mapContainerRef} id="peta-apel-container" className="flex flex-col space-y-3">
        {/* Map Header Controls: Title & Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-bold tracking-tight text-slate-200">
              Sebaran Spasial Kehadiran Jaring Terverifikasi
            </h2>
            <span className="text-xs text-slate-500">
              ({data?.attendances?.filter((a) => a.latitude !== null && a.longitude !== null).length ?? 0} titik
              terplot)
            </span>
          </div>

          {/* MAP MODE SWITCHER */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 hidden sm:inline">
              MODE PETA:
            </span>
            <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1 shadow-inner">
              {BASE_MAP_OPTIONS.map(({ layer, label, Icon, color }) => {
                const isActive = mapLayer === layer;
                return (
                  <button
                    key={layer}
                    type="button"
                    onClick={() => setMapLayer(layer)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-slate-600 shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <Icon className="h-3.5 w-3.5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Large Map Canvas */}
        <div className="relative h-[520px] md:h-[620px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950">
          <BaseMap
            key={mapLayer}
            center={INDONESIA_CENTER}
            zoom={4.8}
            styles={mapStyles}
            onMapReady={(map) => {
              mapInstanceRef.current = map;
            }}
            className="h-full w-full"
          >
            <MapControls position="top-left" showCompass showZoom />

            {/* Render Map Markers for Jaring with verified GPS */}
            {data?.attendances?.map((item) => {
              if (item.latitude === null || item.longitude === null) return null;
              const isSelected = selectedAttendance?.id === item.id;

              return (
                <MapMarker key={item.id} longitude={item.longitude} latitude={item.latitude}>
                  <div
                    onClick={() => setSelectedAttendance(item)}
                    className={cn(
                      "relative flex items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-125",
                      isSelected && "scale-125 z-30",
                    )}
                  >
                    {item.isNearDeadline ? (
                      <span className="absolute h-6 w-6 rounded-full bg-amber-500/40 animate-ping" />
                    ) : (
                      <span className="absolute h-6 w-6 rounded-full bg-emerald-500/30 animate-ping" />
                    )}
                    <div
                      className={cn(
                        "relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg text-slate-950",
                        item.isNearDeadline
                          ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.9)]"
                          : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.9)]",
                      )}
                    >
                      <MapPin className="h-3 w-3 fill-slate-950 stroke-none" />
                    </div>
                  </div>
                </MapMarker>
              );
            })}

            {/* Popup Modal Detail Jaring */}
            {selectedAttendance && selectedAttendance.latitude !== null && selectedAttendance.longitude !== null && (
              <MapPopup
                longitude={selectedAttendance.longitude}
                latitude={selectedAttendance.latitude}
                onClose={() => setSelectedAttendance(null)}
                closeButton
                className="z-40"
              >
                <div className="p-3.5 max-w-xs text-slate-900 dark:text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-700/40 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-400">HADIR (GPS VERIFIED)</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                      {selectedAttendance.areaName}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <p className="font-semibold text-sm text-white">{selectedAttendance.aliasName}</p>
                      {selectedAttendance.fullName && (
                        <p className="text-[11px] text-slate-400">{selectedAttendance.fullName}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-400">Nomor WhatsApp:</span>
                      <span className="font-mono text-cyan-300 font-medium">{selectedAttendance.whatsappNumber}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Petugas Pembina:</span>
                      <span className="text-slate-200 font-medium">{selectedAttendance.caretaker}</span>
                    </div>

                    {/* Waktu Masuk vs Waktu Balas */}
                    {selectedAttendance.sentAt && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Pesan Masuk WA:</span>
                        <span className="font-mono text-slate-300">
                          {new Date(selectedAttendance.sentAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                      </div>
                    )}

                    {selectedAttendance.attendedAt && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Waktu Membalas:</span>
                        <span className="font-mono text-emerald-400 font-medium">
                          {new Date(selectedAttendance.attendedAt).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}{" "}
                          WIB
                        </span>
                      </div>
                    )}

                    {selectedAttendance.responseDurationFormatted && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Durasi Respon:</span>
                        <span className="font-mono font-semibold text-cyan-300">
                          {selectedAttendance.responseDurationFormatted}
                        </span>
                      </div>
                    )}

                    {selectedAttendance.isNearDeadline && (
                      <div className="rounded-md bg-amber-950/60 border border-amber-600/40 p-1.5 text-[10px] text-amber-300 font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
                        <span>
                          Dibalas mendekati batas ({selectedAttendance.minutesBeforeDeadline} mnt jelang deadline)
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
                      <span className="text-slate-400">Koordinat GPS:</span>
                      <span className="font-mono text-[10px] text-slate-300">
                        {selectedAttendance.latitude.toFixed(5)}, {selectedAttendance.longitude.toFixed(5)}
                      </span>
                    </div>

                    {/* Reply message bubble */}
                    {selectedAttendance.replyContent && (
                      <div className="mt-2 rounded-lg bg-emerald-950/50 border border-emerald-800/40 p-2">
                        <p className="text-[10px] font-semibold text-emerald-400 mb-0.5">Pesan Balasan WhatsApp:</p>
                        <p className="text-xs italic text-slate-200">&quot;{selectedAttendance.replyContent}&quot;</p>
                      </div>
                    )}
                  </div>
                </div>
              </MapPopup>
            )}
          </BaseMap>

          {/* Floating Map Legend (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-10 max-w-sm rounded-xl border border-slate-800 bg-slate-950/90 p-3.5 shadow-2xl backdrop-blur-md">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">Keterangan Peta Apel</p>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_10px_rgba(16,185,129,0.9)] shrink-0" />
                <span className="text-slate-200 font-medium">Hadir Tepat Waktu (GPS Riil)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-white shadow-[0_0_10px_rgba(245,158,11,0.9)] shrink-0" />
                <span className="text-amber-200 font-medium">Mendekati Batas Deadline (≤ 15 Menit)</span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                <span className="text-cyan-400 font-semibold">ℹ️ Validasi Spasial:</span>{" "}
                {session?.requireLocation === false ? (
                  <span>
                    Sesi ini <strong>tidak mewajibkan lokasi GPS</strong> (jaring cukup membalas teks). Personel yang
                    membalas teks tetap tercatat Hadir, dan personel yang membagikan lokasi GPS diplot pada peta ini.
                  </span>
                ) : (
                  <span>
                    Titik koordinat hanya diplot dari kiriman lokasi riil WhatsApp jaring. Personel yang belum
                    membagikan lokasi GPS tidak diplot di peta (tanpa fallback wilayah binaan).
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Floating Banner When No Active Session */}
          {!session && !loading && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 max-w-lg w-[92%] rounded-2xl border border-cyan-500/40 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-md text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-400 font-semibold text-sm mb-2">
                <Radio className="h-5 w-5 animate-pulse" />
                <span>Belum Ada Sesi Apel Aktif</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Sesi apel dibuat dan dipicu oleh Admin Sistem melalui menu <strong>Pengaturan Apel & Absensi</strong>.
                Begitu sesi dipicu, seluruh jaring terverifikasi akan menerima broadcast dan titik GPS absensi mereka
                akan langsung terpantau di peta ini.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: TABEL ABSENSI JARING (UNDERNEATH MAP) */}
      <section className="space-y-4">
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-md">
          <CardHeader className="pb-3 border-b border-slate-800/80">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  <span>Daftar Rekapitulasi Absensi Jaring</span>
                  <Badge
                    variant="outline"
                    className="border-slate-700 bg-slate-800/80 text-slate-300 font-mono text-xs ml-2"
                  >
                    Total: {filteredAndSortedAttendances.length} Personel
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Catat waktu pesan broadcast masuk, jam jaring membalas, durasi respon balasan, dan deteksi jaring yang
                  membalas mendekati deadline.
                </CardDescription>
              </div>

              {/* Status Tabs & Quick Sort & Search */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Tabs */}
                <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setActiveFilter("ALL")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                      activeFilter === "ALL"
                        ? "bg-slate-800 text-white font-semibold shadow-sm"
                        : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    Semua ({kpi?.totalTarget ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("PRESENT")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                      activeFilter === "PRESENT"
                        ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-semibold"
                        : "text-slate-400 hover:text-emerald-400",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Hadir ({kpi?.totalHadir ?? 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter("NOT_PRESENT")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                      activeFilter === "NOT_PRESENT"
                        ? "bg-rose-950/80 border border-rose-500/40 text-rose-300 font-semibold"
                        : "text-slate-400 hover:text-rose-400",
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                    Belum Hadir ({kpi?.totalBelum ?? 0})
                  </button>
                  {kpi && kpi.nearDeadlineCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter("NEAR_DEADLINE")}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer",
                        activeFilter === "NEAR_DEADLINE"
                          ? "bg-amber-950/80 border border-amber-500/40 text-amber-300 font-semibold"
                          : "text-slate-400 hover:text-amber-400",
                      )}
                    >
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      Mendekati Batas ({kpi.nearDeadlineCount})
                    </button>
                  )}
                </div>

                {/* Dropdown Quick Sort */}
                <div className="w-56">
                  <NativeSelect
                    value={quickSortPreset}
                    onChange={(e) => handleQuickSortChange(e.target.value)}
                    className={cn(
                      DC_CONTROLS.selectTrigger,
                      "h-9 text-xs bg-slate-950 border-slate-800 text-slate-200",
                    )}
                  >
                    <NativeSelectOption value="default">Urutan Standar</NativeSelectOption>
                    <NativeSelectOption value="fastest_response">Respon: Tercepat (ASC)</NativeSelectOption>
                    <NativeSelectOption value="slowest_response">Respon: Terlama (DESC)</NativeSelectOption>
                    <NativeSelectOption value="near_deadline">Mendekati Deadline Dulu</NativeSelectOption>
                    <NativeSelectOption value="attended_desc">Waktu Balas: Terbaru (DESC)</NativeSelectOption>
                    <NativeSelectOption value="attended_asc">Waktu Balas: Terlama (ASC)</NativeSelectOption>
                    <NativeSelectOption value="sent_desc">Waktu Masuk: Terbaru (DESC)</NativeSelectOption>
                    <NativeSelectOption value="sent_asc">Waktu Masuk: Terlama (ASC)</NativeSelectOption>
                    <NativeSelectOption value="name_asc">Nama Jaring (A - Z)</NativeSelectOption>
                    <NativeSelectOption value="name_desc">Nama Jaring (Z - A)</NativeSelectOption>
                  </NativeSelect>
                </div>

                {/* Search Bar */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                  <Input
                    type="text"
                    placeholder="Cari jaring, WA, pembina, wilayah..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-cyan-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!session ? (
              <div className="py-16 px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto mb-3.5">
                  <Radio className="h-7 w-7 animate-pulse" />
                </div>
                <h3 className="text-base font-bold text-white mb-1">Belum Ada Sesi Apel Aktif</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Data kehadiran dan koordinat jaring akan otomatis terisi saat Admin Sistem memicu sesi apel baru
                  melalui menu WhatsApp & Email → Pengaturan Apel & Absensi.
                </p>
              </div>
            ) : filteredAndSortedAttendances.length === 0 ? (
              <div className="py-14 px-6 text-center text-slate-500">
                <Users className="h-10 w-10 mx-auto mb-2.5 opacity-30" />
                <p className="text-sm font-semibold text-slate-300">Tidak ada data personel jaring yang sesuai</p>
                <p className="text-xs text-slate-500 mt-1">Sesuaikan kata kunci pencarian atau tab filter di atas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 bg-slate-950/60 hover:bg-slate-950/60">
                      <TableHead className="w-12 text-center text-slate-400 font-mono text-[11px]">No</TableHead>

                      {/* Header Sort: Personel Jaring */}
                      <TableHead
                        onClick={() => handleSortToggle("ALIAS_NAME")}
                        className="text-slate-300 font-mono text-[11px] cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Personel Jaring</span>
                          {sortField === "ALIAS_NAME" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-cyan-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-cyan-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </div>
                      </TableHead>

                      <TableHead className="text-slate-300 font-mono text-[11px]">Nomor WhatsApp</TableHead>
                      <TableHead className="text-slate-300 font-mono text-[11px]">Wilayah & Pembina</TableHead>

                      {/* Header Sort: Waktu Masuk WA */}
                      <TableHead
                        onClick={() => handleSortToggle("SENT_AT")}
                        className="text-slate-300 font-mono text-[11px] cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Waktu Masuk WA</span>
                          {sortField === "SENT_AT" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-cyan-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-cyan-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </div>
                      </TableHead>

                      {/* Header Sort: Waktu Balas WA */}
                      <TableHead
                        onClick={() => handleSortToggle("ATTENDED_AT")}
                        className="text-slate-300 font-mono text-[11px] cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Waktu Balas WA</span>
                          {sortField === "ATTENDED_AT" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-cyan-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-cyan-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </div>
                      </TableHead>

                      {/* Header Sort: Durasi Respon */}
                      <TableHead
                        onClick={() => handleSortToggle("RESPONSE_DURATION")}
                        className="text-slate-300 font-mono text-[11px] cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Durasi Respon</span>
                          {sortField === "RESPONSE_DURATION" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-cyan-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-cyan-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </div>
                      </TableHead>

                      {/* Header Sort: Mendekati Deadline */}
                      <TableHead
                        onClick={() => handleSortToggle("NEAR_DEADLINE")}
                        className="text-slate-300 font-mono text-[11px] cursor-pointer hover:text-white transition-colors"
                      >
                        <div className="flex items-center gap-1">
                          <span>Status Deadline</span>
                          {sortField === "NEAR_DEADLINE" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="h-3 w-3 text-cyan-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-cyan-400" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 text-slate-600" />
                          )}
                        </div>
                      </TableHead>

                      <TableHead className="text-slate-300 font-mono text-[11px]">Kehadiran Apel</TableHead>
                      <TableHead className="text-slate-300 font-mono text-[11px]">Koordinat GPS</TableHead>
                      <TableHead className="text-slate-300 font-mono text-[11px]">Pesan Balasan WA</TableHead>
                      <TableHead className="text-right text-slate-300 font-mono text-[11px] pr-4">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAttendances.map((item, index) => {
                      const isPresent = item.attendanceStatus === "PRESENT" || item.attendanceStatus === "LATE";
                      const hasLocation = item.latitude !== null && item.longitude !== null;
                      const rowIndex = (page - 1) * limit + index + 1;

                      return (
                        <TableRow
                          key={item.id}
                          className={cn(
                            "border-slate-800/80 transition-colors",
                            selectedAttendance?.id === item.id
                              ? "bg-cyan-950/30 hover:bg-cyan-950/40"
                              : item.isNearDeadline
                                ? "bg-amber-950/15 hover:bg-amber-950/25"
                                : "hover:bg-slate-800/40",
                          )}
                        >
                          <TableCell className="text-center font-mono text-xs text-slate-500">{rowIndex}</TableCell>

                          {/* Personel Jaring */}
                          <TableCell>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs tracking-tight">{item.aliasName}</span>
                                <Badge
                                  variant="outline"
                                  className="border-slate-700 bg-slate-800/60 text-slate-300 text-[9px] px-1.5 py-0"
                                >
                                  Jaring
                                </Badge>
                              </div>
                              {item.fullName && <p className="text-[11px] text-slate-400">{item.fullName}</p>}
                            </div>
                          </TableCell>

                          {/* Nomor WA */}
                          <TableCell>
                            <span className="font-mono text-xs text-cyan-400 font-medium">{item.whatsappNumber}</span>
                          </TableCell>

                          {/* Wilayah & Pembina */}
                          <TableCell>
                            <div className="space-y-0.5">
                              <p className="text-xs text-slate-300 font-medium">{item.areaName}</p>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                                <ShieldCheck className="h-3 w-3 text-blue-400 shrink-0" />
                                <span>{item.caretaker}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Waktu Masuk WA (Broadcast Sent) */}
                          <TableCell>
                            <div>
                              {item.sentAt ? (
                                <p className="font-mono text-xs text-slate-200">
                                  {new Date(item.sentAt).toLocaleTimeString("id-ID", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}{" "}
                                  WIB
                                </p>
                              ) : (
                                <span className="text-xs text-slate-600">-</span>
                              )}
                              <div className="mt-0.5">{getSentStatusBadge(item.sentStatus)}</div>
                            </div>
                          </TableCell>

                          {/* Waktu Balas WA (Absensi) */}
                          <TableCell>
                            {item.attendedAt ? (
                              <p className="font-mono text-xs text-emerald-400 font-medium">
                                {new Date(item.attendedAt).toLocaleTimeString("id-ID", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}{" "}
                                WIB
                              </p>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Belum Membalas</span>
                            )}
                          </TableCell>

                          {/* Durasi Respon Balasan */}
                          <TableCell>
                            {getResponseSpeedBadge(item.responseDurationSeconds, item.responseDurationFormatted)}
                          </TableCell>

                          {/* Status Batas Akhir / Deadline */}
                          <TableCell>
                            {item.isNearDeadline ? (
                              <Badge className="border-amber-500/50 bg-amber-950/60 text-amber-300 text-[10px] gap-1 animate-pulse">
                                <AlertTriangle className="h-3 w-3 text-amber-400" />
                                Mendekati Batas ({item.minutesBeforeDeadline} mnt)
                              </Badge>
                            ) : item.isLate ? (
                              <Badge
                                variant="outline"
                                className="border-rose-500/40 bg-rose-950/40 text-rose-300 text-[10px] gap-1"
                              >
                                <Clock className="h-3 w-3 text-rose-400" />
                                Terlambat
                              </Badge>
                            ) : isPresent ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-500/30 bg-emerald-950/30 text-emerald-400 text-[10px]"
                              >
                                Tepat Waktu
                              </Badge>
                            ) : kpi?.isDeadlinePassed ? (
                              <Badge
                                variant="outline"
                                className="border-rose-900 bg-rose-950/20 text-rose-400 text-[10px]"
                              >
                                Melewati Batas
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-500">Dalam Batas Waktu</span>
                            )}
                          </TableCell>

                          {/* Status Kehadiran Apel */}
                          <TableCell>
                            {isPresent ? (
                              hasLocation ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  Hadir (GPS)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-blue-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                                  Hadir (Teks)
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-rose-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                Belum Hadir
                              </span>
                            )}
                          </TableCell>

                          {/* Koordinat GPS */}
                          <TableCell>
                            {hasLocation ? (
                              <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-900/40">
                                {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Belum Ada Lokasi</span>
                            )}
                          </TableCell>

                          {/* Pesan Balasan */}
                          <TableCell className="max-w-xs">
                            {item.replyContent ? (
                              <p className="text-xs italic text-slate-300 truncate" title={item.replyContent}>
                                &quot;{item.replyContent}&quot;
                              </p>
                            ) : (
                              <span className="text-xs text-slate-600">-</span>
                            )}
                          </TableCell>

                          {/* Aksi: Fokuskan Peta */}
                          <TableCell className="text-right pr-4">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFocusOnMap(item)}
                              className={cn(
                                "h-8 px-2.5 text-xs transition-colors cursor-pointer",
                                hasLocation
                                  ? "text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40"
                                  : "text-slate-500 hover:text-slate-400",
                              )}
                              title={
                                hasLocation
                                  ? "Fokuskan tampilan peta ke titik jaring ini"
                                  : "Titik lokasi belum tersedia"
                              }
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              <span>Fokus Peta</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Table Pagination */}
                {filteredAndSortedAttendances.length > 0 && (
                  <TablePagination
                    page={page}
                    limit={limit}
                    total={filteredAndSortedAttendances.length}
                    onPageChange={setPage}
                    onLimitChange={(newLimit) => {
                      setLimit(newLimit);
                      setPage(1);
                    }}
                    className="border-slate-800 bg-slate-950/80"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
