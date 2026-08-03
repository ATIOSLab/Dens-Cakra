"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Eye,
  FileText,
  Filter,
  FilterX,
  ImageIcon,
  Inbox,
  Layers,
  Mail,
  MailOpen,
  MapPin,
  Maximize2,
  Minimize2,
  Radar,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Target,
  TriangleAlert,
  User,
  UserCheck,
  X,
  ZoomIn,
} from "lucide-react";

import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import {
  formatFullAreaName,
  type JaringReportSessionDetail,
  type PriorityLevel,
  type ReportCategoryOption,
  type VerificationStatus,
} from "@/app/(main)/dashboard/field-officer/laporan-jaring/_components/laporan-jaring-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EvidenceImageViewer } from "@/features/baket/components/evidence-image-viewer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type JaringOption, JaringSelectPopover } from "@/components/ui/jaring-select-popover";
import { MapControls, MapMarker, MapMarkerPopup, Map as MapView } from "@/components/ui/map";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

// ==========================================
// HELPERS & TYPES
// ==========================================

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function verificationStatusLabel(status: VerificationStatus) {
  switch (status) {
    case "IN_PROGRESS_BY_JARING":
    case "NOT_SUBMITTED":
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "Belum Diverifikasi";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "Perlu Review";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "Terverifikasi";
    case "METADATA_RECORDED":
      return "Baket Dibuat";
    default:
      return status;
  }
}

function getMediaUrl(m: any) {
  if (!m) return "";
  if (m.url && typeof m.url === "string" && m.url.startsWith("http")) return m.url;
  if (m.fileUrl && typeof m.fileUrl === "string" && m.fileUrl.startsWith("http")) return m.fileUrl;
  const fileId = m.fileId || m.id;
  return fileId ? `/api/files/${fileId}` : "";
}

function getInitials(name?: string | null) {
  if (!name) return "JAR";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function verificationStatusBadgeVariant(status: VerificationStatus) {
  switch (status) {
    case "WAITING_FIELD_OFFICER_VERIFICATION":
      return "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "NEEDS_FIELD_OFFICER_REVIEW":
      return "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400";
    case "VERIFIED_BY_FIELD_OFFICER":
      return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-[#38BDF8]";
    case "METADATA_RECORDED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400";
  }
}

function getUrgencyCardStyle(urgency?: PriorityLevel | string | null) {
  switch (urgency) {
    case "URGENT":
      return {
        border: "border-rose-500/70 dark:border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
        badge: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/50",
        markerBg: "bg-rose-600 text-white border-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.8)] animate-pulse",
        pulse: "urgent" as const,
        label: "URGENT",
      };
    case "HIGH":
      return {
        border: "border-amber-500/70 dark:border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
        badge: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50",
        markerBg: "bg-amber-500 text-slate-950 border-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.6)]",
        pulse: "high" as const,
        label: "HIGH",
      };
    case "NORMAL":
      return {
        border: "border-emerald-500/50 dark:border-emerald-500/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
        badge: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
        markerBg: "bg-emerald-600 text-white border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]",
        pulse: "normal" as const,
        label: "NORMAL",
      };
    case "LOW":
      return {
        border: "border-sky-500/50 dark:border-sky-500/60 shadow-[0_0_10px_rgba(14,165,233,0.1)]",
        badge: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40",
        markerBg: "bg-sky-500 text-white border-sky-200 shadow-[0_0_10px_rgba(14,165,233,0.4)]",
        pulse: "slow" as const,
        label: "LOW",
      };
    default:
      return {
        border: "border-slate-300 dark:border-slate-800",
        badge: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40",
        markerBg: "bg-slate-600 text-slate-100 border-slate-400 shadow-[0_0_10px_rgba(100,116,139,0.4)]",
        pulse: "normal" as const,
        label: "NORMAL",
      };
  }
}

function getTickerBadgeClass(urgency: string) {
  if (urgency === "URGENT") {
    return "border border-rose-500/40 bg-rose-500/20 text-rose-600 dark:text-rose-400";
  }
  if (urgency === "HIGH") {
    return "border border-amber-500/40 bg-amber-500/20 text-amber-600 dark:text-amber-400";
  }
  return "border border-sky-500/40 bg-sky-500/20 text-sky-600 dark:text-sky-400";
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "";
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Baru saja";
    if (diffMins < 60) return `${diffMins} mnt lalu`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} jam lalu`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} hr lalu`;
  } catch {
    return "";
  }
}

interface RawJaringItem {
  id: string;
  code: string;
  aliasName?: string | null;
  fullName?: string | null;
  registrationStatus?: string | null;
  areaCoverages?: Array<{
    isPrimary?: boolean;
    validUntil?: string | null;
    area: JaringAdministrativeArea;
  }>;
}

interface JaringAdministrativeArea {
  id: string;
  name: string;
  level: string;
  parent?: JaringAdministrativeArea | null;
}

