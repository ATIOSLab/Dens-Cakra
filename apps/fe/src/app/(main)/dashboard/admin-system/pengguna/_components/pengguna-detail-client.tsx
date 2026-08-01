"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Lock,
  PencilLine,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  UserRound,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiBrowserFetch, apiBrowserMutation } from "@/lib/api/browser-client";

import type { PositionSummary, UserDetail } from "./pengguna-types";
import {
  formatDateTime,
  getAssignmentRoleSummary,
  getAssignmentUnitSummary,
  getPrimaryAssignment,
  getRoleLabel,
  getUserAssignments,
  isUserLocked,
  ROLE_CODE_TO_AUTH_ROLE,
  toDateTimeLocalValue,
  toIsoFromLocalValue,
} from "./pengguna-types";

type PenggunaDetailClientProps = {
  user: UserDetail;
  actorUserProfileId: string;
};

type DialogState = null | "activate" | "reset-password" | "suspend" | "lock" | "unlock" | "archive" | "transfer";

function getAssignmentRoleLabel(assignment?: ReturnType<typeof getPrimaryAssignment>) {
  const role = getAssignmentRoleSummary(assignment);
  const authRole = role?.code ? ROLE_CODE_TO_AUTH_ROLE[role.code] : null;
  return authRole ? getRoleLabel(authRole) : "-";
}

