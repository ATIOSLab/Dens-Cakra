"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Activity,
  BriefcaseBusiness,
  ChevronDown,
  EyeOff,
  Filter,
  History,
  Map as MapIcon,
  Radio,
  RotateCcw,
  Search,
  ShieldCheck,
  Signal,
  SlidersHorizontal,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import type { Map as MapLibreMap } from "maplibre-gl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Map as BaseMap, type MapRef } from "@/components/ui/map";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type UnitId = "utara" | "barat" | "selatan" | "jawa" | "kalimantan";
type PersonnelRole = "Agent" | "Petugas Organik";
type PersonnelStatus = "Aktif" | "Siaga" | "Stealth" | "Offline";
type SourceStatus = "Aktif" | "Perlu Validasi" | "Dormant";
type ViewMode = "overview" | "personel" | "jaring" | "riwayat";
type MarkerLayer = "semua" | "agent" | "organik" | "jaring";
type StyleKey = keyof typeof mapStyles;

type Assignment = {
  id: string;
  title: string;
  unitId: UnitId;
  priority: "Tinggi" | "Sedang" | "Normal";
  status: "Berjalan" | "Perlu Supervisi" | "Selesai";
  deadline: string;
};

type Personnel = {
  id: string;
  name: string;
  role: PersonnelRole;
  unitId: UnitId;
  status: PersonnelStatus;
  lastPosition: string;
  lastSeen: string;
  activeTaskIds: string[];
  productivity: number;
  coverage: number;
  workload: number;
  reports: number;
  sourceIds: string[];
  stealth: boolean;
  x: number;
  y: number;
  history: {
    time: string;
    title: string;
    note: string;
  }[];
};

type Source = {
  id: string;
  pseudonym: string;
  unitId: UnitId;
  handlerId: string;
  status: SourceStatus;
  reliability: string;
  coverageArea: string;
  lastIntake: string;
  incoming: number;
  valid: number;
  activeTaskId: string;
  risk: "Normal" | "Pantau" | "Sensitif";
  x: number;
  y: number;
};

const units: Record<
  UnitId,
  {
    name: string;
    sector: string;
    color: string;
  }
> = {
  utara: { name: "Wilayah Utara", sector: "Sektor Alfa", color: "bg-sky-500" },
  barat: { name: "Wilayah Barat", sector: "Sektor Bravo", color: "bg-amber-500" },
  selatan: { name: "Wilayah Selatan", sector: "Sektor Delta", color: "bg-rose-500" },
  jawa: { name: "Koridor Jawa", sector: "Sektor Foxtrot", color: "bg-violet-500" },
  kalimantan: { name: "Kalimantan Timur", sector: "Sektor Golf", color: "bg-emerald-500" },
};

const assignments: Assignment[] = [
  {
    id: "REG-ASG-001",
    title: "Pemenuhan UUK wilayah utara",
    unitId: "utara",
    priority: "Tinggi",
    status: "Berjalan",
    deadline: "Hari ini 18:00",
  },
  {
    id: "REG-ASG-002",
    title: "Observasi simpul logistik barat",
    unitId: "barat",
    priority: "Sedang",
    status: "Perlu Supervisi",
    deadline: "Besok 10:00",
  },
  {
    id: "REG-ASG-003",
    title: "Validasi informasi kanal warga selatan",
    unitId: "selatan",
    priority: "Tinggi",
    status: "Berjalan",
    deadline: "Hari ini 21:00",
  },
  {
    id: "REG-ASG-004",
    title: "Monitoring tuntutan lintas komunitas",
    unitId: "jawa",
    priority: "Sedang",
    status: "Berjalan",
    deadline: "14 Jul 09:00",
  },
  {
    id: "REG-ASG-005",
    title: "Coverage objek vital pesisir timur",
    unitId: "kalimantan",
    priority: "Normal",
    status: "Selesai",
    deadline: "Selesai 10 Jul",
  },
];

