import type { ElementType } from "react";

import Link from "next/link";

import { ArrowRight, CheckCircle2, CircleDashed, Mail, Route, ShieldCheck, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

type AdminModuleStatus = "aktif" | "disiapkan";

type AdminModule = {
  title: string;
  label: string;
  href: string;
  area: "Akun" | "Data" | "Integrasi" | "Audit" | "Konfigurasi";
  status: AdminModuleStatus;
  Icon: ElementType;
  iconClass: string;
};

const adminModules: AdminModule[] = [
  {
    title: "Pengguna",
    label: "Akun dan akses",
    href: "/dashboard/admin-system/pengguna",
    area: "Akun",
    status: "aktif",
    Icon: DOMAIN_VISUALS.user.Icon,
    iconClass: DOMAIN_VISUALS.user.iconClass,
  },
  {
    title: DOMAIN_TERMS.roleAccessSettings,
    label: "Kewenangan sistem",
    href: "/dashboard/admin-system/role-hak-akses",
    area: "Akun",
    status: "disiapkan",
    Icon: UserCog,
    iconClass: DOMAIN_VISUALS.admin.iconClass,
  },
  {
    title: DOMAIN_TERMS.positionReportingLine,
    label: "Relasi jabatan",
    href: "/dashboard/admin-system/jabatan-reporting-line",
    area: "Akun",
    status: "aktif",
    Icon: Route,
    iconClass: DOMAIN_VISUALS.admin.iconClass,
  },
  {
    title: "Supervisi DKI",
    label: "Aturan cakupan",
    href: "/dashboard/admin-system/supervisi-dki",
    area: "Konfigurasi",
    status: "aktif",
    Icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
    iconClass: DOMAIN_VISUALS.intelligenceNetworkMap.iconClass,
  },
  {
    title: "Master Data",
    label: "Referensi sistem",
    href: "/dashboard/admin-system/master-data",
    area: "Data",
    status: "aktif",
    Icon: DOMAIN_VISUALS.intelligenceReport.Icon,
    iconClass: DOMAIN_VISUALS.intelligenceReport.iconClass,
  },
  {
    title: DOMAIN_TERMS.whatsappIntegration,
    label: "Koneksi WA Center",
    href: "/dashboard/admin-system/integrasi-wa-center",
    area: "Integrasi",
    status: "aktif",
    Icon: DOMAIN_VISUALS.jaringReport.Icon,
    iconClass: DOMAIN_VISUALS.jaringReport.iconClass,
  },
  {
    title: DOMAIN_TERMS.whatsappActivityLog,
    label: "Aktivitas sesi WA",
    href: "/dashboard/admin-system/log-aktivitas-whatsapp",
    area: "Audit",
    status: "aktif",
    Icon: DOMAIN_VISUALS.monitoring.Icon,
    iconClass: DOMAIN_VISUALS.monitoring.iconClass,
  },
  {
    title: DOMAIN_TERMS.whatsappNotificationSettings,
    label: "Penerima notifikasi",
    href: "/dashboard/admin-system/notifikasi-whatsapp",
    area: "Integrasi",
    status: "aktif",
    Icon: DOMAIN_VISUALS.notification.Icon,
    iconClass: DOMAIN_VISUALS.notification.iconClass,
  },
  {
    title: DOMAIN_TERMS.smtpSettings,
    label: "Server email custom",
    href: "/dashboard/admin-system/pengaturan-smtp",
    area: "Integrasi",
    status: "aktif",
    Icon: Mail,
    iconClass: DOMAIN_VISUALS.notification.iconClass,
  },
  {
    title: "Keamanan & Audit",
    label: "Log dan sesi",
    href: "/dashboard/admin-system/keamanan-audit",
    area: "Audit",
    status: "aktif",
    Icon: ShieldCheck,
    iconClass: DOMAIN_VISUALS.admin.iconClass,
  },
  {
    title: "Konfigurasi Sistem",
    label: "Parameter aplikasi",
    href: "/dashboard/admin-system/konfigurasi-sistem",
    area: "Konfigurasi",
    status: "disiapkan",
    Icon: DOMAIN_VISUALS.command.Icon,
    iconClass: DOMAIN_VISUALS.command.iconClass,
  },
];

const statusConfig = {
  aktif: {
    label: "Aktif",
    Icon: CheckCircle2,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  disiapkan: {
    label: "Disiapkan",
    Icon: CircleDashed,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
} satisfies Record<AdminModuleStatus, { label: string; Icon: ElementType; className: string }>;

function StatusBadge({ status }: { status: AdminModuleStatus }) {
  const config = statusConfig[status];
  const Icon = config.Icon;

  return (
    <Badge className={cn("gap-1", config.className)}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  );
}

export async function AdminSystemDashboardPage() {
  const principal = await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);
  const activeModules = adminModules.filter((module) => module.status === "aktif").length;
  const preparedModules = adminModules.length - activeModules;

  const summary = [
    { label: "Role Akun", value: DOMAIN_TERMS.adminSystemRole },
    { label: "Modul Aktif", value: String(activeModules) },
    { label: "Modul Disiapkan", value: String(preparedModules) },
  ];

  return (
    <div className="dc-page @container/main">
      <PageHeader
        title="Beranda Admin Sistem"
        description="Ruang kerja akun sistem untuk pengelolaan pengguna, akses, data referensi, integrasi, audit, dan konfigurasi."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {DOMAIN_TERMS.adminSystemRole}
            </Badge>
            <Badge variant="outline">{DOMAIN_TERMS.systemAccount}</Badge>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label} size="sm">
            <CardHeader>
              <CardDescription className={DC_TYPOGRAPHY.tableHeader}>{item.label}</CardDescription>
              <CardTitle className="truncate text-xl [font-family:var(--dc-font-metadata)]">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.42fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Identitas Akun</CardTitle>
            <CardDescription>Profil login aktif dan role sistem.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--dc-radius-md)] border border-border bg-muted/25 p-3">
              <p className={DC_TYPOGRAPHY.tableHeader}>Nama</p>
              <p className="mt-1 truncate font-medium">{principal.user.name}</p>
            </div>
            <div className="rounded-[var(--dc-radius-md)] border border-border bg-muted/25 p-3">
              <p className={DC_TYPOGRAPHY.tableHeader}>Email</p>
              <p className="mt-1 truncate font-medium">{principal.user.email}</p>
            </div>
            <div className="rounded-[var(--dc-radius-md)] border border-border bg-muted/25 p-3">
              <p className={DC_TYPOGRAPHY.tableHeader}>Jenis Akun</p>
              <p className="mt-1 font-medium">{DOMAIN_TERMS.systemAccount}</p>
            </div>
            <div className="rounded-[var(--dc-radius-md)] border border-border bg-muted/25 p-3">
              <p className={DC_TYPOGRAPHY.tableHeader}>Cakupan</p>
              <p className="mt-1 font-medium">Administrasi Sistem</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Kelengkapan Menu</CardTitle>
            <CardDescription>Menu Admin Sistem yang tersedia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {["Akun", "Data", "Integrasi", "Audit", "Konfigurasi"].map((area) => {
              const count = adminModules.filter((module) => module.area === area).length;

              return (
                <div key={area} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{area}</span>
                  <span className="font-mono font-semibold tabular-nums">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {adminModules.map((module) => {
          const Icon = module.Icon;

          return (
            <Card key={module.href} className="transition-colors hover:border-primary/45">
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--dc-radius-md)] border border-border bg-muted/35">
                    <Icon className={cn("size-5", module.iconClass)} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardDescription className={DC_TYPOGRAPHY.tableHeader}>{module.area}</CardDescription>
                    <CardTitle className="mt-1 text-base">{module.title}</CardTitle>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={module.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm text-muted-foreground">{module.label}</p>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={module.href}>
                    Buka
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
