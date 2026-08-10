# Audit dan Implementasi Map Intelligent Network

Tanggal: 6 Agustus 2026
Ruang lingkup: UX, kontrak marker, ringkasan, filter, marker, cluster, heatmap, popup, detail, aksesibilitas, dan responsivitas.
Status production: tidak disentuh.

## 1. Ringkasan audit existing

Halaman sebelumnya mengambil maksimal 100 record dari `/jaring/reports`, menghitung sebagian metrik di browser, dan menganggap laporan berstatus `METADATA_RECORDED` sebagai Baket. Record tanpa koordinat diberi koordinat deterministik di sekitar Jakarta. Filter wilayah juga mempunyai fallback pencocokan nama/sub-string. Akibatnya card, marker, dan data Baket dapat berbeda dari entitas database sebenarnya.

Endpoint `/map/markers` sebenarnya sudah menjadi kontrak GeoJSON terscope, tetapi hanya melayani Baket dan personel. Map memakai marker DOM satu per record, belum menyediakan cluster/heatmap analitis, legenda hanya statis, dan hover menutup langsung sehingga rawan berkedip. Detail masih berupa dialog desktop, sedangkan tampilan mobile belum memakai bottom sheet.

## 2. Library dan komponen yang dipertahankan

- Engine/library: MapLibre GL `maplibre-gl`.
- Wrapper: `src/components/ui/map.tsx` (`Map`, `MapControls`, dan `MapPopup`).
- Tile/style existing tetap sama: CARTO Dark Matter, CARTO Positron, CARTO Voyager, Esri World Imagery, dan OpenStreetMap.
- Sistem koordinat dan urutan GeoJSON tetap `[longitude, latitude]`.

Library, engine, provider, tile, proyeksi, wrapper inti, dan mekanisme pembuatan instance map tidak diganti.

## 3. Kontrak data dan koordinat

Endpoint existing `GET /api/v1/map/markers` diperluas dengan `types=report` dan tetap memakai `DomainScopeService`:

- Laporan Jaring: `WhatsAppReportSession.latitude` dan `WhatsAppReportSession.longitude`.
- Metadata sumber lokasi: `locationCapturedAt`, `locationAccuracyMeters`, `locationType`, dan `submittedMessage.coordinateSource`.
- Baket: latitude/longitude pada `BaketVersion` terbaru.
- Wilayah: polygon match resmi; fallback hanya ke foreign key `submittedMessage.resolvedArea` atau `BaketVersion.eventArea`, bukan kemiripan nama.
- `null`, nilai non-finite, koordinat di luar batas, dan pasangan `0,0` tidak dibuat menjadi marker.

Fungsi frontend pembuat koordinat semu telah dihapus. Data tanpa koordinat tetap dihitung dan dikirim sebagai preview daftar terpisah.

## 4. Summary card dan definisi

| Card | Definisi |
|---|---|
| Total Laporan Jaring | Jumlah Laporan Jaring yang sudah dikirim melalui bot WhatsApp dan belum dikonversi menjadi Baket |
| Bahan Keterangan (Baket) | Laporan Jaring yang telah memiliki relasi konversi ke entitas `Baket` |

Live Location wajib diberikan oleh Jaring sebelum Laporan Jaring dapat masuk ke sistem. Laporan Jaring tidak lagi dibagi berdasarkan kategori kelengkapan. Setelah laporan dikonversi menjadi Baket, laporan tersebut keluar dari hitungan Laporan Jaring dan masuk ke card Baket sehingga tidak dihitung ganda. Card dapat diklik, mempunyai state aktif, periode, persentase yang relevan, definisi, dan tombol **Tampilkan Semua**. Summary dihitung sebelum pembatasan viewport dan `limitPerType`.

## 5. Layer dan mode peta

- Base map existing: dark, light, terrain, satellite, dan OSM.
- Marker laporan: circle; warna mengikuti validitas, urgensi, atau domain Laporan Jaring.
- Marker Baket: simbol berlian ungu agar berbeda bentuk, bukan hanya warna.
- Cluster: GeoJSON source MapLibre dengan `cluster=true`, jumlah titik, radius proporsional, dan klik untuk expansion zoom.
- Heatmap: layer MapLibre `heatmap` dari koordinat aktual dengan gradasi biru-hijau-kuning-oranye.

Marker, cluster, dan heatmap dipilih eksklusif agar tidak saling menutupi. Perubahan warna/bobot hanya memanggil `GeoJSONSource.setData`; layer tidak dibangun ulang akibat hover.

## 6. Perhitungan heatmap

Default setiap titik berbobot `1` (jumlah laporan). Pilihan bobot tambahan:

- urgensi: Urgent 1, High 0,75, Normal 0,5, Low 0,25;
- valid: valid 1, selainnya 0,1;
- lengkap: lengkap 1, selainnya 0,1;
- tidak lengkap: tidak lengkap 1, selainnya 0,1;
- Baket: Baket 1, selainnya 0,1.

Radius, intensitas, dan opacity diinterpolasi terhadap zoom. Record tanpa koordinat tidak masuk source. Legenda menjelaskan bahwa intensitas adalah kepadatan, bukan tingkat ancaman.