const personnel: Personnel[] = [
  {
    id: "KOR-001",
    name: "Damar Prakoso",
    role: "Agent",
    unitId: "barat",
    status: "Aktif",
    lastPosition: "Pekanbaru Barat",
    lastSeen: "08:42 WIB",
    activeTaskIds: ["REG-ASG-002"],
    productivity: 88,
    coverage: 84,
    workload: 72,
    reports: 12,
    sourceIds: ["JRG-BR-014", "JRG-BR-021"],
    stealth: false,
    x: 34,
    y: 48,
    history: [
      { time: "08:42", title: "Update posisi", note: "Koordinasi coverage simpul barat." },
      { time: "07:15", title: "Supervisi tugas", note: "REG-ASG-002 diberi catatan penguatan bukti." },
    ],
  },
  {
    id: "PTO-011",
    name: "Raka Mahendra",
    role: "Petugas Organik",
    unitId: "utara",
    status: "Aktif",
    lastPosition: "Bukit Datuk, Dumai",
    lastSeen: "09:10 WIB",
    activeTaskIds: ["REG-ASG-001"],
    productivity: 81,
    coverage: 76,
    workload: 66,
    reports: 9,
    sourceIds: ["JRG-UT-008"],
    stealth: false,
    x: 51,
    y: 31,
    history: [
      { time: "09:10", title: "Laporan singkat", note: "Metadata GPS dan foto pendukung lengkap." },
      { time: "06:50", title: "Baca tugas", note: "Read receipt REG-ASG-001 tercatat." },
    ],
  },
  {
    id: "PTO-016",
    name: "Nadia Salsabila",
    role: "Petugas Organik",
    unitId: "selatan",
    status: "Stealth",
    lastPosition: "Jambi Selatan",
    lastSeen: "Mode stealth aktif",
    activeTaskIds: ["REG-ASG-003"],
    productivity: 93,
    coverage: 79,
    workload: 68,
    reports: 14,
    sourceIds: ["JRG-SL-033", "JRG-SL-041"],
    stealth: true,
    x: 62,
    y: 67,
    history: [
      { time: "12:15", title: "Stealth aktif", note: "Lokasi detail dibatasi sesuai kebijakan operasi." },
      { time: "10:30", title: "Validasi intake", note: "2 informasi jaring masuk ke antrean pemeriksaan." },
    ],
  },
  {
    id: "KOR-004",
    name: "Bima Santoso",
    role: "Agent",
    unitId: "jawa",
    status: "Siaga",
    lastPosition: "Jakarta Timur",
    lastSeen: "10:25 WIB",
    activeTaskIds: ["REG-ASG-004"],
    productivity: 77,
    coverage: 71,
    workload: 58,
    reports: 8,
    sourceIds: ["JRG-JW-010"],
    stealth: false,
    x: 71,
    y: 44,
    history: [
      { time: "10:25", title: "Koordinasi Agent", note: "Menyiapkan rotasi coverage koridor Jawa." },
      { time: "08:05", title: "Status siaga", note: "Agent cadangan disiapkan untuk REG-ASG-004." },
    ],
  },
  {
    id: "PTO-022",
    name: "Ardiansyah Noor",
    role: "Petugas Organik",
    unitId: "kalimantan",
    status: "Aktif",
    lastPosition: "Balikpapan Utara",
    lastSeen: "11:20 WIB",
    activeTaskIds: ["REG-ASG-005"],
    productivity: 84,
    coverage: 82,
    workload: 41,
    reports: 7,
    sourceIds: ["JRG-KL-019"],
    stealth: false,
    x: 80,
    y: 58,
    history: [
      { time: "11:20", title: "Coverage selesai", note: "Objek vital pesisir timur sudah tertutup." },
      { time: "09:40", title: "Sinkronisasi kanal", note: "JRG-KL-019 mengirim metadata lokasi tambahan." },
    ],
  },
  {
    id: "PTO-027",
    name: "Seno Wicaksono",
    role: "Petugas Organik",
    unitId: "barat",
    status: "Offline",
    lastPosition: "Rokan Hilir",
    lastSeen: "Kemarin 22:30",
    activeTaskIds: [],
    productivity: 64,
    coverage: 59,
    workload: 24,
    reports: 4,
    sourceIds: [],
    stealth: false,
    x: 28,
    y: 36,
    history: [
      { time: "22:30", title: "Offline terjadwal", note: "Perangkat masuk pemeliharaan konektivitas." },
      { time: "20:15", title: "Tugas selesai", note: "Tidak ada tugas aktif tertinggal." },
    ],
  },
];

