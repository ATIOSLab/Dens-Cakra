"use client";

import { useDeferredValue, useEffect, useMemo, useState, type ReactNode } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

import {
  POSITION_CODE_OPTIONS,
  type AreaSearchResult,
  type AreaSummary,
  type OrganizationUnitSummary,
  type PositionCode,
  type RoleCode,
} from "../../pengguna/_components/pengguna-types";
import type { RegionalMasterOverview } from "../../organisasi-wilayah/_components/organisasi-wilayah-types";
import { BRANCH_OPTIONS, type JabatanResource } from "./jabatan-types";

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  position?: JabatanResource;
};

type BranchValue = "PUSAT" | "BINDA" | "DIRECTORATE";
type AreaLevel = "COUNTRY" | "PROVINCE" | "REGENCY" | "CITY" | "DISTRICT";
type RegionalAnchorOption = {
  unitId: string;
  code: string;
  name: string;
  type: "BINDA" | "DIRECTORATE";
  coverageAreas: AreaSearchResult[];
  primaryProvinceAreaId: string | null;
};

const DEFAULT_POSITION: PositionCode = "PETUGAS_ORGANIK";

function roleForPosition(positionCode: PositionCode): RoleCode {
  if (positionCode === "DEPUTI_II") return "EXECUTIVE";
  if (positionCode === "KABINDA" || positionCode === "DIREKTUR_WILAYAH") return "REGIONAL_COMMANDER";
  if (positionCode === "KABAGOPS" || positionCode === "KASUBDIT") return "OPERATIONAL_INTELLIGENCE_MANAGER";
  if (positionCode === "KORWIL" || positionCode === "STAF_SUBDIT") return "FIELD_COORDINATOR";
  if (positionCode === "PETUGAS_ORGANIK") return "FIELD_OFFICER";
  return "FIELD_OFFICER";
}

function defaultBranchForPosition(positionCode: PositionCode): BranchValue {
  if (positionCode === "DEPUTI_II") return "PUSAT";
  if (positionCode === "DIREKTUR_WILAYAH" || positionCode === "KASUBDIT" || positionCode === "STAF_SUBDIT") {
    return "DIRECTORATE";
  }
  return "BINDA";
}

function defaultPositionForBranch(branch: BranchValue): PositionCode {
  if (branch === "PUSAT") return "DEPUTI_II";
  if (branch === "DIRECTORATE") return "DIREKTUR_WILAYAH";
  return "KABINDA";
}

function isPositionAllowedForBranch(positionCode: PositionCode, branch: BranchValue) {
  if (branch === "PUSAT") return positionCode === "DEPUTI_II";
  if (branch === "DIRECTORATE") {
    return ["DIREKTUR_WILAYAH", "KASUBDIT", "STAF_SUBDIT", "PETUGAS_ORGANIK"].includes(positionCode);
  }
  return ["KABINDA", "KABAGOPS", "KORWIL", "PETUGAS_ORGANIK"].includes(positionCode);
}

