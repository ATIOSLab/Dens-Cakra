import {
  Classification,
  CommandRouteType,
  DirectiveStatus,
  PositionCode,
  PriorityLevel,
  RecipientStatus,
  RoleCode,
  TaskAssignmentStatus,
  TaskStatus,
  UukStrSectionType,
  UukStrStatus,
} from '../generated/prisma/client.js';
import { prisma } from '../modules/prisma/prisma.service.js';

const SEED_TAG = '[SEED_STR_HIERARCHY]';
const directiveBaseDate = new Date('2026-07-01T08:00:00.000Z');
const STR_VARIANTS_PER_CHAIN = 6;
const STR_UUK_MARKER_START = '<!--DENS_CAKRA_STR_UUK_START-->';
const STR_UUK_MARKER_END = '<!--DENS_CAKRA_STR_UUK_END-->';
const UUK_SECTION_ORDER = [
  UukStrSectionType.BASIS_BACKGROUND,
  UukStrSectionType.INVESTIGATION_TARGETS,
  UukStrSectionType.EEI_PIR,
  UukStrSectionType.COLLECTION_PLAN,
  UukStrSectionType.THREAT_RISK_ANALYSIS,
  UukStrSectionType.IMPLEMENTATION_MECHANISM,
  UukStrSectionType.COORDINATION_REPORTING,
  UukStrSectionType.RECOMMENDATION,
  UukStrSectionType.AUTHENTICATION,
] as const;

type AssignmentNode = {
  id: string;
  email: string;
  fullName: string | null;
  positionId: string;
  positionCode: PositionCode;
  positionTitle: string;
  roleCode: RoleCode;
  organizationUnitId: string;
  organizationUnitCode: string;
  organizationUnitName: string;
  branch: CommandRouteType | null;
  reportsToPositionId: string | null;
  areaScopes: Array<{
    areaId: string;
    areaCode: string | null;
    areaName: string;
    isPrimary: boolean;
  }>;
};

type HierarchyChain = {
  regionalCommander: AssignmentNode;
  operationalManager: AssignmentNode;
  fieldCoordinators: Array<{
    coordinator: AssignmentNode;
    fieldOfficers: AssignmentNode[];
  }>;
};

type UukSectionSeed = {
  sectionType: UukStrSectionType;
  title: string;
  items: Array<{
    itemCode: string;
    content: string;
    orderNumber: number;
  }>;
};

type StrScenario = {
  category: string;
  title: string;
  issue: string;
  objective: string;
  background: string[];
  targets: string[];
  eei: string[];
  collection: string[];
  risks: string[];
  mechanisms: string[];
  reporting: string[];
  recommendations: string[];
  classification: Classification;
  urgency: PriorityLevel;
};

type AssignmentStage = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';

