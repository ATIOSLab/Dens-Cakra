import Link from "next/link";

import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DOMAIN_TERMS } from "@/lib/domain/terminology";
import { DC_TYPOGRAPHY, DOMAIN_VISUALS } from "@/lib/domain/visual-system";
import { cn } from "@/lib/utils";
import { getSidebarItemsForRole } from "@/navigation/sidebar/sidebar-items";
import { SYSTEM_ROLE_LABELS, SYSTEM_ROLES, type SystemRole } from "@/navigation/sidebar/system-roles";

type RoleAccessProfile = {
  id: SystemRole;
  functionLabel: string;
  accessScope: string;
  actions: string[];
  policy: string;
};

export const ROLE_ACCESS_PROFILES: RoleAccessProfile[] = [
  {
    id: SYSTEM_ROLES.EXECUTIVE,
    functionLabel: "Pengendalian nasional Kedeputian II",
    accessScope: "Cakupan nasional dalam domain Kedeputian II.",
    actions: ["Lihat", "Setujui", "Teruskan", "Berikan arahan", "Ekspor"],
    policy: "Membaca data lintas wilayah sesuai domain Kedeputian II dan kewenangan pimpinan.",
  },
  {
    id: SYSTEM_ROLES.REGIONAL_COMMANDER,
    functionLabel: "Komando dan supervisi wilayah",
    accessScope: "Provinsi atau Kota/Kabupaten DKI sesuai UserAreaScope aktif.",
    actions: ["Lihat", "Verifikasi", "Teruskan", "Disposisi", "Ekspor"],
    policy: "Cakupan Direktorat/Ditwil ditentukan dari penugasan aktif dan wilayah supervisi, bukan hardcode.",
  },
  {
    id: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
    functionLabel: "Analisis dan evaluasi operasional",
    accessScope: "Unit organisasi, fungsi Anev, dan wilayah penugasan aktif.",
    actions: ["Lihat", "Buat", "Ubah", "Verifikasi", "Kembalikan untuk perbaikan"],
    policy: "Fungsi Anev melekat pada pengguna dan tidak mengubah garis komando kewilayahan.",
  },
  {
    id: SYSTEM_ROLES.FIELD_COORDINATOR,
    functionLabel: DOMAIN_TERMS.fieldCoordinatorRole,
    accessScope: "Kabupaten/Kota penugasan beserta Gaswil, Jaring, dan laporan di bawahnya.",
    actions: ["Lihat", "Buat", "Ubah", "Verifikasi", "Berikan arahan"],
    policy: "Korwil berada pada level kabupaten/kota dan membina Petugas Wilayah (Gaswil).",
  },
  {
    id: SYSTEM_ROLES.FIELD_OFFICER,
    functionLabel: DOMAIN_TERMS.fieldOfficer,
    accessScope: "Kecamatan penugasan dan Jaring binaannya.",
    actions: ["Lihat", "Buat", "Ubah", "Verifikasi", "Kembalikan untuk perbaikan"],
    policy: "Gaswil mengelola Jaring binaan dan laporan dalam wilayah penugasannya.",
  },
  {
    id: SYSTEM_ROLES.ADMIN_SYSTEM,
    functionLabel: DOMAIN_TERMS.systemAccount,
    accessScope: "Administrasi sistem lintas modul, tanpa jabatan struktural operasional.",
    actions: ["Kelola pengguna", "Ubah", "Audit", "Cabut sesi", "Kelola konfigurasi"],
    policy: "Akun sistem untuk pengelolaan teknis, bukan struktur komando BIN.",
  },
];

function flattenMenus(role: SystemRole) {
  return getSidebarItemsForRole(role).flatMap((group) =>
    group.items.flatMap((item) => {
      if ("subItems" in item && item.subItems) {
        return item.subItems.map((subItem) => subItem.title);
      }
      return [item.title];
    }),
  );
}

function RoleMenus({ role }: { role: SystemRole }) {
  const menus = flattenMenus(role);

  return (
    <div className="flex flex-wrap gap-1.5">
      {menus.slice(0, 8).map((menu) => (
        <Badge key={menu} variant="outline" className="max-w-full truncate">
          {menu}
        </Badge>
      ))}
      {menus.length > 8 ? <Badge variant="secondary">+{menus.length - 8} menu</Badge> : null}
    </div>
  );
}

