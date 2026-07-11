"use client";

import type { ElementType, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap, Marker } from "leaflet";
import Link from "next/link";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Crosshair,
  ExternalLink,
  FileText,
  Forward,
  Image as ImageIcon,
  MapPin,
  MessageSquare,
  Navigation,
  Radio,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { FieldOfficerWhatsappPanel, WhatsappLocationsView } from "./field-officer-whatsapp-panel";

let leafletModulePromise: Promise<typeof import("leaflet")> | null = null;

function loadLeafletModule() {
  leafletModulePromise ??= import("leaflet");
  return leafletModulePromise;
}

export type WorkTab = "home" | "tasks" | "baket" | "whatsapp" | "report-map" | "live-location" | "alert";
type IncomingStatus = "Routed" | "Under Validation" | "Valid" | "Invalid" | "Converted" | "Closed";
type LiveLocationStatus = "idle" | "loading" | "ready" | "denied" | "unavailable" | "error";

interface NavItem {
  children?: Array<{
    href: string;
    id: WorkTab;
    label: string;
    icon: ElementType;
  }>;
  href: string;
  icon: ElementType;
  id: WorkTab | "location-group";
  label: string;
}

interface FieldOfficer {
  id: string;
  name: string;
  title: string;
  sector: string;
  commander: string;
}

interface FieldTask {
  id: string;
  title: string;
  commander: string;
  area: string;
  priority: "High" | "Medium";
  due: string;
  status: "In Progress" | "Pending" | "Completed";
  sourceDirective: string;
}

interface JaringSource {
  id: string;
  sourceCode: string;
  alias: string;
  area: string;
  reliability: "A" | "B" | "C";
  active: boolean;
}

interface IncomingInformation {
  id: string;
  reportId: number;
  sourceCode: string;
  receivedAt: string;
  area: string;
  summary: string;
  status: IncomingStatus;
}

interface LocationPin {
  id: number;
  sourceCode: string;
  submitter: string;
  area: string;
  latitude: number;
  longitude: number;
  status: IncomingStatus;
  createdAt: string;
}

interface FieldOfficerWorkspacePayload {
  fieldOfficer: FieldOfficer;
  jaring: JaringSource[];
  tasks: FieldTask[];
  forwardedTaskIds?: string[];
  incomingItems: IncomingInformation[];
  baketItems: unknown[];
  locationPins: LocationPin[];
}

interface WhatsappReport {
  category?: string | null;
  cluster?: string | null;
  id: number;
  whatsappId: string;
  pushName?: string | null;
  title?: string | null;
  content: string;
  photoUrl?: string | null;
  locationLatitude?: number | null;
  locationLongitude?: number | null;
  locationLivePeriod?: number | null;
  status?: string | null;
  informationStatus?: string | null;
  baketId?: string | number | null;
  closedAt?: string | null;
  occurredAt?: string | null;
  createdAt: string;
}

interface WhatsappAllowedUser {
  id: number;
  whatsappId: string;
  name?: string | null;
  role: "FIELD_OFFICER" | "JARING";
}

interface LiveLocationState {
  accuracy?: number | null;
  altitude?: number | null;
  error?: string;
  heading?: number | null;
  latitude?: number;
  longitude?: number;
  speed?: number | null;
  status: LiveLocationStatus;
  timestamp?: number;
}

interface FieldOfficerLiveLocation {
  accuracy?: number | null;
  altitude?: number | null;
  capturedAt?: string | null;
  createdAt?: string | null;
  fieldOfficerId: string;
  fieldOfficerName?: string | null;
  hasGpsLocation?: boolean;
  heading?: number | null;
  id: number;
  latitude: number;
  locationStatus?: "LIVE" | "MISSING_GPS";
  longitude: number;
  sector?: string | null;
  source?: string | null;
  speed?: number | null;
  title?: string | null;
  updatedAt?: string | null;
}

const backendPublicUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");

const tabs: NavItem[] = [
  { id: "home", label: "Beranda", href: "/dashboard/field-officer/BERANDA", icon: ShieldCheck },
  { id: "tasks", label: "Tugas Saya", href: "/dashboard/field-officer/tugas-saya", icon: ClipboardCheck },
  { id: "baket", label: "BAKET", href: "/dashboard/field-officer/BAKET", icon: FileText },
  { id: "whatsapp", label: "WhatsApp", href: "/dashboard/field-officer/WHATSAPP", icon: MessageSquare },
  {
    id: "location-group",
    label: "Location",
    href: "/dashboard/field-officer/REPORT-MAP",
    icon: MapPin,
    children: [
      { id: "report-map", label: "Report Map", href: "/dashboard/field-officer/REPORT-MAP", icon: MapPin },
      { id: "live-location", label: "Live Location", href: "/dashboard/field-officer/LIVE-LOCATION", icon: Crosshair },
    ],
  },
  { id: "alert", label: "Alert", href: "/dashboard/field-officer/ALERT", icon: AlertTriangle },
];