## 7. Popup Laporan Jaring

Payload awal hanya memuat identitas ringkas:

- referensi, judul terpotong, excerpt, kategori, urgensi, waktu diterima;
- status laporan, validitas, kelengkapan, dan relasi Baket;
- Jaring dari FK resmi, foto profil dari `profilePhotoFileId`, kode/alias, serta caretaker/Gaswil aktif;
- koordinat aktual, area resmi, sumber/akurasi/kesesuaian lokasi;
- total foto, video, dan lampiran;
- aksi detail dan halaman laporan.

Foto memakai `/api/files/{fileId}` dan fallback inisial, tanpa gambar dummy eksternal.

## 8. Popup Baket

Popup Baket menampilkan ID/referensi, judul, kategori, urgensi, status, waktu, area, personel/unit, primary Jaring jika tersedia, jumlah laporan sumber, maksimal tiga referensi sumber, dan aksi ke Baket. Marker tetap satu per Baket dan memakai koordinat versi Baket terbaru.

Relasi sumber berasal dari `Baket.convertedSourceMessages -> WhatsAppMessage.reportSession`; tidak ada pencocokan nama.

## 9. Hover, klik, touch, dan detail

- `mouseenter`/`mouseleave` resmi MapLibre dipasang satu kali per lifecycle layer dan dibersihkan saat unmount.
- Delay penutupan 220 ms; masuk ke popup membatalkan timer sehingga popup tidak berkedip.
- Satu preview aktif; Escape menutup preview.
- Desktop: hover membuka preview; klik mengunci preview dan membuka sheet detail.
- Touch/coarse pointer: tap pertama mengunci preview, tap kedua membuka detail.
- Klik area kosong menutup preview.
- Detail memakai right sheet pada desktop dan bottom sheet pada mobile dengan focus management Radix.

## 10. Filter

- pencarian referensi, isi/judul, Jaring, dan wilayah resmi;
- periode: hari ini, 7/30 hari, bulan berjalan, semua waktu, dan custom WIB;
- jenis data: semua, Laporan Jaring, Baket;
- validitas dan kelengkapan;
- urgensi dan master kategori;
- wilayah berdasarkan ID area resmi dalam scope;
- memiliki/tidak memiliki koordinat;
- memiliki/tidak memiliki lampiran;
- sumber lokasi;
- kesesuaian wilayah penugasan.

Pencarian didebounce 350 ms, request lama di-abort, dan perubahan filter memakai kontrak server. Jumlah filter aktif dan reset tersedia.

## 11. Legenda

Legenda dinamis menyediakan:

- kelengkapan: lengkap, tidak lengkap, belum ditentukan;
- validitas: valid, perlu review, belum valid;
- urgensi: Urgent, High, Normal, Low;
- kategori;
- bentuk Laporan Jaring versus Baket;
- heatmap: rendah, sedang, tinggi, sangat tinggi dan penjelasan kepadatan.

Legenda dapat ditutup dan tetap tersedia pada layar kecil.

## 12. Data tanpa koordinat

Meta membedakan total hasil, dapat dipetakan, tanpa koordinat, dan jumlah pada viewport. Maksimal 20 preview data tanpa koordinat ditampilkan pada mode daftar. Tidak ada fallback ke `0,0`, pusat Indonesia, pusat wilayah, atau titik default lain.

## 13. Permission dan keamanan

- Laporan memakai `DomainScopeService.jaringWhere(context)`.
- Baket memakai `DomainScopeService.baketWhere(context)`.
- Pencarian, summary, heatmap, dan feature berasal dari query terscope yang sama.
- Endpoint tidak menambah role baru.
- Role `ADMIN_SYSTEM` dihapus dari guard halaman karena tidak didukung kontrak endpoint; ini menyelaraskan akses, bukan memperluasnya.
- Link detail tetap melakukan authorization ulang pada route target.
- Payload initial tidak memuat audit trail atau lampiran lengkap.

## 14. Responsive dan aksesibilitas

- Desktop/laptop: empat summary card, toolbar ringkas, map dominan, right sheet.
- Tablet: summary dua kolom sebelum breakpoint besar, filter collapsible, detail drawer.
- Mobile: satu/tap kedua, bottom sheet, kontrol minimal 44 px, map minimum 34 rem, tanpa overflow horizontal yang disengaja.
- Daftar alternatif tersedia untuk keyboard/screen reader.
- Popup memakai role dialog dan label, foto mempunyai alt, kontrol mempunyai accessible label, state fokus dikelola Radix, informasi tidak hanya dibedakan dengan warna.

## 15. File frontend

Diubah/dibuat untuk implementasi ini:

- `apps/fe/src/app/(main)/dashboard/maps-intelijen-network/page.tsx`
- `_components/maps-intelijen-network-client.tsx`
- `_components/maps-intelijen-map-view.tsx`
- `_components/maps-intelijen-types.ts`
- `_components/maps-intelijen-header.tsx`
- `_components/maps-intelijen-stats.tsx`
- `_components/maps-intelijen-toolbar.tsx`
- `_components/maps-intelijen-data-layers.tsx`
- `_components/maps-intelijen-legend.tsx`
- `_components/maps-intelijen-hover-popup.tsx`
- `_components/maps-intelijen-detail-sheet.tsx`
- `_components/maps-intelijen-data-list.tsx`

