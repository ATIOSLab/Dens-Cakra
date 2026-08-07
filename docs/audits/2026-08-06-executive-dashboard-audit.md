# Audit dan Implementasi Dashboard Eksekutif DENS CAKRA

Tanggal audit: 6 Agustus 2026
Repository: `D:\Aplikasi\Dens-Cakra`
Branch kerja saat audit: `main` (branch `integration` tidak tersedia pada checkout lokal)
Lingkup: audit read-only repository dan database terkonfigurasi, implementasi backend/frontend lokal, test, dan dokumentasi. Tidak ada deploy atau mutasi data.

## Ringkasan keputusan

Dashboard lama memakai `GET /dashboard/briefing` dan menampilkan angka Baket, tugas, direktif, produk, alert, dan insiden. Label “Total Laporan” pada UI lama sebenarnya mengambil `Baket.count`, sehingga belum menjawab volume **Laporan Jaring**. Implementasi baru bersifat additive:

- `GET /dashboard/executive` menjadi kontrak agregat ringkas untuk role pimpinan;
- `GET /dashboard/executive/filters` mengirim pilihan filter yang sudah dipotong oleh scope;
- endpoint lama tetap tersedia untuk Admin Sistem dan Field Officer;
- data utama dihitung per `WhatsAppReportSession.id`, bukan dari join mentah;
- `submittedAt` menjadi field periode Laporan Jaring, dengan fallback `startedAt` hanya untuk record tanpa `submittedAt`;
- periode dan pembanding dihitung sebagai hari kalender `Asia/Jakarta`;
- status kelengkapan, verifikasi Field Officer, workflow Baket, validasi Baket, urgensi, dan produk tidak digabung;
- satu endpoint agregat dipertahankan karena payload hanya memuat agregat dan maksimal 20 item per ranking/daftar, sedangkan master filter dipisah;
- hasil di-cache 15 detik berdasarkan scope dan query;
- tidak ada peta, data dummy, atau formula skor kinerja baru.

## Temuan database aktual

Audit read-only terhadap database yang dikonfigurasi pada backend menemukan snapshot berikut:

| Entitas | Jumlah |
| --- | ---: |
| `WhatsAppReportSession` | 14 |
| Sesi dengan `submittedMessageId` | 11 |
| `Baket` aktif | 5 |
| `Jaring` aktif | 1.255 |
| `IntelligenceProduct` aktif | 0 |

Status Baket aktual: 4 `READY_TO_SEND`, 1 `SENT_TO_OIM`. Tidak ada Baket `VERIFIED` pada snapshot audit. Master kategori aktif yang ditemukan: Ekonomi, Budaya, Keamanan, Pertahanan, Politik, dan Sosial. Nilai ini hanya bukti audit; tidak di-hardcode ke aplikasi.

## Entitas dan field yang digunakan

