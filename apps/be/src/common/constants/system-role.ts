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
    label: 'Executive',
    summary:
      'Membuat STR/UUK, memberi arahan strategis, dan memantau keluaran intelijen yang sudah disetujui.',
  },
  {
    key: SYSTEM_ROLES.REGIONAL_COMMANDER,
    label: 'Regional Commander',
    summary:
      'Menerima direktif, mengendalikan wilayah, serta melakukan review dan approval laporan.',
  },
  {
    key: SYSTEM_ROLES.OPERATIONAL_INTELLIGENCE_MANAGER,
    label: 'Operational Intelligence Manager',
    summary:
      'Mengelola assignment, memverifikasi BAKET, dan menyusun draft intelligence report.',
  },
  {
    key: SYSTEM_ROLES.FIELD_COORDINATOR,
    label: 'Field Coordinator',
    summary:
      'Membagi assignment ke Field Officer dan memantau progres personel lapangan.',
  },
  {
    key: SYSTEM_ROLES.FIELD_OFFICER,
    label: 'Field Officer',
    summary:
      'Melaksanakan tugas lapangan, memvalidasi incoming information, dan membuat BAKET.',
  },
  {
    key: SYSTEM_ROLES.ADMIN_SYSTEM,
    label: 'Admin System',
    summary:
      'Mengelola user, role, permission, keamanan, dan konfigurasi teknis aplikasi.',
  },
] as const;
