import { AtSign, CalendarClock, MonitorSmartphone, ShieldCheck, UserRound } from "lucide-react";
import type { Metadata } from "next";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AccountPasswordForm } from "@/features/account/account-password-form";
import { requireSession } from "@/lib/auth/server-session";
import { getInitials } from "@/lib/utils";
import { getSystemRoleLabel } from "@/navigation/sidebar/system-roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDeviceLabel(userAgent: string | null | undefined) {
  if (!userAgent) {
    return "Perangkat tidak teridentifikasi";
  }

  const normalizedUserAgent = userAgent.toLowerCase();

  if (normalizedUserAgent.includes("iphone")) {
    return "iPhone";
  }

  if (normalizedUserAgent.includes("android")) {
    return "Android";
  }

  if (normalizedUserAgent.includes("windows")) {
    return "Windows";
  }

  if (normalizedUserAgent.includes("mac os")) {
    return "Mac";
  }

  return "Desktop / browser";
}

export default async function AccountPage() {
  const principal = await requireSession();
  const roleLabel = getSystemRoleLabel(principal.role);
  const avatar = principal.user.image ?? "";
  const locationLabel = principal.session.locationLabel ?? "Lokasi tidak tersedia";
  const ipAddress = principal.session.ipAddress ?? "IP tidak tersedia";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-md border border-[var(--dc-border-subtle)] bg-card/70 p-4 shadow-[var(--dc-shadow-card)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-14 rounded-full border border-[var(--dc-border-subtle)]">
            <AvatarImage src={avatar || undefined} alt={principal.user.name} />
            <AvatarFallback>{getInitials(principal.user.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate font-heading font-semibold text-foreground text-xl tracking-normal">Account</h1>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <p className="truncate text-muted-foreground text-sm">{principal.user.name}</p>
          </div>
        </div>
        <Badge variant={principal.user.emailVerified ? "default" : "outline"} className="self-start sm:self-center">
          {principal.user.emailVerified ? "Email terverifikasi" : "Email belum terverifikasi"}
        </Badge>
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-cyan-600 dark:text-[#14B8FF]" />
              Informasi Akun
            </CardTitle>
            <CardDescription>Identitas login dan sesi dashboard aktif.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <AtSign className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Email</p>
                  <p className="break-all text-muted-foreground">{principal.user.email}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Sesi Saat Ini</p>
                  <p className="break-words text-muted-foreground">
                    {ipAddress} - {locationLabel}
                  </p>
                  <p className="text-muted-foreground">{getDeviceLabel(principal.session.userAgent)}</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Sesi Berakhir</p>
                  <p className="text-muted-foreground">{formatDateTime(principal.session.expiresAt)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-cyan-600 dark:text-[#14B8FF]" />
              Ubah Password
            </CardTitle>
            <CardDescription>Password diganti untuk akun yang sedang login.</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountPasswordForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