export function PenggunaDetailClient({ user, actorUserProfileId }: PenggunaDetailClientProps) {
  const router = useRouter();
  const primaryAssignment = getPrimaryAssignment(user);
  const primaryUnit = getAssignmentUnitSummary(primaryAssignment);
  const primaryRole = getAssignmentRoleSummary(primaryAssignment);
  const locked = isUserLocked(user);
  const derivedAuthRole = primaryRole?.code ? ROLE_CODE_TO_AUTH_ROLE[primaryRole.code] : null;
  const roleIsSynchronized = derivedAuthRole === user.authUser.role;
  const isSelf = user.id === actorUserProfileId;
  const [activeDialog, setActiveDialog] = useState<DialogState>(null);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

  const [resetPasswordReason, setResetPasswordReason] = useState("Reset password oleh Admin Sistem.");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState("");
  const [resetRevokeSessions, setResetRevokeSessions] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetPasswordConfirmation, setShowResetPasswordConfirmation] = useState(false);
  const [activateReason, setActivateReason] = useState("Aktivasi setelah verifikasi provisioning.");
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendUntil, setSuspendUntil] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [lockReason, setLockReason] = useState("");
  const [lockUntil, setLockUntil] = useState("");
  const [unlockReason, setUnlockReason] = useState("Operational lock dicabut oleh admin.");
  const [archiveReason, setArchiveReason] = useState("");
  const [archiveAt, setArchiveAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [transferReason, setTransferReason] = useState("");
  const [transferAt, setTransferAt] = useState(toDateTimeLocalValue(new Date().toISOString()));
  const [transferPositionQuery, setTransferPositionQuery] = useState("");
  const [transferPositionResults, setTransferPositionResults] = useState<PositionSummary[]>([]);
  const [transferPosition, setTransferPosition] = useState<PositionSummary | null>(null);
  const deferredTransferPositionQuery = useDeferredValue(transferPositionQuery);

  useEffect(() => {
    let cancelled = false;

    async function loadPositions() {
      if (deferredTransferPositionQuery.trim().length < 2) {
        setTransferPositionResults([]);
        return;
      }

      const results = await apiBrowserFetch<PositionSummary[]>("/positions", {
        query: {
          search: deferredTransferPositionQuery.trim(),
          isActive: true,
          availableOnly: true,
          page: 1,
          limit: 20,
        },
      });

      if (!cancelled) {
        setTransferPositionResults(results);
      }
    }

    loadPositions().catch(() => {
      if (!cancelled) {
        setTransferPositionResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredTransferPositionQuery]);

  const assignmentTimeline = useMemo(
    () =>
      [...getUserAssignments(user)].sort(
        (left, right) => new Date(right.validFrom).getTime() - new Date(left.validFrom).getTime(),
      ),
    [user],
  );
  const resetPasswordError =
    resetPassword.length > 0 && resetPassword.length < 8
      ? "Password baru minimal 8 karakter."
      : resetPassword.length > 128
        ? "Password baru maksimal 128 karakter."
        : resetPasswordConfirmation.length > 0 && resetPassword !== resetPasswordConfirmation
          ? "Konfirmasi password tidak cocok."
          : "";
  const canResetPassword =
    resetPassword.length >= 8 &&
    resetPassword.length <= 128 &&
    resetPassword === resetPasswordConfirmation &&
    resetPasswordReason.trim().length >= 2;

  async function executeAction({
    key,
    request,
    successMessage,
    redirectToList = false,
  }: {
    key: string;
    request: () => Promise<void>;
    successMessage: string;
    redirectToList?: boolean;
  }) {
    setSubmittingAction(key);

    try {
      await request();
      toast.success(successMessage);
      setActiveDialog(null);

      if (redirectToList) {
        router.push("/dashboard/admin-system/pengguna");
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aksi pengguna gagal dijalankan.");
    } finally {
      setSubmittingAction(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="space-y-2">
        <Link
          href="/dashboard/admin-system/pengguna"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-3.5" />
          Daftar Pengguna
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                {user.fullName || user.authUser.name || user.authUser.email}
              </h1>
              {user.status === "ACTIVE" && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 text-xs">
                  Aktif
                </Badge>
              )}
              {user.status === "PENDING" && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/20 text-xs">
                  Pending
                </Badge>
              )}
              {user.status === "SUSPENDED" && (
                <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/20 text-xs">
                  Suspended
                </Badge>
              )}
              {locked && (
                <Badge variant="destructive" className="text-xs">
                  Locked
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              @{user.username || "-"} {user.authUser.email ? `• ${user.authUser.email}` : ""} • Login terakhir:{" "}
              {formatDateTime(user.lastLoginAt)}
            </p>
          </div>

          <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
            <Link href={`/dashboard/admin-system/pengguna/${user.id}/edit`}>
              <PencilLine className="size-3.5" />
              Edit Metadata
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Identity & Role Sync */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserRound className="size-4 text-primary" />
                Identitas Akun & Role Authorization
              </CardTitle>
              <CardDescription className="text-xs">
                Kondisi akun Better Auth dan sinkronisasi role domain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    AUTH ROLE
                  </span>
                  <div className="font-semibold text-sm text-foreground">{getRoleLabel(user.authUser.role)}</div>
                </div>

                <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    DOMAIN ROLE
                  </span>
                  <div className="font-semibold text-sm text-foreground">
                    {derivedAuthRole ? getRoleLabel(derivedAuthRole) : "Belum terdeteksi"}
                  </div>
                </div>
              </div>

              {!roleIsSynchronized && (
                <Alert variant="destructive" className="py-2.5">
                  <ShieldAlert className="size-4 shrink-0" />
                  <AlertTitle className="text-xs font-semibold">Role Auth Tidak Sinkron</AlertTitle>
                  <AlertDescription className="text-xs mt-0.5">
                    Role Better Auth pada akun ini tidak cocok dengan role penempatan utama aktif.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-3 pt-2 text-xs border-t border-border/40">
                <div>
                  <span className="text-muted-foreground">Status Profil:</span>
                  <div className="font-medium text-foreground mt-0.5">{user.status}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status Banned Auth:</span>
                  <div className="font-medium text-foreground mt-0.5">
                    {user.authUser.banned ? "Ya (Banned)" : "Normal"}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Operational Lock:</span>
                  <div className="font-medium text-foreground mt-0.5">{locked ? "Aktif" : "Tidak Aktif"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit & Scope Wilayah */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <UserCog className="size-4 text-primary" />
                Penempatan Unit & Scope Wilayah
              </CardTitle>
              <CardDescription className="text-xs">
                Informasi unit organisasi aktif dan wilayah cakupan operasional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="rounded-lg border border-border/50 bg-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-foreground">
                    {primaryUnit?.name || primaryAssignment?.branch || "-"}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {getAssignmentRoleLabel(primaryAssignment)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Kode Unit: {primaryUnit?.code || "-"} • Berlaku sejak {formatDateTime(primaryAssignment?.validFrom)}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="size-3.5" /> Scope Wilayah Operasional
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {primaryAssignment?.areaScopes.map((scope) => (
                    <Badge
                      key={`${scope.area.id}-${scope.id ?? scope.areaId}`}
                      variant={scope.isPrimary ? "default" : "secondary"}
                      className="text-xs py-1 px-2.5"
                    >
                      {scope.area.name}
                      {scope.isPrimary ? " (Utama)" : ""}
                    </Badge>
                  )) ?? <span className="text-xs text-muted-foreground italic">Belum ada scope wilayah</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Assignment */}
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="size-4 text-primary" />
                Histori Timeline Assignment
              </CardTitle>
              <CardDescription className="text-xs">
                Rekam jejak mutasi unit, role, dan wilayah operasional pengguna.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-5">
              {assignmentTimeline.map((assignment, index) => (
                <div key={assignment.id} className="rounded-lg border border-border/50 bg-card p-3.5 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-foreground">
                      {getAssignmentUnitSummary(assignment)?.name || assignment.branch || "-"}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {assignment.isPrimary ? (
                        <Badge className="text-[10px] py-0">Primary</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0">
                          Secondary
                        </Badge>
                      )}
                      {assignment.isActive ? (
                        <Badge variant="secondary" className="text-[10px] py-0">
                          Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">
                          Nonaktif
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    Role: <span className="font-medium text-foreground">{getAssignmentRoleLabel(assignment)}</span> •{" "}
                    {formatDateTime(assignment.validFrom)} s/d {formatDateTime(assignment.validUntil)}
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {assignment.areaScopes.map((scope) => (
                      <Badge
                        key={`${assignment.id}-${scope.area.id}-${scope.id ?? scope.areaId}`}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {scope.area.name} {scope.isPrimary ? " (Utama)" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Admin Actions */}
        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                Aksi Operasional Admin
              </CardTitle>
              <CardDescription className="text-xs">Tindakan administratif langsung ke backend server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("activate")}
                disabled={user.status === "ACTIVE"}
              >
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                Aktivasi Ulang Profile
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("reset-password")}
              >
                <KeyRound className="size-4 text-primary" />
                Reset Password
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("suspend")}
                disabled={isSelf}
              >
                <UserX className="size-4 text-orange-600 dark:text-orange-400" />
                Suspend User
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("lock")}
                disabled={locked}
              >
                <Lock className="size-4 text-rose-600 dark:text-rose-400" />
                Lock Operasional
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("unlock")}
                disabled={!locked}
              >
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                Unlock Operasional
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-9"
                onClick={() => setActiveDialog("transfer")}
              >
                <ArrowRightLeft className="size-4 text-blue-600 dark:text-blue-400" />
                Mutasi Organisasi/Wilayah
              </Button>

              <div className="pt-2 border-t border-border/40">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start gap-2 text-xs h-9"
                  onClick={() => setActiveDialog("archive")}
                >
                  Arsipkan User
                </Button>
              </div>
            </CardContent>
          </Card>

          {isSelf && (
            <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
              <ShieldAlert className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <AlertTitle className="text-xs font-semibold">Profil Anda Sendiri</AlertTitle>
              <AlertDescription className="text-xs mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                Tombol suspend dinonaktifkan untuk akun Anda sendiri demi keamanan sesi.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {/* Activate Dialog */}
      <Dialog open={activeDialog === "activate"} onOpenChange={(open) => setActiveDialog(open ? "activate" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktivasi Profile Pengguna</DialogTitle>
            <DialogDescription>
              Aktivasi ulang akun pengguna setelah verifikasi provisioning atau status penempatan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="activate-reason" className="text-xs">
              Alasan Aktivasi
            </Label>
            <Input
              id="activate-reason"
              value={activateReason}
              onChange={(event) => setActivateReason(event.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "activate" || activateReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "activate",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/activate`, {
                      reason: activateReason.trim(),
                    }).then(() => undefined),
                  successMessage: "Profile berhasil diaktifkan ulang.",
                })
              }
            >
              {submittingAction === "activate" ? "Memproses..." : "Aktifkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={activeDialog === "reset-password"}
        onOpenChange={(open) => setActiveDialog(open ? "reset-password" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password Pengguna</DialogTitle>
            <DialogDescription>
              Tetapkan password baru untuk akun ini. Sesi login aktif dapat dicabut setelah password diperbarui.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-reason" className="text-xs">
                Alasan Reset
              </Label>
              <Input
                id="reset-password-reason"
                value={resetPasswordReason}
                onChange={(event) => setResetPasswordReason(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-new" className="text-xs">
                Password Baru
              </Label>
              <div className="relative">
                <Input
                  id="reset-password-new"
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder="Minimal 8 karakter"
                  className="h-9 pr-10 text-sm"
                />
                <button
                  type="button"
                  className="-translate-y-1/2 absolute top-1/2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowResetPassword((value) => !value)}
                  aria-label={showResetPassword ? "Sembunyikan password baru" : "Tampilkan password baru"}
                >
                  {showResetPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reset-password-confirm" className="text-xs">
                Konfirmasi Password Baru
              </Label>
              <div className="relative">
                <Input
                  id="reset-password-confirm"
                  type={showResetPasswordConfirmation ? "text" : "password"}
                  value={resetPasswordConfirmation}
                  onChange={(event) => setResetPasswordConfirmation(event.target.value)}
                  autoComplete="new-password"
                  className="h-9 pr-10 text-sm"
                />
                <button
                  type="button"
                  className="-translate-y-1/2 absolute top-1/2 right-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setShowResetPasswordConfirmation((value) => !value)}
                  aria-label={
                    showResetPasswordConfirmation ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"
                  }
                >
                  {showResetPasswordConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {resetPasswordError && <p className="text-xs text-destructive">{resetPasswordError}</p>}
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 p-3 text-xs">
              <Checkbox
                checked={resetRevokeSessions}
                onCheckedChange={(checked) => setResetRevokeSessions(checked === true)}
              />
              <span>Cabut semua sesi login aktif setelah password diperbarui</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "reset-password" || !canResetPassword}
              onClick={() =>
                executeAction({
                  key: "reset-password",
                  request: async () => {
                    await apiBrowserMutation("POST", `/user-profiles/${user.id}/reset-password`, {
                      password: resetPassword,
                      reason: resetPasswordReason.trim(),
                      revokeSessions: resetRevokeSessions,
                    });
                    setResetPassword("");
                    setResetPasswordConfirmation("");
                    setShowResetPassword(false);
                    setShowResetPasswordConfirmation(false);
                  },
                  successMessage: "Password pengguna berhasil direset.",
                })
              }
            >
              {submittingAction === "reset-password" ? "Memproses..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={activeDialog === "suspend"} onOpenChange={(open) => setActiveDialog(open ? "suspend" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Akun Pengguna</DialogTitle>
            <DialogDescription>
              Akses akun akan dibekukan sementara. Sesi login aktif dapat dicabut secara instan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="suspend-reason" className="text-xs">
                Alasan Suspend
              </Label>
              <Input
                id="suspend-reason"
                value={suspendReason}
                onChange={(event) => setSuspendReason(event.target.value)}
                placeholder="Misal: Investigasi internal atau mutasi sementara"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suspend-until" className="text-xs">
                Berlaku Sampai (Opsional)
              </Label>
              <Input
                id="suspend-until"
                type="datetime-local"
                value={suspendUntil}
                onChange={(event) => setSuspendUntil(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <label className="flex items-center gap-2.5 rounded-lg border border-border/60 p-3 text-xs cursor-pointer">
              <Checkbox checked={revokeSessions} onCheckedChange={(checked) => setRevokeSessions(checked === true)} />
              <span>Cabut semua sesi login aktif setelah suspend dieksekusi</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingAction === "suspend" || suspendReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "suspend",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/suspend`, {
                      reason: suspendReason.trim(),
                      revokeSessions,
                      ...(suspendUntil ? { until: toIsoFromLocalValue(suspendUntil) } : {}),
                    }).then(() => undefined),
                  successMessage: "User berhasil disuspend.",
                })
              }
            >
              {submittingAction === "suspend" ? "Memproses..." : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lock Dialog */}
      <Dialog open={activeDialog === "lock"} onOpenChange={(open) => setActiveDialog(open ? "lock" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock Operasional User</DialogTitle>
            <DialogDescription>
              Pasang lock operasional untuk memutus akses segera tanpa mengubah status profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lock-reason" className="text-xs">
                Alasan Operational Lock
              </Label>
              <Input
                id="lock-reason"
                value={lockReason}
                onChange={(event) => setLockReason(event.target.value)}
                placeholder="Misal: Perangkat hilang atau audit darurat"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lock-until" className="text-xs">
                Locked Sampai (Opsional)
              </Label>
              <Input
                id="lock-until"
                type="datetime-local"
                value={lockUntil}
                onChange={(event) => setLockUntil(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingAction === "lock" || lockReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "lock",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/lock`, {
                      reason: lockReason.trim(),
                      ...(lockUntil ? { lockedUntil: toIsoFromLocalValue(lockUntil) } : {}),
                    }).then(() => undefined),
                  successMessage: "Operational lock berhasil dipasang.",
                })
              }
            >
              {submittingAction === "lock" ? "Memproses..." : "Lock User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlock Dialog */}
      <Dialog open={activeDialog === "unlock"} onOpenChange={(open) => setActiveDialog(open ? "unlock" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lepas Operational Lock</DialogTitle>
            <DialogDescription>Mencabut operational lock pada akun pengguna ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="unlock-reason" className="text-xs">
              Alasan Unlock
            </Label>
            <Input
              id="unlock-reason"
              value={unlockReason}
              onChange={(event) => setUnlockReason(event.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submittingAction === "unlock" || unlockReason.trim().length < 2}
              onClick={() =>
                executeAction({
                  key: "unlock",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/unlock`, {
                      reason: unlockReason.trim(),
                    }).then(() => undefined),
                  successMessage: "Operational lock berhasil dilepas.",
                })
              }
            >
              {submittingAction === "unlock" ? "Memproses..." : "Unlock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={activeDialog === "archive"} onOpenChange={(open) => setActiveDialog(open ? "archive" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan Pengguna</DialogTitle>
            <DialogDescription>User akan dikeluarkan dari roster aktif dan assignment akan ditutup.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="archive-reason" className="text-xs">
                Alasan Pengarsipan
              </Label>
              <Input
                id="archive-reason"
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                placeholder="Misal: Pensiun / Mutasi keluar sistem"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="archive-at" className="text-xs">
                Efektif Pada
              </Label>
              <Input
                id="archive-at"
                type="datetime-local"
                value={archiveAt}
                onChange={(event) => setArchiveAt(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={submittingAction === "archive" || archiveReason.trim().length < 2 || !archiveAt}
              onClick={() =>
                executeAction({
                  key: "archive",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/archive`, {
                      reason: archiveReason.trim(),
                      effectiveAt: toIsoFromLocalValue(archiveAt),
                    }).then(() => undefined),
                  successMessage: "User berhasil diarsipkan.",
                  redirectToList: true,
                })
              }
            >
              {submittingAction === "archive" ? "Memproses..." : "Arsipkan User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={activeDialog === "transfer"} onOpenChange={(open) => setActiveDialog(open ? "transfer" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mutasi Organisasi & Wilayah</DialogTitle>
            <DialogDescription>
              Pilih penempatan tujuan baru untuk mengalihkan unit dan scope wilayah operasional user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="transfer-reason" className="text-xs">
                Alasan Mutasi
              </Label>
              <Input
                id="transfer-reason"
                value={transferReason}
                onChange={(event) => setTransferReason(event.target.value)}
                placeholder="Misal: Rotasi operasional wilayah"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfer-at" className="text-xs">
                Tanggal Efektif
              </Label>
              <Input
                id="transfer-at"
                type="datetime-local"
                value={transferAt}
                onChange={(event) => setTransferAt(event.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transfer-position-query" className="text-xs">
                Cari Penempatan Tujuan
              </Label>
              <Input
                id="transfer-position-query"
                value={transferPositionQuery}
                onChange={(event) => setTransferPositionQuery(event.target.value)}
                placeholder="Ketik minimal 2 karakter nama unit..."
                className="h-9 text-sm"
              />
              {transferPosition && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                  <div className="font-semibold text-xs text-foreground">{transferPosition.organizationUnit?.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {transferPosition.organizationUnit?.code} • {transferPosition.role?.code || transferPosition.code}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2 mt-1"
                    onClick={() => setTransferPosition(null)}
                  >
                    Ganti Penempatan
                  </Button>
                </div>
              )}
              {transferPositionResults.length > 0 && (
                <div className="rounded-lg border border-border/60 max-h-[160px] overflow-y-auto bg-popover">
                  {transferPositionResults.map((position) => (
                    <button
                      key={position.id}
                      type="button"
                      onClick={() => {
                        setTransferPosition(position);
                        setTransferPositionQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-muted/50 border-b border-border/30 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-foreground">{position.organizationUnit?.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {position.organizationUnit?.code} • {position.role?.code || position.code}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {position.role?.code || position.code}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Scope Wilayah Baru</Label>
              <div className="flex flex-wrap gap-1">
                {transferPosition?.areaCoverages?.length ? (
                  transferPosition.areaCoverages.map((coverage, index) => (
                    <Badge
                      key={coverage.id}
                      variant={coverage.isPrimary || index === 0 ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {coverage.area.name} {coverage.isPrimary || index === 0 ? "(Utama)" : ""}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Pilih penempatan aktif di atas untuk melihat wilayah baru.
                  </span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                submittingAction === "transfer" ||
                transferReason.trim().length < 2 ||
                !transferAt ||
                !transferPosition?.id
              }
              onClick={() =>
                executeAction({
                  key: "transfer",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/change-primary-assignment`, {
                      reason: transferReason.trim(),
                      newPositionId: transferPosition?.id,
                      effectiveAt: toIsoFromLocalValue(transferAt),
                    }).then(() => undefined),
                  successMessage: "Assignment utama berhasil dimutasi.",
                })
              }
            >
              {submittingAction === "transfer" ? "Memproses..." : "Simpan Mutasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
