"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserRound,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { isDkiJakartaProvinceArea, isDkiJakartaRegencyCityArea } from "@/features/baket/administrative-area";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";

import type { AreaSearchResult, CommandRouteType, RoleCode, UserDetail } from "./pengguna-types";
import {
  formatDateTime,
  getAssignmentRoleSummary,
  getAssignmentUnitSummary,
  getPrimaryAssignment,
  getRoleLabel,
  getUserAssignments,
  isUserLocked,
  ROLE_CODE_OPTIONS,
  ROLE_CODE_TO_AUTH_ROLE,
  toDateTimeLocalValue,
  toIsoFromLocalValue,
} from "./pengguna-types";

type PenggunaDetailClientProps = {
  user: UserDetail;
  actorUserProfileId: string;
};

type DialogState = null | "activate" | "reset-password" | "suspend" | "lock" | "unlock" | "archive" | "transfer";
type ProvisionRoleCode = Extract<
  RoleCode,
  "EXECUTIVE" | "REGIONAL_COMMANDER" | "OPERATIONAL_INTELLIGENCE_MANAGER" | "FIELD_COORDINATOR" | "FIELD_OFFICER"
>;
type BranchValue = CommandRouteType;
type AreaLevel = "COUNTRY" | "PROVINCE" | "REGENCY" | "CITY" | "DISTRICT";

const ROLE_AREA_CONFIG: Record<ProvisionRoleCode, { label: string; levels: AreaLevel[]; scopeLabel: string }> = {
  EXECUTIVE: {
    label: DOMAIN_TERMS.executiveRole,
    levels: ["COUNTRY"],
    scopeLabel: "Nasional",
  },
  REGIONAL_COMMANDER: {
    label: DOMAIN_TERMS.regionalCommanderRole,
    levels: ["PROVINCE"],
    scopeLabel: "Provinsi",
  },
  OPERATIONAL_INTELLIGENCE_MANAGER: {
    label: DOMAIN_TERMS.operationalIntelligenceManagerRole,
    levels: ["PROVINCE"],
    scopeLabel: "Provinsi",
  },
  FIELD_COORDINATOR: {
    label: DOMAIN_TERMS.fieldCoordinatorRole,
    levels: ["REGENCY", "CITY"],
    scopeLabel: "Kabupaten/Kota",
  },
  FIELD_OFFICER: {
    label: DOMAIN_TERMS.fieldOfficer,
    levels: ["DISTRICT"],
    scopeLabel: "Kecamatan",
  },
};

const DIRECTORATE_DKI_SUPERVISION_LEVELS: AreaLevel[] = ["PROVINCE", "REGENCY", "CITY"];

const BRANCH_OPTIONS: Array<{ value: BranchValue; label: string }> = [
  { value: "PUSAT", label: "Pusat" },
  { value: "BINDA", label: "Binda" },
  { value: "DIRECTORATE", label: "Direktorat" },
];

const AREA_LEVEL_LABELS: Record<AreaLevel, string> = {
  COUNTRY: "Nasional",
  PROVINCE: "Provinsi",
  REGENCY: "Kabupaten",
  CITY: "Kota",
  DISTRICT: "Kecamatan",
};

function isProvisionRoleCode(roleCode?: string | null): roleCode is ProvisionRoleCode {
  return (
    roleCode === "EXECUTIVE" ||
    roleCode === "REGIONAL_COMMANDER" ||
    roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER" ||
    roleCode === "FIELD_COORDINATOR" ||
    roleCode === "FIELD_OFFICER"
  );
}

function isDirectorateSupervisionRole(roleCode: ProvisionRoleCode) {
  return roleCode === "REGIONAL_COMMANDER" || roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER";
}

function getProvisionRoleOptions(branch: BranchValue) {
  const allowedRoleCodes: ProvisionRoleCode[] =
    branch === "PUSAT"
      ? ["EXECUTIVE"]
      : ["REGIONAL_COMMANDER", "OPERATIONAL_INTELLIGENCE_MANAGER", "FIELD_COORDINATOR", "FIELD_OFFICER"];

  return ROLE_CODE_OPTIONS.filter((option): option is { value: ProvisionRoleCode; label: string } =>
    allowedRoleCodes.includes(option.value as ProvisionRoleCode),
  );
}