| Entitas | Field utama | Kegunaan |
| --- | --- | --- |
| `WhatsAppReportSession` | `id`, `submittedAt`, `startedAt`, `status`, `jaringId`, `fieldOfficerAssignmentId`, `submittedMessageId` | unit hitung Laporan Jaring, periode, ranking Jaring/Gaswil |
| `WhatsAppMessage` | `validationSummary`, `status`, `categoryId`, `coordinateSource`, `resolvedAreaId`, `latitude`, `longitude`, `convertedBaketId` | verifikasi, kategori, lokasi, workflow konversi |
| `WhatsAppReportMedia` / `WhatsAppMessageMedia` | `reportSessionId`, `messageId`, `fileId`, `deletedAt` | kelengkapan dan distribusi lampiran |
| `Jaring` | `id`, `aliasName`, `fullName`, `registrationStatus` | label dan ranking Jaring |
| `JaringAreaCoverage` | `jaringId`, `areaId`, `validUntil`, `isPrimary` | fallback wilayah dan filter scope |
| `JaringCaretakerAssignment` | `jaringId`, `fieldOfficerAssignmentId`, `isActive`, `validUntil` | scope Jaring resmi |
| `Baket` | `id`, `status`, `currentVersionNumber`, `reportCategoryId` | Draf Baket dan Baket Tervalidasi |
| `BaketVersion` | `versionNumber`, `urgency`, `coverageValidationStatus`, `coordinateSource` | urgensi dan kualitas lokasi versi aktif |
| `BaketVerification` | `status`, `completedAt` | status validasi formal Baket |
| `BaketRevisionRequest` | `status`, `dueDate` | sumber tindak lanjut yang tersedia |
| `ReportCategory` | `id`, `code`, `name`, `isActive` | master kategori/isu |
| `AdministrativeArea` | `id`, `name`, `level` dan closure | filter wilayah serta ranking wilayah |
| `UserOperationalAssignment` | `id`, `roleId`, `areaScopes` | Gaswil dan scope penugasan |
| `Task` / `TaskAssignment` | `status`, `ownerAssignmentId`, `assigneeAssignmentId` | ringkasan tindak lanjut |
| `Directive` | `status`, `ownerAssignmentId` | ringkasan arahan |
| `IntelligenceProduct` | `status`, `createdAt`, `createdByAssignmentId`, `ownerAssignmentId` | perkembangan Produk Informasi |
| `ProductApprovalStep` | `targetAssignmentId`, `status` | tindakan approval milik pengguna aktif |

## Matriks indikator

| Indikator | Entitas sumber | Field tanggal | Kondisi/filter | Denominator | Permission | Endpoint/query | Drill-down | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Total Laporan Jaring | `WhatsAppReportSession` | `submittedAt` | pesan sudah dikirim, seluruh filter global | - | `jaringWhere` | `/dashboard/executive` | `/dashboard/laporan-jaring` | Implemented |
| Laporan Jaring Lengkap | session + message + media | `submittedAt` | isi, pengirim, Jaring, koordinat, resolved area, foto | total laporan | `jaringWhere` | agregasi unique session | `completeness=COMPLETE` | Implemented |
| Laporan Jaring Tidak Lengkap | session + message + media | `submittedAt` | negasi definisi lengkap | total laporan | `jaringWhere` | agregasi unique session | `completeness=INCOMPLETE` | Implemented |
| Laporan Jaring Terverifikasi | `WhatsAppMessage` | session `submittedAt` | `validationSummary=VALID` | total laporan | `jaringWhere` | agregasi unique session | filter verifikasi FO | Implemented |
| Draf Baket | `Baket` dari submitted message | session `submittedAt` | status Baket selain `VERIFIED` | total laporan | relasi laporan scoped | agregasi unique session | `stage=DRAFT_BAKET` | Implemented |
| Baket Tervalidasi | `Baket` | session `submittedAt` | `status=VERIFIED` | total laporan | relasi laporan scoped | agregasi unique session | `stage=VALIDATED_BAKET` | Implemented |
| Produk Informasi | `IntelligenceProduct` | `createdAt` | status dalam `productWhere` | - | `productWhere` | `groupBy status` | route produk sesuai role | Implemented |
| Laporan Urgent | current `BaketVersion` | session `submittedAt` | `urgency=URGENT` pada versi aktif | total laporan | relasi laporan scoped | current-version join | `urgency=URGENT` | Implemented |
| Perlu Dilengkapi | session + message | `submittedAt` | laporan tidak lengkap | total laporan | `jaringWhere` | agregasi unique session | filter kelengkapan | Implemented |
| Menunggu Tindakan | message + approval step | `submittedAt` | sesuai role: review laporan atau approval assignment aktif | - | scope + target assignment aktif | agregasi | halaman sumber | Implemented |
| Laporan Intelijen Binda | - | - | profil Binda aktif tidak ada di schema | - | - | - | - | Belum tersedia |
| Laporan Intelijen Direktorat | - | - | relasi organisasi direktorat aktif tidak ada | - | - | - | - | Belum tersedia |
| Produk Kedeputian II khusus | - | - | tipe/owner tidak memiliki foreign key tingkat Kedeputian | - | - | - | - | Belum tersedia |

