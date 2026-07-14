"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BookOpenText,
  ChevronRight,
  FileText,
  Lock,
  Calendar,
  User,
  Check,
  Compass,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Target,
  HelpCircle,
  Map as MapIcon,
  ShieldAlert,
  Zap,
  Share2,
  CheckSquare,
  Award,
} from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import { uukCreateSchema } from "@/features/uuk-str/schemas";
import type { UukDetail, UukDirectiveOption, UukSummary } from "@/features/uuk-str/types";
import { apiBrowserMutation } from "@/lib/api/browser-client";

const UUK_SECTION_BLUEPRINT = [
  ["BASIS_BACKGROUND", "Basis dan Latar Belakang"],
  ["INVESTIGATION_TARGETS", "Sasaran Penyelidikan"],
  ["EEI_PIR", "EEI / PIR"],
  ["COLLECTION_PLAN", "Rencana Pengumpulan"],
  ["THREAT_RISK_ANALYSIS", "Analisis Ancaman dan Risiko"],
  ["IMPLEMENTATION_MECHANISM", "Mekanisme Pelaksanaan"],
  ["COORDINATION_REPORTING", "Koordinasi dan Pelaporan"],
  ["RECOMMENDATION", "Rekomendasi"],
  ["AUTHENTICATION", "Pengesahan"],
] as const;

