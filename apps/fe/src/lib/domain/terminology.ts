/**
 * Canonical user-facing terminology from
 * "Struktur Hierarki, Role, dan Alur Informasi Sistem".
 *
 * Technical role codes, route segments, API fields, and persisted enum values
 * remain unchanged for backward compatibility.
 */
export const DOMAIN_TERMS = {
  nationalAgency: "Badan Intelijen Negara",
  nationalLeader: "Kepala BIN (KaBIN)",
  deputyUnit: "Kedeputian II",
  deputyLeader: "Deputi II",
  directorateUnit: "Direktorat 21–25",
  directorateLeader: "Direktur 21–25",
  regionalUnit: "BIN Daerah (Binda)",
  regionalLeader: "Kepala BIN Daerah (Kabinda)",
  regionalCoordinator: "Koordinator Wilayah (Korwil)",
  fieldOfficer: "Petugas Wilayah (Gaswil)",
  personnel: "Personel",
  jaring: "Jaring",
  jaringName: "Nama Jaring",
  jaringAvatar: "Foto Jaring",
  jaringWhatsApp: "Nomor WhatsApp",
  jaringCode: "Kode Jaring",
  jaringCaretaker: "Petugas Wilayah (Gaswil)",
  jaringPlacementArea: "Wilayah Penempatan",
  jaringReport: "Laporan Jaring",
  completeJaringReport: "Laporan Jaring Lengkap",
  incompleteJaringReport: "Laporan Jaring Tidak Lengkap",
  baket: "Bahan Keterangan (Baket)",
  jaringCoachingHistory: "Riwayat Pembinaan Jaring",
  intelligenceNetworkMap: "Peta Jejaring Intelijen",
  whatsappIntegration: "Integrasi WhatsApp",
  draftBaket: "Draf Baket",
  validatedBaket: "Baket Tervalidasi",
  regionalIntelligenceReport: "Laporan Intelijen Binda",
  directorateIntelligenceReport: "Laporan Intelijen Direktorat",
  deputyIntelligenceProduct: "Produk Kedeputian II",
  assignmentArea: "Wilayah Penugasan",
  fieldOfficerDistrict: "Kecamatan Penugasan",
  registeredJaringLocation: "Wilayah Penempatan Jaring",
  actualReportLocation: "Lokasi Aktual Laporan",
  locationSuitability: "Status Kesesuaian Lokasi dengan Wilayah Penugasan",
} as const;