## Matriks visualisasi

| Komponen | Pertanyaan pimpinan | Bentuk visual | Data sumber | Filter | Interaksi | Responsive | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Executive summary | Berapa volume dan kondisi utama? | 10 summary cards | agregat dashboard | global | drill-down | 1/2/3/5 kolom | Implemented |
| Perlu perhatian | Apa yang membutuhkan keputusan? | daftar prioritas | aturan urgensi/kelengkapan/verifikasi/lokasi | global | detail laporan | 1/2 kolom | Implemented |
| Tren laporan | Bagaimana perubahan waktu? | area/line chart | session per bucket | global | tooltip | tinggi tetap, lebar fleksibel | Implemented |
| Workflow | Sejauh mana laporan diproses? | donut + legend | laporan dan status Baket | global | tooltip | stacked pada mobile | Implemented |
| Kategori dominan | Isu apa paling banyak? | horizontal bar | master kategori | global | tooltip | label ringkas | Implemented |
| Komposisi kualitas | Bagaimana kelengkapan/verifikasi/urgensi/media/lokasi? | progress distribution | agregat terpisah | global | ringkasan teks | 1/2/3 kolom | Implemented |
| Ranking Jaring | Jaring mana paling aktif? | ranked list | unique session per Jaring | global | tab | list mobile | Implemented |
| Ranking Gaswil | Gaswil mana paling aktif? | ranked list | unique session per assignment | global | tab | list mobile | Implemented |
| Ranking wilayah | Wilayah mana paling aktif? | ranked list | `resolvedArea`, fallback coverage | global | tab | list mobile | Implemented |
| Laporan prioritas | Laporan mana harus diperiksa? | compact list | rules eksplisit | global | detail | bukan tabel desktop paksa | Implemented |
| Arahan/tindak lanjut | Bagaimana progres tugas/direktif? | status list | task/directive group | periode + scope | ringkasan | 1/2 kolom | Implemented |
| Kualitas data | Apa yang masih kosong? | KPI + mini cards | missing category/location/media | global | - | 2 kolom | Implemented |

## Matriks relasi dan double counting

| Entitas | Relasi | Foreign key | Kardinalitas | Komponen | Risiko dan mitigasi |
| --- | --- | --- | --- | --- | --- |
| Report session → message | submitted message | `submittedMessageId` unique | 0..1:1 | seluruh laporan | unit hitung selalu `session.id` |
| Message → Baket | conversion | `convertedBaketId` unique | 0..1:1 | workflow/Baket | tidak menjumlah versi |
| Baket → versions | versioning | `baketId` | 1:N | urgensi/lokasi/validasi | join hanya `versionNumber=currentVersionNumber` |
| Session → media | evidence | `reportSessionId` | 1:N | lampiran/kelengkapan | media tidak menjadi baris hitung |
| Jaring → sessions | reporting | `jaringId` | 1:N | ranking Jaring | group map berdasarkan `jaring.id` |
| Assignment → sessions | Gaswil | `fieldOfficerAssignmentId` | 1:N | ranking Gaswil | group map berdasarkan assignment ID |
| Area → message | resolved location | `resolvedAreaId` | 1:N | ranking wilayah | satu resolved area per message |
| Category → message/Baket | classification | `categoryId`/`reportCategoryId` | 1:N | kategori | message diprioritaskan, Baket fallback |

## Matriks permission

