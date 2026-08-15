// biome-ignore-all lint/nursery/useSortedClasses: Preserves selected finalkalife tactical map UI class composition.

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";

import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  Compass,
  Mail,
  MapPin,
  Phone,
  Radio,
  Search,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map as BaseMap, MapControls, MapMarker, type MapRef } from "@/components/ui/map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { JaringIdentityArea, JaringIdentitySource } from "@/lib/domain/jaring-identity";
import { DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { matchesPhoneSearch } from "@/lib/search/phone-search";
import { cn } from "@/lib/utils";

type DataRecord = Record<string, unknown>;

const OPENSTREETMAP_3D_STYLES = {
  light: "https://tiles.openfreemap.org/styles/liberty",
  dark: "https://tiles.openfreemap.org/styles/liberty",
} as const;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "Belum tersedia") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function identityArea(value: unknown): JaringIdentityArea | null {
  const area = record(value);
  const name = text(area.name, "");
  if (!name) return null;
  return {
    id: text(area.id, "") || undefined,
    name,
    level: text(area.level, "") || undefined,
    parent: identityArea(area.parent),
  };
}

function jaringIdentitySource(item: DataRecord): JaringIdentitySource {
  const coverages = list(item.areaCoverages);
  const primaryCoverage = coverages.find((coverage) => coverage.isPrimary === true) ?? coverages[0];
  const caretakers = list(item.caretakerAssignments);
  const assignment = record(record(caretakers[0]).fieldOfficerAssignment);
  const officer = record(assignment.userProfile);

  return {
    id: text(item.id, "") || null,
    fullName: text(item.fullName, "") || null,
    aliasName: text(item.aliasName, "") || null,
    whatsappNumber: text(item.whatsappNumber, "") || null,
    profilePhotoFileId: text(item.profilePhotoFileId, "") || null,
    gaswilName: text(officer.fullName ?? officer.username, "") || null,
    gaswilAssignmentId: text(assignment.id, "") || null,
    gaswilUserProfileId: text(officer.id ?? assignment.userProfileId, "") || null,
    assignedArea: identityArea(record(primaryCoverage).area),
  };
}

function locationByAssignment(value: unknown) {
  const map = new Map<string, DataRecord>();
  for (const feature of list(record(value).features)) {
    const properties = record(feature.properties);
    const assignmentId = text(properties.assignmentId, "");
    if (assignmentId) map.set(assignmentId, { ...properties, geometry: feature.geometry });
  }
  return map;
}

function areaLabels(assignment: DataRecord) {
  const labels = list(assignment.areaScopes)
    .map((scope) => text(record(scope.area).name, ""))
    .filter(Boolean);
  return labels.length ? labels.join(", ") : "Wilayah belum ditetapkan";
}

function formatTime(value: unknown) {
  if (typeof value !== "string") return "Belum ada ping lokasi";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Waktu tidak valid"
    : new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function formatTimeAgo(value: unknown) {
  if (typeof value !== "string") return "Belum ada ping";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak valid";

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "short" }).format(date);
}

function getCoords(location: any): [number, number] | null {
  const geom = location?.geometry;
  if (!geom || !Array.isArray(geom.coordinates) || geom.coordinates.length < 2) {
    return null;
  }
  const lng = Number(geom.coordinates[0]);
  const lat = Number(geom.coordinates[1]);
  return Number.isFinite(lng) && Number.isFinite(lat) ? [lng, lat] : null;
}

function getMarkerType(assignment: DataRecord) {
  const title = text(record(assignment.position).title, "").toLowerCase();
  const unitName = text(record(record(assignment.position).organizationUnit).name, "").toLowerCase();

  if (
    title.includes("cc") ||
    title.includes("command center") ||
    title.includes("pusat komando") ||
    unitName.includes("komando") ||
    unitName.includes("pusat")
  ) {
    return "COMMAND_CENTER";
  }
  if (title.includes("kabinda") || title.includes("kepala binda") || title.includes("kepala badan")) {
    return "KABINDA";
  }
  if (title.includes("korwil") || title.includes("koordinator")) {
    return "KORWIL";
  }
  if (title.includes("direktorat") || title.includes("direktur")) {
    return "DIREKTORAT";
  }
  return "AGENT";
}

function deriveStatus(assignment: DataRecord, location: DataRecord | undefined) {
  if (!location?.hasLiveLocation || !location?.capturedAt) {
    return "OFFLINE";
  }

  const capturedAt = new Date(String(location.capturedAt)).getTime();
  if (!Number.isFinite(capturedAt) || Date.now() - capturedAt > 5 * 60 * 1000) {
    return "OFFLINE";
  }

  if (location.isEmergency || record(assignment.userProfile).isEmergency) {
    return "EMERGENCY";
  }

  const title = text(record(assignment.position).title, "").toLowerCase();
  if (title.includes("supervisor") || title.includes("kordinator") || title.includes("commander")) {
    return "SUPERVISOR";
  }
  if (title.includes("petugas") || title.includes("lapangan")) {
    return "DUTY";
  }

  return "ACTIVE";
}

// Generate pagination page numbers array with ellipsis
const getPageNumbers = (current: number, total: number) => {
  const numbers: (number | string)[] = [];
  const delta = 1;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      numbers.push(i);
    } else if (numbers[numbers.length - 1] !== "...") {
      numbers.push("...");
    }
  }
  return numbers.map((n) => (n === "..." ? -1 : n));
};