async function fieldOfficerApi<T>(fieldOfficerId: string, path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);
  headers.set("x-field-officer-id", fieldOfficerId);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const response = await fetch(path, { ...options, headers });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || `Request gagal (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function FieldOfficerWorkspace({
  fieldOfficerId,
  initialTab = "home",
}: {
  fieldOfficerId: string;
  initialTab?: WorkTab;
}) {
  const [activeTab, setActiveTab] = useState<WorkTab>(initialTab);
  const [workspace, setWorkspace] = useState<FieldOfficerWorkspacePayload | null>(null);
  const [reportItems, setReportItems] = useState<WhatsappReport[]>([]);
  const [waUsers, setWaUsers] = useState<WhatsappAllowedUser[]>([]);
  const [liveLocation, setLiveLocation] = useState<LiveLocationState>({ status: "idle" });
  const [liveLocations, setLiveLocations] = useState<FieldOfficerLiveLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
  const [navigationExpanded, setNavigationExpanded] = useState(true);
  const [panicSent, setPanicSent] = useState(false);

  useEffect(() => {
    window.sessionStorage.setItem("dens-cakra-field-officer-id", fieldOfficerId);
  }, [fieldOfficerId]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadWorkspace = useCallback(async () => {
    try {
      const [data, reports, users] = await Promise.all([
        fieldOfficerApi<FieldOfficerWorkspacePayload>(fieldOfficerId, "/api/field-officer/workspace"),
        fieldOfficerApi<WhatsappReport[]>(fieldOfficerId, "/api/whatsapp/reports"),
        fieldOfficerApi<WhatsappAllowedUser[]>(fieldOfficerId, "/api/whatsapp/users").catch(() => [] as WhatsappAllowedUser[]),
      ]);
      setWorkspace(data);
      setReportItems(reports);
      setWaUsers(users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat workspace Field Officer");
    } finally {
      setLoading(false);
    }
  }, [fieldOfficerId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    window.addEventListener("focus", loadWorkspace);
    return () => window.removeEventListener("focus", loadWorkspace);
  }, [loadWorkspace]);

  const loadLiveLocations = useCallback(async () => {
    try {
      const data = await fieldOfficerApi<FieldOfficerLiveLocation[]>(
        fieldOfficerId,
        "/api/field-officer/live-locations",
      );
      setLiveLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat live location Field Officer");
    }
  }, [fieldOfficerId]);

  const publishLiveLocation = useCallback(
    async (position: GeolocationPosition) => {
      const currentLocation: LiveLocationState = {
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        speed: position.coords.speed,
        status: "ready",
        timestamp: position.timestamp,
      };

      setLiveLocation(currentLocation);

      const saved = await fieldOfficerApi<FieldOfficerLiveLocation>(
        fieldOfficerId,
        "/api/field-officer/live-locations",
        {
          method: "POST",
          body: JSON.stringify({
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            capturedAt: new Date(position.timestamp).toISOString(),
            fieldOfficerId: workspace?.fieldOfficer.id || fieldOfficerId,
            fieldOfficerName: workspace?.fieldOfficer.name || "Field Officer",
            heading: position.coords.heading,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            sector: workspace?.fieldOfficer.sector,
            source: "browser",
            speed: position.coords.speed,
            title: workspace?.fieldOfficer.title,
          }),
        },
      );

      setLiveLocations((current) => {
        const otherLocations = current.filter((item) => item.fieldOfficerId !== saved.fieldOfficerId);
        return [saved, ...otherLocations].sort(
          (a, b) => getLocationTime(b) - getLocationTime(a),
        );
      });
      setError(null);
    },
    [fieldOfficerId, workspace?.fieldOfficer],
  );

  const handleLiveLocationError = useCallback((geoError: GeolocationPositionError) => {
    const status: LiveLocationStatus = geoError.code === geoError.PERMISSION_DENIED ? "denied" : "error";
    setLiveLocation({
      status,
      error:
        status === "denied"
          ? "Izin lokasi ditolak oleh browser. Aktifkan permission lokasi untuk melihat posisi live."
          : geoError.message || "Lokasi Field Officer belum bisa dibaca.",
    });
  }, []);

  const requestLiveLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLiveLocation({
        status: "unavailable",
        error: "Browser/perangkat ini belum mendukung Geolocation API.",
      });
      return;
    }

    setLiveLocation((current) => ({
      ...current,
      status: current.status === "ready" ? "ready" : "loading",
      error: undefined,
    }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        publishLiveLocation(position).catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Gagal menyimpan live location Field Officer");
        });
      },
      handleLiveLocationError,
      {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 15_000,
      },
    );
  }, [handleLiveLocationError, publishLiveLocation]);

  useEffect(() => {
    loadLiveLocations();
  }, [loadLiveLocations]);

  useEffect(() => {
    void loadLeafletModule();
  }, []);

  useEffect(() => {
    if (!workspace) return;

    requestLiveLocation();
    const interval = window.setInterval(() => {
      requestLiveLocation();
      loadLiveLocations();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [loadLiveLocations, requestLiveLocation, workspace]);

  const validateReport = async (id: number, decision: "VERIFIED" | "INVALID") => {
    try {
      await fieldOfficerApi(fieldOfficerId, `/api/whatsapp/reports/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: decision }),
      });
      await loadWorkspace();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memproses laporan Jaring");
    }
  };

  const updateTaskStatus = async (id: string, status: FieldTask["status"]) => {
    try {
      setTaskActionLoading(`status:${id}`);
      await fieldOfficerApi(fieldOfficerId, `/api/field-officer/tasks/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status tugas");
    } finally {
      setTaskActionLoading(null);
    }
  };

  const forwardTask = async (id: string) => {
    try {
      setTaskActionLoading(`forward:${id}`);
      await fieldOfficerApi(fieldOfficerId, `/api/field-officer/tasks/${id}/forward`, { method: "POST" });
      await loadWorkspace();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal forward tugas");
    } finally {
      setTaskActionLoading(null);
    }
  };

  const selectTab = (tab: WorkTab) => {
    setActiveTab(tab);
  };

  const openReportFromLocation = (_reportId: number) => {
    selectTab("baket");
  };

  const activeTasks = workspace?.tasks.filter((task) => task.status !== "Completed").length ?? 0;
  const waitingIncoming = reportItems.filter((item) => getReportBaketStatus(item) === "Pending").length;
  const draftBaket = reportItems.filter((item) => getReportBaketStatus(item) === "Verified").length;
  const closedReports = reportItems.filter((item) => getReportBaketStatus(item) === "Invalid").length;
  const locationTabActive = activeTab === "report-map" || activeTab === "live-location";
  const gpsStatus = getLiveLocationStatusLabel(liveLocation);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200">
      <div className="flex min-h-screen w-full">
        <aside
          className={`fixed top-0 bottom-0 left-0 z-40 hidden shrink-0 border-slate-800 border-r bg-slate-950/95 transition-all duration-300 lg:flex lg:flex-col ${
            navigationExpanded ? "w-64" : "w-20"
          }`}
        >
          <div className="flex h-20 items-center justify-between border-slate-800 border-b px-4">
            {navigationExpanded && (
              <div>
                <p className="font-semibold text-cyan-300 text-[10px] uppercase tracking-widest">DENS CAKRA</p>
                <p className="mt-1 font-bold text-slate-50 text-sm uppercase">Field Officer</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setNavigationExpanded((value) => !value)}
              className="ml-auto inline-flex size-10 items-center justify-center rounded-md border border-slate-800 text-slate-300 hover:border-cyan-400/60 hover:text-cyan-200"
              aria-label={navigationExpanded ? "Collapse navigation" : "Expand navigation"}
            >
              {navigationExpanded ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isLocationGroup = tab.id === "location-group";
              const isActive = isLocationGroup ? locationTabActive : activeTab === tab.id;
              return (
                <div key={tab.id}>
                  <Link
                    href={tab.href}
                    onClick={() => selectTab(isLocationGroup ? "report-map" : (tab.id as WorkTab))}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 font-semibold text-xs uppercase tracking-wide transition ${
                      isActive
                        ? "bg-cyan-400 text-slate-950"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
                    } ${navigationExpanded ? "justify-start" : "justify-center"}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {navigationExpanded && <span>{tab.label}</span>}
                  </Link>
                  {navigationExpanded && tab.children && isActive && (
                    <div className="mt-1 ml-5 space-y-1 border-slate-800 border-l pl-3">
                      {tab.children.map((child) => {
                        const ChildIcon = child.icon;
                        const childActive = activeTab === child.id;

                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            onClick={() => selectTab(child.id)}
                            className={`flex min-h-9 w-full items-center gap-2 rounded-md px-3 font-semibold text-[11px] uppercase tracking-wide transition ${
                              childActive
                                ? "bg-slate-800 text-cyan-200"
                                : "text-slate-500 hover:bg-slate-900 hover:text-slate-200"
                            }`}
                          >
                            <ChildIcon className="size-3.5 shrink-0" />
                            <span>{child.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <div
          className={`mx-auto flex min-h-screen min-w-0 flex-1 flex-col px-4 py-4 transition-[margin] duration-300 sm:px-6 lg:px-8 ${
            navigationExpanded ? "lg:ml-64" : "lg:ml-20"
          }`}
        >
        <header className="flex flex-col gap-4 border-slate-800 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-semibold text-cyan-300 text-xs uppercase tracking-widest">DENS CAKRA FIELD</p>
            <h1 className="font-bold text-2xl text-slate-50 uppercase tracking-wide">Field Officer Workspace</h1>
            <p className="max-w-2xl text-slate-400 text-sm">
              {workspace
                ? `${workspace.fieldOfficer.name} / ${workspace.fieldOfficer.title} / ${workspace.fieldOfficer.sector}`
                : "Memuat profil Field Officer..."}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <StatusChip label="Online" value="Secure" tone="emerald" />
            <StatusChip label="GPS" value={gpsStatus} tone={liveLocation.status === "ready" ? "cyan" : "amber"} />
            <StatusChip label="Sync" value={loading ? "..." : "Live"} tone="amber" />
          </div>
        </header>

        {error && (
          <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-red-100 text-sm">
            {error}
          </div>
        )}

        {!locationTabActive && (
          <section className="grid gap-2 py-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricTile icon={ClipboardCheck} label="Tugas Aktif" value={activeTasks.toString()} tone="cyan" />
            <MetricTile icon={Radio} label="Laporan Pending" value={waitingIncoming.toString()} tone="amber" />
            <MetricTile icon={FileText} label="Draft BAKET" value={draftBaket.toString()} tone="emerald" />
            <MetricTile icon={AlertTriangle} label="Ditutup" value={closedReports.toString()} tone="red" />
          </section>
        )}

          <section className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            {loading && <LoadingPanel />}
            {!loading && workspace && activeTab === "home" && <HomePanel workspace={workspace} reports={reportItems} />}
            {!loading && workspace && activeTab === "tasks" && (
              <TasksPanel
                fieldOfficer={workspace.fieldOfficer}
                tasks={workspace.tasks}
                forwardedTaskIds={workspace.forwardedTaskIds || []}
                actionLoading={taskActionLoading}
                onForward={forwardTask}
              />
            )}
            {!loading && workspace && activeTab === "baket" && (
              <BaketPanel
                reports={reportItems}
                waUsers={waUsers}
                onInvalid={(id) => validateReport(id, "INVALID")}
                onVerify={(id) => validateReport(id, "VERIFIED")}
              />
            )}
            {!loading && activeTab === "whatsapp" && <FieldOfficerWhatsappPanel fieldOfficerId={fieldOfficerId} />}
            {!loading && activeTab === "report-map" && (
              <WhatsappLocationsView fieldOfficerId={fieldOfficerId} onOpenReport={openReportFromLocation} />
            )}
            {!loading && activeTab === "live-location" && (
              <LiveLocationPanel
                fieldOfficer={workspace?.fieldOfficer}
                location={liveLocation}
                locations={liveLocations}
                onRefresh={requestLiveLocation}
              />
            )}
            {!loading && activeTab === "alert" && (
              <AlertPanel panicSent={panicSent} onSend={() => setPanicSent(true)} fieldOfficer={workspace?.fieldOfficer} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function LoadingPanel() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center text-center">
      <RefreshCw className="size-8 animate-spin text-cyan-300" />
      <p className="mt-3 font-semibold text-slate-300">Memuat data Field Officer dari backend...</p>
    </div>
  );
}

function LiveLocationPanel({
  fieldOfficer,
  location,
  locations,
  onRefresh,
}: {
  fieldOfficer?: FieldOfficer;
  location: LiveLocationState;
  locations: FieldOfficerLiveLocation[];
  onRefresh: () => void;
}) {
  const hasLocation = location.status === "ready" && location.latitude != null && location.longitude != null;
  const activeLocations = locations.filter((item) => hasPublishedGps(item) && !isLiveLocationStale(item));
  const currentFieldOfficerLocation = locations.find((item) => item.fieldOfficerId === fieldOfficer?.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-slate-800 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
        <PanelHeader icon={Crosshair} title="Live Location" />
        <Button
          type="button"
          variant="outline"
          className="group relative overflow-hidden gap-2 border-cyan-300/40 !bg-slate-950 font-bold text-cyan-100 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)] hover:border-cyan-200 hover:!bg-cyan-300/10 hover:text-cyan-50"
          onClick={onRefresh}
        >
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
          <Navigation className="size-4" />
          Ambil GPS Sekarang
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-start gap-3">
            <span className={`rounded-md p-3 ${hasLocation ? "bg-emerald-400 text-slate-950" : "bg-yellow-300 text-slate-950"}`}>
              {hasLocation ? <Navigation className="size-5" /> : <MapPin className="size-5" />}
            </span>
            <div>
              <p className="font-semibold text-slate-50">{fieldOfficer?.name || "Field Officer Aktif"}</p>
              <p className="mt-1 text-slate-400 text-sm">
                {fieldOfficer ? `${fieldOfficer.title} / ${fieldOfficer.sector}` : "Menunggu profil Field Officer..."}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <LiveLocationMetric label="Status GPS" value={getLiveLocationStatusLabel(location)} />
            <LiveLocationMetric label="Update Terakhir" value={formatLocationTimestamp(location.timestamp)} />
            <LiveLocationMetric label="Latitude" value={hasLocation ? formatCoordinate(location.latitude) : "-"} mono />
            <LiveLocationMetric label="Longitude" value={hasLocation ? formatCoordinate(location.longitude) : "-"} mono />
            <LiveLocationMetric label="Akurasi" value={location.accuracy != null ? `${Math.round(location.accuracy)} meter` : "-"} />
            <LiveLocationMetric label="Kecepatan" value={location.speed != null ? `${Math.round(location.speed * 3.6)} km/jam` : "-"} />
            <LiveLocationMetric label="FO Terpantau" value={locations.length.toString()} />
            <LiveLocationMetric label="Aktif <= 5 Menit" value={activeLocations.length.toString()} />
          </div>

          {location.error && (
            <div className="rounded-md border border-yellow-300/40 bg-yellow-300/10 p-3 text-sm text-yellow-100">
              {location.error}
            </div>
          )}

          <div className="rounded-md border border-cyan-300/30 bg-cyan-300/10 p-3 text-cyan-100 text-sm">
            Posisi Field Officer aktif dikirim ke backend setiap 5 menit. Peta di kanan menampilkan semua akun Field Officer
            yang sudah mengirim GPS, dengan pin yang bisa diklik untuk melihat detail personel.
          </div>

          {currentFieldOfficerLocation && (
            <a
              href={`https://www.google.com/maps?q=${currentFieldOfficerLocation.latitude},${currentFieldOfficerLocation.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-full items-center justify-center rounded-md border border-slate-700 px-3 font-semibold text-slate-300 text-xs hover:bg-slate-800"
            >
              Buka lokasi saya di Google Maps
            </a>
          )}
        </section>

        <section className="min-h-[620px] overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
          <LiveLocationsMap locations={locations} currentFieldOfficerId={fieldOfficer?.id} />
        </section>
      </div>
    </div>
  );
}