| Role/fungsi | Cakupan | Card | Grafik | Ranking | Detail | Ekspor |
| --- | --- | --- | --- | --- | --- | --- |
| Executive | `DomainScopeService` nasional/area aktif | scoped | scoped | scoped | route guard existing | belum disediakan |
| Regional Commander | assignment dan area descendant | scoped | scoped | scoped | route guard existing | belum disediakan |
| OIM | assignment dan area aktif | scoped | scoped | scoped | route guard existing | belum disediakan |
| Field Coordinator | branch/area aktif sesuai `jaringWhere` | scoped | scoped | scoped | route guard existing | belum disediakan |
| Field Officer | dashboard lama dipertahankan | existing | existing | existing | existing | existing |
| Admin Sistem | dashboard lama dipertahankan | existing | existing | existing | existing | existing |

Filter `fieldOfficerAssignmentId` di luar `resolvedScope.assignmentIds` menghasilkan 404. `areaId` divalidasi dengan `assertArea`. Pilihan Jaring dan Gaswil di endpoint filter sudah memakai scope yang sama.

## Filter yang diimplementasikan

- Periode: Hari Ini, 7 Hari Terakhir, 30 Hari Terakhir, Bulan Berjalan, Tahun Berjalan, dan kustom.
- Wilayah administratif dari area tree scoped.
- Kategori/isu dari `ReportCategory` aktif.
- Petugas Wilayah (Gaswil) dan Jaring dari assignment/scope aktif.
- Tipe Produk Informasi, status sesi laporan, sumber laporan, urgensi, kelengkapan, verifikasi laporan, workflow Baket, validasi Baket, lampiran, sumber lokasi, dan kesesuaian lokasi.
- State filter disimpan di URL, reset tidak mengubah scope, request di-debounce 250 ms, dan request lama dibatalkan.
- Pilihan Kedeputian/Direktorat/Binda/Korwil ditandai belum tersedia karena relasi foreign key organisasi tersebut sudah tidak aktif pada schema. Aplikasi tidak melakukan pencocokan berdasarkan nama.

## Konsistensi lintas halaman

- Executive, Regional Commander, OIM, dan Field Coordinator memakai satu kontrak dashboard, satu definisi indikator, dan satu formatter angka/status/waktu WIB.
- Card, grafik, ranking Jaring, ranking Petugas Wilayah, ranking wilayah, daftar prioritas, aktivitas audit, serta kualitas data berasal dari dataset laporan terfilter yang sama.
- Nilai numerik pada tabel rata kanan dan memakai digit tabular; card ringkasan memakai tinggi dan struktur label/nilai yang seragam.
- Drill-down Laporan Jaring meneruskan periode, wilayah, kategori, Jaring, Petugas Wilayah, urgensi, status sesi, kelengkapan, verifikasi, workflow Baket, lampiran, sumber koordinat, dan kesesuaian lokasi yang relevan.
- Halaman daftar Laporan Jaring membaca filter dari URL dan mengirimkannya ke endpoint server. Definisi `VERIFIED`, `NEEDS_REVIEW`, dan `WAITING` disamakan dengan kartu dashboard, termasuk laporan yang sudah dikonversi menjadi Baket.
- Daftar Produk Informasi bersama membaca periode dan tipe produk dari URL untuk route Executive, Regional Commander, dan OIM.
- Tabel/daftar tidak menggunakan dataset dummy atau kalkulasi ulang frontend; formatter frontend hanya mengubah presentasi, bukan nilai.

## Arsitektur dan performa

Keputusan arsitektur: modular monolith NestJS baru `ExecutiveDashboardModule`, mengikuti controller/service/DTO repository. Frontend memakai thin Server Component untuk SSR awal dan Client Component modular untuk filter/interaksi. Recharts dan komponen UI existing digunakan; tidak ada dependency baru.

Pencegahan masalah performa:

