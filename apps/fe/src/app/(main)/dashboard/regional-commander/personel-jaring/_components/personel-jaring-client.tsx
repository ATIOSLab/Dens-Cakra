"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  Building2,
  Clock,
  Compass,
  Mail,
  MapPin,
  Network,
  Phone,
  Radio,
  Search,
  ShieldCheck,
  User,
  UserRoundCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map as BaseMap, MapMarker } from "@/components/ui/map";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(record) : [];
}

function text(value: unknown, fallback = "Belum tersedia") {
  return typeof value === "string" && value.trim() ? value : fallback;
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
      return [profile.fullName, profile.username, position.title, unit.name, areaLabels(assignment)]
        .map((value) => text(value, "").toLocaleLowerCase("id-ID"))
        .some((value) => value.includes(normalizedSearch));
    });
  }, [assignments, normalizedSearch]);

  const visibleJaring = useMemo(() => {
    return jaring.filter((item) => {
      const cluster = record(item.cluster);
      return [item.code, item.aliasName, cluster.name]
        .map((value) => text(value, "").toLocaleLowerCase("id-ID"))
        .some((value) => value.includes(normalizedSearch));
    });
  }, [jaring, normalizedSearch]);

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

  // Derive status color badge/dot
  const deriveStatus = (assignment: DataRecord, location: any) => {
    if (!location?.hasLiveLocation || !location?.capturedAt) {
      return "OFFLINE";
    }
    const age = Date.now() - new Date(location.capturedAt).getTime();
    if (age > 5 * 60 * 1000) {
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
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
      case "SUPERVISOR":
        return "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]";
      case "DUTY":
        return "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]";
      case "EMERGENCY":
        return "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]";
      default:
        return "bg-neutral-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "Aktif";
      case "SUPERVISOR":
        return "Supervisor";
      case "DUTY":
        return "Sedang Bertugas";
      case "EMERGENCY":
        return "Emergency";
      default:
        return "Offline";
    }
  };

  const unitCount = new Set(assignments.map((item) => text(record(record(item.position).organizationUnit).id, "")))
    .size;
  const liveCount = assignments.filter((item) => {
    const loc = locationMap.get(text(item.id, ""));
    return Boolean(loc?.hasLiveLocation);
  }).length;
  const activeJaring = jaring.filter((item) => item.status === "ACTIVE").length;

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
    <main className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="border-b pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Need-to-know command scope
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold">Personel, Organisasi & Jaring</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Seluruh data di bawah berasal dari assignment aktif yang berada dalam rantai komando Anda. Lokasi stealth
          tidak ditampilkan.
        </p>
      </header>

      {/* Stats row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan command network">
        {[
          { label: "Personel bawahan", value: assignments.length, icon: Users },
          { label: "Unit organisasi", value: unitCount, icon: Building2 },
          { label: "Lokasi aktual tersedia", value: liveCount, icon: Radio },
          { label: "Jaring aktif", value: activeJaring, icon: Network },
        ].map((metric) => (
          <Card key={metric.label} size="sm" className="rounded-[8px]">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-1 font-mono text-2xl font-semibold">{metric.value}</p>
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
          placeholder="Cari personel, unit, wilayah, atau jaring"
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
                        <div className="flex items-center justify-between text-[9px] font-mono opacity-65 mt-1 border-t border-border/10 pt-1">
                          <span>{areaLabels(assignment)}</span>
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
                      &lt; Previous
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
                      Next &gt;
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
                              className={`font-mono text-[9px] rounded px-1.5 py-0 uppercase border-transparent text-white ${status === "EMERGENCY" ? "bg-red-600" : status === "SUPERVISOR" ? "bg-blue-600" : status === "DUTY" ? "bg-orange-500" : status === "ACTIVE" ? "bg-emerald-600" : "bg-neutral-600"}`}
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
                      </CardHeader>

                      <CardContent className="p-4 space-y-4 text-xs">
                        {/* 1. Grid of detailed properties */}
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 border-b border-border/20 pb-3 font-mono">
                          <div>
                            <span className="text-muted-foreground/60 block text-[9px] uppercase">Peran & Seat</span>
                            <span className="text-foreground font-bold mt-0.5 block leading-tight">
                              {text(role.name)} / {text(position.seatCode)}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground/60 block text-[9px] uppercase">Email</span>
                            <span className="text-foreground font-bold mt-0.5 block leading-tight truncate flex items-center gap-1">
                              <Mail className="size-3 text-muted-foreground/60" />
                              {text(profile.email, "-")}
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
                            <span className="text-muted-foreground/60 block text-[9px] uppercase">Wilayah Tugas</span>
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
                                minZoom={3}
                                maxZoom={15}
                                styles={{
                                  light: "https://tiles.openfreemap.org/styles/liberty",
                                  dark: "https://tiles.openfreemap.org/styles/liberty",
                                }}
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
                                <p className="font-sans font-medium text-[11px] mt-0.5">Assignment penugasan aktif</p>
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
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="font-sans font-bold text-[11px] text-foreground truncate max-w-[170px]">
                            {text(item.aliasName, "Alias Terlindung")}
                          </span>
                          <Badge
                            variant={item.status === "ACTIVE" ? "default" : "secondary"}
                            className="scale-90 text-[8px] font-mono tracking-wider font-bold"
                          >
                            {text(item.status)}
                          </Badge>
                        </div>
                        <div className="text-[9px] font-mono truncate opacity-70">
                          {text(item.code)} / {text(cluster.name)}
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
                      &lt; Previous
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
                              jaringPage === num ? "bg-primary text-primary-foreground font-bold" : "hover:bg-accent",
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
                      Next &gt;
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
                  const coverage = list(item.areaCoverages);
                  const counts = record(item._count);
                  const officer = record(record(record(caretakers[0]).fieldOfficerAssignment).userProfile);

                  return (
                    <Card className="border border-border/80 bg-card rounded-[8px] overflow-hidden shadow-sm">
                      <CardHeader className="p-4 border-b border-border/40 bg-secondary/10 flex flex-col sm:flex-row justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                              {text(item.code)}
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
                        {/* 1. Handler & HUMINT proofs */}
                        <div className="grid gap-3 sm:grid-cols-2 border-b border-border/20 pb-3">
                          <div className="space-y-1">
                            <span className="text-muted-foreground/60 block text-[9px] uppercase flex items-center gap-1">
                              <UserRoundCheck className="size-3" /> Handler Aktif
                            </span>
                            <span className="text-foreground font-sans font-bold text-xs mt-0.5 block leading-tight">
                              {text(officer.fullName, "Belum ditetapkan")}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="text-muted-foreground/60 block text-[9px] uppercase flex items-center gap-1">
                              <ShieldCheck className="size-3" /> Bukti HUMINT Terkumpul
                            </span>
                            <span className="text-foreground font-bold text-xs mt-0.5 block leading-tight">
                              {Number(counts.messages ?? 0)} pesan / {Number(counts.primaryBakets ?? 0)} Baket
                            </span>
                          </div>
                        </div>

                        {/* 2. Coverage areas */}
                        <div className="space-y-1 border-b border-border/20 pb-3">
                          <span className="text-muted-foreground/60 block text-[9px] uppercase">
                            Wilayah Coverage Aktif
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1 font-sans">
                            {coverage.length > 0 ? (
                              coverage.map((entry) => (
                                <Badge
                                  key={text(entry.id)}
                                  variant="outline"
                                  className="text-[9px] border-border/60 bg-secondary/20 px-2 py-0"
                                >
                                  {text(record(entry.area).name, "")}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic text-xs">Belum ditetapkan</span>
                            )}
                          </div>
                        </div>

                        {/* 3. Caretaker assignment logs */}
                        <div className="space-y-2">
                          <span className="text-muted-foreground/60 block text-[9px] uppercase">
                            Daftar Caretaker / Handler History
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
                                      {text(off.fullName, "Handler")}
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
                  <Network className="size-10 stroke-[1.25] text-muted-foreground/35" />
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
    </main>
  );
}
