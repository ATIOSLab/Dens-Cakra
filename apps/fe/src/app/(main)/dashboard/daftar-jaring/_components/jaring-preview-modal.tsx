"use client";

import Link from "next/link";

import {
  Ban,
  BriefcaseBusiness,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flag,
  IdCard,
  MapPin,
  Phone,
  ShieldCheck,
  UserCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import {
  jaringCity,
  jaringDistrict,
  jaringVillage,
  type RegistrationJaring,
} from "@/app/(main)/dashboard/koordinator-wilayah/_components/jaring-types";
import { GaswilEntityLink } from "@/components/domain/gaswil-entity-link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatGender(value?: string | null) {
  if (!value) return "-";
  if (value === "MALE" || value === "L") return "Laki-laki";
  if (value === "FEMALE" || value === "P") return "Perempuan";
  return value;
}

function getInitials(name?: string | null) {
  if (!name) return "JR";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function isJaringActive(item: RegistrationJaring): boolean {
  if (!item.lastReportAt) return false;
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  return new Date(item.lastReportAt).getTime() >= threeMonthsAgo;
}

function statusBadgeVariant(status: RegistrationJaring["registrationStatus"]) {
  if (status === "APPROVED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "REJECTED") {
    return "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400";
  }
  if (status === "SUSPENDED") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400";
}

function statusLabel(status: RegistrationJaring["registrationStatus"]) {
  if (status === "APPROVED") return "Disetujui";
  if (status === "REJECTED") return "Ditolak";
  if (status === "SUSPENDED") return "Ditangguhkan";
  return "Menunggu Tinjauan";
}

export type JaringPreviewModalProps = {
  jaring: RegistrationJaring | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function JaringPreviewModal({ jaring, open, onOpenChange }: JaringPreviewModalProps) {
  if (!jaring) return null;

  const displayName = jaring.fullName?.trim() || jaring.aliasName?.trim() || jaring.id;
  const refCode = jaring.aliasName?.trim() || jaring.id;
  const photo = jaring.profilePhotoFileId ? `/api/files/${jaring.profilePhotoFileId}` : null;
  const registeredDate = formatDateTime(jaring.registeredAt ?? jaring.createdAt);

  const city = jaringCity(jaring);
  const district = jaringDistrict(jaring);
  const village = jaringVillage(jaring);

  const locationParts = [village?.name, district?.name, city?.name].filter(Boolean);
  const locationSummary = locationParts.length > 0 ? locationParts.join(", ") : "Wilayah belum ditetapkan";

  const primaryFo = jaring.caretakerAssignments[0]?.fieldOfficerAssignment;
  const foName = primaryFo?.userProfile?.fullName ?? "Belum ditugaskan";
  const active = isJaringActive(jaring);

  const hasBirthInfo = Boolean(jaring.birthPlace ?? jaring.birthDate);
  const hasJobInfo = Boolean(jaring.jobTitle ?? jaring.workplace);
  const hasExtraInfo = Boolean(
    jaring.organizationName ?? jaring.politicalAffiliation ?? jaring.notes ?? jaring.rejectionReason,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Modal Header */}
        <DialogHeader className="border-b border-border/70 bg-muted/20 p-5 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 font-bold font-mono text-xs text-slate-700 dark:bg-white/10 dark:text-slate-300">
              {refCode}
            </span>

            <Badge
              variant="outline"
              className={cn("gap-1 font-semibold text-[10px]", statusBadgeVariant(jaring.registrationStatus))}
            >
              {jaring.registrationStatus === "APPROVED" && <CheckCircle2 className="size-3 shrink-0" />}
              {jaring.registrationStatus === "REJECTED" && <XCircle className="size-3 shrink-0" />}
              {jaring.registrationStatus === "PENDING" && <Clock className="size-3 shrink-0" />}
              {jaring.registrationStatus === "SUSPENDED" && <Ban className="size-3 shrink-0" />}
              {statusLabel(jaring.registrationStatus)}
            </Badge>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold text-[10px] uppercase tracking-[0.06em]",
                active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-[#22C55E]"
                  : "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {active ? DOMAIN_TERMS.jaringActive90Days : DOMAIN_TERMS.jaringInactive90Days}
            </span>
          </div>

          <DialogTitle className="mt-2 text-left font-bold font-heading text-lg text-foreground leading-snug">
            {displayName}
          </DialogTitle>

          <DialogDescription className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5 text-muted-foreground" />
              Terdaftar: {registeredDate}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              {locationSummary}
            </span>
            {foName && (
              <span className="flex items-center gap-1">
                <UserCheck className="size-3.5 text-amber-500" />
                Gaswil: {foName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Section 1: Profil & Identitas Jaring */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              Profil & Identitas {DOMAIN_TERMS.jaring}
            </h4>
            <div className="rounded-lg border border-border/70 bg-card p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
                  {photo ? (
                    <Avatar className="size-full rounded-none">
                      <AvatarImage src={photo} alt={displayName} className="object-cover" />
                      <AvatarFallback className="rounded-none bg-primary/10 font-semibold text-sm text-primary">
                        {getInitials(displayName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <UserRound className="size-8 text-muted-foreground/60" />
                  )}
                </div>

                <div className="grid min-w-0 flex-1 gap-2.5 sm:grid-cols-2 text-xs">
                  <div>
                    <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>
                      {DOMAIN_TERMS.jaringName}
                    </span>
                    <span className="mt-0.5 block font-semibold text-foreground">{jaring.fullName ?? "-"}</span>
                  </div>
                  <div>
                    <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>
                      {DOMAIN_TERMS.jaringCode}
                    </span>
                    <span className="mt-0.5 block font-mono font-semibold text-violet-700 dark:text-violet-400">
                      {jaring.aliasName ?? jaring.id}
                    </span>
                  </div>
                  <div>
                    <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>Nomor WhatsApp</span>
                    {jaring.whatsappNumber ? (
                      <a
                        href={`https://wa.me/${jaring.whatsappNumber.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center gap-1 font-mono font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        <Phone className="size-3" />
                        {jaring.whatsappNumber}
                      </a>
                    ) : (
                      <span className="mt-0.5 block text-muted-foreground">-</span>
                    )}
                  </div>
                  <div>
                    <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>Jenis Kelamin</span>
                    <span className="mt-0.5 block font-medium text-foreground">{formatGender(jaring.gender)}</span>
                  </div>
                  {jaring.nationalIdNumber && (
                    <div>
                      <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>NIK</span>
                      <span className="mt-0.5 block font-mono font-medium text-foreground">
                        {jaring.nationalIdNumber}
                      </span>
                    </div>
                  )}
                  {hasBirthInfo && (
                    <div>
                      <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>Tempat, Tanggal Lahir</span>
                      <span className="mt-0.5 block font-medium text-foreground">
                        {[jaring.birthPlace, formatDate(jaring.birthDate)].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  {hasJobInfo && (
                    <div className="sm:col-span-2">
                      <span className={cn(DC_TYPOGRAPHY.tableHeader, "block text-[11px]")}>Pekerjaan / Instansi</span>
                      <span className="mt-0.5 inline-flex items-center gap-1.5 font-medium text-foreground">
                        <BriefcaseBusiness className="size-3.5 text-muted-foreground" />
                        {[jaring.jobTitle, jaring.workplace].filter(Boolean).join(" - ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Wilayah Penugasan & Petugas Wilayah (Gaswil) */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
              {DOMAIN_TERMS.jaringPlacementArea} & {DOMAIN_TERMS.jaringCaretaker}
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/70 bg-card p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <MapPin className="size-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Hierarki Wilayah Penugasan</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">Kota/Kabupaten:</span>
                    <span className="font-medium text-foreground">{city?.name ?? "-"}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-1">
                    <span className="text-muted-foreground">Kecamatan:</span>
                    <span className="font-medium text-foreground">{district?.name ?? "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kelurahan/Desa:</span>
                    <span className="font-medium text-foreground">{village?.name ?? "-"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-card p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <UserCheck className="size-3.5 text-amber-500" />
                  <span>{DOMAIN_TERMS.jaringCaretaker}</span>
                </div>
                <div className="space-y-2 pt-1">
                  {primaryFo?.userProfile ? (
                    <div>
                      <GaswilEntityLink
                        name={foName}
                        assignmentId={primaryFo.id}
                        userProfileId={primaryFo.userProfile.id ?? primaryFo.userProfileId}
                        className="font-medium text-sm text-foreground hover:underline"
                      />
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Bertanggung jawab atas pembinaan dan koordinasi operasional Jaring ini.
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Belum ada Petugas Wilayah pembina yang ditugaskan.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Organisasi, Afiliasi, Catatan jika ada */}
          {hasExtraInfo && (
            <div className="space-y-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                Informasi Tambahan & Catatan
              </h4>
              <div className="space-y-2 rounded-lg border border-border/70 bg-card p-3.5 text-xs">
                {jaring.organizationName && (
                  <div className="flex items-start gap-2">
                    <Building2 className="mt-0.5 size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Organisasi: </span>
                      <span className="font-medium text-foreground">{jaring.organizationName}</span>
                    </div>
                  </div>
                )}
                {jaring.politicalAffiliation && (
                  <div className="flex items-start gap-2">
                    <Flag className="mt-0.5 size-3.5 text-muted-foreground shrink-0" />
                    <div>
                      <span className="text-muted-foreground">Afiliasi Politik: </span>
                      <span className="font-medium text-foreground">{jaring.politicalAffiliation}</span>
                    </div>
                  </div>
                )}
                {jaring.notes && (
                  <div className="mt-2 rounded bg-muted/40 p-2.5 text-muted-foreground leading-relaxed">
                    <span className="mb-0.5 block font-semibold text-foreground">Catatan:</span>
                    <p className="whitespace-pre-wrap">{jaring.notes}</p>
                  </div>
                )}
                {jaring.rejectionReason && (
                  <div className="mt-2 rounded border border-rose-500/20 bg-rose-50/50 p-2.5 text-rose-700 leading-relaxed dark:bg-rose-950/20 dark:text-rose-300">
                    <span className="mb-0.5 block font-semibold">Catatan / Alasan:</span>
                    <p className="whitespace-pre-wrap">{jaring.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="flex flex-col-reverse items-center justify-between gap-2 border-t border-border/70 bg-muted/30 p-4 sm:flex-row sm:justify-between">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              Tutup
            </Button>
          </DialogClose>

          <Button
            asChild
            size="sm"
            className="w-full gap-1.5 bg-sky-600 font-semibold text-white hover:bg-sky-700 dark:bg-sky-600 dark:hover:bg-sky-500 sm:w-auto"
          >
            <Link href={`/dashboard/daftar-jaring/${jaring.id}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Buka Halaman Detail (Tab Baru)
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