export function RoleHakAksesPageContent() {
  const adminProfile = ROLE_ACCESS_PROFILES.find((profile) => profile.id === SYSTEM_ROLES.ADMIN_SYSTEM);

  return (
    <div className="dc-page @container/main">
      <PageHeader
        title={DOMAIN_TERMS.roleAccessSettings}
        description="Matriks role sistem, menu, cakupan data, dan kewenangan tindakan. Cakupan operasional tetap dihitung dari penugasan aktif dan wilayah penugasan."
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {DOMAIN_TERMS.adminSystemRole}
            </Badge>
            <Badge variant="outline">RBAC aktif</Badge>
          </div>
        }
      />

      <section className="grid gap-3 md:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Role Sistem</CardDescription>
            <CardTitle className="text-xl [font-family:var(--dc-font-metadata)]">
              {ROLE_ACCESS_PROFILES.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Akun Sistem</CardDescription>
            <CardTitle className="truncate text-xl [font-family:var(--dc-font-metadata)]">
              {adminProfile?.functionLabel ?? DOMAIN_TERMS.systemAccount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription className={DC_TYPOGRAPHY.tableHeader}>Sumber Cakupan</CardDescription>
            <CardTitle className="truncate text-xl [font-family:var(--dc-font-metadata)]">Penugasan Aktif</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className={cn("size-5", DOMAIN_VISUALS.admin.iconClass)} />
            <CardTitle>Matriks Role dan Hak Akses</CardTitle>
          </div>
          <CardDescription>Role teknis tetap stabil; label tampilan mengikuti glosarium sistem.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b bg-muted/35 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Fungsi</th>
                  <th className="px-4 py-3 font-semibold">Cakupan Data</th>
                  <th className="px-4 py-3 font-semibold">Kewenangan</th>
                  <th className="px-4 py-3 font-semibold">Menu Tersedia</th>
                  <th className="w-28 px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ROLE_ACCESS_PROFILES.map((profile) => (
                  <tr key={profile.id} className="align-top transition-colors hover:bg-muted/20">
                    <td className="px-4 py-4">
                      <div className="font-semibold">{SYSTEM_ROLE_LABELS[profile.id]}</div>
                      <div className="mt-1 font-mono text-muted-foreground text-xs">{profile.id}</div>
                    </td>
                    <td className="px-4 py-4">{profile.functionLabel}</td>
                    <td className="max-w-[280px] px-4 py-4 text-muted-foreground">{profile.accessScope}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {profile.actions.map((action) => (
                          <Badge key={action} variant="secondary">
                            {action}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-[320px] px-4 py-4">
                      <RoleMenus role={profile.id} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/admin-system/role-hak-akses/${profile.id}`}>
                          Detail
                          <ArrowRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <CardTitle>Aturan Validasi</CardTitle>
          </div>
          <CardDescription>Prinsip yang harus tetap berlaku pada seluruh halaman dan API.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            "Akses dihitung dari role, fungsi, unit organisasi, wilayah penugasan, dan kewenangan tindakan.",
            "Filter wilayah harus berjenjang dan tidak boleh keluar dari cakupan aktif pengguna.",
            "Akun Sistem adalah akun teknis Admin Sistem, bukan jabatan struktural operasional.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-[var(--dc-radius-md)] border bg-muted/20 p-3 text-sm text-muted-foreground"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export function RoleHakAksesDetailContent({ role }: { role: SystemRole }) {
  const profile = ROLE_ACCESS_PROFILES.find((item) => item.id === role);
  if (!profile) return null;

  return (
    <div className="dc-page @container/main">
      <PageHeader
        title={`Detail ${DOMAIN_TERMS.roleAccessSettings}`}
        description={`Detail cakupan, kewenangan, dan menu untuk ${SYSTEM_ROLE_LABELS[role]}.`}
        backButton
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300">
              {DOMAIN_TERMS.adminSystemRole}
            </Badge>
            <Badge variant="outline">{role}</Badge>
          </div>
        }
      />

      <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.38fr)]">
        <Card>
          <CardHeader className="border-b">
            <CardTitle>{SYSTEM_ROLE_LABELS[role]}</CardTitle>
            <CardDescription>{profile.policy}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[var(--dc-radius-md)] border bg-muted/20 p-3">
              <p className={DC_TYPOGRAPHY.tableHeader}>Fungsi</p>
              <p className="mt-1 font-medium">{profile.functionLabel}</p>
            </div>
            <div className="rounded-[var(--dc-radius-md)] border bg-muted/20 p-3">
              <p className={DC_TYPOGRAPHY.tableHeader}>Cakupan Data</p>
              <p className="mt-1 text-muted-foreground text-sm">{profile.accessScope}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle>Kewenangan</CardTitle>
            <CardDescription>Tindakan utama yang relevan.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {profile.actions.map((action) => (
              <Badge key={action} variant="secondary">
                {action}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Menu Tersedia</CardTitle>
          <CardDescription>Daftar ini dibaca dari sumber sidebar yang sama dengan navigasi aplikasi.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {flattenMenus(role).map((menu) => (
            <div key={menu} className="rounded-[var(--dc-radius-md)] border bg-muted/20 px-3 py-2 text-sm">
              {menu}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
