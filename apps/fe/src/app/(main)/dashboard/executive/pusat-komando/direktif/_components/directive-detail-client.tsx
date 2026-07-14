"use client";

import { type ReactNode, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import type { DirectiveDetail, DirectiveTracking } from "@/features/directives/types";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import { DirectiveDistributionFlow } from "./directive-distribution-flow";
import { formatDate, getCurrentVersion } from "./directive-shared";

type DirectiveDetailClientProps = {
  directive: DirectiveDetail;
  tracking: DirectiveTracking;
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  let color = "border-[var(--dc-warning)]/40 bg-[var(--dc-warning-soft)]/10 text-[var(--dc-warning)]";
  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(normalized)) {
    color = "border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 text-[var(--dc-success)]";
  } else if (["CANCELLED", "FAILED"].includes(normalized)) {
    color = "border-[var(--dc-danger)]/40 bg-[var(--dc-danger-soft)]/10 text-[var(--dc-danger)]";
  }

  return (
    <Badge
      variant="outline"
      className={cn("rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider", color)}
    >
      {status}
    </Badge>
  );
}

function formatContent(text: string): ReactNode {
  if (!text || text.trim() === "" || text.trim() === "Belum diisi.") {
    return <p className="py-2 text-sm italic text-muted-foreground">Belum ada konten.</p>;
  }

  const blocks: ReactNode[] = [];
  const lines = text.split("\n");
  let listItems: ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = (key: number) => {
    if (listItems.length === 0) return;
    const List = listType === "ol" ? "ol" : "ul";
    blocks.push(
      <List
        key={`list-${key}`}
        className={cn(
          "my-2 space-y-1 pl-5 text-sm leading-6 text-foreground/90",
          listType === "ol" ? "list-decimal" : "list-disc",
        )}
      >
        {listItems}
      </List>,
    );
    listItems = [];
    listType = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const ordered = line.match(/^(\d+)\.\s+(.*)$/);
    const unordered = line.match(/^[*-]\s+(.*)$/);

    if (ordered || unordered) {
      const nextType = ordered ? "ol" : "ul";
      if (listType !== nextType) {
        flushList(index);
        listType = nextType;
      }
      listItems.push(<li key={`item-${index}`}>{ordered?.[2] ?? unordered?.[1]}</li>);
      return;
    }

    flushList(index);
    if (trimmed) {
      blocks.push(
        <p key={`paragraph-${index}`} className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
          {trimmed}
        </p>,
      );
    }
  });

  flushList(lines.length);
  return <div className="space-y-2">{blocks}</div>;
}

