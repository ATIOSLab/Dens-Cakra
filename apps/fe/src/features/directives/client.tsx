"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserMutation } from "@/lib/api/browser-client";

import { ProvinceMapSelector } from "./province-map-selector";
import { deriveDirectiveRecipients, deriveRegionalRecipientPreview } from "./province-routing";
import { directiveEditSchema, directiveWizardSchema } from "./schemas";
import {
  buildDirectiveUukSummary,
  buildStructuredDirectiveUukSections,
  countFilledStructuredSections,
  parseDirectiveCommandDescription,
  type StructuredDirectiveUukSection,
  serializeDirectiveCommandDescription,
} from "./structured-uuk";
import type {
  AccessContextResource,
  DirectiveDetail,
  DirectiveSummary,
  DirectiveTracking,
  OrganizationUnitOption,
  PositionOption,
  ProvinceBoundaryCollection,
  ProvinceOption,
  RegionalAssignmentOption,
} from "./types";

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function badgeVariant(status: string) {
  if (["CANCELLED", "FAILED"].includes(status)) {
    return "destructive";
  }

  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(status)) {
    return "default";
  }

  return "outline";
}

function getCurrentVersion(directive: DirectiveDetail | DirectiveSummary) {
  return (
    directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber) ?? directive.versions[0]
  );
}

function normalizeProvinceSelection(selectedProvinceIds: string[], provinces: ProvinceOption[]) {
  const provinceIdByKey = new Map<string, string>();

  for (const province of provinces) {
    provinceIdByKey.set(province.id, province.id);
    provinceIdByKey.set(province.code, province.id);
  }

  return Array.from(
    new Set(
      selectedProvinceIds.flatMap((value) => {
        const normalizedId = provinceIdByKey.get(value);
        return normalizedId ? [normalizedId] : [];
      }),
    ),
  );
}

function renderRecipientLabel(recipient: {
  targetPosition?: PositionOption | null;
  targetUnit?: OrganizationUnitOption | null;
}) {
  return recipient.targetPosition?.title ?? recipient.targetUnit?.name ?? "Target tidak diketahui";
}

type DirectiveListClientProps = {
  directives: DirectiveSummary[];
};

