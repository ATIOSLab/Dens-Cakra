"use client";

import Link from "next/link";

import { ArrowUpRight, FileText, Plus, RadioTower, ShieldCheck, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buildDirectiveUukSummary, parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import type { DirectiveSummary } from "@/features/directives/types";

import { badgeVariant, formatDate, getCurrentVersion } from "./directive-shared";

type DirectiveListClientProps = {
  directives: DirectiveSummary[];
};

function statusBadgeClass(status: string) {
  if (["CANCELLED", "FAILED"].includes(status)) {
    return "border-[var(--dc-danger)]/30 bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
  }

  if (["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(status)) {
    return "border-[var(--dc-success)]/30 bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
  }

  if (["DRAFT", "REVISION_REQUESTED"].includes(status)) {
    return "border-[var(--dc-warning)]/30 bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
  }

  return "border-[var(--dc-primary)]/30 bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
}

type PremiumKpiCardProps = {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  progress?: number;
  className?: string;
};

function PremiumKpiCard({
  title,
  value,
  description,
  icon,
  variant = "primary",
  progress,
  className = "",
}: PremiumKpiCardProps) {
  let colorClass = "text-[var(--dc-primary)]";
  let borderLeftClass = "border-l-2 border-l-[var(--dc-primary)]";
  let iconBgClass = "bg-[var(--dc-primary-soft)] text-[var(--dc-primary)]";
  let shadowClass = "drop-shadow-[0_0_8px_rgba(0,183,255,0.3)]";

  if (variant === "success") {
    colorClass = "text-[var(--dc-success)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-success)]";
    iconBgClass = "bg-[var(--dc-success-soft)] text-[var(--dc-success)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  } else if (variant === "warning") {
    colorClass = "text-[var(--dc-warning)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-warning)]";
    iconBgClass = "bg-[var(--dc-warning-soft)] text-[var(--dc-warning)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]";
  } else if (variant === "danger") {
    colorClass = "text-[var(--dc-danger)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-danger)]";
    iconBgClass = "bg-[var(--dc-danger-soft)] text-[var(--dc-danger)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  } else if (variant === "info") {
    colorClass = "text-[var(--dc-info)]";
    borderLeftClass = "border-l-2 border-l-[var(--dc-info)]";
    iconBgClass = "bg-[var(--dc-info-soft)] text-[var(--dc-info)]";
    shadowClass = "drop-shadow-[0_0_8px_rgba(56,189,248,0.3)]";
  }

  return (
    <div className={`relative flex flex-col justify-between rounded-xl border border-[var(--dc-border-subtle)] ${borderLeftClass} bg-[var(--dc-card)] p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-h-[140px] ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">
          {title}
        </div>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${iconBgClass}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 flex flex-col justify-end flex-1">
        <div className={`text-3xl font-bold [font-family:var(--dc-font-metadata)] ${colorClass} ${shadowClass}`}>
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </div>
        
        {progress !== undefined ? (
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>Progres</span>
              <span className={colorClass}>{progress}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-muted/30 overflow-hidden">
              <div
                className={`h-full rounded-full bg-current ${colorClass}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-2 text-[10px] text-muted-foreground leading-tight line-clamp-2">
            {description}
          </div>
        )}
      </div>
    </div>
  );
}

export function DirectiveListClient({ directives }: DirectiveListClientProps) {
  const totalRecipients = directives.reduce((sum, directive) => {
    return sum + (getCurrentVersion(directive)?.recipients.length ?? 0);
  }, 0);
  const publishedCount = directives.filter((directive) =>
    ["PUBLISHED", "DISTRIBUTED", "COMPLETED", "ACKNOWLEDGED"].includes(directive.status),
  ).length;
  const draftCount = directives.filter((directive) =>
    ["DRAFT", "REVISION_REQUESTED"].includes(directive.status),
  ).length;

  return (
    <div className="executive-command-page space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between px-1">
        <div className="max-w-3xl space-y-1.5">
          <div className="executive-command-page__eyebrow flex items-center gap-2">
            <RadioTower className="size-4" />
            Pusat Komando Eksekutif
          </div>
          <div className="space-y-1">
            <h1 className="font-semibold text-xl tracking-tight md:text-2xl">STR / Direktif Strategis</h1>
          </div>
        </div>

        <Button
          asChild
          className="h-8 rounded-[var(--dc-radius-md)] bg-[var(--dc-primary)] px-3 font-semibold text-[var(--dc-text-inverse)] shadow-none hover:bg-[var(--dc-primary-hover)] shrink-0"
        >
          <Link href="/dashboard/executive/pusat-komando/direktif/baru">
            <Plus className="size-4" />
            Buat STR Baru
          </Link>
        </Button>
      </div>

      <Card className="executive-command-page__card">
        <CardHeader className="gap-2 px-4 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <CardTitle className="font-semibold text-lg">Daftar STR Aktif</CardTitle>
              <CardDescription className="max-w-2xl text-[var(--dc-text-secondary)]">
                Gunakan tabel ini untuk review draft, publish, distribusi, dan tracking tindak lanjut.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 md:px-5">
          <div className="executive-command-page__table">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-4">Nomor STR</TableHead>
                  <TableHead>Judul UUK/STR</TableHead>
                  <TableHead>Klasifikasi</TableHead>
                  <TableHead>Wilayah</TableHead>
                  <TableHead>Penerima</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
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
                        <TableCell className="pl-4 font-semibold text-[var(--dc-text-primary)]">
                          {directive.commandNumber}
                        </TableCell>
                        <TableCell className="max-w-[24rem] whitespace-normal">
                          <div className="space-y-1">
                            <div className="font-semibold text-[var(--dc-text-primary)]">{title}</div>
                            <div className="line-clamp-2 text-[var(--dc-text-secondary)] text-xs leading-5">
                              {buildDirectiveUukSummary(parsed.uukSections) || "Belum ada ringkasan UUK."}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="executive-command-page__classification">
                            {currentVersion?.classification ?? "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[18rem] whitespace-normal text-[var(--dc-text-secondary)]">
                          {areaSummary}
                        </TableCell>
                        <TableCell className="text-[var(--dc-text-secondary)]">
                          {currentVersion?.recipients.length ?? 0} penerima
                        </TableCell>
                        <TableCell className="text-[var(--dc-text-secondary)]">
                          {formatDate(currentVersion?.dueDate)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={badgeVariant(directive.status)}
                            className={statusBadgeClass(directive.status)}
                          >
                            {directive.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                            >
                              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}`}>
                                Detail
                                <ArrowUpRight className="size-3.5" />
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-[var(--dc-border-subtle)] bg-[var(--dc-surface)] text-[var(--dc-text-primary)] hover:bg-[var(--dc-surface-hover)]"
                            >
                              <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>
                                Edit
                              </Link>
                            </Button>
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="border-[var(--dc-primary)]/40 text-[var(--dc-primary)] hover:bg-[var(--dc-primary-soft)] hover:text-[var(--dc-primary-pressed)]"
                            >
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
                    <TableCell colSpan={8} className="py-10 text-center text-[var(--dc-text-secondary)]">
                      Belum ada STR yang dibuat pada unit eksekutif ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