function getEffectiveRoleAreaConfig(branch: BranchValue, roleCode: ProvisionRoleCode) {
  const base = ROLE_AREA_CONFIG[roleCode];
  if (branch === "DIRECTORATE" && isDirectorateSupervisionRole(roleCode)) {
    return {
      ...base,
      levels: DIRECTORATE_DKI_SUPERVISION_LEVELS,
      scopeLabel: "Provinsi / Kota/Kabupaten DKI",
    };
  }

  return base;
}

function isAllowedDirectorateSupervisionArea(area: AreaSearchResult) {
  if (area.level === "PROVINCE") {
    return !isDkiJakartaProvinceArea(area);
  }

  return isDkiJakartaRegencyCityArea(area);
}

function dedupeAreas(items: AreaSearchResult[]) {
  const areas = new Map<string, AreaSearchResult>();
  for (const item of items) {
    if (!areas.has(item.id)) {
      areas.set(item.id, item);
    }
  }

  return [...areas.values()].sort((left, right) => {
    const levelDiff = left.level.localeCompare(right.level);
    return levelDiff !== 0 ? levelDiff : left.name.localeCompare(right.name, "id-ID");
  });
}

function assignmentAreaOptions(assignment: ReturnType<typeof getPrimaryAssignment>) {
  return (
    assignment?.areaScopes.map((scope) => ({
      ...scope.area,
      id: scope.area.id,
      level: scope.area.level,
    })) ?? []
  );
}

function getAssignmentRoleLabel(assignment?: ReturnType<typeof getPrimaryAssignment>) {
  const role = getAssignmentRoleSummary(assignment);
  const authRole = role?.code ? ROLE_CODE_TO_AUTH_ROLE[role.code] : null;
  return authRole ? getRoleLabel(authRole) : "-";
}