export function DirectiveListClient({ directives }: DirectiveListClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">STR / Direktif Strategis</h1>
          <p className="text-muted-foreground text-sm">
            STR dibuat di level Eksekutif dan sudah memuat UUK/KIQ/PIR sebagai titik awal alur komando.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/executive/pusat-komando/direktif/baru">Buat STR Baru</Link>
        </Button>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Daftar STR Aktif</CardTitle>
          <CardDescription>
            Gunakan tabel ini untuk review draft, publish, distribusi, dan tracking tindak lanjut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor STR</TableHead>
                <TableHead>Judul UUK/STR</TableHead>
                <TableHead>Klasifikasi</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directives.length ? (
                directives.map((directive) => {
                  const currentVersion = getCurrentVersion(directive);
                  const parsed = parseDirectiveCommandDescription(currentVersion?.commandDescription);
                  const title = parsed.uukTitle || directive.commandNumber;
                  const areaSummary =
                    currentVersion?.targetAreas
                      .slice(0, 2)
                      .map((item) => item.area.name)
                      .join(", ") ?? "-";

                  return (
                    <TableRow key={directive.id}>
                      <TableCell className="font-medium">{directive.commandNumber}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{title}</div>
                          <div className="text-muted-foreground text-xs">
                            {buildDirectiveUukSummary(parsed.uukSections) || "Belum ada ringkasan UUK."}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{currentVersion?.classification ?? "-"}</TableCell>
                      <TableCell>{areaSummary}</TableCell>
                      <TableCell>{currentVersion?.recipients.length ?? 0} penerima</TableCell>
                      <TableCell>{formatDate(currentVersion?.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(directive.status)}>{directive.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}`}>Detail</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>Edit</Link>
                          </Button>
                          <Button asChild size="sm">
                            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/tracking`}>
                              Tracking
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Belum ada STR yang dibuat pada unit eksekutif ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type DirectiveFormClientProps = {
  mode: "create" | "edit";
  access: AccessContextResource;
  provinceOptions: ProvinceOption[];
  provinceBoundaries: ProvinceBoundaryCollection;
  regionalAssignments: RegionalAssignmentOption[];
  directive?: DirectiveDetail;
};

export function DirectiveFormClient({
  mode,
  access,
  provinceOptions,
  provinceBoundaries,
  regionalAssignments,
  directive,
}: DirectiveFormClientProps) {
  const router = useRouter();
  const currentVersion = directive ? getCurrentVersion(directive) : undefined;
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [commandNumber, setCommandNumber] = useState(directive?.commandNumber ?? "");
  const [classification, setClassification] = useState(currentVersion?.classification ?? "RAHASIA");
  const [commandSource, setCommandSource] = useState(currentVersion?.commandSource ?? "");
  const [commandIssuer, setCommandIssuer] = useState(currentVersion?.commandIssuer ?? "");
  const [commandDate, setCommandDate] = useState(
    currentVersion?.commandDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState(currentVersion?.dueDate?.slice(0, 10) ?? "");
  const [strategicIssue, setStrategicIssue] = useState(currentVersion?.strategicIssue ?? "");
  const [commandNarrative, setCommandNarrative] = useState(parsedDescription.commandNarrative);
  const [uukTitle, setUukTitle] = useState(parsedDescription.uukTitle);
  const [uukSections, setUukSections] = useState<StructuredDirectiveUukSection[]>(
    parsedDescription.uukSections.length ? parsedDescription.uukSections : buildStructuredDirectiveUukSections(),
  );
  const selectableProvinceIds = new Set(provinceOptions.map((item) => item.id));
  const [targetAreaIds, setTargetAreaIds] = useState<string[]>(
    normalizeProvinceSelection(
      currentVersion?.targetAreas.map((item) => item.areaId) ??
        access.authorizationContext.areaScopes.map((item) => item.areaId),
      provinceOptions,
    ).filter((areaId) => selectableProvinceIds.has(areaId)),
  );
  const recipientPreview = deriveRegionalRecipientPreview(
    targetAreaIds,
    provinceOptions,
    regionalAssignments,
  );
  const normalizedRecipients = deriveDirectiveRecipients(recipientPreview);
  const uncoveredProvinceNames = recipientPreview
    .filter((item) => item.recipients.length === 0)
    .map((item) => item.provinceName);
  let submitLabel = "Perbarui Draft STR";

  if (isSaving) {
    submitLabel = "Menyimpan...";
  } else if (mode === "create") {
    submitLabel = "Simpan Draft STR";
  }

  function updateUukSection(sectionType: string, content: string) {
    setUukSections((current) =>
      current.map((section) => (section.sectionType === sectionType ? { ...section, content } : section)),
    );
  }

  async function handleSubmit() {
    setIsSaving(true);

    try {
      if (!targetAreaIds.length) {
        throw new Error("Pilih minimal satu provinsi sasaran pada peta STR.");
      }

      if (!normalizedRecipients.length) {
        throw new Error("Belum ada Regional Commander yang terhubung dengan provinsi sasaran.");
      }

      if (uncoveredProvinceNames.length) {
        throw new Error(
          `Provinsi berikut belum memiliki penerima regional: ${uncoveredProvinceNames.join(", ")}.`,
        );
      }

      const serializedCommandDescription = serializeDirectiveCommandDescription({
        commandNarrative,
        uukTitle,
        uukSections,
      });
      const normalizedTargetAreaIds = normalizeProvinceSelection(targetAreaIds, provinceOptions);

      if (mode === "create") {
        const parsed = directiveWizardSchema.parse({
          ownerUnitId: access.authorizationContext.organizationUnitId,
          commandNumber,
          classification,
          commandSource,
          commandIssuer,
          commandDate,
          dueDate: dueDate || undefined,
          strategicIssue,
          commandDescription: serializedCommandDescription,
          uukTitle,
          uukSections,
          targetAreaIds: normalizedTargetAreaIds,
          recipients: normalizedRecipients,
        });

        const created = await apiBrowserMutation<DirectiveDetail>("POST", "/directives", {
          ownerUnitId: parsed.ownerUnitId,
          version: {
            commandNumber: parsed.commandNumber,
            classification: parsed.classification,
            commandSource: parsed.commandSource,
            commandIssuer: parsed.commandIssuer,
            commandDate: parsed.commandDate,
            dueDate: parsed.dueDate || undefined,
            strategicIssue: parsed.strategicIssue || undefined,
            commandDescription: parsed.commandDescription,
            targetAreaIds: parsed.targetAreaIds,
            recipients: parsed.recipients.map((recipient) => ({
              ...(recipient.targetUnitId ? { targetUnitId: recipient.targetUnitId } : {}),
              ...(recipient.targetPositionId ? { targetPositionId: recipient.targetPositionId } : {}),
            })),
          },
        });

        toast.success("STR strategis berhasil dibuat.");
        router.push(`/dashboard/executive/pusat-komando/direktif/${created.id}`);
        router.refresh();
        return;
      }

      if (!directive || !currentVersion) {
        throw new Error("Draft STR tidak ditemukan.");
      }

      const parsed = directiveEditSchema.parse({
        dueDate: dueDate || undefined,
        strategicIssue,
        commandDescription: serializedCommandDescription,
        uukTitle,
        uukSections,
        targetAreaIds: normalizedTargetAreaIds,
        recipients: normalizedRecipients,
      });

      await apiBrowserMutation("PATCH", `/directive-versions/${currentVersion.id}`, {
        dueDate: parsed.dueDate || undefined,
        strategicIssue: parsed.strategicIssue || undefined,
        commandDescription: parsed.commandDescription,
      });

      await apiBrowserMutation("PUT", `/directive-versions/${currentVersion.id}/target-areas`, {
        areaIds: parsed.targetAreaIds,
        primaryAreaId: parsed.targetAreaIds[0],
      });

      await apiBrowserMutation("PUT", `/directive-versions/${currentVersion.id}/recipients`, {
        recipients: parsed.recipients.map((recipient) => ({
          ...(recipient.targetUnitId ? { targetUnitId: recipient.targetUnitId } : {}),
          ...(recipient.targetPositionId ? { targetPositionId: recipient.targetPositionId } : {}),
        })),
      });

      toast.success("Draft STR diperbarui.");
      router.push(`/dashboard/executive/pusat-komando/direktif/${directive.id}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menyimpan STR.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* <div>
        <h1 className="font-semibold text-2xl tracking-tight">
          {mode === "create" ? "Form STR Eksekutif" : "Edit Draft STR"}
        </h1>
        <p className="text-muted-foreground text-sm">
          STR dibuat oleh Eksekutif dan sudah memuat UUK/KIQ/PIR sebelum diturunkan ke Regional Commander.
        </p>
      </div> */}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              {/* <CardTitle>Panel Kiri - Metadata STR</CardTitle>
              <CardDescription>{access.authorizationContext.organizationUnitName}</CardDescription> */}
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-sm">
                <span>Nomor STR</span>
                <Input
                  value={commandNumber}
                  onChange={(event) => setCommandNumber(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Klasifikasi</span>
                <Select value={classification} onValueChange={setClassification} disabled={mode === "edit"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih klasifikasi" />
                  </SelectTrigger>
                  <SelectContent>
                    {["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"].map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 text-sm">
                <span>Sumber Perintah</span>
                <Input
                  value={commandSource}
                  onChange={(event) => setCommandSource(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Pemberi Perintah</span>
                <Input
                  value={commandIssuer}
                  onChange={(event) => setCommandIssuer(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Tanggal Perintah</span>
                <Input
                  type="date"
                  value={commandDate}
                  onChange={(event) => setCommandDate(event.target.value)}
                  disabled={mode === "edit"}
                />
              </div>
              <div className="space-y-2 text-sm">
                <span>Batas Waktu</span>
                <Input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </div>
              <div className="space-y-2 text-sm md:col-span-2">
                <span>Isu Strategis</span>
                <Textarea value={strategicIssue} onChange={(event) => setStrategicIssue(event.target.value)} />
              </div>
              <div className="space-y-2 text-sm md:col-span-2">
                <span>Uraian Perintah</span>
                <Textarea
                  value={commandNarrative}
                  onChange={(event) => setCommandNarrative(event.target.value)}
                  className="min-h-32"
                />
              </div>
            </CardContent>
          </Card>

          <ProvinceMapSelector
            provinces={provinceOptions}
            boundaries={provinceBoundaries}
            selectedProvinceIds={targetAreaIds}
            preview={recipientPreview}
            onChange={(nextProvinceIds) => setTargetAreaIds(normalizeProvinceSelection(nextProvinceIds, provinceOptions))}
          />

          <Card>
            <CardHeader>
              <CardTitle>Preview Distribusi Regional</CardTitle>
              <CardDescription>
                Penerima STR diturunkan otomatis dari provinsi sasaran ke jabatan regional yang memiliki coverage area
                aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uncoveredProvinceNames.length ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                  {uncoveredProvinceNames.join(", ")} belum memiliki Regional Commander yang terhubung.
                </div>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provinsi Sasaran</TableHead>
                    <TableHead>Regional Commander</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Assignment Aktif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipientPreview.length ? (
                    recipientPreview.flatMap((item) =>
                      item.recipients.length
                        ? item.recipients.map((recipient) => (
                            <TableRow key={`${item.provinceId}-${recipient.id}`}>
                              <TableCell className="font-medium">
                                {item.provinceName}
                                <div className="text-muted-foreground text-xs">{item.provinceCode}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{recipient.positionTitle}</div>
                                <div className="text-muted-foreground text-xs">{recipient.positionCode}</div>
                              </TableCell>
                              <TableCell>{recipient.organizationUnitName}</TableCell>
                              <TableCell>{recipient.assigneeName || recipient.assigneeUsername || "-"}</TableCell>
                            </TableRow>
                          ))
                        : [
                            <TableRow key={`${item.provinceId}-missing`}>
                              <TableCell className="font-medium">
                                {item.provinceName}
                                <div className="text-muted-foreground text-xs">{item.provinceCode}</div>
                              </TableCell>
                              <TableCell colSpan={3} className="text-amber-700 dark:text-amber-200">
                                Belum ada recipient regional yang menutupi provinsi ini.
                              </TableCell>
                            </TableRow>,
                          ],
                    )
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Pilih provinsi pada peta untuk melihat jalur distribusi STR ke regional commander.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            {/* <CardTitle>Panel Kanan - UUK / KIQ / PIR dalam STR</CardTitle>
            <CardDescription>
              Bagian ini menjadi isi STR yang nantinya dibaca Regional Commander sebagai dasar penjabaran regional.
            </CardDescription> */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <span>Judul UUK/STR</span>
              <Input value={uukTitle} onChange={(event) => setUukTitle(event.target.value)} />
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">Progress Isi UUK</div>
                <Badge variant="outline">
                  {countFilledStructuredSections(uukSections)} / {uukSections.length} bagian terisi
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm">
                Isi minimal satu bagian UUK/KIQ/PIR agar STR dapat menjadi starting object yang jelas untuk regional.
              </div>
            </div>

            <div className="grid gap-4">
              {uukSections.map((section) => (
                <div key={section.sectionType} className="space-y-2 rounded-xl border border-border/70 p-4">
                  <div className="font-medium">
                    {section.orderNumber}. {section.title}
                  </div>
                  <Textarea
                    value={section.content}
                    onChange={(event) => updateUukSection(section.sectionType, event.target.value)}
                    className="min-h-28"
                  />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="justify-between">
            <div className="text-muted-foreground text-xs">
              Publish dan distribusi tetap dijalankan terpisah setelah draft STR selesai direview.
            </div>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {submitLabel}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

type DirectiveDetailClientProps = {
  directive: DirectiveDetail;
};

export function DirectiveDetailClient({ directive }: DirectiveDetailClientProps) {
  const router = useRouter();
  const currentVersion = getCurrentVersion(directive);
  const [isSubmitting, setIsSubmitting] = useState<"publish" | "distribute" | "cancel" | null>(null);
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);

  async function triggerAction(action: "publish" | "distribute" | "cancel") {
    if (!currentVersion) {
      return;
    }

    setIsSubmitting(action);

    try {
      if (action === "publish") {
        await apiBrowserMutation("POST", `/directive-versions/${currentVersion.id}/publish`, {
          confirmation: "PUBLISH",
        });
        toast.success("STR dipublish.");
      }

      if (action === "distribute") {
        await apiBrowserMutation("POST", `/directive-versions/${currentVersion.id}/distribute`, {
          sendNotifications: true,
        });
        toast.success("STR didistribusikan.");
      }

      if (action === "cancel") {
        await apiBrowserMutation("POST", `/directives/${directive.id}/cancel`, {
          reason: "Pembatalan dari pusat komando eksekutif.",
        });
        toast.success("STR dibatalkan.");
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aksi STR gagal diproses.";
      toast.error(message);
    } finally {
      setIsSubmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{directive.commandNumber}</h1>
            <Badge variant={badgeVariant(directive.status)}>{directive.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {directive.ownerUnit?.name ?? "-"} - versi aktif {directive.currentVersionNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>Edit Draft</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/tracking`}>Tracking</Link>
          </Button>
          <Button onClick={() => triggerAction("publish")} disabled={isSubmitting !== null}>
            {isSubmitting === "publish" ? "Memproses..." : "Publish"}
          </Button>
          <Button onClick={() => triggerAction("distribute")} disabled={isSubmitting !== null} variant="secondary">
            {isSubmitting === "distribute" ? "Memproses..." : "Distribusikan"}
          </Button>
          <Button onClick={() => triggerAction("cancel")} disabled={isSubmitting !== null} variant="destructive">
            {isSubmitting === "cancel" ? "Memproses..." : "Batalkan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Metadata STR</CardTitle>
            <CardDescription>
              {currentVersion?.classification ?? "-"} - {currentVersion?.commandSource ?? "-"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Pemberi Perintah</div>
                <div className="mt-1 font-medium">{currentVersion?.commandIssuer ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Tanggal Perintah</div>
                <div className="mt-1 font-medium">{formatDate(currentVersion?.commandDate)}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
                <div className="mt-1 font-medium">{formatDate(currentVersion?.dueDate)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Isu Strategis</div>
              <p className="rounded-xl border border-border/70 p-4 text-sm leading-6">
                {currentVersion?.strategicIssue ?? "Belum diisi."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Uraian Perintah</div>
              <p className="rounded-xl border border-border/70 p-4 text-sm leading-6">
                {parsedDescription.commandNarrative || "-"}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 p-4">
              <div className="font-medium">Penerima STR</div>
              {currentVersion?.recipients.length ? (
                currentVersion.recipients.map((recipient) => (
                  <div key={recipient.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{renderRecipientLabel(recipient)}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant={badgeVariant(recipient.status)}>{recipient.status}</Badge>
                      <span>{recipient.targetPosition ? "Jabatan" : "Unit"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Belum ada penerima.</div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 p-4">
              <div className="font-medium">Wilayah Sasaran</div>
              <div className="flex flex-wrap gap-2">
                {currentVersion?.targetAreas.map((item) => (
                  <Badge key={item.areaId} variant="outline">
                    {item.area.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{parsedDescription.uukTitle || "UUK / KIQ / PIR STR"}</CardTitle>
            <CardDescription>Bagian UUK yang sudah melekat di STR sejak dibuat oleh Eksekutif.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {parsedDescription.uukSections.map((section) => (
              <div key={section.sectionType} className="rounded-xl border border-border/70 p-4">
                <div className="font-medium">
                  {section.orderNumber}. {section.title}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{section.content.trim() || "Belum diisi."}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artefak Turunan</CardTitle>
          <CardDescription>Penjabaran regional dan task operasional yang sudah bercabang dari STR ini.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-4">
            <div className="mb-3 font-medium text-sm">Penjabaran Regional</div>
            <div className="space-y-3">
              {currentVersion?.uukStrs?.length ? (
                currentVersion.uukStrs.map((uuk) => (
                  <div key={uuk.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{uuk.versions?.[0]?.title ?? "Penjabaran Regional"}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant={badgeVariant(uuk.status)}>{uuk.status}</Badge>
                      <span>{uuk.ownerUnit?.name ?? "-"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Belum ada penjabaran regional.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-4">
            <div className="mb-3 font-medium text-sm">Tasks</div>
            <div className="space-y-3">
              {currentVersion?.tasks?.length ? (
                currentVersion.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
                      <span>{task.ownerUnit?.name ?? "-"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Belum ada task turunan.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type DirectiveTrackingClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

export function DirectiveTrackingClient({ directive, tracking }: DirectiveTrackingClientProps) {
  const currentVersion = getCurrentVersion(directive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Tracking Direktif</h1>
        <p className="text-muted-foreground text-sm">
          {directive.commandNumber} - versi {currentVersion?.versionNumber ?? directive.currentVersionNumber}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(tracking.recipientSummary).map(([key, value]) => (
          <Card key={key} className="border border-border/70">
            <CardContent className="pt-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">{key}</div>
              <div className="mt-2 font-semibold text-3xl">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Object.entries(tracking.taskSummary).map(([key, value]) => (
          <Card key={key} className="border border-border/70">
            <CardContent className="pt-4">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">{key}</div>
              <div className="mt-2 font-semibold text-3xl">{value}</div>
            </CardContent>
          </Card>
        ))}
        <Card className="border border-border/70">
          <CardContent className="pt-4">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">baketCount</div>
            <div className="mt-2 font-semibold text-3xl">{tracking.baketCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task yang Terlihat di Jalur Komando</CardTitle>
          <CardDescription>Hanya task yang masih berada dalam scope komando caller yang ditampilkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {tracking.tasks?.length ? (
            tracking.tasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-border/70 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-muted-foreground text-sm">{task.ownerUnit?.name ?? "-"}</div>
                  </div>
                  <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground text-sm">Belum ada task di scope tracking ini.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
