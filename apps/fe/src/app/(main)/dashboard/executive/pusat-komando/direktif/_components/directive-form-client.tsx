"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { Cpu } from "lucide-react";
import { toast } from "sonner";
import { ZodError } from "zod";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { directiveEditSchema, directiveWizardSchema } from "@/features/directives/schemas";
import {
  buildStructuredDirectiveUukSections,
  countFilledStructuredSections,
  parseDirectiveCommandDescription,
  type StructuredDirectiveUukSection,
  serializeDirectiveCommandDescription,
} from "@/features/directives/structured-uuk";
import type {
  AccessContextResource,
  DirectiveDetail,
  DirectiveRecipientInput,
  ProvinceBoundaryCollection,
  ProvinceOption,
  RegionalAssignmentOption,
  RegionalMasterDirectorate,
  RegionalMasterOverview,
} from "@/features/directives/types";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { ApiClientError } from "@/lib/api/errors";
import { classificationBadgeClass } from "@/lib/classification";

import { deriveDirectiveRecipients, deriveRegionalRecipientPreview } from "./directive-distribution";
import { getCurrentVersion, normalizeProvinceSelection } from "./directive-shared";
import { ProvinceMapSelector } from "./province-map-selector";

type DirectiveTargetMode = "all" | "binda" | "directorate";

type DirectiveRecipientPreviewRow = {
  key: string;
  scopeLabel: string;
  scopeCode: string;
  targetLabel: string | null;
  targetSubLabel: string | null;
  targetKind: string;
  coverageNames: string[];
  targetUnitId?: string;
  targetPositionId?: string;
  missing?: boolean;
};

type DirectiveAiScope = "full" | "eei" | "collection" | "recommendation" | "polish";

type DirectiveAiResponse = {
  title?: string;
  commandNarrative?: string;
  sections: Record<string, string>;
};

const CLASSIFICATION_OPTIONS = ["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"] as const;

function formatClassificationLabel(value: string) {
  return value.replaceAll("_", " ");
}

function uniqBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = getKey(item);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function inferTargetMode(directive?: DirectiveDetail): DirectiveTargetMode {
  const currentVersion = directive ? getCurrentVersion(directive) : null;
  const recipients = currentVersion?.recipients ?? [];

  if (!recipients.length) {
    return "all";
  }

  const unitTypes = uniqBy(
    recipients.flatMap((recipient) => (recipient.targetUnit?.type ? [recipient.targetUnit.type] : [])),
    (type) => type,
  );

  if (recipients.every((recipient) => recipient.targetPositionId) || unitTypes.length === 0) {
    return "all";
  }

  if (unitTypes.length === 1 && unitTypes[0] === "BINDA") {
    return "binda";
  }

  if (unitTypes.length === 1 && unitTypes[0] === "DIRECTORATE") {
    return "directorate";
  }

  return "all";
}

function getDirectorateCoverageIds(directorate: RegionalMasterDirectorate) {
  return uniqBy(
    directorate.coverageAreas.map((coverage) => coverage.areaId),
    (areaId) => areaId,
  );
}

function buildAllModePreviewRows(
  targetAreaIds: string[],
  provinceOptions: ProvinceOption[],
  regionalAssignments: RegionalAssignmentOption[],
) {
  const preview = deriveRegionalRecipientPreview(targetAreaIds, provinceOptions, regionalAssignments);

  return preview.flatMap<DirectiveRecipientPreviewRow>((item) =>
    item.recipients.length
      ? item.recipients.map((recipient) => ({
          key: `${item.provinceId}-${recipient.id}`,
          scopeLabel: item.provinceName,
          scopeCode: item.provinceCode,
          targetLabel: recipient.positionTitle,
          targetSubLabel: recipient.organizationUnitName,
          targetKind: "Regional Commander",
          coverageNames: [item.provinceName],
          targetPositionId: recipient.positionId,
        }))
      : [
          {
            key: `${item.provinceId}-missing`,
            scopeLabel: item.provinceName,
            scopeCode: item.provinceCode,
            targetLabel: null,
            targetSubLabel: "Belum ada Regional Commander yang terhubung.",
            targetKind: "Regional Commander",
            coverageNames: [item.provinceName],
            missing: true,
          },
        ],
  );
}