function badgeVariant(status: string) {
  if (["CANCELLED"].includes(status)) {
    return "destructive";
  }

  if (["READY", "PUBLISHED"].includes(status)) {
    return "default";
  }

  return "outline";
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "READY":
      return "Siap Diteruskan";
    case "PUBLISHED":
      return "Sudah Diteruskan";
    case "REVISED":
      return "Revisi";
    case "CANCELLED":
      return "Dibatalkan";
    default:
      return status;
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildForwardingDraftFromDirective(commandDescription?: string | null) {
  const parsed = parseDirectiveCommandDescription(commandDescription);

  const sections = UUK_SECTION_BLUEPRINT.map(([sectionType, title], index) => {
    const sourceSection = parsed.uukSections.find((item) => item.sectionType === sectionType);
    const inheritedContent = sourceSection?.content?.trim() || (index === 0 ? parsed.commandNarrative.trim() : "");

    return {
      sectionType,
      title,
      orderNumber: index + 1,
      items: [
        {
          itemCode: `${index + 1}.1`,
          content: inheritedContent,
          orderNumber: 1,
        },
      ],
    };
  });

  return {
    sourceTitle: parsed.uukTitle.trim(),
    sections,
  };
}

function getCurrentVersion(uuk: UukDetail | UukSummary) {
  return uuk.versions.find((item) => item.versionNumber === uuk.currentVersionNumber) ?? uuk.versions[0];
}

function normalizeDisplayText(value?: string | null) {
  const normalized = value?.trim();

  return normalized?.length ? normalized : "-";
}

type UukListClientProps = {
  directives: UukDirectiveOption[];
  uuks: UukSummary[];
};

export function UukListClient({ directives, uuks }: UukListClientProps) {
  const uukByDirectiveVersionId = useMemo(
    () => new Map(uuks.map((uuk) => [uuk.directiveVersion?.id ?? "", uuk])),
    [uuks],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">STR Masuk dan Penerusan Regional</h1>
        <p className="text-muted-foreground text-sm">
          Regional Commander menerima STR dari Eksekutif, lalu meneruskan STR yang sama ke rantai komando di bawahnya
          dengan penajaman arahan regional.
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>STR Diterima dari Eksekutif</CardTitle>
          <CardDescription>
            Pilih STR yang sudah masuk untuk dibaca, lalu lanjutkan sebagai penerusan regional tanpa membuat STR akar
            baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor STR</TableHead>
                <TableHead>Judul UUK/STR</TableHead>
                <TableHead>Pemberi</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status Penerusan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {directives.length ? (
                directives.map((directive) => {
                  const currentVersion =
                    directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber) ??
                    directive.versions[0];
                  const relatedUuk = uukByDirectiveVersionId.get(currentVersion?.id ?? "");
                  const parsedTitle = parseDirectiveCommandDescription(currentVersion?.commandDescription);

                  return (
                    <TableRow key={directive.id}>
                      <TableCell className="font-medium">{directive.commandNumber}</TableCell>
                      <TableCell>{parsedTitle.uukTitle || "STR Eksekutif"}</TableCell>
                      <TableCell>{currentVersion?.commandIssuer ?? directive.ownerUnit?.name ?? "-"}</TableCell>
                      <TableCell>{formatDate(currentVersion?.commandDate)}</TableCell>
                      <TableCell>
                        {relatedUuk ? (
                          <Badge
                            variant={badgeVariant(relatedUuk.status)}
                            className={relatedUuk.status === "PUBLISHED" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : ""}
                          >
                            {statusLabel(relatedUuk.status)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Belum diteruskan</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {relatedUuk ? (
                            <Button asChild size="sm">
                              <Link href={`/dashboard/regional-commander/direktif-penjabaran-uuk-str/${relatedUuk.id}`}>
                                Lihat Penerusan
                              </Link>
                            </Button>
                          ) : (
                            <Button asChild size="sm">
                              <Link
                                href={`/dashboard/regional-commander/direktif-penjabaran-uuk-str/baru?directiveVersionId=${currentVersion?.id ?? directive.id}`}
                              >
                                Baca & Lanjutkan
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Belum ada STR yang masuk ke Regional Commander ini.
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

type UukEditorClientProps = {
  ownerUnitId: string;
  directives: UukDirectiveOption[];
  initialDirectiveVersionId?: string;
};

export function UukEditorClient({ ownerUnitId, directives, initialDirectiveVersionId }: UukEditorClientProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [directiveVersionId, setDirectiveVersionId] = useState(
    initialDirectiveVersionId ?? directives[0]?.versions?.[0]?.id ?? "",
  );
  const [hasReadSource, setHasReadSource] = useState(false);
  const selectedDirective = useMemo(() => {
    for (const directive of directives) {
      const version = directive.versions.find((item) => item.id === directiveVersionId);

      if (version) {
        return { directive, version };
      }
    }

    return null;
  }, [directiveVersionId, directives]);
  const sourceDirectiveContent = useMemo(() => {
    if (!selectedDirective) {
      return null;
    }

    const parsed = parseDirectiveCommandDescription(selectedDirective.version.commandDescription);

    return {
      ...parsed,
      commandNumber: selectedDirective.directive.commandNumber,
      issuer: selectedDirective.version.commandIssuer || selectedDirective.directive.ownerUnit?.name || "-",
      commandDate: selectedDirective.version.commandDate,
      ownerUnitName: selectedDirective.directive.ownerUnit?.name || "-",
    };
  }, [selectedDirective]);
  const inheritedForwarding = useMemo(() => {
    if (!selectedDirective) {
      return null;
    }

    const inheritedDraft = buildForwardingDraftFromDirective(selectedDirective.version.commandDescription);
    const normalizedTitle = inheritedDraft.sourceTitle.trim();

    return {
      title: normalizedTitle || `STR ${selectedDirective.directive.commandNumber}`,
      sections: inheritedDraft.sections,
    };
  }, [selectedDirective]);

  async function handleForward() {
    if (!selectedDirective || !inheritedForwarding) {
      toast.error("STR sumber tidak ditemukan.");
      return;
    }

    setIsSaving(true);

    try {
      const parsed = uukCreateSchema.parse({
        directiveVersionId,
        ownerUnitId,
        title: inheritedForwarding.title,
        sections: inheritedForwarding.sections,
      });

      const created = await apiBrowserMutation<UukDetail>("POST", "/uuk-strs", parsed);
      const createdVersion = getCurrentVersion(created);

      if (created.status !== "PUBLISHED" && createdVersion) {
        await apiBrowserMutation("POST", `/uuk-str-versions/${createdVersion.id}/publish`, {
          confirmation: "PUBLISH",
        });
      }

      toast.success("STR berhasil diteruskan ke jalur regional tanpa perubahan isi.");
      router.push(`/dashboard/regional-commander/direktif-penjabaran-uuk-str/${created.id}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal meneruskan STR regional.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">Baca dan Teruskan STR Regional</h1>
        <p className="text-muted-foreground text-sm">
          Regional Commander hanya membaca STR dari Eksekutif lalu meneruskannya ke OIM dalam rantai komando yang sama,
          tanpa mengubah isi STR.
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
              <BookOpenText className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>1. Baca STR Sumber</CardTitle>
              <CardDescription>
                Pilih STR yang diterima, baca seluruh isinya, lalu teruskan tanpa perubahan sampai ke tahap OIM.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <span>STR Sumber</span>
              <Select
                value={directiveVersionId}
                onValueChange={(value) => {
                  setDirectiveVersionId(value);
                  setHasReadSource(false);
                }}
                disabled={hasReadSource}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih STR sumber" />
                </SelectTrigger>
                <SelectContent>
                  {directives.map((directive) => {
                    const currentDirectiveVersion =
                      directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber) ??
                      directive.versions[0];

                    return (
                      <SelectItem key={directive.id} value={currentDirectiveVersion?.id ?? directive.id}>
                        {directive.commandNumber} -{" "}
                        {currentDirectiveVersion?.commandIssuer ?? directive.ownerUnit?.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 text-sm">
              <span>Mode Tindakan</span>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 font-medium">
                Penerusan tanpa perubahan isi
              </div>
            </div>
          </div>

          {sourceDirectiveContent ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Nomor STR</div>
                  <div className="mt-2 font-medium">{sourceDirectiveContent.commandNumber}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Pemberi</div>
                  <div className="mt-2 font-medium">{normalizeDisplayText(sourceDirectiveContent.issuer)}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Tanggal</div>
                  <div className="mt-2 font-medium">{formatDate(sourceDirectiveContent.commandDate)}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Unit Sumber</div>
                  <div className="mt-2 font-medium">{normalizeDisplayText(sourceDirectiveContent.ownerUnitName)}</div>
                </div>
              </div>

              <Alert className="border-border/70 bg-muted/20">
                <FileText className="size-4" />
                <AlertTitle>{normalizeDisplayText(sourceDirectiveContent.uukTitle || "STR Eksekutif")}</AlertTitle>
                <AlertDescription>
                  {sourceDirectiveContent.commandNarrative?.trim()
                    ? sourceDirectiveContent.commandNarrative
                    : "STR ini tidak memiliki narasi tambahan di luar butir UUK terstruktur."}
                </AlertDescription>
              </Alert>

              <Accordion type="multiple" className="rounded-2xl border border-border/70 bg-background">
                {sourceDirectiveContent.uukSections.map((section) => (
                  <AccordionItem key={section.sectionType} value={section.sectionType} className="px-5">
                    <AccordionTrigger className="py-4 text-left">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {section.orderNumber}. {section.title}
                        </div>
                        <div className="text-muted-foreground text-xs">{section.sectionType}</div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="whitespace-pre-wrap rounded-xl border border-border/70 bg-muted/20 p-4 text-sm leading-7">
                        {normalizeDisplayText(section.content)}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </>
          ) : (
            <Alert>
              <AlertTitle>STR sumber belum tersedia</AlertTitle>
              <AlertDescription>
                Pilih STR yang valid dari daftar agar penerusan regional bisa diproses.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/70">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-2">
              <ChevronRight className="size-5" />
            </div>
            <div className="space-y-1">
              <CardTitle>2. Teruskan STR</CardTitle>
              <CardDescription>
                Tahap ini tidak membuka pengeditan. Sistem akan meneruskan isi STR yang sama ke record regional untuk
                diteruskan ke OIM.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-border/70 bg-muted/20">
            <BookOpenText className="size-4" />
            <AlertTitle>Tidak ada perubahan isi di level Regional Commander</AlertTitle>
            <AlertDescription>
              Setelah STR diterbitkan dari Eksekutif, tindakan Regional Commander hanya membaca lalu meneruskan. Isi STR
              tetap sama sampai dipakai OIM sebagai dasar tindak lanjut operasional.
            </AlertDescription>
          </Alert>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Label htmlFor="regional-read-confirmation" className="items-start gap-3 leading-6">
                <Checkbox
                  id="regional-read-confirmation"
                  checked={hasReadSource}
                  onCheckedChange={(checked) => setHasReadSource(Boolean(checked))}
                  className="mt-1"
                />
                <span>
                  Saya sudah membaca STR sumber dan memahami bahwa penerusan regional dilakukan tanpa mengubah isi STR.
                </span>
              </Label>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="success" type="button" disabled={!hasReadSource || !selectedDirective || isSaving}>
                    {isSaving ? "Meneruskan..." : "Teruskan STR"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Teruskan STR ke regional?</AlertDialogTitle>
                    <AlertDialogDescription>
                      STR {sourceDirectiveContent?.commandNumber ?? "sumber"} akan dibuat sebagai penerusan regional
                      tanpa perubahan isi. Setelah diteruskan, STR ini menjadi dasar tindak lanjut OIM.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSaving}>Kembali</AlertDialogCancel>
                  <AlertDialogAction variant="success" disabled={isSaving} onClick={handleForward}>
                      {isSaving ? "Meneruskan..." : "Ya, Teruskan"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type UukDetailClientProps = {
  uuk: UukDetail;
};

const SECTION_MAP: Record<string, { title: string; icon: React.ComponentType<{ className?: string }> }> = {
  BASIS_BACKGROUND: { title: "Dasar dan Latar Belakang", icon: FileText },
  INVESTIGATION_TARGETS: { title: "Sasaran Penyelidikan", icon: Target },
  EEI_PIR: { title: "EEI / PIR", icon: HelpCircle },
  COLLECTION_PLAN: { title: "Rencana Pengumpulan", icon: MapIcon },
  THREAT_RISK_ANALYSIS: { title: "Analisis Ancaman dan Risiko", icon: ShieldAlert },
  IMPLEMENTATION_MECHANISM: { title: "Mekanisme Pelaksanaan", icon: Zap },
  COORDINATION_REPORTING: { title: "Koordinasi dan Pelaporan", icon: Share2 },
  RECOMMENDATION: { title: "Rekomendasi", icon: CheckSquare },
  AUTHENTICATION: { title: "Pengesahan", icon: Award },
};

export function UukDetailClient({ uuk }: UukDetailClientProps) {
  const router = useRouter();
  const currentVersion = getCurrentVersion(uuk);
  const firstSectionType = currentVersion?.sections?.[0]?.sectionType ?? "";
  const [action, setAction] = useState<"publish" | "cancel" | null>(null);
  const [openSection, setOpenSection] = useState(firstSectionType);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const isActionDisabled = action !== null;

  async function triggerAction(nextAction: "publish" | "cancel") {
    if (!currentVersion) {
      return;
    }

    setAction(nextAction);

    try {
      if (nextAction === "publish") {
        await apiBrowserMutation("POST", `/uuk-str-versions/${currentVersion.id}/publish`, {
          confirmation: "PUBLISH",
        });
        toast.success("Penerusan regional dipublish.");
      }

      if (nextAction === "cancel") {
        await apiBrowserMutation("POST", `/uuk-strs/${uuk.id}/cancel`, {
          reason: "Pembatalan penerusan regional.",
        });
        toast.success("Penerusan regional dibatalkan.");
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Aksi penerusan regional gagal diproses.";
      toast.error(message);
    } finally {
      setAction(null);
    }
  }

  const classification = uuk.directiveVersion?.classification || "RAHASIA";
  const commandNumber = uuk.directiveVersion?.directive?.commandNumber ?? "-";
  const ownerUnitName = uuk.ownerUnit?.name ?? "unit regional";
  const forwardingTitle = currentVersion?.title ?? "Penerusan Regional";
  const downstreamTaskCount = currentVersion?.tasks?.length ?? 0;

  return (
    <div className="relative mx-auto w-full max-w-[1400px] space-y-4 pb-14">
      {/* 1. Command Header */}
      <div className="flex flex-col gap-2 border-white/[0.08] border-b pb-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-bold text-xl tracking-tight text-[var(--dc-text-primary)]">
              {currentVersion?.title ?? "Penerusan Regional"}
            </h1>
            <Badge
              variant="outline"
              className="border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {statusLabel(uuk.status)}
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--dc-warning)]/40 text-[var(--dc-warning)] bg-[var(--dc-warning-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              NORMAL
            </Badge>
            <Badge
              variant="outline"
              className="border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10 font-mono text-[10px] tracking-wider rounded-[4px] uppercase px-2 py-0.5"
            >
              {classification}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-muted-foreground text-xs">
            <div className="flex items-center gap-1">
              <BookOpenText className="size-3 text-muted-foreground/60" />
              <span>
                NOMOR STR:{" "}
                <span className="text-[var(--dc-text-primary)]">
                  {uuk.directiveVersion?.directive?.commandNumber ?? "-"}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <User className="size-3 text-muted-foreground/60" />
              <span>
                REGIONAL PENGIRIM: <span className="text-[var(--dc-text-primary)]">{uuk.ownerUnit?.name ?? "-"}</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground/60" />
              <span>
                TANGGAL:{" "}
                <span className="text-[var(--dc-text-primary)]">
                  {(currentVersion as any)?.createdAt ? formatDate((currentVersion as any).createdAt) : "-"}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Alert Info Banner */}
      <div className="flex items-start gap-2.5 rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2.5 text-muted-foreground text-xs leading-normal">
        <Lock className="mt-0.5 size-4 shrink-0 text-[var(--dc-primary)]" />
        <div>
          <span className="font-bold text-[var(--dc-text-primary)]">Isi STR terkunci di level regional.</span> Regional
          Commander tidak melakukan edit atau revisi isi. Halaman ini hanya menjadi bukti bahwa STR sudah diteruskan
          dalam rantai komando yang sama.
        </div>
      </div>

      {/* 3. Operational Metadata Row */}
      <div className="grid grid-cols-2 gap-3 rounded-[6px] border border-white/[0.04] bg-white/[0.02] p-3 font-mono text-xs md:grid-cols-4">
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">Owner Regional</span>
          <div className="text-[var(--dc-text-primary)] font-bold">{uuk.ownerUnit?.name ?? "-"}</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">Versi</span>
          <div className="text-[var(--dc-text-primary)] font-bold">{uuk.currentVersionNumber}</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">Tasks Turunan</span>
          <div className="text-[var(--dc-text-primary)] font-bold">{currentVersion?.tasks?.length ?? 0}</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-muted-foreground/60 text-[9px] uppercase">Jumlah Section</span>
          <div className="text-[var(--dc-text-primary)] font-bold">{currentVersion?.sections?.length ?? 0}</div>
        </div>
      </div>

      {/* 4. Split 2-Column Layout */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-10">
        {/* Left Column (70%) */}
        <div className="space-y-4 lg:col-span-7">
          {/* Ringkasan STR */}
          <div className="space-y-2 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 shadow-sm">
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground/60 uppercase tracking-wider">
              <Compass className="size-4 text-[var(--dc-primary)]" />
              <span>RINGKASAN STR (AI ASSISTED)</span>
            </div>
            <ul className="grid gap-1.5 pl-4 text-muted-foreground text-xs leading-relaxed md:grid-cols-3">
              <li>
                Dokumen ini merupakan direktif strategis yang diterbitkan oleh{" "}
                <strong className="text-[var(--dc-text-primary)]">
                  {uuk.directiveVersion?.directive?.ownerUnit?.name || "Eksekutif"}
                </strong>{" "}
                untuk penjabaran teknis di tingkat regional.
              </li>
              <li>
                Berisi{" "}
                <strong className="text-[var(--dc-text-primary)]">
                  {currentVersion?.sections?.length ?? 0} bab utama
                </strong>{" "}
                arahan operasional termasuk sasaran penyelidikan, rencana pengumpulan, dan mekanisme koordinasi.
              </li>
              <li>
                Isi STR terkunci sepenuhnya di level Regional Commander guna menjaga integritas informasi operasional
                asli dalam rantai komando.
              </li>
            </ul>
          </div>

          {/* Accordion STR */}
          <div className="space-y-3">
            <Accordion type="multiple" defaultValue={currentVersion?.sections.map((s) => s.sectionType) ?? []}>
              {currentVersion?.sections.map((section) => {
                const meta = SECTION_MAP[section.sectionType] || { title: section.title, icon: FileText };
                const IconComponent = meta.icon;
                const itemsCount = section.items.length;
                const sectionId = `section-${section.sectionType}`;
                const firstItemText = section.items[0]?.content || "";
                const previewText = firstItemText || "Tidak ada detail konten pada bagian ini.";

                return (
                  <AccordionItem
                    key={section.sectionType}
                    value={section.sectionType}
                    id={sectionId}
                    className="mb-3 overflow-hidden rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)]"
                  >
                    <AccordionTrigger className="min-h-20 bg-white/[0.02] px-4 py-3 hover:no-underline">
                      <div className="flex w-full items-center justify-between pr-4 text-left">
                        <div className="flex items-center gap-3">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[var(--dc-primary)]">
                            <IconComponent className="size-4" />
                          </div>
                          <span className="font-bold font-sans text-[var(--dc-text-primary)] text-xs uppercase tracking-tight transition-colors hover:text-[var(--dc-primary)]">
                            {meta.title}
                          </span>
                        </div>
                        <Badge
                          variant="secondary"
                          className="rounded-[4px] border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground uppercase"
                        >
                          {itemsCount} {itemsCount > 1 ? "Poin" : "Poin"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 px-4 py-3 text-xs leading-relaxed">
                      {(() => {
                        const isExpanded = expandedSections[section.sectionType] !== false;
                        return !isExpanded ? (
                          <div className="space-y-3">
                            <div className="rounded-[4px] bg-white/[0.025] px-3 py-2.5 text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                              <span className="font-bold text-[var(--dc-text-primary)]">Ringkasan Bab: </span>
                              {previewText}
                            </div>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSections((prev) => ({ ...prev, [section.sectionType]: true }));
                              }}
                              className="text-[var(--dc-primary)] font-mono p-0 h-auto hover:underline flex items-center gap-1"
                            >
                              Tampilkan Isi Lengkap <ChevronDown className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="rounded-[4px] bg-white/[0.025] px-3 py-2.5 text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">
                              <span className="font-bold text-[var(--dc-text-primary)]">Ringkasan Bab: </span>
                              {previewText}
                            </div>

                            {/* Detailed Points */}
                            <div className="space-y-3 border-t border-white/[0.08] pt-3">
                              <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                                DOKUMEN_LENGKAP
                              </div>
                              {section.items.map((item, idx) => (
                                <div
                                  key={`${section.sectionType}-${item.itemCode}`}
                                  className="flex gap-4 border-white/[0.08] border-b py-3 last:border-b-0"
                                >
                                  <div className="mt-0.5 shrink-0 font-bold font-mono text-[var(--dc-primary)] text-sm">
                                    [{idx + 1}]
                                  </div>
                                  <div className="flex-1 whitespace-pre-wrap text-[13px] text-muted-foreground leading-relaxed">
                                    {item.content}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSections((prev) => ({ ...prev, [section.sectionType]: false }));
                              }}
                              className="text-[var(--dc-primary)] font-mono p-0 h-auto hover:underline flex items-center gap-1"
                            >
                              Sembunyikan Detail <ChevronUp className="size-3" />
                            </Button>
                          </div>
                        );
                      })()}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        </div>

        {/* Right Column / Sticky Sidebar (30%) */}
        <div className="h-fit space-y-3 lg:sticky lg:top-[80px] lg:col-span-3">
          {/* Mission Overview */}
          <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2">
              MISSION OVERVIEW
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">STATUS:</span>
                <Badge
                  variant={badgeVariant(uuk.status)}
                  className={uuk.status === "PUBLISHED" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : ""}
                >
                  {statusLabel(uuk.status)}
                </Badge>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">KLASIFIKASI:</span>
                <span className="font-bold text-[var(--dc-danger)]">{classification}</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">PRIORITAS:</span>
                <span className="font-bold text-[var(--dc-warning)]">NORMAL</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">HIRARKI:</span>
                <span className="font-bold text-[var(--dc-text-primary)]">EKSEKUTIF -&gt; REGIONAL</span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">OWNER REGIONAL:</span>
                <span
                  className="font-bold text-[var(--dc-text-primary)] truncate max-w-[120px]"
                  title={uuk.ownerUnit?.name || "-"}
                >
                  {uuk.ownerUnit?.name || "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">TANGGAL:</span>
                <span className="text-muted-foreground/80">
                  {(currentVersion as any)?.createdAt ? formatDate((currentVersion as any).createdAt) : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-0.5 border-b border-white/[0.04]">
                <span className="text-muted-foreground/60">TASK TURUNAN:</span>
                <span className="font-bold text-[var(--dc-text-primary)]">{currentVersion?.tasks?.length ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Checklist Card */}
          <div className="space-y-3 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2">
              CONFIRMATION CHECKLIST
            </div>

            <div className="space-y-2 text-xs leading-normal">
              <div className="flex items-start gap-2">
                <Check className="size-4 text-[var(--dc-success)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground/80">Saya memahami isi STR secara lengkap.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="size-4 text-[var(--dc-success)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground/80">Isi STR tidak dapat diubah di tingkat regional.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="size-4 text-[var(--dc-success)] mt-0.5 shrink-0" />
                <span className="text-muted-foreground/80">Penjabaran akan menggunakan isi STR yang sama.</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-white/[0.08] pt-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-muted-foreground">PROGRESS VALIDASI:</span>
                <span className="text-[var(--dc-success)] font-bold">100% SECURE</span>
              </div>
              <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden border border-white/10">
                <div className="bg-[var(--dc-success)] h-full w-full" />
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 shadow-sm">
            <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 border-b border-white/[0.08] pb-2">
              QUICK NAVIGATION
            </div>
            <div className="space-y-1 text-xs font-mono">
              {currentVersion?.sections.map((section) => {
                const meta = SECTION_MAP[section.sectionType] || { title: section.title, icon: FileText };
                const IconComponent = meta.icon;
                return (
                  <a
                    key={section.sectionType}
                    href={`#section-${section.sectionType}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(`section-${section.sectionType}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }
                    }}
                    className="flex items-center gap-2 text-muted-foreground hover:text-[var(--dc-primary)] transition-colors py-1 group"
                  >
                    <span className="shrink-0 text-muted-foreground/60 group-hover:text-[var(--dc-primary)] group-hover:scale-110 transition-all">
                      <IconComponent className="size-3.5" />
                    </span>
                    <span className="truncate">{meta.title}</span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Sticky Bottom Actions Bar */}
      <div className="sticky bottom-0 z-50 -mx-6 flex min-h-14 w-full flex-wrap items-center justify-between gap-3 rounded-t-[6px] border-[var(--dc-border-subtle)] border-t bg-[var(--dc-card)]/95 px-4 py-2 backdrop-blur-md sm:mx-0">
        <div className="text-xs font-mono text-muted-foreground">
          STATUS: <span className="text-[var(--dc-primary)] font-bold">{statusLabel(uuk.status)}</span>
          <span className="text-muted-foreground/60 ml-2">
            | VERSI: {uuk.currentVersionNumber} | TURUNAN: {currentVersion?.tasks?.length ?? 0} TASKS
          </span>
        </div>
        <div className="flex items-center gap-2">
          {uuk.status !== "CANCELLED" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isActionDisabled}
                  variant="destructive"
                  className="h-8 rounded-[4px] px-3 font-mono text-xs"
                >
                  Batalkan
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batalkan penerusan STR {ownerUnitName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {forwardingTitle} untuk STR {commandNumber} akan dibatalkan. Tindakan ini menghentikan penerusan
                    regional dari {ownerUnitName}
                    {downstreamTaskCount > 0
                      ? ` dan memengaruhi ${downstreamTaskCount} task turunan yang tercatat`
                      : ""}
                    . Setelah dibatalkan, rantai tindak lanjut dari penerusan regional ini tidak boleh dilanjutkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("cancel")}
                    variant="destructive"
                  >
                    {action === "cancel" ? "Memproses..." : "Ya, Batalkan"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}

          {uuk.status !== "PUBLISHED" && uuk.status !== "CANCELLED" ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isActionDisabled}
                  variant="success"
                  className="h-8 rounded-[4px] px-4 font-mono text-xs"
                >
                  {action === "publish" ? "Memproses..." : "Buat Penjabaran UUK"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Teruskan STR regional?</AlertDialogTitle>
                  <AlertDialogDescription>
                    STR {commandNumber} akan dipublish sebagai penerusan regional dari {ownerUnitName}. Isi STR tetap
                    terkunci dan menjadi dasar tindak lanjut OIM.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction variant="success" disabled={isActionDisabled} onClick={() => triggerAction("publish")}>
                    {action === "publish" ? "Memproses..." : "Ya, Teruskan"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button
              disabled
              className="h-8 rounded-[4px] border border-white/10 bg-white/[0.04] px-4 font-mono text-muted-foreground/60 text-xs shadow-none"
            >
              {uuk.status === "PUBLISHED" ? "Telah Diteruskan" : "Dibatalkan"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
