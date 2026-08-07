# Audit Terminologi, Hierarki, Workflow, dan Filter DENS CAKRA

Tanggal audit dan implementasi: 6 Agustus 2026
Ruang lingkup: dua brief Codex tentang hierarki/terminologi domain dan filter enterprise
Status: implementasi aman pada kontrak yang didukung data; tidak ada deploy, migration, atau perubahan internal peta

## Ringkasan eksekutif

Inventaris mencakup 176 route `page.tsx`: 168 route dashboard utama, satu dashboard fullscreen, lima halaman autentikasi, dan dua route lain. Renderer bersama diperiksa pada sumber komponennya sehingga route detail/form, koleksi, dashboard, dan halaman peta dapat dikelompokkan berdasarkan entitas serta kontrak datanya.

Perubahan utama:

- Jaring, Laporan Jaring, Laporan Pembinaan, Tugas, Produk Intelijen, Direktif, dan UUK/STR mendapat query server-side additive, pagination, sorting stabil, dan total hasil terfilter.
- Daftar Jaring Field Officer, laporan koordinator, penugasan/monitoring Field Coordinator, Tugas Saya, dan inbox persetujuan produk tidak lagi memfilter batch 50–100 sebagai seluruh dataset.
- Pencarian Jaring mencakup identitas dan nomor WhatsApp yang dinormalisasi; pencarian tugas mencakup judul, isi, nomor direktif, instruksi, dan nama penerima.
- Lokasi Aktual Laporan, Lokasi Terdaftar Jaring, dan Gaswil/Wilayah Cakupan dipisahkan secara istilah dan query.
- Status kesesuaian lokasi memakai status coverage yang sudah tersimpan. Laporan tanpa data coverage yang sah selalu menjadi `NOT_DETERMINED`, bukan ditebak sebagai di luar Gaswil.
- Receipt baca global tidak lagi ditampilkan sebagai status baca khusus Field Officer pada Laporan Jaring dan Baket koordinator.
- Tidak ada schema/migration, dependency, enum, role, permission, route, atau implementasi internal peta yang diubah.

## Kondisi Git

| Pemeriksaan | Hasil |
| --- | --- |
| Branch aktif | `main` |
| Branch lokal/remote `integration` | Tidak tersedia saat audit |
| Kondisi awal | Worktree sudah sangat kotor dan memuat perubahan pengguna |
| Tindakan | Tidak checkout, reset, rebase, commit, push, atau deploy |

## Kamus istilah kanonis

| Konsep | Label UI | Field/enum teknis yang dipertahankan |
| --- | --- | --- |
| Petugas tingkat kecamatan | Petugas Wilayah (Gaswil) | `FIELD_OFFICER`, route `field-officer`, compatibility property lama |
| Koordinator kabupaten/kota | Koordinator Wilayah (Korwil), jika position memang KORWIL | `FIELD_COORDINATOR` |
| Pimpinan Binda | Kepala BIN Daerah (Kabinda), jika position memang KABINDA | `REGIONAL_COMMANDER` |
| Sumber lapangan | Jaring | model/route `Jaring` |
| Informasi awal | Laporan Jaring | `WhatsAppReportSession`/`WhatsAppMessage` |
| Hasil pengolahan | Draf Baket / Baket Tervalidasi sesuai state aktual | enum `BaketStatus` |
| Cakupan personel/Jaring | Gaswil/Wilayah Cakupan atau Wilayah Penugasan | area scope/coverage ID |
| Lokasi registrasi | Lokasi Terdaftar Jaring | coverage/alamat registrasi |
| Lokasi kejadian | Lokasi Aktual Laporan | koordinat dan resolved area laporan |

Role autentikasi bukan jabatan. Satu role teknis masih dapat mewakili beberapa position code, sehingga UI harus mengutamakan position title/code aktual dan tidak mengubah role berdasarkan asumsi label.

## Matriks halaman, entitas, filter, dan mekanisme

