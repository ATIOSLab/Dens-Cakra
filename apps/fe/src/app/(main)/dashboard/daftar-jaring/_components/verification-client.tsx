"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Columns3,
  Eye,
  ImageIcon,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useRoleWorkspace } from "@/app/(main)/dashboard/_components/sidebar/role-workspace-provider";
import {
  findJaringArea,
  type JaringAdministrativeArea,
  jaringCity,
  jaringDistrict,
  jaringVillage,
  type RegistrationJaring,
} from "@/app/(main)/dashboard/koordinator-wilayah/_components/jaring-types";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { JaringIdentitySummary } from "@/components/domain/jaring-identity-summary";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { buildAreaFilterSubtitle, findDkiJakartaProvinceFilterId } from "@/lib/domain/area-filter";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_CONTROLS, DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { matchesPhoneSearch } from "@/lib/search/phone-search";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

export type { RegistrationJaring } from "@/app/(main)/dashboard/koordinator-wilayah/_components/jaring-types";

const COLUMN_OPTIONS = [
  { id: "registeredAt", label: "Waktu Terdaftar" },
  { id: "photo", label: DOMAIN_TERMS.jaringAvatar },
  { id: "name", label: DOMAIN_TERMS.jaringName },
  { id: "whatsapp", label: DOMAIN_TERMS.jaringWhatsApp },
  { id: "alias", label: DOMAIN_TERMS.jaringCode },
  { id: "fieldOfficer", label: DOMAIN_TERMS.jaringCaretaker },
  { id: "village", label: DOMAIN_TERMS.jaringPlacementArea },
  { id: "gender", label: "Jenis Kelamin" },
  { id: "address", label: "Alamat" },
  { id: "district", label: "Kecamatan" },
  { id: "occupation", label: "Pekerjaan" },
  { id: "status", label: "Status Registrasi" },
  { id: "kinerja", label: DOMAIN_TERMS.jaringActivity90Days },
] as const;

type JaringColumn = (typeof COLUMN_OPTIONS)[number]["id"];

const DEFAULT_COLUMNS: JaringColumn[] = [
  "registeredAt",
  "photo",
  "name",
  "alias",
  "fieldOfficer",
  "village",
  "status",
  "kinerja",
];

function formatDateOnly(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(value),
    );
  } catch {
    return "-";
  }
}

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

function formatGender(value?: string | null) {
  if (value === "MALE") return "Laki-laki";
  if (value === "FEMALE") return "Perempuan";
  return "-";
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value);
}

function percentOf(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 1000) / 10;
}

function profilePhotoUrl(item: RegistrationJaring) {
  const fileId = item.profilePhotoFileId ?? item.profilePhotoFile?.id;
  return fileId ? `/api/files/${fileId}` : null;
}

function officerName(item: RegistrationJaring) {
  const [caretaker] = item.caretakerAssignments;
  return caretaker ? (caretaker.fieldOfficerAssignment.userProfile.fullName ?? "-") : "-";
}

function parseTime(value?: string | null) {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function jaringAddedTime(item: RegistrationJaring) {
  return parseTime(item.createdAt) ?? parseTime(item.registeredAt) ?? 0;
}

function jaringFullNameSortKey(item: RegistrationJaring) {
  return item.fullName?.trim() || item.aliasName?.trim() || item.id;
}

function jaringDisplayName(item: RegistrationJaring) {
  return item.fullName?.trim() || item.aliasName?.trim() || item.id;
}

function jaringIdentityNote(item: RegistrationJaring) {
  const alias = item.aliasName?.trim();
  const fullName = item.fullName?.trim();
  if (fullName && alias && alias !== fullName) {
    return alias;
  }
  return null;
}

function maskedWhatsappNumber(value?: string | null) {
  const phone = value?.trim();
  if (!phone) return "-";
  if (phone.length <= 8) return phone;
  return `${phone.slice(0, 5)}...${phone.slice(-4)}`;
}

function jaringPlacementRows(item: RegistrationJaring) {
  const city = jaringCity(item);
  const district = jaringDistrict(item);
  const village = jaringVillage(item);
  const rows = [
    city ? { label: "Kota/Kabupaten", value: city.name } : null,
    district ? { label: "Kecamatan", value: district.name } : null,
    village ? { label: "Kelurahan/Desa", value: village.name } : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row?.value));

  if (rows.length > 0) return rows;

  return item.areaCoverages
    .map((coverage) => coverage.area?.name)
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ label: "Cakupan", value: name }));
}

function jaringPlacementSummary(item: RegistrationJaring) {
  const rows = jaringPlacementRows(item);
  return rows.length > 0 ? rows.map((row) => row.value).join(" / ") : "Belum ditetapkan";
}

function compareJaringFullName(left: RegistrationJaring, right: RegistrationJaring) {
  const leftName = jaringFullNameSortKey(left);
  const rightName = jaringFullNameSortKey(right);
  const result = leftName.localeCompare(rightName, "id", { sensitivity: "base" });
  return result || jaringDisplayName(left).localeCompare(jaringDisplayName(right), "id", { sensitivity: "base" });
}

function areaNames(item: RegistrationJaring) {
  return jaringPlacementSummary(item);
}

type AreaFilterOption = {
  id: string;
  name: string;
};

function addAreaOption(options: Map<string, AreaFilterOption>, area?: JaringAdministrativeArea | null) {
  if (area?.id && area.name) {
    options.set(area.id, { id: area.id, name: area.name });
  }
}

function hasAreaInHierarchy(item: RegistrationJaring, areaId: string, levels?: JaringAdministrativeArea["level"][]) {
  if (areaId === "ALL") return true;
  const acceptedLevels = levels ? new Set<JaringAdministrativeArea["level"]>(levels) : null;

  for (const coverage of item.areaCoverages) {
    let area: JaringAdministrativeArea | null | undefined = coverage.area;
    while (area) {
      if (area.id === areaId && (!acceptedLevels || acceptedLevels.has(area.level))) {
        return true;
      }
      area = area.parent;
    }
  }

  return false;
}

function sortedAreaOptions(options: Map<string, AreaFilterOption>) {
  return [...options.values()].sort((left, right) => left.name.localeCompare(right.name, "id-ID"));
}