function buildBindaModePreviewRows(targetAreaIds: string[], regionalMasters: RegionalMasterOverview | null) {
  const summaryMap = new Map((regionalMasters?.provinces ?? []).map((item) => [item.province.id, item]));

  return targetAreaIds.map<DirectiveRecipientPreviewRow>((provinceId) => {
    const summary = summaryMap.get(provinceId);
    const provinceName = summary?.province.name ?? "Provinsi";
    const provinceCode = summary?.province.code ?? "-";

    if (!summary?.binda) {
      return {
        key: `${provinceId}-missing-binda`,
        scopeLabel: provinceName,
        scopeCode: provinceCode,
        targetLabel: null,
        targetSubLabel: "Provinsi ini belum memiliki organisasi Binda aktif.",
        targetKind: "Binda",
        coverageNames: [provinceName],
        missing: true,
      };
    }

    return {
      key: summary.binda.unitId,
      scopeLabel: provinceName,
      scopeCode: provinceCode,
      targetLabel: summary.binda.name,
      targetSubLabel: summary.binda.code,
      targetKind: "Binda",
      coverageNames: [provinceName],
      targetUnitId: summary.binda.unitId,
    };
  });
}

function buildDirectorateModePreviewRows(targetAreaIds: string[], regionalMasters: RegionalMasterOverview | null) {
  const selectedSet = new Set(targetAreaIds);
  const directorates = uniqBy(
    (regionalMasters?.provinces ?? []).flatMap((province) => province.directorates),
    (directorate) => directorate.unitId,
  );

  return directorates
    .filter((directorate) => {
      const coverageIds = getDirectorateCoverageIds(directorate);
      return coverageIds.length > 0 && coverageIds.every((coverageId) => selectedSet.has(coverageId));
    })
    .map<DirectiveRecipientPreviewRow>((directorate) => ({
      key: directorate.unitId,
      scopeLabel: directorate.name,
      scopeCode: directorate.profileCode ?? directorate.code,
      targetLabel: directorate.name,
      targetSubLabel: directorate.profileCode ?? directorate.code,
      targetKind: "Direktorat",
      coverageNames: directorate.coverageAreas.map((coverage) => coverage.name),
      targetUnitId: directorate.unitId,
    }));
}

function buildDirectiveRecipientInputs(rows: DirectiveRecipientPreviewRow[]): DirectiveRecipientInput[] {
  return uniqBy(
    rows.flatMap((row) =>
      row.missing
        ? []
        : [
            {
              ...(row.targetUnitId ? { targetUnitId: row.targetUnitId } : {}),
              ...(row.targetPositionId ? { targetPositionId: row.targetPositionId } : {}),
            },
          ],
    ),
    (recipient) => recipient.targetUnitId ?? recipient.targetPositionId ?? "",
  );
}

const directiveFormFieldLabels: Record<string, string> = {
  ownerUnitId: "Unit pembuat STR",
  commandNumber: "Nomor STR",
  classification: "Klasifikasi",
  commandSource: "Sumber Perintah",
  commandIssuer: "Pemberi Perintah",
  commandDate: "Tanggal Perintah",
  dueDate: "Batas Waktu",
  strategicIssue: "Isu Strategis",
  commandDescription: "Uraian Perintah",
  uukTitle: "Judul UUK/STR",
  uukSections: "Bagian UUK/KIQ/PIR",
  targetAreaIds: "Peta wilayah sasaran",
  recipients: "Penerima distribusi",
};

function formatValidationPath(path: unknown) {
  if (Array.isArray(path)) {
    const [field, ...rest] = path.map(String);
    const label = directiveFormFieldLabels[field] ?? field;

    return rest.length ? `${label} (${rest.join(".")})` : label;
  }

  if (typeof path === "string" && path) {
    const [field, ...rest] = path.split(".");
    const label = directiveFormFieldLabels[field] ?? field;

    return rest.length ? `${label} (${rest.join(".")})` : label;
  }

  return "Form STR";
}

function normalizeValidationMessage(message: string) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("unique") && lowerMessage.includes("commandnumber")) {
    return "Nomor STR sudah digunakan. Gunakan nomor STR lain.";
  }

  if (lowerMessage.includes("invalid uuid")) {
    return "ID data tidak valid. Muat ulang halaman lalu pilih ulang target/penerima.";
  }

  if (lowerMessage.includes("invalid date") || lowerMessage.includes("date string")) {
    return "Format tanggal tidak valid. Pilih tanggal melalui input kalender.";
  }

  if (lowerMessage.includes("required")) {
    return "Wajib diisi.";
  }

  return message;
}

function formatValidationMessage(path: unknown, message: string) {
  return `${formatValidationPath(path)}: ${normalizeValidationMessage(message)}`;
}

