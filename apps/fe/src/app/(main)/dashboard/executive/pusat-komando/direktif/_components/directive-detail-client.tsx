"use client";

import { useEffect, useMemo, useState } from "react";

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import type { DirectiveDetail } from "@/features/directives/types";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { cn } from "@/lib/utils";

import { badgeVariant, formatDate, getCurrentVersion, renderRecipientLabel } from "./directive-shared";

type DirectiveDetailClientProps = {
  directive: DirectiveDetail;
};

function StatusBadge({ status }: { status: string }) {
  let badgeClass = "border-muted text-muted-foreground bg-muted/5";
  
  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(status)) {
    badgeClass = "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10";
  } else if (["CANCELLED", "FAILED"].includes(status)) {
    badgeClass = "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10";
  } else if (["REVISION_REQUESTED"].includes(status)) {
    badgeClass = "border-[var(--dc-warning)]/40 text-[var(--dc-warning)] bg-[var(--dc-warning-soft)]/10";
  } else if (["DRAFT"].includes(status)) {
    badgeClass = "border-white/10 text-muted-foreground bg-white/[0.02]";
  }

  return (
    <Badge variant="outline" className={`font-mono text-[10px] tracking-wider rounded-[4px] px-2 py-0.5 uppercase ${badgeClass}`}>
      {status}
    </Badge>
  );
}

