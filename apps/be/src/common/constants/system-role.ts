export const SYSTEM_ROLES = {
  EXECUTIVE: 'executive',
  REGIONAL_COMMANDER: 'regional_commander',
  OPERATIONAL_INTELLIGENCE_MANAGER: 'operational_intelligence_manager',
  FIELD_COORDINATOR: 'field_coordinator',
  FIELD_OFFICER: 'field_officer',
  ADMIN_SYSTEM: 'admin_system',
} as const;

export type SystemRole = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_ROLE_CATALOG = [
  {
    key: SYSTEM_ROLES.EXECUTIVE,
    label: 'Eksekutif',
    summary:
      'Membuat direktif strategis, memantau situasi nasional, dan memberi persetujuan eksekutif atas keluaran intelijen.',
  },
  {
    key: SYSTEM_ROLES.REGIONAL_COMMANDER,
    label: 'Komandan Regional',
    summary:
      'Menjabarkan direktif, mengendalikan operasi wilayah, serta melakukan review dan persetujuan regional.',
  },
  {
    key: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
    label: 'Manajer Intelijen Operasional',
    summary:
      'Menerima Baket, melakukan verifikasi formal dan Neraca Penilaian, lalu menyusun produk intelijen.',
  },
  {
    key: SYSTEM_ROLES.FIELD_COORDINATOR,
    label: 'Koordinator Lapangan',
    summary:
      'Lapisan koordinasi lapangan untuk membagi tugas ke Field Officer, memantau progres, personel, peta lapangan, dan laporan darurat.',
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