type PaginatedReportResponse = {
  items?: JaringReportSessionDetail[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
};

type PaginatedJaringResponse = {
  items?: RawJaringItem[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
};

type ReportCategoryResponse = ReportCategoryOption[] | { items?: ReportCategoryOption[] };

type AdministrativeAreaScope = {
  areaId: string;
  code: string;
  officialCode?: string | null;
  name: string;
  level: string;
  parentAreaId?: string | null;
  parentOfficialCode?: string | null;
};

export type PeriodPreset = "ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM";

function hashInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveCoordinates(report: JaringReportSessionDetail): [number, number] {
  if (
    report.location &&
    typeof report.location.latitude === "number" &&
    typeof report.location.longitude === "number" &&
    report.location.latitude !== 0 &&
    report.location.longitude !== 0
  ) {
    return [report.location.longitude, report.location.latitude];
  }

  const hash = hashInt(report.id);
  const latOffset = ((hash % 140) - 70) * 0.007;
  const lngOffset = (((hash >> 3) % 180) - 90) * 0.008;

  const baseLat = -6.2088;
  const baseLng = 106.8456;

  return [baseLng + lngOffset, baseLat + latOffset];
}

function isRegencyLevel(level: string) {
  return level === "CITY" || level === "REGENCY" || level === "KOTA" || level === "KABUPATEN";
}

function isReadByFieldOfficer(report: JaringReportSessionDetail) {
  return report.isReadByFieldOfficer ?? report.isRead ?? Boolean(report.fieldOfficerReadAt ?? report.readAt);
}

export type MapIntelItem = {
  id: string;
  report: JaringReportSessionDetail;
  isBaket: boolean;
  coordinates: [number, number]; // [lng, lat]
  title: string;
  content: string;
  urgency: PriorityLevel | "NORMAL";
  verificationStatus: VerificationStatus;
  jaringName: string;
  jaringCode: string;
  locationName: string;
  incidentAt?: string | null;
  submittedAt: string;
  regencyId?: string | null;
  districtId?: string | null;
  villageId?: string | null;
  categoryId?: string | null;
  hasBeenRead: boolean;
};

// Mock fallback items for immediate demonstration
const SAMPLE_MOCK_REPORTS: JaringReportSessionDetail[] = [
  {
    id: "rep-demo-01",
    reportSessionId: "sess-01",
    jaringId: "jar-01",
    jaringAlias: "JARING CAKRA 01",
    jaringCode: "JCK-001",
    referenceNumber: "LAP-JKT-001",
    title: "Pemantauan Pergerakan Kelompok Terindikasi di Area Pelabuhan Tanjung Priok",
    content: "Terdeteksi aktivitas bongkar muat mencurigakan pada malam hari oleh kelompok yang tidak terdaftar.",
    verificationStatus: "METADATA_RECORDED",
    displayStatus: "METADATA_RECORDED",
    canFillMetadata: true,
    status: "CLOSED",
    urgency: "URGENT",
    createdAt: new Date().toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    isRead: true,
    location: { latitude: -6.1021, longitude: 106.8856 },
    resolvedArea: { id: "ar-1", name: "Tanjung Priok, Jakarta Utara" },
    gaswilName: "Lettu Inf Budi Santoso",
  },
  {
    id: "rep-demo-02",
    reportSessionId: "sess-02",
    jaringId: "jar-02",
    jaringAlias: "JARING GARUDA 05",
    jaringCode: "JGR-005",
    referenceNumber: "LAP-BDG-002",
    title: "Laporan Situasi Unjuk Rasa dan Kerumunan Massa di Gedung Sate",
    content: "Massa berjumlah sekitar 300 orang berkumpul dengan aman namun meningkatkan eskalasi orasi.",
    verificationStatus: "VERIFIED_BY_FIELD_OFFICER",
    displayStatus: "VERIFIED_BY_FIELD_OFFICER",
    canFillMetadata: true,
    status: "IN_PROGRESS",
    urgency: "HIGH",
    createdAt: new Date().toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isRead: false,
    location: { latitude: -6.9025, longitude: 107.6187 },
    resolvedArea: { id: "ar-2", name: "Bandung Wetan, Kota Bandung" },
    gaswilName: "Kapten Inf Ahmad Dahlan",
  },
  {
    id: "rep-demo-03",
    reportSessionId: "sess-03",
    jaringId: "jar-03",
    jaringAlias: "JARING RAJAWALI 08",
    jaringCode: "JRJ-008",
    referenceNumber: "LAP-BKS-003",
    title: "Deteksi Penyebaran Selebaran dan Propagasi Isu SARA di Kawasan Industri",
    content: "Ditemukan selebaran bernada provokatif di area kantin pekerja shift malam.",
    verificationStatus: "NEEDS_FIELD_OFFICER_REVIEW",
    displayStatus: "NEEDS_FIELD_OFFICER_REVIEW",
    canFillMetadata: false,
    status: "IN_PROGRESS",
    urgency: "HIGH",
    createdAt: new Date().toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    isRead: true,
    location: { latitude: -6.2415, longitude: 106.9924 },
    resolvedArea: { id: "ar-3", name: "Cikarang, Kab. Bekasi" },
    gaswilName: "Serka Bambang Wijaya",
  },
  {
    id: "rep-demo-04",
    reportSessionId: "sess-04",
    jaringId: "jar-04",
    jaringAlias: "JARING ELANG 02",
    jaringCode: "JEL-002",
    referenceNumber: "BAKET-BGR-004",
    title: "Baket: Pengawasan Distribusi Komoditas Pangan Jelang Hari Besar",
    content:
      "Pasokan dan stok minyak goreng terpantau stabil, tidak ditemukan indikasi penimbunan di gudang distributor utama.",
    verificationStatus: "METADATA_RECORDED",
    displayStatus: "METADATA_RECORDED",
    canFillMetadata: true,
    status: "CLOSED",
    urgency: "NORMAL",
    createdAt: new Date().toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    isRead: true,
    location: { latitude: -6.5971, longitude: 106.7996 },
    resolvedArea: { id: "ar-4", name: "Bogor Tengah, Kota Bogor" },
    gaswilName: "Mayor Inf Hendra Pratama",
  },
  {
    id: "rep-demo-05",
    reportSessionId: "sess-05",
    jaringId: "jar-05",
    jaringAlias: "JARING MERPATI 04",
    jaringCode: "JMP-004",
    referenceNumber: "LAP-TNG-005",
    title: "Verifikasi Lapangan Jalur Penyelundupan Barang Tanpa Dokumen Resmi",
    content: "Laporan jaring mengenai adanya truk tanpa pelat nomor di jalur tikus perimeter bandara.",
    verificationStatus: "WAITING_FIELD_OFFICER_VERIFICATION",
    displayStatus: "WAITING_FIELD_OFFICER_VERIFICATION",
    canFillMetadata: false,
    status: "NEW",
    urgency: "LOW",
    createdAt: new Date().toISOString(),
    submittedAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    isRead: false,
    location: { latitude: -6.1256, longitude: 106.6558 },
    resolvedArea: { id: "ar-5", name: "Benda, Kota Tangerang" },
    gaswilName: "Lettu Inf Risky Ramadhan",
  },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

export function MapsIntelijenNetworkClient() {
  const [reports, setReports] = useState<JaringReportSessionDetail[]>([]);
  const [jaringList, setJaringList] = useState<RawJaringItem[]>([]);
  const [categories, setCategories] = useState<ReportCategoryOption[]>([]);
  const [areaScopes, setAreaScopes] = useState<AdministrativeAreaScope[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // OSIRIS Zulu Live Clock
  const [zuluTime, setZuluTime] = useState<string>("");
  const [wibTime, setWibTime] = useState<string>("");

  // Map Card Ref & Fullscreen State
  const mapCardRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Map Navigation & Pitch/3D State
  const [mapCenter, setMapCenter] = useState<[number, number]>([106.8456, -6.2088]);
  const [mapZoom, setMapZoom] = useState<number>(10);
  const [mapPitch, setMapPitch] = useState<number>(0);

  // Marker Hover & Active Popup State
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // OSIRIS Floating Panel & Drawers State
  const [panelOpen, setPanelOpen] = useState(true);
  const [tickerOpen, setTickerOpen] = useState(true);

  // Unified Filter State
  const [activeTab, setActiveTab] = useState<"ALL" | "LAPORAN" | "BAKET">("ALL");
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [search, setSearch] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [readFilter, setReadFilter] = useState<"ALL" | "READ" | "UNREAD">("ALL");
  const [jaringFilter, setJaringFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Hierarchical Area Filters (Kabupaten -> Kecamatan -> Desa/Kelurahan)
  const [regencyFilter, setRegencyFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");

  // Period / Date Range Filter State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<MapIntelItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const matchingJaring = useMemo(() => {
    if (!selectedItem) return null;
    return jaringList.find(
      (j) => j.id === selectedItem.report.jaringId || j.code === selectedItem.jaringCode,
    );
  }, [selectedItem, jaringList]);

  const jaringPhotoUrl = useMemo(() => {
    if (!selectedItem) return null;
    const rep = selectedItem.report as any;
    const directPhoto =
      rep.jaringProfilePhotoUrl ||
      rep.jaringPhotoUrl ||
      (rep.jaringProfilePhotoFileId ? `/api/files/${rep.jaringProfilePhotoFileId}` : null);
    if (directPhoto) return directPhoto;

    if (matchingJaring) {
      if ((matchingJaring as any).profilePhotoUrl) return (matchingJaring as any).profilePhotoUrl;
      if ((matchingJaring as any).profilePhotoFileId)
        return `/api/files/${(matchingJaring as any).profilePhotoFileId}`;
    }

    return null;
  }, [selectedItem, matchingJaring]);

  const gaswilName = selectedItem?.report.gaswilName || "Petugas Gaswil (Wilayah)";

  const gaswilPhotoUrl = useMemo(() => {
    if (!selectedItem) return null;
    const rep = selectedItem.report as any;
    const directPhoto =
      rep.gaswilProfilePhotoUrl ||
      rep.gaswilPhotoUrl ||
      (rep.gaswilProfilePhotoFileId ? `/api/files/${rep.gaswilProfilePhotoFileId}` : null);
    if (directPhoto) return directPhoto;

    return null;
  }, [selectedItem]);

  // Live UTC+7 (WIB) Live Clock effect
  useEffect(() => {
    function updateClock() {
      const d = new Date();
      const formattedWib = new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(d);

      setZuluTime(`UTC+7 ${formattedWib}`);
      setWibTime(`${formattedWib} WIB`);
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen Change Listener
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  function toggleMapFullscreen() {
    if (!document.fullscreenElement) {
      void mapCardRef.current?.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }

  // Fetch Data
  async function fetchAllData() {
    setLoading(true);
    setLoadError(null);
    try {
      const [reportsRes, jaringRes, categoryRes, areaScopesRes] = await Promise.allSettled([
        apiBrowserFetch<PaginatedReportResponse | JaringReportSessionDetail[]>("/jaring/reports?limit=100"),
        apiBrowserFetch<PaginatedJaringResponse | RawJaringItem[]>("/jaring?limit=100"),
        apiBrowserFetch<ReportCategoryResponse>("/jaring/report-categories"),
        apiBrowserFetch<AdministrativeAreaScope[]>("/me/area-scopes", { query: { includeDescendants: true } }),
      ]);

      let fetchedReports: JaringReportSessionDetail[] = [];
      if (reportsRes.status === "fulfilled" && reportsRes.value) {
        const val = reportsRes.value;
        fetchedReports = Array.isArray(val) ? val : val.items || [];
      }

      let fetchedJaring: RawJaringItem[] = [];
      if (jaringRes.status === "fulfilled" && jaringRes.value) {
        const val = jaringRes.value;
        fetchedJaring = Array.isArray(val) ? val : val.items || [];
      }

      let fetchedCategories: ReportCategoryOption[] = [];
      if (categoryRes.status === "fulfilled" && categoryRes.value) {
        const val = categoryRes.value;
        if (Array.isArray(val)) {
          fetchedCategories = val;
        } else if (val && "items" in val && Array.isArray(val.items)) {
          fetchedCategories = val.items;
        }
      }

      let fetchedScopes: AdministrativeAreaScope[] = [];
      if (areaScopesRes.status === "fulfilled" && Array.isArray(areaScopesRes.value)) {
        fetchedScopes = areaScopesRes.value;
      }

      if (fetchedReports.length === 0) {
        fetchedReports = SAMPLE_MOCK_REPORTS;
      } else {
        const existingIds = new Set(fetchedReports.map((r) => r.id));
        for (const mock of SAMPLE_MOCK_REPORTS) {
          if (!existingIds.has(mock.id)) {
            fetchedReports.push(mock);
          }
        }
      }

      setReports(fetchedReports);
      setJaringList(fetchedJaring);
      setCategories(fetchedCategories);
      setAreaScopes(fetchedScopes);
    } catch (err) {
      console.error("Gagal memuat data maps intelijen network:", err);
      setLoadError("Terjadi kendala memuat data server. Menampilkan mode cadangan.");
      setReports(SAMPLE_MOCK_REPORTS);
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial mount fetch
  useEffect(() => {
    void fetchAllData();
  }, []);

  // Compute unified MapIntelItem list
  const allIntelItems = useMemo<MapIntelItem[]>(() => {
    return reports.map((r) => {
      const isBaket = r.verificationStatus === "METADATA_RECORDED";
      const coords = resolveCoordinates(r);
      const urgency: PriorityLevel = (r.urgency as PriorityLevel) || "NORMAL";
      const jaringName = r.jaringAlias || r.jaringCode || "Jaring Sembunyi";
      const jaringCode = r.jaringCode || "-";
      const locationName = formatFullAreaName(r.resolvedArea);
      const submittedAt = r.submittedAt || r.createdAt;
      const title = r.title || r.content?.slice(0, 60) || (isBaket ? "Baket" : "Laporan Jaring");
      const content = r.content || r.normalizedContent || "-";
      const hasBeenRead = isReadByFieldOfficer(r);

      return {
        id: r.id,
        report: r,
        isBaket,
        coordinates: coords,
        title,
        content,
        urgency,
        verificationStatus: r.verificationStatus,
        jaringName,
        jaringCode,
        locationName,
        incidentAt: r.incidentAt || r.baket?.latestVersion?.eventTime || null,
        submittedAt,
        categoryId: r.reportCategory?.id ?? null,
        hasBeenRead,
      };
    });
  }, [reports]);

  // Options for Jaring Popover
  const popoverJaringOptions: JaringOption[] = useMemo(() => {
    return jaringList.map((j) => ({
      id: j.id,
      code: j.code,
      aliasName: j.aliasName || j.code,
      fullName: j.fullName,
      registrationStatus: j.registrationStatus,
    }));
  }, [jaringList]);

  // Options for Regency / District / Village filters
  const regencyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const area of areaScopes) {
      if (isRegencyLevel(area.level)) {
        map.set(area.areaId, { id: area.areaId, name: area.name });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes]);

  const districtOptions = useMemo(() => {
    if (regencyFilter === "ALL") return [];
    const selectedRegency = areaScopes.find((a) => a.areaId === regencyFilter);
    const selectedCode = selectedRegency?.officialCode || selectedRegency?.code;

    const map = new Map<string, { id: string; name: string }>();
    for (const area of areaScopes) {
      if (area.level === "DISTRICT") {
        if (area.parentAreaId === regencyFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
          map.set(area.areaId, { id: area.areaId, name: area.name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, regencyFilter]);

  const villageOptions = useMemo(() => {
    if (districtFilter === "ALL") return [];
    const selectedDistrict = areaScopes.find((a) => a.areaId === districtFilter);
    const selectedCode = selectedDistrict?.officialCode || selectedDistrict?.code;

    const map = new Map<string, { id: string; name: string }>();
    for (const area of areaScopes) {
      if (area.level === "VILLAGE" || area.level === "URBAN_VILLAGE") {
        if (area.parentAreaId === districtFilter || (selectedCode && area.code.startsWith(`${selectedCode}.`))) {
          map.set(area.areaId, { id: area.areaId, name: area.name });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "id"));
  }, [areaScopes, districtFilter]);

  // Base filtered items (applies search, urgency, status, area, and date filters EXCEPT activeTab filter)
  const baseFilteredItems = useMemo(() => {
    const now = new Date();

    return allIntelItems.filter((item) => {
      // Text Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const refNum = (item.report.referenceNumber || "").toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchJaring = item.jaringName.toLowerCase().includes(q) || item.jaringCode.toLowerCase().includes(q);
        const matchLocation = item.locationName.toLowerCase().includes(q);
        const matchRef = refNum.includes(q);

        if (!matchTitle && !matchContent && !matchJaring && !matchLocation && !matchRef) {
          return false;
        }
      }

      // Urgency Filter
      if (urgencyFilter !== "ALL" && item.urgency !== urgencyFilter) return false;

      // Status Verifikasi Filter
      if (statusFilter !== "ALL" && item.verificationStatus !== statusFilter) return false;

      // Read Filter
      if (readFilter === "READ" && !item.hasBeenRead) return false;
      if (readFilter === "UNREAD" && item.hasBeenRead) return false;

      // Jaring Filter
      if (jaringFilter !== "ALL" && item.report.jaringId !== jaringFilter) return false;

      // Category Filter
      if (categoryFilter !== "ALL" && item.categoryId !== categoryFilter) return false;

      // Hierarchical Area Filters: Kabupaten / Kota
      if (regencyFilter !== "ALL") {
        const selectedRegency = regencyOptions.find((r) => r.id === regencyFilter);
        if (selectedRegency) {
          const regName = selectedRegency.name.toLowerCase();
          const locStr = item.locationName.toLowerCase();
          if (!locStr.includes(regName)) {
            let areaObj = item.report.resolvedArea;
            let matched = false;
            while (areaObj) {
              if (areaObj.id === regencyFilter || areaObj.name?.toLowerCase().includes(regName)) {
                matched = true;
                break;
              }
              areaObj = areaObj.parent ?? null;
            }
            if (!matched) return false;
          }
        }
      }

      // Hierarchical Area Filters: Kecamatan
      if (districtFilter !== "ALL") {
        const selectedDistrict = districtOptions.find((d) => d.id === districtFilter);
        if (selectedDistrict) {
          const distName = selectedDistrict.name.toLowerCase();
          const locStr = item.locationName.toLowerCase();
          if (!locStr.includes(distName)) {
            let areaObj = item.report.resolvedArea;
            let matched = false;
            while (areaObj) {
              if (areaObj.id === districtFilter || areaObj.name?.toLowerCase().includes(distName)) {
                matched = true;
                break;
              }
              areaObj = areaObj.parent ?? null;
            }
            if (!matched) return false;
          }
        }
      }

      // Hierarchical Area Filters: Desa / Kelurahan
      if (villageFilter !== "ALL") {
        const selectedVillage = villageOptions.find((v) => v.id === villageFilter);
        if (selectedVillage) {
          const villName = selectedVillage.name.toLowerCase();
          const locStr = item.locationName.toLowerCase();
          if (!locStr.includes(villName)) {
            let areaObj = item.report.resolvedArea;
            let matched = false;
            while (areaObj) {
              if (areaObj.id === villageFilter || areaObj.name?.toLowerCase().includes(villName)) {
                matched = true;
                break;
              }
              areaObj = areaObj.parent ?? null;
            }
            if (!matched) return false;
          }
        }
      }

      // Period Preset / Date Range Filter
      const itemTime = new Date(item.submittedAt).getTime();
      if (periodPreset === "TODAY") {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        if (itemTime < startOfDay) return false;
      } else if (periodPreset === "LAST_7_DAYS") {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
        if (itemTime < sevenDaysAgo) return false;
      } else if (periodPreset === "LAST_30_DAYS") {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 3600 * 1000;
        if (itemTime < thirtyDaysAgo) return false;
      } else if (periodPreset === "THIS_MONTH") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        if (itemTime < startOfMonth) return false;
      } else if (periodPreset === "CUSTOM") {
        if (startDate) {
          const startTimestamp = new Date(`${startDate}T00:00:00`).getTime();
          if (itemTime < startTimestamp) return false;
        }
        if (endDate) {
          const endTimestamp = new Date(`${endDate}T23:59:59`).getTime();
          if (itemTime > endTimestamp) return false;
        }
      }

      return true;
    });
  }, [
    allIntelItems,
    search,
    urgencyFilter,
    statusFilter,
    readFilter,
    jaringFilter,
    categoryFilter,
    regencyFilter,
    regencyOptions,
    districtFilter,
    districtOptions,
    villageFilter,
    villageOptions,
    periodPreset,
    startDate,
    endDate,
  ]);

  // Filtered items (syncs map markers and table rows down with activeTab filter)
  const filteredItems = useMemo(() => {
    return baseFilteredItems.filter((item) => {
      if (activeTab === "LAPORAN" && item.isBaket) return false;
      if (activeTab === "BAKET" && !item.isBaket) return false;
      return true;
    });
  }, [baseFilteredItems, activeTab]);

  // Paginated Items for Table / Grid
  const paginatedItems = useMemo(() => {
    const startIndex = (page - 1) * limit;
    return filteredItems.slice(startIndex, startIndex + limit);
  }, [filteredItems, page, limit]);

  // Metrics summary (computed from baseFilteredItems so tab counters remain accurate!)
  const metrics = useMemo(() => {
    const total = baseFilteredItems.length;
    const totalLaporan = baseFilteredItems.filter((i) => !i.isBaket).length;
    const totalBaket = baseFilteredItems.filter((i) => i.isBaket).length;
    return { total, totalLaporan, totalBaket };
  }, [baseFilteredItems]);

  // Doubled array for seamless continuous marquee loop sorted by newest submitted items
  const tickerItems = useMemo(() => {
    if (filteredItems.length === 0) return [];

    // Sort strictly by submittedAt descending (newest incoming first)
    const sorted = [...filteredItems].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
    // Take newest items (max 10 items for live ticker feed)
    const newestList = sorted.slice(0, 10);

    let list = [...newestList];
    while (list.length < 6) {
      list = [...list, ...newestList];
    }
    return list.map((item, idx) => ({
      ...item,
      tickerKey1: `tk1-${item.id}-${idx}`,
      tickerKey2: `tk2-${item.id}-${idx}`,
      relativeTime: formatRelativeTime(item.submittedAt),
    }));
  }, [filteredItems]);

  // Handler to focus map on an item
  function handleFocusOnMap(item: MapIntelItem) {
    setMapCenter(item.coordinates);
    setMapZoom(14);
    setSelectedItemId(item.id);

    const mapElement = document.getElementById("intel-map-section");
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleOpenDetail(item: MapIntelItem) {
    setSelectedItem(item);
    setDetailModalOpen(true);
  }

  function resetAllFilters() {
    setSearch("");
    setUrgencyFilter("ALL");
    setStatusFilter("ALL");
    setReadFilter("ALL");
    setJaringFilter("ALL");
    setCategoryFilter("ALL");
    setRegencyFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPeriodPreset("ALL");
    setStartDate("");
    setEndDate("");
    setActiveTab("ALL");
    setPage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 p-4 md:p-6 lg:p-8">
      {/* Dynamic Keyframe CSS for Infinite Continuous Ticker Animation */}
      <style>{`
        @keyframes ticker-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker-continuous {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker-marquee 75s linear infinite;
        }
        .animate-ticker-continuous:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* 1. HEADER */}
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard/field-coordinator">Beranda</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Maps Intelijen Network</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-extrabold font-heading text-2xl text-foreground tracking-tight md:text-3xl">
              <Radar className="size-7 animate-spin text-amber-500" style={{ animationDuration: "12s" }} />
              Maps Intelijen Network
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Sistem Pemetaan Spasial Intelijen Terpadu & Operational Intelligence Command Display.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchAllData()}
              disabled={loading}
              className="gap-2 font-semibold shadow-xs"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              {loading ? "Memuat..." : "Refresh Data"}
            </Button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-amber-700 text-sm dark:text-amber-300">
          <div className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-amber-500" />
            <span>{loadError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void fetchAllData()}>
            Coba Lagi
          </Button>
        </div>
      ) : null}

      {/* 2. OSIRIS STYLE COMMAND CENTER MAP SECTION (THEME ADAPTIVE: LIGHT & DARK MODE) */}
      <section id="intel-map-section" className="space-y-3">
        <Card
          ref={mapCardRef}
          className={cn(
            "overflow-hidden border border-border bg-card font-mono text-card-foreground shadow-2xl transition-all dark:border-amber-500/30 dark:bg-slate-950",
            isFullscreen ? "fixed inset-0 z-50 h-screen w-screen rounded-none p-0" : "relative rounded-2xl",
          )}
        >
          {/* OSIRIS TOP TACTICAL OVERLAY BAR (Theme Adaptive) */}
          <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-border border-b bg-background/95 px-4 py-2.5 backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-950/90">
            {/* Left Brand Title */}
            <div className="flex items-center gap-3">
              <div className="grid size-7 place-items-center rounded border border-amber-500/40 bg-amber-500/10 text-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)] dark:text-amber-400">
                <Target className="size-4 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-extrabold font-mono text-amber-600 text-xs uppercase tracking-wider dark:text-amber-400">
                  <span>CAKRA OSINT</span>
                  <span className="text-muted-foreground dark:text-slate-600">|</span>
                  <span className="text-foreground dark:text-slate-200">INTELLIGENCE NETWORK MAP</span>
                </div>
                <div className="font-sans text-[10px] text-muted-foreground dark:text-slate-400">
                  REAL-TIME SPATIAL MONITORING & ENTITY TRACKING
                </div>
              </div>
            </div>

            {/* Center Status Indicators */}
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              {/* Zulu Live Clock */}
              <div className="flex items-center gap-1.5 rounded border border-border bg-muted/80 px-2.5 py-1 font-bold text-foreground dark:border-amber-500/30 dark:bg-black/60 dark:text-amber-400">
                <Clock className="size-3 text-amber-500" />
                <span>{zuluTime}</span>
                <span className="text-[10px] text-muted-foreground dark:text-slate-500">({wibTime} WIB)</span>
              </div>

              {/* Live Status Chip */}
              <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 font-bold text-[10px] text-emerald-600 uppercase tracking-wider dark:text-emerald-400">
                <span className="inline-block size-2 animate-ping rounded-full bg-emerald-500" />
                STATUS: LIVE
              </div>

              {/* Tracked Entities Badge */}
              <div className="flex items-center gap-1.5 rounded border border-border bg-muted/50 px-2 py-1 font-medium text-[10px] text-muted-foreground dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                <Database className="size-3 text-sky-500" />
                <span>{filteredItems.length} ENTITIES TRACKED</span>
              </div>
            </div>

            {/* Right Map Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPanelOpen((prev) => !prev)}
                className="h-7 gap-1.5 border-amber-500/40 bg-amber-500/10 font-bold text-[11px] text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
              >
                <SlidersHorizontal className="size-3" />
                {panelOpen ? "PANEL FILTER" : "FILTER"}
                {panelOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </Button>

              <Button
                variant={isFullscreen ? "default" : "outline"}
                size="sm"
                onClick={toggleMapFullscreen}
                className="h-7 gap-1 border-border bg-background font-bold text-[11px] text-foreground hover:bg-accent dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {isFullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
                {isFullscreen ? "KELUAR" : "FULLSCREEN"}
              </Button>
            </div>
          </div>

          {/* OSIRIS LEFT VERTICAL ICON DOCK (Theme Adaptive) */}
          <div className="absolute top-16 left-3 z-30 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setPanelOpen((prev) => !prev)}
              title="Toggle Filter Matrix"
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
                panelOpen
                  ? "border-amber-400 bg-amber-500 font-bold text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                  : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
              )}
            >
              <Filter className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              title="Semua Layer Marker"
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
                activeTab === "ALL"
                  ? "border-sky-400 bg-sky-600 font-bold text-white shadow-[0_0_15px_rgba(14,165,233,0.5)]"
                  : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
              )}
            >
              <Layers className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("LAPORAN")}
              title="Hanya Laporan Jaring (Abu-abu)"
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
                activeTab === "LAPORAN"
                  ? "border-slate-300 bg-slate-600 font-bold text-white shadow-[0_0_15px_rgba(148,163,184,0.5)]"
                  : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
              )}
            >
              <FileText className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("BAKET")}
              title="Hanya Baket"
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
                activeTab === "BAKET"
                  ? "border-emerald-400 bg-emerald-600 font-bold text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                  : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
              )}
            >
              <Inbox className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setTickerOpen((prev) => !prev)}
              title="Toggle Live OSINT Ticker"
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-lg border text-foreground shadow-lg backdrop-blur-md transition-all dark:text-slate-200",
                tickerOpen
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  : "border-border bg-background/90 hover:bg-muted dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800",
              )}
            >
              <Activity className="size-4" />
            </button>
          </div>

          {/* OSIRIS MAP CANVAS CONTAINER */}
          <CardContent
            className={cn(
              "relative w-full bg-slate-900 p-0 pt-12 dark:bg-slate-950",
              isFullscreen ? "h-screen" : "h-[640px]",
            )}
          >
            <MapView center={mapCenter} zoom={mapZoom} pitch={mapPitch} className="h-full w-full">
              <MapControls position="top-right" showZoom showCompass />

              {/* Render Map Markers */}
              {filteredItems.map((item) => {
                const urgencyStyle = getUrgencyCardStyle(item.urgency);
                const isHovered = hoveredItemId === item.id;
                const isSelected = selectedItemId === item.id;
                const showPopup = isHovered || isSelected;

                return (
                  <MapMarker
                    key={item.id}
                    latitude={item.coordinates[1]}
                    longitude={item.coordinates[0]}
                    pulse={urgencyStyle.pulse}
                  >
                    {/* Marker Button with MouseEnter / MouseLeave for Instant Hover Popup */}
                    <button
                      type="button"
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onMouseLeave={() => setHoveredItemId(null)}
                      onClick={() => setSelectedItemId((prev) => (prev === item.id ? null : item.id))}
                      className={cn(
                        "grid size-8 cursor-pointer place-items-center rounded-full border-2 shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring",
                        isHovered || isSelected ? "z-50 scale-125 ring-2 ring-white" : "",
                        item.isBaket
                          ? urgencyStyle.markerBg
                          : "border-slate-300 bg-slate-600 text-slate-100 shadow-[0_0_10px_rgba(100,116,139,0.4)] dark:border-slate-400 dark:bg-slate-500",
                      )}
                      aria-label={`${item.isBaket ? "Baket" : "Laporan"} ${item.title}`}
                    >
                      {item.isBaket ? <Inbox className="size-4" /> : <FileText className="size-4" />}
                    </button>

                    {/* Pop-up Information Ringkas (Display on Cursor Hover / Click - Theme Adaptive) */}
                    {showPopup ? (
                      <MapMarkerPopup className="z-50 min-w-80 max-w-96 rounded-xl border border-border bg-popover/95 p-4 text-popover-foreground shadow-2xl backdrop-blur-xl dark:border-amber-500/30 dark:bg-slate-950/95 dark:text-slate-100">
                        <div className="space-y-3 font-sans">
                          {/* Header Badges */}
                          <div className="flex items-center justify-between gap-2 border-border border-b pb-2 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-bold text-[10px] uppercase tracking-wider",
                                  item.isBaket
                                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : "border-slate-500/40 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                                )}
                              >
                                {item.isBaket ? "BAKET" : "LAPORAN JARING"}
                              </Badge>

                              <Badge
                                variant="outline"
                                className={cn("font-extrabold text-[10px] tracking-wider", urgencyStyle.badge)}
                              >
                                {urgencyStyle.label}
                              </Badge>
                            </div>

                            <span className="font-bold font-mono text-[10px] text-amber-600 dark:text-amber-400">
                              {item.report.referenceNumber || item.jaringCode}
                            </span>
                          </div>

                          {/* Title & Preview Content */}
                          <div>
                            <h4 className="line-clamp-2 font-bold font-heading text-foreground text-sm leading-snug dark:text-slate-100">
                              {item.title}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-muted-foreground text-xs leading-relaxed dark:text-slate-400">
                              {item.content}
                            </p>
                          </div>

                          {/* Telemetry Details Grid */}
                          <dl className="grid grid-cols-2 gap-2 border-border border-t pt-2 font-mono text-[11px] dark:border-slate-800">
                            <div>
                              <dt className="text-muted-foreground dark:text-slate-500">Pelapor / Jaring</dt>
                              <dd className="truncate font-semibold text-foreground dark:text-slate-200">
                                {item.jaringName}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground dark:text-slate-500">
                                {item.isBaket ? "Status Urgensi" : "Status Verifikasi"}
                              </dt>
                              <dd className="font-medium text-foreground dark:text-slate-200 mt-0.5">
                                {item.isBaket ? (
                                  <Badge
                                    variant="outline"
                                    className={cn("font-extrabold text-[10px] tracking-wider", urgencyStyle.badge)}
                                  >
                                    {urgencyStyle.label}
                                  </Badge>
                                ) : (
                                  verificationStatusLabel(item.verificationStatus)
                                )}
                              </dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="flex items-center gap-1 font-sans text-muted-foreground dark:text-slate-500">
                                <MapPin className="size-3 text-sky-500" /> Lokasi Wilayah
                              </dt>
                              <dd className="line-clamp-1 font-medium font-sans text-foreground dark:text-slate-200">
                                {item.locationName}
                              </dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="flex items-center gap-1 font-sans text-muted-foreground dark:text-slate-500">
                                <Clock className="size-3 text-amber-500" /> Waktu Dilaporkan
                              </dt>
                              <dd className="text-amber-600 dark:text-amber-400">{formatDateTime(item.submittedAt)}</dd>
                            </div>
                          </dl>

                          {/* Popup Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={() => handleOpenDetail(item)}
                              className="w-full gap-1 bg-amber-500 font-bold font-mono text-slate-950 text-xs shadow-xs hover:bg-amber-400"
                            >
                              <Eye className="size-3.5" /> [TARGET DETAILS]
                            </Button>
                          </div>
                        </div>
                      </MapMarkerPopup>
                    ) : null}
                  </MapMarker>
                );
              })}
            </MapView>

            {/* OSIRIS INTEGRATED FLOATING FILTER DRAWER (Theme Adaptive) */}
            {panelOpen ? (
              <div
                className={cn(
                  "absolute top-16 left-14 z-40 w-80 max-w-[calc(100vw-4rem)] overflow-y-auto rounded-xl border border-border bg-popover/95 p-4 font-sans text-popover-foreground shadow-2xl backdrop-blur-xl dark:border-amber-500/30 dark:bg-slate-950/95 dark:text-slate-100",
                  isFullscreen ? "max-h-[calc(100vh-6rem)]" : "max-h-[550px]",
                )}
              >
                <div className="flex items-center justify-between border-border border-b pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Filter className="size-4 text-amber-600 dark:text-amber-400" />
                    <h3 className="font-bold font-mono text-amber-600 text-xs uppercase tracking-wider dark:text-amber-400">
                      OSINT FILTER MATRIX
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    {(search ||
                      urgencyFilter !== "ALL" ||
                      statusFilter !== "ALL" ||
                      readFilter !== "ALL" ||
                      jaringFilter !== "ALL" ||
                      categoryFilter !== "ALL" ||
                      regencyFilter !== "ALL" ||
                      districtFilter !== "ALL" ||
                      villageFilter !== "ALL" ||
                      periodPreset !== "ALL") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetAllFilters}
                        title="Reset Filter"
                        className="h-6 px-1.5 font-bold font-mono text-[10px] text-rose-500 hover:bg-rose-500/20"
                      >
                        <FilterX className="size-3" /> RESET
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPanelOpen(false)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                      aria-label="Tutup Panel Filter"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 space-y-3.5 text-xs">
                  {/* Search Input */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      SEARCH QUERY
                    </span>
                    <div className="relative">
                      <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Cari kode, judul, isi..."
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        className="h-8 border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Filter Tipe Data */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      DATA LAYER TYPE
                    </span>
                    <div className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-muted/60 p-1 font-mono text-[11px] dark:border-slate-800 dark:bg-slate-900/90">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("ALL");
                          setPage(1);
                        }}
                        className={cn(
                          "rounded py-1 text-center font-medium transition-colors",
                          activeTab === "ALL"
                            ? "bg-amber-500 font-bold text-slate-950 shadow-xs"
                            : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                      >
                        SEMUA
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("LAPORAN");
                          setPage(1);
                        }}
                        className={cn(
                          "rounded py-1 text-center font-medium transition-colors",
                          activeTab === "LAPORAN"
                            ? "bg-slate-600 font-bold text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                      >
                        LAPORAN
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("BAKET");
                          setPage(1);
                        }}
                        className={cn(
                          "rounded py-1 text-center font-medium transition-colors",
                          activeTab === "BAKET"
                            ? "bg-emerald-600 font-bold text-white shadow-xs"
                            : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                      >
                        BAKET
                      </button>
                    </div>
                  </div>

                  {/* Filter Urgensi */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      URGENCY THREAT LEVEL
                    </span>
                    <NativeSelect
                      value={urgencyFilter}
                      onChange={(e) => {
                        setUrgencyFilter(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    >
                      <option value="ALL">Semua Urgensi</option>
                      <option value="URGENT">🔴 URGENT</option>
                      <option value="HIGH">🟠 HIGH</option>
                      <option value="NORMAL">🟢 NORMAL</option>
                      <option value="LOW">🔵 LOW</option>
                    </NativeSelect>
                  </div>

                  {/* Filter Periode Waktu */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      TIME RANGE PRESET
                    </span>
                    <NativeSelect
                      value={periodPreset}
                      onChange={(e) => {
                        setPeriodPreset(e.target.value as PeriodPreset);
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    >
                      <option value="ALL">Semua Periode Waktu</option>
                      <option value="TODAY">Hari Ini</option>
                      <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                      <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                      <option value="THIS_MONTH">Bulan Ini</option>
                      <option value="CUSTOM">Rentang Tanggal Khusus</option>
                    </NativeSelect>
                  </div>

                  {/* Custom Date Range if preset is CUSTOM */}
                  {periodPreset === "CUSTOM" ? (
                    <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                      <div className="space-y-1">
                        <span className="block font-medium text-[10px] text-muted-foreground">Tgl Mulai</span>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setPage(1);
                          }}
                          className="h-7 border-input bg-background text-[11px] text-foreground dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                      <div className="space-y-1">
                        <span className="block font-medium text-[10px] text-muted-foreground">Tgl Selesai</span>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setPage(1);
                          }}
                          className="h-7 border-input bg-background text-[11px] text-foreground dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                        />
                      </div>
                    </div>
                  ) : null}

                  {/* Filter Status Verifikasi */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      VERIFICATION STATUS
                    </span>
                    <NativeSelect
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    >
                      <option value="ALL">Semua Status Verifikasi</option>
                      <option value="WAITING_FIELD_OFFICER_VERIFICATION">Belum Diverifikasi</option>
                      <option value="NEEDS_FIELD_OFFICER_REVIEW">Perlu Review</option>
                      <option value="VERIFIED_BY_FIELD_OFFICER">Terverifikasi</option>
                      <option value="METADATA_RECORDED">Baket Dibuat</option>
                    </NativeSelect>
                  </div>

                  {/* Filter Status Baca */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      READ STATUS
                    </span>
                    <NativeSelect
                      value={readFilter}
                      onChange={(e) => {
                        setReadFilter(e.target.value as "ALL" | "READ" | "UNREAD");
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    >
                      <option value="ALL">Semua Status Baca</option>
                      <option value="READ">Sudah Dibaca</option>
                      <option value="UNREAD">Belum Dibaca</option>
                    </NativeSelect>
                  </div>

                  {/* Filter Jaring Popover */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      SELECT JARING AGENT
                    </span>
                    <JaringSelectPopover
                      options={popoverJaringOptions}
                      value={jaringFilter}
                      onValueChange={(val) => {
                        setJaringFilter(val);
                        setPage(1);
                      }}
                      placeholder="Pilih Jaring..."
                      allowAllOption
                      allOptionLabel="Semua Jaring"
                      filterVerifiedOnly={false}
                      container={mapCardRef.current}
                      className="h-8 border-input bg-background text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    />
                  </div>

                  {/* Filter Kategori */}
                  <div className="space-y-1">
                    <span className="block font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-wider dark:text-slate-400">
                      REPORT CATEGORY
                    </span>
                    <NativeSelect
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setPage(1);
                      }}
                      className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                    >
                      <option value="ALL">Semua Kategori</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>

                  {/* HIERARCHICAL AREA FILTERS (Kabupaten -> Kecamatan -> Desa/Kelurahan) */}
                  <div className="space-y-2 border-border border-t pt-2.5 dark:border-slate-800">
                    <span className="block font-bold font-mono text-[10px] text-amber-600 uppercase tracking-wider dark:text-amber-400">
                      ADMINISTRATIVE GEOGRAPHY
                    </span>

                    {/* Kabupaten / Kota */}
                    <div className="space-y-1">
                      <span className="block font-medium font-mono text-[10px] text-muted-foreground">
                        Kabupaten/Kota
                      </span>
                      <NativeSelect
                        value={regencyFilter}
                        onChange={(e) => {
                          setRegencyFilter(e.target.value);
                          setDistrictFilter("ALL");
                          setVillageFilter("ALL");
                          setPage(1);
                        }}
                        className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                      >
                        <option value="ALL">Semua Kab/Kota</option>
                        {regencyOptions.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    {/* Kecamatan */}
                    <div className="space-y-1">
                      <span className="block font-medium font-mono text-[10px] text-muted-foreground">Kecamatan</span>
                      <NativeSelect
                        value={districtFilter}
                        onChange={(e) => {
                          setDistrictFilter(e.target.value);
                          setVillageFilter("ALL");
                          setPage(1);
                        }}
                        disabled={regencyFilter === "ALL"}
                        className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                      >
                        <option value="ALL">Semua Kecamatan</option>
                        {districtOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>

                    {/* Desa / Kelurahan */}
                    <div className="space-y-1">
                      <span className="block font-medium font-mono text-[10px] text-muted-foreground">
                        Desa/Kelurahan
                      </span>
                      <NativeSelect
                        value={villageFilter}
                        onChange={(e) => {
                          setVillageFilter(e.target.value);
                          setPage(1);
                        }}
                        disabled={districtFilter === "ALL"}
                        className="h-8 border-input bg-background font-mono text-foreground text-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100"
                      >
                        <option value="ALL">Semua Desa/Kelurahan</option>
                        {villageOptions.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </NativeSelect>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* OSIRIS BOTTOM FLOATING MAP CONTROLS (Theme Adaptive) */}
            <div className="absolute bottom-10 left-3 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/90 p-2 text-xs shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
              <button
                type="button"
                onClick={() => setMapPitch((prev) => (prev === 0 ? 55 : 0))}
                className={cn(
                  "rounded border px-2.5 py-1 font-bold font-mono text-[10px] uppercase transition-colors",
                  mapPitch > 0
                    ? "border-amber-400 bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    : "border-border bg-muted text-muted-foreground hover:text-foreground dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                {mapPitch > 0 ? "3D PITCH" : "2D MAP"}
              </button>

              <div className="flex items-center gap-2 border-border border-l pl-2 font-mono text-[10px] text-muted-foreground dark:border-slate-800 dark:text-slate-400">
                <span className="font-bold text-amber-600 dark:text-amber-400">CENTER:</span>
                <span>
                  {mapCenter[1].toFixed(4)}, {mapCenter[0].toFixed(4)}
                </span>
                <span className="text-muted-foreground dark:text-slate-600">|</span>
                <span className="font-bold text-sky-500">ZOOM:</span>
                <span>{mapZoom.toFixed(1)}</span>
              </div>
            </div>

            {/* OSIRIS BOTTOM LEGEND OVERLAY (Theme Adaptive) */}
            <div className="absolute right-3 bottom-10 z-20 hidden flex-wrap items-center gap-3 rounded-lg border border-border bg-background/90 p-2.5 font-mono text-[11px] shadow-xl backdrop-blur-md sm:flex dark:border-slate-800 dark:bg-slate-950/90">
              <span className="font-bold text-amber-600 uppercase dark:text-amber-400">MARKERS LEGEND:</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-slate-400" />
                <span className="font-medium text-foreground dark:text-slate-300"> Laporan </span>
              </div>
              <div className="flex items-center gap-1.5 border-border border-l pl-2 dark:border-slate-800">
                <span className="inline-block size-2.5 animate-ping rounded-full bg-rose-500" />
                <span className="font-medium text-rose-500">🔴 URGENT</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-amber-500" />
                <span className="font-medium text-amber-600 dark:text-amber-400">🟠 HIGH</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-emerald-500" />
                <span className="font-medium text-emerald-600 dark:text-emerald-400">🟢 NORMAL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block size-2.5 rounded-full bg-sky-500" />
                <span className="font-medium text-sky-500">🔵 LOW</span>
              </div>
            </div>

            {/* OSIRIS LIVE TICKER BAR AT BOTTOM (Theme Adaptive & Smooth Endless Marquee) */}
            {tickerOpen ? (
              <div className="absolute inset-x-0 bottom-0 z-20 flex items-center border-border border-t bg-background/95 px-3 py-1.5 font-mono text-foreground text-xs dark:border-slate-800 dark:bg-black/95 dark:text-slate-200">
                <div className="flex shrink-0 items-center gap-1.5 border-border border-r pr-3 font-bold text-[10px] text-amber-600 uppercase tracking-wider dark:border-slate-800 dark:text-amber-400">
                  <span className="inline-block size-2 animate-ping rounded-full bg-emerald-500" />
                  <span>LIVE</span>
                </div>

                <div className="w-full overflow-hidden whitespace-nowrap pl-3 text-[11px]">
                  {tickerItems.length > 0 ? (
                    <div className="flex animate-ticker-continuous items-center gap-8">
                      {/* Copy 1 */}
                      {tickerItems.map((item) => (
                        <button
                          type="button"
                          key={item.tickerKey1}
                          onClick={() => handleFocusOnMap(item)}
                          className="inline-flex cursor-pointer items-center gap-2 text-foreground/90 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
                        >
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-bold text-[9px] uppercase",
                              getTickerBadgeClass(item.urgency),
                            )}
                          >
                            {item.urgency}
                          </span>
                          <span className="font-semibold">{item.title}</span>
                          <span className="text-muted-foreground dark:text-slate-500">({item.locationName})</span>
                          {item.relativeTime ? (
                            <span className="rounded font-bold font-mono text-[9px] text-amber-600 dark:text-amber-400">
                              [{item.relativeTime}]
                            </span>
                          ) : null}
                        </button>
                      ))}

                      {/* Copy 2 for seamless continuous scroll */}
                      {tickerItems.map((item) => (
                        <button
                          type="button"
                          key={item.tickerKey2}
                          onClick={() => handleFocusOnMap(item)}
                          className="inline-flex cursor-pointer items-center gap-2 text-foreground/90 hover:text-amber-600 dark:text-slate-300 dark:hover:text-amber-400"
                        >
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 font-bold text-[9px] uppercase",
                              getTickerBadgeClass(item.urgency),
                            )}
                          >
                            {item.urgency}
                          </span>
                          <span className="font-semibold">{item.title}</span>
                          <span className="text-muted-foreground dark:text-slate-500">({item.locationName})</span>
                          {item.relativeTime ? (
                            <span className="rounded font-bold font-mono text-[9px] text-amber-600 dark:text-amber-400">
                              [{item.relativeTime}]
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">Tidak ada feed intelijen aktif.</span>
                  )}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* 4. TABLE / CARD GRID DISPLAY SECTION */}
      <section className="space-y-4">
        {/* Tab Selection & View Mode Header */}
        <div className="flex flex-col gap-4 border-slate-200 border-b pb-2 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab("ALL");
                setPage(1);
              }}
              className={cn(
                "rounded-t-lg border-b-2 px-3 py-1.5 font-bold text-xs transition-colors",
                activeTab === "ALL"
                  ? "border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Semua Items ({metrics.total})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("LAPORAN");
                setPage(1);
              }}
              className={cn(
                "rounded-t-lg border-b-2 px-3 py-1.5 font-bold text-xs transition-colors",
                activeTab === "LAPORAN"
                  ? "border-slate-500 bg-slate-500/10 text-slate-700 dark:text-slate-200"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Laporan Jaring ({metrics.totalLaporan})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("BAKET");
                setPage(1);
              }}
              className={cn(
                "rounded-t-lg border-b-2 px-3 py-1.5 font-bold text-xs transition-colors",
                activeTab === "BAKET"
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Baket ({metrics.totalBaket})
            </button>
          </div>

          {/* View Mode Toggle */}
          <ViewModeToggle value={viewMode} onValueChange={setViewMode} />
        </div>

        {/* Display Content */}
        {filteredItems.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <CardContent className="space-y-3">
              <Inbox className="mx-auto size-10 text-muted-foreground opacity-40" />
              <h3 className="font-bold text-base">Tidak Ada Data Ditemukan</h3>
              <p className="mx-auto max-w-md text-muted-foreground text-xs">
                Tidak ada Laporan Jaring atau Baket yang cocok dengan kriteria filter Anda saat ini.
              </p>
              <Button size="sm" variant="outline" onClick={resetAllFilters}>
                Reset Filter Pencarian
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {filteredItems.length > 0 && viewMode === "card" ? (
          /* CARD GRID VIEW */
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedItems.map((item) => {
                const urgencyStyle = getUrgencyCardStyle(item.urgency);
                const refNum = item.report.referenceNumber || item.jaringCode;

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "flex flex-col justify-between transition-all duration-200 hover:shadow-md",
                      item.isBaket ? urgencyStyle.border : "border-slate-300 dark:border-slate-700",
                    )}
                  >
                    <CardHeader className="space-y-2 p-4 pb-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Type Badge */}
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-bold text-[10px] uppercase",
                              item.isBaket
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                            )}
                          >
                            {item.isBaket ? "Baket" : "Laporan"}
                          </Badge>

                          {/* Urgency Badge */}
                          <Badge
                            variant="outline"
                            className={cn("font-extrabold text-[10px] tracking-wider", urgencyStyle.badge)}
                          >
                            {urgencyStyle.label}
                          </Badge>

                          {/* Ref code */}
                          <span className="rounded bg-slate-100 px-2 py-0.5 font-medium font-mono text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-300">
                            {refNum}
                          </span>
                        </div>

                        {!item.isBaket && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 px-2 py-0.5 font-medium text-[10px]",
                              verificationStatusBadgeVariant(item.verificationStatus),
                            )}
                          >
                            {verificationStatusLabel(item.verificationStatus)}
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="line-clamp-2 font-bold font-heading text-foreground text-sm leading-snug">
                          {item.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">{item.content}</p>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 p-4 pt-2">
                      <div className="space-y-2 border-slate-100 border-t pt-2 text-muted-foreground text-xs dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">Jaring: {item.jaringName}</span>
                          <span className="flex items-center gap-1">
                            {item.hasBeenRead ? (
                              <MailOpen className="size-3 text-slate-400" />
                            ) : (
                              <Mail className="size-3 text-amber-500" />
                            )}
                            {item.hasBeenRead ? "Dibaca" : "Belum Dibaca"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex max-w-[200px] items-center gap-1 truncate">
                            <MapPin className="size-3 shrink-0 text-sky-500" />
                            <span className="truncate">{item.locationName}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 font-mono">
                            <Clock className="size-3 text-amber-500" />
                            {formatDateTime(item.submittedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFocusOnMap(item)}
                          className="h-8 flex-1 gap-1 border-sky-500/40 font-semibold text-sky-600 text-xs hover:bg-sky-500/10 dark:text-sky-400"
                        >
                          <MapPin className="size-3.5" /> Fokus Peta
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenDetail(item)}
                          className="h-8 flex-1 gap-1 bg-primary font-bold text-primary-foreground text-xs shadow-xs"
                        >
                          <Eye className="size-3.5" /> Detail
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <TablePagination
              page={page}
              total={filteredItems.length}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        ) : null}

        {filteredItems.length > 0 && viewMode === "table" ? (
          /* TABLE VIEW */
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-card shadow-xs dark:border-white/10">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-white/5">
                  <TableRow>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Ref / Kode</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Tipe</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Judul & Isi Laporan</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Pelapor / Jaring</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider">Urgensi</TableHead>
                    <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                      Status Verifikasi
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Wilayah</TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">Waktu Masuk</TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map((item) => {
                    const urgencyStyle = getUrgencyCardStyle(item.urgency);
                    const refNum = item.report.referenceNumber || item.jaringCode;

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                        <TableCell className="font-mono font-semibold text-xs">
                          <div>{refNum}</div>
                          <div className="font-normal text-[10px] text-muted-foreground">ID: {item.id.slice(0, 8)}</div>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-bold text-[10px] uppercase",
                              item.isBaket
                                ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                            )}
                          >
                            {item.isBaket ? "Baket" : "Laporan"}
                          </Badge>
                        </TableCell>

                        <TableCell className="max-w-[280px]">
                          <p className="line-clamp-1 font-semibold text-foreground text-xs">{item.title}</p>
                          <p className="line-clamp-1 text-[11px] text-muted-foreground">{item.content}</p>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="font-semibold text-foreground">{item.jaringName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{item.jaringCode}</div>
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn("font-extrabold text-[10px] tracking-wider", urgencyStyle.badge)}
                          >
                            {urgencyStyle.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          {item.isBaket ? (
                            <span className="text-xs text-muted-foreground font-mono">-</span>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "px-2 py-0.5 font-medium text-[10px]",
                                verificationStatusBadgeVariant(item.verificationStatus),
                              )}
                            >
                              {verificationStatusLabel(item.verificationStatus)}
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="max-w-[180px] text-xs">
                          <span className="line-clamp-1">{item.locationName}</span>
                        </TableCell>

                        <TableCell className="whitespace-nowrap font-mono text-muted-foreground text-xs">
                          {formatDateTime(item.submittedAt)}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleFocusOnMap(item)}
                              title="Fokus Peta"
                              className="size-8 p-0 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400"
                            >
                              <MapPin className="size-4" />
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenDetail(item)}
                              title="Lihat Detail Ringkas"
                              className="size-8 p-0 font-bold"
                            >
                              <Eye className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <TablePagination
              page={page}
              total={filteredItems.length}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
            />
          </div>
        ) : null}
      </section>

      {/* 5. DETAIL PREVIEW DIALOG MODAL */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-h-[90vh] w-full max-w-3xl md:max-w-4xl overflow-y-auto p-6 font-sans sm:p-7">
          {selectedItem ? (
            <div className="space-y-6">
              {/* Header Info */}
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-bold text-xs uppercase",
                        selectedItem.isBaket
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "border-slate-400 bg-slate-500/20 text-slate-700 dark:text-slate-300",
                      )}
                    >
                      {selectedItem.isBaket ? "BAKET" : "LAPORAN JARING"}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={cn(
                        "font-extrabold text-xs tracking-wider",
                        getUrgencyCardStyle(selectedItem.urgency).badge,
                      )}
                    >
                      {selectedItem.urgency}
                    </Badge>
                  </div>

                  <span className="font-bold font-mono text-muted-foreground text-xs">
                    {selectedItem.report.referenceNumber || selectedItem.jaringCode}
                  </span>
                </div>

                <DialogTitle className="mt-2 font-extrabold font-heading text-xl leading-snug">
                  {selectedItem.title}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs">
                  ID Sesi: {selectedItem.id} • Masuk pada {formatDateTime(selectedItem.submittedAt)}
                </DialogDescription>
              </DialogHeader>

              {/* Jaring & Petugas Gaswil Profile Cards */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
                {/* Jaring Profile */}
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border-2 border-sky-500/40 shadow-xs shrink-0 overflow-hidden rounded-full">
                    {jaringPhotoUrl ? (
                      <AvatarImage src={jaringPhotoUrl} alt={selectedItem.jaringName} className="object-cover size-full" />
                    ) : null}
                    <AvatarFallback className="bg-sky-600 font-extrabold text-white text-xs">
                      {getInitials(selectedItem.jaringName || selectedItem.jaringCode)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground truncate">{selectedItem.jaringName}</span>
                      <Badge variant="outline" className="font-mono text-[10px] bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30">
                        {selectedItem.jaringCode}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <User className="size-3 text-sky-500 shrink-0" /> Pelapor / Personel Jaring
                    </p>
                  </div>
                </div>

                {/* Petugas Gaswil */}
                <div className="flex items-center gap-3 border-t pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  <Avatar className="size-12 border-2 border-emerald-500/40 shadow-xs shrink-0 overflow-hidden rounded-full">
                    {gaswilPhotoUrl ? (
                      <AvatarImage src={gaswilPhotoUrl} alt={gaswilName} className="object-cover size-full" />
                    ) : null}
                    <AvatarFallback className="bg-emerald-600 font-extrabold text-white text-xs">
                      {getInitials(gaswilName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-sm text-foreground block truncate">
                      {gaswilName}
                    </span>
                    <p className="text-muted-foreground text-xs flex items-center gap-1">
                      <UserCheck className="size-3 text-emerald-500 shrink-0" /> Petugas Wilayah
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Content Box */}
              <div className="space-y-2">
                <h4 className="font-bold text-muted-foreground text-xs uppercase tracking-wider">
                  Isi Laporan / Informasi Intelijen
                </h4>
                <div className="whitespace-pre-wrap rounded-xl border bg-muted/40 p-4 font-sans text-sm leading-relaxed">
                  {selectedItem.content}
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div className="grid grid-cols-2 gap-4 rounded-xl border bg-card p-4 text-xs sm:grid-cols-4">
                <div>
                  <dt className="font-medium text-muted-foreground">
                    {selectedItem.isBaket ? "Status Urgensi" : "Status Verifikasi"}
                  </dt>
                  <dd className="mt-1">
                    {selectedItem.isBaket ? (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-extrabold text-xs tracking-wider",
                          getUrgencyCardStyle(selectedItem.urgency).badge,
                        )}
                      >
                        {selectedItem.urgency || "NORMAL"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold text-xs",
                          verificationStatusBadgeVariant(selectedItem.verificationStatus),
                        )}
                      >
                        {verificationStatusLabel(selectedItem.verificationStatus)}
                      </Badge>
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-muted-foreground">Nomor Referensi</dt>
                  <dd className="mt-1 font-bold font-mono text-foreground">
                    {selectedItem.report.referenceNumber || selectedItem.jaringCode || selectedItem.id}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-muted-foreground">Waktu Kejadian</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatDateTime(
                      selectedItem.incidentAt ||
                        selectedItem.report.incidentAt ||
                        selectedItem.report.baket?.latestVersion?.eventTime,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="font-medium text-muted-foreground">Waktu Dilaporkan</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatDateTime(selectedItem.submittedAt)}
                  </dd>
                </div>

                <div className="col-span-2 sm:col-span-4 border-t pt-3">
                  <dt className="flex items-center gap-1 font-medium text-muted-foreground">
                    <MapPin className="size-3.5 text-sky-500" /> Lokasi Cakupan Wilayah
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground">{selectedItem.locationName}</dd>
                </div>
              </div>

              {/* Media Attachments using EvidenceImageViewer (sama seperti di Detail Laporan) */}
              {selectedItem.report.media && selectedItem.report.media.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="flex items-center gap-1.5 font-bold text-muted-foreground text-xs uppercase tracking-wider">
                    <ImageIcon className="size-4 text-amber-500" /> Lampiran Dokumentasi & Foto (
                    {selectedItem.report.media.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-3 rounded-lg border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/40">
                    {selectedItem.report.media.map((media) => {
                      const fileId = media.fileId || media.id;
                      const srcUrl = media.url || media.fileUrl || `/api/files/${fileId}`;
                      return (
                        <div
                          key={media.id || fileId}
                          className="rounded-lg border border-slate-200/80 dark:border-white/10 bg-card overflow-hidden shadow-2xs space-y-2 p-2"
                        >
                          <EvidenceImageViewer
                            src={srcUrl}
                            alt={media.fileName || "Lampiran Media"}
                            fileName={media.fileName || "Foto Lampiran"}
                            caption={media.caption}
                          />
                          <div className="px-1 text-[11px] font-mono text-muted-foreground truncate">
                            {media.fileName || "Foto Lampiran"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* Dialog Actions */}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetailModalOpen(false);
                    handleFocusOnMap(selectedItem);
                  }}
                  className="w-full gap-2 border-sky-500/40 font-semibold text-sky-600 text-xs hover:bg-sky-500/10 sm:w-auto dark:text-sky-400"
                >
                  <MapPin className="size-4" /> Lihat Lokasi di Peta
                </Button>

                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDetailModalOpen(false)}
                    className="w-full font-semibold text-xs sm:w-auto"
                  >
                    Tutup
                  </Button>

                  <Button
                    asChild
                    size="sm"
                    className="w-full gap-2 bg-primary font-bold text-primary-foreground text-xs shadow-xs sm:w-auto"
                  >
                    <Link
                      href={
                        selectedItem.isBaket
                          ? "/dashboard/field-coordinator/baket"
                          : `/dashboard/field-coordinator/laporan-jaring/${selectedItem.id}`
                      }
                    >
                      <Eye className="size-4" /> Buka Halaman Lengkap
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
