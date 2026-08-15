import type { ElementType } from "react";

import Link from "next/link";

import { ArrowRight, CheckCircle2, Mail, Route, ShieldCheck, UserCog } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import { SYSTEM_ROLES } from "@/navigation/sidebar/system-roles";

type AdminModule = {
  title: string;
  label: string;
  href: string;
  Icon: ElementType;
  iconClass: string;
};

type AdminModuleGroup = {
  title: string;
  description: string;
  modules: AdminModule[];
};

const adminModuleGroups: AdminModuleGroup[] = [
  {
    title: DOMAIN_TERMS.adminAccountAccessGroup,
    description: "Pengelolaan akun pengguna, role teknis, dan hak akses sistem.",
    modules: [
      {
        title: "Pengguna",
        label: "Akun pengguna, status, sesi, dan penugasan aktif.",
        href: "/dashboard/admin-system/pengguna",
        Icon: DOMAIN_VISUALS.user.Icon,
        iconClass: DOMAIN_VISUALS.user.iconClass,
      },
      {
        title: DOMAIN_TERMS.roleAccessSettings,
        label: "Matriks role, menu, kewenangan tindakan, dan cakupan data.",
        href: "/dashboard/admin-system/role-hak-akses",
        Icon: UserCog,
        iconClass: DOMAIN_VISUALS.admin.iconClass,
      },
    ],
  },
  {
    title: DOMAIN_TERMS.adminStructureScopeGroup,
    description: "Relasi jabatan, alur pelaporan, dan aturan cakupan supervisi.",
    modules: [
      {
        title: "Wilayah Supervisi DKI",
        label: "Konfigurasi cakupan Direktorat/Ditwil berbasis Kota/Kabupaten DKI.",
        href: "/dashboard/admin-system/supervisi-dki",
        Icon: DOMAIN_VISUALS.intelligenceNetworkMap.Icon,
        iconClass: DOMAIN_VISUALS.intelligenceNetworkMap.iconClass,
      },
    ],
  },
  {
    title: DOMAIN_TERMS.adminReferenceDataGroup,
    description: "Master data yang menjadi referensi lintas halaman operasional.",
    modules: [
      {
        title: "Master Data",
        label: "Kategori Baket dan pekerjaan Jaring yang dipakai sistem.",
        href: "/dashboard/admin-system/master-data",
        Icon: DOMAIN_VISUALS.intelligenceReport.Icon,
        iconClass: DOMAIN_VISUALS.intelligenceReport.iconClass,
      },
    ],
  },
  {
    title: DOMAIN_TERMS.adminWhatsappEmailGroup,
    description: "Koneksi WhatsApp Center, log sesi, penerima notifikasi, dan SMTP.",
    modules: [
      {
        title: DOMAIN_TERMS.whatsappIntegration,
        label: "Koneksi WhatsApp Center dan nomor pengirim operasional.",
        href: "/dashboard/admin-system/integrasi-wa-center",
        Icon: DOMAIN_VISUALS.jaringReport.Icon,
        iconClass: DOMAIN_VISUALS.jaringReport.iconClass,
      },
      {
        title: DOMAIN_TERMS.whatsappActivityLog,
        label: "Riwayat login, logout, terputus, pulih, dan error sesi WhatsApp.",
        href: "/dashboard/admin-system/log-aktivitas-whatsapp",
        Icon: DOMAIN_VISUALS.monitoring.Icon,
        iconClass: DOMAIN_VISUALS.monitoring.iconClass,
      },
      {
        title: DOMAIN_TERMS.whatsappNotificationSettings,
        label: "Daftar email penerima notifikasi status WhatsApp.",
        href: "/dashboard/admin-system/notifikasi-whatsapp",
        Icon: DOMAIN_VISUALS.notification.Icon,
        iconClass: DOMAIN_VISUALS.notification.iconClass,
      },
      {
        title: DOMAIN_TERMS.smtpSettings,
        label: "Konfigurasi server email custom untuk pengiriman notifikasi.",
        href: "/dashboard/admin-system/pengaturan-smtp",
        Icon: Mail,
        iconClass: DOMAIN_VISUALS.notification.iconClass,
      },
    ],
  },
  {
    title: DOMAIN_TERMS.adminSecurityAuditGroup,
    description: "Pemantauan aktivitas admin, sesi, dan jejak audit sistem.",
    modules: [
      {
        title: DOMAIN_TERMS.adminSecurityAuditGroup,
        label: "Log aktivitas, audit sistem, dan sesi pengguna.",
        href: "/dashboard/admin-system/keamanan-audit",
        Icon: ShieldCheck,
        iconClass: DOMAIN_VISUALS.admin.iconClass,
      },
    ],
  },
];

const adminModules = adminModuleGroups.flatMap((group) => group.modules);

export async function AdminSystemDashboardPage() {
  const principal = await requireRole(SYSTEM_ROLES.ADMIN_SYSTEM);

  const summary = [
    { label: "Role Akun", value: DOMAIN_TERMS.adminSystemRole },
    { label: "Klaster Menu", value: String(adminModuleGroups.length) },
    { label: "Menu Aktif", value: String(adminModules.length) },
  ];

  return (
    <div className="dc-page @container/main">
      <PageHeader
        title="Beranda Admin Sistem"
        description="Ruang kerja akun sistem untuk pengelolaan akun, akses, struktur, cakupan, data referensi, integrasi, dan audit."
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
            <CardDescription>Akun sistem adalah admin teknis, bukan jabatan struktural operasional.</CardDescription>
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
              <p className="mt-1 font-medium">Administrasi sistem lintas modul</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Kelengkapan Menu</CardTitle>
            <CardDescription>Klaster menu Admin Sistem yang tersedia.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {adminModuleGroups.map((group) => (
              <div key={group.title} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{group.title}</span>
                <span className="font-mono font-semibold tabular-nums">{group.modules.length}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {adminModuleGroups.map((group) => (
        <section key={group.title} className="space-y-3">
          <div className="border-b pb-2">
            <p className={DC_TYPOGRAPHY.tableHeader}>{DOMAIN_TERMS.adminSystemRole}</p>
            <h2 className="mt-1 font-heading font-semibold text-lg tracking-normal">{group.title}</h2>
            <p className="mt-1 text-muted-foreground text-sm">{group.description}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.modules.map((module) => {
              const Icon = module.Icon;

              return (
                <Card key={module.href} className="transition-colors hover:border-primary/45">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[var(--dc-radius-md)] border border-border bg-muted/35">
                        <Icon className={cn("size-5", module.iconClass)} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <CardDescription className={DC_TYPOGRAPHY.tableHeader}>{group.title}</CardDescription>
                        <CardTitle className="mt-1 text-base">{module.title}</CardTitle>
                      </div>
                      <Badge className="shrink-0 gap-1 border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="size-3" />
                        Aktif
                      </Badge>
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
          </div>
        </section>
      ))}
    </div>
  );
}