export function PenggunaDetailClient({ user, actorUserProfileId }: PenggunaDetailClientProps) {
  const router = useRouter();
  const primaryAssignment = getPrimaryAssignment(user);
  const primaryUnit = getAssignmentUnitSummary(primaryAssignment);
  const primaryRole = getAssignmentRoleSummary(primaryAssignment);
  const locked = isUserLocked(user);
  const derivedAuthRole = primaryRole?.code ? ROLE_CODE_TO_AUTH_ROLE[primaryRole.code] : null;
  const roleIsSynchronized = derivedAuthRole === user.authUser.role;
  const isSelf = user.id === actorUserProfileId;
  const [activeDialog, setActiveDialog] = useState<DialogState>(null);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const [resetPasswordReason, setResetPasswordReason] = useState("Reset password oleh Admin Sistem.");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState("");
  const [resetRevokeSessions, setResetRevokeSessions] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordConfirmation, setShowResetPasswordConfirmation] = useState(false);
  const [activateReason, setActivateReason] = useState("Aktivasi setelah verifikasi penyediaan akun.");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [lockReason, setLockReason] = useState("");
  const [lockUntil, setLockUntil] = useState("");
  const [unlockReason, setUnlockReason] = useState("Kunci operasional dicabut oleh admin.");
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveAt, setArchiveAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [transferReason, setTransferReason] = useState("");
  const [transferAt, setTransferAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [transferBranch, setTransferBranch] = useState<BranchValue>(primaryAssignment?.branch ?? "BINDA");
  const [transferRoleCode, setTransferRoleCode] = useState<ProvisionRoleCode>(
    isProvisionRoleCode(primaryRole?.code) ? primaryRole.code : "FIELD_COORDINATOR",
  );
  const [transferAreaQuery, setTransferAreaQuery] = useState("");
  const [transferAreaResults, setTransferAreaResults] = useState<AreaSearchResult[]>([]);
  const [transferAreas, setTransferAreas] = useState<AreaSearchResult[]>(assignmentAreaOptions(primaryAssignment));
  const [transferAreasLoading, setTransferAreasLoading] = useState(false);
  const [transferAreasError, setTransferAreasError] = useState("");
  const deferredTransferAreaQuery = useDeferredValue(transferAreaQuery);
  const transferRoleOptions = useMemo(() => getProvisionRoleOptions(transferBranch), [transferBranch]);
  const transferRoleConfig = useMemo(
    () => getEffectiveRoleAreaConfig(transferBranch, transferRoleCode),
    [transferBranch, transferRoleCode],
  );
  const transferAreaIds = useMemo(() => transferAreas.map((area) => area.id), [transferAreas]);
  const transferAreaLevelLabel = transferRoleConfig.levels
    .map((level) => AREA_LEVEL_LABELS[level])
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      if (activeDialog !== "transfer") {
        return;
      }

      const keyword = deferredTransferAreaQuery.trim();
      const isNationalScope = transferRoleConfig.levels.includes("COUNTRY");
      if (!isNationalScope && keyword.length < 2) {
        setTransferAreaResults([]);
        setTransferAreasError("");
        return;
      }

      setTransferAreasLoading(true);
      setTransferAreasError("");

      try {
        const responses = await Promise.all(
          transferRoleConfig.levels.map((level) =>
            apiBrowserFetch<AreaSearchResult[]>("/administrative-areas", {
              query: {
                search: keyword,
                level,
                isActive: true,
                page: 1,
                limit: 1000,
              },
            }),
          ),
        );

        if (cancelled) return;

        const merged = dedupeAreas(
          transferBranch === "DIRECTORATE" && isDirectorateSupervisionRole(transferRoleCode)
            ? responses.flat().filter(isAllowedDirectorateSupervisionArea)
            : responses.flat(),
        );
        setTransferAreaResults(merged);
        setTransferAreasError(
          merged.length ? "" : `Tidak ada ${transferRoleConfig.scopeLabel.toLowerCase()} yang cocok.`,
        );

        if (isNationalScope) {
          const nationalArea =
            merged.find((area) => area.code === "IDN" || area.name.toLowerCase().includes("indonesia")) ?? merged[0];
          if (nationalArea) {
            setTransferAreas([nationalArea]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setTransferAreaResults([]);
          setTransferAreasError(error instanceof Error ? error.message : "Pencarian wilayah gagal.");
        }
      } finally {
        if (!cancelled) {
          setTransferAreasLoading(false);
        }
      }
    }

    void loadAreas();

    return () => {
      cancelled = true;
    };
  }, [activeDialog, deferredTransferAreaQuery, transferBranch, transferRoleCode, transferRoleConfig]);

  useEffect(() => {
    if (activeDialog !== "transfer") return;

    const currentRole = getAssignmentRoleSummary(primaryAssignment)?.code;
    const nextRoleCode = isProvisionRoleCode(currentRole) ? currentRole : "FIELD_COORDINATOR";
    const nextBranch = primaryAssignment?.branch ?? "BINDA";
    const compatibleRoleCode = getProvisionRoleOptions(nextBranch).some((option) => option.value === nextRoleCode)
      ? nextRoleCode
      : nextBranch === "PUSAT"
        ? "EXECUTIVE"
        : "FIELD_COORDINATOR";

    setTransferBranch(nextBranch);
    setTransferRoleCode(compatibleRoleCode);
    setTransferAreas(assignmentAreaOptions(primaryAssignment));
    setTransferAreaQuery("");
    setTransferAreaResults([]);
    setTransferAreasError("");
    setTransferReason("Perubahan cakupan wilayah supervisi.");
    setTransferAt(toDateTimeLocalValue(new Date().toISOString()));
  }, [activeDialog, primaryAssignment]);

  const assignmentTimeline = useMemo(
    () =>
      [...getUserAssignments(user)].sort(
        (left, right) => new Date(right.validFrom).getTime() - new Date(left.validFrom).getTime(),
      ),
    [user],
  );
  const resetPasswordError =
    resetPassword.length > 0 && resetPassword.length < 8
      ? "Password baru minimal 8 karakter."
      : resetPassword.length > 128
        ? "Password baru maksimal 128 karakter."
        : resetPasswordConfirmation.length > 0 && resetPassword !== resetPasswordConfirmation
          ? "Konfirmasi password tidak cocok."
          : "";
  const canResetPassword =
    resetPassword.length >= 8 &&
    resetPassword.length <= 128 &&
    resetPassword === resetPasswordConfirmation &&
    resetPasswordReason.trim().length >= 2;
  const canTransferAssignment =
    transferReason.trim().length >= 2 && Boolean(transferAt) && transferAreaIds.length > 0 && Boolean(transferRoleCode);

  function resetTransferAreas() {
    setTransferAreas([]);
    setTransferAreaQuery("");
    setTransferAreaResults([]);
    setTransferAreasError("");
  }

  function handleTransferBranchChange(nextBranch: BranchValue) {
    setTransferBranch(nextBranch);
    const options = getProvisionRoleOptions(nextBranch);
    if (!options.some((option) => option.value === transferRoleCode)) {
      setTransferRoleCode(options[0]?.value ?? "FIELD_COORDINATOR");
    }
    resetTransferAreas();
  }

  function handleTransferRoleChange(nextRoleCode: ProvisionRoleCode) {
    setTransferRoleCode(nextRoleCode);
    if (nextRoleCode === "EXECUTIVE" && transferBranch !== "PUSAT") {
      setTransferBranch("PUSAT");
    } else if (nextRoleCode !== "EXECUTIVE" && transferBranch === "PUSAT") {
      setTransferBranch("BINDA");
    }
    resetTransferAreas();
  }

  function toggleTransferArea(area: AreaSearchResult) {
    if (transferBranch === "DIRECTORATE" && isDirectorateSupervisionRole(transferRoleCode)) {
      if (!isAllowedDirectorateSupervisionArea(area)) {
        toast.error("Direktorat/Ditwil memilih Provinsi non-DKI atau Kota/Kabupaten DKI sebagai cakupan supervisi.");
        return;
      }
    }

    let nextAreas: AreaSearchResult[];
    if (transferBranch === "BINDA" || transferBranch === "PUSAT") {
      nextAreas = transferAreaIds[0] === area.id ? [] : [area];
    } else if (transferAreaIds.includes(area.id)) {
      nextAreas = transferAreas.filter((item) => item.id !== area.id);
    } else {
      nextAreas = [...transferAreas, area];
    }

    setTransferAreas(nextAreas);
  }

  async function executeAction({
    key,
    request,
    successMessage,
    redirectToList = false,
  }: {
    key: string;
    request: () => Promise<void>;
    successMessage: string;
    redirectToList?: boolean;
  }) {
    setSubmittingAction(key);

    try {
      await request();
      toast.success(successMessage);
      setActiveDialog(null);

      if (redirectToList) {
        router.push("/dashboard/admin-system/pengguna");
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi pengguna gagal dijalankan.");
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard/admin-system/pengguna"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Daftar Pengguna
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={DC_TYPOGRAPHY.pageTitle}>{user.fullName ?? user.authUser.name ?? user.authUser.email}</h1>
              {user.status === "ACTIVE" && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
                  Aktif
                </Badge>
              )}
              {user.status === "PENDING" && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs">
                  Menunggu
                </Badge>
              )}
              {user.status === "SUSPENDED" && (
                <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20 text-xs">
                  Ditangguhkan
                </Badge>
              )}
              {locked && (
                <Badge variant="destructive" className="text-xs">
                  Terkunci
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              @{user.username ?? "-"} {user.authUser.email ? `- ${user.authUser.email}` : ""} - Login terakhir:{" "}
              {formatDateTime(user.lastLoginAt)}
            </p>
          </div>

          <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
            <Link href={`/dashboard/admin-system/pengguna/${user.id}/edit`}>
              <PencilLine className="size-3.5" />
              Ubah Metadata
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Identity & Role Sync */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserRound className="size-4 text-primary" />
                Identitas Akun & Role Sistem
              </CardTitle>
              <CardDescription className="text-xs">
                Kondisi akun Better Auth dan sinkronisasi role domain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Role Login
                  </span>
                  <div className="font-semibold text-sm text-foreground">{getRoleLabel(user.authUser.role)}</div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Role Domain
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {derivedAuthRole ? getRoleLabel(derivedAuthRole) : "Belum terdeteksi"}
                  </div>
                </div>
              </div>

              {!roleIsSynchronized && (
                <Alert variant="destructive" className="py-2.5">
                  <ShieldAlert className="size-4 shrink-0" />
                  <AlertTitle className="text-xs font-semibold">Role Auth Tidak Sinkron</AlertTitle>
                  <AlertDescription className="text-xs mt-0.5">
                    Role Better Auth pada akun ini tidak cocok dengan role penempatan utama aktif.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs border-t border-border/40">
                <div>
                  <span className="text-muted-foreground">Status Profil:</span>
                  <div className="font-medium text-foreground mt-0.5">{user.status}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Banned Auth:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {user.authUser.banned ? "Ya (Banned)" : "Normal"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Operational Lock:</span>
                  <div className="font-medium text-foreground mt-0.5">{locked ? "Aktif" : "Tidak Aktif"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit & Cakupan Wilayah */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserCog className="size-4 text-primary" />
                Penempatan Unit & Cakupan Wilayah
              </CardTitle>
              <CardDescription className="text-xs">
                Informasi unit organisasi aktif dan wilayah cakupan operasional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">
                    {primaryUnit?.name || primaryAssignment?.branch || "-"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {getAssignmentRoleLabel(primaryAssignment)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Kode Unit: {primaryUnit?.code || "-"} - Berlaku sejak {formatDateTime(primaryAssignment?.validFrom)}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5" /> Cakupan Wilayah Operasional
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {primaryAssignment?.areaScopes.map((scope) => (
                    <Badge
                      key={`${scope.area.id}-${scope.id ?? scope.areaId}`}
                      variant={scope.isPrimary ? "default" : "secondary"}
                      className="text-xs py-1 px-2.5"
                    >
                      {scope.area.name}
                      {scope.isPrimary ? " (Utama)" : ""}
                    </Badge>
                  )) ?? <span className="text-xs text-muted-foreground italic">Belum ada cakupan wilayah</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Histori Penugasan */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="size-4 text-primary" />
                Histori Penugasan
              </CardTitle>
              <CardDescription className="text-xs">
                Rekam jejak mutasi unit, role, dan wilayah operasional pengguna.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {assignmentTimeline.map((assignment, index) => (
                <div key={assignment.id} className="rounded-lg border border-border/50 bg-card p-3.5 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-foreground">
                      {getAssignmentUnitSummary(assignment)?.name || assignment.branch || "-"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {assignment.isPrimary ? (
                        <Badge className="text-[10px] py-0">Utama</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0">
                          Pendukung
                        </Badge>
                      )}
                      {assignment.isActive ? (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Role: <span className="font-medium text-foreground">{getAssignmentRoleLabel(assignment)}</span> -{" "}
                    {formatDateTime(assignment.validFrom)} s/d {formatDateTime(assignment.validUntil)}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {assignment.areaScopes.map((scope) => (
                      <Badge
                        key={`${assignment.id}-${scope.area.id}-${scope.id ?? scope.areaId}`}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {scope.area.name} {scope.isPrimary ? " (Utama)" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Admin Actions */}
        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Aksi Operasional Admin
              </CardTitle>
              <CardDescription className="text-xs">Tindakan administratif langsung ke server aplikasi.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("activate")}
                disabled={user.status === "ACTIVE"}
              >
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                Aktivasi Ulang Profil
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("reset-password")}
              >
                <KeyRound className="size-4 text-primary" />
                Atur Ulang Kata Sandi
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("suspend")}
                disabled={isSelf}
              >
                <UserX className="size-4 text-orange-600 dark:text-orange-400" />
                Tangguhkan Pengguna
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("lock")}
                disabled={locked}
              >
                <Lock className="size-4 text-rose-600 dark:text-rose-400" />
                Kunci Operasional
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("unlock")}
                disabled={!locked}
              >
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                Buka Kunci Operasional
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("transfer")}
              >
                <ArrowRightLeft className="size-4 text-blue-600 dark:text-blue-400" />
                Ubah Role/Cakupan Wilayah
              </Button>

              <div className="pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs h-9"
                  onClick={() => setActiveDialog("archive")}
                >
                  Arsipkan Pengguna
                </Button>
              </div>
            </CardContent>
          </Card>

          {isSelf && (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <AlertTitle className="text-xs font-semibold">Profil Anda Sendiri</AlertTitle>
              <AlertDescription className="text-xs mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                Tombol suspend dinonaktifkan untuk akun Anda sendiri demi keamanan sesi.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {/* Activate Dialog */}
      <Dialog open={activeDialog === "activate"} onOpenChange={(open) => setActiveDialog(open ? "activate" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktivasi Profil Pengguna</DialogTitle>
            <DialogDescription>
              Aktivasi ulang akun pengguna setelah verifikasi penyediaan akun atau status penempatan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="activate-reason" className="text-xs">
              Alasan Aktivasi
            </Label>
            <Input
              id="activate-reason"
              value={activateReason}
              onChange={(event) => setActivateReason(event.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "activate" || activateReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "activate",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/activate`, {
                      reason: activateReason.trim(),
                    }).then(() => undefined),
                  successMessage: "Profil berhasil diaktifkan ulang.",
                })
              }
            >
              {submittingAction === "activate" ? "Memproses..." : "Aktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Atur Ulang Kata Sandi */}
      <Dialog
        open={activeDialog === "reset-password"}
        onOpenChange={(open) => setActiveDialog(open ? "reset-password" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur Ulang Kata Sandi Pengguna</DialogTitle>
            <DialogDescription>
              Tetapkan kata sandi baru untuk akun ini. Sesi login aktif dapat dicabut setelah kata sandi diperbarui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-reason" className="text-xs">
                Alasan Pengaturan Ulang
              </Label>
              <Input
                id="reset-password-reason"
                value={resetPasswordReason}
                onChange={(event) => setResetPasswordReason(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-new" className="text-xs">
                Kata Sandi Baru
              </Label>
              <div className="relative">
                <Input
                  id="reset-password-new"
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className="h-9 pr-10 text-sm"
                />
                <button
                  type="button"
                  className="-translate-y-1/2 absolute top-1/2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowResetPassword((value) => !value)}
                  aria-label={showResetPassword ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
                >
                  {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-confirm" className="text-xs">
                Konfirmasi Kata Sandi Baru
              </Label>
              <div className="relative">
                <Input
                  id="reset-password-confirm"
                  type={showResetPasswordConfirmation ? "text" : "password"}
                  value={resetPasswordConfirmation}
                  onChange={(event) => setResetPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  className="h-9 pr-10 text-sm"
                />
                <button
                  type="button"
                  className="-translate-y-1/2 absolute top-1/2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowResetPasswordConfirmation((value) => !value)}
                  aria-label={
                    showResetPasswordConfirmation
                      ? "Sembunyikan konfirmasi kata sandi"
                      : "Tampilkan konfirmasi kata sandi"
                  }
                >
                  {showResetPasswordConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {resetPasswordError && <p className="text-xs text-destructive">{resetPasswordError}</p>}
            </div>
            <label
              htmlFor="reset-revoke-sessions"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 p-3 text-xs"
            >
              <Checkbox
                id="reset-revoke-sessions"
                checked={resetRevokeSessions}
                onCheckedChange={(checked) => setResetRevokeSessions(checked === true)}
              />
              <span>Cabut semua sesi login aktif setelah kata sandi diperbarui</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "reset-password" || !canResetPassword}
              onClick={() =>
                executeAction({
                  key: "reset-password",
                  request: async () => {
                    await apiBrowserMutation("POST", `/user-profiles/${user.id}/reset-password`, {
                      password: resetPassword,
                      reason: resetPasswordReason.trim(),
                      revokeSessions: resetRevokeSessions,
                    });
                    setResetPassword("");
                    setResetPasswordConfirmation("");
                    setShowResetPassword(false);
                    setShowResetPasswordConfirmation(false);
                  },
                  successMessage: "Kata sandi pengguna berhasil diatur ulang.",
                })
              }
            >
              {submittingAction === "reset-password" ? "Memproses..." : "Atur Ulang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Tangguhkan */}
      <Dialog open={activeDialog === "suspend"} onOpenChange={(open) => setActiveDialog(open ? "suspend" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tangguhkan Akun Pengguna</DialogTitle>
            <DialogDescription>
              Akses akun akan dibekukan sementara. Sesi login aktif dapat dicabut secara instan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="suspend-reason" className="text-xs">
                Alasan Penangguhan
              </Label>
              <Input
                id="suspend-reason"
                value={suspendReason}
                onChange={(event) => setSuspendReason(event.target.value)}
                placeholder="Misal: Investigasi internal atau mutasi sementara"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suspend-until" className="text-xs">
                Berlaku Sampai (Opsional)
              </Label>
              <Input
                id="suspend-until"
                type="datetime-local"
                value={suspendUntil}
                onChange={(event) => setSuspendUntil(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <label
              htmlFor="suspend-revoke-sessions"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 p-3 text-xs"
            >
              <Checkbox
                id="suspend-revoke-sessions"
                checked={revokeSessions}
                onCheckedChange={(checked) => setRevokeSessions(checked === true)}
              />
              <span>Cabut semua sesi login aktif setelah penangguhan dijalankan</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingAction === "suspend" || suspendReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "suspend",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/suspend`, {
                      reason: suspendReason.trim(),
                      revokeSessions,
                      ...(suspendUntil ? { until: toIsoFromLocalValue(suspendUntil) } : {}),
                    }).then(() => undefined),
                  successMessage: "Pengguna berhasil ditangguhkan.",
                })
              }
            >
              {submittingAction === "suspend" ? "Memproses..." : "Tangguhkan Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Dialog */}
      <Dialog open={activeDialog === "lock"} onOpenChange={(open) => setActiveDialog(open ? "lock" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Operasional User</DialogTitle>
            <DialogDescription>
              Pasang lock operasional untuk memutus akses segera tanpa mengubah status profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lock-reason" className="text-xs">
                Alasan Kunci Operasional
              </Label>
              <Input
                id="lock-reason"
                value={lockReason}
                onChange={(event) => setLockReason(event.target.value)}
                placeholder="Misal: Perangkat hilang atau audit darurat"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lock-until" className="text-xs">
                Terkunci Sampai (Opsional)
              </Label>
              <Input
                id="lock-until"
                type="datetime-local"
                value={lockUntil}
                onChange={(event) => setLockUntil(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingAction === "lock" || lockReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "lock",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/lock`, {
                      reason: lockReason.trim(),
                      ...(lockUntil ? { lockedUntil: toIsoFromLocalValue(lockUntil) } : {}),
                    }).then(() => undefined),
                  successMessage: "Kunci operasional berhasil dipasang.",
                })
              }
            >
              {submittingAction === "lock" ? "Memproses..." : "Kunci Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={activeDialog === "unlock"} onOpenChange={(open) => setActiveDialog(open ? "unlock" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lepas Kunci Operasional</DialogTitle>
            <DialogDescription>Mencabut kunci operasional pada akun pengguna ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="unlock-reason" className="text-xs">
              Alasan Buka Kunci
            </Label>
            <Input
              id="unlock-reason"
              value={unlockReason}
              onChange={(event) => setUnlockReason(event.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "unlock" || unlockReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "unlock",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/unlock`, {
                      reason: unlockReason.trim(),
                    }).then(() => undefined),
                  successMessage: "Kunci operasional berhasil dilepas.",
                })
              }
            >
              {submittingAction === "unlock" ? "Memproses..." : "Buka Kunci"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={activeDialog === "archive"} onOpenChange={(open) => setActiveDialog(open ? "archive" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan Pengguna</DialogTitle>
            <DialogDescription>
              Pengguna akan dikeluarkan dari daftar aktif dan penugasan akan ditutup.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="archive-reason" className="text-xs">
                Alasan Pengarsipan
              </Label>
              <Input
                id="archive-reason"
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                placeholder="Misal: Pensiun / Mutasi keluar sistem"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="archive-at" className="text-xs">
                Efektif Pada
              </Label>
              <Input
                id="archive-at"
                type="datetime-local"
                value={archiveAt}
                onChange={(event) => setArchiveAt(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingAction === "archive" || archiveReason.trim().length < 2 || !archiveAt}
              onClick={() =>
                executeAction({
                  key: "archive",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/archive`, {
                      reason: archiveReason.trim(),
                      effectiveAt: toIsoFromLocalValue(archiveAt),
                    }).then(() => undefined),
                  successMessage: "Pengguna berhasil diarsipkan.",
                  redirectToList: true,
                })
              }
            >
              {submittingAction === "archive" ? "Memproses..." : "Arsipkan Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={activeDialog === "transfer"} onOpenChange={(open) => setActiveDialog(open ? "transfer" : null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ubah Role dan Cakupan Wilayah</DialogTitle>
            <DialogDescription>
              Buat penugasan aktif baru untuk mengubah role, jalur unit, atau cakupan wilayah pengguna.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="transfer-branch" className="text-xs">
                  Jalur Unit
                </Label>
                <NativeSelect
                  id="transfer-branch"
                  value={transferBranch}
                  onChange={(event) => handleTransferBranchChange(event.target.value as BranchValue)}
                  className="h-9 text-sm"
                >
                  {BRANCH_OPTIONS.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transfer-role" className="text-xs">
                  Role Sistem
                </Label>
                <NativeSelect
                  id="transfer-role"
                  value={transferRoleCode}
                  onChange={(event) => handleTransferRoleChange(event.target.value as ProvisionRoleCode)}
                  className="h-9 text-sm"
                >
                  {transferRoleOptions.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>

            {transferBranch === "DIRECTORATE" && isDirectorateSupervisionRole(transferRoleCode) ? (
              <Alert className="border-sky-500/30 bg-sky-500/10 text-sky-950 dark:text-sky-100">
                <Globe className="size-4 text-sky-600 dark:text-sky-300" />
                <AlertTitle className="text-xs font-semibold">{DOMAIN_TERMS.dkiDirectorateSupervisionScope}</AlertTitle>
                <AlertDescription className="text-xs">
                  Non-DKI memakai cakupan Provinsi. Khusus DKI Jakarta, pilih Kota/Kabupaten administratif sesuai
                  penugasan supervisi Admin Sistem.
                </AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="transfer-reason" className="text-xs">
                  Alasan Mutasi
                </Label>
                <Input
                  id="transfer-reason"
                  value={transferReason}
                  onChange={(event) => setTransferReason(event.target.value)}
                  placeholder="Misal: Rotasi cakupan supervisi"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="transfer-at" className="text-xs">
                  Tanggal Efektif
                </Label>
                <Input
                  id="transfer-at"
                  type="datetime-local"
                  value={transferAt}
                  onChange={(event) => setTransferAt(event.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfer-area-query" className="text-xs">
                Cari Cakupan Wilayah
              </Label>
              <Input
                id="transfer-area-query"
                value={transferAreaQuery}
                onChange={(event) => setTransferAreaQuery(event.target.value)}
                placeholder={`Ketik minimal 2 karakter ${transferRoleConfig.scopeLabel.toLowerCase()}...`}
                className="h-9 text-sm"
                disabled={transferRoleConfig.levels.includes("COUNTRY")}
              />
              <p className="text-[11px] text-muted-foreground">
                Level wilayah: {transferAreaLevelLabel || transferRoleConfig.scopeLabel}.
              </p>
              {transferAreaResults.length > 0 ? (
                <div className="max-h-[180px] overflow-y-auto rounded-lg border border-border/60 bg-popover">
                  {transferAreaResults.map((area) => {
                    const selected = transferAreaIds.includes(area.id);
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => toggleTransferArea(area)}
                        className="flex w-full items-center justify-between gap-3 border-b border-border/30 px-3 py-2 text-left text-xs last:border-0 hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium text-foreground">{area.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {AREA_LEVEL_LABELS[area.level as AreaLevel] ?? area.level} -{" "}
                            {area.officialCode || area.code}
                          </div>
                        </div>
                        <Badge variant={selected ? "default" : "outline"} className="text-[10px]">
                          {selected ? "Dipilih" : "Pilih"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-xs text-muted-foreground">
                  {transferAreasLoading
                    ? "Mencari wilayah..."
                    : transferAreaQuery.trim().length < 2 && !transferRoleConfig.levels.includes("COUNTRY")
                      ? "Ketik minimal 2 karakter untuk mencari wilayah."
                      : transferAreasError || "Wilayah tidak ditemukan."}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Cakupan Wilayah Baru</Label>
              <div className="flex flex-wrap gap-1.5">
                {transferAreas.length ? (
                  transferAreas.map((area, index) => (
                    <Badge
                      key={area.id}
                      variant={index === 0 ? "default" : "secondary"}
                      className="gap-1 py-1 pr-1 pl-2 text-[10px]"
                    >
                      {area.name} {index === 0 ? "(Utama)" : ""}
                      <button
                        type="button"
                        className="rounded px-1 text-[11px] hover:bg-background/30"
                        onClick={() => setTransferAreas((items) => items.filter((item) => item.id !== area.id))}
                        aria-label={`Hapus ${area.name}`}
                      >
                        x
                      </button>
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Pilih cakupan wilayah dari daftar pencarian.
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "transfer" || !canTransferAssignment}
              onClick={() =>
                executeAction({
                  key: "transfer",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/change-primary-assignment`, {
                      reason: transferReason.trim(),
                      roleCode: transferRoleCode,
                      branch: transferBranch,
                      areaScopeIds: transferAreaIds,
                      effectiveAt: toIsoFromLocalValue(transferAt),
                    }).then(() => undefined),
                  successMessage: "Role dan cakupan wilayah berhasil diperbarui.",
                })
              }
            >
              {submittingAction === "transfer" ? "Memproses..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