export function DirectiveDetailClient({ directive }: DirectiveDetailClientProps) {
  const router = useRouter();
  const currentVersion = getCurrentVersion(directive);
  const [isSubmitting, setIsSubmitting] = useState<"publish" | "distribute" | "cancel" | null>(null);
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);
  const isActionDisabled = isSubmitting !== null;

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

  const uukSectionsToRender = parsedDescription.uukSections.filter(s => s.sectionType !== "AUTHENTICATION");
  const authSection = parsedDescription.uukSections.find(s => s.sectionType === "AUTHENTICATION");

  const allSections = useMemo(() => {
    const sections = [...uukSectionsToRender];
    if (authSection) {
      sections.push(authSection);
    }
    return sections;
  }, [uukSectionsToRender, authSection]);

  const allSectionsWithSupport = useMemo(() => {
    const list = [...allSections];
    list.push({
      sectionType: "SUPPORTING_INFO",
      title: "Informasi Pendukung",
      orderNumber: allSections.length + 1,
      content: "",
    });
    return list;
  }, [allSections]);

  // Section Wizard States
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [isSupportingVisible, setIsSupportingVisible] = useState(false);

  // Monitor Supporting Info scroll boundary to auto-highlight tab 10
  useEffect(() => {
    const element = document.getElementById("section-SUPPORTING_INFO");
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsSupportingVisible(entry.isIntersecting);
    }, {
      root: null,
      rootMargin: "-20% 0px -60% 0px",
      threshold: 0,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleSelectSection = (index: number) => {
    if (index === 9) {
      scrollToSupportingInfo();
      return;
    }

    setIsFading(true);
    setTimeout(() => {
      setActiveSectionIndex(index);
      setIsFading(false);
      scrollToActiveSection();
    }, 150);
  };

  const scrollToActiveSection = () => {
    const element = document.getElementById("active-section-container");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollToSupportingInfo = () => {
    const element = document.getElementById("section-SUPPORTING_INFO");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const activeSection = allSections[activeSectionIndex];

  const getShortNavTitle = (sectionType: string, index: number) => {
    const numberStr = (index + 1).toString().padStart(2, "0");
    if (sectionType === "SUPPORTING_INFO") {
      return `${numberStr} Pendukung`;
    }
    switch (sectionType) {
      case "BASIS_BACKGROUND":
        return `${numberStr} Dasar`;
      case "INVESTIGATION_TARGETS":
        return `${numberStr} Sasaran`;
      case "EEI_PIR":
        return `${numberStr} EEI`;
      case "COLLECTION_PLAN":
        return `${numberStr} Pengumpulan`;
      case "THREAT_RISK_ANALYSIS":
        return `${numberStr} Risiko`;
      case "IMPLEMENTATION_MECHANISM":
        return `${numberStr} Pelaksanaan`;
      case "COORDINATION_REPORTING":
        return `${numberStr} Pelaporan`;
      case "RECOMMENDATION":
        return `${numberStr} Rekomendasi`;
      case "AUTHENTICATION":
        return `${numberStr} Pengesahan`;
      default:
        return `${numberStr} Section`;
    }
  };

  const formatContent = (text: string) => {
    if (!text || text.trim() === "" || text.trim() === "Belum diisi.") {
      return <p className="text-muted-foreground/45 italic text-[11px] py-1">Belum ada konten.</p>;
    }

    const lines = text.split("\n");
    const formattedBlocks: React.ReactNode[] = [];
    let currentList: React.ReactNode[] = [];
    let listType: "ul" | "ol" | null = null;
    let blockquoteContent: string[] = [];

    const flushList = (key: number) => {
      if (currentList.length > 0) {
        if (listType === "ol") {
          formattedBlocks.push(
            <ol key={`ol-${key}`} className="list-decimal pl-5 space-y-0.5 text-xs leading-relaxed text-foreground/95 my-1">
              {currentList}
            </ol>
          );
        } else {
          formattedBlocks.push(
            <ul key={`ul-${key}`} className="list-disc pl-5 space-y-0.5 text-xs leading-relaxed text-foreground/95 my-1">
              {currentList}
            </ul>
          );
        }
        currentList = [];
        listType = null;
      }
    };

    const flushQuote = (key: number) => {
      if (blockquoteContent.length > 0) {
        formattedBlocks.push(
          <blockquote key={`quote-${key}`} className="border-l-2 border-primary/60 bg-secondary/10 p-2 rounded-r-[3px] italic text-muted-foreground text-xs my-1 leading-relaxed">
            {blockquoteContent.join("\n")}
          </blockquote>
        );
        blockquoteContent = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Blockquote
      if (trimmed.startsWith(">")) {
        flushList(index);
        blockquoteContent.push(trimmed.slice(1).trim());
        return;
      } else {
        flushQuote(index);
      }

      // Ordered List
      const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
      if (olMatch) {
        if (listType !== "ol") {
          flushList(index);
          listType = "ol";
        }
        currentList.push(<li key={`li-${index}`} className="pl-0.5">{olMatch[2]}</li>);
        return;
      }

      // Unordered List
      const ulMatch = line.match(/^[\*\-]\s+(.*)$/);
      if (ulMatch) {
        if (listType !== "ul") {
          flushList(index);
          listType = "ul";
        }
        currentList.push(<li key={`li-${index}`} className="pl-0.5">{ulMatch[1]}</li>);
        return;
      }

      // Plain line
      flushList(index);
      if (trimmed !== "") {
        formattedBlocks.push(
          <p key={`p-${index}`} className="text-xs leading-relaxed text-foreground/90 mb-1.5 whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      }
    });

    flushList(lines.length);
    flushQuote(lines.length);

    return <div className="space-y-1">{formattedBlocks}</div>;
  };

  const stepperHighlightIndex = isSupportingVisible ? 9 : activeSectionIndex;
  const activeSectionIsCompleted = activeSection?.content.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* 1. COMPACT HORIZONTAL HEADER CARD */}
      <Card className="border border-border bg-card rounded-[12px] shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 bg-secondary/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-primary font-bold">{directive.commandNumber}</span>
              <StatusBadge status={directive.status} />
              <Badge variant="outline" className="border-red-500/20 text-red-600 dark:text-red-400 bg-red-500/5 text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] uppercase">
                {currentVersion?.classification ?? "RAHASIA"}
              </Badge>
            </div>
            <h1 className="font-sans font-bold text-lg text-foreground tracking-tight">
              {currentVersion?.strategicIssue ?? "DENS CAKRA DIRECTIVE"}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button asChild variant="outline" size="sm" className="h-8 rounded-[4px] text-xs">
              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>Edit Draft</Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-8 rounded-[4px] text-xs">
              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/tracking`}>Tracking</Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={isActionDisabled}
                  variant="success"
                  className="h-8 rounded-[4px] text-xs"
                >
                  {isSubmitting === "publish" ? "Memproses..." : "Publish"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publish STR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    STR {directive.commandNumber} akan dipublish and siap masuk tahap distribusi. Pastikan metadata,
                    UUK/KIQ/PIR, wilayah sasaran, dan penerima sudah benar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("publish")}
                    variant="success"
                  >
                    {isSubmitting === "publish" ? "Memproses..." : "Ya, Publish"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" className="h-8 rounded-[4px] text-xs" onClick={() => triggerAction("distribute")} disabled={isActionDisabled} variant="success">
              {isSubmitting === "distribute" ? "Memproses..." : "Distribusikan"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="h-8 rounded-[4px] text-xs cursor-pointer" disabled={isActionDisabled} variant="destructive">
                  {isSubmitting === "cancel" ? "Memproses..." : "Batalkan"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Batalkan STR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini akan membatalkan STR {directive.commandNumber}. Alur komando dan tindak lanjut dari STR
                    ini tidak boleh dilanjutkan setelah dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("cancel")}
                    variant="destructive"
                  >
                    {isSubmitting === "cancel" ? "Memproses..." : "Ya, Batalkan"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4 text-xs font-mono">
          <div>
            <span className="text-muted-foreground/60 block text-[9px] uppercase">Wilayah Sasaran</span>
            <span className="text-foreground font-semibold line-clamp-1 mt-0.5">
              {currentVersion?.targetAreas.map(a => a.area.name).join(", ") || "-"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground/60 block text-[9px] uppercase">Tanggal Publish</span>
            <span className="text-foreground font-semibold mt-0.5 block">
              {currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground/60 block text-[9px] uppercase">Author</span>
            <span className="text-foreground font-semibold mt-0.5 block truncate">
              {directive.createdByAssignment?.userProfile?.fullName || "COMMAND SYSTEM"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground/60 block text-[9px] uppercase">Last Update</span>
            <span className="text-foreground font-semibold mt-0.5 block">
              {currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}
            </span>
          </div>
          <div className="col-span-2 md:col-span-2 flex flex-col justify-center">
            <span className="text-muted-foreground/60 block text-[9px] uppercase mb-1">Progress Section</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary h-2 rounded-full overflow-hidden border border-border">
                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(allSections.filter(s => s.content.trim().length > 0).length / allSections.length) * 100}%` }} />
              </div>
              <span className="font-bold text-primary shrink-0">
                {allSections.filter(s => s.content.trim().length > 0).length}/{allSections.length}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. HORIZONTAL STEP NAVIGATION (01–10) */}
      <div className="sticky top-[56px] md:top-[60px] z-30 bg-background/95 backdrop-blur-md border-b border-border/80 py-2.5 px-1 -mx-4 md:-mx-6 px-4 md:px-6 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-1.5 scroll-smooth shrink-0">
        {allSectionsWithSupport.map((section, index) => {
          const isSelected = stepperHighlightIndex === index;
          const isCompleted = section.sectionType === "SUPPORTING_INFO"
            ? true
            : section.content.trim().length > 0;
          return (
            <button
              key={section.sectionType}
              onClick={() => handleSelectSection(index)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold border transition-all shrink-0 whitespace-nowrap cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                  : "border-border/60 bg-card hover:bg-accent text-muted-foreground"
              )}
            >
              {getShortNavTitle(section.sectionType, index)}
              <span className="ml-1 text-[9px] opacity-60">
                {isCompleted ? "✓" : "○"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. ACTIVE SECTION CARD (WIZARD MODE) */}
      <div id="active-section-container" className="scroll-mt-36">
        <div className={cn(
          "transition-all duration-150 ease-in-out",
          isFading ? "opacity-30 translate-y-1" : "opacity-100 translate-y-0"
        )}>
          {activeSectionIndex < 9 && activeSection && (
            <Card className="border border-border/80 bg-card rounded-[8px] p-4 shadow-sm space-y-3">
              {/* Card Header */}
              <div className="space-y-1">
                <span className="text-[8px] uppercase font-mono font-bold tracking-widest text-primary">
                  SECTION {(activeSectionIndex + 1).toString().padStart(2, "0")} | {activeSection.sectionType}
                </span>
                <h2 className="text-sm font-bold font-sans text-foreground leading-tight tracking-wide uppercase mt-0.5">
                  {activeSection.title}
                </h2>
                
                {/* Compact Single-line Metadata */}
                <div className="flex flex-wrap items-center gap-1.5 text-[9.5px] font-mono text-muted-foreground/60 mt-1">
                  <span>Classification: <strong className="text-foreground">{currentVersion?.classification ?? "RAHASIA"}</strong></span>
                  <span className="opacity-40">•</span>
                  <span>Owner: <strong className="text-foreground">{directive.ownerUnit?.name ?? "-"}</strong></span>
                  <span className="opacity-40">•</span>
                  <span>Last Update: <strong className="text-foreground">{currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}</strong></span>
                  <span className="opacity-40">•</span>
                  <span>Status: <strong className={cn(activeSectionIsCompleted ? "text-emerald-500" : "text-muted-foreground/70")}>{activeSectionIsCompleted ? "Selesai" : "Belum diisi"}</strong></span>
                </div>
              </div>
              
              <div className="border-t border-border/30 my-2" />
              
              {/* Card Body content (auto height) */}
              <div className="text-xs leading-relaxed text-foreground/90">
                {formatContent(activeSection.content)}
              </div>
              
              <div className="border-t border-border/30 my-2" />
              
              {/* Previous — Next Navigation Controls */}
              <div className="flex items-center justify-between text-xs pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectSection(activeSectionIndex - 1)}
                  disabled={activeSectionIndex === 0}
                  className="h-8 px-3 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectSection(activeSectionIndex + 1)}
                  className="h-8 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* 4. INFORMASI PENDUKUNG (SUPPORTING INFO - Always visible at bottom) */}
      <div
        id="section-SUPPORTING_INFO"
        className="scroll-mt-36 pt-6 border-t border-border/30 space-y-4"
      >
        <div className="space-y-1">
          <span className="text-[8px] uppercase font-mono font-bold tracking-widest text-primary">
            SECTION 10 | SUPPORTING_INFO
          </span>
          <h2 className="text-sm font-bold font-sans text-foreground leading-tight tracking-wide uppercase mt-0.5">
            Informasi Pendukung
          </h2>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          
          {/* Narrative description */}
          <div className="rounded-[8px] border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="space-y-0.5">
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
                OPERATIONAL_NARRATIVE
              </span>
              <h3 className="font-sans text-xs font-bold uppercase text-foreground">
                Isu Strategis & Uraian Perintah
              </h3>
            </div>
            <div className="border-t border-border pt-3 space-y-3">
              <div className="space-y-1">
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                  ISU_STRATEGIS
                </div>
                <p className="text-xs text-foreground bg-secondary/30 border border-border/40 p-2.5 rounded-[4px]">
                  {currentVersion?.strategicIssue ?? "Belum diisi."}
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                  URAIAN_PERINTAH
                </div>
                <p className="text-xs text-foreground bg-secondary/30 border border-border/40 p-2.5 rounded-[4px] whitespace-pre-wrap">
                  {parsedDescription.commandNarrative || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Recipients & Target Areas */}
          <div className="rounded-[8px] border border-border bg-card p-4 space-y-3 shadow-xs">
            <div className="space-y-0.5">
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
                RECIPIENTS_AND_TARGETS
              </span>
              <h3 className="font-sans text-xs font-bold uppercase text-foreground">
                Penerima & Wilayah Sasaran
              </h3>
            </div>
            
            <div className="border-t border-border pt-3 space-y-3">
              <div className="space-y-1.5">
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                  WILAYAH_SASARAN
                </div>
                <div className="flex flex-wrap gap-1">
                  {currentVersion?.targetAreas.map((item) => (
                    <Badge key={item.areaId} variant="outline" className="font-mono text-[9px] tracking-wider rounded-[4px] border-border text-muted-foreground bg-secondary/20 px-1.5 py-0">
                      {item.area.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                  DAFTAR_PENERIMA
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {currentVersion?.recipients.length ? (
                    currentVersion.recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between rounded-[4px] bg-secondary/20 border border-border/30 p-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate max-w-[150px]">{renderRecipientLabel(recipient)}</div>
                          <div className="text-muted-foreground/60 text-[9px] font-mono mt-0.5">
                            {recipient.targetPosition ? "JABATAN" : "UNIT"}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono text-[9px] scale-90 px-1.5 py-0 uppercase ${badgeVariant(recipient.status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(recipient.status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-border text-muted-foreground bg-secondary/30"}`}>
                          {recipient.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-xs italic">Belum ada penerima.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Derivative Artifacts (Artefak Turunan STR) */}
          <div className="rounded-[8px] border border-border bg-card p-4 space-y-3 shadow-xs md:col-span-2">
            <div className="space-y-0.5">
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
                DERIVATIVE_ARTIFACTS
              </span>
              <h3 className="font-sans text-xs font-bold uppercase text-foreground">
                Artefak Turunan STR
              </h3>
            </div>

            <div className="border-t border-border pt-3 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                  REGIONAL_EXPANSIONS
                </div>
                <div className="space-y-1.5">
                  {currentVersion?.uukStrs?.length ? (
                    currentVersion.uukStrs.map((uuk) => (
                      <div key={uuk.id} className="flex items-center justify-between rounded-[4px] bg-secondary/20 border border-border/30 p-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                            {uuk.versions?.[0]?.title ?? "Penjabaran Regional"}
                          </div>
                          <div className="text-muted-foreground/60 text-[9px] font-mono mt-0.5">
                            {uuk.ownerUnit?.name ?? "-"}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono text-[9px] scale-90 px-1.5 py-0 uppercase ${badgeVariant(uuk.status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(uuk.status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-border text-muted-foreground bg-secondary/30"}`}>
                          {uuk.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground/50 text-[10px] italic p-2.5 border border-dashed border-border/60 rounded-[4px] text-center">
                      Belum ada penjabaran regional.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/60">
                  OPERATIONAL_TASKS
                </div>
                <div className="space-y-1.5">
                  {currentVersion?.tasks?.length ? (
                    currentVersion.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-[4px] bg-secondary/20 border border-border/30 p-2 text-xs">
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                            {task.title}
                          </div>
                          <div className="text-muted-foreground/60 text-[9px] font-mono mt-0.5">
                            {task.ownerUnit?.name ?? "-"}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono text-[9px] scale-90 px-1.5 py-0 uppercase ${badgeVariant(task.status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(task.status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-border text-muted-foreground bg-secondary/30"}`}>
                          {task.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground/50 text-[10px] italic p-2.5 border border-dashed border-border/60 rounded-[4px] text-center">
                      Belum ada task turunan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
