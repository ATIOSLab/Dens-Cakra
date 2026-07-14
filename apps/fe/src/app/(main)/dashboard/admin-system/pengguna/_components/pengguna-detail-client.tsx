"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowRightLeft,
  CheckCircle2,
  Lock,
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

import type { AreaSearchResult, PositionSummary, UserDetail } from "./pengguna-types";
import {
  ROLE_CODE_TO_AUTH_ROLE,
  formatDateTime,
  getPrimaryAssignment,
  getRoleLabel,
  isUserLocked,
  toDateTimeLocalValue,
  toIsoFromLocalValue,
} from "./pengguna-types";

type PenggunaDetailClientProps = {
  user: UserDetail;
  actorUserProfileId: string;
};

type DialogState =
  | null
  | "activate"
  | "suspend"
  | "lock"
  | "unlock"
  | "archive"
  | "transfer";

export function PenggunaDetailClient({
  user,
  actorUserProfileId,
}: PenggunaDetailClientProps) {
  const router = useRouter();
  const primaryAssignment = getPrimaryAssignment(user);
  const locked = isUserLocked(user);
  const derivedAuthRole = primaryAssignment?.position.role?.code
    ? ROLE_CODE_TO_AUTH_ROLE[primaryAssignment.position.role.code]
    : null;
  const roleIsSynchronized = derivedAuthRole === user.authUser.role;
  const isSelf = user.id === actorUserProfileId;
  const [activeDialog, setActiveDialog] = useState<DialogState>(null);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);

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
  const [transferAreaQuery, setTransferAreaQuery] = useState("");
  const [transferAreaResults, setTransferAreaResults] = useState<AreaSearchResult[]>([]);
  const [transferAreas, setTransferAreas] = useState<AreaSearchResult[]>(
    primaryAssignment?.areaScopes.map((scope) => ({
      id: scope.area.id,
      code: scope.area.code,
      name: scope.area.name,
      level: scope.area.level,
      parent: null,
    })) ?? [],
  );
  const deferredTransferPositionQuery = useDeferredValue(transferPositionQuery);
  const deferredTransferAreaQuery = useDeferredValue(transferAreaQuery);

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

  useEffect(() => {
    let cancelled = false;

    async function loadAreas() {
      if (deferredTransferAreaQuery.trim().length < 2) {
        setTransferAreaResults([]);
        return;
      }

      const results = await apiBrowserFetch<AreaSearchResult[]>("/administrative-areas/search", {
        query: {
          q: deferredTransferAreaQuery.trim(),
          limit: 10,
        },
      });

      if (!cancelled) {
        setTransferAreaResults(results);
      }
    }

    loadAreas().catch(() => {
      if (!cancelled) {
        setTransferAreaResults([]);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deferredTransferAreaQuery]);

  const assignmentTimeline = useMemo(
    () =>
      [...user.positionAssignments].sort(
        (left, right) =>
          new Date(right.validFrom).getTime() - new Date(left.validFrom).getTime(),
      ),
    [user.positionAssignments],
  );

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
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">User Detail</Badge>
          <Badge variant="outline">{getRoleLabel(user.authUser.role)}</Badge>
          <Badge>{user.status}</Badge>
          {locked ? <Badge variant="destructive">Locked</Badge> : null}
        </div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {user.fullName || user.authUser.name || user.authUser.email}
        </h1>
        <p className="max-w-4xl text-muted-foreground text-sm">
          Pusat kendali untuk status akun, mutasi jabatan utama, dan tindakan keamanan tanpa memisahkan histori
          assignment dari identitas user.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-4">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" />
                Identitas dan sinkronisasi role
              </CardTitle>
              <CardDescription>
                Role Better Auth harus tetap sinkron dengan role domain yang diturunkan dari jabatan utama aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 p-4">
                <div className="font-heading text-xl font-semibold">
                  {user.fullName || user.authUser.name || user.authUser.email}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  @{user.username || "-"} • {user.authUser.email}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">Auth: {getRoleLabel(user.authUser.role)}</Badge>
                  <Badge variant={roleIsSynchronized ? "default" : "destructive"}>
                    Domain: {derivedAuthRole ? getRoleLabel(derivedAuthRole) : "Belum terdeteksi"}
                  </Badge>
                </div>
              </div>

              {!roleIsSynchronized ? (
                <Alert variant="destructive">
                  <ShieldAlert className="size-4" />
                  <AlertTitle>Role auth tidak sinkron</AlertTitle>
                  <AlertDescription>
                    Role Better Auth pada akun ini tidak cocok dengan role jabatan utama aktif. Lakukan mutasi
                    ulang atau audit assignment sebelum user dipakai operasional.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Status profile</div>
                  <div className="mt-2 font-medium">{user.status}</div>
                  <div className="text-sm text-muted-foreground">
                    Login terakhir {formatDateTime(user.lastLoginAt)}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Kondisi auth</div>
                  <div className="mt-2 font-medium">{user.authUser.banned ? "Banned" : "Normal"}</div>
                  <div className="text-sm text-muted-foreground">
                    {locked ? "Operational lock aktif." : "Tidak ada lock aktif."}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="size-4" />
                Assignment utama dan area scope
              </CardTitle>
              <CardDescription>
                Jabatan utama menjadi sumber kebenaran untuk role auth, unit, branch, dan area yang boleh diakses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 p-4">
                <div className="font-medium">{primaryAssignment?.position.title || "-"}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {primaryAssignment?.position.organizationUnit?.name || "-"} • {primaryAssignment?.position.seatCode || "-"}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Berlaku sejak {formatDateTime(primaryAssignment?.validFrom)}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {primaryAssignment?.areaScopes.map((scope) => (
                  <Badge key={`${scope.area.id}-${scope.id ?? scope.areaId}`} variant={scope.isPrimary ? "default" : "outline"}>
                    {scope.area.name}
                    {scope.isPrimary ? " • utama" : ""}
                  </Badge>
                )) ?? <Badge variant="outline">Belum ada scope</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle>Timeline assignment</CardTitle>
              <CardDescription>
                Histori assignment disimpan di halaman ini agar mutasi dan tindakan keamanan bisa dilihat dalam satu alur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {assignmentTimeline.map((assignment) => (
                <div key={assignment.id} className="rounded-xl border border-border/70 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{assignment.position.title}</div>
                    {assignment.isPrimary ? <Badge>Primary</Badge> : <Badge variant="outline">Secondary</Badge>}
                    {assignment.isActive ? <Badge variant="outline">Aktif</Badge> : null}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {assignment.position.organizationUnit?.name || "-"} • {assignment.position.seatCode}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(assignment.validFrom)} sampai {formatDateTime(assignment.validUntil)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {assignment.areaScopes.map((scope) => (
                      <Badge key={`${assignment.id}-${scope.area.id}-${scope.id ?? scope.areaId}`} variant="outline">
                        {scope.area.name}
                        {scope.isPrimary ? " • utama" : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4" />
                Aksi admin
              </CardTitle>
              <CardDescription>
                Tindakan akan memanggil endpoint backend resmi dan langsung menyegarkan halaman ini setelah sukses.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog("activate")}
                disabled={user.status === "ACTIVE"}
              >
                <CheckCircle2 className="size-4" />
                Aktivasi ulang
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog("suspend")}
                disabled={isSelf}
              >
                <UserX className="size-4" />
                Suspend user
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog("lock")}
                disabled={locked}
              >
                <Lock className="size-4" />
                Lock operasional
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveDialog("unlock")}
                disabled={!locked}
              >
                <ShieldCheck className="size-4" />
                Unlock operasional
              </Button>
              <Button type="button" variant="outline" onClick={() => setActiveDialog("transfer")}>
                <ArrowRightLeft className="size-4" />
                Mutasi assignment utama
              </Button>
              <Button type="button" variant="destructive" onClick={() => setActiveDialog("archive")}>
                Arsipkan user
              </Button>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-end gap-2">
              <Button asChild variant="ghost">
                <Link href="/dashboard/admin-system/pengguna">Kembali ke daftar</Link>
              </Button>
              <Button asChild>
                <Link href={`/dashboard/admin-system/pengguna/${user.id}/edit`}>Edit metadata</Link>
              </Button>
            </CardFooter>
          </Card>

          {isSelf ? (
            <Alert>
              <ShieldAlert className="size-4" />
              <AlertTitle>Profil Anda sendiri</AlertTitle>
              <AlertDescription>
                Tombol suspend dinonaktifkan untuk mencegah admin memutus aksesnya sendiri dari workspace aktif.
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      </div>

      <Dialog open={activeDialog === "activate"} onOpenChange={(open) => setActiveDialog(open ? "activate" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aktivasi profile</DialogTitle>
            <DialogDescription>
              Gunakan saat provisioning perlu ditegaskan ulang setelah verifikasi status atau scope assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="activate-reason">Alasan</Label>
            <Input
              id="activate-reason"
              value={activateReason}
              onChange={(event) => setActivateReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="success"
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

      <Dialog open={activeDialog === "suspend"} onOpenChange={(open) => setActiveDialog(open ? "suspend" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend user</DialogTitle>
            <DialogDescription>Sesi aktif bisa dicabut langsung agar akses operasional berhenti seketika.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="suspend-reason">Alasan</Label>
              <Input
                id="suspend-reason"
                value={suspendReason}
                onChange={(event) => setSuspendReason(event.target.value)}
                placeholder="Misalnya: investigasi internal"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suspend-until">Berlaku sampai</Label>
              <Input
                id="suspend-until"
                type="datetime-local"
                value={suspendUntil}
                onChange={(event) => setSuspendUntil(event.target.value)}
              />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-border/70 p-3 text-sm">
              <Checkbox checked={revokeSessions} onCheckedChange={(checked) => setRevokeSessions(checked === true)} />
              <span>Cabut semua sesi aktif setelah suspend dieksekusi.</span>
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="warning"
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
              {submittingAction === "suspend" ? "Memproses..." : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "lock"} onOpenChange={(open) => setActiveDialog(open ? "lock" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lock operasional</DialogTitle>
            <DialogDescription>
              Gunakan lock untuk kondisi keamanan yang butuh pemutusan akses segera tanpa mengubah status profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lock-reason">Alasan</Label>
              <Input
                id="lock-reason"
                value={lockReason}
                onChange={(event) => setLockReason(event.target.value)}
                placeholder="Misalnya: perangkat hilang"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lock-until">Locked sampai</Label>
              <Input
                id="lock-until"
                type="datetime-local"
                value={lockUntil}
                onChange={(event) => setLockUntil(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
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
              {submittingAction === "lock" ? "Memproses..." : "Lock user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "unlock"} onOpenChange={(open) => setActiveDialog(open ? "unlock" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lepas operational lock</DialogTitle>
            <DialogDescription>
              Unlock tidak otomatis mengubah user SUSPENDED menjadi ACTIVE, jadi status profile tetap harus dipantau.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="unlock-reason">Alasan</Label>
            <Input
              id="unlock-reason"
              value={unlockReason}
              onChange={(event) => setUnlockReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="success"
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

      <Dialog open={activeDialog === "archive"} onOpenChange={(open) => setActiveDialog(open ? "archive" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan user</DialogTitle>
            <DialogDescription>
              Semua assignment aktif akan ditutup pada waktu efektif yang Anda tentukan dan user dikeluarkan dari roster aktif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="archive-reason">Alasan</Label>
              <Input
                id="archive-reason"
                value={archiveReason}
                onChange={(event) => setArchiveReason(event.target.value)}
                placeholder="Misalnya: pensiun / mutasi keluar sistem"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="archive-at">Efektif pada</Label>
              <Input
                id="archive-at"
                type="datetime-local"
                value={archiveAt}
                onChange={(event) => setArchiveAt(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
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
              {submittingAction === "archive" ? "Memproses..." : "Arsipkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === "transfer"} onOpenChange={(open) => setActiveDialog(open ? "transfer" : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mutasi assignment utama</DialogTitle>
            <DialogDescription>
              Pilih jabatan tujuan baru lalu tetapkan ulang area scope yang akan aktif setelah mutasi.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transfer-reason">Alasan mutasi</Label>
              <Input
                id="transfer-reason"
                value={transferReason}
                onChange={(event) => setTransferReason(event.target.value)}
                placeholder="Misalnya: rotasi operasional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-at">Efektif pada</Label>
              <Input
                id="transfer-at"
                type="datetime-local"
                value={transferAt}
                onChange={(event) => setTransferAt(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-position-query">Cari jabatan tujuan</Label>
              <Input
                id="transfer-position-query"
                value={transferPositionQuery}
                onChange={(event) => setTransferPositionQuery(event.target.value)}
                placeholder="Minimal 2 karakter seat code atau title"
              />
              {transferPosition ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                  <div className="font-medium">{transferPosition.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {transferPosition.seatCode} • {transferPosition.organizationUnit?.name}
                  </div>
                  <div className="mt-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setTransferPosition(null)}>
                      Ganti jabatan
                    </Button>
                  </div>
                </div>
              ) : null}
              {transferPositionResults.length ? (
                <div className="rounded-xl border border-border/70">
                  {transferPositionResults.map((position) => (
                    <button
                      key={position.id}
                      type="button"
                      onClick={() => {
                        setTransferPosition(position);
                        setTransferPositionQuery("");
                      }}
                      className="flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 not-last:border-b"
                    >
                      <div>
                        <div className="font-medium">{position.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {position.seatCode} • {position.organizationUnit?.name}
                        </div>
                      </div>
                      <Badge variant="outline">{position.role?.code || position.code}</Badge>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-area-query">Area scope baru</Label>
              <Input
                id="transfer-area-query"
                value={transferAreaQuery}
                onChange={(event) => setTransferAreaQuery(event.target.value)}
                placeholder="Cari area tambahan atau pengganti"
              />
              <div className="flex flex-wrap gap-2">
                {transferAreas.map((area, index) => (
                  <Badge key={area.id} variant={index === 0 ? "default" : "outline"} className="gap-2">
                    {area.name}
                    {index === 0 ? " • utama" : ""}
                    <button
                      type="button"
                      onClick={() =>
                        setTransferAreas((current) => current.filter((item) => item.id !== area.id))
                      }
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              {transferAreaResults.length ? (
                <div className="rounded-xl border border-border/70">
                  {transferAreaResults.map((area) => {
                    const alreadySelected = transferAreas.some((item) => item.id === area.id);

                    return (
                      <button
                        key={area.id}
                        type="button"
                        disabled={alreadySelected}
                        onClick={() => {
                          setTransferAreas((current) => [...current, area]);
                          setTransferAreaQuery("");
                        }}
                        className="flex w-full items-start justify-between gap-3 border-border/70 px-3 py-2 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50 not-last:border-b"
                      >
                        <div>
                          <div className="font-medium">{area.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {area.code} • {area.level}
                          </div>
                        </div>
                        <Badge variant="outline">{alreadySelected ? "Dipilih" : "Tambah"}</Badge>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveDialog(null)}>
              Batal
            </Button>
            <Button
              type="button"
              disabled={
                submittingAction === "transfer" ||
                transferReason.trim().length < 2 ||
                !transferAt ||
                !transferPosition?.id ||
                transferAreas.length === 0
              }
              onClick={() =>
                executeAction({
                  key: "transfer",
                  request: () =>
                    apiBrowserMutation("POST", `/user-profiles/${user.id}/change-primary-assignment`, {
                      reason: transferReason.trim(),
                      newPositionId: transferPosition?.id,
                      effectiveAt: toIsoFromLocalValue(transferAt),
                      areaScopeIds: transferAreas.map((area) => area.id),
                    }).then(() => undefined),
                  successMessage: "Assignment utama berhasil dimutasi.",
                })
              }
            >
              {submittingAction === "transfer" ? "Memproses..." : "Simpan mutasi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