function getInitials(name?: string | null) {
  if (!name) return "JR";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function statusLabel(status: RegistrationJaring["registrationStatus"]) {
  if (status === "APPROVED") return "Disetujui";
  if (status === "REJECTED") return "Ditolak";
  return "Menunggu Tinjauan";
}

function statusBadgeVariant(status: RegistrationJaring["registrationStatus"]) {
  if (status === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "REJECTED") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

export function JaringVerificationListClient({ initialItems }: { initialItems: RegistrationJaring[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeRole } = useRoleWorkspace();
  const canPerformAction = activeRole === SYSTEM_ROLES.FIELD_COORDINATOR;
  const isFieldOfficer = activeRole === SYSTEM_ROLES.FIELD_OFFICER;
  const [items, setItems] = useState<RegistrationJaring[]>(initialItems);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    const value = searchParams.get("registrationStatus");
    return value === "PENDING" || value === "APPROVED" || value === "REJECTED" ? value : "ALL";
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>(() => {
    const value = searchParams.get("activityStatus");
    return value === "ACTIVE" || value === "INACTIVE" ? value : "ALL";
  });
  const [provinceFilter, setProvinceFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [districtFilter, setDistrictFilter] = useState<string>("ALL");
  const [villageFilter, setVillageFilter] = useState<string>("ALL");
  const [officerFilter, setOfficerFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name_asc" | "name_desc">(() => {
    const value = searchParams.get("sortBy");
    return value === "oldest" || value === "name_asc" || value === "name_desc" ? value : "newest";
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<JaringColumn[]>(DEFAULT_COLUMNS);
  const didApplyDefaultProvinceFilter = useRef(false);

  // Quick Action Modal State
  const [selectedItemForAction, setSelectedItemForAction] = useState<{
    item: RegistrationJaring;
    action: "approve" | "reject";
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Region matching helpers
  const matchesProvince = useCallback((item: RegistrationJaring, province: string) => {
    return hasAreaInHierarchy(item, province, ["PROVINCE"]);
  }, []);

  const matchesCity = useCallback((item: RegistrationJaring, city: string) => {
    return hasAreaInHierarchy(item, city, ["CITY", "REGENCY"]);
  }, []);

  const matchesDistrict = useCallback((item: RegistrationJaring, district: string) => {
    return hasAreaInHierarchy(item, district, ["DISTRICT"]);
  }, []);

  const matchesVillage = useCallback((item: RegistrationJaring, village: string) => {
    return hasAreaInHierarchy(item, village, ["VILLAGE", "URBAN_VILLAGE"]);
  }, []);

  // Extract unique provinces, cities, districts, villages & officers for filter options
  const uniqueProvinces = useMemo(() => {
    const options = new Map<string, AreaFilterOption>();
    for (const item of items) {
      addAreaOption(options, findJaringArea(item, ["PROVINCE"]));
      for (const cov of item.areaCoverages) {
        let area: JaringAdministrativeArea | null | undefined = cov.area;
        while (area) {
          if (area.level === "PROVINCE") addAreaOption(options, area);
          area = area.parent;
        }
      }
    }
    return sortedAreaOptions(options);
  }, [items]);

  const defaultProvinceFilter = useMemo(() => findDkiJakartaProvinceFilterId(uniqueProvinces), [uniqueProvinces]);

  useEffect(() => {
    if (didApplyDefaultProvinceFilter.current || !defaultProvinceFilter || provinceFilter !== "ALL") return;

    setProvinceFilter(defaultProvinceFilter);
    setCityFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setPage(1);
    didApplyDefaultProvinceFilter.current = true;
  }, [defaultProvinceFilter, provinceFilter]);

  const uniqueCities = useMemo(() => {
    const options = new Map<string, AreaFilterOption>();
    for (const item of items) {
      if (provinceFilter !== "ALL" && !matchesProvince(item, provinceFilter)) continue;
      addAreaOption(options, jaringCity(item));
      for (const cov of item.areaCoverages) {
        if (cov.area?.level === "CITY" || cov.area?.level === "REGENCY") {
          addAreaOption(options, cov.area);
        }
      }
    }
    return sortedAreaOptions(options);
  }, [items, matchesProvince, provinceFilter]);

  const uniqueDistricts = useMemo(() => {
    const options = new Map<string, AreaFilterOption>();
    for (const item of items) {
      if (provinceFilter !== "ALL" && !matchesProvince(item, provinceFilter)) continue;
      if (cityFilter !== "ALL" && !matchesCity(item, cityFilter)) continue;
      addAreaOption(options, jaringDistrict(item));
      for (const cov of item.areaCoverages) {
        if (cov.area?.level === "DISTRICT") {
          addAreaOption(options, cov.area);
        }
      }
    }
    return sortedAreaOptions(options);
  }, [items, cityFilter, matchesCity, matchesProvince, provinceFilter]);

  const uniqueVillages = useMemo(() => {
    const options = new Map<string, AreaFilterOption>();
    for (const item of items) {
      if (provinceFilter !== "ALL" && !matchesProvince(item, provinceFilter)) continue;
      if (cityFilter !== "ALL" && !matchesCity(item, cityFilter)) continue;
      if (districtFilter !== "ALL" && !matchesDistrict(item, districtFilter)) continue;
      addAreaOption(options, jaringVillage(item));
      for (const cov of item.areaCoverages) {
        if (cov.area?.level === "VILLAGE" || cov.area?.level === "URBAN_VILLAGE") {
          addAreaOption(options, cov.area);
        }
      }
    }
    return sortedAreaOptions(options);
  }, [items, cityFilter, districtFilter, matchesCity, matchesDistrict, matchesProvince, provinceFilter]);

  const uniqueOfficers = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const name = officerName(item);
      if (name && name !== "-") set.add(name);
    }
    return Array.from(set).sort();
  }, [items]);

  // Base filtered items (non-status filters applied: City, District, Village, Officer, Search)
  const baseFilteredItems = useMemo(() => {
    return items.filter((item) => {
      if (!matchesProvince(item, provinceFilter)) return false;
      if (!matchesCity(item, cityFilter)) return false;
      if (!matchesDistrict(item, districtFilter)) return false;
      if (!matchesVillage(item, villageFilter)) return false;
      if (officerFilter !== "ALL" && officerName(item) !== officerFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const alias = (item.aliasName ?? "").toLowerCase();
        const name = (item.fullName ?? "").toLowerCase();
        const address = (item.address ?? "").toLowerCase();
        const occ = (item.occupation?.name ?? "").toLowerCase();
        const workplace = (item.workplace ?? "").toLowerCase();
        const area = areaNames(item).toLowerCase();
        const fo = officerName(item).toLowerCase();
        return (
          alias.includes(q) ||
          name.includes(q) ||
          address.includes(q) ||
          occ.includes(q) ||
          workplace.includes(q) ||
          area.includes(q) ||
          fo.includes(q) ||
          matchesPhoneSearch(item.whatsappNumber, search)
        );
      }
      return true;
    });
  }, [
    items,
    provinceFilter,
    cityFilter,
    districtFilter,
    villageFilter,
    officerFilter,
    search,
    matchesProvince,
    matchesCity,
    matchesDistrict,
    matchesVillage,
  ]);

  // Dynamically calculate summary metrics from baseFilteredItems
  const summary = useMemo(() => {
    const total = baseFilteredItems.length;
    const pending = baseFilteredItems.filter((i) => i.registrationStatus === "PENDING").length;
    const approved = baseFilteredItems.filter((i) => i.registrationStatus === "APPROVED").length;
    const rejected = baseFilteredItems.filter((i) => i.registrationStatus === "REJECTED").length;
    const active = baseFilteredItems.filter(isJaringActive).length;
    const inactive = Math.max(0, total - active);
    return { total, pending, approved, rejected, active, inactive };
  }, [baseFilteredItems]);
  const activeJaringShare = percentOf(summary.active, summary.total);
  const inactiveJaringShare = percentOf(summary.inactive, summary.total);

  const areaSubtitle = useMemo(() => {
    const provinceName = uniqueProvinces.find((area) => area.id === provinceFilter)?.name;
    if (provinceFilter !== "ALL" && cityFilter === "ALL" && provinceName) {
      return `Jumlah Jaring Provinsi ${provinceName}`;
    }
    return buildAreaFilterSubtitle({
      metricLabel: "Jumlah Jaring",
      regencyFilter: cityFilter,
      districtFilter,
      villageFilter,
      regencyOptions: uniqueCities,
      districtOptions: uniqueDistricts,
      villageOptions: uniqueVillages,
    });
  }, [
    cityFilter,
    districtFilter,
    provinceFilter,
    uniqueCities,
    uniqueDistricts,
    uniqueProvinces,
    uniqueVillages,
    villageFilter,
  ]);

  // Final filtered items with status filter applied
  const filteredItems = useMemo(() => {
    return baseFilteredItems.filter((item) => {
      if (statusFilter !== "ALL" && item.registrationStatus !== statusFilter) {
        return false;
      }
      if (activeStatusFilter === "ACTIVE" && !isJaringActive(item)) {
        return false;
      }
      if (activeStatusFilter === "INACTIVE" && isJaringActive(item)) {
        return false;
      }
      return true;
    });
  }, [baseFilteredItems, statusFilter, activeStatusFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((left, right) => {
      if (sortBy === "name_asc") {
        return compareJaringFullName(left, right);
      }
      if (sortBy === "name_desc") {
        return compareJaringFullName(right, left);
      }
      const leftTime = jaringAddedTime(left);
      const rightTime = jaringAddedTime(right);
      return sortBy === "oldest" ? leftTime - rightTime : rightTime - leftTime;
    });
  }, [filteredItems, sortBy]);

  const paginatedItems = useMemo(() => {
    return sortedItems.slice((page - 1) * limit, page * limit);
  }, [sortedItems, page, limit]);

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "ALL" ||
    activeStatusFilter !== "ALL" ||
    provinceFilter !== (defaultProvinceFilter || "ALL") ||
    cityFilter !== "ALL" ||
    districtFilter !== "ALL" ||
    villageFilter !== "ALL" ||
    officerFilter !== "ALL";

  function handleResetFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setActiveStatusFilter("ALL");
    setProvinceFilter(defaultProvinceFilter || "ALL");
    setCityFilter("ALL");
    setDistrictFilter("ALL");
    setVillageFilter("ALL");
    setOfficerFilter("ALL");
    setSortBy("newest");
    setPage(1);
  }

  function handleRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Data Jaring diperbarui.");
    }, 600);
  }

  function isColumnVisible(column: JaringColumn) {
    return visibleColumns.includes(column);
  }

  function setColumnVisibility(column: JaringColumn, visible: boolean) {
    setVisibleColumns((current) =>
      visible ? [...new Set([...current, column])] : current.filter((item) => item !== column),
    );
  }

  async function handleQuickDecision(item: RegistrationJaring, action: "approve" | "reject", reason?: string) {
    setIsSubmittingAction(true);
    try {
      await apiBrowserMutation<void>(
        "POST",
        `/jaring/${item.id}/${action === "approve" ? "approve-registration" : "reject-registration"}`,
        action === "reject" ? { reason: reason?.trim() || undefined } : undefined,
        { idempotent: true },
      );

      setItems((prevItems) =>
        prevItems.map((prev) =>
          prev.id === item.id
            ? {
                ...prev,
                registrationStatus: action === "approve" ? "APPROVED" : "REJECTED",
                rejectionReason: action === "reject" ? reason?.trim() || null : prev.rejectionReason,
              }
            : prev,
        ),
      );

      toast.success(
        action === "approve"
          ? `Pengajuan ${jaringDisplayName(item)} disetujui.`
          : `Pengajuan ${jaringDisplayName(item)} ditolak.`,
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memproses keputusan registrasi.");
    } finally {
      setIsSubmittingAction(false);
      setSelectedItemForAction(null);
      setRejectionReason("");
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
      {/* HEADER SECTION */}
      <div className="space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className={DC_TYPOGRAPHY.pageTitle}>Daftar Jaring</h1>
            <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm">
              Kelola data Jaring, wilayah penempatan, Petugas Wilayah (Gaswil), status registrasi, dan aktivitas
              pelaporan 90 hari.
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">{areaSubtitle}</p>
          </div>

          {isFieldOfficer ? (
            <Button asChild size="sm" className="h-9 shrink-0 gap-2 self-start lg:self-auto">
              <Link href="/dashboard/daftar-jaring/baru">
                <Plus className="size-4" />
                Tambah Jaring
              </Link>
            </Button>
          ) : null}
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Total Jaring */}
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL");
              setActiveStatusFilter("ALL");
              setPage(1);
            }}
            className={cn(
              "flex min-w-[170px] cursor-pointer items-center gap-3 rounded-md border bg-card p-3.5 text-left shadow-xs transition-all duration-150 active:scale-[0.98]",
              statusFilter === "ALL" && activeStatusFilter === "ALL"
                ? "border-sky-500 ring-2 ring-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10"
                : "border-slate-200/80 dark:border-white/10 hover:border-sky-500/40 hover:bg-slate-50/50 dark:hover:bg-slate-900/50",
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
              <DOMAIN_VISUALS.jaring.Icon className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total Jaring</p>
              <p className="font-bold text-foreground text-xl tracking-normal">{summary.total}</p>
            </div>
          </button>

          {/* Aktif */}
          <button
            type="button"
            onClick={() => {
              setActiveStatusFilter("ACTIVE");
              setPage(1);
            }}
            className={cn(
              "flex min-w-[170px] cursor-pointer items-center gap-3 rounded-md border bg-card p-3.5 text-left shadow-xs transition-all duration-150 active:scale-[0.98]",
              activeStatusFilter === "ACTIVE"
                ? "border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500/30 dark:bg-emerald-500/10"
                : "border-slate-200/80 hover:border-emerald-500/40 hover:bg-slate-50/50 dark:border-white/10 dark:hover:bg-slate-900/50",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DOMAIN_VISUALS.jaring.Icon className="size-5" />
            </div>
            <div>
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                {DOMAIN_TERMS.jaringActive90Days}
              </p>
              <p className="font-bold text-emerald-600 text-xl tracking-normal dark:text-emerald-400">
                {summary.active}
              </p>
              <p className="mt-1 font-mono font-semibold text-[11px] text-emerald-600 tabular-nums dark:text-emerald-400">
                {formatPercent(activeJaringShare)}% dari total
              </p>
            </div>
          </button>

          {/* Tidak Aktif */}
          <button
            type="button"
            onClick={() => {
              setActiveStatusFilter("INACTIVE");
              setPage(1);
            }}
            className={cn(
              "flex min-w-[170px] cursor-pointer items-center gap-3 rounded-md border bg-card p-3.5 text-left shadow-xs transition-all duration-150 active:scale-[0.98]",
              activeStatusFilter === "INACTIVE"
                ? "border-slate-500 bg-slate-500/5 ring-2 ring-slate-500/25 dark:bg-slate-500/10"
                : "border-slate-200/80 hover:border-slate-500/40 hover:bg-slate-50/50 dark:border-white/10 dark:hover:bg-slate-900/50",
            )}
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-400">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
                {DOMAIN_TERMS.jaringInactive90Days}
              </p>
              <p className="font-bold text-slate-600 text-xl tracking-normal dark:text-slate-300">{summary.inactive}</p>
              <p className="mt-1 font-mono font-semibold text-[11px] text-muted-foreground tabular-nums">
                {formatPercent(inactiveJaringShare)}% dari total
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* FILTER TOOLBAR CONTAINER */}
      <div className="flex flex-col gap-3 rounded-md border border-slate-200/80 dark:border-white/10 bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-3">
          <div>
            <p className={cn(DC_TYPOGRAPHY.cardTitle, "flex items-center gap-2")}>
              <Search className="size-4 text-primary" />
              Filter Daftar Jaring
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Urutan wilayah: Provinsi, Kota/Kabupaten, Kecamatan, lalu Kelurahan/Desa.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full font-mono text-[11px]">
            {hasActiveFilters ? "Filter aktif" : "Tanpa filter"}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Filter Wilayah (disembunyikan untuk Gaswil karena sudah ter-scope) */}
            {!isFieldOfficer && (
              <>
                {/* Filter Provinsi */}
                <SearchableSelect
                  aria-label="Filter Provinsi"
                  value={provinceFilter}
                  options={[
                    { value: "ALL", label: "Semua Provinsi" },
                    ...uniqueProvinces.map((province) => ({ value: province.id, label: province.name })),
                  ]}
                  onValueChange={(value) => {
                    setProvinceFilter(value);
                    setCityFilter("ALL");
                    setDistrictFilter("ALL");
                    setVillageFilter("ALL");
                    setPage(1);
                  }}
                  placeholder="Semua Provinsi"
                  searchPlaceholder="Cari provinsi..."
                  emptyText="Provinsi tidak ditemukan."
                  className="h-9 w-full min-w-[150px] sm:w-auto"
                />

                {/* Filter Kota / Kabupaten */}
                <SearchableSelect
                  aria-label="Filter Kota/Kabupaten"
                  value={cityFilter}
                  options={[
                    { value: "ALL", label: "Semua Kota/Kabupaten" },
                    ...uniqueCities.map((city) => ({ value: city.id, label: city.name })),
                  ]}
                  onValueChange={(value) => {
                    setCityFilter(value);
                    setDistrictFilter("ALL");
                    setVillageFilter("ALL");
                    setPage(1);
                  }}
                  placeholder="Semua Kota/Kabupaten"
                  searchPlaceholder="Cari kota/kabupaten..."
                  emptyText="Kota/Kabupaten tidak ditemukan."
                  className="h-9 w-full min-w-[150px] sm:w-auto"
                />

                {/* Filter Kecamatan */}
                <SearchableSelect
                  aria-label="Filter Kecamatan"
                  value={districtFilter}
                  options={[
                    { value: "ALL", label: "Semua Kecamatan" },
                    ...uniqueDistricts.map((dist) => ({ value: dist.id, label: dist.name })),
                  ]}
                  onValueChange={(value) => {
                    setDistrictFilter(value);
                    setVillageFilter("ALL");
                    setPage(1);
                  }}
                  placeholder="Semua Kecamatan"
                  searchPlaceholder="Cari kecamatan..."
                  emptyText="Kecamatan tidak ditemukan."
                  className="h-9 w-full min-w-[150px] sm:w-auto"
                />
              </>
            )}

            {/* Filter Kelurahan / Desa (untuk Gaswil = wilayah desanya) */}
            <SearchableSelect
              aria-label="Filter Kelurahan/Desa"
              value={villageFilter}
              options={[
                { value: "ALL", label: "Semua Kelurahan" },
                ...uniqueVillages.map((vill) => ({ value: vill.id, label: vill.name })),
              ]}
              onValueChange={(value) => {
                setVillageFilter(value);
                setPage(1);
              }}
              placeholder="Semua Kelurahan"
              searchPlaceholder="Cari kelurahan/desa..."
              emptyText="Kelurahan/Desa tidak ditemukan."
              className="h-9 w-full min-w-[150px] sm:w-auto"
            />

            {/* Filter Status */}
            <NativeSelect
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto min-w-[140px]"
            >
              <option value="ALL">Semua Status</option>
              <option value="PENDING">Menunggu Tinjauan</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </NativeSelect>

            {/* Filter Aktivitas Laporan 90 Hari */}
            <NativeSelect
              value={activeStatusFilter}
              onChange={(e) => {
                setActiveStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto min-w-[150px]"
            >
              <option value="ALL">Semua Aktivitas</option>
              <option value="ACTIVE">{DOMAIN_TERMS.jaringActive90Days}</option>
              <option value="INACTIVE">{DOMAIN_TERMS.jaringInactive90Days}</option>
            </NativeSelect>

            {/* Filter Petugas Wilayah (Gaswil) */}
            <SearchableSelect
              aria-label="Filter Petugas Wilayah (Gaswil)"
              value={officerFilter}
              options={[
                { value: "ALL", label: "Semua Gaswil" },
                ...uniqueOfficers.map((officer) => ({ value: officer, label: officer })),
              ]}
              onValueChange={(value) => {
                setOfficerFilter(value);
                setPage(1);
              }}
              placeholder="Semua Gaswil"
              searchPlaceholder="Cari Petugas Wilayah (Gaswil)..."
              emptyText="Petugas Wilayah (Gaswil) tidak ditemukan."
              className="h-9 w-full min-w-[160px] text-xs sm:w-auto"
            />
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            {/* Sort Dropdown */}
            <NativeSelect
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-auto min-w-[130px]"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="name_asc">Nama A-Z</option>
              <option value="name_desc">Nama Z-A</option>
            </NativeSelect>

            {/* Reset Filters */}
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filter
              </Button>
            ) : null}

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 gap-1.5 rounded-lg"
            >
              <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin text-primary")} />
              <span className="hidden sm:inline">Muat Ulang</span>
            </Button>
          </div>
        </div>
      </div>

      {/* SEARCH BAR CONTAINER (SEPARATED & POSITIONED BELOW FILTER TOOLBAR) */}
      <div className="relative w-full rounded-md border border-slate-200/80 dark:border-white/10 bg-card p-3 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari alias, nama, nomor HP, pekerjaan, Petugas Wilayah (Gaswil), atau wilayah penugasan..."
            className={cn(DC_CONTROLS.input, "pl-10 pr-9")}
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* MAIN CARD CONTAINER */}
      <Card className="overflow-hidden rounded-md border border-slate-200/80 dark:border-white/10 shadow-xs">
        {/* CARD HEADER */}
        <CardHeader className="border-b border-border/80 bg-slate-50/80 dark:bg-white/[0.02] p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                <DOMAIN_VISUALS.jaring.Icon className="size-5" />
              </div>
              <div>
                <CardTitle className="font-semibold text-foreground text-lg tracking-normal">Daftar Jaring</CardTitle>
                <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                  {filteredItems.length} Jaring dalam cakupan. {summary.pending} menunggu tinjauan registrasi.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg">
                    <Columns3 className="size-3.5" />
                    Kolom
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {COLUMN_OPTIONS.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={isColumnVisible(column.id)}
                      onCheckedChange={(checked) => setColumnVisibility(column.id, checked === true)}
                      onSelect={(event) => event.preventDefault()}
                    >
                      {column.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Badge variant="outline" className="h-7 px-3 text-xs rounded-full border-border bg-background">
                {filteredItems.length} Jaring
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="w-full min-w-[1180px]">
              <TableHeader className="bg-slate-50 dark:bg-white/5">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  {isColumnVisible("registeredAt") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "py-3.5 whitespace-nowrap")}>
                      Waktu Terdaftar
                    </TableHead>
                  ) : null}
                  {isColumnVisible("photo") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "w-12 py-3.5 text-center")}>Foto</TableHead>
                  ) : null}
                  {isColumnVisible("name") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[190px] py-3.5")}>
                      {DOMAIN_TERMS.jaringName}
                    </TableHead>
                  ) : null}
                  {isColumnVisible("whatsapp") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[170px] py-3.5")}>
                      {DOMAIN_TERMS.jaringWhatsApp}
                    </TableHead>
                  ) : null}
                  {isColumnVisible("alias") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[150px] py-3.5")}>
                      {DOMAIN_TERMS.jaringCode}
                    </TableHead>
                  ) : null}
                  {isColumnVisible("fieldOfficer") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[210px] py-3.5")}>
                      {DOMAIN_TERMS.jaringCaretaker}
                    </TableHead>
                  ) : null}
                  {isColumnVisible("village") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[260px] py-3.5")}>
                      {DOMAIN_TERMS.jaringPlacementArea}
                    </TableHead>
                  ) : null}
                  {isColumnVisible("gender") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[130px] py-3.5")}>
                      Jenis Kelamin
                    </TableHead>
                  ) : null}
                  {isColumnVisible("address") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[260px] py-3.5")}>Alamat</TableHead>
                  ) : null}
                  {isColumnVisible("district") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[170px] py-3.5")}>Kecamatan</TableHead>
                  ) : null}
                  {isColumnVisible("occupation") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[190px] py-3.5")}>Pekerjaan</TableHead>
                  ) : null}
                  {isColumnVisible("status") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[150px] py-3.5 text-center")}>
                      Status Registrasi
                    </TableHead>
                  ) : null}
                  {isColumnVisible("kinerja") ? (
                    <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[190px] py-3.5")}>
                      {DOMAIN_TERMS.jaringActivity90Days}
                    </TableHead>
                  ) : null}
                  <TableHead className={cn(DC_TYPOGRAPHY.tableHeader, "min-w-[160px] py-3.5 pr-6 text-right")}>
                    Aksi
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => {
                  const photo = profilePhotoUrl(item);
                  const foName = officerName(item);
                  const district = jaringDistrict(item);
                  const placementRows = jaringPlacementRows(item);
                  const districtName = district ? district.name : "-";
                  const identityNote = jaringIdentityNote(item);
                  const isPending = item.registrationStatus === "PENDING";
                  return (
                    <TableRow
                      key={item.id}
                      className="border-b border-slate-100 transition-colors duration-180 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-white/5"
                    >
                      {isColumnVisible("registeredAt") ? (
                        <TableCell className="align-middle py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatDateTime(item.registeredAt ?? item.createdAt)}
                        </TableCell>
                      ) : null}

                      {isColumnVisible("photo") ? (
                        <TableCell className="align-middle py-3">
                          <div className="size-8 overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 flex items-center justify-center">
                            {photo ? (
                              <Avatar className="size-full rounded-none">
                                <AvatarImage src={photo} alt={jaringDisplayName(item)} />
                                <AvatarFallback className="rounded-none bg-primary/10 text-primary font-semibold text-[10px]">
                                  {getInitials(jaringDisplayName(item))}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <ImageIcon className="size-4 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("name") ? (
                        <TableCell className="align-middle py-3 font-mono font-bold text-xs text-foreground">
                          <div className="min-w-0 max-w-[220px]">
                            <p className="truncate">{jaringDisplayName(item)}</p>
                            {identityNote ? (
                              <p className="mt-0.5 truncate font-normal text-[11px] text-muted-foreground">
                                {identityNote}
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("whatsapp") ? (
                        <TableCell className="align-middle py-3 font-mono text-xs">
                          {item.whatsappNumber ? (
                            <a
                              href={`https://wa.me/${item.whatsappNumber.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                            >
                              {maskedWhatsappNumber(item.whatsappNumber)}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Belum tersedia</span>
                          )}
                        </TableCell>
                      ) : null}

                      {isColumnVisible("alias") ? (
                        <TableCell className="align-middle py-3 font-mono text-xs font-semibold text-violet-700 dark:text-violet-400">
                          {item.aliasName || item.id}
                        </TableCell>
                      ) : null}

                      {isColumnVisible("fieldOfficer") ? (
                        <TableCell className="align-middle py-3 font-mono text-xs">
                          <div className="flex items-center gap-2.5 max-w-[220px]">
                            <div className="flex size-7 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-semibold shrink-0 dark:text-amber-400">
                              {getInitials(foName)}
                            </div>
                            <GaswilEntityLink
                              name={foName}
                              assignmentId={item.caretakerAssignments[0]?.fieldOfficerAssignment.id}
                              userProfileId={
                                item.caretakerAssignments[0]?.fieldOfficerAssignment.userProfile.id ??
                                item.caretakerAssignments[0]?.fieldOfficerAssignment.userProfileId
                              }
                              className="min-w-0 font-medium text-sm"
                            />
                          </div>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("village") ? (
                        <TableCell className="align-middle py-3 text-xs font-mono text-foreground">
                          <div className="flex items-start gap-1.5 max-w-[320px]">
                            <MapPin className="mt-0.5 size-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                            {placementRows.length > 0 ? (
                              <div className="space-y-0.5">
                                {placementRows.map((row) => (
                                  <div key={`${row.label}-${row.value}`} className="flex flex-wrap gap-x-1.5">
                                    <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                                      {row.label}
                                    </span>
                                    <span className="font-medium text-foreground">{row.value}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Belum ditetapkan</span>
                            )}
                          </div>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("gender") ? (
                        <TableCell className="align-middle py-3 text-sm text-foreground">
                          {formatGender(item.gender)}
                        </TableCell>
                      ) : null}

                      {isColumnVisible("address") ? (
                        <TableCell className="align-middle py-3">
                          <div
                            className="max-w-[260px] truncate text-sm text-foreground"
                            title={item.address ?? undefined}
                          >
                            {item.address ?? "-"}
                          </div>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("district") ? (
                        <TableCell className="align-middle py-3">
                          <span className="text-sm font-medium text-foreground">{districtName}</span>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("occupation") ? (
                        <TableCell className="align-middle py-3">
                          <div className="flex flex-col min-w-0 max-w-[200px]">
                            <span className="font-medium text-sm text-foreground truncate">
                              {item.occupation?.name ?? "-"}
                            </span>
                            {item.workplace || item.jobTitle ? (
                              <span className="text-xs text-muted-foreground truncate">
                                {[item.jobTitle, item.workplace].filter(Boolean).join(" - ")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </div>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("status") ? (
                        <TableCell className="align-middle py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-[0.08em]",
                              statusBadgeVariant(item.registrationStatus),
                            )}
                          >
                            {item.registrationStatus === "APPROVED" && <CheckCircle2 className="size-3 shrink-0" />}
                            {item.registrationStatus === "REJECTED" && <XCircle className="size-3 shrink-0" />}
                            {item.registrationStatus === "PENDING" && <Clock className="size-3 shrink-0" />}
                            {statusLabel(item.registrationStatus)}
                          </span>
                        </TableCell>
                      ) : null}

                      {isColumnVisible("kinerja") ? (
                        <TableCell className="align-middle py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold text-[10px] uppercase tracking-[0.06em]",
                              operationalStatusTone(item),
                            )}
                          >
                            {operationalStatusLabel(item)}
                          </span>
                        </TableCell>
                      ) : null}

                      <TableCell className="align-middle pr-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 text-xs rounded-lg border-border hover:border-primary hover:text-primary hover:bg-primary/5"
                          >
                            <Link href={`/dashboard/daftar-jaring/${item.id}`}>
                              <Eye className="size-3.5" />
                              <span>Detail</span>
                            </Link>
                          </Button>

                          {isFieldOfficer ? (
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1.5 text-xs rounded-lg border-border hover:border-sky-500 hover:text-sky-600 hover:bg-sky-500/5"
                            >
                              <Link href={`/dashboard/daftar-jaring/${item.id}/edit`}>
                                <Pencil className="size-3.5" />
                                <span>Ubah</span>
                              </Link>
                            </Button>
                          ) : null}

                          {isPending && canPerformAction && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItemForAction({ item, action: "reject" })}
                                className="h-8 border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 hover:text-rose-800 dark:hover:text-rose-300 font-medium text-xs rounded-lg px-2.5"
                                title="Tolak Pengajuan"
                              >
                                <XCircle className="size-3.5" />
                                <span className="hidden xl:inline">Tolak</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedItemForAction({ item, action: "approve" })}
                                className="h-8 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium text-xs rounded-lg px-2.5"
                                title="Setujui Pengajuan"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span className="hidden xl:inline">Setujui</span>
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* EMPTY STATE */}
          {!paginatedItems.length ? (
            <div className="flex flex-col items-center justify-center p-12 text-center my-6 space-y-4">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground border border-border/50 shadow-xs">
                <DOMAIN_VISUALS.jaring.Icon className="size-8 stroke-[1.5]" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-semibold text-base text-foreground">Belum ada pengajuan Jaring</h3>
                <p className="text-xs text-muted-foreground">
                  {hasActiveFilters
                    ? "Tidak ada data pengajuan yang cocok dengan filter pencarian Anda."
                    : "Pengajuan baru akan muncul setelah Petugas Wilayah (Gaswil) mengirim data."}
                </p>
              </div>
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 gap-1.5 text-xs">
                  <X className="size-3.5" /> Reset Filter
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 gap-1.5 text-xs">
                  <RefreshCw className="size-3.5" /> Muat Ulang
                </Button>
              )}
            </div>
          ) : null}

          {/* PAGINATION */}
          <div className="border-t border-border/80 p-4">
            <TablePagination
              page={page}
              limit={limit}
              total={sortedItems.length}
              onPageChange={setPage}
              onLimitChange={(nextLimit) => {
                setLimit(nextLimit);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* QUICK VERIFICATION ACTION DIALOG */}
      <AlertDialog
        open={selectedItemForAction !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmittingAction) {
            setSelectedItemForAction(null);
            setRejectionReason("");
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              {selectedItemForAction?.action === "approve" ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Setujui Pengajuan Jaring?</span>
                </>
              ) : (
                <>
                  <XCircle className="size-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>Tolak Pengajuan Jaring?</span>
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {selectedItemForAction?.action === "approve"
                ? `Pengajuan "${jaringDisplayName(selectedItemForAction.item)}" akan disetujui dan masuk ke jaringan operasional.`
                : `Pengajuan "${selectedItemForAction ? jaringDisplayName(selectedItemForAction.item) : "Jaring"}" akan ditolak dan alasan penolakan akan dicatat.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedItemForAction?.action === "reject" && (
            <div className="space-y-2 py-2">
              <label htmlFor="quick-rejection-reason" className="text-xs font-medium text-foreground">
                Alasan Penolakan (opsional)
              </label>
              <Input
                id="quick-rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan..."
                maxLength={1000}
                className="rounded-lg text-xs"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmittingAction} className="rounded-lg text-xs">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmittingAction}
              onClick={(e) => {
                e.preventDefault();
                if (selectedItemForAction) {
                  void handleQuickDecision(selectedItemForAction.item, selectedItemForAction.action, rejectionReason);
                }
              }}
              className={cn(
                "rounded-lg text-xs font-semibold",
                selectedItemForAction?.action === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500",
              )}
            >
              {isSubmittingAction
                ? "Memproses..."
                : selectedItemForAction?.action === "approve"
                  ? "Ya, Setujui"
                  : "Ya, Tolak"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

type JaringReportMedia = {
  id?: string;
  url?: string;
  fileUrl?: string;
  path?: string;
  fileName?: string;
  mimeType?: string;
};

type JaringReportItem = {
  id: string;
  referenceNumber?: string | null;
  displayTitle: string;
  content?: string | null;
  status: string;
  currentState?: string | null;
  reportedAt: string;
  submittedAt?: string | null;
  createdAt: string;
  attachments?: JaringReportMedia[];
  photos?: JaringReportMedia[];
  media?: JaringReportMedia[];
  submittedMessage?: {
    referenceNumber?: string | null;
    content?: string | null;
    status?: string | null;
    receivedAt?: string | null;
    category?: { name?: string } | null;
    attachments?: JaringReportMedia[];
    photos?: JaringReportMedia[];
    media?: JaringReportMedia[];
  } | null;
  convertedBaket?: {
    reportCategory?: { name?: string } | null;
  } | null;
};

export function JaringReportCardItem({
  rep,
  jaringId: _jaringId,
  isExpanded,
  onToggleExpand,
  detailHref,
}: {
  rep: JaringReportItem;
  jaringId: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
  detailHref?: string;
}) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const photos: string[] = [];
  const rawItems = [
    ...(rep.attachments ?? []),
    ...(rep.photos ?? []),
    ...(rep.media ?? []),
    ...(rep.submittedMessage?.attachments ?? []),
    ...(rep.submittedMessage?.photos ?? []),
    ...(rep.submittedMessage?.media ?? []),
  ];

  function reportAttachmentThumbnailUrl(src: string) {
    if (!src.startsWith("/api/files/") && !src.startsWith("/api/field-officer/files/")) return src;
    return `${src}${src.includes("?") ? "&" : "?"}thumbnail=1`;
  }
  for (const item of rawItems) {
    const url = item?.fileUrl || item?.url || item?.path;
    if (url && typeof url === "string" && !photos.includes(url)) {
      photos.push(url);
    }
  }

  const refNum = rep.referenceNumber ?? rep.submittedMessage?.referenceNumber ?? rep.id.slice(0, 8);
  const displayTitle = rep.displayTitle ?? "Laporan sedang dibuat";
  const content = rep.content ?? rep.submittedMessage?.content ?? "";
  const categoryName = rep.convertedBaket?.reportCategory?.name;
  const targetHref = detailHref ?? `/dashboard/laporan-jaring/${rep.id}`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white transition-all duration-150 dark:border-blue-400/12 dark:bg-[#111827] overflow-hidden">
      {/* Mail Header / Summary Bar */}
      <button
        type="button"
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
        className="flex w-full cursor-pointer select-none items-start justify-between gap-3 p-4 text-left transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:hover:bg-slate-900/50"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-sky-600 dark:text-sky-400 font-bold shrink-0">{refNum}</span>
            <Badge variant="outline" className="text-[10px] font-mono shrink-0">
              {rep.status ?? rep.currentState ?? "SUBMITTED"}
            </Badge>
            {photos.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                <ImageIcon className="size-3 text-sky-500" />
                {photos.length} foto
              </span>
            )}
          </div>
          <h4 className="font-semibold text-sm text-foreground truncate">{displayTitle}</h4>
          {!isExpanded && content && <p className="text-xs text-muted-foreground line-clamp-1">{content}</p>}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline-block">
            {formatDateTime(rep.reportedAt ?? rep.submittedAt ?? rep.createdAt)}
          </span>
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md">
            {isExpanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </span>
        </div>
      </button>

      {/* Expanded Mail Content Body */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-100 dark:border-blue-400/8 bg-slate-50/40 dark:bg-slate-950/20">
          {content && (
            <div className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-white dark:bg-slate-900/60 p-3 rounded border border-slate-200/60 dark:border-slate-800">
              {content}
            </div>
          )}

          {/* Photo Previews */}
          {photos.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="size-3.5 text-sky-600 dark:text-sky-400" />
                Lampiran Foto ({photos.length})
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {photos.map((photoUrl, idx) => (
                  <button
                    key={`${rep.id}-photo-${idx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(photoUrl);
                    }}
                    className="group relative size-20 rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:ring-2 hover:ring-sky-500/50 transition-all cursor-zoom-in"
                  >
                    {/* biome-ignore lint/performance/noImgElement: native img (avatar/thumbnail) with fixed sizing. */}
                    <img
                      src={reportAttachmentThumbnailUrl(photoUrl)}
                      alt={`Foto ${idx + 1}`}
                      width={80}
                      height={80}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors grid place-items-center">
                      <Eye className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Metadata info & Detail Link */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-[11px] text-muted-foreground border-t border-slate-200/60 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-3">
              {categoryName && (
                <span>
                  Kategori Baket: <strong className="text-foreground">{categoryName}</strong>
                </span>
              )}
              <span>Waktu Pelaporan: {formatDateTime(rep.reportedAt)}</span>
            </div>

            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 text-xs font-medium border-sky-500/30 text-sky-600 hover:bg-sky-500/10 dark:text-sky-400 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <Link href={targetHref}>
                <Eye className="size-3.5" />
                Detail Laporan
                <ChevronRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-3xl p-2 bg-slate-950/95 border-slate-800">
            <div className="relative flex justify-center items-center max-h-[80vh] overflow-hidden rounded">
              {/* biome-ignore lint/performance/noImgElement: native img (avatar/thumbnail) with fixed sizing. */}
              <img
                src={selectedImage}
                alt="Preview foto laporan"
                className="max-h-[78vh] w-auto object-contain rounded"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export function JaringVerificationDetailClient({ item }: { item: RegistrationJaring }) {
  const router = useRouter();
  const { activeRole } = useRoleWorkspace();
  const canPerformAction = activeRole === SYSTEM_ROLES.FIELD_COORDINATOR;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<"approve" | "reject" | null>(null);
  const [photoPreviewOpen, setPhotoPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"information" | "reports" | "coaching">("information");

  const [reports, setReports] = useState<JaringReportItem[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  const [expandedReportIds, setExpandedReportIds] = useState<Set<string>>(new Set());
  const [_reportsViewMode, _setReportsViewMode] = useState<"card" | "table">("card");
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsLimit, setReportsLimit] = useState(10);
  const [periodPreset, setPeriodPreset] = useState<"ALL" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM">("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const filteredReports = useMemo(() => {
    return reports.filter((rep) => {
      const reportDateStr = rep.reportedAt || rep.submittedAt || rep.createdAt;
      if (reportDateStr) {
        const itemTime = new Date(reportDateStr).getTime();
        const now = new Date();

        if (periodPreset === "TODAY") {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          if (itemTime < startOfDay) return false;
        } else if (periodPreset === "LAST_7_DAYS") {
          const sevenDaysAgo = now.getTime() - 7 * 24 * 3600 * 1000;
          if (itemTime < sevenDaysAgo) return false;
        } else if (periodPreset === "LAST_30_DAYS") {
          const thirtyDaysAgo = now.getTime() - 30 * 24 * 3600 * 1000;
          if (itemTime < thirtyDaysAgo) return false;
        } else if (periodPreset === "CUSTOM") {
          if (startDate && startDate.length === 10) {
            const start = new Date(`${startDate}T00:00:00`).getTime();
            if (itemTime < start) return false;
          }
          if (endDate && endDate.length === 10) {
            const end = new Date(`${endDate}T23:59:59.999`).getTime();
            if (itemTime > end) return false;
          }
        }
      }
      return true;
    });
  }, [reports, periodPreset, startDate, endDate]);

  const reportsTotalPages = Math.ceil(filteredReports.length / reportsLimit) || 1;
  const paginatedReports = useMemo(() => {
    const start = (reportsPage - 1) * reportsLimit;
    return filteredReports.slice(start, start + reportsLimit);
  }, [filteredReports, reportsPage, reportsLimit]);
  const _reportsStartIndex = filteredReports.length === 0 ? 0 : (reportsPage - 1) * reportsLimit + 1;
  const _reportsEndIndex = Math.min(reportsPage * reportsLimit, filteredReports.length);

  const toggleReportExpand = (id: string) => {
    setExpandedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (activeTab === "reports" && !reportsLoaded) {
      let cancelled = false;
      async function loadReports() {
        setReportsLoading(true);
        try {
          const res = await apiBrowserFetch<{ items?: JaringReportItem[] } | JaringReportItem[]>(
            `/jaring/${item.id}/reports`,
          );
          if (!cancelled) {
            const itemsList = Array.isArray(res) ? res : res?.items || [];
            setReports(itemsList);
            setReportsLoaded(true);
          }
        } catch (err) {
          console.error("Gagal memuat laporan jaring:", err);
        } finally {
          if (!cancelled) setReportsLoading(false);
        }
      }
      void loadReports();
      return () => {
        cancelled = true;
      };
    }
  }, [activeTab, item.id, reportsLoaded]);

  const selectedPhotoUrl = profilePhotoUrl(item);
  const villageName = jaringVillage(item)?.name ?? "-";
  const districtName = jaringDistrict(item)?.name ?? "-";
  const canDecide = item.registrationStatus === "PENDING" && canPerformAction;

  async function decide(action: "approve" | "reject") {
    setBusy(true);
    try {
      await apiBrowserMutation<void>(
        "POST",
        `/jaring/${item.id}/${action === "approve" ? "approve-registration" : "reject-registration"}`,
        action === "reject" ? { reason: reason.trim() || undefined } : undefined,
        { idempotent: true },
      );
      toast.success(action === "approve" ? "Pengajuan Jaring disetujui." : "Pengajuan Jaring ditolak.");
      router.push("/dashboard/daftar-jaring");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Keputusan gagal disimpan.");
    } finally {
      setBusy(false);
      setPendingAction(null);
    }
  }

  function decisionLabel() {
    if (busy) return "Menyimpan...";
    if (pendingAction === "approve") return "Ya, Setujui";
    return "Ya, Tolak";
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 transition-colors duration-150 sm:space-y-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-blue-400/12 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 w-fit rounded-[6px] border-slate-200 bg-white font-medium text-muted-foreground transition-all duration-150 ease-out hover:bg-slate-100 hover:text-foreground dark:border-blue-400/12 dark:bg-[#111827] dark:hover:bg-blue-400/5"
          >
            <Link href="/dashboard/daftar-jaring">
              <ArrowLeft className="mr-1.5 size-3.5 stroke-[1.5] text-sky-600 dark:text-sky-400" />
              Kembali
            </Link>
          </Button>
          <div className="hidden h-4 w-px bg-slate-200 dark:bg-blue-400/12 sm:block" />
          <h1 className="flex min-w-0 items-center gap-2 font-heading font-bold text-slate-900 text-xl tracking-normal dark:text-[#F8FAFC]">
            <DOMAIN_VISUALS.jaring.Icon className={`size-5 shrink-0 stroke-[1.5] ${DOMAIN_VISUALS.jaring.iconClass}`} />
            <span className="shrink-0">DETAIL JARING:</span>
            <span className="min-w-0 truncate font-mono tracking-wide">{jaringDisplayName(item)}</span>
          </h1>
        </div>

        <StatusPill tone={statusBadgeVariant(item.registrationStatus)}>
          {item.registrationStatus === "APPROVED" && <CheckCircle2 className="size-3.5" />}
          {item.registrationStatus === "REJECTED" && <XCircle className="size-3.5" />}
          {item.registrationStatus === "PENDING" && <Clock className="size-3.5" />}
          {detailRegistrationStatusLabel(item.registrationStatus)}
        </StatusPill>
      </div>

      <div className="flex gap-1 overflow-x-auto whitespace-nowrap border-b border-slate-200 font-mono text-[11px] dark:border-blue-400/12">
        <DetailTabButton active={activeTab === "information"} onClick={() => setActiveTab("information")}>
          PROFIL
        </DetailTabButton>
        <DetailTabButton active={activeTab === "reports"} onClick={() => setActiveTab("reports")}>
          LAPORAN JARING
        </DetailTabButton>
        <DetailTabButton active={activeTab === "coaching"} onClick={() => setActiveTab("coaching")}>
          Riwayat Pembinaan
        </DetailTabButton>
      </div>

      <div className="mx-auto max-w-3xl pt-2">
        {activeTab === "information" && (
          <div className="space-y-6">
            <DetailSection
              icon={
                <DOMAIN_VISUALS.jaring.Icon
                  className={`size-4.5 shrink-0 stroke-[1.5] ${DOMAIN_VISUALS.jaring.iconClass}`}
                />
              }
              title="Profil & Data Pribadi"
            >
              <DetailRow label="Foto">
                <div className="flex items-center gap-3">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-blue-400/12 dark:bg-slate-900/50">
                    {selectedPhotoUrl ? (
                      <button
                        type="button"
                        onClick={() => setPhotoPreviewOpen(true)}
                        className="group relative size-full cursor-zoom-in overflow-hidden"
                        aria-label={`Buka popup foto ${jaringDisplayName(item)}`}
                      >
                        {/* biome-ignore lint/performance/noImgElement: native img (avatar/thumbnail) with fixed sizing. */}
                        <img
                          src={selectedPhotoUrl}
                          alt={`Foto ${jaringDisplayName(item)}`}
                          className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
                        />
                        <span className="absolute inset-0 grid place-items-center bg-black/0 font-semibold text-[10px] text-white uppercase tracking-[0.14em] opacity-0 transition-all duration-150 group-hover:bg-black/35 group-hover:opacity-100">
                          Lihat
                        </span>
                      </button>
                    ) : (
                      <UserRound className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  {!selectedPhotoUrl && <span className="text-muted-foreground text-xs">Belum ada foto profil.</span>}
                </div>
              </DetailRow>
              <div className="py-3 sm:px-4 sm:py-4">
                <JaringIdentitySummary
                  source={{
                    id: item.id,
                    fullName: item.fullName,
                    aliasName: item.aliasName,
                    whatsappNumber: item.whatsappNumber,
                    profilePhotoFileId: item.profilePhotoFileId ?? item.profilePhotoFile?.id,
                    gaswilName: officerName(item),
                    gaswilAssignmentId: item.caretakerAssignments[0]?.fieldOfficerAssignment.id,
                    gaswilUserProfileId:
                      item.caretakerAssignments[0]?.fieldOfficerAssignment.userProfile.id ??
                      item.caretakerAssignments[0]?.fieldOfficerAssignment.userProfileId,
                    villageName,
                    districtName,
                  }}
                />
              </div>
              <DetailRow label="NIK / KTP">
                <span className="font-mono">{item.nationalIdNumber ?? "-"}</span>
              </DetailRow>
              <DetailRow label="Jenis Kelamin">{item.gender ? formatGender(item.gender) : "-"}</DetailRow>
              <DetailRow label="Tempat Lahir">{item.birthPlace ?? "-"}</DetailRow>
              <DetailRow label="Tanggal Lahir">{item.birthDate ? formatDateOnly(item.birthDate) : "-"}</DetailRow>
              <DetailRow label="Alamat">
                <span className="whitespace-pre-wrap">{item.address ?? "-"}</span>
              </DetailRow>
              <DetailRow label={DOMAIN_TERMS.jaringActivity90Days}>
                <StatusPill tone={operationalStatusTone(item)}>{operationalStatusLabel(item)}</StatusPill>
              </DetailRow>
              <DetailRow label="Terakhir Melapor">
                <span className="font-mono font-medium">
                  {item.lastReportAt ? formatDateTime(item.lastReportAt) : "Belum pernah melapor"}
                </span>
              </DetailRow>
              <DetailRow label="Status Registrasi">
                <StatusPill tone={statusBadgeVariant(item.registrationStatus)}>
                  {detailRegistrationStatusLabel(item.registrationStatus)}
                </StatusPill>
              </DetailRow>
              {item.registrationStatus === "REJECTED" && item.rejectionReason ? (
                <DetailRow label="Alasan Penolakan">
                  <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm dark:border-red-500/20 dark:bg-red-950/30 dark:text-red-300">
                    {item.rejectionReason}
                  </p>
                </DetailRow>
              ) : null}
            </DetailSection>

            <DetailSection
              icon={<BriefcaseBusiness className="size-4.5 shrink-0 stroke-[1.5] text-sky-600 dark:text-sky-400" />}
              title="Pekerjaan & Karir"
            >
              <DetailRow label="Pekerjaan">{item.occupation?.name ?? "-"}</DetailRow>
              <DetailRow label="Tempat Kerja">{item.workplace ?? "-"}</DetailRow>
              <DetailRow label="Jabatan">{item.jobTitle ?? "-"}</DetailRow>
            </DetailSection>

            <DetailSection
              icon={<ShieldCheck className="size-4.5 shrink-0 stroke-[1.5] text-sky-600 dark:text-sky-400" />}
              title="Afiliasi & Catatan"
            >
              <DetailRow label="Organisasi">{item.organizationName ?? "-"}</DetailRow>
              <DetailRow label="Afiliasi Politik">{item.politicalAffiliation ?? "-"}</DetailRow>
              <DetailRow label="Tanggal Bergabung">{item.joinedAt ? formatDateOnly(item.joinedAt) : "-"}</DetailRow>
              <div className="flex flex-col pt-3.5 pb-2">
                <span className="mb-2 font-medium text-[13px] text-slate-500 tracking-wide dark:text-[#94A3B8]">
                  Kebermanfaatan
                </span>
                <NotesBox>{item.notes ?? "Belum ada kebermanfaatan"}</NotesBox>
              </div>
            </DetailSection>
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b dark:border-blue-400/12 border-slate-200 pb-3">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <DOMAIN_VISUALS.jaringReport.Icon className={`size-4 ${DOMAIN_VISUALS.jaringReport.iconClass}`} />
                Daftar Laporan Jaring ({filteredReports.length})
              </h3>

              <div className="flex flex-wrap items-center gap-3">
                {/* Periode Filter Dropdown */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <span>Periode:</span>
                  <NativeSelect
                    value={periodPreset}
                    onChange={(e) => {
                      setPeriodPreset(e.target.value as typeof periodPreset);
                      setReportsPage(1);
                    }}
                    className="h-8 text-xs bg-background min-w-[150px]"
                  >
                    <option value="ALL">Semua Periode</option>
                    <option value="TODAY">Hari Ini</option>
                    <option value="LAST_7_DAYS">7 Hari Terakhir</option>
                    <option value="LAST_30_DAYS">30 Hari Terakhir</option>
                    <option value="CUSTOM">Kustom (Pilih Tanggal)</option>
                  </NativeSelect>
                </div>

                {/* Date Range Picker (Only shown when periodPreset === "CUSTOM") */}
                {periodPreset === "CUSTOM" && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <span>Dari:</span>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setReportsPage(1);
                        }}
                        className="h-8 text-xs bg-background w-[130px]"
                        title="Dari Tanggal"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                      <span>s.d:</span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setReportsPage(1);
                        }}
                        className="h-8 text-xs bg-background w-[130px]"
                        title="Sampai Tanggal"
                      />
                    </div>
                  </div>
                )}

                {/* Reset Filter Button */}
                {(periodPreset !== "ALL" || startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPeriodPreset("ALL");
                      setStartDate("");
                      setEndDate("");
                      setReportsPage(1);
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {reportsLoading ? (
              <div className="flex py-12 justify-center items-center gap-2 text-xs text-muted-foreground font-mono">
                <RefreshCw className="size-4 animate-spin text-sky-600 dark:text-sky-400" />
                Memuat laporan jaring...
              </div>
            ) : filteredReports.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  {paginatedReports.map((rep) => (
                    <JaringReportCardItem
                      key={rep.id}
                      rep={rep}
                      jaringId={item.id}
                      isExpanded={expandedReportIds.has(rep.id)}
                      onToggleExpand={() => toggleReportExpand(rep.id)}
                      detailHref={`/dashboard/laporan-jaring/${rep.id}`}
                    />
                  ))}
                </div>

                {reportsTotalPages > 1 && (
                  <TablePagination
                    page={reportsPage}
                    limit={reportsLimit}
                    total={filteredReports.length}
                    onPageChange={setReportsPage}
                    onLimitChange={(limit) => {
                      setReportsLimit(limit);
                      setReportsPage(1);
                    }}
                  />
                )}
              </div>
            ) : reports.length > 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-blue-400/12 p-8 text-center space-y-2">
                <DOMAIN_VISUALS.jaringReport.Icon className="mx-auto size-8 text-muted-foreground" />
                <div className="font-semibold text-sm text-foreground">Tidak ada laporan ditemukan</div>
                <p className="text-xs text-muted-foreground">
                  Tidak ada laporan yang sesuai dengan filter tanggal yang dipilih.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPeriodPreset("ALL");
                    setStartDate("");
                    setEndDate("");
                    setReportsPage(1);
                  }}
                  className="mt-2 text-xs"
                >
                  <RotateCcw className="size-3.5 mr-1" />
                  Reset Filter Tanggal
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 dark:border-blue-400/12 p-8 text-center space-y-2">
                <DOMAIN_VISUALS.jaringReport.Icon className="mx-auto size-8 text-muted-foreground" />
                <div className="font-semibold text-sm text-foreground">Belum Ada Laporan</div>
                <p className="text-xs text-muted-foreground">Jaring ini belum membuat laporan di sistem.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "coaching" && (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-blue-400/12 p-8 text-center space-y-2">
            <DOMAIN_VISUALS.jaring.Icon className="mx-auto size-8 text-muted-foreground" />
            <div className="font-semibold text-sm text-foreground">Belum Ada Laporan Pembinaan</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Histori laporan pembinaan Jaring belum tersedia.
            </p>
          </div>
        )}
      </div>

      {canDecide ? (
        <Card className="mx-auto max-w-3xl overflow-hidden rounded-[10px] border border-slate-200 bg-white shadow-sm transition-all duration-150 ease-out dark:border-blue-400/12 dark:bg-[#111827]">
          <CardHeader className="px-5 pt-4 pb-3">
            <div className="flex w-full items-center gap-3 border-b border-slate-200 pb-2.5 dark:border-blue-400/12">
              <ShieldCheck className="size-4.5 shrink-0 stroke-[1.5] text-sky-600 dark:text-sky-400" />
              <h2 className="shrink-0 font-bold text-[14px] text-slate-800 uppercase tracking-[0.08em] dark:text-[#F8FAFC]">
                Keputusan Registrasi
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-blue-400/12 dark:to-transparent" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pt-1 pb-4">
            <div className="space-y-2">
              <label htmlFor="rejection-reason" className="font-medium text-sm text-foreground">
                Alasan Penolakan (opsional)
              </label>
              <Input
                id="rejection-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Tuliskan alasan penolakan atau arahan revisi..."
                maxLength={1000}
                className="rounded-[6px] bg-background"
              />
            </div>
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => setPendingAction("reject")}
                className="h-9 gap-1.5 rounded-[6px]"
              >
                <XCircle className="size-4" /> Tolak Pengajuan
              </Button>
              <Button disabled={busy} onClick={() => setPendingAction("approve")} className="h-9 gap-1.5 rounded-[6px]">
                <CheckCircle2 className="size-4" /> Setujui Pengajuan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {selectedPhotoUrl ? (
        <Dialog open={photoPreviewOpen} onOpenChange={setPhotoPreviewOpen}>
          <DialogContent className="grid h-[88vh] w-[94vw] max-w-[94vw] grid-rows-[auto_1fr] overflow-hidden bg-[#080b11] p-3 text-white sm:max-w-[920px]">
            <DialogHeader className="pr-10">
              <DialogTitle>Foto Profil Jaring</DialogTitle>
              <DialogDescription className="text-white/60">
                {jaringIdentityNote(item) ?? jaringDisplayName(item)}
              </DialogDescription>
            </DialogHeader>
            <div className="grid min-h-0 place-items-center overflow-auto rounded-md border border-white/10 bg-black">
              {/* biome-ignore lint/performance/noImgElement: native img (avatar/thumbnail) with fixed sizing. */}
              <img
                src={selectedPhotoUrl}
                alt={`Foto profil Jaring ${jaringDisplayName(item)}`}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <AlertDialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPendingAction(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "approve" ? "Setujui pengajuan Jaring?" : "Tolak pengajuan Jaring?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "approve"
                ? "Pengajuan akan disetujui dan Jaring masuk ke jaringan operasional."
                : "Status pengajuan akan berubah menjadi ditolak. Alasan penolakan akan dicatat."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="rounded-lg">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || pendingAction === null}
              onClick={(event) => {
                event.preventDefault();
                if (pendingAction) void decide(pendingAction);
              }}
              className={cn(
                "rounded-lg",
                pendingAction === "reject"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined,
              )}
            >
              {decisionLabel()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function detailRegistrationStatusLabel(status: RegistrationJaring["registrationStatus"]) {
  if (status === "PENDING") return "MENUNGGU TINJAUAN";
  if (status === "REJECTED") return "DITOLAK / REVISI";
  return "DISETUJUI";
}

function isJaringActive(item: RegistrationJaring): boolean {
  if (!item.lastReportAt) return false;
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return new Date(item.lastReportAt).getTime() >= threeMonthsAgo;
}

function operationalStatusLabel(item: RegistrationJaring) {
  return isJaringActive(item) ? DOMAIN_TERMS.jaringActive90Days : DOMAIN_TERMS.jaringInactive90Days;
}

function operationalStatusTone(item: RegistrationJaring) {
  if (!isJaringActive(item)) {
    return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-[#22C55E]";
}

function DetailTabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer border-b-2 px-4 py-2 font-semibold text-xs transition-all duration-150",
        active
          ? "border-sky-600 bg-sky-50 text-sky-600 dark:border-sky-400 dark:bg-blue-400/5 dark:text-sky-400"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function DetailSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="overflow-hidden rounded-[10px] border border-slate-200 border-t-2 border-t-sky-500/40 bg-white shadow-sm transition-all duration-150 ease-out hover:-translate-y-[2px] hover:shadow-md dark:border-blue-400/12 dark:border-t-sky-400/40 dark:bg-[#111827] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <CardHeader className="px-5 pt-4 pb-3">
        <div className="flex w-full items-center gap-3 border-b border-slate-200 pb-2.5 dark:border-blue-400/12">
          {icon}
          <h2 className="shrink-0 font-bold text-[14px] text-slate-800 uppercase tracking-[0.08em] dark:text-[#F8FAFC]">
            {title}
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-blue-400/12 dark:to-transparent" />
        </div>
      </CardHeader>
      <CardContent className="divide-y divide-slate-100 px-5 pt-1 pb-4 dark:divide-blue-400/8">{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 py-3.5 sm:grid-cols-[160px_1fr] sm:items-center sm:gap-4">
      <span className="font-medium text-[13px] text-slate-500 tracking-wide dark:text-[#94A3B8]">{label}</span>
      <span className="break-words font-semibold text-[15px] text-slate-900 dark:text-[#F8FAFC]">{children}</span>
    </div>
  );
}

function NotesBox({ children }: { children: ReactNode }) {
  return (
    <p className="max-h-[120px] overflow-y-auto whitespace-pre-wrap rounded border border-border bg-slate-50 p-3 text-xs leading-relaxed text-slate-700 dark:border-blue-400/8 dark:bg-slate-950/40 dark:text-slate-300">
      {children}
    </p>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-[4px] border px-2.5 py-0.5 font-semibold text-[11px] uppercase tracking-wide",
        tone,
      )}
    >
      {children}
    </span>
  );
}
