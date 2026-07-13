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


import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";

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

function SummaryMetric({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "info" | "neutral";
}) {
  let colorClass = "text-muted-foreground";
  if (variant === "primary") colorClass = "text-[var(--dc-primary)]";
  else if (variant === "success") colorClass = "text-[var(--dc-success)]";
  else if (variant === "warning") colorClass = "text-[var(--dc-warning)]";
  else if (variant === "danger") colorClass = "text-[var(--dc-danger)]";
  else if (variant === "info") colorClass = "text-[var(--dc-info)]";

  return (
    <div className="flex flex-col justify-between rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 h-24 min-w-[120px] flex-1">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
        {label}
      </div>
      <div className={`mt-1 font-sans text-sm font-semibold truncate ${colorClass}`}>
        {value}
      </div>
    </div>
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

  const [activeSectionId, setActiveSectionId] = useState<string>("");

  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -55% 0px", // triggers when centered in viewport
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSectionId(entry.target.id.replace("section-", ""));
        }
      });
    }, observerOptions);

    allSectionsWithSupport.forEach((section) => {
      const element = document.getElementById(`section-${section.sectionType}`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [allSectionsWithSupport]);

  const scrollToSection = (sectionType: string) => {
    const element = document.getElementById(`section-${sectionType}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSectionId(sectionType);
    }
  };

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
      return <p className="text-muted-foreground/45 italic text-[11px]">Belum diisi.</p>;
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
            <ol key={`ol-${key}`} className="list-decimal pl-5 space-y-1 text-xs leading-[1.5] text-foreground/95 my-1.5">
              {currentList}
            </ol>
          );
        } else {
          formattedBlocks.push(
            <ul key={`ul-${key}`} className="list-disc pl-5 space-y-1 text-xs leading-[1.5] text-foreground/95 my-1.5">
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
          <blockquote key={`quote-${key}`} className="border-l border-primary/60 bg-secondary/20 p-2 rounded-r-[3px] italic text-muted-foreground text-xs my-1.5 leading-[1.5]">
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
          <p key={`p-${index}`} className="text-xs leading-[1.5] text-foreground/90 mb-2 whitespace-pre-wrap">
            {trimmed}
          </p>
        );
      }
    });

    flushList(lines.length);
    flushQuote(lines.length);

    return <div className="space-y-1.5">{formattedBlocks}</div>;
  };

  return (
    <div className="space-y-6">
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
                  className="h-8 rounded-[4px] text-xs border-transparent bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 cursor-pointer"
                >
                  {isSubmitting === "publish" ? "Memproses..." : "Publish"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Publish STR?</AlertDialogTitle>
                  <AlertDialogDescription>
                    STR {directive.commandNumber} akan dipublish dan siap masuk tahap distribusi. Pastikan metadata,
                    UUK/KIQ/PIR, wilayah sasaran, dan penerima sudah benar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isActionDisabled}>Kembali</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("publish")}
                    className="border-transparent bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    {isSubmitting === "publish" ? "Memproses..." : "Ya, Publish"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" className="h-8 rounded-[4px] text-xs cursor-pointer" onClick={() => triggerAction("distribute")} disabled={isActionDisabled} variant="secondary">
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

      {/* 2. STICKY HORIZONTAL NAVIGATION */}
      <div className="sticky top-[56px] md:top-[60px] z-30 bg-background/95 backdrop-blur-md border-b border-border/80 py-3 px-1 -mx-4 md:-mx-6 px-4 md:px-6 shadow-sm overflow-x-auto no-scrollbar flex items-center gap-2 scroll-smooth">
        {allSectionsWithSupport.map((section, index) => {
          const isSelected = activeSectionId === section.sectionType;
          return (
            <button
              key={section.sectionType}
              onClick={() => scrollToSection(section.sectionType)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[11px] font-mono font-bold border transition-all shrink-0 whitespace-nowrap cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/10 text-primary shadow-[0_0_10px_rgba(14,165,233,0.15)]"
                  : "border-border/60 bg-card hover:bg-accent text-muted-foreground"
              )}
            >
              {getShortNavTitle(section.sectionType, index)}
            </button>
          );
        })}
      </div>

      {/* 3. CORE DOCUMENT SECTIONS FLOW */}
      <div className="space-y-0">
        {allSections.map((section, index) => {
          return (
            <div
              key={section.sectionType}
              id={`section-${section.sectionType}`}
              className="scroll-mt-36 first:mt-4 my-4"
            >
              <Card className="border border-border/80 bg-card/65 backdrop-blur-md rounded-[8px] p-3 md:p-4 shadow-sm">
                <div className="space-y-2.5">
                  {/* Card Section Header */}
                  <div className="space-y-1">
                    <span className="text-[8px] uppercase font-mono font-bold tracking-widest text-primary">
                      SECTION {(index + 1).toString().padStart(2, "0")} | {section.sectionType}
                    </span>
                    <h2 className="text-sm md:text-base font-bold font-sans text-foreground leading-tight tracking-wide mt-0.5 uppercase">
                      {section.title}
                    </h2>
                    
                    {/* Metadata kecil */}
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[9px] font-mono text-muted-foreground/60">
                      <span>CLASSIFICATION: <span className="text-foreground font-semibold">{currentVersion?.classification ?? "RAHASIA"}</span></span>
                      <span className="text-muted-foreground/20">|</span>
                      <span>OWNER: <span className="text-foreground font-semibold">{directive.ownerUnit?.name ?? "-"}</span></span>
                      <span className="text-muted-foreground/20">|</span>
                      <span>LAST UPDATED: <span className="text-foreground font-semibold">{currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}</span></span>
                    </div>
                  </div>
                  
                  <div className="border-t border-border/40 my-2" />
                  
                  {/* Card Section Content Body */}
                  <div className="pr-1">
                    {formatContent(section.content)}
                  </div>
                  
                  <div className="border-t border-border/40 my-2" />
                  
                  {/* Card Section Footer */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 text-[8px] font-mono text-muted-foreground/50">
                    <span>EDITOR: <span className="text-foreground">{directive.createdByAssignment?.userProfile?.fullName || "COMMAND CENTER"}</span></span>
                    <span>|</span>
                    <span>TIMESTAMP: <span className="text-foreground">{currentVersion?.commandDate ? formatDate(currentVersion.commandDate) : "-"}</span></span>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* 4. SUPPORTING INFORMATION SECTION */}
      <div id="section-SUPPORTING_INFO" className="scroll-mt-36 my-10 pt-4 border-t border-border/40">
        <div className="space-y-1 mb-6">
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
            SUPPORTING_INFORMATION
          </div>
          <h2 className="font-sans text-xl font-bold uppercase tracking-tight text-foreground">
            Informasi Pendukung
          </h2>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Narrative description */}
          <div className="rounded-[12px] border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                  OPERATIONAL_NARRATIVE
                </span>
                <h3 className="font-sans text-sm font-bold uppercase tracking-tight text-foreground">
                  Isu Strategis & Uraian Perintah
                </h3>
              </div>
            </div>
            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-1.5">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  ISU_STRATEGIS
                </div>
                <p className="text-sm text-foreground leading-relaxed font-sans bg-secondary/40 border border-border/40 p-3 rounded-[4px]">
                  {currentVersion?.strategicIssue ?? "Belum diisi."}
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  URAIAN_PERINTAH
                </div>
                <p className="text-sm text-foreground leading-relaxed font-sans bg-secondary/40 border border-border/40 p-3 rounded-[4px] whitespace-pre-wrap">
                  {parsedDescription.commandNarrative || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Recipients & Target Areas */}
          <div className="rounded-[12px] border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                  RECIPIENTS_AND_TARGETS
                </span>
                <h3 className="font-sans text-sm font-bold uppercase tracking-tight text-foreground">
                  Penerima & Wilayah Sasaran
                </h3>
              </div>
            </div>
            
            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  WILAYAH_SASARAN
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentVersion?.targetAreas.map((item) => (
                    <Badge key={item.areaId} variant="outline" className="font-mono text-[10px] tracking-wider rounded-[4px] border-border text-muted-foreground bg-secondary/30">
                      {item.area.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  DAFTAR_PENERIMA
                </div>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {currentVersion?.recipients.length ? (
                    currentVersion.recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center justify-between rounded-[4px] bg-secondary/30 border border-border/40 p-3 text-sm">
                        <div>
                          <div className="font-medium text-xs text-foreground">{renderRecipientLabel(recipient)}</div>
                          <div className="mt-0.5 text-muted-foreground/60 text-[10px] font-mono">
                            {recipient.targetPosition ? "JABATAN" : "UNIT"}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono text-[10px] tracking-wider rounded-[4px] px-2 py-0.5 uppercase ${badgeVariant(recipient.status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(recipient.status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-border text-muted-foreground bg-secondary/30"}`}>
                          {recipient.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground text-sm italic">Belum ada penerima.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Derivative Artifacts */}
          <div className="rounded-[12px] border border-border bg-card p-5 space-y-4 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50">
                  DERIVATIVE_ARTIFACTS
                </span>
                <h3 className="font-sans text-sm font-bold uppercase tracking-tight text-foreground">
                  Artefak Turunan STR
                </h3>
              </div>
            </div>

            <div className="border-t border-border pt-4 grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  REGIONAL_EXPANSIONS
                </div>
                <div className="space-y-2">
                  {currentVersion?.uukStrs?.length ? (
                    currentVersion.uukStrs.map((uuk) => (
                      <div key={uuk.id} className="flex items-center justify-between rounded-[4px] bg-secondary/30 border border-border/40 p-3 text-sm">
                        <div>
                          <div className="font-medium text-xs text-foreground truncate max-w-[200px]">
                            {uuk.versions?.[0]?.title ?? "Penjabaran Regional"}
                          </div>
                          <div className="mt-0.5 text-muted-foreground/60 text-[10px] font-mono">
                            {uuk.ownerUnit?.name ?? "-"}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono text-[10px] tracking-wider rounded-[4px] px-2 py-0.5 uppercase ${badgeVariant(uuk.status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(uuk.status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-border text-muted-foreground bg-secondary/30"}`}>
                          {uuk.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground/60 text-xs italic p-3 border border-dashed border-border/60 rounded-[4px] text-center">
                      Belum ada penjabaran regional.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  OPERATIONAL_TASKS
                </div>
                <div className="space-y-2">
                  {currentVersion?.tasks?.length ? (
                    currentVersion.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between rounded-[4px] bg-secondary/30 border border-border/40 p-3 text-sm">
                        <div>
                          <div className="font-medium text-xs text-foreground truncate max-w-[200px]">
                            {task.title}
                          </div>
                          <div className="mt-0.5 text-muted-foreground/60 text-[10px] font-mono">
                            {task.ownerUnit?.name ?? "-"}
                          </div>
                        </div>
                        <Badge variant="outline" className={`font-mono text-[10px] tracking-wider rounded-[4px] px-2 py-0.5 uppercase ${badgeVariant(task.status) === "destructive" ? "border-[var(--dc-danger)]/40 text-[var(--dc-danger)] bg-[var(--dc-danger-soft)]/10" : badgeVariant(task.status) === "default" ? "border-[var(--dc-success)]/40 text-[var(--dc-success)] bg-[var(--dc-success-soft)]/10" : "border-border text-muted-foreground bg-secondary/30"}`}>
                          {task.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted-foreground/60 text-xs italic p-3 border border-dashed border-border/60 rounded-[4px] text-center">
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
