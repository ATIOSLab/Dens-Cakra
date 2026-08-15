"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronsUpDown,
  Copy,
  Globe,
  KeyRound,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Field, FieldContent, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isDkiJakartaProvinceArea, isDkiJakartaRegencyCityArea } from "@/features/baket/administrative-area";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

import { type CreateUserFormValues, createUserSchema } from "./pengguna-schemas";
import {
  type AreaSearchResult,
  formatDateTime,
  getAssignmentRoleSummary,
  getPrimaryAssignment,
  ROLE_CODE_OPTIONS,
  ROLE_CODE_TO_AUTH_ROLE,
  type RoleCode,
  toDateTimeLocalValue,
  toIsoFromLocalValue,
  type UserProvisionResponse,
} from "./pengguna-types";

type ProvisionRoleCode = Extract<
  RoleCode,
  "EXECUTIVE" | "REGIONAL_COMMANDER" | "OPERATIONAL_INTELLIGENCE_MANAGER" | "FIELD_COORDINATOR" | "FIELD_OFFICER"
>;
type BranchValue = "PUSAT" | "BINDA" | "DIRECTORATE";
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
const USERS_ROUTE = "/dashboard/admin-system/pengguna";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value.trim());
}

function normalizeAreaOption(area: AreaSearchResult) {
  const id = typeof area.id === "string" ? area.id.trim() : "";
  if (!isUuid(id)) {
    return null;
  }

  return {
    ...area,
    id,
  };
}

function normalizeAreaScopeIds(areaScopeIds: string[]) {
  const normalizedIds: string[] = [];
  for (const areaId of areaScopeIds) {
    const id = areaId.trim();
    if (!isUuid(id) || normalizedIds.includes(id)) {
      continue;
    }
    normalizedIds.push(id);
  }

  return normalizedIds;
}

