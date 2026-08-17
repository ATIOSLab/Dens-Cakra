export const SYSTEM_ROLES = {
  ADMIN_SYSTEM: 'admin_system',
  NATIONAL_LEADER: 'national_leader',
  EXECUTIVE: 'executive',
  REGIONAL_COMMANDER: 'regional_commander',
  FIELD_COORDINATOR: 'field_coordinator',
  FIELD_OFFICER: 'field_officer',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_ROLE_CATALOG = [
  {
    key: SYSTEM_ROLES.NATIONAL_LEADER,
    label: 'Kepala BIN (KaBIN)',
    summary:
      'Pimpinan tertinggi BIN yang melihat dan mengendalikan seluruh cakupan nasional pada garis komando kewilayahan.',
  },
  {
    key: SYSTEM_ROLES.EXECUTIVE,
    label: 'Deputi II',
    summary:
      'Membuat direktif strategis, memantau situasi nasional, dan memberi persetujuan pada tingkat Deputi II.',
  },
  {
    key: SYSTEM_ROLES.REGIONAL_COMMANDER,
    label: 'Kepala BIN Daerah (Kabinda)',
    summary:
      'Menjabarkan direktif, mengendalikan operasi wilayah, serta melakukan review dan persetujuan regional.',
  },
  {
    key: SYSTEM_ROLES.FIELD_COORDINATOR,
    label: 'Koordinator Wilayah (Korwil)',
    summary:
      'Koordinator tingkat kabupaten/kota untuk membagi tugas ke Petugas Wilayah (Gaswil), memantau progres, personel, peta wilayah, dan laporan darurat.',
  },
  {
    key: SYSTEM_ROLES.FIELD_OFFICER,
    label: 'Petugas Wilayah (Gaswil)',
    summary:
      'Petugas Wilayah (Gaswil) yang membina Jaring, menerima Laporan Jaring melalui WhatsApp, melakukan klarifikasi dan verifikasi awal, serta menyusun Draf Baket.',
  },
  {
    key: SYSTEM_ROLES.ADMIN_SYSTEM,
    label: 'Admin Sistem',
    summary:
      'Mengelola organisasi, pengguna, reporting line, integrasi WA Center, keamanan, dan konfigurasi sistem.',
  },
] as const;