const STR_SCENARIOS: readonly StrScenario[] = [
  {
    category: 'Politik',
    title: 'Pemantauan Stabilitas Politik dan Konsolidasi Massa',
    issue:
      'perkembangan komunikasi politik, konsolidasi kelompok masyarakat, dan potensi penyampaian aspirasi di ruang publik',
    objective:
      'memastikan pimpinan memperoleh gambaran dini mengenai aktor, agenda, pola mobilisasi, dan potensi dampak terhadap stabilitas wilayah',
    background: [
      'Dinamika agenda politik lokal dan nasional dapat memicu peningkatan komunikasi antar komunitas, kelompok kepentingan, dan simpul massa.',
      'Wilayah sasaran memiliki pusat pemerintahan, ruang publik, serta simpul transportasi yang dapat menjadi titik kumpul atau jalur pergerakan peserta.',
      'Informasi awal perlu dipilah antara aspirasi yang berjalan wajar, indikasi mobilisasi terencana, dan potensi gangguan ketertiban.',
    ],
    targets: [
      'Mengidentifikasi aktor penggerak, jejaring komunikasi, titik kumpul, dan agenda kegiatan yang berkaitan dengan konsolidasi massa.',
      'Memetakan hubungan antara isu lokal, narasi digital, dan potensi aksi lapangan di wilayah sasaran.',
      'Menilai kesiapan jalur komunikasi berjenjang untuk mendukung peringatan dini kepada pimpinan.',
    ],
    eei: [
      'Siapa aktor utama, simpul penghubung, dan kelompok pendukung yang terindikasi aktif melakukan konsolidasi?',
      'Apa agenda, tuntutan, estimasi waktu, titik kumpul, rute pergerakan, dan target lokasi kegiatan?',
      'Bagaimana narasi yang berkembang di media sosial dan apakah narasi tersebut berkorelasi dengan aktivitas lapangan?',
      'Apa indikator eskalasi yang membutuhkan laporan cepat kepada OIM dan Regional Commander?',
    ],
    collection: [
      'Mengumpulkan laporan awal dari Field Officer pada titik pemerintahan, ruang publik, kampus, komunitas, dan simpul transportasi.',
      'Membandingkan temuan lapangan dengan pemantauan sumber terbuka untuk membedakan informasi valid, rumor, dan disinformasi.',
      'Melakukan pembaruan situasi setiap hari atau lebih cepat bila ditemukan indikator mobilisasi yang meningkat.',
      'Menyusun ringkasan aktor, agenda, lokasi, estimasi massa, dan rekomendasi langkah lanjutan.',
    ],
    risks: [
      'Konsolidasi yang tidak terdeteksi dini dapat menyebabkan keterlambatan koordinasi pengamanan terbuka dan pengaturan lalu lintas.',
      'Narasi provokatif berpotensi memperluas partisipasi dan mengubah aksi terbatas menjadi kegiatan dengan dampak wilayah lebih luas.',
      'Kesalahan penilaian terhadap aktor dan agenda dapat menimbulkan respons yang tidak proporsional.',
    ],
    mechanisms: [
      'Regional Commander menetapkan prioritas pemantauan dan menyampaikan batasan informasi yang wajib dilaporkan.',
      'OIM menerjemahkan STR menjadi task harian, membagi fokus area, dan memastikan validasi silang setiap temuan penting.',
      'Field Coordinator mengatur ritme laporan Field Officer dan memastikan titik pantau tidak tumpang tindih.',
      'Field Officer melaporkan fakta lapangan, waktu, lokasi, sumber, bukti pendukung, dan tingkat keyakinan informasi.',
    ],
    reporting: [
      'Laporan awal dikirim maksimal 6 jam setelah indikator kegiatan ditemukan.',
      'Laporan perkembangan memuat perubahan aktor, jumlah peserta, lokasi, narasi, dan potensi dampak operasional.',
      'Setiap informasi yang belum terkonfirmasi diberi catatan status verifikasi agar tidak diperlakukan sebagai kepastian.',
    ],
    recommendations: [
      'Prioritaskan pemetaan aktor dan titik kumpul sebelum kegiatan mencapai skala besar.',
      'Siapkan pembaruan singkat untuk pimpinan apabila ditemukan rute pergerakan, ajakan terbuka, atau potensi gangguan fasilitas publik.',
      'Tingkatkan koordinasi lintas area apabila narasi digital dan pergerakan lapangan menunjukkan pola yang sama.',
    ],
    classification: Classification.RAHASIA,
    urgency: PriorityLevel.HIGH,
  },
  {
    category: 'Ekonomi',
    title: 'Pemantauan Distribusi Komoditas dan Tekanan Harga',
    issue:
      'perubahan pasokan bahan pokok, tekanan harga, dan potensi gangguan distribusi komoditas strategis',
    objective:
      'mendukung deteksi dini terhadap kelangkaan, penimbunan, gangguan rantai pasok, dan persepsi publik yang dapat memengaruhi stabilitas ekonomi wilayah',
    background: [
      'Perubahan jadwal pasokan, kenaikan permintaan, dan hambatan distribusi dapat memicu kenaikan harga pada tingkat pengecer.',
      'Pasar induk, gudang logistik, pelabuhan, sentra transportasi, dan pusat belanja menjadi titik penting untuk membaca kondisi aktual pasokan.',
      'Informasi ekonomi perlu diverifikasi melalui pembanding lapangan agar tidak hanya bergantung pada keluhan atau rumor pasar.',
    ],
    targets: [
      'Mengidentifikasi komoditas yang mengalami tekanan harga atau penurunan ketersediaan.',
      'Memetakan titik distribusi, pelaku rantai pasok, dan hambatan yang memengaruhi kelancaran barang.',
      'Menilai potensi dampak sosial dari perubahan harga terhadap rumah tangga, pedagang, dan komunitas lokal.',
    ],
    eei: [
      'Komoditas apa yang mengalami kenaikan harga, penurunan stok, atau perubahan pola distribusi?',
      'Di titik mana terdapat selisih antara catatan distribusi, stok lapangan, dan harga jual?',
      'Apakah terdapat indikasi penimbunan, pengalihan barang, pungutan tidak resmi, atau hambatan transportasi?',
      'Bagaimana respons pedagang, konsumen, dan pengelola pasar terhadap perubahan pasokan?',
    ],
    collection: [
      'Field Officer melakukan pengecekan harga dan stok pada pasar induk, pasar tradisional, gudang, dan titik distribusi akhir.',
      'Membandingkan informasi dari pedagang, pemasok, pengelola pasar, dan data terbuka yang tersedia.',
      'Mencatat waktu pengecekan, kisaran harga, volume indikatif, dan penjelasan sumber mengenai perubahan pasokan.',
      'Menyusun laporan tematik per komoditas untuk memudahkan analisis tren lintas wilayah.',
    ],
    risks: [
      'Kelangkaan yang tidak terdeteksi dapat meningkatkan keresahan masyarakat dan memperluas isu ekonomi menjadi isu sosial.',
      'Informasi harga yang tidak diverifikasi berpotensi memperkuat kepanikan pembelian.',
      'Gangguan pada simpul logistik strategis dapat berdampak pada wilayah lain di luar area pantau utama.',
    ],
    mechanisms: [
      'Regional Commander menetapkan komoditas prioritas dan wilayah pembanding.',
      'OIM mengatur format laporan harga, stok, sumber, dan bukti pendukung agar data mudah dibandingkan.',
      'Field Coordinator memastikan Field Officer mengambil data dari beberapa titik yang mewakili kondisi wilayah.',
      'Field Officer mengirim temuan awal, foto lokasi bila tersedia, dan catatan validasi sumber.',
    ],
    reporting: [
      'Laporan harga dan stok disampaikan secara berkala dengan format yang sama untuk memudahkan pembacaan tren.',
      'Kenaikan signifikan, kelangkaan, atau indikasi penimbunan dilaporkan segera sebagai peringatan dini.',
      'Setiap laporan mencantumkan pembanding minimal dari dua sumber berbeda.',
    ],
    recommendations: [
      'Fokuskan pengumpulan pada komoditas dengan dampak langsung terhadap kebutuhan masyarakat.',
      'Lakukan verifikasi silang sebelum menyimpulkan adanya penimbunan atau gangguan sistemik.',
      'Buat ringkasan tren harian untuk pimpinan bila perubahan harga terjadi di lebih dari satu area.',
    ],
    classification: Classification.TERBATAS,
    urgency: PriorityLevel.HIGH,
  },
  {
    category: 'Sosial',
    title: 'Pemantauan Dinamika Sosial dan Pelayanan Publik',
    issue:
      'keluhan pelayanan publik, dinamika komunitas, dan potensi perluasan ketidakpuasan warga',
    objective:
      'mengidentifikasi isu sosial yang dapat berkembang menjadi mobilisasi warga, konflik horizontal, atau tekanan terhadap pemerintah daerah',
    background: [
      'Keluhan pelayanan publik sering berkembang dari percakapan terbatas menjadi agenda komunitas bila tidak mendapat respons memadai.',
      'Permukiman padat, fasilitas publik, layanan administrasi, transportasi, dan layanan kesehatan menjadi ruang yang sensitif terhadap gangguan pelayanan.',
      'Pemantauan sosial perlu membedakan aspirasi wajar, indikasi provokasi, dan potensi konflik antar kelompok.',
    ],
    targets: [
      'Mengidentifikasi isu pelayanan publik yang paling banyak dikeluhkan warga.',
      'Memetakan komunitas, tokoh lokal, forum warga, dan kanal komunikasi yang memengaruhi persepsi publik.',
      'Menilai potensi perluasan isu antar kelurahan, kecamatan, atau kelompok masyarakat.',
    ],
    eei: [
      'Apa pokok keluhan warga dan layanan apa yang menjadi sumber utama ketidakpuasan?',
      'Siapa tokoh lokal, komunitas, atau kanal komunikasi yang memperluas isu tersebut?',
      'Apakah terdapat ajakan pertemuan, pengumpulan massa, atau penolakan terhadap kebijakan tertentu?',
      'Apa respons pemangku kepentingan setempat dan bagaimana penerimaannya di masyarakat?',
    ],
    collection: [
      'Field Officer menghimpun informasi dari warga, pengurus lingkungan, tokoh komunitas, dan lokasi pelayanan publik.',
      'Mencatat kronologi keluhan, pihak terkait, titik lokasi, jumlah warga terdampak, dan respons awal yang telah muncul.',
      'Memantau perubahan narasi di grup komunitas lokal dan menghubungkannya dengan kondisi lapangan.',
      'Melaporkan indikator eskalasi seperti pertemuan besar, penolakan terbuka, atau konflik antar kelompok.',
    ],
    risks: [
      'Keluhan yang berlarut dapat menjadi agenda kolektif dan memicu aksi protes lokal.',
      'Informasi tidak lengkap dapat memperkuat salah persepsi antara warga dan penyedia layanan.',
      'Ketegangan antar kelompok dapat muncul bila isu pelayanan dikaitkan dengan identitas atau kepentingan tertentu.',
    ],
    mechanisms: [
      'Regional Commander menetapkan isu sosial prioritas dan batas wilayah pemantauan.',
      'OIM menyiapkan kebutuhan informasi mengenai aktor, narasi, dampak warga, dan respons otoritas.',
      'Field Coordinator menyusun jadwal pengecekan lokasi dan pembagian sumber informasi.',
      'Field Officer mengirim laporan faktual tanpa menyimpulkan aktor atau motif sebelum ada verifikasi.',
    ],
    reporting: [
      'Laporan sosial memuat pokok keluhan, jumlah terdampak indikatif, aktor lokal, kanal penyebaran, dan potensi dampak.',
      'Perkembangan isu dilaporkan minimal setiap 24 jam selama indikator eskalasi masih aktif.',
      'Temuan sensitif diberi catatan kebutuhan verifikasi lanjutan sebelum didistribusikan lebih luas.',
    ],
    recommendations: [
      'Utamakan pemetaan aktor lokal dan respons warga sebelum menyusun penilaian eskalasi.',
      'Pisahkan fakta lapangan, persepsi warga, dan penilaian analis dalam setiap laporan.',
      'Tingkatkan pemantauan bila isu mulai berpindah dari keluhan layanan menjadi ajakan mobilisasi.',
    ],
    classification: Classification.TERBATAS,
    urgency: PriorityLevel.NORMAL,
  },
  {
    category: 'Budaya',
    title: 'Pemantauan Kegiatan Budaya dan Kerawanan Kerumunan',
    issue:
      'kegiatan budaya, agenda komunitas, dan potensi kerawanan kerumunan pada ruang publik',
    objective:
      'menjaga pemahaman situasi terhadap agenda budaya yang berpotensi menarik massa besar, memunculkan gesekan komunitas, atau berdampak pada mobilitas wilayah',
    background: [
      'Agenda budaya dan komunitas dapat menjadi ruang konsolidasi sosial yang positif, namun tetap memerlukan pemantauan bila melibatkan massa besar.',
      'Kepadatan peserta, keterbatasan akses, dan perbedaan kepentingan komunitas dapat memunculkan risiko operasional.',
      'Pendekatan pemantauan harus sensitif terhadap nilai lokal dan tidak mengganggu kegiatan masyarakat yang sah.',
    ],
    targets: [
      'Mengidentifikasi jadwal kegiatan, penyelenggara, komunitas pendukung, dan estimasi kehadiran peserta.',
      'Memetakan titik kepadatan, jalur masuk-keluar, fasilitas pendukung, dan potensi dampak terhadap warga sekitar.',
      'Menilai apakah terdapat isu sensitif, narasi penolakan, atau gesekan antar komunitas.',
    ],
    eei: [
      'Kegiatan budaya apa yang memiliki potensi konsentrasi massa atau dampak mobilitas tinggi?',
      'Siapa penyelenggara, komunitas pendukung, sponsor, dan pihak yang berpotensi menolak kegiatan?',
      'Bagaimana pengaturan akses, keamanan mandiri, parkir, dan jalur evakuasi kegiatan?',
      'Apakah terdapat narasi sensitif yang dapat memicu gesekan sosial atau penolakan warga?',
    ],
    collection: [
      'Field Officer memantau lokasi kegiatan, kanal informasi penyelenggara, dan respons warga sekitar.',
      'Mengumpulkan data waktu kegiatan, estimasi peserta, titik kerumunan, dan perubahan arus lalu lintas.',
      'Melakukan validasi kepada sumber lokal untuk memastikan kegiatan berjalan sesuai izin dan agenda awal.',
      'Mengirim pembaruan cepat bila terjadi perubahan lokasi, penambahan peserta, atau potensi gesekan.',
    ],
    risks: [
      'Kerumunan yang melebihi perkiraan dapat menimbulkan kemacetan, gangguan layanan publik, atau risiko keselamatan.',
      'Narasi sensitif terhadap budaya atau identitas dapat memperbesar potensi penolakan.',
      'Kurangnya informasi lapangan dapat menyebabkan keterlambatan koordinasi dengan unsur wilayah.',
    ],
    mechanisms: [
      'Regional Commander menetapkan kegiatan budaya prioritas berdasarkan skala, lokasi, dan sensitivitas isu.',
      'OIM membagi kebutuhan informasi menjadi data penyelenggara, massa, lokasi, dan potensi dampak.',
      'Field Coordinator memastikan Field Officer memantau titik masuk, pusat kegiatan, dan lingkungan sekitar.',
      'Field Officer melaporkan fakta secara proporsional dan menjaga sensitivitas terhadap kegiatan masyarakat.',
    ],
    reporting: [
      'Laporan kegiatan budaya memuat jadwal, lokasi, penyelenggara, estimasi peserta, situasi keamanan, dan dampak mobilitas.',
      'Perubahan signifikan dilaporkan segera, terutama bila berkaitan dengan gesekan warga atau kepadatan tidak terkendali.',
      'Dokumentasi lapangan digunakan sebagai pendukung, bukan sebagai satu-satunya dasar penilaian.',
    ],
    recommendations: [
      'Pantau kegiatan yang berada dekat objek vital, simpul transportasi, atau permukiman padat.',
      'Jaga rumusan laporan agar sensitif terhadap nilai budaya dan tidak menstigma komunitas tertentu.',
      'Eskalasi dini dilakukan bila ditemukan indikator penolakan, konflik, atau penumpukan massa berlebih.',
    ],
    classification: Classification.BIASA,
    urgency: PriorityLevel.NORMAL,
  },
  {
    category: 'Pertahanan',
    title: 'Pemantauan Objek Vital dan Kesiapan Wilayah',
    issue:
      'aktivitas pada objek vital, fasilitas strategis, dan kesiapan wilayah menghadapi gangguan operasional',
    objective:
      'memperoleh peringatan dini atas perubahan aktivitas, celah pengamanan, dan potensi gangguan terhadap fasilitas strategis',
    background: [
      'Objek vital dan fasilitas strategis memiliki dampak luas terhadap layanan publik, logistik, komunikasi, dan kegiatan pemerintahan.',
      'Perubahan pola aktivitas pekerja, kendaraan, akses, atau perimeter dapat menjadi indikator awal yang perlu diverifikasi.',
      'Pemantauan dilakukan untuk mendukung kesiapan wilayah tanpa mengganggu operasional fasilitas.',
    ],
    targets: [
      'Mengidentifikasi objek vital, akses utama, perimeter, dan titik aktivitas yang mengalami perubahan tidak biasa.',
      'Memetakan pola kendaraan, pekerja kontrak, tamu, dan kegiatan pemeliharaan yang relevan.',
      'Menilai potensi dampak apabila terjadi gangguan pada fasilitas strategis.',
    ],
    eei: [
      'Objek vital mana yang menunjukkan perubahan aktivitas, akses, atau pola pengamanan?',
      'Apa bentuk perubahan yang terpantau dan sejak kapan indikator tersebut muncul?',
      'Siapa pihak yang berkaitan dengan aktivitas baru, termasuk pekerja, vendor, atau kendaraan logistik?',
      'Apa potensi dampak terhadap layanan publik, transportasi, komunikasi, atau kegiatan pemerintahan?',
    ],
    collection: [
      'Field Officer melakukan pemantauan terbatas pada area publik di sekitar objek vital sesuai area tanggung jawab.',
      'Menghimpun informasi dari sumber lokal mengenai perubahan jadwal operasional, aktivitas pemeliharaan, dan akses kendaraan.',
      'Mencatat indikator faktual seperti waktu, lokasi, jenis aktivitas, pihak terkait, dan perubahan pola.',
      'Melaporkan segera bila ditemukan indikator gangguan, akses tidak wajar, atau peningkatan pengamanan.',
    ],
    risks: [
      'Gangguan pada objek vital dapat berdampak lintas wilayah dan memerlukan respons cepat.',
      'Kesalahan membaca aktivitas rutin sebagai ancaman dapat menyebabkan alarm yang tidak perlu.',
      'Informasi sensitif mengenai fasilitas strategis harus dikendalikan agar tidak memperluas risiko keamanan.',
    ],
    mechanisms: [
      'Regional Commander menetapkan daftar objek vital prioritas dan batasan informasi yang boleh dikumpulkan.',
      'OIM menyiapkan indikator perubahan aktivitas yang perlu dilaporkan dan ambang eskalasi.',
      'Field Coordinator mengatur pembagian titik pantau agar tidak mengganggu operasional fasilitas.',
      'Field Officer menyampaikan laporan faktual dengan memperhatikan keamanan sumber dan kerahasiaan informasi.',
    ],
    reporting: [
      'Laporan objek vital memuat indikator perubahan, lokasi, waktu, sumber, tingkat keyakinan, dan potensi dampak.',
      'Informasi sensitif dibatasi pada jalur komando yang berwenang.',
      'Indikator yang belum jelas harus diberi rekomendasi verifikasi lanjutan, bukan disimpulkan sebagai ancaman.',
    ],
    recommendations: [
      'Fokuskan pemantauan pada perubahan pola, bukan aktivitas rutin yang telah terjelaskan.',
      'Gunakan verifikasi berlapis sebelum menyampaikan penilaian ancaman terhadap fasilitas strategis.',
      'Siapkan laporan cepat bila ditemukan indikator gangguan layanan, akses tidak wajar, atau peningkatan kerentanan.',
    ],
    classification: Classification.RAHASIA,
    urgency: PriorityLevel.HIGH,
  },
  {
    category: 'Keamanan',
    title: 'Pemantauan Kerawanan Keamanan dan Peringatan Dini',
    issue:
      'kerawanan keamanan wilayah, potensi gangguan ketertiban, dan kebutuhan peringatan dini lintas area',
    objective:
      'memastikan setiap indikator gangguan keamanan terdeteksi, diverifikasi, dan dilaporkan secara cepat melalui jalur komando',
    background: [
      'Kerawanan keamanan dapat muncul dari pergerakan kelompok, konflik lokal, kriminalitas menonjol, atau perubahan situasi pada lokasi rawan.',
      'Wilayah perkotaan memiliki banyak simpul mobilitas sehingga indikator kecil dapat berkembang cepat bila tidak diverifikasi.',
      'Peringatan dini membutuhkan informasi faktual, rute eskalasi yang jelas, dan koordinasi antar unsur lapangan.',
    ],
    targets: [
      'Mengidentifikasi titik rawan, pola kejadian, aktor, dan indikator eskalasi keamanan.',
      'Memetakan hubungan antar lokasi rawan, jalur pergerakan, dan potensi dampak terhadap masyarakat.',
      'Menilai kebutuhan tindakan lanjutan berdasarkan tingkat urgensi dan validitas informasi.',
    ],
    eei: [
      'Indikator keamanan apa yang muncul, di mana, kapan, dan siapa pihak yang berkaitan?',
      'Apakah terdapat pola berulang, pergerakan kelompok, atau perubahan perilaku di lokasi rawan?',
      'Apa potensi dampak terhadap masyarakat, fasilitas publik, transportasi, atau objek strategis?',
      'Kapan informasi harus dinaikkan menjadi peringatan dini kepada pimpinan?',
    ],
    collection: [
      'Field Officer menghimpun informasi dari titik rawan, sumber lokal, laporan lapangan, dan kanal terbuka yang relevan.',
      'Melakukan validasi cepat terhadap waktu, lokasi, aktor, dan bukti pendukung sebelum laporan dikirim.',
      'Field Coordinator menggabungkan laporan lintas petugas untuk melihat pola antar wilayah.',
      'OIM menyusun penilaian sementara dan rekomendasi eskalasi berdasarkan indikator yang telah diverifikasi.',
    ],
    risks: [
      'Keterlambatan pelaporan dapat mempersempit waktu respons terhadap gangguan keamanan.',
      'Informasi tunggal yang tidak diverifikasi dapat memicu salah arah penanganan.',
      'Pola lintas wilayah dapat terlewat bila laporan Field Officer tidak dikonsolidasikan oleh Field Coordinator.',
    ],
    mechanisms: [
      'Regional Commander menetapkan indikator peringatan dini dan prioritas lokasi rawan.',
      'OIM memastikan setiap laporan memiliki penilaian validitas, urgensi, dan rekomendasi tindak lanjut.',
      'Field Coordinator memonitor kepatuhan laporan petugas dan mengoordinasikan pembaruan cepat.',
      'Field Officer mengirim laporan awal, perkembangan, dan penutupan peristiwa sesuai format yang ditetapkan.',
    ],
    reporting: [
      'Laporan keamanan dikirim segera untuk indikator mendesak dan diperbarui sampai situasi terkendali.',
      'Setiap laporan mencantumkan status verifikasi, sumber, bukti, dampak, dan rekomendasi eskalasi.',
      'Laporan lintas area disusun bila terdapat pola yang sama pada lebih dari satu wilayah.',
    ],
    recommendations: [
      'Utamakan indikator yang memiliki dampak langsung terhadap keselamatan masyarakat dan stabilitas wilayah.',
      'Pastikan peringatan dini didukung minimal satu verifikasi tambahan bila waktu memungkinkan.',
      'Gunakan laporan konsolidasi untuk membaca pola keamanan, bukan hanya kejadian tunggal.',
    ],
    classification: Classification.RAHASIA,
    urgency: PriorityLevel.URGENT,
  },
] as const;

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function titleCaseBranch(branch: CommandRouteType | null) {
  if (branch === 'DIRECTORATE') {
    return 'Direktorat';
  }

  if (branch === 'BINDA') {
    return 'Binda';
  }

  if (branch === 'PUSAT') {
    return 'Pusat';
  }

  return 'Regional';
}