function requiredAreaLevelLabel(roleCode: RoleCode) {
  if (roleCode === "EXECUTIVE") return "Negara";
  if (roleCode === "REGIONAL_COMMANDER" || roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER") return "Provinsi";
  if (roleCode === "FIELD_COORDINATOR") return "Kabupaten/Kota";
  if (roleCode === "FIELD_OFFICER") return "Kecamatan";
  return "Wilayah";
}

function toAreaSearchResult(area: AreaSummary): AreaSearchResult {
  return { id: area.id, code: area.code, name: area.name, level: area.level };
}

function uniqueAreas(areas: AreaSearchResult[]) {
  return [...new Map(areas.map((area) => [area.id, area])).values()];
}

function toggleArea(current: AreaSearchResult[], area: AreaSearchResult) {
  return current.some((item) => item.id === area.id)
    ? current.filter((item) => item.id !== area.id)
    : [...current, area];
}

function areaChip(area: AreaSearchResult, isPrimary: boolean, onRemove: () => void) {
  return (
    <Badge key={area.id} variant={isPrimary ? "default" : "outline"} className="gap-2">
      {area.name}
      {isPrimary ? " (utama)" : ""}
      <button type="button" onClick={onRemove} className="text-current/70 transition hover:text-current">
        x
      </button>
    </Badge>
  );
}

export function JabatanFormClient({ mode, position }: Props) {
  const router = useRouter();
  const isCreate = mode === "create";
  const isEdit = mode === "edit";

  const initialPositionCode = position?.code ?? DEFAULT_POSITION;
  const [positionCode, setPositionCode] = useState<PositionCode>(initialPositionCode);
  const [branch, setBranch] = useState<BranchValue>(
    (position?.branch as BranchValue | undefined) ?? defaultBranchForPosition(initialPositionCode),
  );
  const [seatCode, setSeatCode] = useState(position?.seatCode ?? "");
  const [title, setTitle] = useState(position?.title ?? "");
  const [isActive, setIsActive] = useState(position?.isActive ?? true);

  const [unitQuery, setUnitQuery] = useState("");
  const [unitResults, setUnitResults] = useState<OrganizationUnitSummary[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<OrganizationUnitSummary | null>(position?.organizationUnit ?? null);
  const [selectedAreas, setSelectedAreas] = useState<AreaSearchResult[]>(
    position?.areaCoverages?.map((coverage) => coverage.area) ?? [],
  );
  const [regionalOverview, setRegionalOverview] = useState<RegionalMasterOverview | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [regencyCityAreas, setRegencyCityAreas] = useState<AreaSearchResult[]>([]);
  const [selectedRegencyCityId, setSelectedRegencyCityId] = useState<string | null>(null);
  const [drilldownAreas, setDrilldownAreas] = useState<AreaSearchResult[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deferredUnitQuery = useDeferredValue(unitQuery);
  const roleCode = useMemo(() => roleForPosition(positionCode), [positionCode]);
  const positionOptions = useMemo(
    () => POSITION_CODE_OPTIONS.filter((option) => isPositionAllowedForBranch(option.value as PositionCode, branch)),
    [branch],
  );

  useEffect(() => {
    if (!isCreate) return;
    if (!isPositionAllowedForBranch(positionCode, branch)) {
      setPositionCode(defaultPositionForBranch(branch));
    }
  }, [branch, isCreate, positionCode]);

  useEffect(() => {
    let cancelled = false;

    async function loadUnits() {
      if (!isCreate || branch !== "PUSAT" || deferredUnitQuery.trim().length < 2) {
        setUnitResults([]);
        return;
      }

      const results = await apiBrowserFetch<OrganizationUnitSummary[]>("/organization-units", {
        query: { search: deferredUnitQuery.trim(), page: 1, limit: 12 },
      });
      if (!cancelled) setUnitResults(results);
    }

    loadUnits().catch(() => {
      if (!cancelled) setUnitResults([]);
    });

    return () => {
      cancelled = true;
    };
  }, [branch, deferredUnitQuery, isCreate]);

  useEffect(() => {
    let cancelled = false;

    async function loadRegionalMasters() {
      if (!isCreate || branch === "PUSAT") {
        setRegionalOverview(null);
        return;
      }

      setRegionalLoading(true);
      try {
        const result = await apiBrowserFetch<RegionalMasterOverview>("/organization-units/regional-masters");
        if (!cancelled) setRegionalOverview(result);
      } finally {
        if (!cancelled) setRegionalLoading(false);
      }
    }

    loadRegionalMasters().catch(() => {
      if (!cancelled) {
        setRegionalOverview(null);
        setRegionalLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [branch, isCreate]);

  useEffect(() => {
    let cancelled = false;

    async function loadCountryScope() {
      if (!isCreate || branch !== "PUSAT") {
        return;
      }

      const countries = await apiBrowserFetch<AreaSearchResult[]>("/administrative-areas", {
        query: { level: "COUNTRY", isActive: true, page: 1, limit: 10 },
      });
      if (!cancelled && countries.length && selectedAreas.length === 0) {
        setSelectedAreas([countries.find((area) => area.name.toLowerCase().includes("indonesia")) ?? countries[0]]);
      }
    }

    loadCountryScope().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [branch, isCreate, selectedAreas.length]);

  const regionalAnchors = useMemo<RegionalAnchorOption[]>(() => {
    if (!regionalOverview) return [];

    if (branch === "BINDA") {
      return regionalOverview.provinces
        .filter((province) => province.binda)
        .map((province) => ({
          unitId: province.binda!.unitId,
          code: province.binda!.code,
          name: province.binda!.name,
          type: "BINDA" as const,
          coverageAreas: [toAreaSearchResult(province.province)],
          primaryProvinceAreaId: province.province.id,
        }));
    }

    if (branch === "DIRECTORATE") {
      const directorates = new Map<string, RegionalAnchorOption>();
      for (const province of regionalOverview.provinces) {
        for (const directorate of province.directorates) {
          directorates.set(directorate.unitId, {
            unitId: directorate.unitId,
            code: directorate.code,
            name: directorate.name,
            type: "DIRECTORATE" as const,
            coverageAreas: uniqueAreas(
              directorate.coverageAreas.map((area) => ({
                id: area.areaId,
                code: area.code,
                name: area.name,
                level: area.level,
              })),
            ),
            primaryProvinceAreaId: directorate.primaryProvinceAreaId,
          });
        }
      }
      return [...directorates.values()].sort((left, right) => left.name.localeCompare(right.name));
    }

    return [];
  }, [branch, regionalOverview]);

  const selectedAnchor = useMemo(
    () => regionalAnchors.find((anchor) => anchor.unitId === selectedUnit?.id) ?? null,
    [regionalAnchors, selectedUnit?.id],
  );

  const selectedProvince = useMemo(
    () => selectedAnchor?.coverageAreas.find((area) => area.id === selectedProvinceId) ?? null,
    [selectedAnchor, selectedProvinceId],
  );

  useEffect(() => {
    if (!isCreate) return;
    setSelectedUnit(null);
    setSelectedAreas([]);
    setSelectedProvinceId(null);
    setSelectedRegencyCityId(null);
    setRegencyCityAreas([]);
    setDrilldownAreas([]);
    setUnitQuery("");
  }, [branch, isCreate]);

  useEffect(() => {
    if (!isCreate || !selectedAnchor) return;

    const firstProvinceId = selectedAnchor.primaryProvinceAreaId ?? selectedAnchor.coverageAreas[0]?.id ?? null;
    setSelectedProvinceId((current) =>
      current && selectedAnchor.coverageAreas.some((area) => area.id === current) ? current : firstProvinceId,
    );
    setSelectedRegencyCityId(null);

    if (roleCode === "REGIONAL_COMMANDER" || roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER") {
      setSelectedAreas(selectedAnchor.coverageAreas);
    } else {
      setSelectedAreas([]);
    }
  }, [isCreate, roleCode, selectedAnchor]);

  useEffect(() => {
    if (!isCreate || roleCode !== "FIELD_OFFICER") return;
    setSelectedAreas([]);
  }, [isCreate, roleCode, selectedRegencyCityId]);

  useEffect(() => {
    let cancelled = false;

    async function loadRegencyCities() {
      if (
        !isCreate ||
        branch === "PUSAT" ||
        (roleCode !== "FIELD_COORDINATOR" && roleCode !== "FIELD_OFFICER") ||
        !selectedProvinceId
      ) {
        setRegencyCityAreas([]);
        setSelectedRegencyCityId(null);
        return;
      }

      const [regencies, cities] = await Promise.all([
        apiBrowserFetch<AreaSearchResult[]>(`/administrative-areas/${selectedProvinceId}/children`, {
          query: { level: "REGENCY" satisfies AreaLevel },
        }),
        apiBrowserFetch<AreaSearchResult[]>(`/administrative-areas/${selectedProvinceId}/children`, {
          query: { level: "CITY" satisfies AreaLevel },
        }),
      ]);
      if (!cancelled) {
        const options = uniqueAreas([...regencies, ...cities]);
        setRegencyCityAreas(options);
        setDrilldownAreas(roleCode === "FIELD_COORDINATOR" ? options : []);
        setSelectedRegencyCityId((current) =>
          current && options.some((area) => area.id === current) ? current : null,
        );
      }
    }

    loadRegencyCities().catch(() => {
      if (!cancelled) {
        setRegencyCityAreas([]);
        setDrilldownAreas([]);
        setSelectedRegencyCityId(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [branch, isCreate, roleCode, selectedProvinceId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDistricts() {
      if (!isCreate || roleCode !== "FIELD_OFFICER" || !selectedRegencyCityId) {
        if (roleCode === "FIELD_OFFICER") {
          setDrilldownAreas([]);
        }
        return;
      }

      setDrilldownLoading(true);
      try {
        const districts = await apiBrowserFetch<AreaSearchResult[]>(
          `/administrative-areas/${selectedRegencyCityId}/children`,
          { query: { level: "DISTRICT" satisfies AreaLevel } },
        );
        if (!cancelled) setDrilldownAreas(districts);
      } finally {
        if (!cancelled) setDrilldownLoading(false);
      }
    }

    loadDistricts().catch(() => {
      if (!cancelled) {
        setDrilldownAreas([]);
        setDrilldownLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isCreate, roleCode, selectedRegencyCityId]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (isEdit && position) {
        await apiBrowserMutation("PATCH", `/positions/${position.id}`, { title: title.trim(), isActive });
        toast.success("Jabatan berhasil diperbarui.");
        router.push(`/dashboard/admin-system/jabatan-reporting-line/${position.id}`);
        router.refresh();
        return;
      }

      if (!selectedUnit?.id || !seatCode.trim() || !title.trim() || selectedAreas.length === 0) {
        toast.error("Lengkapi kode seat, nama jabatan, penempatan, dan wilayah tanggung jawab.");
        return;
      }
      await apiBrowserMutation<JabatanResource>("POST", "/positions", {
        seatCode: seatCode.trim(),
        code: positionCode,
        title: title.trim(),
        roleCode,
        branch,
        organizationUnitId: selectedUnit.id,
        areaScopeIds: selectedAreas.map((area) => area.id),
        primaryAreaId: selectedAreas[0]?.id,
      });
      toast.success("Jabatan berhasil dibuat.");
      router.push("/dashboard/admin-system/jabatan-reporting-line");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi jabatan gagal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Badge variant="outline">{isCreate ? "Tambah Jabatan" : "Edit Jabatan"}</Badge>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {isCreate ? "Buat master jabatan" : position?.title}
          </h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            {isCreate
              ? "Pilih tipe jabatan, unit, penempatan, dan wilayah agar jabatan siap dipakai saat provisioning pengguna."
              : "Perubahan jabatan akan dipakai oleh flow provisioning dan mutasi user berikutnya."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={position ? `/dashboard/admin-system/jabatan-reporting-line/${position.id}` : "/dashboard/admin-system/jabatan-reporting-line"}>
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </Button>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="size-4" />
            Data jabatan
          </CardTitle>
          <CardDescription>
            Master jabatan menjadi sumber unit, penempatan, dan scope wilayah user.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel>Unit</FieldLabel>
                  <FieldContent>
                    <NativeSelect value={branch} disabled={!isCreate} onChange={(event) => setBranch(event.target.value as BranchValue)}>
                      {BRANCH_OPTIONS.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Tipe jabatan</FieldLabel>
                  <FieldContent>
                    <NativeSelect value={positionCode} disabled={!isCreate} onChange={(event) => setPositionCode(event.target.value as PositionCode)}>
                      {positionOptions.map((option) => (
                        <NativeSelectOption key={option.value} value={option.value}>
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Status aktif</FieldLabel>
                  <FieldContent>
                    <div className="flex h-10 items-center gap-3 rounded-md border border-border/70 px-3">
                      <Switch checked={isActive} disabled={isCreate} onCheckedChange={setIsActive} />
                      <span className="text-sm">{isActive ? "Aktif" : "Nonaktif"}</span>
                    </div>
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Kode seat</FieldLabel>
                  <FieldContent>
                    <Input value={seatCode} disabled={!isCreate} onChange={(event) => setSeatCode(event.target.value)} placeholder="Misalnya KWB-3171" />
                  </FieldContent>
                </Field>
                <Field>
                  <FieldLabel>Nama jabatan</FieldLabel>
                  <FieldContent>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Misalnya Korwil Kota Jakarta Selatan" />
                  </FieldContent>
                </Field>
              </div>

              {isCreate ? (
                <>
                  {branch === "PUSAT" ? (
                    <SearchUnit
                      query={unitQuery}
                      setQuery={setUnitQuery}
                      results={unitResults}
                      selected={selectedUnit}
                      onSelect={(unit) => {
                        setSelectedUnit(unit);
                        setUnitQuery("");
                        setUnitResults([]);
                      }}
                      onClear={() => setSelectedUnit(null)}
                    />
                  ) : (
                    <RegionalAnchorSelector
                      branch={branch}
                      loading={regionalLoading}
                      anchors={regionalAnchors}
                      selectedAnchor={selectedAnchor}
                      onSelect={(anchor) => {
                        setSelectedUnit({
                          id: anchor.unitId,
                          code: anchor.code,
                          name: anchor.name,
                          type: anchor.type,
                          branch,
                        });
                        setSelectedProvinceId(anchor.primaryProvinceAreaId ?? anchor.coverageAreas[0]?.id ?? null);
                        setSelectedAreas(
                          roleCode === "REGIONAL_COMMANDER" || roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER"
                            ? anchor.coverageAreas
                            : [],
                        );
                      }}
                      onClear={() => {
                        setSelectedUnit(null);
                        setSelectedProvinceId(null);
                        setSelectedAreas([]);
                      }}
                    />
                  )}
                  {branch !== "PUSAT" && selectedAnchor ? (
                    <ProvinceCoverageSelector
                      roleCode={roleCode}
                      coverageAreas={selectedAnchor.coverageAreas}
                      selectedProvinceId={selectedProvinceId}
                      selectedAreas={selectedAreas}
                      onSelectProvince={(area) => {
                        setSelectedProvinceId(area.id);
                        if (roleCode === "FIELD_COORDINATOR" || roleCode === "FIELD_OFFICER") {
                          setSelectedRegencyCityId(null);
                          setSelectedAreas([]);
                        }
                      }}
                      onToggleProvinceScope={(area) => setSelectedAreas((current) => toggleArea(current, area))}
                    />
                  ) : null}
                  {roleCode === "FIELD_OFFICER" && regencyCityAreas.length ? (
                    <RegencyCitySelector
                      areas={regencyCityAreas}
                      selectedAreaId={selectedRegencyCityId}
                      onSelect={(area) => {
                        setSelectedRegencyCityId(area.id);
                        setSelectedAreas([]);
                      }}
                    />
                  ) : null}
                  <AreaScopeSelector
                    roleCode={roleCode}
                    selectedAreas={selectedAreas}
                    drilldownAreas={drilldownAreas}
                    drilldownLoading={drilldownLoading}
                    selectedProvince={selectedProvince}
                    selectedRegencyCity={regencyCityAreas.find((area) => area.id === selectedRegencyCityId) ?? null}
                    isPusat={branch === "PUSAT"}
                    onToggleArea={(area) => setSelectedAreas((current) => toggleArea(current, area))}
                    onRemoveArea={(areaId) => setSelectedAreas((current) => current.filter((area) => area.id !== areaId))}
                  />
                </>
              ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button asChild type="button" variant="outline">
            <Link href={position ? `/dashboard/admin-system/jabatan-reporting-line/${position.id}` : "/dashboard/admin-system/jabatan-reporting-line"}>
              Batal
            </Link>
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function RegionalAnchorSelector({
  branch,
  loading,
  anchors,
  selectedAnchor,
  onSelect,
  onClear,
}: {
  branch: BranchValue;
  loading: boolean;
  anchors: RegionalAnchorOption[];
  selectedAnchor: RegionalAnchorOption | null;
  onSelect: (anchor: RegionalAnchorOption) => void;
  onClear: () => void;
}) {
  const label = branch === "DIRECTORATE" ? "Pilih Direktorat wilayah" : "Pilih Binda";

  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <Label htmlFor="regional-anchor">{label}</Label>
      <NativeSelect
        id="regional-anchor"
        value={selectedAnchor?.unitId ?? ""}
        onChange={(event) => {
          const anchor = anchors.find((item) => item.unitId === event.target.value);
          if (anchor) onSelect(anchor);
        }}
      >
        <NativeSelectOption value="">
          {loading ? "Memuat master wilayah..." : branch === "DIRECTORATE" ? "Pilih dari daftar Direktorat" : "Pilih dari daftar Binda"}
        </NativeSelectOption>
        {anchors.map((anchor) => (
          <NativeSelectOption key={anchor.unitId} value={anchor.unitId}>
            {anchor.name} - {anchor.code}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {selectedAnchor ? (
        <SelectedBox
          title={selectedAnchor.name}
          subtitle={`${selectedAnchor.code} - ${selectedAnchor.coverageAreas.map((area) => area.name).join(", ")}`}
          onClear={onClear}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Penempatan diambil dari master Organisasi & Wilayah, bukan input bebas.
        </p>
      )}
    </div>
  );
}

function ProvinceCoverageSelector({
  roleCode,
  coverageAreas,
  selectedProvinceId,
  selectedAreas,
  onSelectProvince,
  onToggleProvinceScope,
}: {
  roleCode: RoleCode;
  coverageAreas: AreaSearchResult[];
  selectedProvinceId: string | null;
  selectedAreas: AreaSearchResult[];
  onSelectProvince: (area: AreaSearchResult) => void;
  onToggleProvinceScope: (area: AreaSearchResult) => void;
}) {
  const isProvinceScope = roleCode === "REGIONAL_COMMANDER" || roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER";

  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <div>
        <Label>{isProvinceScope ? "Provinsi tanggung jawab" : "Provinsi induk coverage"}</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          {isProvinceScope
            ? "Pilih provinsi dari coverage unit terpilih."
            : "Pilih provinsi induk untuk menurunkan daftar kabupaten/kota atau kecamatan."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {coverageAreas.map((area) => {
          const selected = isProvinceScope
            ? selectedAreas.some((item) => item.id === area.id)
            : selectedProvinceId === area.id;

          return (
            <Button
              key={area.id}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              onClick={() => (isProvinceScope ? onToggleProvinceScope(area) : onSelectProvince(area))}
            >
              {area.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function RegencyCitySelector({
  areas,
  selectedAreaId,
  onSelect,
}: {
  areas: AreaSearchResult[];
  selectedAreaId: string | null;
  onSelect: (area: AreaSearchResult) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <div>
        <Label>Kabupaten/Kota induk</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Pilih kabupaten/kota untuk menurunkan daftar kecamatan Field Officer.
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <AreaChoiceButton
            key={area.id}
            area={area}
            selected={selectedAreaId === area.id}
            onClick={() => onSelect(area)}
          />
        ))}
      </div>
    </div>
  );
}

function AreaScopeSelector({
  roleCode,
  selectedAreas,
  drilldownAreas,
  drilldownLoading,
  selectedProvince,
  selectedRegencyCity,
  isPusat,
  onToggleArea,
  onRemoveArea,
}: {
  roleCode: RoleCode;
  selectedAreas: AreaSearchResult[];
  drilldownAreas: AreaSearchResult[];
  drilldownLoading: boolean;
  selectedProvince: AreaSearchResult | null;
  selectedRegencyCity: AreaSearchResult | null;
  isPusat: boolean;
  onToggleArea: (area: AreaSearchResult) => void;
  onRemoveArea: (areaId: string) => void;
}) {
  const needsDrilldown = roleCode === "FIELD_COORDINATOR" || roleCode === "FIELD_OFFICER";
  const fieldOfficerNeedsRegency = roleCode === "FIELD_OFFICER" && !selectedRegencyCity;

  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <div>
        <Label>Wilayah tanggung jawab</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Level jabatan ini: {requiredAreaLevelLabel(roleCode)}
          {roleCode === "FIELD_OFFICER" && selectedRegencyCity
            ? ` dari ${selectedRegencyCity.name}`
            : selectedProvince
              ? ` dari ${selectedProvince.name}`
              : ""}
          .
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedAreas.length ? (
          selectedAreas.map((area, index) => areaChip(area, index === 0, () => onRemoveArea(area.id)))
        ) : (
          <p className="text-sm text-muted-foreground">
            {isPusat
              ? "Scope pusat akan memakai negara Indonesia."
              : fieldOfficerNeedsRegency
                ? "Pilih kabupaten/kota induk dulu agar kecamatan terfilter dari wilayah tersebut."
                : "Pilih wilayah dari daftar yang tersedia."}
          </p>
        )}
      </div>
      {needsDrilldown ? (
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {roleCode === "FIELD_COORDINATOR" ? "Kabupaten/Kota tersedia" : "Kecamatan tersedia"}
          </div>
          {drilldownLoading ? <p className="text-sm text-muted-foreground">Memuat wilayah...</p> : null}
          {!drilldownLoading && drilldownAreas.length ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {drilldownAreas.map((area) => (
                <AreaChoiceButton
                  key={area.id}
                  area={area}
                  selected={selectedAreas.some((item) => item.id === area.id)}
                  onClick={() => onToggleArea(area)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AreaChoiceButton({
  area,
  selected,
  onClick,
}: {
  area: AreaSearchResult;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-left text-sm transition ${
        selected ? "border-primary bg-primary/10 text-primary" : "border-border/70 hover:bg-muted/40"
      }`}
    >
      <span className="block font-medium">{area.name}</span>
      <span className="text-xs text-muted-foreground">{area.code} - {area.level}</span>
    </button>
  );
}

function ResultList({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-lg border border-border/70">{children}</div>;
}

function SearchUnit({
  query,
  setQuery,
  results,
  selected,
  onSelect,
  onClear,
}: {
  query: string;
  setQuery: (value: string) => void;
  results: OrganizationUnitSummary[];
  selected: OrganizationUnitSummary | null;
  onSelect: (unit: OrganizationUnitSummary) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <Label htmlFor="unit-query">Penempatan</Label>
      <Input id="unit-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari Deputi, Binda, Direktorat, Bagops, atau unit koordinasi" />
      {selected ? (
        <SelectedBox title={selected.name} subtitle={`${selected.code} - ${selected.type}`} onClear={onClear} />
      ) : null}
      {results.length ? (
        <ResultList>
          {results.map((unit) => (
            <button key={unit.id} type="button" onClick={() => onSelect(unit)} className="flex w-full items-start justify-between gap-3 border-b border-border/60 px-3 py-2 text-left text-sm transition hover:bg-muted/40 last:border-b-0">
              <span>
                <span className="block font-medium">{unit.name}</span>
                <span className="text-xs text-muted-foreground">{unit.code} - {unit.type}</span>
              </span>
              <Search className="mt-0.5 size-4 text-muted-foreground" />
            </button>
          ))}
        </ResultList>
      ) : null}
    </div>
  );
}

function SelectedBox({ title, subtitle, onClear }: { title: string; subtitle: string; onClear: () => void }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
      <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={onClear}>
        Ganti
      </Button>
    </div>
  );
}
