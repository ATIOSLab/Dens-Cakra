"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Pencil, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { POSITION_CODE_OPTIONS } from "../../pengguna/_components/pengguna-types";
import type { JabatanResource } from "./jabatan-types";

type Props = {
  position: JabatanResource;
};

function positionLabel(code?: string) {
  return POSITION_CODE_OPTIONS.find((item) => item.value === code)?.label ?? code ?? "-";
}

function branchLabel(branch?: string | null) {
  if (branch === "PUSAT") return "Pusat";
  if (branch === "DIRECTORATE") return "Direktorat";
  if (branch === "BINDA") return "Binda";
  return "-";
}

export function JabatanDetailClient({ position }: Props) {
  const coverages = position.areaCoverages ?? [];
  const assignments = position.assignments ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{branchLabel(position.branch)}</Badge>
            <Badge variant={position.isActive ? "default" : "outline"}>{position.isActive ? "Aktif" : "Nonaktif"}</Badge>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{position.title}</h1>
          <p className="max-w-4xl text-sm text-muted-foreground">
            {position.seatCode} - {position.organizationUnit?.name ?? "-"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/admin-system/jabatan-reporting-line">
              <ArrowLeft className="size-4" />
              Daftar
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/dashboard/admin-system/jabatan-reporting-line/${position.id}/edit`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle>Profil jabatan</CardTitle>
            <CardDescription>Ringkasan unit, penempatan, dan identitas jabatan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Tipe" value={positionLabel(position.code)} />
            <Info label="Unit" value={branchLabel(position.branch)} />
            <Info label="Seat code" value={position.seatCode} />
            <Info label="Penempatan" value={position.organizationUnit?.name ?? "-"} />
          </CardContent>
        </Card>

        <Card className="border border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Pengisian jabatan
            </CardTitle>
            <CardDescription>Satu jabatan hanya boleh ditempati satu assignment aktif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length ? (
              assignments.map((assignment) => (
                <div key={assignment.id} className="rounded-lg border border-border/70 p-3">
                  <div className="font-medium">{assignment.userProfile?.fullName ?? assignment.userProfile?.username ?? "Personel aktif"}</div>
                  <div className="text-xs text-muted-foreground">{assignment.validFrom}</div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                Belum ada user aktif yang menempati jabatan ini.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="size-4" />
            Wilayah tanggung jawab
          </CardTitle>
          <CardDescription>Coverage ini menjadi sumber scope saat user ditempatkan ke jabatan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {coverages.map((coverage) => (
              <Badge key={coverage.id} variant={coverage.isPrimary ? "default" : "outline"}>
                {coverage.area.name} - {coverage.area.level}
                {coverage.isPrimary ? " (utama)" : ""}
              </Badge>
            ))}
            {!coverages.length ? <span className="text-sm text-muted-foreground">Belum ada wilayah aktif.</span> : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