const sources: Source[] = [
  {
    id: "JRG-BR-014",
    pseudonym: "Sumber Anggrek-14",
    unitId: "barat",
    handlerId: "KOR-001",
    status: "Aktif",
    reliability: "B2",
    coverageArea: "Pasar dan simpul logistik barat",
    lastIntake: "09:05 WIB",
    incoming: 6,
    valid: 5,
    activeTaskId: "REG-ASG-002",
    risk: "Pantau",
    x: 39,
    y: 53,
  },
  {
    id: "JRG-BR-021",
    pseudonym: "Sumber Meranti-21",
    unitId: "barat",
    handlerId: "KOR-001",
    status: "Dormant",
    reliability: "C3",
    coverageArea: "Komunitas transportasi",
    lastIntake: "2 hari lalu",
    incoming: 2,
    valid: 1,
    activeTaskId: "REG-ASG-002",
    risk: "Normal",
    x: 31,
    y: 59,
  },
  {
    id: "JRG-UT-008",
    pseudonym: "Sumber Bukit Datuk-08",
    unitId: "utara",
    handlerId: "PTO-011",
    status: "Aktif",
    reliability: "B1",
    coverageArea: "Komunitas Kilang Bukit Datuk",
    lastIntake: "08:55 WIB",
    incoming: 7,
    valid: 6,
    activeTaskId: "REG-ASG-001",
    risk: "Sensitif",
    x: 55,
    y: 25,
  },
  {
    id: "JRG-SL-033",
    pseudonym: "Sumber Cendana-33",
    unitId: "selatan",
    handlerId: "PTO-016",
    status: "Perlu Validasi",
    reliability: "C2",
    coverageArea: "Komunitas perkebunan selatan",
    lastIntake: "12:05 WIB",
    incoming: 4,
    valid: 2,
    activeTaskId: "REG-ASG-003",
    risk: "Pantau",
    x: 66,
    y: 72,
  },
  {
    id: "JRG-SL-041",
    pseudonym: "Sumber Nusa-41",
    unitId: "selatan",
    handlerId: "PTO-016",
    status: "Aktif",
    reliability: "B2",
    coverageArea: "Sentra logistik Jambi",
    lastIntake: "11:35 WIB",
    incoming: 5,
    valid: 4,
    activeTaskId: "REG-ASG-003",
    risk: "Normal",
    x: 58,
    y: 74,
  },
  {
    id: "JRG-JW-010",
    pseudonym: "Sumber Wijaya-10",
    unitId: "jawa",
    handlerId: "KOR-004",
    status: "Aktif",
    reliability: "B2",
    coverageArea: "Koridor komunitas Jakarta-Surabaya",
    lastIntake: "10:12 WIB",
    incoming: 3,
    valid: 3,
    activeTaskId: "REG-ASG-004",
    risk: "Sensitif",
    x: 75,
    y: 39,
  },
  {
    id: "JRG-KL-019",
    pseudonym: "Sumber Mahakam-19",
    unitId: "kalimantan",
    handlerId: "PTO-022",
    status: "Aktif",
    reliability: "A2",
    coverageArea: "Kawasan industri Kariangau",
    lastIntake: "11:05 WIB",
    incoming: 5,
    valid: 5,
    activeTaskId: "REG-ASG-005",
    risk: "Normal",
    x: 84,
    y: 62,
  },
];

const statusTone: Record<PersonnelStatus | SourceStatus, string> = {
  Aktif: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Siaga: "border-sky-500/40 bg-sky-500/10 text-sky-300",
  Stealth: "border-violet-500/40 bg-violet-500/10 text-violet-300",
  Offline: "border-zinc-600 bg-zinc-500/10 text-zinc-300",
  "Perlu Validasi": "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Dormant: "border-zinc-600 bg-zinc-500/10 text-zinc-300",
};

const priorityTone: Record<Assignment["priority"], string> = {
  Tinggi: "text-rose-300",
  Sedang: "text-amber-300",
  Normal: "text-emerald-300",
};

const mapStyles = {
  default: undefined,
  openstreetmap: "https://tiles.openfreemap.org/styles/bright",
  openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
};

const getGeographicCoordinates = (item: { id: string; x: number; y: number; unitId: UnitId }): [number, number] => {
  const baseCoords: Record<UnitId, [number, number]> = {
    barat: [101.4478, 0.5071],      // Pekanbaru
    utara: [101.4200, 1.6300],      // Dumai (Inland)
    selatan: [103.6131, -1.6115],   // Jambi / Sumatra Selatan
    jawa: [106.8973, -6.2250],      // Jakarta
    kalimantan: [116.8283, -1.2654] // Balikpapan
  };

  let base = baseCoords[item.unitId] || baseCoords.barat;
  if (item.id === "PTO-027") {
    base = [100.8143, 2.1557]; // Rokan Hilir
  }

  // Offset markers locally around their respective city center so they don't overlap
  const lngOffset = (item.x - 50) * 0.0008;
  const latOffset = (item.y - 50) * 0.0006;

  return [base[0] + lngOffset, base[1] - latOffset];
};

