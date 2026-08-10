"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Award,
  BookOpenText,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  FileText,
  HelpCircle,
  Lock,
  Map as MapIcon,
  Share2,
  ShieldAlert,
  Target,
  User,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { SortableTableHeader } from "@/app/(main)/dashboard/_components/sortable-table-header";
import { ViewModeToggle } from "@/app/(main)/dashboard/_components/view-mode-toggle";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import { uukCreateSchema } from "@/features/uuk-str/schemas";
import type { UukDetail, UukDirectiveOption, UukSummary } from "@/features/uuk-str/types";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";
import { classificationBadgeClass } from "@/lib/classification";
import { jakartaBoundaryIso } from "@/lib/domain/date-time";

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
const CLASSIFICATION_OPTIONS = ["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"] as const;

function formatClassificationLabel(value: string) {
  return value.replaceAll("_", " ");
}

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
    const inheritedContent = sourceSection?.content?.trim() ?? (index === 0 ? parsed.commandNarrative.trim() : "");

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

function useDirectiveMarkRead(directiveVersionId?: string | null) {
  useEffect(() => {
    if (!directiveVersionId) return;

    apiBrowserMutation("POST", `/directive-versions/${directiveVersionId}/mark-read`).catch(() => undefined);
  }, [directiveVersionId]);
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

type DirectiveListResponse = {
  items: UukDirectiveOption[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type UukListResponse = {
  items: UukSummary[];
};

export function UukListClient({ directives, uuks }: UukListClientProps) {
  const [currentDirectives, setCurrentDirectives] = useState(directives);
  const [currentUuks, setCurrentUuks] = useState(uuks);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("__all__");
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"card" | "table">("table");
  const [deadlineSortOrder, setDeadlineSortOrder] = useState<"asc" | "desc">("asc");
  const [totalDirectives, setTotalDirectives] = useState(directives.length);
  const [loading, setLoading] = useState(false);
  const requestSequence = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const uukByDirectiveVersionId = useMemo(
    () => new Map(currentUuks.map((uuk) => [uuk.directiveVersion?.id ?? "", uuk])),
    [currentUuks],
  );

  const fetchDirectives = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        assignedToMe: "true",
        paginated: "true",
        page: String(page),
        limit: String(rowsPerPage),
        sortBy: "effectiveDeadline",
        sortOrder: deadlineSortOrder,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (classificationFilter !== "__all__") params.set("classification", classificationFilter);
      if (periodFrom) params.set("deadlineFrom", jakartaBoundaryIso(periodFrom));
      if (periodTo) params.set("deadlineTo", jakartaBoundaryIso(periodTo, true));

      const result = await apiBrowserFetch<DirectiveListResponse>(`/directives?${params.toString()}`);
      if (requestId !== requestSequence.current) return;
      const nextDirectives = result.items ?? [];
      setCurrentDirectives(nextDirectives);
      setTotalDirectives(result.pagination?.total ?? 0);

      const versionIds = nextDirectives
        .map(
          (directive) =>
            directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber)?.id ??
            directive.versions[0]?.id,
        )
        .filter((id): id is string => Boolean(id));
      if (versionIds.length === 0) {
        setCurrentUuks([]);
      } else {
        const uukResult = await apiBrowserFetch<UukListResponse>(
          `/uuk-strs?paginated=true&page=1&limit=100&directiveVersionIds=${versionIds.join(",")}`,
        );
        if (requestId === requestSequence.current) setCurrentUuks(uukResult.items ?? []);
      }
    } catch (error) {
      if (requestId === requestSequence.current) console.error("Gagal memuat STR masuk:", error);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [classificationFilter, deadlineSortOrder, debouncedSearch, page, periodFrom, periodTo, rowsPerPage]);

  useEffect(() => {
    void fetchDirectives();
  }, [fetchDirectives]);

  const totalPages = Math.max(1, Math.ceil(totalDirectives / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginatedDirectives = currentDirectives;

  const pageNumbers = useMemo(() => {
    const pages = new Set([1, totalPages, safePage, safePage - 1, safePage + 1]);
    return Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);
  }, [safePage, totalPages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-2xl tracking-tight">STR Masuk dan Penerusan Regional</h1>
        <p className="text-muted-foreground text-sm">
          Komandan Regional menerima STR dari Deputi II, lalu meneruskan STR yang sama ke rantai komando di bawahnya
          dengan penajaman arahan regional.
        </p>
      </div>

      <Card className="border border-border/70 bg-card/60">
        <CardContent className="space-y-4 p-4">
          <div className="grid items-end gap-3 md:grid-cols-4">
            <div className="grid gap-1.5">
              <Label htmlFor="search-str" className="font-semibold text-muted-foreground text-xs">
                Cari STR
              </Label>
              <Input
                id="search-str"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Nomor, judul, pemberi..."
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-class" className="font-semibold text-muted-foreground text-xs">
                Klasifikasi
              </Label>
              <Select
                value={classificationFilter}
                onValueChange={(val) => {
                  setClassificationFilter(val);
                  setPage(1);
                }}
              >
                <SelectTrigger id="filter-class" className="h-9">
                  <SelectValue placeholder="Semua Klasifikasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Klasifikasi</SelectItem>
                  {CLASSIFICATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      <span className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(opt)}`}>
                        {formatClassificationLabel(opt)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="period-from" className="font-semibold text-muted-foreground text-xs">
                Periode dari
              </Label>
              <Input
                id="period-from"
                type="date"
                value={periodFrom}
                onChange={(e) => {
                  setPeriodFrom(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="period-to" className="font-semibold text-muted-foreground text-xs">
                Periode sampai
              </Label>
              <Input
                id="period-to"
                type="date"
                value={periodTo}
                onChange={(e) => {
                  setPeriodTo(e.target.value);
                  setPage(1);
                }}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border border-border/70">
        <CardHeader className="border-[var(--dc-border-subtle)]/70 border-b bg-muted/10 pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>STR Diterima dari Deputi II</CardTitle>
              <CardDescription>
                Pilih STR yang sudah masuk untuk dibaca, lalu lanjutkan sebagai penerusan regional tanpa membuat STR
                akar baru.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold font-mono text-[10px] text-muted-foreground uppercase tracking-[0.28em]">
                Tampilan
              </span>
              <ViewModeToggle
                value={viewMode}
                onValueChange={setViewMode}
                className="rounded-[6px] border-border bg-secondary/70"
                buttonClassName="size-8 rounded-[4px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === "table" ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Nomor STR</TableHead>
                  <TableHead>Judul UUK/STR</TableHead>
                  <TableHead>Klasifikasi</TableHead>
                  <TableHead>Pemberi</TableHead>
                  <SortableTableHeader
                    column="effectiveDeadline"
                    sortDirection={deadlineSortOrder}
                    onSortChange={(direction) => {
                      setDeadlineSortOrder(direction);
                      setPage(1);
                    }}
                  >
                    Deadline
                  </SortableTableHeader>
                  <TableHead>Status Penerusan</TableHead>
                  <TableHead className="pr-5 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Memuat STR masuk...
                    </TableCell>
                  </TableRow>
                ) : paginatedDirectives.length ? (
                  paginatedDirectives.map((directive) => {
                    const currentVersion =
                      directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber) ??
                      directive.versions[0];
                    const relatedUuk = uukByDirectiveVersionId.get(currentVersion?.id ?? "");
                    const parsedTitle = parseDirectiveCommandDescription(currentVersion?.commandDescription);

                    return (
                      <TableRow key={directive.id}>
                        <TableCell className="pl-5 font-medium">{directive.commandNumber}</TableCell>
                        <TableCell className="max-w-[34rem]">
                          <div className="truncate" title={parsedTitle.uukTitle ?? "STR Deputi II"}>
                            {parsedTitle.uukTitle ?? "STR Deputi II"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={classificationBadgeClass(currentVersion?.classification)}>
                            {currentVersion?.classification ?? "RAHASIA"}
                          </Badge>
                        </TableCell>
                        <TableCell>{currentVersion?.commandIssuer ?? directive.ownerUnit?.name ?? "-"}</TableCell>
                        <TableCell>{formatDate(currentVersion?.dueDate ?? currentVersion?.commandDate)}</TableCell>
                        <TableCell>
                          {relatedUuk ? (
                            <Badge
                              variant={badgeVariant(relatedUuk.status)}
                              className={
                                relatedUuk.status === "PUBLISHED"
                                  ? "border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 text-[var(--dc-success)]"
                                  : ""
                              }
                            >
                              {statusLabel(relatedUuk.status)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Belum diteruskan</Badge>
                          )}
                        </TableCell>
                        <TableCell className="pr-5">
                          <div className="flex justify-end gap-2">
                            {relatedUuk ? (
                              <Button asChild size="sm">
                                <Link
                                  href={`/dashboard/regional-commander/direktif-penjabaran-uuk-str/${relatedUuk.id}`}
                                >
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
                    <TableCell colSpan={7} className="py-8 pr-5 pl-5 text-center text-muted-foreground">
                      Belum ada STR yang masuk atau cocok dengan filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : paginatedDirectives.length ? (
            <div className="grid gap-3 border-border/60 border-t p-4 lg:grid-cols-2">
              {paginatedDirectives.map((directive) => {
                const currentVersion =
                  directive.versions.find((item) => item.versionNumber === directive.currentVersionNumber) ??
                  directive.versions[0];
                const relatedUuk = uukByDirectiveVersionId.get(currentVersion?.id ?? "");
                const parsedTitle = parseDirectiveCommandDescription(currentVersion?.commandDescription);

                return (
                  <Card key={directive.id} className="border-border/70 bg-card/70">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={classificationBadgeClass(currentVersion?.classification)}>
                          {currentVersion?.classification ?? "RAHASIA"}
                        </Badge>
                        {relatedUuk ? (
                          <Badge
                            variant={badgeVariant(relatedUuk.status)}
                            className={
                              relatedUuk.status === "PUBLISHED"
                                ? "border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 text-[var(--dc-success)]"
                                : ""
                            }
                          >
                            {statusLabel(relatedUuk.status)}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Belum diteruskan</Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="font-mono text-muted-foreground text-[10px] uppercase tracking-[0.18em]">
                          {directive.commandNumber}
                        </p>
                        <h3 className="font-semibold text-[var(--dc-text-primary)] leading-snug">
                          {parsedTitle.uukTitle ?? "STR Deputi II"}
                        </h3>
                      </div>
                      <div className="grid gap-2 border-border/50 border-t pt-3 text-muted-foreground text-xs sm:grid-cols-2">
                        <span>Pemberi: {currentVersion?.commandIssuer ?? directive.ownerUnit?.name ?? "-"}</span>
                        <span>Deadline: {formatDate(currentVersion?.dueDate ?? currentVersion?.commandDate)}</span>
                      </div>
                      <div className="flex justify-end">
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
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="border-border/60 border-t py-8 text-center text-muted-foreground">
              Belum ada STR yang masuk atau cocok dengan filter.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-[var(--dc-border-subtle)]/70 border-t bg-muted/5 p-3">
            <div className="pl-5 text-muted-foreground text-xs">
              Menampilkan {totalDirectives ? (safePage - 1) * rowsPerPage + 1 : 0}-
              {Math.min(safePage * rowsPerPage, totalDirectives)} dari {totalDirectives} target.
            </div>
            <div className="flex items-center gap-4 pr-5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Baris</span>
                <Select
                  value={String(rowsPerPage)}
                  onValueChange={(value) => {
                    setRowsPerPage(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 20, 50].map((val) => (
                      <SelectItem key={val} value={String(val)}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex select-none items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="h-8 text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
                >
                  &lt; Sebelumnya
                </Button>
                {pageNumbers.map((p) => (
                  <Button
                    key={p}
                    type="button"
                    variant={p === safePage ? "outline" : "ghost"}
                    onClick={() => setPage(p)}
                    className="size-8 p-0 text-xs"
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="h-8 text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
                >
                  Berikutnya &gt;
                </Button>
              </div>
            </div>
          </div>
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
  const [directiveVersionId] = useState(initialDirectiveVersionId ?? directives[0]?.versions?.[0]?.id ?? "");
  useDirectiveMarkRead(initialDirectiveVersionId ? directiveVersionId : null);
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
      dueDate: selectedDirective.version.dueDate,
      ownerUnitName: selectedDirective.directive.ownerUnit?.name ?? "-",
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
          Komandan Regional hanya membaca STR dari Deputi II lalu meneruskannya ke OIM dalam rantai komando yang sama,
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
                Baca STR yang diterima, lalu teruskan tanpa perubahan sampai ke tahap OIM.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4">
            <div className="space-y-2 text-sm">
              <span>STR Sumber</span>
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3 font-medium">
                {selectedDirective
                  ? `${selectedDirective.directive.commandNumber} - ${
                      selectedDirective.version.commandIssuer || selectedDirective.directive.ownerUnit?.name || "-"
                    }`
                  : "STR sumber tidak ditemukan"}
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
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Batas Waktu</div>
                  <div className="mt-2 font-medium">{formatDate(sourceDirectiveContent.dueDate)}</div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="text-muted-foreground text-xs uppercase tracking-wide">Unit Sumber</div>
                  <div className="mt-2 font-medium">{normalizeDisplayText(sourceDirectiveContent.ownerUnitName)}</div>
                </div>
              </div>

              <Alert className="border-border/70 bg-muted/20">
                <FileText className="size-4" />
                <AlertTitle>{normalizeDisplayText(sourceDirectiveContent.uukTitle || "STR Deputi II")}</AlertTitle>
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
            <AlertTitle>Tidak ada perubahan isi di level Komandan Regional</AlertTitle>
            <AlertDescription>
              Setelah STR diterbitkan dari Deputi II, tindakan Komandan Regional hanya membaca lalu meneruskan. Isi STR
              tetap sama sampai dipakai OIM sebagai dasar tindak lanjut operasional.
            </AlertDescription>
          </Alert>

          <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="success" type="button" disabled={!selectedDirective || isSaving}>
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
  const [_openSection, _setOpenSection] = useState(firstSectionType);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const isActionDisabled = action !== null;
  useDirectiveMarkRead(uuk.directiveVersion?.id);

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

  const classification = uuk.directiveVersion?.classification ?? "RAHASIA";
  const commandNumber = uuk.directiveVersion?.directive?.commandNumber ?? "-";
  const ownerUnitName = uuk.ownerUnit?.name ?? "unit regional";
  const currentVersionCreatedAt = currentVersion?.createdAt ?? null;

  return (
    <div className="relative mx-auto w-full max-w-[1400px] space-y-4 pb-14">
      <PageHeader
        title={currentVersion?.title ?? "Penerusan Regional"}
        backButton={true}
        badge={
          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="rounded-[4px] border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dc-success)] uppercase tracking-wider"
            >
              {statusLabel(uuk.status)}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-[4px] border-[var(--dc-warning)]/40 bg-[var(--dc-warning-soft)]/10 px-2 py-0.5 font-mono text-[10px] text-[var(--dc-warning)] uppercase tracking-wider"
            >
              NORMAL
            </Badge>
            <Badge variant="outline" className={classificationBadgeClass(classification)}>
              {classification}
            </Badge>
          </div>
        }
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-white/[0.08] border-b pb-3 font-mono text-muted-foreground text-xs">
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
            TANGGAL: <span className="text-[var(--dc-text-primary)]">{formatDate(currentVersionCreatedAt)}</span>
          </span>
        </div>
      </div>

      {/* 2. Alert Info Banner */}
      <div className="flex items-start gap-2.5 rounded-[6px] border border-white/[0.06] bg-white/[0.02] p-2.5 text-muted-foreground text-xs leading-normal">
        <Lock className="mt-0.5 size-4 shrink-0 text-[var(--dc-primary)]" />
        <div>
          <span className="font-bold text-[var(--dc-text-primary)]">Isi STR terkunci di level regional.</span> Komandan
          Regional tidak melakukan edit atau revisi isi. Halaman ini hanya menjadi bukti bahwa STR sudah diteruskan
          dalam rantai komando yang sama.
        </div>
      </div>

      {/* 3. Operational Metadata Row */}
      <div className="grid grid-cols-2 gap-3 rounded-[6px] border border-white/[0.04] bg-white/[0.02] p-3 font-mono text-xs md:grid-cols-4">
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Regional Pengirim</span>
          <div className="font-bold text-[var(--dc-text-primary)]">{uuk.ownerUnit?.name ?? "-"}</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Versi</span>
          <div className="font-bold text-[var(--dc-text-primary)]">{uuk.currentVersionNumber}</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Tugas Turunan</span>
          <div className="font-bold text-[var(--dc-text-primary)]">{currentVersion?.tasks?.length ?? 0}</div>
        </div>
        <div className="space-y-0.5">
          <span className="text-[9px] text-muted-foreground/60 uppercase">Jumlah Bagian</span>
          <div className="font-bold text-[var(--dc-text-primary)]">{currentVersion?.sections?.length ?? 0}</div>
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
                  {uuk.directiveVersion?.directive?.ownerUnit?.name ?? "Deputi II"}
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
                Isi STR terkunci sepenuhnya di level Komandan Regional guna menjaga integritas informasi operasional
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
                            <div className="whitespace-pre-wrap rounded-[4px] bg-white/[0.025] px-3 py-2.5 text-muted-foreground/80 leading-relaxed">
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
                              className="flex h-auto items-center gap-1 p-0 font-mono text-[var(--dc-primary)] hover:underline"
                            >
                              Tampilkan Isi Lengkap <ChevronDown className="size-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="whitespace-pre-wrap rounded-[4px] bg-white/[0.025] px-3 py-2.5 text-muted-foreground/80 leading-relaxed">
                              <span className="font-bold text-[var(--dc-text-primary)]">Ringkasan Bab: </span>
                              {previewText}
                            </div>

                            {/* Detailed Points */}
                            <div className="space-y-3 border-white/[0.08] border-t pt-3">
                              <div className="font-mono text-[9px] text-muted-foreground/60 uppercase tracking-wider">
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
                              className="flex h-auto items-center gap-1 p-0 font-mono text-[var(--dc-primary)] hover:underline"
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
            <div className="border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              RINGKASAN MISI
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">STATUS:</span>
                <Badge
                  variant={badgeVariant(uuk.status)}
                  className={
                    uuk.status === "PUBLISHED"
                      ? "border-[var(--dc-success)]/40 bg-[var(--dc-success-soft)]/10 text-[var(--dc-success)]"
                      : ""
                  }
                >
                  {statusLabel(uuk.status)}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">KLASIFIKASI:</span>
                <span className="font-bold text-[var(--dc-danger)]">{classification}</span>
              </div>
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">PRIORITAS:</span>
                <span className="font-bold text-[var(--dc-warning)]">NORMAL</span>
              </div>
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">HIRARKI:</span>
                <span className="font-bold text-[var(--dc-text-primary)]">EKSEKUTIF -&gt; REGIONAL</span>
              </div>
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">PEMILIK REGIONAL:</span>
                <span
                  className="max-w-[120px] truncate font-bold text-[var(--dc-text-primary)]"
                  title={uuk.ownerUnit?.name ?? "-"}
                >
                  {uuk.ownerUnit?.name ?? "-"}
                </span>
              </div>
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">TANGGAL:</span>
                <span className="text-muted-foreground/80">{formatDate(currentVersionCreatedAt)}</span>
              </div>
              <div className="flex items-center justify-between border-white/[0.04] border-b py-0.5">
                <span className="text-muted-foreground/60">TUGAS TURUNAN:</span>
                <span className="font-bold text-[var(--dc-text-primary)]">{currentVersion?.tasks?.length ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-2 rounded-[6px] border border-white/[0.08] bg-[var(--dc-card)] p-3 shadow-sm">
            <div className="border-white/[0.08] border-b pb-2 font-mono text-[9px] text-muted-foreground/50 uppercase tracking-wider">
              NAVIGASI CEPAT
            </div>
            <div className="space-y-1 font-mono text-xs">
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
                    className="group flex items-center gap-2 py-1 text-muted-foreground transition-colors hover:text-[var(--dc-primary)]"
                  >
                    <span className="shrink-0 text-muted-foreground/60 transition-all group-hover:scale-110 group-hover:text-[var(--dc-primary)]">
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
        <div className="font-mono text-muted-foreground text-xs">
          STATUS: <span className="font-bold text-[var(--dc-primary)]">{statusLabel(uuk.status)}</span>
          <span className="ml-2 text-muted-foreground/60">
            | VERSI: {uuk.currentVersionNumber} | TURUNAN: {currentVersion?.tasks?.length ?? 0} TUGAS
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
                    Apakah Anda yakin ingin membatalkan penerusan STR ini?
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
                  <AlertDialogAction
                    variant="success"
                    disabled={isActionDisabled}
                    onClick={() => triggerAction("publish")}
                  >
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
