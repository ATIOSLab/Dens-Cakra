"use client";

import { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiBrowserMutation } from "@/lib/api/browser-client";
import { parseDirectiveCommandDescription } from "@/features/directives/structured-uuk";
import type { DirectiveDetail } from "@/features/directives/types";

import { badgeVariant, formatDate, getCurrentVersion, renderRecipientLabel } from "./directive-shared";

type DirectiveDetailClientProps = {
  directive: DirectiveDetail;
};

export function DirectiveDetailClient({ directive }: DirectiveDetailClientProps) {
  const router = useRouter();
  const currentVersion = getCurrentVersion(directive);
  const [isSubmitting, setIsSubmitting] = useState<"publish" | "distribute" | "cancel" | null>(null);
  const parsedDescription = parseDirectiveCommandDescription(currentVersion?.commandDescription);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-2xl tracking-tight">{directive.commandNumber}</h1>
            <Badge variant={badgeVariant(directive.status)}>{directive.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {directive.ownerUnit?.name ?? "-"} - versi aktif {directive.currentVersionNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>Edit Draft</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/tracking`}>Tracking</Link>
          </Button>
          <Button onClick={() => triggerAction("publish")} disabled={isSubmitting !== null}>
            {isSubmitting === "publish" ? "Memproses..." : "Publish"}
          </Button>
          <Button onClick={() => triggerAction("distribute")} disabled={isSubmitting !== null} variant="secondary">
            {isSubmitting === "distribute" ? "Memproses..." : "Distribusikan"}
          </Button>
          <Button onClick={() => triggerAction("cancel")} disabled={isSubmitting !== null} variant="destructive">
            {isSubmitting === "cancel" ? "Memproses..." : "Batalkan"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Metadata STR</CardTitle>
            <CardDescription>
              {currentVersion?.classification ?? "-"} - {currentVersion?.commandSource ?? "-"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Pemberi Perintah</div>
                <div className="mt-1 font-medium">{currentVersion?.commandIssuer ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Tanggal Perintah</div>
                <div className="mt-1 font-medium">{formatDate(currentVersion?.commandDate)}</div>
              </div>
              <div className="rounded-xl border border-border/70 p-3">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Deadline</div>
                <div className="mt-1 font-medium">{formatDate(currentVersion?.dueDate)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Isu Strategis</div>
              <p className="rounded-xl border border-border/70 p-4 text-sm leading-6">
                {currentVersion?.strategicIssue ?? "Belum diisi."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-muted-foreground text-xs uppercase tracking-wide">Uraian Perintah</div>
              <p className="rounded-xl border border-border/70 p-4 text-sm leading-6">
                {parsedDescription.commandNarrative || "-"}
              </p>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 p-4">
              <div className="font-medium">Penerima STR</div>
              {currentVersion?.recipients.length ? (
                currentVersion.recipients.map((recipient) => (
                  <div key={recipient.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{renderRecipientLabel(recipient)}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant={badgeVariant(recipient.status)}>{recipient.status}</Badge>
                      <span>{recipient.targetPosition ? "Jabatan" : "Unit"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Belum ada penerima.</div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border/70 p-4">
              <div className="font-medium">Wilayah Sasaran</div>
              <div className="flex flex-wrap gap-2">
                {currentVersion?.targetAreas.map((item) => (
                  <Badge key={item.areaId} variant="outline">
                    {item.area.name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{parsedDescription.uukTitle || "UUK / KIQ / PIR STR"}</CardTitle>
            <CardDescription>Bagian UUK yang sudah melekat di STR sejak dibuat oleh Eksekutif.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {parsedDescription.uukSections.map((section) => (
              <div key={section.sectionType} className="rounded-xl border border-border/70 p-4">
                <div className="font-medium">
                  {section.orderNumber}. {section.title}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{section.content.trim() || "Belum diisi."}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Artefak Turunan</CardTitle>
          <CardDescription>Penjabaran regional dan task operasional yang sudah bercabang dari STR ini.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-border/70 p-4">
            <div className="mb-3 font-medium text-sm">Penjabaran Regional</div>
            <div className="space-y-3">
              {currentVersion?.uukStrs?.length ? (
                currentVersion.uukStrs.map((uuk) => (
                  <div key={uuk.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{uuk.versions?.[0]?.title ?? "Penjabaran Regional"}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant={badgeVariant(uuk.status)}>{uuk.status}</Badge>
                      <span>{uuk.ownerUnit?.name ?? "-"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Belum ada penjabaran regional.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 p-4">
            <div className="mb-3 font-medium text-sm">Tasks</div>
            <div className="space-y-3">
              {currentVersion?.tasks?.length ? (
                currentVersion.tasks.map((task) => (
                  <div key={task.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                    <div className="font-medium">{task.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-muted-foreground text-xs">
                      <Badge variant={badgeVariant(task.status)}>{task.status}</Badge>
                      <span>{task.ownerUnit?.name ?? "-"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Belum ada task turunan.</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
