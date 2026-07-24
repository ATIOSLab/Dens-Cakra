"use client";

import { useMemo, useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CheckCircle2, ChevronLeft, FileText, Grid2X2, List, Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { SortableTableHeader } from "@/app/(main)/dashboard/_components/sortable-table-header";
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
import { BackButton } from "@/components/ui/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { classificationBadgeClass, isClassification } from "@/lib/classification";
import { cn } from "@/lib/utils";

type DataRecord = Record<string, unknown>;

function record(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as DataRecord) : {};
}

function rows(value: unknown): DataRecord[] {
  if (Array.isArray(value)) return value.map(record);
  const items = record(value).items;
  return Array.isArray(items) ? items.map(record) : [];
}

function text(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function administrativeAreaLabel(value: unknown) {
  const names: string[] = [];
  let area = record(value);

  while (names.length < 4) {
    const name = text(area.name, "");
    if (!name || name === "Indonesia") break;
    names.push(name);
    area = record(area.parent);
  }

  return names.length > 0 ? names.join(", ") : "Wilayah belum terpetakan";
}

function fieldOfficerUserName(value: unknown) {
  const assignment = record(value);
  const profile = record(assignment.userProfile);
  const authUser = record(profile.authUser);
  return text(profile.fullName, text(authUser.name, text(profile.username, "User pengirim tidak teridentifikasi")));
}

function currentVersion(product: DataRecord) {
  return rows(product.versions)[0] ?? record(product.currentVersion);
}

function statusLabel(value: unknown) {
  if (value === "VALIDATED") return "FINAL";
  const strVal = typeof value === "string" ? value : "";
  switch (strVal) {
    case "DISTRIBUTED":
      return "DIDISTRIBUSIKAN";
    case "UNDER_REGIONAL_REVIEW":
      return "DALAM TINJAUAN REGIONAL";
    case "DRAFT":
      return "DRAF";
    case "NEEDS_REVISION":
      return "BUTUH REVISI";
    case "REJECTED":
      return "DITOLAK";
    case "APPROVED":
      return "DISETUJUI";
    case "PENDING":
      return "MENUNGGU";
    case "PERLU_KEPUTUSAN_REGIONAL":
      return "PERLU KEPUTUSAN REGIONAL";
    default:
      return text(value, "BELUM ADA").replaceAll("_", " ");
  }
}

function StatusBadge({ value }: { value: unknown }) {
  const status = text(value, "");

  if (isClassification(status)) {
    return (
      <Badge variant="outline" className={classificationBadgeClass(status)}>
        {statusLabel(value)}
      </Badge>
    );
  }

  const approved = status.startsWith("APPROVED") || status === "VALIDATED";
  const rejected = status === "REJECTED" || status === "NEEDS_REVISION";
  return <Badge variant={rejected ? "destructive" : approved ? "default" : "secondary"}>{statusLabel(value)}</Badge>;
}

function approvalProduct(step: DataRecord) {
  return record(record(record(step.workflow).productVersion).product);
}

const ALL_VALUE = "__all__";
const CLASSIFICATION_OPTIONS = ["BIASA", "TERBATAS", "RAHASIA", "SANGAT_RAHASIA"] as const;

type ProductViewMode = "card" | "table";

function dateInputValue(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function productTypeLabel(product: DataRecord) {
  const productType = record(product.productType);
  return text(productType.name, text(productType.code, "Laporan Intelijen"));
}

function ownerUnitLabel(product: DataRecord) {
  const ownerUnit = record(product.ownerUnit);
  return text(ownerUnit.name, "Unit belum terpetakan");
}

function uniqueOptions(items: DataRecord[], getOption: (item: DataRecord) => { value: string; label: string }) {
  const options = new Map<string, string>();
  for (const item of items) {
    const option = getOption(item);
    if (option.value && !options.has(option.value)) options.set(option.value, option.label);
  }
  return [...options.entries()].map(([value, label]) => ({ value, label }));
}

function paginationNumbers(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
}

function ProductBrowser({
  items,
  basePath,
  approvalSteps = [],
}: {
  items: DataRecord[];
  basePath: string;
  approvalSteps?: DataRecord[];
}) {
  const [viewMode, setViewMode] = useState<ProductViewMode>("card");
  const [search, setSearch] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [productTypeId, setProductTypeId] = useState(ALL_VALUE);
  const [classification, setClassification] = useState(ALL_VALUE);
  const [ownerUnitId, setOwnerUnitId] = useState(ALL_VALUE);
  const [decisionFilter, setDecisionFilter] = useState(approvalSteps && approvalSteps.length > 0 ? "approval" : "all");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(1);

  const productTypeOptions = useMemo(
    () =>
      uniqueOptions(items, (product) => {
        const productType = record(product.productType);
        return { value: text(product.productTypeId, text(productType.id, "")), label: productTypeLabel(product) };
      }),
    [items],
  );
  const classificationOptions = CLASSIFICATION_OPTIONS.map((value) => ({ value, label: statusLabel(value) }));
  const selectedClassification = classificationOptions.find((option) => option.value === classification);
  const unitOptions = useMemo(
    () =>
      uniqueOptions(items, (product) => {
        const ownerUnit = record(product.ownerUnit);
        return { value: text(product.ownerUnitId, text(ownerUnit.id, "")), label: ownerUnitLabel(product) };
      }),
    [items],
  );

  const updateFilter = (callback: () => void) => {
    callback();
    setPage(1);
  };

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const fromTime = periodFrom ? new Date(`${periodFrom}T00:00:00.000Z`).getTime() : null;
    const toTime = periodTo ? new Date(`${periodTo}T23:59:59.999Z`).getTime() : null;

    return items.filter((product) => {
      const haystack = [
        product.title,
        product.productNumber,
        productTypeLabel(product),
        ownerUnitLabel(product),
        product.status,
        product.classification,
      ]
        .map((value) => text(value, "").toLowerCase())
        .join(" ");
      if (normalizedSearch && !haystack.includes(normalizedSearch)) return false;

      if (
        productTypeId !== ALL_VALUE &&
        text(product.productTypeId, text(record(product.productType).id, "")) !== productTypeId
      ) {
        return false;
      }
      if (classification !== ALL_VALUE && text(product.classification, "") !== classification) return false;
      if (
        ownerUnitId !== ALL_VALUE &&
        text(product.ownerUnitId, text(record(product.ownerUnit).id, "")) !== ownerUnitId
      ) {
        return false;
      }

      if (approvalSteps && decisionFilter === "approval") {
        const hasApproval = approvalSteps.some((step) => text(approvalProduct(step).id, "") === text(product.id, ""));
        if (!hasApproval) return false;
      }

      const start = dateInputValue(product.periodStart);
      const end = dateInputValue(product.periodEnd) || start;
      const startTime = start ? new Date(`${start}T00:00:00.000Z`).getTime() : null;
      const endTime = end ? new Date(`${end}T23:59:59.999Z`).getTime() : startTime;
      if (fromTime !== null && endTime !== null && endTime < fromTime) return false;
      if (toTime !== null && startTime !== null && startTime > toTime) return false;

      return true;
    });
  }, [classification, items, ownerUnitId, periodFrom, periodTo, productTypeId, search, decisionFilter, approvalSteps]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);
  const startRow = filteredItems.length ? (safePage - 1) * rowsPerPage + 1 : 0;
  const endRow = Math.min(safePage * rowsPerPage, filteredItems.length);

  const renderAction = (product: DataRecord) => {
    const approvalStep = approvalSteps.find((step) => text(approvalProduct(step).id, "") === text(product.id, ""));
    const detailHref = approvalStep
      ? `${basePath}/${text(product.id)}?approvalStepId=${text(approvalStep.id)}`
      : `${basePath}/${text(product.id)}`;
    return (
      <Button asChild variant={approvalStep ? "default" : "outline"}>
        <Link href={detailHref}>{approvalStep ? "Tinjau & Putuskan" : "Buka produk"}</Link>
      </Button>
    );
  };

  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-muted-foreground text-sm">
          Belum ada Produk Intelijen pada tahap ini.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-2">
              <Label htmlFor="product-search">Cari produk</Label>
              <Input
                id="product-search"
                value={search}
                onChange={(event) => updateFilter(() => setSearch(event.target.value))}
                placeholder="Judul, nomor, jenis laporan, unit..."
                className="min-w-72"
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.14em]">
                Tampilan
              </Label>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value as ProductViewMode)}
                className="flex items-center gap-1 rounded-xl border border-border/80 bg-slate-100/50 p-1 dark:bg-slate-900/40"
                aria-label="Mode tampilan produk"
              >
                <ToggleGroupItem
                  value="card"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 text-muted-foreground transition-all duration-200 hover:bg-muted/40 hover:text-foreground data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=on]:hover:bg-blue-600 data-[state=on]:hover:text-white dark:data-[state=on]:bg-blue-600 dark:data-[state=on]:text-white"
                  aria-label="Tampilkan sebagai card"
                >
                  <Grid2X2 className="size-4" />
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="table"
                  className="flex size-8 cursor-pointer items-center justify-center rounded-lg border-0 text-muted-foreground transition-all duration-200 hover:bg-muted/40 hover:text-foreground data-[state=on]:bg-blue-600 data-[state=on]:text-white data-[state=on]:hover:bg-blue-600 data-[state=on]:hover:text-white dark:data-[state=on]:bg-blue-600 dark:data-[state=on]:text-white"
                  aria-label="Tampilkan sebagai tabel"
                >
                  <List className="size-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
              approvalSteps && approvalSteps.length > 0 ? "2xl:grid-cols-6" : "2xl:grid-cols-5",
            )}
          >
            <div className="grid gap-2">
              <Label htmlFor="period-from">Periode dari</Label>
              <Input
                id="period-from"
                type="date"
                value={periodFrom}
                onChange={(event) => updateFilter(() => setPeriodFrom(event.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="period-to">Periode sampai</Label>
              <Input
                id="period-to"
                type="date"
                value={periodTo}
                onChange={(event) => updateFilter(() => setPeriodTo(event.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Jenis laporan</Label>
              <Select value={productTypeId} onValueChange={(value) => updateFilter(() => setProductTypeId(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL_VALUE}>Semua jenis laporan</SelectItem>
                  {productTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Klasifikasi</Label>
              <Select value={classification} onValueChange={(value) => updateFilter(() => setClassification(value))}>
                <SelectTrigger className="w-full">
                  {classification !== ALL_VALUE && selectedClassification ? (
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(
                        selectedClassification.value,
                      )}`}
                    >
                      {selectedClassification.label}
                    </span>
                  ) : (
                    <SelectValue />
                  )}
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL_VALUE}>Semua klasifikasi</SelectItem>
                  {classificationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={`inline-flex rounded-md px-2 py-0.5 ${classificationBadgeClass(option.value)}`}>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Unit</Label>
              <Select value={ownerUnitId} onValueChange={(value) => updateFilter(() => setOwnerUnitId(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value={ALL_VALUE}>Semua unit</SelectItem>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {approvalSteps && approvalSteps.length > 0 && (
              <div className="grid gap-2">
                <Label>Status Keputusan</Label>
                <Select value={decisionFilter} onValueChange={(value) => updateFilter(() => setDecisionFilter(value))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="all">Semua Produk ({items.length})</SelectItem>
                    <SelectItem value="approval">Perlu Keputusan ({approvalSteps.length})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {pageItems.length ? (
        viewMode === "card" ? (
          <div className="grid gap-3">
            {pageItems.map((product) => {
              const approvalStep = approvalSteps?.find(
                (step) => text(approvalProduct(step).id, "") === text(product.id, ""),
              );
              return (
                <Card key={text(product.id)} size="sm">
                  <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge value={product.classification} />
                          <StatusBadge value={product.status} />
                          {approvalStep ? (
                            <Badge variant="outline" className="border-sky-500/30 bg-sky-500/5 text-sky-500">
                              Perlu keputusan regional
                            </Badge>
                          ) : null}
                        </div>
                        <h2 className="mt-2 font-medium">{text(product.title, "Laporan Intelijen")}</h2>
                        <p className="mt-1 font-mono text-muted-foreground text-xs">
                          {text(product.productNumber, "Nomor otomatis")} - {productTypeLabel(product)}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5 font-medium text-muted-foreground/80 text-xs">
                          <span className="size-1.5 rounded-full bg-blue-500" />
                          <span>Unit Pengirim: {ownerUnitLabel(product)}</span>
                        </div>
                      </div>
                    </div>
                    {renderAction(product)}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Judul produk</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Klasifikasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Unit</TableHead>
                    <SortableTableHeader column="periodStart">Periode</SortableTableHeader>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((product) => (
                    <TableRow key={text(product.id)}>
                      <TableCell className="font-mono text-xs">{text(product.productNumber, "-")}</TableCell>
                      <TableCell className="min-w-72 font-medium">{text(product.title, "Laporan Intelijen")}</TableCell>
                      <TableCell>{productTypeLabel(product)}</TableCell>
                      <TableCell>
                        <StatusBadge value={product.classification} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge value={product.status} />
                      </TableCell>
                      <TableCell className="min-w-56">{ownerUnitLabel(product)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                        {dateInputValue(product.periodStart) || "-"} s.d. {dateInputValue(product.periodEnd) || "-"}
                      </TableCell>
                      <TableCell className="text-right">{renderAction(product)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-14 text-center text-muted-foreground text-sm">
            Tidak ada produk yang cocok dengan filter.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground text-sm">
            Menampilkan{" "}
            <span className="font-semibold text-foreground">
              {startRow}-{endRow}
            </span>{" "}
            dari <span className="font-semibold text-foreground">{filteredItems.length}</span> produk.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground text-sm">Baris</Label>
              <Select
                value={String(rowsPerPage)}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} baris
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                Previous
              </Button>
              {paginationNumbers(safePage, totalPages).map((pageNumber) => (
                <Button
                  key={pageNumber}
                  variant={pageNumber === safePage ? "default" : "outline"}
                  size="icon"
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                </Button>
              ))}
              <Button
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function _ProductRows({
  items,
  basePath,
  approvalSteps = [],
}: {
  items: DataRecord[];
  basePath: string;
  approvalSteps?: DataRecord[];
}) {
  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-muted-foreground text-sm">
          Belum ada Produk Intelijen pada tahap ini.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3">
      {items.map((product) => {
        const approvalStep = approvalSteps.find((step) => text(approvalProduct(step).id, "") === text(product.id, ""));
        const detailHref = approvalStep
          ? `${basePath}/${text(product.id)}?approvalStepId=${text(approvalStep.id)}`
          : `${basePath}/${text(product.id)}`;
        return (
          <Card key={text(product.id)} size="sm">
            <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={product.classification} />
                    <StatusBadge value={product.status} />
                    {approvalStep ? <Badge variant="outline">Perlu keputusan regional</Badge> : null}
                  </div>
                  <h2 className="mt-2 font-medium">{text(product.title, "Laporan Intelijen")}</h2>
                  <p className="mt-1 font-mono text-muted-foreground text-xs">
                    {text(product.productNumber, "Nomor otomatis")} · Laporan Intelijen
                  </p>
                </div>
              </div>
              <Button asChild variant={approvalStep ? "default" : "outline"}>
                <Link href={detailHref}>{approvalStep ? "Tinjau & Putuskan" : "Buka produk"}</Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function IntelligenceProductList({
  data,
  title,
  description,
  basePath,
  approvalData,
}: {
  data: unknown;
  title: string;
  description: string;
  basePath: string;
  approvalData?: unknown;
}) {
  const products = rows(data);
  const approvalSteps = rows(approvalData);
  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="border-b pb-5">
        <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.18em]">Produk Intelijen</p>
        <h1 className="mt-1 font-heading font-semibold text-2xl">{title}</h1>
        <p className="mt-1 text-muted-foreground text-sm">{description}</p>
      </div>
      <ProductBrowser
        items={products}
        basePath={basePath}
        approvalSteps={approvalData !== undefined ? approvalSteps : undefined}
      />
    </main>
  );
}

function _ApprovalQueue({ steps, basePath }: { steps: DataRecord[]; basePath: string }) {
  return (
    <div>
      {steps.length ? (
        <div className="grid gap-3">
          {steps.map((step) => {
            const product = approvalProduct(step);
            return (
              <Card key={text(step.id)} size="sm">
                <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={step.status} />
                      <StatusBadge value={product.classification} />
                    </div>
                    <h2 className="mt-2 font-medium">{text(product.title, "Laporan Intelijen")}</h2>
                    <p className="mt-1 font-mono text-muted-foreground text-xs">
                      {text(product.productNumber, "Nomor produk")}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`${basePath}/${text(product.id)}?approvalStepId=${text(step.id)}`}>
                      Tinjau & Putuskan
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-14 text-center">
            <CheckCircle2 className="mx-auto size-8 text-primary" />
            <h2 className="mt-3 font-medium">Tidak ada produk menunggu keputusan</h2>
            <p className="mt-1 text-muted-foreground text-sm">Inbox approval regional sudah bersih.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type JournalItem = {
  no: string;
  issue: string;
  area: string;
  material: string;
};

function journalItems(version: DataRecord): JournalItem[] {
  return rows(record(version.content).ITEMS).map((item, index) => ({
    no: String(item.NO_URUT ?? index + 1),
    issue: text(item.PERMASALAHAN_AGENDA),
    area: text(item.DAERAH_KEJADIAN, "Wilayah belum terpetakan"),
    material: text(item.MATERI_SUMBER),
  }));
}

function JournalTable({ items }: { items: JournalItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr>
            <th className="w-14 border border-current p-2 text-center">No Urut</th>
            <th className="border border-current p-2 text-center">Permasalahan dan Agenda</th>
            <th className="w-36 border border-current p-2 text-center">Daerah Kejadian</th>
            <th className="border border-current p-2 text-center">Materi Informasi dan Sumber</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={`${item.no}-${item.issue}`}>
              <td className="border border-current p-2 text-center align-top">{item.no}</td>
              <td className="border border-current p-2 align-top">{item.issue}</td>
              <td className="border border-current p-2 align-top">{item.area}</td>
              <td className="whitespace-pre-wrap border border-current p-2 align-top">{item.material}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductDocument({ product }: { product: DataRecord }) {
  const version = currentVersion(product);
  const items = journalItems(version);
  return (
    <article className="min-h-[760px] bg-white p-8 text-black shadow-sm print:fixed print:inset-0 print:z-50 print:min-h-screen print:w-full print:p-10">
      <p className="text-center font-bold text-xs">{statusLabel(product.classification)}</p>
      <div className="mt-10 font-bold text-xs">
        BADAN INTELIJEN NEGARA
        <br />
        UNIT KERJA OPERASIONAL
      </div>
      <h2 className="mt-12 text-center font-bold text-sm uppercase underline">LAPORAN INTELIJEN</h2>
      <p className="mt-2 text-center font-mono text-xs">Nomor: {text(product.productNumber)}</p>
      <h3 className="mt-8 text-center font-bold">{text(product.title, "Laporan Intelijen")}</h3>
      <div className="mt-8">
        <JournalTable items={items} />
      </div>
      <p className="mt-14 text-right text-xs">Autentikasi: persetujuan Regional Commander</p>
      <p className="mt-16 text-center font-bold text-xs">{statusLabel(product.classification)}</p>
    </article>
  );
}

function AnalysisSources({ version }: { version: DataRecord }) {
  const sources = rows(version.sourceAnalyses);
  return (
    <div className="space-y-4">
      {sources.map((source) => {
        const analysisVersion = record(source.analysisVersion);
        const analysisCase = record(analysisVersion.analysisCase);
        return (
          <Card key={text(source.analysisVersionId)} size="sm">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>{text(analysisCase.title, "Analisis final")}</CardTitle>
                <StatusBadge value={analysisCase.status} />
              </div>
              <CardDescription>{rows(analysisCase.sources).length} Baket sumber</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  ["Indikasi", analysisVersion.indications],
                  ["Analisis", analysisVersion.analysis],
                  ["Dampak", analysisVersion.impact],
                  ["Upaya", analysisVersion.efforts],
                  ["Saran Tindak", analysisVersion.recommendations],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <p className="font-medium">{String(label)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{text(value)}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 font-medium text-sm">Baket terkait</h3>
                <div className="grid gap-2">
                  {rows(analysisCase.sources).map((analysisSource, index) => {
                    const verification = record(analysisSource.verification);
                    const baketVersion = record(verification.baketVersion);
                    const baket = record(baketVersion.baket);
                    const assignment = record(baket.createdByFieldOfficerAssignment);
                    const area = record(baketVersion.eventArea);
                    return (
                      <div key={text(analysisSource.verificationId, String(index))} className="rounded-lg border p-3">
                        <p className="font-medium text-sm">
                          {index + 1}. {text(baketVersion.title, "Baket")}
                        </p>
                        <p className="mt-1 text-muted-foreground text-xs">
                          {administrativeAreaLabel(area)} · {fieldOfficerUserName(assignment)}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm">{text(baketVersion.originalContent)}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ApprovalActions({ step }: { step: DataRecord }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const stepId = text(step.id, "");
  const isActive = step.status === "ACTIVE";

  const decide = (decision: "approve" | "request-revision") =>
    start(async () => {
      try {
        await apiBrowserMutation(
          "POST",
          `/approval-steps/${stepId}/${decision}`,
          decision === "approve"
            ? { note }
            : { note: note || "Perlu perbaikan", requiredChanges: [note || "Perbaiki produk"] },
        );
        toast.success(
          decision === "approve"
            ? "Persetujuan produk intelijen berhasil diproses"
            : "Produk intelijen berhasil dikembalikan untuk revisi",
        );
        router.push("/dashboard/regional-commander/laporan-produk-intelijen");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Keputusan gagal disimpan");
      }
    });

  return (
    <Card className="print:hidden">
      <CardHeader>
        <CardTitle>Keputusan Regional Commander</CardTitle>
        <CardDescription>Approval adalah keputusan final sebelum produk tersedia untuk Executive.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="approval-note">Catatan keputusan</Label>
          <Textarea
            id="approval-note"
            className="mt-2 min-h-28"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={!isActive || pending}
          />
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="success" className="w-full" disabled={!isActive || pending}>
              <ShieldCheck />
              Approve produk
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Setujui Produk Intelijen?</AlertDialogTitle>
              <AlertDialogDescription>Apakah Anda yakin ingin menyetujui produk intelijen ini?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Kembali</AlertDialogCancel>
              <AlertDialogAction variant="success" disabled={pending} onClick={() => decide("approve")}>
                Ya, Setujui
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button className="w-full" variant="warning" disabled={!isActive || pending || !note.trim()}>
              <RotateCcw />
              Kembalikan untuk revisi
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Kembalikan Produk Intelijen?</AlertDialogTitle>
              <AlertDialogDescription>
                Apakah Anda yakin ingin mengembalikan produk intelijen ini untuk direvisi?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Kembali</AlertDialogCancel>
              <AlertDialogAction variant="warning" disabled={pending} onClick={() => decide("request-revision")}>
                Ya, Kembalikan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export function IntelligenceProductDetail({
  product: productValue,
  approvalStep,
  executive = false,
}: {
  product: unknown;
  approvalStep?: unknown;
  executive?: boolean;
}) {
  const router = useRouter();
  const product = record(productValue);
  const version = currentVersion(product);
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
            <BackButton className="print:hidden" />
          <p className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.18em]">
            {executive ? "Executive" : approvalStep ? "Regional Commander" : "Produk Intelijen"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={product.classification} />
            <StatusBadge value={product.status} />
          </div>
          <h1 className="mt-2 font-heading font-semibold text-2xl">{text(product.title, "Laporan Intelijen")}</h1>
          <p className="mt-1 font-mono text-muted-foreground text-xs">{text(product.productNumber)}</p>
        </div>
        <Button className="print:hidden" variant="outline" onClick={() => window.print()}>
          <Printer />
          Cetak / Save as PDF
        </Button>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Tabs defaultValue="document">
          <TabsList className="print:hidden">
            <TabsTrigger value="document">Laporan Intelijen</TabsTrigger>
            <TabsTrigger value="analysis">Analisis & Baket</TabsTrigger>
          </TabsList>
          <TabsContent value="document">
            <ProductDocument product={product} />
          </TabsContent>
          <TabsContent value="analysis" className="print:hidden">
            <AnalysisSources version={version} />
          </TabsContent>
        </Tabs>
        <div className="space-y-4 xl:pt-[44px]">
          {approvalStep ? <ApprovalActions step={record(approvalStep)} /> : null}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Jejak produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-muted-foreground text-sm">
              <p>{rows(version.sourceAnalyses).length} analisis final</p>
              <p>{journalItems(version).length} Baket pada jurnal</p>
              <p>Versi {String(version.versionNumber ?? 1)} · read-only setelah dikirim</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
