"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BookOpenText, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import { apiBrowserMutation } from "@/lib/api/browser-client";

import { uukCreateSchema } from "@/features/uuk-str/schemas";
import type { UukDetail, UukDirectiveOption, UukSummary } from "@/features/uuk-str/types";

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
                          <Badge variant={badgeVariant(relatedUuk.status)}>{statusLabel(relatedUuk.status)}</Badge>
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
              <Button type="button" onClick={handleForward} disabled={!hasReadSource || !selectedDirective || isSaving}>
                {isSaving ? "Meneruskan..." : "Teruskan STR"}
              </Button>
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

export function UukDetailClient({ uuk }: UukDetailClientProps) {
  const router = useRouter();
  const currentVersion = getCurrentVersion(uuk);
  const [action, setAction] = useState<"publish" | "cancel" | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{currentVersion?.title ?? "Penerusan Regional"}</h1>
            <Badge variant={badgeVariant(uuk.status)}>{statusLabel(uuk.status)}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {uuk.directiveVersion?.directive?.commandNumber ?? "-"} - penerusan regional ini membawa isi STR yang sama
            tanpa revisi di level regional
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {uuk.status !== "PUBLISHED" && uuk.status !== "CANCELLED" ? (
            <Button onClick={() => triggerAction("publish")} disabled={action !== null}>
              {action === "publish" ? "Memproses..." : "Teruskan Sekarang"}
            </Button>
          ) : null}
          {uuk.status !== "CANCELLED" ? (
            <Button onClick={() => triggerAction("cancel")} disabled={action !== null} variant="destructive">
              {action === "cancel" ? "Memproses..." : "Batalkan"}
            </Button>
          ) : null}
        </div>
      </div>

      <Alert className="border-border/70 bg-muted/20">
        <BookOpenText className="size-4" />
        <AlertTitle>Isi STR terkunci di level regional</AlertTitle>
        <AlertDescription>
          Regional Commander tidak melakukan edit atau revisi isi. Halaman ini hanya menjadi bukti bahwa STR sudah
          diteruskan dalam rantai komando yang sama.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>STR Sumber</CardTitle>
          <CardDescription>
            {uuk.directiveVersion?.directive?.commandNumber ?? "-"} - rantai penerusan tetap berada pada STR yang sama
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Owner Regional</div>
            <div className="mt-1 font-medium">{uuk.ownerUnit?.name ?? "-"}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Versi</div>
            <div className="mt-1 font-medium">{uuk.currentVersionNumber}</div>
          </div>
          <div className="rounded-xl border border-border/70 p-3 text-sm">
            <div className="text-muted-foreground text-xs uppercase tracking-wide">Tasks Turunan</div>
            <div className="mt-1 font-medium">{currentVersion?.tasks?.length ?? 0}</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {currentVersion?.sections.map((section) => (
          <Card key={section.sectionType}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.sectionType}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {section.items.map((item) => (
                <div
                  key={`${section.sectionType}-${item.itemCode}`}
                  className="rounded-xl border border-border/70 p-3 text-sm"
                >
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">{item.itemCode}</div>
                  <p className="mt-2 leading-6">{item.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