function dedupeAreas(items: AreaSearchResult[]) {
  const areas = new Map<string, AreaSearchResult>();
  for (const item of items) {
    const area = normalizeAreaOption(item);
    if (area && !areas.has(area.id)) {
      areas.set(area.id, area);
    }
  }
  return [...areas.values()].sort((left, right) => {
    const levelDiff = left.level.localeCompare(right.level);
    return levelDiff !== 0 ? levelDiff : left.name.localeCompare(right.name);
  });
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

function isDirectorateSupervisionRole(roleCode: ProvisionRoleCode) {
  return roleCode === "REGIONAL_COMMANDER" || roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER";
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

function areaCommandEmptyMessage(areasLoading: boolean, areaQuery: string, areasError: string) {
  if (areasLoading) return "Mencari wilayah...";
  if (areaQuery.trim().length < 2) return "Ketik minimal 2 karakter untuk mencari.";
  return areasError || "Wilayah tidak ditemukan.";
}

export function PenggunaCreateClient() {
  const router = useRouter();
  const [branch, setBranch] = useState<BranchValue>("BINDA");
  const [roleCode, setRoleCode] = useState<ProvisionRoleCode>("FIELD_COORDINATOR");
  const [areaQuery, setAreaQuery] = useState("");
  const [areaOptions, setAreaOptions] = useState<AreaSearchResult[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [areasError, setAreasError] = useState("");
  const [selectedAreas, setSelectedAreas] = useState<AreaSearchResult[]>([]);
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successState, setSuccessState] = useState<UserProvisionResponse | null>(null);
  const [pendingValues, setPendingValues] = useState<CreateUserFormValues | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      branch,
      roleCode,
      username: "",
      email: "",
      password: "",
      validFrom: toDateTimeLocalValue(new Date().toISOString()),
      areaScopeIds: [],
    },
  });

  const roleConfig = getEffectiveRoleAreaConfig(branch, roleCode);
  const selectedAreaIds = form.watch("areaScopeIds") ?? [];
  const branchLabel = BRANCH_OPTIONS.find((option) => option.value === branch)?.label ?? branch;
  const roleOptions = getProvisionRoleOptions(branch);

  useEffect(() => {
    form.setValue("branch", branch, { shouldDirty: true, shouldValidate: Boolean(form.formState.errors.branch) });
    form.setValue("roleCode", roleCode, { shouldDirty: true, shouldValidate: Boolean(form.formState.errors.roleCode) });
    setAreaQuery("");
    setAreaOptions([]);
    setAreasError("");
    setSelectedAreas([]);
    form.setValue("areaScopeIds", [], { shouldDirty: true, shouldValidate: false });
  }, [branch, form, roleCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      const keyword = areaQuery.trim();
      const isNationalScope = roleConfig.levels.includes("COUNTRY");
      if (!isNationalScope && keyword.length < 2) {
        setAreaOptions([]);
        setAreasError("");
        return;
      }

      setAreasLoading(true);
      setAreasError("");

      try {
        const responses = await Promise.all(
          roleConfig.levels.map((level) =>
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

        if (!cancelled) {
          const merged = dedupeAreas(
            branch === "DIRECTORATE" && isDirectorateSupervisionRole(roleCode)
              ? responses.flat().filter(isAllowedDirectorateSupervisionArea)
              : responses.flat(),
          );
          setAreaOptions(merged);
          setAreasError(merged.length ? "" : `Tidak ada ${roleConfig.scopeLabel.toLowerCase()} yang cocok.`);
          if (isNationalScope) {
            const nationalArea =
              merged.find((area) => area.code === "IDN" || area.name.toLowerCase().includes("indonesia")) ?? merged[0];
            if (nationalArea) {
              setSelectedAreas([nationalArea]);
              form.setValue("areaScopeIds", [nationalArea.id], {
                shouldDirty: true,
                shouldValidate: Boolean(form.formState.errors.areaScopeIds),
              });
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          setAreaOptions([]);
          setAreasError(error instanceof Error ? error.message : "Pencarian wilayah gagal.");
        }
      } finally {
        if (!cancelled) {
          setAreasLoading(false);
        }
      }
    }

    void loadAreas();

    return () => {
      cancelled = true;
    };
  }, [areaQuery, branch, form, roleCode, roleConfig.levels, roleConfig.scopeLabel]);

  function handleBranchChange(nextBranch: BranchValue) {
    setBranch(nextBranch);
    if (nextBranch === "PUSAT") {
      setRoleCode("EXECUTIVE");
    } else if (roleCode === "EXECUTIVE") {
      setRoleCode("REGIONAL_COMMANDER");
    }
  }

  function handleRoleChange(nextRoleCode: ProvisionRoleCode) {
    setRoleCode(nextRoleCode);
    if (nextRoleCode === "EXECUTIVE") {
      setBranch("PUSAT");
    } else if (branch === "PUSAT") {
      setBranch("BINDA");
    }
  }

  function toggleArea(area: AreaSearchResult) {
    const normalizedArea = normalizeAreaOption(area);
    if (!normalizedArea) {
      form.setError("areaScopeIds", {
        type: "validate",
        message: "Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar.",
      });
      toast.error("Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar.");
      return;
    }

    let nextAreas: AreaSearchResult[];
    if (branch === "BINDA") {
      nextAreas = selectedAreaIds[0] === normalizedArea.id ? [] : [normalizedArea];
    } else if (selectedAreaIds.includes(normalizedArea.id)) {
      nextAreas = selectedAreas.filter((item) => item.id !== normalizedArea.id);
    } else {
      nextAreas = [...selectedAreas, normalizedArea];
    }

    setSelectedAreas(nextAreas);
    form.setValue("areaScopeIds", normalizeAreaScopeIds(nextAreas.map((item) => item.id)), {
      shouldDirty: true,
      shouldValidate: Boolean(form.formState.errors.areaScopeIds),
    });
    if (branch === "BINDA" && nextAreas.length) {
      setAreaPopoverOpen(false);
    }
  }

  function requestProvisionConfirmation(values: CreateUserFormValues) {
    const areaScopeIds = normalizeAreaScopeIds(values.areaScopeIds);
    if (!areaScopeIds.length) {
      toast.error(`Pilih satu ${roleConfig.scopeLabel.toLowerCase()}.`);
      return;
    }
    if (areaScopeIds.length !== values.areaScopeIds.length) {
      form.setError("areaScopeIds", {
        type: "validate",
        message: "Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar.",
      });
      toast.error("Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar.");
      return;
    }
    if (values.branch === "BINDA" && areaScopeIds.length !== 1) {
      toast.error("Binda hanya boleh memilih satu wilayah cakupan.");
      return;
    }
    if (values.branch === "PUSAT" && values.roleCode !== "EXECUTIVE") {
      toast.error(`Unit Pusat hanya tersedia untuk role ${DOMAIN_TERMS.executiveRole}.`);
      return;
    }
    if (values.roleCode === "EXECUTIVE" && values.branch !== "PUSAT") {
      toast.error(`Role ${DOMAIN_TERMS.executiveRole} harus menggunakan unit Pusat.`);
      return;
    }

    setPendingValues({ ...values, areaScopeIds });
  }

  async function executeProvision(values: CreateUserFormValues) {
    const areaScopeIds = normalizeAreaScopeIds(values.areaScopeIds);
    if (areaScopeIds.length !== values.areaScopeIds.length) {
      form.setError("areaScopeIds", {
        type: "validate",
        message: "Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar.",
      });
      setPendingValues(null);
      toast.error("Cakupan wilayah tidak valid. Pilih ulang wilayah dari daftar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const email = typeof values.email === "string" ? values.email.trim() : "";
      const response = await apiBrowserMutation<UserProvisionResponse>("POST", "/user-profiles/provision", {
        auth: {
          name: values.username.trim(),
          ...(email ? { email } : {}),
          password: values.password,
          role: ROLE_CODE_TO_AUTH_ROLE[values.roleCode],
        },
        profile: {
          username: values.username.trim(),
        },
        assignment: {
          branch: values.branch,
          validFrom: toIsoFromLocalValue(values.validFrom),
        },
        areaScopeIds,
      });

      setSuccessState(response);
      setPendingValues(null);
      toast.success("User baru berhasil diprovision.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Provisioning user gagal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const copyPasswordToClipboard = (password: string) => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    toast.success("Password tersalin ke clipboard.");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  if (successState) {
    const createdUser = successState.userProfile;
    const primaryAssignment = getPrimaryAssignment(createdUser);
    const assignmentRole = getAssignmentRoleSummary(primaryAssignment);
    const assignedAreas = primaryAssignment?.areaScopes.map((scope) => scope.area) ?? [];
    const passwordToShow = successState.generatedTempPassword ?? form.getValues("password") ?? "-";

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            Provisioning Selesai
          </Badge>
        </div>
        <div className="space-y-1">
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Akun pengguna berhasil dibuat</h1>
          <p className="text-sm text-muted-foreground">
            Pengguna baru telah terdaftar di sistem. Catat password awal di bawah ini sebelum menutup halaman.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-3 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                Detail Kredensial Provisioning
              </CardTitle>
              <CardDescription className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                Informasi login dan kredensial sementara akun pengguna.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-emerald-500/20 bg-background/90 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">PASSWORD AKUN</span>
                  <span className="text-[11px] text-muted-foreground">
                    Diterbitkan: {formatDateTime(new Date().toISOString())}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-3 font-mono text-sm">
                  <span className="font-semibold text-foreground break-all">{passwordToShow}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => copyPasswordToClipboard(passwordToShow)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    title="Salin password"
                  >
                    {copiedPassword ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Gunakan password ini saat pertama kali melakukan login akun.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild type="button" size="sm">
                  <Link href={`/dashboard/admin-system/pengguna/${createdUser.id}`}>Buka detail pengguna</Link>
                </Button>
                <Button asChild type="button" variant="outline" size="sm">
                  <Link href={USERS_ROUTE}>Kembali ke daftar</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Ringkasan Pengguna</CardTitle>
              <CardDescription className="text-xs">Profil yang baru dibuat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <div className="font-semibold text-foreground">
                  {createdUser.fullName || createdUser.authUser.name || createdUser.username}
                </div>
                <div className="text-xs text-muted-foreground">
                  @{createdUser.username || "-"} {createdUser.authUser.email ? `• ${createdUser.authUser.email}` : ""}
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="default" className="text-[11px]">
                    {createdUser.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-medium text-foreground">{assignmentRole?.name ?? "-"}</span>
                </div>
                <div className="flex items-start justify-between text-xs gap-2">
                  <span className="text-muted-foreground shrink-0">Wilayah:</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {assignedAreas.map((area) => (
                      <Badge key={area.id} variant="secondary" className="text-[10px]">
                        {area.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="space-y-1.5">
        <Link
          href={USERS_ROUTE}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Daftar Pengguna
        </Link>
        <div className="flex items-center gap-3">
          <h1 className={DC_TYPOGRAPHY.pageTitle}>Tambah Pengguna</h1>
          <Badge variant="outline" className="text-xs font-normal">
            Provisioning
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Isi tipe unit, role penempatan, wilayah cakupan operasional, serta kredensial akun pengguna baru.
        </p>
      </div>

      {/* Main Grid */}
      <form onSubmit={form.handleSubmit(requestProvisionConfirmation)} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Form Panel */}
        <div className="space-y-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ShieldCheck className="size-4 text-primary" />
                Penempatan & Cakupan Wilayah
              </CardTitle>
              <CardDescription className="text-xs">
                Tentukan tipe unit organisasi dan role penempatan operasional user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit Type
                  </FieldLabel>
                  <FieldContent>
                    <NativeSelect
                      value={branch}
                      onChange={(event) => handleBranchChange(event.target.value as BranchValue)}
                      className="h-9 text-sm"
                    >
                      {BRANCH_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Role Penempatan
                  </FieldLabel>
                  <FieldContent>
                    <NativeSelect
                      value={roleCode}
                      onChange={(event) => handleRoleChange(event.target.value as ProvisionRoleCode)}
                      className="h-9 text-sm"
                    >
                      {roleOptions.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Wilayah Cakupan ({roleConfig.scopeLabel})
                  </FieldLabel>
                  <span className="text-[11px] text-muted-foreground">
                    {branch === "BINDA" ? "Maks 1 wilayah" : "Satu atau lebih wilayah"}
                  </span>
                </div>
                <FieldContent className="mt-1.5 space-y-2">
                  <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={areaPopoverOpen}
                        className="h-10 w-full justify-between bg-transparent text-left text-sm font-normal border-border/70"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 truncate">
                          <Globe className="size-4 text-muted-foreground shrink-0" />
                          {selectedAreas.length ? (
                            <span className="font-medium text-foreground">
                              {selectedAreas.map((a) => a.name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Pilih {roleConfig.scopeLabel.toLowerCase()}...
                            </span>
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[min(600px,calc(100vw-3rem))] p-0">
                      <Command className="bg-popover text-popover-foreground" shouldFilter={false}>
                        <CommandInput
                          placeholder={`Cari nama ${roleConfig.scopeLabel.toLowerCase()}...`}
                          value={areaQuery}
                          onValueChange={setAreaQuery}
                        />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                            {areaCommandEmptyMessage(areasLoading, areaQuery, areasError)}
                          </CommandEmpty>
                          <CommandGroup>
                            {areaOptions.map((area) => {
                              const selected = selectedAreaIds.includes(area.id);

                              return (
                                <CommandItem
                                  key={area.id}
                                  value={`${area.code}-${area.name}`}
                                  onSelect={() => toggleArea(area)}
                                  className="items-start gap-2.5 py-2 text-sm"
                                >
                                  <Check
                                    className={cn(
                                      "mt-0.5 size-4 text-primary shrink-0",
                                      selected ? "opacity-100" : "opacity-0",
                                    )}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="block font-medium text-foreground">{area.name}</span>
                                    <span className="block text-xs text-muted-foreground">
                                      {area.code} • {AREA_LEVEL_LABELS[area.level as AreaLevel] ?? area.level}
                                      {area.parent?.name ? ` • ${area.parent.name}` : ""}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {selectedAreas.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedAreas.map((area) => (
                        <Badge key={area.id} variant="secondary" className="gap-1 text-xs py-1 px-2.5">
                          {area.name}
                          <button
                            type="button"
                            className="rounded-full hover:bg-muted p-0.5 transition-colors"
                            aria-label={`Hapus ${area.name}`}
                            onClick={() => toggleArea(area)}
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FieldError errors={[form.formState.errors.areaScopeIds]} />
                </FieldContent>
              </Field>
            </CardContent>
          </Card>

          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <KeyRound className="size-4 text-primary" />
                Kredensial Akun User
              </CardTitle>
              <CardDescription className="text-xs">
                Username dan password awal wajib diisi. Email bersifat opsional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    htmlFor="username"
                  >
                    Username
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="username"
                      {...form.register("username")}
                      placeholder="username.user"
                      className="h-9 text-sm"
                    />
                    <FieldError errors={[form.formState.errors.username]} />
                  </FieldContent>
                </Field>

                <Field>
                  <FieldLabel
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    htmlFor="email"
                  >
                    Email (Opsional)
                  </FieldLabel>
                  <FieldContent>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="user@denscakra.local"
                      className="h-9 text-sm"
                    />
                    <FieldError errors={[form.formState.errors.email]} />
                  </FieldContent>
                </Field>
              </div>

              <Field>
                <FieldLabel
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  htmlFor="password"
                >
                  Password Awal
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="password"
                    type="password"
                    {...form.register("password")}
                    placeholder="Password awal"
                    className="h-9 text-sm"
                  />
                  <FieldError errors={[form.formState.errors.password]} />
                </FieldContent>
              </Field>
            </CardContent>

            <CardFooter className="flex items-center justify-between gap-3 border-t border-border/40 bg-muted/20 px-6 py-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCancelDialogOpen(true)}>
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={areasLoading || isSubmitting}>
                {isSubmitting ? "Memproses..." : "Provision User"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Summary Sidebar */}
        <div className="space-y-4">
          <div className="sticky top-6 space-y-4">
            <Card className="border border-border/60 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UserPlus className="size-4 text-muted-foreground" />
                  Ringkasan Provisioning
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Unit Type
                  </span>
                  <div className="font-medium text-sm text-foreground">{branchLabel}</div>
                </div>

                <div className="space-y-1 pt-2 border-t border-border/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Role</span>
                  <div className="font-medium text-sm text-foreground">{roleConfig.label}</div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/40">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Wilayah Cakupan
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {selectedAreas.length > 0 ? (
                      selectedAreas.map((area) => (
                        <Badge key={area.id} variant="secondary" className="text-[10px]">
                          {area.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="italic text-muted-foreground text-xs">Belum dipilih</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <AlertTitle className="text-xs font-semibold">Password Sementara</AlertTitle>
              <AlertDescription className="text-xs mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                Password awal yang dimasukkan akan digunakan langsung saat penyediaan akun selesai.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </form>

      {/* Dialog Confirm Provision */}
      <AlertDialog open={Boolean(pendingValues)} onOpenChange={(open) => !open && setPendingValues(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Provision User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin data penempatan, role, wilayah, dan kredensial pengguna sudah benar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting || !pendingValues}
              onClick={(event) => {
                event.preventDefault();
                if (pendingValues) {
                  void executeProvision(pendingValues);
                }
              }}
            >
              {isSubmitting ? "Memproses..." : "Ya, Provision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Cancel */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Provisioning?</AlertDialogTitle>
            <AlertDialogDescription>
              Form yang telah diisi akan dibatalkan dan Anda akan kembali ke daftar pengguna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali ke Form</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push(USERS_ROUTE)}>Ya, Batalkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