function getValidationPathFromObject(value: object) {
  if ("path" in value) {
    return value.path;
  }

  if ("property" in value) {
    return value.property;
  }

  return undefined;
}

function extractValidationMessages(value: unknown): string[] {
  if (value instanceof ZodError) {
    return value.issues.map((issue) => formatValidationMessage(issue.path, issue.message));
  }

  if (typeof value === "string") {
    try {
      return extractValidationMessages(JSON.parse(value));
    } catch {
      return value ? [value] : [];
    }
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (item && typeof item === "object" && "message" in item && typeof item.message === "string") {
        const path = getValidationPathFromObject(item);
        return [formatValidationMessage(path, item.message)];
      }

      if (item && typeof item === "object" && "constraints" in item && item.constraints) {
        const path = "property" in item ? item.property : undefined;
        return Object.values(item.constraints as Record<string, unknown>).flatMap((message) =>
          typeof message === "string" ? [formatValidationMessage(path, message)] : [],
        );
      }

      if (item && typeof item === "object" && "children" in item) {
        return extractValidationMessages(item.children);
      }

      return extractValidationMessages(item);
    });
  }

  if (value && typeof value === "object") {
    if ("message" in value && typeof value.message === "string") {
      return extractValidationMessages(value.message);
    }

    if ("details" in value) {
      return extractValidationMessages(value.details);
    }
  }

  return [];
}

function extractApiFieldMessages(fields?: Record<string, string[]> | Array<{ field: string; message: string }>) {
  if (!fields) {
    return [];
  }

  if (Array.isArray(fields)) {
    return fields.map((field) => formatValidationMessage(field.field, field.message));
  }

  return Object.entries(fields).flatMap(([field, messages]) =>
    messages.map((message) => formatValidationMessage(field, message)),
  );
}

function getDirectiveFormErrorMessage(error: unknown) {
  const validationMessages = uniqBy(
    [
      ...extractValidationMessages(error),
      ...extractValidationMessages(error instanceof Error ? error.message : error),
      ...extractValidationMessages(error instanceof ApiClientError ? error.details : null),
      ...extractApiFieldMessages(error instanceof ApiClientError ? error.fields : undefined),
    ],
    (message) => message,
  );

  if (validationMessages.length) {
    return validationMessages.join("\n");
  }

  return error instanceof Error ? error.message : "Gagal menyimpan STR.";
}

type DirectiveFormClientProps = {
  mode: "create" | "edit";
  access: AccessContextResource;
  provinceOptions: ProvinceOption[];
  provinceBoundaries: ProvinceBoundaryCollection;
  regionalAssignments: RegionalAssignmentOption[];
  regionalMasters: RegionalMasterOverview | null;
  directive?: DirectiveDetail;
};