function compactCode(value: string) {
  return value.replace(/[^A-Z0-9]+/gi, '').toUpperCase();
}

function pickScenario(sequence: number) {
  return STR_SCENARIOS[sequence % STR_SCENARIOS.length];
}

function pickPrimaryArea(node: AssignmentNode) {
  return (
    node.areaScopes.find((area) => area.isPrimary) ?? node.areaScopes[0] ?? null
  );
}

function pickTaskPriority(index: number) {
  if (index % 7 === 0) {
    return PriorityLevel.URGENT;
  }

  if (index % 3 === 0) {
    return PriorityLevel.HIGH;
  }

  return PriorityLevel.NORMAL;
}

function pickTaskStage(index: number): AssignmentStage {
  const mod = index % 6;

  if (mod === 0 || mod === 3) {
    return 'COMPLETED';
  }

  if (mod === 1 || mod === 4) {
    return 'IN_PROGRESS';
  }

  return 'ASSIGNED';
}

function buildDirectiveSeed(
  chain: HierarchyChain,
  sequence: number,
  commandDate: Date,
) {
  const scenario = pickScenario(sequence);
  const primaryArea = pickPrimaryArea(chain.regionalCommander);
  const branchLabel = titleCaseBranch(chain.regionalCommander.branch);
  const areaLabel =
    primaryArea?.areaName ?? chain.regionalCommander.organizationUnitName;
  const commandSuffix = String(sequence + 1).padStart(3, '0');
  const title = `STR ${scenario.category} - ${scenario.title} ${branchLabel} ${areaLabel}`;
  const commandNarrative = [
    title,
    `Tujuan operasi adalah ${scenario.objective}.`,
    `Fokus wilayah berada pada ${areaLabel} dengan jalur kendali ${branchLabel.toLowerCase()} melalui ${chain.regionalCommander.positionTitle}, ${chain.operationalManager.positionTitle}, Field Coordinator, dan Field Officer.`,
    'Seluruh laporan wajib membedakan fakta lapangan, indikasi, penilaian sementara, dan rekomendasi tindak lanjut.',
  ].join('\n');
  const uukSections = buildUukSections(chain, scenario, title, commandDate);

  return {
    commandNumber: `SEED/STR/${chain.regionalCommander.organizationUnitCode}/2026/${commandSuffix}`,
    strategicIssue: `${scenario.issue} pada ${areaLabel}.`,
    commandDescription: serializeDirectiveCommandDescription({
      commandNarrative,
      uukTitle: title,
      uukSections,
    }),
    versionTitle: title,
    commandSource: 'Deputi II DENS CAKRA',
    commandIssuer: 'Deputi II',
    classification: scenario.classification,
    urgency: scenario.urgency,
    commandDate,
    dueDate: addDays(commandDate, 14),
  };
}