- query menggunakan select minimum dan tidak mengirim raw payload ke browser;
- agregasi, ranking, dan comparison dilakukan di backend;
- response ranking/daftar dibatasi maksimal 20 item;
- filter master dipisahkan dari agregat;
- cache private per scope/query selama 15 detik;
- query filter versi Baket mengikat versi aktif, bukan semua versi;
- dua index additive dibuat untuk `submittedAt` dan kombinasi Gaswil + `submittedAt`;
- frontend membatalkan fetch usang dan mempertahankan last-known-good data saat refresh gagal.

## Endpoint

| Method | Endpoint | Fungsi | Role |
| --- | --- | --- | --- |
| GET | `/dashboard/executive` | cards, attention, trend, distributions, products, ranking, priority, follow-up, recent activity, quality | Executive, Regional Commander, OIM, Field Coordinator |
| GET | `/dashboard/executive/filters` | kategori, area tree, Gaswil, Jaring, enum/filter availability | role yang sama |
| GET | `/dashboard/briefing` | kontrak lama, tetap kompatibel | existing roles |

## Migration

Migration additive `20260806143000_add_executive_dashboard_indexes` membuat:

- `WhatsAppReportSession_submittedAt_id_idx`;
- `WhatsAppReportSession_fieldOfficerAssignmentId_submittedAt_idx`.

Migration belum diterapkan ke database oleh pekerjaan ini. Tidak ada perubahan data atau constraint.

## Hasil verifikasi implementasi

| Pemeriksaan | Hasil |
| --- | --- |
| Prisma Client generation | Lulus |
| Backend production build (`nest build`) | Lulus |
| Backend unit test penuh | Lulus, 21 suite / 113 test |
| ESLint modul dashboard backend dan registrasi module | Lulus, tanpa error/warning |
| Frontend production build (`next build`) | Lulus, termasuk TypeScript dan static page generation |
| Biome komponen dashboard frontend | Lulus tanpa error; tersisa info opsional penyortiran class dari rule nursery |
| Backend E2E existing | Belum lulus: teardown aplikasi melewati timeout 5 detik dan scheduler/WhatsApp runtime existing masih berjalan setelah environment Jest ditutup |

Kegagalan E2E terjadi pada lifecycle teardown/background worker existing, bukan pada assertion endpoint dashboard. Tidak ada perubahan pada scheduler atau WhatsApp runtime karena berada di luar scope dan dilarang oleh brief. Endpoint dashboard dilindungi session/scope sehingga verifikasi visual dan HTTP authenticated lintas empat role tetap menjadi langkah UAT.

## Batasan yang dinyatakan jujur

- Ranking Korwil dan Binda tidak dihitung karena hubungan atasan-organisasi aktif tidak tersedia sebagai foreign key. Shared-area matching berpotensi memberi atribusi ganda dan sengaja tidak digunakan.
- Card khusus Laporan Intelijen Binda, Laporan Intelijen Direktorat, dan Produk Kedeputian II tidak dibuat sebagai angka palsu. Produk Informasi existing tetap ditampilkan.
- Ekspor tidak ditambahkan karena belum ada kontrak ekspor dashboard yang scoped.
- Screenshot runtime belum dapat dibuat tanpa sesi role pimpinan yang valid dan browser test harness. Build dan layout breakpoint berbasis CSS telah diverifikasi; pemeriksaan visual authenticated tetap perlu dilakukan di UAT.
- Dashboard diberi label bukan real-time; refresh mengikuti request pengguna dan cache 15 detik.

## Checklist keselamatan

- [x] Tidak menambah atau mengubah peta.
- [x] Tidak mengubah auth, token, session, atau WA Center.
- [x] Tidak memperluas role endpoint di luar empat role pimpinan yang sudah mempunyai dashboard.
- [x] Tidak menggunakan data dummy atau angka hardcode.
- [x] Tidak membuat formula skor kinerja/anomali baru.
- [x] Tidak menghapus atau memutasi data.
- [x] Tidak deploy ke production.
- [x] Perubahan API additive; `/dashboard/briefing` tetap kompatibel.