function LiveLocationsMap({
  currentFieldOfficerId,
  locations,
}: {
  currentFieldOfficerId?: string;
  locations: FieldOfficerLiveLocation[];
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRefs = useRef<Map<string, Marker>>(new Map());
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!mapEl.current || mapRef.current) return;

      const L = await loadLeafletModule();
      if (disposed || !mapEl.current) return;

      leafletRef.current = L;
      const map = L.map(mapEl.current, {
        center: [0.7893, 113.9213],
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
      setMapReady(true);

      const refreshMapSize = () => {
        if (!disposed) map.invalidateSize({ animate: false });
      };

      requestAnimationFrame(refreshMapSize);
      window.setTimeout(refreshMapSize, 300);
      window.addEventListener("resize", refreshMapSize);

      mapEl.current.addEventListener(
        "field-officer-live-location-map-cleanup",
        () => window.removeEventListener("resize", refreshMapSize),
        { once: true },
      );
    }

    initMap();

    return () => {
      disposed = true;
      mapEl.current?.dispatchEvent(new Event("field-officer-live-location-map-cleanup"));
      markerRefs.current.clear();
      try {
        layerRef.current?.clearLayers();
        mapRef.current?.off();
        mapRef.current?.remove();
      } catch {
        // Leaflet can throw during fast route transitions while panes are being removed.
      }
      mapRef.current = null;
      layerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !layer || !map) return;

    layer.clearLayers();
    markerRefs.current.clear();

    const validLocations = locations.filter((item) =>
      Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)),
    );

    if (validLocations.length === 0) {
      map.setView([0.7893, 113.9213], 5);
      return;
    }

    const bounds = L.latLngBounds([]);

    for (const item of validLocations) {
      const hasGps = hasPublishedGps(item);
      const stale = isLiveLocationStale(item);
      const isCurrent = currentFieldOfficerId === item.fieldOfficerId;
      const marker = L.marker([item.latitude, item.longitude], {
        icon: L.divIcon({
          className: "",
          html: `<span class="fo-live-marker ${isCurrent && hasGps ? "fo-live-marker-current" : ""} ${stale && hasGps ? "fo-live-marker-stale" : ""} ${hasGps ? "" : "fo-live-marker-missing"}"></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      });

      marker.bindPopup(createLiveLocationPopup(item, isCurrent));
      marker.addTo(layer);
      markerRefs.current.set(item.fieldOfficerId, marker);
      bounds.extend([item.latitude, item.longitude]);
    }

    if (validLocations.length === 1) {
      map.setView([validLocations[0].latitude, validLocations[0].longitude], 14);
      return;
    }

    map.fitBounds(bounds, {
      maxZoom: 14,
      padding: [40, 40],
    });
  }, [currentFieldOfficerId, locations, mapReady]);

  return (
    <div className="grid min-h-[620px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="relative min-h-[420px] xl:min-h-[620px]">
        <div ref={mapEl} className="absolute inset-0 z-0" />
        {locations.length === 0 && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/75 p-6 text-center">
            <Crosshair className="size-10 text-slate-600" />
            <p className="mt-3 font-semibold text-slate-200">Belum ada Field Officer mengirim GPS</p>
            <p className="mt-2 max-w-md text-slate-500 text-sm">
              Saat akun Field Officer membuka aplikasi dan memberi izin lokasi, pin akan muncul di sini.
            </p>
          </div>
        )}
      </div>
      <aside className="max-h-[620px] overflow-y-auto border-slate-800 border-t bg-slate-950/80 p-3 xl:border-t-0 xl:border-l">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="font-bold text-slate-50 text-sm">Field Officer Pins</p>
            <p className="text-slate-500 text-xs">Klik pin peta atau daftar untuk detail.</p>
          </div>
          <span className="rounded-md border border-cyan-300/40 px-2 py-1 font-mono text-cyan-200 text-xs">
            {locations.length}
          </span>
        </div>

        <div className="space-y-2">
          {locations.map((item) => {
            const isCurrent = currentFieldOfficerId === item.fieldOfficerId;
            const hasGps = hasPublishedGps(item);
            const stale = isLiveLocationStale(item);

            return (
              <button
                key={item.fieldOfficerId}
                type="button"
                onClick={() => markerRefs.current.get(item.fieldOfficerId)?.openPopup()}
                className={`w-full rounded-md border p-3 text-left transition ${
                  isCurrent
                    ? "border-cyan-300/70 bg-cyan-300/10"
                    : "border-slate-800 bg-slate-900/70 hover:border-cyan-400/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-semibold text-slate-100 text-sm">
                    {item.fieldOfficerName || item.fieldOfficerId}
                  </span>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-1 font-semibold text-[10px] uppercase tracking-widest ${
                      !hasGps
                        ? "border-red-300/50 text-red-200"
                        : stale
                        ? "border-yellow-300/50 text-yellow-100"
                        : "border-emerald-300/50 text-emerald-200"
                    }`}
                  >
                    {!hasGps ? "Belum GPS" : stale ? "Stale" : "Live"}
                  </span>
                </div>
                <p className="mt-1 text-slate-400 text-xs">{item.sector || item.title || "-"}</p>
                <p className="mt-2 font-mono text-cyan-200 text-xs">
                  {formatCoordinate(item.latitude)}, {formatCoordinate(item.longitude)}
                </p>
                <p className="mt-1 text-slate-500 text-xs">
                  {hasGps ? `Update: ${formatDateTime(item.updatedAt)}` : "Belum pernah mengirim GPS"}
                </p>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: string; tone: "emerald" | "cyan" | "amber" }) {
  const toneClass = {
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
    amber: "border-yellow-300/70 bg-yellow-300/20 text-yellow-100",
  }[tone];

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-widest opacity-75">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
}

function LiveLocationMetric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/70 p-3">
      <div className="text-[10px] text-slate-500 uppercase tracking-widest">{label}</div>
      <div className={`mt-1 font-semibold text-slate-100 text-sm ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}

function MetricTile({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: string;
  tone: "cyan" | "amber" | "emerald" | "red";
}) {
  const iconClass = {
    cyan: "bg-cyan-500/10 text-cyan-300",
    amber: "bg-yellow-300/25 text-yellow-100",
    emerald: "bg-emerald-500/10 text-emerald-300",
    red: "bg-red-500/10 text-red-300",
  }[tone];

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/70 p-2.5">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-[10px] text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`rounded-md p-1.5 ${iconClass}`}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="mt-1.5 font-bold font-mono text-xl text-slate-50">{value}</div>
    </div>
  );
}

function HomePanel({ workspace, reports }: { workspace: FieldOfficerWorkspacePayload; reports: WhatsappReport[] }) {
  const pendingReports = reports.filter((item) => getReportBaketStatus(item) === "Pending").length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-3">
        <PanelHeader icon={Clock3} title="Prioritas Hari Ini" />
        {workspace.tasks.map((task) => (
          <WorkItem
            key={task.id}
            title={task.title}
            meta={`${task.id} / ${task.area} / ${task.due} / ${task.sourceDirective}`}
            status={task.status}
          />
        ))}
      </div>
      <div className="space-y-3">
        <PanelHeader icon={UserRoundCheck} title="Ringkasan Koleksi" />
        <WorkItem title="Jaring binaan aktif" meta={`${workspace.jaring.length} sumber berada di bawah FO ini`} status="Scoped" />
        <WorkItem
          title="Pin laporan terlihat"
          meta={`${workspace.locationPins.length} titik dari laporan Jaring binaan saja`}
          status="Ownership Filter"
        />
        <WorkItem
          title="Laporan Jaring pending"
          meta={`${pendingReports} laporan real dari WhatsApp Center menunggu keputusan Field Officer`}
          status="Need Review"
        />
      </div>
    </div>
  );
}

function TasksPanel({
  actionLoading,
  fieldOfficer,
  forwardedTaskIds,
  onForward,
  tasks,
}: {
  actionLoading: string | null;
  fieldOfficer: FieldOfficer;
  forwardedTaskIds: string[];
  onForward: (id: string) => Promise<void>;
  tasks: FieldTask[];
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(tasks[0]?.id ?? null);

  useEffect(() => {
    if (selectedTaskId && tasks.some((task) => task.id === selectedTaskId)) return;
    setSelectedTaskId(tasks[0]?.id ?? null);
  }, [selectedTaskId, tasks]);

  const taskViewModels = tasks;
  const selectedTask = taskViewModels.find((task) => task.id === selectedTaskId) ?? null;
  const activeCount = taskViewModels.filter((task) => task.status !== "Completed").length;
  const completedCount = taskViewModels.filter((task) => task.status === "Completed").length;
  const overdueCount = taskViewModels.filter((task) => isTaskOverdue(task)).length;
  const selectedTaskForwarded = selectedTask ? forwardedTaskIds.includes(selectedTask.id) : false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelHeader icon={ClipboardCheck} title="Tugas Saya" />
        <div className="rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-400 text-xs">
          <span className="font-mono text-cyan-300">{fieldOfficer.id}</span>
          <span className="mx-2 text-slate-600">/</span>
          <span>{fieldOfficer.name}</span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <TaskStat label="Aktif" value={activeCount.toString()} />
        <TaskStat label="Selesai" value={completedCount.toString()} />
        <TaskStat label="Potensi Overdue" value={overdueCount.toString()} />
      </div>

      {tasks.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
            <ClipboardCheck className="size-5" />
          </span>
          <p className="mt-4 font-bold text-slate-50">Belum ada tugas untuk Field Officer ini</p>
          <p className="mx-auto mt-2 max-w-xl text-slate-400 text-sm leading-6">
            Workspace aktif memakai ID {fieldOfficer.id}. Tugas hanya muncul kalau data penugasan memiliki
            fieldOfficerId yang sama.
          </p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="grid min-h-[620px] gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <section className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-950/50">
            <div className="border-slate-800 border-b p-4">
              <p className="font-bold text-slate-50 text-sm">Daftar Tugas Lapangan</p>
              <p className="mt-1 text-slate-400 text-xs">Tugas berasal dari Field Coordinator sesuai alur PRD.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <div className="space-y-2">
                {taskViewModels.map((task) => {
                  const isSelected = selectedTaskId === task.id;
                  const isForwarded = forwardedTaskIds.includes(task.id);

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        isSelected
                          ? "border-cyan-300/70 bg-cyan-300/10 shadow-[inset_0_0_22px_rgba(34,211,238,0.12)]"
                          : "border-slate-800 bg-slate-950/70 hover:border-cyan-300/35 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold font-mono text-cyan-300 text-xs">{task.id}</span>
                        <PriorityBadge priority={task.priority} />
                      </div>
                      <p className="mt-3 line-clamp-2 font-semibold text-slate-100 text-sm leading-5">{task.title}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <TaskStatusBadge status={task.status} />
                        {isForwarded && (
                          <span className="rounded-md border border-emerald-400/50 bg-emerald-400/10 px-2 py-1 font-bold text-[10px] text-emerald-200 uppercase tracking-widest">
                            Forwarded
                          </span>
                        )}
                        <span>{task.area}</span>
                        <span className="text-slate-600">/</span>
                        <span>{task.due}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
            {selectedTask && (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3 border-slate-800 border-b p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold font-mono text-cyan-300 text-xs">{selectedTask.id}</span>
                      <PriorityBadge priority={selectedTask.priority} />
                      <TaskStatusBadge status={selectedTask.status} />
                    </div>
                    <h2 className="mt-3 font-semibold text-slate-50 text-xl">{selectedTask.title}</h2>
                    <p className="mt-1 text-slate-400 text-sm">
                      Ditugaskan oleh {selectedTask.commander} ke {fieldOfficer.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask && (
                      <Button
                        size="sm"
                        className="gap-2 bg-cyan-300 font-bold text-slate-950 shadow-cyan-400/25 shadow-lg hover:bg-cyan-200"
                        disabled={actionLoading === `forward:${selectedTask.id}`}
                        onClick={() => onForward(selectedTask.id)}
                      >
                        <Forward className="size-4" />
                        Forward
                      </Button>
                    )}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      <TaskSection title="Instruksi Lapangan">
                        <p>{buildTaskInstruction(selectedTask)}</p>
                      </TaskSection>
                      <TaskSection title="Target & Wilayah">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <TaskFact label="Target" value={selectedTask.title} />
                          <TaskFact label="Lokasi" value={selectedTask.area} />
                          <TaskFact label="Deadline" value={selectedTask.due} />
                          <TaskFact label="Priority" value={selectedTask.priority} />
                        </div>
                      </TaskSection>
                      <TaskSection title="Kebutuhan Lampiran">
                        <ul className="list-inside list-disc space-y-1 text-slate-300 text-sm">
                          <li>Catatan hasil observasi lapangan.</li>
                          <li>Foto atau dokumen pendukung bila tersedia.</li>
                          <li>Koordinat GPS/titik lokasi terkait.</li>
                          <li>Rangkuman sumber informasi yang dapat dipertanggungjawabkan.</li>
                        </ul>
                      </TaskSection>
                    </div>
                    <div className="space-y-3">
                      <TaskFact label="Sumber Arahan" value={selectedTask.sourceDirective} />
                      <TaskFact label="Pemberi Tugas" value={selectedTask.commander} />
                      <TaskFact label="Field Officer" value={fieldOfficer.name} />
                      <TaskFact label="Sektor" value={fieldOfficer.sector} />
                      <TaskSection title="Alur PRD">
                        <ol className="list-inside list-decimal space-y-1 text-slate-300 text-sm">
                          <li>Field Coordinator membagi tugas.</li>
                          <li>Field Officer melaksanakan tugas.</li>
                          <li>Informasi Jaring masuk via WA Center.</li>
                          <li>Field Officer validasi dan bentuk BAKET jika valid.</li>
                        </ol>
                      </TaskSection>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TaskStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <p className="font-bold text-[10px] text-cyan-200 uppercase tracking-[0.22em]">{label}</p>
      <p className="mt-2 font-bold text-2xl text-slate-50">{value}</p>
    </div>
  );
}

function TaskSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-slate-800 bg-slate-950 p-4">
      <p className="font-bold text-[10px] text-cyan-200 uppercase tracking-[0.22em]">{title}</p>
      <div className="mt-3 text-slate-300 text-sm leading-7">{children}</div>
    </section>
  );
}

function TaskFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-300/20 bg-slate-950 p-3">
      <p className="font-bold text-[10px] text-cyan-200 uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 break-words font-semibold text-slate-100 text-sm">{value}</p>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: FieldTask["status"] }) {
  const className = {
    Pending: "border-yellow-300/60 bg-yellow-300/15 text-yellow-100",
    "In Progress": "border-cyan-300/60 bg-cyan-300/10 text-cyan-100",
    Completed: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
  }[status];

  return (
    <span className={`rounded-md border px-2 py-1 font-bold text-[10px] uppercase tracking-widest ${className}`}>
      {status}
    </span>
  );
}

function buildTaskInstruction(task: FieldTask) {
  return `Laksanakan tugas ${task.id} pada area ${task.area}. Fokus pada target "${task.title}", dokumentasikan hasil lapangan, dan jadikan temuan relevan sebagai bahan validasi Incoming Information sebelum pembentukan BAKET.`;
}

function isTaskOverdue(task: FieldTask) {
  if (task.status === "Completed") return false;
  return /kemarin|overdue|lewat/i.test(task.due);
}

function ReportPhoto({ photoUrl, title }: { photoUrl?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);

  if (!photoUrl || failed) {
    return (
      <div className="relative mx-auto flex h-56 w-full max-w-4xl overflow-hidden rounded-md border border-cyan-300/20 bg-slate-950 text-cyan-100 shadow-[inset_0_0_22px_rgba(34,211,238,0.08)]">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.08)_0,transparent_1px)] bg-[length:100%_9px] opacity-35" />
        <div className="relative flex w-full flex-col items-center justify-center gap-2 text-center">
          <span className="inline-flex size-8 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10">
            <ImageIcon className="size-4" />
          </span>
          <span className="font-bold text-[10px] uppercase tracking-[0.24em]">
            {photoUrl ? "Foto gagal load" : "Tanpa foto"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="group mx-auto block h-56 w-full max-w-4xl overflow-hidden rounded-md border border-slate-800 bg-slate-900/70 shadow-[0_0_28px_rgba(15,23,42,0.7)] transition hover:border-cyan-300/60"
        >
          <img
            src={getAssetUrl(photoUrl)}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-5xl border border-cyan-300/40 bg-slate-950 p-3 text-white">
        <AlertDialogHeader className="px-2 pt-1">
          <AlertDialogTitle className="text-cyan-100 text-sm">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400 text-xs">
            Preview foto bukti laporan Jaring.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex max-h-[74vh] items-center justify-center overflow-hidden rounded-md border border-slate-800 bg-slate-900/70">
          <img
            src={getAssetUrl(photoUrl)}
            alt={title}
            className="max-h-[74vh] w-auto max-w-full object-contain"
          />
        </div>
        <AlertDialogFooter className="border-cyan-300/20 bg-slate-950 px-2 pb-1">
          <AlertDialogCancel className="h-9 border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
            Tutup
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function BaketPanel({
  reports,
  waUsers,
  onInvalid,
  onVerify,
}: {
  reports: WhatsappReport[];
  waUsers: WhatsappAllowedUser[];
  onInvalid: (id: number) => void;
  onVerify: (id: number) => void;
}) {
  const getJaringName = (whatsappId: string, pushName?: string | null) => {
    const user = waUsers.find((u) => u.whatsappId === whatsappId || u.whatsappId === whatsappId.replace(/^62/, "0"));
    return user?.name || pushName || whatsappId;
  };
  const pageSize = 8;
  const [page, setPage] = useState(1);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(reports.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (selectedReportId && reports.some((report) => report.id === selectedReportId)) return;
    setSelectedReportId(null);
  }, [reports, selectedReportId]);

  const pagedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return reports.slice(start, start + pageSize);
  }, [page, reports]);

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? null;
  const selectedStatus = selectedReport ? getReportBaketStatus(selectedReport) : null;
  const selectedIsPending = selectedStatus === "Pending";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelHeader icon={FileText} title="Laporan Jaring Masuk" />
        <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 text-xs">
          <span className="font-mono text-cyan-300">{reports.length}</span>
          <span>laporan</span>
          <span className="text-slate-600">/</span>
          <span>
            halaman {page} dari {totalPages}
          </span>
        </div>
      </div>

      {reports.length === 0 ? (
        <WorkItem title="Belum ada laporan Jaring" meta="Menunggu laporan real dari WhatsApp Center." status="Empty" />
      ) : (
        <div className="grid min-h-[680px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="flex h-[680px] min-h-0 max-h-[calc(100vh-220px)] flex-col rounded-lg border border-slate-800 bg-slate-950/50">
            <div className="border-slate-800 border-b p-4">
              <p className="font-bold text-slate-50 text-sm">Daftar Laporan</p>
              <p className="mt-1 text-slate-400 text-xs">Klik salah satu laporan untuk membuka isi detail.</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 pr-1">
              <div className="space-y-2">
                {pagedReports.map((report) => {
                  const status = getReportBaketStatus(report);
                  const isSelected = selectedReportId === report.id;

                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelectedReportId(report.id)}
                      className={`w-full rounded-md border p-3 text-left transition ${
                        isSelected
                          ? "border-cyan-300/70 bg-cyan-300/10 shadow-[inset_0_0_22px_rgba(34,211,238,0.12)]"
                          : "border-slate-800 bg-slate-950/70 hover:border-cyan-300/35 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold font-mono text-cyan-300 text-xs">WA-{report.id}</span>
                        <IncomingStatusBadge status={status} />
                      </div>
                      <p className="mt-3 line-clamp-2 font-semibold text-slate-100 text-sm leading-5">
                        {createReportTitle(report)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="truncate">{report.pushName || report.whatsappId}</span>
                        <span className="text-slate-600">/</span>
                        <span>{formatDate(report.createdAt)}</span>
                      </div>
                      <ReportClassificationChips report={report} className="mt-3" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-slate-800 border-t p-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900 disabled:text-slate-600"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <span className="font-mono text-slate-400 text-xs">
                {page}/{totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-900 disabled:text-slate-600"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </section>

          <section className="min-h-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
            {selectedReport ? (
              <div className="flex h-full min-h-0 flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3 border-slate-800 border-b p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold font-mono text-cyan-300 text-xs">WA-{selectedReport.id}</span>
                      {selectedStatus && <IncomingStatusBadge status={selectedStatus} />}
                      <span className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-400 uppercase tracking-widest">
                        {getJaringName(selectedReport.whatsappId, selectedReport.pushName)}
                      </span>
                    </div>
                    <ReportClassificationChips report={selectedReport} className="mt-3" />
                    <h2 className="mt-3 font-semibold text-slate-50 text-xl">{createReportTitle(selectedReport)}</h2>
                  </div>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="group relative flex-1 overflow-hidden gap-2 border-cyan-300/45 !bg-slate-950 font-bold text-cyan-100 shadow-[inset_0_0_18px_rgba(34,211,238,0.12)] hover:border-cyan-200 hover:!bg-cyan-300/10 disabled:border-slate-800 disabled:text-slate-600 disabled:shadow-none sm:flex-none"
                          disabled={!selectedIsPending}
                        >
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
                          <CheckCircle2 className="size-4" />
                          Verified
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent size="sm" className="border border-emerald-300/60 bg-slate-900 text-white">
                        <AlertDialogHeader>
                          <AlertDialogMedia className="bg-emerald-300 text-slate-950">
                            <CheckCircle2 className="size-5" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>Verifikasi laporan?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-200">
                            Laporan WA-{selectedReport.id} akan ditandai Verified dan siap menjadi bahan BAKET.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="grid grid-cols-2 gap-2 border-cyan-300/20 bg-slate-950">
                          <AlertDialogCancel className="h-9 w-full border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
                            Batal
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="h-9 w-full border border-cyan-300/60 !bg-cyan-300 font-bold text-slate-950 shadow-lg shadow-cyan-400/20 hover:!bg-cyan-200"
                            onClick={() => onVerify(selectedReport.id)}
                          >
                            Ya, Verified
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="group relative flex-1 overflow-hidden gap-2 border-red-300/45 !bg-slate-950 font-bold text-red-100 shadow-[inset_0_0_18px_rgba(248,113,113,0.10)] hover:border-red-200 hover:!bg-red-500/10 disabled:border-slate-800 disabled:text-slate-600 disabled:shadow-none sm:flex-none"
                          disabled={!selectedIsPending}
                        >
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-300/80 to-transparent" />
                          <XCircle className="size-4" />
                          Invalid
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent size="sm" className="border border-red-300/60 bg-slate-900 text-white">
                        <AlertDialogHeader>
                          <AlertDialogMedia className="bg-red-400 text-white">
                            <XCircle className="size-5" />
                          </AlertDialogMedia>
                          <AlertDialogTitle>Tutup sebagai invalid?</AlertDialogTitle>
                          <AlertDialogDescription className="text-slate-200">
                            Laporan WA-{selectedReport.id} akan ditandai Invalid dan tidak dipakai sebagai BAKET.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="grid grid-cols-2 gap-2 border-red-300/20 bg-slate-950">
                          <AlertDialogCancel className="h-9 w-full border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
                            Batal
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="h-9 w-full border border-red-300/60 !bg-red-400 font-bold text-slate-950 shadow-lg shadow-red-400/20 hover:!bg-red-300"
                            onClick={() => onInvalid(selectedReport.id)}
                          >
                            Ya, Invalid
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="mx-auto max-w-5xl space-y-4">
                    <ReportLocationMap report={selectedReport} />
                    <div className="rounded-md border border-slate-800 bg-slate-950 p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1.5 font-mono text-cyan-300">
                          <MapPin className="size-3.5" />
                          {formatReportLocation(selectedReport)}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5" />
                          Kejadian: {formatDateTime(selectedReport.occurredAt || selectedReport.createdAt)}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="size-3.5" />
                          Diterima: {formatDate(selectedReport.createdAt)}
                        </span>
                        <span className="text-slate-600">/</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Radio className="size-3.5" />
                          {getJaringName(selectedReport.whatsappId, selectedReport.pushName)}
                          {selectedReport.whatsappId !== getJaringName(selectedReport.whatsappId, selectedReport.pushName) && (
                            <span className="text-slate-600">({selectedReport.whatsappId})</span>
                          )}
                        </span>
                      </div>
                      <h3 className="mt-4 font-bold text-2xl text-slate-50">{createReportTitle(selectedReport)}</h3>
                      <ReportClassificationChips report={selectedReport} className="mt-3" />
                      <p className="mt-4 whitespace-pre-wrap text-slate-200 text-sm leading-7">{selectedReport.content}</p>
                      {selectedReport.photoUrl ? (
                        <div className="mt-5">
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Foto Bukti</p>
                          <PhotoThumbnail
                            photoUrl={selectedReport.photoUrl}
                            title={createReportTitle(selectedReport)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[520px] items-center justify-center p-6 text-center">
                <div className="max-w-sm">
                  <span className="mx-auto flex size-12 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10 text-cyan-200">
                    <FileText className="size-5" />
                  </span>
                  <p className="mt-4 font-bold text-slate-50">Pilih laporan</p>
                  <p className="mt-2 text-slate-400 text-sm leading-6">
                    Detail foto, isi laporan, sumber, timestamp, lokasi, dan aksi validasi akan tampil di sini.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function PhotoThumbnail({ photoUrl, title }: { photoUrl: string; title: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const src = /^https?:\/\//i.test(photoUrl) ? photoUrl : `${backendPublicUrl}${photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-900 transition hover:border-cyan-400/60"
        style={{ display: "inline-block" }}
        title="Klik untuk zoom"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          className="block h-40 w-auto max-w-xs object-cover transition group-hover:opacity-80"
        />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-slate-950/50">
          <ImageIcon className="size-6 text-cyan-300" />
        </span>
      </button>
      {lightboxOpen && (
        <PhotoLightbox src={src} title={title} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

function PhotoLightbox({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const zoom = (factor: number) => {
    setScale((prev) => Math.min(5, Math.max(0.5, parseFloat((prev * factor).toFixed(2)))));
  };

  const resetView = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return;
    setTranslate({
      x: dragStart.current.tx + (e.clientX - dragStart.current.x),
      y: dragStart.current.ty + (e.clientY - dragStart.current.y),
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
    dragStart.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoom(1.2);
      if (e.key === "-") zoom(1 / 1.2);
      if (e.key === "0") resetView();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <ImageIcon className="size-4 text-cyan-300" />
          <p className="truncate text-sm font-semibold text-slate-100">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoom(1.25)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
            title="Zoom in (+)"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoom(1 / 1.25)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
            title="Zoom out (-)"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-400 hover:border-cyan-400/60 hover:text-cyan-300"
            title="Reset (0)"
          >
            Reset
          </button>
          <span className="rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-mono text-slate-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-red-400/60 hover:text-red-300"
            title="Tutup (Esc)"
          >
            ✕ Tutup
          </button>
        </div>
      </div>

      {/* Image canvas */}
      <div
        className="flex flex-1 items-center justify-center overflow-hidden"
        style={{ cursor: dragging ? "grabbing" : scale > 1 ? "grab" : "default" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={title}
          draggable={false}
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.15s ease",
            userSelect: "none",
            maxWidth: "90vw",
            maxHeight: "80vh",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Footer hint */}
      <div className="shrink-0 border-t border-slate-800 px-4 py-2 text-center text-[11px] text-slate-600">
        Scroll untuk zoom · Klik &amp; geser untuk pan · Esc untuk tutup
      </div>
    </div>
  );
}

function IncomingStatusBadge({ status }: { status: "Pending" | "Verified" | "Invalid" }) {
  const className = {
    Pending: "border-yellow-300/60 bg-yellow-300/15 text-yellow-100",
    Verified: "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
    Invalid: "border-red-400/50 bg-red-500/10 text-red-200",
  }[status];

  return (
    <span className={`rounded-md border px-2 py-1 font-bold text-[10px] uppercase tracking-widest ${className}`}>
      {status}
    </span>
  );
}

function ReportMeta({ icon: Icon, label, value }: { icon?: ElementType; label: string; value: string }) {
  return (
    <div className="relative flex min-h-[150px] overflow-hidden rounded-md border border-cyan-300/20 bg-slate-950 p-4 shadow-[inset_0_0_24px_rgba(34,211,238,0.08)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(34,211,238,0.08)_0,transparent_1px)] bg-[length:100%_9px] opacity-35" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
      <div className="relative flex w-full flex-col items-center justify-center text-center">
        <span className="mb-3 inline-flex size-9 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
          {Icon ? <Icon className="size-4" /> : <FileText className="size-4" />}
        </span>
        <p className="font-bold text-[10px] text-cyan-200 uppercase tracking-[0.24em]">{label}</p>
        <p className="mt-3 break-words font-mono font-semibold text-base text-slate-50 leading-6">{value}</p>
      </div>
    </div>
  );
}

function ReportClassificationChips({ report, className = "" }: { report: WhatsappReport; className?: string }) {
  if (!report.cluster && !report.category) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {report.cluster ? (
        <span className="rounded-md border border-cyan-300/35 bg-cyan-300/10 px-2 py-1 font-bold text-[10px] text-cyan-100 uppercase tracking-widest">
          Klaster: {report.cluster}
        </span>
      ) : null}
      {report.category ? (
        <span className="rounded-md border border-emerald-300/35 bg-emerald-300/10 px-2 py-1 font-bold text-[10px] text-emerald-100 uppercase tracking-widest">
          Kategori: {report.category}
        </span>
      ) : null}
    </div>
  );
}

function ReportLocationMap({ report }: { report: WhatsappReport }) {
  const latitude = Number(report.locationLatitude);
  const longitude = Number(report.locationLongitude);
  const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

  if (!hasLocation) {
    return (
      <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-md border border-cyan-300/20 bg-slate-950 p-6 text-center shadow-[inset_0_0_32px_rgba(34,211,238,0.08)]">
        <div className="max-w-xs">
          <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-200">
            <MapPin className="size-5" />
          </span>
          <p className="font-bold text-slate-50">Tanpa lokasi</p>
          <p className="mt-2 text-slate-400 text-sm">Laporan ini belum membawa koordinat WhatsApp.</p>
        </div>
      </div>
    );
  }

  const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  const embedUrl = getGoogleMapsEmbedUrl(latitude, longitude);

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noreferrer"
      className="group relative isolate flex min-h-[420px] overflow-hidden rounded-md border border-cyan-300/25 bg-slate-950 text-slate-100 shadow-[inset_0_0_34px_rgba(34,211,238,0.10)] transition hover:border-cyan-300/70"
      title="Buka di Google Maps"
    >
      <iframe
        title={`Peta laporan WA-${report.id}`}
        src={embedUrl}
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full scale-[1.04] border-0 brightness-95 contrast-110 saturate-125"
        frameBorder="0"
        loading="lazy"
        marginHeight={0}
        marginWidth={0}
        scrolling="no"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_52%,transparent_0,rgba(2,6,23,0.04)_48%,rgba(2,6,23,0.34)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(8,47,73,0.14),transparent_42%,rgba(2,6,23,0.18))]" />
      <span className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 size-5 rounded-full border-2 border-cyan-100 bg-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.9)]" />
      <span className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 left-1/2 size-10 animate-ping rounded-full border border-cyan-300/60" />
      <span className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-md border border-cyan-300/30 bg-slate-950/85 px-3 py-2 font-bold text-[10px] text-cyan-100 uppercase tracking-[0.22em] shadow-lg shadow-slate-950/60 backdrop-blur">
        <MapPin className="size-3.5" /> Lokasi
      </span>
      <span className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-md border border-cyan-300/35 bg-slate-950/90 px-3 py-2 font-bold text-[10px] text-cyan-100 uppercase tracking-[0.18em] shadow-lg shadow-slate-950/60 backdrop-blur transition group-hover:border-cyan-200 group-hover:text-cyan-50">
        Open Maps <ExternalLink className="size-3.5" />
      </span>
    </a>
  );
}

function getGoogleMapsEmbedUrl(latitude: number, longitude: number) {
  return `https://maps.google.com/maps?ll=${latitude},${longitude}&z=16&output=embed`;
}

function getReportBaketStatus(report: WhatsappReport): "Pending" | "Verified" | "Invalid" {
  const rawStatus = (report.informationStatus || report.status || "").toString().toUpperCase();
  if (report.closedAt || rawStatus === "INVALID" || rawStatus === "CLOSED") return "Invalid";
  if (report.baketId || rawStatus === "VERIFIED" || rawStatus === "VALID" || rawStatus === "BAKET") return "Verified";
  return "Pending";
}

function createReportTitle(report: WhatsappReport) {
  if (report.title?.trim()) return report.title.trim();

  const source = report.pushName || report.whatsappId || `WA-${report.id}`;
  const firstSentence = report.content.split(/[.!?\n]/).find(Boolean)?.trim();
  if (!firstSentence) return `Laporan Jaring ${source}`;

  return firstSentence.length > 72 ? `${firstSentence.slice(0, 72)}...` : firstSentence;
}

function formatReportLocation(report: WhatsappReport) {
  const latitude = Number(report.locationLatitude);
  const longitude = Number(report.locationLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "Tanpa lokasi";
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function getAssetUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `${backendPublicUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

function getLiveLocationStatusLabel(location: LiveLocationState) {
  if (location.status === "ready") return "Live";
  if (location.status === "loading") return "...";
  if (location.status === "denied") return "Denied";
  if (location.status === "unavailable") return "N/A";
  if (location.status === "error") return "Error";
  return "Idle";
}

function formatCoordinate(value?: number) {
  if (value == null || !Number.isFinite(value)) return "-";
  return value.toFixed(6);
}

function formatLocationTimestamp(timestamp?: number) {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

function hasPublishedGps(location: FieldOfficerLiveLocation) {
  return location.hasGpsLocation !== false && location.locationStatus !== "MISSING_GPS" && Boolean(location.updatedAt);
}

function getLocationTime(location: FieldOfficerLiveLocation) {
  const value = location.updatedAt || location.capturedAt || location.createdAt;
  if (!value) return 0;

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function isLiveLocationStale(location: FieldOfficerLiveLocation) {
  if (!hasPublishedGps(location)) return true;
  const updatedAt = location.updatedAt;
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > 5 * 60 * 1000;
}

function createLiveLocationPopup(location: FieldOfficerLiveLocation, isCurrent: boolean) {
  const safeName = escapeHtml(location.fieldOfficerName || location.fieldOfficerId);
  const safeTitle = escapeHtml(location.title || "-");
  const safeSector = escapeHtml(location.sector || "-");
  const safeFieldOfficerId = escapeHtml(location.fieldOfficerId);
  const hasGps = hasPublishedGps(location);
  const staleLabel = !hasGps ? "Belum pernah mengirim GPS" : isLiveLocationStale(location) ? "Stale > 5 menit" : "Live <= 5 menit";
  const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

  return `
    <div class="min-w-[220px] space-y-2">
      <div class="font-bold text-slate-950">${safeName}</div>
      <div class="text-xs text-slate-700">${safeTitle} / ${safeSector}</div>
      <div class="rounded border border-slate-200 bg-slate-50 p-2 font-mono text-xs">
        ${formatCoordinate(location.latitude)}, ${formatCoordinate(location.longitude)}
      </div>
      <div class="text-xs text-slate-600">ID: ${safeFieldOfficerId}</div>
      <div class="text-xs text-slate-600">${hasGps ? `Update: ${formatDateTime(location.updatedAt)}` : "GPS belum tersedia"}</div>
      <div class="text-xs font-semibold ${!hasGps ? "text-red-700" : isCurrent ? "text-cyan-700" : "text-emerald-700"}">${isCurrent && hasGps ? "Field Officer aktif" : staleLabel}</div>
      <a href="${mapsUrl}" target="_blank" rel="noreferrer" class="text-xs font-semibold text-blue-700 underline">Buka Google Maps</a>
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

function AlertPanel({
  panicSent,
  onSend,
  fieldOfficer,
}: {
  panicSent: boolean;
  onSend: () => void;
  fieldOfficer?: FieldOfficer;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-red-500/20 p-3 text-red-200">
            <AlertTriangle className="size-6" />
          </span>
          <div>
            <h2 className="font-bold text-lg text-red-100">Panic Button</h2>
            <p className="text-red-100/70 text-sm">Lokasi terakhir: {fieldOfficer?.sector || "Field Sector"} / GPS aktif</p>
          </div>
        </div>
        <Button className="mt-5 w-full gap-2 bg-red-500 font-bold text-white hover:bg-red-400" onClick={onSend} disabled={panicSent}>
          <Radio className="size-4" />
          {panicSent ? "Alert Terkirim" : "Kirim Panic Alert"}
        </Button>
      </div>
      <div className="space-y-3">
        <PanelHeader icon={MapPin} title="Emergency Report" />
        <WorkItem title="Koordinat" meta="GPS device Field Officer, bukan pin laporan Jaring" status="GPS Active" />
        <WorkItem title="Rantai notifikasi" meta="Field Coordinator, Regional Commander, Pusdalops" status="Ready" />
        <WorkItem title="Fallback" meta="Lokasi manual tersedia bila GPS tidak terbaca" status="Standby" />
      </div>
    </div>
  );
}

function PanelHeader({ icon: Icon, title }: { icon: ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 border-slate-800 border-b pb-3">
      <Icon className="size-4 text-cyan-300" />
      <h2 className="font-bold text-slate-100 text-sm uppercase tracking-widest">{title}</h2>
    </div>
  );
}

function WorkItem({ title, meta, status }: { title: string; meta: string; status: string }) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <p className="mt-1 text-slate-400 text-sm">{meta}</p>
        </div>
        <span className="w-fit rounded-md border border-slate-700 px-2 py-1 font-semibold text-[10px] text-slate-400 uppercase tracking-widest">
          {status}
        </span>
      </div>
    </article>
  );
}

function PriorityBadge({ priority }: { priority: FieldTask["priority"] }) {
  const className =
    priority === "High"
      ? "border-red-500/40 bg-red-500/10 text-red-300"
      : "border-yellow-300/70 bg-yellow-300/20 text-yellow-100";

  return (
    <span className={`rounded-md border px-2 py-1 font-semibold text-[10px] uppercase tracking-widest ${className}`}>
      {priority}
    </span>
  );
}