| Halaman/renderer yang diperiksa | Entitas utama | Filter relevan | Sumber opsi/data | Mekanisme setelah implementasi |
| --- | --- | --- | --- | --- |
| Daftar Jaring seluruh role | Jaring, pekerjaan, caretaker, coverage | search, registrasi, status aktif, pekerjaan, Gaswil, petugas | master occupation, area scope, assignment | server query + pagination |
| Laporan Jaring umum | report session/message | search, kategori, lokasi laporan, urgensi, verifikasi, kelengkapan, lampiran, kesesuaian lokasi, tahap, periode, sort | category API, area scope, persisted report/Baket coverage | server query + pagination + summary |
| Laporan Jaring Koordinator | report session, Jaring | search, urgensi, verifikasi, kelengkapan, Jaring, Gaswil bertingkat, periode WIB | Jaring scoped list, `/me/area-scopes` | server query + pagination; polling halaman aktif 30 detik |
| Laporan Pembinaan | coaching report, Jaring, assigned area | search, Jaring, area, periode WIB, sort | global coaching endpoint + scoped Jaring | server query + pagination; ekspor seluruh hasil |
| Baket Koordinator | Baket dari laporan | search, urgensi, kategori, wilayah, periode | report/Baket endpoint | seluruh halaman sumber dimuat; receipt baca palsu dihapus |
| Tugas OIM/Koordinator | Task, TaskAssignment, Direktif/UUK | search, status, priority, classification, source urgency, due/effective due, area, related assignment, sort | task API dan assignment relation | server query + pagination + summary |
| Tugas Saya Field Officer | TaskAssignment | search tugas/direktif, status assignment, due date | task API scoped ke assignment aktif | server query + pagination |
| Produk Intelijen | Product | search, periode produk, product type, classification, owner assignment, sort | product API | server query + pagination |
| Inbox persetujuan regional | ProductApprovalStep/Product | search, periode produk, type, classification, owner assignment | approval inbox scoped target assignment | server query + pagination |
| Direktif Executive | Directive/current version | search, status, classification, urgency, recipient branch, area, deadline, assigned state, sort | directive API dan area scope | server query + pagination + summary |
| UUK/STR Regional | UUK/current directive version | search, status, current directive version IDs, sort | UUK API + page direktif aktif | server query + pagination |
| Admin Pengguna/Jabatan | UserProfile, assignment, position | search, status, branch, role, area, unit | master/scoped endpoints | server query + pagination; sudah tersedia sebelum tahap inti |
| Executive/Personel Lapangan | personnel/assignment | search dan dependent administrative area | personnel endpoint + area master | server query + pagination; sudah tersedia |
| Dashboard/analitik | aggregate per role | periode/status sesuai renderer | aggregate endpoint | tidak diberi filter palsu bila aggregate tidak menerima dimensi |
| Detail/form | satu entitas | umumnya tidak memerlukan collection filter | detail endpoint | tidak diubah kecuali label/status yang salah |
| Halaman peta | report, Baket, Jaring, personel, alert | filter luar peta yang sudah tersedia | endpoint map/scoped dataset | mesin marker/layer/cluster/zoom/event tidak diubah |
| Master data, keamanan, WA Center | category, occupation, session/audit, integration | hanya filter yang sudah mempunyai sumber sah | endpoint admin | tidak dibuat filter baru yang mengira-ngira data sensitif |

## Filter lama dan filter yang ditambahkan

Filter lama yang dipertahankan: search, status, urgensi/priority, kategori, periode, area, Jaring, registrasi, pekerjaan, classification, owner unit, product type, dan sort yang telah memiliki kontrak.

Filter/kontrak additive yang ditambahkan:

- Jaring: `areaId`, `occupationId`, `fieldOfficerAssignmentId`, `paginated`.
- Laporan Jaring: `jaringId`, `categoryId`, `areaId` untuk Lokasi Aktual Laporan, `jaringAreaId` untuk Gaswil, `urgency`, `verificationStatus`, `completeness`, `hasAttachment`, `locationSuitability`, `stage`, `from`, `to`, dan sorting.
- Pembinaan: `search`, `jaringId`, `areaId`, `from`, `to`, sorting, dan endpoint global paginated.
- Tugas: `search`, `classification`, `sourceUrgency`, `effectiveDueBefore/After`, `relatedAssignmentId`, `assignmentStatus`, pagination, dan `createdAt` sorting.
- Produk/persetujuan: period-overlap yang benar, search/type/classification/owner pada approval inbox, serta pagination browser.
- Direktif: classification, urgency, recipient branch, deadline range, pagination, dan kombinasi relasi melalui `AND`.
- UUK: pagination dan filter current `directiveVersionIds`.

Semua nilai kosong dihilangkan dari query browser. Filter yang mengubah dataset mengembalikan halaman ke 1; search memakai debounce; total dan pagination berasal dari query terfilter.

## Definisi wilayah dan kesesuaian lokasi

1. **Lokasi Aktual Laporan** adalah koordinat/resolved administrative area pada laporan, termasuk Live Location WhatsApp yang sudah tersimpan.
2. **Lokasi Terdaftar Jaring** adalah alamat atau area administratif registrasi Jaring.
3. **Gaswil/Wilayah Cakupan** adalah coverage penugasan Jaring/personel yang sah, termasuk masa berlaku bila tersedia.

