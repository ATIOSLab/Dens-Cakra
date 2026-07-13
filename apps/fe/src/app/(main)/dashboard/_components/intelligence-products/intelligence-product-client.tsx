"use client";

import { useState, useTransition } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { CheckCircle2, FileText, Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { apiBrowserMutation } from "@/lib/api/browser-client";

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
  return text(value, "BELUM ADA").replaceAll("_", " ");
}

function StatusBadge({ value }: { value: unknown }) {
  const status = text(value, "");
  const approved = status.startsWith("APPROVED") || status === "VALIDATED";
  const rejected = status === "REJECTED" || status === "NEEDS_REVISION";
  return <Badge variant={rejected ? "destructive" : approved ? "default" : "secondary"}>{statusLabel(value)}</Badge>;
}

function approvalProduct(step: DataRecord) {
  return record(record(record(step.workflow).productVersion).product);
}

function ProductRows({
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
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
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
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {text(product.productNumber, "Nomor otomatis")} · Laporan Intelijen
                  </p>
                </div>
              </div>
              <Button asChild variant={approvalStep ? "default" : "outline"}>
                <Link href={detailHref}>{approvalStep ? "Review & putuskan" : "Buka produk"}</Link>
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Produk Intelijen</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {approvalData === undefined ? (
        <ProductRows items={products} basePath={basePath} />
      ) : (
        <Tabs defaultValue={approvalSteps.length ? "approval" : "all"}>
          <TabsList>
            <TabsTrigger value="approval">Perlu keputusan ({approvalSteps.length})</TabsTrigger>
            <TabsTrigger value="all">Semua produk ({products.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="approval" className="mt-4">
            <ApprovalQueue steps={approvalSteps} basePath={basePath} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <ProductRows items={products} basePath={basePath} approvalSteps={approvalSteps} />
          </TabsContent>
        </Tabs>
      )}
    </main>
  );
}

function ApprovalQueue({ steps, basePath }: { steps: DataRecord[]; basePath: string }) {
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
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {text(product.productNumber, "Nomor produk")}
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`${basePath}/${text(product.id)}?approvalStepId=${text(step.id)}`}>
                      Review & putuskan
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
            <p className="mt-1 text-sm text-muted-foreground">Inbox approval regional sudah bersih.</p>
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
      <p className="text-center text-xs font-bold">{statusLabel(product.classification)}</p>
      <div className="mt-10 text-xs font-bold">
        BADAN INTELIJEN NEGARA
        <br />
        UNIT KERJA OPERASIONAL
      </div>
      <h2 className="mt-12 text-center text-sm font-bold uppercase underline">LAPORAN INTELIJEN</h2>
      <p className="mt-2 text-center font-mono text-xs">Nomor: {text(product.productNumber)}</p>
      <h3 className="mt-8 text-center font-bold">{text(product.title, "Laporan Intelijen")}</h3>
      <div className="mt-8">
        <JournalTable items={items} />
      </div>
      <p className="mt-14 text-right text-xs">Autentikasi: persetujuan Regional Commander</p>
      <p className="mt-16 text-center text-xs font-bold">{statusLabel(product.classification)}</p>
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
                <h3 className="mb-2 text-sm font-medium">Baket terkait</h3>
                <div className="grid gap-2">
                  {rows(analysisCase.sources).map((analysisSource, index) => {
                    const verification = record(analysisSource.verification);
                    const baketVersion = record(verification.baketVersion);
                    const baket = record(baketVersion.baket);
                    const assignment = record(baket.createdByFieldOfficerAssignment);
                    const area = record(baketVersion.eventArea);
                    return (
                      <div key={text(analysisSource.verificationId, String(index))} className="rounded-lg border p-3">
                        <p className="text-sm font-medium">
                          {index + 1}. {text(baketVersion.title, "Baket")}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
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
          decision === "approve" ? "Produk disetujui dan tersedia untuk Executive" : "Produk dikembalikan ke OIM",
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
        <Button className="w-full" disabled={!isActive || pending} onClick={() => decide("approve")}>
          <ShieldCheck />
          Approve produk
        </Button>
        <Button
          className="w-full"
          variant="outline"
          disabled={!isActive || pending || !note.trim()}
          onClick={() => decide("request-revision")}
        >
          <RotateCcw />
          Kembalikan untuk revisi
        </Button>
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
  const product = record(productValue);
  const version = currentVersion(product);
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {executive ? "Executive" : approvalStep ? "Regional Commander" : "Produk Intelijen"}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge value={product.classification} />
            <StatusBadge value={product.status} />
          </div>
          <h1 className="mt-2 font-heading text-2xl font-semibold">{text(product.title, "Laporan Intelijen")}</h1>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{text(product.productNumber)}</p>
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
        <div className="space-y-4">
          {approvalStep ? <ApprovalActions step={record(approvalStep)} /> : null}
          <Card className="print:hidden">
            <CardHeader>
              <CardTitle>Jejak produk</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
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