Komponen lama detail modal/right panel/table yang sudah memiliki perubahan lain di worktree tidak dijadikan bagian kontrak halaman baru dan tidak dihapus.

## 16. File backend/API

- `apps/be/src/modules/map-markers/map-markers.dto.ts`
- `apps/be/src/modules/map-markers/map-markers.service.ts`
- `apps/be/src/modules/map-markers/map-markers.controller.ts`
- `apps/be/src/modules/map-markers/map-markers.service.spec.ts`

Tidak ada migration atau index baru. Index existing pada session, message, kategori, area, dan Baket dipakai kembali.

## 17. Hasil pengujian

| Pemeriksaan | Hasil |
|---|---|
| Backend build (`npm run build`) | Lulus |
| Frontend type-check (`npx tsc --noEmit`) | Lulus |
| Frontend production build (`npm run build`) | Lulus setelah akses network font diizinkan |
| Backend unit test map marker | Lulus, 4/4 |
| Scoped frontend Biome check | Lulus tanpa error; tersisa warning style/nursery non-blocking |
| `git diff --check` scoped | Lulus |
| Backend ESLint scoped | Belum bersih karena delegate `PrismaService` pada worktree saat ini bertipe `any`, menghasilkan rangkaian `no-unsafe-*`; build/type-check dan unit test tetap lulus |

Unit test baru membuktikan dua record terscope—satu dengan koordinat asli dan satu tanpa koordinat—menghasilkan satu marker, dua record pada summary, satu unlocated preview, status valid/lengkap terpisah, dan Jaring berasal dari FK.

Hover/touch, permission lintas seluruh role, console/network browser, memory leak profiling, serta visual responsive pada 1440/1280/1024/768/390/375 memerlukan sesi UAT autentik yang valid. Implementasi event cleanup, delay, abort request, target sentuh, dan breakpoint telah diverifikasi melalui review kode, type-check, unit test, dan production build.

## 18. Screenshot

Pengambilan otomatis dicoba terhadap server lokal pada port 3000/3001 dengan Edge headless. Halaman login dapat dimuat, tetapi akun demo lokal yang tersedia pada seed tidak dapat membuat sesi pada database runtime saat ini. Karena tidak boleh mengubah password/database hanya untuk screenshot dan tidak boleh membuat data dummy, lima screenshot autentik berikut belum dibuat:

- desktop hover popup;
- desktop heatmap;
- desktop cluster;
- tablet;
- mobile bottom sheet.

Tidak ada screenshot palsu atau data rekayasa yang dibuat. Skrip dan profil browser temporer yang sempat memuat kredensial demo telah dihapus.

## 19. Ringkasan diff dan konfirmasi

Perubahan utama memindahkan sumber halaman dari transformasi 100 laporan di browser ke satu FeatureCollection terscope, menambah summary dataset, marker/cluster/heatmap MapLibre, filter server, hover stabil, detail responsive, dan daftar data tanpa koordinat.

- Data dummy: tidak digunakan.
- Koordinat buatan: dihapus dan tidak digunakan.
- Permission: tidak diperluas.
- Database: tidak dimutasi dan tidak dimigrasikan.
- Production: tidak disentuh dan tidak dideploy.

## 20. Standar warna dan ikon semantik

Seluruh komponen aktif memakai satu kamus pada `_components/maps-intelijen-presentation.tsx`. Warna selalu disertai ikon dan label; warna tidak menjadi satu-satunya pembeda status.

| Domain | Nilai | Warna | Ikon |
|---|---|---|---|
| Tipe data | Laporan Jaring | Sky | `FileText` |
| Tipe data | Baket | Violet | `Archive` |
| Urgensi | Mendesak | Rose | `Siren` |
| Urgensi | Tinggi | Amber | `TriangleAlert` |
| Urgensi | Normal | Emerald | `ShieldCheck` |
| Urgensi | Rendah | Sky | `CircleArrowDown` |
| Validitas | Valid | Blue | `BadgeCheck` |
| Validitas | Perlu Review | Rose | `TriangleAlert` |
| Validitas | Belum Valid | Slate | `Clock3` |
| Kelengkapan | Lengkap | Green | `FileCheck2` |
| Kelengkapan | Tidak Lengkap | Orange | `FileWarning` |
| Kelengkapan | Belum Ditentukan | Slate | `CircleHelp` |
| Koordinat | Dapat Dipetakan | Blue | `Crosshair` |
| Koordinat | Tanpa Koordinat | Amber | `MapPinOff` |

Kamus yang sama dipakai oleh summary card, filter, marker, legenda, heatmap, hover popup, detail sheet, dan daftar alternatif. Aksi `Crosshair` sekarang melakukan fit terhadap seluruh titik hasil filter, sedangkan `RotateCcw` mengembalikan peta ke cakupan awal sehingga ikon tidak lagi mewakili aksi yang sama.
