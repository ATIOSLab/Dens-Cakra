import { DensModulePage } from "@/app/(main)/dashboard/_components/dens-module-page";

export function RoleHakAksesPage() {
  return (
    <DensModulePage
      title="Role & Hak Akses"
      role="Admin Sistem"
      description="Halaman ini disiapkan untuk mengatur permission, visibilitas menu, scope unit, scope wilayah, dan akses klasifikasi."
      highlights={[
        "Mapping permission create, read, update, review, dan approve per role.",
        "Pengaturan menu visibility dan pembatasan scope data.",
        "Jejak perubahan permission untuk kebutuhan audit.",
      ]}
    />
  );
}
