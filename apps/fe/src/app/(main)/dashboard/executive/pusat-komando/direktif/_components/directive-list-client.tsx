"use client";

import Link from "next/link";

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

export function DirectiveListClient({ directives }: DirectiveListClientProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">STR / Direktif Strategis</h1>
          <p className="text-muted-foreground text-sm">
            STR dibuat di level Eksekutif dan sudah memuat UUK/KIQ/PIR sebagai titik awal alur komando.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/executive/pusat-komando/direktif/baru">Buat STR Baru</Link>
        </Button>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Daftar STR Aktif</CardTitle>
          <CardDescription>
            Gunakan tabel ini untuk review draft, publish, distribusi, dan tracking tindak lanjut.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor STR</TableHead>
                <TableHead>Judul UUK/STR</TableHead>
                <TableHead>Klasifikasi</TableHead>
                <TableHead>Wilayah</TableHead>
                <TableHead>Penerima</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
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
                      <TableCell className="font-medium">{directive.commandNumber}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{title}</div>
                          <div className="text-muted-foreground text-xs">
                            {buildDirectiveUukSummary(parsed.uukSections) || "Belum ada ringkasan UUK."}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{currentVersion?.classification ?? "-"}</TableCell>
                      <TableCell>{areaSummary}</TableCell>
                      <TableCell>{currentVersion?.recipients.length ?? 0} penerima</TableCell>
                      <TableCell>{formatDate(currentVersion?.dueDate)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariant(directive.status)}>{directive.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}`}>Detail</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/dashboard/executive/pusat-komando/direktif/${directive.id}/edit`}>Edit</Link>
                          </Button>
                          <Button asChild size="sm">
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
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    Belum ada STR yang dibuat pada unit eksekutif ini.
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