export function DirectiveFormClient({
  mode,
  access,
  provinceOptions,
  provinceBoundaries,
  regionalAssignments,
  regionalMasters,
  directive,
}: DirectiveFormClientProps) {
  const router = useRouter();
  const currentVersion = directive ? getCurrentVersion(directive) : undefined;
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);
  const [isSaving, setIsSaving] = useState(false);
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
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
  const [activeUukSectionIndex, setActiveUukSectionIndex] = useState(0);
  const [hasGeneratedDraft, setHasGeneratedDraft] = useState(false);
  const [generatingScope, setGeneratingScope] = useState<DirectiveAiScope | null>(null);
  const [targetMode, setTargetMode] = useState<DirectiveTargetMode>(() => inferTargetMode(directive));
  const selectableProvinceIds = new Set(provinceOptions.map((item) => item.id));
  const [targetAreaIds, setTargetAreaIds] = useState<string[]>(
    normalizeProvinceSelection(
      currentVersion?.targetAreas.map((item) => item.areaId) ??
        access.authorizationContext.areaScopes.map((item) => item.areaId),
      provinceOptions,
    ).filter((areaId) => selectableProvinceIds.has(areaId)),
  );
  const recipientPreviewRows = useMemo(() => {
    if (targetMode === "binda") {
      return buildBindaModePreviewRows(targetAreaIds, regionalMasters);
    }

    if (targetMode === "directorate") {
      return buildDirectorateModePreviewRows(targetAreaIds, regionalMasters);
    }

    return buildAllModePreviewRows(targetAreaIds, provinceOptions, regionalAssignments);
  }, [provinceOptions, regionalAssignments, regionalMasters, targetAreaIds, targetMode]);
  const normalizedRecipients = useMemo(
    () =>
      targetMode === "all"
        ? deriveDirectiveRecipients(deriveRegionalRecipientPreview(targetAreaIds, provinceOptions, regionalAssignments))
        : buildDirectiveRecipientInputs(recipientPreviewRows),
    [provinceOptions, recipientPreviewRows, regionalAssignments, targetAreaIds, targetMode],
  );
  const uncoveredScopeNames = recipientPreviewRows.filter((item) => item.missing).map((item) => item.scopeLabel);
  let submitLabel = "Perbarui Draft STR";
  let generateFullLabel = hasGeneratedDraft ? "Generate Ulang UK/STR Lengkap" : "Generate UK/STR Lengkap";

  if (isSaving) {
    submitLabel = "Menyimpan...";
  } else if (mode === "create") {
    submitLabel = "Simpan Draft STR";
  }

  if (generatingScope === "full") {
    generateFullLabel = "AI Sedang Menyusun...";
  }

  useEffect(() => {
    setActiveUukSectionIndex((current) => Math.min(current, Math.max(uukSections.length - 1, 0)));
  }, [uukSections.length]);

  const filledUukSectionCount = countFilledStructuredSections(uukSections);
  const activeUukSection = uukSections[activeUukSectionIndex] ?? uukSections[0];
  const activeUukSectionFilled = Boolean(activeUukSection?.content.trim());

  function updateUukSection(sectionType: string, content: string) {
    setUukSections((current) =>
      current.map((section) => (section.sectionType === sectionType ? { ...section, content } : section)),
    );
  }

  async function generateDirectiveRecommendation(scope: DirectiveAiScope) {
    if (!strategicIssue.trim()) {
      toast.error("Isu Strategis wajib diisi sebelum menggunakan AI Recommendation.");
      return;
    }

    setGeneratingScope(scope);

    try {
      const result = await apiBrowserMutation<DirectiveAiResponse>("POST", "/directives/ai-recommendation", {
        scope,
        strategicIssue: strategicIssue.trim(),
        title: uukTitle,
        commandNarrative,
        sections: Object.fromEntries(uukSections.map((section) => [section.sectionType, section.content])),
        context: {
          commandNumber,
          classification,
          commandSource,
          commandIssuer,
          commandDate,
          dueDate,
          targetMode,
          targetAreas: provinceOptions
            .filter((province) => targetAreaIds.includes(province.id))
            .map((province) => province.name),
        },
      });

      if (result.title) {
        setUukTitle(result.title);
      }

      if (result.commandNarrative) {
        setCommandNarrative(result.commandNarrative);
      }

      setUukSections((current) =>
        current.map((section) => ({
          ...section,
          content: result.sections[section.sectionType] ?? section.content,
        })),
      );

      if (scope === "full") {
        setHasGeneratedDraft(true);
      }

      const successMessages: Record<DirectiveAiScope, string> = {
        full: "UUK/STR lengkap berhasil diisi oleh AI.",
        eei: "EEI/PIR berhasil diisi oleh AI.",
        collection: "Rencana pengumpulan berhasil diisi oleh AI.",
        recommendation: "Saran tindak berhasil diisi oleh AI.",
        polish: "Seluruh isi UUK/STR berhasil diubah ke bahasa intelijen.",
      };
      toast.success(successMessages[scope]);
    } catch (error) {
      toast.error(getDirectiveFormErrorMessage(error));
    } finally {
      setGeneratingScope(null);
    }
  }

  async function handleSubmit() {
    setIsSaving(true);

    try {
      const normalizedTargetAreaIds = normalizeProvinceSelection(targetAreaIds, provinceOptions);

      if (!normalizedTargetAreaIds.length) {
        throw new Error("Pilih minimal satu provinsi sasaran pada peta STR.");
      }

      if (!normalizedRecipients.length) {
        throw new Error("Belum ada penerima distribusi yang cocok dengan mode sasaran yang dipilih.");
      }

      if (uncoveredScopeNames.length) {
        throw new Error(
          `Target berikut belum memiliki penerima organisasi yang valid: ${uncoveredScopeNames.join(", ")}.`,
        );
      }

      const serializedCommandDescription = serializeDirectiveCommandDescription({
        commandNarrative,
        uukTitle,
        uukSections,
      });

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
      setFormErrorMessage(getDirectiveFormErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={Boolean(formErrorMessage)} onOpenChange={(open) => !open && setFormErrorMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>STR belum bisa disimpan</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">{formErrorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setFormErrorMessage(null)}>Lengkapi Inputan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <Card className="min-w-0">
            <CardHeader />
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
                <Select
                  value={classification}
                  onValueChange={setClassification}
                  disabled={mode === "edit"}
                >
                  <SelectTrigger className="h-12 w-full rounded-md border-[var(--dc-border-subtle)] bg-background/50 text-[var(--dc-text-primary)] focus:border-[var(--dc-primary)]/50 focus:ring-0">
                    <span className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(classification)}`}>
                      {formatClassificationLabel(classification)}
                    </span>
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {CLASSIFICATION_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        <span className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(item)}`}>
                          {formatClassificationLabel(item)}
                        </span>
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
            preview={deriveRegionalRecipientPreview(targetAreaIds, provinceOptions, regionalAssignments)}
            regionalMasters={regionalMasters}
            selectionMode={targetMode}
            onSelectionModeChange={(nextMode) => {
              setTargetMode(nextMode);
              setTargetAreaIds([]);
            }}
            onChange={(nextProvinceIds) =>
              setTargetAreaIds(normalizeProvinceSelection(nextProvinceIds, provinceOptions))
            }
          />

          <Card>
            <CardHeader>
              <CardTitle>Preview Distribusi</CardTitle>
              <CardDescription>
                Mode `Semua` menurunkan distribusi ke Regional Commander. Mode `Binda` dan `Direktorat` langsung
                menargetkan organisasi yang dipilih dari peta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {uncoveredScopeNames.length ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 text-sm dark:text-amber-100">
                  {uncoveredScopeNames.join(", ")} belum memiliki target distribusi yang valid untuk mode ini.
                </div>
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sasaran</TableHead>
                    <TableHead>Jenis Distribusi</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Cakupan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipientPreviewRows.length ? (
                    recipientPreviewRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">
                          {row.scopeLabel}
                          <div className="text-muted-foreground text-xs">{row.scopeCode}</div>
                        </TableCell>
                        <TableCell>{row.targetKind}</TableCell>
                        <TableCell>
                          {row.missing ? (
                            <span className="text-amber-700 dark:text-amber-200">{row.targetSubLabel}</span>
                          ) : (
                            <div>
                              <div className="font-medium">{row.targetLabel}</div>
                              <div className="text-muted-foreground text-xs">{row.targetSubLabel ?? "-"}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {row.coverageNames.map((coverageName) => (
                              <Badge key={`${row.key}-${coverageName}`} variant="outline">
                                {coverageName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Pilih sasaran pada peta untuk melihat target distribusinya.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card className="min-w-0">
          <CardHeader />
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-[var(--dc-success)]/25 bg-[color-mix(in_srgb,var(--dc-card)_92%,var(--dc-success)_8%)] shadow-[var(--dc-shadow-soft)]">
              <div className="border-[var(--dc-success)]/20 border-b bg-[var(--dc-success-soft)] px-4 py-3">
                <div className="min-w-0 font-medium text-[var(--dc-success)] text-xs uppercase tracking-[0.22em]">
                  <Cpu className="mr-2 inline size-4 align-[-3px]" />
                  Output UK/STR
                </div>
              </div>
              <div className="grid gap-4 p-4">
                <Button
                  type="button"
                  onClick={() => generateDirectiveRecommendation("full")}
                  disabled={generatingScope !== null}
                  className="h-auto min-h-12 w-full border border-[var(--dc-success)] bg-[var(--dc-success)] px-4 font-semibold text-[var(--dc-text-inverse)] shadow-sm hover:bg-[color-mix(in_srgb,var(--dc-success)_86%,var(--dc-text-primary)_14%)]"
                >
                  <Cpu className="mr-2 size-4" />
                  {generateFullLabel}
                </Button>
                <div className="grid gap-3 md:grid-cols-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateDirectiveRecommendation("eei")}
                    disabled={generatingScope !== null}
                    className="h-auto min-h-11 whitespace-normal border-[var(--dc-info)]/25 bg-[var(--dc-info-soft)] px-3 text-center text-[var(--dc-text-primary)] leading-tight hover:bg-[color-mix(in_srgb,var(--dc-info-soft)_70%,var(--dc-info)_12%)]"
                  >
                    {generatingScope === "eei" ? "AI Sedang Menyusun..." : "Generate EEI/PIR"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateDirectiveRecommendation("collection")}
                    disabled={generatingScope !== null}
                    className="h-auto min-h-11 whitespace-normal border-[var(--dc-warning)]/25 bg-[var(--dc-warning-soft)] px-3 text-center text-[var(--dc-text-primary)] leading-tight hover:bg-[color-mix(in_srgb,var(--dc-warning-soft)_70%,var(--dc-warning)_12%)]"
                  >
                    {generatingScope === "collection" ? "AI Sedang Menyusun..." : "Generate Rencana Pengumpulan"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateDirectiveRecommendation("recommendation")}
                    disabled={generatingScope !== null}
                    className="h-auto min-h-11 whitespace-normal border-[var(--dc-success)]/25 bg-[var(--dc-success-soft)] px-3 text-center text-[var(--dc-text-primary)] leading-tight hover:bg-[color-mix(in_srgb,var(--dc-success-soft)_70%,var(--dc-success)_12%)]"
                  >
                    {generatingScope === "recommendation" ? "AI Sedang Menyusun..." : "Generate Saran Tindak"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => generateDirectiveRecommendation("polish")}
                    disabled={generatingScope !== null}
                    className="h-auto min-h-11 whitespace-normal border-[var(--dc-primary)]/25 bg-[var(--dc-primary-soft)] px-3 text-center text-[var(--dc-text-primary)] leading-tight hover:bg-[color-mix(in_srgb,var(--dc-primary-soft)_70%,var(--dc-primary)_12%)]"
                  >
                    {generatingScope === "polish" ? "AI Menyusun Bahasa Intelijen..." : "Ubah ke Bahasa Intelijen"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <span>Judul UUK/STR</span>
              <Input
                value={uukTitle}
                onChange={(event) => setUukTitle(event.target.value)}
                className="w-full min-w-0"
                aria-label="Judul UUK/STR"
              />
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="font-medium">Progress Isi UUK</div>
                <Badge variant="outline">
                  {filledUukSectionCount} / {uukSections.length} bagian terisi
                </Badge>
              </div>
              <div className="text-muted-foreground text-sm">
                Isi minimal satu bagian UUK/KIQ/PIR agar STR dapat menjadi starting object yang jelas untuk regional.
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Wizard Isi UUK</div>
                  <div className="text-muted-foreground text-sm">
                    Isi satu bagian, lalu lanjut ke bagian berikutnya.
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    activeUukSectionFilled
                      ? "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : "border-border bg-muted/35 text-muted-foreground"
                  }
                >
                  {activeUukSectionFilled ? "Bagian terisi" : "Belum diisi"}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {uukSections.map((section, index) => {
                  const isActive = index === activeUukSectionIndex;
                  const isFilled = Boolean(section.content.trim());

                  return (
                    <button
                      key={section.sectionType}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveUukSectionIndex(index)}
                      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                        isActive
                          ? "border-[var(--dc-primary)] bg-[var(--dc-primary-soft)] text-[var(--dc-primary)] shadow-sm"
                          : isFilled
                            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:border-emerald-500/45 dark:text-emerald-300"
                            : "border-border bg-background/60 text-muted-foreground hover:border-[var(--dc-primary)]/45 hover:text-foreground"
                      }`}
                    >
                      <span className="block font-semibold">Bagian {section.orderNumber}</span>
                      <span className="mt-0.5 block truncate">{section.title}</span>
                    </button>
                  );
                })}
              </div>

              {activeUukSection ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                        Bagian {activeUukSection.orderNumber} dari {uukSections.length}
                      </div>
                      <div className="mt-1 font-semibold text-lg">{activeUukSection.title}</div>
                    </div>
                    <Badge variant="outline">{activeUukSection.sectionType}</Badge>
                  </div>
                  <Textarea
                    value={activeUukSection.content}
                    onChange={(event) => updateUukSection(activeUukSection.sectionType, event.target.value)}
                    className="min-h-60 w-full min-w-0 resize-y"
                    placeholder={`Isi ${activeUukSection.title.toLowerCase()}...`}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveUukSectionIndex((current) => Math.max(0, current - 1))}
                      disabled={activeUukSectionIndex === 0}
                    >
                      Sebelumnya
                    </Button>
                    <div className="text-muted-foreground text-xs">
                      {activeUukSectionIndex + 1} / {uukSections.length}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setActiveUukSectionIndex((current) => Math.min(uukSections.length - 1, current + 1))
                      }
                      disabled={activeUukSectionIndex >= uukSections.length - 1}
                    >
                      Berikutnya
                    </Button>
                  </div>
                </div>
              ) : null}
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