function createSectionItems(lines: readonly string[]) {
  return lines.map((content, index) => ({
    itemCode: String(index + 1),
    content,
    orderNumber: index + 1,
  }));
}

function serializeDirectiveCommandDescription(input: {
  commandNarrative: string;
  uukTitle: string;
  uukSections: UukSectionSeed[];
}) {
  const payload = {
    title: input.uukTitle.trim(),
    sections: input.uukSections.map((section) => ({
      sectionType: section.sectionType,
      title: section.title,
      orderNumber: UUK_SECTION_ORDER.indexOf(section.sectionType) + 1,
      content: section.items
        .map((item) => `${item.orderNumber}. ${item.content.trim()}`)
        .join('\n'),
    })),
  };

  return [
    STR_UUK_MARKER_START,
    JSON.stringify(payload),
    STR_UUK_MARKER_END,
    input.commandNarrative.trim(),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildUukSections(
  chain: HierarchyChain,
  scenario: StrScenario,
  directiveTitle: string,
  commandDate: Date,
): UukSectionSeed[] {
  const primaryArea = pickPrimaryArea(chain.regionalCommander);
  const areaLabel =
    primaryArea?.areaName ?? chain.regionalCommander.organizationUnitName;
  const branchLabel = titleCaseBranch(chain.regionalCommander.branch);
  const coordinatorNames =
    chain.fieldCoordinators
      .slice(0, 3)
      .map(
        (item) => item.coordinator.fullName ?? item.coordinator.positionTitle,
      )
      .join(', ') || 'Field Coordinator setempat';
  const officerNames =
    chain.fieldCoordinators
      .flatMap((item) => item.fieldOfficers)
      .slice(0, 4)
      .map((item) => item.fullName ?? item.positionTitle)
      .join(', ') || 'Field Officer setempat';

  const header = [
    `Judul STR: ${directiveTitle}.`,
    `Wilayah sasaran: ${areaLabel}.`,
    `Tanggal perintah: ${commandDate.toISOString().slice(0, 10)}.`,
    `Pengendali regional: ${chain.regionalCommander.fullName ?? chain.regionalCommander.positionTitle}.`,
    `Pengendali operasional: ${chain.operationalManager.fullName ?? chain.operationalManager.positionTitle}.`,
  ];
  const commandContext = [
    `Jalur operasi ${branchLabel.toLowerCase()} menggunakan ${coordinatorNames} sebagai koordinator lapangan utama.`,
    `Personel awal yang menjadi sumber laporan lapangan meliputi ${officerNames}.`,
  ];
  const scenarioContext = (lines: readonly string[]) =>
    lines.map(
      (line) => `${line} Konteks pelaksanaan diarahkan pada ${areaLabel}.`,
    );

  const sectionData = [
    {
      sectionType: UukStrSectionType.BASIS_BACKGROUND,
      title: 'Dasar dan Latar Belakang',
      lines: [...header, ...scenario.background, ...commandContext],
    },
    {
      sectionType: UukStrSectionType.INVESTIGATION_TARGETS,
      title: 'Sasaran Penyelidikan',
      lines: scenarioContext(scenario.targets),
    },
    {
      sectionType: UukStrSectionType.EEI_PIR,
      title: 'EEI / PIR',
      lines: scenario.eei,
    },
    {
      sectionType: UukStrSectionType.COLLECTION_PLAN,
      title: 'Rencana Pengumpulan',
      lines: [
        ...scenario.collection,
        `Field Coordinator wajib memastikan area ${areaLabel} tercakup melalui penugasan Field Officer dan jaring aktif.`,
        'Setiap temuan yang berpotensi berdampak cepat harus dilaporkan sebagai pembaruan antara tanpa menunggu laporan akhir.',
      ],
    },
    {
      sectionType: UukStrSectionType.THREAT_RISK_ANALYSIS,
      title: 'Analisis Ancaman dan Risiko',
      lines: [
        `Isu ${scenario.issue} dinilai perlu dipantau karena dapat memengaruhi stabilitas ${areaLabel}.`,
        ...scenario.risks,
        'Risiko residual tetap ada bila sumber tunggal belum diverifikasi atau perubahan situasi terjadi di luar jam pemantauan utama.',
      ],
    },
    {
      sectionType: UukStrSectionType.IMPLEMENTATION_MECHANISM,
      title: 'Mekanisme Pelaksanaan',
      lines: scenario.mechanisms,
    },
    {
      sectionType: UukStrSectionType.COORDINATION_REPORTING,
      title: 'Koordinasi dan Pelaporan',
      lines: [
        ...scenario.reporting,
        'Laporan BAKET menjadi bahan awal untuk verifikasi OIM, analisis lanjutan, dan penyusunan produk intelijen.',
      ],
    },
    {
      sectionType: UukStrSectionType.RECOMMENDATION,
      title: 'Rekomendasi',
      lines: scenario.recommendations,
    },
    {
      sectionType: UukStrSectionType.AUTHENTICATION,
      title: 'Pengesahan',
      lines: [
        `Dokumen STR ini disahkan oleh ${chain.regionalCommander.fullName ?? chain.regionalCommander.positionTitle} selaku pengendali regional ${branchLabel.toLowerCase()}.`,
        `OIM pelaksana adalah ${chain.operationalManager.fullName ?? chain.operationalManager.positionTitle} dan bertanggung jawab menjaga ritme pelaporan, validasi sumber, serta eskalasi peringatan dini.`,
        'Setiap perubahan signifikan terhadap target, wilayah, atau indikator ancaman wajib dituangkan dalam pembaruan STR atau task lanjutan.',
      ],
    },
  ] as const;

  return sectionData.map((section) => ({
    sectionType: section.sectionType,
    title: section.title,
    items: createSectionItems(section.lines),
  }));
}

function buildTaskSeed(
  chain: HierarchyChain,
  coordinator: AssignmentNode,
  sequence: number,
) {
  const scenario = pickScenario(sequence);
  const primaryArea =
    pickPrimaryArea(coordinator) ?? pickPrimaryArea(chain.regionalCommander);
  const areaLabel =
    primaryArea?.areaName ?? chain.regionalCommander.organizationUnitName;
  const compactArea = primaryArea?.areaCode
    ? compactCode(primaryArea.areaCode)
    : compactCode(coordinator.organizationUnitCode);

  return {
    title: `Tugas ${scenario.category} ${areaLabel} - ${scenario.title}`,
    description: [
      `Tugas ini menurunkan STR ${scenario.category.toLowerCase()} untuk ${areaLabel}.`,
      `Fokus pengumpulan: ${scenario.issue}.`,
      `Tujuan: ${scenario.objective}.`,
      `Koordinator lapangan: ${coordinator.fullName ?? coordinator.positionTitle}.`,
      `Kode area operasi: ${compactArea}.`,
    ].join('\n'),
  };
}

async function loadAssignments() {
  const rows = await prisma.userSeatAssignment.findMany({
    where: {
      isPrimary: true,
      isActive: true,
      validUntil: null,
      userProfile: {
        deletedAt: null,
        isActive: true,
      },
      position: {
        isActive: true,
        code: {
          in: [
            PositionCode.DEPUTI_II,
            PositionCode.DIREKTUR_WILAYAH,
            PositionCode.KABINDA,
            PositionCode.KASUBDIT,
            PositionCode.KABAGOPS,
            PositionCode.STAF_SUBDIT,
            PositionCode.KORWIL,
            PositionCode.PETUGAS_ORGANIK,
          ],
        },
      },
    },
    select: {
      id: true,
      userProfile: {
        select: {
          fullName: true,
          authUser: {
            select: {
              email: true,
            },
          },
        },
      },
      position: {
        select: {
          id: true,
          code: true,
          title: true,
          branch: true,
          reportsToPositionId: true,
          role: {
            select: {
              code: true,
            },
          },
          organizationUnit: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      areaScopes: {
        where: {
          validUntil: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        select: {
          isPrimary: true,
          area: {
            select: {
              id: true,
              officialCode: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return rows.map<AssignmentNode>((row) => ({
    id: row.id,
    email: row.userProfile.authUser.email,
    fullName: row.userProfile.fullName,
    positionId: row.position.id,
    positionCode: row.position.code,
    positionTitle: row.position.title,
    roleCode: row.position.role.code,
    organizationUnitId: row.position.organizationUnit.id,
    organizationUnitCode: row.position.organizationUnit.code,
    organizationUnitName: row.position.organizationUnit.name,
    branch: row.position.branch,
    reportsToPositionId: row.position.reportsToPositionId,
    areaScopes: row.areaScopes.map((scope) => ({
      areaId: scope.area.id,
      areaCode: scope.area.officialCode,
      areaName: scope.area.name,
      isPrimary: scope.isPrimary,
    })),
  }));
}

function buildChains(assignments: AssignmentNode[]) {
  const byReportsTo = new Map<string, AssignmentNode[]>();

  for (const assignment of assignments) {
    if (!assignment.reportsToPositionId) {
      continue;
    }

    const items = byReportsTo.get(assignment.reportsToPositionId) ?? [];
    items.push(assignment);
    byReportsTo.set(assignment.reportsToPositionId, items);
  }

  const executive = assignments.find(
    (assignment) => assignment.positionCode === PositionCode.DEPUTI_II,
  );

  if (!executive) {
    throw new Error(
      'Executive assignment not found. Run seed-role-accounts first.',
    );
  }

  const regionalCommanders = assignments
    .filter(
      (assignment) =>
        assignment.positionCode === PositionCode.DIREKTUR_WILAYAH ||
        assignment.positionCode === PositionCode.KABINDA,
    )
    .sort((left, right) =>
      left.organizationUnitCode.localeCompare(right.organizationUnitCode),
    );

  const chains: HierarchyChain[] = [];

  for (const regionalCommander of regionalCommanders) {
    const oim = (byReportsTo.get(regionalCommander.positionId) ?? []).find(
      (assignment) =>
        assignment.roleCode === RoleCode.OPERATIONAL_INTELLIGENCE_MANAGER,
    );

    if (!oim) {
      continue;
    }

    const coordinators = (byReportsTo.get(oim.positionId) ?? [])
      .filter(
        (assignment) => assignment.roleCode === RoleCode.FIELD_COORDINATOR,
      )
      .sort((left, right) =>
        (pickPrimaryArea(left)?.areaCode ?? left.positionTitle).localeCompare(
          pickPrimaryArea(right)?.areaCode ?? right.positionTitle,
        ),
      )
      .map((coordinator) => ({
        coordinator,
        fieldOfficers: (byReportsTo.get(coordinator.positionId) ?? [])
          .filter(
            (assignment) => assignment.roleCode === RoleCode.FIELD_OFFICER,
          )
          .sort((left, right) =>
            (
              pickPrimaryArea(left)?.areaCode ?? left.positionTitle
            ).localeCompare(
              pickPrimaryArea(right)?.areaCode ?? right.positionTitle,
            ),
          ),
      }))
      .filter((entry) => entry.fieldOfficers.length > 0);

    if (coordinators.length === 0) {
      continue;
    }

    chains.push({
      regionalCommander,
      operationalManager: oim,
      fieldCoordinators: coordinators,
    });
  }

  return {
    executive,
    chains,
  };
}

async function upsertDirective(
  executiveAssignmentId: string,
  chain: HierarchyChain,
  sequence: number,
) {
  const commandDate = addDays(directiveBaseDate, sequence);
  const seed = buildDirectiveSeed(chain, sequence, commandDate);
  const areaIds = Array.from(
    new Set(chain.regionalCommander.areaScopes.map((area) => area.areaId)),
  );

  const directive = await prisma.directive.upsert({
    where: {
      commandNumber: seed.commandNumber,
    },
    update: {
      ownerUnitId: chain.regionalCommander.reportsToPositionId
        ? (
            await prisma.position.findUniqueOrThrow({
              where: { id: chain.regionalCommander.reportsToPositionId },
              select: { organizationUnitId: true },
            })
          ).organizationUnitId
        : chain.regionalCommander.organizationUnitId,
      createdByAssignmentId: executiveAssignmentId,
      status: DirectiveStatus.DISTRIBUTED,
      currentVersionNumber: 1,
      deletedAt: null,
    },
    create: {
      commandNumber: seed.commandNumber,
      ownerUnitId: chain.regionalCommander.reportsToPositionId
        ? (
            await prisma.position.findUniqueOrThrow({
              where: { id: chain.regionalCommander.reportsToPositionId },
              select: { organizationUnitId: true },
            })
          ).organizationUnitId
        : chain.regionalCommander.organizationUnitId,
      createdByAssignmentId: executiveAssignmentId,
      status: DirectiveStatus.DISTRIBUTED,
    },
  });

  const version = await prisma.directiveVersion.upsert({
    where: {
      directiveId_versionNumber: {
        directiveId: directive.id,
        versionNumber: 1,
      },
    },
    update: {
      classification: seed.classification,
      urgency: seed.urgency,
      commandSource: seed.commandSource,
      commandIssuer: seed.commandIssuer,
      commandDate: seed.commandDate,
      dueDate: seed.dueDate,
      strategicIssue: seed.strategicIssue,
      commandDescription: seed.commandDescription,
      createdByAssignmentId: executiveAssignmentId,
      changeReason: `${SEED_TAG} refresh`,
    },
    create: {
      directiveId: directive.id,
      versionNumber: 1,
      classification: seed.classification,
      urgency: seed.urgency,
      commandSource: seed.commandSource,
      commandIssuer: seed.commandIssuer,
      commandDate: seed.commandDate,
      dueDate: seed.dueDate,
      strategicIssue: seed.strategicIssue,
      commandDescription: seed.commandDescription,
      createdByAssignmentId: executiveAssignmentId,
      changeReason: `${SEED_TAG} initial`,
    },
  });

  await prisma.directiveTargetArea.deleteMany({
    where: {
      directiveVersionId: version.id,
      areaId: {
        notIn: areaIds,
      },
    },
  });

  for (const [index, areaId] of areaIds.entries()) {
    await prisma.directiveTargetArea.upsert({
      where: {
        directiveVersionId_areaId: {
          directiveVersionId: version.id,
          areaId,
        },
      },
      update: {
        isPrimary: index === 0,
      },
      create: {
        directiveVersionId: version.id,
        areaId,
        isPrimary: index === 0,
      },
    });
  }

  const existingRecipient = await prisma.directiveRecipient.findFirst({
    where: {
      directiveVersionId: version.id,
      targetPositionId: chain.regionalCommander.positionId,
    },
    select: {
      id: true,
    },
  });

  const recipientData = {
    directiveVersionId: version.id,
    targetUnitId: null,
    targetPositionId: chain.regionalCommander.positionId,
    status: RecipientStatus.ACKNOWLEDGED,
    deliveredAt: addDays(seed.commandDate, 1),
    readAt: addDays(seed.commandDate, 1),
    acknowledgedAt: addDays(seed.commandDate, 1),
    failureReason: null,
  } as const;

  if (existingRecipient) {
    await prisma.directiveRecipient.update({
      where: { id: existingRecipient.id },
      data: recipientData,
    });
  } else {
    await prisma.directiveRecipient.create({
      data: {
        ...recipientData,
        sentAt: seed.commandDate,
      },
    });
  }

  return {
    directive,
    version,
    directiveSeed: seed,
  };
}

async function upsertUukStr(
  chain: HierarchyChain,
  directiveVersionId: string,
  sequence: number,
  versionTitle: string,
  commandDate: Date,
) {
  const existing = await prisma.uukStr.findFirst({
    where: {
      directiveVersionId,
      ownerUnitId: chain.regionalCommander.organizationUnitId,
      createdByAssignmentId: chain.regionalCommander.id,
      deletedAt: null,
    },
    select: {
      id: true,
    },
  });

  const uuk = existing
    ? await prisma.uukStr.update({
        where: { id: existing.id },
        data: {
          status: UukStrStatus.PUBLISHED,
          currentVersionNumber: 1,
          createdByAssignmentId: chain.regionalCommander.id,
          deletedAt: null,
        },
      })
    : await prisma.uukStr.create({
        data: {
          directiveVersionId,
          ownerUnitId: chain.regionalCommander.organizationUnitId,
          createdByAssignmentId: chain.regionalCommander.id,
          status: UukStrStatus.PUBLISHED,
          currentVersionNumber: 1,
        },
      });

  const version = await prisma.uukStrVersion.upsert({
    where: {
      uukStrId_versionNumber: {
        uukStrId: uuk.id,
        versionNumber: 1,
      },
    },
    update: {
      title: versionTitle,
      createdByAssignmentId: chain.regionalCommander.id,
      changeReason: `${SEED_TAG} refresh`,
    },
    create: {
      uukStrId: uuk.id,
      versionNumber: 1,
      title: versionTitle,
      createdByAssignmentId: chain.regionalCommander.id,
      changeReason: `${SEED_TAG} initial`,
    },
  });

  await prisma.uukStrSection.deleteMany({
    where: {
      uukStrVersionId: version.id,
    },
  });

  const sections = buildUukSections(
    chain,
    pickScenario(sequence),
    versionTitle,
    commandDate,
  );

  for (const [sectionIndex, section] of sections.entries()) {
    await prisma.uukStrSection.create({
      data: {
        uukStrVersionId: version.id,
        sectionType: section.sectionType,
        title: section.title,
        orderNumber: sectionIndex + 1,
        items: {
          create: section.items.map((item) => ({
            itemCode: item.itemCode,
            content: item.content,
            orderNumber: item.orderNumber,
          })),
        },
      },
    });
  }

  return {
    uuk,
    version,
  };
}

async function upsertTask(
  chain: HierarchyChain,
  coordinator: AssignmentNode,
  fieldOfficers: AssignmentNode[],
  directiveVersionId: string,
  uukStrVersionId: string,
  sequence: number,
) {
  const primaryArea =
    pickPrimaryArea(coordinator) ?? pickPrimaryArea(chain.regionalCommander);

  if (!primaryArea) {
    throw new Error(
      `Primary area missing for coordinator ${coordinator.positionTitle}.`,
    );
  }

  const { title, description } = buildTaskSeed(chain, coordinator, sequence);
  const dueDate = addDays(directiveBaseDate, 10 + (sequence % 7));
  const stage = pickTaskStage(sequence);
  const priority = pickTaskPriority(sequence);
  const areaIds = Array.from(
    new Set(coordinator.areaScopes.map((area) => area.areaId)),
  );

  const existing = await prisma.task.findFirst({
    where: {
      ownerUnitId: chain.operationalManager.organizationUnitId,
      uukStrVersionId,
      deletedAt: null,
      OR: [
        { title },
        {
          assignments: {
            some: {
              assigneeAssignmentId: coordinator.id,
              assignmentNote: `${SEED_TAG} Distribusi OIM ke Field Coordinator.`,
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  const task = existing
    ? await prisma.task.update({
        where: { id: existing.id },
        data: {
          directiveVersionId,
          uukStrVersionId,
          ownerUnitId: chain.operationalManager.organizationUnitId,
          createdByAssignmentId: chain.operationalManager.id,
          title,
          description,
          priority,
          dueDate,
          status:
            stage === 'COMPLETED'
              ? TaskStatus.COMPLETED
              : stage === 'IN_PROGRESS'
                ? TaskStatus.IN_PROGRESS
                : TaskStatus.ASSIGNED,
          deletedAt: null,
        },
      })
    : await prisma.task.create({
        data: {
          directiveVersionId,
          uukStrVersionId,
          ownerUnitId: chain.operationalManager.organizationUnitId,
          createdByAssignmentId: chain.operationalManager.id,
          title,
          description,
          priority,
          dueDate,
          status:
            stage === 'COMPLETED'
              ? TaskStatus.COMPLETED
              : stage === 'IN_PROGRESS'
                ? TaskStatus.IN_PROGRESS
                : TaskStatus.ASSIGNED,
        },
      });

  await prisma.taskTargetArea.deleteMany({
    where: {
      taskId: task.id,
      areaId: {
        notIn: areaIds,
      },
    },
  });

  for (const [index, areaId] of areaIds.entries()) {
    await prisma.taskTargetArea.upsert({
      where: {
        taskId_areaId: {
          taskId: task.id,
          areaId,
        },
      },
      update: {
        isPrimary: index === 0,
      },
      create: {
        taskId: task.id,
        areaId,
        isPrimary: index === 0,
      },
    });
  }

  await upsertTaskAssignment({
    taskId: task.id,
    assignerAssignmentId: chain.operationalManager.id,
    assigneeAssignmentId: coordinator.id,
    status:
      stage === 'COMPLETED'
        ? TaskAssignmentStatus.COMPLETED
        : stage === 'IN_PROGRESS'
          ? TaskAssignmentStatus.IN_PROGRESS
          : TaskAssignmentStatus.ACKNOWLEDGED,
    dueDate,
    assignmentNote: `${SEED_TAG} Distribusi OIM ke Field Coordinator.`,
  });

  for (const [index, fieldOfficer] of fieldOfficers.entries()) {
    const officerStage =
      stage === 'COMPLETED'
        ? TaskAssignmentStatus.COMPLETED
        : stage === 'IN_PROGRESS'
          ? index === 0
            ? TaskAssignmentStatus.IN_PROGRESS
            : TaskAssignmentStatus.ACKNOWLEDGED
          : TaskAssignmentStatus.SENT;

    await upsertTaskAssignment({
      taskId: task.id,
      assignerAssignmentId: coordinator.id,
      assigneeAssignmentId: fieldOfficer.id,
      status: officerStage,
      dueDate: addDays(dueDate, -(index % 2)),
      assignmentNote: `${SEED_TAG} Distribusi FC ke Field Officer ${index + 1}.`,
    });
  }

  return task;
}

async function upsertTaskAssignment(params: {
  taskId: string;
  assignerAssignmentId: string;
  assigneeAssignmentId: string;
  status: TaskAssignmentStatus;
  dueDate: Date;
  assignmentNote: string;
}) {
  const existing = await prisma.taskAssignment.findFirst({
    where: {
      taskId: params.taskId,
      assignerAssignmentId: params.assignerAssignmentId,
      assigneeAssignmentId: params.assigneeAssignmentId,
      assignmentNote: params.assignmentNote,
    },
    select: {
      id: true,
    },
  });

  const now = params.dueDate;
  const statusDates =
    params.status === TaskAssignmentStatus.COMPLETED
      ? {
          readAt: addDays(now, -6),
          acknowledgedAt: addDays(now, -5),
          startedAt: addDays(now, -4),
          completedAt: addDays(now, -1),
        }
      : params.status === TaskAssignmentStatus.IN_PROGRESS
        ? {
            readAt: addDays(now, -4),
            acknowledgedAt: addDays(now, -3),
            startedAt: addDays(now, -2),
            completedAt: null,
          }
        : params.status === TaskAssignmentStatus.ACKNOWLEDGED
          ? {
              readAt: addDays(now, -2),
              acknowledgedAt: addDays(now, -1),
              startedAt: null,
              completedAt: null,
            }
          : {
              readAt: null,
              acknowledgedAt: null,
              startedAt: null,
              completedAt: null,
            };

  const assignment = existing
    ? await prisma.taskAssignment.update({
        where: { id: existing.id },
        data: {
          status: params.status,
          dueDate: params.dueDate,
          assignmentNote: params.assignmentNote,
          ...statusDates,
        },
      })
    : await prisma.taskAssignment.create({
        data: {
          taskId: params.taskId,
          assignerAssignmentId: params.assignerAssignmentId,
          assigneeAssignmentId: params.assigneeAssignmentId,
          status: params.status,
          dueDate: params.dueDate,
          assignmentNote: params.assignmentNote,
          ...statusDates,
        },
      });

  await prisma.taskProgressLog.deleteMany({
    where: {
      taskAssignmentId: assignment.id,
    },
  });

  const progressSteps: Array<{
    status: TaskAssignmentStatus;
    progressPercent: number | null;
    offsetDays: number;
  }> = [];

  if (params.status !== TaskAssignmentStatus.SENT) {
    progressSteps.push({
      status: TaskAssignmentStatus.READ,
      progressPercent: null,
      offsetDays: -4,
    });
  }

  if (
    params.status === TaskAssignmentStatus.ACKNOWLEDGED ||
    params.status === TaskAssignmentStatus.IN_PROGRESS ||
    params.status === TaskAssignmentStatus.COMPLETED
  ) {
    progressSteps.push({
      status: TaskAssignmentStatus.ACKNOWLEDGED,
      progressPercent: null,
      offsetDays: -3,
    });
  }

  if (
    params.status === TaskAssignmentStatus.IN_PROGRESS ||
    params.status === TaskAssignmentStatus.COMPLETED
  ) {
    progressSteps.push({
      status: TaskAssignmentStatus.IN_PROGRESS,
      progressPercent:
        params.status === TaskAssignmentStatus.COMPLETED ? 80 : 55,
      offsetDays: -2,
    });
  }

  if (params.status === TaskAssignmentStatus.COMPLETED) {
    progressSteps.push({
      status: TaskAssignmentStatus.COMPLETED,
      progressPercent: 100,
      offsetDays: -1,
    });
  }

  for (const step of progressSteps) {
    await prisma.taskProgressLog.create({
      data: {
        taskAssignmentId: assignment.id,
        status: step.status,
        progressPercent: step.progressPercent,
        note: `${SEED_TAG} ${step.status}`,
        createdByAssignmentId: params.assigneeAssignmentId,
        createdAt: addDays(params.dueDate, step.offsetDays),
      },
    });
  }

  return assignment;
}

async function seedStrHierarchy() {
  const assignments = await loadAssignments();
  const { executive, chains } = buildChains(assignments);

  let directiveCount = 0;
  let uukCount = 0;
  let taskCount = 0;
  let coordinatorAssignmentCount = 0;
  let officerAssignmentCount = 0;

  for (const [chainIndex, chain] of chains.entries()) {
    for (
      let variantIndex = 0;
      variantIndex < STR_VARIANTS_PER_CHAIN;
      variantIndex += 1
    ) {
      const sequence = chainIndex * STR_VARIANTS_PER_CHAIN + variantIndex;
      const { version: directiveVersion, directiveSeed } =
        await upsertDirective(executive.id, chain, sequence);
      directiveCount += 1;

      const { version: uukVersion } = await upsertUukStr(
        chain,
        directiveVersion.id,
        sequence,
        directiveSeed.versionTitle,
        directiveSeed.commandDate,
      );
      uukCount += 1;

      for (const [
        coordinatorIndex,
        item,
      ] of chain.fieldCoordinators.entries()) {
        await upsertTask(
          chain,
          item.coordinator,
          item.fieldOfficers,
          directiveVersion.id,
          uukVersion.id,
          sequence * 1000 + coordinatorIndex,
        );
        taskCount += 1;
        coordinatorAssignmentCount += 1;
        officerAssignmentCount += item.fieldOfficers.length;
      }
    }
  }

  console.log('Seeded STR hierarchy baseline.');
  console.log(`- directives: ${directiveCount}`);
  console.log(`- uuk/strs: ${uukCount}`);
  console.log(`- tasks: ${taskCount}`);
  console.log(
    `- OIM -> Field Coordinator assignments: ${coordinatorAssignmentCount}`,
  );
  console.log(
    `- Field Coordinator -> Field Officer assignments: ${officerAssignmentCount}`,
  );
}

void seedStrHierarchy()
  .catch((error: unknown) => {
    console.error('Failed to seed STR hierarchy.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
