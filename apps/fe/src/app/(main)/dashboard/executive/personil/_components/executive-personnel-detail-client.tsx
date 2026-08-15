"use client";

import { useMemo, useState } from "react";

import Link from "next/link";

import {
  Activity,
  BarChart3,
  ClipboardList,
  Cpu,
  Eye,
  type LucideIcon,
  MapPin,
  ShieldCheck,
  Signal,
  User,
} from "lucide-react";

import { SortableTableHeader } from "@/app/(main)/dashboard/_components/sortable-table-header";
import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { type ColumnOption, ColumnVisibilityToggle } from "@/components/ui/column-visibility-toggle";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveJaringIdentity } from "@/lib/domain/jaring-identity";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import type { SystemRole } from "@/navigation/sidebar/system-roles";

import type { PersonnelAssignment, PersonnelDetail, PersonnelJaringItem } from "./executive-personnel-types";

type DetailSortDirection = "asc" | "desc";
type JaringSortColumn =
  | "foto"
  | "namaJaring"
  | "kodeJaring"
  | "gaswil"
  | "wilayahPenempatan"
  | "whatsapp"
  | "pekerjaan"
  | "kinerja"
  | "status"
  | "aksi";
type ActivitySortColumn = "waktu" | "aktivitas" | "entitas" | "ip";
type JaringSortState = { column: JaringSortColumn; direction: DetailSortDirection };
type ActivitySortState = { column: ActivitySortColumn; direction: DetailSortDirection };
type ActivityLogItem = PersonnelDetail["activityLogs"][number];

const DETAIL_SORT_COLLATOR = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
});

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function areaText(assignment?: PersonnelAssignment | null) {
  const area = assignment?.areas.find((item) => item.isPrimary) ?? assignment?.areas[0];
  return area ? `${areaLevelLabel(area.level)} ${area.name}` : "-";
}

function areaLevelLabel(level?: string | null) {
  const labels: Record<string, string> = {
    COUNTRY: "Negara",
    PROVINCE: "Provinsi",
    REGENCY: "Kabupaten",
    CITY: "Kota",
    DISTRICT: "Kecamatan",
    VILLAGE: "Desa",
    URBAN_VILLAGE: "Kelurahan",
  };

  return level ? (labels[level] ?? level) : "Wilayah";
}

function personnelPositionLabel(assignment?: PersonnelAssignment | null) {
  const code = (assignment?.positionCode ?? assignment?.roleCode ?? "").toUpperCase();
  if (code === "FIELD_OFFICER" || code === "GASWIL") return DOMAIN_TERMS.fieldOfficer;
  if (code === "FIELD_COORDINATOR" || code === "KORWIL") return DOMAIN_TERMS.fieldCoordinatorRole;
  if (code === "REGIONAL_COMMANDER") return DOMAIN_TERMS.regionalCommanderRole;
  if (code === "OPERATIONAL_INTELLIGENCE_MANAGER") return DOMAIN_TERMS.operationalIntelligenceManagerRole;
  if (code === "EXECUTIVE") return DOMAIN_TERMS.executiveRole;
  return assignment?.title ?? "Belum ada jabatan aktif";
}