Ketiganya tidak dapat dipertukarkan. `areaId` laporan memfilter lokasi kejadian; `jaringAreaId` memfilter coverage Jaring.

Aturan status:

- `WITHIN_SCOPE`: coverage validation tersimpan menyatakan berada dalam scope.
- `OUTSIDE_SCOPE`: salah satu status outside resmi tersimpan.
- `BORDER_AMBIGUOUS`: hanya dari status boundary resmi yang sudah dihitung sistem.
- `NOT_DETERMINED`: tidak ada lokasi, coverage, geometri/hasil validasi, report belum menjadi Baket, atau status masih `NOT_CHECKED`.

Tidak ada string matching nama wilayah sebagai keputusan spasial. Helper frontend hanya menerima ID/kode/hierarki resmi dan default aman `NOT_DETERMINED`. Penilaian point-in-polygon historis baru tidak ditambahkan karena memerlukan bukti boundary efektif pada waktu laporan.

## Filter yang sengaja tidak ditambahkan

| Kandidat | Alasan |
| --- | --- |
| Status “dekat batas” baru | Belum ada toleransi meter/aturan bisnis baru; hanya status `BORDER_AMBIGUOUS` yang sudah tersimpan yang dapat ditampilkan |
| Receipt baca per Field Officer | Model saat ini hanya mempunyai `readAt` global; tidak valid untuk menyimpulkan petugas tertentu sudah membaca |
| Anev sebagai role baru | Anev adalah fungsi/jabatan tambahan dan belum mempunyai kontrak data kanonis |
| Filter data sensitif pada audit/WA payload | Berisiko mengekspos data di luar permission dan tidak dibutuhkan untuk alur operasional ini |
| Filter baru di dalam mesin peta | Brief melarang perubahan marker/layer/cluster/koordinat/zoom/event map |

## File utama yang berubah

Backend:

- `modules/jaring/jaring.dto.ts`, `jaring.controller.ts`, `jaring.service.ts`, dan test service.
- `modules/tasks/task.dto.ts` dan `task.service.ts`.
- `modules/intelligence-products/intelligence-products.dto.ts` dan service.
- `modules/directives/directive.dto.ts` dan service.
- `modules/uuk-str/uuk-str.dto.ts` dan service.

Frontend:

- renderer Laporan Jaring umum/koordinator/detail dan Laporan Pembinaan.
- Field Officer operations serta shared task pages/clients.
- intelligence product browser, directive list, dan regional UUK clients.
- helper `lib/domain/date-time.ts` dan `lib/domain/spatial-location-matcher.ts`.
- Baket coordinator untuk menghapus status baca petugas yang tidak dapat dibuktikan.

Dokumentasi: dokumen audit ini.

## Perubahan API/database

Perubahan API bersifat additive pada query parameter dan response paginated/summary. Mode list lama tetap tersedia jika `paginated` tidak dikirim pada endpoint yang menjaga compatibility.

Tidak ada perubahan database, Prisma schema, migration, seed, atau data produksi. Kebutuhan data yang belum dijalankan:

- receipt baca per assignment/petugas bila bisnis benar-benar memerlukannya;
- evaluasi point-in-polygon historis terhadap boundary dan coverage yang efektif pada waktu laporan;
- model fungsi Anev terpisah jika disetujui bisnis.

## Hasil validasi

| Pemeriksaan | Hasil |
| --- | --- |
| Backend build (`nest build`) | Lulus |
| Frontend TypeScript (`tsc --noEmit`) | Lulus |
| Frontend production build (`next build`) | Lulus, 36 static pages generated |
| Backend Jest penuh | Lulus: 20 suite, 110 test |
| Targeted Biome | Menemukan lint/format legacy pada file renderer besar; tidak dilakukan broad auto-format agar perubahan pengguna tidak tertimpa |
| Targeted ESLint backend | Baseline gagal dengan ribuan diagnostic legacy/generated-type pada service besar; build dan test tetap lulus |
| Runtime smoke test per role | Belum dijalankan karena tidak ada sesi/kredensial test yang diberikan |
| Screenshot desktop/mobile | Tidak dibuat karena sesi autentikasi browser tidak tersedia |

## Konfirmasi keselamatan

- Auth, session, permission, role enum, route, dan schema database tidak diubah.
- Domain scope tetap menjadi lapisan pertama sebelum filter tambahan.
- Tidak ada dependency atau secret baru; file `.env` tidak diubah oleh pekerjaan ini.
- Tidak ada file internal peta yang diubah.
- Tidak ada operasi Git destruktif, commit, push, deploy, atau mutasi produksi.
