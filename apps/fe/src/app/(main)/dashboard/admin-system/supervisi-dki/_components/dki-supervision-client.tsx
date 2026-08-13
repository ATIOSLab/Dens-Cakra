"use client";

import { useMemo, useState } from "react";

import { CheckCircle2, Loader2, MapPinned, RefreshCw, Save, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

type DkiCity = {
  id: string;
  code?: string | null;
  officialCode?: string | null;
  name: string;
  level: string;
};

type DkiAssignment = {
  id: string;
  userProfileId: string;
  user: {
    id: string;
    username?: string | null;
    fullName?: string | null;
    status?: string | null;
    authUser?: {
      role?: string | null;
      email?: string | null;
      banned?: boolean | null;
    } | null;
  };
  role: {
    code: string;
    name: string;
  };
  branch: string;
  validFrom: string;
  areas: Array<DkiCity & { isPrimary?: boolean; isDkiJakarta?: boolean }>;
  dkiAreaIds: string[];
};

export type DkiSupervisionResource = {
  policyId?: string;
  storageModel?: string;
  supervisionMode: string;
  supervisionLabel: string;
  scopeDescription: string;
  rules?: {
    allowsMultipleRegencyCitiesPerDirectorate: boolean;
    forbidsHardcodedDirectorateCityAssignment: boolean;
    commandLineUnchanged: boolean;
  };
  cities: DkiCity[];
  assignments: DkiAssignment[];
  summary: {
    totalCities: number;
    assignedCities: number;
    unassignedCities: number;
    directorateUsers: number;
  };
};

type DkiSupervisionClientProps = {
  initialData: DkiSupervisionResource;
};

function displayUserName(assignment: DkiAssignment) {
  return assignment.user.fullName?.trim() || assignment.user.username?.trim() || assignment.user.authUser?.email || "-";
}

function roleLabel(roleCode: string) {
  if (roleCode === "REGIONAL_COMMANDER") return "Direktur Direktorat/Ditwil";
  if (roleCode === "OPERATIONAL_INTELLIGENCE_MANAGER") return "Anev Direktorat";
  return roleCode;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DkiSupervisionClient({ initialData }: DkiSupervisionClientProps) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftAreaIds, setDraftAreaIds] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(initialData.assignments.map((assignment) => [assignment.id, assignment.dkiAreaIds])),
  );

  const cityOwners = useMemo(() => {
    const owners = new Map<string, DkiAssignment[]>();
    for (const assignment of data.assignments) {
      for (const areaId of assignment.dkiAreaIds) {
        const list = owners.get(areaId) ?? [];
        list.push(assignment);
        owners.set(areaId, list);
      }
    }
    return owners;
  }, [data.assignments]);

  const filteredAssignments = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("id-ID");
    if (!keyword) return data.assignments;
    return data.assignments.filter((assignment) => {
      const haystack = [
        displayUserName(assignment),
        assignment.user.username,
        assignment.user.authUser?.email,
        assignment.role.name,
        assignment.role.code,
        ...assignment.areas.map((area) => area.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("id-ID");
      return haystack.includes(keyword);
    });
  }, [data.assignments, query]);

  async function refreshData() {
    setLoading(true);
    try {
      const next = await apiBrowserFetch<DkiSupervisionResource>("/user-profiles/dki-supervision");
      setData(next);
      setDraftAreaIds(Object.fromEntries(next.assignments.map((assignment) => [assignment.id, assignment.dkiAreaIds])));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat pemetaan supervisi DKI.");
    } finally {
      setLoading(false);
    }
  }

  function toggleCity(assignmentId: string, cityId: string) {
    setDraftAreaIds((current) => {
      const selected = new Set(current[assignmentId] ?? []);
      if (selected.has(cityId)) selected.delete(cityId);
      else selected.add(cityId);
      return { ...current, [assignmentId]: [...selected] };
    });
  }

  async function saveAssignment(assignment: DkiAssignment) {
    const selected = draftAreaIds[assignment.id] ?? [];
    if (selected.length === 0) {
      toast.error("Pilih minimal satu Kota/Kabupaten DKI untuk cakupan supervisi.");
      return;
    }

    setSavingId(assignment.id);
    try {
      await apiBrowserMutation("POST", `/user-profiles/${assignment.userProfileId}/dki-supervision-scope`, {
        areaScopeIds: selected,
        reason: `Pemutakhiran cakupan supervisi DKI untuk ${displayUserName(assignment)}.`,
      });
      toast.success("Cakupan supervisi DKI berhasil diperbarui.");
      await refreshData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan cakupan supervisi DKI.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-5">
      <section className="flex flex-col gap-4 border-b border-border/50 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Badge variant="outline" className="w-fit gap-1.5">
            <ShieldCheck className="size-3.5" />
            Admin Sistem
          </Badge>
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">Wilayah Supervisi DKI</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
              Atur cakupan supervisi Direktorat/Ditwil untuk Kota/Kabupaten administratif di Provinsi DKI Jakarta.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[260px]">
            <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari pengguna, role, atau wilayah"
              className="h-9 rounded-[6px] pl-9 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshData()}
            disabled={loading}
            className="h-9 gap-2"
          >
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            Muat ulang
          </Button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          ["Kota/Kabupaten DKI", data.summary.totalCities],
          ["Wilayah Terisi", data.summary.assignedCities],
          ["Belum Dipetakan", data.summary.unassignedCities],
          ["Pengguna Direktorat/Ditwil", data.summary.directorateUsers],
        ].map(([label, value]) => (
          <Card key={label} className="rounded-[8px]">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Alert className="rounded-[8px] border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
        <MapPinned className="size-4" />
        <AlertTitle>{data.supervisionLabel}</AlertTitle>
        <AlertDescription>
          {data.scopeDescription}
          {data.rules?.allowsMultipleRegencyCitiesPerDirectorate ? (
            <span className="mt-1 block">
              Satu pengguna Direktorat/Ditwil dapat memiliki satu atau lebih Kota/Kabupaten DKI sesuai penetapan Admin.
            </span>
          ) : null}
        </AlertDescription>
      </Alert>

      <Card className="overflow-hidden rounded-[8px]">
        <CardHeader className="border-b border-border/60 px-4 py-3">
          <CardTitle className="text-base">Pemetaan Direktorat/Ditwil ke Kota/Kabupaten DKI</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-border/60 bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="w-[270px] px-4 py-3 font-semibold">Pengguna</th>
                  <th className="w-[170px] px-4 py-3 font-semibold">Fungsi</th>
                  <th className="px-4 py-3 font-semibold">Cakupan Kota/Kabupaten</th>
                  <th className="w-[140px] px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredAssignments.map((assignment) => {
                  const selected = draftAreaIds[assignment.id] ?? [];
                  const dirty = selected.slice().sort().join("|") !== assignment.dkiAreaIds.slice().sort().join("|");
                  const saving = savingId === assignment.id;

                  return (
                    <tr key={assignment.id} className="align-top hover:bg-muted/20">
                      <td className="px-4 py-4">
                        <div className="font-semibold text-foreground">{displayUserName(assignment)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {assignment.user.authUser?.email ?? "-"}
                        </div>
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Berlaku sejak {formatDateTime(assignment.validFrom)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="secondary" className="rounded-[6px]">
                          {roleLabel(assignment.role.code)}
                        </Badge>
                        <div className="mt-2 text-xs text-muted-foreground">Direktorat/Ditwil</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {data.cities.map((city) => {
                            const owners = cityOwners.get(city.id) ?? [];
                            const sharedWithOther = owners.some((owner) => owner.id !== assignment.id);
                            const ownerLabel = owners
                              .filter((owner) => owner.id !== assignment.id)
                              .map(displayUserName)
                              .join(", ");
                            const checked = selected.includes(city.id);
                            const checkboxId = `dki-city-${assignment.id}-${city.id}`;

                            return (
                              <label
                                key={city.id}
                                htmlFor={checkboxId}
                                className={cn(
                                  "flex min-h-12 cursor-pointer items-start gap-2 rounded-[6px] border border-border bg-background p-2 text-xs transition-colors hover:bg-muted/40",
                                  checked &&
                                    "border-sky-400 bg-sky-50 text-sky-950 dark:bg-sky-950/30 dark:text-sky-100",
                                  sharedWithOther &&
                                    !checked &&
                                    "border-sky-200 bg-sky-50/60 dark:border-sky-900/50 dark:bg-sky-950/20",
                                )}
                              >
                                <Checkbox
                                  id={checkboxId}
                                  checked={checked}
                                  onCheckedChange={() => toggleCity(assignment.id, city.id)}
                                  className="mt-0.5 rounded-[4px]"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block font-medium">{city.name}</span>
                                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                                    {city.officialCode ?? city.code ?? "-"}
                                  </span>
                                  {sharedWithOther ? (
                                    <span className="mt-1 flex items-center gap-1 text-[11px] text-sky-700 dark:text-sky-300">
                                      <Users className="size-3" />
                                      Juga pada {ownerLabel}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => void saveAssignment(assignment)}
                          disabled={!dirty || saving}
                          className="h-9 gap-2 rounded-[6px]"
                        >
                          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                          Simpan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      Tidak ada pengguna Direktorat/Ditwil yang sesuai filter.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[8px]">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Kontrol Konsistensi</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kota/Kabupaten yang sama tidak boleh aktif pada dua pengguna Direktorat/Ditwil sekaligus.
              </p>
            </div>
            <Separator className="md:hidden" />
            <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
              Validasi disimpan di API dan audit log.
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