function activityActionLabel(action: string) {
  const labels: Record<string, string> = {
    "POSITION.CREATE": "Jabatan dibuat",
    "POSITION.UPDATE": "Jabatan diperbarui",
    "POSITION.DELETE": "Jabatan dihapus",
    "USER.PROVISION": "Pengguna diprovision",
    "USER.UPDATE": "Profil pengguna diperbarui",
    "USER.ACTIVATE": "Pengguna diaktifkan",
    "USER.SUSPEND": "Pengguna ditangguhkan",
    "USER.ARCHIVE": "Pengguna diarsipkan",
    "JARING_OCCUPATION.CREATE": "Master pekerjaan jaring dibuat",
    "JARING_OCCUPATION.UPDATE": "Master pekerjaan jaring diperbarui",
    "JARING_OCCUPATION.DELETE": "Master pekerjaan jaring dihapus",
    "auth.session.network_resolved": "Lokasi jaringan sesi dikenali",
  };

  if (labels[action]) {
    return labels[action];
  }

  return action
    .replace(/[_./-]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function entityTypeLabel(entityType?: string | null) {
  const labels: Record<string, string> = {
    Position: "Jabatan",
    UserProfile: "Profil pengguna",
    User: "Akun auth",
    Jaring: "Jaring",
    JaringOccupation: "Master pekerjaan jaring",
    Session: "Sesi",
  };

  return entityType ? (labels[entityType] ?? entityType.replace(/([a-z])([A-Z])/g, "$1 $2")) : "Aktivitas";
}

function getJaringStatusBadge(rawStatus?: string | null) {
  const status = (rawStatus ?? "APPROVED").toUpperCase();
  if (status === "APPROVED" || status === "VERIFIED" || status === "ACTIVE") {
    return {
      label: "Terverifikasi",
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
    };
  }
  if (status === "PENDING" || status === "WAITING") {
    return {
      label: "Belum Terverifikasi",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:bg-sky-950/20",
    };
  }
  if (status === "REJECTED") {
    return {
      label: "Ditolak",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20",
    };
  }
  return {
    label: rawStatus ?? "Terverifikasi",
    className: "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-400 dark:bg-slate-900/20",
  };
}

function getJaringKinerjaBadge(rawStatus?: string | null) {
  const status = (rawStatus ?? "ACTIVE").toUpperCase();
  if (status === "ACTIVE") {
    return {
      label: DOMAIN_TERMS.jaringActive90Days,
      className:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/20",
      dotColor: "bg-emerald-500 animate-pulse",
    };
  }
  if (status === "TRANSFERRED") {
    return {
      label: "Dimutasi",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 dark:bg-sky-950/20",
      dotColor: "bg-sky-500",
    };
  }
  if (status === "ARCHIVED") {
    return {
      label: "Diarsipkan",
      className: "border-slate-500/40 bg-slate-500/10 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20",
      dotColor: "bg-slate-500",
    };
  }
  return {
    label: DOMAIN_TERMS.jaringInactive90Days,
    className: "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 dark:bg-rose-950/20",
    dotColor: "bg-rose-500",
  };
}

function getPhotoUrl(jaring: PersonnelJaringItem) {
  const fileId = jaring.profilePhotoFileId ?? jaring.profilePhotoFile?.id;
  return fileId ? `/api/files/${fileId}` : null;
}

function jaringPlacementAreaText(jaring: PersonnelJaringItem) {
  const areas = (jaring.areaCoverages ?? []).map((coverage) => coverage.area?.name).filter(Boolean);
  if (jaring.areaNames && jaring.areaNames.length > 0) return jaring.areaNames.join(", ");
  return areas.length > 0 ? areas.join(", ") : "Belum diatur";
}

function detailSortCompare(leftValue: string | number, rightValue: string | number, direction: DetailSortDirection) {
  const baseCompare =
    typeof leftValue === "number" && typeof rightValue === "number"
      ? leftValue - rightValue
      : DETAIL_SORT_COLLATOR.compare(String(leftValue), String(rightValue));

  return baseCompare * (direction === "asc" ? 1 : -1);
}

function jaringSortValue(jaring: PersonnelJaringItem, column: JaringSortColumn, fallbackGaswilName?: string | null) {
  const caretakerAssignment = jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment;
  if (column === "foto") return getPhotoUrl(jaring) ? 1 : 0;
  if (column === "namaJaring") return jaring.fullName ?? jaring.aliasName ?? "";
  if (column === "kodeJaring") return jaring.aliasName ?? jaring.id;
  if (column === "gaswil") return caretakerAssignment?.userProfile?.fullName ?? fallbackGaswilName ?? "";
  if (column === "wilayahPenempatan") return jaringPlacementAreaText(jaring);
  if (column === "whatsapp") return jaring.whatsappNumber ?? "";
  if (column === "pekerjaan") return jaring.occupation?.name ?? "";
  if (column === "kinerja") return getJaringKinerjaBadge(isJaringActive(jaring) ? "ACTIVE" : "INACTIVE").label;
  if (column === "status") return getJaringStatusBadge(jaring.registrationStatus ?? jaring.status).label;
  return jaring.id;
}

function activitySortValue(log: ActivityLogItem, column: ActivitySortColumn) {
  if (column === "waktu") return new Date(log.createdAt).getTime();
  if (column === "aktivitas") return activityActionLabel(log.action);
  if (column === "entitas") return `${entityTypeLabel(log.entityType)} ${log.entityId ?? ""}`;
  return log.ipAddress ?? "";
}

function percentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function formatPercent(value: number) {
  return `${value}%`;
}

function isJaringActive(jaring: PersonnelJaringItem) {
  if (jaring.lastReportAt) {
    const lastReportTime = new Date(jaring.lastReportAt).getTime();
    if (!Number.isNaN(lastReportTime)) {
      return lastReportTime >= Date.now() - 90 * 24 * 60 * 60 * 1000;
    }
  }
  return false;
}

function isJaringVerified(jaring: PersonnelJaringItem) {
  const status = (jaring.registrationStatus ?? jaring.status ?? "").toUpperCase();
  return status === "APPROVED" || status === "VERIFIED";
}

function profileStatusLabel(status?: string | null, isActive?: boolean) {
  if (!isActive) return "Tidak Aktif";

  const labels: Record<string, string> = {
    ACTIVE: "Aktif",
    INACTIVE: "Tidak Aktif",
    SUSPENDED: "Ditangguhkan",
    ARCHIVED: "Diarsipkan",
  };

  return status ? (labels[status.toUpperCase()] ?? status) : "Aktif";
}

function reportStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    DRAFT: "Draf Baket",
    SUBMITTED: "Dikirim",
    VERIFIED: "Terverifikasi",
    VALIDATED: DOMAIN_TERMS.validatedBaket,
    REJECTED: "Ditolak",
    NEEDS_REVISION: "Perlu Revisi",
  };

  return status ? (labels[status.toUpperCase()] ?? status.replace(/[_-]+/g, " ")) : "-";
}

function latestAssignmentLocation(assignments: PersonnelAssignment[]) {
  return assignments.find((assignment) => assignment.lastLocation)?.lastLocation ?? null;
}

/* -------------------------------------------------------------------------- */
/* MAIN EXPORT CLIENT COMPONENT                                               */
/* -------------------------------------------------------------------------- */

const PERSONEL_JARING_COLUMNS: ColumnOption[] = [
  { id: "foto", label: DOMAIN_TERMS.jaringAvatar },
  { id: "namaJaring", label: DOMAIN_TERMS.jaringName, alwaysVisible: true },
  { id: "kodeJaring", label: DOMAIN_TERMS.jaringCode },
  { id: "gaswil", label: DOMAIN_TERMS.fieldOfficer },
  { id: "wilayahPenempatan", label: DOMAIN_TERMS.jaringPlacementArea },
  { id: "whatsapp", label: DOMAIN_TERMS.jaringWhatsApp },
  { id: "pekerjaan", label: "Pekerjaan" },
  { id: "kinerja", label: DOMAIN_TERMS.jaringActivity90Days },
  { id: "status", label: "Status Verifikasi" },
  { id: "aksi", label: "Aksi" },
];

const detailCardClass = cn(DC_CONTROLS.card, "border-slate-200/80 bg-card p-4 shadow-xs dark:border-white/10 sm:p-5");
const sectionPanelClass = cn(DC_CONTROLS.card, "border-slate-200/80 bg-card shadow-xs dark:border-white/10");
const technicalLabelClass = cn(DC_TYPOGRAPHY.tableHeader, "tracking-[0.12em]");
const tabTriggerClass =
  "h-9 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs";