export function DirectiveDetailClient({ directive, tracking }: DirectiveDetailClientProps) {
  const router = useRouter();
  const currentVersion = getCurrentVersion(directive);
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);
  const [isSubmitting, setIsSubmitting] = useState<"publish" | "distribute" | "cancel" | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [isSupportingVisible, setIsSupportingVisible] = useState(false);

  const sections = useMemo(
    () => parsedDescription.uukSections.filter((section) => section.sectionType !== "AUTHENTICATION"),
    [parsedDescription.uukSections],
  );
  const authSection = useMemo(
    () => parsedDescription.uukSections.find((section) => section.sectionType === "AUTHENTICATION"),
    [parsedDescription.uukSections],
  );
  const allSections = useMemo(() => (authSection ? [...sections, authSection] : sections), [authSection, sections]);
  const activeSection = allSections[activeSectionIndex];
  const completedSections = allSections.filter((section) => section.content.trim().length > 0).length;
  const isActionDisabled = isSubmitting !== null;
  const stepperHighlightIndex = isSupportingVisible ? allSections.length : activeSectionIndex;

  async function triggerAction(action: "publish" | "distribute" | "cancel") {
    if (!currentVersion) return;
    setIsSubmitting(action);

    try {
      if (action === "publish") {
        await apiBrowserMutation("POST", `/directive-versions/${currentVersion.id}/publish`, {
          confirmation: "PUBLISH",
        });
        toast.success("STR berhasil dipublikasikan.");
      } else if (action === "distribute") {
        await apiBrowserMutation("POST", `/directive-versions/${currentVersion.id}/distribute`, {
          sendNotifications: true,
        });
        toast.success("STR berhasil didistribusikan.");
      } else {
        await apiBrowserMutation("POST", `/directives/${directive.id}/cancel`, {
          reason: "Pembatalan dari pusat komando eksekutif.",
        });
        toast.success("STR berhasil dibatalkan.");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi STR gagal diproses.");
    } finally {
      setIsSubmitting(null);
    }
  }

  const sectionTitle = (sectionType: string, index: number) => {
    const number = String(index + 1).padStart(2, "0");
    const labels: Record<string, string> = {
      BASIS_BACKGROUND: "Dasar",
      INVESTIGATION_TARGETS: "Sasaran",
      EEI_PIR: "EEI",
      COLLECTION_PLAN: "Pengumpulan",
      THREAT_RISK_ANALYSIS: "Risiko",
      IMPLEMENTATION_MECHANISM: "Pelaksanaan",
      COORDINATION_REPORTING: "Pelaporan",
      RECOMMENDATION: "Rekomendasi",
      AUTHENTICATION: "Pengesahan",
    };
    return `${number} ${labels[sectionType] ?? "Bagian"}`;
  };

  const selectSection = (index: number) => {
    if (index === allSections.length) {
      setIsSupportingVisible(true);
      document.getElementById("section-distribution")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setActiveSectionIndex(index);
    setIsSupportingVisible(false);
    window.setTimeout(
      () => document.getElementById("active-section-container")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      40,
    );
  };

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col justify-between gap-5 border-b border-border bg-secondary/10 p-5 lg:flex-row lg:items-center">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">{directive.commandNumber}</span>
              <StatusBadge status={directive.status} />
              <Badge
                variant="outline"
                className="rounded-md border-[var(--dc-danger)]/30 px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--dc-danger)]"
              >
                {currentVersion?.classification ?? "RAHASIA"}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {currentVersion?.strategicIssue ?? "DENS CAKRA DIRECTIVE"}
            </h1>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline" size="sm" className="cursor-pointer">
              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>Edit Draft</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="cursor-pointer">
              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/tracking`}>Tracking</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="success" disabled={isActionDisabled} className="cursor-pointer">
                  {isSubmitting === "publish" ? "Memproses..." : "Publish"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publikasikan STR?</AlertDialogTitle>
                  <AlertDialogDescription>STR akan siap masuk ke tahap distribusi.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("publish")}
                    variant="success"
                  >
                    Ya, Publish
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="sm"
              variant="success"
              disabled={isActionDisabled}
              onClick={() => triggerAction("distribute")}
              className="cursor-pointer"
            >
              {isSubmitting === "distribute" ? "Memproses..." : "Distribusikan"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" disabled={isActionDisabled} className="cursor-pointer">
                  {isSubmitting === "cancel" ? "Memproses..." : "Batalkan"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batalkan STR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Alur komando dan tindak lanjut STR ini tidak dapat dilanjutkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("cancel")}
                    variant="destructive"
                  >
                    Ya, Batalkan
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-5 p-5 text-xs sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Pemberi Perintah</p>
            <p className="mt-1 font-semibold text-foreground">{currentVersion?.commandIssuer || "-"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Penerbit</p>
            <p className="mt-1 font-semibold text-foreground">
              {directive.createdByAssignment?.userProfile?.fullName || "-"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Wilayah Sasaran</p>
            <p className="mt-1 line-clamp-2 font-semibold text-foreground">
              {currentVersion?.targetAreas.map((area) => area.area.name).join(", ") || "-"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Tanggal Dibuat</p>
            <p className="mt-1 font-semibold text-foreground">
              {currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Update Terakhir</p>
            <p className="mt-1 font-semibold text-foreground">
              {currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-muted-foreground">Progress Dokumen</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full border border-border bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${allSections.length ? (completedSections / allSections.length) * 100 : 0}%` }}
                />
              </div>
              <span className="font-semibold text-primary">
                {completedSections}/{allSections.length}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="sticky top-[56px] z-30 -mx-4 flex items-center gap-1.5 overflow-x-auto border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur-md md:-mx-6 md:px-6">
        {allSections.map((section, index) => {
          const complete = section.content.trim().length > 0;
          return (
            <button
              key={section.sectionType}
              type="button"
              onClick={() => selectSection(index)}
              className={cn(
                "cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition",
                stepperHighlightIndex === index
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-accent",
              )}
            >
              {sectionTitle(section.sectionType, index)}{" "}
              <span className="ml-1 opacity-60">{complete ? "OK" : "-"}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => selectSection(allSections.length)}
          className={cn(
            "cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition",
            stepperHighlightIndex === allSections.length
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-card text-muted-foreground hover:bg-accent",
          )}
        >
          {String(allSections.length + 1).padStart(2, "0")} Alur Distribusi
        </button>
      </div>

      <div id="active-section-container" className="scroll-mt-36">
        {activeSection ? (
          <Card className="rounded-xl border border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Bagian {String(activeSectionIndex + 1).padStart(2, "0")}
              </p>
              <CardTitle className="text-lg">{activeSection.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  Klasifikasi:{" "}
                  <strong className="text-foreground">{currentVersion?.classification ?? "RAHASIA"}</strong>
                </span>
                <span>•</span>
                <span>
                  Pemilik: <strong className="text-foreground">{directive.ownerUnit?.name ?? "-"}</strong>
                </span>
              </div>
              <div className="border-t border-border pt-5">{formatContent(activeSection.content)}</div>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeSectionIndex === 0}
                  onClick={() => selectSection(activeSectionIndex - 1)}
                  className="cursor-pointer"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeSectionIndex >= allSections.length - 1}
                  onClick={() => selectSection(activeSectionIndex + 1)}
                  className="cursor-pointer"
                >
                  Berikutnya
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div id="section-distribution" className="scroll-mt-36 space-y-5">
        <Card className="rounded-xl border border-border bg-card shadow-sm">
          <CardHeader>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Informasi Pendukung</p>
            <CardTitle className="text-lg">Konteks Operasional</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 border-t border-border p-5 md:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Isu Strategis</p>
              <p className="mt-2 rounded-lg border border-border bg-background p-4 text-sm leading-6 text-foreground">
                {currentVersion?.strategicIssue || "Belum diisi."}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground">Uraian Perintah</p>
              <div className="mt-2 rounded-lg border border-border bg-background p-4">
                {formatContent(parsedDescription.commandNarrative || "Belum diisi.")}
              </div>
            </div>
          </CardContent>
        </Card>
        <DirectiveDistributionFlow directive={directive} tracking={tracking} />
      </div>
    </div>
  );
}