function average(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

export function PersonelJaringPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("overview");
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitId | "semua">("semua");
  const [statusFilter, setStatusFilter] = useState<PersonnelStatus | "semua">("semua");
  const [markerLayer, setMarkerLayer] = useState<MarkerLayer>("semua");
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(personnel[0].id);
  const [showStealth, setShowStealth] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState(false);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredPersonnel = useMemo(
    () =>
      personnel.filter((item) => {
        const assignmentLabels = item.activeTaskIds
          .map((id) => assignments.find((assignment) => assignment.id === id)?.title ?? id)
          .join(" ");
        const matchQuery = [item.name, item.id, item.role, item.lastPosition, units[item.unitId].name, assignmentLabels]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
        const matchUnit = unitFilter === "semua" || item.unitId === unitFilter;
        const matchStatus = statusFilter === "semua" || item.status === statusFilter;

        return matchQuery && matchUnit && matchStatus;
      }),
    [normalizedQuery, statusFilter, unitFilter],
  );

  const filteredSources = useMemo(
    () =>
      sources.filter((source) => {
        const handler = personnel.find((item) => item.id === source.handlerId);
        const assignment = assignments.find((item) => item.id === source.activeTaskId);
        const matchQuery = [
          source.id,
          source.pseudonym,
          source.coverageArea,
          handler?.name,
          assignment?.title,
          units[source.unitId].name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
        const matchUnit = unitFilter === "semua" || source.unitId === unitFilter;

        return matchQuery && matchUnit;
      }),
    [normalizedQuery, unitFilter],
  );

  const selectedPersonnel = personnel.find((item) => item.id === selectedPersonnelId) ?? personnel[0];
  const selectedAssignments = assignments.filter((assignment) =>
    selectedPersonnel?.activeTaskIds.includes(assignment.id),
  );
  const selectedSources = sources.filter((source) => selectedPersonnel?.sourceIds.includes(source.id));

  const activePersonnel = personnel.filter((item) => item.status !== "Offline").length;
  const activeSources = sources.filter((item) => item.status === "Aktif").length;
  const stealthCount = personnel.filter((item) => item.stealth).length;
  const averageCoverage = average(personnel.map((item) => item.coverage));
  const averageWorkload = average(personnel.map((item) => item.workload));

  const visiblePersonnel = showStealth
    ? filteredPersonnel
    : filteredPersonnel.filter((item) => item.status !== "Stealth");
  const historyRows = expandedHistory
    ? (selectedPersonnel?.history ?? [])
    : (selectedPersonnel?.history.slice(0, 1) ?? []);

  const resetFilters = () => {
    setQuery("");
    setUnitFilter("semua");
    setStatusFilter("semua");
    setMarkerLayer("semua");
    setShowStealth(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <section className="flex flex-col gap-4 border-b pb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-2">
                <ShieldCheck className="size-3.5" />
                Komandan Regional
              </Badge>
              <Badge variant="outline" className="gap-2 border-violet-500/40 text-violet-300">
                <EyeOff className="size-3.5" />
                Need-to-know
              </Badge>
            </div>
            <div>
              <h1 className="font-semibold text-2xl tracking-normal">Personel & Jaring</h1>
              <p className="mt-1 text-muted-foreground">
                Kendali Agent, Petugas Organik, dan Jaring pseudonym dalam scope wilayah regional.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-[260px]">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
              placeholder="Cari agent, jaring, wilayah, tugas"
            />
          </div>
          <Button variant="outline" className="gap-2" onClick={resetFilters}>
            <RotateCcw className="size-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          icon={UsersRound}
          label="Agent aktif"
          value={`${activePersonnel}/${personnel.length}`}
          note="Agent dan petugas"
        />
        <MetricCard
          icon={Radio}
          label="Jaring aktif"
          value={`${activeSources}/${sources.length}`}
          note="Jaring pseudonym"
        />
        <MetricCard icon={MapIcon} label="Coverage area" value={`${averageCoverage}%`} note="Rata-rata wilayah" />
        <MetricCard
          icon={BriefcaseBusiness}
          label="Beban kerja"
          value={`${averageWorkload}%`}
          note="Rata-rata aktif"
        />
        <MetricCard icon={EyeOff} label="Mode stealth" value={String(stealthCount)} note="Akses lokasi dibatasi" />
      </div>
    </section>

    <section className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "overview", label: "Ringkasan", icon: Activity },
          { value: "personel", label: "Agent", icon: UserRoundCheck },
          { value: "jaring", label: "Jaring", icon: Radio },
          { value: "riwayat", label: "Riwayat Penugasan", icon: History },
        ].map((item) => (
            <Button
              key={item.value}
              variant={viewMode === item.value ? "default" : "outline"}
              className="gap-2"
              onClick={() => setViewMode(item.value as ViewMode)}
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={unitFilter} onValueChange={(value) => setUnitFilter(value as UnitId | "semua")}>
            <SelectTrigger className="w-[180px]">
              <Filter className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua wilayah</SelectItem>
              {Object.entries(units).map(([id, unit]) => (
                <SelectItem key={id} value={id}>
                  {unit.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PersonnelStatus | "semua")}>
            <SelectTrigger className="w-[160px]">
              <SlidersHorizontal className="size-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              <SelectItem value="Aktif">Aktif</SelectItem>
              <SelectItem value="Siaga">Siaga</SelectItem>
              <SelectItem value="Stealth">Stealth</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="min-w-0 overflow-hidden rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">Posisi Terakhir & Coverage Area</h2>
              <p className="text-muted-foreground text-sm">
                Sebaran Agent, Petugas Organik, dan Jaring pseudonym sesuai scope wilayah.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={markerLayer} onValueChange={(value) => setMarkerLayer(value as MarkerLayer)}>
                <SelectTrigger className="w-[150px]">
                  <MapIcon className="size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua layer</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                  <SelectItem value="organik">Petugas Organik</SelectItem>
                  <SelectItem value="jaring">Jaring</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <EyeOff className="size-4 text-violet-300" />
                <span>Mode stealth</span>
                <Switch
                  checked={showStealth}
                  onCheckedChange={setShowStealth}
                  aria-label="Tampilkan personel mode stealth"
                />
              </div>
            </div>
          </div>

          <OperationalMap
            markerLayer={markerLayer}
            personnelItems={visiblePersonnel}
            sourceItems={filteredSources}
            selectedPersonnelId={selectedPersonnel?.id ?? ""}
            onSelectPersonnel={setSelectedPersonnelId}
          />
        </div>

        {selectedPersonnel ? (
          <DetailPanel personnelItem={selectedPersonnel} assignments={selectedAssignments} sources={selectedSources} />
        ) : null}
      </section>

      {(viewMode === "overview" || viewMode === "personel") && (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredPersonnel.map((item) => (
            <PersonnelCard
              key={item.id}
              item={item}
              selected={item.id === selectedPersonnel?.id}
              onSelect={setSelectedPersonnelId}
            />
          ))}
        </section>
      )}

      {(viewMode === "overview" || viewMode === "jaring") && (
        <section className="grid gap-4 lg:grid-cols-2">
          {filteredSources.map((source) => (
            <SourceCard key={source.id} source={source} onSelectPersonnel={setSelectedPersonnelId} />
          ))}
        </section>
      )}

      {(viewMode === "overview" || viewMode === "riwayat") && selectedPersonnel ? (
        <section className="rounded-lg border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div>
              <h2 className="font-semibold">Riwayat Penugasan</h2>
              <p className="text-muted-foreground text-sm">
                {selectedPersonnel.name} dalam aktivitas operasional terakhir.
              </p>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => setExpandedHistory((value) => !value)}>
              <ChevronDown className={cn("size-4 transition-transform", expandedHistory && "rotate-180")} />
              {expandedHistory ? "Tampilkan ringkas" : "Lihat lebih banyak"}
            </Button>
          </div>
          <div className="divide-y">
            {historyRows.map((row) => (
              <div key={`${row.time}-${row.title}`} className="grid gap-2 p-4 sm:grid-cols-[90px_1fr]">
                <div className="font-medium text-muted-foreground text-sm">{row.time}</div>
                <div>
                  <div className="font-medium">{row.title}</div>
                  <p className="text-muted-foreground text-sm">{row.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof UsersRound;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="mt-2 font-semibold text-2xl tracking-normal">{value}</p>
        </div>
        <div className="rounded-md border bg-background p-2">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-muted-foreground text-xs">{note}</p>
    </div>
  );
}
function OperationalMap({
  markerLayer,
  personnelItems,
  sourceItems,
  selectedPersonnelId,
  onSelectPersonnel,
}: {
  markerLayer: MarkerLayer;
  personnelItems: Personnel[];
  sourceItems: Source[];
  selectedPersonnelId: string;
  onSelectPersonnel: (id: string) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [positions, setPositions] = useState<Record<string, { left: number; top: number }>>({});
  const [style, setStyle] = useState<StyleKey>("openstreetmap3d");
  const [mapZoom, setMapZoom] = useState(15);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const selectedStyle = mapStyles[style];
  const appliedStyles = useMemo(
    () => (selectedStyle ? { light: selectedStyle, dark: selectedStyle } : undefined),
    [selectedStyle],
  );
  const is3D = style === "openstreetmap3d";
  const showLabels = mapZoom >= 16.25;
  const markerScale = Math.min(1.85, Math.max(0.68, 1 + (mapZoom - 15) * 0.26));

  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3D ? 60 : 0, duration: 500 });
  }, [is3D]);

  useEffect(() => {
    if (!selectedPersonnelId || !mapInstance) return;

    const selectedItem = personnelItems.find((p) => p.id === selectedPersonnelId);
    if (!selectedItem) return;

    const geo = getGeographicCoordinates(selectedItem);
    mapRef.current?.easeTo({
      center: geo,
      zoom: 14.5,
      pitch: 55,
      duration: 1200,
    });
  }, [selectedPersonnelId, mapInstance, personnelItems]);

  useEffect(() => {
    if (!mapInstance) {
      setPositions({});
      return;
    }

    const updatePositions = () => {
      setMapZoom(mapInstance.getZoom());
      const allItems = [...personnelItems, ...sourceItems];
      const newPositions = Object.fromEntries(
        allItems.map((item) => {
          const geo = getGeographicCoordinates(item);
          const projected = mapInstance.project(geo);
          return [item.id, { left: projected.x, top: projected.y }];
        }),
      );
      setPositions(newPositions);
    };

    updatePositions();
    mapInstance.on("move", updatePositions);
    mapInstance.on("resize", updatePositions);
    mapInstance.on("zoom", updatePositions);

    return () => {
      mapInstance.off("move", updatePositions);
      mapInstance.off("resize", updatePositions);
      mapInstance.off("zoom", updatePositions);
    };
  }, [mapInstance, personnelItems, sourceItems]);

  return (
    <div className={cn("relative h-[620px] w-full overflow-hidden transition-colors duration-300", is3D ? "bg-[#f8f4f0]" : "bg-[#0b0d0c]")}>
      <BaseMap
        key={style}
        ref={mapRef}
        center={[108.0, -1.5]}
        zoom={5}
        pitch={0}
        bearing={0}
        onMapReady={(map) => {
          setMapInstance(map);
          setMapZoom(map.getZoom());
          map.resize();
        }}
        styles={appliedStyles}
      />
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="pointer-events-auto absolute top-4 left-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
          <MapBadge icon={Signal} label={`${personnelItems.length} agent tampil`} />
          <MapBadge icon={Radio} label={`${sourceItems.length} jaring pseudonym`} />
        </div>

        <div className="pointer-events-auto absolute top-4 right-4">
          <select
            value={style}
            onChange={(event) => setStyle(event.target.value as StyleKey)}
            className="rounded-md border bg-background px-3 py-2 font-medium text-foreground text-sm shadow"
          >
            <option value="default">Default (Carto)</option>
            <option value="openstreetmap">OpenStreetMap</option>
            <option value="openstreetmap3d">OpenStreetMap 3D</option>
          </select>
        </div>

        {/* Render Agent Markers */}
        {(markerLayer === "semua" || markerLayer === "agent") &&
          personnelItems
            .filter((item) => item.role === "Agent")
            .map((item) => {
              const position = positions[item.id];
              if (!position) return null;

              const isSelected = item.id === selectedPersonnelId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPersonnel(item.id)}
                  className={cn(
                    "pointer-events-auto absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md border bg-background/90 text-left shadow-xl backdrop-blur transition-all duration-200 hover:border-foreground/50",
                    isSelected
                      ? "border-foreground bg-foreground text-background px-3 py-2 max-w-[250px] z-30"
                      : "size-4 max-w-none rounded-full border-2 border-background/20 p-0 shadow-md",
                  )}
                  style={{
                    left: position.left,
                    top: position.top,
                    transform: `translate(-50%, -50%) scale(${markerScale})`,
                  }}
                  title={item.name}
                >
                  {isSelected ? (
                    <>
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md text-white",
                          units[item.unitId].color,
                        )}
                      >
                        {item.stealth ? <EyeOff className="size-4 text-violet-100" /> : <UserRoundCheck className="size-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-sm leading-tight">{item.name}</span>
                        <span className="block truncate text-[10px] leading-tight opacity-75">
                          {item.role} | {units[item.unitId].name}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className={cn("block size-full rounded-full", units[item.unitId].color)} />
                  )}
                </button>
              );
            })}

        {/* Render Petugas Organik Markers */}
        {(markerLayer === "semua" || markerLayer === "organik") &&
          personnelItems
            .filter((item) => item.role === "Petugas Organik")
            .map((item) => {
              const position = positions[item.id];
              if (!position) return null;

              const isSelected = item.id === selectedPersonnelId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectPersonnel(item.id)}
                  className={cn(
                    "pointer-events-auto absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md border bg-background/90 text-left shadow-xl backdrop-blur transition-all duration-200 hover:border-foreground/50",
                    isSelected
                      ? "border-foreground bg-foreground text-background px-3 py-2 max-w-[250px] z-30"
                      : "size-4 max-w-none rounded-full border-2 border-background/20 p-0 shadow-md",
                  )}
                  style={{
                    left: position.left,
                    top: position.top,
                    transform: `translate(-50%, -50%) scale(${markerScale})`,
                  }}
                  title={item.name}
                >
                  {isSelected ? (
                    <>
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-md text-white",
                          units[item.unitId].color,
                        )}
                      >
                        {item.stealth ? <EyeOff className="size-4 text-violet-100" /> : <UserRoundCheck className="size-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-sm leading-tight">{item.name}</span>
                        <span className="block truncate text-[10px] leading-tight opacity-75">
                          {item.role} | {units[item.unitId].name}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span className={cn("block size-full rounded-full", units[item.unitId].color)} />
                  )}
                </button>
              );
            })}

        {/* Render Jaring Markers */}
        {(markerLayer === "semua" || markerLayer === "jaring") &&
          sourceItems.map((source) => {
            const position = positions[source.id];
            if (!position) return null;

            const isSelected = source.handlerId === selectedPersonnelId;

            return (
              <button
                key={source.id}
                type="button"
                onClick={() => onSelectPersonnel(source.handlerId)}
                className={cn(
                  "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md border bg-zinc-950/85 text-white shadow-lg backdrop-blur pointer-events-auto transition-all duration-200 hover:border-foreground/50",
                  isSelected
                    ? "border-foreground scale-110 z-30 ring-2 ring-foreground/20 px-3 py-2 max-w-[220px]"
                    : "size-3 rounded-full border-2 p-0 border-border",
                )}
                style={{
                  left: position.left,
                  top: position.top,
                  transform: `translate(-50%, -50%) scale(${markerScale})`,
                }}
                title={source.pseudonym}
              >
                {isSelected ? (
                  <>
                    <span className={cn("size-2 rounded-full", units[source.unitId].color)} />
                    <span className="truncate font-medium text-xs">{source.pseudonym}</span>
                    <span className="text-xs text-zinc-300">{source.reliability}</span>
                  </>
                ) : (
                  <span className={cn("block size-full rounded-full", units[source.unitId].color)} />
                )}
              </button>
            );
          })}
      </div>
    </div>
  );
}

