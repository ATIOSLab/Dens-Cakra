import { RoleCode } from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const PERMISSION_SEEDS: Array<[string, string, string]> = [
  ['dashboard.view', 'Lihat Dashboard', 'Mengakses dashboard dan ringkasan.'],
  ['user.view', 'Lihat Pengguna', 'Melihat data pengguna.'],
  ['user.create', 'Buat Pengguna', 'Membuat akun pengguna baru.'],
  ['user.update', 'Ubah Pengguna', 'Mengubah data pengguna.'],
  ['user.delete', 'Hapus Pengguna', 'Menonaktifkan pengguna.'],
  ['role.view', 'Lihat Role', 'Melihat daftar role.'],
  ['role.manage', 'Kelola Role', 'Membuat dan mengubah role.'],
  ['permission.view', 'Lihat Permission', 'Melihat daftar permission.'],
  ['permission.manage', 'Kelola Permission', 'Mengatur permission role.'],
  ['organization.view', 'Lihat Organisasi', 'Melihat struktur organisasi.'],
  ['organization.manage', 'Kelola Organisasi', 'Mengubah struktur organisasi.'],
  ['region.view', 'Lihat Wilayah', 'Melihat struktur wilayah.'],
  ['region.manage', 'Kelola Wilayah', 'Mengubah struktur wilayah.'],
  ['report.view', 'Lihat Laporan', 'Melihat laporan.'],
  ['report.create', 'Buat Laporan', 'Membuat laporan.'],
  ['report.verify', 'Verifikasi Laporan', 'Memverifikasi laporan.'],
  ['report.approve', 'Setujui Laporan', 'Menyetujui laporan.'],
  ['report.forward', 'Teruskan Laporan', 'Meneruskan laporan.'],
  ['command.view', 'Lihat Komando', 'Melihat garis komando.'],
  ['command.manage', 'Kelola Komando', 'Mengubah garis komando.'],
  ['supervision.view', 'Lihat Supervisi', 'Melihat assignment supervisi.'],
  ['supervision.manage', 'Kelola Supervisi', 'Mengubah assignment supervisi.'],
];

const POSITION_SEEDS: Array<[string, string, RoleCode, string]> = [
  ['KABIN', 'Kepala BIN (KaBIN)', RoleCode.NATIONAL_LEADER, 'BIN_LEVEL'],
  ['DEPUTI_II', 'Deputi II', RoleCode.EXECUTIVE, 'DEPUTY_LEVEL'],
  [
    'DIREKTUR_WILAYAH',
    'Direktur Wilayah',
    RoleCode.REGIONAL_COMMANDER,
    'DIRECTORATE_LEVEL',
  ],
  [
    'KABINDA',
    'Kepala BIN Daerah (Kabinda)',
    RoleCode.REGIONAL_COMMANDER,
    'BINDA_LEVEL',
  ],
  ['KABAOPS', 'Kabaops', RoleCode.REGIONAL_COMMANDER, 'BINDA_LEVEL'],
  ['KASUBDIT', 'Kasubdit', RoleCode.REGIONAL_COMMANDER, 'DIRECTORATE_LEVEL'],
  ['ANEV', 'Anev', RoleCode.EXECUTIVE, 'DEPUTY_LEVEL'],
  [
    'STAF_SUBDIT',
    'Staf Subdit',
    RoleCode.REGIONAL_COMMANDER,
    'DIRECTORATE_LEVEL',
  ],
  [
    'KORWIL',
    'Koordinator Wilayah (Korwil)',
    RoleCode.FIELD_COORDINATOR,
    'KORWIL_LEVEL',
  ],
  [
    'PETUGAS_ORGANIK',
    'Petugas Wilayah (Gaswil)',
    RoleCode.FIELD_OFFICER,
    'GASWIL_LEVEL',
  ],
];

async function main() {
  for (const [code, name, description] of PERMISSION_SEEDS) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, description, isActive: true },
      create: { code, name, description, isSystem: true, isActive: true },
    });
  }
  console.log(`Seeded ${PERMISSION_SEEDS.length} permissions.`);

  for (const [code, name, roleCode, organizationLevel] of POSITION_SEEDS) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { code: roleCode },
    });
    await prisma.position.upsert({
      where: { code },
      update: { name, roleId: role.id, organizationLevel, isActive: true },
      create: {
        code,
        name,
        roleId: role.id,
        organizationLevel,
        isSystem: true,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${POSITION_SEEDS.length} positions.`);
}

void main();