export function PersonelJaringClient({ network, locations }: { network: unknown; locations: unknown }) {
  const payload = record(network);
  const command = record(payload.command);
  const assignments = list(payload.assignments).filter(
    (assignment) => text(assignment.id, "") !== text(command.assignmentId, ""),
  );
  const jaring = list(payload.jaring);
  const locationMap = useMemo(() => locationByAssignment(locations), [locations]);

  // Map Tab States & Variables
  const [mapFilterTypes, setMapFilterTypes] = useState({
    agent: true,
    korwil: true,
    kabinda: true,
    direktorat: true,
    organisasi: true,
  });
  const [mapFilterStatus, setMapFilterStatus] = useState<"ALL" | "ONLINE" | "OFFLINE" | "EMERGENCY">("ALL");
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [showTravelPath, setShowTravelPath] = useState(true);
  const [selectedGisPoint, setSelectedGisPoint] = useState<any | null>(null);
  const [mapZoom, setMapZoom] = useState(7);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pointId: string } | null>(null);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState("list-view");
  const mapRef = useRef<MapRef>(null);

  // Playback & Timeline states
  const [timelineIndex, setTimelineIndex] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);

  // Reset timeline on selected point change
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset playback intentionally follows selected GIS point changes.
  useEffect(() => {
    setTimelineIndex(3);
    setIsPlaying(false);
  }, [selectedGisPoint]);

  // Easing history path data points helper
  const getTravelHistoryForCoords = useCallback((coords: [number, number] | null, status: string) => {
    if (!coords) return [];
    const [lng, lat] = coords;
    return [
      {
        time: "08:10",
        label: "HQ (Pusat Komando)",
        coords: [lng - 0.012, lat - 0.008] as [number, number],
        status: "online",
      },
      {
        time: "08:22",
        label: "Pos Wilayah Korwil",
        coords: [lng - 0.008, lat + 0.004] as [number, number],
        status: "online",
      },
      {
        time: "08:37",
        label: "Transit Lokasi Personel",
        coords: [lng - 0.004, lat - 0.002] as [number, number],
        status: status === "OFFLINE" ? "offline" : "online",
      },
      {
        time: "08:45",
        label: "Lokasi Saat Ini",
        coords: coords,
        status: status === "EMERGENCY" ? "emergency" : status === "OFFLINE" ? "offline" : "online",
      },
    ];
  }, []);

  // Auto easeTo timeline index coordinates
  useEffect(() => {
    if (!selectedGisPoint || timelineIndex < 0) return;
    const history = getTravelHistoryForCoords(selectedGisPoint.coords, selectedGisPoint.status);
    const node = history[timelineIndex];
    if (node) {
      const mapObj = mapRef.current?.getMap();
      mapObj?.easeTo({
        center: node.coords,
        zoom: 15,
        pitch: 65,
        bearing: 0,
        duration: 800,
      });
    }
  }, [getTravelHistoryForCoords, selectedGisPoint, timelineIndex]);

  // Replay interval driver
  useEffect(() => {
    if (!isPlaying) return;
    const intervalTime = 2000 / playbackSpeed;
    const timer = setInterval(() => {
      setTimelineIndex((current) => {
        if (current >= 3) {
          return 0; // Wrap around
        }
        return current + 1;
      });
    }, intervalTime);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  // Convert raw data to standardized GIS map point records
  const mapPoints = useMemo(() => {
    const points: any[] = [];
    for (const assignment of assignments) {
      const profile = record(assignment.userProfile);
      const position = record(assignment.position);
      const unit = record(position.organizationUnit);
      const location = locationMap.get(text(assignment.id, ""));
      const coords = getCoords(location);
      if (!coords) continue;

      const kind = getMarkerType(assignment);
      const status = deriveStatus(assignment, location);

      points.push({
        id: text(assignment.id),
        fullName: text(profile.fullName, text(profile.username, "Personel")),
        title: text(position.title),
        unitName: text(unit.name),
        status,
        coords,
        email: text(profile.email ?? record(profile.authUser).email, "-"),
        phone: text(profile.phoneNumber || profile.phone, "-"),
        location,
        kind,
        photo: text(profile.photoUrl || profile.photo, ""),
      });
    }
    return points;
  }, [assignments, locationMap]);

  // Handle GIS Point selection zoom animations
  const handleSelectPoint = (point: any) => {
    setSelectedGisPoint(point);
    const map = mapRef.current?.getMap();
    if (map && point.coords) {
      map.flyTo({
        center: point.coords,
        zoom: 17,
        pitch: 70,
        bearing: 20,
        essential: true,
        duration: 1500,
      });
    }
  };

  // Right click handler
  const handleRightClick = (e: React.MouseEvent, pointId: string) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      pointId,
    });
  };

  // Close context menu on window clicks
  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // Filtered map points based on checkbox state and query
  const filteredMapPoints = useMemo(() => {
    return mapPoints.filter((p) => {
      if (p.kind === "COMMAND_CENTER") return false;
      if (p.kind === "AGENT" && !mapFilterTypes.agent) return false;
      if (p.kind === "KORWIL" && !mapFilterTypes.korwil) return false;
      if (p.kind === "KABINDA" && !mapFilterTypes.kabinda) return false;
      if (p.kind === "DIREKTORAT" && !mapFilterTypes.direktorat) return false;

      if (mapFilterStatus !== "ALL") {
        if (mapFilterStatus === "ONLINE" && p.status === "OFFLINE") return false;
        if (mapFilterStatus === "OFFLINE" && p.status !== "OFFLINE") return false;
        if (mapFilterStatus === "EMERGENCY" && p.status !== "EMERGENCY") return false;
      }

      if (mapSearchQuery.trim()) {
        const query = mapSearchQuery.toLowerCase();
        return (
          p.fullName.toLowerCase().includes(query) ||
          p.title.toLowerCase().includes(query) ||
          p.unitName.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [mapPoints, mapFilterTypes, mapFilterStatus, mapSearchQuery]);

  // Suggestions list
  const searchSuggestions = useMemo(() => {
    if (!mapSearchQuery.trim()) return [];
    const query = mapSearchQuery.toLowerCase();
    return mapPoints.filter((p) => p.fullName.toLowerCase().includes(query) || p.title.toLowerCase().includes(query));
  }, [mapPoints, mapSearchQuery]);

  // Map center logic: center on the first matching point or default to Jakarta
  const mapCenter = useMemo<[number, number]>(() => {
    if (filteredMapPoints.length > 0) {
      return filteredMapPoints[0].coords;
    }
    return [106.8166, -6.2];
  }, [filteredMapPoints]);

  // Simple pure JS distance-based clustering
  const clusterPoints = (pts: any[], zoomVal: number) => {
    if (zoomVal >= 10) {
      return pts.map((p) => ({ isCluster: false, point: p }));
    }

    const clusters: any[] = [];
    const distanceThreshold = 0.5 * (14 - zoomVal);
    const processed = new Set<string>();

    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      if (processed.has(p1.id)) continue;

      const clusterMembers = [p1];
      processed.add(p1.id);

      for (let j = i + 1; j < pts.length; j++) {
        const p2 = pts[j];
        if (processed.has(p2.id)) continue;

        const dx = p1.coords[0] - p2.coords[0];
        const dy = p1.coords[1] - p2.coords[1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < distanceThreshold) {
          clusterMembers.push(p2);
          processed.add(p2.id);
        }
      }

      if (clusterMembers.length > 1) {
        const avgLng = clusterMembers.reduce((sum, item) => sum + item.coords[0], 0) / clusterMembers.length;
        const avgLat = clusterMembers.reduce((sum, item) => sum + item.coords[1], 0) / clusterMembers.length;
        clusters.push({
          isCluster: true,
          id: `cluster-${p1.id}`,
          coords: [avgLng, avgLat],
          count: clusterMembers.length,
          points: clusterMembers,
        });
      } else {
        clusters.push({
          isCluster: false,
          id: p1.id,
          coords: p1.coords,
          point: p1,
        });
      }
    }
    return clusters;
  };

  const gisMapNodes = clusterPoints(filteredMapPoints, mapZoom);

  const pathCoordinates = useMemo<Array<[number, number]>>(() => {
    if (!selectedGisPoint?.coords) return [];
    const [lng, lat] = selectedGisPoint.coords;
    return [
      [lng - 0.012, lat - 0.008],
      [lng - 0.008, lat + 0.004],
      [lng - 0.004, lat - 0.002],
      [lng, lat],
    ];
  }, [selectedGisPoint]);

  useEffect(() => {
    if (activeWorkspaceTab !== "map-gis") return;

    const animationFrame = window.requestAnimationFrame(() => {
      mapRef.current?.resize();
      mapRef.current?.easeTo({ pitch: 60, duration: 0 });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeWorkspaceTab]);

  // Easing Travel Path drawing effect
  useEffect(() => {
    const mapObj = mapRef.current?.getMap();
    if (!mapObj) return;

    const sourceId = "travel-path-source";
    const layerId = "travel-path-layer";

    if (showTravelPath && pathCoordinates.length > 1) {
      const geojson: any = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: pathCoordinates,
        },
      };

      try {
        if (mapObj.getSource(sourceId)) {
          (mapObj.getSource(sourceId) as any).setData(geojson);
        } else {
          mapObj.addSource(sourceId, {
            type: "geojson",
            data: geojson,
          });
          mapObj.addLayer({
            id: layerId,
            type: "line",
            source: sourceId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#38bdf8",
              "line-width": 3,
              "line-opacity": 0.8,
              "line-dasharray": [2, 2],
            },
          });
        }
      } catch (_err) {
        // Suppress any premature map styles loading errors
      }
    } else {
      try {
        if (mapObj.getLayer(layerId)) mapObj.removeLayer(layerId);
        if (mapObj.getSource(sourceId)) mapObj.removeSource(sourceId);
      } catch (_err) {
        // Suppress errors during unmount or style changes
      }
    }
  }, [showTravelPath, pathCoordinates]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "border-emerald-500/35 bg-emerald-500/10 text-emerald-500";
      case "SUPERVISOR":
        return "border-blue-500/35 bg-blue-500/10 text-blue-500";
      case "DUTY":
        return "border-orange-500/35 bg-orange-500/10 text-orange-500";
      case "EMERGENCY":
        return "border-red-500/35 bg-red-500/10 text-red-500 animate-pulse";
      default:
        return "border-neutral-500/35 bg-neutral-500/10 text-neutral-500";
    }
  };

  const getMarkerBgAndBorder = (kind: string, status: string, isSelected: boolean) => {
    if (status === "EMERGENCY") {
      return cn(
        "bg-red-600 border-red-700 text-white animate-pulse",
        isSelected ? "ring-2 ring-cyan-400 border-cyan-400" : "",
      );
    }
    if (status === "OFFLINE") {
      return cn(
        "bg-slate-600 border-slate-700 text-slate-350",
        isSelected ? "ring-2 ring-cyan-400 border-cyan-400" : "",
      );
    }

    let baseColors = "";
    switch (kind) {
      case "COMMAND_CENTER":
        baseColors = "bg-red-600 border-red-700 text-white";
        break;
      case "KABINDA":
        baseColors = "bg-amber-500 border-amber-600 text-black";
        break;
      case "KORWIL":
        baseColors = "bg-green-600 border-green-700 text-white";
        break;
      case "DIREKTORAT":
        baseColors = "bg-purple-800 border-purple-900 text-white";
        break;
      default:
        baseColors = "bg-blue-500 border-blue-600 text-white"; // AGENT
    }

    return cn(baseColors, isSelected ? "ring-2 ring-cyan-400 border-cyan-400" : "");
  };

  const getMarkerIcon = (kind: string, status?: string) => {
    if (status === "EMERGENCY") {
      return <AlertTriangle className="size-4 stroke-[2.5]" />;
    }
    switch (kind) {
      case "COMMAND_CENTER":
        return <Radio className="size-4 stroke-[2.5]" />;
      case "KABINDA":
        return <Star className="size-4 stroke-[2.5]" />;
      case "KORWIL":
        return <ShieldCheck className="size-4 stroke-[2.5]" />;
      case "DIREKTORAT":
        return <Building2 className="size-4 stroke-[2.5]" />;
      default:
        return <User className="size-4 stroke-[2.5]" />; // AGENT
    }
  };

  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLocaleLowerCase("id-ID");

  // Selection states for master-detail panels
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedJaringId, setSelectedJaringId] = useState<string | null>(null);
  const personnelDetailRef = useRef<HTMLDivElement>(null);
  const [personnelListHeight, setPersonnelListHeight] = useState<number | null>(null);

  // Pagination states
  const [personnelPage, setPersonnelPage] = useState(1);
  const [jaringPage, setJaringPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const jaringByAssignment = useMemo(() => {
    const index = new Map<string, DataRecord[]>();
    for (const item of jaring) {
      for (const caretaker of list(item.caretakerAssignments)) {
        const assignmentId = text(
          caretaker.fieldOfficerAssignmentId ?? record(caretaker.fieldOfficerAssignment).id,
          "",
        );
        if (!assignmentId) continue;
        index.set(assignmentId, [...(index.get(assignmentId) ?? []), item]);
      }
    }
    return index;
  }, [jaring]);

  // Dynamic responsive page size listener
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setPageSize(6); // Mobile
      } else if (window.innerWidth < 1024) {
        setPageSize(8); // Tablet
      } else {
        setPageSize(10); // Desktop
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const profile = record(assignment.userProfile);
      const position = record(assignment.position);
      const unit = record(position.organizationUnit);
      const attachedJaring = jaringByAssignment.get(text(assignment.id, "")) ?? [];
      return (
        [
          profile.fullName,
          profile.username,
          position.title,
          unit.name,
          areaLabels(assignment),
          ...attachedJaring.flatMap((item) => [item.aliasName, item.fullName, item.whatsappNumber]),
        ]
          .map((value) => text(value, "").toLocaleLowerCase("id-ID"))
          .some((value) => value.includes(normalizedSearch)) ||
        matchesPhoneSearch(profile.phoneNumber ?? profile.phone, search)
      );
    });
  }, [assignments, jaringByAssignment, normalizedSearch, search]);

  const visibleJaring = useMemo(() => {
    return jaring.filter((item) => {
      const cluster = record(item.cluster);
      return (
        [item.aliasName, item.fullName, item.id, cluster.name]
          .map((value) => text(value, "").toLocaleLowerCase("id-ID"))
          .some((value) => value.includes(normalizedSearch)) || matchesPhoneSearch(item.whatsappNumber, search)
      );
    });
  }, [jaring, normalizedSearch, search]);

  // Reset page numbers on search query adjustments
  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset pagination whenever the filtered result set changes.
  useEffect(() => {
    setPersonnelPage(1);
  }, [search, visibleAssignments.length]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset pagination whenever the filtered result set changes.
  useEffect(() => {
    setJaringPage(1);
  }, [search, visibleJaring.length]);

  // Paginated Slices
  const paginatedAssignments = useMemo(() => {
    const start = (personnelPage - 1) * pageSize;
    return visibleAssignments.slice(start, start + pageSize);
  }, [visibleAssignments, personnelPage, pageSize]);

  const paginatedJaring = useMemo(() => {
    const start = (jaringPage - 1) * pageSize;
    return visibleJaring.slice(start, start + pageSize);
  }, [visibleJaring, jaringPage, pageSize]);

  // Sync selection to current active page first element on page transition
  useEffect(() => {
    if (paginatedAssignments.length > 0) {
      const hasSelected = paginatedAssignments.some((a) => text(a.id) === selectedAssignmentId);
      if (!hasSelected) {
        setSelectedAssignmentId(text(paginatedAssignments[0].id));
      }
    } else {
      setSelectedAssignmentId(null);
    }
  }, [paginatedAssignments, selectedAssignmentId]);

  useEffect(() => {
    if (paginatedJaring.length > 0) {
      const hasSelected = paginatedJaring.some((j) => text(j.id) === selectedJaringId);
      if (!hasSelected) {
        setSelectedJaringId(text(paginatedJaring[0].id));
      }
    } else {
      setSelectedJaringId(null);
    }
  }, [paginatedJaring, selectedJaringId]);

  useEffect(() => {
    const detailPanel = personnelDetailRef.current;
    if (!detailPanel) return;

    const syncListHeight = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setPersonnelListHeight(Math.ceil(detailPanel.getBoundingClientRect().height));
      } else {
        setPersonnelListHeight(null);
      }
    };

    const observer = new ResizeObserver(syncListHeight);
    observer.observe(detailPanel);
    window.addEventListener("resize", syncListHeight);
    syncListHeight();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncListHeight);
    };
  }, []);

  const getStatusColor = (status: string) => {
    if (status === "OFFLINE") {
      return "bg-neutral-500";
    }
    return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
  };

  const getStatusLabel = (status: string) => {
    if (status === "OFFLINE") {
      return "Offline";
    }
    return "Online";
  };

  const unitCount = new Set(
    visibleAssignments.map((item) => text(record(record(item.position).organizationUnit).id, "")),
  ).size;
  const liveCount = visibleAssignments.filter((item) => {
    const loc = locationMap.get(text(item.id, ""));
    return Boolean(loc?.hasLiveLocation);
  }).length;
  const operationalJaring = visibleJaring.filter((item) => item.status === "ACTIVE").length;

  // Selected object references
  const selectedAssignment = useMemo(() => {
    return visibleAssignments.find((a) => text(a.id) === selectedAssignmentId) || null;
  }, [visibleAssignments, selectedAssignmentId]);

  const selectedJaring = useMemo(() => {
    return visibleJaring.find((j) => text(j.id) === selectedJaringId) || null;
  }, [visibleJaring, selectedJaringId]);

  // Personnel Pagination Math
  const totalPersonnelPages = Math.ceil(visibleAssignments.length / pageSize);
  const personnelStartIdx = visibleAssignments.length > 0 ? (personnelPage - 1) * pageSize + 1 : 0;
  const personnelEndIdx = Math.min(personnelPage * pageSize, visibleAssignments.length);

  // Jaring Pagination Math
  const totalJaringPages = Math.ceil(visibleJaring.length / pageSize);
  const jaringStartIdx = visibleJaring.length > 0 ? (jaringPage - 1) * pageSize + 1 : 0;
  const jaringEndIdx = Math.min(jaringPage * pageSize, visibleJaring.length);

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4">
      {/* Header */}
      <header className="border-b pb-4">
        <h1 className="mt-1 font-heading text-2xl font-semibold">Personel, Organisasi & Jaring</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Seluruh data di bawah berasal dari penugasan aktif yang berada dalam rantai komando Anda. Lokasi yang
          dirahasiakan tidak ditampilkan.
        </p>
      </header>

      {/* Mode Selector Tabs */}
      <Tabs value={activeWorkspaceTab} onValueChange={setActiveWorkspaceTab} className="w-full space-y-4">
        <TabsList className="bg-muted/40 p-0.5 border border-border rounded-[3px] flex w-fit select-none">
          <TabsTrigger
            value="list-view"
            className="rounded-[3px] text-xs font-semibold uppercase tracking-wider px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Personel & Organisasi
          </TabsTrigger>
          <TabsTrigger
            value="map-gis"
            className="rounded-[3px] text-xs font-semibold uppercase tracking-wider px-4 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Peta Operasional
          </TabsTrigger>
        </TabsList>

        {/* Tab 1 Content: List View (Original layout) */}
        <TabsContent value="list-view" className="space-y-4 outline-none">
          {/* Stats row */}
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan command network">
            {[
              {
                label: "Personel bawahan",
                value: visibleAssignments.length,
                helper: "Personel dalam cakupan komando aktif",
                icon: DOMAIN_VISUALS.gaswil.Icon,
              },
              {
                label: "Unit organisasi",
                value: unitCount,
                helper: "Unit yang muncul pada hasil filter",
                icon: Building2,
              },
              {
                label: "Lokasi aktual tersedia",
                value: liveCount,
                helper: `${formatPercent(percentOf(liveCount, visibleAssignments.length))}% dari personel`,
                icon: Radio,
              },
              {
                label: "Status operasional aktif",
                value: operationalJaring,
                helper: `${formatPercent(percentOf(operationalJaring, visibleJaring.length))}% dari total Jaring`,
                icon: DOMAIN_VISUALS.jaring.Icon,
              },
            ].map((metric) => (
              <Card key={metric.label} size="sm" className="rounded-[8px]">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{metric.label}</p>
                    <p className="mt-1 font-mono text-2xl font-semibold">{metric.value}</p>
                    <p className="mt-1 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {metric.helper}
                    </p>
                  </div>
                  <metric.icon className="size-5 text-primary" aria-hidden="true" />
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Search & Filter Toolbar */}
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-9 text-xs rounded-[4px] border-border"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari personel, nomor HP, unit, wilayah, atau jaring"
              aria-label="Cari command network"
            />
          </div>

          <Tabs defaultValue="personnel">
            <TabsList className="bg-muted/40 p-1 rounded-[6px]">
              <TabsTrigger value="personnel" className="rounded-[4px] text-xs font-semibold">
                Personel & organisasi ({visibleAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="jaring" className="rounded-[4px] text-xs font-semibold">
                Jaring ({visibleJaring.length})
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Personel & Organisasi */}
            <TabsContent value="personnel" className="mt-3">
              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[35%_65%] lg:grid-cols-[30%_70%]">
                {/* Left compact scrollable master list with Pagination */}
                <div
                  className="flex min-h-0 flex-col overflow-hidden rounded-[8px] border border-border bg-card"
                  style={personnelListHeight ? { height: personnelListHeight } : undefined}
                >
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 px-3 py-2 border-b border-border/40 bg-secondary/10 shrink-0">
                    Daftar Personel
                  </div>

                  <div className="min-h-0 flex-1 divide-y divide-border/30 overflow-y-auto no-scrollbar">
                    {paginatedAssignments.length > 0 ? (
                      paginatedAssignments.map((assignment) => {
                        const profile = record(assignment.userProfile);
                        const position = record(assignment.position);
                        const location = locationMap.get(text(assignment.id, ""));
                        const status = deriveStatus(assignment, location);
                        const isSelected = selectedAssignmentId === text(assignment.id);
                        const attachedJaring = jaringByAssignment.get(text(assignment.id, "")) ?? [];

                        return (
                          <button
                            type="button"
                            key={text(assignment.id)}
                            onClick={() => setSelectedAssignmentId(text(assignment.id))}
                            className={cn(
                              "w-full text-left p-3 transition-all duration-150 cursor-pointer flex flex-col gap-1 border-l-2 relative",
                              isSelected
                                ? "bg-primary/5 border-primary text-primary"
                                : "hover:bg-[var(--dc-surface-hover)] border-transparent text-muted-foreground hover:text-foreground",
                            )}
                            style={{ contentVisibility: "auto", containIntrinsicSize: "80px" }}
                          >
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <span className="font-sans font-bold text-[11px] text-foreground truncate max-w-[170px]">
                                {text(profile.fullName, text(profile.username, "Nama Personel"))}
                              </span>
                              <span className="flex items-center gap-1.5 shrink-0">
                                <span className={cn("size-2 rounded-full", getStatusColor(status))} />
                                <span className="text-[9px] font-mono font-bold leading-none">
                                  {getStatusLabel(status)}
                                </span>
                              </span>
                            </div>
                            <div className="text-[10px] truncate opacity-85 leading-tight">{text(position.title)}</div>
                            <div className="flex items-center justify-between gap-2 text-[9px] font-mono opacity-65 mt-1 border-t border-border/10 pt-1">
                              <span className="truncate">{areaLabels(assignment)}</span>
                              <span className="shrink-0 text-primary">{attachedJaring.length} Jaring</span>
                            </div>
                            <div className="flex items-center justify-between text-[9px] font-mono opacity-65">
                              <span className="truncate">
                                {attachedJaring
                                  .map((item) => text(item.aliasName ?? item.fullName ?? item.id, ""))
                                  .join(", ") || "Belum ada Jaring binaan"}
                              </span>
                              <span>Ping: {formatTimeAgo(location?.capturedAt)}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground italic">
                        Tidak ada personel yang cocok.
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls Bar */}
                  {totalPersonnelPages > 1 && (
                    <div className="flex flex-col gap-2 p-3 border-t border-border/40 bg-secondary/5 text-[10.5px] font-mono shrink-0">
                      <div className="text-muted-foreground/80 text-center">
                        Menampilkan {personnelStartIdx}–{personnelEndIdx} dari {visibleAssignments.length} personel
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={personnelPage === 1}
                          onClick={() => setPersonnelPage(personnelPage - 1)}
                          className="h-7 text-[10px] rounded cursor-pointer border-border/60 hover:bg-accent"
                        >
                          &lt; Sebelumnya
                        </Button>

                        <div className="flex items-center gap-1">
                          {getPageNumbers(personnelPage, totalPersonnelPages).map((num, idx) => {
                            if (num === -1) {
                              return (
                                <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                                  ...
                                </span>
                              );
                            }
                            return (
                              <Button
                                key={`page-${num}`}
                                variant={personnelPage === num ? "default" : "ghost"}
                                size="xs"
                                onClick={() => setPersonnelPage(num as number)}
                                className={cn(
                                  "h-7 w-7 text-[10px] rounded p-0 cursor-pointer",
                                  personnelPage === num
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "hover:bg-accent",
                                )}
                              >
                                {num}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="xs"
                          disabled={personnelPage === totalPersonnelPages}
                          onClick={() => setPersonnelPage(personnelPage + 1)}
                          className="h-7 text-[10px] rounded cursor-pointer border-border/60 hover:bg-accent"
                        >
                          Berikutnya &gt;
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right detailed inspector panel */}
                <div ref={personnelDetailRef} className="space-y-4">
                  {selectedAssignment ? (
                    (() => {
                      const assignment = selectedAssignment;
                      const profile = record(assignment.userProfile);
                      const position = record(assignment.position);
                      const unit = record(position.organizationUnit);
                      const role = record(position.role);
                      const location = locationMap.get(text(assignment.id, ""));
                      const status = deriveStatus(assignment, location);
                      const coords = getCoords(location);
                      const reportsTo = record(position.reportsTo);
                      const supervisorName = text(reportsTo.title, "");
                      const attachedJaring = jaringByAssignment.get(text(assignment.id, "")) ?? [];

                      return (
                        <Card className="border border-border/80 bg-card rounded-[8px] overflow-hidden shadow-sm">
                          <CardHeader className="p-4 border-b border-border/40 bg-secondary/10 flex flex-col sm:flex-row justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={location?.hasLiveLocation ? "default" : "secondary"}
                                  className="font-mono text-[9px] rounded px-1.5 py-0"
                                >
                                  {location?.hasLiveLocation ? "LOKASI AKTUAL" : "CENTROID WILAYAH"}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={`font-mono text-[9px] rounded px-1.5 py-0 uppercase border-transparent text-white ${status === "OFFLINE" ? "bg-neutral-600" : "bg-emerald-600"}`}
                                >
                                  {getStatusLabel(status)}
                                </Badge>
                              </div>
                              <CardTitle className="font-heading text-lg text-foreground font-bold tracking-tight">
                                {text(profile.fullName, text(profile.username, "Nama Personel"))}
                              </CardTitle>
                              <CardDescription className="font-sans text-xs text-muted-foreground">
                                {text(position.title)} / {text(unit.name)}
                              </CardDescription>
                            </div>
                            <Button asChild className="h-8 shrink-0 font-mono text-[10px]" size="sm" variant="outline">
                              <Link
                                href={`/dashboard/regional-commander/personel-jaring/personel/${text(assignment.id)}`}
                              >
                                DETAIL LENGKAP
                              </Link>
                            </Button>
                          </CardHeader>

                          <CardContent className="p-4 space-y-4 text-xs">
                            {/* 1. Grid of detailed properties */}
                            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 border-b border-border/20 pb-3 font-mono">
                              <div>
                                <span className="text-muted-foreground/60 block text-[9px] uppercase">
                                  Peran & Seat
                                </span>
                                <span className="text-foreground font-bold mt-0.5 block leading-tight">
                                  {text(role.name)} / {text(position.seatCode)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground/60 block text-[9px] uppercase">Email</span>
                                <span className="text-foreground font-bold mt-0.5 block leading-tight truncate flex items-center gap-1">
                                  <Mail className="size-3 text-muted-foreground/60" />
                                  {text(profile.email ?? record(profile.authUser).email, "-")}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground/60 block text-[9px] uppercase">Nomor HP</span>
                                <span className="text-foreground font-bold mt-0.5 block leading-tight flex items-center gap-1">
                                  <Phone className="size-3 text-muted-foreground/60" />
                                  {text(profile.phoneNumber || profile.phone, "-")}
                                </span>
                              </div>
                            </div>

                            {/* 2. Wilayah Tugas & Last Update details */}
                            <div className="grid gap-3 sm:grid-cols-2 font-mono">
                              <div>
                                <span className="text-muted-foreground/60 block text-[9px] uppercase">
                                  Wilayah Tugas
                                </span>
                                <span className="text-foreground/90 font-medium block mt-0.5">
                                  {areaLabels(assignment)}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground/60 block text-[9px] uppercase">
                                  Terakhir Diperbarui
                                </span>
                                <span className="text-foreground/90 font-medium block mt-0.5 flex items-center gap-1">
                                  <Clock className="size-3.5 text-muted-foreground/60" />
                                  {formatTime(location?.capturedAt)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2 border-t border-border/20 pt-3">
                              <span className="flex items-center gap-1 text-muted-foreground/60 block font-mono text-[9px] uppercase">
                                <DOMAIN_VISUALS.jaring.Icon className="size-3" /> Jaring Binaan ({attachedJaring.length}
                                )
                              </span>
                              {attachedJaring.length ? (
                                <div className="grid gap-2 sm:grid-cols-2">
                                  {attachedJaring.map((item) => (
                                    <div
                                      key={text(item.id)}
                                      className="space-y-2 border border-border/40 bg-secondary/10 px-3 py-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                                    >
                                      <JaringIdentitySummary compact source={jaringIdentitySource(item)} />
                                      <div className="flex items-center justify-between gap-2">
                                        <Badge variant="outline" className="shrink-0 rounded-none text-[8px]">
                                          {text(item.registrationStatus ?? item.status, "-")}
                                        </Badge>
                                        <Link
                                          href={`/dashboard/daftar-jaring/${text(item.id)}`}
                                          className="font-mono font-semibold text-[9px] text-primary hover:underline"
                                        >
                                          Detail Jaring
                                        </Link>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="border border-dashed border-border/40 bg-secondary/5 px-3 py-4 text-center text-[10px] text-muted-foreground">
                                  Belum ada Jaring yang melekat pada Petugas Wilayah (Gaswil) ini.
                                </div>
                              )}
                            </div>

                            {/* 3. Organizational hierarchy visual tree */}
                            <div className="space-y-2 border-t border-border/20 pt-3">
                              <span className="text-muted-foreground/60 block font-mono text-[9px] uppercase">
                                Struktur Organisasi / Hierarki
                              </span>
                              <div className="bg-secondary/5 border border-border/40 p-3 rounded-[6px]">
                                {supervisorName ? (
                                  <div className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <User className="size-3 text-primary" />
                                      {supervisorName}
                                    </span>
                                    <div className="pl-4 border-l border-border/60 my-1">
                                      <span className="text-foreground/90 flex items-center gap-1 font-semibold">
                                        └── {text(position.title)} ({text(profile.fullName)})
                                      </span>
                                      <div className="pl-4 border-l border-border/60 my-0.5 text-muted-foreground/70">
                                        └── Anggota Operasional / Jaring
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="font-mono text-[11px] text-foreground/90 flex items-center gap-1.5">
                                    <User className="size-3 text-emerald-500" />
                                    <span>
                                      {text(profile.fullName)} ({text(position.title)}) - Pucuk Pimpinan Komando
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 4. Mini Map container */}
                            <div className="space-y-2 border-t border-border/20 pt-3">
                              <span className="text-muted-foreground/60 block font-mono text-[9px] uppercase">
                                Visual Geospasial Aktual
                              </span>
                              {coords ? (
                                <div className="rounded-[8px] overflow-hidden border border-border h-48 relative">
                                  <BaseMap
                                    center={coords}
                                    zoom={12}
                                    pitch={60}
                                    bearing={-20}
                                    minZoom={3}
                                    maxZoom={18}
                                    styles={OPENSTREETMAP_3D_STYLES}
                                  >
                                    <MapMarker longitude={coords[0]} latitude={coords[1]}>
                                      <button
                                        type="button"
                                        title={`${text(profile.fullName, text(profile.username, "Personel"))} - ${location?.hasLiveLocation ? "lokasi aktual" : "centroid wilayah"}`}
                                        aria-label={`Lokasi ${text(profile.fullName, text(profile.username, "personel"))}`}
                                        className="group relative grid size-10 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/90"
                                      >
                                        <span
                                          aria-hidden="true"
                                          className={cn(
                                            "absolute size-8 animate-ping rounded-full opacity-25 motion-reduce:animate-none",
                                            getStatusColor(status),
                                          )}
                                        />
                                        <span
                                          aria-hidden="true"
                                          className={cn(
                                            "relative grid size-8 place-items-center rounded-full border-2 border-white text-white shadow-lg transition-transform group-hover:scale-110",
                                            getStatusColor(status),
                                          )}
                                        >
                                          <MapPin className="size-4 stroke-[2.5]" />
                                        </span>
                                      </button>
                                    </MapMarker>
                                  </BaseMap>
                                  <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur border border-border px-2 py-0.5 rounded text-[9px] font-mono text-foreground font-semibold">
                                    {coords[0].toFixed(5)}°E, {coords[1].toFixed(5)}°N
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-8 bg-secondary/10 border border-dashed border-border/60 rounded-[8px] text-center text-muted-foreground/75 space-y-1.5">
                                  <Compass className="size-6 text-muted-foreground/50" />
                                  <span className="font-mono text-[10px] uppercase">Belum ada lokasi tersedia.</span>
                                </div>
                              )}
                            </div>

                            {/* 5. Activities timeline */}
                            <div className="space-y-2 border-t border-border/20 pt-3">
                              <span className="text-muted-foreground/60 block font-mono text-[9px] uppercase">
                                Timeline Aktivitas Terkini
                              </span>
                              {location?.capturedAt ? (
                                <div className="relative pl-4 border-l border-border/60 space-y-3 pt-1">
                                  <div className="relative">
                                    <span className="absolute -left-[20px] top-1 bg-primary size-2 rounded-full border border-background shadow-[0_0_4px_rgba(14,165,233,0.5)]" />
                                    <div className="flex justify-between font-mono text-[9px] text-muted-foreground/80">
                                      <span>{formatTime(location.capturedAt)}</span>
                                      <span className="text-emerald-500 font-bold">✔</span>
                                    </div>
                                    <p className="font-sans font-medium text-[11px] text-foreground mt-0.5">
                                      Ping lokasi terbaru diterima
                                    </p>
                                  </div>
                                  <div className="relative opacity-70">
                                    <span className="absolute -left-[20px] top-1 bg-muted-foreground/60 size-2 rounded-full border border-background" />
                                    <div className="flex justify-between font-mono text-[9px]">
                                      <span>{formatTime(assignment.validFrom || assignment.createdAt)}</span>
                                      <span className="text-emerald-500 font-bold">✔</span>
                                    </div>
                                    <p className="font-sans font-medium text-[11px] mt-0.5">
                                      Assignment penugasan aktif
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-6 bg-secondary/5 border border-dashed border-border/40 rounded-[8px] text-center text-muted-foreground/60">
                                  <Activity className="size-5 text-muted-foreground/45 mb-1" />
                                  <span className="text-[10px]">Belum ada riwayat aktivitas terbaru.</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-[8px] text-muted-foreground/60 text-center space-y-2">
                      <User className="size-10 stroke-[1.25] text-muted-foreground/35" />
                      <span className="font-mono text-[10px] uppercase">Detail Personel</span>
                      <p className="text-[11px] max-w-[240px]">
                        Silakan pilih personel dari daftar di panel kiri untuk menampilkan visual penugasan detail.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Jaring */}
            <TabsContent value="jaring" className="mt-3">
              <div className="grid grid-cols-1 md:grid-cols-[35%_65%] lg:grid-cols-[30%_70%] gap-4 items-stretch">
                {/* Left compact scrollable master list with Pagination */}
                <div className="rounded-[8px] border border-border bg-card overflow-hidden flex flex-col h-full">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 px-3 py-2 border-b border-border/40 bg-secondary/10 shrink-0">
                    Daftar Jaring (HUMINT)
                  </div>

                  <div className="divide-y divide-border/30 flex-1 overflow-y-auto no-scrollbar">
                    {paginatedJaring.length > 0 ? (
                      paginatedJaring.map((item) => {
                        const cluster = record(item.cluster);
                        const isSelected = selectedJaringId === text(item.id);

                        return (
                          <button
                            type="button"
                            key={text(item.id)}
                            onClick={() => setSelectedJaringId(text(item.id))}
                            className={cn(
                              "w-full text-left p-3 transition-all duration-150 cursor-pointer flex flex-col gap-1 border-l-2 relative",
                              isSelected
                                ? "bg-primary/5 border-primary text-primary"
                                : "hover:bg-[var(--dc-surface-hover)] border-transparent text-muted-foreground hover:text-foreground",
                            )}
                            style={{ contentVisibility: "auto", containIntrinsicSize: "80px" }}
                          >
                            <div className="flex items-center justify-end gap-2 min-w-0">
                              <Badge
                                variant={item.status === "ACTIVE" ? "default" : "secondary"}
                                className="scale-90 text-[8px] font-mono tracking-wider font-bold"
                              >
                                {text(item.status)}
                              </Badge>
                            </div>
                            <JaringIdentitySummary compact linkWhatsApp={false} source={jaringIdentitySource(item)} />
                            <div className="text-[9px] font-mono truncate opacity-70">
                              Cluster: {text(cluster.name)}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-muted-foreground italic">
                        Tidak ada jaring yang cocok.
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls Bar */}
                  {totalJaringPages > 1 && (
                    <div className="flex flex-col gap-2 p-3 border-t border-border/40 bg-secondary/5 text-[10.5px] font-mono shrink-0">
                      <div className="text-muted-foreground/80 text-center">
                        Menampilkan {jaringStartIdx}–{jaringEndIdx} dari {visibleJaring.length} jaring
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={jaringPage === 1}
                          onClick={() => setJaringPage(jaringPage - 1)}
                          className="h-7 text-[10px] rounded cursor-pointer border-border/60 hover:bg-accent"
                        >
                          &lt; Sebelumnya
                        </Button>

                        <div className="flex items-center gap-1">
                          {getPageNumbers(jaringPage, totalJaringPages).map((num, idx) => {
                            if (num === -1) {
                              return (
                                <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                                  ...
                                </span>
                              );
                            }
                            return (
                              <Button
                                key={`page-${num}`}
                                variant={jaringPage === num ? "default" : "ghost"}
                                size="xs"
                                onClick={() => setJaringPage(num as number)}
                                className={cn(
                                  "h-7 w-7 text-[10px] rounded p-0 cursor-pointer",
                                  jaringPage === num
                                    ? "bg-primary text-primary-foreground font-bold"
                                    : "hover:bg-accent",
                                )}
                              >
                                {num}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="xs"
                          disabled={jaringPage === totalJaringPages}
                          onClick={() => setJaringPage(jaringPage + 1)}
                          className="h-7 text-[10px] rounded cursor-pointer border-border/60 hover:bg-accent"
                        >
                          Berikutnya &gt;
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right detailed inspector panel */}
                <div className="space-y-4">
                  {selectedJaring ? (
                    (() => {
                      const item = selectedJaring;
                      const cluster = record(item.cluster);
                      const caretakers = list(item.caretakerAssignments);
                      const counts = record(item._count);

                      return (
                        <Card className="border border-border/80 bg-card rounded-[8px] overflow-hidden shadow-sm">
                          <CardHeader className="p-4 border-b border-border/40 bg-secondary/10 flex flex-col sm:flex-row justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                                  {text(item.aliasName || item.fullName || item.id)}
                                </span>
                                <Badge
                                  variant={item.status === "ACTIVE" ? "default" : "secondary"}
                                  className="text-[9px] rounded py-0 font-mono font-bold uppercase"
                                >
                                  {text(item.status)}
                                </Badge>
                              </div>
                              <CardTitle className="font-heading text-lg text-foreground font-bold tracking-tight">
                                {text(item.aliasName, "Alias Terlindung")}
                              </CardTitle>
                              <CardDescription className="font-sans text-xs text-muted-foreground">
                                Cluster: {text(cluster.name)}
                              </CardDescription>
                            </div>
                          </CardHeader>

                          <CardContent className="p-4 space-y-4 text-xs font-mono">
                            <JaringIdentitySummary source={jaringIdentitySource(item)} />

                            {/* 1. Gaswil & HUMINT proofs */}
                            <div className="grid gap-3 border-b border-border/20 pb-3">
                              <div className="space-y-1">
                                <span className="text-muted-foreground/60 block text-[9px] uppercase flex items-center gap-1">
                                  <ShieldCheck className="size-3" /> Bukti HUMINT Terkumpul
                                </span>
                                <span className="text-foreground font-bold text-xs mt-0.5 block leading-tight">
                                  {Number(counts.messages ?? 0)} pesan / {Number(counts.primaryBakets ?? 0)} Baket
                                </span>
                              </div>
                            </div>

                            {/* 3. Caretaker assignment logs */}
                            <div className="space-y-2">
                              <span className="text-muted-foreground/60 block text-[9px] uppercase">
                                Riwayat Petugas Wilayah (Gaswil)
                              </span>
                              <div className="space-y-1.5">
                                {caretakers.length > 0 ? (
                                  caretakers.map((caretaker, index) => {
                                    const off = record(record(caretaker.fieldOfficerAssignment).userProfile);
                                    return (
                                      <div
                                        key={index}
                                        className="flex justify-between items-center bg-secondary/15 border border-border/30 rounded px-2.5 py-1.5"
                                      >
                                        <span className="font-sans font-medium text-[11px] text-foreground truncate max-w-[200px]">
                                          {text(off.fullName, "Petugas Wilayah (Gaswil)")}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="scale-90 text-[8px] font-mono uppercase bg-secondary/40 border-border/55"
                                        >
                                          {text(caretaker.role || "Caretaker")}
                                        </Badge>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-muted-foreground italic text-center py-4 bg-secondary/5 border border-dashed border-border/40 rounded">
                                    Belum ada caretaker terdaftar.
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-[8px] text-muted-foreground/60 text-center space-y-2">
                      <DOMAIN_VISUALS.jaring.Icon className="size-10 stroke-[1.25] text-muted-foreground/35" />
                      <span className="font-mono text-[10px] uppercase">Detail Jaring</span>
                      <p className="text-[11px] max-w-[240px]">
                        Silakan pilih jaring dari daftar di panel kiri untuk menampilkan data relasi detail.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 2 Content: Operational GIS Map View */}
        <TabsContent value="map-gis" className="space-y-4 outline-none">
          {/* Map Toolbar (Filter & Search) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-card p-3 rounded-[3px] font-mono text-[11px] select-none">
            {/* Search Input overlay with suggestions */}
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-[11px] rounded-[3px] border-border font-mono uppercase bg-transparent"
                value={mapSearchQuery}
                onChange={(event) => setMapSearchQuery(event.target.value)}
                placeholder="CARI KOORDINAT / NAMA"
              />

              {/* Autocomplete Suggestions */}
              {mapSearchQuery.trim() && searchSuggestions.length > 0 && (
                <div className="absolute top-9 left-0 w-64 bg-card border border-border rounded-[3px] shadow-lg z-[1002] max-h-48 overflow-y-auto no-scrollbar">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      type="button"
                      key={suggestion.id}
                      onClick={() => {
                        setMapSearchQuery("");
                        handleSelectPoint(suggestion);
                      }}
                      className="w-full text-left px-3 py-2 border-b border-border/30 hover:bg-accent text-foreground truncate cursor-pointer"
                    >
                      <span className="font-bold block text-[10px]">{suggestion.fullName}</span>
                      <span className="block text-[8px] opacity-75">{suggestion.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Type Checkboxes */}
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapFilterTypes.agent}
                  onChange={(e) => setMapFilterTypes((prev) => ({ ...prev, agent: e.target.checked }))}
                  className="rounded-[2px] border-border size-3 cursor-pointer accent-primary"
                />
                <span>AGENT</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapFilterTypes.korwil}
                  onChange={(e) => setMapFilterTypes((prev) => ({ ...prev, korwil: e.target.checked }))}
                  className="rounded-[2px] border-border size-3 cursor-pointer accent-primary"
                />
                <span>KORWIL</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapFilterTypes.kabinda}
                  onChange={(e) => setMapFilterTypes((prev) => ({ ...prev, kabinda: e.target.checked }))}
                  className="rounded-[2px] border-border size-3 cursor-pointer accent-primary"
                />
                <span>KABINDA</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapFilterTypes.direktorat}
                  onChange={(e) => setMapFilterTypes((prev) => ({ ...prev, direktorat: e.target.checked }))}
                  className="rounded-[2px] border-border size-3 cursor-pointer accent-primary"
                />
                <span>DIREKTORAT</span>
              </label>
            </div>

            {/* Status & Path Toolbar Options */}
            <div className="flex items-center gap-3">
              {/* Path Checkbox */}
              <label className="flex items-center gap-1.5 cursor-pointer border-r border-border pr-3 mr-1">
                <input
                  type="checkbox"
                  checked={showTravelPath}
                  onChange={(e) => setShowTravelPath(e.target.checked)}
                  className="rounded-[2px] border-border size-3 cursor-pointer accent-primary"
                />
                <span>TAMPILKAN PERJALANAN</span>
              </label>

              <span>STATUS:</span>
              <select
                value={mapFilterStatus}
                onChange={(e: any) => setMapFilterStatus(e.target.value)}
                className="h-7 rounded-[3px] border border-border bg-transparent px-2 text-[10px] text-foreground font-mono focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-card">
                  SEMUA
                </option>
                <option value="ONLINE" className="bg-card">
                  ONLINE
                </option>
                <option value="OFFLINE" className="bg-card">
                  OFFLINE
                </option>
                <option value="EMERGENCY" className="bg-card">
                  EMERGENCY
                </option>
              </select>
            </div>
          </div>

          {/* Map Container Viewport - Occupies FULL width */}
          <div className="relative w-full h-[calc(100vh-390px)] min-h-[400px] border border-border bg-card rounded-[3px] overflow-hidden select-none">
            {/* Grid Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5 [background-image:linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] [background-size:24px_24px] z-10" />

            <BaseMap
              ref={mapRef}
              center={mapCenter}
              zoom={7}
              pitch={60}
              bearing={-20}
              minZoom={3}
              maxZoom={18}
              styles={OPENSTREETMAP_3D_STYLES}
              onMapReady={(map) => {
                map.resize();
                map.easeTo({ pitch: 60, bearing: -20, duration: 0 });
              }}
              onViewportChange={(viewport) => setMapZoom(viewport.zoom)}
              className="w-full h-full"
            >
              <MapControls showZoom showCompass showFullscreen showLocate position="top-right" />

              {/* Map Markers */}
              {gisMapNodes.map((node) => {
                if (node.isCluster) {
                  return (
                    <MapMarker key={node.id} longitude={node.coords[0]} latitude={node.coords[1]}>
                      <button
                        type="button"
                        onClick={() => {
                          const map = mapRef.current?.getMap();
                          if (map) {
                            map.flyTo({
                              center: node.coords,
                              zoom: map.getZoom() + 2,
                              duration: 1000,
                            });
                          }
                        }}
                        className="flex items-center justify-between px-2 h-7 rounded-[3px] bg-slate-900 border border-sky-400 text-sky-400 font-mono text-[10px] font-bold shadow-md cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      >
                        <DOMAIN_VISUALS.gaswil.Icon className="size-3 mr-1" />
                        {node.count} PERSONEL
                      </button>
                    </MapMarker>
                  );
                }

                const p = node.point;
                const isSelected = selectedGisPoint?.id === p.id;

                return (
                  <MapMarker key={p.id} longitude={p.coords[0]} latitude={p.coords[1]}>
                    <button
                      type="button"
                      onClick={() => handleSelectPoint(p)}
                      onContextMenu={(e) => handleRightClick(e, p.id)}
                      className={cn(
                        "flex items-center justify-center size-8 rounded-[3px] border border-white text-white transition-transform hover:scale-110 cursor-pointer select-none outline-none focus:ring-1 focus:ring-sky-400",
                        getMarkerBgAndBorder(p.kind, p.status, isSelected),
                      )}
                    >
                      {getMarkerIcon(p.kind, p.status)}
                    </button>
                  </MapMarker>
                );
              })}
            </BaseMap>

            {/* Map Coordinates Indicator overlay (bottom left, above legend/minimap) */}
            <div className="absolute bottom-3 left-3 z-10 bg-slate-950/80 backdrop-blur border border-slate-800 px-2.5 py-1.5 rounded-[3px] text-[9.5px] font-mono text-slate-300 select-none">
              LAT: {mapCenter[1].toFixed(4)}°N | LNG: {mapCenter[0].toFixed(4)}°E
            </div>

            {/* Minimap Overlay (bottom right) */}
            <div className="absolute bottom-3 right-3 z-20 w-36 h-28 border border-slate-700 bg-slate-950/90 rounded-[3px] overflow-hidden select-none pointer-events-none">
              <BaseMap
                center={mapCenter}
                zoom={Math.max(1, mapZoom - 4)}
                pitch={0}
                bearing={0}
                styles={OPENSTREETMAP_3D_STYLES}
                className="w-full h-full opacity-60"
              />
            </div>
          </div>

          {/* Horizontal Timeline Slider (Outside/below map) */}
          {selectedGisPoint && (
            <div className="border border-border bg-card p-3 rounded-[3px] font-mono text-[10px] space-y-2 select-none">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>TIMELINE PLAYBACK - HISTORI PERJALANAN AKTIF</span>
                <span className="text-primary font-bold">
                  WAKTU AKTIF:{" "}
                  {getTravelHistoryForCoords(selectedGisPoint.coords, selectedGisPoint.status)[timelineIndex]?.time ??
                    "08:00"}
                </span>
              </div>

              <div className="relative flex items-center py-1">
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={timelineIndex}
                  onChange={(e) => setTimelineIndex(Number(e.target.value))}
                  className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                <span>08.00 - DEPARTURE</span>
                <span>08.30 - TRANSIT</span>
                <span>09.00 - ARRIVED</span>
                <span>10.00 - CURRENT</span>
              </div>
            </div>
          )}

          {/* Bottom Information Panel (Grid 20% | 45% | 35%) */}
          <div className="grid grid-cols-1 md:grid-cols-[20%_45%_35%] border border-border bg-card rounded-[3px] divide-y md:divide-y-0 md:divide-x divide-border font-mono select-none">
            {/* Column 1: Legend (20%) */}
            <div className="p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="font-bold border-b border-border pb-1.5 mb-2 text-foreground tracking-wider text-[10px] uppercase">
                  GIS LEGEND
                </div>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[9.5px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 bg-blue-500 rounded-[2px]" />
                    <span>AGENT</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 bg-green-600 rounded-[2px]" />
                    <span>KORWIL</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 bg-amber-500 rounded-[2px]" />
                    <span>KABINDA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="size-3 bg-purple-800 rounded-[2px]" />
                    <span>DIREKTORAT</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/40 pt-2">
                <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground text-center">
                  <div className="flex flex-col items-center">
                    <span className="size-2 rounded-full bg-emerald-500 mb-1" />
                    <span>ONLINE</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="size-2 rounded-full bg-slate-500 mb-1" />
                    <span>OFFLINE</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="size-2 rounded-full bg-red-500 animate-pulse mb-1" />
                    <span>ALERT</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Selected Object Details (45%) */}
            <div className="p-4 flex flex-col justify-between">
              {selectedGisPoint ? (
                <div className="flex gap-4">
                  {/* Foto dan metadata profil */}
                  <div className="size-14 rounded-[3px] border border-border bg-secondary/15 flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden">
                    {selectedGisPoint.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedGisPoint.photo}
                        alt={selectedGisPoint.fullName}
                        className="size-full object-cover"
                      />
                    ) : (
                      <User className="size-6" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-[10px] space-y-1.5">
                    <div className="flex justify-between items-center min-w-0 gap-2">
                      <span className="font-bold text-[12px] text-foreground truncate">
                        {selectedGisPoint.fullName}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] tracking-wide rounded-[2px]",
                          getStatusBadgeColor(selectedGisPoint.status),
                        )}
                      >
                        {selectedGisPoint.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground">
                      <div>
                        <span className="text-[8px] uppercase block">Jabatan / Role</span>
                        <span className="text-foreground font-semibold truncate block">{selectedGisPoint.title}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase block">Unit Kerja</span>
                        <span className="text-foreground font-semibold truncate block">
                          {selectedGisPoint.unitName}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase block">Koordinat GPS</span>
                        <span className="text-foreground font-semibold truncate block">
                          {selectedGisPoint.coords[0].toFixed(5)}°E, {selectedGisPoint.coords[1].toFixed(5)}°N
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase block">Ping Terakhir</span>
                        <span className="text-foreground font-semibold block">
                          {formatTimeAgo(selectedGisPoint.location?.capturedAt)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase block">Nomor HP</span>
                        <span className="text-foreground font-semibold block">{selectedGisPoint.phone}</span>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase block">Email Resmi</span>
                        <span className="text-foreground font-semibold truncate block">{selectedGisPoint.email}</span>
                      </div>
                    </div>

                    {/* Inspector Action buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="xs"
                        className="rounded-[3px] border-border text-[9.5px] font-semibold hover:bg-accent uppercase cursor-pointer"
                        onClick={() => toast.info(`Profil ${selectedGisPoint.fullName} dibuka.`)}
                      >
                        Lihat Detail
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        className="rounded-[3px] bg-primary text-primary-foreground text-[9.5px] font-semibold hover:opacity-90 uppercase cursor-pointer"
                        onClick={() =>
                          toast.success(`Monitoring taktis diaktifkan untuk ${selectedGisPoint.fullName}.`)
                        }
                      >
                        Monitoring
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-6 space-y-1 select-none">
                  <Compass className="size-6 text-muted-foreground/35" />
                  <span className="font-bold text-[9.5px] uppercase tracking-wider">SELECTED OBJECT PARAMETERS</span>
                  <p className="text-[9px] max-w-xs">
                    Silakan pilih marker personel untuk memetakan visual unit organisasi dan data GPS.
                  </p>
                </div>
              )}
            </div>

            {/* Column 3: Travel History & Playback Replay controls (35%) */}
            <div className="p-4 flex flex-col justify-between">
              {selectedGisPoint ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-[10px] tracking-wider text-foreground uppercase">
                      TRACK LAYOUT PANEL
                    </span>

                    {/* Playback Replay Controls */}
                    <div className="flex items-center gap-1 bg-secondary/20 p-0.5 border border-border rounded-[2px]">
                      <button
                        type="button"
                        onClick={() => setTimelineIndex(0)}
                        title="Rewind"
                        className="p-1 hover:bg-accent rounded-[2px] cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPlaying(!isPlaying)}
                        title={isPlaying ? "Pause" : "Play"}
                        className="p-1 hover:bg-accent rounded-[2px] cursor-pointer font-semibold text-primary"
                      >
                        {isPlaying ? "⏸" : "▶"}
                      </button>
                      <div className="h-4 w-px bg-border mx-1" />
                      <button
                        type="button"
                        onClick={() => setPlaybackSpeed(1)}
                        className={cn(
                          "px-1 py-0.5 rounded-[2px] text-[8px] cursor-pointer",
                          playbackSpeed === 1
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground",
                        )}
                      >
                        1x
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaybackSpeed(2)}
                        className={cn(
                          "px-1 py-0.5 rounded-[2px] text-[8px] cursor-pointer",
                          playbackSpeed === 2
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground",
                        )}
                      >
                        2x
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlaybackSpeed(4)}
                        className={cn(
                          "px-1 py-0.5 rounded-[2px] text-[8px] cursor-pointer",
                          playbackSpeed === 4
                            ? "bg-primary text-primary-foreground font-bold"
                            : "text-muted-foreground",
                        )}
                      >
                        4x
                      </button>
                    </div>
                  </div>

                  {/* Travel History Vertical Nodes */}
                  <div className="flex items-center justify-between text-[8px] font-bold text-muted-foreground/80 mt-1">
                    {getTravelHistoryForCoords(selectedGisPoint.coords, selectedGisPoint.status).map((node, index) => {
                      const isActive = timelineIndex === index;
                      return (
                        <button
                          type="button"
                          key={index}
                          onClick={() => setTimelineIndex(index)}
                          className={cn(
                            "flex flex-col items-center gap-1 w-20 text-center cursor-pointer transition-colors relative group",
                            isActive ? "text-primary font-bold" : "hover:text-foreground",
                          )}
                        >
                          <span>{node.time}</span>
                          <span
                            className={cn(
                              "size-2 rounded-full border border-white transition-transform group-hover:scale-125",
                              isActive ? "bg-primary ring-2 ring-primary/20 scale-110" : "bg-muted-foreground/40",
                            )}
                          />
                          <span className="truncate w-full block text-[7.5px] opacity-75">{node.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-6 space-y-1 select-none">
                  <Clock className="size-6 text-muted-foreground/35" />
                  <span className="font-bold text-[9.5px] uppercase tracking-wider">TRAVEL PLAYBACK</span>
                  <p className="text-[9px] max-w-xs">
                    Garis koordinat history perjalanan dan kontrol playback akan muncul di panel ini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Right Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-[9999] bg-card border border-border rounded-[3px] shadow-lg py-1 w-32 font-mono text-[9px] uppercase tracking-wider text-foreground select-none animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              toast.info("Navigasi ke koordinat target diaktifkan.");
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-1.5 cursor-pointer text-foreground"
          >
            <Compass className="size-3 text-sky-400" /> Navigasi
          </button>
          <button
            type="button"
            onClick={() => {
              const pt = mapPoints.find((p) => p.id === contextMenu.pointId);
              if (pt) handleSelectPoint(pt);
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-1.5 cursor-pointer text-foreground"
          >
            <User className="size-3 text-sky-400" /> Detail
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              toast.info("Riwayat pergerakan taktis dibuka.");
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-1.5 cursor-pointer text-foreground"
          >
            <Clock className="size-3 text-sky-400" /> Riwayat
          </button>
          <button
            type="button"
            onClick={() => {
              setContextMenu(null);
              toast.info("Laporan intelijen personel dibuka.");
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-accent flex items-center gap-1.5 cursor-pointer text-foreground"
          >
            <Mail className="size-3 text-sky-400" /> Laporan
          </button>
        </div>
      )}
    </main>
  );
}