function MapBadge({ icon: Icon, label }: { icon: typeof Signal; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2 font-medium text-sm shadow-lg backdrop-blur">
      <Icon className="size-4" />
      {label}
    </div>
  );
}

function DetailPanel({
  personnelItem,
  assignments: activeAssignments,
  sources: handledSources,
}: {
  personnelItem: Personnel;
  assignments: Assignment[];
  sources: Source[];
}) {
  return (
    <aside className="fade-in slide-in-from-bottom-3 animate-in rounded-lg border bg-card transition-all duration-300">
      <div className="border-b p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-sm">{personnelItem.id}</p>
            <h2 className="font-semibold text-xl">{personnelItem.name}</h2>
            <p className="text-muted-foreground text-sm">
              {personnelItem.role} | {units[personnelItem.unitId].sector}
            </p>
          </div>
          <Badge variant="outline" className={cn("shrink-0", statusTone[personnelItem.status])}>
            {personnelItem.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-3">
        {/* Column 1: Statistik & Progres */}
        <div className="space-y-5">
          <h3 className="border-b pb-1 font-semibold text-sm">Statistik & Kinerja</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Produktivitas" value={`${personnelItem.productivity}%`} />
            <MiniStat label="Coverage area" value={`${personnelItem.coverage}%`} />
            <MiniStat label="Beban kerja" value={`${personnelItem.workload}%`} />
            <MiniStat label="Laporan" value={String(personnelItem.reports)} />
          </div>

          <div className="space-y-3">
            <ProgressRow label="Produktivitas" value={personnelItem.productivity} />
            <ProgressRow label="Coverage area" value={personnelItem.coverage} />
            <ProgressRow label="Beban kerja" value={personnelItem.workload} />
          </div>
        </div>

        {/* Column 2: Posisi & Tugas Aktif */}
        <div className="space-y-5">
          <h3 className="border-b pb-1 font-semibold text-sm">Lokasi & Tugas</h3>

          <div className="rounded-lg border p-3">
            <div className="flex items-start gap-3">
              <MapIcon className="mt-0.5 size-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Posisi terakhir</p>
                <p className="text-muted-foreground text-sm">{personnelItem.lastPosition}</p>
                <p className="text-muted-foreground text-xs">{personnelItem.lastSeen}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold text-sm">Tugas aktif</p>
            {activeAssignments.length ? (
              activeAssignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{assignment.id}</span>
                    <span className={cn("font-medium text-xs", priorityTone[assignment.priority])}>
                      {assignment.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{assignment.title}</p>
                  <p className="mt-1 text-muted-foreground text-xs">{assignment.deadline}</p>
                </div>
              ))
            ) : (
              <p className="rounded-lg border p-3 text-muted-foreground text-sm">Tidak ada tugas aktif.</p>
            )}
          </div>
        </div>

        {/* Column 3: Jaring Binaan */}
        <div className="space-y-5 md:col-span-2 xl:col-span-1">
          <h3 className="border-b pb-1 font-semibold text-sm">Jaring Binaan</h3>

          <div className="space-y-2">
            {handledSources.length ? (
              handledSources.map((source) => (
                <div key={source.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">{source.pseudonym}</p>
                    <p className="text-muted-foreground text-xs">
                      {source.id} | {source.reliability}
                    </p>
                  </div>
                  <Badge variant="outline" className={statusTone[source.status]}>
                    {source.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="rounded-lg border p-3 text-muted-foreground text-sm">Tidak ada jaring binaan.</p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-1 font-semibold text-xl">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function PersonnelCard({
  item,
  selected,
  onSelect,
}: {
  item: Personnel;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const activeAssignments = assignments.filter((assignment) => item.activeTaskIds.includes(assignment.id));
  const roleLabel = item.role === "Agent" ? "Agent" : "Petugas Organik";

  return (
    <Card
      onClick={() => onSelect(item.id)}
      className={cn(
        "cursor-pointer transition-all duration-200 hover:border-foreground/40 hover:bg-muted/10",
        selected
          ? "border-primary bg-primary/[0.04] ring-1 ring-primary"
          : "border-border bg-card"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {item.id}
            </span>
            <CardTitle className="mt-1 truncate text-base font-semibold">{item.name}</CardTitle>
            <p className="text-muted-foreground text-xs font-medium">
              {roleLabel} • {units[item.unitId].name}
            </p>
          </div>
          <Badge variant="outline" className={cn("text-xs px-2 py-0.5", statusTone[item.status])}>
            {item.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Compact Metrics Bar */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs border-b pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Produktivitas:</span>
            <span className="font-semibold text-foreground">{item.productivity}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Coverage area:</span>
            <span className="font-semibold text-foreground">{item.coverage}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Beban kerja:</span>
            <span className="font-semibold text-foreground">{item.workload}%</span>
          </div>
        </div>

        {/* Info Rows */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="rounded border bg-muted/20 px-2.5 py-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Posisi terakhir</p>
            <p className="mt-0.5 font-medium truncate">{item.stealth ? "Dibatasi" : item.lastPosition}</p>
          </div>
          <div className="rounded border bg-muted/20 px-2.5 py-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Tugas aktif</p>
            <p className="mt-0.5 font-medium truncate font-mono">
              {activeAssignments.length ? activeAssignments.map((assignment) => assignment.id).join(", ") : "-"}
            </p>
          </div>
          <div className="rounded border bg-muted/20 px-2.5 py-1.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Jaring Agen</p>
            <p className="mt-0.5 font-medium truncate">{item.sourceIds.length} pseudonym</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceCard({ source, onSelectPersonnel }: { source: Source; onSelectPersonnel: (id: string) => void }) {
  const handler = personnel.find((item) => item.id === source.handlerId);
  const assignment = assignments.find((item) => item.id === source.activeTaskId);

  return (
    <Card
      onClick={() => handler && onSelectPersonnel(handler.id)}
      className="cursor-pointer transition-all duration-200 hover:border-foreground/40 hover:bg-muted/10 border-border bg-card"
    >
      <CardContent className="space-y-3 pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {source.id}
            </span>
            <h3 className="mt-1 truncate font-semibold text-base leading-tight">{source.pseudonym}</h3>
            <p className="text-muted-foreground text-xs truncate">{source.coverageArea}</p>
          </div>
          <Badge variant="outline" className={cn("text-xs px-2 py-0.5", statusTone[source.status])}>
            {source.status}
          </Badge>
        </div>

        {/* Compact Grid Stats */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="rounded border bg-muted/20 px-2 py-1 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Reliabilitas</p>
            <p className="mt-0.5 font-medium">{source.reliability}</p>
          </div>
          <div className="rounded border bg-muted/20 px-2 py-1 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Incoming</p>
            <p className="mt-0.5 font-medium">{source.incoming}</p>
          </div>
          <div className="rounded border bg-muted/20 px-2 py-1 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Valid</p>
            <p className="mt-0.5 font-medium">{source.valid}</p>
          </div>
          <div className="rounded border bg-muted/20 px-2 py-1 text-center">
            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Risiko</p>
            <p className="mt-0.5 font-medium">{source.risk}</p>
          </div>
        </div>

        {/* Handler Info Footer */}
        <div className="flex items-center justify-between gap-3 border-t pt-2.5 text-xs">
          <div>
            <p className="text-[10px] text-muted-foreground">Handler (Agent)</p>
            <p className="font-semibold text-foreground">{handler?.name ?? "Tidak ada"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Intake Terakhir</p>
            <p className="font-medium text-muted-foreground">{source.lastIntake}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