export function ExecutivePersonnelDetailClient({
  detail,
  backHref = "/dashboard/personel-lapangan",
  userRole = "executive",
}: {
  detail: PersonnelDetail;
  backHref?: string;
  userRole?: SystemRole;
}) {
  const profile = detail.profile;
  const canViewAuditActivity = userRole === "executive";
  const jaringList = detail.jaring ?? [];
  const baketCount = detail.summary?.baketCount ?? detail.reports.length;
  const [jaringViewMode, setJaringViewMode] = useState<"card" | "table">("card");
  const [jaringVisibleColumns, setJaringVisibleColumns] = useState<Record<string, boolean>>({});
  const isJaringColVisible = (id: string) => jaringVisibleColumns[id] !== false;
  const [jaringKelurahanFilter, setJaringKelurahanFilter] = useState("ALL");
  const [jaringSort, setJaringSort] = useState<JaringSortState | null>(null);

  const jaringKelurahanOptions = useMemo(() => {
    const set = new Set<string>();
    jaringList.forEach((jaring) => {
      const displayArea =
        jaring.areaNames && jaring.areaNames.length > 0
          ? jaring.areaNames.join(", ")
          : (jaring.areaCoverages ?? [])
              .map((cov) => cov.area?.name)
              .filter(Boolean)
              .join(", ");

      const identity = resolveJaringIdentity({
        id: jaring.id,
        villageName: displayArea || "Belum diatur",
      });

      if (identity.placementArea && identity.placementArea !== "Belum diatur") {
        identity.placementArea.split(",").forEach((name) => {
          const trimmed = name.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [jaringList]);

  const filteredJaringList = useMemo(() => {
    if (jaringKelurahanFilter === "ALL") return jaringList;
    return jaringList.filter((jaring) => {
      const displayArea = jaringPlacementAreaText(jaring);

      const identity = resolveJaringIdentity({
        id: jaring.id,
        villageName: displayArea || "Belum diatur",
      });

      return identity.placementArea.toLowerCase().includes(jaringKelurahanFilter.toLowerCase());
    });
  }, [jaringList, jaringKelurahanFilter]);
  const sortedJaringList = useMemo(() => {
    if (!jaringSort) return filteredJaringList;

    return filteredJaringList
      .map((jaring, index) => ({ index, jaring }))
      .sort((left, right) => {
        const compared = detailSortCompare(
          jaringSortValue(left.jaring, jaringSort.column, detail.profile.fullName),
          jaringSortValue(right.jaring, jaringSort.column, detail.profile.fullName),
          jaringSort.direction,
        );
        return compared || left.index - right.index;
      })
      .map(({ jaring }) => jaring);
  }, [detail.profile.fullName, filteredJaringList, jaringSort]);
  const jaringAreaSubtitle =
    jaringKelurahanFilter === "ALL"
      ? `Jumlah Jaring semua ${DOMAIN_TERMS.jaringPlacementArea}`
      : `Jumlah Jaring pada ${DOMAIN_TERMS.jaringPlacementArea} ${jaringKelurahanFilter}`;
  const [activityViewMode, setActivityViewMode] = useState<"card" | "table">("card");
  const [activityPeriodFrom, setActivityPeriodFrom] = useState("");
  const [activityPeriodTo, setActivityPeriodTo] = useState("");
  const [activityPage, setActivityPage] = useState(1);
  const [activityLimit, setActivityLimit] = useState(10);
  const [activitySort, setActivitySort] = useState<ActivitySortState | null>(null);

  const filteredActivityLogs = useMemo(() => {
    const fromTime = activityPeriodFrom ? new Date(`${activityPeriodFrom}T00:00:00`).getTime() : null;
    const toTime = activityPeriodTo ? new Date(`${activityPeriodTo}T23:59:59.999`).getTime() : null;

    return detail.activityLogs.filter((log) => {
      const createdAt = new Date(log.createdAt).getTime();
      return (fromTime === null || createdAt >= fromTime) && (toTime === null || createdAt <= toTime);
    });
  }, [activityPeriodFrom, activityPeriodTo, detail.activityLogs]);
  const sortedActivityLogs = useMemo(() => {
    if (!activitySort) return filteredActivityLogs;

    return filteredActivityLogs
      .map((log, index) => ({ index, log }))
      .sort((left, right) => {
        const compared = detailSortCompare(
          activitySortValue(left.log, activitySort.column),
          activitySortValue(right.log, activitySort.column),
          activitySort.direction,
        );
        return compared || left.index - right.index;
      })
      .map(({ log }) => log);
  }, [activitySort, filteredActivityLogs]);
  const activityTotalPages = Math.max(1, Math.ceil(filteredActivityLogs.length / activityLimit));
  const safeActivityPage = Math.min(activityPage, activityTotalPages);
  const paginatedActivityLogs = sortedActivityLogs.slice(
    (safeActivityPage - 1) * activityLimit,
    safeActivityPage * activityLimit,
  );
  const jaringSortDirection = (column: JaringSortColumn) =>
    jaringSort?.column === column ? jaringSort.direction : null;
  const activitySortDirection = (column: ActivitySortColumn) =>
    activitySort?.column === column ? activitySort.direction : null;
  const activeAssignmentCount = detail.assignments.filter((assignment) => assignment.isActive).length;
  const historicalAssignmentCount = Math.max(0, detail.assignments.length - activeAssignmentCount);
  const activeAreaCount = detail.summary?.activeAreaCount ?? detail.currentAssignment?.areas.length ?? 0;
  const activeJaringCount = jaringList.filter(isJaringActive).length;
  const inactiveJaringCount = Math.max(0, jaringList.length - activeJaringCount);
  const verifiedJaringCount = jaringList.filter(isJaringVerified).length;
  const unverifiedJaringCount = Math.max(0, jaringList.length - verifiedJaringCount);
  const visibleBaketCount = detail.reports.length;
  const hiddenBaketCount = Math.max(0, baketCount - visibleBaketCount);
  const latestLocation = detail.currentAssignment?.lastLocation ?? latestAssignmentLocation(detail.assignments);
  const assignmentWithLocationCount = detail.assignments.filter((assignment) => assignment.lastLocation).length;
  const assignmentWithoutLocationCount = Math.max(0, detail.assignments.length - assignmentWithLocationCount);
  const summaryMetrics = [
    {
      label: DOMAIN_TERMS.jaring,
      value: jaringList.length,
      helper: `${formatPercent(percentage(activeJaringCount, jaringList.length))} aktif`,
      icon: DOMAIN_VISUALS.jaring.Icon,
      tone: DOMAIN_VISUALS.jaring.iconClass,
    },
    {
      label: DOMAIN_TERMS.baket,
      value: baketCount,
      helper: `${visibleBaketCount} data ditampilkan`,
      icon: DOMAIN_VISUALS.baket.Icon,
      tone: DOMAIN_VISUALS.baket.iconClass,
    },
    {
      label: DOMAIN_TERMS.assignmentArea,
      value: activeAreaCount,
      helper: `${activeAssignmentCount} penugasan aktif`,
      icon: MapPin,
      tone: "text-amber-500",
    },
    {
      label: "Status Petugas Wilayah",
      value: profileStatusLabel(profile.status, profile.isActive),
      helper: latestLocation ? `Sinyal ${formatDate(latestLocation.capturedAt)}` : "Belum ada sinyal lokasi",
      icon: Activity,
      tone: profile.isActive ? "text-emerald-500" : "text-slate-400",
    },
  ];
  const statisticPairs = [
    {
      title: DOMAIN_TERMS.jaringActivity90Days,
      description: `${activeJaringCount} aktif 90 hari dari ${jaringList.length} Jaring`,
      primaryLabel: DOMAIN_TERMS.jaringActive90Days,
      primaryValue: activeJaringCount,
      secondaryLabel: DOMAIN_TERMS.jaringInactive90Days,
      secondaryValue: inactiveJaringCount,
      total: jaringList.length,
      icon: Signal,
      primaryClassName: "bg-emerald-500",
      secondaryClassName: "bg-rose-500",
    },
    {
      title: "Status Verifikasi Jaring",
      description: `${verifiedJaringCount} terverifikasi dari ${jaringList.length} Jaring`,
      primaryLabel: "Terverifikasi",
      primaryValue: verifiedJaringCount,
      secondaryLabel: "Belum terverifikasi",
      secondaryValue: unverifiedJaringCount,
      total: jaringList.length,
      icon: ShieldCheck,
      primaryClassName: "bg-sky-500",
      secondaryClassName: "bg-amber-500",
    },
    {
      title: "Cakupan Penugasan",
      description: `${activeAssignmentCount} penugasan aktif dari ${detail.assignments.length} penugasan`,
      primaryLabel: "Penugasan Aktif",
      primaryValue: activeAssignmentCount,
      secondaryLabel: "Riwayat Penugasan",
      secondaryValue: historicalAssignmentCount,
      total: detail.assignments.length,
      icon: ClipboardList,
      primaryClassName: "bg-violet-500",
      secondaryClassName: "bg-slate-400",
    },
    {
      title: "Sinyal Lokasi",
      description: `${assignmentWithLocationCount} penugasan memiliki lokasi terakhir`,
      primaryLabel: "Ada Lokasi",
      primaryValue: assignmentWithLocationCount,
      secondaryLabel: "Tanpa Lokasi",
      secondaryValue: assignmentWithoutLocationCount,
      total: detail.assignments.length,
      icon: MapPin,
      primaryClassName: "bg-cyan-500",
      secondaryClassName: "bg-slate-400",
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
      <header className={cn(detailCardClass, "overflow-hidden")}>
        <div className="space-y-5">
          <div className="min-w-0 space-y-4">
            <BackButton href={backHref} />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="grid size-12 shrink-0 place-items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DOMAIN_VISUALS.gaswil.Icon className="size-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Detail {DOMAIN_TERMS.fieldOfficer}
                  </span>
                  <span
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-semibold",
                      profile.isActive
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                    )}
                  >
                    {profileStatusLabel(profile.status, profile.isActive)}
                  </span>
                </div>
                <h1 className={cn(DC_TYPOGRAPHY.pageTitle, "mt-3")}>
                  {profile.fullName ?? profile.username ?? profile.email}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {personnelPositionLabel(detail.currentAssignment)} pada{" "}
                  {detail.currentAssignment?.unit.name ?? "unit belum tercatat"}.
                </p>
              </div>
            </div>
          </div>

          <dl className="grid min-w-0 gap-3 rounded-md border border-border/70 bg-muted/20 p-3 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Email" value={profile.email} />
            <Field label="Nomor Telepon" value={profile.phone ?? "Belum tersedia"} />
            <Field label={DOMAIN_TERMS.assignmentArea} value={areaText(detail.currentAssignment)} />
            <Field
              label="Lokasi Terakhir"
              value={
                latestLocation
                  ? `${latestLocation.area?.name ?? "Area belum terdeteksi"} - ${formatDate(latestLocation.capturedAt)}`
                  : "Belum tersedia"
              }
            />
          </dl>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryMetrics.map((metric) => (
          <div
            key={metric.label}
            className={cn(
              detailCardClass,
              "flex min-h-24 items-center justify-between gap-3 transition-colors hover:border-primary/30",
            )}
          >
            <div className="min-w-0">
              <p className={technicalLabelClass}>{metric.label}</p>
              <p className="mt-2 truncate font-semibold text-2xl tracking-normal text-foreground">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
            </div>
            <div className="grid size-10 shrink-0 place-items-center rounded-md border border-border/70 bg-muted/40">
              <metric.icon className={cn("size-5", metric.tone)} aria-hidden="true" />
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        {statisticPairs.map((item) => (
          <StatisticPairCard key={item.title} {...item} />
        ))}
      </section>

      <Tabs defaultValue="profil" className="space-y-4">
        <TabsList
          className={cn(sectionPanelClass, "scrollbar-none flex h-auto w-full justify-start gap-1 overflow-x-auto p-1")}
        >
          <TabsTrigger value="profil" className={tabTriggerClass}>
            <User className="mr-2 size-4 text-muted-foreground" />
            Profil
          </TabsTrigger>
          <TabsTrigger value="penugasan" className={tabTriggerClass}>
            <ClipboardList className="mr-2 size-4 text-muted-foreground" />
            Penugasan
          </TabsTrigger>
          <TabsTrigger value="jaring" className={tabTriggerClass}>
            <DOMAIN_VISUALS.jaring.Icon className={cn("mr-2 size-4", DOMAIN_VISUALS.jaring.iconClass)} />
            Jaring ({jaringList.length})
          </TabsTrigger>
          {canViewAuditActivity && (
            <TabsTrigger value="aktivitas" className={tabTriggerClass}>
              <Activity className="mr-2 size-4 text-muted-foreground" />
              Aktivitas
            </TabsTrigger>
          )}
          <TabsTrigger value="baket" className={tabTriggerClass}>
            <DOMAIN_VISUALS.baket.Icon className={cn("mr-2 size-4", DOMAIN_VISUALS.baket.iconClass)} />
            Baket ({baketCount})
          </TabsTrigger>
          <TabsTrigger value="kpi" className={tabTriggerClass}>
            <BarChart3 className="mr-2 size-4 text-muted-foreground" />
            Statistik
          </TabsTrigger>
        </TabsList>

        {/* Profil Node View */}
        <TabsContent value="profil" className="outline-none">
          <section className="grid gap-4 xl:grid-cols-2">
            <InfoPanel
              title="Identitas Petugas"
              items={[
                ["Nama", profile.fullName ?? "-"],
                ["Username", profile.username ?? "-"],
                ["Email", profile.email],
                ["Nomor Telepon", profile.phone ?? "Belum tersedia"],
                ["Status Petugas Wilayah", profileStatusLabel(profile.status, profile.isActive)],
              ]}
            />
            <InfoPanel
              title="Konteks Penugasan"
              items={[
                ["Jabatan Aktif", personnelPositionLabel(detail.currentAssignment)],
                ["Unit", detail.currentAssignment?.unit.name ?? "Unit belum tercatat"],
                [DOMAIN_TERMS.assignmentArea, areaText(detail.currentAssignment)],
                ["Mulai Penugasan", formatDate(detail.currentAssignment?.validFrom)],
                ["Akhir Penugasan", formatDate(detail.currentAssignment?.validUntil)],
              ]}
            />
          </section>
        </TabsContent>

        {/* Penugasan Node View */}
        <TabsContent value="penugasan" className="space-y-4 outline-none">
          {detail.assignments.map((assignment) => (
            <div key={assignment.id} className={cn(detailCardClass, "overflow-hidden")}>
              <div className="flex flex-col gap-2 border-b border-border/70 pb-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className={DC_TYPOGRAPHY.cardTitle}>{personnelPositionLabel(assignment)}</h2>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {assignment.unit.name} - {assignment.seatCode}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em]",
                    assignment.isActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-slate-500/40 bg-slate-500/10 text-slate-600 dark:text-slate-300",
                  )}
                >
                  {assignment.isActive ? "Aktif" : "Riwayat"}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                <Field label={DOMAIN_TERMS.assignmentArea} value={areaText(assignment)} />
                <Field label="Mulai" value={formatDate(assignment.validFrom)} />
                <Field label="Selesai" value={formatDate(assignment.validUntil)} />
              </dl>
            </div>
          ))}
          {!detail.assignments.length ? <EmptyState title="Belum ada penugasan" /> : null}
        </TabsContent>

        {/* Jaring Node View */}
        <TabsContent value="jaring" className="space-y-4 outline-none">
          <div
            className={cn(
              sectionPanelClass,
              "flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:justify-between",
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid gap-0.5">
                <span className={technicalLabelClass}>Daftar Jaring ({filteredJaringList.length})</span>
                <span className="text-xs text-muted-foreground">{jaringAreaSubtitle}</span>
              </div>
              {jaringKelurahanOptions.length > 0 && (
                <NativeSelect
                  aria-label={`Filter ${DOMAIN_TERMS.jaringPlacementArea}`}
                  value={jaringKelurahanFilter}
                  onChange={(e) => setJaringKelurahanFilter(e.target.value)}
                  className={cn(DC_CONTROLS.selectTrigger, "h-8 max-w-[220px] text-xs")}
                >
                  <option value="ALL">Semua {DOMAIN_TERMS.jaringPlacementArea}</option>
                  {jaringKelurahanOptions.map((kelName) => (
                    <option key={kelName} value={kelName}>
                      {kelName}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ColumnVisibilityToggle
                columns={PERSONEL_JARING_COLUMNS}
                visibleColumns={jaringVisibleColumns}
                onChange={setJaringVisibleColumns}
              />
              <ViewModeToggle value={jaringViewMode} onValueChange={setJaringViewMode} />
            </div>
          </div>

          {jaringViewMode === "card" ? (
            sortedJaringList.map((jaring) => {
              const photoUrl = getPhotoUrl(jaring);
              const displayName = jaring.fullName ?? jaring.aliasName ?? "Tanpa Nama";
              const statusBadge = getJaringStatusBadge(jaring.registrationStatus ?? jaring.status);
              const caretakerAssignment = jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment;
              const gaswilName = caretakerAssignment?.userProfile?.fullName ?? detail.profile.fullName;

              return (
                <div
                  key={jaring.id}
                  className={cn(detailCardClass, "overflow-hidden transition-colors hover:border-cyan-500/40")}
                >
                  <div className="flex flex-col gap-3 border-b border-border/70 pb-3.5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                        {photoUrl ? (
                          <img src={photoUrl} alt={displayName} className="size-full object-cover" />
                        ) : (
                          <User className="size-6 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="shrink-0 font-mono text-xs font-semibold uppercase tracking-[0.12em] text-cyan-600 dark:text-cyan-300">
                            {jaring.aliasName || jaring.fullName || jaring.id}
                          </span>
                          <h2 className={cn(DC_TYPOGRAPHY.cardTitle, "min-w-0 truncate")}>{displayName}</h2>
                        </div>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {jaring.occupation?.name ?? "Pekerjaan belum diisi"}{" "}
                          {jaring.whatsappNumber ? ` - ${jaring.whatsappNumber}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap",
                          statusBadge.className,
                        )}
                      >
                        {statusBadge.label}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="h-8 gap-1.5 rounded-md border-cyan-500/30 px-2.5 font-medium text-xs text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                      >
                        <Link href={`/dashboard/daftar-jaring/${jaring.id}`}>
                          <Eye className="size-3.5" />
                          Lihat Detail
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <JaringIdentitySummary
                    source={{
                      id: jaring.id,
                      fullName: jaring.fullName,
                      aliasName: jaring.aliasName,
                      whatsappNumber: jaring.whatsappNumber,
                      profilePhotoFileId: jaring.profilePhotoFileId ?? jaring.profilePhotoFile?.id,
                      gaswilName,
                      gaswilAssignmentId: caretakerAssignment?.id ?? detail.currentAssignment?.id,
                      gaswilUserProfileId:
                        caretakerAssignment?.userProfile?.id ?? caretakerAssignment?.userProfileId ?? detail.profile.id,
                      villageName:
                        jaring.areaNames && jaring.areaNames.length > 0
                          ? jaring.areaNames.join(", ")
                          : (jaring.areaCoverages ?? [])
                              .map((cov) => cov.area?.name)
                              .filter(Boolean)
                              .join(", ") || "Belum diatur",
                    }}
                    className="mt-4"
                  />

                  <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                    <Field label="Pekerjaan" value={jaring.occupation?.name ?? "Belum tersedia"} />
                    <Field label="Terdaftar" value={formatDate(jaring.registeredAt ?? jaring.createdAt)} />
                    <Field
                      label="Laporan Terakhir"
                      value={jaring.lastReportAt ? formatDate(jaring.lastReportAt) : "Belum pernah melapor"}
                    />
                    <Field
                      label={DOMAIN_TERMS.jaringActivity90Days}
                      value={
                        isJaringActive(jaring) ? DOMAIN_TERMS.jaringActive90Days : DOMAIN_TERMS.jaringInactive90Days
                      }
                    />
                  </dl>
                </div>
              );
            })
          ) : (
            <div className={cn(sectionPanelClass, "w-full overflow-x-auto select-none")}>
              <Table className="w-full min-w-[1100px]">
                <TableHeader>
                  <TableRow className="border-b border-border bg-muted/40 hover:bg-muted/40">
                    {isJaringColVisible("foto") && (
                      <SortableTableHeader
                        className={cn(technicalLabelClass, "w-12 text-center")}
                        column="foto"
                        onSortChange={(direction) => setJaringSort({ column: "foto", direction })}
                        sortDirection={jaringSortDirection("foto")}
                      >
                        {DOMAIN_TERMS.jaringAvatar}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("namaJaring") && (
                      <SortableTableHeader
                        className={technicalLabelClass}
                        column="namaJaring"
                        onSortChange={(direction) => setJaringSort({ column: "namaJaring", direction })}
                        sortDirection={jaringSortDirection("namaJaring")}
                      >
                        {DOMAIN_TERMS.jaringName}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("kodeJaring") && (
                      <SortableTableHeader
                        className={technicalLabelClass}
                        column="kodeJaring"
                        onSortChange={(direction) => setJaringSort({ column: "kodeJaring", direction })}
                        sortDirection={jaringSortDirection("kodeJaring")}
                      >
                        {DOMAIN_TERMS.jaringCode}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("gaswil") && (
                      <SortableTableHeader
                        className={technicalLabelClass}
                        column="gaswil"
                        onSortChange={(direction) => setJaringSort({ column: "gaswil", direction })}
                        sortDirection={jaringSortDirection("gaswil")}
                      >
                        {DOMAIN_TERMS.fieldOfficer}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("wilayahPenempatan") && (
                      <SortableTableHeader
                        className={technicalLabelClass}
                        column="wilayahPenempatan"
                        onSortChange={(direction) => setJaringSort({ column: "wilayahPenempatan", direction })}
                        sortDirection={jaringSortDirection("wilayahPenempatan")}
                      >
                        {DOMAIN_TERMS.jaringPlacementArea}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("whatsapp") && (
                      <SortableTableHeader
                        className={technicalLabelClass}
                        column="whatsapp"
                        onSortChange={(direction) => setJaringSort({ column: "whatsapp", direction })}
                        sortDirection={jaringSortDirection("whatsapp")}
                      >
                        {DOMAIN_TERMS.jaringWhatsApp}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("pekerjaan") && (
                      <SortableTableHeader
                        className={technicalLabelClass}
                        column="pekerjaan"
                        onSortChange={(direction) => setJaringSort({ column: "pekerjaan", direction })}
                        sortDirection={jaringSortDirection("pekerjaan")}
                      >
                        Pekerjaan
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("kinerja") && (
                      <SortableTableHeader
                        className={cn(technicalLabelClass, "text-center")}
                        column="kinerja"
                        onSortChange={(direction) => setJaringSort({ column: "kinerja", direction })}
                        sortDirection={jaringSortDirection("kinerja")}
                      >
                        {DOMAIN_TERMS.jaringActivity90Days}
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("status") && (
                      <SortableTableHeader
                        className={cn(technicalLabelClass, "text-center")}
                        column="status"
                        onSortChange={(direction) => setJaringSort({ column: "status", direction })}
                        sortDirection={jaringSortDirection("status")}
                      >
                        Status Verifikasi
                      </SortableTableHeader>
                    )}
                    {isJaringColVisible("aksi") && (
                      <SortableTableHeader
                        className={cn(technicalLabelClass, "text-right")}
                        column="aksi"
                        onSortChange={(direction) => setJaringSort({ column: "aksi", direction })}
                        sortDirection={jaringSortDirection("aksi")}
                      >
                        Aksi
                      </SortableTableHeader>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedJaringList.map((jaring) => {
                    const photoUrl = getPhotoUrl(jaring);
                    const displayArea = jaringPlacementAreaText(jaring);
                    const statusBadge = getJaringStatusBadge(jaring.registrationStatus ?? jaring.status);
                    const caretakerAssignment = jaring.caretakerAssignments?.[0]?.fieldOfficerAssignment;
                    const gaswilName = caretakerAssignment?.userProfile?.fullName ?? detail.profile.fullName;

                    const identity = resolveJaringIdentity({
                      id: jaring.id,
                      fullName: jaring.fullName,
                      aliasName: jaring.aliasName,
                      whatsappNumber: jaring.whatsappNumber,
                      profilePhotoFileId: jaring.profilePhotoFileId ?? jaring.profilePhotoFile?.id,
                      gaswilName,
                      gaswilAssignmentId: caretakerAssignment?.id ?? detail.currentAssignment?.id,
                      gaswilUserProfileId:
                        caretakerAssignment?.userProfile?.id ?? caretakerAssignment?.userProfileId ?? detail.profile.id,
                      villageName: displayArea,
                    });

                    return (
                      <TableRow key={jaring.id} className="border-b border-border/70 hover:bg-muted/40">
                        {isJaringColVisible("foto") && (
                          <TableCell className="align-middle">
                            <div className="flex size-8 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                              {photoUrl ? (
                                <img src={photoUrl} alt={identity.name} className="size-full object-cover" />
                              ) : (
                                <User className="size-4 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                        )}

                        {isJaringColVisible("namaJaring") && (
                          <TableCell className="align-middle font-mono font-bold text-xs text-foreground">
                            {identity.name}
                          </TableCell>
                        )}

                        {isJaringColVisible("kodeJaring") && (
                          <TableCell className="align-middle font-mono text-xs text-cyan-600 dark:text-cyan-400">
                            {identity.code}
                          </TableCell>
                        )}

                        {isJaringColVisible("gaswil") && (
                          <TableCell className="align-middle font-mono text-xs">
                            <GaswilEntityLink
                              name={identity.gaswilName}
                              assignmentId={identity.gaswilAssignmentId}
                              userProfileId={identity.gaswilUserProfileId}
                              href={identity.gaswilHref}
                            />
                          </TableCell>
                        )}

                        {isJaringColVisible("wilayahPenempatan") && (
                          <TableCell className="align-middle font-mono text-xs text-foreground">
                            {identity.placementArea}
                          </TableCell>
                        )}

                        {isJaringColVisible("whatsapp") && (
                          <TableCell className="align-middle font-mono text-xs">
                            {identity.whatsappNumber && identity.whatsappNumber !== "Belum tersedia" ? (
                              <a
                                href={`https://wa.me/${identity.whatsappNumber.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:underline dark:text-emerald-400"
                              >
                                {identity.whatsappNumber}
                              </a>
                            ) : (
                              <span className="text-muted-foreground">Belum tersedia</span>
                            )}
                          </TableCell>
                        )}

                        {isJaringColVisible("pekerjaan") && (
                          <TableCell className="align-middle font-mono text-xs text-muted-foreground">
                            {jaring.occupation?.name ?? "-"}
                          </TableCell>
                        )}

                        {isJaringColVisible("kinerja") && (
                          <TableCell className="align-middle text-center whitespace-nowrap">
                            {(() => {
                              const kinerja = getJaringKinerjaBadge(isJaringActive(jaring) ? "ACTIVE" : "INACTIVE");
                              return (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono font-semibold text-[10px] uppercase tracking-[0.12em] whitespace-nowrap",
                                    kinerja.className,
                                  )}
                                >
                                  <span className={cn("size-1.5 rounded-full", kinerja.dotColor)} />
                                  {kinerja.label}
                                </span>
                              );
                            })()}
                          </TableCell>
                        )}

                        {isJaringColVisible("status") && (
                          <TableCell className="align-middle text-center whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-block rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] whitespace-nowrap",
                                statusBadge.className,
                              )}
                            >
                              {statusBadge.label}
                            </span>
                          </TableCell>
                        )}

                        {isJaringColVisible("aksi") && (
                          <TableCell className="align-middle text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8 gap-1.5 rounded-md border-cyan-500/30 px-2.5 font-medium text-xs text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                            >
                              <Link href={`/dashboard/daftar-jaring/${jaring.id}`}>
                                <Eye className="size-3.5" />
                                Lihat Detail
                              </Link>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {!jaringList.length ? <EmptyState title="Belum ada Jaring yang terdaftar untuk petugas ini" /> : null}
        </TabsContent>

        {/* Aktivitas Node View */}
        {canViewAuditActivity && (
          <TabsContent value="aktivitas" className="space-y-4 outline-none">
            <div
              className={cn(sectionPanelClass, "flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between")}
            >
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-xs font-medium text-muted-foreground" htmlFor="activity-period-from">
                  <span>Periode mulai</span>
                  <Input
                    id="activity-period-from"
                    className={DC_CONTROLS.input}
                    max={activityPeriodTo || undefined}
                    onChange={(event) => {
                      setActivityPeriodFrom(event.target.value);
                      setActivityPage(1);
                    }}
                    type="date"
                    value={activityPeriodFrom}
                  />
                </label>
                <label className="space-y-1.5 text-xs font-medium text-muted-foreground" htmlFor="activity-period-to">
                  <span>Periode selesai</span>
                  <Input
                    id="activity-period-to"
                    className={DC_CONTROLS.input}
                    min={activityPeriodFrom || undefined}
                    onChange={(event) => {
                      setActivityPeriodTo(event.target.value);
                      setActivityPage(1);
                    }}
                    type="date"
                    value={activityPeriodTo}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(activityPeriodFrom || activityPeriodTo) && (
                  <Button
                    className="h-9 text-xs"
                    onClick={() => {
                      setActivityPeriodFrom("");
                      setActivityPeriodTo("");
                      setActivityPage(1);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Reset Periode
                  </Button>
                )}
                <ViewModeToggle value={activityViewMode} onValueChange={setActivityViewMode} />
              </div>
            </div>

            {activityViewMode === "card" ? (
              paginatedActivityLogs.map((log) => (
                <div key={log.id} className={cn(detailCardClass, "p-4")}>
                  <p className="text-sm font-semibold text-foreground">{activityActionLabel(log.action)}</p>
                  <p className="mt-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
                    {entityTypeLabel(log.entityType)} {log.entityId ? `- ${log.entityId}` : ""} -{" "}
                    {formatDate(log.createdAt)}
                  </p>
                </div>
              ))
            ) : (
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <SortableTableHeader
                      column="waktu"
                      onSortChange={(direction) => {
                        setActivitySort({ column: "waktu", direction });
                        setActivityPage(1);
                      }}
                      sortDirection={activitySortDirection("waktu")}
                    >
                      Waktu
                    </SortableTableHeader>
                    <SortableTableHeader
                      column="aktivitas"
                      onSortChange={(direction) => {
                        setActivitySort({ column: "aktivitas", direction });
                        setActivityPage(1);
                      }}
                      sortDirection={activitySortDirection("aktivitas")}
                    >
                      Aktivitas
                    </SortableTableHeader>
                    <SortableTableHeader
                      column="entitas"
                      onSortChange={(direction) => {
                        setActivitySort({ column: "entitas", direction });
                        setActivityPage(1);
                      }}
                      sortDirection={activitySortDirection("entitas")}
                    >
                      Entitas
                    </SortableTableHeader>
                    <SortableTableHeader
                      column="ip"
                      onSortChange={(direction) => {
                        setActivitySort({ column: "ip", direction });
                        setActivityPage(1);
                      }}
                      sortDirection={activitySortDirection("ip")}
                    >
                      Alamat IP
                    </SortableTableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedActivityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-normal font-medium">{activityActionLabel(log.action)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entityTypeLabel(log.entityType)}
                        {log.entityId ? ` - ${log.entityId}` : ""}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{log.ipAddress ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!paginatedActivityLogs.length ? <EmptyState title="Belum ada log aktivitas pada periode ini" /> : null}
            {filteredActivityLogs.length ? (
              <TablePagination
                className={sectionPanelClass}
                limit={activityLimit}
                onLimitChange={(limit) => {
                  setActivityLimit(limit);
                  setActivityPage(1);
                }}
                onPageChange={setActivityPage}
                page={safeActivityPage}
                total={filteredActivityLogs.length}
              />
            ) : null}
          </TabsContent>
        )}

        {/* Baket Node View */}
        <TabsContent value="baket" className="space-y-3 outline-none">
          {baketCount > detail.reports.length ? (
            <div className={cn(sectionPanelClass, "px-4 py-3 font-mono text-xs text-muted-foreground")}>
              Menampilkan {detail.reports.length} {DOMAIN_TERMS.baket} terbaru dari total {baketCount} data.
            </div>
          ) : null}
          {detail.reports.map((report) => (
            <div key={report.id} className={cn(detailCardClass, "p-4")}>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{report.displayTitle}</h2>
                  <p className="mt-1.5 font-mono text-xs leading-relaxed text-muted-foreground">
                    {report.category?.name ?? "Tanpa kategori"} - {report.eventArea?.name ?? "Area belum ada"}
                  </p>
                </div>
                <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
                  {reportStatusLabel(report.status)}
                </span>
              </div>
            </div>
          ))}
          {!detail.reports.length ? (
            <EmptyState title={`Belum ada ${DOMAIN_TERMS.baket} yang dihasilkan petugas ini`} />
          ) : null}
        </TabsContent>

        {/* Statistik Node View */}
        <TabsContent value="kpi" className="space-y-4 outline-none">
          <section className="grid gap-4 xl:grid-cols-2">
            <InfoPanel
              title="Ringkasan Statistik"
              items={[
                [DOMAIN_TERMS.jaring, `${jaringList.length} total`],
                [
                  DOMAIN_TERMS.jaringActive90Days,
                  `${activeJaringCount} (${formatPercent(percentage(activeJaringCount, jaringList.length))})`,
                ],
                [
                  DOMAIN_TERMS.jaringInactive90Days,
                  `${inactiveJaringCount} (${formatPercent(percentage(inactiveJaringCount, jaringList.length))})`,
                ],
                [DOMAIN_TERMS.baket, `${baketCount} total`],
                ["Data Baket Ditampilkan", `${visibleBaketCount} terbaru`],
              ]}
            />
            <InfoPanel
              title="Kelengkapan Operasional"
              items={[
                [
                  "Jaring Terverifikasi",
                  `${verifiedJaringCount} (${formatPercent(percentage(verifiedJaringCount, jaringList.length))})`,
                ],
                [
                  "Jaring Belum Terverifikasi",
                  `${unverifiedJaringCount} (${formatPercent(percentage(unverifiedJaringCount, jaringList.length))})`,
                ],
                [DOMAIN_TERMS.assignmentArea, `${activeAreaCount} area aktif`],
                [
                  "Penugasan dengan Lokasi",
                  `${assignmentWithLocationCount} (${formatPercent(percentage(assignmentWithLocationCount, detail.assignments.length))})`,
                ],
                ["Baket Tidak Ditampilkan", `${hiddenBaketCount} data`],
              ]}
            />
          </section>
          {detail.kpi.note ? (
            <div className={cn(sectionPanelClass, "px-4 py-3 text-sm text-muted-foreground")}>{detail.kpi.note}</div>
          ) : null}
        </TabsContent>
      </Tabs>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* INFORMATION & STRUCTURE PANEL HELPERS                                      */
/* -------------------------------------------------------------------------- */

function StatisticPairCard({
  title,
  description,
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  total,
  icon: Icon,
  primaryClassName,
  secondaryClassName,
}: {
  title: string;
  description: string;
  primaryLabel: string;
  primaryValue: number;
  secondaryLabel: string;
  secondaryValue: number;
  total: number;
  icon: LucideIcon;
  primaryClassName: string;
  secondaryClassName: string;
}) {
  const primaryPercent = percentage(primaryValue, total);
  const secondaryPercent = percentage(secondaryValue, total);

  return (
    <section className={cn(detailCardClass, "p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={DC_TYPOGRAPHY.cardTitle}>{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <Icon className="size-4 shrink-0 text-emerald-500" aria-hidden="true" />
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="flex h-full">
          <div className={cn("h-full", primaryClassName)} style={{ width: `${primaryPercent}%` }} />
          <div className={cn("h-full", secondaryClassName)} style={{ width: `${secondaryPercent}%` }} />
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className={technicalLabelClass}>{primaryLabel}</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-foreground">
            {primaryValue} <span className="text-xs text-muted-foreground">({formatPercent(primaryPercent)})</span>
          </dd>
        </div>
        <div>
          <dt className={technicalLabelClass}>{secondaryLabel}</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-foreground">
            {secondaryValue} <span className="text-xs text-muted-foreground">({formatPercent(secondaryPercent)})</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function InfoPanel({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <section className={cn(detailCardClass, "overflow-hidden transition-colors hover:border-emerald-500/40")}>
      <div className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3">
        <Cpu className="size-4 text-emerald-500" />
        <h2 className={DC_TYPOGRAPHY.cardTitle}>{title}</h2>
      </div>

      <dl className="mt-4 grid gap-4 text-xs md:grid-cols-2">
        {items.map(([label, value]) => (
          <Field key={label} label={label} value={value} />
        ))}
      </dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border/50 py-1.5 font-mono last:border-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-xs font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}
